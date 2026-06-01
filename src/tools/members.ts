import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const memberTools: Tool[] = [
  {
    name: 'list_members',
    description: 'Lister les adhérents/membres. Statut: -1=Brouillon, 0=En attente, 1=Actif, 2=Résilié',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        page: { type: 'number', description: 'Page de pagination' },
        status: { type: 'number', description: '-1=Brouillon, 0=En attente, 1=Actif, 2=Résilié' },
        typeid: { type: 'number', description: 'Filtrer par type de membre' },
        sqlfilters: { type: 'string', description: "Filtre SQL ex: (t.lastname:like:'%Diop%')" },
      },
    },
  },
  {
    name: 'get_member',
    description: 'Obtenir les détails complets d\'un adhérent (cotisations, contact, type)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'adhérent' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_member',
    description: 'Créer un nouvel adhérent',
    inputSchema: {
      type: 'object',
      properties: {
        lastname: { type: 'string', description: 'Nom' },
        firstname: { type: 'string', description: 'Prénom' },
        company: { type: 'string', description: 'Société (si entreprise)' },
        email: { type: 'string', description: 'Email' },
        phone: { type: 'string', description: 'Téléphone' },
        address: { type: 'string', description: 'Adresse' },
        zip: { type: 'string', description: 'Code postal' },
        town: { type: 'string', description: 'Ville' },
        country_id: { type: 'number', description: 'ID du pays' },
        typeid: { type: 'number', description: 'ID du type de membre' },
        morphy: { type: 'string', description: "'phy'=Personne physique, 'mor'=Personne morale" },
        note_public: { type: 'string', description: 'Note publique' },
        note_private: { type: 'string', description: 'Note interne' },
        fk_soc: { type: 'number', description: 'ID du tiers Dolibarr lié' },
      },
      required: ['lastname'],
    },
  },
  {
    name: 'update_member',
    description: 'Modifier les informations d\'un adhérent',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'adhérent' },
        lastname: { type: 'string' }, firstname: { type: 'string' },
        email: { type: 'string' }, phone: { type: 'string' },
        address: { type: 'string' }, zip: { type: 'string' }, town: { type: 'string' },
        typeid: { type: 'number', description: 'Nouveau type de membre' },
        note_public: { type: 'string' }, note_private: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_member',
    description: 'Supprimer un adhérent',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'adhérent à supprimer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'validate_member_subscription',
    description: 'Valider/créer une cotisation pour un adhérent (active son adhésion)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'adhérent' },
        date_start: { type: 'string', description: 'Date de début ISO 8601' },
        date_end: { type: 'string', description: 'Date de fin (expiration) ISO 8601' },
        amount: { type: 'number', description: 'Montant de la cotisation' },
        label: { type: 'string', description: 'Libellé de la cotisation (ex: Cotisation 2025)' },
        fk_bank: { type: 'number', description: 'ID du compte bancaire pour encaissement' },
      },
      required: ['id', 'date_start', 'date_end'],
    },
  },
  {
    name: 'list_member_types',
    description: 'Lister les types d\'adhésion/membres configurés',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
  },
  {
    name: 'create_member_type',
    description: 'Créer un nouveau type d\'adhésion',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Libellé du type (ex: Membre actif, Bienfaiteur)' },
        amount: { type: 'number', description: 'Montant de cotisation par défaut' },
        duration: { type: 'string', description: "Durée: 'y'=1 an (défaut), 'm'=1 mois" },
        subscription: { type: 'number', description: '1=Cotisation requise, 0=Non (défaut: 1)' },
        note: { type: 'string', description: 'Description du type' },
      },
      required: ['label'],
    },
  },
  {
    name: 'list_member_subscriptions',
    description: 'Lister les cotisations d\'un adhérent (historique des paiements d\'adhésion)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'adhérent' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_member_type',
    description: 'Modifier un type d\'adhésion (libellé, montant, durée)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du type d\'adhésion' },
        label: { type: 'string', description: 'Libellé' },
        amount: { type: 'number', description: 'Montant de cotisation par défaut' },
        duration: { type: 'string', description: "'y'=1 an, 'm'=1 mois" },
        subscription: { type: 'number', description: '1=Cotisation requise, 0=Non' },
        note: { type: 'string', description: 'Description' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_member_type',
    description: 'Supprimer un type d\'adhésion',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du type d\'adhésion à supprimer' },
      },
      required: ['id'],
    },
  },
];

export async function handleMemberTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_members': {
      const params: Record<string, unknown> = { limit: args.limit || 100, page: args.page || 0 };
      if (args.status !== undefined) params.status = args.status;
      if (args.typeid) params.typeid = args.typeid;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/members', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_member': {
      const [member, subscriptions] = await Promise.all([
        api.get(`/members/${args.id}`),
        api.get(`/members/${args.id}/subscriptions`).catch(() => []),
      ]);
      return JSON.stringify({ member, subscriptions }, null, 2);
    }
    case 'create_member': {
      const payload = { morphy: 'phy', ...args };
      const id = await api.post('/members', payload);
      return `✅ Adhérent créé. ID: ${id}\nNom: ${args.firstname || ''} ${args.lastname}`;
    }
    case 'update_member': {
      const { id, ...rest } = args;
      await api.put(`/members/${id}`, rest);
      return `✅ Adhérent #${id} mis à jour.`;
    }
    case 'delete_member': {
      await api.delete(`/members/${args.id}`);
      return `✅ Adhérent #${args.id} supprimé.`;
    }
    case 'validate_member_subscription': {
      const payload = {
        date_start: Math.floor(new Date(args.date_start as string).getTime() / 1000),
        date_end: Math.floor(new Date(args.date_end as string).getTime() / 1000),
        amount: args.amount || 0,
        label: args.label || `Cotisation ${new Date().getFullYear()}`,
        fk_bank: args.fk_bank,
      };
      const subId = await api.post(`/members/${args.id}/subscriptions`, payload);
      return `✅ Cotisation créée pour l'adhérent #${args.id}. ID cotisation: ${subId}\nPériode: ${args.date_start} → ${args.date_end} | Montant: ${args.amount || 0}`;
    }
    case 'list_member_types': {
      const data = await api.get('/members/types', { limit: args.limit || 50 });
      return JSON.stringify(data, null, 2);
    }
    case 'create_member_type': {
      const payload = {
        label: args.label,
        amount: args.amount || 0,
        duration: args.duration || 'y',
        subscription: args.subscription !== undefined ? args.subscription : 1,
        note: args.note || '',
      };
      const id = await api.post('/members/types', payload);
      return `✅ Type d'adhésion '${args.label}' créé. ID: ${id}`;
    }
    case 'list_member_subscriptions': {
      const data = await api.get(`/members/${args.id}/subscriptions`);
      return JSON.stringify(data, null, 2);
    }
    case 'update_member_type': {
      const { id, ...rest } = args;
      await api.put(`/members/types/${id}`, rest);
      return `✅ Type d'adhésion #${id} mis à jour.`;
    }
    case 'delete_member_type': {
      await api.delete(`/members/types/${args.id}`);
      return `✅ Type d'adhésion #${args.id} supprimé.`;
    }
    default:
      throw new Error(`Outil membre inconnu: ${name}`);
  }
}
