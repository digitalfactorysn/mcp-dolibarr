import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const interventionTools: Tool[] = [
  { name: 'list_interventions', description: "Lister les fiches d'intervention. Statut: 0=Brouillon, 1=Validée, 2=Facturée, 3=Abandonnée", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'number' }, thirdparty_id: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_intervention', description: "Obtenir les détails d'une fiche d'intervention", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_intervention', description: "Créer une fiche d'intervention", inputSchema: { type: 'object', properties: { socid: { type: 'number', description: 'ID du client' }, ref: { type: 'string', description: 'Référence (auto si vide)' }, description: { type: 'string', description: "Description de l'intervention" }, date: { type: 'string', description: 'Date ISO 8601' }, duree: { type: 'number', description: 'Durée en secondes' }, fk_project: { type: 'number', description: 'ID projet lié' }, note_public: { type: 'string' }, note_private: { type: 'string' } }, required: ['socid'] } },
  { name: 'add_intervention_line', description: "Ajouter une ligne de temps à une fiche d'intervention", inputSchema: { type: 'object', properties: { id: { type: 'number', description: "ID de la fiche d'intervention" }, date: { type: 'string', description: 'Date ISO 8601' }, desc: { type: 'string', description: 'Description de la prestation' }, duree: { type: 'number', description: 'Durée en secondes (ex: 3600 = 1h)' }, subprice: { type: 'number', description: 'Prix unitaire HT/heure' }, qty: { type: 'number', description: 'Quantité (heures)' }, tva_tx: { type: 'number', description: 'Taux TVA %' }, fk_product: { type: 'number' } }, required: ['id', 'desc', 'duree'] } },
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
      const id = await api.post('/interventions', { ...args, date });
      return `✅ Fiche d'intervention créée. ID: ${id}`;
    }
    case 'add_intervention_line': {
      const { id, ...line } = args;
      if (line.date) line.date = Math.floor(new Date(line.date as string).getTime() / 1000);
      const lineId = await api.post(`/interventions/${id}/lines`, line);
      return `✅ Ligne ajoutée à l'intervention #${id}. ID ligne: ${lineId}`;
    }
    case 'validate_intervention': {
      await api.post(`/interventions/${args.id}/validate`, {});
      return `✅ Fiche d'intervention #${args.id} validée.`;
    }
    case 'close_intervention': {
      await api.post(`/interventions/${args.id}/close`, {});
      return `✅ Fiche d'intervention #${args.id} clôturée.`;
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
