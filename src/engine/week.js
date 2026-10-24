// src/engine/week.js
//
// One simulated week for every ad set in a Meta campaign (spec 9.2-9.8).
//
// Lead businesses, per ad set:
//   cost per lead = benchmark CPL x clamp(product of non-benchmark modifiers)
//                   x market factor x weekly noise
//   true leads    = spend / cost per lead x trap multiplier   (traps bypass the clamp)
//   reported      = true leads x tracking factor             (what the platform sees)
//   jobs          = true leads x close rate x lead-quality multipliers
// HVAC splits leads into service and replacement pools. Angles and lead
// source shift the mix; replacement leads cost more and are worth far more.
//
// Ecomm (boutique apparel), per ad set:
//   cost per purchase = benchmark CPA x clamp(modifiers) x market x noise
//   revenue           = true purchases x the brief's AOV
//
// Every week also records value units: true results counted at the brief's
// expected value per result (gross profit / breakeven). For a single-pool
// lead business that is jobs / close rate, the client's own way of counting
// leads; for HVAC it weights each pool's leads by expected close and value;
// for ecomm it is purchases weighted by order value. Scores and satisfaction use it.
//
// Learning is continuous (9.5) and normalized to the reference progress of
// one ad set at the typical L1 budget (KTD5), so best practice at a typical
// budget lands near the benchmark.

import { stream } from './rng.js';
import { clamp, safeDiv, sum } from './math.js';
import { metaCostBench } from './benchmarks.js';
import { resolveLeadSetup, resolveSalesSetup } from './metaRules.js';
import { BUSINESS_BENCHMARKS } from '../config/benchmarks.js';
import { LEVEL_BUDGETS, WEEKS_PER_MONTH } from '../config/economics.js';
import { TUNABLES } from '../config/tunables.js';
import { contentFor } from '../content/index.js';
import { policyCheck } from './policy.js';

const T = TUNABLES;

/** Reference learning progress: one ad set at the typical L1 weekly budget, with the recommended event. */
export function referenceProgress(benchCost, eventsPerResult = 1) {
  const typicalWeekly = LEVEL_BUDGETS[1][1] / WEEKS_PER_MONTH;
  return Math.min(1, (typicalWeekly / benchCost) * eventsPerResult / T.learning.eventsToExit);
}

export function learningMultipliers(expectedEvents, benchCost, resetThisWeek, refEventsPerResult = 1) {
  const L = T.learning;
  const progress = resetThisWeek ? 0 : Math.min(1, expectedEvents / L.eventsToExit);
  const ref = referenceProgress(benchCost, refEventsPerResult);
  let cost = (1 + L.kCost * (1 - progress)) / (1 + L.kCost * (1 - ref));
  if (resetThisWeek) cost *= 1 + L.editResetPenalty;
  const variance = (1 + L.kVar * (1 - progress)) / (1 + L.kVar * (1 - ref));
  return { progress, cost, variance, limited: expectedEvents < L.eventsToExit };
}

/** Max ad sets the budget can feed: max(1, floor(weekly / (10 x expected cost per event))). */
export function maxAdSets(weeklyBudget, costPerEvent) {
  return Math.max(1, Math.floor(weeklyBudget / (10 * costPerEvent)));
}

/** The benchmark a brief is simulated against (HVAC blends by the brief's service share). */
export function briefBench(brief) {
  return metaCostBench(brief.businessId, brief.econ.serviceShare);
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
 * Lead-quality multiplier from an ad set's angles (geometric mean; angles without one count as 1).
 * Angles that shift lead quality get a hidden per-client offset scaled by realism: for some
 * clients the deal angle's leads do close, which is how unconventional choices win at realism 5.
 */
function angleCloseMult(angleIds, ctx) {
  const angles = contentFor(ctx.brief.businessId).angles;
  const sd = T.realism.resonanceSd[ctx.realism];
  const logs = angleIds.map((id) => {
    const idx = angles.findIndex((a) => a.id === id);
    const close = angles[idx]?.close;
    if (close === undefined) return 0;
    const z = clamp(stream(ctx.seed, 'angleClose', idx).normal(0, 1), -2.5, 2.5);
    return Math.log(close) + z * sd * T.angleCloseSdScale;
  });
  return Math.exp(sum(logs) / Math.max(1, logs.length));
}

/** Average price discount promised by an ad set's angles (ecomm). */
function angleDiscount(angleIds, brief) {
  const angles = contentFor(brief.businessId).angles;
  return sum(angleIds.map((id) => angles.find((a) => a.id === id)?.discount ?? 0)) / Math.max(1, angleIds.length);
}

/**
 * Replacement share of an HVAC ad set's leads: the brief's base mix shifted by angles and lead
 * source. Each angle's pull gets a hidden per-client offset scaled by realism.
 */
export function replacementShare(adSet, setup, ctx, weight = 1) {
  const brief = ctx.brief;
  const angles = contentFor(brief.businessId).angles;
  const sd = T.realism.resonanceSd[ctx.realism] * T.angleCloseSdScale;
  const logs = adSet.angles.map((id) => {
    const idx = angles.findIndex((a) => a.id === id);
    const z = clamp(stream(ctx.seed, 'angleMix', idx).normal(0, 1), -2.5, 2.5);
    return Math.log(angles[idx]?.mix ?? 1) + z * sd;
  });
  const angleMult = Math.exp(sum(logs) / Math.max(1, logs.length));
  const keys = setup.source.split('+');
  const sourceMult = Math.exp(sum(keys.map((k) => Math.log(T.hvacMix[k] ?? 1))) / keys.length);
  const r0 = 1 - brief.econ.serviceShare;
  const odds = (r0 / (1 - r0)) * (angleMult * sourceMult) ** weight;
  return odds / (1 + odds);
}

/** Breakeven value per lead at a replacement share (lead value x close x margin, by pool). */
function valuePerLead(econ, r) {
  return (1 - r) * econ.pools.service.breakevenCpl + r * econ.pools.replacement.breakevenCpl;
}

/** Shared cost modifiers (inside the clamp) for one ad set. */
function commonFactors(ctx, adSet, week, { corruptedAudience }) {
  const { brief, campaign, realism } = ctx;
  const aud = adSet.audience.option;
  const f = {};
  f.setup = campaign.setup === 'advantage' ? T.advantagePlusSetup : 1;
  if (aud === 'controls') f.audience = corruptedAudience ? T.audience.controlsCorrupted : T.audience.controls;
  else if (aud === 'suggestions') f.audience = week - adSet.startWeek < 2 ? T.audience.suggestionsEarly : T.audience.suggestions;
  else f.audience = T.audience.limited;
  f.audience *= Math.exp(brief.hidden.affinityZ[aud] * T.realism.affinitySd[realism]);
  f.angles = 1 / angleResonance(adSet.angles, aud, ctx);
  return f;
}

function seasonFactor(ctx, week) {
  const halfway = Math.ceil(ctx.brief.campaignWeeks / 2);
  let season = ctx.demandMult || 1;
  if (ctx.brief.hidden.seasonality === 'off' && week <= halfway) season *= T.seasonality.offSeasonFirstHalf;
  if (ctx.brief.hidden.seasonality === 'peak') season *= T.seasonality.peak;
  return season;
}

function fatigueFactor(adSet, week) {
  const angleWeeks = week - adSet.angleStartWeek;
  return angleWeeks > T.fatigue.startAfterWeek ? 1 / T.fatigue.ctrDecay ** (angleWeeks - T.fatigue.startAfterWeek) : 1;
}

function emptyResult(adSet) {
  return { id: adSet.id, spend: 0, clicks: 0, impressions: 0, trueLeads: 0, reportedLeads: 0, jobs: 0, valueUnits: 0, revenue: 0, gross: 0, gross12: 0, disapproved: false, policyFlags: [], factors: {} };
}

/**
 * ctx: {
 *   seed, week (1-based), realism, brief, campaign, weeklyBudget,
 *   defects (effective, after onboarding fixes), speedToLead ('fast'|'average'|'slow'|'slowAdvised'|null),
 *   closeRate, closeMultExtra, demandMult, corruptWeeks, qualifiedWeeks (per ad set id)
 * }
 */
export function simulateWeek(ctx) {
  const isSales = BUSINESS_BENCHMARKS[ctx.brief.businessId].goal === 'sales';
  const results = isSales ? salesAdSets(ctx) : leadAdSets(ctx);
  const totals = {
    spend: sum(results.map((r) => r.spend)),
    clicks: sum(results.map((r) => r.clicks)),
    impressions: sum(results.map((r) => r.impressions)),
    trueLeads: sum(results.map((r) => r.trueLeads)),
    reportedLeads: sum(results.map((r) => r.reportedLeads)),
    jobs: sum(results.map((r) => r.jobs)),
    valueUnits: sum(results.map((r) => r.valueUnits)),
    revenue: sum(results.map((r) => r.revenue)),
    gross: sum(results.map((r) => r.gross)),
    gross12: sum(results.map((r) => r.gross12)),
  };
  if (ctx.brief.econ.pools) {
    totals.replacementLeads = sum(results.map((r) => r.replacementLeads || 0));
    totals.serviceLeads = totals.trueLeads - totals.replacementLeads;
    totals.replacementJobs = sum(results.map((r) => r.replacementJobs || 0));
  }
  totals.trueCpl = safeDiv(totals.spend, totals.trueLeads);
  totals.platformCpl = safeDiv(totals.spend, totals.reportedLeads);
  totals.anyDisapproved = results.some((r) => r.disapproved);
  totals.disapprovedFlags = [...new Set(results.flatMap((r) => r.policyFlags))];
  return { week: ctx.week, adSets: results, totals };
}

// ---------------------------------------------------------------- leads

function leadAdSets(ctx) {
  const { brief, campaign, week, realism } = ctx;
  const bench = briefBench(brief);
  const econ = brief.econ;
  const pooled = Boolean(econ.pools);
  const w = T.realism.modifierWeight[realism];
  const weighted = (m) => m ** w;
  const d = ctx.defects;
  const corrupted = d.doubleFire;
  const market = Math.exp(brief.hidden.marketZ * T.realism.marketSd[realism]);

  const active = campaign.adSets.filter((a) => !a.paused);
  const totalShare = sum(active.map((a) => a.budgetShare)) || 1;
  const cap = maxAdSets(ctx.weeklyBudget, bench.cost);
  const fragmentation = 1 + T.fragmentationPenalty * Math.max(0, active.length - cap);

  return campaign.adSets.map((adSet, i) => {
    const base = emptyResult(adSet);
    if (adSet.paused) return { ...base, paused: true };
    const policy = policyCheck(adSet, { seed: ctx.seed, week, businessId: brief.businessId }, i);
    if (policy.disapproved) return { ...base, disapproved: true, policyFlags: policy.flags };

    const spend = ctx.weeklyBudget * (adSet.budgetShare / totalShare);
    const setup = resolveLeadSetup(adSet);
    const az = brief.hidden.affinityZ;
    const affinitySd = T.realism.affinitySd[realism];

    // HVAC: the delivered lead mix sets the base cost per lead (replacement leads cost more).
    // Mix is an odds multiplier, so the realism weight applies twice: sharp at realism 1, fuzzy at 5.
    const r = pooled ? replacementShare(adSet, setup, ctx, w * w) : null;
    const baseCpl = pooled ? (1 - r) * bench.pools.service + r * bench.pools.replacement : bench.cost;

    // Non-benchmark cost modifiers (inside the clamp).
    const f = commonFactors(ctx, adSet, week, { corruptedAudience: corrupted && setup.usesPixel });
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
    f.fatigue = fatigueFactor(adSet, week);
    f.seasonality = seasonFactor(ctx, week);

    // Learning: expected optimization events at this spend, before learning and noise.
    const preLearning = Object.values(f).reduce((p, m) => p * weighted(m), 1);
    const trackingFactor = reportingFactor(setup, d);
    const expectedEvents = (spend / (baseCpl * clamp(preLearning, ...T.clamp))) * setup.eventsPerLead * trackingFactor;
    const learning = learningMultipliers(expectedEvents, bench.cost, adSet.resetWeek === week);
    f.learning = learning.cost;

    const product = Object.values(f).reduce((p, m) => p * weighted(m), 1);
    const clamped = clamp(product, ...T.clamp);

    // Auction luck is keyed to the setup, so different setups get independent luck while a
    // counterfactual that leaves this ad set unchanged replays its exact draws.
    const rng = stream(ctx.seed, 'funnel', week, i, setupSignature(adSet));
    const noise = rng.lognormalMult(T.realism.weeklySd[realism] * learning.variance);
    const cpl = baseCpl * clamped * market * noise;
    const trapMult = setup.conv / setup.cpc; // bypasses the clamp
    const trueLeads = rng.stochasticRound((spend / cpl) * trapMult);
    const reportedLeads = rng.stochasticRound(trueLeads * trackingFactor);
    const cpc = bench.cpc * setup.cpc * market * f.fatigue;
    const clicks = Math.round(spend / cpc);
    const ctr = bench.ctr / f.fatigue;
    const impressions = Math.round(clicks / ctr);

    // Lead-quality modifiers are non-benchmark modifiers too, so realism weights them the same way.
    // Some angles pull bargain hunters: cheaper leads that close less often.
    const angleClose = angleCloseMult(adSet.angles, ctx);
    let closeMods = setup.close * angleClose * T.speedToLead[ctx.speedToLead];
    if (setup.usesPixel && corrupted) closeMods *= T.tracking.corruptClose;
    if (setup.qualified) {
      const qWeeks = (ctx.qualifiedWeeks && ctx.qualifiedWeeks[adSet.id]) || 0;
      closeMods *= 1 + Math.min(T.qualifiedGoal.closeMaxBonus, T.qualifiedGoal.closeStep * qWeeks);
    }
    const closeFor = (rate) => Math.min(0.95, rate * weighted(closeMods) * (ctx.closeMultExtra || 1));
    const jobsRng = stream(ctx.seed, 'jobs', week, i);

    let jobs;
    let valueUnits;
    let revenue;
    let gross;
    let gross12;
    const pools = {};
    if (pooled) {
      const sv = econ.pools.service;
      const rp = econ.pools.replacement;
      const replacementLeads = rng.stochasticRound(trueLeads * r);
      const serviceLeads = trueLeads - replacementLeads;
      const serviceJobs = jobsRng.stochasticRound(serviceLeads * closeFor(sv.closeRate));
      const replacementJobs = jobsRng.stochasticRound(replacementLeads * closeFor(rp.closeRate));
      jobs = serviceJobs + replacementJobs;
      revenue = serviceJobs * sv.firstJob + replacementJobs * rp.firstJob;
      gross = serviceJobs * sv.firstJob * sv.margin + replacementJobs * rp.firstJob * rp.margin;
      gross12 = serviceJobs * sv.valuePerCustomer * sv.margin + replacementJobs * rp.valuePerCustomer * rp.margin;
      // Value units mostly count leads at their expected close rather than whole jobs: one
      // replacement is worth ~12 leads, so judging purely on realized jobs would swing
      // satisfaction on a single sale. A share of realized value keeps some of that luck.
      const expected =
        serviceLeads * closeFor(sv.closeRate) * sv.valuePerCustomer * sv.margin +
        replacementLeads * closeFor(rp.closeRate) * rp.valuePerCustomer * rp.margin;
      const rw = T.hvacRealizedWeight;
      valueUnits = ((1 - rw) * expected + rw * gross12) / econ.breakeven;
      Object.assign(pools, { replacementShare: r, replacementLeads, serviceLeads, replacementJobs });
    } else {
      jobs = jobsRng.stochasticRound(trueLeads * closeFor(ctx.closeRate));
      valueUnits = jobs / ctx.closeRate;
      revenue = jobs * econ.firstJob;
      gross = revenue * econ.margin;
      gross12 = jobs * econ.valuePerCustomer * econ.margin;
    }

    // Driver factors on cost per booked job, for the round debrief.
    const factors = {
      objective: 1 / trapMult,
      location: setup.cpl / setup.close,
      audience: f.audience * f.setup,
      angles: f.angles / angleClose,
      learning: f.learning,
      fragmentation: f.fragmentation,
      fatigue: f.fatigue,
      tracking: f.tracking * (setup.usesPixel && corrupted ? 1 / T.tracking.corruptClose : 1),
      landing: f.landing,
      seasonality: f.seasonality,
      speedToLead: 1 / T.speedToLead[ctx.speedToLead],
      market: market * noise,
    };
    // HVAC: cost per unit of value at the delivered mix vs the brief's expected mix.
    if (pooled) factors.leadMix = baseCpl / bench.cost / (valuePerLead(econ, r) / econ.breakeven);

    return {
      ...base,
      spend,
      clicks,
      impressions,
      trueLeads,
      reportedLeads,
      jobs,
      valueUnits,
      revenue,
      gross,
      gross12,
      ...pools,
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
}

// ---------------------------------------------------------------- ecomm

function salesAdSets(ctx) {
  const { brief, campaign, week, realism } = ctx;
  const E = T.ecomm;
  const bench = briefBench(brief);
  const econ = brief.econ;
  const w = T.realism.modifierWeight[realism];
  const weighted = (m) => m ** w;
  const d = ctx.defects;
  const market = Math.exp(brief.hidden.marketZ * T.realism.marketSd[realism]);
  const refEvents = E.events.initiate_checkout.eventsPerPurchase;

  const active = campaign.adSets.filter((a) => !a.paused);
  const totalShare = sum(active.map((a) => a.budgetShare)) || 1;
  const cap = maxAdSets(ctx.weeklyBudget, bench.cost);
  const fragmentation = 1 + T.fragmentationPenalty * Math.max(0, active.length - cap);

  return campaign.adSets.map((adSet, i) => {
    const base = emptyResult(adSet);
    if (adSet.paused) return { ...base, paused: true };
    const policy = policyCheck(adSet, { seed: ctx.seed, week, businessId: brief.businessId }, i);
    if (policy.disapproved) return { ...base, disapproved: true, policyFlags: policy.flags };

    const spend = ctx.weeklyBudget * (adSet.budgetShare / totalShare);
    const setup = resolveSalesSetup(adSet);
    const starved = setup.needsPurchase && d.missingPurchase;

    const f = commonFactors(ctx, adSet, week, { corruptedAudience: starved });
    // Hidden per-client fit of each event / location, like lead-source affinity for lead businesses.
    const fitKey = adSet.goal === 'conversions' && adSet.location !== 'catalog' ? adSet.event : `${adSet.location}:${adSet.goal}`;
    const fitZ = clamp(stream(ctx.seed, 'salesFit', fitKey).normal(0, 1), -2.5, 2.5);
    f.location = setup.cpl * Math.exp(fitZ * T.realism.affinitySd[realism]);
    f.landing = setup.usesPixel && d.landingWeak ? 1 / T.landingWeakCvr : 1;
    let tracking = 1;
    if (setup.usesPixel && d.noCapi) tracking /= T.tracking.noCapiCvr;
    if (starved) tracking *= E.missingPurchaseStarve;
    f.tracking = tracking;
    f.fragmentation = fragmentation;
    f.fatigue = fatigueFactor(adSet, week);
    f.seasonality = seasonFactor(ctx, week);

    // Reported purchases need the purchase event; shallower events still fire without it.
    const capi = setup.usesPixel && d.noCapi ? T.tracking.noCapi : 1;
    const reportFactor = setup.usesPixel ? capi * (d.missingPurchase ? E.missingPurchaseReported : 1) : 1;
    const eventFactor = setup.needsPurchase ? reportFactor : capi;

    const preLearning = Object.values(f).reduce((p, m) => p * weighted(m), 1);
    const expectedEvents = (spend / (bench.cost * clamp(preLearning, ...T.clamp))) * setup.eventsPerLead * eventFactor;
    const learning = learningMultipliers(expectedEvents, bench.cost, adSet.resetWeek === week, refEvents);
    f.learning = learning.cost;

    const product = Object.values(f).reduce((p, m) => p * weighted(m), 1);
    const clamped = clamp(product, ...T.clamp);

    const rng = stream(ctx.seed, 'funnel', week, i, setupSignature(adSet));
    const noise = rng.lognormalMult(T.realism.weeklySd[realism] * learning.variance);
    const cpa = bench.cost * clamped * market * noise;
    const trapMult = setup.conv / setup.cpc;
    const purchases = rng.stochasticRound((spend / cpa) * trapMult);
    const reported = rng.stochasticRound(purchases * reportFactor);
    const aov = econ.aov * setup.aovMult * rng.lognormalMult(E.aovSd);
    // Discount angles cut the price, not the cost of goods: margin per order falls by the discount.
    const discount = angleDiscount(adSet.angles, brief);
    const revenue = purchases * aov * (1 - discount);
    const gross = Math.max(0, purchases * aov * (econ.margin - discount));
    const cpc = bench.cpc * setup.cpc * market * f.fatigue;
    const clicks = Math.round(spend / cpc);
    const impressions = Math.round(clicks / (bench.ctr / f.fatigue));

    const factors = {
      objective: 1 / trapMult,
      location: setup.cpl,
      audience: f.audience * f.setup,
      angles: f.angles,
      learning: f.learning,
      fragmentation: f.fragmentation,
      fatigue: f.fatigue,
      tracking: f.tracking,
      landing: f.landing,
      seasonality: f.seasonality,
      market: market * noise,
    };

    return {
      ...base,
      spend,
      clicks,
      impressions,
      trueLeads: purchases,
      reportedLeads: reported,
      jobs: purchases,
      valueUnits: gross / econ.breakeven,
      revenue,
      gross,
      gross12: gross,
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
}

function setupSignature(a) {
  return [a.objective, a.location, a.goal, a.event, a.formType, a.audience.option, a.audience.minAge].join(':');
}

/** Mean affinity z of a (possibly blended) lead source like 'form+instantHigh'. */
function sourceAffinity(source, az) {
  const keys = source.split('+').map((s) => (s.startsWith('instant') ? 'instant' : s));
  return keys.reduce((t, k) => t + (az[k] ?? 0), 0) / keys.length;
}

/** Reported / true conversions for a lead setup given the effective tracking defects (9.4). */
export function reportingFactor(setup, defects) {
  let f = 1;
  if (setup.usesPixel) {
    if (defects.doubleFire) f *= T.tracking.doubleFire;
    if (defects.noCapi) f *= T.tracking.noCapi;
  }
  if (setup.source === 'call' && defects.noCallTracking) f *= T.tracking.callsNoTracking;
  return f;
}
