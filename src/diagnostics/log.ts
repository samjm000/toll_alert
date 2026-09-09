import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A persistent, on-device diagnostic log.
 *
 * WHY THIS EXISTS: every failure path in the geofencing/notification stack
 * used to be silent. `TaskManager.defineTask`'s callbacks started with
 * `if (error || !data) return;`, `presentCrossingNotification` had a bare
 * `if (!granted) return;`, and every call site swallowed rejections with
 * `.catch(() => {})`. When a real tester drove over Dartford and got
 * nothing, there was no way — on the device or off it — to tell which of a
 * dozen possible causes it was.
 *
 * NOT TELEMETRY. src/config/crossings.ts states the constraint this has to
 * respect: testers are non-technical and nothing gets uploaded anywhere.
 * So this writes to AsyncStorage only, never leaves the device on its own,
 * and is surfaced through Settings → Diagnostics where the tester can read
 * it or hit Share to send it back by whatever channel they already use.
 * `console.log` mirroring means `adb logcat` also picks it up when a
 * device is to hand.
 *
 * Safe to call from a headless background task: it never throws, never
 * rejects, and doesn't touch React state.
 */

const LOG_KEY = 'tollalert.diagnosticLog.v1';

/**
 * Deliberately bounded. A device left running for weeks would otherwise
 * grow this without limit, and the oldest entries are the least useful —
 * the tester question is always "what happened on today's drive".
 */
const MAX_ENTRIES = 400;

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  at: string;
  level: LogLevel;
  tag: string;
  message: string;
}

/**
 * Serialises reads/writes. Geofence transitions can land in bursts (several
 * regions at once) and a read-modify-write race would silently drop
 * entries — exactly the kind of hole this module exists to close.
 */
let writeQueue: Promise<void> = Promise.resolve();

async function readRaw(): Promise<LogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LogEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Appends one entry. Fire-and-forget by design — callers in background
 * tasks must not have to await logging to do their real work — but the
 * returned promise is awaited by the engine at points where the JS context
 * is about to be torn down, so the entry isn't lost.
 */
export function logEvent(level: LogLevel, tag: string, message: string, data?: unknown): Promise<void> {
  const detail = data === undefined ? '' : ` ${safeStringify(data)}`;
  const entry: LogEntry = {
    at: new Date().toISOString(),
    level,
    tag,
    message: `${message}${detail}`,
  };

  // Mirrored so `adb logcat -s ReactNativeJS` shows the same trace when a
  // device is plugged in, without needing the in-app viewer.
  // eslint-disable-next-line no-console
  console.log(`[TollAlert:${tag}] ${entry.message}`);

  writeQueue = writeQueue
    .then(async () => {
      const existing = await readRaw();
      existing.push(entry);
      const trimmed = existing.length > MAX_ENTRIES ? existing.slice(existing.length - MAX_ENTRIES) : existing;
      await AsyncStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
    })
    .catch(() => {
      // A diagnostic log that can break the thing it's diagnosing is worse
      // than no log at all.
    });

  return writeQueue;
}

export async function readLog(): Promise<LogEntry[]> {
  return readRaw();
}

export async function clearLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LOG_KEY);
  } catch {
    // ignore
  }
}

/** Plain-text rendering for the Share sheet — what a tester actually sends back. */
export function formatLog(entries: LogEntry[]): string {
  if (entries.length === 0) return 'Toll Alert diagnostics — no entries recorded.';
  return entries
    .map((e) => `${e.at} ${e.level.toUpperCase().padEnd(5)} ${e.tag.padEnd(12)} ${e.message}`)
    .join('\n');
}

function safeStringify(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return '[unserialisable]';
  }
}
