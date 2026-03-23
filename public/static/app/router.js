import { getCurrentPage, setCurrentPage } from './state.js';

let renderHandler = null;

export function registerRenderHandler(handler) {
  renderHandler = handler;
}

export function navigate(page, params = {}) {
  setCurrentPage(page);
  window.history.pushState({ page, params }, '', `#${page}`);
  if (renderHandler) {
    renderHandler(params);
  }
}

export function initRouter() {
  window.addEventListener('popstate', (event) => {
    const hash = window.location.hash.slice(1) || 'dashboard';
    setCurrentPage(hash.split('/')[0] || 'dashboard');
    if (renderHandler) {
      renderHandler(event.state?.params || {});
    }
  });
}