// harness/criteria.js
//
// Spec Section 16 pass criteria (KTD6 bands), per business:
//   1  realism 1-3, achievable: best-practice median true cost per result inside the benchmark band
//      (CPL for leads, HVAC blended at a 70% service share; CPA for ecomm)
//   2  realism 1-3, achievable: best-practice median beats naive median by >= 30%
//   3  realism 3, achievable: failure rate best-practice <= 10%, naive >= 50%
//   4  realism 3, hard: best-practice failure rate in [15%, 50%]
//   5  realism 5, achievable: best-practice wins on median but loses to random in >= 15% of seeds
//   6  no NaN or Infinity in any week
//   8  difficulty mix within +/-5 points of target, per business per level
//   9  no brief takes more than 200 economic draws
//   10 economically unviable briefs can't be won: best-practice runs end in a failure state or
//      with Performance < 60 in >= 80% of runs
//      (only where the business has natural unviable economics at L1: cleaning, apparel)
//   11 med spa policy: prohibited copy disapproved 80%, before/after 10% (Meta portion)
// Deferred: 7 (pitch, M2), 11 Search (M3).

import { playRun } from './play.js';
import { median, percentile } from '../src/engine/math.js';
import { metaCostBench } from '../src/engine/benchmarks.js';
import { generateBrief, BUSINESS_IDS, naturalMix } from '../src/engine/brief.js';
import { TARGET_MIX, NATURAL_SHARE_MIN } from '../src/config/difficulty.js';
import { policyCheck } from '../src/engine/policy.js';
import { TUNABLES } from '../src/config/tunables.js';

const FAILURES = ['churn', 'budget_failure', 'target_failure'];

function runCell(policy, businessId, realism, cls, n, seedBase) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const seed = seedBase + i;
    const s = playRun(policy, { seed, businessId, level: 1, realism, forceClass: cls });
    out.push(s);
  }
  return out;
}

const trueCpl = (s) => s.final.totals?.trueCpl ?? null;
const qaCpl = (s) => s.final.totals?.qaCpl ?? null;
const failRate = (runs) => runs.filter((s) => FAILURES.includes(s.final.endReason)).length / runs.length;

function finiteWeeks(runs) {
  for (const s of runs) {
    for (const w of s.weeks) {
      for (const [k, v] of Object.entries(w.totals)) {
        if (typeof v === 'number' && !Number.isFinite(v)) return `${k}=${v} in week ${w.week}`;
      }
      if (w.satisfaction !== undefined && !Number.isFinite(w.satisfaction)) return `satisfaction NaN week ${w.week}`;
    }
    for (const k of ['performance', 'bestPractice', 'satisfaction', 'adScore']) {
      if (!Number.isFinite(s.final[k])) return `final.${k}=${s.final[k]}`;
    }
  }
  return null;
}

/** Campaign criteria for one business. Returns rows { id, label, value, threshold, pass }. */
export function campaignCriteria(businessId, n, log = () => {}) {
  const rows = [];
  const bench = metaCostBench(businessId);
  const [lo, hi] = bench.band;
  const unit = bench.kind === 'sales' ? 'CPA' : 'CPL';
  const all = [];
  const cache = {};
  const cell = (policy, realism, cls) => {
    const key = `${policy}|${realism}|${cls}`;
    if (!cache[key]) {
      log(`  playing ${key} x${n}`);
      cache[key] = runCell(policy, businessId, realism, cls, n, 100000 * realism + ({ achievable: 0, hard: 50000, unviable: 70000 })[cls]);
      all.push(...cache[key]);
    }
    return cache[key];
  };

  for (const r of [1, 2, 3]) {
    const best = cell('bestPractice', r, 'achievable');
    const naive = cell('naive', r, 'achievable');
    const m = median(best.map(trueCpl));
    rows.push({ id: `1@r${r}`, label: `Best-practice median true ${unit} in band (realism ${r})`, value: m, threshold: `${lo.toFixed(2)}-${hi.toFixed(2)}`, pass: m >= lo && m <= hi });
    const nm = median(naive.map(trueCpl));
    rows.push({ id: `2@r${r}`, label: `Best beats naive median by >= 30% (realism ${r})`, value: Number.isFinite(nm) ? m / nm : 0, threshold: '<= 0.70', pass: m <= 0.7 * nm });
  }

  const best3 = cell('bestPractice', 3, 'achievable');
  const naive3 = cell('naive', 3, 'achievable');
  const bf = failRate(best3);
  const nf = failRate(naive3);
  rows.push({ id: '3a', label: 'Achievable, realism 3: best-practice failure rate', value: bf, threshold: '<= 0.10', pass: bf <= 0.1 });
  rows.push({ id: '3b', label: 'Achievable, realism 3: naive failure rate', value: nf, threshold: '>= 0.50', pass: nf >= 0.5 });

  const hard3 = cell('bestPractice', 3, 'hard');
  const hf = failRate(hard3);
  rows.push({ id: '4', label: 'Hard, realism 3: best-practice failure rate', value: hf, threshold: '0.15-0.50', pass: hf >= 0.15 && hf <= 0.5 });

  const best5 = cell('bestPractice', 5, 'achievable');
  const rand5 = cell('random', 5, 'achievable');
  const bm = median(best5.map(qaCpl));
  const rm = median(rand5.map(qaCpl));
  let losses = 0;
  for (let i = 0; i < best5.length; i++) {
    const b = qaCpl(best5[i]) ?? Infinity;
    const x = qaCpl(rand5[i]) ?? Infinity;
    if (x < b) losses++;
  }
  rows.push({ id: '5a', label: 'Realism 5: best-practice median beats random', value: Number.isFinite(rm) ? bm / rm : 0, threshold: '< 1', pass: bm < rm });
  rows.push({ id: '5b', label: 'Realism 5: best-practice loses to random', value: losses / best5.length, threshold: '>= 0.15', pass: losses / best5.length >= 0.15 });

  if (naturalMix(businessId, 1).unviable >= NATURAL_SHARE_MIN) {
    const unviable = cell('bestPractice', 3, 'unviable').filter((s) => s.brief.classSource === 'economics');
    // A run the client ended for missing the target isn't a win, whatever its partial Performance.
    const won = (s) => s.final.performance >= 60 && !FAILURES.includes(s.final.endReason);
    const lost = unviable.filter((s) => !won(s)).length / Math.max(1, unviable.length);
    rows.push({ id: '10', label: `Economically unviable briefs can't be won (${unviable.length} runs)`, value: lost, threshold: '>= 0.80', pass: unviable.length > 0 && lost >= 0.8 });
  }

  const bad = finiteWeeks(all);
  rows.push({ id: '6', label: 'No NaN or Infinity in any week', value: bad || 'none', threshold: 'none', pass: !bad });

  // Context, not criteria: spread of best-practice outcomes.
  rows.push({ id: 'info', label: `Best-practice true ${unit} p10 / p90 (realism 3)`, value: `${percentile(best3.map(trueCpl), 10).toFixed(1)} / ${percentile(best3.map(trueCpl), 90).toFixed(1)}`, threshold: '', pass: null });
  return rows;
}

export function mixCriteria(n = 1000) {
  const rows = [];
  for (const businessId of BUSINESS_IDS) {
    for (const level of [1, 2]) {
      const counts = { achievable: 0, hard: 0, unviable: 0 };
      let maxDraws = 0;
      for (let i = 0; i < n; i++) {
        const b = generateBrief(900000 + i, { businessId, level });
        counts[b.class]++;
        maxDraws = Math.max(maxDraws, b.economicDraws);
      }
      const worst = Math.max(...Object.keys(counts).map((c) => Math.abs(counts[c] / n - TARGET_MIX[businessId][c])));
      rows.push({ id: `8:${businessId}L${level}`, label: `Mix ${businessId} L${level} (a/h/u ${counts.achievable}/${counts.hard}/${counts.unviable})`, value: worst, threshold: '<= 0.05', pass: worst <= 0.05 });
      rows.push({ id: `9:${businessId}L${level}`, label: `Max economic draws ${businessId} L${level}`, value: maxDraws, threshold: '<= 200', pass: maxDraws <= 200 });
    }
  }
  return rows;
}

export function policyCriteria(n = 20000) {
  const rows = [];
  const make = (angles, minAge = 18) => ({ angles, audience: { option: 'controls', minAge } });
  const rate = (adSet) => {
    let d = 0;
    for (let i = 0; i < n; i++) if (policyCheck(adSet, { seed: 7000 + i, week: 1 + (i % 8), businessId: 'medspa' }, 0).disapproved) d++;
    return d / n;
  };
  const p = TUNABLES.policy;
  for (const [id, angle] of [['personal_attribute', 'tired_of_wrinkles'], ['timeframe', 'ten_years_younger']]) {
    const r = rate(make([angle]));
    rows.push({ id: `11:${id}`, label: `Disapproval rate, ${id}`, value: r, threshold: `${p.prohibitedDisapproval} +/- 0.02`, pass: Math.abs(r - p.prohibitedDisapproval) <= 0.02 });
  }
  const ba = rate(make(['before_after']));
  rows.push({ id: '11:before_after', label: 'Disapproval rate, before/after', value: ba, threshold: `${p.beforeAfterDisapproval} +/- 0.015`, pass: Math.abs(ba - p.beforeAfterDisapproval) <= 0.015 });
  const minor = rate(make(['expert_injectors'], 13));
  rows.push({ id: '11:under_18', label: 'Disapproval rate, under-18 targeting', value: minor, threshold: '1.00', pass: minor === 1 });
  const clean = rate(make(['expert_injectors', 'new_client_offer']));
  rows.push({ id: '11:compliant', label: 'Disapproval rate, compliant copy', value: clean, threshold: '0.00', pass: clean === 0 });
  return rows;
}
