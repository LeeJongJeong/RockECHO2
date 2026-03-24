import { h } from '../utils.js';

export function stepIndicator(labels, currentStep) {
  const wrap = h('div', { className: 'step-indicator' });

  labels.forEach((label, index) => {
    const stepNumber = index + 1;
    const status = stepNumber < currentStep ? 'step-done' : stepNumber === currentStep ? 'step-active' : 'step-pending';

    wrap.appendChild(h('div', { className: `step-item ${status}` },
      h('div', { className: 'step-circle' }, stepNumber < currentStep ? h('i', { className: 'fas fa-check' }) : String(stepNumber)),
      h('p', { className: `text-xs mt-2 font-medium ${stepNumber === currentStep ? 'text-indigo-600' : stepNumber < currentStep ? 'text-green-600' : 'text-gray-400'}` }, label)
    ));

    if (stepNumber < labels.length) {
      wrap.appendChild(h('div', { className: `step-line ${stepNumber < currentStep ? 'step-done' : 'step-pending'}`, style: 'height:2px; flex:1; margin-bottom:18px' }));
    }
  });

  return wrap;
}
