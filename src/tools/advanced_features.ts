import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI } from '../api.js';

export const advancedFeatureTools: Tool[] = [
  {
    name: 'global_search',
    description: "Effectue une recherche globale unifiée à travers les Tiers, Factures, Devis, Commandes, Produits et Tickets",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Terme de recherche (nom de client, référence de facture, mot-clé...)" },
        limit: { type: 'number', description: "Nombre max de résultats par catégorie (défaut: 5)" },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_dashboard_summary',
    description: "Obtenir la synthèse KPI du tableau de bord (Total impayés, devis en cours, récents tiers et tickets)",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'log_mcp_activity',
    description: "Enregistrer une activité / audit log dans l'Agenda Dolibarr pour la traçabilité des actions IA",
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: "Titre de l'action/événement" },
        description: { type: 'string', description: "Description détaillée de l'action effectuée" },
        actioncode: { type: 'string', description: "Code action (défaut: AC_OTH)" },
        socid: { type: 'number', description: "ID du tiers associé (optionnel)" },
      },
      required: ['label'],
    },
  },
  {
    name: 'get_financial_kpis',
    description: "Obtenir les indicateurs clés de performance financière (Chiffre d'affaires, impayés, devis en attente)",
    inputSchema: {
      type: 'object',
      properties: {
        year: { type: 'number', description: "Année fiscale (ex: 2026)" },
      },
    },
  },
];

export async function handleAdvancedFeatureTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  switch (name) {
    case 'global_search': {
      const q = String(args.query || '').trim();
      const limit = Number(args.limit || 5);
      if (!q) throw new Error("Le paramètre query est requis.");

      const results: Record<string, unknown> = {};

      const safeFetch = async (fn: () => Promise<unknown>) => {
        try { return await fn(); } catch (e) { return []; }
      };

      const [thirdparties, invoices, proposals, orders, products, tickets] = await Promise.all([
        safeFetch(() => api.get('/thirdparties', { sqlfilters: `(t.nom:like:'%${q}%')OR(t.code_client:like:'%${q}%')`, limit })),
        safeFetch(() => api.get('/invoices', { sqlfilters: `(t.ref:like:'%${q}%')OR(t.ref_client:like:'%${q}%')`, limit })),
        safeFetch(() => api.get('/proposals', { sqlfilters: `(t.ref:like:'%${q}%')`, limit })),
        safeFetch(() => api.get('/orders', { sqlfilters: `(t.ref:like:'%${q}%')`, limit })),
        safeFetch(() => api.get('/products', { sqlfilters: `(t.ref:like:'%${q}%')OR(t.label:like:'%${q}%')`, limit })),
        safeFetch(() => api.get('/tickets', { sqlfilters: `(t.ref:like:'%${q}%')OR(t.subject:like:'%${q}%')`, limit })),
      ]);

      results.search_term = q;
      results.thirdparties = Array.isArray(thirdparties) ? thirdparties : [];
      results.invoices = Array.isArray(invoices) ? invoices : [];
      results.proposals = Array.isArray(proposals) ? proposals : [];
      results.orders = Array.isArray(orders) ? orders : [];
      results.products = Array.isArray(products) ? products : [];
      results.tickets = Array.isArray(tickets) ? tickets : [];

      return JSON.stringify(results, null, 2);
    }

    case 'get_dashboard_summary': {
      const safeFetch = async (fn: () => Promise<unknown>) => {
        try { return await fn(); } catch (e) { return []; }
      };

      const [unpaidInvoices, openProposals, recentThirdparties, openTickets] = await Promise.all([
        safeFetch(() => api.get('/invoices', { sqlfilters: '(t.paye:=:0)', limit: 50 })),
        safeFetch(() => api.get('/proposals', { sqlfilters: '(t.fk_statut:=:1)', limit: 50 })),
        safeFetch(() => api.get('/thirdparties', { sortfield: 't.rowid', sortorder: 'DESC', limit: 5 })),
        safeFetch(() => api.get('/tickets', { sqlfilters: '(t.fk_statut:!=:8)', sortfield: 't.rowid', sortorder: 'DESC', limit: 5 })),
      ]);

      const unpaidList = Array.isArray(unpaidInvoices) ? unpaidInvoices : [];
      const proposalList = Array.isArray(openProposals) ? openProposals : [];

      const totalUnpaidAmountTTC = unpaidList.reduce((acc: number, inv: any) => acc + (Number(inv.total_ttc) || 0), 0);
      const totalUnpaidAmountHT = unpaidList.reduce((acc: number, inv: any) => acc + (Number(inv.total_ht) || 0), 0);
      const totalOpenProposalsAmountTTC = proposalList.reduce((acc: number, prop: any) => acc + (Number(prop.total_ttc) || 0), 0);

      const summary = {
        kpis: {
          unpaid_invoices_count: unpaidList.length,
          unpaid_invoices_total_ttc: Math.round(totalUnpaidAmountTTC * 100) / 100,
          unpaid_invoices_total_ht: Math.round(totalUnpaidAmountHT * 100) / 100,
          open_proposals_count: proposalList.length,
          open_proposals_total_ttc: Math.round(totalOpenProposalsAmountTTC * 100) / 100,
          open_tickets_count: Array.isArray(openTickets) ? openTickets.length : 0,
        },
        recent_thirdparties: Array.isArray(recentThirdparties) ? recentThirdparties : [],
        recent_open_tickets: Array.isArray(openTickets) ? openTickets : [],
      };

      return JSON.stringify(summary, null, 2);
    }

    case 'log_mcp_activity': {
      const payload: Record<string, unknown> = {
        label: args.label,
        note: args.description || "Action automatique exécutée via MCP AI Agent",
        actioncode: args.actioncode || "AC_OTH",
        percentage: 100,
      };
      if (args.socid) payload.socid = args.socid;

      const res = await api.post('/agendaevents', payload);
      return `✅ Activité consignée dans l'Agenda Dolibarr (ID Event: ${JSON.stringify(res)})`;
    }

    case 'get_financial_kpis': {
      const safeFetch = async (fn: () => Promise<unknown>) => {
        try { return await fn(); } catch (e) { return []; }
      };

      const [invoices, supplierInvoices] = await Promise.all([
        safeFetch(() => api.get('/invoices', { limit: 100, sortfield: 't.rowid', sortorder: 'DESC' })),
        safeFetch(() => api.get('/supplierinvoices', { limit: 100, sortfield: 't.rowid', sortorder: 'DESC' })),
      ]);

      const invList = Array.isArray(invoices) ? invoices : [];
      const supList = Array.isArray(supplierInvoices) ? supplierInvoices : [];

      const customerRevenueTTC = invList.reduce((acc: number, item: any) => acc + (Number(item.total_ttc) || 0), 0);
      const supplierExpenseTTC = supList.reduce((acc: number, item: any) => acc + (Number(item.total_ttc) || 0), 0);

      const kpis = {
        customer_revenue_sample_total_ttc: Math.round(customerRevenueTTC * 100) / 100,
        supplier_expenses_sample_total_ttc: Math.round(supplierExpenseTTC * 100) / 100,
        net_margin_sample_ttc: Math.round((customerRevenueTTC - supplierExpenseTTC) * 100) / 100,
        total_customer_invoices_analyzed: invList.length,
        total_supplier_invoices_analyzed: supList.length,
      };

      return JSON.stringify(kpis, null, 2);
    }

    default:
      throw new Error(`Outil inconnu : ${name}`);
  }
}
