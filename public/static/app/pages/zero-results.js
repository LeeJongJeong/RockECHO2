import { api } from '../api.js';
import { DBMS_LABELS, DBMS_COLORS } from '../state.js';
import { h, timeAgo } from '../utils.js';
import { navigate } from '../router.js';

function summaryMetric(value, label, colorClass) {
  return h('div', { className: 'min-w-[120px]' },
    h('div', { className: `text-3xl font-bold ${colorClass}` }, value),
    h('div', { className: 'text-sm text-gray-500 mt-1' }, label)
  );
}

function queryRow(item) {
  return h('div', { className: 'flex items-center justify-between gap-4 py-4 border-b border-gray-50 last:border-0' },
    h('div', { className: 'min-w-0 flex-1' },
      h('p', { className: 'text-sm font-semibold text-gray-900 truncate' }, item.query),
      h('div', { className: 'flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400' },
        h('span', {}, `${item.count || 1}회 검색`),
        h('span', {}, `마지막: ${timeAgo(item.last_seen_at)}`),
        item.dbms_filter && item.dbms_filter !== 'all'
          ? h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${DBMS_COLORS[item.dbms_filter] || 'bg-gray-100 text-gray-600'}` }, DBMS_LABELS[item.dbms_filter] || item.dbms_filter)
          : null
      )
    ),
    h('div', { className: 'flex items-center gap-3 shrink-0' },
      h('span', { className: 'text-2xl font-bold text-red-400 leading-none' }, `×${item.count || 1}`),
      h('button', {
        className: 'btn-primary text-xs px-3 py-2',
        onClick: () => navigate('quick-input', { prefill: item.query })
      }, '+ 기록')
    )
  );
}

export async function renderZeroResults() {
  const main = document.querySelector('.main-content');
  main.innerHTML = '';
  const container = h('div', { className: 'p-6' });

  container.appendChild(h('div', { className: 'mb-6' },
    h('h1', { className: 'text-2xl font-bold text-gray-900' }, 'Zero Result 분석'),
    h('p', { className: 'text-sm text-gray-400 mt-1' }, '검색 결과가 없었던 쿼리 — 지식 공백을 파악하고 기록하세요')
  ));

  try {
    const data = await api('GET', '/api/search/zero-results?limit=50');
    const totalCount = data.items?.length || 0;

    container.appendChild(h('div', { className: 'card mb-6' },
      h('div', { className: 'flex items-center gap-12 flex-wrap' },
        summaryMetric(totalCount, '전체 Zero Result 검색어', 'text-red-500'),
        summaryMetric(data.this_week_count || 0, '이번 주 발생', 'text-orange-500')
      )
    ));

    if (!totalCount) {
      container.appendChild(h('div', { className: 'card text-center py-10 text-gray-400' },
        h('i', { className: 'fas fa-check-circle text-4xl text-green-400 mb-3' }),
        h('p', { className: 'font-medium text-green-600' }, '현재 미매칭 검색어가 없습니다.'),
        h('p', { className: 'text-sm' }, '최근 검색은 모두 결과를 반환하고 있습니다.')
      ));
    } else {
      const listCard = h('div', { className: 'card' },
        h('h2', { className: 'font-semibold text-gray-900 text-lg mb-4' }, '미매칭 검색어 목록')
      );

      data.items.forEach((item) => {
        listCard.appendChild(queryRow(item));
      });

      container.appendChild(listCard);
    }

    main.appendChild(container);
  } catch (error) {
    main.innerHTML = `<div class="p-6 text-red-500">Zero Result 분석을 불러오지 못했습니다: ${error.message}</div>`;
  }
}