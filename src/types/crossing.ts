/**
 * Shape of the remote crossings config. This is the contract the app will
 * eventually `fetch()` from a server-hosted JSON endpoint (see README —
 * "Config backend" is intentionally not built yet). Keeping the app's
 * internal types identical to that future wire format means swapping the
 * mock loader in `src/config/crossings.ts` for a real fetch is a one-line
 * change, not a redesign.
 */

export type CrossingType = 'point' | 'zone';

export interface PointGeofence {
  kind: 'circle';
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

/**
 * A zone crossing (e.g. ULEZ) is defined by its true boundary polygon
 * (GeoJSON-style ring of [lng, lat] pairs, sourced from TfL's published
 * boundary data). This is the *source geometry* used to derive dynamic
 * circular regions at runtime — it is not itself monitored directly, since
 * iOS only supports circular region monitoring. See README for the
 * dynamic-region-swapping approach that consumes this polygon.
 */
export interface ZoneGeofence {
  kind: 'polygon';
  boundary: Array<[number, number]>;
  /** Centroid used for coarse distance checks (e.g. significant-location-change gating). */
  centroid: { latitude: number; longitude: number };
}

export type Geofence = PointGeofence | ZoneGeofence;

export interface Crossing {
  id: string;
  name: string;
  shortName: string;
  type: CrossingType;
  geofence: Geofence;
  price: {
    amount: number;
    currency: 'GBP';
    label: string;
  };
  paymentUrl: string;
  infoUrl?: string;
  /** Deadline for paying after crossing, shown to the user (informational only, not enforced). */
  paymentWindow?: string;
}

export interface CrossingsConfig {
  /** Bumped whenever the app should treat this as a fresh config. */
  version: number;
  fetchedAt: string;
  crossings: Crossing[];
}

export type CrossingEventStatus = 'pending' | 'paid';

export interface CrossingEvent {
  id: string;
  crossingId: string;
  detectedAt: string;
  status: CrossingEventStatus;
  paidAt?: string;
}
