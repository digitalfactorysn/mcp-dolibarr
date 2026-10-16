# mcp-dolibarr-secure

Fork durci de [`digitalfactorysn/mcp-dolibarr`](https://github.com/digitalfactorysn/mcp-dolibarr) : un serveur
[MCP](https://modelcontextprotocol.io) qui donne à un assistant IA (Claude, Cursor…) accès à **Dolibarr 23.0.3 et 24.x**.

Ce fork reprend le périmètre fonctionnel de l'original **en corrigeant** ce que l'audit a relevé :
endpoints inexistants, accès en écriture ouvert par défaut, authentification HTTP facultative, absence de
validation des entrées, dépendances anciennes, valeurs propres à l'auteur codées en dur.

| Exigence | Ce qui est fait |
|---|---|
| **Endpoints réalignés sur Dolibarr 24** | Liste blanche de **590 routes** *générée depuis les sources officielles* de Dolibarr 23.0.3 et 24.0.1 (`scripts/extract-routes.py`). Chaque appel (méthode + chemin + noms de paramètres) est vérifié ; un test exécute **chaque outil** contre ce manifeste, en 24.0.1 et en 23.0.3. |
| **Mode lecture seule** | Défaut : `MCP_MODE=readonly`. Les outils d'écriture ne sont ni listés ni exécutables ; en plus, le client HTTP refuse tout verbe autre que `GET` (double verrou). Les actions « sensibles » (paiements, validation, avoirs, suppression, stock, salaires, dons…) exigent en plus `MCP_ALLOW_SENSITIVE=true`. |
| **Authentification obligatoire** | Le transport HTTP refuse de démarrer sans `MCP_API_TOKEN` (≥ 32 caractères), comparé à temps constant. Écoute sur `127.0.0.1` par défaut, contrôle `Host` (anti DNS-rebinding) et `Origin`, pas de CORS ouvert, limitation de débit, sessions bornées. |
| **Validation des entrées** | Chaque schéma d'outil est durci : `additionalProperties:false` (plus de « mass assignment »), identifiants entiers positifs, pagination bornée, dates ISO 8601, e-mails, codes, chemins sans `..`, longueurs maximales, caractères de contrôle/bidirectionnels refusés. Les filtres `sqlfilters` doivent respecter la syntaxe USF (validée par un analyseur). Les chemins d'API sont construits uniquement avec des segments sûrs. |
| **Dépendances à jour** | SDK MCP 1.32, Express 5, axios 1.x, ajv 8, dotenv 18, TypeScript 5.9 — `npm audit` : **0 vulnérabilité**. |

## Installation

```bash
npm ci
npm run build
npm test          # 37 tests (conformité API, sécurité, HTTP de bout en bout)
```

Créez dans Dolibarr un **utilisateur dédié** avec une clé API et seulement les droits nécessaires
(lecture seule si vous n'avez pas besoin d'écrire), puis copiez `.env.example` en `.env`.

### Claude Desktop (stdio, local)

```json
{
  "mcpServers": {
    "dolibarr": {
      "command": "node",
      "args": ["/chemin/vers/mcp-dolibarr-secure/build/index.js"],
      "env": {
        "DOLIBARR_URL": "https://erp.example.com",
        "DOLIBARR_API_KEY": "…",
        "DOLIBARR_VERSION": "24.0.1",
        "MCP_MODE": "readonly"
      }
    }
  }
}
```

### HTTP (Claude.ai, Cursor distant…)

```bash
openssl rand -hex 32            # → MCP_API_TOKEN
docker compose up -d --build    # publie 127.0.0.1:3100 uniquement
```

Exposez ensuite le service **uniquement derrière un reverse proxy HTTPS** (Caddy, nginx…), avec
`MCP_ALLOWED_HOSTS=<nom public>` et, si un navigateur se connecte, `MCP_ALLOWED_ORIGINS`.
Le client envoie `Authorization: Bearer <MCP_API_TOKEN>`.

## Configuration

| Variable | Défaut | Rôle |
|---|---|---|
| `DOLIBARR_URL` | – (obligatoire) | URL de Dolibarr. HTTPS exigé hors `localhost` ; `/api/index.php` ajouté si absent. |
| `DOLIBARR_API_KEY` | – (obligatoire) | Clé API de l'utilisateur dédié. |
| `DOLIBARR_VERSION` | – | `23.0.3` ou `24.0.1` : refuse les routes inexistantes dans cette version. |
| `DOLIBARR_ALLOW_INSECURE_HTTP` | `false` | Autorise `http://` vers un hôte non local (déconseillé). |
| `MCP_MODE` | `readonly` | `readonly` ou `readwrite`. |
| `MCP_ALLOW_SENSITIVE` | `false` | Avec `readwrite` : active les outils sensibles. |
| `MCP_ENABLED_TOOLS` / `MCP_DISABLED_TOOLS` | – | Listes d'outils autorisés / interdits. |
| `MCP_MAX_RESPONSE_CHARS` | `100000` | Taille maximale d'une réponse. |
| `MCP_API_TOKEN` | – (obligatoire en HTTP) | Jeton Bearer ≥ 32 caractères. |
| `HOST` / `PORT` | `127.0.0.1` / `3100` | Interface et port d'écoute. |
| `MCP_ALLOWED_HOSTS` / `MCP_ALLOWED_ORIGINS` | – | Noms d'hôte / origines autorisés en plus de localhost. |
| `MCP_MAX_SESSIONS`, `MCP_SESSION_TTL_MINUTES` | `20`, `30` | Sessions simultanées (la plus ancienne est évincée) et durée d'inactivité. |
| `MCP_RATE_LIMIT_PER_MINUTE`, `MCP_AUTH_FAILURES_PER_MINUTE` | `120`, `10` | Limites par IP. |
| `MCP_TRUST_PROXY_HOPS` | `0` | Nombre de proxys de confiance (IP client réelle). |

**158 outils** : 88 en lecture, 56 en écriture, 14 « sensibles ».

## Ce qui a changé par rapport à l'original

### Outils supprimés (ils ne pouvaient pas fonctionner avec l'API REST de Dolibarr)
L'API REST n'expose ni grand livre, ni plan comptable, ni journaux, ni création d'écritures, ni rapprochement bancaire,
ni envoi d'e-mail de facture ou de mailing, ni écriture des constantes de configuration. Les outils correspondants
renvoyaient une erreur ou, pire, **des données de substitution inventées** (balance générale « calculée », plan SYSCOHADA
fictif, banque « ECOBANK » codée en dur…). Supprimés : `send_invoice_email`, `send_mailing`, `update_company_info`,
`set_setup_value`, `create_misc_journal_entry`, `list_accounting_accounts/journals/entries`, `get_trial_balance`,
`reconcile_bank_line`, `get_chart_of_accounts`, `get_accounting_config`, `get_accounting_dashboard`,
`initialize_syscohada`, tous les `configure_*` / `set_accounting_account_mapping` (simples « guides » pointant vers le
serveur de l'auteur), `set_thirdparty_discount`, `create_deposit`, `get_webportal_config`, `list_online_payments`.
Ajouté : `list_dictionary` (types de frais, de congés, TVA, civilités… pour obtenir les bons identifiants).

### Corrections de comportement notables
- Statuts de factures : chaînes `draft|unpaid|paid|cancelled` (Dolibarr 24) au lieu de nombres ignorés.
- Les filtres « statut » des devis, commandes, tickets, expéditions, projets, contrats… passent par `sqlfilters` (ces routes n'ont pas de paramètre `status`).
- Périodes (TVA, relevé, statistiques) : filtre USF sur la date de facture ; `datestart/dateend` n'existent pas côté Dolibarr.
- Paiements : `invoices/paymentsdistributed` avec `arrayofamounts` ; les paiements partiels ne sont plus remplacés par le total ; paiement fournisseur via `supplierinvoices/{id}/payments`.
- Avoir : lié à la facture source (`fk_facture_source`), lignes reprises en quantités négatives, créé en brouillon.
- Devis : `validate` ne prend plus de `status` ; `close` exige 2 (signé) ou 3 (refusé) ; conversion via `orders/createfromproposal`.
- Commande → facture : `invoices/createfromorder` ; expédition livrée : `shipments/{id}/close` ; ticket : message via `tickets/newmessage` (`track_id`), fermeture = statut 8.
- Congés : validation / approbation / refus distincts, types de congés lus dans le dictionnaire (plus de liste inventée).
- Auteur par défaut = propriétaire de la clé API (`/users/info`), plus l'utilisateur « 1 ».
- Plus de TVA à 18 %, de devise FCFA, d'e-mail ou d'URL de l'auteur : le taux de TVA est obligatoire à la création d'un produit.
- Les erreurs de Dolibarr ne sont plus avalées (`update_thirdparty`, `set_thirdparty_discount`…).
- Redirections HTTP jamais suivies (la clé API ne peut pas fuiter vers un autre hôte) ; messages d'erreur assainis.

### Compatibilité 23.0.3 / 24.x
Le manifeste contient l'union des routes des deux versions, chacune annotée de ses versions. Sans `DOLIBARR_VERSION`,
tout ce qui existe dans l'une des deux est accepté ; avec, seules les routes de la version cible le sont.
Seule différence relevée pour les outils exposés : `validate_manufacturing_order` (`POST /mos/{id}/validate`, Dolibarr 24 uniquement).
`export_accounting_entries` (`accountancy/exportdata`) renvoie l'export natif.

## Régénérer le manifeste de routes

```bash
python3 -I scripts/extract-routes.py 23.0.3=/chemin/dolibarr-23.0.3 24.0.1=/chemin/dolibarr-24.0.1 \
  > /tmp/routes.json && mv /tmp/routes.json src/security/dolibarr-routes.json
npm test
```

## Limites connues (à lire)
- Les noms de colonnes utilisés dans les filtres de statut (`t.fk_statut`, `t.statut`, `t.status`, `t.clos`…) et les codes de
  statut (ticket fermé = 8, congé approuvé = 3…) ont été relevés dans les sources de Dolibarr 24.0.1 (classes et schémas SQL),
  mais jamais exécutés contre une vraie instance : en cas d'erreur 400, Dolibarr indique le champ fautif.
- Les tests simulent Dolibarr (aucune instance réelle n'a été interrogée). Essayez d'abord en `readonly` sur une copie.
- Ce serveur ne remplace pas les droits Dolibarr : utilisez une clé API dédiée au moindre privilège.
- Un assistant IA peut être manipulé par le contenu qu'il lit (injection de prompt) : gardez `MCP_MODE=readonly`
  tant que vous n'avez pas besoin d'écrire, et relisez les actions sensibles.

Licence MIT (voir `LICENSE`) — projet d'origine © Digital Factory Senegal.
