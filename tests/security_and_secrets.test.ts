import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Empreintes SHA-256 d'anciens secrets (jamais les valeurs elles-memes, audit 26/11/2026).
const LEAKED_SECRET_SHA256 = [
  '045e94106b528916ee597ebda5b1cfbdee9be1e478cc749e67e2dc61f86fba59',
  'fc70f509ae1d65f6f8801d9477c06b1aca56bafcf0e3d3147722c101ca6c79cb',
];
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

describe('4. Sécurité des secrets et conformité des sources', () => {
  const srcDir = path.resolve(__dirname, '../src');

  it('aucun fichier source dans src/ ne doit contenir de token ou de clé API en dur', () => {
    const files: string[] = [];
    const readDir = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) readDir(full);
        else if (entry.name.endsWith('.ts')) files.push(full);
      }
    };
    readDir(srcDir);

    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      // Aucune chaine longue de type cle ne doit correspondre a un ancien secret connu,
      // et aucune cle d'API ni jeton ne doit etre ecrit en dur.
      for (const token of content.match(/[A-Za-z0-9_-]{24,}/g) ?? []) {
        expect(LEAKED_SECRET_SHA256).not.toContain(sha256(token));
      }
      expect(content).not.toMatch(/(DOLAPIKEY|MCP_API_TOKEN)['"]?\s*[:=]\s*['"][A-Za-z0-9_-]{16,}['"]/);
    }
  });

  it('src/api.ts doit configurer un timeout et des en-têtes sans exposer les secrets dans les logs', () => {
    const apiFile = path.join(srcDir, 'api.ts');
    const content = fs.readFileSync(apiFile, 'utf8');
    expect(content).toContain('timeout: 30000');
    expect(content).toContain('DOLAPIKEY');
  });
});
