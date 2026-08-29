import { CrossingsConfig } from '../types/crossing';

/**
 * MOCK remote config — stands in for the server-hosted JSON endpoint the
 * real app will fetch (see README, "Config backend: client contract only").
 * Nothing here is hardcoded into a native binary; this module is the single
 * seam to swap for a real `fetch(CONFIG_URL)` later.
 *
 * The ULEZ boundary below is a coarse, illustrative simplification for
 * layout/demo purposes ONLY — it is NOT the official TfL boundary. Real
 * integration must source TfL's published ULEZ boundary GeoJSON.
 */
export const MOCK_CROSSINGS_CONFIG: CrossingsConfig = {
  version: 1,
  fetchedAt: new Date().toISOString(),
  crossings: [
    {
      id: 'dartford-crossing',
      name: 'Dartford Crossing (Dart Charge)',
      shortName: 'Dartford',
      type: 'point',
      geofence: {
        kind: 'circle',
        latitude: 51.4666,
        longitude: 0.2660,
        radiusMeters: 400,
      },
      price: {
        amount: 2.5,
        currency: 'GBP',
        label: '£2.50 (standard vehicle, off-peak may vary)',
      },
      paymentUrl: 'https://www.gov.uk/pay-dartford-crossing-charge',
      infoUrl: 'https://www.gov.uk/pay-dartford-crossing-charge',
      paymentWindow: 'Midnight the day after crossing',
    },
    {
      id: 'ulez',
      name: 'Ultra Low Emission Zone (ULEZ)',
      shortName: 'ULEZ',
      type: 'zone',
      geofence: {
        kind: 'polygon',
        centroid: { latitude: 51.5072, longitude: -0.1276 },
        // Illustrative simplified ring only — see module note above.
        boundary: [
          [-0.51, 51.69],
          [0.32, 51.69],
          [0.32, 51.29],
          [-0.51, 51.29],
          [-0.51, 51.69],
        ],
      },
      price: {
        amount: 12.5,
        currency: 'GBP',
        label: '£12.50 per day (non-compliant vehicles)',
      },
      paymentUrl: 'https://tfl.gov.uk/modes/driving/ultra-low-emission-zone',
      infoUrl: 'https://tfl.gov.uk/modes/driving/ultra-low-emission-zone',
      paymentWindow: 'Midnight 3 days after driving in the zone',
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
