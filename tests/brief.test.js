// tests/brief.test.js
//
// Brief generator: the 5.3 typical-value math, class bands, the per-business
// difficulty mix (harness criterion 8), the draw cap (criterion 9), levers,
// and determinism.

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBrief, classify, computeTarget, valuePerCustomer, BUSINESS_IDS, naturalMix } from '../src/engine/brief.js';
import { DEFAULT_FEE, monthlyFee } from '../src/config/fees.js';
import { TARGET_MIX, COMPLICATIONS, RED_FLAGS } from '../src/config/difficulty.js';

const near = (a, b, tol) => Math.abs(a - b) <= tol;

test('typical med spa economics reproduce the 5.3 table at L1', () => {
  const vpc = valuePerCustomer(400, 3000);
  const breakeven = vpc * 0.3 * 0.6;
  assert.equal(Math.round(breakeven), 306);
  const draw = { monthlyBudget: 2000, k: 0.65, econ: { breakeven } };
  const t = computeTarget('medspa', 1, draw, DEFAULT_FEE);
  assert.ok(near(t.cost, 124, 0.5), `target ${t.cost}`);
  assert.ok(near(t.ratio, 2.44, 0.01), `ratio ${t.ratio}`);
});

test('typical apparel L1 target CPA matches 5.3', () => {
  const draw = { monthlyBudget: 2000, k: 0.65, econ: { breakeven: 85 * 0.6 } };
  const t = computeTarget('apparel', 1, draw, DEFAULT_FEE);
  assert.ok(near(t.cost, 20.72, 0.01));
  assert.ok(near(t.ratio, 0.66, 0.01));
});

test('default fee at $2,000 spend is $1,200 with ad share 0.625', () => {
  assert.equal(monthlyFee(DEFAULT_FEE, 2000), 1200);
  const t = computeTarget('medspa', 1, { monthlyBudget: 2000, k: 0.65, econ: { breakeven: 306 } }, DEFAULT_FEE);
  assert.equal(t.adShare, 0.625);
});

test('class bands are closed at 0.9 and 0.6', () => {
  assert.equal(classify(0.9), 'achievable');
  assert.equal(classify(0.8999), 'hard');
  assert.equal(classify(0.6), 'hard');
  assert.equal(classify(0.5999), 'unviable');
});

for (const businessId of BUSINESS_IDS) {
  for (const level of [1, 2]) {
    test(`difficulty mix within 5 points of target and no stalls: ${businessId} L${level}`, () => {
      const n = 1000;
      const counts = { achievable: 0, hard: 0, unviable: 0 };
      for (let i = 0; i < n; i++) {
        const b = generateBrief(i + 1, { businessId, level });
        counts[b.class]++;
        assert.ok(b.economicDraws <= 200);
      }
      for (const c of Object.keys(counts)) {
        const share = counts[c] / n;
        assert.ok(Math.abs(share - TARGET_MIX[businessId][c]) <= 0.05, `${c}: ${share}`);
      }
    });
  }
}

test('med spa natural mix at L1 is all achievable', () => {
  const m = naturalMix('medspa', 1);
  assert.ok(m.achievable > 0.98, JSON.stringify(m));
});

test('med spa hard briefs carry exactly 2 med spa complications', () => {
  const allowed = [...COMPLICATIONS.common, ...COMPLICATIONS.medspa];
  for (let i = 0; i < 200; i++) {
    const b = generateBrief(i, { businessId: 'medspa', level: 1, forceClass: 'hard' });
    assert.equal(b.classSource, 'complications');
    assert.equal(b.complications.length, 2);
    assert.equal(new Set(b.complications).size, 2);
    for (const c of b.complications) assert.ok(allowed.includes(c));
  }
});

test('red-flag briefs have achievable economics and exactly one flag with a hinting note', () => {
  for (let i = 0; i < 200; i++) {
    const b = generateBrief(i, { businessId: 'medspa', level: 1, forceClass: 'unviable' });
    assert.equal(b.classSource, 'red_flag');
    assert.ok(RED_FLAGS.includes(b.redFlag));
    assert.equal(b.economicClass, 'achievable');
    assert.equal(b.intakeNotes.filter((n) => n.signal === 'red_flag').length, 1);
  }
});

test('cleaning hard briefs come from economics when they occur naturally', () => {
  const b = generateBrief(5, { businessId: 'cleaning', level: 1, forceClass: 'hard' });
  assert.equal(b.classSource, 'economics');
  assert.equal(b.economicClass, 'hard');
});

test('12-month value is never below first job value', () => {
  for (const businessId of ['cleaning', 'hvac']) {
    for (let i = 0; i < 5000; i++) {
      const b = generateBrief(i, { businessId, level: 1 });
      const pools = b.econ.pools ? Object.values(b.econ.pools) : [b.econ];
      for (const p of pools) assert.ok(p.twelveMonth >= p.firstJob);
    }
  }
});

test('the same seed produces an identical brief', () => {
  const a = generateBrief(99, { businessId: 'medspa', level: 1 });
  const b = generateBrief(99, { businessId: 'medspa', level: 1 });
  assert.deepEqual(a, b);
});

test('brief is JSON-serializable without loss', () => {
  const b = generateBrief(3, { businessId: 'hvac', level: 2 });
  assert.deepEqual(JSON.parse(JSON.stringify(b)), b);
});
