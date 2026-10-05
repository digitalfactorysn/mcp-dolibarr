# MCP Dolibarr

Serveur **Model Context Protocol (MCP)** pour Dolibarr ERP/CRM : permet à un assistant IA (Claude, Cursor, Windsurf…) de consulter et, si vous l'autorisez, de modifier votre Dolibarr via son API REST (tiers, factures, devis, commandes, produits, stocks, projets, RH, comptabilité simplifiée…).

> Fork renforcé du projet original de [Digital Factory Senegal](https://github.com/digitalfactorysn/mcp-dolibarr) (licence MIT). Voir [Sécurité](#-sécurité) pour les changements.

---

## 🔐 Sécurité

### Où vont vos données ?

- Le serveur ne communique **qu'avec l'URL `DOLIBARR_URL` que vous fournissez**. Aucune télémétrie, aucun appel vers un service tiers.
- En **mode local (stdio, recommandé)**, le serveur tourne sur votre machine : la clé API ne quitte votre poste que pour aller vers votre Dolibarr (HTTPS obligatoire).
- Les données lues par les outils sont transmises à l'assistant IA que vous utilisez, comme toute conversation avec lui.
- **N'utilisez pas un serveur MCP hébergé par un tiers** : il verrait passer votre clé API et vos données. Si vous avez besoin du mode HTTP, hébergez-le vous-même.
- **Installez depuis ce dépôt**, pas via `npx mcp-dolibarr` : le paquet npm du même nom n'est pas ce code.

### Bonnes pratiques

1. Créez un **utilisateur Dolibarr dédié** à l'IA, non administrateur, avec uniquement les permissions nécessaires, et générez sa clé API. C'est la protection la plus efficace : l'API ne peut rien faire au-delà de ces droits.
2. Commencez en **lecture seule** (`DOLIBARR_READ_ONLY=true`) ; activez l'écriture seulement si besoin.
3. Désactivez individuellement les outils que vous ne voulez pas exposer (`DOLIBARR_DISABLED_TOOLS`).

### Protections intégrées

- Les arguments des outils sont filtrés et typés selon leur schéma : impossible d'injecter des champs non prévus ou des segments de chemin dans les URLs.
- Les outils portent les annotations MCP `readOnlyHint` / `destructiveHint`, ce qui permet au client de demander confirmation avant toute écriture.
- Refus d'envoyer la clé API en HTTP non chiffré (hors `localhost`).
- Mode HTTP : jeton Bearer **obligatoire** (comparaison en temps constant), écoute sur `127.0.0.1` par défaut, CORS fermé par défaut, `/health` ne divulgue aucune configuration, nombre de sessions plafonné.
- Aucun outil ne modifie la configuration globale de Dolibarr, n'envoie d'email ou de campagne.

---

## 🚀 Installation (mode local, recommandé)

Prérequis : Node.js ≥ 18.

```bash
git clone https://github.com/briceboudy/mcp-dolibarr.git
cd mcp-dolibarr
npm ci
npm run build
npm test
```

### Activer l'API REST et créer la clé

1. Dolibarr : **Accueil > Configuration > Modules** → activez **API REST**.
2. Créez un utilisateur dédié (ex. `assistant-ia`) avec les seules permissions utiles.
3. Sur sa fiche : générez la **clé pour l'API**.

### Connexion avec Claude Desktop

Fichier de configuration :
- **Mac** : `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows** : `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dolibarr": {
      "command": "node",
      "args": ["/CHEMIN/ABSOLU/VERS/mcp-dolibarr/build/index.js"],
      "env": {
        "DOLIBARR_URL": "https://votre-instance.dolibarr.com",
        "DOLIBARR_API_KEY": "VOTRE_CLE_API",
        "DOLIBARR_READ_ONLY": "true"
      }
    }
  }
}
```

### Connexion avec Claude Code

```bash
claude mcp add dolibarr \
  -e DOLIBARR_URL=https://votre-instance.dolibarr.com \
  -e DOLIBARR_API_KEY=VOTRE_CLE_API \
  -e DOLIBARR_READ_ONLY=true \
  -- node /CHEMIN/ABSOLU/VERS/mcp-dolibarr/build/index.js
```

---

## ⚙️ Variables d'environnement

| Variable | Rôle |
|---|---|
| `DOLIBARR_URL` | URL de votre Dolibarr (HTTPS). `/api/index.php` est ajouté automatiquement. |
| `DOLIBARR_API_KEY` | Clé API de l'utilisateur dédié. |
| `DOLIBARR_READ_ONLY` | `true` : seuls les outils `list_*`, `get_*`, `export_*` sont exposés. |
| `DOLIBARR_DISABLED_TOOLS` | Outils à masquer, séparés par des virgules. |
| `DOLIBARR_ALLOW_INSECURE_HTTP` | `true` pour autoriser une URL `http://` distante (déconseillé). |
| `MCP_API_TOKEN` | Mode HTTP uniquement : jeton Bearer obligatoire (≥ 32 caractères, `openssl rand -hex 32`). |
| `HOST` / `PORT` | Mode HTTP : interface et port d'écoute (défaut `127.0.0.1:3000`). |
| `MCP_CORS_ORIGINS` | Mode HTTP : origines navigateur autorisées (vide = aucune). |
| `MCP_MAX_SESSIONS` | Mode HTTP : nombre maximal de sessions simultanées (défaut 50). |

---

## 🌐 Mode HTTP (auto-hébergé)

Uniquement si vous devez accéder au serveur à distance (ex. connecteur Claude.ai). Voir `deploy.sh` (systemd + nginx + Let's Encrypt) ou `docker-compose.yml` (port exposé sur `127.0.0.1` uniquement, à placer derrière un reverse proxy HTTPS).

```bash
cp .env.example .env   # puis renseignez les valeurs, dont MCP_API_TOKEN
npm run start:http
```

Le client doit envoyer `Authorization: Bearer <MCP_API_TOKEN>`.

---

## ✨ Outils disponibles

Tiers, contacts, agenda, factures clients (création, lignes, validation, paiements, avoirs), devis, commandes clients et fournisseurs, factures fournisseurs, produits, prix, stocks, entrepôts, expéditions, réceptions, interventions, tickets, projets et tâches, contrats, catégories, membres, dons, notes de frais, congés, salaires, nomenclatures et ordres de fabrication, documents (liste, téléchargement, génération PDF), comptes bancaires, et une comptabilité simplifiée (TVA, balance âgée, relevé client, export CSV) calculée à partir des factures validées, l'API REST de Dolibarr n'exposant pas le grand livre.

Certaines opérations ne sont pas disponibles via l'API REST de Dolibarr et ont été retirées : envoi d'emails, envoi de campagnes, modification de la configuration, rapprochement bancaire, écritures comptables manuelles.

---

## 📜 Licence

MIT. Projet original © [Digital Factory Senegal](https://digitalfactory.sn).
