import { API } from './state.js';
import { showNotification } from './utils.js';
import { getAiSettings } from './ai-settings.js';
/**
 * 전역 API 에러 인터셉터 설정 및 호출 모듈
 * 
 * @typedef {Object} FetchOptions
 * @property {boolean} [silent] - true일 경우 에러 토스트를 띄우지 않음
 */

export async function api(method, path, data = null, { silent = false } = {}) {
  try {
    const ai = getAiSettings();
    const headers = { 
      'Content-Type': 'application/json',
      'X-AI-Mode': ai.mode || '',
      'X-AI-Base-Url': ai.baseUrl || '',
      'X-AI-Api-Key': ai.apiKey || '',
      'X-AI-Model': ai.aiModel || '',
      'X-Embedding-Model': ai.embeddingModel || ''
    };
    const opts = { method, headers };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(API + path, opts);
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      const apiErr = new Error(err.error || res.statusText);
      apiErr.status = res.status;
      
      // Global Error Interceptor
      if (!silent) {
        if (res.status === 401) showNotification('로그인이 필요합니다.', 'error');
        else if (res.status === 403) showNotification('권한이 없습니다.', 'error');
        else if (res.status === 404) showNotification('리소스를 찾을 수 없습니다.', 'error');
        else if (res.status === 429) showNotification('요청이 너무 많습니다 (Rate Limit). 잠시 후 다시 시도해주세요.', 'warning');
        else if (res.status >= 500) showNotification(`서버 시스템 오류가 발생했습니다 (${res.status}).`, 'error');
        else showNotification(apiErr.message, 'error');
      }
      
      throw apiErr;
    }
    return await res.json();
  } catch (e) {
    if (!e.status && !silent) {
      // Fetch fail (network error, CORS, etc)
      showNotification(`네트워크 오류: ${e.message}`, 'error');
    }
    throw e;
  }
}