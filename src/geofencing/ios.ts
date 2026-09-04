import * as Location from 'expo-location';
import { createGeofencingEngine } from './engine';

/**
 * iOS background geofencing.
 *
 * STATUS: real region-swapping + point-in-polygon logic is implemented (see
 * engine.ts / boundary.ts) using `expo-location`'s CoreLocation-backed
 * geofencing and background-location APIs — this is no longer a no-op stub.
 * What's NOT yet done is verified behaviour on a real device: none of this
 * has run against actual GPS/CoreLocation, since that needs a native build
 * on real hardware (or at least simulator GPS playback), which isn't
 * available in this environment. This happens once we're on the Mac mini.
 *
 * --------------------------------------------------------------------------
 * THE CORE CONSTRAINT: CoreLocation only allows an app to monitor 20
 * circular regions at once, app-wide. That's fine for Dartford (1 region,
 * permanent) but nowhere near enough to ring the ~630 sq mile ULEZ boundary
 * directly.
 *
 * THE STRATEGY — dynamic region-swapping (implemented in engine.ts):
 * 1 region reserved permanently for Dartford's point geofence. For ULEZ,
 * a coarse background location task (`Location.startLocationUpdatesAsync`,
 * low accuracy, large distance interval — effectively CoreLocation's
 * significant-location-change service) drives `syncRegions()`, which:
 *   a. finds the nearest `maxDynamicRegions` points along the ULEZ boundary
 *      polygon to the user's current position,
 *   b. re-registers circular regions around those points via
 *      `Location.startGeofencingAsync`, replacing the previous set,
 *   c. skips ULEZ entirely (no regions registered for it) once the user is
 *      more than `ZONE_ACTIVATION_RADIUS_METERS` from the zone centroid —
 *      the main battery-saving lever.
 * A boundary-region ENTER event doesn't notify by itself — it wakes the
 * point-in-polygon check (`isPointInPolygon` in boundary.ts) against that
 * position, which is what actually decides whether the user just entered or
 * exited the zone, and only fires `onCrossingDetected` on an outside→inside
 * transition.
 *
 * TODO (native build, needs a real device):
 * - Verify the above against real/simulated GPS for both a Dartford
 *   drive-through and a ULEZ boundary crossing.
 * - Implement the "When In Use" → "Always" permission upgrade flow with an
 *   in-app education screen shown before the system prompt (Apple App
 *   Review expects this to be justified on-screen, not just requested).
 * - Tune `ZONE_ACTIVATION_RADIUS_METERS` / `ZONE_REGION_RADIUS_METERS`
 *   (engine.ts) and the location task's `distanceInterval` below against
 *   real-world battery and detection-latency tradeoffs.
 * --------------------------------------------------------------------------
 */

export const IOS_GEOFENCE_TASK_NAME = 'toll-alert-ios-geofence-task';
export const IOS_LOCATION_TASK_NAME = 'toll-alert-ios-location-task';

export const iosGeofencingEngine = createGeofencingEngine({
  geofenceTaskName: IOS_GEOFENCE_TASK_NAME,
  locationTaskName: IOS_LOCATION_TASK_NAME,
  maxDynamicRegions: 19, // 20-region CoreLocation cap, minus 1 reserved for Dartford's permanent circle
  locationOptions: {
    accuracy: Location.Accuracy.Low,
    distanceInterval: 500,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
  },
});
