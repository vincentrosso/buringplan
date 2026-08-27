import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GOOGLE_MAPS_LIBRARIES, useGoogleMaps } from './googleMaps';

describe('googleMaps', () => {
  it('requests the places and geometry libraries', () => {
    expect(GOOGLE_MAPS_LIBRARIES).toEqual(['places', 'geometry']);
  });

  it('useGoogleMaps returns the loader state from useJsApiLoader', () => {
    // setup.ts's global @react-google-maps/api mock stubs useJsApiLoader to
    // always report loaded — this just proves useGoogleMaps forwards that value.
    const { result } = renderHook(() => useGoogleMaps());
    expect(result.current).toEqual({ isLoaded: true, loadError: undefined });
  });
});
