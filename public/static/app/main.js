import { renderSidebar } from './components/Sidebar.js';
import { renderPage } from './pages/index.js';
import { getCurrentPage, setCurrentPage } from './state.js';
import { initRouter, navigate, registerRenderHandler } from './router.js';

export function renderApp(params = {}) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(renderSidebar(renderApp));
  const main = document.createElement('div');
  main.className = 'flex-1 main-content';
  app.appendChild(main);
  renderPage(getCurrentPage(), params);
}

export function initApp() {
  dayjs.extend(dayjs_plugin_relativeTime);
  registerRenderHandler(renderApp);
  initRouter();
  const hash = window.location.hash.slice(1) || 'dashboard';
  setCurrentPage(hash.split('/')[0] || 'dashboard');
  window.navigate = navigate;
  renderApp();
}