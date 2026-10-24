// src/ui/flow.js
//
// DOM-free UI logic: which screen to show, and the option lists the setup
// editor offers (taken straight from the engine's Meta rules, so the UI can
// never offer a choice the engine rejects without saying why).

import { setupContext } from '../engine/run.js';
import {
  objectiveOptions,
  locationOptions,
  goalOptions,
  eventOptions,
  needsEvent,
  AUDIENCE_OPTIONS,
  MIN_AGES,
} from '../engine/metaRules.js';

/** view: { screen?: 'menu'|'settings'|'about', debriefWeek: number|null } */
export function screenFor(run, view) {
  if (view.screen === 'settings' || view.screen === 'menu') return view.screen;
  if (!run) return 'menu';
  if (view.debriefWeek !== null && view.debriefWeek !== undefined) return 'roundDebrief';
  switch (run.status) {
    case 'brief':
      return 'brief';
    case 'onboarding':
      return 'onboarding';
    case 'setup':
      return 'setup';
    case 'running':
      return 'week';
    case 'final':
      return 'final';
    default:
      return 'menu';
  }
}

export function blankAdSet(overrides = {}) {
  return {
    objective: 'leads',
    location: 'website',
    goal: 'leads',
    event: 'lead',
    formType: null,
    audience: { option: 'controls', minAge: 18 },
    angles: [],
    budgetShare: 1,
    ...overrides,
  };
}

/** First available option id, or null. */
const firstAvailable = (opts) => (opts.find((o) => o.available) || opts[0] || null)?.id ?? null;

/**
 * Normalizes a draft ad set after a field change so dependent fields stay
 * valid: changing the objective resets the location, which resets the goal,
 * which resets the event.
 */
export function reconcileAdSet(run, draft, changed) {
  const ctx = setupContext(run);
  const a = { ...draft, audience: { ...draft.audience } };
  const locs = locationOptions(a.objective);
  if (changed === 'objective' || !locs.some((l) => l.id === a.location)) a.location = locs[0]?.id ?? null;
  const goals = goalOptions(a.objective, a.location, ctx);
  if (['objective', 'location'].includes(changed) || !goals.some((g) => g.id === a.goal)) a.goal = firstAvailable(goals);
  if (needsEvent(a.objective, a.location, a.goal)) {
    const evs = eventOptions(a.objective, a.location, a.goal, ctx);
    if (!evs.some((e) => e.id === a.event && e.available)) a.event = firstAvailable(evs);
  } else a.event = null;
  const instant = ['instant_forms', 'website_instant', 'instant_messenger'].includes(a.location);
  if (instant && !a.formType) a.formType = 'higher_intent';
  if (!instant) a.formType = null;
  const aud = AUDIENCE_OPTIONS.find((o) => o.id === a.audience.option);
  if (aud && a.audience.minAge < aud.minAgeFloor) a.audience.minAge = aud.minAgeFloor;
  return a;
}

/** Every option list the setup editor shows for a draft ad set. */
export function setupChoices(run, draft) {
  const ctx = setupContext(run);
  return {
    objectives: objectiveOptions(),
    locations: locationOptions(draft.objective),
    goals: goalOptions(draft.objective, draft.location, ctx),
    events: needsEvent(draft.objective, draft.location, draft.goal) ? eventOptions(draft.objective, draft.location, draft.goal, ctx) : [],
    showFormType: ['instant_forms', 'website_instant', 'instant_messenger'].includes(draft.location),
    audiences: AUDIENCE_OPTIONS,
    minAges: MIN_AGES.filter((m) => m >= (AUDIENCE_OPTIONS.find((o) => o.id === draft.audience.option)?.minAgeFloor ?? 18)),
  };
}

/** Fields that changed between an ad set and its edited draft (for editAdSet). */
export function adSetChanges(original, draft) {
  const changes = {};
  for (const k of ['location', 'goal', 'event', 'formType']) if (original[k] !== draft[k]) changes[k] = draft[k];
  if (original.audience.option !== draft.audience.option || original.audience.minAge !== draft.audience.minAge) changes.audience = { ...draft.audience };
  if (original.angles.join('|') !== draft.angles.join('|')) changes.angles = [...draft.angles];
  return changes;
}
