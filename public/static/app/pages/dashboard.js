import { api } from '../api.js';
import {
  DBMS_LABELS,
  DBMS_COLORS,
  STATUS_LABELS,
  STATUS_CLASSES,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  SEED_TARGETS,
  SEED_TOTAL
} from '../state.js';
import { h, timeAgo } from '../utils.js';
import { navigate } from '../router.js';

function metricCard(metric) {
  return h('div', { className: 'card' },
    h('div', { className: `w-10 h-10 ${metric.iconBg} rounded-lg flex items-center justify-center mb-3` },
      h('i', { className: `fas ${metric.icon} ${metric.iconColor}` })
    ),
    h('div', { className: 'text-2xl font-bold text-gray-900 mb-1' }, metric.value),
    h('div', { className: 'text-sm text-gray-700' }, metric.title),
    h('div', { className: `text-xs ${metric.subColor || 'text-gray-400'}` }, metric.sub)
  );
}

function listRow(item) {
  return h('div', {
    className: 'p-3 border border-gray-100 rounded-lg hover:border-indigo-200 cursor-pointer transition-all',
    onClick: () => navigate('knowledge-detail', { id: item.id })
  },
    h('div', { className: 'flex items-start justify-between gap-3 mb-2' },
      h('div', { className: 'flex-1 min-w-0' },
        h('p', { className: 'text-sm font-medium text-gray-900 truncate' }, item.title || 'Untitled knowledge'),
        h('p', { className: 'text-xs text-gray-400 mt-1' }, item.incident_number || '-')
      ),
      h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[item.status] || 'bg-gray-100 text-gray-600'}` }, STATUS_LABELS[item.status] || item.status || 'unknown')
    ),
    h('div', { className: 'flex items-center gap-2 flex-wrap' },
      h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${DBMS_COLORS[item.dbms] || 'bg-gray-100 text-gray-600'}` }, DBMS_LABELS[item.dbms] || item.dbms || 'Unknown DBMS'),
      h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority] || 'bg-gray-100 text-gray-600'}` }, PRIORITY_LABELS[item.priority] || item.priority || 'P2'),
      h('span', { className: 'text-xs text-gray-400 ml-auto' }, timeAgo(item.updated_at))
    )
  );
}

export async function renderDashboard() {
  const main = document.querySelector('.main-content');
  main.innerHTML = '<div class="p-6 text-gray-400 text-center mt-20"><i class="fas fa-spinner fa-spin text-3xl"></i></div>';

  try {
    const [stats, recent] = await Promise.all([
      api('GET', '/api/dashboard/stats'),
      api('GET', '/api/dashboard/recent?limit=8')
    ]);

    main.innerHTML = '';
    const container = h('div', { className: 'p-6' });

    container.appendChild(h('div', { className: 'flex items-center justify-between mb-6' },
      h('div', {},
        h('h1', { className: 'text-2xl font-bold text-gray-900' }, 'Dashboard'),
        h('p', { className: 'text-sm text-gray-400 mt-1' }, 'Baseline status for incidents, search quality, and reviewer throughput.')
      ),
      h('div', { className: 'flex items-center gap-3' },
        h('button', { className: 'btn-secondary text-sm', onClick: () => navigate('reviewer') }, 'Open Reviewer Queue'),
        h('button', { className: 'btn-primary text-sm', onClick: () => navigate('quick-input') }, 'New Incident')
      )
    ));

    const metrics = [
      {
        icon: 'fa-database',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        title: 'Total Incidents',
        value: stats.total_incidents || 0,
        sub: `+${stats.this_week_incidents || 0} this week`,
        subColor: 'text-green-600'
      },
      {
        icon: 'fa-crosshairs',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        title: 'Top-3 Search Accuracy',
        value: `${stats.search_accuracy_top3 || 0}%`,
        sub: 'Helpful feedback ranked in top 3',
        subColor: 'text-gray-400'
      },
      {
        icon: 'fa-robot',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        title: 'AI Approval Rate',
        value: `${stats.ai_approval_rate || 0}%`,
        sub: (stats.ai_approval_rate || 0) >= 70 ? 'On target' : 'Below 70% goal',
        subColor: (stats.ai_approval_rate || 0) >= 70 ? 'text-green-600' : 'text-orange-500'
      },
      {
        icon: 'fa-search-minus',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        title: 'Zero Result Rate',
        value: `${stats.zero_result_rate || 0}%`,
        sub: (stats.zero_result_rate || 0) <= 20 ? 'Healthy' : 'Needs coverage',
        subColor: (stats.zero_result_rate || 0) <= 20 ? 'text-green-600' : 'text-red-500'
      }
    ];

    const metricGrid = h('div', { className: 'grid grid-cols-4 gap-4 mb-6' });
    metrics.forEach((metric) => metricGrid.appendChild(metricCard(metric)));
    container.appendChild(metricGrid);

    const layout = h('div', { className: 'grid grid-cols-3 gap-4' });
    const left = h('div', { className: 'col-span-2 space-y-4' });
    const right = h('div', { className: 'col-span-1 space-y-4' });

    const recentCard = h('div', { className: 'card' },
      h('div', { className: 'flex items-center justify-between mb-3' },
        h('h3', { className: 'font-semibold text-gray-900' }, 'Recent Knowledge'),
        h('a', {
          href: '#',
          className: 'text-xs text-indigo-600 hover:underline',
          onClick: (event) => {
            event.preventDefault();
            navigate('search');
          }
        }, 'Open Search')
      )
    );
    if ((recent.items || []).length === 0) {
      recentCard.appendChild(h('p', { className: 'text-sm text-gray-400' }, 'No recent knowledge yet.'));
    } else {
      recent.items.forEach((item) => recentCard.appendChild(listRow(item)));
    }
    left.appendChild(recentCard);

    const reviewerCard = h('div', { className: 'card' },
      h('h3', { className: 'font-semibold text-gray-900 mb-3' }, 'Review Queue'),
      h('div', { className: 'grid grid-cols-2 gap-3' },
        h('div', { className: 'p-3 rounded-lg bg-blue-50 border border-blue-100' },
          h('div', { className: 'text-xs text-blue-600 mb-1' }, 'Reviewed'),
          h('div', { className: 'text-2xl font-bold text-blue-700' }, stats.reviewed_count || 0)
        ),
        h('div', { className: 'p-3 rounded-lg bg-orange-50 border border-orange-100' },
          h('div', { className: 'text-xs text-orange-600 mb-1' }, 'Needs Review'),
          h('div', { className: 'text-2xl font-bold text-orange-700' }, stats.needs_review_count || 0)
        )
      )
    );
    left.appendChild(reviewerCard);

    const seedCard = h('div', { className: 'card' },
      h('div', { className: 'flex items-center justify-between mb-3' },
        h('h3', { className: 'font-semibold text-gray-900 text-sm' }, 'Seed Coverage'),
        h('span', { className: 'text-xs text-gray-400' }, `${Object.values(stats.seed_progress || {}).reduce((sum, count) => sum + count, 0)} / ${SEED_TOTAL}`)
      )
    );
    Object.entries(SEED_TARGETS).forEach(([dbms, target]) => {
      const current = stats.seed_progress?.[dbms] || 0;
      seedCard.appendChild(h('div', { className: 'mb-3 last:mb-0' },
        h('div', { className: 'flex items-center justify-between text-xs mb-1' },
          h('span', { className: 'text-gray-600' }, DBMS_LABELS[dbms] || dbms),
          h('span', { className: 'text-gray-400' }, `${current}/${target}`)
        ),
        h('div', { className: 'w-full h-2 bg-gray-100 rounded-full overflow-hidden' },
          h('div', {
            className: 'h-full bg-indigo-500 rounded-full',
            style: `width:${target === 0 ? (current > 0 ? 100 : 0) : Math.min(100, Math.round((current / target) * 100))}%`
          })
        )
      ));
    });
    right.appendChild(seedCard);

    const qualityItems = [
      { label: 'AI Approval Rate', value: `${stats.ai_approval_rate || 0}%`, target: 'Target 70%', good: (stats.ai_approval_rate || 0) >= 70 },
      { label: 'Thumbs Down Rate', value: `${stats.thumbs_down_rate || 0}%`, target: 'Lower is better', good: (stats.thumbs_down_rate || 0) < 43 },
      { label: 'Search Usefulness', value: `${stats.search_usefulness || 0}%`, target: 'Target 70%', good: (stats.search_usefulness || 0) >= 70 },
      { label: 'Reviewer Activity', value: `${stats.reviewer_activity_week || 0} actions`, target: 'Target 7+', good: (stats.reviewer_activity_week || 0) >= 7 }
    ];
    const qualityCard = h('div', { className: 'card' },
      h('h3', { className: 'font-semibold text-gray-900 text-sm mb-3' }, 'Quality Signals')
    );
    qualityItems.forEach((item) => {
      qualityCard.appendChild(h('div', { className: 'flex items-center justify-between py-2 border-b border-gray-50 last:border-0' },
        h('div', {},
          h('p', { className: 'text-xs font-medium text-gray-700' }, item.label),
          h('p', { className: 'text-xs text-gray-400' }, item.target)
        ),
        h('span', { className: `text-sm font-bold ${item.good ? 'text-green-600' : 'text-orange-500'}` }, item.value)
      ));
    });
    right.appendChild(qualityCard);

    if ((stats.zero_result_queries_week || []).length > 0) {
      const zeroCard = h('div', { className: 'card' },
        h('div', { className: 'flex items-center justify-between mb-3' },
          h('h3', { className: 'font-semibold text-gray-900 text-sm' }, 'Recent Zero Result Queries'),
          h('a', {
            href: '#',
            className: 'text-xs text-indigo-600 hover:underline',
            onClick: (event) => {
              event.preventDefault();
              navigate('zero-results');
            }
          }, 'View all')
        )
      );
      stats.zero_result_queries_week.slice(0, 5).forEach((item) => {
        zeroCard.appendChild(h('div', { className: 'py-2 border-b border-gray-50 last:border-0' },
          h('div', { className: 'text-sm font-medium text-gray-800' }, item.query),
          h('div', { className: 'text-xs text-gray-400 mt-1' }, `${item.count || 1} misses`)
        ));
      });
      right.appendChild(zeroCard);
    }

    layout.appendChild(left);
    layout.appendChild(right);
    container.appendChild(layout);
    main.appendChild(container);
  } catch (error) {
    main.innerHTML = `<div class="p-6 text-red-500">Failed to load dashboard: ${error.message}</div>`;
  }
}