/**
 * src/server.ts — Fabrique du serveur MCP Dolibarr
 * 
 * INSTRUCTIONS DE MIGRATION :
 * ───────────────────────────
 * 1. Copiez TOUT le contenu de votre src/index.ts ici
 * 2. Remplacez la section finale de transport par le code ci-dessous
 * 3. Exportez la fonction createServer()
 * 
 * AVANT (dans votre index.ts actuel) :
 * ─────────────────────────────────────
 *   const server = new McpServer({ name: "...", version: "..." });
 *   // ... registrations des outils ...
 *   const transport = new StdioServerTransport();
 *   await server.connect(transport);     ← SUPPRIMER cette ligne
 *
 * APRÈS (dans ce fichier server.ts) :
 * ─────────────────────────────────────
 *   export function createServer(): McpServer {
 *     const server = new McpServer({ name: "...", version: "..." });
 *     // ... toutes vos registrations d'outils (inchangées) ...
 *     return server;   ← RETOURNER le serveur sans le connecter
 *   }
 * 
 * Digital Factory Senegal — https://digitalfactory.sn
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// ─────────────────────────────────────────────
// COLLEZ ICI TOUT LE CODE DE VOTRE src/index.ts
// (sauf les dernières lignes de connexion au transport)
// ─────────────────────────────────────────────

export function createServer(): McpServer {
  const server = new McpServer({
    name: "mcp-dolibarr",
    version: "2.0.2",
    instructions: `
      Serveur MCP Dolibarr Expert pour Digital Factory Senegal.
      Vous avez accès à 55+ outils couvrant : facturation, CRM, devis,
      commandes, stocks, comptabilité, projets, contrats et configuration.
      Instance : ${process.env.DOLIBARR_URL ?? "non configurée"}
    `,
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TODO : Coller ici toutes vos registrations d'outils
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Exemple de la structure attendue :
  //
  // server.registerTool("list_invoices", {
  //   description: "...",
  //   inputSchema: { ... },
  // }, async (params) => { ... });

  return server;
}
