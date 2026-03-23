import { API } from './state.js';
import { showNotification } from './utils.js';

export async function api(method, path, data = null, { silent = false } = {}) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(API + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      const apiErr = new Error(err.error || res.statusText);
      apiErr.status = res.status;
      throw apiErr;
    }
    return await res.json();
  } catch (e) {
    if (!silent) showNotification(e.message, 'error');
    throw e;
  }
}