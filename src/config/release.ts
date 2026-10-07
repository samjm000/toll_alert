// Switches for what a store build shows. App Review rejects demo controls and
// purchase flows that don't charge, so both stay off outside development.

// v1 ships free. Flip on only once real StoreKit / Play Billing is wired up —
// SubscriptionScreen is still the mock and must not reach a store build.
export const SUBSCRIPTIONS_ENABLED = false;

// "Simulate crossing", "Replay intro" and similar tester shortcuts.
export const SHOW_DEMO_TOOLS = __DEV__;

export const PRIVACY_POLICY_URL = 'https://samjm000.github.io/toll_alert/privacy.html';
