// src/engine/scoring.js
//
// Final scoring (spec 13.2, 13.4), client profit after fee (5.3), and the
// agency P&L (12).
//
//   Ad score = 40% Performance + 30% Best-practice + 30% Satisfaction
//   Performance = 100 x min(1, Business target / quality-adjusted true CPL)
//   Best-practice = share of applicable rubric checks passed
//   Satisfaction = mean weekly Satisfaction
//
// A correct walk-away (declining an unviable brief) scores 100 / 100 / 100.

import { safeDiv, sum, mean } from './math.js';
import { briefCloseRate } from './brief.js';
import { qualityAdjustedCpl } from './satisfaction.js';
import { resolveLeadSetup, goalOptions, eventOptions, needsEvent } from './metaRules.js';
import { metaLeads } from './benchmarks.js';
import { maxAdSets } from './week.js';
import { isProhibited, angleFlag } from './policy.js';
import { contentFor } from '../content/index.js';
import { BUSINESS_BENCHMARKS } from '../config/benchmarks.js';
import { WEEKS_PER_MONTH } from '../config/economics.js';
import { TUNABLES } from '../config/tunables.js';

const GOAL_TOLERANCE_EVENTS = 2.5;

function spendShare(weeks, predicate) {
  let total = 0;
  let ok = 0;
  for (const w of weeks) {
    for (const r of w.adSets) {
      const cfg = w.config.find((c) => c.id === r.id);
      if (!cfg || r.spend <= 0) continue;
      total += r.spend;
      if (predicate(cfg, w)) ok += r.spend;
    }
  }
  return total > 0 ? ok / total : null;
}

/** Expected optimization events per week for a goal/event choice at this ad set's spend. */
function expectedEvents(cfg, spend, benchCpl) {
  const s = resolveLeadSetup(cfg);
  return (spend / (benchCpl * s.cpl)) * s.eventsPerLead;
}

/** Is the chosen goal/event within tolerance of the option closest to 50 events/week? */
function goalChoiceOk(cfg, spend, benchCpl, ctx) {
  const goals = goalOptions(cfg.objective, cfg.location, ctx).filter((g) => g.available);
  const candidates = [];
  for (const g of goals) {
    if (needsEvent(cfg.objective, cfg.location, g.id)) {
      for (const e of eventOptions(cfg.objective, cfg.location, g.id, ctx).filter((x) => x.available)) {
        candidates.push({ ...cfg, goal: g.id, event: e.id });
      }
    } else candidates.push({ ...cfg, goal: g.id, event: null });
  }
  const dist = (c) => Math.abs(expectedEvents(c, spend, benchCpl) - TUNABLES.learning.eventsToExit);
  const best = Math.min(...candidates.map(dist));
  return dist(cfg) <= best + GOAL_TOLERANCE_EVENTS;
}

function check(id, group, label, pass, reason) {
  return { id, group, label, pass, reason };
}

/** Best-practice rubric (13.4). pass: true | false | null (not applicable). */
export function computeRubric(state) {
  const checks = [];
  const o = state.onboarding;
  const brief = state.brief;
  const weeks = state.weeks;
  const isMedspa = state.businessId === 'medspa';
  const content = contentFor(state.businessId);
  const bench = metaLeads(BUSINESS_BENCHMARKS[state.businessId].meta);
  const ctx = {
    dataRestricted: Boolean(brief.hidden.defects.dataRestricted),
    crmFixed: !brief.hidden.defects.noCrm || Boolean(o.fixed.crm),
    sensitiveNames: o.naming === 'sensitive',
  };

  // Onboarding
  const tracking = ['pixel', 'capi', 'calls', 'crm'];
  const unaudited = tracking.filter((c) => !o.audited[c]);
  checks.push(
    check('audit', 'Onboarding', 'Tracking audited before launch', unaudited.length === 0,
      unaudited.length ? `Skipped: ${unaudited.join(', ')}. You launched without knowing what the platform could see.` : 'Pixel, Conversions API, call tracking, and CRM all checked.'),
  );
  const critical = content.checks.filter((c) => c.critical);
  const missed = critical.filter((c) => {
    const has = c.defectKey === 'slowSpeed' ? brief.hidden.speedToLead === 'slow' : brief.hidden.defects[c.defectKey];
    return has && !o.fixed[c.id] && !o.disclosed[c.id];
  });
  checks.push(
    check('critical', 'Onboarding', 'Critical defects fixed or disclosed', missed.length === 0,
      missed.length ? `${missed.map((c) => c.title).join(' and ')} went into launch unfixed and undisclosed.` : 'Every critical defect was fixed or disclosed.'),
  );
  if (isMedspa) {
    checks.push(
      check('data_source', 'Onboarding', 'Data-source category checked', Boolean(o.audited.data_source),
        o.audited.data_source ? 'You checked whether Meta restricted the site\'s event sharing.' : 'You never checked whether Meta restricted this health site\'s events.'),
    );
    checks.push(
      check('naming', 'Onboarding', 'Neutral event and audience names', o.naming === 'neutral',
        o.naming === 'neutral' ? 'Neutral names keep custom conversions and audiences live.' : 'Sensitive names like "botox_booked" get custom conversions and audiences disabled.'),
    );
  }

  const ran = weeks.some((w) => w.totals.spend > 0);
  const na = (id, group, label) => check(id, group, label, null, 'Not applicable: the campaign never delivered.');

  // Meta
  if (!ran) {
    for (const [id, label] of [
      ['objective', 'Objective matches business goal'],
      ['location', 'Conversion location fits lead handling'],
      ['goal', 'Goal and event fit the budget'],
      ['adsets', 'Ad set count fits the budget'],
      ['edits', 'Edits kept to one per ad set per two weeks'],
      ['audience', 'Audience option fits budget and business'],
      ['angles', 'Angle testing is deliberate'],
    ]) checks.push(na(id, 'Meta', label));
  } else {
    const objShare = spendShare(weeks, (c) => c.objective === 'leads');
    checks.push(
      check('objective', 'Meta', 'Objective matches business goal', objShare >= 0.9,
        objShare >= 0.9 ? 'Leads objective for a leads client.' : 'Spend went to an objective that doesn\'t optimize for leads. Cheap clicks and engagement don\'t book appointments.'),
    );
    const fits = (c) => {
      const s = resolveLeadSetup(c);
      if (s.kind === 'trap') return false;
      if (s.source === 'instantVolume' || s.source.includes('instantVolume')) return s.qualified;
      return true;
    };
    const locShare = spendShare(weeks, fits);
    checks.push(
      check('location', 'Meta', 'Conversion location fits lead handling', locShare >= 0.9,
        locShare >= 0.9 ? 'Conversion location matched how the client books.' : 'Default instant forms with no qualifying questions or CRM feedback: cheap leads that don\'t close.'),
    );
    const goalShare = spendShare(weeks, (c, w) => {
      const r = w.adSets.find((x) => x.id === c.id);
      return resolveLeadSetup(c).kind === 'lead' && goalChoiceOk(c, r.spend, bench.cpl, ctx);
    });
    checks.push(
      check('goal', 'Meta', 'Goal and event fit the budget', goalShare >= 0.9,
        goalShare >= 0.9 ? 'You optimized for the highest-volume real lead event the budget can feed.' : 'The goal or event was too deep (or too shallow) for this budget. Aim for the real lead event with volume closest to 50 a week.'),
    );
    const over = weeks.filter((w) => w.config.filter((c) => !c.paused).length > maxAdSets(w.weeklyBudget, bench.cpl));
    checks.push(
      check('adsets', 'Meta', 'Ad set count fits the budget', over.length === 0,
        over.length ? `Week ${over[0].week}: more ad sets than a ${Math.round(over[0].weeklyBudget)}/week budget can feed. The limit is max(1, floor(weekly budget / (10 x cost per lead))).` : 'One ad set, consolidated signal.'),
    );
    const byAdSet = {};
    for (const e of state.edits.filter((x) => !x.fix)) (byAdSet[e.adSetId] ||= new Set()).add(e.week);
    const clustered = Object.entries(byAdSet).find(([, set]) => [...set].some((wk) => set.has(wk + 1)));
    checks.push(
      check('edits', 'Meta', 'Edits kept to one per ad set per two weeks', !clustered,
        clustered ? `Ad set ${clustered[0]} was edited in back-to-back weeks. Every significant edit restarts learning.` : 'Edits were batched or limited to fixes.'),
    );
    const audShare = spendShare(weeks, (c) => c.audience.option !== 'limited');
    checks.push(
      check('audience', 'Meta', 'Audience option fits budget and business', audShare >= 0.9,
        audShare >= 0.9 ? 'Advantage+ audience with location and age as controls.' : 'Hard-limited audience with no business reason. On an L1 budget it deepens Learning Limited.'),
    );
    const tooMany = weeks.find((w) => w.config.some((c) => !c.paused && c.angles.length > 2));
    checks.push(
      check('angles', 'Meta', 'Angle testing is deliberate', !tooMany,
        tooMany ? `Week ${tooMany.week}: more angles in one ad set than the budget can read. Test two at most.` : 'Two angles or fewer per ad set.'),
    );
  }
  if (isMedspa) {
    const prohibitedWeek = weeks.find((w) => w.config.some((c) => !c.paused && c.angles.some((id) => isProhibited(angleFlag(state.businessId, id)))));
    checks.push(
      check('policy', 'Meta', 'No prohibited-flag copy', !prohibitedWeek,
        prohibitedWeek ? `Week ${prohibitedWeek.week} ran copy Meta prohibits for health and wellness ads.` : 'All copy stayed inside Meta\'s health and wellness policy.'),
    );
    const minorWeek = weeks.find((w) => w.config.some((c) => c.audience.minAge < 18));
    checks.push(
      check('age', 'Meta', 'All ad sets 18+', !minorWeek,
        minorWeek ? `Week ${minorWeek.week} targeted under 18. Cosmetic procedure ads must target 18+.` : 'Every ad set targeted 18+.'),
    );
  }

  // Relationship
  if (weeks.length) {
    const skipped = state.updates.filter((u) => u === 'skip').length;
    checks.push(
      check('updates', 'Relationship', 'Updates sent every week', skipped === 0,
        skipped ? `${skipped} week(s) with no client update.` : 'The client heard from you every week.'),
    );
  }
  if (state.eventLog.length) {
    const quality = mean(state.eventLog.map((e) => e.score / e.best));
    checks.push(
      check('events', 'Relationship', 'Event responses chosen well', quality >= 0.75,
        quality >= 0.75 ? 'You handled client events well.' : 'Several client events got a weak response. The final debrief shows the better one for each.'),
    );
  }

  const applicable = checks.filter((c) => c.pass !== null);
  const score = applicable.length ? (100 * applicable.filter((c) => c.pass).length) / applicable.length : 100;
  return { checks, score };
}

export function campaignTotals(state) {
  const weeks = state.weeks;
  const spend = sum(weeks.map((w) => w.totals.spend));
  const trueLeads = sum(weeks.map((w) => w.totals.trueLeads));
  const reportedLeads = sum(weeks.map((w) => w.totals.reportedLeads));
  const jobs = sum(weeks.map((w) => w.totals.jobs));
  const closeRate = briefCloseRate(state.brief);
  return {
    spend,
    trueLeads,
    reportedLeads,
    jobs,
    trueCpl: safeDiv(spend, trueLeads),
    platformCpl: safeDiv(spend, reportedLeads),
    qaCpl: qualityAdjustedCpl(spend, jobs, closeRate),
    realizedClose: safeDiv(jobs, trueLeads),
  };
}

function clientProfit(state, t) {
  const e = state.brief.econ;
  const margin = e.margin * state.marginMult;
  const months = state.weeks.length / WEEKS_PER_MONTH;
  const feePaid = state.fee.monthly * months;
  const revenue = t.jobs * e.firstJob;
  const revenue12 = t.jobs * e.valuePerCustomer;
  return {
    feePaid,
    revenue,
    revenue12,
    afterFee: revenue * margin - t.spend - feePaid,
    adsOnly: revenue * margin - t.spend,
    afterFee12: revenue12 * margin - t.spend - feePaid,
    adsOnly12: revenue12 * margin - t.spend,
  };
}

function agencyPnl(state, feePaid, satisfaction) {
  const hours = state.hours.onboarding + sum(state.hours.weekly);
  const rate = safeDiv(feePaid, hours);
  const target = state.targetHourly;
  const keep = rate !== null && rate >= target && satisfaction >= 60;
  return {
    feeRevenue: feePaid,
    hours,
    effectiveRate: rate,
    targetRate: target,
    verdict: keep ? 'keep' : 'drop',
    verdictText: keep
      ? 'Worth keeping: the fee covers your time and the client is satisfied.'
      : rate !== null && rate < target
        ? `Not worth keeping at this fee: $${rate.toFixed(0)}/hour is under your $${target}/hour target.`
        : 'Not worth keeping as is: the client is unhappy, and unhappy clients churn.',
  };
}

export function computeFinal(state) {
  const brief = state.brief;
  const difficulty = {
    class: brief.class,
    source: brief.classSource,
    complications: brief.complications,
    redFlag: brief.redFlag,
    economicClass: brief.economicClass,
    ratio: brief.ratio,
  };
  const base = { endReason: state.endReason, difficulty, weeksPlayed: state.weeks.length };

  if (state.endReason === 'declined') {
    const correct = brief.class === 'unviable';
    const s = correct ? 100 : 0;
    return {
      ...base,
      walkAway: { correct, text: correct ? 'Correct walk-away: this client was not viable.' : 'This client was viable. Declining lost a good account.' },
      performance: s,
      bestPractice: correct ? 100 : 0,
      satisfaction: s,
      adScore: s,
      rubric: { checks: [], score: correct ? 100 : 0 },
      totals: campaignTotals(state),
      clientProfit: null,
      agencyPnl: null,
    };
  }

  const totals = campaignTotals(state);
  const performance = totals.qaCpl === null ? 0 : 100 * Math.min(1, brief.target.cost / totals.qaCpl);
  const rubric = computeRubric(state);
  const satisfaction = mean(state.satisfactionHistory) ?? 0;
  const adScore = 0.4 * performance + 0.3 * rubric.score + 0.3 * satisfaction;
  const profit = clientProfit(state, totals);
  return {
    ...base,
    walkAway: null,
    performance,
    bestPractice: rubric.score,
    satisfaction,
    adScore,
    rubric,
    totals,
    clientProfit: profit,
    agencyPnl: agencyPnl(state, profit.feePaid, satisfaction),
    trueVsReported: {
      trueLeads: totals.trueLeads,
      reportedLeads: totals.reportedLeads,
      gap: totals.trueLeads > 0 ? totals.reportedLeads / totals.trueLeads - 1 : null,
    },
  };
}

/** Score record saved to history (spec 15 data model). */
export function scoreRecord(state, timestamp) {
  const f = state.final;
  return {
    runSeed: state.seed,
    mode: state.mode,
    level: state.level,
    businessId: state.businessId,
    realism: state.realism,
    isSandbox: state.mode === 'sandbox',
    components: { performance: f.performance, bestPractice: f.bestPractice, satisfaction: f.satisfaction, adScore: f.adScore },
    endReason: f.endReason,
    walkAwayCorrect: f.walkAway?.correct ?? null,
    timestamp,
  };
}

/**
 * Unlock rule (spec 3): over the last 3 non-Sandbox campaigns at a level,
 * average Satisfaction >= 70 AND average Performance >= 60.
 */
export function unlockProgress(records, level) {
  const recent = records.filter((r) => !r.isSandbox && r.level === level).slice(-3);
  const avgSat = mean(recent.map((r) => r.components.satisfaction));
  const avgPerf = mean(recent.map((r) => r.components.performance));
  return {
    count: recent.length,
    avgSatisfaction: avgSat,
    avgPerformance: avgPerf,
    unlocked: recent.length === 3 && avgSat >= 70 && avgPerf >= 60,
  };
}
