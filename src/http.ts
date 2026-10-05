#!/usr/bin/env node
/**
 * src/http.ts — Transport HTTP (Streamable HTTP) pour un usage distant
 *
 * Point d'entrée HTTP. Importe createServer() depuis server.ts.
 * L'authentification par jeton Bearer est obligatoire : ce serveur donne accès
 * à toutes les données Dolibarr autorisées par la clé API.
 */

import express, { NextFunction, Request, Response } from "express";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server.js";
import { VERSION } from "./version.js";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const DOLIBARR_URL = process.env.DOLIBARR_URL;
const DOLIBARR_API_KEY = process.env.DOLIBARR_API_KEY;
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const HOST = process.env.HOST ?? "127.0.0.1";
const API_TOKEN = process.env.MCP_API_TOKEN ?? "";
const MAX_SESSIONS = parseInt(process.env.MCP_MAX_SESSIONS ?? "50", 10);
const CORS_ORIGINS = (process.env.MCP_CORS_ORIGINS ?? "").split(",").map(s => s.trim()).filter(Boolean);

if (!DOLIBARR_URL || !DOLIBARR_API_KEY) {
  console.error("❌ Erreur : DOLIBARR_URL et DOLIBARR_API_KEY sont requis.");
  process.exit(1);
}
if (API_TOKEN.length < 32) {
  console.error("❌ Erreur : MCP_API_TOKEN est obligatoire en mode HTTP (32 caractères minimum).");
  console.error("   Générez-en un avec : openssl rand -hex 32");
  process.exit(1);
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

// CORS — désactivé par défaut. Les connecteurs distants (Claude.ai, etc.) appellent
// le serveur depuis leur backend et n'en ont pas besoin. Autoriser explicitement
// des origines via MCP_CORS_ORIGINS si un client navigateur doit s'y connecter.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, mcp-protocol-version, Authorization, Last-Event-ID");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// Comparaison en temps constant (hash pour égaliser les longueurs)
const expectedTokenHash = createHash("sha256").update(API_TOKEN).digest();
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const tokenHash = createHash("sha256").update(token).digest();
  if (!token || !timingSafeEqual(tokenHash, expectedTokenHash)) {
    res.status(401).json({ error: "Token invalide" });
    return;
  }
  next();
}

// Sessions MCP actives
const sessions = new Map<string, StreamableHTTPServerTransport>();

// POST — client → serveur
app.post("/mcp", authMiddleware, async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions.has(sessionId)) {
      transport = sessions.get(sessionId)!;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      if (sessions.size >= MAX_SESSIONS) {
        res.status(503).json({ error: "Trop de sessions actives." });
        return;
      }
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, transport);
          console.error(`[MCP] Nouvelle session : ${id}`);
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) {
          sessions.delete(transport.sessionId);
          console.error(`[MCP] Session fermée : ${transport.sessionId}`);
        }
      };
      const server = createServer();
      await server.connect(transport);
    } else {
      res.status(400).json({ error: "Session invalide. Envoyez d'abord une requête d'initialisation." });
      return;
    }
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[MCP] Erreur POST :", err);
    if (!res.headersSent) res.status(500).json({ error: "Erreur interne" });
  }
});

// GET — SSE serveur → client
app.get("/mcp", authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(404).json({ error: "Session introuvable" });
    return;
  }
  await sessions.get(sessionId)!.handleRequest(req, res);
});

// DELETE — fermeture de session
app.delete("/mcp", authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId)!.close();
    sessions.delete(sessionId);
    console.error(`[MCP] Session supprimée : ${sessionId}`);
  }
  res.status(204).end();
});

// Health check — public, ne divulgue aucune information de configuration
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "mcp-dolibarr", version: VERSION });
});

app.listen(PORT, HOST, () => {
  console.error(`[MCP] Serveur HTTP mcp-dolibarr ${VERSION} à l'écoute sur http://${HOST}:${PORT}/mcp (auth Bearer obligatoire)`);
});

process.on("SIGTERM", async () => {
  console.error("[MCP] Arrêt gracieux...");
  for (const [id, transport] of sessions) {
    await transport.close();
    sessions.delete(id);
  }
  process.exit(0);
});
