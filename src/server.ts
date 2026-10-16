/**
 * Serveur MCP Dolibarr (fork durci).
 *
 * Chaque appel d'outil traverse, dans l'ordre :
 *   1. politique (mode lecture seule / outils sensibles / listes d'activation) ;
 *   2. validation stricte des arguments (schémas durcis, additionalProperties:false) ;
 *   3. exécution du handler via un client API en liste blanche de routes ;
 *   4. troncature de la sortie (MCP_MAX_RESPONSE_CHARS).
 * Les erreurs internes ne sont jamais renvoyées telles quelles au client.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';
import { DolibarrAPI, ApiError } from './api.js';
import { loadConfig, type Config } from './config.js';
import { annotate, dedupe, denialReason, isAllowed } from './security/policy.js';
import { ToolValidator, ValidationError } from './security/validation.js';
import { UsfError } from './security/usf.js';
import { manifestInfo } from './security/routes.js';

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
import { pricingTools, handlePricingTool } from "./tools/pricing.js";
import { notificationTools, handleNotificationTool } from "./tools/notifications.js";

type Handler = (name: string, args: Record<string, unknown>, api: DolibarrAPI, cfg: Config) => Promise<string>;

export const TOOL_SETS: { tools: Tool[]; h: Handler }[] = [
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
    { tools: pricingTools, h: handlePricingTool },
  { tools: notificationTools, h: handleNotificationTool },
];

export const ALL_TOOLS: Tool[] = dedupe(TOOL_SETS.flatMap((s) => s.tools));
const HANDLERS = new Map<string, Handler>();
for (const s of TOOL_SETS) for (const t of s.tools) if (!HANDLERS.has(t.name)) HANDLERS.set(t.name, s.h);

export const VERSION = '3.0.0';

export function createApi(cfg: Config): DolibarrAPI {
  return new DolibarrAPI(cfg.dolibarrUrl, cfg.apiKey, {
    readOnly: cfg.mode !== 'readwrite',
    dolibarrVersion: cfg.dolibarrVersion,
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n… [sortie tronquée à ${max} caractères — affinez avec limit/page/sqlfilters]`;
}

export function createServer(cfg: Config = loadConfig(), api: DolibarrAPI = createApi(cfg)): Server {
  const validator = new ToolValidator(ALL_TOOLS);
  const visible = ALL_TOOLS.filter((t) => isAllowed(t.name, cfg)).map((t) =>
    annotate({ ...t, inputSchema: validator.schemas.get(t.name) as Tool['inputSchema'] }),
  );
  const server = new Server({ name: 'mcp-dolibarr-secure', version: VERSION }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: visible }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: rawArgs } = req.params;
    const fail = (text: string) => ({ content: [{ type: 'text' as const, text: `❌ ${text}` }], isError: true });
    const handler = HANDLERS.get(name);
    if (!handler) return fail('Outil inconnu.');
    if (!isAllowed(name, cfg)) return fail(denialReason(name, cfg));
    try {
      const args = validator.validate(name, rawArgs);
      const out = await handler(name, args, api, cfg);
      return { content: [{ type: 'text' as const, text: truncate(out, cfg.maxResponseChars) }] };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ApiError || error instanceof UsfError) {
        return fail(error.message);
      }
      console.error(`[MCP] Erreur interne dans ${name}:`, error instanceof Error ? error.message : 'inconnue');
      return fail('Erreur interne du serveur MCP.');
    }
  });
  return server;
}

export { manifestInfo };
