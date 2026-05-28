import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const categoryTools: Tool[] = [
  { name: 'list_categories', description: "Lister les catégories Dolibarr. Type: 0=Produit, 1=Fournisseur, 2=Client, 3=Membre, 4=Contact, 5=Compte", inputSchema: { type: 'object', properties: { limit: { type: 'number' }, type: { type: 'number', description: '0=Produit, 1=Fournisseur, 2=Client, 3=Membre, 4=Contact, 5=Compte' }, sqlfilters: { type: 'string' } } } },
  { name: 'create_category', description: "Créer une catégorie", inputSchema: { type: 'object', properties: { label: { type: 'string', description: 'Nom de la catégorie' }, type: { type: 'number', description: '0=Produit, 1=Fournisseur, 2=Client, 3=Membre, 4=Contact' }, description: { type: 'string' }, color: { type: 'string', description: 'Couleur hex (ex: #FF0000)' }, fk_parent: { type: 'number', description: 'ID catégorie parente' } }, required: ['label', 'type'] } },
  { name: 'get_objects_in_category', description: "Lister les objets appartenant à une catégorie", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de la catégorie' }, type: { type: 'string', description: "Type d'objet: 'product', 'customer', 'supplier', 'member', 'contact'" } }, required: ['id', 'type'] } },
  { name: 'add_object_to_category', description: "Ajouter un objet à une catégorie", inputSchema: { type: 'object', properties: { id: { type: 'number', description: 'ID de la catégorie' }, object_type: { type: 'string', description: "Type: 'product', 'customer', 'supplier', 'member', 'contact'" }, object_id: { type: 'number', description: "ID de l'objet à catégoriser" } }, required: ['id', 'object_type', 'object_id'] } },
];

export async function handleCategoryTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_categories': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.type !== undefined) params.type = args.type;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/categories', params);
      return JSON.stringify(data, null, 2);
    }
    case 'create_category': {
      const id = await api.post('/categories', args);
      return `✅ Catégorie "${args.label}" créée. ID: ${id}`;
    }
    case 'get_objects_in_category': {
      const data = await api.get(`/categories/${args.id}/objects`, { type: args.type });
      return JSON.stringify(data, null, 2);
    }
    case 'add_object_to_category': {
      await api.post(`/categories/${args.id}/objects/${args.object_type}`, { id: args.object_id });
      return `✅ Objet #${args.object_id} (${args.object_type}) ajouté à la catégorie #${args.id}.`;
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
