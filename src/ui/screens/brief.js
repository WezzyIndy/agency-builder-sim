// src/ui/screens/brief.js
//
// The client brief (Ads Manager Only). Shows what an agency would know from
// an intake call. Hidden fields (tracking state, difficulty, red flags) stay
// hidden; the intake notes are where trouble can be spotted.

import { h, button, section, stat, chips } from '../dom.js';
import { noticeBar, stickyActions, BENCHMARK_LABEL } from './common.js';
import { money, cost, pct } from '../format.js';
import { metaLeads } from '../../engine/benchmarks.js';
import { BUSINESS_BENCHMARKS } from '../../config/benchmarks.js';

const REALISM = [
  { id: 1, label: '1', sub: 'Steady' },
  { id: 2, label: '2', sub: '' },
  { id: 3, label: '3', sub: 'Default' },
  { id: 4, label: '4', sub: '' },
  { id: 5, label: '5', sub: 'Volatile' },
];

export function renderBrief(app, actions) {
  const run = app.run;
  const b = run.brief;
  const e = b.econ;
  const bench = metaLeads(BUSINESS_BENCHMARKS[b.businessId].meta);
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
      h('p', { class: 'muted' }, `A med spa in a ${b.locationSize}. They want more booked consultations.`),
      h(
        'div',
        { class: 'stats' },
        stat('Ad budget', `${money(b.monthlyBudget)}/mo`, `about ${money(b.weeklyBudget)} a week`),
        stat('Campaign', `${b.campaignWeeks} weeks`),
        stat('Your fee', `${money(b.fee.monthly)}/mo`, `$1,000 + 10% of spend · ${pct(feeShare)} of ad spend`),
      ),
    ),
    section(
      'Client economics',
      h(
        'dl',
        { class: 'kv' },
        h('dt', {}, 'First visit (average ticket)'),
        h('dd', {}, money(e.firstJob)),
        h('dt', {}, '12-month customer value'),
        h('dd', {}, money(e.twelveMonth)),
        h('dt', {}, 'Close rate (client\'s estimate)'),
        h('dd', {}, pct(e.closeRate)),
        h('dt', {}, 'Gross margin'),
        h('dd', {}, pct(e.margin)),
        h('dt', {}, 'Breakeven cost per lead, before your fee'),
        h('dd', {}, cost(e.breakeven)),
      ),
      h('p', { class: 'tiny muted' }, 'Breakeven = customer value x close rate x margin, where customer value counts the first visit plus half the expected repeat revenue.'),
    ),
    section(
      'The target',
      h(
        'div',
        { class: 'stats' },
        stat('Profit target: true cost per lead', cost(b.target.cost), 'what the client can pay after ads and your fee', 'good'),
        stat('Benchmark cost per lead', `${cost(bench.cplRange.min)}-${cost(bench.cplRange.max)}`, `${BENCHMARK_LABEL} (Beauty & Personal Care)`),
        stat('Client expects', cost(ex.cost), ex.rampWeeks ? `per lead, after a ${ex.rampWeeks}-week ramp` : 'per lead, from week 1 (no ramp)', ex.cost < bench.cplRange.min ? 'warn' : null),
      ),
      h(
        'p',
        { class: 'small' },
        `Profit target = breakeven ${cost(e.breakeven)} x ${b.k.toFixed(2)} profit cushion x ${pct(b.adShare)} of their spend that goes to ads. Your fee is a client cost too, so a bigger fee shrinks this target.`,
      ),
      h('p', { class: 'small muted' }, 'You\'re scored on the profit target (performance) and on how the client feels about their expectation (satisfaction). The client counts real bookings, not platform-reported leads.'),
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
