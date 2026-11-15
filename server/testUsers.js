"use strict";
// Temporary local user management for test env using the existing JSON store
// This module provides endpoints to create/update/delete users for testing the Admin UI.
const fs = require('fs')
const path = require('path')

const DB_ROOT = require('./paths').dataDir()
const DB_FILE = require('path').join(DB_ROOT, 'rbac_users.json')
function ensureDir() { if (!fs.existsSync(DB_ROOT)) fs.mkdirSync(DB_ROOT, { recursive: true }) }
function load() {
  ensureDir()
  if (!fs.existsSync(DB_FILE)) {
    // seed basic admin user if missing
    const seed = {
      admin: { username: 'admin', email: 'admin@example.com', domain: 'Global', role: 'admin', totpSecret: 'ADMSECRET', sections: [] }
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2))
    return seed
  }
  const raw = fs.readFileSync(DB_FILE, 'utf8')
  try { return JSON.parse(raw) } catch { return {} }
}
function save(obj) { ensureDir(); fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2)) }
let data = load()

function listUsers(req, res) {
  const arr = Object.values(data)
  res.json(arr)
}
function createUser(req, res) {
  const { username, email, domain, role, totpSecret, sections } = req.body || {}
  if (!username || !email || !domain || !role) return res.status(400).json({ error: 'Missing required fields' })
  if (data[username]) return res.status(409).json({ error: 'User exists' })
  data[username] = { username, email, domain, role, totpSecret: totpSecret || '', sections: Array.isArray(sections) ? sections : [] }
  save(data)
  res.status(201).json(data[username])
}
function updateUser(req, res) {
  const { username } = req.params
  const patch = req.body || {}
  const u = data[username]
  if (!u) return res.status(404).json({ error: 'Not found' })
  Object.assign(u, patch)
  save(data)
  res.json(u)
}
function deleteUser(req, res) {
  const { username } = req.params
  if (!data[username]) return res.status(404).json({ error: 'Not found' })
  delete data[username]
  save(data)
  res.json({ ok: true, username })
}

module.exports = { listUsers, createUser, updateUser, deleteUser }
