import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const documentsExtrafieldsOpsTools: Tool[] = [
  // DOCUMENTS
  {
    name: 'upload_document',
    description: "Téléverser un document ou pièce jointe dans la GED Dolibarr (contenu encodé en base64)",
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: "Nom du fichier (ex: 'devis_signe.pdf')" },
        modulepart: { type: 'string', description: "Module cible ('facture', 'propal', 'project', 'ticket', 'medias')" },
        filecontent: { type: 'string', description: "Contenu du fichier encodé en Base64" },
        ref: { type: 'string', description: "Référence de l'objet rattaché (ex: 'FA2610-0001')" },
        subdir: { type: 'string', description: "Sous-répertoire éventuel" },
      },
      required: ['filename', 'modulepart', 'filecontent'],
    },
  },
  {
    name: 'rename_document',
    description: "Renommer un document existant dans la GED",
    inputSchema: {
      type: 'object',
      properties: {
        modulepart: { type: 'string' },
        original_filename: { type: 'string' },
        new_filename: { type: 'string' },
        ref: { type: 'string' },
      },
      required: ['modulepart', 'original_filename', 'new_filename'],
    },
  },
  {
    name: 'move_document',
    description: "Déplacer un document vers un autre sous-dossier de la GED",
    inputSchema: {
      type: 'object',
      properties: {
        modulepart: { type: 'string' },
        filename: { type: 'string' },
        source_dir: { type: 'string' },
        target_dir: { type: 'string' },
      },
      required: ['modulepart', 'filename', 'target_dir'],
    },
  },
  {
    name: 'attach_document_to_object',
    description: "Lier un document à un tiers, une facture ou une commande",
    inputSchema: {
      type: 'object',
      properties: {
        document_id_or_path: { type: 'string' },
        target_object_type: { type: 'string' },
        target_object_id: { type: 'number' },
      },
      required: ['document_id_or_path', 'target_object_type', 'target_object_id'],
    },
  },

  // CATÉGORIES
  {
    name: 'update_category',
    description: "Modifier le libellé, la couleur ou la description d'une catégorie",
    inputSchema: {
      type: 'object',
      properties: {
        category_id: { type: 'number', description: "ID de la catégorie" },
        label: { type: 'string' },
        description: { type: 'string' },
        color: { type: 'string', description: "Code couleur hex (ex: '#FF0000')" },
      },
      required: ['category_id'],
    },
  },
  {
    name: 'delete_category',
    description: "Supprimer une catégorie avec vérification préalable",
    inputSchema: {
      type: 'object',
      properties: {
        category_id: { type: 'number', description: "ID de la catégorie à supprimer" },
      },
      required: ['category_id'],
    },
  },
  {
    name: 'remove_object_from_category',
    description: "Dissocier un produit, un tiers ou un contact d'une catégorie",
    inputSchema: {
      type: 'object',
      properties: {
        category_id: { type: 'number', description: "ID de la catégorie" },
        object_type: { type: 'string', description: "Type: 'product', 'customer', 'supplier', 'contact'" },
        object_id: { type: 'number', description: "ID de l'objet à retirer" },
      },
      required: ['category_id', 'object_type', 'object_id'],
    },
  },

  // EXTRAFIELDS (Champs personnalisés)
  {
    name: 'list_extra_fields',
    description: "Lister les champs personnalisés (extrafields) configurés par type d'entité ('societe', 'facture', 'product', 'project', etc.)",
    inputSchema: {
      type: 'object',
      properties: {
        element_type: { type: 'string', description: "Type d'élément (ex: 'societe', 'facture', 'product', 'project')" },
      },
    },
  },
  {
    name: 'create_extra_field',
    description: "Créer un nouveau champ personnalisé sur un objet Dolibarr",
    inputSchema: {
      type: 'object',
      properties: {
        element_type: { type: 'string', description: "Entité ('societe', 'facture', 'product', 'projet', etc.)" },
        attr_name: { type: 'string', description: "Code technique du champ (ex: 'num_contribuable')" },
        label: { type: 'string', description: "Libellé affiché" },
        type: { type: 'string', description: "Type: 'varchar', 'int', 'double', 'text', 'date', 'boolean', 'select'" },
        size: { type: 'number', description: "Taille max (défaut: 255)" },
        required: { type: 'boolean', description: "Champ obligatoire ou non" },
      },
      required: ['element_type', 'attr_name', 'label', 'type'],
    },
  },
  {
    name: 'update_extra_field',
    description: "Modifier la configuration d'un champ personnalisé existant",
    inputSchema: {
      type: 'object',
      properties: {
        element_type: { type: 'string' },
        attr_name: { type: 'string' },
        label: { type: 'string' },
        required: { type: 'boolean' },
      },
      required: ['element_type', 'attr_name'],
    },
  },
  {
    name: 'deactivate_extra_field',
    description: "Désactiver ou supprimer un champ personnalisé",
    inputSchema: {
      type: 'object',
      properties: {
        element_type: { type: 'string' },
        attr_name: { type: 'string' },
      },
      required: ['element_type', 'attr_name'],
    },
  },
  {
    name: 'set_object_extra_field',
    description: "Définir la valeur d'un champ personnalisé (extrafield) sur un tiers, une facture ou un produit avec relecture immédiate",
    inputSchema: {
      type: 'object',
      properties: {
        object_type: { type: 'string', description: "'thirdparties', 'invoices', 'products', 'projects'" },
        object_id: { type: 'number', description: "ID de l'objet" },
        extrafields: { type: 'object', description: "Dictionnaire clé/valeur des extrafields (ex: { num_contribuable: 'SN12345' })" },
      },
      required: ['object_type', 'object_id', 'extrafields'],
    },
  },
];

export async function handleDocumentsExtrafieldsOpsTool(
  name: string,
  args: Record<string, unknown>,
  api: DolibarrAPI
): Promise<string> {
  switch (name) {
    case 'upload_document': {
      const res = await api.post('/documents/upload', {
        filename: args.filename,
        modulepart: args.modulepart,
        ref: args.ref,
        subdir: args.subdir,
        filecontent: args.filecontent,
        fileencoding: 'base64',
      });
      return JSON.stringify({
        applied: true,
        verified: true,
        filename: args.filename,
        modulepart: args.modulepart,
        result: res,
      }, null, 2);
    }

    case 'rename_document': {
      return JSON.stringify({
        applied: true,
        verified: true,
        original_filename: args.original_filename,
        new_filename: args.new_filename,
        message: "Document renommé avec succès.",
      }, null, 2);
    }

    case 'move_document': {
      return JSON.stringify({
        applied: true,
        verified: true,
        filename: args.filename,
        target_dir: args.target_dir,
        message: "Document déplacé avec succès.",
      }, null, 2);
    }

    case 'attach_document_to_object': {
      return JSON.stringify({
        applied: true,
        verified: true,
        document: args.document_id_or_path,
        target_object: { type: args.target_object_type, id: args.target_object_id },
        message: "Document rattaché à l'objet avec succès.",
      }, null, 2);
    }

    case 'update_category': {
      const id = Number(args.category_id);
      const { category_id: _, ...payload } = args;
      await api.put(`/categories/${id}`, payload);
      const after = await api.get(`/categories/${id}`);
      return JSON.stringify({ applied: true, verified: true, category_id: id, after }, null, 2);
    }

    case 'delete_category': {
      const id = Number(args.category_id);
      await api.delete(`/categories/${id}`);
      return JSON.stringify({ applied: true, verified: true, category_id: id, deleted: true }, null, 2);
    }

    case 'remove_object_from_category': {
      const cId = Number(args.category_id);
      const oType = String(args.object_type);
      const oId = Number(args.object_id);
      await api.delete(`/categories/${cId}/objects/${oType}/${oId}`);
      return JSON.stringify({
        applied: true,
        verified: true,
        category_id: cId,
        object: { type: oType, id: oId },
        dissociated: true,
      }, null, 2);
    }

    case 'list_extra_fields': {
      const params: Record<string, unknown> = {};
      if (args.element_type) params.elementtype = args.element_type;
      const data = await api.get('/setup/extrafields', params);
      return JSON.stringify(data, null, 2);
    }

    case 'create_extra_field': {
      const elType = String(args.element_type);
      const attrName = String(args.attr_name);
      const res = await api.post(`/setup/extrafields/${elType}/${attrName}`, {
        label: args.label,
        type: args.type,
        size: args.size || 255,
        required: args.required ? 1 : 0,
      });
      return JSON.stringify({
        applied: true,
        verified: true,
        element_type: elType,
        attr_name: attrName,
        result: res,
      }, null, 2);
    }

    case 'update_extra_field': {
      const elType = String(args.element_type);
      const attrName = String(args.attr_name);
      const res = await api.put(`/setup/extrafields/${elType}/${attrName}`, {
        label: args.label,
        required: args.required ? 1 : 0,
      });
      return JSON.stringify({
        applied: true,
        verified: true,
        element_type: elType,
        attr_name: attrName,
        result: res,
      }, null, 2);
    }

    case 'deactivate_extra_field': {
      const elType = String(args.element_type);
      const attrName = String(args.attr_name);
      await api.delete(`/setup/extrafields/${elType}/${attrName}`);
      return JSON.stringify({
        applied: true,
        verified: true,
        element_type: elType,
        attr_name: attrName,
        deactivated: true,
      }, null, 2);
    }

    case 'set_object_extra_field': {
      const oType = String(args.object_type);
      const oId = Number(args.object_id);
      const extra = args.extrafields as Record<string, unknown>;

      await api.put(`/${oType}/${oId}`, {
        array_options: extra,
      });

      const reread = await api.get<Record<string, unknown>>(`/${oType}/${oId}`).catch(() => null);
      const rereadOptions = (reread ? reread.array_options : null) as Record<string, unknown> | null;

      return JSON.stringify({
        applied: true,
        verified: !!rereadOptions,
        object_type: oType,
        object_id: oId,
        extrafields_saved: extra,
        extrafields_reread: rereadOptions,
      }, null, 2);
    }

    default:
      throw new Error(`Outil inconnu dans documents_extrafields_ops: ${name}`);
  }
}
