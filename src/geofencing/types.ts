import { Crossing } from '../types/crossing';

export interface CrossingDetection {
  crossing: Crossing;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export type CrossingDetectedHandler = (detection: CrossingDetection) => void;

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
}
