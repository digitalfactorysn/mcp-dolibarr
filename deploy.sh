#!/bin/bash
# deploy.sh — Déploiement du serveur MCP Dolibarr en mode HTTP sur votre propre serveur
#
# Usage :
#   DOMAIN=mcp.example.com CERTBOT_EMAIL=admin@example.com ./deploy.sh
#
# À lancer depuis une copie du dépôt que vous avez vous-même vérifiée.
# Prérequis : Node.js >= 18, npm, nginx, certbot

set -euo pipefail

: "${DOMAIN:?Définissez DOMAIN (ex: mcp.example.com)}"
: "${CERTBOT_EMAIL:?Définissez CERTBOT_EMAIL pour Let's Encrypt}"
APP_DIR="${APP_DIR:-/opt/mcp-dolibarr}"
SERVICE_NAME="mcp-dolibarr"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "━━━ Déploiement MCP Dolibarr → $APP_DIR ($DOMAIN) ━━━"

# ── 1. Copier le code vérifié ──
sudo mkdir -p "$APP_DIR"
sudo rsync -a --delete --exclude node_modules --exclude build --exclude .git --exclude .env "$SRC_DIR/" "$APP_DIR/"
sudo chown -R "$USER:$USER" "$APP_DIR"
cd "$APP_DIR"

# ── 2. Installer les dépendances (versions figées par package-lock.json) et compiler ──
npm ci --ignore-scripts
npm run build
npm prune --omit=dev

# ── 3. Créer le fichier .env si absent ──
if [ ! -f "$APP_DIR/.env" ]; then
  cp .env.example .env
  TOKEN="$(openssl rand -hex 32)"
  sed -i "s|^MCP_API_TOKEN=.*|MCP_API_TOKEN=$TOKEN|" .env
  chmod 600 .env
  echo "⚠️  Éditez $APP_DIR/.env (DOLIBARR_URL, DOLIBARR_API_KEY) puis relancez ce script."
  echo "    Jeton Bearer généré : voir MCP_API_TOKEN dans $APP_DIR/.env"
  exit 0
fi
sudo chown www-data:www-data "$APP_DIR/.env"
sudo chmod 600 "$APP_DIR/.env"

# ── 4. Service systemd ──
sudo cp systemd/mcp-dolibarr.service /etc/systemd/system/
sudo sed -i "s|/opt/mcp-dolibarr|$APP_DIR|g" /etc/systemd/system/mcp-dolibarr.service
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

# ── 5. Nginx ──
sudo cp nginx/mcp-dolibarr.conf /etc/nginx/sites-available/mcp-dolibarr
sudo sed -i "s|mcp.example.com|$DOMAIN|g" /etc/nginx/sites-available/mcp-dolibarr
sudo ln -sf /etc/nginx/sites-available/mcp-dolibarr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# ── 6. Certificat SSL ──
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$CERTBOT_EMAIL" || \
  echo "⚠️  Certbot déjà configuré ou erreur — vérifiez manuellement."

sleep 3
echo "✅ Déploiement terminé."
echo "   Health check : https://$DOMAIN/health"
echo "   Endpoint MCP : https://$DOMAIN/mcp (Authorization: Bearer <MCP_API_TOKEN>)"
sudo systemctl status "$SERVICE_NAME" --no-pager | head -8
