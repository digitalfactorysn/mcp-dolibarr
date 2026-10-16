import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { paging } from './_util.js';

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
        tva_tx: { type: 'number', description: 'Taux de TVA % (obligatoire, aucun défaut)' },
        price_base_type: { type: 'string', description: '"HT" ou "TTC". Défaut: HT' },
        stock: { type: 'number', description: 'Stock initial (pour produits physiques)' },
        weight: { type: 'number', description: 'Poids en kg (pour produits physiques)' },
        barcode: { type: 'string', description: 'Code barre / EAN' },
        status: { type: 'number', description: '1=En vente, 0=Inactif' },
        status_buy: { type: 'number', description: '1=Achetable, 0=Non achetable' },
        accountancy_code_sell: { type: 'string', description: 'Code comptable de vente' },
        accountancy_code_buy: { type: 'string', description: "Code comptable d'achat" },
      },
      required: ['ref', 'label', 'tva_tx'],
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
];

export async function handleProductTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_products': {
      const data = await api.get('/products', { ...paging(args), mode: args.mode, sqlfilters: args.sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'get_product': {
      const data = await api.get(`/products/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_product': {
      // Aucun taux de TVA codé en dur : tva_tx est obligatoire (schéma) et transmis tel quel.
      const payload = { type: 1, price_base_type: 'HT', status: 1, status_buy: 1, ...args };
      const id = await api.post('/products', payload);
      return `✅ Produit/Service créé avec succès.\nID: ${id}\nRef: ${args.ref}\nLabel: ${args.label}`;
    }
    case 'update_product': {
      const { id, ...rest } = args;
      await api.put(`/products/${id}`, rest);
      return `✅ Produit #${id} mis à jour.`;
    }
    case 'get_product_stock': {
      const data = await api.get(`/products/${args.id}/stock`);
      return JSON.stringify(data, null, 2);
    }
    case 'update_product_stock': {
      const qty = Number(args.qty);
      await api.post('/stockmovements', {
        product_id: args.product_id,
        warehouse_id: args.warehouse_id,
        qty,
        price: args.price,
        label: args.label ?? 'Mouvement de stock via MCP',
        movementcode: args.codeinventory,
      });
      return `✅ Mouvement de stock enregistré.\n${qty > 0 ? 'Entrée' : 'Sortie'} de ${Math.abs(qty)} unité(s) du produit #${args.product_id} dans l'entrepôt #${args.warehouse_id}.`;
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
