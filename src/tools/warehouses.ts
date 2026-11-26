import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const warehouseTools: Tool[] = [
  { name: 'list_warehouses', description: "Lister les entrepôts/dépôts de stock", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '1=Actifs (défaut), 0=Tous' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_warehouse', description: "Obtenir les détails d'un entrepôt", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_warehouse', description: "Créer un nouvel entrepôt", inputSchema: { type: 'object', properties: { ref: { type: 'string' }, label: { type: 'string' }, description: { type: 'string' }, address: { type: 'string' }, zip: { type: 'string' }, town: { type: 'string' } }, required: ['ref', 'label'] } },
  { name: 'get_warehouse_stock', description: "Consulter le stock de tous les produits dans un entrepôt", inputSchema: { type: 'object', properties: { id: { type: 'number' }, limit: { type: 'number' } }, required: ['id'] } },
  {
    name: 'list_stock_movements',
    description: "Lister l'historique des mouvements de stock (entrées, sorties, transferts, corrections d'inventaire)",
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: "Nombre de mouvements max (défaut: 50)" },
        product_id: { type: 'number', description: "Filtrer par ID produit" },
        warehouse_id: { type: 'number', description: "Filtrer par ID entrepôt" },
        sqlfilters: { type: 'string', description: "Filtres SQL additionnels" },
      },
    },
  },
];

// Supprimé: batchTools (501 - pas d'API REST dans Dolibarr 23)
export const batchTools: Tool[] = [];

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
      const data = await api.get(`/warehouses/${args.id}/products`, { limit: args.limit || 200 });
      return JSON.stringify(data, null, 2);
    }
    case 'list_stock_movements': {
      const params: Record<string, unknown> = {
        limit: args.limit || 50,
        sortfield: 't.rowid',
        sortorder: 'DESC',
      };
      if (args.product_id) params.product_id = args.product_id;
      if (args.warehouse_id) params.warehouse_id = args.warehouse_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/stockmovements', params);
      return JSON.stringify(data, null, 2);
    }
    default: throw new Error(`Outil entrepôt inconnu: ${name}`);
  }
}

