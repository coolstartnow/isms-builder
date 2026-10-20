'use strict'

const { getDb, init: initDb } = require('../knexDatabase')

const DEFAULTS = {
  orgName:    '',
  orgShort:   '',
  ismsScope:  '',
  logoText:   '',
  require2FA: false,
  aiEnabled:       true,
  aiOllamaUrl:     '',
  aiEmbedModel:    '',
  cisoName:   '',
  cisoEmail:  '',
  gdpoName:   '',
  gdpoEmail:  '',
  icsContact: '',
  cisoSettings: {
    escalationEmail:        '',
    incidentResponseSLA:    24,
    reportableThreshold:    'high',
    reportableTypes:        ['ransomware', 'data_theft', 'unauthorized_access'],
  },
  gdpoSettings: {
    dsarDeadlineDays:       30,
    dsarExtendedDays:       90,
    timer72hEnabled:        true,
    supervisoryAuthority:   '',
    supervisoryContact:     '',
    dsarDefaultResponse:    '',
  },
  modules: {
    soa: true, measures: true, guidance: true, goals: true, risk: true, legal: true,
    incident: true, gdpr: true, training: true, reports: true, calendar: true,
    assets: true, governance: true, bcm: true, suppliers: true, audits: true,
  },
  soaFrameworks: {
    ISO27001: true, BSI: true, NIS2: true, EUCS: true, EUAI: true,
    ISO9000: true, ISO9001: true, CRA: true,
  },
  icsSettings: {
    otResponsible: '', otResponsibleEmail: '', otScope: '',
    otStandard: 'iec62443', otNis2Sector: '', otKritisRelevant: false,
    otNetworkSegmentation: 'planned', otPatchCycleWeeks: 12,
    otMaintenanceWindow: '', otEmergencyContact: '',
  },
  revisionSettings: {
    revResponsible: '', revResponsibleEmail: '', revScope: '',
    revCycleMonths: 12, revLastAuditDate: '', revNextAuditDate: '',
    revReportsTo: 'gf', revExternalSupport: '',
  },
  smtpSettings: {
    host: '', port: 587, secure: false, user: '', pass: '', from: '',
  },
  webdavSettings: {
    enabled: false, baseUrl: '', username: '', appPassword: '', folder: 'ISMS-Richtlinien',
  },
  splashScreen: {
    enabled: true, duration: 7,
  },
  languageConfig: {
    available: ['de', 'en', 'fr', 'nl', 'hu'], default: 'en',
  },
  navOrder: ['dashboard','soa','measures','guidance','goals','risk','legal','incident','gdpr','training','assets','governance','nis2','audits','bcm','suppliers','policy-acks','reports','calendar','settings','admin'],
  emailNotifications: {
    enabled: false, adminEmail: '', risks: true, dsar: true,
    gdprIncidents: true, deletionLog: true, bcm: true, contracts: true,
    templateReview: true, supplierAudits: true,
  },
  policyAckMode: 'manual',
  qmSettings: {
    qmResponsible: '', qmResponsibleEmail: '', qmScope: '',
    qmStandard: 'iso9001', qmCertBody: '', qmCertValidUntil: '',
    qmLastAuditDate: '', qmNextAuditDate: '', qmRecertDate: '',
  },
}

const DEEP_KEYS = [
  'modules', 'soaFrameworks', 'cisoSettings', 'gdpoSettings', 'icsSettings',
  'revisionSettings', 'qmSettings', 'emailNotifications', 'smtpSettings', 'webdavSettings',
]

function _deepMerge(current, patch) {
  const result = { ...current, ...patch }
  for (const key of DEEP_KEYS) {
    result[key] = { ...(current[key] || {}), ...(patch[key] || {}) }
  }
  if (Array.isArray(patch.navOrder)) result.navOrder = patch.navOrder
  if (patch.languageConfig) {
    result.languageConfig = {
      ...(current.languageConfig || {}),
      ...patch.languageConfig,
      available: Array.isArray(patch.languageConfig.available)
        ? patch.languageConfig.available
        : (current.languageConfig?.available || DEFAULTS.languageConfig.available),
    }
  }
  return result
}

function _json(val, fallback) {
  if (!val) return fallback
  try { return JSON.parse(val) } catch { return fallback }
}

function _defaultsDeep() {
  const d = { ...DEFAULTS }
  for (const key of DEEP_KEYS) d[key] = { ...DEFAULTS[key] }
  d.navOrder = DEFAULTS.navOrder.slice()
  d.languageConfig = { ...DEFAULTS.languageConfig, available: [...DEFAULTS.languageConfig.available] }
  return d
}

module.exports = {
  init: async () => { await initDb() },

  get: async () => {
    const rows = await getDb()('org_settings')
    const stored = {}
    for (const row of rows) {
      stored[row.key_name] = _json(row.value, null)
    }
    return _deepMerge(_defaultsDeep(), stored)
  },

  update: async (patch) => {
    const db = getDb()
    const flatPatch = { ...patch }
    const nestedToStore = {}
    for (const key of DEEP_KEYS) {
      if (flatPatch[key] !== undefined) {
        nestedToStore[key] = flatPatch[key]
        delete flatPatch[key]
      }
    }
    if (flatPatch.languageConfig) {
      nestedToStore.languageConfig = flatPatch.languageConfig
      delete flatPatch.languageConfig
    }
    if (flatPatch.navOrder) {
      nestedToStore.navOrder = flatPatch.navOrder
      delete flatPatch.navOrder
    }
    for (const [key, value] of Object.entries(flatPatch)) {
      await db('org_settings')
        .insert({ key_name: key, value: JSON.stringify(value) })
        .onConflict('key_name').merge()
    }
    for (const [key, value] of Object.entries(nestedToStore)) {
      await db('org_settings')
        .insert({ key_name: key, value: JSON.stringify(value) })
        .onConflict('key_name').merge()
    }
    return module.exports.get()
  },

  DEFAULTS,
}
