'use strict'

const { getDb, init: initDb } = require('../knexDatabase')

const MAX_ENTRIES = 2000

function nowISO() { return new Date().toISOString() }

module.exports = {
  init: async () => { await initDb() },

  append: async ({ user, action, resource, resourceId = '', detail = '' }) => {
    const db = getDb()
    await db('audit_log').insert({
      ts: nowISO(),
      user_email: user || 'system',
      action,
      resource: resource || null,
      resource_id: String(resourceId),
      detail: detail || null,
    })
    const clientType = db.client.config.client
    let count
    if (clientType === 'pg') {
      const row = await db.raw('SELECT CURRVAL(pg_get_serial_sequence(\'audit_log\', \'id\')) as n')
      count = row.rows?.[0]?.n || 0
    } else {
      const row = await db('audit_log').max('id as n').first()
      count = row?.n || 0
    }
    if (count > MAX_ENTRIES) {
      await db.raw('DELETE FROM audit_log WHERE id <= ?', [count - MAX_ENTRIES])
    }
  },

  query: async ({ user, action, resource, from, to, limit = 200, offset = 0 } = {}) => {
    const q = getDb()('audit_log')
    // LIKE-Platzhalter aus der Eingabe (% _) maskieren, damit „%“ nicht alle Einträge liefert; „!“ als Maskierzeichen gilt in SQLite, MySQL/MariaDB und PostgreSQL gleich
    if (user)     q.whereRaw("user_email LIKE ? ESCAPE '!'", [`%${String(user).replace(/[!%_]/g, '!$&')}%`])
    if (action)   q.where('action', action)
    if (resource) q.where('resource', resource)
    if (from)     q.where('ts', '>=', from)
    if (to)       q.where('ts', '<=', to)

    const totalQ = q.clone()
    const countResult = await totalQ.count('* as cnt').first()
    const total = countResult?.cnt || 0

    q.orderBy('ts', 'desc').offset(offset).limit(limit)
    const rows = await q
    return {
      total,
      entries: rows.map(r => ({
        id:         r.id,
        ts:         r.ts,
        user:       r.user_email,
        action:     r.action,
        resource:   r.resource,
        resourceId: r.resource_id,
        detail:     r.detail,
      })),
    }
  },

  clear: async () => {
    await getDb()('audit_log').del()
  },
}
