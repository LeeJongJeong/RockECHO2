import { h } from '../utils.js';

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
