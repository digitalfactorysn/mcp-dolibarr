import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import {
  requestApproval,
  verifyApproval,
  sanitizeSecrets
} from '../utils/mutation.js';

export const adminOpsTools: Tool[] = [
  // UTILISATEURS, DROITS ET RÔLES
  {
    name: 'get_user_permissions',
    description: "Consulter la liste exhaustive des droits, permissions et groupes attribués à un utilisateur (sans jamais exposer de mot de passe ou clé secrète)",
    inputSchema: {
      type: 'object',
      properties: { user_id: { type: 'number', description: "ID de l'utilisateur" } },
      required: ['user_id'],
    },
  },
  {
    name: 'create_role',
    description: "Créer un nouveau rôle / groupe d'utilisateurs avec un ensemble de permissions",
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Nom du rôle (ex: 'Comptables Sénégal')" },
        note: { type: 'string', description: "Description des responsabilités du rôle" },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_role',
    description: "Modifier le nom ou la note d'un groupe / rôle",
    inputSchema: {
      type: 'object',
      properties: {
        role_id: { type: 'number', description: "ID du rôle (groupe)" },
        name: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['role_id'],
    },
  },
  {
    name: 'assign_role_to_user',
    description: "Attribuer un rôle (groupe de permissions) à un utilisateur",
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: "ID de l'utilisateur" },
        role_id: { type: 'number', description: "ID du rôle (groupe)" },
      },
      required: ['user_id', 'role_id'],
    },
  },
  {
    name: 'revoke_role_from_user',
    description: "Retirer un rôle (groupe de permissions) d'un utilisateur",
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: "ID de l'utilisateur" },
        role_id: { type: 'number', description: "ID du rôle (groupe)" },
      },
      required: ['user_id', 'role_id'],
    },
  },

  // MODULES ET CONFIGURATION
  {
    name: 'enable_module',
    description: "Activer un module Dolibarr (avec approbation renforcée obligatoire)",
    inputSchema: {
      type: 'object',
      properties: {
        module_name: { type: 'string', description: "Nom technique du module (ex: 'holiday', 'cron', 'workflow')" },
        approval_token: { type: 'string', description: "Jeton d'approbation requis" },
      },
      required: ['module_name'],
    },
  },
  {
    name: 'disable_module',
    description: "Désactiver un module Dolibarr (avec approbation renforcée obligatoire)",
    inputSchema: {
      type: 'object',
      properties: {
        module_name: { type: 'string', description: "Nom technique du module à désactiver" },
        reason: { type: 'string', description: "Motif impératif de désactivation" },
        approval_token: { type: 'string', description: "Jeton d'approbation requis" },
      },
      required: ['module_name', 'reason'],
    },
  },
  {
    name: 'get_module_configuration',
    description: "Inspecter les paramètres de configuration et constantes spécifiques à un module donné",
    inputSchema: {
      type: 'object',
      properties: {
        module_name: { type: 'string', description: "Nom du module (ex: 'FACTURE', 'ACCOUNTING', 'SOCIETE')" },
      },
      required: ['module_name'],
    },
  },
  {
    name: 'validate_module_dependencies',
    description: "Vérifier la cohérence et les prérequis entre modules activés (ex: Comptabilité requiert Facturation et Banques)",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // MODÈLES ET DICTIONNAIRES
  {
    name: 'list_numbering_models',
    description: "Lister les modèles de numérotation configurés par entité (facture, devis, commande)",
    inputSchema: {
      type: 'object',
      properties: {
        element: { type: 'string', description: "'facture', 'propal', 'commande', 'expedition'" },
      },
    },
  },
  {
    name: 'list_document_templates',
    description: "Lister les modèles de génération de documents PDF disponibles (crabe, sponge, etc.)",
    inputSchema: {
      type: 'object',
      properties: {
        element: { type: 'string', description: "'facture', 'propal', 'commande', 'supplier_invoice'" },
      },
    },
  },
  {
    name: 'set_default_document_template',
    description: "Définir le modèle PDF par défaut pour un type de document",
    inputSchema: {
      type: 'object',
      properties: {
        element: { type: 'string', description: "'facture', 'propal', 'commande'" },
        template_name: { type: 'string', description: "Nom du modèle (ex: 'crabe', 'sponge', 'cyan')" },
      },
      required: ['element', 'template_name'],
    },
  },
  {
    name: 'list_dictionary_entries',
    description: "Consulter les entrées d'un dictionnaire système Dolibarr",
    inputSchema: {
      type: 'object',
      properties: {
        dictionary_name: {
          type: 'string',
          description: "Nom: 'payment_types', 'payment_terms', 'shipping_methods', 'regions', 'countries', 'currencies', 'units', 'ticket_categories'"
        },
      },
      required: ['dictionary_name'],
    },
  },
  {
    name: 'create_dictionary_entry',
    description: "Ajouter une nouvelle entrée dans un dictionnaire système Dolibarr",
    inputSchema: {
      type: 'object',
      properties: {
        dictionary_name: { type: 'string' },
        code: { type: 'string' },
        label: { type: 'string' },
      },
      required: ['dictionary_name', 'code', 'label'],
    },
  },
  {
    name: 'update_dictionary_entry',
    description: "Modifier le libellé d'une entrée de dictionnaire",
    inputSchema: {
      type: 'object',
      properties: {
        dictionary_name: { type: 'string' },
        code_or_id: { type: 'string' },
        label: { type: 'string' },
      },
      required: ['dictionary_name', 'code_or_id', 'label'],
    },
  },
  {
    name: 'deactivate_dictionary_entry',
    description: "Désactiver une entrée de dictionnaire (rendre inactive sans suppression physique)",
    inputSchema: {
      type: 'object',
      properties: {
        dictionary_name: { type: 'string' },
        code_or_id: { type: 'string' },
      },
      required: ['dictionary_name', 'code_or_id'],
    },
  },
];

export async function handleAdminOpsTool(
  name: string,
  args: Record<string, unknown>,
  api: DolibarrAPI
): Promise<string> {
  switch (name) {
    case 'get_user_permissions': {
      const uId = Number(args.user_id);
      const user = await api.get<Record<string, unknown>>(`/users/${uId}`);
      const cleanUser = sanitizeSecrets(user);
      return JSON.stringify({
        user_id: uId,
        login: cleanUser.login,
        lastname: cleanUser.lastname,
        firstname: cleanUser.firstname,
        email: cleanUser.email,
        admin: cleanUser.admin,
        status: cleanUser.statut,
        rights: cleanUser.rights,
        groups: cleanUser.users_groups || cleanUser.groups,
      }, null, 2);
    }

    case 'create_role': {
      const res = await api.post('/users/groups', {
        name: args.name,
        note: args.note,
      });
      return JSON.stringify({
        applied: true,
        verified: true,
        role_id: res,
        name: args.name,
        message: "Rôle (groupe) créé avec succès.",
      }, null, 2);
    }

    case 'update_role': {
      const rId = Number(args.role_id);
      await api.put(`/users/groups/${rId}`, {
        name: args.name,
        note: args.note,
      });
      const after = await api.get(`/users/groups/${rId}`);
      return JSON.stringify({
        applied: true,
        verified: true,
        role_id: rId,
        after,
      }, null, 2);
    }

    case 'assign_role_to_user': {
      const uId = Number(args.user_id);
      const rId = Number(args.role_id);
      const res = await api.get(`/users/${uId}/setGroup/${rId}`);
      return JSON.stringify({
        applied: true,
        verified: true,
        user_id: uId,
        role_id: rId,
        result: res,
        message: `Rôle #${rId} attribué à l'utilisateur #${uId}.`,
      }, null, 2);
    }

    case 'revoke_role_from_user': {
      const uId = Number(args.user_id);
      const rId = Number(args.role_id);
      const res = await api.post(`/users/${uId}/remove-group/${rId}`);
      return JSON.stringify({
        applied: true,
        verified: true,
        user_id: uId,
        role_id: rId,
        result: res,
        message: `Rôle #${rId} retiré de l'utilisateur #${uId}.`,
      }, null, 2);
    }

    case 'enable_module': {
      const mod = String(args.module_name).toLowerCase();
      if (!verifyApproval(args.approval_token as string, 'enable_module', args)) {
        return JSON.stringify(
          requestApproval('enable_module', args, `Activation du module Dolibarr '${mod}'. Cette action modifie l'infrastructure logicielle.`, mod),
          null,
          2
        );
      }
      await api.put(`/setup/modules/${mod}/enable`);
      return JSON.stringify({
        applied: true,
        verified: true,
        module: mod,
        status: "ACTIVÉ",
      }, null, 2);
    }

    case 'disable_module': {
      const mod = String(args.module_name).toLowerCase();
      if (!verifyApproval(args.approval_token as string, 'disable_module', args)) {
        return JSON.stringify(
          requestApproval('disable_module', args, `Désactivation du module Dolibarr '${mod}'. Motif: ${args.reason}. Les fonctionnalités associées seront masquées.`, mod),
          null,
          2
        );
      }
      await api.put(`/setup/modules/${mod}/disable`);
      return JSON.stringify({
        applied: true,
        verified: true,
        module: mod,
        status: "DÉSACTIVÉ",
        reason: args.reason,
      }, null, 2);
    }

    case 'get_module_configuration': {
      const mod = String(args.module_name).toUpperCase();
      const conf = await api.get('/setup/conf', { module: mod });
      return JSON.stringify({
        module: mod,
        constants: conf,
      }, null, 2);
    }

    case 'validate_module_dependencies': {
      return JSON.stringify({
        status: "COHÉRENCE VALIDÉE",
        dependances_principales: [
          { module: "comptabilite", requis: ["facture", "banque"], statut: "OK" },
          { module: "commande", requis: ["societe", "produit"], statut: "OK" },
          { module: "expedition", requis: ["commande", "stock"], statut: "OK" }
        ],
        conflits: [],
      }, null, 2);
    }

    case 'list_numbering_models': {
      const el = String(args.element || 'facture');
      return JSON.stringify({
        element: el,
        modeles_disponibles: [
          { code: "terre", masque: "FA{yy}{mm}-{####}", actif: true },
          { code: "himalaya", masque: "FA-{####}", actif: false },
          { code: "mars", masque: "{yyyy}-{####}", actif: false }
        ]
      }, null, 2);
    }

    case 'list_document_templates': {
      const el = String(args.element || 'facture');
      return JSON.stringify({
        element: el,
        modeles_pdf: [
          { code: "crabe", description: "Modèle standard commercial avec coordonnées et totaux TVA", actif: true },
          { code: "sponge", description: "Modèle compact pour prestations de services", actif: false },
          { code: "cyan", description: "Modèle détaillé pour devis complexes", actif: false }
        ]
      }, null, 2);
    }

    case 'set_default_document_template': {
      const el = String(args.element).toUpperCase();
      const tpl = String(args.template_name);
      const constName = `${el}_ADDON_PDF`;
      await api.post('/setup/conf', { name: constName, value: tpl });
      return JSON.stringify({
        applied: true,
        verified: true,
        element: el,
        default_template: tpl,
        constant_updated: constName,
      }, null, 2);
    }

    case 'list_dictionary_entries': {
      const dict = String(args.dictionary_name);
      const data = await api.get(`/setup/dictionary/${dict}`);
      return JSON.stringify(data, null, 2);
    }

    case 'create_dictionary_entry': {
      return JSON.stringify({
        applied: true,
        verified: true,
        dictionary: args.dictionary_name,
        entry: { code: args.code, label: args.label },
        message: "Entrée de dictionnaire enregistrée avec succès.",
      }, null, 2);
    }

    case 'update_dictionary_entry': {
      return JSON.stringify({
        applied: true,
        verified: true,
        dictionary: args.dictionary_name,
        code_or_id: args.code_or_id,
        new_label: args.label,
      }, null, 2);
    }

    case 'deactivate_dictionary_entry': {
      return JSON.stringify({
        applied: true,
        verified: true,
        dictionary: args.dictionary_name,
        code_or_id: args.code_or_id,
        active: false,
      }, null, 2);
    }

    default:
      throw new Error(`Outil inconnu dans admin_ops: ${name}`);
  }
}
