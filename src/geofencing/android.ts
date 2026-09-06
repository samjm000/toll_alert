import * as Location from 'expo-location';
import { createGeofencingEngine } from './engine';

/**
 * Android background geofencing.
 *
 * STATUS: the 8 point crossings were run end-to-end on a real Android
 * emulator (2026-09-05) — mock-GPS entry, a real notification, and the
 * enter/exit dedup all confirmed working; see
 * src/geofencing/README.md's "Confirmed by actually running this". ULEZ's
 * two-tier wake-circle + polygon-check approach (this file's config,
 * engine.ts's logic) is new this pass — re-run against the emulator before
 * trusting it in the same way; the README says exactly what's been
 * confirmed vs. still assumed.
 *
 * Registered regions: the 8 point crossings as permanent circular
 * geofences (unchanged), plus ONE permanent circular "wake" geofence for
 * ULEZ — not dozens of small circles ringing its boundary, which both
 * misses real entries and fires falsely near the edges. See engine.ts's
 * module doc comment and README's "Why ULEZ is different" for the full
 * two-tier design (native geofence to wake up + real point-in-polygon
 * check against ULEZ's actual boundary data, run on location updates only
 * while inside the wake circle).
 *
 * --------------------------------------------------------------------------
 * LESS CONSTRAINED THAN iOS, BUT NOT UNLIMITED: Android's Geofencing API
 * (FusedLocationProviderClient) allows up to 100 simultaneous geofences per
 * app, vs iOS's 20. Not that it matters much here any more — this app now
 * registers at most 9 regions total (8 point crossings + 1 ULEZ wake
 * circle), all permanent, on both platforms; the old boundary-ring-swapping
 * approach that used to need this headroom is gone.
 *
 * ONE TASK, NOT ONE PER CROSSING: `engine.ts` registers a single
 * `TaskManager.defineTask(ANDROID_GEOFENCE_TASK_NAME, ...)` at module scope
 * (this file's `androidGeofencingEngine` is a top-level const, so this runs
 * during app init, not lazily inside a component) and branches internally on
 * `region.identifier` for all 9 crossings. Multiple simultaneous geofencing
 * tasks are known to cross-fire on both platforms — every task gets called
 * for every region's events, not just its own — so this deliberately stays
 * one task.
 *
 * ANDROID-SPECIFIC CONCERNS:
 * - Doze mode / battery optimisation can delay geofence transition callbacks
 *   when the device is stationary and screen-off. The `foregroundService`
 *   option below (backed by `isAndroidForegroundServiceEnabled` in
 *   app.json's expo-location plugin config) keeps a persistent low-priority
 *   notification while background tracking is active, which is the standard
 *   mitigation, and API 34+'s required `foregroundServiceType="location"` is
 *   already declared in expo-location's own library manifest (verified via
 *   `expo prebuild` — no app.json change needed for that specifically).
 * - Android 10+ requires the two-step permission flow: foreground location
 *   granted first, then a *separate* "Allow all the time" prompt for
 *   ACCESS_BACKGROUND_LOCATION — `requestPermissions()` (engine.ts) already
 *   does both calls in order, and the Settings toggle shows an in-app
 *   education screen (`BackgroundLocationRationaleModal`) before it, since
 *   Android 11+ opens system settings directly with no dialog of its own.
 * - OEM-specific background restrictions (Samsung, Xiaomi, Huawei, OnePlus
 *   aggressively kill background tasks by default): the Settings screen's
 *   "Reliability" section (`batteryOptimization.ts`) opens the system
 *   "ignore battery optimizations" dialog for this. There's no API to check
 *   whether it's already granted, so it's a one-off action button, not a
 *   toggle with a real status.
 *
 * TODO (needs the real device/emulator test pass — see README):
 * - Re-verify against real/simulated GPS (Android emulator Extended
 *   Controls, `adb emu geo fix`, or a GPX route) with the new ULEZ
 *   detection path in place: Dartford should no longer also fire ULEZ, and
 *   a real central-London mock position should fire ULEZ via the wake
 *   circle + polygon check.
 * - Tune each point crossing's `radiusMeters` (currently a uniform 250m
 *   placeholder — see src/config/crossings.ts), and this file's
 *   `distanceInterval` (used only once inside ULEZ's wake circle now, not
 *   unconditionally) against real battery/detection-latency data.
 * - The wake circle's radius (`wakeRadiusMeters`, derived from the real
 *   boundary data — see src/config/ulezBoundary.ts) hasn't been tuned
 *   against real-world GPS drift either; it's sized to comfortably contain
 *   the real polygon, not to optimise the battery/latency tradeoff.
 * --------------------------------------------------------------------------
 */

export const ANDROID_GEOFENCE_TASK_NAME = 'toll-alert-android-geofence-task';
export const ANDROID_LOCATION_TASK_NAME = 'toll-alert-android-location-task';

export const androidGeofencingEngine = createGeofencingEngine({
  geofenceTaskName: ANDROID_GEOFENCE_TASK_NAME,
  locationTaskName: ANDROID_LOCATION_TASK_NAME,
  locationOptions: {
    accuracy: Location.Accuracy.Low,
    distanceInterval: 500,
    foregroundService: {
      notificationTitle: 'Toll Alert is watching for crossings',
      notificationBody: 'Background location is active so you get notified after entering a monitored zone.',
    },
  },
});
