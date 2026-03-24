import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings } from './types'

import incidentRoutes from './routes/incidents'
import knowledgeRoutes from './routes/knowledge'
import searchRoutes from './routes/search'
import dashboardRoutes from './routes/dashboard'
import aiRoutes from './routes/ai'
import usersRoutes from './routes/users'
import healthRoutes from './routes/health'

import { AppError } from './lib/AppError'

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.status as any);
  }
  console.error('Unhandled server error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}))

app.route('/api/incidents', incidentRoutes)
app.route('/api/knowledge', knowledgeRoutes)
app.route('/api/search', searchRoutes)
app.route('/api/dashboard', dashboardRoutes)
app.route('/api/ai', aiRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/health', healthRoutes)

app.use('/static/*', serveStatic({ root: './', manifest: {} as Record<string, string> }))

app.get('*', (c) => c.html(getHTML()))

function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RockECHO - operational knowledge echoes forward</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/plugin/relativeTime.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { font-family: 'Inter', sans-serif; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; }
    ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #64748b; }
    .section-scroll::-webkit-scrollbar { width: 4px; }
    .section-scroll::-webkit-scrollbar-track { background: #f8fafc; border-radius: 2px; }
    .section-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
    .section-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    .sidebar-item:hover { background: rgba(99,102,241,0.1); }
    .sidebar-item.active { background: rgba(99,102,241,0.15); color: #4f46e5; border-right: 3px solid #4f46e5; }
    .badge-p1 { background: #fee2e2; color: #dc2626; }
    .badge-p2 { background: #fef3c7; color: #d97706; }
    .badge-p3 { background: #dcfce7; color: #16a34a; }
    .badge-raw { background: #f1f5f9; color: #64748b; }
    .badge-ai { background: #ede9fe; color: #7c3aed; }
    .badge-reviewed { background: #dbeafe; color: #2563eb; }
    .badge-approved { background: #dcfce7; color: #16a34a; }
    .badge-needs { background: #fff7ed; color: #ea580c; }
    .dbms-pg { background: #dbeafe; color: #1d4ed8; }
    .dbms-my { background: #fff7ed; color: #c2410c; }
    .dbms-mr { background: #fdf4ff; color: #9333ea; }
    .dbms-mg { background: #dcfce7; color: #15803d; }
    .dbms-rd { background: #fee2e2; color: #dc2626; }
    .dbms-ss { background: #f0fdf4; color: #166534; }
    .dbms-hw { background: #fdf2f8; color: #9d174d; }
    .dbms-tr { background: #fffbeb; color: #92400e; }
    .btn-primary { background: #4f46e5; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 500; transition: all 0.2s; cursor: pointer; border: none; }
    .btn-primary:hover { background: #4338ca; }
    .btn-secondary { background: white; color: #374151; padding: 8px 16px; border-radius: 6px; font-weight: 500; border: 1px solid #d1d5db; transition: all 0.2s; cursor: pointer; }
    .btn-secondary:hover { background: #f9fafb; }
    .btn-success { background: #16a34a; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 500; transition: all 0.2s; cursor: pointer; border: none; }
    .btn-success:hover { background: #15803d; }
    .btn-danger { background: #dc2626; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 500; transition: all 0.2s; cursor: pointer; border: none; }
    .btn-danger:hover { background: #b91c1c; }
    .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 20px; }
    .input-field { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; outline: none; transition: border 0.2s; }
    .input-field:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
    .tag { display: inline-block; padding: 2px 8px; background: #f1f5f9; color: #475569; border-radius: 4px; font-size: 12px; margin: 2px; }
    .search-result-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
    .search-result-card:hover { border-color: #4f46e5; box-shadow: 0 4px 12px rgba(79,70,229,0.1); }
    .relevance-bar { height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; }
    .relevance-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
    .step-indicator { display: flex; align-items: center; margin-bottom: 24px; }
    .step-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
    .step-circle { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; }
    .step-line { flex: 1; height: 2px; }
    .step-active .step-circle { background: #4f46e5; color: white; }
    .step-done .step-circle { background: #16a34a; color: white; }
    .step-pending .step-circle { background: #e5e7eb; color: #9ca3af; }
    .step-active .step-line, .step-done .step-line { background: #4f46e5; }
    .step-pending .step-line { background: #e5e7eb; }
    .ai-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .ai-badge.inferred { background: #fef3c7; color: #d97706; }
    .ai-badge.confirmed { background: #dbeafe; color: #2563eb; }
    .ai-badge.expert { background: #dcfce7; color: #16a34a; }
    .ai-badge.generated { background: #ede9fe; color: #7c3aed; }
    .code-block { background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; overflow-x: auto; position: relative; }
    .copy-btn { position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,0.1); color: #94a3b8; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; transition: all 0.2s; }
    .copy-btn:hover { background: rgba(255,255,255,0.2); color: white; }
    .notification { position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 360px; }
    .notification-item { background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal-content { background: white; border-radius: 12px; padding: 24px; max-width: 560px; width: 90%; max-height: 80vh; overflow-y: auto; }
    .sidebar-logo { padding: 20px; border-bottom: 1px solid #e5e7eb; }
    .main-content { height: 100vh; overflow-y: auto; }
    .quality-bar { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
    .quality-fill { height: 100%; border-radius: 3px; }
    .nav-badge { background: #ef4444; color: white; border-radius: 999px; padding: 1px 6px; font-size: 11px; font-weight: 600; min-width: 18px; text-align: center; }
  </style>
</head>
<body class="bg-gray-50">
  <div id="app" class="flex h-screen overflow-hidden"></div>
  <div id="notifications" class="notification"></div>
  <div id="modal-container"></div>
  <script type="module" src="/static/app.js"></script>
</body>
</html>`
}

export default app
