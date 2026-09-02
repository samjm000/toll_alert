# Toll Alert

## View it online

This mockup auto-deploys to GitHub Pages on every push via
`.github/workflows/deploy-pages.yml`. **One-time manual step needed**
(GitHub doesn't allow enabling this via API/automation): go to this repo's
**Settings → Pages** and set **Source** to **GitHub Actions**. After that,
every push re-deploys automatically and it's live at:

**https://samjm000.github.io/toll_alert/**

(If the repo is private, GitHub Pages requires a paid plan to publish
outside the org — make the repo public, or upgrade, for the link above to
be reachable by anyone without being signed in as a collaborator.)


Reminds you to pay UK toll crossings and charging zones you've driven into
— Dartford Crossing and the London ULEZ for v1 — via a background local
notification, with a self-reported "Paid" dismiss button.

## Status: native build started (geofencing still stubbed)

The mockup has been reviewed and the native build has started, following
the client go-ahead. Every screen in the onboarding and core app flow is
real, wired together, and demoable. The project is now set up as a
**custom dev client** build (`expo-dev-client`, `expo-location`,
`expo-notifications`, `expo-task-manager` added; `app.json` has the
location/notification permission strings and plugin config) rather than
plain managed Expo, since background geofencing needs custom native code
that plain Expo Go can't run.

Local push notifications (`src/notifications/`) are real and working —
the "Simulate a crossing" button on Home already fires a proper local
notification with a "Mark as paid" action, no stubbing needed there.

**Background geofencing itself (`src/geofencing/`) is still fully stubbed**
— the platform interface and the detailed implementation plan for both iOS
and Android are written, but the actual native region-monitoring logic
isn't built yet. See `src/geofencing/README.md` for exactly what's done vs.
outstanding, and why (short version: it needs a real device/simulator to
test against, which means the Mac mini).

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

## Native build: how it's set up

**Decided**: hand-rolled geofencing (no commercial library), under a custom
Expo dev client (not plain managed Expo, not a full bare-workflow eject).
This keeps Expo's JS-first workflow and EAS cloud builds while allowing the
custom native location/geofencing code the app needs.

- `npx expo prebuild` generates the native `ios/` and `android/` project
  folders from `app.json` + the installed config plugins. Those folders are
  **gitignored** (see `.gitignore`) and regenerated on demand rather than
  committed — this is Expo's recommended "Continuous Native Generation"
  pattern, so `app.json` stays the single source of truth. Run
  `npx expo prebuild` locally (or let EAS Build do it automatically) before
  opening the project in Xcode/Android Studio.
- Actually compiling/running the iOS build needs Xcode and CocoaPods, and
  the Android build needs the Android SDK — none of which exist in this
  sandbox. That compilation step happens on the Mac mini once it's set up,
  or via EAS Build's cloud compilation in the meantime.
- `com.tollalert.app` is the placeholder bundle identifier / Android
  package name in `app.json` — replace it if the client's App
  Store Connect / Play Console setup calls for something else.

## Already-decided per your brief (not re-asked)

- **"Paid" button**: dismiss-only, no verification against actual payment.
- **Subscription price**: £4.99/year placeholder, kept as a config value
  (`src/state/AppState.ts` → `MOCK_SUBSCRIPTION_CONFIG`), not hardcoded
  into a screen.
- **Liability disclaimer wording**: placeholder text, explicitly tagged in
  both the onboarding Disclaimer screen and Settings as
  `PLACEHOLDER — LEGAL WORDING TBD` / `TBD BY SOLICITOR` — not to be
  shipped as final legal copy.
