'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
require('./setup/enforce2faSuite').runEnforce2faSuite((process.env.DB_STORES_TEST_BACKEND || 'sqlite').toLowerCase())
