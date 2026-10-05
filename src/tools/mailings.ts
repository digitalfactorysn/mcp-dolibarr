import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { addFilter } from '../validation.js';

export const mailingTools: Tool[] = [
  { name: 'list_mailings', description: "Lister les campagnes email/mailing", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=Envoyé, 3=Annulé' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_mailing', description: "Obtenir les détails d'une campagne mailing", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_mailing', description: "Créer une campagne mailing brouillon (l'envoi se fait depuis l'interface Dolibarr)", inputSchema: { type: 'object', properties: { title: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string', description: 'Corps HTML de l\'email' }, from_email: { type: 'string', description: 'Adresse expéditeur (défaut : configuration Dolibarr)' } }, required: ['title', 'subject', 'body'] } },
  { name: 'get_mailing_stats', description: "Statistiques d'une campagne (envois, erreurs)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
];

export async function handleMailingTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_mailings': {
      const params: Record<string, unknown> = { limit: args.limit || 50 };
      if (args.status !== undefined) addFilter(params, `(t.statut:=:${Number(args.status)})`);
      addFilter(params, args.sqlfilters);
      const data = await api.get('/mailings', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_mailing': {
      const data = await api.get(`/mailings/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_mailing': {
      // Expéditeur : valeurs de la configuration Dolibarr si non précisées
      const payload: Record<string, unknown> = { title: args.title, sujet: args.subject, body: args.body };
      if (args.from_email) payload.email_from = args.from_email;
      const id = await api.post('/mailings', payload);
      return `✅ Campagne mailing créée. ID: ${id}\nTitre: ${args.title}`;
    }
    case 'get_mailing_stats': {
      const data = await api.get(`/mailings/${args.id}`) as Record<string, unknown>;
      return JSON.stringify({ id: data.id, titre: data.title, statut: data.statut, nb_destinataires: data.nbemail, nb_envoyes: data.nbsent, nb_erreurs: data.nberrors }, null, 2);
    }
    default: throw new Error(`Outil mailing inconnu: ${name}`);
  }
}
