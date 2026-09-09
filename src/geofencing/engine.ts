import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Crossing } from '../types/crossing';
import { isPointInAnyPolygon, LatLng } from './boundary';
import { recordDetection } from './detection';
import { logEvent } from '../diagnostics/log';
import { loadInsideRegions, saveInsideRegions } from '../state/persistence';
import { CrossingDetectedHandler, EngineStatus, GeofencingEngine } from './types';

export interface EngineConfig {
  /** Distinct per platform so both engines' tasks can be `defineTask`-registered at module load without name collisions. */
  geofenceTaskName: string;
  locationTaskName: string;
  /** Used only while inside a zone crossing's wake-up circle — see "start fine location updates" below. Not run unconditionally. */
  locationOptions: Location.LocationTaskOptions;
  /**
   * How a *cold* task context gets its crossing list back.
   *
   * THE BUG THIS EXISTS TO FIX: `state.crossings` used to be populated only
   * by `start()`. Android kills this process routinely and then relaunches
   * it headlessly to deliver a geofence transition — a brand new JS context
   * where module scope has run (so the task is defined) but `start()` never
   * has. The task would fire correctly, `state.crossings.find(...)` would
   * return `undefined` against an empty array, and it would `return`
   * silently. Every real-world crossing detected while the app was not
   * already running produced absolutely nothing, with no error anywhere.
   */
  loadCrossings: () => Crossing[] | Promise<Crossing[]>;
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
 *
 * -------------------------------------------------------------------------
 * SURVIVING PROCESS DEATH is the other half of the job, and the half that
 * was missing. The OS-level geofences registered by `startGeofencingAsync`
 * outlive the app's process; the JS state describing what those regions
 * *mean* did not. Everything below therefore either re-derives itself
 * (`ensureHydrated`) or is persisted (`insideRegion` via
 * src/state/persistence.ts), and no path in a task callback returns without
 * writing to the diagnostic log first.
 * -------------------------------------------------------------------------
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
     *
     * Mirrored to AsyncStorage on every change so it survives the process
     * death this engine is expected to work across.
     */
    insideRegion: Map<string, boolean>;
    hydrated: boolean;
  } = { crossings: [], onDetected: null, insideRegion: new Map(), hydrated: false };

  /**
   * Rebuilds enough state for a task callback to do its job in a JS context
   * where `start()` was never called. Called at the top of both task
   * handlers rather than assuming a warm process.
   *
   * The in-flight promise is memoised, not just a boolean flag: the OS
   * delivers geofence transitions in bursts (several regions at once, and a
   * location update alongside them), so a plain `if (hydrated) return` set
   * before the await would let the second caller through against a still-empty
   * crossing list — reintroducing the exact silent drop this exists to fix.
   */
  let hydration: Promise<void> | null = null;

  function ensureHydrated(reason: string): Promise<void> {
    if (state.hydrated) return Promise.resolve();
    if (hydration) return hydration;

    hydration = (async () => {
      try {
        const crossings = await config.loadCrossings();
        state.crossings = crossings;
        const persisted = await loadInsideRegions();
        for (const [key, value] of persisted) {
          if (!state.insideRegion.has(key)) state.insideRegion.set(key, value);
        }
        state.hydrated = true;
        await logEvent(
          'info',
          'engine',
          `Cold-start hydrate (${reason}): ${crossings.length} crossings, ${persisted.size} remembered region states. This context had no start() call — the OS relaunched the app to deliver an event.`
        );
      } catch (e) {
        // Left un-hydrated deliberately so the next event retries rather
        // than inheriting a permanently empty crossing list.
        hydration = null;
        await logEvent('error', 'engine', `Cold-start hydrate failed (${reason})`, String(e));
      }
    })();

    return hydration;
  }

  function setInside(crossingId: string, inside: boolean): void {
    state.insideRegion.set(crossingId, inside);
    saveInsideRegions(state.insideRegion).catch(() => {});
  }

  /**
   * Delivers a detection. Falls back to the shared headless pipeline when
   * no React handler is registered — which is the normal case for a real
   * crossing, since the app is usually not running when one happens.
   * Awaited by both callers: returning from a task before this resolves can
   * have the JS context torn down with the notification never posted.
   */
  async function emitDetection(crossing: Crossing, position: LatLng): Promise<void> {
    const detection = {
      crossing,
      latitude: position.latitude,
      longitude: position.longitude,
      timestamp: new Date().toISOString(),
    };
    try {
      if (state.onDetected) {
        await state.onDetected(detection);
      } else {
        await recordDetection(crossing, 'geofence');
      }
    } catch (e) {
      await logEvent('error', 'engine', `Detection handler threw for ${crossing.shortName}`, String(e));
    }
  }

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
      await logEvent('warn', 'engine', 'No regions to register — monitoring is effectively off');
      return;
    }

    await Location.startGeofencingAsync(config.geofenceTaskName, regions);
    await logEvent(
      'info',
      'engine',
      `Registered ${regions.length} regions with the OS`,
      regions.map((r) => `${r.identifier}@${r.latitude?.toFixed(4)},${r.longitude?.toFixed(4)}/${r.radius}m`)
    );
  }

  /** Runs the real polygon check for a zone crossing against a genuine device position (never the wake circle's own centroid — see the wake-ENTER handler below for why that distinction matters). */
  async function checkZoneTransition(crossing: Crossing, position: LatLng): Promise<void> {
    if (crossing.geofence.kind !== 'polygon') return;
    const inside = isPointInAnyPolygon(position, crossing.geofence.polygons);
    const wasInside = state.insideRegion.get(crossing.id) ?? false;
    setInside(crossing.id, inside);
    if (inside && !wasInside) {
      await emitDetection(crossing, position);
    }
  }

  /** Fires a detection on a genuine outside→inside transition; see `insideRegion`'s doc comment for why a raw ENTER event alone isn't enough. */
  async function handlePointEnter(crossing: Crossing, position: LatLng): Promise<void> {
    const wasInside = state.insideRegion.get(crossing.id) ?? false;
    setInside(crossing.id, true);
    if (wasInside) {
      await logEvent('info', 'engine', `ENTER ${crossing.shortName} ignored — already recorded as inside (dedup)`);
      return;
    }
    await emitDetection(crossing, position);
  }

  function handlePointExit(crossing: Crossing): void {
    setInside(crossing.id, false);
  }

  async function startFineLocationUpdates(): Promise<void> {
    try {
      if (await Location.hasStartedLocationUpdatesAsync(config.locationTaskName)) return;
      await Location.startLocationUpdatesAsync(config.locationTaskName, config.locationOptions);
      await logEvent('info', 'engine', 'Started fine location updates (inside a zone wake circle)');
    } catch (e) {
      // Android 12+ restricts starting a location foreground service from
      // the background; this can throw ForegroundServiceStartNotAllowedException.
      // It used to be swallowed by a bare `.catch(() => {})`, which made a
      // total ULEZ detection failure completely invisible.
      await logEvent('error', 'engine', 'Could not start fine location updates — ZONE DETECTION IS OFF', String(e));
    }
  }

  async function stopFineLocationUpdates(): Promise<void> {
    try {
      if (await Location.hasStartedLocationUpdatesAsync(config.locationTaskName)) {
        await Location.stopLocationUpdatesAsync(config.locationTaskName);
        await logEvent('info', 'engine', 'Stopped fine location updates');
      }
    } catch (e) {
      await logEvent('warn', 'engine', 'Could not stop fine location updates', String(e));
    }
  }

  // Must be defined at module scope (not inside start()) so the OS can
  // deliver events to this callback even if the app was relaunched purely to
  // handle them — see the expo-task-manager docs on background task defs.
  TaskManager.defineTask(config.geofenceTaskName, async ({ data, error }) => {
    if (error) {
      await logEvent('error', 'geofence-task', 'Task delivered an error', String(error.message ?? error));
      return;
    }
    if (!data) {
      await logEvent('warn', 'geofence-task', 'Task fired with no data payload');
      return;
    }

    const { eventType, region } = data as {
      eventType: Location.GeofencingEventType;
      region: Location.LocationRegion;
    };
    const direction = eventType === Location.GeofencingEventType.Enter ? 'ENTER' : 'EXIT';

    if (!region?.identifier) {
      await logEvent('warn', 'geofence-task', `${direction} for a region with no identifier — ignored`);
      return;
    }

    await ensureHydrated(`geofence ${direction} ${region.identifier}`);
    await logEvent('info', 'geofence-task', `${direction} ${region.identifier}`);

    const position = { latitude: region.latitude, longitude: region.longitude };

    const pointCrossingId = parsePointRegionId(region.identifier);
    if (pointCrossingId) {
      const crossing = state.crossings.find((c) => c.id === pointCrossingId);
      if (!crossing) {
        await logEvent(
          'error',
          'geofence-task',
          `${direction} for "${pointCrossingId}" but no matching crossing in the loaded config — event dropped`
        );
        return;
      }
      if (eventType === Location.GeofencingEventType.Enter) {
        await handlePointEnter(crossing, position);
      } else if (eventType === Location.GeofencingEventType.Exit) {
        handlePointExit(crossing);
      }
      return;
    }

    const wakeCrossingId = parseWakeRegionId(region.identifier);
    if (wakeCrossingId) {
      const crossing = state.crossings.find((c) => c.id === wakeCrossingId);
      if (!crossing) {
        await logEvent(
          'error',
          'geofence-task',
          `${direction} for wake circle "${wakeCrossingId}" but no matching crossing in the loaded config — event dropped`
        );
        return;
      }
      if (eventType === Location.GeofencingEventType.Enter) {
        // Deliberately does NOT run checkZoneTransition here: `position`
        // above is the wake circle's own fixed centroid, not the device's
        // actual location, and checking the centroid against the real
        // polygon would be checking the wrong point entirely (it's always
        // inside — that's meaningless). The real check only ever runs from
        // the location task below, which carries a genuine device fix.
        await startFineLocationUpdates();
      } else if (eventType === Location.GeofencingEventType.Exit) {
        // Outside the (deliberately oversized) wake circle means definitely
        // outside the real polygon too, so this inference is safe even
        // though it's also derived from the region's fixed centroid rather
        // than a device fix.
        setInside(crossing.id, false);
        await stopFineLocationUpdates();
      }
      return;
    }

    await logEvent('warn', 'geofence-task', `Unrecognised region identifier "${region.identifier}" — ignored`);
  });

  TaskManager.defineTask(config.locationTaskName, async ({ data, error }) => {
    if (error) {
      await logEvent('error', 'location-task', 'Task delivered an error', String(error.message ?? error));
      return;
    }
    if (!data) {
      await logEvent('warn', 'location-task', 'Task fired with no data payload');
      return;
    }

    const { locations } = data as { locations: Location.LocationObject[] };
    const latest = locations?.[locations.length - 1];
    if (!latest) {
      await logEvent('warn', 'location-task', 'Task fired with an empty locations array');
      return;
    }

    await ensureHydrated('location update');

    const position: LatLng = { latitude: latest.coords.latitude, longitude: latest.coords.longitude };
    await logEvent(
      'info',
      'location-task',
      `Fix ${position.latitude.toFixed(4)},${position.longitude.toFixed(4)} (±${Math.round(latest.coords.accuracy ?? -1)}m)`
    );

    for (const crossing of state.crossings) {
      await checkZoneTransition(crossing, position);
    }
  });

  async function requestPermissions(): Promise<boolean> {
    const foreground = await Location.requestForegroundPermissionsAsync();
    await logEvent('info', 'permissions', `Foreground location: ${foreground.status}`);
    if (foreground.status !== 'granted') return false;
    const background = await Location.requestBackgroundPermissionsAsync();
    await logEvent(
      background.status === 'granted' ? 'info' : 'warn',
      'permissions',
      `Background location ("Allow all the time"): ${background.status}`
    );
    return background.status === 'granted';
  }

  async function start(crossings: Crossing[], onCrossingDetected: CrossingDetectedHandler): Promise<void> {
    state.crossings = crossings;
    state.onDetected = onCrossingDetected;
    // Inside/outside memory is deliberately NOT cleared here any more.
    // Clearing it meant that re-enabling monitoring (or any relaunch that
    // re-ran start()) treated the device as outside every region, so the
    // immediate ENTER the OS dispatches for a region you're already inside
    // was read as a genuine arrival and re-notified.
    state.insideRegion = await loadInsideRegions();
    state.hydrated = true;
    hydration = null;

    await registerRegions();
    await logEvent('info', 'engine', `Monitoring started for ${crossings.length} crossings`);

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
    state.hydrated = false;
    hydration = null;
    await saveInsideRegions(state.insideRegion);
    await logEvent('info', 'engine', 'Monitoring stopped');
  }

  /**
   * What the OS actually thinks is running, as opposed to what the UI
   * believes. Surfaced in Settings → Diagnostics: "the toggle says On" and
   * "the OS is monitoring 9 regions" are different claims, and the gap
   * between them is precisely where a silent failure lives.
   */
  async function getStatus(): Promise<EngineStatus> {
    const [geofencingRegistered, locationUpdatesRunning, foreground, background] = await Promise.all([
      Location.hasStartedGeofencingAsync(config.geofenceTaskName).catch(() => false),
      Location.hasStartedLocationUpdatesAsync(config.locationTaskName).catch(() => false),
      Location.getForegroundPermissionsAsync().catch(() => null),
      Location.getBackgroundPermissionsAsync().catch(() => null),
    ]);

    return {
      geofencingRegistered,
      locationUpdatesRunning,
      loadedCrossings: state.crossings.length,
      foregroundLocationStatus: foreground?.status ?? 'unknown',
      backgroundLocationStatus: background?.status ?? 'unknown',
      locationServicesEnabled: await Location.hasServicesEnabledAsync().catch(() => false),
    };
  }

  return { requestPermissions, start, stop, getStatus };
}
