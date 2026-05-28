import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const bomTools: Tool[] = [
  { name: 'list_boms', description: "Lister les nomenclatures (BOM - Bill of Materials)", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '1=Actif, 0=Inactif' }, product_id: { type: 'number', description: 'Filtrer par produit fini' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_bom', description: "Obtenir les détails d'une nomenclature (composants, quantités)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_bom', description: "Créer une nomenclature de fabrication", inputSchema: { type: 'object', properties: { ref: { type: 'string', description: 'Référence de la nomenclature' }, label: { type: 'string', description: 'Nom de la nomenclature' }, fk_product: { type: 'number', description: 'ID du produit fini' }, qty: { type: 'number', description: 'Quantité produite' }, fk_warehouse: { type: 'number', description: "ID entrepôt de production" }, note: { type: 'string' } }, required: ['fk_product', 'qty'] } },
];

export const manufacturingTools: Tool[] = [
  { name: 'list_manufacturing_orders', description: "Lister les ordres de fabrication (MO)", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=En cours, 3=Produit, 9=Annulé' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_manufacturing_order', description: "Obtenir les détails d'un ordre de fabrication", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_manufacturing_order', description: "Créer un ordre de fabrication", inputSchema: { type: 'object', properties: { ref: { type: 'string', description: 'Référence (auto si vide)' }, fk_product: { type: 'number', description: 'ID du produit à fabriquer' }, qty: { type: 'number', description: 'Quantité à produire' }, fk_bom: { type: 'number', description: 'ID de la nomenclature à utiliser' }, date_start_planned: { type: 'string', description: 'Date début planifiée ISO 8601' }, date_end_planned: { type: 'string', description: 'Date fin planifiée ISO 8601' }, fk_warehouse: { type: 'number', description: "ID entrepôt de destination" }, note_public: { type: 'string' } }, required: ['fk_product', 'qty'] } },
  { name: 'validate_manufacturing_order', description: "Valider un ordre de fabrication", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'produce_manufacturing_order', description: "Marquer un OF comme produit (production terminée)", inputSchema: { type: 'object', properties: { id: { type: 'number' }, qty: { type: 'number', description: 'Quantité effectivement produite' } }, required: ['id'] } },
];

export async function handleBomTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_boms': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) params.status = args.status;
      if (args.product_id) params.product_id = args.product_id;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/boms', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_bom': {
      const data = await api.get(`/boms/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_bom': {
      const id = await api.post('/boms', args);
      return `✅ Nomenclature créée. ID: ${id}`;
    }
    default: throw new Error(`Outil BOM inconnu: ${name}`);
  }
}

export async function handleManufacturingTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_manufacturing_orders': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.status !== undefined) params.status = args.status;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/mos', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_manufacturing_order': {
      const data = await api.get(`/mos/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_manufacturing_order': {
      const payload = { ...args };
      if (payload.date_start_planned) payload.date_start_planned = Math.floor(new Date(payload.date_start_planned as string).getTime() / 1000);
      if (payload.date_end_planned) payload.date_end_planned = Math.floor(new Date(payload.date_end_planned as string).getTime() / 1000);
      const id = await api.post('/mos', payload);
      return `✅ Ordre de fabrication créé. ID: ${id}`;
    }
    case 'validate_manufacturing_order': {
      await api.post(`/mos/${args.id}/validate`, {});
      return `✅ Ordre de fabrication #${args.id} validé.`;
    }
    case 'produce_manufacturing_order': {
      await api.post(`/mos/${args.id}/produce`, { qty: args.qty });
      return `✅ Production terminée pour l'OF #${args.id}. Quantité produite: ${args.qty}`;
    }
    default: throw new Error(`Outil fabrication inconnu: ${name}`);
  }
}
