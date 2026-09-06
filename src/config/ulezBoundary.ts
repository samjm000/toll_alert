import ulezBoundaryData from './ulezBoundary.json';

/**
 * The real ULEZ boundary, replacing the old illustrative rectangle.
 *
 * SOURCE: "London Wide Ultra Low Emission Zone 2023", London Datastore
 * (Greater London Authority / Transport for London), downloaded 2026-09-05:
 * https://data.london.gov.uk/dataset/london-wide-ultra-low-emission-zone-2023-vd455
 * Direct file: https://data.london.gov.uk/download/vd455/0cab9a8b-ca8a-47b0-aaf8-0e77a9041a19/LondonWideUltraLowEmissionZone.geojson
 *
 * LICENCE: Open Government Licence v2.0 (OGL v2) — free to use, but requires
 * attribution. Attribution used in this app (Settings screen, and here):
 * "Contains public sector information licensed under the Open Government
 * Licence v3.0 — Transport for London / Greater London Authority."
 * (OGL v2 and v3 attribution wording is interchangeable per the Crown
 * copyright licensing pages; the dataset predates v3, hence "v2.0" above
 * for exactness about which version was actually granted.)
 *
 * VERIFIED: 2026-09-05. This is the 2023 London-wide ULEZ expansion boundary
 * — since 29 August 2023 the ULEZ boundary coincides with Greater London's
 * boundary (formerly the separate, smaller Low Emission Zone contour), which
 * is why the source dataset's own `BOUNDARY` property reads "Low Emission
 * Zone", not "Ultra Low Emission Zone" — that's the correct, current
 * boundary, not a data error. Re-verify before relying on this long-term;
 * TfL can and does change zone boundaries (see the Tech Forum announcement
 * "Data update: ULEZ and Congestion Charge boundaries").
 *
 * PROCESSING (see the one-off prep script this was generated from — not
 * shipped in the app, only the output below is):
 * 1. The source file's coordinates are in EPSG:27700 (British National
 *    Grid, easting/northing in metres) — converted to WGS84 lon/lat via
 *    `proj4` with the standard OSGB36→WGS84 7-parameter Helmert transform
 *    (no OSTN15 shift grid — accurate to a few metres across Great
 *    Britain, not survey-grade, but comfortably inside GPS's own ~5-20m
 *    accuracy for this app's purpose).
 * 2. The source has 22 separate polygon features (one large contiguous
 *    Greater London area plus 21 small separate pockets/enclaves) — all
 *    22 are kept below as separate simple polygons (no holes in the source
 *    data); a position counts as "inside ULEZ" if it's inside ANY of them.
 * 3. Simplified with Douglas-Peucker at a 15-metre tolerance: 24,857 raw
 *    vertices → 1,687. Chosen because 15m is well inside typical GPS
 *    accuracy — this simplification cannot make a real-world detection
 *    less accurate than the GPS fix itself already is, while cutting the
 *    bundled data by ~93% and making the per-update point-in-polygon check
 *    proportionally cheaper.
 *
 * VALIDATED (see src/geofencing/boundary.test.ts) against real reference
 * points: Dartford Crossing resolves outside; Trafalgar Square and
 * Heathrow Terminal 5 (the latter ~350m from the nearest boundary vertex —
 * a genuine near-edge case, not just "obviously inside") resolve inside; a
 * point ~170m outside the boundary near Heathrow's northwestern perimeter
 * resolves outside.
 */
export interface UlezBoundary {
  /** Each element is one simple closed ring of [longitude, latitude] pairs — GeoJSON winding, no holes. */
  polygons: Array<Array<[number, number]>>;
  centroid: { latitude: number; longitude: number };
  /**
   * Radius (metres) of the single permanent circular "wake" geofence
   * placed at `centroid` — see engine.ts. Computed as the real max
   * distance from the centroid to any boundary vertex (31,434m), plus a
   * 5km margin, rounded up to the nearest km. Must always fully contain
   * every polygon above.
   */
  wakeRadiusMeters: number;
}

// TS infers plain JSON tuples as `number[]`, not the stricter `[number, number]`
// this module promises callers — the data itself is correctly shaped (every
// inner array really does have exactly 2 elements), so this cast is safe.
export const ULEZ_BOUNDARY: UlezBoundary = ulezBoundaryData as UlezBoundary;

export const ULEZ_BOUNDARY_META = {
  sourceUrl: 'https://data.london.gov.uk/dataset/london-wide-ultra-low-emission-zone-2023-vd455',
  licence: 'Open Government Licence v2.0',
  attribution: 'Contains public sector information licensed under the Open Government Licence — Transport for London / Greater London Authority.',
  verifiedAt: '2026-09-05',
};
