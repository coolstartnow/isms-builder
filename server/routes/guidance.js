// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
'use strict'
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const multer = require('multer')
const { requireAuth, authorize } = require('../auth')
const guidanceStore = require('../db/guidanceStore')
const embeddingStore = require('../ai/embeddingStore')

const guidanceUpload = multer({
  dest: path.join(__dirname, '../../data/guidance/files/'),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('Nur PDF und DOCX erlaubt'))
  }
})

const DEMO_LANG_FILE = path.join(__dirname, '../../data/.demo_lang_set')
const SUPPORTED_LANGS = ['de', 'en', 'fr', 'nl']

function _syncSeedLang(lang) {
  try {
    let current = 'en'
    try { current = JSON.parse(fs.readFileSync(DEMO_LANG_FILE, 'utf8')).lang || 'en' } catch {}
    if (current === lang) return
    fs.writeFileSync(DEMO_LANG_FILE, JSON.stringify({ lang, setAt: new Date().toISOString() }))
    try { guidanceStore.seedDemoDoc() }          catch {}
    try { guidanceStore.seedRoleGuides() }       catch {}
    try { guidanceStore.seedSoaGuide() }         catch {}
    try { guidanceStore.seedPolicyGuide() }      catch {}
    try { guidanceStore.seedIsoNotice() }        catch {}
    try { guidanceStore.seedArchitectureDocs() } catch {}
  } catch {}
}

router.get('/guidance', requireAuth, authorize('reader'), (req, res) => {
  const { category, lang } = req.query
  if (lang && SUPPORTED_LANGS.includes(lang)) _syncSeedLang(lang)
  const rank = req.roleRank || 1
  if (category) return res.json(guidanceStore.getByCategory(category, rank))
  res.json(guidanceStore.getAll(rank))
})

router.get('/guidance/:id/file', requireAuth, authorize('reader'), (req, res) => {
  const filePath = guidanceStore.getFilePath(req.params.id)
  if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' })
  const doc = guidanceStore.getById(req.params.id)
  const ext = doc?.filename ? path.extname(doc.filename).toLowerCase() : '.bin'
  const mime = ext === '.pdf' ? 'application/pdf' : 'application/octet-stream'
  res.setHeader('Content-Type', mime)
  if (doc?.filename) res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`)
  res.sendFile(path.resolve(filePath))
})

router.get('/guidance/:id', requireAuth, authorize('reader'), (req, res) => {
  const doc = guidanceStore.getById(req.params.id)
  if (!doc) return res.status(404).json({ error: 'Not found' })
  const RRANK = { reader: 1, editor: 2, dept_head: 2, contentowner: 3, auditor: 3, admin: 4 }
  if (doc.minRole && (req.roleRank || 1) < (RRANK[doc.minRole] || 1)) {
    return res.status(403).json({ error: 'Insufficient role' })
  }
  const { filePath, ...rest } = doc
  res.json(rest)
})

router.post('/guidance', requireAuth, authorize('contentowner'), (req, res) => {
  const { category, title, type, content, linkedControls } = req.body
  if (!category || !title) return res.status(400).json({ error: 'category and title are required' })
  try {
    const doc = guidanceStore.create({ category, title, type: type || 'markdown', content, linkedControls, createdBy: req.user })
    embeddingStore.indexDoc(doc, 'Systemhandbuch', '#guidance').catch(() => {})
    res.status(201).json(doc)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.post('/guidance/upload', requireAuth, authorize('contentowner'), (req, res) => {
  guidanceUpload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const { category, title } = req.body
    if (!category || !title) {
      fs.unlink(req.file.path, () => {})
      return res.status(400).json({ error: 'category and title are required' })
    }
    const ext = path.extname(req.file.originalname).toLowerCase()
    const type = ext === '.pdf' ? 'pdf' : 'docx'
    try {
      const doc = guidanceStore.create({
        category,
        title,
        type,
        content: '',
        filename: req.file.originalname,
        filePath: req.file.path,
        createdBy: req.user
      })
      res.status(201).json(doc)
    } catch (e) {
      fs.unlink(req.file.path, () => {})
      res.status(400).json({ error: e.message })
    }
  })
})

router.put('/guidance/:id', requireAuth, authorize('contentowner'), (req, res) => {
  const { title, category, content, linkedControls } = req.body
  const updated = guidanceStore.update(req.params.id, { title, category, content, linkedControls })
  if (!updated) return res.status(404).json({ error: 'Not found' })
  embeddingStore.indexDoc(updated, 'Systemhandbuch', '#guidance').catch(() => {})
  res.json(updated)
})

router.delete('/guidance/:id', requireAuth, authorize('admin'), (req, res) => {
  const ok = guidanceStore.delete(req.params.id, req.user)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'delete', resource: 'guidance', resourceId: req.params.id })
  res.json({ deleted: true })
})

router.delete('/guidance/:id/permanent', requireAuth, authorize('admin'), (req, res) => {
  const ok = guidanceStore.permanentDelete(req.params.id)
  if (!ok) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'permanent_delete', resource: 'guidance', resourceId: req.params.id })
  embeddingStore.removeDoc(req.params.id)
  res.json({ deleted: true, permanent: true })
})

router.post('/guidance/:id/restore', requireAuth, authorize('admin'), (req, res) => {
  const item = guidanceStore.restore(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  require('../db/auditStore').append({ user: req.user, action: 'restore', resource: 'guidance', resourceId: req.params.id })
  res.json(item)
})

module.exports = router
