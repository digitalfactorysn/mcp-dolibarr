/**
 * src/server.ts — MCP Dolibarr v5.0 — COMPLET 100%
 * Digital Factory Senegal — https://digitalfactory.sn
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { DolibarrAPI } from "./api.js";

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
import { documentTools, handleDocumentTool } from "./tools/documents.js";
import { warehouseTools, batchTools, handleWarehouseTool } from "./tools/warehouses.js";
import { paymentTools, handlePaymentTool } from "./tools/payments.js";
import { mailingTools, resourceTools, handleMailingTool, handleResourceTool } from "./tools/mailings.js";
import { donationTools, loanTools, handleDonationTool, handleLoanTool } from "./tools/donations_loans.js";
import { expenseReportTools, handleExpenseReportTool } from "./tools/expense_reports.js";
import { accountingAdvancedTools, handleAccountingAdvancedTool } from "./tools/accounting_advanced.js";
import { accountingConfigTools, handleAccountingConfigTool } from "./tools/accounting_config.js";
import { pricingTools, handlePricingTool } from "./tools/pricing.js";
import { notificationTools, handleNotificationTool } from "./tools/notifications.js";

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
  ...expenseReportTools,
  ...accountingAdvancedTools,
    ...accountingConfigTools,
  ...pricingTools,
  ...notificationTools,
];

async function routeTool(name: string, args: Record<string, unknown>, api: DolibarrAPI): Promise<string> {
  const sets = [
    { tools: thirdpartyTools, h: handleThirdpartyTool },
    { tools: invoiceTools, h: handleInvoiceTool },
    { tools: proposalTools, h: handleProposalTool },
    { tools: [...orderTools, ...supplierOrderTools], h: handleOrderTool },
    { tools: productTools, h: handleProductTool },
    { tools: accountingTools, h: handleAccountingTool },
    { tools: crmTools, h: handleCrmTool },
    { tools: projectTools, h: handleProjectTool },
    { tools: hrTools, h: handleHrTool },
    { tools: contractTools, h: handleContractTool },
    { tools: setupTools, h: handleSetupTool },
    { tools: supplierInvoiceTools, h: handleSupplierInvoiceTool },
    { tools: interventionTools, h: handleInterventionTool },
    { tools: ticketTools, h: handleTicketTool },
    { tools: [...shipmentTools, ...receptionTools], h: handleShipmentTool },
    { tools: categoryTools, h: handleCategoryTool },
    { tools: memberTools, h: handleMemberTool },
    { tools: bomTools, h: handleBomTool },
    { tools: manufacturingTools, h: handleManufacturingTool },
    { tools: leaveTools, h: handleLeaveTool },
    { tools: salaryTools, h: handleSalaryTool },
    { tools: documentTools, h: handleDocumentTool },
    { tools: [...warehouseTools, ...batchTools], h: handleWarehouseTool },
    { tools: paymentTools, h: handlePaymentTool },
    { tools: mailingTools, h: handleMailingTool },
    { tools: resourceTools, h: handleResourceTool },
    { tools: donationTools, h: handleDonationTool },
    { tools: loanTools, h: handleLoanTool },
    { tools: expenseReportTools, h: handleExpenseReportTool },
    { tools: accountingAdvancedTools, h: handleAccountingAdvancedTool },
    { tools: accountingConfigTools, h: handleAccountingConfigTool },
    { tools: pricingTools, h: handlePricingTool },
    { tools: notificationTools, h: handleNotificationTool },
  ];
  for (const { tools, h } of sets) {
    if (tools.map(t => t.name).includes(name)) return h(name, args, api);
  }
  throw new Error(`Outil inconnu : ${name}`);
}

export function createServer(): Server {
  const DOLIBARR_URL = process.env.DOLIBARR_URL;
  const DOLIBARR_API_KEY = process.env.DOLIBARR_API_KEY;
  if (!DOLIBARR_URL || !DOLIBARR_API_KEY) throw new Error("DOLIBARR_URL et DOLIBARR_API_KEY requis.");
  const api = new DolibarrAPI(DOLIBARR_URL, DOLIBARR_API_KEY);
  const server = new Server({ name: "mcp-dolibarr", version: "5.0.0" }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: ALL_TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    try {
      const result = await routeTool(name, (args as Record<string, unknown>) || {}, api);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (error) {
      return { content: [{ type: "text" as const, text: `❌ ${error instanceof Error ? error.message : 'Erreur inconnue'}` }], isError: true };
    }
  });
  return server;
}
