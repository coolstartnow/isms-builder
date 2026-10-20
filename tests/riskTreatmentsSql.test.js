'use strict'
// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
require('./setup/riskTreatmentSuite').runRiskTreatmentSuite((process.env.DB_STORES_TEST_BACKEND || 'sqlite').toLowerCase())
