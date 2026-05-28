import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const memberTools: Tool[] = [
  { name: 'list_members', description: "Lister les membres/adhérents", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '-1=Tous, 0=Brouillon, 1=Actif, 2=Exclu, 3=Résilié' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_member', description: "Obtenir les détails d'un membre", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_member', description: "Créer un nouveau membre/adhérent", inputSchema: { type: 'object', properties: { lastname: { type: 'string' }, firstname: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' }, zip: { type: 'string' }, town: { type: 'string' }, typeid: { type: 'number', description: 'ID type de membre' }, datefin: { type: 'string', description: "Date de fin d'adhésion ISO 8601" }, note: { type: 'string' } }, required: ['lastname', 'email'] } },
  { name: 'list_member_types', description: "Lister les types de membres", inputSchema: { type: 'object', properties: {} } },
  { name: 'subscribe_member', description: "Créer une cotisation/abonnement pour un membre", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID du membre' }, date: { type: 'string', description: 'Date de début ISO 8601' }, dateend: { type: 'string', description: 'Date de fin ISO 8601' }, amount: { type: 'number', description: 'Montant de la cotisation' }, label: { type: 'string', description: 'Libellé de la cotisation' }, accountid: { type: 'number', description: 'ID compte bancaire' } }, required: ['id', 'date', 'dateend', 'amount'] } },
];

export async function handleMemberTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_members': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) params.status = args.status;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/members', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_member': {
      const data = await api.get(`/members/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_member': {
      if (args.datefin) args.datefin = Math.floor(new Date(args.datefin as string).getTime() / 1000);
      const id = await api.post('/members', args);
      return `✅ Membre créé. ID: ${id}\nNom: ${args.firstname || ''} ${args.lastname}`;
    }
    case 'list_member_types': {
      const data = await api.get('/members/types');
      return JSON.stringify(data, null, 2);
    }
    case 'subscribe_member': {
      const date = Math.floor(new Date(args.date as string).getTime() / 1000);
      const dateend = Math.floor(new Date(args.dateend as string).getTime() / 1000);
      const payload = { date, dateend, amount: args.amount, label: args.label || 'Cotisation', accountid: args.accountid };
      const id = await api.post(`/members/${args.id}/subscriptions`, payload);
      return `✅ Cotisation enregistrée pour le membre #${args.id}. ID: ${id}. Montant: ${args.amount} FCFA`;
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
