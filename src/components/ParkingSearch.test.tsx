import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ParkingSearch from './ParkingSearch';
import { searchCampgroundsNearby, searchWalmartNearby } from '../lib/places';
import { useTripStore } from '../store/tripStore';

vi.mock('../lib/places', () => ({
  searchCampgroundsNearby: vi.fn(),
  searchWalmartNearby: vi.fn(),
}));

const initialState = useTripStore.getState();

beforeEach(() => {
  localStorage.clear();
  useTripStore.setState(initialState, true);
  vi.mocked(searchCampgroundsNearby).mockReset();
  vi.mocked(searchWalmartNearby).mockReset();
});

describe('ParkingSearch', () => {
  it('searches both campgrounds and Walmart near the selected waypoint, sorted by distance', async () => {
    const user = userEvent.setup();
    vi.mocked(searchCampgroundsNearby).mockResolvedValue([
      { placeId: 'camp-far', name: 'Far Campground', address: '1 Far Rd', lat: 46.0, lng: -92.8055 },
    ]);
    vi.mocked(searchWalmartNearby).mockResolvedValue([
      { placeId: 'walmart-near', name: 'Walmart Supercenter', address: '2 Near Rd', lat: 45.06, lng: -92.8055 },
    ]);

    render(<ParkingSearch />);
    await user.click(screen.getByText(/Search campgrounds/));

    expect(await screen.findByText('Far Campground')).toBeInTheDocument();
    expect(screen.getByText('Walmart Supercenter')).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Walmart Supercenter')).toBeInTheDocument();
    expect(within(items[1]).getByText('Far Campground')).toBeInTheDocument();
  });

  it('saving a hit adds it to the store for the selected waypoint and disables its Save button', async () => {
    const user = userEvent.setup();
    vi.mocked(searchCampgroundsNearby).mockResolvedValue([
      { placeId: 'camp-1', name: 'Riverside Campground', address: '1 River Rd', lat: 45.1, lng: -92.8 },
    ]);
    vi.mocked(searchWalmartNearby).mockResolvedValue([]);

    render(<ParkingSearch />);
    await user.click(screen.getByText(/Search campgrounds/));
    await screen.findByText('Riverside Campground');

    const stillwaterId = useTripStore.getState().waypoints[0].id;
    await user.click(screen.getByText('Save to trip'));

    const spots = useTripStore.getState().parkingSpots;
    expect(spots).toHaveLength(1);
    expect(spots[0]).toMatchObject({
      waypointId: stillwaterId,
      placeId: 'camp-1',
      name: 'Riverside Campground',
      category: 'campground',
    });
    expect(screen.getByText('Saved')).toBeDisabled();
  });

  it('renders saved spots for the selected waypoint with editable notes and a remove button', async () => {
    const user = userEvent.setup();
    const stillwaterId = useTripStore.getState().waypoints[0].id;
    useTripStore.getState().addParkingSpot({
      waypointId: stillwaterId,
      placeId: 'p1',
      name: 'Saved Spot',
      address: '123 Main',
      category: 'walmart',
      lat: 1,
      lng: 2,
      notes: '',
    });

    render(<ParkingSearch />);
    expect(screen.getByText('Saved Spot')).toBeInTheDocument();

    const notesInput = screen.getByPlaceholderText(/confirmed overnight OK/);
    await user.type(notesInput, 'called ahead, OK');
    expect(useTripStore.getState().parkingSpots[0].notes).toContain('called ahead, OK');

    await user.click(screen.getByText('Remove'));
    expect(useTripStore.getState().parkingSpots).toHaveLength(0);
  });

  it('searches near a different waypoint and radius once changed', async () => {
    const user = userEvent.setup();
    vi.mocked(searchCampgroundsNearby).mockResolvedValue([]);
    vi.mocked(searchWalmartNearby).mockResolvedValue([]);

    render(<ParkingSearch />);
    const denver = useTripStore.getState().waypoints[2];
    await user.selectOptions(screen.getByRole('combobox'), denver.id);

    const radiusInput = screen.getByRole('spinbutton');
    await user.clear(radiusInput);
    await user.type(radiusInput, '25');

    await user.click(screen.getByText(/Search campgrounds/));

    expect(searchCampgroundsNearby).toHaveBeenCalledWith({ lat: denver.lat, lng: denver.lng }, 25 * 1609.344);
  });

  it('shows an error message when the search fails', async () => {
    const user = userEvent.setup();
    vi.mocked(searchCampgroundsNearby).mockRejectedValue(new Error('quota exceeded'));
    vi.mocked(searchWalmartNearby).mockResolvedValue([]);

    render(<ParkingSearch />);
    await user.click(screen.getByText(/Search campgrounds/));
    expect(await screen.findByText(/Search failed/)).toBeInTheDocument();
  });
});
