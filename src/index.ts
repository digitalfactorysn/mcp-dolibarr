#!/usr/bin/env node
/** Point d'entrée STDIO (Claude Desktop, Cursor/Windsurf en local). */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { loadConfig } from './config.js';
import { createServer } from './server.js';

dotenv.config({ quiet: true });

try {
  const cfg = loadConfig();
  const server = createServer(cfg);
  await server.connect(new StdioServerTransport());
  console.error(`[MCP] mcp-dolibarr-secure prêt (mode ${cfg.mode}${cfg.mode === 'readwrite' && cfg.allowSensitive ? ' + sensibles' : ''}).`);
} catch (e) {
  console.error(`❌ ${e instanceof Error ? e.message : 'Démarrage impossible.'}`);
  process.exit(1);
}
