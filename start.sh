#!/usr/bin/env bash
# ─────────────────────────────────────────────
# ISMS Builder – Server starten
# ─────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.server.pid"
LOG_FILE="$SCRIPT_DIR/.server.log"
ENV_FILE="$SCRIPT_DIR/.env"
PORT="${PORT:-$(grep -E '^PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo 3000)}"
PORT="${PORT:-3000}"

# HTTP oder HTTPS?
SSL_CERT=$(grep -E '^SSL_CERT_FILE=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || true)
PROTO="http"; [ -n "$SSL_CERT" ] && PROTO="https"

# Bereits laufend?
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Server läuft bereits (PID $PID) auf ${PROTO}://localhost:$PORT"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

cd "$SCRIPT_DIR"

echo "Starte ISMS Builder Server..."
nohup node server/index.js >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

# Kurz warten und prüfen ob der Prozess noch läuft
sleep 1
PID=$(cat "$PID_FILE")
if kill -0 "$PID" 2>/dev/null; then
  echo "Server gestartet (PID $PID)"
  echo "URL:  ${PROTO}://localhost:$PORT"
  echo "Log:  $LOG_FILE"
else
  echo "Fehler: Server konnte nicht gestartet werden. Log:"
  tail -20 "$LOG_FILE"
  rm -f "$PID_FILE"
  exit 1
fi
