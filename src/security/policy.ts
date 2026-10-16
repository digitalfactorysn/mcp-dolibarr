/**
 * Politique d'exposition des outils.
 *
 *  - « read »      : lecture seule (list_*, get_*, export FEC en lecture) ;
 *  - « write »     : crée/modifie des données (MCP_MODE=readwrite requis) ;
 *  - « sensitive » : envoi d'e-mails, suppressions, paiements, écritures
 *                    bancaires/comptables irréversibles (MCP_MODE=readwrite
 *                    ET MCP_ALLOW_SENSITIVE=true requis).
 *
 * Le défaut est « fail closed » : tout outil dont le nom n'est pas reconnu
 * comme une lecture est traité comme une écriture. Le client HTTP applique en
 * plus une garde indépendante (aucune requête non-GET en lecture seule).
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { Config } from '../config.js';

export type ToolClass = 'read' | 'write' | 'sensitive';

const READ_PREFIX = /^(list|get|search|count)_/;
const READ_EXTRA = new Set(['export_accounting_entries']);

export const SENSITIVE_TOOLS = new Set([
  'delete_document',
  'delete_invoice_line',
  'add_payment_to_invoice',
  'pay_supplier_invoice',
  'pay_expense_report',
  'add_bank_transaction',
  'create_credit_note',
  'update_product_stock',
  'create_salary',
  'produce_manufacturing_order',
  'create_donation',
  'subscribe_member',
  'validate_invoice',
  'validate_supplier_invoice',
]);

export function classify(name: string): ToolClass {
  if (SENSITIVE_TOOLS.has(name)) return 'sensitive';
  if (READ_PREFIX.test(name) || READ_EXTRA.has(name)) return 'read';
  return 'write';
}

export function isAllowed(name: string, cfg: Pick<Config, 'mode' | 'allowSensitive' | 'enabledTools' | 'disabledTools'>): boolean {
  if (cfg.disabledTools.has(name)) return false;
  if (cfg.enabledTools && !cfg.enabledTools.has(name)) return false;
  const c = classify(name);
  if (c === 'read') return true;
  if (cfg.mode !== 'readwrite') return false;
  if (c === 'sensitive') return cfg.allowSensitive;
  return true;
}

export function denialReason(name: string, cfg: Pick<Config, 'mode' | 'allowSensitive' | 'enabledTools' | 'disabledTools'>): string {
  if (cfg.disabledTools.has(name) || (cfg.enabledTools && !cfg.enabledTools.has(name))) {
    return `L'outil « ${name} » est désactivé par la configuration (MCP_ENABLED_TOOLS / MCP_DISABLED_TOOLS).`;
  }
  const c = classify(name);
  if (c !== 'read' && cfg.mode !== 'readwrite') {
    return `L'outil « ${name} » modifie des données : le serveur est en lecture seule (MCP_MODE=readonly).`;
  }
  if (c === 'sensitive' && !cfg.allowSensitive) {
    return `L'outil « ${name} » est sensible (e-mail, suppression, paiement…) : il exige MCP_ALLOW_SENSITIVE=true.`;
  }
  return `L'outil « ${name} » n'est pas disponible.`;
}

export function annotate(tool: Tool): Tool {
  const c = classify(tool.name);
  return {
    ...tool,
    annotations: {
      ...(tool.annotations ?? {}),
      readOnlyHint: c === 'read',
      destructiveHint: tool.name.startsWith('delete_'),
    },
  };
}

/** Dédoublonne par nom (premier gagnant) : la spécification MCP exige des noms uniques. */
export function dedupe(tools: Tool[]): Tool[] {
  const seen = new Set<string>();
  const out: Tool[] = [];
  for (const t of tools) {
    if (seen.has(t.name)) continue;
    seen.add(t.name);
    out.push(t);
  }
  return out;
}
