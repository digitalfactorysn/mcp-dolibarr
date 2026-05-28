import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const mailingTools: Tool[] = [
  { name: 'list_mailings', description: "Lister les campagnes email/mailing", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=Envoyé, 3=Annulé' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_mailing', description: "Obtenir les détails d'une campagne mailing", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_mailing', description: "Créer une campagne mailing", inputSchema: { type: 'object', properties: { title: { type: 'string', description: 'Titre de la campagne' }, subject: { type: 'string', description: "Objet de l'email" }, body: { type: 'string', description: 'Corps de l\'email (HTML)' }, from_name: { type: 'string', description: 'Nom expéditeur' }, from_email: { type: 'string', description: 'Email expéditeur' }, replyto: { type: 'string', description: 'Email de réponse' } }, required: ['title', 'subject', 'body'] } },
  { name: 'send_mailing', description: "Envoyer/déclencher une campagne mailing validée", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de la campagne' }, limit: { type: 'number', description: 'Nombre max de destinataires à envoyer (0=tous)' } }, required: ['id'] } },
  { name: 'get_mailing_stats', description: "Obtenir les statistiques d'une campagne (envois, ouvertures, clics)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
];

export const resourceTools: Tool[] = [
  { name: 'list_resources', description: "Lister les ressources (machines, salles, équipements)", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, type_id: { type: 'number', description: 'Filtrer par type de ressource' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_resource', description: "Obtenir les détails d'une ressource", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_resource', description: "Créer une ressource", inputSchema: { type: 'object', properties: { ref: { type: 'string' }, label: { type: 'string' }, description: { type: 'string' }, fk_code: { type: 'number', description: 'ID type de ressource' }, qty: { type: 'number', description: 'Quantité disponible (défaut: 1)' } }, required: ['ref', 'label'] } },
];

export async function handleMailingTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_mailings': {
      const params: Record<string, unknown> = { limit: args.limit || 50 };
      if (args.status !== undefined) params.status = args.status;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/mailings', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_mailing': {
      const data = await api.get(`/mailings/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_mailing': {
      const payload = {
        title: args.title,
        sujet: args.subject,
        body: args.body,
        from_name: args.from_name || 'Digital Factory',
        from_email: args.from_email || 'infos@digitalfactory.sn',
        replyto: args.replyto || args.from_email || 'infos@digitalfactory.sn',
      };
      const id = await api.post('/mailings', payload);
      return `✅ Campagne mailing créée. ID: ${id}\nTitre: ${args.title}`;
    }
    case 'send_mailing': {
      const data = await api.post(`/mailings/${args.id}/send`, { limit: args.limit || 0 });
      return `✅ Campagne #${args.id} envoyée.\n${JSON.stringify(data, null, 2)}`;
    }
    case 'get_mailing_stats': {
      const data = await api.get(`/mailings/${args.id}`);
      const d = data as Record<string, unknown>;
      return JSON.stringify({
        id: d.id,
        titre: d.title,
        statut: d.statut,
        nb_destinataires: d.nbemail,
        nb_envoyes: d.nbsent,
        nb_erreurs: d.nberrors,
        taux_envoi: d.nbemail ? `${Math.round((d.nbsent as number) / (d.nbemail as number) * 100)}%` : '0%',
      }, null, 2);
    }
    default: throw new Error(`Outil mailing inconnu: ${name}`);
  }
}

export async function handleResourceTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_resources': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.type_id) params.type_id = args.type_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/resources', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_resource': {
      const data = await api.get(`/resources/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_resource': {
      const id = await api.post('/resources', { ...args, qty: args.qty || 1 });
      return `✅ Ressource "${args.label}" créée. ID: ${id}`;
    }
    default: throw new Error(`Outil ressource inconnu: ${name}`);
  }
}
