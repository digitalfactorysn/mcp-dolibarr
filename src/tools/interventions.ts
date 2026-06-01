import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const interventionTools: Tool[] = [
  {
    name: 'list_interventions',
    description: 'Lister les fiches d\'intervention (support terrain). Statut: 0=Brouillon, 1=Validée, 2=Facturée, 3=Archivée',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        page: { type: 'number', description: 'Page' },
        status: { type: 'number', description: '0=Brouillon, 1=Validée, 2=Facturée, 3=Archivée' },
        thirdparty_ids: { type: 'string', description: 'ID du tiers client' },
        sqlfilters: { type: 'string', description: 'Filtre SQL' },
      },
    },
  },
  {
    name: 'get_intervention',
    description: 'Obtenir les détails d\'une fiche d\'intervention (lignes de temps, client, statut)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'intervention' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_intervention',
    description: 'Créer une nouvelle fiche d\'intervention',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Référence (ex: FI-2025-001). Peut être auto si vide.' },
        socid: { type: 'number', description: 'ID du client' },
        date: { type: 'string', description: 'Date ISO 8601' },
        description: { type: 'string', description: 'Objet / description de l\'intervention' },
        note_public: { type: 'string', description: 'Note visible sur le document' },
        note_private: { type: 'string', description: 'Note interne' },
        contact_id: { type: 'number', description: 'ID du contact chez le client' },
      },
      required: ['socid'],
    },
  },
  {
    name: 'add_intervention_line',
    description: 'Ajouter une ligne de temps/prestation à une intervention',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'intervention' },
        date: { type: 'string', description: 'Date de la prestation ISO 8601' },
        desc: { type: 'string', description: 'Description de la prestation' },
        duration: { type: 'number', description: 'Durée en secondes (ex: 3600 = 1h)' },
        unitprice: { type: 'number', description: 'Prix unitaire HT (si facturation au temps)' },
        qty: { type: 'number', description: 'Quantité (heures ou unités)' },
        tva_tx: { type: 'number', description: 'Taux TVA %' },
      },
      required: ['id', 'date', 'desc'],
    },
  },
  {
    name: 'validate_intervention',
    description: 'Valider une fiche d\'intervention brouillon',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'intervention' },
      },
      required: ['id'],
    },
  },
  {
    name: 'close_intervention',
    description: 'Clôturer une intervention (marquer comme terminée)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'intervention' },
      },
      required: ['id'],
    },
  },
  {
    name: 'bill_intervention',
    description: 'Facturer une intervention — génère automatiquement une facture client correspondante',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'intervention à facturer' },
      },
      required: ['id'],
    },
  },
];

export async function handleInterventionTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_interventions': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.thirdparty_ids) params.thirdparty_ids = args.thirdparty_ids;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/interventions', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_intervention': {
      const data = await api.get(`/interventions/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_intervention': {
      const payload: Record<string, unknown> = { ...args };
      if (args.date) payload.date = Math.floor(new Date(args.date as string).getTime() / 1000);
      const id = await api.post('/interventions', payload);
      return `✅ Fiche d'intervention créée. ID: ${id}\nClient: #${args.socid}`;
    }
    case 'add_intervention_line': {
      const { id, ...line } = args;
      const payload: Record<string, unknown> = { ...line };
      if (line.date) payload.date = Math.floor(new Date(line.date as string).getTime() / 1000);
      if (!payload.qty) payload.qty = payload.duration ? Number(payload.duration) / 3600 : 1;
      if (!payload.tva_tx) payload.tva_tx = 0;
      if (!payload.unitprice) payload.unitprice = 0;
      const lineId = await api.post(`/interventions/${id}/lines`, payload);
      return `✅ Ligne ajoutée à l'intervention #${id}. ID ligne: ${lineId}`;
    }
    case 'validate_intervention': {
      await api.post(`/interventions/${args.id}/validate`, {});
      return `✅ Intervention #${args.id} validée.`;
    }
    case 'close_intervention': {
      await api.post(`/interventions/${args.id}/close`, {});
      return `✅ Intervention #${args.id} clôturée.`;
    }
    case 'bill_intervention': {
      const invoiceId = await api.post(`/interventions/${args.id}/invoice`, {});
      return `✅ Intervention #${args.id} facturée. ID facture générée: ${invoiceId}`;
    }
    default:
      throw new Error(`Outil intervention inconnu: ${name}`);
  }
}
