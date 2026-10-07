import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineDistanceMeters, isInsideAnyCircle, isPointInAnyPolygon } from '../geofencing/boundary.ts';
import { CONGESTION_CHARGE_BOUNDARY as CCZ } from './congestionChargeBoundary.ts';
import ulezBoundary from './ulezBoundary.json' with { type: 'json' };

/**
 * The Congestion Charge ring is hand-drawn (see congestionChargeBoundary.ts),
 * so these only check places well away from its edge, where an
 * approximation still has to be right. Edge accuracy is the thing replacing
 * it with TfL's data is for.
 */
const INSIDE = [
  { name: 'Trafalgar Square', latitude: 51.508, longitude: -0.1281 },
  { name: 'Oxford Circus', latitude: 51.5152, longitude: -0.1419 },
  { name: 'Bank junction (the City)', latitude: 51.5133, longitude: -0.0891 },
  { name: 'Borough Market', latitude: 51.5055, longitude: -0.091 },
  { name: 'Waterloo station', latitude: 51.5032, longitude: -0.1123 },
];

const OUTSIDE = [
  { name: 'Camden Town', latitude: 51.539, longitude: -0.1426 },
  { name: 'Paddington station', latitude: 51.5154, longitude: -0.1755 },
  { name: 'Brixton', latitude: 51.4613, longitude: -0.1156 },
  { name: 'Canary Wharf', latitude: 51.5054, longitude: -0.0235 },
  { name: 'Dartford Crossing', latitude: 51.46472, longitude: 0.25861 },
];

for (const place of INSIDE) {
  test(`Congestion Charge — ${place.name} is inside`, () => {
    assert.equal(isPointInAnyPolygon(place, CCZ.polygons), true);
  });
}

for (const place of OUTSIDE) {
  test(`Congestion Charge — ${place.name} is outside`, () => {
    assert.equal(isPointInAnyPolygon(place, CCZ.polygons), false);
  });
}

test('Congestion Charge ring is closed', () => {
  for (const ring of CCZ.polygons) {
    assert.deepEqual(ring[0], ring[ring.length - 1]);
  }
});

test('Congestion Charge wake circle contains every boundary point', () => {
  for (const ring of CCZ.polygons) {
    for (const [longitude, latitude] of ring) {
      assert.ok(haversineDistanceMeters({ latitude, longitude }, CCZ.centroid) < CCZ.wakeRadiusMeters);
    }
  }
});

test('the whole Congestion Charge zone is inside the ULEZ', () => {
  const ulez = ulezBoundary.polygons as Array<Array<[number, number]>>;
  for (const ring of CCZ.polygons) {
    for (const [longitude, latitude] of ring) {
      assert.equal(isPointInAnyPolygon({ latitude, longitude }, ulez), true);
    }
  }
});

test('leaving the Congestion Charge wake circle can still be inside the ULEZ one', () => {
  // The engine's wake-EXIT handler relies on this: Stratford, ~8.5km from
  // the Congestion Charge centroid, is outside its circle but well inside
  // the ULEZ's, so location updates must stay on there.
  const ulezCircle = { centroid: ulezBoundary.centroid, wakeRadiusMeters: ulezBoundary.wakeRadiusMeters };
  const cczCircle = { centroid: CCZ.centroid, wakeRadiusMeters: CCZ.wakeRadiusMeters };
  const stratford = { latitude: 51.5416, longitude: -0.0033 };
  assert.equal(isInsideAnyCircle(stratford, [cczCircle]), false);
  assert.equal(isInsideAnyCircle(stratford, [ulezCircle]), true);
  assert.equal(isInsideAnyCircle(OUTSIDE[4], [ulezCircle, cczCircle]), true, 'Dartford is inside the generous ULEZ wake circle');
});
