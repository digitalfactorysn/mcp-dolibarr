import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI, toUnix } from '../api.js';
import { andFilters, dateRange, fetchAll, json, money, num } from './_util.js';

type R = Record<string, unknown>;

export const accountingTools: Tool[] = [
  {
    name: 'list_bank_accounts',
    description: 'Lister les comptes bancaires (ouverts par défaut) avec leur solde actuel.',
    inputSchema: {
      type: 'object',
      properties: {
        include_closed: { type: 'boolean', description: 'Inclure les comptes clôturés (défaut : non)' },
      },
    },
  },
  {
    name: 'get_bank_transactions',
    description: "Lister les écritures bancaires d'un compte. Filtrer par période avec date_start/date_end (AAAA-MM-JJ) ou sqlfilters.",
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        date_start: { type: 'string', description: 'Date de valeur minimale (AAAA-MM-JJ)' },
        date_end: { type: 'string', description: 'Date de valeur maximale (AAAA-MM-JJ)' },
        limit: { type: 'number', description: 'Nombre max de lignes renvoyées (défaut 50, les plus récentes en dernier)' },
        sqlfilters: { type: 'string', description: "Filtre USF, ex. (t.amount:>:100)" },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'add_bank_transaction',
    description: "Ajouter une opération bancaire manuelle (entrée ou sortie de trésorerie) sur un compte.",
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        date: { type: 'string', description: "Date de l'opération ISO 8601" },
        amount: { type: 'number', description: 'Montant (positif=crédit, négatif=débit)' },
        label: { type: 'string', description: "Libellé de l'opération" },
        cheque_number: { type: 'string', description: 'Numéro de chèque ou référence' },
        type: { type: 'string', description: "Mode : 'VIR', 'CHQ', 'CB', 'LIQ', 'PRE', 'VAD'" },
      },
      required: ['account_id', 'date', 'amount', 'label'],
    },
  },
  {
    name: 'get_financial_summary',
    description:
      "Synthèse d'une année : facturé (factures validées), encaissé, reste à encaisser (clients) et soldes bancaires. Calculé depuis les factures clients validées de l'année.",
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Année (défaut : année en cours)' },
      },
    },
  },
];

export async function handleAccountingTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_bank_accounts': {
      const sqlfilters = args.include_closed ? undefined : '(t.clos:=:0)';
      return json(await api.get('/bankaccounts', { limit: 100, sqlfilters }));
    }
    case 'get_bank_transactions': {
      // L'API Dolibarr n'a pas de pagination sur les lignes : on borne côté serveur.
      const sqlfilters = andFilters(dateRange('t.datev', args.date_start, args.date_end), args.sqlfilters as string | undefined);
      const lines = await api.get<unknown[]>(`/bankaccounts/${args.account_id}/lines`, { sqlfilters });
      const arr = Array.isArray(lines) ? lines : [];
      const limit = Number(args.limit ?? 50);
      return json({ total: arr.length, affichees: Math.min(limit, arr.length), lignes: arr.slice(-limit) });
    }
    case 'add_bank_transaction': {
      const payload: R = {
        date: toUnix(args.date),
        amount: args.amount,
        label: args.label,
        type: args.type ?? 'VIR',
      };
      if (args.cheque_number) payload.cheque_number = args.cheque_number;
      const lineId = await api.post(`/bankaccounts/${args.account_id}/lines`, payload);
      return `✅ Opération bancaire enregistrée. ID transaction: ${lineId}\nCompte: #${args.account_id} | Montant: ${args.amount}`;
    }
    case 'get_financial_summary': {
      const year = Number(args.year) || new Date().getFullYear();
      const sqlfilters = dateRange('t.datef', `${year}-01-01`, `${year}-12-31`);
      const [inv, accounts] = await Promise.all([
        fetchAll<R>(api, '/invoices', { status: 'unpaid', sqlfilters, withLines: false }),
        api.get<R[]>('/bankaccounts', { limit: 100, sqlfilters: '(t.clos:=:0)' }),
      ]);
      const paid = await fetchAll<R>(api, '/invoices', { status: 'paid', sqlfilters, withLines: false });
      const unpaid = inv.items;
      const sum = (a: R[], k: string) => a.reduce((s, i) => s + num(i[k]), 0);
      const remain = unpaid.reduce((s, i) => s + num(i.remaintopay ?? i.total_ttc), 0);
      const balances = await Promise.all(
        (Array.isArray(accounts) ? accounts : []).map(async (a) => ({
          id: a.id,
          ref: a.ref,
          solde: num(await api.get<number>(`/bankaccounts/${a.id}/balance`).catch(() => undefined)),
        })),
      );
      return json({
        annee: year,
        factures_validees: paid.items.length + unpaid.length,
        facture_HT: money(sum(paid.items, 'total_ht') + sum(unpaid, 'total_ht')),
        facture_TTC: money(sum(paid.items, 'total_ttc') + sum(unpaid, 'total_ttc')),
        reste_a_encaisser_TTC: money(remain),
        nb_factures_impayees: unpaid.length,
        tresorerie: { comptes: balances, total: money(balances.reduce((s, b) => s + b.solde, 0)) },
        avertissement: inv.truncated || paid.truncated ? 'Résultat tronqué (trop de factures) : affinez la période.' : undefined,
      });
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
