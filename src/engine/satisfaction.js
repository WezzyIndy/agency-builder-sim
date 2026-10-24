// src/engine/satisfaction.js
//
// Weekly client Satisfaction (spec 13.3) and failure states (13.5).
//
//   S_week = 0.7 x Results_week + 0.3 x Relationship_week
//   Results_week = 100 x min(1, promised / actual true CPL)^exponent, trailing 2 weeks,
//                  where true CPL counts bookings at the brief's close rate
//   During a promised ramp, the promised cost is relaxed x1.5. No ramp promised, no relaxation.
//
// Both targets are measured on true outcomes, never platform-reported ones.
// The Business target uses a quality-adjusted CPL (spend per lead at the
// brief's close rate), so cheap leads that don't book don't count as a win.

import { safeDiv, sum, clamp } from './math.js';
import { TUNABLES } from '../config/tunables.js';

const T = TUNABLES;

function trailing(weeks, n = 2) {
  const w = weeks.slice(-n);
  return {
    spend: sum(w.map((x) => x.totals.spend)),
    trueLeads: sum(w.map((x) => x.totals.trueLeads)),
    jobs: sum(w.map((x) => x.totals.jobs)),
  };
}

/**
 * Results_week (0-100) against the Promise. weeks includes the week just simulated.
 * The client judges on true outcomes (9.4): their cost per lead counted the way they
 * count it, as bookings at their usual close rate. Cheap leads that never book don't help.
 */
export function resultsScore(weeks, promise, closeRate) {
  const t = trailing(weeks);
  const week = weeks.length;
  if (t.spend === 0) return null; // nothing delivered: nothing to judge (e.g., paused week)
  const actual = qualityAdjustedCpl(t.spend, t.jobs, closeRate);
  if (actual === null) return 0;
  const inRamp = promise.rampWeeks > 0 && week <= promise.rampWeeks;
  const promised = promise.cost * (inRamp ? T.satisfaction.rampRelax : 1);
  return 100 * Math.min(1, promised / actual) ** T.satisfaction.resultsExponent;
}

/** S_week. When nothing ran (results null), the client judges on the relationship and the stall. */
export function satisfactionScore(results, relationship) {
  const r = results === null ? 50 : results;
  return T.satisfaction.resultsWeight * r + (1 - T.satisfaction.resultsWeight) * clamp(relationship, 0, 100);
}

/** Quality-adjusted CPL: spend per lead, counting leads at the brief's close rate. */
export function qualityAdjustedCpl(spend, jobs, briefCloseRate) {
  if (spend <= 0) return null;
  return safeDiv(spend, jobs / briefCloseRate);
}

/**
 * Failure check after a week. Returns null or a failure reason.
 * state: { weeks, satisfactionHistory, brief, closeRate }
 */
export function checkFailure({ weeks, satisfactionHistory, brief, closeRate }) {
  const F = T.failure;
  const s = satisfactionHistory;
  if (s.length >= F.churnWeeks && s.slice(-F.churnWeeks).every((x) => x < F.churnBelow)) return 'churn';

  const spent = sum(weeks.map((w) => w.totals.spend));
  const leads = sum(weeks.map((w) => w.totals.trueLeads));
  if (spent > F.budgetShare * brief.totalBudget && leads === 0) return 'budget_failure';

  const midpoint = Math.ceil(brief.campaignWeeks / 2);
  if (weeks.length === midpoint) {
    const t = trailing(weeks);
    const qa = qualityAdjustedCpl(t.spend, t.jobs, closeRate);
    if (t.spend > 0 && (qa === null || qa > brief.target.cost * (1 + F.targetMiss))) return 'target_failure';
  }
  return null;
}
