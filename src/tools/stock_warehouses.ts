import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const stockWarehouseTools: Tool[] = [
  {
    name: 'list_warehouses',
    description: 'Lister les entrepôts/dépôts de stockage',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        status: { type: 'number', description: '1=Actifs seulement (défaut), 0=Tous' },
        sqlfilters: { type: 'string', description: 'Filtre SQL' },
      },
    },
  },
  {
    name: 'get_warehouse',
    description: 'Obtenir les détails d\'un entrepôt (adresse, stock global, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'entrepôt' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_warehouse',
    description: 'Créer un nouvel entrepôt de stockage',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Référence unique de l\'entrepôt' },
        label: { type: 'string', description: 'Nom de l\'entrepôt' },
        description: { type: 'string', description: 'Description' },
        address: { type: 'string', description: 'Adresse physique' },
        zip: { type: 'string', description: 'Code postal' },
        town: { type: 'string', description: 'Ville' },
        country_id: { type: 'number', description: 'ID du pays' },
        fk_parent: { type: 'number', description: 'ID entrepôt parent (pour hiérarchie)' },
      },
      required: ['label'],
    },
  },
  {
    name: 'update_warehouse',
    description: 'Modifier les informations d\'un entrepôt',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'entrepôt' },
        ref: { type: 'string', description: 'Référence' },
        label: { type: 'string', description: 'Nom' },
        description: { type: 'string', description: 'Description' },
        address: { type: 'string', description: 'Adresse' },
        zip: { type: 'string', description: 'Code postal' },
        town: { type: 'string', description: 'Ville' },
        statut: { type: 'number', description: '1=Actif, 0=Inactif' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_stock_movements',
    description: 'Lister les mouvements de stock (entrées, sorties, transferts)',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'number', description: 'Filtrer par produit' },
        warehouse_id: { type: 'number', description: 'Filtrer par entrepôt' },
        type: { type: 'number', description: '0=Entrée, 1=Sortie, 2=Transfert' },
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
      },
    },
  },
  {
    name: 'list_shipments',
    description: 'Lister les expéditions/bons de livraison',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        page: { type: 'number', description: 'Page' },
        status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=Livré, -1=Annulé' },
        thirdparty_ids: { type: 'string', description: 'ID du tiers' },
        sqlfilters: { type: 'string', description: 'Filtre SQL' },
      },
    },
  },
  {
    name: 'get_shipment',
    description: 'Obtenir les détails d\'une expédition (lignes, quantités, statut)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'expédition' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_shipment',
    description: 'Créer une expédition/bon de livraison à partir d\'une commande client',
    inputSchema: {
      type: 'object',
      properties: {
        socid: { type: 'number', description: 'ID du client' },
        origin_id: { type: 'number', description: 'ID de la commande source' },
        origin_type: { type: 'string', description: "Type d'origine: 'commande' (défaut)" },
        date_delivery: { type: 'string', description: 'Date de livraison prévue ISO 8601' },
        shipping_method_id: { type: 'number', description: 'ID mode de livraison' },
        tracking_number: { type: 'string', description: 'Numéro de suivi' },
        note_public: { type: 'string', description: 'Note publique (visible sur le BL)' },
        note_private: { type: 'string', description: 'Note interne' },
      },
      required: ['socid'],
    },
  },
  {
    name: 'add_shipment_line',
    description: 'Ajouter une ligne à une expédition',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'expédition' },
        origin_line_id: { type: 'number', description: 'ID ligne commande source' },
        qty: { type: 'number', description: 'Quantité expédiée' },
        fk_origin_line: { type: 'number', description: 'ID ligne originale' },
        warehouse_id: { type: 'number', description: 'ID entrepôt source du stock' },
      },
      required: ['id', 'qty'],
    },
  },
  {
    name: 'validate_shipment',
    description: 'Valider une expédition (génère le bon de livraison et décrémente le stock)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'expédition' },
      },
      required: ['id'],
    },
  },
  {
    name: 'close_shipment',
    description: 'Clôturer une expédition (marquer comme livrée)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'expédition' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_lots',
    description: 'Lister les lots/numéros de série d\'un produit en stock',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'number', description: 'ID du produit' },
        warehouse_id: { type: 'number', description: 'Filtrer par entrepôt (optionnel)' },
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        sqlfilters: { type: 'string', description: 'Filtre SQL ex: (t.batch:like:\'LOT2025%\')' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'transfer_stock',
    description: 'Transférer du stock entre deux entrepôts',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'number', description: 'ID du produit' },
        warehouse_source_id: { type: 'number', description: 'ID entrepôt source' },
        warehouse_destination_id: { type: 'number', description: 'ID entrepôt destination' },
        qty: { type: 'number', description: 'Quantité à transférer' },
        label: { type: 'string', description: 'Motif du transfert' },
        price: { type: 'number', description: 'Prix unitaire (pour valorisation)' },
      },
      required: ['product_id', 'warehouse_source_id', 'warehouse_destination_id', 'qty'],
    },
  },
];

export async function handleStockWarehouseTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
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
      return `✅ Entrepôt '${args.label}' créé. ID: ${id}`;
    }

    case 'update_warehouse': {
      const { id, ...rest } = args;
      await api.put(`/warehouses/${id}`, rest);
      return `✅ Entrepôt #${id} mis à jour.`;
    }

    case 'list_stock_movements': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.product_id) params.product_id = args.product_id;
      if (args.warehouse_id) params.warehouse_id = args.warehouse_id;
      if (args.type !== undefined) params.type = args.type;
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      const data = await api.get('/stockmovements', params);
      return JSON.stringify(data, null, 2);
    }

    case 'list_shipments': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.thirdparty_ids) params.thirdparty_ids = args.thirdparty_ids;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/shipments', params);
      return JSON.stringify(data, null, 2);
    }

    case 'get_shipment': {
      const data = await api.get(`/shipments/${args.id}`);
      return JSON.stringify(data, null, 2);
    }

    case 'create_shipment': {
      const payload: Record<string, unknown> = { ...args };
      if (args.date_delivery) payload.date_delivery = Math.floor(new Date(args.date_delivery as string).getTime() / 1000);
      payload.origin = args.origin_type || 'commande';
      const id = await api.post('/shipments', payload);
      return `✅ Expédition créée. ID: ${id}\nClient: #${args.socid}${args.origin_id ? ` | Commande source: #${args.origin_id}` : ''}`;
    }

    case 'add_shipment_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/shipments/${id}/lines`, line);
      return `✅ Ligne ajoutée à l'expédition #${id}. ID ligne: ${lineId}`;
    }

    case 'validate_shipment': {
      await api.post(`/shipments/${args.id}/validate`, {});
      return `✅ Expédition #${args.id} validée. Le stock a été décrémenté.`;
    }

    case 'close_shipment': {
      await api.post(`/shipments/${args.id}/close`, {});
      return `✅ Expédition #${args.id} clôturée (livraison confirmée).`;
    }

    case 'list_lots': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.warehouse_id) params.fk_entrepot = args.warehouse_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get(`/products/${args.product_id}/lossbyserial`, params).catch(() =>
        api.get('/products/batch', { ...params, fk_product: args.product_id })
      );
      return JSON.stringify(data, null, 2);
    }

    case 'transfer_stock': {
      const payload = {
        product_id: args.product_id,
        warehouse_source_id: args.warehouse_source_id,
        warehouse_destination_id: args.warehouse_destination_id,
        qty: args.qty,
        label: args.label || 'Transfert de stock',
        price: args.price || 0,
        type: 2,
      };
      await api.post('/stockmovements', payload);
      return `✅ Transfert de ${args.qty} unités du produit #${args.product_id}\nDe l'entrepôt #${args.warehouse_source_id} → #${args.warehouse_destination_id}`;
    }

    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
