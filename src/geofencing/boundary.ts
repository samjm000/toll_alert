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
 * Ray-casting point-in-polygon test against a single closed [lng, lat] ring
 * (GeoJSON winding). No hole support — nothing in this app's boundary data
 * needs it (see `isPointInAnyPolygon` for the multi-polygon case a real
 * zone boundary like ULEZ actually has).
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
 * True if `point` is inside any of `polygons` — a real administrative
 * boundary (e.g. ULEZ) is rarely one single contour; TfL's own published
 * ULEZ data is 22 separate simple polygons (one large contiguous area plus
 * small separate enclaves) whose union is "inside the zone". Run on every
 * background location update while inside the coarse wake-up geofence —
 * see engine.ts.
 */
export function isPointInAnyPolygon(point: LatLng, polygons: Array<Array<[number, number]>>): boolean {
  return polygons.some((ring) => isPointInPolygon(point, ring));
}
