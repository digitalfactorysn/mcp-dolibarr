import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { dateRangeFilter } from '../validation.js';

type R = Record<string, unknown>;

export const paymentTools: Tool[] = [
  { name: 'list_payments', description: "Lister les transactions d'un compte bancaire", inputSchema: { type: 'object', properties: { account_id: { type: 'number', description: 'ID compte bancaire (list_bank_accounts)' }, limit: { type: 'number' }, date_start: { type: 'string', description: 'AAAA-MM-JJ (date de valeur)' }, date_end: { type: 'string', description: 'AAAA-MM-JJ (date de valeur)' }, reconciled_only: { type: 'boolean' } }, required: ['account_id'] } },
  { name: 'get_payment', description: "Détails d'une transaction bancaire", inputSchema: { type: 'object', properties: { account_id: { type: 'number' }, line_id: { type: 'number' } }, required: ['account_id', 'line_id'] } },
  { name: 'list_supplier_payments', description: "Lister les factures fournisseurs payées", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, thirdparty_id: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_bank_reconciliation', description: "Rapport de rapprochement bancaire (lignes rapprochées vs non-rapprochées)", inputSchema: { type: 'object', properties: { account_id: { type: 'number' }, date_start: { type: 'string', description: 'AAAA-MM-JJ' }, date_end: { type: 'string', description: 'AAAA-MM-JJ' } }, required: ['account_id'] } },
];

// /bankaccounts/{id}/lines n'est pas paginé : il renvoie toutes les lignes correspondant au filtre
async function bankLines(api: DolibarrAPI, accountId: unknown, sqlfilters?: string): Promise<R[]> {
  const data = await api.get<unknown>(`/bankaccounts/${accountId}/lines`, sqlfilters ? { sqlfilters } : {});
  return (Array.isArray(data) ? data : []) as R[];
}

export async function handlePaymentTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_payments': {
      const data = await bankLines(api, args.account_id, dateRangeFilter('t.datev', args.date_start, args.date_end));
      const filtered = args.reconciled_only ? data.filter(l => l.rappro == 1) : data;
      return JSON.stringify(filtered.slice(0, Number(args.limit) || 50), null, 2);
    }
    case 'get_payment': {
      // Pas d'endpoint pour une ligne seule : filtrer la liste du compte sur l'ID
      const lines = await bankLines(api, args.account_id, `(t.rowid:=:${Number(args.line_id)})`);
      if (!lines.length) throw new Error(`Ligne #${args.line_id} introuvable sur le compte #${args.account_id}.`);
      return JSON.stringify(lines[0], null, 2);
    }
    case 'list_supplier_payments': {
      const params: R = { limit: args.limit || 100, status: 'paid' };
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return JSON.stringify(await api.get('/supplierinvoices', params), null, 2);
    }
    case 'get_bank_reconciliation': {
      const lines = await bankLines(api, args.account_id, dateRangeFilter('t.datev', args.date_start, args.date_end));
      const rec   = lines.filter(l => l.rappro == 1);
      const unrec = lines.filter(l => l.rappro != 1);
      const totalCredit = rec.filter(l => Number(l.amount) > 0).reduce((s, l) => s + Number(l.amount), 0);
      const totalDebit  = rec.filter(l => Number(l.amount) < 0).reduce((s, l) => s + Number(l.amount), 0);
      return JSON.stringify({
        compte_id: args.account_id,
        total_lignes: lines.length,
        reconciliees: rec.length,
        non_reconciliees: unrec.length,
        total_credits_rapproches: totalCredit.toFixed(2),
        total_debits_rapproches: Math.abs(totalDebit).toFixed(2),
        lignes_non_rapprochees: unrec.slice(0, 10),
      }, null, 2);
    }
    default: throw new Error(`Outil paiement inconnu: ${name}`);
  }
}
