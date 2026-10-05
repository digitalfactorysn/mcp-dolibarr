import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI, DolibarrError } from '../api.js';
import { dateRangeFilter, objectStatus } from '../validation.js';

type R = Record<string, unknown>;

// Note : l'API REST de Dolibarr n'expose pas le grand livre (/accountancy/*, hors export).
// Les outils ci-dessous calculent donc leurs résultats à partir des factures validées.

export const accountingAdvancedTools: Tool[] = [
  { name: 'get_customer_statement', description: "Relevé de compte d'un client (factures validées, payées, impayées)", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number' }, date_start: { type: 'string', description: 'AAAA-MM-JJ' }, date_end: { type: 'string', description: 'AAAA-MM-JJ' } }, required: ['thirdparty_id'] } },
  { name: 'get_vat_report', description: "Synthèse TVA d'une période (collectée sur factures clients vs déductible sur factures fournisseurs, selon la date de facture)", inputSchema: { type: 'object', properties: { year: { type: 'number' }, month: { type: 'number', description: 'Mois 1-12 (si vide = année entière)' } }, required: ['year'] } },
  { name: 'get_aged_balance', description: "Balance âgée des factures impayées par tranche de retard (0-30j, 31-60j, 61-90j, +90j)", inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['customer', 'supplier'], description: "'customer' (défaut) ou 'supplier'" } } } },
  { name: 'export_accounting_entries', description: "Exporter en CSV des écritures comptables simplifiées calculées depuis les factures validées de la période", inputSchema: { type: 'object', properties: { date_start: { type: 'string', description: 'AAAA-MM-JJ' }, date_end: { type: 'string', description: 'AAAA-MM-JJ' } }, required: ['date_start', 'date_end'] } },
  { name: 'get_trial_balance', description: "Balance des comptes simplifiée calculée depuis les factures validées de la période", inputSchema: { type: 'object', properties: { date_start: { type: 'string', description: 'AAAA-MM-JJ' }, date_end: { type: 'string', description: 'AAAA-MM-JJ' } } } },
  { name: 'list_accounting_accounts', description: "Comptes par défaut utilisés pour les écritures simplifiées (lus depuis la configuration Dolibarr si possible)", inputSchema: { type: 'object', properties: {} } },
  { name: 'list_accounting_entries', description: "Lister des écritures comptables simplifiées calculées depuis les factures validées", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, date_start: { type: 'string', description: 'AAAA-MM-JJ' }, date_end: { type: 'string', description: 'AAAA-MM-JJ' } } } },
];

/** Factures validées (hors brouillons et abandonnées) d'une période. */
async function validatedInvoices(api: DolibarrAPI, endpoint: string, dateStart?: unknown, dateEnd?: unknown, extra: R = {}): Promise<R[]> {
  const params: R = { ...extra };
  const filter = dateRangeFilter('t.datef', dateStart, dateEnd);
  if (filter) params.sqlfilters = filter;
  const all = await api.listAll(endpoint, params);
  return all.filter(i => [1, 2].includes(objectStatus(i)));
}

/** Comptes par défaut configurés dans Dolibarr, avec repli sur des numéros génériques. */
async function defaultAccounts(api: DolibarrAPI): Promise<Record<string, string>> {
  let conf: R = {};
  try {
    conf = await api.get<R>('/setup/conf');
  } catch (e) {
    // La lecture de la configuration est réservée aux administrateurs : on utilise les valeurs génériques
    if (!(e instanceof DolibarrError)) throw e;
  }
  const pick = (key: string, fallback: string) => String(conf[key] || fallback);
  return {
    customer: pick('ACCOUNTING_ACCOUNT_CUSTOMER', '411'),
    supplier: pick('ACCOUNTING_ACCOUNT_SUPPLIER', '401'),
    sale: pick('ACCOUNTING_SERVICE_SOLD_ACCOUNT', '706'),
    purchase: pick('ACCOUNTING_SERVICE_BUY_ACCOUNT', '601'),
    vat_sold: pick('ACCOUNTING_VAT_SOLD_ACCOUNT', '4431'),
    vat_buy: pick('ACCOUNTING_VAT_BUY_ACCOUNT', '4452'),
  };
}

// Écritures simplifiées calculées depuis les factures validées
async function computeEntriesFromInvoices(api: DolibarrAPI, dateStart?: unknown, dateEnd?: unknown): Promise<R[]> {
  const [sales, purchases, acc] = await Promise.all([
    validatedInvoices(api, '/invoices', dateStart, dateEnd),
    validatedInvoices(api, '/supplierinvoices', dateStart, dateEnd),
    defaultAccounts(api),
  ]);
  const entries: R[] = [];
  for (const inv of sales) {
    const ht = Number(inv.total_ht || 0);
    const tva = Number(inv.total_tva || 0);
    const ttc = Number(inv.total_ttc || 0);
    entries.push({ journal: 'VTE', compte: acc.customer, libelle: `Client ${inv.socid}`, ref: inv.ref, debit: ttc, credit: 0, date: inv.date });
    entries.push({ journal: 'VTE', compte: acc.sale, libelle: `Ventes ${inv.ref}`, ref: inv.ref, debit: 0, credit: ht, date: inv.date });
    if (tva) entries.push({ journal: 'VTE', compte: acc.vat_sold, libelle: `TVA collectée ${inv.ref}`, ref: inv.ref, debit: 0, credit: tva, date: inv.date });
  }
  for (const inv of purchases) {
    const ht = Number(inv.total_ht || 0);
    const tva = Number(inv.total_tva || 0);
    const ttc = Number(inv.total_ttc || 0);
    entries.push({ journal: 'ACH', compte: acc.supplier, libelle: `Fournisseur ${inv.socid}`, ref: inv.ref, debit: 0, credit: ttc, date: inv.date });
    entries.push({ journal: 'ACH', compte: acc.purchase, libelle: `Achats ${inv.ref}`, ref: inv.ref, debit: ht, credit: 0, date: inv.date });
    if (tva) entries.push({ journal: 'ACH', compte: acc.vat_buy, libelle: `TVA déductible ${inv.ref}`, ref: inv.ref, debit: tva, credit: 0, date: inv.date });
  }
  return entries;
}

function formatDate(ts: unknown): string {
  const n = Number(ts);
  return n ? new Date(n * 1000).toISOString().slice(0, 10) : '';
}

function csvField(value: unknown): string {
  return String(value ?? '').replace(/[;\r\n]/g, ' ');
}

export async function handleAccountingAdvancedTool(name: string, args: R, api: DolibarrAPI): Promise<string> {
  switch (name) {

    case 'get_customer_statement': {
      const [invoices, tp] = await Promise.all([
        validatedInvoices(api, '/invoices', args.date_start, args.date_end, { thirdparty_ids: args.thirdparty_id }),
        api.get<R>(`/thirdparties/${args.thirdparty_id}`),
      ]);
      const unpaid = invoices.filter(i => objectStatus(i) === 1);
      const paid = invoices.filter(i => objectStatus(i) === 2);
      const totalUnpaid = unpaid.reduce((s, i) => s + Number(i.remaintopay ?? i.total_ttc ?? 0), 0);
      const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_ttc || 0), 0);
      return JSON.stringify({
        client: { id: tp.id, nom: tp.name, code: tp.code_client },
        total_facture_TTC: totalInvoiced.toFixed(2),
        solde_impaye_TTC: totalUnpaid.toFixed(2),
        nb_factures_impayees: unpaid.length,
        nb_factures_payees: paid.length,
        factures_impayees: unpaid.map(i => ({
          ref: i.ref, date: formatDate(i.date),
          echeance: formatDate(i.date_lim_reglement),
          montant_ttc: i.total_ttc,
          reste_a_payer: i.remaintopay,
        })),
      }, null, 2);
    }

    case 'get_vat_report': {
      const year = Number(args.year);
      const month = args.month ? Number(args.month) : undefined;
      if (month !== undefined && (month < 1 || month > 12)) throw new Error('month doit être compris entre 1 et 12.');
      const mm = month ? String(month).padStart(2, '0') : '';
      const ds = month ? `${year}-${mm}-01` : `${year}-01-01`;
      const de = month ? `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}` : `${year}-12-31`;
      const [s, p] = await Promise.all([
        validatedInvoices(api, '/invoices', ds, de),
        validatedInvoices(api, '/supplierinvoices', ds, de),
      ]);
      const tvaC = s.reduce((acc, i) => acc + Number(i.total_tva || 0), 0);
      const tvaD = p.reduce((acc, i) => acc + Number(i.total_tva || 0), 0);
      return JSON.stringify({
        periode: month ? `${year}-${mm}` : String(year),
        base: 'Date de facture (régime des débits). Vérifiez votre régime de TVA avant déclaration.',
        TVA_collectee: tvaC.toFixed(2),
        TVA_deductible: tvaD.toFixed(2),
        TVA_nette_a_payer: (tvaC - tvaD).toFixed(2),
        CA_HT: s.reduce((acc, i) => acc + Number(i.total_ht || 0), 0).toFixed(2),
        achats_HT: p.reduce((acc, i) => acc + Number(i.total_ht || 0), 0).toFixed(2),
        nb_factures_ventes: s.length,
        nb_factures_achats: p.length,
      }, null, 2);
    }

    case 'get_aged_balance': {
      const type = args.type === 'supplier' ? 'supplier' : 'customer';
      const endpoint = type === 'supplier' ? '/supplierinvoices' : '/invoices';
      const invoices = await api.listAll(endpoint, { status: 'unpaid' });
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
        const due = Number(i.date_lim_reglement || i.date || 0);
        const days = Math.max(0, Math.floor((now - due * 1000) / 86400000));
        const amount = Number(i.remaintopay ?? i.total_ttc ?? 0);
        total += amount;
        const entry: R = { ref: i.ref, tiers: i.socid, montant: amount, jours_retard: days };
        const key = days <= 30 ? '0-30j' : days <= 60 ? '31-60j' : days <= 90 ? '61-90j' : '+90j';
        b[key].nb++; b[key].total += amount; b[key].details.push(entry);
      }
      return JSON.stringify({
        type,
        total_impaye: total.toFixed(2),
        '0-30j':  { nb: b['0-30j'].nb,  total: b['0-30j'].total.toFixed(2) },
        '31-60j': { nb: b['31-60j'].nb, total: b['31-60j'].total.toFixed(2) },
        '61-90j': { nb: b['61-90j'].nb, total: b['61-90j'].total.toFixed(2) },
        '+90j':   { nb: b['+90j'].nb,   total: b['+90j'].total.toFixed(2), details: b['+90j'].details },
      }, null, 2);
    }

    case 'export_accounting_entries': {
      const entries = await computeEntriesFromInvoices(api, args.date_start, args.date_end);
      const csv = [
        'Date;Journal;Compte;Libellé;Pièce;Débit;Crédit',
        ...entries.map(e => [
          formatDate(e.date), e.journal, e.compte, csvField(e.libelle), csvField(e.ref),
          Number(e.debit || 0).toFixed(2), Number(e.credit || 0).toFixed(2),
        ].join(';')),
      ].join('\n');
      const truncated = csv.length > 20000;
      return `✅ Export de ${entries.length} écritures simplifiées (${args.date_start} → ${args.date_end}), calculées depuis les factures validées.${truncated ? ' (aperçu tronqué)' : ''}\n\n${truncated ? csv.substring(0, 20000) + '\n...' : csv}`;
    }

    case 'get_trial_balance': {
      const entries = await computeEntriesFromInvoices(api, args.date_start, args.date_end);
      const accounts: Record<string, { debit: number; credit: number }> = {};
      for (const e of entries) {
        const num = String(e.compte);
        accounts[num] ??= { debit: 0, credit: 0 };
        accounts[num].debit  += Number(e.debit  || 0);
        accounts[num].credit += Number(e.credit || 0);
      }
      const balance = Object.entries(accounts).sort(([a], [b]) => a.localeCompare(b))
        .map(([num, v]) => ({
          compte: num,
          debit: v.debit.toFixed(2),
          credit: v.credit.toFixed(2),
          solde: (v.debit - v.credit).toFixed(2),
        }));
      return JSON.stringify({ source: 'calcul simplifié depuis les factures validées (hors banque et OD)', nb_comptes: balance.length, balance }, null, 2);
    }

    case 'list_accounting_accounts': {
      const acc = await defaultAccounts(api);
      return JSON.stringify({
        note: "L'API REST Dolibarr n'expose pas le plan comptable. Comptes par défaut utilisés pour les écritures simplifiées :",
        comptes: {
          clients: acc.customer, fournisseurs: acc.supplier, ventes: acc.sale,
          achats: acc.purchase, tva_collectee: acc.vat_sold, tva_deductible: acc.vat_buy,
        },
        plan_comptable: `${api.webURL}/accountancy/admin/account.php`,
      }, null, 2);
    }

    case 'list_accounting_entries': {
      const entries = await computeEntriesFromInvoices(api, args.date_start, args.date_end);
      return JSON.stringify({
        note: "Écritures simplifiées calculées depuis les factures validées (l'API REST n'expose pas le grand livre).",
        nb_ecritures: entries.length,
        ecritures: entries.slice(0, Number(args.limit) || 100).map(e => ({ ...e, date: formatDate(e.date) })),
      }, null, 2);
    }

    default: throw new Error(`Outil comptabilité avancée inconnu: ${name}`);
  }
}
