// src/engine/debrief.js
//
// Round and final debrief data (spec 14). Round debriefs name the single
// biggest driver of the week's result and a stronger move. The final
// debrief bundles the counterfactual, client profit, agency P&L, the true
// vs reported gap, the difficulty class and source, the rubric, and the
// event review. Text comes from the business's content; this module only
// decides what to say.

import { contentFor } from '../content/index.js';
import { computeCounterfactual } from './counterfactual.js';
import { sum } from './math.js';
import { briefBench } from './week.js';

const HURT_THRESHOLD = Math.log(1.08);

/** Spend-weighted mean log multiplier per factor across delivering ad sets. */
function weekFactors(week) {
  const delivering = week.adSets.filter((a) => a.spend > 0);
  const total = sum(delivering.map((a) => a.spend));
  const out = {};
  for (const a of delivering) {
    for (const [k, m] of Object.entries(a.factors)) out[k] = (out[k] || 0) + (Math.log(m) * a.spend) / total;
  }
  return out;
}

export function roundDebrief(state, weekNumber) {
  const week = state.weeks.find((w) => w.week === weekNumber);
  if (!week) return null;
  const text = contentFor(state.businessId).debrief.DRIVER_TEXT;
  const notes = [];
  let driver;

  if (week.adSets.every((a) => a.paused)) driver = { key: 'paused', direction: 'hurt' };
  else if (week.totals.anyDisapproved) driver = { key: 'policy', direction: 'hurt', flags: week.totals.disapprovedFlags };

  const factors = weekFactors(week);
  if (!driver) {
    const ranked = Object.entries(factors).sort((a, b) => b[1] - a[1]);
    const [worstKey, worstLog] = ranked[0] || ['market', 0];
    const [bestKey, bestLog] = ranked[ranked.length - 1] || ['market', 0];
    if (worstLog >= HURT_THRESHOLD) {
      // A campaign's first week always starts learning from zero; that's launch, not a mistake.
      const isLaunch = worstKey === 'learning' && state.campaignStartWeeks?.includes(weekNumber);
      driver = { key: isLaunch ? 'launch' : worstKey, direction: 'hurt', mult: Math.exp(worstLog) };
    }
    else if (bestLog <= -HURT_THRESHOLD && text[bestKey]?.helped) driver = { key: bestKey, direction: 'helped', mult: Math.exp(bestLog) };
    else driver = { key: 'steady', direction: 'steady' };
  }
  if (week.adSets.some((a) => a.learningLimited)) notes.push('Learning Limited: under 50 optimization events this week. At this budget that is expected; avoid making it worse.');
  if (week.totals.trueLeads > 0 && week.totals.reportedLeads / week.totals.trueLeads > 1.5) {
    notes.push(`The platform reported ${week.totals.reportedLeads} leads; the client got ${week.totals.trueLeads}. Something is double-counting.`);
  }
  if (week.update === 'spun') notes.push('You spun the update. If the client sees the real bookings, that trust comes back to bite.');
  if (week.update === 'skip') notes.push('No update this week. Silence reads as hiding something.');

  const t = text[driver.key];
  const headline =
    driver.key === 'steady'
      ? 'A steady week. Nothing pushed results far from the benchmark.'
      : driver.direction === 'helped'
        ? t.helped
        : t.hurt;
  return {
    week: weekNumber,
    headline,
    stronger: driver.key === 'steady' ? 'Hold steady. Stability is how a small budget learns.' : driver.direction === 'helped' ? null : t.stronger,
    driver,
    notes,
    numbers: {
      spend: week.totals.spend,
      trueLeads: week.totals.trueLeads,
      reportedLeads: week.totals.reportedLeads,
      jobs: week.totals.jobs,
      trueCpl: week.totals.trueCpl,
      platformCpl: week.totals.platformCpl,
      results: week.results,
      relationship: week.relationship,
      satisfaction: week.satisfaction,
    },
  };
}

function difficultyText(brief) {
  const names = {
    tracking_critical: 'a critical tracking defect',
    slow_speed: 'slow speed-to-lead',
    off_season: 'an off-season start',
    low_budget: 'a budget at the bottom of the range',
    landing_weak: 'a weak landing page',
    service_heavy: 'a lead mix heavy on low-value service calls',
    data_restricted: 'Meta restricting the site\'s data',
  };
  const flags = {
    guarantee: 'demanded guaranteed results with no ramp period',
    short_funding: 'would not fund a fair test of at least 4 weeks',
    no_access: 'refused access to tracking and the website',
    no_capacity: 'had no capacity to take more clients',
    fee_low: 'would not pay a fee above your minimum',
  };
  if (brief.classSource === 'red_flag') return `Unviable: the client ${flags[brief.redFlag]}. The intake notes hinted at it. Walking away was the right call.`;
  if (brief.classSource === 'complications') return `Hard: good economics, but ${brief.complications.map((c) => names[c]).join(' and ')}.`;
  if (brief.class === 'achievable') return 'Achievable: the economics leave room, and nothing structural was stacked against you.';
  const unit = brief.goal === 'sales' ? 'purchase' : 'lead';
  return `${brief.class === 'hard' ? 'Hard' : 'Unviable'}: after your fee, the client\'s target cost per ${unit} is ${brief.ratio.toFixed(2)}x the benchmark.`;
}

/** Explains an expectation below the whole benchmark range: no setup reliably meets it. */
function expectationNote(state) {
  const range = briefBench(state.brief).range;
  const ex = state.brief.expectation;
  if (ex.cost >= range.min) return null;
  const money = (x) => `$${x.toFixed(2)}`;
  const unit = state.brief.goal === 'sales' ? 'purchase' : 'lead';
  return `The client expected ${money(ex.cost)} per ${unit}, below the entire published benchmark range (${money(range.min)}-${money(range.max)}). No setup reliably beats that. In a pitch you would reset that expectation before taking the fee (pitch mode arrives in a later build); in this mode, honest weekly updates are your only lever.`;
}

export function finalDebrief(state) {
  const f = state.final;
  const content = contentFor(state.businessId);
  const D = content.debrief;
  const eventReview = state.eventLog.map((e) => {
    const event = content.events.find((x) => x.id === e.id);
    const chosen = event.responses.find((r) => r.id === e.response);
    const best = event.responses.reduce((a, b) => (b.score > a.score ? b : a));
    return { title: event.title, chosen: chosen.text, chosenWasBest: chosen.id === best.id, best: best.text, explanation: chosen.id === best.id ? chosen.explanation : best.explanation };
  });
  const policyIssues = [...new Set(state.weeks.flatMap((w) => w.totals.disapprovedFlags))].filter((x) => D.POLICY_REWRITES[x]).map((x) => ({ flag: x, ...D.POLICY_REWRITES[x] }));
  return {
    headline: D.FINAL_LINES[f.endReason] || 'Campaign over.',
    scores: { adScore: f.adScore, performance: f.performance, bestPractice: f.bestPractice, satisfaction: f.satisfaction },
    walkAway: f.walkAway,
    difficulty: { ...f.difficulty, text: difficultyText(state.brief) },
    expectationNote: f.endReason === 'declined' ? null : expectationNote(state),
    totals: f.totals,
    target: state.brief.target.cost,
    promise: state.brief.expectation,
    clientProfit: f.clientProfit,
    agencyPnl: f.agencyPnl,
    trueVsReported: f.trueVsReported,
    rubric: f.rubric,
    eventReview,
    policyIssues,
    counterfactual: computeCounterfactual(state),
    honestLimit: D.HONEST_LIMIT,
  };
}
