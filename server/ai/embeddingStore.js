// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Vector index stored as JSON — no native deps required.
// ~500 docs × 768 floats ≈ 3 MB in memory, linear scan < 5 ms.
'use strict'

const fs   = require('fs')
const path = require('path')
const { embed, cosine } = require('./embedder')

const DATA_DIR    = process.env.DATA_DIR || path.join(__dirname, '../../data')
const INDEX_FILE  = path.join(DATA_DIR, 'embeddings.json')

// In-memory index: { [id]: { type, title, text, vector, url, updatedAt } }
let _index = {}

function _load() {
  try { _index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')) } catch { _index = {} }
}

function _save() {
  try { fs.writeFileSync(INDEX_FILE, JSON.stringify(_index)) } catch {}
}

_load()

/**
 * Index a single document (fire-and-forget safe).
 * @param {object} doc  – { id, title, description?, content?, type }
 * @param {string} type – human-readable category label (e.g. 'template', 'risk')
 * @param {string} url  – deep-link for the UI (e.g. '#templates')
 */
async function indexDoc(doc, type, url) {
  if (!doc?.id) return
  const text = [doc.title, doc.description, doc.content, doc.scope, doc.notes]
    .filter(Boolean).join(' ').slice(0, 4000)
  const vector = await embed(text)
  if (!vector) return   // Ollama unavailable — skip silently
  _index[doc.id] = { type, title: doc.title || doc.name || doc.id, text: text.slice(0, 200), vector, url, updatedAt: new Date().toISOString() }
  _save()
}

/**
 * Remove a document from the index (e.g. after permanent delete).
 */
function removeDoc(id) {
  if (!_index[id]) return
  delete _index[id]
  _save()
}

/**
 * Semantic search: embed the query, return top-k results above threshold.
 * @returns {Array<{id,type,title,text,url,score}>}
 */
async function search(query, topK = 8, threshold = 0.50) {
  const qVec = await embed(query)
  if (!qVec) return []

  const scores = Object.entries(_index).map(([id, doc]) => ({
    id, type: doc.type, title: doc.title, text: doc.text, url: doc.url,
    score: cosine(qVec, doc.vector),
  }))

  return scores
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(r => ({ ...r, score: Math.round(r.score * 100) }))
}

/**
 * Full re-index of all modules (called by POST /api/ai/reindex).
 * Iterates every store that has a getAll()-like method.
 */
async function reindexAll() {
  const results = { indexed: 0, skipped: 0 }

  async function indexMany(items, type, urlFn) {
    for (const item of items) {
      try {
        await indexDoc(item, type, urlFn(item))
        results.indexed++
      } catch { results.skipped++ }
    }
  }

  try {
    const storage = require('../storage')
    const types = ['policy','procedure','record','guideline','template']
    for (const t of types) {
      const items = storage.getTemplates?.(t) || []
      await indexMany(items, 'Dokument', () => '#templates')
    }
  } catch {}

  try {
    const riskStore = require('../db/riskStore')
    await indexMany(riskStore.getAll?.() || [], 'Risiko', () => '#risks')
  } catch {}

  try {
    const goalsStore = require('../db/goalsStore')
    await indexMany(goalsStore.getAll?.() || [], 'Sicherheitsziel', () => '#goals')
  } catch {}

  try {
    const guidanceStore = require('../db/guidanceStore')
    await indexMany(guidanceStore.getAll?.() || [], 'Systemhandbuch', i => `#guidance`)
  } catch {}

  try {
    const trainingStore = require('../db/trainingStore')
    await indexMany(trainingStore.getAll?.() || [], 'Schulung', () => '#training')
  } catch {}

  try {
    const assetStore = require('../db/assetStore')
    await indexMany(assetStore.getAll?.() || [], 'Asset', () => '#assets')
  } catch {}

  try {
    const supplierStore = require('../db/supplierStore')
    await indexMany(supplierStore.getAll?.() || [], 'Lieferant', () => '#suppliers')
  } catch {}

  try {
    const bcmStore = require('../db/bcmStore')
    await indexMany(bcmStore.getBias?.() || [], 'BCM-BIA', () => '#bcm')
    await indexMany(bcmStore.getPlans?.() || [], 'BCM-Plan', () => '#bcm')
  } catch {}

  try {
    // #72: Findings fehlten hier komplett — weder semantisch noch per Keyword
    // durchsuchbar. observation/requirement/recommendation/auditedArea werden
    // wie description/content bei den anderen Modulen mit indexiert.
    const findingStore = require('../db/findingStore')
    const findings = (findingStore.getAll?.() || []).map(f => ({
      ...f,
      description: [f.observation, f.requirement, f.recommendation, f.auditedArea].filter(Boolean).join(' '),
    }))
    await indexMany(findings, 'Finding', () => '#reports')
  } catch {}

  _save()
  return results
}

/** Number of indexed documents. */
function count() { return Object.keys(_index).length }

module.exports = { indexDoc, removeDoc, search, reindexAll, count }
