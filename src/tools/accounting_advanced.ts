import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { andFilters, dateRange, fetchAll, json, money, num } from './_util.js';

type R = Record<string, unknown>;

/**
 * Seuls les outils réellement réalisables avec l'API REST de Dolibarr sont conservés.
 * L'API n'expose NI le grand livre (bookkeeping), NI le plan comptable, NI les journaux,
 * NI la création d'écritures, NI le rapprochement bancaire : ces outils (qui renvoyaient
 * auparavant des données de substitution inventées) ont été supprimés.
 */
export const accountingAdvancedTools: Tool[] = [
  {
    name: 'get_customer_statement',
    description: "Relevé d'un client : factures validées (période facultative), montants payés et reste dû.",
    inputSchema: {
      type: 'object',
      properties: {
        thirdparty_id: { type: 'number', description: 'ID du client' },
        date_start: { type: 'string', description: 'Date de facture minimale (AAAA-MM-JJ)' },
        date_end: { type: 'string', description: 'Date de facture maximale (AAAA-MM-JJ)' },
      },
      required: ['thirdparty_id'],
    },
  },
  {
    name: 'get_vat_report',
    description:
      "TVA d'une période calculée sur les factures validées (TVA sur les débits : date de facture), clients et fournisseurs. Indicatif : ne remplace pas la déclaration comptable.",
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number' },
        month: { type: 'number', description: 'Mois 1-12 (si vide = année entière)' },
      },
      required: ['year'],
    },
  },
  {
    name: 'get_aged_balance',
    description: "Balance âgée des factures impayées (clients ou fournisseurs) par retard d'échéance.",
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['customer', 'supplier'], description: "'customer' (défaut) ou 'supplier'" },
      },
    },
  },
  {
    name: 'export_accounting_entries',
    description:
      "Export comptable natif Dolibarr (accountancy/exportdata, Dolibarr 24+ uniquement) pour une période. Lecture seule : ne marque pas les écritures comme exportées.",
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['lastmonth', 'currentmonth', 'last3months', 'last6months', 'currentyear', 'lastyear', 'fiscalyear', 'lastfiscalyear', 'actualandlastfiscalyear', 'custom'],
          description: "Période ('custom' avec date_start/date_end)",
        },
        date_start: { type: 'string', description: "Début si period='custom' (AAAA-MM-JJ)" },
        date_end: { type: 'string', description: "Fin si period='custom' (AAAA-MM-JJ)" },
      },
      required: ['period'],
    },
  },
];

const dayMs = 86_400_000;
/** `withLines` n'existe que sur /invoices ; /supplierinvoices renvoie toujours les lignes. */
const lines = (endpoint: string): R => (endpoint === '/invoices' ? { withLines: false } : {});

export async function handleAccountingAdvancedTool(name: string, args: R, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'get_customer_statement': {
      const sqlfilters = dateRange('t.datef', args.date_start, args.date_end);
      const [tp, paid, unpaid] = await Promise.all([
        api.get<R>(`/thirdparties/${args.thirdparty_id}`),
        fetchAll<R>(api, '/invoices', { thirdparty_ids: String(args.thirdparty_id), status: 'paid', sqlfilters, withLines: false }),
        fetchAll<R>(api, '/invoices', { thirdparty_ids: String(args.thirdparty_id), status: 'unpaid', sqlfilters, withLines: false }),
      ]);
      const sum = (a: R[], f: (i: R) => number) => a.reduce((s, i) => s + f(i), 0);
      const due = sum(unpaid.items, (i) => num(i.remaintopay ?? i.total_ttc));
      return json({
        client: { id: tp.id, nom: tp.name, code: tp.code_client },
        total_facture_TTC: money(sum(paid.items, (i) => num(i.total_ttc)) + sum(unpaid.items, (i) => num(i.total_ttc))),
        reste_du_TTC: money(due),
        nb_factures_payees: paid.items.length,
        nb_factures_impayees: unpaid.items.length,
        factures_impayees: unpaid.items.map((i) => ({
          ref: i.ref,
          date: i.date,
          echeance: i.date_lim_reglement,
          montant_ttc: i.total_ttc,
          reste_a_payer: i.remaintopay,
        })),
        avertissement: paid.truncated || unpaid.truncated ? 'Résultat tronqué : affinez la période.' : undefined,
      });
    }

    case 'get_vat_report': {
      const year = Number(args.year);
      const month = args.month === undefined ? undefined : Number(args.month);
      const mm = month ? String(month).padStart(2, '0') : undefined;
      const start = mm ? `${year}-${mm}-01` : `${year}-01-01`;
      const end = mm ? `${year}-${mm}-${String(new Date(year, month as number, 0).getDate()).padStart(2, '0')}` : `${year}-12-31`;
      const sqlfilters = dateRange('t.datef', start, end);
      const grab = async (endpoint: string) => {
        const [a, b] = await Promise.all([
          fetchAll<R>(api, endpoint, { status: 'unpaid', sqlfilters, ...lines(endpoint) }),
          fetchAll<R>(api, endpoint, { status: 'paid', sqlfilters, ...lines(endpoint) }),
        ]);
        return { items: [...a.items, ...b.items], truncated: a.truncated || b.truncated };
      };
      const [sales, purch] = await Promise.all([grab('/invoices'), grab('/supplierinvoices')]);
      const tot = (a: R[], k: string) => a.reduce((s, i) => s + num(i[k]), 0);
      const tvaC = tot(sales.items, 'total_tva');
      const tvaD = tot(purch.items, 'total_tva');
      return json({
        periode: mm ? `${year}-${mm}` : String(year),
        base: 'factures validées (brouillons et abandonnées exclus), TVA sur les débits',
        TVA_collectee: money(tvaC),
        TVA_deductible: money(tvaD),
        TVA_nette: money(tvaC - tvaD),
        CA_HT: money(tot(sales.items, 'total_ht')),
        achats_HT: money(tot(purch.items, 'total_ht')),
        nb_factures_ventes: sales.items.length,
        nb_factures_achats: purch.items.length,
        avertissement: sales.truncated || purch.truncated ? 'Résultat tronqué : réduisez la période.' : undefined,
      });
    }

    case 'get_aged_balance': {
      const supplier = args.type === 'supplier';
      const { items, truncated } = await fetchAll<R>(api, supplier ? '/supplierinvoices' : '/invoices', { status: 'unpaid', ...lines(supplier ? '/supplierinvoices' : '/invoices') });
      const now = Date.now();
      const keys = ['non_echu', '1-30j', '31-60j', '61-90j', '+90j'] as const;
      const b = Object.fromEntries(keys.map((k) => [k, { nb: 0, total: 0, details: [] as R[] }])) as Record<(typeof keys)[number], { nb: number; total: number; details: R[] }>;
      let total = 0;
      for (const i of items) {
        const due = num(i.date_lim_reglement);
        const late = due ? Math.floor((now - due * 1000) / dayMs) : 0;
        const amount = num(i.remaintopay ?? i.total_ttc);
        total += amount;
        const k = late <= 0 ? 'non_echu' : late <= 30 ? '1-30j' : late <= 60 ? '31-60j' : late <= 90 ? '61-90j' : '+90j';
        b[k].nb++;
        b[k].total += amount;
        b[k].details.push({ ref: i.ref, tiers: i.socid, montant: amount, jours_retard: Math.max(late, 0) });
      }
      return json({
        type: supplier ? 'supplier' : 'customer',
        total_impaye: money(total),
        ...Object.fromEntries(keys.map((k) => [k, { nb: b[k].nb, total: money(b[k].total), ...(k === '+90j' ? { details: b[k].details } : {}) }])),
        avertissement: truncated ? 'Résultat tronqué (trop de factures).' : undefined,
      });
    }

    case 'export_accounting_entries': {
      const params: R = { period: args.period, notnotifiedasexport: 1 };
      if (args.period === 'custom') {
        params.date_min = args.date_start;
        params.date_max = args.date_end;
      }
      const data = await api.get('/accountancy/exportdata', params);
      return typeof data === 'string' ? data : json(data);
    }

    default:
      throw new Error(`Outil comptabilité avancée inconnu: ${name}`);
  }
}
