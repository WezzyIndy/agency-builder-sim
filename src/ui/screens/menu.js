// src/ui/screens/menu.js

import { h, button, section } from '../dom.js';
import { noticeBar } from './common.js';
import { unlockProgress } from '../../engine/scoring.js';
import { score } from '../format.js';
import { HONEST_LIMIT } from '../../content/medspa/debrief.js';

const MODES = [
  { id: 'ads', title: 'Ads Manager Only', text: 'Take a generated client with a preset expectation and fee. Onboard them, then run their Meta campaign.', live: true },
  { id: 'full', title: 'Full Run', text: 'Pitch the client, agree the fee and promises, then run the campaign you sold.', live: false },
  { id: 'pitch', title: 'Pitch Only', text: 'Practice discovery, pricing, objections, expectations, and the close.', live: false },
  { id: 'sandbox', title: 'Sandbox', text: 'Every setting adjustable, no failure states, scores kept separate.', live: false },
];

export function renderMenu(app, actions) {
  const run = app.run;
  const resumable = run && run.status !== 'final';
  const unlock = unlockProgress(app.scores, 1);
  const recent = app.scores.slice(-5).reverse();
  return h(
    'div',
    { class: 'stack' },
    noticeBar(app, actions),
    h(
      'section',
      { class: 'card hero' },
      h('div', { class: 'eyebrow' }, 'Level 1 · Meta · Med spa'),
      h('h1', {}, 'Run the account. Keep the client.'),
      h('p', { class: 'muted' }, 'You run a small agency. Each client is a generated small business with real-world economics. Set up their tracking, run their ads week by week, and keep them happy enough to stay.'),
      resumable &&
        h(
          'div',
          { class: 'notice accent' },
          `In progress: ${run.brief.name}, ${run.status === 'running' ? `week ${run.weekIndex + 1} of ${run.brief.campaignWeeks}` : run.status}.`,
        ),
      h('div', { class: 'actions' }, resumable && button('Resume', actions.resume, 'primary'), button(resumable ? 'Start a new client' : 'Start a new client', actions.newRun, resumable ? 'secondary' : 'primary')),
      resumable && h('p', { class: 'tiny muted' }, 'Starting a new client replaces the one in progress.'),
      !app.canSave && h('p', { class: 'tiny muted' }, 'Browser storage is unavailable, so this game can\'t be saved or resumed.'),
    ),
    section(
      'Modes',
      h(
        'div',
        { class: 'list' },
        MODES.map((m) =>
          h(
            'div',
            { class: 'check' },
            h('div', { class: 'check-head' }, h('strong', {}, m.title), h('span', { class: ['tag', m.live ? 'good' : ''] }, m.live ? 'Playable' : 'Coming soon')),
            h('p', { class: 'small muted' }, m.text),
          ),
        ),
      ),
    ),
    section(
      'Level 2 unlock',
      h('p', { class: 'small' }, 'Average 70%+ satisfaction and 60%+ performance across your last 3 campaigns at Level 1. Correct walk-aways count as 100.'),
      h(
        'div',
        { class: 'stats' },
        h('div', { class: 'stat' }, h('div', { class: 'stat-label' }, 'Campaigns counted'), h('div', { class: 'stat-value' }, `${unlock.count}/3`)),
        h('div', { class: 'stat' }, h('div', { class: 'stat-label' }, 'Avg satisfaction'), h('div', { class: 'stat-value' }, score(unlock.avgSatisfaction))),
        h('div', { class: 'stat' }, h('div', { class: 'stat-label' }, 'Avg performance'), h('div', { class: 'stat-value' }, score(unlock.avgPerformance))),
      ),
      h('p', { class: 'tiny muted' }, unlock.unlocked ? 'Unlocked. Level 2 content (Google Search) arrives in a later build.' : 'Level 2 adds Google Search in a later build.'),
    ),
    recent.length > 0 &&
      section(
        'Recent campaigns',
        h(
          'div',
          { class: 'table-wrap' },
          h(
            'table',
            {},
            h('thead', {}, h('tr', {}, h('th', {}, 'Result'), h('th', {}, 'Score'), h('th', {}, 'Perf'), h('th', {}, 'Sat'), h('th', {}, 'Realism'))),
            h(
              'tbody',
              {},
              recent.map((r) =>
                h(
                  'tr',
                  {},
                  h('td', {}, r.endReason === 'declined' ? (r.walkAwayCorrect ? 'Walked away' : 'Declined') : r.endReason.replace('_', ' ')),
                  h('td', {}, score(r.components.adScore)),
                  h('td', {}, score(r.components.performance)),
                  h('td', {}, score(r.components.satisfaction)),
                  h('td', {}, String(r.realism)),
                ),
              ),
            ),
          ),
        ),
      ),
    h('p', { class: 'tiny muted' }, HONEST_LIMIT),
  );
}
