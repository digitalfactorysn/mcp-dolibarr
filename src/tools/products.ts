import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const productTools: Tool[] = [
  {
    name: 'list_products',
    description: 'Lister les produits et services du catalogue Dolibarr',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max de résultats' },
        page: { type: 'number' },
        mode: { type: 'number', description: '1=Produits physiques seulement, 2=Services seulement, 0=Tous' },
        in_stock: { type: 'boolean', description: 'Filtrer uniquement les produits en stock' },
        sqlfilters: { type: 'string', description: "ex: (t.label:like:'%Cloud%')" },
      },
    },
  },
  {
    name: 'get_product',
    description: "Obtenir tous les détails d'un produit (prix, stock, description, photos)",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du produit' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_product',
    description: 'Créer un nouveau produit ou service dans le catalogue',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Référence interne unique (ex: CLOUD-AZ-001)' },
        label: { type: 'string', description: 'Libellé du produit/service' },
        description: { type: 'string', description: 'Description détaillée' },
        type: { type: 'number', description: '0=Produit physique, 1=Service. Défaut: 1' },
        price: { type: 'number', description: 'Prix HT de vente' },
        price_ttc: { type: 'number', description: 'Prix TTC (calculé si price fourni)' },
        tva_tx: { type: 'number', description: 'Taux TVA % (ex: 18)' },
        price_base_type: { type: 'string', description: '"HT" ou "TTC". Défaut: HT' },
        stock: { type: 'number', description: 'Stock initial (pour produits physiques)' },
        weight: { type: 'number', description: 'Poids en kg (pour produits physiques)' },
        barcode: { type: 'string', description: 'Code barre / EAN' },
        status: { type: 'number', description: '1=En vente, 0=Inactif' },
        status_buy: { type: 'number', description: '1=Achetable, 0=Non achetable' },
        accountancy_code_sell: { type: 'string', description: 'Code comptable de vente' },
        accountancy_code_buy: { type: 'string', description: "Code comptable d'achat" },
      },
      required: ['ref', 'label'],
    },
  },
  {
    name: 'update_product',
    description: "Modifier un produit existant (prix, description, stat d'active, etc.)",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du produit' },
        label: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number', description: 'Nouveau prix HT' },
        tva_tx: { type: 'number', description: 'Nouveau taux TVA %' },
        status: { type: 'number', description: '1=Actif (en vente), 0=Inactif' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_product_stock',
    description: "Vérifier le stock disponible d'un produit par entrepôt",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du produit' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_product',
    description: 'Supprimer un produit/service du catalogue (impossible s\'il est utilisé dans des documents)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du produit à supprimer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_product_by_ref',
    description: 'Rechercher un produit par sa référence ou son code barre',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Référence produit ou code barre' },
        type: { type: 'string', description: "'ref' ou 'barcode' (défaut: ref)" },
      },
      required: ['ref'],
    },
  },
  {
    name: 'list_product_price_levels',
    description: 'Lister les niveaux de prix d\'un produit (tarifs par niveau/catégorie client)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du produit' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_product_price_level',
    description: 'Définir ou modifier le prix d\'un niveau tarifaire pour un produit',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du produit' },
        pricerevel: { type: 'number', description: 'Niveau de prix (1, 2, 3...)' },
        price: { type: 'number', description: 'Prix HT pour ce niveau' },
        price_ttc: { type: 'number', description: 'Prix TTC (calculé si price fourni)' },
        price_base_type: { type: 'string', description: "'HT' ou 'TTC'" },
        tva_tx: { type: 'number', description: 'Taux TVA %' },
      },
      required: ['id', 'pricerevel', 'price'],
    },
  },
  {
    name: 'update_product_stock',
    description: "Effectuer un mouvement de stock (entrée ou sortie) pour un produit",
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'number', description: 'ID du produit' },
        warehouse_id: { type: 'number', description: "ID de l'entrepôt" },
        qty: { type: 'number', description: 'Quantité (positive pour entrée, négative pour sortie)' },
        price: { type: 'number', description: "Prix unitaire HT d'achat (pour valorisation stock)" },
        label: { type: 'string', description: 'Libellé du mouvement (ex: Réception commande #123)' },
        codeinventory: { type: 'string', description: "Code d'inventaire (référence interne)" },
      },
      required: ['product_id', 'warehouse_id', 'qty'],
    },
  },
  {
    name: 'update_product_accounting',
    description: 'Définir les codes comptables d\'un produit (compte de vente, achat, TVA collectée/déductible)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du produit' },
        accountancy_code_sell: { type: 'string', description: 'Code comptable vente (ex: 706000)' },
        accountancy_code_buy: { type: 'string', description: "Code comptable achat (ex: 601000)" },
        accountancy_code_sell_intra: { type: 'string', description: 'Code comptable vente intra-CE' },
        accountancy_code_sell_export: { type: 'string', description: 'Code comptable vente export' },
        accountancy_code_buy_intra: { type: 'string', description: 'Code comptable achat intra-CE' },
        accountancy_code_buy_import: { type: 'string', description: 'Code comptable achat import' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_product_suppliers',
    description: 'Lister les fournisseurs et leurs tarifs d\'achat pour un produit',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du produit' },
      },
      required: ['id'],
    },
  },
  {
    name: 'add_product_supplier',
    description: 'Ajouter/modifier un tarif fournisseur pour un produit',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du produit' },
        socid: { type: 'number', description: 'ID du fournisseur' },
        ref_fourn: { type: 'string', description: 'Référence fournisseur du produit' },
        price: { type: 'number', description: 'Prix d\'achat HT' },
        qty: { type: 'number', description: 'Quantité minimale de commande' },
        tva_tx: { type: 'number', description: 'Taux TVA %' },
        delivery_time_days: { type: 'number', description: 'Délai de livraison en jours' },
      },
      required: ['id', 'socid', 'price'],
    },
  },
  {
    name: 'delete_product_supplier',
    description: 'Supprimer un tarif fournisseur d\'un produit',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du produit' },
        socid: { type: 'number', description: 'ID du fournisseur à supprimer' },
        ref_fourn: { type: 'string', description: 'Référence fournisseur' },
      },
      required: ['id', 'socid'],
    },
  },
  {
    name: 'list_product_variants',
    description: 'Lister les variantes d\'un produit (couleurs, tailles, options)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du produit parent' },
      },
      required: ['id'],
    },
  },
];

export async function handleProductTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_products': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.mode !== undefined) params.mode = args.mode;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/products', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_product': {
      const data = await api.get(`/products/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_product': {
      const payload = {
        type: 1,
        price_base_type: 'HT',
        status: 1,
        status_buy: 1,
        tva_tx: 18,
        ...args,
      };
      const id = await api.post('/products', payload);
      return `✅ Produit/Service créé avec succès.\nID: ${id}\nRef: ${args.ref}\nLabel: ${args.label}`;
    }
    case 'update_product': {
      const { id, ...rest } = args;
      await api.put(`/products/${id}`, rest);
      return `✅ Produit #${id} mis à jour.`;
    }
    case 'get_product_stock': {
      const data = await api.get(`/products/${args.id}/stocks`);
      return JSON.stringify(data, null, 2);
    }
    case 'update_product_stock': {
      const payload = {
        product_id: args.product_id,
        warehouse_id: args.warehouse_id,
        qty: args.qty,
        price: args.price || 0,
        label: args.label || 'Mouvement de stock via MCP',
        codeinventory: args.codeinventory || '',
        type_mouvement: (args.qty as number) > 0 ? 0 : 1, // 0=Entrée, 1=Sortie
      };
      await api.post('/stockmovements', payload);
      const direction = (args.qty as number) > 0 ? 'Entrée' : 'Sortie';
      return `✅ Mouvement de stock enregistré.\n${direction} de ${Math.abs(args.qty as number)} unité(s) du produit #${args.product_id} dans l'entrepôt #${args.warehouse_id}.`;
    }
    case 'delete_product': {
      await api.delete(`/products/${args.id}`);
      return `✅ Produit #${args.id} supprimé.`;
    }
    case 'get_product_by_ref': {
      const type = args.type || 'ref';
      const data = await api.get(`/products/${type === 'barcode' ? 'barcode' : 'ref'}/${encodeURIComponent(args.ref as string)}`);
      return JSON.stringify(data, null, 2);
    }
    case 'list_product_price_levels': {
      const data = await api.get(`/products/${args.id}/selling_multiprices_per_tva_tx`);
      return JSON.stringify(data, null, 2);
    }
    case 'update_product_price_level': {
      const { id, ...payload } = args;
      await api.post(`/products/${id}/setpricerevel`, payload);
      return `✅ Niveau de prix ${args.pricerevel} du produit #${id} mis à jour : ${args.price} HT`;
    }
    case 'update_product_accounting': {
      const { id, ...rest } = args;
      await api.put(`/products/${id}`, rest);
      return `✅ Codes comptables du produit #${id} mis à jour.`;
    }
    case 'list_product_suppliers': {
      const data = await api.get(`/products/${args.id}/purchase_prices`);
      return JSON.stringify(data, null, 2);
    }
    case 'add_product_supplier': {
      const { id, ...payload } = args;
      await api.post(`/products/${id}/purchase_prices`, { qty: 1, tva_tx: 0, ...payload });
      return `✅ Tarif fournisseur #${args.socid} ajouté au produit #${id}. Prix: ${args.price}`;
    }
    case 'delete_product_supplier': {
      const ref = args.ref_fourn ? encodeURIComponent(args.ref_fourn as string) : '';
      const endpoint = ref
        ? `/products/${args.id}/purchase_prices/${args.socid}/${ref}`
        : `/products/${args.id}/purchase_prices/${args.socid}`;
      await api.delete(endpoint);
      return `✅ Tarif fournisseur #${args.socid} supprimé du produit #${args.id}.`;
    }
    case 'list_product_variants': {
      const data = await api.get(`/products/${args.id}/variants`);
      return JSON.stringify(data, null, 2);
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
