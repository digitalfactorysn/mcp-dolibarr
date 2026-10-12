import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const interventionTools: Tool[] = [
  { name: 'list_interventions', description: "Lister les fiches d'intervention. Statut: 0=Brouillon, 1=Validée, 2=Facturée, 3=Abandonnée", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'number' }, thirdparty_id: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_intervention', description: "Obtenir les détails d'une fiche d'intervention", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_intervention', description: "Créer une fiche d'intervention", inputSchema: { type: 'object', properties: { socid: { type: 'number', description: 'ID du client' }, ref: { type: 'string', description: 'Référence (auto si vide)' }, description: { type: 'string', description: "Description de l'intervention" }, date: { type: 'string', description: 'Date ISO 8601' }, duree: { type: 'number', description: 'Durée en secondes' }, fk_project: { type: 'number', description: 'ID projet lié' }, note_public: { type: 'string' }, note_private: { type: 'string' } }, required: ['socid'] } },
  { name: 'add_intervention_line', description: "Ajouter une ligne de temps (description, date, durée) à une fiche d'intervention. Dolibarr ne gère ni produit ni prix sur ces lignes.", inputSchema: { type: 'object', properties: { id: { type: 'number', description: "ID de la fiche d'intervention" }, date: { type: 'string', description: 'Date ISO 8601' }, desc: { type: 'string', description: 'Description de la prestation' }, duree: { type: 'number', description: 'Durée en secondes (ex: 3600 = 1h)' } }, required: ['id', 'desc', 'duree'] } },
  { name: 'validate_intervention', description: "Valider une fiche d'intervention brouillon", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'close_intervention', description: "Clôturer/facturer une fiche d'intervention", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
];

export async function handleInterventionTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_interventions': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/interventions', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_intervention': {
      const data = await api.get(`/interventions/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_intervention': {
      const date = args.date ? Math.floor(new Date(args.date as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const id = await api.post<number>('/interventions', { ...args, date, fk_user_author: Number(args.fk_user_author) || 1 });
      const created = await api.get<Record<string, unknown>>(`/interventions/${id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!created,
        id,
        ref: created?.ref,
        socid: args.socid,
        intervention: created || { id, ...args },
      }, null, 2);
    }
    case 'add_intervention_line': {
      const id = Number(args.id);
      const desc = (args.desc || args.description || 'Prestation') as string;
      const duration = Number(args.duree || args.duration || 3600);
      let dateTs: number;
      if (typeof args.date === 'number') {
        dateTs = args.date;
      } else if (typeof args.date === 'string') {
        const parsed = new Date(args.date).getTime();
        dateTs = isNaN(parsed) ? Math.floor(Date.now() / 1000) : Math.floor(parsed / 1000);
      } else {
        dateTs = Math.floor(Date.now() / 1000);
      }

      const payload: Record<string, unknown> = {
        description: desc,
        duration: duration,
        date: dateTs,
      };

      const lineId = await api.post(`/interventions/${id}/lines`, payload);
      const intervention = await api.get<Record<string, unknown>>(`/interventions/${id}`).catch(() => null);
      const lines = Array.isArray(intervention?.lines) ? (intervention.lines as Record<string, unknown>[]) : [];
      const createdLine = lines.find(l => String(l.id) === String(lineId));
      const lineOk = !!createdLine && Number(createdLine.duration) === duration && String(createdLine.desc || createdLine.description || '') === desc;

      return JSON.stringify({
        applied: true,
        verified: lineOk,
        intervention_id: id,
        line_id: lineId,
        description: desc,
        duration,
        lines_count: lines.length,
      }, null, 2);
    }
    case 'validate_intervention': {
      await api.post(`/interventions/${args.id}/validate`, {});
      const intervention = await api.get<Record<string, unknown>>(`/interventions/${args.id}`).catch(() => null);
      const isOk = intervention && (String(intervention.statut) === '1' || String(intervention.statut) === '2');
      return JSON.stringify({
        applied: true,
        verified: !!isOk,
        id: args.id,
        ref: intervention?.ref,
        statut: intervention?.statut,
        message: isOk ? `Intervention #${intervention?.ref || args.id} validée et vérifiée.` : `Validation demandée pour l'intervention #${args.id}.`,
      }, null, 2);
    }
    case 'close_intervention': {
      await api.post(`/interventions/${args.id}/close`, {});
      const intervention = await api.get<Record<string, unknown>>(`/interventions/${args.id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!intervention,
        id: args.id,
        statut: intervention?.statut,
        message: `Fiche d'intervention #${args.id} clôturée.`,
      }, null, 2);
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
