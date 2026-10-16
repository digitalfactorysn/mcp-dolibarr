import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI, toUnix } from '../api.js';
import { andFilters, eqNum, paging } from './_util.js';

export const memberTools: Tool[] = [
  { name: 'list_members', description: "Lister les membres/adhérents", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '-1=Tous, 0=Brouillon, 1=Actif, 2=Exclu, 3=Résilié' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_member', description: "Obtenir les détails d'un membre", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_member', description: "Créer un nouveau membre/adhérent", inputSchema: { type: 'object', properties: { lastname: { type: 'string' }, firstname: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, address: { type: 'string' }, zip: { type: 'string' }, town: { type: 'string' }, typeid: { type: 'number', description: 'ID type de membre' }, datefin: { type: 'string', description: "Date de fin d'adhésion ISO 8601" }, note: { type: 'string' } }, required: ['lastname', 'email'] } },
  { name: 'list_member_types', description: "Lister les types de membres", inputSchema: { type: 'object', properties: {} } },
  { name: 'subscribe_member', description: "Créer une cotisation/abonnement pour un membre", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID du membre' }, start_date: { type: 'string', description: 'Date de début ISO 8601' }, end_date: { type: 'string', description: 'Date de fin ISO 8601' }, amount: { type: 'number', description: 'Montant de la cotisation' }, label: { type: 'string', description: 'Libellé de la cotisation' } }, required: ['id', 'start_date', 'end_date', 'amount'] } },
];

export async function handleMemberTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_members': {
      // Pas de paramètre « status » côté Dolibarr : filtre USF sur la colonne statut.
      const sqlfilters = andFilters(args.status === undefined || Number(args.status) === -1 ? undefined : eqNum('t.statut', args.status), args.sqlfilters as string | undefined);
      const data = await api.get('/members', { ...paging(args), sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'get_member': {
      const data = await api.get(`/members/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_member': {
      const payload = { ...args, ...(args.datefin ? { datefin: toUnix(args.datefin) } : {}) };
      const id = await api.post('/members', payload);
      return `✅ Membre créé. ID: ${id}\nNom: ${args.firstname || ''} ${args.lastname}`;
    }
    case 'list_member_types': {
      const data = await api.get('/members/types');
      return JSON.stringify(data, null, 2);
    }
    case 'subscribe_member': {
      const id = await api.post(`/members/${args.id}/subscriptions`, {
        start_date: toUnix(args.start_date),
        end_date: toUnix(args.end_date),
        amount: args.amount,
        label: args.label ?? 'Cotisation',
      });
      return `✅ Cotisation enregistrée pour le membre #${args.id}. ID: ${id}. Montant: ${args.amount}`;
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
