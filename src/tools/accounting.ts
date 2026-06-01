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
  {
    name: 'get_balance_generale',
    description: 'Générer la balance générale comptable : solde débit/crédit par compte sur une période. Nécessite le module Comptabilité Avancée.',
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: 'Date début ISO 8601 (ex: 2025-01-01)' },
        date_end: { type: 'string', description: 'Date fin ISO 8601 (ex: 2025-12-31)' },
        class_filter: { type: 'string', description: "Filtrer par classe de compte (ex: '6' pour charges, '7' pour produits, '4' pour tiers)" },
        limit: { type: 'number', description: 'Nombre max d\'écritures à analyser (défaut: 5000)' },
      },
    },
  },
  {
    name: 'get_grand_livre',
    description: 'Générer le grand livre comptable : toutes les écritures par compte avec solde progressif. Nécessite le module Comptabilité Avancée.',
    inputSchema: {
      type: 'object',
      properties: {
        account_number: { type: 'string', description: "Numéro de compte (ex: '411000') ou préfixe (ex: '41')" },
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
        limit: { type: 'number', description: 'Nombre max d\'écritures par compte (défaut: 500)' },
      },
    },
  },
  {
    name: 'export_ecritures_fec',
    description: 'Exporter les écritures comptables au format FEC (Fichier des Écritures Comptables) — norme française DGFiP. Retourne un CSV exploitable directement.',
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: 'Date début ISO 8601 (ex: 2025-01-01)' },
        date_end: { type: 'string', description: 'Date fin ISO 8601 (ex: 2025-12-31)' },
        journal_code: { type: 'string', description: 'Filtrer par code journal (ex: VTE, ACH, BNK)' },
        limit: { type: 'number', description: 'Nombre max d\'écritures (défaut: 10000)' },
      },
    },
  },
  {
    name: 'get_rapport_tva',
    description: 'Générer un rapport de TVA collectée et déductible sur une période, avec détail par taux.',
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: 'Date début ISO 8601 (ex: 2025-01-01)' },
        date_end: { type: 'string', description: 'Date fin ISO 8601 (ex: 2025-03-31)' },
        mode: { type: 'string', description: "'encaissement' ou 'debit' (défaut: debit)" },
      },
      required: ['date_start', 'date_end'],
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
    case 'get_balance_generale': {
      const params: Record<string, unknown> = { limit: args.limit || 5000 };
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      const entries = await api.get<unknown[]>('/accountancy/bookkeeping', params);
      const arr = Array.isArray(entries) ? entries : [];

      // Aggregate by account
      type AccountBalance = { numero: string; libelle: string; total_debit: number; total_credit: number; solde: number };
      const balances = new Map<string, AccountBalance>();
      for (const e of arr) {
        const entry = e as Record<string, unknown>;
        const num = String(entry.numero_compte_generale || entry.numero_compte || '');
        const lib = String(entry.label_compte_generale || entry.label_compte || entry.label || '');
        if (!num) continue;
        if (args.class_filter && !num.startsWith(String(args.class_filter))) continue;
        if (!balances.has(num)) balances.set(num, { numero: num, libelle: lib, total_debit: 0, total_credit: 0, solde: 0 });
        const bal = balances.get(num)!;
        bal.total_debit += Number(entry.debit || 0);
        bal.total_credit += Number(entry.credit || 0);
        bal.solde = bal.total_debit - bal.total_credit;
      }

      const result = Array.from(balances.values()).sort((a, b) => a.numero.localeCompare(b.numero));
      const totalDebit = result.reduce((s, r) => s + r.total_debit, 0);
      const totalCredit = result.reduce((s, r) => s + r.total_credit, 0);
      return JSON.stringify({
        periode: { debut: args.date_start || 'début', fin: args.date_end || 'fin' },
        nb_comptes: result.length,
        totaux: { total_debit: totalDebit.toFixed(2), total_credit: totalCredit.toFixed(2) },
        comptes: result.map(r => ({
          ...r,
          total_debit: r.total_debit.toFixed(2),
          total_credit: r.total_credit.toFixed(2),
          solde: r.solde.toFixed(2),
        })),
      }, null, 2);
    }

    case 'get_grand_livre': {
      const params: Record<string, unknown> = { limit: args.limit || 500 };
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      if (args.account_number) params.search_accountancy_code_start = args.account_number;
      const entries = await api.get<unknown[]>('/accountancy/bookkeeping', params);
      const arr = Array.isArray(entries) ? entries : [];

      // Group by account, sort by date
      type LedgerEntry = { date: string; piece_ref: string; libelle: string; journal: string; debit: number; credit: number; solde_progressif: number };
      type LedgerAccount = { numero: string; libelle: string; solde_ouverture: number; ecritures: LedgerEntry[]; total_debit: number; total_credit: number; solde_final: number };
      const accounts = new Map<string, LedgerAccount>();

      for (const e of arr) {
        const entry = e as Record<string, unknown>;
        const num = String(entry.numero_compte_generale || entry.numero_compte || '');
        const lib = String(entry.label_compte_generale || entry.label_compte || '');
        if (!num) continue;
        if (args.account_number) {
          const filter = String(args.account_number);
          if (!num.startsWith(filter)) continue;
        }
        if (!accounts.has(num)) accounts.set(num, { numero: num, libelle: lib, solde_ouverture: 0, ecritures: [], total_debit: 0, total_credit: 0, solde_final: 0 });
        const acc = accounts.get(num)!;
        const debit = Number(entry.debit || 0);
        const credit = Number(entry.credit || 0);
        acc.total_debit += debit;
        acc.total_credit += credit;
        acc.solde_final = acc.total_debit - acc.total_credit;
        acc.ecritures.push({
          date: String(entry.doc_date || entry.date || ''),
          piece_ref: String(entry.piece_num || entry.ref || ''),
          libelle: String(entry.label || entry.subledger_label || ''),
          journal: String(entry.code_journal || entry.journal_code || ''),
          debit,
          credit,
          solde_progressif: acc.solde_final,
        });
      }

      const result = Array.from(accounts.values()).sort((a, b) => a.numero.localeCompare(b.numero));
      return JSON.stringify({
        periode: { debut: args.date_start || 'début', fin: args.date_end || 'fin' },
        nb_comptes: result.length,
        grand_livre: result.map(acc => ({
          ...acc,
          total_debit: acc.total_debit.toFixed(2),
          total_credit: acc.total_credit.toFixed(2),
          solde_final: acc.solde_final.toFixed(2),
          ecritures: acc.ecritures.map(ec => ({
            ...ec,
            debit: ec.debit.toFixed(2),
            credit: ec.credit.toFixed(2),
            solde_progressif: ec.solde_progressif.toFixed(2),
          })),
        })),
      }, null, 2);
    }

    case 'export_ecritures_fec': {
      const params: Record<string, unknown> = { limit: args.limit || 10000 };
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      if (args.journal_code) params.journal_code = args.journal_code;
      const entries = await api.get<unknown[]>('/accountancy/bookkeeping', params);
      const arr = Array.isArray(entries) ? entries : [];

      // Build FEC CSV (norme DGFiP)
      const header = 'JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise';
      const lines = [header];
      for (const e of arr) {
        const entry = e as Record<string, unknown>;
        const fmtDate = (ts: unknown) => {
          if (!ts) return '';
          const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(String(ts));
          return d.toISOString().slice(0, 10).replace(/-/g, '');
        };
        const fmtAmount = (v: unknown) => Math.abs(Number(v || 0)).toFixed(2).replace('.', ',');
        const fields = [
          entry.code_journal || '',
          entry.journal_label || entry.code_journal || '',
          entry.piece_num || entry.id || '',
          fmtDate(entry.doc_date || entry.date),
          entry.numero_compte_generale || entry.numero_compte || '',
          (entry.label_compte_generale || entry.label_compte || '').toString().replace(/\|/g, ' '),
          entry.subledger_account || '',
          (entry.subledger_label || '').toString().replace(/\|/g, ' '),
          entry.piece_num || entry.ref || '',
          fmtDate(entry.doc_date || entry.date),
          (entry.label || '').toString().replace(/\|/g, ' '),
          fmtAmount(entry.debit),
          fmtAmount(entry.credit),
          entry.lettering || '',
          fmtDate(entry.date_lettering),
          fmtDate(entry.date_validated),
          '',
          '',
        ];
        lines.push(fields.join('|'));
      }

      return `Format FEC (${arr.length} écritures)\n\n${lines.join('\n')}`;
    }

    case 'get_rapport_tva': {
      const dateStart = args.date_start as string;
      const dateEnd = args.date_end as string;
      const sqlStart = `(t.datef:>='${dateStart}')`;
      const sqlEnd = `(t.datef:<='${dateEnd}')`;
      const sqlFilter = `${sqlStart} and ${sqlEnd}`;

      const [clientInvoices, supplierInvoices, clientCreditNotes, supplierCreditNotes] = await Promise.all([
        api.get<unknown[]>('/invoices', { status: 2, limit: 5000, sqlfilters: sqlFilter }),
        api.get<unknown[]>('/supplierinvoices', { status: 2, limit: 5000, sqlfilters: sqlFilter }).catch(() => []),
        api.get<unknown[]>('/invoices', { status: 2, limit: 500, type: 2, sqlfilters: sqlFilter }).catch(() => []),
        api.get<unknown[]>('/supplierinvoices', { status: 2, limit: 500, type: 2, sqlfilters: sqlFilter }).catch(() => []),
      ]);

      type TvaRate = { base_ht: number; tva: number; nb_docs: number };
      const collectee = new Map<string, TvaRate>();
      const deductible = new Map<string, TvaRate>();

      const aggregate = (invoices: unknown[], map: Map<string, TvaRate>, sign = 1) => {
        const arr = Array.isArray(invoices) ? invoices : [];
        for (const inv of arr) {
          const doc = inv as Record<string, unknown>;
          const ht = Number(doc.total_ht || 0) * sign;
          const tva = Number(doc.total_tva || 0) * sign;
          const rate = doc.tva_tx !== undefined ? String(doc.tva_tx) : 'mixte';
          if (!map.has(rate)) map.set(rate, { base_ht: 0, tva: 0, nb_docs: 0 });
          const r = map.get(rate)!;
          r.base_ht += ht;
          r.tva += tva;
          r.nb_docs += 1;
        }
      };

      aggregate(Array.isArray(clientInvoices) ? clientInvoices : [], collectee, 1);
      aggregate(Array.isArray(clientCreditNotes) ? clientCreditNotes : [], collectee, -1);
      aggregate(Array.isArray(supplierInvoices) ? supplierInvoices : [], deductible, 1);
      aggregate(Array.isArray(supplierCreditNotes) ? supplierCreditNotes : [], deductible, -1);

      const toObj = (map: Map<string, TvaRate>) => Object.fromEntries(
        Array.from(map.entries()).map(([rate, v]) => [
          `taux_${rate}%`,
          { base_ht: v.base_ht.toFixed(2), tva: v.tva.toFixed(2), nb_documents: v.nb_docs },
        ])
      );

      const totalCollectee = Array.from(collectee.values()).reduce((s, v) => s + v.tva, 0);
      const totalDeductible = Array.from(deductible.values()).reduce((s, v) => s + v.tva, 0);
      const tvaARegler = totalCollectee - totalDeductible;

      return JSON.stringify({
        periode: { debut: dateStart, fin: dateEnd },
        tva_collectee: { detail_par_taux: toObj(collectee), total: totalCollectee.toFixed(2) },
        tva_deductible: { detail_par_taux: toObj(deductible), total: totalDeductible.toFixed(2) },
        tva_nette_a_regler: tvaARegler.toFixed(2),
        note: tvaARegler >= 0 ? 'Solde dû au Trésor' : 'Crédit de TVA',
      }, null, 2);
    }

    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
