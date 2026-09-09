import { Crossing, CrossingEvent } from '../types/crossing';
import { appendCrossingEvent } from '../state/persistence';
import { presentCrossingNotification } from '../notifications';
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
export async function recordDetection(crossing: Crossing, source: 'geofence' | 'simulated'): Promise<CrossingEvent> {
  const event: CrossingEvent = {
    id: `${crossing.id}-${Date.now()}`,
    crossingId: crossing.id,
    detectedAt: new Date().toISOString(),
    status: 'pending',
  };

  await logEvent('info', 'detection', `${crossing.shortName} detected (${source})`, { eventId: event.id });

  // Persisted before the notification is posted: if the notification fails
  // (permission revoked, channel blocked), the crossing still shows up in
  // the app's "Needs your attention" list rather than vanishing entirely.
  await appendCrossingEvent(event);
  await presentCrossingNotification(crossing, event.id);

  return event;
}
