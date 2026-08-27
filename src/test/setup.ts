import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// @react-google-maps/api wraps the real Google Maps JS SDK, which doesn't exist in
// jsdom. Individual test files that need custom behavior (e.g. WaypointForm's
// Autocomplete) override this with their own vi.mock of the same module.
vi.mock('@react-google-maps/api', () => ({
  GoogleMap: (props: { children?: ReactNode }) => props.children ?? null,
  // Rendered as a real clickable element (not null) so marker-click tests can
  // fire it via its accessible name (title) without needing a per-file override.
  Marker: (props: { title?: string; label?: string; onClick?: () => void }) =>
    createElement('button', { type: 'button', 'aria-label': props.title, onClick: props.onClick }, props.label),
  Polyline: () => null,
  InfoWindow: (props: { children?: ReactNode }) => props.children ?? null,
  Autocomplete: (props: { children?: ReactNode }) => props.children ?? null,
  useJsApiLoader: () => ({ isLoaded: true, loadError: undefined }),
}));
