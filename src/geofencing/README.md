# Background geofencing — status

**Not implemented yet.** This module is scaffolding: the public interface
(`GeofencingEngine` in `types.ts`) and the platform split (`ios.ts` /
`android.ts`, picked by `index.ts`) are in place, and the doc comments in
each platform file spell out the intended approach in detail. The actual
region-monitoring logic is stubbed out (`start()`/`stop()` currently just
log a warning and do nothing).

## Why this is stubbed, not built

Real testing of background location code needs a native build on a real
device (or at minimum a simulator with GPS simulation) — the current
development environment has no Xcode, no Android SDK, and no device to test
against. This gets implemented once we're building on the Mac mini, so we
can test properly as we go rather than writing untestable native code blind.

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
- [ ] Implement the nearest-boundary-point selection + dynamic geofence
      registration for ULEZ (iOS and Android each have their own region API
      but the boundary math can likely be shared).
- [ ] Implement a point-in-polygon check (ray-casting against
      `crossing.geofence.boundary`) to confirm which side of the ULEZ
      boundary a coarse position update falls on.
- [ ] Wire native region-entry/geofence-transition events (via
      `expo-task-manager`) into `onCrossingDetected`, and from there into
      `src/notifications` to fire the local alert.
- [ ] iOS: implement the "When In Use" → "Always" permission upgrade flow,
      with an in-app education screen before the system prompt (Apple
      App Review expects a clear justification shown to the user).
- [ ] Android: implement the foreground service + its required persistent
      notification (mitigates Doze-mode delays to geofence callbacks), and
      the two-step foreground → "Allow all the time" permission flow.
- [ ] Test both platforms with simulated GPS routes for a Dartford
      drive-through and a ULEZ boundary crossing before any real-world
      testing (see the development agreement for the real-world testing
      plan — friends' commutes / walking the ULEZ boundary on foot).
