/**
 * Pure helpers for the heartbeat (src/diagnostics/heartbeat.ts). Kept free of
 * any React Native import so `node --test` can exercise them directly.
 */

/** Everything that has to be true for a crossing to be detected with the app closed. */
export interface HealthSnapshot {
  monitoringEnabled: boolean;
  geofencesRegistered: boolean;
  fineLocationRunning: boolean;
  foregroundLocation: string;
  backgroundLocation: string;
  locationServicesEnabled: boolean;
  notifications: string;
}

/**
 * Reasons this snapshot means a crossing would be missed right now. Empty
 * when healthy. Only meaningful while monitoring is meant to be on — a user
 * who switched it off isn't "blocked".
 */
export function snapshotProblems(s: HealthSnapshot): string[] {
  if (!s.monitoringEnabled) return [];
  const problems: string[] = [];
  if (!s.geofencesRegistered) problems.push('geofences NOT registered with the OS');
  if (s.backgroundLocation !== 'granted') problems.push(`background location "${s.backgroundLocation}"`);
  if (!s.locationServicesEnabled) problems.push('device location switched OFF');
  if (s.notifications !== 'granted' && s.notifications !== 'unsupported') {
    problems.push(`notifications "${s.notifications}"`);
  }
  return problems;
}

/** "field: before -> after" for every field that changed; empty when identical or there's no previous snapshot. */
export function diffSnapshots(prev: HealthSnapshot | null, next: HealthSnapshot): string[] {
  if (!prev) return [];
  return (Object.keys(next) as (keyof HealthSnapshot)[])
    .filter((key) => prev[key] !== next[key])
    .map((key) => `${key}: ${String(prev[key])} -> ${String(next[key])}`);
}

/** Compact human duration for log lines: "45s", "12m", "3h 20m", "2d 4h". */
export function describeDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}

/**
 * ~1km precision. Enough to tell whether the phone's last fix was anywhere
 * near a crossing, without the shared log pinpointing someone's home.
 */
export function roundCoord(value: number): string {
  return value.toFixed(2);
}

/**
 * Rounds every coordinate-looking number (3+ decimal places) in a log
 * message to 2dp before it leaves the device. The on-device log keeps full
 * precision for tuning geofence radii; what reaches the shared sheet only
 * says roughly where the phone was. Accuracy, durations and radii in the log
 * are whole numbers, so they pass through untouched.
 */
export function redactCoordinates(message: string): string {
  return message.replace(/-?\d{1,3}\.\d{3,}/g, (n) => Number(n).toFixed(2));
}

export interface UploadCursor {
  /** Timestamp of the newest entry already sent. */
  at: string;
  /** How many entries carrying exactly that timestamp were sent — bursts share a millisecond. */
  countAtSameTime: number;
}

/**
 * The entries not yet sent, oldest first, given entries sorted oldest first.
 * Timestamp-based rather than index-based because the log is trimmed from
 * the front and can be cleared, which would shift every index.
 */
export function entriesAfterCursor<T extends { at: string }>(entries: T[], cursor: UploadCursor | null): T[] {
  if (!cursor) return entries;
  let skipSameTime = cursor.countAtSameTime;
  return entries.filter((e) => {
    if (e.at > cursor.at) return true;
    if (e.at === cursor.at && skipSameTime-- <= 0) return true;
    return false;
  });
}

/** Where the cursor ends up once `sent` (oldest first) has been accepted. */
export function advanceCursor<T extends { at: string }>(cursor: UploadCursor | null, sent: T[]): UploadCursor | null {
  if (sent.length === 0) return cursor;
  const lastAt = sent[sent.length - 1].at;
  const sameInBatch = sent.filter((e) => e.at === lastAt).length;
  const carried = cursor && cursor.at === lastAt ? cursor.countAtSameTime : 0;
  return { at: lastAt, countAtSameTime: carried + sameInBatch };
}
