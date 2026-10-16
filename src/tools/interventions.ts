import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI, toUnix, withAuthor } from '../api.js';
import { andFilters, eqNum, paging } from './_util.js';

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
      const sqlfilters = andFilters(eqNum('t.fk_statut', args.status), args.sqlfilters as string | undefined);
      const data = await api.get('/interventions', { ...paging(args), thirdparty_ids: args.thirdparty_id === undefined ? undefined : String(args.thirdparty_id), sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'get_intervention': {
      const data = await api.get(`/interventions/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_intervention': {
      const payload = await withAuthor(api, { ...args, date: toUnix(args.date) }, 'fk_user_author');
      const id = await api.post('/interventions', payload);
      return `✅ Fiche d'intervention créée. ID: ${id}`;
    }
    case 'add_intervention_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/interventions/${id}/lines`, { ...line, ...(line.date ? { date: toUnix(line.date) } : {}) });
      return `✅ Ligne ajoutée à l'intervention #${id}. ID ligne: ${lineId}`;
    }
    case 'validate_intervention': {
      await api.post(`/interventions/${args.id}/validate`, { notrigger: 0 });
      return `✅ Fiche d'intervention #${args.id} validée.`;
    }
    case 'close_intervention': {
      await api.post(`/interventions/${args.id}/close`, { notrigger: 0 });
      return `✅ Fiche d'intervention #${args.id} clôturée.`;
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
