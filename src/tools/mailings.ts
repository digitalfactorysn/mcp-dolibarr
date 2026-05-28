import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const mailingTools: Tool[] = [
  { name: 'list_mailings', description: "Lister les campagnes email/mailing", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=Envoyé, 3=Annulé' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_mailing', description: "Obtenir les détails d'une campagne mailing", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_mailing', description: "Créer une campagne mailing", inputSchema: { type: 'object', properties: { title: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string', description: 'Corps HTML de l\'email' }, from_name: { type: 'string' }, from_email: { type: 'string' } }, required: ['title', 'subject', 'body'] } },
  { name: 'send_mailing', description: "Envoyer une campagne mailing validée", inputSchema: { type: 'object', properties: { id: { type: 'number' }, limit: { type: 'number', description: 'Nb max de destinataires (0=tous)' } }, required: ['id'] } },
  { name: 'get_mailing_stats', description: "Statistiques d'une campagne (envois, erreurs)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
];

// Supprimé: resourceTools (501 - pas d'API REST dans Dolibarr 23)
export const resourceTools: Tool[] = [];

export async function handleMailingTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_mailings': {
      const params: Record<string, unknown> = { limit: args.limit || 50 };
      if (args.status !== undefined) params.status = args.status;
      const data = await api.get('/mailings', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_mailing': {
      const data = await api.get(`/mailings/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_mailing': {
      const payload = { title: args.title, sujet: args.subject, body: args.body, from_name: args.from_name || 'Digital Factory', from_email: args.from_email || 'infos@digitalfactory.sn' };
      const id = await api.post('/mailings', payload);
      return `✅ Campagne mailing créée. ID: ${id}\nTitre: ${args.title}`;
    }
    case 'send_mailing': {
      const data = await api.post(`/mailings/${args.id}/send`, { limit: args.limit || 0 });
      return `✅ Campagne #${args.id} envoyée.\n${JSON.stringify(data, null, 2)}`;
    }
    case 'get_mailing_stats': {
      const data = await api.get(`/mailings/${args.id}`) as Record<string, unknown>;
      return JSON.stringify({ id: data.id, titre: data.title, statut: data.statut, nb_destinataires: data.nbemail, nb_envoyes: data.nbsent, nb_erreurs: data.nberrors }, null, 2);
    }
    default: throw new Error(`Outil mailing inconnu: ${name}`);
  }
}
export async function handleResourceTool(name: string, args: Record<string, unknown>, _api: DolibarrAPI): Promise<string> {
  throw new Error(`Le module Ressources n'a pas d'API REST dans Dolibarr 23. Gérez les ressources depuis l'interface web.`);
}
