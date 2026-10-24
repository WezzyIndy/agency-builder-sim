// src/engine/counterfactual.js
//
// Counterfactual replay (spec 14.2, KTD8). Each failed rubric check that maps
// to a decision proposes one replacement. The run is replayed on the same
// seed with only that change, and the candidate with the biggest gain in true
// result is reported. Named RNG streams (KTD4) keep the brief and every
// draw unrelated to the change identical, so the delta is the decision's.
//
// Replays are lenient: decisions that no longer apply are skipped, new client
// events get the response closest to the player's own quality, and weeks past
// the original end are played with the player's usual update and no edits.

import { createRun, tryDecision, applyDecision } from './run.js';
import { clone, mean } from './math.js';
import { resolveSetup } from './metaRules.js';
import { isProhibited, angleFlag } from './policy.js';
import { contentFor } from '../content/index.js';

const MAX_CANDIDATES = 6;

function compliantAngles(businessId, angles) {
  const ok = angles.filter((id) => !isProhibited(angleFlag(businessId, id)));
  const fallback = contentFor(businessId).angles.filter((a) => a.policyFlag === 'none').map((a) => a.id);
  const out = [...new Set([...ok, ...fallback])];
  return out.slice(0, Math.max(1, Math.min(2, ok.length || 1)));
}

/** The planned setup a best-practice player would use for this brief. */
function plannedSetup(state) {
  if (state.brief.goal === 'sales') return { objective: 'sales', location: 'website', goal: 'conversions', event: 'initiate_checkout', formType: null };
  const o = state.onboarding;
  const restricted = state.brief.hidden.defects.dataRestricted;
  const landingBad = state.brief.hidden.defects.landingWeak && !o.fixed.landing;
  if (!restricted && !landingBad) return { objective: 'leads', location: 'website', goal: 'leads', event: 'lead', formType: null };
  const callsOk = !state.brief.hidden.defects.noCallTracking || o.fixed.calls;
  if (callsOk) return { objective: 'leads', location: 'calls', goal: 'calls', event: null, formType: null };
  return { objective: 'leads', location: 'instant_forms', goal: 'leads', event: null, formType: 'higher_intent' };
}

function mapCampaigns(decisions, fn) {
  return decisions.map((d) => {
    if (d.type === 'launch' || d.type === 'relaunch') return { ...d, campaign: { ...d.campaign, adSets: d.campaign.adSets.map(fn) } };
    if (d.type === 'addAdSet') return { ...d, adSet: fn(d.adSet) };
    return d;
  });
}

function insertBeforeFinish(decisions, extra) {
  const i = decisions.findIndex((d) => d.type === 'finishOnboarding');
  if (i < 0) return decisions;
  return [...decisions.slice(0, i), ...extra, ...decisions.slice(i)];
}

/** Candidate replacements keyed by rubric check id. Each returns { label, transform }. */
function candidatesFor(state) {
  const plan = plannedSetup(state);
  const content = contentFor(state.businessId);
  const isSales = state.brief.goal === 'sales';
  const objectiveName = isSales ? 'Sales' : 'Leads';
  const locationLabel = isSales ? 'the website' : plan.location === 'website' ? 'a website lead form' : plan.location === 'calls' ? 'calls' : 'higher-intent instant forms';
  const bestResponse = (eventId) => content.events.find((e) => e.id === eventId).responses.reduce((a, b) => (b.score > a.score ? b : a)).id;
  return {
    objective: {
      label: `Run the ${objectiveName} objective instead`,
      transform: (ds) => mapCampaigns(ds, (a) => ({ ...a, ...plan })),
    },
    location: {
      label: `Use ${locationLabel} as the conversion location`,
      transform: (ds) => mapCampaigns(ds, (a) => (a.objective === plan.objective ? { ...a, location: plan.location, goal: plan.goal, event: plan.event, formType: plan.formType } : a)),
    },
    goal: {
      label: isSales ? 'Optimize for initiate checkout until purchases pass 50 a week' : 'Optimize for the highest-volume real lead event',
      transform: (ds) =>
        mapCampaigns(ds, (a) => {
          if (isSales) return a.objective === 'sales' ? { ...a, location: 'website', goal: 'conversions', event: 'initiate_checkout' } : a;
          if (a.objective !== 'leads') return a;
          if (a.location === 'website') return { ...a, goal: 'leads', event: 'lead' };
          if (a.location === 'instant_forms') return { ...a, goal: 'leads' };
          return a;
        }),
    },
    adsets: {
      label: 'Consolidate into one ad set',
      transform: (ds) =>
        ds
          .map((d) => (d.type === 'launch' || d.type === 'relaunch' ? { ...d, campaign: { ...d.campaign, adSets: [{ ...d.campaign.adSets[0], budgetShare: 1 }] } } : d))
          .filter((d) => d.type !== 'addAdSet' && d.type !== 'setBudgetSplit'),
    },
    edits: {
      label: 'Hold steady: skip the mid-campaign edits',
      transform: (ds) => {
        const fixWeeks = new Set(state.edits.filter((e) => e.fix).map((e) => `${e.week}|${e.adSetId}`));
        let week = 1;
        return ds.filter((d) => {
          if (d.type === 'endWeek') week++;
          if (d.type === 'editAdSet' || d.type === 'setBudgetSplit') return fixWeeks.has(`${week}|${d.adSetId}`);
          return true;
        });
      },
    },
    audience: {
      label: 'Use Advantage+ audience with location and 18+ as controls',
      transform: (ds) => mapCampaigns(ds, (a) => ({ ...a, audience: { option: 'controls', minAge: Math.max(18, a.audience?.minAge ?? 18) } })),
    },
    angles: {
      label: 'Test two angles at most',
      transform: (ds) => mapCampaigns(ds, (a) => ({ ...a, angles: a.angles.slice(0, 2) })),
    },
    policy: {
      label: 'Use compliant copy only',
      transform: (ds) =>
        mapCampaigns(ds, (a) => ({ ...a, angles: compliantAngles(state.businessId, a.angles) })).map((d) =>
          d.type === 'editAdSet' && d.changes.angles ? { ...d, changes: { ...d.changes, angles: compliantAngles(state.businessId, d.changes.angles) } } : d,
        ),
    },
    age: {
      label: 'Target 18+ on every ad set',
      transform: (ds) => mapCampaigns(ds, (a) => ({ ...a, audience: { ...a.audience, minAge: Math.max(18, a.audience?.minAge ?? 18) } })),
    },
    audit: {
      label: 'Audit the tracking before launch',
      transform: (ds) => insertBeforeFinish(ds, content.checks.filter((c) => c.tracking && !state.onboarding.audited[c.id]).map((c) => ({ type: 'audit', check: c.id }))),
    },
    critical: {
      label: 'Fix or disclose the critical tracking defect',
      transform: (ds) => {
        const extra = [];
        for (const c of content.checks.filter((x) => x.critical)) {
          const has = state.brief.hidden.defects[c.defectKey];
          if (!has || state.onboarding.fixed[c.id] || state.onboarding.disclosed[c.id]) continue;
          if (!state.onboarding.audited[c.id]) extra.push({ type: 'audit', check: c.id });
          extra.push(c.fixHours ? { type: 'fix', check: c.id } : { type: 'disclose', check: c.id });
        }
        return insertBeforeFinish(ds, extra);
      },
    },
    updates: {
      label: 'Send an honest update every week',
      transform: (ds) => ds.map((d) => (d.type === 'endWeek' ? { ...d, update: 'honest' } : d)),
    },
    events: {
      label: 'Give the strongest response to each client event',
      transform: (ds) => {
        let i = 0;
        return ds.map((d) => (d.type === 'respondEvent' ? { ...d, response: bestResponse(state.eventLog[i++].id) } : d));
      },
    },
  };
}

function usualUpdate(state) {
  const counts = {};
  for (const u of state.updates) counts[u] = (counts[u] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'honest';
}

/** Response for an event the original run never saw: closest to the player's average quality. */
function fallbackResponse(state, eventId, playerQuality) {
  const event = contentFor(state.businessId).events.find((e) => e.id === eventId);
  const best = Math.max(...event.responses.map((r) => r.score));
  return event.responses.reduce((a, b) => (Math.abs(b.score / best - playerQuality) < Math.abs(a.score / best - playerQuality) ? b : a)).id;
}

export function lenientReplay(state, decisions) {
  const quality = mean(state.eventLog.map((e) => e.score / e.best)) ?? 0.7;
  const update = usualUpdate(state);
  let s = createRun(state.options);
  const answer = () => {
    s = applyDecision(s, { type: 'respondEvent', response: fallbackResponse(s, s.pendingEvent.id, quality) });
  };
  for (const d of decisions) {
    if (s.status === 'final') break;
    if (d.type === 'respondEvent') {
      if (!s.pendingEvent) continue;
      const r = tryDecision(s, d);
      if (r.ok) s = r.state;
      else answer();
      continue;
    }
    if (s.pendingEvent && s.status === 'running') answer();
    if (s.status === 'final') break;
    const r = tryDecision(s, d);
    if (r.ok) s = r.state;
  }
  for (let guard = 0; s.status === 'running' && guard < 40; guard++) {
    if (s.pendingEvent) answer();
    else s = applyDecision(s, { type: 'endWeek', update });
  }
  if (s.status === 'onboarding') s = applyDecision(s, { type: 'finishOnboarding' });
  return s;
}

function outcome(s) {
  const f = s.final;
  return {
    endReason: f.endReason,
    qaCpl: f.totals?.qaCpl ?? null,
    trueCpl: f.totals?.trueCpl ?? null,
    jobs: f.totals?.jobs ?? 0,
    clientProfit: f.clientProfit?.afterFee ?? null,
    satisfaction: f.satisfaction,
    performance: f.performance,
  };
}

const FAILED = ['churn', 'budget_failure', 'target_failure', 'client_ended'];

/**
 * Gain from a change: lower quality-adjusted CPL is better (no result is worst),
 * keeping a client who otherwise failed counts heavily, and satisfaction breaks ties.
 */
function gain(before, after) {
  const b = before.qaCpl ?? Infinity;
  const a = after.qaCpl ?? Infinity;
  let g;
  if (Number.isFinite(b) && Number.isFinite(a)) g = (b - a) / b;
  else if (!Number.isFinite(b) && Number.isFinite(a)) g = 1;
  else if (Number.isFinite(b) && !Number.isFinite(a)) g = -1;
  else g = 0;
  if (FAILED.includes(before.endReason) && !FAILED.includes(after.endReason)) g += 0.5;
  if (!FAILED.includes(before.endReason) && FAILED.includes(after.endReason)) g -= 0.5;
  return g + (after.satisfaction - before.satisfaction) / 200;
}

/**
 * Returns { found, label, checkId, before, after, delta, tried } or { found: false }.
 */
export function computeCounterfactual(state) {
  if (!state.final || state.final.endReason === 'declined') return { found: false, reason: 'declined', tried: 0 };
  const failed = state.final.rubric.checks.filter((c) => c.pass === false).map((c) => c.id);
  const all = candidatesFor(state);
  const ids = failed.filter((id) => all[id]).slice(0, MAX_CANDIDATES);
  const before = outcome(state);
  let best = null;
  for (const id of ids) {
    const replayed = lenientReplay(state, all[id].transform(clone(state.decisions)));
    const after = outcome(replayed);
    const g = gain(before, after);
    if (!best || g > best.gain) best = { checkId: id, label: all[id].label, after, gain: g };
  }
  if (!best || best.gain <= 0.02) return { found: false, reason: ids.length ? 'no_gain' : 'nothing_failed', tried: ids.length };
  const delta = {
    qaCpl: before.qaCpl !== null && best.after.qaCpl !== null ? best.after.qaCpl - before.qaCpl : null,
    jobs: best.after.jobs - before.jobs,
    clientProfit: before.clientProfit !== null && best.after.clientProfit !== null ? best.after.clientProfit - before.clientProfit : null,
    satisfaction: best.after.satisfaction - before.satisfaction,
  };
  return { found: true, checkId: best.checkId, label: best.label, before, after: best.after, delta, tried: ids.length };
}

/** For tests and debugging: is this ad set config a trap for the business's goal? */
export function isTrap(adSet, goal = 'leads') {
  return resolveSetup(adSet, goal).kind === 'trap';
}
