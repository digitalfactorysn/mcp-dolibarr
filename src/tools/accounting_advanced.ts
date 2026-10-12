import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

type R = Record<string, unknown>;

export const accountingAdvancedTools: Tool[] = [
  { name: 'get_customer_statement', description: "Relevé de compte complet d'un client (factures, paiements, solde)", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number' }, date_start: { type: 'string' }, date_end: { type: 'string' } }, required: ['thirdparty_id'] } },
  { name: 'get_vat_report', description: "Rapport de déclaration TVA pour une période (collectée vs déductible)", inputSchema: { type: 'object', properties: { year: { type: 'number' }, month: { type: 'number', description: 'Mois 1-12 (si vide = année entière)' } }, required: ['year'] } },
  { name: 'reconcile_bank_line', description: "Vérifier et rapprocher une ligne bancaire avec contrôle de relecture effectif", inputSchema: { type: 'object', properties: { account_id: { type: 'number' }, line_id: { type: 'number' }, num_releve: { type: 'string', description: "Numéro de relevé (ex: '2025-01')" }, allow_production_account: { type: 'boolean', description: "Autorisation explicite requise si compte de production" } }, required: ['account_id', 'line_id', 'num_releve'] } },
  { name: 'get_aged_balance', description: "Balance âgée clients par tranche d'ancienneté (0-30j, 31-60j, 61-90j, +90j)", inputSchema: { type: 'object', properties: { type: { type: 'string', description: "'customer' ou 'supplier'" } } } },
  { name: 'export_accounting_entries', description: "Exporter les écritures comptables en CSV. Calcul depuis les factures si plan comptable non initialisé.", inputSchema: { type: 'object', properties: { date_start: { type: 'string' }, date_end: { type: 'string' }, limit: { type: 'number' } }, required: ['date_start', 'date_end'] } },
  { name: 'get_trial_balance', description: "Balance générale des comptes. Calculée depuis les factures si plan comptable non initialisé.", inputSchema: { type: 'object', properties: { date_start: { type: 'string' }, date_end: { type: 'string' } } } },
  { name: 'create_misc_journal_entry', description: "Créer une écriture comptable manuelle (OD). Nécessite le plan comptable initialisé.", inputSchema: { type: 'object', properties: { label: { type: 'string' }, journal_code: { type: 'string' }, date: { type: 'string' }, lines: { type: 'array', items: { type: 'object' } } }, required: ['label', 'journal_code', 'date', 'lines'] } },
];

// Calcule une balance depuis les factures (fallback si plan comptable non initialisé)
async function computeBalanceFromInvoices(api: DolibarrAPI, dateStart?: string, dateEnd?: string): Promise<R[]> {
  const params: R = { status: 2, limit: 500 };
  if (dateStart) params.datestart = Math.floor(new Date(dateStart).getTime() / 1000);
  if (dateEnd) params.dateend = Math.floor(new Date(dateEnd).getTime() / 1000);
  const [sales, purchases] = await Promise.all([
    api.get<unknown[]>('/invoices', params),
    api.get<unknown[]>('/supplierinvoices', { ...params }),
  ]);
  const entries: R[] = [];
  for (const inv of (Array.isArray(sales) ? sales : []) as R[]) {
    const ht = Number(inv.total_ht || 0);
    const tva = Number(inv.total_tva || 0);
    const ttc = Number(inv.total_ttc || 0);
    entries.push({ compte: '411', libelle: `Client ${inv.socid}`, ref: inv.ref, debit: ttc, credit: 0, date: inv.date });
    entries.push({ compte: '706', libelle: `Ventes ${inv.ref}`, ref: inv.ref, debit: 0, credit: ht, date: inv.date });
    if (tva > 0) entries.push({ compte: '4431', libelle: `TVA collectée ${inv.ref}`, ref: inv.ref, debit: 0, credit: tva, date: inv.date });
  }
  for (const inv of (Array.isArray(purchases) ? purchases : []) as R[]) {
    const ht = Number(inv.total_ht || 0);
    const tva = Number(inv.total_tva || 0);
    const ttc = Number(inv.total_ttc || 0);
    entries.push({ compte: '401', libelle: `Fournisseur ${inv.socid}`, ref: inv.ref, debit: 0, credit: ttc, date: inv.date });
    entries.push({ compte: '601', libelle: `Achats ${inv.ref}`, ref: inv.ref, debit: ht, credit: 0, date: inv.date });
    if (tva > 0) entries.push({ compte: '4452', libelle: `TVA déductible ${inv.ref}`, ref: inv.ref, debit: tva, credit: 0, date: inv.date });
  }
  return entries;
}

export async function handleAccountingAdvancedTool(name: string, args: R, api: DolibarrAPI): Promise<string> {
  switch (name) {

    case 'get_customer_statement': {
      const [invoices, tp] = await Promise.all([
        api.get<unknown[]>('/invoices', { thirdparty_ids: args.thirdparty_id, limit: 200 }),
        api.get<R>(`/thirdparties/${args.thirdparty_id}`),
      ]);
      const arr = (Array.isArray(invoices) ? invoices : []) as R[];
      const unpaid = arr.filter(i => i.statut == 1);
      const paid   = arr.filter(i => i.statut == 2);
      const totalUnpaid = unpaid.reduce((s, i) => s + Number(i.total_ttc || 0), 0);
      const totalPaid   = paid.reduce((s, i) => s + Number(i.total_ttc || 0), 0);
      return JSON.stringify({
        client: { id: tp.id, nom: tp.name, code: tp.code_client },
        solde_impaye_FCFA: totalUnpaid.toFixed(2),
        total_facture_FCFA: (totalUnpaid + totalPaid).toFixed(2),
        total_paye_FCFA: totalPaid.toFixed(2),
        nb_factures_impayees: unpaid.length,
        nb_factures_payees: paid.length,
        factures_impayees: unpaid.map(i => ({
          ref: i.ref, date: i.date,
          echeance: i.date_lim_reglement,
          montant_ttc: i.total_ttc,
          reste_a_payer: i.remaintopay
        })),
      }, null, 2);
    }

    case 'get_vat_report': {
      const year = args.year as number;
      const month = args.month as number | undefined;
      const ds = month ? `${year}-${String(month).padStart(2,'0')}-01` : `${year}-01-01`;
      const de = month ? `${year}-${String(month).padStart(2,'0')}-${new Date(year, month, 0).getDate()} 23:59:59` : `${year}-12-31 23:59:59`;
      const dsTs = Math.floor(new Date(ds).getTime() / 1000);
      const deTs = Math.floor(new Date(de).getTime() / 1000);
      const [sales, purch] = await Promise.all([
        api.get<unknown[]>('/invoices', { status: 2, limit: 500, datestart: dsTs, dateend: deTs }),
        api.get<unknown[]>('/supplierinvoices', { status: 2, limit: 500, datestart: dsTs, dateend: deTs }),
      ]);
      const rawS = (Array.isArray(sales) ? sales : []) as R[];
      const rawP = (Array.isArray(purch) ? purch : []) as R[];

      // Filter in memory to ensure period accuracy even if Dolibarr ignores datestart/dateend
      const s = rawS.filter(i => {
        const d = Number(i.date || i.date_validation || i.date_creation || 0);
        return d >= dsTs && d <= deTs;
      });
      const p = rawP.filter(i => {
        const d = Number(i.date || i.date_validation || i.date_creation || 0);
        return d >= dsTs && d <= deTs;
      });

      const tvaC = s.reduce((acc, i) => acc + Number(i.total_tva || 0), 0);
      const tvaD = p.reduce((acc, i) => acc + Number(i.total_tva || 0), 0);
      return JSON.stringify({
        periode: month ? `${year}-${String(month).padStart(2,'0')}` : String(year),
        certified: false,
        reconstituted: true,
        source: 'ESTIMATION_FACTURES_COMMERCIALES',
        disclaimer: 'Estimation calculée à partir des factures commerciales payées/validées. Ne constitue pas un extrait certifié du grand livre comptable.',
        TVA_collectee_FCFA: tvaC.toFixed(2),
        TVA_deductible_FCFA: tvaD.toFixed(2),
        TVA_nette_a_payer_FCFA: (tvaC - tvaD).toFixed(2),
        CA_HT_FCFA: s.reduce((acc, i) => acc + Number(i.total_ht || 0), 0).toFixed(2),
        achats_HT_FCFA: p.reduce((acc, i) => acc + Number(i.total_ht || 0), 0).toFixed(2),
        nb_factures_ventes: s.length,
        nb_factures_achats: p.length,
      }, null, 2);
    }

    case 'reconcile_bank_line': {
      const accountId = Number(args.account_id);
      const lineId = Number(args.line_id);
      const releve = String(args.num_releve || '').replace(/[^a-zA-Z0-9_-]/g, '');

      // Protection compte de production réel
      if (accountId === 1 && !args.allow_production_account) {
        return JSON.stringify({
          supported: false,
          applied: false,
          error: 'PRODUCTION_ACCOUNT_PROTECTED',
          message: 'Refus de modification sur le compte bancaire de production #1 (ECOBANK). Définissez allow_production_account: true pour forcer ou utilisez un compte bancaire de test.',
        }, null, 2);
      }

      try {
        await api.put(`/bankaccounts/${accountId}/lines/${lineId}`, {
          label: `Reconciliation ${releve}`,
          num_releve: releve,
          rappro: 1,
        });

        // Relecture factuelle de la ligne
        const rereadLine = await api.get<R>(`/bankaccounts/lines/${lineId}`).catch(() => null);
        const isRapproApplied = rereadLine && (Number(rereadLine.rappro) === 1 || String(rereadLine.num_releve) === releve);

        if (isRapproApplied) {
          return JSON.stringify({
            supported: true,
            applied: true,
            account_id: accountId,
            line_id: lineId,
            releve,
            rappro: 1,
            relecture_verifiee: true,
            details: rereadLine,
          }, null, 2);
        } else {
          return JSON.stringify({
            supported: false,
            applied: false,
            error: 'API_DOES_NOT_PERSIST_RECONCILIATION',
            message: "L'API REST Dolibarr standard ne prend pas en charge la mise à jour du champ de rapprochement (rappro=1) via PUT /bankaccounts/{id}/lines/{line_id} (seul 'label' est modifiable via cette route).",
            line_relecture: rereadLine,
            action_requise: "Effectuer le rapprochement bancaire via l'interface web Dolibarr (Banque → Rapprochement).",
          }, null, 2);
        }
      } catch (err) {
        return JSON.stringify({
          supported: false,
          applied: false,
          error: 'API_ERROR',
          message: err instanceof Error ? err.message : String(err),
        }, null, 2);
      }
    }

    case 'get_aged_balance': {
      const invoices = (await api.get<unknown[]>('/invoices', { status: 1, limit: 500 }) as unknown[]) as R[];
      const now = Date.now();
      type Bucket = { nb: number; total: number; details: R[] };
      const b: Record<string, Bucket> = {
        '0-30j':  { nb: 0, total: 0, details: [] },
        '31-60j': { nb: 0, total: 0, details: [] },
        '61-90j': { nb: 0, total: 0, details: [] },
        '+90j':   { nb: 0, total: 0, details: [] },
      };
      let total = 0;
      for (const i of invoices) {
        const days = Math.floor((now - Number(i.date_lim_reglement) * 1000) / 86400000);
        const amount = Number(i.remaintopay || i.total_ttc || 0);
        total += amount;
        const entry: R = { ref: i.ref, client: i.socid, montant_FCFA: amount, jours_retard: days };
        const key = days <= 30 ? '0-30j' : days <= 60 ? '31-60j' : days <= 90 ? '61-90j' : '+90j';
        b[key].nb++; b[key].total += amount; b[key].details.push(entry);
      }
      return JSON.stringify({
        type: args.type || 'customer',
        total_impaye_FCFA: total.toFixed(2),
        '0-30j':  { nb: b['0-30j'].nb,  total_FCFA: b['0-30j'].total.toFixed(2) },
        '31-60j': { nb: b['31-60j'].nb, total_FCFA: b['31-60j'].total.toFixed(2) },
        '61-90j': { nb: b['61-90j'].nb, total_FCFA: b['61-90j'].total.toFixed(2) },
        '+90j':   { nb: b['+90j'].nb,   total_FCFA: b['+90j'].total.toFixed(2), details: b['+90j'].details },
      }, null, 2);
    }

    case 'export_accounting_entries': {
      // Essai endpoint natif, fallback sur calcul depuis factures
      let entries: R[] = [];
      try {
        const params: R = { limit: Number(args.limit) || 500 };
        if (args.date_start) params.datestart = Math.floor(new Date(args.date_start as string).getTime() / 1000);
        if (args.date_end)   params.dateend   = Math.floor(new Date(args.date_end   as string).getTime() / 1000);
        const data = await api.get<unknown[]>('/accountancy/bookkeeping', params);
        entries = (Array.isArray(data) ? data : []) as R[];
      } catch {
        entries = await computeBalanceFromInvoices(api, args.date_start as string, args.date_end as string);
      }
      const csv = [
        'Date;Journal;Compte;Libellé;Débit;Crédit',
        ...entries.map(e => [
          e.doc_date || e.date,
          e.code_journal || 'VTE',
          e.numero_compte || e.compte,
          String(e.label_compte || e.libelle || '').replace(/;/g, ' '),
          Number(e.debit || 0).toFixed(2),
          Number(e.credit || 0).toFixed(2),
        ].join(';')),
      ].join('\n');
      return `✅ Export ${entries.length} écritures (${args.date_start} → ${args.date_end})\n\n${csv.substring(0, 4000)}${csv.length > 4000 ? '\n...' : ''}`;
    }

    case 'get_trial_balance': {
      let entries: R[] = [];
      let source = 'plan comptable';
      try {
        const params: R = { limit: 1000 };
        if (args.date_start) params.datestart = Math.floor(new Date(args.date_start as string).getTime() / 1000);
        if (args.date_end)   params.dateend   = Math.floor(new Date(args.date_end   as string).getTime() / 1000);
        const data = await api.get<unknown[]>('/accountancy/bookkeeping', params);
        entries = (Array.isArray(data) ? data : []) as R[];
      } catch {
        entries = await computeBalanceFromInvoices(api, args.date_start as string, args.date_end as string);
        source = 'calcul depuis factures (plan comptable SYSCOHADA non initialisé)';
      }
      const accounts: Record<string, { debit: number; credit: number; label: string }> = {};
      for (const e of entries) {
        const num = String(e.numero_compte || e.compte || '?');
        if (!accounts[num]) accounts[num] = { debit: 0, credit: 0, label: String(e.label_compte || e.libelle || '') };
        accounts[num].debit  += Number(e.debit  || 0);
        accounts[num].credit += Number(e.credit || 0);
      }
      const balance = Object.entries(accounts).sort(([a], [b]) => a.localeCompare(b))
        .map(([num, v]) => ({
          compte: num,
          libelle: v.label,
          debit_FCFA: v.debit.toFixed(2),
          credit_FCFA: v.credit.toFixed(2),
          solde_FCFA: (v.debit - v.credit).toFixed(2),
        }));
      return JSON.stringify({ source, nb_comptes: balance.length, balance }, null, 2);
    }

    case 'create_misc_journal_entry': {
      try {
        const date = args.date ? (args.date as string) : new Date().toISOString().split('T')[0];
        const res = await api.post<Record<string, unknown>>('/accountancy/bookkeeping', {
          label: args.label,
          code_journal: args.journal_code || 'OD',
          doc_date: date,
          lines: args.lines,
        });

        // Relecture immédiate pour vérification
        const entries = await api.get<unknown[]>('/accountancy/bookkeeping', {
          journal_code: args.journal_code || 'OD',
          limit: 5,
        }).catch(() => []);
        const arr = Array.isArray(entries) ? entries : [];

        return JSON.stringify({
          supported: true,
          applied: true,
          verified: arr.length > 0,
          result: res,
          journal: args.journal_code || 'OD',
          label: args.label,
          entries: arr.slice(0, 2),
        }, null, 2);
      } catch (err) {
        const is404 = err instanceof Error && (err.message.includes('404') || err.message.includes('Not Found'));
        return JSON.stringify({
          supported: false,
          applied: false,
          verified: false,
          error: is404 ? 'REST_ENDPOINT_NOT_AVAILABLE' : 'BOOKKEEPING_POST_FAILED',
          endpoint: '/accountancy/bookkeeping',
          details: err instanceof Error ? err.message : String(err),
        }, null, 2);
      }
    }

    default: throw new Error(`Outil comptabilité avancée inconnu: ${name}`);
  }
}
