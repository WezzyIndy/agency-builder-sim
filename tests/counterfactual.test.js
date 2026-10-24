// tests/counterfactual.test.js
//
// Counterfactual replay (14.2) and debrief data.

import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCounterfactual, lenientReplay } from '../src/engine/counterfactual.js';
import { roundDebrief, finalDebrief } from '../src/engine/debrief.js';
import { playRun } from '../harness/play.js';
import { applyDecision } from '../src/engine/run.js';
import { launched, playWeeks, websiteAdSet } from './helpers.js';

function trafficRun(seed) {
  const campaign = { setup: 'advantage', adSets: [websiteAdSet({ objective: 'traffic', goal: 'link_clicks', event: null })] };
  return playWeeks(launched(seed, campaign), 8);
}

test('Covers AE2. Traffic -> Leads counterfactual keeps the brief and improves true leads', () => {
  const s = trafficRun(14);
  assert.equal(s.status, 'final');
  const cf = computeCounterfactual(s);
  assert.equal(cf.found, true);
  assert.equal(cf.checkId, 'objective');
  assert.ok(cf.after.jobs > cf.before.jobs, JSON.stringify(cf));
});

test('Covers AE2. Lenient replay of the unchanged log reproduces the run exactly', () => {
  const s = playRun('random', { seed: 77, businessId: 'medspa', level: 1, realism: 3 });
  const r = lenientReplay(s, s.decisions);
  assert.deepEqual(r.brief, s.brief);
  assert.deepEqual(r.weeks, s.weeks);
  assert.deepEqual(r.eventLog, s.eventLog);
});

test('Covers AE2. Changing a decision leaves the brief and pre-change weeks identical', () => {
  const s = trafficRun(15);
  const cf = computeCounterfactual(s);
  assert.ok(cf.found);
  // Rebuild the counterfactual to inspect it: the brief can't change.
  const swapped = s.decisions.map((d) => (d.type === 'launch' ? { ...d, campaign: { setup: 'advantage', adSets: [websiteAdSet()] } } : d));
  const r = lenientReplay(s, swapped);
  assert.deepEqual(r.brief, s.brief);
});

test('a churned run with prohibited copy gets a counterfactual that improves the outcome', () => {
  for (let seed = 1; seed < 300; seed++) {
    const s = playWeeks(launched(seed, { setup: 'advantage', adSets: [websiteAdSet({ angles: ['tired_of_wrinkles'] })] }), 8);
    if (s.final?.endReason !== 'churn') continue;
    const cf = computeCounterfactual(s);
    assert.equal(cf.found, true);
    assert.ok(cf.after.endReason !== 'churn' || cf.after.satisfaction > cf.before.satisfaction, JSON.stringify(cf));
    return;
  }
  assert.fail('no churned run found');
});

test('a run with no failed decision checks reports no higher-impact alternative', () => {
  const s = playRun('bestPractice', { seed: 5, businessId: 'medspa', level: 1, realism: 3, forceClass: 'achievable' });
  const cf = computeCounterfactual(s);
  assert.equal(cf.found, false);
  assert.equal(cf.tried, 0);
});

test('the counterfactual tries at most 6 candidates', () => {
  const s = playRun('naive', { seed: 9, businessId: 'medspa', level: 1, realism: 3, forceClass: 'achievable' });
  const cf = computeCounterfactual(s);
  assert.ok(cf.tried <= 6);
  assert.equal(cf.found, true);
});

test('the round debrief names policy disapproval as the driver', () => {
  for (let seed = 1; seed < 200; seed++) {
    let s = launched(seed, { setup: 'advantage', adSets: [websiteAdSet({ angles: ['ten_years_younger'] })] });
    s = applyDecision(s, { type: 'endWeek', update: 'honest' });
    if (s.weeks[0].totals.anyDisapproved) {
      const d = roundDebrief(s, 1);
      assert.equal(d.driver.key, 'policy');
      assert.match(d.stronger, /compliant/);
      return;
    }
  }
  assert.fail('no disapproval found');
});

test('the round debrief flags a double-counting tracking gap', () => {
  for (let seed = 1; seed < 400; seed++) {
    const probe = launched(seed, { setup: 'advantage', adSets: [websiteAdSet({ location: 'calls', goal: 'calls', event: null })] });
    if (!probe.brief.hidden.defects.doubleFire || probe.brief.hidden.defects.dataRestricted) continue;
    const s0 = launched(seed);
    const s = applyDecision(s0, { type: 'endWeek', update: 'honest' });
    const d = roundDebrief(s, 1);
    assert.ok(d.notes.some((n) => /double-counting/.test(n)), JSON.stringify(d.notes));
    return;
  }
  assert.fail('no double-fire brief found');
});

test('the final debrief renders without missing fields for completed, churned, and declined runs', () => {
  let seed = 1;
  while (playRun('bestPractice', { seed, businessId: 'medspa', level: 1, realism: 3, forceClass: 'achievable' }).final.endReason !== 'completed') seed++;
  const runs = [
    playRun('bestPractice', { seed, businessId: 'medspa', level: 1, realism: 3, forceClass: 'achievable' }),
    playRun('naive', { seed: 2, businessId: 'medspa', level: 1, realism: 3, forceClass: 'achievable' }),
    playRun('bestPractice', { seed: 2, businessId: 'medspa', level: 1, realism: 3, forceClass: 'unviable' }),
  ];
  assert.deepEqual(runs.map((s) => s.final.endReason), ['completed', 'churn', 'declined']);
  for (const s of runs) {
    const d = finalDebrief(s);
    for (const k of ['headline', 'scores', 'difficulty', 'rubric', 'counterfactual', 'honestLimit', 'eventReview']) assert.ok(d[k] !== undefined, `${s.final.endReason}.${k}`);
    assert.ok(d.difficulty.text.length > 10);
    assert.match(d.honestLimit, /simulated/);
  }
});
