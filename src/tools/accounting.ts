import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

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
        limit: { type: 'number', description: 'Nombre max de transactions' },
        sqlfilters: { type: 'string', description: "Filtre SQL ex: (t.datev:>='2025-01-01')" },
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
    name: 'list_accounting_accounts',
    description: 'Lister les comptes du plan comptable (nécessite module Comptabilité Avancée)',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: "Filtrer par type: 'CUST', 'SUPPLIER', 'BANK', 'FISC'" },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'list_accounting_journals',
    description: 'Lister les journaux comptables (Ventes, Achats, Banque, OD...)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_accounting_entries',
    description: 'Lister les écritures comptables du grand livre',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max' },
        journal_code: { type: 'string', description: 'Code journal (ex: VTE, ACH, BNK)' },
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
      },
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
      const params: Record<string, unknown> = {};
      if (args.status !== undefined) params.status = args.status;
      else params.status = 1;
      const data = await api.get('/bankaccounts', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_bank_transactions': {
      const params: Record<string, unknown> = { limit: args.limit || 50 };
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get(`/bankaccounts/${args.account_id}/lines`, params);
      return JSON.stringify(data, null, 2);
    }
    case 'add_bank_transaction': {
      const date = args.date ? Math.floor(new Date(args.date as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const payload = {
        date,
        amount: args.amount,
        label: args.label,
        num_chq: args.num_chq || '',
        type: args.fk_type || 'VIR',
      };
      const lineId = await api.post(`/bankaccounts/${args.account_id}/lines`, payload);
      return `✅ Opération bancaire enregistrée. ID transaction: ${lineId}\nCompte: #${args.account_id} | Montant: ${args.amount}`;
    }
    case 'list_accounting_accounts': {
      const params: Record<string, unknown> = { limit: args.limit || 200 };
      if (args.type) params.type = args.type;
      const data = await api.get('/accountancy/account', params);
      return JSON.stringify(data, null, 2);
    }
    case 'list_accounting_journals': {
      const data = await api.get('/accountancy/journal');
      return JSON.stringify(data, null, 2);
    }
    case 'list_accounting_entries': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.journal_code) params.journal_code = args.journal_code;
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      const data = await api.get('/accountancy/bookkeeping', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_financial_summary': {
      const year = args.year || new Date().getFullYear();
      const startTs = Math.floor(new Date(`${year}-01-01`).getTime() / 1000);
      const endTs = Math.floor(new Date(`${year}-12-31`).getTime() / 1000);

      // Factures validées de l'année
      const [paidInvoices, unpaidInvoices, bankAccounts] = await Promise.all([
        api.get<unknown[]>('/invoices', { status: 2, limit: 500, sqlfilters: `(t.datef:>='${year}-01-01') and (t.datef:<='${year}-12-31')` }),
        api.get<unknown[]>('/invoices', { status: 1, limit: 500 }),
        api.get<unknown[]>('/bankaccounts', { status: 1 }),
      ]);

      const paidArr = Array.isArray(paidInvoices) ? paidInvoices : [];
      const unpaidArr = Array.isArray(unpaidInvoices) ? unpaidInvoices : [];
      const bankArr = Array.isArray(bankAccounts) ? bankAccounts : [];

      const totalCA = paidArr.reduce((s: number, inv: unknown) => s + ((inv as Record<string, number>).total_ttc || 0), 0);
      const totalUnpaid = unpaidArr.reduce((s: number, inv: unknown) => s + ((inv as Record<string, number>).total_ttc || 0), 0);
      const totalBalance = bankArr.reduce((s: number, acc: unknown) => s + ((acc as Record<string, number>).balance || 0), 0);

      return JSON.stringify({
        annee: year,
        chiffre_affaires_TTC: totalCA.toFixed(2),
        nb_factures_payees: paidArr.length,
        total_factures_impayees_TTC: totalUnpaid.toFixed(2),
        nb_factures_impayees: unpaidArr.length,
        solde_tresorerie_total: totalBalance.toFixed(2),
        nb_comptes_bancaires: bankArr.length,
      }, null, 2);
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
