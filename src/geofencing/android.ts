import * as Location from 'expo-location';
import { Crossing } from '../types/crossing';
import { CrossingDetectedHandler, GeofencingEngine } from './types';

/**
 * Android background geofencing.
 *
 * STATUS: STUBBED — not yet implemented. Documenting the approach here so
 * the real implementation has a clear spec, same as ios.ts.
 *
 * --------------------------------------------------------------------------
 * LESS CONSTRAINED THAN iOS, BUT NOT UNLIMITED:
 * Android's Geofencing API (part of Google Play services' FusedLocationProvider)
 * allows up to 100 simultaneous geofences per app, vs iOS's 20. That's
 * enough headroom to ring a meaningfully larger stretch of the ULEZ
 * boundary at once, but the same dynamic swapping approach as iOS should
 * still be used for consistency (same boundary math, same battery
 * profile, same crossing-detection behaviour across platforms) rather
 * than relying on the higher cap to brute-force the whole polygon.
 *
 * THE STRATEGY (mirrors ios.ts):
 * 1. Dartford gets 1 permanent circular geofence.
 * 2. ULEZ: track coarse position via low-power location updates, pick the
 *    N nearest points along `crossing.geofence.boundary` (N can be larger
 *    than iOS's ~15-18, e.g. up to ~80, given the 100-geofence cap), and
 *    register/re-register geofences around them as the user moves.
 * 3. Run the same point-in-polygon check against coarse updates to confirm
 *    which side of the ULEZ boundary the user is currently on.
 *
 * ANDROID-SPECIFIC CONCERNS:
 * - Doze mode / battery optimisation can delay geofence transition
 *   callbacks significantly when the device is stationary and screen-off
 *   for a while. A foreground service (declared via the
 *   `FOREGROUND_SERVICE_LOCATION` permission already added to app.json)
 *   is the standard mitigation — needs a persistent low-priority
 *   notification while tracking is active.
 * - Android 10+ requires the two-step permission flow: foreground location
 *   granted first, then a *separate* "Allow all the time" prompt for
 *   ACCESS_BACKGROUND_LOCATION — same UX consideration as iOS's "Always"
 *   upgrade, different API shape.
 * - OEM-specific background restrictions (Samsung, Xiaomi, etc. aggressively
 *   kill background tasks by default) may need a "please disable battery
 *   optimisation for this app" prompt — not solvable purely in code.
 *
 * TODO (native build):
 * - Implement nearest-boundary-point selection + geofence
 *   registration/re-registration (shared logic with ios.ts is a strong
 *   candidate for a cross-platform `src/geofencing/boundary.ts` helper
 *   once both are implemented).
 * - Implement the point-in-polygon check (same as iOS — can likely be a
 *   single shared implementation).
 * - Wire Android's geofence transition broadcasts (via expo-task-manager)
 *   into `onCrossingDetected`.
 * - Implement the foreground service + its notification.
 * - Test with simulated GPS routes (Android Studio's Extended Controls
 *   location playback, or a GPX route) for both a Dartford drive-through
 *   and a ULEZ boundary crossing.
 * --------------------------------------------------------------------------
 */

export const ANDROID_GEOFENCE_TASK_NAME = 'toll-alert-android-geofence-task';

async function requestPermissions(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return false;

  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === 'granted';
}

async function start(_crossings: Crossing[], _onCrossingDetected: CrossingDetectedHandler): Promise<void> {
  // TODO: implement the region-swapping strategy documented above.
  console.warn('[geofencing/android] start() is a stub — background monitoring is not yet implemented.');
}

async function stop(): Promise<void> {
  // TODO: unregister any active geofences, stop location updates, and tear down the foreground service.
  console.warn('[geofencing/android] stop() is a stub — nothing to stop yet.');
}

export const androidGeofencingEngine: GeofencingEngine = {
  requestPermissions,
  start,
  stop,
};
