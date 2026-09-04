import * as Location from 'expo-location';
import { createGeofencingEngine } from './engine';

/**
 * Android background geofencing.
 *
 * STATUS: real region-swapping + point-in-polygon logic is implemented (see
 * engine.ts / boundary.ts), same as ios.ts — this is no longer a no-op stub.
 * Still unverified on a real device/emulator for the same reason as iOS: no
 * Android SDK or hardware in this environment to test GPS behaviour against.
 *
 * --------------------------------------------------------------------------
 * LESS CONSTRAINED THAN iOS, BUT NOT UNLIMITED: Android's Geofencing API
 * (FusedLocationProviderClient) allows up to 100 simultaneous geofences per
 * app, vs iOS's 20 — enough headroom to ring a larger stretch of the ULEZ
 * boundary at once, but engine.ts uses the same dynamic-swapping approach on
 * both platforms for consistent behaviour and battery profile, just with a
 * larger `maxDynamicRegions` budget here.
 *
 * ANDROID-SPECIFIC CONCERNS:
 * - Doze mode / battery optimisation can delay geofence transition callbacks
 *   when the device is stationary and screen-off. The `foregroundService`
 *   option below (backed by `isAndroidForegroundServiceEnabled` in
 *   app.json's expo-location plugin config) keeps a persistent low-priority
 *   notification while background tracking is active, which is the standard
 *   mitigation.
 * - Android 10+ requires the two-step permission flow: foreground location
 *   granted first, then a *separate* "Allow all the time" prompt for
 *   ACCESS_BACKGROUND_LOCATION — `requestPermissions()` (engine.ts) already
 *   does both calls in order, but the in-app education screen justifying the
 *   background prompt (same idea as iOS's "Always" upgrade) still needs
 *   building.
 * - OEM-specific background restrictions (Samsung, Xiaomi, etc. aggressively
 *   kill background tasks by default) may need a "please disable battery
 *   optimisation for this app" prompt — not solvable purely in code.
 *
 * TODO (native build, needs a real device/emulator):
 * - Verify against real/simulated GPS (Android Studio's Extended Controls
 *   location playback, or a GPX route) for both a Dartford drive-through and
 *   a ULEZ boundary crossing.
 * - Build the foreground-permission → background-permission education screen.
 * - Handle OEM battery-optimisation exemption prompting.
 * - Tune `ZONE_ACTIVATION_RADIUS_METERS` / `ZONE_REGION_RADIUS_METERS`
 *   (engine.ts) and the location task's `distanceInterval` below.
 * --------------------------------------------------------------------------
 */

export const ANDROID_GEOFENCE_TASK_NAME = 'toll-alert-android-geofence-task';
export const ANDROID_LOCATION_TASK_NAME = 'toll-alert-android-location-task';

export const androidGeofencingEngine = createGeofencingEngine({
  geofenceTaskName: ANDROID_GEOFENCE_TASK_NAME,
  locationTaskName: ANDROID_LOCATION_TASK_NAME,
  maxDynamicRegions: 80, // 100-geofence Android cap, minus headroom for Dartford + a safety margin
  locationOptions: {
    accuracy: Location.Accuracy.Low,
    distanceInterval: 500,
    foregroundService: {
      notificationTitle: 'Toll Alert is watching for crossings',
      notificationBody: 'Background location is active so you get notified after Dartford or ULEZ.',
    },
  },
});
