import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const pricingTools: Tool[] = [
  { name: 'get_product_prices', description: "Obtenir les niveaux de prix d'un produit (tous les niveaux tarifaires)", inputSchema: { type: 'object', properties: { product_id: { type: 'number', description: 'ID du produit' } }, required: ['product_id'] } },
  { name: 'set_product_price', description: "Définir/modifier le prix d'un produit (avec gestion des niveaux tarifaires)", inputSchema: { type: 'object', properties: { product_id: { type: 'number', description: 'ID du produit' }, price: { type: 'number', description: 'Nouveau prix HT' }, price_ttc: { type: 'number', description: 'Nouveau prix TTC (alternative à price)' }, price_base_type: { type: 'string', description: '"HT" ou "TTC". Défaut: HT' }, tva_tx: { type: 'number', description: 'Taux TVA % (défaut: 18)' }, price_level: { type: 'number', description: 'Niveau tarifaire (1=standard, 2,3...=niveaux spéciaux). Défaut: 1' } }, required: ['product_id', 'price'] } },
  { name: 'get_thirdparty_price_level', description: "Obtenir le niveau tarifaire d'un client (pour savoir quel prix lui appliquer)", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number' } }, required: ['thirdparty_id'] } },
  { name: 'set_thirdparty_price_level', description: "Définir le niveau tarifaire d'un client", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number' }, price_level: { type: 'number', description: 'Niveau tarifaire à appliquer (1, 2, 3...)' } }, required: ['thirdparty_id', 'price_level'] } },
  { name: 'get_thirdparty_discount', description: "Obtenir la remise globale d'un client ou fournisseur", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number' } }, required: ['thirdparty_id'] } },
  { name: 'set_thirdparty_discount', description: "Définir la remise commerciale permanente d'un client (en %)", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number' }, discount_percent: { type: 'number', description: 'Remise en % (ex: 10 pour 10%). 0 pour supprimer.' } }, required: ['thirdparty_id', 'discount_percent'] } },
  { name: 'list_exceptional_discounts', description: "Lister les avoirs/remises exceptionnelles disponibles pour un client", inputSchema: { type: 'object', properties: { thirdparty_id: { type: 'number', description: 'ID du client' } }, required: ['thirdparty_id'] } },
];

export async function handlePricingTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'get_product_prices':
      return JSON.stringify(await api.get(`/products/${args.product_id}/prices`), null, 2);
    case 'set_product_price': {
      const payload = { price: args.price, price_ttc: args.price_ttc, price_base_type: args.price_base_type || 'HT', tva_tx: args.tva_tx || 18, price_level: args.price_level || 1 };
      await api.post(`/products/${args.product_id}/prices`, payload);
      return `✅ Prix du produit #${args.product_id} mis à jour. Prix HT: ${args.price} FCFA (niveau ${args.price_level || 1})`;
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
    case 'set_thirdparty_discount': {
      await api.put(`/thirdparties/${args.thirdparty_id}`, { remise_percent: args.discount_percent });
      return `✅ Remise de ${args.discount_percent}% définie pour le client #${args.thirdparty_id}.`;
    }
    case 'list_exceptional_discounts': {
      const data = await api.get('/discounts', { thirdparty_id: args.thirdparty_id });
      return JSON.stringify(data, null, 2);
    }
    default: throw new Error(`Outil tarification inconnu: ${name}`);
  }
}
