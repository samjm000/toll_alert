import { Crossing } from '../types/crossing';

export interface CrossingDetection {
  crossing: Crossing;
  latitude: number;
  longitude: number;
  timestamp: string;
}

/**
 * Returns a promise the engine awaits. It used to be `void`-returning and
 * called fire-and-forget, which meant a background task could return — and
 * have its JS context torn down by the OS — before the notification it
 * kicked off had actually been posted.
 */
export type CrossingDetectedHandler = (detection: CrossingDetection) => void | Promise<void>;

/**
 * What the OS believes is running, independent of what the UI's toggle
 * says. The two disagreeing is the signature of a silent failure, so this is
 * surfaced verbatim in Settings → Diagnostics.
 */
export interface EngineStatus {
  /** True if the OS is actually monitoring this app's geofence regions right now. */
  geofencingRegistered: boolean;
  /** True while the fine-grained location task is running (only expected inside a zone wake circle). */
  locationUpdatesRunning: boolean;
  /** How many crossings the current JS context has loaded. Zero here with geofences registered is the cold-start bug. */
  loadedCrossings: number;
  foregroundLocationStatus: string;
  /** Must be "granted" ("Allow all the time") for any of this to work when the app is closed. */
  backgroundLocationStatus: string;
  /** Device-wide location toggle. Off here means nothing can ever fire, whatever the app does. */
  locationServicesEnabled: boolean;
}

/**
 * Platform-abstracted background geofencing engine. `src/geofencing/index.ts`
 * picks the iOS or Android implementation at runtime; screens and state
 * should only ever import from `src/geofencing`, never `ios`/`android`
 * directly, so the platform split stays invisible to the rest of the app.
 */
export interface GeofencingEngine {
  /** Requests foreground + background ("Always" / "Allow all the time") location permission. */
  requestPermissions(): Promise<boolean>;
  /** Starts background monitoring for the given crossings. Safe to call again to replace the active set. */
  start(crossings: Crossing[], onCrossingDetected: CrossingDetectedHandler): Promise<void>;
  /** Stops all background monitoring and releases any registered regions/tasks. */
  stop(): Promise<void>;
  /** Reads back what the OS actually has registered — for the Diagnostics screen. */
  getStatus(): Promise<EngineStatus>;
}
