import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const thirdpartyTools: Tool[] = [
  {
    name: 'list_thirdparties',
    description: 'Lister et rechercher les tiers Dolibarr (clients, prospects, fournisseurs). Supporte la recherche par nom, filtres SQL et pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre de résultats max (défaut: 100)' },
        page: { type: 'number', description: 'Page de résultats pour pagination (défaut: 0)' },
        sortfield: { type: 'string', description: 'Champ de tri (ex: t.nom, t.datec)' },
        sortorder: { type: 'string', enum: ['ASC', 'DESC'], description: 'Ordre de tri' },
        mode: { type: 'number', description: '1=clients seulement, 2=prospects, 3=cli+pros, 4=fournisseurs' },
        sqlfilters: { type: 'string', description: "Filtre SQL: ex: (t.nom:like:'%Digital%')" },
      },
    },
  },
  {
    name: 'get_thirdparty',
    description: "Obtenir les détails complets d'un tiers par son ID",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du tiers' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_thirdparty',
    description: 'Créer un nouveau tiers (client, prospect ou fournisseur)',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom/Raison sociale du tiers' },
        alias: { type: 'string', description: 'Nom alternatif / alias' },
        client: { type: 'number', description: '0=aucun, 1=client, 2=prospect, 3=client+prospect' },
        fournisseur: { type: 'number', description: '0=non, 1=fournisseur' },
        email: { type: 'string', description: 'Email principal' },
        phone: { type: 'string', description: 'Téléphone' },
        address: { type: 'string', description: 'Adresse postale' },
        zip: { type: 'string', description: 'Code postal' },
        town: { type: 'string', description: 'Ville' },
        country_id: { type: 'number', description: 'ID pays (ex: 221 pour Sénégal)' },
        tva_intracom: { type: 'string', description: 'Numéro TVA intracommunautaire' },
        siret: { type: 'string', description: 'SIRET ou NINEA' },
        note_public: { type: 'string', description: 'Note publique sur le tiers' },
        note_private: { type: 'string', description: 'Note privée sur le tiers' },
        codecompta: { type: 'string', description: 'Code comptable du tiers' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_thirdparty',
    description: "Mettre à jour les informations d'un tiers existant",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du tiers à modifier' },
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        zip: { type: 'string' },
        town: { type: 'string' },
        client: { type: 'number' },
        fournisseur: { type: 'number' },
        note_public: { type: 'string' },
        note_private: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_thirdparty_invoices',
    description: "Lister toutes les factures d'un tiers spécifique",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du tiers' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_thirdparty_proposals',
    description: "Lister tous les devis/propositions d'un tiers",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du tiers' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_thirdparty_orders',
    description: "Lister toutes les commandes d'un tiers",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du tiers' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_thirdparty_contacts',
    description: "Lister les contacts associés à un tiers",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du tiers' },
      },
      required: ['id'],
    },
  },
];

export async function handleThirdpartyTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_thirdparties': {
      const params: Record<string, unknown> = {
        limit: args.limit || 100,
        page: args.page || 0,
      };
      if (args.sortfield) params.sortfield = args.sortfield;
      if (args.sortorder) params.sortorder = args.sortorder;
      if (args.mode) params.mode = args.mode;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/thirdparties', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_thirdparty': {
      const data = await api.get(`/thirdparties/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_thirdparty': {
      const id = await api.post('/thirdparties', args);
      return `✅ Tiers créé avec succès. ID: ${id}\nNom: ${args.name}`;
    }
    case 'update_thirdparty': {
      const { id, ...rest } = args;
      await api.put(`/thirdparties/${id}`, rest);
      return `✅ Tiers #${id} mis à jour avec succès.`;
    }
    case 'get_thirdparty_invoices': {
      const data = await api.get(`/thirdparties/${args.id}/invoices`);
      return JSON.stringify(data, null, 2);
    }
    case 'get_thirdparty_proposals': {
      const data = await api.get(`/thirdparties/${args.id}/proposals`);
      return JSON.stringify(data, null, 2);
    }
    case 'get_thirdparty_orders': {
      const data = await api.get(`/thirdparties/${args.id}/orders`);
      return JSON.stringify(data, null, 2);
    }
    case 'get_thirdparty_contacts': {
      const data = await api.get(`/thirdparties/${args.id}/contacts`);
      return JSON.stringify(data, null, 2);
    }
    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
