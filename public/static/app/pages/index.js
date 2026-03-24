import { renderDashboard } from './dashboard.js';
import { renderSearch } from './search.js';
import { renderKnowledgeDetail } from './knowledge-detail.js';
import { renderQuickInput } from './quick-input.js';
import { renderReviewer } from './reviewer.js';
import { renderZeroResults } from './zero-results.js';
import { renderAuditLog } from './audit-log.js';
import { renderSettings } from './settings.js';

export function renderPage(page, params = {}) {
  const main = document.querySelector('.main-content');
  if (!main) return;
  main.innerHTML = '';

  const pages = {
    dashboard: renderDashboard,
    search: renderSearch,
    'quick-input': () => renderQuickInput(params.prefill || ''),
    reviewer: renderReviewer,
    'zero-results': renderZeroResults,
    'audit-log': renderAuditLog,
    'knowledge-detail': () => renderKnowledgeDetail(params.id, params.searchEventId, params.index, params.total),
    settings: renderSettings
  };

  const renderer = pages[page] || renderDashboard;
  renderer();
}