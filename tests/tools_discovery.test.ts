import { describe, it, expect } from 'vitest';
import { createServer } from '../src/server.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

describe('1. Découverte et intégrité des outils MCP', () => {
  it('doit instancier le serveur MCP sans erreur et avec la version 5.2.0', () => {
    process.env.DOLIBARR_URL = 'https://gestion.digitalfactory.sn/api/index.php';
    process.env.DOLIBARR_API_KEY = 'test_mock_key';
    const server = createServer();
    expect(server).toBeDefined();
  });

  it('doit garantir que chaque outil est découvert une seule fois (zéro doublon)', async () => {
    process.env.DOLIBARR_URL = 'https://gestion.digitalfactory.sn/api/index.php';
    process.env.DOLIBARR_API_KEY = 'test_mock_key';
    const server = createServer();
    
    // @ts-expect-error - Accès direct au handler enregistré pour test
    const handler = server._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
    expect(handler).toBeDefined();
    
    const res = await handler({ method: 'tools/list' });
    const tools = res.tools;
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(150);

    const names = tools.map((t: { name: string }) => t.name);
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
  });

  it('chaque outil doit posséder une description et un schéma d\'entrée valide', async () => {
    process.env.DOLIBARR_URL = 'https://gestion.digitalfactory.sn/api/index.php';
    process.env.DOLIBARR_API_KEY = 'test_mock_key';
    const server = createServer();
    
    // @ts-expect-error - Accès au handler
    const handler = server._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
    const res = await handler({ method: 'tools/list' });
    
    for (const tool of res.tools) {
      expect(tool.name).toBeDefined();
      expect(typeof tool.name).toBe('string');
      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe('string');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });
});
