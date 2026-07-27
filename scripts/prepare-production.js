#!/usr/bin/env node
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// Interaktives Tool für den Übergang von Demo-/Testdaten zu einem echten
// Produktiv-Einsatz mit STORAGE_BACKEND=json. Anders als /admin/demo-reset
// wechselt dieses Skript NICHT das Storage-Backend — es räumt nur wahlweise
// einzelne oder alle Datenmodule leer, damit vorab schon eingegebene echte
// Daten (z. B. Risiken, Assets) nicht verloren gehen müssen.
//
// Aufruf: node scripts/prepare-production.js
// Voraussetzung: Server sollte vorher gestoppt sein (bash stop.sh).

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const PROJECT_ROOT = path.join(__dirname, '..')
const DATA_DIR = process.env.DATA_DIR || path.join(PROJECT_ROOT, 'data')

// Gleiche Modul-Liste wie /admin/demo-reset (server/routes/admin.js) — bewusst
// gespiegelt, damit beide Wege dieselben "leer"-Formen verwenden.
const MODULES = [
  { key: 'templates',  file: 'templates.json',        empty: [] },
  { key: 'risks',      file: 'risks.json',             empty: [] },
  { key: 'entities',   file: 'entities.json',          empty: [] },
  { key: 'guidance',   file: 'guidance.json',          empty: [] },
  { key: 'training',   file: 'training.json',          empty: [] },
  { key: 'incidents',  file: 'public-incidents.json',  empty: [] },
  { key: 'audit-log',  file: 'audit-log.json',         empty: [] },
  { key: 'goals',      file: 'goals.json',             empty: [] },
  { key: 'assets',     file: 'assets.json',            empty: [] },
  { key: 'bcm',        file: 'bcm.json',               empty: { bia: [], plans: [], exercises: [] } },
  { key: 'suppliers',  file: 'suppliers.json',         empty: [] },
  { key: 'governance', file: 'governance.json',        empty: { reviews: [], actions: [], meetings: [] } },
]

// Nie angefasst: soa.json, custom-lists.json, org-settings.json — das ist
// Konfiguration/Framework-Auswahl, keine "Demo-Inhalte".

function readJson(fp) {
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')) } catch { return null }
}

function countRecords(value) {
  if (value === null) return 'nicht vorhanden'
  if (Array.isArray(value)) return `${value.length} Einträge`
  if (typeof value === 'object') {
    const total = Object.values(value).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 0), 0)
    return `${total} Einträge`
  }
  return 'unbekannt'
}

function listDirJsonFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => f.endsWith('.json'))
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
// rl.question() ist bei mehreren aufeinanderfolgenden Aufrufen mit Pipe-/Non-TTY-Input
// unzuverlässig (verschluckt spätere Antworten) — Async-Iterator über die Zeilen ist stabil.
const lineIterator = rl[Symbol.asyncIterator]()
async function ask(question) {
  process.stdout.write(question)
  const { value, done } = await lineIterator.next()
  return done ? '' : value.trim()
}

function backupDataDir() {
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
  // Backup landet neben dem tatsächlich verwendeten DATA_DIR (nicht hartkodiert im Projekt-Root) —
  // wichtig wenn DATA_DIR per Env-Variable auf einen anderen Ort zeigt.
  const backupDir = path.join(path.dirname(DATA_DIR), `data.bak.${ts}`)
  fs.cpSync(DATA_DIR, backupDir, { recursive: true })
  return backupDir
}

function writeEmpty(fp, empty) {
  fs.writeFileSync(fp, JSON.stringify(empty, null, 2))
}

async function clearModule(mod) {
  const fp = path.join(DATA_DIR, mod.file)
  if (!fs.existsSync(fp)) return
  writeEmpty(fp, mod.empty)
}

async function clearGdprAndLegal() {
  for (const sub of ['gdpr', 'legal']) {
    const dir = path.join(DATA_DIR, sub)
    for (const f of listDirJsonFiles(dir)) {
      const fp = path.join(dir, f)
      const current = readJson(fp)
      writeEmpty(fp, Array.isArray(current) ? [] : {})
    }
  }
}

async function resetUsersToAdminOnly() {
  const rbac = require(path.join(PROJECT_ROOT, 'server/rbacStore'))
  const users = rbac.getAllUsers()
  for (const u of users) {
    if (u.username !== 'admin') rbac.deleteUser(u.username)
  }
  await rbac.setPasswordHash('admin', 'adminpass')
  rbac.setUserTotpSecret('admin', null)
}

async function quickMode() {
  console.log('\nSchnellmodus: leert ALLE Module (wie /admin/demo-reset), lässt STORAGE_BACKEND unverändert.\n')
  for (const mod of MODULES) {
    const current = readJson(path.join(DATA_DIR, mod.file))
    console.log(`  · ${mod.key.padEnd(12)} — aktuell: ${countRecords(current)} → wird geleert`)
  }
  console.log('  · gdpr/*, legal/*  — werden geleert')
  const confirm = await ask('\nZum Bestätigen "JA" eingeben, alles andere bricht ab: ')
  if (confirm !== 'JA') { console.log('Abgebrochen, nichts geändert.'); return }

  for (const mod of MODULES) await clearModule(mod)
  await clearGdprAndLegal()
  console.log('✓ Alle Module geleert.')

  const resetUsers = await ask('\nAuch Benutzer zurücksetzen (nur admin/adminpass behalten)? [j/N]: ')
  if (resetUsers.toLowerCase() === 'j') {
    await resetUsersToAdminOnly()
    console.log('✓ Benutzer zurückgesetzt (nur admin/adminpass).')
  } else {
    console.log('Benutzer unverändert gelassen.')
  }
}

async function customMode() {
  console.log('\nIndividueller Modus: pro Modul entscheiden.\n')
  const toClear = []
  for (const mod of MODULES) {
    const current = readJson(path.join(DATA_DIR, mod.file))
    const answer = await ask(`  ${mod.key.padEnd(12)} (aktuell: ${countRecords(current)}) — leeren? [j/N]: `)
    if (answer.toLowerCase() === 'j') toClear.push(mod)
  }
  const clearGdprLegal = await ask('  gdpr/* und legal/* leeren? [j/N]: ')

  if (toClear.length === 0 && clearGdprLegal.toLowerCase() !== 'j') {
    console.log('\nNichts zum Leeren ausgewählt.')
  } else {
    console.log(`\nWird geleert: ${toClear.map(m => m.key).join(', ') || '(keine Module)'}${clearGdprLegal.toLowerCase() === 'j' ? ', gdpr/*, legal/*' : ''}`)
    const confirm = await ask('Zum Bestätigen "JA" eingeben, alles andere bricht ab: ')
    if (confirm !== 'JA') { console.log('Abgebrochen, nichts geändert.'); return }
    for (const mod of toClear) await clearModule(mod)
    if (clearGdprLegal.toLowerCase() === 'j') await clearGdprAndLegal()
    console.log('✓ Ausgewählte Module geleert.')
  }

  const resetUsers = await ask('\nAuch Benutzer zurücksetzen (nur admin/adminpass behalten)? [j/N]: ')
  if (resetUsers.toLowerCase() === 'j') {
    await resetUsersToAdminOnly()
    console.log('✓ Benutzer zurückgesetzt (nur admin/adminpass).')
  } else {
    console.log('Benutzer unverändert gelassen.')
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(' ISMS Builder — Produktiv-Vorbereitung')
  console.log(` Datenverzeichnis: ${DATA_DIR}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\nDieses Skript räumt Demo-/Testdaten weg, ohne das Storage-Backend zu')
  console.log('wechseln (bleibt STORAGE_BACKEND=json). Bereits eingegebene echte Daten')
  console.log('lassen sich modulweise behalten.\n')
  console.log('Bitte vorher den Server stoppen: bash stop.sh\n')

  const proceed = await ask('Fortfahren? [j/N]: ')
  if (proceed.toLowerCase() !== 'j') { console.log('Abgebrochen.'); rl.close(); return }

  console.log('\n▶ Erstelle Backup von data/ …')
  const backupDir = backupDataDir()
  console.log(`  ✓ Backup: ${backupDir}`)

  const mode = await ask('\nModus wählen — [1] Schnell (alles leeren)  [2] Individuell  [0] Abbrechen: ')
  if (mode === '1') await quickMode()
  else if (mode === '2') await customMode()
  else { console.log('Abgebrochen, nichts geändert (Backup bleibt bestehen).'); rl.close(); return }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(` Fertig. Backup zur Wiederherstellung: ${backupDir}`)
  console.log(' Server jetzt starten: bash start.sh')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  rl.close()
}

main().catch((e) => {
  console.error('Fehler:', e.message)
  process.exit(1)
})
