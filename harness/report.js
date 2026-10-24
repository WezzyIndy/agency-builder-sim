// harness/report.js

function fmt(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(3);
  return String(v);
}

export function printTable(rows) {
  const cols = [
    ['', (r) => (r.pass === null ? '  ' : r.pass ? 'ok' : 'XX')],
    ['id', (r) => r.id],
    ['criterion', (r) => r.label],
    ['value', (r) => fmt(r.value)],
    ['threshold', (r) => r.threshold],
  ];
  const widths = cols.map(([h, f]) => Math.max(h.length, ...rows.map((r) => f(r).length)));
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ');
  console.log(line(cols.map(([h]) => h)));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(cols.map(([, f]) => f(r))));
}
