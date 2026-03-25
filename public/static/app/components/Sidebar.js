import { CURRENT_USER, getCurrentPage } from '../state.js';
import { h } from '../utils.js';
import { navigate } from '../router.js';

export function renderSidebar(onUserChange) {
  const sidebar = h('div', { className: 'w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0' });

  sidebar.appendChild(h('div', { className: 'px-5 pt-5 pb-4 border-b border-slate-200' },
    h('div', { className: 'flex items-center gap-3' },
      h('div', { className: 'w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm' },
        h('i', { className: 'fas fa-mountain text-white text-sm' })
      ),
      h('div', {},
        h('h1', { className: 'text-[17px] font-extrabold text-slate-900 tracking-tight' }, 'RockECHO')
      )
    ),
    h('p', { className: 'mt-3 text-[13px] leading-5 text-slate-400' }, '과거의 경험이 메아리처럼 돌아옵니다')
  ));

  sidebar.appendChild(h('div', { className: 'px-3 pt-4 pb-3' },
    h('button', {
      className: 'w-full h-11 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[15px] font-semibold shadow-sm transition-all hover:from-indigo-700 hover:to-violet-700 flex items-center justify-center gap-2',
      onClick: () => navigate('quick-input')
    },
      h('i', { className: 'fas fa-plus text-sm' }),
      '장애 기록하기'
    )
  ));

  const nav = h('nav', { className: 'flex-1 px-3 pb-4 space-y-1.5' });
  const navItems = [
    { id: 'dashboard', icon: 'fa-gauge-high', label: '대시보드' },
    { id: 'search', icon: 'fa-magnifying-glass', label: '장애 검색' },
    { id: 'quick-input', icon: 'fa-circle-plus', label: '장애 기록' },
    { id: 'reviewer', icon: 'fa-check-double', label: 'Reviewer' },
    { id: 'zero-results', icon: 'fa-circle-exclamation', label: 'Zero Result 분석' },
    { id: 'audit-log', icon: 'fa-arrow-rotate-left', label: '감사 로그' },
    { id: 'settings', icon: 'fa-gear', label: '설정' }
  ];

  for (const item of navItems) {
    const active = getCurrentPage() === item.id;
    const navItem = h('a', {
      href: '#',
      className: `flex items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-semibold transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`,
      onClick: (event) => {
        event.preventDefault();
        navigate(item.id);
      }
    },
      h('span', { className: `flex w-5 items-center justify-center text-[15px] ${active ? 'text-slate-600' : 'text-slate-500'}` },
        h('i', { className: `fas ${item.icon}` })
      ),
      h('span', {}, item.label)
    );
    nav.appendChild(navItem);
  }
  sidebar.appendChild(nav);

  sidebar.appendChild(h('div', { className: 'mt-auto px-4 py-4 border-t border-slate-200' },
    h('p', { className: 'text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2' }, 'Role'),
    h('p', { className: 'text-sm font-semibold text-slate-800' }, CURRENT_USER.name),
    h('p', { className: 'text-xs text-slate-400 mt-0.5' }, CURRENT_USER.role),
    h('div', { className: 'mt-3' },
      h('select', {
        className: 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-indigo-400',
        onChange: (event) => {
          const roles = { engineer: 'user-004', senior_engineer: 'user-002', reviewer: 'user-003', admin: 'user-001' };
          const names = { engineer: 'Engineer Park', senior_engineer: 'Senior DBA Kim', reviewer: 'Reviewer Lee', admin: 'Admin' };
          CURRENT_USER.id = roles[event.target.value] || 'user-004';
          CURRENT_USER.name = names[event.target.value] || 'Engineer Park';
          CURRENT_USER.role = event.target.value;
          onUserChange();
        }
      },
        h('option', CURRENT_USER.role === 'engineer' ? { value: 'engineer', selected: true } : { value: 'engineer' }, 'Engineer'),
        h('option', CURRENT_USER.role === 'senior_engineer' ? { value: 'senior_engineer', selected: true } : { value: 'senior_engineer' }, 'Senior Engineer'),
        h('option', CURRENT_USER.role === 'reviewer' ? { value: 'reviewer', selected: true } : { value: 'reviewer' }, 'Reviewer'),
        h('option', CURRENT_USER.role === 'admin' ? { value: 'admin', selected: true } : { value: 'admin' }, 'Admin')
      )
    )
  ));

  return sidebar;
}
