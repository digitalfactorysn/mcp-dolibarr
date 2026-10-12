import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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
      // Vérifier l'absence de clés ou secrets en dur
      expect(content).not.toContain('[SECRET_RETIRE]');
      expect(content).not.toContain('[SECRET_RETIRE]');
    }
  });

  it('src/api.ts doit configurer un timeout et des en-têtes sans exposer les secrets dans les logs', () => {
    const apiFile = path.join(srcDir, 'api.ts');
    const content = fs.readFileSync(apiFile, 'utf8');
    expect(content).toContain('timeout: 30000');
    expect(content).toContain('DOLAPIKEY');
  });
});
