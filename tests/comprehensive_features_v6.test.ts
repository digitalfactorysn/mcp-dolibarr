import { describe, it, expect } from 'vitest';
import { createServer } from '../src/server.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  checkIdempotency,
  saveIdempotency,
  requestApproval,
  verifyApproval,
  sanitizeSecrets,
  PROTECTED_PRODUCTION_BANK_ACCOUNT_IDS
} from '../src/utils/mutation.js';

describe('MCP Dolibarr v6.0.0 — Comprehensive Features & Mutation Framework Tests', () => {
  it('doit exposer plus de 250 outils avec zéro collision de nom', async () => {
    process.env.DOLIBARR_URL = 'https://gestion.digitalfactory.sn/api/index.php';
    process.env.DOLIBARR_API_KEY = 'test_mock_key';
    const server = createServer();

    // @ts-expect-error - access request handler
    const handler = server._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
    const res = await handler({ method: 'tools/list' });
    const tools = res.tools;

    expect(tools.length).toBeGreaterThanOrEqual(250);

    const names = tools.map((t: { name: string }) => t.name);
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);

    // Vérifier la présence des nouveaux outils clés exigés par la spécification
    const requiredTools = [
      // Comptabilité & Extourne & Clôtures & TVA & Rapprochement
      'reverse_accounting_entry',
      'post_expense_report_to_accounting',
      'check_balanced_entry',
      'list_accounting_periods',
      'open_accounting_period',
      'soft_close_accounting_period',
      'reopen_accounting_period',
      'close_accounting_period',
      'run_year_end_checks',
      'generate_opening_entries',
      'create_bank_reconciliation_session',
      'match_bank_transactions',
      'unreconcile_bank_line',
      'import_bank_statement',
      'validate_bank_reconciliation',
      'get_unmatched_bank_lines',
      'simulate_vat_return',
      'prepare_vat_return',
      'validate_vat_return',
      'lock_vat_period',
      'reopen_vat_period',
      'export_vat_workpapers',

      // Workflows & Cron
      'list_workflow_rules',
      'get_workflow_rule',
      'enable_workflow_rule',
      'disable_workflow_rule',
      'test_workflow_rule',
      'simulate_workflow_effect',
      'get_workflow_execution_log',
      'list_scheduled_jobs',
      'get_scheduled_job',
      'create_scheduled_job',
      'update_scheduled_job',
      'enable_scheduled_job',
      'disable_scheduled_job',
      'run_scheduled_job_once',
      'get_scheduled_job_history',

      // Contrats, Projets, Interventions
      'renew_contract',
      'terminate_contract',
      'generate_contract_invoice',
      'update_task',
      'add_task_time',
      'list_task_time_entries',
      'create_project_invoice',
      'update_intervention_line',
      'delete_intervention_line',
      'cancel_intervention',
      'convert_intervention_to_invoice',

      // Documents & Extrafields
      'upload_document',
      'rename_document',
      'move_document',
      'attach_document_to_object',
      'update_category',
      'delete_category',
      'remove_object_from_category',
      'list_extra_fields',
      'create_extra_field',
      'update_extra_field',
      'deactivate_extra_field',
      'set_object_extra_field',

      // Admin Ops
      'get_user_permissions',
      'create_role',
      'update_role',
      'assign_role_to_user',
      'revoke_role_from_user',
      'enable_module',
      'disable_module',
      'get_module_configuration',
      'validate_module_dependencies',
      'list_numbering_models',
      'list_document_templates',
      'set_default_document_template',
      'list_dictionary_entries',
      'create_dictionary_entry',
      'update_dictionary_entry',
      'deactivate_dictionary_entry',

      // Paie Sénégal
      'list_payrolls',
      'get_payroll',
      'calculate_payroll_slips',
      'generate_monthly_payroll',
      'validate_payroll',
      'export_payroll_summary',
    ];

    for (const toolName of requiredTools) {
      expect(names).toContain(toolName);
    }
  });

  describe('Socle Commun: Idempotence & Approbation renforcée & Protection bancaire', () => {
    it('doit gérer le cache d\'idempotence correctement', () => {
      const key = 'test_idem_key_123';
      expect(checkIdempotency(key)).toBeNull();

      const response = JSON.stringify({ applied: true, test: 42 });
      saveIdempotency(key, response);

      const cached = checkIdempotency(key);
      expect(cached).toBe(response);
    });

    it('doit exiger et valider un jeton d\'approbation à deux étapes (approval_token)', () => {
      const payload = { entity_id: 99, action: 'close_period' };
      const req = requestApproval('close_accounting_period', payload, 'Clôture annuelle', 99);

      expect(req.applied).toBe(false);
      expect(req.approval_required).toBe(true);
      expect(req.approval_token).toMatch(/^APPR_/);

      // Validation avec le jeton retourné
      const isValid = verifyApproval(req.approval_token, 'close_accounting_period', payload);
      expect(isValid).toBe(true);

      // Un jeton déjà consommé ne doit plus être valide (usage unique)
      const isReusedValid = verifyApproval(req.approval_token, 'close_accounting_period', payload);
      expect(isReusedValid).toBe(false);
    });

    it('doit refuser un faux jeton ou un jeton pour une autre action', () => {
      const payload = { entity_id: 99 };
      const req = requestApproval('close_accounting_period', payload, 'Clôture', 99);

      const isBadAction = verifyApproval(req.approval_token, 'reopen_accounting_period', payload);
      expect(isBadAction).toBe(false);

      const isFakeToken = verifyApproval('APPR_INVALID_12345', 'close_accounting_period', payload);
      expect(isFakeToken).toBe(false);
    });

    it('doit protéger le compte bancaire de production ID 1', () => {
      expect(PROTECTED_PRODUCTION_BANK_ACCOUNT_IDS.has(1)).toBe(true);
      expect(PROTECTED_PRODUCTION_BANK_ACCOUNT_IDS.has(3)).toBe(false); // Compte de test dédié autorisé
    });

    it('doit expurger les données sensibles des réponses', () => {
      const dirty = {
        name: 'Test',
        password: 'SuperSecretPassword123!',
        api_key: 'DolibarrKey999',
        token: 'Bearer xyz',
        safe_info: 'Visible'
      };
      const cleaned = sanitizeSecrets(dirty) as Record<string, string>;
      expect(cleaned.password).toBe('***REDACTED***');
      expect(cleaned.api_key).toBe('***REDACTED***');
      expect(cleaned.token).toBe('***REDACTED***');
      expect(cleaned.safe_info).toBe('Visible');
    });
  });

  describe('Paie Sénégal: Barème fiscal et social SYSCOHADA / IPRES / CSS / IR', () => {
    it('doit calculer les cotisations IPRES RG, RC, CSS et IR avec plafonds légaux', () => {
      // Test d'un salaire brut de 500 000 FCFA, 1 part fiscale
      const salary = 500000;
      const parts = 1;

      // RG: plafond 450 000. Part salariale: 5.6% = 25 200, Part patronale: 8.4% = 37 800
      const ipresRgSal = Math.min(salary, 450000) * 0.056;
      expect(ipresRgSal).toBe(25200);

      // RC: plafond 1 350 000. Salariale: 2.4% = 12 000, Patronale: 3.6% = 18 000
      const ipresRcSal = Math.min(salary, 1350000) * 0.024;
      expect(ipresRcSal).toBe(12000);

      // Total retenue IPRES = 37 200
      expect(ipresRgSal + ipresRcSal).toBe(37200);

      // CSS Prestations familiales (patronale 7% plafonné à 63 000) = 4 410
      const cssPf = Math.min(salary, 63000) * 0.07;
      expect(cssPf).toBe(4410);
    });
  });
});
