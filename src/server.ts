/**
 * src/server.ts — Fabrique du serveur MCP Dolibarr
 * Compatible stdio (Claude Desktop) et HTTP/SSE (Claude.ai web)
 *
 * Digital Factory Senegal — https://digitalfactory.sn
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";

import { DolibarrAPI } from "./api.js";
import { thirdpartyTools, handleThirdpartyTool } from "./tools/thirdparties.js";
import { invoiceTools, handleInvoiceTool } from "./tools/invoices.js";
import { proposalTools, handleProposalTool } from "./tools/proposals.js";
import {
  orderTools,
  supplierOrderTools,
  handleOrderTool,
} from "./tools/orders.js";
import { productTools, handleProductTool } from "./tools/products.js";
import { accountingTools, handleAccountingTool } from "./tools/accounting.js";
import {
  crmTools,
  projectTools,
  hrTools,
  contractTools,
  handleCrmTool,
  handleProjectTool,
  handleHrTool,
  handleContractTool,
} from "./tools/crm_projects_hr.js";
import { setupTools, handleSetupTool } from "./tools/setup.js";

dotenv.config();

// ─────────────────────────────────────────────
// Ensemble de tous les outils (55+)
// ─────────────────────────────────────────────
const ALL_TOOLS = [
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
];

// ─────────────────────────────────────────────
// Routeur : dispatch vers le bon handler
// ─────────────────────────────────────────────
async function routeTool(
  name: string,
  args: Record<string, unknown>,
  api: DolibarrAPI
): Promise<string> {
  // Tiers
  const thirdpartyNames = thirdpartyTools.map((t) => t.name);
  if (thirdpartyNames.includes(name)) return handleThirdpartyTool(name, args, api);

  // Facturation
  const invoiceNames = invoiceTools.map((t) => t.name);
  if (invoiceNames.includes(name)) return handleInvoiceTool(name, args, api);

  // Devis
  const proposalNames = proposalTools.map((t) => t.name);
  if (proposalNames.includes(name)) return handleProposalTool(name, args, api);

  // Commandes (clients + fournisseurs)
  const orderNames = [...orderTools, ...supplierOrderTools].map((t) => t.name);
  if (orderNames.includes(name)) return handleOrderTool(name, args, api);

  // Produits & stocks
  const productNames = productTools.map((t) => t.name);
  if (productNames.includes(name)) return handleProductTool(name, args, api);

  // Comptabilité
  const accountingNames = accountingTools.map((t) => t.name);
  if (accountingNames.includes(name)) return handleAccountingTool(name, args, api);

  // CRM
  const crmNames = crmTools.map((t) => t.name);
  if (crmNames.includes(name)) return handleCrmTool(name, args, api);

  // Projets & tâches
  const projectNames = projectTools.map((t) => t.name);
  if (projectNames.includes(name)) return handleProjectTool(name, args, api);

  // RH
  const hrNames = hrTools.map((t) => t.name);
  if (hrNames.includes(name)) return handleHrTool(name, args, api);

  // Contrats
  const contractNames = contractTools.map((t) => t.name);
  if (contractNames.includes(name)) return handleContractTool(name, args, api);

  // Configuration & administration
  const setupNames = setupTools.map((t) => t.name);
  if (setupNames.includes(name)) return handleSetupTool(name, args, api);

  throw new Error(`Outil inconnu : ${name}`);
}

// ─────────────────────────────────────────────
// Fabrique principale — appelée par index.ts et http.ts
// ─────────────────────────────────────────────
export function createServer(): Server {
  const DOLIBARR_URL = process.env.DOLIBARR_URL;
  const DOLIBARR_API_KEY = process.env.DOLIBARR_API_KEY;

  if (!DOLIBARR_URL || !DOLIBARR_API_KEY) {
    throw new Error(
      "Variables d'environnement manquantes : DOLIBARR_URL et DOLIBARR_API_KEY sont requis."
    );
  }

  const api = new DolibarrAPI(DOLIBARR_URL, DOLIBARR_API_KEY);

  const server = new Server(
    {
      name: "mcp-dolibarr",
      version: "2.1.0",
    },
    {
      capabilities: { tools: {} },
    }
  );

  // ── Lister les outils disponibles ──
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS,
  }));

  // ── Exécuter un outil ──
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await routeTool(
        name,
        (args as Record<string, unknown>) || {},
        api
      );
      return {
        content: [{ type: "text" as const, text: result }],
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      return {
        content: [{ type: "text" as const, text: `❌ Erreur : ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}
