import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { json } from './_util.js';

export const pricingTools: Tool[] = [
  { name: 'get_product_prices', description: "Obtenir les niveaux de prix d'un produit (tous les niveaux tarifaires)", inputSchema: { type: 'object', properties: { product_id: { type: 'number', description: 'ID du produit' } }, required: ['product_id'] } },
  { name: 'set_product_price', description: "Modifier le prix de vente standard d'un produit", inputSchema: { type: 'object', properties: { product_id: { type: 'number', description: 'ID du produit' }, price: { type: 'number', description: 'Nouveau prix HT' }, price_ttc: { type: 'number', description: 'Nouveau prix TTC (alternative à price)' }, price_base_type: { type: 'string', description: '"HT" ou "TTC". Défaut: HT' }, tva_tx: { type: 'number', description: 'Taux de TVA % (si modifié)' } }, required: ['product_id', 'price'] } },
  { name: 'get_thirdparty_price_level', description: "Obtenir le niveau tarifaire d'un client (pour savoir quel prix lui appliquer)", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number' } }, required: ['thirdparty_id'] } },
  { name: 'set_thirdparty_price_level', description: "Définir le niveau tarifaire d'un client", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number' }, price_level: { type: 'number', description: 'Niveau tarifaire (1 à 10)' } }, required: ['thirdparty_id', 'price_level'] } },
  { name: 'get_thirdparty_discount', description: "Obtenir la remise globale d'un client ou fournisseur", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number' } }, required: ['thirdparty_id'] } },
  { name: 'list_exceptional_discounts', description: "Lister les avoirs/remises exceptionnelles disponibles pour un client", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number', description: 'ID du tiers' }, mode: { type: 'string', enum: ['customer', 'supplier'], description: 'customer (défaut) ou supplier' } }, required: ['thirdparty_id'] } },
];

export async function handlePricingTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'get_product_prices':
      // L'API REST Dolibarr 23 n'expose pas /products/{id}/prices
      // Récupérer le prix via /products/{id}
      const product = await api.get<Record<string,unknown>>(`/products/${args.product_id}`);
      const p = product as Record<string,unknown>;
      return JSON.stringify({
        product_id: args.product_id,
        ref: p.ref,
        label: p.label,
        price_ht: p.price,
        price_ttc: p.price_ttc,
        price_base_type: p.price_base_type,
        tva_tx: p.tva_tx,
        price_min: p.price_min,
        price_min_ttc: p.price_min_ttc,
        multiprices: p.multiprices || {},
        note: 'Prix niveau 1 (standard). Niveaux tarifaires via multiprices si activés.'
      }, null, 2);
    case 'set_product_price': {
      // Pas de route /products/{id}/prices : le prix de vente se modifie via PUT /products/{id}.
      const payload: Record<string, unknown> = { price_base_type: args.price_base_type ?? 'HT' };
      if (args.price_base_type === 'TTC') payload.price_ttc = args.price_ttc ?? args.price;
      else payload.price = args.price;
      if (args.tva_tx !== undefined) payload.tva_tx = args.tva_tx;
      await api.put(`/products/${args.product_id}`, payload);
      return `✅ Prix de vente du produit #${args.product_id} mis à jour (niveau standard).`;
    }
    case 'get_thirdparty_price_level': {
      const data = await api.get<Record<string,unknown>>(`/thirdparties/${args.thirdparty_id}`);
      return JSON.stringify({ thirdparty_id: args.thirdparty_id, nom: data.name, price_level: data.price_level || 1, remise_percent: data.remise_percent || 0 }, null, 2);
    }
    case 'set_thirdparty_price_level': {
      await api.put(`/thirdparties/${args.thirdparty_id}`, { price_level: args.price_level });
      return `✅ Niveau tarifaire du client #${args.thirdparty_id} défini à ${args.price_level}.`;
    }
    case 'get_thirdparty_discount': {
      const data = await api.get<Record<string,unknown>>(`/thirdparties/${args.thirdparty_id}`);
      return JSON.stringify({ thirdparty_id: args.thirdparty_id, nom: data.name, remise_client_percent: data.remise_percent || 0, remise_fournisseur_percent: data.remise_supplier_percent || 0 }, null, 2);
    }
    case 'list_exceptional_discounts': {
      const mode = args.mode === 'supplier' ? 'supplier' : 'customer';
      return json(await api.get(`/thirdparties/${args.thirdparty_id}/fixedamountdiscounts`, { mode }));
    }
    default: throw new Error(`Outil tarification inconnu: ${name}`);
  }
}


