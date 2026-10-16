import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig, loadHttpConfig } from '../build/config.js';
import { createApp } from '../build/http.js';

const TOKEN = 't'.repeat(48);
const seen = []; // requêtes reçues par le faux Dolibarr
const leaked = []; // requêtes reçues par un hôte « tiers » (cible de redirection)
let dolibarr, other, mcp, base, closeApp, sessionCount;

const listen = (srv) => new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));

before(async () => {
  other = http.createServer((req, res) => { leaked.push({ url: req.url, key: req.headers.dolapikey }); res.end('{}'); });
  const otherPort = await listen(other);
  dolibarr = http.createServer((req, res) => {
    seen.push({ method: req.method, url: req.url, key: req.headers.dolapikey });
    if (req.url.includes('/invoices/302')) { res.writeHead(302, { Location: `http://127.0.0.1:${otherPort}/steal` }); return res.end(); }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(req.url.includes('/invoices/') ? { id: 1, ref: 'FA1' } : []));
  });
  const dPort = await listen(dolibarr);
  const cfg = loadConfig({ DOLIBARR_URL: `http://127.0.0.1:${dPort}`, DOLIBARR_API_KEY: 'DOLIKEY-0123456789', DOLIBARR_VERSION: '24.0.1' });
  mcp = http.createServer();
  const port = await listen(mcp);
  const hc = loadHttpConfig({ MCP_API_TOKEN: TOKEN, PORT: String(port), MCP_MAX_SESSIONS: '2', MCP_AUTH_FAILURES_PER_MINUTE: '5' });
  const created = createApp(cfg, hc);
  const { app, close } = created;
  sessionCount = () => created.sessions.size;
  closeApp = close;
  mcp.on('request', app);
  base = `http://127.0.0.1:${port}`;
});
after(async () => {
  await closeApp?.();
  for (const s of [mcp, dolibarr, other]) s?.closeAllConnections?.();
  for (const s of [mcp, dolibarr, other]) s?.close();
});

const raw = (path, { method = 'GET', headers = {}, body } = {}) =>
  fetch(base + path, { method, headers, body });

test('/health est minimal et sans information interne', async () => {
  const r = await raw('/health');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { status: 'ok' });
});

test('authentification obligatoire sur /mcp', async () => {
  for (const headers of [{}, { Authorization: 'Bearer wrong' }, { Authorization: TOKEN }, { Authorization: 'Basic ' + TOKEN }, { Authorization: `Bearer ${TOKEN}x` }]) {
    const r = await raw('/mcp', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: '{}' });
    assert.equal(r.status, 401, JSON.stringify(headers));
  }
});

test('DNS rebinding : Host non autorisé refusé même avec le bon jeton', async () => {
  const r = await new Promise((resolve) => {
    const u = new URL(base);
    const req = http.request({ host: u.hostname, port: u.port, path: '/mcp', method: 'POST', headers: { Host: 'evil.example.com', Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' } }, (res) => { res.resume(); resolve(res.statusCode); });
    req.end('{}');
  });
  assert.equal(r, 403);
});

test('Origin non listée refusée, aucun CORS ouvert', async () => {
  const r = await raw('/mcp', { method: 'POST', headers: { Origin: 'https://evil.example.com', Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('access-control-allow-origin'), null);
  const r2 = await raw('/mcp', { method: 'OPTIONS', headers: { Origin: 'https://evil.example.com' } });
  assert.equal(r2.status, 403);
});

test('corps trop volumineux et JSON invalide : erreurs génériques', async () => {
  const h = { Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };
  const big = await raw('/mcp', { method: 'POST', headers: h, body: JSON.stringify({ a: 'x'.repeat(2_000_000) }) });
  assert.equal(big.status, 413);
  const bad = await raw('/mcp', { method: 'POST', headers: h, body: '{oops' });
  assert.equal(bad.status, 400);
  assert.ok(!(await bad.text()).includes('SyntaxError'));
});

async function connect() {
  const client = new Client({ name: 'test', version: '1' });
  const transport = new StreamableHTTPClientTransport(new URL(base + '/mcp'), { requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } } });
  await client.connect(transport);
  return client;
}

test('de bout en bout : lecture seule — outils d’écriture invisibles et refusés', async () => {
  const client = await connect();
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    assert.ok(names.includes('get_invoice'));
    assert.ok(!names.includes('create_invoice'));
    assert.ok(!names.includes('delete_document'));
    assert.ok(tools.every((t) => t.annotations?.readOnlyHint === true));
    assert.ok(tools.every((t) => t.inputSchema.additionalProperties === false));

    const before = seen.length;
    const res = await client.callTool({ name: 'create_invoice', arguments: { socid: 1 } });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /lecture seule/);
    assert.equal(seen.length, before, 'aucune requête ne doit atteindre Dolibarr');

    const ok = await client.callTool({ name: 'get_invoice', arguments: { id: 1 } });
    assert.ok(!ok.isError);
    const last = seen.at(-1);
    assert.equal(last.method, 'GET');
    assert.match(last.url, /\/api\/index\.php\/invoices\/1$/);
    assert.equal(last.key, 'DOLIKEY-0123456789');

    const bad = await client.callTool({ name: 'get_invoice', arguments: { id: '1/../../users' } });
    assert.equal(bad.isError, true);
    assert.ok(!seen.at(-1).url.includes('users'));
  } finally {
    await client.close();
  }
});

test('une redirection de Dolibarr n’est pas suivie : la clé ne fuit pas', async () => {
  const client = await connect();
  try {
    const res = await client.callTool({ name: 'get_invoice', arguments: { id: 302 } });
    assert.equal(res.isError, true);
    assert.match(res.content[0].text, /redirection/);
    assert.equal(leaked.length, 0);
    assert.ok(!JSON.stringify(res).includes('DOLIKEY'));
  } finally {
    await client.close();
  }
});

test('nombre de sessions borné : la plus ancienne est évincée', async () => {
  const a = await connect();
  const b = await connect();
  const c = await connect(); // dépasse MCP_MAX_SESSIONS=2
  try {
    assert.ok(sessionCount() <= 2);
    await c.listTools(); // la plus récente fonctionne
    await assert.rejects(() => a.listTools()); // la plus ancienne a été évincée
  } finally {
    for (const x of [a, b, c]) await x.close().catch(() => undefined);
  }
});

test('limite d’essais d’authentification (429)', async () => {
  let last;
  for (let i = 0; i < 12; i++) last = (await raw('/mcp', { method: 'POST', headers: { Authorization: 'Bearer nope', 'content-type': 'application/json' }, body: '{}' })).status;
  assert.equal(last, 429);
});
