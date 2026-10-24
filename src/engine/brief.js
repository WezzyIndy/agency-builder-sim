// src/engine/brief.js
//
// Procedural client briefs (spec 5.1-5.4). A brief holds the client's
// economics, the after-fee Business target, its hidden difficulty class and
// source, hidden tracking defects, and (Ads Manager Only) the client's
// expectation, which stands in for the Promise.
//
// Generation order (5.4): draw the target class, draw economics, compute the
// target and its ratio to the benchmark, resample economics into the class
// when the class occurs naturally, otherwise apply a lever (2 complications
// for hard, 1 red flag for unviable).

import { stream } from './rng.js';
import { clamp } from './math.js';
import { ECONOMICS, LEVEL_BUDGETS, WEEKS_PER_MONTH } from '../config/economics.js';
import { BUSINESS_BENCHMARKS } from '../config/benchmarks.js';
import {
  CLASS_BANDS,
  TARGET_MIX,
  COMPLICATIONS,
  RED_FLAGS,
  NATURAL_SHARE_MIN,
  MAX_ECONOMIC_DRAWS,
} from '../config/difficulty.js';
import { DEFAULT_FEE, FEE_TOLERANCE_BANDS, LOW_FEE_TOLERANCE, monthlyFee } from '../config/fees.js';
import { TUNABLES } from '../config/tunables.js';
import { typicalCost, channelsFor } from './benchmarks.js';
import { RED_FLAG_NOTES, BENIGN_NOTES } from '../content/intake.js';
import { BUSINESS_NAMES, LOCATION_SIZES } from '../content/names.js';

export const BUSINESS_IDS = Object.keys(ECONOMICS);
export const CLASSES = ['achievable', 'hard', 'unviable'];
const tri = (rng, [lo, mid, hi]) => rng.triangular(lo, mid, hi);

export function classify(ratio) {
  if (ratio >= CLASS_BANDS.achievable) return 'achievable';
  if (ratio >= CLASS_BANDS.hard) return 'hard';
  return 'unviable';
}

/** value_per_customer = first_job + ltv_weight x (twelve_month - first_job) */
export function valuePerCustomer(firstJob, twelveMonth, ltvWeight = TUNABLES.ltvWeight) {
  return firstJob + ltvWeight * (twelveMonth - firstJob);
}

function drawPool(rng, spec) {
  const firstJob = tri(rng, spec.firstJob);
  // Clamp: 12-month value is never below the first job (owner-approved default (b)).
  const twelveMonth = spec.twelveMonth ? Math.max(firstJob, tri(rng, spec.twelveMonth)) : firstJob;
  const closeRate = tri(rng, spec.closeRate);
  const margin = tri(rng, spec.margin);
  const vpc = valuePerCustomer(firstJob, twelveMonth);
  return { firstJob, twelveMonth, closeRate, margin, valuePerCustomer: vpc, breakevenCpl: vpc * closeRate * margin };
}

/** Draws economics, budget and k. Fee is applied separately so Full Run can recompute the target. */
function drawEconomics(rng, businessId, level) {
  const spec = ECONOMICS[businessId];
  const monthlyBudget = tri(rng, LEVEL_BUDGETS[level]);
  const k = rng.uniform(...TUNABLES.kRange);
  if (businessId === 'apparel') {
    const aov = tri(rng, spec.aov);
    const margin = tri(rng, spec.margin);
    return { monthlyBudget, k, econ: { aov, margin, breakeven: aov * margin } };
  }
  if (businessId === 'hvac') {
    const serviceShare = tri(rng, spec.serviceShare);
    const service = drawPool(rng, spec.pools.service);
    const replacement = drawPool(rng, spec.pools.replacement);
    return { monthlyBudget, k, econ: hvacEcon(serviceShare, service, replacement) };
  }
  const pool = drawPool(rng, spec);
  return { monthlyBudget, k, econ: { ...pool, breakeven: pool.breakevenCpl } };
}

function hvacEcon(serviceShare, service, replacement) {
  return {
    serviceShare,
    pools: { service, replacement },
    breakeven: serviceShare * service.breakevenCpl + (1 - serviceShare) * replacement.breakevenCpl,
  };
}

/**
 * Business target (5.3): the ad-platform cost per result the player must hit,
 * after the agency fee. target = breakeven x k x ad_share.
 */
export function computeTarget(businessId, level, draw, fee) {
  const feeMonthly = monthlyFee(fee, draw.monthlyBudget);
  const adShare = draw.monthlyBudget / (draw.monthlyBudget + feeMonthly);
  const cost = draw.econ.breakeven * draw.k * adShare;
  const perChannel = {};
  let best = null;
  for (const channel of channelsFor(businessId, level)) {
    const typical = typicalCost(businessId, channel, draw.econ.serviceShare);
    const ratio = cost / typical;
    perChannel[channel] = { typical, ratio };
    if (!best || ratio > perChannel[best].ratio) best = channel;
  }
  return { feeMonthly, adShare, cost, perChannel, channel: best, ratio: perChannel[best].ratio };
}

const naturalCache = new Map();

/** Natural economic class mix at this level with the default fee (replaces mix_v4.py). */
export function naturalMix(businessId, level, n = 4000) {
  const key = `${businessId}|${level}|${n}`;
  if (naturalCache.has(key)) return naturalCache.get(key);
  const rng = stream(20261024, 'natural', businessId, level);
  const counts = { achievable: 0, hard: 0, unviable: 0 };
  for (let i = 0; i < n; i++) {
    const draw = drawEconomics(rng, businessId, level);
    counts[classify(computeTarget(businessId, level, draw, DEFAULT_FEE).ratio)]++;
  }
  const mix = { achievable: counts.achievable / n, hard: counts.hard / n, unviable: counts.unviable / n };
  naturalCache.set(key, mix);
  return mix;
}

function applicableComplications(businessId) {
  const exclude = COMPLICATIONS.excludeFor[businessId] || [];
  return [...COMPLICATIONS.common, ...(COMPLICATIONS[businessId] || [])].filter((c) => !exclude.includes(c));
}

function drawHiddenState(rng, businessId) {
  const r = TUNABLES.defectRates;
  const isEcomm = BUSINESS_BENCHMARKS[businessId].goal === 'sales';
  return {
    speedToLead: isEcomm ? null : rng.weighted(['fast', 'average', 'slow'], [0.25, 0.55, r.slowSpeed]),
    seasonality: rng.weighted(['neutral', 'peak'], [0.85, 0.15]),
    defects: {
      doubleFire: !isEcomm && rng.chance(r.doubleFire),
      missingPurchase: isEcomm && rng.chance(r.missingPurchase),
      noCapi: rng.chance(r.noCapi),
      noCallTracking: !isEcomm && rng.chance(r.noCallTracking),
      noCrm: !isEcomm && rng.chance(r.noCrm),
      landingWeak: rng.chance(r.landingWeak),
      dataRestricted: businessId === 'medspa' && rng.chance(r.dataRestricted),
    },
    // Per-brief hidden angle resonance offsets; scaled by realism at simulation time.
    resonanceZ: Array.from({ length: 8 }, () => clamp(rng.normal(0, 1), -2.5, 2.5)),
    marketZ: clamp(rng.normal(0, 1), -2.5, 2.5),
  };
}

function applyComplication(c, brief, rng) {
  const h = brief.hidden;
  switch (c) {
    case 'tracking_critical':
      if (brief.goal === 'sales') h.defects.missingPurchase = true;
      else h.defects.doubleFire = true;
      break;
    case 'slow_speed':
      h.speedToLead = 'slow';
      break;
    case 'off_season':
      h.seasonality = 'off';
      break;
    case 'low_budget': {
      const [lo, , hi] = LEVEL_BUDGETS[brief.level];
      brief.draw.monthlyBudget = rng.uniform(lo, lo + 0.15 * (hi - lo));
      break;
    }
    case 'landing_weak':
      h.defects.landingWeak = true;
      break;
    case 'service_heavy': {
      const e = brief.draw.econ;
      brief.draw.econ = hvacEcon(rng.uniform(0.85, 0.95), e.pools.service, e.pools.replacement);
      break;
    }
    case 'data_restricted':
      h.defects.dataRestricted = true;
      break;
    default:
      throw new Error(`Unknown complication ${c}`);
  }
}

function feeTolerance(rng, monthlyBudget, redFlag) {
  if (redFlag === 'fee_low') return tri(rng, LOW_FEE_TOLERANCE);
  const band = FEE_TOLERANCE_BANDS.find((b) => monthlyBudget <= b.maxSpend);
  return tri(rng, band.range);
}

/** Ads Manager Only client expectation, drawn between the Business target and the benchmark typical (assumption (c)). */
function drawExpectation(rng, targetCost, typical) {
  const t = TUNABLES.expectation;
  const rampWeeks = rng.chance(t.rampChance) ? t.rampWeeks : 0;
  if (rng.chance(t.overOptimisticChance)) {
    return { cost: typical * rng.uniform(0.6, 0.82), overOptimistic: true, rampWeeks };
  }
  let cost;
  if (targetCost >= typical) {
    const hi = Math.min(targetCost, typical * 1.5);
    cost = rng.triangular(typical * 0.95, typical * 1.1, Math.max(hi, typical * 1.11));
  } else {
    cost = rng.uniform(targetCost, typical);
  }
  return { cost, overOptimistic: false, rampWeeks };
}

function drawNotes(rng, redFlag) {
  const benign = rng.shuffle(BENIGN_NOTES);
  if (!redFlag) return benign.slice(0, 2).map((text) => ({ text, signal: 'benign' }));
  const flagNote = { text: rng.pick(RED_FLAG_NOTES[redFlag]), signal: 'red_flag', flag: redFlag };
  return rng.shuffle([flagNote, { text: benign[0], signal: 'benign' }]);
}

/**
 * Generates a brief. options: { businessId, level, forceClass?, fee? }.
 * Deterministic for a given seed and options.
 */
export function generateBrief(seed, options) {
  const { businessId, level = 1, forceClass = null, fee = DEFAULT_FEE } = options;
  if (!ECONOMICS[businessId]) throw new Error(`Unknown business: ${businessId}`);
  const rng = stream(seed, 'brief', businessId, level);
  const mix = TARGET_MIX[businessId];
  const targetClass = forceClass || rng.weighted(CLASSES, CLASSES.map((c) => mix[c]));
  const natural = naturalMix(businessId, level);

  // Resample economics into the target class when it occurs naturally; else draw achievable and use a lever.
  const economicClass = natural[targetClass] >= NATURAL_SHARE_MIN ? targetClass : 'achievable';
  let draw;
  let target;
  let draws = 0;
  do {
    draw = drawEconomics(rng, businessId, level);
    target = computeTarget(businessId, level, draw, fee);
    draws++;
  } while (classify(target.ratio) !== economicClass && draws < MAX_ECONOMIC_DRAWS);
  const hitCap = classify(target.ratio) !== economicClass;

  const goal = BUSINESS_BENCHMARKS[businessId].goal;
  const brief = {
    businessId,
    label: ECONOMICS[businessId].label,
    name: rng.pick(BUSINESS_NAMES[businessId]),
    locationSize: rng.pick(LOCATION_SIZES),
    goal,
    level,
    campaignWeeks: 8,
    draw,
    hidden: drawHiddenState(rng, businessId),
    complications: [],
    redFlag: null,
    class: targetClass,
    classSource: 'economics',
    economicDraws: draws,
  };

  const useLever = economicClass !== targetClass || hitCap;
  if (useLever && targetClass === 'hard') {
    brief.complications = rng.shuffle(applicableComplications(businessId)).slice(0, 2);
    for (const c of brief.complications) applyComplication(c, brief, rng);
    brief.classSource = 'complications';
  } else if (useLever && targetClass === 'unviable') {
    const flags = goal === 'sales' ? RED_FLAGS.filter((f) => f !== 'no_capacity') : RED_FLAGS;
    brief.redFlag = rng.pick(flags);
    brief.classSource = 'red_flag';
  } else if (useLever) {
    brief.classSource = 'economics';
  }

  // Recompute after levers (low_budget and service_heavy change the economics).
  target = computeTarget(businessId, level, brief.draw, fee);
  brief.economicClass = classify(target.ratio);
  brief.ratio = target.ratio;
  brief.monthlyBudget = brief.draw.monthlyBudget;
  brief.weeklyBudget = brief.monthlyBudget / WEEKS_PER_MONTH;
  brief.totalBudget = brief.weeklyBudget * brief.campaignWeeks;
  brief.econ = brief.draw.econ;
  brief.k = brief.draw.k;
  brief.fee = { ...fee, monthly: target.feeMonthly };
  brief.adShare = target.adShare;
  brief.target = { cost: target.cost, channel: target.channel, perChannel: target.perChannel };
  brief.typicalCost = target.perChannel.meta.typical;
  brief.hidden.feeTolerance = feeTolerance(rng, brief.monthlyBudget, brief.redFlag);
  brief.expectation = drawExpectation(rng, target.cost, brief.typicalCost);
  brief.intakeNotes = drawNotes(rng, brief.redFlag);
  delete brief.draw;
  return brief;
}

/** First-job close rate to show/score for a lead brief (HVAC blends pools by service share). */
export function briefCloseRate(brief) {
  const e = brief.econ;
  if (e.pools) return e.serviceShare * e.pools.service.closeRate + (1 - e.serviceShare) * e.pools.replacement.closeRate;
  return e.closeRate ?? null;
}
