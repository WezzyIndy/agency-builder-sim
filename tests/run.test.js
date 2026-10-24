// tests/run.test.js
//
// Run reducer: replay determinism, onboarding rules, launch validation,
// objective lock and relaunch, spun updates, walk-aways, serialization.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, applyDecision, tryDecision, replay, effectiveDefects } from '../src/engine/run.js';
import { playRun } from '../harness/play.js';
import { websiteAdSet, launched, apply, playWeeks, findSeed } from './helpers.js';

test('Covers AE1. Replaying a decision log from its seed reproduces identical state', () => {
  for (const policy of ['bestPractice', 'random', 'naive']) {
    const s = playRun(policy, { seed: 4242, businessId: 'medspa', level: 1, realism: 3 });
    const r = replay(s.options, s.decisions);
    assert.deepEqual(r, s, policy);
  }
});

test('serialize -> parse -> continue matches continuing directly', () => {
  const s = playWeeks(launched(17), 3);
  const restored = JSON.parse(JSON.stringify(s));
  const a = playWeeks(s, 2);
  const b = playWeeks(restored, 2);
  assert.deepEqual(a, b);
});

test('onboarding hours are capped at 6', () => {
  let s = apply(createRun({ seed: 3, businessId: 'medspa' }), { type: 'accept' });
  for (const check of ['pixel', 'capi', 'calls', 'crm', 'landing', 'speed', 'data_source']) s = applyDecision(s, { type: 'audit', check });
  s = applyDecision(s, { type: 'naming', choice: 'neutral' });
  assert.equal(s.onboarding.hoursUsed, 4);
  // 2 hours left: CRM costs 2.5 if present; force the check with a seed that has the defect.
  const seed = findSeed((b) => b.hidden.defects.noCrm && b.hidden.defects.landingWeak && !b.redFlag);
  let t = apply(createRun({ seed, businessId: 'medspa', realism: 3 }), { type: 'accept' });
  for (const check of ['pixel', 'capi', 'calls', 'crm', 'landing', 'speed', 'data_source']) t = applyDecision(t, { type: 'audit', check });
  t = applyDecision(t, { type: 'naming', choice: 'neutral' });
  const r = tryDecision(t, { type: 'fix', check: 'crm' });
  assert.equal(r.ok, false);
  assert.match(r.error, /Not enough onboarding hours/);
});

test('fixing requires an audit and a real defect', () => {
  const seed = findSeed((b) => !b.hidden.defects.doubleFire && !b.redFlag);
  const s = apply(createRun({ seed, businessId: 'medspa' }), { type: 'accept' });
  assert.equal(tryDecision(s, { type: 'fix', check: 'pixel' }).ok, false);
  const a = applyDecision(s, { type: 'audit', check: 'pixel' });
  assert.equal(tryDecision(a, { type: 'fix', check: 'pixel' }).error, 'Nothing to fix');
});

test('the data-source restriction cannot be fixed, only disclosed', () => {
  const seed = findSeed((b) => b.hidden.defects.dataRestricted && !b.redFlag);
  let s = apply(createRun({ seed, businessId: 'medspa' }), { type: 'accept' }, { type: 'audit', check: 'data_source' });
  assert.match(tryDecision(s, { type: 'fix', check: 'data_source' }).error, /can't be fixed/);
  s = applyDecision(s, { type: 'disclose', check: 'data_source' });
  assert.equal(s.onboarding.disclosed.data_source, true);
});

test('a no-access client blocks website and tracking fixes', () => {
  const seed = findSeed((b) => b.redFlag === 'no_access' && b.hidden.defects.noCapi, { forceClass: 'unviable' });
  const s = apply(createRun({ seed, businessId: 'medspa', forceClass: 'unviable' }), { type: 'accept' }, { type: 'audit', check: 'capi' });
  assert.match(tryDecision(s, { type: 'fix', check: 'capi' }).error, /access/);
});

test('fixing the pixel removes the double-fire defect', () => {
  const seed = findSeed((b) => b.hidden.defects.doubleFire && !b.redFlag);
  const s = apply(createRun({ seed, businessId: 'medspa' }), { type: 'accept' }, { type: 'audit', check: 'pixel' }, { type: 'fix', check: 'pixel' });
  assert.equal(effectiveDefects(s).doubleFire, false);
});

test('launch rejects invalid setups with a readable reason', () => {
  const s = apply(createRun({ seed: 5, businessId: 'medspa', forceClass: 'achievable' }), { type: 'accept' }, { type: 'finishOnboarding' });
  const bad = tryDecision(s, { type: 'launch', campaign: { setup: 'advantage', adSets: [websiteAdSet({ audience: { option: 'controls', minAge: 13 } })] } });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /Minimum age can't be below 18/);
  const mixed = tryDecision(s, { type: 'launch', campaign: { setup: 'advantage', adSets: [websiteAdSet(), websiteAdSet({ objective: 'traffic', goal: 'link_clicks', event: null })] } });
  assert.match(mixed.error, /one objective/);
});

test('the objective is locked after launch; relaunch is allowed and resets learning', () => {
  let seed = 9;
  while (playWeeks(launched(seed), 2).pendingEvent) seed++;
  const s = playWeeks(launched(seed), 2);
  const r = tryDecision(s, { type: 'editAdSet', adSetId: 'as1', changes: { objective: 'traffic' } });
  assert.equal(r.ok, false);
  assert.match(r.error, /locked after launch/);
  const t = applyDecision(s, { type: 'relaunch', campaign: { setup: 'advantage', adSets: [websiteAdSet({ angles: ['new_client_offer'] })] } });
  assert.equal(t.campaignCount, 2);
  assert.equal(t.campaign.adSets[0].resetWeek, 3);
  assert.ok(t.edits.some((e) => e.kind === 'relaunch' && e.week === 3));
});

test('a significant edit resets learning for the following week', () => {
  let seed = 21;
  while (playWeeks(launched(seed), 2).pendingEvent) seed++;
  const s = playWeeks(launched(seed), 2);
  const t = applyDecision(s, { type: 'editAdSet', adSetId: 'as1', changes: { angles: ['new_client_offer'] } });
  assert.equal(t.campaign.adSets[0].resetWeek, 3);
  assert.equal(t.campaign.adSets[0].angleStartWeek, 3);
  assert.deepEqual(t.edits.at(-1), { week: 3, adSetId: 'as1', kind: 'angles', fix: false });
});

test('a spun update on a bad week raises Relationship now and drops it sharply the next week', () => {
  // A brutal promise makes every week "bad".
  let s = launched(31);
  s = { ...s, brief: { ...s.brief, expectation: { cost: 5, overOptimistic: true, rampWeeks: 0 } } };
  const before = s.relationship;
  const spun = applyDecision(s, { type: 'endWeek', update: 'spun' });
  assert.equal(spun.relationship, before + 3);
  const honest = applyDecision(s, { type: 'endWeek', update: 'honest' });
  assert.equal(honest.relationship, before - 2);
  let next = spun;
  if (next.pendingEvent) next = { ...next, pendingEvent: null };
  next = applyDecision(next, { type: 'endWeek', update: 'honest' });
  assert.ok(next.relationship <= spun.relationship - 12 + 1e-9, `${spun.relationship} -> ${next.relationship}`);
});

test('a skipped update costs Relationship', () => {
  const s = launched(33);
  const t = applyDecision(s, { type: 'endWeek', update: 'skip' });
  assert.equal(t.relationship, s.relationship - 6);
});

test('declining a red-flag brief is a correct walk-away; declining an achievable brief is a loss', () => {
  const bad = applyDecision(createRun({ seed: 2, businessId: 'medspa', forceClass: 'unviable' }), { type: 'decline' });
  assert.equal(bad.status, 'final');
  assert.equal(bad.final.walkAway.correct, true);
  assert.equal(bad.final.satisfaction, 100);
  assert.equal(bad.final.performance, 100);
  const good = applyDecision(createRun({ seed: 2, businessId: 'medspa', forceClass: 'achievable' }), { type: 'decline' });
  assert.equal(good.final.walkAway.correct, false);
  assert.equal(good.final.adScore, 0);
});

test('an undeclined red flag plays out as a forced event', () => {
  const seed = findSeed((b) => b.redFlag === 'guarantee', { forceClass: 'unviable' });
  let s = launched(seed, undefined, { forceClass: 'unviable' });
  s = applyDecision(s, { type: 'endWeek', update: 'honest' });
  s = applyDecision(s, s.pendingEvent ? { type: 'respondEvent', response: 'promise' } : { type: 'endWeek', update: 'honest' });
  if (s.status === 'running' && !s.pendingEvent) s = applyDecision(s, { type: 'endWeek', update: 'honest' });
  assert.ok(s.firedEvents.includes('rf_guarantee') || s.pendingEvent?.id === 'rf_guarantee', JSON.stringify(s.firedEvents));
});

test('an event must be answered before the week can end', () => {
  let s = launched(55);
  for (let i = 0; i < 8 && s.status === 'running' && !s.pendingEvent; i++) s = applyDecision(s, { type: 'endWeek', update: 'honest' });
  if (s.pendingEvent) {
    const r = tryDecision(s, { type: 'endWeek', update: 'honest' });
    assert.match(r.error, /Respond to the client first/);
  }
});

test('a full best-practice run completes for every med spa difficulty class', () => {
  for (const forceClass of ['achievable', 'hard', 'unviable']) {
    for (let seed = 1; seed <= 15; seed++) {
      const s = playRun('bestPractice', { seed, businessId: 'medspa', level: 1, realism: 3, forceClass });
      assert.equal(s.status, 'final');
      assert.ok(s.final);
    }
  }
});

test('nothing can be applied to a finished run', () => {
  const s = applyDecision(createRun({ seed: 1, businessId: 'medspa' }), { type: 'decline' });
  assert.match(tryDecision(s, { type: 'accept' }).error, /over/);
});

test('an ad set can be added mid-campaign: same objective, its own budget share, learning from that week', () => {
  let s = null;
  for (let seed = 17; !s; seed++) {
    const t = playWeeks(launched(seed), 2);
    if (t.status === 'running' && !t.pendingEvent) s = t;
  }
  const week = s.weekIndex + 1;
  const r = tryDecision(s, { type: 'addAdSet', adSet: websiteAdSet({ objective: 'engagement', angles: ['new_client_offer'], budgetShare: 0.3 }) });
  assert.ok(r.ok, r.error);
  const added = r.state.campaign.adSets.at(-1);
  assert.equal(r.state.campaign.adSets.length, 2);
  assert.equal(added.objective, 'leads', 'the campaign objective wins');
  assert.equal(added.startWeek, week);
  assert.ok(Math.abs(added.budgetShare - 0.3) < 1e-9);
  assert.ok(Math.abs(r.state.campaign.adSets.reduce((t, a) => t + a.budgetShare, 0) - 1) < 1e-9);
  const next = playWeeks(r.state, 1);
  assert.ok(next.weeks.at(-1).adSets.some((x) => x.id === added.id), 'the new ad set spends the following week');
});
