import { h } from '../utils.js';

export function metaRow(label, value) {
  return h('div', { className: 'flex items-center justify-between py-2 border-b border-gray-50 last:border-0' },
    h('span', { className: 'text-xs text-gray-500' }, label),
    h('span', { className: 'text-xs font-medium text-gray-800 text-right max-w-[60%]' }, value || '-')
  );
}
