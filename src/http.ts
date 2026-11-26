#!/usr/bin/env node
/**
 * src/http.ts — Transport HTTP (Streamable HTTP) pour Claude.ai web, Cursor, Windsurf…
 *
 * Durci suite à l'audit de sécurité du 26/11/2026 (OWASP MCP Top 10) :
 *  - F-01 : jeton MCP_API_TOKEN obligatoire (sauf MCP_ALLOW_NO_AUTH=1 explicite), comparaison en temps
 *           constant, écoute sur 127.0.0.1 par défaut, plus de CORS « * », protection DNS rebinding du SDK.
 *  - F-03 : sessions expirées après inactivité, plafond global, limitation de débit par adresse IP.
 *  - F-07 : /health ne renvoie plus que {"status":"ok"} (ni URL Dolibarr, ni version, ni nombre de sessions).
 *  - F-09 : journal des appels d'outils dans server.ts (commun à stdio et HTTP).
 *
 * Variables : MCP_API_TOKEN, HOST (127.0.0.1), PORT (3000), MCP_ALLOWED_HOSTS (liste d'en-têtes Host
 * acceptés, ex. « mcp.example.com »), MCP_ALLOWED_ORIGINS (origines navigateur autorisées, vide = aucune),
 * MCP_SESSION_TTL_MIN (30), MCP_MAX_SESSIONS (200), MCP_RATE_LIMIT_PER_MIN (300), MCP_TRUST_PROXY.
 *
 * Digital Factory Senegal — https://digitalfactory.sn
 */

import express, { NextFunction, Request, Response } from "express";
import { randomUUID, timingSafeEqual, createHash } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server.js";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const DOLIBARR_URL = process.env.DOLIBARR_URL;
const DOLIBARR_API_KEY = process.env.DOLIBARR_API_KEY;
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const HOST = process.env.HOST ?? "127.0.0.1";
const API_TOKEN = process.env.MCP_API_TOKEN ?? "";
const ALLOW_NO_AUTH = process.env.MCP_ALLOW_NO_AUTH === "1";
const SESSION_TTL_MS = positiveInt(process.env.MCP_SESSION_TTL_MIN, 30) * 60_000;
const MAX_SESSIONS = positiveInt(process.env.MCP_MAX_SESSIONS, 200);
const RATE_LIMIT_PER_MIN = positiveInt(process.env.MCP_RATE_LIMIT_PER_MIN, 300);
const ALLOWED_HOSTS = list(process.env.MCP_ALLOWED_HOSTS, [`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const ALLOWED_ORIGINS = list(process.env.MCP_ALLOWED_ORIGINS, []);

function positiveInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function list(value: string | undefined, fallback: string[]): string[] {
  const items = (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return items.length > 0 ? items : fallback;
}

if (!DOLIBARR_URL || !DOLIBARR_API_KEY) {
  console.error("❌ Erreur : DOLIBARR_URL et DOLIBARR_API_KEY sont requis.");
  process.exit(1);
}

// F-01 : jeton long obligatoire (un jeton court se devine malgre la limitation de debit).
if (API_TOKEN && API_TOKEN.length < 32) {
  console.error("❌ MCP_API_TOKEN trop court : 32 caractères minimum (ex. `openssl rand -hex 32`).");
  process.exit(1);
}

// F-01 : jamais de mode HTTP ouvert par accident.
if (!API_TOKEN && !ALLOW_NO_AUTH) {
  console.error(
    "❌ MCP_API_TOKEN est obligatoire en mode HTTP. Définissez un jeton long et aléatoire " +
      "(ex. `openssl rand -hex 32`), ou MCP_ALLOW_NO_AUTH=1 pour un usage local isolé uniquement."
  );
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
// Derrière un proxy (Nginx Proxy Manager…) : adresse réelle du client pour la limitation de débit.
app.set("trust proxy", process.env.MCP_TRUST_PROXY ?? "loopback, uniquelocal");
app.use(express.json({ limit: "1mb" }));

// CORS : seulement pour les origines explicitement autorisées (aucune par défaut ; les connecteurs
// Claude.ai appellent le serveur côté serveur et n'en ont pas besoin).
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Authorization, Last-Event-ID, mcp-protocol-version");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
  }
  if (req.method === "OPTIONS") {
    res.status(origin && ALLOWED_ORIGINS.includes(origin) ? 204 : 403).end();
    return;
  }
  next();
});

// F-03 : limitation de débit par adresse IP (fenêtre glissante d'une minute, en mémoire).
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? "inconnu";
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_PER_MIN) {
    res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
    res.status(429).json({ error: "Trop de requêtes" });
    return;
  }
  next();
}

// F-01 : jeton Bearer comparé en temps constant (empreintes de même longueur).
const tokenDigest = createHash("sha256").update(API_TOKEN).digest();
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!API_TOKEN) { next(); return; } // MCP_ALLOW_NO_AUTH=1 explicite
  const header = req.headers.authorization ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const ok = given !== "" && timingSafeEqual(createHash("sha256").update(given).digest(), tokenDigest);
  if (!ok) {
    res.status(401).json({ error: "Token invalide" });
    return;
  }
  next();
}

// Sessions MCP actives, avec date de dernière activité (F-03).
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; lastSeen: number }>();

async function closeSession(id: string, reason: string) {
  const entry = sessions.get(id);
  if (!entry) return;
  sessions.delete(id);
  try { await entry.transport.close(); } catch { /* déjà fermée */ }
  console.error(JSON.stringify({ ts: new Date().toISOString(), event: "session_closed", session: id, reason }));
}

async function sweepSessions() {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (now - entry.lastSeen > SESSION_TTL_MS) await closeSession(id, "inactive");
  }
  for (const [ip, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(ip);
  }
}
setInterval(() => { void sweepSessions(); }, 60_000).unref();

function touch(sessionId: string) {
  const entry = sessions.get(sessionId);
  if (entry) entry.lastSeen = Date.now();
}

// POST — client → serveur
app.post("/mcp", rateLimit, authMiddleware, async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions.has(sessionId)) {
      transport = sessions.get(sessionId)!.transport;
      touch(sessionId);
    } else if (!sessionId && isInitializeRequest(req.body)) {
      if (sessions.size >= MAX_SESSIONS) await sweepSessions();
      if (sessions.size >= MAX_SESSIONS) {
        res.status(503).json({ error: "Trop de sessions ouvertes, réessayez plus tard." });
        return;
      }
      const newSessionId = randomUUID();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
        enableDnsRebindingProtection: true,
        allowedHosts: ALLOWED_HOSTS,
        allowedOrigins: ALLOWED_ORIGINS,
        onsessioninitialized: (id) => {
          sessions.set(id, { transport, lastSeen: Date.now() });
          console.error(JSON.stringify({ ts: new Date().toISOString(), event: "session_opened", session: id }));
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
      const server = createServer();
      await server.connect(transport);
    } else {
      res.status(400).json({ error: "Session invalide. Envoyez d'abord une requête d'initialisation." });
      return;
    }
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[MCP] Erreur POST :", err instanceof Error ? err.message : String(err));
    if (!res.headersSent) res.status(500).json({ error: "Erreur interne" });
  }
});

// GET — flux serveur → client
app.get("/mcp", rateLimit, authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(404).json({ error: "Session introuvable" });
    return;
  }
  touch(sessionId);
  await sessions.get(sessionId)!.transport.handleRequest(req, res);
});

// DELETE — fermeture de session
app.delete("/mcp", rateLimit, authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId) await closeSession(sessionId, "client");
  res.status(204).end();
});

// F-07 : santé minimale, sans information exploitable.
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, HOST, () => {
  console.error(
    `[MCP] Dolibarr — serveur HTTP sur http://${HOST}:${PORT}/mcp · auth : ${API_TOKEN ? "jeton Bearer" : "AUCUNE (MCP_ALLOW_NO_AUTH=1)"} · hôtes acceptés : ${ALLOWED_HOSTS.join(", ")}`
  );
});

process.on("SIGTERM", async () => {
  console.error("[MCP] Arrêt gracieux...");
  for (const id of [...sessions.keys()]) await closeSession(id, "shutdown");
  process.exit(0);
});
