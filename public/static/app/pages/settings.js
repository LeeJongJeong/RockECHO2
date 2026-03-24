import { h } from '../utils.js';
import { getAiSettings, saveAiSettings } from '../ai-settings.js';

export function renderSettings() {
  const container = h('div', { className: 'p-8 max-w-3xl mx-auto' });
  container.appendChild(h('h1', { className: 'text-2xl font-bold text-slate-900 mb-6' }, '⚙️ 시스템 설정'));

  const settings = getAiSettings();

  const form = h('form', {
    className: 'bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5',
    onSubmit: (e) => {
      e.preventDefault();
      saveAiSettings({
        mode: document.getElementById('ai-mode').value,
        baseUrl: document.getElementById('ai-baseurl').value,
        apiKey: document.getElementById('ai-apikey').value,
        aiModel: document.getElementById('ai-model').value,
        embeddingModel: document.getElementById('ai-embedding').value
      });
      alert('설정이 저장되었습니다.');
    }
  });

  // AI Mode Toggle
  const modeGroup = h('div', { className: 'space-y-2' });
  modeGroup.appendChild(h('label', { className: 'block text-sm font-semibold text-slate-700' }, 'AI 연동 모드'));
  const modeSelect = h('select', { 
    id: 'ai-mode',
    className: 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
    value: settings.mode
  });
  modeSelect.appendChild(h('option', { value: 'openai' }, '🌐 OpenAI API (Cloud)'));
  modeSelect.appendChild(h('option', { value: 'local' }, '🦙 로컬 LLM (Ollama 호환)'));
  modeGroup.appendChild(modeSelect);
  form.appendChild(modeGroup);

  // Base URL
  const baseUrlGroup = h('div', { className: 'space-y-2' });
  baseUrlGroup.appendChild(h('label', { className: 'block text-sm font-semibold text-slate-700' }, 'API Base URL'));
  baseUrlGroup.appendChild(h('input', {
    id: 'ai-baseurl', type: 'text',
    className: 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
    placeholder: '예: http://127.0.0.1:11434/v1',
    value: settings.baseUrl || ''
  }));
  baseUrlGroup.appendChild(h('p', { className: 'text-xs text-slate-500' }, '비워두면 서버의 기본 .dev.vars 설정을 따릅니다.'));
  form.appendChild(baseUrlGroup);

  // API Key
  const apiKeyGroup = h('div', { className: 'space-y-2' });
  apiKeyGroup.appendChild(h('label', { className: 'block text-sm font-semibold text-slate-700' }, 'API Key'));
  apiKeyGroup.appendChild(h('input', {
    id: 'ai-apikey', type: 'password',
    className: 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
    placeholder: 'sk-... (Ollama 사용시 임의 문자 입력)',
    value: settings.apiKey || ''
  }));
  form.appendChild(apiKeyGroup);

  // Layout for Models
  const modelGrid = h('div', { className: 'grid grid-cols-2 gap-4' });

  // Chat Model
  const aiModelGroup = h('div', { className: 'space-y-2' });
  aiModelGroup.appendChild(h('label', { className: 'block text-sm font-semibold text-slate-700' }, '텍스트 추론 모델명'));
  aiModelGroup.appendChild(h('input', {
    id: 'ai-model', type: 'text',
    className: 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
    placeholder: '예: llama3.1 또는 gpt-4o-mini',
    value: settings.aiModel || ''
  }));
  modelGrid.appendChild(aiModelGroup);

  // Embedding Model
  const embedModelGroup = h('div', { className: 'space-y-2' });
  embedModelGroup.appendChild(h('label', { className: 'block text-sm font-semibold text-slate-700' }, 'RAG (임베딩) 모델명'));
  embedModelGroup.appendChild(h('input', {
    id: 'ai-embedding', type: 'text',
    className: 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
    placeholder: '예: nomic-embed-text',
    value: settings.embeddingModel || ''
  }));
  modelGrid.appendChild(embedModelGroup);

  form.appendChild(modelGrid);

  // Info Note
  form.appendChild(h('div', { className: 'p-4 bg-sky-50 border border-sky-100 rounded-lg flex items-start gap-3 mt-2' },
    h('i', { className: 'fa-solid fa-circle-info text-sky-500 mt-0.5' }),
    h('p', { className: 'text-sm text-sky-800' }, '로컬 LLM (Ollama)을 사용할 경우, 로컬에 해당 모델이 미리 설치(pull)되어 있어야 정상적으로 동작합니다. 입력된 설정값은 브라우저에만 저장되며 모든 AI API 호출 시 백엔드로 전달되어 우선 적용됩니다.')
  ));

  // Submit Btn
  const submitBtn = h('button', {
    type: 'submit',
    className: 'w-full py-2.5 bg-indigo-600 text-white rounded-lg font-semibold shadow-sm hover:bg-indigo-700 transition'
  }, '저장하기');
  form.appendChild(submitBtn);

  container.appendChild(form);

  return container;
}
