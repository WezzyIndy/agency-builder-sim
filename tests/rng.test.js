// tests/rng.test.js
//
// Seeded RNG: determinism, stream independence, and distribution shape.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, stream, hashString } from '../src/engine/rng.js';

test('same seed and stream name produce an identical sequence', () => {
  const a = stream(42, 'funnel', 1, 0);
  const b = stream(42, 'funnel', 1, 0);
  for (let i = 0; i < 50; i++) assert.equal(a.next(), b.next());
});

test('different stream names produce different sequences', () => {
  const a = stream(42, 'funnel');
  const b = stream(42, 'events');
  assert.notEqual(a.next(), b.next());
});

test('drawing from one stream does not change another', () => {
  const funnelA = stream(7, 'funnel', 3);
  const expected = funnelA.next();
  const events = stream(7, 'events', 3);
  for (let i = 0; i < 100; i++) events.next();
  const funnelB = stream(7, 'funnel', 3);
  assert.equal(funnelB.next(), expected);
});

test('triangular stays in range with the expected mean', () => {
  const rng = createRng(123);
  let total = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) {
    const x = rng.triangular(10, 20, 40);
    assert.ok(x >= 10 && x <= 40);
    total += x;
  }
  const meanX = total / n;
  assert.ok(Math.abs(meanX - 70 / 3) < 0.5, `mean ${meanX}`);
});

test('degenerate triangular returns the single value', () => {
  const rng = createRng(1);
  assert.equal(rng.triangular(5, 5, 5), 5);
});

test('stochasticRound preserves the mean', () => {
  const rng = createRng(9);
  let total = 0;
  for (let i = 0; i < 20000; i++) total += rng.stochasticRound(2.3);
  assert.ok(Math.abs(total / 20000 - 2.3) < 0.03);
  assert.equal(rng.stochasticRound(0), 0);
  assert.equal(rng.stochasticRound(-1), 0);
});

test('hashString is stable', () => {
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
});
