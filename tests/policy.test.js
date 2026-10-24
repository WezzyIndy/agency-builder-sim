// tests/policy.test.js
//
// Med spa policy layer (5.5): disapproval rates (harness criterion 11, Meta
// portion), under-18 targeting, and the relationship hit.

import test from 'node:test';
import assert from 'node:assert/strict';
import { policyCheck } from '../src/engine/policy.js';
import { launched } from './helpers.js';
import { applyDecision } from '../src/engine/run.js';
import { websiteAdSet } from './helpers.js';

function rate(angles, minAge = 18, n = 10000) {
  let d = 0;
  for (let i = 0; i < n; i++) {
    if (policyCheck({ angles, audience: { option: 'controls', minAge } }, { seed: i, week: 1 + (i % 8), businessId: 'medspa' }, 0).disapproved) d++;
  }
  return d / n;
}

test('Covers AE3. Personal-attribute and timeframe copy are disapproved 80% +/- 2%', () => {
  assert.ok(Math.abs(rate(['tired_of_wrinkles']) - 0.8) <= 0.02);
  assert.ok(Math.abs(rate(['ten_years_younger']) - 0.8) <= 0.02);
});

test('before/after is disapproved 10% +/- 1.5% (review errors)', () => {
  assert.ok(Math.abs(rate(['before_after']) - 0.1) <= 0.015);
});

test('compliant copy is never disapproved; under-18 always is', () => {
  assert.equal(rate(['expert_injectors', 'new_client_offer'], 18, 2000), 0);
  assert.equal(rate(['expert_injectors'], 13, 500), 1);
});

test('Covers AE3. A disapproved ad set delivers nothing and Relationship drops by 5', () => {
  // Find a launched run whose first week disapproves the flagged ad.
  for (let seed = 1; seed < 200; seed++) {
    const s = launched(seed, { setup: 'advantage', adSets: [websiteAdSet({ angles: ['tired_of_wrinkles'] })] });
    const t = applyDecision(s, { type: 'endWeek', update: 'honest' });
    const w = t.weeks[0];
    if (w.adSets[0].disapproved) {
      assert.equal(w.totals.spend, 0);
      assert.equal(w.totals.trueLeads, 0);
      // -5 for the disapproval; the honest update on a no-delivery week adds nothing.
      assert.equal(t.relationship, s.relationship - 5 + 1);
      return;
    }
  }
  assert.fail('no disapproval found');
});
