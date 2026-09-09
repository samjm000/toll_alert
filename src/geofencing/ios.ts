import * as Location from 'expo-location';
import { MOCK_CROSSINGS_CONFIG } from '../config/crossings';
import { createGeofencingEngine } from './engine';

/**
 * iOS background geofencing.
 *
 * STATUS: untested — out of scope for further work until there's a Mac
 * available for Xcode. This file just wires the shared engine (engine.ts)
 * to CoreLocation-backed `expo-location` APIs; nothing here has run
 * against actual GPS/CoreLocation. The Android build of the same shared
 * engine HAS been run end-to-end on a real emulator for the 8 point
 * crossings (see src/geofencing/README.md) — that result doesn't transfer
 * to iOS automatically, CoreLocation's actual behaviour is unverified.
 *
 * --------------------------------------------------------------------------
 * THE CORE CONSTRAINT (now moot): CoreLocation only allows an app to
 * monitor 20 circular regions at once, app-wide. This used to matter a lot
 * — ringing ULEZ's boundary with circles to approximate its shape could
 * easily have needed more regions than that. It doesn't any more: ULEZ is
 * no longer approximated with circles at all (see engine.ts's module doc
 * comment and README's "Why ULEZ is different") — one real point-in-polygon
 * check against the actual boundary data, gated by a single permanent wake
 * circle. Total regions registered on this platform: at most 8 point
 * crossings + 1 ULEZ wake circle = 9, comfortably under 20 with no
 * swapping logic needed.
 *
 * TODO (native build, needs a Mac + a real device):
 * - Verify against real/simulated GPS for both a Dartford-style point
 *   crossing and a ULEZ boundary crossing — nothing here has been run at
 *   all, unlike the Android build of the same engine.
 * - Tune the location task's `distanceInterval` below (used only once
 *   inside ULEZ's wake circle, not unconditionally) against real-world
 *   battery and detection-latency tradeoffs.
 * --------------------------------------------------------------------------
 */

export const IOS_GEOFENCE_TASK_NAME = 'toll-alert-ios-geofence-task';
export const IOS_LOCATION_TASK_NAME = 'toll-alert-ios-location-task';

export const iosGeofencingEngine = createGeofencingEngine({
  geofenceTaskName: IOS_GEOFENCE_TASK_NAME,
  locationTaskName: IOS_LOCATION_TASK_NAME,
  // Re-derives the crossing list in a cold, headless task context (the
  // OS relaunching the app purely to deliver a transition). Points at the
  // same mock-config module the UI uses, so swapping it for a real
  // `fetch(CONFIG_URL)` later stays a one-place change.
  loadCrossings: () => MOCK_CROSSINGS_CONFIG.crossings,
  locationOptions: {
    accuracy: Location.Accuracy.Low,
    distanceInterval: 500,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
  },
});
