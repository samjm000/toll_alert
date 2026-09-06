import { ChargingScheme, CrossingsConfig } from '../types/crossing';
import { ULEZ_BOUNDARY, ULEZ_BOUNDARY_META } from './ulezBoundary';

/**
 * MOCK remote config — stands in for the server-hosted JSON endpoint the
 * real app will fetch (see README, "Config backend: client contract only").
 * Nothing here is hardcoded into a native binary; this module is the single
 * seam to swap for a real `fetch(CONFIG_URL)` later.
 *
 * ---------------------------------------------------------------------------
 * REAL-WORLD DATA PASS — 2026-09-05. DO NOT TREAT AS FINAL.
 * ---------------------------------------------------------------------------
 * The eight target UK toll crossings below (Dartford, Blackwall, Silvertown,
 * Mersey Gateway, Silver Jubilee, Tyne Tunnel, Humber Bridge, Warburton) were
 * populated from the client brief's research, not a live API or a surveyed
 * dataset. Two things are true at once:
 *
 * 1. The toll/fine/deadline figures are sourced from each authority's
 *    published pages (see each scheme's `sourceUrl`) as of `verifiedAt`.
 *    These change often — several of these eight changed in the last 12
 *    months — so `verifiedAt` going stale is expected, not a bug. Re-check
 *    every scheme against its source before this ships, and again on any
 *    cadence you'd trust for "the fine amount shown is real."
 * 2. Every `geofence`'s coordinates are landmark-level approximations from
 *    general geographic knowledge (`coordinatesVerified: false` on all of
 *    them) — NOT surveyed data. See src/geofencing/README.md's checklist:
 *    these need checking against OS OpenData / OpenStreetMap before any of
 *    this goes near a real device.
 *
 *    `radiusMeters` is no longer a flat 250m guess everywhere — it's
 *    reasoned per crossing from its type and realistic driving speed
 *    (2026-09-06), not measured data. There deliberately isn't, and won't
 *    be, any tester-facing logging/telemetry/upload to gather real
 *    detection data — testers are non-technical, and the only feedback
 *    channel is Rob asking each one directly, in plain language, whether
 *    and roughly when they got an alert. So this is a best-reasoned
 *    starting point, not a placeholder to be replaced by measured data
 *    later; treat any future adjustment as "reasoned again, better" rather
 *    than "finally measured." Three categories, explained at each
 *    crossing below:
 *      - Motorway-speed open crossings (Dartford, Mersey Gateway, Silver
 *        Jubilee): crossed at 60-70mph with no GPS obstruction, but
 *        observed geofence transition latency has run into minutes, not
 *        seconds (see src/geofencing/README.md's emulator test notes) —
 *        sized generously so a vehicle at that speed is still plausibly
 *        inside when a delayed check finally lands.
 *      - Tunnel portals (Blackwall, Silvertown, Tyne Tunnel): GPS drops out
 *        inside the tunnel entirely, so detection depends on catching the
 *        last fix before signal loss or the first fix after re-acquiring
 *        it, not on covering the tunnel's interior (which is impossible
 *        with GPS regardless of radius). Sized around the portal, not the
 *        tunnel length.
 *      - Lower-speed / constrained crossings (Humber Bridge, Warburton):
 *        lower speed limits and narrower structures mean less distance
 *        covered per unit of detection latency, so a tighter radius still
 *        has a good chance of catching a check — kept smaller so it stays
 *        specific to the actual structure rather than bleeding into
 *        surrounding roads.
 *
 * ULEZ's boundary below is the real thing as of 2026-09-05 (see
 * src/config/ulezBoundary.ts for the source, licence, and processing
 * notes) — no longer the old illustrative rectangle. It's also detected
 * completely differently from the 8 point crossings above: a rectangle (or
 * any small set of circles) fundamentally cannot represent ULEZ's actual
 * shape, so this uses a real point-in-polygon check against the real
 * boundary instead of native circular geofencing. See
 * src/geofencing/README.md ("Why ULEZ is different") and engine.ts.
 */

/**
 * Shared by Blackwall Tunnel and Silvertown Tunnel — one TfL charging scheme
 * run across both, so both crossings below point at this exact object rather
 * than duplicating figures that could drift out of sync if only one gets
 * updated. (A real backend still has to decide how to represent this
 * sharing on the wire — duplicate the scheme per crossing, or have the
 * client fetch schemes separately and join them — that's a backend design
 * question for later, not solved here.)
 */
const TFL_TUNNELS_SCHEME: ChargingScheme = {
  id: 'tfl-silvertown-blackwall',
  operator: 'Transport for London (TfL)',
  // "Midnight on the third day after crossing" — conservative floor; see
  // ChargingScheme.paymentDeadlineHours doc comment on why this isn't exact.
  paymentDeadlineHours: 72,
  paymentDeadlineLabel: 'Midnight on the third day after crossing',
  fineStages: [
    { label: 'Penalty Charge Notice (PCN) issued', amount: 180, currency: 'GBP', daysUntilThreshold: 0 },
    { label: 'Reduced rate if paid within 14 days', amount: 90, currency: 'GBP', daysUntilThreshold: 14 },
    {
      label: 'Charge certificate if unpaid / no representation after 28 days',
      amount: 270,
      currency: 'GBP',
      daysUntilThreshold: 28,
      note:
        'Further Traffic Enforcement Centre costs may apply beyond this stage — exact figure not ' +
        'confirmed against tfl.gov.uk yet. Do not display a number for this beyond-28-day stage to ' +
        'users until verified.',
    },
  ],
  sourceUrl: 'https://tfl.gov.uk/modes/driving/silvertown-blackwall-tunnels-charge',
  verifiedAt: '2026-09-05',
};

/**
 * Shared by Mersey Gateway Bridge and Silver Jubilee Bridge — one Merseyflow
 * scheme, Halton Borough Council is the charging authority. Same
 * shared-object rationale as TFL_TUNNELS_SCHEME above.
 */
const MERSEYFLOW_SCHEME: ChargingScheme = {
  id: 'merseyflow',
  operator: 'Merseyflow (Halton Borough Council)',
  paymentDeadlineHours: 24,
  paymentDeadlineLabel: 'Midnight the day after crossing',
  fineStages: [
    { label: 'Penalty Charge Notice (PCN) issued', amount: 50, currency: 'GBP', daysUntilThreshold: 0 },
    { label: 'Reduced rate if paid within 14 days', amount: 25, currency: 'GBP', daysUntilThreshold: 14 },
    {
      label: 'Charge certificate if unpaid',
      amount: 75,
      currency: 'GBP',
      // Merseyflow's own pages don't state the exact day count for this
      // stage; 28 is inferred from the standard UK PCN 14/28-day pattern
      // used elsewhere in this file (Dartford, TfL), NOT confirmed against
      // merseyflow.co.uk. Verify before relying on it.
      daysUntilThreshold: 28,
      note:
        'Day threshold inferred from the standard UK PCN 14/28-day escalation pattern, not stated ' +
        'explicitly on merseyflow.co.uk — verify. Further bailiff/enforcement costs possible beyond this.',
    },
  ],
  sourceUrl: 'https://www.merseyflow.co.uk/',
  verifiedAt: '2026-09-05',
  caveat:
    'At least one third-party source claims a same-day (not next-day) payment deadline. Confirm ' +
    'directly with Merseyflow before shipping — see src/geofencing/README.md.',
};

const DART_CHARGE_SCHEME: ChargingScheme = {
  id: 'dart-charge',
  operator: 'Dart Charge (National Highways)',
  paymentDeadlineHours: 24,
  paymentDeadlineLabel: 'Midnight the day after crossing',
  fineStages: [
    { label: 'Penalty Charge Notice (PCN) issued', amount: 70, currency: 'GBP', daysUntilThreshold: 0 },
    { label: 'Reduced rate if paid within 14 days', amount: 35, currency: 'GBP', daysUntilThreshold: 14 },
    {
      label: 'Increased charge if unpaid after 28 days',
      amount: 105,
      currency: 'GBP',
      daysUntilThreshold: 28,
      note: 'Registered at the Traffic Enforcement Centre from this point; bailiff/court costs possible beyond this.',
    },
  ],
  sourceUrl: 'https://www.gov.uk/pay-dartford-crossing-charge',
  verifiedAt: '2026-09-05',
};

const TT2_SCHEME: ChargingScheme = {
  id: 'tt2-tyne-tunnel',
  operator: 'TT2',
  paymentDeadlineHours: 24,
  paymentDeadlineLabel: 'Midnight the day after travel',
  fineStages: [
    {
      label: 'Unpaid Toll Charge Notice (UTCN) issued',
      amount: 30,
      currency: 'GBP',
      daysUntilThreshold: 0,
      note: 'Plus the unpaid toll itself.',
    },
    {
      label: 'Increased if unpaid after 14 days',
      amount: 60,
      currency: 'GBP',
      daysUntilThreshold: 14,
      note: 'Plus the unpaid toll itself.',
    },
    {
      label: 'Final notice if unpaid after 28 days',
      amount: 100,
      currency: 'GBP',
      daysUntilThreshold: 28,
      note: 'Plus the unpaid toll itself.',
    },
    {
      label: 'Passed to a collection agency',
      amount: 79,
      currency: 'GBP',
      daysUntilThreshold: 29,
      note: 'Additional fee on top of the £100 final notice + toll (i.e. up to £179 + toll total), not a standalone amount.',
    },
  ],
  sourceUrl: 'https://www.tt2.co.uk/',
  verifiedAt: '2026-09-05',
  caveat: 'Toll rate shown is effective from 1 May 2026 — confirm it hasn’t changed again since.',
};

const HUMBER_BRIDGE_SCHEME: ChargingScheme = {
  id: 'humber-bridge',
  operator: 'Humber Bridge Board',
  paymentDeadlineHours: 24,
  paymentDeadlineLabel: 'Midnight the day after crossing',
  fineStages: [
    {
      label: 'Admin fee added to the unpaid toll',
      amount: 25,
      currency: 'GBP',
      daysUntilThreshold: 0,
      note: 'No further published fixed tiers beyond this; continued non-payment can lead to collection agency involvement.',
    },
  ],
  sourceUrl: 'https://www.humberbridge.co.uk/',
  verifiedAt: '2026-09-05',
  caveat:
    'The new cashless "Humber Bridge Toll" system (live since 2 Feb 2026) had widely reported ANPR ' +
    'misread issues and wrongful fines in its first months. Present any fine here as disputable, not ' +
    'certain, and link the official appeal process rather than alarming the user.',
};

const WARBURTON_SCHEME: ChargingScheme = {
  id: 'warburton-toll-bridge',
  operator: 'Manchester Ship Canal Company (enforcement: Excel Parking Services)',
  paymentDeadlineHours: 24,
  paymentDeadlineLabel: 'Midnight the day after travel',
  fineStages: [
    { label: 'If paid within 14 days', amount: 30, currency: 'GBP', daysUntilThreshold: 14 },
    { label: 'If paid 14–28 days after', amount: 60, currency: 'GBP', daysUntilThreshold: 28 },
    { label: 'If unpaid after 28 days', amount: 100, currency: 'GBP', daysUntilThreshold: 29 },
  ],
  sourceUrl: 'https://www.warburtontollbridge.co.uk/',
  verifiedAt: '2026-09-05',
  caveat:
    'Mid-2026 reporting found a large volume of ANPR misreads generating wrongful fines here too — ' +
    'same soft, appeal-aware copy as Humber Bridge, not alarmist language.',
};

export const MOCK_CROSSINGS_CONFIG: CrossingsConfig = {
  version: 2,
  fetchedAt: new Date().toISOString(),
  crossings: [
    {
      id: 'dartford-crossing',
      name: 'Dartford Crossing (Dart Charge)',
      shortName: 'Dartford',
      type: 'point',
      geofence: {
        kind: 'circle',
        // M25 J1A (Kent) to J31 (Essex) — approximate, verify precisely.
        latitude: 51.4657,
        longitude: 0.2649,
        // Motorway-speed open crossing (60-70mph) — sized generously so a
        // fast vehicle is still plausibly inside on a delayed check. NOTE:
        // Dartford is actually two structures a few hundred metres apart —
        // the open-air QEII Bridge (southbound) and the twin-bore Dartford
        // Tunnel (northbound, GPS drops out inside it like the other
        // tunnel portals below). One circle can't precisely represent
        // both; sized for the open-bridge/motorway-speed case since that
        // carries the majority of traffic and has no GPS obstruction, but
        // the tunnel-specific last-fix/first-fix risk isn't separately
        // addressed — flagging rather than pretending one circle solves it.
        radiusMeters: 600,
      },
      price: {
        amount: 3.5,
        currency: 'GBP',
        label: '£3.50 (car) — free 22:00–06:00',
      },
      paymentUrl: 'https://www.gov.uk/pay-dartford-crossing-charge',
      infoUrl: 'https://www.gov.uk/pay-dartford-crossing-charge',
      scheme: DART_CHARGE_SCHEME,
      coordinatesVerified: false,
    },
    {
      id: 'ulez',
      name: 'Ultra Low Emission Zone (ULEZ)',
      shortName: 'ULEZ',
      type: 'zone',
      geofence: {
        kind: 'polygon',
        centroid: ULEZ_BOUNDARY.centroid,
        polygons: ULEZ_BOUNDARY.polygons,
        wakeRadiusMeters: ULEZ_BOUNDARY.wakeRadiusMeters,
      },
      price: {
        amount: 12.5,
        currency: 'GBP',
        label: '£12.50 per day (non-compliant vehicles)',
      },
      paymentUrl: 'https://tfl.gov.uk/modes/driving/ultra-low-emission-zone',
      infoUrl: 'https://tfl.gov.uk/modes/driving/ultra-low-emission-zone',
      scheme: {
        id: 'tfl-ulez',
        operator: 'Transport for London (TfL)',
        paymentDeadlineHours: 72,
        paymentDeadlineLabel: 'Midnight 3 days after driving in the zone',
        fineStages: [
          { label: 'Penalty Charge Notice (PCN) issued', amount: 180, currency: 'GBP', daysUntilThreshold: 0 },
          { label: 'Reduced rate if paid within 14 days', amount: 90, currency: 'GBP', daysUntilThreshold: 14 },
        ],
        sourceUrl: 'https://tfl.gov.uk/modes/driving/ultra-low-emission-zone',
        verifiedAt: '2026-09-05',
      },
      // Unlike the 8 point crossings below, ULEZ's geofence really is
      // verified — it's TfL's own published boundary data, not a
      // landmark-level guess. See src/config/ulezBoundary.ts.
      coordinatesVerified: true,
    },
    {
      id: 'blackwall-tunnel',
      name: 'Blackwall Tunnel (Silvertown & Blackwall Tunnels Charge)',
      shortName: 'Blackwall',
      type: 'point',
      geofence: {
        kind: 'circle',
        // Tower Hamlets/Greenwich — approximate, verify precisely.
        latitude: 51.5028,
        longitude: 0.0037,
        // Tunnel portal — GPS drops out inside, so this only needs to
        // reliably catch a fix right at the entrance, not cover the
        // tunnel's length (impossible with GPS regardless of radius).
        radiusMeters: 300,
      },
      price: {
        amount: 4.0,
        currency: 'GBP',
        label: '£1.50 (off-peak, Auto Pay) to £4.00 (peak/non-Auto Pay)',
      },
      paymentUrl: 'https://tfl.gov.uk/modes/driving/silvertown-blackwall-tunnels-charge',
      infoUrl: 'https://tfl.gov.uk/modes/driving/silvertown-blackwall-tunnels-charge',
      scheme: TFL_TUNNELS_SCHEME,
      coordinatesVerified: false,
    },
    {
      id: 'silvertown-tunnel',
      name: 'Silvertown Tunnel (Silvertown & Blackwall Tunnels Charge)',
      shortName: 'Silvertown',
      type: 'point',
      geofence: {
        kind: 'circle',
        latitude: 51.4973,
        longitude: 0.0093,
        // Tunnel portal — same reasoning as Blackwall above.
        radiusMeters: 300,
      },
      price: {
        amount: 4.0,
        currency: 'GBP',
        label: '£1.50 (off-peak, Auto Pay) to £4.00 (peak/non-Auto Pay)',
      },
      paymentUrl: 'https://tfl.gov.uk/modes/driving/silvertown-blackwall-tunnels-charge',
      infoUrl: 'https://tfl.gov.uk/modes/driving/silvertown-blackwall-tunnels-charge',
      scheme: TFL_TUNNELS_SCHEME,
      coordinatesVerified: false,
    },
    {
      id: 'mersey-gateway-bridge',
      name: 'Mersey Gateway Bridge (Merseyflow)',
      shortName: 'Mersey Gateway',
      type: 'point',
      geofence: {
        kind: 'circle',
        // Runcorn/Widnes — approximate, verify precisely.
        latitude: 53.3406,
        longitude: -2.7286,
        // Motorway-speed open crossing — same reasoning as Dartford above.
        radiusMeters: 600,
      },
      price: {
        amount: 2.1,
        currency: 'GBP',
        label: '~£2.10 (car) — approximate, verify current rate',
      },
      paymentUrl: 'https://www.merseyflow.co.uk/',
      infoUrl: 'https://www.merseyflow.co.uk/',
      scheme: MERSEYFLOW_SCHEME,
      coordinatesVerified: false,
    },
    {
      id: 'silver-jubilee-bridge',
      name: 'Silver Jubilee Bridge (Merseyflow)',
      shortName: 'Silver Jubilee',
      type: 'point',
      geofence: {
        kind: 'circle',
        latitude: 53.3453,
        longitude: -2.7345,
        // Motorway-speed open crossing — same reasoning as Dartford above.
        radiusMeters: 600,
      },
      price: {
        amount: 2.1,
        currency: 'GBP',
        label: '~£2.10 (car) — approximate, verify current rate',
      },
      paymentUrl: 'https://www.merseyflow.co.uk/',
      infoUrl: 'https://www.merseyflow.co.uk/',
      scheme: MERSEYFLOW_SCHEME,
      coordinatesVerified: false,
    },
    {
      id: 'tyne-tunnel',
      name: 'Tyne Tunnel (TT2)',
      shortName: 'Tyne Tunnel',
      type: 'point',
      geofence: {
        kind: 'circle',
        // Jarrow/Howdon — approximate, verify precisely. Covers both bores.
        latitude: 54.9857,
        longitude: -1.4466,
        // Tunnel portal, not motorway-speed-open, despite the approach
        // roads being motorway-speed: unlike Dartford, both directions
        // here go through a bore (no open-air alternative), so the
        // GPS-drops-out-inside-the-tunnel problem is the dominant risk for
        // this crossing specifically — same reasoning as Blackwall/
        // Silvertown above, not the open-bridge crossings.
        radiusMeters: 300,
      },
      price: {
        amount: 2.6,
        currency: 'GBP',
        label: '£2.60 (car, rate effective 1 May 2026)',
      },
      paymentUrl: 'https://www.tt2.co.uk/',
      infoUrl: 'https://www.tt2.co.uk/',
      scheme: TT2_SCHEME,
      coordinatesVerified: false,
    },
    {
      id: 'humber-bridge',
      name: 'Humber Bridge',
      shortName: 'Humber Bridge',
      type: 'point',
      geofence: {
        kind: 'circle',
        // Hessle/Barton-upon-Humber — approximate, verify precisely.
        latitude: 53.7101,
        longitude: -0.4478,
        // Lower-speed / constrained crossing — kept at 250m like the other
        // lower-speed-category crossing (Warburton, below) rather than
        // treated as a special case; see the file-level comment's
        // "Lower-speed / constrained crossings" category.
        radiusMeters: 250,
      },
      price: {
        amount: 2.0,
        currency: 'GBP',
        label: '£2.00 (car, one-way)',
      },
      paymentUrl: 'https://www.humberbridge.co.uk/',
      infoUrl: 'https://www.humberbridge.co.uk/',
      scheme: HUMBER_BRIDGE_SCHEME,
      coordinatesVerified: false,
    },
    {
      id: 'warburton-toll-bridge',
      name: 'Warburton Toll Bridge',
      shortName: 'Warburton',
      type: 'point',
      geofence: {
        kind: 'circle',
        // Warburton/Rixton, Cheshire — approximate, verify precisely.
        latitude: 53.4,
        longitude: -2.4939,
        // Lower-speed / constrained crossing — kept at 250m like the other
        // lower-speed-category crossing (Humber Bridge, above) rather than
        // treated as a special case; see the file-level comment's
        // "Lower-speed / constrained crossings" category.
        radiusMeters: 250,
      },
      price: {
        amount: 1.0,
        currency: 'GBP',
        label: '£1.00 per crossing (£2.00 daily cap per vehicle)',
      },
      paymentUrl: 'https://www.warburtontollbridge.co.uk/',
      infoUrl: 'https://www.warburtontollbridge.co.uk/',
      scheme: WARBURTON_SCHEME,
      coordinatesVerified: false,
    },
  ],
};

export interface SubscriptionConfig {
  annualPrice: {
    amount: number;
    currency: 'GBP';
  };
  /** Product identifiers for native IAP (StoreKit / Play Billing) — TBD once store listings exist. */
  productId: {
    ios: string;
    android: string;
  };
  renewalReminderDaysBefore: number;
  lapsedReminderIntervalDays: number;
}

/** Placeholder — final price is a business decision, not yet confirmed. */
export const MOCK_SUBSCRIPTION_CONFIG: SubscriptionConfig = {
  annualPrice: { amount: 4.99, currency: 'GBP' },
  productId: {
    ios: 'com.tollalert.subscription.annual',
    android: 'subscription_annual',
  },
  renewalReminderDaysBefore: 7,
  lapsedReminderIntervalDays: 7,
};
