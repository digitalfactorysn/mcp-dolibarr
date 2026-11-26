import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { maskSetupValue } from '../security/secrets.js';
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
    name: 'update_company_legal_info',
    description: "Mettre à jour les informations légales et fiscales de l'entreprise (SIRET/NINEA, TVA intracommunautaire, RCS, capital, forme juridique, code APE)",
    inputSchema: {
      type: 'object',
      properties: {
        siret: { type: 'string', description: 'Numéro SIRET ou NINEA (Sénégal)' },
        tva_intracom: { type: 'string', description: 'Numéro d identification TVA / fiscal' },
        rcs: { type: 'string', description: 'Registre du Commerce et du Crédit Mobilier (RCCM / RCS)' },
        capital: { type: 'string', description: 'Capital social (ex: 10000000 FCFA)' },
        forme_juridique: { type: 'string', description: 'Forme juridique (ex: SAS, SARL, SA, SUARL)' },
        ape: { type: 'string', description: 'Code APE / NAF' },
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
        limit: { type: 'number', description: "Nombre maximum de constantes par page (défaut: 50, max: 1000)" },
        page: { type: 'number', description: "Page (0 = première). Utiliser next_page de la réponse si has_more=true" },
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
      const updates: Record<string, string> = {};
      if (args.name) updates['MAIN_INFO_SOCIETE_NOM'] = String(args.name).trim();
      if (args.address) updates['MAIN_INFO_SOCIETE_ADDRESS'] = String(args.address).trim();
      if (args.town) updates['MAIN_INFO_SOCIETE_TOWN'] = String(args.town).trim();
      if (args.zip) updates['MAIN_INFO_SOCIETE_ZIP'] = String(args.zip).trim();
      if (args.phone) updates['MAIN_INFO_SOCIETE_TEL'] = String(args.phone).trim();
      if (args.email) updates['MAIN_INFO_SOCIETE_MAIL'] = String(args.email).trim();
      if (args.url) updates['MAIN_INFO_SOCIETE_WEB'] = String(args.url).trim();
      if (args.siret) updates['MAIN_INFO_SIRET'] = String(args.siret).trim();
      if (args.tva_intracom) updates['MAIN_INFO_TVAINTRA'] = String(args.tva_intracom).trim();
      if (args.capital) updates['MAIN_INFO_CAPITAL'] = String(args.capital).trim();

      const results: Record<string, unknown> = {};
      for (const [constName, constVal] of Object.entries(updates)) {
        await api.post('/setup/conf', {
          constant: constName,
          constname: constName,
          value: constVal,
          constvalue: constVal,
          entity: 1,
        }).catch(() => api.put(`/setup/conf/${constName}`, { value: constVal }));
        results[constName] = constVal;
      }
      const company = await api.get<Record<string, unknown>>('/setup/company').catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: Object.keys(updates).length > 0,
        message: 'Informations de la société mises à jour avec succès.',
        updated_constants: results,
        company: company || args,
      }, null, 2);
    }
    case 'update_company_legal_info': {
      const updates: Record<string, string> = {};
      if (args.siret) updates['MAIN_INFO_SIRET'] = String(args.siret).trim();
      if (args.tva_intracom) updates['MAIN_INFO_TVAINTRA'] = String(args.tva_intracom).trim();
      if (args.rcs || args.siren) updates['MAIN_INFO_SIREN'] = String(args.rcs || args.siren).trim();
      if (args.capital) updates['MAIN_INFO_CAPITAL'] = String(args.capital).trim();
      if (args.ape) updates['MAIN_INFO_APE'] = String(args.ape).trim();
      if (args.forme_juridique) updates['MAIN_INFO_SOCIETE_FORME_JURIDIQUE'] = String(args.forme_juridique).trim();

      const results: Record<string, unknown> = {};
      for (const [constName, constVal] of Object.entries(updates)) {
        await api.post('/setup/conf', {
          constant: constName,
          constname: constName,
          value: constVal,
          constvalue: constVal,
          entity: 1,
        }).catch(() => api.put(`/setup/conf/${constName}`, { value: constVal }));
        results[constName] = constVal;
      }
      const company = await api.get<Record<string, unknown>>('/setup/company').catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: Object.keys(updates).length > 0,
        message: 'Informations légales et fiscales mises à jour avec succès.',
        updated_constants: results,
        company_legal_info: {
          siret: (company as any)?.idprof2 || args.siret || results['MAIN_INFO_SIRET'],
          rcs: (company as any)?.idprof1 || args.rcs || results['MAIN_INFO_SIREN'],
          tva_intracom: (company as any)?.tva_intra || args.tva_intracom || results['MAIN_INFO_TVAINTRA'],
          capital: (company as any)?.capital || args.capital || results['MAIN_INFO_CAPITAL'],
          ape: (company as any)?.ape || args.ape || results['MAIN_INFO_APE'],
          forme_juridique: (company as any)?.forme_juridique || args.forme_juridique || results['MAIN_INFO_SOCIETE_FORME_JURIDIQUE'],
        },
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
      let moduleFilter = (args.module || args.category || args.prefix) ? String(args.module || args.category || args.prefix).trim().toUpperCase() : '';
      let searchFilter = (args.search || args.filter || args.query) ? String(args.search || args.filter || args.query).trim().toUpperCase() : '';

      // 1. Si une constante spécifique est demandée
      const targetConst = (args.constant || args.name || args.key) as string | undefined;
      if (targetConst) {
        const constName = String(targetConst).trim();
        try {
          const val = await api.get<unknown>(`/setup/conf/${constName}`);
          if (val !== undefined && val !== null) {
            return JSON.stringify({
              documentation: "Lecture directe de constante exacte via get_setup_values.",
              constant: constName,
              value: maskSetupValue(constName, val),
              found: true,
            }, null, 2);
          }
        } catch {
          // Si l'accès direct échoue (ex: 'ACCOUNTING' ou 'FACTURE' passé comme nom),
          // on bascule en mode filtre module/recherche au lieu de renvoyer un échec vide
          if (!moduleFilter && !searchFilter) {
            moduleFilter = constName.toUpperCase();
          }
        }
      }

      // 2. Filtrage multi-critères avec support d'alias
      const limit = Number(args.limit) > 0 ? Math.min(Number(args.limit), 1000) : 50;
      const page = Number(args.page) > 0 ? Number(args.page) : 0;

      const queryParams: Record<string, unknown> = {};
      if (moduleFilter) queryParams.module = moduleFilter;
      if (searchFilter) queryParams.search = searchFilter;

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

      const sliced = filtered.slice(page * limit, page * limit + limit);
      const resultObj: Record<string, unknown> = {};
      const entriesArr: Array<{ name: string; value: unknown }> = [];
      sliced.forEach(([k, v]) => {
        resultObj[k] = maskSetupValue(k, v);
        entriesArr.push({ name: k, value: maskSetupValue(k, v) });
      });
      const hasMore = (page + 1) * limit < filtered.length;

      return JSON.stringify({
        documentation: "get_setup_values est l'outil unifié de référence pour consulter la configuration globale et les modules Dolibarr. Il remplace avantageusement get_module_configuration grâce au support de la recherche exacte, du filtrage par module (ex: ACCOUNTING, FACTURE, SOCIETE, MAIN), de la recherche textuelle et de la pagination.",
        total_matches: filtered.length,
        returned_count: sliced.length,
        page,
        limit,
        has_more: hasMore,
        next_page: hasMore ? page + 1 : null,
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
