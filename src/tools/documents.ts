import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const documentTools: Tool[] = [
  { name: 'list_documents', description: "Lister les documents/fichiers attachés à un objet Dolibarr", inputSchema: { type: 'object', properties: { modulepart: { type: 'string', description: "Module: 'invoice', 'proposal', 'order', 'product', 'thirdparty', 'project', 'contract', 'intervention', 'ticket', 'supplier_invoice'" }, id: { type: 'number', description: "ID de l'objet" }, ref: { type: 'string', description: 'Référence de l\'objet (alternative à id)' } }, required: ['modulepart'] } },
  { name: 'get_document', description: "Télécharger un document (contenu en base64, tronqué au-delà de 2 Mo)", inputSchema: { type: 'object', properties: { modulepart: { type: 'string', description: "Module: 'invoice', 'proposal', 'order', etc." }, original_file: { type: 'string', description: 'Chemin du fichier (obtenu via list_documents)' } }, required: ['modulepart', 'original_file'] } },
  { name: 'delete_document', description: "Supprimer un document attaché", inputSchema: { type: 'object', properties: { modulepart: { type: 'string' }, original_file: { type: 'string', description: 'Chemin complet du fichier' } }, required: ['modulepart', 'original_file'] } },
  { name: 'generate_document_pdf', description: "Générer/regénérer le PDF d'un document Dolibarr", inputSchema: { type: 'object', properties: { modulepart: { type: 'string', enum: ['invoice', 'proposal', 'order', 'contract', 'shipment'], description: "Type d'objet" }, id: { type: 'number', description: "ID de l'objet" }, doctemplate: { type: 'string', description: 'Modèle PDF (vide = modèle par défaut)' }, langcode: { type: 'string', description: "Langue (ex: 'fr_FR')" } }, required: ['modulepart', 'id'] } },
];

// Endpoint REST permettant de retrouver la référence (et donc le chemin du PDF) d'un objet
const OBJECT_ENDPOINTS: Record<string, string> = {
  invoice: '/invoices', proposal: '/proposals', order: '/orders',
  contract: '/contracts', shipment: '/shipments',
};

const MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024;

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
      const data = await api.get<Record<string, unknown>>('/documents/download', { modulepart: args.modulepart, original_file: args.original_file });
      if (typeof data.content === 'string' && data.content.length > MAX_DOWNLOAD_BYTES * 4 / 3) {
        return JSON.stringify({ ...data, content: undefined, note: `Fichier trop volumineux (${data.filesize} octets) : contenu non renvoyé.` }, null, 2);
      }
      return JSON.stringify(data, null, 2);
    }
    case 'delete_document': {
      const query = new URLSearchParams({ modulepart: String(args.modulepart), original_file: String(args.original_file) });
      await api.delete(`/documents?${query}`);
      return `✅ Document supprimé.`;
    }
    case 'generate_document_pdf': {
      const endpoint = OBJECT_ENDPOINTS[args.modulepart as string];
      const object = await api.get<Record<string, unknown>>(`${endpoint}/${args.id}`);
      const ref = String(object.ref ?? '');
      if (!ref) throw new Error(`Référence introuvable pour ${args.modulepart} #${args.id}.`);
      const data = await api.put<Record<string, unknown>>('/documents/builddoc', {
        modulepart: args.modulepart,
        original_file: `${ref}/${ref}.pdf`,
        doctemplate: args.doctemplate || '',
        langcode: args.langcode || '',
      });
      return `✅ PDF généré pour ${args.modulepart} ${ref} : ${data.filename} (${data.filesize} octets). Utilisez get_document pour le télécharger.`;
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
