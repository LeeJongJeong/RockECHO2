import { h } from '../utils.js';

export function metricCard(metric) {
  return h('div', { className: 'card' },
    h('div', { className: `w-10 h-10 ${metric.iconBg} rounded-lg flex items-center justify-center mb-3` },
      h('i', { className: `fas ${metric.icon} ${metric.iconColor}` })
    ),
    h('div', { className: 'text-2xl font-bold text-gray-900 mb-1' }, metric.value),
    h('div', { className: 'text-sm text-gray-700' }, metric.title),
    h('div', { className: `text-xs ${metric.subColor || 'text-gray-400'}` }, metric.sub)
  );
}
