import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI, toUnix } from '../api.js';
import { andFilters, eqNum, paging } from './_util.js';

export const bomTools: Tool[] = [
  { name: 'list_boms', description: "Lister les nomenclatures (BOM - Bill of Materials)", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '0=Brouillon, 1=Validée, 9=Désactivée' }, product_id: { type: 'number', description: 'Filtrer par produit fini' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_bom', description: "Obtenir les détails d'une nomenclature (composants, quantités)", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_bom', description: "Créer une nomenclature de fabrication", inputSchema: { type: 'object', properties: { ref: { type: 'string', description: 'Référence de la nomenclature' }, label: { type: 'string', description: 'Nom de la nomenclature' }, fk_product: { type: 'number', description: 'ID du produit fini' }, qty: { type: 'number', description: 'Quantité produite' }, fk_warehouse: { type: 'number', description: "ID entrepôt de production" }, note: { type: 'string' } }, required: ['fk_product', 'qty'] } },
];

export const manufacturingTools: Tool[] = [
  { name: 'list_manufacturing_orders', description: "Lister les ordres de fabrication (MO)", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, status: { type: 'number', description: '0=Brouillon, 1=Validé, 2=En cours, 3=Produit, 9=Annulé' }, sqlfilters: { type: 'string' } } } },
  { name: 'get_manufacturing_order', description: "Obtenir les détails d'un ordre de fabrication", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'create_manufacturing_order', description: "Créer un ordre de fabrication", inputSchema: { type: 'object', properties: { ref: { type: 'string', description: 'Référence (auto si vide)' }, fk_product: { type: 'number', description: 'ID du produit à fabriquer' }, qty: { type: 'number', description: 'Quantité à produire' }, fk_bom: { type: 'number', description: 'ID de la nomenclature à utiliser' }, date_start_planned: { type: 'string', description: 'Date début planifiée ISO 8601' }, date_end_planned: { type: 'string', description: 'Date fin planifiée ISO 8601' }, fk_warehouse: { type: 'number', description: "ID entrepôt de destination" }, note_public: { type: 'string' } }, required: ['fk_product', 'qty'] } },
  { name: 'validate_manufacturing_order', description: "Valider un ordre de fabrication", inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] } },
  { name: 'produce_manufacturing_order', description: "Enregistrer la consommation et la production d'un OF validé ou en cours (mouvements de stock réels)", inputSchema: { type: 'object', properties: { id: { type: 'number' }, arraytoconsume: { type: 'array', description: 'Composants consommés', items: { type: 'object', properties: { objectid: { type: 'number', description: 'ID produit' }, qty: { type: 'number' }, fk_warehouse: { type: 'number' } }, required: ['objectid', 'qty'] } }, arraytoproduce: { type: 'array', description: 'Produits finis fabriqués', items: { type: 'object', properties: { objectid: { type: 'number', description: 'ID produit' }, qty: { type: 'number' }, fk_warehouse: { type: 'number' } }, required: ['objectid', 'qty'] } }, inventorylabel: { type: 'string' }, autoclose: { type: 'number', description: '1 = clôturer l’OF si tout est produit (défaut 1)' } }, required: ['id', 'arraytoproduce'] } },
];

export async function handleBomTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_boms': {
      const sqlfilters = andFilters(eqNum('t.status', args.status), eqNum('t.fk_product', args.product_id), args.sqlfilters as string | undefined);
      const data = await api.get('/boms', { ...paging(args), sqlfilters });
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
      const sqlfilters = andFilters(eqNum('t.status', args.status), args.sqlfilters as string | undefined);
      const data = await api.get('/mos', { ...paging(args), sqlfilters });
      return JSON.stringify(data, null, 2);
    }
    case 'get_manufacturing_order': {
      const data = await api.get(`/mos/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_manufacturing_order': {
      const payload = {
        ...args,
        ...(args.date_start_planned ? { date_start_planned: toUnix(args.date_start_planned) } : {}),
        ...(args.date_end_planned ? { date_end_planned: toUnix(args.date_end_planned) } : {}),
      };
      const id = await api.post('/mos', payload);
      return `✅ Ordre de fabrication créé. ID: ${id}`;
    }
    case 'validate_manufacturing_order': {
      await api.post(`/mos/${args.id}/validate`, { notrigger: 0 });
      return `✅ Ordre de fabrication #${args.id} validé.`;
    }
    case 'produce_manufacturing_order': {
      const { id, ...body } = args;
      await api.post(`/mos/${id}/produceandconsumeall`, body);
      return `✅ Consommation/production enregistrées pour l'OF #${id}.`;
    }
    default: throw new Error(`Outil fabrication inconnu: ${name}`);
  }
}
