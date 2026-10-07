/**
 * The London Congestion Charge zone boundary — APPROXIMATE.
 *
 * Client ask (2026-09-24, via Rob): "can you add the congestion charge".
 *
 * ---------------------------------------------------------------------------
 * NOT OFFICIAL DATA — REPLACE BEFORE RELYING ON IT
 * ---------------------------------------------------------------------------
 * Unlike the ULEZ boundary (src/config/ulezBoundary.ts), which is TfL's own
 * published data, this is a hand-drawn ring of 21 landmark points along the
 * Inner Ring Road, which is what the zone boundary follows: Park Lane,
 * Edgware Road, Marylebone / Euston Road, Pentonville Road, City Road,
 * Great Eastern Street, Commercial Street, Mansell Street, Tower Bridge,
 * Tower Bridge Road, New Kent Road, Kennington Lane, Vauxhall Bridge Road and
 * Grosvenor Place. The official boundary file (London Datastore / TfL) was
 * not reachable when this was written.
 *
 * What that means in practice: the ring road itself is NOT charged, and
 * straight lines between landmarks cut corners the real boundary follows,
 * so near the edge — within roughly 100-200m of the ring road — this can
 * both miss a real entry and alert for a drive that only used the ring road.
 * Anywhere properly inside (Trafalgar Square, Oxford Street, the City) is
 * unaffected. Hence `coordinatesVerified: false` on the crossing.
 *
 * TO REPLACE IT: download TfL's Congestion Charge zone boundary (London
 * Datastore, OGL), convert and simplify it the same way ulezBoundary.ts
 * describes, keep the `CongestionChargeBoundary` shape, recompute
 * `centroid` / `wakeRadiusMeters`, add the licence attribution to
 * `CONGESTION_CHARGE_BOUNDARY_META`, and set its `verifiedAt`.
 */
export interface CongestionChargeBoundary {
  /** One simple closed ring of [longitude, latitude] pairs, GeoJSON winding. */
  polygons: Array<Array<[number, number]>>;
  centroid: { latitude: number; longitude: number };
  /**
   * Radius (metres) of the permanent circular "wake" geofence at `centroid`.
   * The furthest ring point is 3,767m from the centroid; 6,000m adds a
   * margin over 2km. Kept far smaller than the ULEZ's 37km on purpose — but
   * note it sits entirely inside the ULEZ wake circle, which is why the
   * engine must not stop location updates on leaving this circle while the
   * ULEZ one still needs them (see engine.ts, wake EXIT handler).
   */
  wakeRadiusMeters: number;
}

export const CONGESTION_CHARGE_BOUNDARY: CongestionChargeBoundary = {
  polygons: [
    [
      [-0.1589, 51.5131], // Marble Arch
      [-0.1612, 51.5142], // Edgware Road, south end
      [-0.169, 51.52], // Edgware Road / Marylebone Road
      [-0.1571, 51.5226], // Baker Street
      [-0.1439, 51.5238], // Great Portland Street
      [-0.135, 51.5257], // Euston
      [-0.1238, 51.5308], // King's Cross
      [-0.1058, 51.5322], // Angel
      [-0.0875, 51.5256], // Old Street roundabout
      [-0.0775, 51.5245], // Great Eastern Street / Shoreditch High Street
      [-0.072, 51.5153], // Commercial Street / Aldgate East
      [-0.0735, 51.5095], // Mansell Street / Tower Hill
      [-0.0754, 51.5066], // Tower Bridge, north end
      [-0.0752, 51.504], // Tower Bridge, south end
      [-0.0843, 51.4948], // Bricklayers Arms
      [-0.1005, 51.4946], // Elephant & Castle
      [-0.106, 51.489], // Kennington Lane, east end
      [-0.1238, 51.4862], // Vauxhall Cross
      [-0.127, 51.488], // Vauxhall Bridge, north end
      [-0.143, 51.496], // Victoria
      [-0.152, 51.5027], // Hyde Park Corner
      [-0.1589, 51.5131], // back to Marble Arch
    ],
  ],
  centroid: { latitude: 51.51044, longitude: -0.11678 },
  wakeRadiusMeters: 6000,
};

export const CONGESTION_CHARGE_BOUNDARY_META = {
  attribution:
    'Approximate boundary drawn along the Inner Ring Road — check TfL’s zone map if you drove near the edge.',
  // Deliberately absent until replaced with TfL's published boundary.
  verifiedAt: undefined as string | undefined,
};
