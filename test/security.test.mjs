import test from 'node:test';
import assert from 'node:assert/strict';
import { makeApi, validator, ALL_TOOLS, cfg } from './helpers.mjs';
import { validateUsf, isValidUsf } from '../build/security/usf.js';
import { checkRoute } from '../build/security/routes.js';
import { classify, isAllowed } from '../build/security/policy.js';
import { loadConfig, loadHttpConfig, normalizeDolibarrUrl } from '../build/config.js';
import { ApiError, DolibarrAPI } from '../build/api.js';

// ---------- client API ----------
test('lecture seule : toute requête non-GET est refusée AVANT l’envoi', async () => {
  const { api, calls } = makeApi({ readOnly: true });
  for (const fn of [() => api.post('/invoices', {}), () => api.put('/invoices/1', {}), () => api.delete('/invoices/1'), () => api.patch('/invoices/1', {})]) {
    await assert.rejects(fn, /lecture seule|non autoris/);
  }
  assert.equal(calls.length, 0);
  await api.get('/invoices');
  assert.equal(calls.length, 1);
});

test('chemins : traversée, encodage et routes inconnues refusés', async () => {
  const { api, calls } = makeApi({ readOnly: false });
  for (const p of ['/invoices/../users/1', '/invoices/1/../../setup/conf', '/invoices/%2e%2e/users', '//evil.com/x', '/invoices/1?x=1', 'invoices', '/users/1/../1', '/invoices/1\\x', '/exec/ls', '/users/1/api_key']) {
    await assert.rejects(() => api.get(p), ApiError, p);
  }
  assert.equal(calls.length, 0);
});

test('un paramètre que Dolibarr ignorerait en silence est refusé', async () => {
  const { api } = makeApi();
  await assert.rejects(() => api.get('/invoices', { datestart: 1 }), /non pris en charge/);
  await assert.rejects(() => api.get('/bankaccounts', { status: 1 }), /non pris en charge/);
  await assert.rejects(() => api.post('/invoices/paymentsdistributed', { montant: 1 }), /non pris en charge/);
});

test('filtre USF invalide refusé par le client API', async () => {
  const { api, calls } = makeApi();
  await assert.rejects(() => api.get('/invoices', { sqlfilters: "(t.rowid:=:1) or 1=1" }));
  await assert.rejects(() => api.get('/invoices', { sqlfilters: "(t.ref:like:'a') UNION SELECT" }));
  assert.equal(calls.length, 0);
});

test('version cible : route de Dolibarr 24 refusée sur 23', async () => {
  const { api } = makeApi({ version: '23.0.3' });
  await assert.rejects(() => api.post('/mos/1/validate', {}), /avant Dolibarr 24/);
});

test('aucune redirection suivie et clé jamais exposée dans les erreurs', async () => {
  const api = new DolibarrAPI('https://erp.example.test/api/index.php', 'SECRETKEY1234567890', { readOnly: true });
  assert.equal(api.client.defaults.maxRedirects, 0);
  api.client.request = async () => {
    const e = new Error('boom SECRETKEY1234567890');
    e.isAxiosError = true;
    e.response = { status: 302, data: 'redirect' };
    throw e;
  };
  await assert.rejects(() => api.get('/invoices'), (e) => !String(e.message).includes('SECRETKEY') && /redirection/.test(e.message));
});

// ---------- USF ----------
test('USF : filtres valides', () => {
  for (const f of ["(t.nom:like:'%Dupont%')", "((t.datef:>=:'2025-01-01') and (t.datef:<=:'2025-12-31'))", '(t.rowid:in:1)', "(t.fk_statut:=:1)"]) assert.ok(isValidUsf(f), f);
});
test('USF : injections refusées', () => {
  for (const f of ["(t.nom:=:'a' or 1=1)", "(t.nom:=:'a');DROP TABLE x", "(t.nom:like:'a\\')", "(t.n om:=:1)", "(t.nom:regexp:'x')", "(1=1)", "", "(t.nom:=:'x'", "(t.a:=:'x')" + " and (t.b:=:'y')".repeat(25), "(" .repeat(20) + "t.a:=:1" + ")".repeat(20)]) {
    assert.ok(!isValidUsf(f), f);
  }
  assert.throws(() => validateUsf("(t.x:=:'" + 'a'.repeat(300) + "')"));
});

// ---------- validation des arguments ----------
const v = (tool, args) => validator.validate(tool, args);
test('validation : propriétés non déclarées, types et bornes', () => {
  assert.throws(() => v('get_invoice', { id: 1, extra: 1 }), /extra/);
  assert.throws(() => v('get_invoice', { id: '../users' }));
  assert.throws(() => v('get_invoice', { id: -1 }));
  assert.throws(() => v('get_invoice', { id: 0 }));
  assert.throws(() => v('get_invoice', { id: 1e15 }));
  assert.throws(() => v('list_invoices', { limit: 100000 }));
  assert.throws(() => v('list_invoices', { sqlfilters: '1=1' }), /USF/);
  assert.throws(() => v('list_invoices', { status: 'free' }));
  assert.throws(() => v('create_invoice', { socid: 1, date: 'demain' }));
  assert.throws(() => v('create_invoice', { socid: 1, note_public: 'x'.repeat(30000) }));
  assert.throws(() => v('create_invoice', { socid: 1, __proto__x: 1 }));
  assert.throws(() => v('create_invoice', JSON.parse('{"socid":1,"__proto__":{"admin":true}}')));
  assert.throws(() => v('create_invoice', { socid: 1, note_public: 'a\u0000b' }));
  assert.throws(() => v('create_invoice', { socid: 1, note_public: 'a‮b' }));
  assert.throws(() => v('get_document', { modulepart: 'facture', original_file: '../../etc/passwd' }));
  assert.throws(() => v('get_document', { modulepart: 'facture', original_file: '/etc/passwd' }));
  assert.throws(() => v('get_document', { modulepart: '../x', original_file: 'a/b.pdf' }));
  assert.doesNotThrow(() => v('list_invoices', { limit: 10, status: 'paid', sqlfilters: "(t.datef:>=:'2025-01-01')" }));
});
test('validation : les arguments d’origine ne sont pas modifiés (copie)', () => {
  const input = { id: '12' };
  const out = v('get_invoice', input);
  assert.equal(out.id, 12);
  assert.equal(input.id, '12');
});
test('tous les schémas exposés interdisent les propriétés supplémentaires', () => {
  for (const t of ALL_TOOLS) assert.equal(validator.schemas.get(t.name).additionalProperties, false, t.name);
});

// ---------- politique ----------
const ro = { ...cfg, mode: 'readonly', allowSensitive: false };
test('mode lecture seule par défaut : aucun outil d’écriture exposé', () => {
  const c = loadConfig({ DOLIBARR_URL: 'https://e.example.test', DOLIBARR_API_KEY: 'k' });
  assert.equal(c.mode, 'readonly');
  for (const t of ALL_TOOLS) assert.equal(isAllowed(t.name, c), classify(t.name) === 'read', t.name);
  assert.ok(ALL_TOOLS.some((t) => isAllowed(t.name, ro)));
});
test('classification fail-closed : un nom inconnu est traité comme écriture', () => {
  assert.equal(classify('frobnicate_things'), 'write');
  assert.equal(classify('list_things'), 'read');
  for (const n of ['delete_document', 'add_payment_to_invoice', 'validate_invoice', 'create_credit_note']) assert.equal(classify(n), 'sensitive');
});
test('readwrite sans MCP_ALLOW_SENSITIVE : outils sensibles masqués', () => {
  const rw = { ...cfg, mode: 'readwrite', allowSensitive: false };
  assert.ok(isAllowed('create_thirdparty', rw));
  assert.ok(!isAllowed('add_payment_to_invoice', rw));
  assert.ok(isAllowed('add_payment_to_invoice', { ...rw, allowSensitive: true }));
  assert.ok(!isAllowed('create_thirdparty', { ...rw, disabledTools: new Set(['create_thirdparty']) }));
  assert.ok(!isAllowed('create_thirdparty', { ...rw, enabledTools: new Set(['get_invoice']) }));
});
test('toute route de modification n’est atteignable que par un outil d’écriture', async () => {
  // En lecture seule, aucun outil « read » ne doit émettre autre chose que du GET.
  const { allArgs, handlerFor } = await import('./helpers.mjs');
  for (const t of ALL_TOOLS.filter((x) => classify(x.name) === 'read')) {
    const { api, calls } = makeApi({ readOnly: true, version: '24.0.1' });
    const args = validator.validate(t.name, allArgs(t));
    try { await handlerFor(t.name)(t.name, args, api, cfg); } catch { /* arguments d'exemple */ }
    assert.ok(calls.every((c) => c.method === 'GET'), t.name);
  }
});

// ---------- configuration ----------
test('config : HTTPS obligatoire hors boucle locale', () => {
  assert.throws(() => normalizeDolibarrUrl('http://erp.example.com', false), /HTTP en clair/);
  assert.equal(normalizeDolibarrUrl('http://127.0.0.1:8080/dolibarr', false), 'http://127.0.0.1:8080/dolibarr/api/index.php');
  assert.equal(normalizeDolibarrUrl('https://erp.example.com/', false), 'https://erp.example.com/api/index.php');
  assert.equal(normalizeDolibarrUrl('https://erp.example.com/api/index.php', false), 'https://erp.example.com/api/index.php');
  assert.throws(() => normalizeDolibarrUrl('https://u:p@erp.example.com', false), /identifiants/);
  assert.throws(() => normalizeDolibarrUrl('https://erp.example.com/?a=1', false));
  assert.throws(() => normalizeDolibarrUrl('ftp://erp.example.com', false));
  assert.doesNotThrow(() => normalizeDolibarrUrl('http://erp.local', true));
});
test('config : variables obligatoires et valeurs invalides', () => {
  assert.throws(() => loadConfig({}), /requis/);
  assert.throws(() => loadConfig({ DOLIBARR_URL: 'https://e.test', DOLIBARR_API_KEY: 'k', MCP_MODE: 'admin' }), /MCP_MODE/);
  assert.throws(() => loadConfig({ DOLIBARR_URL: 'https://e.test', DOLIBARR_API_KEY: 'k', DOLIBARR_VERSION: 'x' }), /DOLIBARR_VERSION/);
  assert.throws(() => loadConfig({ DOLIBARR_URL: 'https://e.test', DOLIBARR_API_KEY: 'k\nX: y' }));
});
test('config HTTP : jeton obligatoire (≥ 32), hôte et origines stricts', () => {
  assert.throws(() => loadHttpConfig({}), /MCP_API_TOKEN/);
  assert.throws(() => loadHttpConfig({ MCP_API_TOKEN: 'court' }), /32/);
  const ok = { MCP_API_TOKEN: 'a'.repeat(40) };
  const c = loadHttpConfig(ok);
  assert.equal(c.host, '127.0.0.1');
  assert.deepEqual(c.allowedOrigins, []);
  assert.throws(() => loadHttpConfig({ ...ok, HOST: 'evil host' }));
  assert.throws(() => loadHttpConfig({ ...ok, MCP_ALLOWED_ORIGINS: 'https://a.test/path' }));
  assert.throws(() => loadHttpConfig({ ...ok, PORT: '99999' }));
});

test('routes : jokers et priorité aux routes littérales', () => {
  assert.ok(checkRoute('POST', '/invoices/paymentsdistributed').ok);
  assert.ok(checkRoute('GET', '/invoices/12').ok);
  assert.ok(!checkRoute('GET', '/invoices/12/secret').ok);
  assert.ok(!checkRoute('TRACE', '/invoices').ok);
});
