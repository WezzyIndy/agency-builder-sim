// src/ui/screens/brief.js
//
// The client brief (Ads Manager Only). Shows what an agency would know from
// an intake call. Hidden fields (tracking state, difficulty, red flags) stay
// hidden; the intake notes are where trouble can be spotted.

import { h, button, section, stat, chips } from '../dom.js';
import { noticeBar, stickyActions, BENCHMARK_LABEL } from './common.js';
import { money, cost, pct } from '../format.js';
import { briefBench } from '../../engine/week.js';
import { termsFor } from '../terms.js';

const REALISM = [
  { id: 1, label: '1', sub: 'Steady' },
  { id: 2, label: '2', sub: '' },
  { id: 3, label: '3', sub: 'Default' },
  { id: 4, label: '4', sub: '' },
  { id: 5, label: '5', sub: 'Volatile' },
];

const row = (label, value) => [h('dt', {}, label), h('dd', {}, value)];

/** The economics card: one pool, HVAC's two pools, or ecomm order economics. */
function economicsSection(b, t) {
  const e = b.econ;
  if (t.sales) {
    return section(
      'Client economics',
      h('dl', { class: 'kv' }, row(t.firstJob, money(e.aov)), row('Gross margin', pct(e.margin)), row('Breakeven cost per purchase, before your fee', cost(e.breakeven)), row('Breakeven ROAS', `${(1 / e.margin).toFixed(2)}x`)),
      h('p', { class: 'tiny muted' }, 'Breakeven = average order value x margin. First orders only: repeat purchases are not counted.'),
    );
  }
  if (t.pooled) {
    const pool = (name, p) => [row(`${name}: average job`, money(p.firstJob)), row(`${name}: close rate`, pct(p.closeRate)), row(`${name}: margin`, pct(p.margin))];
    return section(
      'Client economics',
      h(
        'dl',
        { class: 'kv' },
        row('Expected lead mix', `${pct(e.serviceShare)} service · ${pct(1 - e.serviceShare)} replacement`),
        pool('Service', e.pools.service),
        pool('Replacement', e.pools.replacement),
        row('Value per service lead', cost(e.pools.service.breakevenCpl)),
        row('Value per replacement lead', cost(e.pools.replacement.breakevenCpl)),
        row('Breakeven cost per lead at that mix, before your fee', cost(e.breakeven)),
      ),
      h('p', { class: 'tiny muted' }, 'Value per lead = job value x close rate x margin. A replacement lead is worth many service leads, so the mix your ads deliver changes what every lead is worth.'),
    );
  }
  const repeat = e.twelveMonth > e.firstJob;
  return section(
    'Client economics',
    h(
      'dl',
      { class: 'kv' },
      row(t.firstJob, money(e.firstJob)),
      repeat && row('12-month customer value', money(e.twelveMonth)),
      row('Close rate (client\'s estimate)', pct(e.closeRate)),
      row('Gross margin', pct(e.margin)),
      row('Breakeven cost per lead, before your fee', cost(e.breakeven)),
    ),
    h(
      'p',
      { class: 'tiny muted' },
      repeat
        ? 'Breakeven = customer value x close rate x margin, where customer value counts the first job plus half the expected repeat revenue.'
        : 'Breakeven = job value x close rate x margin.',
    ),
  );
}

function scoringNote(t) {
  const lead = 'You\'re scored on the profit target (performance) and on how the client feels about their expectation (satisfaction).';
  if (t.sales) return `${lead} The client counts real orders and their profit, not platform-reported purchases.`;
  if (t.pooled) return `${lead} Both count leads by what they\'re worth: a replacement estimate counts for far more than a tune-up.`;
  return `${lead} The client counts real ${t.jobs}, not platform-reported leads.`;
}

export function renderBrief(app, actions) {
  const run = app.run;
  const b = run.brief;
  const t = termsFor(run);
  const bench = briefBench(b);
  const feeShare = b.fee.monthly / b.monthlyBudget;
  const ex = b.expectation;
  return h(
    'div',
    { class: 'stack' },
    noticeBar(app, actions),
    h(
      'section',
      { class: 'card hero' },
      h('div', { class: 'eyebrow' }, `New client · ${b.label} · Level ${b.level} · Meta`),
      h('h1', {}, b.name),
      h('p', { class: 'muted' }, t.pitch(b)),
      h(
        'div',
        { class: 'stats' },
        stat('Ad budget', `${money(b.monthlyBudget)}/mo`, `about ${money(b.weeklyBudget)} a week`),
        stat('Campaign', `${b.campaignWeeks} weeks`),
        stat('Your fee', `${money(b.fee.monthly)}/mo`, `$1,000 + 10% of spend · ${pct(feeShare)} of ad spend`),
      ),
    ),
    economicsSection(b, t),
    section(
      'The target',
      h(
        'div',
        { class: 'stats' },
        stat(`Profit target: true ${t.costPer}`, cost(b.target.cost), t.sales ? `ROAS ${(b.econ.aov / b.target.cost).toFixed(2)}x · what the client can pay after your fee` : 'what the client can pay after ads and your fee', 'good'),
        stat(`Benchmark ${t.costPer}`, `${cost(bench.range.min)} – ${cost(bench.range.max)}`, `${BENCHMARK_LABEL} (${t.benchmarkCategory}${t.pooled ? ', blended at their mix' : ''})`),
        stat('Client expects', cost(ex.cost), ex.rampWeeks ? `per ${t.result}, after a ${ex.rampWeeks}-week ramp` : `per ${t.result}, from week 1 (no ramp)`, ex.cost < bench.range.min ? 'warn' : null),
      ),
      h(
        'p',
        { class: 'small' },
        `Profit target = breakeven ${cost(b.econ.breakeven)} x ${b.k.toFixed(2)} profit cushion x ${pct(b.adShare)} of their spend that goes to ads. Your fee is a client cost too, so a bigger fee shrinks this target.`,
      ),
      h('p', { class: 'small muted' }, scoringNote(t)),
    ),
    section(
      'Intake notes',
      h('ul', { class: 'list' }, b.intakeNotes.map((n) => h('li', { class: 'small' }, n.text))),
      h('p', { class: 'tiny muted' }, 'Read these like an agency owner. Some clients are not worth taking.'),
    ),
    section(
      'Realism',
      h('p', { class: 'small muted' }, 'Low realism tracks benchmarks tightly, so best practice reliably wins. High realism adds volatility, and unconventional setups can win or lose. Locked once you take the client.'),
      chips('Realism', REALISM, run.realism, (id) => actions.setRealism(id), { className: 'compact' }),
    ),
    stickyActions(
      h('div', { class: 'actions' }, button('Decline this client', () => actions.decide({ type: 'decline' }), 'secondary'), button('Take the client', () => actions.decide({ type: 'accept' }), 'primary')),
    ),
  );
}
