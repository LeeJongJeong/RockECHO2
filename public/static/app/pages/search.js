import { api } from '../api.js';
import {
  CURRENT_USER,
  DBMS_LABELS,
  DBMS_COLORS,
  STATUS_CLASSES,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  searchContext,
  replaceSearchContext
} from '../state.js';
import { h, timeAgo } from '../utils.js';
import { navigate } from '../router.js';

const SEARCH_STATUS_LABELS = {
  raw_input: '원본 입력',
  ai_generated: 'AI 초안',
  reviewed: '검토 대기',
  approved: '승인 완료',
  needs_review: '재검토 필요'
};

function resultCard(item, index, total, searchEventId) {
  return h('div', {
    className: 'card cursor-pointer hover:border-indigo-200 transition-all',
    onClick: () => navigate('knowledge-detail', { id: item.id, searchEventId, index, total })
  },
    h('div', { className: 'flex items-start justify-between gap-3 mb-3' },
      h('div', { className: 'flex-1 min-w-0' },
        h('h3', { className: 'text-base font-semibold text-gray-900 mb-1 truncate' }, item.title || '제목 없는 지식 항목'),
        h('p', { className: 'text-sm text-gray-500 line-clamp-2' }, item.symptom || item.cause || '요약 정보가 없습니다.')
      ),
      h('div', { className: 'text-right shrink-0' },
        h('div', { className: `text-xs px-2 py-1 rounded-full font-medium ${STATUS_CLASSES[item.status] || 'bg-gray-100 text-gray-600'}` }, SEARCH_STATUS_LABELS[item.status] || item.status || '상태 미상'),
        item.relevance_score !== undefined
          ? h('p', { className: 'text-xs text-indigo-600 mt-2' }, `유사도 ${Math.round(item.relevance_score * 100)}%`)
          : null
      )
    ),
    h('div', { className: 'flex items-center gap-2 flex-wrap mb-2' },
      h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${DBMS_COLORS[item.dbms] || 'bg-gray-100 text-gray-600'}` }, DBMS_LABELS[item.dbms] || item.dbms || '미상 DBMS'),
      h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority] || 'bg-gray-100 text-gray-600'}` }, PRIORITY_LABELS[item.priority] || item.priority || 'P2'),
      h('span', { className: 'text-xs text-gray-400 ml-auto' }, timeAgo(item.updated_at))
    ),
    Array.isArray(item.tags) && item.tags.length > 0
      ? h('div', { className: 'flex flex-wrap gap-1' }, ...item.tags.slice(0, 6).map((tag) => h('span', { className: 'tag' }, tag)))
      : null
  );
}

async function loadRecentSearches(container, triggerSearch) {
  try {
    const data = await api('GET', `/api/search/recent?user_id=${CURRENT_USER.id}`);
    if (!data.items?.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = '';
    container.appendChild(h('div', { className: 'flex items-center gap-2 flex-wrap' },
      h('span', { className: 'text-xs text-gray-400 font-medium' }, '최근 검색:'),
      ...data.items.map((item) => h('button', {
        className: 'text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded hover:bg-indigo-50 hover:text-indigo-600 transition-colors',
        onClick: () => triggerSearch(item.query)
      }, item.query))
    ));
  } catch {
    container.innerHTML = '';
  }
}

function renderEmptyResult(container, query) {
  container.innerHTML = '';
  container.appendChild(h('div', { className: 'card text-center py-10' },
    h('i', { className: 'fas fa-search text-4xl text-gray-200 mb-3' }),
    h('p', { className: 'text-gray-500 font-medium' }, `"${query}"와 일치하는 승인 지식이 없습니다.`),
    h('p', { className: 'text-sm text-gray-400 mt-1 mb-4' }, '빠른 입력으로 등록해 두면 다음 검색부터 재사용할 수 있습니다.'),
    h('button', {
      className: 'btn-primary text-sm',
      onClick: () => navigate('quick-input', { prefill: query })
    }, '이 검색어로 기록하기')
  ));
}

function renderResults(container, data, query) {
  container.innerHTML = '';
  if (!data.total) {
    renderEmptyResult(container, query);
    return;
  }

  container.appendChild(h('div', { className: 'flex items-center justify-between mb-3' },
    h('p', { className: 'text-sm text-gray-500' }, `검색 결과 ${data.total}건`),
    h('p', { className: 'text-xs text-gray-400' }, `검색 이벤트: ${data.search_event_id}`)
  ));

  data.items.forEach((item, index) => container.appendChild(resultCard(item, index, data.total, data.search_event_id)));
}

export function renderSearch() {
  const main = document.querySelector('.main-content');
  main.innerHTML = '';

  const container = h('div', { className: 'p-6' });
  container.appendChild(h('div', { className: 'mb-6' },
    h('h1', { className: 'text-2xl font-bold text-gray-900 mb-1' }, '장애 검색'),
    h('p', { className: 'text-sm text-gray-400' }, '에러 로그, SQL 키워드, 자연어로 과거 해결 경험을 찾아보세요')
  ));

  const results = h('div', { id: 'search-results' });
  let selectedDbms = 'all';

  const searchBox = h('div', { className: 'card mb-4' });
  const inputRow = h('div', { className: 'flex gap-2 mb-3' });
  const input = h('input', {
    id: 'search-input',
    type: 'text',
    className: 'input-field flex-1 h-11',
    placeholder: '"postgres vacuum 안 될 때", "deadlock detected", "too many clients" ...'
  });
  const searchButton = h('button', {
    className: 'btn-primary flex items-center gap-2 px-5',
    onClick: () => doSearch()
  },
    h('i', { className: 'fas fa-search' }),
    '검색'
  );
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') doSearch();
  });
  inputRow.appendChild(input);
  inputRow.appendChild(searchButton);
  searchBox.appendChild(inputRow);

  const dbmsRow = h('div', { className: 'flex flex-wrap gap-2 mb-3' });
  const dbmsOptions = [['all', '전체 DBMS'], ...Object.entries(DBMS_LABELS)];

  function updateDbmsButtons() {
    document.querySelectorAll('.dbms-filter-btn').forEach((button) => {
      const active = button.getAttribute('data-dbms') === selectedDbms;
      button.className = `text-xs px-3 py-1 rounded-full border transition-all dbms-filter-btn ${active ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`;
    });
  }

  for (const [value, label] of dbmsOptions) {
    dbmsRow.appendChild(h('button', {
      className: `text-xs px-3 py-1 rounded-full border transition-all dbms-filter-btn ${value === selectedDbms ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`,
      'data-dbms': value,
      onClick: () => {
        selectedDbms = value;
        updateDbmsButtons();
        if (input.value.trim()) doSearch();
      }
    }, label));
  }
  searchBox.appendChild(dbmsRow);

  const priorityFilter = h('select', {
    id: 'priority-filter',
    className: 'text-xs border border-gray-200 rounded px-3 py-2 text-gray-600 bg-white',
    innerHTML: '<option value="all">모든 우선순위</option><option value="p1">P1</option><option value="p2">P2</option><option value="p3">P3</option>'
  });

  const statusFilter = h('select', {
    id: 'status-filter',
    className: 'text-xs border border-gray-200 rounded px-3 py-2 text-gray-600 bg-white',
    innerHTML: '<option value="approved">승인된 항목만</option><option value="all">전체 상태</option>'
  });

  const filterRow = h('div', { className: 'flex gap-3 items-center' }, priorityFilter, statusFilter);
  [priorityFilter, statusFilter].forEach((element) => {
    element.addEventListener('change', () => {
      if (input.value.trim()) doSearch();
    });
  });

  searchBox.appendChild(filterRow);
  container.appendChild(searchBox);

  const recentSearches = h('div', { className: 'mb-6', id: 'recent-searches' });
  container.appendChild(recentSearches);
  loadRecentSearches(recentSearches, (query) => {
    input.value = query;
    doSearch();
  });

  container.appendChild(results);
  main.appendChild(container);

  async function doSearch(forcedQuery = null) {
    const q = forcedQuery ?? input.value ?? '';
    const trimmedQuery = q.trim();
    const priority = document.getElementById('priority-filter')?.value || 'all';
    const status = document.getElementById('status-filter')?.value || 'approved';

    if (!trimmedQuery) {
      results.innerHTML = '';
      replaceSearchContext({
        query: '',
        results: [],
        searchEventId: null,
        currentIndex: 0
      });
      return;
    }

    if (forcedQuery !== null) {
      input.value = trimmedQuery;
    }

    results.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';

    try {
      const params = new URLSearchParams({
        q: trimmedQuery,
        dbms: selectedDbms,
        priority,
        status,
        user_id: CURRENT_USER.id
      });
      const data = await api('GET', `/api/search?${params}`);
      replaceSearchContext({
        query: trimmedQuery,
        results: data.items,
        searchEventId: data.search_event_id,
        currentIndex: 0
      });
      renderResults(results, data, trimmedQuery);
    } catch (error) {
      results.innerHTML = `<div class="text-red-500 p-4">검색에 실패했습니다: ${error.message}</div>`;
    }
  }

  if (searchContext.query) {
    input.value = searchContext.query;
    doSearch(searchContext.query);
  }
}