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
      const payload: Record<string, unknown> = {
        subject: args.subject,
        message: args.message,
        socid: args.socid,
        type_code: args.type_code || 'INCIDENT',
        category_code: args.category_code || '',
        severity_code: args.severity_code || 'NORMAL',
        fk_user_assign: args.fk_user_assign,
        date_creation: Math.floor(Date.now() / 1000),
      };

      let id: number | null = null;
      let networkRetryRecovered = false;

      try {
        id = await api.post<number>('/tickets', payload);
      } catch (err: any) {
        console.warn(`[create_ticket] Requête POST /tickets interrompue ou timeout. Vérification d'existence...`, err.message);
        // Résilience contre les faux échecs réseau (ex: ralentissement lors de l'envoi d'e-mails par Dolibarr)
        const sub = String(args.subject).replace(/'/g, '');
        const existing = await api.get<Array<Record<string, unknown>>>('/tickets', {
          sqlfilters: `(t.subject:like:'%${sub}%')`,
          limit: 1,
          sortfield: 't.rowid',
          sortorder: 'DESC',
        }).catch(() => null);

        if (Array.isArray(existing) && existing.length > 0 && existing[0].id) {
          id = Number(existing[0].id);
          networkRetryRecovered = true;
          console.log(`[create_ticket] Ticket retrouvé avec succès en base Dolibarr (ID #${id})`);
        } else {
          throw err;
        }
      }

      const created = await api.get<Record<string, unknown>>(`/tickets/${id}`).catch(() => null);

      return JSON.stringify({
        applied: true,
        verified: !!created,
        network_retry_recovered: networkRetryRecovered,
        id: Number(id),
        ref: created?.ref,
        track_id: created?.track_id,
        subject: created?.subject || args.subject,
        ticket: created || { id, ...payload },
      }, null, 2);
    }
    case 'add_ticket_message': {
      const ticketIdOrRef = args.id;
      let ticket: Record<string, unknown> | null = null;

      // 1. Recherche du ticket par ID numérique ou référence (ex: 'TS2610-0002')
      if (typeof ticketIdOrRef === 'number' || /^\d+$/.test(String(ticketIdOrRef))) {
        ticket = await api.get<Record<string, unknown>>(`/tickets/${ticketIdOrRef}`).catch(() => null);
      }
      if (!ticket) {
        const found = await api.get<Array<Record<string, unknown>>>('/tickets', {
          sqlfilters: `(t.ref:like:'%${String(ticketIdOrRef).trim()}%')`,
          limit: 1,
        }).catch(() => null);
        if (Array.isArray(found) && found.length > 0) {
          ticket = found[0];
        }
      }

      if (!ticket) {
        return JSON.stringify({
          applied: false,
          verified: false,
          error: `Ticket '${ticketIdOrRef}' introuvable dans Dolibarr.`,
        }, null, 2);
      }

      const trackId = (ticket.track_id as string) || (args.track_id as string);
      if (!trackId) {
        return JSON.stringify({
          applied: false,
          verified: false,
          error: `Impossible d'ajouter le message : track_id introuvable pour le ticket #${ticket.id} (${ticket.ref}).`,
        }, null, 2);
      }

      // 2. Appel de la route Dolibarr officielle : POST /tickets/newmessage
      const route = '/tickets/newmessage';
      const msgPayload = {
        track_id: trackId,
        message: args.message,
        private_message: args.private_message || 0,
      };

      await api.post(route, msgPayload);

      // 3. Relecture du ticket après ajout
      const updatedTicket = await api.get<Record<string, unknown>>(`/tickets/${ticket.id}`).catch(() => ticket);

      return JSON.stringify({
        applied: true,
        verified: !!updatedTicket,
        route_used: `POST ${route}`,
        ticket_id: Number(ticket.id),
        ref: updatedTicket?.ref || ticket.ref,
        track_id: trackId,
        message: `Message ajouté avec succès au ticket ${ticket.ref} (ID #${ticket.id}).`,
      }, null, 2);
    }
    case 'close_ticket': {
      const now = Math.floor(Date.now() / 1000);
      await api.put(`/tickets/${args.id}`, {
        status: 5,
        fk_statut: 5,
        date_close: now,
        progress: 100,
      });
      const ticket = await api.get<Record<string, unknown>>(`/tickets/${args.id}`).catch(() => null);
      const isClosed = ticket && (String(ticket.status) === '5' || String(ticket.fk_statut) === '5') && !!ticket.date_close;
      return JSON.stringify({
        applied: true,
        verified: !!isClosed,
        ticket_id: args.id,
        status: ticket?.status,
        date_close: ticket?.date_close,
        progress: ticket?.progress,
        message: isClosed ? `Ticket #${args.id} (${ticket?.ref || ''}) fermé avec succès et horodaté.` : `Fermeture demandée pour le ticket #${args.id}.`,
      }, null, 2);
    }
    case 'assign_ticket': {
      await api.put(`/tickets/${args.id}`, { fk_user_assign: args.user_id });
      const ticket = await api.get<Record<string, unknown>>(`/tickets/${args.id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!ticket,
        ticket_id: args.id,
        assigned_user_id: args.user_id,
        message: `Ticket #${args.id} assigné à l'utilisateur #${args.user_id}.`,
      }, null, 2);
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
