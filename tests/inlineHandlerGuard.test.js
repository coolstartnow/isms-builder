'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Wächter: Kein Wert aus Daten kann in einem Inline-Handler (onclick="…" und Verwandte) den JavaScript-Zeichenkettenkontext verlassen.
// Hintergrund: escHtml() maskiert & < > " — NICHT den Apostroph. In  onclick="f('${escHtml(x)}')"  beendet ein Apostroph die Zeichenkette; der Browser entschlüsselt
// das Attribut vor der Ausführung, der Rest läuft als Code (gespeichertes XSS: z. B. ein Vorlagen-Titel `x'); …//`, den ein Administrator in der Verwaltung anklickt).
// Seit 1.84.0-beta.40 geht jeder Wert über jsArg() (ein vollständig maskiertes JS-Literal) bzw. jsNum() in den Handler. Schlägt dieser Test an,
// steht irgendwo wieder ein Wert in Hochkommas oder ungeschützt in einem Handler — mit jsArg(…) einsetzen, ohne Anführungszeichen drumherum.
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')
const read = f => fs.readFileSync(path.join(root, f), 'utf8')
const { findHandlers, analyze } = require('./setup/inlineHandlers')

describe('Leser für Inline-Handler (inlineHandlers.js)', () => {
  const kinds = code => findHandlers(code).flatMap(h => analyze(h).map(a => a.kind))
  test('Wert in Hochkommas → quoted (unsicher), auch mit escHtml', () => {
    expect(kinds('`<b onclick="f(\'${x.id}\')">`')).toEqual(['quoted'])
    expect(kinds('`<b onclick="f(\'${escHtml(x.title)}\',\'${y}\')">`')).toEqual(['quoted', 'quoted'])
  })
  test('jsArg/jsNum und das schon vorhandene escHtml(JSON.stringify(…)) → safe', () => {
    expect(kinds('`<b onclick="f(${jsArg(x.id)},${jsArg(x.title)},${jsNum(n)})">`')).toEqual(['safe', 'safe', 'safe'])
    expect(kinds('`<b onclick="f(${escHtml(JSON.stringify(String(u)))})">`')).toEqual(['safe'])
  })
  test('ungequoteter, ungeschützter Wert → raw (unsicher); Zähler/Konstanten/Verneinung → numeric', () => {
    expect(kinds('`<b onclick="f(${x.id})">`')).toEqual(['raw'])
    expect(kinds('`<b onclick="f(${i},${_LIMIT},${!open},${arr.length})">`')).toEqual(['numeric', 'numeric', 'numeric', 'numeric'])
  })
  test('verschachtelte Schablone: nur mit jsArg sicher', () => {
    expect(kinds('`<b onclick="${id ? `f(${jsArg(id)})` : `g(${jsArg(t)})`}">`')).toEqual(['safe'])
    expect(kinds('`<b onclick="f(${id ? `\'${id}\'` : \'null\'})">`')).toEqual(['raw'])
  })
  test('mehrere Attribute, Ausdrücke mit Hochkommas und Regex-Literal werden richtig zerlegt', () => {
    const code = '`<a onclick="a(\'${escHtml(x).replace(/\'/g,"\\\\\'")}\')" title="${t(\'k\')}" onchange="b(${jsArg(y)})">`'
    expect(findHandlers(code).map(h => h.attr)).toEqual(['onclick', 'onchange'])
    expect(kinds(code)).toEqual(['quoted', 'safe'])
  })
  test('maskiertes Hochkomma in der Vorlage (\\\') ist ein echtes Hochkomma: der Wert steht dann in einer Zeichenkette', () => {
    expect(kinds('`<b onclick="f(\\\'${x}\\\')">`')).toEqual(['quoted'])
    expect(kinds('`<b onclick="f(\\\'fest\\\',${jsArg(x)})">`')).toEqual(['safe'])
  })
  test('Handler mit festem Text ohne Werte → keine Ausdrücke', () => {
    expect(kinds('`<b onclick="doIt(\'fest\')">`')).toEqual([])
  })
})

describe('ui/app.js: Inline-Handler', () => {
  const src = read('ui/app.js')
  const handlers = findHandlers(src)
  const findings = handlers.flatMap(h => analyze(h).map(a => ({ line: h.line, attr: h.attr, ...a })))

  test('der Wächter sieht die Handler (nicht leer)', () => { expect(handlers.length).toBeGreaterThan(500) })

  test('kein Wert in einer einfach gequoteten Zeichenkette eines Handlers', () => {
    expect(findings.filter(f => f.kind === 'quoted').map(f => `Zeile ${f.line}: ${f.expr.slice(0, 50)}`)).toEqual([])
  })

  test('kein ungequoteter, ungeschützter Wert in einem Handler (nur jsArg/jsNum, Zähler, Konstanten)', () => {
    expect(findings.filter(f => f.kind === 'raw').map(f => `Zeile ${f.line}: ${f.expr.slice(0, 60)}`)).toEqual([])
  })

  test('keine einfach gequoteten Handler-Attribute und keine javascript:-Verweise in Vorlagen', () => {
    expect(src.match(/\bon(?:click|change|input|submit|keydown|blur|focus)\s*='/g) || []).toEqual([])
    expect(src.match(/href="javascript:/gi) || []).toEqual([])
  })

  test('Übersetzungsprobe: jeder Handler ist mit Beispielwerten gültiges JavaScript (fängt Tippfehler des Umbaus vor dem Klick)', () => {
    const decode = s => s.replace(/\\(['"`\\$])/g, '$1').replace(/\\n/g, '\n').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')   // erst Vorlagen-Maskierungen, dann HTML-Entitäten
    const fill = code => code.replace(/\$\{\s*(?:jsArg|escHtml\(JSON\.stringify)[\s\S]*?\)\}/g, '"x"')   // einfache Fälle in verschachtelten Schablonen
    const failures = []
    for (const h of handlers) {
      let code = ''
      for (const seg of h.segs) {
        if (seg.t === 'text') { code += decode(seg.s); continue }
        const e = seg.s.trim()
        if (/^(?:jsArg|escHtml\(JSON\.stringify)/.test(e)) code += '"x"'
        else if (/^jsNum\(/.test(e)) code += '0'
        else if (e.includes('`')) {   // zusammengesetzt: jede Schablone darin einzeln prüfen, im Handler steht ein Platzhalteraufruf
          for (const tpl of e.match(/`(?:[^`\\]|\\.|\$\{[^}]*\})*`/g) || []) {
            const inner = fill(tpl.slice(1, -1)); try { new Function(inner) } catch (err) { failures.push(`Zeile ${h.line} (Schablone): ${inner.slice(0, 80)} → ${err.message}`) }
          }
          code += 'x()'
        } else code += '0'
      }
      try { new Function(code) } catch (err) { failures.push(`Zeile ${h.line}: ${code.slice(0, 90)} → ${err.message}`) }
    }
    expect(failures).toEqual([])
  })
})

describe('jsArg / jsNum (aus ui/app.js)', () => {
  const src = read('ui/app.js')
  const a = src.indexOf('function escHtml'), b0 = src.indexOf('function jsNum'), b = src.indexOf('\n}\n', b0) + 3
  const { jsArg, jsNum } = new Function(src.slice(a, b) + '\nreturn { jsArg, jsNum }')()
  const decodeLikeBrowser = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  const HOSTILE = ["x'); window.__pwn=1;//", "\\'); window.__pwn=1;//", '"); window.__pwn=1;//', '</script><img src=x onerror=1>', 'a"b\'c`d${e}', 'Zeile\nZwei\r\n', '  ', '\\', "'", '"', '&amp;&quot;', 'ä ö ü ß ő ł Ж 日本', 'x'.repeat(5000), '\u0000\u001f']
  test.each(HOSTILE.map(v => [JSON.stringify(v).slice(0, 40), v]))('Rundlauf: %s kommt als genau diese Zeichenkette an', (_n, v) => {
    const attrText = jsArg(v)
    expect(attrText).not.toMatch(/["<>]/)   // attributsicher: kein rohes Anführungszeichen, kein < oder >
    const js = decodeLikeBrowser(attrText)   // so sieht der JavaScript-Teil des Attributs aus, nachdem der Browser es entschlüsselt hat
    const out = new Function('return (' + js + ')')()
    expect(out).toBe(v)
  })
  test('als Aufrufargument: eingeschleuster Code bleibt Text', () => {
    globalThis.__pwn = undefined
    const f = new Function('f', 'return ' + 'f(' + decodeLikeBrowser(jsArg("x'); globalThis.__pwn=1;//")) + ',' + decodeLikeBrowser(jsArg('\\\'); globalThis.__pwn=1;//')) + ')')
    const got = f((a, b) => [a, b])
    expect(got).toEqual(["x'); globalThis.__pwn=1;//", "\\'); globalThis.__pwn=1;//"]); expect(globalThis.__pwn).toBeUndefined()
  })
  test('null/undefined → leere Zeichenkette, Zahlen → Zeichenkette; jsNum nur Zahlen', () => {
    expect(decodeLikeBrowser(jsArg(undefined))).toBe('""'); expect(decodeLikeBrowser(jsArg(null))).toBe('""'); expect(decodeLikeBrowser(jsArg(0))).toBe('"0"')
    expect([jsNum('12'), jsNum('-3.5'), jsNum('x'), jsNum(undefined), jsNum(Infinity), jsNum("1);alert(1")]).toEqual(['12', '-3.5', '0', '0', '0', '0'])
  })
})

describe('weitere Oberflächen-Dateien', () => {
  test('index.html und login.html setzen keine Werte in Handler (statisch)', () => {
    for (const f of ['ui/index.html', 'ui/login.html']) for (const h of findHandlers(read(f))) expect([f, h.segs.some(s => s.t === 'expr')]).toEqual([f, false])
  })
})
