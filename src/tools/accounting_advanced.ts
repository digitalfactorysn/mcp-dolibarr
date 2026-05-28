import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

type Inv = Record<string, unknown>;

export const accountingAdvancedTools: Tool[] = [
  { name: 'get_customer_statement', description: "Relevé de compte complet d'un client (factures, paiements, solde)", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number' }, date_start: { type: 'string' }, date_end: { type: 'string' } }, required: ['thirdparty_id'] } },
  { name: 'get_vat_report', description: "Rapport de déclaration TVA pour une période", inputSchema: { type: 'object', properties: { year: { type: 'number' }, month: { type: 'number', description: 'Mois 1-12 (si vide = année entière)' } }, required: ['year'] } },
  { name: 'reconcile_bank_line', description: "Marquer une ligne bancaire comme rapprochée", inputSchema: { type: 'object', properties: { account_id: { type: 'number' }, line_id: { type: 'number' }, num_releve: { type: 'string', description: "N° relevé (ex: '2025-01')" } }, required: ['account_id', 'line_id', 'num_releve'] } },
  { name: 'get_aged_balance', description: "Balance âgée clients par tranche (0-30j, 31-60j, 61-90j, +90j)", inputSchema: { type: 'object', properties: { type: { type: 'string', description: "'customer' ou 'supplier'" } } } },
  { name: 'export_accounting_entries', description: "Exporter les écritures comptables en CSV (compatible Sage/EBP)", inputSchema: { type: 'object', properties: { date_start: { type: 'string' }, date_end: { type: 'string' }, journal_code: { type: 'string' }, limit: { type: 'number' } }, required: ['date_start', 'date_end'] } },
  { name: 'get_trial_balance', description: "Balance générale des comptes (soldes débit/crédit)", inputSchema: { type: 'object', properties: { date_start: { type: 'string' }, date_end: { type: 'string' }, limit: { type: 'number' } } } },
  { name: 'create_misc_journal_entry', description: "Créer une écriture comptable manuelle (OD)", inputSchema: { type: 'object', properties: { label: { type: 'string' }, journal_code: { type: 'string' }, date: { type: 'string' }, lines: { type: 'array', items: { type: 'object' } } }, required: ['label', 'journal_code', 'date', 'lines'] } },
];

export async function handleAccountingAdvancedTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'get_customer_statement': {
      const [invoices, thirdparty] = await Promise.all([
        api.get<unknown[]>('/invoices', { thirdparty_ids: args.thirdparty_id, limit: 200 }),
        api.get<Inv>(`/thirdparties/${args.thirdparty_id}`),
      ]);
      const arr = (Array.isArray(invoices) ? invoices : []) as Inv[];
      const unpaid = arr.filter(i => i.statut == 1);
      const paid   = arr.filter(i => i.statut == 2);
      const totalUnpaid = unpaid.reduce((s, i) => s + Number(i.total_ttc || 0), 0);
      const totalPaid   = paid.reduce((s, i) => s + Number(i.total_ttc || 0), 0);
      return JSON.stringify({
        client: { id: thirdparty.id, nom: thirdparty.name, code: thirdparty.code_client },
        solde_impaye: totalUnpaid.toFixed(2),
        total_facture: (totalUnpaid + totalPaid).toFixed(2),
        total_paye: totalPaid.toFixed(2),
        nb_factures_impayees: unpaid.length,
        nb_factures_payees: paid.length,
        factures_impayees: unpaid.map(i => ({ ref: i.ref, date: i.date, echeance: i.date_lim_reglement, montant: i.total_ttc, reste: i.remaintopay })),
      }, null, 2);
    }
    case 'get_vat_report': {
      const year = args.year as number;
      const month = args.month as number | undefined;
      const dateStart = month ? `${year}-${String(month).padStart(2,'0')}-01` : `${year}-01-01`;
      const dateEnd   = month ? `${year}-${String(month).padStart(2,'0')}-${new Date(year, month, 0).getDate()}` : `${year}-12-31`;
      const [paidInv, supplInv] = await Promise.all([
        api.get<unknown[]>('/invoices', { status: 2, limit: 500, sqlfilters: `(t.datef:>='${dateStart}') and (t.datef:<='${dateEnd}')` }),
        api.get<unknown[]>('/supplierinvoices', { status: 2, limit: 500, sqlfilters: `(t.datef:>='${dateStart}') and (t.datef:<='${dateEnd}')` }),
      ]);
      const sales = (Array.isArray(paidInv) ? paidInv : []) as Inv[];
      const purch = (Array.isArray(supplInv) ? supplInv : []) as Inv[];
      const tvaC = sales.reduce((s, i) => s + Number(i.total_tva || 0), 0);
      const tvaD = purch.reduce((s, i) => s + Number(i.total_tva || 0), 0);
      return JSON.stringify({
        periode: month ? `${year}-${String(month).padStart(2,'0')}` : String(year),
        TVA_collectee: tvaC.toFixed(2),
        TVA_deductible: tvaD.toFixed(2),
        TVA_nette_a_payer: (tvaC - tvaD).toFixed(2),
        base_HT_ventes: sales.reduce((s, i) => s + Number(i.total_ht || 0), 0).toFixed(2),
        base_HT_achats: purch.reduce((s, i) => s + Number(i.total_ht || 0), 0).toFixed(2),
        nb_factures_ventes: sales.length,
        nb_factures_achats: purch.length,
      }, null, 2);
    }
    case 'reconcile_bank_line': {
      await api.put(`/bankaccounts/${args.account_id}/lines/${args.line_id}`, { num_releve: args.num_releve, rappro: 1 });
      return `✅ Ligne #${args.line_id} rapprochée avec le relevé "${args.num_releve}".`;
    }
    case 'get_aged_balance': {
      const invoices = (await api.get<unknown[]>('/invoices', { status: 1, limit: 500 }) as unknown[]) as Inv[];
      const now = Date.now();
      const b: Record<string, Inv[]> = { '0-30j': [], '31-60j': [], '61-90j': [], '+90j': [] };
      let total = 0;
      for (const i of invoices) {
        const days = Math.floor((now - Number(i.date_lim_reglement) * 1000) / 86400000);
        const amount = Number(i.remaintopay || i.total_ttc || 0);
        total += amount;
        const entry: Inv = { ref: i.ref, client: i.socid, montant: amount, jours_retard: days };
        if (days <= 30) b['0-30j'].push(entry);
        else if (days <= 60) b['31-60j'].push(entry);
        else if (days <= 90) b['61-90j'].push(entry);
        else b['+90j'].push(entry);
      }
      const sum = (arr: Inv[]) => arr.reduce((s, i) => s + Number(i.montant || 0), 0).toFixed(2);
      return JSON.stringify({ total_impaye: total.toFixed(2), buckets: { '0-30j': { nb: b['0-30j'].length, total: sum(b['0-30j']) }, '31-60j': { nb: b['31-60j'].length, total: sum(b['31-60j']) }, '61-90j': { nb: b['61-90j'].length, total: sum(b['61-90j']) }, '+90j': { nb: b['+90j'].length, total: sum(b['+90j']), details: b['+90j'] } } }, null, 2);
    }
    case 'export_accounting_entries': {
      const params: Inv = { limit: Number(args.limit) || 1000 };
      if (args.journal_code) params.journal_code = args.journal_code;
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end)   params.date_end   = Math.floor(new Date(args.date_end   as string).getTime() / 1000);
      const data = await api.get<unknown[]>('/accountancy/bookkeeping', params);
      const entries = (Array.isArray(data) ? data : []) as Inv[];
      const csv = ['Date;Journal;Compte;Libellé;Débit;Crédit',
        ...entries.map(e => `${e.doc_date};${e.code_journal};${e.numero_compte};${String(e.label_compte || '').replace(/;/g,' ')};${Number(e.debit||0).toFixed(2)};${Number(e.credit||0).toFixed(2)}`)
      ].join('\n');
      return `✅ Export: ${entries.length} écritures\n\n${csv.substring(0, 3000)}${csv.length > 3000 ? '\n...' : ''}`;
    }
    case 'get_trial_balance': {
      const params: Inv = { limit: Number(args.limit) || 500 };
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end)   params.date_end   = Math.floor(new Date(args.date_end   as string).getTime() / 1000);
      const entries = ((await api.get<unknown[]>('/accountancy/bookkeeping', params)) as unknown[]) as Inv[];
      const accounts: Record<string, { debit: number; credit: number; label: string }> = {};
      for (const e of entries) {
        const num = String(e.numero_compte);
        if (!accounts[num]) accounts[num] = { debit: 0, credit: 0, label: String(e.label_compte || '') };
        accounts[num].debit  += Number(e.debit  || 0);
        accounts[num].credit += Number(e.credit || 0);
      }
      const balance = Object.entries(accounts).sort(([a],[b]) => a.localeCompare(b))
        .map(([num, v]) => ({ compte: num, libelle: v.label, debit: v.debit.toFixed(2), credit: v.credit.toFixed(2), solde: (v.debit - v.credit).toFixed(2) }));
      return JSON.stringify({ nb_comptes: balance.length, balance }, null, 2);
    }
    case 'create_misc_journal_entry': {
      const date = Math.floor(new Date(args.date as string).getTime() / 1000);
      const id = await api.post('/accountancy/bookkeeping', { label: args.label, code_journal: args.journal_code, doc_date: date, lines: args.lines });
      return `✅ Écriture OD créée. ID: ${id}`;
    }
    default: throw new Error(`Outil comptabilité avancée inconnu: ${name}`);
  }
}
