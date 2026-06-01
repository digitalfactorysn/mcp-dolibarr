import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const accountingTools: Tool[] = [
  // ── COMPTES BANCAIRES ──────────────────────────────────────────────────────
  {
    name: 'list_bank_accounts',
    description: 'Lister les comptes bancaires de la société avec leur solde actuel',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'number', description: '1=Actifs seulement (défaut), 0=Tous' },
      },
    },
  },
  {
    name: 'get_bank_account',
    description: 'Obtenir les détails complets d\'un compte bancaire (IBAN, BIC, solde, journal associé)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du compte bancaire' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_bank_account',
    description: 'Créer un nouveau compte bancaire dans Dolibarr',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Référence du compte (ex: BNK-PRINCIPALE)' },
        label: { type: 'string', description: 'Libellé du compte' },
        type: { type: 'string', description: "'BANK', 'CASH', 'OTHER'" },
        bank: { type: 'string', description: 'Nom de la banque' },
        iban: { type: 'string', description: 'IBAN' },
        bic: { type: 'string', description: 'BIC/SWIFT' },
        currency_code: { type: 'string', description: "Code devise (ex: 'XOF', 'EUR', 'USD')" },
        account_number: { type: 'string', description: 'Numéro de compte bancaire' },
        fk_accountancy_journal: { type: 'number', description: 'ID journal comptable associé' },
      },
      required: ['ref', 'label'],
    },
  },
  {
    name: 'update_bank_account',
    description: 'Modifier les informations d\'un compte bancaire',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du compte bancaire' },
        label: { type: 'string' },
        bank: { type: 'string' },
        iban: { type: 'string' },
        bic: { type: 'string' },
        status: { type: 'number', description: '1=Actif, 0=Inactif' },
        fk_accountancy_journal: { type: 'number', description: 'ID journal comptable associé' },
        accountancy_journal: { type: 'string', description: 'Code journal (ex: BNK)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_bank_account',
    description: 'Supprimer un compte bancaire (impossible s\'il a des transactions)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du compte bancaire' },
      },
      required: ['id'],
    },
  },
  // ── TRANSACTIONS BANCAIRES ─────────────────────────────────────────────────
  {
    name: 'get_bank_transactions',
    description: "Lister les transactions d'un compte bancaire avec filtres de date",
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        limit: { type: 'number', description: 'Nombre max de transactions' },
        sqlfilters: { type: 'string', description: "Filtre SQL ex: (t.datev:>='2025-01-01')" },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'get_bank_transaction',
    description: 'Obtenir les détails d\'une transaction bancaire spécifique',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        line_id: { type: 'number', description: 'ID de la transaction' },
      },
      required: ['account_id', 'line_id'],
    },
  },
  {
    name: 'add_bank_transaction',
    description: "Ajouter une opération bancaire manuelle (entrée ou sortie de trésorerie)",
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        date: { type: 'string', description: "Date de l'opération ISO 8601" },
        amount: { type: 'number', description: 'Montant (positif=crédit, négatif=débit)' },
        label: { type: 'string', description: "Libellé de l'opération" },
        num_chq: { type: 'string', description: 'Numéro de chèque ou référence' },
        fk_type: { type: 'string', description: "Type: 'VIR', 'CHQ', 'CB', 'LIQ', 'PRV', 'AC'" },
      },
      required: ['account_id', 'date', 'amount', 'label'],
    },
  },
  {
    name: 'update_bank_transaction',
    description: 'Modifier une transaction bancaire (libellé, date, montant)',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        line_id: { type: 'number', description: 'ID de la transaction' },
        label: { type: 'string', description: 'Nouveau libellé' },
        date: { type: 'string', description: 'Nouvelle date ISO 8601' },
        amount: { type: 'number', description: 'Nouveau montant' },
        num_chq: { type: 'string', description: 'Nouvelle référence' },
      },
      required: ['account_id', 'line_id'],
    },
  },
  {
    name: 'delete_bank_transaction',
    description: 'Supprimer une transaction bancaire',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        line_id: { type: 'number', description: 'ID de la transaction à supprimer' },
      },
      required: ['account_id', 'line_id'],
    },
  },
  {
    name: 'reconcile_bank_line',
    description: 'Pointer/lettrer une transaction bancaire (rapprochement bancaire)',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        line_id: { type: 'number', description: 'ID de la transaction bancaire' },
        num_releve: { type: 'string', description: 'Numéro de relevé bancaire' },
      },
      required: ['account_id', 'line_id', 'num_releve'],
    },
  },
  {
    name: 'link_bank_transaction',
    description: 'Lier une transaction bancaire à une facture ou un paiement (rapprochement automatique)',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        line_id: { type: 'number', description: 'ID de la transaction bancaire' },
        url_id: { type: 'number', description: 'ID de la facture ou paiement à lier' },
        type: { type: 'string', description: "'payment', 'supplier_payment', 'invoice', 'supplier_invoice'" },
      },
      required: ['account_id', 'line_id', 'url_id', 'type'],
    },
  },
  {
    name: 'unlink_bank_transaction',
    description: 'Supprimer le lien entre une transaction bancaire et une facture/paiement',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        line_id: { type: 'number', description: 'ID de la transaction bancaire' },
        link_id: { type: 'number', description: 'ID du lien à supprimer' },
      },
      required: ['account_id', 'line_id', 'link_id'],
    },
  },
  {
    name: 'list_bank_transaction_links',
    description: 'Lister les liens (factures, paiements) associés à une transaction bancaire',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: 'ID du compte bancaire' },
        line_id: { type: 'number', description: 'ID de la transaction' },
      },
      required: ['account_id', 'line_id'],
    },
  },
  // ── PLAN COMPTABLE ─────────────────────────────────────────────────────────
  {
    name: 'list_accounting_accounts',
    description: 'Lister les comptes du plan comptable (nécessite module Comptabilité Avancée)',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: "Filtrer par type: 'CUST', 'SUPPLIER', 'BANK', 'FISC'" },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'get_accounting_account',
    description: 'Obtenir les détails d\'un compte comptable par son ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du compte comptable' },
      },
      required: ['id'],
    },
  },
  {
    name: 'search_accounting_accounts',
    description: 'Rechercher des comptes comptables par numéro ou libellé',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Numéro ou libellé à rechercher (ex: "411", "clients")' },
        limit: { type: 'number', description: 'Nombre max de résultats' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_accounting_account',
    description: 'Créer un nouveau compte dans le plan comptable',
    inputSchema: {
      type: 'object',
      properties: {
        account_number: { type: 'string', description: 'Numéro de compte (ex: 411500)' },
        label: { type: 'string', description: 'Libellé du compte' },
        fk_pcg_version: { type: 'string', description: "Plan comptable: 'PCG99-BASE', 'SYSCOHADA', etc." },
        pcg_type: { type: 'string', description: "Type: 'CUST', 'SUPPLIER', 'BANK', 'FISC', 'OTHER'" },
        active: { type: 'number', description: '1=Actif (défaut), 0=Inactif' },
      },
      required: ['account_number', 'label'],
    },
  },
  {
    name: 'update_accounting_account',
    description: 'Modifier un compte comptable (libellé, type, statut)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du compte comptable' },
        account_number: { type: 'string', description: 'Numéro de compte' },
        label: { type: 'string', description: 'Nouveau libellé' },
        active: { type: 'number', description: '1=Actif, 0=Inactif' },
        pcg_type: { type: 'string', description: "Type de compte" },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_accounting_account',
    description: 'Supprimer un compte comptable (impossible s\'il a des écritures)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du compte comptable à supprimer' },
      },
      required: ['id'],
    },
  },
  // ── JOURNAUX COMPTABLES ────────────────────────────────────────────────────
  {
    name: 'list_accounting_journals',
    description: 'Lister les journaux comptables (Ventes, Achats, Banque, OD...)',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_accounting_journal',
    description: 'Obtenir les détails d\'un journal comptable',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du journal' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_accounting_journal',
    description: 'Créer un nouveau journal comptable',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code du journal (ex: OD, REC, PAY)' },
        label: { type: 'string', description: 'Libellé du journal' },
        nature: { type: 'number', description: '1=Ventes, 2=Achats, 3=Banque, 4=Caisse, 5=OD, 9=Export' },
        active: { type: 'number', description: '1=Actif (défaut)' },
      },
      required: ['code', 'label', 'nature'],
    },
  },
  {
    name: 'update_accounting_journal',
    description: 'Modifier un journal comptable',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du journal' },
        label: { type: 'string', description: 'Nouveau libellé' },
        active: { type: 'number', description: '1=Actif, 0=Inactif' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_accounting_journal',
    description: 'Supprimer un journal comptable (impossible s\'il a des écritures)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du journal à supprimer' },
      },
      required: ['id'],
    },
  },
  // ── ÉCRITURES COMPTABLES ───────────────────────────────────────────────────
  {
    name: 'list_accounting_entries',
    description: 'Lister les écritures comptables du grand livre',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max' },
        journal_code: { type: 'string', description: 'Code journal (ex: VTE, ACH, BNK)' },
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
        account_number: { type: 'string', description: 'Numéro ou préfixe de compte comptable' },
      },
    },
  },
  {
    name: 'get_accounting_entry',
    description: 'Obtenir les détails d\'une écriture comptable par son ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'écriture comptable' },
      },
      required: ['id'],
    },
  },
  {
    name: 'write_accounting_entry',
    description: 'Créer une écriture comptable manuelle (OD). Chaque écriture doit être équilibrée (total débit = total crédit).',
    inputSchema: {
      type: 'object',
      properties: {
        journal_code: { type: 'string', description: 'Code du journal (ex: OD)' },
        date: { type: 'string', description: 'Date de l\'écriture ISO 8601' },
        piece_num: { type: 'string', description: 'Numéro de pièce (référence)' },
        label: { type: 'string', description: 'Libellé général de l\'écriture' },
        lines: {
          type: 'array',
          description: 'Lignes de l\'écriture (doit être équilibrée)',
          items: {
            type: 'object',
            properties: {
              account_number: { type: 'string', description: 'Numéro de compte' },
              subledger_account: { type: 'string', description: 'Compte auxiliaire (tiers)' },
              label: { type: 'string', description: 'Libellé de la ligne' },
              debit: { type: 'number', description: 'Montant débit (0 si crédit)' },
              credit: { type: 'number', description: 'Montant crédit (0 si débit)' },
            },
          },
        },
      },
      required: ['journal_code', 'date', 'label', 'lines'],
    },
  },
  {
    name: 'update_accounting_entry',
    description: 'Modifier une écriture comptable non validée (brouillon uniquement)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'écriture' },
        label: { type: 'string', description: 'Nouveau libellé' },
        debit: { type: 'number', description: 'Nouveau montant débit' },
        credit: { type: 'number', description: 'Nouveau montant crédit' },
        piece_num: { type: 'string', description: 'Nouveau numéro de pièce' },
        doc_date: { type: 'string', description: 'Nouvelle date ISO 8601' },
        numero_compte_generale: { type: 'string', description: 'Nouveau numéro de compte' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_accounting_entry',
    description: 'Supprimer une écriture comptable (uniquement si non validée)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'écriture à supprimer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'validate_accounting_period',
    description: 'Valider/verrouiller les écritures comptables d\'une période (opération irréversible sans dévalidation admin)',
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
        journal_code: { type: 'string', description: 'Code journal (si vide: tous les journaux)' },
      },
      required: ['date_start', 'date_end'],
    },
  },
  {
    name: 'unvalidate_accounting_period',
    description: 'Dévalider/déverrouiller des écritures comptables (droits admin requis)',
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
        journal_code: { type: 'string', description: 'Code journal (si vide: tous les journaux)' },
      },
      required: ['date_start', 'date_end'],
    },
  },
  {
    name: 'letter_accounting_entries',
    description: 'Lettrer (rapprocher) des écritures comptables — les marquer comme appariées (ex: facture + règlement)',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'Liste des IDs d\'écritures à lettrer ensemble',
        },
        lettering_code: { type: 'string', description: 'Code de lettrage (ex: A, B, AA...) — généré automatiquement si vide' },
      },
      required: ['ids'],
    },
  },
  {
    name: 'unletter_accounting_entries',
    description: 'Délettrer (dé-rapprocher) des écritures comptables — supprimer le lettrage',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'Liste des IDs d\'écritures à délettrer',
        },
      },
      required: ['ids'],
    },
  },
  // ── EXERCICES COMPTABLES ───────────────────────────────────────────────────
  {
    name: 'list_fiscal_years',
    description: 'Lister les exercices comptables (années fiscales)',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'get_fiscal_year',
    description: 'Obtenir les détails d\'un exercice comptable',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'exercice comptable' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_fiscal_year',
    description: 'Créer un nouvel exercice comptable',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: 'Libellé de l\'exercice (ex: Exercice 2025)' },
        date_start: { type: 'string', description: 'Date de début ISO 8601 (ex: 2025-01-01)' },
        date_end: { type: 'string', description: 'Date de fin ISO 8601 (ex: 2025-12-31)' },
      },
      required: ['date_start', 'date_end'],
    },
  },
  {
    name: 'close_fiscal_year',
    description: 'Clôturer un exercice comptable (verrouille toutes les écritures de la période)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID de l\'exercice à clôturer' },
      },
      required: ['id'],
    },
  },
  // ── ÉTATS FINANCIERS ───────────────────────────────────────────────────────
  {
    name: 'get_financial_summary',
    description: "Résumé financier : CA total, factures impayées, balance de trésorerie et indicateurs clés",
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Année fiscale (ex: 2025). Si vide: année en cours' },
      },
    },
  },
  {
    name: 'get_indicateurs_financiers',
    description: 'Tableau de bord financier complet : CA, marges, ratios de liquidité, DSO, DPO et principaux KPIs',
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Année fiscale (défaut: année en cours)' },
      },
    },
  },
  {
    name: 'get_compte_resultat',
    description: 'Compte de résultat (P&L) : produits (classe 7) vs charges (classe 6) avec résultat net sur une période',
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: 'Date début ISO 8601 (ex: 2025-01-01)' },
        date_end: { type: 'string', description: 'Date fin ISO 8601 (ex: 2025-12-31)' },
        detail_level: { type: 'string', description: "'classe' (agrégé par classe), 'compte' (détaillé par compte). Défaut: compte" },
      },
      required: ['date_start', 'date_end'],
    },
  },
  {
    name: 'get_bilan',
    description: 'Bilan comptable (actif/passif) calculé depuis les classes 1 à 5 du plan comptable',
    inputSchema: {
      type: 'object',
      properties: {
        date_end: { type: 'string', description: 'Date de clôture du bilan ISO 8601 (ex: 2025-12-31)' },
        detail_level: { type: 'string', description: "'classe' (agrégé), 'compte' (détaillé). Défaut: compte" },
      },
      required: ['date_end'],
    },
  },
  {
    name: 'get_rapport_creances_clients',
    description: 'Balance âgée des créances clients : factures impayées classées par ancienneté (< 30j, 30-60j, 60-90j, > 90j)',
    inputSchema: {
      type: 'object',
      properties: {
        date_reference: { type: 'string', description: "Date de référence ISO 8601 (défaut: aujourd'hui)" },
        limit: { type: 'number', description: 'Nombre max de factures à analyser' },
      },
    },
  },
  {
    name: 'get_rapport_dettes_fournisseurs',
    description: 'Balance âgée des dettes fournisseurs : factures impayées classées par ancienneté',
    inputSchema: {
      type: 'object',
      properties: {
        date_reference: { type: 'string', description: "Date de référence ISO 8601 (défaut: aujourd'hui)" },
        limit: { type: 'number', description: 'Nombre max de factures à analyser' },
      },
    },
  },
  {
    name: 'get_cash_flow',
    description: 'Tableau de flux de trésorerie : entrées/sorties bancaires par compte sur une période',
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
      },
      required: ['date_start', 'date_end'],
    },
  },
  {
    name: 'get_solde_compte',
    description: 'Solde d\'un compte comptable spécifique sur une période (débit cumulé, crédit cumulé, solde net)',
    inputSchema: {
      type: 'object',
      properties: {
        account_number: { type: 'string', description: 'Numéro de compte exact ou préfixe (ex: 411000 ou 41)' },
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
      },
      required: ['account_number'],
    },
  },
  // ── BALANCE & GRAND LIVRE ──────────────────────────────────────────────────
  {
    name: 'get_balance_generale',
    description: 'Balance générale comptable : solde débit/crédit agrégé par compte sur une période',
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: 'Date début ISO 8601 (ex: 2025-01-01)' },
        date_end: { type: 'string', description: 'Date fin ISO 8601 (ex: 2025-12-31)' },
        class_filter: { type: 'string', description: "Classe de compte (ex: '6' pour charges, '7' pour produits, '4' pour tiers)" },
        limit: { type: 'number', description: 'Nombre max d\'écritures à analyser (défaut: 5000)' },
      },
    },
  },
  {
    name: 'get_grand_livre',
    description: 'Grand livre comptable : toutes les écritures par compte avec solde progressif',
    inputSchema: {
      type: 'object',
      properties: {
        account_number: { type: 'string', description: "Numéro de compte (ex: '411000') ou préfixe (ex: '41')" },
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
        limit: { type: 'number', description: 'Nombre max d\'écritures (défaut: 500)' },
      },
    },
  },
  // ── EXPORTS ────────────────────────────────────────────────────────────────
  {
    name: 'export_ecritures_fec',
    description: 'Exporter les écritures au format FEC (Fichier des Écritures Comptables — norme DGFiP)',
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: 'Date début ISO 8601 (ex: 2025-01-01)' },
        date_end: { type: 'string', description: 'Date fin ISO 8601 (ex: 2025-12-31)' },
        journal_code: { type: 'string', description: 'Filtrer par code journal (ex: VTE, ACH, BNK)' },
        limit: { type: 'number', description: 'Nombre max d\'écritures (défaut: 10000)' },
      },
    },
  },
  {
    name: 'export_balance_csv',
    description: 'Exporter la balance générale au format CSV (compatible Excel/LibreOffice)',
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
        class_filter: { type: 'string', description: "Classe de compte à filtrer (ex: '6', '7')" },
      },
    },
  },
  {
    name: 'export_grand_livre_csv',
    description: 'Exporter le grand livre au format CSV',
    inputSchema: {
      type: 'object',
      properties: {
        account_number: { type: 'string', description: 'Numéro de compte ou préfixe' },
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
      },
    },
  },
  // ── TVA ────────────────────────────────────────────────────────────────────
  {
    name: 'get_rapport_tva',
    description: 'Rapport de TVA collectée et déductible sur une période, avec détail par taux',
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: 'Date début ISO 8601 (ex: 2025-01-01)' },
        date_end: { type: 'string', description: 'Date fin ISO 8601 (ex: 2025-03-31)' },
        mode: { type: 'string', description: "'encaissement' ou 'debit' (défaut: debit)" },
      },
      required: ['date_start', 'date_end'],
    },
  },
  // ── PAIEMENTS ──────────────────────────────────────────────────────────────
  {
    name: 'list_payments',
    description: 'Lister tous les paiements clients enregistrés',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
      },
    },
  },
  {
    name: 'get_payment',
    description: 'Obtenir les détails d\'un paiement client (montant, date, facture associée, mode)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du paiement' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_payment',
    description: 'Supprimer un paiement client (ré-ouvre la facture associée)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du paiement à supprimer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_supplier_payments',
    description: 'Lister tous les paiements fournisseurs enregistrés',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max (défaut: 100)' },
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
      },
    },
  },
  {
    name: 'get_supplier_payment',
    description: 'Obtenir les détails d\'un paiement fournisseur',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du paiement fournisseur' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_supplier_payment',
    description: 'Supprimer un paiement fournisseur (ré-ouvre la facture fournisseur associée)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du paiement fournisseur à supprimer' },
      },
      required: ['id'],
    },
  },
];

// ============================================================
// Handler
// ============================================================
export async function handleAccountingTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {

    // ── COMPTES BANCAIRES ────────────────────────────────────────────────────
    case 'list_bank_accounts': {
      const params: Record<string, unknown> = {};
      params.status = args.status !== undefined ? args.status : 1;
      const data = await api.get('/bankaccounts', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_bank_account': {
      const data = await api.get(`/bankaccounts/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_bank_account': {
      const id = await api.post('/bankaccounts', args);
      return `✅ Compte bancaire créé. ID: ${id} | Ref: ${args.ref} | Libellé: ${args.label}`;
    }
    case 'update_bank_account': {
      const { id, ...rest } = args;
      await api.put(`/bankaccounts/${id}`, rest);
      return `✅ Compte bancaire #${id} mis à jour.`;
    }
    case 'delete_bank_account': {
      await api.delete(`/bankaccounts/${args.id}`);
      return `✅ Compte bancaire #${args.id} supprimé.`;
    }

    // ── TRANSACTIONS BANCAIRES ───────────────────────────────────────────────
    case 'get_bank_transactions': {
      const params: Record<string, unknown> = { limit: args.limit || 50 };
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get(`/bankaccounts/${args.account_id}/lines`, params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_bank_transaction': {
      const data = await api.get(`/bankaccounts/${args.account_id}/lines/${args.line_id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'add_bank_transaction': {
      const date = args.date ? Math.floor(new Date(args.date as string).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const payload = {
        date,
        amount: args.amount,
        label: args.label,
        num_chq: args.num_chq || '',
        type: args.fk_type || 'VIR',
      };
      const lineId = await api.post(`/bankaccounts/${args.account_id}/lines`, payload);
      return `✅ Opération bancaire enregistrée. ID transaction: ${lineId}\nCompte: #${args.account_id} | Montant: ${args.amount}`;
    }
    case 'update_bank_transaction': {
      const { account_id, line_id, ...rest } = args;
      if (rest.date) (rest as Record<string, unknown>).date = Math.floor(new Date(rest.date as string).getTime() / 1000);
      await api.put(`/bankaccounts/${account_id}/lines/${line_id}`, rest);
      return `✅ Transaction #${line_id} du compte #${account_id} mise à jour.`;
    }
    case 'delete_bank_transaction': {
      await api.delete(`/bankaccounts/${args.account_id}/lines/${args.line_id}`);
      return `✅ Transaction #${args.line_id} supprimée du compte #${args.account_id}.`;
    }
    case 'reconcile_bank_line': {
      await api.post(`/bankaccounts/${args.account_id}/lines/${args.line_id}/reconcile`, {
        num_releve: args.num_releve,
      });
      return `✅ Transaction #${args.line_id} pointée sur le relevé '${args.num_releve}'.`;
    }
    case 'link_bank_transaction': {
      const payload = { url_id: args.url_id, type: args.type, label: '' };
      const linkId = await api.post(`/bankaccounts/${args.account_id}/lines/${args.line_id}/links`, payload);
      return `✅ Transaction #${args.line_id} liée à ${args.type} #${args.url_id}. ID lien: ${linkId}`;
    }
    case 'unlink_bank_transaction': {
      await api.delete(`/bankaccounts/${args.account_id}/lines/${args.line_id}/links/${args.link_id}`);
      return `✅ Lien #${args.link_id} supprimé de la transaction #${args.line_id}.`;
    }
    case 'list_bank_transaction_links': {
      const data = await api.get(`/bankaccounts/${args.account_id}/lines/${args.line_id}/links`);
      return JSON.stringify(data, null, 2);
    }

    // ── PLAN COMPTABLE ───────────────────────────────────────────────────────
    case 'list_accounting_accounts': {
      const params: Record<string, unknown> = { limit: args.limit || 200 };
      if (args.type) params.type = args.type;
      const data = await api.get('/accountancy/account', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_accounting_account': {
      const data = await api.get(`/accountancy/account/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'search_accounting_accounts': {
      const query = String(args.query);
      const params: Record<string, unknown> = { limit: args.limit || 50 };
      if (/^\d/.test(query)) {
        params.search_accountancy_code = query;
      } else {
        params.search_label = query;
      }
      const data = await api.get('/accountancy/account', params);
      return JSON.stringify(data, null, 2);
    }
    case 'create_accounting_account': {
      const payload = {
        account_number: args.account_number,
        label: args.label,
        fk_pcg_version: args.fk_pcg_version || 'PCG99-BASE',
        pcg_type: args.pcg_type || 'OTHER',
        active: args.active !== undefined ? args.active : 1,
      };
      const id = await api.post('/accountancy/account', payload);
      return `✅ Compte comptable créé. ID: ${id} | N°: ${args.account_number} | Libellé: ${args.label}`;
    }
    case 'update_accounting_account': {
      const { id, ...rest } = args;
      await api.put(`/accountancy/account/${id}`, rest);
      return `✅ Compte comptable #${id} mis à jour.`;
    }
    case 'delete_accounting_account': {
      await api.delete(`/accountancy/account/${args.id}`);
      return `✅ Compte comptable #${args.id} supprimé.`;
    }

    // ── JOURNAUX ─────────────────────────────────────────────────────────────
    case 'list_accounting_journals': {
      const data = await api.get('/accountancy/journal');
      return JSON.stringify(data, null, 2);
    }
    case 'get_accounting_journal': {
      const data = await api.get(`/accountancy/journal/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_accounting_journal': {
      const id = await api.post('/accountancy/journal', args);
      return `✅ Journal comptable créé. ID: ${id} | Code: ${args.code} | Libellé: ${args.label}`;
    }
    case 'update_accounting_journal': {
      const { id, ...rest } = args;
      await api.put(`/accountancy/journal/${id}`, rest);
      return `✅ Journal #${id} mis à jour.`;
    }
    case 'delete_accounting_journal': {
      await api.delete(`/accountancy/journal/${args.id}`);
      return `✅ Journal #${args.id} supprimé.`;
    }

    // ── ÉCRITURES ────────────────────────────────────────────────────────────
    case 'list_accounting_entries': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.journal_code) params.journal_code = args.journal_code;
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      if (args.account_number) params.search_accountancy_code_start = args.account_number;
      const data = await api.get('/accountancy/bookkeeping', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_accounting_entry': {
      const data = await api.get(`/accountancy/bookkeeping/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'write_accounting_entry': {
      const lines = args.lines as Array<Record<string, unknown>>;
      const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
      const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return `❌ Écriture déséquilibrée: Total débit=${totalDebit.toFixed(2)} ≠ Total crédit=${totalCredit.toFixed(2)}. L'écriture doit être équilibrée.`;
      }
      const dateTs = Math.floor(new Date(args.date as string).getTime() / 1000);
      const entries = lines.map(l => ({
        journal_code: args.journal_code,
        doc_date: dateTs,
        piece_num: args.piece_num || '',
        label: l.label || args.label,
        numero_compte_generale: l.account_number,
        subledger_account: l.subledger_account || '',
        subledger_label: l.subledger_label || '',
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
      }));
      const results = await Promise.all(entries.map(e => api.post('/accountancy/bookkeeping', e)));
      return `✅ Écriture comptable créée (${lines.length} lignes).\nJournal: ${args.journal_code} | Montant: ${totalDebit.toFixed(2)}\nIDs: ${results.join(', ')}`;
    }
    case 'update_accounting_entry': {
      const { id, ...rest } = args;
      if (rest.doc_date) (rest as Record<string, unknown>).doc_date = Math.floor(new Date(rest.doc_date as string).getTime() / 1000);
      await api.put(`/accountancy/bookkeeping/${id}`, rest);
      return `✅ Écriture #${id} mise à jour.`;
    }
    case 'delete_accounting_entry': {
      await api.delete(`/accountancy/bookkeeping/${args.id}`);
      return `✅ Écriture comptable #${args.id} supprimée.`;
    }
    case 'validate_accounting_period': {
      const payload: Record<string, unknown> = {};
      if (args.date_start) payload.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) payload.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      if (args.journal_code) payload.journal_code = args.journal_code;
      await api.post('/accountancy/bookkeeping/lines/validate', payload);
      return `✅ Écritures verrouillées du ${args.date_start} au ${args.date_end}.`;
    }
    case 'unvalidate_accounting_period': {
      const payload: Record<string, unknown> = {};
      if (args.date_start) payload.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) payload.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      if (args.journal_code) payload.journal_code = args.journal_code;
      await api.post('/accountancy/bookkeeping/lines/unvalidate', payload);
      return `✅ Écritures déverrouillées du ${args.date_start} au ${args.date_end}.`;
    }
    case 'letter_accounting_entries': {
      const ids = args.ids as number[];
      const code = (args.lettering_code as string) || '';
      await api.post('/accountancy/bookkeeping/lines/mark', { ids, direction: 1, lettering: code });
      return `✅ ${ids.length} écritures lettrées${code ? ` (code: ${code})` : ''}.`;
    }
    case 'unletter_accounting_entries': {
      const ids = args.ids as number[];
      await api.post('/accountancy/bookkeeping/lines/mark', { ids, direction: 0 });
      return `✅ ${ids.length} écritures delettrées.`;
    }

    // ── EXERCICES COMPTABLES ─────────────────────────────────────────────────
    case 'list_fiscal_years': {
      const data = await api.get('/accountancy/fiscalyear', { limit: args.limit || 20 });
      return JSON.stringify(data, null, 2);
    }
    case 'get_fiscal_year': {
      const data = await api.get(`/accountancy/fiscalyear/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'create_fiscal_year': {
      const payload = {
        label: args.label || `Exercice ${new Date(args.date_start as string).getFullYear()}`,
        date_start: Math.floor(new Date(args.date_start as string).getTime() / 1000),
        date_end: Math.floor(new Date(args.date_end as string).getTime() / 1000),
        status: 0,
      };
      const id = await api.post('/accountancy/fiscalyear', payload);
      return `✅ Exercice comptable créé. ID: ${id} | Période: ${args.date_start} → ${args.date_end}`;
    }
    case 'close_fiscal_year': {
      const year = await api.get<Record<string, unknown>>(`/accountancy/fiscalyear/${args.id}`);
      await api.put(`/accountancy/fiscalyear/${args.id}`, { ...year, status: 1 });
      return `✅ Exercice #${args.id} clôturé. Toutes les écritures de la période sont verrouillées.`;
    }

    // ── ÉTATS FINANCIERS ─────────────────────────────────────────────────────
    case 'get_financial_summary': {
      const year = args.year || new Date().getFullYear();
      const sqlYear = `(t.datef:>='${year}-01-01') and (t.datef:<='${year}-12-31')`;
      const [paidInvoices, unpaidInvoices, bankAccounts] = await Promise.all([
        api.get<unknown[]>('/invoices', { status: 2, limit: 500, sqlfilters: sqlYear }),
        api.get<unknown[]>('/invoices', { status: 1, limit: 500 }),
        api.get<unknown[]>('/bankaccounts', { status: 1 }),
      ]);
      const pArr = Array.isArray(paidInvoices) ? paidInvoices : [];
      const uArr = Array.isArray(unpaidInvoices) ? unpaidInvoices : [];
      const bArr = Array.isArray(bankAccounts) ? bankAccounts : [];
      const totalCA = pArr.reduce((s: number, inv: unknown) => s + ((inv as Record<string, number>).total_ttc || 0), 0);
      const totalUnpaid = uArr.reduce((s: number, inv: unknown) => s + ((inv as Record<string, number>).total_ttc || 0), 0);
      const totalBalance = bArr.reduce((s: number, acc: unknown) => s + ((acc as Record<string, number>).balance || 0), 0);
      return JSON.stringify({
        annee: year,
        chiffre_affaires_TTC: totalCA.toFixed(2),
        nb_factures_payees: pArr.length,
        total_factures_impayees_TTC: totalUnpaid.toFixed(2),
        nb_factures_impayees: uArr.length,
        solde_tresorerie_total: totalBalance.toFixed(2),
        nb_comptes_bancaires: bArr.length,
      }, null, 2);
    }

    case 'get_indicateurs_financiers': {
      const year = (args.year as number) || new Date().getFullYear();
      const sqlYear = `(t.datef:>='${year}-01-01') and (t.datef:<='${year}-12-31')`;
      const [paidInvoices, unpaidInvoices, draftInvoices, bankAccounts, spPaid, spUnpaid] = await Promise.all([
        api.get<unknown[]>('/invoices', { status: 2, limit: 1000, sqlfilters: sqlYear }),
        api.get<unknown[]>('/invoices', { status: 1, limit: 1000 }),
        api.get<unknown[]>('/invoices', { status: 0, limit: 100 }),
        api.get<unknown[]>('/bankaccounts', { status: 1 }),
        api.get<unknown[]>('/supplierinvoices', { status: 2, limit: 1000, sqlfilters: sqlYear }).catch(() => []),
        api.get<unknown[]>('/supplierinvoices', { status: 1, limit: 1000 }).catch(() => []),
      ]);
      const pArr = Array.isArray(paidInvoices) ? paidInvoices : [];
      const uArr = Array.isArray(unpaidInvoices) ? unpaidInvoices : [];
      const dArr = Array.isArray(draftInvoices) ? draftInvoices : [];
      const bArr = Array.isArray(bankAccounts) ? bankAccounts : [];
      const spArr = Array.isArray(spPaid) ? spPaid : [];
      const suArr = Array.isArray(spUnpaid) ? spUnpaid : [];
      const sum = (arr: unknown[], key: string): number => arr.reduce((s: number, inv) => s + Number((inv as Record<string, number>)[key] || 0), 0);
      const ca_ttc: number = sum(pArr, 'total_ttc');
      const ca_ht: number = sum(pArr, 'total_ht');
      const creances: number = sum(uArr, 'total_ttc');
      const dettes: number = sum(suArr, 'total_ttc');
      const tresorerie: number = bArr.reduce((s: number, acc) => s + Number((acc as Record<string, number>).balance || 0), 0);
      const achats_ht: number = sum(spArr, 'total_ht');
      const marge_brute: number = ca_ht - achats_ht;
      const taux_marge: number = ca_ht > 0 ? marge_brute / ca_ht * 100 : 0;
      const dso: number = ca_ttc > 0 ? Math.round(creances / (ca_ttc / 365)) : 0;
      const dpo: number = achats_ht > 0 ? Math.round(dettes / (achats_ht / 365)) : 0;
      return JSON.stringify({
        titre: `Indicateurs Financiers ${year}`,
        chiffre_affaires: { ca_ttc: ca_ttc.toFixed(2), ca_ht: ca_ht.toFixed(2), nb_factures_payees: pArr.length },
        achats: { total_ht: achats_ht.toFixed(2), nb_factures_fournisseurs: spArr.length },
        marge: { marge_brute_ht: marge_brute.toFixed(2), taux_marge_pct: taux_marge.toFixed(1) },
        tresorerie: { solde_total: tresorerie.toFixed(2), nb_comptes: bArr.length },
        balance_commerciale: {
          creances_clients: creances.toFixed(2),
          dettes_fournisseurs: dettes.toFixed(2),
          besoin_fonds_roulement: (creances - dettes).toFixed(2),
        },
        ratios: { dso_jours: dso, dpo_jours: dpo, nb_factures_en_attente: uArr.length, nb_factures_brouillon: dArr.length },
      }, null, 2);
    }

    case 'get_compte_resultat': {
      const dateStart = args.date_start as string;
      const dateEnd = args.date_end as string;
      const params: Record<string, unknown> = { limit: 10000 };
      if (dateStart) params.date_start = Math.floor(new Date(dateStart).getTime() / 1000);
      if (dateEnd) params.date_end = Math.floor(new Date(dateEnd).getTime() / 1000);
      const entries = await api.get<unknown[]>('/accountancy/bookkeeping', params);
      const arr = Array.isArray(entries) ? entries : [];
      type AccLine = { compte: string; libelle: string; debit: number; credit: number };
      const produits = new Map<string, AccLine>();
      const charges = new Map<string, AccLine>();
      for (const e of arr) {
        const entry = e as Record<string, unknown>;
        const num = String(entry.numero_compte_generale || entry.numero_compte || '');
        if (!num) continue;
        const lib = String(entry.label_compte_generale || entry.label_compte || '');
        const key = args.detail_level === 'classe' ? num.charAt(0) : num;
        const debit = Number(entry.debit || 0);
        const credit = Number(entry.credit || 0);
        const addTo = (map: Map<string, AccLine>) => {
          if (!map.has(key)) map.set(key, { compte: key, libelle: lib, debit: 0, credit: 0 });
          const l = map.get(key)!;
          l.debit += debit;
          l.credit += credit;
        };
        if (num.startsWith('7')) addTo(produits);
        else if (num.startsWith('6')) addTo(charges);
      }
      const toArr = (map: Map<string, AccLine>, creditNormal: boolean) =>
        Array.from(map.values()).sort((a, b) => a.compte.localeCompare(b.compte))
          .map(l => ({ compte: l.compte, libelle: l.libelle, montant: (creditNormal ? l.credit - l.debit : l.debit - l.credit).toFixed(2) }));
      const totalProduits = Array.from(produits.values()).reduce((s, l) => s + l.credit - l.debit, 0);
      const totalCharges = Array.from(charges.values()).reduce((s, l) => s + l.debit - l.credit, 0);
      const resultat = totalProduits - totalCharges;
      return JSON.stringify({
        titre: 'Compte de Résultat',
        periode: { debut: dateStart, fin: dateEnd },
        produits: { detail: toArr(produits, true), total: totalProduits.toFixed(2) },
        charges: { detail: toArr(charges, false), total: totalCharges.toFixed(2) },
        resultat_net: resultat.toFixed(2),
        nature_resultat: resultat >= 0 ? 'Bénéfice' : 'Perte',
      }, null, 2);
    }

    case 'get_bilan': {
      const dateEnd = args.date_end as string;
      const params: Record<string, unknown> = { limit: 10000 };
      params.date_end = Math.floor(new Date(dateEnd).getTime() / 1000);
      const entries = await api.get<unknown[]>('/accountancy/bookkeeping', params);
      const arr = Array.isArray(entries) ? entries : [];
      type BilanLine = { compte: string; libelle: string; debit: number; credit: number };
      const comptes = new Map<string, BilanLine>();
      for (const e of arr) {
        const entry = e as Record<string, unknown>;
        const num = String(entry.numero_compte_generale || entry.numero_compte || '');
        if (!num || !['1','2','3','4','5'].includes(num.charAt(0))) continue;
        const lib = String(entry.label_compte_generale || entry.label_compte || '');
        const key = args.detail_level === 'classe' ? num.charAt(0) : num;
        if (!comptes.has(key)) comptes.set(key, { compte: key, libelle: lib, debit: 0, credit: 0 });
        const c = comptes.get(key)!;
        c.debit += Number(entry.debit || 0);
        c.credit += Number(entry.credit || 0);
      }
      const actif: Array<{compte: string; libelle: string; montant: string}> = [];
      const passif: Array<{compte: string; libelle: string; montant: string}> = [];
      for (const [, line] of comptes) {
        const solde = line.debit - line.credit;
        const classe = line.compte.charAt(0);
        if (['2','3','5'].includes(classe)) {
          if (solde !== 0) actif.push({ compte: line.compte, libelle: line.libelle, montant: solde.toFixed(2) });
        } else if (classe === '1') {
          if (solde !== 0) passif.push({ compte: line.compte, libelle: line.libelle, montant: (-solde).toFixed(2) });
        } else {
          // Classe 4 : actif si débiteur, passif si créditeur
          if (solde > 0) actif.push({ compte: line.compte, libelle: line.libelle, montant: solde.toFixed(2) });
          else if (solde < 0) passif.push({ compte: line.compte, libelle: line.libelle, montant: (-solde).toFixed(2) });
        }
      }
      actif.sort((a, b) => a.compte.localeCompare(b.compte));
      passif.sort((a, b) => a.compte.localeCompare(b.compte));
      const totalActif = actif.reduce((s, l) => s + Number(l.montant), 0);
      const totalPassif = passif.reduce((s, l) => s + Number(l.montant), 0);
      return JSON.stringify({
        titre: 'Bilan Comptable',
        date_arrete: dateEnd,
        actif: { detail: actif, total: totalActif.toFixed(2) },
        passif: { detail: passif, total: totalPassif.toFixed(2) },
        equilibre: Math.abs(totalActif - totalPassif) < 1 ? '✅ Équilibré' : `⚠️ Différence: ${(totalActif - totalPassif).toFixed(2)}`,
        note: 'Classes 6 et 7 exclues (compte de résultat). Clôturer l\'exercice pour intégrer le résultat au bilan.',
      }, null, 2);
    }

    case 'get_rapport_creances_clients': {
      const dateRef = args.date_reference ? new Date(args.date_reference as string) : new Date();
      const invoices = await api.get<unknown[]>('/invoices', { status: 1, limit: args.limit || 1000 });
      const arr = Array.isArray(invoices) ? invoices : [];
      type Tranche = { nb: number; total_ttc: number; factures: Array<{ref: string; client: string; montant: string; echeance: string; jours_retard: number}> };
      const tranches: Record<string, Tranche> = {
        non_echues: { nb: 0, total_ttc: 0, factures: [] },
        moins_30j: { nb: 0, total_ttc: 0, factures: [] },
        de_30a60j: { nb: 0, total_ttc: 0, factures: [] },
        de_60a90j: { nb: 0, total_ttc: 0, factures: [] },
        plus_90j: { nb: 0, total_ttc: 0, factures: [] },
      };
      for (const inv of arr) {
        const doc = inv as Record<string, unknown>;
        const echeance = doc.date_lim_reglement ? new Date((doc.date_lim_reglement as number) * 1000) : null;
        const ttc = Number(doc.total_ttc || doc.remaintopay || 0);
        const ref = String(doc.ref || doc.id || '');
        const client = String(doc.socnom || doc.name || '');
        const echeanceStr = echeance ? echeance.toISOString().slice(0, 10) : 'N/A';
        if (!echeance || echeance > dateRef) {
          tranches.non_echues.nb++; tranches.non_echues.total_ttc += ttc;
          tranches.non_echues.factures.push({ ref, client, montant: ttc.toFixed(2), echeance: echeanceStr, jours_retard: 0 });
        } else {
          const jours = Math.floor((dateRef.getTime() - echeance.getTime()) / 86400000);
          const key = jours <= 30 ? 'moins_30j' : jours <= 60 ? 'de_30a60j' : jours <= 90 ? 'de_60a90j' : 'plus_90j';
          tranches[key].nb++; tranches[key].total_ttc += ttc;
          tranches[key].factures.push({ ref, client, montant: ttc.toFixed(2), echeance: echeanceStr, jours_retard: jours });
        }
      }
      const totalGeneral = Object.values(tranches).reduce((s, t) => s + t.total_ttc, 0);
      return JSON.stringify({
        titre: 'Balance Âgée des Créances Clients',
        date_reference: dateRef.toISOString().slice(0, 10),
        tranches: Object.entries(tranches).map(([k, v]) => ({ tranche: k, nb_factures: v.nb, total_ttc: v.total_ttc.toFixed(2), factures: v.factures })),
        total_general: totalGeneral.toFixed(2),
      }, null, 2);
    }

    case 'get_rapport_dettes_fournisseurs': {
      const dateRef = args.date_reference ? new Date(args.date_reference as string) : new Date();
      const invoices = await api.get<unknown[]>('/supplierinvoices', { status: 1, limit: args.limit || 500 }).catch(() => []);
      const arr = Array.isArray(invoices) ? invoices : [];
      type Tranche = { nb: number; total_ttc: number; factures: Array<{ref: string; fournisseur: string; montant: string; echeance: string; jours_retard: number}> };
      const tranches: Record<string, Tranche> = {
        non_echues: { nb: 0, total_ttc: 0, factures: [] },
        moins_30j: { nb: 0, total_ttc: 0, factures: [] },
        de_30a60j: { nb: 0, total_ttc: 0, factures: [] },
        de_60a90j: { nb: 0, total_ttc: 0, factures: [] },
        plus_90j: { nb: 0, total_ttc: 0, factures: [] },
      };
      for (const inv of arr) {
        const doc = inv as Record<string, unknown>;
        const echeance = doc.date_lim_reglement ? new Date((doc.date_lim_reglement as number) * 1000) : null;
        const ttc = Number(doc.total_ttc || doc.remaintopay || 0);
        const ref = String(doc.ref || doc.id || '');
        const fournisseur = String(doc.socnom || doc.name || '');
        const echeanceStr = echeance ? echeance.toISOString().slice(0, 10) : 'N/A';
        if (!echeance || echeance > dateRef) {
          tranches.non_echues.nb++; tranches.non_echues.total_ttc += ttc;
          tranches.non_echues.factures.push({ ref, fournisseur, montant: ttc.toFixed(2), echeance: echeanceStr, jours_retard: 0 });
        } else {
          const jours = Math.floor((dateRef.getTime() - echeance.getTime()) / 86400000);
          const key = jours <= 30 ? 'moins_30j' : jours <= 60 ? 'de_30a60j' : jours <= 90 ? 'de_60a90j' : 'plus_90j';
          tranches[key].nb++; tranches[key].total_ttc += ttc;
          tranches[key].factures.push({ ref, fournisseur, montant: ttc.toFixed(2), echeance: echeanceStr, jours_retard: jours });
        }
      }
      const totalGeneral = Object.values(tranches).reduce((s, t) => s + t.total_ttc, 0);
      return JSON.stringify({
        titre: 'Balance Âgée des Dettes Fournisseurs',
        date_reference: dateRef.toISOString().slice(0, 10),
        tranches: Object.entries(tranches).map(([k, v]) => ({ tranche: k, nb_factures: v.nb, total_ttc: v.total_ttc.toFixed(2), factures: v.factures })),
        total_general: totalGeneral.toFixed(2),
      }, null, 2);
    }

    case 'get_cash_flow': {
      const dateStart = args.date_start as string;
      const dateEnd = args.date_end as string;
      const accounts = await api.get<unknown[]>('/bankaccounts', { status: 1 });
      const accountArr = Array.isArray(accounts) ? accounts : [];
      const sqlFilter = `(t.datev:>='${dateStart}') and (t.datev:<='${dateEnd}')`;
      let totalEntrees = 0, totalSorties = 0;
      const details = [];
      for (const account of accountArr) {
        const acc = account as Record<string, unknown>;
        const transactions = await api.get<unknown[]>(`/bankaccounts/${acc.id}/lines`, { limit: 5000, sqlfilters: sqlFilter });
        const txArr = Array.isArray(transactions) ? transactions : [];
        let entrees = 0, sorties = 0;
        for (const tx of txArr) {
          const t = tx as Record<string, unknown>;
          const amount = Number(t.amount || 0);
          if (amount > 0) entrees += amount; else sorties += Math.abs(amount);
        }
        totalEntrees += entrees; totalSorties += sorties;
        details.push({ compte: String(acc.label || acc.ref || acc.id), entrees: entrees.toFixed(2), sorties: sorties.toFixed(2), flux_net: (entrees - sorties).toFixed(2), nb_transactions: txArr.length });
      }
      return JSON.stringify({
        titre: 'Tableau de Flux de Trésorerie',
        periode: { debut: dateStart, fin: dateEnd },
        comptes_bancaires: details,
        totaux: { total_entrees: totalEntrees.toFixed(2), total_sorties: totalSorties.toFixed(2), flux_net_global: (totalEntrees - totalSorties).toFixed(2) },
      }, null, 2);
    }

    case 'get_solde_compte': {
      const accountNumber = String(args.account_number);
      const params: Record<string, unknown> = { limit: 10000, search_accountancy_code_start: accountNumber };
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      const entries = await api.get<unknown[]>('/accountancy/bookkeeping', params);
      const arr = Array.isArray(entries) ? entries : [];
      let totalDebit = 0, totalCredit = 0, libelle = '';
      for (const e of arr) {
        const entry = e as Record<string, unknown>;
        const num = String(entry.numero_compte_generale || entry.numero_compte || '');
        if (!num.startsWith(accountNumber)) continue;
        if (!libelle) libelle = String(entry.label_compte_generale || entry.label_compte || '');
        totalDebit += Number(entry.debit || 0);
        totalCredit += Number(entry.credit || 0);
      }
      const solde = totalDebit - totalCredit;
      return JSON.stringify({
        compte: accountNumber, libelle,
        periode: { debut: args.date_start || 'début', fin: args.date_end || 'fin' },
        total_debit: totalDebit.toFixed(2), total_credit: totalCredit.toFixed(2),
        solde: solde.toFixed(2),
        sens: solde > 0 ? 'Débiteur' : solde < 0 ? 'Créditeur' : 'Soldé',
        nb_ecritures: arr.length,
      }, null, 2);
    }

    // ── BALANCE & GRAND LIVRE ────────────────────────────────────────────────
    case 'get_balance_generale': {
      const params: Record<string, unknown> = { limit: args.limit || 5000 };
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      const entries = await api.get<unknown[]>('/accountancy/bookkeeping', params);
      const arr = Array.isArray(entries) ? entries : [];
      type AccountBalance = { numero: string; libelle: string; total_debit: number; total_credit: number; solde: number };
      const balances = new Map<string, AccountBalance>();
      for (const e of arr) {
        const entry = e as Record<string, unknown>;
        const num = String(entry.numero_compte_generale || entry.numero_compte || '');
        const lib = String(entry.label_compte_generale || entry.label_compte || entry.label || '');
        if (!num) continue;
        if (args.class_filter && !num.startsWith(String(args.class_filter))) continue;
        if (!balances.has(num)) balances.set(num, { numero: num, libelle: lib, total_debit: 0, total_credit: 0, solde: 0 });
        const bal = balances.get(num)!;
        bal.total_debit += Number(entry.debit || 0);
        bal.total_credit += Number(entry.credit || 0);
        bal.solde = bal.total_debit - bal.total_credit;
      }
      const result = Array.from(balances.values()).sort((a, b) => a.numero.localeCompare(b.numero));
      const totalDebit = result.reduce((s, r) => s + r.total_debit, 0);
      const totalCredit = result.reduce((s, r) => s + r.total_credit, 0);
      return JSON.stringify({
        periode: { debut: args.date_start || 'début', fin: args.date_end || 'fin' },
        nb_comptes: result.length,
        totaux: { total_debit: totalDebit.toFixed(2), total_credit: totalCredit.toFixed(2) },
        comptes: result.map(r => ({ ...r, total_debit: r.total_debit.toFixed(2), total_credit: r.total_credit.toFixed(2), solde: r.solde.toFixed(2) })),
      }, null, 2);
    }

    case 'get_grand_livre': {
      const params: Record<string, unknown> = { limit: args.limit || 500 };
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      if (args.account_number) params.search_accountancy_code_start = args.account_number;
      const entries = await api.get<unknown[]>('/accountancy/bookkeeping', params);
      const arr = Array.isArray(entries) ? entries : [];
      type LedgerEntry = { date: string; piece_ref: string; libelle: string; journal: string; debit: number; credit: number; solde_progressif: number };
      type LedgerAccount = { numero: string; libelle: string; ecritures: LedgerEntry[]; total_debit: number; total_credit: number; solde_final: number };
      const accounts = new Map<string, LedgerAccount>();
      for (const e of arr) {
        const entry = e as Record<string, unknown>;
        const num = String(entry.numero_compte_generale || entry.numero_compte || '');
        const lib = String(entry.label_compte_generale || entry.label_compte || '');
        if (!num) continue;
        if (args.account_number && !num.startsWith(String(args.account_number))) continue;
        if (!accounts.has(num)) accounts.set(num, { numero: num, libelle: lib, ecritures: [], total_debit: 0, total_credit: 0, solde_final: 0 });
        const acc = accounts.get(num)!;
        const debit = Number(entry.debit || 0);
        const credit = Number(entry.credit || 0);
        acc.total_debit += debit; acc.total_credit += credit;
        acc.solde_final = acc.total_debit - acc.total_credit;
        acc.ecritures.push({ date: String(entry.doc_date || ''), piece_ref: String(entry.piece_num || ''), libelle: String(entry.label || ''), journal: String(entry.code_journal || ''), debit, credit, solde_progressif: acc.solde_final });
      }
      const result = Array.from(accounts.values()).sort((a, b) => a.numero.localeCompare(b.numero));
      return JSON.stringify({
        periode: { debut: args.date_start || 'début', fin: args.date_end || 'fin' },
        nb_comptes: result.length,
        grand_livre: result.map(acc => ({
          ...acc,
          total_debit: acc.total_debit.toFixed(2), total_credit: acc.total_credit.toFixed(2), solde_final: acc.solde_final.toFixed(2),
          ecritures: acc.ecritures.map(ec => ({ ...ec, debit: ec.debit.toFixed(2), credit: ec.credit.toFixed(2), solde_progressif: ec.solde_progressif.toFixed(2) })),
        })),
      }, null, 2);
    }

    // ── EXPORTS ──────────────────────────────────────────────────────────────
    case 'export_ecritures_fec': {
      const params: Record<string, unknown> = { limit: args.limit || 10000 };
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      if (args.journal_code) params.journal_code = args.journal_code;
      const entries = await api.get<unknown[]>('/accountancy/bookkeeping', params);
      const arr = Array.isArray(entries) ? entries : [];
      const header = 'JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise';
      const lines = [header];
      for (const e of arr) {
        const entry = e as Record<string, unknown>;
        const fmtDate = (ts: unknown) => {
          if (!ts) return '';
          const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(String(ts));
          return d.toISOString().slice(0, 10).replace(/-/g, '');
        };
        const fmtAmt = (v: unknown) => Math.abs(Number(v || 0)).toFixed(2).replace('.', ',');
        lines.push([
          entry.code_journal || '',
          entry.journal_label || entry.code_journal || '',
          entry.piece_num || entry.id || '',
          fmtDate(entry.doc_date || entry.date),
          entry.numero_compte_generale || entry.numero_compte || '',
          String(entry.label_compte_generale || entry.label_compte || '').replace(/\|/g, ' '),
          entry.subledger_account || '',
          String(entry.subledger_label || '').replace(/\|/g, ' '),
          entry.piece_num || entry.ref || '',
          fmtDate(entry.doc_date || entry.date),
          String(entry.label || '').replace(/\|/g, ' '),
          fmtAmt(entry.debit),
          fmtAmt(entry.credit),
          entry.lettering || '',
          fmtDate(entry.date_lettering),
          fmtDate(entry.date_validated),
          '', '',
        ].join('|'));
      }
      return `Format FEC (${arr.length} écritures)\n\n${lines.join('\n')}`;
    }

    case 'export_balance_csv': {
      const params: Record<string, unknown> = { limit: 5000 };
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      const entries = await api.get<unknown[]>('/accountancy/bookkeeping', params);
      const arr = Array.isArray(entries) ? entries : [];
      type AccountBalance = { libelle: string; total_debit: number; total_credit: number };
      const balances = new Map<string, AccountBalance>();
      for (const e of arr) {
        const entry = e as Record<string, unknown>;
        const num = String(entry.numero_compte_generale || entry.numero_compte || '');
        const lib = String(entry.label_compte_generale || entry.label_compte || '');
        if (!num) continue;
        if (args.class_filter && !num.startsWith(String(args.class_filter))) continue;
        if (!balances.has(num)) balances.set(num, { libelle: lib, total_debit: 0, total_credit: 0 });
        const bal = balances.get(num)!;
        bal.total_debit += Number(entry.debit || 0);
        bal.total_credit += Number(entry.credit || 0);
      }
      const header = 'Compte;Libellé;Débit;Crédit;Solde';
      const lines = [header];
      const sorted = Array.from(balances.entries()).sort(([a], [b]) => a.localeCompare(b));
      for (const [num, bal] of sorted) {
        const solde = bal.total_debit - bal.total_credit;
        lines.push(`${num};"${bal.libelle}";${bal.total_debit.toFixed(2)};${bal.total_credit.toFixed(2)};${solde.toFixed(2)}`);
      }
      return `Balance Générale CSV (${sorted.length} comptes)\n\n${lines.join('\n')}`;
    }

    case 'export_grand_livre_csv': {
      const params: Record<string, unknown> = { limit: 10000 };
      if (args.date_start) params.date_start = Math.floor(new Date(args.date_start as string).getTime() / 1000);
      if (args.date_end) params.date_end = Math.floor(new Date(args.date_end as string).getTime() / 1000);
      if (args.account_number) params.search_accountancy_code_start = args.account_number;
      const entries = await api.get<unknown[]>('/accountancy/bookkeeping', params);
      const arr = Array.isArray(entries) ? entries : [];
      const header = 'Compte;Libellé Compte;Date;Pièce;Journal;Libellé Écriture;Débit;Crédit';
      const lines = [header];
      for (const e of arr) {
        const entry = e as Record<string, unknown>;
        const num = String(entry.numero_compte_generale || entry.numero_compte || '');
        if (!num) continue;
        if (args.account_number && !num.startsWith(String(args.account_number))) continue;
        const date = entry.doc_date ? new Date((entry.doc_date as number) * 1000).toISOString().slice(0, 10) : '';
        lines.push([
          num,
          `"${entry.label_compte_generale || entry.label_compte || ''}"`,
          date,
          entry.piece_num || '',
          entry.code_journal || '',
          `"${String(entry.label || '').replace(/"/g, '""')}"`,
          Number(entry.debit || 0).toFixed(2),
          Number(entry.credit || 0).toFixed(2),
        ].join(';'));
      }
      return `Grand Livre CSV (${arr.length} lignes)\n\n${lines.join('\n')}`;
    }

    // ── TVA ──────────────────────────────────────────────────────────────────
    case 'get_rapport_tva': {
      const dateStart = args.date_start as string;
      const dateEnd = args.date_end as string;
      const sqlFilter = `(t.datef:>='${dateStart}') and (t.datef:<='${dateEnd}')`;
      const [clientInvoices, supplierInvoices, clientCreditNotes, supplierCreditNotes] = await Promise.all([
        api.get<unknown[]>('/invoices', { status: 2, limit: 5000, sqlfilters: sqlFilter }),
        api.get<unknown[]>('/supplierinvoices', { status: 2, limit: 5000, sqlfilters: sqlFilter }).catch(() => []),
        api.get<unknown[]>('/invoices', { status: 2, limit: 500, type: 2, sqlfilters: sqlFilter }).catch(() => []),
        api.get<unknown[]>('/supplierinvoices', { status: 2, limit: 500, type: 2, sqlfilters: sqlFilter }).catch(() => []),
      ]);
      type TvaRate = { base_ht: number; tva: number; nb_docs: number };
      const collectee = new Map<string, TvaRate>();
      const deductible = new Map<string, TvaRate>();
      const aggregate = (invoices: unknown[], map: Map<string, TvaRate>, sign = 1) => {
        for (const inv of (Array.isArray(invoices) ? invoices : [])) {
          const doc = inv as Record<string, unknown>;
          const ht = Number(doc.total_ht || 0) * sign;
          const tva = Number(doc.total_tva || 0) * sign;
          const rate = doc.tva_tx !== undefined ? String(doc.tva_tx) : 'mixte';
          if (!map.has(rate)) map.set(rate, { base_ht: 0, tva: 0, nb_docs: 0 });
          const r = map.get(rate)!;
          r.base_ht += ht; r.tva += tva; r.nb_docs += 1;
        }
      };
      aggregate(Array.isArray(clientInvoices) ? clientInvoices : [], collectee, 1);
      aggregate(Array.isArray(clientCreditNotes) ? clientCreditNotes : [], collectee, -1);
      aggregate(Array.isArray(supplierInvoices) ? supplierInvoices : [], deductible, 1);
      aggregate(Array.isArray(supplierCreditNotes) ? supplierCreditNotes : [], deductible, -1);
      const toObj = (map: Map<string, TvaRate>) => Object.fromEntries(
        Array.from(map.entries()).map(([rate, v]) => [`taux_${rate}%`, { base_ht: v.base_ht.toFixed(2), tva: v.tva.toFixed(2), nb_documents: v.nb_docs }])
      );
      const totalCollectee = Array.from(collectee.values()).reduce((s, v) => s + v.tva, 0);
      const totalDeductible = Array.from(deductible.values()).reduce((s, v) => s + v.tva, 0);
      const tvaARegler = totalCollectee - totalDeductible;
      return JSON.stringify({
        periode: { debut: dateStart, fin: dateEnd },
        tva_collectee: { detail_par_taux: toObj(collectee), total: totalCollectee.toFixed(2) },
        tva_deductible: { detail_par_taux: toObj(deductible), total: totalDeductible.toFixed(2) },
        tva_nette_a_regler: tvaARegler.toFixed(2),
        note: tvaARegler >= 0 ? 'Solde dû au Trésor' : 'Crédit de TVA',
      }, null, 2);
    }

    // ── PAIEMENTS ────────────────────────────────────────────────────────────
    case 'list_payments': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.date_start) params.date_start = args.date_start;
      if (args.date_end) params.date_end = args.date_end;
      const data = await api.get('/invoices/payments', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_payment': {
      const data = await api.get(`/invoices/payments/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'delete_payment': {
      await api.delete(`/invoices/payments/${args.id}`);
      return `✅ Paiement #${args.id} supprimé. La facture associée a été réouverte.`;
    }
    case 'list_supplier_payments': {
      const params: Record<string, unknown> = { limit: args.limit || 100 };
      if (args.date_start) params.date_start = args.date_start;
      if (args.date_end) params.date_end = args.date_end;
      const data = await api.get('/supplierinvoices/payments', params);
      return JSON.stringify(data, null, 2);
    }
    case 'get_supplier_payment': {
      const data = await api.get(`/supplierinvoices/payments/${args.id}`);
      return JSON.stringify(data, null, 2);
    }
    case 'delete_supplier_payment': {
      await api.delete(`/supplierinvoices/payments/${args.id}`);
      return `✅ Paiement fournisseur #${args.id} supprimé.`;
    }

    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
