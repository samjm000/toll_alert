import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Crossing } from '../types/crossing';
import { isPointInAnyPolygon, LatLng } from './boundary';
import { CrossingDetectedHandler, GeofencingEngine } from './types';

export interface EngineConfig {
  /** Distinct per platform so both engines' tasks can be `defineTask`-registered at module load without name collisions. */
  geofenceTaskName: string;
  locationTaskName: string;
  /** Used only while inside a zone crossing's wake-up circle — see "start fine location updates" below. Not run unconditionally. */
  locationOptions: Location.LocationTaskOptions;
}

function pointRegionId(crossing: Crossing): string {
  return `crossing:${crossing.id}`;
}

/** The coarse, permanent circular "wake up" geofence for a zone crossing — see the module doc comment on `registerRegions`. */
function wakeRegionId(crossing: Crossing): string {
  return `wake:${crossing.id}`;
}

function parsePointRegionId(identifier: string): string | null {
  const match = /^crossing:(.+)$/.exec(identifier);
  return match ? match[1] : null;
}

function parseWakeRegionId(identifier: string): string | null {
  const match = /^wake:(.+)$/.exec(identifier);
  return match ? match[1] : null;
}

/**
 * Builds the real geofencing engine for a platform. Both ios.ts and
 * android.ts are thin config wrappers around this — the two detection
 * strategies described below are implemented once, here, since the
 * underlying `expo-location` / `expo-task-manager` APIs are the same shape
 * on both platforms; only location-task tuning differs.
 *
 * Two different strategies, one per crossing shape (see
 * src/geofencing/README.md, "Why ULEZ is different", for the full
 * rationale):
 *
 * 1. Point crossings (`geofence.kind === 'circle'`, all 8 real UK toll
 *    crossings) — a permanent native circular geofence each. Native
 *    geofencing is exactly the right tool for a small, roughly-circular
 *    area, and it's free: no JS process needs to be running for the OS to
 *    detect and deliver these.
 * 2. Zone crossings (`geofence.kind === 'polygon'`, ULEZ) — native circular
 *    geofencing *cannot* represent an irregular shape like this at all, so
 *    it's never approximated by ringing the boundary with lots of small
 *    circles (that both misses real entries and fires falsely near the
 *    edges — the exact bug that motivated this rewrite). Instead: one
 *    permanent, large, cheap circular "wake" geofence at the zone's
 *    centroid, and a real point-in-polygon check
 *    (`isPointInAnyPolygon`) against the actual boundary data, run on
 *    background location updates — but *only* while inside that wake
 *    circle. Someone far from every zone crossing costs nothing beyond
 *    the wake geofence itself (OS-managed, no polling); accurate,
 *    timely detection only kicks in once genuinely close.
 */
export function createGeofencingEngine(config: EngineConfig): GeofencingEngine {
  const state: {
    crossings: Crossing[];
    onDetected: CrossingDetectedHandler | null;
    /**
     * Per crossing id: was the last known position inside it? Only
     * outside→inside transitions fire a detection. For zone crossings this
     * stops boundary wobble from re-notifying; for point crossings it stops
     * a duplicate notification when a region is re-registered while the
     * device is already inside — both Android's Geofencing API and
     * CoreLocation dispatch an immediate ENTER in that case, not just on a
     * genuine approach.
     */
    insideRegion: Map<string, boolean>;
  } = { crossings: [], onDetected: null, insideRegion: new Map() };

  /**
   * Registers every region ONCE per `start()` call: a permanent circle per
   * point crossing, plus a permanent wake-up circle per zone crossing.
   * Unlike the old boundary-ring-swapping approach this replaced, the
   * region set never needs to change as the user moves — every region here
   * is genuinely permanent for the lifetime of monitoring, which is also
   * why this design doesn't come anywhere near iOS's 20-region cap (at
   * most 8 point crossings + 1 wake circle = 9 regions, statically).
   */
  async function registerRegions(): Promise<void> {
    const regions: Location.LocationRegion[] = [];

    for (const crossing of state.crossings) {
      if (crossing.geofence.kind === 'circle') {
        regions.push({
          identifier: pointRegionId(crossing),
          latitude: crossing.geofence.latitude,
          longitude: crossing.geofence.longitude,
          radius: crossing.geofence.radiusMeters,
          notifyOnEnter: true,
          notifyOnExit: true,
        });
      } else {
        regions.push({
          identifier: wakeRegionId(crossing),
          latitude: crossing.geofence.centroid.latitude,
          longitude: crossing.geofence.centroid.longitude,
          radius: crossing.geofence.wakeRadiusMeters,
          notifyOnEnter: true,
          notifyOnExit: true,
        });
      }
    }

    if (regions.length === 0) {
      if (await Location.hasStartedGeofencingAsync(config.geofenceTaskName)) {
        await Location.stopGeofencingAsync(config.geofenceTaskName);
      }
      return;
    }
    await Location.startGeofencingAsync(config.geofenceTaskName, regions);
  }

  /** Runs the real polygon check for a zone crossing against a genuine device position (never the wake circle's own centroid — see the wake-ENTER handler below for why that distinction matters). */
  function checkZoneTransition(crossing: Crossing, position: LatLng): void {
    if (crossing.geofence.kind !== 'polygon') return;
    const inside = isPointInAnyPolygon(position, crossing.geofence.polygons);
    const wasInside = state.insideRegion.get(crossing.id) ?? false;
    state.insideRegion.set(crossing.id, inside);
    if (inside && !wasInside && state.onDetected) {
      state.onDetected({
        crossing,
        latitude: position.latitude,
        longitude: position.longitude,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /** Fires a detection on a genuine outside→inside transition; see `insideRegion`'s doc comment for why a raw ENTER event alone isn't enough. */
  function handlePointEnter(crossing: Crossing, position: LatLng): void {
    const wasInside = state.insideRegion.get(crossing.id) ?? false;
    state.insideRegion.set(crossing.id, true);
    if (!wasInside && state.onDetected) {
      state.onDetected({
        crossing,
        latitude: position.latitude,
        longitude: position.longitude,
        timestamp: new Date().toISOString(),
      });
    }
  }

  function handlePointExit(crossing: Crossing): void {
    state.insideRegion.set(crossing.id, false);
  }

  async function startFineLocationUpdates(): Promise<void> {
    if (await Location.hasStartedLocationUpdatesAsync(config.locationTaskName)) return;
    await Location.startLocationUpdatesAsync(config.locationTaskName, config.locationOptions);
  }

  async function stopFineLocationUpdates(): Promise<void> {
    if (await Location.hasStartedLocationUpdatesAsync(config.locationTaskName)) {
      await Location.stopLocationUpdatesAsync(config.locationTaskName);
    }
  }

  // Must be defined at module scope (not inside start()) so the OS can
  // deliver events to this callback even if the app was relaunched purely to
  // handle them — see the expo-task-manager docs on background task defs.
  TaskManager.defineTask(config.geofenceTaskName, async ({ data, error }) => {
    if (error || !data) return;
    const { eventType, region } = data as {
      eventType: Location.GeofencingEventType;
      region: Location.LocationRegion;
    };
    if (!region.identifier) return;
    const position = { latitude: region.latitude, longitude: region.longitude };

    const pointCrossingId = parsePointRegionId(region.identifier);
    if (pointCrossingId) {
      const crossing = state.crossings.find((c) => c.id === pointCrossingId);
      if (!crossing) return;
      if (eventType === Location.GeofencingEventType.Enter) {
        handlePointEnter(crossing, position);
      } else if (eventType === Location.GeofencingEventType.Exit) {
        handlePointExit(crossing);
      }
      return;
    }

    const wakeCrossingId = parseWakeRegionId(region.identifier);
    if (wakeCrossingId) {
      const crossing = state.crossings.find((c) => c.id === wakeCrossingId);
      if (!crossing) return;
      if (eventType === Location.GeofencingEventType.Enter) {
        // Deliberately does NOT run checkZoneTransition here: `position`
        // above is the wake circle's own fixed centroid, not the device's
        // actual location, and checking the centroid against the real
        // polygon would be checking the wrong point entirely (it's always
        // inside — that's meaningless). The real check only ever runs from
        // the location task below, which carries a genuine device fix.
        startFineLocationUpdates().catch(() => {});
      } else if (eventType === Location.GeofencingEventType.Exit) {
        // Outside the (deliberately oversized) wake circle means definitely
        // outside the real polygon too, so this inference is safe even
        // though it's also derived from the region's fixed centroid rather
        // than a device fix.
        state.insideRegion.set(crossing.id, false);
        stopFineLocationUpdates().catch(() => {});
      }
    }
  });

  TaskManager.defineTask(config.locationTaskName, async ({ data, error }) => {
    if (error || !data) return;
    const { locations } = data as { locations: Location.LocationObject[] };
    const latest = locations[locations.length - 1];
    if (!latest) return;
    const position: LatLng = { latitude: latest.coords.latitude, longitude: latest.coords.longitude };

    for (const crossing of state.crossings) {
      checkZoneTransition(crossing, position);
    }
  });

  async function requestPermissions(): Promise<boolean> {
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') return false;
    const background = await Location.requestBackgroundPermissionsAsync();
    return background.status === 'granted';
  }

  async function start(crossings: Crossing[], onCrossingDetected: CrossingDetectedHandler): Promise<void> {
    state.crossings = crossings;
    state.onDetected = onCrossingDetected;
    state.insideRegion.clear();

    await registerRegions();

    // Fine-grained location polling is NOT started here — it only starts
    // reactively from a wake circle's own ENTER handler above, including
    // the near-immediate ENTER the OS dispatches at registration time if
    // the device already happens to be inside one. Someone with monitoring
    // on but nowhere near any zone crossing pays for the (cheap, OS-managed)
    // geofences only, not for continuous location updates.
  }

  async function stop(): Promise<void> {
    if (await Location.hasStartedGeofencingAsync(config.geofenceTaskName)) {
      await Location.stopGeofencingAsync(config.geofenceTaskName);
    }
    await stopFineLocationUpdates();
    state.crossings = [];
    state.onDetected = null;
    state.insideRegion.clear();
  }

  return { requestPermissions, start, stop };
}
