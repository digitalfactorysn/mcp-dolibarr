import { describe, it, expect, vi } from 'vitest';
import { handleSetupTool } from '../src/tools/setup.js';
import { handleAccountingConfigTool } from '../src/tools/accounting_config.js';
import { handleAccountingTool } from '../src/tools/accounting.js';
import { handleInvoiceTool } from '../src/tools/invoices.js';
import { handleThirdpartyTool } from '../src/tools/thirdparties.js';
import { handleProductTool } from '../src/tools/products.js';
import { handleSupplierInvoiceTool } from '../src/tools/supplier_invoices.js';
import { handleTicketTool } from '../src/tools/tickets.js';
import { handleInterventionTool } from '../src/tools/interventions.js';
import { DolibarrAPI } from '../src/api.js';

describe('Vérification des correctifs ciblés v5.4.0', () => {
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
    api.delete = vi.fn().mockImplementation((endpoint: string) => {
      if (responses[`DELETE ${endpoint}`] instanceof Error) return Promise.reject(responses[`DELETE ${endpoint}`]);
      if (responses[`DELETE ${endpoint}`] !== undefined) return Promise.resolve(responses[`DELETE ${endpoint}`]);
      return Promise.resolve({ success: true });
    });
    return api;
  };

  describe('1. Filtrage et gestion des constantes (setup.ts)', () => {
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

    it('delete_setup_value supprime et vérifie par relecture', async () => {
      const api = createMockApi();
      const resStr = await handleSetupTool('delete_setup_value', { constant: 'TEST_DELETE' }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.constant).toBe('TEST_DELETE');
    });
  });

  describe('2. Gestion réelle des journaux et du plan comptable (accounting.ts)', () => {
    it('list_accounting_journals retourne les journaux réels', async () => {
      const api = createMockApi({
        '/accountancy/journals': [
          { id: 1, code: 'VT', label: 'Ventes', nature: 2, nature_label: 'VENTE', active: 1 },
          { id: 15, code: 'BNQ', label: 'Banque BNQ', nature: 4, nature_label: 'BANQUE', active: 1 }
        ]
      });
      const resStr = await handleAccountingTool('list_accounting_journals', {}, api);
      const res = JSON.parse(resStr);

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(2);
      expect(res[1].code).toBe('BNQ');
    });

    it('get_accounting_journal retrouve par code', async () => {
      const api = createMockApi({
        '/accountancy/journals': [
          { id: 15, code: 'BNQ', label: 'Banque BNQ', nature: 4, nature_label: 'BANQUE', active: 1 }
        ]
      });
      const resStr = await handleAccountingTool('get_accounting_journal', { code: 'BNQ' }, api);
      const res = JSON.parse(resStr);

      expect(res.id).toBe(15);
      expect(res.code).toBe('BNQ');
    });

    it('create_accounting_journal relit et vérifie le journal créé', async () => {
      const api = createMockApi({
        '/accountancy/journals/999': { id: 999, code: 'TEST_J', label: 'Journal Test', nature: 1, active: 1 }
      });
      const resStr = await handleAccountingTool('create_accounting_journal', { code: 'TEST_J', label: 'Journal Test', nature: 1 }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.journal.code).toBe('TEST_J');
    });

    it('delete_accounting_journal supprime et confirme la suppression', async () => {
      const api = createMockApi();
      const resStr = await handleAccountingTool('delete_accounting_journal', { id: 999 }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.id).toBe(999);
    });

    it('get_accounting_account retrouve par numéro de compte', async () => {
      const api = createMockApi({
        '/accountancy/accounts': [
          { id: 100, account_number: '5211', label: 'Banque Nationale' }
        ]
      });
      const resStr = await handleAccountingTool('get_accounting_account', { account_number: '5211' }, api);
      const res = JSON.parse(resStr);

      expect(res.account_number).toBe('5211');
      expect(res.label).toBe('Banque Nationale');
    });
  });

  describe('3. Configuration bancaire automatique stricte (accounting_config.ts)', () => {
    it('configure_bank_accounting protège strictement le compte de production ID 1', async () => {
      const api = createMockApi();
      const resStr = await handleAccountingConfigTool('configure_bank_accounting', { account_id: 1, accounting_number: '521' }, api);
      const res = JSON.parse(resStr);

      expect(res.supported).toBe(false);
      expect(res.applied).toBe(false);
      expect(res.error).toBe('PRODUCTION_ACCOUNT_PROTECTED');
    });

    it('auto_configure_bank_account renvoie applied: true uniquement si BNQ est relu', async () => {
      const api = createMockApi({
        '/accountancy/journals': [{ id: 15, code: 'BNQ', label: 'Banque' }],
        '/accountancy/accounts': [{ id: 10, account_number: '5211', label: 'Banque Test' }],
        '/bankaccounts/999': {
          id: 999,
          ref: 'TEST_BNQ',
          label: 'Compte Test BNQ',
          bank: 'TestBank',
          account_number: '5211',
          fk_accountancy_journal: 15,
          accountancy_journal: 'BNQ'
        }
      });

      const resStr = await handleAccountingConfigTool('auto_configure_bank_account', {
        ref: 'TEST_BNQ',
        label: 'Compte Test BNQ',
        bank_name: 'TestBank',
        accounting_number: '5211',
        journal_code: 'BNQ'
      }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.journal_code).toBe('BNQ');
      expect(res.verification_details.journal_verified).toBe(true);
    });

    it('auto_configure_bank_account échoue explicitement si BNQ n\'est pas relu (relecture discordante)', async () => {
      const api = createMockApi({
        '/accountancy/journals': [{ id: 15, code: 'BNQ', label: 'Banque' }],
        '/accountancy/accounts': [{ id: 10, account_number: '5211', label: 'Banque Test' }],
        '/bankaccounts/999': {
          id: 999,
          ref: 'TEST_BNQ',
          label: 'Compte Test BNQ',
          bank: 'TestBank',
          account_number: '5211',
          fk_accountancy_journal: 3,
          accountancy_journal: 'BQ' // Discordance : BQ au lieu de BNQ
        }
      });

      const resStr = await handleAccountingConfigTool('auto_configure_bank_account', {
        ref: 'TEST_BNQ',
        label: 'Compte Test BNQ',
        bank_name: 'TestBank',
        accounting_number: '5211',
        journal_code: 'BNQ'
      }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(false);
      expect(res.verified).toBe(false);
      expect(res.verification_details.journal_verified).toBe(false);
    });
  });

  describe('4. Systématisation de la vérification après écriture', () => {
    it('create_invoice relit la facture créée', async () => {
      const api = createMockApi({
        '/invoices/999': { id: 999, ref: 'FA2610-0001', statut: '0', total_ttc: 118000 }
      });
      const resStr = await handleInvoiceTool('create_invoice', { socid: 42 }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.id).toBe(999);
    });

    it('create_thirdparty relit le tiers créé', async () => {
      const api = createMockApi({
        '/thirdparties/999': { id: 999, name: 'Nouveau Client SARL', code_client: 'CU2610-0099' }
      });
      const resStr = await handleThirdpartyTool('create_thirdparty', { name: 'Nouveau Client SARL' }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.name).toBe('Nouveau Client SARL');
    });

    it('create_product relit le produit créé', async () => {
      const api = createMockApi({
        '/products/999': { id: 999, ref: 'PROD-001', label: 'Serveur Cloud', price: 50000 }
      });
      const resStr = await handleProductTool('create_product', { ref: 'PROD-001', label: 'Serveur Cloud', price: 50000 }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.ref).toBe('PROD-001');
    });

    it('create_supplier_invoice relit la facture fournisseur créée', async () => {
      const api = createMockApi({
        '/supplierinvoices/999': { id: 999, ref: 'SI2610-001', socid: 55 }
      });
      const resStr = await handleSupplierInvoiceTool('create_supplier_invoice', { socid: 55 }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.id).toBe(999);
    });

    it('create_ticket relit le ticket support créé', async () => {
      const api = createMockApi({
        '/tickets/999': { id: 999, ref: 'TI2610-001', subject: 'Panne Fibre' }
      });
      const resStr = await handleTicketTool('create_ticket', { subject: 'Panne Fibre', message: 'Coupure totale' }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.subject).toBe('Panne Fibre');
    });

    it('create_intervention relit la fiche d\'intervention créée', async () => {
      const api = createMockApi({
        '/interventions/999': { id: 999, ref: 'FI2610-001', socid: 12 }
      });
      const resStr = await handleInterventionTool('create_intervention', { socid: 12 }, api);
      const res = JSON.parse(resStr);

      expect(res.applied).toBe(true);
      expect(res.verified).toBe(true);
      expect(res.id).toBe(999);
    });
  });
});
