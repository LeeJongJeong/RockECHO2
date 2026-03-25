import { api } from '../api.js';
import { CURRENT_USER, DBMS_LABELS } from '../state.js';
import { h, showNotification, parseTags } from '../utils.js';
import { navigate } from '../router.js';
import { fieldLabel } from '../components/FieldLabel.js';
import { stepIndicator } from '../components/StepIndicator.js';

const STEP_LABELS = ['Raw Input', 'AI 초안 생성', '검토+수정', 'Reviewer 승인', '완료'];

const PRIORITY_OPTIONS = {
  p1: {
    label: 'P1',
    description: '서비스 중단',
    activeClass: 'border-red-400 bg-red-50 text-red-600'
  },
  p2: {
    label: 'P2',
    description: '성능 저하',
    activeClass: 'border-amber-400 bg-amber-50 text-amber-600'
  },
  p3: {
    label: 'P3',
    description: '경고 수준',
    activeClass: 'border-slate-400 bg-slate-50 text-slate-700'
  }
};



export function renderQuickInput(prefill = '') {
  const main = document.querySelector('.main-content');
  main.innerHTML = '';

  let currentStep = 1;
  let incidentData = { dbms: '', dbms_version: '', priority: 'p2', raw_input: prefill || '' };
  let createdIncidentId = null;
  let knowledgeEntry = null;

  const container = h('div', { className: 'p-6 max-w-5xl' });
  const stepIndicatorEl = h('div', { className: 'mb-8' });
  const content = h('div', { id: 'step-content' });

  container.appendChild(h('div', { className: 'mb-6' },
    h('h1', { className: 'text-2xl font-bold text-gray-900' }, '장애 기록하기'),
    h('p', { className: 'text-sm text-gray-400 mt-1' }, 'RockECHO AI가 구조화를 도와드립니다 — 최소 입력으로 지식을 축적하세요')
  ));
  container.appendChild(stepIndicatorEl);
  container.appendChild(content);
  main.appendChild(container);

  function renderStepIndicator() {
    stepIndicatorEl.innerHTML = '';
    stepIndicatorEl.appendChild(stepIndicator(STEP_LABELS, currentStep));
  }

  function renderStep() {
    renderStepIndicator();
    content.innerHTML = '';
    if (currentStep === 1) renderStepOne();
    else if (currentStep === 2) renderStepTwo();
    else if (currentStep === 3) renderStepThree();
    else if (currentStep === 4) renderStepFour();
    else renderStepFive();
  }

  function renderStepOne() {
    const card = h('div', { className: 'card' });
    card.appendChild(h('h2', { className: 'text-xl font-semibold text-gray-900 mb-6' }, '① DBMS 선택 및 장애 내용 입력'));

    card.appendChild(fieldLabel('DBMS 선택 *'));
    const dbmsGrid = h('div', { className: 'grid grid-cols-4 gap-2 mb-5' });
    Object.entries(DBMS_LABELS).forEach(([value, label]) => {
      const active = incidentData.dbms === value;
      dbmsGrid.appendChild(h('button', {
        className: `h-10 border rounded-lg text-sm font-medium transition-all ${active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-700 hover:border-indigo-200 hover:text-indigo-600'}`,
        onClick: () => {
          incidentData.dbms = value;
          renderStep();
        }
      }, label));
    });
    card.appendChild(dbmsGrid);

    card.appendChild(fieldLabel('우선순위'));
    const priorityRow = h('div', { className: 'grid grid-cols-3 gap-3 mb-5' });
    Object.entries(PRIORITY_OPTIONS).forEach(([value, option]) => {
      const active = incidentData.priority === value;
      priorityRow.appendChild(h('button', {
        className: `rounded-xl border-2 px-4 py-3 transition-all text-center ${active ? option.activeClass : 'border-gray-200 text-gray-600 hover:border-gray-300'}`,
        onClick: () => {
          incidentData.priority = value;
          renderStep();
        }
      },
        h('div', { className: 'text-xl font-bold leading-none' }, option.label),
        h('div', { className: 'text-sm mt-1' }, option.description)
      ));
    });
    card.appendChild(priorityRow);

    card.appendChild(fieldLabel('DBMS 버전 (선택)'));
    const versionInput = h('input', {
      type: 'text',
      className: 'input-field mb-5',
      placeholder: '예: PostgreSQL 15.2, MySQL 8.0.32',
      value: incidentData.dbms_version
    });
    versionInput.addEventListener('input', (event) => {
      incidentData.dbms_version = event.target.value;
    });
    card.appendChild(versionInput);

    card.appendChild(fieldLabel('장애 내용 입력 *', '에러 로그, SQL, 증상 무엇이든'));
    card.appendChild(h('div', { className: 'mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-start gap-2' },
      h('i', { className: 'fas fa-lightbulb mt-0.5 text-xs' }),
      h('span', {}, '에러 로그, SQL 결과, 조치 내용 등 raw 텍스트 자유 입력. RockECHO AI가 구조화합니다.')
    ));

    const rawInput = h('textarea', {
      className: 'input-field',
      rows: '9',
      placeholder: '예시:\npg_stat_user_tables에서 n_dead_tup이 5,234,891건 발생\nautovacuum: found orphan temp table "pg_temp_3"."tt_work_123" in database\nlast_autovacuum: 2025-03-01 (3일 전)\nVACUUM VERBOSE 실행 후 해결됨'
    });
    rawInput.value = incidentData.raw_input;
    rawInput.addEventListener('input', (event) => {
      incidentData.raw_input = event.target.value;
    });
    card.appendChild(rawInput);

    card.appendChild(h('div', { className: 'flex justify-end gap-3 mt-6' },
      h('button', { className: 'btn-secondary', onClick: () => navigate('dashboard') }, '취소'),
      h('button', {
        className: 'btn-primary flex items-center gap-2',
        onClick: async () => {
          if (!incidentData.dbms) {
            showNotification('DBMS를 먼저 선택해 주세요', 'error');
            return;
          }
          if (!incidentData.raw_input.trim()) {
            showNotification('장애 내용을 입력해 주세요', 'error');
            return;
          }

          try {
            const result = await api('POST', '/api/incidents', {
              dbms: incidentData.dbms,
              dbms_version: incidentData.dbms_version,
              priority: incidentData.priority,
              raw_input: incidentData.raw_input,
              created_by: CURRENT_USER.id
            });
            createdIncidentId = result.id;
            incidentData.incident_number = result.incident_number;
            currentStep = 2;
            renderStep();
          } catch (error) {
            showNotification(error.message, 'error');
          }
        }
      },
        h('i', { className: 'fas fa-arrow-right' }),
        'AI 초안 생성'
      )
    ));

    content.appendChild(card);
  }

  async function renderStepTwo() {
    const card = h('div', { className: 'card text-center py-10' },
      h('div', { className: 'w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4' },
        h('i', { className: 'fas fa-robot text-purple-600 text-2xl fa-spin' })
      ),
      h('h2', { className: 'text-lg font-semibold text-gray-900 mb-2' }, 'AI 초안을 생성하는 중입니다'),
      h('p', { className: 'text-sm text-gray-400' }, '입력한 장애 내용을 구조화해서 검토 가능한 초안으로 정리합니다.')
    );
    content.appendChild(card);

    try {
      knowledgeEntry = await api('POST', '/api/ai/generate', {
        incident_id: createdIncidentId,
        raw_input: incidentData.raw_input,
        dbms: incidentData.dbms,
        user_id: CURRENT_USER.id
      });
      currentStep = 3;
      renderStep();
    } catch (error) {
      card.innerHTML = '';
      card.appendChild(h('div', { className: 'text-center py-8' },
        h('i', { className: 'fas fa-exclamation-triangle text-red-500 text-3xl mb-3' }),
        h('p', { className: 'text-red-600' }, `AI 초안 생성에 실패했습니다: ${error.message}`),
        h('button', { className: 'btn-primary mt-3', onClick: renderStepTwo }, '다시 시도')
      ));
    }
  }

  function renderStepThree() {
    if (!knowledgeEntry) return;
    const card = h('div', { className: 'card' });
    card.appendChild(h('div', { className: 'mb-5' },
      h('h2', { className: 'text-xl font-semibold text-gray-900' }, '③ AI 초안 검토 및 수정'),
      h('p', { className: 'text-xs text-gray-400 mt-1' }, `${incidentData.incident_number || '-'} · AI 품질 ${Math.round((knowledgeEntry.ai_quality_score || 0.6) * 100)}%`)
    ));

    // Read-only Raw Input for reference
    card.appendChild(h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '엔지니어 원본 (Raw Input) - 참고용'));
    const rawInputDisplay = h('textarea', { className: 'input-field mb-5 bg-gray-50 text-gray-500 cursor-not-allowed', rows: '4', readOnly: true });
    rawInputDisplay.value = incidentData.raw_input || '';
    card.appendChild(rawInputDisplay);

    const fields = [
      ['title', '제목', 'input'],
      ['symptom', '증상', 'textarea'],
      ['cause', '원인', 'textarea'],
      ['action', '조치', 'textarea'],
      ['version_range', '적용 버전 범위', 'input']
    ];

    fields.forEach(([key, label, type]) => {
      card.appendChild(h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, label));
      const textareaRows = key === 'action' ? '7' : '4';
      const element = type === 'input'
        ? h('input', { type: 'text', className: 'input-field mb-4', value: knowledgeEntry[key] || '' })
        : h('textarea', { className: 'input-field mb-4', rows: textareaRows });
      if (type === 'textarea') {
        element.value = knowledgeEntry[key] || '';
      }
      element.addEventListener('input', (event) => {
        knowledgeEntry[key] = event.target.value;
      });
      card.appendChild(element);
    });

    card.appendChild(h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, '태그 (쉼표로 구분)'));
    const tagsInput = h('input', {
      type: 'text',
      className: 'input-field mb-4',
      value: Array.isArray(knowledgeEntry.tags) ? knowledgeEntry.tags.join(', ') : ''
    });
    tagsInput.addEventListener('input', (event) => {
      knowledgeEntry.tags = parseTags(event.target.value);
    });
    card.appendChild(tagsInput);

    async function persistDraft(status) {
      return api('PATCH', `/api/knowledge/${knowledgeEntry.id}`, {
        title: knowledgeEntry.title,
        symptom: knowledgeEntry.symptom,
        cause: knowledgeEntry.cause,
        action: knowledgeEntry.action,
        version_range: knowledgeEntry.version_range,
        tags: knowledgeEntry.tags,
        status,
        user_id: CURRENT_USER.id
      });
    }

    const actions = h('div', { className: 'flex gap-3 mt-6 flex-wrap' });
    actions.appendChild(h('button', {
      className: 'btn-secondary text-sm',
      onClick: async () => {
        await persistDraft('ai_generated');
        showNotification('초안을 저장했습니다', 'success');
        navigate('dashboard');
      }
    }, '임시 저장'));

    actions.appendChild(h('button', {
      className: 'btn-primary text-sm flex items-center gap-2',
      onClick: async () => {
        await persistDraft('reviewed');
        showNotification('Reviewer 검토 대기로 전달했습니다', 'success');
        currentStep = 4;
        renderStep();
      }
    }, h('i', { className: 'fas fa-paper-plane' }), 'Reviewer에 전달'));

    if (['senior_engineer', 'reviewer', 'admin'].includes(CURRENT_USER.role)) {
      actions.appendChild(h('button', {
        className: 'btn-success text-sm flex items-center gap-2',
        onClick: async () => {
          if (!knowledgeEntry.version_range) {
            showNotification('승인 전에는 적용 버전 범위가 필요합니다', 'error');
            return;
          }
          await api('PATCH', `/api/knowledge/${knowledgeEntry.id}`, {
            title: knowledgeEntry.title,
            symptom: knowledgeEntry.symptom,
            cause: knowledgeEntry.cause,
            cause_confidence: 'confirmed',
            action: knowledgeEntry.action,
            version_range: knowledgeEntry.version_range,
            tags: knowledgeEntry.tags,
            user_id: CURRENT_USER.id
          });
          await api('POST', `/api/knowledge/${knowledgeEntry.id}/approve`, { user_id: CURRENT_USER.id });
          showNotification('즉시 승인 처리했습니다', 'success');
          currentStep = 5;
          renderStep();
        }
      }, h('i', { className: 'fas fa-check-double' }), '즉시 승인'));
    }

    card.appendChild(actions);
    content.appendChild(card);
  }

  function renderStepFour() {
    const card = h('div', { className: 'card text-center py-8' },
      h('div', { className: 'w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4' },
        h('i', { className: 'fas fa-clock text-blue-600 text-2xl' })
      ),
      h('h2', { className: 'text-lg font-semibold text-gray-900 mb-2' }, 'Reviewer 승인 대기'),
      h('p', { className: 'text-sm text-gray-500 mb-4' }, '초안이 Reviewer 큐에 등록되었습니다. 승인 또는 반려는 Reviewer 메뉴에서 처리할 수 있습니다.'),
      h('button', { className: 'btn-primary', onClick: () => navigate('reviewer') }, 'Reviewer 화면 열기')
    );
    content.appendChild(card);
  }

  function renderStepFive() {
    const card = h('div', { className: 'card text-center py-8' },
      h('div', { className: 'w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4' },
        h('i', { className: 'fas fa-check-circle text-green-600 text-2xl' })
      ),
      h('h2', { className: 'text-lg font-semibold text-gray-900 mb-2' }, '완료'),
      h('p', { className: 'text-sm text-gray-500 mb-4' }, '이번 장애 내용이 재사용 가능한 운영 지식으로 저장되었습니다.'),
      h('div', { className: 'flex gap-3 justify-center' },
        h('button', { className: 'btn-secondary', onClick: () => navigate('dashboard') }, '대시보드'),
        h('button', { className: 'btn-primary', onClick: () => navigate('search') }, '장애 검색으로 이동')
      )
    );
    content.appendChild(card);
  }

  renderStep();
}
