// src/ui/screens/setup.js
//
// Campaign setup before launch: Advantage+ or manual, one or more ad sets,
// and the budget split.

import { h, button, section, chips } from '../dom.js';
import { noticeBar, stickyActions } from './common.js';
import { adSetEditor } from './adSetEditor.js';
import { blankAdSet, reconcileAdSet } from '../flow.js';
import { money, num } from '../format.js';
import { briefBench } from '../../engine/week.js';
import { termsFor } from '../terms.js';

/** A store starts from Sales with the purchase event; everyone else from Leads. */
export function initialDraft(run) {
  const base = run.brief.goal === 'sales' ? blankAdSet({ objective: 'sales', location: 'website', goal: 'conversions', event: 'purchase' }) : blankAdSet();
  return { setup: 'advantage', adSets: [reconcileAdSet(run, base, run.brief.goal === 'sales' ? 'event' : 'objective')], active: 0 };
}

/** Shared editor for a whole campaign (setup type, ad set tabs, split). Used by launch and relaunch. */
export function campaignEditor(app, actions, draftKey) {
  const run = app.run;
  const draft = app.view[draftKey];
  const update = (patch) => actions.setView({ [draftKey]: { ...draft, ...patch } });
  const active = Math.min(draft.active, draft.adSets.length - 1);
  const bench = briefBench(run.brief);
  const t = termsFor(run);
  const totalShare = draft.adSets.reduce((s, a) => s + a.budgetShare, 0) || 1;
  const weekly = run.brief.weeklyBudget * run.budgetFactor;
  const setAdSet = (i, a) => update({ adSets: draft.adSets.map((x, j) => (j === i ? a : x)) });
  const addAdSet = () => update({ adSets: [...draft.adSets, { ...draft.adSets[active], budgetShare: 1 / draft.adSets.length }], active: draft.adSets.length });
  const removeAdSet = (i) => update({ adSets: draft.adSets.filter((_, j) => j !== i), active: 0 });
  const setObjectiveAll = (a) => {
    // One objective per campaign: an objective change applies to every ad set.
    const adSets = draft.adSets.map((x, j) => (j === active ? a : x.objective === a.objective ? x : reconcileAdSet(run, { ...x, objective: a.objective }, 'objective')));
    update({ adSets });
  };
  return h(
    'div',
    { class: 'stack' },
    section(
      'Campaign setup',
      chips(
        'Campaign setup',
        [
          { id: 'advantage', label: 'Advantage+ (recommended)', sub: 'Meta automates delivery; you keep the controls that matter' },
          { id: 'manual', label: 'Manual', sub: 'More control, a small efficiency cost' },
        ],
        draft.setup,
        (id) => update({ setup: id }),
      ),
    ),
    section(
      'Ad sets',
      h(
        'div',
        { class: 'tabs', role: 'tablist' },
        draft.adSets.map((_, i) => h('button', { type: 'button', role: 'tab', class: ['tab', i === active && 'is-on'], 'aria-selected': i === active ? 'true' : 'false', onClick: () => update({ active: i }) }, `Ad set ${i + 1}`)),
        draft.adSets.length < 4 && h('button', { type: 'button', class: 'tab', onClick: addAdSet }, '+ Add ad set'),
      ),
      adSetEditor(run, draft.adSets[active], { onChange: (a) => (a.objective !== draft.adSets[active].objective ? setObjectiveAll(a) : setAdSet(active, a)) }),
      draft.adSets.length > 1 &&
        h(
          'div',
          { class: 'stack' },
          h('div', { class: 'field-label' }, 'Budget split'),
          draft.adSets.map((a, i) =>
            h(
              'label',
              { class: 'stack small' },
              h('span', { class: 'spread' }, h('span', {}, `Ad set ${i + 1}`), h('span', {}, `${Math.round((100 * a.budgetShare) / totalShare)}% · ${money((weekly * a.budgetShare) / totalShare)}/wk`)),
              h('input', { type: 'range', min: 5, max: 100, step: 5, value: Math.round((100 * a.budgetShare) / totalShare), 'aria-label': `Ad set ${i + 1} budget share`, onChange: (ev) => setAdSet(i, { ...a, budgetShare: Number(ev.target.value) / 100 }) }),
            ),
          ),
          button(`Remove ad set ${active + 1}`, () => removeAdSet(active), 'ghost'),
        ),
      h(
        'p',
        { class: 'small muted' },
        `At ${money(weekly)} a week and a typical ${money(bench.cost, 2)} per ${t.result}, the whole budget buys about ${num(weekly / bench.cost)} ${t.results} a week. Meta's learning phase wants about 50 optimization events per ad set per week.`,
      ),
    ),
  );
}

export function renderSetup(app, actions) {
  if (!app.view.draft) app.view.draft = initialDraft(app.run);
  const draft = app.view.draft;
  const launch = () => {
    if (actions.decide({ type: 'launch', campaign: { setup: draft.setup, adSets: draft.adSets } })) actions.setView({ draft: null }, true);
  };
  return h(
    'div',
    { class: 'stack' },
    h('section', { class: 'card hero' }, h('div', { class: 'eyebrow' }, 'Campaign setup'), h('h1', {}, 'Build the campaign.'), h('p', { class: 'muted' }, 'The objective locks at launch. Pick the goal Meta should optimize for, who it can show ads to, and what the ads say.')),
    campaignEditor(app, actions, 'draft'),
    noticeBar(app, actions),
    stickyActions(button('Launch campaign', launch, 'primary', { class: 'btn btn-primary btn-block' })),
  );
}
