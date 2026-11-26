#!/usr/bin/env node
/**
 * Verification du mode HTTP durci (audit 26/11/2026 : F-01, F-03, F-07). Lance build/http.js avec une
 * fausse instance Dolibarr (aucun appel reel : initialize et tools/list ne la contactent pas) et rejoue
 * les attaques du rapport. Usage : npm run build && node scripts/check_http_hardening.mjs
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import http from 'node:http';

const PORT = 3911;
const TOKEN = 'jeton-de-test-' + 'x'.repeat(24) + Math.random().toString(36).slice(2);
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

function start(env) {
  return spawn(process.execPath, ['build/http.js'], {
    env: { PATH: process.env.PATH, DOLIBARR_URL: 'http://127.0.0.1:9/api/index.php', DOLIBARR_API_KEY: 'cle-factice', PORT: String(PORT), ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'audit', version: '1' } } };
const post = (body, headers = {}) => fetch(`${BASE}/mcp`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers },
  body: JSON.stringify(body),
});

// 1. Sans jeton : le serveur refuse de demarrer.
{
  const p = start({});
  const code = await new Promise((r) => p.on('exit', r));
  check('sans MCP_API_TOKEN le serveur ne demarre pas', code !== 0, `code ${code}`);
}

// 1b. Jeton trop court : refuse.
{
  const p = start({ MCP_API_TOKEN: 'court' });
  const code = await new Promise((r) => p.on('exit', r));
  check('jeton de moins de 32 caracteres refuse', code !== 0, `code ${code}`);
}

// 2. Avec jeton.
const p = start({ MCP_API_TOKEN: TOKEN, MCP_MAX_SESSIONS: '3', MCP_RATE_LIMIT_PER_MIN: '1000' });
let logs = '';
p.stderr.on('data', (d) => { logs += d; });
for (let i = 0; i < 50; i++) { try { await fetch(`${BASE}/health`); break; } catch { await sleep(100); } }

const health = await (await fetch(`${BASE}/health`)).json();
check('/health ne renvoie que {"status":"ok"}', JSON.stringify(health) === '{"status":"ok"}', JSON.stringify(health));

check('POST /mcp sans jeton → 401', (await post(init)).status === 401);
check('POST /mcp mauvais jeton → 401', (await post(init, { Authorization: 'Bearer faux' })).status === 401);

const auth = { Authorization: `Bearer ${TOKEN}` };
const ok = await post(init, auth);
check('POST /mcp bon jeton → 200', ok.status === 200, `statut ${ok.status}`);

const rebindingStatus = await new Promise((resolve) => {
  const body = JSON.stringify(init);
  const req = http.request({ host: '127.0.0.1', port: PORT, path: '/mcp', method: 'POST', headers: {
    Host: 'evil.test:3911', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
    'Content-Length': Buffer.byteLength(body), ...auth } }, (res) => { res.resume(); resolve(res.statusCode); });
  req.on('error', () => resolve(0));
  req.end(body);
});
check('Host non autorise (DNS rebinding) refuse', rebindingStatus === 403, `statut ${rebindingStatus}`);

const pre = await fetch(`${BASE}/mcp`, { method: 'OPTIONS', headers: { Origin: 'http://evil.test', 'Access-Control-Request-Method': 'POST' } });
check('pas de CORS « * » pour une origine inconnue', pre.headers.get('access-control-allow-origin') === null && pre.status === 403, `statut ${pre.status}`);

// Plafond de sessions (3) : la 4e ouverture est refusee (1 deja ouverte plus haut).
const statuses = [];
for (let i = 0; i < 3; i++) statuses.push((await post(init, auth)).status);
check('plafond de sessions applique (503 au-dela)', statuses.includes(503), statuses.join(','));

check('journal sans URL Dolibarr ni jeton', !logs.includes(TOKEN) && !logs.includes('cle-factice'));

p.kill('SIGTERM');
await sleep(300);
const failed = results.filter((r) => !r).length;
console.log(failed === 0 ? `\nTout est conforme (${results.length} verifications).` : `\n${failed} echec(s).`);
process.exit(failed === 0 ? 0 : 1);
