# Guide de migration — Support HTTP/SSE pour Claude.ai web

> **Digital Factory Senegal** — [digitalfactory.sn](https://digitalfactory.sn)

---

## Ce que cette migration apporte

| Avant | Après |
|-------|-------|
| Claude Desktop uniquement (stdio) | Claude Desktop **+** Claude.ai web **+** Cursor remote **+** Windsurf remote |
| `npx mcp-dolibarr` | `npx mcp-dolibarr` (stdio) + `npx mcp-dolibarr-http` (HTTP) |
| Local uniquement | Déployable sur VPS, accessible depuis n'importe où |

---

## Étape 1 — Restructurer le code source

### 1.1 Créer `src/server.ts`

Copiez le contenu de votre `src/index.ts` actuel dans `src/server.ts`.

**Modification unique** : au lieu de connecter au transport, retournez le serveur :

```typescript
// AVANT (fin de src/index.ts)
const transport = new StdioServerTransport();
await server.connect(transport);

// APRÈS (fin de src/server.ts)
export function createServer(): McpServer {
  const server = new McpServer({ name: "mcp-dolibarr", version: "2.1.0" });
  
  // ... tous vos server.registerTool(...) inchangés ...
  
  return server;  // ← retourner sans connecter
}
```

### 1.2 Remplacer `src/index.ts`

```typescript
// Nouveau src/index.ts (3 lignes)
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
const transport = new StdioServerTransport();
await createServer().connect(transport);
```

### 1.3 Ajouter `src/http.ts`

Copiez le fichier `src/http.ts` fourni dans ce package.

---

## Étape 2 — Installer les nouvelles dépendances

```bash
npm install express
npm install -D @types/express
```

---

## Étape 3 — Mettre à jour `package.json`

Ajoutez dans `"bin"` et `"scripts"` :

```json
{
  "bin": {
    "mcp-dolibarr": "build/index.js",
    "mcp-dolibarr-http": "build/http.js"
  },
  "scripts": {
    "start:http": "node build/http.js",
    "dev:http": "node --loader ts-node/esm src/http.ts"
  }
}
```

---

## Étape 4 — Compiler et tester en local

```bash
npm run build

# Test stdio (Claude Desktop) — comportement inchangé
npx mcp-dolibarr

# Test HTTP (Claude.ai web)
DOLIBARR_URL=https://erp.digitalfactory.sn/api/index.php \
DOLIBARR_API_KEY=votre_cle \
npm run start:http

# Vérifier le health check
curl http://localhost:3000/health
```

---

## Étape 5 — Déployer sur le VPS

```bash
# Rendre le script exécutable
chmod +x deploy.sh

# Lancer le déploiement
./deploy.sh
```

Le script :
- Clone/met à jour le repo dans `/opt/mcp-dolibarr`
- Compile TypeScript
- Configure le service systemd (démarrage automatique)
- Configure Nginx en reverse proxy HTTPS
- Génère le certificat SSL Let's Encrypt

---

## Étape 6 — Connecter à Claude.ai

1. Allez dans **Claude.ai → Settings → Integrations / MCP Servers**
2. Cliquez **Add MCP Server**
3. Entrez l'URL : `https://mcp.digitalfactory.sn/mcp`
4. Si `MCP_API_TOKEN` est configuré, ajoutez le header :
   `Authorization: Bearer votre_token`

---

## Architecture finale

```
Claude.ai (web/mobile)
        │ HTTPS
        ▼
   Nginx (TLS termination)
        │ HTTP
        ▼
mcp-dolibarr HTTP server (port 3000)
   ┌────────────────────────────┐
   │  POST /mcp  → init session │
   │  GET  /mcp  → SSE stream   │
   │  DELETE /mcp → close       │
   │  GET /health → status      │
   └────────────────────────────┘
        │ REST API
        ▼
   Dolibarr ERP (erp.digitalfactory.sn)
```

---

## Commandes utiles sur le VPS

```bash
# Statut du service
sudo systemctl status mcp-dolibarr

# Logs en temps réel
sudo journalctl -u mcp-dolibarr -f

# Redémarrer après mise à jour
sudo systemctl restart mcp-dolibarr

# Recharger Nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## Sécurité

- **Ne commitez jamais** votre `.env` (déjà dans `.gitignore`)
- Activez `MCP_API_TOKEN` si l'endpoint est public
- En production : restriction par IP dans Nginx si usage interne uniquement

---

*Développé par [Digital Factory Senegal](https://digitalfactory.sn)*
