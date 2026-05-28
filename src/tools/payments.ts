import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const paymentTools: Tool[] = [
  {
    name: 'list_payments',
    description: "Lister les paiements/transactions d'un compte bancaire avec détails (rapprochement inclus)",
    inputSchema: { type: 'object', properties: {
      account_id: { type: 'number', description: 'ID du compte bancaire (défaut: 1 = ECOBANK)' },
      limit: { type: 'number', description: 'Nombre max de transactions (défaut: 50)' },
      date_start: { type: 'string', description: 'Date début ISO 8601 (ex: 2025-01-01)' },
      date_end: { type: 'string', description: 'Date fin ISO 8601 (ex: 2025-12-31)' },
      reconciled_only: { type: 'boolean', description: 'true = paiements rapprochés seulement' },
    } },
  },
  {
    name: 'get_payment',
    description: "Obtenir les détails d'une transaction bancaire spécifique",
    inputSchema: { type: 'object', properties: {
      account_id: { type: 'number', description: 'ID du compte bancaire' },
      line_id: { type: 'number', description: 'ID de la ligne bancaire' },
    }, required: ['account_id', 'line_id'] },
  },
  {
    name: 'list_supplier_payments',
    description: "Lister les factures fournisseurs payées (avec détails paiement)",
    inputSchema: { type: 'object', properties: {
      limit: { type: 'number' },
      thirdparty_id: { type: 'number', description: 'Filtrer par fournisseur' },
      sqlfilters: { type: 'string' },
    } },
  },
  {
    name: 'get_bank_reconciliation',
    description: "Rapport de rapprochement bancaire : lignes rapprochées vs non-rapprochées",
    inputSchema: { type: 'object', properties: {
      account_id: { type: 'number', description: 'ID du compte bancaire' },
      date_start: { type: 'string' },
      date_end: { type: 'string' },
    }, required: ['account_id'] },
  },
];

export async function handlePaymentTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_payments': {
      const accountId = args.account_id || 1;
      const params: Record<string, unknown> = { limit: args.limit || 50 };
      if (args.date_start) params.sqlfilters = `(t.datev:>='${args.date_start}')`;
      if (args.date_end) params.sqlfilters = (params.sqlfilters ? params.sqlfilters + ` AND (t.datev:<='${args.date_end}')` : `(t.datev:<='${args.date_end}')`);
      const data = await api.get(`/bankaccounts/${accountId}/lines`, params) as unknown[];
      const lines = Array.isArray(data) ? data : [];
      const filtered = args.reconciled_only ? lines.filter((l: Record<string, unknown>) => l.rappro == 1) : lines;
      return JSON.stringify(filtered, null, 2);
    }
    case 'get_payment': {
      const data = await api.get(`/bankaccounts/${args.account_id}/lines/${args.line_id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'list_supplier_payments': {
      const params: Record<string, unknown> = { limit: args.limit || 100, status: 2 };
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/supplierinvoices', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_bank_reconciliation': {
      const params: Record<string, unknown> = { limit: 500 };
      const data = await api.get(`/bankaccounts/${args.account_id}/lines`, params) as unknown[];
      const lines = Array.isArray(data) ? data : [];
      const reconciled = lines.filter((l: Record<string, unknown>) => l.rappro == 1);
      const unreconciled = lines.filter((l: Record<string, unknown>) => l.rappro != 1);
      const totalCredit = reconciled.filter((l: Record<string, unknown>) => Number(l.amount) > 0).reduce((s: number, l: Record<string, unknown>) => s + Number(l.amount), 0);
      const totalDebit = reconciled.filter((l: Record<string, unknown>) => Number(l.amount) < 0).reduce((s: number, l: Record<string, unknown>) => s + Number(l.amount), 0);
      return JSON.stringify({
        compte_id: args.account_id,
        total_lignes: lines.length,
        reconciliees: reconciled.length,
        non_reconciliees: unreconciled.length,
        total_credits_rapproches: totalCredit.toFixed(2),
        total_debits_rapproches: Math.abs(totalDebit).toFixed(2),
        lignes_non_rapprochees: unreconciled.slice(0, 10),
      }, null, 2);
    }
    default: throw new Error(`Outil paiement inconnu: ${name}`);
  }
}
