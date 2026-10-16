/**
 * Configuration centralisée et validée au démarrage (échec rapide).
 *
 * Principes :
 *  - lecture seule par défaut (MCP_MODE=readonly) ;
 *  - en mode HTTP, un jeton fort est OBLIGATOIRE ;
 *  - HTTP clair refusé vers Dolibarr hors localhost (sauf opt-in explicite) ;
 *  - aucune valeur par défaut propre à un fournisseur ou à un pays.
 */
import { isIP } from 'node:net';

export type Mode = 'readonly' | 'readwrite';

export interface HttpConfig {
  host: string;
  port: number;
  token: string;
  allowedOrigins: string[];
  allowedHosts: string[];
  maxSessions: number;
  sessionTtlMs: number;
  rateLimitPerMinute: number;
  authFailuresPerMinute: number;
  trustProxyHops: number;
}

export interface Config {
  /** URL de base de l'API, normalisée (se termine par /api/index.php). */
  dolibarrUrl: string;
  apiKey: string;
  /** Version cible, ex. "23.0.3" ; null = union 23/24. */
  dolibarrVersion: string | null;
  mode: Mode;
  allowSensitive: boolean;
  enabledTools: Set<string> | null;
  disabledTools: Set<string>;
  maxResponseChars: number;
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function bool(v: string | undefined): boolean {
  return (v ?? '').trim().toLowerCase() === 'true';
}

function list(v: string | undefined): string[] {
  return (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function intInRange(name: string, v: string | undefined, def: number, min: number, max: number): number {
  if (v === undefined || v.trim() === '') return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`${name} doit être un entier entre ${min} et ${max}.`);
  }
  return n;
}

export function normalizeDolibarrUrl(raw: string, allowInsecure: boolean): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error('DOLIBARR_URL invalide.');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new Error('DOLIBARR_URL doit utiliser http(s).');
  }
  if (u.username || u.password) {
    throw new Error('DOLIBARR_URL ne doit pas contenir d’identifiants.');
  }
  if (u.search || u.hash) {
    throw new Error('DOLIBARR_URL ne doit pas contenir de paramètres ni de fragment.');
  }
  if (u.protocol === 'http:' && !LOOPBACK.has(u.hostname) && !allowInsecure) {
    throw new Error(
      'DOLIBARR_URL utilise HTTP en clair vers un hôte non local : la clé API serait exposée. ' +
        'Utilisez HTTPS (ou DOLIBARR_ALLOW_INSECURE_HTTP=true à vos risques sur un réseau de confiance).',
    );
  }
  let path = u.pathname.replace(/\/+$/, '');
  if (!path.endsWith('/api/index.php')) path += '/api/index.php';
  return `${u.origin}${path}`;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const rawUrl = env.DOLIBARR_URL;
  const apiKey = env.DOLIBARR_API_KEY;
  if (!rawUrl || !apiKey) {
    throw new Error('DOLIBARR_URL et DOLIBARR_API_KEY sont requis.');
  }
  if (/[\s\x00-\x1f]/.test(apiKey)) {
    throw new Error('DOLIBARR_API_KEY contient des caractères invalides.');
  }

  const modeRaw = (env.MCP_MODE ?? 'readonly').trim().toLowerCase();
  if (modeRaw !== 'readonly' && modeRaw !== 'readwrite') {
    throw new Error("MCP_MODE doit valoir 'readonly' (défaut) ou 'readwrite'.");
  }

  let version: string | null = null;
  if (env.DOLIBARR_VERSION && env.DOLIBARR_VERSION.trim() !== '') {
    if (!/^\d{2}(\.\d+){0,2}$/.test(env.DOLIBARR_VERSION.trim())) {
      throw new Error('DOLIBARR_VERSION doit ressembler à 23, 23.0 ou 24.0.1.');
    }
    version = env.DOLIBARR_VERSION.trim();
  }

  const enabled = list(env.MCP_ENABLED_TOOLS);
  return {
    dolibarrUrl: normalizeDolibarrUrl(rawUrl, bool(env.DOLIBARR_ALLOW_INSECURE_HTTP)),
    apiKey,
    dolibarrVersion: version,
    mode: modeRaw,
    allowSensitive: bool(env.MCP_ALLOW_SENSITIVE),
    enabledTools: enabled.length ? new Set(enabled) : null,
    disabledTools: new Set(list(env.MCP_DISABLED_TOOLS)),
    maxResponseChars: intInRange('MCP_MAX_RESPONSE_CHARS', env.MCP_MAX_RESPONSE_CHARS, 100_000, 1_000, 2_000_000),
  };
}

export const MIN_TOKEN_LENGTH = 32;

export function loadHttpConfig(env: NodeJS.ProcessEnv = process.env): HttpConfig {
  const token = env.MCP_API_TOKEN ?? '';
  if (token.length < MIN_TOKEN_LENGTH) {
    throw new Error(
      `MCP_API_TOKEN est obligatoire en mode HTTP et doit faire au moins ${MIN_TOKEN_LENGTH} caractères ` +
        '(générez-en un avec : openssl rand -hex 32).',
    );
  }
  if (/\s/.test(token)) throw new Error('MCP_API_TOKEN ne doit pas contenir d’espace.');

  const host = (env.HOST ?? '127.0.0.1').trim();
  if (isIP(host) === 0 && host !== 'localhost') {
    throw new Error('HOST doit être une adresse IP (ex. 127.0.0.1) ou localhost.');
  }
  const port = intInRange('PORT', env.PORT, 3100, 1, 65535);

  const allowedOrigins = list(env.MCP_ALLOWED_ORIGINS);
  for (const o of allowedOrigins) {
    let u: URL;
    try {
      u = new URL(o);
    } catch {
      throw new Error(`Origine invalide dans MCP_ALLOWED_ORIGINS : ${o}`);
    }
    if (u.origin !== o) throw new Error(`MCP_ALLOWED_ORIGINS doit contenir des origines exactes (schéma://hôte[:port]) : ${o}`);
  }

  const allowedHosts = new Set<string>([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]);
  for (const h of list(env.MCP_ALLOWED_HOSTS)) allowedHosts.add(h.toLowerCase());

  return {
    host,
    port,
    token,
    allowedOrigins,
    allowedHosts: [...allowedHosts],
    maxSessions: intInRange('MCP_MAX_SESSIONS', env.MCP_MAX_SESSIONS, 20, 1, 1000),
    sessionTtlMs: intInRange('MCP_SESSION_TTL_MINUTES', env.MCP_SESSION_TTL_MINUTES, 30, 1, 1440) * 60_000,
    rateLimitPerMinute: intInRange('MCP_RATE_LIMIT_PER_MINUTE', env.MCP_RATE_LIMIT_PER_MINUTE, 120, 10, 100_000),
    authFailuresPerMinute: intInRange('MCP_AUTH_FAILURES_PER_MINUTE', env.MCP_AUTH_FAILURES_PER_MINUTE, 10, 1, 1000),
    trustProxyHops: intInRange('MCP_TRUST_PROXY_HOPS', env.MCP_TRUST_PROXY_HOPS, 0, 0, 5),
  };
}
