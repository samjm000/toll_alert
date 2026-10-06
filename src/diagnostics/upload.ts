import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { readLog } from './log';
import { advanceCursor, entriesAfterCursor, redactCoordinates, UploadCursor } from './snapshot';

/**
 * Opt-in automatic upload of the diagnostic log, for testers.
 *
 * The log itself (log.ts) is unchanged and still on-device first; this only
 * sends new entries on to a Google Sheet the team owns (receiver:
 * scripts/diagnostics-sheet.gs), so a tester no longer has to remember to
 * hit Share after a drive that didn't alert.
 *
 * - The default comes from app.json `extra.diagnostics.defaultEnabled` — ON
 *   while the app is only with testers, and must be turned OFF (or put
 *   behind a consent screen) before a public release: Play's user-data
 *   policy doesn't allow sending location off the device without prominent
 *   disclosure and consent. Either way the tester can switch it off in
 *   Settings → Diagnostics, where they also enter their name so rows can be
 *   told apart.
 * - Coordinates are rounded to ~1km before leaving the device
 *   (`redactCoordinates`).
 * - Runs from the heartbeat (every ~15 min in the background) and on demand
 *   from the Diagnostics screen. A failed upload just leaves the cursor
 *   where it was, so the next attempt resends.
 * - Upload failures are NOT written to the log: offline for a day would
 *   otherwise add ~100 "upload failed" lines that then get uploaded. The
 *   last error is kept separately and shown on the Diagnostics screen.
 */

const SETTINGS_KEY = 'tollalert.diagnosticsUpload.settings.v1';
const CURSOR_KEY = 'tollalert.diagnosticsUpload.cursor.v1';
const STATUS_KEY = 'tollalert.diagnosticsUpload.status.v1';

/** Per request. Matches the receiver's own cap. */
const BATCH_SIZE = 500;
const TIMEOUT_MS = 20_000;

export interface UploadSettings {
  /** Effective value: the user's own choice if they made one, otherwise the build's default. */
  enabled: boolean;
  /**
   * Whether `enabled` came from the user touching the switch. Kept separate
   * so a stored value that was only ever the old default (a build where the
   * default was off) doesn't override a newer build's default.
   */
  userChose?: boolean;
  testerName: string;
  /** Random, generated once per install. Distinguishes two phones with the same tester name. */
  deviceId: string;
}

export interface UploadStatus {
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
}

interface UploadConfig {
  uploadUrl?: string;
  uploadToken?: string;
  defaultEnabled?: boolean;
}

function config(): UploadConfig {
  return ((Constants.expoConfig?.extra as { diagnostics?: UploadConfig } | undefined)?.diagnostics ?? {}) as UploadConfig;
}

/** False in a build made before the sheet URL was put in app.json — the UI says so instead of offering a dead switch. */
export function isUploadConfigured(): boolean {
  const { uploadUrl, uploadToken } = config();
  return Platform.OS !== 'web' && !!uploadUrl && !!uploadToken;
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // diagnostics must never break the app
  }
}

function newDeviceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadUploadSettings(): Promise<UploadSettings> {
  const stored = await readJson<UploadSettings>(SETTINGS_KEY);
  const settings: UploadSettings = {
    testerName: stored?.testerName ?? '',
    deviceId: stored?.deviceId || newDeviceId(),
    userChose: stored?.userChose ?? false,
    enabled: false,
  };
  settings.enabled = settings.userChose ? !!stored?.enabled : config().defaultEnabled === true;
  if (!stored?.deviceId) await writeJson(SETTINGS_KEY, settings);
  return settings;
}

/** Saves the tester's name. */
export async function saveTesterName(testerName: string): Promise<UploadSettings> {
  const next = { ...(await loadUploadSettings()), testerName };
  await writeJson(SETTINGS_KEY, next);
  return next;
}

/** The switch: records an explicit choice that from then on wins over the build default. */
export async function setUploadEnabled(enabled: boolean): Promise<UploadSettings> {
  const next = { ...(await loadUploadSettings()), enabled, userChose: true };
  await writeJson(SETTINGS_KEY, next);
  return next;
}

export async function loadUploadStatus(): Promise<UploadStatus> {
  return (await readJson<UploadStatus>(STATUS_KEY)) ?? { lastSuccessAt: null, lastAttemptAt: null, lastError: null };
}

let inFlight: Promise<UploadStatus> | null = null;

/**
 * Sends every entry not yet uploaded. No-op (resolving the current status)
 * when switched off or not configured. Never throws. Concurrent callers share
 * one run, so the heartbeat and a "Send now" tap can't double-post.
 */
export function uploadPendingLogs(): Promise<UploadStatus> {
  if (!inFlight) {
    inFlight = runUpload().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runUpload(): Promise<UploadStatus> {
  const status = await loadUploadStatus();
  try {
    const settings = await loadUploadSettings();
    if (!settings.enabled || !isUploadConfigured()) return status;
    const { uploadUrl, uploadToken } = config();

    let cursor = await readJson<UploadCursor>(CURSOR_KEY);
    const pending = entriesAfterCursor(await readLog(), cursor);
    status.lastAttemptAt = new Date().toISOString();

    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      await post(uploadUrl!, {
        token: uploadToken,
        tester: settings.testerName.trim() || '(no name)',
        deviceId: settings.deviceId,
        appVersion: `${Constants.expoConfig?.version ?? '?'}`,
        platform: `${Platform.OS} ${Platform.Version}`,
        entries: batch.map((e) => ({ ...e, message: redactCoordinates(e.message) })),
      });
      cursor = advanceCursor(cursor, batch);
      await writeJson(CURSOR_KEY, cursor);
    }

    status.lastSuccessAt = status.lastAttemptAt;
    status.lastError = null;
  } catch (e) {
    status.lastError = e instanceof Error ? e.message : String(e);
  }
  await writeJson(STATUS_KEY, status);
  return status;
}

async function post(url: string, body: unknown): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // text/plain keeps Apps Script from needing a CORS preflight on web and
    // is what its doPost reads as postData.contents either way.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reply = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!reply?.ok) throw new Error(reply?.error ?? 'receiver did not confirm');
  } finally {
    clearTimeout(timer);
  }
}
