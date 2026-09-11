import { Crossing, CrossingEvent } from '../types/crossing';
import { appendCrossingEvent, loadCrossingEvents } from '../state/persistence';
import { presentCrossingNotification } from '../notifications';
import { syncReminders } from '../notifications/reminders';
import { MOCK_CROSSINGS_CONFIG } from '../config/crossings';
import { hasBeenChargedToday, isChargeableAt } from '../config/chargeableHours';
import { logEvent } from '../diagnostics/log';

/**
 * The single "a crossing was detected" pipeline, shared by every caller.
 *
 * Both the React path (AppState.recordCrossing, used by the Home screen's
 * "Simulate crossing" button) and the headless background path (the
 * geofencing engine's fallback handler, used when the OS relaunched the app
 * purely to deliver a transition) funnel through here, so a real detection
 * and a simulated one do exactly the same things in exactly the same order.
 *
 * It must work with no React tree mounted: it persists first, then notifies,
 * and returns the created event so a caller that *does* have state can
 * reflect it immediately.
 */
export async function recordDetection(
  crossing: Crossing,
  source: 'geofence' | 'simulated'
): Promise<CrossingEvent | null> {
  // Three crossings are free 22:00-06:00, so a night crossing owes nothing:
  // no pending event, and therefore no "Needs your attention" entry and no
  // repeating reminders for a charge that does not exist. Waking a
  // night-shift driver six times a day to pay £3.50 they never owed is the
  // fastest way to teach someone to ignore the app.
  //
  // It is still ANNOUNCED, though, which is the deliberate part. These
  // charging hours came from published third parties rather than the
  // operators, and suppressing silently trades a notification the driver can
  // ignore for a £70+ PCN if the hours are wrong. So the alert goes out
  // saying there is nothing to pay, quoting the window that made that
  // decision — the driver can see the reasoning and challenge it.
  //
  // Simulated detections bypass the check entirely: the Home screen's
  // "Simulate crossing" button is a demo tool, and having it report "nothing
  // to pay" at 3am would look like a broken button.
  const now = new Date();

  if (source === 'geofence' && !isChargeableAt(crossing.chargeableHours, now)) {
    await logEvent(
      'info',
      'detection',
      `${crossing.shortName} entered outside charging hours — announced as free, no charge recorded`,
      { chargeableHours: crossing.chargeableHours }
    );
    await presentCrossingNotification(crossing, `${crossing.id}-${now.getTime()}-free`, false);
    return null;
  }

  // A daily-charged scheme (the ULEZ) bills once however many times you
  // enter, so a second entry on the same day needs no second alert — and
  // must not start a second set of repeating reminders for one £12.50.
  // Checked regardless of whether the earlier one was marked paid: the charge
  // is the same either way.
  if (source === 'geofence' && crossing.scheme.chargePeriod === 'daily') {
    const previous = (await loadCrossingEvents())
      .filter((e) => e.crossingId === crossing.id)
      .map((e) => e.detectedAt);

    if (hasBeenChargedToday(previous, now)) {
      await logEvent(
        'info',
        'detection',
        `${crossing.shortName} entered again today — daily charge already recorded, no second alert`
      );
      return null;
    }
  }

  const event: CrossingEvent = {
    id: `${crossing.id}-${now.getTime()}`,
    crossingId: crossing.id,
    detectedAt: now.toISOString(),
    status: 'pending',
  };

  await logEvent('info', 'detection', `${crossing.shortName} detected (${source})`, { eventId: event.id });

  // Persisted before the notification is posted: if the notification fails
  // (permission revoked, channel blocked), the crossing still shows up in
  // the app's "Needs your attention" list rather than vanishing entirely.
  await appendCrossingEvent(event);
  await presentCrossingNotification(crossing, event.id);

  // Re-armed here, not just from the UI: a real detection happens in a
  // headless task, so this is the only place that runs for a crossing
  // recorded while the app was closed. Rescheduling also rewrites the
  // reminder text, which would otherwise still describe the previous set of
  // unpaid crossings.
  await syncReminders(MOCK_CROSSINGS_CONFIG.crossings);

  return event;
}
