// tests/satisfaction.test.js
//
// Satisfaction formula (13.3) and failure states (13.5).

import test from 'node:test';
import assert from 'node:assert/strict';
import { resultsScore, satisfactionScore, checkFailure, qualityAdjustedCpl } from '../src/engine/satisfaction.js';

const week = (spend, trueLeads, jobs) => ({ totals: { spend, trueLeads, jobs } });
const brief = { totalBudget: 4000, campaignWeeks: 8, target: { cost: 100 } };

test('Covers AE5. Two straight weeks under 40 Satisfaction is Churn', () => {
  const weeks = [week(500, 10, 3), week(500, 10, 3)];
  assert.equal(checkFailure({ weeks, satisfactionHistory: [55, 39], brief, closeRate: 0.3 }), null);
  assert.equal(checkFailure({ weeks, satisfactionHistory: [39, 38], brief, closeRate: 0.3 }), 'churn');
});

test('more than 25% of budget with zero true leads is Budget failure', () => {
  const weeks = [week(500, 0, 0), week(501, 0, 0)];
  assert.equal(checkFailure({ weeks, satisfactionHistory: [60, 60], brief, closeRate: 0.3 }), 'budget_failure');
  const ok = [week(500, 0, 0), week(400, 0, 0)];
  assert.equal(checkFailure({ weeks: ok, satisfactionHistory: [60, 60], brief, closeRate: 0.3 }), null);
});

test('Target failure at the midpoint when the trailing true result misses by more than 50%', () => {
  const pad = [week(500, 10, 3), week(500, 10, 3)];
  // close 0.3; quality-adjusted CPL = spend / (jobs / 0.3)
  // 151 per lead: 1000 spend over 2 weeks -> jobs = 1000 / 151 * 0.3 = 1.987
  const miss = [...pad, week(500, 10, 0.9934), week(500, 10, 0.9934)];
  assert.equal(checkFailure({ weeks: miss, satisfactionHistory: [70, 70, 70, 70], brief, closeRate: 0.3 }), 'target_failure');
  const close = [...pad, week(500, 10, 1.0204), week(500, 10, 1.0204)]; // 149 per lead
  assert.equal(checkFailure({ weeks: close, satisfactionHistory: [70, 70, 70, 70], brief, closeRate: 0.3 }), null);
});

test('inside a promised ramp, 1.4x the promise still scores 100; with no ramp it does not', () => {
  const promised = { cost: 50, rampWeeks: 2 };
  // actual quality-adjusted CPL = 70 (1.4x): spend 700, jobs 3 at close 0.3 -> 700 / 10 = 70
  const w = [week(700, 10, 3)];
  assert.equal(resultsScore(w, promised, 0.3), 100);
  assert.ok(resultsScore(w, { cost: 50, rampWeeks: 0 }, 0.3) < 100);
});

test('Results use bookings: cheap leads that never book score 0', () => {
  assert.equal(resultsScore([week(500, 40, 0)], { cost: 50, rampWeeks: 0 }, 0.3), 0);
  assert.equal(resultsScore([week(0, 0, 0)], { cost: 50, rampWeeks: 0 }, 0.3), null);
});

test('S_week = 0.7 Results + 0.3 Relationship, with a neutral 50 when nothing ran', () => {
  assert.equal(satisfactionScore(100, 70), 91);
  assert.equal(satisfactionScore(null, 70), 56);
});

test('quality-adjusted CPL is null with no jobs and never NaN', () => {
  assert.equal(qualityAdjustedCpl(0, 0, 0.3), null);
  assert.equal(qualityAdjustedCpl(500, 0, 0.3), null);
  assert.equal(qualityAdjustedCpl(300, 3, 0.3), 30);
});
