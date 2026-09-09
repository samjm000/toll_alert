import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { haversineDistanceMeters, isPointInAnyPolygon } from '../geofencing/boundary.ts';
import ulezBoundary from './ulezBoundary.json' with { type: 'json' };

const ULEZ_POLYGONS = ulezBoundary.polygons as Array<Array<[number, number]>>;

/**
 * Reads the shipped geofence values out of the config's source text rather
 * than importing the module. `crossings.ts` imports `./ulezBoundary`, which
 * imports JSON the Metro-bundler way (no import attribute) — Node's ESM
 * loader rejects that, which is the same reason boundary.test.ts loads the
 * boundary JSON directly. Parsing the source keeps this test pointed at the
 * real values the app ships rather than a copy that could drift.
 */
function readCircleGeofence(crossingId: string): { latitude: number; longitude: number; radiusMeters: number } {
  const source = readFileSync(new URL('./crossings.ts', import.meta.url), 'utf8');
  const start = source.indexOf(`id: '${crossingId}'`);
  assert.ok(start !== -1, `no crossing with id '${crossingId}' in crossings.ts`);

  const block = source.slice(start, start + 4000);
  const read = (field: string): number => {
    const match = new RegExp(`${field}:\\s*(-?[0-9.]+)`).exec(block);
    assert.ok(match, `no ${field} found for '${crossingId}'`);
    return Number(match[1]);
  };

  return { latitude: read('latitude'), longitude: read('longitude'), radiusMeters: read('radiusMeters') };
}

test('Dartford geofence — centred on the real crossing, not several hundred metres off it', () => {
  const dartford = readCircleGeofence('dartford-crossing');

  // The published Dartford Crossing coordinate (51°27'53"N 0°15'31"E),
  // corroborated by a second independent source at 51.4651, 0.2587 which
  // agrees to within 43m. The config shipped (51.4657, 0.2649) until
  // 2026-09-09 — 449m east of this, which with the then-600m radius left a
  // vehicle only ~25s inside the circle at 70mph. This test exists so that
  // regression can't come back silently.
  const published = { latitude: 51.46472, longitude: 0.25861 };
  const offset = haversineDistanceMeters(
    { latitude: dartford.latitude, longitude: dartford.longitude },
    published
  );

  assert.ok(offset < 150, `Dartford geofence centre is ${Math.round(offset)}m from the published crossing coordinate`);
});

test('Dartford geofence — radius covers the physical structure a charged vehicle drives over', () => {
  const dartford = readCircleGeofence('dartford-crossing');

  // The QEII bridge crossing including its approach viaducts is 2,871m end
  // to end (1,051m north viaduct + 821m bridge + 1,008m south viaduct), so
  // half of it is 1,436m from mid-river. A radius materially smaller than
  // that leaves part of the charged structure outside the geofence — and,
  // more importantly, cuts the time a vehicle spends inside below the point
  // where Android reliably samples location at all while it's in there.
  const bridgeHalfLengthMeters = 2871 / 2;
  assert.ok(
    dartford.radiusMeters >= bridgeHalfLengthMeters * 0.9,
    `radius ${dartford.radiusMeters}m is too small to cover the crossing (half-length ${Math.round(bridgeHalfLengthMeters)}m)`
  );

  // Driving straight through, the chord is 2r. At 70mph (31.3 m/s) this is
  // the window Android has to notice the device is inside the region.
  const secondsInsideAt70mph = (2 * dartford.radiusMeters) / 31.3;
  assert.ok(
    secondsInsideAt70mph > 60,
    `only ${secondsInsideAt70mph.toFixed(0)}s inside the geofence at 70mph — too short against observed transition latency`
  );
});

test('Dartford geofence — does not sit inside the ULEZ boundary', () => {
  // Regression guard for a real bug: with the old placeholder ULEZ
  // rectangle, Dartford's coordinates fell inside it and a single mock fix
  // produced BOTH a "Dartford detected" and a spurious "ULEZ detected"
  // notification. Any future change to either the Dartford coordinate or
  // the ULEZ boundary that reintroduces the overlap fails here.
  const dartford = readCircleGeofence('dartford-crossing');
  assert.equal(
    isPointInAnyPolygon({ latitude: dartford.latitude, longitude: dartford.longitude }, ULEZ_POLYGONS),
    false,
    'Dartford must not be inside the ULEZ polygon — one crossing would fire two notifications'
  );
});
