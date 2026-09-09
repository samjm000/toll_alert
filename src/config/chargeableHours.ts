/**
 * When a crossing's charge actually applies.
 *
 * Three of the nine crossings are free overnight — Dartford, Blackwall and
 * Silvertown are all 06:00-22:00 charging — and until 2026-09-09 the app had
 * no concept of time at all, so it woke night-shift drivers at 3am to tell
 * them to pay a charge they did not owe. That is the false positive most
 * likely to teach someone to ignore the app entirely.
 *
 * Deliberately kept as a pure module with no imports: it is the one piece of
 * this logic that can be unit-tested directly (see chargeableHours.test.ts),
 * unlike anything that pulls in `crossings.ts` and its JSON import.
 */

export interface ChargeableHours {
  /**
   * Local time the charge starts applying, "HH:MM", inclusive. Omit `from`
   * and `to` together for a crossing charged around the clock that still has
   * free dates — the ULEZ is 24/7 but free on Christmas Day.
   */
  from?: string;
  /**
   * Local time the charge stops applying, "HH:MM", exclusive. A `to` earlier
   * than `from` means the window wraps past midnight.
   */
  to?: string;
  /**
   * Dates the crossing is free all day regardless of the window, as "MM-DD".
   * TfL's tunnels and the ULEZ are both free on Christmas Day.
   */
  freeOnDates?: string[];
}

/**
 * Minutes of slack allowed after a charging window closes.
 *
 * DETECTION TIME IS NOT CROSSING TIME. The first real emulator measurement
 * put geofence delivery at ~144 seconds, and Android guarantees nothing —
 * on a sleeping phone it can be longer. So a genuine 21:58 crossing can
 * easily be detected at 22:01, after the window has closed.
 *
 * The two errors are not equally costly. Suppressing a real charge costs the
 * user a £70+ PCN; alerting for a free crossing costs them a notification
 * they can ignore. So the window is treated as still open for a short while
 * after it closes, and the same slack is NOT applied at the opening edge,
 * where the same reasoning runs the other way.
 */
export const DEFAULT_GRACE_MINUTES = 15;

function toMinutes(hhmm: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function monthDay(when: Date): string {
  return `${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
}

/**
 * Whether a charge applies at `when` (the device's local time).
 *
 * Returns true when `hours` is undefined — a crossing with no declared window
 * charges around the clock, which is the case for five of the nine. Anything
 * unparseable also returns true: failing open means an unnecessary alert,
 * failing closed means a missed fine.
 */
export function isChargeableAt(
  hours: ChargeableHours | undefined,
  when: Date,
  graceMinutes: number = DEFAULT_GRACE_MINUTES
): boolean {
  if (!hours) return true;

  if (hours.freeOnDates?.includes(monthDay(when))) return false;

  // No window declared: charged at every hour, and we have already cleared
  // the free-dates check above.
  if (hours.from === undefined || hours.to === undefined) return true;

  const from = toMinutes(hours.from);
  const to = toMinutes(hours.to);
  if (from === null || to === null) return true;

  const now = when.getHours() * 60 + when.getMinutes();
  const DAY = 24 * 60;

  // Measured as an offset from the window's start, wrapping at midnight, so a
  // window that crosses midnight (22:00-06:00) needs no special case and
  // neither does a grace period that pushes the close past midnight.
  //
  // `|| DAY` catches the degenerate case where the graced window comes out as
  // exactly zero length, which means it spans the whole day rather than none
  // of it.
  const gracedLength = (to + graceMinutes - from + DAY) % DAY || DAY;
  const offsetFromStart = (now - from + DAY) % DAY;

  return offsetFromStart < gracedLength;
}
