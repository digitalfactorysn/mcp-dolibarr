import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI, toUnix } from '../api.js';
import { andFilters, eqNum, paging } from './_util.js';

export const shipmentTools: Tool[] = [
  { name: 'list_shipments', description: "Lister les expéditions/bons de livraison. Statut : 0=Brouillon, 1=Validé, 2=Clôturé/livré", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'number' }, thirdparty_id: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_shipment', description: "Obtenir les détails d'une expédition", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_shipment', description: "Créer un bon de livraison/expédition depuis une commande", inputSchema: { type: 'object', properties: { socid: { type: 'number', description: 'ID du client' }, origin_id: { type: 'number', description: 'ID de la commande source' }, date_delivery: { type: 'string', description: 'Date de livraison ISO 8601' }, note_public: { type: 'string' }, tracking_number: { type: 'string', description: 'Numéro de suivi transporteur' }, shipping_method_id: { type: 'number', description: 'ID du mode de transport' } }, required: ['socid'] } },
  { name: 'validate_shipment', description: "Valider une expédition (la rend officielle)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'deliver_shipment', description: "Marquer une expédition validée comme livrée (clôture)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
];

export const receptionTools: Tool[] = [
  { name: 'list_receptions', description: "Lister les réceptions fournisseurs", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, page: { type: 'number' }, status: { type: 'number' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_reception', description: "Obtenir les détails d'une réception fournisseur", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
];

export async function handleShipmentTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_shipments': {
      const sqlfilters = andFilters(eqNum('t.fk_statut', args.status), args.sqlfilters as string | undefined);
      const data = await api.get('/shipments', { ...paging(args), thirdparty_ids: args.thirdparty_id === undefined ? undefined : String(args.thirdparty_id), sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'get_shipment': {
      const data = await api.get(`/shipments/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_shipment': {
      const { origin_id, date_delivery, ...rest } = args;
      const payload = {
        ...rest,
        ...(origin_id ? { origin: 'commande', origin_id } : {}),
        ...(date_delivery ? { date_delivery: toUnix(date_delivery) } : {}),
      };
      const id = await api.post('/shipments', payload);
      return `✅ Expédition créée. ID: ${id}`;
    }
    case 'validate_shipment': {
      await api.post(`/shipments/${args.id}/validate`, { notrigger: 0 });
      return `✅ Expédition #${args.id} validée.`;
    }
    case 'deliver_shipment': {
      await api.post(`/shipments/${args.id}/close`, { notrigger: 0 });
      return `✅ Expédition #${args.id} clôturée (livrée).`;
    }
    case 'list_receptions': {
      const sqlfilters = andFilters(eqNum('t.fk_statut', args.status), args.sqlfilters as string | undefined);
      const data = await api.get('/receptions', { ...paging(args), sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'get_reception': {
      const data = await api.get(`/receptions/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
