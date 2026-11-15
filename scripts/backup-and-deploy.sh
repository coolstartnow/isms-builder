#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# ISMS Builder – Backup & Deployment Package erstellen
#
# Erzeugt zwei Archive im Home-Verzeichnis:
#   isms-backup-YYYYMMDD-HHMMSS.tar.gz   – Daten + Code (ohne node_modules)
#   isms-deploy-full-YYYYMMDD-HHMMSS.tar.gz – Vollständiges Deployment-Paket
# ─────────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="${1:-$HOME}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

BACKUP_FILE="$OUT_DIR/isms-backup-${TIMESTAMP}.tar.gz"
DEPLOY_FILE="$OUT_DIR/isms-deploy-full-${TIMESTAMP}.tar.gz"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ISMS Builder – Backup & Deployment"
echo " Projekt:  $PROJECT_DIR"
echo " Ausgabe:  $OUT_DIR"
echo " Zeitstempel: $TIMESTAMP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Backup (Code + Daten, ohne node_modules) ──────────────────
echo ""
echo "▶ Erstelle Backup (ohne node_modules)…"
tar -czf "$BACKUP_FILE" \
  -C "$(dirname "$PROJECT_DIR")" \
  --exclude="$(basename "$PROJECT_DIR")/.git" \
  --exclude="$(basename "$PROJECT_DIR")/node_modules" \
  --exclude="$(basename "$PROJECT_DIR")/.server.log" \
  --exclude="$(basename "$PROJECT_DIR")/.server.pid" \
  --exclude="$(basename "$PROJECT_DIR")/session*.md" \
  "$(basename "$PROJECT_DIR")"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "  ✓ Backup:  $BACKUP_FILE  ($SIZE)"

# ── 2. Deployment-Paket (vollständig, inkl. node_modules + Daten) ─
echo ""
echo "▶ Erstelle Deployment-Paket (vollständig)…"
tar -czf "$DEPLOY_FILE" \
  -C "$(dirname "$PROJECT_DIR")" \
  --exclude="$(basename "$PROJECT_DIR")/.git" \
  --exclude="$(basename "$PROJECT_DIR")/.server.log" \
  --exclude="$(basename "$PROJECT_DIR")/.server.pid" \
  --exclude="$(basename "$PROJECT_DIR")/session*.md" \
  "$(basename "$PROJECT_DIR")"

SIZE=$(du -sh "$DEPLOY_FILE" | cut -f1)
echo "  ✓ Deploy:  $DEPLOY_FILE  ($SIZE)"

# ── 3. Zusammenfassung ────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Fertig!"
echo ""
echo " Backup:    $BACKUP_FILE"
echo " Deployment: $DEPLOY_FILE"
echo ""
echo " Entpacken & starten:"
echo "   tar -xzf $(basename "$DEPLOY_FILE")"
echo "   cd $(basename "$PROJECT_DIR")"
echo "   npm start          # direkt mit Node.js"
echo "   docker compose up -d --build   # via Docker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Übersicht der lokalen Sicherungen nachführen (optional, nur wenn das Hilfswerkzeug vorhanden ist; Fehler hier sind unkritisch)
[ -f "$HOME/isms-backup-tools/bkreport.py" ] && python3 "$HOME/isms-backup-tools/bkreport.py" >/dev/null 2>&1 || true
