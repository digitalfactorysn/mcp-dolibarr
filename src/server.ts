/**
 * src/server.ts — MCP Dolibarr 100% COMPLET
 * Tous les modules Dolibarr disponibles
 * Digital Factory Senegal — https://digitalfactory.sn
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { DolibarrAPI } from "./api.js";

// ── Modules existants ──
import { thirdpartyTools, handleThirdpartyTool } from "./tools/thirdparties.js";
import { invoiceTools, handleInvoiceTool } from "./tools/invoices.js";
import { proposalTools, handleProposalTool } from "./tools/proposals.js";
import { orderTools, supplierOrderTools, handleOrderTool } from "./tools/orders.js";
import { productTools, handleProductTool } from "./tools/products.js";
import { accountingTools, handleAccountingTool } from "./tools/accounting.js";
import { crmTools, projectTools, hrTools, contractTools, handleCrmTool, handleProjectTool, handleHrTool, handleContractTool } from "./tools/crm_projects_hr.js";
import { setupTools, handleSetupTool } from "./tools/setup.js";
import { supplierInvoiceTools, handleSupplierInvoiceTool } from "./tools/supplier_invoices.js";
import { interventionTools, handleInterventionTool } from "./tools/interventions.js";
import { ticketTools, handleTicketTool } from "./tools/tickets.js";
import { shipmentTools, receptionTools, handleShipmentTool } from "./tools/shipments.js";
import { categoryTools, handleCategoryTool } from "./tools/categories.js";
import { memberTools, handleMemberTool } from "./tools/members.js";
import { bomTools, manufacturingTools, handleBomTool, handleManufacturingTool } from "./tools/manufacturing.js";
import { leaveTools, salaryTools, handleLeaveTool, handleSalaryTool } from "./tools/hr_advanced.js";

// ── Nouveaux modules (5% restants) ──
import { documentTools, handleDocumentTool } from "./tools/documents.js";
import { warehouseTools, batchTools, handleWarehouseTool } from "./tools/warehouses.js";
import { paymentTools, handlePaymentTool } from "./tools/payments.js";
import { mailingTools, resourceTools, handleMailingTool, handleResourceTool } from "./tools/mailings.js";
import { donationTools, loanTools, handleDonationTool, handleLoanTool } from "./tools/donations_loans.js";

dotenv.config();

const ALL_TOOLS = [
  ...thirdpartyTools, ...invoiceTools, ...proposalTools,
  ...orderTools, ...supplierOrderTools, ...productTools,
  ...accountingTools, ...crmTools, ...projectTools,
  ...hrTools, ...contractTools, ...setupTools,
  ...supplierInvoiceTools, ...interventionTools, ...ticketTools,
  ...shipmentTools, ...receptionTools, ...categoryTools,
  ...memberTools, ...bomTools, ...manufacturingTools,
  ...leaveTools, ...salaryTools,
  ...documentTools, ...warehouseTools, ...batchTools,
  ...paymentTools, ...mailingTools, ...resourceTools,
  ...donationTools, ...loanTools,
];

async function routeTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  const toolSets = [
    { tools: thirdpartyTools, handler: handleThirdpartyTool },
    { tools: invoiceTools, handler: handleInvoiceTool },
    { tools: proposalTools, handler: handleProposalTool },
    { tools: [...orderTools, ...supplierOrderTools], handler: handleOrderTool },
    { tools: productTools, handler: handleProductTool },
    { tools: accountingTools, handler: handleAccountingTool },
    { tools: crmTools, handler: handleCrmTool },
    { tools: projectTools, handler: handleProjectTool },
    { tools: hrTools, handler: handleHrTool },
    { tools: contractTools, handler: handleContractTool },
    { tools: setupTools, handler: handleSetupTool },
    { tools: supplierInvoiceTools, handler: handleSupplierInvoiceTool },
    { tools: interventionTools, handler: handleInterventionTool },
    { tools: ticketTools, handler: handleTicketTool },
    { tools: [...shipmentTools, ...receptionTools], handler: handleShipmentTool },
    { tools: categoryTools, handler: handleCategoryTool },
    { tools: memberTools, handler: handleMemberTool },
    { tools: bomTools, handler: handleBomTool },
    { tools: manufacturingTools, handler: handleManufacturingTool },
    { tools: leaveTools, handler: handleLeaveTool },
    { tools: salaryTools, handler: handleSalaryTool },
    { tools: documentTools, handler: handleDocumentTool },
    { tools: [...warehouseTools, ...batchTools], handler: handleWarehouseTool },
    { tools: paymentTools, handler: handlePaymentTool },
    { tools: mailingTools, handler: handleMailingTool },
    { tools: resourceTools, handler: handleResourceTool },
    { tools: donationTools, handler: handleDonationTool },
    { tools: loanTools, handler: handleLoanTool },
  ];

  for (const { tools, handler } of toolSets) {
    if (tools.map((t) => t.name).includes(name)) return handler(name, args, api);
  }
  throw new Error(`Outil inconnu : ${name}`);
}

export function createServer(): Server {
  const DOLIBARR_URL = process.env.DOLIBARR_URL;
  const DOLIBARR_API_KEY = process.env.DOLIBARR_API_KEY;
  if (!DOLIBARR_URL || !DOLIBARR_API_KEY) throw new Error("DOLIBARR_URL et DOLIBARR_API_KEY sont requis.");

  const api = new DolibarrAPI(DOLIBARR_URL, DOLIBARR_API_KEY);
  const server = new Server({ name: "mcp-dolibarr", version: "4.0.0" }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: ALL_TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await routeTool(name, (args as Record<string, unknown>) || {}, api);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      return { content: [{ type: "text" as const, text: `❌ Erreur : ${message}` }], isError: true };
    }
  });

  return server;
}
