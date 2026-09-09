import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { haversineDistanceMeters, isPointInAnyPolygon } from '../geofencing/boundary.ts';
import ulezBoundary from './ulezBoundary.json' with { type: 'json' };

const ULEZ_POLYGONS = ulezBoundary.polygons as Array<Array<[number, number]>>;

interface CircleGeofence {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

/**
 * Reads the shipped geofence values out of the config's source text rather
 * than importing the module. `crossings.ts` imports `./ulezBoundary`, which
 * imports JSON the Metro-bundler way (no import attribute) — Node's ESM
 * loader rejects that, which is the same reason boundary.test.ts loads the
 * boundary JSON directly. Parsing the source keeps this test pointed at the
 * real values the app ships rather than a copy that could drift.
 *
 * Fields are matched only as whole indented lines (`^\s*latitude: <n>,`) so
 * the extensive prose in these comments — which quotes plenty of
 * coordinates — can never be picked up as a value.
 */
function readCircleGeofence(crossingId: string): CircleGeofence {
  const source = readFileSync(new URL('./crossings.ts', import.meta.url), 'utf8');

  // Charging schemes reuse some crossing ids (`humber-bridge`,
  // `warburton-toll-bridge`) and are declared earlier in the file, so the
  // search has to start at the crossing list itself.
  const configStart = source.indexOf('export const MOCK_CROSSINGS_CONFIG');
  assert.ok(configStart !== -1, 'MOCK_CROSSINGS_CONFIG not found');

  const start = source.indexOf(`id: '${crossingId}'`, configStart);
  assert.ok(start !== -1, `no crossing with id '${crossingId}'`);

  const circle = source.indexOf("kind: 'circle'", start);
  assert.ok(circle !== -1 && circle - start < 500, `'${crossingId}' is not a circle geofence`);

  const block = source.slice(circle, circle + 6000);
  const read = (field: string): number => {
    const match = new RegExp(`^\\s*${field}:\\s*(-?[0-9.]+),\\s*$`, 'm').exec(block);
    assert.ok(match, `no ${field} line found for '${crossingId}'`);
    return Number(match[1]);
  };

  return { latitude: read('latitude'), longitude: read('longitude'), radiusMeters: read('radiusMeters') };
}

/**
 * Every point crossing, with the published coordinate its config value was
 * checked against on 2026-09-09 and where that came from.
 *
 * Before that pass every one of these was a landmark-level guess, and the
 * errors ran from 257m (Silver Jubilee) to 2,467m (Warburton) — several of
 * them larger than the geofence radius itself, which meant the driven route
 * never entered the circle at all. This table is what stops that returning
 * unnoticed.
 */
const REFERENCES: Array<{ id: string; latitude: number; longitude: number; source: string }> = [
  { id: 'dartford-crossing', latitude: 51.46472, longitude: 0.25861, source: "Wikipedia 51°27'53\"N 0°15'31\"E, + latitude.to (43m apart)" },
  { id: 'blackwall-tunnel', latitude: 51.50444, longitude: -0.00306, source: "Wikipedia 51°30'16\"N 0°00'11\"W, + latitude.to (212m) + OS refs for the southern structures" },
  { id: 'silvertown-tunnel', latitude: 51.50472, longitude: 0.00806, source: "Wikipedia 51°30'17\"N 0°00'29\"E (single source)" },
  { id: 'mersey-gateway-bridge', latitude: 53.3528, longitude: -2.713, source: "Wikipedia 53°21'10\"N 2°42'47\"W, confirmed by the documented ~1.5km offset from Silver Jubilee" },
  { id: 'silver-jubilee-bridge', latitude: 53.3466, longitude: -2.7377, source: "Wikipedia 53°20'48\"N 2°44'16\"W" },
  { id: 'tyne-tunnel', latitude: 54.986, longitude: -1.4847, source: 'latitude.to, + OS grid ref NZ329659 for the adjacent pedestrian tunnels (185m apart)' },
  { id: 'humber-bridge', latitude: 53.7064, longitude: -0.45, source: "Wikipedia 53°42'23\"N 0°27'00\"W, + latitude.to (14m apart)" },
  { id: 'warburton-toll-bridge', latitude: 53.4074, longitude: -2.45881, source: 'OS grid refs in the Rixton and Warburton Bridge Order 2024 (legislation.gov.uk)' },
];

/**
 * How far a centre may sit from its reference before this fails. Generous
 * enough that a future refinement from better data doesn't trip it, tight
 * enough to catch a regression to the pre-2026-09-09 values, the smallest
 * of which was 257m out.
 */
const CENTRE_TOLERANCE_METERS = 250;

for (const reference of REFERENCES) {
  test(`${reference.id} — geofence centre matches its published coordinate`, () => {
    const geofence = readCircleGeofence(reference.id);
    const offset = haversineDistanceMeters(
      { latitude: geofence.latitude, longitude: geofence.longitude },
      { latitude: reference.latitude, longitude: reference.longitude }
    );
    assert.ok(
      offset < CENTRE_TOLERANCE_METERS,
      `${reference.id} centre is ${Math.round(offset)}m from ${reference.source}`
    );
  });
}

test('no two crossings’ geofences overlap', () => {
  // Overlapping circles mean one crossing fires two different notifications,
  // naming the wrong toll and the wrong deadline. Two pairs here are close
  // enough for this to be a live constraint rather than a formality:
  // Blackwall/Silvertown are 770m apart and Mersey Gateway/Silver Jubilee
  // 1,779m, and both pairs' radii are deliberately capped because of it.
  const geofences = REFERENCES.map((r) => ({ id: r.id, ...readCircleGeofence(r.id) }));

  for (let i = 0; i < geofences.length; i += 1) {
    for (let j = i + 1; j < geofences.length; j += 1) {
      const a = geofences[i];
      const b = geofences[j];
      const separation = haversineDistanceMeters(
        { latitude: a.latitude, longitude: a.longitude },
        { latitude: b.latitude, longitude: b.longitude }
      );
      assert.ok(
        separation > a.radiusMeters + b.radiusMeters,
        `${a.id} (${a.radiusMeters}m) and ${b.id} (${b.radiusMeters}m) are only ${Math.round(separation)}m apart — their geofences overlap`
      );
    }
  }
});

test('every geofence is large enough to be detected at driving speed', () => {
  // Driving straight through, the chord is 2r. Below roughly a minute there
  // is a real chance Android never samples location while the vehicle is
  // inside the region at all, so no ENTER is generated and no alert fires.
  // 350m (the Blackwall/Silvertown floor, forced by their 770m separation)
  // gives ~52s at 30mph, which is the accepted compromise; anything smaller
  // is not defensible for any of these crossings.
  for (const reference of REFERENCES) {
    const geofence = readCircleGeofence(reference.id);
    assert.ok(
      geofence.radiusMeters >= 350,
      `${reference.id} radius is only ${geofence.radiusMeters}m — too small to be reliably detected`
    );
  }
});

test('Dartford geofence — radius covers the physical structure a charged vehicle drives over', () => {
  const dartford = readCircleGeofence('dartford-crossing');

  // The QEII bridge crossing including its approach viaducts is 2,871m end
  // to end (1,051m north viaduct + 821m bridge + 1,008m south viaduct), so
  // half of it is 1,436m from mid-river. A radius materially smaller than
  // that leaves part of the charged structure outside the geofence.
  const bridgeHalfLengthMeters = 2871 / 2;
  assert.ok(
    dartford.radiusMeters >= bridgeHalfLengthMeters * 0.9,
    `radius ${dartford.radiusMeters}m is too small to cover the crossing (half-length ${Math.round(bridgeHalfLengthMeters)}m)`
  );

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
