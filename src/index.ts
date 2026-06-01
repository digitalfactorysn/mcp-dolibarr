#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";

import { DolibarrAPI } from "./api.js";

// --- Import all tool definitions ---
import { thirdpartyTools, handleThirdpartyTool } from "./tools/thirdparties.js";
import { invoiceTools, handleInvoiceTool } from "./tools/invoices.js";
import { proposalTools, handleProposalTool } from "./tools/proposals.js";
import { orderTools, supplierOrderTools, handleOrderTool } from "./tools/orders.js";
import { productTools, handleProductTool } from "./tools/products.js";
import { accountingTools, handleAccountingTool } from "./tools/accounting.js";
import {
  crmTools, projectTools, hrTools, contractTools,
  handleCrmTool, handleProjectTool, handleHrTool, handleContractTool,
} from "./tools/crm_projects_hr.js";
import { setupTools, handleSetupTool } from "./tools/setup.js";
import { adminTools, handleAdminTool } from "./tools/admin.js";
import { supplierInvoiceTools, handleSupplierInvoiceTool } from "./tools/supplier_invoices.js";
import { configAdvancedTools, handleConfigAdvancedTool } from "./tools/config_advanced.js";
import { stockWarehouseTools, handleStockWarehouseTool } from "./tools/stock_warehouses.js";
import { ticketTools, handleTicketTool } from "./tools/tickets.js";
import { memberTools, handleMemberTool } from "./tools/members.js";
import { interventionTools, handleInterventionTool } from "./tools/interventions.js";
import { mrpTools, recurringInvoiceTools, handleMrpTool, handleRecurringInvoiceTool } from "./tools/mrp_recurring.js";
import { orderExtendedTools } from "./tools/orders.js";

dotenv.config();

// ============================================================
// Configuration Check
// ============================================================
const DOLIBARR_URL = process.env.DOLIBARR_URL;
const DOLIBARR_API_KEY = process.env.DOLIBARR_API_KEY;

if (!DOLIBARR_URL || !DOLIBARR_API_KEY) {
  console.error("❌ Erreur de configuration: Les variables d'environnement DOLIBARR_URL et DOLIBARR_API_KEY sont requises.");
  console.error("   Exemple:");
  console.error('   DOLIBARR_URL="https://votre-instance-dolibarr.com"');
  console.error('   DOLIBARR_API_KEY="votre_clé_api_secrète"');
  process.exit(1);
}

const api = new DolibarrAPI(DOLIBARR_URL, DOLIBARR_API_KEY);

// ============================================================
// All tools aggregated
// ============================================================
const ALL_TOOLS = [
  ...thirdpartyTools,
  ...invoiceTools,
  ...proposalTools,
  ...orderTools,
  ...orderExtendedTools,
  ...supplierOrderTools,
  ...productTools,
  ...accountingTools,
  ...crmTools,
  ...projectTools,
  ...hrTools,
  ...contractTools,
  ...setupTools,
  ...adminTools,
  ...supplierInvoiceTools,
  ...configAdvancedTools,
  ...stockWarehouseTools,
  ...ticketTools,
  ...memberTools,
  ...interventionTools,
  ...mrpTools,
  ...recurringInvoiceTools,
];

// Build a lookup map: tool name -> category handler
const TOOL_NAME_SET = new Set(ALL_TOOLS.map((t) => t.name));

// ============================================================
// MCP Server Setup
// ============================================================
const server = new Server(
  {
    name: "mcp-dolibarr",
    version: "4.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler: List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: ALL_TOOLS };
});

// Handler: Call a tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const safeArgs = (args || {}) as Record<string, unknown>;

  if (!TOOL_NAME_SET.has(name)) {
    throw new McpError(ErrorCode.MethodNotFound, `Outil MCP Dolibarr introuvable: "${name}"`);
  }

  try {
    let result: string;

    // Route to the correct module handler
    if (thirdpartyTools.some((t) => t.name === name)) {
      result = await handleThirdpartyTool(name, safeArgs, api);
    } else if (invoiceTools.some((t) => t.name === name)) {
      result = await handleInvoiceTool(name, safeArgs, api);
    } else if (proposalTools.some((t) => t.name === name)) {
      result = await handleProposalTool(name, safeArgs, api);
    } else if ([...orderTools, ...supplierOrderTools].some((t) => t.name === name)) {
      result = await handleOrderTool(name, safeArgs, api);
    } else if (productTools.some((t) => t.name === name)) {
      result = await handleProductTool(name, safeArgs, api);
    } else if (accountingTools.some((t) => t.name === name)) {
      result = await handleAccountingTool(name, safeArgs, api);
    } else if (crmTools.some((t) => t.name === name)) {
      result = await handleCrmTool(name, safeArgs, api);
    } else if (projectTools.some((t) => t.name === name)) {
      result = await handleProjectTool(name, safeArgs, api);
    } else if (hrTools.some((t) => t.name === name)) {
      result = await handleHrTool(name, safeArgs, api);
    } else if (contractTools.some((t) => t.name === name)) {
      result = await handleContractTool(name, safeArgs, api);
    } else if (setupTools.some((t) => t.name === name)) {
      result = await handleSetupTool(name, safeArgs, api);
    } else if (adminTools.some((t) => t.name === name)) {
      result = await handleAdminTool(name, safeArgs, api);
    } else if (supplierInvoiceTools.some((t) => t.name === name)) {
      result = await handleSupplierInvoiceTool(name, safeArgs, api);
    } else if (configAdvancedTools.some((t) => t.name === name)) {
      result = await handleConfigAdvancedTool(name, safeArgs, api);
    } else if (stockWarehouseTools.some((t) => t.name === name)) {
      result = await handleStockWarehouseTool(name, safeArgs, api);
    } else if (ticketTools.some((t) => t.name === name)) {
      result = await handleTicketTool(name, safeArgs, api);
    } else if (memberTools.some((t) => t.name === name)) {
      result = await handleMemberTool(name, safeArgs, api);
    } else if (interventionTools.some((t) => t.name === name)) {
      result = await handleInterventionTool(name, safeArgs, api);
    } else if (mrpTools.some((t) => t.name === name)) {
      result = await handleMrpTool(name, safeArgs, api);
    } else if (recurringInvoiceTools.some((t) => t.name === name)) {
      result = await handleRecurringInvoiceTool(name, safeArgs, api);
    } else if (orderExtendedTools.some((t) => t.name === name)) {
      result = await handleOrderTool(name, safeArgs, api);
    } else {
      throw new McpError(ErrorCode.MethodNotFound, `Outil non assigné à un module: "${name}"`);
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // If it's an MCP error, re-throw it
    if (error instanceof McpError) throw error;

    // Otherwise wrap in a user-friendly response
    return {
      content: [
        {
          type: "text",
          text: `❌ Erreur lors de l'exécution de "${name}":\n${message}`,
        },
      ],
      isError: true,
    };
  }
});

// ============================================================
// Start server
// ============================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`✅ MCP Dolibarr Expert Server v3.0.0 démarré (${ALL_TOOLS.length} outils disponibles)`);
  console.error(`   Instance Dolibarr: ${DOLIBARR_URL}`);
}

main().catch((err) => {
  console.error("❌ Erreur fatale:", err);
  process.exit(1);
});
