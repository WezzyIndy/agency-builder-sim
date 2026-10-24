// src/ui/dom.js
//
// Tiny DOM builder. h('div', { class: 'card', onClick }, child, 'text', ...)
// Strings become text nodes (never HTML), null/false children are skipped,
// arrays are flattened.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = Array.isArray(v) ? v.filter(Boolean).join(' ') : v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** A labeled stat tile. */
export function stat(label, value, sub = null, tone = null) {
  return h('div', { class: ['stat', tone && `tone-${tone}`] }, h('div', { class: 'stat-label' }, label), h('div', { class: 'stat-value' }, value), sub && h('div', { class: 'stat-sub' }, sub));
}

/** A 0-100 meter with a label. */
export function meter(label, value, { suffix = '', thresholds = [40, 70] } = {}) {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const tone = !Number.isFinite(value) ? 'muted' : v < thresholds[0] ? 'bad' : v < thresholds[1] ? 'warn' : 'good';
  return h(
    'div',
    { class: 'meter', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(v), 'aria-label': label },
    h('div', { class: 'meter-head' }, h('span', {}, label), h('span', { class: 'meter-num' }, Number.isFinite(value) ? `${Math.round(v)}${suffix}` : '-')),
    h('div', { class: 'meter-track' }, h('div', { class: `meter-fill tone-${tone}`, style: { width: `${v}%` } })),
  );
}

/** A group of selectable chips. options: [{ id, label, available, reason, sub }] */
export function chips(name, options, selected, onPick, { multi = false } = {}) {
  return h(
    'div',
    { class: 'chips', role: multi ? 'group' : 'radiogroup', 'aria-label': name },
    options.map((o) => {
      const isOn = multi ? selected.includes(o.id) : selected === o.id;
      const disabled = o.available === false;
      return h(
        'button',
        {
          type: 'button',
          class: ['chip', isOn && 'is-on', disabled && 'is-disabled'],
          role: multi ? 'checkbox' : 'radio',
          'aria-checked': isOn ? 'true' : 'false',
          'aria-disabled': disabled ? 'true' : null,
          title: disabled ? o.reason : null,
          onClick: () => !disabled && onPick(o.id),
        },
        h('span', { class: 'chip-label' }, o.label),
        o.sub && h('span', { class: 'chip-sub' }, o.sub),
        disabled && o.reason && h('span', { class: 'chip-reason' }, o.reason),
      );
    }),
  );
}

export function section(title, ...children) {
  return h('section', { class: 'card' }, title && h('h2', { class: 'card-title' }, title), ...children);
}

export function button(label, onClick, variant = 'primary', props = {}) {
  return h('button', { type: 'button', class: ['btn', `btn-${variant}`], onClick, ...props }, label);
}
