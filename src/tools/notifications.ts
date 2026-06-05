import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

type R = Record<string, unknown>;

export const notificationTools: Tool[] = [
  { name: 'list_notifications', description: "Lister les modèles de notifications configurés", inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
  { name: 'list_deposits', description: "Lister les factures d'acompte (avances clients)", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, thirdparty_ids: { type: 'string' }, sqlfilters: { type: 'string' } } } },
  { name: 'create_deposit', description: "Créer une facture d'acompte depuis un devis ou une commande", inputSchema: { type: 'object', properties: { origin_type: { type: 'string', description: "'propal' ou 'commande'" }, origin_id: { type: 'number' }, deposit_percent: { type: 'number', description: "% d'acompte (ex: 30)" }, date: { type: 'string' }, payment_terms_id: { type: 'number' } }, required: ['origin_type', 'origin_id', 'deposit_percent'] } },
  { name: 'get_webportal_config', description: "Configuration du portail client Digital Factory", inputSchema: { type: 'object', properties: {} } },
  { name: 'list_online_payments', description: "Paiements en ligne reçus (Stripe/PayPal)", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'string' } } } },
  { name: 'get_activity_stats', description: "Statistiques d'activité: CA, commandes, devis par mois/année", inputSchema: { type: 'object', properties: { year: { type: 'number' }, month: { type: 'number', description: 'Mois 1-12 (optionnel)' } } } },
];

export async function handleNotificationTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_notifications':
      const conf = await api.get<Record<string,unknown>>('/setup/conf') as Record<string,unknown>;
      const notifs = Object.entries(conf).filter(([k]) => k.includes('NOTIFICATION') || k.includes('ALERT'))
        .map(([k, v]) => ({ key: k, value: v }));
      return JSON.stringify({ nb: notifs.length, notifications: notifs }, null, 2);
    case 'list_deposits': {
      const params: R = { limit: args.limit || 100, type: 3 };
      if (args.thirdparty_ids) params.thirdparty_ids = args.thirdparty_ids;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return JSON.stringify(await api.get('/invoices', params), null, 2);
    }
    case 'create_deposit': {
      const date = args.date ? Math.floor(new Date(args.date as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const id = await api.post('/invoices/createfromorigin', { origin_type: args.origin_type, origin_id: args.origin_id, deposit_percent: args.deposit_percent, date, payment_terms_id: args.payment_terms_id });
      return `✅ Facture d'acompte créée (${args.deposit_percent}% de ${args.origin_type} #${args.origin_id}). ID: ${id}`;
    }
    case 'get_webportal_config': {
      const data = await api.get<R>('/setup/conf') as R;
      const wp: R = {};
      for (const [k, v] of Object.entries(data)) { if (k.startsWith('WEBPORTAL_') || k.startsWith('RIGHTS_PORTAILFACTUR')) wp[k] = v; }
      return JSON.stringify(wp, null, 2);
    }
    case 'list_online_payments': {
      // Module Stripe/PayPal non configuré sur ce serveur
      return JSON.stringify({ message: 'Module paiement en ligne non configuré. Activez Stripe ou PayPal dans Dolibarr → Modules.', status: 'not_configured' }, null, 2);
    }
    case 'get_activity_stats': {
      const year = (args.year as number) || new Date().getFullYear();
      const month = args.month as number | undefined;
      const s = month ? `${year}-${String(month).padStart(2,'0')}-01` : `${year}-01-01`;
      const e = month ? `${year}-${String(month).padStart(2,'0')}-${new Date(year, month, 0).getDate()}` : `${year}-12-31`;
      const [inv, ord, prop] = await Promise.all([
        api.get<unknown[]>('/invoices',  { status: 2, limit: 500, datestart: Math.floor(new Date(s).getTime()/1000), dateend: Math.floor(new Date(e).getTime()/1000) }),
        api.get<unknown[]>('/orders',    { limit: 200, datestart: Math.floor(new Date(s).getTime()/1000), dateend: Math.floor(new Date(e).getTime()/1000) }),
        api.get<unknown[]>('/proposals', { limit: 200, datestart: Math.floor(new Date(s).getTime()/1000), dateend: Math.floor(new Date(e).getTime()/1000) }),
      ]);
      const invA  = (Array.isArray(inv)  ? inv  : []) as R[];
      const ordA  = (Array.isArray(ord)  ? ord  : []) as R[];
      const propA = (Array.isArray(prop) ? prop : []) as R[];
      return JSON.stringify({
        periode: month ? `${year}-${String(month).padStart(2,'0')}` : String(year),
        chiffre_affaires_TTC: invA.reduce((s, i)  => s + Number(i.total_ttc || 0), 0).toFixed(2),
        chiffre_affaires_HT:  invA.reduce((s, i)  => s + Number(i.total_ht  || 0), 0).toFixed(2),
        nb_factures:    invA.length,
        nb_commandes:   ordA.length,
        montant_commandes: ordA.reduce((s, o) => s + Number(o.total_ttc || 0), 0).toFixed(2),
        nb_devis:       propA.length,
        montant_devis:  propA.reduce((s, p) => s + Number(p.total_ttc || 0), 0).toFixed(2),
      }, null, 2);
    }
    default: throw new Error(`Outil notifications inconnu: ${name}`);
  }
}


