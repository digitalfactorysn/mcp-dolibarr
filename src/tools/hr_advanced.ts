import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI, toUnix } from '../api.js';
import { andFilters, eqNum, paging } from './_util.js';

export const leaveTools: Tool[] = [
  { name: 'list_leave_requests', description: "Lister les demandes de congés. Statut : 1=Brouillon, 2=Validée (en attente d'approbation), 3=Approuvée, 4=Annulée, 5=Refusée", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number' }, user_id: { type: 'number', description: "Filtrer par utilisateur" }, sqlfilters: { type: 'string' } } } },
  { name: 'get_leave_request', description: "Obtenir les détails d'une demande de congé", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_leave_request', description: "Créer une demande de congé", inputSchema: { type: 'object', properties: { fk_user: { type: 'number', description: 'ID utilisateur' }, date_debut: { type: 'string', description: 'Date début ISO 8601' }, date_fin: { type: 'string', description: 'Date fin ISO 8601' }, date_debut_gestion: { type: 'string', description: 'Date début (matin/après-midi)' }, date_fin_gestion: { type: 'string', description: 'Date fin (matin/après-midi)' }, fk_type: { type: 'number', description: 'Type de congé (ID)' }, description: { type: 'string' } }, required: ['fk_user', 'date_debut', 'date_fin'] } },
  { name: 'approve_leave_request', description: "Approuver une demande de congé déjà validée (statut 2)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'refuse_leave_request', description: "Refuser une demande de congé", inputSchema: { type: 'object', properties: { id: { type: 'number' }, motif: { type: 'string', description: 'Motif du refus' } }, required: ['id'] } },
  { name: 'list_leave_types', description: "Lister les types de congés configurés dans Dolibarr (dictionnaire)", inputSchema: { type: 'object', properties: { active: { type: 'number', description: '1=Actifs seulement' } } } },
];

export const salaryTools: Tool[] = [
  { name: 'list_salaries', description: "Lister les fiches de paie/salaires", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, user_id: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_salary', description: "Obtenir les détails d'une fiche de salaire", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_salary', description: "Créer une fiche de salaire", inputSchema: { type: 'object', properties: { fk_user: { type: 'number', description: 'ID utilisateur' }, label: { type: 'string', description: 'Libellé (ex: Salaire Janvier 2025)' }, amount: { type: 'number', description: 'Montant net à payer' }, datesp: { type: 'string', description: 'Date début période ISO 8601' }, dateep: { type: 'string', description: 'Date fin période ISO 8601' }, datep: { type: 'string', description: 'Date de paiement ISO 8601' }, fk_account: { type: 'number', description: 'ID compte bancaire' } }, required: ['fk_user', 'amount', 'datesp', 'dateep'] } },
];

export async function handleLeaveTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_leave_requests': {
      const sqlfilters = andFilters(eqNum('t.statut', args.status), args.sqlfilters as string | undefined);
      const data = await api.get('/holidays', { ...paging(args), user_ids: args.user_id === undefined ? undefined : String(args.user_id), sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'get_leave_request': {
      const data = await api.get(`/holidays/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_leave_request': {
      const payload = {
        ...args,
        ...(args.date_debut ? { date_debut: toUnix(args.date_debut) } : {}),
        ...(args.date_fin ? { date_fin: toUnix(args.date_fin) } : {}),
      };
      const id = await api.post('/holidays', payload);
      return `✅ Demande de congé créée. ID: ${id}`;
    }
    case 'approve_leave_request': {
      await api.post(`/holidays/${args.id}/approve`, { notrigger: 0 });
      return `✅ Congé #${args.id} approuvé.`;
    }
    case 'refuse_leave_request': {
      await api.post(`/holidays/${args.id}/refuse`, { detail_refuse: args.motif ?? '', notrigger: 0 });
      return `✅ Congé #${args.id} refusé.`;
    }
    case 'list_leave_types': {
      // Dictionnaire réel (aucune liste de types inventée).
      return JSON.stringify(await api.get('/setup/dictionary/holiday_types', { active: args.active, limit: 100 }), null, 2);
    }
    default: throw new Error(`Outil congés inconnu: ${name}`);
  }
}

export async function handleSalaryTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_salaries': {
      const sqlfilters = andFilters(eqNum('t.fk_user', args.user_id), args.sqlfilters as string | undefined);
      const data = await api.get('/salaries', { ...paging(args), sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'get_salary': {
      const data = await api.get(`/salaries/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_salary': {
      const payload = {
        ...args,
        ...(args.datesp ? { datesp: toUnix(args.datesp) } : {}),
        ...(args.dateep ? { dateep: toUnix(args.dateep) } : {}),
        ...(args.datep ? { datep: toUnix(args.datep) } : {}),
      };
      const id = await api.post('/salaries', payload);
      return `✅ Fiche de salaire créée. ID: ${id}. Montant: ${args.amount}`;
    }
    default: throw new Error(`Outil salaires inconnu: ${name}`);
  }
}

