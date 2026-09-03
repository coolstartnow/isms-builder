# ─────────────────────────────────────────────────────────────────
# ISMS Builder – Dockerfile
# Multi-stage: build (npm ci) → runtime (node:lts-alpine)
#
# Daten (JSON + Uploads) werden NICHT ins Image gebacken.
# Sie müssen als Bind-Mount bereitgestellt werden:
#   docker compose up   →  ./data:/app/data  (siehe docker-compose.yml)
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: install dependencies ────────────────────────────────
FROM node:lts-alpine AS deps
WORKDIR /app

# Copy only manifests first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: runtime image ────────────────────────────────────────
FROM node:lts-alpine AS runtime
WORKDIR /app

# Non-root user for security + su-exec for privilege drop in entrypoint
RUN addgroup -S isms && adduser -S isms -G isms \
    && apk add --no-cache su-exec

# Copy installed modules from build stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source (kein data/ – wird als Bind-Mount gemountet)
COPY server ./server
COPY ui     ./ui
# docs/ + die vier Root-Markdown-Dateien: werden von den Guidance-Seeds
# (ARCH_SEED in guidanceStore.js) zur Laufzeit eingelesen. .dockerignore
# filtert die grossen/internen Teile (docs/private, docs/community, ...)
# bereits raus — Gesamtgewicht der kopierten docs/ < 1 MB.
COPY docs ./docs
COPY README.md CONTRIBUTING.md CHANGELOG.md THIRD-PARTY-LICENSES.md ./
COPY package.json ./
COPY docker-entrypoint.sh ./

# Demo-Bundles (de/en/fr/nl.json, statische Seed-Daten fuer den "Demo-Sprache
# waehlen"-Dialog) bewusst NICHT nach ./data (das ist der Bind-Mount-Pfad und
# wuerde beim Start komplett vom Host-Verzeichnis ueberschattet) sondern an
# einen eigenen, nicht gemounteten Pfad. docker-entrypoint.sh kopiert sie von
# dort ins (ggf. leere) Bind-Mount-Verzeichnis, falls dort noch keine liegen.
COPY data/demo-bundles ./demo-bundles-seed

RUN chmod +x docker-entrypoint.sh \
    && chown -R isms:isms /app

# Container startet als root: Entrypoint legt Verzeichnisse an, chownt das
# (ggf. bind-gemountete) data/-Verzeichnis und wechselt dann per su-exec zu
# isms. USER isms hier zu setzen würde das verhindern (kein chown-Recht auf
# host-gemountete Verzeichnisse mit abweichendem Owner) — s. GitHub Issue #46.

# Environment defaults (override via .env.docker oder docker run -e)
ENV NODE_ENV=production \
    PORT=3000 \
    JWT_EXPIRES_IN=8h \
    DEV_HEADER_AUTH=false \
    STORAGE_BACKEND=json

EXPOSE 3000

# Healthcheck (HTTP; bei SSL auf https anpassen oder wget-Flag setzen)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/ui/login.html || exit 1

# Entrypoint erstellt fehlende Unterverzeichnisse und startet den Server
ENTRYPOINT ["./docker-entrypoint.sh"]
