// src/ui/screens/settings.js

import { h, button, section, chips } from '../dom.js';
import { noticeBar } from './common.js';

export function renderSettings(app, actions) {
  const s = app.settings;
  const confirming = app.view.confirmClear;
  return h(
    'div',
    { class: 'stack' },
    noticeBar(app, actions),
    h('section', { class: 'card hero' }, h('div', { class: 'eyebrow' }, 'Settings'), h('h1', {}, 'Settings')),
    section(
      'Default realism for new clients',
      chips(
        'Default realism',
        [1, 2, 3, 4, 5].map((n) => ({ id: n, label: String(n), sub: n === 1 ? 'Tracks benchmarks' : n === 3 ? 'Default' : n === 5 ? 'Volatile' : '' })),
        s.realismDefault,
        (id) => actions.saveSettings({ realismDefault: id }),
      ),
    ),
    section(
      'Your target hourly rate',
      h('p', { class: 'small muted' }, 'Used in the agency P&L to judge whether a client is worth keeping.'),
      h(
        'label',
        { class: 'row' },
        '$',
        h('input', {
          type: 'number',
          min: 10,
          max: 1000,
          step: 5,
          value: s.targetHourlyRate,
          'aria-label': 'Target hourly rate in dollars',
          onChange: (ev) => {
            const v = Number(ev.target.value);
            if (Number.isFinite(v) && v >= 10 && v <= 1000) actions.saveSettings({ targetHourlyRate: v });
          },
        }),
        '/ hour',
      ),
      h('p', { class: 'tiny muted' }, 'Applies to the next client you start.'),
    ),
    section(
      'Saved data',
      h('p', { class: 'small muted' }, app.canSave ? 'Your game and score history are saved in this browser only.' : 'Browser storage is unavailable here, so nothing is saved.'),
      confirming
        ? h('div', { class: 'actions' }, button('Keep my data', () => actions.setView({ confirmClear: false }), 'secondary'), button('Yes, delete everything', () => actions.clearData(), 'danger'))
        : button('Delete saved game and history', () => actions.setView({ confirmClear: true }), 'danger'),
    ),
    button('Done', actions.closeSettings, 'primary', { class: 'btn btn-primary btn-block' }),
  );
}
