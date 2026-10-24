// tests/scoring.test.js
//
// Final scoring: Performance, rubric checks with reasons, agency P&L,
// walk-aways, client profit, unlock rule.

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFinal, computeRubric, unlockProgress, scoreRecord } from '../src/engine/scoring.js';
import { applyDecision } from '../src/engine/run.js';
import { playRun } from '../harness/play.js';
import { launched, playWeeks, websiteAdSet } from './helpers.js';

test('Performance = 100 x min(1, target / quality-adjusted CPL); no results scores 0', () => {
  const s = playRun('bestPractice', { seed: 3, businessId: 'medspa', level: 1, realism: 3, forceClass: 'achievable' });
  const f = s.final;
  const expected = 100 * Math.min(1, s.brief.target.cost / f.totals.qaCpl);
  assert.ok(Math.abs(f.performance - expected) < 1e-9);
  const naive = playRun('naive', { seed: 3, businessId: 'medspa', level: 1, realism: 3, forceClass: 'achievable' });
  assert.equal(naive.final.totals.qaCpl, null);
  assert.equal(naive.final.performance, 0);
  assert.ok(Number.isFinite(naive.final.adScore));
});

test('rubric: 4 ad sets on a ~$460/week budget fails the ad set check with the formula', () => {
  const sets = [0, 1, 2, 3].map(() => websiteAdSet({ budgetShare: 0.25 }));
  const s = playWeeks(launched(12, { setup: 'advantage', adSets: sets }), 2);
  const r = computeRubric(s);
  const c = r.checks.find((x) => x.id === 'adsets');
  assert.equal(c.pass, false);
  assert.match(c.reason, /max\(1, floor\(weekly budget \/ \(10 x cost per lead\)\)\)/);
});

test('rubric: best practice passes every applicable check', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const s = playRun('bestPractice', { seed, businessId: 'medspa', level: 1, realism: 3, forceClass: 'achievable' });
    const failed = s.final.rubric.checks.filter((c) => c.pass === false);
    assert.deepEqual(failed.map((c) => c.id), [], `seed ${seed}: ${failed.map((c) => c.reason).join(' | ')}`);
  }
});

test('rubric: back-to-back edits on one ad set fail the edits check', () => {
  let seed = 40;
  let s;
  for (;; seed++) {
    s = playWeeks(launched(seed), 1);
    if (!s.pendingEvent) break;
  }
  s = applyDecision(s, { type: 'editAdSet', adSetId: 'as1', changes: { angles: ['new_client_offer'] } });
  s = applyDecision(s, { type: 'endWeek', update: 'honest' });
  if (s.pendingEvent) s = { ...s, pendingEvent: null };
  s = applyDecision(s, { type: 'editAdSet', adSetId: 'as1', changes: { angles: ['expert_injectors'] } });
  s = applyDecision(s, { type: 'endWeek', update: 'honest' });
  const c = computeRubric(s).checks.find((x) => x.id === 'edits');
  assert.equal(c.pass, false);
  assert.match(c.reason, /back-to-back/);
});

test('agency P&L: effective hourly rate vs target, and a keep/drop verdict', () => {
  const s = playRun('bestPractice', { seed: 8, businessId: 'medspa', level: 1, realism: 3, forceClass: 'achievable' });
  const p = s.final.agencyPnl;
  assert.ok(Math.abs(p.effectiveRate - p.feeRevenue / p.hours) < 1e-9);
  assert.equal(p.targetRate, 75);
  assert.ok(['keep', 'drop'].includes(p.verdict));
  // $1,200 of fee over 20 hours is $60/h, below a $75 target.
  const fake = { ...s, fee: { ...s.fee, monthly: 1200 * (52 / 12) / 8 }, hours: { onboarding: 4, weekly: Array(8).fill(2) } };
  const f = computeFinal(fake);
  assert.ok(Math.abs(f.agencyPnl.effectiveRate - 60) < 1e-6, String(f.agencyPnl.effectiveRate));
  assert.equal(f.agencyPnl.verdict, 'drop');
});

test('client profit shows after-fee and ads-only views on first-job and 12-month bases', () => {
  const s = playRun('bestPractice', { seed: 8, businessId: 'medspa', level: 1, realism: 3, forceClass: 'achievable' });
  const c = s.final.clientProfit;
  assert.ok(Math.abs(c.adsOnly - c.afterFee - c.feePaid) < 1e-6);
  assert.ok(c.afterFee12 >= c.afterFee);
});

test('unlock needs 3 non-Sandbox campaigns averaging Satisfaction >= 70 and Performance >= 60', () => {
  const rec = (sat, perf, isSandbox = false) => ({ level: 1, isSandbox, components: { satisfaction: sat, performance: perf } });
  assert.equal(unlockProgress([rec(80, 70), rec(80, 70)], 1).unlocked, false);
  assert.equal(unlockProgress([rec(80, 70), rec(80, 70), rec(60, 70)], 1).unlocked, true);
  assert.equal(unlockProgress([rec(80, 50), rec(80, 50), rec(80, 70)], 1).unlocked, false);
  assert.equal(unlockProgress([rec(10, 10), rec(80, 70), rec(80, 70), rec(80, 70, true), rec(80, 70)], 1).unlocked, true);
});

test('score records carry mode, level, business, realism and the Sandbox flag', () => {
  const s = playRun('bestPractice', { seed: 2, businessId: 'medspa', level: 1, realism: 4 });
  const r = scoreRecord(s, 123);
  assert.equal(r.realism, 4);
  assert.equal(r.isSandbox, false);
  assert.equal(r.timestamp, 123);
  assert.ok(Number.isFinite(r.components.adScore));
});
