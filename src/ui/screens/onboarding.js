// src/ui/screens/onboarding.js
//
// Round 0: a 6-hour budget to audit and fix setup. Auditing reveals a
// defect; fixing costs more hours; disclosing to the client is free and
// protects the relationship.

import { h, button, section, meter } from '../dom.js';
import { noticeBar, stickyActions } from './common.js';
import { hours } from '../format.js';
import { contentFor } from '../../content/index.js';
import { TUNABLES } from '../../config/tunables.js';

function checkCard(app, actions, c) {
  const o = app.run.onboarding;
  const a = o.audited[c.id];
  const fixed = o.fixed[c.id];
  const disclosed = o.disclosed[c.id];
  const advised = o.advised[c.id];
  const status = !a ? null : !a.hasDefect ? h('span', { class: 'tag good' }, 'Clean') : fixed ? h('span', { class: 'tag good' }, 'Fixed') : h('span', { class: 'tag warn' }, 'Problem found');
  const body = !a
    ? h('p', { class: 'small muted' }, 'Not checked yet.')
    : !a.hasDefect
      ? h('p', { class: 'small' }, c.clean)
      : h('p', { class: 'small' }, fixed ? c.fixText : advised ? c.adviseText : c.defect);
  const btns = [];
  if (!a) btns.push(button(`Audit · ${hours(c.auditHours)}`, () => actions.decide({ type: 'audit', check: c.id }), 'secondary'));
  else if (a.hasDefect && !fixed) {
    if (c.fixHours) btns.push(button(`Fix · ${hours(c.fixHours)}`, () => actions.decide({ type: 'fix', check: c.id }), 'secondary'));
    if (c.adviseHours && !advised) btns.push(button(`Advise the client · ${hours(c.adviseHours)}`, () => actions.decide({ type: 'advise', check: c.id }), 'secondary'));
    if (!disclosed) btns.push(button('Disclose to client · free', () => actions.decide({ type: 'disclose', check: c.id }), 'ghost'));
  }
  return h(
    'div',
    { class: ['check', a && (a.hasDefect && !fixed ? 'is-defect' : 'is-clean')] },
    h('div', { class: 'check-head' }, h('strong', {}, c.title), h('div', { class: 'row' }, status, disclosed && h('span', { class: 'tag' }, 'Disclosed'), advised && h('span', { class: 'tag' }, 'Advised'))),
    body,
    btns.length > 0 && h('div', { class: 'row' }, btns),
  );
}

export function renderOnboarding(app, actions) {
  const run = app.run;
  const content = contentFor(run.businessId);
  const o = run.onboarding;
  const total = TUNABLES.onboardingHours;
  const left = total - o.hoursUsed;
  return h(
    'div',
    { class: 'stack' },
    noticeBar(app, actions),
    h(
      'section',
      { class: 'card hero' },
      h('div', { class: 'eyebrow' }, 'Round 0 · Onboarding'),
      h('h1', {}, 'Audit the setup before you spend a dollar.'),
      h('p', { class: 'muted' }, `You have ${hours(total)} before launch. Auditing everything takes most of it, so choose what to fix. What you can't fix, you can tell the client about.`),
      meter('Hours used', (o.hoursUsed / total) * 100, { thresholds: [101, 101] }),
      h('p', { class: 'small' }, `${hours(o.hoursUsed)} used · ${hours(left)} left`),
    ),
    section('Tracking and setup', h('div', { class: 'stack' }, content.checks.map((c) => checkCard(app, actions, c)))),
    content.naming &&
      section(
        'Name your custom conversions and audiences',
        h('p', { class: 'small muted' }, 'Meta disables custom conversions and audiences with sensitive health terms in their names.'),
        o.naming
          ? h('p', { class: 'small' }, `Using: ${content.naming.find((n) => n.id === o.naming).label}`)
          : h('div', { class: 'row' }, content.naming.map((n) => button(`${n.label} · ${hours(n.hours)}`, () => actions.decide({ type: 'naming', choice: n.id }), 'secondary'))),
      ),
    stickyActions(
      h('div', { class: 'actions' }, button('Decline this client', () => actions.decide({ type: 'decline' }), 'secondary'), button('Finish onboarding', () => actions.decide({ type: 'finishOnboarding' }), 'primary')),
    ),
  );
}
