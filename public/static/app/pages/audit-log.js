import { api } from '../api.js';
import { h, formatDate } from '../utils.js';
import { navigate } from '../router.js';

const ACTION_META = {
  created: {
    label: '생성',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: 'fa-plus',
    fallbackNote: '',
    showNote: false
  },
  ai_generated: {
    label: 'AI 생성',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    icon: 'fa-robot',
    fallbackNote: 'AI가 Knowledge 초안 자동 생성',
    showNote: true
  },
  submitted: {
    label: '검토 요청',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    icon: 'fa-paper-plane',
    fallbackNote: '',
    showNote: false
  },
  approved: {
    label: '승인',
    color: 'text-green-600',
    bg: 'bg-green-50',
    icon: 'fa-check',
    fallbackNote: '',
    showNote: false
  },
  rejected: {
    label: '반려',
    color: 'text-red-600',
    bg: 'bg-red-50',
    icon: 'fa-times',
    fallbackNote: '검토 후 반려',
    showNote: true
  },
  edited: {
    label: '수정',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    icon: 'fa-pen',
    fallbackNote: '내용 수정',
    showNote: true
  },
  needs_review: {
    label: '재검토 요청',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    icon: 'fa-triangle-exclamation',
    fallbackNote: '재검토 필요 상태로 변경',
    showNote: true
  }
};

function auditRow(log) {
  const action = ACTION_META[log.action] || {
    label: log.action,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    icon: 'fa-circle',
    fallbackNote: '',
    showNote: Boolean(log.note)
  };

  const note = action.showNote ? (log.note || action.fallbackNote || '') : '';

  return h('div', {
    className: 'flex items-start gap-4 py-4 border-b border-gray-50 last:border-0 cursor-pointer transition-colors hover:bg-gray-50/60',
    onClick: () => {
      if (log.knowledge_entry_id) {
        navigate('knowledge-detail', { id: log.knowledge_entry_id });
      }
    }
  },
    h('div', { className: `w-8 h-8 ${action.bg} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5` },
      h('i', { className: `fas ${action.icon} ${action.color} text-sm` })
    ),
    h('div', { className: 'flex-1 min-w-0' },
      h('div', { className: 'flex items-center gap-2 flex-wrap' },
        h('span', { className: `text-sm font-semibold ${action.color}` }, action.label),
        h('span', { className: 'text-sm font-medium text-gray-900 truncate' }, log.knowledge_title || '-')
      ),
      h('div', { className: 'flex items-center gap-3 mt-1 flex-wrap text-xs' },
        h('span', { className: 'text-gray-500 font-medium' }, log.user_name || 'System'),
        note ? h('span', { className: 'text-gray-400 italic' }, note) : null
      )
    ),
    h('div', { className: 'text-xs text-gray-400 flex-shrink-0 pt-1' }, formatDate(log.created_at))
  );
}

export async function renderAuditLog() {
  const main = document.querySelector('.main-content');
  main.innerHTML = '';
  const container = h('div', { className: 'p-6' });

  container.appendChild(h('div', { className: 'mb-6' },
    h('h1', { className: 'text-2xl font-bold text-gray-900' }, '감사 로그 (Audit Log)'),
    h('p', { className: 'text-sm text-gray-400 mt-1' }, '모든 승인, 반려, 수정 이력을 시간순으로 추적합니다')
  ));

  try {
    const data = await api('GET', '/api/dashboard/audit-log?limit=50');
    const list = h('div', { className: 'card' });

    if (!data.items.length) {
      list.appendChild(h('p', { className: 'text-sm text-gray-400' }, '감사 로그가 아직 없습니다.'));
    } else {
      data.items.forEach((log) => {
        list.appendChild(auditRow(log));
      });
    }

    container.appendChild(list);
    main.appendChild(container);
  } catch (error) {
    main.innerHTML = `<div class="p-6 text-red-500">감사 로그를 불러오지 못했습니다: ${error.message}</div>`;
  }
}