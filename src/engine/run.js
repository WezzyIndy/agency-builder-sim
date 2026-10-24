// src/engine/run.js
//
// The run lifecycle as a pure reducer (KTD3). A run is a JSON-safe state
// object; every player action is a plain decision object. applyDecision
// returns a new state or throws RunError with a player-readable message.
// The UI, the harness policies, autosave, and counterfactual replay all go
// through this one API.
//
// Statuses: brief -> onboarding -> setup -> running -> final
//
// Decisions:
//   accept | decline
//   audit {check} | fix {check} | advise {check} | disclose {check} | naming {choice} | finishOnboarding
//   launch {campaign}
//   editAdSet {adSetId, changes} | setBudgetSplit {shares} | addAdSet {adSet} | removeAdSet {adSetId}
//   relaunch {campaign}
//   respondEvent {response}
//   endWeek {update: honest|spun|skip}

import { stream } from './rng.js';
import { clamp, clone, sum } from './math.js';
import { generateBrief, briefCloseRate } from './brief.js';
import { simulateWeek } from './week.js';
import { validateAdSet, resolveSetup } from './metaRules.js';
import { resultsScore, satisfactionScore, checkFailure } from './satisfaction.js';
import { computeFinal } from './scoring.js';
import { isProhibited, angleFlag } from './policy.js';
import { contentFor } from '../content/index.js';
import { TUNABLES } from '../config/tunables.js';
import { DEFAULT_TARGET_HOURLY } from '../config/fees.js';

const T = TUNABLES;
// v2 (M4): weeks record value units, revenue, and gross profit; v1 saves are discarded.
export const RUN_VERSION = 2;

export class RunError extends Error {}
const fail = (msg) => {
  throw new RunError(msg);
};

/** Checks the client blocks when they refuse website and tracking access (red flag). */
const NO_ACCESS_BLOCKS = ['pixel', 'capi', 'landing', 'crm'];

export function createRun({ seed, businessId = 'medspa', level = 1, realism = 3, mode = 'ads', forceClass = null, targetHourly = DEFAULT_TARGET_HOURLY }) {
  if (!Number.isInteger(realism) || realism < 1 || realism > 5) fail('Realism must be 1-5');
  const brief = generateBrief(seed, { businessId, level, forceClass });
  return {
    v: RUN_VERSION,
    seed,
    mode,
    businessId,
    level,
    realism,
    targetHourly,
    options: { seed, businessId, level, realism, mode, forceClass, targetHourly },
    status: 'brief',
    brief,
    onboarding: { hoursUsed: 0, audited: {}, fixed: {}, disclosed: {}, advised: {}, naming: null },
    campaign: null,
    campaignCount: 0,
    campaignStartWeeks: [],
    weekIndex: 0,
    weeks: [],
    relationship: T.satisfaction.relationshipStart,
    satisfactionHistory: [],
    fee: { ...brief.fee },
    budgetFactor: 1,
    boost: null,
    demand: null,
    closeMultExtra: 1,
    marginMult: 1,
    speedAdvised: false,
    midFixed: {},
    corruptWeeks: 0,
    qualifiedWeeks: {},
    pendingEvent: null,
    firedEvents: [],
    eventLog: [],
    spunPending: null,
    edits: [],
    updates: [],
    hours: { onboarding: 0, weekly: [] },
    pendingHours: 0,
    endReason: null,
    decisions: [],
    final: null,
  };
}

// ---------------------------------------------------------------- helpers

export function checkHasDefect(state, checkId) {
  const check = contentFor(state.businessId).checks.find((c) => c.id === checkId);
  if (!check) fail(`Unknown check ${checkId}`);
  if (check.defectKey === 'slowSpeed') return state.brief.hidden.speedToLead === 'slow';
  return Boolean(state.brief.hidden.defects[check.defectKey]);
}

/** Tracking defects after onboarding and mid-campaign fixes. */
export function effectiveDefects(state) {
  const d = { ...state.brief.hidden.defects };
  for (const c of contentFor(state.businessId).checks) {
    if (c.fixHours && state.onboarding.fixed[c.id]) d[c.defectKey] = false;
  }
  for (const key of Object.keys(state.midFixed)) d[key] = false;
  return d;
}

/** Context Meta setup validation needs: data restriction, CRM, naming. */
export function setupContext(state) {
  const d = effectiveDefects(state);
  return {
    dataRestricted: Boolean(state.brief.hidden.defects.dataRestricted),
    crmFixed: !d.noCrm,
    sensitiveNames: state.onboarding.naming === 'sensitive',
    isEcomm: state.brief.goal === 'sales',
  };
}

function speedState(state) {
  const s = state.brief.hidden.speedToLead;
  if (s === 'slow' && state.speedAdvised) return 'slowAdvised';
  return s;
}

function angleIds(state) {
  return contentFor(state.businessId).angles.map((a) => a.id);
}

function normalizeAdSet(input, id, week) {
  return {
    id,
    objective: input.objective,
    location: input.location,
    goal: input.goal,
    event: input.event ?? null,
    formType: input.formType ?? null,
    audience: { option: input.audience?.option, minAge: input.audience?.minAge ?? 18 },
    angles: [...(input.angles || [])],
    budgetShare: input.budgetShare ?? 1,
    paused: false,
    startWeek: week,
    angleStartWeek: week,
    resetWeek: week,
  };
}

function normalizeShares(adSets) {
  const total = sum(adSets.map((a) => a.budgetShare));
  if (!(total > 0)) fail('Budget split must add up to more than zero');
  for (const a of adSets) a.budgetShare /= total;
}

function nextAdSetId(state) {
  const n = (state.campaign?.adSets || []).reduce((m, a) => Math.max(m, Number(a.id.slice(2)) || 0), 0);
  return `as${n + 1}`;
}

function buildCampaign(state, input, week) {
  if (!input || !Array.isArray(input.adSets) || input.adSets.length === 0) fail('A campaign needs at least one ad set');
  if (input.adSets.length > 6) fail('Six ad sets is the most this game allows');
  if (!['advantage', 'manual'].includes(input.setup)) fail('Pick Advantage+ or manual setup');
  const ctx = setupContext(state);
  const ids = angleIds(state);
  const adSets = input.adSets.map((a, i) => normalizeAdSet(a, `as${i + 1}`, week));
  adSets.forEach((a, i) => {
    const errors = validateAdSet(a, ctx, ids);
    if (errors.length) fail(`Ad set ${i + 1}: ${errors[0]}`);
    if (!(a.budgetShare > 0)) fail(`Ad set ${i + 1}: budget share must be above zero`);
  });
  if (adSets.some((a) => a.objective !== adSets[0].objective)) fail('Every ad set in a campaign shares one objective');
  normalizeShares(adSets);
  return { setup: input.setup, objective: adSets[0].objective, adSets, pauseWeek: null };
}

function findAdSet(state, id) {
  const a = state.campaign?.adSets.find((x) => x.id === id);
  if (!a) fail(`No ad set ${id}`);
  return a;
}

/** An edit is a fix when it corrects an error: a disapproval last week, or a trap setup. */
function editIsFix(state, adSet) {
  const last = state.weeks[state.weeks.length - 1];
  const lastResult = last?.adSets.find((x) => x.id === adSet.id);
  if (lastResult?.disapproved) return true;
  return resolveSetup(adSet, state.brief.goal).kind === 'trap';
}

function recordEdit(state, adSet, kind, fix = null) {
  const week = state.weekIndex + 1;
  state.edits.push({ week, adSetId: adSet.id, kind, fix: fix ?? editIsFix(state, adSet) });
  adSet.resetWeek = week;
}

// ---------------------------------------------------------------- reducer

export function applyDecision(prev, decision) {
  if (!decision || typeof decision.type !== 'string') fail('Unknown decision');
  if (prev.status === 'final') fail('This run is over');
  const state = clone(prev);
  const handler = HANDLERS[decision.type];
  if (!handler) fail(`Unknown decision ${decision.type}`);
  handler(state, decision);
  state.decisions.push(decision);
  if (state.status === 'final' && !state.final) state.final = computeFinal(state);
  return state;
}

/** Non-throwing wrapper: { ok, state, error }. */
export function tryDecision(state, decision) {
  try {
    return { ok: true, state: applyDecision(state, decision), error: null };
  } catch (e) {
    if (e instanceof RunError) return { ok: false, state, error: e.message };
    throw e;
  }
}

/** Rebuilds a run from its options and decision log. lenient skips decisions that no longer apply. */
export function replay(options, decisions, { lenient = false } = {}) {
  let state = createRun(options);
  for (const d of decisions) {
    if (state.status === 'final') break;
    if (lenient) {
      const r = tryDecision(state, d);
      state = r.state;
    } else {
      state = applyDecision(state, d);
    }
  }
  return state;
}

function requireStatus(state, ...statuses) {
  if (!statuses.includes(state.status)) fail(`Not available during ${state.status}`);
}

function spendHours(state, hours) {
  const o = state.onboarding;
  if (o.hoursUsed + hours > T.onboardingHours + 1e-9) {
    fail(`Not enough onboarding hours left (${(T.onboardingHours - o.hoursUsed).toFixed(1)} h remaining)`);
  }
  o.hoursUsed += hours;
}

const HANDLERS = {
  accept(state) {
    requireStatus(state, 'brief');
    state.status = 'onboarding';
  },

  decline(state) {
    requireStatus(state, 'brief', 'onboarding', 'setup');
    state.endReason = 'declined';
    state.status = 'final';
  },

  audit(state, { check }) {
    requireStatus(state, 'onboarding');
    if (state.onboarding.audited[check]) fail('Already audited');
    const c = contentFor(state.businessId).checks.find((x) => x.id === check);
    if (!c) fail(`Unknown check ${check}`);
    spendHours(state, c.auditHours);
    state.onboarding.audited[check] = { hasDefect: checkHasDefect(state, check) };
  },

  fix(state, { check }) {
    requireStatus(state, 'onboarding');
    const c = contentFor(state.businessId).checks.find((x) => x.id === check);
    if (!c) fail(`Unknown check ${check}`);
    const a = state.onboarding.audited[check];
    if (!a) fail('Audit it first');
    if (!a.hasDefect) fail('Nothing to fix');
    if (!c.fixHours) fail('This can\'t be fixed in onboarding, only disclosed and planned around');
    if (state.onboarding.fixed[check]) fail('Already fixed');
    if (state.brief.redFlag === 'no_access' && NO_ACCESS_BLOCKS.includes(check)) fail('The client won\'t give you website or tracking access');
    spendHours(state, c.fixHours);
    state.onboarding.fixed[check] = true;
  },

  advise(state, { check }) {
    requireStatus(state, 'onboarding');
    const c = contentFor(state.businessId).checks.find((x) => x.id === check);
    if (!c || !c.adviseHours) fail('Nothing to advise on here');
    const a = state.onboarding.audited[check];
    if (!a) fail('Audit it first');
    if (!a.hasDefect) fail('Nothing to advise on');
    if (state.onboarding.advised[check]) fail('Already advised');
    spendHours(state, c.adviseHours);
    state.onboarding.advised[check] = true;
    if (check === 'speed') state.speedAdvised = true;
  },

  disclose(state, { check }) {
    requireStatus(state, 'onboarding');
    const a = state.onboarding.audited[check];
    if (!a) fail('Audit it first');
    if (!a.hasDefect) fail('Nothing to disclose');
    if (state.onboarding.fixed[check]) fail('Already fixed');
    if (state.onboarding.disclosed[check]) fail('Already disclosed');
    state.onboarding.disclosed[check] = true;
  },

  naming(state, { choice }) {
    requireStatus(state, 'onboarding');
    const opt = contentFor(state.businessId).naming.find((n) => n.id === choice);
    if (!opt) fail('Unknown naming option');
    if (state.onboarding.naming) fail('Naming is already set');
    spendHours(state, opt.hours);
    state.onboarding.naming = choice;
  },

  finishOnboarding(state) {
    requireStatus(state, 'onboarding');
    const disclosed = Object.keys(state.onboarding.disclosed).length;
    state.relationship = clamp(state.relationship + Math.min(3, disclosed) * T.relationship.disclosedDefect, 0, 100);
    state.hours.onboarding = state.onboarding.hoursUsed;
    state.status = 'setup';
  },

  launch(state, { campaign }) {
    requireStatus(state, 'setup');
    state.campaign = buildCampaign(state, campaign, 1);
    state.campaignCount = 1;
    state.campaignStartWeeks = [1];
    state.status = 'running';
  },

  relaunch(state, { campaign }) {
    requireStatus(state, 'running');
    if (state.pendingEvent) fail('Respond to the client first');
    const week = state.weekIndex + 1;
    const oldWrong = state.campaign.adSets.some((a) => resolveSetup(a, state.brief.goal).kind === 'trap');
    state.campaign = buildCampaign(state, campaign, week);
    state.campaignCount++;
    for (const a of state.campaign.adSets) {
      state.edits.push({ week, adSetId: a.id, kind: 'relaunch', fix: oldWrong });
    }
  },

  editAdSet(state, { adSetId, changes }) {
    requireStatus(state, 'running');
    if (state.pendingEvent) fail('Respond to the client first');
    const a = findAdSet(state, adSetId);
    if (!changes || typeof changes !== 'object') fail('No changes');
    if ('objective' in changes && changes.objective !== a.objective) {
      fail('The objective is locked after launch. Relaunch as a new campaign to change it.');
    }
    const fixBefore = editIsFix(state, a);
    const next = { ...a, ...changes, audience: { ...a.audience, ...(changes.audience || {}) } };
    if (changes.angles) next.angles = [...changes.angles];
    const errors = validateAdSet(next, setupContext(state), angleIds(state));
    if (errors.length) fail(errors[0]);
    Object.assign(a, next);
    if (changes.angles) a.angleStartWeek = state.weekIndex + 1;
    recordEdit(state, a, Object.keys(changes).join('+'), fixBefore);
  },

  setBudgetSplit(state, { shares }) {
    requireStatus(state, 'running');
    if (state.pendingEvent) fail('Respond to the client first');
    const adSets = state.campaign.adSets;
    for (const a of adSets) {
      const s = shares[a.id];
      if (!(s >= 0)) fail('Every ad set needs a share');
    }
    const total = sum(adSets.map((a) => shares[a.id]));
    if (!(total > 0)) fail('Budget split must add up to more than zero');
    for (const a of adSets) {
      const share = shares[a.id] / total;
      if (Math.abs(share - a.budgetShare) > 0.005) {
        a.budgetShare = share;
        recordEdit(state, a, 'budget');
      }
      a.paused = share === 0;
    }
  },

  addAdSet(state, { adSet }) {
    requireStatus(state, 'running');
    if (state.pendingEvent) fail('Respond to the client first');
    if (state.campaign.adSets.length >= 6) fail('Six ad sets is the most this game allows');
    const week = state.weekIndex + 1;
    const a = normalizeAdSet({ ...adSet, objective: state.campaign.objective }, nextAdSetId(state), week);
    const errors = validateAdSet(a, setupContext(state), angleIds(state));
    if (errors.length) fail(errors[0]);
    const share = clamp(adSet.budgetShare ?? 1 / (state.campaign.adSets.length + 1), 0.05, 0.9);
    for (const x of state.campaign.adSets) {
      x.budgetShare *= 1 - share;
      recordEdit(state, x, 'budget');
    }
    a.budgetShare = share;
    state.campaign.adSets.push(a);
    state.edits.push({ week, adSetId: a.id, kind: 'new', fix: false });
  },

  removeAdSet(state, { adSetId }) {
    requireStatus(state, 'running');
    if (state.pendingEvent) fail('Respond to the client first');
    if (state.campaign.adSets.length <= 1) fail('A campaign needs at least one ad set');
    findAdSet(state, adSetId);
    state.campaign.adSets = state.campaign.adSets.filter((a) => a.id !== adSetId);
    normalizeShares(state.campaign.adSets);
    for (const a of state.campaign.adSets) recordEdit(state, a, 'budget', true);
  },

  respondEvent(state, { response }) {
    requireStatus(state, 'running');
    const ev = state.pendingEvent;
    if (!ev) fail('No client event to respond to');
    const event = contentFor(state.businessId).events.find((e) => e.id === ev.id);
    const r = event.responses.find((x) => x.id === response);
    if (!r) fail('Unknown response');
    state.relationship = clamp(state.relationship + r.relationship, 0, 100);
    for (const fx of r.effects) applyEffect(state, fx);
    const best = Math.max(...event.responses.map((x) => x.score));
    state.eventLog.push({ week: ev.week, id: ev.id, response, score: r.score, best });
    state.pendingEvent = null;
    state.pendingHours += T.hours.perEvent;
    if (state.endReason) state.status = 'final';
  },

  endWeek(state, { update }) {
    requireStatus(state, 'running');
    if (state.pendingEvent) fail('Respond to the client first');
    if (!['honest', 'spun', 'skip'].includes(update)) fail('Pick a client update');
    simulateAndAdvance(state, update);
  },
};

// ---------------------------------------------------------------- effects

function compliantReplacement(state) {
  return contentFor(state.businessId).angles.find((a) => a.policyFlag === 'none').id;
}

function applyEffect(state, fx) {
  const week = state.weekIndex + 1;
  const adSets = state.campaign?.adSets || [];
  switch (fx.type) {
    case 'pauseAll':
      state.campaign.pauseWeek = week;
      for (const a of adSets) a.resetWeek = week + 1;
      break;
    case 'budgetCut':
      state.budgetFactor *= fx.factor;
      for (const a of adSets) recordEdit(state, a, 'budget', true);
      break;
    case 'budgetBoost':
      state.boost = { factor: fx.factor, from: week, to: week + fx.weeks - 1 };
      for (const a of adSets) recordEdit(state, a, 'budget', false);
      break;
    case 'consolidate': {
      const keep = adSets.slice().sort((a, b) => b.budgetShare - a.budgetShare)[0];
      keep.budgetShare = 1;
      state.campaign.adSets = [keep];
      if (adSets.length > 1) recordEdit(state, keep, 'consolidate', true);
      break;
    }
    case 'addAdSet': {
      if (adSets.length >= 6) break;
      const base = adSets[0];
      const a =
        fx.kind === 'boost'
          ? normalizeAdSet({ objective: 'engagement', location: 'on_ad_post', goal: 'post_engagement', audience: { option: 'controls', minAge: 18 }, angles: base.angles }, nextAdSetId(state), week)
          : normalizeAdSet({ ...base }, nextAdSetId(state), week);
      const share = fx.kind === 'boost' ? 0.2 : 0.3;
      for (const x of adSets) {
        x.budgetShare *= 1 - share;
        recordEdit(state, x, 'budget', false);
      }
      a.budgetShare = share;
      state.campaign.adSets.push(a);
      state.edits.push({ week, adSetId: a.id, kind: 'new', fix: false });
      break;
    }
    case 'switchToBoost': {
      const a = normalizeAdSet(
        { objective: 'engagement', location: 'on_ad_post', goal: 'post_engagement', audience: { option: 'controls', minAge: 18 }, angles: adSets[0].angles },
        'as1',
        week,
      );
      state.campaign = { setup: state.campaign.setup, objective: 'engagement', adSets: [a], pauseWeek: null };
      state.campaignCount++;
      state.edits.push({ week, adSetId: a.id, kind: 'relaunch', fix: false });
      break;
    }
    case 'swapCompliant': {
      const replacement = compliantReplacement(state);
      for (const a of adSets) {
        const bad = (id) => {
          const f = angleFlag(state.businessId, id);
          return isProhibited(f) || (fx.includeBeforeAfter && f === 'before_after');
        };
        if (a.angles.some(bad) || a.audience.minAge < 18) {
          const kept = a.angles.filter((id) => !bad(id));
          a.angles = kept.length ? kept : [replacement];
          a.audience.minAge = Math.max(18, a.audience.minAge);
          a.angleStartWeek = week;
          recordEdit(state, a, 'angles', true);
        }
      }
      break;
    }
    case 'higherIntent':
      for (const a of adSets) {
        if (a.formType === 'volume') {
          a.formType = 'higher_intent';
          recordEdit(state, a, 'formType', true);
        }
      }
      break;
    case 'adviseSpeed':
      state.speedAdvised = true;
      break;
    case 'feeDiscount':
      state.fee.monthly *= 1 - fx.pct;
      break;
    case 'feeSet':
      state.fee.monthly = fx.monthly;
      break;
    case 'demand':
      state.demand = { mult: fx.mult, from: week, to: week + fx.weeks - 1 };
      break;
    case 'resetLearning':
      for (const a of adSets) {
        a.angleStartWeek = week;
        recordEdit(state, a, 'creative', false);
      }
      break;
    case 'closeMult':
      state.closeMultExtra *= fx.mult;
      break;
    case 'marginCut':
      state.marginMult *= fx.mult;
      break;
    case 'fixDefect':
      state.midFixed[fx.defect] = true;
      for (const a of adSets) if (resolveSetup(a, state.brief.goal).usesPixel) recordEdit(state, a, 'tracking', true);
      break;
    case 'endRun':
      state.endReason = fx.reason;
      break;
    default:
      throw new Error(`Unknown effect ${fx.type}`);
  }
}

// ---------------------------------------------------------------- weekly loop

function weeklyBudget(state, week) {
  let b = state.brief.weeklyBudget * state.budgetFactor;
  if (state.boost && week >= state.boost.from && week <= state.boost.to) b *= state.boost.factor;
  return b;
}

function relationshipFromUpdate(update, results) {
  const R = T.relationship;
  const bad = results !== null && results < 70;
  if (update === 'skip') return { now: R.skipped, later: 0 };
  if (update === 'spun') return bad ? { now: R.spunNow, later: R.spunSurface } : { now: 0, later: 0 };
  return { now: bad ? R.honestBad : R.honestGood, later: 0 };
}

function simulateAndAdvance(state, update) {
  const week = state.weekIndex + 1;
  const brief = state.brief;
  const campaign = clone(state.campaign);
  if (campaign.pauseWeek === week) for (const a of campaign.adSets) a.paused = true;
  const defects = effectiveDefects(state);
  const closeRate = briefCloseRate(brief);
  const demandMult = state.demand && week >= state.demand.from && week <= state.demand.to ? state.demand.mult : 1;

  const r = simulateWeek({
    seed: state.seed,
    week,
    realism: state.realism,
    brief,
    campaign,
    weeklyBudget: weeklyBudget(state, week),
    defects,
    speedToLead: speedState(state),
    closeRate,
    closeMultExtra: state.closeMultExtra,
    demandMult,
    corruptWeeks: state.corruptWeeks,
    qualifiedWeeks: state.qualifiedWeeks,
  });

  // Signal counters for the following weeks.
  if (defects.doubleFire && r.adSets.some((a) => a.usesPixel && a.spend > 0)) state.corruptWeeks++;
  for (const a of r.adSets) {
    const setup = campaign.adSets.find((x) => x.id === a.id);
    if (a.spend > 0 && setup && resolveSetup(setup, brief.goal).qualified) state.qualifiedWeeks[a.id] = (state.qualifiedWeeks[a.id] || 0) + 1;
  }

  const entry = {
    week,
    totals: r.totals,
    adSets: r.adSets,
    weeklyBudget: weeklyBudget(state, week),
    setup: campaign.setup,
    config: campaign.adSets.map(({ id, objective, location, goal, event, formType, audience, angles, budgetShare, paused }) => ({
      id, objective, location, goal, event, formType, audience, angles, budgetShare, paused,
    })),
    update,
    edits: state.edits.filter((e) => e.week === week).length,
    event: state.eventLog.find((e) => e.week === week - 1) || null,
  };
  const weeks = [...state.weeks, entry];
  const results = resultsScore(weeks, brief.expectation);

  // Relationship: disapprovals, last week's spin surfacing, this week's update.
  let rel = state.relationship;
  rel += r.adSets.filter((a) => a.disapproved).length * T.policy.relationshipHit;
  if (state.spunPending) rel += state.spunPending;
  const u = relationshipFromUpdate(update, results);
  rel += u.now;
  state.spunPending = u.later || null;
  state.relationship = clamp(rel, 0, 100);

  const s = satisfactionScore(results, state.relationship);
  entry.results = results;
  entry.relationship = state.relationship;
  entry.satisfaction = s;
  state.weeks = weeks;
  state.satisfactionHistory.push(s);
  state.updates.push(update);
  state.weekIndex = week;

  const activeAdSets = campaign.adSets.filter((a) => !a.paused).length;
  state.hours.weekly.push(T.hours.base + T.hours.perAdSet * activeAdSets + T.hours.perEdit * entry.edits + state.pendingHours);
  state.pendingHours = 0;

  const failure = checkFailure({ weeks: state.weeks, satisfactionHistory: state.satisfactionHistory, brief });
  if (failure) {
    state.endReason = failure;
    state.status = 'final';
    return;
  }
  if (week >= brief.campaignWeeks) {
    state.endReason = 'completed';
    state.status = 'final';
    return;
  }
  state.pendingEvent = drawEvent(state, week, entry, closeRate);
}

// ---------------------------------------------------------------- events

function eventConditions(state, entry, closeRate) {
  const last2 = state.weeks.slice(-2);
  const leads = sum(last2.map((w) => w.totals.trueLeads));
  const jobs = sum(last2.map((w) => w.totals.jobs));
  const flags = entry.totals.disapprovedFlags;
  const prohibitedNow = flags.some((f) => isProhibited(f) || f === 'under_18');
  const reportedRatio = entry.totals.trueLeads > 0 ? entry.totals.reportedLeads / entry.totals.trueLeads : 0;
  const isSales = state.brief.goal === 'sales';
  const t = entry.totals;
  return {
    junkLeads: !isSales && leads >= 6 && jobs / leads < T.junkLeadsRatio * closeRate,
    // Ecomm: the platform sees a fraction of real orders (missing purchase event).
    purchaseGap: isSales && t.trueLeads >= 3 && reportedRatio <= 0.4 && !state.onboarding.disclosed.pixel,
    // HVAC: the last two weeks brought mostly service calls.
    serviceHeavy: Boolean(state.brief.econ.pools) && last2.length === 2 && sum(last2.map((w) => w.totals.replacementLeads ?? 0)) / Math.max(1, leads) < 0.15 && leads >= 6,
    reportingGap: reportedRatio >= 1.6 && entry.totals.reportedLeads >= 4 && !state.onboarding.disclosed.pixel,
    disapprovedProhibited: prohibitedNow,
    disapprovedBeforeAfter: !prohibitedNow && flags.includes('before_after'),
    highFeeShare: state.fee.monthly / state.brief.monthlyBudget >= 0.4,
    prohibitedActive: state.campaign.adSets.some((a) => !a.paused && a.angles.some((id) => isProhibited(angleFlag(state.businessId, id)))),
  };
}

function drawEvent(state, week, entry, closeRate) {
  const events = contentFor(state.businessId).events.filter((e) => !state.firedEvents.includes(e.id));
  const cond = eventConditions(state, entry, closeRate);
  const pick = (e) => {
    state.firedEvents.push(e.id);
    return { id: e.id, week };
  };
  const forced = events.find((e) => e.trigger.kind === 'forced' && e.trigger.redFlag === state.brief.redFlag && e.trigger.week === week);
  if (forced) return pick(forced);
  const auto = events.find((e) => e.trigger.kind === 'auto' && cond[e.trigger.when]);
  if (auto) return pick(auto);
  const rng = stream(state.seed, 'events', week);
  if (!rng.chance(T.eventChancePerWeek)) return null;
  const eligible = events.filter(
    (e) => e.trigger.kind === 'random' && week >= (e.trigger.minWeek || 1) && (!e.trigger.when || cond[e.trigger.when]),
  );
  if (!eligible.length) return null;
  return pick(rng.pick(eligible));
}

/** Weekly ad budget currently in effect (for UI display). */
export function currentWeeklyBudget(state) {
  return weeklyBudget(state, state.weekIndex + 1);
}
