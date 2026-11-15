'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Die Einführung zur ISO 22301 in der BCM-Anleitung beginnt mit einem deutlichen Hinweis: keine offizielle Wiedergabe, kein Normtext.
const fs = require('fs')
const path = require('path')
const HEADS = { '': '## Einführung: Was ist ISO 22301?', '.en': '## Introduction: What is ISO 22301?', '.fr': "## Introduction : qu'est-ce que l'ISO 22301 ?", '.nl': '## Inleiding: wat is ISO 22301?', '.hu': '## Bevezetés: mi az ISO 22301?', '.et': '## Sissejuhatus: mis on ISO 22301?' }
test.each(Object.keys(HEADS))('docs/module-bcm%s.md: Hinweis „keine offizielle Wiedergabe“ steht direkt unter der Überschrift der Einführung', suf => {
  const md = fs.readFileSync(path.join(__dirname, `../docs/module-bcm${suf}.md`), 'utf8')
  const i = md.indexOf(HEADS[suf]); expect(i).toBeGreaterThan(-1)
  const after = md.slice(i + HEADS[suf].length, i + HEADS[suf].length + 900)
  expect(after.trimStart().startsWith('> **')).toBe(true)                  // Hinweis im gleichen Format wie die übrigen („> **Hinweis:** …“)
  expect(after).toMatch(/22301/)
  expect(after).toMatch(/DIN\/Beuth/)                                      // Hinweis auf den Bezug der maßgeblichen Norm
  expect(after).toMatch(/\*\*(nem helyettesíti|no substitute|ne remplace pas|geen vervanging|kein Ersatz|ei asenda standardit)/)
})
