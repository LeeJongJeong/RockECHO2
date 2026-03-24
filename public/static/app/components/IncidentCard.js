import { h, timeAgo } from '../utils.js';
import { navigate } from '../router.js';
import {
  DBMS_LABELS,
  DBMS_COLORS,
  STATUS_CLASSES,
  PRIORITY_LABELS,
  PRIORITY_COLORS
} from '../state.js';

export const DASHBOARD_STATUS_LABELS = {
  raw_input: '원본 입력',
  ai_generated: 'AI 초안',
  reviewed: '검토 대기',
  approved: '승인 완료',
  needs_review: '재검토 필요'
};

export function getQualityTone(score) {
  if (score >= 70) return 'bg-indigo-500';
  if (score >= 50) return 'bg-orange-400';
  return 'bg-red-500';
}

export function listRow(item) {
  const tags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];
  const qualityScore = Math.round((item.ai_quality_score || 0) * 100);

  return h('div', {
    className: 'p-4 border border-gray-100 rounded-xl hover:border-indigo-200 cursor-pointer transition-all shadow-sm',
    onClick: () => navigate('knowledge-detail', { id: item.id })
  },
    h('div', { className: 'flex items-start justify-between gap-3' },
      h('div', { className: 'flex-1 min-w-0' },
        h('p', { className: 'text-sm font-semibold text-gray-900 truncate' }, item.title || '제목 없는 항목'),
        tags.length
          ? h('div', { className: 'flex items-center gap-2 flex-wrap mt-2' },
              ...tags.map((tag) => h('span', { className: 'text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500' }, tag))
            )
          : null,
        h('div', { className: 'flex items-center gap-3 flex-wrap mt-2 text-xs text-gray-400' },
          h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${DBMS_COLORS[item.dbms] || 'bg-gray-100 text-gray-600'}` }, DBMS_LABELS[item.dbms] || item.dbms || '미상 DBMS'),
          h('span', { className: 'text-xs text-gray-400' }, item.incident_number || '-'),
          h('span', { className: 'text-xs text-gray-400' }, timeAgo(item.updated_at))
        ),
        qualityScore > 0
          ? h('div', { className: 'mt-4' },
              h('div', { className: 'flex items-center justify-between text-xs text-gray-400 mb-1' },
                h('span', {}, 'AI 품질'),
                h('span', {}, `${qualityScore}%`)
              ),
              h('div', { className: 'w-full h-1.5 bg-gray-100 rounded-full overflow-hidden' },
                h('div', {
                  className: `h-full rounded-full ${getQualityTone(qualityScore)}`,
                  style: `width:${qualityScore}%`
                })
              )
            )
          : null
      ),
      h('div', { className: 'flex items-center gap-2 shrink-0' },
        h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority] || 'bg-gray-100 text-gray-600'}` }, PRIORITY_LABELS[item.priority] || item.priority || 'P2'),
        h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[item.status] || 'bg-gray-100 text-gray-600'}` }, DASHBOARD_STATUS_LABELS[item.status] || item.status || '상태 미상')
      )
    )
  );
}
