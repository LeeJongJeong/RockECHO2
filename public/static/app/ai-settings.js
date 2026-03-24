export const AI_SETTINGS_KEY = 'rockecho_ai_settings';

export function getAiSettings() {
  const saved = localStorage.getItem(AI_SETTINGS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // Return defaults if parsing fails
    }
  }
  return {
    mode: 'openai', // 'openai' | 'local'
    baseUrl: '',
    apiKey: '',
    aiModel: '',
    embeddingModel: ''
  };
}

export function saveAiSettings(settings) {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
}
