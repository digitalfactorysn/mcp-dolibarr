/**
 * Validation stricte des arguments d'outils.
 *
 * Chaque inputSchema déclaré par un outil est « durci » automatiquement :
 *  - additionalProperties:false partout (fin du « mass assignment » : un argument
 *    non déclaré n'est jamais transmis à Dolibarr) ;
 *  - identifiants = entiers positifs, pagination bornée, dates ISO 8601,
 *    e-mails, codes, chemins et filtres USF contraints par nom de paramètre ;
 *  - longueurs maximales sur toutes les chaînes.
 * Les caractères de contrôle / bidirectionnels sont refusés dans toutes les chaînes.
 */
import { Ajv, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { isValidUsf } from './usf.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

const ISO_DATE = '^\\d{4}-\\d{2}-\\d{2}([T ]\\d{2}:\\d{2}(:\\d{2}(\\.\\d{1,6})?)?(Z|[+-]\\d{2}:?\\d{2})?)?$';
const CODE = '^[A-Za-z0-9_:.\\-]{1,64}$';
const EMAIL = "[^\\s@,;<>\"']+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}";

const LONG_TEXT = /^(desc|description|note|note_private|note_public|message|comments?|detail|motif)$/;
const DATE_LIKE = /^(date(?!_format$).*|.*_date$|fin_validite)$/;
const ID_STRICT = /^(id|socid|accountid)$|_id$/;
const ID_ZERO_OK = /^(fk_.*|idwarehouse|userownerid|typeid)$/;
const PERCENT = /^(remise_percent|discount_percent|tva_tx|vatrate|progress|deposit_percent)$/;
const CODE_LIKE = /^(type|type_code|typecode|category_code|severity_code|journal_code|model|pdf_model|format|fk_type|origin_type|account_type)$/;

function hardenProp(key: string, def: Json): Json {
  const out: Json = { ...def };

  if (key === 'sqlfilters') {
    return { ...out, type: 'string', maxLength: 1000, format: 'usf' };
  }

  switch (def.type) {
    case 'number':
    case 'integer': {
      if (ID_STRICT.test(key)) return { ...out, type: 'integer', minimum: 1, maximum: 2_000_000_000 };
      if (ID_ZERO_OK.test(key)) return { ...out, type: 'integer', minimum: 0, maximum: 2_000_000_000 };
      if (key === 'limit') return { ...out, type: 'integer', minimum: 1, maximum: 500 };
      if (key === 'page') return { ...out, type: 'integer', minimum: 0, maximum: 10_000 };
      if (key === 'status') return { ...out, type: 'integer', minimum: -1, maximum: 99 };
      if (key === 'year') return { ...out, type: 'integer', minimum: 1970, maximum: 2200 };
      if (key === 'month' || key === 'start_month') return { ...out, type: 'integer', minimum: 1, maximum: 12 };
      if (key === 'price_level') return { ...out, type: 'integer', minimum: 1, maximum: 10 };
      if (PERCENT.test(key)) return { ...out, type: 'number', minimum: 0, maximum: 100 };
      return { ...out, minimum: -1e12, maximum: 1e12 };
    }
    case 'string': {
      if (key === 'modulepart') return { ...out, pattern: '^[a-z_]{1,40}$' };
      if (key === 'original_file') {
        return { ...out, maxLength: 500, pattern: '^(?!.*\\.\\.)(?![/\\\\])[^\\\\]{1,500}$' };
      }
      if (key === 'sortfield') return { ...out, pattern: '^[A-Za-z0-9_.]{1,64}$' };
      if (key === 'sortorder') return { ...out, enum: ['ASC', 'DESC', 'asc', 'desc'] };
      if (key === 'thirdparty_ids') return { ...out, pattern: '^\\d+(,\\d+){0,49}$' };
      if (key === 'status') return { ...out, pattern: '^[A-Za-z0-9_,]{1,40}$' };
      if (key === 'email' || key === 'from_email') return { ...out, maxLength: 254, pattern: `^${EMAIL}$` };
      if (key === 'sendto') return { ...out, maxLength: 1000, pattern: `^${EMAIL}(\\s*,\\s*${EMAIL}){0,19}$` };
      if (/^phone/.test(key)) return { ...out, pattern: '^[0-9+().\\-\\s]{3,40}$' };
      if (key === 'url') return { ...out, maxLength: 500, pattern: '^https?://[^\\s]{1,490}$' };
      if (key === 'color') return { ...out, pattern: '^#?[0-9A-Fa-f]{3,8}$' };
      if (key === 'zip') return { ...out, maxLength: 20 };
      if (key === 'module') return { ...out, pattern: '^[A-Z0-9_]{1,40}$' };
      if (key === 'closepaidinvoices') return { ...out, enum: ['yes', 'no'] };
      if (key === 'price_base_type') return { ...out, enum: ['HT', 'TTC'] };
      if (key === 'object_type') {
        return { ...out, enum: ['product', 'customer', 'supplier', 'member', 'contact'] };
      }
      if (key === 'filter') return { ...out, maxLength: 100, pattern: "^[^\\x00-\\x1f%'\"\\\\;]{1,100}$" };
      if (DATE_LIKE.test(key)) return { ...out, pattern: ISO_DATE, maxLength: 40 };
      if (CODE_LIKE.test(key)) return { ...out, pattern: CODE };
      if (/^ref/.test(key)) return { ...out, maxLength: 128 };
      if (key === 'body') return { ...out, maxLength: 100_000 };
      if (LONG_TEXT.test(key)) return { ...out, maxLength: 20_000 };
      return { ...out, maxLength: 1000 };
    }
    case 'array': {
      const items = def.items ? hardenSchema(def.items as Json) : def.items;
      return { ...out, ...(items ? { items } : {}), maxItems: def.maxItems ?? 100 };
    }
    case 'object':
      return hardenSchema(out);
    default:
      return out;
  }
}

export function hardenSchema(schema: Json): Json {
  const out: Json = { ...schema };
  if (out.type === 'object' || out.properties) {
    out.type = 'object';
    const props: Json = {};
    for (const [k, v] of Object.entries((out.properties ?? {}) as Json)) props[k] = hardenProp(k, v as Json);
    out.properties = props;
    out.additionalProperties = false;
  }
  return out;
}

const FORBIDDEN_STRING = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮⁠-⁤⁦-⁯﻿]/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_ARGS_BYTES = 250_000;

export class ValidationError extends Error {}

function assertClean(value: unknown, depth: number): void {
  if (depth > 6) throw new ValidationError('Arguments trop profondément imbriqués.');
  if (typeof value === 'string') {
    if (FORBIDDEN_STRING.test(value)) {
      throw new ValidationError('Arguments invalides : caractères de contrôle ou invisibles interdits.');
    }
  } else if (Array.isArray(value)) {
    for (const v of value) assertClean(v, depth + 1);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(k) || FORBIDDEN_STRING.test(k)) {
        throw new ValidationError(`Arguments invalides : clé interdite « ${k} ».`);
      }
      assertClean(v, depth + 1);
    }
  }
}

export class ToolValidator {
  private readonly fns = new Map<string, ValidateFunction>();
  /** Schémas durcis (ceux exposés aux clients MCP). */
  readonly schemas = new Map<string, Json>();
  private readonly ajv: Ajv;

  constructor(tools: Tool[]) {
    this.ajv = new Ajv({ allErrors: false, coerceTypes: true, strict: false, removeAdditional: false, useDefaults: false });
    addFormats.default(this.ajv);
    this.ajv.addFormat('usf', { type: 'string', validate: (s: string) => isValidUsf(s) });
    for (const t of tools) {
      const hardened = hardenSchema(t.inputSchema as Json);
      this.schemas.set(t.name, hardened);
      this.fns.set(t.name, this.ajv.compile(hardened));
    }
  }

  /** Retourne une COPIE validée et typée des arguments, ou lève ValidationError. */
  validate(toolName: string, args: unknown): Record<string, unknown> {
    const fn = this.fns.get(toolName);
    if (!fn) throw new ValidationError(`Outil inconnu : ${toolName}`);
    if (args === undefined || args === null) args = {};
    if (typeof args !== 'object' || Array.isArray(args)) {
      throw new ValidationError('Arguments invalides : un objet est attendu.');
    }
    if (JSON.stringify(args).length > MAX_ARGS_BYTES) {
      throw new ValidationError('Arguments invalides : taille excessive.');
    }
    assertClean(args, 0);
    const copy = structuredClone(args) as Record<string, unknown>;
    if (!fn(copy)) {
      const e = fn.errors?.[0];
      const where = e?.instancePath ? e.instancePath.replace(/^\//, '').replace(/\//g, '.') : 'arguments';
      const extra = e?.keyword === 'additionalProperties' ? ` « ${String(e.params.additionalProperty)} »` : '';
      const fmt = e?.keyword === 'format' && e.params.format === 'usf' ? ' (syntaxe USF attendue, ex. (t.nom:like:\'%x%\'))' : '';
      throw new ValidationError(`Arguments invalides pour ${toolName} : ${where} ${e?.message ?? 'invalide'}${extra}${fmt}.`);
    }
    return copy;
  }
}
