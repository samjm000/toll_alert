# Toll Alert

Reminds you to pay UK toll crossings and charging zones you've driven into
— Dartford Crossing and the London ULEZ for v1 — via a background local
notification, with a self-reported "Paid" dismiss button.

## Status: UI mockup only

This build is a **front-end mockup** — every screen in the onboarding and
core app flow is real, wired together, and demoable, but there is
**no real background geofencing, no native location permission request, and
no in-app purchase integration yet**. All of that is deliberately deferred
until the mockup is reviewed, per your request to see the front end before
committing to a background-geolocation/native-tooling approach.

What's real:
- Full onboarding flow: Welcome → How it works → Liability disclaimer
  (with explicit "I understand" tap-to-accept, disabled until checked) →
  Permissions explainer, persisted with AsyncStorage so it only shows once.
- Home screen driven entirely by a mock "remote config" object
  (`src/config/crossings.ts`) shaped exactly like the JSON contract a real
  config endpoint would serve — see below.
- "Simulate crossing" dev buttons stand in for the background geofencing
  engine firing a notification, so you can walk the full
  detect → notify → tap → Paid flow today.
- Crossing detail screen (what tapping the real push notification would
  open): charge amount, pay-by window, payment link, "Mark as paid"
  (dismiss-only, per your instruction to assume self-reported for v1).
- Subscription screen: annual price pulled from a config object
  (`src/state/AppState.ts`, £4.99 placeholder, not hardcoded in a
  component), renewal-reminder and lapsed-reminder cadence shown, clearly
  labeled as demo-only (no StoreKit/Play Billing yet).
- Settings screen: read-only list of monitored crossings sourced from the
  same mock config, permission status placeholders, and the liability
  disclaimer text again, tagged `PLACEHOLDER — TBD BY SOLICITOR`.

Run it (Expo web is what was used to screenshot the flow, since this
sandbox has no iOS/Android simulator):

```
npm install
npm run web      # or: npm start, then press i / a for a real device/simulator
```

## Config-driven crossings — contract only, no backend yet

Per your answer, this build does **not** stand up a config backend. What it
does have is the full client-side contract: `src/types/crossing.ts` defines
`CrossingsConfig`/`Crossing`/`Geofence`, and `src/config/crossings.ts`
provides mock data in exactly that shape for Dartford (a `circle` point
geofence) and ULEZ (a `polygon` boundary + centroid). Swapping the mock
loader for `fetch(CONFIG_URL)` against a real endpoint later is a one-line
change in `src/config/crossings.ts` — nothing in the screens needs to
change. The ULEZ boundary coordinates in that file are an illustrative
simplified rectangle, **not** the real TfL boundary — real integration
needs TfL's published ULEZ boundary GeoJSON.

## Open decision: what powers background geofencing

This is the big one, deferred pending your review of this mockup. Building
the real detection engine means picking:

1. **Geofencing library** — the strongest fit for the ULEZ
   dynamic-region-swapping requirement (significant-location-change →
   register a rolling set of small circular regions along the nearest
   stretch of the real boundary, within iOS's 20-region cap) is
   [Transistor Software's `react-native-background-geolocation`](https://github.com/transistorsoft/react-native-background-geolocation).
   It's built for exactly this pattern and handles the proximity-sorted
   region swapping for you, but it's a commercial license for production
   (free for dev/testing with a debug watermark). The alternative is a
   hand-rolled native `CLLocationManager` module (free, but we build and
   maintain the region-swapping logic ourselves) or Expo's
   `Location`/`TaskManager` background tasks (free and JS-only, but
   polling-based rather than true native region monitoring — meaningfully
   worse battery life and reliability for this use case).
2. **Expo vs. bare React Native CLI** — this mockup is plain Expo
   (`npx create-expo-app`, Expo SDK 57). Custom native modules — including
   Transistor's library, which ships an Expo config plugin — still work
   under Expo via prebuild + a dev client, and EAS Build can produce real
   iOS builds from the cloud, which matters since this sandbox has no
   Xcode/Android Studio/simulator to build or run against directly.

Neither choice changes anything about the screens already built — it only
affects what gets added under `src/` for the real detection engine, plus a
native config/prebuild layer. Flagging both again here so a decision can be
made deliberately rather than assumed.

## Already-decided per your brief (not re-asked)

- **"Paid" button**: dismiss-only, no verification against actual payment.
- **Subscription price**: £4.99/year placeholder, kept as a config value
  (`src/state/AppState.ts` → `MOCK_SUBSCRIPTION_CONFIG`), not hardcoded
  into a screen.
- **Liability disclaimer wording**: placeholder text, explicitly tagged in
  both the onboarding Disclaimer screen and Settings as
  `PLACEHOLDER — LEGAL WORDING TBD` / `TBD BY SOLICITOR` — not to be
  shipped as final legal copy.
