import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ApiError, DolibarrAPI } from '../api.js';

export const documentTools: Tool[] = [
  { name: 'list_documents', description: "Lister les documents/fichiers attachés à un objet Dolibarr", inputSchema: { type: 'object', properties: { modulepart: { type: 'string', description: "Module Dolibarr : facture, propal, commande, produit, societe, projet, contrat, fichinter, ticket, invoice_supplier, supplier_order, expensereport" }, id: { type: 'number', description: "ID de l'objet" }, ref: { type: 'string', description: 'Référence de l\'objet (alternative à id)' } }, required: ['modulepart'] } },
  { name: 'get_document', description: "Télécharger/obtenir un document (retourne base64)", inputSchema: { type: 'object', properties: { modulepart: { type: 'string', description: "Module Dolibarr : facture, propal, commande, produit, societe, projet, contrat, fichinter, ticket, invoice_supplier, supplier_order, expensereport" }, original_file: { type: 'string', description: 'Chemin du fichier (obtenu via list_documents)' } }, required: ['modulepart', 'original_file'] } },
  { name: 'delete_document', description: "Supprimer un document attaché", inputSchema: { type: 'object', properties: { modulepart: { type: 'string' }, original_file: { type: 'string', description: 'Chemin complet du fichier' } }, required: ['modulepart', 'original_file'] } },
  { name: 'generate_document_pdf', description: "Générer/regénérer le PDF d'un document Dolibarr", inputSchema: { type: 'object', properties: { modulepart: { type: 'string', description: "Module Dolibarr : facture, propal, commande, produit, societe, projet, contrat, fichinter, ticket, invoice_supplier, supplier_order, expensereport" }, ref: { type: 'string', description: "Référence de l'objet (ex. FA2501-0001)" }, doctemplate: { type: 'string', description: 'Modèle PDF (ex. crabe)' }, langcode: { type: 'string', description: "Langue (ex: 'fr_FR')" } }, required: ['modulepart', 'ref'] } },
];

export async function handleDocumentTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_documents': {
      const data = await api.get('/documents', { modulepart: args.modulepart, id: args.id, ref: args.ref });
      return JSON.stringify(data, null, 2);
    }
    case 'get_document': {
      const data = await api.get('/documents/download', { modulepart: args.modulepart, original_file: args.original_file });
      return JSON.stringify(data, null, 2);
    }
    case 'delete_document': {
      await api.delete('/documents', { modulepart: args.modulepart, original_file: args.original_file });
      return `✅ Document supprimé.`;
    }
    case 'generate_document_pdf': {
      const ref = String(args.ref ?? '');
      if (!/^[A-Za-z0-9_\-]{1,64}$/.test(ref)) throw new ApiError('Référence invalide (lettres, chiffres, _ et - uniquement).');
      const data = await api.put('/documents/builddoc', {
        modulepart: args.modulepart,
        original_file: `${ref}/${ref}.pdf`,
        doctemplate: args.doctemplate ?? '',
        langcode: args.langcode ?? '',
      });
      return `✅ PDF généré pour ${args.modulepart} ${ref}.\n${JSON.stringify(data, null, 2)}`;
    }
    default: throw new Error(`Outil inconnu: ${name}`);
  }
}
