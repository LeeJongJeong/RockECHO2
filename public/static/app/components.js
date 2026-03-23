import { CURRENT_USER, getCurrentPage } from './state.js';
import { h } from './utils.js';
import { navigate } from './router.js';

export function renderSidebar(onUserChange) {
  const sidebar = h('div', { className: 'w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0' });

  sidebar.appendChild(h('div', { className: 'sidebar-logo' },
    h('div', { className: 'flex items-center gap-2' },
      h('div', { className: 'w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center' },
        h('i', { className: 'fas fa-mountain text-white text-sm' })
      ),
      h('div', {},
        h('h1', { className: 'text-lg font-bold text-gray-900 tracking-tight' }, 'RockECHO')
      )
    ),
    h('p', { className: 'text-xs text-gray-400 mt-2 leading-relaxed' }, 'Capture incidents and echo operational knowledge back to the team.')
  ));

  sidebar.appendChild(h('div', { className: 'p-3' },
    h('button', {
      className: 'btn-primary w-full flex items-center justify-center gap-2 text-sm',
      onClick: () => navigate('quick-input')
    },
      h('i', { className: 'fas fa-plus' }),
      'Quick Input'
    )
  ));

  const nav = h('nav', { className: 'flex-1 px-3 space-y-1' });
  const navItems = [
    { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { id: 'search', icon: 'fa-search', label: 'Search' },
    { id: 'quick-input', icon: 'fa-plus-circle', label: 'Quick Input' },
    { id: 'reviewer', icon: 'fa-check-double', label: 'Reviewer' },
    { id: 'zero-results', icon: 'fa-exclamation-circle', label: 'Zero Results' },
    { id: 'audit-log', icon: 'fa-history', label: 'Audit Log' }
  ];

  for (const item of navItems) {
    const navItem = h('a', {
      href: '#',
      className: `sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 cursor-pointer transition-all ${getCurrentPage() === item.id ? 'active' : ''}`,
      onClick: (event) => {
        event.preventDefault();
        navigate(item.id);
      }
    },
      h('i', { className: `fas ${item.icon} w-4 text-center` }),
      item.label
    );
    nav.appendChild(navItem);
  }
  sidebar.appendChild(nav);

  sidebar.appendChild(h('div', { className: 'p-4 border-t border-gray-200' },
    h('div', { className: 'flex items-center gap-3' },
      h('div', { className: 'w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center' },
        h('i', { className: 'fas fa-user text-indigo-600 text-sm' })
      ),
      h('div', {},
        h('p', { className: 'text-sm font-medium text-gray-800' }, CURRENT_USER.name),
        h('p', { className: 'text-xs text-gray-400' }, CURRENT_USER.role)
      )
    ),
    h('div', { className: 'mt-3' },
      h('select', {
        className: 'text-xs border border-gray-200 rounded px-2 py-1 w-full text-gray-600',
        value: CURRENT_USER.role,
        onChange: (event) => {
          const roles = { engineer: 'user-004', senior_engineer: 'user-002', reviewer: 'user-003', admin: 'user-001' };
          const names = { engineer: 'Engineer Park', senior_engineer: 'Senior DBA Kim', reviewer: 'Reviewer Lee', admin: 'Admin' };
          CURRENT_USER.id = roles[event.target.value] || 'user-004';
          CURRENT_USER.name = names[event.target.value] || 'Engineer Park';
          CURRENT_USER.role = event.target.value;
          onUserChange();
        },
        innerHTML: `
          <option value="engineer">Engineer</option>
          <option value="senior_engineer">Senior Engineer</option>
          <option value="reviewer">Reviewer</option>
          <option value="admin">Admin</option>
        `
      })
    )
  ));

  return sidebar;
}

export function sectionCard(title, content, options = {}) {
  const { maxHeight = '320px', scrollable = true } = options;
  return h('div', { className: 'card mb-4' },
    h('h3', { className: 'font-semibold text-gray-900 mb-2' }, title),
    h('div', {
      className: 'section-scroll text-gray-700 text-sm leading-relaxed whitespace-pre-wrap',
      style: scrollable ? `max-height:${maxHeight}; overflow-y:auto; overflow-x:hidden; padding-right:4px;` : ''
    }, content || '-')
  );
}

export function causeBadge(confidence) {
  const config = {
    ai_inferred: { label: 'AI Inferred', className: 'inferred', icon: 'fa-robot' },
    confirmed: { label: 'Confirmed', className: 'confirmed', icon: 'fa-user-check' },
    expert_verified: { label: 'Expert Verified', className: 'expert', icon: 'fa-award' }
  };
  const item = config[confidence] || config.ai_inferred;
  return h('span', { className: `ai-badge ${item.className}` },
    h('i', { className: `fas ${item.icon}` }),
    item.label
  );
}