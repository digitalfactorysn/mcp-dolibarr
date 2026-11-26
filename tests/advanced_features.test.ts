import { describe, it, expect, vi } from 'vitest';
import { handleAdvancedFeatureTool } from '../src/tools/advanced_features.js';
import { DolibarrAPI } from '../src/api.js';

describe('5. Fonctionnalités Avancées v5.2.0', () => {
  const createMockApi = () => {
    const api = new DolibarrAPI('https://test.local', 'fake_key');
    api.get = vi.fn().mockImplementation((endpoint: string, params: any) => {
      if (endpoint === '/thirdparties') return Promise.resolve([{ id: 10, nom: 'Client Test Alpha' }]);
      if (endpoint === '/invoices') return Promise.resolve([{ id: 20, ref: 'FA2610-0001', total_ttc: 150000, paye: '0' }]);
      if (endpoint === '/proposals') return Promise.resolve([{ id: 30, ref: 'PR2610-0001', total_ttc: 300000, fk_statut: '1' }]);
      if (endpoint === '/orders') return Promise.resolve([]);
      if (endpoint === '/products') return Promise.resolve([{ id: 40, ref: 'SRV-01', label: 'Support Technique' }]);
      if (endpoint === '/tickets') return Promise.resolve([{ id: 50, ref: 'TCK-01', subject: 'Incident Réseau' }]);
      if (endpoint === '/supplierinvoices') return Promise.resolve([{ id: 60, total_ttc: 80000 }]);
      return Promise.resolve([]);
    });
    api.post = vi.fn().mockImplementation((endpoint: string, payload: any) => {
      if (endpoint === '/agendaevents') return Promise.resolve({ id: 999 });
      return Promise.resolve(1);
    });
    return api;
  };

  it('global_search doit agréger les résultats sur tous les modules interrogés', async () => {
    const api = createMockApi();
    const resStr = await handleAdvancedFeatureTool('global_search', { query: 'Test' }, api);
    const res = JSON.parse(resStr);

    expect(res.search_term).toBe('Test');
    expect(res.thirdparties.length).toBe(1);
    expect(res.invoices.length).toBe(1);
    expect(res.proposals.length).toBe(1);
    expect(res.products.length).toBe(1);
    expect(res.tickets.length).toBe(1);
  });

  it('get_dashboard_summary doit agréger les KPIs financiers et opérationnels', async () => {
    const api = createMockApi();
    const resStr = await handleAdvancedFeatureTool('get_dashboard_summary', {}, api);
    const res = JSON.parse(resStr);

    expect(res.kpis).toBeDefined();
    expect(res.kpis.unpaid_invoices_count).toBe(1);
    expect(res.kpis.unpaid_invoices_total_ttc).toBe(150000);
    expect(res.kpis.open_proposals_count).toBe(1);
    expect(res.kpis.open_proposals_total_ttc).toBe(300000);
    expect(res.recent_thirdparties.length).toBe(1);
  });

  it('log_mcp_activity doit consigner un événement dans l\'agenda Dolibarr', async () => {
    const api = createMockApi();
    const res = await handleAdvancedFeatureTool('log_mcp_activity', {
      label: 'Génération rapport mensuel',
      description: 'Audit financier exécuté via Claude',
      socid: 10
    }, api);

    expect(res).toContain('✅ Activité consignée dans l\'Agenda Dolibarr');
    expect(api.post).toHaveBeenCalledWith('/agendaevents', expect.objectContaining({
      label: 'Génération rapport mensuel',
      actioncode: 'AC_OTH'
    }));
  });

  it('get_financial_kpis doit calculer les ratios et marges échantillonnées', async () => {
    const api = createMockApi();
    const resStr = await handleAdvancedFeatureTool('get_financial_kpis', {}, api);
    const res = JSON.parse(resStr);

    expect(res.customer_revenue_sample_total_ttc).toBe(150000);
    expect(res.supplier_expenses_sample_total_ttc).toBe(80000);
    expect(res.net_margin_sample_ttc).toBe(70000);
  });
});
