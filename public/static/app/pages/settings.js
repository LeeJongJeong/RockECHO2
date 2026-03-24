import { h } from '../utils.js';
import { getAiSettings, saveAiSettings } from '../ai-settings.js';

export function renderSettings() {
  console.log('[DEBUG] renderSettings() is called!');
  const main = document.querySelector('.main-content');
  if (!main) return;

  try {
    main.innerHTML = '';

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
    const aiModelInputContainer = h('div', { className: 'relative' });
    aiModelInputContainer.appendChild(h('input', {
      id: 'ai-model', type: 'text',
      className: 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
      placeholder: '예: llama3.1 또는 gpt-4o-mini',
      value: settings.aiModel || ''
    }));
    aiModelGroup.appendChild(aiModelInputContainer);
    modelGrid.appendChild(aiModelGroup);

    // Embedding Model
    const embedModelGroup = h('div', { className: 'space-y-2' });
    embedModelGroup.appendChild(h('label', { className: 'block text-sm font-semibold text-slate-700' }, 'RAG (임베딩) 모델명'));
    const embedModelInputContainer = h('div', { className: 'relative' });
    embedModelInputContainer.appendChild(h('input', {
      id: 'ai-embedding', type: 'text',
      className: 'w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
      placeholder: '예: nomic-embed-text',
      value: settings.embeddingModel || ''
    }));
    embedModelGroup.appendChild(embedModelInputContainer);
    modelGrid.appendChild(embedModelGroup);

    form.appendChild(modelGrid);

    // Discovery Button Logic
    const discoveryBtn = h('button', {
      type: 'button',
      className: 'hidden mt-3 text-xs font-semibold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition border border-indigo-100'
    }, '🔄 설치된 로컬 모델 목록 가져오기');

    modeSelect.addEventListener('change', (e) => {
      discoveryBtn.className = e.target.value === 'local' 
        ? 'mt-3 text-xs font-semibold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition border border-indigo-100' 
        : 'hidden';
    });
    if (settings.mode === 'local') {
      discoveryBtn.className = 'mt-3 text-xs font-semibold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition border border-indigo-100';
    }

    discoveryBtn.addEventListener('click', async () => {
      const originalText = discoveryBtn.innerText;
      discoveryBtn.innerText = '가져오는 중...';
      discoveryBtn.disabled = true;
      try {
        const baseUrl = document.getElementById('ai-baseurl').value || 'http://127.0.0.1:11434/v1';
        const res = await fetch('/api/ai/local-models?baseUrl=' + encodeURIComponent(baseUrl));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch models');
        if (!data.models || data.models.length === 0) throw new Error('서버에 설치된 로컬 모델이 없습니다.');

        const replaceWithSelect = (inputId, selectedValue) => {
          const input = document.getElementById(inputId);
          if (!input) return;
          const parent = input.parentElement;
          const select = document.createElement('select');
          select.id = inputId;
          select.className = input.className;
          data.models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.innerText = m;
            select.appendChild(opt);
          });
          if (data.models.includes(selectedValue)) {
            select.value = selectedValue;
          } else if (inputId === 'ai-embedding') {
            const defaultEmbed = data.models.find(m => m.includes('embed'));
            if (defaultEmbed) select.value = defaultEmbed;
          }
          parent.replaceChild(select, input);
        };

        replaceWithSelect('ai-model', settings.aiModel);
        replaceWithSelect('ai-embedding', settings.embeddingModel);

        alert('로컬 모델 목록을 성공적으로 가져왔습니다. 드롭다운에서 선택해주세요.');
      } catch (err) {
        alert('목록을 가져오지 못했습니다: ' + err.message);
      } finally {
        discoveryBtn.innerText = originalText;
        discoveryBtn.disabled = false;
      }
    });

    form.appendChild(discoveryBtn);

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
    main.appendChild(container);
    
    // Set actual valid select value post-mount
    setTimeout(() => {
      const ms = document.getElementById('ai-mode');
      if (ms) ms.value = settings.mode || 'openai';
    }, 10);
    
    console.log('[DEBUG] renderSettings() completed successfully!');
  } catch (err) {
    alert("화면 렌더링 중 오류가 발생했습니다!\n\n에러 내용: " + err.message);
    console.error(err);
  }
}
