import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const paymentTools: Tool[] = [
  { name: 'list_payments', description: "Lister tous les paiements clients reçus", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, thirdparty_id: { type: 'number', description: 'Filtrer par client' }, date_start: { type: 'string', description: 'Date début ISO 8601' }, date_end: { type: 'string', description: 'Date fin ISO 8601' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_payment', description: "Obtenir les détails d'un paiement client", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'list_supplier_payments', description: "Lister tous les paiements fournisseurs effectués", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, thirdparty_id: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_bank_reconciliation', description: "Obtenir le statut de rapprochement bancaire d'un compte", inputSchema: { type: 'object', properties: { account_id: { type: 'number', description: 'ID du compte bancaire' }, date_start: { type: 'string', description: 'Date début ISO 8601' }, date_end: { type: 'string', description: 'Date fin ISO 8601' } }, required: ['account_id'] } },
  { name: 'list_sepa_direct_debits', description: "Lister les prélèvements SEPA", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=Transmis, 3=Crédité' } } } },
  { name: 'create_sepa_direct_debit', description: "Créer un ordre de prélèvement SEPA", inputSchema: { type: 'object', properties: { label: { type: 'string', description: 'Libellé du prélèvement' }, type: { type: 'string', description: "'direct-debit' (prélèvement) ou 'bank-transfer' (virement)" }, date: { type: 'string', description: 'Date d\'exécution ISO 8601' }, ref_facture: { type: 'string' } }, required: ['label', 'type', 'date'] } },
];

export async function handlePaymentTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_payments': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      if (args.date_start) params.datestart = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.dateend = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      const data = await api.get('/invoices/payments', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_payment': {
      const data = await api.get(`/invoices/payments/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'list_supplier_payments': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/supplierinvoices/payments', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_bank_reconciliation': {
      const params: Record<string, unknown> = {};
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      const data = await api.get(`/bankaccounts/${args.account_id}/lines`, { ...params, limit: 500 });
      const lines = Array.isArray(data) ? data : [];
      const reconciled = lines.filter((l: Record<string, unknown>) => l.rappro == 1).length;
      const unreconciled = lines.filter((l: Record<string, unknown>) => l.rappro != 1).length;
      return JSON.stringify({ total_lignes: lines.length, reconciliees: reconciled, non_reconciliees: unreconciled, lignes: data }, null, 2);
    }
    case 'list_sepa_direct_debits': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) params.status = args.status;
      const data = await api.get('/bonprelevement', params);
      return JSON.stringify(data, null, 2);
    }
    case 'create_sepa_direct_debit': {
      const date = Math.floor(new Date(args.date as string).getTime() / 1000);
      const id = await api.post('/bonprelevement', { ...args, date });
      return `✅ Ordre de prélèvement SEPA créé. ID: ${id}`;
    }
    default: throw new Error(`Outil paiement inconnu: ${name}`);
  }
}
