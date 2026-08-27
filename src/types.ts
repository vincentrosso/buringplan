export interface Waypoint {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  notes: string;
  plannedDate?: string;
}

export interface ParkingSpot {
  id: string;
  waypointId: string;
  placeId: string;
  name: string;
  address: string;
  category: 'campground' | 'walmart' | 'other';
  lat: number;
  lng: number;
  notes: string;
}

export interface RouteLeg {
  fromId: string;
  toId: string;
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
}

export interface GpsPing {
  tripId: string;
  lat: number;
  lng: number;
  speedMps: number | null;
  heading: number | null;
  accuracy: number | null;
  timestamp: number;
}

export interface DaySummary {
  tripId: string;
  startTime: number;
  endTime: number;
  distanceMiles: number;
  avgSpeedMph: number;
  maxSpeedMph: number;
  durationSeconds: number;
}
