import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const adminTools: Tool[] = [
  {
    name: 'get_user',
    description: 'Obtenir les détails complets d\'un utilisateur : informations, droits et groupes',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'ID de l\'utilisateur' },
        include_permissions: { type: 'boolean', description: 'Inclure la liste des droits (défaut: true)' },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'create_user',
    description: 'Créer un nouvel utilisateur Dolibarr',
    inputSchema: {
      type: 'object',
      properties: {
        login: { type: 'string', description: 'Identifiant de connexion (unique)' },
        lastname: { type: 'string', description: 'Nom de famille' },
        firstname: { type: 'string', description: 'Prénom' },
        email: { type: 'string', description: 'Adresse email' },
        password: { type: 'string', description: 'Mot de passe initial' },
        admin: { type: 'number', description: '1=Administrateur, 0=Utilisateur normal (défaut: 0)' },
        statut: { type: 'number', description: '1=Actif, 0=Désactivé (défaut: 1)' },
        fk_socpeople: { type: 'number', description: 'ID contact associé (optionnel)' },
        note_private: { type: 'string', description: 'Note interne' },
      },
      required: ['login', 'lastname'],
    },
  },
  {
    name: 'update_user',
    description: 'Mettre à jour les informations d\'un utilisateur (nom, email, statut, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'ID de l\'utilisateur' },
        lastname: { type: 'string', description: 'Nom de famille' },
        firstname: { type: 'string', description: 'Prénom' },
        email: { type: 'string', description: 'Email' },
        admin: { type: 'number', description: '1=Admin, 0=Normal' },
        statut: { type: 'number', description: '1=Actif, 0=Désactivé' },
        note_private: { type: 'string', description: 'Note interne' },
        gender: { type: 'string', description: "'man' ou 'woman'" },
        job: { type: 'string', description: 'Poste/fonction' },
        phone_mobile: { type: 'string', description: 'Mobile' },
        fk_user: { type: 'number', description: 'ID du responsable hiérarchique' },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'set_user_password',
    description: 'Changer le mot de passe d\'un utilisateur',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'ID de l\'utilisateur' },
        password: { type: 'string', description: 'Nouveau mot de passe' },
      },
      required: ['user_id', 'password'],
    },
  },
  {
    name: 'disable_user',
    description: 'Désactiver le compte d\'un utilisateur (sans le supprimer)',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'ID de l\'utilisateur à désactiver' },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'enable_user',
    description: 'Réactiver le compte d\'un utilisateur désactivé',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'ID de l\'utilisateur à réactiver' },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'add_user_permission',
    description: 'Accorder un droit/permission à un utilisateur (ex: lecture factures, création devis...)',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'ID de l\'utilisateur' },
        permission_id: { type: 'number', description: 'ID de la permission à accorder (voir list_all_permissions)' },
      },
      required: ['user_id', 'permission_id'],
    },
  },
  {
    name: 'remove_user_permission',
    description: 'Révoquer un droit/permission d\'un utilisateur',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'ID de l\'utilisateur' },
        permission_id: { type: 'number', description: 'ID de la permission à révoquer' },
      },
      required: ['user_id', 'permission_id'],
    },
  },
  {
    name: 'list_groups',
    description: 'Lister tous les groupes d\'utilisateurs Dolibarr',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max de groupes (défaut: 100)' },
        include_members: { type: 'boolean', description: 'Inclure la liste des membres (défaut: false)' },
      },
    },
  },
  {
    name: 'create_group',
    description: 'Créer un nouveau groupe d\'utilisateurs',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom du groupe' },
        note: { type: 'string', description: 'Description du groupe' },
      },
      required: ['name'],
    },
  },
  {
    name: 'add_user_to_group',
    description: 'Ajouter un utilisateur à un groupe',
    inputSchema: {
      type: 'object',
      properties: {
        group_id: { type: 'number', description: 'ID du groupe' },
        user_id: { type: 'number', description: 'ID de l\'utilisateur' },
      },
      required: ['group_id', 'user_id'],
    },
  },
  {
    name: 'remove_user_from_group',
    description: 'Retirer un utilisateur d\'un groupe',
    inputSchema: {
      type: 'object',
      properties: {
        group_id: { type: 'number', description: 'ID du groupe' },
        user_id: { type: 'number', description: 'ID de l\'utilisateur' },
      },
      required: ['group_id', 'user_id'],
    },
  },
  {
    name: 'update_thirdparty_accounting',
    description: 'Modifier les codes comptables d\'un tiers (compte client, compte fournisseur, code comptable)',
    inputSchema: {
      type: 'object',
      properties: {
        thirdparty_id: { type: 'number', description: 'ID du tiers' },
        code_compta: { type: 'string', description: 'Code comptable client (ex: 411XXXXX)' },
        code_compta_fournisseur: { type: 'string', description: 'Code comptable fournisseur (ex: 401XXXXX)' },
        tva_assuj: { type: 'number', description: 'Assujetti TVA: 1=Oui, 0=Non' },
        tva_intra: { type: 'string', description: 'Numéro TVA intracommunautaire' },
      },
      required: ['thirdparty_id'],
    },
  },
  {
    name: 'update_product_accounting',
    description: 'Modifier les codes comptables d\'un produit/service (compte de vente, compte d\'achat, taux TVA)',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'number', description: 'ID du produit/service' },
        accountancy_code_sell: { type: 'string', description: 'Compte comptable de vente (ex: 706100)' },
        accountancy_code_buy: { type: 'string', description: 'Compte comptable d\'achat (ex: 606100)' },
        tva_tx: { type: 'number', description: 'Taux de TVA en % (ex: 18 ou 0)' },
        localtax1_tx: { type: 'number', description: 'Taxe locale 1 (si applicable)' },
        localtax2_tx: { type: 'number', description: 'Taxe locale 2 (si applicable)' },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'delete_user',
    description: 'Supprimer définitivement un utilisateur Dolibarr (irréversible — préférer disable_user)',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'ID de l\'utilisateur à supprimer' },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'delete_group',
    description: 'Supprimer un groupe d\'utilisateurs',
    inputSchema: {
      type: 'object',
      properties: {
        group_id: { type: 'number', description: 'ID du groupe à supprimer' },
      },
      required: ['group_id'],
    },
  },
];

export async function handleAdminTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'get_user': {
      const includePerms = args.include_permissions !== false;
      const user = await api.get(`/users/${args.user_id}`);
      if (includePerms) {
        const perms = await api.get(`/users/${args.user_id}/permissions`).catch(() => null);
        return JSON.stringify({ ...user as object, permissions: perms }, null, 2);
      }
      return JSON.stringify(user, null, 2);
    }

    case 'create_user': {
      const payload: Record<string, unknown> = {
        login: args.login,
        lastname: args.lastname,
        firstname: args.firstname || '',
        email: args.email || '',
        admin: args.admin || 0,
        statut: args.statut !== undefined ? args.statut : 1,
      };
      if (args.note_private) payload.note_private = args.note_private;
      if (args.fk_socpeople) payload.fk_socpeople = args.fk_socpeople;
      const newId = await api.post('/users', payload);

      if (args.password) {
        await api.put(`/users/${newId}/setpassword`, { password: args.password }).catch(() => null);
      }

      return `✅ Utilisateur créé. ID: ${newId}\nLogin: ${args.login} | Nom: ${args.firstname || ''} ${args.lastname}${args.admin ? ' | 🔑 Administrateur' : ''}`;
    }

    case 'update_user': {
      const payload: Record<string, unknown> = {};
      const fields = ['lastname', 'firstname', 'email', 'admin', 'statut', 'note_private', 'gender', 'job', 'phone_mobile', 'fk_user'];
      for (const f of fields) if (args[f] !== undefined) payload[f] = args[f];
      await api.put(`/users/${args.user_id}`, payload);
      return `✅ Utilisateur #${args.user_id} mis à jour.`;
    }

    case 'set_user_password': {
      await api.put(`/users/${args.user_id}/setpassword`, { password: args.password });
      return `✅ Mot de passe de l'utilisateur #${args.user_id} mis à jour.`;
    }

    case 'disable_user': {
      await api.put(`/users/${args.user_id}`, { statut: 0 });
      return `✅ Utilisateur #${args.user_id} désactivé.`;
    }

    case 'enable_user': {
      await api.put(`/users/${args.user_id}`, { statut: 1 });
      return `✅ Utilisateur #${args.user_id} réactivé.`;
    }

    case 'add_user_permission': {
      await api.post(`/users/${args.user_id}/addpermissions`, { permissions: args.permission_id });
      return `✅ Permission #${args.permission_id} accordée à l'utilisateur #${args.user_id}.`;
    }

    case 'remove_user_permission': {
      await api.post(`/users/${args.user_id}/removepermissions`, { permissions: args.permission_id });
      return `✅ Permission #${args.permission_id} révoquée pour l'utilisateur #${args.user_id}.`;
    }

    case 'list_groups': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      const groups = await api.get<unknown[]>('/groups', params);
      const arr = Array.isArray(groups) ? groups : [];
      if (args.include_members) {
        const detailed = await Promise.all(
          arr.map(async (g: unknown) => {
            const group = g as Record<string, unknown>;
            const members = await api.get(`/groups/${group.id}/members`).catch(() => []);
            return { ...group, members };
          })
        );
        return JSON.stringify(detailed, null, 2);
      }
      return JSON.stringify(arr, null, 2);
    }

    case 'create_group': {
      const payload = { name: args.name, note: args.note || '' };
      const newId = await api.post('/groups', payload);
      return `✅ Groupe créé. ID: ${newId} | Nom: ${args.name}`;
    }

    case 'add_user_to_group': {
      await api.post(`/groups/${args.group_id}/members/${args.user_id}`, {});
      return `✅ Utilisateur #${args.user_id} ajouté au groupe #${args.group_id}.`;
    }

    case 'remove_user_from_group': {
      await api.delete(`/groups/${args.group_id}/members/${args.user_id}`);
      return `✅ Utilisateur #${args.user_id} retiré du groupe #${args.group_id}.`;
    }

    case 'update_thirdparty_accounting': {
      const payload: Record<string, unknown> = {};
      const fields = ['code_compta', 'code_compta_fournisseur', 'tva_assuj', 'tva_intra'];
      for (const f of fields) if (args[f] !== undefined) payload[f] = args[f];
      await api.put(`/thirdparties/${args.thirdparty_id}`, payload);
      return `✅ Codes comptables du tiers #${args.thirdparty_id} mis à jour.\n${JSON.stringify(payload, null, 2)}`;
    }

    case 'update_product_accounting': {
      const payload: Record<string, unknown> = {};
      const fields = ['accountancy_code_sell', 'accountancy_code_buy', 'tva_tx', 'localtax1_tx', 'localtax2_tx'];
      for (const f of fields) if (args[f] !== undefined) payload[f] = args[f];
      await api.put(`/products/${args.product_id}`, payload);
      return `✅ Codes comptables du produit #${args.product_id} mis à jour.\n${JSON.stringify(payload, null, 2)}`;
    }

    case 'delete_user': {
      await api.delete(`/users/${args.user_id}`);
      return `✅ Utilisateur #${args.user_id} supprimé définitivement.`;
    }

    case 'delete_group': {
      await api.delete(`/groups/${args.group_id}`);
      return `✅ Groupe #${args.group_id} supprimé.`;
    }

    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
