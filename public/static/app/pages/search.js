import { api } from '../api.js';
import {
  CURRENT_USER,
  DBMS_LABELS,
  DBMS_COLORS,
  STATUS_LABELS,
  STATUS_CLASSES,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  searchContext,
  replaceSearchContext
} from '../state.js';
import { h, timeAgo } from '../utils.js';
import { navigate } from '../router.js';

function resultCard(item, index, total, searchEventId) {
  return h('div', {
    className: 'card cursor-pointer hover:border-indigo-200 transition-all',
    onClick: () => navigate('knowledge-detail', { id: item.id, searchEventId, index, total })
  },
    h('div', { className: 'flex items-start justify-between gap-3 mb-3' },
      h('div', { className: 'flex-1 min-w-0' },
        h('h3', { className: 'text-base font-semibold text-gray-900 mb-1 truncate' }, item.title || 'Untitled knowledge'),
        h('p', { className: 'text-sm text-gray-500 line-clamp-2' }, item.symptom || item.cause || 'No summary available.')
      ),
      h('div', { className: 'text-right' },
        h('div', { className: `text-xs px-2 py-1 rounded-full font-medium ${STATUS_CLASSES[item.status] || 'bg-gray-100 text-gray-600'}` }, STATUS_LABELS[item.status] || item.status || 'unknown'),
        item.relevance_score !== undefined ? h('p', { className: 'text-xs text-indigo-600 mt-2' }, `${Math.round(item.relevance_score * 100)}% match`) : null
      )
    ),
    h('div', { className: 'flex items-center gap-2 flex-wrap mb-2' },
      h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${DBMS_COLORS[item.dbms] || 'bg-gray-100 text-gray-600'}` }, DBMS_LABELS[item.dbms] || item.dbms || 'Unknown DBMS'),
      h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority] || 'bg-gray-100 text-gray-600'}` }, PRIORITY_LABELS[item.priority] || item.priority || 'P2'),
      h('span', { className: 'text-xs text-gray-400 ml-auto' }, timeAgo(item.updated_at))
    ),
    Array.isArray(item.tags) && item.tags.length > 0
      ? h('div', { className: 'flex flex-wrap gap-1' }, ...item.tags.slice(0, 6).map((tag) => h('span', { className: 'tag' }, tag)))
      : null
  );
}

async function loadRecentSearches(container) {
  try {
    const data = await api('GET', `/api/search/recent?user_id=${CURRENT_USER.id}`);
    if (!data.items?.length) return;

    container.innerHTML = '';
    container.appendChild(h('div', { className: 'flex items-center gap-2 flex-wrap' },
      h('span', { className: 'text-xs text-gray-400' }, 'Recent searches'),
      ...data.items.map((item) => h('button', {
        className: 'text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-indigo-50 hover:text-indigo-600',
        onClick: () => {
          const input = document.getElementById('search-input');
          if (!input) return;
          input.value = item.query;
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        }
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
    h('p', { className: 'text-gray-500 font-medium' }, `No approved knowledge matched "${query}".`),
    h('p', { className: 'text-sm text-gray-400 mt-1 mb-4' }, 'Capture it with Quick Input so the next search returns a result.'),
    h('button', {
      className: 'btn-primary text-sm',
      onClick: () => navigate('quick-input', { prefill: query })
    }, 'Create from query')
  ));
}

function renderResults(container, data, query) {
  container.innerHTML = '';
  if (!data.total) {
    renderEmptyResult(container, query);
    return;
  }

  container.appendChild(h('div', { className: 'flex items-center justify-between mb-3' },
    h('p', { className: 'text-sm text-gray-500' }, `${data.total} result(s)`),
    h('p', { className: 'text-xs text-gray-400' }, `Search event: ${data.search_event_id}`)
  ));

  data.items.forEach((item, index) => container.appendChild(resultCard(item, index, data.total, data.search_event_id)));
}

export function renderSearch() {
  const main = document.querySelector('.main-content');
  main.innerHTML = '';

  const container = h('div', { className: 'p-6' });
  container.appendChild(h('div', { className: 'mb-6' },
    h('h1', { className: 'text-2xl font-bold text-gray-900 mb-1' }, 'Search Knowledge'),
    h('p', { className: 'text-sm text-gray-400' }, 'Search incidents, SQL, and operational notes across the knowledge base.')
  ));

  const searchBox = h('div', { className: 'card mb-4' });
  const inputRow = h('div', { className: 'flex gap-2 mb-3' });
  const input = h('input', {
    id: 'search-input',
    type: 'text',
    className: 'input-field flex-1',
    placeholder: 'deadlock detected, too many clients, vacuum, oplog, replication lag...'
  });
  const searchButton = h('button', { className: 'btn-primary flex items-center gap-2', onClick: () => doSearch() },
    h('i', { className: 'fas fa-search' }),
    'Search'
  );
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') doSearch();
  });
  inputRow.appendChild(input);
  inputRow.appendChild(searchButton);
  searchBox.appendChild(inputRow);

  let selectedDbms = 'all';
  const dbmsRow = h('div', { className: 'flex flex-wrap gap-2 mb-2' });
  const dbmsOptions = [['all', 'All DBMS'], ...Object.entries(DBMS_LABELS)];
  for (const [value, label] of dbmsOptions) {
    dbmsRow.appendChild(h('button', {
      className: `text-xs px-3 py-1 rounded-full border transition-all dbms-filter-btn ${value === selectedDbms ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`,
      'data-dbms': value,
      onClick: () => {
        selectedDbms = value;
        document.querySelectorAll('.dbms-filter-btn').forEach((button) => {
          const active = button.getAttribute('data-dbms') === value;
          button.className = `text-xs px-3 py-1 rounded-full border transition-all dbms-filter-btn ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`;
        });
        doSearch();
      }
    }, label));
  }
  searchBox.appendChild(dbmsRow);

  const filterRow = h('div', { className: 'flex gap-3 items-center' },
    h('select', {
      id: 'priority-filter',
      className: 'text-xs border border-gray-200 rounded px-2 py-1 text-gray-600',
      innerHTML: '<option value="all">All priorities</option><option value="p1">P1</option><option value="p2">P2</option><option value="p3">P3</option>'
    }),
    h('select', {
      id: 'status-filter',
      className: 'text-xs border border-gray-200 rounded px-2 py-1 text-gray-600',
      innerHTML: '<option value="approved">Approved only</option><option value="all">All statuses</option>'
    })
  );
  searchBox.appendChild(filterRow);
  container.appendChild(searchBox);

  const recentSearches = h('div', { className: 'mb-4', id: 'recent-searches' });
  container.appendChild(recentSearches);
  loadRecentSearches(recentSearches);

  const results = h('div', { id: 'search-results' });
  container.appendChild(results);
  main.appendChild(container);

  async function doSearch() {
    const q = input.value || '';
    const priority = document.getElementById('priority-filter')?.value || 'all';
    const status = document.getElementById('status-filter')?.value || 'approved';
    results.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl"></i></div>';

    try {
      const params = new URLSearchParams({
        q,
        dbms: selectedDbms,
        priority,
        status,
        user_id: CURRENT_USER.id
      });
      const data = await api('GET', `/api/search?${params}`);
      replaceSearchContext({
        query: q,
        results: data.items,
        searchEventId: data.search_event_id,
        currentIndex: 0
      });
      renderResults(results, data, q);
    } catch (error) {
      results.innerHTML = `<div class="text-red-500 p-4">Search failed: ${error.message}</div>`;
    }
  }

  if (searchContext.query) {
    input.value = searchContext.query;
    doSearch();
  }
}