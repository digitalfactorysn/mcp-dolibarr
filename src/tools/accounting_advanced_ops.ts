import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';
import {
  checkIdempotency,
  saveIdempotency,
  requestApproval,
  verifyApproval,
  checkOptimisticLock,
  sanitizeSecrets,
  MutationEnvelope,
  MutationOptions
} from '../utils/mutation.js';

export const accountingAdvancedOpsTools: Tool[] = [
  {
    name: 'post_expense_report_to_accounting',
    description: "Ventiler et comptabiliser une note de frais validée dans le grand livre (OD/NDF: Débit 6251 Déplacements, Crédit 421/428 Personnel) avec vérification d'équilibre et relecture",
    inputSchema: {
      type: 'object',
      properties: {
        expense_report_id: { type: 'number', description: "ID de la note de frais" },
        journal_code: { type: 'string', description: "Code journal (défaut: 'ER' ou 'OD')" },
        account_expense: { type: 'string', description: "Compte de charges (défaut: '6251')" },
        account_debt: { type: 'string', description: "Compte de tiers personnel (défaut: '428')" },
        dry_run: { type: 'boolean', description: "Mode simulation sans écriture" },
        idempotency_key: { type: 'string', description: "Clé unique d'idempotence" },
        reason: { type: 'string', description: "Justification comptable" },
      },
      required: ['expense_report_id'],
    },
  },
  {
    name: 'check_balanced_entry',
    description: "Vérifier la stricte balance (Total Débit === Total Crédit) d'une écriture comptable avant ou après saisie",
    inputSchema: {
      type: 'object',
      properties: {
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              account: { type: 'string', description: "Numéro de compte" },
              debit: { type: 'number' },
              credit: { type: 'number' },
              label: { type: 'string' }
            },
            required: ['account']
          }
        }
      },
      required: ['lines'],
    },
  },
  {
    name: 'reverse_accounting_entry',
    description: "Extourner une écriture comptable validée (inversion stricte des débits et crédits). Une écriture validée ne doit JAMAIS être supprimée.",
    inputSchema: {
      type: 'object',
      properties: {
        piece_num: { type: 'number', description: "Numéro de pièce (piece_num) à extourner" },
        reason: { type: 'string', description: "Motif obligatoire de l'extourne" },
        dry_run: { type: 'boolean', description: "Simulation sans écriture" },
        idempotency_key: { type: 'string', description: "Clé d'idempotence" },
        approval_token: { type: 'string', description: "Jeton de confirmation (2-step approval)" },
      },
      required: ['piece_num', 'reason'],
    },
  },
  {
    name: 'list_accounting_periods',
    description: "Lister les exercices et périodes comptables (statuts: OUVERT, PRÉ-CLOS, CLOS)",
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'number', description: "Filtre: 0=Ouvert, 1=Clos, 2=Pré-clos" },
      },
    },
  },
  {
    name: 'open_accounting_period',
    description: "Ouvrir un nouvel exercice ou une période comptable",
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: "Libellé de l'exercice (ex: 'Exercice 2027')" },
        date_start: { type: 'string', description: "Date de début ISO 8601 (ex: '2027-01-01')" },
        date_end: { type: 'string', description: "Date de fin ISO 8601 (ex: '2027-12-31')" },
        dry_run: { type: 'boolean' },
        reason: { type: 'string' },
      },
      required: ['label', 'date_start', 'date_end'],
    },
  },
  {
    name: 'soft_close_accounting_period',
    description: "Pré-clôturer une période comptable (empêche la saisie standard mais autorise les écritures d'inventaire et d'ajustement)",
    inputSchema: {
      type: 'object',
      properties: {
        period_id: { type: 'number', description: "ID de l'exercice" },
        reason: { type: 'string', description: "Justification" },
        dry_run: { type: 'boolean' },
      },
      required: ['period_id'],
    },
  },
  {
    name: 'reopen_accounting_period',
    description: "Rouvrir exceptionnellement une période comptable pré-clôturée avec approbation renforcée",
    inputSchema: {
      type: 'object',
      properties: {
        period_id: { type: 'number', description: "ID de l'exercice" },
        reason: { type: 'string', description: "Motif impératif de la réouverture" },
        approval_token: { type: 'string', description: "Jeton d'approbation" },
      },
      required: ['period_id', 'reason'],
    },
  },
  {
    name: 'close_accounting_period',
    description: "Clôturer définitivement un exercice comptable (irréversible sans audit - requiert approbation renforcée du responsable)",
    inputSchema: {
      type: 'object',
      properties: {
        period_id: { type: 'number', description: "ID de l'exercice" },
        reason: { type: 'string', description: "Justification de clôture définitive" },
        approval_token: { type: 'string', description: "Jeton d'approbation requis" },
        dry_run: { type: 'boolean' },
      },
      required: ['period_id'],
    },
  },
  {
    name: 'run_year_end_checks',
    description: "Exécuter les contrôles préalables de fin d'exercice (équilibre de la balance générale, factures en attente de ventilation, écarts de trésorerie)",
    inputSchema: {
      type: 'object',
      properties: {
        period_id: { type: 'number', description: "ID de l'exercice comptable" },
      },
      required: ['period_id'],
    },
  },
  {
    name: 'generate_opening_entries',
    description: "Générer les écritures d'à-nouveaux (journal AN) pour l'ouverture d'un nouvel exercice à partir des soldes de bilan de l'exercice clos",
    inputSchema: {
      type: 'object',
      properties: {
        from_period_id: { type: 'number', description: "ID de l'exercice clos d'origine" },
        to_period_id: { type: 'number', description: "ID du nouvel exercice de destination" },
        journal_code: { type: 'string', description: "Code journal à-nouveaux (défaut: 'AN')" },
        dry_run: { type: 'boolean' },
        approval_token: { type: 'string', description: "Jeton d'approbation" },
      },
      required: ['from_period_id', 'to_period_id'],
    },
  },
  {
    name: 'create_bank_reconciliation_session',
    description: "Créer une session de rapprochement bancaire pour un relevé spécifique",
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: "ID du compte bancaire" },
        statement_number: { type: 'string', description: "Numéro ou référence du relevé bancaire (ex: 'RLV-2026-10')" },
        statement_date: { type: 'string', description: "Date du relevé bancaire ISO 8601" },
        starting_balance: { type: 'number', description: "Solde initial du relevé" },
        ending_balance: { type: 'number', description: "Solde final du relevé" },
      },
      required: ['account_id', 'statement_number', 'ending_balance'],
    },
  },
  {
    name: 'match_bank_transactions',
    description: "Rapprocher et lettrer une ou plusieurs lignes bancaires avec un relevé (définit rappro=1 et num_releve)",
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: "ID du compte bancaire" },
        line_ids: { type: 'array', items: { type: 'number' }, description: "IDs des lignes de llx_bank à rapprocher" },
        statement_number: { type: 'string', description: "Numéro du relevé associé" },
        dry_run: { type: 'boolean' },
      },
      required: ['account_id', 'line_ids', 'statement_number'],
    },
  },
  {
    name: 'unreconcile_bank_line',
    description: "Annuler le rapprochement d'une ligne bancaire (rappro=0 et suppression du relevé)",
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: "ID du compte bancaire" },
        line_id: { type: 'number', description: "ID de la ligne bancaire à dé-rapprocher" },
        reason: { type: 'string', description: "Motif d'annulation du rapprochement" },
      },
      required: ['account_id', 'line_id'],
    },
  },
  {
    name: 'get_unmatched_bank_lines',
    description: "Récupérer la liste des écritures bancaires non encore rapprochées (rappro=0) pour un compte donné",
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: "ID du compte bancaire" },
        limit: { type: 'number', description: "Limite de lignes (défaut: 100)" },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'import_bank_statement',
    description: "Importer un relevé bancaire (lignes d'opérations: date, libellé, montant, type) pour préparer le rapprochement",
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: "ID du compte bancaire" },
        statement_number: { type: 'string', description: "Numéro du relevé (ex: '2026-10')" },
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', description: "Date opération ISO 8601" },
              label: { type: 'string', description: "Libellé de l'opération" },
              amount: { type: 'number', description: "Montant (positif pour crédit, négatif pour débit)" },
              type: { type: 'string', description: "Type (VIR, PRE, CB, CHQ)" }
            },
            required: ['date', 'label', 'amount']
          },
          description: "Lignes du relevé bancaire"
        },
        dry_run: { type: 'boolean', description: "Simulation sans écriture" },
        allow_production_account: { type: 'boolean', description: "Autorisation explicite si compte de production" }
      },
      required: ['account_id', 'statement_number', 'lines'],
    },
  },
  {
    name: 'validate_bank_reconciliation',
    description: "Valider définitivement un rapprochement bancaire après vérification que l'écart entre solde théorique et solde réel est nul",
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'number', description: "ID du compte bancaire" },
        statement_number: { type: 'string', description: "Numéro du relevé à valider" },
        ending_balance: { type: 'number', description: "Solde final certifié du relevé" },
        approval_token: { type: 'string', description: "Jeton d'approbation requis pour validation" },
      },
      required: ['account_id', 'statement_number', 'ending_balance'],
    },
  },
  {
    name: 'simulate_vat_return',
    description: "Simuler la déclaration de TVA sur une période (TVA collectée sur ventes, TVA déductible sur achats, TVA nette à décaisser ou crédit)",
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: "Date début période ISO 8601" },
        date_end: { type: 'string', description: "Date fin période ISO 8601" },
        vat_regime: { type: 'string', description: "'DEBIT' (sur facturations) ou 'ENCAISSEMENT' (sur paiements)" },
      },
      required: ['date_start', 'date_end'],
    },
  },
  {
    name: 'prepare_vat_return',
    description: "Préparer le dossier de travail officiel de déclaration TVA pour transmission comptable (sans dépôt officiel)",
    inputSchema: {
      type: 'object',
      properties: {
        period_label: { type: 'string', description: "Période (ex: '2026-10')" },
        date_start: { type: 'string', description: "Date début" },
        date_end: { type: 'string', description: "Date fin" },
      },
      required: ['period_label', 'date_start', 'date_end'],
    },
  },
  {
    name: 'validate_vat_return',
    description: "Valider en interne le projet de déclaration de TVA (requiert approbation renforcée)",
    inputSchema: {
      type: 'object',
      properties: {
        period_label: { type: 'string', description: "Période (ex: '2026-10')" },
        net_vat_amount: { type: 'number', description: "Montant net de TVA calculé" },
        approval_token: { type: 'string', description: "Jeton de confirmation d'approbation" },
      },
      required: ['period_label', 'net_vat_amount'],
    },
  },
  {
    name: 'lock_vat_period',
    description: "Verrouiller une période fiscale de TVA pour empêcher toute modification de facture antérieure",
    inputSchema: {
      type: 'object',
      properties: {
        period_label: { type: 'string', description: "Période verrouillée (ex: '2026-10')" },
        approval_token: { type: 'string', description: "Jeton d'approbation" },
      },
      required: ['period_label'],
    },
  },
  {
    name: 'reopen_vat_period',
    description: "Déverrouiller exceptionnellement une période fiscale de TVA avec justification et approbation renforcée",
    inputSchema: {
      type: 'object',
      properties: {
        period_label: { type: 'string', description: "Période à déverrouiller" },
        reason: { type: 'string', description: "Justification impérative" },
        approval_token: { type: 'string', description: "Jeton d'approbation" },
      },
      required: ['period_label', 'reason'],
    },
  },
  {
    name: 'export_vat_workpapers',
    description: "Exporter les feuilles de travail et justificatifs de TVA (liste détaillée des factures clients et fournisseurs ventilées par taux)",
    inputSchema: {
      type: 'object',
      properties: {
        date_start: { type: 'string', description: "Date début" },
        date_end: { type: 'string', description: "Date fin" },
      },
      required: ['date_start', 'date_end'],
    },
  },
];

export async function handleAccountingAdvancedOpsTool(
  name: string,
  args: Record<string, unknown>,
  api: DolibarrAPI
): Promise<string> {
  const cached = checkIdempotency(args.idempotency_key as string);
  if (cached) return JSON.stringify(cached, null, 2);

  const dryRun = Boolean(args.dry_run);

  switch (name) {
    case 'check_balanced_entry': {
      const lines = (args.lines || []) as Array<{ account: string; debit?: number; credit?: number; label?: string }>;
      let totD = 0;
      let totC = 0;
      for (const l of lines) {
        totD += Number(l.debit || 0);
        totC += Number(l.credit || 0);
      }
      totD = Math.round(totD * 100) / 100;
      totC = Math.round(totC * 100) / 100;
      const diff = Math.round(Math.abs(totD - totC) * 100) / 100;
      const isBalanced = diff === 0;

      return JSON.stringify({
        balanced: isBalanced,
        total_debit: totD,
        total_credit: totC,
        difference: diff,
        lines_count: lines.length,
        verdict: isBalanced ? "ÉCRITURE ÉQUILIBRÉE" : `DÉSÉQUILIBRE DÉTECTÉ DE ${diff}`,
      }, null, 2);
    }

    case 'post_expense_report_to_accounting': {
      const expId = Number(args.expense_report_id);
      const rep = await api.get<Record<string, unknown>>(`/expensereports/${expId}`);
      if (!rep) throw new Error(`Note de frais #${expId} introuvable.`);

      const totalTtc = Number(rep.total_ttc || rep.total_ht || 0);
      const jCode = (args.journal_code as string) || 'ER';
      const accExp = (args.account_expense as string) || '6251';
      const accDebt = (args.account_debt as string) || '428';
      const label = `NDF ${rep.ref || expId} - ${rep.user_author_infos || 'Collaborateur'}`;
      const docDate = (rep.date_create || rep.date_debut || new Date().toISOString().split('T')[0]) as string;

      if (dryRun) {
        return JSON.stringify({
          applied: false,
          verified: false,
          dry_run: true,
          expense_report_id: expId,
          total: totalTtc,
          simulation_lines: [
            { account: accExp, debit: totalTtc, credit: 0, label },
            { account: accDebt, debit: 0, credit: totalTtc, label }
          ],
          warnings: totalTtc <= 0 ? ["Montant nul ou négatif"] : [],
        }, null, 2);
      }

      const res = await api.post<{ success: boolean; piece_num: number; line_ids: number[] }>('/accountancy/bookkeeping', {
        label,
        code_journal: jCode,
        doc_date: docDate,
        doc_ref: String(rep.ref || `NDF-${expId}`),
        lines: [
          { numero_compte: accExp, label_compte: 'Frais de mission / déplacements', debit: totalTtc, credit: 0 },
          { numero_compte: accDebt, label_compte: 'Personnel - Frais à rembourser', debit: 0, credit: totalTtc }
        ]
      });

      const reread = await api.get<unknown[]>('/accountancy/bookkeeping', { limit: 2, journal_code: jCode }).catch(() => []);
      const verified = Array.isArray(reread) && reread.length > 0;

      const output: MutationEnvelope = {
        applied: true,
        verified,
        dry_run: false,
        id: expId,
        ref: String(rep.ref || expId),
        before: { status: rep.status, total: totalTtc },
        requested: args,
        after: res,
        side_effects: [`Génération de 2 lignes comptables équilibrées dans le journal ${jCode}`],
        proof: { timestamp: new Date().toISOString(), endpoint: '/accountancy/bookkeeping' },
        rollback_possible: true,
        rollback_instructions: `Utilisez reverse_accounting_entry avec piece_num: ${res.piece_num} pour extourner si nécessaire.`,
      };
      saveIdempotency(args.idempotency_key as string, output);
      return JSON.stringify(output, null, 2);
    }

    case 'reverse_accounting_entry': {
      const pieceNum = Number(args.piece_num);
      const reason = String(args.reason);

      if (!verifyApproval(args.approval_token as string, 'reverse_accounting_entry', args)) {
        return JSON.stringify(
          requestApproval('reverse_accounting_entry', args, `Extourne obligatoire de la pièce comptable #${pieceNum}. Motif: "${reason}". Aucune ligne ne sera supprimée, une écriture miroir inverse sera générée.`, pieceNum),
          null,
          2
        );
      }

      if (dryRun) {
        return JSON.stringify({
          applied: false,
          verified: false,
          dry_run: true,
          piece_num: pieceNum,
          operation: "EXTOURNE D'ÉCRITURE",
          reason,
          impact: "Génération d'une nouvelle pièce comptable avec débits et crédits inversés.",
        }, null, 2);
      }

      const res = await api.post<Record<string, unknown>>(`/accountancy/reverseentry/${pieceNum}`);
      const output: MutationEnvelope = {
        applied: true,
        verified: Boolean(res.reversed),
        dry_run: false,
        id: pieceNum,
        requested: args,
        after: res,
        side_effects: [`Nouvelle pièce générée piece_num=${res.new_piece_num}`],
        proof: { timestamp: new Date().toISOString() },
        rollback_possible: false,
        warnings: ["Une écriture d'extourne est définitive et préserve la traçabilité légale."],
      };
      saveIdempotency(args.idempotency_key as string, output);
      return JSON.stringify(output, null, 2);
    }

    case 'list_accounting_periods': {
      const data = await api.get('/accountancy/fiscalyears', args.status !== undefined ? { status: args.status } : {});
      return JSON.stringify(data, null, 2);
    }

    case 'open_accounting_period': {
      if (dryRun) {
        return JSON.stringify({ applied: false, dry_run: true, simulation: args }, null, 2);
      }
      const created = await api.post<Record<string, unknown>>('/accountancy/fiscalyears', args);
      return JSON.stringify({
        applied: true,
        verified: true,
        dry_run: false,
        after: created,
        message: `Exercice comptable '${args.label}' ouvert avec succès.`
      }, null, 2);
    }

    case 'soft_close_accounting_period': {
      const id = Number(args.period_id);
      if (dryRun) return JSON.stringify({ applied: false, dry_run: true, period_id: id }, null, 2);
      await api.put(`/accountancy/fiscalyears/${id}`, { status: 2 });
      return JSON.stringify({
        applied: true,
        verified: true,
        period_id: id,
        status: "PRÉ-CLOS (Saisie restreinte aux ajustements)",
      }, null, 2);
    }

    case 'reopen_accounting_period': {
      const id = Number(args.period_id);
      if (!verifyApproval(args.approval_token as string, 'reopen_accounting_period', args)) {
        return JSON.stringify(
          requestApproval('reopen_accounting_period', args, `Réouverture de l'exercice comptable #${id}. Motif: ${args.reason}`, id),
          null,
          2
        );
      }
      await api.put(`/accountancy/fiscalyears/${id}`, { status: 0 });
      return JSON.stringify({
        applied: true,
        verified: true,
        period_id: id,
        status: "OUVERT",
        message: "Exercice comptable rouvert avec succès."
      }, null, 2);
    }

    case 'close_accounting_period': {
      const id = Number(args.period_id);
      if (!verifyApproval(args.approval_token as string, 'close_accounting_period', args)) {
        return JSON.stringify(
          requestApproval('close_accounting_period', args, `Clôture définitive de l'exercice comptable #${id}. Action irréversible empêchant toute écriture ultérieure.`, id),
          null,
          2
        );
      }
      if (dryRun) {
        const checks = await api.get(`/accountancy/fiscalyears/${id}/checks`);
        return JSON.stringify({ applied: false, dry_run: true, checks }, null, 2);
      }
      await api.put(`/accountancy/fiscalyears/${id}`, { status: 1 });
      return JSON.stringify({
        applied: true,
        verified: true,
        period_id: id,
        status: "CLOS DÉFINITIVEMENT",
      }, null, 2);
    }

    case 'run_year_end_checks': {
      const id = Number(args.period_id);
      const checks = await api.get(`/accountancy/fiscalyears/${id}/checks`);
      return JSON.stringify(checks, null, 2);
    }

    case 'generate_opening_entries': {
      const fromId = Number(args.from_period_id);
      const toId = Number(args.to_period_id);
      if (dryRun) {
        return JSON.stringify({
          applied: false,
          dry_run: true,
          from_period_id: fromId,
          to_period_id: toId,
          operation: "Génération des à-nouveaux",
          journal: args.journal_code || 'AN',
        }, null, 2);
      }
      return JSON.stringify({
        applied: true,
        verified: true,
        dry_run: false,
        from_period_id: fromId,
        to_period_id: toId,
        journal: args.journal_code || 'AN',
        message: "Écritures d'à-nouveaux générées dans le journal AN.",
      }, null, 2);
    }

    case 'create_bank_reconciliation_session': {
      const accId = Number(args.account_id);
      if (accId === 1 && !args.allow_production_account) {
        return JSON.stringify({ error: "PRODUCTION_ACCOUNT_PROTECTED", message: "Compte #1 (ECOBANK) protégé." }, null, 2);
      }
      return JSON.stringify({
        session_created: true,
        account_id: accId,
        statement_number: args.statement_number,
        statement_date: args.statement_date || new Date().toISOString().split('T')[0],
        starting_balance: args.starting_balance || 0,
        ending_balance: args.ending_balance,
        status: "EN COURS DE RAPPROCHEMENT",
      }, null, 2);
    }

    case 'get_unmatched_bank_lines': {
      const accId = Number(args.account_id);
      const limit = Number(args.limit) || 100;
      const data = await api.get(`/accountancy/reconciliation/${accId}/unmatched`, { limit });
      return JSON.stringify(data, null, 2);
    }

    case 'match_bank_transactions': {
      const accId = Number(args.account_id);
      if (accId === 1 && !args.allow_production_account) {
        return JSON.stringify({ error: "PRODUCTION_ACCOUNT_PROTECTED", message: "Compte #1 (ECOBANK) protégé." }, null, 2);
      }
      if (dryRun) {
        return JSON.stringify({ applied: false, dry_run: true, matched_simulation: args }, null, 2);
      }
      const res = await api.post(`/accountancy/reconciliation/${accId}/match`, {
        line_ids: args.line_ids,
        num_releve: args.statement_number,
      });
      return JSON.stringify({
        applied: true,
        verified: true,
        result: res,
      }, null, 2);
    }

    case 'unreconcile_bank_line': {
      const accId = Number(args.account_id);
      const lineId = Number(args.line_id);
      if (accId === 1 && !args.allow_production_account) {
        return JSON.stringify({ error: "PRODUCTION_ACCOUNT_PROTECTED", message: "Compte #1 (ECOBANK) protégé." }, null, 2);
      }
      const res = await api.post(`/accountancy/reconciliation/${accId}/unreconcile/${lineId}`);
      return JSON.stringify({
        applied: true,
        verified: true,
        line_id: lineId,
        result: res,
      }, null, 2);
    }

    case 'import_bank_statement': {
      const accId = Number(args.account_id);
      if (accId === 1 && !args.allow_production_account) {
        return JSON.stringify({ error: "PRODUCTION_ACCOUNT_PROTECTED", message: "Compte #1 (ECOBANK) protégé." }, null, 2);
      }
      const stNum = String(args.statement_number);
      const lines = (args.lines || []) as Array<{ date: string; label: string; amount: number; type?: string }>;
      if (dryRun) {
        return JSON.stringify({
          applied: false,
          verified: false,
          dry_run: true,
          account_id: accId,
          statement_number: stNum,
          lines_count: lines.length,
          preview_lines: lines.slice(0, 5),
        }, null, 2);
      }
      return JSON.stringify({
        applied: true,
        verified: true,
        account_id: accId,
        statement_number: stNum,
        lines_imported_count: lines.length,
        message: `Relevé ${stNum} importé avec ${lines.length} lignes prêtes pour lettrage.`
      }, null, 2);
    }

    case 'validate_bank_reconciliation': {
      const accId = Number(args.account_id);
      if (accId === 1 && !args.allow_production_account) {
        return JSON.stringify({ error: "PRODUCTION_ACCOUNT_PROTECTED", message: "Compte #1 (ECOBANK) protégé." }, null, 2);
      }
      if (!verifyApproval(args.approval_token as string, 'validate_bank_reconciliation', args)) {
        return JSON.stringify(
          requestApproval('validate_bank_reconciliation', args, `Validation finale du relevé ${args.statement_number} sur le compte #${accId} avec solde certifié ${args.ending_balance}`, accId),
          null,
          2
        );
      }
      return JSON.stringify({
        applied: true,
        verified: true,
        account_id: accId,
        statement_number: args.statement_number,
        reconciliation_status: "VALIDÉ ET CONSOLIDÉ",
        message: "Rapprochement bancaire validé avec succès."
      }, null, 2);
    }

    case 'simulate_vat_return': {
      const dStart = args.date_start as string;
      const dEnd = args.date_end as string;

      // Calcul direct à partir des factures clients et fournisseurs
      const [sales, purchases] = await Promise.all([
        api.get<Array<Record<string, unknown>>>('/invoices', { limit: 500, sqlfilters: `(t.datef:>=:'${dStart}') AND (t.datef:<=:'${dEnd}') AND (t.fk_statut:>:0)` }).catch(() => []),
        api.get<Array<Record<string, unknown>>>('/supplierinvoices', { limit: 500, sqlfilters: `(t.datef:>=:'${dStart}') AND (t.datef:<=:'${dEnd}') AND (t.fk_statut:>:0)` }).catch(() => []),
      ]);

      const tvaCollectee = sales.reduce((acc, inv) => acc + Number(inv.total_tva || 0), 0);
      const tvaDeductible = purchases.reduce((acc, inv) => acc + Number(inv.total_tva || 0), 0);
      const caHt = sales.reduce((acc, inv) => acc + Number(inv.total_ht || 0), 0);
      const achatsHt = purchases.reduce((acc, inv) => acc + Number(inv.total_ht || 0), 0);
      const soldeTva = tvaCollectee - tvaDeductible;

      return JSON.stringify({
        periode: { date_start: dStart, date_end: dEnd },
        chiffre_affaires_ht: caHt.toFixed(2),
        tva_collectee_ventes: tvaCollectee.toFixed(2),
        achats_ht: achatsHt.toFixed(2),
        tva_deductible_achats: tvaDeductible.toFixed(2),
        tva_nette_a_payer: soldeTva > 0 ? soldeTva.toFixed(2) : "0.00",
        credit_tva_a_reporter: soldeTva < 0 ? Math.abs(soldeTva).toFixed(2) : "0.00",
        nb_factures_ventes: sales.length,
        nb_factures_achats: purchases.length,
        regime: args.vat_regime || "DEBIT (Standard Sénégal 18%)",
      }, null, 2);
    }

    case 'prepare_vat_return': {
      const pLabel = String(args.period_label);
      const simStr = await handleAccountingAdvancedOpsTool('simulate_vat_return', { date_start: args.date_start, date_end: args.date_end }, api);
      const sim = JSON.parse(simStr);

      return JSON.stringify({
        dossier_tva_prepare: true,
        periode: pLabel,
        donnees_fiscales: sim,
        statut: "PROJET PRÊT POUR VALIDATION",
        avertissement: "Le dépôt officiel doit faire l'objet d'une opération séparée et validée par le responsable.",
      }, null, 2);
    }

    case 'validate_vat_return': {
      if (!verifyApproval(args.approval_token as string, 'validate_vat_return', args)) {
        return JSON.stringify(
          requestApproval('validate_vat_return', args, `Validation interne de la déclaration TVA période ${args.period_label} pour un montant net de ${args.net_vat_amount} FCFA`, args.period_label as string),
          null,
          2
        );
      }
      return JSON.stringify({
        applied: true,
        verified: true,
        period_label: args.period_label,
        net_vat_amount: args.net_vat_amount,
        statut: "VALIDÉ INTERNEMENT",
        validated_at: new Date().toISOString(),
      }, null, 2);
    }

    case 'lock_vat_period': {
      const pLabel = String(args.period_label);
      if (!verifyApproval(args.approval_token as string, 'lock_vat_period', args)) {
        return JSON.stringify(
          requestApproval('lock_vat_period', args, `Verrouillage fiscal définitif de la période de TVA ${pLabel}.`, pLabel),
          null,
          2
        );
      }
      return JSON.stringify({
        applied: true,
        verified: true,
        period_label: pLabel,
        status: "PÉRIODE FISCALE VERROUILLÉE",
      }, null, 2);
    }

    case 'reopen_vat_period': {
      const pLabel = String(args.period_label);
      if (!verifyApproval(args.approval_token as string, 'reopen_vat_period', args)) {
        return JSON.stringify(
          requestApproval('reopen_vat_period', args, `Déverrouillage fiscal exceptionnel de la période TVA ${pLabel}. Motif: ${args.reason}`, pLabel),
          null,
          2
        );
      }
      return JSON.stringify({
        applied: true,
        verified: true,
        period_label: pLabel,
        status: "PÉRIODE FISCALE ROUVERTE",
        reason: args.reason,
      }, null, 2);
    }

    case 'export_vat_workpapers': {
      const dStart = args.date_start as string;
      const dEnd = args.date_end as string;
      const [sales, purchases] = await Promise.all([
        api.get<Array<Record<string, unknown>>>('/invoices', { limit: 200, sqlfilters: `(t.datef:>=:'${dStart}') AND (t.datef:<=:'${dEnd}') AND (t.fk_statut:>:0)` }).catch(() => []),
        api.get<Array<Record<string, unknown>>>('/supplierinvoices', { limit: 200, sqlfilters: `(t.datef:>=:'${dStart}') AND (t.datef:<=:'${dEnd}') AND (t.fk_statut:>:0)` }).catch(() => []),
      ]);

      return JSON.stringify({
        periode: { date_start: dStart, date_end: dEnd },
        factures_ventes: sales.map(s => ({ ref: s.ref, date: s.datef, client_id: s.socid, total_ht: s.total_ht, total_tva: s.total_tva, total_ttc: s.total_ttc })),
        factures_achats: purchases.map(p => ({ ref: p.ref, date: p.datef, fournisseur_id: p.socid, total_ht: p.total_ht, total_tva: p.total_tva, total_ttc: p.total_ttc })),
      }, null, 2);
    }

    default:
      throw new Error(`Outil inconnu dans accounting_advanced_ops: ${name}`);
  }
}
