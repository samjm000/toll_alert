import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isChargeableAt,
  DEFAULT_GRACE_MINUTES,
  hasBeenChargedToday,
  isSameLocalDay,
} from './chargeableHours.ts';

/** Local-time Date on an arbitrary non-Christmas day. */
const at = (hh: number, mm: number, month = 6, day = 15) => new Date(2026, month - 1, day, hh, mm, 0);

/** Dartford, Blackwall and Silvertown: charged 06:00-22:00, free overnight. */
const OVERNIGHT_FREE = { from: '06:00', to: '22:00' };

test('no declared hours means charged around the clock', () => {
  assert.equal(isChargeableAt(undefined, at(3, 0)), true);
  assert.equal(isChargeableAt(undefined, at(15, 0)), true);
});

test('06:00-22:00 window — charged during the day, free overnight', () => {
  assert.equal(isChargeableAt(OVERNIGHT_FREE, at(6, 0)), true, '06:00 is the first charged minute');
  assert.equal(isChargeableAt(OVERNIGHT_FREE, at(12, 0)), true);
  assert.equal(isChargeableAt(OVERNIGHT_FREE, at(21, 59)), true);

  // The bug this exists to prevent: a 3am Dartford crossing must not alert.
  assert.equal(isChargeableAt(OVERNIGHT_FREE, at(3, 0)), false, '3am must be free');
  assert.equal(isChargeableAt(OVERNIGHT_FREE, at(23, 30)), false);
  assert.equal(isChargeableAt(OVERNIGHT_FREE, at(5, 59)), false, 'still free one minute before opening');
});

test('grace period keeps the window open briefly after it closes', () => {
  // Detection lags the crossing — measured at ~144s on the emulator, and
  // Android guarantees nothing. A 21:58 crossing detected at 22:05 must still
  // alert: a missed charge costs a PCN, a spurious one costs a notification.
  assert.equal(isChargeableAt(OVERNIGHT_FREE, at(22, 5)), true, 'inside the grace period');
  assert.equal(isChargeableAt(OVERNIGHT_FREE, at(22, 14)), true);
  assert.equal(isChargeableAt(OVERNIGHT_FREE, at(22, 16)), false, 'past the grace period');
});

test('grace is NOT applied at the opening edge', () => {
  // Symmetry would be wrong here: extending backwards would alert for genuinely
  // free crossings just before the window opens, with no compensating benefit.
  assert.equal(isChargeableAt(OVERNIGHT_FREE, at(5, 50)), false);
});

test('a window that wraps past midnight is handled without a special case', () => {
  const overnightCharge = { from: '22:00', to: '06:00' };
  assert.equal(isChargeableAt(overnightCharge, at(23, 0)), true);
  assert.equal(isChargeableAt(overnightCharge, at(2, 0)), true, 'after midnight, still inside');
  assert.equal(isChargeableAt(overnightCharge, at(6, 10)), true, 'inside the grace period past 06:00');
  assert.equal(isChargeableAt(overnightCharge, at(12, 0)), false);
});

test('free dates override the window entirely', () => {
  // TfL's tunnels and the ULEZ are free on Christmas Day.
  const withChristmas = { ...OVERNIGHT_FREE, freeOnDates: ['12-25'] };
  assert.equal(isChargeableAt(withChristmas, at(12, 0, 12, 25)), false, 'midday on Christmas Day is free');
  assert.equal(isChargeableAt(withChristmas, at(12, 0, 12, 24)), true, 'Christmas Eve is normal');
  assert.equal(isChargeableAt(withChristmas, at(12, 0, 12, 26)), true, 'Boxing Day is normal');
});

test('free dates alone, with no window — the ULEZ case', () => {
  // ULEZ is charged 24 hours a day but free on Christmas Day, which a
  // from/to pair cannot express.
  const alwaysExceptChristmas = { freeOnDates: ['12-25'] };
  assert.equal(isChargeableAt(alwaysExceptChristmas, at(3, 0)), true, '3am on an ordinary day is charged');
  assert.equal(isChargeableAt(alwaysExceptChristmas, at(3, 0, 12, 25)), false, 'Christmas Day is free');
});

test('unparseable hours fail open rather than closed', () => {
  // Failing open costs an unnecessary alert; failing closed costs a fine.
  assert.equal(isChargeableAt({ from: 'nonsense', to: '22:00' }, at(3, 0)), true);
  assert.equal(isChargeableAt({ from: '06:00', to: '25:99' }, at(3, 0)), true);
});

test('the default grace is small enough to be meaningful', () => {
  assert.ok(DEFAULT_GRACE_MINUTES > 0 && DEFAULT_GRACE_MINUTES <= 30);
});

test('hasBeenChargedToday — the ULEZ daily-charge case', () => {
  const noon = at(12, 0, 6, 15);
  const laterSameDay = new Date(2026, 5, 15, 18, 30).toISOString();
  const previousDay = new Date(2026, 5, 14, 23, 59).toISOString();
  const nextDay = new Date(2026, 5, 16, 0, 1).toISOString();

  assert.equal(hasBeenChargedToday([], noon), false, 'no history means not yet charged');
  assert.equal(hasBeenChargedToday([laterSameDay], noon), true, 'same calendar day counts');
  assert.equal(hasBeenChargedToday([previousDay], noon), false, 'yesterday does not');
  assert.equal(hasBeenChargedToday([nextDay], noon), false, 'tomorrow does not');
  assert.equal(hasBeenChargedToday([previousDay, laterSameDay], noon), true, 'any same-day entry counts');
});

test('hasBeenChargedToday ignores unparseable timestamps rather than matching them', () => {
  // Failing towards alerting: a corrupt record must not suppress a real charge.
  assert.equal(hasBeenChargedToday(['not-a-date', ''], at(12, 0)), false);
});

test('isSameLocalDay is a calendar-day comparison, not a 24-hour window', () => {
  assert.equal(isSameLocalDay(new Date(2026, 5, 15, 0, 1), new Date(2026, 5, 15, 23, 59)), true);
  // 25 minutes apart, but either side of midnight — different charging days.
  assert.equal(isSameLocalDay(new Date(2026, 5, 15, 23, 50), new Date(2026, 5, 16, 0, 15)), false);
});
