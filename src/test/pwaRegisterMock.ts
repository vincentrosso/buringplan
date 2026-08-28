import { vi } from 'vitest';

// Stand-in for the `virtual:pwa-register/react` module (aliased in
// vitest.config.ts) — the real one only exists inside a Vite/PWA build.
type Dispatch = (value: boolean) => void;

export const useRegisterSW = vi.fn<
  () => {
    needRefresh: [boolean, Dispatch];
    offlineReady: [boolean, Dispatch];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  }
>(() => ({
  needRefresh: [false, () => {}],
  offlineReady: [false, () => {}],
  updateServiceWorker: async () => {},
}));
