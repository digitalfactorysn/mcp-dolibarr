import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const ACCOUNT_ID = 3; // TEST_AUTO_BN — jamais 1
if (ACCOUNT_ID === 1) throw new Error('Refus: compte de production');

const t = new StreamableHTTPClientTransport(new URL('https://mcp.digitalfactory.sn/mcp'), {
  requestInit: { headers: { Authorization: `Bearer ${process.env.MCP_API_TOKEN}` } },
});
const c = new Client({ name: 'bank-write-test', version: '1.0.0' }, { capabilities: {} });
await c.connect(t);

const call = async (name, args) => {
  const r = await c.callTool({ name, arguments: args });
  const txt = r.content[0].text;
  try { return JSON.parse(txt); } catch { return { raw: txt, isError: r.isError }; }
};
const dol = async (id) => (await fetch(`${process.env.DOLIBARR_URL}/bankaccounts/${id}`, { headers: { DOLAPIKEY: process.env.DOLIBARR_API_KEY } })).json();
const state = async () => {
  const b = await dol(ACCOUNT_ID);
  return { ref: b.ref, account_number: b.account_number, journal: b.accountancy_journal, fk: b.fk_accountancy_journal, balance: b.balance };
};
const ok = [];
const step = async (label, code) => {
  const r = await call('configure_bank_accounting', { account_id: ACCOUNT_ID, accounting_number: '521109', journal_code: code });
  const s = await state();
  const pass = r.applied === true && r.verified === true && r.journal_code === code && s.journal === code;
  ok.push(pass);
  console.log(`${label}: tool={applied:${r.applied}, verified:${r.verified}, journal:${r.journal_code}} | relecture indépendante=${JSON.stringify(s)} → ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) console.log(JSON.stringify(r, null, 2));
};

console.log('État initial #3 :', JSON.stringify(await state()));
const prod0 = await dol(1);
console.log('ECOBANK #1 avant :', prod0.account_number, prod0.accountancy_journal);

await step('1. BNQ → BQ ', 'BQ');
await step('2. BQ → BNQ ', 'BNQ');

// Cas négatif : journal inexistant ne doit jamais produire applied:true silencieux sur un autre journal
const neg = await call('configure_bank_accounting', { account_id: 1, journal_code: 'BQ' });
console.log('3. Protection #1 :', neg.error === 'PRODUCTION_ACCOUNT_PROTECTED' ? 'PASS' : 'FAIL');
ok.push(neg.error === 'PRODUCTION_ACCOUNT_PROTECTED');

const prod1 = await dol(1);
const untouched = prod1.account_number === prod0.account_number && prod1.accountancy_journal === prod0.accountancy_journal;
console.log('ECOBANK #1 après :', prod1.account_number, prod1.accountancy_journal, untouched ? '(inchangé ✅)' : '(MODIFIÉ ❌)');
ok.push(untouched);

console.log('État final #3 :', JSON.stringify(await state()));

// get_bank_account via MCP doit concorder avec la relecture REST
const viaMcp = await call('get_bank_account', { id: ACCOUNT_ID });
const mcpOk = viaMcp.accountancy_journal === 'BNQ' && viaMcp.account_number === '521109';
console.log('4. get_bank_account (MCP) :', mcpOk ? 'PASS' : 'FAIL', viaMcp.accountancy_journal, viaMcp.account_number);
ok.push(mcpOk);

// Pagination des constantes : toutes les correspondances doivent être atteignables
const p0 = await call('get_setup_values', { module: 'ACCOUNTING', limit: 20, page: 0 });
const p1 = await call('get_setup_values', { module: 'ACCOUNTING', limit: 20, page: 1 });
const all = new Set([...Object.keys(p0.constants), ...Object.keys(p1.constants)]);
const pagOk = p0.has_more === true && p1.has_more === false && all.size === p0.total_matches;
console.log(`5. Pagination ACCOUNTING : total=${p0.total_matches}, p0=${p0.returned_count}, p1=${p1.returned_count}, uniques=${all.size} →`, pagOk ? 'PASS' : 'FAIL');
ok.push(pagOk);
console.log(ok.every(Boolean) ? '\n✅ TEST D’ÉCRITURE RÉVERSIBLE : PASS' : '\n❌ TEST D’ÉCRITURE : FAIL');
process.exit(ok.every(Boolean) ? 0 : 1);
