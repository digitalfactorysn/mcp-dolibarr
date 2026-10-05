/**
 * src/server.ts — Définition du serveur MCP Dolibarr (partagé par stdio et HTTP)
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { DolibarrAPI } from "./api.js";
import { sanitizeArgs } from "./validation.js";
import { VERSION } from "./version.js";

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
import { warehouseTools, handleWarehouseTool } from "./tools/warehouses.js";
import { paymentTools, handlePaymentTool } from "./tools/payments.js";
import { mailingTools, handleMailingTool } from "./tools/mailings.js";
import { donationTools, handleDonationTool } from "./tools/donations_loans.js";
import { expenseReportTools, handleExpenseReportTool } from "./tools/expense_reports.js";
import { accountingAdvancedTools, handleAccountingAdvancedTool } from "./tools/accounting_advanced.js";
import { accountingConfigTools, handleAccountingConfigTool } from "./tools/accounting_config.js";
import { pricingTools, handlePricingTool } from "./tools/pricing.js";
import { notificationTools, handleNotificationTool } from "./tools/notifications.js";

dotenv.config({ quiet: true });

type Handler = (name: string, args: Record<string, unknown>, api: DolibarrAPI) => Promise<string>;

const TOOL_SETS: { tools: Tool[]; h: Handler }[] = [
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
  { tools: warehouseTools, h: handleWarehouseTool },
  { tools: paymentTools, h: handlePaymentTool },
  { tools: mailingTools, h: handleMailingTool },
  { tools: donationTools, h: handleDonationTool },
  { tools: expenseReportTools, h: handleExpenseReportTool },
  { tools: accountingAdvancedTools, h: handleAccountingAdvancedTool },
  { tools: accountingConfigTools, h: handleAccountingConfigTool },
  { tools: pricingTools, h: handlePricingTool },
  { tools: notificationTools, h: handleNotificationTool },
];

/** Un outil est en lecture seule s'il ne fait que consulter des données. */
export function isReadOnlyTool(name: string): boolean {
  return /^(list_|get_|export_)/.test(name);
}

function isDestructiveTool(name: string): boolean {
  return /^delete_/.test(name);
}

export interface ToolPolicy {
  readOnly: boolean;
  disabled: Set<string>;
}

export function policyFromEnv(env: NodeJS.ProcessEnv = process.env): ToolPolicy {
  return {
    readOnly: /^(1|true|yes|oui)$/i.test(env.DOLIBARR_READ_ONLY ?? ""),
    disabled: new Set((env.DOLIBARR_DISABLED_TOOLS ?? "").split(",").map(s => s.trim()).filter(Boolean)),
  };
}

export function buildRegistry(policy: ToolPolicy): Map<string, { tool: Tool; h: Handler }> {
  const registry = new Map<string, { tool: Tool; h: Handler }>();
  for (const { tools, h } of TOOL_SETS) {
    for (const tool of tools) {
      if (registry.has(tool.name)) throw new Error(`Outil déclaré deux fois : ${tool.name}`);
      if (policy.disabled.has(tool.name)) continue;
      if (policy.readOnly && !isReadOnlyTool(tool.name)) continue;
      const readOnly = isReadOnlyTool(tool.name);
      registry.set(tool.name, {
        tool: { ...tool, annotations: { readOnlyHint: readOnly, destructiveHint: isDestructiveTool(tool.name), openWorldHint: false } },
        h,
      });
    }
  }
  return registry;
}

export function createServer(): Server {
  const DOLIBARR_URL = process.env.DOLIBARR_URL;
  const DOLIBARR_API_KEY = process.env.DOLIBARR_API_KEY;
  if (!DOLIBARR_URL || !DOLIBARR_API_KEY) throw new Error("DOLIBARR_URL et DOLIBARR_API_KEY requis.");
  const api = new DolibarrAPI(DOLIBARR_URL, DOLIBARR_API_KEY);
  const registry = buildRegistry(policyFromEnv());
  const tools = [...registry.values()].map(r => r.tool);

  const server = new Server({ name: "mcp-dolibarr", version: VERSION }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    try {
      const entry = registry.get(name);
      if (!entry) throw new Error(`Outil inconnu ou désactivé : ${name}`);
      const clean = sanitizeArgs(entry.tool, (args as Record<string, unknown>) || {});
      const result = await entry.h(name, clean, api);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (error) {
      return { content: [{ type: "text" as const, text: `❌ ${error instanceof Error ? error.message : 'Erreur inconnue'}` }], isError: true };
    }
  });
  return server;
}
