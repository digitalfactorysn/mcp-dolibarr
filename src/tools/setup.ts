import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const setupTools: Tool[] = [
  {
    name: 'get_company_info',
    description: "Obtenir les informations complètes de la société configurée dans Dolibarr (nom, adresse, SIRET/NINEA, TVA, logo...)",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_modules',
    description: "Lister les modules Dolibarr activés. Essentiel pour savoir quelles fonctionnalités sont disponibles.",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_setup_values',
    description: "Lire les constantes de configuration globale de Dolibarr (nécessite une clé API d'administrateur). Les secrets ne sont jamais renvoyés par Dolibarr.",
    inputSchema: {
      type: 'object',
      properties: {
        module: { type: 'string', description: "Préfixe des constantes à afficher (ex: 'FACTURE', 'SOCIETE', 'MAIN')" },
      },
    },
  },
  {
    name: 'list_payment_methods',
    description: "Lister les modes de paiement configurés (Virement, Chèque, CB, etc.) et leurs IDs",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_payment_terms',
    description: "Lister les conditions de paiement configurées (30j net, 60j fin de mois, comptant...)",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_countries',
    description: 'Lister les pays disponibles dans Dolibarr avec leurs IDs',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Filtrer par nom de pays' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'list_currencies',
    description: "Lister les devises disponibles dans Dolibarr",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_status',
    description: "Vérifier l'état de la connexion à l'API Dolibarr (test de santé et informations de version)",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleSetupTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'get_company_info': {
      const data = await api.get('/setup/company');
      return JSON.stringify(data, null, 2);
    }
    case 'list_modules': {
      const data = await api.get('/setup/modules');
      return JSON.stringify(data, null, 2);
    }
    case 'get_setup_values': {
      const data = await api.get<Record<string, unknown>>('/setup/conf');
      const prefix = String(args.module ?? '').toUpperCase();
      const filtered = Object.fromEntries(Object.entries(data ?? {}).filter(([k]) => k.toUpperCase().startsWith(prefix)));
      return JSON.stringify(filtered, null, 2);
    }
    case 'list_payment_methods': {
      const data = await api.get('/setup/dictionary/payment_types');
      return JSON.stringify(data, null, 2);
    }
    case 'list_payment_terms': {
      const data = await api.get('/setup/dictionary/payment_terms');
      return JSON.stringify(data, null, 2);
    }
    case 'list_countries': {
      const params: Record<string, unknown> = { limit: args.limit || 300 };
      if (args.filter) params.filter = args.filter;
      const data = await api.get('/setup/dictionary/countries', params);
      return JSON.stringify(data, null, 2);
    }
    case 'list_currencies': {
      const data = await api.get('/setup/dictionary/currencies');
      return JSON.stringify(data, null, 2);
    }
    case 'get_status': {
      const data = await api.get('/status');
      return `✅ Connexion Dolibarr OK.\n${JSON.stringify(data, null, 2)}`;
    }
    default:
      throw new Error(`Outil Configuration inconnu: ${name}`);
  }
}
