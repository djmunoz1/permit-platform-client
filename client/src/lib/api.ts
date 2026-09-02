import axios from 'axios';
import {
  MOCK_USER, MOCK_TENANT, MOCK_APPLICATIONS, MOCK_CONTACTS,
  MOCK_WORKFLOWS, MOCK_PERMIT_TYPES, MOCK_USERS,
} from './mockData';

// ── Set to false once you have the server + database running ──────────────────
export const MOCK_MODE = true;

function mockHandle(method: string, path: string, body?: any): any {
  // Auth
  if (method === 'POST' && path === '/auth/login') {
    const { email, password, tenantSlug } = body ?? {};
    if (email === 'admin@ca-abc.gov' && password === 'admin123' && tenantSlug === 'ca-abc') {
      return { token: 'mock-token', user: MOCK_USER, tenant: MOCK_TENANT };
    }
    throw { response: { status: 401, data: { error: 'Invalid credentials' } } };
  }
  if (method === 'GET' && path === '/auth/me') return { user: MOCK_USER };

  // Applications list
  if (method === 'GET' && path === '/applications') {
    return { data: MOCK_APPLICATIONS, total: MOCK_APPLICATIONS.length, page: 1, limit: 25 };
  }
  // Single application
  if (method === 'GET' && path.match(/^\/applications\/[^/]+$/)) {
    const id = path.split('/')[2];
    const app = MOCK_APPLICATIONS.find(a => a.id === id);
    if (!app) throw { response: { status: 404 } };
    return app;
  }
  if (method === 'POST' && path === '/applications') {
    return { ...MOCK_APPLICATIONS[0], id: 'app-new', application_number: 'APL-NEW', status: 'active' };
  }
  if (method === 'PATCH' && path.match(/^\/applications\/[^/]+$/)) {
    const id = path.split('/')[2];
    const app = MOCK_APPLICATIONS.find(a => a.id === id) ?? MOCK_APPLICATIONS[0];
    return { ...app, ...body };
  }
  if (method === 'POST' && path.match(/^\/applications\/[^/]+\/transition$/)) {
    return MOCK_APPLICATIONS[0];
  }
  if (method === 'POST' && path.match(/^\/applications\/[^/]+\/activities$/)) {
    return { id: 'act-' + Date.now(), ...body, created_at: new Date().toISOString(), user_name: 'Eric Keipper' };
  }

  // Contacts
  if (method === 'GET' && path === '/contacts') return MOCK_CONTACTS;
  if (method === 'GET' && path.match(/^\/contacts\/[^/]+$/)) {
    const id = path.split('/')[2];
    const c = MOCK_CONTACTS.find(x => x.id === id);
    if (!c) throw { response: { status: 404 } };
    return c;
  }
  if (method === 'POST' && path === '/contacts') return { id: 'c-new', ...body };
  if (method === 'PATCH' && path.match(/^\/contacts\/[^/]+$/)) return { ...MOCK_CONTACTS[0], ...body };
  if (method === 'POST' && path.match(/^\/contacts\/[^/]+\/activities$/)) {
    return { id: 'act-' + Date.now(), ...body, created_at: new Date().toISOString() };
  }

  // Workflows
  if (method === 'GET' && path === '/workflows') return MOCK_WORKFLOWS;
  if (method === 'GET' && path.match(/^\/workflows\/[^/]+$/)) {
    const id = path.split('/')[2];
    const wf = MOCK_WORKFLOWS.find(w => w.id === id);
    if (!wf) throw { response: { status: 404 } };
    return wf;
  }
  if (method === 'POST' && path === '/workflows') return { id: 'wf-' + Date.now(), ...body, stage_count: 0 };
  if (method === 'POST' && path.match(/^\/workflows\/[^/]+\/stages$/)) return { id: 'st-' + Date.now(), ...body };
  if (method === 'PATCH' && path.match(/^\/workflows\/[^/]+\/stages\/[^/]+$/)) return { id: path.split('/')[4], ...body };
  if (method === 'DELETE' && path.match(/^\/workflows\/[^/]+\/stages\/[^/]+$/)) return { success: true };
  if (method === 'POST' && path.match(/^\/workflows\/[^/]+\/transitions$/)) return { id: 'tr-' + Date.now(), ...body };
  if (method === 'DELETE' && path.match(/^\/workflows\/[^/]+\/transitions\/[^/]+$/)) return { success: true };

  // Permit types — persisted to localStorage so Form Builder saves survive reload
  const LS_KEY = 'mock_permit_types';
  function getPermitTypes() {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return MOCK_PERMIT_TYPES;
  }
  function savePermitTypes(list: any[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    // Also write the Homestead schema to a shared key for the OneStop front end
    const hs = list.find((p: any) => p.code === 'HOMESTEAD-TC');
    if (hs) localStorage.setItem('admin_homestead_schema', JSON.stringify(hs.form_schema));
  }

  if (method === 'GET' && path === '/permit-types') return getPermitTypes();
  if (method === 'GET' && path.match(/^\/permit-types\/[^/]+$/)) {
    const id = path.split('/')[2];
    const pt = getPermitTypes().find((p: any) => p.id === id);
    if (!pt) throw { response: { status: 404 } };
    return pt;
  }
  if (method === 'POST' && path === '/permit-types') {
    const list = getPermitTypes();
    const newPt = { id: 'pt-' + Date.now(), ...body, application_count: 0, form_schema: body.formSchema ?? body.form_schema ?? [] };
    list.push(newPt);
    savePermitTypes(list);
    return newPt;
  }
  if (method === 'PATCH' && path.match(/^\/permit-types\/[^/]+$/)) {
    const id = path.split('/')[2];
    const list = getPermitTypes();
    const idx = list.findIndex((p: any) => p.id === id);
    if (idx === -1) return { ...body };
    const updated = { ...list[idx], ...body, form_schema: body.formSchema ?? body.form_schema ?? list[idx].form_schema };
    list[idx] = updated;
    savePermitTypes(list);
    return updated;
  }

  // Users
  if (method === 'GET' && path === '/users') return MOCK_USERS;
  if (method === 'POST' && path === '/users') return { id: 'u-' + Date.now(), ...body, is_active: true };
  if (method === 'PATCH' && path.match(/^\/users\/[^/]+$/)) return { ...MOCK_USERS[0], ...body };

  if (method === 'GET' && path === '/health') return { status: 'ok (mock)' };

  return null;
}

export const api = axios.create({ baseURL: '/api' });

// Intercept every request in mock mode and short-circuit with fake data
api.interceptors.request.use((config) => {
  if (!MOCK_MODE) {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  const method = (config.method ?? 'GET').toUpperCase();
  const path = (config.url ?? '').replace(/^\/api/, '');
  let body: any;
  try { body = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : config.params; } catch { body = {}; }

  let result: any;
  try {
    result = mockHandle(method, path, body);
  } catch (err) {
    config.adapter = () => Promise.reject(err);
    return config;
  }

  if (result !== null) {
    config.adapter = () => Promise.resolve({ data: result, status: 200, statusText: 'OK', headers: {}, config, request: {} });
  }

  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (!MOCK_MODE && err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
