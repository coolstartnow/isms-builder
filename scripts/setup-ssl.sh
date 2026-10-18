#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# ISMS Builder – SSL/TLS Einrichtung
#
# Optionen:
#   1) Kein SSL (HTTP)
#   2) Selbstsigniertes Zertifikat (Self-signed)
#   3) Let's Encrypt (certbot)
# ─────────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"
SSL_DIR="$PROJECT_DIR/ssl"

# ── Farben ────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}▶ $*${NC}"; }
ok()      { echo -e "${GREEN}✓ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠ $*${NC}"; }
err()     { echo -e "${RED}✗ $*${NC}"; exit 1; }
headline(){ echo -e "\n${BOLD}$*${NC}"; }

# ── .env lesen / schreiben Hilfsfunktionen ────────────────────────
env_set() {
  local key="$1" val="$2"
  if grep -qE "^#?${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^#\?${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

env_comment() {
  local key="$1"
  sed -i "s|^${key}=|# ${key}=|" "$ENV_FILE" 2>/dev/null || true
}

env_get() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"'
}

# ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD} ISMS Builder – SSL/TLS Einrichtung${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo " Aktuelles Projekt: $PROJECT_DIR"
CURRENT_CERT=$(env_get SSL_CERT_FILE)
if [ -n "$CURRENT_CERT" ]; then
  echo -e " Aktuelles SSL-Zertifikat: ${CYAN}$CURRENT_CERT${NC}"
else
  echo -e " SSL: ${YELLOW}nicht aktiv (HTTP)${NC}"
fi
echo ""
echo " Wähle eine Option:"
echo "   1) Kein SSL – HTTP (Standard, Entwicklung)"
echo "   2) Selbstsigniertes Zertifikat (Self-signed, Entwicklung/Intern)"
echo "   3) Let's Encrypt (certbot, Produktion mit öffentlicher Domain)"
echo ""
read -rp " Deine Wahl [1-3]: " CHOICE

case "$CHOICE" in

# ══════════════════════════════════════════════════════════════════
1)
  headline "Option 1: HTTP (kein SSL)"
  env_comment SSL_CERT_FILE
  env_comment SSL_KEY_FILE
  ok "SSL deaktiviert – Server läuft als HTTP"
  warn "Starte den Server neu damit die Änderung wirkt."
  ;;

# ══════════════════════════════════════════════════════════════════
2)
  headline "Option 2: Selbstsigniertes Zertifikat"

  # openssl prüfen
  command -v openssl &>/dev/null || err "openssl nicht gefunden. Bitte installieren: sudo apt install openssl"

  mkdir -p "$SSL_DIR"

  read -rp " Hostname / CN [localhost]: " HOSTNAME
  HOSTNAME="${HOSTNAME:-localhost}"

  # Weitere Namen/IP-Adressen: Der Client (Browser, Android-App) prüft, ob die aufgerufene Adresse im Zertifikat steht.
  read -rp " Weitere Namen/IP-Adressen, z. B. für die Android-App (kommagetrennt, leer = keine): " EXTRA_SAN

  # SAN-Eintrag: IPv4 → IP:, sonst DNS: (nur Buchstaben, Ziffern, Punkt, Bindestrich)
  san_entry() {
    local v="$1"
    if [[ "$v" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then echo "IP:$v"
    elif [[ "$v" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]]; then echo "DNS:$v"
    else return 1
    fi
  }
  SAN="$(san_entry "$HOSTNAME")" || err "Ungültiger Hostname: $HOSTNAME"
  SAN="$SAN,DNS:localhost,IP:127.0.0.1"
  IFS=',' read -ra EXTRA_LIST <<< "$EXTRA_SAN"
  for entry_raw in "${EXTRA_LIST[@]}"; do
    entry_raw="$(echo "$entry_raw" | tr -d '[:space:]')"
    [[ -z "$entry_raw" ]] && continue
    entry="$(san_entry "$entry_raw")" || err "Ungültiger Eintrag für Name/IP: $entry_raw"
    SAN="$SAN,$entry"
  done

  read -rp " Gültigkeitsdauer in Tagen [3650]: " DAYS
  DAYS="${DAYS:-3650}"
  [[ "$DAYS" =~ ^[0-9]+$ && "$DAYS" -ge 1 ]] || err "Ungültige Gültigkeitsdauer: $DAYS (ganze Zahl ≥ 1 erwartet)"

  CERT_FILE="$SSL_DIR/cert.pem"
  KEY_FILE="$SSL_DIR/key.pem"

  info "Erzeuge selbstsigniertes Zertifikat für '$HOSTNAME' (${DAYS} Tage)…"

  openssl req -x509 -nodes -days "$DAYS" \
    -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=${HOSTNAME}/O=ISMS Builder/C=DE" \
    -addext "subjectAltName=${SAN}" \
    2>/dev/null

  chmod 600 "$KEY_FILE"

  env_set SSL_CERT_FILE "ssl/cert.pem"
  env_set SSL_KEY_FILE  "ssl/key.pem"

  echo ""
  ok "Zertifikat: $CERT_FILE"
  ok "Schlüssel:  $KEY_FILE"
  ok ".env aktualisiert"
  echo ""
  warn "Browser wird eine Sicherheitswarnung zeigen (selbstsigniert)."
  warn "Für interne Nutzung: Zertifikat im Browser / Betriebssystem als vertrauenswürdig markieren."
  warn "Android-App: ssl/cert.pem aufs Handy kopieren und dort als Zertifikat installieren;"
  warn "  die Adresse, die in der App eingetragen wird, muss unter 'Gültig für' stehen."
  warn "Starte den Server neu damit die Änderung wirkt."

  # Zertifikat-Info anzeigen
  echo ""
  info "Zertifikat-Details:"
  openssl x509 -in "$CERT_FILE" -noout -subject -dates 2>/dev/null | sed 's/^/  /'
  echo "  Gültig für: ${SAN//,/, }"
  ;;

# ══════════════════════════════════════════════════════════════════
3)
  headline "Option 3: Let's Encrypt (certbot)"

  # certbot prüfen
  command -v certbot &>/dev/null || {
    warn "certbot nicht gefunden."
    echo ""
    echo " Installation:"
    echo "   Ubuntu/Debian: sudo apt install certbot"
    echo "   Arch Linux:    sudo pacman -S certbot"
    echo "   Fedora:        sudo dnf install certbot"
    echo ""
    err "Bitte certbot installieren und das Script erneut ausführen."
  }

  echo ""
  echo " Hinweise:"
  echo "  • Der Server muss von außen über Port 80 erreichbar sein"
  echo "  • Die Domain muss auf diese IP zeigen"
  echo "  • certbot benötigt Root-Rechte (sudo)"
  echo ""

  read -rp " Domain (z.B. isms.meinefirma.de): " DOMAIN
  [ -z "$DOMAIN" ] && err "Keine Domain eingegeben."

  read -rp " E-Mail für Let's Encrypt Benachrichtigungen: " LE_EMAIL
  [ -z "$LE_EMAIL" ] && err "Keine E-Mail eingegeben."

  PORT=$(env_get PORT)
  PORT="${PORT:-3000}"

  # Laufenden Server kurz stoppen falls er auf Port 80 stört
  warn "certbot benötigt Port 80. Stoppe ggf. laufenden ISMS-Server kurz…"
  bash "$PROJECT_DIR/stop.sh" 2>/dev/null || true

  info "Starte certbot standalone für Domain: $DOMAIN"
  sudo certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$LE_EMAIL" \
    -d "$DOMAIN"

  LE_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
  LE_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

  # Symlinks ins Projektverzeichnis (damit der Node-Prozess darauf zugreifen kann)
  mkdir -p "$SSL_DIR"
  ln -sf "$LE_CERT" "$SSL_DIR/cert.pem"
  ln -sf "$LE_KEY"  "$SSL_DIR/key.pem"

  env_set SSL_CERT_FILE "ssl/cert.pem"
  env_set SSL_KEY_FILE  "ssl/key.pem"

  ok "Let's Encrypt Zertifikat eingerichtet"
  ok ".env aktualisiert"

  # Auto-Renewal cron einrichten
  echo ""
  info "Richte automatische Erneuerung ein (cron)…"
  RENEW_CMD="certbot renew --quiet && ln -sf $LE_CERT $SSL_DIR/cert.pem && ln -sf $LE_KEY $SSL_DIR/key.pem && bash $PROJECT_DIR/stop.sh 2>/dev/null; bash $PROJECT_DIR/start.sh"
  CRON_LINE="0 3 * * * $RENEW_CMD"

  # Cron-Eintrag nur hinzufügen wenn noch nicht vorhanden
  ( crontab -l 2>/dev/null | grep -v "certbot renew.*isms"; echo "$CRON_LINE" ) | crontab -
  ok "Auto-Renewal cron eingerichtet (täglich 03:00 Uhr)"

  warn "Starte den Server neu damit die Änderung wirkt."
  echo ""
  info "Zertifikat-Details:"
  openssl x509 -in "$LE_CERT" -noout -subject -dates 2>/dev/null | sed 's/^/  /'
  ;;

# ══════════════════════════════════════════════════════════════════
*)
  err "Ungültige Auswahl. Bitte 1, 2 oder 3 eingeben."
  ;;
esac

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD} Fertig!${NC}"
echo " Aktuelle SSL-Konfiguration in .env:"
grep -E "^#?SSL_" "$ENV_FILE" | sed 's/^/   /' || echo "   (keine)"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
