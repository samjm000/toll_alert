import AsyncStorage from '@react-native-async-storage/async-storage';
import { CrossingEvent } from '../types/crossing';
import { logEvent } from '../diagnostics/log';

/**
 * Storage that has to be reachable from a headless background task, not
 * just from React.
 *
 * THE BUG THIS FIXES: all of this state used to live only in
 * `useState`/module-level variables. Android routinely kills this app's
 * process while the user drives, then relaunches it *headlessly* to deliver
 * a geofence transition — a fresh JS context where no React tree has ever
 * mounted and `start()` has never been called. Anything held only in memory
 * is gone by then, which is why a real crossing produced nothing at all:
 * the task fired, found an empty crossing list, and returned.
 *
 * Everything here is therefore AsyncStorage-backed and readable without a
 * mounted component.
 */

const MONITORING_KEY = 'tollalert.backgroundMonitoring.v1';
const EVENTS_KEY = 'tollalert.crossingEvents.v1';
const INSIDE_KEY = 'tollalert.insideRegion.v1';

/** Keeps the stored history bounded; the UI only ever shows recent crossings. */
const MAX_EVENTS = 100;

/* ------------------------------------------------------------------ *
 * Background-monitoring toggle
 * ------------------------------------------------------------------ */

/**
 * Whether the user has turned background monitoring on. Previously this was
 * `useState(false)` with no persistence and nothing that re-ran
 * `geofencing.start()` at launch, so the toggle silently read "Off" again
 * after any app restart even though the OS-level geofences were still
 * registered — and the engine had no crossing list to match them against.
 */
export async function loadMonitoringEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(MONITORING_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function saveMonitoringEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(MONITORING_KEY, enabled ? 'true' : 'false');
  } catch {
    logEvent('warn', 'persistence', 'Could not persist the monitoring toggle');
  }
}

/* ------------------------------------------------------------------ *
 * Crossing events
 * ------------------------------------------------------------------ */

export async function loadCrossingEvents(): Promise<CrossingEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CrossingEvent[]) : [];
  } catch {
    return [];
  }
}

async function saveCrossingEvents(events: CrossingEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    logEvent('warn', 'persistence', 'Could not persist crossing events');
  }
}

/**
 * Appends a detection and returns the new full list. Detections can be
 * recorded from a headless task with no React tree mounted, so the store —
 * not component state — is the source of truth; the UI reads it back on
 * next launch, which is why a crossing detected while the app was closed now
 * still shows up in "Needs your attention".
 */
export async function appendCrossingEvent(event: CrossingEvent): Promise<CrossingEvent[]> {
  const existing = await loadCrossingEvents();
  const next = [event, ...existing.filter((e) => e.id !== event.id)];
  await saveCrossingEvents(next);
  return next.slice(0, MAX_EVENTS);
}

export async function markCrossingEventPaid(eventId: string): Promise<CrossingEvent[]> {
  const existing = await loadCrossingEvents();
  const next = existing.map((e) =>
    e.id === eventId ? { ...e, status: 'paid' as const, paidAt: new Date().toISOString() } : e
  );
  await saveCrossingEvents(next);
  return next;
}

/* ------------------------------------------------------------------ *
 * Inside/outside region memory (detection dedup)
 * ------------------------------------------------------------------ */

/**
 * The engine's outside->inside transition memory. This has to survive process
 * death too: both Android's Geofencing API and CoreLocation dispatch an
 * immediate ENTER for any region the device is already inside when
 * monitoring (re)starts, so without persisted memory every relaunch near a
 * crossing would re-notify.
 */
export async function loadInsideRegions(): Promise<Map<string, boolean>> {
  try {
    const raw = await AsyncStorage.getItem(INSIDE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return new Map();
    return new Map(Object.entries(parsed as Record<string, boolean>));
  } catch {
    return new Map();
  }
}

export async function saveInsideRegions(map: Map<string, boolean>): Promise<void> {
  try {
    await AsyncStorage.setItem(INSIDE_KEY, JSON.stringify(Object.fromEntries(map)));
  } catch {
    logEvent('warn', 'persistence', 'Could not persist region inside/outside state');
  }
}

export async function clearInsideRegions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INSIDE_KEY);
  } catch {
    // ignore
  }
}
