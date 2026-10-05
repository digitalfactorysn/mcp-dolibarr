import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { addFilter, toTimestamp } from '../validation.js';

export const orderTools: Tool[] = [
  {
    name: 'list_orders',
    description: 'Lister les commandes clients. Statut: 0=Brouillon, 1=Validée, 2=En cours, 3=Livrée, 4=Annulée',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        page: { type: 'number' },
        status: { type: 'number', description: '0=Brouillon, 1=Validée, 2=Expédiée, 3=Livrée, 4=Annulée' },
        sqlfilters: { type: 'string' },
      },
    },
  },
  {
    name: 'get_order',
    description: "Obtenir les détails complets d'une commande client (lignes, statut, livraisons)",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_order',
    description: 'Créer une nouvelle commande client',
    inputSchema: {
      type: 'object',
      properties: {
        socid: { type: 'number', description: 'ID du tiers client' },
        date: { type: 'string', description: "Date de la commande ISO 8601 (ex: '2025-01-31')" },
        date_livraison: { type: 'string', description: 'Date de livraison souhaitée ISO 8601' },
        note_public: { type: 'string', description: 'Note visible sur le BdC' },
        cond_reglement_id: { type: 'number', description: 'ID condition de paiement' },
      },
      required: ['socid'],
    },
  },
  {
    name: 'add_order_line',
    description: 'Ajouter une ligne à une commande client',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande' },
        desc: { type: 'string', description: 'Description de la ligne' },
        subprice: { type: 'number', description: 'Prix unitaire HT' },
        qty: { type: 'number', description: 'Quantité commandée' },
        tva_tx: { type: 'number', description: 'Taux TVA %' },
        fk_product: { type: 'number', description: 'ID produit catalogue' },
        remise_percent: { type: 'number', description: 'Remise %' },
      },
      required: ['id', 'subprice', 'qty', 'tva_tx'],
    },
  },
  {
    name: 'validate_order',
    description: "Valider une commande brouillon (la rend officielle, génère le N° de commande)",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande' },
      },
      required: ['id'],
    },
  },
  {
    name: 'convert_order_to_invoice',
    description: "Créer la facture brouillon correspondant à une commande client validée",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande' },
      },
      required: ['id'],
    },
  },
];

export const supplierOrderTools: Tool[] = [
  {
    name: 'list_supplier_orders',
    description: 'Lister les commandes fournisseurs',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        page: { type: 'number' },
        status: { type: 'number', description: '0=Brouillon, 1=Validée, 2=Approuvée, 3=En livraison, 4=Livrée, 5=Annulée, 6=Refusée' },
        sqlfilters: { type: 'string' },
      },
    },
  },
  {
    name: 'create_supplier_order',
    description: 'Créer une commande fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        socid: { type: 'number', description: 'ID du fournisseur' },
        date: { type: 'string', description: 'Date ISO 8601' },
        note_public: { type: 'string', description: 'Note publique' },
      },
      required: ['socid'],
    },
  },
  {
    name: 'add_supplier_order_line',
    description: 'Ajouter une ligne à une commande fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande fournisseur' },
        desc: { type: 'string' },
        subprice: { type: 'number', description: 'Prix unitaire HT achat' },
        qty: { type: 'number' },
        tva_tx: { type: 'number' },
        fk_product: { type: 'number', description: 'ID produit catalogue' },
      },
      required: ['id', 'subprice', 'qty', 'tva_tx'],
    },
  },
  {
    name: 'get_supplier_order',
    description: "Obtenir les details d'une commande fournisseur",
    inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de la commande fournisseur' } }, required: ['id'] },
  },
  {
    name: 'validate_supplier_order',
    description: 'Valider une commande fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la commande fournisseur' },
      },
      required: ['id'],
    },
  },
];

export async function handleOrderTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_orders': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) addFilter(params, `(t.fk_statut:=:${Number(args.status)})`);
      if (args.sqlfilters) addFilter(params, args.sqlfilters);
      const data = await api.get('/orders', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_order': {
      const data = await api.get(`/orders/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_order': {
      const { date_livraison, ...rest } = args;
      const payload: Record<string, unknown> = { ...rest, date: args.date ? toTimestamp(args.date) : Math.floor(Date.now() / 1000) };
      if (date_livraison) payload.delivery_date = toTimestamp(date_livraison, 'date_livraison');
      const id = await api.post('/orders', payload);
      return `✅ Commande client créée. ID: ${id}`;
    }
    case 'add_order_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/orders/${id}/lines`, line);
      return `✅ Ligne ajoutée à la commande #${id}. ID ligne: ${lineId}`;
    }
    case 'validate_order': {
      await api.post(`/orders/${args.id}/validate`, { idwarehouse: 0 });
      return `✅ Commande #${args.id} validée.`;
    }
    case 'convert_order_to_invoice': {
      const invoiceId = await api.post(`/invoices/createfromorder/${args.id}`, {});
      return `✅ Commande #${args.id} facturée. ID facture générée: ${invoiceId}`;
    }
    // Supplier orders
    case 'get_supplier_order': {
      const data = await api.get(`/supplierorders/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'list_supplier_orders': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) addFilter(params, `(t.fk_statut:=:${Number(args.status)})`);
      if (args.sqlfilters) addFilter(params, args.sqlfilters);
      const data = await api.get('/supplierorders', params);
      return JSON.stringify(data, null, 2);
    }
    case 'create_supplier_order': {
      const date = args.date ? toTimestamp(args.date) : Math.floor(Date.now() / 1000);
      const id = await api.post('/supplierorders', { ...args, date });
      return `✅ Commande fournisseur créée. ID: ${id}`;
    }
    case 'add_supplier_order_line': {
      const { id, ...line } = args;
      const lineId = await api.post(`/supplierorders/${id}/lines`, line);
      return `✅ Ligne ajoutée à la commande fournisseur #${id}. ID ligne: ${lineId}`;
    }
    case 'validate_supplier_order': {
      await api.post(`/supplierorders/${args.id}/validate`, {});
      return `✅ Commande fournisseur #${args.id} validée.`;
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}

