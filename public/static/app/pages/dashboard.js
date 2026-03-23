import { api } from '../api.js';
import {
  DBMS_LABELS,
  DBMS_COLORS,
  STATUS_CLASSES,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  SEED_TARGETS,
  SEED_TOTAL
} from '../state.js';
import { h, timeAgo } from '../utils.js';
import { navigate } from '../router.js';

const DASHBOARD_STATUS_LABELS = {
  raw_input: '원본 입력',
  ai_generated: 'AI 초안',
  reviewed: '검토 대기',
  approved: '승인 완료',
  needs_review: '재검토 필요'
};

const SEED_BAR_COLORS = {
  postgresql: 'bg-blue-500',
  mysql: 'bg-orange-500',
  mongodb: 'bg-green-500',
  redis: 'bg-red-500'
};

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

function getQualityTone(score) {
  if (score >= 70) return 'bg-indigo-500';
  if (score >= 50) return 'bg-orange-400';
  return 'bg-red-500';
}

function listRow(item) {
  const tags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];
  const qualityScore = Math.round((item.ai_quality_score || 0) * 100);

  return h('div', {
    className: 'p-4 border border-gray-100 rounded-xl hover:border-indigo-200 cursor-pointer transition-all shadow-sm',
    onClick: () => navigate('knowledge-detail', { id: item.id })
  },
    h('div', { className: 'flex items-start justify-between gap-3' },
      h('div', { className: 'flex-1 min-w-0' },
        h('p', { className: 'text-sm font-semibold text-gray-900 truncate' }, item.title || '제목 없는 항목'),
        tags.length
          ? h('div', { className: 'flex items-center gap-2 flex-wrap mt-2' },
              ...tags.map((tag) => h('span', { className: 'text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500' }, tag))
            )
          : null,
        h('div', { className: 'flex items-center gap-3 flex-wrap mt-2 text-xs text-gray-400' },
          h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${DBMS_COLORS[item.dbms] || 'bg-gray-100 text-gray-600'}` }, DBMS_LABELS[item.dbms] || item.dbms || '미상 DBMS'),
          h('span', { className: 'text-xs text-gray-400' }, item.incident_number || '-'),
          h('span', { className: 'text-xs text-gray-400' }, timeAgo(item.updated_at))
        ),
        qualityScore > 0
          ? h('div', { className: 'mt-4' },
              h('div', { className: 'flex items-center justify-between text-xs text-gray-400 mb-1' },
                h('span', {}, 'AI 품질'),
                h('span', {}, `${qualityScore}%`)
              ),
              h('div', { className: 'w-full h-1.5 bg-gray-100 rounded-full overflow-hidden' },
                h('div', {
                  className: `h-full rounded-full ${getQualityTone(qualityScore)}`,
                  style: `width:${qualityScore}%`
                })
              )
            )
          : null
      ),
      h('div', { className: 'flex items-center gap-2 shrink-0' },
        h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority] || 'bg-gray-100 text-gray-600'}` }, PRIORITY_LABELS[item.priority] || item.priority || 'P2'),
        h('span', { className: `text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[item.status] || 'bg-gray-100 text-gray-600'}` }, DASHBOARD_STATUS_LABELS[item.status] || item.status || '상태 미상')
      )
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
    const reviewQueueCount = (stats.reviewed_count || 0) + (stats.needs_review_count || 0);
    const aiApprovalRate = stats.ai_approval_rate || 0;
    const zeroResultRate = stats.zero_result_rate || 0;
    const seedCount = Object.values(stats.seed_progress || {}).reduce((sum, count) => sum + count, 0);
    const seedPercent = SEED_TOTAL ? Math.round((seedCount / SEED_TOTAL) * 100) : 0;

    container.appendChild(h('div', { className: 'flex items-center justify-between mb-6' },
      h('div', {},
        h('h1', { className: 'text-2xl font-bold text-gray-900' }, '대시보드'),
        h('p', { className: 'text-sm text-gray-400 mt-1' }, 'RockECHO — DB 운영 경험 축적 현황')
      ),
      h('div', { className: 'flex items-center gap-3' },
        h('button', {
          className: 'btn-secondary text-sm flex items-center gap-2',
          onClick: () => navigate('reviewer')
        },
          h('i', { className: 'fas fa-check text-xs' }),
          h('span', {}, '검토 대기'),
          h('span', { className: 'nav-badge' }, reviewQueueCount)
        ),
        h('button', {
          className: 'btn-primary text-sm flex items-center gap-2',
          onClick: () => navigate('quick-input')
        },
          h('i', { className: 'fas fa-plus text-xs' }),
          '장애 기록하기'
        )
      )
    ));

    const metrics = [
      {
        icon: 'fa-database',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        title: '전체 Incident',
        value: stats.total_incidents || 0,
        sub: `이번 주 +${stats.this_week_incidents || 0}건`,
        subColor: 'text-green-600'
      },
      {
        icon: 'fa-crosshairs',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        title: '검색 정확도 Top3',
        value: `${stats.search_accuracy_top3 || 0}%`,
        sub: '목표 Baseline 측정 중',
        subColor: 'text-gray-400'
      },
      {
        icon: 'fa-robot',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        title: 'AI 초안 승인율',
        value: `${aiApprovalRate}%`,
        sub: aiApprovalRate >= 70 ? '목표 70% 달성' : `목표 70% 대비 ${70 - aiApprovalRate}%p 부족`,
        subColor: aiApprovalRate >= 70 ? 'text-green-600' : 'text-orange-500'
      },
      {
        icon: 'fa-magnifying-glass',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        title: 'Zero Result 비율',
        value: `${zeroResultRate}%`,
        sub: zeroResultRate <= 20 ? '목표 달성 (<20%)' : `목표 20% 초과 (${zeroResultRate}%)`,
        subColor: zeroResultRate <= 20 ? 'text-green-600' : 'text-red-500'
      }
    ];

    const metricGrid = h('div', { className: 'grid grid-cols-4 gap-4 mb-6' });
    metrics.forEach((metric) => metricGrid.appendChild(metricCard(metric)));
    container.appendChild(metricGrid);

    const layout = h('div', { className: 'grid grid-cols-3 gap-4' });
    const left = h('div', { className: 'col-span-2 space-y-4' });
    const right = h('div', { className: 'col-span-1 space-y-4' });

    const recentCard = h('div', { className: 'card' },
      h('div', { className: 'flex items-center justify-between mb-4' },
        h('h3', { className: 'font-semibold text-gray-900 text-lg' }, '최근 Incidents'),
        h('a', {
          href: '#',
          className: 'text-xs text-indigo-600 hover:underline',
          onClick: (event) => {
            event.preventDefault();
            navigate('search');
          }
        }, '전체 보기 →')
      )
    );
    if ((recent.items || []).length === 0) {
      recentCard.appendChild(h('p', { className: 'text-sm text-gray-400' }, '최근 항목이 없습니다.'));
    } else {
      recent.items.forEach((item) => recentCard.appendChild(listRow(item)));
    }
    left.appendChild(recentCard);

    const seedCard = h('div', { className: 'card' },
      h('div', { className: 'flex items-center justify-between mb-4' },
        h('div', { className: 'flex items-center gap-2' },
          h('i', { className: 'fas fa-seedling text-green-500 text-sm' }),
          h('h3', { className: 'font-semibold text-gray-900 text-sm' }, 'Seed Data 진행률')
        ),
        h('span', { className: 'text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium' }, 'Phase 0')
      ),
      h('div', { className: 'flex items-center justify-between text-xs text-gray-500 mb-1' },
        h('span', {}, `${seedCount} / ${SEED_TOTAL}건`),
        h('span', {}, `${seedPercent}%`)
      ),
      h('div', { className: 'w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3' },
        h('div', {
          className: 'h-full bg-indigo-500 rounded-full',
          style: `width:${seedPercent}%`
        })
      )
    );
    Object.entries(SEED_TARGETS)
      .filter(([, target]) => target > 0)
      .forEach(([dbms, target]) => {
        const current = stats.seed_progress?.[dbms] || 0;
        seedCard.appendChild(h('div', { className: 'mb-3 last:mb-0' },
          h('div', { className: 'flex items-center justify-between text-xs mb-1' },
            h('span', { className: 'text-gray-600' }, DBMS_LABELS[dbms] || dbms),
            h('span', { className: 'text-gray-400' }, `${current}/${target}`)
          ),
          h('div', { className: 'w-full h-1.5 bg-gray-100 rounded-full overflow-hidden' },
            h('div', {
              className: `h-full rounded-full ${SEED_BAR_COLORS[dbms] || 'bg-indigo-500'}`,
              style: `width:${Math.min(100, Math.round((current / target) * 100))}%`
            })
          )
        ));
      });
    right.appendChild(seedCard);

    const qualityItems = [
      { label: 'AI 초안 승인율', value: `${aiApprovalRate}%`, target: '목표 70%', good: aiApprovalRate >= 70 },
      { label: 'Thumbs Down 비율', value: `${stats.thumbs_down_rate || 0}%`, target: '목표 <43%', good: (stats.thumbs_down_rate || 0) < 43 },
      { label: 'Search Usefulness', value: `${stats.search_usefulness || 0}%`, target: '목표 70%', good: (stats.search_usefulness || 0) >= 70 },
      { label: '주간 Reviewer 처리', value: `${stats.reviewer_activity_week || 0}건`, target: '목표 7건+', good: (stats.reviewer_activity_week || 0) >= 7 }
    ];
    const qualityCard = h('div', { className: 'card' },
      h('div', { className: 'flex items-center gap-2 mb-3' },
        h('i', { className: 'fas fa-chart-column text-indigo-500 text-sm' }),
        h('h3', { className: 'font-semibold text-gray-900 text-sm' }, '품질 현황')
      )
    );
    qualityItems.forEach((item) => {
      qualityCard.appendChild(h('div', { className: 'flex items-center justify-between py-2 border-b border-gray-50 last:border-0' },
        h('div', {},
          h('p', { className: 'text-xs font-medium text-gray-700' }, item.label),
          h('p', { className: 'text-xs text-gray-400' }, item.target)
        ),
        h('div', { className: `flex items-center gap-2 text-sm font-bold ${item.good ? 'text-green-600' : 'text-orange-500'}` },
          h('span', {}, item.value),
          h('i', { className: `fas ${item.good ? 'fa-circle-check' : 'fa-circle-exclamation'} text-xs` })
        )
      ));
    });
    right.appendChild(qualityCard);

    const zeroCard = h('div', { className: 'card' },
      h('div', { className: 'flex items-center justify-between mb-3' },
        h('div', { className: 'flex items-center gap-2' },
          h('i', { className: 'fas fa-magnifying-glass text-sky-500 text-sm' }),
          h('h3', { className: 'font-semibold text-gray-900 text-sm' }, 'Zero Result 검색어')
        ),
        h('a', {
          href: '#',
          className: 'text-xs text-indigo-600 hover:underline',
          onClick: (event) => {
            event.preventDefault();
            navigate('zero-results');
          }
        }, '전체 →')
      )
    );
    if ((stats.zero_result_queries_week || []).length === 0) {
      zeroCard.appendChild(h('p', { className: 'text-sm text-gray-400' }, '최근 7일 기준 누락 검색어가 없습니다.'));
    } else {
      stats.zero_result_queries_week.slice(0, 5).forEach((item) => {
        zeroCard.appendChild(h('div', { className: 'flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0' },
          h('div', { className: 'min-w-0' },
            h('div', { className: 'text-sm font-medium text-gray-800 truncate' }, item.query),
            h('div', { className: 'text-xs text-gray-400 mt-1' }, `${item.count || 1}회`)
          ),
          h('button', {
            className: 'text-xs font-medium text-indigo-600 hover:underline shrink-0',
            onClick: () => navigate('quick-input', { prefill: item.query })
          }, '+ 기록')
        ));
      });
    }
    right.appendChild(zeroCard);

    layout.appendChild(left);
    layout.appendChild(right);
    container.appendChild(layout);
    main.appendChild(container);
  } catch (error) {
    main.innerHTML = `<div class="p-6 text-red-500">대시보드를 불러오지 못했습니다: ${error.message}</div>`;
  }
}