import { vi } from 'vitest';

// Stand-in for the `virtual:pwa-register` module (aliased in vitest.config.ts) —
// the real one only exists inside a Vite/PWA build.
export const registerSW = vi.fn<(options?: unknown) => (reloadPage?: boolean) => Promise<void>>(
  () => async () => {},
);
