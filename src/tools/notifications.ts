import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { objectStatus } from '../validation.js';

type R = Record<string, unknown>;

export const notificationTools: Tool[] = [
  { name: 'list_notifications', description: "Lister les constantes de configuration liées aux notifications et alertes (clé API administrateur requise)", inputSchema: { type: 'object', properties: {} } },
  { name: 'list_deposits', description: "Lister les factures d'acompte (avances clients)", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, thirdparty_ids: { type: 'string' } } } },
  { name: 'get_activity_stats', description: "Statistiques d'activité d'une période : CA facturé, commandes, devis", inputSchema: { type: 'object', properties: { year: { type: 'number' }, month: { type: 'number', description: 'Mois 1-12 (optionnel)' } } } },
];

export async function handleNotificationTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_notifications': {
      const conf = await api.get<R>('/setup/conf');
      const notifs = Object.entries(conf ?? {}).filter(([k]) => k.includes('NOTIFICATION') || k.includes('ALERT'))
        .map(([k, v]) => ({ key: k, value: v }));
      return JSON.stringify({ nb: notifs.length, notifications: notifs }, null, 2);
    }
    case 'list_deposits': {
      // type 3 = facture d'acompte
      const params: R = { sqlfilters: '(t.type:=:3)' };
      if (args.thirdparty_ids) params.thirdparty_ids = args.thirdparty_ids;
      const data = await api.listAll('/invoices', params, Number(args.limit) || 100);
      return JSON.stringify(data, null, 2);
    }
    case 'get_activity_stats': {
      const year = Number(args.year) || new Date().getFullYear();
      const month = args.month ? Number(args.month) : undefined;
      if (month !== undefined && (month < 1 || month > 12)) throw new Error('month doit être compris entre 1 et 12.');
      const mm = month ? String(month).padStart(2, '0') : '';
      const s = month ? `${year}-${mm}-01` : `${year}-01-01`;
      const e = month ? `${year}-${mm}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}` : `${year}-12-31`;
      const range = (field: string) => `(${field}:>=:'${s}') and (${field}:<=:'${e}')`;
      const [inv, ord, prop] = await Promise.all([
        api.listAll('/invoices',  { sqlfilters: range('t.datef') }),
        api.listAll('/orders',    { sqlfilters: range('t.date_commande') }),
        api.listAll('/proposals', { sqlfilters: range('t.datep') }),
      ]);
      // Hors brouillons et documents annulés
      const invA  = inv.filter(i => [1, 2].includes(objectStatus(i)));
      const ordA  = ord.filter(o => objectStatus(o) > 0);
      const propA = prop.filter(p => objectStatus(p) > 0);
      const sum = (arr: R[], f: string) => arr.reduce((acc, x) => acc + Number(x[f] || 0), 0).toFixed(2);
      return JSON.stringify({
        periode: month ? `${year}-${mm}` : String(year),
        chiffre_affaires_HT: sum(invA, 'total_ht'),
        chiffre_affaires_TTC: sum(invA, 'total_ttc'),
        nb_factures: invA.length,
        nb_commandes: ordA.length,
        montant_commandes_TTC: sum(ordA, 'total_ttc'),
        nb_devis: propA.length,
        montant_devis_TTC: sum(propA, 'total_ttc'),
      }, null, 2);
    }
    default: throw new Error(`Outil notifications inconnu: ${name}`);
  }
}
