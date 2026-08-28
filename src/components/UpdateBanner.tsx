import { useRegisterSW } from 'virtual:pwa-register/react';

// Shown only when a newer build has been fetched and is waiting. Reloading is
// the user's call — updateServiceWorker(true) activates the waiting worker and
// reloads the page.
export default function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="update-banner" role="alert">
      <span>A new version of the app is available.</span>
      <span className="update-banner-actions">
        <button type="button" onClick={() => void updateServiceWorker(true)}>
          Reload
        </button>
        <button
          type="button"
          className="update-banner-dismiss"
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
      </span>
    </div>
  );
}
