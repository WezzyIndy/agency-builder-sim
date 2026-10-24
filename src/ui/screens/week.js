// src/ui/screens/week.js
//
// A weekly round: answer any client event, review last week, make edits,
// pick the client update, and run the week.

import { h, button, section, chips, meter } from '../dom.js';
import { noticeBar, stickyActions, describeAdSet } from './common.js';
import { adSetEditor } from './adSetEditor.js';
import { campaignEditor } from './setup.js';
import { adSetChanges } from '../flow.js';
import { money, cost, num, score } from '../format.js';
import { contentFor } from '../../content/index.js';
import { currentWeeklyBudget } from '../../engine/run.js';
import { OBJECTIVES, LOCATION_LABELS, GOAL_LABELS, EVENT_LABELS } from '../../engine/metaRules.js';

export const LABELS = {
  objective: (id) => OBJECTIVES[id]?.label ?? id,
  location: (id) => LOCATION_LABELS[id] ?? id,
  goal: (id) => GOAL_LABELS[id] ?? id,
  event: (id) => EVENT_LABELS[id] ?? id,
};

const UPDATES = [
  { id: 'honest', label: 'Honest update', sub: 'Real bookings and what you\'re doing about it' },
  { id: 'spun', label: 'Spin it', sub: 'Lead with platform numbers; frame it as good' },
  { id: 'skip', label: 'Skip this week', sub: 'Say nothing' },
];

function eventCard(app, actions) {
  const ev = app.run.pendingEvent;
  if (!ev) return null;
  const event = contentFor(app.run.businessId).events.find((e) => e.id === ev.id);
  return h(
    'section',
    { class: 'card is-alert', role: 'alertdialog', 'aria-label': 'Client message' },
    h('div', { class: 'eyebrow' }, 'Client message'),
    h('h2', {}, event.title),
    h('p', {}, event.prompt),
    h('div', { class: 'stack' }, event.responses.map((r) => button(r.text, () => actions.decide({ type: 'respondEvent', response: r.id }), 'secondary', { class: 'btn btn-secondary btn-block' }))),
  );
}

function adSetCard(app, actions, a, lastWeek) {
  const run = app.run;
  const r = lastWeek?.adSets.find((x) => x.id === a.id);
  const angles = contentFor(run.businessId).angles;
  const editing = app.view.edit?.adSetId === a.id;
  const tags = [];
  if (r?.disapproved) tags.push(h('span', { class: 'tag bad' }, 'Disapproved last week'));
  else if (r?.learningLimited) tags.push(h('span', { class: 'tag warn' }, `Learning limited · ~${num(r.expectedEvents)} events/wk`));
  else if (r) tags.push(h('span', { class: 'tag good' }, 'Learning'));
  if (a.resetWeek === run.weekIndex + 1 && run.weekIndex > 0) tags.push(h('span', { class: 'tag' }, 'Learning resets this week'));
  const share = run.campaign.adSets.length > 1 ? ` · ${Math.round(a.budgetShare * 100)}% of budget` : '';
  if (editing) {
    const draft = app.view.edit.draft;
    const save = () => {
      const changes = adSetChanges(a, draft);
      if (!Object.keys(changes).length) return actions.setView({ edit: null });
      if (actions.decide({ type: 'editAdSet', adSetId: a.id, changes })) actions.setView({ edit: null });
    };
    return h(
      'div',
      { class: 'check' },
      h('div', { class: 'check-head' }, h('strong', {}, `Editing ${a.id.replace('as', 'ad set ')}`), h('span', { class: 'tag warn' }, 'Significant edits reset learning')),
      adSetEditor(run, draft, { lockObjective: true, onChange: (d) => actions.setView({ edit: { adSetId: a.id, draft: d } }) }),
      h('div', { class: 'actions' }, button('Cancel', () => actions.setView({ edit: null }), 'secondary'), button('Save changes', save, 'primary')),
    );
  }
  return h(
    'div',
    { class: 'check' },
    h('div', { class: 'check-head' }, h('strong', {}, `${a.id.replace('as', 'Ad set ')}${share}`), h('div', { class: 'row' }, tags)),
    h('p', { class: 'small' }, describeAdSet(a, LABELS)),
    h('p', { class: 'small muted' }, `${a.audience.option === 'controls' ? 'Advantage+ audience, controls only' : a.audience.option === 'suggestions' ? 'Advantage+ audience with suggestions' : 'Hard-limited audience'} · ${a.audience.minAge}+ · Angles: ${a.angles.map((id) => angles.find((x) => x.id === id).title).join(', ')}`),
    h(
      'div',
      { class: 'row' },
      button('Edit', () => actions.setView({ edit: { adSetId: a.id, draft: JSON.parse(JSON.stringify(a)) } }), 'secondary'),
      run.campaign.adSets.length > 1 && button('Remove', () => actions.decide({ type: 'removeAdSet', adSetId: a.id }), 'ghost'),
    ),
  );
}

function budgetSplit(app, actions) {
  const run = app.run;
  if (run.campaign.adSets.length < 2) return null;
  const shares = app.view.shares || Object.fromEntries(run.campaign.adSets.map((a) => [a.id, Math.round(a.budgetShare * 100)]));
  const total = Object.values(shares).reduce((s, x) => s + x, 0) || 1;
  return h(
    'div',
    { class: 'stack' },
    h('div', { class: 'field-label' }, 'Budget split'),
    run.campaign.adSets.map((a) =>
      h(
        'label',
        { class: 'stack small' },
        h('span', { class: 'spread' }, h('span', {}, a.id.replace('as', 'Ad set ')), h('span', {}, `${Math.round((100 * shares[a.id]) / total)}%`)),
        h('input', { type: 'range', min: 0, max: 100, step: 5, value: shares[a.id], 'aria-label': `${a.id} share`, onChange: (ev) => actions.setView({ shares: { ...shares, [a.id]: Number(ev.target.value) } }) }),
      ),
    ),
    app.view.shares && h('div', { class: 'actions' }, button('Reset', () => actions.setView({ shares: null }), 'secondary'), button('Apply split', () => actions.decide({ type: 'setBudgetSplit', shares }) && actions.setView({ shares: null }), 'primary')),
  );
}

const MAX_AD_SETS = 6;

/** A new ad set added mid-campaign: same objective, starts learning from zero next week. */
function addAdSetCard(app, actions) {
  const run = app.run;
  const adding = app.view.adding;
  if (!adding) return null;
  const share = adding.share;
  const others = run.campaign.adSets.length;
  const save = () => {
    if (actions.decide({ type: 'addAdSet', adSet: { ...adding.draft, budgetShare: share / 100 } })) actions.setView({ adding: null });
  };
  return h(
    'div',
    { class: 'check' },
    h('div', { class: 'check-head' }, h('strong', {}, 'New ad set'), h('span', { class: 'tag warn' }, 'Starts learning from zero')),
    adSetEditor(run, adding.draft, { lockObjective: true, onChange: (d) => actions.setView({ adding: { ...adding, draft: d } }) }),
    h(
      'label',
      { class: 'stack small' },
      h('span', { class: 'spread' }, h('span', { class: 'field-label' }, 'Budget for the new ad set'), h('span', {}, `${share}% · ${money((currentWeeklyBudget(run) * share) / 100)}/wk`)),
      h('input', { type: 'range', min: 5, max: 90, step: 5, value: share, 'aria-label': 'New ad set budget share', onChange: (ev) => actions.setView({ adding: { ...adding, share: Number(ev.target.value) } }) }),
      h('span', { class: 'tiny muted' }, `Taken proportionally from the existing ${others === 1 ? 'ad set' : `${others} ad sets`}, which counts as a budget edit for them.`),
    ),
    h('div', { class: 'actions' }, button('Cancel', () => actions.setView({ adding: null }), 'secondary'), button('Add ad set', save, 'primary')),
  );
}

function startAdding(app, actions) {
  const run = app.run;
  const base = JSON.parse(JSON.stringify(run.campaign.adSets[0]));
  const share = Math.round(100 / (run.campaign.adSets.length + 1) / 5) * 5;
  actions.setView({ adding: { draft: base, share }, edit: null, shares: null });
}

function lastWeekCard(run) {
  const w = run.weeks.at(-1);
  if (!w) return null;
  const t = w.totals;
  return section(
    `Week ${w.week} recap`,
    h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        {},
        h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Leads'), h('th', {}, 'Cost/lead'))),
        h(
          'tbody',
          {},
          h('tr', {}, h('td', {}, 'Platform reported'), h('td', {}, num(t.reportedLeads)), h('td', {}, cost(t.platformCpl))),
          h('tr', {}, h('td', {}, 'Real (client\'s CRM)'), h('td', {}, num(t.trueLeads)), h('td', {}, cost(t.trueCpl))),
        ),
      ),
    ),
    h('p', { class: 'small' }, `${num(t.jobs)} booked ${t.jobs === 1 ? 'client' : 'clients'} from ${money(t.spend)} of spend.`),
  );
}

function historyCard(run) {
  if (run.weeks.length < 2) return null;
  return section(
    'All weeks',
    h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Wk'), h('th', {}, 'Spend'), h('th', {}, 'Leads'), h('th', {}, 'Booked'), h('th', {}, 'Real CPL'), h('th', {}, 'Sat'))),
        h(
          'tbody',
          {},
          run.weeks.map((w) => h('tr', {}, h('td', {}, String(w.week)), h('td', {}, money(w.totals.spend)), h('td', {}, num(w.totals.trueLeads)), h('td', {}, num(w.totals.jobs)), h('td', {}, cost(w.totals.trueCpl)), h('td', {}, score(w.satisfaction)))),
        ),
      ),
    ),
  );
}

export function renderWeek(app, actions) {
  const run = app.run;
  const week = run.weekIndex + 1;
  const last = run.weeks.at(-1);
  const update = app.view.update || 'honest';
  const relaunching = Boolean(app.view.relaunch);
  const runWeek = () => {
    if (actions.decide({ type: 'endWeek', update })) {
      actions.setView({ update: null, edit: null, shares: null, relaunch: null, adding: null });
      actions.showDebrief(run.weekIndex + 1);
    }
  };
  const doRelaunch = () => {
    const d = app.view.relaunch;
    if (actions.decide({ type: 'relaunch', campaign: { setup: d.setup, adSets: d.adSets } })) actions.setView({ relaunch: null });
  };
  return h(
    'div',
    { class: 'stack' },
    noticeBar(app, actions),
    h(
      'section',
      { class: 'card hero' },
      h('div', { class: 'eyebrow' }, `Week ${week} of ${run.brief.campaignWeeks} · ${run.brief.name}`),
      h('h1', {}, run.weekIndex === 0 ? 'Launch week.' : 'Plan the week.'),
      h('p', { class: 'muted' }, `Ad budget this week: ${money(currentWeeklyBudget(run))}. Client expects about ${cost(run.brief.expectation.cost)} per real lead${run.brief.expectation.rampWeeks ? ` after a ${run.brief.expectation.rampWeeks}-week ramp` : ''}.`),
      last && meter('Client satisfaction', last.satisfaction),
      last && meter('Relationship', run.relationship),
    ),
    eventCard(app, actions),
    lastWeekCard(run),
    section(
      'Campaign',
      h('div', { class: 'stack' }, run.campaign.adSets.map((a) => adSetCard(app, actions, a, last))),
      addAdSetCard(app, actions),
      !app.view.adding && budgetSplit(app, actions),
      !relaunching &&
        h(
          'div',
          { class: 'row' },
          !app.view.adding && !app.view.edit && run.campaign.adSets.length < MAX_AD_SETS && button('+ Add ad set', () => startAdding(app, actions), 'secondary'),
          button('Relaunch as a new campaign', () => actions.setView({ relaunch: { setup: run.campaign.setup, adSets: run.campaign.adSets.map((a) => JSON.parse(JSON.stringify(a))), active: 0 } }), 'ghost'),
        ),
      h('p', { class: 'tiny muted' }, 'Budget, event, audience, and creative changes are significant edits: learning restarts the next week.'),
    ),
    relaunching &&
      h(
        'div',
        { class: 'stack' },
        h('div', { class: 'notice warn' }, 'A relaunch builds a new campaign: you can change the objective, but every ad set starts learning from zero.'),
        campaignEditor(app, actions, 'relaunch'),
        h('div', { class: 'actions' }, button('Cancel relaunch', () => actions.setView({ relaunch: null }), 'secondary'), button('Relaunch', doRelaunch, 'primary')),
      ),
    historyCard(run),
    section('Client update', h('p', { class: 'small muted' }, 'What do you tell the client this week?'), chips('Client update', UPDATES, update, (id) => actions.setView({ update: id }))),
    stickyActions(button(run.pendingEvent ? 'Answer the client first' : `Run week ${week}`, runWeek, 'primary', { class: 'btn btn-primary btn-block', disabled: Boolean(run.pendingEvent) || Boolean(app.view.edit) || Boolean(app.view.adding) || relaunching })),
  );
}
