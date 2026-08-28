import { registerSW } from 'virtual:pwa-register';

// The PWA is built in autoUpdate mode: a freshly deployed service worker skips
// waiting and claims control of open pages. When that happens the page is still
// showing the OLD assets, so we reload once to pick up the new build — unless a
// drive is currently being tracked, in which case a reload would drop the live
// session. The next reload after tracking stops catches up.

let safeToReload = true;

export function setSafeToReload(value: boolean): void {
  safeToReload = value;
}

export function registerAppUpdates(): void {
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      // Long-open sessions (a phone left on the trip all day) still poll for a
      // new worker rather than only checking on a hard reload.
      if (registration) {
        setInterval(() => void registration.update(), 60 * 60 * 1000);
      }
    },
  });
  void updateSW;

  if (!('serviceWorker' in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !safeToReload) return;
    reloading = true;
    window.location.reload();
  });
}
