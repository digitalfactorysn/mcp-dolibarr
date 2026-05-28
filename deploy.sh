#!/bin/bash
# deploy.sh — Script de déploiement VPS pour mcp-dolibarr HTTP
# Digital Factory Senegal — https://digitalfactory.sn
#
# Usage : ./deploy.sh
# Prérequis : Node.js >=18, npm, nginx, certbot

set -e

APP_DIR="/opt/mcp-dolibarr"
SERVICE_NAME="mcp-dolibarr"
REPO_URL="https://github.com/digitalfactorysn/mcp-dolibarr.git"
DOMAIN="mcp.digitalfactory.sn"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Déploiement MCP Dolibarr — Digital Factory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Cloner ou mettre à jour le repo ──
if [ -d "$APP_DIR/.git" ]; then
  echo "📦 Mise à jour du code..."
  cd "$APP_DIR"
  git pull origin master
else
  echo "📦 Clonage du dépôt..."
  sudo mkdir -p "$APP_DIR"
  sudo chown "$USER:$USER" "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 2. Installer les dépendances ──
echo "📦 Installation des dépendances..."
npm install

# ── 3. Compiler TypeScript ──
echo "🔨 Compilation TypeScript..."
npm run build

# ── 4. Créer le fichier .env si absent ──
if [ ! -f "$APP_DIR/.env" ]; then
  echo "⚙️  Création du fichier .env..."
  cat > "$APP_DIR/.env" << EOF
# Configuration MCP Dolibarr — Digital Factory Senegal
DOLIBARR_URL=https://erp.digitalfactory.sn/api/index.php
DOLIBARR_API_KEY=VOTRE_CLE_API_DOLIBARR

# Port d'écoute (défaut : 3000)
PORT=3000

# Token d'authentification optionnel pour protéger l'endpoint MCP
# Si défini, les clients doivent envoyer : Authorization: Bearer <token>
# MCP_API_TOKEN=un_token_secret_fort
EOF
  echo "⚠️  Éditez $APP_DIR/.env avec vos vraies valeurs !"
fi

# ── 5. Installer le service systemd ──
echo "⚙️  Configuration du service systemd..."
sudo cp systemd/mcp-dolibarr.service /etc/systemd/system/
sudo sed -i "s|/opt/mcp-dolibarr|$APP_DIR|g" /etc/systemd/system/mcp-dolibarr.service
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

# ── 6. Configurer Nginx ──
echo "🌐 Configuration Nginx..."
sudo cp nginx/mcp-dolibarr.conf /etc/nginx/sites-available/mcp-dolibarr
sudo sed -i "s|mcp.digitalfactory.sn|$DOMAIN|g" /etc/nginx/sites-available/mcp-dolibarr
sudo ln -sf /etc/nginx/sites-available/mcp-dolibarr /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# ── 7. Certificat SSL ──
echo "🔐 Génération du certificat SSL..."
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email infos@digitalfactory.sn || \
  echo "⚠️  Certbot déjà configuré ou erreur — vérifiez manuellement."

# ── 8. Test final ──
sleep 3
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Déploiement terminé !"
echo ""
echo "  Health check : https://$DOMAIN/health"
echo "  Endpoint MCP : https://$DOMAIN/mcp"
echo ""
echo "  Statut service :"
sudo systemctl status "$SERVICE_NAME" --no-pager | head -8
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Ajoutez dans Claude.ai > Settings > MCP Servers :"
echo "   URL : https://$DOMAIN/mcp"
echo "   (+ Authorization: Bearer <token> si MCP_API_TOKEN configuré)"
