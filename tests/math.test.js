// tests/math.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import { safeDiv, clamp, median, percentile } from '../src/engine/math.js';

test('safeDiv returns null instead of Infinity or NaN', () => {
  assert.equal(safeDiv(10, 0), null);
  assert.equal(safeDiv(0, 0), null);
  assert.equal(safeDiv(NaN, 2), null);
  assert.equal(safeDiv(10, 4), 2.5);
});

test('clamp bounds a value', () => {
  assert.equal(clamp(0.1, 0.4, 2.5), 0.4);
  assert.equal(clamp(5, 0.4, 2.5), 2.5);
  assert.equal(clamp(1, 0.4, 2.5), 1);
});

test('median treats null as worst', () => {
  assert.equal(median([1, 2, 3]), 2);
  assert.equal(median([1, null, null]), Infinity);
  assert.equal(percentile([10, 20, 30, 40], 50), 25);
});
