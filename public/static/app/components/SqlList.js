import { h } from '../utils.js';
import { copyText } from '../utils.js';

export function renderSqlList(title, items) {
  const card = h('div', { className: 'card mb-4' });
  const isRunbook = title === 'Runbook';

  const headerLeft = h('div', { className: 'flex items-center gap-3 flex-wrap' },
    h('h3', { className: 'font-semibold text-gray-900 text-xl' }, title)
  );

  if (isRunbook) {
    headerLeft.appendChild(h('span', { className: 'text-xs px-3 py-1 rounded-full bg-violet-50 text-violet-600 font-medium' }, 'RockECHO AI 생성'));
  }

  const copyAllButton = h('button', {
    className: 'btn-secondary text-sm flex items-center gap-2',
    onClick: () => copyText(items.map((step) => step.sql || '').join('\n\n'), title)
  },
    h('i', { className: 'fas fa-copy' }),
    `${title} 복사`
  );

  card.appendChild(h('div', { className: 'flex items-center justify-between gap-3 mb-4' }, headerLeft, copyAllButton));

  items.forEach((step, index) => {
    const stepBlock = h('div', { className: 'mb-5 last:mb-0' });
    const rowHeader = h('div', { className: 'flex items-center gap-3 mb-2' },
      h('span', { className: 'w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center' }, String(step.step || index + 1)),
      h('span', { className: 'text-lg font-medium text-gray-900' }, step.title || `Step ${index + 1}`)
    );

    const codeWrap = h('div', { className: 'code-block' },
      h('button', {
        className: 'copy-btn',
        onClick: () => copyText(step.sql || '', `${title} SQL`)
      }, h('i', { className: 'fas fa-copy mr-1' }), '복사'),
      h('pre', { className: 'text-sm whitespace-pre-wrap' }, step.sql || '-- no SQL')
    );

    stepBlock.appendChild(rowHeader);
    stepBlock.appendChild(codeWrap);
    card.appendChild(stepBlock);
  });

  return card;
}
