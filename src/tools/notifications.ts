import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { andFilters, dateRange, eqNum, fetchAll, json, money, num, paging } from './_util.js';

type R = Record<string, unknown>;

export const notificationTools: Tool[] = [
  {
    name: 'list_notifications',
    description: "Lister les notifications e-mail configurées pour un utilisateur ou un tiers (précisez l'un des deux).",
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'ID utilisateur' },
        thirdparty_id: { type: 'number', description: 'ID tiers' },
      },
    },
  },
  {
    name: 'list_deposits',
    description: "Lister les factures d'acompte (type 3).",
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        page: { type: 'number' },
        thirdparty_ids: { type: 'string', description: 'ID(s) tiers, séparés par virgule' },
        sqlfilters: { type: 'string' },
      },
    },
  },
  {
    name: 'get_activity_stats',
    description: "Statistiques d'activité d'une période : factures validées, commandes et devis (nombre et montants), calculées depuis les documents.",
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Année (défaut : année en cours)' },
        month: { type: 'number', description: 'Mois 1-12 (défaut : année entière)' },
      },
    },
  },
];

export async function handleNotificationTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_notifications': {
      if (args.user_id !== undefined) return json(await api.get(`/users/${args.user_id}/notifications`));
      if (args.thirdparty_id !== undefined) return json(await api.get(`/thirdparties/${args.thirdparty_id}/notifications`));
      throw new Error('Précisez user_id ou thirdparty_id.');
    }
    case 'list_deposits': {
      const sqlfilters = andFilters(eqNum('t.type', 3), args.sqlfilters as string | undefined);
      return json(await api.get('/invoices', { ...paging(args), thirdparty_ids: args.thirdparty_ids, sqlfilters }));
    }
    case 'get_activity_stats': {
      const year = Number(args.year) || new Date().getFullYear();
      const month = args.month === undefined ? undefined : Number(args.month);
      const mm = month ? String(month).padStart(2, '0') : undefined;
      const s = mm ? `${year}-${mm}-01` : `${year}-01-01`;
      const e = mm ? `${year}-${mm}-${String(new Date(year, month as number, 0).getDate()).padStart(2, '0')}` : `${year}-12-31`;
      const [invU, invP, ord, prop] = await Promise.all([
        fetchAll<R>(api, '/invoices', { status: 'unpaid', sqlfilters: dateRange('t.datef', s, e), withLines: false }),
        fetchAll<R>(api, '/invoices', { status: 'paid', sqlfilters: dateRange('t.datef', s, e), withLines: false }),
        fetchAll<R>(api, '/orders', { sqlfilters: dateRange('t.date_commande', s, e) }),
        fetchAll<R>(api, '/proposals', { sqlfilters: dateRange('t.datep', s, e) }),
      ]);
      const inv = [...invU.items, ...invP.items];
      const sum = (a: R[], k: string) => a.reduce((acc, i) => acc + num(i[k]), 0);
      return json({
        periode: mm ? `${year}-${mm}` : String(year),
        factures_validees: inv.length,
        CA_HT: money(sum(inv, 'total_ht')),
        CA_TTC: money(sum(inv, 'total_ttc')),
        nb_commandes: ord.items.length,
        montant_commandes_TTC: money(sum(ord.items, 'total_ttc')),
        nb_devis: prop.items.length,
        montant_devis_TTC: money(sum(prop.items, 'total_ttc')),
        avertissement: [invU, invP, ord, prop].some((x) => x.truncated) ? 'Résultat tronqué : réduisez la période.' : undefined,
      });
    }
    default:
      throw new Error(`Outil notifications inconnu: ${name}`);
  }
}
