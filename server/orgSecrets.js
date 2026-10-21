// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
'use strict'
// Geheimnisse sind nur schreibbar: Der Server liefert sie nie mehr aus – auch nicht an Administratoren, auch nicht im Export.
// Gespeicherte Dienst-Zugangsdaten (SMTP-Passwort, WebDAV-App-Passwort) bleiben beim Speichern erhalten, wenn das Feld leer ist;
// ein neuer Wert ersetzt sie, ein ausdrückliches Löschen-Kennzeichen entfernt sie. Benutzer-Passwort-Hashes und 2FA-Geheimnisse
// verlassen den Server nicht (auch nicht im Datenexport).

// [Bereich in den Einstellungen, Geheimnis-Feld, Kennzeichen „gesetzt“ (nur lesend), Kennzeichen „löschen“ (nur beim Speichern)]
const SECRETS = [
  ['smtpSettings', 'pass', 'passSet', 'clearPass'],
  ['webdavSettings', 'appPassword', 'appPasswordSet', 'clearAppPassword'],
]
const USER_SECRET_FIELDS = ['passwordHash', 'totpSecret']

// Einstellungen für die Ausgabe: Geheimnis entfernt, stattdessen „gesetzt“ ja/nein
function redactOrgSettings(settings) {
  const out = { ...(settings || {}) }
  for (const [group, field, setFlag] of SECRETS) {
    if (!out[group] || typeof out[group] !== 'object') continue
    const { [field]: secret, [setFlag]: _ignored, ...rest } = out[group]
    out[group] = { ...rest, [setFlag]: typeof secret === 'string' && secret.length > 0 }
  }
  return out
}

// Eingabe beim Speichern: leeres Geheimnis = unverändert lassen (aus dem Patch entfernen, der Speicher führt Teilobjekte zusammen);
// Löschen-Kennzeichen = leeren; die Nur-Lese-Kennzeichen werden nie gespeichert.
function prepareOrgPatch(patch) {
  const out = { ...(patch || {}) }
  for (const [group, field, setFlag, clearFlag] of SECRETS) {
    if (!out[group] || typeof out[group] !== 'object' || Array.isArray(out[group])) continue
    const g = { ...out[group] }
    const clear = g[clearFlag] === true
    delete g[clearFlag]; delete g[setFlag]
    if (clear) g[field] = ''
    else if (typeof g[field] !== 'string' || g[field] === '') delete g[field]
    out[group] = g
  }
  return out
}

// Dateien für den Datenexport: Benutzer ohne Hash/2FA-Geheimnis, Einstellungen ohne Dienst-Passwörter
function sanitizeExportFile(name, content) {
  if (name === 'org-settings.json' && content && typeof content === 'object') return redactOrgSettings(content)
  if (name === 'rbac_users.json' && content && typeof content === 'object') {
    const clean = u => (u && typeof u === 'object' ? Object.fromEntries(Object.entries(u).filter(([k]) => !USER_SECRET_FIELDS.includes(k))) : u)
    return Array.isArray(content) ? content.map(clean) : Object.fromEntries(Object.entries(content).map(([k, u]) => [k, clean(u)]))
  }
  return content
}

module.exports = { redactOrgSettings, prepareOrgPatch, sanitizeExportFile, USER_SECRET_FIELDS }
