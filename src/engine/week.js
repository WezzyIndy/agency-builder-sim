// src/engine/week.js
//
// One simulated week for every ad set in a Meta lead campaign (spec 9.2-9.8).
//
// Per ad set:
//   cost per lead = benchmark CPL x clamp(product of non-benchmark modifiers)
//                   x market factor x weekly noise
//   true leads    = spend / cost per lead x trap multiplier   (traps bypass the clamp)
//   reported      = true leads x tracking factor             (what the platform sees)
//   jobs          = true leads x close rate x lead-quality multipliers
//
// Learning is continuous (9.5) and normalized to the reference progress of
// one ad set at the typical L1 budget (KTD5), so best practice at a typical
// budget lands near the benchmark CPL.
//
// Ecomm (boutique apparel) simulation arrives with apparel content in M4.

import { stream } from './rng.js';
import { clamp, safeDiv, sum } from './math.js';
import { metaLeads } from './benchmarks.js';
import { resolveLeadSetup } from './metaRules.js';
import { BUSINESS_BENCHMARKS } from '../config/benchmarks.js';
import { LEVEL_BUDGETS, WEEKS_PER_MONTH } from '../config/economics.js';
import { TUNABLES } from '../config/tunables.js';
import { contentFor } from '../content/index.js';
import { policyCheck } from './policy.js';

const T = TUNABLES;

/** Reference learning progress: one ad set at the typical L1 weekly budget. */
export function referenceProgress(benchCpl) {
  const typicalWeekly = LEVEL_BUDGETS[1][1] / WEEKS_PER_MONTH;
  return Math.min(1, typicalWeekly / benchCpl / T.learning.eventsToExit);
}

export function learningMultipliers(expectedEvents, benchCpl, resetThisWeek) {
  const L = T.learning;
  const progress = resetThisWeek ? 0 : Math.min(1, expectedEvents / L.eventsToExit);
  const ref = referenceProgress(benchCpl);
  let cost = (1 + L.kCost * (1 - progress)) / (1 + L.kCost * (1 - ref));
  if (resetThisWeek) cost *= 1 + L.editResetPenalty;
  const variance = (1 + L.kVar * (1 - progress)) / (1 + L.kVar * (1 - ref));
  return { progress, cost, variance, limited: expectedEvents < L.eventsToExit };
}

/** Max ad sets the budget can feed: max(1, floor(weekly / (10 x expected cost per event))). */
export function maxAdSets(weeklyBudget, costPerEvent) {
  return Math.max(1, Math.floor(weeklyBudget / (10 * costPerEvent)));
}

function angleResonance(angleIds, audienceOption, ctx) {
  const angles = contentFor(ctx.brief.businessId).angles;
  const sd = T.realism.resonanceSd[ctx.realism];
  const values = angleIds.map((id) => {
    const idx = angles.findIndex((a) => a.id === id);
    const a = angles[idx];
    return a.resonance[audienceOption] * Math.exp(ctx.brief.hidden.resonanceZ[idx] * sd);
  });
  // Delivery shifts toward the best angle in the set.
  const best = Math.max(...values);
  const avg = sum(values) / values.length;
  return 0.7 * best + 0.3 * avg;
}

/**
 * ctx: {
 *   seed, week (1-based), realism, brief, campaign, weeklyBudget,
 *   defects (effective, after onboarding fixes), speedToLead ('fast'|'average'|'slow'|'slowAdvised'),
 *   closeMultExtra, demandMult, corruptWeeks, qualifiedWeeks (per ad set id)
 * }
 */
export function simulateWeek(ctx) {
  const { brief, campaign, week, realism } = ctx;
  if (BUSINESS_BENCHMARKS[brief.businessId].goal !== 'leads') {
    throw new Error('Ecomm simulation is not built yet (M4).');
  }
  const bench = metaLeads(BUSINESS_BENCHMARKS[brief.businessId].meta);
  const w = T.realism.modifierWeight[realism];
  const weighted = (m) => m ** w;
  const d = ctx.defects;
  const corrupted = d.doubleFire;
  const halfway = Math.ceil(brief.campaignWeeks / 2);
  const market = Math.exp(brief.hidden.marketZ * T.realism.marketSd[realism]);

  const active = campaign.adSets.filter((a) => !a.paused);
  const totalShare = sum(active.map((a) => a.budgetShare)) || 1;
  const cap = maxAdSets(ctx.weeklyBudget, bench.cpl);
  const fragmentation = 1 + T.fragmentationPenalty * Math.max(0, active.length - cap);

  const results = campaign.adSets.map((adSet, i) => {
    const base = { id: adSet.id, spend: 0, clicks: 0, impressions: 0, trueLeads: 0, reportedLeads: 0, jobs: 0, disapproved: false, policyFlags: [], factors: {} };
    if (adSet.paused) return { ...base, paused: true };
    const policy = policyCheck(adSet, { seed: ctx.seed, week, businessId: brief.businessId }, i);
    if (policy.disapproved) return { ...base, disapproved: true, policyFlags: policy.flags };

    const spend = ctx.weeklyBudget * (adSet.budgetShare / totalShare);
    const setup = resolveLeadSetup(adSet);
    const aud = adSet.audience.option;

    // Non-benchmark cost modifiers (inside the clamp).
    const f = {};
    f.setup = campaign.setup === 'advantage' ? T.advantagePlusSetup : 1;
    if (aud === 'controls') f.audience = corrupted && setup.usesPixel ? T.audience.controlsCorrupted : T.audience.controls;
    else if (aud === 'suggestions') f.audience = week - adSet.startWeek < 2 ? T.audience.suggestionsEarly : T.audience.suggestions;
    else f.audience = T.audience.limited;
    const affinitySd = T.realism.affinitySd[realism];
    const az = brief.hidden.affinityZ;
    f.audience *= Math.exp(az[aud] * affinitySd);
    f.angles = 1 / angleResonance(adSet.angles, aud, ctx);
    f.location = setup.cpl * Math.exp(sourceAffinity(setup.source, az) * affinitySd);
    f.landing = setup.usesPixel && d.landingWeak ? 1 / T.landingWeakCvr : 1;
    let tracking = 1;
    if (setup.usesPixel && d.noCapi) tracking /= T.tracking.noCapiCvr;
    if (setup.usesPixel && corrupted) {
      const weeksCorrupt = ctx.corruptWeeks || 0;
      tracking /= Math.max(T.tracking.corruptCvrFloor, 1 - T.tracking.corruptCvrStep * weeksCorrupt);
    }
    f.tracking = tracking;
    f.fragmentation = fragmentation;
    const angleWeeks = week - adSet.angleStartWeek;
    f.fatigue = angleWeeks > T.fatigue.startAfterWeek ? 1 / T.fatigue.ctrDecay ** (angleWeeks - T.fatigue.startAfterWeek) : 1;
    let season = ctx.demandMult || 1;
    if (brief.hidden.seasonality === 'off' && week <= halfway) season *= T.seasonality.offSeasonFirstHalf;
    if (brief.hidden.seasonality === 'peak') season *= T.seasonality.peak;
    f.seasonality = season;

    // Learning: expected optimization events at this spend, before learning and noise.
    const preLearning = Object.values(f).reduce((p, m) => p * weighted(m), 1);
    const trackingFactor = reportingFactor(setup, d);
    const expectedEvents = (spend / (bench.cpl * clamp(preLearning, ...T.clamp))) * setup.eventsPerLead * trackingFactor;
    const learning = learningMultipliers(expectedEvents, bench.cpl, adSet.resetWeek === week);
    f.learning = learning.cost;

    const product = Object.values(f).reduce((p, m) => p * weighted(m), 1);
    const clamped = clamp(product, ...T.clamp);

    // Auction luck is keyed to the setup, so different setups get independent luck while a
    // counterfactual that leaves this ad set unchanged replays its exact draws.
    const rng = stream(ctx.seed, 'funnel', week, i, setupSignature(adSet));
    const noise = rng.lognormalMult(T.realism.weeklySd[realism] * learning.variance);
    const cpl = bench.cpl * clamped * market * noise;
    const trapMult = setup.conv / setup.cpc; // bypasses the clamp
    const trueLeads = rng.stochasticRound((spend / cpl) * trapMult);
    const reportedLeads = rng.stochasticRound(trueLeads * trackingFactor);
    const cpc = bench.cpc * setup.cpc * market * f.fatigue;
    const clicks = Math.round(spend / cpc);
    const ctr = bench.ctr / f.fatigue;
    const impressions = Math.round(clicks / ctr);

    // Lead-quality modifiers are non-benchmark modifiers too, so realism weights them the same way.
    let closeMods = setup.close * T.speedToLead[ctx.speedToLead];
    if (setup.usesPixel && corrupted) closeMods *= T.tracking.corruptClose;
    if (setup.qualified) {
      const qWeeks = (ctx.qualifiedWeeks && ctx.qualifiedWeeks[adSet.id]) || 0;
      closeMods *= 1 + Math.min(T.qualifiedGoal.closeMaxBonus, T.qualifiedGoal.closeStep * qWeeks);
    }
    const close = Math.min(0.95, ctx.closeRate * weighted(closeMods) * (ctx.closeMultExtra || 1));
    const jobs = stream(ctx.seed, 'jobs', week, i).stochasticRound(trueLeads * close);

    // Driver factors on cost per booked job, for the round debrief.
    const factors = {
      objective: 1 / trapMult,
      location: setup.cpl / setup.close,
      audience: f.audience * f.setup,
      angles: f.angles,
      learning: f.learning,
      fragmentation: f.fragmentation,
      fatigue: f.fatigue,
      tracking: f.tracking * (setup.usesPixel && corrupted ? 1 / T.tracking.corruptClose : 1),
      landing: f.landing,
      seasonality: f.seasonality,
      speedToLead: 1 / T.speedToLead[ctx.speedToLead],
      market: market * noise,
    };

    return {
      ...base,
      spend,
      clicks,
      impressions,
      trueLeads,
      reportedLeads,
      jobs,
      setupKind: setup.kind,
      source: setup.source,
      usesPixel: setup.usesPixel,
      expectedEvents,
      learningProgress: learning.progress,
      learningLimited: learning.limited,
      modifierProduct: product,
      clampedProduct: clamped,
      factors,
    };
  });

  const totals = {
    spend: sum(results.map((r) => r.spend)),
    clicks: sum(results.map((r) => r.clicks)),
    impressions: sum(results.map((r) => r.impressions)),
    trueLeads: sum(results.map((r) => r.trueLeads)),
    reportedLeads: sum(results.map((r) => r.reportedLeads)),
    jobs: sum(results.map((r) => r.jobs)),
  };
  totals.trueCpl = safeDiv(totals.spend, totals.trueLeads);
  totals.platformCpl = safeDiv(totals.spend, totals.reportedLeads);
  totals.anyDisapproved = results.some((r) => r.disapproved);
  totals.disapprovedFlags = [...new Set(results.flatMap((r) => r.policyFlags))];
  return { week, adSets: results, totals };
}

function setupSignature(a) {
  return [a.objective, a.location, a.goal, a.event, a.formType, a.audience.option, a.audience.minAge].join(':');
}

/** Mean affinity z of a (possibly blended) lead source like 'form+instantHigh'. */
function sourceAffinity(source, az) {
  const keys = source.split('+').map((s) => (s.startsWith('instant') ? 'instant' : s));
  return keys.reduce((t, k) => t + (az[k] ?? 0), 0) / keys.length;
}

/** Reported / true conversions for a setup given the effective tracking defects (9.4). */
export function reportingFactor(setup, defects) {
  let f = 1;
  if (setup.usesPixel) {
    if (defects.doubleFire) f *= T.tracking.doubleFire;
    if (defects.noCapi) f *= T.tracking.noCapi;
  }
  if (setup.source === 'call' && defects.noCallTracking) f *= T.tracking.callsNoTracking;
  return f;
}
