// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Supplier Self-Assessment — public token-based portal (no login required)
'use strict'

const express         = require('express')
const router          = express.Router()
const assessmentStore = require('../db/assessmentStore')

// ── UI-Übersetzungen ──────────────────────────────────────────────────────────
const UI = {
  de: {
    pageTitle:       'Lieferanten-Selbstauskunft – ISMS Builder',
    heading:         s => s,
    supplier:        'Lieferant',
    due:             'Bitte ausgefüllt einreichen bis',
    alreadyDone:     at => `Dieser Fragebogen wurde bereits am ${at} eingereicht. Vielen Dank!`,
    yes:             'Ja',
    no:              'Nein',
    submitHint:      'Mit dem Absenden bestätigen Sie die Richtigkeit Ihrer Angaben.',
    submitBtn:       '&#10003;&nbsp; Fragebogen absenden',
    footer:          'Lieferanten-Selbstauskunft &mdash; vertraulich',
    thankYouTitle:   'Vielen Dank!',
    thankYouBody:    (name, at) => `Ihre Selbstauskunft für <strong>${name}</strong> wurde erfolgreich eingereicht.<br>Eingereicht am <strong>${at}</strong>.`,
    thankYouNote:    'Wir werden Ihre Antworten prüfen und uns bei Bedarf mit Ihnen in Verbindung setzen.',
    thankYouClose:   'Diese Seite kann geschlossen werden.',
    errInvalid:      'Link ungültig',
    errInvalidMsg:   'Dieser Bewertungslink ist nicht gültig oder wurde bereits gelöscht.',
    errSubmitted:    'Bereits eingereicht',
    errSubmittedMsg: 'Dieser Fragebogen wurde bereits eingereicht und kann nicht erneut ausgefüllt werden.',
    errSave:         'Fehler',
    errSaveMsg:      'Die Antworten konnten nicht gespeichert werden.',
  },
  en: {
    pageTitle:       'Supplier Self-Assessment – ISMS Builder',
    heading:         s => s,
    supplier:        'Supplier',
    due:             'Please submit by',
    alreadyDone:     at => `This questionnaire was already submitted on ${at}. Thank you!`,
    yes:             'Yes',
    no:              'No',
    submitHint:      'By submitting you confirm the accuracy of your answers.',
    submitBtn:       '&#10003;&nbsp; Submit questionnaire',
    footer:          'Supplier Self-Assessment &mdash; confidential',
    thankYouTitle:   'Thank you!',
    thankYouBody:    (name, at) => `Your self-assessment for <strong>${name}</strong> has been submitted successfully.<br>Submitted on <strong>${at}</strong>.`,
    thankYouNote:    'We will review your answers and contact you if necessary.',
    thankYouClose:   'This page can be closed.',
    errInvalid:      'Invalid link',
    errInvalidMsg:   'This assessment link is not valid or has already been deleted.',
    errSubmitted:    'Already submitted',
    errSubmittedMsg: 'This questionnaire has already been submitted and cannot be filled in again.',
    errSave:         'Error',
    errSaveMsg:      'Your answers could not be saved.',
  },
  fr: {
    pageTitle:       'Auto-évaluation fournisseur – ISMS Builder',
    heading:         s => s,
    supplier:        'Fournisseur',
    due:             'Merci de soumettre avant le',
    alreadyDone:     at => `Ce questionnaire a déjà été soumis le ${at}. Merci !`,
    yes:             'Oui',
    no:              'Non',
    submitHint:      'En soumettant, vous confirmez l\'exactitude de vos réponses.',
    submitBtn:       '&#10003;&nbsp; Soumettre le questionnaire',
    footer:          'Auto-évaluation fournisseur &mdash; confidentiel',
    thankYouTitle:   'Merci !',
    thankYouBody:    (name, at) => `Votre auto-évaluation pour <strong>${name}</strong> a été soumise avec succès.<br>Soumis le <strong>${at}</strong>.`,
    thankYouNote:    'Nous examinerons vos réponses et vous contacterons si nécessaire.',
    thankYouClose:   'Cette page peut être fermée.',
    errInvalid:      'Lien invalide',
    errInvalidMsg:   'Ce lien d\'évaluation n\'est pas valide ou a déjà été supprimé.',
    errSubmitted:    'Déjà soumis',
    errSubmittedMsg: 'Ce questionnaire a déjà été soumis et ne peut pas être rempli à nouveau.',
    errSave:         'Erreur',
    errSaveMsg:      'Vos réponses n\'ont pas pu être enregistrées.',
  },
  nl: {
    pageTitle:       'Leveranciers zelfevaluatie – ISMS Builder',
    heading:         s => s,
    supplier:        'Leverancier',
    due:             'Gelieve in te dienen voor',
    alreadyDone:     at => `Deze vragenlijst werd al ingediend op ${at}. Dank u!`,
    yes:             'Ja',
    no:              'Nee',
    submitHint:      'Door in te dienen bevestigt u de juistheid van uw antwoorden.',
    submitBtn:       '&#10003;&nbsp; Vragenlijst indienen',
    footer:          'Leveranciers zelfevaluatie &mdash; vertrouwelijk',
    thankYouTitle:   'Dank u!',
    thankYouBody:    (name, at) => `Uw zelfevaluatie voor <strong>${name}</strong> is succesvol ingediend.<br>Ingediend op <strong>${at}</strong>.`,
    thankYouNote:    'Wij zullen uw antwoorden beoordelen en contact met u opnemen indien nodig.',
    thankYouClose:   'Deze pagina kan worden gesloten.',
    errInvalid:      'Ongeldige link',
    errInvalidMsg:   'Deze beoordelingslink is niet geldig of is al verwijderd.',
    errSubmitted:    'Al ingediend',
    errSubmittedMsg: 'Deze vragenlijst is al ingediend en kan niet opnieuw worden ingevuld.',
    errSave:         'Fout',
    errSaveMsg:      'Uw antwoorden konden niet worden opgeslagen.',
  },
  hu: {
    pageTitle:       'Szállítói önértékelés – ISMS Builder',
    heading:         s => s,
    supplier:        'Szállító',
    due:             'Kérjük, adja be eddig',
    alreadyDone:     at => `Ezt a kérdőívet már beküldték: ${at}. Köszönjük!`,
    yes:             'Igen',
    no:              'Nem',
    submitHint:      'A beküldéssel megerősíti válaszai helyességét.',
    submitBtn:       '&#10003;&nbsp; Kérdőív beküldése',
    footer:          'Szállítói önértékelés &mdash; bizalmas',
    thankYouTitle:   'Köszönjük!',
    thankYouBody:    (name, at) => `A(z) <strong>${name}</strong> önértékelése sikeresen beküldésre került.<br>Beküldve: <strong>${at}</strong>.`,
    thankYouNote:    'Átnézzük a válaszait, és szükség esetén felvesszük Önnel a kapcsolatot.',
    thankYouClose:   'Ez az oldal bezárható.',
    errInvalid:      'Érvénytelen hivatkozás',
    errInvalidMsg:   'Ez az értékelési hivatkozás érvénytelen, vagy már törölték.',
    errSubmitted:    'Már beküldve',
    errSubmittedMsg: 'Ezt a kérdőívet már beküldték, és nem tölthető ki újra.',
    errSave:         'Hiba',
    errSaveMsg:      'A válaszokat nem sikerült elmenteni.',
  },
}

function ui(lang) { return UI[lang] || UI.en }

// ── GET /supplier-assessment/:token — Fragebogen anzeigen ─────────────────────
router.get('/supplier-assessment/:token', (req, res) => {
  const a = assessmentStore.getByToken(req.params.token)
  if (!a) return res.status(404).send(errorPage('Invalid link',
    'This assessment link is not valid or has already been deleted.'))

  const u = ui(a.language)
  const locale = { de: 'de-DE', en: 'en-GB', fr: 'fr-FR', nl: 'nl-NL', hu: 'hu-HU' }[a.language] || 'en-GB'

  const alreadySubmitted = a.status !== 'pending'
  const dueDateHtml = a.dueDate
    ? `<p class="due">${u.due}: <strong>${new Date(a.dueDate).toLocaleDateString(locale)}</strong></p>`
    : ''

  const submittedBanner = alreadySubmitted ? `
    <div class="submitted-banner">
      &#10003; ${u.alreadyDone(new Date(a.submittedAt).toLocaleString(locale))}
    </div>` : ''

  const formOpen  = alreadySubmitted ? '' : `<form method="POST" action="/supplier-assessment/${req.params.token}" id="assessForm">`
  const formClose = alreadySubmitted ? '' : `
    <div class="submit-section">
      <p class="submit-hint">${u.submitHint}</p>
      <button type="submit" class="btn-submit">${u.submitBtn}</button>
    </div>
    </form>`

  const sectionsHtml = a.questions.map((section, si) => {
    const questionsHtml = section.questions.map(q => {
      if (alreadySubmitted) {
        const ans = (a.answers || []).find(x => x.id === q.id)
        const val = ans ? ans.value : '—'
        const displayVal = q.type === 'yesno'
          ? (val === 'yes' ? `✓ ${u.yes}` : val === 'no' ? `✗ ${u.no}` : '—')
          : escapeHtml(val)
        return `
          <div class="question readonly">
            <label class="q-text">${escapeHtml(q.text)}</label>
            <div class="q-answer">${displayVal}</div>
          </div>`
      }

      if (q.type === 'yesno') {
        return `
          <div class="question">
            <label class="q-text">${escapeHtml(q.text)}</label>
            <div class="q-yesno">
              <label class="radio-opt">
                <input type="radio" name="${escapeHtml(q.id)}" value="yes" required />
                <span>${u.yes}</span>
              </label>
              <label class="radio-opt">
                <input type="radio" name="${escapeHtml(q.id)}" value="no" />
                <span>${u.no}</span>
              </label>
            </div>
          </div>`
      }
      if (q.type === 'textarea') {
        return `
          <div class="question">
            <label class="q-text" for="${escapeHtml(q.id)}">${escapeHtml(q.text)}</label>
            <textarea id="${escapeHtml(q.id)}" name="${escapeHtml(q.id)}" rows="4" class="q-textarea"></textarea>
          </div>`
      }
      return `
        <div class="question">
          <label class="q-text" for="${escapeHtml(q.id)}">${escapeHtml(q.text)}</label>
          <input type="text" id="${escapeHtml(q.id)}" name="${escapeHtml(q.id)}" class="q-input" />
        </div>`
    }).join('')

    return `
      <div class="section-card">
        <h3 class="section-title">${si + 1}. ${escapeHtml(section.section)}</h3>
        ${questionsHtml}
      </div>`
  }).join('')

  res.send(`<!DOCTYPE html>
<html lang="${a.language || 'de'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${u.pageTitle}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f4f5f7; color: #172b4d; margin: 0; padding: 20px 16px 60px; }
    .page { max-width: 800px; margin: 0 auto; }
    .header-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.1);
                   padding: 32px 36px 24px; margin-bottom: 20px; }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; color: #0052cc; }
    .logo svg { width: 28px; height: 28px; flex-shrink: 0; }
    .logo span { font-size: 18px; font-weight: 700; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    .meta { color: #5e6c84; font-size: 13px; margin-bottom: 4px; }
    .due { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px 14px;
           border-radius: 4px; margin-top: 14px; }
    .submitted-banner { background: #e3fcef; border: 1px solid #abf5d1; border-radius: 6px;
                        padding: 14px 18px; color: #006644; font-weight: 600; margin-top: 14px; }
    .section-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.08);
                    padding: 28px 36px; margin-bottom: 16px; }
    .section-title { font-size: 16px; font-weight: 700; color: #0052cc;
                     border-bottom: 2px solid #e8eaf0; padding-bottom: 10px; margin: 0 0 20px; }
    .question { margin-bottom: 22px; }
    .question:last-child { margin-bottom: 0; }
    .q-text { display: block; font-weight: 600; font-size: 14px; margin-bottom: 8px; line-height: 1.5; }
    .q-yesno { display: flex; gap: 16px; }
    .radio-opt { display: flex; align-items: center; gap: 8px; cursor: pointer;
                 background: #f4f5f7; border: 2px solid #dfe1e6; border-radius: 6px;
                 padding: 10px 20px; font-size: 15px; font-weight: 600; transition: all .15s; }
    .radio-opt:hover { border-color: #0052cc; background: #e8f0fc; }
    .radio-opt input[type=radio] { width: 16px; height: 16px; accent-color: #0052cc; }
    .radio-opt:has(input:checked) { border-color: #0052cc; background: #e8f0fc; color: #0052cc; }
    .q-input { width: 100%; padding: 10px 12px; border: 2px solid #dfe1e6;
               border-radius: 4px; font-size: 14px; font-family: inherit; }
    .q-input:focus { outline: none; border-color: #0052cc; }
    .q-textarea { width: 100%; padding: 10px 12px; border: 2px solid #dfe1e6;
                  border-radius: 4px; font-size: 14px; font-family: inherit; resize: vertical; }
    .q-textarea:focus { outline: none; border-color: #0052cc; }
    .question.readonly .q-text { font-weight: 600; color: #5e6c84; }
    .question.readonly .q-answer { font-size: 15px; font-weight: 700;
                                    padding: 8px 14px; background: #f8f9fa;
                                    border-radius: 4px; display: inline-block; }
    .submit-section { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.1);
                      padding: 28px 36px; margin-top: 8px; }
    .submit-hint { color: #5e6c84; font-size: 13px; margin-bottom: 16px; }
    .btn-submit { background: #0052cc; color: #fff; border: none; padding: 14px 32px;
                  border-radius: 4px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; }
    .btn-submit:hover { background: #0065ff; }
    .footer { text-align: center; color: #97a0af; font-size: 12px; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header-card">
      <div class="logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>ISMS Builder</span>
      </div>
      <h1>${escapeHtml(a.title)}</h1>
      <div class="meta">${u.supplier}: <strong>${escapeHtml(a.supplierName)}</strong></div>
      ${a.note ? `<div class="meta" style="margin-top:6px">${escapeHtml(a.note)}</div>` : ''}
      ${dueDateHtml}
      ${submittedBanner}
    </div>

    ${formOpen}
    ${sectionsHtml}
    ${formClose}

    <div class="footer">ISMS Builder &mdash; ${u.footer}</div>
  </div>
</body>
</html>`)
})

// ── POST /supplier-assessment/:token — Antworten speichern ────────────────────
router.post('/supplier-assessment/:token', express.urlencoded({ extended: true }), (req, res) => {
  const a = assessmentStore.getByToken(req.params.token)
  if (!a) return res.status(404).send(errorPage('Invalid link', 'This link is no longer valid.'))
  const u = ui(a.language)
  if (a.status !== 'pending') {
    return res.status(400).send(errorPage(u.errSubmitted, u.errSubmittedMsg))
  }

  const allQs = a.questions.flatMap(s => s.questions)
  const answers = allQs.map(q => ({
    id:    q.id,
    value: (req.body[q.id] || '').trim().slice(0, 2000),
  }))

  const updated = assessmentStore.submitAnswers(req.params.token, answers)
  if (!updated) return res.status(500).send(errorPage(u.errSave, u.errSaveMsg))

  const locale = { de: 'de-DE', en: 'en-GB', fr: 'fr-FR', nl: 'nl-NL', hu: 'hu-HU' }[a.language] || 'en-GB'

  res.send(`<!DOCTYPE html>
<html lang="${a.language || 'de'}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${u.thankYouTitle} – ISMS Builder</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f4f5f7; color: #172b4d; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.12);
            max-width: 600px; margin: 80px auto; padding: 48px; text-align: center; }
    .check { font-size: 64px; color: #00875a; margin-bottom: 20px; }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { color: #5e6c84; line-height: 1.6; }
    .footer { color: #97a0af; font-size: 12px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">&#10003;</div>
    <h1>${u.thankYouTitle}</h1>
    <p>${u.thankYouBody(escapeHtml(a.supplierName), new Date(updated.submittedAt).toLocaleString(locale))}</p>
    <p>${u.thankYouNote}</p>
    <div class="footer">ISMS Builder &mdash; ${u.thankYouClose}</div>
  </div>
</body>
</html>`)
})

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function errorPage(title, message) {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>ISMS Builder</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:60px auto;padding:20px">
<h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p>
</body></html>`
}

module.exports = router
