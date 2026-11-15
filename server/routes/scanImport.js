// © 2026 Claude Hecker — ISMS Builder V 1.32.0 — AGPL-3.0
// Scan-Import-Route: POST /admin/scan-import/upload
'use strict'
const express     = require('express')
const router      = express.Router()
const multer      = require('multer')
const fs          = require('fs')
const path        = require('path')
const { requireAuth, authorize } = require('../auth')
const xmlParser   = require('../ai/greenboneXmlParser')
const pdfParser   = require('../ai/greenobonePdfParser')
const importer    = require('../ai/scanImporter')
const audit       = require('../db/auditStore')

const _BASE       = process.env.DATA_DIR || path.join(__dirname, '../../data')
const STATE_FILE  = path.join(_BASE, 'scan-import-state.json')

// Temporärer Upload-Speicher (max 20 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xml|pdf)$/i.test(file.originalname)
    cb(ok ? null : new Error('Nur XML- oder PDF-Dateien erlaubt'), ok)
  }
})

// ── GET /admin/scan-import/status ─────────────────────────────────────────────
// wie der Upload; kein Zugriff durch Leser
router.get('/admin/scan-import/status', requireAuth, authorize('auditor'), (req, res) => {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    res.json(state)
  } catch {
    res.json({ lastImport: null, totalImported: 0 })
  }
})

// ── POST /admin/scan-import/upload ────────────────────────────────────────────
router.post('/admin/scan-import/upload',
  requireAuth, authorize('auditor'),
  upload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' })

    const fileName = req.file.originalname
    const isXml    = /\.xml$/i.test(fileName)
    const isPdf    = /\.pdf$/i.test(fileName)
    const entityId = req.body.entityId   || null
    const scanRef  = req.body.scanRef    || path.basename(fileName, path.extname(fileName))
    const scanDate = req.body.scanDate   || new Date().toISOString().slice(0, 10)

    let findings = []
    let parseMethod = ''

    try {
      if (isXml) {
        parseMethod = 'xml'
        findings    = await xmlParser.parseXml(req.file.buffer.toString('utf8'))
      } else if (isPdf) {
        parseMethod = 'pdf'
        findings    = await pdfParser.parsePdf(req.file.buffer)
      } else {
        return res.status(400).json({ error: 'Nur .xml oder .pdf Dateien werden unterstützt' })
      }
    } catch (err) {
      return res.status(422).json({ error: `Parsing fehlgeschlagen: ${err.message}` })
    }

    if (findings.length === 0) {
      return res.status(422).json({ error: 'Keine Schwachstellen im Report gefunden (CVSS > 0)' })
    }

    const result = importer.importFindings(findings, {
      scanRef,
      scanDate,
      importedBy:     req.user,
      entityId,
      skipDuplicates: req.body.skipDuplicates !== 'false'
    })

    // Status-Datei aktualisieren
    saveState({ lastImport: new Date().toISOString(), ...result, scanRef, parseMethod, importedBy: req.user })

    await audit.append({
      user:       req.user,
      action:     'scan_import',
      resource:   'risk',
      detail:     `${parseMethod.toUpperCase()} Import: ${result.created} Risiken erstellt, ${result.skipped} übersprungen — ${scanRef}`
    })

    res.json({
      ok:          true,
      parseMethod,
      findings:    findings.length,
      clusters:    result.clusters,
      created:     result.created,
      skipped:     result.skipped,
      risks:       result.risks
    })
  }
)

function saveState(data) {
  try {
    let state = {}
    try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) } catch {}
    state.lastImport    = data.lastImport
    state.lastScanRef   = data.scanRef
    state.lastMethod    = data.parseMethod
    state.lastImportedBy= data.importedBy
    state.totalImported = (state.totalImported || 0) + (data.created || 0)
    state.history       = state.history || []
    state.history.unshift({ date: data.lastImport, scanRef: data.scanRef,
      method: data.parseMethod, created: data.created, skipped: data.skipped })
    if (state.history.length > 20) state.history = state.history.slice(0, 20)
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  } catch {}
}

module.exports = router
