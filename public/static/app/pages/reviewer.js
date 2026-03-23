import { api } from '../api.js';
import {
  CURRENT_USER,
  DBMS_LABELS,
  DBMS_COLORS,
  STATUS_LABELS,
  STATUS_CLASSES,
  PRIORITY_LABELS,
  PRIORITY_COLORS
} from '../state.js';
import { h, timeAgo, formatDate, showNotification } from '../utils.js';
import { navigate } from '../router.js';
import { causeBadge } from '../components.js';

function kpiCard(item) {
  return h('div', { className: 'card' },
    h('div', { className: `w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center mb-3` },
      h('i', { className: `fas ${item.icon} ${item.color}` })
    ),
    h('div', { className: `text-2xl font-bold ${item.color} mb-1` }, item.value),
    h('div', { className: 'text-sm text-gray-700' }, item.label),
    h('div', { className: 'text-xs text-gray-400' }, item.sub)
  );
}

function summaryCard(item, onSelect) {
  return h('div', {
    className: 'p-3 border rounded-lg mb-2 cursor-pointer transition-all reviewer-item border-gray-200 hover:border-indigo-200',
    onClick: () => onSelect(item.id)
  },
    h('div', { className: 'flex items-start justify-between mb-1 gap-2' },
      h('h3', { className: 'text-sm font-medium text-gray-900 flex-1' }, item.title || 'Untitled knowledge'),
      h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[item.status] || 'bg-gray-100 text-gray-600'}` }, STATUS_LABELS[item.status] || item.status || 'unknown')
    ),
    h('div', { className: 'flex items-center gap-2 flex-wrap' },
      h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${DBMS_COLORS[item.dbms] || 'bg-gray-100 text-gray-600'}` }, DBMS_LABELS[item.dbms] || item.dbms || 'Unknown DBMS'),
      h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority] || 'bg-gray-100 text-gray-600'}` }, PRIORITY_LABELS[item.priority] || item.priority || 'P2'),
      !item.version_range ? h('span', { className: 'text-xs text-red-500' }, 'Version missing') : null,
      h('span', { className: 'text-xs text-gray-400 ml-auto' }, timeAgo(item.updated_at))
    )
  );
}

async function renderDetailPanel(container, id) {
  container.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin"></i></div>';

  try {
    const entry = await api('GET', `/api/knowledge/${id}`);
    container.innerHTML = '';

    const panel = h('div', { className: 'card sticky top-4' });
    panel.appendChild(h('div', { className: 'mb-3' },
      h('div', { className: 'flex items-center gap-2 mb-2 flex-wrap' },
        h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${DBMS_COLORS[entry.dbms] || 'bg-gray-100 text-gray-600'}` }, DBMS_LABELS[entry.dbms] || entry.dbms || 'Unknown DBMS'),
        h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[entry.priority] || 'bg-gray-100 text-gray-600'}` }, PRIORITY_LABELS[entry.priority] || entry.priority || 'P2'),
        entry.cause_confidence ? causeBadge(entry.cause_confidence) : null
      ),
      h('h2', { className: 'font-semibold text-gray-900' }, entry.title || 'Untitled knowledge'),
      h('p', { className: 'text-xs text-gray-400 mt-1' }, entry.incident_number || '-')
    ));

    if (!entry.version_range) {
      panel.appendChild(h('div', { className: 'bg-red-50 border border-red-200 rounded p-2 mb-3 text-xs text-red-600 flex items-center gap-2' },
        h('i', { className: 'fas fa-exclamation-triangle' }),
        'Version range is required before approval.'
      ));
    }

    const fields = [
      ['Symptom', entry.symptom],
      ['Cause', entry.cause],
      ['Action', entry.action],
      ['Version Range', entry.version_range]
    ];
    fields.forEach(([label, value]) => {
      if (!value) return;
      panel.appendChild(h('div', { className: 'mb-3' },
        h('p', { className: 'text-xs font-medium text-gray-500 mb-1' }, label),
        h('p', { className: 'text-sm text-gray-700 whitespace-pre-wrap' }, value.length > 280 ? `${value.slice(0, 280)}...` : value)
      ));
    });

    if (entry.activity_logs?.length > 0) {
      panel.appendChild(h('h4', { className: 'text-xs font-medium text-gray-500 mb-2 mt-3' }, 'Recent activity'));
      entry.activity_logs.slice(-3).forEach((log) => {
        panel.appendChild(h('div', { className: 'flex gap-2 mb-1' },
          h('span', { className: 'text-xs text-gray-400' }, formatDate(log.created_at)),
          h('span', { className: 'text-xs font-medium text-gray-600' }, `${log.user_name || 'System'}: ${log.action}`)
        ));
      });
    }

    const actions = h('div', { className: 'flex flex-col gap-2 mt-4' });
    actions.appendChild(h('button', {
      className: 'btn-success w-full text-sm flex items-center justify-center gap-2',
      disabled: !entry.version_range,
      style: !entry.version_range ? 'opacity:0.5;cursor:not-allowed' : '',
      onClick: async () => {
        if (!entry.version_range) return;
        await api('POST', `/api/knowledge/${id}/approve`, { user_id: CURRENT_USER.id });
        showNotification('Knowledge approved', 'success');
        navigate('reviewer');
      }
    }, h('i', { className: 'fas fa-check' }), 'Approve'));

    actions.appendChild(h('button', {
      className: 'btn-danger w-full text-sm flex items-center justify-center gap-2',
      onClick: async () => {
        const reason = prompt('Enter a reject reason');
        if (!reason) return;
        await api('POST', `/api/knowledge/${id}/reject`, { user_id: CURRENT_USER.id, reason });
        showNotification('Knowledge rejected', 'info');
        navigate('reviewer');
      }
    }, h('i', { className: 'fas fa-times' }), 'Reject'));

    actions.appendChild(h('button', {
      className: 'btn-secondary w-full text-sm',
      onClick: () => navigate('knowledge-detail', { id })
    }, 'Open detail'));

    panel.appendChild(actions);
    container.appendChild(panel);
  } catch (error) {
    container.innerHTML = `<div class="text-red-500 text-sm">Failed to load detail: ${error.message}</div>`;
  }
}

export async function renderReviewer() {
  const main = document.querySelector('.main-content');
  main.innerHTML = '<div class="p-6 text-center mt-20 text-gray-400"><i class="fas fa-spinner fa-spin text-3xl"></i></div>';

  try {
    const [stats, reviewed, needsReview, allItems] = await Promise.all([
      api('GET', '/api/dashboard/stats'),
      api('GET', '/api/knowledge?status=reviewed&limit=50'),
      api('GET', '/api/knowledge?status=needs_review&limit=50'),
      api('GET', '/api/knowledge?status=all&limit=100')
    ]);

    main.innerHTML = '';
    const container = h('div', { className: 'p-6' });
    container.appendChild(h('div', { className: 'flex items-center justify-between mb-6' },
      h('div', {},
        h('h1', { className: 'text-2xl font-bold text-gray-900' }, 'Reviewer Dashboard'),
        h('p', { className: 'text-sm text-gray-400 mt-1' }, 'Approve drafts, reject weak entries, and monitor queue health.')
      ),
      h('button', { className: 'btn-secondary text-sm', onClick: () => navigate('audit-log') }, 'Open audit log')
    ));

    const kpis = [
      { label: 'In Review', value: stats.reviewed_count || 0, sub: 'Current reviewed status', color: 'text-blue-600', bg: 'bg-blue-100', icon: 'fa-clock' },
      { label: 'Reviewer Activity', value: stats.reviewer_activity_week || 0, sub: 'Actions this week', color: 'text-green-600', bg: 'bg-green-100', icon: 'fa-check-circle' },
      { label: 'AI Approval Rate', value: `${stats.ai_approval_rate || 0}%`, sub: 'Approval quality signal', color: 'text-purple-600', bg: 'bg-purple-100', icon: 'fa-robot' },
      { label: 'Needs Review', value: stats.needs_review_count || 0, sub: 'Escalated by feedback', color: 'text-orange-600', bg: 'bg-orange-100', icon: 'fa-exclamation-triangle' }
    ];
    const kpiGrid = h('div', { className: 'grid grid-cols-4 gap-4 mb-6' });
    kpis.forEach((item) => kpiGrid.appendChild(kpiCard(item)));
    container.appendChild(kpiGrid);

    const tabs = [
      { id: 'reviewed', label: `Reviewed (${reviewed.total})`, items: reviewed.items },
      { id: 'needs_review', label: `Needs Review (${needsReview.total})`, items: needsReview.items },
      { id: 'all', label: `All (${allItems.total})`, items: allItems.items }
    ];
    let activeTab = 'reviewed';
    let selectedId = null;

    const tabsEl = h('div', { className: 'flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 w-fit' });
    const body = h('div', { id: 'reviewer-body' });

    function renderTabs() {
      tabsEl.innerHTML = '';
      tabs.forEach((tab) => {
        tabsEl.appendChild(h('button', {
          className: `px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab.id ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`,
          onClick: () => {
            activeTab = tab.id;
            selectedId = null;
            renderTabs();
            renderBody();
          }
        }, tab.label));
      });
    }

    function renderBody() {
      const currentItems = tabs.find((tab) => tab.id === activeTab)?.items || [];
      body.innerHTML = '';

      if (!currentItems.length) {
        body.appendChild(h('div', { className: 'card text-center py-10 text-gray-400' },
          h('i', { className: 'fas fa-inbox text-4xl mb-3' }),
          h('p', {}, 'No entries in this queue.')
        ));
        return;
      }

      const layout = h('div', { className: 'flex gap-4' });
      const list = h('div', { className: 'w-1/2' });
      const detail = h('div', { className: 'w-1/2' });

      if (activeTab === 'reviewed') {
        list.appendChild(h('button', {
          className: 'btn-success text-sm mb-3 flex items-center gap-2',
          onClick: async () => {
            const ids = currentItems.filter((item) => item.version_range).map((item) => item.id);
            if (!ids.length) {
              showNotification('No reviewed entries have a version range yet', 'warning');
              return;
            }
            const result = await api('POST', '/api/knowledge/bulk-approve', { ids, user_id: CURRENT_USER.id });
            const successCount = result.results.filter((item) => item.success).length;
            showNotification(`${successCount} entries approved`, 'success');
            navigate('reviewer');
          }
        }, h('i', { className: 'fas fa-check-double' }), 'Bulk approve reviewed'));
      }

      currentItems.forEach((item) => {
        const card = summaryCard(item, async (id) => {
          selectedId = id;
          [...list.querySelectorAll('.reviewer-item')].forEach((element) => {
            element.className = element.className.replace('border-indigo-400 bg-indigo-50', 'border-gray-200');
          });
          card.className = card.className.replace('border-gray-200', 'border-indigo-400 bg-indigo-50');
          await renderDetailPanel(detail, id);
        });
        list.appendChild(card);
      });

      if (selectedId) {
        renderDetailPanel(detail, selectedId);
      } else {
        detail.appendChild(h('div', { className: 'card text-center py-12 text-gray-400' },
          h('i', { className: 'fas fa-hand-pointer text-3xl mb-3' }),
          h('p', {}, 'Select a knowledge entry to review it.')
        ));
      }

      layout.appendChild(list);
      layout.appendChild(detail);
      body.appendChild(layout);
    }

    renderTabs();
    container.appendChild(tabsEl);
    container.appendChild(body);
    renderBody();
    main.appendChild(container);
  } catch (error) {
    main.innerHTML = `<div class="p-6 text-red-500">Failed to load reviewer dashboard: ${error.message}</div>`;
  }
}