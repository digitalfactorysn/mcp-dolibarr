import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import { json, paging } from './_util.js';

export const setupTools: Tool[] = [
  {
    name: 'get_company_info',
    description: "Obtenir les informations complètes de la société configurée dans Dolibarr (nom, adresse, SIRET, TVA, logo...)",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_modules',
    description: "Lister tous les modules Dolibarr et leur statut (activé/désactivé). Essentiel pour savoir quelles fonctionnalités sont disponibles.",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_setup_values',
    description: "Lire une constante de configuration Dolibarr (ex. MAIN_LANG_DEFAULT). Sans nom : liste complète, réservée aux comptes administrateurs ; Dolibarr masque lui-même les secrets.",
    inputSchema: {
      type: 'object',
      properties: {
        constant: { type: 'string', description: "Nom de la constante (ex: 'MAIN_LANG_DEFAULT')" },
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
    name: 'list_dictionary',
    description: "Lire un dictionnaire Dolibarr (types de frais, types de congés, TVA, pays, civilités, catégories de tickets, unités…) pour obtenir les identifiants à utiliser dans les autres outils.",
    inputSchema: {
      type: 'object',
      properties: {
        dictionary: { type: 'string', enum: ['availability', 'civilities', 'contact_types', 'countries', 'currencies', 'event_types', 'expensereport_types', 'holiday_types', 'incoterms', 'legal_form', 'ordering_methods', 'ordering_origins', 'payment_terms', 'payment_types', 'public_holiday', 'regions', 'shipping_methods', 'socialnetworks', 'staff', 'states', 'thirdparty_types', 'ticket_categories', 'ticket_severities', 'ticket_types', 'towns', 'units', 'vat'], description: 'Nom du dictionnaire' },
        limit: { type: 'number' },
        page: { type: 'number' },
      },
      required: ['dictionary'],
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
    case 'get_company_info':
      return json(await api.get('/setup/company'));
    case 'list_modules':
      return json(await api.get('/setup/modules'));
    case 'get_setup_values':
      return json(await api.get(args.constant ? `/setup/conf/${args.constant}` : '/setup/conf'));
    case 'list_payment_methods':
      return json(await api.get('/setup/dictionary/payment_types', { limit: 100 }));
    case 'list_payment_terms':
      return json(await api.get('/setup/dictionary/payment_terms', { limit: 100 }));
    case 'list_countries':
      return json(await api.get('/setup/dictionary/countries', { ...paging(args, { limit: 300 }), filter: args.filter }));
    case 'list_currencies':
      return json(await api.get('/setup/dictionary/currencies', { limit: 200 }));
    case 'list_dictionary':
      return json(await api.get(`/setup/dictionary/${args.dictionary}`, paging(args)));
    case 'get_status': {
      const data = await api.get('/status');
      return `✅ Connexion Dolibarr OK.\n${json(data)}`;
    }
    default:
      throw new Error(`Outil Configuration inconnu: ${name}`);
  }
}
