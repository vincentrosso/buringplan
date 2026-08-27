import type { RouteLeg, Waypoint } from '../types';

const cache = new Map<string, RouteLeg>();

function legKey(from: Waypoint, to: Waypoint): string {
  return `${from.id}:${to.id}`;
}

// Fetches driving distance/duration for one leg, using an in-memory cache so
// reordering/re-rendering the waypoint list doesn't re-hit the Directions API
// for legs that haven't changed.
export async function fetchLeg(from: Waypoint, to: Waypoint): Promise<RouteLeg> {
  const key = legKey(from, to);
  const cached = cache.get(key);
  if (cached) return cached;

  const service = new google.maps.DirectionsService();
  const result = await service.route({
    origin: { lat: from.lat, lng: from.lng },
    destination: { lat: to.lat, lng: to.lng },
    travelMode: google.maps.TravelMode.DRIVING,
  });

  const route = result.routes[0];
  const leg = route?.legs[0];
  if (!leg) {
    throw new Error(`No route found between ${from.name} and ${to.name}`);
  }

  const routeLeg: RouteLeg = {
    fromId: from.id,
    toId: to.id,
    distanceMeters: leg.distance?.value ?? 0,
    durationSeconds: leg.duration?.value ?? 0,
    polyline: route.overview_polyline ?? '',
  };
  cache.set(key, routeLeg);
  return routeLeg;
}

export async function fetchRouteLegs(waypoints: Waypoint[]): Promise<RouteLeg[]> {
  const legs: RouteLeg[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    legs.push(await fetchLeg(waypoints[i], waypoints[i + 1]));
  }
  return legs;
}

export function clearLegCache(): void {
  cache.clear();
}
