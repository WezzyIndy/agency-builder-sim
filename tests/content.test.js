// tests/content.test.js
//
// Schema checks for the med spa content the engine and UI depend on.

import test from 'node:test';
import assert from 'node:assert/strict';
import { ANGLES, PROHIBITED_FLAGS } from '../src/content/medspa/angles.js';
import { EVENTS } from '../src/content/medspa/events.js';
import { ONBOARDING_CHECKS } from '../src/content/medspa/onboarding.js';
import { POLICY_REWRITES, DRIVER_TEXT } from '../src/content/medspa/debrief.js';
import { RED_FLAGS } from '../src/config/difficulty.js';
import { RED_FLAG_NOTES } from '../src/content/intake.js';

const FLAGS = ['none', 'inferiority', 'personal_attribute', 'timeframe', 'before_after'];
const AUDIENCES = ['controls', 'suggestions', 'limited'];
const EFFECTS = [
  'pauseAll', 'budgetCut', 'budgetBoost', 'consolidate', 'addAdSet', 'switchToBoost', 'swapCompliant',
  'higherIntent', 'adviseSpeed', 'feeDiscount', 'feeSet', 'demand', 'resetLearning', 'closeMult',
  'marginCut', 'fixDefect', 'endRun',
];

test('4-5 angles, each with resonance for every audience option and a valid policy flag', () => {
  assert.ok(ANGLES.length >= 4 && ANGLES.length <= 5);
  for (const a of ANGLES) {
    assert.ok(FLAGS.includes(a.policyFlag), a.id);
    for (const aud of AUDIENCES) assert.ok(a.resonance[aud] > 0, `${a.id}.${aud}`);
  }
  assert.ok(ANGLES.filter((a) => a.policyFlag === 'none').length >= 2);
  assert.ok(ANGLES.some((a) => PROHIBITED_FLAGS.includes(a.policyFlag)));
  assert.ok(ANGLES.some((a) => a.policyFlag === 'before_after'));
});

test('compliant angles avoid prohibited claims', () => {
  for (const a of ANGLES.filter((x) => x.policyFlag === 'none')) {
    assert.doesNotMatch(a.copy, /guarantee|tired of|years younger|your wrinkles/i, a.id);
  }
});

test('every event has 2-3 responses with a score, effects of known types, and an explanation', () => {
  const ids = new Set();
  for (const e of EVENTS) {
    assert.ok(!ids.has(e.id), `duplicate ${e.id}`);
    ids.add(e.id);
    assert.ok(e.responses.length >= 2 && e.responses.length <= 3, e.id);
    for (const r of e.responses) {
      assert.ok(r.score >= 0 && r.score <= 1, `${e.id}.${r.id}`);
      assert.ok(r.explanation.length > 10);
      for (const fx of r.effects) assert.ok(EFFECTS.includes(fx.type), `${e.id}.${r.id}: ${fx.type}`);
    }
  }
  const nonForced = EVENTS.filter((e) => e.trigger.kind !== 'forced');
  assert.ok(nonForced.length >= 8 && nonForced.length <= 12);
});

test('each red flag has a forced event and intake notes', () => {
  for (const f of RED_FLAGS) {
    assert.ok(EVENTS.some((e) => e.trigger.kind === 'forced' && e.trigger.redFlag === f), f);
    assert.ok(RED_FLAG_NOTES[f].length >= 1);
  }
});

test('every risky policy flag has rewrite text', () => {
  for (const f of [...PROHIBITED_FLAGS, 'before_after']) assert.ok(POLICY_REWRITES[f].rewrite, f);
});

test('onboarding checks are well formed and the full audit leaves room to fix only some things', () => {
  const auditTotal = ONBOARDING_CHECKS.reduce((s, c) => s + c.auditHours, 0);
  const fixTotal = ONBOARDING_CHECKS.reduce((s, c) => s + (c.fixHours || 0), 0);
  assert.ok(auditTotal < 6);
  assert.ok(auditTotal + fixTotal > 6, 'fixing everything should not fit the hour budget');
  for (const c of ONBOARDING_CHECKS) assert.ok(c.defect && c.clean, c.id);
});

test('driver text has a stronger move for every driver', () => {
  for (const [k, v] of Object.entries(DRIVER_TEXT)) assert.ok(v.stronger && v.hurt, k);
});
