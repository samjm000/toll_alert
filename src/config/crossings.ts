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
 *    be, any telemetry or automatic upload to gather real detection data —
 *    testers are non-technical. (Since 2026-09-09 there IS an on-device
 *    diagnostic log at Settings -> Diagnostics, which the tester can choose
 *    to Share; that's a manual, opt-in channel, not telemetry, and it exists
 *    because the first real tester drive produced no evidence of any kind —
 *    see src/geofencing/README.md.) Rob still asks each tester directly, in
 *    plain language, whether and roughly when they got an alert. So this is
 *    a best-reasoned
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
        // CORRECTED 2026-09-09. Was (51.4657, 0.2649), which sat 449m EAST
        // of the actual crossing — with the old 600m radius that left a
        // vehicle only ~25s inside the circle at 70mph, against geofence
        // latency this project has measured in minutes. It would have
        // missed most crossings even with every other bug fixed.
        //
        // Now the published crossing coordinate, 51°27'53"N 0°15'31"E,
        // corroborated by two independent sources that agree to within 43m
        // (Wikipedia's Dartford Crossing infobox; latitude.to's 51.4651,
        // 0.2587). Still NOT surveyed data — `coordinatesVerified` stays
        // false, because that flag means checked against OS OpenData/OSM
        // specifically, and neither of those was reachable from the
        // environment this was fixed in. Two agreeing published sources is
        // a large improvement on a landmark-level guess, not a substitute
        // for a survey.
        latitude: 51.46472,
        longitude: 0.25861,
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
        //
        // RADIUS WIDENED 2026-09-09, 600m -> 1400m, alongside the centre
        // correction above. Derived, not guessed: the QEII bridge crossing
        // including its approach viaducts is 2,871m end to end (1,051m
        // north viaduct + 821m bridge + 1,008m south viaduct), so 1,436m is
        // the half-length from mid-river. 1,400m therefore covers the whole
        // physical structure a charged vehicle drives over, and comfortably
        // covers the 1,430m tunnels on the northbound side too.
        //
        // It also buys detection latency headroom, which is the thing that
        // actually decides whether an alert fires: driving straight through,
        // 1,400m gives ~90s inside the circle at 70mph versus ~38s at 600m.
        // Below roughly a minute there's a real chance Android never samples
        // location while the vehicle is inside at all, and no ENTER is ever
        // generated.
        //
        // KNOWN TRADE-OFF: 1,400m from mid-river reaches local roads on both
        // banks (West Thurrock to the north, the Crossways/A206 area to the
        // south), so a driver near the crossing who doesn't use it can get a
        // false alert. That's deliberate — a miss costs the user a £70+ PCN,
        // a false positive costs them a notification they can dismiss. Needs
        // real-world tuning either way.
        //
        // The principled fix is a polygon: the charge applies to the whole
        // A282 between M25 J1A and J31, so the charged corridor is a shape,
        // not a circle, and this engine already supports polygon crossings
        // (see ULEZ). Not done here because hand-drawing that corridor from
        // guessed junction coordinates would reintroduce exactly the class
        // of error this change fixes.
        radiusMeters: 1400,
      },
      price: {
        amount: 3.5,
        currency: 'GBP',
        label: '£3.50 (car) — free 22:00–06:00',
      },
      paymentUrl: 'https://www.gov.uk/pay-dartford-crossing-charge',
      infoUrl: 'https://www.gov.uk/pay-dartford-crossing-charge',
      scheme: DART_CHARGE_SCHEME,
      // Free 22:00-06:00. Added 2026-09-09: the app previously had no concept
      // of time, so a night-shift driver crossing at 3am was woken and told to
      // pay £3.50 they did not owe.
      chargeableHours: { from: '06:00', to: '22:00' },
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
        // £12.50 covers the whole day however many times you enter, unlike
        // every other scheme here. Without this the app alerted on each entry
        // — and since 2026-09-09 would also start a fresh set of repeating
        // reminders each time — for a single charge.
        chargePeriod: 'daily',
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
      // Charged every day of the year except Christmas Day. No daily window —
      // the ULEZ applies 24 hours. NOTE: it is a DAILY charge, not per
      // crossing, and the engine still fires per entry; see HANDOVER.
      chargeableHours: { freeOnDates: ['12-25'] },
      coordinatesVerified: true,
    },
    {
      id: 'blackwall-tunnel',
      name: 'Blackwall Tunnel (Silvertown & Blackwall Tunnels Charge)',
      shortName: 'Blackwall',
      type: 'point',
      geofence: {
        kind: 'circle',
        // CORRECTED 2026-09-09. Was (51.5028, 0.0037) — 502m from the
        // published coordinate below, almost all of it in longitude.
        // 51°30'16"N 0°00'11"W (Wikipedia's Blackwall Tunnel infobox),
        // cross-checked two ways: latitude.to gives 51.5027,-0.0018 (212m
        // away), and Historic England's listed-structure grid references
        // for the southern gatehouse (TQ390794) and southern ventilation
        // shaft (TQ390800) convert to points 931m and 292m SOUTH of it —
        // the right distances and the right direction for a 1,350m tunnel
        // whose midpoint this is. Note the crossing sits on the Greenwich
        // Meridian, so longitude is near zero and its SIGN flips between
        // sources; don't read that as a source disagreeing.
        latitude: 51.50444,
        longitude: -0.00306,
        // Tunnel portal — GPS drops out inside, so this only needs to
        // reliably catch a fix right at the entrance, not cover the
        // tunnel's length (impossible with GPS regardless of radius).
        //
        // CONSTRAINED BY SILVERTOWN, not by this tunnel's own geometry.
        // The two published midpoints are only 770m apart, so the two
        // radii must sum to less than that or one crossing fires both
        // notifications. 350m each is the most that leaves a margin. This
        // is smaller than the 675m half-length of the bore, and is a
        // deliberate compromise — see the note on Silvertown below for why
        // merging these two into a single crossing is the real fix.
        radiusMeters: 350,
      },
      price: {
        amount: 4.0,
        currency: 'GBP',
        label: '£1.50 (off-peak, Auto Pay) to £4.00 (peak/non-Auto Pay)',
      },
      paymentUrl: 'https://tfl.gov.uk/modes/driving/silvertown-blackwall-tunnels-charge',
      infoUrl: 'https://tfl.gov.uk/modes/driving/silvertown-blackwall-tunnels-charge',
      scheme: TFL_TUNNELS_SCHEME,
      // Charged 06:00-22:00 daily including weekends and bank holidays; free
      // overnight and all day on Christmas Day. Sourced 2026-09-09 from
      // published third parties (blackcircles.com, epcplc.com,
      // minicabs.co.uk), NOT from tfl.gov.uk directly — re-verify against the
      // authority before relying on it.
      chargeableHours: { from: '06:00', to: '22:00', freeOnDates: ['12-25'] },
      coordinatesVerified: false,
    },
    {
      id: 'silvertown-tunnel',
      name: 'Silvertown Tunnel (Silvertown & Blackwall Tunnels Charge)',
      shortName: 'Silvertown',
      type: 'point',
      geofence: {
        kind: 'circle',
        // CORRECTED 2026-09-09. Was (51.4973, 0.0093), 830m from the
        // published coordinate: 51°30'17"N 0°00'29"E (Wikipedia's
        // Silvertown Tunnel infobox; the tunnel opened 7 April 2025). Only
        // one source found for this one, so it carries less corroboration
        // than the others — but it is consistent with Wikipedia's prose
        // description of a portal "adjacent to the existing Blackwall
        // Tunnel on the Greenwich Peninsula", which the old value was not.
        latitude: 51.50472,
        longitude: 0.00806,
        // Tunnel portal — same reasoning as Blackwall above, and the same
        // 770m-separation constraint (see there).
        //
        // THESE TWO SHOULD PROBABLY BE ONE CROSSING. Both bores leave the
        // SAME point on the Greenwich Peninsula and only diverge on the
        // north side, so on the southern approach no circular geofence can
        // tell them apart even in principle — and they already share one
        // ChargingScheme (TFL_TUNNELS_SCHEME), one operator, one payment
        // page and one deadline, so the label is the only thing that
        // differs. Merging them into a single "Blackwall & Silvertown"
        // crossing would allow a ~900m radius that actually covers both
        // bores instead of the 350m compromise forced by keeping them
        // apart. Not done here because it changes the crossing list rather
        // than just its coordinates.
        radiusMeters: 350,
      },
      price: {
        amount: 4.0,
        currency: 'GBP',
        label: '£1.50 (off-peak, Auto Pay) to £4.00 (peak/non-Auto Pay)',
      },
      paymentUrl: 'https://tfl.gov.uk/modes/driving/silvertown-blackwall-tunnels-charge',
      infoUrl: 'https://tfl.gov.uk/modes/driving/silvertown-blackwall-tunnels-charge',
      scheme: TFL_TUNNELS_SCHEME,
      // Charged 06:00-22:00 daily including weekends and bank holidays; free
      // overnight and all day on Christmas Day. Sourced 2026-09-09 from
      // published third parties (blackcircles.com, epcplc.com,
      // minicabs.co.uk), NOT from tfl.gov.uk directly — re-verify against the
      // authority before relying on it.
      chargeableHours: { from: '06:00', to: '22:00', freeOnDates: ['12-25'] },
      coordinatesVerified: false,
    },
    {
      id: 'mersey-gateway-bridge',
      name: 'Mersey Gateway Bridge (Merseyflow)',
      shortName: 'Mersey Gateway',
      type: 'point',
      geofence: {
        kind: 'circle',
        // CORRECTED 2026-09-09. Was (53.3406, -2.7286) — 1,707m off, the
        // second-worst error in this file. Now 53°21'10"N 2°42'47"W
        // (Wikipedia's Mersey Gateway Bridge infobox).
        //
        // A third source (latitude.to) gives -2.7000, which is 863m east of
        // this and was rejected on an internal consistency check rather
        // than by preferring one site over another: the bridge is
        // documented as ~1.5km upstream (east) of the Silver Jubilee
        // Bridge, and -2.7130 is 1.78km east of Silver Jubilee's own
        // published coordinate while -2.7000 would be ~2.6km east.
        latitude: 53.3528,
        longitude: -2.7130,
        // Motorway-speed open crossing — same reasoning as Dartford above.
        // Radius is the published 2.2km total crossing length halved
        // (1,100m from the centre), which covers the whole structure over
        // both the Mersey and the Manchester Ship Canal and gives ~82s
        // inside at 60mph. It is also the largest value that stays clear
        // of Silver Jubilee's circle 1,779m away — see below.
        radiusMeters: 1100,
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
        // CORRECTED 2026-09-09. Was (53.3453, -2.7345), 257m off — the
        // smallest error of the seven. Now 53°20'48"N 2°44'16"W
        // (Wikipedia's Silver Jubilee Bridge infobox).
        latitude: 53.3466,
        longitude: -2.7377,
        // NOT motorway-speed, despite what the old comment claimed by
        // copying Dartford's reasoning. Since Mersey Gateway opened in
        // 2017 this bridge carries local traffic at 30mph, not 60-70mph
        // through traffic, so it needs far less radius for the same time
        // inside: 500m gives ~75s at 30mph. That covers the 482m structure
        // comfortably.
        //
        // Capped by its neighbour as much as by its own geometry: Mersey
        // Gateway's centre is 1,779m away, so 1,100m + 500m leaves a 179m
        // margin between the two circles. Widening either one past that
        // makes a single crossing fire two different notifications.
        radiusMeters: 500,
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
        // CORRECTED 2026-09-09. Was (54.9857, -1.4466) — 2,431m off, and
        // the joint-worst error in this file. That put the geofence out
        // towards North Shields, nowhere near the bores.
        //
        // Now 54.9860, -1.4847 (latitude.to), corroborated by converting
        // the Ordnance Survey grid reference for the adjacent Tyne
        // pedestrian and cyclist tunnels (NZ329659) to WGS84, which lands
        // 185m away. Two independent sources, one of them an OS grid
        // reference, agreeing at 185m on a crossing whose bores run
        // side by side.
        latitude: 54.986,
        longitude: -1.4847,
        // Tunnel portal, not motorway-speed-open, despite the approach
        // roads being motorway-speed: unlike Dartford, both directions
        // here go through a bore (no open-air alternative), so the
        // GPS-drops-out-inside-the-tunnel problem is the dominant risk for
        // this crossing specifically — same reasoning as Blackwall/
        // Silvertown above, not the open-bridge crossings.
        //
        // Radius from the published 1,690m tunnel length halved (845m),
        // rounded to 900m so it clears both portals. Unlike Blackwall and
        // Silvertown there is no neighbouring crossing to stay clear of, so
        // the structure's own geometry is the only constraint. ~80s inside
        // at 50mph on the A19.
        radiusMeters: 900,
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
        // CORRECTED 2026-09-09. Was (53.7101, -0.4478), 436m off. Now
        // 53°42'23"N 0°27'00"W (Wikipedia's Humber Bridge infobox),
        // corroborated by latitude.to's 53.7064,-0.4502 — the two agree to
        // within 14m, the tightest agreement of any crossing in this file.
        latitude: 53.7064,
        longitude: -0.45,
        // Radius from the published 2,220m total length halved (1,110m),
        // rounded up to 1,150m. The old 250m did not even reach the ends of
        // the deck: a vehicle at the bridge's 50mph limit was inside for
        // about 22 seconds, well under the point where Android can be
        // relied on to sample location at all while it is in there. 1,150m
        // gives ~103s.
        //
        // This supersedes the "keep both lower-speed crossings at 250m"
        // reasoning noted in the 2026-09-06 handover: that decision was
        // about not treating Humber and Warburton as special cases relative
        // to each other, which is a fair instinct, but 250m was never
        // derived from either structure. Both are now sized from their own
        // published dimensions, which happen to differ because the
        // structures do (2,220m vs a ~970m toll road).
        radiusMeters: 1150,
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
        // CORRECTED 2026-09-09. Was (53.4, -2.4939) — 2,467m off, the
        // worst error in this file, and the latitude was the giveaway: a
        // bare "53.4" is a placeholder, not a measurement.
        //
        // This one has the best provenance of the seven. The Rixton and
        // Warburton Bridge Order 2024 (legislation.gov.uk) gives Ordnance
        // Survey grid references for both ends of the tolled road —
        // SJ6915390429 at the A57 in the north, SJ6980489711 at Warburton
        // Bridge Road in the south. Converting those to WGS84 puts the
        // bridge between (53.40976,-2.46550) and (53.40335,-2.45564), 968m
        // apart. The 6-figure reference quoted for the bridge itself,
        // SJ695901, converts to 53.40683,-2.46025 — 115m from the value
        // used here, which is exactly the precision a 6-figure grid
        // reference carries.
        latitude: 53.4074,
        longitude: -2.45881,
        // Radius covers the whole 968m tolled stretch from its midpoint
        // (half-length 484m) with margin: 550m gives ~82s inside at 30mph.
        // Detection is easier here than anywhere else in this file anyway —
        // there is a physical toll booth, so vehicles stop.
        radiusMeters: 550,
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
