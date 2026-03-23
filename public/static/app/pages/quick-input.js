import { api } from '../api.js';
import { CURRENT_USER, DBMS_LABELS, PRIORITY_COLORS } from '../state.js';
import { h, showNotification } from '../utils.js';
import { navigate } from '../router.js';

const PRIORITY_OPTIONS = {
  p1: { label: 'P1', description: 'Service impact' },
  p2: { label: 'P2', description: 'Performance or error risk' },
  p3: { label: 'P3', description: 'Warning or investigation' }
};

function parseTags(value) {
  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

export function renderQuickInput(prefill = '') {
  const main = document.querySelector('.main-content');
  main.innerHTML = '';

  let currentStep = 1;
  let incidentData = { dbms: '', dbms_version: '', priority: 'p2', raw_input: prefill || '' };
  let createdIncidentId = null;
  let knowledgeEntry = null;

  const container = h('div', { className: 'p-6 max-w-4xl' });
  const stepIndicator = h('div', { className: 'mb-6' });
  const content = h('div', { id: 'step-content' });

  container.appendChild(h('div', { className: 'mb-6' },
    h('h1', { className: 'text-2xl font-bold text-gray-900' }, 'Quick Input'),
    h('p', { className: 'text-sm text-gray-400 mt-1' }, 'Capture a raw incident, generate an AI draft, refine it, and hand it to review.')
  ));
  container.appendChild(stepIndicator);
  container.appendChild(content);
  main.appendChild(container);

  function renderStepIndicator() {
    const labels = ['Raw Input', 'AI Draft', 'Edit Draft', 'Review Queue', 'Complete'];
    stepIndicator.innerHTML = '';
    const wrap = h('div', { className: 'step-indicator' });
    labels.forEach((label, index) => {
      const stepNumber = index + 1;
      const status = stepNumber < currentStep ? 'step-done' : stepNumber === currentStep ? 'step-active' : 'step-pending';
      wrap.appendChild(h('div', { className: `step-item ${status}` },
        h('div', { className: 'step-circle' }, stepNumber < currentStep ? h('i', { className: 'fas fa-check' }) : String(stepNumber)),
        h('p', { className: `text-xs mt-1 font-medium ${stepNumber === currentStep ? 'text-indigo-600' : stepNumber < currentStep ? 'text-green-600' : 'text-gray-400'}` }, label)
      ));
      if (stepNumber < labels.length) {
        wrap.appendChild(h('div', { className: `step-line ${stepNumber < currentStep ? 'step-done' : 'step-pending'}`, style: 'height:2px; flex:1; margin-bottom:16px' }));
      }
    });
    stepIndicator.appendChild(wrap);
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
    card.appendChild(h('h2', { className: 'font-semibold text-gray-900 mb-4' }, 'Describe the incident'));

    card.appendChild(h('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'DBMS *'));
    const dbmsGrid = h('div', { className: 'grid grid-cols-4 gap-2 mb-4' });
    Object.entries(DBMS_LABELS).forEach(([value, label]) => {
      dbmsGrid.appendChild(h('button', {
        className: `p-2 border-2 rounded-lg text-xs font-medium transition-all text-center ${incidentData.dbms === value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-indigo-200'}`,
        onClick: () => {
          incidentData.dbms = value;
          renderStep();
        }
      }, label));
    });
    card.appendChild(dbmsGrid);

    card.appendChild(h('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Priority'));
    const priorityRow = h('div', { className: 'flex gap-2 mb-4' });
    Object.entries(PRIORITY_OPTIONS).forEach(([value, option]) => {
      priorityRow.appendChild(h('button', {
        className: `flex-1 p-2 border-2 rounded-lg transition-all ${incidentData.priority === value ? `border-current ${PRIORITY_COLORS[value]}` : 'border-gray-200 text-gray-600'}`,
        onClick: () => {
          incidentData.priority = value;
          renderStep();
        }
      },
        h('div', { className: 'text-sm font-bold' }, option.label),
        h('div', { className: 'text-xs' }, option.description)
      ));
    });
    card.appendChild(priorityRow);

    card.appendChild(h('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'DBMS Version'));
    const versionInput = h('input', {
      type: 'text',
      className: 'input-field mb-4',
      placeholder: 'PostgreSQL 15.2, MySQL 8.0.32, MongoDB 7.0...',
      value: incidentData.dbms_version
    });
    versionInput.addEventListener('input', (event) => {
      incidentData.dbms_version = event.target.value;
    });
    card.appendChild(versionInput);

    card.appendChild(h('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Raw input *'));
    const rawInput = h('textarea', {
      className: 'input-field',
      rows: '10',
      placeholder: 'Paste logs, SQL, metrics, or a short description of what happened.'
    });
    rawInput.value = incidentData.raw_input;
    rawInput.addEventListener('input', (event) => {
      incidentData.raw_input = event.target.value;
    });
    card.appendChild(rawInput);

    card.appendChild(h('div', { className: 'flex justify-end gap-3 mt-4' },
      h('button', { className: 'btn-secondary', onClick: () => navigate('dashboard') }, 'Cancel'),
      h('button', {
        className: 'btn-primary flex items-center gap-2',
        onClick: async () => {
          if (!incidentData.dbms) {
            showNotification('Select a DBMS first', 'error');
            return;
          }
          if (!incidentData.raw_input.trim()) {
            showNotification('Enter raw incident details', 'error');
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
      }, h('i', { className: 'fas fa-arrow-right' }), 'Generate AI draft')
    ));

    content.appendChild(card);
  }

  async function renderStepTwo() {
    const card = h('div', { className: 'card text-center py-10' },
      h('div', { className: 'w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4' },
        h('i', { className: 'fas fa-robot text-purple-600 text-2xl fa-spin' })
      ),
      h('h2', { className: 'text-lg font-semibold text-gray-900 mb-2' }, 'Generating AI draft'),
      h('p', { className: 'text-sm text-gray-400' }, 'The draft will be stored as ai_generated and can be refined before review.')
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
        h('p', { className: 'text-red-600' }, `AI generation failed: ${error.message}`),
        h('button', { className: 'btn-primary mt-3', onClick: renderStepTwo }, 'Retry')
      ));
    }
  }

  function renderStepThree() {
    if (!knowledgeEntry) return;
    const card = h('div', { className: 'card' });
    card.appendChild(h('div', { className: 'mb-4' },
      h('h2', { className: 'font-semibold text-gray-900' }, 'Refine the draft'),
      h('p', { className: 'text-xs text-gray-400 mt-1' }, `${incidentData.incident_number || '-'} - AI quality ${Math.round((knowledgeEntry.ai_quality_score || 0.6) * 100)}%`)
    ));

    const fields = [
      ['title', 'Title', 'input'],
      ['symptom', 'Symptom', 'textarea'],
      ['cause', 'Cause', 'textarea'],
      ['action', 'Action', 'textarea'],
      ['version_range', 'Version Range', 'input']
    ];

    fields.forEach(([key, label, type]) => {
      card.appendChild(h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, label));
      const element = type === 'input'
        ? h('input', { type: 'text', className: 'input-field mb-4', value: knowledgeEntry[key] || '' })
        : h('textarea', { className: 'input-field mb-4', rows: '4' });
      if (type === 'textarea') {
        element.value = knowledgeEntry[key] || '';
      }
      element.addEventListener('input', (event) => {
        knowledgeEntry[key] = event.target.value;
      });
      card.appendChild(element);
    });

    card.appendChild(h('label', { className: 'block text-sm font-medium text-gray-700 mb-1' }, 'Tags (comma separated)'));
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
        showNotification('Draft saved', 'success');
        navigate('dashboard');
      }
    }, 'Save draft'));

    actions.appendChild(h('button', {
      className: 'btn-primary text-sm flex items-center gap-2',
      onClick: async () => {
        await persistDraft('reviewed');
        showNotification('Submitted to reviewer queue', 'success');
        currentStep = 4;
        renderStep();
      }
    }, h('i', { className: 'fas fa-paper-plane' }), 'Submit for review'));

    if (['senior_engineer', 'reviewer', 'admin'].includes(CURRENT_USER.role)) {
      actions.appendChild(h('button', {
        className: 'btn-success text-sm flex items-center gap-2',
        onClick: async () => {
          if (!knowledgeEntry.version_range) {
            showNotification('Version range is required before approval', 'error');
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
          showNotification('Approved directly', 'success');
          currentStep = 5;
          renderStep();
        }
      }, h('i', { className: 'fas fa-check-double' }), 'Approve now'));
    }

    card.appendChild(actions);
    content.appendChild(card);
  }

  function renderStepFour() {
    const card = h('div', { className: 'card text-center py-8' },
      h('div', { className: 'w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4' },
        h('i', { className: 'fas fa-clock text-blue-600 text-2xl' })
      ),
      h('h2', { className: 'text-lg font-semibold text-gray-900 mb-2' }, 'Waiting for reviewer'),
      h('p', { className: 'text-sm text-gray-500 mb-4' }, 'The draft is now in the review queue and can be approved or rejected there.'),
      h('button', { className: 'btn-primary', onClick: () => navigate('reviewer') }, 'Open reviewer dashboard')
    );
    content.appendChild(card);
  }

  function renderStepFive() {
    const card = h('div', { className: 'card text-center py-8' },
      h('div', { className: 'w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4' },
        h('i', { className: 'fas fa-check-circle text-green-600 text-2xl' })
      ),
      h('h2', { className: 'text-lg font-semibold text-gray-900 mb-2' }, 'Knowledge published'),
      h('p', { className: 'text-sm text-gray-500 mb-4' }, 'This incident is now stored as reusable operational knowledge.'),
      h('div', { className: 'flex gap-3 justify-center' },
        h('button', { className: 'btn-secondary', onClick: () => navigate('dashboard') }, 'Dashboard'),
        h('button', { className: 'btn-primary', onClick: () => navigate('search') }, 'Search knowledge')
      )
    );
    content.appendChild(card);
  }

  renderStep();
}