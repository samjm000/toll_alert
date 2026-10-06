import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceCursor,
  describeDuration,
  diffSnapshots,
  entriesAfterCursor,
  type HealthSnapshot,
  redactCoordinates,
  roundCoord,
  snapshotProblems,
} from './snapshot.ts';

const healthy: HealthSnapshot = {
  monitoringEnabled: true,
  geofencesRegistered: true,
  fineLocationRunning: false,
  foregroundLocation: 'granted',
  backgroundLocation: 'granted',
  locationServicesEnabled: true,
  notifications: 'granted',
};

test('a healthy armed snapshot has no problems', () => {
  assert.deepEqual(snapshotProblems(healthy), []);
});

test('monitoring switched off is never reported as a problem', () => {
  assert.deepEqual(snapshotProblems({ ...healthy, monitoringEnabled: false, geofencesRegistered: false }), []);
});

test('geofences dropped by the OS (reboot, location toggled) is reported', () => {
  assert.deepEqual(snapshotProblems({ ...healthy, geofencesRegistered: false }), [
    'geofences NOT registered with the OS',
  ]);
});

test('every blocker is listed, not just the first', () => {
  const problems = snapshotProblems({
    ...healthy,
    backgroundLocation: 'denied',
    locationServicesEnabled: false,
    notifications: 'denied',
  });
  assert.equal(problems.length, 3);
});

test('diff lists only the fields that changed', () => {
  assert.deepEqual(diffSnapshots(healthy, { ...healthy, locationServicesEnabled: false }), [
    'locationServicesEnabled: true -> false',
  ]);
  assert.deepEqual(diffSnapshots(healthy, healthy), []);
  assert.deepEqual(diffSnapshots(null, healthy), []);
});

test('durations read naturally at every scale', () => {
  assert.equal(describeDuration(45_000), '45s');
  assert.equal(describeDuration(12 * 60_000), '12m');
  assert.equal(describeDuration(3 * 3_600_000), '3h');
  assert.equal(describeDuration(3 * 3_600_000 + 20 * 60_000), '3h 20m');
  assert.equal(describeDuration(52 * 3_600_000), '2d 4h');
  assert.equal(describeDuration(-5), '0s');
});

test('coordinates are rounded to ~1km', () => {
  assert.equal(roundCoord(51.464721), '51.46');
  assert.equal(roundCoord(0.258611), '0.26');
});

test('coordinates in uploaded messages are rounded, other numbers untouched', () => {
  assert.equal(
    redactCoordinates('Fix 51.4647,0.2586 (±20m, 3m since previous fix)'),
    'Fix 51.46,0.26 (±20m, 3m since previous fix)'
  );
  assert.equal(redactCoordinates('crossing:dartford@51.4647,-0.2586/1400m'), 'crossing:dartford@51.46,-0.26/1400m');
  assert.equal(redactCoordinates('Registered 10 regions'), 'Registered 10 regions');
});

const e = (at: string, message = '') => ({ at, message });

test('upload cursor sends everything the first time', () => {
  const log = [e('2026-10-05T10:00:00.000Z'), e('2026-10-05T10:01:00.000Z')];
  assert.equal(entriesAfterCursor(log, null).length, 2);
});

test('upload cursor skips what was sent, including same-millisecond bursts', () => {
  const t = '2026-10-05T10:00:00.000Z';
  const log = [e(t, 'a'), e(t, 'b'), e(t, 'c'), e('2026-10-05T10:05:00.000Z', 'd')];
  const cursor = advanceCursor(null, log.slice(0, 2));
  assert.deepEqual(cursor, { at: t, countAtSameTime: 2 });
  assert.deepEqual(entriesAfterCursor(log, cursor).map((x) => x.message), ['c', 'd']);

  const next = advanceCursor(cursor, [log[2]]);
  assert.deepEqual(next, { at: t, countAtSameTime: 3 });
  assert.deepEqual(entriesAfterCursor(log, next).map((x) => x.message), ['d']);
});

test('upload cursor survives the log being trimmed or cleared', () => {
  const cursor = { at: '2026-10-05T10:00:00.000Z', countAtSameTime: 1 };
  assert.deepEqual(entriesAfterCursor([e('2026-10-05T11:00:00.000Z', 'new')], cursor).map((x) => x.message), ['new']);
  assert.deepEqual(entriesAfterCursor([], cursor), []);
});
