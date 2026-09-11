/**
 * Shape of the remote crossings config. This is the contract the app will
 * eventually `fetch()` from a server-hosted JSON endpoint (see README —
 * "Config backend" is intentionally not built yet). Keeping the app's
 * internal types identical to that future wire format means swapping the
 * mock loader in `src/config/crossings.ts` for a real fetch is a one-line
 * change, not a redesign.
 */

import type { ChargeableHours, ChargePeriod } from '../config/chargeableHours';

export type CrossingType = 'point' | 'zone';

export interface PointGeofence {
  kind: 'circle';
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

/**
 * A zone crossing (e.g. ULEZ) is defined by its true boundary — one or more
 * simple polygons (GeoJSON-style rings of [lng, lat] pairs, no holes),
 * sourced from the authority's published boundary data. Native circular
 * geofencing (iOS/Android) cannot represent a shape like this at all, let
 * alone accurately, so it's never turned into circular regions the way
 * point crossings are. Instead the engine uses a two-tier approach: a
 * single permanent circular geofence at `centroid` with radius
 * `wakeRadiusMeters` as a cheap "wake up" trigger, and a real
 * point-in-polygon check against `polygons` run on background location
 * updates only while inside that circle. See src/geofencing/README.md
 * ("Why ULEZ is different") and src/geofencing/engine.ts.
 */
export interface ZoneGeofence {
  kind: 'polygon';
  /** Each element is one simple closed ring of [longitude, latitude] pairs — no holes. A position counts as inside the zone if it's inside ANY of them (a real administrative boundary is rarely one single contour). */
  polygons: Array<Array<[number, number]>>;
  /** Centroid of the boundary — where the wake-up geofence is centered. */
  centroid: { latitude: number; longitude: number };
  /**
   * Radius (metres) of the permanent circular wake-up geofence at
   * `centroid`. Must comfortably contain every polygon above; the
   * fine-grained polygon check only ever runs once the device is inside
   * this circle, so too small a radius means missed detections right at
   * the true boundary's edge — see the derivation note where this value
   * is set (src/config/ulezBoundary.ts) before changing it.
   */
  wakeRadiusMeters: number;
}

export type Geofence = PointGeofence | ZoneGeofence;

export interface FineStage {
  /** e.g. "Reduced rate if paid within 14 days", "Final notice after 28 days". Carries the direction/condition — daysUntilThreshold alone is ambiguous. */
  label: string;
  amount: number;
  currency: 'GBP';
  /**
   * Day count (from the payment deadline, not the crossing itself) this
   * checkpoint refers to — 0 for the notice's initial/base amount. Stages
   * are listed chronologically; the last stage's amount is treated as
   * applying indefinitely beyond its threshold unless `note` says otherwise.
   */
  daysUntilThreshold: number;
  /** Uncertain figures, disputed rules, ANPR-misread warnings, etc. — surface softly in the UI, not as settled fact. */
  note?: string;
}

/**
 * Toll/fine rules for a charging authority. Pulled out from `Crossing` so
 * that crossings sharing one real-world scheme (Blackwall & Silvertown under
 * TfL; Mersey Gateway & Silver Jubilee under Merseyflow) can point at the
 * exact same object instead of duplicating figures that could drift out of
 * sync when only one crossing's config gets updated. See
 * src/config/crossings.ts for how the two shared schemes are defined once
 * and referenced twice.
 */
export interface ChargingScheme {
  /** Shared id, mainly so it's obvious in the data (and in future backend design) which crossings are the same underlying scheme. */
  id: string;
  operator: string;
  /**
   * Conservative *minimum* hours from the crossing timestamp to the payment
   * deadline, for reminder-scheduling purposes. Real deadlines here are
   * calendar-midnight-based ("midnight the day after crossing") rather than
   * a fixed offset, so the true deadline can be up to ~24h later than this
   * depending on time of day — `paymentDeadlineLabel` has the exact rule for
   * display; don't rely on this number alone to compute the shown deadline.
   */
  paymentDeadlineHours: number;
  /** Exact human-readable rule, e.g. "Midnight the day after crossing". */
  paymentDeadlineLabel: string;
  /**
   * How often this scheme bills. Defaults to per-crossing when omitted, which
   * is right for eight of the nine — the ULEZ is the exception, charging once
   * per day however many times you enter.
   */
  chargePeriod?: ChargePeriod;
  fineStages: FineStage[];
  sourceUrl: string;
  /** ISO date these figures were last checked against the source. Toll/PCN rates change often (several changed in the last 12 months) — treat as stale until re-checked. */
  verifiedAt: string;
  /** Scheme-wide caveat surfaced in the UI, e.g. known ANPR-misread issues or a disputed deadline claim. */
  caveat?: string;
}

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
  scheme: ChargingScheme;
  /**
   * When the charge actually applies. Omit for a crossing charged 24/7 with
   * no free dates.
   *
   * Without this the app alerted at any hour, so a 3am Dartford crossing told
   * the driver to pay a charge that is free between 22:00 and 06:00 — see
   * src/config/chargeableHours.ts.
   */
  chargeableHours?: ChargeableHours;
  /**
   * False until `geofence`'s coordinates have been checked against a
   * surveyed source (OS OpenData / OpenStreetMap) and the radius sized for
   * the actual structure. Every crossing added in the 2026-09 real-world
   * data pass is a landmark-level approximation from general knowledge, not
   * surveyed data — see src/geofencing/README.md's field-verification
   * checklist before this goes near a real device.
   */
  coordinatesVerified: boolean;
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
