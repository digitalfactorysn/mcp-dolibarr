// Utilitaires de test : faux Dolibarr (axios remplacé) + générateur d'arguments valides.
import { DolibarrAPI } from '../build/api.js';
import { ALL_TOOLS, TOOL_SETS } from '../build/server.js';
import { ToolValidator } from '../build/security/validation.js';

export const cfg = {
  dolibarrUrl: 'https://erp.example.test/api/index.php', apiKey: 'k'.repeat(20), dolibarrVersion: null,
  mode: 'readwrite', allowSensitive: true, enabledTools: null, disabledTools: new Set(),
maxResponseChars: 100000,
};

function defaultResponse(c) {
  if (c.method !== 'GET') return 1;
  if (/^\/(invoices|supplierinvoices)\/\d+$/.test(c.url)) return { id: 1, ref: 'FA1', socid: 2, total_ttc: 120, total_ht: 100, lines: [] };
  if (/\/payments$/.test(c.url)) return [];
  if (/^\/tickets\/\d+$/.test(c.url)) return { id: 1, track_id: 'abc123' };
  if (/\/(balance)$/.test(c.url)) return 100;
  if (/\/[a-z_]+$/.test(c.url)) return [];
  return { id: 1 };
}

export function makeApi({ readOnly = false, version = null, respond } = {}) {
  const api = new DolibarrAPI(cfg.dolibarrUrl, cfg.apiKey, { readOnly, dolibarrVersion: version });
  const calls = [];
  api.client.request = async (c) => {
    calls.push({ method: c.method, url: c.url, params: c.params, data: c.data });
    const data = respond ? respond(c) : defaultResponse(c);
    return { data, status: 200 };
  };
  return { api, calls };
}

const validator = new ToolValidator(ALL_TOOLS);
export { validator, ALL_TOOLS, TOOL_SETS };

const DATE = '2025-03-15';
function sample(key, def) {
  if (def.enum) return def.enum[0];
  switch (def.type) {
    case 'integer': case 'number': {
      if (key === 'limit') return 10;
      if (key === 'year') return 2025;
      if (key === 'month' || key === 'start_month') return 3;
      return Math.max(def.minimum ?? 1, 1);
    }
    case 'boolean': return true;
    case 'array': return [sample(key, def.items ?? { type: 'string' })];
    case 'object': return Object.fromEntries(Object.entries(def.properties ?? {}).map(([k, v]) => [k, sample(k, v)]));
    default: {
      if (def.format === 'usf') return "(t.rowid:>:1)";
      if (key === 'sqlfilters') return "(t.rowid:>:1)";
      if (/^phone/.test(key)) return '+590 590 00 00 00';
      if (/email|sendto/.test(key)) return 'a@example.com';
      if (key === 'thirdparty_ids') return '1';
      if (key === 'modulepart') return 'facture';
      if (key === 'original_file') return 'FA2501-0001/FA2501-0001.pdf';
      if (key === 'url') return 'https://example.com/x';
      if (key === 'sortfield') return 't.rowid';
      if ((/^date|_date$|fin_validite/.test(key)) && key !== 'date_format') return DATE;
      if (def.pattern && def.pattern.includes('A-Z0-9_')) return 'ABC_1';
      if (def.pattern === '^[A-Za-z0-9_:.\\-]{1,64}$') return 'abc';
      return 'abc';
    }
  }
}
export function sampleArgs(tool) {
  const props = validator.schemas.get(tool.name).properties ?? {};
  const required = new Set(validator.schemas.get(tool.name).required ?? []);
  const args = {};
  for (const [k, v] of Object.entries(props)) if (required.has(k)) args[k] = sample(k, v);
  return args;
}
export function allArgs(tool) {
  const props = validator.schemas.get(tool.name).properties ?? {};
  return Object.fromEntries(Object.entries(props).map(([k, v]) => [k, sample(k, v)]));
}
export function handlerFor(name) {
  for (const s of TOOL_SETS) if (s.tools.some((t) => t.name === name)) return s.h;
}
