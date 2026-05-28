import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const warehouseTools: Tool[] = [
  { name: 'list_warehouses', description: "Lister les entrepôts/dépôts de stock", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '1=Actifs (défaut), 0=Tous' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_warehouse', description: "Obtenir les détails d'un entrepôt", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_warehouse', description: "Créer un nouvel entrepôt", inputSchema: { type: 'object', properties: { ref: { type: 'string', description: "Référence de l'entrepôt" }, label: { type: 'string', description: "Nom de l'entrepôt" }, description: { type: 'string' }, address: { type: 'string' }, zip: { type: 'string' }, town: { type: 'string' }, country_id: { type: 'number' }, fk_parent: { type: 'number', description: 'ID entrepôt parent (si sous-entrepôt)' } }, required: ['ref', 'label'] } },
  { name: 'get_warehouse_stock', description: "Consulter le stock complet d'un entrepôt (tous produits)", inputSchema: { type: 'object', properties: { id: { type: 'number', description: "ID de l'entrepôt" }, limit: { type: 'number' } }, required: ['id'] } },
];

export const batchTools: Tool[] = [
  { name: 'list_product_batches', description: "Lister les lots/numéros de série d'un produit", inputSchema: { type: 'object', properties: { product_id: { type: 'number', description: 'ID du produit' }, warehouse_id: { type: 'number', description: "ID de l'entrepôt (optionnel)" } }, required: ['product_id'] } },
  { name: 'get_batch_details', description: "Obtenir les détails d'un lot (dates, stock, traçabilité)", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID du lot' } }, required: ['id'] } },
];

export async function handleWarehouseTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_warehouses': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) params.status = args.status; else params.status = 1;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/warehouses', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_warehouse': {
      const data = await api.get(`/warehouses/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_warehouse': {
      const id = await api.post('/warehouses', args);
      return `✅ Entrepôt "${args.label}" créé. ID: ${id}`;
    }
    case 'get_warehouse_stock': {
      const data = await api.get(`/warehouses/${args.id}/stock`, { limit: args.limit || 200 });
      return JSON.stringify(data, null, 2);
    }
    case 'list_product_batches': {
      const params: Record<string, unknown> = { product_id: args.product_id };
      if (args.warehouse_id) params.warehouse_id = args.warehouse_id;
      const data = await api.get('/stockbatches', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_batch_details': {
      const data = await api.get(`/stockbatches/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    default: throw new Error(`Outil entrepôt inconnu: ${name}`);
  }
}
