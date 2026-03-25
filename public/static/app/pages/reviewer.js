import { api } from '../api.js';
import {
  CURRENT_USER,
  DBMS_LABELS,
  DBMS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS
} from '../state.js';
import { h, timeAgo, formatDate, showNotification } from '../utils.js';
import { navigate } from '../router.js';
import { kpiCard } from '../components/KpiCard.js';
import { queueRow, REVIEWER_STATUS } from '../components/QueueRow.js';
import { renderSqlList } from '../components/SqlList.js';

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

// Local component for detail sections
function detailSection(title, content) {
  const card = h('div', { className: 'bg-slate-50 border border-slate-100 rounded-lg p-5 mb-4 shadow-sm' },
    h('h3', { className: 'text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2' },
      h('span', { className: 'w-1 h-3 rounded-full bg-indigo-500' }),
      title
    ),
    h('div', { 
      className: 'text-[14px] leading-relaxed text-slate-700 whitespace-pre-wrap',
      innerHTML: content || '<span class="text-slate-400 italic">내용 없음</span>'
    })
  );
  return card;
}

function getQualityMeta(report) {
  const errors = (report?.issues || []).filter((issue) => issue.severity === 'error').length;
  const warnings = (report?.issues || []).filter((issue) => issue.severity === 'warning').length;

  if (errors > 0) {
    return {
      badgeClass: 'bg-rose-100 text-rose-700',
      panelClass: 'bg-rose-50 border border-rose-200 text-rose-900',
      iconClass: 'fas fa-triangle-exclamation text-rose-500',
      label: `AI Quality ${report.score}/100`,
      summary: `Fix recommended: ${errors} error, ${warnings} warning`
    };
  }

  if (warnings > 0) {
    return {
      badgeClass: 'bg-amber-100 text-amber-700',
      panelClass: 'bg-amber-50 border border-amber-200 text-amber-900',
      iconClass: 'fas fa-circle-exclamation text-amber-500',
      label: `AI Quality ${report.score}/100`,
      summary: `Review recommended: ${warnings} warning`
    };
  }

  return {
    badgeClass: 'bg-emerald-100 text-emerald-700',
    panelClass: 'bg-emerald-50 border border-emerald-200 text-emerald-900',
    iconClass: 'fas fa-circle-check text-emerald-500',
    label: `AI Quality ${report?.score || 100}/100`,
    summary: 'No quality issues detected'
  };
}

function qualityPanel(report) {
  if (!report) return null;

  const meta = getQualityMeta(report);
  const panel = h('div', { className: `${meta.panelClass} rounded-lg px-5 py-4 mb-6 shadow-sm` });
  panel.appendChild(h('div', { className: 'flex items-start gap-4' },
    h('i', { className: `${meta.iconClass} text-xl mt-0.5` }),
    h('div', { className: 'flex-1' },
      h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
        h('h3', { className: 'text-sm font-extrabold tracking-wide uppercase' }, 'AI Quality Check'),
        h('span', { className: `text-xs px-3 py-1 rounded-md font-bold ${meta.badgeClass}` }, meta.label)
      ),
      h('p', { className: 'text-sm font-medium mt-2' }, meta.summary)
    )
  ));

  if (Array.isArray(report.issues) && report.issues.length > 0) {
    const issueList = h('ul', { className: 'mt-4 space-y-2 text-[13px] leading-6' });
    report.issues.slice(0, 6).forEach((issue, index) => {
      issueList.appendChild(h('li', { className: 'flex items-start gap-2' },
        h('span', { className: 'mt-1 text-[10px] font-bold uppercase opacity-70' }, issue.severity),
        h('span', {}, `${index + 1}. ${issue.message}`)
      ));
    });
    panel.appendChild(issueList);
  }

  return panel;
}

function editSection(title, key, buffer) {
  const card = h('div', { className: 'bg-white border border-indigo-200 rounded-lg p-5 mb-4 shadow-sm ring-1 ring-indigo-50' },
    h('h3', { className: 'text-[12px] font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2' },
      h('i', { className: 'fas fa-pen text-[10px]' }),
      title
    )
  );
  const rows = key === 'action' ? '8' : key === 'version_range' ? '1' : '5';
  const textarea = h('textarea', {
    className: 'w-full p-3 text-[14px] leading-relaxed text-slate-900 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow',
    rows: rows
  });
  textarea.value = buffer[key] || '';
  textarea.addEventListener('input', (e) => {
    buffer[key] = e.target.value;
  });
  card.appendChild(textarea);
  return card;
}

let selectedId = null;
let activeTab = 'reviewed';
let isSidebarCollapsed = false;

function collapsibleRawInput(rawText) {
  let isExpanded = false;
  
  const contentDiv = h('div', { className: 'mt-3 whitespace-pre-wrap text-[14px] text-slate-700 leading-relaxed font-mono bg-slate-50 p-5 rounded-lg border border-slate-200 hidden' }, rawText || '내용 없음');
  
  const toggleBtn = h('button', {
    className: 'flex items-center justify-center w-full gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-600 text-[14px] font-bold rounded-lg transition-colors border border-slate-200 shadow-sm',
    onClick: () => {
      isExpanded = !isExpanded;
      if (isExpanded) {
        contentDiv.classList.remove('hidden');
        toggleBtn.innerHTML = '엔지니어 원본 닫기 <i class="fas fa-chevron-up ml-1"></i>';
      } else {
        contentDiv.classList.add('hidden');
        toggleBtn.innerHTML = '상세 원본 보기 (RAW INPUT) <i class="fas fa-chevron-down ml-1"></i>';
      }
    }
  });
  toggleBtn.innerHTML = '상세 원본 보기 (RAW INPUT) <i class="fas fa-chevron-down ml-1"></i>';
  
  return h('div', { className: 'mt-10 mb-2 border-t border-slate-200 pt-8' }, toggleBtn, contentDiv);
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

    const container = h('div', { className: 'p-8 flex flex-col h-full' });
    
    // Header
    container.appendChild(h('div', { className: 'flex items-start justify-between mb-8 shrink-0' },
      h('div', {},
        h('h1', { className: 'text-3xl font-extrabold text-slate-900 tracking-tight' }, 'Reviewer Dashboard'),
        h('p', { className: 'text-sm mt-2 text-slate-500 font-medium' }, '장애 지식 품질 검증 및 승인 마스터 패널')
      )
    ));

    // KPI Cards
    const kpis = [
      {
        label: '검토 대기',
        value: stats.reviewed_count || 0,
        sub: '현재 reviewed 상태',
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        icon: 'fa-clock'
      },
      {
        label: '오늘 승인',
        value: todayApprovedCount,
        sub: `이번 주 처리 ${stats.reviewer_activity_week || 0}건`,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        icon: 'fa-circle-check'
      },
      {
        label: 'AI 초안 승인율',
        value: `${stats.ai_approval_rate || 0}%`,
        sub: '목표 70% 이상',
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        icon: 'fa-robot'
      },
      {
        label: '재검토 필요',
        value: stats.needs_review_count || 0,
        sub: (stats.needs_review_count || 0) > 0 ? '즉시 확인 필요' : '현재 없음',
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        icon: 'fa-triangle-exclamation'
      }
    ];

    const kpiGrid = h('div', { className: 'grid grid-cols-4 gap-5 mb-8 shrink-0' });
    kpis.forEach((item) => kpiGrid.appendChild(kpiCard(item)));
    container.appendChild(kpiGrid);

    // Split Layout Container
    const splitLayout = h('div', { className: 'flex gap-6 flex-1 min-h-[600px] transition-all duration-300' });

    // Left Pane (List Area)
    const leftPane = h('div', { className: 'w-1/3 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300' });
    
    // Right Pane (Detail Area)
    const rightPane = h('div', { className: 'w-2/3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col relative overflow-hidden transition-all duration-300' });

    function updateLayout() {
      if (selectedId) {
        kpiGrid.style.display = 'none';
        splitLayout.classList.remove('max-h-[800px]');
      } else {
        kpiGrid.style.display = 'grid';
        splitLayout.classList.add('max-h-[800px]');
        isSidebarCollapsed = false;
      }

      if (isSidebarCollapsed) {
        leftPane.style.display = 'none';
        rightPane.className = 'w-full bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col relative overflow-hidden transition-all duration-300';
      } else {
        leftPane.style.display = 'flex';
        rightPane.className = 'w-2/3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col relative overflow-hidden transition-all duration-300';
      }
    }
    
    const tabs = [
      { id: 'reviewed', label: `대기 (${reviewed.total})`, items: reviewed.items },
      { id: 'needs_review', label: `재검토 (${needsReview.total})`, items: needsReview.items },
      { id: 'all', label: `전체 (${allItems.total})`, items: allItems.items }
    ];

    const tabsContainer = h('div', { className: 'flex flex-wrap border-b border-slate-200 bg-slate-50 shrink-0 px-2 pt-2' });
    const listContainer = h('div', { className: 'flex-1 overflow-y-auto p-4 space-y-3' });

    function renderList() {
      tabsContainer.innerHTML = '';
      tabs.forEach((tab) => {
        const isActive = activeTab === tab.id;
        tabsContainer.appendChild(h('button', {
          className: `flex-1 py-3 text-[13px] font-bold uppercase tracking-wider border-b-2 transition-colors ${isActive ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`,
          onClick: () => {
            activeTab = tab.id;
            selectedId = null; // Tab 변경 시 선택 항목 포맷
            updateLayout();
            renderList();
            renderRightPane();
          }
        }, tab.label));
      });

      const currentItems = tabs.find((tab) => tab.id === activeTab)?.items || [];
      listContainer.innerHTML = '';

      if (activeTab === 'reviewed' && currentItems.length > 0) {
        listContainer.appendChild(h('button', {
          className: 'w-full py-2.5 mb-3 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors flex justify-center items-center gap-2',
          onClick: async () => {
            const ids = currentItems.filter((item) => item.version_range).map((item) => item.id);
            if (!ids.length) {
              showNotification('버전 범위가 기입된 승인 대기 항목이 없습니다', 'warning');
              return;
            }
            try {
              const result = await api('POST', '/api/knowledge/bulk-approve', { ids, user_id: CURRENT_USER.id });
              const successCount = result.results.filter((item) => item.success).length;
              showNotification(`${successCount}건을 안정적으로 일괄 승인했습니다.`, 'success');
              await renderReviewer();
            } catch (err) {
              showNotification('일괄 승인 실패: ' + err.message, 'error');
            }
          }
        }, h('i', { className: 'fas fa-check-double' }), '검증 완료 항목 일괄 승인'));
      }

      if (!currentItems.length) {
        listContainer.appendChild(h('div', { className: 'text-center py-16 text-slate-400' },
          h('i', { className: 'fas fa-inbox text-5xl mb-4 text-slate-200' }),
          h('p', { className: 'text-sm font-medium' }, '표시할 항목이 없습니다.')
        ));
      } else {
        currentItems.forEach((item) => {
          const row = queueRow(item, async (id) => {
            selectedId = id;
            updateLayout();
            renderList();
            renderRightPane();
          });
          
          if (item.id === selectedId) {
            row.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50/50');
          }
          listContainer.appendChild(row);
        });
      }
    }

    leftPane.appendChild(tabsContainer);
    leftPane.appendChild(listContainer);
    splitLayout.appendChild(leftPane);
    
    async function renderRightPane() {
      rightPane.innerHTML = '';

      if (!selectedId) {
        rightPane.appendChild(h('div', { className: 'flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center' },
          h('div', { className: 'w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-inner' },
            h('i', { className: 'fas fa-file-contract text-4xl text-slate-300' })
          ),
          h('h2', { className: 'text-xl font-bold text-slate-600 mb-2' }, '항목을 선택하세요'),
          h('p', { className: 'text-[15px] max-w-sm' }, '좌측 대기열에서 검토할 항목을 클릭하면, 엔지니어의 원본 데이터와 AI가 구조화한 조치 내역을 상세히 비교 및 승인할 수 있습니다.')
        ));
        return;
      }

      rightPane.innerHTML = '<div class="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 backdrop-blur-sm"><i class="fas fa-circle-notch fa-spin text-4xl text-indigo-500 mb-4"></i><p class="text-indigo-900 font-medium shadow-sm">데이터 로딩 중...</p></div>';

      try {
        const entry = await api('GET', `/api/knowledge/${selectedId}`);
        const status = REVIEWER_STATUS[entry.status] || REVIEWER_STATUS.raw_input;
        rightPane.innerHTML = '';

        let isEditing = false;
        let editBuffer = {
          symptom: entry.symptom || '',
          cause: entry.cause || '',
          error_log: entry.error_log || '',
          action: entry.action || '',
          version_range: entry.version_range || ''
        };

        const contentArea = h('div', { className: 'flex-1 overflow-y-auto p-8 bg-white' });
        const footer = h('div', { className: 'shrink-0 px-8 py-5 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]' });

        function repaintDetail() {
          contentArea.innerHTML = '';
          footer.innerHTML = '';

          // Detail Header
          const headerRow = h('div', { className: 'flex items-center justify-between mb-4' });
          const badgesContainer = h('div', { className: 'flex items-center gap-3 flex-wrap' },
            h('span', { className: `text-xs px-3 py-1 rounded-md font-bold uppercase tracking-wider shadow-sm ${DBMS_COLORS[entry.dbms] || 'bg-slate-100 text-slate-600'}` }, DBMS_LABELS[entry.dbms] || entry.dbms || '미상 DBMS'),
            h('span', { className: `text-xs px-3 py-1 rounded-md font-bold uppercase tracking-wider shadow-sm ${PRIORITY_COLORS[entry.priority] || 'bg-slate-100 text-slate-600'}` }, PRIORITY_LABELS[entry.priority] || entry.priority || 'P2'),
            h('span', { className: `text-xs px-3 py-1 rounded-md font-bold shadow-sm ${status.className}` }, status.label)
          );

          if (entry.quality_report) {
            const qualityMeta = getQualityMeta(entry.quality_report);
            badgesContainer.appendChild(
              h('span', { className: `text-xs px-3 py-1 rounded-md font-bold shadow-sm ${qualityMeta.badgeClass}` }, qualityMeta.label)
            );
          }

          const toggleBtn = h('button', {
            className: 'px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm border border-slate-200',
            onClick: () => {
              isSidebarCollapsed = !isSidebarCollapsed;
              updateLayout();
              toggleBtn.innerHTML = isSidebarCollapsed ? '<i class="fas fa-list"></i> 리스트 열기' : '<i class="fas fa-expand"></i> 크게 보기';
            }
          });
          toggleBtn.innerHTML = isSidebarCollapsed ? '<i class="fas fa-list"></i> 리스트 열기' : '<i class="fas fa-expand"></i> 크게 보기';

          headerRow.appendChild(badgesContainer);
          headerRow.appendChild(toggleBtn);

          contentArea.appendChild(h('div', { className: 'mb-8 border-b border-slate-200 pb-6' },
            headerRow,
            h('h2', { className: 'text-3xl font-extrabold text-slate-900 tracking-tight leading-snug mb-3' }, entry.title || '제목 없음'),
            h('div', { className: 'flex justify-between items-center text-sm font-medium text-slate-500' },
              h('div', { className: 'flex gap-3' },
                h('span', {}, h('i', { className: 'fa-regular fa-square-plus mr-1.5' }), `등록자: ${entry.creator_name || 'System'}`),
                h('span', {}, '\u00B7'),
                h('span', {}, h('i', { className: 'fa-regular fa-clock mr-1.5' }), `업데이트: ${timeAgo(entry.updated_at)}`)
              ),
              h('span', { className: 'text-slate-400 font-bold tracking-wide bg-slate-100 px-3 py-1 rounded-md' }, entry.incident_number || '-')
            )
          ));

          if (entry.quality_report) {
            contentArea.appendChild(qualityPanel(entry.quality_report));
          }

          if (!entry.version_range && entry.status !== 'approved' && !isEditing) {
            contentArea.appendChild(h('div', { className: 'bg-orange-50 border border-orange-200 rounded-lg px-5 py-4 mb-6 text-[15px] font-medium text-orange-700 flex items-center gap-4 shadow-sm' },
              h('i', { className: 'fas fa-triangle-exclamation text-orange-500 text-2xl' }),
              '경고: 버전 범위(Version Range)가 누락되어 있습니다. 초안 수정을 눌러 버전을 지시해야 최종 승인할 수 있습니다.'
            ));
          }

          // Detail Sections
          if (isEditing) {
            contentArea.appendChild(h('div', { className: 'mb-4 p-4 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg flex items-center gap-3' }, 
              h('i', { className: 'fas fa-pen-fancy text-xl' }),
              '초안 편집 모드: 기술된 내용을 전문가의 시각으로 직접 보완해주세요.'
            ));
            contentArea.appendChild(editSection('초안 증상 (Symptom)', 'symptom', editBuffer));
            contentArea.appendChild(editSection('근본 원인 (Cause)', 'cause', editBuffer));
            contentArea.appendChild(editSection('에러 로그 (Error Log)', 'error_log', editBuffer));
            contentArea.appendChild(editSection('대응 조치 및 방안 (Action)', 'action', editBuffer));
            contentArea.appendChild(editSection('적용 버전 (Version Range)', 'version_range', editBuffer));
            
            if (entry.raw_input) {
              contentArea.appendChild(collapsibleRawInput(entry.raw_input));
            }
          } else {
            contentArea.appendChild(detailSection('초안 증상 (Symptom)', entry.symptom));
            contentArea.appendChild(detailSection('근본 원인 (Cause)', entry.cause));
            if (entry.error_log) {
              contentArea.appendChild(detailSection('에러 로그 (Error Log)', entry.error_log));
            }
            contentArea.appendChild(detailSection('대응 조치 및 방안 (Action)', entry.action));
            contentArea.appendChild(detailSection('적용 버전 (Version Range)', entry.version_range || '[미지정]'));

            contentArea.appendChild(
              Array.isArray(entry.runbook) && entry.runbook.length > 0
                ? renderSqlList('Runbook', entry.runbook)
                : detailSection('Runbook', '[미지정]')
            );
            contentArea.appendChild(
              Array.isArray(entry.diagnostic_steps) && entry.diagnostic_steps.length > 0
                ? renderSqlList('Diagnostic Steps', entry.diagnostic_steps)
                : detailSection('Diagnostic Steps', '[미지정]')
            );

            if (entry.raw_input) {
              contentArea.appendChild(collapsibleRawInput(entry.raw_input));
            }

            // Activity Logs (Only show when not editing relative to avoid clutter)
            if (entry.activity_logs?.length > 0) {
              const logSection = h('div', { className: 'mt-10 border-t border-slate-200 pt-8' });
              logSection.appendChild(h('h3', { className: 'text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-5' }, '레코드 감사 로그 (Audit Trail)'));
              const logList = h('ul', { className: 'space-y-4' });
              entry.activity_logs.slice(0, 7).forEach((log) => {
                logList.appendChild(h('li', { className: 'flex items-start gap-4 text-sm' },
                  h('div', { className: 'mt-1.5 w-2 h-2 rounded-full ring-4 ring-indigo-50 bg-indigo-500' }),
                  h('div', { className: 'bg-slate-50 border border-slate-100 rounded-md px-3 py-2 flex-1' },
                    h('p', { className: 'font-semibold text-slate-700 uppercase tracking-wide text-xs' }, `${log.user_name || 'System'}`),
                    h('p', { className: 'text-slate-600 mt-1 font-medium' }, log.action),
                    h('p', { className: 'text-[11px] text-slate-400 mt-1' }, formatDate(log.created_at))
                  )
                ));
              });
              logSection.appendChild(logList);
              contentArea.appendChild(logSection);
            }
          }

          // Sticky Footer Rendering
          const leftActions = h('div', { className: 'flex gap-3' });
          const rightActions = h('div', { className: 'flex gap-3' });
          
          if (isEditing) {
            footer.className = 'shrink-0 px-8 py-4 bg-indigo-50 border-t border-indigo-200 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(79,70,229,0.1)]';
            leftActions.appendChild(h('button', {
              className: 'px-5 py-2.5 bg-white border border-slate-300 text-slate-600 text-[14px] font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm',
              onClick: () => {
                isEditing = false;
                repaintDetail();
              }
            }, '수정 취소'));

            rightActions.appendChild(h('button', {
              className: 'px-8 py-2.5 bg-indigo-600 text-white text-[14px] font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2',
              onClick: async () => {
                const saveBtn = rightActions.lastChild;
                const originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';
                saveBtn.disabled = true;
                
                try {
                  await api('PATCH', `/api/knowledge/${selectedId}`, editBuffer);
                  showNotification('초안이 성공적으로 수정되었습니다.', 'success');
                  isEditing = false;
                  // Refresh specific entry
                  await renderRightPane();
                } catch (err) {
                  showNotification('수정 실패: ' + err.message, 'error');
                } finally {
                  saveBtn.innerHTML = originalText;
                  saveBtn.disabled = false;
                }
              }
            }, h('i', { className: 'fas fa-save' }), '변경사항 저장'));
          } else {
            footer.className = 'shrink-0 px-8 py-5 bg-white border-t border-slate-200 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]';
            
            // Edit Draft Button
            leftActions.appendChild(h('button', {
              className: 'px-5 py-2.5 bg-slate-100 border border-slate-200 text-slate-700 text-[14px] font-bold rounded-lg hover:bg-slate-200 transition-colors shadow-sm focus:ring-2 focus:ring-slate-300 flex items-center gap-2',
              onClick: () => {
                isEditing = true;
                repaintDetail();
              }
            }, h('i', { className: 'fas fa-pen-to-square text-indigo-500' }), '초안 수정'));

            if (entry.status !== 'approved') {
              rightActions.appendChild(h('button', {
                className: 'px-6 py-2.5 bg-white border border-rose-200 text-rose-600 text-[14px] font-bold rounded-lg hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-sm flex items-center gap-2',
                onClick: async () => {
                  const reason = prompt('검토 반려 사유를 입력하세요 (엔지니어에게 전달됩니다)');
                  if (!reason) return;
                  await api('POST', `/api/knowledge/${selectedId}/reject`, { user_id: CURRENT_USER.id, reason });
                  showNotification('해당 초안을 성공적으로 반려했습니다', 'info');
                  selectedId = null;
                  await renderReviewer();
                }
              }, h('i', { className: 'fas fa-arrow-rotate-left' }), '초안 반려'));

              rightActions.appendChild(h('button', {
                className: `px-8 py-2.5 text-white text-[14px] font-extrabold rounded-lg shadow-md flex items-center gap-2 transition-all ${!entry.version_range ? 'bg-emerald-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5'}`,
                disabled: !entry.version_range,
                onClick: async () => {
                  const saveBtn = rightActions.lastChild;
                  const originalText = saveBtn.innerHTML;
                  if (!entry.version_range) return;
                  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 승인 중...';
                  saveBtn.disabled = true;
                  try {
                    await api('POST', `/api/knowledge/${selectedId}/approve`, { user_id: CURRENT_USER.id });
                    showNotification('RockECHO 지식 베이스에 정식 등재 완료! 🎉', 'success');
                    selectedId = null;
                    await renderReviewer();
                  } catch (err) {
                    showNotification('에러: 승인 처리 중 문제가 발생했습니다 - ' + err.message, 'error');
                  } finally {
                    if (document.body.contains(saveBtn)) {
                      saveBtn.innerHTML = originalText;
                      saveBtn.disabled = false;
                    }
                  }
                }
              }, h('i', { className: 'fas fa-check-circle text-lg' }), '최종 승인 및 배포'));
            }
          }

          footer.appendChild(leftActions);
          footer.appendChild(rightActions);
        }

        // Initial Paint
        rightPane.appendChild(contentArea);
        rightPane.appendChild(footer);
        repaintDetail();

      } catch (err) {
        rightPane.innerHTML = `<div class="p-8 text-rose-600 font-bold bg-rose-50 m-8 rounded-lg border border-rose-200"><i class="fas fa-triangle-exclamation mr-2 text-xl"></i> 서버 통신 중 상세 내역을 불러오지 못했습니다: <br/><span class="font-normal mt-2 block">${err.message}</span></div>`;
      }
    }

    updateLayout();
    renderList();
    renderRightPane();

    splitLayout.appendChild(rightPane);
    container.appendChild(splitLayout);
    main.appendChild(container);

  } catch (error) {
    main.innerHTML = `<div class="p-8 text-rose-600 text-center mt-10 bg-rose-50 border border-rose-200 rounded-xl mx-8 max-w-2xl"><i class="fas fa-circle-xmark text-5xl mb-5 text-rose-400"></i><p class="font-bold text-lg">Reviewer Dashboard 로드 치명적 실패</p><p class="mt-2 text-rose-500">${error.message}</p></div>`;
  }
}
