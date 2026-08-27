const EARTH_RADIUS_METERS = 6371000;
const METERS_PER_MILE = 1609.344;
const MPS_TO_MPH = 2.236936;

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function mpsToMph(mps: number): number {
  return mps * MPS_TO_MPH;
}

// GPS noise filter for a candidate ping against the last accepted point.
// Rejects points with poor accuracy or implausible speed jumps (a truck+trailer
// won't teleport at >120mph between two fixes a few seconds apart).
export function isPlausiblePing(
  prev: { lat: number; lng: number; timestamp: number } | null,
  next: { lat: number; lng: number; timestamp: number; accuracy: number | null },
): boolean {
  if (next.accuracy != null && next.accuracy > 50) return false;
  if (!prev) return true;

  const dtSeconds = (next.timestamp - prev.timestamp) / 1000;
  if (dtSeconds <= 0) return false;

  const distanceMeters = haversineMeters(prev, next);
  const impliedMph = mpsToMph(distanceMeters / dtSeconds);
  return impliedMph < 120;
}
