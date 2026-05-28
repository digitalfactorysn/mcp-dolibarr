import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const ticketTools: Tool[] = [
  { name: 'list_tickets', description: "Lister les tickets support. Statut: 0=Nouveau, 1=En cours, 3=Suspendu, 5=Fermé", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'number' }, thirdparty_id: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_ticket', description: "Obtenir les détails d'un ticket support", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_ticket', description: "Créer un ticket support", inputSchema: { type: 'object', properties: { subject: { type: 'string', description: 'Sujet du ticket' }, message: { type: 'string', description: 'Description du problème' }, socid: { type: 'number', description: 'ID du client' }, type_code: { type: 'string', description: "Type: 'INCIDENT', 'REQUEST', 'QUESTION'" }, category_code: { type: 'string', description: 'Catégorie du ticket' }, severity_code: { type: 'string', description: "Priorité: 'LOW', 'NORMAL', 'HIGH', 'BLOCKING'" }, fk_user_assign: { type: 'number', description: 'ID utilisateur assigné' } }, required: ['subject', 'message'] } },
  { name: 'add_ticket_message', description: "Ajouter un message/réponse à un ticket", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID du ticket' }, message: { type: 'string', description: 'Contenu du message' }, private_message: { type: 'number', description: '1=Message interne, 0=Message client' } }, required: ['id', 'message'] } },
  { name: 'close_ticket', description: "Fermer un ticket support", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'assign_ticket', description: "Assigner un ticket à un utilisateur", inputSchema: { type: 'object', properties: { id: { type: 'number' }, user_id: { type: 'number', description: "ID de l'utilisateur à assigner" } }, required: ['id', 'user_id'] } },
];

export async function handleTicketTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_tickets': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/tickets', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_ticket': {
      const data = await api.get(`/tickets/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_ticket': {
      const payload = {
        subject: args.subject,
        message: args.message,
        socid: args.socid,
        type_code: args.type_code || 'INCIDENT',
        category_code: args.category_code || '',
        severity_code: args.severity_code || 'NORMAL',
        fk_user_assign: args.fk_user_assign,
        date_creation: Math.floor(Date.now() / 1000),
      };
      const id = await api.post('/tickets', payload);
      return `✅ Ticket créé. ID: ${id}\nSujet: ${args.subject}`;
    }
    case 'add_ticket_message': {
      await api.post(`/tickets/${args.id}/messages`, { message: args.message, private_message: args.private_message || 0 });
      return `✅ Message ajouté au ticket #${args.id}.`;
    }
    case 'close_ticket': {
      await api.put(`/tickets/${args.id}`, { status: 5 });
      return `✅ Ticket #${args.id} fermé.`;
    }
    case 'assign_ticket': {
      await api.put(`/tickets/${args.id}`, { fk_user_assign: args.user_id });
      return `✅ Ticket #${args.id} assigné à l'utilisateur #${args.user_id}.`;
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
