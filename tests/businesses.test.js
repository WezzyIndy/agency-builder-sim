// tests/businesses.test.js
//
// M4: every business's content is well formed and playable end to end, and
// the business-specific mechanics work: HVAC lead mix, ecomm objectives and
// events, discount angles, and the setAngles event effect.

import test from 'node:test';
import assert from 'node:assert/strict';
import { contentFor, PLAYABLE_BUSINESSES } from '../src/content/index.js';
import { RED_FLAGS } from '../src/config/difficulty.js';
import { BUSINESS_BENCHMARKS } from '../src/config/benchmarks.js';
import { TUNABLES } from '../src/config/tunables.js';
import { createRun, applyDecision, tryDecision, setupContext } from '../src/engine/run.js';
import { generateBrief } from '../src/engine/brief.js';
import { simulateWeek, replacementShare, briefBench } from '../src/engine/week.js';
import { resolveLeadSetup, resolveSalesSetup, validateAdSet } from '../src/engine/metaRules.js';
import { computeRubric } from '../src/engine/scoring.js';
import { finalDebrief, roundDebrief } from '../src/engine/debrief.js';
import { initialDraft } from '../src/ui/screens/setup.js';
import { playRun } from '../harness/play.js';
import { sum } from '../src/engine/math.js';

const AUDIENCES = ['controls', 'suggestions', 'limited'];
const EFFECTS = [
  'pauseAll', 'budgetCut', 'budgetBoost', 'consolidate', 'addAdSet', 'switchToBoost', 'swapCompliant',
  'higherIntent', 'adviseSpeed', 'feeDiscount', 'feeSet', 'demand', 'resetLearning', 'closeMult',
  'marginCut', 'fixDefect', 'endRun', 'setAngles',
];

for (const id of PLAYABLE_BUSINESSES) {
  test(`${id}: content is well formed`, () => {
    const c = contentFor(id);
    const angleIds = c.angles.map((a) => a.id);
    assert.ok(c.angles.length >= 4 && c.angles.length <= 5);
    for (const a of c.angles) for (const aud of AUDIENCES) assert.ok(a.resonance[aud] > 0, `${a.id}.${aud}`);
    for (const x of [...c.recommended.angles, ...c.recommended.refresh]) assert.ok(angleIds.includes(x), `recommended ${x}`);

    const ids = new Set();
    for (const e of c.events) {
      assert.ok(!ids.has(e.id), `duplicate ${e.id}`);
      ids.add(e.id);
      assert.ok(e.responses.length >= 2 && e.responses.length <= 3, e.id);
      for (const r of e.responses) {
        assert.ok(r.score >= 0 && r.score <= 1, `${e.id}.${r.id}`);
        assert.ok(r.explanation.length > 10);
        for (const fx of r.effects) {
          assert.ok(EFFECTS.includes(fx.type), `${e.id}.${r.id}: ${fx.type}`);
          for (const x of fx.angles || []) assert.ok(angleIds.includes(x), `${e.id}.${r.id} angle ${x}`);
        }
      }
    }
    const nonForced = c.events.filter((e) => e.trigger.kind !== 'forced');
    assert.ok(nonForced.length >= 8 && nonForced.length <= 12, `${nonForced.length} events`);
    const isSales = BUSINESS_BENCHMARKS[id].goal === 'sales';
    for (const f of RED_FLAGS.filter((x) => !(isSales && x === 'no_capacity'))) {
      assert.ok(c.events.some((e) => e.trigger.kind === 'forced' && e.trigger.redFlag === f), `forced ${f}`);
    }

    const auditTotal = sum(c.checks.map((x) => x.auditHours));
    const fixTotal = sum(c.checks.map((x) => x.fixHours || 0));
    assert.ok(auditTotal < TUNABLES.onboardingHours);
    assert.ok(auditTotal + fixTotal > TUNABLES.onboardingHours, 'fixing everything should not fit the hour budget');
    assert.ok(c.checks.some((x) => x.tracking && x.critical), 'a critical tracking check');
    for (const ch of c.checks) assert.ok(ch.defect && ch.clean && ch.defectKey, ch.id);
    for (const [k, v] of Object.entries(c.debrief.DRIVER_TEXT)) assert.ok(v.stronger && v.hurt, k);
    for (const k of ['pitch', 'job', 'jobs', 'firstJob', 'benchmarkCategory']) assert.ok(c.terms[k], k);
  });

  test(`${id}: every policy plays every difficulty class to a finite finish`, () => {
    for (const cls of ['achievable', 'hard', 'unviable']) {
      for (const policy of ['bestPractice', 'naive', 'random']) {
        for (const seed of [11, 12]) {
          const s = playRun(policy, { seed, businessId: id, level: 1, realism: 3, forceClass: cls });
          assert.equal(s.status, 'final');
          for (const k of ['performance', 'bestPractice', 'satisfaction', 'adScore']) assert.ok(Number.isFinite(s.final[k]), `${policy} ${cls} ${k}`);
          for (const w of s.weeks) assert.ok(Number.isFinite(w.totals.valueUnits) && Number.isFinite(w.satisfaction), `${policy} week ${w.week}`);
          if (s.weeks.length) {
            const d = finalDebrief(s);
            assert.ok(d.headline);
            assert.ok(roundDebrief(s, 1).headline);
          }
        }
      }
    }
  });

  test(`${id}: the setup screen's starting draft is a valid launch`, () => {
    let s = createRun({ seed: 3, businessId: id, forceClass: 'achievable' });
    s = applyDecision(applyDecision(s, { type: 'accept' }), { type: 'finishOnboarding' });
    const draft = initialDraft(s);
    const a = { ...draft.adSets[0], angles: [contentFor(id).angles[0].id] };
    assert.deepEqual(validateAdSet(a, setupContext(s), contentFor(id).angles.map((x) => x.id)), []);
    assert.equal(a.objective, BUSINESS_BENCHMARKS[id].goal === 'sales' ? 'sales' : 'leads');
  });
}

// ---------------------------------------------------------------- HVAC

const hvacBrief = generateBrief(21, { businessId: 'hvac', level: 1, forceClass: 'achievable' });
const leadAdSet = (angles, overrides = {}) => ({
  id: 'a1', objective: 'leads', location: 'website', goal: 'leads', event: 'lead', formType: null,
  audience: { option: 'controls', minAge: 18 }, angles, budgetShare: 1, paused: false,
  startWeek: 1, angleStartWeek: 1, resetWeek: null, ...overrides,
});
const weekCtx = (brief, adSets, overrides = {}) => ({
  seed: 1, week: 3, realism: 1, brief, campaign: { setup: 'advantage', adSets },
  weeklyBudget: 2000 / (52 / 12), defects: {}, speedToLead: 'average', closeRate: 0.3,
  closeMultExtra: 1, demandMult: 1, corruptWeeks: 0, ...overrides,
});

test('HVAC: replacement-leaning angles and calls raise the replacement share; tune-ups lower it', () => {
  const ctx = { brief: hvacBrief, seed: 1, realism: 1 };
  const base = 1 - hvacBrief.econ.serviceShare;
  const share = (angles, extra) => replacementShare(leadAdSet(angles, extra), resolveLeadSetup(leadAdSet(angles, extra)), ctx);
  assert.ok(share(['financing']) > base);
  assert.ok(share(['tune_up']) < base);
  assert.ok(share(['high_bills'], { location: 'calls', goal: 'calls', event: null }) > share(['high_bills']));
});

test('HVAC: tune-up leads cost less but are worth far less than replacement-leaning leads', () => {
  const run = (angles) => {
    const out = { leads: 0, spend: 0, value: 0 };
    for (let seed = 1; seed <= 300; seed++) {
      const t = simulateWeek({ ...weekCtx(hvacBrief, [leadAdSet(angles)]), seed }).totals;
      out.leads += t.trueLeads;
      out.spend += t.spend;
      out.value += t.valueUnits;
    }
    return { cpl: out.spend / out.leads, costPerValue: out.spend / out.value };
  };
  const tune = run(['tune_up']);
  const repl = run(['financing', 'high_bills']);
  assert.ok(tune.cpl < repl.cpl, 'tune-up leads are cheaper per lead');
  assert.ok(tune.costPerValue > 1.5 * repl.costPerValue, 'but cost far more per unit of value');
});

test('HVAC: the serviceHeavy event fires when two weeks bring almost no replacement leads', () => {
  let found = false;
  for (let seed = 1; seed <= 60 && !found; seed++) {
    let s = createRun({ seed, businessId: 'hvac', forceClass: 'achievable' });
    s = applyDecision(applyDecision(s, { type: 'accept' }), { type: 'finishOnboarding' });
    s = applyDecision(s, { type: 'launch', campaign: { setup: 'advantage', adSets: [leadAdSet(['tune_up'])] } });
    for (let w = 0; w < 4 && s.status === 'running'; w++) {
      if (s.pendingEvent?.id === 'all_tune_ups') found = true;
      if (s.pendingEvent) s = applyDecision(s, { type: 'respondEvent', response: contentFor('hvac').events.find((e) => e.id === s.pendingEvent.id).responses[0].id });
      if (s.status === 'running') s = applyDecision(s, { type: 'endWeek', update: 'honest' });
    }
  }
  assert.ok(found);
});

// ---------------------------------------------------------------- ecomm

const apparelBrief = generateBrief(31, { businessId: 'apparel', level: 1, forceClass: 'achievable' });
const salesAdSet = (overrides = {}) =>
  leadAdSet(['new_arrivals'], { objective: 'sales', location: 'website', goal: 'conversions', event: 'initiate_checkout', ...overrides });

test('ecomm: Traffic, Leads, and Engagement are traps; Sales on the website is not', () => {
  assert.equal(resolveSalesSetup(salesAdSet()).kind, 'sale');
  assert.equal(resolveSalesSetup(salesAdSet({ event: 'purchase' })).kind, 'sale');
  assert.equal(resolveSalesSetup(salesAdSet({ objective: 'traffic', goal: 'link_clicks', event: null })).kind, 'trap');
  assert.equal(resolveSalesSetup(salesAdSet({ objective: 'leads', goal: 'leads', event: 'lead' })).kind, 'trap');
  assert.equal(resolveSalesSetup(salesAdSet({ event: 'lead' })).kind, 'trap');
});

test('ecomm: at an L1 budget, initiate checkout gives Meta more events than purchase', () => {
  const ic = simulateWeek(weekCtx(apparelBrief, [salesAdSet()])).adSets[0];
  const purchase = simulateWeek(weekCtx(apparelBrief, [salesAdSet({ event: 'purchase' })])).adSets[0];
  assert.ok(ic.expectedEvents > 2 * purchase.expectedEvents);
  assert.ok(purchase.learningLimited);
});

test('ecomm: a missing purchase event hides purchases and starves purchase optimization', () => {
  const run = (event, defects) => {
    let reported = 0;
    let real = 0;
    let spend = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const t = simulateWeek({ ...weekCtx(apparelBrief, [salesAdSet({ event })], { defects }), seed }).totals;
      reported += t.reportedLeads;
      real += t.trueLeads;
      spend += t.spend;
    }
    return { reportedShare: reported / real, cpa: spend / real };
  };
  const broken = run('purchase', { missingPurchase: true });
  assert.ok(broken.reportedShare < 0.15);
  assert.ok(broken.cpa > 1.3 * run('purchase', {}).cpa, 'purchase optimization starves');
  assert.ok(run('add_to_cart', { missingPurchase: true }).cpa < broken.cpa, 'add to cart still learns');
});

test('ecomm: a 40%-off angle wins cheap purchases but less gross profit per order', () => {
  const run = (angles) => {
    let p = 0;
    let gross = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const t = simulateWeek({ ...weekCtx(apparelBrief, [salesAdSet({ angles })]), seed }).totals;
      p += t.trueLeads;
      gross += t.gross;
    }
    return gross / p;
  };
  assert.ok(run(['big_sale']) < 0.5 * run(['new_arrivals']));
});

test('ecomm: the rubric wants the Sales objective and a purchase-path event', () => {
  const s = playRun('bestPractice', { seed: 41, businessId: 'apparel', level: 1, realism: 3, forceClass: 'achievable' });
  const checks = Object.fromEntries(s.final.rubric.checks.map((c) => [c.id, c.pass]));
  assert.equal(checks.objective, true);
  assert.equal(checks.goal, true);
  const n = playRun('naive', { seed: 41, businessId: 'apparel', level: 1, realism: 3, forceClass: 'achievable' });
  assert.equal(computeRubric(n).checks.find((c) => c.id === 'objective').pass, false);
});

test('ecomm benchmark is CPA; HVAC blends its pools by service share', () => {
  assert.equal(briefBench(apparelBrief).kind, 'sales');
  const b = briefBench(hvacBrief);
  assert.ok(b.cost > b.pools.service && b.cost < b.pools.replacement);
});

// ---------------------------------------------------------------- effects

test('setAngles swaps every ad set\'s angles as a fix edit', () => {
  let s = createRun({ seed: 5, businessId: 'cleaning', forceClass: 'achievable' });
  s = applyDecision(applyDecision(s, { type: 'accept' }), { type: 'finishOnboarding' });
  s = applyDecision(s, { type: 'launch', campaign: { setup: 'advantage', adSets: [leadAdSet(['deep_clean_deal'])] } });
  s = applyDecision(s, { type: 'endWeek', update: 'honest' });
  // Force the event so the effect can be applied through the reducer.
  s = { ...s, pendingEvent: { id: 'one_time_cleans', week: 1 } };
  const r = tryDecision(s, { type: 'respondEvent', response: 'recurring' });
  assert.ok(r.ok, r.error);
  assert.deepEqual(r.state.campaign.adSets[0].angles, ['time_back', 'recurring_offer']);
  assert.ok(r.state.edits.at(-1).fix);
});
