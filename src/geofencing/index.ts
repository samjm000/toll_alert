import { Platform } from 'react-native';
import { androidGeofencingEngine } from './android';
import { iosGeofencingEngine } from './ios';
import { GeofencingEngine } from './types';

export * from './types';

/**
 * Platform-abstracted entry point — screens/state should import from here,
 * not from `ios.ts` / `android.ts` directly. Both platform engines are
 * currently stubs; see the doc comments in each file for the implementation
 * plan and README.md in this folder for the overall status.
 */
export const geofencing: GeofencingEngine =
  Platform.OS === 'ios' ? iosGeofencingEngine : androidGeofencingEngine;
