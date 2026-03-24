/**
 * @typedef {import('../../../src/types').KnowledgeEntry} KnowledgeEntry
 * @typedef {import('../../../src/types').Incident} Incident
 * @typedef {import('../../../src/types').RunbookStep} RunbookStep
 * @typedef {import('../../../src/types').DashboardStats} DashboardStats
 * @typedef {import('../../../src/types').SearchEvent} SearchEvent
 */

export const API = '';
export const CURRENT_USER = { id: 'user-004', name: 'Engineer Park', role: 'engineer' };

export const DBMS_LABELS = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  mongodb: 'MongoDB',
  redis: 'Redis',
  singlestoredb: 'SingleStoreDB',
  heatwave: 'HeatWave',
  tarantuladb: 'TarantulaDB'
};

export const DBMS_COLORS = {
  postgresql: 'dbms-pg',
  mysql: 'dbms-my',
  mariadb: 'dbms-mr',
  mongodb: 'dbms-mg',
  redis: 'dbms-rd',
  singlestoredb: 'dbms-ss',
  heatwave: 'dbms-hw',
  tarantuladb: 'dbms-tr'
};

export const STATUS_LABELS = {
  raw_input: 'Raw Input',
  ai_generated: 'AI Draft',
  reviewed: 'In Review',
  approved: 'Approved',
  needs_review: 'Needs Review'
};

export const STATUS_CLASSES = {
  raw_input: 'badge-raw',
  ai_generated: 'badge-ai',
  reviewed: 'badge-reviewed',
  approved: 'badge-approved',
  needs_review: 'badge-needs'
};

export const PRIORITY_LABELS = { p1: 'P1', p2: 'P2', p3: 'P3' };
export const PRIORITY_COLORS = { p1: 'badge-p1', p2: 'badge-p2', p3: 'badge-p3' };
export const SEED_TARGETS = {
  postgresql: 20,
  mysql: 15,
  mariadb: 0,
  mongodb: 10,
  redis: 5,
  singlestoredb: 0,
  heatwave: 0,
  tarantuladb: 0
};
export const SEED_TOTAL = 50;

let currentPage = 'dashboard';

/**
 * @type {{ query: string, results: KnowledgeEntry[], searchEventId: string | null, currentIndex: number }}
 */
export const searchContext = { query: '', results: [], searchEventId: null, currentIndex: 0 };

export function getCurrentPage() {
  return currentPage;
}

export function setCurrentPage(page) {
  currentPage = page;
}

export function replaceSearchContext(nextContext) {
  searchContext.query = nextContext.query || '';
  searchContext.results = Array.isArray(nextContext.results) ? nextContext.results : [];
  searchContext.searchEventId = nextContext.searchEventId || null;
  searchContext.currentIndex = nextContext.currentIndex || 0;
}