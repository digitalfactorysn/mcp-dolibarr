import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const shipmentTools: Tool[] = [
  { name: 'list_shipments', description: "Lister les expéditions/bons de livraison. Statut: 0=Brouillon, 1=Validé, 2=Livré, 3=Annulé", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'number' }, thirdparty_id: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_shipment', description: "Obtenir les détails d'une expédition", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_shipment', description: "Créer un bon de livraison/expédition depuis une commande", inputSchema: { type: 'object', properties: { socid: { type: 'number', description: 'ID du client' }, origin_id: { type: 'number', description: 'ID de la commande source' }, date_delivery: { type: 'string', description: 'Date de livraison ISO 8601' }, note_public: { type: 'string' }, tracking_number: { type: 'string', description: 'Numéro de suivi transporteur' }, shipping_method_id: { type: 'number', description: 'ID du mode de transport' } }, required: ['socid'] } },
  { name: 'validate_shipment', description: "Valider une expédition (la rend officielle)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'deliver_shipment', description: "Marquer une expédition comme livrée", inputSchema: { type: 'object', properties: { id: { type: 'number' }, date_delivery: { type: 'string', description: 'Date de livraison effective ISO 8601' } }, required: ['id'] } },
];

export const receptionTools: Tool[] = [
  { name: 'list_receptions', description: "Lister les réceptions fournisseurs", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_reception', description: "Obtenir les détails d'une réception fournisseur", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
];

export async function handleShipmentTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_shipments': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.thirdparty_id) params.thirdparty_ids = args.thirdparty_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/shipments', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_shipment': {
      const data = await api.get(`/shipments/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_shipment': {
      const payload = { ...args };
      if (payload.date_delivery) payload.date_delivery = Math.floor(new Date(payload.date_delivery as string).getTime() / 1000);
      const id = await api.post('/shipments', payload);
      return `✅ Expédition créée. ID: ${id}`;
    }
    case 'validate_shipment': {
      await api.post(`/shipments/${args.id}/validate`, {});
      return `✅ Expédition #${args.id} validée.`;
    }
    case 'deliver_shipment': {
      const date_delivery = args.date_delivery ? Math.floor(new Date(args.date_delivery as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      await api.post(`/shipments/${args.id}/deliver`, { date_delivery });
      return `✅ Expédition #${args.id} marquée comme livrée.`;
    }
    case 'list_receptions': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/receptions', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_reception': {
      const data = await api.get(`/receptions/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
