import { h } from '../utils.js';

export function fieldLabel(title, hint = '') {
  return h('div', { className: 'mb-2' },
    h('span', { className: 'text-sm font-medium text-gray-800' }, title),
    hint ? h('span', { className: 'text-xs text-gray-400 ml-2' }, hint) : null
  );
}
