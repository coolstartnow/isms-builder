// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Supplier Self-Assessment Store
'use strict'

const fs     = require('fs')
const path   = require('path')
const crypto = require('crypto')

const _BASE = process.env.DATA_DIR || path.join(__dirname, '../../data')
const FILE  = path.join(_BASE, 'assessments.json')

function nowISO() { return new Date().toISOString() }
function makeId()    { return `ass_${crypto.randomBytes(4).toString('hex')}` }
function makeToken() { return crypto.randomBytes(24).toString('hex') }

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { return [] }
}
function save(list) {
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2))
}

// ── Standard-Fragebogen (ISO 27001-orientiert) — 4 Sprachen ──────────────────
const QUESTIONS_BY_LANG = {
  de: [
    {
      section: 'Informationssicherheitsrichtlinien',
      questions: [
        { id: 'q_pol_1',  text: 'Verfügt Ihr Unternehmen über eine dokumentierte Informationssicherheitsrichtlinie?', type: 'yesno' },
        { id: 'q_pol_2',  text: 'Wird die Richtlinie regelmäßig (mindestens jährlich) überprüft?', type: 'yesno' },
        { id: 'q_pol_3',  text: 'Ist ein Informationssicherheitsbeauftragter (CISO/ISB) benannt?', type: 'yesno' },
      ]
    },
    {
      section: 'Zugangskontrolle',
      questions: [
        { id: 'q_acc_1',  text: 'Werden Zugriffsrechte nach dem Prinzip der minimalen Rechtevergabe (Least Privilege) vergeben?', type: 'yesno' },
        { id: 'q_acc_2',  text: 'Ist eine Zwei-Faktor-Authentifizierung für privilegierte Zugänge implementiert?', type: 'yesno' },
        { id: 'q_acc_3',  text: 'Werden Zugriffsrechte bei Mitarbeiterwechsel oder -austritt zeitnah entzogen?', type: 'yesno' },
      ]
    },
    {
      section: 'Datenschutz & DSGVO',
      questions: [
        { id: 'q_gdpr_1', text: 'Ist ein Datenschutzbeauftragter (DSB) benannt?', type: 'yesno' },
        { id: 'q_gdpr_2', text: 'Wurde ein Auftragsverarbeitungsvertrag (AVV) abgeschlossen oder sind Sie bereit diesen abzuschließen?', type: 'yesno' },
        { id: 'q_gdpr_3', text: 'In welchen Ländern werden Daten verarbeitet oder gespeichert?', type: 'text' },
      ]
    },
    {
      section: 'Vorfallmanagement',
      questions: [
        { id: 'q_inc_1',  text: 'Verfügt Ihr Unternehmen über einen dokumentierten Incident-Response-Prozess?', type: 'yesno' },
        { id: 'q_inc_2',  text: 'Können Sie Sicherheitsvorfälle innerhalb von 72 Stunden melden?', type: 'yesno' },
        { id: 'q_inc_3',  text: 'Gab es in den letzten 12 Monaten meldepflichtige Datenschutzvorfälle?', type: 'yesno' },
      ]
    },
    {
      section: 'Business Continuity',
      questions: [
        { id: 'q_bcm_1',  text: 'Existiert ein Business-Continuity-Plan (BCP)?', type: 'yesno' },
        { id: 'q_bcm_2',  text: 'Werden regelmäßige Datensicherungen durchgeführt und auf Wiederherstellbarkeit getestet?', type: 'yesno' },
        { id: 'q_bcm_3',  text: 'Wie hoch ist die maximale tolerierbare Ausfallzeit (RTO) Ihrer Kernsysteme?', type: 'text' },
      ]
    },
    {
      section: 'Zertifizierungen & Audits',
      questions: [
        { id: 'q_cert_1', text: 'Besitzt Ihr Unternehmen eine ISO 27001-Zertifizierung?', type: 'yesno' },
        { id: 'q_cert_2', text: 'Wurden externe Sicherheitsaudits oder Penetrationstests durchgeführt? (letztes Jahr)', type: 'yesno' },
        { id: 'q_cert_3', text: 'Weitere relevante Zertifizierungen (ISO 9001, SOC 2, TISAX, BSI etc.):', type: 'text' },
      ]
    },
    {
      section: 'Allgemeine Anmerkungen',
      questions: [
        { id: 'q_note_1', text: 'Haben Sie weitere relevante Informationen zur Informationssicherheit in Ihrem Unternehmen?', type: 'textarea' },
      ]
    },
  ],

  en: [
    {
      section: 'Information Security Policies',
      questions: [
        { id: 'q_pol_1',  text: 'Does your organisation have a documented information security policy?', type: 'yesno' },
        { id: 'q_pol_2',  text: 'Is the policy reviewed regularly (at least annually)?', type: 'yesno' },
        { id: 'q_pol_3',  text: 'Is an Information Security Officer (CISO/ISO) designated?', type: 'yesno' },
      ]
    },
    {
      section: 'Access Control',
      questions: [
        { id: 'q_acc_1',  text: 'Are access rights granted according to the principle of least privilege?', type: 'yesno' },
        { id: 'q_acc_2',  text: 'Is two-factor authentication implemented for privileged access?', type: 'yesno' },
        { id: 'q_acc_3',  text: 'Are access rights revoked promptly upon employee changes or departures?', type: 'yesno' },
      ]
    },
    {
      section: 'Data Protection & GDPR',
      questions: [
        { id: 'q_gdpr_1', text: 'Is a Data Protection Officer (DPO) designated?', type: 'yesno' },
        { id: 'q_gdpr_2', text: 'Has a Data Processing Agreement (DPA) been concluded, or are you willing to conclude one?', type: 'yesno' },
        { id: 'q_gdpr_3', text: 'In which countries is data processed or stored?', type: 'text' },
      ]
    },
    {
      section: 'Incident Management',
      questions: [
        { id: 'q_inc_1',  text: 'Does your organisation have a documented incident response process?', type: 'yesno' },
        { id: 'q_inc_2',  text: 'Can you report security incidents within 72 hours?', type: 'yesno' },
        { id: 'q_inc_3',  text: 'Were there any reportable data protection incidents in the last 12 months?', type: 'yesno' },
      ]
    },
    {
      section: 'Business Continuity',
      questions: [
        { id: 'q_bcm_1',  text: 'Does a Business Continuity Plan (BCP) exist?', type: 'yesno' },
        { id: 'q_bcm_2',  text: 'Are regular data backups performed and tested for recoverability?', type: 'yesno' },
        { id: 'q_bcm_3',  text: 'What is the maximum tolerable downtime (RTO) for your core systems?', type: 'text' },
      ]
    },
    {
      section: 'Certifications & Audits',
      questions: [
        { id: 'q_cert_1', text: 'Does your organisation hold ISO 27001 certification?', type: 'yesno' },
        { id: 'q_cert_2', text: 'Have external security audits or penetration tests been conducted? (last year)', type: 'yesno' },
        { id: 'q_cert_3', text: 'Other relevant certifications (ISO 9001, SOC 2, TISAX, BSI etc.):', type: 'text' },
      ]
    },
    {
      section: 'General Remarks',
      questions: [
        { id: 'q_note_1', text: 'Do you have any further relevant information about information security in your organisation?', type: 'textarea' },
      ]
    },
  ],

  fr: [
    {
      section: 'Politiques de sécurité de l\'information',
      questions: [
        { id: 'q_pol_1',  text: 'Votre organisation dispose-t-elle d\'une politique de sécurité de l\'information documentée?', type: 'yesno' },
        { id: 'q_pol_2',  text: 'La politique est-elle révisée régulièrement (au moins annuellement)?', type: 'yesno' },
        { id: 'q_pol_3',  text: 'Un responsable de la sécurité de l\'information (RSSI/CISO) est-il désigné?', type: 'yesno' },
      ]
    },
    {
      section: 'Contrôle d\'accès',
      questions: [
        { id: 'q_acc_1',  text: 'Les droits d\'accès sont-ils attribués selon le principe du moindre privilège?', type: 'yesno' },
        { id: 'q_acc_2',  text: 'L\'authentification à deux facteurs est-elle mise en place pour les accès privilégiés?', type: 'yesno' },
        { id: 'q_acc_3',  text: 'Les droits d\'accès sont-ils révoqués rapidement lors des changements ou départs de collaborateurs?', type: 'yesno' },
      ]
    },
    {
      section: 'Protection des données & RGPD',
      questions: [
        { id: 'q_gdpr_1', text: 'Un délégué à la protection des données (DPD/DPO) est-il désigné?', type: 'yesno' },
        { id: 'q_gdpr_2', text: 'Un accord de traitement des données (DPA) a-t-il été conclu, ou êtes-vous prêt à en conclure un?', type: 'yesno' },
        { id: 'q_gdpr_3', text: 'Dans quels pays les données sont-elles traitées ou stockées?', type: 'text' },
      ]
    },
    {
      section: 'Gestion des incidents',
      questions: [
        { id: 'q_inc_1',  text: 'Votre organisation dispose-t-elle d\'un processus de réponse aux incidents documenté?', type: 'yesno' },
        { id: 'q_inc_2',  text: 'Pouvez-vous signaler des incidents de sécurité dans les 72 heures?', type: 'yesno' },
        { id: 'q_inc_3',  text: 'Y a-t-il eu des incidents de protection des données déclarables au cours des 12 derniers mois?', type: 'yesno' },
      ]
    },
    {
      section: 'Continuité d\'activité',
      questions: [
        { id: 'q_bcm_1',  text: 'Un plan de continuité d\'activité (PCA/BCP) existe-t-il?', type: 'yesno' },
        { id: 'q_bcm_2',  text: 'Des sauvegardes régulières sont-elles effectuées et testées pour la restauration?', type: 'yesno' },
        { id: 'q_bcm_3',  text: 'Quelle est la durée maximale d\'indisponibilité tolérée (RTO) de vos systèmes essentiels?', type: 'text' },
      ]
    },
    {
      section: 'Certifications & Audits',
      questions: [
        { id: 'q_cert_1', text: 'Votre organisation détient-elle la certification ISO 27001?', type: 'yesno' },
        { id: 'q_cert_2', text: 'Des audits de sécurité externes ou des tests d\'intrusion ont-ils été réalisés? (année dernière)', type: 'yesno' },
        { id: 'q_cert_3', text: 'Autres certifications pertinentes (ISO 9001, SOC 2, TISAX, BSI, etc.):', type: 'text' },
      ]
    },
    {
      section: 'Remarques générales',
      questions: [
        { id: 'q_note_1', text: 'Avez-vous d\'autres informations pertinentes concernant la sécurité de l\'information dans votre organisation?', type: 'textarea' },
      ]
    },
  ],

  nl: [
    {
      section: 'Informatiebeveiligingsbeleid',
      questions: [
        { id: 'q_pol_1',  text: 'Heeft uw organisatie een gedocumenteerd informatiebeveiligingsbeleid?', type: 'yesno' },
        { id: 'q_pol_2',  text: 'Wordt het beleid regelmatig herzien (minimaal jaarlijks)?', type: 'yesno' },
        { id: 'q_pol_3',  text: 'Is een informatiebeveiligingsfunctionaris (CISO/IBF) aangesteld?', type: 'yesno' },
      ]
    },
    {
      section: 'Toegangscontrole',
      questions: [
        { id: 'q_acc_1',  text: 'Worden toegangsrechten verleend volgens het principe van minimale rechten (least privilege)?', type: 'yesno' },
        { id: 'q_acc_2',  text: 'Is tweefactorauthenticatie geïmplementeerd voor bevoorrechte toegang?', type: 'yesno' },
        { id: 'q_acc_3',  text: 'Worden toegangsrechten tijdig ingetrokken bij personeelswisselingen of vertrek?', type: 'yesno' },
      ]
    },
    {
      section: 'Gegevensbescherming & AVG',
      questions: [
        { id: 'q_gdpr_1', text: 'Is een functionaris voor gegevensbescherming (FG/DPO) aangesteld?', type: 'yesno' },
        { id: 'q_gdpr_2', text: 'Is er een verwerkersovereenkomst (VWO/DPA) gesloten, of bent u bereid deze te sluiten?', type: 'yesno' },
        { id: 'q_gdpr_3', text: 'In welke landen worden gegevens verwerkt of opgeslagen?', type: 'text' },
      ]
    },
    {
      section: 'Incidentbeheer',
      questions: [
        { id: 'q_inc_1',  text: 'Heeft uw organisatie een gedocumenteerd incident response-proces?', type: 'yesno' },
        { id: 'q_inc_2',  text: 'Kunt u beveiligingsincidenten binnen 72 uur melden?', type: 'yesno' },
        { id: 'q_inc_3',  text: 'Waren er de afgelopen 12 maanden meldingsplichtige datalekken?', type: 'yesno' },
      ]
    },
    {
      section: 'Bedrijfscontinuïteit',
      questions: [
        { id: 'q_bcm_1',  text: 'Bestaat er een bedrijfscontinuïteitsplan (BCP)?', type: 'yesno' },
        { id: 'q_bcm_2',  text: 'Worden regelmatig gegevensback-ups gemaakt en getest op herstelbaarheid?', type: 'yesno' },
        { id: 'q_bcm_3',  text: 'Wat is de maximale tolereerbare uitvaltijd (RTO) van uw kernsystemen?', type: 'text' },
      ]
    },
    {
      section: 'Certificeringen & Audits',
      questions: [
        { id: 'q_cert_1', text: 'Is uw organisatie ISO 27001-gecertificeerd?', type: 'yesno' },
        { id: 'q_cert_2', text: 'Zijn er externe beveiligingsaudits of penetratietests uitgevoerd? (afgelopen jaar)', type: 'yesno' },
        { id: 'q_cert_3', text: 'Andere relevante certificeringen (ISO 9001, SOC 2, TISAX, BSI, etc.):', type: 'text' },
      ]
    },
    {
      section: 'Algemene opmerkingen',
      questions: [
        { id: 'q_note_1', text: 'Heeft u aanvullende relevante informatie over informatiebeveiliging in uw organisatie?', type: 'textarea' },
      ]
    },
  ],

  hu: [
    {
      section: 'Információbiztonsági szabályzatok',
      questions: [
        { id: 'q_pol_1',  text: 'Rendelkezik szervezete dokumentált információbiztonsági szabályzattal?', type: 'yesno' },
        { id: 'q_pol_2',  text: 'A szabályzatot rendszeresen (legalább évente) felülvizsgálják?', type: 'yesno' },
        { id: 'q_pol_3',  text: 'Ki van jelölve Információbiztonsági Vezető (CISO/ISB)?', type: 'yesno' },
      ]
    },
    {
      section: 'Hozzáférés-szabályozás',
      questions: [
        { id: 'q_acc_1',  text: 'A hozzáférési jogosultságokat a minimális jogosultság elvének megfelelően adják meg?', type: 'yesno' },
        { id: 'q_acc_2',  text: 'Kétfaktoros hitelesítés (2FA) alkalmazott a kiemelt jogosultságú hozzáférésekhez?', type: 'yesno' },
        { id: 'q_acc_3',  text: 'A hozzáférési jogosultságokat munkaviszony-változás vagy -megszűnés esetén haladéktalanul visszavonják?', type: 'yesno' },
      ]
    },
    {
      section: 'Adatvédelem és GDPR',
      questions: [
        { id: 'q_gdpr_1', text: 'Ki van jelölve Adatvédelmi Tisztviselő (DPO)?', type: 'yesno' },
        { id: 'q_gdpr_2', text: 'Kötöttek adatfeldolgozói megállapodást (DPA), vagy készek arra?', type: 'yesno' },
        { id: 'q_gdpr_3', text: 'Mely országokban kerül sor adatkezelésre vagy adattárolásra?', type: 'text' },
      ]
    },
    {
      section: 'Eseménykezelés',
      questions: [
        { id: 'q_inc_1',  text: 'Rendelkezik szervezete dokumentált eseménykezelési (incident response) folyamattal?', type: 'yesno' },
        { id: 'q_inc_2',  text: 'Képesek biztonsági eseményeket 72 órán belül bejelenteni?', type: 'yesno' },
        { id: 'q_inc_3',  text: 'Az elmúlt 12 hónapban volt-e bejelentési kötelezettséget keletkeztető adatvédelmi incidens?', type: 'yesno' },
      ]
    },
    {
      section: 'Üzletmenet-folytonosság',
      questions: [
        { id: 'q_bcm_1',  text: 'Létezik üzletmenet-folytonossági terv (BCP)?', type: 'yesno' },
        { id: 'q_bcm_2',  text: 'Rendszeresen készítenek biztonsági mentést, és tesztelik annak visszaállíthatóságát?', type: 'yesno' },
        { id: 'q_bcm_3',  text: 'Mekkora az alaprendszerek maximálisan tolerálható leállási ideje (RTO)?', type: 'text' },
      ]
    },
    {
      section: 'Tanúsítványok és auditok',
      questions: [
        { id: 'q_cert_1', text: 'Rendelkezik szervezete ISO 27001 tanúsítvánnyal?', type: 'yesno' },
        { id: 'q_cert_2', text: 'Végeztek külső biztonsági auditot vagy penetrációs tesztet? (elmúlt év)', type: 'yesno' },
        { id: 'q_cert_3', text: 'Egyéb releváns tanúsítványok (ISO 9001, SOC 2, TISAX, BSI stb.):', type: 'text' },
      ]
    },
    {
      section: 'Általános megjegyzések',
      questions: [
        { id: 'q_note_1', text: 'Kíván-e egyéb, az információbiztonságra vonatkozó releváns információt megosztani?', type: 'textarea' },
      ]
    },
  ],
}

const SUPPORTED_LANGS  = ['de', 'en', 'fr', 'nl', 'hu']
const DEFAULT_QUESTIONS = QUESTIONS_BY_LANG.de  // Rückwärtskompatibilität

// ── CRUD ──────────────────────────────────────────────────────────────────────

function getAll({ supplierId } = {}) {
  let list = load().filter(i => !i.deletedAt)
  if (supplierId) list = list.filter(i => i.supplierId === supplierId)
  return list
}

function getById(id) {
  return load().find(i => i.id === id && !i.deletedAt) || null
}

function getByToken(token) {
  return load().find(i => i.token === token && !i.deletedAt) || null
}

function create(fields, { createdBy } = {}) {
  const list = load()
  const lang = SUPPORTED_LANGS.includes(fields.language) ? fields.language : 'de'
  const item = {
    id:          makeId(),
    token:       makeToken(),
    supplierId:  fields.supplierId  || '',
    supplierName: fields.supplierName || '',
    title:       fields.title       || 'Lieferanten-Selbstauskunft',
    language:    lang,
    questions:   fields.questions   || QUESTIONS_BY_LANG[lang],
    status:      'pending',          // pending | submitted | reviewed
    dueDate:     fields.dueDate     || '',
    note:        fields.note        || '',
    answers:     [],
    score:       null,
    reviewNote:  '',
    submittedAt: null,
    reviewedAt:  null,
    reviewedBy:  null,
    createdAt:   nowISO(),
    updatedAt:   nowISO(),
    createdBy:   createdBy || 'system',
    deletedAt:   null,
  }
  list.push(item)
  save(list)
  return item
}

function submitAnswers(token, answers) {
  const list = load()
  const idx  = list.findIndex(i => i.token === token && !i.deletedAt)
  if (idx < 0) return null

  // Scoring: Anzahl "ja"-Antworten / Anzahl yesno-Fragen
  const yesnoQs = list[idx].questions
    .flatMap(s => s.questions)
    .filter(q => q.type === 'yesno')
  const yesCount = yesnoQs.filter(q => {
    const ans = answers.find(a => a.id === q.id)
    return ans && ans.value === 'yes'
  }).length
  const score = yesnoQs.length > 0
    ? Math.round((yesCount / yesnoQs.length) * 100)
    : null

  list[idx].answers     = answers
  list[idx].score       = score
  list[idx].status      = 'submitted'
  list[idx].submittedAt = nowISO()
  list[idx].updatedAt   = nowISO()
  save(list)
  return list[idx]
}

function review(id, { reviewNote, status, reviewedBy } = {}) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id && !i.deletedAt)
  if (idx < 0) return null
  list[idx].status     = status || 'reviewed'
  list[idx].reviewNote = reviewNote || ''
  list[idx].reviewedAt = nowISO()
  list[idx].reviewedBy = reviewedBy || ''
  list[idx].updatedAt  = nowISO()
  save(list)
  return list[idx]
}

function remove(id, { deletedBy } = {}) {
  const list = load()
  const idx  = list.findIndex(i => i.id === id && !i.deletedAt)
  if (idx < 0) return false
  list[idx].deletedAt = nowISO()
  if (deletedBy) list[idx].deletedBy = deletedBy
  save(list)
  return true
}

function getDefaultQuestions(lang) {
  const l = SUPPORTED_LANGS.includes(lang) ? lang : 'de'
  return QUESTIONS_BY_LANG[l]
}

module.exports = {
  getAll, getById, getByToken,
  create, submitAnswers, review, remove,
  getDefaultQuestions, SUPPORTED_LANGS,
}
