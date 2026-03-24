import { h, timeAgo } from '../utils.js';
import { DBMS_LABELS, DBMS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../state.js';

export const REVIEWER_STATUS = {
  raw_input: { label: '원본 입력', className: 'bg-slate-100 text-slate-600' },
  ai_generated: { label: 'AI 초안', className: 'bg-purple-100 text-purple-600' },
  reviewed: { label: '검토 중', className: 'bg-blue-100 text-blue-600' },
  approved: { label: '승인 완료', className: 'bg-green-100 text-green-600' },
  needs_review: { label: '재검토 필요', className: 'bg-orange-100 text-orange-600' }
};

export function queueRow(item, onOpen) {
  const status = REVIEWER_STATUS[item.status] || REVIEWER_STATUS.raw_input;

  return h('div', {
    className: 'p-4 border border-gray-200 rounded-xl mb-2 cursor-pointer transition-all hover:border-indigo-200 hover:shadow-sm',
    onClick: () => onOpen(item.id)
  },
    h('div', { className: 'flex items-start justify-between gap-3' },
      h('h3', { className: 'text-sm font-semibold text-gray-900 leading-6' }, item.title || '제목 없는 지식 항목'),
      h('div', { className: 'text-right shrink-0' },
        h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${status.className}` }, status.label),
        h('div', { className: 'text-xs text-gray-400 mt-2' }, timeAgo(item.updated_at))
      )
    ),
    h('div', { className: 'flex items-center gap-2 flex-wrap mt-3' },
      h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${DBMS_COLORS[item.dbms] || 'bg-gray-100 text-gray-600'}` }, DBMS_LABELS[item.dbms] || item.dbms || '미상 DBMS'),
      h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority] || 'bg-gray-100 text-gray-600'}` }, PRIORITY_LABELS[item.priority] || item.priority || 'P2')
    )
  );
}
