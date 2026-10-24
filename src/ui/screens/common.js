// src/ui/screens/common.js
//
// Pieces shared across screens.

import { h, button } from '../dom.js';

export function noticeBar(app, actions) {
  if (!app.view.notice) return null;
  return h(
    'div',
    { class: 'notice bad', role: 'alert' },
    h('div', { class: 'spread' }, h('span', {}, app.view.notice), button('Dismiss', actions.dismissNotice, 'ghost', { 'aria-label': 'Dismiss message' })),
  );
}

export function stickyActions(...buttons) {
  return h('div', { class: 'sticky-actions' }, h('div', { class: 'inner' }, ...buttons));
}

/** Plain-language label for an ad set setup. */
export function describeAdSet(a, labels) {
  const parts = [labels.objective(a.objective), labels.location(a.location), labels.goal(a.goal)];
  if (a.event) parts.push(labels.event(a.event));
  if (a.formType) parts.push(a.formType === 'higher_intent' ? 'higher-intent form' : 'volume form');
  return parts.join(' · ');
}

export const BENCHMARK_LABEL = 'typical range from published benchmarks';
