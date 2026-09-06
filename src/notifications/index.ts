import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Crossing } from '../types/crossing';

/**
 * Local push notifications for "you've crossed — pay by [time]" alerts.
 *
 * `presentCrossingNotification` fires from two callers: the "simulate a
 * crossing" testing button on Home (via AppState.simulateCrossing) and the
 * real background geofencing engine's `onCrossingDetected` callback (see
 * src/geofencing/engine.ts and AppState.recordCrossing) — same function,
 * same notification, so what you see from the demo button is exactly what a
 * real detection produces. Guarded off on web (Platform.OS === 'web') since
 * this app's web export is a UI preview only, and expo-notifications doesn't
 * support local notifications there.
 */

export const PAID_ACTION_ID = 'mark-paid';
const CROSSING_CATEGORY_ID = 'toll-crossing';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Requests permission to show notifications. Returns false on web (unsupported) or if denied. */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

/** Registers the "Mark as paid" notification action. Call once at app startup. */
export async function registerCrossingNotificationCategory(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync(CROSSING_CATEGORY_ID, [
    {
      identifier: PAID_ACTION_ID,
      buttonTitle: 'Mark as paid',
      options: { opensAppToForeground: false },
    },
  ]);
}

/** Fires the "you've crossed" alert immediately, with a "Mark as paid" action. */
export async function presentCrossingNotification(crossing: Crossing, eventId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${crossing.shortName} detected`,
      body: `Pay ${crossing.price.label} by ${crossing.scheme.paymentDeadlineLabel.toLowerCase()} — tap to pay, or mark as paid once you have.`,
      categoryIdentifier: CROSSING_CATEGORY_ID,
      data: { crossingId: crossing.id, eventId },
      sound: true,
    },
    trigger: null,
  });
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
