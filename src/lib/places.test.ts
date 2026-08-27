import { beforeEach, describe, expect, it, vi } from 'vitest';

const nearbySearchMock = vi.fn();
const textSearchMock = vi.fn();

(globalThis as unknown as { google: unknown }).google = {
  maps: {
    places: {
      // `new` requires a real constructor function — an arrow function throws
      // "is not a constructor", so this can't be `() => ({...})`.
      PlacesService: vi.fn().mockImplementation(function PlacesService(this: unknown) {
        return { nearbySearch: nearbySearchMock, textSearch: textSearchMock };
      }),
      PlacesServiceStatus: { OK: 'OK', ZERO_RESULTS: 'ZERO_RESULTS', ERROR: 'ERROR' },
    },
  },
};

// Imported after the fake `google` global is installed above, since places.ts only
// touches `google.maps.places` lazily inside function calls, not at module load time.
const { searchCampgroundsNearby, searchWalmartNearby } = await import('./places');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makePlaceResult(overrides: Record<string, unknown> = {}) {
  return {
    place_id: 'p1',
    name: 'Test Place',
    vicinity: '123 Main St',
    geometry: { location: { lat: () => 10, lng: () => 20 } },
    ...overrides,
  };
}

beforeEach(() => {
  nearbySearchMock.mockReset();
  textSearchMock.mockReset();
});

describe('searchCampgroundsNearby', () => {
  it('maps successful results to PlaceResult[]', async () => {
    nearbySearchMock.mockImplementation((_req: unknown, callback: (r: unknown, s: string) => void) => {
      callback([makePlaceResult()], 'OK');
    });
    const results = await searchCampgroundsNearby({ lat: 0, lng: 0 }, 1000);
    expect(results).toEqual([{ placeId: 'p1', name: 'Test Place', address: '123 Main St', lat: 10, lng: 20 }]);
  });

  it('resolves to an empty array on ZERO_RESULTS', async () => {
    nearbySearchMock.mockImplementation((_req: unknown, callback: (r: unknown, s: string) => void) => {
      callback(null, 'ZERO_RESULTS');
    });
    expect(await searchCampgroundsNearby({ lat: 0, lng: 0 }, 1000)).toEqual([]);
  });

  it('rejects on any other error status', async () => {
    nearbySearchMock.mockImplementation((_req: unknown, callback: (r: unknown, s: string) => void) => {
      callback(null, 'ERROR');
    });
    await expect(searchCampgroundsNearby({ lat: 0, lng: 0 }, 1000)).rejects.toThrow(/nearbySearch failed/);
  });

  it('filters out results missing a place_id or a location', async () => {
    nearbySearchMock.mockImplementation((_req: unknown, callback: (r: unknown, s: string) => void) => {
      callback([makePlaceResult({ place_id: undefined }), makePlaceResult({ geometry: undefined })], 'OK');
    });
    expect(await searchCampgroundsNearby({ lat: 0, lng: 0 }, 1000)).toEqual([]);
  });

  it('falls back to formatted_address when vicinity is absent, and "Unnamed" when name is absent', async () => {
    nearbySearchMock.mockImplementation((_req: unknown, callback: (r: unknown, s: string) => void) => {
      callback(
        [makePlaceResult({ vicinity: undefined, formatted_address: '456 Elm St', name: undefined })],
        'OK',
      );
    });
    const [result] = await searchCampgroundsNearby({ lat: 0, lng: 0 }, 1000);
    expect(result.address).toBe('456 Elm St');
    expect(result.name).toBe('Unnamed');
  });
});

describe('searchWalmartNearby', () => {
  it('queries text search for "Walmart" and maps results', async () => {
    textSearchMock.mockImplementation((req: { query: string }, callback: (r: unknown, s: string) => void) => {
      expect(req.query).toBe('Walmart');
      callback([makePlaceResult({ place_id: 'w1' })], 'OK');
    });
    const results = await searchWalmartNearby({ lat: 0, lng: 0 }, 1000);
    expect(results[0].placeId).toBe('w1');
  });

  it('resolves to an empty array on ZERO_RESULTS', async () => {
    textSearchMock.mockImplementation((_req: unknown, callback: (r: unknown, s: string) => void) =>
      callback(null, 'ZERO_RESULTS'),
    );
    expect(await searchWalmartNearby({ lat: 0, lng: 0 }, 1000)).toEqual([]);
  });
});
