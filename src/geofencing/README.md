# Background geofencing — status

**Implemented, not yet verified on a device.** The region-swapping strategy
and point-in-polygon confirmation described below are real, working code —
not stubs — built on `expo-location`'s CoreLocation/Android-Geofencing-API
wrappers and `expo-task-manager`:

- `boundary.ts` — pure math: haversine distance, ray-casting point-in-polygon,
  nearest-N-boundary-points selection. No native/device dependency; correct
  by inspection and easy to unit-test in isolation if a test runner gets
  added later.
- `engine.ts` — the shared engine (`createGeofencingEngine`) both platforms
  build on: registers Dartford as a permanent circular geofence, drives a
  coarse background location task that dynamically rings the nearest ULEZ
  boundary points with circular geofences as the user moves, and uses the
  polygon check to decide entry vs. exit rather than notifying on every
  boundary-region ping.
- `ios.ts` / `android.ts` — thin per-platform config (task names, region
  budget, location-task tuning) plus the platform-specific caveats (iOS's
  20-region cap and "Always" permission upgrade UX; Android's foreground
  service and OEM battery-optimisation quirks).

## Why this is unverified, not tested

None of the above has run against real GPS or CoreLocation/FusedLocationProvider
— that needs a native build on a real device (or at minimum a simulator with
GPS/GPX playback), and the current development environment has no Xcode, no
Android SDK, and no device to test against. This gets exercised once we're
building on the Mac mini; until then, treat the region-swapping tuning
constants (`ZONE_ACTIVATION_RADIUS_METERS`, `ZONE_REGION_RADIUS_METERS`,
`distanceInterval`) as untuned first guesses.

## What's already decided

- No commercial geofencing library (e.g. Transistor) — hand-rolled, per the
  agreement with the client.
- Dartford Crossing is a single circular geofence (`crossing.geofence.kind
  === 'circle'` in `src/types/crossing.ts`).
- ULEZ is a polygon (`crossing.geofence.kind === 'polygon'`) too large to
  ring directly given iOS's 20-region cap (Android allows 100, but the same
  strategy is used on both platforms for consistency). Both platform files
  document the dynamic region-swapping approach: track coarse position
  cheaply, keep only the nearest boundary points geofenced, and re-arm as
  the user moves.
- The ULEZ boundary coordinates currently in `src/config/crossings.ts` are
  an **illustrative simplified rectangle**, not the real TfL boundary — see
  the TODO below.

## Outstanding work (native build)

- [ ] Source TfL's actual published ULEZ boundary GeoJSON and replace the
      placeholder rectangle in `src/config/crossings.ts`.
- [x] ~~Implement the nearest-boundary-point selection + dynamic geofence
      registration for ULEZ~~ — done in `boundary.ts` / `engine.ts`, shared
      across both platforms.
- [x] ~~Implement a point-in-polygon check~~ — done in `boundary.ts`
      (`isPointInPolygon`).
- [x] ~~Wire native region-entry/geofence-transition events into
      `onCrossingDetected`~~ — done in `engine.ts`'s `TaskManager.defineTask`
      callbacks, and `onCrossingDetected` is now wired all the way through to
      `presentCrossingNotification` via `AppState.setBackgroundMonitoringEnabled`
      (toggle on the Settings screen, "Background monitoring" section).
- [ ] iOS: implement the "When In Use" → "Always" permission upgrade flow,
      with an in-app education screen before the system prompt (Apple
      App Review expects a clear justification shown to the user).
- [ ] Android: implement the foreground-permission → background-permission
      education screen, and OEM battery-optimisation exemption prompting.
      (The foreground *service* + persistent notification itself is wired
      via `app.json`'s expo-location plugin config + `android.ts`'s
      `foregroundService` option.)
- [ ] Test both platforms with simulated GPS routes for a Dartford
      drive-through and a ULEZ boundary crossing before any real-world
      testing (see the development agreement for the real-world testing
      plan — friends' commutes / walking the ULEZ boundary on foot).
- [ ] Tune `ZONE_ACTIVATION_RADIUS_METERS`, `ZONE_REGION_RADIUS_METERS`
      (`engine.ts`), and each platform's `distanceInterval` against real
      battery/detection-latency data — current values are untested guesses.

## Wired into the app — via a Settings toggle, not auto-start

`AppState.setBackgroundMonitoringEnabled(true)` calls `geofencing.requestPermissions()`
then `geofencing.start()`; the Settings screen's "Background monitoring" row
drives this. Deliberately an explicit opt-in toggle rather than
auto-starting once onboarding permissions are granted, since real
background location tracking has a battery/privacy cost a tester should
choose to take on, not something sprung on them silently — revisit this
default once there's a real product decision on the onboarding flow. The
toggle is disabled on web (`Platform.OS === 'web'`), since geofencing needs
the custom dev client on a real device to do anything at all.
