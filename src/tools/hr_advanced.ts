import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { addFilter, toTimestamp } from '../validation.js';

export const leaveTools: Tool[] = [
  { name: 'list_leave_requests', description: "Lister les demandes de congés. Statut: 1=Brouillon, 2=En attente, 3=Approuvé, 4=Refusé, 5=Annulé", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number' }, user_id: { type: 'number', description: "Filtrer par utilisateur" }, sqlfilters: { type: 'string' } } } },
  { name: 'get_leave_request', description: "Obtenir les détails d'une demande de congé", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_leave_request', description: "Créer une demande de congé", inputSchema: { type: 'object', properties: { fk_user: { type: 'number', description: 'ID utilisateur' }, date_debut: { type: 'string', description: 'Date début ISO 8601' }, date_fin: { type: 'string', description: 'Date fin ISO 8601' }, date_debut_gestion: { type: 'string', description: 'Date début (matin/après-midi)' }, date_fin_gestion: { type: 'string', description: 'Date fin (matin/après-midi)' }, fk_type: { type: 'number', description: 'Type de congé (ID)' }, description: { type: 'string' } }, required: ['fk_user', 'date_debut', 'date_fin'] } },
  { name: 'approve_leave_request', description: "Approuver une demande de congé en attente d'approbation", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'refuse_leave_request', description: "Refuser une demande de congé", inputSchema: { type: 'object', properties: { id: { type: 'number' }, motif: { type: 'string', description: 'Motif du refus' } }, required: ['id'] } },
  { name: 'list_leave_types', description: "Lister les types de congés disponibles", inputSchema: { type: 'object', properties: { active: { type: 'number', description: '1=Actifs seulement' } } } },
];

export const salaryTools: Tool[] = [
  { name: 'list_salaries', description: "Lister les fiches de paie/salaires", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, user_id: { type: 'number' }, status: { type: 'number', description: '0=Non payé, 1=Payé' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_salary', description: "Obtenir les détails d'une fiche de salaire", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_salary', description: "Créer une fiche de salaire", inputSchema: { type: 'object', properties: { fk_user: { type: 'number', description: 'ID utilisateur' }, label: { type: 'string', description: 'Libellé (ex: Salaire Janvier 2025)' }, amount: { type: 'number', description: 'Montant net à payer' }, datesp: { type: 'string', description: 'Date début période ISO 8601' }, dateep: { type: 'string', description: 'Date fin période ISO 8601' }, datep: { type: 'string', description: 'Date de paiement ISO 8601' }, fk_account: { type: 'number', description: 'ID compte bancaire' } }, required: ['fk_user', 'amount', 'datesp', 'dateep'] } },
];

export async function handleLeaveTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_leave_requests': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) addFilter(params, `(t.statut:=:${Number(args.status)})`);
      if (args.user_id) params.user_ids = args.user_id;
      if (args.sqlfilters) addFilter(params, args.sqlfilters);
      const data = await api.get('/holidays', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_leave_request': {
      const data = await api.get(`/holidays/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_leave_request': {
      const payload = { ...args };
      payload.date_debut = toTimestamp(payload.date_debut, 'date_debut');
      payload.date_fin = toTimestamp(payload.date_fin, 'date_fin');
      const id = await api.post('/holidays', payload);
      return `✅ Demande de congé créée. ID: ${id}`;
    }
    case 'approve_leave_request': {
      await api.post(`/holidays/${args.id}/approve`, {});
      return `✅ Congé #${args.id} approuvé.`;
    }
    case 'refuse_leave_request': {
      await api.post(`/holidays/${args.id}/refuse`, { detail_refuse: args.motif || '' });
      return `✅ Congé #${args.id} refusé.`;
    }
    case 'list_leave_types': {
      const params: Record<string, unknown> = {};
      if (args.active !== undefined) params.active = args.active; // ignoré par les anciennes versions
      const data = await api.get('/setup/dictionary/holiday_types', params);
      return JSON.stringify(data, null, 2);
    }
    default: throw new Error(`Outil congés inconnu: ${name}`);
  }
}

export async function handleSalaryTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_salaries': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.user_id) params.user_ids = args.user_id;
      if (args.status !== undefined) addFilter(params, `(t.paye:=:${Number(args.status)})`);
      if (args.sqlfilters) addFilter(params, args.sqlfilters);
      const data = await api.get('/salaries', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_salary': {
      const data = await api.get(`/salaries/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_salary': {
      const payload = { ...args };
      for (const f of ['datesp', 'dateep', 'datep']) if (payload[f]) payload[f] = toTimestamp(payload[f], f);
      const id = await api.post('/salaries', payload);
      return `✅ Fiche de salaire créée. ID: ${id}. Montant: ${args.amount}`;
    }
    default: throw new Error(`Outil salaires inconnu: ${name}`);
  }
}

