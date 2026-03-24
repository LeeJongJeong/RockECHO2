import { api } from '../api.js';
import {
  CURRENT_USER,
  DBMS_LABELS,
  DBMS_COLORS,
  STATUS_LABELS,
  STATUS_CLASSES,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  searchContext
} from '../state.js';
import { h, formatDate, showNotification } from '../utils.js';
import { navigate } from '../router.js';
import { sectionCard } from '../components/SectionCard.js';
import { causeBadge } from '../components/CauseBadge.js';
import { renderSqlList } from '../components/SqlList.js';
import { metaRow } from '../components/MetaRow.js';
import { copyText } from '../utils.js';


async function submitFeedback(knowledgeId, feedback, searchEventId, resultRank, suggestion = null) {
  await api('POST', `/api/knowledge/${knowledgeId}/feedback`, {
    user_id: CURRENT_USER.id,
    search_event_id: searchEventId,
    result_rank: resultRank,
    feedback,
    suggestion
  });
}


export async function renderKnowledgeDetail(id, searchEventId, index, total) {
  const main = document.querySelector('.main-content');
  main.innerHTML = '<div class="p-6 text-center mt-20 text-gray-400"><i class="fas fa-spinner fa-spin text-3xl"></i></div>';

  if (!id) {
    main.innerHTML = '<div class="p-8 text-center text-gray-500">Knowledge id is required.</div>';
    return;
  }

  try {
    const [entry, similar] = await Promise.all([
      api('GET', `/api/knowledge/${id}`),
      api('GET', `/api/search/similar/${id}`, null, { silent: true }).catch(() => ({ items: [] }))
    ]);

    main.innerHTML = '';
    const container = h('div', { className: 'p-6' });

    const navBar = h('div', { className: 'flex items-center justify-between mb-4' },
      h('button', {
        className: 'flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800',
        onClick: () => navigate('search')
      },
        h('i', { className: 'fas fa-arrow-left' }),
        'Back to search'
      )
    );

    if (typeof index === 'number' && typeof total === 'number' && total > 1) {
      navBar.appendChild(h('div', { className: 'flex items-center gap-3 text-sm text-gray-500' },
        h('span', {}, `${index + 1} / ${total}`),
        h('button', {
          className: 'btn-secondary text-xs px-3',
          disabled: index <= 0,
          onClick: () => {
            if (index <= 0) return;
            const prevItem = searchContext.results[index - 1];
            if (prevItem) navigate('knowledge-detail', { id: prevItem.id, searchEventId, index: index - 1, total });
          }
        }, 'Previous'),
        h('button', {
          className: 'btn-secondary text-xs px-3',
          disabled: index >= total - 1,
          onClick: () => {
            if (index >= total - 1) return;
            const nextItem = searchContext.results[index + 1];
            if (nextItem) navigate('knowledge-detail', { id: nextItem.id, searchEventId, index: index + 1, total });
          }
        }, 'Next')
      ));
    }
    container.appendChild(navBar);

    const layout = h('div', { className: 'flex gap-6' });
    const left = h('div', { className: 'flex-1 min-w-0' });
    const right = h('div', { className: 'w-80 flex-shrink-0' });

    const header = h('div', { className: 'card mb-4' });
    header.appendChild(h('div', { className: 'flex items-start justify-between gap-3 mb-3' },
      h('div', { className: 'flex-1' },
        h('div', { className: 'flex items-center gap-2 mb-2 flex-wrap' },
          h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${DBMS_COLORS[entry.dbms] || 'bg-gray-100 text-gray-600'}` }, DBMS_LABELS[entry.dbms] || entry.dbms || 'Unknown DBMS'),
          h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[entry.priority] || 'bg-gray-100 text-gray-600'}` }, PRIORITY_LABELS[entry.priority] || entry.priority || 'P2'),
          h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[entry.status] || 'bg-gray-100 text-gray-600'}` }, STATUS_LABELS[entry.status] || entry.status || 'unknown'),
          entry.cause_confidence ? causeBadge(entry.cause_confidence) : null
        ),
        h('h1', { className: 'text-xl font-bold text-gray-900' }, entry.title || 'Untitled knowledge'),
        h('p', { className: 'text-xs text-gray-400 mt-1' }, entry.incident_number || '-')
      )
    ));

    if (searchContext.results.length > 0) {
      const found = searchContext.results.find((item) => item.id === id);
      if (found?.relevance_score !== undefined) {
        header.appendChild(h('div', { className: 'text-xs text-indigo-600' }, `Search relevance ${Math.round(found.relevance_score * 100)}%`));
      }
    }
    left.appendChild(header);

    left.appendChild(sectionCard('Symptom', entry.symptom || '-', { maxHeight: '220px' }));
    left.appendChild(sectionCard('Cause', entry.cause || '-', { maxHeight: '220px' }));
    left.appendChild(sectionCard('Action', entry.action || '-', { maxHeight: '220px' }));

    if (Array.isArray(entry.runbook) && entry.runbook.length > 0) {
      left.appendChild(renderSqlList('Runbook', entry.runbook));
    }

    if (Array.isArray(entry.diagnostic_steps) && entry.diagnostic_steps.length > 0) {
      left.appendChild(renderSqlList('Diagnostic Steps', entry.diagnostic_steps));
    }

    const resultRank = typeof index === 'number' ? index + 1 : null;
    let helpfulCount = Number(entry.helpful_count || 0);
    let notHelpfulCount = Number(entry.not_helpful_count || 0);
    let selectedFeedback = null;

    const feedbackCard = h('div', { className: 'card mb-4' },
      h('div', { className: 'flex items-center gap-2 mb-4' },
        h('i', { className: 'fas fa-comment-dots text-sm text-violet-400' }),
        h('h3', { className: 'font-semibold text-gray-900' }, '피드백')
      )
    );

    const helpfulCountLabel = h('span', { className: 'font-semibold' }, helpfulCount);
    const notHelpfulCountLabel = h('span', { className: 'font-semibold' }, notHelpfulCount);

    const helpfulButton = h('button', {
      onClick: async () => {
        await applyFeedback('helpful');
        showNotification('도움됨 피드백을 저장했습니다', 'success');
      }
    },
      h('i', { className: 'fas fa-thumbs-up' }),
      h('span', {}, '도움됨'),
      helpfulCountLabel
    );

    const notHelpfulButton = h('button', {
      onClick: async () => {
        await applyFeedback('not_helpful');
        showNotification('도움 안됨 피드백을 저장했습니다', 'info');
      }
    },
      h('i', { className: 'fas fa-thumbs-down' }),
      h('span', {}, '도움 안됨'),
      notHelpfulCountLabel
    );

    function updateFeedbackButtons() {
      helpfulButton.className = `flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all ${selectedFeedback === 'helpful' ? 'border-green-300 bg-green-50 text-green-700' : 'border-green-200 bg-white text-green-700 hover:bg-green-50'}`;
      notHelpfulButton.className = `flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all ${selectedFeedback === 'not_helpful' ? 'border-red-300 bg-red-50 text-red-700' : 'border-red-200 bg-white text-red-700 hover:bg-red-50'}`;
    }

    async function applyFeedback(type, suggestion = null) {
      await submitFeedback(id, type, searchEventId, resultRank, suggestion);
      if (type === 'helpful') {
        helpfulCount += 1;
        helpfulCountLabel.textContent = String(helpfulCount);
      } else {
        notHelpfulCount += 1;
        notHelpfulCountLabel.textContent = String(notHelpfulCount);
      }
      selectedFeedback = type;
      updateFeedbackButtons();
    }

    updateFeedbackButtons();

    const feedbackRow = h('div', { className: 'flex items-center gap-3 flex-wrap' }, helpfulButton, notHelpfulButton);
    feedbackCard.appendChild(feedbackRow);

    const suggestionInput = h('input', {
      type: 'text',
      className: 'input-field text-sm mt-3',
      placeholder: '개선 제안이 있으면 입력해주세요 (선택)'
    });
    feedbackCard.appendChild(suggestionInput);
    feedbackCard.appendChild(h('button', {
      className: 'mt-3 btn-secondary text-sm',
      onClick: async () => {
        const suggestion = suggestionInput.value.trim();
        if (!suggestion) {
          showNotification('개선 제안을 입력해 주세요', 'warning');
          return;
        }
        const feedbackType = selectedFeedback || 'helpful';
        await applyFeedback(feedbackType, suggestion);
        suggestionInput.value = '';
        showNotification('제안을 제출했습니다', 'success');
      }
    }, '제안 제출'));

    left.appendChild(feedbackCard);

    const metaCard = h('div', { className: 'card mb-4' },
      h('h3', { className: 'font-semibold text-gray-900 text-sm mb-3' }, 'Trust & Metadata')
    );
    [
      ['Approver', entry.approver_name || '-'],
      ['Approved At', formatDate(entry.approved_at)],
      ['Reviewed At', formatDate(entry.reviewed_at)],
      ['Version Range', entry.version_range || '-'],
      ['Search Count', String(entry.search_count || 0)],
      ['Quality Score', entry.ai_quality_score != null ? `${Math.round(entry.ai_quality_score * 100)}%` : '-']
    ].forEach(([label, value]) => metaCard.appendChild(metaRow(label, value)));
    right.appendChild(metaCard);

    if (Array.isArray(entry.tags) && entry.tags.length > 0) {
      const tagsCard = h('div', { className: 'card mb-4' },
        h('h3', { className: 'font-semibold text-gray-900 text-sm mb-3' }, 'Tags'),
        h('div', { className: 'flex flex-wrap gap-1' }, ...entry.tags.map((tag) => h('span', { className: 'tag' }, tag)))
      );
      right.appendChild(tagsCard);
    }

    if (entry.activity_logs?.length > 0) {
      const activityCard = h('div', { className: 'card mb-4' },
        h('h3', { className: 'font-semibold text-gray-900 text-sm mb-3' }, 'Activity Timeline')
      );
      entry.activity_logs.slice(-6).forEach((log) => {
        activityCard.appendChild(h('div', { className: 'flex gap-2 mb-3 last:mb-0' },
          h('span', { className: 'text-xs text-gray-400 mt-0.5' }, '•'),
          h('div', {},
            h('p', { className: 'text-xs font-medium text-gray-700' }, `${log.user_name || 'System'} - ${log.action}`),
            h('p', { className: 'text-xs text-gray-400' }, formatDate(log.created_at)),
            log.note ? h('p', { className: 'text-xs text-gray-500 italic' }, log.note) : null
          )
        ));
      });
      right.appendChild(activityCard);
    }

    if (similar.items?.length > 0) {
      const similarCard = h('div', { className: 'card mb-4' },
        h('h3', { className: 'font-semibold text-gray-900 text-sm mb-3' }, 'Similar Knowledge')
      );
      similar.items.forEach((item) => {
        similarCard.appendChild(h('div', {
          className: 'p-2 border border-gray-100 rounded-lg mb-2 cursor-pointer hover:border-indigo-300',
          onClick: () => navigate('knowledge-detail', { id: item.id })
        },
          h('p', { className: 'text-xs font-medium text-gray-800 mb-1' }, item.title),
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: `text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[item.priority] || 'bg-gray-100 text-gray-600'}` }, PRIORITY_LABELS[item.priority] || item.priority || 'P2'),
            h('span', { className: `text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_CLASSES[item.status] || 'bg-gray-100 text-gray-600'}` }, STATUS_LABELS[item.status] || item.status || 'unknown'),
            h('span', { className: 'text-xs text-indigo-600 font-bold ml-auto' }, item.similarity_score?.toFixed(2) || '0.00')
          )
        ));
      });
      right.appendChild(similarCard);
    }

    const actionsCard = h('div', { className: 'card' },
      h('h3', { className: 'font-semibold text-gray-900 text-sm mb-3' }, 'Quick Actions')
    );
    if (Array.isArray(entry.runbook) && entry.runbook.length > 0) {
      actionsCard.appendChild(h('button', {
        className: 'btn-secondary w-full text-sm text-left mb-2',
        onClick: () => copyText(entry.runbook.map((step) => `-- Step ${step.step}: ${step.title}\n${step.sql}`).join('\n\n'), 'Runbook')
      }, 'Copy runbook'));
    }
    actionsCard.appendChild(h('button', {
      className: 'btn-secondary w-full text-sm text-left',
      onClick: () => copyText(`${entry.title || ''}\n\n${entry.symptom || ''}\n\n${entry.action || ''}`, 'Summary')
    }, 'Copy summary'));
    right.appendChild(actionsCard);

    layout.appendChild(left);
    layout.appendChild(right);
    container.appendChild(layout);
    main.appendChild(container);
  } catch (error) {
    main.innerHTML = `<div class="p-8 text-center text-red-500">Failed to load knowledge detail: ${error.message}</div>`;
  }
}