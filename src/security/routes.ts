/**
 * Liste blanche de routes REST Dolibarr.
 *
 * Le manifeste dolibarr-routes.json est GÉNÉRÉ à partir des sources officielles
 * de Dolibarr (voir scripts/extract-routes.py). Le client HTTP refuse tout appel
 * dont la méthode + le chemin n'y figurent pas : un identifiant forgé
 * ("../users", "1/../../setup/conf"…) ne peut donc jamais atteindre une autre
 * ressource que celle prévue par l'outil.
 */
import { readFileSync } from 'node:fs';

export interface RouteDef {
  method: string;
  path: string;
  versions: string[];
  /** Noms des paramètres acceptés hors chemin (query ou corps JSON). */
  params: string[];
  /** true : la route reçoit un corps libre ($request_data), les clés ne sont pas listées. */
  body: boolean;
}

interface Manifest {
  generatedFrom: string[];
  routes: RouteDef[];
}

const manifest: Manifest = JSON.parse(
  readFileSync(new URL('./dolibarr-routes.json', import.meta.url), 'utf8'),
) as Manifest;

type Compiled = { def: RouteDef; segs: string[]; minMajor: number; wild: number };

const byMethod = new Map<string, Compiled[]>();
for (const def of manifest.routes) {
  const minMajor = Math.min(...def.versions.map((v) => parseInt(v.split('.')[0] ?? '0', 10)));
  const list = byMethod.get(def.method) ?? [];
  const segs = def.path.split('/');
  list.push({ def, segs, minMajor, wild: segs.filter((x) => x === '{}').length });
  byMethod.set(def.method, list);
}

/** Segment de chemin sûr : pas de "..", pas de séparateur, pas d'encodage. */
export const SAFE_SEGMENT = /^[A-Za-z0-9_.\-]{1,128}$/;

export function splitSafePath(endpoint: string): string[] {
  if (typeof endpoint !== 'string' || endpoint.length === 0 || endpoint.length > 300) {
    throw new Error('Chemin API invalide (longueur).');
  }
  if (!endpoint.startsWith('/') || endpoint.startsWith('//')) {
    throw new Error('Chemin API invalide (doit commencer par un seul "/").');
  }
  const segs = endpoint.slice(1).split('/');
  for (const s of segs) {
    if (!SAFE_SEGMENT.test(s) || s === '.' || s === '..') {
      throw new Error('Chemin API invalide (segment interdit).');
    }
  }
  return segs;
}

export function targetMajor(version: string | null): number | null {
  if (!version) return null;
  return parseInt(version.split('.')[0] ?? '', 10);
}

export type RouteCheck =
  | { ok: true; route: RouteDef }
  | { ok: false; reason: 'unknown' | 'version'; minMajor?: number };

/** Cherche la route correspondante ; `{}` dans le manifeste = n'importe quel segment sûr. */
export function checkRoute(method: string, endpoint: string, version: string | null = null): RouteCheck {
  const segs = splitSafePath(endpoint);
  const candidates = byMethod.get(method.toUpperCase()) ?? [];
  let versionRejected: Compiled | null = null;
  let best: Compiled | null = null;
  for (const c of candidates) {
    if (c.segs.length !== segs.length) continue;
    let match = true;
    for (let i = 0; i < segs.length; i++) {
      const r = c.segs[i];
      if (r !== '{}' && r !== segs[i]) {
        match = false;
        break;
      }
    }
    if (!match) continue;
    const tm = targetMajor(version);
    if (tm !== null && c.minMajor > tm) {
      versionRejected = c;
      continue;
    }
    // route la plus spécifique (moins de jokers) : /invoices/paymentsdistributed avant /invoices/{}/…
    if (!best || c.wild < best.wild) best = c;
  }
  if (best) return { ok: true, route: best.def };
  if (versionRejected) return { ok: false, reason: 'version', minMajor: versionRejected.minMajor };
  return { ok: false, reason: 'unknown' };
}

export function manifestInfo(): { generatedFrom: string[]; routes: number } {
  return { generatedFrom: manifest.generatedFrom, routes: manifest.routes.length };
}
