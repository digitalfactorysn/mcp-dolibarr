import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DolibarrAPI } from "../api.js";

const DOLIBARR = "https://gestion.digitalfactory.sn";

export const accountingConfigTools: Tool[] = [
  { name: "get_accounting_config",        description: "Lire toute la configuration comptabilité: comptes par défaut, mode TVA, plan comptable, numérotation, export.", inputSchema: { type: "object", properties: {} } },
  { name: "set_accounting_account_mapping",description: "Configurer les comptes comptables par défaut (411 clients, 4431 TVA collectée, 706 services...)", inputSchema: { type: "object", properties: { account_type: { type: "string", description: "Type: customer|supplier|vat_sold|vat_buy|service_sold|service_buy|product_sold|product_buy|discount_granted|discount_received|suspense|customer_deposit|supplier_deposit" }, account_number: { type: "string", description: "Numéro de compte SYSCOHADA" } }, required: ["account_type", "account_number"] } },
  { name: "configure_vat_mode",           description: "Configurer le mode de TVA (débits/encaissements) pour ventes et achats de produits et services.", inputSchema: { type: "object", properties: { sell_product: { type: "string", enum: ["invoice","payment"] }, buy_product: { type: "string", enum: ["invoice","payment"] }, sell_service: { type: "string", enum: ["invoice","payment"] }, buy_service: { type: "string", enum: ["invoice","payment"] } } } },
  { name: "configure_fiscal_year",        description: "Configurer le mois de début de l'exercice fiscal (1=janvier, 7=juillet...).", inputSchema: { type: "object", properties: { start_month: { type: "number", description: "Mois de début (1-12)" } }, required: ["start_month"] } },
  { name: "configure_invoice_numbering",  description: "Configurer le modèle de numérotation des factures et le template PDF.", inputSchema: { type: "object", properties: { model: { type: "string", description: "Modèle: terre|himalaya|mars" }, pdf_model: { type: "string" }, show_rib: { type: "number", enum: [0,1] } } } },
  { name: "configure_accounting_export",  description: "Configurer l'export comptable: format, séparateur, modèle (FEC, Sage, Cegid...).", inputSchema: { type: "object", properties: { format: { type: "string" }, separator: { type: "string" }, date_format: { type: "string" }, export_model: { type: "number", description: "1=Sage50c, 2=FEC/DGFiP, 3=Cegid, 4=OpenConcerto" } } } },
  { name: "configure_invoice_options",    description: "Configurer les options de facturation: modification après validation, suppression, récurrentes...", inputSchema: { type: "object", properties: { can_always_be_removed: { type: "number", enum: [0,1] }, can_be_edited: { type: "number", enum: [0,1] }, recurring_auto: { type: "number", enum: [0,1] }, recurring_auto_validate: { type: "number", enum: [0,1] }, deposits_as_payments: { type: "number", enum: [0,1] } } } },
  { name: "configure_accounting_autolettering", description: "Activer/désactiver le lettrage automatique et manuel des écritures comptables.", inputSchema: { type: "object", properties: { enable_lettering: { type: "number", enum: [0,1] }, enable_autolettering: { type: "number", enum: [0,1] } } } },
  { name: "configure_bank_accounting",    description: "Configurer les comptes comptables et journaux associés aux comptes bancaires.", inputSchema: { type: "object", properties: { account_id: { type: "number" }, accounting_number: { type: "string" }, journal_code: { type: "string" } }, required: ["account_id"] } },
  { name: "get_chart_of_accounts",        description: "Obtenir le plan comptable actif et les correspondances de comptes SYSCOHADA configurées.", inputSchema: { type: "object", properties: {} } },
  { name: "initialize_syscohada",         description: "Guide étape par étape pour initialiser le plan comptable SYSCOHADA dans Dolibarr.", inputSchema: { type: "object", properties: {} } },
  { name: "get_accounting_dashboard",     description: "Tableau de bord complet: configuration comptable, soldes bancaires, TVA, état du plan comptable.", inputSchema: { type: "object", properties: {} } },
];

const ACCOUNT_MAP: Record<string, string> = {
  customer: "ACCOUNTING_ACCOUNT_CUSTOMER", supplier: "ACCOUNTING_ACCOUNT_SUPPLIER",
  vat_sold: "ACCOUNTING_VAT_SOLD_ACCOUNT", vat_buy: "ACCOUNTING_VAT_BUY_ACCOUNT", vat_pay: "ACCOUNTING_VAT_PAY_ACCOUNT",
  service_sold: "ACCOUNTING_SERVICE_SOLD_ACCOUNT", service_buy: "ACCOUNTING_SERVICE_BUY_ACCOUNT",
  product_sold: "ACCOUNTING_PRODUCT_SOLD_ACCOUNT", product_buy: "ACCOUNTING_PRODUCT_BUY_ACCOUNT",
  discount_granted: "ACCOUNTING_ACCOUNT_DISCOUNT_GRANTED", discount_received: "ACCOUNTING_ACCOUNT_DISCOUNT_RECEIVED",
  customer_deposit: "ACCOUNTING_ACCOUNT_CUSTOMER_DEPOSIT", supplier_deposit: "ACCOUNTING_ACCOUNT_SUPPLIER_DEPOSIT",
  suspense: "ACCOUNTING_ACCOUNT_SUSPENSE", transfer_cash: "ACCOUNTING_ACCOUNT_TRANSFER_CASH",
  expense_report: "ACCOUNTING_ACCOUNT_EXPENSEREPORT",
  salaries_charge: "SALARIES_ACCOUNTING_ACCOUNT_CHARGE", salaries_payment: "SALARIES_ACCOUNTING_ACCOUNT_PAYMENT",
};

function configUrl(path: string): string { return `${DOLIBARR}${path}`; }

export async function handleAccountingConfigTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  const conf = await api.get<Record<string, unknown>>("/setup/conf");

  switch (name) {

    case "get_accounting_config": {
      return JSON.stringify({
        plan_comptable: { id: conf["CHARTOFACCOUNTS"], exercice_debut_mois: conf["SOCIETE_FISCAL_MONTH_START"], option_tva: conf["FACTURE_TVAOPTION"], numero_tva: conf["MAIN_INFO_TVAINTRA"] },
        comptes_defaut: {
          "411 Clients":           conf["ACCOUNTING_ACCOUNT_CUSTOMER"],
          "401 Fournisseurs":      conf["ACCOUNTING_ACCOUNT_SUPPLIER"],
          "4431 TVA collectée":    conf["ACCOUNTING_VAT_SOLD_ACCOUNT"],
          "4452 TVA déductible":   conf["ACCOUNTING_VAT_BUY_ACCOUNT"],
          "4441 TVA à payer":      conf["ACCOUNTING_VAT_PAY_ACCOUNT"],
          "706 Ventes services":   conf["ACCOUNTING_SERVICE_SOLD_ACCOUNT"],
          "604 Achats services":   conf["ACCOUNTING_SERVICE_BUY_ACCOUNT"],
          "701 Ventes produits":   conf["ACCOUNTING_PRODUCT_SOLD_ACCOUNT"],
          "601 Achats produits":   conf["ACCOUNTING_PRODUCT_BUY_ACCOUNT"],
          "673 Remises accordées": conf["ACCOUNTING_ACCOUNT_DISCOUNT_GRANTED"],
          "773 Remises obtenues":  conf["ACCOUNTING_ACCOUNT_DISCOUNT_RECEIVED"],
          "4191 Acomptes clients": conf["ACCOUNTING_ACCOUNT_CUSTOMER_DEPOSIT"],
          "4091 Acomptes fourn.":  conf["ACCOUNTING_ACCOUNT_SUPPLIER_DEPOSIT"],
          "471 Compte attente":    conf["ACCOUNTING_ACCOUNT_SUSPENSE"],
          "58 Virement interne":   conf["ACCOUNTING_ACCOUNT_TRANSFER_CASH"],
        },
        mode_tva: { ventes_produits: conf["TAX_MODE_SELL_PRODUCT"], achats_produits: conf["TAX_MODE_BUY_PRODUCT"], ventes_services: conf["TAX_MODE_SELL_SERVICE"], achats_services: conf["TAX_MODE_BUY_SERVICE"] },
        facturation: { numerotation: conf["FACTURE_ADDON"], template_pdf: conf["FACTURE_ADDON_PDF"], modification_post_valid: conf["INVOICE_CAN_BE_EDITED"], suppression: conf["INVOICE_CAN_ALWAYS_BE_REMOVED"], recurrentes_auto: conf["INVOICE_RECURRING_CREATE_AUTOMATICALLY"] },
        export: { format: conf["ACCOUNTING_EXPORT_FORMAT"], separateur: conf["ACCOUNTING_EXPORT_SEPARATORCSV"], date: conf["ACCOUNTING_EXPORT_DATE"], modele: conf["ACCOUNTING_EXPORT_MODELCSV"], lettrage_auto: conf["ACCOUNTING_ENABLE_AUTOLETTERING"] },
        url_configuration: configUrl("/admin/conf.php"),
      }, null, 2);
    }

    case "set_accounting_account_mapping": {
      const constName = ACCOUNT_MAP[args.account_type as string];
      if (!constName) return `❌ Type inconnu: ${args.account_type}. Types: ${Object.keys(ACCOUNT_MAP).join(", ")}`;
      const current = conf[constName];
      return JSON.stringify({
        type: args.account_type, constante: constName,
        valeur_actuelle: current, valeur_souhaitee: args.account_number,
        action_requise: current === args.account_number ? "✅ Déjà configuré" : `⚙️  Modifier dans Dolibarr`,
        url: configUrl("/admin/accountancy_CWI.php"),
        instructions: [
          `1. Aller sur ${configUrl("/admin/accountancy_CWI.php")}`,
          `2. Trouver "${args.account_type.toString().toUpperCase()}"`,
          `3. Changer de "${current}" à "${args.account_number}"`,
          `4. Enregistrer`,
        ],
        note: "L'API Dolibarr REST ne supporte pas la modification directe de /setup/conf. Utilisez l'interface web.",
      }, null, 2);
    }

    case "configure_vat_mode": {
      const current = { sell_product: conf["TAX_MODE_SELL_PRODUCT"], buy_product: conf["TAX_MODE_BUY_PRODUCT"], sell_service: conf["TAX_MODE_SELL_SERVICE"], buy_service: conf["TAX_MODE_BUY_SERVICE"] };
      const desired: Record<string,unknown> = {};
      if (args.sell_product !== undefined) desired["TAX_MODE_SELL_PRODUCT"] = args.sell_product;
      if (args.buy_product  !== undefined) desired["TAX_MODE_BUY_PRODUCT"]  = args.buy_product;
      if (args.sell_service !== undefined) desired["TAX_MODE_SELL_SERVICE"]  = args.sell_service;
      if (args.buy_service  !== undefined) desired["TAX_MODE_BUY_SERVICE"]   = args.buy_service;
      return JSON.stringify({
        titre: "Configuration Mode TVA",
        valeurs_actuelles: current, valeurs_souhaitees: desired,
        url: configUrl("/admin/tax.php"),
        instructions: [`1. Aller sur ${configUrl("/admin/tax.php")}`, "2. Modifier les modes souhaités (Sur les débits/Sur les encaissements)", "3. Enregistrer"],
        note: "invoice=Sur les débits (facturation), payment=Sur les encaissements",
      }, null, 2);
    }

    case "configure_fiscal_year": {
      const month = Number(args.start_month);
      const months = ["","Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
      return JSON.stringify({
        titre: "Configuration Exercice Fiscal",
        valeur_actuelle: `Mois ${conf["SOCIETE_FISCAL_MONTH_START"]} (${months[Number(conf["SOCIETE_FISCAL_MONTH_START"]||1)]})`,
        valeur_souhaitee: `Mois ${month} (${months[month]})`,
        url: configUrl("/admin/societe.php"),
        instructions: [`1. Aller sur ${configUrl("/admin/societe.php")}`, `2. Section "Comptabilité"`, `3. "Mois de début exercice fiscal" → ${months[month]}`, "4. Enregistrer"],
      }, null, 2);
    }

    case "configure_invoice_numbering": {
      return JSON.stringify({
        titre: "Configuration Numérotation Factures",
        valeurs_actuelles: { numerotation: conf["FACTURE_ADDON"], pdf: conf["FACTURE_ADDON_PDF"] },
        valeurs_souhaitees: { model: args.model, pdf_model: args.pdf_model, show_rib: args.show_rib },
        url: configUrl("/admin/facture.php"),
        instructions: [`1. Aller sur ${configUrl("/admin/facture.php")}`, "2. Sélectionner le modèle de numérotation", "3. Sélectionner le template PDF", "4. Enregistrer"],
        modeles_disponibles: { "mod_facture_terre": "FA{yy}{mm}-{####}", "mod_facture_himalaya": "FA-{####}", "mod_facture_mars": "{yyyy}-{####}" },
      }, null, 2);
    }

    case "configure_accounting_export": {
      const exportModels: Record<string,string> = {"1":"Sage50c","2":"FEC/DGFiP","3":"Cegid","4":"OpenConcerto","5":"WinBooks","6":"Coala"};
      return JSON.stringify({
        titre: "Configuration Export Comptable",
        valeurs_actuelles: { format: conf["ACCOUNTING_EXPORT_FORMAT"], separateur: conf["ACCOUNTING_EXPORT_SEPARATORCSV"], date: conf["ACCOUNTING_EXPORT_DATE"], modele: `${conf["ACCOUNTING_EXPORT_MODELCSV"]} (${exportModels[String(conf["ACCOUNTING_EXPORT_MODELCSV"])]||"?"})` },
        valeurs_souhaitees: args,
        url: configUrl("/admin/accounting.php"),
        instructions: [`1. Aller sur ${configUrl("/admin/accounting.php")}`, "2. Section 'Export comptable'", "3. Modifier format, séparateur, modèle", "4. Enregistrer"],
        modeles: exportModels,
      }, null, 2);
    }

    case "configure_invoice_options": {
      return JSON.stringify({
        titre: "Options de Facturation",
        valeurs_actuelles: {
          modification_post_valid: conf["INVOICE_CAN_BE_EDITED"],
          suppression: conf["INVOICE_CAN_ALWAYS_BE_REMOVED"],
          recurrentes_auto: conf["INVOICE_RECURRING_CREATE_AUTOMATICALLY"],
          recurrentes_auto_valid: conf["INVOICE_RECURRING_AUTO_VALIDATE"],
          acomptes_comme_paiements: conf["FACTURE_DEPOSITS_ARE_JUST_PAYMENTS"],
        },
        valeurs_souhaitees: args,
        url: configUrl("/admin/facture.php"),
        instructions: [`1. Aller sur ${configUrl("/admin/facture.php")}`, "2. Modifier les options souhaitées", "3. Enregistrer"],
      }, null, 2);
    }

    case "configure_accounting_autolettering": {
      return JSON.stringify({
        titre: "Configuration Lettrage Comptable",
        valeurs_actuelles: { lettrage_manuel: conf["ACCOUNTING_ENABLE_LETTERING"], lettrage_auto: conf["ACCOUNTING_ENABLE_AUTOLETTERING"] },
        valeurs_souhaitees: { lettrage_manuel: args.enable_lettering, lettrage_auto: args.enable_autolettering },
        url: configUrl("/admin/accounting.php"),
        instructions: [`1. Aller sur ${configUrl("/admin/accounting.php")}`, "2. Section 'Lettrage'", "3. Activer/désactiver", "4. Enregistrer"],
        note: "Le lettrage associe automatiquement les écritures de débit et crédit sur un même compte.",
      }, null, 2);
    }

    case "configure_bank_accounting": {
      const bank = await api.get<Record<string,unknown>>(`/bankaccounts/${args.account_id}`);
      return JSON.stringify({
        titre: `Configuration Comptable — Compte Bancaire #${args.account_id}`,
        banque: { ref: bank.ref, iban: bank.iban, solde: bank.balance },
        config_actuelle: { compte_comptable: bank.account_number, journal: bank.accountancy_journal, code_journal: bank.fk_accountancy_journal },
        valeurs_souhaitees: { accounting_number: args.accounting_number, journal_code: args.journal_code },
        url: configUrl(`/compta/bank/card.php?id=${args.account_id}&action=edit`),
        instructions: [`1. Aller sur ${configUrl(`/compta/bank/card.php?id=${args.account_id}&action=edit`)}`, "2. Modifier 'Compte comptable' et 'Journal bancaire'", "3. Enregistrer"],
      }, null, 2);
    }

    case "get_chart_of_accounts": {
      return JSON.stringify({
        chartofaccounts_id: conf["CHARTOFACCOUNTS"],
        description: "SYSCOHADA révisé (ID: 27) — configuré mais plan comptable non initialisé",
        comptes_configures: {
          "411": conf["ACCOUNTING_ACCOUNT_CUSTOMER"], "401": conf["ACCOUNTING_ACCOUNT_SUPPLIER"],
          "521": "ECOBANK", "706": conf["ACCOUNTING_SERVICE_SOLD_ACCOUNT"],
          "701": conf["ACCOUNTING_PRODUCT_SOLD_ACCOUNT"], "601": conf["ACCOUNTING_PRODUCT_BUY_ACCOUNT"],
          "604": conf["ACCOUNTING_SERVICE_BUY_ACCOUNT"], "4431": conf["ACCOUNTING_VAT_SOLD_ACCOUNT"],
          "4452": conf["ACCOUNTING_VAT_BUY_ACCOUNT"], "4441": conf["ACCOUNTING_VAT_PAY_ACCOUNT"],
          "4191": conf["ACCOUNTING_ACCOUNT_CUSTOMER_DEPOSIT"], "4091": conf["ACCOUNTING_ACCOUNT_SUPPLIER_DEPOSIT"],
          "471": conf["ACCOUNTING_ACCOUNT_SUSPENSE"], "58": conf["ACCOUNTING_ACCOUNT_TRANSFER_CASH"],
        },
        journaux: { VTE: "Ventes", ACH: "Achats", BNQ: "Banque ECOBANK", CAI: "Caisse", OD: "Opérations diverses" },
        classes_syscohada: { "1": "Ressources durables", "2": "Immobilisations", "3": "Stocks", "4": "Tiers (clients/fourn/TVA)", "5": "Trésorerie", "6": "Charges", "7": "Produits", "8": "Comptes spéciaux" },
        initialisation: `Pour activer les écritures: ${configUrl("/admin/accountancy_admin.php")}`,
      }, null, 2);
    }

    case "initialize_syscohada": {
      return JSON.stringify({
        titre: "Guide Initialisation SYSCOHADA",
        etapes: [
          `1. Connectez-vous à Dolibarr: ${DOLIBARR}`,
          `2. Comptabilité → Configuration → ${configUrl("/admin/accountancy_admin.php")}`,
          "3. Cliquer sur 'Charger un plan comptable'",
          "4. Sélectionner: SYSCOHADA (Système Comptable Ouest-Africain révisé)",
          "5. Cliquer sur 'Importer' et confirmer",
          "6. Résultat: list_accounting_accounts et list_accounting_entries seront opérationnels",
        ],
        etat_actuel: { CHARTOFACCOUNTS: conf["CHARTOFACCOUNTS"], status: "Comptes mappés ✅ | Plan comptable non initialisé ⚠️", export_fec: conf["MAIN_MODULE_ACCOUNTINGEXPORT"] === "1" ? "✅ Activé" : "❌ Désactivé" },
        comptes_deja_mappes: "Les comptes 411, 401, 706, 4431, 4452 etc. sont déjà configurés. L'initialisation active les écritures automatiques.",
      }, null, 2);
    }

    case "get_accounting_dashboard": {
      const banks = await api.get<unknown[]>("/bankaccounts", { status: 1 });
      const bankArr = Array.isArray(banks) ? banks as Record<string,unknown>[] : [];
      return JSON.stringify({
        titre: "Tableau de Bord Comptable — Digital Factory",
        identite: { nom: "DIGITAL FACTORY", ninea: conf["MAIN_INFO_TVAINTRA"], devise: "XOF (FCFA)", url: DOLIBARR },
        plan_comptable: { systeme: `SYSCOHADA (ID: ${conf["CHARTOFACCOUNTS"]})`, status: "⚠️ Non initialisé — voir initialize_syscohada", exercice: `Démarre mois ${conf["SOCIETE_FISCAL_MONTH_START"]}` },
        tva: { mode_ventes_produits: conf["TAX_MODE_SELL_PRODUCT"], mode_achats_services: conf["TAX_MODE_BUY_SERVICE"], compte_collectee: conf["ACCOUNTING_VAT_SOLD_ACCOUNT"], compte_deductible: conf["ACCOUNTING_VAT_BUY_ACCOUNT"] },
        tresorerie: { banques: bankArr.map(b => ({ ref: b["ref"], solde_FCFA: b["balance"] })), total_FCFA: bankArr.reduce((s, b) => s + Number(b["balance"]||0), 0).toFixed(2) },
        facturation: { numerotation: conf["FACTURE_ADDON"], template: conf["FACTURE_ADDON_PDF"] },
        export_comptable: { format: `${conf["ACCOUNTING_EXPORT_FORMAT"]} | Modèle: ${conf["ACCOUNTING_EXPORT_MODELCSV"]}`, lettrage_auto: conf["ACCOUNTING_ENABLE_AUTOLETTERING"] === "1" ? "✅ Activé" : "❌ Désactivé" },
        actions_requises: ["⚠️  Initialiser SYSCOHADA: voir initialize_syscohada"],
        liens_admin: {
          config_generale: configUrl("/admin/accounting.php"),
          plan_comptable: configUrl("/admin/accountancy_admin.php"),
          comptes_defaut: configUrl("/admin/accountancy_CWI.php"),
          facturation: configUrl("/admin/facture.php"),
          tva: configUrl("/admin/tax.php"),
        },
      }, null, 2);
    }

    default:
      throw new Error(`Outil config comptabilité inconnu: ${name}`);
  }
}
