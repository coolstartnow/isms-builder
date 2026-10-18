#!/usr/bin/env node
'use strict'
// Spielt eine Änderungsdatei der Android-App ("Nur Änderungen exportieren") am Hauptsystem ein.
// Nutzt POST /sync/push – also dieselbe Konfliktregel wie der WLAN-Abgleich (nichts wird blind überschrieben).
//
//   node scripts/sync-import.js <server-url> <benutzer> <datei.json>
//   Passwort: Umgebungsvariable ISMS_SYNC_PASSWORD, sonst Abfrage ohne Echo.
const fs = require('fs')
const readline = require('readline')

function ask(prompt) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = s => { if (s.includes(prompt)) process.stdout.write(s) }
    rl.question(prompt, answer => { rl.close(); process.stdout.write('\n'); resolve(answer) })
  })
}

async function main() {
  const [url, user, file] = process.argv.slice(2)
  if (!url || !user || !file) { console.error('Verwendung: node scripts/sync-import.js <server-url> <benutzer> <datei.json>'); process.exit(2) }
  if (!/^https?:\/\//i.test(url)) { console.error('Die Server-Adresse muss mit http:// oder https:// beginnen'); process.exit(2) }
  let payload
  try { payload = JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { console.error(`Datei nicht lesbar: ${e.message}`); process.exit(2) }
  if (!payload || typeof payload.changes !== 'object' || payload.protocolVersion !== 1) {
    console.error('Das ist keine Änderungsdatei der App (erwartet: { protocolVersion: 1, changes: {…} }). Bitte in der App „Nur Änderungen exportieren“ wählen.')
    process.exit(2)
  }
  const base = url.replace(/\/+$/, '')
  const password = process.env.ISMS_SYNC_PASSWORD || await ask('Passwort: ')

  const login = await fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password }) })
  if (login.status !== 200) { console.error(`Anmeldung fehlgeschlagen (HTTP ${login.status})`); process.exit(1) }
  const cookie = login.headers.getSetCookie().map(c => c.split(';')[0]).find(c => c.startsWith('sm_session='))
  if (!cookie) { console.error('Der Server hat keine Sitzung geliefert'); process.exit(1) }

  const res = await fetch(`${base}/sync/push`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(payload) })
  const body = await res.json().catch(() => null)
  if (res.status !== 200 || !body) { console.error(`Import fehlgeschlagen (HTTP ${res.status}): ${body && body.error ? body.error : 'keine Antwort'}`); process.exit(1) }

  let ok = 0, conflicts = 0
  for (const [mod, list] of Object.entries(body.accepted || {})) { ok += list.length; if (list.length) console.log(`  ${mod}: ${list.length} übernommen`) }
  for (const [mod, list] of Object.entries(body.conflicts || {})) {
    conflicts += list.length
    for (const c of list) console.log(`  KONFLIKT ${mod}/${c.id}: am Server inzwischen geändert – nicht überschrieben`)
  }
  for (const r of body.rejected || []) console.log(`  abgelehnt ${r.module}${r.id ? '/' + r.id : ''}: ${r.reason}`)
  console.log(`Fertig: ${ok} übernommen, ${conflicts} Konflikte, ${(body.rejected || []).length} abgelehnt.`)
  process.exit(conflicts || (body.rejected || []).length ? 3 : 0)
}
main().catch(e => { console.error(e.message); process.exit(1) })
