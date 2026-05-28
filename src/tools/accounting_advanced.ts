import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const accountingAdvancedTools: Tool[] = [
  { name: 'get_customer_statement', description: "Obtenir le relevé de compte complet d'un client (toutes factures, paiements, solde)", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number', description: 'ID du client' }, date_start: { type: 'string', description: 'Date début ISO 8601' }, date_end: { type: 'string', description: 'Date fin ISO 8601' } }, required: ['thirdparty_id'] } },
  { name: 'get_vat_report', description: "Générer le rapport de déclaration TVA pour une période", inputSchema: { type: 'object', properties: { year: { type: 'number', description: 'Année (ex: 2025)' }, month: { type: 'number', description: 'Mois 1-12 (si vide = année entière)' }, mode: { type: 'number', description: '0=Débit (facturation), 1=Encaissement' } }, required: ['year'] } },
  { name: 'reconcile_bank_line', description: "Marquer une ligne bancaire comme rapprochée", inputSchema: { type: 'object', properties: { account_id: { type: 'number', description: 'ID du compte bancaire' }, line_id: { type: 'number', description: 'ID de la ligne bancaire' }, num_releve: { type: 'string', description: "Numéro du relevé bancaire (ex: '2025-01')" } }, required: ['account_id', 'line_id', 'num_releve'] } },
  { name: 'get_aged_balance', description: "Balance âgée clients : créances par tranche d'ancienneté (0-30j, 31-60j, 61-90j, +90j)", inputSchema: { type: 'object', properties: { type: { type: 'string', description: "'customer' (clients) ou 'supplier' (fournisseurs). Défaut: customer" } } } },
  { name: 'export_accounting_entries', description: "Exporter les écritures comptables en CSV (format Sage/EBP compatible)", inputSchema: { type: 'object', properties: { date_start: { type: 'string', description: 'Date début ISO 8601' }, date_end: { type: 'string', description: 'Date fin ISO 8601' }, journal_code: { type: 'string', description: 'Code journal (VTE, ACH, BNQ, OD) — vide = tous' }, limit: { type: 'number', description: 'Nombre max d\'écritures' } }, required: ['date_start', 'date_end'] } },
  { name: 'get_trial_balance', description: "Balance générale des comptes (soldes débit/crédit par compte)", inputSchema: { type: 'object', properties: { date_start: { type: 'string', description: 'Date début ISO 8601' }, date_end: { type: 'string', description: 'Date fin ISO 8601' }, limit: { type: 'number' } } } },
  { name: 'create_misc_journal_entry', description: "Créer une écriture comptable manuelle (OD - Opération Diverse)", inputSchema: { type: 'object', properties: { label: { type: 'string', description: "Libellé de l'écriture" }, journal_code: { type: 'string', description: "Code journal (ex: 'OD')" }, date: { type: 'string', description: 'Date comptable ISO 8601' }, lines: { type: 'array', description: "Lignes de l'écriture (débit/crédit)", items: { type: 'object', properties: { account_number: { type: 'string', description: "N° de compte (ex: '706')" }, label: { type: 'string' }, debit: { type: 'number', description: 'Montant débit' }, credit: { type: 'number', description: 'Montant crédit' } } } } }, required: ['label', 'journal_code', 'date', 'lines'] } },
];

export async function handleAccountingAdvancedTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'get_customer_statement': {
      const [invoices, thirdparty] = await Promise.all([
        api.get<unknown[]>('/invoices', { thirdparty_ids: args.thirdparty_id, limit: 200 }),
        api.get<Record<string,unknown>>(`/thirdparties/${args.thirdparty_id}`),
      ]);
      const invArr = Array.isArray(invoices) ? invoices : [];
      const unpaid = invArr.filter((i: Record<string,unknown>) => i.statut == 1);
      const paid = invArr.filter((i: Record<string,unknown>) => i.statut == 2);
      const totalUnpaid = unpaid.reduce((s: number, i: Record<string,unknown>) => s + Number(i.total_ttc || 0), 0);
      const totalPaid = paid.reduce((s: number, i: Record<string,unknown>) => s + Number(i.total_ttc || 0), 0);
      return JSON.stringify({
        client: { id: thirdparty.id, nom: thirdparty.name, code: thirdparty.code_client },
        solde_impaye: totalUnpaid.toFixed(2),
        total_facture: (totalUnpaid + totalPaid).toFixed(2),
        total_paye: totalPaid.toFixed(2),
        nb_factures_impayees: unpaid.length,
        nb_factures_payees: paid.length,
        factures_impayees: unpaid.map((i: Record<string,unknown>) => ({ ref: i.ref, date: i.date, echeance: i.date_lim_reglement, montant: i.total_ttc, reste: i.remaintopay })),
      }, null, 2);
    }
    case 'get_vat_report': {
      const year = args.year;
      const month = args.month;
      let dateStart: string, dateEnd: string;
      if (month) {
        const m = String(month).padStart(2, '0');
        dateStart = `${year}-${m}-01`;
        const lastDay = new Date(year as number, month as number, 0).getDate();
        dateEnd = `${year}-${m}-${lastDay}`;
      } else {
        dateStart = `${year}-01-01`;
        dateEnd = `${year}-12-31`;
      }
      const [paidInv, supplInv] = await Promise.all([
        api.get<unknown[]>('/invoices', { status: 2, limit: 500, sqlfilters: `(t.datef:>='${dateStart}') and (t.datef:<='${dateEnd}')` }),
        api.get<unknown[]>('/supplierinvoices', { status: 2, limit: 500, sqlfilters: `(t.datef:>='${dateStart}') and (t.datef:<='${dateEnd}')` }),
      ]);
      const salesArr = Array.isArray(paidInv) ? paidInv : [];
      const purchArr = Array.isArray(supplInv) ? supplInv : [];
      const tvaCollectee = salesArr.reduce((s: number, i: Record<string,unknown>) => s + Number(i.total_tva || 0), 0);
      const tvaDeductible = purchArr.reduce((s: number, i: Record<string,unknown>) => s + Number(i.total_tva || 0), 0);
      return JSON.stringify({
        periode: month ? `${year}-${String(month).padStart(2,'0')}` : String(year),
        TVA_collectee_sur_ventes: tvaCollectee.toFixed(2),
        TVA_deductible_sur_achats: tvaDeductible.toFixed(2),
        TVA_nette_a_payer: (tvaCollectee - tvaDeductible).toFixed(2),
        base_HT_ventes: salesArr.reduce((s: number, i: Record<string,unknown>) => s + Number(i.total_ht || 0), 0).toFixed(2),
        base_HT_achats: purchArr.reduce((s: number, i: Record<string,unknown>) => s + Number(i.total_ht || 0), 0).toFixed(2),
        nb_factures_ventes: salesArr.length,
        nb_factures_achats: purchArr.length,
      }, null, 2);
    }
    case 'reconcile_bank_line': {
      await api.put(`/bankaccounts/${args.account_id}/lines/${args.line_id}`, { num_releve: args.num_releve, rappro: 1 });
      return `✅ Ligne bancaire #${args.line_id} rapprochée avec le relevé "${args.num_releve}".`;
    }
    case 'get_aged_balance': {
      const type = args.type || 'customer';
      const invoices = await api.get<unknown[]>('/invoices', { status: 1, limit: 500 });
      const invArr = Array.isArray(invoices) ? invoices : [];
      const now = Date.now();
      const buckets = { '0-30j': [] as unknown[], '31-60j': [] as unknown[], '61-90j': [] as unknown[], '+90j': [] as unknown[] };
      let total = 0;
      for (const inv of invArr) {
        const i = inv as Record<string,unknown>;
        const echeance = Number(i.date_lim_reglement) * 1000;
        const days = Math.floor((now - echeance) / (1000 * 86400));
        const amount = Number(i.remaintopay || i.total_ttc || 0);
        total += amount;
        const entry = { ref: i.ref, client: i.socid, montant: amount, jours_retard: days };
        if (days <= 30) buckets['0-30j'].push(entry);
        else if (days <= 60) buckets['31-60j'].push(entry);
        else if (days <= 90) buckets['61-90j'].push(entry);
        else buckets['+90j'].push(entry);
      }
      return JSON.stringify({ type, total_impaye: total.toFixed(2), buckets: { '0-30j': { nb: buckets['0-30j'].length, total: buckets['0-30j'].reduce((s,i) => s + Number((i as Record<string,unknown>).montant), 0).toFixed(2) }, '31-60j': { nb: buckets['31-60j'].length, total: buckets['31-60j'].reduce((s,i) => s + Number((i as Record<string,unknown>).montant), 0).toFixed(2) }, '61-90j': { nb: buckets['61-90j'].length, total: buckets['61-90j'].reduce((s,i) => s + Number((i as Record<string,unknown>).montant), 0).toFixed(2) }, '+90j': { nb: buckets['+90j'].length, total: buckets['+90j'].reduce((s,i) => s + Number((i as Record<string,unknown>).montant), 0).toFixed(2), details: buckets['+90j'] } } }, null, 2);
    }
    case 'export_accounting_entries': {
      const params: Record<string, unknown> = { limit: args.limit || 1000 };
      if (args.journal_code) params.journal_code = args.journal_code;
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      const data = await api.get('/accountancy/bookkeeping', params);
      const entries = Array.isArray(data) ? data : [];
      const csv = ['Date;Journal;Compte;Libellé;Débit;Crédit',
        ...entries.map((e: Record<string,unknown>) => `${e.doc_date};${e.code_journal};${e.numero_compte};${(e.label_compte || '').replace(/;/g,' ')};${Number(e.debit||0).toFixed(2)};${Number(e.credit||0).toFixed(2)}`)
      ].join('\n');
      return `✅ Export comptable: ${entries.length} écritures\n\n${csv.substring(0, 2000)}${csv.length > 2000 ? '\n...(tronqué)' : ''}`;
    }
    case 'get_trial_balance': {
      const params: Record<string, unknown> = { limit: args.limit || 500 };
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      const data = await api.get('/accountancy/bookkeeping', params);
      const entries = Array.isArray(data) ? data : [];
      const accounts: Record<string, {debit:number, credit:number, label:string}> = {};
      for (const e of entries) {
        const entry = e as Record<string,unknown>;
        const num = entry.numero_compte as string;
        if (!accounts[num]) accounts[num] = { debit: 0, credit: 0, label: entry.label_compte as string || '' };
        accounts[num].debit += Number(entry.debit || 0);
        accounts[num].credit += Number(entry.credit || 0);
      }
      const balance = Object.entries(accounts).sort(([a],[b]) => a.localeCompare(b)).map(([num, v]) => ({ compte: num, libelle: v.label, debit: v.debit.toFixed(2), credit: v.credit.toFixed(2), solde: (v.debit - v.credit).toFixed(2) }));
      return JSON.stringify({ nb_comptes: balance.length, balance }, null, 2);
    }
    case 'create_misc_journal_entry': {
      const date = Math.floor(new Date(args.date as string).getTime() / 1000);
      const payload = { label: args.label, code_journal: args.journal_code, doc_date: date, lines: args.lines };
      const id = await api.post('/accountancy/bookkeeping', payload);
      return `✅ Écriture OD créée. ID: ${id}\nJournal: ${args.journal_code} | ${args.label}`;
    }
    default: throw new Error(`Outil comptabilité avancée inconnu: ${name}`);
  }
}
