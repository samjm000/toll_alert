import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineDistanceMeters, isPointInAnyPolygon, isPointInPolygon } from './boundary.ts';

// Loads the real ULEZ boundary JSON directly rather than through
// src/config/ulezBoundary.ts, which imports it the Metro-bundler way (no
// import attribute) — Node's own ESM loader requires `with { type: 'json' }`
// for JSON imports, so the test loads the same file this second, narrower
// way instead of changing the app module to suit the test runner. The
// point-in-polygon *logic* under test (`isPointInPolygon` /
// `isPointInAnyPolygon`) is the real, shipped implementation either way.
import ulezBoundary from '../config/ulezBoundary.json' with { type: 'json' };

const ULEZ_POLYGONS = ulezBoundary.polygons as Array<Array<[number, number]>>;

test('isPointInPolygon — simple square', () => {
  const square: Array<[number, number]> = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];
  assert.equal(isPointInPolygon({ latitude: 5, longitude: 5 }, square), true, 'centre should be inside');
  assert.equal(isPointInPolygon({ latitude: 50, longitude: 50 }, square), false, 'far outside should be outside');
  assert.equal(isPointInPolygon({ latitude: -5, longitude: 5 }, square), false, 'just below should be outside');
});

test('isPointInAnyPolygon — false when the point matches no polygon', () => {
  const a: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
    [0, 0],
  ];
  const b: Array<[number, number]> = [
    [10, 10],
    [11, 10],
    [11, 11],
    [10, 11],
    [10, 10],
  ];
  assert.equal(isPointInAnyPolygon({ latitude: 0.5, longitude: 0.5 }, [a, b]), true, 'inside first polygon');
  assert.equal(isPointInAnyPolygon({ latitude: 10.5, longitude: 10.5 }, [a, b]), true, 'inside second polygon');
  assert.equal(isPointInAnyPolygon({ latitude: 5, longitude: 5 }, [a, b]), false, 'between the two, inside neither');
});

/**
 * Real-world reference points against the real ULEZ boundary (TfL/GLA,
 * London Datastore — see src/config/ulezBoundary.ts for source/licence).
 * This is the exact regression this file exists to prevent: the old
 * placeholder rectangle silently misclassified real points (Dartford
 * Crossing sat inside it), which a unit test against real data — not a
 * manual spot-check — would have caught immediately.
 */
test('ULEZ boundary — Dartford Crossing is outside', () => {
  const dartford = { latitude: 51.4657, longitude: 0.2649 };
  assert.equal(isPointInAnyPolygon(dartford, ULEZ_POLYGONS), false);
});

test('ULEZ boundary — Trafalgar Square is inside', () => {
  const trafalgarSquare = { latitude: 51.508, longitude: -0.1281 };
  assert.equal(isPointInAnyPolygon(trafalgarSquare, ULEZ_POLYGONS), true);
});

test('ULEZ boundary — Heathrow Terminal 5 is inside, near the real edge', () => {
  const heathrowT5 = { latitude: 51.4723, longitude: -0.4877 };
  assert.equal(isPointInAnyPolygon(heathrowT5, ULEZ_POLYGONS), true);

  // Confirms this is a genuine near-edge case, not a trivially-obvious
  // "clearly inside" point — the nearest boundary vertex is well within
  // the ~15m simplification tolerance's error budget times a wide margin,
  // but still close enough that a wrong winding/off-by-one in the
  // point-in-polygon math would plausibly flip this one specifically.
  const nearestVertexDistance = Math.min(
    ...ULEZ_POLYGONS.flat().map(([lon, lat]) => haversineDistanceMeters(heathrowT5, { latitude: lat, longitude: lon }))
  );
  assert.ok(nearestVertexDistance < 500, `expected a near-edge point (<500m), got ${Math.round(nearestVertexDistance)}m`);
});

test('ULEZ boundary — a point just outside the boundary near Heathrow is outside', () => {
  // ~170m outside the boundary, near Heathrow's northwestern perimeter —
  // found by scanning near Heathrow for a close-but-outside point against
  // the real data, not guessed.
  const justOutside = { latitude: 51.495, longitude: -0.47 };
  assert.equal(isPointInAnyPolygon(justOutside, ULEZ_POLYGONS), false);

  const nearestVertexDistance = Math.min(
    ...ULEZ_POLYGONS.flat().map(([lon, lat]) => haversineDistanceMeters(justOutside, { latitude: lat, longitude: lon }))
  );
  assert.ok(nearestVertexDistance < 500, `expected a near-edge point (<500m), got ${Math.round(nearestVertexDistance)}m`);
});

test('ULEZ boundary — sanity: not a bounding box', () => {
  // The bug this whole file exists to prevent was a rectangle standing in
  // for ULEZ's real shape. Cheap structural guard against silently
  // regressing to something box-like: a real administrative boundary has
  // far more than 4-5 vertices per ring, and more than one ring (TfL's
  // published data has 22 separate polygons: one large contiguous area
  // plus small separate enclaves).
  assert.ok(ULEZ_POLYGONS.length > 5, `expected multiple separate polygons, got ${ULEZ_POLYGONS.length}`);
  const totalVertices = ULEZ_POLYGONS.reduce((sum, ring) => sum + ring.length, 0);
  assert.ok(totalVertices > 500, `expected a detailed boundary, got ${totalVertices} vertices total`);
});
