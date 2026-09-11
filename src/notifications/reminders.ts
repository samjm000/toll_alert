import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Crossing, CrossingEvent } from '../types/crossing';
import { loadCrossingEvents, loadReminderTimes } from '../state/persistence';
import { logEvent } from '../diagnostics/log';
import { ANDROID_CHANNEL_ID, ensureNotificationChannel, getNotificationPermissionStatus } from './index';

/**
 * Repeating "you still haven't paid" reminders.
 *
 * Client spec (2026-09-09, via Rob): warn at 23:45, 04:00, 08:00, 12:00,
 * 16:00 and 20:00, let the user set their own times instead, and keep
 * warning **continuously until they press paid**.
 *
 * ---------------------------------------------------------------------------
 * WHY REPEATING DAILY TRIGGERS, AND WHY BATCHED
 *
 * "Continuously" rules out scheduling a finite list of dated notifications:
 * that needs a rolling window and a top-up whenever the app happens to open,
 * and it stops dead if the user never opens it — which is precisely the user
 * this feature exists for. `SchedulableTriggerInputTypes.DAILY` repeats by
 * itself, indefinitely, with no top-up, so the nagging genuinely continues
 * until something cancels it.
 *
 * One notification per TIME SLOT, not per unpaid crossing. Per-crossing would
 * multiply: three unpaid crossings at six times a day is eighteen
 * notifications daily, which trains people to swipe without reading — and on
 * iOS it would collide with the 64-pending-notification cap. Batched, the
 * total is always exactly the number of configured times.
 *
 * The cost of batching is that a repeating notification's text is fixed when
 * it is scheduled, so it would go stale as crossings are paid off. That is
 * handled by rescheduling — `syncReminders` runs on every change to the
 * pending set, so the text is rewritten whenever it could have become wrong.
 * ---------------------------------------------------------------------------
 */

/** Marks our reminders in `data`, so cancelling them never touches a crossing alert. */
const REMINDER_KIND = 'unpaid-reminder';

/** Cancels only reminders, leaving anything else scheduled alone. */
async function cancelExistingReminders(): Promise<number> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled.filter((n) => n.content.data?.kind === REMINDER_KIND);
    await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    return ours.length;
  } catch (e) {
    await logEvent('error', 'reminders', 'Could not cancel existing reminders', String(e));
    return 0;
  }
}

function buildContent(pending: CrossingEvent[], crossings: Crossing[]): { title: string; body: string } {
  const names = pending
    .map((event) => crossings.find((c) => c.id === event.crossingId)?.shortName)
    .filter((name): name is string => Boolean(name));

  // De-duplicated: two Dartford crossings should read "Dartford", not
  // "Dartford and Dartford". The count still reflects both.
  const unique = [...new Set(names)];

  if (pending.length === 1 && unique.length === 1) {
    const crossing = crossings.find((c) => c.id === pending[0].crossingId);
    return {
      title: `${unique[0]} still unpaid`,
      body: crossing
        ? `Pay ${crossing.price.label} by ${crossing.scheme.paymentDeadlineLabel.toLowerCase()}. Open Toll Alert and tap "Mark as paid" once you have.`
        : 'Open Toll Alert to pay, then tap "Mark as paid".',
    };
  }

  const list = unique.length <= 2 ? unique.join(' and ') : `${unique.slice(0, -1).join(', ')} and ${unique[unique.length - 1]}`;
  return {
    title: `${pending.length} unpaid crossings`,
    body: `${list} still need paying. Open Toll Alert and tap "Mark as paid" for each one you've dealt with.`,
  };
}

/**
 * Brings scheduled reminders in line with what's actually unpaid.
 *
 * Safe to call from a headless background task — it reads storage rather than
 * React state, and never throws. Call it after ANY change to the pending set
 * (a new detection, a "Mark as paid") and after the reminder times change.
 *
 * With nothing pending it cancels everything and schedules nothing, which is
 * what stops the nagging when the user presses paid.
 */
export async function syncReminders(crossings: Crossing[]): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const cancelled = await cancelExistingReminders();

    const events = await loadCrossingEvents();
    const pending = events.filter((e) => e.status === 'pending');

    if (pending.length === 0) {
      await logEvent('info', 'reminders', `Nothing unpaid — cancelled ${cancelled} reminder(s), scheduled none`);
      return;
    }

    // Checked, never requested: this runs in contexts with no UI. Scheduling
    // against a denied permission would silently produce nothing, so say so.
    const permission = await getNotificationPermissionStatus();
    if (permission !== 'granted') {
      await logEvent(
        'warn',
        'reminders',
        `${pending.length} crossing(s) unpaid but notification permission is "${permission}" — no reminders scheduled`
      );
      return;
    }

    await ensureNotificationChannel();

    const times = await loadReminderTimes();
    if (times.length === 0) {
      await logEvent('info', 'reminders', 'Reminder times list is empty — user has turned reminders off');
      return;
    }

    const content = buildContent(pending, crossings);

    for (const time of times) {
      const [hour, minute] = time.split(':').map(Number);
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: content.title,
            body: content.body,
            data: { kind: REMINDER_KIND },
            sound: true,
            ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
            ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
          },
        });
      } catch (e) {
        await logEvent('error', 'reminders', `Could not schedule the ${time} reminder`, String(e));
      }
    }

    await logEvent(
      'info',
      'reminders',
      `${pending.length} unpaid — cancelled ${cancelled}, scheduled ${times.length} daily reminder(s) at ${times.join(', ')}`
    );
  } catch (e) {
    await logEvent('error', 'reminders', 'syncReminders failed', String(e));
  }
}

/** What's currently scheduled, for the Diagnostics screen. */
export async function getScheduledReminderTimes(): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled
      .filter((n) => n.content.data?.kind === REMINDER_KIND)
      .map((n) => {
        const trigger = n.trigger as { hour?: number; minute?: number } | null;
        if (trigger?.hour === undefined || trigger?.minute === undefined) return null;
        return `${String(trigger.hour).padStart(2, '0')}:${String(trigger.minute).padStart(2, '0')}`;
      })
      .filter((t): t is string => t !== null)
      .sort();
  } catch {
    return [];
  }
}
