import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Crossing } from '../types/crossing';
import { haversineDistanceMeters, isPointInPolygon, LatLng, nearestBoundaryPoints } from './boundary';
import { CrossingDetectedHandler, GeofencingEngine } from './types';

/** How close to a zone's centroid before its boundary gets ringed with dynamic geofences at all — keeps the region budget and background location task idle for zones the user is nowhere near. */
const ZONE_ACTIVATION_RADIUS_METERS = 25_000;
/** Radius of each individual dynamic boundary-point geofence. */
const ZONE_REGION_RADIUS_METERS = 250;

export interface EngineConfig {
  /** Distinct per platform so both engines' tasks can be `defineTask`-registered at module load without name collisions. */
  geofenceTaskName: string;
  locationTaskName: string;
  /** How many circular regions this platform's boundary-swapping may occupy at once — leaves headroom under the OS's total region cap for the permanent point crossings (Dartford). */
  maxDynamicRegions: number;
  locationOptions: Location.LocationTaskOptions;
}

function pointRegionId(crossing: Crossing): string {
  return `crossing:${crossing.id}`;
}

function zoneRegionId(crossing: Crossing, index: number): string {
  return `zone:${crossing.id}:${index}`;
}

function parsePointRegionId(identifier: string): string | null {
  const match = /^crossing:(.+)$/.exec(identifier);
  return match ? match[1] : null;
}

function parseZoneRegionId(identifier: string): string | null {
  const match = /^zone:(.+):\d+$/.exec(identifier);
  return match ? match[1] : null;
}

/**
 * Builds the real geofencing engine for a platform from its tuning
 * constants. Both ios.ts and android.ts are thin config wrappers around
 * this — the region-swapping strategy and the point-in-polygon confirmation
 * described in their doc comments are implemented once, here, since the
 * underlying `expo-location` / `expo-task-manager` APIs are the same shape
 * on both platforms; only the region-count budget and location-task tuning
 * differ.
 */
export function createGeofencingEngine(config: EngineConfig): GeofencingEngine {
  const state: {
    crossings: Crossing[];
    onDetected: CrossingDetectedHandler | null;
    /** Per zone-crossing id: was the last known position inside the polygon? Only outside→inside transitions fire a detection, so wobbling near the boundary doesn't re-notify. */
    insideZone: Map<string, boolean>;
  } = { crossings: [], onDetected: null, insideZone: new Map() };

  /**
   * Rebuilds the *entire* region set — permanent point crossings plus
   * whichever zone boundary points are currently in range — and re-registers
   * it in one call. `startGeofencingAsync` replaces the whole list rather
   * than appending, so every caller must go through here rather than
   * registering regions piecemeal.
   */
  async function syncRegions(nearPosition?: LatLng): Promise<void> {
    const regions: Location.LocationRegion[] = [];

    for (const crossing of state.crossings) {
      if (crossing.geofence.kind === 'circle') {
        regions.push({
          identifier: pointRegionId(crossing),
          latitude: crossing.geofence.latitude,
          longitude: crossing.geofence.longitude,
          radius: crossing.geofence.radiusMeters,
          notifyOnEnter: true,
          notifyOnExit: false,
        });
      }
    }

    if (nearPosition) {
      for (const crossing of state.crossings) {
        if (crossing.geofence.kind !== 'polygon') continue;
        const distanceToCentroid = haversineDistanceMeters(nearPosition, crossing.geofence.centroid);
        if (distanceToCentroid > ZONE_ACTIVATION_RADIUS_METERS) continue;
        const nearest = nearestBoundaryPoints(nearPosition, crossing.geofence.boundary, config.maxDynamicRegions);
        nearest.forEach((point, index) => {
          regions.push({
            identifier: zoneRegionId(crossing, index),
            latitude: point.latitude,
            longitude: point.longitude,
            radius: ZONE_REGION_RADIUS_METERS,
            notifyOnEnter: true,
            notifyOnExit: true,
          });
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

  function checkZoneTransition(crossing: Crossing, position: LatLng): void {
    if (crossing.geofence.kind !== 'polygon') return;
    const inside = isPointInPolygon(position, crossing.geofence.boundary);
    const wasInside = state.insideZone.get(crossing.id) ?? false;
    state.insideZone.set(crossing.id, inside);
    if (inside && !wasInside && state.onDetected) {
      state.onDetected({
        crossing,
        latitude: position.latitude,
        longitude: position.longitude,
        timestamp: new Date().toISOString(),
      });
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
    if (eventType !== Location.GeofencingEventType.Enter || !region.identifier) return;
    const position = { latitude: region.latitude, longitude: region.longitude };

    const pointCrossingId = parsePointRegionId(region.identifier);
    if (pointCrossingId) {
      const crossing = state.crossings.find((c) => c.id === pointCrossingId);
      if (crossing && state.onDetected) {
        state.onDetected({ crossing, ...position, timestamp: new Date().toISOString() });
      }
      return;
    }

    const zoneCrossingId = parseZoneRegionId(region.identifier);
    if (zoneCrossingId) {
      // Entering a boundary-ring point only means "near the edge" — the
      // polygon check decides whether that was an entry or an exit, the
      // region event just wakes us up to check sooner than the coarse
      // location task would on its own.
      const crossing = state.crossings.find((c) => c.id === zoneCrossingId);
      if (crossing) {
        checkZoneTransition(crossing, position);
        syncRegions(position).catch(() => {});
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
    syncRegions(position).catch(() => {});
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
    state.insideZone.clear();

    await syncRegions();

    const hasZoneCrossing = crossings.some((c) => c.geofence.kind === 'polygon');
    if (hasZoneCrossing) {
      await Location.startLocationUpdatesAsync(config.locationTaskName, config.locationOptions);
    }
  }

  async function stop(): Promise<void> {
    if (await Location.hasStartedGeofencingAsync(config.geofenceTaskName)) {
      await Location.stopGeofencingAsync(config.geofenceTaskName);
    }
    if (await Location.hasStartedLocationUpdatesAsync(config.locationTaskName)) {
      await Location.stopLocationUpdatesAsync(config.locationTaskName);
    }
    state.crossings = [];
    state.onDetected = null;
    state.insideZone.clear();
  }

  return { requestPermissions, start, stop };
}
