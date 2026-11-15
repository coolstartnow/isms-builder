#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# reset-2fa.sh — Setzt 2FA (TOTP) für einen Benutzer zurück
#
# Verwendung:
#   bash scripts/reset-2fa.sh <username>
#   bash scripts/reset-2fa.sh          (interaktiv — listet alle Benutzer auf)
#
# Voraussetzungen: python3 oder node (für JSON-Verarbeitung)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="${DATA_DIR:-$REPO_ROOT/data}"
USERS_FILE="$DATA_DIR/rbac_users.json"

# ── Farben ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

echo ""
echo -e "${BOLD}━━━ ISMS Builder — 2FA Reset ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# ── Datei prüfen ──────────────────────────────────────────────────────────────
if [[ ! -f "$USERS_FILE" ]]; then
  echo -e "${RED}FEHLER: Benutzerdatei nicht gefunden:${RESET} $USERS_FILE"
  exit 1
fi

# ── Benutzer auflisten (python3) ──────────────────────────────────────────────
list_users() {
  python3 - "$USERS_FILE" <<'PYEOF'
import json, sys
path = sys.argv[1]
with open(path) as f:
    d = json.load(f)
users = d.values() if isinstance(d, dict) else d
print("  {:<20} {:<15} {:<10}".format("Benutzername", "Rolle", "2FA-Status"))
print("  " + "─" * 50)
for u in users:
    name   = u.get('username', '?')
    role   = u.get('role', '?')
    secret = u.get('totpSecret', '')
    ver    = u.get('totpVerified', False)
    if secret and ver:
        status = "✓ aktiv"
    elif secret and not ver:
        status = "⚠ pending (unverifiziert)"
    else:
        status = "✗ nicht eingerichtet"
    print("  {:<20} {:<15} {}".format(name, role, status))
PYEOF
}

# ── Username aus Argument oder interaktiv ──────────────────────────────────────
TARGET_USER="${1:-}"

if [[ -z "$TARGET_USER" ]]; then
  echo -e "${CYAN}Aktuelle Benutzer:${RESET}"
  list_users
  echo ""
  read -rp "Benutzername (für 2FA-Reset): " TARGET_USER
fi

if [[ -z "$TARGET_USER" ]]; then
  echo -e "${RED}Kein Benutzername angegeben. Abbruch.${RESET}"
  exit 1
fi

# ── Prüfen ob Benutzer existiert ──────────────────────────────────────────────
EXISTS=$(python3 - "$USERS_FILE" "$TARGET_USER" <<'PYEOF'
import json, sys
path, name = sys.argv[1], sys.argv[2]
with open(path) as f:
    d = json.load(f)
users = d if isinstance(d, dict) else {u['username']: u for u in d}
print("yes" if name in users else "no")
PYEOF
)

if [[ "$EXISTS" != "yes" ]]; then
  echo -e "${RED}FEHLER: Benutzer '${TARGET_USER}' nicht gefunden.${RESET}"
  echo ""
  echo -e "${CYAN}Verfügbare Benutzer:${RESET}"
  list_users
  exit 1
fi

# ── Bestätigung ───────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Achtung:${RESET} 2FA für Benutzer '${BOLD}${TARGET_USER}${RESET}' wird zurückgesetzt."
echo "  → totpSecret  wird geleert"
echo "  → totpVerified wird auf false gesetzt"
echo "  → Der Benutzer kann sich danach ohne TOTP einloggen — NUR wenn die 2FA-Pflicht aus ist (sonst 403 ENFORCE_2FA)"
echo ""
read -rp "Fortfahren? [j/N] " CONFIRM

if [[ "${CONFIRM,,}" != "j" && "${CONFIRM,,}" != "ja" ]]; then
  echo "Abgebrochen."
  exit 0
fi

# ── Backup ────────────────────────────────────────────────────────────────────
BACKUP_FILE="${USERS_FILE}.bak.$(date +%Y%m%d-%H%M%S)"
cp "$USERS_FILE" "$BACKUP_FILE"
echo -e "${CYAN}Backup erstellt:${RESET} $BACKUP_FILE"

# ── 2FA zurücksetzen ──────────────────────────────────────────────────────────
python3 - "$USERS_FILE" "$TARGET_USER" <<'PYEOF'
import json, sys
path, name = sys.argv[1], sys.argv[2]
with open(path) as f:
    d = json.load(f)
if isinstance(d, dict):
    if name in d:
        d[name]['totpSecret']  = ''
        d[name]['totpVerified'] = False
else:
    for u in d:
        if u.get('username') == name:
            u['totpSecret']  = ''
            u['totpVerified'] = False
with open(path, 'w') as f:
    json.dump(d, f, indent=2)
print("ok")
PYEOF

echo ""
echo -e "${GREEN}✓ 2FA für '${TARGET_USER}' wurde zurückgesetzt.${RESET}"
echo "  Der Benutzer kann sich jetzt ohne TOTP einloggen, wenn die 2FA-Pflicht ausgeschaltet ist."
echo "  Bei eingeschalteter Pflicht (Aussperrung): node scripts/emergency-2fa.js status  /  disable-policy (Server vorher beenden)."
echo "  Beim nächsten Besuch der Einstellungen kann 2FA neu eingerichtet werden."
echo ""
