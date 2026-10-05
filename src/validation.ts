/**
 * src/validation.ts — Validation des arguments d'outils
 *
 * Les arguments venant du modèle ne sont jamais transmis tels quels à Dolibarr :
 *  - seules les propriétés déclarées dans l'inputSchema de l'outil sont conservées ;
 *  - les types sont vérifiés (un ID doit être un nombre, ce qui empêche d'injecter
 *    des segments de chemin du type "1/../setup" dans les URLs) ;
 *  - les champs obligatoires doivent être présents.
 */
import { Tool } from "@modelcontextprotocol/sdk/types.js";

type Schema = { type?: string; enum?: unknown[]; items?: Schema };

function coerce(key: string, value: unknown, schema: Schema): unknown {
  switch (schema.type) {
    case "number":
    case "integer": {
      const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
      if (typeof n !== "number" || !Number.isFinite(n)) {
        throw new Error(`Argument '${key}' invalide : nombre attendu.`);
      }
      if (schema.type === "integer" && !Number.isInteger(n)) {
        throw new Error(`Argument '${key}' invalide : entier attendu.`);
      }
      return n;
    }
    case "string":
      if (typeof value !== "string") throw new Error(`Argument '${key}' invalide : texte attendu.`);
      if (schema.enum && !schema.enum.includes(value)) {
        throw new Error(`Argument '${key}' invalide : valeurs acceptées ${schema.enum.join(", ")}.`);
      }
      return value;
    case "boolean":
      if (value === "true") return true;
      if (value === "false") return false;
      if (typeof value !== "boolean") throw new Error(`Argument '${key}' invalide : booléen attendu.`);
      return value;
    case "array":
      if (!Array.isArray(value)) throw new Error(`Argument '${key}' invalide : liste attendue.`);
      return value;
    case "object":
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`Argument '${key}' invalide : objet attendu.`);
      }
      return value;
    default:
      return value;
  }
}

export function sanitizeArgs(tool: Tool, args: Record<string, unknown>): Record<string, unknown> {
  const properties = (tool.inputSchema.properties ?? {}) as Record<string, Schema>;
  const required = (tool.inputSchema.required ?? []) as string[];
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(args)) {
    const schema = properties[key];
    if (!schema || value === undefined || value === null) continue;
    clean[key] = coerce(key, value, schema);
  }
  for (const key of required) {
    if (clean[key] === undefined || clean[key] === "") {
      throw new Error(`Argument obligatoire manquant : '${key}'.`);
    }
  }
  return clean;
}

/** Convertit une date ISO 8601 en timestamp Unix (secondes). Lève une erreur si la date est invalide. */
export function toTimestamp(value: unknown, field = "date"): number {
  const ms = new Date(String(value)).getTime();
  if (!Number.isFinite(ms)) throw new Error(`Date invalide pour '${field}' : ${String(value)}`);
  return Math.floor(ms / 1000);
}

/** Valide une date au format AAAA-MM-JJ (utilisée dans des filtres). */
export function isoDate(value: unknown, field: string): string {
  const s = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(new Date(s).getTime())) {
    throw new Error(`Date invalide pour '${field}' (format attendu AAAA-MM-JJ) : ${s}`);
  }
  return s;
}

/** Filtre sqlfilters Dolibarr sur une plage de dates (bornes incluses, format AAAA-MM-JJ, colonnes de type DATE). */
export function dateRangeFilter(field: string, start?: unknown, end?: unknown): string | undefined {
  const parts: string[] = [];
  if (start) parts.push(`(${field}:>=:'${isoDate(start, 'date_start')}')`);
  if (end) parts.push(`(${field}:<=:'${isoDate(end, 'date_end')}')`);
  return parts.length ? parts.join(' and ') : undefined;
}

/** Statut numérique d'une facture (0..3) → valeur attendue par l'API /invoices et /supplierinvoices. */
export function invoiceStatusParam(status: unknown): string | undefined {
  return ({ 0: 'draft', 1: 'unpaid', 2: 'paid', 3: 'cancelled' } as Record<number, string>)[Number(status)];
}

/** Statut d'un objet renvoyé par Dolibarr (champ `status` ou ancien champ `statut`). */
export function objectStatus(o: Record<string, unknown>): number {
  return Number(o.status ?? o.statut);
}

/** Ajoute une condition (ET) au paramètre sqlfilters d'une requête de liste Dolibarr. */
export function addFilter(params: Record<string, unknown>, clause: unknown): void {
  if (!clause) return;
  params.sqlfilters = params.sqlfilters ? `(${params.sqlfilters}) and (${clause})` : String(clause);
}
