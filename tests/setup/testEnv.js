'use strict'
/**
 * testEnv.js – Erstellt ein isoliertes temporäres Datenverzeichnis für Tests.
 * Jede Testdatei ruft createTestDataDir() in beforeAll auf und
 * removeTestDataDir() in afterAll.
 */
const os   = require('os')
const fs   = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')

const ROUNDS = 1 // 1 bcrypt-Runde für Testgeschwindigkeit

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

function createTestDataDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isms-test-'))

  // Unterverzeichnisse
  fs.mkdirSync(path.join(dir, 'gdpr', 'files'),        { recursive: true })
  fs.mkdirSync(path.join(dir, 'guidance', 'files'),    { recursive: true })
  fs.mkdirSync(path.join(dir, 'template-files'),       { recursive: true })
  fs.mkdirSync(path.join(dir, 'legal', 'files'),       { recursive: true })

  // Testnutzer mit bcrypt-Hashes (1 Runde = schnell)
  const users = {
    admin:        { username: 'admin',        email: 'admin@test.local',   domain: 'Global', role: 'admin',        passwordHash: bcrypt.hashSync('adminpass',  ROUNDS), totpSecret: '', sections: [] },
    editor:       { username: 'editor',       email: 'editor@test.local',  domain: 'IT',     role: 'editor',       passwordHash: bcrypt.hashSync('editorpass', ROUNDS), totpSecret: '', sections: [] },
    reader:       { username: 'reader',       email: 'reader@test.local',  domain: 'HR',     role: 'reader',       passwordHash: bcrypt.hashSync('readerpass', ROUNDS), totpSecret: '', sections: [] },
    auditor:      { username: 'auditor',      email: 'aud@test.local',     domain: 'Audit',  role: 'auditor',      passwordHash: bcrypt.hashSync('auditorpass',ROUNDS), totpSecret: '', sections: [] },
    contentowner: { username: 'contentowner', email: 'co@test.local',      domain: 'Legal',  role: 'contentowner', passwordHash: bcrypt.hashSync('copass',     ROUNDS), totpSecret: '', sections: [] },
  }
  writeJson(path.join(dir, 'rbac_users.json'), users)

  // Leere Kollektionen
  writeJson(path.join(dir, 'templates.json'),        [])
  writeJson(path.join(dir, 'soa.json'),              [])
  writeJson(path.join(dir, 'risks.json'),            [])
  writeJson(path.join(dir, 'crossmap.json'),         [])
  writeJson(path.join(dir, 'guidance.json'),         [])
  writeJson(path.join(dir, 'training.json'),         [])
  writeJson(path.join(dir, 'goals.json'),            [])
  writeJson(path.join(dir, 'assets.json'),           [])
  writeJson(path.join(dir, 'audit-log.json'),        [])
  writeJson(path.join(dir, 'public-incidents.json'), [])
  writeJson(path.join(dir, 'custom-lists.json'),     {})
  writeJson(path.join(dir, 'governance.json'),       { reviews: [], actions: [], meetings: [] })
  writeJson(path.join(dir, 'findings.json'),         [])
  writeJson(path.join(dir, 'bcm.json'),              { bia: [], plans: [], exercises: [] })
  writeJson(path.join(dir, 'org-settings.json'),     { companyName: 'Test GmbH', ciso: 'Test CISO', gdpo: 'Test GDPO' })

  // Konzernstruktur
  writeJson(path.join(dir, 'entities.json'), [
    { id: 'holding-1', name: 'Test Holding AG', shortName: 'TH', type: 'holding', parentId: null, sortOrder: 0 }
  ])

  // GDPR-Dateien
  const gdprDir = path.join(dir, 'gdpr')
  for (const name of ['vvt', 'av', 'dsfa', 'incidents', 'dsar', 'toms', 'deletion-log']) {
    writeJson(path.join(gdprDir, `${name}.json`), [])
  }
  writeJson(path.join(gdprDir, 'dsb.json'), {})

  // Legal-Dateien
  const legalDir = path.join(dir, 'legal')
  for (const name of ['contracts', 'ndas', 'policies']) {
    writeJson(path.join(legalDir, `${name}.json`), [])
  }

  return dir
}

function removeTestDataDir(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

module.exports = { createTestDataDir, removeTestDataDir }
