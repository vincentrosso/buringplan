import { getAllDaySummaries, replaceAllDaySummaries } from '../store/tripLog';
import { useTripStore } from '../store/tripStore';
import type { DaySummary, ParkingSpot, Waypoint } from '../types';

// A snapshot is the whole restorable trip: the plan (zustand, localStorage) plus
// the trip log (IndexedDB day summaries). Raw GPS pings are intentionally left
// out — thousands of rows that don't survive a copy/paste and aren't the plan.
export const SNAPSHOT_VERSION = 1;

export interface TripSnapshot {
  app: 'buringplan';
  version: number;
  exportedAt: string;
  waypoints: Waypoint[];
  parkingSpots: ParkingSpot[];
  stopIntervalHours: number;
  stopIntervalMiles: number;
  daySummaries: DaySummary[];
}

export async function exportTripSnapshot(): Promise<string> {
  const { waypoints, parkingSpots, stopIntervalHours, stopIntervalMiles } = useTripStore.getState();
  const snapshot: TripSnapshot = {
    app: 'buringplan',
    version: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    waypoints,
    parkingSpots,
    stopIntervalHours,
    stopIntervalMiles,
    daySummaries: await getAllDaySummaries(),
  };
  return JSON.stringify(snapshot, null, 2);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function num(v: unknown): number {
  return isFiniteNumber(v) ? v : 0;
}

function parseWaypoint(raw: unknown, i: number): Waypoint {
  if (!raw || typeof raw !== 'object') throw new Error(`Stop ${i + 1} is not an object.`);
  const w = raw as Record<string, unknown>;
  if (!isFiniteNumber(w.lat) || !isFiniteNumber(w.lng)) {
    throw new Error(`Stop ${i + 1} is missing a valid lat/lng.`);
  }
  return {
    id: str(w.id) || crypto.randomUUID(),
    name: str(w.name),
    address: str(w.address),
    lat: w.lat,
    lng: w.lng,
    notes: str(w.notes),
    plannedDate: typeof w.plannedDate === 'string' ? w.plannedDate : undefined,
  };
}

function parseParkingSpot(raw: unknown, i: number): ParkingSpot {
  if (!raw || typeof raw !== 'object') throw new Error(`Parking spot ${i + 1} is not an object.`);
  const p = raw as Record<string, unknown>;
  if (!isFiniteNumber(p.lat) || !isFiniteNumber(p.lng)) {
    throw new Error(`Parking spot ${i + 1} is missing a valid lat/lng.`);
  }
  const category = p.category === 'campground' || p.category === 'walmart' ? p.category : 'other';
  return {
    id: str(p.id) || crypto.randomUUID(),
    waypointId: str(p.waypointId),
    placeId: str(p.placeId),
    name: str(p.name),
    address: str(p.address),
    category,
    lat: p.lat,
    lng: p.lng,
    notes: str(p.notes),
  };
}

function parseDaySummary(raw: unknown, i: number): DaySummary {
  if (!raw || typeof raw !== 'object') throw new Error(`Trip log entry ${i + 1} is not an object.`);
  const s = raw as Record<string, unknown>;
  if (!isFiniteNumber(s.startTime)) throw new Error(`Trip log entry ${i + 1} is missing a start time.`);
  return {
    tripId: str(s.tripId) || crypto.randomUUID(),
    label: typeof s.label === 'string' && s.label ? s.label : undefined,
    startTime: s.startTime,
    endTime: num(s.endTime),
    distanceMiles: num(s.distanceMiles),
    avgSpeedMph: num(s.avgSpeedMph),
    maxSpeedMph: num(s.maxSpeedMph),
    durationSeconds: num(s.durationSeconds),
  };
}

export function parseTripSnapshot(text: string): TripSnapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That doesn't look like trip data — it isn't valid JSON.");
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Trip data must be a JSON object.');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.app !== 'buringplan') {
    throw new Error("This isn't a buringplan export.");
  }
  if (obj.version !== SNAPSHOT_VERSION) {
    throw new Error(
      `Unsupported export version ${String(obj.version)} (this build reads version ${SNAPSHOT_VERSION}).`,
    );
  }
  const waypointsRaw = Array.isArray(obj.waypoints) ? obj.waypoints : [];
  const parkingRaw = Array.isArray(obj.parkingSpots) ? obj.parkingSpots : [];
  const summariesRaw = Array.isArray(obj.daySummaries) ? obj.daySummaries : [];
  return {
    app: 'buringplan',
    version: SNAPSHOT_VERSION,
    exportedAt: str(obj.exportedAt),
    waypoints: waypointsRaw.map(parseWaypoint),
    parkingSpots: parkingRaw.map(parseParkingSpot),
    stopIntervalHours: isFiniteNumber(obj.stopIntervalHours) ? obj.stopIntervalHours : 6,
    stopIntervalMiles: isFiniteNumber(obj.stopIntervalMiles) ? obj.stopIntervalMiles : 200,
    daySummaries: summariesRaw.map(parseDaySummary),
  };
}

export async function importTripSnapshot(text: string): Promise<TripSnapshot> {
  const snapshot = parseTripSnapshot(text);
  useTripStore.setState({
    waypoints: snapshot.waypoints,
    parkingSpots: snapshot.parkingSpots,
    stopIntervalHours: snapshot.stopIntervalHours,
    stopIntervalMiles: snapshot.stopIntervalMiles,
  });
  await replaceAllDaySummaries(snapshot.daySummaries);
  return snapshot;
}
