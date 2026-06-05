import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DolibarrAPI } from "../api.js";

export const accountingConfigTools: Tool[] = [
  // ── CONFIGURATION GÉNÉRALE COMPTABILITÉ ──────────────────────────
  {
    name: 'get_accounting_config',
    description: "Lire toute la configuration comptabilité de Dolibarr: comptes par défaut (clients, fournisseurs, TVA, banque...), mode TVA, plan comptable, numérotation, export.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'set_accounting_account_mapping',
    description: "Configurer les comptes comptables par défaut (ex: compte client 411, TVA collectée 4431, ventes services 706...)",
    inputSchema: {
      type: 'object',
      properties: {
        account_type: { type: 'string', description: "Type: 'customer' (411), 'supplier' (401), 'bank' (521), 'vat_sold' (4431), 'vat_buy' (4452), 'service_sold' (706), 'service_buy' (604), 'product_sold' (701), 'product_buy' (601), 'discount_granted' (673), 'discount_received' (773), 'customer_deposit' (4191), 'supplier_deposit' (4091), 'suspense' (471), 'transfer_cash' (58)" },
        account_number: { type: 'string', description: "Numéro de compte SYSCOHADA (ex: '411000', '4431')" },
      },
      required: ['account_type', 'account_number'],
    },
  },
  {
    name: 'configure_vat_mode',
    description: "Configurer le mode de TVA: sur les débits (invoice) ou sur les encaissements (payment), pour les ventes et achats de produits et services.",
    inputSchema: {
      type: 'object',
      properties: {
        sell_product:    { type: 'string', enum: ['invoice', 'payment'], description: "TVA ventes produits" },
        buy_product:     { type: 'string', enum: ['invoice', 'payment'], description: "TVA achats produits" },
        sell_service:    { type: 'string', enum: ['invoice', 'payment'], description: "TVA ventes services" },
        buy_service:     { type: 'string', enum: ['invoice', 'payment'], description: "TVA achats services" },
      },
    },
  },
  {
    name: 'configure_fiscal_year',
    description: "Configurer l'exercice fiscal: mois de début (1=janvier, 7=juillet...) et clôture annuelle.",
    inputSchema: {
      type: 'object',
      properties: {
        start_month: { type: 'number', description: "Mois de début de l'exercice (1-12, ex: 1 pour janvier)" },
      },
      required: ['start_month'],
    },
  },
  {
    name: 'configure_invoice_numbering',
    description: "Configurer le modèle de numérotation des factures (ex: terre, himalaya, mars) et l'affichage des RIB/chèques sur les factures.",
    inputSchema: {
      type: 'object',
      properties: {
        model:      { type: 'string', description: "Modèle: 'terre' (FA{yy}{mm}-{####}), 'himalaya', 'mars'. Actuel: terre" },
        pdf_model:  { type: 'string', description: "Template PDF: 'ultimate_invoice', 'homard', 'crabe'" },
        show_rib:   { type: 'number', enum: [0, 1], description: "1=Afficher RIB sur facture, 0=Non" },
      },
    },
  },
  {
    name: 'configure_accounting_export',
    description: "Configurer l'export comptable: format (csv, txt), séparateur, format de date, modèle d'export (SAGE, FEC, CEGID...).",
    inputSchema: {
      type: 'object',
      properties: {
        format:    { type: 'string', enum: ['csv', 'txt'], description: "Format d'export" },
        separator: { type: 'string', description: "Séparateur CSV (ex: ',' ou ';')" },
        date_format: { type: 'string', description: "Format de date (ex: '%d%m%Y', '%Y-%m-%d')" },
        export_model: { type: 'number', description: "Modèle: 1=Sage50c, 2=FEC/DGFiP, 3=Cegid, 4=OpenConcerto, 5=WinBooks, 6=Coala..." },
      },
    },
  },
  {
    name: 'configure_invoice_options',
    description: "Configurer les options de facturation: permettre suppression, modification après validation, factures récurrentes automatiques...",
    inputSchema: {
      type: 'object',
      properties: {
        can_always_be_removed:      { type: 'number', enum: [0,1], description: "1=Permettre suppression facture validée" },
        can_be_edited:              { type: 'number', enum: [0,1], description: "1=Permettre modification après validation" },
        allow_date_before_validation: { type: 'number', enum: [0,1], description: "1=Permettre date antérieure à la validation" },
        recurring_auto:             { type: 'number', enum: [0,1], description: "1=Créer factures récurrentes automatiquement" },
        recurring_auto_validate:    { type: 'number', enum: [0,1], description: "1=Valider automatiquement les factures récurrentes" },
        deposits_as_payments:       { type: 'number', enum: [0,1], description: "1=Traiter acomptes comme des paiements" },
      },
    },
  },
  {
    name: 'configure_accounting_autolettering',
    description: "Activer/désactiver le lettrage automatique et manuel des écritures comptables.",
    inputSchema: {
      type: 'object',
      properties: {
        enable_lettering:     { type: 'number', enum: [0,1], description: "1=Activer lettrage manuel" },
        enable_autolettering: { type: 'number', enum: [0,1], description: "1=Activer lettrage automatique" },
      },
    },
  },
  {
    name: 'configure_bank_accounting',
    description: "Configurer les comptes comptables associés aux comptes bancaires et les codes journaux.",
    inputSchema: {
      type: 'object',
      properties: {
        account_id:          { type: 'number', description: "ID du compte bancaire" },
        accounting_number:   { type: 'string', description: "Numéro de compte comptable (ex: '521')" },
        journal_code:        { type: 'string', description: "Code du journal bancaire (ex: 'BNQ', 'BQ')" },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'get_chart_of_accounts',
    description: "Obtenir le plan comptable actif (SYSCOHADA, PCG...) et les correspondances comptes SYSCOHADA pour Digital Factory.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'initialize_syscohada',
    description: "Guide pour initialiser le plan comptable SYSCOHADA dans Dolibarr (actuellement non initialisé). Retourne les instructions et la configuration à appliquer.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'configure_payment_terms',
    description: "Lister et configurer les conditions de paiement disponibles pour les factures.",
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'get_default'], description: "list=lister, get_default=voir le délai par défaut" },
      },
    },
  },
  {
    name: 'get_accounting_dashboard',
    description: "Tableau de bord complet de la configuration comptable: plan de comptes actif, mode TVA, comptes par défaut, état du lettrage, config export.",
    inputSchema: { type: 'object', properties: {} },
  },
];

// Map account_type -> constant name
const ACCOUNT_MAP: Record<string, string> = {
  customer:          'ACCOUNTING_ACCOUNT_CUSTOMER',
  supplier:          'ACCOUNTING_ACCOUNT_SUPPLIER',
  bank:              'ACCOUNTING_ACCOUNT_TRANSFER_CASH',
  vat_sold:          'ACCOUNTING_VAT_SOLD_ACCOUNT',
  vat_buy:           'ACCOUNTING_VAT_BUY_ACCOUNT',
  vat_pay:           'ACCOUNTING_VAT_PAY_ACCOUNT',
  service_sold:      'ACCOUNTING_SERVICE_SOLD_ACCOUNT',
  service_buy:       'ACCOUNTING_SERVICE_BUY_ACCOUNT',
  product_sold:      'ACCOUNTING_PRODUCT_SOLD_ACCOUNT',
  product_buy:       'ACCOUNTING_PRODUCT_BUY_ACCOUNT',
  discount_granted:  'ACCOUNTING_ACCOUNT_DISCOUNT_GRANTED',
  discount_received: 'ACCOUNTING_ACCOUNT_DISCOUNT_RECEIVED',
  customer_deposit:  'ACCOUNTING_ACCOUNT_CUSTOMER_DEPOSIT',
  supplier_deposit:  'ACCOUNTING_ACCOUNT_SUPPLIER_DEPOSIT',
  suspense:          'ACCOUNTING_ACCOUNT_SUSPENSE',
  transfer_cash:     'ACCOUNTING_ACCOUNT_TRANSFER_CASH',
  expense_report:    'ACCOUNTING_ACCOUNT_EXPENSEREPORT',
  salaries_charge:   'SALARIES_ACCOUNTING_ACCOUNT_CHARGE',
  salaries_payment:  'SALARIES_ACCOUNTING_ACCOUNT_PAYMENT',
};

export async function handleAccountingConfigTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {

    case 'get_accounting_config': {
      const conf = await api.get<Record<string, unknown>>('/setup/conf');
      const accountingKeys = [
        'ACCOUNTING_ACCOUNT_CUSTOMER', 'ACCOUNTING_ACCOUNT_SUPPLIER',
        'ACCOUNTING_VAT_SOLD_ACCOUNT', 'ACCOUNTING_VAT_BUY_ACCOUNT', 'ACCOUNTING_VAT_PAY_ACCOUNT',
        'ACCOUNTING_SERVICE_SOLD_ACCOUNT', 'ACCOUNTING_SERVICE_BUY_ACCOUNT',
        'ACCOUNTING_PRODUCT_SOLD_ACCOUNT', 'ACCOUNTING_PRODUCT_BUY_ACCOUNT',
        'ACCOUNTING_ACCOUNT_DISCOUNT_GRANTED', 'ACCOUNTING_ACCOUNT_DISCOUNT_RECEIVED',
        'ACCOUNTING_ACCOUNT_CUSTOMER_DEPOSIT', 'ACCOUNTING_ACCOUNT_SUPPLIER_DEPOSIT',
        'ACCOUNTING_ACCOUNT_SUSPENSE', 'ACCOUNTING_ACCOUNT_TRANSFER_CASH',
        'ACCOUNTING_ACCOUNT_EXPENSEREPORT', 'SALARIES_ACCOUNTING_ACCOUNT_CHARGE',
        'SALARIES_ACCOUNTING_ACCOUNT_PAYMENT', 'DONATION_ACCOUNTINGACCOUNT',
        'TAX_MODE', 'TAX_MODE_SELL_PRODUCT', 'TAX_MODE_BUY_PRODUCT',
        'TAX_MODE_SELL_SERVICE', 'TAX_MODE_BUY_SERVICE',
        'CHARTOFACCOUNTS', 'SOCIETE_FISCAL_MONTH_START', 'FACTURE_TVAOPTION',
        'FACTURE_ADDON', 'FACTURE_ADDON_PDF',
        'ACCOUNTING_EXPORT_FORMAT', 'ACCOUNTING_EXPORT_SEPARATORCSV',
        'ACCOUNTING_EXPORT_DATE', 'ACCOUNTING_EXPORT_MODELCSV',
        'ACCOUNTING_ENABLE_LETTERING', 'ACCOUNTING_ENABLE_AUTOLETTERING',
        'ACCOUNTING_REEXPORT', 'ACCOUNTING_LIST_SORT_VENTILATION_DONE',
        'MAIN_BANK_ACCOUNTANCY_CODE_ALWAYS_REQUIRED',
        'INVOICE_CAN_ALWAYS_BE_REMOVED', 'INVOICE_CAN_BE_EDITED',
        'INVOICE_RECURRING_CREATE_AUTOMATICALLY', 'INVOICE_RECURRING_AUTO_VALIDATE',
        'FACTURE_DEPOSITS_ARE_JUST_PAYMENTS', 'MAIN_INFO_TVAINTRA',
      ];
      const config: Record<string, unknown> = {};
      for (const k of accountingKeys) {
        if (conf[k] !== undefined) config[k] = conf[k];
      }
      return JSON.stringify({
        plan_comptable: {
          CHARTOFACCOUNTS: config['CHARTOFACCOUNTS'],
          exercice_fiscal_debut: `Mois ${config['SOCIETE_FISCAL_MONTH_START']}`,
          option_tva: config['FACTURE_TVAOPTION'],
          numero_tva: config['MAIN_INFO_TVAINTRA'],
        },
        comptes_par_defaut: {
          clients_411:              config['ACCOUNTING_ACCOUNT_CUSTOMER'],
          fournisseurs_401:         config['ACCOUNTING_ACCOUNT_SUPPLIER'],
          tva_collectee_4431:       config['ACCOUNTING_VAT_SOLD_ACCOUNT'],
          tva_deductible_4452:      config['ACCOUNTING_VAT_BUY_ACCOUNT'],
          tva_a_payer_4441:         config['ACCOUNTING_VAT_PAY_ACCOUNT'],
          ventes_services_706:      config['ACCOUNTING_SERVICE_SOLD_ACCOUNT'],
          achats_services_604:      config['ACCOUNTING_SERVICE_BUY_ACCOUNT'],
          ventes_produits_701:      config['ACCOUNTING_PRODUCT_SOLD_ACCOUNT'],
          achats_produits_601:      config['ACCOUNTING_PRODUCT_BUY_ACCOUNT'],
          remises_accordees_673:    config['ACCOUNTING_ACCOUNT_DISCOUNT_GRANTED'],
          remises_obtenues_773:     config['ACCOUNTING_ACCOUNT_DISCOUNT_RECEIVED'],
          acomptes_clients_4191:    config['ACCOUNTING_ACCOUNT_CUSTOMER_DEPOSIT'],
          acomptes_fourn_4091:      config['ACCOUNTING_ACCOUNT_SUPPLIER_DEPOSIT'],
          compte_attente_471:       config['ACCOUNTING_ACCOUNT_SUSPENSE'],
          virement_interne_58:      config['ACCOUNTING_ACCOUNT_TRANSFER_CASH'],
          notes_frais_6181:         config['ACCOUNTING_ACCOUNT_EXPENSEREPORT'],
          salaires_6411:            config['ACCOUNTING_ACCOUNT_EXPENSEREPORT'],
        },
        mode_tva: {
          global:           config['TAX_MODE'] === '1' ? 'encaissements' : 'debits',
          ventes_produits:  config['TAX_MODE_SELL_PRODUCT'],
          achats_produits:  config['TAX_MODE_BUY_PRODUCT'],
          ventes_services:  config['TAX_MODE_SELL_SERVICE'],
          achats_services:  config['TAX_MODE_BUY_SERVICE'],
        },
        facturation: {
          modele_numerotation:     config['FACTURE_ADDON'],
          template_pdf:            config['FACTURE_ADDON_PDF'],
          modification_apres_valid: config['INVOICE_CAN_BE_EDITED'],
          suppression_autorisee:    config['INVOICE_CAN_ALWAYS_BE_REMOVED'],
          factures_recurrentes_auto: config['INVOICE_RECURRING_CREATE_AUTOMATICALLY'],
          acomptes_comme_paiements: config['FACTURE_DEPOSITS_ARE_JUST_PAYMENTS'],
        },
        export_comptable: {
          format:          config['ACCOUNTING_EXPORT_FORMAT'],
          separateur:      config['ACCOUNTING_EXPORT_SEPARATORCSV'],
          format_date:     config['ACCOUNTING_EXPORT_DATE'],
          modele:          config['ACCOUNTING_EXPORT_MODELCSV'],
          lettrage_manuel: config['ACCOUNTING_ENABLE_LETTERING'],
          lettrage_auto:   config['ACCOUNTING_ENABLE_AUTOLETTERING'],
        },
        note: 'Plan comptable SYSCOHADA: pour initialiser, utiliser initialize_syscohada',
      }, null, 2);
    }

    case 'set_accounting_account_mapping': {
      const constantName = ACCOUNT_MAP[args.account_type as string];
      if (!constantName) {
        return `❌ Type de compte inconnu: ${args.account_type}. Types valides: ${Object.keys(ACCOUNT_MAP).join(', ')}`;
      }
      await api.post('/setup/conf', { constname: constantName, constvalue: args.account_number });
      return `✅ Compte ${args.account_type} → ${args.account_number} (${constantName})`;
    }

    case 'configure_vat_mode': {
      const updates: Array<{k: string, v: unknown}> = [];
      if (args.sell_product !== undefined) updates.push({ k: 'TAX_MODE_SELL_PRODUCT',  v: args.sell_product });
      if (args.buy_product  !== undefined) updates.push({ k: 'TAX_MODE_BUY_PRODUCT',   v: args.buy_product  });
      if (args.sell_service !== undefined) updates.push({ k: 'TAX_MODE_SELL_SERVICE',   v: args.sell_service });
      if (args.buy_service  !== undefined) updates.push({ k: 'TAX_MODE_BUY_SERVICE',    v: args.buy_service  });
      const results: string[] = [];
      for (const u of updates) {
        await api.post('/setup/conf', { constname: u.k, constvalue: u.v });
        results.push(`${u.k} = ${u.v}`);
      }
      return `✅ Mode TVA configuré:\n${results.join('\n')}`;
    }

    case 'configure_fiscal_year': {
      const month = Number(args.start_month);
      if (month < 1 || month > 12) return '❌ Mois invalide (1-12)';
      await api.post('/setup/conf', { constname: 'SOCIETE_FISCAL_MONTH_START', constvalue: String(month) });
      const monthNames = ['','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
      return `✅ Exercice fiscal: commence en ${monthNames[month]} (mois ${month})`;
    }

    case 'configure_invoice_numbering': {
      const results: string[] = [];
      if (args.model)     { await api.post('/setup/conf', { constname: 'FACTURE_ADDON',     constvalue: `mod_facture_${args.model}` }); results.push(`Modèle: ${args.model}`); }
      if (args.pdf_model) { await api.post('/setup/conf', { constname: 'FACTURE_ADDON_PDF', constvalue: args.pdf_model }); results.push(`PDF: ${args.pdf_model}`); }
      if (args.show_rib !== undefined) { await api.post('/setup/conf', { constname: 'FACTURE_RIB_NUMBER', constvalue: String(args.show_rib) }); results.push(`RIB sur facture: ${args.show_rib ? 'Oui' : 'Non'}`); }
      return results.length > 0 ? `✅ Numérotation configurée:\n${results.join('\n')}` : '⚠️ Aucun paramètre fourni';
    }

    case 'configure_accounting_export': {
      const results: string[] = [];
      const modelLabels: Record<string,string> = {'1':'Sage50c','2':'FEC/DGFiP','3':'Cegid','4':'OpenConcerto','5':'WinBooks','6':'Coala'};
      if (args.format)        { await api.post('/setup/conf', { constname: 'ACCOUNTING_EXPORT_FORMAT',     constvalue: args.format }); results.push(`Format: ${args.format}`); }
      if (args.separator)     { await api.post('/setup/conf', { constname: 'ACCOUNTING_EXPORT_SEPARATORCSV', constvalue: args.separator }); results.push(`Séparateur: ${args.separator}`); }
      if (args.date_format)   { await api.post('/setup/conf', { constname: 'ACCOUNTING_EXPORT_DATE',       constvalue: args.date_format }); results.push(`Date: ${args.date_format}`); }
      if (args.export_model)  { await api.post('/setup/conf', { constname: 'ACCOUNTING_EXPORT_MODELCSV',   constvalue: String(args.export_model) }); results.push(`Modèle: ${modelLabels[String(args.export_model)] || args.export_model}`); }
      return results.length > 0 ? `✅ Export comptable configuré:\n${results.join('\n')}` : '⚠️ Aucun paramètre fourni';
    }

    case 'configure_invoice_options': {
      const mappings: Record<string, string> = {
        can_always_be_removed:        'INVOICE_CAN_ALWAYS_BE_REMOVED',
        can_be_edited:                'INVOICE_CAN_BE_EDITED',
        allow_date_before_validation: 'INVOICE_ALLOW_DATE_BEFORE_VALIDATION',
        recurring_auto:               'INVOICE_RECURRING_CREATE_AUTOMATICALLY',
        recurring_auto_validate:      'INVOICE_RECURRING_AUTO_VALIDATE',
        deposits_as_payments:         'FACTURE_DEPOSITS_ARE_JUST_PAYMENTS',
      };
      const results: string[] = [];
      for (const [argKey, constName] of Object.entries(mappings)) {
        if (args[argKey] !== undefined) {
          await api.post('/setup/conf', { constname: constName, constvalue: String(args[argKey]) });
          results.push(`${argKey}: ${args[argKey]}`);
        }
      }
      return results.length > 0 ? `✅ Options facturation:\n${results.join('\n')}` : '⚠️ Aucun paramètre fourni';
    }

    case 'configure_accounting_autolettering': {
      const results: string[] = [];
      if (args.enable_lettering !== undefined) {
        await api.post('/setup/conf', { constname: 'ACCOUNTING_ENABLE_LETTERING', constvalue: String(args.enable_lettering) });
        results.push(`Lettrage manuel: ${args.enable_lettering ? 'Activé' : 'Désactivé'}`);
      }
      if (args.enable_autolettering !== undefined) {
        await api.post('/setup/conf', { constname: 'ACCOUNTING_ENABLE_AUTOLETTERING', constvalue: String(args.enable_autolettering) });
        results.push(`Lettrage auto: ${args.enable_autolettering ? 'Activé' : 'Désactivé'}`);
      }
      return results.length > 0 ? `✅ Lettrage:\n${results.join('\n')}` : '⚠️ Aucun paramètre fourni';
    }

    case 'configure_bank_accounting': {
      const accountId = args.account_id;
      const results: string[] = [];
      if (args.accounting_number) {
        const acc = await api.get<Record<string,unknown>>(`/bankaccounts/${accountId}`);
        const updated = { ...acc, account_number: args.accounting_number };
        await api.put(`/bankaccounts/${accountId}`, updated);
        results.push(`Compte comptable: ${args.accounting_number}`);
      }
      if (args.journal_code) {
        results.push(`⚠️ Code journal: configurez ${args.journal_code} dans Dolibarr → Banque → Compte → Modifier`);
      }
      return results.length > 0 ? `✅ Banque #${accountId}:\n${results.join('\n')}` : '⚠️ Aucun paramètre fourni';
    }

    case 'get_chart_of_accounts': {
      const conf = await api.get<Record<string, unknown>>('/setup/conf');
      return JSON.stringify({
        chartofaccounts_id: conf['CHARTOFACCOUNTS'],
        description: "Dolibarr utilise CHARTOFACCOUNTS=27 (SYSCOHADA révisé)",
        status: "Plan comptable SYSCOHADA non initialisé (écritures non disponibles)",
        action_requise: "Dolibarr → Comptabilité → Configuration → Charger plan comptable → Sélectionner SYSCOHADA",
        comptes_configures: {
          "411": conf['ACCOUNTING_ACCOUNT_CUSTOMER'],
          "401": conf['ACCOUNTING_ACCOUNT_SUPPLIER'],
          "521": "ECOBANK (IBAN SN09101012153001)",
          "706": conf['ACCOUNTING_SERVICE_SOLD_ACCOUNT'],
          "701": conf['ACCOUNTING_PRODUCT_SOLD_ACCOUNT'],
          "601": conf['ACCOUNTING_PRODUCT_BUY_ACCOUNT'],
          "604": conf['ACCOUNTING_SERVICE_BUY_ACCOUNT'],
          "4431": conf['ACCOUNTING_VAT_SOLD_ACCOUNT'],
          "4452": conf['ACCOUNTING_VAT_BUY_ACCOUNT'],
          "4441": conf['ACCOUNTING_VAT_PAY_ACCOUNT'],
        },
        journaux_dolibarr: {
          "VTE": "Journal des ventes",
          "ACH": "Journal des achats",
          "BNQ": "Journal de banque ECOBANK",
          "CAI": "Journal de caisse",
          "OD":  "Opérations diverses",
        },
        syscohada_classes: {
          "Classe 1": "Ressources durables (capitaux, dettes fin.)",
          "Classe 2": "Actifs immobilisés",
          "Classe 3": "Stocks",
          "Classe 4": "Tiers (clients 411, fourn 401, TVA 44xx)",
          "Classe 5": "Trésorerie (banque 52x, caisse 57x)",
          "Classe 6": "Charges (achats 60x, services 61-65x, finance 67x)",
          "Classe 7": "Produits (ventes 70x, produits fin 77x)",
          "Classe 8": "Comptes spéciaux",
        },
      }, null, 2);
    }

    case 'initialize_syscohada': {
      return JSON.stringify({
        titre: "Initialisation Plan Comptable SYSCOHADA dans Dolibarr",
        etapes: [
          "1. Connectez-vous à Dolibarr: https://gestion.digitalfactory.sn",
          "2. Menu: Comptabilité → Configuration → Plan comptable",
          "3. Cliquez sur 'Charger un plan comptable'",
          "4. Sélectionnez: SYSCOHADA (Système Comptable Ouest-Africain)",
          "5. Cliquez sur 'Importer'",
          "6. Une fois importé, les outils list_accounting_accounts, list_accounting_entries et create_misc_journal_entry deviendront pleinement opérationnels",
        ],
        config_actuelle: {
          CHARTOFACCOUNTS: "27 (SYSCOHADA révisé, configuré mais non initialisé)",
          comptes_mappés: "✅ Tous les comptes principaux sont mappés (411, 401, 706, 4431...)",
          journaux: "✅ VTE, ACH, BNQ, CAI, OD disponibles",
          export_FEC: "✅ Module ACCOUNTINGEXPORT activé",
        },
        note: "Les comptes sont déjà correctement configurés. L'initialisation du plan comptable débloque les écritures comptables automatiques.",
      }, null, 2);
    }

    case 'configure_payment_terms': {
      const action = args.action || 'list';
      if (action === 'list') {
        const data = await api.get('/setup/dictionary/payment_term');
        return JSON.stringify(data, null, 2);
      }
      const conf = await api.get<Record<string,unknown>>('/setup/conf');
      return JSON.stringify({ default_payment_term: conf['PAYMENT_TERM_DEFAULT'] || 'Non défini' }, null, 2);
    }

    case 'get_accounting_dashboard': {
      const conf = await api.get<Record<string,unknown>>('/setup/conf');
      const banks = await api.get<unknown[]>('/bankaccounts', { status: 1 });
      const bankArr = Array.isArray(banks) ? banks as Record<string,unknown>[] : [];
      const totalBalance = bankArr.reduce((s, b) => s + Number(b.balance || 0), 0);

      return JSON.stringify({
        titre: "Tableau de bord comptable — Digital Factory",
        societe: "DIGITAL FACTORY | NINEA: " + conf['MAIN_INFO_TVAINTRA'],
        devise: "XOF (Franc CFA BCEAO)",
        plan_comptable: "SYSCOHADA (ID: " + conf['CHARTOFACCOUNTS'] + ") — À INITIALISER",
        exercice_fiscal: `Du mois ${conf['SOCIETE_FISCAL_MONTH_START']} au mois ${((Number(conf['SOCIETE_FISCAL_MONTH_START']||1) + 10) % 12) + 1}`,
        tva: {
          mode: conf['TAX_MODE'] === '1' ? 'Sur encaissements' : 'Sur débits (invoice)',
          ventes_services: conf['TAX_MODE_SELL_SERVICE'],
          achats_services: conf['TAX_MODE_BUY_SERVICE'],
          numero_tva: conf['MAIN_INFO_TVAINTRA'],
          compte_collectee: conf['ACCOUNTING_VAT_SOLD_ACCOUNT'],
          compte_deductible: conf['ACCOUNTING_VAT_BUY_ACCOUNT'],
        },
        tresorerie: {
          banques: bankArr.map(b => ({ ref: b.ref, solde_FCFA: b.balance, iban: b.iban })),
          total_FCFA: totalBalance.toFixed(2),
        },
        facturation: {
          numerotation: conf['FACTURE_ADDON'],
          template_pdf: conf['FACTURE_ADDON_PDF'],
          modification_post_validation: conf['INVOICE_CAN_BE_EDITED'] === '1' ? 'Oui' : 'Non',
        },
        export: {
          format: conf['ACCOUNTING_EXPORT_FORMAT'],
          modele: conf['ACCOUNTING_EXPORT_MODELCSV'],
          lettrage_auto: conf['ACCOUNTING_ENABLE_AUTOLETTERING'] === '1' ? 'Activé' : 'Désactivé',
        },
        actions_requises: [
          conf['CHARTOFACCOUNTS'] ? "⚠️  Initialiser plan comptable SYSCOHADA (voir initialize_syscohada)" : null,
        ].filter(Boolean),
      }, null, 2);
    }

    default:
      throw new Error(`Outil config comptabilité inconnu: ${name}`);
  }
}
