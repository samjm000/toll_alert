import { Platform } from 'react-native';

// Switches for what a store build shows. App Review rejects demo controls and
// purchase flows that don't charge, so both stay off outside development.

// v1 ships free. Flip on only once real StoreKit / Play Billing is wired up —
// SubscriptionScreen is still the mock and must not reach a store build.
export const SUBSCRIPTIONS_ENABLED = false;

// "Simulate crossing", "Replay intro" and similar tester shortcuts. On in
// development and on the GitHub Pages web mockup (a demo for reviewers, never
// a store build); off in the Android and iOS store builds.
export const SHOW_DEMO_TOOLS = __DEV__ || Platform.OS === 'web';

// English only for launch (2026-10-22): the other five languages were
// machine-drafted and haven't been checked by native speakers. Their strings
// stay in src/i18n/strings.ts; set this to true to bring back the picker.
export const LANGUAGES_ENABLED = false;

// Store listings for the website's "PRESS TO DOWNLOAD FREE" button. While
// null, the button says the app is coming soon; fill in when the listing is live.
export const PLAY_STORE_URL: string | null = null;
export const APP_STORE_URL: string | null = null;

export const PRIVACY_POLICY_URL = 'https://samjm000.github.io/toll_alert/privacy.html';
