import { api } from '../api.js';
import { h, formatDate } from '../utils.js';

const ACTION_LABELS = {
  created: { label: 'Created', color: 'text-blue-600', bg: 'bg-blue-50', icon: 'fa-plus' },
  ai_generated: { label: 'AI Generated', color: 'text-purple-600', bg: 'bg-purple-50', icon: 'fa-robot' },
  submitted: { label: 'Submitted', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: 'fa-paper-plane' },
  approved: { label: 'Approved', color: 'text-green-600', bg: 'bg-green-50', icon: 'fa-check' },
  rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50', icon: 'fa-times' },
  edited: { label: 'Edited', color: 'text-gray-600', bg: 'bg-gray-50', icon: 'fa-edit' },
  needs_review: { label: 'Needs Review', color: 'text-orange-600', bg: 'bg-orange-50', icon: 'fa-exclamation' }
};

export async function renderAuditLog() {
  const main = document.querySelector('.main-content');
  main.innerHTML = '';
  const container = h('div', { className: 'p-6' });

  container.appendChild(h('div', { className: 'mb-6' },
    h('h1', { className: 'text-2xl font-bold text-gray-900' }, 'Audit Log'),
    h('p', { className: 'text-sm text-gray-400 mt-1' }, 'Every review, approval, rejection, and edit in one timeline.')
  ));

  try {
    const data = await api('GET', '/api/dashboard/audit-log?limit=50');
    const list = h('div', { className: 'card' });

    if (!data.items.length) {
      list.appendChild(h('p', { className: 'text-sm text-gray-400' }, 'No audit log entries yet.'));
    } else {
      data.items.forEach((log) => {
        const action = ACTION_LABELS[log.action] || { label: log.action, color: 'text-gray-600', bg: 'bg-gray-50', icon: 'fa-circle' };
        list.appendChild(h('div', { className: 'flex items-center gap-4 py-3 border-b border-gray-50 last:border-0' },
          h('div', { className: `w-8 h-8 ${action.bg} rounded-full flex items-center justify-center flex-shrink-0` },
            h('i', { className: `fas ${action.icon} ${action.color} text-sm` })
          ),
          h('div', { className: 'flex-1 min-w-0' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: `text-sm font-medium ${action.color}` }, action.label),
              h('span', { className: 'text-sm text-gray-800 truncate' }, log.knowledge_title || '-')
            ),
            h('div', { className: 'flex items-center gap-3 mt-0.5 flex-wrap' },
              h('span', { className: 'text-xs text-gray-500' }, log.user_name || 'System'),
              log.note ? h('span', { className: 'text-xs text-gray-400 italic truncate' }, log.note) : null
            )
          ),
          h('div', { className: 'text-xs text-gray-400 flex-shrink-0' }, formatDate(log.created_at))
        ));
      });
    }

    container.appendChild(list);
    main.appendChild(container);
  } catch (error) {
    main.innerHTML = `<div class="p-6 text-red-500">Failed to load audit log: ${error.message}</div>`;
  }
}