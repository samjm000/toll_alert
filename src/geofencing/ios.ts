import * as Location from 'expo-location';
import { Crossing } from '../types/crossing';
import { CrossingDetectedHandler, GeofencingEngine } from './types';

/**
 * iOS background geofencing.
 *
 * STATUS: STUBBED — not yet implemented. Everything below documents the
 * approach so the real implementation (native build, once we're on the Mac
 * mini) has a clear spec to work from.
 *
 * --------------------------------------------------------------------------
 * THE CORE CONSTRAINT: CoreLocation only allows an app to monitor 20
 * circular regions at once, app-wide (`CLLocationManager.maximumRegionMonitoringDistance`
 * doesn't help here — it's a hard count cap, not a distance one). That's
 * fine for Dartford (1 region, permanent) but nowhere near enough to ring
 * the ~630 sq mile ULEZ boundary directly.
 *
 * THE STRATEGY — dynamic region-swapping:
 * 1. Reserve 1 of the 20 slots permanently for Dartford's point geofence
 *    (`crossing.geofence.kind === 'circle'`).
 * 2. For ULEZ (`crossing.geofence.kind === 'polygon'`), don't monitor the
 *    whole boundary. Instead:
 *    a. Use `Location.startLocationUpdatesAsync` with
 *       `accuracy: Location.Accuracy.Low` and a large `distanceInterval`
 *       (effectively CoreLocation's significant-location-change service)
 *       to get coarse position updates cheaply in the background.
 *    b. On each coarse update, find the N nearest points along the ULEZ
 *       boundary polygon to the user's current position (N ≈ 15-18, to
 *       leave headroom under the 20-region cap alongside Dartford).
 *    c. Re-register circular regions (~150-300m radius) centred on those
 *       nearest boundary points via `Location.startGeofencingAsync`,
 *       un-registering the previous set first.
 *    d. When the user is far (>20-30km, say) from the ULEZ boundary
 *       entirely, don't monitor it at all — just keep polling coarse
 *       position and re-arm the boundary regions once they're back in
 *       range. This is also the main battery-saving lever.
 * 3. A true "am I inside the polygon" check (point-in-polygon, e.g.
 *    ray-casting against `crossing.geofence.boundary`) still needs to run
 *    against each coarse position update, independent of the swapped
 *    regions — the regions catch the *moment of crossing*, the polygon
 *    check confirms which side the user is now on (mainly to avoid
 *    re-notifying every time they wobble near the boundary).
 *
 * TODO (native build):
 * - Implement the nearest-boundary-point selection + region re-registration
 *   in (2b)/(2c) above.
 * - Implement the point-in-polygon check for (3).
 * - Wire `Location.hasStartedGeofencingAsync` / background task events
 *   (via expo-task-manager, see the shared TASK_NAME below) into
 *   `onCrossingDetected`.
 * - Handle the "Always" permission upgrade flow (request "When In Use"
 *   first, then prompt for "Always" — see the in-app education screen
 *   this needs, not just the raw permission call).
 * - Test with simulated GPS routes (Xcode's location simulation, or a GPX
 *   route) for both a Dartford drive-through and a ULEZ boundary crossing.
 * --------------------------------------------------------------------------
 */

export const IOS_GEOFENCE_TASK_NAME = 'toll-alert-ios-geofence-task';

async function requestPermissions(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return false;

  const background = await Location.requestBackgroundPermissionsAsync();
  return background.status === 'granted';
}

async function start(_crossings: Crossing[], _onCrossingDetected: CrossingDetectedHandler): Promise<void> {
  // TODO: implement the region-swapping strategy documented above.
  console.warn('[geofencing/ios] start() is a stub — background monitoring is not yet implemented.');
}

async function stop(): Promise<void> {
  // TODO: unregister any active geofences and stop location updates.
  console.warn('[geofencing/ios] stop() is a stub — nothing to stop yet.');
}

export const iosGeofencingEngine: GeofencingEngine = {
  requestPermissions,
  start,
  stop,
};
