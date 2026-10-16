import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { andFilters, dateRange, eqNum, json, money, num, paging } from './_util.js';

type R = Record<string, unknown>;

export const paymentTools: Tool[] = [
  { name: 'list_payments', description: "Lister les transactions d'un compte bancaire (paiements reçus)", inputSchema: { type: 'object', properties: { account_id: { type: 'number', description: 'ID compte bancaire' }, limit: { type: 'number' }, date_start: { type: 'string' }, date_end: { type: 'string' }, reconciled_only: { type: 'boolean' } }, required: ['account_id'] } },
  { name: 'get_payment', description: "Détails d'une transaction bancaire", inputSchema: { type: 'object', properties: { account_id: { type: 'number' }, line_id: { type: 'number' } }, required: ['account_id', 'line_id'] } },
  { name: 'list_supplier_payments', description: "Lister les factures fournisseurs payées", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, thirdparty_id: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_bank_reconciliation', description: "Rapport de rapprochement bancaire (lignes rapprochées vs non-rapprochées)", inputSchema: { type: 'object', properties: { account_id: { type: 'number' }, date_start: { type: 'string' }, date_end: { type: 'string' } }, required: ['account_id'] } },
];

export async function handlePaymentTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  const bankLines = async (extra?: string) => {
    const sqlfilters = andFilters(dateRange('t.datev', args.date_start, args.date_end), extra);
    const data = await api.get<unknown[]>(`/bankaccounts/${args.account_id}/lines`, { sqlfilters });
    return (Array.isArray(data) ? data : []) as R[];
  };
  switch (name) {
    case 'list_payments': {
      const lines = await bankLines(args.reconciled_only ? eqNum('t.rappro', 1) : undefined);
      const limit = Number(args.limit ?? 50);
      return json({ total: lines.length, lignes: lines.slice(-limit) });
    }
    case 'get_payment':
      return json(await api.get(`/bankaccounts/lines/${args.line_id}`));
    case 'list_supplier_payments': {
      const { limit, page } = paging(args);
      return json(await api.get('/supplierinvoices', { limit, page, status: 'paid', thirdparty_ids: args.thirdparty_id === undefined ? undefined : String(args.thirdparty_id), sqlfilters: args.sqlfilters }));
    }
    case 'get_bank_reconciliation': {
      const lines = await bankLines();
      const rec = lines.filter((l) => num(l.rappro) === 1);
      const unrec = lines.filter((l) => num(l.rappro) !== 1);
      const totalCredit = rec.filter((l) => num(l.amount) > 0).reduce((s, l) => s + num(l.amount), 0);
      const totalDebit = rec.filter((l) => num(l.amount) < 0).reduce((s, l) => s + num(l.amount), 0);
      return json({
        compte_id: args.account_id,
        total_lignes: lines.length,
        reconciliees: rec.length,
        non_reconciliees: unrec.length,
        total_credits_rapproches: money(totalCredit),
        total_debits_rapproches: money(Math.abs(totalDebit)),
        lignes_non_rapprochees: unrec.slice(0, 10),
      });
    }
    default: throw new Error(`Outil paiement inconnu: ${name}`);
  }
}
