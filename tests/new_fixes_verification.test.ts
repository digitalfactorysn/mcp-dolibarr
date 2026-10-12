import { describe, it, expect, vi } from 'vitest';
import { handleSetupTool } from '../src/tools/setup.js';
import { handleAccountingConfigTool } from '../src/tools/accounting_config.js';
import { handleAccountingTool } from '../src/tools/accounting.js';
import { handleInvoiceTool } from '../src/tools/invoices.js';
import { handleThirdpartyTool } from '../src/tools/thirdparties.js';
import { DolibarrAPI } from '../src/api.js';

describe('Vérification des correctifs ciblés', () => {
  const createMockApi = (responses: Record<string, unknown> = {}) => {
    const api = new DolibarrAPI('https://test.local', 'fake_key');
    api.get = vi.fn().mockImplementation((endpoint: string, params?: Record<string, unknown>) => {
      if (responses[endpoint] instanceof Error) return Promise.reject(responses[endpoint]);
      if (responses[endpoint] !== undefined) return Promise.resolve(responses[endpoint]);
      return Promise.reject(new Error(`API Error [404] on GET ${endpoint}`));
    });
    api.post = vi.fn().mockImplementation((endpoint: string, payload?: unknown) => {
      if (responses[`POST ${endpoint}`] instanceof Error) return Promise.reject(responses[`POST ${endpoint}`]);
      if (responses[`POST ${endpoint}`] !== undefined) return Promise.resolve(responses[`POST ${endpoint}`]);
      return Promise.resolve(999);
    });
    api.put = vi.fn().mockImplementation((endpoint: string, payload?: unknown) => {
      if (responses[`PUT ${endpoint}`] instanceof Error) return Promise.reject(responses[`PUT ${endpoint}`]);
      if (responses[`PUT ${endpoint}`] !== undefined) return Promise.resolve(responses[`PUT ${endpoint}`]);
      return Promise.resolve(1);
    });
    return api;
  };

  describe('1. Filtrage des constantes (setup.ts)', () => {
    it('get_setup_values avec constant appelle l\'endpoint unitaire /setup/conf/{constant}', async () => {
      const api = createMockApi({
        '/setup/conf/MAIN_MONNAIE': 'XOF'
      });
      const resStr = await handleSetupTool('get_setup_values', { constant: 'MAIN_MONNAIE' }, api);
      const res = JSON.parse(resStr);

      expect(res.constant).toBe('MAIN_MONNAIE');
      expect(res.value).toBe('XOF');
      expect(res.found).toBe(true);
    });

    it('get_setup_values avec module filtre correctement les clés', async () => {
      const api = createMockApi({
        '/setup/conf': {
          'FACTURE_TVA': '1',
          'FACTURE_ADDON': 'terre',
          'MAIN_MONNAIE': 'XOF',
          'SOCIETE_FISCAL': '1'
        }
      });
      const resStr = await handleSetupTool('get_setup_values', { module: 'FACTURE' }, api);
      const res = JSON.parse(resStr);

      expect(res.total_matches).toBe(2);
      expect(res.constants['FACTURE_TVA']).toBe('1');
      expect(res.constants['FACTURE_ADDON']).toBe('terre');
      expect(res.constants['MAIN_MONNAIE']).toBeUndefined();
    });

    it('set_setup_value effectue une relecture immédiate de vérification', async () => {
      const api = createMockApi({
        '/setup/conf/TEST_KEY': 'TEST_VAL'
      });
      const resStr = await handleSetupTool('set_setup_value', { constant: 'TEST_KEY', value: 'TEST_VAL' }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.reread_value).toBe('TEST_VAL');
    });
  });

  describe('2. Configuration bancaire automatique (accounting_config.ts)', () => {
    it('configure_bank_accounting protège strictement le compte de production ID 1', async () => {
      const api = createMockApi();
      const resStr = await handleAccountingConfigTool('configure_bank_accounting', { account_id: 1, accounting_number: '521' }, api);
      const res = JSON.parse(resStr);

      expect(res.supported).toBe(false);
      expect(res.applied).toBe(false);
      expect(res.error).toBe('PRODUCTION_ACCOUNT_PROTECTED');
    });

    it('auto_configure_bank_account crée et configure avec liaisons journal et compte', async () => {
      const api = createMockApi({
        '/accountancy/journals': [{ id: 3, code: 'BQ', label: 'Banque' }],
        '/accountancy/accounts': [{ id: 10, account_number: '5211', label: 'Banque Test' }],
        '/bankaccounts/999': {
          id: 999,
          ref: 'TEST_BNQ',
          label: 'Compte Test',
          bank: 'TestBank',
          account_number: '5211',
          fk_accountancy_journal: 3,
          accountancy_journal: 'BQ'
        }
      });

      const resStr = await handleAccountingConfigTool('auto_configure_bank_account', {
        ref: 'TEST_BNQ',
        label: 'Compte Test',
        bank_name: 'TestBank',
        accounting_number: '5211',
        journal_code: 'BQ'
      }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.account_id).toBe(999);
      expect(res.accounting_number).toBe('5211');
      expect(res.journal_code).toBe('BQ');
    });
  });

  describe('3. Vérification après écriture (invoices, thirdparties, accounting)', () => {
    it('create_invoice relit la facture créée et renvoie applied: true, verified: true', async () => {
      const api = createMockApi({
        '/invoices/999': {
          id: 999,
          ref: 'FA2610-0001',
          statut: '0',
          total_ttc: 118000
        }
      });

      const resStr = await handleInvoiceTool('create_invoice', { socid: 42 }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.id).toBe(999);
      expect(res.ref).toBe('FA2610-0001');
    });

    it('create_thirdparty relit le tiers créé et renvoie applied: true, verified: true', async () => {
      const api = createMockApi({
        '/thirdparties/999': {
          id: 999,
          name: 'Nouveau Client SARL',
          code_client: 'CU2610-0099'
        }
      });

      const resStr = await handleThirdpartyTool('create_thirdparty', { name: 'Nouveau Client SARL' }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.name).toBe('Nouveau Client SARL');
      expect(res.code_client).toBe('CU2610-0099');
    });

    it('add_bank_transaction relit la transaction enregistrée', async () => {
      const api = createMockApi({
        '/bankaccounts/lines/999': {
          id: 999,
          fk_account: 2,
          amount: 50000,
          label: 'Alimentation Caisse'
        }
      });

      const resStr = await handleAccountingTool('add_bank_transaction', {
        account_id: 2,
        date: '2026-10-12',
        amount: 50000,
        label: 'Alimentation Caisse'
      }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.line_id).toBe(999);
      expect(res.amount).toBe(50000);
    });
  });
});
