#!/usr/bin/env node
/**
 * src/index.ts — Point d'entrée STDIO (Claude Desktop, Cursor local, Windsurf local)
 * 
 * Importe createServer() depuis server.ts et connecte en mode stdio.
 * Comportement identique à l'original — aucun changement pour les utilisateurs Claude Desktop.
 * 
 * Digital Factory Senegal — https://digitalfactory.sn
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import dotenv from "dotenv";

dotenv.config();

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
