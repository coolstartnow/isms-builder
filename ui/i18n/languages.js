// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Sprachregister: die EINZIGE Stelle, an der die unterstützten Sprachen aufgezählt werden.
// Im Browser als window.LANGUAGES (vor ui/i18n/t.js laden), im Server per require('../ui/i18n/languages.js').
//
// Neue Sprache hinzufügen: Eintrag unten ergänzen (am Ende anhängen, `msgIndex` = nächste freie Zahl) und die Daten liefern
// (ui/i18n/translations.js, server/i18n.js, Inhalte, Dokumentation, Demo-Bündel). Fehlende Texte fallen auf Englisch zurück.
// Solange `status` nicht 'complete' ist, bleibt `listed` auf false: die Sprache erscheint dann weder auf der Anmeldeseite
// noch in der Sprachauswahl der Verwaltung (per Browser-Einstellung / localStorage `isms_lang` ist sie trotzdem testbar).
// Die ausführliche Checkliste steht in AGENTS.md („Neue Sprache hinzufügen“).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory()
  else root.LANGUAGES = factory()
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  const DEFAULT = 'en'

  // code: ISO 639-1 · name: Eigenbezeichnung · flag: Symbol in Auswahl und Anmeldeseite · locale: Datums-/Zahlenformat
  // docSuffix: Endung der Dokumentationsdateien (docs/<name><docSuffix>.md; Deutsch hat keine) · aiName: Sprachname im KI-Prompt (Englisch)
  // browserPrefix: erkennt die Sprache aus navigator.language · demoLabel: Beschriftung der Demo-Daten-Auswahl (in der Sprache selbst) · msgIndex: Spalte in der Meldungstabelle von server/i18n.js
  // status: 'complete' (alle Daten des Hauptprojekts vollständig: Texte, Inhalte, Doku, Demo-Bündel) | 'partial' · listed: in Anmeldeseite und Verwaltung auswählbar
  // (Estnisch: complete seit beta.25, listed seit beta.26 auf Zusage des Nutzers — zunächst für die lokale Demo; vor einem Release neu entscheiden)
  const LIST = [
    { code: 'de', name: 'Deutsch',    flag: '🇩🇪', locale: 'de-DE', docSuffix: '',    aiName: 'German',    browserPrefix: 'de', demoLabel: 'Demo-Daten auf Deutsch', msgIndex: 1, status: 'complete', listed: true },
    { code: 'en', name: 'English',    flag: '🇬🇧', locale: 'en-GB', docSuffix: '.en', aiName: 'English',   browserPrefix: 'en', demoLabel: 'Demo data in English', msgIndex: 0, status: 'complete', listed: true },
    { code: 'fr', name: 'Français',   flag: '🇫🇷', locale: 'fr-FR', docSuffix: '.fr', aiName: 'French',    browserPrefix: 'fr', demoLabel: 'Données de démonstration en français', msgIndex: 2, status: 'complete', listed: true },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱', locale: 'nl-NL', docSuffix: '.nl', aiName: 'Dutch',     browserPrefix: 'nl', demoLabel: 'Demogegevens in het Nederlands', msgIndex: 3, status: 'complete', listed: true },
    { code: 'hu', name: 'Magyar',     flag: '🇭🇺', locale: 'hu-HU', docSuffix: '.hu', aiName: 'Hungarian', browserPrefix: 'hu', demoLabel: 'Demóadatok magyarul', msgIndex: 4, status: 'complete', listed: true },
    { code: 'et', name: 'Eesti',      flag: '🇪🇪', locale: 'et-EE', docSuffix: '.et', aiName: 'Estonian',  browserPrefix: 'et', demoLabel: 'Demoandmed eesti keeles', msgIndex: 5, status: 'complete', listed: true  },
  ]

  const byCode = Object.fromEntries(LIST.map(l => [l.code, l]))

  return {
    DEFAULT,
    list: LIST,
    /** Alle bekannten Codes in Anzeigereihenfolge (auch noch nicht freigegebene). */
    codes: () => LIST.map(l => l.code),
    /** Codes mit vollständigen Daten (Demo-Bündel, Anleitungen, Fragebögen …): nur diese dürfen als Datensprache gewählt werden. */
    completeCodes: () => LIST.filter(l => l.status === 'complete').map(l => l.code),
    /** Teilmenge von codes(), für die ein Datenobjekt `{ de: …, en: … }` einen Eintrag hat (Inhalte ohne Übersetzung fallen auf Englisch zurück). */
    withData: sample => LIST.map(l => l.code).filter(c => sample && Object.prototype.hasOwnProperty.call(sample, c)),
    /** Codes, die auf der Anmeldeseite und in der Verwaltung auswählbar sind. */
    listedCodes: () => LIST.filter(l => l.listed).map(l => l.code),
    get: code => byCode[code] || null,
    has: code => Object.prototype.hasOwnProperty.call(byCode, code),
    /** Bekannter Code oder Englisch. */
    norm: code => (Object.prototype.hasOwnProperty.call(byCode, code) ? code : DEFAULT),
    locale: code => (byCode[code] || byCode[DEFAULT]).locale,
    docSuffix: code => (byCode[code] || byCode[DEFAULT]).docSuffix,
    aiName: code => (byCode[code] || byCode[DEFAULT]).aiName,
    msgIndex: code => (byCode[code] || byCode[DEFAULT]).msgIndex,
    /** Sprache aus der Browsereinstellung (navigator.language), sonst Englisch. */
    // Nur auswählbare Sprachen: eine unfertige Sprache wird nie automatisch aus der Browsereinstellung gewählt
    fromBrowser: nav => {
      const n = String(nav || '').toLowerCase()
      const hit = LIST.find(l => l.listed && n.startsWith(l.browserPrefix))
      return hit ? hit.code : DEFAULT
    },
  }
})
