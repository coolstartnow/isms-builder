'use strict'
// Leseansicht und PDF-Ausgabe für Richtlinien (#61).
//
// Gemeldet von @jasc76: Wer nicht bearbeiten darf, bekam dasselbe Autoren-
// Eingabefeld wie ein Redakteur — also rohen Markdown-Quelltext. Dieselbe
// Rohfassung stand auf der login-freien Bestätigungsseite, auf der Beschäftigte
// per Klick erklären, die Richtlinie gelesen und verstanden zu haben.
//
// ui/app.js ist Browser-Code ohne Export und in Jest nicht ladbar; geprüft wird
// deshalb statisch. Die Wirkung selbst wurde im laufenden Programm verifiziert.

const fs   = require('fs')
const path = require('path')

const read = (...p) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8')
const APP_JS  = read('ui', 'app.js')
const INDEX   = read('ui', 'index.html')
const ACK     = read('server', 'routes', 'ackPublic.js')

describe('#61 – Leseansicht im Richtlinien-Editor', () => {
  test('es gibt einen Anzeigebereich neben dem Eingabefeld', () => {
    expect(INDEX).toMatch(/id="contentViewer"/)
    expect(INDEX).toMatch(/id="contentEditor"/)
  })

  test('die Ansicht wird beim Laden eines Dokuments gesetzt', () => {
    expect(APP_JS).toMatch(/applyTemplateViewMode\(t\)/)
  })

  test('ohne Schreibrecht verschwindet der Speichern-Knopf', () => {
    const fn = APP_JS.match(/function applyTemplateViewMode[\s\S]*?\n\}/)
    expect(fn).not.toBeNull()
    expect(fn[0]).toMatch(/canEdit/)
    expect(fn[0]).toMatch(/save\.style\.display/)
  })

  test('applyTemplateViewMode überschattet die i18n-Funktion nicht', () => {
    // Derselbe Fehler hatte in V 1.37.1 schon einmal ein Modul lahmgelegt:
    // ein Parameter namens `t` verdeckt die globale Übersetzungsfunktion.
    const fn = APP_JS.match(/function applyTemplateViewMode\(([^)]*)\)/)
    expect(fn).not.toBeNull()
    expect(fn[1].trim()).not.toBe('t')
  })
})

describe('#61 – Markdown wird sicher gerendert', () => {
  const fn = APP_JS.match(/function renderMarkdownSafe[\s\S]*?\n\}/)

  test('die Funktion existiert', () => {
    expect(fn).not.toBeNull()
  })

  test('eingebettetes HTML wird entschärft', () => {
    expect(fn[0]).toMatch(/replace\(\/<\/g, '&lt;'\)/)
  })

  test('nur < wird ersetzt, nicht > — sonst brechen Blockzitate', () => {
    // Regression: '>' pauschal zu '&gt;' zerstört Markdown-Zitate. Nur '<'
    // muss neutralisiert werden, damit kein Tag entstehen kann.
    expect(fn[0]).not.toMatch(/replace\(\/>\/g/)
  })

  test('javascript:-Verweise werden entfernt', () => {
    expect(fn[0]).toMatch(/javascript:/)
    expect(fn[0]).toMatch(/removeAttribute\('href'\)/)
  })

  test('ohne marked bleibt eine lesbare Rückfallebene', () => {
    expect(fn[0]).toMatch(/typeof marked === 'undefined'/)
  })
})

describe('#61 – Bestätigungsseite zeigt kein Rohformat mehr', () => {
  test('der Inhalt wird nicht mehr als escapeHtml-Block ausgegeben', () => {
    expect(ACK).not.toMatch(/class="policy-content">\$\{escapeHtml\(policyContent\)/)
  })

  test('der Inhalt wird als JSON eingebettet und gerendert', () => {
    expect(ACK).toMatch(/jsonForScript\(policyContent/)   // JSON, aber mit maskiertem "<" (siehe xssPublicPages.test.js)
    expect(ACK).toMatch(/marked\.parse\(/)
  })

  test('dieselben Schutzmaßnahmen wie im UI', () => {
    expect(ACK).toMatch(/replace\(\/</)
    expect(ACK).toMatch(/javascript:/)
  })

  test('marked wird aus dem öffentlich erreichbaren Pfad geladen', () => {
    // /ui/vendor/ ist in server/index.js bewusst ohne Login erreichbar —
    // die Bestätigungsseite hat keine Session.
    expect(ACK).toMatch(/\/ui\/vendor\/marked\.min\.js/)
    expect(read('server', 'index.js')).toMatch(/req\.path\.startsWith\('\/vendor\/'\)/)
  })

  test('die Seite bleibt lesbar, wenn marked nicht lädt', () => {
    expect(ACK).toMatch(/typeof marked === 'undefined'/)
  })

  test('nur < entschärft, nicht > (Blockzitate)', () => {
    // Die Markdown-Ersetzung im Inline-Skript darf nur < anfassen. Die
    // escapeHtml-Hilfsfunktion fuer Titel/Namen darf > weiter escapen.
    expect(ACK).toMatch(/raw\.replace\(\/<\/g, '&lt;'\)/)
    expect(ACK).not.toMatch(/raw\.replace\([^)]*>\/g/)
  })

  test('die Bestätigungsseite wird nicht aus dem Cache ausgeliefert', () => {
    // Inhalt und Bestätigungsstand können sich ändern; eine veraltete Seite
    // hatte im Test bereits eine alte Render-Fassung gezeigt.
    expect(ACK).toMatch(/Cache-Control['"],\s*['"]no-store/)
  })
})

describe('#61 – PDF-Ausgabe', () => {
  test('Einzeldokument und Sammelausgabe existieren', () => {
    expect(APP_JS).toMatch(/function printCurrentTemplate\(/)
    expect(APP_JS).toMatch(/async function printTemplateSet\(/)
  })

  test('der Dateiname trägt Version, Status und Datum', () => {
    const fn = APP_JS.match(/function templateFileName[\s\S]*?\n\}/)
    expect(fn).not.toBeNull()
    expect(fn[0]).toMatch(/tmpl\.version/)
    expect(fn[0]).toMatch(/tmpl\.status/)
    expect(fn[0]).toMatch(/toISOString\(\)\.slice\(0, 10\)/)
  })

  test('die Sammelausgabe filtert nach Typ und Status', () => {
    const fn = APP_JS.match(/async function printTemplateSet[\s\S]*?\n\}/)
    expect(fn[0]).toMatch(/d\.type === type/)
    expect(fn[0]).toMatch(/d\.status === status/)
  })

  test('gedruckt wird gerendertes Markdown, kein Rohtext', () => {
    const fn = APP_JS.match(/function _printTemplates[\s\S]*?\n\}/)
    expect(fn[0]).toMatch(/renderMarkdownSafe\(d\.content\)/)
  })
})
