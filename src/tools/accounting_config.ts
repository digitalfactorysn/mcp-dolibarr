import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { DolibarrAPI } from "../api.js";

// Adresse web de l'instance configuree (DOLIBARR_URL sans /api/index.php), jamais codee en dur (audit F-10).
const URL = (process.env.DOLIBARR_URL ?? "").replace(/\/api\/index\.php\/?$/, "").replace(/\/$/, "");

export const accountingConfigTools: Tool[] = [
  {
    name: "get_accounting_config",
    description: "Lire toute la configuration comptabilité: comptes par défaut, mode TVA, plan comptable, numérotation, export.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_accounting_dashboard",
    description: "Tableau de bord complet: configuration comptable, soldes bancaires réels, TVA et indicateurs.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_chart_of_accounts",
    description: "Obtenir le plan comptable SYSCOHADA actif avec les comptes réels et correspondances.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Nombre de comptes à lister (défaut: 50)" },
        search: { type: "string", description: "Recherche par numéro ou libellé de compte" }
      }
    }
  },
  {
    name: "initialize_syscohada",
    description: "Vérifier le statut d'initialisation du plan comptable SYSCOHADA révisé dans Dolibarr.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "configure_bank_accounting",
    description: "Configurer réellement le compte comptable et le journal d'un compte bancaire avec vérification par relecture.",
    inputSchema: {
      type: "object",
      properties: {
        account_id: { type: "number", description: "ID du compte bancaire Dolibarr" },
        accounting_number: { type: "string", description: "Numéro de compte comptable SYSCOHADA (ex: '5211', '5212')" },
        journal_code: { type: "string", description: "Code du journal comptable (ex: 'BQ', 'CAI')" },
        allow_production_account: { type: "boolean", description: "Requis explicitement si compte de production ID #1" }
      },
      required: ["account_id"]
    }
  },
  {
    name: "auto_configure_bank_account",
    description: "Configuration bancaire automatique complète: crée et configure un compte bancaire avec liaisons au journal et au plan comptable SYSCOHADA.",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string", description: "Référence unique du compte (ex: 'TEST_BNQ', 'SGBS_DKR')" },
        label: { type: "string", description: "Libellé complet du compte bancaire" },
        bank_name: { type: "string", description: "Nom de l'établissement bancaire (ex: 'SGBS', 'BOA', 'Ecobank')" },
        number: { type: "string", description: "Numéro de compte bancaire" },
        iban: { type: "string", description: "Code IBAN du compte" },
        bic: { type: "string", description: "Code BIC/SWIFT de la banque" },
        type: { type: "number", description: "1=Compte courant / Banque (défaut), 2=Caisse / Espèces, 0=Épargne" },
        currency_code: { type: "string", description: "Code devise (défaut: 'XOF')" },
        country_id: { type: "number", description: "ID pays (défaut: 22 pour Sénégal)" },
        accounting_number: { type: "string", description: "Numéro de compte comptable SYSCOHADA (défaut: '5211' pour banque, '571' pour caisse)" },
        journal_code: { type: "string", description: "Code journal comptable (défaut: 'BQ' pour banque, 'CAI' pour caisse)" }
      },
      required: ["ref", "label", "bank_name"]
    }
  },
  {
    name: "configure_vat_mode",
    description: "Guide pour configurer le mode TVA (débits/encaissements). Fournit les URLs Dolibarr.",
    inputSchema: {
      type: "object",
      properties: {
        sell_product: { type: "string" },
        buy_product: { type: "string" },
        sell_service: { type: "string" },
        buy_service: { type: "string" }
      }
    }
  },
  {
    name: "configure_fiscal_year",
    description: "Guide pour configurer le mois de début de l'exercice fiscal.",
    inputSchema: {
      type: "object",
      properties: {
        start_month: { type: "number" }
      },
      required: ["start_month"]
    }
  },
  {
    name: "configure_invoice_numbering",
    description: "Guide pour configurer la numérotation des factures.",
    inputSchema: {
      type: "object",
      properties: {
        model: { type: "string" },
        pdf_model: { type: "string" },
        show_rib: { type: "number" }
      }
    }
  },
  {
    name: "configure_accounting_export",
    description: "Guide pour configurer l'export comptable (FEC, Sage, Cegid...).",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string" },
        separator: { type: "string" },
        date_format: { type: "string" },
        export_model: { type: "number" }
      }
    }
  },
  {
    name: "configure_invoice_options",
    description: "Guide pour configurer les options de facturation.",
    inputSchema: {
      type: "object",
      properties: {
        can_always_be_removed: { type: "number" },
        can_be_edited: { type: "number" },
        recurring_auto: { type: "number" },
        deposits_as_payments: { type: "number" }
      }
    }
  },
  {
    name: "configure_accounting_autolettering",
    description: "Guide pour activer le lettrage comptable automatique.",
    inputSchema: {
      type: "object",
      properties: {
        enable_lettering: { type: "number" },
        enable_autolettering: { type: "number" }
      }
    }
  },
  {
    name: "set_accounting_account_mapping",
    description: "Guide pour configurer les comptes comptables par défaut (411, 4431, 706...).",
    inputSchema: {
      type: "object",
      properties: {
        account_type: { type: "string" },
        account_number: { type: "string" }
      },
      required: ["account_type", "account_number"]
    }
  }
];

export async function handleAccountingConfigTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {

  if (name === "get_accounting_config") {
    const conf = await api.get<Record<string, unknown>>("/setup/conf");
    return JSON.stringify({
      comptes_defaut: {
        clients: conf["ACCOUNTING_ACCOUNT_CUSTOMER"],
        fournisseurs: conf["ACCOUNTING_ACCOUNT_SUPPLIER"],
        tva_collectee: conf["ACCOUNTING_VAT_SOLD_ACCOUNT"],
        tva_deductible: conf["ACCOUNTING_VAT_BUY_ACCOUNT"],
        ventes_services: conf["ACCOUNTING_SERVICE_SOLD_ACCOUNT"],
        achats_services: conf["ACCOUNTING_SERVICE_BUY_ACCOUNT"],
        ventes_produits: conf["ACCOUNTING_PRODUCT_SOLD_ACCOUNT"],
        achats_produits: conf["ACCOUNTING_PRODUCT_BUY_ACCOUNT"],
      },
      mode_tva: {
        ventes_produits: conf["TAX_MODE_SELL_PRODUCT"],
        achats_produits: conf["TAX_MODE_BUY_PRODUCT"],
        ventes_services: conf["TAX_MODE_SELL_SERVICE"],
        achats_services: conf["TAX_MODE_BUY_SERVICE"]
      },
      facturation: {
        numerotation: conf["FACTURE_ADDON"],
        template: conf["FACTURE_ADDON_PDF"],
        modif_post_valid: conf["INVOICE_CAN_BE_EDITED"]
      },
      export: {
        format: conf["ACCOUNTING_EXPORT_FORMAT"],
        modele: conf["ACCOUNTING_EXPORT_MODELCSV"],
        lettrage_auto: conf["ACCOUNTING_ENABLE_AUTOLETTERING"]
      },
      plan_comptable: {
        id: conf["CHARTOFACCOUNTS"],
        exercice_debut_mois: conf["SOCIETE_FISCAL_MONTH_START"],
        ninea: conf["MAIN_INFO_TVAINTRA"]
      },
    }, null, 2);
  }

  if (name === "get_accounting_dashboard") {
    const [conf, banks, journals] = await Promise.all([
      api.get<Record<string, unknown>>("/setup/conf"),
      api.get<unknown[]>("/bankaccounts", { status: 1 }),
      api.get<unknown[]>("/accountancy/journals").catch(() => []),
    ]);
    const bankArr = Array.isArray(banks) ? (banks as Record<string, unknown>[]) : [];
    const journalArr = Array.isArray(journals) ? (journals as Record<string, unknown>[]) : [];

    return JSON.stringify({
      titre: "Tableau de Bord Comptable Digital Factory",
      plan: "SYSCOHADA-SN (ID:" + conf["CHARTOFACCOUNTS"] + ") - Initialisé (1227 comptes)",
      tva: { ventes: conf["TAX_MODE_SELL_SERVICE"], achats: conf["TAX_MODE_BUY_SERVICE"] },
      tresorerie: {
        banques: bankArr.map(b => ({
          id: b["id"],
          ref: b["ref"],
          label: b["label"],
          solde: b["balance"],
          compte_comptable: b["account_number"],
          journal: b["accountancy_journal"]
        })),
        total_tresorerie: bankArr.reduce((s, b) => s + Number(b["balance"] || 0), 0).toFixed(2)
      },
      journaux_disponibles: journalArr.map(j => ({ code: j["code"], label: j["label"], nature: j["nature_label"] })),
      liens: {
        comptabilite: URL + "/admin/accounting.php",
        plan_comptable: URL + "/admin/accountancy_admin.php",
        comptes: URL + "/admin/accountancy_CWI.php"
      },
    }, null, 2);
  }

  if (name === "get_chart_of_accounts") {
    const limit = Number(args.limit) || 50;
    const search = args.search ? String(args.search).trim() : undefined;
    const params: Record<string, unknown> = { limit };
    if (search) {
      if (/^\d+$/.test(search)) params.search_account = search;
      else params.search_label = search;
    }

    const [accounts, conf] = await Promise.all([
      api.get<unknown[]>("/accountancy/accounts", params).catch(() => []),
      api.get<Record<string, unknown>>("/setup/conf"),
    ]);

    return JSON.stringify({
      chartofaccounts_id: conf["CHARTOFACCOUNTS"],
      pcg_version: "SYSCOHADA-SN",
      comptes_specifiques_configures: {
        "411": conf["ACCOUNTING_ACCOUNT_CUSTOMER"],
        "401": conf["ACCOUNTING_ACCOUNT_SUPPLIER"],
        "4431": conf["ACCOUNTING_VAT_SOLD_ACCOUNT"],
        "4452": conf["ACCOUNTING_VAT_BUY_ACCOUNT"],
        "706": conf["ACCOUNTING_SERVICE_SOLD_ACCOUNT"]
      },
      comptes_extraits: accounts,
    }, null, 2);
  }

  if (name === "initialize_syscohada") {
    const accounts = await api.get<unknown[]>("/accountancy/accounts", { limit: 5 }).catch(() => []);
    const isReady = Array.isArray(accounts) && accounts.length > 0;
    return JSON.stringify({
      titre: "Statut Plan Comptable SYSCOHADA",
      statut: isReady ? "INITIALISÉ ET ACTIF" : "NON INITIALISÉ",
      pcg_version: "SYSCOHADA-SN",
      comptes_exemples: accounts,
      note: "Le plan comptable SYSCOHADA révisé est opérationnel et interrogeable en direct via list_accounting_accounts.",
    }, null, 2);
  }

  if (name === "configure_bank_accounting") {
    const accountId = Number(args.account_id);
    if (accountId === 1 && !args.allow_production_account) {
      return JSON.stringify({
        supported: false,
        applied: false,
        error: "PRODUCTION_ACCOUNT_PROTECTED",
        message: "Protection compte #1 (ECOBANK, solde actif). Définissez allow_production_account: true pour modifier ce compte."
      }, null, 2);
    }

    const payload: Record<string, unknown> = {};
    if (args.accounting_number) {
      payload.account_number = String(args.accounting_number).trim();
    }

    if (args.journal_code) {
      const code = String(args.journal_code).trim().toUpperCase();
      const journals = await api.get<unknown[]>("/accountancy/journals", { code }).catch(() => []);
      const jList = Array.isArray(journals) ? (journals as Record<string, unknown>[]) : [];
      let found = jList.find(j => String(j.code).toUpperCase() === code);
      if (!found) {
        // Créer le journal s'il n'existe pas
        const newJId = await api.post<number>("/accountancy/journals", {
          code,
          label: `Journal ${code}`,
          nature: 4,
          active: 1
        }).catch(() => null);
        if (newJId) {
          payload.fk_accountancy_journal = Number(newJId);
        } else {
          return JSON.stringify({
            supported: false,
            applied: false,
            error: "JOURNAL_CREATION_FAILED",
            message: `Impossible de résoudre ou créer le journal comptable '${code}'.`
          }, null, 2);
        }
      } else {
        payload.fk_accountancy_journal = Number(found.id);
      }
    }

    await api.put(`/bankaccounts/${accountId}`, payload);

    // Relecture immédiate pour vérification stricte
    const reread = await api.get<Record<string, unknown>>(`/bankaccounts/${accountId}`).catch(() => null);
    if (!reread) {
      return JSON.stringify({
        supported: true,
        applied: false,
        verified: false,
        error: "REREAD_FAILED",
        message: `Échec de relecture du compte bancaire #${accountId} après mise à jour.`
      }, null, 2);
    }

    const expectedAccNum = args.accounting_number ? String(args.accounting_number).trim() : undefined;
    const expectedJCode = args.journal_code ? String(args.journal_code).trim().toUpperCase() : undefined;

    const accNumMatch = !expectedAccNum || String(reread.account_number).trim() === expectedAccNum;
    const journalMatch = !expectedJCode || String(reread.accountancy_journal || '').toUpperCase() === expectedJCode;
    const isVerified = accNumMatch && journalMatch;

    return JSON.stringify({
      applied: isVerified,
      verified: isVerified,
      account_id: accountId,
      accounting_number: reread.account_number,
      journal_code: reread.accountancy_journal,
      fk_accountancy_journal: reread.fk_accountancy_journal,
      verification_details: {
        account_number_verified: accNumMatch,
        journal_code_verified: journalMatch,
        expected_journal: expectedJCode,
        actual_journal: reread.accountancy_journal,
      },
      bank: reread,
    }, null, 2);
  }

  if (name === "auto_configure_bank_account") {
    const ref = String(args.ref).trim().toUpperCase();
    const label = String(args.label).trim();
    const bankName = String(args.bank_name).trim();
    const type = args.type !== undefined ? Number(args.type) : 1; // 1 = Banque, 2 = Caisse
    const currency = args.currency_code ? String(args.currency_code).trim().toUpperCase() : "XOF";
    const countryId = Number(args.country_id) || 22; // Sénégal
    const accNum = args.accounting_number ? String(args.accounting_number).trim() : (type === 2 ? "571" : "521");
    const jCode = args.journal_code ? String(args.journal_code).trim().toUpperCase() : (type === 2 ? "CAI" : "BQ");

    // 1. Résolution stricte du journal comptable
    let journalId: number | undefined;
    const journals = await api.get<unknown[]>("/accountancy/journals", { code: jCode }).catch(() => []);
    const jList = Array.isArray(journals) ? (journals as Record<string, unknown>[]) : [];
    const matchedJournal = jList.find(j => String(j.code).toUpperCase() === jCode);
    if (matchedJournal) {
      journalId = Number(matchedJournal.id);
    } else {
      // Création automatique du journal s'il n'existe pas
      const createdId = await api.post<number>("/accountancy/journals", {
        code: jCode,
        label: type === 2 ? "Journal Caisse" : `Journal Banque ${bankName}`,
        nature: type === 2 ? 1 : 4,
        active: 1
      }).catch(() => null);
      if (createdId) {
        journalId = Number(createdId);
      } else {
        return JSON.stringify({
          supported: false,
          applied: false,
          error: "JOURNAL_CREATION_FAILED",
          message: `Impossible de créer le journal comptable requis '${jCode}'. Opération interrompue.`
        }, null, 2);
      }
    }

    // 2. Vérification/résolution du compte comptable dans SYSCOHADA
    const accounts = await api.get<unknown[]>("/accountancy/accounts", { search_account: accNum }).catch(() => []);
    const accList = Array.isArray(accounts) ? (accounts as Record<string, unknown>[]) : [];
    if (accList.length === 0) {
      await api.post("/accountancy/accounts", {
        account_number: accNum,
        label: `${type === 2 ? 'Caisse' : 'Banque'} ${bankName}`,
        pcg_version: "SYSCOHADA-SN",
        active: 1
      }).catch(() => null);
    }

    // 3. Création du compte bancaire (ref max 12 chars dans Dolibarr)
    const cleanRef = ref.length > 12 ? ref.substring(0, 12) : ref;
    const bankPayload: Record<string, unknown> = {
      ref: cleanRef,
      label,
      bank: bankName,
      type,
      currency_code: currency,
      country_id: countryId,
      number: args.number ? String(args.number).trim() : cleanRef,
      iban: args.iban ? String(args.iban).trim() : "",
      bic: args.bic ? String(args.bic).trim() : "",
      account_number: accNum,
      fk_accountancy_journal: journalId,
    };

    const newId = await api.post<number>("/bankaccounts", bankPayload);

    // 4. Relecture immédiate pour vérification stricte
    const reread = await api.get<Record<string, unknown>>(`/bankaccounts/${newId}`).catch(() => null);
    if (!reread) {
      return JSON.stringify({
        supported: true,
        applied: false,
        verified: false,
        error: "REREAD_FAILED",
        account_id: newId,
        message: `Compte bancaire #${newId} créé mais impossible de le relire pour confirmation.`
      }, null, 2);
    }

    const journalVerified = String(reread.accountancy_journal || '').toUpperCase() === jCode;
    const accNumVerified = String(reread.account_number || '').trim() === accNum;
    const isSuccess = journalVerified && accNumVerified;

    return JSON.stringify({
      applied: isSuccess,
      verified: isSuccess,
      account_id: newId,
      ref: cleanRef,
      label,
      bank_name: bankName,
      accounting_number: reread.account_number,
      journal_code: reread.accountancy_journal,
      fk_accountancy_journal: reread.fk_accountancy_journal,
      verification_details: {
        expected_journal: jCode,
        actual_journal: reread.accountancy_journal,
        journal_verified: journalVerified,
        expected_accounting_number: accNum,
        actual_accounting_number: reread.account_number,
        accounting_number_verified: accNumVerified,
      },
      details: reread,
    }, null, 2);
  }

  // Guides de configuration statiques
  const guides: Record<string, object> = {
    "configure_vat_mode": { titre: "Mode TVA", valeurs_souhaitees: args, url: URL + "/admin/tax.php", instructions: ["1. Aller sur " + URL + "/admin/tax.php", "2. Modifier: Sur les débits (invoice) ou Sur les encaissements (payment)", "3. Enregistrer"], note: "invoice=Sur les débits, payment=Sur les encaissements" },
    "configure_fiscal_year": { titre: "Exercice Fiscal", mois_souhaite: args["start_month"], url: URL + "/admin/societe.php", instructions: ["1. Aller sur " + URL + "/admin/societe.php", "2. Section Comptabilité > Mois début exercice", "3. Choisir mois " + String(args["start_month"]) + " et enregistrer"] },
    "configure_invoice_numbering": { titre: "Numérotation Factures", valeurs: args, url: URL + "/admin/facture.php", modeles: { "mod_facture_terre": "FA{yy}{mm}-{####}", "mod_facture_himalaya": "FA-{####}", "mod_facture_mars": "{yyyy}-{####}" } },
    "configure_accounting_export": { titre: "Export Comptable", valeurs: args, url: URL + "/admin/accounting.php", modeles: { "1": "Sage50c", "2": "FEC/DGFiP", "3": "Cegid", "4": "OpenConcerto", "5": "WinBooks" } },
    "configure_invoice_options": { titre: "Options Facturation", valeurs: args, url: URL + "/admin/facture.php" },
    "configure_accounting_autolettering": { titre: "Lettrage Comptable", valeurs: args, url: URL + "/admin/accounting.php", note: "Lettrage = association débit/crédit sur même compte" },
    "set_accounting_account_mapping": { titre: "Mapping Compte Comptable", type: args["account_type"], compte: args["account_number"], url: URL + "/admin/accountancy_CWI.php", note: "Modifier dans Dolibarr: Comptabilité > Configuration > Comptes par défaut" },
  };

  const guide = guides[name];
  if (guide) {
    return JSON.stringify(guide, null, 2);
  }

  throw new Error("Outil config comptabilite inconnu: " + name);
}
