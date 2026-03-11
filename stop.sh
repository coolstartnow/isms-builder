#!/usr/bin/env bash
# ─────────────────────────────────────────────
# ISMS Builder – Server stoppen
# ─────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.server.pid"
PORT="${PORT:-3000}"

# PID-Datei auswerten
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "Server gestoppt (PID $PID)."
  else
    echo "Prozess $PID läuft nicht mehr."
  fi
  rm -f "$PID_FILE"
fi

# Sicherheitsnetz: alle node server/index.js Prozesse auf dem Port beenden
STALE=$(ss -tlnp sport = ":$PORT" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true)
if [ -n "$STALE" ]; then
  echo "Beende verwaisten Prozess auf Port $PORT (PID $STALE)..."
  kill "$STALE" 2>/dev/null || true
fi

echo "Port $PORT ist frei."
