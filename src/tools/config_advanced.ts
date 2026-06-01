import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const configAdvancedTools: Tool[] = [
  {
    name: 'activate_module',
    description: 'Activer un module Dolibarr (ex: Comptabilité, Stock, Projets...)',
    inputSchema: {
      type: 'object',
      properties: {
        module_name: { type: 'string', description: "Nom technique du module (ex: 'Accounting', 'Stock', 'Project', 'Invoice', 'Contract')" },
      },
      required: ['module_name'],
    },
  },
  {
    name: 'deactivate_module',
    description: 'Désactiver un module Dolibarr',
    inputSchema: {
      type: 'object',
      properties: {
        module_name: { type: 'string', description: "Nom technique du module à désactiver" },
      },
      required: ['module_name'],
    },
  },
  {
    name: 'list_extrafields',
    description: 'Lister les champs personnalisés (extra fields) définis pour un type d\'objet Dolibarr',
    inputSchema: {
      type: 'object',
      properties: {
        elementtype: { type: 'string', description: "Type d'objet: 'thirdparty', 'contact', 'product', 'invoice', 'order', 'proposal', 'project', 'task', 'contract'" },
      },
      required: ['elementtype'],
    },
  },
  {
    name: 'create_extrafield',
    description: 'Créer un champ personnalisé pour un type d\'objet Dolibarr',
    inputSchema: {
      type: 'object',
      properties: {
        elementtype: { type: 'string', description: "Type d'objet cible (ex: 'thirdparty', 'product', 'invoice')" },
        attrname: { type: 'string', description: "Nom technique du champ (lettres minuscules, chiffres, _)" },
        label: { type: 'string', description: 'Libellé affiché dans l\'interface' },
        type: { type: 'string', description: "'varchar', 'int', 'double', 'date', 'datetime', 'boolean', 'select', 'text', 'html', 'link', 'phone', 'mail', 'url'" },
        size: { type: 'string', description: "Taille (ex: '255' pour varchar, '10,3' pour double)" },
        required: { type: 'number', description: '1=Obligatoire, 0=Optionnel' },
        visible: { type: 'number', description: '1=Visible, 0=Masqué, -1=Masqué sur liste' },
        default_value: { type: 'string', description: 'Valeur par défaut' },
        param: { type: 'string', description: "Pour type 'select': options au format 'val1:Libelle1;val2:Libelle2'" },
      },
      required: ['elementtype', 'attrname', 'label', 'type'],
    },
  },
  {
    name: 'delete_extrafield',
    description: 'Supprimer un champ personnalisé',
    inputSchema: {
      type: 'object',
      properties: {
        elementtype: { type: 'string', description: "Type d'objet cible" },
        attrname: { type: 'string', description: "Nom technique du champ à supprimer" },
      },
      required: ['elementtype', 'attrname'],
    },
  },
  {
    name: 'list_units',
    description: 'Lister les unités de mesure (kg, L, m, pcs...)',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_shipping_methods',
    description: 'Lister les modes de livraison/expédition configurés',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_civilities',
    description: 'Lister les civilités disponibles (M., Mme, Dr...)',
    inputSchema: {
      type: 'object',
      properties: {
        lang: { type: 'string', description: "Langue (ex: 'fr_FR', 'en_US'). Défaut: fr_FR" },
      },
    },
  },
  {
    name: 'list_contact_types',
    description: 'Lister les types de contacts (BILLING, SHIPPING, CUSTOMER, SUPPLIER...)',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: "'external' ou 'internal'. Défaut: external" },
        element: { type: 'string', description: "Element concerné (ex: 'invoice', 'order', 'proposal')" },
      },
    },
  },
  {
    name: 'list_legal_forms',
    description: 'Lister les formes juridiques (SARL, SA, SAS, Auto-entrepreneur...)',
    inputSchema: {
      type: 'object',
      properties: {
        country_id: { type: 'number', description: 'ID du pays pour filtrer les formes juridiques' },
      },
    },
  },
  {
    name: 'list_incoterms',
    description: 'Lister les incoterms (EXW, FOB, CIF, DDP...)',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_vat_rates',
    description: 'Lister les taux de TVA configurés dans Dolibarr',
    inputSchema: {
      type: 'object',
      properties: {
        country_id: { type: 'number', description: 'ID du pays (optionnel)' },
      },
    },
  },
  {
    name: 'create_vat_rate',
    description: 'Créer un nouveau taux de TVA',
    inputSchema: {
      type: 'object',
      properties: {
        taux: { type: 'number', description: 'Taux en % (ex: 18 ou 0)' },
        localtax1: { type: 'number', description: 'Taxe locale 1 en % (0 si aucune)' },
        localtax2: { type: 'number', description: 'Taxe locale 2 en % (0 si aucune)' },
        recuperableonly: { type: 'number', description: '1=Non déductible, 0=Déductible' },
        note: { type: 'string', description: "Note/description du taux" },
        country_id: { type: 'number', description: 'ID du pays' },
      },
      required: ['taux'],
    },
  },
  {
    name: 'list_categories',
    description: 'Lister les catégories Dolibarr (produits, tiers, contacts, membres, projets)',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: "'product', 'customer', 'supplier', 'contact', 'member', 'project'" },
        limit: { type: 'number', description: 'Nombre max (défaut: 200)' },
        sqlfilters: { type: 'string', description: "Filtre SQL ex: (t.label:like:'%VIP%')" },
      },
      required: ['type'],
    },
  },
  {
    name: 'create_category',
    description: 'Créer une nouvelle catégorie',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Nom de la catégorie' },
        type: { type: 'number', description: "0=produit, 1=fournisseur, 2=client, 3=membre, 4=contact, 5=compte bancaire, 6=projet" },
        description: { type: 'string', description: 'Description' },
        color: { type: 'string', description: 'Couleur hex (ex: #FF0000)' },
        fk_parent: { type: 'number', description: 'ID catégorie parente (pour hiérarchie)' },
      },
      required: ['label', 'type'],
    },
  },
  {
    name: 'add_object_to_category',
    description: 'Associer un objet (tiers, produit, contact...) à une catégorie',
    inputSchema: {
      type: 'object',
      properties: {
        category_id: { type: 'number', description: 'ID de la catégorie' },
        object_type: { type: 'string', description: "'thirdparty', 'product', 'contact', 'member', 'project'" },
        object_id: { type: 'number', description: "ID de l'objet à associer" },
      },
      required: ['category_id', 'object_type', 'object_id'],
    },
  },
  {
    name: 'remove_object_from_category',
    description: 'Retirer un objet d\'une catégorie',
    inputSchema: {
      type: 'object',
      properties: {
        category_id: { type: 'number', description: 'ID de la catégorie' },
        object_type: { type: 'string', description: "'thirdparty', 'product', 'contact', 'member', 'project'" },
        object_id: { type: 'number', description: "ID de l'objet à retirer" },
      },
      required: ['category_id', 'object_type', 'object_id'],
    },
  },
  {
    name: 'list_documents',
    description: 'Lister les documents/fichiers attachés à un objet Dolibarr',
    inputSchema: {
      type: 'object',
      properties: {
        modulepart: { type: 'string', description: "'invoice', 'order', 'proposal', 'product', 'thirdparty', 'contact', 'project', 'supplier_invoice'" },
        id: { type: 'number', description: "ID de l'objet" },
      },
      required: ['modulepart', 'id'],
    },
  },
  {
    name: 'download_document',
    description: 'Télécharger le contenu d\'un document (retourne base64)',
    inputSchema: {
      type: 'object',
      properties: {
        modulepart: { type: 'string', description: "Module cible (ex: 'invoice', 'order')" },
        original_file: { type: 'string', description: 'Chemin du fichier retourné par list_documents' },
      },
      required: ['modulepart', 'original_file'],
    },
  },
  {
    name: 'upload_document',
    description: 'Uploader un document (base64) et l\'attacher à un objet Dolibarr',
    inputSchema: {
      type: 'object',
      properties: {
        modulepart: { type: 'string', description: "Module cible (ex: 'invoice', 'order', 'thirdparty')" },
        ref: { type: 'string', description: "Référence de l'objet cible" },
        filename: { type: 'string', description: 'Nom du fichier avec extension (ex: contrat.pdf)' },
        filecontent: { type: 'string', description: 'Contenu du fichier encodé en base64' },
        overwriteifexists: { type: 'number', description: '1=Écraser si existe, 0=Ne pas écraser (défaut: 0)' },
      },
      required: ['modulepart', 'ref', 'filename', 'filecontent'],
    },
  },
  {
    name: 'delete_document',
    description: 'Supprimer un document attaché à un objet',
    inputSchema: {
      type: 'object',
      properties: {
        modulepart: { type: 'string', description: "Module cible" },
        original_file: { type: 'string', description: 'Chemin du fichier à supprimer (retourné par list_documents)' },
      },
      required: ['modulepart', 'original_file'],
    },
  },
];

export async function handleConfigAdvancedTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'activate_module': {
      await api.get(`/setup/modules/${args.module_name}/activate`);
      return `✅ Module '${args.module_name}' activé.`;
    }

    case 'deactivate_module': {
      await api.get(`/setup/modules/${args.module_name}/disable`);
      return `✅ Module '${args.module_name}' désactivé.`;
    }

    case 'list_extrafields': {
      const data = await api.get(`/extrafields`, { elementtype: args.elementtype });
      return JSON.stringify(data, null, 2);
    }

    case 'create_extrafield': {
      const payload: Record<string, unknown> = {
        attrname: args.attrname,
        label: args.label,
        type: args.type,
        size: args.size || '255',
        elementtype: args.elementtype,
        required: args.required || 0,
        visible: args.visible !== undefined ? args.visible : 1,
      };
      if (args.default_value !== undefined) payload.default_value = args.default_value;
      if (args.param) payload.param = args.param;
      await api.post(`/extrafields`, payload);
      return `✅ Champ personnalisé '${args.attrname}' créé pour l'objet '${args.elementtype}'.`;
    }

    case 'delete_extrafield': {
      await api.delete(`/extrafields/${args.elementtype}/${args.attrname}`);
      return `✅ Champ personnalisé '${args.attrname}' supprimé.`;
    }

    case 'list_units': {
      const data = await api.get('/setup/dictionary/units');
      return JSON.stringify(data, null, 2);
    }

    case 'list_shipping_methods': {
      const data = await api.get('/setup/dictionary/shipping_methods');
      return JSON.stringify(data, null, 2);
    }

    case 'list_civilities': {
      const params: Record<string, unknown> = {};
      if (args.lang) params.lang = args.lang;
      const data = await api.get('/setup/dictionary/civilities', params);
      return JSON.stringify(data, null, 2);
    }

    case 'list_contact_types': {
      const params: Record<string, unknown> = {};
      if (args.source) params.source = args.source;
      if (args.element) params.element = args.element;
      const data = await api.get('/setup/dictionary/contact_types', params);
      return JSON.stringify(data, null, 2);
    }

    case 'list_legal_forms': {
      const params: Record<string, unknown> = {};
      if (args.country_id) params.country_id = args.country_id;
      const data = await api.get('/setup/dictionary/legal_form', params);
      return JSON.stringify(data, null, 2);
    }

    case 'list_incoterms': {
      const data = await api.get('/setup/dictionary/incoterms');
      return JSON.stringify(data, null, 2);
    }

    case 'list_vat_rates': {
      const params: Record<string, unknown> = {};
      if (args.country_id) params.country_id = args.country_id;
      const data = await api.get('/setup/dictionary/vatrates', params);
      return JSON.stringify(data, null, 2);
    }

    case 'create_vat_rate': {
      const payload = {
        taux: args.taux,
        localtax1: args.localtax1 || 0,
        localtax2: args.localtax2 || 0,
        recuperableonly: args.recuperableonly || 0,
        note: args.note || '',
        fk_pays: args.country_id || 0,
        active: 1,
      };
      const id = await api.post('/setup/dictionary/vatrates', payload);
      return `✅ Taux de TVA ${args.taux}% créé. ID: ${id}`;
    }

    case 'list_categories': {
      const typeMap: Record<string, number> = { product: 0, supplier: 1, customer: 2, member: 3, contact: 4, project: 5 };
      const typeNum = typeMap[args.type as string] ?? 0;
      const params: Record<string, unknown> = { type: typeNum, limit: args.limit || 200 };
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/categories', params);
      return JSON.stringify(data, null, 2);
    }

    case 'create_category': {
      const id = await api.post('/categories', args);
      return `✅ Catégorie '${args.label}' créée. ID: ${id}`;
    }

    case 'add_object_to_category': {
      const endpointMap: Record<string, string> = {
        thirdparty: 'thirdparties', product: 'products', contact: 'contacts', member: 'members', project: 'projects',
      };
      const endpoint = endpointMap[args.object_type as string] || (args.object_type as string);
      await api.post(`/categories/${args.category_id}/${endpoint}`, { id: args.object_id });
      return `✅ Objet #${args.object_id} (${args.object_type}) ajouté à la catégorie #${args.category_id}.`;
    }

    case 'remove_object_from_category': {
      const endpointMap: Record<string, string> = {
        thirdparty: 'thirdparties', product: 'products', contact: 'contacts', member: 'members', project: 'projects',
      };
      const endpoint = endpointMap[args.object_type as string] || (args.object_type as string);
      await api.delete(`/categories/${args.category_id}/${endpoint}/${args.object_id}`);
      return `✅ Objet #${args.object_id} retiré de la catégorie #${args.category_id}.`;
    }

    case 'list_documents': {
      const data = await api.get('/documents', { modulepart: args.modulepart, id: args.id });
      return JSON.stringify(data, null, 2);
    }

    case 'download_document': {
      const data = await api.get('/documents/download', { modulepart: args.modulepart, original_file: args.original_file });
      return JSON.stringify(data, null, 2);
    }

    case 'upload_document': {
      const payload = {
        filename: args.filename,
        ref: args.ref,
        modulepart: args.modulepart,
        filecontent: args.filecontent,
        fileencoding: 'base64',
        overwriteifexists: args.overwriteifexists || 0,
      };
      await api.post('/documents/upload', payload);
      return `✅ Document '${args.filename}' uploadé sur ${args.modulepart}/${args.ref}.`;
    }

    case 'delete_document': {
      await api.delete(`/documents?modulepart=${args.modulepart}&original_file=${encodeURIComponent(args.original_file as string)}`);
      return `✅ Document supprimé.`;
    }

    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
