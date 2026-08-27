import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParkingSpot, Waypoint } from '../types';

const SEED_WAYPOINTS: Waypoint[] = [
  {
    id: 'seed-stillwater',
    name: 'Stillwater, MN',
    address: 'Stillwater, MN, USA',
    lat: 45.0563,
    lng: -92.8055,
    notes: 'Start',
  },
  {
    id: 'seed-apple-valley',
    name: 'Apple Valley, MN',
    address: 'Apple Valley, MN, USA',
    lat: 44.7319,
    lng: -93.2177,
    notes: '',
  },
  {
    id: 'seed-denver',
    name: 'Denver, CO',
    address: 'Denver, CO, USA',
    lat: 39.7392,
    lng: -104.9903,
    notes: '',
  },
  {
    id: 'seed-gerlach',
    name: 'Gerlach, NV',
    address: 'Gerlach, NV, USA',
    lat: 40.6516,
    lng: -119.3609,
    notes: 'Destination',
  },
];

const DEFAULT_STOP_INTERVAL_HOURS = 6;
const DEFAULT_STOP_INTERVAL_MILES = 200;

interface TripState {
  waypoints: Waypoint[];
  parkingSpots: ParkingSpot[];
  stopIntervalHours: number;
  stopIntervalMiles: number;
  addWaypoint: (waypoint: Omit<Waypoint, 'id'>) => void;
  insertWaypointAt: (index: number, waypoint: Omit<Waypoint, 'id'>) => void;
  removeWaypoint: (id: string) => void;
  updateWaypoint: (id: string, patch: Partial<Waypoint>) => void;
  reorderWaypoints: (fromIndex: number, toIndex: number) => void;
  addParkingSpot: (spot: Omit<ParkingSpot, 'id'>) => void;
  removeParkingSpot: (id: string) => void;
  updateParkingSpotNotes: (id: string, notes: string) => void;
  setStopIntervalHours: (hours: number) => void;
  setStopIntervalMiles: (miles: number) => void;
}

function makeId(): string {
  return crypto.randomUUID();
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      waypoints: SEED_WAYPOINTS,
      parkingSpots: [],
      stopIntervalHours: DEFAULT_STOP_INTERVAL_HOURS,
      stopIntervalMiles: DEFAULT_STOP_INTERVAL_MILES,

      addWaypoint: (waypoint) =>
        set((state) => ({
          waypoints: [...state.waypoints, { ...waypoint, id: makeId() }],
        })),

      insertWaypointAt: (index, waypoint) =>
        set((state) => {
          const next = [...state.waypoints];
          next.splice(index, 0, { ...waypoint, id: makeId() });
          return { waypoints: next };
        }),

      removeWaypoint: (id) =>
        set((state) => ({
          waypoints: state.waypoints.filter((w) => w.id !== id),
          parkingSpots: state.parkingSpots.filter((p) => p.waypointId !== id),
        })),

      updateWaypoint: (id, patch) =>
        set((state) => ({
          waypoints: state.waypoints.map((w) =>
            w.id === id ? { ...w, ...patch } : w,
          ),
        })),

      reorderWaypoints: (fromIndex, toIndex) =>
        set((state) => {
          const next = [...state.waypoints];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          return { waypoints: next };
        }),

      addParkingSpot: (spot) =>
        set((state) => ({
          parkingSpots: [...state.parkingSpots, { ...spot, id: makeId() }],
        })),

      removeParkingSpot: (id) =>
        set((state) => ({
          parkingSpots: state.parkingSpots.filter((p) => p.id !== id),
        })),

      updateParkingSpotNotes: (id, notes) =>
        set((state) => ({
          parkingSpots: state.parkingSpots.map((p) =>
            p.id === id ? { ...p, notes } : p,
          ),
        })),

      setStopIntervalHours: (hours) => set({ stopIntervalHours: hours }),
      setStopIntervalMiles: (miles) => set({ stopIntervalMiles: miles }),
    }),
    { name: 'buringplan-trip' },
  ),
);
