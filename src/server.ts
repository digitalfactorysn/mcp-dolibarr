/**
 * src/server.ts — Fabrique du serveur MCP Dolibarr COMPLET
 * 100% des fonctionnalités Dolibarr disponibles
 * Digital Factory Senegal — https://digitalfactory.sn
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { DolibarrAPI } from "./api.js";

// Modules existants
import { thirdpartyTools, handleThirdpartyTool } from "./tools/thirdparties.js";
import { invoiceTools, handleInvoiceTool } from "./tools/invoices.js";
import { proposalTools, handleProposalTool } from "./tools/proposals.js";
import { orderTools, supplierOrderTools, handleOrderTool } from "./tools/orders.js";
import { productTools, handleProductTool } from "./tools/products.js";
import { accountingTools, handleAccountingTool } from "./tools/accounting.js";
import { crmTools, projectTools, hrTools, contractTools, handleCrmTool, handleProjectTool, handleHrTool, handleContractTool } from "./tools/crm_projects_hr.js";
import { setupTools, handleSetupTool } from "./tools/setup.js";

// Nouveaux modules
import { supplierInvoiceTools, handleSupplierInvoiceTool } from "./tools/supplier_invoices.js";
import { interventionTools, handleInterventionTool } from "./tools/interventions.js";
import { ticketTools, handleTicketTool } from "./tools/tickets.js";
import { shipmentTools, receptionTools, handleShipmentTool } from "./tools/shipments.js";
import { categoryTools, handleCategoryTool } from "./tools/categories.js";
import { memberTools, handleMemberTool } from "./tools/members.js";
import { bomTools, manufacturingTools, handleBomTool, handleManufacturingTool } from "./tools/manufacturing.js";
import { leaveTools, salaryTools, handleLeaveTool, handleSalaryTool } from "./tools/hr_advanced.js";

dotenv.config();

const ALL_TOOLS = [
  // Existants
  ...thirdpartyTools,
  ...invoiceTools,
  ...proposalTools,
  ...orderTools,
  ...supplierOrderTools,
  ...productTools,
  ...accountingTools,
  ...crmTools,
  ...projectTools,
  ...hrTools,
  ...contractTools,
  ...setupTools,
  // Nouveaux
  ...supplierInvoiceTools,
  ...interventionTools,
  ...ticketTools,
  ...shipmentTools,
  ...receptionTools,
  ...categoryTools,
  ...memberTools,
  ...bomTools,
  ...manufacturingTools,
  ...leaveTools,
  ...salaryTools,
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
  ];

  for (const { tools, handler } of toolSets) {
    if (tools.map((t) => t.name).includes(name)) {
      return handler(name, args, api);
    }
  }
  throw new Error(`Outil inconnu : ${name}`);
}

export function createServer(): Server {
  const DOLIBARR_URL = process.env.DOLIBARR_URL;
  const DOLIBARR_API_KEY = process.env.DOLIBARR_API_KEY;

  if (!DOLIBARR_URL || !DOLIBARR_API_KEY) {
    throw new Error("Variables manquantes : DOLIBARR_URL et DOLIBARR_API_KEY sont requis.");
  }

  const api = new DolibarrAPI(DOLIBARR_URL, DOLIBARR_API_KEY);
  const server = new Server({ name: "mcp-dolibarr", version: "3.0.0" }, { capabilities: { tools: {} } });

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
