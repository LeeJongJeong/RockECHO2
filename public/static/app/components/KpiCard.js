import { h } from '../utils.js';

export function kpiCard(item) {
  return h('div', { className: 'card' },
    h('div', { className: `w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center mb-3` },
      h('i', { className: `fas ${item.icon} ${item.color}` })
    ),
    h('div', { className: `text-2xl font-bold ${item.color} mb-1` }, item.value),
    h('div', { className: 'text-sm text-gray-700' }, item.label),
    h('div', { className: 'text-xs text-gray-400' }, item.sub)
  );
}
