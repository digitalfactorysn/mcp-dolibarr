import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { dateRangeFilter, objectStatus, toTimestamp } from '../validation.js';

export const accountingTools: Tool[] = [
  {
    name: 'list_bank_accounts',
    description: 'Lister les comptes bancaires de la société avec leur solde actuel',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'number', description: '1=Actifs seulement (défaut), 0=Tous' },
      },
    },
  },
  {
    name: 'get_bank_transactions',
    description: "Lister les transactions d'un compte bancaire avec filtres de date",
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        limit: { type: 'number', description: 'Nombre max de transactions (les plus récentes, défaut: 50)' },
        sqlfilters: { type: 'string', description: "Filtre Dolibarr, ex: (t.datev:>=:'2025-01-01')" },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'add_bank_transaction',
    description: "Ajouter une opération bancaire manuelle (entrée ou sortie de trésorerie)",
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        date: { type: 'string', description: "Date de l'opération ISO 8601" },
        amount: { type: 'number', description: 'Montant (positif=crédit, négatif=débit)' },
        label: { type: 'string', description: "Libellé de l'opération" },
        num_chq: { type: 'string', description: 'Numéro de chèque ou référence' },
        fk_type: { type: 'string', description: "Type: 'VIR', 'CHQ', 'CB', 'LIQ', 'PRV', 'AC'" },
      },
      required: ['account_id', 'date', 'amount', 'label'],
    },
  },
  {
    name: 'get_financial_summary',
    description: "Obtenir un résumé financier: CA total, factures impayées, balance de trésorerie et indicateurs clés",
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Année fiscale (ex: 2025). Si vide: année en cours' },
      },
    },
  },
];

export async function handleAccountingTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_bank_accounts': {
      // status=1 (défaut) : comptes ouverts uniquement
      const params: Record<string, unknown> = {};
      if ((args.status ?? 1) === 1) params.sqlfilters = '(t.clos:=:0)';
      const data = await api.listAll('/bankaccounts', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_bank_transactions': {
      const params: Record<string, unknown> = {};
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      // Endpoint non paginé : on tronque côté serveur MCP
      const data = await api.get<unknown>(`/bankaccounts/${args.account_id}/lines`, params);
      const lines = Array.isArray(data) ? data : [];
      return JSON.stringify(lines.slice(-(Number(args.limit) || 50)), null, 2);
    }
    case 'add_bank_transaction': {
      const date = args.date ? toTimestamp(args.date) : Math.floor(Date.now() / 1000);
      const payload = {
        date,
        amount: args.amount,
        label: args.label,
        cheque_number: args.num_chq || '',
        type: args.fk_type || 'VIR',
      };
      const lineId = await api.post(`/bankaccounts/${args.account_id}/lines`, payload);
      return `✅ Opération bancaire enregistrée. ID transaction: ${lineId}
Compte: #${args.account_id} | Montant: ${args.amount}`;
    }
    case 'get_financial_summary': {
      const year = Number(args.year) || new Date().getFullYear();
      const [invoices, bankAccounts] = await Promise.all([
        api.listAll('/invoices', { sqlfilters: dateRangeFilter('t.datef', `${year}-01-01`, `${year}-12-31`) }),
        api.listAll('/bankaccounts', { sqlfilters: '(t.clos:=:0)' }),
      ]);
      // Factures validées uniquement (1=impayée, 2=payée) ; les avoirs ont des montants négatifs
      const validated = invoices.filter(inv => [1, 2].includes(objectStatus(inv)));
      const unpaid = validated.filter(inv => objectStatus(inv) === 1);
      const sum = (arr: Record<string, unknown>[], f: string) => arr.reduce((s, inv) => s + Number(inv[f] || 0), 0);

      return JSON.stringify({
        annee: year,
        chiffre_affaires_HT: sum(validated, 'total_ht').toFixed(2),
        chiffre_affaires_TTC: sum(validated, 'total_ttc').toFixed(2),
        nb_factures_validees: validated.length,
        total_factures_impayees_TTC: unpaid.reduce((s, inv) => s + Number(inv.remaintopay ?? inv.total_ttc ?? 0), 0).toFixed(2),
        nb_factures_impayees: unpaid.length,
        solde_tresorerie_total: sum(bankAccounts, 'balance').toFixed(2),
        nb_comptes_bancaires: bankAccounts.length,
      }, null, 2);
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}


