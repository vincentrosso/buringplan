import { HashRouter, NavLink, Route, Routes } from 'react-router';
import UpdateBanner from './components/UpdateBanner';
import { useGoogleMaps } from './lib/googleMaps';
import ParkingPage from './routes/ParkingPage';
import PlanPage from './routes/PlanPage';
import TrackerPage from './routes/TrackerPage';

function NoApiKeyNotice() {
  return (
    <div className="api-key-notice">
      <p>
        No Google Maps API key found. Copy <code>.env.local.example</code> to{' '}
        <code>.env.local</code> and set <code>VITE_GOOGLE_MAPS_API_KEY</code>, then restart the
        dev server.
      </p>
    </div>
  );
}

export default function App() {
  const { isLoaded, loadError } = useGoogleMaps();

  return (
    <HashRouter>
      <div className="app-shell">
        <UpdateBanner />
        <header className="app-header">
          <div className="app-brand">
            <h1>🔥 Stillwater → Gerlach</h1>
            <span
              className="app-version"
              title={`commit ${__APP_COMMIT__} · built ${__APP_BUILD_DATE__}`}
            >
              v{__APP_VERSION__}
            </span>
          </div>
          <nav className="app-nav">
            <NavLink to="/" end>
              Plan
            </NavLink>
            <NavLink to="/parking">Parking</NavLink>
            <NavLink to="/tracker">Tracker</NavLink>
          </nav>
        </header>

        <main className="app-main">
          {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
            <NoApiKeyNotice />
          ) : loadError ? (
            <p className="api-key-notice">Failed to load Google Maps: {loadError.message}</p>
          ) : !isLoaded ? (
            <p className="api-key-notice">Loading map...</p>
          ) : (
            <Routes>
              <Route path="/" element={<PlanPage />} />
              <Route path="/parking" element={<ParkingPage />} />
              <Route path="/tracker" element={<TrackerPage />} />
            </Routes>
          )}
        </main>
      </div>
    </HashRouter>
  );
}
