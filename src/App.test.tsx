import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useGoogleMaps } from './lib/googleMaps';

vi.mock('./lib/googleMaps', () => ({
  useGoogleMaps: vi.fn(),
}));

vi.mock('./routes/PlanPage', () => ({ default: () => <div>Plan Page Stub</div> }));
vi.mock('./routes/ParkingPage', () => ({ default: () => <div>Parking Page Stub</div> }));
vi.mock('./routes/TrackerPage', () => ({ default: () => <div>Tracker Page Stub</div> }));

beforeEach(() => {
  vi.mocked(useGoogleMaps).mockReturnValue({ isLoaded: true, loadError: undefined });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('App', () => {
  it('shows a setup notice when no API key is configured', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '');
    render(<App />);
    expect(screen.getByText(/No Google Maps API key found/)).toBeInTheDocument();
  });

  it('shows a load-error message when the Maps script fails to load', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'fake-key');
    vi.mocked(useGoogleMaps).mockReturnValue({ isLoaded: false, loadError: new Error('network down') });
    render(<App />);
    expect(screen.getByText(/Failed to load Google Maps/)).toBeInTheDocument();
  });

  it('shows a loading message while the Maps script is loading', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'fake-key');
    vi.mocked(useGoogleMaps).mockReturnValue({ isLoaded: false, loadError: undefined });
    render(<App />);
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('shows the build version in the footer', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'fake-key');
    render(<App />);
    expect(screen.getByText(`v${__APP_VERSION__}`)).toBeInTheDocument();
  });

  it('renders the Plan page by default once loaded, with nav links to the other pages', () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'fake-key');
    render(<App />);
    expect(screen.getByText('Plan Page Stub')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(screen.getByText('Tracker')).toBeInTheDocument();
  });
});
