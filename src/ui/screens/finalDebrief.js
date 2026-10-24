// src/ui/screens/finalDebrief.js

import { h, button, section, stat } from '../dom.js';
import { stickyActions } from './common.js';
import { money, cost, num, score, pct, hours } from '../format.js';
import { finalDebrief } from '../../engine/debrief.js';

function scoreTone(x) {
  return x >= 70 ? 'good' : x >= 40 ? 'warn' : 'bad';
}

function counterfactualCard(cf) {
  if (!cf.found) {
    return section(
      'What would have changed the outcome',
      h('p', { class: 'small' }, cf.reason === 'declined' ? 'Nothing to replay: you declined the client.' : cf.reason === 'nothing_failed' ? 'No decision checks failed, so there is no higher-impact alternative to replay.' : 'No single change from your failed checks would have moved the true result much.'),
    );
  }
  const b = cf.before;
  const a = cf.after;
  return section(
    'What would have changed the outcome',
    h('p', {}, h('strong', {}, `${cf.label}.`), ' Same client, same seed, only this decision changed:'),
    h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        {},
        h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'You'), h('th', {}, 'With the change'))),
        h(
          'tbody',
          {},
          h('tr', {}, h('td', {}, 'Outcome'), h('td', {}, b.endReason.replace('_', ' ')), h('td', {}, a.endReason.replace('_', ' '))),
          h('tr', {}, h('td', {}, 'Booked clients'), h('td', {}, num(b.jobs)), h('td', {}, num(a.jobs))),
          h('tr', {}, h('td', {}, 'Real cost per lead (booked basis)'), h('td', {}, cost(b.qaCpl)), h('td', {}, cost(a.qaCpl))),
          h('tr', {}, h('td', {}, 'Client profit after fee'), h('td', {}, money(b.clientProfit)), h('td', {}, money(a.clientProfit))),
          h('tr', {}, h('td', {}, 'Satisfaction'), h('td', {}, score(b.satisfaction)), h('td', {}, score(a.satisfaction))),
        ),
      ),
    ),
  );
}

export function renderFinalDebrief(app, actions) {
  const run = app.run;
  const key = `${run.seed}|${run.decisions.length}`;
  if (app.view.finalCache?.key !== key) app.view.finalCache = { key, d: finalDebrief(run) };
  const d = app.view.finalCache.d;
  const s = d.scores;
  const children = [
    h(
      'section',
      { class: 'card hero' },
      h('div', { class: 'eyebrow' }, `${run.brief.name} · Final debrief`),
      h('h1', {}, d.headline),
      d.walkAway && h('div', { class: ['notice', d.walkAway.correct ? 'good' : 'bad'] }, d.walkAway.text),
      h('div', { class: 'row' }, h('div', { class: 'big-score' }, score(s.adScore)), h('div', { class: 'small muted' }, 'Ad mode score', h('br'), '40% performance · 30% best practice · 30% satisfaction')),
      h('div', { class: 'stats' }, stat('Performance', score(s.performance), 'vs the profit target', scoreTone(s.performance)), stat('Best practice', score(s.bestPractice), 'process checks passed', scoreTone(s.bestPractice)), stat('Satisfaction', score(s.satisfaction), 'average week', scoreTone(s.satisfaction))),
    ),
    section('The client', h('p', {}, d.difficulty.text), d.expectationNote && h('div', { class: 'notice warn' }, d.expectationNote)),
  ];

  if (d.totals && d.clientProfit) {
    const t = d.totals;
    const p = d.clientProfit;
    const gap = d.trueVsReported;
    children.push(
      section(
        'Results',
        h('div', { class: 'stats' }, stat('Spend', money(t.spend)), stat('Real leads', num(t.trueLeads)), stat('Booked clients', num(t.jobs)), stat('Real cost per lead', cost(t.trueCpl)), stat('Profit target', cost(d.target)), stat('Client expected', cost(d.promise.cost))),
        gap && gap.gap !== null && Math.abs(gap.gap) > 0.15 && h('div', { class: 'notice warn' }, `The platform reported ${num(gap.reportedLeads)} leads; the client really got ${num(gap.trueLeads)} (${gap.gap > 0 ? '+' : ''}${pct(gap.gap)}).`),
      ),
      section(
        'Client profit',
        h(
          'dl',
          { class: 'kv' },
          h('dt', {}, 'After ads and your fee (first visits)'),
          h('dd', { class: p.afterFee >= 0 ? '' : 'muted' }, money(p.afterFee)),
          h('dt', {}, 'Ads only, before your fee'),
          h('dd', {}, money(p.adsOnly)),
          h('dt', {}, 'After fee, counting 12-month value'),
          h('dd', {}, money(p.afterFee12)),
          h('dt', {}, 'Your fee took'),
          h('dd', {}, money(p.feePaid)),
        ),
      ),
      section(
        'Your agency',
        h('dl', { class: 'kv' }, h('dt', {}, 'Fee revenue'), h('dd', {}, money(d.agencyPnl.feeRevenue)), h('dt', {}, 'Hours spent'), h('dd', {}, hours(d.agencyPnl.hours)), h('dt', {}, 'Effective hourly rate'), h('dd', {}, money(d.agencyPnl.effectiveRate)), h('dt', {}, 'Your target'), h('dd', {}, money(d.agencyPnl.targetRate))),
        h('div', { class: ['notice', d.agencyPnl.verdict === 'keep' ? 'good' : 'warn'] }, d.agencyPnl.verdictText),
      ),
      counterfactualCard(d.counterfactual),
    );
  }

  if (d.rubric.checks.length) {
    children.push(
      section(
        'Best-practice checks',
        h(
          'div',
          { class: 'stack' },
          d.rubric.checks.map((c) =>
            h(
              'div',
              { class: 'rubric-item' },
              h('span', { class: ['rubric-icon', c.pass === null ? 'na' : c.pass ? 'pass' : 'fail'], 'aria-label': c.pass === null ? 'not applicable' : c.pass ? 'passed' : 'failed' }, c.pass === null ? '-' : c.pass ? '✓' : '✕'),
              h('div', {}, h('div', { class: 'small' }, h('strong', {}, c.label), h('span', { class: 'muted' }, ` · ${c.group}`)), h('div', { class: 'small muted' }, c.reason)),
            ),
          ),
        ),
      ),
    );
  }
  if (d.eventReview.length) {
    children.push(
      section(
        'Client events',
        h(
          'div',
          { class: 'stack' },
          d.eventReview.map((e) =>
            h(
              'div',
              { class: 'check' },
              h('div', { class: 'check-head' }, h('strong', {}, e.title), h('span', { class: ['tag', e.chosenWasBest ? 'good' : 'warn'] }, e.chosenWasBest ? 'Best response' : 'Better option existed')),
              h('p', { class: 'small' }, `You: ${e.chosen}`),
              !e.chosenWasBest && h('p', { class: 'small' }, `Better: ${e.best}`),
              h('p', { class: 'small muted' }, e.explanation),
            ),
          ),
        ),
      ),
    );
  }
  if (d.policyIssues.length) {
    children.push(section('Policy issues', d.policyIssues.map((p) => h('div', { class: 'stack small' }, h('p', {}, h('strong', {}, 'Problem: '), p.problem), h('p', {}, h('strong', {}, 'Compliant version: '), p.rewrite)))));
  }
  children.push(h('p', { class: 'tiny muted' }, d.honestLimit));
  children.push(stickyActions(h('div', { class: 'actions' }, button('Main menu', actions.toMenu, 'secondary'), button('Next client', actions.newRun, 'primary'))));
  return h('div', { class: 'stack' }, ...children);
}
