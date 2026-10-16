/** Aides communes aux handlers d'outils. */

/** Combine des filtres USF avec AND (ignore les vides). */
export function andFilters(...filters: Array<string | undefined | null | false>): string | undefined {
  const parts = filters.filter((f): f is string => typeof f === 'string' && f.length > 0);
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return parts.map((f) => `(${f})`).join(' and ').replace(/^/, '(').replace(/$/, ')');
}

/** Filtre USF « champ = nombre » (nombre validé en amont). */
export function eqNum(field: string, value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return `(${field}:=:${n})`;
}

/** Paramètres de pagination communs (valeurs par défaut sûres). */
export function paging(args: Record<string, unknown>, defaults: { limit?: number } = {}): Record<string, unknown> {
  return { limit: args.limit ?? defaults.limit ?? 100, page: args.page ?? 0 };
}

export function json(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

import type { DolibarrAPI } from '../api.js';

/** Récupère toutes les pages d'une liste (borné) ; `truncated` si la limite est atteinte. */
export async function fetchAll<T = Record<string, unknown>>(
  api: DolibarrAPI,
  endpoint: string,
  params: Record<string, unknown> = {},
  maxItems = 2000,
): Promise<{ items: T[]; truncated: boolean }> {
  const pageSize = 200;
  const items: T[] = [];
  for (let page = 0; items.length < maxItems; page++) {
    let chunk: unknown;
    try {
      chunk = await api.get(endpoint, { ...params, limit: pageSize, page });
    } catch (e) {
      // Dolibarr répond 404 « No ... found » quand la liste est vide
      if ((e as { status?: number }).status === 404) break;
      throw e;
    }
    if (!Array.isArray(chunk)) break;
    items.push(...(chunk as T[]));
    if (chunk.length < pageSize) return { items, truncated: false };
  }
  return { items: items.slice(0, maxItems), truncated: items.length >= maxItems };
}

/** Borne [début, fin] d'une période → filtre USF sur un champ date. */
export function dateRange(field: string, start?: unknown, end?: unknown): string | undefined {
  const parts: string[] = [];
  if (typeof start === 'string' && start) parts.push(`(${field}:>=:'${start.slice(0, 10)}')`);
  if (typeof end === 'string' && end) parts.push(`(${field}:<=:'${end.slice(0, 10)}')`);
  return parts.length ? andFilters(...parts) : undefined;
}

export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
export const money = (n: number): string => (Math.round(n * 100) / 100).toFixed(2);
