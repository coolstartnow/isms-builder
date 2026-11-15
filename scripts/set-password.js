#!/usr/bin/env node
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
//
// Setzt das Passwort eines Benutzers von der Kommandozeile (Notfall-Zugang, z. B. wenn der Administrator im Produktivbetrieb noch das
// Demo-Passwort hatte und die Anmeldung abgelehnt wird). Das neue Passwort muss beim nächsten Login nicht geändert werden;
// alle bestehenden Sitzungen des Kontos enden.
//
// Aufruf:   DATA_DIR=/pfad/zu/data node scripts/set-password.js <benutzername>
// Docker:   docker exec -it <container> node scripts/set-password.js admin
// Das Passwort wird nicht angezeigt und nicht als Argument übergeben (Shell-Verlauf).
// Voraussetzung: Server sollte vorher gestoppt sein (die Benutzerdatei wird direkt geschrieben).
'use strict'
const path = require('path')
const readline = require('readline')

const username = process.argv[2]
if (!username) { console.error('Aufruf: node scripts/set-password.js <benutzername>'); process.exit(2) }

const rbac = require(path.join(__dirname, '../server/rbacStore'))
const productionState = require(path.join(__dirname, '../server/productionState'))
if (!rbac.getUserByUsername(username)) { console.error(`Benutzer „${username}“ existiert nicht.`); process.exit(1) }

function askHidden(q) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = s => { if (s.includes(q)) rl.output.write(s); else rl.output.write('') }
    rl.question(q, a => { rl.close(); process.stdout.write('\n'); resolve(a) })
  })
}

;(async () => {
  const p1 = await askHidden('Neues Passwort (mindestens 8 Zeichen): ')
  const p2 = await askHidden('Wiederholen: ')
  if (p1 !== p2) { console.error('Eingaben stimmen nicht überein.'); process.exit(1) }
  if (p1.length < 8) { console.error('Mindestens 8 Zeichen.'); process.exit(1) }
  if (productionState.isSeedPassword(p1) && productionState.isProduction(rbac)) { console.error('Bekanntes Demo-Passwort im Produktivbetrieb nicht erlaubt.'); process.exit(1) }
  await rbac.setPasswordHash(username, p1)
  require(path.join(__dirname, '../server/sessionStore')).flushNow()
  console.log(`✓ Passwort für „${username}“ gesetzt; bestehende Sitzungen beendet.`)
  process.exit(0)
})().catch(e => { console.error(e.message); process.exit(1) })
