#!/usr/bin/env node
/**
 * Transport HTTP (Streamable HTTP) durci.
 *
 *  - jeton Bearer OBLIGATOIRE (≥ 32 caractères), comparaison à temps constant ;
 *  - écoute sur 127.0.0.1 par défaut ; protection DNS-rebinding (Host) et Origin en liste blanche ;
 *    aucun CORS ouvert : seuls les Origin listés dans MCP_ALLOWED_ORIGINS sont autorisés ;
 *  - limitation de débit (général et échecs d'authentification), nombre et durée de sessions bornés ;
 *  - corps JSON ≤ 1 Mo, /health minimal et sans authentification (aucune information interne).
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import dotenv from 'dotenv';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig, loadHttpConfig, type Config, type HttpConfig } from './config.js';
import { createApi, createServer } from './server.js';

dotenv.config({ quiet: true });

function digest(s: string): Buffer {
  return createHash('sha256').update(s).digest();
}

/** Compteur à fenêtre fixe d'une minute, par clé. */
class RateLimiter {
  private readonly hits = new Map<string, { n: number; reset: number }>();
  constructor(private readonly max: number) {}
  /** true si la requête est autorisée. */
  take(key: string, now = Date.now()): boolean {
    if (this.hits.size > 10_000) this.sweep(now);
    const h = this.hits.get(key);
    if (!h || h.reset <= now) {
      this.hits.set(key, { n: 1, reset: now + 60_000 });
      return true;
    }
    h.n++;
    return h.n <= this.max;
  }
  /** Compte sans consommer (pour l'authentification : on n'incrémente qu'en cas d'échec). */
  blocked(key: string, now = Date.now()): boolean {
    const h = this.hits.get(key);
    return !!h && h.reset > now && h.n >= this.max;
  }
  private sweep(now: number): void {
    for (const [k, v] of this.hits) if (v.reset <= now) this.hits.delete(k);
  }
}

export function createApp(cfg: Config, http: HttpConfig) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', http.trustProxyHops);

  const sessions = new Map<string, { transport: StreamableHTTPServerTransport; last: number }>();
  const limiter = new RateLimiter(http.rateLimitPerMinute);
  const authFailures = new RateLimiter(http.authFailuresPerMinute);
  const tokenDigest = digest(http.token);
  const api = createApi(cfg);
  const allowedHosts = new Set(http.allowedHosts.map((h) => h.toLowerCase()));
  const allowedOrigins = new Set(http.allowedOrigins);

  // En-têtes de sécurité
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // /health : minimal, avant tout le reste (sonde Docker), jamais d'info interne
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // 1. Host (anti DNS-rebinding)
  app.use((req, res, next) => {
    const host = (req.headers.host ?? '').toLowerCase();
    if (!allowedHosts.has(host)) {
      res.status(403).json({ error: 'Host non autorisé' });
      return;
    }
    next();
  });

  // 2. Origin : absent (clients non-navigateur) accepté ; présent => doit être listé. Pas de CORS ouvert.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin !== undefined) {
      if (!allowedOrigins.has(origin)) {
        res.status(403).json({ error: 'Origin non autorisée' });
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, mcp-protocol-version, Authorization, Last-Event-ID');
      res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // 3. Authentification obligatoire. Un jeton valide passe toujours (le jeton fait ≥ 32 caractères :
  //    la force brute est irréalisable) ; les échecs sont comptés par IP pour freiner le bruit et le
  //    sondage, sans qu'un tiers puisse verrouiller le client légitime derrière le même proxy.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? '';
    const m = /^Bearer ([^\s]+)$/.exec(header);
    const ok = m !== null && timingSafeEqual(digest(m[1] as string), tokenDigest);
    if (ok) {
      next();
      return;
    }
    const ip = req.ip ?? 'unknown';
    const blocked = authFailures.blocked(ip);
    authFailures.take(ip);
    if (blocked) {
      res.status(429).json({ error: 'Trop de tentatives' });
      return;
    }
    res.setHeader('WWW-Authenticate', 'Bearer');
    res.status(401).json({ error: 'Non autorisé' });
  });

  // 4. Débit global (par IP) puis corps JSON borné
  app.use((req, res, next) => {
    if (!limiter.take(req.ip ?? 'unknown')) {
      res.status(429).json({ error: 'Trop de requêtes' });
      return;
    }
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  const touch = (id: string) => {
    const s = sessions.get(id);
    if (s) s.last = Date.now();
    return s;
  };

  const reap = () => {
    const limit = Date.now() - http.sessionTtlMs;
    for (const [id, s] of sessions) {
      if (s.last < limit) {
        sessions.delete(id);
        void s.transport.close().catch(() => undefined);
      }
    }
  };
  const timer = setInterval(reap, 60_000);
  timer.unref();

  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      const sid = req.headers['mcp-session-id'];
      let transport: StreamableHTTPServerTransport;
      if (typeof sid === 'string' && sessions.has(sid)) {
        transport = (touch(sid) as { transport: StreamableHTTPServerTransport }).transport;
      } else if (sid === undefined && isInitializeRequest(req.body)) {
        reap();
        // Plafond atteint : on évince la session la plus anciennement utilisée (tous les appelants sont
        // authentifiés ; beaucoup de clients MCP ne ferment jamais proprement leur session).
        while (sessions.size >= http.maxSessions) {
          let oldest: string | undefined;
          for (const [id, sess] of sessions) if (oldest === undefined || sess.last < (sessions.get(oldest) as { last: number }).last) oldest = id;
          if (oldest === undefined) break;
          const victim = sessions.get(oldest) as { transport: StreamableHTTPServerTransport };
          sessions.delete(oldest);
          void victim.transport.close().catch(() => undefined);
        }
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            sessions.set(id, { transport, last: Date.now() });
          },
        });
        transport.onclose = () => {
          if (transport.sessionId) sessions.delete(transport.sessionId);
        };
        await createServer(cfg, api).connect(transport);
      } else {
        res.status(400).json({ error: 'Session invalide : envoyez d’abord une requête initialize.' });
        return;
      }
      await transport.handleRequest(req, res, req.body);
    } catch {
      console.error('[MCP] Erreur POST /mcp');
      if (!res.headersSent) res.status(500).json({ error: 'Erreur interne' });
    }
  });

  const sessionRoute = async (req: Request, res: Response) => {
    const sid = req.headers['mcp-session-id'];
    const s = typeof sid === 'string' ? touch(sid) : undefined;
    if (!s) {
      res.status(404).json({ error: 'Session introuvable' });
      return;
    }
    try {
      await s.transport.handleRequest(req, res);
    } catch {
      if (!res.headersSent) res.status(500).json({ error: 'Erreur interne' });
    }
  };
  app.get('/mcp', sessionRoute);
  app.delete('/mcp', sessionRoute);

  // Erreurs (JSON invalide, corps trop gros…) : message générique
  app.use((err: { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    res.status(status).json({ error: status === 413 ? 'Corps trop volumineux' : 'Requête invalide' });
  });

  return {
    app,
    sessions,
    close: async () => {
      clearInterval(timer);
      for (const [id, s] of sessions) {
        sessions.delete(id);
        await s.transport.close().catch(() => undefined);
      }
    },
  };
}

// Démarrage uniquement si exécuté directement (le module reste importable par les tests)
const isMain = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  try {
    const cfg = loadConfig();
    const http = loadHttpConfig();
    const { app, close } = createApp(cfg, http);
    const srv = app.listen(http.port, http.host, () => {
      console.error(
        `[MCP] HTTP sur ${http.host}:${http.port}/mcp — mode ${cfg.mode}${cfg.mode === 'readwrite' && cfg.allowSensitive ? ' + sensibles' : ''} — authentification Bearer active`,
      );
      if (!['127.0.0.1', '::1', 'localhost'].includes(http.host)) {
        console.error('[MCP] ⚠ écoute hors boucle locale : placez un proxy TLS (HTTPS) devant ce service.');
      }
    });
    const stop = () => {
      void close().finally(() => srv.close(() => process.exit(0)));
      setTimeout(() => process.exit(0), 3000).unref();
    };
    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
  } catch (e) {
    console.error(`❌ ${e instanceof Error ? e.message : 'Démarrage impossible.'}`);
    process.exit(1);
  }
}
