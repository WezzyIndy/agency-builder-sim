// src/ui/screens/roundDebrief.js

import { h, button, section, stat, meter } from '../dom.js';
import { stickyActions } from './common.js';
import { cost, money, num } from '../format.js';
import { roundDebrief } from '../../engine/debrief.js';
import { contentFor } from '../../content/index.js';

export function renderRoundDebrief(app, actions) {
  const run = app.run;
  const d = roundDebrief(run, app.view.debriefWeek);
  if (!d) {
    actions.closeDebrief();
    return h('div');
  }
  const n = d.numbers;
  const rewrites = contentFor(run.businessId).debrief.POLICY_REWRITES;
  const policy = d.driver.key === 'policy' ? (d.driver.flags || []).filter((f) => rewrites[f]) : [];
  const gap = n.trueLeads > 0 ? n.reportedLeads / n.trueLeads : null;
  return h(
    'div',
    { class: 'stack' },
    h(
      'section',
      { class: 'card hero' },
      h('div', { class: 'eyebrow' }, `Week ${d.week} debrief`),
      h('h1', {}, d.headline),
      d.stronger && h('p', {}, h('strong', {}, 'Stronger move: '), d.stronger),
    ),
    section(
      'The numbers',
      h(
        'div',
        { class: 'stats' },
        stat('Spend', money(n.spend)),
        stat('Real leads', num(n.trueLeads), `platform said ${num(n.reportedLeads)}`, gap !== null && gap > 1.5 ? 'warn' : null),
        stat('Booked clients', num(n.jobs)),
        stat('Real cost per lead', cost(n.trueCpl)),
        stat('Platform cost per lead', cost(n.platformCpl)),
        stat('Results vs expectation', n.results === null ? 'no delivery' : `${Math.round(n.results)}/100`),
      ),
      meter('Client satisfaction', n.satisfaction),
      meter('Relationship', n.relationship),
    ),
    d.notes.length > 0 && section('Also this week', h('ul', { class: 'list' }, d.notes.map((x) => h('li', { class: 'small' }, x)))),
    policy.length > 0 &&
      section(
        'Policy fix',
        policy.map((f) => h('div', { class: 'stack small' }, h('p', {}, h('strong', {}, 'Problem: '), rewrites[f].problem), h('p', {}, h('strong', {}, 'Compliant version: '), rewrites[f].rewrite))),
      ),
    stickyActions(button(run.status === 'final' ? 'See the final debrief' : 'Plan next week', actions.closeDebrief, 'primary', { class: 'btn btn-primary btn-block' })),
  );
}
