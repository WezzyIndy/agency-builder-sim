// harness/policies.js
//
// Scripted players for the calibration harness (spec 16). Each policy is a
// function (state, rng) -> list of decisions for the current status. They
// drive the same run reducer the UI uses (KTD3).
//
//   bestPractice - passes every applicable 13.4 rubric check
//   naive        - wrong-but-common: Traffic objective, 4 ad sets on an L1 budget,
//                  hard-limited audience, weekly edits, risky copy, spun updates
//   random       - random valid choices within the Leads objective (wrong objectives are
//                  the naive policy's job; a uniformly random objective is a trap 4 times in 5)

import { contentFor } from '../src/content/index.js';
import { setupContext, effectiveDefects, currentWeeklyBudget } from '../src/engine/run.js';
import { OBJECTIVES, goalOptions, eventOptions, needsEvent, AUDIENCE_OPTIONS, objectiveForGoal, resolveSetup } from '../src/engine/metaRules.js';
import { briefBench } from '../src/engine/week.js';
import { isProhibited } from '../src/engine/policy.js';
import { TUNABLES } from '../src/config/tunables.js';

const CRITICAL_FIRST = ['pixel', 'data_source'];

function bestEventResponse(state) {
  const event = contentFor(state.businessId).events.find((e) => e.id === state.pendingEvent.id);
  return event.responses.reduce((a, b) => (b.score > a.score ? b : a)).id;
}

// ---------------------------------------------------------------- best practice

function bestOnboarding(state) {
  const checks = contentFor(state.businessId).checks;
  const out = checks.map((c) => ({ type: 'audit', check: c.id }));
  if (contentFor(state.businessId).naming) out.push({ type: 'naming', choice: 'neutral' });
  return out;
}

function bestOnboardingFollowUp(state) {
  const o = state.onboarding;
  const left = () => TUNABLES.onboardingHours - o.hoursUsed;
  const checks = contentFor(state.businessId).checks;
  const has = (id) => o.audited[id]?.hasDefect;
  const out = [];
  let budget = left();
  const blocked = state.brief.redFlag === 'no_access';
  const tryFix = (id) => {
    const c = checks.find((x) => x.id === id);
    if (has(id) && c.fixHours && !o.fixed[id] && !out.some((d) => d.type === 'fix' && d.check === id) && c.fixHours <= budget && !(blocked && ['pixel', 'capi', 'landing', 'crm'].includes(id))) {
      out.push({ type: 'fix', check: id });
      budget -= c.fixHours;
      return true;
    }
    return false;
  };
  tryFix('pixel');
  if (state.brief.goal === 'sales') {
    tryFix('landing');
    tryFix('capi');
  }
  if (has('speed') && budget >= 0.5) {
    out.push({ type: 'advise', check: 'speed' });
    budget -= 0.5;
  }
  // The rest of the time goes where it matters most for the planned setup.
  const plan = planLocation(state, { assumeFixed: out.filter((d) => d.type === 'fix').map((d) => d.check) });
  if (plan === 'calls') tryFix('calls');
  if (plan === 'website') tryFix('landing') || tryFix('capi');
  tryFix('calls');
  // Disclose everything left unfixed. Disclosure is free and honest.
  for (const c of [...CRITICAL_FIRST, ...checks.map((x) => x.id)]) {
    const fixed = out.some((d) => d.type === 'fix' && d.check === c) || o.fixed[c];
    if (has(c) && !fixed && !o.disclosed[c] && !out.some((d) => d.type === 'disclose' && d.check === c)) out.push({ type: 'disclose', check: c });
  }
  out.push({ type: 'finishOnboarding' });
  return out;
}

/** Where should leads go? website form, calls, or higher-intent instant forms. */
function planLocation(state, { assumeFixed = [] } = {}) {
  const d = state.brief.hidden.defects;
  const fixed = (id) => state.onboarding.fixed[id] || assumeFixed.includes(id);
  const restricted = state.onboarding.audited.data_source?.hasDefect;
  const landingBad = state.onboarding.audited.landing?.hasDefect && !fixed('landing');
  if (!restricted && !landingBad) return 'website';
  const callsOk = !d.noCallTracking || fixed('calls');
  return callsOk ? 'calls' : 'instant';
}

/** Ecomm: the purchase-path event whose expected weekly volume is closest to 50 (7.4). */
function salesEvent(state) {
  const cpa = briefBench(state.brief).cost;
  const weekly = currentWeeklyBudget(state);
  const E = TUNABLES.ecomm.events;
  const dist = (ev) => Math.abs((weekly / (cpa * E[ev].cpl)) * E[ev].eventsPerPurchase - TUNABLES.learning.eventsToExit);
  return ['initiate_checkout', 'add_to_cart'].reduce((a, b) => (dist(b) < dist(a) ? b : a));
}

function bestCampaign(state) {
  const base = { audience: { option: 'controls', minAge: 18 }, angles: [...contentFor(state.businessId).recommended.angles], budgetShare: 1 };
  if (state.brief.goal === 'sales') {
    return { setup: 'advantage', adSets: [{ ...base, objective: 'sales', location: 'website', goal: 'conversions', event: salesEvent(state) }] };
  }
  const plan = planLocation(state);
  let adSet;
  if (plan === 'website') adSet = { ...base, objective: 'leads', location: 'website', goal: 'leads', event: 'lead' };
  else if (plan === 'calls') adSet = { ...base, objective: 'leads', location: 'calls', goal: 'calls' };
  else adSet = { ...base, objective: 'leads', location: 'instant_forms', goal: 'leads', formType: 'higher_intent' };
  return { setup: 'advantage', adSets: [adSet] };
}

export function bestPractice(state) {
  switch (state.status) {
    case 'brief':
      return [state.brief.intakeNotes.some((n) => n.signal === 'red_flag') ? { type: 'decline' } : { type: 'accept' }];
    case 'onboarding':
      return Object.keys(state.onboarding.audited).length === 0 ? bestOnboarding(state) : bestOnboardingFollowUp(state);
    case 'setup':
      return [{ type: 'launch', campaign: bestCampaign(state) }];
    case 'running': {
      if (state.pendingEvent) return [{ type: 'respondEvent', response: bestEventResponse(state) }];
      const out = [];
      // One planned creative refresh to beat fatigue: the only non-fix edit in the run.
      const next = state.weekIndex + 1;
      const a = state.campaign.adSets[0];
      if (next === 5 && state.campaign.adSets.length === 1 && a.angleStartWeek < 4) {
        out.push({ type: 'editAdSet', adSetId: a.id, changes: { angles: [...contentFor(state.businessId).recommended.refresh] } });
      }
      out.push({ type: 'endWeek', update: 'honest' });
      return out;
    }
    default:
      return [];
  }
}

// ---------------------------------------------------------------- naive

export function naive(state) {
  switch (state.status) {
    case 'brief':
      return [{ type: 'accept' }];
    case 'onboarding':
      return [{ type: 'audit', check: 'pixel' }, { type: 'finishOnboarding' }];
    case 'setup': {
      const angles = contentFor(state.businessId).angles.map((a) => a.id);
      const adSets = [0, 1, 2, 3].map((i) => ({
        objective: 'traffic',
        location: 'website',
        goal: 'link_clicks',
        audience: { option: 'limited', minAge: 25 },
        angles: [angles[(i + 2) % angles.length], angles[(i + 3) % angles.length], angles[(i + 4) % angles.length]],
        budgetShare: 0.25,
      }));
      return [{ type: 'launch', campaign: { setup: 'manual', adSets } }];
    }
    case 'running': {
      if (state.pendingEvent) {
        const event = contentFor(state.businessId).events.find((e) => e.id === state.pendingEvent.id);
        // Naive picks the response that pleases the client right now.
        return [{ type: 'respondEvent', response: event.responses.reduce((a, b) => (b.relationship > a.relationship ? b : a)).id }];
      }
      const angles = contentFor(state.businessId).angles.map((a) => a.id);
      const week = state.weekIndex + 1;
      // Weekly tinkering: rotate angles on every ad set.
      const edits = state.campaign.adSets.map((a, i) => ({
        type: 'editAdSet',
        adSetId: a.id,
        changes: { angles: [angles[(week + i) % angles.length], angles[(week + i + 1) % angles.length]] },
      }));
      const last = state.weeks[state.weeks.length - 1];
      const update = last && last.results !== null && last.results < 70 ? 'spun' : 'honest';
      return [...(week > 1 ? edits : []), { type: 'endWeek', update }];
    }
    default:
      return [];
  }
}

// ---------------------------------------------------------------- random

function randomAdSet(state, rng, objective) {
  const ctx = setupContext(state);
  const angles = contentFor(state.businessId).angles.map((a) => a.id);
  for (let tries = 0; tries < 50; tries++) {
    const locs = Object.keys(OBJECTIVES[objective].locations);
    const location = rng.pick(locs);
    const goals = goalOptions(objective, location, ctx).filter((g) => g.available);
    if (!goals.length) continue;
    const goal = rng.pick(goals).id;
    let event = null;
    if (needsEvent(objective, location, goal)) {
      const evs = eventOptions(objective, location, goal, ctx).filter((e) => e.available);
      if (!evs.length) continue;
      event = rng.pick(evs).id;
    }
    // Random means random within real setups; trap goals are the naive policy's job.
    if (resolveSetup({ objective, location, goal, event, formType: 'higher_intent' }, state.brief.goal).kind === 'trap') continue;
    const aud = rng.pick(AUDIENCE_OPTIONS);
    const minAge = aud.id === 'limited' ? rng.pick([18, 18, 21, 25]) : rng.pick([18, 21, 25]);
    const n = rng.int(1, 3);
    return {
      objective,
      location,
      goal,
      event,
      formType: rng.pick(['volume', 'higher_intent']),
      audience: { option: aud.id, minAge },
      angles: rng.shuffle(angles).slice(0, n),
      budgetShare: rng.uniform(0.2, 1),
    };
  }
  throw new Error('Could not build a random ad set');
}

export function random(state, rng) {
  switch (state.status) {
    case 'brief':
      return [{ type: 'accept' }];
    case 'onboarding': {
      const checks = contentFor(state.businessId).checks;
      const out = [];
      let hours = 0;
      for (const c of rng.shuffle(checks)) {
        if (rng.chance(0.6) && hours + c.auditHours <= TUNABLES.onboardingHours) {
          out.push({ type: 'audit', check: c.id });
          hours += c.auditHours;
        }
      }
      if (contentFor(state.businessId).naming && rng.chance(0.5)) out.push({ type: 'naming', choice: rng.pick(['neutral', 'sensitive']) });
      out.push({ type: 'finishOnboarding' });
      return out;
    }
    case 'setup': {
      const objective = objectiveForGoal(state.brief.goal);
      const n = rng.int(1, 3);
      return [{ type: 'launch', campaign: { setup: rng.pick(['advantage', 'manual']), adSets: Array.from({ length: n }, () => randomAdSet(state, rng, objective)) } }];
    }
    case 'running': {
      if (state.pendingEvent) {
        const event = contentFor(state.businessId).events.find((e) => e.id === state.pendingEvent.id);
        return [{ type: 'respondEvent', response: rng.pick(event.responses).id }];
      }
      const out = [];
      if (rng.chance(0.3)) {
        const a = rng.pick(state.campaign.adSets);
        const angles = contentFor(state.businessId).angles.map((x) => x.id);
        out.push({ type: 'editAdSet', adSetId: a.id, changes: { angles: rng.shuffle(angles).slice(0, rng.int(1, 2)) } });
      }
      out.push({ type: 'endWeek', update: rng.weighted(['honest', 'spun', 'skip'], [0.6, 0.25, 0.15]) });
      return out;
    }
    default:
      return [];
  }
}

export const POLICIES = { bestPractice, naive, random };

/** Uses only facts a skilled player can see; exported for tests. */
export function usesProhibitedCopy(state) {
  return state.campaign?.adSets.some((a) => a.angles.some((id) => isProhibited(contentFor(state.businessId).angles.find((x) => x.id === id).policyFlag)));
}

export { effectiveDefects };
