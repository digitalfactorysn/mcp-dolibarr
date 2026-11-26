import { describe, it, expect, vi } from 'vitest';
import { handleAccountingTool } from '../src/tools/accounting.js';
import { handleAccountingAdvancedTool } from '../src/tools/accounting_advanced.js';
import { DolibarrAPI } from '../src/api.js';

describe('2. Contrats d\'API Comptabilité : Zéro faux succès & Étiquetage', () => {
  const createMockApi = (responses: Record<string, unknown> = {}) => {
    const api = new DolibarrAPI('https://test.local', 'fake_key');
    api.get = vi.fn().mockImplementation((endpoint: string) => {
      if (responses[endpoint] instanceof Error) {
        return Promise.reject(responses[endpoint]);
      }
      if (responses[endpoint] !== undefined) {
        return Promise.resolve(responses[endpoint]);
      }
      return Promise.reject(new Error(`Dolibarr API Error [404]: Not Found for ${endpoint}`));
    });
    api.post = vi.fn().mockImplementation((endpoint: string) => {
      if (responses[`POST ${endpoint}`] instanceof Error) {
        return Promise.reject(responses[`POST ${endpoint}`]);
      }
      if (responses[`POST ${endpoint}`] !== undefined) {
        return Promise.resolve(responses[`POST ${endpoint}`]);
      }
      return Promise.reject(new Error(`Dolibarr API Error [404]: Not Found for POST ${endpoint}`));
    });
    api.put = vi.fn().mockImplementation((endpoint: string) => {
      return Promise.resolve(1);
    });
    return api;
  };

  it('list_accounting_journals doit retourner supported: false si endpoint REST 404', async () => {
    const api = createMockApi();
    const resultStr = await handleAccountingTool('list_accounting_journals', {}, api);
    const result = JSON.parse(resultStr);

    expect(result.supported).toBe(false);
    expect(result.error).toBe('REST_ENDPOINT_NOT_AVAILABLE');
    expect(result.endpoint).toBe('/accountancy/journal');
    expect(result.journaux).toBeUndefined(); // Ne doit JAMAIS retourner de journaux fictifs
  });

  it('list_accounting_accounts doit retourner supported: false si endpoint REST 404', async () => {
    const api = createMockApi();
    const resultStr = await handleAccountingTool('list_accounting_accounts', {}, api);
    const result = JSON.parse(resultStr);

    expect(result.supported).toBe(false);
    expect(result.error).toBe('REST_ENDPOINT_NOT_AVAILABLE');
    expect(result.endpoint).toBe('/accountancy/account');
    expect(result.comptes_standards).toBeUndefined(); // Ne doit JAMAIS retourner de comptes fictifs
  });

  it('list_accounting_entries doit retourner supported: false si endpoint REST 404', async () => {
    const api = createMockApi();
    const resultStr = await handleAccountingTool('list_accounting_entries', {}, api);
    const result = JSON.parse(resultStr);

    expect(result.supported).toBe(false);
    expect(result.error).toBe('REST_ENDPOINT_NOT_AVAILABLE');
    expect(result.endpoint).toBe('/accountancy/bookkeeping');
  });

  it('create_misc_journal_entry doit retourner supported: false si POST 404', async () => {
    const api = createMockApi();
    const resultStr = await handleAccountingAdvancedTool('create_misc_journal_entry', {
      label: 'OD Test',
      journal_code: 'OD',
      date: '2026-10-12',
      lines: []
    }, api);
    const result = JSON.parse(resultStr);

    expect(result.supported).toBe(false);
    expect(result.applied).toBe(false);
    expect(result.error).toBe('REST_ENDPOINT_NOT_AVAILABLE');
  });

  it('get_financial_summary doit obligatoirement inclure le drapeau reconstituted: true', async () => {
    const api = createMockApi({
      '/invoices': [
        { id: 1, date: Math.floor(new Date('2026-05-01').getTime() / 1000), total_ttc: 50000, paye: '1', statut: '2' },
        { id: 2, date: Math.floor(new Date('2026-06-01').getTime() / 1000), total_ttc: 20000, remaintopay: 20000, paye: '0', statut: '1' }
      ],
      '/bankaccounts': [
        { id: 1, balance: 100000 }
      ]
    });

    const resultStr = await handleAccountingTool('get_financial_summary', { year: 2026 }, api);
    const result = JSON.parse(resultStr);

    expect(result.reconstituted).toBe(true);
    expect(result.chiffre_affaires_TTC).toBe('50000.00');
    expect(result.total_factures_impayees_TTC).toBe('20000.00');
  });
});
