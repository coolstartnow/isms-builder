'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Dieselbe Testgruppe gegen SQLite (self-contained). Für MariaDB/PostgreSQL wie in dbStoresIntegration.test.js:
//   DB_STORES_TEST_BACKEND=mariadb DB_HOST=… DB_PORT=… DB_USER=… DB_PASS=… DB_NAME=… npx jest tests/measuresSql.test.js --runInBand
require('./setup/measuresSuite').runMeasuresSuite((process.env.DB_STORES_TEST_BACKEND || 'sqlite').toLowerCase())
