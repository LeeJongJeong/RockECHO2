import { api } from '../api.js';
import {
  CURRENT_USER,
  DBMS_LABELS,
  DBMS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS
} from '../state.js';
import { h, timeAgo, formatDate, showNotification, showModal } from '../utils.js';
import { navigate } from '../router.js';
import { kpiCard } from '../components/KpiCard.js';
import { queueRow, REVIEWER_STATUS } from '../components/QueueRow.js';

function parseDbDate(value) {
  return new Date(String(value || '').replace(' ', 'T'));
}

function countTodayApprovals(logs) {
  const now = new Date();
  return (logs || []).filter((item) => {
    if (item.action !== 'approved') return false;
    const createdAt = parseDbDate(item.created_at);
    return !Number.isNaN(createdAt.getTime())
      && createdAt.getFullYear() === now.getFullYear()
      && createdAt.getMonth() === now.getMonth()
      && createdAt.getDate() === now.getDate();
  }).length;
}



async function openReviewModal(id, onCompleted) {
  const overlay = showModal(h('div', { className: 'text-center py-8 text-gray-400' },
    h('i', { className: 'fas fa-spinner fa-spin text-2xl' })
  ));
  const modalContent = overlay.querySelector('.modal-content');

  try {
    const entry = await api('GET', `/api/knowledge/${id}`);
    const status = REVIEWER_STATUS[entry.status] || REVIEWER_STATUS.raw_input;
    modalContent.innerHTML = '';

    const body = h('div', {},
      h('div', { className: 'mb-4' },
        h('div', { className: 'flex items-center gap-2 flex-wrap mb-2' },
          h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${DBMS_COLORS[entry.dbms] || 'bg-gray-100 text-gray-600'}` }, DBMS_LABELS[entry.dbms] || entry.dbms || '미상 DBMS'),
          h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[entry.priority] || 'bg-gray-100 text-gray-600'}` }, PRIORITY_LABELS[entry.priority] || entry.priority || 'P2'),
          h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${status.className}` }, status.label)
        ),
        h('h2', { className: 'text-lg font-semibold text-gray-900 leading-7' }, entry.title || '제목 없는 지식 항목'),
        h('p', { className: 'text-xs text-gray-400 mt-1' }, entry.incident_number || '-')
      )
    );

    if (!entry.version_range && entry.status !== 'approved') {
      body.appendChild(h('div', { className: 'bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-4 text-xs text-orange-600 flex items-center gap-2' },
        h('i', { className: 'fas fa-triangle-exclamation' }),
        '버전 범위가 없어서 바로 승인할 수 없습니다.'
      ));
    }

    const fields = [
      ['증상', entry.symptom],
      ['원인', entry.cause],
      ['조치', entry.action],
      ['적용 버전 범위', entry.version_range]
    ];

    fields.forEach(([label, value]) => {
      if (!value) return;
      body.appendChild(h('div', { className: 'mb-3' },
        h('p', { className: 'text-xs font-medium text-gray-500 mb-1' }, label),
        h('p', { className: 'text-sm text-gray-700 whitespace-pre-wrap leading-6' }, value)
      ));
    });

    if (entry.activity_logs?.length > 0) {
      body.appendChild(h('h3', { className: 'text-xs font-medium text-gray-500 mt-4 mb-2' }, '최근 활동'));
      entry.activity_logs.slice(-4).forEach((log) => {
        body.appendChild(h('div', { className: 'flex gap-2 text-xs text-gray-500 mb-1' },
          h('span', {}, formatDate(log.created_at)),
          h('span', { className: 'font-medium text-gray-600' }, `${log.user_name || 'System'}: ${log.action}`)
        ));
      });
    }

    const actions = h('div', { className: 'flex gap-2 mt-6 flex-wrap' });

    if (entry.status !== 'approved') {
      actions.appendChild(h('button', {
        className: 'btn-success text-sm flex items-center gap-2',
        disabled: !entry.version_range,
        style: !entry.version_range ? 'opacity:0.5;cursor:not-allowed' : '',
        onClick: async () => {
          if (!entry.version_range) return;
          await api('POST', `/api/knowledge/${id}/approve`, { user_id: CURRENT_USER.id });
          showNotification('승인했습니다', 'success');
          overlay.remove();
          await onCompleted();
        }
      },
        h('i', { className: 'fas fa-check' }),
        '승인'
      ));

      actions.appendChild(h('button', {
        className: 'btn-danger text-sm flex items-center gap-2',
        onClick: async () => {
          const reason = prompt('반려 사유를 입력하세요');
          if (!reason) return;
          await api('POST', `/api/knowledge/${id}/reject`, { user_id: CURRENT_USER.id, reason });
          showNotification('반려했습니다', 'info');
          overlay.remove();
          await onCompleted();
        }
      },
        h('i', { className: 'fas fa-times' }),
        '반려'
      ));
    }

    actions.appendChild(h('button', {
      className: 'btn-secondary text-sm',
      onClick: () => {
        overlay.remove();
        navigate('knowledge-detail', { id });
      }
    }, '상세 보기'));

    actions.appendChild(h('button', {
      className: 'btn-secondary text-sm',
      onClick: () => overlay.remove()
    }, '닫기'));

    body.appendChild(actions);
    modalContent.appendChild(body);
  } catch (error) {
    modalContent.innerHTML = `<div class="text-red-500 text-sm">Reviewer 상세를 불러오지 못했습니다: ${error.message}</div>`;
  }
}

export async function renderReviewer() {
  const main = document.querySelector('.main-content');
  main.innerHTML = '<div class="p-6 text-center mt-20 text-gray-400"><i class="fas fa-spinner fa-spin text-3xl"></i></div>';

  try {
    const [stats, reviewed, needsReview, allItems, auditLog] = await Promise.all([
      api('GET', '/api/dashboard/stats'),
      api('GET', '/api/knowledge?status=reviewed&limit=50'),
      api('GET', '/api/knowledge?status=needs_review&limit=50'),
      api('GET', '/api/knowledge?status=all&limit=100'),
      api('GET', '/api/dashboard/audit-log?limit=200', null, { silent: true }).catch(() => ({ items: [] }))
    ]);

    const todayApprovedCount = countTodayApprovals(auditLog.items || []);
    main.innerHTML = '';

    const container = h('div', { className: 'p-6' });
    container.appendChild(h('div', { className: 'flex items-start justify-between mb-6' },
      h('h1', { className: 'text-2xl font-bold text-gray-900' }, 'Reviewer Dashboard'),
      h('p', { className: 'text-sm text-gray-400 mt-1' }, '품질 검증 및 승인 관리')
    ));

    const kpis = [
      {
        label: '검토 대기',
        value: stats.reviewed_count || 0,
        sub: '현재 reviewed 상태',
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        icon: 'fa-clock'
      },
      {
        label: '오늘 승인',
        value: todayApprovedCount,
        sub: `이번 주 처리 ${stats.reviewer_activity_week || 0}건`,
        color: 'text-green-600',
        bg: 'bg-green-100',
        icon: 'fa-circle-check'
      },
      {
        label: 'AI 초안 승인율',
        value: `${stats.ai_approval_rate || 0}%`,
        sub: '목표 70% 이상',
        color: 'text-purple-600',
        bg: 'bg-purple-100',
        icon: 'fa-robot'
      },
      {
        label: '재검토 필요',
        value: stats.needs_review_count || 0,
        sub: (stats.needs_review_count || 0) > 0 ? '즉시 확인 필요' : '현재 없음',
        color: 'text-orange-600',
        bg: 'bg-orange-100',
        icon: 'fa-triangle-exclamation'
      }
    ];

    const kpiGrid = h('div', { className: 'grid grid-cols-4 gap-4 mb-6' });
    kpis.forEach((item) => kpiGrid.appendChild(kpiCard(item)));
    container.appendChild(kpiGrid);

    const tabs = [
      { id: 'reviewed', label: `검토 대기 (${reviewed.total})`, items: reviewed.items },
      { id: 'needs_review', label: `재검토 필요 (${needsReview.total})`, items: needsReview.items },
      { id: 'all', label: `전체 이력 (${allItems.total})`, items: allItems.items }
    ];
    let activeTab = 'reviewed';

    const tabsEl = h('div', { className: 'flex gap-2 mb-4 flex-wrap' });
    const body = h('div', { id: 'reviewer-body' });

    function renderTabs() {
      tabsEl.innerHTML = '';
      tabs.forEach((tab) => {
        tabsEl.appendChild(h('button', {
          className: `px-4 py-2 text-sm font-medium rounded-lg border transition-all ${activeTab === tab.id ? 'bg-white border-gray-200 text-indigo-600 shadow-sm' : 'bg-gray-100 border-transparent text-gray-500 hover:text-gray-700'}`,
          onClick: () => {
            activeTab = tab.id;
            renderTabs();
            renderBody();
          }
        }, tab.label));
      });
    }

    function renderBody() {
      const currentItems = tabs.find((tab) => tab.id === activeTab)?.items || [];
      body.innerHTML = '';

      if (activeTab === 'reviewed') {
        body.appendChild(h('button', {
          className: 'btn-success text-sm mb-3 flex items-center gap-2',
          onClick: async () => {
            const ids = currentItems.filter((item) => item.version_range).map((item) => item.id);
            if (!ids.length) {
              showNotification('버전 범위가 있는 검토 대기 항목이 없습니다', 'warning');
              return;
            }
            const result = await api('POST', '/api/knowledge/bulk-approve', { ids, user_id: CURRENT_USER.id });
            const successCount = result.results.filter((item) => item.success).length;
            showNotification(`${successCount}건 승인했습니다`, 'success');
            await renderReviewer();
          }
        },
          h('i', { className: 'fas fa-check-double' }),
          '일괄 승인 (버전 범위 있는 항목만)'
        ));
      }

      if (!currentItems.length) {
        body.appendChild(h('div', { className: 'card text-center py-10 text-gray-400' },
          h('i', { className: 'fas fa-inbox text-4xl mb-3' }),
          h('p', { className: 'text-sm' }, '현재 이 탭에 표시할 항목이 없습니다.')
        ));
        return;
      }

      currentItems.forEach((item) => {
        body.appendChild(queueRow(item, (id) => openReviewModal(id, renderReviewer)));
      });
    }

    renderTabs();
    container.appendChild(tabsEl);
    container.appendChild(body);
    renderBody();
    main.appendChild(container);
  } catch (error) {
    main.innerHTML = `<div class="p-6 text-red-500">Reviewer Dashboard를 불러오지 못했습니다: ${error.message}</div>`;
  }
}