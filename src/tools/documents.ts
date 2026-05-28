import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const documentTools: Tool[] = [
  { name: 'list_documents', description: "Lister les documents/fichiers attachés à un objet Dolibarr", inputSchema: { type: 'object', properties: { modulepart: { type: 'string', description: "Module: 'invoice', 'proposal', 'order', 'product', 'thirdparty', 'project', 'contract', 'intervention', 'ticket', 'supplier_invoice'" }, id: { type: 'number', description: "ID de l'objet" }, ref: { type: 'string', description: 'Référence de l\'objet (alternative à id)' } }, required: ['modulepart'] } },
  { name: 'get_document', description: "Télécharger/obtenir un document (retourne base64)", inputSchema: { type: 'object', properties: { modulepart: { type: 'string', description: "Module: 'invoice', 'proposal', 'order', etc." }, original_file: { type: 'string', description: 'Chemin du fichier (obtenu via list_documents)' } }, required: ['modulepart', 'original_file'] } },
  { name: 'delete_document', description: "Supprimer un document attaché", inputSchema: { type: 'object', properties: { modulepart: { type: 'string' }, original_file: { type: 'string', description: 'Chemin complet du fichier' } }, required: ['modulepart', 'original_file'] } },
  { name: 'generate_document_pdf', description: "Générer/regénérer le PDF d'un document Dolibarr", inputSchema: { type: 'object', properties: { modulepart: { type: 'string', description: "Module: 'invoice', 'proposal', 'order', 'contract', 'intervention'" }, id: { type: 'number', description: "ID de l'objet" }, langcode: { type: 'string', description: "Langue (ex: 'fr_FR')" } }, required: ['modulepart', 'id'] } },
];

export async function handleDocumentTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_documents': {
      const params: Record<string, unknown> = { modulepart: args.modulepart };
      if (args.id) params.id = args.id;
      if (args.ref) params.ref = args.ref;
      const data = await api.get('/documents', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_document': {
      const data = await api.get('/documents/download', { modulepart: args.modulepart, original_file: args.original_file });
      return JSON.stringify(data, null, 2);
    }
    case 'delete_document': {
      await api.delete(`/documents?modulepart=${args.modulepart}&original_file=${encodeURIComponent(args.original_file as string)}`);
      return `✅ Document supprimé.`;
    }
    case 'generate_document_pdf': {
      const data = await api.get(`/documents/builddoc`, { modulepart: args.modulepart, original_file: args.id, langcode: args.langcode || 'fr_FR' });
      return `✅ PDF généré pour ${args.modulepart} #${args.id}.\n${JSON.stringify(data, null, 2)}`;
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
