#!/usr/bin/env node
/**
 * MCP Dolibarr — Transport HTTP/SSE (Claude.ai web, Cursor remote, Windsurf remote)
 * 
 * Point d'entrée HTTP. Importe createServer() depuis server.ts.
 * Compatible MCP spec 2025-11-25 + StreamableHTTPServerTransport
 * 
 * Digital Factory Senegal — https://digitalfactory.sn
 */

import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server.js";
import dotenv from "dotenv";

dotenv.config();

// ─────────────────────────────────────────────
// Validation des variables d'environnement
// ─────────────────────────────────────────────
const DOLIBARR_URL = process.env.DOLIBARR_URL;
const DOLIBARR_API_KEY = process.env.DOLIBARR_API_KEY;
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const API_TOKEN = process.env.MCP_API_TOKEN; // Optionnel : protection par token

if (!DOLIBARR_URL || !DOLIBARR_API_KEY) {
  console.error("❌ Erreur : DOLIBARR_URL et DOLIBARR_API_KEY sont requis.");
  process.exit(1);
}

// ─────────────────────────────────────────────
// Application Express
// ─────────────────────────────────────────────
const app = express();
app.use(express.json());

// CORS — nécessaire pour Claude.ai web
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, mcp-session-id, Authorization, Last-Event-ID"
  );
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// ─────────────────────────────────────────────
// Middleware d'authentification (si MCP_API_TOKEN défini)
// ─────────────────────────────────────────────
function authMiddleware(req: Request, res: Response, next: () => void) {
  if (!API_TOKEN) {
    // Pas de token configuré → accès libre (VPN/IP restriction recommandée)
    next();
    return;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_TOKEN}`) {
    res.status(401).json({ error: "Token d'authentification invalide" });
    return;
  }
  next();
}

// ─────────────────────────────────────────────
// Gestion des sessions MCP
// ─────────────────────────────────────────────
const sessions = new Map<string, StreamableHTTPServerTransport>();

// Nettoyage des sessions inactives toutes les 30 minutes
setInterval(() => {
  console.error(`[MCP] Sessions actives : ${sessions.size}`);
}, 30 * 60 * 1000);

// ─────────────────────────────────────────────
// Route principale MCP — POST (client → serveur)
// ─────────────────────────────────────────────
app.post("/mcp", authMiddleware, async (req: Request, res: Response) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions.has(sessionId)) {
      // Session existante : réutiliser le transport
      transport = sessions.get(sessionId)!;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // Nouvelle session : créer transport + serveur MCP
      const newSessionId = randomUUID();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
        onsessioninitialized: (id) => {
          sessions.set(id, transport);
          console.error(`[MCP] Nouvelle session : ${id}`);
        },
      });

      // Nettoyage à la fermeture de la session
      transport.onclose = () => {
        if (transport.sessionId) {
          sessions.delete(transport.sessionId);
          console.error(`[MCP] Session fermée : ${transport.sessionId}`);
        }
      };

      // Créer et connecter un nouveau serveur MCP pour cette session
      const server = createServer();
      await server.connect(transport);
    } else {
      res.status(400).json({
        error: "Session invalide. Envoyez une requête d'initialisation sans mcp-session-id.",
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[MCP] Erreur POST :", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur interne du serveur MCP" });
    }
  }
});

// ─────────────────────────────────────────────
// Route MCP — GET (SSE : serveur → client)
// ─────────────────────────────────────────────
app.get("/mcp", authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(404).json({ error: "Session introuvable" });
    return;
  }
  const transport = sessions.get(sessionId)!;
  await transport.handleRequest(req, res);
});

// ─────────────────────────────────────────────
// Route MCP — DELETE (fermeture de session)
// ─────────────────────────────────────────────
app.delete("/mcp", authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId)!;
    await transport.close();
    sessions.delete(sessionId);
    console.error(`[MCP] Session supprimée : ${sessionId}`);
  }
  res.status(204).end();
});

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "mcp-dolibarr",
    version: "2.0.2",
    dolibarr_url: DOLIBARR_URL,
    sessions: sessions.size,
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// Démarrage
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.error(`
╔══════════════════════════════════════════════════════╗
║         MCP Dolibarr — Serveur HTTP démarré          ║
╠══════════════════════════════════════════════════════╣
║  Port     : ${PORT.toString().padEnd(40)}║
║  Dolibarr : ${(DOLIBARR_URL ?? "").substring(0, 40).padEnd(40)}║
║  Auth     : ${(API_TOKEN ? "Token Bearer activé" : "Aucune (protéger par IP/VPN)").padEnd(40)}║
║  Endpoint : http://localhost:${PORT}/mcp${" ".repeat(Math.max(0, 20 - PORT.toString().length))}║
╚══════════════════════════════════════════════════════╝
  `);
});

// Gestion propre de l'arrêt
process.on("SIGTERM", async () => {
  console.error("[MCP] Arrêt gracieux...");
  for (const [id, transport] of sessions) {
    await transport.close();
    sessions.delete(id);
  }
  process.exit(0);
});
