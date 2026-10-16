import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ApiError, DolibarrAPI } from '../api.js';
import { andFilters, eqNum, paging } from './_util.js';

export const ticketTools: Tool[] = [
  { name: 'list_tickets', description: "Lister les tickets support. Statut : 0=Non lu, 1=Lu, 2=Assigné, 3=En cours, 5=Info requise, 7=En attente, 8=Fermé, 9=Annulé", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'number' }, thirdparty_id: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_ticket', description: "Obtenir les détails d'un ticket support", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_ticket', description: "Créer un ticket support", inputSchema: { type: 'object', properties: { subject: { type: 'string', description: 'Sujet du ticket' }, message: { type: 'string', description: 'Description du problème' }, socid: { type: 'number', description: 'ID du client' }, type_code: { type: 'string', description: "Code du dictionnaire ticket_types (ex. ISSUE, REQUEST, HELP, COM, OTHER)" }, category_code: { type: 'string', description: 'Catégorie du ticket' }, severity_code: { type: 'string', description: "Priorité: 'LOW', 'NORMAL', 'HIGH', 'BLOCKING'" }, fk_user_assign: { type: 'number', description: 'ID utilisateur assigné' } }, required: ['subject', 'message'] } },
  { name: 'add_ticket_message', description: "Ajouter un message/réponse à un ticket", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID du ticket' }, message: { type: 'string', description: 'Contenu du message' } }, required: ['id', 'message'] } },
  { name: 'close_ticket', description: "Fermer un ticket support", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'assign_ticket', description: "Assigner un ticket à un utilisateur", inputSchema: { type: 'object', properties: { id: { type: 'number' }, user_id: { type: 'number', description: "ID de l'utilisateur à assigner" } }, required: ['id', 'user_id'] } },
];

export async function handleTicketTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_tickets': {
      const sqlfilters = andFilters(eqNum('t.fk_statut', args.status), args.sqlfilters as string | undefined);
      const data = await api.get('/tickets', { ...paging(args), socid: args.thirdparty_id, sqlfilters });
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
        fk_soc: args.socid,
        type_code: args.type_code ?? 'ISSUE',
        category_code: args.category_code,
        severity_code: args.severity_code ?? 'NORMAL',
        fk_user_assign: args.fk_user_assign,
      };
      const id = await api.post('/tickets', payload);
      return `✅ Ticket créé. ID: ${id}\nSujet: ${args.subject}`;
    }
    case 'add_ticket_message': {
      // L'API identifie le ticket par son track_id, pas par son identifiant numérique.
      const ticket = await api.get<{ track_id?: string }>(`/tickets/${args.id}`);
      if (!ticket?.track_id) throw new ApiError(`Ticket #${args.id} introuvable ou sans track_id.`);
      await api.post('/tickets/newmessage', { track_id: ticket.track_id, message: args.message });
      return `✅ Message ajouté au ticket #${args.id}.`;
    }
    case 'close_ticket': {
      await api.put(`/tickets/${args.id}`, { fk_statut: 8 });
      return `✅ Ticket #${args.id} fermé.`;
    }
    case 'assign_ticket': {
      await api.put(`/tickets/${args.id}`, { fk_user_assign: args.user_id });
      return `✅ Ticket #${args.id} assigné à l'utilisateur #${args.user_id}.`;
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
