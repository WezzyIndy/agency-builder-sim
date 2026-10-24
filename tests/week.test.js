// tests/week.test.js
//
// Week simulator: no NaN/Infinity, tracking factors, the clamp, trap
// objectives, normalized learning, realism variance, fatigue, lead quality,
// and determinism.

import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateWeek, learningMultipliers, referenceProgress, maxAdSets } from '../src/engine/week.js';
import { generateBrief } from '../src/engine/brief.js';
import { metaLeads } from '../src/engine/benchmarks.js';
import { median } from '../src/engine/math.js';

const brief = generateBrief(11, { businessId: 'medspa', level: 1, forceClass: 'achievable' });
const bench = metaLeads('beauty');

function adSet(overrides = {}) {
  return {
    id: 'a1',
    objective: 'leads',
    location: 'website',
    goal: 'leads',
    event: 'lead',
    formType: null,
    audience: { option: 'controls', minAge: 18 },
    angles: ['expert_injectors'],
    budgetShare: 1,
    paused: false,
    startWeek: 1,
    angleStartWeek: 1,
    resetWeek: null,
    ...overrides,
  };
}

function ctx(overrides = {}) {
  return {
    seed: 1,
    week: 3,
    realism: 3,
    brief,
    campaign: { setup: 'advantage', adSets: [adSet()] },
    weeklyBudget: 2000 / (52 / 12),
    defects: { doubleFire: false, noCapi: false, noCallTracking: false, landingWeak: false },
    speedToLead: 'average',
    closeRate: 0.3,
    closeMultExtra: 1,
    demandMult: 1,
    corruptWeeks: 0,
    ...overrides,
  };
}

function medianCpl(makeCtx, n = 400) {
  const cpls = [];
  for (let s = 1; s <= n; s++) {
    const r = simulateWeek(makeCtx(s)).totals;
    cpls.push(r.trueLeads > 0 ? r.spend / r.trueLeads : null);
  }
  return median(cpls);
}

test('zero spend gives no results, never NaN or Infinity', () => {
  const r = simulateWeek(ctx({ weeklyBudget: 0 }));
  assert.equal(r.totals.trueLeads, 0);
  assert.equal(r.totals.trueCpl, null);
  assert.equal(r.totals.platformCpl, null);
  for (const v of Object.values(r.totals)) if (typeof v === 'number') assert.ok(Number.isFinite(v));
});

test('double-fire inflates reported leads above true leads', () => {
  const r = simulateWeek(ctx({ defects: { doubleFire: true, noCapi: false, noCallTracking: false, landingWeak: false } }));
  assert.ok(r.totals.reportedLeads > r.totals.trueLeads * 1.5, JSON.stringify(r.totals));
});

test('instant forms report natively and are unaffected by pixel defects', () => {
  const a = adSet({ location: 'instant_forms', event: null, formType: 'higher_intent' });
  const r = simulateWeek(ctx({ campaign: { setup: 'advantage', adSets: [a] }, defects: { doubleFire: true, noCapi: true, noCallTracking: false, landingWeak: false } }));
  assert.equal(r.totals.reportedLeads, r.totals.trueLeads);
});

test('modifier product is clamped to [0.4, 2.5]', () => {
  // Hard-limited audience, weak landing page, broken tracking, heavy fragmentation, fatigue: product far above 2.5.
  const many = Array.from({ length: 8 }, (_, i) => adSet({ id: `a${i}`, budgetShare: 1, audience: { option: 'limited', minAge: 18 }, angleStartWeek: -6 }));
  const r = simulateWeek(ctx({ week: 8, campaign: { setup: 'manual', adSets: many }, defects: { doubleFire: true, noCapi: true, noCallTracking: false, landingWeak: true }, corruptWeeks: 7 }));
  for (const a of r.adSets) {
    assert.ok(a.modifierProduct > 2.5, `product ${a.modifierProduct}`);
    assert.equal(a.clampedProduct, 2.5);
  }
});

test('Traffic objective bypasses the clamp: lots of clicks, almost no leads', () => {
  const traffic = adSet({ objective: 'traffic', location: 'website', goal: 'link_clicks', event: null });
  const t = simulateWeek(ctx({ campaign: { setup: 'advantage', adSets: [traffic] } })).totals;
  const l = simulateWeek(ctx()).totals;
  assert.ok(t.clicks > l.clicks * 1.8);
  assert.ok(t.trueLeads <= Math.max(2, l.trueLeads * 0.25), `traffic ${t.trueLeads} vs leads ${l.trueLeads}`);
});

test('learning cost is ~1.0 at the reference progress and rises with splitting', () => {
  const ref = referenceProgress(bench.cpl);
  const atRef = learningMultipliers(ref * 50, bench.cpl, false);
  assert.ok(Math.abs(atRef.cost - 1) < 1e-9);
  const split = learningMultipliers((ref * 50) / 3, bench.cpl, false);
  assert.ok(split.cost > 1);
  const reset = learningMultipliers(ref * 50, bench.cpl, true);
  assert.ok(reset.cost > split.cost);
});

test('one ad set at the typical L1 budget lands near the benchmark CPL', () => {
  const m = medianCpl((s) => ctx({ seed: s, campaign: { setup: 'advantage', adSets: [adSet()] } }));
  assert.ok(m > bench.cpl * 0.75 && m < bench.cpl * 1.25, `median ${m}`);
});

test('splitting into 3 ad sets raises cost per lead', () => {
  const one = medianCpl((s) => ctx({ seed: s }));
  const three = medianCpl((s) =>
    ctx({ seed: s, campaign: { setup: 'advantage', adSets: ['a', 'b', 'c'].map((id) => adSet({ id, budgetShare: 1 / 3 })) } }),
  );
  assert.ok(three > one * 1.15, `one ${one}, three ${three}`);
});

test('realism 1 has lower variance than realism 5', () => {
  const spread = (realism) => {
    const xs = [];
    for (let s = 1; s <= 600; s++) {
      const t = simulateWeek(ctx({ seed: s, realism, weeklyBudget: 3000 })).totals;
      xs.push(t.spend / Math.max(1, t.trueLeads));
    }
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) / m;
  };
  assert.ok(spread(1) < spread(5));
});

test('fatigue decays CTR x0.9 per week after week 3', () => {
  const fresh = simulateWeek(ctx({ week: 3 })).adSets[0].factors.fatigue;
  const tired = simulateWeek(ctx({ week: 6 })).adSets[0].factors.fatigue;
  assert.equal(fresh, 1);
  assert.ok(Math.abs(tired - 1 / 0.9 ** 2) < 1e-9);
});

test('default instant forms are cheaper per lead but book fewer jobs than website forms', () => {
  let instLeads = 0;
  let instJobs = 0;
  let webLeads = 0;
  let webJobs = 0;
  for (let s = 1; s <= 400; s++) {
    const inst = simulateWeek(ctx({ seed: s, campaign: { setup: 'advantage', adSets: [adSet({ location: 'instant_forms', event: null, formType: 'volume' })] } })).totals;
    const web = simulateWeek(ctx({ seed: s })).totals;
    instLeads += inst.trueLeads;
    instJobs += inst.jobs;
    webLeads += web.trueLeads;
    webJobs += web.jobs;
  }
  assert.ok(instLeads > webLeads, `leads ${instLeads} vs ${webLeads}`);
  assert.ok(instJobs / instLeads < webJobs / webLeads);
});

test('under-18 targeting is always disapproved and delivers nothing', () => {
  const kid = adSet({ audience: { option: 'limited', minAge: 13 } });
  for (let s = 1; s <= 20; s++) {
    const r = simulateWeek(ctx({ seed: s, campaign: { setup: 'manual', adSets: [kid] } }));
    assert.equal(r.adSets[0].disapproved, true);
    assert.equal(r.totals.spend, 0);
  }
});

test('maxAdSets gives 1 at L1 budgets', () => {
  assert.equal(maxAdSets(461, 50.91), 1);
  assert.equal(maxAdSets(2300, 50.91), 4);
});

test('same inputs and seed produce identical output', () => {
  assert.deepEqual(simulateWeek(ctx({ seed: 5 })), simulateWeek(ctx({ seed: 5 })));
});
