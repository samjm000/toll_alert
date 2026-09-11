import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Crossing } from '../types/crossing';
import { logEvent } from '../diagnostics/log';

/**
 * Local push notifications for "you've crossed — pay by [time]" alerts.
 *
 * `presentCrossingNotification` fires from two callers: the "simulate a
 * crossing" testing button on Home (via AppState.simulateCrossing) and the
 * real background geofencing engine (see src/geofencing/detection.ts) —
 * same function, same notification, so what you see from the demo button is
 * exactly what a real detection produces. Guarded off on web
 * (Platform.OS === 'web') since this app's web export is a UI preview only,
 * and expo-notifications doesn't support local notifications there.
 */

export const PAID_ACTION_ID = 'mark-paid';
const CROSSING_CATEGORY_ID = 'toll-crossing';

/**
 * Android 8+ shows a notification at the importance of its channel, not the
 * request. Without an explicit high-importance channel the platform default
 * is used, which on several OEM skins (Samsung's One UI among them) posts
 * silently into the shade with no heads-up banner and no sound — a tester
 * driving over a crossing would get "nothing happened" even on a completely
 * successful detection. MAX importance is right here: the whole product is a
 * time-limited payment deadline.
 */
export const ANDROID_CHANNEL_ID = 'crossing-alerts-v2';

/**
 * Channels created by earlier builds, deleted on startup.
 *
 * ANDROID CHANNELS ARE IMMUTABLE ONCE CREATED. After the first
 * `setNotificationChannelAsync`, the OS ignores later changes to sound,
 * importance and vibration for that channel id — the user owns those
 * settings from then on, and only they can change them. So the silent
 * channel shipped by the previous build would have stayed silent forever on
 * any device that already had it, no matter what this file says.
 *
 * Bumping the id sidesteps that: a new id means a genuinely new channel with
 * the corrected settings, and no reinstall is needed. The old ones are
 * deleted so they don't linger as dead entries in the system notification
 * settings screen.
 *
 * If you change sound, importance or vibration again, bump the id again and
 * add the previous one here.
 */
const RETIRED_ANDROID_CHANNEL_IDS = ['crossing-alerts'];

/**
 * Android 13+ (the tester's device is well past this) gates notifications
 * behind the runtime POST_NOTIFICATIONS permission. It must be requested
 * from the foreground, with the app open — a headless geofence task cannot
 * show a permission dialog. `presentCrossingNotification` therefore only
 * *checks*; `ensureNotificationPermission` (called from the Settings toggle)
 * is what actually asks.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let channelReady = false;

/** Idempotent; safe to call from a background task. Exported for src/notifications/reminders.ts. */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelReady) return;
  try {
    for (const retired of RETIRED_ANDROID_CHANNEL_IDS) {
      await Notifications.deleteNotificationChannelAsync(retired).catch(() => {});
    }
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Crossing alerts',
      importance: Notifications.AndroidImportance.MAX,
      // `sound` is DELIBERATELY OMITTED, and must stay that way unless a real
      // audio file is bundled. It used to be `sound: 'default'`, which looks
      // sensible and is wrong: the field takes a custom sound *filename*, not
      // a mode. AndroidXNotificationsChannelManager.createSoundUriFromArguments
      // is explicit about the three cases —
      //   key absent  -> Settings.System.DEFAULT_NOTIFICATION_URI  (what we want)
      //   null        -> no sound at all
      //   any string  -> resolved as a bundled filename
      // — so 'default' sent it hunting for a `default.wav` that does not exist,
      // logged "Custom sound 'default' not found in native app", and left the
      // channel silent. A silent channel on an app whose entire job is a
      // time-limited payment alert is a real failure, not console noise.
      //
      // To use a custom sound later: add the audio file to the repo and list it
      // in app.json's expo-notifications plugin `sounds` array, then name the
      // file here. It needs a native rebuild — the plugin copies it into
      // android/app/src/main/res/raw at prebuild.
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    channelReady = true;
  } catch (e) {
    await logEvent('error', 'notifications', 'Failed to create the Android notification channel', String(e));
  }
}

/** Current permission state without prompting — safe from any context. */
export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return 'granted';
    return existing.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'undetermined';
  }
}

/**
 * Requests notification permission. MUST be called from the foreground, in
 * response to a user action — this is why enabling background monitoring
 * now asks for it up front instead of leaving it until the moment of
 * detection, where the request can only ever silently fail.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureNotificationChannel();
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    await logEvent(
      requested.granted ? 'info' : 'warn',
      'notifications',
      `Notification permission ${requested.granted ? 'granted' : 'NOT granted'}`,
      { status: requested.status, canAskAgain: requested.canAskAgain }
    );
    return requested.granted;
  } catch (e) {
    await logEvent('error', 'notifications', 'Notification permission request threw', String(e));
    return false;
  }
}

/** Backwards-compatible alias for the previous name. */
export const requestNotificationPermissions = ensureNotificationPermission;

/** Registers the "Mark as paid" notification action. Call once at app startup. */
export async function registerCrossingNotificationCategory(): Promise<void> {
  if (Platform.OS === 'web') return;
  await ensureNotificationChannel();
  try {
    await Notifications.setNotificationCategoryAsync(CROSSING_CATEGORY_ID, [
      {
        identifier: PAID_ACTION_ID,
        buttonTitle: 'Mark as paid',
        options: { opensAppToForeground: false },
      },
    ]);
  } catch (e) {
    await logEvent('error', 'notifications', 'Failed to register the notification category', String(e));
  }
}

/**
 * Fires the "you've crossed" alert immediately, with a "Mark as paid"
 * action. Awaited by its callers — a background task that returns before
 * this resolves can have its JS context torn down with the notification
 * never posted.
 */
export async function presentCrossingNotification(crossing: Crossing, eventId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  await ensureNotificationChannel();

  // Checked, never requested: this runs in a headless task on a real
  // detection, where a permission dialog cannot be shown. If it's not
  // already granted the alert is lost, so say so loudly in the log rather
  // than returning silently the way this used to.
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') {
    await logEvent(
      'error',
      'notifications',
      `DETECTION LOST: ${crossing.shortName} was detected but notification permission is "${status}" — nothing was shown to the user`
    );
    return false;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${crossing.shortName} detected`,
        body: `Pay ${crossing.price.label} by ${crossing.scheme.paymentDeadlineLabel.toLowerCase()} — tap to pay, or mark as paid once you have.`,
        categoryIdentifier: CROSSING_CATEGORY_ID,
        data: { crossingId: crossing.id, eventId },
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
      trigger: null,
    });
    await logEvent('info', 'notifications', `Posted "${crossing.shortName} detected"`, { eventId });
    return true;
  } catch (e) {
    await logEvent('error', 'notifications', `scheduleNotificationAsync threw for ${crossing.shortName}`, String(e));
    return false;
  }
}

/** Listens for the "Mark as paid" notification action and calls onPaid(eventId). Returns an unsubscribe handle. */
export function addPaidActionListener(onPaid: (eventId: string) => void): { remove: () => void } {
  if (Platform.OS === 'web') return { remove: () => {} };
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const eventId = response.notification.request.content.data?.eventId as string | undefined;
    if (response.actionIdentifier === PAID_ACTION_ID && eventId) {
      onPaid(eventId);
    }
  });
  return { remove: () => subscription.remove() };
}
