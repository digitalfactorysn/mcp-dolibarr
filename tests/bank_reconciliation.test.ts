import { describe, it, expect, vi } from 'vitest';
import { handleAccountingAdvancedTool } from '../src/tools/accounting_advanced.js';
import { DolibarrAPI } from '../src/api.js';

describe('3. Rapprochement bancaire : Relecture stricte & Protection compte prod', () => {
  it('doit refuser l\'opération si ciblage compte #1 (ECOBANK prod) sans autorisation explicite', async () => {
    const api = new DolibarrAPI('https://test.local', 'fake_key');
    const resultStr = await handleAccountingAdvancedTool('reconcile_bank_line', {
      account_id: 1,
      line_id: 99,
      num_releve: 'REL-2026-01'
    }, api);
    const result = JSON.parse(resultStr);

    expect(result.supported).toBe(false);
    expect(result.applied).toBe(false);
    expect(result.error).toBe('PRODUCTION_ACCOUNT_PROTECTED');
  });

  it('doit retourner applied: false et supported: false si la relecture ne confirme pas rappro=1', async () => {
    const api = new DolibarrAPI('https://test.local', 'fake_key');
    api.put = vi.fn().mockResolvedValue(1);
    // Simule la relecture où Dolibarr n'a pas persisté rappro=1 (comportement réel de l'API standard)
    api.get = vi.fn().mockResolvedValue({
      rowid: 123,
      label: 'Reconciliation REL-2026-01',
      rappro: 0,
      num_releve: null
    });

    const resultStr = await handleAccountingAdvancedTool('reconcile_bank_line', {
      account_id: 2, // Compte de test
      line_id: 123,
      num_releve: 'REL-2026-01'
    }, api);
    const result = JSON.parse(resultStr);

    expect(result.applied).toBe(false);
    expect(result.supported).toBe(false);
    expect(result.error).toBe('API_DOES_NOT_PERSIST_RECONCILIATION');
  });

  it('doit retourner applied: true UNIQUEMENT si la relecture confirme rappro=1 ou releve valide', async () => {
    const api = new DolibarrAPI('https://test.local', 'fake_key');
    api.put = vi.fn().mockResolvedValue(1);
    // Simule la relecture positive
    api.get = vi.fn().mockResolvedValue({
      rowid: 123,
      label: 'Reconciliation REL-2026-01',
      rappro: 1,
      num_releve: 'REL-2026-01'
    });

    const resultStr = await handleAccountingAdvancedTool('reconcile_bank_line', {
      account_id: 2, // Compte de test
      line_id: 123,
      num_releve: 'REL-2026-01'
    }, api);
    const result = JSON.parse(resultStr);

    expect(result.applied).toBe(true);
    expect(result.supported).toBe(true);
    expect(result.relecture_verifiee).toBe(true);
    expect(result.line_id).toBe(123);
  });
});
