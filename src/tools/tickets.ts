import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const ticketTools: Tool[] = [
  {
    name: 'list_tickets',
    description: 'Lister les tickets support. Statut: 0=Ouvert, 1=En cours, 3=Résolu, 5=Fermé',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        status: { type: 'string', description: "Statut: '0'=Ouvert, '1'=En cours, '3'=Résolu, '5'=Fermé" },
        thirdparty_id: { type: 'number', description: 'Filtrer par tiers client' },
        user_assigned: { type: 'number', description: 'Filtrer par utilisateur assigné' },
        category: { type: 'string', description: 'Code catégorie ticket' },
        sqlfilters: { type: 'string', description: "Filtre SQL ex: (t.subject:like:'%livraison%')" },
      },
    },
  },
  {
    name: 'get_ticket',
    description: 'Obtenir les détails complets d\'un ticket support (messages, historique)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du ticket' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_ticket',
    description: 'Créer un nouveau ticket support',
    inputSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Sujet du ticket' },
        message: { type: 'string', description: 'Description détaillée du problème' },
        type_code: { type: 'string', description: "Type: 'INCIDENT', 'REQUEST', 'OTHER'" },
        category_code: { type: 'string', description: 'Code catégorie (voir list_ticket_categories)' },
        severity_code: { type: 'string', description: "Gravité: 'LOW', 'NORMAL', 'HIGH', 'BLOCKING'" },
        fk_soc: { type: 'number', description: 'ID du tiers client' },
        fk_contact: { type: 'number', description: 'ID du contact' },
        fk_user_assign: { type: 'number', description: 'ID utilisateur assigné' },
        notify_tiers_at_create: { type: 'number', description: '1=Notifier le client par email, 0=Non' },
      },
      required: ['subject', 'message'],
    },
  },
  {
    name: 'update_ticket',
    description: 'Modifier un ticket (statut, assignation, priorité)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du ticket' },
        subject: { type: 'string', description: 'Nouveau sujet' },
        type_code: { type: 'string', description: 'Nouveau type' },
        category_code: { type: 'string', description: 'Nouvelle catégorie' },
        severity_code: { type: 'string', description: 'Nouvelle gravité' },
        fk_user_assign: { type: 'number', description: 'Nouvel utilisateur assigné' },
        progress: { type: 'number', description: 'Avancement en % (0-100)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'close_ticket',
    description: 'Fermer/résoudre un ticket support',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du ticket' },
        resolution: { type: 'string', description: 'Message de résolution' },
      },
      required: ['id'],
    },
  },
  {
    name: 'add_ticket_message',
    description: 'Ajouter un message/réponse à un ticket support',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du ticket' },
        message: { type: 'string', description: 'Contenu du message' },
        private_message: { type: 'number', description: '1=Message privé (interne), 0=Message public (client voit)' },
      },
      required: ['id', 'message'],
    },
  },
  {
    name: 'list_ticket_messages',
    description: 'Lister les messages/historique d\'un ticket support',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du ticket' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_ticket',
    description: 'Supprimer un ticket support',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du ticket à supprimer' },
      },
      required: ['id'],
    },
  },
];

export async function handleTicketTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_tickets': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) params.status = args.status;
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.user_assigned) params.fk_user_assign = args.user_assigned;
      if (args.category) params.category = args.category;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/tickets', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_ticket': {
      const [ticket, messages] = await Promise.all([
        api.get(`/tickets/${args.id}`),
        api.get(`/tickets/${args.id}/logs`).catch(() => []),
      ]);
      return JSON.stringify({ ticket, messages }, null, 2);
    }
    case 'create_ticket': {
      const payload = {
        subject: args.subject,
        message: args.message,
        type_code: args.type_code || 'INCIDENT',
        category_code: args.category_code || '',
        severity_code: args.severity_code || 'NORMAL',
        fk_soc: args.fk_soc,
        fk_contact: args.fk_contact,
        fk_user_assign: args.fk_user_assign,
        notify_tiers_at_create: args.notify_tiers_at_create || 0,
      };
      const id = await api.post('/tickets', payload);
      return `✅ Ticket créé. ID: ${id}\nSujet: ${args.subject} | Gravité: ${payload.severity_code}`;
    }
    case 'update_ticket': {
      const { id, ...rest } = args;
      await api.put(`/tickets/${id}`, rest);
      return `✅ Ticket #${id} mis à jour.`;
    }
    case 'close_ticket': {
      const payload = {
        resolution: args.resolution || 'Ticket résolu.',
        status: '8', // Closed
      };
      await api.put(`/tickets/${args.id}`, payload);
      return `✅ Ticket #${args.id} fermé.`;
    }
    case 'add_ticket_message': {
      const payload = {
        message: args.message,
        private_message: args.private_message !== undefined ? args.private_message : 0,
      };
      await api.post(`/tickets/${args.id}/newmessage`, payload);
      return `✅ Message ajouté au ticket #${args.id}.`;
    }
    case 'list_ticket_messages': {
      const data = await api.get(`/tickets/${args.id}/logs`);
      return JSON.stringify(data, null, 2);
    }
    case 'delete_ticket': {
      await api.delete(`/tickets/${args.id}`);
      return `✅ Ticket #${args.id} supprimé.`;
    }
    default:
      throw new Error(`Outil ticket inconnu: ${name}`);
  }
}
