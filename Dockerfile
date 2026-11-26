# Audit 26/11/2026 (F-06) : Node 24 (Node 20 n'est plus maintenu), installation reproductible (npm ci),
# image finale sans npm ni outils de construction, utilisateur non root.
# ── Construction ──────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ── Exécution ─────────────────────────────────
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn*
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/build ./build
USER node
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://127.0.0.1:3100/health || exit 1
CMD ["node", "build/http.js"]
