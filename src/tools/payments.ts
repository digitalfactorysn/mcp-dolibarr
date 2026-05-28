import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

type R = Record<string, unknown>;

export const paymentTools: Tool[] = [
  { name: 'list_payments', description: "Lister les transactions d'un compte bancaire (paiements reçus)", inputSchema: { type: 'object', properties: { account_id: { type: 'number', description: 'ID compte bancaire (défaut: 1 = ECOBANK)' }, limit: { type: 'number' }, date_start: { type: 'string' }, date_end: { type: 'string' }, reconciled_only: { type: 'boolean' } } } },
  { name: 'get_payment', description: "Détails d'une transaction bancaire", inputSchema: { type: 'object', properties: { account_id: { type: 'number' }, line_id: { type: 'number' } }, required: ['account_id', 'line_id'] } },
  { name: 'list_supplier_payments', description: "Lister les factures fournisseurs payées", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, thirdparty_id: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_bank_reconciliation', description: "Rapport de rapprochement bancaire (lignes rapprochées vs non-rapprochées)", inputSchema: { type: 'object', properties: { account_id: { type: 'number' }, date_start: { type: 'string' }, date_end: { type: 'string' } }, required: ['account_id'] } },
];

export async function handlePaymentTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_payments': {
      const accountId = args.account_id || 1;
      const params: R = { limit: args.limit || 50 };
      if (args.date_start) params.sqlfilters = `(t.datev:>='${args.date_start}')`;
      const data = (await api.get<unknown[]>(`/bankaccounts/${accountId}/lines`, params) as unknown[]) as R[];
      const filtered = args.reconciled_only ? data.filter(l => l.rappro == 1) : data;
      return JSON.stringify(filtered, null, 2);
    }
    case 'get_payment':
      return JSON.stringify(await api.get(`/bankaccounts/${args.account_id}/lines/${args.line_id}`), null, 2);
    case 'list_supplier_payments': {
      const params: R = { limit: args.limit || 100, status: 2 };
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return JSON.stringify(await api.get('/supplierinvoices', params), null, 2);
    }
    case 'get_bank_reconciliation': {
      const lines = ((await api.get<unknown[]>(`/bankaccounts/${args.account_id}/lines`, { limit: 500 })) as unknown[]) as R[];
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
