import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DolibarrAPI } from "../api.js";

const URL = "https://gestion.digitalfactory.sn";

export const accountingConfigTools: Tool[] = [
  { name: "get_accounting_config", description: "Lire toute la configuration comptabilite: comptes par defaut, mode TVA, plan comptable, numerotation, export.", inputSchema: { type: "object", properties: {} } },
  { name: "get_accounting_dashboard", description: "Tableau de bord complet: configuration comptable, soldes bancaires, TVA.", inputSchema: { type: "object", properties: {} } },
  { name: "get_chart_of_accounts", description: "Obtenir le plan comptable actif et les correspondances SYSCOHADA.", inputSchema: { type: "object", properties: {} } },
  { name: "initialize_syscohada", description: "Guide pour initialiser le plan comptable SYSCOHADA dans Dolibarr.", inputSchema: { type: "object", properties: {} } },
  { name: "configure_vat_mode", description: "Guide pour configurer le mode TVA (debits/encaissements). Fournit les URLs Dolibarr.", inputSchema: { type: "object", properties: { sell_product: { type: "string" }, buy_product: { type: "string" }, sell_service: { type: "string" }, buy_service: { type: "string" } } } },
  { name: "configure_fiscal_year", description: "Guide pour configurer le mois de debut de l'exercice fiscal.", inputSchema: { type: "object", properties: { start_month: { type: "number" } }, required: ["start_month"] } },
  { name: "configure_invoice_numbering", description: "Guide pour configurer la numerotation des factures.", inputSchema: { type: "object", properties: { model: { type: "string" }, pdf_model: { type: "string" }, show_rib: { type: "number" } } } },
  { name: "configure_accounting_export", description: "Guide pour configurer l'export comptable (FEC, Sage, Cegid...).", inputSchema: { type: "object", properties: { format: { type: "string" }, separator: { type: "string" }, date_format: { type: "string" }, export_model: { type: "number" } } } },
  { name: "configure_invoice_options", description: "Guide pour configurer les options de facturation.", inputSchema: { type: "object", properties: { can_always_be_removed: { type: "number" }, can_be_edited: { type: "number" }, recurring_auto: { type: "number" }, deposits_as_payments: { type: "number" } } } },
  { name: "configure_accounting_autolettering", description: "Guide pour activer le lettrage comptable automatique.", inputSchema: { type: "object", properties: { enable_lettering: { type: "number" }, enable_autolettering: { type: "number" } } } },
  { name: "set_accounting_account_mapping", description: "Guide pour configurer les comptes comptables par defaut (411, 4431, 706...).", inputSchema: { type: "object", properties: { account_type: { type: "string" }, account_number: { type: "string" } }, required: ["account_type", "account_number"] } },
  { name: "configure_bank_accounting", description: "Configurer le compte comptable d'un compte bancaire.", inputSchema: { type: "object", properties: { account_id: { type: "number" }, accounting_number: { type: "string" }, journal_code: { type: "string" } }, required: ["account_id"] } },
];

export async function handleAccountingConfigTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {

  if (name === "get_accounting_config" || name === "get_accounting_dashboard" || name === "get_chart_of_accounts") {
    const conf = await api.get<Record<string, unknown>>("/setup/conf");
    const banks = await api.get<unknown[]>("/bankaccounts", { status: 1 });
    const bankArr = Array.isArray(banks) ? (banks as Record<string, unknown>[]) : [];
    if (name === "get_accounting_config") {
      return JSON.stringify({
        comptes_defaut: {
          clients: conf["ACCOUNTING_ACCOUNT_CUSTOMER"], fournisseurs: conf["ACCOUNTING_ACCOUNT_SUPPLIER"],
          tva_collectee: conf["ACCOUNTING_VAT_SOLD_ACCOUNT"], tva_deductible: conf["ACCOUNTING_VAT_BUY_ACCOUNT"],
          ventes_services: conf["ACCOUNTING_SERVICE_SOLD_ACCOUNT"], achats_services: conf["ACCOUNTING_SERVICE_BUY_ACCOUNT"],
          ventes_produits: conf["ACCOUNTING_PRODUCT_SOLD_ACCOUNT"], achats_produits: conf["ACCOUNTING_PRODUCT_BUY_ACCOUNT"],
        },
        mode_tva: { ventes_produits: conf["TAX_MODE_SELL_PRODUCT"], achats_produits: conf["TAX_MODE_BUY_PRODUCT"], ventes_services: conf["TAX_MODE_SELL_SERVICE"], achats_services: conf["TAX_MODE_BUY_SERVICE"] },
        facturation: { numerotation: conf["FACTURE_ADDON"], template: conf["FACTURE_ADDON_PDF"], modif_post_valid: conf["INVOICE_CAN_BE_EDITED"] },
        export: { format: conf["ACCOUNTING_EXPORT_FORMAT"], modele: conf["ACCOUNTING_EXPORT_MODELCSV"], lettrage_auto: conf["ACCOUNTING_ENABLE_AUTOLETTERING"] },
        plan_comptable: { id: conf["CHARTOFACCOUNTS"], exercice_debut_mois: conf["SOCIETE_FISCAL_MONTH_START"], ninea: conf["MAIN_INFO_TVAINTRA"] },
      }, null, 2);
    }
    if (name === "get_accounting_dashboard") {
      return JSON.stringify({
        titre: "Tableau de Bord Comptable Digital Factory",
        plan: "SYSCOHADA (ID:" + conf["CHARTOFACCOUNTS"] + ") - Non initialise",
        tva: { ventes: conf["TAX_MODE_SELL_SERVICE"], achats: conf["TAX_MODE_BUY_SERVICE"] },
        tresorerie: { banques: bankArr.map(function(b) { return { ref: b["ref"], solde: b["balance"] }; }), total: bankArr.reduce(function(s, b) { return s + Number(b["balance"] || 0); }, 0).toFixed(2) },
        liens: { comptabilite: URL + "/admin/accounting.php", plan_comptable: URL + "/admin/accountancy_admin.php", comptes: URL + "/admin/accountancy_CWI.php" },
      }, null, 2);
    }
    return JSON.stringify({
      chartofaccounts: conf["CHARTOFACCOUNTS"],
      comptes: { "411": conf["ACCOUNTING_ACCOUNT_CUSTOMER"], "401": conf["ACCOUNTING_ACCOUNT_SUPPLIER"], "4431": conf["ACCOUNTING_VAT_SOLD_ACCOUNT"], "4452": conf["ACCOUNTING_VAT_BUY_ACCOUNT"], "706": conf["ACCOUNTING_SERVICE_SOLD_ACCOUNT"] },
      journaux: { VTE: "Ventes", ACH: "Achats", BNQ: "Banque ECOBANK", CAI: "Caisse", OD: "OD" },
      initialisation: URL + "/admin/accountancy_admin.php",
    }, null, 2);
  }

  if (name === "initialize_syscohada") {
    return JSON.stringify({ titre: "Guide SYSCOHADA", etapes: ["1. " + URL + "/admin/accountancy_admin.php", "2. Charger SYSCOHADA", "3. Confirmer l'import"], note: "Apres initialisation: list_accounting_accounts et list_accounting_entries seront operationnels" }, null, 2);
  }

  if (name === "configure_bank_accounting") {
    const bank = await api.get<Record<string, unknown>>("/bankaccounts/" + String(args["account_id"]));
    return JSON.stringify({ banque: { ref: bank["ref"], iban: bank["iban"], solde: bank["balance"], compte_actuel: bank["account_number"], journal_actuel: bank["accountancy_journal"] }, souhait: { compte: args["accounting_number"], journal: args["journal_code"] }, url: URL + "/compta/bank/card.php?id=" + String(args["account_id"]) + "&action=edit" }, null, 2);
  }

  // Outils de configuration - guides statiques
  const guides: Record<string, object> = {
    "configure_vat_mode": { titre: "Mode TVA", valeurs_souhaitees: args, url: URL + "/admin/tax.php", instructions: ["1. Aller sur " + URL + "/admin/tax.php", "2. Modifier: Sur les debits (invoice) ou Sur les encaissements (payment)", "3. Enregistrer"], note: "invoice=Sur les debits, payment=Sur les encaissements" },
    "configure_fiscal_year": { titre: "Exercice Fiscal", mois_souhaite: args["start_month"], url: URL + "/admin/societe.php", instructions: ["1. Aller sur " + URL + "/admin/societe.php", "2. Section Comptabilite > Mois debut exercice", "3. Choisir mois " + String(args["start_month"]) + " et enregistrer"] },
    "configure_invoice_numbering": { titre: "Numerotation Factures", valeurs: args, url: URL + "/admin/facture.php", modeles: { "mod_facture_terre": "FA{yy}{mm}-{####}", "mod_facture_himalaya": "FA-{####}", "mod_facture_mars": "{yyyy}-{####}" } },
    "configure_accounting_export": { titre: "Export Comptable", valeurs: args, url: URL + "/admin/accounting.php", modeles: { "1": "Sage50c", "2": "FEC/DGFiP", "3": "Cegid", "4": "OpenConcerto", "5": "WinBooks" } },
    "configure_invoice_options": { titre: "Options Facturation", valeurs: args, url: URL + "/admin/facture.php" },
    "configure_accounting_autolettering": { titre: "Lettrage Comptable", valeurs: args, url: URL + "/admin/accounting.php", note: "Lettrage = association debit/credit sur meme compte" },
    "set_accounting_account_mapping": { titre: "Mapping Compte Comptable", type: args["account_type"], compte: args["account_number"], url: URL + "/admin/accountancy_CWI.php", note: "Modifier dans Dolibarr: Comptabilite > Configuration > Comptes par defaut" },
  };

  const guide = guides[name];
  if (guide) {
    return JSON.stringify(guide, null, 2);
  }

  throw new Error("Outil config comptabilite inconnu: " + name);
}
