import { api } from '../api.js';
import { DBMS_LABELS, DBMS_COLORS } from '../state.js';
import { h, timeAgo } from '../utils.js';
import { navigate } from '../router.js';

export async function renderZeroResults() {
  const main = document.querySelector('.main-content');
  main.innerHTML = '';
  const container = h('div', { className: 'p-6' });

  container.appendChild(h('div', { className: 'mb-6' },
    h('h1', { className: 'text-2xl font-bold text-gray-900' }, 'Zero Result Analysis'),
    h('p', { className: 'text-sm text-gray-400 mt-1' }, 'Track search gaps and capture missing knowledge directly from the miss list.')
  ));

  try {
    const data = await api('GET', '/api/search/zero-results?limit=50');

    container.appendChild(h('div', { className: 'card mb-6' },
      h('div', { className: 'flex items-center gap-6' },
        h('div', {},
          h('div', { className: 'text-3xl font-bold text-red-600' }, data.items.length),
          h('div', { className: 'text-sm text-gray-500' }, 'Tracked queries')
        ),
        h('div', {},
          h('div', { className: 'text-3xl font-bold text-orange-500' }, data.this_week_count),
          h('div', { className: 'text-sm text-gray-500' }, 'Seen this week')
        )
      )
    ));

    if (!data.items.length) {
      container.appendChild(h('div', { className: 'card text-center py-10 text-gray-400' },
        h('i', { className: 'fas fa-check-circle text-4xl text-green-400 mb-3' }),
        h('p', { className: 'font-medium text-green-600' }, 'No zero-result queries right now.'),
        h('p', { className: 'text-sm' }, 'Recent searches are all returning knowledge.')
      ));
    } else {
      const table = h('div', { className: 'card' },
        h('h2', { className: 'font-semibold text-gray-900 mb-4' }, 'Unmatched search queries')
      );

      data.items.forEach((item) => {
        table.appendChild(h('div', { className: 'flex items-center justify-between py-3 border-b border-gray-50 last:border-0' },
          h('div', { className: 'flex-1' },
            h('p', { className: 'text-sm font-medium text-gray-900' }, item.query),
            h('div', { className: 'flex items-center gap-3 mt-1 flex-wrap' },
              h('span', { className: 'text-xs text-gray-400' }, `${item.count} miss(es)`),
              h('span', { className: 'text-xs text-gray-400' }, `Last seen ${timeAgo(item.last_seen_at)}`),
              item.dbms_filter && item.dbms_filter !== 'all'
                ? h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${DBMS_COLORS[item.dbms_filter] || 'bg-gray-100 text-gray-600'}` }, DBMS_LABELS[item.dbms_filter] || item.dbms_filter)
                : null
            )
          ),
          h('button', {
            className: 'btn-primary text-xs px-3',
            onClick: () => navigate('quick-input', { prefill: item.query })
          }, 'Capture')
        ));
      });

      container.appendChild(table);
    }

    main.appendChild(container);
  } catch (error) {
    main.innerHTML = `<div class="p-6 text-red-500">Failed to load zero-result analysis: ${error.message}</div>`;
  }
}