import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { geofencing } from '../geofencing';
import { getNotificationPermissionStatus } from '../notifications';
import { loadMonitoringEnabled } from '../state/persistence';
import { getPreviousSessionLastEntryAt, logEvent } from './log';
import { describeDuration, diffSnapshots, HealthSnapshot, roundCoord, snapshotProblems } from './snapshot';
import { uploadPendingLogs } from './upload';

/**
 * A periodic background health check, so the diagnostic log can answer
 * "was the app even able to detect anything at the time of the drive?".
 *
 * WHY THIS EXISTS: a tester drove over a crossing and got no alert, and the
 * log had nothing in it for that time. Point crossings rely entirely on the
 * OS delivering a geofence event, so when the OS doesn't — geofences
 * dropped after a reboot or a location toggle, the app killed by an OEM
 * battery manager, location switched off — the app never runs and the log
 * is simply silent. Silence looked identical to "nothing happened".
 *
 * Three things close that gap:
 * - Every process start logs how long the app had been completely inactive
 *   (`noteProcessStart`), so a dead stretch shows up as a line, not a hole.
 * - Every ~15 min (Android WorkManager; the OS may stretch it under Doze)
 *   `runHealthCheck` snapshots permissions, device location, geofence
 *   registration and notifications, and logs whenever any of it CHANGES —
 *   e.g. "locationServicesEnabled: true -> false" at 08:12.
 * - If monitoring is on but the OS has dropped the geofences, it puts them
 *   back and says so.
 *
 * Each check also sends new log lines to the team's sheet if the tester has
 * opted in (upload.ts); otherwise everything stays on the device.
 */

export const HEARTBEAT_TASK_NAME = 'toll-alert-heartbeat';

const SNAPSHOT_KEY = 'tollalert.heartbeat.snapshot.v1';
const LAST_CHECK_KEY = 'tollalert.heartbeat.lastCheckAt.v1';
const LAST_ALIVE_LINE_KEY = 'tollalert.heartbeat.lastAliveLineAt.v1';

/** Minutes. WorkManager's floor; the OS treats it as a minimum, not a schedule. */
const INTERVAL_MINUTES = 15;

/** An unchanged, healthy state is still logged this often, so a quiet log proves the app was alive. */
const ALIVE_LINE_EVERY_MS = 6 * 60 * 60 * 1000;

/** A gap longer than this with monitoring on is flagged as a warning. Heartbeats alone should keep it well under. */
const SUSPICIOUS_GAP_MS = 3 * 60 * 60 * 1000;

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function write(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Same rule as log.ts: diagnostics must never break the app.
  }
}

async function describeLastFix(): Promise<string> {
  try {
    const last = await Location.getLastKnownPositionAsync();
    if (!last) return 'no last known position';
    const age = describeDuration(Date.now() - last.timestamp);
    return `last fix ~${roundCoord(last.coords.latitude)},${roundCoord(last.coords.longitude)} ±${Math.round(last.coords.accuracy ?? -1)}m, ${age} old`;
  } catch (e) {
    return `last fix unavailable (${String(e)})`;
  }
}

/**
 * Snapshots everything a detection depends on and logs what changed. Safe in
 * a headless context; never throws.
 */
export async function runHealthCheck(trigger: string): Promise<void> {
  try {
    const now = Date.now();
    const [monitoringEnabled, status, notifications, previous, lastAliveLine] = await Promise.all([
      loadMonitoringEnabled(),
      geofencing.getStatus().catch(() => null),
      getNotificationPermissionStatus().catch(() => 'unknown' as const),
      readJson<HealthSnapshot>(SNAPSHOT_KEY),
      AsyncStorage.getItem(LAST_ALIVE_LINE_KEY).catch(() => null),
    ]);

    const snapshot: HealthSnapshot = {
      monitoringEnabled,
      geofencesRegistered: status?.geofencingRegistered ?? false,
      fineLocationRunning: status?.locationUpdatesRunning ?? false,
      foregroundLocation: status?.foregroundLocationStatus ?? 'unknown',
      backgroundLocation: status?.backgroundLocationStatus ?? 'unknown',
      locationServicesEnabled: status?.locationServicesEnabled ?? false,
      notifications,
    };

    const changes = diffSnapshots(previous, snapshot);
    const problems = snapshotProblems(snapshot);
    const aliveLineDue = !lastAliveLine || now - Date.parse(lastAliveLine) >= ALIVE_LINE_EVERY_MS;

    if (changes.length) {
      await logEvent(problems.length ? 'warn' : 'info', 'heartbeat', `Status changed (${trigger}): ${changes.join('; ')}`);
    }

    if (changes.length || aliveLineDue || !previous) {
      const verdict = !monitoringEnabled
        ? 'monitoring is OFF'
        : problems.length
          ? `NOT READY — ${problems.join('; ')}`
          : 'ready';
      await logEvent(problems.length ? 'warn' : 'info', 'heartbeat', `Alive (${trigger}): ${verdict}; ${await describeLastFix()}`);
      await write(LAST_ALIVE_LINE_KEY, new Date(now).toISOString());
    }

    // The fix, not just the diagnosis. Only attempted when it can work:
    // registering geofences needs background location and location services.
    if (
      monitoringEnabled &&
      !snapshot.geofencesRegistered &&
      snapshot.backgroundLocation === 'granted' &&
      snapshot.locationServicesEnabled
    ) {
      try {
        if (await geofencing.ensureRegistered()) {
          snapshot.geofencesRegistered = true;
          await logEvent('warn', 'heartbeat', 'Geofences had been dropped by the OS — re-registered them');
        }
      } catch (e) {
        await logEvent('error', 'heartbeat', 'Geofences are missing and re-registering them failed — CROSSINGS WILL BE MISSED', String(e));
      }
    }

    await write(SNAPSHOT_KEY, JSON.stringify(snapshot));
    await write(LAST_CHECK_KEY, new Date(now).toISOString());
  } catch (e) {
    await logEvent('error', 'heartbeat', `Health check failed (${trigger})`, String(e));
  }
  // Last, so this check's own lines go out with it. A no-op unless the
  // tester has opted in (upload.ts).
  await uploadPendingLogs();
}

/**
 * Logs that a new JS context has started and how long nothing at all had
 * run before it. Called once at module load, so it covers app launches and
 * headless relaunches (a geofence event, a heartbeat) alike.
 */
async function noteProcessStart(): Promise<void> {
  try {
    const [previousAt, monitoringEnabled] = await Promise.all([getPreviousSessionLastEntryAt(), loadMonitoringEnabled()]);
    if (!previousAt) {
      await logEvent('info', 'process', 'App process started (no earlier activity in the log)');
      return;
    }
    const gap = Date.now() - Date.parse(previousAt);
    const suspicious = monitoringEnabled && gap > SUSPICIOUS_GAP_MS;
    await logEvent(
      suspicious ? 'warn' : 'info',
      'process',
      suspicious
        ? `App process started after ${describeDuration(gap)} with NOTHING running (last activity ${previousAt}). Any crossing in that window was never delivered to the app — likely killed by battery optimisation, a reboot, or background checks being restricted.`
        : `App process started (last activity ${describeDuration(gap)} ago)`
    );
  } catch {
    // never throws
  }
}

/** Starts the periodic check. Idempotent; called whenever monitoring is (re)armed. */
export async function registerHeartbeat(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const availability = await BackgroundTask.getStatusAsync();
    if (availability !== BackgroundTask.BackgroundTaskStatus.Available) {
      await logEvent('warn', 'heartbeat', `Background checks are restricted on this device (status ${availability}) — no periodic health checks`);
      return;
    }
    if (!(await TaskManager.isTaskRegisteredAsync(HEARTBEAT_TASK_NAME))) {
      await BackgroundTask.registerTaskAsync(HEARTBEAT_TASK_NAME, { minimumInterval: INTERVAL_MINUTES });
      await logEvent('info', 'heartbeat', `Scheduled background health check every ~${INTERVAL_MINUTES} min`);
    }
    await runHealthCheck('monitoring armed');
  } catch (e) {
    await logEvent('error', 'heartbeat', 'Could not schedule the background health check', String(e));
  }
}

/** Stops the periodic check when the user switches monitoring off. */
export async function unregisterHeartbeat(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (await TaskManager.isTaskRegisteredAsync(HEARTBEAT_TASK_NAME)) {
      await BackgroundTask.unregisterTaskAsync(HEARTBEAT_TASK_NAME);
      await logEvent('info', 'heartbeat', 'Background health check stopped (monitoring switched off)');
    }
  } catch (e) {
    await logEvent('warn', 'heartbeat', 'Could not stop the background health check', String(e));
  }
}

/** For the Diagnostics screen. */
export async function getHeartbeatInfo(): Promise<{ scheduled: boolean; lastCheckAt: string | null }> {
  if (Platform.OS === 'web') return { scheduled: false, lastCheckAt: null };
  const [scheduled, lastCheckAt] = await Promise.all([
    TaskManager.isTaskRegisteredAsync(HEARTBEAT_TASK_NAME).catch(() => false),
    AsyncStorage.getItem(LAST_CHECK_KEY).catch(() => null),
  ]);
  return { scheduled, lastCheckAt };
}

// Module scope, like the geofence tasks: the OS can relaunch the app purely
// to run this, and index.ts imports this file before anything else.
if (Platform.OS !== 'web') {
  TaskManager.defineTask(HEARTBEAT_TASK_NAME, async () => {
    await runHealthCheck('background check');
    return BackgroundTask.BackgroundTaskResult.Success;
  });
  noteProcessStart();
}
