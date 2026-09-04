export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6371000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points, in meters. */
export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Ray-casting point-in-polygon test against a closed [lng, lat] ring (the
 * shape `ZoneGeofence.boundary` uses, matching GeoJSON winding). Confirms
 * which side of a zone boundary a coarse position update falls on — the
 * dynamic geofence regions only catch the *moment* of crossing, this is what
 * decides whether that moment was an entry or exit (see engine.ts).
 */
export function isPointInPolygon(point: LatLng, ring: Array<[number, number]>): boolean {
  let inside = false;
  const x = point.longitude;
  const y = point.latitude;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * The `count` points along `ring` closest to `position` — the boundary-point
 * set to ring with real circular geofences right now, per the dynamic
 * region-swapping strategy documented in ios.ts / android.ts. O(n log n) in
 * the ring's vertex count, which is fine at the size of one administrative
 * boundary (tens to low hundreds of points, not a fine-grained coastline).
 */
export function nearestBoundaryPoints(position: LatLng, ring: Array<[number, number]>, count: number): LatLng[] {
  return ring
    .map(([longitude, latitude]) => ({ latitude, longitude }))
    .sort((a, b) => haversineDistanceMeters(position, a) - haversineDistanceMeters(position, b))
    .slice(0, count);
}
