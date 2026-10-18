'use strict'
// Sync-Konten in der Verwaltung: ui/app.js ist Browser-Code ohne Export, daher statische Prüfung der Verdrahtung.
const fs = require('fs')
const path = require('path')
const APP = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app.js'), 'utf8')

describe('Sync-Konten: Oberfläche (statisch)', () => {
  test('Bereich hängt im Benutzer-Tab und lädt die Konten', () => {
    expect(APP).toMatch(/id="adminSyncAccounts"/)
    expect(APP).toMatch(/renderAdminSyncAccounts\(\)\n\}/)
    expect(APP).toMatch(/fetch\('\/admin\/sync-accounts'/)
  })
  test('alle Aktionen sind vorhanden und sprechen die Verwaltungs-Endpunkte an', () => {
    for (const fn of ['syncNew', 'syncEdit', 'syncCancel', 'syncSave', 'syncToggle', 'syncDelete', 'syncCopyKey', 'syncKeyDone', 'syncEnroll', 'syncEnrollClose', 'syncScriptKey', 'syncRemoveDevice']) {
      expect(APP).toMatch(new RegExp(`function ${fn}\\(`))
    }
    expect(APP).toMatch(/\/enrollment`/)
    expect(APP).toMatch(/\/devices`/)
    expect(APP).toMatch(/\/devices\/\$\{encodeURIComponent\(deviceId\)\}/)
    expect(APP).toMatch(/method: 'DELETE'/)
  })
  test('der Schlüssel wird nur im Hinweiskasten ausgegeben, nicht in der Tabelle', () => {
    const table = APP.slice(APP.indexOf('const table = _syncList.length'), APP.indexOf('box.innerHTML = `\n    <div class="admin-users-toolbar">\n      <span class="admin-panel-title"><i class="ph ph-device-mobile">'))
    expect(table).not.toMatch(/token|syncKeyValue/)
  })
  test('nach dem Anlegen geht es direkt mit der Geräteeinrichtung weiter', () => {
    expect(APP).toMatch(/if \(isNew\) \{ await syncEnroll\(data\.account\.id\)/)
  })
  test('Hinweis „nur JSON-Speicher“ ist als hervorgehobene Warnung eingebaut, nicht als graue Fußzeile', () => {
    expect(APP).toMatch(/ph ph-warning[\s\S]{0,260}sync_backendNote/)
    expect(APP).not.toMatch(/font-size:12px;">\$\{escHtml\(t\('sync_backendNote'\)\)\}/)
  })
  test('Formular inline, kein Modal', () => {
    const block = APP.slice(APP.indexOf('// ── Sync-Konten (mobile App)'), APP.indexOf('function openUserModal('))
    expect(block).not.toMatch(/class="modal|openModal|\.modal/)
  })
  test('Rechteliste deckt alle Module ab; Guidance nur lesbar', () => {
    const syncStore = require('../server/db/syncAccountStore')
    for (const m of syncStore.MODULES) expect(APP).toMatch(new RegExp(`id: '${m}'`))
    expect(APP).toMatch(/id: 'guidance'[^}]*readOnly: true/)
  })
})
