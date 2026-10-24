// tests/helpers.js
//
// Shared builders for run-level tests.

import { createRun, applyDecision } from '../src/engine/run.js';
import { contentFor } from '../src/content/index.js';

export const websiteAdSet = (overrides = {}) => ({
  objective: 'leads',
  location: 'website',
  goal: 'leads',
  event: 'lead',
  audience: { option: 'controls', minAge: 18 },
  angles: ['expert_injectors'],
  budgetShare: 1,
  ...overrides,
});

/** Finds a seed whose brief matches a predicate. */
export function findSeed(predicate, options = {}, start = 1) {
  for (let seed = start; seed < start + 5000; seed++) {
    const s = createRun({ seed, businessId: 'medspa', level: 1, realism: 3, ...options });
    if (predicate(s.brief)) return seed;
  }
  throw new Error('No seed matched');
}

export function apply(state, ...decisions) {
  return decisions.reduce((s, d) => applyDecision(s, d), state);
}

/** A run that has been accepted, onboarded with no work, and launched. */
export function launched(seed, campaign = { setup: 'advantage', adSets: [websiteAdSet()] }, options = {}) {
  const s = createRun({ seed, businessId: 'medspa', level: 1, realism: 3, forceClass: 'achievable', ...options });
  return apply(s, { type: 'accept' }, { type: 'finishOnboarding' }, { type: 'launch', campaign });
}

/** Ends weeks with honest updates, answering any event with its first response. */
export function playWeeks(state, n, update = 'honest') {
  let s = state;
  for (let i = 0; i < n && s.status === 'running'; i++) {
    if (s.pendingEvent) s = applyDecision(s, { type: 'respondEvent', response: firstResponse(s) });
    if (s.status !== 'running') break;
    s = applyDecision(s, { type: 'endWeek', update });
  }
  return s;
}

function firstResponse(state) {
  const event = contentFor(state.businessId).events.find((e) => e.id === state.pendingEvent.id);
  return event.responses[0].id;
}
