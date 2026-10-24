// src/ui/screens/adSetEditor.js
//
// The ad set editor used at launch, relaunch, and mid-campaign edits. Every
// option list comes from the engine's Meta rules (flow.setupChoices), so
// unavailable choices show the engine's reason.

import { h, chips } from '../dom.js';
import { setupChoices, reconcileAdSet } from '../flow.js';
import { contentFor } from '../../content/index.js';

const OBJECTIVE_SUB = {
  awareness: 'Reach people',
  traffic: 'Send clicks',
  engagement: 'Likes, views, messages',
  leads: 'Collect leads',
  sales: 'Drive purchases',
};

const AUDIENCE_SUB = {
  controls: 'Location and age are hard limits; Meta finds the rest',
  suggestions: 'Add suggested age, interests, lookalikes as guidance',
  limited: 'Turn Advantage+ audience off; every input is a hard limit',
};

/**
 * opts: { lockObjective: boolean, onChange: (adSet) => void }
 */
export function adSetEditor(run, draft, { lockObjective = false, onChange }) {
  const c = setupChoices(run, draft);
  const set = (field, value) => onChange(reconcileAdSet(run, { ...draft, [field]: value }, field));
  const setAudience = (patch, field) => onChange(reconcileAdSet(run, { ...draft, audience: { ...draft.audience, ...patch } }, field));
  const angles = contentFor(run.businessId).angles;
  const toggleAngle = (id) => {
    const next = draft.angles.includes(id) ? draft.angles.filter((x) => x !== id) : [...draft.angles, id];
    onChange({ ...draft, angles: next });
  };
  return h(
    'div',
    { class: 'stack' },
    h(
      'div',
      { class: 'stack' },
      h('div', { class: 'field-label' }, lockObjective ? 'Objective (locked after launch)' : 'Campaign objective'),
      lockObjective
        ? h('p', { class: 'small' }, `${c.objectives.find((o) => o.id === draft.objective).label}. To change it, relaunch as a new campaign.`)
        : chips('Objective', c.objectives.map((o) => ({ ...o, sub: OBJECTIVE_SUB[o.id] })), draft.objective, (id) => set('objective', id)),
    ),
    h('div', { class: 'stack' }, h('div', { class: 'field-label' }, 'Conversion location'), chips('Conversion location', c.locations, draft.location, (id) => set('location', id))),
    h('div', { class: 'stack' }, h('div', { class: 'field-label' }, 'Performance goal'), chips('Performance goal', c.goals, draft.goal, (id) => set('goal', id))),
    c.events.length > 0 && h('div', { class: 'stack' }, h('div', { class: 'field-label' }, 'Conversion event'), chips('Conversion event', c.events, draft.event, (id) => set('event', id))),
    c.showFormType &&
      h(
        'div',
        { class: 'stack' },
        h('div', { class: 'field-label' }, 'Instant form type'),
        chips(
          'Instant form type',
          [
            { id: 'higher_intent', label: 'Higher intent', sub: 'Adds qualifying questions and a review step' },
            { id: 'volume', label: 'More volume', sub: 'Shortest form, most submissions' },
          ],
          draft.formType,
          (id) => set('formType', id),
        ),
      ),
    h(
      'div',
      { class: 'stack' },
      h('div', { class: 'field-label' }, 'Audience'),
      chips('Audience', c.audiences.map((a) => ({ id: a.id, label: a.label, sub: AUDIENCE_SUB[a.id] })), draft.audience.option, (id) => setAudience({ option: id }, 'audience'), {}),
      h(
        'label',
        { class: 'row small' },
        'Minimum age',
        h(
          'select',
          { onChange: (ev) => setAudience({ minAge: Number(ev.target.value) }, 'minAge'), 'aria-label': 'Minimum age' },
          c.minAges.map((m) => h('option', { value: m, selected: m === draft.audience.minAge }, `${m}+`)),
        ),
        h('span', { class: 'muted tiny' }, 'Location: the client\'s service area'),
      ),
    ),
    h(
      'div',
      { class: 'stack' },
      h('div', { class: 'field-label' }, `Messaging angles (${draft.angles.length} picked)`),
      h(
        'div',
        { class: 'stack' },
        angles.map((a) =>
          h(
            'button',
            { type: 'button', class: ['angle', draft.angles.includes(a.id) && 'is-on'], role: 'checkbox', 'aria-checked': draft.angles.includes(a.id) ? 'true' : 'false', onClick: () => toggleAngle(a.id) },
            h('span', { class: 'angle-title' }, a.title),
            h('span', { class: 'angle-copy' }, `"${a.copy}"`),
          ),
        ),
      ),
    ),
  );
}
