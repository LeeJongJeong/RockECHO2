export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'className') {
      el.className = v;
    } else if (k === 'innerHTML') {
      el.innerHTML = v;
    } else if (v !== null && v !== undefined) {
      el.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (!child) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Element) {
      el.appendChild(child);
    }
  }
  return el;
}

export function timeAgo(dateStr) {
  if (!dateStr) return '-';
  return dayjs(dateStr).fromNow();
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm');
}

export function showNotification(message, type = 'success') {
  const container = document.getElementById('notifications');
  const icons = { success: 'fa-check-circle text-green-500', error: 'fa-times-circle text-red-500', info: 'fa-info-circle text-blue-500', warning: 'fa-exclamation-triangle text-yellow-500' };
  const item = h('div', { className: 'notification-item flex items-center gap-3 border border-gray-100' },
    h('i', { className: `fas ${icons[type]} text-xl` }),
    h('span', { className: 'text-sm text-gray-700 flex-1' }, message)
  );
  container.appendChild(item);
  setTimeout(() => item.remove(), 3500);
}

export function showModal(content) {
  const container = document.getElementById('modal-container');
  const overlay = h('div', { className: 'modal-overlay', onClick: (e) => { if (e.target === overlay) overlay.remove(); } },
    h('div', { className: 'modal-content' }, content)
  );
  container.appendChild(overlay);
  return overlay;
}