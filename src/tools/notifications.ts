import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const notificationTools: Tool[] = [
  { name: 'list_notifications', description: "Lister les modèles de notifications configurés dans Dolibarr", inputSchema: { type: 'object', properties: { limit: { type: 'number' } } } },
  { name: 'list_deposits', description: "Lister les factures d'acompte (dépôts/avances clients)", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, thirdparty_ids: { type: 'string', description: 'ID(s) client(s), séparés par virgule' }, sqlfilters: { type: 'string' } } } },
  { name: 'create_deposit', description: "Créer une facture d'acompte (avance/dépôt client) depuis un devis ou commande", inputSchema: { type: 'object', properties: { origin_type: { type: 'string', description: "'propal' (devis) ou 'commande' (commande client)" }, origin_id: { type: 'number', description: 'ID du devis ou de la commande' }, deposit_percent: { type: 'number', description: "Pourcentage d'acompte (ex: 30 pour 30%)" }, date: { type: 'string', description: 'Date de la facture ISO 8601' }, payment_terms_id: { type: 'number', description: 'ID condition de paiement' } }, required: ['origin_type', 'origin_id', 'deposit_percent'] } },
  { name: 'get_webportal_config', description: "Obtenir la configuration du portail client Digital Factory", inputSchema: { type: 'object', properties: {} } },
  { name: 'list_online_payments', description: "Lister les paiements en ligne reçus (Stripe, PayPal)", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'string', description: "'succeeded', 'pending', 'failed'" } } } },
  { name: 'get_activity_stats', description: "Statistiques d'activité globales: CA, commandes, devis du mois en cours et de l'année", inputSchema: { type: 'object', properties: { year: { type: 'number', description: 'Année (défaut: en cours)' }, month: { type: 'number', description: 'Mois 1-12 (optionnel)' } } } },
];

export async function handleNotificationTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_notifications': {
      const data = await api.get('/notifications', { limit: args.limit || 50 });
      return JSON.stringify(data, null, 2);
    }
    case 'list_deposits': {
      const params: Record<string, unknown> = { limit: args.limit || 100, type: 3 };
      if (args.thirdparty_ids) params.thirdparty_ids = args.thirdparty_ids;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/invoices', params);
      return JSON.stringify(data, null, 2);
    }
    case 'create_deposit': {
      const date = args.date ? Math.floor(new Date(args.date as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const payload = { origin_type: args.origin_type, origin_id: args.origin_id, deposit_percent: args.deposit_percent, date, payment_terms_id: args.payment_terms_id };
      const id = await api.post('/invoices/createfromorigin', payload);
      return `✅ Facture d'acompte créée (${args.deposit_percent}% de ${args.origin_type} #${args.origin_id}). ID: ${id}`;
    }
    case 'get_webportal_config': {
      const data = await api.get('/setup/conf') as Record<string, string>;
      const webportal: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) {
        if (k.startsWith('WEBPORTAL_') || k.startsWith('RIGHTS_PORTAILFACTUR')) webportal[k] = v;
      }
      return JSON.stringify(webportal, null, 2);
    }
    case 'list_online_payments': {
      const params: Record<string, unknown> = { limit: args.limit || 50 };
      if (args.status) params.status = args.status;
      const data = await api.get('/stripe/payments', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_activity_stats': {
      const year = args.year || new Date().getFullYear();
      const month = args.month;
      let startFilter: string, endFilter: string;
      if (month) {
        const m = String(month).padStart(2, '0');
        startFilter = `${year}-${m}-01`;
        const lastDay = new Date(year as number, month as number, 0).getDate();
        endFilter = `${year}-${m}-${lastDay}`;
      } else {
        startFilter = `${year}-01-01`;
        endFilter = `${year}-12-31`;
      }
      const [invoices, orders, proposals] = await Promise.all([
        api.get<unknown[]>('/invoices', { status: 2, limit: 500, sqlfilters: `(t.datef:>='${startFilter}') and (t.datef:<='${endFilter}')` }),
        api.get<unknown[]>('/orders', { limit: 200, sqlfilters: `(t.date_commande:>='${startFilter}') and (t.date_commande:<='${endFilter}')` }),
        api.get<unknown[]>('/proposals', { limit: 200, sqlfilters: `(t.date_valid:>='${startFilter}') and (t.date_valid:<='${endFilter}')` }),
      ]);
      const invArr = Array.isArray(invoices) ? invoices : [];
      const ordArr = Array.isArray(orders) ? orders : [];
      const propArr = Array.isArray(proposals) ? proposals : [];
      return JSON.stringify({
        periode: month ? `${year}-${String(month).padStart(2,'0')}` : String(year),
        chiffre_affaires_TTC: invArr.reduce((s:number,i:Record<string,unknown>) => s + Number(i.total_ttc||0), 0).toFixed(2),
        chiffre_affaires_HT: invArr.reduce((s:number,i:Record<string,unknown>) => s + Number(i.total_ht||0), 0).toFixed(2),
        nb_factures_emises: invArr.length,
        nb_commandes: ordArr.length,
        montant_commandes: ordArr.reduce((s:number,o:Record<string,unknown>) => s + Number(o.total_ttc||0), 0).toFixed(2),
        nb_devis: propArr.length,
        montant_devis: propArr.reduce((s:number,p:Record<string,unknown>) => s + Number(p.total_ttc||0), 0).toFixed(2),
      }, null, 2);
    }
    default: throw new Error(`Outil notifications inconnu: ${name}`);
  }
}
