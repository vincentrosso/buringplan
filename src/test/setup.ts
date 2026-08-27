import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// @react-google-maps/api wraps the real Google Maps JS SDK, which doesn't exist in
// jsdom. Individual test files that need custom behavior (e.g. WaypointForm's
// Autocomplete) override this with their own vi.mock of the same module.
vi.mock('@react-google-maps/api', () => ({
  GoogleMap: (props: { children?: React.ReactNode }) => props.children ?? null,
  Marker: () => null,
  Polyline: () => null,
  Autocomplete: (props: { children?: React.ReactNode }) => props.children ?? null,
  useJsApiLoader: () => ({ isLoaded: true, loadError: undefined }),
}));
