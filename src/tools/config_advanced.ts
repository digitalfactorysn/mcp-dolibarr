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
  // ── CATÉGORIES ─────────────────────────────────────────────────────────────
  {
    name: 'get_category',
    description: 'Obtenir les détails d\'une catégorie par son ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la catégorie' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_category',
    description: 'Modifier une catégorie existante (libellé, couleur, parent)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la catégorie' },
        label: { type: 'string', description: 'Nouveau libellé' },
        description: { type: 'string', description: 'Nouvelle description' },
        color: { type: 'string', description: 'Couleur hex (ex: #FF0000)' },
        fk_parent: { type: 'number', description: 'ID catégorie parente (0 pour enlever parent)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_category',
    description: 'Supprimer une catégorie',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de la catégorie à supprimer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_objects_in_category',
    description: 'Lister les objets (tiers, produits, contacts...) appartenant à une catégorie',
    inputSchema: {
      type: 'object',
      properties: {
        category_id: { type: 'number', description: 'ID de la catégorie' },
        object_type: { type: 'string', description: "'thirdparties', 'products', 'contacts', 'members', 'projects'" },
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
      },
      required: ['category_id', 'object_type'],
    },
  },
  // ── CHAMPS PERSONNALISÉS (EXTRAFIELDS) ─────────────────────────────────────
  {
    name: 'get_extrafield',
    description: 'Obtenir les détails d\'un champ personnalisé spécifique',
    inputSchema: {
      type: 'object',
      properties: {
        elementtype: { type: 'string', description: "Type d'objet (ex: 'thirdparty', 'invoice')" },
        attrname: { type: 'string', description: 'Nom technique du champ' },
      },
      required: ['elementtype', 'attrname'],
    },
  },
  {
    name: 'update_extrafield',
    description: 'Modifier un champ personnalisé existant (libellé, visible, obligatoire)',
    inputSchema: {
      type: 'object',
      properties: {
        elementtype: { type: 'string', description: "Type d'objet cible" },
        attrname: { type: 'string', description: 'Nom technique du champ' },
        label: { type: 'string', description: 'Nouveau libellé' },
        required: { type: 'number', description: '1=Obligatoire, 0=Optionnel' },
        visible: { type: 'number', description: '1=Visible, 0=Masqué, -1=Masqué sur liste' },
        default_value: { type: 'string', description: 'Nouvelle valeur par défaut' },
        param: { type: 'string', description: "Pour type 'select': options 'val1:Libelle1;val2:Libelle2'" },
      },
      required: ['elementtype', 'attrname'],
    },
  },
  // ── MODÈLES EMAIL ──────────────────────────────────────────────────────────
  {
    name: 'list_email_templates',
    description: 'Lister les modèles d\'emails configurés (confirmations, relances, envoi de facture...)',
    inputSchema: {
      type: 'object',
      properties: {
        module: { type: 'string', description: "Filtrer par module (ex: 'invoice', 'order', 'proposal')" },
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
      },
    },
  },
  {
    name: 'get_email_template',
    description: 'Obtenir le contenu d\'un modèle d\'email',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du modèle d\'email' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_email_template',
    description: 'Créer un nouveau modèle d\'email (supporte les balises Dolibarr: __CUSTOMER_NAME__, __INVOICE_REF__...)',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Nom du modèle' },
        topic: { type: 'string', description: "Sujet de l'email" },
        content: { type: 'string', description: "Corps de l'email (HTML ou texte)" },
        module: { type: 'string', description: "Module associé (ex: 'invoice', 'order', 'all')" },
        lang: { type: 'string', description: "Langue (ex: 'fr_FR', 'en_US'). Défaut: fr_FR" },
        position: { type: 'number', description: 'Ordre d\'affichage' },
      },
      required: ['label', 'topic', 'content'],
    },
  },
  {
    name: 'update_email_template',
    description: 'Modifier un modèle d\'email existant',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du modèle' },
        label: { type: 'string', description: 'Nouveau nom' },
        topic: { type: 'string', description: 'Nouveau sujet' },
        content: { type: 'string', description: 'Nouveau contenu' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_email_template',
    description: 'Supprimer un modèle d\'email',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du modèle à supprimer' },
      },
      required: ['id'],
    },
  },
  // ── DICTIONNAIRES COMPLÉMENTAIRES ──────────────────────────────────────────
  {
    name: 'list_regions',
    description: 'Lister les régions géographiques par pays',
    inputSchema: {
      type: 'object',
      properties: {
        country_id: { type: 'number', description: 'ID du pays (requis)' },
        limit: { type: 'number', description: 'Nombre max (défaut: 200)' },
      },
      required: ['country_id'],
    },
  },
  {
    name: 'list_departments',
    description: 'Lister les départements/provinces par pays ou région',
    inputSchema: {
      type: 'object',
      properties: {
        country_id: { type: 'number', description: 'ID du pays' },
        region_id: { type: 'number', description: 'ID de la région (optionnel pour affiner)' },
        limit: { type: 'number', description: 'Nombre max (défaut: 300)' },
      },
    },
  },
  {
    name: 'list_towns',
    description: 'Lister les villes par département ou code postal',
    inputSchema: {
      type: 'object',
      properties: {
        zipcode: { type: 'string', description: 'Code postal pour filtrer' },
        town: { type: 'string', description: 'Nom de la ville pour filtrer' },
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
      },
    },
  },
  {
    name: 'list_availability',
    description: 'Lister les délais de disponibilité configurés (délais de livraison/traitement)',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_event_types',
    description: 'Lister les types d\'événements pour l\'agenda',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_price_levels',
    description: 'Lister les niveaux de prix configurés (tarification multi-niveaux)',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_typent',
    description: 'Lister les types d\'entreprise/taille (PME, Grande entreprise, TPE...)',
    inputSchema: { type: 'object', properties: {} },
  },
  // ── MODÈLES PDF ────────────────────────────────────────────────────────────
  {
    name: 'list_pdf_models',
    description: 'Lister les modèles de PDF disponibles pour un type d\'objet',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: "'invoice', 'order', 'proposal', 'supplier_invoice', 'supplier_order', 'contract', 'expedition'" },
      },
      required: ['type'],
    },
  },
  // ── CONDITIONS DE PAIEMENT CRUD ────────────────────────────────────────────
  {
    name: 'create_payment_term',
    description: 'Créer une nouvelle condition de paiement (ex: 30 jours net, 60 jours fin de mois)',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: "Code unique (ex: '30NET')" },
        libelle: { type: 'string', description: 'Libellé affiché (ex: 30 jours net)' },
        libelle_facture: { type: 'string', description: 'Libellé sur facture' },
        nbjour: { type: 'number', description: 'Nombre de jours' },
        type_cdr: { type: 'number', description: '0=Jours calendaires, 1=Fin de mois' },
        decalage: { type: 'number', description: 'Décalage en jours après fin de mois (si type_cdr=1)' },
      },
      required: ['code', 'libelle'],
    },
  },
  {
    name: 'create_payment_method',
    description: 'Créer un nouveau mode de paiement (ex: Mobile Money, Virement interne)',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: "Code unique (ex: 'MOMO')" },
        libelle: { type: 'string', description: 'Libellé (ex: Mobile Money)' },
        type: { type: 'string', description: "'payment'" },
      },
      required: ['code', 'libelle'],
    },
  },
  // ── VARIABLES DE CONFIGURATION ────────────────────────────────────────────
  {
    name: 'get_setup_value',
    description: 'Lire la valeur d\'une constante de configuration spécifique',
    inputSchema: {
      type: 'object',
      properties: {
        constant: { type: 'string', description: "Nom de la constante (ex: 'MAIN_DEFAULT_LANGUAGE', 'INVOICE_NUMBERING_MODEL')" },
      },
      required: ['constant'],
    },
  },
  {
    name: 'delete_setup_value',
    description: 'Supprimer une constante de configuration Dolibarr (la remet à sa valeur par défaut)',
    inputSchema: {
      type: 'object',
      properties: {
        constant: { type: 'string', description: "Nom de la constante à supprimer" },
      },
      required: ['constant'],
    },
  },
  // ── TICKETS ────────────────────────────────────────────────────────────────
  {
    name: 'list_ticket_categories',
    description: 'Lister les catégories de tickets support',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_ticket_severities',
    description: 'Lister les niveaux de gravité des tickets support',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_ticket_types',
    description: 'Lister les types de tickets support',
    inputSchema: { type: 'object', properties: {} },
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

    // ── CATÉGORIES ─────────────────────────────────────────────────────────
    case 'get_category': {
      const data = await api.get(`/categories/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'update_category': {
      const { id, ...rest } = args;
      await api.put(`/categories/${id}`, rest);
      return `✅ Catégorie #${id} mise à jour.`;
    }
    case 'delete_category': {
      await api.delete(`/categories/${args.id}`);
      return `✅ Catégorie #${args.id} supprimée.`;
    }
    case 'list_objects_in_category': {
      const data = await api.get(`/categories/${args.category_id}/${args.object_type}`, { limit: args.limit || 100 });
      return JSON.stringify(data, null, 2);
    }

    // ── EXTRAFIELDS ────────────────────────────────────────────────────────
    case 'get_extrafield': {
      const data = await api.get(`/extrafields`, { elementtype: args.elementtype, attrname: args.attrname });
      return JSON.stringify(data, null, 2);
    }
    case 'update_extrafield': {
      const { elementtype, attrname, ...rest } = args;
      await api.put(`/extrafields/${elementtype}/${attrname}`, rest);
      return `✅ Extrafield '${attrname}' (${elementtype}) mis à jour.`;
    }

    // ── MODÈLES EMAIL ─────────────────────────────────────────────────────
    case 'list_email_templates': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.module) params.module = args.module;
      const data = await api.get('/setup/emailtemplates', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_email_template': {
      const data = await api.get(`/setup/emailtemplates/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_email_template': {
      const payload = {
        label: args.label,
        topic: args.topic,
        content: args.content,
        module: args.module || 'all',
        lang: args.lang || 'fr_FR',
        position: args.position || 0,
        active: 1,
      };
      const id = await api.post('/setup/emailtemplates', payload);
      return `✅ Modèle d'email '${args.label}' créé. ID: ${id}`;
    }
    case 'update_email_template': {
      const { id, ...rest } = args;
      await api.put(`/setup/emailtemplates/${id}`, rest);
      return `✅ Modèle d'email #${id} mis à jour.`;
    }
    case 'delete_email_template': {
      await api.delete(`/setup/emailtemplates/${args.id}`);
      return `✅ Modèle d'email #${args.id} supprimé.`;
    }

    // ── DICTIONNAIRES ─────────────────────────────────────────────────────
    case 'list_regions': {
      const params: Record<string, unknown> = { country_id: args.country_id, limit: args.limit || 200 };
      const data = await api.get('/setup/dictionary/regions', params);
      return JSON.stringify(data, null, 2);
    }
    case 'list_departments': {
      const params: Record<string, unknown> = { limit: args.limit || 300 };
      if (args.country_id) params.country_id = args.country_id;
      if (args.region_id) params.region_id = args.region_id;
      const data = await api.get('/setup/dictionary/departments', params);
      return JSON.stringify(data, null, 2);
    }
    case 'list_towns': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.zipcode) params.zipcode = args.zipcode;
      if (args.town) params.town = args.town;
      const data = await api.get('/setup/dictionary/towns', params);
      return JSON.stringify(data, null, 2);
    }
    case 'list_availability': {
      const data = await api.get('/setup/dictionary/availability');
      return JSON.stringify(data, null, 2);
    }
    case 'list_event_types': {
      const data = await api.get('/setup/dictionary/event_types');
      return JSON.stringify(data, null, 2);
    }
    case 'list_price_levels': {
      const data = await api.get('/setup/dictionary/price_levels');
      return JSON.stringify(data, null, 2);
    }
    case 'list_typent': {
      const data = await api.get('/setup/dictionary/typent');
      return JSON.stringify(data, null, 2);
    }

    // ── MODÈLES PDF ───────────────────────────────────────────────────────
    case 'list_pdf_models': {
      const data = await api.get(`/setup/models/${args.type}`);
      return JSON.stringify(data, null, 2);
    }

    // ── CONDITIONS & MODES DE PAIEMENT ────────────────────────────────────
    case 'create_payment_term': {
      const payload = {
        code: args.code,
        libelle: args.libelle,
        libelle_facture: args.libelle_facture || args.libelle,
        nbjour: args.nbjour || 0,
        type_cdr: args.type_cdr || 0,
        decalage: args.decalage || 0,
        active: 1,
      };
      const id = await api.post('/setup/dictionary/payment_terms', payload);
      return `✅ Condition de paiement '${args.libelle}' créée. ID: ${id}`;
    }
    case 'create_payment_method': {
      const payload = {
        code: args.code,
        libelle: args.libelle,
        type: args.type || 'payment',
        active: 1,
      };
      const id = await api.post('/setup/dictionary/payment_types', payload);
      return `✅ Mode de paiement '${args.libelle}' créé. ID: ${id}`;
    }

    // ── CONSTANTES ────────────────────────────────────────────────────────
    case 'get_setup_value': {
      const data = await api.get('/setup/conf', { sqlfilters: `(t.name:='${args.constant}')` });
      return JSON.stringify(data, null, 2);
    }
    case 'delete_setup_value': {
      await api.delete(`/setup/conf/${args.constant}`);
      return `✅ Constante '${args.constant}' supprimée (remise à sa valeur par défaut).`;
    }

    // ── TICKETS ───────────────────────────────────────────────────────────
    case 'list_ticket_categories': {
      const data = await api.get('/setup/dictionary/ticket_categories');
      return JSON.stringify(data, null, 2);
    }
    case 'list_ticket_severities': {
      const data = await api.get('/setup/dictionary/ticket_severities');
      return JSON.stringify(data, null, 2);
    }
    case 'list_ticket_types': {
      const data = await api.get('/setup/dictionary/ticket_types');
      return JSON.stringify(data, null, 2);
    }

    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
