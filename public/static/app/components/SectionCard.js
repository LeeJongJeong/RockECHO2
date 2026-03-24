import { h } from '../utils.js';

export function sectionCard(title, content, options = {}) {
  const { maxHeight = '320px', scrollable = true } = options;
  return h('div', { className: 'card mb-4' },
    h('h3', { className: 'font-semibold text-gray-900 mb-2' }, title),
    h('div', {
      className: 'section-scroll text-gray-700 text-sm leading-relaxed whitespace-pre-wrap',
      style: scrollable ? `max-height:${maxHeight}; overflow-y:auto; overflow-x:hidden; padding-right:4px;` : ''
    }, content || '-')
  );
}
