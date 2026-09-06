import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

/**
 * Android-only. Several OEMs (Xiaomi, Huawei, Samsung, OnePlus among the
 * most aggressive) kill background location for apps that aren't explicitly
 * exempted from battery optimisation, regardless of what permissions were
 * granted — the geofencing engine just silently stops firing after a while,
 * with no error the app can detect. This opens Android's system "ignore
 * battery optimizations" dialog for this app specifically so the user can
 * grant the exemption; there's no way to do this automatically, and no API
 * to check whether it's already granted (expo-intent-launcher only launches
 * intents, it doesn't query PowerManager state), so this is presented as a
 * one-off action button, not a toggle with a real on/off status.
 *
 * Requires `android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` in
 * app.json (added alongside this) — without it the intent can silently
 * no-op on some OEM skins instead of showing the dialog.
 */
export async function requestIgnoreBatteryOptimizations(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const packageName = Constants.expoConfig?.android?.package;
  if (!packageName) return;
  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, {
    data: `package:${packageName}`,
  });
}
