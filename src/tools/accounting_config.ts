import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DolibarrAPI } from "../api.js";

// L'API REST de Dolibarr ne permet pas de modifier la configuration comptable :
// ces outils lisent la configuration et indiquent les pages de l'interface web à utiliser.

export const accountingConfigTools: Tool[] = [
  { name: "get_accounting_config", description: "Lire la configuration comptable : comptes par défaut, mode TVA, plan comptable, numérotation, export (clé API administrateur requise).", inputSchema: { type: "object", properties: {} } },
  { name: "get_accounting_dashboard", description: "Tableau de bord : plan comptable actif, mode TVA et soldes bancaires.", inputSchema: { type: "object", properties: {} } },
  { name: "get_accounting_setup_guide", description: "Indiquer la page de l'interface Dolibarr où modifier un réglage comptable (mode TVA, exercice fiscal, numérotation, export, comptes par défaut, lettrage, compte comptable d'une banque).", inputSchema: { type: "object", properties: { topic: { type: "string", enum: ["vat_mode", "fiscal_year", "invoice_numbering", "invoice_options", "accounting_export", "default_accounts", "chart_of_accounts", "lettering", "bank_account"], description: "Réglage à modifier" }, bank_account_id: { type: "number", description: "ID du compte bancaire (pour topic=bank_account)" } }, required: ["topic"] } },
];

const GUIDE_PAGES: Record<string, { titre: string; page: string }> = {
  vat_mode: { titre: "Mode de TVA (débits / encaissements)", page: "/admin/taxes.php" },
  fiscal_year: { titre: "Exercices fiscaux", page: "/accountancy/admin/fiscalyear.php" },
  invoice_numbering: { titre: "Numérotation et modèles PDF des factures", page: "/admin/invoice.php" },
  invoice_options: { titre: "Options de facturation", page: "/admin/invoice.php" },
  accounting_export: { titre: "Format d'export comptable", page: "/accountancy/admin/export.php" },
  default_accounts: { titre: "Comptes comptables par défaut", page: "/accountancy/admin/defaultaccounts.php" },
  chart_of_accounts: { titre: "Plan comptable", page: "/accountancy/admin/account.php" },
  lettering: { titre: "Options du module comptabilité (lettrage)", page: "/accountancy/admin/index.php" },
};

export async function handleAccountingConfigTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  if (name === "get_accounting_config") {
    const conf = await api.get<Record<string, unknown>>("/setup/conf");
    return JSON.stringify({
      comptes_defaut: {
        clients: conf["ACCOUNTING_ACCOUNT_CUSTOMER"], fournisseurs: conf["ACCOUNTING_ACCOUNT_SUPPLIER"],
        tva_collectee: conf["ACCOUNTING_VAT_SOLD_ACCOUNT"], tva_deductible: conf["ACCOUNTING_VAT_BUY_ACCOUNT"],
        ventes_services: conf["ACCOUNTING_SERVICE_SOLD_ACCOUNT"], achats_services: conf["ACCOUNTING_SERVICE_BUY_ACCOUNT"],
        ventes_produits: conf["ACCOUNTING_PRODUCT_SOLD_ACCOUNT"], achats_produits: conf["ACCOUNTING_PRODUCT_BUY_ACCOUNT"],
      },
      mode_tva: { ventes_produits: conf["TAX_MODE_SELL_PRODUCT"], achats_produits: conf["TAX_MODE_BUY_PRODUCT"], ventes_services: conf["TAX_MODE_SELL_SERVICE"], achats_services: conf["TAX_MODE_BUY_SERVICE"] },
      facturation: { numerotation: conf["FACTURE_ADDON"], modele_pdf: conf["FACTURE_ADDON_PDF"] },
      export: { format: conf["ACCOUNTING_EXPORT_FORMAT"], modele: conf["ACCOUNTING_EXPORT_MODELCSV"] },
      plan_comptable: { id: conf["CHARTOFACCOUNTS"], module_comptabilite_actif: conf["MAIN_MODULE_ACCOUNTING"] === "1" },
    }, null, 2);
  }

  if (name === "get_accounting_dashboard") {
    const [conf, banks] = await Promise.all([
      api.get<Record<string, unknown>>("/setup/conf"),
      api.listAll("/bankaccounts", { sqlfilters: "(t.clos:=:0)" }),
    ]);
    return JSON.stringify({
      module_comptabilite_actif: conf["MAIN_MODULE_ACCOUNTING"] === "1",
      plan_comptable_id: conf["CHARTOFACCOUNTS"] ?? null,
      tva: { ventes_services: conf["TAX_MODE_SELL_SERVICE"], achats_services: conf["TAX_MODE_BUY_SERVICE"] },
      tresorerie: {
        banques: banks.map(b => ({ ref: b["ref"], libelle: b["label"], solde: b["balance"] })),
        total: banks.reduce((s, b) => s + Number(b["balance"] || 0), 0).toFixed(2),
      },
      liens: { comptabilite: `${api.webURL}/accountancy/index.php`, plan_comptable: `${api.webURL}/accountancy/admin/account.php` },
    }, null, 2);
  }

  if (name === "get_accounting_setup_guide") {
    if (args.topic === "bank_account") {
      if (!args.bank_account_id) throw new Error("bank_account_id est requis pour topic=bank_account.");
      const bank = await api.get<Record<string, unknown>>(`/bankaccounts/${args.bank_account_id}`);
      return JSON.stringify({
        titre: "Compte comptable et journal d'un compte bancaire",
        banque: { ref: bank["ref"], compte_comptable_actuel: bank["account_number"], journal_actuel: bank["fk_accountancy_journal"] ?? bank["accountancy_journal"] },
        url: `${api.webURL}/compta/bank/card.php?id=${args.bank_account_id}&action=edit`,
      }, null, 2);
    }
    const guide = GUIDE_PAGES[args.topic as string];
    return JSON.stringify({ titre: guide.titre, url: `${api.webURL}${guide.page}`, note: "Ce réglage se modifie dans l'interface web de Dolibarr (non modifiable via l'API REST)." }, null, 2);
  }

  throw new Error("Outil config comptabilite inconnu: " + name);
}
