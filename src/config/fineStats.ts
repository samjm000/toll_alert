/**
 * The fines figures the landing page cycles through — one card per charging
 * scheme the app covers.
 *
 * Client ask (2026-09-24, via Rob): "show all tolls covered with fines and
 * amount in cash", "have the number of fines and the total cost of the fines
 * for every toll we cover and make it change every 5 seconds".
 *
 * ---------------------------------------------------------------------------
 * READ BEFORE CHANGING — THIS IS ADVERTISING COPY
 * ---------------------------------------------------------------------------
 * These numbers are the headline of the app's marketing, so every one has
 * to be defensible. Nothing here is invented; each has a published source
 * below. But:
 *
 * 1. They are NOT all from 2025, which is what Rob asked for. No operator
 *    publishes a single consistent annual figure, and the official ones we
 *    could find (TfL, National Highways, the Traffic Penalty Tribunal's
 *    appeals data) weren't reachable when this was written. Each card's
 *    label says which period its figure covers, so none of them claims to
 *    be something it isn't. Swapping in genuine 2025 figures later is a
 *    data change here plus a label change in src/i18n/strings.ts.
 * 2. `totalMillions` marked `estimate: true` is OUR arithmetic — the
 *    count times the lowest fine at the time — not a figure anyone
 *    published. It is shown as "£Xm+" because it's a floor: escalated
 *    fines are larger. The derivation is in each `estimateNote`.
 * 3. Several sources are news reports of FOI answers, not the FOI answers
 *    themselves. Before a paid ad campaign, replace each with the primary
 *    source (an FOI disclosure log or operator report).
 *
 * `fine` is the current PCN / notice amount, from the same scheme data the
 * app uses for its alerts (src/config/crossings.ts).
 */
export interface FineStat {
  /** Also the key for this card's label in src/i18n/strings.ts `stats.labels`. */
  id: string;
  /** Crossing name for the badge — a proper noun, not translated. */
  badge: string;
  /**
   * Number of fines. Omitted when the source publishes only the money, in
   * which case the card leads with `totalMillions` instead.
   */
  count?: number;
  /** Shown after the number when the source said "more than". */
  countIsFloor?: boolean;
  /** £ millions — the face value of those fines. */
  totalMillions: number;
  estimate: boolean;
  estimateNote?: string;
  /** Current fine, formatted, for "Fine: £70 each". */
  fine: string;
  source: string;
  sourceUrl: string;
}

export const FINE_STATS: FineStat[] = [
  {
    // Was "500,000+ fines in a single month" (FleetNews FOI). True, but Rob
    // spotted that it reads as wrong, and it is misleading: that month was a
    // one-off, a backlog built up after the July 2023 change of operator
    // being cleared during 2024-25. The audited annual figure is both more
    // recent and harder to argue with. National Highways' accounts don't
    // give a PCN count, so this card leads with the money instead.
    id: 'dartford',
    badge: 'DARTFORD CROSSING',
    totalMillions: 128.4,
    estimate: false,
    fine: '£70',
    source: 'National Highways audited accounts, year to 31 March 2025',
    sourceUrl:
      'https://assets.publishing.service.gov.uk/media/697b77ce2ff8d10a830d5d4e/Dartford-Thurrock_River_Crossing_Charging_Scheme_Accounts_2024-25.pdf',
  },
  {
    id: 'ulez',
    badge: 'ULEZ',
    count: 1_700_000,
    countIsFloor: true,
    totalMillions: 300,
    estimate: false,
    fine: '£180',
    source: 'CiTTi Magazine, TfL data',
    sourceUrl:
      'https://www.cittimagazine.co.uk/news/road-user-charging-tolling/londons-expanded-ulez-raises-over-300m-in-penalty-charges-in-first-six-months.html',
  },
  {
    id: 'congestion',
    badge: 'CONGESTION CHARGE',
    count: 954_282,
    countIsFloor: false,
    totalMillions: 150,
    estimate: true,
    estimateNote: '954,282 × the £160 PCN in force during 2024 = £152.7m. It rose to £180 in January 2025.',
    fine: '£180',
    source: 'GB News, TfL figures',
    sourceUrl: 'https://www.gbnews.com/lifestyle/cars/sadiq-khan-congestion-charge-appeals-tfl',
  },
  {
    id: 'tfl-tunnels',
    badge: 'BLACKWALL & SILVERTOWN TUNNELS',
    count: 500_000,
    countIsFloor: true,
    totalMillions: 85,
    estimate: false,
    fine: '£180',
    source: 'Evening Standard, TfL figures (April–August 2025)',
    sourceUrl:
      'https://www.inkl.com/news/revealed-500-000-penalty-tickets-for-drivers-who-failed-to-pay-silvertown-and-blackwall-tunnel-tolls',
  },
  {
    id: 'merseyflow',
    badge: 'MERSEY GATEWAY',
    count: 855_000,
    countIsFloor: false,
    totalMillions: 34,
    estimate: false,
    fine: '£50',
    source: 'Runcorn & Widnes Weekly News (Oct 2017 – Sep 2018)',
    sourceUrl: 'https://www.pressreader.com/uk/runcorn-widnes-weekly-news/20181025/281672550930302',
  },
  {
    id: 'tyne',
    badge: 'TYNE TUNNEL',
    count: 268_212,
    countIsFloor: false,
    totalMillions: 8,
    estimate: true,
    estimateNote: '268,212 × the £30 UTCN, before the unpaid toll itself is added.',
    fine: '£30',
    source: 'Shields Gazette, TT2 figures (April–September 2022)',
    sourceUrl:
      'https://www.shieldsgazette.com/news/transport/tyne-tunnel-bosses-insist-first-year-of-cashless-tyne-pass-system-has-led-to-faster-smoother-journeys-despite-criticism-of-fines-for-late-toll-payment-3911907',
  },
  {
    id: 'humber',
    badge: 'HUMBER BRIDGE',
    count: 72_000,
    countIsFloor: false,
    totalMillions: 1.8,
    estimate: true,
    estimateNote:
      'Source says 6% of an estimated 1.2 million crossings weren’t paid in time: ~72,000 × the £25 admin fee. ' +
      'Many of these were disputed as system errors — see the Humber Bridge caveat in crossings.ts.',
    fine: '£25',
    source: 'GB News, Humber Bridge Board (February 2026 onwards)',
    sourceUrl: 'https://www.gbnews.com/lifestyle/cars/humber-bridge-cashless-toll-drivers-fine-yorkshire',
  },
  {
    id: 'warburton',
    badge: 'WARBURTON TOLL BRIDGE',
    count: 138_000,
    countIsFloor: false,
    totalMillions: 4,
    estimate: true,
    estimateNote:
      '138,000 × the £30 lowest charge. Peel Ports’ figure is crossings recorded unpaid, not notices issued, ' +
      'and many were disputed as ANPR errors — see the Warburton caveat in crossings.ts.',
    fine: '£30',
    source: 'GB News, Peel Ports Group figures (January 2026 onwards)',
    sourceUrl: 'https://www.gbnews.com/lifestyle/cars/motorists-warburton-toll-bridge-crossing-fines',
  },
];

/** How long each card stays up. Client asked for 5 seconds. */
export const FINE_STAT_ROTATE_MS = 5000;
