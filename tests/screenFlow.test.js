// tests/screenFlow.test.js
//
// Screen routing and the setup editor's option lists, without the DOM.

import test from 'node:test';
import assert from 'node:assert/strict';
import { screenFor, setupChoices, reconcileAdSet, blankAdSet, adSetChanges } from '../src/ui/flow.js';
import { createRun, applyDecision } from '../src/engine/run.js';
import { goalOptions } from '../src/engine/metaRules.js';
import { setupContext } from '../src/engine/run.js';

const view = (extra = {}) => ({ screen: null, debriefWeek: null, ...extra });

test('brief -> decline goes to the final debrief', () => {
  const s = createRun({ seed: 1, businessId: 'medspa' });
  assert.equal(screenFor(s, view()), 'brief');
  assert.equal(screenFor(applyDecision(s, { type: 'decline' }), view()), 'final');
});

test('brief -> accept -> onboarding -> setup -> week 1', () => {
  let s = createRun({ seed: 2, businessId: 'medspa', forceClass: 'achievable' });
  s = applyDecision(s, { type: 'accept' });
  assert.equal(screenFor(s, view()), 'onboarding');
  s = applyDecision(s, { type: 'finishOnboarding' });
  assert.equal(screenFor(s, view()), 'setup');
  const draft = reconcileAdSet(s, blankAdSet({ angles: ['expert_injectors'] }), 'objective');
  s = applyDecision(s, { type: 'launch', campaign: { setup: 'advantage', adSets: [draft] } });
  assert.equal(screenFor(s, view()), 'week');
  s = applyDecision(s, { type: 'endWeek', update: 'honest' });
  assert.equal(screenFor(s, view({ debriefWeek: 1 })), 'roundDebrief');
  assert.equal(screenFor(null, view()), 'menu');
  assert.equal(screenFor(s, view({ screen: 'settings' })), 'settings');
});

test('the setup editor offers exactly the engine\'s goals for instant forms', () => {
  const s = applyDecision(createRun({ seed: 3, businessId: 'medspa' }), { type: 'accept' });
  const draft = reconcileAdSet(s, blankAdSet({ location: 'instant_forms' }), 'location');
  const choices = setupChoices(s, draft);
  assert.deepEqual(choices.goals, goalOptions('leads', 'instant_forms', setupContext(s)));
  assert.equal(choices.showFormType, true);
  assert.equal(draft.formType, 'higher_intent');
  assert.equal(draft.event, null);
});

test('changing the objective resets location, goal and event to valid values', () => {
  const s = createRun({ seed: 4, businessId: 'medspa' });
  const d = reconcileAdSet(s, { ...blankAdSet(), objective: 'traffic' }, 'objective');
  assert.equal(d.location, 'website');
  assert.equal(d.goal, 'landing_page_views');
  assert.equal(d.event, null);
});

test('min age options respect the audience floor', () => {
  const s = createRun({ seed: 4, businessId: 'medspa' });
  assert.ok(!setupChoices(s, blankAdSet()).minAges.includes(13));
  assert.ok(setupChoices(s, blankAdSet({ audience: { option: 'limited', minAge: 18 } })).minAges.includes(13));
});

test('adSetChanges reports only what changed', () => {
  const a = { ...blankAdSet({ angles: ['x'] }) };
  assert.deepEqual(adSetChanges(a, { ...a }), {});
  assert.deepEqual(adSetChanges(a, { ...a, angles: ['y'] }), { angles: ['y'] });
});
