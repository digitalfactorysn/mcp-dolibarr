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
    description: "Lire les constantes de configuration globale de Dolibarr avec filtrage natif par constante exacte, par module ou par mot-clé.",
    inputSchema: {
      type: 'object',
      properties: {
        constant: { type: 'string', description: "Nom exact de la constante (ex: 'MAIN_MONNAIE', 'CHARTOFACCOUNTS', alias: 'name' ou 'key')." },
        module: { type: 'string', description: "Filtrer par module (ex: 'FACTURE', 'SOCIETE', 'MAIN', 'ACCOUNTING', alias: 'prefix')" },
        search: { type: 'string', description: "Recherche par mot-clé dans les noms ou valeurs (alias: 'filter' ou 'query')" },
        limit: { type: 'number', description: "Nombre maximum de constantes à retourner (défaut: 50)" },
        page: { type: 'number', description: "Numéro de page (défaut: 0)" },
      },
    },
  },
  {
    name: 'set_setup_value',
    description: "Modifier ou créer une constante de configuration globale de Dolibarr avec relecture immédiate de vérification.",
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
    name: 'delete_setup_value',
    description: "Supprimer une constante de configuration globale de Dolibarr avec vérification par relecture.",
    inputSchema: {
      type: 'object',
      properties: {
        constant: { type: 'string', description: 'Nom de la constante à supprimer' },
      },
      required: ['constant'],
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
      const company = await api.get<Record<string, unknown>>('/setup/company').catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!company,
        message: 'Informations de la société mises à jour avec succès.',
        company: company || args,
      }, null, 2);
    }
    case 'list_modules': {
      const params: Record<string, unknown> = {};
      if (args.status !== undefined) params.status = args.status;
      else params.status = 1;
      const data = await api.get('/setup/modules', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_setup_values': {
      // 1. Si une constante spécifique est demandée (par nom, clé ou constant)
      const targetConst = (args.constant || args.name || args.key) as string | undefined;
      if (targetConst) {
        const constName = String(targetConst).trim();
        try {
          const val = await api.get<unknown>(`/setup/conf/${constName}`);
          return JSON.stringify({
            constant: constName,
            value: val,
            found: true,
          }, null, 2);
        } catch {
          return JSON.stringify({
            constant: constName,
            value: null,
            found: false,
          }, null, 2);
        }
      }

      // 2. Filtrage multi-critères avec support d'alias
      const moduleFilter = (args.module || args.category || args.prefix) ? String(args.module || args.category || args.prefix).trim().toUpperCase() : '';
      const searchFilter = (args.search || args.filter || args.query) ? String(args.search || args.filter || args.query).trim().toUpperCase() : '';
      const limit = Number(args.limit) > 0 ? Number(args.limit) : 50;
      const page = Number(args.page) > 0 ? Number(args.page) : 0;

      // Requête avec paramètres au backend Dolibarr
      const queryParams: Record<string, unknown> = {};
      if (moduleFilter) queryParams.module = moduleFilter;
      if (searchFilter) queryParams.search = searchFilter;
      if (limit) queryParams.limit = limit;
      if (page) queryParams.page = page;

      const rawConf = await api.get<Record<string, unknown>>('/setup/conf', queryParams);
      const allEntries = Object.entries(rawConf || {});

      // Filtrage de cohérence côté client
      const filtered = allEntries.filter(([k, v]) => {
        const keyUpper = k.toUpperCase();
        const valStr = String(v ?? '').toUpperCase();

        if (moduleFilter && !keyUpper.startsWith(moduleFilter) && !keyUpper.includes(moduleFilter)) {
          return false;
        }
        if (searchFilter && !keyUpper.includes(searchFilter) && !valStr.includes(searchFilter)) {
          return false;
        }
        return true;
      });

      const sliced = filtered.slice(0, limit);
      const resultObj: Record<string, unknown> = {};
      const entriesArr: Array<{ name: string; value: unknown }> = [];
      sliced.forEach(([k, v]) => {
        resultObj[k] = v;
        entriesArr.push({ name: k, value: v });
      });

      return JSON.stringify({
        total_matches: filtered.length,
        returned_count: sliced.length,
        filter_module: moduleFilter || undefined,
        filter_search: searchFilter || undefined,
        constants: resultObj,
        entries: entriesArr,
      }, null, 2);
    }
    case 'set_setup_value': {
      const targetConst = (args.constant || args.name || args.key) as string;
      const constName = String(targetConst).trim();
      const constVal = String(args.value);
      const payload = { constname: constName, constvalue: constVal };

      await api.post('/setup/conf', payload).catch(() => api.put(`/setup/conf/${constName}`, { value: constVal }));

      // Relecture immédiate pour vérification
      const reread = await api.get<unknown>(`/setup/conf/${constName}`).catch(() => null);
      const isVerified = reread !== null && String(reread) === constVal;

      return JSON.stringify({
        applied: true,
        verified: isVerified,
        constant: constName,
        value: constVal,
        reread_value: reread,
        message: isVerified
          ? `Constante '${constName}' définie à '${constVal}' et confirmée par relecture.`
          : `Constante '${constName}' mise à jour, valeur relue: '${reread}'.`,
      }, null, 2);
    }
    case 'delete_setup_value': {
      const targetConst = (args.constant || args.name || args.key) as string;
      const constName = String(targetConst).trim();

      await api.delete(`/setup/conf/${constName}`);

      // Relecture immédiate pour vérification de la suppression
      const reread = await api.get<unknown>(`/setup/conf/${constName}`).catch(() => null);
      const isDeleted = reread === null;

      return JSON.stringify({
        applied: true,
        verified: isDeleted,
        constant: constName,
        message: isDeleted
          ? `Constante '${constName}' supprimée et confirmée par relecture.`
          : `Constante '${constName}' suppression envoyée mais valeur résiduelle détectée: '${reread}'.`,
      }, null, 2);
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
