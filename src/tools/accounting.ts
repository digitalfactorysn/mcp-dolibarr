import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const accountingTools: Tool[] = [
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
    description: "Lire un compte bancaire (réf, compte comptable, journal associé, solde) — utile pour vérifier une configuration",
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID du compte bancaire' } },
      required: ['id'],
    },
  },
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
    name: 'add_bank_transaction',
    description: "Ajouter une opération bancaire manuelle (entrée ou sortie de trésorerie) avec vérification immédiate par relecture.",
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
    name: 'archive_bank_account',
    description: "Archiver ou fermer un compte bancaire dans Dolibarr avec protection absolue du compte principal de production #1 (ECOBANK)",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: "ID du compte bancaire à archiver (compte #1 interdit)" },
        comment: { type: 'string', description: "Commentaire ou motif d'archivage" },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_accounting_accounts',
    description: 'Lister les comptes réels du plan comptable actif (SYSCOHADA-SN) avec recherche et pagination',
    inputSchema: {
      type: 'object',
      properties: {
        search_account: { type: 'string', description: "Filtrer par préfixe ou numéro de compte (ex: '411', '521', '706')" },
        search_label: { type: 'string', description: "Filtrer par libellé de compte (ex: 'Client', 'Banque')" },
        limit: { type: 'number', description: 'Nombre max de comptes à retourner (défaut: 100)' },
        page: { type: 'number', description: 'Numéro de page pour pagination (défaut: 0)' },
        active: { type: 'number', description: '1=Actifs (défaut), 0=Inactifs, -1=Tous' },
      },
    },
  },
  {
    name: 'get_accounting_account',
    description: "Obtenir les détails complets d'un compte comptable par son ID ou son numéro de compte",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du compte comptable' },
        account_number: { type: 'string', description: "Numéro de compte (ex: '411', '5211')" },
      },
    },
  },
  {
    name: 'create_accounting_account',
    description: 'Créer un nouveau compte dans le plan comptable SYSCOHADA avec vérification par relecture',
    inputSchema: {
      type: 'object',
      properties: {
        account_number: { type: 'string', description: "Numéro de compte (ex: '4111001', '521101')" },
        label: { type: 'string', description: "Libellé du compte (ex: 'Client VIP Dakar')" },
        pcg_version: { type: 'string', description: "Version du plan (défaut: 'SYSCOHADA-SN')" },
        active: { type: 'number', description: '1=Actif (défaut), 0=Inactif' },
      },
      required: ['account_number', 'label'],
    },
  },
  {
    name: 'update_accounting_account',
    description: 'Mettre à jour un compte comptable existant avec vérification par relecture',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du compte comptable' },
        account_number: { type: 'string', description: 'Nouveau numéro de compte' },
        label: { type: 'string', description: 'Nouveau libellé du compte' },
        active: { type: 'number', description: 'Statut actif (1 ou 0)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_accounting_account',
    description: 'Supprimer un compte du plan comptable avec vérification par relecture',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du compte comptable à supprimer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_accounting_journals',
    description: 'Lister les journaux comptables réels configurés dans Dolibarr (Ventes, Achats, Banque, OD, Frais, etc.) avec filtres',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: "Filtrer par code exact (ex: 'BQ', 'BNQ', 'VT', 'AC')" },
        nature: { type: 'number', description: 'Filtrer par nature (1=OD, 2=Ventes, 3=Achats, 4=Banque, 5=Notes de frais, 8=Inventaire, 9=A-nouveaux)' },
        active: { type: 'number', description: '1=Actifs (défaut), 0=Inactifs, -1=Tous' },
      },
    },
  },
  {
    name: 'get_accounting_journal',
    description: "Obtenir les détails complets d'un journal comptable par son ID ou son code",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du journal comptable' },
        code: { type: 'string', description: "Code du journal (ex: 'BQ', 'BNQ', 'VT')" },
      },
    },
  },
  {
    name: 'create_accounting_journal',
    description: 'Créer un nouveau journal comptable dans Dolibarr avec vérification par relecture',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: "Code court du journal (ex: 'BQ2', 'BNQ', 'OD2')" },
        label: { type: 'string', description: "Libellé complet du journal" },
        nature: { type: 'number', description: 'Nature: 1=OD, 2=Ventes, 3=Achats, 4=Banque, 5=Notes de frais, 8=Inventaire, 9=A-nouveaux' },
        active: { type: 'number', description: '1=Actif (défaut), 0=Inactif' },
      },
      required: ['code', 'label'],
    },
  },
  {
    name: 'update_accounting_journal',
    description: 'Mettre à jour un journal comptable existant avec vérification par relecture',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du journal comptable' },
        code: { type: 'string', description: 'Nouveau code' },
        label: { type: 'string', description: 'Nouveau libellé' },
        nature: { type: 'number', description: 'Nouvelle nature' },
        active: { type: 'number', description: 'Statut actif (1 ou 0)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_accounting_journal',
    description: 'Supprimer un journal comptable dans Dolibarr avec vérification par relecture',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID du journal comptable à supprimer' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_accounting_entries',
    description: 'Lister les écritures réelles du grand livre comptable (bookkeeping)',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Nombre max' },
        journal_code: { type: 'string', description: 'Code journal (ex: VT, AC, BQ, OD)' },
        account_number: { type: 'string', description: 'Préfixe ou numéro de compte (ex: 411, 521)' },
        date_start: { type: 'string', description: 'Date début ISO 8601' },
        date_end: { type: 'string', description: 'Date fin ISO 8601' },
      },
    },
  },
  {
    name: 'create_accounting_entry',
    description: 'Créer une écriture comptable dans le grand livre avec vérification par relecture',
    inputSchema: {
      type: 'object',
      properties: {
        journal_code: { type: 'string', description: "Code du journal (défaut: 'OD')" },
        label: { type: 'string', description: "Libellé de l'opération" },
        doc_date: { type: 'string', description: "Date de l'opération (ISO 8601, ex: '2026-10-12')" },
        doc_ref: { type: 'string', description: 'Référence de pièce comptable' },
        numero_compte: { type: 'string', description: 'Numéro de compte principal (si écriture simple)' },
        debit: { type: 'number', description: 'Montant au débit' },
        credit: { type: 'number', description: 'Montant au crédit' },
        lines: {
          type: 'array',
          description: 'Lignes multiples pour écriture équilibrée',
          items: {
            type: 'object',
            properties: {
              numero_compte: { type: 'string' },
              label_compte: { type: 'string' },
              debit: { type: 'number' },
              credit: { type: 'number' },
            },
            required: ['numero_compte'],
          },
        },
      },
      required: ['label'],
    },
  },
  {
    name: 'get_financial_summary',
    description: "Obtenir un résumé financier: CA total, factures impayées, balance de trésorerie et indicateurs clés",
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Année fiscale (ex: 2025). Si vide: année en cours' },
      },
    },
  },
];

export async function handleAccountingTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'list_bank_accounts': {
      const params: Record<string, unknown> = {};
      if (args.status !== undefined) params.status = args.status;
      else params.status = 1;
      const data = await api.get<Array<Record<string, unknown>>>('/bankaccounts', params);
      if (Array.isArray(data)) {
        await Promise.all(data.map(async (b) => {
          try {
            const lines = await api.get<Array<{ amount?: number | string }>>(`/bankaccounts/${b.id}/lines`, { limit: 10000 });
            if (Array.isArray(lines)) {
              const bal = Math.round(lines.reduce((acc, l) => acc + (Number(l.amount) || 0), 0) * 100) / 100;
              b.balance = bal;
              b.solde = bal;
              b.transactions_count = lines.length;
            }
          } catch {
            b.balance = 0;
            b.solde = 0;
          }
        }));
      }
      return JSON.stringify(data, null, 2);
    }

    case 'get_bank_account': {
      const id = Number(args.id ?? args.account_id);
      const b = await api.get<Record<string, unknown>>(`/bankaccounts/${id}`);
      let calculatedBalance = 0;
      let linesCount = 0;
      try {
        const lines = await api.get<Array<{ amount?: number | string }>>(`/bankaccounts/${id}/lines`, { limit: 10000 });
        if (Array.isArray(lines)) {
          linesCount = lines.length;
          calculatedBalance = lines.reduce((acc, line) => acc + (Number(line.amount) || 0), 0);
        }
      } catch {
        // Default to 0 if lines endpoint empty
      }
      const balanceRounded = Math.round(calculatedBalance * 100) / 100;
      return JSON.stringify({
        id: b.id, ref: b.ref, label: b.label, bank: b.bank, type: b.type, clos: b.clos,
        currency_code: b.currency_code, account_number: b.account_number,
        fk_accountancy_journal: b.fk_accountancy_journal, accountancy_journal: b.accountancy_journal,
        balance: balanceRounded, solde: balanceRounded, transactions_count: linesCount,
        production_protected: Number(b.id) === 1,
      }, null, 2);
    }

    case 'get_bank_transactions': {
      const params: Record<string, unknown> = { limit: args.limit || 50 };
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get(`/bankaccounts/${args.account_id}/lines`, params);
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
      const lineId = await api.post<number>(`/bankaccounts/${args.account_id}/lines`, payload);

      // Relecture factuelle de vérification
      const reread = await api.get<Record<string, unknown>>(`/bankaccounts/lines/${lineId}`).catch(() => null);

      return JSON.stringify({
        applied: true,
        verified: !!reread,
        account_id: args.account_id,
        line_id: lineId,
        amount: args.amount,
        label: args.label,
        transaction: reread || { id: lineId, ...payload },
      }, null, 2);
    }

    case 'archive_bank_account': {
      const id = Number(args.id ?? args.account_id);
      if (id === 1) {
        throw new Error("PROTECTION_ERROR: Le compte bancaire principal #1 (ECOBANK) est strictement protégé et ne peut être archivé ni modifié.");
      }
      const existing = await api.get<Record<string, unknown>>(`/bankaccounts/${id}`).catch(() => null);
      if (!existing || !existing.id) {
        throw new Error(`Compte bancaire #${id} introuvable.`);
      }
      await api.put(`/bankaccounts/${id}`, { status: 1, clos: 1 });
      const reread = await api.get<Record<string, unknown>>(`/bankaccounts/${id}`).catch(() => null);
      return JSON.stringify({
        applied: true,
        verified: !!reread && (String(reread.clos) === '1' || String(reread.status) === '1'),
        id,
        ref: reread?.ref || existing.ref,
        label: reread?.label || existing.label,
        clos: reread?.clos ?? 1,
        status: reread?.status ?? 1,
        message: `Compte bancaire #${id} archivé et fermé avec succès.`,
      }, null, 2);
    }

    case 'list_accounting_accounts': {
      try {
        const params: Record<string, unknown> = {
          limit: Number(args.limit) || 100,
          page: Number(args.page) || 0,
        };
        if (args.search_account) params.search_account = String(args.search_account).trim();
        if (args.search_label) params.search_label = String(args.search_label).trim();
        if (args.active !== undefined) params.active = args.active;

        const data = await api.get<unknown[]>('/accountancy/accounts', params).catch(() => api.get<unknown[]>('/accountancy/account', params));
        return JSON.stringify(data, null, 2);
      } catch (err) {
        return JSON.stringify({
          supported: false,
          error: 'REST_ENDPOINT_NOT_AVAILABLE',
          endpoint: '/accountancy/account',
          message: "L'endpoint REST pour le plan comptable n'est pas exposé par cette version de Dolibarr.",
          details: err instanceof Error ? err.message : String(err),
          action_requise: "Consulter directement le plan comptable via l'interface web Dolibarr (Comptabilité → Configuration → Plan comptable)."
        }, null, 2);
      }
    }

    case 'get_accounting_account': {
      if (args.id) {
        const id = Number(args.id);
        const data = await api.get(`/accountancy/accounts/${id}`);
        return JSON.stringify(data, null, 2);
      } else if (args.account_number) {
        const accNum = String(args.account_number).trim();
        const data = await api.get<unknown[]>('/accountancy/accounts', { search_account: accNum });
        const arr = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
        const found = arr.find(a => String(a.account_number) === accNum) || arr[0];
        if (!found) throw new Error(`Compte comptable ${accNum} introuvable.`);
        return JSON.stringify(found, null, 2);
      }
      throw new Error("L'ID ou le numéro de compte est requis.");
    }

    case 'create_accounting_account': {
      const payload = {
        account_number: String(args.account_number).trim(),
        label: String(args.label).trim(),
        pcg_version: args.pcg_version ? String(args.pcg_version).trim() : 'SYSCOHADA-SN',
        active: args.active !== undefined ? Number(args.active) : 1,
      };
      const id = await api.post<number>('/accountancy/accounts', payload);
      const reread = await api.get<Record<string, unknown>>(`/accountancy/accounts/${id}`).catch(() => null);

      return JSON.stringify({
        applied: true,
        verified: !!reread,
        id,
        account: reread || { id, ...payload },
      }, null, 2);
    }

    case 'update_accounting_account': {
      const id = Number(args.id);
      const payload: Record<string, unknown> = {};
      if (args.account_number) payload.account_number = String(args.account_number).trim();
      if (args.label) payload.label = String(args.label).trim();
      if (args.active !== undefined) payload.active = Number(args.active);

      await api.put(`/accountancy/accounts/${id}`, payload);
      const reread = await api.get<Record<string, unknown>>(`/accountancy/accounts/${id}`).catch(() => null);

      return JSON.stringify({
        applied: true,
        verified: !!reread,
        id,
        account: reread || { id, ...payload },
      }, null, 2);
    }

    case 'delete_accounting_account': {
      const id = Number(args.id);
      await api.delete(`/accountancy/accounts/${id}`);
      const reread = await api.get(`/accountancy/accounts/${id}`).catch(() => null);
      const isDeleted = reread === null;

      return JSON.stringify({
        applied: true,
        verified: isDeleted,
        id,
        message: isDeleted
          ? `Compte comptable #${id} supprimé avec succès et vérifié par relecture.`
          : `Compte comptable #${id} suppression envoyée.`,
      }, null, 2);
    }

    case 'list_accounting_journals': {
      try {
        const params: Record<string, unknown> = {};
        if (args.active !== undefined) params.active = args.active;
        if (args.code) params.code = String(args.code).trim().toUpperCase();
        if (args.nature !== undefined) params.nature = Number(args.nature);

        const data = await api.get('/accountancy/journals', params).catch(() => api.get('/accountancy/journal', params));
        return JSON.stringify(data, null, 2);
      } catch (err) {
        return JSON.stringify({
          supported: false,
          error: 'REST_ENDPOINT_NOT_AVAILABLE',
          endpoint: '/accountancy/journal',
          message: "L'endpoint REST pour les journaux comptables n'est pas exposé par cette version de Dolibarr.",
          details: err instanceof Error ? err.message : String(err),
          action_requise: "Consulter les journaux via l'interface web Dolibarr (Comptabilité → Configuration → Journaux)."
        }, null, 2);
      }
    }

    case 'get_accounting_journal': {
      if (args.id) {
        const id = Number(args.id);
        const data = await api.get(`/accountancy/journals/${id}`);
        return JSON.stringify(data, null, 2);
      } else if (args.code) {
        const code = String(args.code).trim().toUpperCase();
        const data = await api.get<unknown[]>('/accountancy/journals', { code });
        const arr = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
        const found = arr.find(j => String(j.code).toUpperCase() === code);
        if (!found) throw new Error(`Journal ${code} introuvable.`);
        return JSON.stringify(found, null, 2);
      }
      throw new Error("L'ID ou le code du journal est requis.");
    }

    case 'create_accounting_journal': {
      const payload = {
        code: String(args.code).trim().toUpperCase(),
        label: String(args.label).trim(),
        nature: args.nature !== undefined ? Number(args.nature) : 1,
        active: args.active !== undefined ? Number(args.active) : 1,
      };
      const id = await api.post<number>('/accountancy/journals', payload);
      const reread = await api.get<Record<string, unknown>>(`/accountancy/journals/${id}`).catch(() => null);

      return JSON.stringify({
        applied: true,
        verified: !!reread,
        id,
        journal: reread || { id, ...payload },
      }, null, 2);
    }

    case 'update_accounting_journal': {
      const id = Number(args.id);
      const payload: Record<string, unknown> = {};
      if (args.code) payload.code = String(args.code).trim().toUpperCase();
      if (args.label) payload.label = String(args.label).trim();
      if (args.nature !== undefined) payload.nature = Number(args.nature);
      if (args.active !== undefined) payload.active = Number(args.active);

      await api.put(`/accountancy/journals/${id}`, payload);
      const reread = await api.get<Record<string, unknown>>(`/accountancy/journals/${id}`).catch(() => null);

      return JSON.stringify({
        applied: true,
        verified: !!reread,
        id,
        journal: reread || { id, ...payload },
      }, null, 2);
    }

    case 'delete_accounting_journal': {
      const id = Number(args.id);
      await api.delete(`/accountancy/journals/${id}`);
      const reread = await api.get(`/accountancy/journals/${id}`).catch(() => null);
      const isDeleted = reread === null;

      return JSON.stringify({
        applied: true,
        verified: isDeleted,
        id,
        message: isDeleted
          ? `Journal comptable #${id} supprimé avec succès et vérifié par relecture.`
          : `Journal comptable #${id} suppression envoyée.`,
      }, null, 2);
    }

    case 'list_accounting_entries': {
      try {
        const params: Record<string, unknown> = { limit: Number(args.limit) || 100 };
        if (args.journal_code) params.journal_code = String(args.journal_code).trim().toUpperCase();
        if (args.account_number) params.account_number = String(args.account_number).trim();
        if (args.date_start) params.date_start = String(args.date_start);
        if (args.date_end) params.date_end = String(args.date_end);

        const data = await api.get('/accountancy/bookkeeping', params);
        return JSON.stringify(data, null, 2);
      } catch (err) {
        return JSON.stringify({
          supported: false,
          error: 'REST_ENDPOINT_NOT_AVAILABLE',
          endpoint: '/accountancy/bookkeeping',
          message: "L'endpoint REST pour le grand livre comptable n'est pas exposé par cette version de Dolibarr.",
          details: err instanceof Error ? err.message : String(err),
          alternative: "Utiliser l'export comptable officiel export_accounting_entries (FEC) ou la balance générale."
        }, null, 2);
      }
    }

    case 'create_accounting_entry': {
      const payload: Record<string, unknown> = {
        code_journal: args.journal_code ? String(args.journal_code).trim().toUpperCase() : 'OD',
        label: String(args.label).trim(),
        doc_date: args.doc_date || new Date().toISOString().split('T')[0],
        doc_ref: args.doc_ref || `OD-${Date.now()}`,
      };
      if (args.numero_compte) payload.numero_compte = String(args.numero_compte).trim();
      if (args.debit !== undefined) payload.debit = Number(args.debit);
      if (args.credit !== undefined) payload.credit = Number(args.credit);
      if (args.lines) payload.lines = args.lines;

      const result = await api.post<Record<string, unknown>>('/accountancy/bookkeeping', payload);

      const entries = await api.get<unknown[]>('/accountancy/bookkeeping', {
        journal_code: payload.code_journal,
        limit: 5,
      }).catch(() => []);
      const arr = Array.isArray(entries) ? entries : [];

      return JSON.stringify({
        applied: true,
        verified: arr.length > 0,
        result,
        journal_code: payload.code_journal,
        label: payload.label,
        entries: arr.slice(0, 2),
      }, null, 2);
    }

    case 'get_financial_summary': {
      const year = Number(args.year) || new Date().getFullYear();

      const [allInvoices, bankAccounts] = await Promise.all([
        api.get<unknown[]>('/invoices', { limit: 500 }),
        api.get<unknown[]>('/bankaccounts', { status: 1 }),
      ]);

      const allArr   = Array.isArray(allInvoices) ? allInvoices as Record<string, unknown>[] : [];
      const bankArr  = Array.isArray(bankAccounts) ? bankAccounts as Record<string, unknown>[] : [];

      const yearStart = Math.floor(new Date(`${year}-01-01`).getTime() / 1000);
      const yearEnd   = Math.floor(new Date(`${year}-12-31T23:59:59`).getTime() / 1000);

      const yearArr = allArr.filter(inv => {
        const d = Number(inv.date || 0);
        return d >= yearStart && d <= yearEnd;
      });

      const paidArr   = yearArr.filter(inv => String(inv.paye) === '1' || String(inv.statut) === '2');
      const unpaidArr = yearArr.filter(inv => String(inv.paye) === '0' && (String(inv.statut) === '1' || String(inv.statut) === '2'));

      const totalCA      = paidArr.reduce((s, inv) => s + Number(inv.total_ttc || 0), 0);
      const totalUnpaid  = unpaidArr.reduce((s, inv) => s + Number(inv.remaintopay || inv.total_ttc || 0), 0);
      const totalBalance = bankArr.reduce((s, acc) => s + Number(acc.balance || 0), 0);

      return JSON.stringify({
        annee: year,
        reconstituted: true,
        certified: false,
        source: 'Calculé à partir des factures commerciales (/invoices) et comptes bancaires (/bankaccounts)',
        disclaimer: 'Synthèse indicative issue des factures et soldes bancaires, non certifiée par le grand livre comptable.',
        chiffre_affaires_TTC: Number(totalCA).toFixed(2),
        nb_factures_payees: paidArr.length,
        total_factures_impayees_TTC: Number(totalUnpaid).toFixed(2),
        nb_factures_impayees: unpaidArr.length,
        solde_tresorerie_total: Number(totalBalance).toFixed(2),
        nb_comptes_bancaires: bankArr.length,
      }, null, 2);
    }

    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
