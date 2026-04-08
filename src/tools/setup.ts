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
    name: 'update_company_info',
    description: "Mettre à jour les informations de la société (adresse, téléphone, email, numéros légaux...)",
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Raison sociale' },
        address: { type: 'string', description: 'Adresse' },
        zip: { type: 'string', description: 'Code postal' },
        town: { type: 'string', description: 'Ville' },
        phone: { type: 'string', description: 'Téléphone' },
        email: { type: 'string', description: 'Email de la société' },
        url: { type: 'string', description: 'Site web' },
        siret: { type: 'string', description: 'SIRET ou NINEA' },
        tva_intracom: { type: 'string', description: 'Numéro TVA' },
        capital: { type: 'string', description: 'Capital social' },
        currency_code: { type: 'string', description: "Code devise (ex: 'XOF', 'EUR', 'USD')" },
      },
    },
  },
  {
    name: 'list_modules',
    description: "Lister tous les modules Dolibarr et leur statut (activé/désactivé). Essentiel pour savoir quelles fonctionnalités sont disponibles.",
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'number', description: '1=Modules activés seulement (défaut), 0=Tous les modules dispo' },
      },
    },
  },
  {
    name: 'get_setup_values',
    description: "Lire les constantes de configuration globale de Dolibarr (paramètres de configuration)",
    inputSchema: {
      type: 'object',
      properties: {
        module: { type: 'string', description: "Filtrer par module (ex: 'FACTURE', 'SOCIETE', 'MAIN')" },
      },
    },
  },
  {
    name: 'set_setup_value',
    description: "Modifier une constante de configuration globale de Dolibarr. ⚠️ Utiliser avec précaution.",
    inputSchema: {
      type: 'object',
      properties: {
        constant: { type: 'string', description: "Nom de la constante (ex: 'MAIN_DEFAULT_LANGUAGE', 'INVOICE_NUMBERING_MODEL')" },
        value: { type: 'string', description: 'Nouvelle valeur' },
      },
      required: ['constant', 'value'],
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
    case 'update_company_info': {
      await api.put('/setup/company', args);
      return '✅ Informations de la société mises à jour avec succès.';
    }
    case 'list_modules': {
      const params: Record<string, unknown> = {};
      if (args.status !== undefined) params.status = args.status;
      else params.status = 1;
      const data = await api.get('/setup/modules', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_setup_values': {
      const params: Record<string, unknown> = { limit: 500 };
      if (args.module) params.sqlfilters = `(t.name:like:'${args.module}%')`;
      const data = await api.get('/setup/conf', params);
      return JSON.stringify(data, null, 2);
    }
    case 'set_setup_value': {
      const payload = { constname: args.constant, constvalue: args.value };
      await api.post('/setup/conf', payload);
      return `✅ Constante '${args.constant}' définie à '${args.value}'.`;
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
