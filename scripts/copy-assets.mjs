// Copie le manifeste de routes (JSON) à côté du code compilé.
import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('build/security', { recursive: true });
copyFileSync('src/security/dolibarr-routes.json', 'build/security/dolibarr-routes.json');
