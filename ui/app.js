// ISMS Builder V 1.29 – Single Page Application
// © 2026 Claude Hecker — AGPL-3.0

let TYPES = ['Policy','Procedure','Risk Policy','SoA','Incident','Release']
const ADMIN_SECTIONS = ['Guidance','Risk','Admin','Legal','Incident','Privacy','Training','Reports','Settings']
let currentType = 'Policy'
let currentTemplate = null
let currentSection = 'dashboard'
const ROLE_RANK = { reader:1, revision:1, editor:2, dept_head:2, qmb:2, contentowner:3, auditor:3, admin:4 }

// Modul-Konfiguration (wird beim Start vom Server geladen)
let MODULE_CONFIG = {
  soa:true, guidance:true, goals:true, risk:true, legal:true,
  incident:true, gdpr:true, training:true, reports:true, calendar:true, assets:true,
  governance:true, bcm:true, suppliers:true,
}
let SOA_FW_CONFIG = {
  ISO27001:true, BSI:true, NIS2:true, EUCS:true, EUAI:true,
  ISO9000:true, ISO9001:true, CRA:true,
}

// Drag & Drop state for Template Tree
let _dragId = null, _dragType = null

// ── Section metadata (label + Phosphor icon) ──
// functions[] = Organisationsfunktionen, die diesen Menüpunkt zusätzlich freischalten
// Sichtbarkeitsregel: rank >= minRole ODER eine Funktion des Users liegt in functions[]
const SECTION_META = [
  // ── Immer sichtbar (reader+) ─────────────────────────────────────────────
  { id:'dashboard',  labelKey:'nav_dashboard',  label:'Dashboard',          icon:'ph-chart-bar',           minRole:'reader' },
  { id:'soa',        labelKey:'nav_soa',        label:'SoA – Controls',     icon:'ph-shield-check',        minRole:'reader' },
  { id:'guidance',   labelKey:'nav_guidance',   label:'Guidance',           icon:'ph-compass',             minRole:'reader' },
  { id:'training',   labelKey:'nav_training',   label:'Training',           icon:'ph-graduation-cap',      minRole:'reader' },
  { id:'calendar',   labelKey:'nav_calendar',   label:'Calendar',           icon:'ph-calendar-dots',       minRole:'reader' },
  // ── Ab Abteilungsleiter (rank 2) oder Funktion ───────────────────────────
  { id:'risk',       labelKey:'nav_risk',       label:'Risk & Compliance',  icon:'ph-warning',             minRole:'editor',       functions:['ciso','revision','qmb'] },
  { id:'assets',     labelKey:'nav_assets',     label:'Asset Management',   icon:'ph-buildings',           minRole:'editor',       functions:['ciso','revision'] },
  // ── Ab Contentowner (rank 3) oder Funktion ──────────────────────────────
  { id:'goals',      labelKey:'nav_goals',      label:'Security Goals',     icon:'ph-target',              minRole:'contentowner', functions:['ciso','dso','revision','qmb'] },
  { id:'gdpr',       labelKey:'nav_gdpr',       label:'GDPR & Privacy',     icon:'ph-lock-key',            minRole:'contentowner', functions:['dso','revision'] },
  { id:'legal',      labelKey:'nav_legal',      label:'Legal & Privacy',    icon:'ph-scales',              minRole:'contentowner', functions:['ciso','dso'] },
  { id:'incident',   labelKey:'nav_incident',   label:'Incident Inbox',     icon:'ph-siren',               minRole:'contentowner', functions:['ciso'] },
  { id:'suppliers',  labelKey:'nav_suppliers',  label:'Supply Chain',       icon:'ph-truck',               minRole:'contentowner', functions:['ciso','revision'] },
  { id:'bcm',        labelKey:'nav_bcm',        label:'Business Continuity',icon:'ph-heartbeat',           minRole:'contentowner', functions:['ciso','revision'] },
  { id:'governance', labelKey:'nav_governance', label:'Governance',         icon:'ph-chalkboard-teacher',  minRole:'contentowner', functions:['ciso','dso','revision','qmb'] },
  { id:'nis2',       labelKey:'nav_nis2',       label:'NIS2',               icon:'ph-shield-star',         minRole:'contentowner', functions:['ciso','revision'] },
  { id:'policy-acks', labelKey:'nav_policyAcks', label:'Policy Acknowledgements', icon:'ph-check-circle', minRole:'contentowner', functions:['ciso','revision','qmb'] },
  { id:'reports',    labelKey:'nav_reports',    label:'Reports',            icon:'ph-chart-line',          minRole:'contentowner', functions:['ciso','dso','revision','qmb'] },
  { id:'settings',   labelKey:'nav_settings',   label:'Settings',           icon:'ph-gear',                minRole:'contentowner', functions:['ciso','dso','revision','qmb'] },
  // ── Nur Admin ────────────────────────────────────────────────────────────
  { id:'admin',      labelKey:'nav_admin',      label:'Admin',              icon:'ph-wrench',              minRole:'admin' },
]

// ── Template-Typ-Icons ──
const TYPE_ICONS = {
  Policy:    'ph-file-text',
  Procedure: 'ph-list-checks',
  Risk:      'ph-warning-circle',
  SoA:       'ph-shield-check',
  Incident:  'ph-fire-simple',
  Release:   'ph-rocket-launch',
  // KI-Suchtypen
  'Risk Policy':     'ph-warning',
  'Security Goal':   'ph-flag',
  'Document':        'ph-file-text',
  'System Manual':   'ph-book-open',
  'Training':        'ph-graduation-cap',
  'Asset':           'ph-desktop',
  'Supplier':        'ph-truck',
  'BCM-BIA':         'ph-heartbeat',
  'BCM-Plan':        'ph-clipboard-text',
}

// Lifecycle-Konfiguration (muss mit Server übereinstimmen)
// labelKey → t() für Übersetzung; label → Fallback
const LIFECYCLE_TRANSITIONS = {
  draft:    [{ to: 'review',    labelKey: 'lc_toReview',     label: '→ Submit for Review', cls: 'forward',  minRole: 'editor' }],
  review:   [{ to: 'approved',  labelKey: 'lc_toApproved',   label: '→ Approve',           cls: 'approve',  minRole: 'contentowner' },
             { to: 'draft',     labelKey: 'lc_backToDraft',   label: '← Back to Draft',    cls: 'back',     minRole: 'editor' }],
  approved: [{ to: 'review',    labelKey: 'lc_backToReview',  label: '← Back to Review',  cls: 'back',    minRole: 'contentowner' },
             { to: 'archived',  labelKey: 'lc_archive',       label: '→ Archive',          cls: 'archive',  minRole: 'contentowner' }],
  archived: [{ to: 'draft',     labelKey: 'lc_toDraft',       label: '← Reactivate',      cls: 'restore',  minRole: 'admin' }]
}

function getCurrentRole() {
  return (localStorage.getItem('isms_current_role') || 'reader').toLowerCase()
}
function getCurrentUser() {
  return localStorage.getItem('isms_current_user') || 'user'
}
function getCurrentFunctions() {
  try { return JSON.parse(localStorage.getItem('isms_current_functions') || '[]') } catch { return [] }
}
function hasFunction(fn) {
  return getCurrentFunctions().includes(fn)
}
function userCanTransition(minRole) {
  return (ROLE_RANK[getCurrentRole()] || 0) >= (ROLE_RANK[minRole] || 0)
}

// ── Language switcher ────────────────────────────────────────────────────────
function switchAppLang(lang) {
  if (typeof setLang === 'function') setLang(lang)
  const msg = document.getElementById('langSaveMsg')
  if (msg) {
    msg.style.display = 'inline'
    msg.textContent = t('settings_langSaved')
  }
  // Seed-language sync happens server-side on the next GET /guidance?lang=xx call.
  // No separate PUT needed here.
  setTimeout(() => location.reload(), 800)
}

function apiHeaders(role) {
  return {
    'Content-Type': 'application/json',
    'X-User-Name': getCurrentUser(),
    'X-User-Role': role || getCurrentRole()
  }
}

function updateStatusBadge(status) {
  const badge = dom('statusBadge')
  if (!badge) return
  badge.textContent = status || 'draft'
  badge.className = `badge status-badge status-${status || 'draft'}`
}

function renderLifecycleActions(template) {
  const bar = dom('lifecycleActions')
  if (!bar) return
  if (!template) { bar.style.display = 'none'; return }

  const status = template.status || 'draft'
  const transitions = LIFECYCLE_TRANSITIONS[status] || []
  const available = transitions.filter(tr => userCanTransition(tr.minRole))

  if (available.length === 0) { bar.style.display = 'none'; return }

  bar.style.display = 'flex'
  bar.innerHTML = `<span class="action-label">${t('common_action')}:</span>`
  available.forEach(tr => {
    const btn = document.createElement('button')
    btn.className = `btn-lifecycle ${tr.cls}`
    btn.textContent = tr.labelKey ? t(tr.labelKey) : tr.label
    btn.onclick = () => applyStatusTransition(template, tr.to)
    bar.appendChild(btn)
  })
}

async function applyStatusTransition(template, newStatus) {
  const res = await fetch(`/template/${template.type}/${template.id}/status`, {
    method: 'PATCH',
    headers: apiHeaders(),
    body: JSON.stringify({ status: newStatus })
  })
  const data = await res.json()
  if (!res.ok) {
    const errEl = document.getElementById('error-msg')
    if (errEl) { errEl.textContent = data.error || 'Error'; errEl.style.display = 'block' }
    else alert(data.error || 'Error')
    return
  }
  currentTemplate = data
  updateStatusBadge(data.status)
  dom('ownerInfo').textContent = data.owner ? `Owner: ${data.owner}` : ''
  renderLifecycleActions(data)
  renderWebdavPublishBar(data)
  // Liste aktualisieren
  selectType(currentType, true)
}

// ── WebDAV-Publish-Status im Template-Editor (#66) ────────────────────────────
// Wird nur fuer freigegebene Templates gezeigt: nur dort ist ein Publish
// ueberhaupt relevant. Der Re-Sync-Button ruft den Server-Endpoint auf, der
// wiederum nie wirft — bei fehlender/deaktivierter Konfiguration kommt eine
// verstaendliche Fehlermeldung zurueck statt eines kaputten UI-Zustands.
function renderWebdavPublishBar(tmpl) {
  const bar = dom('webdavPublishBar')
  if (!bar) return
  if (!tmpl || tmpl.status !== 'approved' || !templateCanEdit()) { bar.style.display = 'none'; return }

  const pub = tmpl.webdavPublish || null
  let statusHtml
  if (!pub) {
    statusHtml = `<span class="tmpl-review-hint">${t('tmpl_webdavNeverPublished')}</span>`
  } else if (pub.ok) {
    const when = pub.publishedAt ? new Date(pub.publishedAt).toLocaleString('de-DE') : ''
    const linkHtml = pub.shareLink
      ? ` <a href="${escHtml(pub.shareLink)}" target="_blank" rel="noopener noreferrer">${t('tmpl_webdavOpenLink')}</a>`
      : ''
    statusHtml = `<span class="tmpl-review-hint" style="color:var(--success,#4ade80)"><i class="ph ph-check-circle"></i> ${t('tmpl_webdavPublished')} ${when}</span>${linkHtml}`
  } else {
    statusHtml = `<span class="tmpl-review-hint" style="color:var(--danger-text,#f87171)"><i class="ph ph-warning-circle"></i> ${t('tmpl_webdavError')}: ${escHtml(pub.error || '')}</span>`
  }

  bar.style.display = 'flex'
  bar.innerHTML = `
    <i class="ph ph-cloud-arrow-up"></i>
    <span class="tmpl-review-label">${t('tmpl_webdavPublish')}:</span>
    ${statusHtml}
    <span class="toolbar-spacer"></span>
    <button class="btn btn-secondary btn-sm" id="btnWebdavResync" onclick="resyncWebdavPublish()">
      <i class="ph ph-arrows-clockwise"></i> ${t('tmpl_webdavResync')}
    </button>
  `
}

async function resyncWebdavPublish() {
  if (!currentTemplate) return
  const btn = dom('btnWebdavResync')
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ph ph-spinner"></i> ${t('tmpl_webdavResyncing')}` }
  try {
    const res = await fetch(`/template/${currentTemplate.type}/${currentTemplate.id}/publish-webdav`, {
      method: 'POST',
      headers: apiHeaders(),
    })
    const data = await res.json().catch(() => ({}))
    if (data.template) currentTemplate = data.template
    else if (currentTemplate) currentTemplate.webdavPublish = { ok: data.ok, error: data.error, publishedAt: data.publishedAt }
    renderWebdavPublishBar(currentTemplate)
  } catch (e) {
    if (currentTemplate) currentTemplate.webdavPublish = { ok: false, error: e.message }
    renderWebdavPublishBar(currentTemplate)
  }
}

function dom(id) { return document.getElementById(id) }

// ── Semantische Suche ──────────────────────────────────────────────────────
function _initSemanticSearch() {
  const input    = dom('topbarSearch')
  const dropdown = dom('searchDropdown')
  if (!input || !dropdown) return

  let _debounce = null
  let _activeIdx = -1
  let _results   = []

  function _close() {
    dropdown.style.display = 'none'
    _activeIdx = -1
    _results   = []
  }

  function _open(html) {
    dropdown.innerHTML = html
    dropdown.style.display = 'block'
  }

  function _navigate(dir) {
    const items = dropdown.querySelectorAll('.search-result-item')
    if (!items.length) return
    items[_activeIdx]?.classList.remove('active')
    _activeIdx = (_activeIdx + dir + items.length) % items.length
    items[_activeIdx]?.classList.add('active')
    items[_activeIdx]?.scrollIntoView({ block: 'nearest' })
  }

  function _selectActive() {
    const items = dropdown.querySelectorAll('.search-result-item')
    if (_activeIdx >= 0 && items[_activeIdx]) items[_activeIdx].click()
  }

  async function _doSearch(q) {
    _open(`<div class="search-loading"><i class="ph ph-spinner"></i> ${t('search')}</div>`)
    try {
      const res = await fetch(`/api/ai/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      _results = data.results || []
      if (!_results.length) {
        _open(`<div class="search-no-results">${t('search_noResultsFor')} <strong>${q}</strong></div>`)
        return
      }
      const mode = data.mode || 'keyword'
      const modeBadge = mode === 'semantic'
        ? `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(168,85,247,.15);color:#a855f7;font-weight:600;margin-left:6px;">${t('search_ai')}</span>`
        : `<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(255,255,255,.08);color:var(--text-subtle);font-weight:600;margin-left:6px;">${t('search_keyword')}</span>`
      const rows = _results.map((r, i) => {
        const icon = TYPE_ICONS[r.type] || 'ph-magnifying-glass'
        return `<div class="search-result-item" data-idx="${i}" onclick="_searchNavigate('${r.url}')">
          <div class="search-result-icon"><i class="ph ${icon}"></i></div>
          <div class="search-result-body">
            <div class="search-result-title">${r.title}</div>
            <div class="search-result-meta">
              <span class="search-result-badge">${r.type}</span>
              <span class="search-result-score">${r.score}% match</span>
            </div>
          </div>
        </div>`
      }).join('')
      _open(`<div class="search-dropdown-header">${t('search_results')} (${_results.length})${modeBadge}</div>${rows}`)
      _activeIdx = -1
    } catch {
      _open(`<div class="search-offline"><i class="ph ph-plug-slash"></i> ${t('search_aiUnavailable')}</div>`)
    }
  }

  input.addEventListener('input', () => {
    const q = input.value.trim()
    clearTimeout(_debounce)
    if (!q) { _close(); return }
    _debounce = setTimeout(() => _doSearch(q), 320)
  })

  input.addEventListener('keydown', (e) => {
    if (!dropdown.style.display || dropdown.style.display === 'none') return
    if (e.key === 'ArrowDown')  { e.preventDefault(); _navigate(1) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); _navigate(-1) }
    if (e.key === 'Enter')      { e.preventDefault(); _selectActive() }
    if (e.key === 'Escape')     { _close(); input.value = '' }
  })

  document.addEventListener('click', (e) => {
    if (!dom('topbarSearchWrap')?.contains(e.target)) _close()
  })

  input.addEventListener('focus', () => {
    if (input.value.trim()) _doSearch(input.value.trim())
  })
}

function _searchNavigate(url) {
  dom('searchDropdown').style.display = 'none'
  dom('topbarSearch').value = ''
  const section = url.replace('#', '')
  loadSection(section)
}

// ── Verknüpfungs-Picker (Controls + Policies) ─────────────────────────────
// Generates the HTML for the <details> "Verknüpfungen" block.
// formId: unique prefix for element IDs (e.g. 'asset', 'bia')
// existingControls: array of currently linked control IDs
// existingPolicies: array of currently linked template IDs (ignored when showPolicies=false)
// showPolicies: whether to show the policy picker (false for guidance docs)
function renderLinksBlock(formId, existingControls = [], existingPolicies = [], showPolicies = true) {
  const ctrlChips = existingControls.map(id =>
    `<span class="link-chip" onclick="removeLinkChip(this,'${formId}_ctrl')" data-val="${escHtml(id)}">${escHtml(id)} <i class="ph ph-x"></i></span>`
  ).join('')
  const polChips = existingPolicies.map(id =>
    `<span class="link-chip" onclick="removeLinkChip(this,'${formId}_pol')" data-val="${escHtml(id)}">${escHtml(id)} <i class="ph ph-x"></i></span>`
  ).join('')

  const policiesPicker = showPolicies ? `
    <div class="link-picker-group" style="margin-top:10px">
      <label class="form-label" style="margin-bottom:4px">${t('link_policiesTemplates')}</label>
      <div style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap">
        <div>
          <input id="${formId}_polSearch" class="form-input" style="width:160px;padding:4px 8px;font-size:.8rem" placeholder="${t('link_search')}"
            oninput="filterLinkSelect('${formId}_polSelect', this.value)">
          <select id="${formId}_polSelect" class="select" multiple size="5" style="margin-top:4px;width:340px;font-size:.8rem"
            ondblclick="addLinkChip('${formId}_pol', this)"></select>
        </div>
        <div>
          <div id="${formId}_pol_chips" class="link-chip-area">${polChips}</div>
          <small style="color:var(--text-subtle);font-size:.72rem">${t('link_dblClickAdd')}</small>
        </div>
      </div>
    </div>` : ''

  return `
  <details class="link-picker-details">
    <summary><i class="ph ph-link"></i> ${t('link_title')}</summary>
    <div style="padding:10px 0">
      <div class="link-picker-group">
        <label class="form-label" style="margin-bottom:4px">${t('link_soaControls')}</label>
        <div style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap">
          <div>
            <input id="${formId}_ctrlSearch" class="form-input" style="width:160px;padding:4px 8px;font-size:.8rem" placeholder="${t('link_searchControlId')}"
              oninput="filterLinkSelect('${formId}_ctrlSelect', this.value)">
            <select id="${formId}_ctrlSelect" class="select" multiple size="5" style="margin-top:4px;width:340px;font-size:.8rem"
              ondblclick="addLinkChip('${formId}_ctrl', this)"></select>
          </div>
          <div>
            <div id="${formId}_ctrl_chips" class="link-chip-area">${ctrlChips}</div>
            <small style="color:var(--text-subtle);font-size:.72rem">${t('link_dblClickAdd')}</small>
          </div>
        </div>
      </div>
      ${policiesPicker}
    </div>
  </details>`
}

// Load SoA controls into a select element
async function loadControlsIntoSelect(selectId) {
  const el = dom(selectId)
  if (!el || el.dataset.loaded) return
  try {
    const r = await fetch('/soa', { headers: apiHeaders() })
    if (!r.ok) return
    const controls = await r.json()
    el.innerHTML = controls.map(c =>
      `<option value="${escHtml(c.id)}">${escHtml(c.id)} – ${escHtml(c.title||c.name||'')}</option>`
    ).join('')
    el.dataset.loaded = '1'
  } catch {}
}

// Load templates into a select element
async function loadPoliciesIntoSelect(selectId) {
  const el = dom(selectId)
  if (!el || el.dataset.loaded) return
  try {
    const r = await fetch('/templates', { headers: apiHeaders() })
    if (!r.ok) return
    const templates = await r.json()
    el.innerHTML = templates.map(t =>
      `<option value="${escHtml(t.id)}">${escHtml(t.title||t.id)} (${escHtml(t.type||'')})</option>`
    ).join('')
    el.dataset.loaded = '1'
  } catch {}
}

// Filter a select element's options by search text
function filterLinkSelect(selectId, search) {
  const el = dom(selectId)
  if (!el) return
  const q = search.toLowerCase()
  for (const opt of el.options) {
    opt.hidden = q && !opt.text.toLowerCase().includes(q)
  }
}

// Add selected option to chip area
function addLinkChip(areaKey, selectEl) {
  const opt = selectEl.options[selectEl.selectedIndex]
  if (!opt) return
  const val = opt.value
  const area = dom(areaKey + '_chips')
  if (!area) return
  if (area.querySelector(`[data-val="${CSS.escape(val)}"]`)) return // already added
  const chip = document.createElement('span')
  chip.className = 'link-chip'
  chip.dataset.val = val
  chip.innerHTML = `${escHtml(val)} <i class="ph ph-x" onclick="removeLinkChip(this,'${areaKey}')"></i>`
  area.appendChild(chip)
}

// Remove a chip
function removeLinkChip(iconEl, areaKey) {
  iconEl.closest('.link-chip')?.remove()
}

// Collect chip values from an area
function getLinkedValues(formId, suffix) {
  const area = dom(`${formId}_${suffix}_chips`)
  if (!area) return []
  return [...area.querySelectorAll('.link-chip')].map(c => c.dataset.val).filter(Boolean)
}

// After rendering a form, load controls (and optionally policies) into pickers
async function initLinkPickers(formId, showPolicies = true) {
  await Promise.all([
    loadControlsIntoSelect(`${formId}_ctrlSelect`),
    showPolicies ? loadPoliciesIntoSelect(`${formId}_polSelect`) : Promise.resolve()
  ])
}

function _show2FAHint(show = true) {
  const el = document.getElementById('topbar2faHint')
  if (el) el.style.display = show ? 'flex' : 'none'
}

function renderFunctionBadges(functions) {
  const container = document.getElementById('topbarFnBadges')
  if (!container) return
  if (!functions || !functions.length) { container.innerHTML = ''; return }
  const FN_ABBR = { ciso:'CISO', dso:'DSB', qmb:'QMB', bcm_manager:'BCM', dept_head:'AL', auditor:'Aud.', admin_notify:'Admin' }
  container.innerHTML = functions.map(f =>
    `<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:var(--color-P75,#e3d9ff);color:var(--color-P400,#5243aa);font-weight:600;">${FN_ABBR[f]||f}</span>`
  ).join('')
}

async function init() {
  if (!(await ensureLoginState())) return

  // ── Versionsanzeige im Sidebar-Footer ──
  fetch('/api/version').then(r => r.ok ? r.json() : null).then(d => {
    const el = dom('sidebarVersion')
    if (el && d?.version) el.textContent = `V ${d.version} · `
  }).catch(() => {})

  // ── Modul-Konfiguration + Nav-Reihenfolge laden ──
  try {
    const [modRes, fwRes, orgRes] = await Promise.all([
      fetch('/admin/modules',        { headers: apiHeaders() }),
      fetch('/admin/soa-frameworks', { headers: apiHeaders() }),
      fetch('/admin/org-settings',   { headers: apiHeaders() }),
    ])
    if (modRes.ok) MODULE_CONFIG = { ...MODULE_CONFIG, ...(await modRes.json()) }
    if (fwRes.ok)  SOA_FW_CONFIG = { ...SOA_FW_CONFIG, ...(await fwRes.json()) }
    if (orgRes.ok) {
      const orgData = await orgRes.json()
      if (Array.isArray(orgData.navOrder) && orgData.navOrder.length) _navOrder = orgData.navOrder
    }
  } catch {}

  // ── Sprach-Konfiguration laden ──
  try {
    const lcRes = await fetch('/auth/language-config')
    if (lcRes.ok) {
      const lc = await lcRes.json()
      if (lc && Array.isArray(lc.available) && lc.available.length) _langConfig = lc
    }
  } catch {}

  // ── Load custom editable lists (overrides defaults if admin has changed them) ──
  try {
    const listsRes = await fetch('/admin/lists', { headers: apiHeaders() })
    if (listsRes.ok) {
      const lists = await listsRes.json()
      if (lists.templateTypes?.length)     TYPES            = lists.templateTypes
      if (lists.riskCategories?.length)    RISK_CATS        = lists.riskCategories
      if (lists.riskTreatments?.length)    RISK_TREATMENTS  = lists.riskTreatments
      if (lists.gdprDataCategories?.length) GDPR_DATA_CATS  = lists.gdprDataCategories
      if (lists.gdprSubjectTypes?.length)  GDPR_SUBJECT_TYPES = lists.gdprSubjectTypes
      if (lists.incidentTypes?.length) {
        const rebuilt = {}
        lists.incidentTypes.forEach(t => { rebuilt[t.id] = t.label })
        INC_TYPE_LABELS = rebuilt
      }
      // Asset-Typen (#64): Das UI hält keine eigene Liste mehr, sondern
      // übernimmt die des Servers — sonst kennt es selbst angelegte Typen nicht.
      if (Array.isArray(lists.assetTypes) && lists.assetTypes.length) {
        ASSET_TYPES = lists.assetTypes
        ASSET_TYPES_MAP = Object.fromEntries(ASSET_TYPES.map(t => [t.id, t.label]))
      }
    }
  } catch {}

  // ── Topbar: User anzeigen ──
  const user = getCurrentUser()
  const role = getCurrentRole()
  const initial = ((user.split('@')[0] || user)[0] || '?').toUpperCase()

  const setAvatar = (id, text) => { const el = dom(id); if (el) el.textContent = text }
  setAvatar('userAvatarEl', initial)
  setAvatar('userAvatarDropdown', initial)
  const shortName = user.split('@')[0] || user
  if (dom('userDisplayName'))  dom('userDisplayName').textContent  = shortName
  if (dom('userDropdownName')) dom('userDropdownName').textContent = user
  if (dom('userDropdownRole')) dom('userDropdownRole').textContent = role

  // ── Topbar: User-Dropdown-Events ──
  dom('topbarUserBtn')?.addEventListener('click', (e) => {
    e.stopPropagation()
    dom('userDropdown')?.classList.toggle('open')
  })
  document.addEventListener('click', () => dom('userDropdown')?.classList.remove('open'))

  dom('dropdownSettings')?.addEventListener('click', () => {
    dom('userDropdown')?.classList.remove('open')
    loadSection('settings')
  })
  dom('dropdownLogout')?.addEventListener('click', async () => {
    try { await fetch('/logout', { method: 'POST', credentials: 'include' }) } catch {}
    localStorage.clear()
    window.location.href = '/ui/login.html'
  })

  // ── Semantische Suche (Topbar) ──
  _initSemanticSearch()

  // ── Sidebar Toggle ──
  dom('sidebarToggle')?.addEventListener('click', () => {
    const sb = dom('sidebar')
    sb.classList.toggle('collapsed')
    sb.classList.toggle('open')
  })

  // ── 2FA-Hinweis-Banner + Funktions-Badges laden ──
  try {
    const whoRes = await fetch('/whoami', { headers: apiHeaders() })
    if (whoRes.ok) {
      const who = await whoRes.json()
      if (!who.has2FA) _show2FAHint(true)
      // Funktionen aus Server-Response aktualisieren (evtl. seit Login geändert)
      const fns = who.functions || []
      localStorage.setItem('isms_current_functions', JSON.stringify(fns))
      renderFunctionBadges(fns)
    }
  } catch {}

  // ── Navigation befüllen ──
  populateSectionNav()

  // ── Template-Typen als aufklappbarer Tree ──
  const typeListEl = dom('typeList')
  TYPES.forEach(t => {
    const icon = TYPE_ICONS[t] || 'ph-file'
    const li = document.createElement('li')
    li.className = 'sidebar-tree-item'
    li.innerHTML = `
      <div class="sidebar-tree-row">
        <button class="sidebar-nav-item sidebar-tree-parent" data-type="${t}">
          <i class="ph ${icon}"></i><span>${t}</span>
        </button>
        <button class="sidebar-tree-toggle" data-type="${t}" title="Ausklappen">
          <i class="ph ph-caret-right"></i>
        </button>
      </div>
      <ul class="sidebar-tree-children" id="tree-${t}" style="display:none;"></ul>
    `
    li.querySelector('.sidebar-tree-parent').onclick = () => selectType(t)
    li.querySelector('.sidebar-tree-toggle').onclick = () => toggleTypeTree(t)
    typeListEl.appendChild(li)
  })

  selectType(currentType, true)
  loadSection(currentSection)

  dom('btnNewType')?.addEventListener('click', () => openModal())
  // Erstellen-Button nur für editor+ sichtbar
  if ((ROLE_RANK[getCurrentRole()] || 0) < ROLE_RANK['editor']) {
    const wrap = document.querySelector('.sidebar-create-wrap')
    if (wrap) wrap.style.display = 'none'
  }
  dom('btnHistory')?.addEventListener('click', showHistory)
  dom('btnSave')?.addEventListener('click', saveCurrent)
  dom('inputNextReview')?.addEventListener('change', e => updateReviewHint(e.target.value))
  dom('modalCancel')?.addEventListener('click', closeModal)
  dom('modalCreate')?.addEventListener('click', createFromModal)

  // Modal initial verstecken
  const modal = document.getElementById('modal')
  if (modal) { modal.style.display = 'flex'; modal.style.visibility = 'hidden' }
}

let _activeTemplateType = null

function selectType(type, init=false) {
  _activeTemplateType = type
  currentType = type
  document.querySelectorAll('#typeList .sidebar-tree-parent').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type)
  })
  dom('selType').textContent = type

  // When the user explicitly clicks a template type, show the editor area
  // and hide all module containers so the template list/editor is visible
  if (!init) {
    removeAllDynamicPanels()
    document.querySelectorAll('#sectionNav .sidebar-nav-item').forEach(btn => btn.classList.remove('active'))
    currentSection = null
    const editorCard = dom('editorCard')
    const listPanel  = dom('listPanel')
    if (editorCard) editorCard.style.display = ''
    if (listPanel)  listPanel.style.display  = ''
  }

  const isAdmin = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK['admin']

  fetch(`/templates/tree?type=${encodeURIComponent(type)}&language=de`, { headers: apiHeaders('reader') })
    .then(r => r.json())
    .then(treeData => {
      const list = dom('templateList')
      list.innerHTML = ''
      if (treeData.length === 0) {
        const empty = document.createElement('li')
        empty.className = 'tmpl-tree-empty'
        empty.textContent = t('noTemplates')
        list.appendChild(empty)
        return
      }
      const ul = document.createElement('ul')
      ul.className = 'tmpl-tree-root'
      // Root-Drop-Zone: Drop hier → Node wird Root-Element
      const canMove = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.contentowner
      if (canMove) {
        const rootDz = document.createElement('div')
        rootDz.className = 'tree-drop-zone'
        rootDz.title = 'Hierher ziehen → Root-Ebene'
        rootDz.style.minHeight = '6px'
        rootDz.addEventListener('dragover', e => { e.preventDefault(); rootDz.classList.add('drag-over-sibling') })
        rootDz.addEventListener('dragleave', () => rootDz.classList.remove('drag-over-sibling'))
        rootDz.addEventListener('drop', e => {
          e.preventDefault(); rootDz.classList.remove('drag-over-sibling')
          if (_dragId) _moveNodeTo(_dragId, _dragType, null)
        })
        ul.appendChild(rootDz)
      }
      renderTemplateTree(treeData, ul, isAdmin, 0)
      list.appendChild(ul)
      // Sidebar-Tree aktualisieren
      refreshSidebarTree(type, treeData)
      if (!init) { currentTemplate = null; clearEditor() }
    })
}

// Rekursiv den Template-Baum rendern (mit Drag & Drop + Up/Down-Sortierung)
function renderTemplateTree(nodes, ul, isAdmin, depth) {
  const canMove = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.contentowner

  nodes.forEach((t, idx) => {
    const hasChildren = t.children && t.children.length > 0

    // ── Drop-Zone VOR diesem Element (für Geschwister-Reorder) ──
    if (canMove) ul.appendChild(_makeDropZone(nodes, idx))

    const li = document.createElement('li')
    li.className = 'tmpl-tree-item'

    const row = document.createElement('div')
    row.className = 'tmpl-tree-row'
    row.dataset.id = t.id

    const expandBtn = document.createElement('button')
    expandBtn.className = 'tmpl-tree-expand'
    if (hasChildren) {
      expandBtn.innerHTML = '<i class="ph ph-caret-right"></i>'
      expandBtn.title = 'Unterseiten ein-/ausklappen'
    } else {
      expandBtn.innerHTML = '<span class="tmpl-tree-spacer"></span>'
      expandBtn.disabled = true
      expandBtn.style.cursor = 'default'
    }

    const dot = document.createElement('span')
    dot.className = `status-dot ${t.status || 'draft'}`

    const title = document.createElement('span')
    title.className = 'tmpl-tree-title'
    title.textContent = t.title

    const ver = document.createElement('span')
    ver.className = 'tmpl-tree-version'
    ver.textContent = `v${t.version}`

    row.appendChild(expandBtn)
    row.appendChild(dot)
    row.appendChild(title)
    row.appendChild(ver)

    // ── Up / Down Reorder-Buttons ──
    if (canMove) {
      if (idx > 0) {
        const upBtn = document.createElement('button')
        upBtn.className = 'tmpl-tree-action'
        upBtn.title = 'Nach oben'
        upBtn.innerHTML = '<i class="ph ph-arrow-up"></i>'
        upBtn.addEventListener('click', e => { e.stopPropagation(); _reorderMove(nodes, idx, -1) })
        row.appendChild(upBtn)
      }
      if (idx < nodes.length - 1) {
        const downBtn = document.createElement('button')
        downBtn.className = 'tmpl-tree-action'
        downBtn.title = 'Nach unten'
        downBtn.innerHTML = '<i class="ph ph-arrow-down"></i>'
        downBtn.addEventListener('click', e => { e.stopPropagation(); _reorderMove(nodes, idx, +1) })
        row.appendChild(downBtn)
      }
    }

    if (isAdmin) {
      const delBtn = document.createElement('button')
      delBtn.className = 'tmpl-tree-delete'
      delBtn.title = 'Delete'
      delBtn.innerHTML = '<i class="ph ph-trash"></i>'
      delBtn.addEventListener('click', e => { e.stopPropagation(); deleteTemplate(t) })
      row.appendChild(delBtn)
    }

    // ── Drag & Drop (nur für contentowner+) ──
    if (canMove) {
      row.draggable = true
      row.addEventListener('dragstart', e => {
        _dragId = t.id; _dragType = t.type
        e.dataTransfer.effectAllowed = 'move'
        setTimeout(() => row.classList.add('drag-source'), 0)
      })
      row.addEventListener('dragend', () => {
        row.classList.remove('drag-source')
        document.querySelectorAll('.drag-over-child').forEach(el => el.classList.remove('drag-over-child'))
      })
      row.addEventListener('dragover', e => {
        if (_dragId === t.id) return
        e.preventDefault(); e.stopPropagation()
        document.querySelectorAll('.drag-over-child').forEach(el => el.classList.remove('drag-over-child'))
        row.classList.add('drag-over-child')
      })
      row.addEventListener('dragleave', () => row.classList.remove('drag-over-child'))
      row.addEventListener('drop', e => {
        e.preventDefault(); e.stopPropagation()
        row.classList.remove('drag-over-child')
        if (_dragId && _dragId !== t.id) _moveNodeTo(_dragId, _dragType, t.id)
      })
    }

    // Klick auf Zeile → Template laden
    row.addEventListener('click', (e) => {
      if (e.target.closest('.tmpl-tree-delete') || e.target.closest('.tmpl-tree-expand') || e.target.closest('.tmpl-tree-action')) return
      document.querySelectorAll('.tmpl-tree-row').forEach(r => r.classList.remove('selected'))
      row.classList.add('selected')
      loadTemplate(t)
    })

    li.appendChild(row)

    // Kind-Knoten
    if (hasChildren) {
      const childUl = document.createElement('ul')
      childUl.className = 'tmpl-tree-children'
      childUl.style.display = 'none'
      renderTemplateTree(t.children, childUl, isAdmin, depth + 1)
      li.appendChild(childUl)

      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const open = childUl.style.display !== 'none'
        childUl.style.display = open ? 'none' : 'block'
        expandBtn.innerHTML = open ? '<i class="ph ph-caret-right"></i>' : '<i class="ph ph-caret-down"></i>'
      })
    }

    ul.appendChild(li)
  })

  // ── Letzte Drop-Zone (nach dem letzten Element) ──
  if (canMove && nodes.length > 0) ul.appendChild(_makeDropZone(nodes, nodes.length))
}

// Erzeugt eine Drop-Zone für Geschwister-Reorder
function _makeDropZone(siblings, insertIndex) {
  const dz = document.createElement('div')
  dz.className = 'tree-drop-zone'
  dz.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dz.classList.add('drag-over-sibling') })
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over-sibling'))
  dz.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation()
    dz.classList.remove('drag-over-sibling')
    if (!_dragId) return
    // Ziel-parentId aus Geschwistern ableiten
    const targetParentId = siblings[0]?.parentId || null
    // Neue sortOrder: zwischen den Nachbarn interpolieren
    const before = insertIndex > 0 ? (siblings[insertIndex - 1]?.sortOrder ?? (insertIndex - 1) * 10) : null
    const after  = insertIndex < siblings.length ? (siblings[insertIndex]?.sortOrder ?? insertIndex * 10) : null
    let newOrder
    if (before === null) newOrder = (after ?? 0) - 10
    else if (after === null) newOrder = (before) + 10
    else newOrder = (before + after) / 2
    _moveNodeTo(_dragId, _dragType, targetParentId, newOrder)
  })
  return dz
}

// Tauscht sortOrder zweier Geschwister (Up/Down Buttons)
function _reorderMove(siblings, idx, dir) {
  const a = siblings[idx]
  const b = siblings[idx + dir]
  if (!a || !b) return
  const aOrder = a.sortOrder ?? idx * 10
  const bOrder = b.sortOrder ?? (idx + dir) * 10
  fetch('/templates/reorder', {
    method: 'POST',
    headers: apiHeaders('contentowner'),
    body: JSON.stringify({ updates: [{ id: a.id, sortOrder: bOrder }, { id: b.id, sortOrder: aOrder }] })
  }).then(r => r.ok ? selectType(currentType) : null)
}

// Verschiebt einen Knoten zu einem neuen Parent (oder Root)
function _moveNodeTo(id, type, newParentId, sortOrder) {
  const body = { parentId: newParentId || null }
  if (sortOrder !== undefined) body.sortOrder = sortOrder
  fetch(`/template/${encodeURIComponent(type)}/${encodeURIComponent(id)}/move`, {
    method: 'PUT',
    headers: apiHeaders('contentowner'),
    body: JSON.stringify(body)
  }).then(r => r.json()).then(result => {
    if (result.error) { alert('Error: ' + result.error); return }
    selectType(type)
    if (currentTemplate?.id === id) renderBreadcrumb(result)
  })
}

async function deleteTemplate(t) {
  if (!confirm(`Delete document "${t.title}"?\nThis action cannot be undone.`)) return
  const res = await fetch(`/template/${t.type}/${encodeURIComponent(t.id)}`, {
    method: 'DELETE',
    headers: apiHeaders('admin')
  })
  if (res.ok) {
    if (currentTemplate?.id === t.id) { currentTemplate = null; clearEditor() }
    selectType(t.type)
  } else {
    alert('Delete failed.')
  }
}

function refreshSidebarTree(type, treeData) {
  const ul = document.getElementById(`tree-${type}`)
  if (!ul || ul.style.display === 'none') return
  ul.innerHTML = ''
  if (!treeData || treeData.length === 0) {
    ul.innerHTML = '<li class="sidebar-tree-empty">No documents</li>'
    return
  }
  function appendSidebarNodes(nodes, parentEl, depth) {
    nodes.forEach(t => {
      const li = document.createElement('li')
      const paddingLeft = depth * 12
      li.innerHTML = `<button class="sidebar-tree-child" data-id="${t.id}" style="padding-left:${8 + paddingLeft}px">
        <span class="status-dot ${t.status || 'draft'}"></span>
        <span>${t.title}</span>
      </button>`
      li.querySelector('button').onclick = () => { selectType(type); loadTemplate(t) }
      parentEl.appendChild(li)
      if (t.children && t.children.length > 0) appendSidebarNodes(t.children, parentEl, depth + 1)
    })
  }
  appendSidebarNodes(treeData, ul, 0)
}

async function toggleTypeTree(type) {
  const ul = document.getElementById(`tree-${type}`)
  const icon = document.querySelector(`.sidebar-tree-toggle[data-type="${type}"] i`)
  if (!ul) return

  const isOpen = ul.style.display !== 'none'
  if (isOpen) {
    ul.style.display = 'none'
    if (icon) icon.className = 'ph ph-caret-right'
    return
  }

  ul.style.display = 'block'
  if (icon) icon.className = 'ph ph-caret-down'
  ul.innerHTML = '<li class="sidebar-tree-empty">Loading…</li>'

  try {
    const res = await fetch(`/templates/tree?type=${encodeURIComponent(type)}&language=de`, { headers: apiHeaders('reader') })
    const treeData = await res.json()
    refreshSidebarTree(type, treeData)
  } catch {
    ul.innerHTML = '<li class="sidebar-tree-empty">Error</li>'
  }
}

function roleRankFromLabel(label) {
  const map = { reader:1, editor:2, contentowner:3, admin:4 }
  return map[label?.toLowerCase?.() ?? 'reader']
}

function canAccess(sectionMinRole) {
  const r = (localStorage.getItem('isms_current_role') || 'reader').toLowerCase()
  const rank = ROLE_RANK[r]
  const required = ROLE_RANK[sectionMinRole] || 1
  return (rank ?? 1) >= required
}

// Sichtbarkeit eines Menüpunkts: Rang >= minRole ODER Benutzerfunktion in functions[]
// Admin sieht immer alles. Union-Regel bei kombinierten Funktionen (z.B. ciso+dso).
function canSeeSection(meta) {
  if (canAccess('admin')) return true
  if (canAccess(meta.minRole)) return true
  const fns = getCurrentFunctions()
  return Array.isArray(meta.functions) && meta.functions.some(f => fns.includes(f))
}

// Gespeicherte Nav-Reihenfolge (wird beim Login aus org-settings geladen)
let _navOrder = []

// Sprach-Konfiguration (wird beim Start vom Server geladen)
let _langConfig = { available: ['de', 'en', 'fr', 'nl'], default: 'en' }

function populateSectionNav(){
  const nav = dom('sectionNav')
  if (!nav) return
  nav.innerHTML = ''

  // Reihenfolge bestimmen: gespeicherte Reihenfolge + alle weiteren SECTION_META-Einträge am Ende
  const ordered = [
    ..._navOrder.map(id => SECTION_META.find(s => s.id === id)).filter(Boolean),
    ...SECTION_META.filter(s => !_navOrder.includes(s.id)),
  ]

  ordered.forEach(s => {
    if (!canSeeSection(s)) return
    // Modul-Filter: deaktivierte Module ausblenden (dashboard/admin/settings immer sichtbar)
    if (!['dashboard','admin','settings'].includes(s.id) && MODULE_CONFIG[s.id] === false) return
    const li = document.createElement('li')
    li.innerHTML = `
      <button class="sidebar-nav-item ${currentSection === s.id ? 'active' : ''}" data-section="${s.id}">
        <i class="ph ${s.icon}"></i><span>${s.labelKey ? t(s.labelKey) : s.label}</span>
      </button>`
    li.querySelector('button').onclick = () => loadSection(s.id)
    nav.appendChild(li)
  })
}

function loadSection(sectionId){
  const meta = SECTION_META.find(s => s.id === sectionId)
  if (meta && !canSeeSection(meta)) {
    // Fallback zur ersten erlaubten Sektion (Dashboard ist immer sichtbar)
    sectionId = 'dashboard'
  }
  currentSection = sectionId
  document.querySelectorAll('#sectionNav .sidebar-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === sectionId)
  })
  renderSectionContent(sectionId)
}

function removeAllDynamicPanels() {
  ['dashboardContainer','soaContainer','guidanceContainer','riskContainer','calendarContainer','adminPanelContainer','settingsPanelContainer','reportsContainer','gdprContainer','trainingContainer','incidentContainer','legalContainer','goalsContainer','assetsContainer','governanceContainer','nis2Container','bcmContainer','suppliersContainer','policyAcksContainer'].forEach(id => {
    dom(id)?.remove()
  })
}

// ── Reports ─────────────────────────────────────────────────────────
// ── Findings: Severity- und Status-Labels ─────────────────────────────────────
const FINDING_SEVERITY_LABELS = {
  get critical()    { return t('findings_critical') },
  get high()        { return t('findings_high') },
  get medium()       { return t('findings_medium') },
  get low()          { return t('findings_low') },
  get observation()  { return t('findings_observation') },
}
const FINDING_STATUS_LABELS = {
  get open()        { return t('findings_statusOpen') },
  get in_progress()  { return t('findings_statusInProgress') },
  get resolved()     { return t('findings_statusResolved') },
  get accepted()     { return t('findings_statusAccepted') },
}
const FINDING_ACT_STATUS_LABELS = {
  get open()        { return t('findings_statusOpen') },
  get in_progress()  { return t('findings_statusInProgress') },
  get done()         { return t('findings_statusDone') },
}
const FINDING_SEVERITY_COLOR  = { critical:'#f87171', high:'#fb923c', medium:'#fbbf24', low:'#4ade80', observation:'#60a5fa' }
const FINDING_STATUS_COLOR    = { open:'#f87171', in_progress:'#fbbf24', resolved:'#4ade80', accepted:'#60a5fa' }

let _reportsMainTab  = 'reports'   // 'reports' | 'findings'
let _findingsTab     = 'list'      // 'list' | 'open' | 'resolved'
let _findingFormBack = 'list'

const REPORT_TYPES = [
  { id: 'compliance', labelKey: 'reports_compliance', icon: 'ph-shield-check',            descKey: 'reports_descCompliance', needsEntity: true },
  { id: 'framework',  labelKey: 'reports_fw',         icon: 'ph-chart-bar',               descKey: 'reports_descFramework', needsEntity: false },
  { id: 'gap',        labelKey: 'reports_gap',        icon: 'ph-warning-circle',          descKey: 'reports_descGap', needsEntity: true },
  { id: 'templates',  labelKey: 'reports_templates',  icon: 'ph-files',                   descKey: 'reports_descTemplates', needsEntity: true },
  { id: 'reviews',    labelKey: 'reports_reviews',    icon: 'ph-calendar-x',              descKey: 'reports_descReviews', needsEntity: false },
  { id: 'matrix',     labelKey: 'reports_matrix',     icon: 'ph-table',                   descKey: 'reports_descMatrix', needsEntity: false },
  { id: 'audit',      labelKey: 'reports_audit',      icon: 'ph-clock-counter-clockwise',  descKey: 'reports_descAudit', needsEntity: false },
  { id: 'findings',   labelKey: 'findings_title',     icon: 'ph-magnifying-glass',         descKey: 'reports_descFindings', needsEntity: false },
  { id: 'risks',      labelKey: 'risk_register',      icon: 'ph-warning',                  descKey: 'reports_descRisks', needsEntity: true },
]

let _reportEntities = []
let _activeReportType = null

async function renderReports() {
  const main = document.querySelector('main') || document.querySelector('.main-content') || document.body
  let container = document.createElement('div')
  container.id = 'reportsContainer'
  container.className = 'reports-container'
  main.appendChild(container)

  container.innerHTML = `
    <div class="reports-header">
      <h2 class="reports-title"><i class="ph ph-chart-line"></i> ${t('reports_title')}</h2>
    </div>
    <div class="training-tab-bar" style="margin-bottom:16px">
      <button class="training-tab${_reportsMainTab==='reports'?' active':''}" data-tab="reports" onclick="switchReportsMainTab('reports')">
        <i class="ph ph-chart-bar"></i> ${t('reports_title')}
      </button>
      <button class="training-tab${_reportsMainTab==='findings'?' active':''}" data-tab="findings" onclick="switchReportsMainTab('findings')">
        <i class="ph ph-magnifying-glass"></i> ${t('findings_title')}
      </button>
    </div>
    <div id="reportsMainContent"></div>
  `
  if (_reportsMainTab === 'findings') {
    renderFindingsTab()
  } else {
    renderReportsTabContent(container)
  }
}

async function switchReportsMainTab(tab) {
  _reportsMainTab = tab
  document.querySelectorAll('#reportsContainer .training-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab)
  )
  const content = dom('reportsMainContent')
  if (!content) return
  if (tab === 'findings') {
    renderFindingsTab()
  } else {
    const container = document.getElementById('reportsContainer')
    renderReportsTabContent(container)
  }
}

function renderReportsTabContent(container) {
  const content = dom('reportsMainContent')
  if (!content) return
  content.innerHTML = `
    <div class="reports-card-grid">
      ${REPORT_TYPES.map(rt => `
        <div class="report-card" data-report="${rt.id}">
          <i class="ph ${rt.icon} report-card-icon"></i>
          <h3 class="report-card-title">${t(rt.labelKey)}</h3>
          <p class="report-card-desc">${t(rt.descKey)}</p>
          <button class="btn btn-primary btn-sm report-run-btn" data-report="${rt.id}">
            ${t('reports_run')} <i class="ph ph-play"></i>
          </button>
        </div>
      `).join('')}
    </div>
    <div id="reportFilters" class="report-filters" style="display:none;">
      <div id="reportEntityWrap">
        <label class="form-label">${t('reports_entity')}</label>
        <select id="reportEntitySel" class="select report-sel">
          <option value="">${t('filter_allEntities')}</option>
          ${_reportEntities.map(e => `<option value="${e.id}">${e.name} (${e.shortCode || e.id})</option>`).join('')}
        </select>
      </div>
      <label class="form-label">${t('reports_framework')}</label>
      <select id="reportFwSel" class="select report-sel">
        <option value="">${t('reports_allFw')}</option>
        <option value="ISO27001">ISO 27001:2022</option>
        <option value="BSI">BSI IT-Grundschutz</option>
        <option value="NIS2">EU NIS2</option>
        <option value="EUCS">EU Cloud (EUCS)</option>
        <option value="EUAI">EU AI Act</option>
        <option value="ISO9000">ISO 9000:2015</option>
        <option value="ISO9001">ISO 9001:2015</option>
        <option value="CRA">EU Cyber Resilience Act</option>
      </select>
      <label class="form-label">${t('reports_from')}</label>
      <input type="date" id="reportFrom" class="form-input report-date" />
      <label class="form-label">${t('reports_to')}</label>
      <input type="date" id="reportTo" class="form-input report-date" />
      <button id="reportRunBtn" class="btn btn-primary"><i class="ph ph-play"></i> ${t('reports_generate')}</button>
      <button class="btn btn-secondary" onclick="exportReportJson()"><i class="ph ph-download-simple"></i> JSON</button>
      <button class="btn btn-secondary" onclick="exportReportCsv()"><i class="ph ph-file-csv"></i> CSV</button>
      <button class="btn btn-secondary" onclick="exportReportPdf()"><i class="ph ph-file-pdf"></i> PDF</button>
    </div>
    <div id="reportResult" class="report-result"></div>
  `
  content.querySelectorAll('.report-run-btn').forEach(btn => {
    btn.onclick = () => {
      _activeReportType = btn.dataset.report
      const rt = REPORT_TYPES.find(r => r.id === _activeReportType)
      const filters = dom('reportFilters')
      filters.style.display = 'flex'
      dom('reportEntityWrap').style.display = (rt?.needsEntity) ? '' : 'none'
      dom('reportRunBtn').onclick = () => runReport(_activeReportType)
      document.getElementById('reportResult').innerHTML = ''
    }
  })
  if (_reportEntities.length === 0) {
    fetch('/entities', { headers: apiHeaders('reader') })
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        if (!list.length) return
        _reportEntities = list
        const sel = dom('reportEntitySel')
        if (sel) {
          list.forEach(e => {
            const opt = document.createElement('option')
            opt.value = e.id
            opt.textContent = `${e.name} (${e.shortCode || e.id})`
            sel.appendChild(opt)
          })
        }
      })
      .catch(() => {})
  }
}


let _lastReportData = null

async function runReport(type) {
  const entity = dom('reportEntitySel')?.value || ''
  const fw     = dom('reportFwSel')?.value || ''
  const from   = dom('reportFrom')?.value || ''
  const to     = dom('reportTo')?.value || ''
  const resultEl = dom('reportResult')
  if (!resultEl) return
  resultEl.innerHTML = `<p class="report-loading"><i class="ph ph-spinner"></i> ${t('reports_calculating')}</p>`

  let url = `/reports/${type}`
  const params = new URLSearchParams()
  if (entity) params.set('entity', entity)
  if (fw)     params.set('framework', fw)
  if (from)   params.set('from', from)
  if (to)     params.set('to', to)
  if ([...params].length) url += '?' + params.toString()

  try {
    const res = await fetch(url, { headers: apiHeaders('reader') })
    if (!res.ok) { resultEl.innerHTML = `<p class="report-error">${t('error')}: ${res.status}</p>`; return }
    _lastReportData = await res.json()
    renderReportResult(type, _lastReportData, resultEl)
  } catch (e) {
    resultEl.innerHTML = `<p class="report-error">${t('err_network')}: ${e.message}</p>`
  }
}

function _docStatusLabel(s) {
  return { draft: t('status_draft'), review: t('status_review'), approved: t('status_approved'), archived: t('status_archived') }[s] || s
}
function _riskLevelLabel(s) {
  return { critical: t('riskl_critical'), high: t('riskl_high'), medium: t('riskl_medium'), low: t('riskl_low') }[s] || s || '—'
}
function _riskStatusLabel(s) {
  return (RISK_STATUSES.find(x => x.id === s) || {}).label || s || '—'
}

function renderReportResult(type, data, el) {
  if (type === 'compliance') {
    el.innerHTML = `<h3 class="report-result-title">${t('reports_compliance')}</h3>` +
      (Array.isArray(data) ? data : [data]).map(row => `
        <div class="report-compliance-card">
          <h4>${row.entity?.name || t('reports_allEntities')} <span class="picker-id">${row.entity?.shortCode || ''}</span></h4>
          <div class="report-kpi-row">
            <div class="report-kpi"><span class="report-kpi-val">${row.totalApplicable}</span><span class="report-kpi-label">${t('soa_applicable')}</span></div>
            <div class="report-kpi"><span class="report-kpi-val">${row.totalImplemented}</span><span class="report-kpi-label">${t('soa_implemented')}</span></div>
            <div class="report-kpi"><span class="report-kpi-val ${row.implementationRate < 50 ? 'red' : row.implementationRate < 80 ? 'yellow' : 'green'}">${row.implementationRate}%</span><span class="report-kpi-label">${t('reports_rate')}</span></div>
          </div>
          <table class="report-table">
            <thead><tr><th>${t('reports_framework')}</th><th>${t('soa_applicable')}</th><th>${t('soa_implemented')}</th><th>${t('reports_rate')}</th></tr></thead>
            <tbody>${Object.entries(row.byFramework || {}).map(([fw, v]) =>
              `<tr><td>${fw}</td><td>${v.applicable}</td><td>${v.implemented}</td>
               <td>${v.applicable > 0 ? Math.round(v.implemented/v.applicable*100) : 0}%</td></tr>`
            ).join('')}</tbody>
          </table>
        </div>
      `).join('')
  } else if (type === 'framework') {
    el.innerHTML = `<h3 class="report-result-title">${t('reports_fw')}</h3>
      <table class="report-table">
        <thead><tr><th>${t('reports_framework')}</th><th>${t('reports_colControls')}</th><th>${t('soa_applicable')}</th><th>${t('reports_colNA')}</th><th>${t('soa_implemented')}</th><th>${t('reports_rate')}</th></tr></thead>
        <tbody>${(Array.isArray(data) ? data : [data]).map(fw => `
          <tr>
            <td><span class="fw-dot" style="background:${fw.color}"></span>${fw.label}</td>
            <td>${fw.total}</td><td>${fw.applicable}</td><td>${fw.notApplicable}</td>
            <td>${(fw.byStatus?.implemented||0) + (fw.byStatus?.optimized||0)}</td>
            <td>${fw.implementationRate}%</td>
          </tr>`).join('')}
        </tbody>
      </table>`
  } else if (type === 'gap') {
    el.innerHTML = `<h3 class="report-result-title">${t('reports_gap')} — ${data.totalGaps} ${t('reports_controlsWithoutPolicy')}</h3>
      <table class="report-table">
        <thead><tr><th>${t('reports_colControlId')}</th><th>${t('reports_framework')}</th><th>${t('col_title')}</th><th>${t('col_status')}</th><th>${t('col_owner')}</th></tr></thead>
        <tbody>${(data.gaps || []).map(g => `
          <tr><td class="picker-id">${g.id}</td><td>${g.framework}</td><td>${g.title}</td>
              <td>${g.status || '—'}</td><td>${g.owner || '—'}</td></tr>`).join('')}
        </tbody>
      </table>`
  } else if (type === 'templates') {
    el.innerHTML = `<h3 class="report-result-title">${t('dash_templates')} (${data.total})</h3>
      <div class="report-kpi-row">
        ${Object.entries(data.byStatus||{}).map(([s,n])=>`<div class="report-kpi"><span class="report-kpi-val">${n}</span><span class="report-kpi-label status-${s}">${_docStatusLabel(s)}</span></div>`).join('')}
      </div>
      <table class="report-table">
        <thead><tr><th>${t('col_type')}</th><th>${t('col_title')}</th><th>${t('col_status')}</th><th>${t('col_version')}</th><th>${t('reports_colControls')}</th></tr></thead>
        <tbody>${(data.templates||[]).map(tpl=>`
          <tr><td>${tpl.type}</td><td>${tpl.title}</td>
              <td><span class="status-badge status-${tpl.status}">${_docStatusLabel(tpl.status)}</span></td>
              <td>v${tpl.version}</td><td>${tpl.linkedControls.length}</td></tr>`).join('')}
        </tbody>
      </table>`
  } else if (type === 'reviews') {
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB') : '—'
    const reviewRow = (row, cls) =>
      `<tr class="${cls}"><td>${fmtDate(row.nextReviewDate)}</td><td>${row.type}</td>
       <td>${escHtml(row.title)}</td><td><span class="status-badge status-${row.status}">${_docStatusLabel(row.status)}</span></td>
       <td>${escHtml(row.owner||'—')}</td>
       <td>${row.daysUntil !== null ? (row.daysUntil < 0 ? `<span style="color:var(--color-danger)">${row.daysUntil} ${t('reports_days')}</span>` : `${row.daysUntil} ${t('reports_days')}`) : '—'}</td></tr>`
    el.innerHTML = `
      <h3 class="report-result-title">${t('reports_reviews')}</h3>
      <div class="report-kpi-row">
        <div class="report-kpi"><span class="report-kpi-val red">${data.overdue?.length||0}</span><span class="report-kpi-label">${t('reports_overdue')}</span></div>
        <div class="report-kpi"><span class="report-kpi-val yellow">${data.upcoming?.length||0}</span><span class="report-kpi-label">${t('reports_inDays', { days: data.daysAhead })}</span></div>
        <div class="report-kpi"><span class="report-kpi-val">${data.noReview?.length||0}</span><span class="report-kpi-label">${t('reports_noDate')}</span></div>
      </div>
      ${data.overdue?.length ? `<h4 style="color:var(--color-danger);margin-top:1rem">${t('reports_overdue')}</h4>
      <table class="report-table"><thead><tr><th>${t('reports_reviewDate')}</th><th>${t('col_type')}</th><th>${t('col_title')}</th><th>${t('col_status')}</th><th>${t('col_owner')}</th><th>${t('col_dueDate')}</th></tr></thead>
      <tbody>${data.overdue.map(t => reviewRow(t, 'review-overdue')).join('')}</tbody></table>` : ''}
      ${data.upcoming?.length ? `<h4 style="color:var(--color-warning);margin-top:1rem">${t('reports_dueSoon')} (${t('reports_daysCount', { days: data.daysAhead })})</h4>
      <table class="report-table"><thead><tr><th>${t('reports_reviewDate')}</th><th>${t('col_type')}</th><th>${t('col_title')}</th><th>${t('col_status')}</th><th>${t('col_owner')}</th><th>${t('col_dueDate')}</th></tr></thead>
      <tbody>${data.upcoming.map(t => reviewRow(t, 'review-upcoming')).join('')}</tbody></table>` : ''}`
  } else if (type === 'matrix') {
    const statusColor = s => ({ implemented:'var(--color-success)', optimized:'var(--color-success)',
      partial:'var(--color-warning)', not_started:'var(--color-danger)', 'n/a':'var(--color-muted)' })[s] || '#888'
    const statusEmoji = s => ({ implemented:'✓', optimized:'★', partial:'◑', not_started:'✗', 'n/a':'—' })[s] || '?'
    el.innerHTML = `
      <h3 class="report-result-title">${t('reports_matrix')} — ${data.framework === 'all' ? t('reports_allFw') : data.framework}</h3>
      <div style="overflow-x:auto">
      <table class="report-table matrix-table">
        <thead><tr><th>${t('soa_control')}</th><th>${t('reports_framework')}</th><th>${t('col_title')}</th>${(data.entities||[]).map(e=>`<th title="${e.name}">${e.shortCode||e.name}</th>`).join('')}</tr></thead>
        <tbody>${(data.controls||[]).map(ctrl=>`
          <tr>
            <td class="picker-id">${ctrl.id}</td>
            <td>${ctrl.framework}</td>
            <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(ctrl.title)}">${escHtml(ctrl.title)}</td>
            ${(data.entities||[]).map(e=>{
              const s = ctrl[e.id] || 'n/a'
              const sLabel = s === 'n/a' ? t('soa_notApplicable') : (STATUS_LABELS[s] || s)
              return `<td style="text-align:center;color:${statusColor(s)}" title="${sLabel}">${statusEmoji(s)}</td>`
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table></div>
      <p style="margin-top:.5rem;font-size:.8rem;color:var(--color-muted)">✓ ${t('soa_implemented')} &nbsp; ★ ${t('soa_optimized')} &nbsp; ◑ ${t('soa_partial')} &nbsp; ✗ ${t('soa_notStarted')} &nbsp; — ${t('soa_notApplicable')}</p>`
  } else if (type === 'audit') {
    el.innerHTML = `<h3 class="report-result-title">${t('reports_audit')} (${data.total} ${t('auditLog_total').toLowerCase()})</h3>
      <table class="report-table">
        <thead><tr><th>${t('col_date')}</th><th>${t('reports_colTemplate')}</th><th>${t('col_type')}</th><th>${t('col_status')}</th><th>${t('reports_changedBy')}</th></tr></thead>
        <tbody>${(data.entries||[]).map(e=>`
          <tr><td>${new Date(e.changedAt).toLocaleString('en-GB')}</td>
              <td>${e.templateTitle}</td><td>${e.type}</td>
              <td><span class="status-badge status-${e.status}">${_docStatusLabel(e.status)}</span></td>
              <td>${e.changedBy}</td></tr>`).join('')}
        </tbody>
      </table>`
  } else if (type === 'findings') {
    const sevColor = { critical:'#f87171', high:'#fb923c', medium:'#fbbf24', low:'#4ade80', observation:'#60a5fa' }
    const stColor  = { open:'#f87171', in_progress:'#fbbf24', resolved:'#4ade80', accepted:'#60a5fa' }
    el.innerHTML = `
      <h3 class="report-result-title">${t('findings_title')} (${data.total})</h3>
      <div class="report-kpi-row" style="margin-bottom:16px">
        <div class="report-kpi"><span class="report-kpi-val red">${data.byStatus?.open||0}</span><span class="report-kpi-label">${t('findings_statusOpen')}</span></div>
        <div class="report-kpi"><span class="report-kpi-val yellow">${data.byStatus?.in_progress||0}</span><span class="report-kpi-label">${t('findings_statusInProgress')}</span></div>
        <div class="report-kpi"><span class="report-kpi-val green">${data.byStatus?.resolved||0}</span><span class="report-kpi-label">${t('findings_statusResolved')}</span></div>
        <div class="report-kpi"><span class="report-kpi-val">${data.byStatus?.accepted||0}</span><span class="report-kpi-label">${t('findings_statusAccepted')}</span></div>
        <div class="report-kpi"><span class="report-kpi-val" style="color:#f87171">${data.bySeverity?.critical||0}</span><span class="report-kpi-label">${t('findings_critical')}</span></div>
        <div class="report-kpi"><span class="report-kpi-val" style="color:#fb923c">${data.bySeverity?.high||0}</span><span class="report-kpi-label">${t('findings_high')}</span></div>
        <div class="report-kpi"><span class="report-kpi-val ${data.overdueActions>0?'red':''}">${data.openActions||0}</span><span class="report-kpi-label">${t('findings_openActions')}</span></div>
        ${data.overdueActions > 0 ? `<div class="report-kpi"><span class="report-kpi-val red">${data.overdueActions}</span><span class="report-kpi-label">${t('findings_overdue')}</span></div>` : ''}
      </div>
      <table class="report-table">
        <thead><tr><th>${t('reports_colRef')}</th><th>${t('col_title')}</th><th>${t('findings_severity')}</th><th>${t('col_status')}</th><th>${t('findings_auditor')}</th><th>${t('findings_auditedArea')}</th><th>${t('findings_observation')}</th><th>${t('findings_requirement')}</th><th>${t('findings_openActions')}</th></tr></thead>
        <tbody>${(data.findings||[]).map(f => {
          const openActs = (f.actions||[]).filter(a => a.status !== 'done').length
          return `<tr>
            <td class="picker-id">${f.ref}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(f.title)}">${escHtml(f.title)}</td>
            <td><span style="color:${sevColor[f.severity]||'#888'};font-weight:600">${FINDING_SEVERITY_LABELS[f.severity]||f.severity}</span></td>
            <td><span style="color:${stColor[f.status]||'#888'}">${FINDING_STATUS_LABELS[f.status]||f.status}</span></td>
            <td>${escHtml(f.auditor||'—')}</td>
            <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(f.auditedArea||'—')}</td>
            <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(f.observation||'')}">${escHtml(f.observation||'—')}</td>
            <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(f.requirement||'')}">${escHtml(f.requirement||'—')}</td>
            <td style="text-align:center;color:${openActs>0?'#fb923c':'var(--text-muted)'}">${openActs}</td>
          </tr>`
        }).join('')}
        </tbody>
      </table>`
  } else if (type === 'risks') {
    const lvColor = { critical:'#dc2626', high:'#ea580c', medium:'#ca8a04', low:'#16a34a', info:'#6b7280' }
    el.innerHTML = `
      <h3 class="report-result-title">${t('risk_register')} (${data.total} ${t('risk_approved').toLowerCase()})</h3>
      <div class="report-kpi-row" style="margin-bottom:16px">
        <div class="report-kpi"><span class="report-kpi-val" style="color:#dc2626">${data.byLevel?.critical||0}</span><span class="report-kpi-label">${t('riskl_critical')}</span></div>
        <div class="report-kpi"><span class="report-kpi-val" style="color:#ea580c">${data.byLevel?.high||0}</span><span class="report-kpi-label">${t('riskl_high')}</span></div>
        <div class="report-kpi"><span class="report-kpi-val" style="color:#ca8a04">${data.byLevel?.medium||0}</span><span class="report-kpi-label">${t('riskl_medium')}</span></div>
        <div class="report-kpi"><span class="report-kpi-val" style="color:#16a34a">${data.byLevel?.low||0}</span><span class="report-kpi-label">${t('riskl_low')}</span></div>
        <div class="report-kpi"><span class="report-kpi-val">${data.bySource?.scan||0}</span><span class="report-kpi-label">${t('reports_fromScan')}</span></div>
        <div class="report-kpi"><span class="report-kpi-val">${data.bySource?.manual||0}</span><span class="report-kpi-label">${t('reports_manual')}</span></div>
      </div>
      <table class="report-table">
        <thead><tr><th>${t('col_title')}</th><th>${t('col_category')}</th><th>${t('findings_severity')}</th><th>${t('col_status')}</th><th>CVSS</th><th>CVEs</th><th>${t('ui_score')}</th><th>${t('col_owner')}</th><th>${t('reports_source')}</th></tr></thead>
        <tbody>${(data.risks||[]).map(r => {
          const cvssVal  = r.cvssScore != null ? r.cvssScore.toFixed(1) : null
          const cvssData = cvssVal ? cvssInfo(r.cvssScore) : null
          return `<tr>
            <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(r.title)}">${escHtml(r.title)}</td>
            <td>${escHtml(r.category||'—')}</td>
            <td><span style="color:${lvColor[r.level]||'#888'};font-weight:600">${_riskLevelLabel(r.level)}</span></td>
            <td><span class="status-badge status-${r.status}">${_riskStatusLabel(r.status)}</span></td>
            <td>${cvssVal ? `<span class="cvss-badge ${cvssData?.cls||''}" style="font-size:.75rem">${cvssVal}</span>` : '—'}</td>
            <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(r.cveIds||[]).join(', ')||'—'}</td>
            <td style="text-align:center">${r.score != null ? r.score : '—'}</td>
            <td>${escHtml(r.owner||'—')}</td>
            <td>${r.source === 'greenbone-scan' ? `<span class="badge-review-pending" style="background:#3b82f6;color:#fff;font-size:.7rem">${t('reports_scanBadge')}</span>` : t('reports_manual')}</td>
          </tr>`
        }).join('')}
        </tbody>
      </table>`
  } else {
    el.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`
  }
}

async function exportReportCsv() {
  if (!_activeReportType) return alert('Please select a report first.')
  const entity = dom('reportEntitySel')?.value || ''
  const fw     = dom('reportFwSel')?.value || ''
  const params = new URLSearchParams({ type: _activeReportType })
  if (entity) params.set('entity', entity)
  if (fw)     params.set('framework', fw)
  const res = await fetch('/reports/export/csv?' + params.toString(), { headers: apiHeaders('reader') })
  if (!res.ok) { alert('CSV export failed'); return }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `report-${_activeReportType}-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportReportJson() {
  if (!_lastReportData) return alert('Please generate a report first.')
  const blob = new Blob([JSON.stringify(_lastReportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `isms-report-${_activeReportType}-${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function exportReportPdf() {
  const resultEl = dom('reportResult')
  if (!resultEl || !_lastReportData) return alert('Please generate a report first.')
  const title = `ISMS Report — ${(_activeReportType||'').replace(/_/g,' ')} — ${new Date().toLocaleDateString('en-GB')}`
  const win = window.open('', '_blank')
  if (!win) return alert(t('err_popupBlocked'))
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
      h1   { font-size: 16px; margin-bottom: 4px; }
      .sub { font-size: 11px; color: #666; margin-bottom: 16px; }
      table { border-collapse: collapse; width: 100%; margin-top: 12px; }
      th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; font-size: 11px; }
      th { background: #f0f0f0; font-weight: bold; }
      .kpi-row { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
      .kpi { background: #f5f5f5; border-radius: 6px; padding: 8px 14px; text-align: center; min-width: 70px; }
      .kpi-val { font-size: 20px; font-weight: bold; display: block; }
      .kpi-lbl { font-size: 10px; color: #666; }
      @media print { body { margin: 0; } }
    </style>
  </head><body>
    <h1>${title}</h1>
    <div class="sub">${t('reports_generatedOn')}: ${new Date().toLocaleString('en-GB')} · ISMS Builder</div>
    ${resultEl.innerHTML}
    <script>window.onload = () => { window.print() }<\/script>
  </body></html>`)
  win.document.close()
}

// ── Findings UI ───────────────────────────────────────────────────────────────

function _findingSeverityBadge(sev) {
  const label = FINDING_SEVERITY_LABELS[sev] || sev
  const color = FINDING_SEVERITY_COLOR[sev]  || '#888'
  return `<span class="soa-status-badge" style="background:${color}22;color:${color};border-color:${color}44">${label}</span>`
}

function _findingStatusBadge(st) {
  const label = FINDING_STATUS_LABELS[st] || st
  const color = FINDING_STATUS_COLOR[st]  || '#888'
  return `<span class="soa-status-badge" style="background:${color}22;color:${color};border-color:${color}44">${label}</span>`
}

async function renderFindingsTab() {
  const content = dom('reportsMainContent')
  if (!content) return
  const rank    = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.auditor
  const isAdmin = rank >= ROLE_RANK.admin

  const [findRes, sumRes] = await Promise.all([
    fetch('/findings', { headers: apiHeaders() }),
    fetch('/findings/summary', { headers: apiHeaders() }),
  ])
  const findings = findRes.ok ? await findRes.json() : []
  const sum      = sumRes.ok  ? await sumRes.json()  : {}

  const tabs = [
    { id: 'list',     label: t('findings_tabList'),     icon: 'ph-list-bullets' },
    { id: 'open',     label: t('findings_tabOpen'),     icon: 'ph-warning-circle' },
    { id: 'resolved', label: t('findings_tabResolved'), icon: 'ph-check-circle' },
  ]

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;flex-wrap:wrap">
      <h3 style="margin:0;font-size:15px;font-weight:700;color:var(--text-inv)">
        <i class="ph ph-magnifying-glass"></i> ${t('findings_title')}
      </h3>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="exportFindingsJson()"><i class="ph ph-download-simple"></i> JSON</button>
        <button class="btn btn-secondary btn-sm" onclick="exportFindingsCsv()"><i class="ph ph-file-csv"></i> CSV</button>
        <button class="btn btn-secondary btn-sm" onclick="exportFindingsPdf()"><i class="ph ph-file-pdf"></i> PDF</button>
        ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openFindingForm()">
          <i class="ph ph-plus"></i> ${t('findings_new')}
        </button>` : ''}
      </div>
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      ${[
        { label:t('common_total'), value: sum.total || 0,           color:'var(--text-primary)' },
        { label:t('findings_critical'), value: sum.bySeverity?.critical||0, color: FINDING_SEVERITY_COLOR.critical },
        { label:t('findings_high'), value: sum.bySeverity?.high||0,     color: FINDING_SEVERITY_COLOR.high },
        { label:t('findings_open'), value: sum.byStatus?.open||0,        color: FINDING_STATUS_COLOR.open },
        { label:t('findings_actionsOpenShort'), value: sum.openActions||0,           color: sum.openActions > 0 ? '#fbbf24':'#4ade80' },
        { label:t('findings_actionsOverdueShort'), value: sum.overdueActions||0,   color: sum.overdueActions > 0 ? FINDING_SEVERITY_COLOR.critical:'#4ade80' },
      ].map(k => `
        <div class="dash-card kpi" style="flex:1;min-width:100px;padding:10px 14px;text-align:center">
          <div style="font-size:1.4rem;font-weight:700;color:${k.color}">${k.value}</div>
          <div style="font-size:.72rem;color:var(--text-subtle)">${k.label}</div>
        </div>
      `).join('')}
    </div>

    <div class="training-tab-bar" style="margin-bottom:12px">
      ${tabs.map(tb => `<button class="training-tab${_findingsTab===tb.id?' active':''}" data-tab="${tb.id}"
        onclick="_switchFindingsTab('${tb.id}')">
        <i class="ph ${tb.icon}"></i> ${tb.label}
      </button>`).join('')}
    </div>

    <div id="findingsListArea"></div>
  `
  _renderFindingsList(findings, findings)
}

function _switchFindingsTab(tab) {
  _findingsTab = tab
  document.querySelectorAll('#reportsMainContent .training-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab)
  )
  fetch('/findings', { headers: apiHeaders() })
    .then(r => r.ok ? r.json() : [])
    .then(all => {
      const filtered = tab === 'open'     ? all.filter(f => f.status === 'open' || f.status === 'in_progress')
                     : tab === 'resolved' ? all.filter(f => f.status === 'resolved' || f.status === 'accepted')
                     : all
      _renderFindingsList(all, filtered)
    })
    .catch(() => {})
}

function _renderFindingsList(all, list) {
  const area = dom('findingsListArea')
  if (!area) return
  const rank    = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.auditor
  const isAdmin = rank >= ROLE_RANK.admin

  if (!list.length) {
    area.innerHTML = `<div class="report-empty" style="padding:32px;text-align:center;color:var(--text-subtle)">
      <i class="ph ph-magnifying-glass" style="font-size:32px;display:block;margin-bottom:8px"></i>
      ${t('findings_none')}
    </div>`
    return
  }

  area.innerHTML = list.map(f => {
    const actOpen = (f.actions || []).filter(a => a.status !== 'done').length
    const actTotal = (f.actions || []).length
    return `
    <div class="risk-item" style="cursor:pointer" onclick="openFindingDetail('${f.id}')">
      <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-size:11px;color:var(--text-subtle);font-family:monospace">${escHtml(f.ref)}</span>
            ${_findingSeverityBadge(f.severity)}
            ${_findingStatusBadge(f.status)}
          </div>
          <div style="font-weight:600;color:var(--text-inv);margin-bottom:2px">${escHtml(f.title)}</div>
          <div style="font-size:12px;color:var(--text-subtle)">${escHtml(f.auditedArea || '')}
            ${f.auditor ? `· ${t('findings_auditor')}: ${escHtml(f.auditor)}` : ''}
            ${f.auditPeriodFrom ? `· ${f.auditPeriodFrom}${f.auditPeriodTo?' – '+f.auditPeriodTo:''}` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span style="font-size:11px;color:${actOpen>0?'#fbbf24':'var(--text-subtle)'}">
            <i class="ph ph-checks"></i> ${actOpen}/${actTotal} ${t('findings_statusOpen').toLowerCase()}
          </span>
          ${canEdit ? `
          <button class="btn btn-sm" onclick="event.stopPropagation();openFindingForm('${f.id}')">
            <i class="ph ph-pencil-simple"></i>
          </button>` : ''}
          ${isAdmin ? `
          <button class="btn btn-sm" style="color:var(--danger)" onclick="event.stopPropagation();deleteFinding('${f.id}')">
            <i class="ph ph-trash-simple"></i>
          </button>` : ''}
        </div>
      </div>
      ${f.observation ? `<div style="font-size:12px;color:var(--text-subtle);margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">
        <b>${t('findings_observation_field')}:</b> ${escHtml(f.observation.slice(0,120))}${f.observation.length>120?'…':''}
      </div>` : ''}
    </div>`
  }).join('')
}

async function openFindingDetail(id) {
  const content = dom('reportsMainContent')
  if (!content) return
  _findingFormBack = _findingsTab
  const r = await fetch(`/findings/${id}`, { headers: apiHeaders() })
  if (!r.ok) return
  const f = await r.json()
  const rank    = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.auditor
  const canAct  = rank >= ROLE_RANK.editor

  const actions    = f.actions || []
  const actDone    = actions.filter(a => a.status === 'done').length
  const actTotal   = actions.length
  const actPct     = actTotal > 0 ? Math.round((actDone / actTotal) * 100) : 0
  const pbarColor  = actPct === 100 ? '#4ade80' : actPct >= 50 ? '#fbbf24' : '#fb923c'

  content.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchReportsMainTab('findings')">
          <i class="ph ph-arrow-left"></i> ${t('common_back')}
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-magnifying-glass"></i>
          <span style="font-size:12px;color:var(--text-subtle);font-family:monospace">${escHtml(f.ref)}</span>
          ${escHtml(f.title)}
        </h3>
        <button class="btn btn-secondary btn-sm" style="margin-left:auto" onclick="printFindingDetail('${f.id}')">
          <i class="ph ph-printer"></i> ${t('common_print')} / PDF
        </button>
      </div>
      <div class="training-form-body">

        <div class="training-form-section">
          <h4 class="training-form-section-title" style="display:flex;align-items:center;gap:8px">
            ${t('findings_singular')} ${_findingSeverityBadge(f.severity)} ${_findingStatusBadge(f.status)}
          </h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-bottom:12px;font-size:13px">
            <div><span style="color:var(--text-subtle)">${t('findings_auditedArea')}:</span> ${escHtml(f.auditedArea||'—')}</div>
            <div><span style="color:var(--text-subtle)">${t('findings_auditor')}:</span> ${escHtml(f.auditor||'—')}</div>
            <div><span style="color:var(--text-subtle)">${t('findings_period')}:</span>
              ${f.auditPeriodFrom ? escHtml(f.auditPeriodFrom)+(f.auditPeriodTo?' – '+escHtml(f.auditPeriodTo):'') : '—'}
            </div>
            <div><span style="color:var(--text-subtle)">${t('findings_created')}:</span> ${f.createdAt?.slice(0,10)||'—'}</div>
          </div>

          <div class="form-group">
            <label class="form-label" style="color:var(--warn)">📋 ${t('findings_observationFull')}</label>
            <div style="background:var(--raised);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:13px;white-space:pre-wrap">${escHtml(f.observation||'—')}</div>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:#60a5fa">🎯 ${t('findings_requirementFull')}</label>
            <div style="background:var(--raised);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:13px;white-space:pre-wrap">${escHtml(f.requirement||'—')}</div>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:${FINDING_SEVERITY_COLOR.high}">⚠ ${t('findings_impact')}</label>
            <div style="background:var(--raised);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:13px;white-space:pre-wrap">${escHtml(f.impact||'—')}</div>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:#4ade80">💡 ${t('findings_recommendation')}</label>
            <div style="background:var(--raised);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:13px;white-space:pre-wrap">${escHtml(f.recommendation||'—')}</div>
          </div>
        </div>

        <div class="training-form-section" id="actionsSection">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <h4 class="training-form-section-title" style="margin:0">
              <i class="ph ph-check-square"></i> ${t('findings_actions')}
            </h4>
            ${canAct ? `<button class="btn btn-primary btn-sm" onclick="openAddActionForm('${f.id}')">
              <i class="ph ph-plus"></i> ${t('risk_measure')}
            </button>` : ''}
          </div>
          ${actTotal > 0 ? `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-subtle);margin-bottom:4px">
              <span>${t('dash_progress')}</span>
              <span>${actDone} / ${actTotal} ${t('findings_statusDone').toLowerCase()} (${actPct} %)</span>
            </div>
            <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
              <div style="height:100%;width:${actPct}%;background:${pbarColor};border-radius:4px;transition:width .3s ease"></div>
            </div>
          </div>` : ''}
          <div id="actionsList">
            ${_renderActionsList(f.actions || [], f.id, canAct)}
          </div>
        </div>

        ${canEdit ? `
        <div class="training-form-section">
          <button class="btn btn-primary" onclick="openFindingForm('${f.id}')">
            <i class="ph ph-pencil-simple"></i> ${t('findings_edit')}
          </button>
        </div>` : ''}
      </div>
    </div>
  `
}

async function printFindingDetail(findingId) {
  const r = await fetch(`/findings/${findingId}`, { headers: apiHeaders() })
  if (!r.ok) return
  const f = await r.json()
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const actions = f.actions || []
  const done = actions.filter(a => a.status === 'done').length
  const pct  = actions.length ? Math.round(done / actions.length * 100) : 0
  const sevColor = { critical:'#c0392b', high:'#e67e22', medium:'#f39c12', low:'#27ae60', observation:'#2980b9' }
  const actLabel = FINDING_ACT_STATUS_LABELS
  const win = window.open('', '_blank')
  if (!win) return alert(t('err_popupBlocked'))
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>${esc(f.ref)} — ${esc(f.title)}</title>
    <style>
      body  { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 28px; }
      h1    { font-size: 15px; margin: 0 0 2px; }
      .meta { font-size: 11px; color: #666; margin-bottom: 18px; }
      .badge{ display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700; color:#fff; margin-left:6px; }
      .section { margin-bottom: 16px; }
      .section h2 { font-size: 12px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 8px; }
      .field  { margin-bottom: 10px; }
      .label  { font-size: 10px; font-weight: bold; color: #555; margin-bottom: 2px; }
      .value  { background: #f8f8f8; border: 1px solid #ddd; border-radius: 4px; padding: 6px 10px; white-space: pre-wrap; }
      .grid2  { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-bottom: 10px; font-size: 11px; }
      .pbar-wrap { background: #e0e0e0; border-radius: 4px; height: 8px; margin: 4px 0 2px; }
      .pbar { height: 100%; border-radius: 4px; background: ${pct===100?'#27ae60':pct>=50?'#f39c12':'#e74c3c'}; width: ${pct}%; }
      table { border-collapse: collapse; width: 100%; margin-top: 8px; }
      th, td { border: 1px solid #ccc; padding: 4px 8px; font-size: 11px; text-align: left; }
      th { background: #f0f0f0; font-weight: bold; }
      @media print { body { margin: 0; } }
    </style>
  </head><body>
    <h1>${esc(f.ref)} — ${esc(f.title)}
      <span class="badge" style="background:${sevColor[f.severity]||'#888'}">${esc(f.severity||'')}</span>
      <span class="badge" style="background:#555">${esc(f.status||'')}</span>
    </h1>
    <div class="meta">${t('findings_created')}: ${(f.createdAt||'').slice(0,10)} · ${t('findings_auditor')}: ${esc(f.auditor)} · ${t('findings_auditedArea')}: ${esc(f.auditedArea)}</div>

    <div class="section">
      <h2>${t('findings_singular')}</h2>
      <div class="grid2">
        <div><span style="color:#555">${t('findings_period')}:</span> ${esc(f.auditPeriodFrom||'—')}${f.auditPeriodTo?' – '+esc(f.auditPeriodTo):''}</div>
        <div><span style="color:#555">${t('findings_linkedControls')}:</span> ${(f.linkedControls||[]).join(', ')||'—'}</div>
      </div>
      <div class="field"><div class="label">${t('findings_observationFull')}</div><div class="value">${esc(f.observation)}</div></div>
      <div class="field"><div class="label">${t('findings_requirementFull')}</div><div class="value">${esc(f.requirement)}</div></div>
      <div class="field"><div class="label">${t('findings_impact')}</div><div class="value">${esc(f.impact)}</div></div>
      <div class="field"><div class="label">${t('findings_recommendation')}</div><div class="value">${esc(f.recommendation)}</div></div>
    </div>

    <div class="section">
      <h2>${t('findings_actions')} — ${done} / ${actions.length} ${t('findings_statusDone').toLowerCase()} (${pct} %)</h2>
      <div class="pbar-wrap"><div class="pbar"></div></div>
      ${actions.length === 0 ? `<p style="color:#999;font-size:11px">${t('findings_noActions')}</p>` : `
      <table>
        <thead><tr><th>${t('risk_measure')}</th><th>${t('col_responsible')}</th><th>${t('col_dueDate')}</th><th>${t('col_status')}</th></tr></thead>
        <tbody>
          ${actions.map(a => `<tr>
            <td>${esc(a.description)}</td>
            <td>${esc(a.responsible||'—')}</td>
            <td style="${a.status!=='done'&&a.dueDate&&new Date(a.dueDate)<new Date()?'color:#c0392b;font-weight:bold':''}">${esc(a.dueDate||'—')}</td>
            <td>${esc(actLabel[a.status]||a.status)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>
    <script>window.onload = () => window.print()<\/script>
  </body></html>`)
  win.document.close()
}

async function exportFindingsJson() {
  const r = await fetch('/findings', { headers: apiHeaders() })
  if (!r.ok) return
  const data = await r.json()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `findings-${new Date().toISOString().slice(0,10)}.json`; a.click()
  URL.revokeObjectURL(url)
}

async function exportFindingsCsv() {
  const r = await fetch('/findings', { headers: apiHeaders() })
  if (!r.ok) return
  const list = await r.json()
  const cols = ['ref','title','severity','status','auditedArea','auditor','auditPeriodFrom','auditPeriodTo','createdAt']
  const esc  = v => `"${String(v||'').replace(/"/g,'""')}"`
  const rows = [cols.join(','), ...list.map(f => cols.map(c => esc(f[c])).join(','))]
  const blob = new Blob([rows.join('\r\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `findings-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  URL.revokeObjectURL(url)
}

async function exportFindingsPdf() {
  const r = await fetch('/findings', { headers: apiHeaders() })
  if (!r.ok) return
  const list = await r.json()
  const esc  = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  const sevColor = { critical:'#c0392b', high:'#e67e22', medium:'#f39c12', low:'#27ae60', observation:'#2980b9' }
  const win  = window.open('', '_blank')
  if (!win) return alert(t('err_popupBlocked'))
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>${t('findings_title')} — ${new Date().toLocaleDateString()}</title>
    <style>
      body  { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 28px; }
      h1    { font-size: 15px; margin-bottom: 4px; }
      .sub  { font-size: 11px; color: #666; margin-bottom: 16px; }
      table { border-collapse: collapse; width: 100%; }
      th, td{ border: 1px solid #ccc; padding: 4px 8px; font-size: 11px; text-align: left; }
      th    { background: #f0f0f0; font-weight: bold; }
      .badge{ display:inline-block; padding:1px 7px; border-radius:8px; font-size:10px; font-weight:700; color:#fff; }
      @media print { body { margin: 0; } }
    </style>
  </head><body>
    <h1><i>${t('findings_title')}</i></h1>
    <div class="sub">${t('dash_status')} ${new Date().toLocaleString()} · ISMS Builder · ${list.length} ${t('auditLog_total').toLowerCase()}</div>
    <table>
      <thead><tr>
        <th>Ref</th><th>${t('col_title')}</th><th>${t('findings_severity')}</th><th>${t('col_status')}</th>
        <th>${t('findings_auditedArea')}</th><th>${t('findings_auditor')}</th><th>${t('findings_period')}</th><th>${t('findings_actions')}</th>
      </tr></thead>
      <tbody>
        ${list.map(f => {
          const done  = (f.actions||[]).filter(a => a.status==='done').length
          const total = (f.actions||[]).length
          return `<tr>
            <td style="font-family:monospace;white-space:nowrap">${esc(f.ref)}</td>
            <td>${esc(f.title)}</td>
            <td><span class="badge" style="background:${sevColor[f.severity]||'#888'}">${esc(f.severity)}</span></td>
            <td>${esc(f.status)}</td>
            <td>${esc(f.auditedArea)}</td>
            <td>${esc(f.auditor)}</td>
            <td style="white-space:nowrap">${esc(f.auditPeriodFrom||'—')}${f.auditPeriodTo?' – '+esc(f.auditPeriodTo):''}</td>
            <td style="text-align:center">${done}/${total}</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
    <script>window.onload = () => window.print()<\/script>
  </body></html>`)
  win.document.close()
}

function _renderActionsList(actions, findingId, canEdit) {
  if (!actions.length) return `<div style="color:var(--text-subtle);font-size:13px;padding:8px 0">${t('findings_noActions')}</div>`
  return actions.map(a => {
    const colAct = a.status === 'done' ? '#4ade80' : a.status === 'in_progress' ? '#fbbf24' : '#f87171'
    const overdue = a.status !== 'done' && a.dueDate && new Date(a.dueDate) < new Date()
    return `
    <div class="risk-item" style="padding:10px 14px;margin-bottom:8px">
      <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;margin-bottom:3px">${escHtml(a.description)}</div>
          <div style="font-size:12px;color:var(--text-subtle)">
            ${t('col_responsible')}: <b>${escHtml(a.responsible||'—')}</b>
            ${a.dueDate ? `· ${t('col_due')} <span style="color:${overdue?'#f87171':'inherit'}">${a.dueDate}${overdue?' ⚠':''}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          ${canEdit ? `<select class="select" style="font-size:11px;padding:2px 6px"
            onchange="updateActionStatus('${findingId}','${a.id}',this.value)">
            ${Object.entries(FINDING_ACT_STATUS_LABELS).map(([v,l]) =>
              `<option value="${v}"${a.status===v?' selected':''}>${l}</option>`).join('')}
          </select>
          <button class="btn btn-sm" style="color:var(--danger)" title="${t('delete')}"
            onclick="deleteAction('${findingId}','${a.id}')">
            <i class="ph ph-trash-simple"></i>
          </button>` : `<span style="color:${colAct};font-size:12px">${FINDING_ACT_STATUS_LABELS[a.status]||a.status}</span>`}
        </div>
      </div>
    </div>`
  }).join('')
}

async function openAddActionForm(findingId) {
  const area = dom('actionsList')
  if (!area) return
  const formId = `addActionForm_${findingId}`
  if (dom(formId)) { dom(formId).remove(); return }
  const el = document.createElement('div')
  el.id = formId
  el.style.cssText = 'background:var(--raised);border:1px solid var(--border);border-radius:6px;padding:14px;margin-bottom:10px'
  el.innerHTML = `
    <div class="form-group">
      <label class="form-label">${t('risk_measure')} <span class="form-required">*</span></label>
      <textarea id="actDesc" class="form-input" rows="2" placeholder="${t('findings_actionDescPlaceholder')}"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${t('col_responsible')}</label>
        <input id="actResp" class="form-input" placeholder="${t('findings_responsiblePlaceholder')}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('findings_targetDate')}</label>
        <input id="actDue" class="form-input" type="date">
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-primary btn-sm" onclick="saveNewAction('${findingId}')">${t('save')}</button>
      <button class="btn btn-secondary btn-sm" onclick="dom('${formId}').remove()">${t('cancel')}</button>
    </div>
  `
  area.prepend(el)
  dom('actDesc').focus()
}

async function saveNewAction(findingId) {
  const desc = dom('actDesc')?.value.trim()
  if (!desc) { dom('actDesc')?.focus(); return }
  const resp = dom('actResp')?.value.trim()
  const due  = dom('actDue')?.value || null
  const r = await fetch(`/findings/${findingId}/actions`, {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: desc, responsible: resp, dueDate: due })
  })
  if (!r.ok) { showToast(t('err_saveFailed'), 'error'); return }
  openFindingDetail(findingId)
}

async function updateActionStatus(findingId, actionId, status) {
  await fetch(`/findings/${findingId}/actions/${actionId}`, {
    method: 'PUT',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  // Aktualisiere nur die Actions-Liste ohne ganzes Detail neu zu laden
  const r = await fetch(`/findings/${findingId}`, { headers: apiHeaders() })
  if (!r.ok) return
  const f = await r.json()
  const rank = ROLE_RANK[getCurrentRole()] || 0
  const canAct = rank >= ROLE_RANK.editor
  const area = dom('actionsList')
  if (area) area.innerHTML = _renderActionsList(f.actions || [], findingId, canAct)
}

async function deleteAction(findingId, actionId) {
  if (!confirm(t('findings_deleteActionConfirm'))) return
  await fetch(`/findings/${findingId}/actions/${actionId}`, { method: 'DELETE', headers: apiHeaders() })
  openFindingDetail(findingId)
}

async function openFindingForm(id = null) {
  const content = dom('reportsMainContent')
  if (!content) return
  const isEdit = !!id
  let f = null
  if (isEdit) {
    const r = await fetch(`/findings/${id}`, { headers: apiHeaders() })
    if (r.ok) f = await r.json()
  }

  content.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchReportsMainTab('findings')">
          <i class="ph ph-arrow-left"></i> ${t('common_back')}
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-magnifying-glass"></i>
          ${isEdit ? `${t('findings_edit')} <span style="font-family:monospace;font-size:12px;color:var(--text-subtle)">${escHtml(f?.ref||'')}</span>` : t('findings_new')}
        </h3>
      </div>
      <div class="training-form-body">

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-info"></i> ${t('findings_basicData')}</h4>
          <div class="form-group">
            <label class="form-label">${t('col_title')} <span class="form-required">*</span></label>
            <input id="fndTitle" class="form-input" value="${escHtml(f?.title||'')}" placeholder="${t('findings_titlePlaceholder')}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('findings_severity')}</label>
              <select id="fndSeverity" class="select">
                ${Object.entries(FINDING_SEVERITY_LABELS).map(([v,l]) =>
                  `<option value="${v}"${(f?.severity||'medium')===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('col_status')}</label>
              <select id="fndStatus" class="select">
                ${Object.entries(FINDING_STATUS_LABELS).map(([v,l]) =>
                  `<option value="${v}"${(f?.status||'open')===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('findings_auditedArea')}</label>
              <input id="fndArea" class="form-input" value="${escHtml(f?.auditedArea||'')}" placeholder="z.B. IT-Operations / ISO A.8">
            </div>
            <div class="form-group">
              <label class="form-label">${t('findings_auditor')}</label>
              <input id="fndAuditor" class="form-input" value="${escHtml(f?.auditor||'')}" placeholder="${t('findings_auditorPlaceholder')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('findings_periodFrom')}</label>
              <input id="fndPeriodFrom" class="form-input" type="date" value="${f?.auditPeriodFrom||''}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('reports_to')}</label>
              <input id="fndPeriodTo" class="form-input" type="date" value="${f?.auditPeriodTo||''}">
            </div>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-clipboard-text"></i> ${t('findings_details')}</h4>
          <div class="form-group">
            <label class="form-label" style="color:var(--warn)">📋 ${t('findings_observationFull')}</label>
            <textarea id="fndObservation" class="form-input" rows="4"
              placeholder="${t('findings_observationPlaceholder')}">${escHtml(f?.observation||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:#60a5fa">🎯 ${t('findings_requirementFull')}</label>
            <textarea id="fndRequirement" class="form-input" rows="3"
              placeholder="${t('findings_requirementPlaceholder')}">${escHtml(f?.requirement||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:${FINDING_SEVERITY_COLOR.high}">⚠ ${t('findings_impact')}</label>
            <textarea id="fndImpact" class="form-input" rows="3"
              placeholder="${t('findings_impactPlaceholder')}">${escHtml(f?.impact||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:#4ade80">💡 ${t('findings_recommendation')}</label>
            <textarea id="fndRecommendation" class="form-input" rows="3"
              placeholder="${t('findings_recommendationPlaceholder')}">${escHtml(f?.recommendation||'')}</textarea>
          </div>
        </div>

        <div class="training-form-section">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="saveFinding(${id ? `'${id}'` : 'null'})">
              <i class="ph ph-floppy-disk"></i> ${isEdit ? t('save') : t('findings_create')}
            </button>
            <button class="btn btn-secondary" onclick="switchReportsMainTab('findings')">${t('cancel')}</button>
            ${isEdit ? `<button class="btn btn-secondary" onclick="openFindingDetail('${id}')">
              <i class="ph ph-eye"></i> ${t('findings_detailView')}
            </button>` : ''}
          </div>
          <p id="findingSaveMsg" style="margin-top:8px;font-size:13px;display:none"></p>
        </div>
      </div>
    </div>
  `
  dom('fndTitle').focus()
}

async function saveFinding(id) {
  const title = dom('fndTitle')?.value.trim()
  if (!title) { dom('fndTitle')?.focus(); showToast(t('findings_titleRequired'), 'error'); return }
  const payload = {
    title,
    severity:        dom('fndSeverity')?.value,
    status:          dom('fndStatus')?.value,
    auditedArea:     dom('fndArea')?.value.trim(),
    auditor:         dom('fndAuditor')?.value.trim(),
    auditPeriodFrom: dom('fndPeriodFrom')?.value || null,
    auditPeriodTo:   dom('fndPeriodTo')?.value   || null,
    observation:     dom('fndObservation')?.value.trim(),
    requirement:     dom('fndRequirement')?.value.trim(),
    impact:          dom('fndImpact')?.value.trim(),
    recommendation:  dom('fndRecommendation')?.value.trim(),
  }
  const r = await fetch(id ? `/findings/${id}` : '/findings', {
    method: id ? 'PUT' : 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const msg = dom('findingSaveMsg')
  if (r.ok) {
    const saved = await r.json()
    if (msg) { msg.textContent = id ? t('msg_saved') : t('findings_createdMessage', { ref: saved.ref }); msg.style.color = 'var(--success,#4ade80)'; msg.style.display = '' }
    setTimeout(() => { if (id) openFindingDetail(id); else switchReportsMainTab('findings') }, 1000)
  } else {
    const e = await r.json().catch(() => ({}))
    if (msg) { msg.textContent = t('error') + ': ' + (e.error || r.status); msg.style.color = 'var(--danger-text,#f87171)'; msg.style.display = '' }
  }
}

async function deleteFinding(id) {
  if (!confirm(t('findings_trashConfirm'))) return
  const r = await fetch(`/findings/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (r.ok) { showToast(t('findings_deleted'), 'success'); switchReportsMainTab('findings') }
  else showToast(t('err_delete'), 'error')
}

// ── Ende Findings UI ──────────────────────────────────────────────────────────

function renderSectionContent(sectionId){
  const editorCard = document.querySelector('.editor-card')
  const listPanel = dom('listPanel')

  removeAllDynamicPanels()
  // Chrome behält scroll-Position beim Sektionswechsel — zurücksetzen
  const editorEl = dom('editor')
  if (editorEl) editorEl.scrollTop = 0

  if (sectionId === 'dashboard') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderDashboard()
    return
  }
  if (sectionId === 'soa') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderSoa()
    return
  }
  if (sectionId === 'reports') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderReports()
    return
  }
  if (sectionId === 'admin') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderAdminPanel()
    return
  }
  if (sectionId === 'risk') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderRisk()
    return
  }
  if (sectionId === 'gdpr') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderGDPR()
    return
  }
  if (sectionId === 'calendar') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderCalendar()
    return
  }

  if (sectionId === 'settings') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderSettingsPanel()
    return
  }

  editorCard.style.display = ''
  listPanel.style.display = ''

  if (sectionId === 'guidance') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderGuidance()
    return
  } else if (sectionId === 'training') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderTraining()
    return
  } else if (sectionId === 'incident') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderIncidentInbox()
    return
  } else if (sectionId === 'legal') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderLegal()
    return
  } else if (sectionId === 'goals') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderGoals()
    return
  } else if (sectionId === 'assets') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderAssets()
    return
  } else if (sectionId === 'governance') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderGovernance()
    return
  } else if (sectionId === 'nis2') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderNis2()
    return
  } else if (sectionId === 'bcm') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderBcm()
    return
  } else if (sectionId === 'suppliers') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderSuppliers()
    return
  } else if (sectionId === 'policy-acks') {
    editorCard.style.display = 'none'
    listPanel.style.display = 'none'
    renderPolicyAcks()
    return
  } else {
    dom('inputTitle').value = `Section: ${sectionId}`
    dom('contentEditor').value = `Content for ${sectionId} – to be filled in future iterations.`
  }
}

// ════════════════════════════════════════════════════════════
// INCIDENT INBOX – CISO-Bearbeitungsmaske
// ════════════════════════════════════════════════════════════

let INC_TYPE_LABELS = {
  malware:            'Malware',
  phishing:           'Phishing / Scam',
  data_theft:         'Data Theft / Data Loss',
  ransomware:         'Ransomware',
  unauthorized_access:'Unauthorised Access',
  social_engineering: 'CEO Fraud / Identity Abuse',
  other:              'Other',
}
const INC_CLEANED_LABELS = { get yes() { return t('incl_clYes') }, get no() { return t('incl_clNo') }, get partial() { return t('incl_clPartial') } }
const INC_STATUS_LABELS  = { get new() { return t('incl_stNew') }, get in_review() { return t('incl_stReview') }, get assigned() { return t('incl_stAssigned') }, get closed() { return t('incl_stClosed') } }
const INC_STATUS_CLS     = { new: 'risk-badge risk-l-high', in_review: 'risk-badge risk-l-medium', assigned: 'risk-badge risk-l-low', closed: 'risk-badge' }

let _incidentDetail = null

async function renderIncidentInbox() {
  dom('incidentContainer')?.remove()
  const container = document.createElement('div')
  container.id = 'incidentContainer'
  container.className = 'incident-inbox-container'
  dom('editor').appendChild(container)

  container.innerHTML = `
    <div class="incident-inbox-page">
      <div class="incident-inbox-header">
        <h2><i class="ph ph-siren"></i> ${t('inc_inboxTitle')}</h2>
        <div style="display:flex;gap:8px;align-items:center;">
          <select class="select" id="incStatusFilter" onchange="loadIncidents()" style="font-size:.82rem">
            <option value="">${t('filter_allStatuses')}</option>
            <option value="new">${t('inc_statusNew')}</option>
            <option value="in_review">${t('inc_statusReview')}</option>
            <option value="assigned">${t('inc_statusAssigned')}</option>
            <option value="closed">${t('inc_statusClosed')}</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="loadIncidents()">
            <i class="ph ph-arrow-clockwise"></i> ${t('refresh')}
          </button>
        </div>
      </div>
      <div class="incident-inbox-body">
        <div class="incident-list-panel" id="incListPanel">
          <p class="report-loading">${t('loading')}</p>
        </div>
        <div class="incident-detail-panel" id="incDetailPanel">
          <div class="incident-detail-empty">
            <i class="ph ph-siren" style="font-size:40px;color:var(--text-disabled)"></i>
            <p>${t('inc_select')}</p>
          </div>
        </div>
      </div>
    </div>`

  await loadIncidents()
}

async function loadIncidents() {
  const status = document.getElementById('incStatusFilter')?.value || ''
  const panel  = document.getElementById('incListPanel')
  if (!panel) return
  panel.innerHTML = `<p class="report-loading">${t('loading')}</p>`

  const res  = await fetch('/public/incidents' + (status ? `?status=${status}` : ''), { headers: apiHeaders() })
  const list = res.ok ? await res.json() : []

  if (list.length === 0) {
    panel.innerHTML = `<p class="gdpr-empty" style="padding:20px">${t('inc_none')}</p>`
    return
  }

  panel.innerHTML = `
    <table class="incident-table">
      <thead><tr>
        <th>${t('inc_reference')}</th><th>${t('col_date')}</th><th>${t('inc_company')}</th>
        <th>${t('col_type')}</th><th>${t('col_status')}</th>
      </tr></thead>
      <tbody>
        ${list.map(i => `
          <tr class="incident-row ${_incidentDetail?.id === i.id ? 'active' : ''}"
              onclick="openIncidentDetail('${i.id}')">
            <td><strong>${escHtml(i.refNumber)}</strong></td>
            <td style="white-space:nowrap">${new Date(i.createdAt).toLocaleDateString('en-GB')}</td>
            <td>${escHtml(i.entityName || '—')}</td>
            <td style="font-size:.78rem">${escHtml(INC_TYPE_LABELS[i.incidentType] || i.incidentType)}</td>
            <td><span class="${INC_STATUS_CLS[i.status] || 'risk-badge'}">${INC_STATUS_LABELS[i.status] || i.status}</span></td>
          </tr>`).join('')}
      </tbody>
    </table>`
}

async function openIncidentDetail(id) {
  const res = await fetch(`/public/incident/${id}`, { headers: apiHeaders() })
  if (!res.ok) return
  _incidentDetail = await res.json()
  const i = _incidentDetail
  const panel = document.getElementById('incDetailPanel')
  if (!panel) return

  // Highlight active row
  document.querySelectorAll('.incident-row').forEach(r => r.classList.remove('active'))
  document.querySelectorAll('.incident-row').forEach(r => {
    if (r.querySelector('strong')?.textContent === i.refNumber) r.classList.add('active')
  })

  panel.innerHTML = `
    <div class="incident-detail-content">
      <div class="incident-detail-topbar">
        <div>
          <span class="incident-ref">${escHtml(i.refNumber)}</span>
          <span class="${INC_STATUS_CLS[i.status] || 'risk-badge'}" style="margin-left:8px">${INC_STATUS_LABELS[i.status] || i.status}</span>
        </div>
        <span style="font-size:.78rem;color:var(--text-subtle)">${new Date(i.createdAt).toLocaleString('en-GB')}</span>
      </div>

      <div class="incident-detail-grid">
        <div class="inc-field"><div class="inc-field-label">${t('inc_reporterEmail')}</div><div>${escHtml(i.email)}</div></div>
        <div class="inc-field"><div class="inc-field-label">${t('reports_entity')}</div><div>${escHtml(i.entityName || '—')}</div></div>
        <div class="inc-field"><div class="inc-field-label">${t('inc_typeLabel')}</div><div>${escHtml(INC_TYPE_LABELS[i.incidentType] || i.incidentType)}</div></div>
        <div class="inc-field"><div class="inc-field-label">${t('inc_resolved')}</div><div>${escHtml(INC_CLEANED_LABELS[i.cleanedUp] || i.cleanedUp)}</div></div>
        <div class="inc-field full"><div class="inc-field-label">${t('inc_description')}</div><div class="inc-field-text">${escHtml(i.description)}</div></div>
        <div class="inc-field full"><div class="inc-field-label">${t('inc_measuresTaken')}</div><div class="inc-field-text">${escHtml(i.measuresTaken || '—')}</div></div>
        <div class="inc-field"><div class="inc-field-label">${t('inc_localContact')}</div><div>${escHtml(i.localContact || '—')}</div></div>
      </div>

      <div class="incident-ciso-panel">
        <h4><i class="ph ph-shield-check"></i> ${t('inc_cisoDecision')}</h4>
        <div class="incident-ciso-grid">
          <div class="inc-field">
            <div class="inc-field-label">${t('inc_setStatus')}</div>
            <select class="select" id="incEditStatus" style="font-size:.82rem">
              ${Object.entries(INC_STATUS_LABELS).map(([v,l]) =>
                `<option value="${v}" ${i.status === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="inc-field">
            <div class="inc-field-label">${t('inc_assignTo')}</div>
            <select class="select" id="incAssignedTo" style="font-size:.82rem">
              <option value="">— ${t('inc_notAssigned')} —</option>
              <option value="it" ${i.assignedTo === 'it' ? 'selected' : ''}>${t('inc_itDepartment')}</option>
              <option value="datenschutz" ${i.assignedTo === 'datenschutz' ? 'selected' : ''}>${t('inc_dataProtection')}</option>
            </select>
          </div>
          <div class="inc-field">
            <div class="inc-field-label">${t('inc_reportable')}</div>
            <select class="select" id="incReportable" style="font-size:.82rem">
              <option value="">— ${t('inc_stillOpen')} —</option>
              <option value="tbd" ${i.reportable === 'tbd' ? 'selected' : ''}>${t('inc_reportableTbd')}</option>
              <option value="yes" ${i.reportable === 'yes' ? 'selected' : ''}>${t('inc_reportableYes')}</option>
              <option value="no"  ${i.reportable === 'no'  ? 'selected' : ''}>${t('inc_reportableNo')}</option>
            </select>
          </div>
        </div>
        <div class="inc-field" style="margin-top:10px">
          <div class="inc-field-label">${t('inc_cisoNotes')}</div>
          <textarea class="form-textarea" id="incCisoNotes" rows="3" style="font-size:.82rem">${escHtml(i.cisoNotes || '')}</textarea>
        </div>
        ${i.updatedAt ? `<p style="font-size:.75rem;color:var(--text-disabled);margin-top:6px">${t('inc_lastUpdated')}: ${new Date(i.updatedAt).toLocaleString('en-GB')} ${t('dash_by')} ${escHtml(i.updatedBy || '—')}</p>` : ''}
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
          ${canAccess('admin') ? `<button class="btn btn-danger btn-sm" onclick="deleteIncident('${i.id}','${escHtml(i.refNumber)}')">
            <i class="ph ph-trash"></i> ${t('delete')}
          </button>` : ''}
          <button class="btn btn-primary btn-sm" onclick="saveIncidentDecision('${i.id}')">
            <i class="ph ph-floppy-disk"></i> ${t('inc_saveDecision')}
          </button>
        </div>
      </div>
    </div>`
}

async function deleteIncident(id, refNumber) {
  if (!confirm(`Delete incident ${refNumber}?\nThis action cannot be undone.`)) return
  const res = await fetch(`/public/incident/${id}`, { method: 'DELETE', headers: apiHeaders('admin') })
  if (!res.ok) { alert('Delete failed'); return }
  _incidentDetail = null
  const panel = document.getElementById('incDetailPanel')
  if (panel) panel.innerHTML = '<div class="incident-detail-empty"><i class="ph ph-siren" style="font-size:40px;color:var(--text-disabled)"></i><p>Incident deleted.</p></div>'
  await loadIncidents()
}

async function saveIncidentDecision(id) {
  const status     = document.getElementById('incEditStatus')?.value
  const assignedTo = document.getElementById('incAssignedTo')?.value || null
  const reportable = document.getElementById('incReportable')?.value || null
  const cisoNotes  = document.getElementById('incCisoNotes')?.value || ''

  const res = await fetch(`/public/incident/${id}`, {
    method: 'PUT',
    headers: apiHeaders(),
    body: JSON.stringify({ status, assignedTo, reportable, cisoNotes })
  })
  if (!res.ok) { alert('Error saving'); return }
  await loadIncidents()
  await openIncidentDetail(id)
}

function renderUnderConstruction(sectionId) {
  const editor = dom('editor')
  const meta = {
    legal:    { label: 'Legal & Compliance',   icon: 'ph-scales',       desc: 'Contract management, legal reviews and compliance evidence are managed here.' },
    incident: { label: 'Incident Management',  icon: 'ph-fire',         desc: 'Record, classify, escalate and track security incidents.' },
    privacy:  { label: 'Privacy & Data Protection',icon: 'ph-lock-key-open',desc: 'Data protection impact assessments, data subject rights and internal privacy measures.' },
  }
  const m = meta[sectionId] || { label: sectionId, icon: 'ph-wrench', desc: '' }
  const id = `uc_${sectionId}`
  dom(id)?.remove()
  const div = document.createElement('div')
  div.id = id
  div.className = 'uc-container'
  div.innerHTML = `
    <div class="uc-card">
      <div class="uc-icon"><i class="ph ${m.icon}"></i></div>
      <h2 class="uc-title">${m.label}</h2>
      <p class="uc-desc">${m.desc}</p>
      <div class="uc-badge"><i class="ph ph-wrench"></i> ${t('underConstruction')}</div>
      <p class="uc-hint">${t('underConstructionHint')}</p>
    </div>
  `
  editor.appendChild(div)
}

function removeDashboard()  { dom('dashboardContainer')?.remove() }
function removeSoa()        { dom('soaContainer')?.remove() }
function removeGuidance()   { dom('guidanceContainer')?.remove() }

// ── SoA ──
const THEME_COLORS = {
  Organizational: '#4f8cff',
  People:         '#a78bfa',
  Physical:       '#fb923c',
  Technological:  '#34d399'
}
// SoA-Status. Stand vorher fest auf Deutsch — in der englischen Oberfläche
// erschien damit „Nicht begonnen".
const STATUS_LABELS = {
  get not_started() { return t('soal_notStarted') },
  get partial()     { return t('soal_partial') },
  get implemented() { return t('soal_implemented') },
  get optimized()   { return t('soal_optimized') }
}

let soaData = []
let soaFrameworks = []
let soaActiveFramework = 'ISO27001'
let soaFilters = { theme: '', status: '', applicable: '' }

async function renderSoa() {
  removeSoa()
  const container = document.createElement('div')
  container.id = 'soaContainer'
  container.className = 'soa-container'
  document.querySelector('.editor').appendChild(container)
  container.innerHTML = '<div class="soa-loading">Loading SoA…</div>'

  try {
    const fwRes = await fetch('/soa/frameworks', { headers: apiHeaders('reader') })
    if (!fwRes.ok) throw new Error()
    soaFrameworks = await fwRes.json()
    // Sicherstellen, dass soaActiveFramework ein aktives Framework ist
    if (!soaFrameworks.find(f => f.id === soaActiveFramework) && soaFrameworks.length > 0) {
      soaActiveFramework = soaFrameworks[0].id
    }
    const ctrlRes = await fetch(`/soa?framework=${soaActiveFramework}`, { headers: apiHeaders('reader') })
    if (!ctrlRes.ok) throw new Error()
    soaData = await ctrlRes.json()
  } catch {
    container.innerHTML = '<div class="soa-error">SoA konnte nicht geladen werden.</div>'
    return
  }

  renderSoaContent(container)
}

async function switchFramework(fw, container) {
  soaActiveFramework = fw
  soaFilters = { theme: '', status: '', applicable: '' }
  container.querySelector('.soa-table-wrap').innerHTML = '<div class="soa-loading">Loading…</div>'
  try {
    const res = await fetch(`/soa?framework=${fw}`, { headers: apiHeaders('reader') })
    soaData = await res.json()
  } catch {
    soaData = []
  }
  renderSoaContent(container)
}

function renderSoaContent(container) {
  const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK['editor']
  const activeFw = soaFrameworks.find(f => f.id === soaActiveFramework) || { label: soaActiveFramework, color: '#888' }
  const themes = [...new Set(soaData.map(c => c.theme))]

  let filtered = soaData
  if (soaFilters.theme)      filtered = filtered.filter(c => c.theme === soaFilters.theme)
  if (soaFilters.status)     filtered = filtered.filter(c => c.status === soaFilters.status)
  if (soaFilters.applicable === 'yes') filtered = filtered.filter(c => c.applicable)
  if (soaFilters.applicable === 'no')  filtered = filtered.filter(c => !c.applicable)

  const applied    = filtered.filter(c => c.applicable).length
  const total      = filtered.length
  const implCount  = filtered.filter(c => c.applicable && (c.status === 'implemented' || c.status === 'optimized')).length
  const implRate   = applied > 0 ? Math.round(implCount / applied * 100) : 0

  // Framework-Tabs
  const tabsHtml = soaFrameworks.map(fw => `
    <button class="soa-fw-tab ${fw.id === soaActiveFramework ? 'active' : ''}"
            data-fw="${fw.id}"
            style="--fw-color:${fw.color}">
      ${fw.label}
    </button>
  `).join('')

  container.innerHTML = `
    <div class="soa-header">
      <h2 class="soa-title">${t('soa_title')}</h2>
      <div class="soa-fw-tabs">${tabsHtml}</div>
      <div class="soa-summary-row">
        <span class="soa-kpi">${total} Controls</span>
        <span class="soa-kpi soa-kpi-green">${applied} ${t('soa_applicable')}</span>
        <span class="soa-kpi soa-kpi-blue">${implRate}% ${t('soa_implemented')}</span>
        <a class="btn btn-export" href="/soa/export" download="soa-export.json">${t('export')} JSON</a>
        ${(ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK['admin'] ? `<button class="btn btn-import-iso" onclick="openSoaIsoImport()" title="${t('soa_importIsoControls')}">⬆ ${t('soa_importIsoControls')}</button>` : ''}
        ${soaActiveFramework === 'CUSTOM' && (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK['contentowner']
          ? `<button class="btn btn-primary btn-sm" onclick="openCustomControlModal(null)"><i class="ph ph-plus"></i> ${t('soa_newControl')}</button>`
          : ''}
      </div>
      <div class="soa-filters">
        <select id="soaFilterTheme" class="soa-select">
          <option value="">${t('soa_allThemes')}</option>
          ${themes.map(t => `<option value="${t}" ${soaFilters.theme===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <select id="soaFilterStatus" class="soa-select">
          <option value="">${t('filter_allStatuses')}</option>
          ${Object.entries(STATUS_LABELS).map(([v,l]) => `<option value="${v}" ${soaFilters.status===v?'selected':''}>${l}</option>`).join('')}
        </select>
        <select id="soaFilterApplicable" class="soa-select">
          <option value="">${t('filter_allStatuses')}</option>
          <option value="yes" ${soaFilters.applicable==='yes'?'selected':''}>${t('soa_applicable')}</option>
          <option value="no"  ${soaFilters.applicable==='no'?'selected':''}>${t('soa_notApplicable')}</option>
        </select>
      </div>
    </div>

    <div class="soa-table-wrap">
      <table class="soa-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>${t('soa_theme')}</th>
            <th>${t('soa_control')}</th>
            <th>${t('soa_applicable')}</th>
            <th>${t('col_status')}</th>
            <th>${t('col_responsible')}</th>
            <th>${t('soa_justification')}</th>
            ${canEdit ? '<th></th>' : ''}
          </tr>
        </thead>
        <!-- colCount: 7 base + 1 if canEdit = 8 total; detail rows use colspan=8 -->
        <tbody>
          ${filtered.map(c => soaRow(c, canEdit)).join('')}
        </tbody>
      </table>
      ${filtered.length === 0 ? `<div class="soa-empty">${t('soa_noControls')}</div>` : ''}
    </div>
  `

  // Framework-Tab-Events
  container.querySelectorAll('.soa-fw-tab').forEach(btn => {
    btn.onclick = () => switchFramework(btn.dataset.fw, container)
  })

  // Filter-Events
  container.querySelector('#soaFilterTheme').onchange = e => { soaFilters.theme = e.target.value; renderSoaContent(container) }
  container.querySelector('#soaFilterStatus').onchange = e => { soaFilters.status = e.target.value; renderSoaContent(container) }
  container.querySelector('#soaFilterApplicable').onchange = e => { soaFilters.applicable = e.target.value; renderSoaContent(container) }

  // Speichern-Events
  if (canEdit) {
    container.querySelectorAll('.soa-save-btn').forEach(btn => {
      btn.onclick = () => saveSoaRow(btn.dataset.id, container)
    })
  }

  // Expand-Events (Cross-Mapping + Template-Verlinkung)
  container.querySelectorAll('.soa-expand-btn').forEach(btn => {
    btn.onclick = () => toggleSoaDetail(btn.dataset.id, container)
  })
}

function soaRow(c, canEdit) {
  const color = THEME_COLORS[c.theme] || '#888'
  const linkedCount = (c.linkedTemplates || []).length
  const linkedBadge = linkedCount > 0
    ? `<span class="soa-linked-badge">${linkedCount} Document${linkedCount > 1 ? 's' : ''}</span>`
    : ''
  return `
    <tr class="soa-row ${c.applicable ? '' : 'soa-row-na'}" data-id="${c.id}">
      <td class="soa-id">
        <button class="soa-expand-btn" data-id="${c.id}" title="${t('soa_showDetails')}">&#9656;</button>
        ${c.id}
      </td>
      <td><span class="soa-theme-badge" style="border-color:${color};color:${color}">${c.theme}</span></td>
      <td class="soa-ctrl-title">${c.title} ${linkedBadge}</td>
      <td class="soa-center">
        ${canEdit
          ? `<input type="checkbox" class="soa-applicable" data-id="${c.id}" ${c.applicable ? 'checked' : ''}>`
          : (c.applicable ? '✓' : '✗')}
      </td>
      <td>
        ${canEdit
          ? `<select class="soa-status-sel" data-id="${c.id}">
              ${Object.entries(STATUS_LABELS).map(([v,l]) =>
                `<option value="${v}" ${c.status===v?'selected':''}>${l}</option>`
              ).join('')}
            </select>`
          : `<span class="soa-status-label soa-status-${c.status}">${STATUS_LABELS[c.status]||c.status}</span>`}
      </td>
      <td>
        ${canEdit
          ? `<input class="soa-owner-input" data-id="${c.id}" value="${c.owner||''}" placeholder="${t('col_name')}…">`
          : (c.owner || '—')}
      </td>
      <td>
        ${canEdit
          ? `<input class="soa-just-input" data-id="${c.id}" value="${c.justification||''}" placeholder="${t('soa_justification')}…">`
          : (c.justification || '')}
      </td>
      ${canEdit ? `<td style="white-space:nowrap">
        <button class="btn-soa-save soa-save-btn" data-id="${c.id}">${t('save')}</button>
        ${c.isCustom ? `
          <button class="btn btn-secondary btn-xs" style="margin-left:4px" onclick="openCustomControlModal('${c.id}')" title="${t('soa_editControl')}"><i class="ph ph-pencil"></i></button>
          <button class="btn btn-danger btn-xs" style="margin-left:4px" onclick="deleteCustomControl('${c.id}','${escHtml(c.title)}')" title="${t('soa_deleteControlTitle')}"><i class="ph ph-trash"></i></button>
        ` : ''}
      </td>` : ''}
    </tr>
    <tr class="soa-detail-row" data-for="${c.id}" style="display:none;">
      <td colspan="8" class="soa-detail-cell">
        <div class="soa-detail-content" id="soa-detail-${c.id}">
          <div class="soa-detail-loading">${t('soa_loading')}</div>
        </div>
      </td>
    </tr>
  `
}

async function toggleSoaDetail(id, container) {
  const detailRow = container.querySelector(`.soa-detail-row[data-for="${id}"]`)
  const btn = container.querySelector(`.soa-expand-btn[data-id="${id}"]`)
  if (!detailRow) return

  const isOpen = detailRow.style.display !== 'none'
  if (isOpen) {
    detailRow.style.display = 'none'
    btn.innerHTML = '&#9656;'
    btn.classList.remove('open')
    return
  }

  detailRow.style.display = ''
  btn.innerHTML = '&#9662;'
  btn.classList.add('open')

  const detailEl = document.getElementById(`soa-detail-${id}`)
  const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK['editor']
  const control = soaData.find(c => c.id === id) || {}

  try {
    const [crossRes, tmplRes] = await Promise.all([
      fetch(`/soa/${encodeURIComponent(id)}/crossmap`, { headers: apiHeaders('reader') }),
      fetch('/templates', { headers: apiHeaders('reader') })
    ])
    const crossGroups = crossRes.ok ? await crossRes.json() : []
    const allTemplates = tmplRes.ok ? await tmplRes.json() : []
    renderSoaDetail(detailEl, id, crossGroups, allTemplates, control, canEdit, container)
  } catch {
    detailEl.innerHTML = `<span class="soa-detail-error">${t('err_load')}</span>`
  }
}

function renderSoaDetail(el, id, crossGroups, allTemplates, control, canEdit, container) {
  const linked = control.linkedTemplates || []

  // ── Cross-Mapping ──
  let crossHtml = ''
  if (crossGroups.length === 0) {
    crossHtml = `<span class="soa-detail-none">${t('soa_noCrossMapping')}</span>`
  } else {
    crossHtml = crossGroups.map(g => {
      const pills = g.related.map(cid =>
        `<span class="soa-crossmap-pill">${cid}</span>`
      ).join(' ')
      return `
        <div class="soa-crossmap-group">
          <span class="soa-crossmap-topic">${g.topic}</span>
          <span class="soa-crossmap-desc">${g.description}</span>
          <div class="soa-crossmap-pills">${pills}</div>
        </div>
      `
    }).join('')
  }

  // ── Template-Verlinkung ──
  const linkedTmplHtml = linked.length > 0
    ? linked.map(tid => {
        const tmpl = allTemplates.find(t => t.id === tid)
        const label = tmpl ? `${tmpl.title} (${tmpl.type})` : tid
        return canEdit
          ? `<span class="soa-tmpl-tag">${label}<button class="soa-tmpl-remove" data-tid="${tid}" title="Remove">&times;</button></span>`
          : `<span class="soa-tmpl-tag">${label}</span>`
      }).join('')
    : `<span class="soa-detail-none">${t('soa_noTemplatesLinked')}</span>`

  // Template-Picker
  const unlinked = allTemplates.filter(t => !linked.includes(t.id))
  const pickerHtml = canEdit && unlinked.length > 0
    ? `<select id="soa-tmpl-picker-${id}" class="soa-tmpl-picker">
        <option value="">${t('soa_linkTemplate')}</option>
        ${unlinked.map(t => `<option value="${t.id}">${t.title} (${t.type})</option>`).join('')}
       </select>
       <button class="soa-tmpl-add-btn" data-id="${id}">${t('soa_link')}</button>`
    : ''

  // ── Entity-Applicability ──
  const applicableEnts = control.applicableEntities || []
  const entLabel = applicableEnts.length === 0
    ? t('filter_allEntities')
    : applicableEnts.map(id => `<span class="tmpl-bar-pill">${id}</span>`).join('')
  const entEditorHtml = canEdit
    ? `<button class="btn btn-secondary btn-sm soa-ent-edit" data-id="${id}" style="margin-left:6px;" title="${t('soa_editApplicability')}"><i class="ph ph-pencil-simple"></i></button>`
    : ''

  el.innerHTML = `
    <div class="soa-detail-grid">
      <section class="soa-detail-section">
        <h4 class="soa-detail-heading">${t('soa_crossMapping')}</h4>
        ${crossHtml}
      </section>
      <section class="soa-detail-section">
        <h4 class="soa-detail-heading">${t('soa_linkedTemplates')}</h4>
        <div class="soa-tmpl-list" id="soa-tmpl-list-${id}">${linkedTmplHtml}</div>
        <div class="soa-tmpl-picker-row">${pickerHtml}</div>
      </section>
      <section class="soa-detail-section soa-detail-full">
        <h4 class="soa-detail-heading"><i class="ph ph-buildings"></i> ${t('common_applicableEntities')}${entEditorHtml}</h4>
        <div class="soa-entity-bar">${applicableEnts.length === 0 ? `<span class="soa-detail-none">${t('filter_allEntities')}</span>` : entLabel}</div>
      </section>
    </div>
  `

  // Entity-Picker öffnen für SoA-Control
  const entEditBtn = el.querySelector('.soa-ent-edit')
  if (entEditBtn) {
    entEditBtn.onclick = () => openEntityPickerForSoa(id, control, el, container)
  }

  // Remove-Events
  if (canEdit) {
    el.querySelectorAll('.soa-tmpl-remove').forEach(btn => {
      btn.onclick = async () => {
        const tid = btn.dataset.tid
        const ctrl = soaData.find(c => c.id === id) || {}
        const newLinked = (ctrl.linkedTemplates || []).filter(x => x !== tid)
        await saveSoaLinkedTemplates(id, newLinked, el, container)
      }
    })
    const addBtn = el.querySelector(`.soa-tmpl-add-btn[data-id="${id}"]`)
    if (addBtn) {
      addBtn.onclick = async () => {
        const picker = document.getElementById(`soa-tmpl-picker-${id}`)
        const tid = picker?.value
        if (!tid) return
        const ctrl = soaData.find(c => c.id === id) || {}
        const newLinked = [...new Set([...(ctrl.linkedTemplates || []), tid])]
        await saveSoaLinkedTemplates(id, newLinked, el, container)
      }
    }
  }
}

async function saveSoaLinkedTemplates(id, linkedTemplates, detailEl, tableContainer) {
  const ctrl = soaData.find(c => c.id === id) || {}
  const res = await fetch(`/soa/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: apiHeaders('editor'),
    body: JSON.stringify({
      applicable: ctrl.applicable ?? true,
      status: ctrl.status || 'not_started',
      owner: ctrl.owner || '',
      justification: ctrl.justification || '',
      linkedTemplates
    })
  })
  if (!res.ok) { alert('Error saving document link'); return }

  const updated = await res.json()
  const idx = soaData.findIndex(c => c.id === id)
  if (idx >= 0) soaData[idx] = updated

  // Badge in Hauptzeile aktualisieren
  const titleCell = tableContainer.querySelector(`tr[data-id="${id}"] .soa-ctrl-title`)
  if (titleCell) {
    titleCell.querySelector('.soa-linked-badge')?.remove()
    if (linkedTemplates.length > 0) {
      const badge = document.createElement('span')
      badge.className = 'soa-linked-badge'
      badge.textContent = `${linkedTemplates.length} Document${linkedTemplates.length > 1 ? 's' : ''}`
      titleCell.appendChild(badge)
    }
  }

  // Detail-Panel in-place neu rendern (kein close+reopen)
  if (detailEl) {
    const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK['editor']
    const [crossRes, tmplRes] = await Promise.all([
      fetch(`/soa/${encodeURIComponent(id)}/crossmap`, { headers: apiHeaders('reader') }),
      fetch('/templates', { headers: apiHeaders('reader') })
    ])
    const crossGroups = crossRes.ok ? await crossRes.json() : []
    const allTemplates = tmplRes.ok ? await tmplRes.json() : []
    renderSoaDetail(detailEl, id, crossGroups, allTemplates, updated, canEdit, tableContainer)
  }
}

function openSoaIsoImport() {
  // file-input hidden, einmalig erstellen
  let inp = document.getElementById('_soaIsoFileInput')
  if (!inp) {
    inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = '.json,application/json'
    inp.id = '_soaIsoFileInput'
    inp.style.display = 'none'
    document.body.appendChild(inp)
    inp.onchange = async () => {
      const file = inp.files[0]
      if (!file) return
      inp.value = ''
      let controls
      try {
        controls = JSON.parse(await file.text())
      } catch {
        return showToast(t('err_invalidJson'), 'error')
      }
      if (!Array.isArray(controls) || controls.length === 0) {
        return showToast(t('soa_importArrayRequired'), 'error')
      }
      try {
        const res = await fetch('/soa/import-controls', {
          method: 'POST',
          headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
          body: JSON.stringify(controls)
        })
        const data = await res.json()
        if (!res.ok) return showToast(t('error') + ': ' + (data.error || res.status), 'error')
        showToast(t('soa_importSuccess', { count: data.imported }), 'success')
        setTimeout(() => renderSoa(), 1200)
      } catch (e) {
        showToast(t('err_network') + ': ' + e.message, 'error')
      }
    }
  }
  inp.click()
}

// ── Custom Controls ─────────────────────────────────────────────────────────

function openCustomControlModal(id) {
  const existing = id ? soaData.find(c => c.id === id) : null
  document.getElementById('customCtrlModal')?.remove()
  const html = `
    <div id="customCtrlModal" class="modal" style="visibility:visible">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title"><i class="ph ph-sliders"></i> ${existing ? t('edit') : t('create')} ${t('soa_customControl')}</h3>
          <button class="modal-close" onclick="document.getElementById('customCtrlModal').remove()"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
          <div>
            <label class="form-label">${t('col_title')} <span class="form-required">*</span></label>
            <input id="ccTitle" class="form-input" value="${escHtml(existing?.title||'')}" placeholder="${t('soa_controlTitlePlaceholder')}">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label class="form-label">${t('soa_themeCategory')}</label>
              <input id="ccTheme" class="form-input" value="${escHtml(existing?.theme||'')}" placeholder="${t('soa_themePlaceholder')}">
            </div>
            <div>
              <label class="form-label">${t('col_responsible')}</label>
              <input id="ccOwner" class="form-input" value="${escHtml(existing?.owner||'')}" placeholder="${t('findings_responsiblePlaceholder')}">
            </div>
          </div>
          <div>
            <label class="form-label">${t('inc_description')}</label>
            <textarea id="ccDesc" class="form-textarea" rows="2">${escHtml(existing?.description||'')}</textarea>
          </div>
          <div>
            <label class="form-label">${t('soa_justification')}</label>
            <input id="ccJust" class="form-input" value="${escHtml(existing?.justification||'')}" placeholder="${t('soa_justificationPlaceholder')}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('customCtrlModal').remove()">${t('cancel')}</button>
          <button class="btn btn-primary" onclick="submitCustomControlModal('${id||''}')">
            <i class="ph ph-floppy-disk"></i> ${t('save')}
          </button>
        </div>
      </div>
    </div>`
  document.body.insertAdjacentHTML('beforeend', html)
}

async function submitCustomControlModal(id) {
  const title = document.getElementById('ccTitle')?.value.trim()
  if (!title) { alert('Title is required'); return }
  const body = {
    title,
    theme:         document.getElementById('ccTheme')?.value.trim() || 'Custom',
    owner:         document.getElementById('ccOwner')?.value.trim() || '',
    description:   document.getElementById('ccDesc')?.value.trim()  || '',
    justification: document.getElementById('ccJust')?.value.trim()  || '',
  }
  const url    = id ? `/soa/custom/${id}` : '/soa/custom'
  const method = id ? 'PUT' : 'POST'
  const res = await fetch(url, { method, headers: { ...apiHeaders('contentowner'), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error'); return }
  document.getElementById('customCtrlModal')?.remove()
  // Reload the CUSTOM framework tab
  const container = document.getElementById('soaContainer')
  if (container) await switchFramework('CUSTOM', container)
}

async function deleteCustomControl(id, title) {
  if (!confirm(`Delete custom control "${title}"?\nOnly possible if no documents are linked.`)) return
  const res = await fetch(`/soa/custom/${id}`, { method: 'DELETE', headers: apiHeaders('contentowner') })
  if (!res.ok) {
    const e = await res.json().catch(()=>({}))
    alert(e.error || 'Error deleting control')
    return
  }
  const container = document.getElementById('soaContainer')
  if (container) await switchFramework('CUSTOM', container)
}

async function saveSoaRow(id, container) {
  const row = container.querySelector(`tr[data-id="${id}"]`)
  if (!row) return

  const applicable = row.querySelector(`.soa-applicable[data-id="${id}"]`)?.checked ?? true
  const status      = row.querySelector(`.soa-status-sel[data-id="${id}"]`)?.value || 'not_started'
  const owner       = row.querySelector(`.soa-owner-input[data-id="${id}"]`)?.value || ''
  const justification = row.querySelector(`.soa-just-input[data-id="${id}"]`)?.value || ''

  const res = await fetch(`/soa/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: apiHeaders('editor'),
    body: JSON.stringify({ applicable, status, owner, justification })
  })
  if (res.ok) {
    const updated = await res.json()
    // soaData lokал aktualisieren
    const idx = soaData.findIndex(c => c.id === id)
    if (idx >= 0) soaData[idx] = updated
    row.classList.toggle('soa-row-na', !updated.applicable)
    const btn = row.querySelector('.soa-save-btn')
    if (btn) { btn.textContent = '✓ Saved'; setTimeout(() => { btn.textContent = 'Save' }, 1500) }
  } else {
    alert('Error saving')
  }
}

async function renderDashboard() {
  removeDashboard()
  const container = document.createElement('div')
  container.id = 'dashboardContainer'
  container.className = 'dashboard-container'

  const editor = document.querySelector('.editor')
  editor.appendChild(container)

  container.innerHTML = '<div class="dashboard-loading">Loading Dashboard…</div>'

  let data, soaSummary, riskSummary, gdprDash, trainSummary, legalSummary, calEvents, goalsSummary, assetSummary, govSummary, bcmSummary, supplierSummary, findingsSummary, reviewPending, ackSummary, nis2Summary, nis2Deadlines
  try {
    const [dashRes, soaRes, riskRes, gdprRes, trainRes, legalRes, calRes, goalsRes, assetRes, govRes, bcmRes, supplierRes, findRes, reviewRes, ackRes, nis2Res, nis2DlRes] = await Promise.all([
      fetch('/dashboard',                                                                       { headers: apiHeaders('reader') }),
      MODULE_CONFIG.soa        ? fetch('/soa/summary',          { headers: apiHeaders('reader') }) : Promise.resolve(null),
      MODULE_CONFIG.risk       ? fetch('/risks/summary',        { headers: apiHeaders('reader') }) : Promise.resolve(null),
      MODULE_CONFIG.gdpr       ? fetch('/gdpr/dashboard',       { headers: apiHeaders('reader') }) : Promise.resolve(null),
      MODULE_CONFIG.training   ? fetch('/training/summary',     { headers: apiHeaders('reader') }) : Promise.resolve(null),
      MODULE_CONFIG.legal      ? fetch('/legal/summary',        { headers: apiHeaders('reader') }) : Promise.resolve(null),
      MODULE_CONFIG.calendar   ? fetch('/calendar',             { headers: apiHeaders('reader') }) : Promise.resolve(null),
      MODULE_CONFIG.goals      ? fetch('/goals/summary',        { headers: apiHeaders('reader') }) : Promise.resolve(null),
      MODULE_CONFIG.assets     ? fetch('/assets/summary',       { headers: apiHeaders('reader') }) : Promise.resolve(null),
      MODULE_CONFIG.governance ? fetch('/governance/summary',   { headers: apiHeaders('reader') }) : Promise.resolve(null),
      MODULE_CONFIG.bcm        ? fetch('/bcm/summary',          { headers: apiHeaders('reader') }) : Promise.resolve(null),
      MODULE_CONFIG.suppliers  ? fetch('/suppliers/summary',    { headers: apiHeaders('reader') }) : Promise.resolve(null),
      fetch('/findings/summary',                                { headers: apiHeaders('reader') }),
      MODULE_CONFIG.risk       ? fetch('/risks/review-pending', { headers: apiHeaders('reader') }) : Promise.resolve(null),
      fetch('/distributions/summary',                           { headers: apiHeaders('reader') }),
      fetch('/nis2/governance/summary',                         { headers: apiHeaders('reader') }),
      fetch('/nis2/incidents/deadlines',                        { headers: apiHeaders('reader') }),
    ])
    if (!dashRes.ok) throw new Error('API error')
    data             = await dashRes.json()
    soaSummary       = soaRes?.ok      ? await soaRes.json()       : null
    riskSummary      = riskRes?.ok     ? await riskRes.json()      : null
    gdprDash         = gdprRes?.ok     ? await gdprRes.json()      : null
    trainSummary     = trainRes?.ok    ? await trainRes.json()     : null
    legalSummary     = legalRes?.ok    ? await legalRes.json()     : null
    calEvents        = calRes?.ok      ? await calRes.json()       : []
    goalsSummary     = goalsRes?.ok    ? await goalsRes.json()     : null
    assetSummary     = assetRes?.ok    ? await assetRes.json()     : null
    govSummary       = govRes?.ok      ? await govRes.json()       : null
    bcmSummary       = bcmRes?.ok      ? await bcmRes.json()       : null
    supplierSummary  = supplierRes?.ok ? await supplierRes.json()  : null
    findingsSummary  = findRes?.ok     ? await findRes.json()      : null
    reviewPending    = reviewRes?.ok   ? await reviewRes.json()    : []
    ackSummary       = ackRes?.ok      ? await ackRes.json()       : null
    nis2Summary      = nis2Res?.ok     ? await nis2Res.json()      : null
    // Fristenliste zu Kennzahlen verdichten (überschritten / läuft bald ab)
    if (nis2DlRes?.ok) {
      const rows = await nis2DlRes.json()
      nis2Deadlines = {
        overdue: rows.filter(r => r.overdue?.length).length,
        dueSoon: rows.filter(r => r.dueSoon?.length).length,
      }
    }
  } catch (e) {
    if (container.isConnected)
      container.innerHTML = '<div class="dashboard-error">Dashboard konnte nicht geladen werden.</div>'
    return
  }

  // Nutzer hat bereits weiternavigiert – veraltetes Render verwerfen
  if (!container.isConnected) return

  const statusLabels = { draft: 'Draft', review: 'Review', approved: 'Approved', archived: 'Archived' }
  const statusColors  = { draft: '#888', review: '#f0b429', approved: '#4ade80', archived: '#555' }
  const riskColors    = { low: '#4ade80', medium: '#f0b429', high: '#fb923c', critical: '#f87171' }

  // Upcoming events from calendar (next 14 days)
  const now14 = new Date(); now14.setDate(now14.getDate() + 14)
  const upcoming = (calEvents || []).filter(ev => {
    const d = new Date(ev.date)
    return d >= new Date() && d <= now14
  }).slice(0, 5)

  const alertsHtml = (() => {
    const alerts = []
    if (data.byStatus?.review > 0)
      alerts.push({ color: 'var(--warning-text)', icon: 'ph-clock', text: `${data.byStatus.review} Document(s) awaiting review`, nav: 'policy' })
    if (MODULE_CONFIG.risk && riskSummary?.byLevel?.critical > 0)
      alerts.push({ color: '#f87171', icon: 'ph-warning', text: `${riskSummary.byLevel.critical} critical risks open`, nav: 'risk' })
    if (MODULE_CONFIG.risk && riskSummary?.byLevel?.high > 0)
      alerts.push({ color: '#fb923c', icon: 'ph-warning-circle', text: `${riskSummary.byLevel.high} high risks`, nav: 'risk' })
    if (MODULE_CONFIG.gdpr && gdprDash?.incidents?.open > 0)
      alerts.push({ color: '#f87171', icon: 'ph-shield-warning', text: `${gdprDash.incidents.open} open data breach(es)`, nav: 'gdpr' })
    if (MODULE_CONFIG.legal && legalSummary?.contracts?.expiring > 0)
      alerts.push({ color: '#fb923c', icon: 'ph-file-text', text: `${legalSummary.contracts.expiring} contract(s) expiring soon`, nav: 'legal' })
    if (MODULE_CONFIG.training && trainSummary?.overdue > 0)
      alerts.push({ color: '#f87171', icon: 'ph-graduation-cap', text: `${trainSummary.overdue} overdue training(s)`, nav: 'training' })
    if (MODULE_CONFIG.goals && goalsSummary?.overdue > 0)
      alerts.push({ color: '#fb923c', icon: 'ph-target', text: `${goalsSummary.overdue} security goal(s) overdue`, nav: 'goals' })
    if (MODULE_CONFIG.assets && assetSummary?.endOfLifeSoon > 0)
      alerts.push({ color: '#f0b429', icon: 'ph-warning', text: `${assetSummary.endOfLifeSoon} asset(s) approaching end-of-life`, nav: 'assets' })
    if (MODULE_CONFIG.assets && assetSummary?.criticalUnclassified > 0)
      alerts.push({ color: '#fb923c', icon: 'ph-buildings', text: `${assetSummary.criticalUnclassified} critical/high assets without classification`, nav: 'assets' })
    if (MODULE_CONFIG.assets && assetSummary?.protectionUnassessed > 0)
      alerts.push({ color: '#fb923c', icon: 'ph-shield-star', text: `${assetSummary.protectionUnassessed} asset(s) without protection goal assessment`, nav: 'assets' })
    if (nis2Deadlines?.overdue > 0)
      alerts.push({ color: '#f87171', icon: 'ph-warning-octagon', text: `${nis2Deadlines.overdue} NIS2 Art. 23 reporting deadline(s) overdue`, nav: 'nis2' })
    if (nis2Deadlines?.dueSoon > 0)
      alerts.push({ color: '#f0b429', icon: 'ph-timer', text: `${nis2Deadlines.dueSoon} NIS2 Art. 23 reporting deadline(s) due soon`, nav: 'nis2' })
    if (nis2Summary?.criticalOpen > 0)
      alerts.push({ color: '#fb923c', icon: 'ph-shield-star', text: `${nis2Summary.criticalOpen} NIS2 Art. 21 CRITICAL item(s) open`, nav: 'nis2' })
    if (MODULE_CONFIG.governance && govSummary?.actions?.overdue > 0)
      alerts.push({ color: '#f87171', icon: 'ph-chalkboard-teacher', text: `${govSummary.actions.overdue} governance action(s) overdue`, nav: 'governance' })
    if (MODULE_CONFIG.governance && govSummary?.actions?.critical > 0)
      alerts.push({ color: '#fb923c', icon: 'ph-chalkboard-teacher', text: `${govSummary.actions.critical} critical governance action(s) open`, nav: 'governance' })
    if (MODULE_CONFIG.bcm && bcmSummary?.plans?.overdueTest > 0)
      alerts.push({ color: '#f87171', icon: 'ph-heartbeat', text: `${bcmSummary.plans.overdueTest} BCM plan test(s) overdue`, nav: 'bcm' })
    if (MODULE_CONFIG.suppliers && supplierSummary?.overdueAudits > 0)
      alerts.push({ color: '#f87171', icon: 'ph-truck', text: `${supplierSummary.overdueAudits} supplier audit(s) overdue`, nav: 'suppliers' })
    if (findingsSummary?.byStatus?.open > 0)
      alerts.push({ color: '#fb923c', icon: 'ph-magnifying-glass', text: `${findingsSummary.byStatus.open} open audit finding(s)`, nav: 'reports' })
    if (findingsSummary?.overdueActions > 0)
      alerts.push({ color: '#f87171', icon: 'ph-magnifying-glass', text: `${findingsSummary.overdueActions} overdue action(s) in findings`, nav: 'reports' })
    if (reviewPending?.length > 0)
      alerts.push({ color: '#f59e0b', icon: 'ph-shield-warning', text: t('dash_scanRisksPending', { count: reviewPending.length }), nav: 'risk' })
    if (alerts.length === 0) return '<p class="dash-empty" style="color:var(--success-text)"><i class="ph ph-check-circle"></i> No critical issues</p>'
    return alerts.map(a => `<div class="dash-alert dash-link" data-nav="${a.nav}" style="border-left:3px solid ${a.color};padding:6px 10px;margin-bottom:6px;background:var(--surface);border-radius:var(--radius-sm);cursor:pointer;display:flex;align-items:center;gap:8px">
      <i class="ph ${a.icon}" style="color:${a.color};font-size:1rem"></i>
      <span style="font-size:.85rem">${a.text}</span>
    </div>`).join('')
  })()

  container.innerHTML = `
    <div class="dash-isms-header">
      <h2 class="dashboard-title"><i class="ph ph-gauge"></i> ${t('dash_title')}</h2>
      <span class="dash-timestamp" style="font-size:.75rem;color:var(--text-subtle)">${t('dash_status')} ${new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
    </div>

    <!-- Alerts -->
    <div class="dash-section">
      <div class="dash-section-title"><i class="ph ph-bell"></i> ${t('dash_actionRequired')}</div>
      ${alertsHtml}
    </div>

    <!-- KPI Row 1: Templates & Compliance -->
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-files"></i> ${t('dash_policies')}</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="policy" title="Open documents">
        <div class="kpi-value">${data.total}</div>
        <div class="kpi-label">${t('dash_templates')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="policy">
        <div class="kpi-value" style="color:var(--success-text)">${data.approvalRate}%</div>
        <div class="kpi-label">${t('dash_approved')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="policy">
        <div class="kpi-value" style="color:var(--warning-text)">${data.byStatus?.review || 0}</div>
        <div class="kpi-label">${t('dash_inReview')}</div>
      </div>
      ${MODULE_CONFIG.soa && soaSummary ? `<div class="dash-card kpi dash-link" data-nav="soa">
        <div class="kpi-value" style="color:var(--accent-text)">${Math.round(Object.values(soaSummary).reduce((s,fw)=>s+fw.implementationRate,0)/Object.values(soaSummary).length)}%</div>
        <div class="kpi-label">${t('dash_fwRate')}</div>
      </div>` : ''}
    </div>

    <!-- KPI Row 2: Risiken -->
    ${MODULE_CONFIG.risk ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-chart-bar"></i> ${t('dash_risks')}</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="risk">
        <div class="kpi-value">${riskSummary?.total || 0}</div>
        <div class="kpi-label">${t('dash_totalRisks')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="risk">
        <div class="kpi-value" style="color:#f87171">${riskSummary?.byLevel?.critical || 0}</div>
        <div class="kpi-label">${t('dash_critical')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="risk">
        <div class="kpi-value" style="color:#fb923c">${riskSummary?.byLevel?.high || 0}</div>
        <div class="kpi-label">${t('dash_high')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="risk">
        <div class="kpi-value" style="color:var(--warning-text)">${riskSummary?.openTreatments || 0}</div>
        <div class="kpi-label">${t('risk_openTreatments')}</div>
      </div>
    </div>` : ''}

    <!-- KPI Row 3: GDPR -->
    ${MODULE_CONFIG.gdpr ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-shield-check"></i> ${t('dash_gdpr')}</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="gdpr">
        <div class="kpi-value">${gdprDash?.vvt?.total || 0}</div>
        <div class="kpi-label">${t('dash_vvt')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="gdpr">
        <div class="kpi-value" style="color:${(gdprDash?.incidents?.open||0)>0?'#f87171':'var(--success-text)'}">${gdprDash?.incidents?.open || 0}</div>
        <div class="kpi-label">${t('dash_breaches')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="gdpr">
        <div class="kpi-value" style="color:var(--warning-text)">${gdprDash?.dsar?.open || 0}</div>
        <div class="kpi-label">${t('dash_dsars')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="gdpr">
        <div class="kpi-value">${gdprDash?.toms?.implemented || 0}</div>
        <div class="kpi-label">${t('dash_toms')}</div>
      </div>
    </div>` : ''}

    <!-- KPI Row 3b: Sicherheitsziele -->
    ${MODULE_CONFIG.goals && goalsSummary ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-target"></i> ${t('nav_goals')} (${t('dash_goals')})</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="goals">
        <div class="kpi-value">${goalsSummary.active||0}</div>
        <div class="kpi-label">${t('dash_activeGoals')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="goals">
        <div class="kpi-value" style="color:#4ade80">${goalsSummary.achieved||0}</div>
        <div class="kpi-label">${t('dash_achieved')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="goals">
        <div class="kpi-value" style="color:${(goalsSummary.overdue||0)>0?'#f87171':'var(--success-text)'}">${goalsSummary.overdue||0}</div>
        <div class="kpi-label">${t('dash_overdue')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="goals">
        <div class="kpi-value" style="color:#60a5fa">${goalsSummary.avgProgress||0}%</div>
        <div class="kpi-label">${t('dash_progress')}</div>
      </div>
    </div>` : ''}

    <!-- KPI Row 3c: Asset Management -->
    ${MODULE_CONFIG.assets && assetSummary ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-buildings"></i> ${t('nav_assets')}</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="assets">
        <div class="kpi-value">${assetSummary.total || 0}</div>
        <div class="kpi-label">${t('dash_assets')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="assets">
        <div class="kpi-value" style="color:#f87171">${assetSummary.byCriticality?.critical || 0}</div>
        <div class="kpi-label">${t('dash_critical')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="assets">
        <div class="kpi-value" style="color:#fb923c">${assetSummary.criticalUnclassified || 0}</div>
        <div class="kpi-label">${t('dash_unclassifiedCritical')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="assets">
        <div class="kpi-value" style="color:#f0b429">${assetSummary.endOfLifeSoon || 0}</div>
        <div class="kpi-label">${t('dash_eol')}</div>
      </div>
    </div>` : ''}

    <!-- KPI Row 3d: Governance -->
    ${MODULE_CONFIG.governance && govSummary ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-chalkboard-teacher"></i> ${t('dash_governance')}</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="governance">
        <div class="kpi-value">${govSummary.reviews?.total || 0}</div>
        <div class="kpi-label">${t('dash_governance')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="governance">
        <div class="kpi-value" style="color:${(govSummary.actions?.overdue||0)>0?'#f87171':'var(--success-text)'}">
          ${govSummary.actions?.overdue || 0}
        </div>
        <div class="kpi-label">${t('findings_overdue')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="governance">
        <div class="kpi-value" style="color:var(--warning-text)">${govSummary.actions?.open || 0}</div>
        <div class="kpi-label">${t('dash_openActions')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="governance">
        <div class="kpi-value">${govSummary.meetings?.total || 0}</div>
        <div class="kpi-label">${t('gov_meetings')}</div>
      </div>
    </div>` : ''}

    ${MODULE_CONFIG.bcm && bcmSummary ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-heartbeat"></i> ${t('nav_bcm')}</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="bcm">
        <div class="kpi-value">${bcmSummary.plans?.total || 0}</div>
        <div class="kpi-label">${t('dash_bcm')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="bcm">
        <div class="kpi-value" style="color:var(--success-text)">${bcmSummary.plans?.tested || 0}</div>
        <div class="kpi-label">${t('dash_testedPlans')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="bcm">
        <div class="kpi-value" style="color:#f87171">${bcmSummary.bia?.critical || 0}</div>
        <div class="kpi-label">${t('dash_criticalProcesses')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="bcm">
        <div class="kpi-value" style="color:${(bcmSummary.plans?.overdueTest||0)>0?'#f87171':'var(--success-text)'}">
          ${bcmSummary.plans?.overdueTest || 0}
        </div>
        <div class="kpi-label">${t('dash_testsOverdue')}</div>
      </div>
    </div>` : ''}

    ${MODULE_CONFIG.suppliers && supplierSummary ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-truck"></i> ${t('suppliers_title')}</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="suppliers">
        <div class="kpi-value">${supplierSummary.total || 0}</div>
        <div class="kpi-label">${t('suppliers_total')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="suppliers">
        <div class="kpi-value" style="color:#f87171">${supplierSummary.critical || 0}</div>
        <div class="kpi-label">${t('dash_critSuppliers')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="suppliers">
        <div class="kpi-value" style="color:${(supplierSummary.overdueAudits||0)>0?'#f87171':'var(--success-text)'}">
          ${supplierSummary.overdueAudits || 0}
        </div>
        <div class="kpi-label">${t('dash_auditsOverdue')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="suppliers">
        <div class="kpi-value" style="color:var(--warning-text)">${supplierSummary.withDataAccess || 0}</div>
        <div class="kpi-label">${t('dash_withDataAccess')}</div>
      </div>
    </div>` : ''}

    <!-- KPI Row: Audit-Feststellungen -->
    ${findingsSummary ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-magnifying-glass"></i> ${t('findings_title')}</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="reports">
        <div class="kpi-value">${findingsSummary.total || 0}</div>
        <div class="kpi-label">${t('findings_total')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="reports">
        <div class="kpi-value" style="color:${(findingsSummary.byStatus?.open||0)>0?'#fb923c':'var(--success-text)'}">
          ${findingsSummary.byStatus?.open || 0}
        </div>
        <div class="kpi-label">${t('findings_open')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="reports">
        <div class="kpi-value" style="color:${(findingsSummary.bySeverity?.critical||0)>0?'#f87171':(findingsSummary.bySeverity?.high||0)>0?'#fb923c':'var(--success-text)'}">
          ${(findingsSummary.bySeverity?.critical||0) + (findingsSummary.bySeverity?.high||0)}
        </div>
        <div class="kpi-label">${t('dash_criticalHigh')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="reports">
        <div class="kpi-value" style="color:${(findingsSummary.overdueActions||0)>0?'#f87171':'var(--success-text)'}">
          ${findingsSummary.overdueActions || 0}
        </div>
        <div class="kpi-label">${t('findings_overdue')}</div>
      </div>
    </div>` : ''}

    <!-- KPI Row: Policy Acknowledgements -->
    ${ackSummary ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-check-circle"></i> ${t('nav_policyAcks')}</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="policy-acks">
        <div class="kpi-value">${ackSummary.activeDistributions || 0}</div>
        <div class="kpi-label">${t('ack_activeDistributions')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="policy-acks">
        <div class="kpi-value" style="color:${(ackSummary.pendingAcks||0)>0?'#fbbf24':'var(--success-text)'}">
          ${ackSummary.pendingAcks || 0}
        </div>
        <div class="kpi-label">${t('ack_pendingAcknowledgements')}</div>
      </div>
    </div>` : ''}

    <!-- KPI Row 4: Legal & Training -->
    ${(MODULE_CONFIG.legal || MODULE_CONFIG.training) ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-briefcase"></i> ${t('dash_legal')}</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      ${MODULE_CONFIG.legal ? `
      <div class="dash-card kpi dash-link" data-nav="legal">
        <div class="kpi-value">${legalSummary?.contracts?.active || 0}</div>
        <div class="kpi-label">${t('dash_contracts')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="legal">
        <div class="kpi-value" style="color:${(legalSummary?.contracts?.expiring||0)>0?'#fb923c':'var(--success-text)'}">${legalSummary?.contracts?.expiring || 0}</div>
        <div class="kpi-label">${t('dash_expiring')}</div>
      </div>` : ''}
      ${MODULE_CONFIG.training ? `
      <div class="dash-card kpi dash-link" data-nav="training">
        <div class="kpi-value">${trainSummary?.completionRate || 0}%</div>
        <div class="kpi-label">${t('dash_training')}</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="training">
        <div class="kpi-value" style="color:${(trainSummary?.overdue||0)>0?'#f87171':'var(--success-text)'}">${trainSummary?.overdue || 0}</div>
        <div class="kpi-label">${t('dash_overdueTraining')}</div>
      </div>` : ''}
    </div>` : ''}

    <!-- Framework-Compliance -->
    ${MODULE_CONFIG.soa && soaSummary ? `
    <div class="dash-section" style="margin-top:16px">
      <div class="dash-section-title"><i class="ph ph-check-square"></i> ${t('dash_fwCompliance')}</div>
      <div class="fw-summary-grid">
        ${Object.values(soaSummary).map(fw => `
          <div class="fw-summary-item dash-link" data-nav="soa" data-fw="${fw.framework}" title="${t('risk_openBtn')} ${fw.label}" style="cursor:pointer">
            <span class="fw-label" style="color:${fw.color}">${fw.label}</span>
            <div class="fw-bar-track">
              <div class="fw-bar-fill" style="width:${fw.implementationRate}%; background:${fw.color}"></div>
            </div>
            <span class="fw-rate">${fw.implementationRate}%</span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <!-- Two-column: Top Risks + Upcoming Events (only if at least one module active) -->
    ${(MODULE_CONFIG.risk || MODULE_CONFIG.calendar) ? `
    <div style="display:grid;grid-template-columns:${MODULE_CONFIG.risk && MODULE_CONFIG.calendar ? '1fr 1fr' : '1fr'};gap:12px;margin-top:16px">
      ${MODULE_CONFIG.risk ? `
      <div class="dash-card">
        <div class="dash-card-title"><i class="ph ph-chart-bar"></i> ${t('dash_top5')}</div>
        ${riskSummary?.top5?.length ? `
        <table style="width:100%;font-size:.8rem;border-collapse:collapse">
          ${riskSummary.top5.map(r => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:4px 0">${escHtml(r.title)}</td>
              <td style="padding:4px 6px;text-align:right">
                <span style="color:${riskColors[r.riskLevel]};font-weight:600">${r.score}</span>
              </td>
            </tr>`).join('')}
        </table>` : `<p class="dash-empty">${t('risk_noRisks')}</p>`}
      </div>` : ''}

      ${MODULE_CONFIG.calendar ? `
      <div class="dash-card">
        <div class="dash-card-title"><i class="ph ph-calendar-check"></i> ${t('dash_next14')}</div>
        ${upcoming.length ? `
        <ul style="list-style:none;padding:0;margin:0;font-size:.8rem">
          ${upcoming.map(ev => `
            <li style="padding:4px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px">
              <span class="cal-chip ${ev.type}" style="font-size:.7rem;padding:1px 5px;border-radius:3px">${ev.type.replace(/_/g,' ')}</span>
              <span>${escHtml(ev.title)}</span>
              <span style="margin-left:auto;color:var(--text-subtle)">${new Date(ev.date).toLocaleDateString('en-GB')}</span>
            </li>`).join('')}
        </ul>` : `<p class="dash-empty">${t('cal_noUpcoming')}</p>`}
      </div>` : ''}
    </div>` : ''}

    <!-- Recent Activity -->
    <div class="dash-card" style="margin-top:12px">
      <div class="dash-card-title"><i class="ph ph-activity"></i> ${t('dash_activity')}</div>
      ${data.recentActivity.length === 0
        ? `<p class="dash-empty">${t('dash_noActivity')}</p>`
        : `<ul class="activity-list">
            ${data.recentActivity.map(a => `
              <li class="dash-link" data-nav-type="${a.type}" data-tmpl-id="${a.templateId}" data-tmpl-type="${a.type}" style="cursor:pointer">
                <span class="status-dot ${a.status}"></span>
                <span class="act-title">${escHtml(a.title)}</span>
                <span class="act-status">${statusLabels[a.status] || a.status}</span>
                <span class="act-by">by ${escHtml(a.changedBy)}</span>
                <span class="act-date">${new Date(a.changedAt).toLocaleString('en-GB')}</span>
              </li>
            `).join('')}
          </ul>`
      }
    </div>
  `

  // ── Dashboard-Klick-Handler ──
  container.querySelectorAll('.dash-link').forEach(el => {
    el.addEventListener('click', async () => {
      const nav    = el.dataset.nav
      const navType = el.dataset.navType
      const fw     = el.dataset.fw
      const tmplId = el.dataset.tmplId
      const tmplType = el.dataset.tmplType

      if (nav === 'soa') {
        if (fw) soaActiveFramework = fw
        loadSection('soa')
      } else if (tmplId && tmplType) {
        selectType(tmplType)
        loadSection('policy')
        try {
          const res = await fetch(`/template/${tmplType}/${encodeURIComponent(tmplId)}`, { headers: apiHeaders('reader') })
          if (res.ok) { const t = await res.json(); loadTemplate(t) }
        } catch {}
      } else if (navType) {
        selectType(navType)
        renderSectionContent('policy')
        loadSection('policy')
      } else if (nav) {
        loadSection(nav)
      }
    })
  })
}

function renderAdminPanel(){
  let panel = document.getElementById('adminPanelContainer')
  if (!panel) {
    panel = document.createElement('div')
    panel.id = 'adminPanelContainer'
    dom('editor').appendChild(panel)
  }
  panel.innerHTML = `
      <div class="admin-fullpage">
        <div class="admin-fullpage-header">
        <h2><i class="ph ph-wrench"></i> ${t('admin_title')}</h2>
      </div>
      <div class="admin-tab-bar">
        <button class="admin-tab active" id="adminTabUsers" onclick="adminShowTab('users')">
          <i class="ph ph-users"></i> ${t('admin_users')}
        </button>
        <button class="admin-tab" id="adminTabEntities" onclick="adminShowTab('entities')">
          <i class="ph ph-buildings"></i> ${t('admin_entities')}
        </button>
        <button class="admin-tab" id="adminTabTemplates" onclick="adminShowTab('templates')">
          <i class="ph ph-files"></i> ${t('admin_templates')}
        </button>
        <button class="admin-tab" id="adminTabLists" onclick="adminShowTab('lists')">
          <i class="ph ph-list-bullets"></i> ${t('admin_lists')}
        </button>
        <button class="admin-tab" id="adminTabOrg" onclick="adminShowTab('org')">
          <i class="ph ph-buildings"></i> ${t('admin_org')}
        </button>
        <button class="admin-tab" id="adminTabAudit" onclick="adminShowTab('audit')">
          <i class="ph ph-scroll"></i> ${t('admin_auditLog')}
        </button>
        <button class="admin-tab" id="adminTabMaintenance" onclick="adminShowTab('maintenance')">
          <i class="ph ph-hard-drives"></i> ${t('admin_maintenance')}
        </button>
        <button class="admin-tab" id="adminTabTrash" onclick="adminShowTab('trash')">
          <i class="ph ph-trash-simple"></i> ${t('admin_trash')}
        </button>
        <button class="admin-tab" id="adminTabModules" onclick="adminShowTab('modules')">
          <i class="ph ph-sliders"></i> ${t('admin_sysConfig')}
        </button>
      </div>
      <div class="admin-tab-content">
        <div id="adminTabPanelUsers"></div>
        <div id="adminTabPanelEntities" style="display:none;"></div>
        <div id="adminTabPanelTemplates" style="display:none;"></div>
        <div id="adminTabPanelLists" style="display:none;"></div>
        <div id="adminTabPanelOrg" style="display:none;"></div>
        <div id="adminTabPanelAudit" style="display:none;"></div>
        <div id="adminTabPanelMaintenance" style="display:none;"></div>
        <div id="adminTabPanelTrash" style="display:none;"></div>
        <div id="adminTabPanelModules" style="display:none;"></div>
      </div>
    </div>
  `

  renderAdminUsersTab()
  renderAdminEntitiesTab()
  renderAdminTemplatesTab()
  renderAdminListsTab()
  renderAdminOrgTab()
  renderAdminAuditTab()
  renderAdminMaintenanceTab()
  renderAdminTrashTab()
  renderAdminModulesTab()
}

const _ADMIN_TABS = ['users','entities','templates','lists','org','audit','maintenance','trash','modules']
function adminShowTab(tab) {
  _ADMIN_TABS.forEach(t => {
    const panelId = `adminTabPanel${t.charAt(0).toUpperCase() + t.slice(1)}`
    const btnId   = `adminTab${t.charAt(0).toUpperCase() + t.slice(1)}`
    const panel = document.getElementById(panelId)
    const btn   = document.getElementById(btnId)
    if (panel) panel.style.display = t === tab ? '' : 'none'
    if (btn)   btn.classList.toggle('active', t === tab)
  })
}

async function renderAdminTemplatesTab() {
  const container = document.getElementById('adminTabPanelTemplates')
  if (!container) return
  container.innerHTML = `<p class="report-loading">${t('loading')}</p>`
  let res, templates
  try {
    res = await fetch('/templates', { headers: apiHeaders('reader') })
    if (!res.ok) { container.innerHTML = `<p class="report-error">${t('err_load')}</p>`; return }
    templates = await res.json()
  } catch (e) {
    // Ohne diesen Zweig bliebe bei einem Fehler dauerhaft „lädt…" stehen
    console.error('renderAdminTemplatesTab:', e)
    container.innerHTML = `<p class="report-error">${t('err_load')}</p>`
    return
  }
  if (templates.length === 0) {
    container.innerHTML = `<p style="color:var(--text-subtle);padding:12px;">${t('admin_noTemplates')}</p>`
    return
  }
  const STATUS_CLS = { draft: 'status-draft', review: 'status-review', approved: 'status-approved', archived: 'status-archived' }
  container.innerHTML = `
    <table class="admin-user-table" style="margin-top:12px;">
      <thead>
        <tr>
          <th>${t('col_title')}</th>
          <th>${t('col_type')}</th>
          <th>${t('col_status')}</th>
          <th>${t('settings_lang')}</th>
          <th>${t('col_version')}</th>
          <th>${t('col_modified')}</th>
          <th style="width:50px;"></th>
        </tr>
      </thead>
      <tbody>
        ${templates.map(tpl => `
          <tr>
            <td>${escHtml(tpl.title || '—')}</td>
            <td><span class="badge">${escHtml(tpl.type || '—')}</span></td>
            <td><span class="badge status-badge ${STATUS_CLS[tpl.status] || ''}">${tpl.status || 'draft'}</span></td>
            <td>${escHtml(tpl.language || '—')}</td>
            <td>${tpl.version || 1}</td>
            <td style="color:var(--text-subtle);font-size:12px;">${tpl.updatedAt ? new Date(tpl.updatedAt).toLocaleDateString('en-GB') : '—'}</td>
            <td>
              <button class="btn btn-sm" style="color:var(--danger-text);" title="${t('delete')}"
                onclick="adminDeleteTemplate('${escHtml(tpl.type)}','${escHtml(tpl.id)}','${escHtml(tpl.title || '')}')">
                <i class="ph ph-trash"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`
}

async function adminDeleteTemplate(type, id, title) {
  if (!confirm(t('tmpl_trashConfirm').replace('{title}', title))) return
  const res = await fetch(`/template/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: apiHeaders('admin')
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || t('err_delete')); return }
  renderAdminTemplatesTab()
}

// ── Admin: Listen-Verwaltung ─────────────────────────────────────────────────

const LIST_META = [
  { id: 'templateTypes',     get label() { return t('list_templateTypes') }, type: 'string' },
  { id: 'riskCategories',    get label() { return t('list_riskCats') },      type: 'object' },
  { id: 'riskTreatments',    get label() { return t('list_riskTreatments') },type: 'object' },
  { id: 'gdprDataCategories',get label() { return t('list_gdprDataCats') },  type: 'string' },
  { id: 'gdprSubjectTypes',  get label() { return t('list_gdprSubjects') },  type: 'object' },
  { id: 'incidentTypes',     get label() { return t('list_incidentTypes') }, type: 'object' },
  // Asset-Typen (#64) tragen zusätzlich eine Kategorie. `extraSelect` rüstet
  // dem generischen Objekt-Editor ein drittes Feld an, statt einen zweiten
  // Editor danebenzustellen.
  { id: 'assetTypes',        get label() { return t('admin_assetTypes') },   type: 'object',
    extraSelect: { key: 'category',
      get options() { return Object.fromEntries(Object.keys(ASSET_CAT_LABELS).map(c => [c, assetCatLabel(c)])) } },
    // Schutzziel-Vorgaben je Typ (#64, Teil 2). Vier optionale Stufen 1–4;
    // leer bedeutet: der Typ macht zu diesem Ziel keine Vorgabe.
    protectionGoals: true },
]

let _adminListsData   = null  // cached from server
let _adminActiveList  = LIST_META[0].id

async function renderAdminListsTab() {
  const container = document.getElementById('adminTabPanelLists')
  if (!container) return
  container.innerHTML = `<p class="report-loading">${t('loading')}</p>`

  const res = await fetch('/admin/lists', { headers: apiHeaders() })
  if (!res.ok) { container.innerHTML = `<p class="report-empty">${t('err_load')}</p>`; return }
  _adminListsData = await res.json()

  _renderAdminListsUI(container)
}

function _renderAdminListsUI(container) {
  container.innerHTML = `
    <div class="admin-lists-layout">
      <div class="admin-lists-sidebar">
        ${LIST_META.map(m => `
          <button class="admin-lists-nav-item ${m.id === _adminActiveList ? 'active' : ''}"
                  onclick="_adminSelectList('${m.id}')">${escHtml(m.label)}</button>
        `).join('')}
      </div>
      <div class="admin-lists-panel" id="adminListsPanel"></div>
    </div>`
  _renderListPanel()
}

function _adminSelectList(listId) {
  _adminActiveList = listId
  document.querySelectorAll('.admin-lists-nav-item').forEach(b =>
    b.classList.toggle('active', b.textContent.trim() === LIST_META.find(m => m.id === listId)?.label))
  _renderListPanel()
}

function _renderListPanel() {
  const panel = document.getElementById('adminListsPanel')
  if (!panel || !_adminListsData) return
  const meta  = LIST_META.find(m => m.id === _adminActiveList)
  const items = _adminListsData[_adminActiveList] || []

  if (meta.type === 'string') {
    panel.innerHTML = `
      <div class="admin-lists-panel-header">
        <span class="admin-panel-title">${escHtml(meta.label)}</span>
        <button class="btn btn-sm" onclick="_adminListReset('${meta.id}')" title="${t('admin_restoreDefaults')}">
          <i class="ph ph-arrow-counter-clockwise"></i> ${t('reset')}
        </button>
      </div>
      <div class="admin-lists-add-row">
        <input class="input" id="adminListNewVal" placeholder="${t('admin_newEntry')}" style="flex:1"
               onkeydown="if(event.key==='Enter')_adminListAddString()">
        <button class="btn btn-primary btn-sm" onclick="_adminListAddString()">
          <i class="ph ph-plus"></i> ${t('add')}
        </button>
      </div>
      <div class="admin-lists-items">
        ${items.map((val, idx) => `
          <div class="admin-lists-item">
            <input class="input admin-lists-item-input" value="${escHtml(val)}"
                   onchange="_adminListUpdateString(${idx}, this.value)">
            <button class="btn btn-sm" style="color:var(--danger-text)" onclick="_adminListRemoveItem(${idx})"
                    title="${t('remove')}"><i class="ph ph-trash"></i></button>
          </div>`).join('')}
      </div>`
  } else {
    panel.innerHTML = `
      <div class="admin-lists-panel-header">
        <span class="admin-panel-title">${escHtml(meta.label)}</span>
        <button class="btn btn-sm" onclick="_adminListReset('${meta.id}')" title="${t('admin_restoreDefaults')}">
          <i class="ph ph-arrow-counter-clockwise"></i> ${t('reset')}
        </button>
      </div>
      ${meta.protectionGoals ? `<p class="admin-lists-hint">${escHtml(t('at_protHint'))}</p>` : ''}
      <div class="admin-lists-add-row" style="gap:6px">
        <input class="input" id="adminListNewId"    placeholder="ID (e.g. my_cat)"  style="width:160px">
        <input class="input" id="adminListNewLabel" placeholder="${t('admin_labelPlaceholder')}"             style="flex:1"
               onkeydown="if(event.key==='Enter')_adminListAddObject()">
        ${meta.extraSelect ? `
        <select class="input" id="adminListNewExtra" style="width:170px">
          ${Object.entries(meta.extraSelect.options).map(([v, l]) =>
            `<option value="${escHtml(v)}">${escHtml(l)}</option>`).join('')}
        </select>` : ''}
        <button class="btn btn-primary btn-sm" onclick="_adminListAddObject()">
          <i class="ph ph-plus"></i> ${t('add')}
        </button>
      </div>
      <div class="admin-lists-items">
        ${items.map((item, idx) => `
          <div class="admin-lists-item">
            <input class="input admin-lists-item-id" value="${escHtml(item.id || '')}"
                   placeholder="ID" style="width:160px"
                   onchange="_adminListUpdateObjectField(${idx},'id',this.value)">
            <input class="input admin-lists-item-input" value="${escHtml(item.label || '')}"
                   placeholder="${t('col_label')}" style="flex:1"
                   onchange="_adminListUpdateObjectField(${idx},'label',this.value)">
            ${meta.extraSelect ? `
            <select class="input" style="width:170px"
                    onchange="_adminListUpdateObjectField(${idx},'${meta.extraSelect.key}',this.value)">
              ${Object.entries(meta.extraSelect.options).map(([v, l]) =>
                `<option value="${escHtml(v)}"${item[meta.extraSelect.key] === v ? ' selected' : ''}>${escHtml(l)}</option>`).join('')}
            </select>` : ''}
            ${meta.protectionGoals ? _protGoalSelects(idx, item) : ''}
            <button class="btn btn-sm" style="color:var(--danger-text)" onclick="_adminListRemoveItem(${idx})"
                    title="${t('remove')}"><i class="ph ph-trash"></i></button>
          </div>`).join('')}
      </div>`
  }
}

/** Vier Stufenfelder (C/I/A/Authentizität) für einen Asset-Typ. */
function _protGoalSelects(idx, item) {
  // Kürzel aus ASSET_PROT_GOALS statt aus dem Label: Auf Deutsch beginnen
  // Vertraulichkeit und Verfügbarkeit beide mit „V".
  const lvl = [1, 2, 3, 4]
  return ASSET_PROT_GOALS.map(({ key: g, letter, i18n }) => {
    const label = t(i18n)
    const cur = item.protection?.[g] ?? ''
    return `<label class="admin-prot-goal" title="${escHtml(label)}">
      <span>${escHtml(letter)}</span>
      <select class="input" onchange="_adminListUpdateProtection(${idx},'${g}',this.value)">
        <option value="">–</option>
        ${lvl.map(l => `<option value="${l}"${String(cur) === String(l) ? ' selected' : ''}>${l}</option>`).join('')}
      </select>
    </label>`
  }).join('')
}

/** Setzt oder entfernt ein Schutzziel am Typ; leert sich das Objekt, fällt es weg. */
function _adminListUpdateProtection(idx, goal, value) {
  const items = _adminListsData[_adminActiveList]
  if (!items || !items[idx]) return
  const prot = { ...(items[idx].protection || {}) }
  if (value === '') delete prot[goal]
  else prot[goal] = parseInt(value, 10)
  const next = { ...items[idx] }
  if (Object.keys(prot).length) next.protection = prot
  else delete next.protection
  items[idx] = next
  _adminListSave()
}

function _adminListAddString() {
  const input = document.getElementById('adminListNewVal')
  const val = input?.value?.trim()
  if (!val) return
  _adminListsData[_adminActiveList] = [...(_adminListsData[_adminActiveList] || []), val]
  _adminListSave()
  input.value = ''
  _renderListPanel()
}

function _adminListUpdateString(idx, val) {
  _adminListsData[_adminActiveList][idx] = val
  _adminListSave()
}

function _adminListAddObject() {
  const meta  = LIST_META.find(m => m.id === _adminActiveList)
  const id    = document.getElementById('adminListNewId')?.value?.trim().replace(/\s+/g, '_')
  const label = document.getElementById('adminListNewLabel')?.value?.trim()
  if (!id || !label) { alert(t('admin_idLabelRequired')); return }
  const entry = { id, label }
  if (meta?.extraSelect) {
    entry[meta.extraSelect.key] = document.getElementById('adminListNewExtra')?.value || ''
  }
  _adminListsData[_adminActiveList] = [...(_adminListsData[_adminActiveList] || []), entry]
  _adminListSave()
  document.getElementById('adminListNewId').value    = ''
  document.getElementById('adminListNewLabel').value = ''
  _renderListPanel()
}

function _adminListUpdateObjectField(idx, field, val) {
  const items = _adminListsData[_adminActiveList]
  if (items[idx]) { items[idx] = { ...items[idx], [field]: val }; _adminListSave() }
}

function _adminListRemoveItem(idx) {
  _adminListsData[_adminActiveList].splice(idx, 1)
  _adminListSave()
  _renderListPanel()
}

async function _adminListSave() {
  const listId = _adminActiveList
  const items  = _adminListsData[listId]
  const res = await fetch(`/admin/list/${encodeURIComponent(listId)}`, {
    method: 'PUT',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  })
  if (res.ok) {
    // Gespeicherte Typen sofort in die laufende Sitzung übernehmen — sonst
    // kennt das Asset-Formular einen neu angelegten Typ erst nach einem Reload.
    if (listId === 'assetTypes') _applyAssetTypes(items)
    return
  }

  const e = await res.json().catch(() => ({}))
  if (res.status === 409 && Array.isArray(e.inUse)) {
    // Typ noch in Verwendung: sagen, welcher und wie oft — sonst rät der Admin.
    alert(`${t('admin_typeInUse')}\n\n` +
      e.inUse.map(u => `• ${u.label || u.type}: ${u.count}`).join('\n'))
  } else if (Array.isArray(e.details) && e.details.length) {
    alert(`${e.error || t('err_saveFailed')}\n\n${e.details.join('\n')}`)
  } else {
    alert(e.error || t('err_saveFailed'))
  }

  // Abgelehnt heißt: nicht gespeichert. Ohne diesen Rücksprung zeigte der
  // Editor weiter einen Stand, den der Server nie übernommen hat.
  try {
    const fresh = await fetch('/admin/lists', { headers: apiHeaders() })
    if (fresh.ok) {
      _adminListsData = await fresh.json()
      if (listId === 'assetTypes') _applyAssetTypes(_adminListsData.assetTypes)
      _renderListPanel()
    }
  } catch {}
}

/** Übernimmt eine gespeicherte Typenliste in die laufende Sitzung. */
function _applyAssetTypes(items) {
  if (!Array.isArray(items) || !items.length) return
  ASSET_TYPES = items
  ASSET_TYPES_MAP = Object.fromEntries(items.map(t => [t.id, t.label]))
}

async function _adminListReset(listId) {
  if (!confirm(t('admin_resetListConfirm'))) return
  const res = await fetch(`/admin/list/${encodeURIComponent(listId)}/reset`, {
    method: 'POST', headers: apiHeaders('admin'),
  })
  if (!res.ok) { alert(t('admin_resetError')); return }
  _adminListsData[listId] = await res.json()
  if (listId === 'assetTypes') _applyAssetTypes(_adminListsData[listId])
  _renderListPanel()
}

// ── Admin: Ende Listen-Verwaltung ────────────────────────────────────────────

// ── Admin: Organisationsdaten ─────────────────────────────────────────────────

async function renderAdminOrgTab() {
  const container = document.getElementById('adminTabPanelOrg')
  if (!container) return
  container.innerHTML = `<p class="report-loading">${t('loading')}</p>`
  const [orgRes, secRes, ouRes] = await Promise.all([
    fetch('/admin/org-settings', { headers: apiHeaders() }),
    fetch('/admin/security',     { headers: apiHeaders() }),
    fetch('/org-units',          { headers: apiHeaders() }),
  ])
  if (!orgRes.ok) { container.innerHTML = `<p class="report-empty">${t('err_load')}</p>`; return }
  const s    = await orgRes.json()
  const sec  = secRes.ok ? await secRes.json() : { require2FA: false }
  const units = ouRes.ok ? await ouRes.json() : []
  _ORG_UNITS = units
  const _ouTypeLabel = { cio: t('org_typeCio'), group: t('org_typeGroup'), local: t('org_typeLocal'), external: t('org_typeExternal') }
  const en   = s.emailNotifications || {}
  const smtp = s.smtpSettings || {}
  const webdav = s.webdavSettings || {}
  const nav  = Array.isArray(s.navOrder) && s.navOrder.length ? s.navOrder : _NAV_ORDER_DEFAULT.slice()

  container.innerHTML = `
    <div class="org-settings-panel">
      <div class="admin-lists-panel-header" style="margin-bottom:16px">
        <span class="admin-panel-title"><i class="ph ph-buildings"></i> ${t('org_dataConfiguration')}</span>
        <button class="btn btn-primary btn-sm" onclick="saveOrgSettings()"><i class="ph ph-floppy-disk"></i> ${t('save')}</button>
      </div>

      <div class="org-section">
        <h4 class="org-section-title">${t('org_general')}</h4>
        <div class="org-grid">
          <label class="org-label">${t('org_name')}</label>
          <input class="input" id="orgName" value="${escHtml(s.orgName||'')}" placeholder="Example Ltd">
          <label class="org-label">${t('org_short')}</label>
          <input class="input" id="orgShort" value="${escHtml(s.orgShort||'')}" placeholder="EL">
          <label class="org-label">${t('org_logoText')}</label>
          <input class="input" id="orgLogoText" value="${escHtml(s.logoText||'')}" placeholder="ISMS">
          <label class="org-label">${t('org_scope')}</label>
          <textarea class="input" id="orgScope" rows="3" style="resize:vertical">${escHtml(s.ismsScope||'')}</textarea>
        </div>
      </div>

      <div class="org-section">
        <h4 class="org-section-title">${t('org_responsibilities')}</h4>
        <div class="org-grid">
          <label class="org-label">${t('org_ciso')}</label>
          <input class="input" id="orgCisoName" value="${escHtml(s.cisoName||'')}">
          <label class="org-label">${t('org_cisoEmail')}</label>
          <input class="input" id="orgCisoEmail" value="${escHtml(s.cisoEmail||'')}" type="email">
          <label class="org-label">${t('org_dso')}</label>
          <input class="input" id="orgGdpoName" value="${escHtml(s.gdpoName||'')}">
          <label class="org-label">${t('org_dsoEmail')}</label>
          <input class="input" id="orgGdpoEmail" value="${escHtml(s.gdpoEmail||'')}" type="email">
          <label class="org-label">${t('org_icsContact')}</label>
          <input class="input" id="orgIcsContact" value="${escHtml(s.icsContact||'')}">
        </div>
      </div>

      <div class="org-section" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <h4 class="org-section-title"><i class="ph ph-shield-check"></i> ${t('org_securityPolicies')}</h4>
        <div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0">
          <label class="module-toggle" style="margin-top:2px;flex-shrink:0">
            <input type="checkbox" id="org2FAEnforce" ${sec.require2FA ? 'checked' : ''}>
            <span class="module-toggle-slider"></span>
          </label>
          <div>
            <div style="font-weight:600;font-size:.9rem">${t('org_2fa')}</div>
            <div style="font-size:.8rem;color:var(--text-subtle);margin-top:3px">
              ${t('org_2faDesc')}
            </div>
            <div class="settings-notice" style="margin-top:8px;font-size:.78rem">
              <i class="ph ph-warning"></i>
              <strong>${t('warning')}:</strong> ${t('org_2faWarning')}
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveSecuritySettings()">
          <i class="ph ph-floppy-disk"></i> ${t('org_saveSecurity')}
        </button>
        <p id="secSaveMsg" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <div class="org-section" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <h4 class="org-section-title"><i class="ph ph-translate"></i> ${t('admin_langConfig')}</h4>
        <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:12px">
          ${t('admin_langConfigDesc')}
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:14px">
          ${[{code:'de',label:'🇩🇪 Deutsch'},{code:'en',label:'🇬🇧 English'},{code:'fr',label:'🇫🇷 Français'},{code:'nl',label:'🇳🇱 Nederlands'}].map(l => `
            <label style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer">
              <input type="checkbox" id="langAvail_${l.code}" ${(_langConfig?.available||['de','en','fr','nl']).includes(l.code)?'checked':''}>
              <span style="font-size:.9rem">${l.label}</span>
            </label>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <label style="font-size:.85rem;color:var(--text-muted);flex-shrink:0">${t('admin_langDefault')}:</label>
          <select id="langDefault" style="padding:5px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:.85rem">
            ${[{code:'de',label:'Deutsch'},{code:'en',label:'English'},{code:'fr',label:'Français'},{code:'nl',label:'Nederlands'}].map(l =>
              `<option value="${l.code}" ${(_langConfig?.default||'en')===l.code?'selected':''}>${l.label}</option>`
            ).join('')}
          </select>
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveLangConfig()">
          <i class="ph ph-floppy-disk"></i> ${t('admin_langSave')}
        </button>
        <p id="langConfigMsg" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <div class="org-section" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <h4 class="org-section-title"><i class="ph ph-envelope"></i> ${t('org_emailNotifications')}</h4>
        <div class="settings-notice" style="margin-bottom:12px">
          <i class="ph ph-info"></i>
          ${t('org_smtpEnvNotice')}
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <label class="module-toggle" style="flex-shrink:0">
            <input type="checkbox" id="emailEnabled" ${en.enabled ? 'checked' : ''}>
            <span class="module-toggle-slider"></span>
          </label>
          <div>
            <div style="font-weight:600;font-size:.9rem">${t('org_enableDigest')}</div>
            <div style="font-size:.8rem;color:var(--text-subtle)">${t('org_digestDesc')}</div>
          </div>
        </div>
        <div class="org-grid">
          <label class="org-label">${t('org_adminEmail')}</label>
          <input class="input" id="emailAdminEmail" value="${escHtml(en.adminEmail||'')}" type="email" placeholder="admin@example.com">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
          ${[
            ['emailRisks',          en.risks,          t('org_emailHighRisks'),                 t('org_toCiso')],
            ['emailBcm',            en.bcm,            t('org_emailBcmDue'),                    t('org_toCiso')],
            ['emailSupplierAudits', en.supplierAudits, t('org_emailSupplierAudits'),            t('org_toCiso')],
            ['emailDsar',           en.dsar,           t('org_emailDsar'),                      t('org_toGdpo')],
            ['emailGdprIncidents',  en.gdprIncidents,  t('org_emailGdprIncidents'),             t('org_toGdpo')],
            ['emailDeletionLog',    en.deletionLog,    t('org_emailDeletionLog'),               t('org_toGdpo')],
            ['emailContracts',      en.contracts,      t('org_emailContracts'),                 t('org_toAdmin')],
            ['emailTemplateReview', en.templateReview, t('org_emailTemplateReview'),            t('org_toAdmin')],
          ].map(([id, checked, label, dest]) => `
            <label style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-card);border-radius:6px;cursor:pointer">
              <input type="checkbox" id="${id}" ${checked !== false ? 'checked' : ''} style="width:16px;height:16px;flex-shrink:0">
              <div>
                <div style="font-size:.85rem;font-weight:600">${label}</div>
                <div style="font-size:.75rem;color:var(--text-subtle)">${dest}</div>
              </div>
            </label>`).join('')}
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:14px" onclick="saveEmailSettings()">
          <i class="ph ph-floppy-disk"></i> ${t('org_saveEmail')}
        </button>
        <p id="emailSaveMsg" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <div class="org-section" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <h4 class="org-section-title"><i class="ph ph-paper-plane-tilt"></i> ${t('org_smtpConfig')}</h4>
        <div class="settings-notice" style="margin-bottom:12px">
          <i class="ph ph-warning"></i>
          <strong>${t('org_securityNotice')}:</strong> ${t('org_smtpSecurityNotice')}
        </div>
        <div id="smtpEnvBanner" style="display:none;padding:8px 12px;border-radius:6px;background:var(--bg-info,#1e3a5f);color:var(--info,#93c5fd);font-size:.82rem;margin-bottom:12px">
          <i class="ph ph-info"></i> ${t('org_smtpEnvOverride')}
        </div>
        <div class="org-grid">
          <label class="org-label">${t('org_smtpHost')}</label>
          <input class="input" id="smtpHost" value="${escHtml(smtp.host||'')}" placeholder="smtp.example.com">
          <label class="org-label">${t('org_smtpPort')}</label>
          <input class="input" id="smtpPort" value="${smtp.port||587}" type="number" style="max-width:120px">
          <label class="org-label">${t('org_smtpEncryption')}</label>
          <div style="display:flex;align-items:center;gap:16px;padding:4px 0">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="radio" name="smtpSecure" id="smtpSecureOff" value="false" ${!smtp.secure ? 'checked' : ''}>
              <span style="font-size:.85rem">STARTTLS (Port 587)</span>
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="radio" name="smtpSecure" id="smtpSecureOn" value="true" ${smtp.secure ? 'checked' : ''}>
              <span style="font-size:.85rem">TLS (Port 465)</span>
            </label>
          </div>
          <label class="org-label">${t('org_smtpUsername')}</label>
          <input class="input" id="smtpUser" value="${escHtml(smtp.user||'')}" placeholder="isms@example.com" autocomplete="off">
          <label class="org-label">${t('org_smtpPassword')}</label>
          <input class="input" id="smtpPass" type="password" value="${escHtml(smtp.pass||'')}" placeholder="••••••••" autocomplete="new-password">
          <label class="org-label">${t('org_smtpSender')}</label>
          <input class="input" id="smtpFrom" value="${escHtml(smtp.from||'')}" placeholder="ISMS Builder <isms@example.com>">
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;align-items:center">
          <button class="btn btn-primary btn-sm" onclick="saveSmtpSettings()">
            <i class="ph ph-floppy-disk"></i> ${t('org_saveSmtp')}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="sendTestMail()">
            <i class="ph ph-paper-plane-tilt"></i> ${t('org_sendTestMail')}
          </button>
          <span id="smtpSaveMsg" style="font-size:13px;display:none"></span>
        </div>
        <div style="margin-top:10px;font-size:.8rem;color:var(--text-subtle)">
          ${t('org_testMailDesc').replace('{email}', escHtml(s.cisoEmail || '-'))}
        </div>
      </div>

      <div class="org-section" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <h4 class="org-section-title"><i class="ph ph-cloud-arrow-up"></i> ${t('org_webdavConfig')}</h4>
        <p style="font-size:.85rem;color:var(--text-muted);margin:0 0 12px">${t('org_webdavDesc')}</p>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <label class="module-toggle" style="flex-shrink:0">
            <input type="checkbox" id="webdavEnabled" ${webdav.enabled ? 'checked' : ''}>
            <span class="module-toggle-slider"></span>
          </label>
          <div>
            <div style="font-weight:600;font-size:.9rem">${t('org_webdavEnable')}</div>
            <div style="font-size:.8rem;color:var(--text-subtle)">${t('org_webdavEnableDesc')}</div>
          </div>
        </div>
        <div class="org-grid">
          <label class="org-label">${t('org_webdavBaseUrl')}</label>
          <input class="input" id="webdavBaseUrl" value="${escHtml(webdav.baseUrl||'')}" placeholder="https://cloud.example.com/remote.php/dav/files/isms">
          <label class="org-label">${t('org_webdavUsername')}</label>
          <input class="input" id="webdavUsername" value="${escHtml(webdav.username||'')}" autocomplete="off">
          <label class="org-label">${t('org_webdavAppPassword')}</label>
          <input class="input" id="webdavAppPassword" type="password" value="${escHtml(webdav.appPassword||'')}" placeholder="••••••••" autocomplete="new-password">
          <label class="org-label">${t('org_webdavFolder')}</label>
          <input class="input" id="webdavFolder" value="${escHtml(webdav.folder||'ISMS-Richtlinien')}">
        </div>
        <div class="settings-notice" style="margin-top:12px">
          <i class="ph ph-warning"></i> ${t('org_webdavAppPasswordNotice')}
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;align-items:center">
          <button class="btn btn-primary btn-sm" onclick="saveWebdavSettings()">
            <i class="ph ph-floppy-disk"></i> ${t('org_webdavSave')}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="testWebdavConnection()">
            <i class="ph ph-plugs"></i> ${t('org_webdavTestConnection')}
          </button>
          <span id="webdavSaveMsg" style="font-size:13px;display:none"></span>
        </div>
      </div>

      <div class="org-section" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <h4 class="org-section-title"><i class="ph ph-list-numbers"></i> ${t('org_menuOrder')}</h4>
        <p style="font-size:.82rem;color:var(--text-subtle);margin:0 0 12px">
          ${t('org_menuOrderDesc')}
        </p>
        <div id="navOrderList" style="display:flex;flex-direction:column;gap:4px;max-width:380px">
          ${_renderNavOrderItems(nav)}
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="saveNavOrder()">
          <i class="ph ph-floppy-disk"></i> ${t('org_saveOrder')}
        </button>
        <button class="btn btn-secondary btn-sm" style="margin-top:12px;margin-left:8px" onclick="resetNavOrder()">
          <i class="ph ph-arrow-counter-clockwise"></i> ${t('default')}
        </button>
        <p id="navOrderSaveMsg" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <p id="orgSaveMsg" style="margin-top:10px;font-size:13px;color:var(--success,#4ade80);display:none"></p>

      <div class="org-section" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h4 class="org-section-title" style="margin:0"><i class="ph ph-tree-structure"></i> ${t('org_units')}</h4>
          <button class="btn btn-primary btn-sm" onclick="openOrgUnitModal(null)">
            <i class="ph ph-plus"></i> ${t('org_newUnit')}
          </button>
        </div>
        <p style="font-size:.82rem;color:var(--text-subtle);margin:0 0 12px">
          ${t('org_unitsDesc')}
        </p>
        <table class="risk-table" style="width:100%;font-size:.85rem">
          <thead>
            <tr><th>${t('col_name')}</th><th>${t('col_type')}</th><th>${t('org_parent')}</th><th>${t('org_head')}</th><th>${t('inc_description')}</th><th></th></tr>
          </thead>
          <tbody>
            ${units.length === 0
              ? `<tr><td colspan="6" style="text-align:center;color:var(--text-subtle);padding:12px">${t('org_noUnits')}</td></tr>`
              : units.map(u => {
                  const parent = units.find(p => p.id === u.parentId)
                  const typeBadge = u.type === 'cio' ? 'approved' : u.type === 'group' ? 'review' : u.type === 'local' ? 'draft' : 'archived'
                  return `<tr>
                    <td><strong>${escHtml(u.name)}</strong></td>
                    <td><span class="status-badge status-${typeBadge}">${escHtml(_ouTypeLabel[u.type]||u.type)}</span></td>
                    <td>${escHtml(parent?.name || '–')}</td>
                    <td>${escHtml(u.head || '–')}</td>
                    <td style="color:var(--text-subtle);max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(u.description||'')}</td>
                    <td style="white-space:nowrap">
                      <button class="btn btn-secondary btn-xs" onclick="openOrgUnitModal('${u.id}')"><i class="ph ph-pencil"></i></button>
                      <button class="btn btn-danger btn-xs" style="margin-left:4px" onclick="deleteOrgUnit('${u.id}','${escHtml(u.name)}')"><i class="ph ph-trash"></i></button>
                    </td>
                  </tr>`
                }).join('')
            }
          </tbody>
        </table>
      </div>
    </div>`

  // SMTP-Status aus Server holen und Banner zeigen/verstecken
  try {
    const stRes = await fetch('/admin/email/status', { headers: apiHeaders('admin') })
    if (stRes.ok) {
      const st = await stRes.json()
      const banner = document.getElementById('smtpEnvBanner')
      if (banner && st.envOverride) banner.style.display = 'block'
    }
  } catch {}
}

async function saveOrgSettings() {
  const patch = {
    orgName:   document.getElementById('orgName')?.value.trim(),
    orgShort:  document.getElementById('orgShort')?.value.trim(),
    logoText:  document.getElementById('orgLogoText')?.value.trim(),
    ismsScope: document.getElementById('orgScope')?.value.trim(),
    cisoName:  document.getElementById('orgCisoName')?.value.trim(),
    cisoEmail: document.getElementById('orgCisoEmail')?.value.trim(),
    gdpoName:  document.getElementById('orgGdpoName')?.value.trim(),
    gdpoEmail: document.getElementById('orgGdpoEmail')?.value.trim(),
    icsContact:document.getElementById('orgIcsContact')?.value.trim(),
  }
  const res = await fetch('/admin/org-settings', {
    method: 'PUT',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const msg = document.getElementById('orgSaveMsg')
  if (res.ok) {
    msg.textContent = t('msg_saved'); msg.style.color = 'var(--success,#4ade80)'; msg.style.display = ''
    setTimeout(() => { msg.style.display = 'none' }, 3000)
  } else {
    const e = await res.json().catch(() => ({}))
    msg.textContent = e.error || t('err_saveFailed'); msg.style.color = 'var(--danger-text,#f87171)'; msg.style.display = ''
  }
}

async function saveLangConfig() {
  const available = ['de','en','fr','nl'].filter(c => document.getElementById('langAvail_'+c)?.checked)
  if (available.length === 0) {
    const msg = document.getElementById('langConfigMsg')
    msg.textContent = t('admin_langMinOne'); msg.style.color = 'var(--danger-text,#f87171)'; msg.style.display = ''
    setTimeout(() => { msg.style.display = 'none' }, 3000)
    return
  }
  const def = document.getElementById('langDefault')?.value || 'en'
  const defaultLang = available.includes(def) ? def : available[0]
  const res = await fetch('/admin/org-settings', {
    method: 'PUT',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ languageConfig: { available, default: defaultLang } }),
  })
  const msg = document.getElementById('langConfigMsg')
  msg.style.display = ''
  if (res.ok) {
    _langConfig = { available, default: defaultLang }
    msg.textContent = t('admin_langSaved'); msg.style.color = 'var(--success,#4ade80)'
  } else {
    msg.textContent = t('err_saveFailed'); msg.style.color = 'var(--danger-text,#f87171)'
  }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

async function saveSecuritySettings() {
  const require2FA = !!document.getElementById('org2FAEnforce')?.checked
  const res = await fetch('/admin/security', {
    method: 'PUT',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ require2FA }),
  })
  const msg = document.getElementById('secSaveMsg')
  msg.style.display = ''
  if (res.ok) {
    msg.textContent = require2FA ? t('org_2faEnabled') : t('org_2faDisabled')
    msg.style.color = 'var(--success,#4ade80)'
  } else {
    msg.textContent = t('err_saveFailed')
    msg.style.color = 'var(--danger-text,#f87171)'
  }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

async function saveSplashSettings() {
  const enabled  = !!document.getElementById('splashEnabled')?.checked
  const duration = Math.min(30, Math.max(1, parseInt(document.getElementById('splashDuration')?.value, 10) || 7))
  const res = await fetch('/admin/org-settings', {
    method: 'PUT',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ splashScreen: { enabled, duration } }),
  })
  const msg = document.getElementById('splashSaveMsg')
  msg.style.display = ''
  if (res.ok) {
    msg.textContent = t('org_splashSaved')
    msg.style.color = 'var(--success,#4ade80)'
  } else {
    msg.textContent = t('err_saveFailed')
    msg.style.color = 'var(--danger-text,#f87171)'
  }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

// ── Nav-Reihenfolge Hilfsfunktion ─────────────────────────────────────────────

const _NAV_ORDER_DEFAULT = ['dashboard','soa','guidance','goals','risk','legal','incident','gdpr','training','assets','governance','nis2','bcm','suppliers','policy-acks','reports','calendar','settings','admin']

// Eine gespeicherte Reihenfolge kennt neue Module noch nicht. Die Navigation selbst
// hängt Unbekanntes ans Ende (s. buildNav) — die Sortierliste im Admin muss dasselbe
// tun, sonst lässt sich ein neues Modul nie einsortieren.
function _navOrderWithMissing(order) {
  const list = (order && order.length) ? order.slice() : _NAV_ORDER_DEFAULT.slice()
  const known = new Set(list)
  SECTION_META.forEach(m => { if (!known.has(m.id)) list.push(m.id) })
  return list.filter(sid => SECTION_META.some(m => m.id === sid))
}

function _renderNavOrderItems(order) {
  const list = _navOrderWithMissing(order)
  return list.map(sid => {
    const meta  = SECTION_META.find(m => m.id === sid)
    const label = meta ? (meta.labelKey ? t(meta.labelKey) : meta.label) : sid
    const icon  = meta ? meta.icon  : 'ph-circle'
    return `<div class="nav-order-item" draggable="true" data-sid="${escHtml(sid)}"
              ondragstart="navOrderDragStart(event)" ondragover="navOrderDragOver(event)" ondrop="navOrderDrop(event)"
              style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:grab">
            <i class="ph ph-dots-six-vertical" style="color:var(--text-subtle);font-size:1.1rem;cursor:grab"></i>
            <i class="ph ${escHtml(icon)}" style="width:18px;text-align:center"></i>
            <span style="flex:1;font-size:.88rem">${escHtml(label)}</span>
            <button onclick="navOrderMove('${escHtml(sid)}',-1)" class="btn-icon-sm" title="${t('moveUp')}"><i class="ph ph-arrow-up"></i></button>
            <button onclick="navOrderMove('${escHtml(sid)}',1)"  class="btn-icon-sm" title="${t('moveDown')}"><i class="ph ph-arrow-down"></i></button>
          </div>`
  }).join('')
}

// ── Drag & Drop für Nav-Sortierung ──────────────────────────────────────────

let _navDragSrc = null

function navOrderDragStart(e) {
  _navDragSrc = e.currentTarget
  e.dataTransfer.effectAllowed = 'move'
}

function navOrderDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  const list = document.getElementById('navOrderList')
  const dragging = _navDragSrc
  const target = e.currentTarget
  if (dragging && target && dragging !== target && list.contains(target)) {
    const items = [...list.children]
    const fromIdx = items.indexOf(dragging)
    const toIdx   = items.indexOf(target)
    if (fromIdx > toIdx) list.insertBefore(dragging, target)
    else list.insertBefore(dragging, target.nextSibling)
  }
}

function navOrderDrop(e) {
  e.preventDefault()
  _navDragSrc = null
}

function navOrderMove(sid, delta) {
  const list  = document.getElementById('navOrderList')
  if (!list) return
  const items = [...list.children]
  const idx   = items.findIndex(el => el.dataset.sid === sid)
  if (idx === -1) return
  const newIdx = idx + delta
  if (newIdx < 0 || newIdx >= items.length) return
  if (delta < 0) list.insertBefore(items[idx], items[newIdx])
  else           list.insertBefore(items[newIdx], items[idx])
}

async function saveNavOrder() {
  const list = document.getElementById('navOrderList')
  if (!list) return
  const navOrder = [...list.children].map(el => el.dataset.sid)
  const res = await fetch('/admin/org-settings', {
    method: 'PUT',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ navOrder }),
  })
  const msg = document.getElementById('navOrderSaveMsg')
  msg.style.display = ''
  if (res.ok) {
    msg.textContent = t('org_orderSaved')
    msg.style.color = 'var(--success,#4ade80)'
    // live update nav
    populateSectionNav()
  } else {
    msg.textContent = t('err_saveFailed')
    msg.style.color = 'var(--danger-text,#f87171)'
  }
  setTimeout(() => { msg.style.display = 'none' }, 4000)
}

async function resetNavOrder() {
  const res = await fetch('/admin/org-settings', {
    method: 'PUT',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ navOrder: _NAV_ORDER_DEFAULT }),
  })
  if (res.ok) {
    // re-render list
    const listEl = document.getElementById('navOrderList')
    if (listEl) listEl.innerHTML = _renderNavOrderItems(_NAV_ORDER_DEFAULT)
    populateSectionNav()
  }
}

// ── SMTP-Einstellungen ────────────────────────────────────────────────────────

async function saveSmtpSettings() {
  const secure = document.querySelector('input[name="smtpSecure"]:checked')?.value === 'true'
  const patch = {
    smtpSettings: {
      host:   document.getElementById('smtpHost')?.value.trim() || '',
      port:   parseInt(document.getElementById('smtpPort')?.value || '587', 10),
      secure,
      user:   document.getElementById('smtpUser')?.value.trim() || '',
      pass:   document.getElementById('smtpPass')?.value || '',
      from:   document.getElementById('smtpFrom')?.value.trim() || '',
    }
  }
  const res = await fetch('/admin/org-settings', {
    method: 'PUT',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const msg = document.getElementById('smtpSaveMsg')
  msg.style.display = ''
  if (res.ok) {
    msg.textContent = t('org_smtpSaved')
    msg.style.color = 'var(--success,#4ade80)'
  } else {
    msg.textContent = t('err_saveFailed')
    msg.style.color = 'var(--danger-text,#f87171)'
  }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

async function sendTestMail() {
  const msg = document.getElementById('smtpSaveMsg')
  msg.style.display = ''
  msg.textContent = t('org_sendingTestMail')
  msg.style.color = 'var(--text-subtle)'

  // Recipient: CISO e-mail from the form (if currently open) or org settings
  const to = document.getElementById('orgCisoEmail')?.value.trim()
  if (!to) {
    msg.textContent = t('org_cisoEmailMissing')
    msg.style.color = 'var(--danger-text,#f87171)'
    return
  }
  const res = await fetch('/admin/email/test', {
    method: 'POST',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ to }),
  })
  if (res.ok) {
    msg.textContent = t('org_testMailSent').replace('{email}', to)
    msg.style.color = 'var(--success,#4ade80)'
  } else {
    const e = await res.json().catch(() => ({}))
    msg.textContent = `${t('error')}: ${e.error || t('org_smtpConnectionFailed')}`
    msg.style.color = 'var(--danger-text,#f87171)'
  }
  setTimeout(() => { msg.style.display = 'none' }, 5000)
}

// ── WebDAV-Publish (Nextcloud/ownCloud, #66) ──────────────────────────────────

function _webdavSettingsFromForm() {
  return {
    enabled:     document.getElementById('webdavEnabled')?.checked || false,
    baseUrl:     document.getElementById('webdavBaseUrl')?.value.trim() || '',
    username:    document.getElementById('webdavUsername')?.value.trim() || '',
    appPassword: document.getElementById('webdavAppPassword')?.value || '',
    folder:      document.getElementById('webdavFolder')?.value.trim() || 'ISMS-Richtlinien',
  }
}

async function saveWebdavSettings() {
  const patch = { webdavSettings: _webdavSettingsFromForm() }
  const res = await fetch('/admin/org-settings', {
    method: 'PUT',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const msg = document.getElementById('webdavSaveMsg')
  msg.style.display = ''
  if (res.ok) {
    msg.textContent = t('org_webdavSaved')
    msg.style.color = 'var(--success,#4ade80)'
  } else {
    msg.textContent = t('err_saveFailed')
    msg.style.color = 'var(--danger-text,#f87171)'
  }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

async function testWebdavConnection() {
  const msg = document.getElementById('webdavSaveMsg')
  msg.style.display = ''
  msg.textContent = t('org_webdavTesting')
  msg.style.color = 'var(--text-subtle)'

  const res = await fetch('/admin/webdav/test', {
    method: 'POST',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify(_webdavSettingsFromForm()),
  })
  const result = await res.json().catch(() => ({}))
  if (res.ok && result.ok) {
    msg.textContent = t('org_webdavTestSuccess')
    msg.style.color = 'var(--success,#4ade80)'
  } else {
    msg.textContent = `${t('org_webdavTestFailed')}${result.error ? ': ' + result.error : ''}`
    msg.style.color = 'var(--danger-text,#f87171)'
  }
  setTimeout(() => { msg.style.display = 'none' }, 5000)
}

async function saveEmailSettings() {
  const patch = {
    emailNotifications: {
      enabled:         !!document.getElementById('emailEnabled')?.checked,
      adminEmail:      document.getElementById('emailAdminEmail')?.value.trim() || '',
      risks:           !!document.getElementById('emailRisks')?.checked,
      bcm:             !!document.getElementById('emailBcm')?.checked,
      supplierAudits:  !!document.getElementById('emailSupplierAudits')?.checked,
      dsar:            !!document.getElementById('emailDsar')?.checked,
      gdprIncidents:   !!document.getElementById('emailGdprIncidents')?.checked,
      deletionLog:     !!document.getElementById('emailDeletionLog')?.checked,
      contracts:       !!document.getElementById('emailContracts')?.checked,
      templateReview:  !!document.getElementById('emailTemplateReview')?.checked,
    }
  }
  const res = await fetch('/admin/org-settings', {
    method: 'PUT',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const msg = document.getElementById('emailSaveMsg')
  msg.style.display = ''
  if (res.ok) {
    msg.textContent = t('org_emailSaved')
    msg.style.color = 'var(--success,#4ade80)'
  } else {
    msg.textContent = t('err_saveFailed')
    msg.style.color = 'var(--danger-text,#f87171)'
  }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

// ── Admin: Audit-Log ──────────────────────────────────────────────────────────

const AUDIT_ACTION_LABELS = {
  create: t('audit_actionCreated'), update: t('audit_actionUpdated'), delete: t('audit_actionDeleted'),
  login: t('audit_actionLogin'), logout: t('audit_actionLogout'), export: t('audit_actionExport'), settings: t('audit_actionSettings'),
}
const AUDIT_RESOURCE_LABELS = {
  template: t('template'), risk: t('risk_title'), user: t('audit_resourceUser'), incident: t('incident_title'),
  org: t('admin_org'), gdpr: t('gdpr_title'), soa: t('soa_title'), list: t('admin_lists'), entity: t('reports_entity'), audit: t('admin_auditLog'),
}
let _auditOffset = 0
const _AUDIT_LIMIT = 50

async function renderAdminAuditTab() {
  const container = document.getElementById('adminTabPanelAudit')
  if (!container) return
  _auditOffset = 0
  container.innerHTML = `
    <div class="audit-panel">
      <div class="admin-lists-panel-header" style="margin-bottom:12px">
        <span class="admin-panel-title"><i class="ph ph-scroll"></i> ${t('admin_auditLog')}</span>
        <button class="btn btn-sm" style="color:var(--danger-text)" onclick="clearAuditLog()">
          <i class="ph ph-trash"></i> ${t('auditLog_clear')}
        </button>
      </div>
      <div class="audit-filter-bar">
        <input class="input" id="auditFilterUser" placeholder="${t('audit_userPlaceholder')}" style="width:180px"
               oninput="loadAuditLog()">
        <select class="select" id="auditFilterAction" onchange="loadAuditLog()" style="width:140px">
          <option value="">${t('auditLog_allActions')}</option>
          ${Object.entries(AUDIT_ACTION_LABELS).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>
        <select class="select" id="auditFilterResource" onchange="loadAuditLog()" style="width:140px">
          <option value="">${t('auditLog_allRes')}</option>
          ${Object.entries(AUDIT_RESOURCE_LABELS).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>
        <input class="input" id="auditFilterFrom" type="date" title="${t('reports_from')}" onchange="loadAuditLog()" style="width:140px">
        <input class="input" id="auditFilterTo"   type="date" title="${t('reports_to')}" onchange="loadAuditLog()" style="width:140px">
      </div>
      <div id="auditLogTable"></div>
      <div id="auditPager" style="padding:10px 0;display:flex;gap:8px;align-items:center"></div>
    </div>`
  loadAuditLog()
}

async function loadAuditLog() {
  const container = document.getElementById('auditLogTable')
  if (!container) return
  container.innerHTML = `<p class="report-loading">${t('loading')}</p>`

  const params = new URLSearchParams({
    limit:  _AUDIT_LIMIT,
    offset: _auditOffset,
  })
  const user     = document.getElementById('auditFilterUser')?.value.trim()
  const action   = document.getElementById('auditFilterAction')?.value
  const resource = document.getElementById('auditFilterResource')?.value
  const from     = document.getElementById('auditFilterFrom')?.value
  const to       = document.getElementById('auditFilterTo')?.value
  if (user)     params.set('user', user)
  if (action)   params.set('action', action)
  if (resource) params.set('resource', resource)
  if (from)     params.set('from', from)
  if (to)       params.set('to', to + 'T23:59:59Z')

  const res = await fetch('/admin/audit-log?' + params, { headers: apiHeaders('admin') })
  if (!res.ok) { container.innerHTML = `<p class="report-empty">${t('err_load')}</p>`; return }
  const { total, entries } = await res.json()

  if (!entries.length) {
    container.innerHTML = `<p class="report-empty">${t('auditLog_noEntries')}</p>`
  } else {
    container.innerHTML = `
      <table class="admin-user-table audit-table">
        <thead><tr>
          <th style="width:150px">${t('auditLog_time')}</th>
          <th style="width:180px">${t('audit_resourceUser')}</th>
          <th style="width:100px">${t('auditLog_action')}</th>
          <th style="width:110px">${t('auditLog_resource')}</th>
          <th>${t('auditLog_detail')}</th>
        </tr></thead>
        <tbody>
          ${entries.map(e => `
            <tr>
              <td style="font-size:12px;white-space:nowrap;color:var(--text-subtle)">
                ${new Date(e.ts).toLocaleString('en-GB')}</td>
              <td style="font-size:12px">${escHtml(e.user)}</td>
              <td><span class="badge audit-action-${e.action}">${escHtml(AUDIT_ACTION_LABELS[e.action]||e.action)}</span></td>
              <td><span class="badge">${escHtml(AUDIT_RESOURCE_LABELS[e.resource]||e.resource)}</span></td>
              <td style="font-size:12px;color:var(--text-subtle)">${escHtml(e.detail||e.resourceId||'')}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
  }

  // Pager
  const pager = document.getElementById('auditPager')
  if (pager) {
    const curPage  = Math.floor(_auditOffset / _AUDIT_LIMIT) + 1
    const totPages = Math.max(1, Math.ceil(total / _AUDIT_LIMIT))
    pager.innerHTML = `
      <span style="font-size:12px;color:var(--text-subtle)">${total} ${t('auditLog_total')}</span>
      <button class="btn btn-sm" onclick="_auditOffset=Math.max(0,_auditOffset-${_AUDIT_LIMIT});loadAuditLog()"
              ${_auditOffset === 0 ? 'disabled' : ''}><i class="ph ph-caret-left"></i></button>
      <span style="font-size:12px">${curPage} / ${totPages}</span>
      <button class="btn btn-sm" onclick="_auditOffset=_auditOffset+${_AUDIT_LIMIT};loadAuditLog()"
              ${_auditOffset + _AUDIT_LIMIT >= total ? 'disabled' : ''}><i class="ph ph-caret-right"></i></button>`
  }
}

async function clearAuditLog() {
  if (!confirm(t('auditLog_confirm'))) return
  const res = await fetch('/admin/audit-log', { method: 'DELETE', headers: apiHeaders('admin') })
  if (res.ok) loadAuditLog()
  else alert(t('auditLog_clearError'))
}

// ── Admin: Daten & Wartung ────────────────────────────────────────────────────

async function renderAdminMaintenanceTab() {
  const container = document.getElementById('adminTabPanelMaintenance')
  if (!container) return
  const entRes = await fetch('/entities', { headers: apiHeaders('reader') })
  const _entities = entRes.ok ? await entRes.json() : []
  const entityOpts = _entities.filter(e => e.type !== 'holding')
    .map(e => `<option value="${e.id}">${escHtml(e.name)}</option>`).join('')
  container.innerHTML = `
    <div class="maintenance-panel">
      <div class="admin-lists-panel-header" style="margin-bottom:16px">
        <span class="admin-panel-title"><i class="ph ph-hard-drives"></i> ${t('maint_dataMaintenance')}</span>
      </div>

      <!-- ── Production transition notice ── -->
      <div id="productionHintBox" style="display:none;margin-bottom:20px;padding:16px 20px;border-radius:8px;border:2px solid #f59e0b;background:rgba(245,158,11,.08);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <i class="ph ph-warning" style="color:#f59e0b;font-size:20px;flex-shrink:0"></i>
          <strong style="color:#f59e0b;font-size:15px;">${t('maint_productionRestartTitle')}</strong>
        </div>
        <p style="margin:0 0 10px;font-size:13px;color:var(--text);">
          ${t('maint_productionRestartDesc')}
        </p>
        <div style="background:var(--bg);border-radius:6px;padding:10px 14px;font-size:12px;font-family:monospace;color:var(--text);">
          # Restart (direct):<br>
          npm start<br><br>
          # Restart (Docker):<br>
          docker compose restart
        </div>
        <p style="margin:10px 0 0;font-size:12px;color:var(--text-subtle);">
          ${t('maint_productionRestartAfter')}
        </p>
      </div>

      <div class="maintenance-section">
        <h4 class="org-section-title"><i class="ph ph-arrow-circle-up"></i> ${t('maint_updateCheck')}</h4>
        <p class="settings-desc">${t('maint_updateCheckDesc')}</p>
        <div id="updateCheckResult" style="font-size:13px;padding:10px 14px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border);margin-bottom:10px">
          ${t('maint_updateCheckNever')}
        </div>
        <button class="btn btn-secondary btn-sm" onclick="runUpdateCheck()" id="btnUpdateCheck">
          <i class="ph ph-magnifying-glass"></i> ${t('maint_updateCheckButton')}
        </button>
      </div>

      <div class="maintenance-section">
        <h4 class="org-section-title"><i class="ph ph-database"></i> ${t('maint_backend')}</h4>
        <div id="storageBackendInfo" style="font-size:13px;padding:10px 14px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border);margin-bottom:6px;">
          ${t('loading')}
        </div>
        <p class="settings-desc">
          ${t('maint_backendDesc')}
        </p>
      </div>

      <div class="maintenance-section">
        <h4 class="org-section-title">${t('maint_backup')}</h4>
        <p class="settings-desc">
          ${t('maint_backupDesc')}
        </p>
        <button class="btn btn-primary" onclick="triggerExport()">
          <i class="ph ph-download-simple"></i> ${t('maint_download')}
        </button>
      </div>

      <div class="maintenance-section" style="margin-top:20px">
        <h4 class="org-section-title">${t('maint_cleanupOrphans')}</h4>
        <p class="settings-desc">
          ${t('maint_cleanupOrphansDesc')}
        </p>
        <button class="btn" onclick="runCleanup()" id="btnCleanup">
          <i class="ph ph-broom"></i> ${t('maint_cleanup')}
        </button>
        <p id="cleanupResult" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <div class="maintenance-section" id="aiSettingsSection" style="margin-top:24px;border-top:1px solid var(--border);padding-top:20px">
        <h4 class="org-section-title"><i class="ph ph-robot"></i> ${t('maint_aiIntegration')}</h4>
        <p class="settings-desc">
          ${t('maint_aiDesc')}
        </p>

        <div id="aiStatusBadge" style="margin-bottom:14px"></div>

        <div class="settings-group" style="margin-bottom:14px">
          <label class="settings-label">${t('maint_enableAiSearch')}</label>
          <label class="toggle-switch" style="margin-top:4px">
            <input type="checkbox" id="aiEnabledToggle" onchange="saveAiSettings()" />
            <span class="toggle-slider"></span>
          </label>
          <p class="settings-desc" style="margin-top:4px">
            ${t('maint_aiGlobalSwitch')}
          </p>
        </div>

        <div id="aiAdvancedSettings">
          <div class="settings-group" style="margin-bottom:10px">
            <label class="settings-label" for="aiOllamaUrlInput">${t('maint_ollamaUrl')}</label>
            <input class="form-input" id="aiOllamaUrlInput" placeholder="http://localhost:11434 (default)"
                   style="max-width:320px" onblur="saveAiSettings()" />
          </div>
          <div class="settings-group" style="margin-bottom:14px">
            <label class="settings-label" for="aiEmbedModelInput">${t('maint_embeddingModel')}</label>
            <input class="form-input" id="aiEmbedModelInput" placeholder="nomic-embed-text (default)"
                   style="max-width:220px" onblur="saveAiSettings()" />
          </div>

          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="triggerReindex()" id="btnReindex">
              <i class="ph ph-arrows-clockwise"></i> ${t('maint_rebuildIndex')}
            </button>
            <button class="btn" onclick="refreshAiStatus()">
              <i class="ph ph-plugs-connected"></i> ${t('maint_checkStatus')}
            </button>
          </div>
          <p id="reindexResult" style="margin-top:8px;font-size:13px;display:none"></p>
        </div>
      </div>

      <div class="maintenance-section" style="margin-top:24px;border-top:1px solid var(--border);padding-top:20px">
        <h4 class="org-section-title"><i class="ph ph-shield-warning"></i> Greenbone Scan-Import</h4>
        <p class="settings-desc">
          ${t('scanImport_descPrefix')}
          ${t('scanImport_descSuffix')}
        </p>
        <form onsubmit="event.preventDefault();scanImportUpload(this)">
          <div style="display:flex;flex-direction:column;gap:10px;max-width:520px">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <input type="file" id="scanImportFile" accept=".xml,.pdf" class="form-input" style="flex:1;min-width:200px" required />
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <div style="flex:1;min-width:160px">
                <label class="form-label" style="font-size:12px">${t('reports_entity')} (${t('ack_optional')})</label>
                <select id="scanImportEntity" class="select" style="width:100%">
                  <option value="">— ${t('scanImport_noAssignment')} —</option>
                  ${entityOpts}
                </select>
              </div>
              <div style="flex:1;min-width:160px">
                <label class="form-label" style="font-size:12px">${t('scanImport_reference')} (${t('ack_optional')})</label>
                <input type="text" id="scanImportRef" class="form-input" placeholder="${t('scanImport_referencePlaceholder')}" style="width:100%" />
              </div>
            </div>
            <div style="display:flex;gap:10px">
              <button type="submit" id="scanImportBtn" class="btn btn-primary">
                <i class="ph ph-upload-simple"></i> ${t('import_action')}
              </button>
            </div>
          </div>
        </form>
        <div id="scanImportResult" style="margin-top:12px"></div>
        <div id="scanImportStatus" style="margin-top:8px;font-size:12px;color:var(--text-subtle)"></div>
      </div>

      <div class="maintenance-section" style="margin-top:24px;border-top:1px solid var(--border);padding-top:20px">
        <h4 class="org-section-title" style="color:#e74c3c"><i class="ph ph-arrow-counter-clockwise"></i> ${t('maint_demoResetTitle')}</h4>
        <p class="settings-desc">
          ${t('maint_demoResetDesc')}
        </p>
        <button class="btn" style="background:rgba(231,76,60,.15);border-color:#e74c3c;color:#e74c3c"
                onclick="triggerDemoReset()" id="btnDemoReset">
          <i class="ph ph-trash"></i> ${t('maint_demoReset')}
        </button>
        <p id="demoResetResult" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <div class="maintenance-section" style="margin-top:20px">
        <h4 class="org-section-title" style="color:#d98c00"><i class="ph ph-upload-simple"></i> ${t('maint_demoImport')}</h4>
        <p class="settings-desc">
          ${t('maint_demoImportDesc')}
        </p>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <input type="file" id="demoImportFile" accept=".json" style="display:none" onchange="triggerDemoImport(this)" />
          <button class="btn" style="background:rgba(217,140,0,.12);border-color:#d98c00;color:#d98c00"
                  onclick="document.getElementById('demoImportFile').click()">
            <i class="ph ph-upload-simple"></i> ${t('maint_selectJsonImport')}
          </button>
        </div>
        <p id="demoImportResult" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <div class="maintenance-section" id="splashScreenSection" style="margin-top:24px;border-top:1px solid var(--border);padding-top:20px">
        <h4 class="org-section-title"><i class="ph ph-image"></i> ${t('maint_splashScreen')}</h4>
        <p class="settings-desc">
          ${t('maint_splashDesc')}
        </p>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
          <label class="module-toggle" style="flex-shrink:0">
            <input type="checkbox" id="splashEnabled">
            <span class="module-toggle-slider"></span>
          </label>
          <div>
            <div style="font-size:13px;color:var(--text)">${t('maint_enableSplash')}</div>
            <div style="font-size:12px;color:var(--text-subtle)">${t('maint_showSplash')}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <label style="white-space:nowrap;font-size:13px;color:var(--text-subtle)">${t('maint_durationSeconds')}</label>
          <input class="input" id="splashDuration" type="number" min="1" max="30" style="width:80px" value="7">
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="saveSplashSettings()">
          <i class="ph ph-floppy-disk"></i> ${t('save')}
        </button>
        <p id="splashSaveMsg" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>
    </div>`

  // Backend-Info laden
  _loadStorageBackendInfo()
  // KI-Einstellungen laden und UI befüllen
  refreshAiStatus()
  // Splash-Einstellungen aus org-settings laden
  try {
    const sr = await fetch('/admin/org-settings', { headers: apiHeaders() })
    if (sr.ok) {
      const sd = await sr.json()
      const sp = sd.splashScreen || {}
      const enCb = document.getElementById('splashEnabled')
      const durIn = document.getElementById('splashDuration')
      if (enCb)  enCb.checked   = sp.enabled !== false
      if (durIn) durIn.value    = Math.min(30, Math.max(1, Number(sp.duration) || 7))
    }
  } catch {}
}

function triggerExport() {
  const a = document.createElement('a')
  a.href = '/admin/export'
  a.download = ''
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function runUpdateCheck(force = true) {
  const btn = document.getElementById('btnUpdateCheck')
  const box = document.getElementById('updateCheckResult')
  if (!box) return
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ph ph-spinner"></i> ${t('maint_updateChecking')}` }
  box.textContent = t('maint_updateChecking')

  try {
    const res = await fetch(`/admin/update-check?force=${force}`, { headers: apiHeaders('admin') })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      box.innerHTML = `<span style="color:var(--danger-text,#f87171)"><i class="ph ph-warning-circle"></i> ${t('maint_updateCheckFailed')}${data.error ? ': ' + escHtml(data.error) : ''}</span>`
    } else if (data.updateAvailable) {
      box.innerHTML = `<span style="color:var(--warning-text,#f0b429)"><i class="ph ph-arrow-circle-up"></i> ${t('maint_updateAvailable')} <strong>${escHtml(data.latestVersion)}</strong> (${t('maint_currentVersion')}: ${escHtml(data.currentVersion)}) — <a href="${escHtml(data.releaseUrl)}" target="_blank" rel="noopener noreferrer">${t('maint_updateViewRelease')}</a></span>`
    } else {
      box.innerHTML = `<span style="color:var(--success,#4ade80)"><i class="ph ph-check-circle"></i> ${t('maint_updateUpToDate')} (${escHtml(data.currentVersion)})</span>`
    }
  } catch (e) {
    box.innerHTML = `<span style="color:var(--danger-text,#f87171)"><i class="ph ph-warning-circle"></i> ${t('maint_updateCheckFailed')}: ${escHtml(e.message)}</span>`
  }
  if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ph ph-magnifying-glass"></i> ${t('maint_updateCheckButton')}` }
}

async function runCleanup() {
  const btn = document.getElementById('btnCleanup')
  const msg = document.getElementById('cleanupResult')
  btn.disabled = true
  btn.innerHTML = '<i class="ph ph-spinner"></i> Running…'
  const res = await fetch('/admin/maintenance/cleanup', { method: 'POST', headers: apiHeaders('admin') })
  btn.disabled = false
  btn.innerHTML = '<i class="ph ph-broom"></i> Start cleanup'
  if (res.ok) {
    const data = await res.json()
    msg.style.display = ''
    msg.style.color = 'var(--success,#4ade80)'
    msg.textContent = data.removed.length
      ? `${data.removed.length} file(s) removed: ${data.removed.join(', ')}`
      : 'No orphaned files found.'
  } else {
    msg.style.display = ''; msg.style.color = 'var(--danger-text)'; msg.textContent = 'Error during cleanup.'
  }
}

async function _loadStorageBackendInfo() {
  const box  = document.getElementById('storageBackendInfo')
  const hint = document.getElementById('productionHintBox')
  if (!box) return
  try {
    const res = await fetch('/api/storage-info', { credentials: 'include', headers: apiHeaders() })
    if (!res.ok) throw new Error()
    const { backend, restartPending } = await res.json()
    const isJson   = backend === 'json'
    const color    = isJson ? '#f59e0b' : '#4ade80'
    const icon     = isJson ? 'ph-warning' : 'ph-check-circle'
    const label    = isJson ? 'JSON (Demo/Development)' : 'SQLite (Production)'
    box.innerHTML  = `<i class="ph ${icon}" style="color:${color};margin-right:6px"></i>
      <strong>Active backend:</strong> <code>${label}</code>
      ${isJson ? ' &nbsp;— <span style="color:#f59e0b;font-weight:600">Not suitable for production</span>' : ''}`
    if (hint) hint.style.display = restartPending ? '' : 'none'
  } catch {
    box.textContent = 'Backend info unavailable'
  }
}

async function refreshAiStatus() {
  const badge   = document.getElementById('aiStatusBadge')
  const toggle  = document.getElementById('aiEnabledToggle')
  const urlInp  = document.getElementById('aiOllamaUrlInput')
  const modelInp= document.getElementById('aiEmbedModelInput')
  const advanced= document.getElementById('aiAdvancedSettings')
  if (!badge) return

  badge.innerHTML = '<span style="color:var(--text-subtle);font-size:13px">Loading status…</span>'

  try {
    // Einstellungen laden
    const cfgRes = await fetch('/admin/ai-settings', { credentials: 'include', headers: apiHeaders('admin') })
    const cfg    = cfgRes.ok ? await cfgRes.json() : {}
    if (toggle)   toggle.checked    = cfg.aiEnabled !== false
    if (urlInp)   urlInp.value      = cfg.aiOllamaUrl  || ''
    if (modelInp) modelInp.value    = cfg.aiEmbedModel || ''
    if (advanced) advanced.style.display = cfg.aiEnabled !== false ? '' : 'none'

    // Ollama-Status prüfen
    const stRes = await fetch('/api/ai/status', { credentials: 'include', headers: apiHeaders() })
    const st    = stRes.ok ? await stRes.json() : {}

    const enabledBadge = cfg.aiEnabled !== false
      ? `<span style="background:rgba(74,222,128,.12);color:#4ade80;border:1px solid rgba(74,222,128,.3);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;">✓ ${t('ui_enabled')}</span>`
      : `<span style="background:rgba(255,255,255,.05);color:var(--text-subtle);border:1px solid var(--border);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;">${t('ui_disabled')}</span>`

    const ollamaBadge = st.ollama
      ? `<span style="background:rgba(74,222,128,.12);color:#4ade80;border:1px solid rgba(74,222,128,.3);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;margin-left:8px;">⬤ ${t('ai_ollamaOnline')}</span>`
      : `<span style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;margin-left:8px;">⬤ ${t('ai_ollamaOffline')}</span>`

    const modeBadge = st.mode === 'semantic'
      ? `<span style="background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.3);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;margin-left:8px;">${t('ai_semanticActive')}</span>`
      : `<span style="background:rgba(255,255,255,.06);color:var(--text-subtle);border:1px solid var(--border);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;margin-left:8px;">${t('ai_keywordFallback')}</span>`
    const indexBadge = `<span style="color:var(--text-subtle);font-size:12px;margin-left:10px;">${st.indexed ?? 0} ${t('ai_docsIndexed')} ${st.model || 'nomic-embed-text'}</span>`

    badge.innerHTML = enabledBadge + (cfg.aiEnabled !== false ? ollamaBadge + modeBadge + indexBadge : '')
  } catch {
    badge.innerHTML = '<span style="color:var(--text-subtle);font-size:13px">Status unavailable</span>'
  }
}

async function saveAiSettings() {
  const toggle   = document.getElementById('aiEnabledToggle')
  const urlInp   = document.getElementById('aiOllamaUrlInput')
  const modelInp = document.getElementById('aiEmbedModelInput')
  const advanced = document.getElementById('aiAdvancedSettings')

  const payload = {
    aiEnabled:    toggle?.checked ?? true,
    aiOllamaUrl:  urlInp?.value.trim()   || '',
    aiEmbedModel: modelInp?.value.trim() || '',
  }
  if (advanced) advanced.style.display = payload.aiEnabled ? '' : 'none'

  try {
    await fetch('/admin/ai-settings', {
      method: 'PUT', credentials: 'include',
      headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    showToast(payload.aiEnabled ? 'AI integration enabled.' : 'AI integration disabled.', payload.aiEnabled ? 'success' : 'info')
    refreshAiStatus()
  } catch {
    showToast('Error saving AI settings.', 'error')
  }
}

async function triggerReindex() {
  const btn = document.getElementById('btnReindex')
  const msg = document.getElementById('reindexResult')
  btn.disabled = true
  btn.innerHTML = '<i class="ph ph-spinner"></i> Indexing…'
  try {
    const res = await fetch('/api/ai/reindex', { method: 'POST', credentials: 'include', headers: apiHeaders('admin') })
    const data = await res.json()
    msg.style.display = ''
    if (res.ok) {
      msg.style.color = 'var(--success,#4ade80)'
      msg.textContent = `${data.indexed} documents indexed, ${data.skipped} skipped.`
    } else {
      msg.style.color = 'var(--danger-text,#f87171)'
      msg.textContent = data.error || 'Error during re-index.'
    }
    refreshAiStatus()
  } catch {
    msg.style.display = ''
    msg.style.color = 'var(--danger-text,#f87171)'
    msg.textContent = 'Connection error during re-index.'
  }
  btn.disabled = false
  btn.innerHTML = '<i class="ph ph-arrows-clockwise"></i> Rebuild index'
}

async function triggerDemoReset() {
  const confirm1 = prompt('WARNING: This operation deletes ALL module data irreversibly!\nType RESET to confirm:')
  if (confirm1 !== 'RESET') { showToast('Demo reset cancelled.', 'info'); return }
  const btn = document.getElementById('btnDemoReset')
  const msg = document.getElementById('demoResetResult')
  btn.disabled = true
  btn.innerHTML = '<i class="ph ph-spinner"></i> Resetting…'
  try {
    const res = await fetch('/admin/demo-reset', { method: 'POST', headers: apiHeaders('admin') })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Error during reset')
    }
    const restartRequired = res.headers.get('X-Restart-Required') === '1'
    const envSwitched     = res.headers.get('X-Env-Switched') === '1'

    // Trigger bundle file download
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `isms-demo-export-${new Date().toISOString().slice(0,10)}.json`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)

    if (restartRequired) {
      // Restart needed — no automatic redirect, show clear message instead
      btn.disabled = false
      btn.innerHTML = '<i class="ph ph-trash"></i> Perform demo reset'
      msg.style.display = ''
      msg.style.color = 'var(--warning, #f59e0b)'
      msg.innerHTML = `
        <strong>✓ Demo reset completed.</strong><br>
        ${envSwitched ? '⚙️ <code>STORAGE_BACKEND=sqlite</code> was set in <code>.env</code>.' : ''}<br>
        <strong style="color:#e74c3c">⚠️ Server restart required</strong> for SQLite to become active.<br>
        <code style="font-size:11px">npm start</code> &nbsp;or&nbsp; <code style="font-size:11px">docker compose restart</code>
      `
    } else {
      setTimeout(() => { window.location.href = '/ui/login.html' }, 800)
    }
  } catch (e) {
    btn.disabled = false
    btn.innerHTML = '<i class="ph ph-trash"></i> Perform demo reset'
    msg.style.display = ''; msg.style.color = 'var(--danger-text)'; msg.textContent = 'Error: ' + e.message
  }
}

async function triggerDemoImport(input) {
  const file = input.files[0]
  if (!file) return
  const msg = document.getElementById('demoImportResult')
  msg.style.display = 'none'
  if (!confirm(`Import demo data from "${file.name}"?\n\nAll module data will be overwritten. The admin account will remain unchanged.`)) {
    input.value = ''; return
  }
  try {
    const text = await file.text()
    const bundle = JSON.parse(text)
    const res = await fetch('/admin/demo-import', {
      method: 'POST',
      headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
      body: JSON.stringify(bundle)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error')
    msg.style.display = ''; msg.style.color = 'var(--success,#4ade80)'
    msg.textContent = 'Import successful. Reloading page…'
    setTimeout(() => location.reload(), 1500)
  } catch (e) {
    msg.style.display = ''; msg.style.color = 'var(--danger-text)'; msg.textContent = 'Error: ' + e.message
  }
  input.value = ''
}

// ── Admin: Papierkorb ────────────────────────────────────────────────────────

async function renderAdminTrashTab() {
  const container = document.getElementById('adminTabPanelTrash')
  if (!container) return
  container.innerHTML = '<p class="report-loading">Loading trash…</p>'
  const res = await fetch('/trash', { headers: apiHeaders('admin') })
  if (!res.ok) {
    container.innerHTML = `<p class="report-error" style="padding:20px">${t('trash_loadError')}</p>`
    return
  }
  const items = await res.json()

  if (items.length === 0) {
    container.innerHTML = `<p class="gdpr-empty" style="padding:20px">${t('trash_empty')}</p>`
    return
  }

  // Group by moduleLabel
  const groups = {}
  items.forEach(i => {
    if (!groups[i.moduleLabel]) groups[i.moduleLabel] = []
    groups[i.moduleLabel].push(i)
  })

  container.innerHTML = `
    <div class="trash-info">
      <i class="ph ph-info"></i> ${t('trash_autoDelete')}
      <strong>${items.length} ${t('trash_entries')}</strong> ${t('trash_inTrash')}.
    </div>
    ${Object.entries(groups).map(([label, group]) => `
      <div class="trash-group">
        <h4 class="trash-group-title">${escHtml(label)} (${group.length})</h4>
        <table class="gdpr-table">
          <thead><tr><th>${t('col_title')}</th><th>${t('trash_deletedBy')}</th><th>${t('trash_deletedAt')}</th><th>${t('trash_expires')}</th><th>${t('col_actions')}</th></tr></thead>
          <tbody>
            ${group.map(item => {
              const daysLeft = Math.max(0, Math.ceil((new Date(item.expiresAt) - Date.now()) / 86400000))
              return `<tr>
                <td><strong>${escHtml(item.title || item.id)}</strong></td>
                <td>${escHtml(item.deletedBy || '—')}</td>
                <td style="white-space:nowrap">${new Date(item.deletedAt).toLocaleDateString('en-GB')}</td>
                <td style="color:${daysLeft < 7 ? '#f87171' : 'inherit'}">${daysLeft} ${t('reports_days')}</td>
                <td style="display:flex;gap:6px">
                  <button class="btn btn-secondary btn-sm" onclick="restoreTrashItem('${escHtml(item.module)}','${escHtml(item.id)}',${JSON.stringify(item.meta||{})})">
                    <i class="ph ph-arrow-counter-clockwise"></i> ${t('restore')}
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="permanentDeleteTrashItem('${escHtml(item.module)}','${escHtml(item.id)}',${JSON.stringify(item.meta||{})})">
                    <i class="ph ph-trash"></i> ${t('trash_deletePermanent')}
                  </button>
                </td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
    `).join('')}
  `
}

async function restoreTrashItem(module, id, meta) {
  if (!confirm(t('trash_restoreItemConfirm'))) return
  let url
  if (module === 'template') url = `/template/${meta.type}/${id}/restore`
  else if (module === 'risk') url = `/risks/${id}/restore`
  else if (module === 'goal') url = `/goals/${id}/restore`
  else if (module === 'guidance') url = `/guidance/${id}/restore`
  else if (module === 'training') url = `/training/${id}/restore`
  else if (module === 'legal_contract') url = `/legal/contracts/${id}/restore`
  else if (module === 'legal_nda') url = `/legal/ndas/${id}/restore`
  else if (module === 'legal_policy') url = `/legal/policies/${id}/restore`
  else if (module === 'gdpr_vvt') url = `/gdpr/vvt/${id}/restore`
  else if (module === 'gdpr_av') url = `/gdpr/av/${id}/restore`
  else if (module === 'gdpr_dsfa') url = `/gdpr/dsfa/${id}/restore`
  else if (module === 'gdpr_incident') url = `/gdpr/incidents/${id}/restore`
  else if (module === 'gdpr_dsar') url = `/gdpr/dsar/${id}/restore`
  else if (module === 'gdpr_toms') url = `/gdpr/toms/${id}/restore`
  else if (module === 'public_incident') url = `/public/incident/${id}/restore`
  else if (module === 'finding') url = `/findings/${id}/restore`
  else { alert(t('trash_unknownModule')); return }

  const res = await fetch(url, { method: 'POST', headers: apiHeaders('admin') })
  if (!res.ok) { alert(t('trash_restoreFailed')); return }
  renderAdminTrashTab()
}

async function permanentDeleteTrashItem(module, id, meta) {
  if (!confirm(t('trash_permanentDeleteConfirm'))) return
  let url
  if (module === 'template') url = `/template/${meta.type}/${id}/permanent`
  else if (module === 'risk') url = `/risks/${id}/permanent`
  else if (module === 'goal') url = `/goals/${id}/permanent`
  else if (module === 'guidance') url = `/guidance/${id}/permanent`
  else if (module === 'training') url = `/training/${id}/permanent`
  else if (module === 'legal_contract') url = `/legal/contracts/${id}/permanent`
  else if (module === 'legal_nda') url = `/legal/ndas/${id}/permanent`
  else if (module === 'legal_policy') url = `/legal/policies/${id}/permanent`
  else if (module === 'gdpr_vvt') url = `/gdpr/vvt/${id}/permanent`
  else if (module === 'gdpr_av') url = `/gdpr/av/${id}/permanent`
  else if (module === 'gdpr_dsfa') url = `/gdpr/dsfa/${id}/permanent`
  else if (module === 'gdpr_incident') url = `/gdpr/incidents/${id}/permanent`
  else if (module === 'gdpr_dsar') url = `/gdpr/dsar/${id}/permanent`
  else if (module === 'gdpr_toms') url = `/gdpr/toms/${id}/permanent`
  else if (module === 'public_incident') url = `/public/incident/${id}/permanent`
  else if (module === 'finding') url = `/findings/${id}/permanent`
  else { alert(t('trash_unknownModule')); return }

  const res = await fetch(url, { method: 'DELETE', headers: apiHeaders('admin') })
  if (!res.ok) { alert(t('trash_deleteFailed')); return }
  renderAdminTrashTab()
}

// ── Admin: System-Konfiguration (Modul-Management) ───────────────────────────

const MODULE_META = [
  {
    id: 'soa', label: 'SoA – Statement of Applicability', icon: 'ph-shield-check',
    desc: 'Verwaltung aller Compliance-Controls (ISO 27001, BSI, NIS2, EUCS, EUAI, ISO 9001, CRA). Framework-Tabs, Inline-Edit, Cross-Mapping.',
    norms: ['ISO 27001', 'BSI IT-Grundschutz', 'NIS2', 'EUCS', 'ISO 9001'],
  },
  {
    id: 'guidance', label: 'Guidance & Documentation', icon: 'ph-compass',
    desc: 'Internal documentation hub: system manual, roles, policy processes, SoA guides. Markdown editor + PDF/DOCX upload.',
    norms: ['ISO 27001 A.5.1', 'ISO 9001 Cl. 7.5'],
  },
  {
    id: 'goals', label: 'Security Goals', icon: 'ph-target',
    desc: 'SMART security goals with KPI tracking, progress bars, priorities and calendar integration.',
    norms: ['ISO 27001 Cl. 6.2'],
  },
  {
    id: 'risk', label: 'Risk & Compliance', icon: 'ph-warning',
    desc: 'Risk register with heatmap, treatment plans, risk matrix and calendar. Roles: contentowner and auditor.',
    norms: ['ISO 27001 Cl. 6.1', 'ISO 31000'],
  },
  {
    id: 'legal', label: 'Legal & Privacy', icon: 'ph-scales',
    desc: 'Management of contracts, NDAs and privacy policies with term tracking and calendar integration.',
    norms: ['ISO 27001 A.5.31', 'GDPR Art. 28'],
  },
  {
    id: 'incident', label: 'Incident Inbox (CISO)', icon: 'ph-siren',
    desc: 'Inbox for publicly reported security incidents (no login required for reporting). CISO handling, reference numbers, assignment.',
    norms: ['ISO 27001 A.5.24–5.28', 'NIS2 Art. 23'],
  },
  {
    id: 'gdpr', label: 'GDPR & Privacy', icon: 'ph-lock-key',
    desc: 'Full GDPR module: RoPA (Art. 30), DPA (Art. 28), DPIA (Art. 35), data breaches (Art. 33/34), DSAR (Art. 15–22), TOMs (Art. 32), DPO (Art. 37), deletion log (Art. 17).',
    norms: ['GDPR', 'BDSG'],
  },
  {
    id: 'training', label: 'Training', icon: 'ph-graduation-cap',
    desc: 'Training planning with status tracking, due dates, assignee groups and calendar integration.',
    norms: ['ISO 27001 A.6.3', 'ISO 9001 Cl. 7.2'],
  },
  {
    id: 'reports', label: 'Reports', icon: 'ph-chart-line',
    desc: '7 report types: Compliance, Framework, Gap Analysis, Documents, Reviews, Compliance Matrix, Audit Trail. CSV export.',
    norms: ['ISO 27001 Cl. 9.1', 'ISO 9001 Cl. 9.1'],
  },
  {
    id: 'calendar', label: 'Calendar', icon: 'ph-calendar-dots',
    desc: 'Aggregated monthly view of all dates from all modules: reviews, audits, contract deadlines, DSAR deadlines, goals, training.',
    norms: [],
  },
  {
    id: 'assets', label: 'Asset Management', icon: 'ph-buildings',
    desc: 'Inventory of all information assets (hardware, software, data, services, facilities). Classification per ISO 27001 A.5.12, criticality, owner, EoL tracking.',
    norms: ['ISO 27001 A.5.9', 'ISO 27001 A.5.10', 'ISO 27001 A.5.12'],
  },
  {
    id: 'governance', label: 'Governance & Management Review', icon: 'ph-chalkboard-teacher',
    desc: 'Management reviews (ISO 27001 Cl. 9.3), action tracking from audits and reviews, meeting minutes for ISMS committee and risk management.',
    norms: ['ISO 27001 Cl. 9.3', 'ISO 27001 Cl. 5.1', 'ISO 9001 Cl. 9.3'],
  },
  {
    id: 'bcm', label: 'Business Continuity (BCM)', icon: 'ph-heartbeat',
    desc: 'Business Impact Analyses (BIA), continuity plans (BCP/DRP/ITP/Crisis Communication), exercises & tests. Calendar integration for planned exercises and plan tests.',
    norms: ['ISO 22301', 'ISO 27001 A.5.29–5.30', 'BSI 200-4', 'NIS2 Art. 21'],
  },
  {
    id: 'suppliers', label: 'Supply Chain Management', icon: 'ph-truck',
    desc: 'Supplier register with risk assessment, audit tracking, data access documentation and contract linking. Calendar integration for due supplier audits.',
    norms: ['ISO 27001 A.5.21', 'ISO 27001 A.5.22', 'NIS2 Art. 21', 'GDPR Art. 28'],
  },
]

const SOA_FW_META = [
  { id: 'ISO27001', label: 'ISO 27001:2022',          color: '#4f8cff', desc: 'Information Security Management (93 Controls, Annex A)', norms: ['ISO 27001'] },
  { id: 'BSI',      label: 'BSI IT-Grundschutz',      color: '#f0b429', desc: 'German IT-Grundschutz Compendium (16 building blocks)', norms: ['BSI'] },
  { id: 'NIS2',     label: 'EU NIS2',                 color: '#34d399', desc: 'Network and Information Security Directive 2 (29 requirements)', norms: ['NIS2'] },
  { id: 'EUCS',     label: 'EU Cloud (EUCS)',          color: '#a78bfa', desc: 'EU Cybersecurity Certification Scheme for Cloud Services', norms: ['EUCS'] },
  { id: 'EUAI',     label: 'EU AI Act',               color: '#fb923c', desc: 'Requirements for AI systems under the EU AI Act', norms: ['EU AI Act'] },
  { id: 'ISO9000',  label: 'ISO 9000:2015',           color: '#2dd4bf', desc: 'Foundations and vocabulary of quality management systems', norms: ['ISO 9000'] },
  { id: 'ISO9001',  label: 'ISO 9001:2015',           color: '#f472b6', desc: 'QMS requirements (79 controls)', norms: ['ISO 9001'] },
  { id: 'CRA',      label: 'EU Cyber Resilience Act', color: '#e11d48', desc: 'Cybersecurity requirements for products with digital elements', norms: ['CRA'] },
]

async function renderAdminModulesTab() {
  const container = document.getElementById('adminTabPanelModules')
  if (!container) return
  container.innerHTML = `<p class="report-loading">${t('loading')}</p>`

  let cfg = { ...MODULE_CONFIG }
  let fwCfg = { ...SOA_FW_CONFIG }
  try {
    const [modRes, fwRes] = await Promise.all([
      fetch('/admin/modules',        { headers: apiHeaders('admin') }),
      fetch('/admin/soa-frameworks', { headers: apiHeaders('admin') }),
    ])
    if (modRes.ok) cfg   = await modRes.json()
    if (fwRes.ok)  fwCfg = await fwRes.json()
  } catch {}

  container.innerHTML = `
    <div class="admin-modules-wrap">
      <div class="admin-modules-header">
        <h3 class="admin-panel-title"><i class="ph ph-sliders"></i> ${t('modules_title')}</h3>
        <p class="admin-modules-desc">
          ${t('modules_desc')}
        </p>
      </div>
      <div class="admin-modules-grid">
        ${MODULE_META.map(m => {
          const enabled = cfg[m.id] !== false
          return `
          <div class="module-card ${enabled ? 'module-card-active' : 'module-card-inactive'}">
            <div class="module-card-header">
              <i class="ph ${m.icon} module-card-icon"></i>
              <div class="module-card-title">${m.label}</div>
              <label class="module-toggle">
                <input type="checkbox" data-module="${m.id}" ${enabled ? 'checked' : ''} onchange="moduleToggleChange(this)">
                <span class="module-toggle-slider"></span>
              </label>
            </div>
            <p class="module-card-desc">${m.desc}</p>
            ${m.norms.length ? `<div class="module-card-norms">${m.norms.map(n => `<span class="module-norm-badge">${n}</span>`).join('')}</div>` : ''}
            <div class="module-card-status">
              <span class="module-status-dot ${enabled ? 'active' : 'inactive'}"></span>
              ${enabled ? t('modules_active') : t('modules_disabled')}
            </div>
          </div>`
        }).join('')}
      </div>

      <!-- SoA Framework selection -->
      <div class="admin-modules-header" style="margin-top:28px;border-top:1px solid var(--border);padding-top:20px">
        <h3 class="admin-panel-title"><i class="ph ph-shield-check"></i> ${t('modules_soaFrameworks')}</h3>
        <p class="admin-modules-desc">
          ${t('modules_soaFrameworksDesc')}
        </p>
        <div class="settings-notice">
          <i class="ph ph-warning"></i>
          <strong>${t('note')}:</strong> ${t('modules_soaFrameworksNote')}
        </div>
      </div>
      <div class="admin-modules-grid">
        ${SOA_FW_META.map(fw => {
          const enabled = fwCfg[fw.id] !== false
          return `
          <div class="module-card ${enabled ? 'module-card-active' : 'module-card-inactive'}">
            <div class="module-card-header">
              <i class="ph ph-shield module-card-icon" style="color:${fw.color}"></i>
              <div class="module-card-title" style="color:${fw.color}">${fw.label}</div>
              <label class="module-toggle">
                <input type="checkbox" data-fw="${fw.id}" ${enabled ? 'checked' : ''} onchange="fwToggleChange(this)">
                <span class="module-toggle-slider"></span>
              </label>
            </div>
            <p class="module-card-desc">${fw.desc}</p>
            <div class="module-card-norms">${fw.norms.map(n => `<span class="module-norm-badge" style="border-color:${fw.color};color:${fw.color}">${n}</span>`).join('')}</div>
            <div class="module-card-status">
              <span class="module-status-dot ${enabled ? 'active' : 'inactive'}"></span>
              ${enabled ? t('modules_active') : t('modules_disabled')}
            </div>
          </div>`
        }).join('')}
      </div>

      <div class="admin-modules-footer">
        <button class="btn btn-primary" onclick="saveModuleConfig()">
          <i class="ph ph-floppy-disk"></i> ${t('modules_saveApply')}
        </button>
        <p id="modulesSaveMsg" style="font-size:13px;margin-top:8px;display:none"></p>
      </div>
    </div>`
}

function fwToggleChange(checkbox) {
  // Mindestens ein Framework muss aktiv bleiben
  const allFwCheckboxes = document.querySelectorAll('[data-fw]')
  const anyChecked = [...allFwCheckboxes].some(cb => cb.checked)
  if (!anyChecked) {
    checkbox.checked = true  // Rückgängig machen
    const msg = document.getElementById('modulesSaveMsg')
    if (msg) {
      msg.textContent = t('modules_lastFrameworkWarning')
      msg.style.color = 'var(--warning-text, #f0b429)'
      msg.style.display = ''
      clearTimeout(msg._fwTimer)
      msg._fwTimer = setTimeout(() => { msg.style.display = 'none' }, 4000)
    }
    return
  }
  const card = checkbox.closest('.module-card')
  const enabled = checkbox.checked
  card.className = `module-card ${enabled ? 'module-card-active' : 'module-card-inactive'}`
  card.querySelector('.module-status-dot').className = `module-status-dot ${enabled ? 'active' : 'inactive'}`
  card.querySelector('.module-card-status').lastChild.textContent = ` ${enabled ? t('modules_active') : t('modules_disabled')}`
}

function moduleToggleChange(checkbox) {
  const card = checkbox.closest('.module-card')
  const enabled = checkbox.checked
  card.className = `module-card ${enabled ? 'module-card-active' : 'module-card-inactive'}`
  card.querySelector('.module-status-dot').className = `module-status-dot ${enabled ? 'active' : 'inactive'}`
  card.querySelector('.module-card-status').lastChild.textContent = ` ${enabled ? t('modules_active') : t('modules_disabled')}`
}

async function saveModuleConfig() {
  const modCfg = {}
  document.querySelectorAll('[data-module]').forEach(cb => { modCfg[cb.dataset.module] = cb.checked })

  const fwCfg = {}
  document.querySelectorAll('[data-fw]').forEach(cb => { fwCfg[cb.dataset.fw] = cb.checked })

  const [modRes, fwRes] = await Promise.all([
    fetch('/admin/modules', {
      method: 'PUT',
      headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
      body: JSON.stringify(modCfg),
    }),
    fetch('/admin/soa-frameworks', {
      method: 'PUT',
      headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
      body: JSON.stringify(fwCfg),
    }),
  ])
  const msg = document.getElementById('modulesSaveMsg')
  msg.style.display = ''
  if (modRes.ok && fwRes.ok) {
    MODULE_CONFIG    = { ...MODULE_CONFIG, ...modCfg }
    SOA_FW_CONFIG    = { ...SOA_FW_CONFIG,  ...fwCfg }
    msg.textContent = t('modules_savedUpdating')
    msg.style.color = 'var(--success,#4ade80)'
    setTimeout(() => { populateSectionNav(); msg.style.display = 'none' }, 1200)
  } else {
    msg.textContent = t('err_saveFailed')
    msg.style.color = 'var(--danger-text)'
    setTimeout(() => { msg.style.display = 'none' }, 3000)
  }
}

// ── IT Organisationseinheiten (OE) ───────────────────────────────────────────

let _ORG_UNITS = []   // module-level cache, refreshed each render

async function loadOrgUnits() {
  const res = await fetch('/org-units', { headers: apiHeaders() })
  _ORG_UNITS = res.ok ? await res.json() : []
  return _ORG_UNITS
}


async function openOrgUnitModal(id) {
  const units = _ORG_UNITS.length ? _ORG_UNITS : await loadOrgUnits()
  const unit = id ? units.find(u => u.id === id) : null
  const typeOpts = [
    { v:'cio',      l:t('org_typeCio') },
    { v:'group',    l:t('org_typeGroup') },
    { v:'local',    l:t('org_typeLocal') },
    { v:'external', l:t('org_typeExternal') },
  ]
  const parentOpts = units.filter(u => u.id !== id)
    .map(u => `<option value="${u.id}" ${unit?.parentId===u.id?'selected':''}>${escHtml(u.name)}</option>`)
    .join('')

  document.getElementById('orgUnitModal')?.remove()
  const html = `
    <div id="orgUnitModal" class="modal" style="visibility:visible">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title"><i class="ph ph-tree-structure"></i> ${unit ? t('edit') : t('create')} ${t('org_itUnit')}</h3>
          <button class="modal-close" onclick="document.getElementById('orgUnitModal').remove()"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label class="form-label">${t('col_name')} *</label>
              <input id="ouName" class="form-input" value="${escHtml(unit?.name||'')}" placeholder="GroupIT">
            </div>
            <div>
              <label class="form-label">${t('col_type')}</label>
              <select id="ouType" class="select">
                ${typeOpts.map(t => `<option value="${t.v}" ${unit?.type===t.v?'selected':''}>${t.l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div>
            <label class="form-label">${t('org_parentUnit')}</label>
            <select id="ouParent" class="select">
              <option value="">— ${t('org_noParentTop')} —</option>
              ${parentOpts}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label class="form-label">${t('org_headPerson')}</label>
              <input id="ouHead" class="form-input" value="${escHtml(unit?.head||'')}" placeholder="Name">
            </div>
            <div>
              <label class="form-label">${t('admin_email')}</label>
              <input id="ouEmail" class="form-input" type="email" value="${escHtml(unit?.email||'')}" placeholder="it@example.com">
            </div>
          </div>
          <div>
            <label class="form-label">${t('inc_description')}</label>
            <textarea id="ouDesc" class="form-textarea" rows="2">${escHtml(unit?.description||'')}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('orgUnitModal').remove()">${t('cancel')}</button>
          <button class="btn btn-primary" onclick="submitOrgUnitModal('${id||''}')">
            <i class="ph ph-floppy-disk"></i> ${t('save')}
          </button>
        </div>
      </div>
    </div>`
  document.body.insertAdjacentHTML('beforeend', html)
}

async function submitOrgUnitModal(id) {
  const name = document.getElementById('ouName')?.value.trim()
  if (!name) { alert(t('err_nameRequired')); return }
  const body = {
    name,
    type:        document.getElementById('ouType')?.value  || 'group',
    parentId:    document.getElementById('ouParent')?.value || null,
    head:        document.getElementById('ouHead')?.value.trim()  || '',
    email:       document.getElementById('ouEmail')?.value.trim() || '',
    description: document.getElementById('ouDesc')?.value.trim()  || '',
  }
  if (!body.parentId) body.parentId = null
  const url    = id ? `/org-units/${id}` : '/org-units'
  const method = id ? 'PUT' : 'POST'
  const res = await fetch(url, { method, headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || t('error')); return }
  document.getElementById('orgUnitModal')?.remove()
  _ORG_UNITS = []
  await renderAdminOrgTab()
}

async function deleteOrgUnit(id, name) {
  if (!confirm(t('org_deleteUnitConfirm').replace('{name}', name))) return
  const res = await fetch(`/org-units/${id}`, { method: 'DELETE', headers: apiHeaders('admin') })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || t('error')); return }
  _ORG_UNITS = []
  await renderAdminOrgTab()
}

// Public helper: returns org unit options for use in pickers across modules
async function getOrgUnitOptions(selectedId) {
  const units = _ORG_UNITS.length ? _ORG_UNITS : await loadOrgUnits()
  return [
    `<option value="">— ${t('org_noUnitAssigned')} —</option>`,
    ...units.map(u => `<option value="${u.id}" ${selectedId===u.id?'selected':''}>${escHtml(u.name)}</option>`)
  ].join('')
}

// ── Admin: Ende Organisationsdaten / Audit / Wartung ─────────────────────────

const ROLES_LIST = [
  { id: 'reader',       get label() { return t('role_reader') } },
  { id: 'revision',     get label() { return t('role_revision') } },
  { id: 'editor',       get label() { return t('role_editor') } },
  { id: 'dept_head',    get label() { return t('role_deptHead') } },
  { id: 'qmb',          get label() { return t('role_qmb') } },
  { id: 'contentowner', get label() { return t('role_contentowner') } },
  { id: 'auditor',      get label() { return t('role_auditor') } },
  { id: 'admin',        get label() { return t('role_admin') } },
]

// Organisational functions (independent of RBAC rank)
const FUNCTIONS_LIST = [
  { id: 'ciso',         get label() { return t('fn_ciso') },        icon: 'ph-shield-warning' },
  { id: 'dso',          get label() { return t('fn_dso') },         icon: 'ph-lock-key' },
  { id: 'qmb',          get label() { return t('fn_qmb') },         icon: 'ph-seal-check' },
  { id: 'bcm_manager',  get label() { return t('fn_bcmManager') },  icon: 'ph-lifebuoy' },
  { id: 'dept_head',    get label() { return t('fn_deptHead') },    icon: 'ph-users-three' },
  { id: 'auditor',      get label() { return t('fn_auditor') },     icon: 'ph-magnifying-glass' },
  { id: 'admin_notify', get label() { return t('fn_adminNotify') }, icon: 'ph-bell' },
]

// Hilfsfunktion: Funktions-Label aus ID
function fnLabel(id) {
  return (FUNCTIONS_LIST.find(f => f.id === id) || { label: id }).label
}

function renderAdminUsersTab() {
  const container = document.getElementById('adminTabPanelUsers')
  if (!container) return
  container.innerHTML = `
    <div class="admin-users-panel">
      <div class="admin-users-toolbar">
        <span class="admin-panel-title"><i class="ph ph-users"></i> ${t('admin_userManagement')}</span>
        <button class="btn btn-primary btn-sm" onclick="openUserModal()">
          <i class="ph ph-user-plus"></i> ${t('admin_newUser')}
        </button>
        <button class="btn btn-secondary btn-sm" onclick="adminLoadUsers()">
          <i class="ph ph-arrows-clockwise"></i>
        </button>
      </div>
      <div id="adminUserTable"></div>
    </div>`
  adminLoadUsers()
}

async function adminLoadUsers() {
  const tbody = document.getElementById('adminUserTable')
  if (!tbody) return
  tbody.innerHTML = `<p class="report-loading">${t('loading')}</p>`
  const res = await fetch('/admin/users', { headers: apiHeaders('admin') })
  if (!res.ok) { tbody.innerHTML = `<p class="report-error">${t('err_load')}</p>`; return }
  const users = await res.json()
  if (users.length === 0) { tbody.innerHTML = `<p style="color:var(--text-subtle);padding:12px;">${t('admin_noUsers')}</p>`; return }

  tbody.innerHTML = `
    <table class="admin-user-table">
      <thead>
        <tr>
          <th>${t('audit_resourceUser')}</th>
          <th>${t('admin_email')}</th>
          <th>${t('admin_role')}</th>
          <th>${t('admin_functions')}</th>
          <th>${t('admin_domain')}</th>
          <th style="width:80px;"></th>
        </tr>
      </thead>
      <tbody>
        ${users.map(u => {
          const fns = (u.functions || []).map(f =>
            `<span class="badge" style="background:var(--color-B75,#e3effe);color:var(--color-B400,#0052cc);margin:1px 2px;font-size:11px;">${escHtml(fnLabel(f))}</span>`
          ).join('') || '<span style="color:var(--text-subtle);font-size:12px;">—</span>'
          return `
          <tr>
            <td><strong>${escHtml(u.username)}</strong></td>
            <td>${escHtml(u.email || '—')}</td>
            <td><span class="badge role-badge-${u.role}">${u.role}</span></td>
            <td style="max-width:220px;">${fns}</td>
            <td>${escHtml(u.domain || '—')}</td>
            <td class="admin-user-actions">
              <button class="btn btn-secondary btn-sm" title="${t('edit')}"
                onclick='openUserModal(${JSON.stringify(u)})'>
                <i class="ph ph-pencil"></i>
              </button>
              <button class="btn btn-sm" style="color:var(--danger-text);" title="${t('delete')}"
                onclick="adminDeleteUser('${escHtml(u.username)}')">
                <i class="ph ph-trash"></i>
              </button>
            </td>
          </tr>`
        }).join('')}
      </tbody>
    </table>`
}

function openUserModal(user) {
  // user may come from JSON.stringify in an onclick attribute, so it might be a parsed object
  const isEdit = !!user
  const roleOpts = ROLES_LIST.map(r =>
    `<option value="${r.id}" ${user?.role === r.id ? 'selected' : ''}>${r.label}</option>`
  ).join('')

  document.getElementById('userEditModal')?.remove()
  const html = `
    <div id="userEditModal" class="modal" style="visibility:visible;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">
            <i class="ph ph-user-${isEdit ? 'gear' : 'plus'}"></i>
            ${isEdit ? t('admin_editUser') : t('admin_newUser')}
          </h3>
          <button class="modal-close" onclick="document.getElementById('userEditModal').remove()">
            <i class="ph ph-x"></i>
          </button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="form-label">${t('admin_username')} *</label>
              <input id="uModalUsername" class="form-input" value="${escHtml(user?.username || '')}"
                ${isEdit ? 'readonly style="opacity:.6;"' : 'placeholder="max.mustermann"'} />
            </div>
            <div>
              <label class="form-label">${t('admin_email')} *</label>
              <input id="uModalEmail" class="form-input" type="email"
                value="${escHtml(user?.email || '')}" placeholder="max@example.com" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="form-label">${t('admin_role')} *</label>
              <select id="uModalRole" class="select">${roleOpts}</select>
            </div>
            <div>
              <label class="form-label">${t('admin_domain')}</label>
              <input id="uModalDomain" class="form-input"
                value="${escHtml(user?.domain || 'Global')}" placeholder="Global" />
            </div>
          </div>
          <div>
            <label class="form-label">${t('admin_orgFunctions')}</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--surface-raised,#1e2129);border-radius:4px;border:1px solid var(--border,#3c4257);">
              ${FUNCTIONS_LIST.map(f => `
                <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:3px 8px;border-radius:3px;background:var(--surface,#161b27);">
                  <input type="checkbox" class="uModalFn" value="${f.id}"
                    ${(user?.functions||[]).includes(f.id) ? 'checked' : ''}>
                  <i class="ph ${f.icon}" style="font-size:13px;"></i> ${escHtml(f.label)}
                </label>`).join('')}
            </div>
            <p style="font-size:11px;color:var(--text-subtle);margin:4px 0 0;">${t('admin_functionsHint')}</p>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="form-label">${isEdit ? t('settings_pwNew') : `${t('org_smtpPassword')} *`}</label>
              <input id="uModalPw" class="form-input" type="password"
                placeholder="${isEdit ? t('admin_pwLeaveBlankPh') : t('admin_pwMinCharsPh')}" />
            </div>
            <div>
              <label class="form-label">${isEdit ? t('admin_confirmPassword') : `${t('settings_pwRepeat')} ${t('org_smtpPassword')} *`}</label>
              <input id="uModalPw2" class="form-input" type="password" placeholder="${t('admin_pwRepeatPh')}" />
            </div>
          </div>
          <p id="uModalError" style="color:var(--danger-text);font-size:12px;display:none;margin:0;"></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary"
            onclick="document.getElementById('userEditModal').remove()">${t('cancel')}</button>
          <button class="btn btn-primary" onclick="submitUserModal('${isEdit ? user.username : ''}')">
            <i class="ph ph-floppy-disk"></i> ${t('save')}
          </button>
        </div>
      </div>
    </div>`
  document.body.insertAdjacentHTML('beforeend', html)
}

async function submitUserModal(existingUsername) {
  const errEl = document.getElementById('uModalError')
  const show = msg => { errEl.textContent = msg; errEl.style.display = ''; }

  const username  = document.getElementById('uModalUsername')?.value.trim()
  const email     = document.getElementById('uModalEmail')?.value.trim()
  const role      = document.getElementById('uModalRole')?.value
  const domain    = document.getElementById('uModalDomain')?.value.trim() || 'Global'
  const pw        = document.getElementById('uModalPw')?.value
  const pw2       = document.getElementById('uModalPw2')?.value
  const functions = [...document.querySelectorAll('.uModalFn:checked')].map(cb => cb.value)

  if (!username || !email || !role) return show(t('admin_userRequired'))
  if (pw !== pw2) return show(t('admin_passwordMismatch'))
  if (!existingUsername && (!pw || pw.length < 6)) return show(t('admin_passwordMin'))
  if (pw && pw.length < 6) return show(t('admin_passwordMin'))

  const body = { email, role, domain, functions }
  if (pw) body.password = pw

  let res
  if (existingUsername) {
    res = await fetch(`/admin/users/${encodeURIComponent(existingUsername)}`, {
      method: 'PUT', headers: apiHeaders('admin'), body: JSON.stringify(body)
    })
  } else {
    res = await fetch('/admin/users', {
      method: 'POST', headers: apiHeaders('admin'),
      body: JSON.stringify({ username, ...body })
    })
  }

  if (!res.ok) {
    const err = await res.json()
    return show(err.error || t('err_saveFailed'))
  }
  document.getElementById('userEditModal')?.remove()
  adminLoadUsers()
}

async function adminDeleteUser(username) {
  if (!confirm(t('admin_deleteUser').replace('[NAME]', username))) return
  const res = await fetch(`/admin/users/${encodeURIComponent(username)}`, {
    method: 'DELETE', headers: apiHeaders('admin')
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || t('error')); return }
  adminLoadUsers()
}

function renderAdminEntitiesTab() {
  const container = document.getElementById('adminTabPanelEntities')
  if (!container) return
  container.innerHTML = `
    <div style="padding:12px 0;">
      <h3 style="margin-bottom:8px;">${t('admin_corporateEntities')}</h3>
      <div class="admin-entity-toolbar">
        <button class="btn btn-primary btn-sm" onclick="adminAddEntity()"><i class="ph ph-plus"></i> ${t('admin_newEntity')}</button>
        <button class="btn btn-secondary btn-sm" onclick="adminLoadEntities()"><i class="ph ph-arrows-clockwise"></i> ${t('refresh')}</button>
      </div>
      <div id="adminEntityTree" class="admin-entity-tree"></div>
    </div>`
  adminLoadEntities()
}

async function adminLoadEntities() {
  const tree = document.getElementById('adminEntityTree')
  if (!tree) return
  tree.innerHTML = `<p class="report-loading">${t('loading')}</p>`
  try {
    const res = await fetch('/entities/tree', { headers: apiHeaders('reader') })
    const roots = await res.json()
    tree.innerHTML = ''
    roots.forEach(e => tree.appendChild(renderEntityNode(e)))
  } catch (err) {
    tree.innerHTML = `<p class="report-error">${t('error')}: ${err.message}</p>`
  }
}

function renderEntityNode(e) {
  const li = document.createElement('div')
  li.className = `admin-entity-node admin-entity-${e.type}`
  li.innerHTML = `
    <div class="admin-entity-row">
      <i class="ph ${e.type === 'holding' ? 'ph-building' : 'ph-office-chair'}"></i>
      <span class="admin-entity-name">${e.name}</span>
      <span class="admin-entity-code picker-id">${e.shortCode || ''}</span>
      <div class="admin-entity-actions">
        <button class="btn btn-secondary btn-sm" onclick='adminEditEntity(${JSON.stringify(e)})' title="${t('edit')}"><i class="ph ph-pencil"></i></button>
        ${e.type !== 'holding' ? `<button class="btn btn-sm" style="color:#ef4444;" onclick="adminDeleteEntity('${e.id}','${e.name}')" title="${t('delete')}"><i class="ph ph-trash"></i></button>` : ''}
      </div>
    </div>
    ${e.children && e.children.length > 0 ? `<div class="admin-entity-children">${e.children.map(c => renderEntityNode(c).outerHTML).join('')}</div>` : ''}
  `
  return li
}

function adminAddEntity() { openEntityModal(null) }
function adminEditEntity(e) { openEntityModal(e) }

function openEntityModal(entity) {
  const isEdit = !!entity
  document.getElementById('entityEditModal')?.remove()

  const html = `
    <div id="entityEditModal" class="modal" style="visibility:visible;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">
            <i class="ph ph-buildings"></i>
            ${isEdit ? t('admin_editEntity') : t('admin_newEntity')}
          </h3>
          <button class="modal-close" onclick="document.getElementById('entityEditModal').remove()">
            <i class="ph ph-x"></i>
          </button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label class="form-label">${t('col_name')} *</label>
            <input id="entModalName" class="form-input"
              value="${escHtml(entity?.name || '')}" placeholder="e.g. Alpha Ltd" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="form-label">${t('org_short')}</label>
              <input id="entModalCode" class="form-input"
                value="${escHtml(entity?.shortCode || '')}" placeholder="ALP" maxlength="10" />
            </div>
            <div>
              <label class="form-label">${t('col_type')}</label>
              <select id="entModalType" class="select" ${isEdit ? 'disabled style="opacity:.6;"' : ''}>
                <option value="subsidiary" ${entity?.type !== 'holding' ? 'selected' : ''}>${t('admin_entitySubsidiary')}</option>
                <option value="holding"    ${entity?.type === 'holding'  ? 'selected' : ''}>${t('admin_entityHolding')}</option>
              </select>
            </div>
          </div>
          <p id="entModalError" style="color:var(--danger-text);font-size:12px;display:none;margin:0;"></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary"
            onclick="document.getElementById('entityEditModal').remove()">${t('cancel')}</button>
          <button class="btn btn-primary" onclick="submitEntityModal('${isEdit ? entity.id : ''}')">
            <i class="ph ph-floppy-disk"></i> ${t('save')}
          </button>
        </div>
      </div>
    </div>`
  document.body.insertAdjacentHTML('beforeend', html)
}

async function submitEntityModal(existingId) {
  const errEl = document.getElementById('entModalError')
  const show = msg => { errEl.textContent = msg; errEl.style.display = ''; }

  const name      = document.getElementById('entModalName')?.value.trim()
  const shortCode = document.getElementById('entModalCode')?.value.trim()
  const type      = document.getElementById('entModalType')?.value || 'subsidiary'

  if (!name) return show(t('err_nameRequired'))

  let res
  if (existingId) {
    res = await fetch(`/entities/${existingId}`, {
      method: 'PUT',
      headers: apiHeaders('admin'),
      body: JSON.stringify({ name, shortCode })
    })
  } else {
    res = await fetch('/entities', {
      method: 'POST',
      headers: apiHeaders('admin'),
      body: JSON.stringify({ name, type, shortCode, parent: type === 'subsidiary' ? 'entity_holding' : null })
    })
  }

  if (!res.ok) {
    const err = await res.json()
    return show(err.error || t('err_saveFailed'))
  }
  document.getElementById('entityEditModal')?.remove()
  _entityCache = []
  adminLoadEntities()
}

async function adminDeleteEntity(id, name) {
  if (!confirm(t('admin_deleteEntityConfirm').replace('{name}', name))) return
  const res = await fetch(`/entities/${id}`, { method: 'DELETE', headers: apiHeaders('admin') })
  if (!res.ok) { const e = await res.json(); alert(e.error || t('error')); return }
  _entityCache = []
  adminLoadEntities()
}

// ════════════════════════════════════════════════════════════
// SICHERHEITSZIELE – ISO 27001 Kap. 6.2
// ════════════════════════════════════════════════════════════

const GOAL_CATEGORIES = [
  { id: 'confidentiality', label: t('goals_catConfidentiality') },
  { id: 'integrity',       label: t('goals_catIntegrity') },
  { id: 'availability',    label: t('goals_catAvailability') },
  { id: 'compliance',      label: t('goals_catCompliance') },
  { id: 'operational',     label: t('goals_catOperational') },
  { id: 'technical',       label: t('goals_catTechnical') },
  { id: 'organizational',  label: t('goals_catOrganizational') }
]
const GOAL_STATUSES = [
  { id: 'planned',   label: t('goals_statusPlanned'),   color: '#888' },
  { id: 'active',    label: t('goals_statusActive'),    color: '#60a5fa' },
  { id: 'achieved',  label: t('goals_statusAchieved'),  color: '#4ade80' },
  { id: 'missed',    label: t('goals_statusMissed'),    color: '#f87171' },
  { id: 'cancelled', label: t('goals_statusCancelled'), color: '#555' }
]
const GOAL_PRIORITIES = [
  { id: 'low',      label: t('goals_priorityLow'),      color: '#888' },
  { id: 'medium',   label: t('goals_priorityMedium'),   color: '#f0b429' },
  { id: 'high',     label: t('goals_priorityHigh'),     color: '#fb923c' },
  { id: 'critical', label: t('goals_priorityCritical'), color: '#f87171' }
]

let _goalStatusFilter   = ''
let _goalCategoryFilter = ''

function goalCanEdit() { return (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.editor }
function goalCanDelete(){ return (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.admin }

async function renderGoals() {
  dom('goalsContainer')?.remove()
  const container = document.createElement('div')
  container.id = 'goalsContainer'
  dom('editor').appendChild(container)
  container.innerHTML = `<div class="dashboard-loading">${t('goals_loading')}</div>`

  const params = new URLSearchParams()
  if (_goalStatusFilter)   params.set('status',   _goalStatusFilter)
  if (_goalCategoryFilter) params.set('category', _goalCategoryFilter)

  const [goalsRes, summaryRes] = await Promise.all([
    fetch('/goals?' + params,   { headers: apiHeaders() }),
    fetch('/goals/summary',     { headers: apiHeaders() })
  ])
  const list    = goalsRes.ok    ? await goalsRes.json()    : []
  const summary = summaryRes.ok  ? await summaryRes.json()  : {}

  const statusOpts = [{ id:'', label:t('filter_allStatuses') }, ...GOAL_STATUSES]
    .map(s => `<option value="${s.id}" ${_goalStatusFilter===s.id?'selected':''}>${s.label}</option>`).join('')
  const catOpts = [{ id:'', label:t('filter_allCats') }, ...GOAL_CATEGORIES]
    .map(c => `<option value="${c.id}" ${_goalCategoryFilter===c.id?'selected':''}>${c.label}</option>`).join('')

  const now = new Date()

  container.innerHTML = `
    <div class="admin-fullpage">
      <div class="admin-fullpage-header">
        <h2><i class="ph ph-target"></i> ${t('goals_title')} <small style="font-size:.7em;font-weight:400;color:var(--text-subtle)">${t('goals_isoClause')}</small></h2>
        ${goalCanEdit() ? `<button class="btn btn-primary btn-sm" onclick="openGoalForm()"><i class="ph ph-plus"></i> ${t('goals_new')}</button>` : ''}
      </div>

      <!-- KPI-Leiste -->
      <div class="goals-kpi-row">
        <div class="goals-kpi"><span class="goals-kpi-val">${summary.total||0}</span><span class="goals-kpi-lbl">${t('common_total')}</span></div>
        <div class="goals-kpi"><span class="goals-kpi-val" style="color:#60a5fa">${summary.active||0}</span><span class="goals-kpi-lbl">${t('goals_statusActive')}</span></div>
        <div class="goals-kpi"><span class="goals-kpi-val" style="color:#4ade80">${summary.achieved||0}</span><span class="goals-kpi-lbl">${t('goals_statusAchieved')}</span></div>
        <div class="goals-kpi"><span class="goals-kpi-val" style="color:#f87171">${summary.overdue||0}</span><span class="goals-kpi-lbl">${t('reports_overdue')}</span></div>
        <div class="goals-kpi">
          <div class="goals-avg-wrap">
            <span class="goals-kpi-val">${summary.avgProgress||0}%</span>
            <div class="goals-avg-bar"><div class="goals-avg-fill" style="width:${summary.avgProgress||0}%"></div></div>
          </div>
          <span class="goals-kpi-lbl">${t('goals_avgProgress')}</span>
        </div>
      </div>

      <!-- Filter -->
      <div class="gdpr-filter-bar" style="margin-bottom:12px">
        <select class="select" style="font-size:.82rem" onchange="_goalStatusFilter=this.value;renderGoals()">${statusOpts}</select>
        <select class="select" style="font-size:.82rem" onchange="_goalCategoryFilter=this.value;renderGoals()">${catOpts}</select>
        <span class="gdpr-filter-count">${list.length} ${t('goals_countLabel')}</span>
      </div>

      <!-- Liste -->
      ${list.length === 0 ? `<p class="gdpr-empty">${t('goals_empty')}</p>` : `
      <div class="goals-list">
        ${list.map(g => {
          const st  = GOAL_STATUSES.find(s => s.id === g.status)
          const cat = GOAL_CATEGORIES.find(c => c.id === g.category)
          const pri = GOAL_PRIORITIES.find(p => p.id === g.priority)
          const prog = g.progressCalc ?? 0
          const isOverdue = g.targetDate && new Date(g.targetDate) < now && !['achieved','cancelled'].includes(g.status)
          return `
          <div class="goals-card" onclick="openGoalForm('${g.id}')">
            <div class="goals-card-header">
              <div class="goals-card-title">
                <span class="goals-priority-dot" style="background:${pri?.color||'#888'}" title="${pri?.label}"></span>
                <strong>${escHtml(g.title)}</strong>
              </div>
              <div class="goals-card-badges">
                <span class="goals-badge" style="background:${st?.color||'#888'}22;color:${st?.color||'#888'};border:1px solid ${st?.color||'#888'}44">${st?.label||g.status}</span>
                <span class="goals-badge goals-badge-cat">${cat?.label||g.category}</span>
              </div>
            </div>
            ${g.description ? `<p class="goals-card-desc">${escHtml(g.description.slice(0,120))}${g.description.length>120?'…':''}</p>` : ''}
            <div class="goals-card-footer">
              <div class="goals-progress-wrap">
                <div class="goals-progress-bar">
                  <div class="goals-progress-fill" style="width:${prog}%;background:${prog>=100?'#4ade80':prog>=60?'#60a5fa':'#f0b429'}"></div>
                </div>
                <span class="goals-progress-pct">${prog}%</span>
              </div>
              <div class="goals-card-meta">
                ${g.owner ? `<span><i class="ph ph-user"></i> ${escHtml(g.owner)}</span>` : ''}
                ${g.targetDate ? `<span style="${isOverdue?'color:#f87171;font-weight:600':''}"><i class="ph ph-calendar-x"></i> ${new Date(g.targetDate).toLocaleDateString('en-GB')}${isOverdue ? ` (${t('reports_overdue').toLowerCase()})` : ''}</span>` : ''}
                ${g.kpis?.length ? `<span><i class="ph ph-chart-line-up"></i> ${g.kpis.length} KPI(s)</span>` : ''}
              </div>
            </div>
            <div class="goals-card-actions" onclick="event.stopPropagation()">
              ${goalCanEdit()  ? `<button class="btn btn-secondary btn-sm" onclick="openGoalForm('${g.id}')"><i class="ph ph-pencil"></i></button>` : ''}
              ${goalCanDelete()? `<button class="btn btn-sm" style="color:var(--danger-text)" onclick="deleteGoal('${g.id}')"><i class="ph ph-trash"></i></button>` : ''}
            </div>
          </div>`
        }).join('')}
      </div>`}
    </div>
  `
}

function goalKpiRow(kpi = {}) {
  return `<div class="goal-kpi-row">
    <input class="form-input" placeholder="${t('goals_metricKpi')}" style="flex:2" value="${escHtml(kpi.metric||'')}">
    <input type="number" class="form-input" placeholder="${t('goals_target')}" style="width:90px" value="${kpi.targetValue||''}">
    <input type="number" class="form-input" placeholder="${t('goals_current')}" style="width:90px" value="${kpi.currentValue||''}">
    <input class="form-input" placeholder="${t('goals_unit')}" style="width:80px" value="${escHtml(kpi.unit||'')}" title="${t('goals_unitHint')}">
    <button class="btn btn-sm" style="color:var(--danger-text)" onclick="this.closest('.goal-kpi-row').remove();updateGoalProgress()"><i class="ph ph-trash"></i></button>
  </div>`
}

function addGoalKpi() {
  const container = document.getElementById('goalKpisContainer')
  if (!container) return
  container.insertAdjacentHTML('beforeend', goalKpiRow())
}

function updateGoalProgress() {
  const rows = [...document.querySelectorAll('.goal-kpi-row')]
  if (!rows.length) return
  let total = 0, count = 0
  for (const row of rows) {
    const inputs = row.querySelectorAll('input[type=number]')
    const target = parseFloat(inputs[0]?.value) || 0
    const current= parseFloat(inputs[1]?.value) || 0
    if (target > 0) { total += Math.min(100, Math.round(current/target*100)); count++ }
  }
  const progressInput = document.getElementById('goalProgress')
  if (progressInput && count > 0) progressInput.value = Math.round(total / count)
}

async function openGoalForm(id = null) {
  let item = null
  if (id) {
    const r = await fetch(`/goals/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }
  const g = item || {}

  const stOpts  = GOAL_STATUSES.map(s =>
    `<option value="${s.id}" ${g.status===s.id?'selected':''}>${s.label}</option>`).join('')
  const catOpts = GOAL_CATEGORIES.map(c =>
    `<option value="${c.id}" ${g.category===c.id?'selected':''}>${c.label}</option>`).join('')
  const priOpts = GOAL_PRIORITIES.map(p =>
    `<option value="${p.id}" ${g.priority===p.id?'selected':''}>${p.label}</option>`).join('')

  const kpisHtml = (g.kpis || []).map(k => goalKpiRow(k)).join('')

  const container = dom('goalsContainer')
  container.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="renderGoals()"><i class="ph ph-arrow-left"></i> ${t('common_back')}</button>
        <h2>${id ? t('goals_edit') : t('goals_new')}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-row">
          <div class="form-group" style="flex:3"><label class="form-label">${t('col_name')} *</label>
            <input id="goalTitle" class="form-input" value="${escHtml(g.title||'')}" placeholder="${t('goals_titlePlaceholder')}"></div>
          <div class="form-group"><label class="form-label">${t('goals_priority')}</label>
            <select id="goalPriority" class="select">${priOpts}</select></div>
        </div>
        <div class="form-group"><label class="form-label">${t('goals_descriptionContext')}</label>
          <textarea id="goalDesc" class="form-input" rows="3" placeholder="${t('goals_descPlaceholder')}">${escHtml(g.description||'')}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">${t('col_category')}</label>
            <select id="goalCategory" class="select">${catOpts}</select></div>
          <div class="form-group"><label class="form-label">${t('col_status')}</label>
            <select id="goalStatus" class="select">${stOpts}</select></div>
          <div class="form-group"><label class="form-label">${t('goals_ownerResponsible')}</label>
            <input id="goalOwner" class="form-input" value="${escHtml(g.owner||'')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">${t('goals_targetDate')}</label>
            <input id="goalTargetDate" type="date" class="form-input" value="${g.targetDate||''}"></div>
          <div class="form-group"><label class="form-label">${t('goals_reviewDate')}</label>
            <input id="goalReviewDate" type="date" class="form-input" value="${g.reviewDate||''}"></div>
          <div class="form-group"><label class="form-label">${t('goals_manualProgress')}</label>
            <input id="goalProgress" type="number" class="form-input" min="0" max="100" value="${g.progress||0}" placeholder="0-100" title="${t('goals_progressHint')}"></div>
        </div>

        <div class="legal-form-section">
          <div class="legal-form-section-title"><i class="ph ph-chart-line-up"></i> ${t('goals_kpisMetrics')}</div>
          <p style="font-size:.8rem;color:var(--text-subtle);margin-bottom:8px">${t('goals_kpisDesc')}</p>
          <div class="goal-kpi-header">
            <span style="flex:2">${t('goals_metricKpi')}</span>
            <span style="width:90px">${t('goals_target')}</span>
            <span style="width:90px">${t('goals_current')}</span>
            <span style="width:80px">${t('goals_unit')}</span>
            <span style="width:32px"></span>
          </div>
          <div id="goalKpisContainer">${kpisHtml}</div>
          <button class="btn btn-secondary btn-sm" onclick="addGoalKpi()" style="margin-top:6px">
            <i class="ph ph-plus"></i> ${t('goals_addKpi')}
          </button>
        </div>

        <div class="form-group"><label class="form-label">${t('goals_notes')}</label>
          <textarea id="goalNotes" class="form-input" rows="2">${escHtml(g.notes||'')}</textarea></div>
        ${renderLinksBlock('goal', g.linkedControls||[], g.linkedPolicies||[])}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="renderGoals()">${t('cancel')}</button>
        <button class="btn btn-primary" onclick="saveGoal(${id?`'${id}'`:'null'})"><i class="ph ph-floppy-disk"></i> ${t('save')}</button>
      </div>
    </div>
  `
  initLinkPickers('goal')

  // Live-Berechnung des Fortschritts bei KPI-Änderung
  container.addEventListener('input', e => {
    if (e.target.type === 'number' && e.target.closest('.goal-kpi-row')) updateGoalProgress()
  })
}

async function saveGoal(id) {
  const title = document.getElementById('goalTitle')?.value?.trim()
  if (!title) { alert(t('err_nameRequired')); return }

  const kpis = [...document.querySelectorAll('.goal-kpi-row')].map(row => {
    const inputs = row.querySelectorAll('input')
    return {
      metric:       inputs[0]?.value?.trim() || '',
      targetValue:  parseFloat(inputs[1]?.value) || 0,
      currentValue: parseFloat(inputs[2]?.value) || 0,
      unit:         inputs[3]?.value?.trim() || ''
    }
  }).filter(k => k.metric)

  const payload = {
    title,
    description: document.getElementById('goalDesc')?.value || '',
    category:    document.getElementById('goalCategory')?.value,
    status:      document.getElementById('goalStatus')?.value || 'planned',
    priority:    document.getElementById('goalPriority')?.value || 'medium',
    owner:       document.getElementById('goalOwner')?.value || '',
    targetDate:  document.getElementById('goalTargetDate')?.value || null,
    reviewDate:  document.getElementById('goalReviewDate')?.value || null,
    progress:    parseInt(document.getElementById('goalProgress')?.value) || 0,
    notes:       document.getElementById('goalNotes')?.value || '',
    kpis,
    linkedControls: getLinkedValues('goal', 'ctrl'),
    linkedPolicies: getLinkedValues('goal', 'pol')
  }

  const res = await fetch(id ? `/goals/${id}` : '/goals', {
    method: id ? 'PUT' : 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || t('error')); return }
  renderGoals()
}

async function deleteGoal(id) {
  if (!confirm(t('goals_deleteConfirm'))) return
  const res = await fetch(`/goals/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json(); alert(e.error || t('error')); return }
  renderGoals()
}

async function renderSettingsPanel() {
  const username  = getCurrentUser()
  const role      = getCurrentRole()
  const rank      = ROLE_RANK[role] || 0
  const fns       = getCurrentFunctions()
  // CISO-Sektion: RBAC rank >= contentowner ODER explizite ciso-Funktion
  const showCiso  = rank >= ROLE_RANK.contentowner || fns.includes('ciso')
  // DSB-Sektion: RBAC rank >= contentowner ODER explizite dso-Funktion
  const showDso   = rank >= ROLE_RANK.contentowner || fns.includes('dso')

  let panel = document.getElementById('settingsPanelContainer')
  if (!panel) {
    panel = document.createElement('div')
    panel.id = 'settingsPanelContainer'
    dom('editor').appendChild(panel)
  }

  // Load role-specific settings if applicable
  let roleSettings = {}
  if (showCiso || showDso) {
    try {
      const r = await fetch('/admin/role-settings', { headers: apiHeaders() })
      if (r.ok) roleSettings = await r.json()
    } catch {}
  }
  const cs = roleSettings.cisoSettings     || {}
  const gs = roleSettings.gdpoSettings     || {}
  const is = roleSettings.icsSettings      || {}
  const rs = roleSettings.revisionSettings || {}
  const qs = roleSettings.qmSettings       || {}

  const incTypeOpts = Object.entries(INC_TYPE_LABELS).map(([v,l]) =>
    `<option value="${v}" ${(cs.reportableTypes||[]).includes(v)?'selected':''}>${l}</option>`).join('')

  const cisoSection = showCiso ? `
    <div class="settings-section">
      <h4><i class="ph ph-shield-warning"></i> ${t('set_incidentSettings')}</h4>
      <p class="settings-desc">${t('set_incidentDesc')}</p>
      <div class="org-grid" style="max-width:600px">
        <label class="org-label">${t('set_escalationEmail')}</label>
        <input class="input" id="cisoEscalationEmail" value="${escHtml(cs.escalationEmail||'')}" type="email" placeholder="ciso@company.com">
        <label class="org-label">${t('set_incidentSla')}</label>
        <input class="input" id="cisoSLA" value="${cs.incidentResponseSLA||24}" type="number" min="1" max="168" style="width:100px">
        <label class="org-label">${t('set_reportableFrom')}</label>
        <select class="select" id="cisoThreshold">
          <option value="low"      ${cs.reportableThreshold==='low'      ?'selected':''}>${t('riskl_low')}</option>
          <option value="medium"   ${cs.reportableThreshold==='medium'   ?'selected':''}>${t('riskl_medium')}</option>
          <option value="high"     ${cs.reportableThreshold==='high'     ?'selected':''}>${t('riskl_high')}</option>
          <option value="critical" ${cs.reportableThreshold==='critical' ?'selected':''}>${t('riskl_critical')}</option>
        </select>
        <label class="org-label">${t('set_reportableTypes')}</label>
        <select class="select" id="cisoReportableTypes" multiple size="4" style="height:auto">${incTypeOpts}</select>
      </div>
      <div class="settings-actions" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" onclick="saveCisoSettings()">
          <i class="ph ph-floppy-disk"></i> ${t('set_saveCiso')}
        </button>
      </div>
      <p id="cisoSaveMsg" style="font-size:13px;margin-top:6px;display:none"></p>
    </div>` : ''

  const gdpoSection = showDso ? `
    <div class="settings-section">
      <h4><i class="ph ph-lock-key"></i> ${t('set_gdprSettings')}</h4>
      <p class="settings-desc">Configuration for DSAR deadlines, reporting obligations and default texts.</p>
      <div class="org-grid" style="max-width:600px">
        <label class="org-label">${t('set_dsarDeadline')}</label>
        <input class="input" id="gdpoDsar" value="${gs.dsarDeadlineDays||30}" type="number" min="1" max="90" style="width:100px">
        <label class="org-label">${t('set_dsarDeadlineExt')}</label>
        <input class="input" id="gdpoDsarExt" value="${gs.dsarExtendedDays||90}" type="number" min="1" max="180" style="width:100px">
        <label class="org-label">72h reporting obligation active</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px">
          <input type="checkbox" id="gdpo72h" ${gs.timer72hEnabled!==false?'checked':''}> Enabled
        </label>
        <label class="org-label">${t('set_dpAuthority')}</label>
        <input class="input" id="gdpoDSA" value="${escHtml(gs.supervisoryAuthority||'')}" placeholder="e.g. ICO, CNIL, BfDI">
        <label class="org-label">${t('set_authorityContact')}</label>
        <input class="input" id="gdpoDSAContact" value="${escHtml(gs.supervisoryContact||'')}">
        <label class="org-label">${t('set_dsarDefaultText')}</label>
        <textarea class="input" id="gdpoDsarText" rows="3" style="resize:vertical">${escHtml(gs.dsarDefaultResponse||'')}</textarea>
      </div>
      <div class="settings-actions" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" onclick="saveGdpoSettings()">
          <i class="ph ph-floppy-disk"></i> ${t('set_saveDpo')}
        </button>
      </div>
      <p id="gdpoSaveMsg" style="font-size:13px;margin-top:6px;display:none"></p>
    </div>` : ''

  const icsSection = rank >= ROLE_RANK.contentowner ? `
    <div class="settings-section">
      <h4><i class="ph ph-factory"></i> ${t('set_icsSettings')}</h4>
      <p class="settings-desc">Configuration for OT/ICS environments (PLC, SCADA, field devices, building technology) per IEC 62443 / NIS2.</p>
      ${!is.otResponsible ? `<div class="settings-notice"><i class="ph ph-warning"></i> No OT security responsible assigned — position not yet filled.</div>` : ''}
      <div class="org-grid" style="max-width:600px;margin-top:10px">
        <label class="org-label">${t('set_otResponsible')}</label>
        <input class="input" id="icsResponsible" value="${escHtml(is.otResponsible||'')}" placeholder="${t('set_phNamePending')}">
        <label class="org-label">E-Mail</label>
        <input class="input" id="icsEmail" value="${escHtml(is.otResponsibleEmail||'')}" type="email" placeholder="ot-security@company.com">
        <label class="org-label">${t('set_otScope')}</label>
        <textarea class="input" id="icsScope" rows="2" style="resize:vertical" placeholder="e.g. Production line 1–3, SCADA plant north, building management">${escHtml(is.otScope||'')}</textarea>
        <label class="org-label">${t('set_appliedStandard')}</label>
        <select class="select" id="icsStandard">
          <option value="iec62443" ${(is.otStandard||'iec62443')==='iec62443'?'selected':''}>IEC 62443</option>
          <option value="vdi2182"  ${is.otStandard==='vdi2182' ?'selected':''}>VDI/VDE 2182</option>
          <option value="namur"    ${is.otStandard==='namur'   ?'selected':''}>NAMUR NA 163</option>
          <option value="bsi"      ${is.otStandard==='bsi'     ?'selected':''}>${t('set_bsiIcsCompendium')}</option>
          <option value="other"    ${is.otStandard==='other'   ?'selected':''}>${t('ui_other')}</option>
        </select>
        <label class="org-label">${t('set_nis2Sector')}</label>
        <select class="select" id="icsNis2Sector">
          <option value=""           ${!is.otNis2Sector            ?'selected':''}>— not applicable —</option>
          <option value="energie"    ${is.otNis2Sector==='energie'   ?'selected':''}>${t('set_sectorEnergy')}</option>
          <option value="wasser"     ${is.otNis2Sector==='wasser'    ?'selected':''}>${t('set_sectorWater')}</option>
          <option value="transport"  ${is.otNis2Sector==='transport' ?'selected':''}>${t('set_sectorTransport')}</option>
          <option value="produktion" ${is.otNis2Sector==='produktion'?'selected':''}>${t('set_sectorManufacturing')}</option>
          <option value="chemie"     ${is.otNis2Sector==='chemie'    ?'selected':''}>${t('set_sectorChemicals')}</option>
          <option value="lebensmittel"${is.otNis2Sector==='lebensmittel'?'selected':''}>${t('set_sectorFood')}</option>
          <option value="other"      ${is.otNis2Sector==='other'     ?'selected':''}>${t('ui_other')}</option>
        </select>
        <label class="org-label">${t('set_kritisRelevant')}</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px">
          <input type="checkbox" id="icsKritis" ${is.otKritisRelevant?'checked':''}> Yes, critical infrastructure operator
        </label>
        <label class="org-label">${t('set_networkSegmentation')}</label>
        <select class="select" id="icsSegmentation">
          <option value="implemented" ${is.otNetworkSegmentation==='implemented'?'selected':''}>${t('set_segFull')}</option>
          <option value="partial"     ${(is.otNetworkSegmentation||'partial')==='partial'?'selected':''}>${t('set_segPartial')}</option>
          <option value="planned"     ${is.otNetworkSegmentation==='planned'    ?'selected':''}>${t('ui_planned')}</option>
        </select>
        <label class="org-label">${t('set_patchCycle')}</label>
        <input class="input" id="icsPatchCycle" value="${is.otPatchCycleWeeks||12}" type="number" min="1" max="52" style="width:100px">
        <label class="org-label">${t('set_maintenanceWindow')}</label>
        <input class="input" id="icsMaintenanceWindow" value="${escHtml(is.otMaintenanceWindow||'')}" placeholder="e.g. Sat 02:00–06:00">
        <label class="org-label">${t('set_emergencyContact')}</label>
        <input class="input" id="icsEmergencyContact" value="${escHtml(is.otEmergencyContact||'')}" placeholder="${t('set_phShiftContact')}">
      </div>
      <div class="settings-actions" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" onclick="saveIcsSettings()">
          <i class="ph ph-floppy-disk"></i> ${t('set_saveIcs')}
        </button>
      </div>
      <p id="icsSaveMsg" style="font-size:13px;margin-top:6px;display:none"></p>
    </div>` : ''

  const revSection = rank >= ROLE_RANK.contentowner ? `
    <div class="settings-section">
      <h4><i class="ph ph-magnifying-glass"></i> ${t('set_internalAudit')}</h4>
      <p class="settings-desc">Independent audit function of the internal control system (ICS). Internal Audit is free from instructions and reports directly to management or the supervisory board.</p>
      ${!rs.revResponsible ? `<div class="settings-notice"><i class="ph ph-warning"></i> No audit responsible assigned — position not yet filled.</div>` : ''}
      <div class="org-grid" style="max-width:600px;margin-top:10px">
        <label class="org-label">${t('set_headInternalAudit')}</label>
        <input class="input" id="revResponsible" value="${escHtml(rs.revResponsible||'')}" placeholder="${t('set_phNamePending')}">
        <label class="org-label">E-Mail</label>
        <input class="input" id="revEmail" value="${escHtml(rs.revResponsibleEmail||'')}" type="email" placeholder="audit@company.com">
        <label class="org-label">${t('set_auditScope')}</label>
        <textarea class="input" id="revScope" rows="2" style="resize:vertical" placeholder="e.g. All group entities, finance and IT processes">${escHtml(rs.revScope||'')}</textarea>
        <label class="org-label">${t('set_reportsTo')}</label>
        <select class="select" id="revReportsTo">
          <option value="gf"                ${(rs.revReportsTo||'gf')==='gf'               ?'selected':''}>${t('set_mgmtBoard')}</option>
          <option value="aufsichtsrat"       ${rs.revReportsTo==='aufsichtsrat'             ?'selected':''}>${t('set_supervisoryBoard')}</option>
          <option value="prüfungsausschuss"  ${rs.revReportsTo==='prüfungsausschuss'        ?'selected':''}>${t('set_auditCommittee')}</option>
        </select>
        <label class="org-label">${t('set_auditCycle')}</label>
        <input class="input" id="revCycle" value="${rs.revCycleMonths||12}" type="number" min="1" max="36" style="width:100px">
        <label class="org-label">${t('set_lastInternalAudit')}</label>
        <input class="input" id="revLastAudit" type="date" value="${rs.revLastAuditDate||''}">
        <label class="org-label">${t('set_nextPlannedAudit')}</label>
        <input class="input" id="revNextAudit" type="date" value="${rs.revNextAuditDate||''}">
        <label class="org-label">${t('set_externalAuditor')}</label>
        <input class="input" id="revExternal" value="${escHtml(rs.revExternalSupport||'')}" placeholder="e.g. KPMG, PwC, Deloitte">
      </div>
      <div class="settings-actions" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" onclick="saveRevisionSettings()">
          <i class="ph ph-floppy-disk"></i> ${t('set_saveAudit')}
        </button>
      </div>
      <p id="revSaveMsg" style="font-size:13px;margin-top:6px;display:none"></p>
    </div>` : ''

  const qmSection = rank >= ROLE_RANK.contentowner ? `
    <div class="settings-section">
      <h4><i class="ph ph-medal"></i> ${t('set_qmSettings')}</h4>
      <p class="settings-desc">The Quality Management Officer (QMO) is formally required under ISO 9001:2015 Cl. 5.3 and is responsible for the Quality Management System (QMS) across the group including certification and surveillance audits.</p>
      ${!qs.qmResponsible ? `<div class="settings-notice"><i class="ph ph-warning"></i> No QMO assigned — position not yet filled.</div>` : ''}
      <div class="org-grid" style="max-width:600px;margin-top:10px">
        <label class="org-label">${t('set_qmoName')}</label>
        <input class="input" id="qmResponsible" value="${escHtml(qs.qmResponsible||'')}" placeholder="${t('set_phNamePending')}">
        <label class="org-label">E-Mail</label>
        <input class="input" id="qmEmail" value="${escHtml(qs.qmResponsibleEmail||'')}" type="email" placeholder="qmo@company.com">
        <label class="org-label">${t('set_qmScope')}</label>
        <textarea class="input" id="qmScope" rows="2" style="resize:vertical" placeholder="e.g. Development, production and sales at all sites">${escHtml(qs.qmScope||'')}</textarea>
        <label class="org-label">${t('set_standardNorm')}</label>
        <select class="select" id="qmStandard">
          <option value="iso9001"   ${(qs.qmStandard||'iso9001')==='iso9001'  ?'selected':''}>ISO 9001:2015</option>
          <option value="iso9000"   ${qs.qmStandard==='iso9000'               ?'selected':''}>ISO 9000 (Fundamentals)</option>
          <option value="iatf16949" ${qs.qmStandard==='iatf16949'             ?'selected':''}>IATF 16949 (Automotive)</option>
          <option value="iso13485"  ${qs.qmStandard==='iso13485'              ?'selected':''}>ISO 13485 (Medical devices)</option>
          <option value="as9100"    ${qs.qmStandard==='as9100'                ?'selected':''}>AS9100 (Aerospace)</option>
          <option value="other"     ${qs.qmStandard==='other'                 ?'selected':''}>${t('ui_other')}</option>
        </select>
        <label class="org-label">${t('set_certBody')}</label>
        <input class="input" id="qmCertBody" value="${escHtml(qs.qmCertBody||'')}" placeholder="e.g. TÜV SÜD, DQS, Bureau Veritas, DNV">
        <label class="org-label">${t('set_certValidUntil')}</label>
        <input class="input" id="qmCertValid" type="date" value="${qs.qmCertValidUntil||''}">
        <label class="org-label">${t('set_lastSurveillance')}</label>
        <input class="input" id="qmLastAudit" type="date" value="${qs.qmLastAuditDate||''}">
        <label class="org-label">${t('set_nextSurveillance')}</label>
        <input class="input" id="qmNextAudit" type="date" value="${qs.qmNextAuditDate||''}">
        <label class="org-label">${t('set_nextRecert')}</label>
        <input class="input" id="qmRecert" type="date" value="${qs.qmRecertDate||''}">
      </div>
      <div class="settings-actions" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" onclick="saveQmSettings()">
          <i class="ph ph-floppy-disk"></i> ${t('set_saveQm')}
        </button>
      </div>
      <p id="qmSaveMsg" style="font-size:13px;margin-top:6px;display:none"></p>
    </div>` : ''

  panel.innerHTML = `
    <div class="admin-fullpage">
      <div class="admin-fullpage-header">
        <h2><i class="ph ph-gear-six"></i> Settings</h2>
      </div>
      <div class="settings-panel">

        <!-- ── Sprache / Language ── -->
        <div class="settings-section" style="max-width:640px">
          <h3><i class="ph ph-translate"></i> ${t('settings_lang')}</h3>
          <p class="settings-desc">${t('settings_langDesc')}</p>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px">
            ${[
              {code:'de', key:'settings_langDe'},
              {code:'en', key:'settings_langEn'},
              {code:'fr', key:'settings_langFr'},
              {code:'nl', key:'settings_langNl'},
            ].filter(l => (_langConfig?.available||['de','en','fr','nl']).includes(l.code)).map(l =>
              `<button class="btn ${(window.LANG||'en')===l.code ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="switchAppLang('${l.code}')">
                <i class="ph ph-flag"></i> ${t(l.key)}
              </button>`
            ).join('')}
            <span id="langSaveMsg" style="font-size:13px;color:var(--success,#4ade80);display:none"></span>
          </div>
        </div>

        <!-- ── Personal Settings ── -->
        <div class="personal-settings-section">
          <h3><i class="ph ph-user-circle"></i> ${t('set_personalSettings')}</h3>
          <p class="settings-desc" style="margin-bottom:16px">${t('set_passwordFor')} <strong>${escHtml(username)}</strong>.</p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:760px">

            <!-- Change password -->
            <div>
              <h4 style="margin:0 0 10px;font-size:.9rem"><i class="ph ph-lock-key"></i> ${t('set_changePassword')}</h4>
              <div style="display:flex;flex-direction:column;gap:8px">
                <input class="input" id="pwOld" type="password" placeholder="${t('pw_current')}" autocomplete="current-password">
                <input class="input" id="pwNew" type="password" placeholder="${t('pw_new')}" autocomplete="new-password">
                <input class="input" id="pwConfirm" type="password" placeholder="${t('pw_confirm')}" autocomplete="new-password">
                <button class="btn btn-primary btn-sm" onclick="saveMyPassword()">
                  <i class="ph ph-floppy-disk"></i> ${t('pw_save')}
                </button>
                <p id="pwSaveMsg" style="font-size:13px;display:none"></p>
              </div>
            </div>

            <!-- 2FA -->
            <div id="twofa-settings-block">
              <h4 style="margin:0 0 10px;font-size:.9rem"><i class="ph ph-shield-check"></i> ${t('set_twoFactor')}</h4>
              <p id="twofa-status-msg" style="font-size:.82rem;color:var(--text-subtle);margin-bottom:10px">${t('twofa_loadingStatus')}</p>
              <div id="twofa-setup-area"></div>
            </div>
          </div>
        </div>

        ${cisoSection}
        ${gdpoSection}
        ${icsSection}
        ${revSection}
        ${qmSection}

        ${(rank >= ROLE_RANK.contentowner || fns.includes('ciso')) ? `
        <div class="settings-section" id="tmplMgmtSection" style="border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
          <h3><i class="ph ph-files"></i> ${t('set_templateMgmt')}</h3>
          <p class="settings-desc">${t('set_templatesDesc')}</p>
          <div id="tmplMgmtContent"><p class="report-loading">${t('ui_loading')}</p></div>
        </div>` : ''}

        <div class="settings-section" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
          <p class="settings-desc" style="color:var(--text-subtle);font-size:12px">
            <i class="ph ph-info"></i> ${t('set_adminHint')}
            <strong>${t('nav_admin')}</strong>.
          </p>
        </div>
      </div>
    </div>`

  // 2FA-Status laden und Bereich rendern
  _renderTwofaSettingsBlock()

  // Template Management laden (admin + ciso)
  if (rank >= ROLE_RANK.contentowner || fns.includes('ciso')) {
    loadTmplManagement()
  }
}

// ── Template Management (Settings) ───────────────────────────────────────────

async function loadTmplManagement() {
  const el = dom('tmplMgmtContent')
  if (!el) return

  const rank  = ROLE_RANK[getCurrentRole()] || 0
  const isAdmin = rank >= ROLE_RANK.admin

  // Fetch all templates (no type filter = all)
  const res = await fetch('/templates', { headers: apiHeaders() })
  if (!res.ok) { el.innerHTML = `<p class="report-empty">${t('err_load')}</p>`; return }
  const all = (await res.json()).filter(t => !t.deletedAt)

  if (all.length === 0) { el.innerHTML = `<p class="report-empty">${t('noTemplates')}</p>`; return }

  // Group by type
  const byType = {}
  for (const t of all) {
    if (!byType[t.type]) byType[t.type] = []
    byType[t.type].push(t)
  }

  const statusCls = { draft: 'status-draft', review: 'status-review', approved: 'status-approved', archived: 'status-archived' }

  const sections = Object.entries(byType).map(([type, items]) => {
    const rows = items.map(t => {
      const isDraft = t.status === 'draft'
      const typeIcon = TYPE_ICONS[t.type] || 'ph-file'
      return `<tr>
        <td style="color:var(--text-subtle);font-size:.8rem"><i class="ph ${typeIcon}"></i> ${escHtml(t.type)}</td>
        <td>${escHtml(t.title)}</td>
        <td><span class="status-badge ${statusCls[t.status]||''}">${t.status}</span></td>
        <td style="color:var(--text-subtle)">v${t.version}</td>
        <td style="white-space:nowrap;text-align:right">
          <button class="btn btn-secondary btn-xs" title="Edit" onclick="tmplMgmtEdit('${escHtml(t.type)}','${t.id}')">
            <i class="ph ph-pencil"></i>
          </button>
          ${isDraft ? `
            <button class="btn btn-secondary btn-xs" style="margin-left:4px" title="Move to trash" onclick="tmplMgmtSoftDelete('${escHtml(t.type)}','${t.id}','${escHtml(t.title)}')">
              <i class="ph ph-trash"></i>
            </button>
            ${isAdmin ? `
            <button class="btn btn-danger btn-xs" style="margin-left:4px" title="Permanently delete" onclick="tmplMgmtPermDelete('${escHtml(t.type)}','${t.id}','${escHtml(t.title)}')">
              <i class="ph ph-trash-simple"></i>
            </button>` : ''}
          ` : ''}
        </td>
      </tr>`
    }).join('')

    return `
      <div style="margin-bottom:20px">
        <h4 style="font-size:.88rem;font-weight:600;color:var(--text-muted);margin:0 0 6px;display:flex;align-items:center;gap:6px">
          <i class="ph ${TYPE_ICONS[type]||'ph-file'}"></i> ${escHtml(type)}
          <span style="font-weight:400;color:var(--text-subtle)">(${items.length})</span>
        </h4>
        <table class="risk-table" style="width:100%;font-size:.85rem">
          <thead><tr>
            <th style="width:110px">${t('col_type')}</th>
            <th>${t('col_title')}</th>
            <th style="width:100px">${t('col_status')}</th>
            <th style="width:60px">${t('col_version')}</th>
            <th style="width:120px"></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
  }).join('')

  el.innerHTML = sections

  // Trash section for admin: show deleted templates with restore option
  if (isAdmin) {
    const trashRes = await fetch('/trash', { headers: apiHeaders() })
    if (trashRes.ok) {
      const trash = await trashRes.json()
      const deletedTmpls = (trash.templates || [])
      if (deletedTmpls.length > 0) {
        const trashRows = deletedTmpls.map(t => `<tr>
          <td style="color:var(--text-subtle);font-size:.8rem"><i class="ph ${TYPE_ICONS[t.type]||'ph-file'}"></i> ${escHtml(t.type)}</td>
          <td>${escHtml(t.title)}</td>
          <td><span class="status-badge status-archived">deleted</span></td>
          <td style="white-space:nowrap;text-align:right">
            <button class="btn btn-secondary btn-xs" title="Restore" onclick="tmplMgmtRestore('${escHtml(t.type)}','${t.id}','${escHtml(t.title)}')">
              <i class="ph ph-arrow-counter-clockwise"></i>
            </button>
            <button class="btn btn-danger btn-xs" style="margin-left:4px" title="Permanently delete" onclick="tmplMgmtPermDelete('${escHtml(t.type)}','${t.id}','${escHtml(t.title)}')">
              <i class="ph ph-trash-simple"></i>
            </button>
          </td>
        </tr>`).join('')
        el.innerHTML += `
          <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
            <h4 style="font-size:.88rem;font-weight:600;color:var(--danger-text,#f87171);margin:0 0 6px;display:flex;align-items:center;gap:6px">
              <i class="ph ph-trash"></i> Trash (${deletedTmpls.length})
            </h4>
            <table class="risk-table" style="width:100%;font-size:.85rem">
              <thead><tr>
                <th style="width:110px">${t('col_type')}</th><th>${t('col_title')}</th><th style="width:100px">${t('col_status')}</th><th style="width:120px"></th>
              </tr></thead>
              <tbody>${trashRows}</tbody>
            </table>
          </div>`
      }
    }
  }
}

async function tmplMgmtEdit(type, id) {
  // Navigate to the template in the editor
  selectType(type)
  setTimeout(async () => {
    const res = await fetch(`/template/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { headers: apiHeaders() })
    if (res.ok) loadTemplate(await res.json())
  }, 150)
}

async function tmplMgmtSoftDelete(type, id, title) {
  if (!confirm(t('tmpl_trashConfirm', { title }))) return
  const res = await fetch(`/template/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: apiHeaders('contentowner') })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error'); return }
  loadTmplManagement()
}

async function tmplMgmtPermDelete(type, id, title) {
  if (!confirm(t('tmpl_permanentDeleteConfirm', { title }))) return
  const res = await fetch(`/template/${encodeURIComponent(type)}/${encodeURIComponent(id)}/permanent`, { method: 'DELETE', headers: apiHeaders('admin') })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error'); return }
  loadTmplManagement()
}

async function tmplMgmtRestore(type, id, title) {
  if (!confirm(t('tmpl_restoreConfirm', { title }))) return
  const res = await fetch(`/template/${encodeURIComponent(type)}/${encodeURIComponent(id)}/restore`, { method: 'POST', headers: apiHeaders('admin') })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error'); return }
  loadTmplManagement()
}

async function saveMyPassword() {
  const old = dom('pwOld')?.value
  const nw  = dom('pwNew')?.value
  const cnf = dom('pwConfirm')?.value
  const msg = dom('pwSaveMsg')
  if (!msg) return
  msg.style.display = ''
  if (!old || !nw) { msg.textContent = 'Please fill in all fields.'; msg.style.color = 'var(--danger-text)'; return }
  if (nw.length < 6) { msg.textContent = 'New password must be at least 6 characters.'; msg.style.color = 'var(--danger-text)'; return }
  if (nw !== cnf)   { msg.textContent = 'New passwords do not match.'; msg.style.color = 'var(--danger-text)'; return }
  const res = await fetch('/me/password', {
    method: 'PUT', headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword: old, newPassword: nw }),
  })
  const data = await res.json()
  if (res.ok) {
    msg.textContent = 'Password changed successfully.'
    msg.style.color = 'var(--success,#4ade80)'
    dom('pwOld').value = ''; dom('pwNew').value = ''; dom('pwConfirm').value = ''
  } else {
    msg.textContent = data.error || 'Error saving.'
    msg.style.color = 'var(--danger-text)'
  }
  setTimeout(() => { if (msg) msg.style.display = 'none' }, 4000)
}

async function _renderTwofaSettingsBlock() {
  const statusMsg = dom('twofa-status-msg')
  const setupArea = dom('twofa-setup-area')
  if (!statusMsg || !setupArea) return

  // whoami liefert has2FA
  let has2FA = false
  try {
    const r = await fetch('/whoami', { headers: apiHeaders() })
    if (r.ok) { const w = await r.json(); has2FA = !!w.has2FA }
  } catch {}

  if (has2FA) {
    statusMsg.innerHTML = `<span style="color:var(--success,#4ade80)"><i class="ph ph-check-circle"></i> ${t('twofa_active')}</span>`
    setupArea.innerHTML = `
      <p style="font-size:.82rem;color:var(--text-subtle);margin-bottom:8px">${t('twofa_disableWarn')}</p>
      <button class="btn btn-sm" style="border-color:var(--danger-text);color:var(--danger-text)" onclick="disable2FA()">
        <i class="ph ph-shield-slash"></i> ${t('twofa_disable')}
      </button>
      <p id="twofaMsg" style="font-size:13px;margin-top:8px;display:none"></p>`
  } else {
    statusMsg.innerHTML = `<span style="color:#f0b429"><i class="ph ph-shield-warning"></i> ${t('twofa_inactive')}</span>`
    // Load QR code
    try {
      const r = await fetch('/2fa/setup', { headers: apiHeaders() })
      if (r.ok) {
        const { qrDataUri, secret } = await r.json()
        const qrDataUrl = qrDataUri
        setupArea.innerHTML = `
          <div class="personal-2fa-qr">
            <p style="font-size:.82rem;color:var(--text-subtle);margin:0">${t('twofa_scan')}</p>
            <img src="${qrDataUrl}" alt="2FA QR Code" width="180" height="180">
            <details style="font-size:.78rem;color:var(--text-subtle)">
              <summary style="cursor:pointer">${t('twofa_manualKey')}</summary>
              <code style="font-family:monospace;word-break:break-all">${escHtml(secret||'')}</code>
            </details>
            <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
              <input class="input" id="totpVerifyCode" type="text" inputmode="numeric" maxlength="6" placeholder="${t('twofa_codePh')}" style="width:140px">
              <button class="btn btn-primary btn-sm" onclick="verify2FA()">
                <i class="ph ph-check"></i> ${t('twofa_enable')}
              </button>
            </div>
            <p id="twofaMsg" style="font-size:13px;margin-top:4px;display:none"></p>
          </div>`
      } else {
        setupArea.innerHTML = '<p style="color:var(--danger-text);font-size:.82rem">2FA module not available.</p>'
      }
    } catch {
      setupArea.innerHTML = `<p style="color:var(--danger-text);font-size:.82rem">${t('twofa_setupError')}</p>`
    }
  }
}

async function verify2FA() {
  const token = dom('totpVerifyCode')?.value?.trim()
  const msg   = dom('twofaMsg')
  if (!token) return
  if (msg) msg.style.display = ''
  const res = await fetch('/2fa/verify', {
    method: 'POST', headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  const data = await res.json()
  if (res.ok) {
    if (msg) { msg.textContent = '2FA successfully enabled!'; msg.style.color = 'var(--success,#4ade80)' }
    _show2FAHint(false)   // Topbar-Chip ausblenden
    setTimeout(() => _renderTwofaSettingsBlock(), 1500)
  } else {
    if (msg) { msg.textContent = data.error || 'Invalid code.'; msg.style.color = 'var(--danger-text)' }
  }
}

async function disable2FA() {
  if (!confirm('Really disable 2FA? Your account will only be protected by password.')) return
  const msg = dom('twofaMsg')
  const res = await fetch('/2fa', { method: 'DELETE', headers: apiHeaders() })
  const data = await res.json()
  if (res.ok) {
    _show2FAHint(true)   // Topbar-Chip wieder anzeigen
    _renderTwofaSettingsBlock()
  } else {
    if (msg) { msg.style.display = ''; msg.textContent = data.error || 'Error.'; msg.style.color = 'var(--danger-text)' }
  }
}

async function saveCisoSettings() {
  const types = [...(document.getElementById('cisoReportableTypes')?.selectedOptions||[])].map(o => o.value)
  const patch = { cisoSettings: {
    escalationEmail:     document.getElementById('cisoEscalationEmail')?.value.trim(),
    incidentResponseSLA: parseInt(document.getElementById('cisoSLA')?.value)||24,
    reportableThreshold: document.getElementById('cisoThreshold')?.value,
    reportableTypes:     types,
  }}
  const res = await fetch('/admin/role-settings', {
    method: 'PUT', headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  })
  const msg = document.getElementById('cisoSaveMsg')
  msg.style.display = ''
  if (res.ok) { msg.textContent = 'Gespeichert.'; msg.style.color = 'var(--success,#4ade80)' }
  else { msg.textContent = 'Error saving.'; msg.style.color = 'var(--danger-text)' }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

async function saveGdpoSettings() {
  const patch = { gdpoSettings: {
    dsarDeadlineDays:    parseInt(document.getElementById('gdpoDsar')?.value)||30,
    dsarExtendedDays:    parseInt(document.getElementById('gdpoDsarExt')?.value)||90,
    timer72hEnabled:     document.getElementById('gdpo72h')?.checked !== false,
    supervisoryAuthority:document.getElementById('gdpoDSA')?.value.trim(),
    supervisoryContact:  document.getElementById('gdpoDSAContact')?.value.trim(),
    dsarDefaultResponse: document.getElementById('gdpoDsarText')?.value.trim(),
  }}
  const res = await fetch('/admin/role-settings', {
    method: 'PUT', headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  })
  const msg = document.getElementById('gdpoSaveMsg')
  msg.style.display = ''
  if (res.ok) { msg.textContent = 'Gespeichert.'; msg.style.color = 'var(--success,#4ade80)' }
  else { msg.textContent = 'Error saving.'; msg.style.color = 'var(--danger-text)' }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

async function saveRevisionSettings() {
  const patch = { revisionSettings: {
    revResponsible:      document.getElementById('revResponsible')?.value.trim(),
    revResponsibleEmail: document.getElementById('revEmail')?.value.trim(),
    revScope:            document.getElementById('revScope')?.value.trim(),
    revReportsTo:        document.getElementById('revReportsTo')?.value,
    revCycleMonths:      parseInt(document.getElementById('revCycle')?.value)||12,
    revLastAuditDate:    document.getElementById('revLastAudit')?.value,
    revNextAuditDate:    document.getElementById('revNextAudit')?.value,
    revExternalSupport:  document.getElementById('revExternal')?.value.trim(),
  }}
  const res = await fetch('/admin/role-settings', {
    method: 'PUT', headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  })
  const msg = document.getElementById('revSaveMsg')
  msg.style.display = ''
  if (res.ok) { msg.textContent = 'Gespeichert.'; msg.style.color = 'var(--success,#4ade80)'; renderSettingsPanel() }
  else { msg.textContent = 'Error saving.'; msg.style.color = 'var(--danger-text)' }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

async function saveQmSettings() {
  const patch = { qmSettings: {
    qmResponsible:      document.getElementById('qmResponsible')?.value.trim(),
    qmResponsibleEmail: document.getElementById('qmEmail')?.value.trim(),
    qmScope:            document.getElementById('qmScope')?.value.trim(),
    qmStandard:         document.getElementById('qmStandard')?.value,
    qmCertBody:         document.getElementById('qmCertBody')?.value.trim(),
    qmCertValidUntil:   document.getElementById('qmCertValid')?.value,
    qmLastAuditDate:    document.getElementById('qmLastAudit')?.value,
    qmNextAuditDate:    document.getElementById('qmNextAudit')?.value,
    qmRecertDate:       document.getElementById('qmRecert')?.value,
  }}
  const res = await fetch('/admin/role-settings', {
    method: 'PUT', headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  })
  const msg = document.getElementById('qmSaveMsg')
  msg.style.display = ''
  if (res.ok) { msg.textContent = 'Gespeichert.'; msg.style.color = 'var(--success,#4ade80)'; renderSettingsPanel() }
  else { msg.textContent = 'Error saving.'; msg.style.color = 'var(--danger-text)' }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

async function saveIcsSettings() {
  const patch = { icsSettings: {
    otResponsible:         document.getElementById('icsResponsible')?.value.trim(),
    otResponsibleEmail:    document.getElementById('icsEmail')?.value.trim(),
    otScope:               document.getElementById('icsScope')?.value.trim(),
    otStandard:            document.getElementById('icsStandard')?.value,
    otNis2Sector:          document.getElementById('icsNis2Sector')?.value,
    otKritisRelevant:      document.getElementById('icsKritis')?.checked || false,
    otNetworkSegmentation: document.getElementById('icsSegmentation')?.value,
    otPatchCycleWeeks:     parseInt(document.getElementById('icsPatchCycle')?.value)||12,
    otMaintenanceWindow:   document.getElementById('icsMaintenanceWindow')?.value.trim(),
    otEmergencyContact:    document.getElementById('icsEmergencyContact')?.value.trim(),
  }}
  const res = await fetch('/admin/role-settings', {
    method: 'PUT', headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  })
  const msg = document.getElementById('icsSaveMsg')
  msg.style.display = ''
  if (res.ok) { msg.textContent = 'Gespeichert.'; msg.style.color = 'var(--success,#4ade80)'; renderSettingsPanel() }
  else { msg.textContent = 'Error saving.'; msg.style.color = 'var(--danger-text)' }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

function loadTemplate(t) {
  // Make sure the editor area is visible (may have been hidden by a module section)
  const editorCard = dom('editorCard')
  const listPanel  = dom('listPanel')
  if (editorCard) editorCard.style.display = ''
  if (listPanel)  listPanel.style.display  = ''

  currentTemplate = t
  dom('inputTitle').value = t.title
  dom('contentEditor').value = t.content
  dom('selType').textContent = t.type
  updateStatusBadge(t.status)
  dom('ownerInfo').textContent = t.owner ? `Owner: ${t.owner}` : ''
  // nextReviewDate
  const reviewInput = dom('inputNextReview')
  if (reviewInput) {
    reviewInput.value = t.nextReviewDate ? t.nextReviewDate.slice(0, 10) : ''
    updateReviewHint(t.nextReviewDate)
  }
  renderLifecycleActions(t)
  renderWebdavPublishBar(t)
  renderTmplControlsBar(t)
  renderTmplEntityBar(t)
  renderAttachmentsBar(t)
  renderBreadcrumb(t)
  applyTemplateViewMode(t)
  // Kind-Seite + Verschieben nur für contentowner+
  const rank = ROLE_RANK[getCurrentRole()] || 0
  const canMove = rank >= ROLE_RANK.contentowner
  const btnChild = dom('btnChildPage')
  if (btnChild) btnChild.style.display = canMove ? '' : 'none'
  const btnMove = dom('btnMovePage')
  if (btnMove) btnMove.style.display = canMove ? '' : 'none'
}

// ── #61: Leseansicht statt Eingabefeld ───────────────────────────────────────
//
// Bis hierher bekam JEDE Rolle das Autoren-Eingabefeld zu sehen — ein Leser
// also rohen Markdown-Quelltext in einer 240px hohen Textarea. Wer nicht
// bearbeiten darf, sieht jetzt das gerenderte Dokument; Bearbeiter koennen
// zwischen beidem umschalten.
let _tmplPreviewOn = false

function templateCanEdit() {
  return (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.editor
}

/** Rendert Markdown sicher: kein Roh-HTML, keine javascript:-Verweise. */
function renderMarkdownSafe(md) {
  const text = String(md || '')
  if (typeof marked === 'undefined') return `<pre>${escHtml(text)}</pre>`
  // Eingebettetes HTML entschaerfen, ohne Markdown zu zerstoeren: Nur '<'
  // neutralisieren (damit kein Tag entsteht) — '>' bleibt, sonst brechen
  // Blockzitate. Der Inhalt stammt aus dem eigenen Haus, wandert aber auch auf
  // die login-freie Bestaetigungsseite, deshalb ueberhaupt diese Vorsicht.
  const html = marked.parse(text.replace(/</g, '&lt;'))
  const box = document.createElement('div')
  box.innerHTML = html
  box.querySelectorAll('a[href]').forEach(a => {
    if (/^\s*javascript:/i.test(a.getAttribute('href') || '')) a.removeAttribute('href')
    else { a.target = '_blank'; a.rel = 'noopener noreferrer' }
  })
  return box.innerHTML
}

/** Zeigt Editor oder Leseansicht, je nach Recht und Umschalter. */
function applyTemplateViewMode(tmpl) {
  const editor = dom('contentEditor')
  const viewer = dom('contentViewer')
  const save   = dom('btnSave')
  const prev   = dom('btnPreview')
  const label  = dom('btnPreviewLabel')
  if (!editor || !viewer) return

  const canEdit = templateCanEdit()
  const showViewer = !canEdit || _tmplPreviewOn

  if (showViewer) viewer.innerHTML = renderMarkdownSafe(tmpl ? tmpl.content : editor.value)
  viewer.style.display = showViewer ? '' : 'none'
  editor.style.display = showViewer ? 'none' : ''

  // Ohne Schreibrecht gibt es nichts zu speichern und nichts umzuschalten.
  if (save) save.style.display = canEdit ? '' : 'none'
  if (prev) prev.style.display = canEdit ? '' : 'none'
  if (label) label.textContent = _tmplPreviewOn ? t('tmpl_edit') : t('tmpl_preview')
  document.querySelectorAll('#inputTitle, #inputNextReview').forEach(el => { el.readOnly = !canEdit })
}

// ── #61: PDF-Ausgabe fuer Richtlinien ────────────────────────────────────────
//
// Bisher gab es PDF fuer Reports, Findings und Guidance — ausgerechnet fuer die
// Richtlinien selbst nicht. Aufbau wie _printGuidanceDocs: eigenes Fenster,
// Druckdialog, keine Abhaengigkeit.

/** Dateiname nach Muster: Titel_vVERSION_STATUS_JJJJ-MM-TT */
function templateFileName(tmpl) {
  const clean = String(tmpl.title || 'document')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'document'
  const version = tmpl.version ? `_v${tmpl.version}` : ''
  const status  = tmpl.status ? `_${tmpl.status}` : ''
  return `${clean}${version}${status}_${new Date().toISOString().slice(0, 10)}`
}

function printCurrentTemplate() {
  if (!currentTemplate) return
  _printTemplates([currentTemplate], templateFileName(currentTemplate))
}

/**
 * Druckfenster fuer eine oder mehrere Richtlinien.
 * `name` wird als Fenster- und Dokumenttitel gesetzt — die meisten Browser
 * uebernehmen ihn als Vorschlag fuer den Dateinamen beim "Als PDF speichern".
 */
function _printTemplates(docs, name) {
  if (!docs || !docs.length) return alert(t('tmpl_noneToPrint'))

  const body = docs.map(d => `
    <section class="doc-section">
      <h1 class="doc-title">${escHtml(d.title || '')}</h1>
      <div class="doc-meta">
        ${escHtml(t('col_type'))}: ${escHtml(d.type || '—')} ·
        ${escHtml(t('col_status'))}: ${escHtml(d.status || '—')}
        ${d.version ? ` · ${escHtml(t('tmpl_version'))}: ${escHtml(String(d.version))}` : ''}
        ${d.owner ? ` · ${escHtml(t('col_owner'))}: ${escHtml(d.owner)}` : ''}
        ${d.nextReviewDate ? ` · ${escHtml(t('tmpl_nextReview'))} ${escHtml(String(d.nextReviewDate).slice(0, 10))}` : ''}
      </div>
      <div class="doc-body">${renderMarkdownSafe(d.content)}</div>
    </section>`).join('<div class="page-break"></div>')

  const win = window.open('', '_blank')
  if (!win) return alert(t('err_popupBlocked'))
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${escHtml(name || 'documents')}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; max-width: 900px; }
      h1.doc-title { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 6px; margin: 0 0 4px; }
      .doc-meta { font-size: 10.5px; color: #666; margin-bottom: 14px; }
      h1,h2,h3 { margin-top: 1.2em; } h2 { font-size: 15px; } h3 { font-size: 13px; }
      table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 11px; }
      th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
      th { background: #f0f0f0; font-weight: bold; }
      pre, code { background: #f5f5f5; padding: 2px 4px; font-size: 11px; border-radius: 3px; }
      pre { padding: 8px; white-space: pre-wrap; word-break: break-all; }
      .page-break { page-break-after: always; }
      .doc-section { margin-bottom: 24px; }
      .print-foot { font-size: 10px; color: #999; margin-top: 20px; }
      @media print { body { margin: 0; } .print-foot { position: fixed; bottom: 0; } }
    </style></head><body>
    ${body}
    <div class="print-foot">ISMS Builder · ${escHtml(name || '')} · ${new Date().toLocaleDateString()}</div>
    <script>window.onload = () => { window.print() }<\/script>
  </body></html>`)
  win.document.close()
}

/** Vom Export-Knopf im Listen-Panel: aktiver Typ + gewaehlter Status. */
function exportTemplateSet() {
  const status = dom('tmplExportStatus')?.value || ''
  printTemplateSet(_activeTemplateType, status)
}

/** Sammelausgabe: alle Dokumente eines Typs, gefiltert nach Status. */
async function printTemplateSet(type, status) {
  const res = await fetch('/templates', { headers: apiHeaders('reader') })
  if (!res.ok) return alert(t('err_load'))
  const all = await res.json()
  let docs = all.filter(d => !type || d.type === type)
  if (status) docs = docs.filter(d => d.status === status)
  if (!docs.length) return alert(t('tmpl_noneToPrint'))

  // Volltext nachladen: die Uebersicht liefert nicht immer den Inhalt mit.
  const full = []
  for (const d of docs) {
    const r = await fetch(`/template/${encodeURIComponent(d.type)}/${encodeURIComponent(d.id)}`,
      { headers: apiHeaders('reader') })
    full.push(r.ok ? await r.json() : d)
  }
  const label = [type || t('filter_allTypes'), status || t('filter_allStatus')].join('_')
  _printTemplates(full, `ISMS_${label}_${new Date().toISOString().slice(0, 10)}`)
}

function toggleTemplatePreview() {
  _tmplPreviewOn = !_tmplPreviewOn
  applyTemplateViewMode(currentTemplate)
}

async function renderBreadcrumb(t) {
  const nav = dom('breadcrumb')
  if (!nav) return
  try {
    const res = await fetch(`/template/${encodeURIComponent(t.type)}/${encodeURIComponent(t.id)}`, { headers: apiHeaders('reader') })
    if (!res.ok) { nav.style.display = 'none'; return }
    const full = await res.json()
    // Build breadcrumb from parentId chain via flat fetch
    const crumbs = await buildBreadcrumbChain(full)
    if (crumbs.length <= 1) { nav.style.display = 'none'; return }
    nav.style.display = 'flex'
    nav.innerHTML = crumbs.map((c, i) => {
      if (i === crumbs.length - 1) return `<span class="tmpl-breadcrumb-current">${c.title}</span>`
      return `<span class="tmpl-breadcrumb-item" onclick="loadTemplateById('${c.type}','${c.id}')">${c.title}</span><span class="tmpl-breadcrumb-sep">›</span>`
    }).join('')
  } catch { nav.style.display = 'none' }
}

async function buildBreadcrumbChain(t) {
  const chain = [{ id: t.id, title: t.title, type: t.type }]
  const visited = new Set([t.id])
  let pid = t.parentId || null
  while (pid) {
    if (visited.has(pid)) break
    visited.add(pid)
    try {
      const ptype = pid.split('_')[0]
      const res = await fetch(`/template/${encodeURIComponent(ptype)}/${encodeURIComponent(pid)}`, { headers: apiHeaders('reader') })
      if (!res.ok) break
      const parent = await res.json()
      chain.unshift({ id: parent.id, title: parent.title, type: parent.type })
      pid = parent.parentId || null
    } catch { break }
  }
  return chain
}

async function loadTemplateById(type, id) {
  const res = await fetch(`/template/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { headers: apiHeaders('reader') })
  if (!res.ok) return
  const t = await res.json()
  loadTemplate(t)
}

function renderAttachmentsBar(t) {
  const bar = dom('tmplAttachmentsBar')
  if (!bar) return
  const atts = t.attachments || []
  const rank = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.editor

  bar.style.display = 'flex'
  bar.innerHTML = `<span class="tmpl-att-label"><i class="ph ph-paperclip"></i> Attachments:</span>` +
    atts.map(a => {
      const sizeKB = Math.round((a.size || 0) / 1024)
      return `<span class="tmpl-att-chip">
        <a href="/template/${t.type}/${t.id}/attachments/${a.id}/file" target="_blank" title="${a.originalName}">${a.originalName}</a>
        <span class="tmpl-att-size">(${sizeKB} KB)</span>
        ${canEdit ? `<button class="tmpl-att-del" title="Delete" onclick="deleteAttachment('${t.type}','${t.id}','${a.id}')"><i class="ph ph-x"></i></button>` : ''}
      </span>`
    }).join('') +
    (canEdit ? `<button class="btn btn-secondary btn-sm tmpl-att-upload-btn" onclick="triggerAttachUpload()"><i class="ph ph-upload-simple"></i> Attach</button>
      <input type="file" id="attachFileInput" style="display:none" accept=".pdf,.docx,.doc,.xlsx,.pptx,.png,.jpg" onchange="uploadAttachment(this)" />` : '')
}

function triggerAttachUpload() {
  const input = dom('attachFileInput')
  if (input) input.click()
}

async function uploadAttachment(input) {
  if (!currentTemplate || !input.files[0]) return
  const file = input.files[0]
  const fd = new FormData()
  fd.append('file', file)
  // Multer-Upload: kein Content-Type Header setzen (Browser setzt multipart boundary automatisch)
  const res = await fetch(`/template/${currentTemplate.type}/${currentTemplate.id}/attachments`, {
    method: 'POST',
    headers: { 'X-User-Name': getCurrentUser(), 'X-User-Role': 'editor' },
    body: fd
  })
  input.value = ''
  if (res.ok) {
    const t = await fetch(`/template/${encodeURIComponent(currentTemplate.type)}/${encodeURIComponent(currentTemplate.id)}`, { headers: apiHeaders('reader') }).then(r => r.json())
    currentTemplate = t
    renderAttachmentsBar(t)
  } else {
    const err = await res.json().catch(() => ({}))
    alert('Upload failed: ' + (err.error || res.status))
  }
}

async function deleteAttachment(type, id, attId) {
  if (!confirm('Delete attachment?')) return
  const res = await fetch(`/template/${type}/${id}/attachments/${attId}`, {
    method: 'DELETE',
    headers: apiHeaders('editor')
  })
  if (res.ok) {
    const t = await fetch(`/template/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, { headers: apiHeaders('reader') }).then(r => r.json())
    currentTemplate = t
    renderAttachmentsBar(t)
  }
}

// ── Generischer Dokument-Anhang-Panel (Governance + BCM) ────────────────────
// Verwendung: renderDocAttachPanel(containerId, apiBase, collection, itemId, attachments, canEdit)
// apiBase: '/governance' oder '/bcm'
// collection: 'reviews'|'actions'|'meetings'|'bia'|'plans'|'exercises'
function renderDocAttachPanel(containerId, apiBase, collection, itemId, attachments, canEdit) {
  const el = document.getElementById(containerId)
  if (!el) return
  const atts = attachments || []
  const ext2icon = { pdf: 'ph-file-pdf', docx: 'ph-file-doc', doc: 'ph-file-doc', xlsx: 'ph-file-xls', pptx: 'ph-file-ppt' }
  el.innerHTML = `
    <div class="doc-attach-panel">
      <div class="doc-attach-header">
        <span><i class="ph ph-paperclip"></i> Documents & Attachments</span>
        ${canEdit ? `<label class="btn btn-secondary btn-sm" style="cursor:pointer">
          <i class="ph ph-upload-simple"></i> Upload
          <input type="file" style="display:none" accept=".pdf,.docx,.doc,.xlsx,.pptx"
            onchange="uploadDocAttachment(this,'${apiBase}','${collection}','${itemId}','${containerId}')">
        </label>` : ''}
      </div>
      ${atts.length === 0
        ? `<p class="doc-attach-empty">No documents uploaded yet.</p>`
        : atts.map(a => {
            const ext = (a.filename || '').split('.').pop().toLowerCase()
            const icon = ext2icon[ext] || 'ph-file'
            const kb = Math.round((a.size || 0) / 1024)
            const date = a.uploadedAt ? new Date(a.uploadedAt).toLocaleDateString('en-GB') : ''
            return `<div class="doc-attach-item">
              <i class="ph ${icon}" style="font-size:1.1rem;color:var(--text-subtle)"></i>
              <div class="doc-attach-info">
                <a href="${apiBase}/${collection}/${itemId}/files/${a.id}" target="_blank"
                   class="doc-attach-name">${escHtml(a.filename)}</a>
                <span class="doc-attach-meta">${kb} KB · ${escHtml(a.uploadedBy || '')} · ${date}</span>
              </div>
              ${canEdit ? `<button class="btn-icon-sm" title="Delete"
                onclick="deleteDocAttachment('${apiBase}','${collection}','${itemId}','${a.id}','${containerId}')">
                <i class="ph ph-trash"></i></button>` : ''}
            </div>`
          }).join('')
      }
    </div>`
}

async function uploadDocAttachment(input, apiBase, collection, itemId, containerId) {
  if (!input.files[0]) return
  const fd = new FormData()
  fd.append('file', input.files[0])
  input.value = ''
  const hdr = {}
  if (getCurrentUser()) hdr['X-User-Name'] = getCurrentUser()
  if (getCurrentRole()) hdr['X-User-Role'] = getCurrentRole()
  // Cookie wird automatisch mitgeschickt
  const res = await fetch(`${apiBase}/${collection}/${itemId}/upload`, { method: 'POST', headers: hdr, body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    alert('Upload failed: ' + (err.error || res.status))
    return
  }
  // Item neu laden und Panel aktualisieren
  _refreshDocAttachPanel(apiBase, collection, itemId, containerId)
}

async function deleteDocAttachment(apiBase, collection, itemId, fileId, containerId) {
  if (!confirm('Delete attachment?')) return
  const res = await fetch(`${apiBase}/${collection}/${itemId}/files/${fileId}`, {
    method: 'DELETE', headers: apiHeaders('editor')
  })
  if (res.ok) _refreshDocAttachPanel(apiBase, collection, itemId, containerId)
  else alert('Delete failed')
}

async function _refreshDocAttachPanel(apiBase, collection, itemId, containerId) {
  const res = await fetch(`${apiBase}/${collection}/${itemId}`, { headers: apiHeaders() })
  if (!res.ok) return
  const item = await res.json()
  const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.editor
  renderDocAttachPanel(containerId, apiBase, collection, itemId, item.attachments || [], canEdit)
}

// ── Control-Picker ──────────────────────────────────────────────────
let _pickerAllControls = []
let _pickerSelectedFw = null
let _pickerChecked = new Set()

function renderTmplControlsBar(t) {
  const bar = dom('tmplControlsBar')
  if (!bar) return
  const linked = t.linkedControls || []
  if (linked.length === 0) {
    bar.style.display = 'none'
    bar.innerHTML = ''
    return
  }
  bar.style.display = 'flex'
  bar.innerHTML = `<span class="tmpl-bar-label"><i class="ph ph-link"></i> Linked Controls:</span>` +
    linked.map(cid => `<span class="tmpl-bar-pill">${cid}</span>`).join('') +
    `<button class="tmpl-bar-edit btn btn-secondary btn-sm" onclick="openControlPicker()"><i class="ph ph-pencil"></i></button>`
}

function renderTmplEntityBar(t) {
  const bar = dom('tmplEntityBar')
  if (!bar) return
  const ents = t.applicableEntities || []
  if (ents.length === 0) {
    bar.style.display = 'none'
    bar.innerHTML = ''
    return
  }
  bar.style.display = 'flex'
  bar.innerHTML = `<span class="tmpl-bar-label"><i class="ph ph-buildings"></i> Applies to:</span>` +
    ents.map(eid => `<span class="tmpl-bar-pill">${eid}</span>`).join('')
}

async function openControlPicker() {
  if (!currentTemplate) return alert('Please select a document first.')
  const modal = dom('controlPickerModal')
  if (!modal) return

  // Daten laden
  if (_pickerAllControls.length === 0) {
    const res = await fetch('/soa', { headers: apiHeaders('reader') })
    _pickerAllControls = await res.json()
  }

  _pickerChecked = new Set(currentTemplate.linkedControls || [])
  _pickerSelectedFw = null

  // Framework-Tabs
  const fwSet = [...new Set(_pickerAllControls.map(c => c.framework))]
  const fwTabsEl = dom('controlPickerFwTabs')
  fwTabsEl.innerHTML = `<button class="picker-fw-tab${_pickerSelectedFw === null ? ' active' : ''}" onclick="setPickerFw(null)">All</button>` +
    fwSet.map(fw => `<button class="picker-fw-tab" onclick="setPickerFw('${fw}')">${fw}</button>`).join('')

  renderPickerList()
  updatePickerCount()
  modal.style.visibility = 'visible'
}

function closeControlPicker() {
  const modal = dom('controlPickerModal')
  if (modal) modal.style.visibility = 'hidden'
}

function setPickerFw(fw) {
  _pickerSelectedFw = fw
  dom('controlPickerFwTabs').querySelectorAll('.picker-fw-tab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === (fw || 'All'))
  })
  renderPickerList()
}

function filterControlPicker() {
  renderPickerList()
}

function renderPickerList() {
  const query = (dom('controlPickerSearch')?.value || '').toLowerCase()
  let controls = _pickerAllControls
  if (_pickerSelectedFw) controls = controls.filter(c => c.framework === _pickerSelectedFw)
  if (query) controls = controls.filter(c =>
    c.id.toLowerCase().includes(query) || c.title.toLowerCase().includes(query)
  )
  const list = dom('controlPickerList')
  if (!list) return
  if (controls.length === 0) {
    list.innerHTML = '<p class="picker-empty">No controls found.</p>'
    return
  }
  list.innerHTML = controls.map(c => {
    const checked = _pickerChecked.has(c.id)
    return `<label class="picker-row${checked ? ' checked' : ''}">
      <input type="checkbox" ${checked ? 'checked' : ''} onchange="togglePickerControl('${c.id}', this.checked)" />
      <span class="picker-id">${c.id}</span>
      <span class="picker-title">${c.title}</span>
    </label>`
  }).join('')
}

function togglePickerControl(id, checked) {
  if (checked) _pickerChecked.add(id)
  else _pickerChecked.delete(id)
  updatePickerCount()
  // Update row highlight
  const rows = dom('controlPickerList')?.querySelectorAll('.picker-row') || []
  rows.forEach(row => {
    const cb = row.querySelector('input[type=checkbox]')
    if (cb) row.classList.toggle('checked', cb.checked)
  })
}

function updatePickerCount() {
  const el = dom('controlPickerCount')
  if (el) el.textContent = `${_pickerChecked.size} controls selected`
}

async function saveControlPicker() {
  if (!currentTemplate) return
  const linkedControls = [..._pickerChecked]
  const res = await fetch(`/template/${currentTemplate.type}/${currentTemplate.id}`, {
    method: 'PUT',
    headers: apiHeaders('editor'),
    body: JSON.stringify({ linkedControls })
  })
  if (!res.ok) { alert('Error saving.'); return }
  const updated = await res.json()
  currentTemplate = updated
  renderTmplControlsBar(updated)
  closeControlPicker()
}

// ── Entity-Picker (gemeinsam für Template + SoA) ────────────────────
let _entityCache = []
let _entityPickerCallback = null
let _entityPickerSelected = new Set()

async function _ensureEntityCache() {
  if (_entityCache.length === 0) {
    const res = await fetch('/entities', { headers: apiHeaders('reader') })
    if (res.ok) _entityCache = await res.json()
  }
}

async function openEntityPickerForTemplate() {
  if (!currentTemplate) return alert('Please select a document first.')
  await _ensureEntityCache()
  _entityPickerSelected = new Set(currentTemplate.applicableEntities || [])
  _entityPickerCallback = async (selected) => {
    const applicableEntities = [...selected]
    const res = await fetch(`/template/${currentTemplate.type}/${currentTemplate.id}`, {
      method: 'PUT',
      headers: apiHeaders('editor'),
      body: JSON.stringify({ applicableEntities })
    })
    if (!res.ok) { alert('Error saving.'); return }
    const updated = await res.json()
    currentTemplate = updated
    renderTmplEntityBar(updated)
  }
  _renderEntityPickerModal()
}

async function openEntityPickerForSoa(controlId, control, detailEl, tableContainer) {
  await _ensureEntityCache()
  _entityPickerSelected = new Set(control.applicableEntities || [])
  _entityPickerCallback = async (selected) => {
    const applicableEntities = [...selected]
    const ctrl = soaData.find(c => c.id === controlId) || {}
    const res = await fetch(`/soa/${encodeURIComponent(controlId)}`, {
      method: 'PUT',
      headers: apiHeaders('editor'),
      body: JSON.stringify({
        applicable: ctrl.applicable ?? true,
        status: ctrl.status || 'not_started',
        owner: ctrl.owner || '',
        justification: ctrl.justification || '',
        linkedTemplates: ctrl.linkedTemplates || [],
        applicableEntities
      })
    })
    if (!res.ok) { alert('Error saving.'); return }
    const updated = await res.json()
    const idx = soaData.findIndex(c => c.id === controlId)
    if (idx >= 0) soaData[idx] = updated
    // Detail in-place neu rendern
    const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK['editor']
    const [crossRes, tmplRes] = await Promise.all([
      fetch(`/soa/${encodeURIComponent(controlId)}/crossmap`, { headers: apiHeaders('reader') }),
      fetch('/templates', { headers: apiHeaders('reader') })
    ])
    const crossGroups = crossRes.ok ? await crossRes.json() : []
    const allTemplates = tmplRes.ok ? await tmplRes.json() : []
    renderSoaDetail(detailEl, controlId, crossGroups, allTemplates, updated, canEdit, tableContainer)
  }
  _renderEntityPickerModal()
}

function _renderEntityPickerModal() {
  // Inline-Modal: Entity-Auswahl als Overlay
  let overlay = document.getElementById('entityPickerOverlay')
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = 'entityPickerOverlay'
    overlay.className = 'modal'
    overlay.style.visibility = 'hidden'
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title"><i class="ph ph-buildings"></i> Applicable Entities</h3>
          <button class="modal-close" onclick="closeEntityPicker()"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body">
          <p class="modal-hint">Leave empty = applies to all entities.</p>
          <div id="entityPickerList" class="picker-list"></div>
        </div>
        <div class="modal-footer">
          <span id="entityPickerCount" class="picker-count"></span>
          <button class="btn btn-secondary" onclick="closeEntityPicker()">Cancel</button>
          <button class="btn btn-primary" onclick="saveEntityPicker()"><i class="ph ph-floppy-disk"></i> Save</button>
        </div>
      </div>`
    document.body.appendChild(overlay)
  }

  const list = document.getElementById('entityPickerList')
  list.innerHTML = _entityCache.map(e => {
    const checked = _entityPickerSelected.has(e.id)
    return `<label class="picker-row${checked ? ' checked' : ''}">
      <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleEntityPicker('${e.id}', this.checked)" />
      <span class="picker-id">${e.shortCode || e.id}</span>
      <span class="picker-title">${e.name}</span>
    </label>`
  }).join('')

  _updateEntityPickerCount()
  overlay.style.visibility = 'visible'
}

function toggleEntityPicker(id, checked) {
  if (checked) _entityPickerSelected.add(id)
  else _entityPickerSelected.delete(id)
  _updateEntityPickerCount()
  document.querySelectorAll('#entityPickerList .picker-row').forEach(row => {
    const cb = row.querySelector('input[type=checkbox]')
    if (cb) row.classList.toggle('checked', cb.checked)
  })
}

function _updateEntityPickerCount() {
  const el = document.getElementById('entityPickerCount')
  if (el) {
    const n = _entityPickerSelected.size
    el.textContent = n === 0 ? 'All entities' : `${n} selected`
  }
}

async function saveEntityPicker() {
  if (_entityPickerCallback) await _entityPickerCallback(_entityPickerSelected)
  closeEntityPicker()
}

function closeEntityPicker() {
  const overlay = document.getElementById('entityPickerOverlay')
  if (overlay) overlay.style.visibility = 'hidden'
}

function clearEditor(){
  dom('inputTitle').value = ''
  dom('contentEditor').value = ''
  updateStatusBadge('draft')
  dom('ownerInfo').textContent = ''
  renderLifecycleActions(null)
  const cb = dom('tmplControlsBar'); if (cb) { cb.style.display = 'none'; cb.innerHTML = '' }
  const eb = dom('tmplEntityBar');   if (eb) { eb.style.display = 'none'; eb.innerHTML = '' }
}

function loadTemplateHistory(type, id) {
  return fetch(`/template/${type}/${id}/history`, { headers: apiHeaders('reader') }).then(r => r.json())
}

function showHistory(){
  if (!currentTemplate) return alert('Please select a document first.')
  loadTemplateHistory(currentTemplate.type, currentTemplate.id).then(hist => {
    const lines = hist.map(h => `Version ${h.version} - ${new Date(h.updatedAt).toLocaleString()}`).join('\n')
    alert(`History:\n${lines}`)
  })
}

function updateReviewHint(dateStr) {
  const hint = dom('inputNextReviewHint')
  if (!hint) return
  if (!dateStr) { hint.textContent = ''; hint.className = 'tmpl-review-hint'; return }
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  if (diff < 0)        { hint.textContent = `Overdue (${Math.abs(diff)} days)`;  hint.className = 'tmpl-review-hint overdue' }
  else if (diff === 0) { hint.textContent = 'Due today';                           hint.className = 'tmpl-review-hint due-today' }
  else if (diff <= 30) { hint.textContent = `In ${diff} days`;                    hint.className = 'tmpl-review-hint due-soon' }
  else                 { hint.textContent = `In ${diff} days`;                    hint.className = 'tmpl-review-hint' }
}

function saveCurrent(){
  const title = dom('inputTitle').value.trim()
  const content = dom('contentEditor').value
  const nextReviewDate = dom('inputNextReview')?.value || null
  if (!title) {
    alert('Title is required')
    return
  }
  if (currentTemplate) {
    // update existing
    fetch(`/template/${currentTemplate.type}/${currentTemplate.id}`, {
      method: 'PUT',
      headers: apiHeaders('editor'),
      body: JSON.stringify({ title, content, nextReviewDate: nextReviewDate || null })
    }).then(res=>res.json()).then(t => {
      currentTemplate = t
      updateReviewHint(t.nextReviewDate)
      alert('Dokument aktualisiert (Version '+t.version+')')
    })
  } else {
    // create new with default type as currentType
  fetch(`/template`, {
    method: 'POST',
    headers: apiHeaders('contentowner'),
    body: JSON.stringify({ type: currentType, language: 'de', title, content })
  }).then(res=>res.json()).then(t => {
      currentTemplate = t
      // reopen list
      selectType(currentType)
      alert('Dokument erstellt (Version '+t.version+')')
    })
  }
}

function openModal(opts = {}){
  const modal = document.getElementById('modal')
  const select = document.getElementById('newType')
  select.innerHTML = ''
  TYPES.forEach(t => {
    const opt = document.createElement('option')
    opt.value = t
    opt.text = t
    select.appendChild(opt)
  })
  document.getElementById('newTitle').value = ''
  const parentIdEl = document.getElementById('newParentId')
  const hintEl = document.getElementById('modalParentHint')
  const titleEl = document.getElementById('modalTitle')
  if (opts.parentId && opts.parentTitle) {
    if (parentIdEl) parentIdEl.value = opts.parentId
    if (opts.parentType) select.value = opts.parentType
    select.disabled = true
    if (hintEl) { hintEl.textContent = t('tmpl_subpageOf').replace('{title}', opts.parentTitle); hintEl.style.display = '' }
    if (titleEl) titleEl.textContent = t('tmpl_createChildPage')
  } else {
    if (parentIdEl) parentIdEl.value = ''
    select.disabled = false
    if (hintEl) hintEl.style.display = 'none'
    if (titleEl) titleEl.textContent = t('tmpl_createNew')
  }
  modal.style.visibility = 'visible'
}

function openChildPageModal() {
  if (!currentTemplate) return
  openModal({ parentId: currentTemplate.id, parentTitle: currentTemplate.title, parentType: currentTemplate.type })
}

// ── Verschieben-Dialog ──────────────────────────────────────────────
async function openMoveDialog() {
  if (!currentTemplate) return
  const type = currentTemplate.type
  const selfId = currentTemplate.id

  // Alle Descendants des aktuellen Templates ermitteln (dürfen nicht als Ziel auftauchen)
  const treeRes = await fetch(`/templates/tree?type=${encodeURIComponent(type)}&language=de`, { headers: apiHeaders('reader') })
  const treeData = treeRes.ok ? await treeRes.json() : []

  function collectDescendants(nodes, targetId, found = new Set()) {
    for (const n of nodes) {
      if (n.id === targetId || found.has(targetId)) {
        found.add(n.id)
        collectDescendants(n.children || [], n.id, found)
      } else {
        collectDescendants(n.children || [], targetId, found)
      }
    }
    return found
  }
  // Start with self included so it's excluded as target
  const excluded = new Set([selfId])
  collectDescendants(treeData, selfId, excluded)

  let selectedParentId = currentTemplate.parentId || null // vorausgewählt

  const overlay = document.createElement('div')
  overlay.className = 'move-dialog-overlay'

  function buildTreeItems(nodes, depth = 0) {
    let html = ''
    for (const n of nodes) {
      const isExcluded = excluded.has(n.id)
      const isSelected = n.id === selectedParentId
      html += `<div class="move-tree-item${isExcluded ? ' disabled' : ''}${isSelected ? ' selected' : ''}"
                  data-id="${n.id}" style="padding-left:${8 + depth * 18}px">
        <i class="ph ph-file-text" style="flex-shrink:0;font-size:.85rem"></i>
        <span>${escHtml(n.title)}</span>
      </div>`
      if (n.children?.length) html += buildTreeItems(n.children, depth + 1)
    }
    return html
  }

  function render() {
    const currentLabel = selectedParentId
      ? (() => { let t = null; function find(ns) { for (const n of ns) { if (n.id === selectedParentId) { t=n; return } find(n.children||[]) } }; find(treeData); return t?.title || selectedParentId })()
      : 'Root-Ebene'
    overlay.innerHTML = `
      <div class="move-dialog">
        <h3><i class="ph ph-arrows-out-cardinal"></i> Seite verschieben</h3>
        <div style="font-size:0.82rem;color:var(--text-subtle)">
          <strong>${escHtml(currentTemplate.title)}</strong> verschieben nach:
        </div>
        <div class="move-dialog-tree" id="moveTreeContent">
          <div class="move-tree-item${selectedParentId === null ? ' selected' : ''}" data-id="__root__">
            <i class="ph ph-house" style="flex-shrink:0;font-size:.85rem"></i>
            <span>Root-Ebene (kein Parent)</span>
          </div>
          ${buildTreeItems(treeData)}
        </div>
        <div class="move-dialog-actions">
          <button class="btn btn-secondary" id="moveDlgCancel">Cancel</button>
          <button class="btn btn-primary" id="moveDlgOk"><i class="ph ph-check"></i> Move</button>
        </div>
      </div>`

    overlay.querySelector('#moveDlgCancel').onclick = () => overlay.remove()
    overlay.querySelector('#moveDlgOk').onclick = () => {
      overlay.remove()
      _moveNodeTo(selfId, type, selectedParentId)
    }
    overlay.querySelectorAll('.move-tree-item:not(.disabled)').forEach(el => {
      el.onclick = () => {
        selectedParentId = el.dataset.id === '__root__' ? null : el.dataset.id
        render()
      }
    })
  }

  render()
  document.body.appendChild(overlay)
}

function closeModal(){
  const modal = document.getElementById('modal')
  modal.style.visibility = 'hidden'
  const select = document.getElementById('newType')
  if (select) select.disabled = false
}

function createFromModal(){
  const typeVal = document.getElementById('newType').value
  const titleVal = document.getElementById('newTitle').value.trim()
  const parentIdEl = document.getElementById('newParentId')
  const parentId = parentIdEl ? (parentIdEl.value || null) : null
  if (!titleVal) { alert('Title is required'); return }
  fetch('/template', {
    method: 'POST',
    headers: apiHeaders('contentowner'),
    body: JSON.stringify({ type: typeVal, language: 'de', title: titleVal, content: '', parentId })
  }).then(res=>res.json()).then(t => {
    closeModal()
    selectType(typeVal)
    setTimeout(() => loadTemplate(t), 300)
  })
}

// ════════════════════════════════════════════════════════════
// GUIDANCE – Dokumenten-Management
// ════════════════════════════════════════════════════════════

const GUIDANCE_CATS = [
  { id: 'systemhandbuch',  get label() { return t('guidance_catSystemhandbuch') }, icon: 'ph-book-open' },
  { id: 'rollen',          get label() { return t('guidance_catRollen') },         icon: 'ph-users-three' },
  { id: 'policy-prozesse', get label() { return t('guidance_catPolicyProzesse') }, icon: 'ph-flow-arrow' },
  { id: 'soa-audit',       get label() { return t('guidance_catSoaAudit') },       icon: 'ph-shield-check' },
  { id: 'admin-intern',    get label() { return t('guidance_catAdminIntern') },    icon: 'ph-lock-key',   minRole: 'admin' },
]

let _guidanceDocs  = []
let _guidanceCat   = 'systemhandbuch'
let _guidanceDocId = null
let _guidanceSearchTimer = null

async function renderGuidance() {
  removeGuidance()

  const editor = dom('editor')
  const container = document.createElement('div')
  container.id = 'guidanceContainer'
  editor.appendChild(container)

  const role = getCurrentRole()
  const canEdit = (ROLE_RANK[role] || 0) >= ROLE_RANK.contentowner
  const canDel  = (ROLE_RANK[role] || 0) >= ROLE_RANK.admin

  container.innerHTML = `
    <div class="guidance-header">
      <h2><i class="ph ph-compass"></i> ${t('guidance_pageTitle')}</h2>
      <div class="guidance-header-actions" id="guidanceHeaderActions">
        <div class="guidance-search-wrap">
          <i class="ph ph-magnifying-glass guidance-search-icon"></i>
          <input id="guidanceSearchInput" class="guidance-search-input" type="search"
            placeholder="${t('guidance_searchPh')}"
            oninput="onGuidanceSearchInput(this.value)"
            onkeydown="if(event.key==='Escape'){this.value='';onGuidanceSearchInput('')}" />
        </div>
        ${canEdit ? `
          <button class="btn btn-secondary btn-sm" onclick="openGuidanceEditor()">
            <i class="ph ph-plus"></i> ${t('guidance_new')}
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openGuidanceUpload()">
            <i class="ph ph-upload-simple"></i> ${t('guidance_upload')}
          </button>
        ` : ''}
      </div>
    </div>
    <div class="guidance-cat-tabs" id="guidanceCatTabs">
      ${GUIDANCE_CATS.filter(c => !c.minRole || (ROLE_RANK[getCurrentRole()] || 0) >= (ROLE_RANK[c.minRole] || 0)).map(c => `
        <button class="guidance-cat-tab ${c.id === _guidanceCat ? 'active' : ''}"
          data-cat="${c.id}" onclick="switchGuidanceCat('${c.id}')">
          <i class="ph ${c.icon}"></i> ${c.label}
        </button>
      `).join('')}
      <button class="btn btn-secondary btn-sm" style="margin-left:auto" onclick="printGuidanceCategory()" title="${t('guidance_printCategoryTitle')}">
        <i class="ph ph-printer"></i> ${t('guidance_printAll')}
      </button>
    </div>
    <div class="guidance-body">
      <div class="guidance-list-col">
        <div class="guidance-list-header">
          <span>${t('guidance_documents')}</span>
        </div>
        <ul class="guidance-doc-list" id="guidanceDocList"></ul>
      </div>
      <div class="guidance-viewer-col" id="guidanceViewerCol">
        <div class="guidance-empty">
          <i class="ph ph-file-text"></i>
          <span>${t('guidance_selectDoc')}</span>
        </div>
      </div>
    </div>
  `

  await loadGuidanceDocs()
}

async function loadGuidanceDocs() {
  const res = await fetch(`/guidance?category=${_guidanceCat}&lang=${window.LANG||'en'}`, { headers: apiHeaders() })
  _guidanceDocs = res.ok ? await res.json() : []
  renderGuidanceList()
  // Re-select current doc if still exists
  if (_guidanceDocId) {
    const still = _guidanceDocs.find(d => d.id === _guidanceDocId)
    if (still) { renderGuidanceDoc(still); return }
    _guidanceDocId = null
  }
  if (_guidanceDocs.length > 0) renderGuidanceDoc(_guidanceDocs[0])
  else renderGuidanceEmpty()
}

function renderGuidanceList() {
  const ul = dom('guidanceDocList')
  if (!ul) return
  if (_guidanceDocs.length === 0) {
    ul.innerHTML = `<li style="padding:12px;color:var(--text-subtle);font-size:13px;">${t('guidance_noDocuments')}</li>`
    return
  }
  ul.innerHTML = _guidanceDocs.map(d => {
    const icon = d.type === 'pdf' ? 'ph-file-pdf' : d.type === 'docx' ? 'ph-file-doc' : 'ph-file-text'
    const active = d.id === _guidanceDocId ? 'active' : ''
    return `
      <li class="guidance-doc-item ${active}" data-id="${d.id}" onclick="renderGuidanceDoc(${JSON.stringify(d).replace(/"/g,'&quot;')})">
        <i class="ph ${icon} guidance-doc-icon"></i>
        <span class="guidance-doc-title">${escHtml(d.title)}</span>
      </li>
    `
  }).join('')
}

function renderGuidanceEmpty() {
  const col = dom('guidanceViewerCol')
  if (!col) return
  col.innerHTML = `<div class="guidance-empty"><i class="ph ph-file-text"></i><span>${t('guidance_selectDoc')}</span></div>`
}

function renderGuidanceDoc(doc) {
  _guidanceDocId = doc.id
  renderGuidanceList()

  const role = getCurrentRole()
  const canEdit = (ROLE_RANK[role] || 0) >= ROLE_RANK.contentowner
  const canDel  = (ROLE_RANK[role] || 0) >= ROLE_RANK.admin

  const col = dom('guidanceViewerCol')
  if (!col) return

  let bodyHtml = ''
  if (doc.type === 'markdown' || doc.type === 'html') {
    const rendered = (typeof marked !== 'undefined')
      ? marked.parse(doc.content || '')
      : `<pre>${escHtml(doc.content || '')}</pre>`
    bodyHtml = `<div class="guidance-md">${rendered}</div>`
  } else if (doc.type === 'pdf') {
    bodyHtml = `<embed src="/guidance/${doc.id}/file" type="application/pdf"
      style="width:100%;height:100%;min-height:600px;border:none;" />`
  } else {
    bodyHtml = `
      <div class="guidance-download-hint">
        <i class="ph ph-file-doc"></i>
        <span>${escHtml(doc.filename || t('guidance_documentFallback'))}</span>
        <a href="/guidance/${doc.id}/file" class="btn btn-primary" download="${escHtml(doc.filename || 'document')}">
          <i class="ph ph-download-simple"></i> ${t('guidance_download')}
        </a>
      </div>`
  }

  col.innerHTML = `
    <div class="guidance-viewer-toolbar">
      <span class="guidance-viewer-title">${escHtml(doc.title)}</span>
      <span class="badge" style="background:var(--surface-raised);color:var(--text-subtle);font-size:11px;">
        v${doc.version || 1}
      </span>
      ${doc.type === 'markdown' || doc.type === 'html' ? `
        <button class="btn btn-secondary btn-sm" onclick="printGuidanceDoc('${doc.id}')" title="${t('guidance_printDocTitle')}">
          <i class="ph ph-file-pdf"></i> PDF
        </button>` : ''}
      ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="openGuidanceEditor('${doc.id}')">
        <i class="ph ph-pencil"></i> ${t('edit')}
      </button>` : ''}
      ${canDel ? `<button class="btn btn-sm" style="color:var(--danger-text);" onclick="deleteGuidanceDoc('${doc.id}')">
        <i class="ph ph-trash"></i>
      </button>` : ''}
    </div>
    <div class="guidance-viewer-body">${bodyHtml}</div>
  `
}

function printGuidanceDoc(docId) {
  const doc = _guidanceDocs.find(d => d.id === docId)
  if (!doc) return
  _printGuidanceDocs([doc])
}

function printGuidanceCategory() {
  const docs = _guidanceDocs.filter(d => d.type === 'markdown' || d.type === 'html')
  if (docs.length === 0) return alert(t('guidance_noPrintableDocs'))
  _printGuidanceDocs(docs)
}

function _printGuidanceDocs(docs) {
  const catLabel = GUIDANCE_CATS.find(c => c.id === _guidanceCat)?.label || _guidanceCat
  const title = docs.length === 1
    ? docs[0].title
    : `ISMS Builder – ${catLabel} (${t('guidance_docsCount', { n: docs.length })})`

  const bodyParts = docs.map(doc => {
    const html = (typeof marked !== 'undefined')
      ? marked.parse(doc.content || '')
      : `<pre>${escHtml(doc.content || '')}</pre>`
    return `<section class="doc-section">
      <h1 class="doc-title">${escHtml(doc.title)}</h1>
      <div class="doc-body">${html}</div>
    </section>`
  }).join('<div class="page-break"></div>')

  const win = window.open('', '_blank')
  if (!win) return alert(t('err_popupBlocked'))
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>${escHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; max-width: 900px; }
      h1.doc-title { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 6px; margin-top: 0; }
      h1,h2,h3 { margin-top: 1.2em; }
      h2 { font-size: 15px; } h3 { font-size: 13px; }
      table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 11px; }
      th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
      th { background: #f0f0f0; font-weight: bold; }
      pre, code { background: #f5f5f5; padding: 2px 4px; font-size: 11px; border-radius: 3px; }
      pre { padding: 8px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
      .page-break { page-break-after: always; margin: 32px 0; border-top: 1px dashed #ccc; }
      .doc-section { margin-bottom: 24px; }
      @media print { .page-break { page-break-after: always; } body { margin: 0; } }
    </style>
  </head><body>
    <div style="font-size:10px;color:#999;margin-bottom:16px">
      ISMS Builder · ${escHtml(catLabel)} · ${new Date().toLocaleDateString('de-DE')}
    </div>
    ${bodyParts}
    <script>window.onload = () => { window.print() }<\/script>
  </body></html>`)
  win.document.close()
}

function switchGuidanceCat(cat) {
  _guidanceCat = cat
  _guidanceDocId = null
  // Clear search when switching category
  const inp = dom('guidanceSearchInput')
  if (inp) inp.value = ''
  document.querySelectorAll('.guidance-cat-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat)
  })
  loadGuidanceDocs()
}

function onGuidanceSearchInput(val) {
  clearTimeout(_guidanceSearchTimer)
  if (!val.trim()) {
    // Back to normal category view
    renderGuidanceList()
    renderGuidanceEmpty()
    return
  }
  _guidanceSearchTimer = setTimeout(() => runGuidanceSearch(val.trim()), 300)
}

async function runGuidanceSearch(query) {
  const res = await fetch(`/guidance?search=${encodeURIComponent(query)}`, { headers: apiHeaders() })
  const results = res.ok ? await res.json() : []
  renderGuidanceSearchResults(results, query)
}

function renderGuidanceSearchResults(results, query) {
  // Update list column
  const ul = dom('guidanceDocList')
  if (!ul) return
  if (results.length === 0) {
    ul.innerHTML = `<li style="padding:12px;color:var(--text-subtle);font-size:13px;">${t('guidance_searchNoResults', { query: escHtml(query) })}</li>`
    renderGuidanceEmpty()
    return
  }
  ul.innerHTML = results.map(d => {
    const icon = d.type === 'pdf' ? 'ph-file-pdf' : d.type === 'docx' ? 'ph-file-doc' : 'ph-file-text'
    const catMeta = GUIDANCE_CATS.find(c => c.id === d.category)
    const catLabel = catMeta ? catMeta.label : d.category
    return `
      <li class="guidance-doc-item ${d.id === _guidanceDocId ? 'active' : ''}" data-id="${d.id}"
        onclick="renderGuidanceDoc(${JSON.stringify(d).replace(/"/g,'&quot;')})">
        <i class="ph ${icon} guidance-doc-icon"></i>
        <div style="min-width:0">
          <span class="guidance-doc-title">${escHtml(d.title)}</span>
          <span style="display:block;font-size:11px;color:var(--text-subtle);margin-top:2px;">${escHtml(catLabel)}</span>
          ${d.excerpt ? `<span style="display:block;font-size:11px;color:var(--text-subtle);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(d.excerpt)}</span>` : ''}
        </div>
      </li>
    `
  }).join('')

  // Auto-open first result in viewer
  renderGuidanceDoc(results[0])
}

async function deleteGuidanceDoc(id) {
  if (!confirm('Delete document?')) return
  const res = await fetch(`/guidance/${id}`, { method: 'DELETE', headers: apiHeaders('admin') })
  if (!res.ok) { alert('Error deleting'); return }
  if (_guidanceDocId === id) { _guidanceDocId = null }
  await loadGuidanceDocs()
}

// ── Editor Inline Form ──

function openGuidanceEditor(docArg) {
  let doc = null
  if (typeof docArg === 'string' && docArg) {
    doc = _guidanceDocs.find(d => d.id === docArg) || null
  } else if (docArg && typeof docArg === 'object') {
    doc = docArg
  }

  const isEdit = !!doc
  const cats = GUIDANCE_CATS
    .filter(c => !c.minRole || (ROLE_RANK[getCurrentRole()] || 0) >= (ROLE_RANK[c.minRole] || 0))
    .map(c => `<option value="${c.id}" ${doc?.category === c.id ? 'selected' : ''}>${c.label}</option>`)
    .join('')

  const col = dom('guidanceViewerCol')
  if (!col) return

  col.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="closeGuidanceEditor()">
          <i class="ph ph-arrow-left"></i> ${t('ui_back')}
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-pencil"></i> ${isEdit ? t('guidance_editDocument') : t('guidance_newDocument')}
        </h3>
      </div>
      <div class="training-form-body">
        <div class="training-form-section">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div>
              <label class="form-label">${t('col_title')}</label>
              <input id="gEditTitle" class="form-input" value="${escHtml(doc?.title || '')}" placeholder="${t('guidance_titlePh')}" />
            </div>
            <div>
              <label class="form-label">${t('col_category')}</label>
              <select id="gEditCat" class="select">${cats}</select>
            </div>
          </div>
          ${!isEdit ? `
            <div style="margin-bottom:12px;">
              <label class="form-label">${t('col_type')}</label>
              <select id="gEditType" class="select">
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
              </select>
            </div>
          ` : ''}
          <div id="gEditContentArea">
            <div class="guidance-editor-tabs">
              <button class="guidance-editor-tab active" onclick="switchGuidanceEditorTab('edit', this)">${t('edit')}</button>
              <button class="guidance-editor-tab" onclick="switchGuidanceEditorTab('preview', this)">${t('guidance_preview')}</button>
            </div>
            <textarea id="gEditContent" class="form-textarea" rows="16"
              oninput="refreshGuidancePreview()">${escHtml(doc?.content || '')}</textarea>
            <div id="gEditPreview" class="guidance-editor-preview guidance-md" style="display:none;"></div>
          </div>
          <div style="margin-top:12px;">
            ${renderLinksBlock('ge', doc?.linkedControls||[], [], false)}
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 0;">
          <button class="btn btn-secondary" onclick="closeGuidanceEditor()">${t('ui_cancel')}</button>
          <button class="btn btn-primary" onclick="saveGuidanceEditor('${isEdit ? doc.id : ''}')">
            <i class="ph ph-floppy-disk"></i> ${t('ui_save')}
          </button>
        </div>
      </div>
    </div>
  `
  initLinkPickers('ge', false)
}

function closeGuidanceEditor() {
  // Return to doc view or empty state
  if (_guidanceDocId) {
    const doc = _guidanceDocs.find(d => d.id === _guidanceDocId)
    if (doc) { renderGuidanceDoc(doc); return }
  }
  renderGuidanceEmpty()
}

function switchGuidanceEditorTab(tab, btn) {
  document.querySelectorAll('.guidance-editor-tab').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  const ta = dom('gEditContent')
  const pv = dom('gEditPreview')
  if (tab === 'edit') { ta.style.display = ''; pv.style.display = 'none' }
  else { ta.style.display = 'none'; pv.style.display = ''; refreshGuidancePreview() }
}

function refreshGuidancePreview() {
  const pv = dom('gEditPreview')
  if (!pv || pv.style.display === 'none') return
  const txt = dom('gEditContent')?.value || ''
  pv.innerHTML = (typeof marked !== 'undefined') ? marked.parse(txt) : `<pre>${escHtml(txt)}</pre>`
}

async function saveGuidanceEditor(existingId) {
  const title   = dom('gEditTitle')?.value.trim()
  const cat     = dom('gEditCat')?.value
  const content = dom('gEditContent')?.value || ''
  if (!title) { alert('Title is required'); return }

  const linkedControls = getLinkedValues('ge', 'ctrl')
  if (existingId) {
    const res = await fetch(`/guidance/${existingId}`, {
      method: 'PUT',
      headers: apiHeaders('contentowner'),
      body: JSON.stringify({ title, category: cat, content, linkedControls })
    })
    if (!res.ok) { alert('Error saving'); return }
    const updated = await res.json()
    closeGuidanceEditor()
    _guidanceCat = cat
    _guidanceDocId = existingId
    await loadGuidanceDocs()
  } else {
    const type = dom('gEditType')?.value || 'markdown'
    const res = await fetch('/guidance', {
      method: 'POST',
      headers: apiHeaders('contentowner'),
      body: JSON.stringify({ category: cat, title, type, content, linkedControls })
    })
    if (!res.ok) { alert('Error creating'); return }
    const created = await res.json()
    closeGuidanceEditor()
    _guidanceCat = cat
    _guidanceDocId = created.id
    await loadGuidanceDocs()
  }
}

// ── Upload Inline Form ──

function openGuidanceUpload() {
  const cats = GUIDANCE_CATS
    .filter(c => !c.minRole || (ROLE_RANK[getCurrentRole()] || 0) >= (ROLE_RANK[c.minRole] || 0))
    .map(c => `<option value="${c.id}">${c.label}</option>`)
    .join('')

  const col = dom('guidanceViewerCol')
  if (!col) return

  col.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="closeGuidanceUpload()">
          <i class="ph ph-arrow-left"></i> ${t('ui_back')}
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-upload-simple"></i> ${t('guidance_uploadFile')}
        </h3>
      </div>
      <div class="training-form-body">
        <div class="training-form-section">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div>
              <label class="form-label">${t('col_title')}</label>
              <input id="gUploadTitle" class="form-input" placeholder="${t('guidance_titlePh')}" />
            </div>
            <div>
              <label class="form-label">${t('col_category')}</label>
              <select id="gUploadCat" class="select">${cats}</select>
            </div>
          </div>
          <div>
            <label class="form-label">${t('guidance_fileLabel')}</label>
            <div class="guidance-upload-area" onclick="dom('gUploadFile').click()">
              <i class="ph ph-file-arrow-up" style="font-size:32px;"></i>
              <p id="gUploadFileLabel">${t('guidance_selectFileHint')}</p>
            </div>
            <input type="file" id="gUploadFile" accept=".pdf,.docx,.doc" style="display:none;"
              onchange="updateGuidanceUploadLabel(this)" />
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 0;">
          <button class="btn btn-secondary" onclick="closeGuidanceUpload()">${t('ui_cancel')}</button>
          <button class="btn btn-primary" onclick="submitGuidanceUpload()">
            <i class="ph ph-upload-simple"></i> ${t('guidance_upload')}
          </button>
        </div>
      </div>
    </div>
  `
}

function closeGuidanceUpload() {
  if (_guidanceDocId) {
    const doc = _guidanceDocs.find(d => d.id === _guidanceDocId)
    if (doc) { renderGuidanceDoc(doc); return }
  }
  renderGuidanceEmpty()
}

function updateGuidanceUploadLabel(input) {
  const label = dom('gUploadFileLabel')
  if (label && input.files.length > 0) label.textContent = input.files[0].name
}

async function submitGuidanceUpload() {
  const title = dom('gUploadTitle')?.value.trim()
  const cat   = dom('gUploadCat')?.value
  const file  = dom('gUploadFile')?.files[0]
  if (!title) { alert('Title is required'); return }
  if (!file)  { alert('Please select a file'); return }

  const fd = new FormData()
  fd.append('file', file)
  fd.append('title', title)
  fd.append('category', cat)

  const res = await fetch('/guidance/upload', {
    method: 'POST',
    headers: { 'X-User-Name': getCurrentUser(), 'X-User-Role': getCurrentRole() },
    body: fd
  })
  if (!res.ok) { const e = await res.json(); alert('Upload error: ' + e.error); return }
  const created = await res.json()
  closeGuidanceUpload()
  _guidanceCat   = cat
  _guidanceDocId = created.id
  await loadGuidanceDocs()
}

// ════════════════════════════════════════════════════════════
// KALENDER – Wiedervorlage
// ════════════════════════════════════════════════════════════

const CAL_EVENT_CFG = {
  risk_due:        { get label() { return t('cal_riskDue') },        cls:'cal-chip-risk',      icon:'ph-warning' },
  risk_review:     { get label() { return t('cal_riskReview') },     cls:'cal-chip-review',    icon:'ph-arrows-clockwise' },
  treatment_due:   { get label() { return t('cal_measureDue') },     cls:'cal-chip-treatment', icon:'ph-list-checks' },
  template_review: { get label() { return t('cal_templateReview') }, cls:'cal-chip-template',  icon:'ph-files' },
  template_due:         { label:'Document Due',            cls:'cal-chip-template',  icon:'ph-clock' },
  finding_action_due:   { label:'Finding Action Due',      cls:'cal-chip-risk',       icon:'ph-magnifying-glass' },
}

let _calYear  = new Date().getFullYear()
let _calMonth = new Date().getMonth()   // 0-based
let _calEvents = []
let _calSelectedDay = null

async function renderCalendar() {
  dom('calendarContainer')?.remove()
  const container = document.createElement('div')
  container.id = 'calendarContainer'
  dom('editor').appendChild(container)

  container.innerHTML = `
    <div class="cal-fullpage">
      <div class="cal-page-header">
        <h2><i class="ph ph-calendar-dots"></i> Kalender & Wiedervorlage</h2>
      </div>
      <div class="cal-layout">
        <div class="cal-main" id="calMain"></div>
        <div class="cal-sidebar" id="calSidebar"></div>
      </div>
    </div>`

  const res = await fetch('/calendar', { headers: apiHeaders() })
  _calEvents = res.ok ? await res.json() : []

  _renderCalMonth()
  _renderCalUpcoming()
}

function _renderCalMonth() {
  const main = dom('calMain')
  if (!main) return

  const today    = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const firstDay = new Date(_calYear, _calMonth, 1)
  const lastDay  = new Date(_calYear, _calMonth + 1, 0)
  const monthName = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  // Wochentag des 1. (Mo=0)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  // Events nach Datum indizieren
  const byDate = {}
  for (const ev of _calEvents) {
    const d = ev.date?.slice(0, 10)
    if (!d) continue
    const [y, m] = d.split('-').map(Number)
    if (y === _calYear && m - 1 === _calMonth) {
      byDate[d] = byDate[d] || []
      byDate[d].push(ev)
    }
  }

  const DOW = ['Mo','Di','Mi','Do','Fr','Sa','So']

  let cells = ''
  // Leer-Zellen vor dem 1.
  for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell cal-cell-empty"></div>`
  // Tages-Zellen
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${_calYear}-${String(_calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    const evs     = byDate[dateStr] || []
    const isToday = dateStr === todayStr
    const isSel   = dateStr === _calSelectedDay
    const isPast  = dateStr < todayStr

    const chips = evs.slice(0, 3).map(ev => {
      const cfg = CAL_EVENT_CFG[ev.type] || {}
      return `<div class="cal-chip ${cfg.cls || ''}" title="${escHtml(ev.label)}">${escHtml(ev.label)}</div>`
    }).join('')
    const more = evs.length > 3 ? `<div class="cal-chip-more">+${evs.length - 3}</div>` : ''

    cells += `
      <div class="cal-cell ${isToday ? 'cal-today' : ''} ${isSel ? 'cal-selected' : ''} ${isPast && !isToday ? 'cal-past-day' : ''} ${evs.length ? 'cal-has-events' : ''}"
           onclick="selectCalDay('${dateStr}')">
        <div class="cal-day-num">${d}</div>
        <div class="cal-chips">${chips}${more}</div>
      </div>`
  }

  main.innerHTML = `
    <div class="cal-nav">
      <button class="btn btn-secondary btn-sm" onclick="calNav(-1)"><i class="ph ph-caret-left"></i></button>
      <span class="cal-month-label">${monthName}</span>
      <button class="btn btn-secondary btn-sm" onclick="calNav(1)"><i class="ph ph-caret-right"></i></button>
      <button class="btn btn-secondary btn-sm" onclick="calNavToday()" style="margin-left:8px;">Heute</button>
    </div>
    <div class="cal-grid-header">
      ${DOW.map(d => `<div class="cal-dow">${d}</div>`).join('')}
    </div>
    <div class="cal-grid">${cells}</div>`
}

function _renderCalUpcoming() {
  const sidebar = dom('calSidebar')
  if (!sidebar) return

  const today = new Date().toISOString().slice(0, 10)
  const in30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const upcoming = _calEvents.filter(ev => ev.date >= today)
  const overdue  = _calEvents.filter(ev => ev.date <  today)

  function eventRow(ev) {
    const cfg = CAL_EVENT_CFG[ev.type] || {}
    const d   = new Date(ev.date).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })
    const soon = ev.date <= in30
    return `
      <div class="cal-agenda-row ${ev.date < today ? 'cal-agenda-overdue' : soon ? 'cal-agenda-soon' : ''}"
           onclick="selectCalDay('${ev.date}')">
        <div class="cal-agenda-date">${d}</div>
        <div class="cal-chip ${cfg.cls} cal-chip-sm" title="${escHtml(cfg.label||ev.type)}">
          <i class="ph ${cfg.icon||'ph-dot'}"></i>
        </div>
        <div class="cal-agenda-label">${escHtml(ev.label)}</div>
      </div>`
  }

  sidebar.innerHTML = `
    ${overdue.length ? `
      <div class="cal-agenda-section">
        <div class="cal-agenda-title cal-agenda-overdue-title">
          <i class="ph ph-warning-circle"></i> Overdue (${overdue.length})
        </div>
        ${overdue.slice(-10).reverse().map(eventRow).join('')}
      </div>` : ''}
    <div class="cal-agenda-section">
      <div class="cal-agenda-title"><i class="ph ph-clock"></i> Upcoming Events</div>
      ${upcoming.length ? upcoming.map(eventRow).join('') : '<p class="cal-agenda-empty">No upcoming events.</p>'}
    </div>`
}

function selectCalDay(dateStr) {
  _calSelectedDay = _calSelectedDay === dateStr ? null : dateStr
  // Re-render grid to show selection
  _renderCalMonth()
  // Show day detail in sidebar
  _renderCalDayDetail(dateStr)
}

function _renderCalDayDetail(dateStr) {
  const sidebar = dom('calSidebar')
  if (!sidebar) return

  const evs = _calEvents.filter(ev => ev.date?.slice(0,10) === dateStr)
  if (!evs.length) { _calSelectedDay = null; _renderCalUpcoming(); return }

  const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB',
    { weekday:'long', day:'2-digit', month:'long', year:'numeric' })
  const today = new Date().toISOString().slice(0, 10)

  sidebar.innerHTML = `
    <div class="cal-agenda-section">
      <div class="cal-agenda-title">
        <i class="ph ph-calendar-check"></i> ${label}
        <button class="btn btn-secondary btn-sm" style="margin-left:auto;" onclick="_calSelectedDay=null;_renderCalMonth();_renderCalUpcoming()">
          <i class="ph ph-x"></i>
        </button>
      </div>
      ${evs.map(ev => {
        const cfg = CAL_EVENT_CFG[ev.type] || {}
        const overdue = dateStr < today
        return `
          <div class="cal-detail-card ${overdue ? 'cal-detail-overdue' : ''}">
            <div class="cal-detail-header">
              <span class="cal-chip ${cfg.cls}"><i class="ph ${cfg.icon||'ph-dot'}"></i> ${cfg.label||ev.type}</span>
              ${overdue ? '<span class="cal-overdue-badge">Overdue</span>' : ''}
            </div>
            <div class="cal-detail-label">${escHtml(ev.label)}</div>
            ${ev.riskId ? `<button class="btn btn-secondary btn-sm" style="margin-top:6px;"
              onclick="loadSection('risk');renderRisk().then(()=>openRiskDetail('${ev.riskId}'))">
              <i class="ph ph-arrow-square-out"></i> ${t('cal_openRisk')}
            </button>` : ''}
          </div>`
      }).join('')}
    </div>`
}

function calNav(dir) {
  _calMonth += dir
  if (_calMonth > 11) { _calMonth = 0; _calYear++ }
  if (_calMonth < 0)  { _calMonth = 11; _calYear-- }
  _calSelectedDay = null
  _renderCalMonth()
  _renderCalUpcoming()
}

function calNavToday() {
  _calYear  = new Date().getFullYear()
  _calMonth = new Date().getMonth()
  _calSelectedDay = null
  _renderCalMonth()
  _renderCalUpcoming()
}

// ════════════════════════════════════════════════════════════
// RISK & COMPLIANCE
// ════════════════════════════════════════════════════════════

let RISK_CATS = [
  { id:'technical',       labelKey:'risk_catTechnical',      icon:'ph-cpu' },
  { id:'organizational',  labelKey:'risk_catOrganizational', icon:'ph-users' },
  { id:'physical',        labelKey:'risk_catPhysical',       icon:'ph-building' },
  { id:'legal',           labelKey:'risk_catLegal',          icon:'ph-scales' },
]
let RISK_TREATMENTS = [
  { id:'reduce',   labelKey:'risk_treatmentReduce' },
  { id:'accept',   labelKey:'risk_treatmentAccept' },
  { id:'avoid',    labelKey:'risk_treatmentAvoid' },
  { id:'transfer', labelKey:'risk_treatmentTransfer' },
]
const RISK_STATUSES = [
  { id:'open',         get label() { return t('riskst_open') } },
  { id:'in_treatment', get label() { return t('riskst_inTreatment') } },
  { id:'accepted',     get label() { return t('riskst_accepted') } },
  { id:'closed',       get label() { return t('riskst_closed') } },
]
const RISK_LEVEL_CFG = {
  low:      { get label() { return t('riskl_low') },      cls:'risk-low' },
  medium:   { get label() { return t('riskl_medium') },   cls:'risk-medium' },
  high:     { get label() { return t('riskl_high') },     cls:'risk-high' },
  critical: { get label() { return t('riskl_critical') }, cls:'risk-critical' },
}

/* CVSS v3.1 Severity Bands — FIRST.org (freely usable, attribution recommended)
 * https://www.first.org/cvss/specification-document */
const CVSS_BANDS = [
  { min: 9.0, max: 10.0, label: 'Critical', cls: 'cvss-critical', color: '#dc2626',
    descKey: 'cvss_descCritical' },
  { min: 7.0, max:  8.9, label: 'High',     cls: 'cvss-high',     color: '#ea580c',
    descKey: 'cvss_descHigh' },
  { min: 4.0, max:  6.9, label: 'Medium',   cls: 'cvss-medium',   color: '#ca8a04',
    descKey: 'cvss_descMedium' },
  { min: 0.1, max:  3.9, label: 'Low',      cls: 'cvss-low',      color: '#16a34a',
    descKey: 'cvss_descLow' },
  { min: 0.0, max:  0.0, label: 'None',     cls: 'cvss-none',     color: '#6b7280',
    descKey: 'cvss_descNone' },
]
function riskCatLabel(cat) { return cat ? t(cat.labelKey) : '' }
function riskTreatmentLabel(treatment) { return treatment ? t(treatment.labelKey) : '' }
function cvssDesc(info) { return info?.descKey ? t(info.descKey) : '' }

function cvssInfo(score) {
  if (score == null || isNaN(score)) return null
  const s = parseFloat(score)
  return CVSS_BANDS.find(b => s >= b.min && s <= b.max) || CVSS_BANDS[CVSS_BANDS.length - 1]
}

function cvssBadgeHtml(score) {
  if (score == null || isNaN(score)) return ''
  const info = cvssInfo(score)
  const pct  = Math.round((parseFloat(score) / 10) * 100)
  return `<span class="cvss-badge ${info.cls}" title="${cvssDesc(info)}">CVSS ${parseFloat(score).toFixed(1)} — ${info.label}</span>`
}

function cvssBarHtml(score) {
  if (score == null || isNaN(score)) return ''
  const info = cvssInfo(score)
  const pct  = Math.round((parseFloat(score) / 10) * 100)
  return `
    <div class="cvss-bar-wrap" title="CVSS ${parseFloat(score).toFixed(1)} / 10">
      <div class="cvss-bar-track">
        <div class="cvss-bar-fill" style="width:${pct}%;background:${info.color}"></div>
      </div>
      <span class="cvss-bar-label" style="color:${info.color}">${parseFloat(score).toFixed(1)}</span>
    </div>`
}

let _riskTab = 'register'
let _riskFilterCat = ''
let _riskFilterStatus = ''
const _tpCache = {}   // id → treatment plan object (avoids fragile JSON-in-onclick)

function canManageRisks() {
  const r = getCurrentRole()
  return r === 'auditor' || r === 'admin'
}

function canEditRisk(risk) {
  return canManageRisks() || (risk?.owner && risk.owner === getCurrentUser())
}

async function renderRisk() {
  dom('riskContainer')?.remove()
  const container = document.createElement('div')
  container.id = 'riskContainer'
  dom('editor').appendChild(container)

  container.innerHTML = `
    <div class="risk-fullpage">
      <div class="risk-header">
        <h2><i class="ph ph-warning"></i> ${t('risk_pageTitle')}</h2>
        ${canManageRisks() ? `<button class="btn btn-primary btn-sm" onclick="openRiskModal()">
          <i class="ph ph-plus"></i> ${t('risk_new')}
        </button>` : ''}
      </div>
      <div class="risk-tab-bar">
        <button class="risk-tab active" data-tab="register"  onclick="switchRiskTab('register')"><i class="ph ph-table"></i> ${t('risk_register')}</button>
        <button class="risk-tab"        data-tab="heatmap"   onclick="switchRiskTab('heatmap')"><i class="ph ph-grid-four"></i> ${t('risk_heatmapTab')}</button>
        <button class="risk-tab"        data-tab="treatments"onclick="switchRiskTab('treatments')"><i class="ph ph-list-checks"></i> ${t('risk_treatmentsTab')}</button>
        <button class="risk-tab"        data-tab="calendar"  onclick="switchRiskTab('calendar')"><i class="ph ph-calendar"></i> ${t('risk_calendarTab')}</button>
        <button class="risk-tab"        data-tab="reports"   onclick="switchRiskTab('reports')"><i class="ph ph-chart-bar"></i> ${t('risk_reportsTab')}</button>
      </div>
      <div class="risk-tab-content" id="riskTabContent"></div>
    </div>`

  await switchRiskTab('register')
}

async function switchRiskTab(tab) {
  _riskTab = tab
  document.querySelectorAll('.risk-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab))
  const content = dom('riskTabContent')
  if (!content) return
  content.innerHTML = `<p class="report-loading">${t('ui_loading')}</p>`
  if (tab === 'register')   await renderRiskRegister(content)
  if (tab === 'heatmap')    await renderRiskHeatmap(content)
  if (tab === 'treatments') await renderRiskTreatments(content)
  if (tab === 'calendar')   await renderRiskCalendar(content)
  if (tab === 'reports')    await renderRiskReports(content)
}

// ── Register ──

async function renderRiskRegister(el) {
  const params = new URLSearchParams()
  if (_riskFilterCat)    params.set('category', _riskFilterCat)
  if (_riskFilterStatus) params.set('status',   _riskFilterStatus)
  const res = await fetch('/risks?' + params, { headers: apiHeaders() })
  const risks = res.ok ? await res.json() : []

  const catOpts = [{ id:'', label:t('filter_allCats') }, ...RISK_CATS].map(c =>
    `<option value="${c.id}" ${_riskFilterCat === c.id ? 'selected':''}>${c.label || riskCatLabel(c)}</option>`).join('')
  const stOpts = [{ id:'', label:t('filter_allStatuses') }, ...RISK_STATUSES].map(s =>
    `<option value="${s.id}" ${_riskFilterStatus === s.id ? 'selected':''}>${s.label}</option>`).join('')

  el.innerHTML = `
    <div class="risk-filter-bar">
      <select class="select risk-filter-sel" onchange="_riskFilterCat=this.value;switchRiskTab('register')">${catOpts}</select>
      <select class="select risk-filter-sel" onchange="_riskFilterStatus=this.value;switchRiskTab('register')">${stOpts}</select>
      <span class="risk-filter-count">${risks.length} ${t('risk_countLabel')}</span>
    </div>
    ${risks.length === 0 ? `<p class="risk-empty">${t('risk_noRisksFound')}</p>` : `
    <table class="risk-table">
      <thead><tr>
        <th>${t('risk_levelCol')}</th><th>${t('col_title')}</th><th>${t('col_category')}</th>
        <th>${t('risk_wsScoreCol')}</th><th>${t('risk_treatmentCol')}</th><th>${t('col_status')}</th><th>${t('ui_owner')}</th><th style="width:70px;"></th>
      </tr></thead>
      <tbody>
        ${risks.map(r => {
          const lv = RISK_LEVEL_CFG[r.riskLevel] || { label: r.riskLevel, cls: '' }
          const cat = RISK_CATS.find(c => c.id === r.category)
          const st  = RISK_STATUSES.find(s => s.id === r.status)
          const tr  = RISK_TREATMENTS.find(t => t.id === r.treatmentOption)
          return `<tr class="risk-row${r.needsReview ? ' risk-needs-review' : ''}" onclick="openRiskDetail('${r.id}')">
            <td style="white-space:nowrap">
              <span class="risk-badge ${lv.cls}">${lv.label}</span>
              ${r.cvssScore != null ? cvssBadgeHtml(r.cvssScore) : ''}
            </td>
            <td class="risk-title-cell">${escHtml(r.title)}${r.needsReview ? ` <span class="badge-review-pending" title="${t('risk_approvalRequired')}">&#9888; ${t('ui_review')}</span>` : ''}</td>
            <td>${escHtml(riskCatLabel(cat) || r.category)}</td>
            <td class="risk-score-cell">${r.probability} × ${r.impact} = <strong>${r.score}</strong></td>
            <td>${escHtml(riskTreatmentLabel(tr) || r.treatmentOption)}</td>
            <td><span class="risk-status-badge risk-st-${r.status}">${st?.label || r.status}</span></td>
            <td>${escHtml(r.owner || '—')}</td>
            <td onclick="event.stopPropagation()" class="risk-actions">
              ${canEditRisk(r) ? `<button class="btn btn-secondary btn-sm" title="${escHtml(t('edit'))}" onclick="openRiskModal('${r.id}')"><i class="ph ph-pencil"></i></button>` : ''}
              ${getCurrentRole()==='admin' ? `<button class="btn btn-sm" style="color:var(--danger-text)" title="${escHtml(t('delete'))}" onclick="deleteRisk('${r.id}')"><i class="ph ph-trash"></i></button>` : ''}
            </td>
          </tr>`
        }).join('')}
      </tbody>
    </table>`}
  `
}

// ── Heatmap ──

async function renderRiskHeatmap(el) {
  const res = await fetch('/risks', { headers: apiHeaders() })
  const risks = res.ok ? await res.json() : []

  // Build 5x5 grid: probability (Y) vs impact (X)
  const cells = {}
  for (const r of risks) {
    const key = `${r.probability}_${r.impact}`
    cells[key] = cells[key] || []
    cells[key].push(r)
  }

  const levelColor = (p, i) => {
    const s = p * i
    if (s <= 4)  return 'hm-low'
    if (s <= 9)  return 'hm-medium'
    if (s <= 14) return 'hm-high'
    return 'hm-critical'
  }

  let grid = `
    <div class="heatmap-wrap">
      <div class="heatmap-ylabel"><span>${t('risk_probability')}</span></div>
      <div class="heatmap-grid-area">
        <div class="heatmap-grid">`

  for (let p = 5; p >= 1; p--) {
    for (let i = 1; i <= 5; i++) {
      const key = `${p}_${i}`
      const list = cells[key] || []
      const cls  = levelColor(p, i)
      const dots = list.slice(0, 4).map(r =>
        `<span class="hm-dot" title="${escHtml(r.title)}" onclick="openRiskDetail('${r.id}')"></span>`
      ).join('')
      const more = list.length > 4 ? `<span class="hm-more">+${list.length - 4}</span>` : ''
      grid += `<div class="hm-cell ${cls}" title="${p} × ${i} = ${p*i}">${dots}${more}<span class="hm-score">${p*i}</span></div>`
    }
  }

  grid += `
        </div>
        <div class="heatmap-xlabel">
          ${[1,2,3,4,5].map(i => `<span>${i}</span>`).join('')}
        </div>
        <div class="heatmap-x-label-text">${t('risk_impact')}</div>
      </div>
    </div>`

  // Seitenleiste: alle Risiken sortiert nach Score absteigend
  const sorted = [...risks].sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact))
  const listRows = sorted.map(r => {
    const score = r.probability * r.impact
    const cls   = levelColor(r.probability, r.impact)
    const owner = r.owner ? `<span class="hm-list-owner">${escHtml(r.owner)}</span>` : ''
    return `<div class="hm-list-item" onclick="openRiskDetail('${r.id}')">
      <span class="hm-list-badge ${cls}">${score}</span>
      <span class="hm-list-title">${escHtml(r.title)}</span>${owner}
    </div>`
  }).join('')

  grid += `
    <div class="heatmap-risk-list">
      <div class="heatmap-risk-list-header">${t('risk_all') || 'All Risks'} <span class="hm-list-count">${risks.length}</span></div>
      <div class="heatmap-risk-list-body">${listRows}</div>
    </div>
    <div class="heatmap-legend">
      <span class="hm-leg hm-low">${t('risk_levelLow')}</span>
      <span class="hm-leg hm-medium">${t('risk_levelMed')}</span>
      <span class="hm-leg hm-high">${t('risk_levelHigh')}</span>
      <span class="hm-leg hm-critical">${t('risk_levelCrit')}</span>
    </div>
    <p class="heatmap-hint">${t('risk_heatmapHint')}</p>`

  el.innerHTML = grid
}

// ── Treatment Plans (all) ──

async function renderRiskTreatments(el) {
  const res = await fetch('/risks', { headers: apiHeaders() })
  const risks = res.ok ? await res.json() : []

  const rows = []
  for (const r of risks) {
    for (const tp of r.treatmentPlans || []) {
      const entry = { ...tp, riskTitle: r.title, riskId: r.id, riskLevel: r.riskLevel }
      _tpCache[tp.id] = entry
      rows.push(entry)
    }
  }
  rows.sort((a, b) => {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate) - new Date(b.dueDate)
  })

  const statusLabel = { open:t('findings_statusOpen'), in_progress:t('findings_statusInProgress'), completed:t('risk_statusCompleted') }
  const today = new Date().toISOString().slice(0,10)

  const riskOpts = risks.map(r => `<option value="${escHtml(r.id)}">${escHtml(r.title)}</option>`).join('')

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <h4 style="margin:0;flex:1;">${t('risk_allTreatments')} (${rows.length})</h4>
      ${canManageRisks() ? `
        <select id="tpRiskPicker" class="select" style="max-width:220px;">
          <option value="">— ${t('risk_select')} —</option>
          ${riskOpts}
        </select>
        <button class="btn btn-primary btn-sm" onclick="openTreatmentModalForRisk()">
          <i class="ph ph-plus"></i> ${t('risk_newMeasure')}
        </button>` : ''}
    </div>
    ${rows.length === 0 ? `<p class="risk-empty">${t('risk_noMeasures')}</p>` : `
    <table class="risk-table">
      <thead><tr>
        <th>${t('risk_measure')}</th><th>${t('risk_riskCol')}</th><th>${t('col_responsible')}</th><th>${t('risk_orgUnit')}</th>
        <th>${t('col_dueDate')}</th><th>${t('col_status')}</th>
        ${canManageRisks() ? '<th style="width:90px;"></th>' : ''}
      </tr></thead>
      <tbody>
        ${rows.map(tp => {
          const overdue = tp.dueDate && tp.dueDate < today && tp.status !== 'completed'
          const lv = RISK_LEVEL_CFG[tp.riskLevel] || { cls:'' }
          const ouName = tp.orgUnitId ? (_ORG_UNITS.find(u => u.id === tp.orgUnitId)?.name || tp.orgUnitId) : '—'
          return `<tr>
            <td>${escHtml(tp.title)}<br><small style="color:var(--text-subtle)">${escHtml(tp.description || '')}</small></td>
            <td><span class="risk-badge ${lv.cls}" style="font-size:10px;">${escHtml(tp.riskTitle)}</span></td>
            <td>${escHtml(tp.responsible || '—')}</td>
            <td>${escHtml(ouName)}</td>
            <td class="${overdue ? 'risk-overdue' : ''}">${tp.dueDate ? new Date(tp.dueDate).toLocaleDateString('en-GB') : '—'}</td>
            <td><span class="risk-tp-status risk-tp-${tp.status}">${statusLabel[tp.status] || tp.status}</span></td>
            ${canManageRisks() ? `<td>
              <button class="btn btn-secondary btn-sm" title="Edit" onclick="openTreatmentModal('${tp.riskId}','${tp.id}')">
                <i class="ph ph-pencil"></i>
              </button>
              <button class="btn btn-sm" style="color:var(--danger-text)" title="Delete" onclick="deleteTreatment('${tp.riskId}','${tp.id}')">
                <i class="ph ph-trash"></i>
              </button>
            </td>` : ''}
          </tr>`
        }).join('')}
      </tbody>
    </table>`}
  `
}

function openTreatmentModalForRisk() {
  const sel = document.getElementById('tpRiskPicker')
  const riskId = sel?.value
  if (!riskId) { alert(t('risk_selectFirst')); return }
  openTreatmentModal(riskId, null)
}

// ── Calendar ──

async function renderRiskCalendar(el) {
  const res = await fetch('/risks/calendar', { headers: apiHeaders() })
  const events = res.ok ? await res.json() : []

  const today = new Date().toISOString().slice(0, 10)
  const typeLabel = { risk_due:t('col_dueDate'), risk_review:t('ui_review'), treatment_due:t('risk_measure') }
  const typeCls   = { risk_due:'cal-due', risk_review:'cal-review', treatment_due:'cal-treatment' }

  if (events.length === 0) {
    el.innerHTML = `<p class="risk-empty">${t('risk_noEvents')}</p>`
    return
  }

  el.innerHTML = `
    <div class="risk-calendar">
      ${events.map(ev => {
        const past = ev.date < today
        const soon = !past && ev.date <= new Date(Date.now() + 14*86400000).toISOString().slice(0,10)
        return `
          <div class="cal-event ${past ? 'cal-past' : soon ? 'cal-soon' : ''}">
            <div class="cal-date">${new Date(ev.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
            <div class="cal-body">
              <span class="cal-type-badge ${typeCls[ev.type] || ''}">${typeLabel[ev.type] || ev.type}</span>
              <span class="cal-label">${escHtml(ev.label)}</span>
            </div>
            <div class="cal-state">
              ${past ? `<span class="risk-overdue">${t('cal_overdue')}</span>` : soon ? `<span style="color:var(--warning-text)">${t('cal_dueSoon')}</span>` : ''}
            </div>
          </div>`
      }).join('')}
    </div>`
}

// ── Reports ──

async function renderRiskReports(el) {
  const [sumRes, allRes, pendingRes] = await Promise.all([
    fetch('/risks/summary',        { headers: apiHeaders() }),
    fetch('/risks',                { headers: apiHeaders() }),
    fetch('/risks/review-pending', { headers: apiHeaders() }),
  ])
  const s       = sumRes.ok     ? await sumRes.json()     : null
  const allRisks = allRes.ok    ? await allRes.json()     : []
  const pending  = pendingRes.ok ? await pendingRes.json() : []
  if (!s) { el.innerHTML = `<p class="report-error">${t('risk_loadError')}</p>`; return }

  const scanRisks = allRisks.filter(r => r.source === 'greenbone-scan')

  const bar = (val, max, cls) => `
    <div class="risk-report-bar-wrap">
      <div class="risk-report-bar ${cls}" style="width:${max ? Math.round(val/max*100) : 0}%"></div>
      <span>${val}</span>
    </div>`

  const top5rows = s.top5.map(r => {
    const lv = RISK_LEVEL_CFG[r.riskLevel] || { label: r.riskLevel, cls: '' }
    return `<tr>
      <td>${escHtml(r.title)}</td>
      <td><span class="risk-badge ${lv.cls}">${lv.label}</span></td>
      <td><strong>${r.score}</strong></td>
      <td>${escHtml(RISK_STATUSES.find(x=>x.id===r.status)?.label || r.status)}</td>
    </tr>`
  }).join('')

  el.innerHTML = `
    <div class="risk-report-grid">
      <div class="risk-report-card">
        <h4>${t('risk_totalCard')}</h4>
        <div class="risk-kpi-big">${s.total}</div>
        <div class="risk-kpi-sub">${t('risk_recordedSub')}</div>
      </div>
      <div class="risk-report-card">
        <h4>${t('risk_openMeasuresCard')}</h4>
        <div class="risk-kpi-big ${s.openTreatments > 0 ? 'risk-kpi-warn' : ''}">${s.openTreatments}</div>
        <div class="risk-kpi-sub">${t('risk_openMeasuresSub')}</div>
      </div>
      <div class="risk-report-card">
        <h4>${t('risk_byLevel')}</h4>
        ${Object.entries(s.byLevel).map(([k,v]) => `
          <div class="risk-report-row">
            <span class="risk-badge ${RISK_LEVEL_CFG[k]?.cls}" style="width:80px;">${RISK_LEVEL_CFG[k]?.label||k}</span>
            ${bar(v, s.total, RISK_LEVEL_CFG[k]?.cls+'-bar')}
          </div>`).join('')}
      </div>
      <div class="risk-report-card">
        <h4>${t('risk_byCategory')}</h4>
        ${RISK_CATS.map(c => `
          <div class="risk-report-row">
            <span style="width:130px;font-size:12px;">${riskCatLabel(c)}</span>
            ${bar(s.byCategory[c.id]||0, s.total, 'risk-cat-bar')}
          </div>`).join('')}
      </div>
      <div class="risk-report-card">
        <h4>${t('risk_byStatus')}</h4>
        ${RISK_STATUSES.map(st => `
          <div class="risk-report-row">
            <span class="risk-status-badge risk-st-${st.id}" style="width:120px;">${st.label}</span>
            ${bar(s.byStatus[st.id]||0, s.total, 'risk-st-bar')}
          </div>`).join('')}
      </div>
      <div class="risk-report-card risk-report-full">
        <h4>${t('risk_top5Title')}</h4>
        <table class="risk-table">
          <thead><tr><th>${t('col_title')}</th><th>${t('risk_levelCol')}</th><th>${t('risk_scoreCol')}</th><th>${t('col_status')}</th></tr></thead>
          <tbody>${top5rows || `<tr><td colspan="4" style="color:var(--text-subtle)">${t('risk_noRisksShort')}</td></tr>`}</tbody>
        </table>
      </div>
      ${pending.length > 0 ? `
      <div class="risk-report-card risk-report-full scan-review-banner" style="border-color:#f59e0b">
        <h4><i class="ph ph-shield-warning" style="color:#f59e0b"></i> ${t('risk_approvalPending')} (${pending.length})</h4>
        <table class="risk-table">
          <thead><tr><th>${t('col_title')}</th><th>CVSS</th><th>${t('findings_severity')}</th><th>${t('risk_hostCol')}</th><th>${t('risk_cvesCol')}</th><th>${t('common_action')}</th></tr></thead>
          <tbody>${pending.map(r => `<tr>
            <td>${escHtml(r.title)}</td>
            <td>${r.cvssScore != null ? cvssBadgeHtml(r.cvssScore) : '—'}</td>
            <td><span class="risk-badge ${RISK_LEVEL_CFG[r.riskLevel]?.cls||''}">${RISK_LEVEL_CFG[r.riskLevel]?.label||r.riskLevel||'—'}</span></td>
            <td style="font-size:.8rem;color:var(--text-muted)">${escHtml(r.scanRef||'')}</td>
            <td style="font-size:.8rem">${(r.cveIds||[]).join(', ')||'—'}</td>
            <td><button class="btn btn-primary btn-sm" onclick="approveRisk('${r.id}')"><i class="ph ph-check"></i> ${t('risk_approve')}</button></td>
          </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
      ${scanRisks.length > 0 ? `
      <div class="risk-report-card risk-report-full">
        <h4><i class="ph ph-scan" style="color:#3b82f6"></i> ${t('risk_scanImports')} (${scanRisks.length} ${t('risk_approved').toLowerCase()})</h4>
        <table class="risk-table">
          <thead><tr><th>${t('col_title')}</th><th>CVSS</th><th>${t('findings_severity')}</th><th>${t('risk_cvesCol')}</th><th>${t('risk_scoreCol')}</th><th>${t('col_status')}</th><th>${t('risk_approvedBy')}</th></tr></thead>
          <tbody>${scanRisks.map(r => `<tr onclick="openRiskDetail('${r.id}')" style="cursor:pointer">
            <td>${escHtml(r.title)}</td>
            <td>${r.cvssScore != null ? cvssBadgeHtml(r.cvssScore) : '—'}</td>
            <td><span class="risk-badge ${RISK_LEVEL_CFG[r.riskLevel]?.cls||''}">${RISK_LEVEL_CFG[r.riskLevel]?.label||r.riskLevel||'—'}</span></td>
            <td style="font-size:.8rem">${(r.cveIds||[]).join(', ')||'—'}</td>
            <td style="text-align:center">${r.score ?? '—'}</td>
            <td><span class="risk-status-badge risk-st-${r.status}">${RISK_STATUSES.find(x=>x.id===r.status)?.label||r.status}</span></td>
            <td style="font-size:.8rem;color:var(--text-muted)">${escHtml(r.approvedBy||'—')}</td>
          </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>`
}

// ── Risk Detail ──

async function openRiskDetail(id) {
  const [res, entRes] = await Promise.all([
    fetch(`/risks/${id}`, { headers: apiHeaders() }),
    fetch('/entities', { headers: apiHeaders() })
  ])
  if (!res.ok) return
  const r = await res.json()
  const entities = entRes.ok ? await entRes.json() : []
  const entityMap = Object.fromEntries(entities.map(e => [e.id, e.name]))
  const lv  = RISK_LEVEL_CFG[r.riskLevel] || { label: r.riskLevel, cls: '' }
  const cat = RISK_CATS.find(c => c.id === r.category)
  const tr  = RISK_TREATMENTS.find(t => t.id === r.treatmentOption)
  const st  = RISK_STATUSES.find(s => s.id === r.status)
  const tpStatusLabel = { open:t('findings_statusOpen'), in_progress:t('findings_statusInProgress'), completed:t('risk_statusCompleted') }

  const el = dom('riskTabContent')
  if (!el) return
  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchRiskTab('register')">
          <i class="ph ph-arrow-left"></i> ${t('common_back')}
        </button>
        <h2 style="margin:0;flex:1;font-size:1.1rem;display:flex;align-items:center;gap:8px;">
          <span class="risk-badge ${lv.cls}">${lv.label}</span>
          ${escHtml(r.title)}
        </h2>
        ${canEditRisk(r) ? `<button class="btn btn-secondary btn-sm" onclick="openRiskModal('${r.id}')">
          <i class="ph ph-pencil"></i> ${t('edit')}
        </button>` : ''}
      </div>

      ${r.needsReview ? `<div class="scan-review-banner" style="margin-bottom:16px">
        <i class="ph ph-warning"></i>
        <span><strong>${t('risk_approvalRequired')}</strong> — ${t('risk_scanReviewText')}</span>
        ${canManageRisks() ? `<button class="btn btn-primary btn-sm" onclick="approveRisk('${r.id}')"><i class="ph ph-check-circle"></i> ${t('risk_approve')}</button>` : ''}
      </div>` : ''}

      ${r.source === 'greenbone-scan' ? (() => {
        const ci = cvssInfo(r.cvssScore)
        return `<div class="cvss-detail-card" style="margin-bottom:16px">
          <div class="cvss-detail-header">
            <i class="ph ph-magnifying-glass"></i>
            <span class="cvss-detail-source">Greenbone Scan-Import</span>
            ${r.cvssScore != null ? `
              <span class="cvss-badge ${ci?.cls}"
                style="font-size:.95rem;padding:3px 12px">
                CVSS ${parseFloat(r.cvssScore).toFixed(1)} — ${ci?.label}
              </span>
              ${cvssBarHtml(r.cvssScore)}
            ` : ''}
          </div>
          ${ci ? `<p class="cvss-detail-desc">${cvssDesc(ci)}</p>` : ''}
          ${r.cveIds?.length ? `<div class="cvss-cve-row">
            <span class="cvss-cve-label">CVEs:</span>
            ${r.cveIds.map(c => `<span class="cvss-cve-chip">${escHtml(c)}</span>`).join('')}
          </div>` : ''}
          <p class="cvss-detail-source-note">${t('cvss_sourceNote')} — <a href="https://www.first.org/cvss/" target="_blank" rel="noopener" style="color:var(--accent)">FIRST.org</a></p>
        </div>`
      })() : ''}

      <div class="risk-detail-grid">
        <div class="risk-detail-section">
          <h4>${t('risk_descHeading')}</h4>
          <p style="white-space:pre-wrap;font-size:.88rem">${escHtml(r.description || '—')}</p>
          <div class="risk-detail-row"><label>${t('risk_threat')}</label><span>${escHtml(r.threat || '—')}</span></div>
          <div class="risk-detail-row"><label>${t('risk_vulnerability')}</label><span>${escHtml(r.vulnerability || '—')}</span></div>
          ${r.mitigationNotes ? `<div class="risk-detail-row risk-detail-mitigation">
            <label>${t('risk_mitigation')}</label>
            <span>${escHtml(r.mitigationNotes)}</span>
          </div>` : ''}
        </div>
        <div class="risk-detail-section">
          <h4>${t('risk_assessment')}</h4>
          <div class="risk-detail-row"><label>${t('col_category')}</label><span>${escHtml(riskCatLabel(cat)||r.category)}</span></div>
          <div class="risk-detail-row"><label>${t('risk_probability')}</label><span>${r.probability} / 5</span></div>
          <div class="risk-detail-row"><label>${t('risk_impact')}</label><span>${r.impact} / 5</span></div>
          <div class="risk-detail-row"><label>${t('risk_scoreCol')}</label><span><strong>${r.score}</strong> — <span class="risk-badge ${lv.cls}">${lv.label}</span></span></div>
          <div class="risk-detail-row"><label>${t('risk_treatmentOpt')}</label><span>${escHtml(riskTreatmentLabel(tr)||r.treatmentOption)}</span></div>
          <div class="risk-detail-row"><label>${t('col_status')}</label><span class="risk-status-badge risk-st-${r.status}">${st?.label||r.status}</span></div>
          <div class="risk-detail-row"><label>${t('ui_owner')}</label><span>${escHtml(r.owner||'—')}</span></div>
          <div class="risk-detail-row"><label>${t('col_dueDate')}</label><span>${r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</span></div>
          <div class="risk-detail-row"><label>${t('ui_review')}</label><span>${r.reviewDate ? new Date(r.reviewDate).toLocaleDateString('de-DE') : '—'}</span></div>
        </div>
      </div>

      <div class="risk-detail-section" style="margin-top:20px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <h4 style="margin:0;flex:1;">${t('risk_treatmentsTab')} (${(r.treatmentPlans||[]).length})</h4>
          ${canManageRisks() ? `<button class="btn btn-primary btn-sm" onclick="openTreatmentModal('${r.id}',null)">
            <i class="ph ph-plus"></i> ${t('risk_measure')}
          </button>` : ''}
        </div>
        <div id="riskDetailTps">
          ${(r.treatmentPlans||[]).length === 0
            ? `<p style="color:var(--text-subtle);font-size:13px;">${t('risk_noMeasures')}</p>`
            : r.treatmentPlans.map(tp => {
                _tpCache[tp.id] = { ...tp, riskId: r.id }
                return `<div class="risk-tp-card">
                  <div class="risk-tp-header">
                    <strong>${escHtml(tp.title)}</strong>
                    <span class="risk-tp-status risk-tp-${tp.status}">${tpStatusLabel[tp.status]||tp.status}</span>
                    ${canManageRisks() ? `
                      <button class="btn btn-secondary btn-sm" onclick="openTreatmentModal('${r.id}','${tp.id}')"><i class="ph ph-pencil"></i></button>
                      <button class="btn btn-sm" style="color:var(--danger-text)" onclick="deleteTreatment('${r.id}','${tp.id}')"><i class="ph ph-trash"></i></button>
                    ` : ''}
                  </div>
                  <div class="risk-tp-meta">
                    ${escHtml(tp.description||'')}
                    ${tp.responsible ? `· <i class="ph ph-user"></i> ${escHtml(tp.responsible)}` : ''}
                    ${tp.orgUnitId ? `· <i class="ph ph-tree-structure"></i> ${escHtml(_ORG_UNITS.find(u=>u.id===tp.orgUnitId)?.name||tp.orgUnitId)}` : ''}
                    ${tp.dueDate ? `· <i class="ph ph-calendar"></i> ${new Date(tp.dueDate).toLocaleDateString('de-DE')}` : ''}
                  </div>
                </div>`
              }).join('')}
        </div>
      </div>

      ${r.linkedControls?.length ? `<div class="risk-detail-section" style="margin-top:16px">
        <h4>${t('risk_linkedControls')} (${r.linkedControls.length})</h4>
        <div class="tmpl-controls-bar" style="display:flex;flex-wrap:wrap;gap:6px;">
          ${r.linkedControls.map(c => `<span class="tmpl-bar-pill">${escHtml(c)}</span>`).join('')}
        </div>
      </div>` : ''}

      ${r.linkedPolicies?.length ? `<div class="risk-detail-section" style="margin-top:16px">
        <h4>${t('risk_linkedPolicies')} (${r.linkedPolicies.length})</h4>
        <div class="tmpl-controls-bar" style="display:flex;flex-wrap:wrap;gap:6px;">
          ${r.linkedPolicies.map(c => `<span class="tmpl-bar-pill">${escHtml(c)}</span>`).join('')}
        </div>
      </div>` : ''}

      ${r.applicableEntities?.length ? `<div class="risk-detail-section" style="margin-top:16px">
        <h4>${t('common_applicableEntities')}</h4>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${r.applicableEntities.map(e => `<span class="tmpl-bar-pill"><i class="ph ph-buildings"></i> ${escHtml(entityMap[e] || e)}</span>`).join('')}
        </div>
      </div>` : ''}
    </div>`
}

async function approveRisk(id) {
  const res = await fetch(`/risks/${id}/approve`, { method: 'POST', headers: apiHeaders() })
  if (!res.ok) return alert(t('risk_approvalFailed'))
  await openRiskDetail(id)
}

// ── Scan-Import Upload (Admin Wartung) ────────────────────────────────────────
async function scanImportUpload(formEl) {
  const file     = formEl.querySelector('#scanImportFile').files[0]
  const entityId = formEl.querySelector('#scanImportEntity')?.value || ''
  const scanRef  = formEl.querySelector('#scanImportRef')?.value || ''
  if (!file) return alert(t('file_selectRequired'))

  const fd = new FormData()
  fd.append('file', file)
  if (entityId) fd.append('entityId', entityId)
  if (scanRef)  fd.append('scanRef', scanRef)

  const btn = formEl.querySelector('#scanImportBtn')
  btn.disabled = true
  btn.textContent = t('importing')

  try {
    const res  = await fetch('/admin/scan-import/upload', { method: 'POST', headers: { Authorization: apiHeaders().Authorization }, body: fd })
    const data = await res.json()
    if (!res.ok) { alert(t('error') + ': ' + (data.error || res.status)); return }
    const resultEl = document.getElementById('scanImportResult')
    if (resultEl) resultEl.innerHTML = `
      <div class="scan-import-result ok">
        <strong>${t('import_success')}</strong><br>
        ${t('import_findingsFound')}: ${data.findings} &nbsp;|&nbsp;
        ${t('import_clusteredRisks')}: ${data.clusters} &nbsp;|&nbsp;
        ${t('import_created')}: <strong>${data.created}</strong> &nbsp;|&nbsp;
        ${t('import_skippedDuplicates')}: ${data.skipped}
        <br><small>${t('import_method')}: ${data.parseMethod?.toUpperCase()}</small>
      </div>`
  } catch (e) {
    alert(t('err_network') + ': ' + e.message)
  } finally {
    btn.disabled = false
    btn.textContent = t('import_action')
  }
}

// ── Risk Create/Edit – Vollseite ──

let _riskEditId = null   // null = neu, string = bearbeiten

async function openRiskModal(id) {
  _riskEditId = id || null
  let risk = null
  if (id) {
    const res = await fetch(`/risks/${id}`, { headers: apiHeaders() })
    if (res.ok) risk = await res.json()
  }

  const entRes = await fetch('/entities/tree', { headers: apiHeaders() })
  const entityTree = entRes.ok ? await entRes.json() : []
  const entities = [] // flat list for submit, built from tree
  ;(function flatten(nodes) { for (const n of nodes) { entities.push(n); flatten(n.children||[]) } })(entityTree)

  const catOpts = RISK_CATS.map(c =>
    `<option value="${c.id}" ${risk?.category===c.id?'selected':''}>${c.label}</option>`).join('')
  const trOpts = RISK_TREATMENTS.map(t =>
    `<option value="${t.id}" ${risk?.treatmentOption===t.id?'selected':''}>${t.label}</option>`).join('')
  const stOpts = RISK_STATUSES.map(s =>
    `<option value="${s.id}" ${risk?.status===s.id?'selected':''}>${s.label}</option>`).join('')
  const selected = new Set(risk?.applicableEntities || [])
  function buildEntityTree(nodes, depth) {
    return nodes.map(n => {
      const childIds = getAllDescendantIds(n)
      const allChildrenChecked = childIds.length > 0 && childIds.every(id => selected.has(id))
      const someChildrenChecked = childIds.some(id => selected.has(id))
      const isChecked = selected.has(n.id) || (n.type === 'holding' && allChildrenChecked)
      const isIndet  = n.type === 'holding' && someChildrenChecked && !allChildrenChecked
      const icon = n.type === 'holding' ? 'ph-building' : 'ph-office-chair'
      const children = (n.children||[]).length ? `<div class="ent-tree-children">${buildEntityTree(n.children, depth+1)}</div>` : ''
      return `
        <div class="ent-tree-node" data-id="${n.id}" data-type="${n.type}">
          <label class="ent-tree-label ${n.type === 'holding' ? 'ent-tree-holding' : ''}">
            <input type="checkbox" class="ent-tree-cb" value="${n.id}"
              data-children='${JSON.stringify(childIds)}'
              ${isChecked ? 'checked' : ''}
              onchange="riskEntityCascade(this)">
            <i class="ph ${icon}"></i>
            <span>${escHtml(n.name)}</span>
            ${n.shortCode ? `<span class="picker-id">${n.shortCode}</span>` : ''}
          </label>
          ${children}
        </div>`
    }).join('')
  }
  function getAllDescendantIds(node) {
    const ids = []
    for (const c of node.children||[]) { ids.push(c.id); ids.push(...getAllDescendantIds(c)) }
    return ids
  }
  const entTreeHtml = entityTree.length ? buildEntityTree(entityTree, 0) : ''
  const scaleOpts = n => [1,2,3,4,5].map(v =>
    `<option value="${v}" ${risk?.[n]===v?'selected':''}>${v}</option>`).join('')

  // Vollseite: riskContainer tauschen
  dom('riskContainer')?.remove()
  const container = document.createElement('div')
  container.id = 'riskContainer'
  dom('editor').appendChild(container)

  container.innerHTML = `
    <div class="risk-fullpage">
      <div class="risk-header">
        <button class="btn btn-secondary btn-sm" onclick="renderRisk()">
          <i class="ph ph-arrow-left"></i> ${t('common_back')}
        </button>
        <h2><i class="ph ph-warning"></i> ${risk ? t('risk_editRisk') : t('risk_new')}</h2>
      </div>
      <div class="risk-form-body">
        <div class="risk-form-grid">

          <div class="risk-form-card risk-form-full">
            <h3 class="risk-form-section-title"><i class="ph ph-text-align-left"></i> ${t('asset_basicInfo')}</h3>
            <div class="risk-form-row">
              <div class="risk-form-field risk-form-wide">
                <label class="form-label">${t('col_title')} *</label>
                <input id="rModalTitle" class="form-input" value="${escHtml(risk?.title||'')}" placeholder="${t('risk_titlePh')}" />
              </div>
              <div class="risk-form-field">
                <label class="form-label">${t('col_category')}</label>
                <select id="rModalCat" class="select">${catOpts}</select>
              </div>
            </div>
            <div class="risk-form-field" style="margin-top:10px;">
              <label class="form-label">${t('ui_description')}</label>
              <textarea id="rModalDesc" class="form-textarea" rows="3" placeholder="${t('risk_descPh')}">${escHtml(risk?.description||'')}</textarea>
            </div>
          </div>

          <div class="risk-form-card">
            <h3 class="risk-form-section-title"><i class="ph ph-bug"></i> ${t('risk_threatVulnTitle')}</h3>
            <div class="risk-form-field">
              <label class="form-label">${t('risk_threat')}</label>
              <textarea id="rModalThreat" class="form-textarea" rows="3" placeholder="${t('risk_threatPh')}">${escHtml(risk?.threat||'')}</textarea>
            </div>
            <div class="risk-form-field" style="margin-top:10px;">
              <label class="form-label">${t('risk_vulnerability')}</label>
              <textarea id="rModalVuln" class="form-textarea" rows="3" placeholder="${t('risk_vulnPh')}">${escHtml(risk?.vulnerability||'')}</textarea>
            </div>
          </div>

          <div class="risk-form-card">
            <h3 class="risk-form-section-title"><i class="ph ph-chart-line-up"></i> ${t('risk_assessment')}</h3>
            <div class="risk-form-row">
              <div class="risk-form-field">
                <label class="form-label">${t('risk_likelihoodFull')}</label>
                <select id="rModalProb" class="select" onchange="updateRiskScorePreview()">${scaleOpts('probability')}</select>
              </div>
              <div class="risk-form-field">
                <label class="form-label">${t('risk_impactFull')}</label>
                <select id="rModalImpact" class="select" onchange="updateRiskScorePreview()">${scaleOpts('impact')}</select>
              </div>
            </div>
            <div id="rScorePreview" class="risk-score-preview" style="margin-top:12px;"></div>
            <div class="risk-form-field" style="margin-top:12px;">
              <label class="form-label">${t('risk_treatmentOpt')}</label>
              <select id="rModalTreat" class="select">${trOpts}</select>
            </div>
            <div class="risk-form-field" style="margin-top:10px;">
              <label class="form-label">${t('risk_mitigationMeasures')}</label>
              <textarea id="rModalMitigation" class="form-textarea" rows="4"
                placeholder="${t('risk_mitigationPh')}">${escHtml(risk?.mitigationNotes||'')}</textarea>
            </div>
          </div>

          <div class="risk-form-card">
            <h3 class="risk-form-section-title"><i class="ph ph-clock"></i> ${t('risk_controlDatesTitle')}</h3>
            <div class="risk-form-field">
              <label class="form-label">${t('col_status')}</label>
              <select id="rModalStatus" class="select">${stOpts}</select>
            </div>
            <div class="risk-form-field" style="margin-top:10px;">
              <label class="form-label">${t('risk_ownerResponsible')}</label>
              <input id="rModalOwner" class="form-input" value="${escHtml(risk?.owner||'')}" placeholder="${t('risk_nameRolePh')}" />
            </div>
            <div class="risk-form-row" style="margin-top:10px;">
              <div class="risk-form-field">
                <label class="form-label">${t('col_dueDate')}</label>
                <input id="rModalDue" class="form-input" type="date" value="${risk?.dueDate||''}" />
              </div>
              <div class="risk-form-field">
                <label class="form-label">${t('risk_reviewDate')}</label>
                <input id="rModalReview" class="form-input" type="date" value="${risk?.reviewDate||''}" />
              </div>
            </div>
          </div>

          ${entityTree.length ? `
          <div class="risk-form-card risk-form-full">
            <h3 class="risk-form-section-title"><i class="ph ph-buildings"></i> ${t('common_applicableEntities')}</h3>
            <div class="ent-tree-wrap">
              <label class="ent-tree-all-label">
                <input type="checkbox" id="rEntitySelectAll" onchange="riskEntitySelectAll(this)">
                <strong>${t('risk_selectAllEntities')}</strong>
              </label>
              <div class="ent-tree-divider"></div>
              <div class="ent-tree-root">${entTreeHtml}</div>
            </div>
          </div>` : ''}

          <div class="risk-form-card risk-form-full">
            <h3 class="risk-form-section-title"><i class="ph ph-link"></i> ${t('risk_linkedControlsPolicies')}</h3>
            ${renderLinksBlock('risk', risk?.linkedControls||[], risk?.linkedPolicies||[])}
          </div>

        </div>

        <div class="risk-form-footer">
          <p id="rModalError" style="color:var(--danger-text);font-size:13px;display:none;flex:1;margin:0;"></p>
          <button class="btn btn-secondary" onclick="renderRisk()">${t('ui_cancel')}</button>
          <button class="btn btn-primary btn-lg" onclick="submitRiskForm()">
            <i class="ph ph-floppy-disk"></i> ${t('risk_saveRisk')}
          </button>
        </div>
      </div>
    </div>`

  updateRiskScorePreview()
  initLinkPickers('risk')
}

function riskEntityCascade(cb) {
  // Cascade down: check/uncheck all children
  const childIds = JSON.parse(cb.dataset.children || '[]')
  childIds.forEach(id => {
    const child = document.querySelector(`.ent-tree-cb[value="${id}"]`)
    if (child) child.checked = cb.checked
  })
  // Update indeterminate state on all parent checkboxes
  document.querySelectorAll('.ent-tree-cb').forEach(el => {
    const kids = JSON.parse(el.dataset.children || '[]')
    if (!kids.length) return
    const checkedCount = kids.filter(id => {
      const c = document.querySelector(`.ent-tree-cb[value="${id}"]`)
      return c && c.checked
    }).length
    el.indeterminate = checkedCount > 0 && checkedCount < kids.length
    if (checkedCount === kids.length) el.checked = true
    if (checkedCount === 0) el.checked = false
  })
  _riskEntitySyncAllCheckbox()
}

function riskEntitySelectAll(allCb) {
  document.querySelectorAll('.ent-tree-cb').forEach(cb => {
    cb.checked = allCb.checked
    cb.indeterminate = false
  })
}

function _riskEntitySyncAllCheckbox() {
  const allCb = dom('rEntitySelectAll')
  if (!allCb) return
  const all = [...document.querySelectorAll('.ent-tree-cb')]
  const checked = all.filter(c => c.checked).length
  allCb.checked = checked === all.length && all.length > 0
  allCb.indeterminate = checked > 0 && checked < all.length
}

function updateRiskScorePreview() {
  const p = parseInt(dom('rModalProb')?.value) || 1
  const i = parseInt(dom('rModalImpact')?.value) || 1
  const score = p * i
  const level = score <= 4 ? 'low' : score <= 9 ? 'medium' : score <= 14 ? 'high' : 'critical'
  const cfg = RISK_LEVEL_CFG[level]
  const el = dom('rScorePreview')
  if (!el) return
  el.innerHTML = `
    <div class="risk-score-preview-inner">
      <span class="risk-score-preview-label">${t('risk_scorePreviewLabel')}</span>
      <span class="risk-score-preview-val">${p} × ${i} = <strong>${score}</strong></span>
      <span class="risk-badge ${cfg.cls}">${cfg.label}</span>
    </div>`
}

async function submitRiskForm() {
  const errEl = dom('rModalError')
  const show = msg => { errEl.textContent = msg; errEl.style.display = '' }

  const title = dom('rModalTitle')?.value.trim()
  if (!title) return show(t('risk_titleRequiredErr'))

  const owner = dom('rModalOwner')?.value.trim()
  if (!owner) return show(t('risk_ownerRequiredErr'))

  const applicableEntities = [...document.querySelectorAll('#riskContainer .ent-tree-cb:checked')]
    .map(cb => cb.value)

  const body = {
    title,
    description:       dom('rModalDesc')?.value    || '',
    threat:            dom('rModalThreat')?.value   || '',
    vulnerability:     dom('rModalVuln')?.value     || '',
    category:          dom('rModalCat')?.value,
    probability:       parseInt(dom('rModalProb')?.value)   || 1,
    impact:            parseInt(dom('rModalImpact')?.value) || 1,
    treatmentOption:   dom('rModalTreat')?.value,
    mitigationNotes:   dom('rModalMitigation')?.value || '',
    status:            dom('rModalStatus')?.value,
    owner,
    dueDate:           dom('rModalDue')?.value      || null,
    reviewDate:        dom('rModalReview')?.value   || null,
    applicableEntities,
    linkedControls:    getLinkedValues('risk', 'ctrl'),
    linkedPolicies:    getLinkedValues('risk', 'pol')
  }

  const editId = _riskEditId
  const url    = editId ? `/risks/${editId}` : '/risks'
  const method = editId ? 'PUT' : 'POST'
  const res = await fetch(url, { method, headers: apiHeaders(), body: JSON.stringify(body) })
  if (!res.ok) { const e = await res.json(); return show(e.error || t('err_saveFailed')) }
  const saved = await res.json()
  _riskEditId = null
  if (editId) await openRiskDetail(saved.id)
  else renderRisk()
}

async function deleteRisk(id) {
  if (!confirm('Delete risk?')) return
  const res = await fetch(`/risks/${id}`, { method: 'DELETE', headers: apiHeaders('admin') })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  switchRiskTab(_riskTab)
}

// ── Treatment Plan Modal ──

async function openTreatmentModal(riskId, tpOrId) {
  // tpOrId can be null (new), a tp ID string (edit via cache), or a tp object
  let tp = null
  if (tpOrId) {
    tp = (typeof tpOrId === 'string') ? (_tpCache[tpOrId] || null) : tpOrId
  }
  document.getElementById('treatmentModal')?.remove()
  const ouOpts = await getOrgUnitOptions(tp?.orgUnitId || '')
  const html = `
    <div id="treatmentModal" class="modal" style="visibility:visible;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title"><i class="ph ph-list-checks"></i> ${tp ? t('risk_editMeasure') : t('risk_newMeasure')}</h3>
          <button class="modal-close" onclick="document.getElementById('treatmentModal').remove()"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label class="form-label">${t('col_title')} *</label>
            <input id="tpTitle" class="form-input" value="${escHtml(tp?.title||'')}" placeholder="${t('risk_measureTitlePh')}" />
          </div>
          <div>
            <label class="form-label">${t('ui_description')}</label>
            <textarea id="tpDesc" class="form-textarea" rows="3">${escHtml(tp?.description||'')}</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="form-label">${t('risk_responsiblePerson')}</label>
              <input id="tpResp" class="form-input" value="${escHtml(tp?.responsible||'')}" placeholder="${t('risk_nameRolePh')}" />
            </div>
            <div>
              <label class="form-label">${t('asset_responsibleUnit')}</label>
              <select id="tpOrgUnit" class="select">${ouOpts}</select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="form-label">${t('col_dueDate')}</label>
              <input id="tpDue" class="form-input" type="date" value="${tp?.dueDate||''}" />
            </div>
            <div>
              <label class="form-label">${t('col_status')}</label>
              <select id="tpStatus" class="select">
                <option value="open"        ${tp?.status==='open'?'selected':''}>${t('findings_statusOpen')}</option>
                <option value="in_progress" ${tp?.status==='in_progress'?'selected':''}>${t('findings_statusInProgress')}</option>
                <option value="completed"   ${tp?.status==='completed'?'selected':''}>${t('risk_statusCompleted')}</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('treatmentModal').remove()">${t('ui_cancel')}</button>
          <button class="btn btn-primary" onclick="submitTreatmentModal('${riskId}','${tp?.id||''}')">
            <i class="ph ph-floppy-disk"></i> ${t('ui_save')}
          </button>
        </div>
      </div>
    </div>`
  document.body.insertAdjacentHTML('beforeend', html)
}

async function submitTreatmentModal(riskId, tpId) {
  const title = dom('tpTitle')?.value.trim()
  if (!title) { alert('Title is required'); return }
  const body = {
    title,
    description:  dom('tpDesc')?.value    || '',
    responsible:  dom('tpResp')?.value    || '',
    orgUnitId:    dom('tpOrgUnit')?.value  || null,
    dueDate:      dom('tpDue')?.value     || null,
    status:       dom('tpStatus')?.value  || 'open'
  }
  const url    = tpId ? `/risks/${riskId}/treatments/${tpId}` : `/risks/${riskId}/treatments`
  const method = tpId ? 'PUT' : 'POST'
  const res = await fetch(url, { method, headers: apiHeaders(), body: JSON.stringify(body) })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  document.getElementById('treatmentModal')?.remove()
  await openRiskDetail(riskId)
}

async function deleteTreatment(riskId, tpId) {
  if (!confirm('Delete treatment?')) return
  const res = await fetch(`/risks/${riskId}/treatments/${tpId}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  await openRiskDetail(riskId)
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ════════════════════════════════════════════════════════════════
// GDPR & Datenschutz
// ════════════════════════════════════════════════════════════════

let _gdprTab          = 'overview'
let _gdprEntityFilter = ''
let _gdprEntities     = []
let _gdprTomCategory  = ''

const GDPR_LEGAL_BASES = [
  { id: 'consent',              get label() { return t('gdprl_consent') } },
  { id: 'contract',             get label() { return t('gdprl_contract') } },
  { id: 'legal_obligation',     get label() { return t('gdprl_legalObligation') } },
  { id: 'vital_interests',      get label() { return t('gdprl_vitalInterests') } },
  { id: 'public_task',          get label() { return t('gdprl_publicTask') } },
  { id: 'legitimate_interest',  get label() { return t('gdprl_legitimateInterest') } },
]
let GDPR_DATA_CATS = ['name','email','phone','address','health','biometric','financial','location','other']
let GDPR_SUBJECT_TYPES = [
  { id:'customers', label:'Customers' },
  { id:'employees', label:'Employees' },
  { id:'contractors', label:'Contractors' },
  { id:'website_visitors', label:'Website Visitors' },
  { id:'minors', label:'Minors' },
]
const GDPR_TRANSFER_MECHS = [
  { id:'', label:'—' },
  { id:'adequacy', get label() { return t('gdprl_adequacy') } },
  { id:'scc', get label() { return t('gdprl_scc') } },
  { id:'bcr', get label() { return t('gdprl_bcr') } },
  { id:'other', get label() { return t('gdprl_otherSafeguards') } },
]
const GDPR_AV_STATUSES = [
  { id:'draft',       get label() { return t('legl_stDraft') } },
  { id:'negotiation', get label() { return t('gdprl_negotiation') } },
  { id:'signed',      get label() { return t('legl_stSigned') } },
  { id:'active',      get label() { return t('legl_stActive') } },
  { id:'terminated',  get label() { return t('gdprl_terminated') } },
]
const GDPR_VVT_STATUSES = [
  { id:'draft',    get label() { return t('legl_stDraft') } },
  { id:'approved', get label() { return t('govl_statApproved') } },
  { id:'archived', get label() { return t('legl_stArchived') } },
]
const GDPR_DSFA_STATUSES = [
  { id:'draft',    get label() { return t('legl_stDraft') } },
  { id:'review',   get label() { return t('legl_stReview') } },
  { id:'approved', get label() { return t('govl_statApproved') } },
  { id:'archived', get label() { return t('legl_stArchived') } },
]
const GDPR_INC_TYPES = [
  { id:'unauthorized_access', get label() { return t('gdprl_unauthorizedAccess') } },
  { id:'loss',                get label() { return t('gdprl_dataLoss') } },
  { id:'deletion',            get label() { return t('gdprl_unintentionalDeletion') } },
  { id:'theft',               get label() { return t('gdprl_theft') } },
  { id:'ransomware',          get label() { return t('gdprl_ransomware') } },
  { id:'other',               get label() { return t('ui_other') } },
]
const GDPR_INC_STATUSES = [
  { id:'detected',  get label() { return t('gdprl_detected') } },
  { id:'contained', get label() { return t('gdprl_contained') } },
  { id:'reported',  get label() { return t('gdprl_reported') } },
  { id:'closed',    get label() { return t('gdprl_closed') } },
]
const GDPR_DSAR_TYPES = [
  { id:'access',            get label() { return t('gdprl_access') } },
  { id:'rectification',     get label() { return t('gdprl_rectification') } },
  { id:'erasure',           get label() { return t('gdprl_erasure') } },
  { id:'restriction',       get label() { return t('gdprl_restriction') } },
  { id:'portability',       get label() { return t('gdprl_portability') } },
  { id:'objection',         get label() { return t('gdprl_objection') } },
  { id:'review_automated',  get label() { return t('gdprl_reviewAutomated') } },
]
const GDPR_DSAR_STATUSES = [
  { id:'received',    get label() { return t('gdprl_received') } },
  { id:'in_progress', get label() { return t('gdprl_inProgress') } },
  { id:'extended',    get label() { return t('gdprl_extended60') } },
  { id:'completed',   get label() { return t('govl_statCompleted') } },
  { id:'refused',     get label() { return t('gdprl_refused') } },
]
const GDPR_TOM_CATS = [
  { id:'access',          get label() { return t('gdprl_accessControl') } },
  { id:'encryption',      get label() { return t('gdprl_encryption') } },
  { id:'logging',         get label() { return t('gdprl_logging') } },
  { id:'network',         get label() { return t('gdprl_networkSecurity') } },
  { id:'application',     get label() { return t('gdprl_appSecurity') } },
  { id:'backup',          get label() { return t('gdprl_backupRecovery') } },
  { id:'organizational',  get label() { return t('gdprl_organizational') } },
  { id:'training',        get label() { return t('gdprl_training') } },
  { id:'retention',       get label() { return t('gdprl_dataRetention') } },
]
const GDPR_TOM_STATUSES = [
  { id:'planned',     get label() { return t('govl_statPlanned') } },
  { id:'in_progress', get label() { return t('gdprl_inProgress') } },
  { id:'implemented', get label() { return t('gdprl_tomImplemented') } },
  { id:'verified',    get label() { return t('gdprl_tomVerified') } },
]
const GDPR_RISK_LEVELS = [
  { id:'low',      get label() { return t('riskl_low') } },
  { id:'medium',   get label() { return t('riskl_medium') } },
  { id:'high',     get label() { return t('riskl_high') } },
  { id:'critical', get label() { return t('riskl_critical') } },
]

const GDPR_ART28_ITEMS = [
  { key:'instructionsOnly',     get label() { return t('gdprl_art28a') } },
  { key:'confidentiality',      get label() { return t('gdprl_art28b') } },
  { key:'security',             get label() { return t('gdprl_art28c') } },
  { key:'subProcessorApproval', get label() { return t('gdprl_art28d') } },
  { key:'assistanceRights',     get label() { return t('gdprl_art28e') } },
  { key:'deletionReturn',       get label() { return t('gdprl_art28f') } },
  { key:'auditRights',          get label() { return t('gdprl_art28h1') } },
  { key:'cooperation',          get label() { return t('gdprl_art28h2') } },
]

function gdprCanEdit()  { return ROLE_RANK[getCurrentRole()] >= 2 }
function gdprCanOwn()   { return ROLE_RANK[getCurrentRole()] >= 3 }
function gdprIsAdmin()  { return getCurrentRole() === 'admin' }
function gdprCanAudit() { return getCurrentRole() === 'auditor' || getCurrentRole() === 'admin' || ROLE_RANK[getCurrentRole()] >= 3 }

// Entity-filter query string helper
function gdprEntityQ() { return _gdprEntityFilter ? `?entity=${_gdprEntityFilter}` : '' }

// ── Main renderer ─────────────────────────────────────────────────

async function renderGDPR() {
  dom('gdprContainer')?.remove()
  const container = document.createElement('div')
  container.id = 'gdprContainer'
  dom('editor').appendChild(container)

  container.innerHTML = `
    <div class="gdpr-fullpage">
      <div class="gdpr-header">
        <h2><i class="ph ph-lock-key"></i> GDPR &amp; Privacy</h2>
        <div class="gdpr-header-actions">
          <select id="gdprEntitySelect" class="select" style="font-size:.82rem" onchange="_gdprEntityFilter=this.value;switchGdprTab(_gdprTab)">
            <option value="">${t('filter_allEntities')}</option>
          </select>
        </div>
      </div>
      <div class="gdpr-tab-bar">
        <button class="gdpr-tab" data-tab="overview"   onclick="switchGdprTab('overview')"><i class="ph ph-gauge"></i> ${t('gdprtab_overview')}</button>
        <button class="gdpr-tab" data-tab="vvt"        onclick="switchGdprTab('vvt')"><i class="ph ph-list-bullets"></i> ${t('gdprtab_vvt')}</button>
        <button class="gdpr-tab" data-tab="av"         onclick="switchGdprTab('av')"><i class="ph ph-handshake"></i> ${t('gdprtab_av')}</button>
        <button class="gdpr-tab" data-tab="dsfa"       onclick="switchGdprTab('dsfa')"><i class="ph ph-magnifying-glass"></i> ${t('gdprtab_dsfa')}</button>
        <button class="gdpr-tab" data-tab="incidents"  onclick="switchGdprTab('incidents')"><i class="ph ph-siren"></i> ${t('gdprtab_incidents')}</button>
        <button class="gdpr-tab" data-tab="dsar"       onclick="switchGdprTab('dsar')"><i class="ph ph-user-circle"></i> ${t('gdprtab_dsar')}</button>
        <button class="gdpr-tab" data-tab="toms"       onclick="switchGdprTab('toms')"><i class="ph ph-shield"></i> ${t('gdprtab_toms')}</button>
        <button class="gdpr-tab" data-tab="deletion"   onclick="switchGdprTab('deletion')"><i class="ph ph-trash"></i> ${t('gdprtab_deletion')}</button>
        ${gdprCanOwn() ? `<button class="gdpr-tab" data-tab="dsb" onclick="switchGdprTab('dsb')"><i class="ph ph-identification-badge"></i> ${t('gdprtab_dpo')}</button>` : ''}
      </div>
      <div class="gdpr-content" id="gdprTabContent"></div>
    </div>`

  // Tab-Content sequenziell laden (wie renderRisk)
  await switchGdprTab(_gdprTab)

  // Entity-Select befüllen: fire-and-forget nach Tab-Render
  ;(async () => {
    if (_gdprEntities.length === 0) {
      try {
        const r = await fetch('/entities', { headers: apiHeaders() })
        if (r.ok) _gdprEntities = await r.json()
      } catch {}
    }
    const sel = document.getElementById('gdprEntitySelect')
    if (sel && _gdprEntities.length > 0) {
      _gdprEntities.forEach(e => {
        const opt = document.createElement('option')
        opt.value = e.id
        opt.textContent = e.name
        if (_gdprEntityFilter === e.id) opt.selected = true
        sel.appendChild(opt)
      })
    }
  })()
}

async function switchGdprTab(tab) {
  _gdprTab = tab
  document.querySelectorAll('.gdpr-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab))
  const content = dom('gdprTabContent')
  if (!content) return
  content.innerHTML = `<p class="report-loading">${t('ui_loading')}</p>`
  try {
    if (tab === 'overview')  await renderGdprOverview(content)
    if (tab === 'vvt')       await renderGdprVvt(content)
    if (tab === 'av')        await renderGdprAv(content)
    if (tab === 'dsfa')      await renderGdprDsfa(content)
    if (tab === 'incidents') await renderGdprIncidents(content)
    if (tab === 'dsar')      await renderGdprDsar(content)
    if (tab === 'toms')      await renderGdprToms(content)
    if (tab === 'deletion')  await renderGdprDeletion(content)
    if (tab === 'dsb')       await renderGdprDsb(content)
  } catch (e) {
    if (content.isConnected)
      content.innerHTML = `<p style="color:var(--danger-text);padding:16px"><i class="ph ph-warning"></i> Error loading tab: ${e.message}</p>`
  }
}

// ── Overview / Dashboard ──────────────────────────────────────────

async function renderGdprOverview(el) {
  const r = await fetch('/gdpr/dashboard' + gdprEntityQ(), { headers: apiHeaders() })
  const s = r.ok ? await r.json() : null
  if (!s) { el.innerHTML = `<p class="gdpr-empty">${t('ui_errLoadDashboard')}</p>`; return }

  const tomPct = s.toms.total > 0 ? Math.round((s.toms.implemented / s.toms.total) * 100) : 0
  const alerts = []
  if (s.incidents.missed72h > 0) alerts.push(`<div class="gdpr-alert gdpr-alert-error"><i class="ph ph-warning"></i> <strong>${s.incidents.missed72h}</strong> data breach(es): 72-hour reporting deadline exceeded!</div>`)
  if (s.dsar.overdue > 0)        alerts.push(`<div class="gdpr-alert gdpr-alert-error"><i class="ph ph-clock"></i> <strong>${s.dsar.overdue}</strong> data subject request(s) overdue!</div>`)
  if (s.vvt.noLegal > 0)         alerts.push(`<div class="gdpr-alert gdpr-alert-warn"><i class="ph ph-warning-circle"></i> <strong>${s.vvt.noLegal}</strong> RoPA entries without legal basis.</div>`)
  if (!s.dsbSet)                  alerts.push(`<div class="gdpr-alert gdpr-alert-info"><i class="ph ph-info"></i> No Data Protection Officer (DPO) configured.</div>`)

  el.innerHTML = `
    ${alerts.length ? `<div class="gdpr-alerts">${alerts.join('')}</div>` : ''}
    <div class="gdpr-kpi-grid">
      <div class="gdpr-kpi-card"><div class="kpi-value">${s.vvt.total}</div><div class="kpi-label">${t('gdpr_ropaEntries')}</div></div>
      <div class="gdpr-kpi-card ${s.vvt.highRisk > 0 ? 'kpi-warn' : ''}"><div class="kpi-value">${s.vvt.highRisk}</div><div class="kpi-label">${t('gdpr_highRiskRopa')}</div></div>
      <div class="gdpr-kpi-card"><div class="kpi-value">${s.av.total}</div><div class="kpi-label">${t('gdpr_dpaContracts')}</div></div>
      <div class="gdpr-kpi-card ${s.av.active < s.av.total ? 'kpi-warn' : 'kpi-ok'}"><div class="kpi-value">${s.av.active}</div><div class="kpi-label">${t('gdpr_dpaActiveSigned')}</div></div>
      <div class="gdpr-kpi-card ${s.dsar.open > 0 ? 'kpi-warn' : 'kpi-ok'}"><div class="kpi-value">${s.dsar.open}</div><div class="kpi-label">${t('gdpr_openDsars')}</div></div>
      <div class="gdpr-kpi-card ${s.dsar.overdue > 0 ? 'kpi-danger' : ''}"><div class="kpi-value">${s.dsar.overdue}</div><div class="kpi-label">${t('gdpr_overdueDsars')}</div></div>
      <div class="gdpr-kpi-card ${s.incidents.open > 0 ? 'kpi-warn' : ''}"><div class="kpi-value">${s.incidents.open}</div><div class="kpi-label">${t('gdpr_openBreaches')}</div></div>
      <div class="gdpr-kpi-card ${s.incidents.missed72h > 0 ? 'kpi-danger' : ''}"><div class="kpi-value">${s.incidents.missed72h}</div><div class="kpi-label">72h Deadline Missed</div></div>
      <div class="gdpr-kpi-card ${tomPct >= 80 ? 'kpi-ok' : tomPct >= 50 ? 'kpi-warn' : 'kpi-danger'}"><div class="kpi-value">${tomPct}%</div><div class="kpi-label">${t('gdpr_tomsImplemented')}</div></div>
      <div class="gdpr-kpi-card ${s.dsbSet ? 'kpi-ok' : 'kpi-warn'}"><div class="kpi-value">${s.dsbSet ? '✓' : '—'}</div><div class="kpi-label">${t('gdpr_dpoAppointed')}</div></div>
    </div>`
}

// ── VVT ───────────────────────────────────────────────────────────

async function renderGdprVvt(el) {
  const r = await fetch('/gdpr/vvt' + gdprEntityQ(), { headers: apiHeaders() })
  const list = r.ok ? await r.json() : []

  el.innerHTML = `
    <div class="gdpr-filter-bar">
      ${gdprCanEdit() ? `<button class="btn btn-primary btn-sm" onclick="openVvtForm()"><i class="ph ph-plus"></i> ${t('ui_newEntry')}</button>` : ''}
      <span class="gdpr-filter-count">${list.length} entries</span>
    </div>
    ${list.length === 0 ? `<p class="gdpr-empty">${t('gdpr_noRopaFound')}</p>` : `
    <table class="gdpr-table">
      <thead><tr>
        <th>${t('col_title')}</th><th>${t('gdpr_legalBasis')}</th><th>${t('gdpr_dataCategories')}</th><th>${t('ui_risk')}</th><th>${t('col_status')}</th><th>${t('ui_owner')}</th><th style="width:80px"></th>
      </tr></thead>
      <tbody>
        ${list.map(v => {
          const lb = GDPR_LEGAL_BASES.find(x => x.id === v.legalBasis)
          const cats = (v.dataCategories || []).slice(0,3).join(', ') + (v.dataCategories?.length > 3 ? '…' : '')
          return `<tr class="gdpr-row" onclick="openVvtForm('${v.id}')">
            <td><strong>${escHtml(v.title)}</strong></td>
            <td style="font-size:.78rem">${escHtml(lb?.label || v.legalBasis)}</td>
            <td style="font-size:.78rem">${escHtml(cats || '—')}</td>
            <td>${v.isHighRisk ? '<span class="gdpr-highrisk-badge"><i class="ph ph-warning"></i> High Risk</span>' : '<span style="color:var(--text-subtle);font-size:.78rem">—</span>'}</td>
            <td><span class="gdpr-status gdpr-st-${v.status}">${GDPR_VVT_STATUSES.find(s=>s.id===v.status)?.label || v.status}</span></td>
            <td style="font-size:.78rem">${escHtml(v.owner || '—')}</td>
            <td onclick="event.stopPropagation()" class="gdpr-actions">
              ${gdprCanEdit() ? `<button class="btn btn-secondary btn-sm" title="Edit" onclick="openVvtForm('${v.id}')"><i class="ph ph-pencil"></i></button>` : ''}
              ${gdprIsAdmin() ? `<button class="btn btn-sm" style="color:var(--danger-text)" title="Delete" onclick="deleteGdprItem('vvt','${v.id}')"><i class="ph ph-trash"></i></button>` : ''}
            </td>
          </tr>`
        }).join('')}
      </tbody>
    </table>`}
  `
}

async function openVvtForm(id = null) {
  let item = null
  if (id) {
    const r = await fetch(`/gdpr/vvt/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }
  const v = item || {}

  const lbOpts = GDPR_LEGAL_BASES.map(l =>
    `<option value="${l.id}" ${v.legalBasis === l.id ? 'selected':''}>${escHtml(l.label)}</option>`).join('')
  const stOpts = GDPR_VVT_STATUSES.map(s =>
    `<option value="${s.id}" ${v.status === s.id ? 'selected':''}>${s.label}</option>`).join('')
  const tmOpts = GDPR_TRANSFER_MECHS.map(m =>
    `<option value="${m.id}" ${v.transferMechanism === m.id ? 'selected':''}>${m.label}</option>`).join('')

  const catChecks = GDPR_DATA_CATS.map(c =>
    `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:.8rem">
       <input type="checkbox" value="${c}" ${(v.dataCategories||[]).includes(c)?'checked':''}> ${c}
     </label>`).join('')
  const subChecks = GDPR_SUBJECT_TYPES.map(s =>
    `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:.8rem">
       <input type="checkbox" value="${s.id}" ${(v.dataSubjectTypes||[]).includes(s.id)?'checked':''}> ${s.label}
     </label>`).join('')
  const entityChecks = _gdprEntities.map(e =>
    `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:.8rem">
       <input type="checkbox" value="${e.id}" ${(v.applicableEntities||[]).includes(e.id)?'checked':''}> ${escHtml(e.name)}
     </label>`).join('')

  document.getElementById('gdprTabContent').innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchGdprTab('vvt')"><i class="ph ph-arrow-left"></i> ${t('ui_back')}</button>
        <h2>${id ? t('gdpr_editRopaEntry') : t('gdpr_newRopaEntry')}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-group"><label class="form-label">${t('ui_nameRequired')}</label>
          <input id="vvtTitle" class="form-input" value="${escHtml(v.title||'')}" placeholder="e.g. Customer Management CRM"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_purposeProcessing')}</label>
          <textarea id="vvtPurpose" class="form-input" rows="2">${escHtml(v.purpose||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('gdpr_legalBasis')}</label>
          <select id="vvtLegal" class="select">${lbOpts}</select></div>
        <div class="form-group"><label class="form-label">${t('gdpr_legalBasisNote')}</label>
          <input id="vvtLegalNote" class="form-input" value="${escHtml(v.legalBasisNote||'')}" placeholder="e.g. Art. 6(1)(b) GDPR"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_dataCategories')}</label>
          <div>${catChecks}</div></div>
        <div class="form-group"><label class="form-label">${t('gdpr_dataSubjects')}</label>
          <div>${subChecks}</div></div>
        <div class="form-group"><label class="form-label">${t('gdpr_recipientsCsv')}</label>
          <input id="vvtRecipients" class="form-input" value="${escHtml((v.recipients||[]).join(', '))}" placeholder="e.g. Tax advisor, HR department"></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="vvtIntlTransfer" ${v.internationalTransfer?'checked':''}> ${t('gdpr_intlTransfer')}
          </label></div>
        <div class="form-group"><label class="form-label">${t('gdpr_transferMechanism')}</label>
          <select id="vvtTransferMech" class="select">${tmOpts}</select></div>
        <div class="form-group"><label class="form-label">${t('gdpr_retentionPeriodText')}</label>
          <input id="vvtRetention" class="form-input" value="${escHtml(v.retentionPeriod||'')}" placeholder="e.g. 7 years (§ 257 HGB)"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_retentionPeriodMonths')}</label>
          <input id="vvtRetentionMonths" type="number" class="form-input" value="${v.retentionMonths||''}" placeholder="e.g. 84"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_deletionProcedure')}</label>
          <textarea id="vvtDeletion" class="form-input" rows="2">${escHtml(v.deletionProcedure||'')}</textarea></div>
        <div class="form-group" style="display:flex;gap:20px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="vvtHighRisk" ${v.isHighRisk?'checked':''}> ${t('gdpr_highRiskDpia')}
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="vvtAutomated" ${v.automatedDecision?'checked':''}> ${t('gdpr_automatedDecision')}
          </label>
        </div>
        <div class="form-group"><label class="form-label">${t('ui_owner')}</label>
          <input id="vvtOwner" class="form-input" value="${escHtml(v.owner||'')}" placeholder="${t('ui_responsiblePersonPh')}"></div>
        <div class="form-group"><label class="form-label">${t('col_status')}</label>
          <select id="vvtStatus" class="select">${stOpts}</select></div>
        ${_gdprEntities.length ? `<div class="form-group"><label class="form-label">${t('ui_applicableEntities')}</label>
          <div>${entityChecks}</div></div>` : ''}
        ${renderLinksBlock('vvt', v.linkedControls||[], v.linkedPolicies||[])}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchGdprTab('vvt')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveVvt(${id ? `'${id}'` : 'null'})">${t('ui_save')}</button>
      </div>
    </div>
  `
  initLinkPickers('vvt')
}

async function saveVvt(id) {
  const title  = document.getElementById('vvtTitle')?.value?.trim()
  if (!title) { alert('Name is required'); return }
  const dataCategories  = [...document.querySelectorAll('#gdprTabContent input[type=checkbox][value]')]
    .filter(cb => cb.checked && GDPR_DATA_CATS.includes(cb.value)).map(cb => cb.value)
  const dataSubjectTypes = [...document.querySelectorAll('#gdprTabContent input[type=checkbox][value]')]
    .filter(cb => cb.checked && GDPR_SUBJECT_TYPES.map(s=>s.id).includes(cb.value)).map(cb => cb.value)
  const applicableEntities = [...document.querySelectorAll('#gdprTabContent input[type=checkbox][value]')]
    .filter(cb => cb.checked && _gdprEntities.map(e=>e.id).includes(cb.value)).map(cb => cb.value)
  const payload = {
    title,
    purpose:           document.getElementById('vvtPurpose')?.value || '',
    legalBasis:        document.getElementById('vvtLegal')?.value,
    legalBasisNote:    document.getElementById('vvtLegalNote')?.value || '',
    dataCategories, dataSubjectTypes,
    recipients:        (document.getElementById('vvtRecipients')?.value || '').split(',').map(s=>s.trim()).filter(Boolean),
    internationalTransfer: document.getElementById('vvtIntlTransfer')?.checked || false,
    transferMechanism: document.getElementById('vvtTransferMech')?.value || '',
    retentionPeriod:   document.getElementById('vvtRetention')?.value || '',
    retentionMonths:   parseInt(document.getElementById('vvtRetentionMonths')?.value) || null,
    deletionProcedure: document.getElementById('vvtDeletion')?.value || '',
    isHighRisk:        document.getElementById('vvtHighRisk')?.checked || false,
    automatedDecision: document.getElementById('vvtAutomated')?.checked || false,
    owner:             document.getElementById('vvtOwner')?.value || '',
    status:            document.getElementById('vvtStatus')?.value || 'draft',
    applicableEntities,
    linkedControls:    getLinkedValues('vvt', 'ctrl'),
    linkedPolicies:    getLinkedValues('vvt', 'pol'),
  }
  const res = await fetch(id ? `/gdpr/vvt/${id}` : '/gdpr/vvt', {
    method: id ? 'PUT' : 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  switchGdprTab('vvt')
}

// ── AV-Verträge ───────────────────────────────────────────────────

async function renderGdprAv(el) {
  const r = await fetch('/gdpr/av' + gdprEntityQ(), { headers: apiHeaders() })
  const list = r.ok ? await r.json() : []

  el.innerHTML = `
    <div class="gdpr-filter-bar">
      ${gdprCanOwn() ? `<button class="btn btn-primary btn-sm" onclick="openAvForm()"><i class="ph ph-plus"></i> ${t('gdpr_newDpaContract')}</button>` : ''}
      <span class="gdpr-filter-count">${list.length} contracts</span>
    </div>
    ${list.length === 0 ? `<p class="gdpr-empty">${t('gdpr_noDpaFound')}</p>` : `
    <table class="gdpr-table">
      <thead><tr>
        <th>${t('gdpr_processor')}</th><th>${t('col_status')}</th><th>${t('ui_signedOn')}</th><th>${t('gdpr_art28Checklist')}</th><th>${t('ui_validUntil')}</th><th style="width:80px"></th>
      </tr></thead>
      <tbody>
        ${list.map(a => {
          const cl = Object.values(a.art28Checklist || {}).filter(Boolean).length
          const st = GDPR_AV_STATUSES.find(s => s.id === a.status)
          return `<tr class="gdpr-row" onclick="openAvForm('${a.id}')">
            <td><strong>${escHtml(a.processorName)}</strong><br><small style="color:var(--text-subtle)">${escHtml(a.title)}</small></td>
            <td><span class="gdpr-status gdpr-st-${a.status}">${st?.label || a.status}</span></td>
            <td style="font-size:.78rem">${a.signatureDate || '—'}</td>
            <td><span style="font-size:.78rem">${cl}/8</span> ${cl === 8 ? '<i class="ph ph-check-circle" style="color:#4ade80"></i>' : ''}</td>
            <td style="font-size:.78rem">${a.effectiveUntil || '—'}</td>
            <td onclick="event.stopPropagation()" class="gdpr-actions">
              ${a.filePath ? `<a href="/gdpr/av/${a.id}/file" target="_blank" class="btn btn-secondary btn-sm" title="Open document"><i class="ph ph-file-pdf"></i></a>` : ''}
              ${gdprCanOwn() ? `<button class="btn btn-secondary btn-sm" title="Edit" onclick="openAvForm('${a.id}')"><i class="ph ph-pencil"></i></button>` : ''}
              ${gdprIsAdmin() ? `<button class="btn btn-sm" style="color:var(--danger-text)" title="Delete" onclick="deleteGdprItem('av','${a.id}')"><i class="ph ph-trash"></i></button>` : ''}
            </td>
          </tr>`
        }).join('')}
      </tbody>
    </table>`}
  `
}

async function openAvForm(id = null) {
  let item = null
  if (id) {
    const r = await fetch(`/gdpr/av/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }
  const a = item || {}
  const cl = a.art28Checklist || {}

  const stOpts = GDPR_AV_STATUSES.map(s => `<option value="${s.id}" ${a.status === s.id ? 'selected':''}>${s.label}</option>`).join('')
  const tmOpts = GDPR_TRANSFER_MECHS.map(m => `<option value="${m.id}" ${a.transferMechanism === m.id ? 'selected':''}>${m.label}</option>`).join('')
  const entityChecks = _gdprEntities.map(e =>
    `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:.8rem">
       <input type="checkbox" value="${e.id}" class="av-entity-cb" ${(a.applicableEntities||[]).includes(e.id)?'checked':''}> ${escHtml(e.name)}
     </label>`).join('')
  const checklistHtml = GDPR_ART28_ITEMS.map(item =>
    `<div class="gdpr-check-item">
       <input type="checkbox" id="cl_${item.key}" ${cl[item.key] ? 'checked':''}>
       <label for="cl_${item.key}">${escHtml(item.label)}</label>
     </div>`).join('')

  document.getElementById('gdprTabContent').innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchGdprTab('av')"><i class="ph ph-arrow-left"></i> ${t('ui_back')}</button>
        <h2>${id ? 'Edit DPA Contract' : 'New DPA Contract'}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-group"><label class="form-label">${t('ui_nameRequired')}</label>
          <input id="avTitle" class="form-input" value="${escHtml(a.title||'')}"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_processorNameReq')}</label>
          <input id="avProcessorName" class="form-input" value="${escHtml(a.processorName||'')}"></div>
        <div class="form-group"><label class="form-label">${t('ui_country')}</label>
          <input id="avCountry" class="form-input" value="${escHtml(a.processorCountry||'')}" placeholder="e.g. DE, IE, US"></div>
        <div class="form-group"><label class="form-label">${t('ui_contactEmail')}</label>
          <input id="avEmail" class="form-input" value="${escHtml(a.processorContactEmail||'')}"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_processingScope')}</label>
          <textarea id="avScope" class="form-input" rows="2">${escHtml(a.processingScope||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('gdpr_transferMechanism')}</label>
          <select id="avTransferMech" class="select">${tmOpts}</select></div>
        <div class="form-group"><label class="form-label">${t('col_status')}</label>
          <select id="avStatus" class="select">${stOpts}</select></div>
        <div class="form-group"><label class="form-label">${t('ui_signedOn')}</label>
          <input id="avSignDate" type="date" class="form-input" value="${a.signatureDate||''}"></div>
        <div class="form-group"><label class="form-label">${t('ui_validUntil')}</label>
          <input id="avEffUntil" type="date" class="form-input" value="${a.effectiveUntil||''}"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_art28Para3Checklist')}</label>
          <div class="gdpr-checklist">${checklistHtml}</div></div>
        <div class="form-group"><label class="form-label">${t('ui_notes')}</label>
          <textarea id="avNotes" class="form-input" rows="2">${escHtml(a.notes||'')}</textarea></div>
        ${_gdprEntities.length ? `<div class="form-group"><label class="form-label">${t('ui_applicableEntities')}</label>
          <div>${entityChecks}</div></div>` : ''}
        <div class="form-group"><label class="form-label">${t('gdpr_uploadPdf')}</label>
          <input type="file" id="avFile" accept=".pdf,.docx,.doc"></div>
        ${renderLinksBlock('avf', a.linkedControls||[], a.linkedPolicies||[])}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchGdprTab('av')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveAv(${id ? `'${id}'` : 'null'})">${t('ui_save')}</button>
      </div>
    </div>
  `
  initLinkPickers('avf')
}

async function saveAv(id) {
  const title = document.getElementById('avTitle')?.value?.trim()
  const processorName = document.getElementById('avProcessorName')?.value?.trim()
  if (!title || !processorName) { alert('Name and processor name are required'); return }

  const art28Checklist = {}
  GDPR_ART28_ITEMS.forEach(item => {
    art28Checklist[item.key] = document.getElementById(`cl_${item.key}`)?.checked || false
  })
  const applicableEntities = [...document.querySelectorAll('.av-entity-cb')].filter(cb => cb.checked).map(cb => cb.value)

  const payload = {
    title, processorName,
    processorCountry:      document.getElementById('avCountry')?.value || '',
    processorContactEmail: document.getElementById('avEmail')?.value || '',
    processingScope:       document.getElementById('avScope')?.value || '',
    transferMechanism:     document.getElementById('avTransferMech')?.value || '',
    status:                document.getElementById('avStatus')?.value || 'draft',
    signatureDate:         document.getElementById('avSignDate')?.value || null,
    effectiveUntil:        document.getElementById('avEffUntil')?.value || null,
    notes:                 document.getElementById('avNotes')?.value || '',
    art28Checklist, applicableEntities,
    linkedControls:        getLinkedValues('avf', 'ctrl'),
    linkedPolicies:        getLinkedValues('avf', 'pol'),
  }

  const res = await fetch(id ? `/gdpr/av/${id}` : '/gdpr/av', {
    method: id ? 'PUT' : 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  const saved = await res.json()

  // Upload file if provided
  const fileInput = document.getElementById('avFile')
  if (fileInput?.files?.length) {
    const fd = new FormData()
    fd.append('file', fileInput.files[0])
    fd.append('avId', saved.id)
    await fetch('/gdpr/av/upload', { method: 'POST', headers: apiHeaders(), body: fd })
  }

  switchGdprTab('av')
}

// ── DSFA ─────────────────────────────────────────────────────────

async function renderGdprDsfa(el) {
  const r = await fetch('/gdpr/dsfa' + gdprEntityQ(), { headers: apiHeaders() })
  const list = r.ok ? await r.json() : []

  el.innerHTML = `
    <div class="gdpr-filter-bar">
      ${gdprCanOwn() ? `<button class="btn btn-primary btn-sm" onclick="openDsfaForm()"><i class="ph ph-plus"></i> ${t('gdpr_newDpia')}</button>` : ''}
      <span class="gdpr-filter-count">${list.length} ${t('gdpr_dpiaCount')}</span>
    </div>
    ${list.length === 0 ? `<p class="gdpr-empty">${t('gdpr_noDpiaFound')}</p>` : `
    <table class="gdpr-table">
      <thead><tr>
        <th>${t('col_title')}</th><th>${t('gdpr_ropaLink')}</th><th>${t('gdpr_residualRisk')}</th><th>${t('gdpr_dpoConsulted')}</th><th>${t('col_status')}</th><th style="width:80px"></th>
      </tr></thead>
      <tbody>
        ${list.map(d => {
          const st = GDPR_DSFA_STATUSES.find(s => s.id === d.status)
          return `<tr class="gdpr-row" onclick="openDsfaForm('${d.id}')">
            <td><strong>${escHtml(d.title)}</strong></td>
            <td style="font-size:.78rem">${escHtml(d.linkedVvtId || '—')}</td>
            <td><span class="gdpr-risk gdpr-risk-${d.residualRisk}">${GDPR_RISK_LEVELS.find(l=>l.id===d.residualRisk)?.label || d.residualRisk}</span></td>
            <td>${d.dpoConsulted ? '<i class="ph ph-check-circle" style="color:#4ade80"></i>' : '<i class="ph ph-x-circle" style="color:#f87171"></i>'}</td>
            <td><span class="gdpr-status gdpr-st-${d.status}">${st?.label || d.status}</span></td>
            <td onclick="event.stopPropagation()" class="gdpr-actions">
              ${gdprCanOwn() ? `<button class="btn btn-secondary btn-sm" onclick="openDsfaForm('${d.id}')"><i class="ph ph-pencil"></i></button>` : ''}
              ${gdprIsAdmin() ? `<button class="btn btn-sm" style="color:var(--danger-text)" onclick="deleteGdprItem('dsfa','${d.id}')"><i class="ph ph-trash"></i></button>` : ''}
            </td>
          </tr>`
        }).join('')}
      </tbody>
    </table>`}
  `
}

async function openDsfaForm(id = null) {
  let item = null
  if (id) {
    const r = await fetch(`/gdpr/dsfa/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }
  const d = item || { risks: [] }

  const stOpts = GDPR_DSFA_STATUSES.map(s => `<option value="${s.id}" ${d.status === s.id ? 'selected':''}>${s.label}</option>`).join('')
  const rrOpts = GDPR_RISK_LEVELS.map(l => `<option value="${l.id}" ${d.residualRisk === l.id ? 'selected':''}>${l.label}</option>`).join('')
  const decOpts = [
    { id:'', label:'— No decision yet —' },
    { id:'proceed', label:'Proceed' },
    { id:'modify', label:'Modify' },
    { id:'reject', label:'Reject' }
  ].map(o => `<option value="${o.id}" ${d.decision === o.id ? 'selected':''}>${o.label}</option>`).join('')
  const entityChecks = _gdprEntities.map(e =>
    `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:.8rem">
       <input type="checkbox" value="${e.id}" class="dsfa-entity-cb" ${(d.applicableEntities||[]).includes(e.id)?'checked':''}> ${escHtml(e.name)}
     </label>`).join('')

  const risksHtml = (d.risks || []).map((rk, idx) => dsfaRiskRow(rk, idx)).join('')

  document.getElementById('gdprTabContent').innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchGdprTab('dsfa')"><i class="ph ph-arrow-left"></i> ${t('ui_back')}</button>
        <h2>${id ? 'Edit DPIA' : 'New DPIA'}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-group"><label class="form-label">${t('ui_nameRequired')}</label>
          <input id="dsfaTitle" class="form-input" value="${escHtml(d.title||'')}"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_linkedRopaId')}</label>
          <input id="dsfaVvtId" class="form-input" value="${escHtml(d.linkedVvtId||'')}" placeholder="vvt_seed_001"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_processingDesc')}</label>
          <textarea id="dsfaDesc" class="form-input" rows="3">${escHtml(d.processingDescription||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('gdpr_necessityAssessment')}</label>
          <textarea id="dsfaNecessity" class="form-input" rows="3">${escHtml(d.necessityAssessment||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('gdpr_existingControls')}</label>
          <textarea id="dsfaControls" class="form-input" rows="2">${escHtml(d.existingControls||'')}</textarea></div>

        <h4 style="margin:16px 0 8px;font-size:.9rem">${t('gdpr_identifiedRisks')}</h4>
        <div id="dsfaRisksContainer">${risksHtml}</div>
        <button class="btn btn-secondary btn-sm" onclick="addDsfaRisk()" style="margin-top:6px"><i class="ph ph-plus"></i> ${t('gdpr_addRisk')}</button>

        <div class="form-group" style="margin-top:16px"><label class="form-label">${t('gdpr_residualRisk')}</label>
          <select id="dsfaResidual" class="select">${rrOpts}</select></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="dsfaDpoConsulted" ${d.dpoConsulted?'checked':''}> ${t('gdpr_dpoConsulted')}
          </label></div>
        <div class="form-group"><label class="form-label">${t('gdpr_dpoOpinion')}</label>
          <textarea id="dsfaDpoOpinion" class="form-input" rows="2">${escHtml(d.dpoOpinion||'')}</textarea></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="dsfaSaRequired" ${d.saConsultationRequired?'checked':''}> ${t('gdpr_priorConsultRequired')}
          </label></div>
        <div class="form-group"><label class="form-label">${t('gdpr_decision')}</label>
          <select id="dsfaDecision" class="select">${decOpts}</select></div>
        <div class="form-group"><label class="form-label">${t('gdpr_decisionJustification')}</label>
          <textarea id="dsfaDecJustify" class="form-input" rows="2">${escHtml(d.decisionJustification||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('ui_owner')}</label>
          <input id="dsfaOwner" class="form-input" value="${escHtml(d.owner||'')}"></div>
        <div class="form-group"><label class="form-label">${t('col_status')}</label>
          <select id="dsfaStatus" class="select">${stOpts}</select></div>
        ${_gdprEntities.length ? `<div class="form-group"><label class="form-label">${t('ui_applicableEntities')}</label>
          <div>${entityChecks}</div></div>` : ''}
        ${renderLinksBlock('dsfa', d.linkedControls||[], d.linkedPolicies||[])}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchGdprTab('dsfa')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveDsfa(${id ? `'${id}'` : 'null'})">${t('ui_save')}</button>
      </div>
    </div>
  `
  initLinkPickers('dsfa')
}

function dsfaRiskRow(rk = {}, idx) {
  return `<div class="dsfa-risk-row" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:8px;padding:8px;background:var(--surface);border-radius:var(--radius-sm);border:1px solid var(--border)">
    <input class="form-input" placeholder="Risk description" style="font-size:.8rem" value="${escHtml(rk.description||'')}">
    <input type="number" class="form-input" placeholder="Likelihood 1-5" min="1" max="5" style="font-size:.8rem" value="${rk.likelihood||1}" title="Likelihood (1-5)">
    <input type="number" class="form-input" placeholder="Impact 1-5" min="1" max="5" style="font-size:.8rem" value="${rk.impact||1}" title="Impact (1-5)">
    <span style="font-size:.78rem;color:var(--text-subtle)">Score: <strong>${(rk.likelihood||1)*(rk.impact||1)}</strong></span>
    <button class="btn btn-sm" style="color:var(--danger-text)" onclick="this.closest('.dsfa-risk-row').remove()"><i class="ph ph-trash"></i></button>
  </div>`
}

function addDsfaRisk() {
  const container = document.getElementById('dsfaRisksContainer')
  if (!container) return
  const idx = container.querySelectorAll('.dsfa-risk-row').length
  container.insertAdjacentHTML('beforeend', dsfaRiskRow({}, idx))
  // live score update
  container.querySelectorAll('.dsfa-risk-row').forEach(row => {
    const inputs = row.querySelectorAll('input[type=number]')
    inputs.forEach(inp => {
      inp.oninput = () => {
        const l = parseInt(inputs[0].value) || 1
        const i = parseInt(inputs[1].value) || 1
        row.querySelector('strong').textContent = l * i
      }
    })
  })
}

async function saveDsfa(id) {
  const title = document.getElementById('dsfaTitle')?.value?.trim()
  if (!title) { alert('Name is required'); return }

  const risks = [...document.querySelectorAll('.dsfa-risk-row')].map(row => {
    const inputs = row.querySelectorAll('input')
    const l = Math.min(5, Math.max(1, parseInt(inputs[1].value) || 1))
    const i = Math.min(5, Math.max(1, parseInt(inputs[2].value) || 1))
    return { id: `dsfa_risk_${Date.now()}_${Math.random().toString(36).slice(2,4)}`,
             description: inputs[0].value || '', likelihood: l, impact: i, score: l * i, mitigations: [] }
  })

  const applicableEntities = [...document.querySelectorAll('.dsfa-entity-cb')].filter(cb => cb.checked).map(cb => cb.value)

  const payload = {
    title,
    linkedVvtId:           document.getElementById('dsfaVvtId')?.value || '',
    processingDescription: document.getElementById('dsfaDesc')?.value || '',
    necessityAssessment:   document.getElementById('dsfaNecessity')?.value || '',
    existingControls:      document.getElementById('dsfaControls')?.value || '',
    risks,
    residualRisk:          document.getElementById('dsfaResidual')?.value || 'medium',
    dpoConsulted:          document.getElementById('dsfaDpoConsulted')?.checked || false,
    dpoOpinion:            document.getElementById('dsfaDpoOpinion')?.value || '',
    saConsultationRequired:document.getElementById('dsfaSaRequired')?.checked || false,
    decision:              document.getElementById('dsfaDecision')?.value || '',
    decisionJustification: document.getElementById('dsfaDecJustify')?.value || '',
    owner:                 document.getElementById('dsfaOwner')?.value || '',
    status:                document.getElementById('dsfaStatus')?.value || 'draft',
    applicableEntities,
    linkedControls: getLinkedValues('dsfa', 'ctrl'),
    linkedPolicies: getLinkedValues('dsfa', 'pol')
  }

  const res = await fetch(id ? `/gdpr/dsfa/${id}` : '/gdpr/dsfa', {
    method: id ? 'PUT' : 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  switchGdprTab('dsfa')
}

// ── Incidents (Datenpannen) ────────────────────────────────────────

function gdprTimerHtml(discoveredAt) {
  if (!discoveredAt) return ''
  const elapsed = (Date.now() - new Date(discoveredAt)) / 3600000
  const remaining = 72 - elapsed
  if (remaining <= 0) return `<span class="gdpr-timer gdpr-timer-over"><i class="ph ph-alarm"></i> ${Math.abs(Math.round(remaining))}h exceeded</span>`
  if (remaining < 24) return `<span class="gdpr-timer gdpr-timer-warn"><i class="ph ph-alarm"></i> ${Math.round(remaining)}h remaining</span>`
  return `<span class="gdpr-timer gdpr-timer-ok"><i class="ph ph-alarm"></i> ${Math.round(remaining)}h remaining</span>`
}

async function renderGdprIncidents(el) {
  const r = await fetch('/gdpr/incidents' + gdprEntityQ(), { headers: apiHeaders() })
  const list = r.ok ? await r.json() : []

  el.innerHTML = `
    <div class="gdpr-filter-bar">
      ${gdprCanAudit() ? `<button class="btn btn-primary btn-sm" onclick="openIncidentForm()"><i class="ph ph-plus"></i> ${t('gdpr_newBreach')}</button>` : ''}
      <span class="gdpr-filter-count">${list.length} data breach(es)</span>
    </div>
    ${list.length === 0 ? `<p class="gdpr-empty">${t('gdpr_noBreachesFound')}</p>` : `
    <table class="gdpr-table">
      <thead><tr>
        <th>${t('col_title')}</th><th>${t('col_type')}</th><th>${t('gdpr_discovered')}</th><th>72h Timer</th><th>${t('ui_risk')}</th><th>${t('gdpr_saNotified')}</th><th>${t('col_status')}</th><th style="width:80px"></th>
      </tr></thead>
      <tbody>
        ${list.map(i => {
          const typ = GDPR_INC_TYPES.find(t => t.id === i.incidentType)
          const st  = GDPR_INC_STATUSES.find(s => s.id === i.status)
          return `<tr class="gdpr-row" onclick="openIncidentForm('${i.id}')">
            <td><strong>${escHtml(i.title)}</strong></td>
            <td style="font-size:.78rem">${escHtml(typ?.label || i.incidentType)}</td>
            <td style="font-size:.78rem">${i.discoveredAt ? new Date(i.discoveredAt).toLocaleDateString('en-GB') : '—'}</td>
            <td>${i.saNotificationRequired && !i.saNotifiedAt ? gdprTimerHtml(i.discoveredAt) : '—'}</td>
            <td><span class="gdpr-risk gdpr-risk-${i.riskLevel}">${GDPR_RISK_LEVELS.find(l=>l.id===i.riskLevel)?.label || i.riskLevel}</span></td>
            <td>${i.saNotifiedAt ? `<i class="ph ph-check-circle" style="color:#4ade80"></i> ${new Date(i.saNotifiedAt).toLocaleDateString('en-GB')}` : (i.saNotificationRequired ? '<i class="ph ph-x-circle" style="color:#f87171"></i> Pending' : '—')}</td>
            <td><span class="gdpr-status gdpr-st-${i.status}">${st?.label || i.status}</span></td>
            <td onclick="event.stopPropagation()" class="gdpr-actions">
              ${gdprCanAudit() ? `<button class="btn btn-secondary btn-sm" onclick="openIncidentForm('${i.id}')"><i class="ph ph-pencil"></i></button>` : ''}
              ${gdprIsAdmin() ? `<button class="btn btn-sm" style="color:var(--danger-text)" onclick="deleteGdprItem('incidents','${i.id}')"><i class="ph ph-trash"></i></button>` : ''}
            </td>
          </tr>`
        }).join('')}
      </tbody>
    </table>`}
  `
}

async function openIncidentForm(id = null) {
  let item = null
  if (id) {
    const r = await fetch(`/gdpr/incidents/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }
  const inc = item || {}

  const typeOpts = GDPR_INC_TYPES.map(t => `<option value="${t.id}" ${inc.incidentType === t.id ? 'selected':''}>${t.label}</option>`).join('')
  const stOpts   = GDPR_INC_STATUSES.map(s => `<option value="${s.id}" ${inc.status === s.id ? 'selected':''}>${s.label}</option>`).join('')
  const rlOpts   = GDPR_RISK_LEVELS.map(l => `<option value="${l.id}" ${inc.riskLevel === l.id ? 'selected':''}>${l.label}</option>`).join('')
  const catChecks = GDPR_DATA_CATS.map(c =>
    `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:.8rem">
       <input type="checkbox" value="${c}" class="inc-cat-cb" ${(inc.dataCategories||[]).includes(c)?'checked':''}> ${c}
     </label>`).join('')
  const entityChecks = _gdprEntities.map(e =>
    `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:.8rem">
       <input type="checkbox" value="${e.id}" class="inc-entity-cb" ${(inc.applicableEntities||[]).includes(e.id)?'checked':''}> ${escHtml(e.name)}
     </label>`).join('')

  document.getElementById('gdprTabContent').innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchGdprTab('incidents')"><i class="ph ph-arrow-left"></i> ${t('ui_back')}</button>
        <h2>${id ? 'Edit Data Breach' : 'Record New Data Breach'}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-group"><label class="form-label">${t('ui_nameRequired')}</label>
          <input id="incTitle" class="form-input" value="${escHtml(inc.title||'')}"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_breachType')}</label>
          <select id="incType" class="select">${typeOpts}</select></div>
        <div class="form-group"><label class="form-label">${t('gdpr_discoveredOn')}</label>
          <input id="incDiscovered" type="datetime-local" class="form-input" value="${inc.discoveredAt ? inc.discoveredAt.slice(0,16) : ''}"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_affectedDataCategories')}</label>
          <div>${catChecks}</div></div>
        <div class="form-group"><label class="form-label">${t('gdpr_estimatedSubjects')}</label>
          <input id="incAffected" type="number" class="form-input" value="${inc.estimatedAffected||''}"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_riskAssessment')}</label>
          <select id="incRiskLevel" class="select">${rlOpts}</select></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="incSaRequired" ${inc.saNotificationRequired?'checked':''}> ${t('gdpr_saNotifyRequired72h')}
          </label></div>
        <div class="form-group"><label class="form-label">${t('gdpr_saRefNumber')}</label>
          <input id="incSaRef" class="form-input" value="${escHtml(inc.saReference||'')}" placeholder="if notified"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_saNotifiedOn')}</label>
          <input id="incSaNotified" type="datetime-local" class="form-input" value="${inc.saNotifiedAt ? inc.saNotifiedAt.slice(0,16) : ''}"></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="incDsRequired" ${inc.dsNotificationRequired?'checked':''}> ${t('gdpr_dsNotifyRequired')}
          </label></div>
        <div class="form-group"><label class="form-label">${t('gdpr_containmentMeasures')}</label>
          <textarea id="incContainment" class="form-input" rows="2">${escHtml(inc.containmentMeasures||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('gdpr_rootCauseAnalysis')}</label>
          <textarea id="incRootCause" class="form-input" rows="2">${escHtml(inc.rootCause||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('gdpr_remediationMeasures')}</label>
          <textarea id="incRemediation" class="form-input" rows="2">${escHtml(inc.remediationMeasures||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('col_status')}</label>
          <select id="incStatus" class="select">${stOpts}</select></div>
        ${_gdprEntities.length ? `<div class="form-group"><label class="form-label">${t('ui_applicableEntities')}</label>
          <div>${entityChecks}</div></div>` : ''}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchGdprTab('incidents')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveIncident(${id ? `'${id}'` : 'null'})">${t('ui_save')}</button>
      </div>
    </div>
  `
}

async function saveIncident(id) {
  const title = document.getElementById('incTitle')?.value?.trim()
  if (!title) { alert('Name is required'); return }
  const dataCategories    = [...document.querySelectorAll('.inc-cat-cb')].filter(cb => cb.checked).map(cb => cb.value)
  const applicableEntities= [...document.querySelectorAll('.inc-entity-cb')].filter(cb => cb.checked).map(cb => cb.value)
  const saNotifiedVal     = document.getElementById('incSaNotified')?.value
  const discVal           = document.getElementById('incDiscovered')?.value

  const payload = {
    title,
    incidentType:           document.getElementById('incType')?.value,
    discoveredAt:           discVal ? new Date(discVal).toISOString() : null,
    dataCategories,
    estimatedAffected:      parseInt(document.getElementById('incAffected')?.value) || null,
    riskLevel:              document.getElementById('incRiskLevel')?.value || 'medium',
    saNotificationRequired: document.getElementById('incSaRequired')?.checked || false,
    saReference:            document.getElementById('incSaRef')?.value || '',
    saNotifiedAt:           saNotifiedVal ? new Date(saNotifiedVal).toISOString() : null,
    dsNotificationRequired: document.getElementById('incDsRequired')?.checked || false,
    containmentMeasures:    document.getElementById('incContainment')?.value || '',
    rootCause:              document.getElementById('incRootCause')?.value || '',
    remediationMeasures:    document.getElementById('incRemediation')?.value || '',
    status:                 document.getElementById('incStatus')?.value || 'detected',
    applicableEntities
  }

  const res = await fetch(id ? `/gdpr/incidents/${id}` : '/gdpr/incidents', {
    method: id ? 'PUT' : 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  switchGdprTab('incidents')
}

// ── DSAR ─────────────────────────────────────────────────────────

async function renderGdprDsar(el) {
  const r = await fetch('/gdpr/dsar' + gdprEntityQ(), { headers: apiHeaders() })
  const list = r.ok ? await r.json() : []
  const now  = new Date()

  el.innerHTML = `
    <div class="gdpr-filter-bar">
      ${gdprCanEdit() ? `<button class="btn btn-primary btn-sm" onclick="openDsarForm()"><i class="ph ph-plus"></i> ${t('gdpr_newRequest')}</button>` : ''}
      <span class="gdpr-filter-count">${list.length} requests</span>
    </div>
    ${list.length === 0 ? `<p class="gdpr-empty">${t('gdpr_noDsarFound')}</p>` : `
    <table class="gdpr-table">
      <thead><tr>
        <th>${t('col_type')}</th><th>${t('gdpr_dataSubject')}</th><th>${t('gdpr_received')}</th><th>${t('gdpr_deadline')}</th><th>${t('col_status')}</th><th style="width:80px"></th>
      </tr></thead>
      <tbody>
        ${list.map(d => {
          const typ = GDPR_DSAR_TYPES.find(t => t.id === d.requestType)
          const st  = GDPR_DSAR_STATUSES.find(s => s.id === d.status)
          const deadline = d.extendedDeadline || d.deadline
          const isOver   = deadline && new Date(deadline) < now && !['completed','refused'].includes(d.status)
          return `<tr class="gdpr-row" onclick="openDsarForm('${d.id}')">
            <td style="font-size:.78rem">${escHtml(typ?.label || d.requestType)}</td>
            <td>${escHtml(d.dataSubjectName)}<br><small style="color:var(--text-subtle)">${escHtml(d.dataSubjectEmail)}</small></td>
            <td style="font-size:.78rem">${d.receivedAt ? new Date(d.receivedAt).toLocaleDateString('en-GB') : '—'}</td>
            <td style="font-size:.78rem;${isOver ? 'color:#f87171;font-weight:600' : ''}">${deadline ? new Date(deadline).toLocaleDateString('en-GB') : '—'}${isOver ? ' <i class="ph ph-warning" style="color:#f87171"></i>' : ''}</td>
            <td><span class="gdpr-status gdpr-st-${d.status}">${st?.label || d.status}</span></td>
            <td onclick="event.stopPropagation()" class="gdpr-actions">
              ${gdprCanEdit() ? `<button class="btn btn-secondary btn-sm" onclick="openDsarForm('${d.id}')"><i class="ph ph-pencil"></i></button>` : ''}
              ${gdprIsAdmin() ? `<button class="btn btn-sm" style="color:var(--danger-text)" onclick="deleteGdprItem('dsar','${d.id}')"><i class="ph ph-trash"></i></button>` : ''}
            </td>
          </tr>`
        }).join('')}
      </tbody>
    </table>`}
  `
}

async function openDsarForm(id = null) {
  let item = null
  if (id) {
    const r = await fetch(`/gdpr/dsar/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }
  const d = item || {}

  const typeOpts = GDPR_DSAR_TYPES.map(t => `<option value="${t.id}" ${d.requestType === t.id ? 'selected':''}>${t.label}</option>`).join('')
  const stOpts   = GDPR_DSAR_STATUSES.map(s => `<option value="${s.id}" ${d.status === s.id ? 'selected':''}>${s.label}</option>`).join('')
  const entityChecks = _gdprEntities.map(e =>
    `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:.8rem">
       <input type="checkbox" value="${e.id}" class="dsar-entity-cb" ${(d.applicableEntities||[]).includes(e.id)?'checked':''}> ${escHtml(e.name)}
     </label>`).join('')

  document.getElementById('gdprTabContent').innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchGdprTab('dsar')"><i class="ph ph-arrow-left"></i> ${t('ui_back')}</button>
        <h2>${id ? 'Edit DSAR' : 'New Data Subject Request'}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-group"><label class="form-label">${t('gdpr_requestType')}</label>
          <select id="dsarType" class="select">${typeOpts}</select></div>
        <div class="form-group"><label class="form-label">${t('gdpr_dataSubjectName')}</label>
          <input id="dsarName" class="form-input" value="${escHtml(d.dataSubjectName||'')}"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_dataSubjectEmail')}</label>
          <input id="dsarEmail" class="form-input" value="${escHtml(d.dataSubjectEmail||'')}"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_receivedOnDeadline')}</label>
          <input id="dsarReceived" type="date" class="form-input" value="${d.receivedAt ? d.receivedAt.slice(0,10) : new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="dsarVerified" ${d.identityVerified?'checked':''}> ${t('gdpr_identityVerified')}
          </label></div>
        <div class="form-group"><label class="form-label">${t('gdpr_responseJustification')}</label>
          <textarea id="dsarResponse" class="form-input" rows="3">${escHtml(d.response||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('gdpr_refusalReason')}</label>
          <input id="dsarRefusal" class="form-input" value="${escHtml(d.refusalReason||'')}"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_handledBy')}</label>
          <input id="dsarHandler" class="form-input" value="${escHtml(d.handledBy||'')}" placeholder="${t('ui_responsiblePersonPh')}"></div>
        <div class="form-group"><label class="form-label">${t('col_status')}</label>
          <select id="dsarStatus" class="select">${stOpts}</select></div>
        ${_gdprEntities.length ? `<div class="form-group"><label class="form-label">${t('ui_applicableEntities')}</label>
          <div>${entityChecks}</div></div>` : ''}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchGdprTab('dsar')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveDsar(${id ? `'${id}'` : 'null'})">${t('ui_save')}</button>
      </div>
    </div>
  `
}

async function saveDsar(id) {
  const applicableEntities = [...document.querySelectorAll('.dsar-entity-cb')].filter(cb => cb.checked).map(cb => cb.value)
  const payload = {
    requestType:      document.getElementById('dsarType')?.value,
    dataSubjectName:  document.getElementById('dsarName')?.value || '',
    dataSubjectEmail: document.getElementById('dsarEmail')?.value || '',
    receivedAt:       document.getElementById('dsarReceived')?.value ? new Date(document.getElementById('dsarReceived').value).toISOString() : null,
    identityVerified: document.getElementById('dsarVerified')?.checked || false,
    response:         document.getElementById('dsarResponse')?.value || '',
    refusalReason:    document.getElementById('dsarRefusal')?.value || '',
    handledBy:        document.getElementById('dsarHandler')?.value || '',
    status:           document.getElementById('dsarStatus')?.value || 'received',
    applicableEntities
  }
  const res = await fetch(id ? `/gdpr/dsar/${id}` : '/gdpr/dsar', {
    method: id ? 'PUT' : 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  switchGdprTab('dsar')
}

// ── TOMs ─────────────────────────────────────────────────────────

async function renderGdprToms(el) {
  const params = new URLSearchParams()
  if (_gdprEntityFilter) params.set('entity', _gdprEntityFilter)
  if (_gdprTomCategory)  params.set('category', _gdprTomCategory)
  const r = await fetch('/gdpr/toms?' + params, { headers: apiHeaders() })
  const list = r.ok ? await r.json() : []

  const catOpts = [{ id:'', label:t('filter_allCats') }, ...GDPR_TOM_CATS].map(c =>
    `<option value="${c.id}" ${_gdprTomCategory === c.id ? 'selected':''}>${c.label}</option>`).join('')

  el.innerHTML = `
    <div class="gdpr-filter-bar">
      ${gdprCanOwn() ? `<button class="btn btn-primary btn-sm" onclick="openTomForm()"><i class="ph ph-plus"></i> ${t('gdpr_newTom')}</button>` : ''}
      <select class="select" style="font-size:.82rem" onchange="_gdprTomCategory=this.value;switchGdprTab('toms')">${catOpts}</select>
      <span class="gdpr-filter-count">${list.length} TOMs</span>
    </div>
    ${list.length === 0 ? `<p class="gdpr-empty">${t('gdpr_noTomsFound')}</p>` : `
    <table class="gdpr-table">
      <thead><tr>
        <th>${t('col_title')}</th><th>${t('ui_category')}</th><th>${t('col_status')}</th><th>${t('ui_owner')}</th><th>${t('ui_reviewDate')}</th><th style="width:80px"></th>
      </tr></thead>
      <tbody>
        ${list.map(t => {
          const cat = GDPR_TOM_CATS.find(c => c.id === t.category)
          const st  = GDPR_TOM_STATUSES.find(s => s.id === t.status)
          return `<tr class="gdpr-row" onclick="openTomForm('${t.id}')">
            <td><strong>${escHtml(t.title)}</strong><br><small style="color:var(--text-subtle)">${escHtml(t.description?.slice(0,60) || '')}</small></td>
            <td style="font-size:.78rem">${escHtml(cat?.label || t.category)}</td>
            <td><span class="gdpr-status gdpr-st-${t.status}">${st?.label || t.status}</span></td>
            <td style="font-size:.78rem">${escHtml(t.owner || '—')}</td>
            <td style="font-size:.78rem">${t.reviewDate || '—'}</td>
            <td onclick="event.stopPropagation()" class="gdpr-actions">
              ${gdprCanOwn() ? `<button class="btn btn-secondary btn-sm" onclick="openTomForm('${t.id}')"><i class="ph ph-pencil"></i></button>` : ''}
              ${gdprIsAdmin() ? `<button class="btn btn-sm" style="color:var(--danger-text)" onclick="deleteGdprItem('toms','${t.id}')"><i class="ph ph-trash"></i></button>` : ''}
            </td>
          </tr>`
        }).join('')}
      </tbody>
    </table>`}
  `
}

async function openTomForm(id = null) {
  let item = null
  if (id) {
    const r = await fetch(`/gdpr/toms/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }
  const tom = item || {}

  const catOpts = GDPR_TOM_CATS.map(c => `<option value="${c.id}" ${tom.category === c.id ? 'selected':''}>${c.label}</option>`).join('')
  const stOpts  = GDPR_TOM_STATUSES.map(s => `<option value="${s.id}" ${tom.status === s.id ? 'selected':''}>${s.label}</option>`).join('')
  const rlOpts  = GDPR_RISK_LEVELS.map(l => `<option value="${l.id}" ${tom.riskLevel === l.id ? 'selected':''}>${l.label}</option>`).join('')
  const entityChecks = _gdprEntities.map(e =>
    `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:.8rem">
       <input type="checkbox" value="${e.id}" class="tom-entity-cb" ${(tom.applicableEntities||[]).includes(e.id)?'checked':''}> ${escHtml(e.name)}
     </label>`).join('')

  document.getElementById('gdprTabContent').innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchGdprTab('toms')"><i class="ph ph-arrow-left"></i> ${t('ui_back')}</button>
        <h2>${id ? 'Edit TOM' : 'New TOM'}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-group"><label class="form-label">${t('ui_nameRequired')}</label>
          <input id="tomTitle" class="form-input" value="${escHtml(tom.title||'')}"></div>
        <div class="form-group"><label class="form-label">${t('ui_category')}</label>
          <select id="tomCategory" class="select">${catOpts}</select></div>
        <div class="form-group"><label class="form-label">${t('ui_description')}</label>
          <textarea id="tomDesc" class="form-input" rows="2">${escHtml(tom.description||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('gdpr_implementationDetails')}</label>
          <textarea id="tomImpl" class="form-input" rows="2">${escHtml(tom.implementation||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('col_status')}</label>
          <select id="tomStatus" class="select">${stOpts}</select></div>
        <div class="form-group"><label class="form-label">${t('ui_owner')}</label>
          <input id="tomOwner" class="form-input" value="${escHtml(tom.owner||'')}"></div>
        <div class="form-group"><label class="form-label">${t('ui_riskLevel')}</label>
          <select id="tomRisk" class="select">${rlOpts}</select></div>
        <div class="form-group"><label class="form-label">${t('gdpr_evidenceProof')}</label>
          <input id="tomEvidence" class="form-input" value="${escHtml(tom.evidenceNote||'')}" placeholder="e.g. Audit report, screenshot"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_retentionRule')}</label>
          <input id="tomRetention" class="form-input" value="${escHtml(tom.retentionRule||'')}" placeholder="e.g. Logs 3 years"></div>
        <div class="form-group"><label class="form-label">${t('ui_reviewDate')}</label>
          <input id="tomReview" type="date" class="form-input" value="${tom.reviewDate||''}"></div>
        ${_gdprEntities.length ? `<div class="form-group"><label class="form-label">${t('ui_applicableEntities')}</label>
          <div>${entityChecks}</div></div>` : ''}
        ${renderLinksBlock('tom', tom.linkedControls||[], tom.linkedPolicies||[])}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchGdprTab('toms')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveTom(${id ? `'${id}'` : 'null'})">${t('ui_save')}</button>
      </div>
    </div>
  `
  initLinkPickers('tom')
}

async function saveTom(id) {
  const title = document.getElementById('tomTitle')?.value?.trim()
  if (!title) { alert('Name is required'); return }
  const applicableEntities = [...document.querySelectorAll('.tom-entity-cb')].filter(cb => cb.checked).map(cb => cb.value)
  const payload = {
    title,
    category:      document.getElementById('tomCategory')?.value,
    description:   document.getElementById('tomDesc')?.value || '',
    implementation:document.getElementById('tomImpl')?.value || '',
    status:        document.getElementById('tomStatus')?.value || 'planned',
    owner:         document.getElementById('tomOwner')?.value || '',
    riskLevel:     document.getElementById('tomRisk')?.value || 'medium',
    evidenceNote:  document.getElementById('tomEvidence')?.value || '',
    retentionRule: document.getElementById('tomRetention')?.value || '',
    reviewDate:    document.getElementById('tomReview')?.value || null,
    applicableEntities,
    linkedControls: getLinkedValues('tom', 'ctrl'),
    linkedPolicies: getLinkedValues('tom', 'pol')
  }
  const res = await fetch(id ? `/gdpr/toms/${id}` : '/gdpr/toms', {
    method: id ? 'PUT' : 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  switchGdprTab('toms')
}

// ── Löschprotokoll (Art. 17 DSGVO) ────────────────────────────────

async function renderGdprDeletion(el) {
  const [dueRes, upcomingRes, logRes] = await Promise.all([
    fetch('/gdpr/deletion-log/due',      { headers: apiHeaders() }),
    fetch('/gdpr/deletion-log/upcoming', { headers: apiHeaders() }),
    fetch('/gdpr/deletion-log',          { headers: apiHeaders() })
  ])
  const due      = dueRes.ok      ? await dueRes.json()      : []
  const upcoming = upcomingRes.ok ? await upcomingRes.json() : []
  const log      = logRes.ok      ? await logRes.json()      : []

  const canOwn = gdprCanOwn()
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB') : '—'

  el.innerHTML = `
    <div class="gdpr-filter-bar">
      <h3 style="margin:0"><i class="ph ph-trash"></i> ${t('gdpr_deletionLogTitle')}</h3>
    </div>

    ${due.length > 0 ? `
    <div class="gdpr-alert gdpr-alert-error" style="margin-bottom:1rem">
      <i class="ph ph-warning"></i> <strong>${due.length}</strong> RoPA entries with expired retention period must be deleted.
    </div>
    <h4 style="color:var(--color-danger)">Deletion Due (${due.length})</h4>
    <table class="gdpr-table">
      <thead><tr><th>${t('gdpr_ropaTitle')}</th><th>${t('gdpr_dueSince')}</th><th>${t('gdpr_periodMonths')}</th>${canOwn ? `<th>${t('ui_action')}</th>` : ''}</tr></thead>
      <tbody>${due.map(v => `
        <tr>
          <td>${escHtml(v.title)}</td>
          <td style="color:var(--color-danger)">${fmtDate(v.deletionDue)}</td>
          <td>${v.retentionMonths} months</td>
          ${canOwn ? `<td><button class="btn btn-sm btn-danger" onclick="confirmDeletion('${v.id}','${escHtml(v.title).replace(/'/g,"\\'")}')"><i class="ph ph-check"></i> ${t('gdpr_confirmDeletion')}</button></td>` : ''}
        </tr>`).join('')}
      </tbody>
    </table>` : `<p class="gdpr-empty" style="color:var(--color-success)"><i class="ph ph-check-circle"></i> No deletion deadlines due.</p>`}

    ${upcoming.length > 0 ? `
    <h4 style="color:var(--color-warning);margin-top:1.5rem">Due Soon – next 90 days (${upcoming.length})</h4>
    <table class="gdpr-table">
      <thead><tr><th>${t('gdpr_ropaTitle')}</th><th>${t('gdpr_dueOn')}</th><th>${t('gdpr_periodMonths')}</th></tr></thead>
      <tbody>${upcoming.map(v => `
        <tr>
          <td>${escHtml(v.title)}</td>
          <td style="color:var(--color-warning)">${fmtDate(v.deletionDue)}</td>
          <td>${v.retentionMonths} months</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}

    <h4 style="margin-top:1.5rem">Log of Confirmed Deletions (${log.length})</h4>
    ${log.length === 0 ? `<p class="gdpr-empty">${t('gdpr_noDeletionsYet')}</p>` : `
    <table class="gdpr-table">
      <thead><tr><th>${t('gdpr_ropaTitle')}</th><th>${t('gdpr_confirmedOn')}</th><th>${t('gdpr_confirmedBy')}</th><th>${t('ui_method')}</th><th>${t('ui_note')}</th></tr></thead>
      <tbody>${[...log].reverse().map(e => `
        <tr>
          <td>${escHtml(e.vvtTitle)}</td>
          <td>${fmtDate(e.confirmedAt)}</td>
          <td>${escHtml(e.confirmedBy)}</td>
          <td>${escHtml(e.method)}</td>
          <td>${escHtml(e.note)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  `
}

async function confirmDeletion(vvtId, vvtTitle) {
  const method   = prompt('Deletion method (e.g. "Database cleanup", "Paper shredding"):', 'manual') || 'manual'
  const evidence = prompt('Evidence / Reference (optional):') || ''
  const note     = prompt('Note (optional):') || ''
  if (!confirm(`Confirm deletion of "${vvtTitle}"?`)) return
  const res = await fetch('/gdpr/deletion-log', {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ vvtId, vvtTitle, method, evidence, note })
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  switchGdprTab('deletion')
}

// ── DSB ───────────────────────────────────────────────────────────

async function renderGdprDsb(el) {
  const r = await fetch('/gdpr/dsb', { headers: apiHeaders() })
  const d = r.ok ? await r.json() : {}

  el.innerHTML = `
    <div class="gdpr-dsb-form">
      <h3 style="font-size:1rem;margin-bottom:4px">${t('gdpr_dpoTitle')}</h3>
      <p style="font-size:.8rem;color:var(--text-subtle);margin-bottom:16px">${t('gdpr_art37Designation')}</p>
      <div class="form-group"><label class="form-label">${t('col_type')}</label>
        <select id="dsbType" class="select">
          <option value="internal" ${d.type==='internal'?'selected':''}>${t('ui_internal')}</option>
          <option value="external" ${d.type==='external'?'selected':''}>${t('ui_external')}</option>
        </select></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">${t('ui_name')}</label>
          <input id="dsbName" class="form-input" value="${escHtml(d.name||'')}"></div>
        <div class="form-group"><label class="form-label">${t('ui_email')}</label>
          <input id="dsbEmail" class="form-input" value="${escHtml(d.email||'')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">${t('ui_phone')}</label>
          <input id="dsbPhone" class="form-input" value="${escHtml(d.phone||'')}"></div>
        <div class="form-group"><label class="form-label">${t('gdpr_appointedOn')}</label>
          <input id="dsbApptDate" type="date" class="form-input" value="${d.appointmentDate||''}"></div>
      </div>
      <div class="form-group"><label class="form-label">${t('gdpr_contractUntilExternal')}</label>
        <input id="dsbContractEnd" type="date" class="form-input" value="${d.contractEnd||''}"></div>
      <div class="form-group"><label class="form-label">${t('ui_notes')}</label>
        <textarea id="dsbNotes" class="form-input" rows="3">${escHtml(d.notes||'')}</textarea></div>

      <div class="form-group">
        <label class="form-label">${t('gdpr_appointmentCert')}</label>
        ${d.filePath ? `<div style="margin-bottom:8px"><a href="/gdpr/dsb/file" target="_blank" class="btn btn-secondary btn-sm"><i class="ph ph-file-pdf"></i> ${escHtml(d.filename || 'Open document')}</a></div>` : ''}
        <input type="file" id="dsbFile" accept=".pdf,.docx,.doc">
      </div>

      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary" onclick="saveDsb()"><i class="ph ph-floppy-disk"></i> ${t('ui_save')}</button>
      </div>
      ${d.updatedAt ? `<p style="font-size:.72rem;color:var(--text-subtle);margin-top:8px">Last updated: ${new Date(d.updatedAt).toLocaleString('en-GB')}</p>` : ''}
    </div>
  `
}

async function saveDsb() {
  const payload = {
    type:            document.getElementById('dsbType')?.value || 'internal',
    name:            document.getElementById('dsbName')?.value || '',
    email:           document.getElementById('dsbEmail')?.value || '',
    phone:           document.getElementById('dsbPhone')?.value || '',
    appointmentDate: document.getElementById('dsbApptDate')?.value || null,
    contractEnd:     document.getElementById('dsbContractEnd')?.value || null,
    notes:           document.getElementById('dsbNotes')?.value || ''
  }
  const res = await fetch('/gdpr/dsb', {
    method: 'PUT',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }

  // Upload file if provided
  const fileInput = document.getElementById('dsbFile')
  if (fileInput?.files?.length) {
    const fd = new FormData()
    fd.append('file', fileInput.files[0])
    await fetch('/gdpr/dsb/upload', { method: 'POST', headers: apiHeaders(), body: fd })
  }

  switchGdprTab('dsb')
}

// ── Shared delete helper ──────────────────────────────────────────

async function deleteGdprItem(resource, id) {
  const labels = { vvt:'RoPA entry', av:'DPA contract', dsfa:'DPIA', incidents:'data breach', dsar:'DSAR request', toms:'TOM' }
  if (!confirm(`Delete ${labels[resource] || resource}?`)) return
  const res = await fetch(`/gdpr/${resource}/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  switchGdprTab(_gdprTab)
}

// ── showModal helper (reused pattern) ────────────────────────────

function showModal(id, innerHtml) {
  document.getElementById(id)?.remove()
  const overlay = document.createElement('div')
  overlay.id = id
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `<div class="modal-dialog">${innerHtml}</div>`
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
  document.body.appendChild(overlay)
}

// ── Training & Schulungen ─────────────────────────────────────────

const TRAINING_CAT_LABELS = {
  get security_awareness() { return t('trnl_catAwareness') },
  get iso27001()           { return t('trnl_catIso') },
  get gdpr()               { return t('trnl_catGdpr') },
  get technical()          { return t('trnl_catTechnical') },
  get management()         { return t('trnl_catManagement') },
  get other()              { return t('trnl_catOther') }
}
const TRAINING_STATUS_LABELS = {
  get planned()     { return t('trnl_statPlanned') },
  get in_progress() { return t('trnl_statProgress') },
  get completed()   { return t('trnl_statCompleted') },
  get cancelled()   { return t('trnl_statCancelled') }
}
const TRAINING_STATUS_CLS = {
  planned:     'badge-draft',
  in_progress: 'badge-review',
  completed:   'badge-approved',
  cancelled:   'badge-archived'
}

let _trainingTab = 'overview'

async function renderTraining() {
  dom('trainingContainer')?.remove()
  const main = document.querySelector('main') || document.body
  const container = document.createElement('div')
  container.id = 'trainingContainer'
  container.className = 'training-container'
  main.appendChild(container)

  // Tab-Bar
  const tabs = [
    { id: 'overview',  get label() { return t('training_tabOverview') },   icon: 'ph-chart-bar' },
    { id: 'plan',      get label() { return t('training_tabPlan') },        icon: 'ph-list-checks' },
    { id: 'evidence',  get label() { return t('training_tabEvidence') },    icon: 'ph-certificate' },
  ]
  container.innerHTML = `
    <div class="training-header">
      <h2 class="training-title"><i class="ph ph-graduation-cap"></i> ${t('nav_training')}</h2>
      <div class="training-tab-bar">
        ${tabs.map(t => `<button class="training-tab${t.id===_trainingTab?' active':''}" data-tab="${t.id}">
          <i class="ph ${t.icon}"></i> ${t.label}
        </button>`).join('')}
      </div>
    </div>
    <div id="trainingTabContent" class="training-tab-content"></div>
  `
  container.querySelectorAll('.training-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _trainingTab = btn.dataset.tab
      container.querySelectorAll('.training-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === _trainingTab))
      switchTrainingTab(_trainingTab)
    })
  })
  switchTrainingTab(_trainingTab)
}

async function switchTrainingTab(tab) {
  _trainingTab = tab
  const el = dom('trainingTabContent')
  if (!el) return
  el.innerHTML = `<p style="color:var(--text-subtle);padding:24px">${t('ui_loading')}</p>`
  try {
    if (tab === 'overview')  await renderTrainingOverview(el)
    if (tab === 'plan')      await renderTrainingPlan(el)
    if (tab === 'evidence')  await renderTrainingEvidence(el)
  } catch(e) {
    el.innerHTML = `<p style="color:var(--danger-text);padding:24px"><i class="ph ph-warning"></i> ${t('err_load')}: ${e.message}. ${t('err_restartServer')}</p>`
  }
}

async function renderTrainingOverview(el) {
  const [sumRes, listRes] = await Promise.all([
    fetch('/training/summary', { headers: apiHeaders() }),
    fetch('/training',         { headers: apiHeaders() })
  ])
  if (!sumRes.ok || !listRes.ok) throw new Error(`HTTP ${sumRes.status}/${listRes.status}`)
  const summary = await sumRes.json()
  const listRaw = await listRes.json()
  const list    = Array.isArray(listRaw) ? listRaw : []
  const rank = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.editor

  el.innerHTML = `
    <div class="training-kpi-row">
      <div class="training-kpi"><span class="training-kpi-val">${summary.total}</span><span class="training-kpi-label">${t('trn_total')}</span></div>
      <div class="training-kpi planned"><span class="training-kpi-val">${summary.planned}</span><span class="training-kpi-label">${t('trnl_statPlanned')}</span></div>
      <div class="training-kpi inprogress"><span class="training-kpi-val">${summary.inProgress}</span><span class="training-kpi-label">${t('trnl_statProgress')}</span></div>
      <div class="training-kpi completed"><span class="training-kpi-val">${summary.completed}</span><span class="training-kpi-label">${t('trnl_statCompleted')}</span></div>
      <div class="training-kpi overdue"><span class="training-kpi-val">${summary.overdue}</span><span class="training-kpi-label">${t('trn_overdue')}</span></div>
      <div class="training-kpi rate"><span class="training-kpi-val">${summary.completionRate}%</span><span class="training-kpi-label">${t('training_completionRate')}</span></div>
    </div>
    <h3 style="margin:20px 0 10px;font-size:.95rem;color:var(--text-subtle)">${t('training_overdueUpcoming')}</h3>
    <div class="training-overview-list">
      ${list.filter(i => i.overdue || (i.dueDate && Math.ceil((new Date(i.dueDate)-new Date())/86400000) <= 30 && i.status !== 'completed' && i.status !== 'cancelled'))
        .sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate))
        .map(i => {
          const diff = i.dueDate ? Math.ceil((new Date(i.dueDate)-new Date())/86400000) : null
          const urgency = i.overdue ? 'overdue' : diff !== null && diff <= 7 ? 'due-soon' : ''
          return `<div class="training-overview-item ${urgency}">
            <span class="badge ${TRAINING_STATUS_CLS[i.status]||''}">${TRAINING_STATUS_LABELS[i.status]||i.status}</span>
            <strong>${escHtml(i.title)}</strong>
            <span style="color:var(--text-subtle);font-size:.78rem">${TRAINING_CAT_LABELS[i.category]||i.category}</span>
            <span class="training-due ${urgency}">${i.dueDate ? (i.overdue ? `${t('training_overdueSince')} ${i.dueDate}` : `${t('trn_dueLabel')}: ${i.dueDate}`) : '—'}</span>
            <span style="color:var(--text-subtle);font-size:.78rem">${escHtml(i.assignees||'—')}</span>
          </div>`
        }).join('') || `<p style="color:var(--text-subtle)">${t('training_noUrgent')}</p>`}
    </div>
  `
}

async function renderTrainingPlan(el) {
  const rank = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.editor
  const isAdmin = rank >= ROLE_RANK.admin

  const res = await fetch('/training', { headers: apiHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = await res.json()
  let list = Array.isArray(raw) ? raw : []

  el.innerHTML = `
    <div class="training-plan-toolbar">
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openTrainingForm()"><i class="ph ph-plus"></i> ${t('trn_newTraining')}</button>` : ''}
      <select id="trainingFilterStatus" class="select select-sm" onchange="filterTrainingPlan()">
        <option value="">${t('filter_allStatuses')}</option>
        ${Object.entries(TRAINING_STATUS_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
      <select id="trainingFilterCat" class="select select-sm" onchange="filterTrainingPlan()">
        <option value="">${t('filter_allCats')}</option>
        ${Object.entries(TRAINING_CAT_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
    </div>
    <div id="trainingPlanTable"></div>
  `
  renderTrainingTable(list, isAdmin, canEdit)
}

function renderTrainingTable(list, isAdmin, canEdit) {
  const el = dom('trainingPlanTable')
  if (!el) return
  if (!list.length) { el.innerHTML = `<p style="color:var(--text-subtle);padding:16px">${t('trn_noRecords')}</p>`; return }
  el.innerHTML = `
    <table class="training-table">
      <thead><tr>
        <th>${t('col_title')}</th><th>${t('col_category')}</th><th>${t('col_status')}</th><th>${t('col_dueDate')}</th><th>${t('trn_colMandatory')}</th><th>${t('trn_colAssignedTo')}</th>${canEdit?'<th></th>':''}
      </tr></thead>
      <tbody>
        ${list.map(i => `
          <tr class="${i.overdue?'training-row-overdue':''}">
            <td><strong>${escHtml(i.title)}</strong></td>
            <td><span class="training-cat-chip">${TRAINING_CAT_LABELS[i.category]||i.category}</span></td>
            <td><span class="badge ${TRAINING_STATUS_CLS[i.status]||''}">${TRAINING_STATUS_LABELS[i.status]||i.status}</span></td>
            <td class="${i.overdue?'training-overdue-text':''}">${i.dueDate||'—'}</td>
            <td>${i.mandatory?'<i class="ph ph-check-circle" style="color:var(--success-text)"></i>':'—'}</td>
            <td style="font-size:.78rem;color:var(--text-subtle)">${escHtml(i.assignees||'—')}</td>
            ${canEdit ? `<td>
              <button class="btn btn-secondary btn-xs" onclick="openTrainingForm('${i.id}')"><i class="ph ph-pencil"></i></button>
              ${isAdmin ? `<button class="btn btn-danger btn-xs" onclick="deleteTraining('${i.id}')"><i class="ph ph-trash"></i></button>` : ''}
            </td>` : ''}
          </tr>`).join('')}
      </tbody>
    </table>
  `
}

async function filterTrainingPlan() {
  const status   = dom('trainingFilterStatus')?.value || ''
  const category = dom('trainingFilterCat')?.value    || ''
  const params   = new URLSearchParams()
  if (status)   params.set('status',   status)
  if (category) params.set('category', category)
  const list = await fetch(`/training?${params}`, { headers: apiHeaders() }).then(r => r.json())
  const rank = ROLE_RANK[getCurrentRole()] || 0
  renderTrainingTable(list, rank >= ROLE_RANK.admin, rank >= ROLE_RANK.editor)
}

async function renderTrainingEvidence(el) {
  const res = await fetch('/training?status=completed', { headers: apiHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = await res.json()
  const list = Array.isArray(raw) ? raw : []
  el.innerHTML = `
    <h3 style="margin:0 0 16px;font-size:.95rem;color:var(--text-subtle)">${t('training_evidenceHeading')}</h3>
    ${list.length === 0
      ? `<p style="color:var(--text-subtle)">${t('training_noEvidence')}</p>`
      : list.map(i => `
        <div class="training-evidence-card">
          <div class="training-evidence-header">
            <strong>${escHtml(i.title)}</strong>
            <span class="training-cat-chip">${TRAINING_CAT_LABELS[i.category]||i.category}</span>
            <span style="color:var(--text-subtle);font-size:.78rem">${t('ack_statusCompleted')}: ${i.completedDate||'—'}</span>
          </div>
          <div class="training-evidence-meta">
            <span><i class="ph ph-user"></i> ${escHtml(i.instructor||'—')}</span>
            <span><i class="ph ph-users"></i> ${escHtml(i.assignees||'—')}</span>
          </div>
          ${i.evidence ? `<div class="training-evidence-text"><i class="ph ph-note-pencil"></i> ${escHtml(i.evidence)}</div>` : `<div class="training-evidence-text" style="color:var(--text-subtle);font-style:italic">${t('trn_noEvidenceText')}</div>`}
        </div>`).join('')}
  `
}

async function openTrainingForm(id) {
  const isEdit = !!id
  let item = null
  if (isEdit) {
    const r = await fetch(`/training/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }
  const el = dom('trainingTabContent')
  if (!el) return

  // Tab-Bar deaktivieren während des Formulars
  document.querySelectorAll('.training-tab').forEach(b => b.classList.remove('active'))

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchTrainingTab('plan')">
          <i class="ph ph-arrow-left"></i> ${t('trn_backToOverview')}
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-graduation-cap"></i>
          ${isEdit ? t('trn_editTraining') : t('trn_newTraining')}
        </h3>
      </div>
      <div class="training-form-body">
        <div class="training-form-section">
          <div class="form-group">
            <label class="form-label">${t('col_title')} <span class="form-required">*</span></label>
            <input id="tmTitel" class="form-input" value="${escHtml(item?.title||'')}" placeholder="${t('trn_titlePh')}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('col_category')}</label>
              <select id="tmCat" class="select">
                ${Object.entries(TRAINING_CAT_LABELS).map(([v,l])=>`<option value="${v}"${item?.category===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('col_status')}</label>
              <select id="tmStatus" class="select">
                ${Object.entries(TRAINING_STATUS_LABELS).map(([v,l])=>`<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('ui_description')}</label>
            <textarea id="tmDesc" class="form-input" rows="3" placeholder="${t('trn_descPh')}">${escHtml(item?.description||'')}</textarea>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-calendar"></i> ${t('trn_planning')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('col_dueDate')}</label>
              <input id="tmDue" type="date" class="form-input" value="${item?.dueDate||''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">${t('trn_completedOn')}</label>
              <input id="tmDone" type="date" class="form-input" value="${item?.completedDate||''}" style="color-scheme:dark">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('trn_instructorProvider')}</label>
              <input id="tmInstructor" class="form-input" value="${escHtml(item?.instructor||'')}" placeholder="${t('trn_instructorPh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('trn_colAssignedTo')}</label>
              <input id="tmAssignees" class="form-input" value="${escHtml(item?.assignees||'')}" placeholder="${t('trn_assigneesPh')}">
            </div>
          </div>
          <div class="form-group" style="display:flex;align-items:center;gap:10px;margin-top:4px">
            <input id="tmMandatory" type="checkbox" ${item?.mandatory?'checked':''} style="width:16px;height:16px">
            <label for="tmMandatory" class="form-label" style="margin:0;cursor:pointer">${t('trn_mandatoryTraining')}</label>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-certificate"></i> ${t('training_tabEvidence')}</h4>
          <div class="form-group">
            <label class="form-label">${t('trn_evidenceNotes')}</label>
            <textarea id="tmEvidence" class="form-input" rows="4" placeholder="${t('trn_evidencePh')}">${escHtml(item?.evidence||'')}</textarea>
          </div>
          ${renderLinksBlock('tm', item?.linkedControls||[], item?.linkedPolicies||[])}
        </div>
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchTrainingTab('plan')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveTraining('${id||''}')">
          <i class="ph ph-floppy-disk"></i> ${t('ui_save')}
        </button>
      </div>
    </div>
  `
  initLinkPickers('tm')
}

async function saveTraining(id) {
  const payload = {
    title:          dom('tmTitel')?.value?.trim() || '',
    category:       dom('tmCat')?.value || 'other',
    status:         dom('tmStatus')?.value || 'planned',
    dueDate:        dom('tmDue')?.value || null,
    completedDate:  dom('tmDone')?.value || null,
    description:    dom('tmDesc')?.value || '',
    instructor:     dom('tmInstructor')?.value || '',
    assignees:      dom('tmAssignees')?.value || '',
    evidence:       dom('tmEvidence')?.value || '',
    mandatory:      dom('tmMandatory')?.checked || false,
    linkedControls: getLinkedValues('tm', 'ctrl'),
    linkedPolicies: getLinkedValues('tm', 'pol'),
  }
  if (!payload.title) { alert('Title is required'); return }
  const url    = id ? `/training/${id}` : '/training'
  const method = id ? 'PUT' : 'POST'
  const res = await fetch(url, { method, headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  switchTrainingTab('plan')
}

async function deleteTraining(id) {
  if (!confirm('Delete training?')) return
  const res = await fetch(`/training/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  switchTrainingTab(_trainingTab)
}

// ── Legal & Privacy ─────────────────────────────────────────────────────────

let _legalTab = 'contracts'

const LEGAL_CONTRACT_STATUS_LABELS = { get draft() { return t('legl_stDraft') }, get review() { return t('legl_stReview') }, get active() { return t('legl_stActive') }, get expired() { return t('legl_stExpired') }, get terminated() { return t('legl_stTerminated') } }
const LEGAL_NDA_STATUS_LABELS      = { get draft() { return t('legl_stDraft') }, get signed() { return t('legl_stSigned') }, get expired() { return t('legl_stExpired') }, get terminated() { return t('legl_stTerminated') } }
const LEGAL_POLICY_STATUS_LABELS   = { get draft() { return t('legl_stDraft') }, get review() { return t('legl_stReview') }, get published() { return t('legl_stPublished') }, get archived() { return t('legl_stArchived') } }
const LEGAL_CONTRACT_TYPE_LABELS   = { get service() { return t('legl_ctService') }, get supply() { return t('legl_ctSupply') }, get nda() { return t('legl_ctNda') }, get framework() { return t('legl_ctFramework') }, get other() { return t('legl_ctOther') } }
const LEGAL_NDA_TYPE_LABELS        = { get bilateral() { return t('legl_ndBilateral') }, get unilateral_recv() { return t('legl_ndRecv') }, get unilateral_give() { return t('legl_ndGive') } }
const LEGAL_POLICY_TYPE_LABELS     = { get privacy_notice() { return t('legl_pyPrivacy') }, get cookie() { return t('legl_pyCookie') }, get consent_form() { return t('legl_pyConsent') }, get employee() { return t('legl_pyEmployee') }, get internal() { return t('legl_pyInternal') }, get other() { return t('legl_pyOther') } }

async function renderLegal(startTab) {
  if (startTab) _legalTab = startTab
  dom('legalContainer')?.remove()
  const main = document.querySelector('main') || document.querySelector('.main-content') || document.body
  const container = document.createElement('div')
  container.id = 'legalContainer'
  container.className = 'gdpr-fullpage'
  main.appendChild(container)

  // Skeleton sofort rendern — kein await davor, damit Chrome keinen leeren Container zeigt
  container.innerHTML = `
    <div class="gdpr-header">
      <h2><i class="ph ph-scales"></i> Legal &amp; Privacy</h2>
      <div class="gdpr-header-actions" id="legalKPIs">
        <span class="report-kpi" style="padding:0 .5rem"><span class="report-kpi-val">—</span><span class="report-kpi-label">Active Contracts</span></span>
        <span class="report-kpi" style="padding:0 .5rem"><span class="report-kpi-val">—</span><span class="report-kpi-label">Expiring</span></span>
        <span class="report-kpi" style="padding:0 .5rem"><span class="report-kpi-val">—</span><span class="report-kpi-label">Active NDAs</span></span>
        <span class="report-kpi" style="padding:0 .5rem"><span class="report-kpi-val">—</span><span class="report-kpi-label">Live Policies</span></span>
      </div>
    </div>
    <div class="gdpr-tab-bar">
      <button class="gdpr-tab${_legalTab==='contracts' ?' active':''}" onclick="switchLegalTab('contracts')"><i class="ph ph-file-text"></i> ${t('legal_contractsTab')}</button>
      <button class="gdpr-tab${_legalTab==='ndas'      ?' active':''}" onclick="switchLegalTab('ndas')"><i class="ph ph-handshake"></i> NDAs</button>
      <button class="gdpr-tab${_legalTab==='policies'  ?' active':''}" onclick="switchLegalTab('policies')"><i class="ph ph-lock-key-open"></i> Privacy Policies</button>
    </div>
    <div class="gdpr-content" id="legalTabContent"><p style="padding:16px"><i class="ph ph-spinner"></i> Loading…</p></div>
  `

  // Tab-Inhalt und Summary parallel laden
  switchLegalTab(_legalTab).catch(() => {})

  // KPIs im Hintergrund nachladen und nur die Zahlen aktualisieren
  try {
    const r = await fetch('/legal/summary', { headers: apiHeaders() })
    if (!container.isConnected) return  // Nutzer hat bereits weiternavigiert
    if (r.ok) {
      const summary = await r.json()
      if (!container.isConnected) return
      const kpis = dom('legalKPIs')
      if (kpis) kpis.innerHTML = `
        <span class="report-kpi" style="padding:0 .5rem"><span class="report-kpi-val">${summary.contracts.active}</span><span class="report-kpi-label">Active Contracts</span></span>
        <span class="report-kpi" style="padding:0 .5rem"><span class="report-kpi-val ${summary.contracts.expiring > 0 ? 'yellow' : ''}">${summary.contracts.expiring}</span><span class="report-kpi-label">Expiring</span></span>
        <span class="report-kpi" style="padding:0 .5rem"><span class="report-kpi-val">${summary.ndas.signed}</span><span class="report-kpi-label">Active NDAs</span></span>
        <span class="report-kpi" style="padding:0 .5rem"><span class="report-kpi-val">${summary.policies.published}</span><span class="report-kpi-label">Live Policies</span></span>
      `
    }
  } catch {}
}

async function switchLegalTab(tab) {
  _legalTab = tab
  document.querySelectorAll('#legalContainer .gdpr-tab').forEach(b => b.classList.toggle('active', b.textContent.trim().toLowerCase().includes(tab === 'contracts' ? 'contract' : tab === 'ndas' ? 'nda' : 'policy')))
  // besser per data-tab
  document.querySelectorAll('#legalContainer .gdpr-tab').forEach(b => {
    const map = { contracts:'contracts', ndas:'ndas', policies:'policies' }
    if (!b.dataset.tab) {
      if (b.textContent.includes('Contract')) b.dataset.tab = 'contracts'
      if (b.textContent.includes('NDA'))      b.dataset.tab = 'ndas'
      if (b.textContent.includes('Policy'))   b.dataset.tab = 'policies'
    }
    b.classList.toggle('active', b.dataset.tab === tab)
  })
  const content = dom('legalTabContent')
  if (!content) return
  content.innerHTML = '<p style="padding:16px"><i class="ph ph-spinner"></i> Loading…</p>'
  try {
    if (tab === 'contracts') await renderLegalContracts(content)
    if (tab === 'ndas')      await renderLegalNdas(content)
    if (tab === 'policies')  await renderLegalPolicies(content)
  } catch (e) {
    content.innerHTML = `<p style="color:var(--danger-text);padding:16px">Error: ${e.message}</p>`
  }
}

async function renderLegalContracts(el) {
  const r = await fetch('/legal/contracts', { headers: apiHeaders() })
  const list = r.ok ? await r.json() : []
  const canEdit = canAccess('contentowner')
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB') : '—'

  el.innerHTML = `
    <div class="gdpr-filter-bar">
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openLegalForm('contract')"><i class="ph ph-plus"></i> ${t('legal_newContract')}</button>` : ''}
      <a class="btn btn-secondary btn-sm" href="/legal/contracts/export/csv" download><i class="ph ph-download-simple"></i> CSV</a>
      <span class="gdpr-filter-count">${list.length} contracts</span>
    </div>
    ${list.length === 0 ? `<p class="gdpr-empty">${t('legal_noContracts')}</p>` : `
    <table class="gdpr-table">
      <thead><tr><th>Title</th><th>Type</th><th>Counterparty</th><th>Status</th><th>End Date</th><th>Owner</th><th><i class="ph ph-paperclip"></i></th><th>Actions</th></tr></thead>
      <tbody>${list.map(c => `
        <tr>
          <td><strong>${escHtml(c.title)}</strong></td>
          <td>${LEGAL_CONTRACT_TYPE_LABELS[c.contractType]||c.contractType}</td>
          <td>${escHtml(c.counterparty)}</td>
          <td><span class="status-badge status-${c.status}">${LEGAL_CONTRACT_STATUS_LABELS[c.status]||c.status}</span></td>
          <td class="${c.endDate && new Date(c.endDate) < new Date(Date.now()+60*86400000) ? 'text-warning' : ''}">${fmtDate(c.endDate)}</td>
          <td>${escHtml(c.owner||'—')}</td>
          <td style="text-align:center">${c.attachments?.length ? `<span class="gdpr-filter-count" style="font-size:.75rem">${c.attachments.length}</span>` : '—'}</td>
          <td>
            ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="openLegalForm('contract','${c.id}')"><i class="ph ph-pencil"></i></button>` : ''}
            ${canAccess('admin') ? `<button class="btn btn-danger btn-sm" onclick="deleteLegalItem('contracts','${c.id}')"><i class="ph ph-trash"></i></button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  `
}

async function renderLegalNdas(el) {
  const r = await fetch('/legal/ndas', { headers: apiHeaders() })
  const list = r.ok ? await r.json() : []
  const canEdit = canAccess('contentowner')
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB') : '—'

  el.innerHTML = `
    <div class="gdpr-filter-bar">
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openLegalForm('nda')"><i class="ph ph-plus"></i> ${t('legal_newNda')}</button>` : ''}
      <a class="btn btn-secondary btn-sm" href="/legal/ndas/export/csv" download><i class="ph ph-download-simple"></i> CSV</a>
      <span class="gdpr-filter-count">${list.length} NDAs</span>
    </div>
    ${list.length === 0 ? `<p class="gdpr-empty">${t('legal_noNdas')}</p>` : `
    <table class="gdpr-table">
      <thead><tr><th>Title</th><th>Type</th><th>Counterparty</th><th>Status</th><th>Signed</th><th>Expires</th><th><i class="ph ph-paperclip"></i></th><th>Actions</th></tr></thead>
      <tbody>${list.map(n => `
        <tr>
          <td><strong>${escHtml(n.title)}</strong></td>
          <td>${LEGAL_NDA_TYPE_LABELS[n.ndaType]||n.ndaType}</td>
          <td>${escHtml(n.counterparty)}</td>
          <td><span class="status-badge status-${n.status}">${LEGAL_NDA_STATUS_LABELS[n.status]||n.status}</span></td>
          <td>${fmtDate(n.signingDate)}</td>
          <td class="${n.expiryDate && new Date(n.expiryDate) < new Date(Date.now()+30*86400000) ? 'text-warning' : ''}">${fmtDate(n.expiryDate)}</td>
          <td style="text-align:center">${n.attachments?.length ? `<span class="gdpr-filter-count" style="font-size:.75rem">${n.attachments.length}</span>` : '—'}</td>
          <td>
            ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="openLegalForm('nda','${n.id}')"><i class="ph ph-pencil"></i></button>` : ''}
            ${canAccess('admin') ? `<button class="btn btn-danger btn-sm" onclick="deleteLegalItem('ndas','${n.id}')"><i class="ph ph-trash"></i></button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  `
}

async function renderLegalPolicies(el) {
  const r = await fetch('/legal/policies', { headers: apiHeaders() })
  const list = r.ok ? await r.json() : []
  const canEdit = canAccess('contentowner')
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB') : '—'

  el.innerHTML = `
    <div class="gdpr-filter-bar">
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openLegalForm('policy')"><i class="ph ph-plus"></i> ${t('legal_newPolicy')}</button>` : ''}
      <a class="btn btn-secondary btn-sm" href="/legal/policies/export/csv" download><i class="ph ph-download-simple"></i> CSV</a>
      <span class="gdpr-filter-count">${list.length} policies</span>
    </div>
    ${list.length === 0 ? `<p class="gdpr-empty">${t('legal_noPolicies')}</p>` : `
    <table class="gdpr-table">
      <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Version</th><th>Published</th><th>Next Review</th><th><i class="ph ph-paperclip"></i></th><th>Actions</th></tr></thead>
      <tbody>${list.map(p => `
        <tr>
          <td><strong>${escHtml(p.title)}</strong>${p.url ? ` <a href="${escHtml(p.url)}" target="_blank" style="font-size:.8rem"><i class="ph ph-link"></i></a>` : ''}</td>
          <td>${LEGAL_POLICY_TYPE_LABELS[p.policyType]||p.policyType}</td>
          <td><span class="status-badge status-${p.status}">${LEGAL_POLICY_STATUS_LABELS[p.status]||p.status}</span></td>
          <td>v${p.version}</td>
          <td>${fmtDate(p.publishedAt)}</td>
          <td class="${p.nextReviewDate && new Date(p.nextReviewDate) < new Date() ? 'text-danger' : ''}">${fmtDate(p.nextReviewDate)}</td>
          <td style="text-align:center">${p.attachments?.length ? `<span class="gdpr-filter-count" style="font-size:.75rem">${p.attachments.length}</span>` : '—'}</td>
          <td>
            ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="openLegalForm('policy','${p.id}')"><i class="ph ph-pencil"></i></button>` : ''}
            ${canAccess('admin') ? `<button class="btn btn-danger btn-sm" onclick="deleteLegalItem('policies','${p.id}')"><i class="ph ph-trash"></i></button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  `
}

// ── Legal: Vollseiten-Formular (kein Modal) ────────────────────────

const LEGAL_ENDPOINT = { contract:'contracts', nda:'ndas', policy:'policies' }
const LEGAL_BACK_TAB = { contract:'contracts', nda:'ndas', policy:'policies' }

async function openLegalForm(type, id) {
  const isEdit = !!id
  let item = null
  if (isEdit) {
    const r = await fetch(`/legal/${LEGAL_ENDPOINT[type]}/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }

  const el = dom('legalTabContent')
  if (!el) return
  document.querySelectorAll('#legalContainer .gdpr-tab').forEach(b => b.classList.remove('active'))

  const TITLES = { contract: isEdit ? 'Edit Contract'       : 'New Contract',
                   nda:      isEdit ? 'Edit NDA'            : 'New NDA',
                   policy:   isEdit ? 'Edit Policy'         : 'New Privacy Policy' }
  const ICONS  = { contract:'ph-file-text', nda:'ph-handshake', policy:'ph-lock-key-open' }

  const attachSection = isEdit ? `
    <div class="legal-form-section">
      <h4 class="legal-form-section-title"><i class="ph ph-paperclip"></i> ${t('ui_attachments')}</h4>
      <div id="legalAttachList">${_renderLegalAttachList(item?.attachments||[], LEGAL_ENDPOINT[type], id)}</div>
      <div class="legal-attach-upload">
        <label class="form-label">Upload document (PDF, DOCX, XLSX, PPTX, PNG, JPG, TXT, ZIP – max. 20 MB)</label>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
          <input type="file" id="legalAttachFile" class="form-input" style="flex:1;min-width:200px"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.png,.jpg,.jpeg,.txt,.zip">
          <button class="btn btn-secondary btn-sm" onclick="uploadLegalAttachment('${LEGAL_ENDPOINT[type]}','${id}')">
            <i class="ph ph-upload-simple"></i> Upload
          </button>
        </div>
      </div>
    </div>` : `<p class="gdpr-empty" style="font-size:.83rem"><i class="ph ph-info"></i> Attachments can be uploaded after saving.</p>`

  let formBody = ''
  if (type === 'contract') {
    formBody = `
      <div class="legal-form-section">
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">${t('col_title')} <span class="form-required">*</span></label>
            <input id="lc_title" class="form-input" value="${escHtml(item?.title||'')}" placeholder="${t('legal_contractName')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('col_type')}</label>
            <select id="lc_type" class="select">
              ${Object.entries(LEGAL_CONTRACT_TYPE_LABELS).map(([v,l])=>`<option value="${v}"${item?.contractType===v?' selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">${t('legal_counterparty')}</label>
            <input id="lc_party" class="form-input" value="${escHtml(item?.counterparty||'')}" placeholder="${t('legal_companyName')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('col_status')}</label>
            <select id="lc_status" class="select">
              ${Object.entries(LEGAL_CONTRACT_STATUS_LABELS).map(([v,l])=>`<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">${t('legal_start')}</label><input id="lc_start" type="date" class="form-input" value="${item?.startDate||''}" style="color-scheme:dark"></div>
          <div class="form-group"><label class="form-label">${t('legal_end')}</label><input id="lc_end" type="date" class="form-input" value="${item?.endDate||''}" style="color-scheme:dark"></div>
          <div class="form-group"><label class="form-label">${t('legal_noticePeriod')}</label><input id="lc_notice" type="number" class="form-input" value="${item?.noticePeriodDays||''}" placeholder="e.g. 30"></div>
          <div class="form-group"><label class="form-label">${t('legal_contractValue')}</label><input id="lc_value" class="form-input" value="${escHtml(item?.value||'')}" placeholder="e.g. 12,000 EUR/year"></div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">${t('ui_ownerResp')}</label>
            <input id="lc_owner" class="form-input" value="${escHtml(item?.owner||'')}" placeholder="${t('ui_ownerRespPh')}">
          </div>
          <div class="form-group" style="display:flex;align-items:center;gap:.5rem;padding-top:1.5rem">
            <input type="checkbox" id="lc_autorenew" ${item?.autoRenew?'checked':''} style="width:16px;height:16px">
            <label for="lc_autorenew" class="form-label" style="margin:0;cursor:pointer">${t('legal_autoRenewal')}</label>
          </div>
        </div>
        <div class="form-group"><label class="form-label">${t('legal_descSubject')}</label>
          <textarea id="lc_desc" class="form-input" rows="4" placeholder="${t('legal_serviceDescPh')}">${escHtml(item?.description||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('ui_internalNotes')}</label>
          <textarea id="lc_notes" class="form-input" rows="3" placeholder="${t('legal_notesPh')}">${escHtml(item?.notes||'')}</textarea></div>
        ${renderLinksBlock('lc', item?.linkedControls||[], item?.linkedPolicies||[])}
      </div>
      ${attachSection}`
  } else if (type === 'nda') {
    formBody = `
      <div class="legal-form-section">
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">${t('col_title')} <span class="form-required">*</span></label>
            <input id="ln_title" class="form-input" value="${escHtml(item?.title||'')}" placeholder="${t('legal_ndaName')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('col_type')}</label>
            <select id="ln_type" class="select">
              ${Object.entries(LEGAL_NDA_TYPE_LABELS).map(([v,l])=>`<option value="${v}"${item?.ndaType===v?' selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('col_status')}</label>
            <select id="ln_status" class="select">
              ${Object.entries(LEGAL_NDA_STATUS_LABELS).map(([v,l])=>`<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">${t('legal_counterparty')}</label>
            <input id="ln_party" class="form-input" value="${escHtml(item?.counterparty||'')}" placeholder="${t('legal_companyPersonPh')}">
          </div>
          <div class="form-group"><label class="form-label">${t('legal_signedOn')}</label>
            <input id="ln_signed" type="date" class="form-input" value="${item?.signingDate||''}" style="color-scheme:dark"></div>
          <div class="form-group"><label class="form-label">${t('legal_expiresOn')}</label>
            <input id="ln_expiry" type="date" class="form-input" value="${item?.expiryDate||''}" style="color-scheme:dark"></div>
        </div>
        <div class="form-group"><label class="form-label">${t('ui_ownerResp')}</label>
          <input id="ln_owner" class="form-input" value="${escHtml(item?.owner||'')}" placeholder="${t('ui_ownerRespPh')}"></div>
        <div class="form-group"><label class="form-label">${t('legal_scopeSubject')}</label>
          <textarea id="ln_scope" class="form-input" rows="4" placeholder="${t('legal_ndaScopePh')}">${escHtml(item?.scope||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('ui_internalNotes')}</label>
          <textarea id="ln_notes" class="form-input" rows="3">${escHtml(item?.notes||'')}</textarea></div>
        ${renderLinksBlock('ln', item?.linkedControls||[], item?.linkedPolicies||[])}
      </div>
      ${attachSection}`
  } else if (type === 'policy') {
    formBody = `
      <div class="legal-form-section">
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">${t('col_title')} <span class="form-required">*</span></label>
            <input id="lp_title" class="form-input" value="${escHtml(item?.title||'')}" placeholder="${t('legal_policyName')}">
          </div>
          <div class="form-group">
            <label class="form-label">${t('col_type')}</label>
            <select id="lp_type" class="select">
              ${Object.entries(LEGAL_POLICY_TYPE_LABELS).map(([v,l])=>`<option value="${v}"${item?.policyType===v?' selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('col_status')}</label>
            <select id="lp_status" class="select">
              ${Object.entries(LEGAL_POLICY_STATUS_LABELS).map(([v,l])=>`<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">${t('legal_publicUrl')}</label>
            <input id="lp_url" class="form-input" value="${escHtml(item?.url||'')}" placeholder="https://…">
          </div>
          <div class="form-group"><label class="form-label">${t('legal_publishedOn')}</label>
            <input id="lp_pub" type="date" class="form-input" value="${item?.publishedAt||''}" style="color-scheme:dark"></div>
          <div class="form-group"><label class="form-label">${t('legal_nextReview')}</label>
            <input id="lp_review" type="date" class="form-input" value="${item?.nextReviewDate||''}" style="color-scheme:dark"></div>
        </div>
        <div class="form-group"><label class="form-label">${t('ui_ownerResp')}</label>
          <input id="lp_owner" class="form-input" value="${escHtml(item?.owner||'')}" placeholder="${t('ui_ownerRespPh')}"></div>
        <div class="form-group"><label class="form-label">${t('legal_descSubject')}</label>
          <textarea id="lp_desc" class="form-input" rows="3" placeholder="${t('legal_briefDescPh')}">${escHtml(item?.description||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('legal_policyContent')}</label>
          <textarea id="lp_content" class="form-input" rows="8" placeholder="## Privacy Policy&#10;&#10;We process your data pursuant to Art. 6 GDPR…">${escHtml(item?.content||'')}</textarea></div>
        <div class="form-group"><label class="form-label">${t('ui_internalNotes')}</label>
          <textarea id="lp_notes" class="form-input" rows="3">${escHtml(item?.notes||'')}</textarea></div>
        ${renderLinksBlock('lp', item?.linkedControls||[], item?.linkedPolicies||[])}
      </div>
      ${attachSection}`
  }

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchLegalTab('${LEGAL_BACK_TAB[type]}')">
          <i class="ph ph-arrow-left"></i> Back to Overview
        </button>
        <h3 class="training-form-title">
          <i class="ph ${ICONS[type]}"></i> ${TITLES[type]}
        </h3>
      </div>
      <div class="training-form-body">${formBody}</div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchLegalTab('${LEGAL_BACK_TAB[type]}')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveLegalItem('${type}','${id||''}')">
          <i class="ph ph-floppy-disk"></i> Save
        </button>
      </div>
    </div>
  `
  const prefixMap = { contract: 'lc', nda: 'ln', policy: 'lp' }
  initLinkPickers(prefixMap[type] || 'lc')
}

function _renderLegalAttachList(attachments, resource, itemId) {
  if (!attachments || attachments.length === 0) {
    return '<p class="gdpr-empty" style="margin:.5rem 0">No attachments yet.</p>'
  }
  const fmtSize = b => b > 1048576 ? (b/1048576).toFixed(1)+' MB' : (b/1024).toFixed(0)+' KB'
  return `<div class="legal-attach-list">${attachments.map(a => `
    <div class="legal-attach-item">
      <i class="ph ph-file-text"></i>
      <a href="/legal/${resource}/${itemId}/attachments/${a.id}/file" target="_blank" class="legal-attach-name">${escHtml(a.originalName)}</a>
      <span class="legal-attach-meta">${fmtSize(a.size)} · ${new Date(a.uploadedAt).toLocaleDateString('en-GB')}</span>
      ${canAccess('contentowner') ? `<button class="btn btn-danger btn-xs" onclick="deleteLegalAttachment('${resource}','${itemId}','${a.id}')"><i class="ph ph-trash"></i></button>` : ''}
    </div>`).join('')}</div>`
}

async function uploadLegalAttachment(resource, itemId) {
  const fileInput = dom('legalAttachFile')
  if (!fileInput?.files?.length) { alert('Please select a file.'); return }
  const fd = new FormData()
  fd.append('file', fileInput.files[0])
  const res = await fetch(`/legal/${resource}/${itemId}/attachments`, {
    method: 'POST', headers: apiHeaders(), body: fd
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Upload failed'); return }
  const meta = await res.json()
  // Reload item to get updated attachments
  const itemRes = await fetch(`/legal/${resource}/${itemId}`, { headers: apiHeaders() })
  if (itemRes.ok) {
    const item = await itemRes.json()
    const listEl = dom('legalAttachList')
    if (listEl) listEl.innerHTML = _renderLegalAttachList(item.attachments||[], resource, itemId)
  }
  fileInput.value = ''
}

async function deleteLegalAttachment(resource, itemId, attId) {
  if (!confirm('Delete attachment?')) return
  const res = await fetch(`/legal/${resource}/${itemId}/attachments/${attId}`, {
    method: 'DELETE', headers: apiHeaders()
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  const itemRes = await fetch(`/legal/${resource}/${itemId}`, { headers: apiHeaders() })
  if (itemRes.ok) {
    const item = await itemRes.json()
    const listEl = dom('legalAttachList')
    if (listEl) listEl.innerHTML = _renderLegalAttachList(item.attachments||[], resource, itemId)
  }
}

async function saveLegalItem(type, id) {
  let payload = {}

  if (type === 'contract') {
    const title = dom('lc_title')?.value?.trim()
    if (!title) { alert('Title is required'); return }
    payload = {
      title, contractType: dom('lc_type')?.value,
      counterparty: dom('lc_party')?.value || '',
      status: dom('lc_status')?.value,
      startDate: dom('lc_start')?.value || null,
      endDate: dom('lc_end')?.value || null,
      noticePeriodDays: parseInt(dom('lc_notice')?.value) || null,
      value: dom('lc_value')?.value || '',
      owner: dom('lc_owner')?.value || '',
      description: dom('lc_desc')?.value || '',
      notes: dom('lc_notes')?.value || '',
      autoRenew: dom('lc_autorenew')?.checked || false,
      linkedControls: getLinkedValues('lc', 'ctrl'),
      linkedPolicies: getLinkedValues('lc', 'pol')
    }
  } else if (type === 'nda') {
    const title = dom('ln_title')?.value?.trim()
    if (!title) { alert('Title is required'); return }
    payload = {
      title, ndaType: dom('ln_type')?.value,
      counterparty: dom('ln_party')?.value || '',
      status: dom('ln_status')?.value,
      signingDate: dom('ln_signed')?.value || null,
      expiryDate: dom('ln_expiry')?.value || null,
      scope: dom('ln_scope')?.value || '',
      owner: dom('ln_owner')?.value || '',
      notes: dom('ln_notes')?.value || '',
      linkedControls: getLinkedValues('ln', 'ctrl'),
      linkedPolicies: getLinkedValues('ln', 'pol')
    }
  } else if (type === 'policy') {
    const title = dom('lp_title')?.value?.trim()
    if (!title) { alert('Title is required'); return }
    payload = {
      title, policyType: dom('lp_type')?.value,
      status: dom('lp_status')?.value,
      url: dom('lp_url')?.value || '',
      publishedAt: dom('lp_pub')?.value || null,
      nextReviewDate: dom('lp_review')?.value || null,
      owner: dom('lp_owner')?.value || '',
      description: dom('lp_desc')?.value || '',
      content: dom('lp_content')?.value || '',
      notes: dom('lp_notes')?.value || '',
      linkedControls: getLinkedValues('lp', 'ctrl'),
      linkedPolicies: getLinkedValues('lp', 'pol')
    }
  }

  const endpoint = `/legal/${LEGAL_ENDPOINT[type]}${id ? '/'+id : ''}`
  const res = await fetch(endpoint, {
    method: id ? 'PUT' : 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  // Nach dem Speichern eines neuen Eintrags direkt in den Edit-Modus wechseln (für Anhänge)
  if (!id) {
    const created = await res.json()
    await openLegalForm(type, created.id)
    return
  }
  switchLegalTab(LEGAL_BACK_TAB[type])
}

async function deleteLegalItem(resource, id) {
  if (!confirm('Delete?')) return
  const res = await fetch(`/legal/${resource}/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  switchLegalTab(_legalTab)
}

// ── Asset Management ─────────────────────────────────────────────────────────

let _assetsTab = 'list'

// Asset-Typen (#64): seit die Typen im Admin editierbar sind, ist der Server
// die Quelle. Beide Werte werden beim Start aus /admin/lists gefüllt; die
// Vorgabe hier ist nur der Notnagel, falls der Abruf fehlschlägt.
let ASSET_TYPES = []
let ASSET_TYPES_MAP = {}

/**
 * Anzeigename eines Asset-Typs.
 *
 * Übersetzt wird nur, was unverändert ausgeliefert wurde: Stimmt das
 * gespeicherte Label exakt mit dem englischen Vorgabewert des zugehörigen
 * i18n-Schlüssels überein, gilt der Typ als unangetastet und wird übersetzt.
 * Sobald ein Administrator ihn umbenennt — oder einen eigenen Typ anlegt —
 * gewinnt sein Text, in der Sprache, in der er ihn eingegeben hat. Anders geht
 * es nicht: Für selbst angelegte Einträge existiert keine Übersetzung, und
 * eine Umbenennung stillschweigend zu überschreiben wäre schlimmer als eine
 * englische Bezeichnung. Die Regel ist in docs/module-assets.md festgehalten.
 */
function assetTypeLabel(idOrType) {
  const type = typeof idOrType === 'string'
    ? ASSET_TYPES.find(t => t.id === idOrType)
    : idOrType
  if (!type) return typeof idOrType === 'string' ? idOrType : ''
  const entry = (window.TRANSLATIONS || {})[`assetType_${type.id}`]
  if (entry && entry.en === type.label) return t(`assetType_${type.id}`)
  return type.label
}

/** Anzeigename einer Asset-Kategorie. Kategorien sind fest, daher immer übersetzt. */
function assetCatLabel(catId) {
  const entry = (window.TRANSLATIONS || {})[`assetCat_${catId}`]
  return entry ? t(`assetCat_${catId}`) : (ASSET_CAT_LABELS[catId] || catId)
}

// Kategorien: Die Schlüssel bestimmen Reihenfolge und Gültigkeit, die Anzeige
// läuft über assetCatLabel(). Die Werte hier sind nur noch Rückfallebene.
const ASSET_CAT_LABELS = {
  get hardware() { return t('assetCat_hardware') },
  get software() { return t('assetCat_software') },
  get data()     { return t('assetCat_data') },
  get service()  { return t('assetCat_service') },
  get facility() { return t('assetCat_facility') },
}

const ASSET_CLASS = {
  public:               { get label() { return t('assl_clPublic') },       color: '#4ade80' },
  internal:             { get label() { return t('assl_clInternal') },     color: '#60a5fa' },
  confidential:         { get label() { return t('assl_clConfidential') }, color: '#f0b429' },
  strictly_confidential:{ get label() { return t('assl_clStrict') }, color: '#f87171' },
}

const ASSET_CRIT = {
  low:      { get label() { return t('assl_crLow') },    color: '#4ade80' },
  medium:   { get label() { return t('assl_crMedium') }, color: '#60a5fa' },
  high:     { get label() { return t('assl_crHigh') },   color: '#f0b429' },
  critical: { get label() { return t('assl_crCritical') }, color: '#f87171' },
}

const ASSET_STATUS_LABELS = { get active() { return t('assl_stActive') }, get planned() { return t('assl_stPlanned') }, get decommissioned() { return t('assl_stDecommissioned') } }

function assetClassBadge(cls) {
  const c = ASSET_CLASS[cls] || { label: cls || '—', color: '#8C9BAB' }
  return `<span class="asset-badge" style="color:${c.color};border-color:${c.color}">${c.label}</span>`
}

function assetCritBadge(crit) {
  const c = ASSET_CRIT[crit] || { label: crit || '—', color: '#8C9BAB' }
  return `<span class="asset-badge" style="color:${c.color};border-color:${c.color}">${c.label}</span>`
}

// ── Schutzziele (CIA + Authentizität) — Issue #29 ─────────────
// Vererbung folgt dem BSI-Maximumprinzip: ein Asset erbt den höchsten
// Schutzbedarf aller Assets, die von ihm abhängen.

const ASSET_PROT_LEVELS = {
  1: { color: '#4ade80', get label() { return t('assets_lvl1') } },
  2: { color: '#60a5fa', get label() { return t('assets_lvl2') } },
  3: { color: '#f0b429', get label() { return t('assets_lvl3') } },
  4: { color: '#f87171', get label() { return t('assets_lvl4') } },
}

const ASSET_PROT_GOALS = [
  { key: 'c',    letter: 'C',  i18n: 'assets_protC'    },
  { key: 'i',    letter: 'I',  i18n: 'assets_protI'    },
  { key: 'a',    letter: 'A',  i18n: 'assets_protA'    },
  { key: 'auth', letter: 'Au', i18n: 'assets_protAuth' },
]

function protLevelColor(v) { return ASSET_PROT_LEVELS[v]?.color || '#8C9BAB' }

/** Kompakte Schutzziel-Chips für Tabellen; geerbte Werte gestrichelt + Pfeil. */
function assetProtChips(a, nameById) {
  const eff = a.effectiveProtection || a.protection || {}
  const own = a.protection || {}
  const org = a.protectionOrigins || {}

  const chips = ASSET_PROT_GOALS.map(g => {
    const v = eff[g.key]
    if (v === null || v === undefined) return ''    // Authentizität: nicht bewertet
    const inherited = org[g.key] && org[g.key] !== a.id
    const srcName   = inherited ? (nameById?.[org[g.key]] || org[g.key]) : ''
    const title = inherited
      ? `${t(g.i18n)}: ${ASSET_PROT_LEVELS[v].label} — ${t('assets_inheritedFrom')} ${srcName} (${t('assets_ownValue')}: ${own[g.key] ?? '—'})`
      : `${t(g.i18n)}: ${ASSET_PROT_LEVELS[v].label}`
    return `<span class="asset-prot-chip${inherited ? ' inherited' : ''}" style="color:${protLevelColor(v)}" title="${escHtml(title)}">${g.letter}${v}${inherited ? '<i class="ph ph-arrow-fat-line-up"></i>' : ''}</span>`
  }).filter(Boolean).join('')

  return chips ? `<span class="asset-prot-chips">${chips}</span>` : '<span class="asset-prot-none">—</span>'
}

async function renderAssets() {
  dom('assetsContainer')?.remove()
  const main = document.querySelector('main') || document.body
  const container = document.createElement('div')
  container.id = 'assetsContainer'
  container.className = 'training-container'
  main.appendChild(container)

  const tabs = [
    { id: 'list',           get label() { return t('assets_tabAll') },     icon: 'ph-list' },
    { id: 'by-category',    get label() { return t('assets_tabByCat') },   icon: 'ph-squares-four' },
    { id: 'by-class',       get label() { return t('assets_tabByClass') }, icon: 'ph-shield-check' },
    { id: 'dependencies',   get label() { return t('assets_tabDeps') },    icon: 'ph-graph' },
  ]

  container.innerHTML = `
    <div class="training-header">
      <h2 class="training-title"><i class="ph ph-buildings"></i> ${t('nav_assets')}</h2>
      <div class="training-tab-bar">
        ${tabs.map(t => `<button class="training-tab${t.id===_assetsTab?' active':''}" data-tab="${t.id}">
          <i class="ph ${t.icon}"></i> ${t.label}
        </button>`).join('')}
      </div>
    </div>
    <div id="assetsTabContent" class="training-tab-content"></div>
  `
  container.querySelectorAll('.training-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _assetsTab = btn.dataset.tab
      container.querySelectorAll('.training-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === _assetsTab))
      switchAssetsTab(_assetsTab)
    })
  })
  switchAssetsTab(_assetsTab)
}

async function switchAssetsTab(tab) {
  _assetsTab = tab
  const el = dom('assetsTabContent')
  if (!el) return
  el.innerHTML = `<p style="color:var(--text-subtle);padding:24px">${t('ui_loading')}</p>`
  try {
    if (tab === 'list')         await renderAssetsList(el)
    if (tab === 'by-category')  await renderAssetsByCategory(el)
    if (tab === 'by-class')     await renderAssetsByClass(el)
    if (tab === 'dependencies') await renderAssetsGraph(el)
  } catch(e) {
    el.innerHTML = `<p style="color:var(--danger-text);padding:24px"><i class="ph ph-warning"></i> Error: ${e.message}</p>`
  }
}

async function renderAssetsList(el) {
  const rank     = ROLE_RANK[getCurrentRole()] || 0
  const canEdit  = rank >= ROLE_RANK.editor
  const isAdmin  = rank >= ROLE_RANK.admin

  const [listRes, entRes] = await Promise.all([
    fetch('/assets', { headers: apiHeaders() }),
    fetch('/entities', { headers: apiHeaders() }),
  ])
  if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`)
  const rawList = await listRes.json()
  const entities = entRes.ok ? (await entRes.json()) : []
  const entMap = {}
  entities.forEach(e => { entMap[e.id] = e.name })

  let list = Array.isArray(rawList) ? rawList : []
  _cacheAssetNames(list)

  el.innerHTML = `
    <div class="asset-filter-bar">
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openAssetForm()"><i class="ph ph-plus"></i> ${t('assets_new')}</button>` : ''}
      <select id="assetFilterCat" onchange="_filterAssets()" title="${t('ui_category')}">
        <option value="">${t('filter_allCats')}</option>
        ${Object.keys(ASSET_CAT_LABELS).map(v=>`<option value="${v}">${escHtml(assetCatLabel(v))}</option>`).join('')}
      </select>
      <select id="assetFilterClass" onchange="_filterAssets()" title="${t('assets_classification')}">
        <option value="">${t('assets_allClass')}</option>
        ${Object.entries(ASSET_CLASS).map(([v,c])=>`<option value="${v}">${c.label}</option>`).join('')}
      </select>
      <select id="assetFilterCrit" onchange="_filterAssets()" title="${t('assets_criticality')}">
        <option value="">${t('assets_allCrit')}</option>
        ${Object.entries(ASSET_CRIT).map(([v,c])=>`<option value="${v}">${c.label}</option>`).join('')}
      </select>
      <select id="assetFilterStatus" onchange="_filterAssets()" title="${t('col_status')}">
        <option value="">${t('filter_allStatuses')}</option>
        ${Object.entries(ASSET_STATUS_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
      <select id="assetFilterProtGoal" onchange="_filterAssets()" title="${escHtml(t('assets_protection'))}">
        ${ASSET_PROT_GOALS.map(g=>`<option value="${g.key}">${escHtml(t(g.i18n))}</option>`).join('')}
      </select>
      <select id="assetFilterProtMin" onchange="_filterAssets()" title="${escHtml(t('assets_effective'))}">
        <option value="">${escHtml(t('assets_lvlNone'))}</option>
        ${[1,2,3,4].map(v=>`<option value="${v}">≥ ${v}</option>`).join('')}
      </select>
      <input id="assetSearch" placeholder="${t('ui_searchPh')}" oninput="_filterAssets()" style="flex:1;min-width:140px">
    </div>
    <div id="assetsTableWrap"></div>
  `

  _renderAssetsTable(list, canEdit, isAdmin, entMap)
}

// Namen aller je geladenen Assets, damit Vererbungsquellen benannt werden können
// (die Quelle kann durch einen aktiven Filter aus der Liste gefallen sein).
const _assetNames = {}
function _cacheAssetNames(list) {
  for (const a of (list || [])) { if (a && a.id) _assetNames[a.id] = a.name || a.id }
}

function _renderAssetsTable(list, canEdit, isAdmin, entMap) {
  const el = dom('assetsTableWrap')
  if (!el) return
  if (!list.length) { el.innerHTML = '<p style="color:var(--text-subtle);padding:16px">No assets found.</p>'; return }
  const now = new Date()
  el.innerHTML = `
    <table class="asset-table">
      <thead><tr>
        <th>${t('ui_name')}</th><th>${t('col_type')}</th><th title="${escHtml(t('assets_inheritHint'))}">${escHtml(t('assets_protection'))}</th><th>${t('assets_classification')}</th><th>${t('assets_criticality')}</th><th>${t('ui_owner')}</th><th>${t('col_status')}</th><th>EoL</th>${canEdit?'<th></th>':''}
      </tr></thead>
      <tbody>
        ${list.map(a => {
          const eolDays = a.endOfLifeDate ? Math.ceil((new Date(a.endOfLifeDate) - now) / 86400000) : null
          const eolStr  = a.endOfLifeDate ? (eolDays < 0 ? `<span style="color:#f87171">Expired</span>` : eolDays <= 90 ? `<span style="color:#f0b429">${a.endOfLifeDate}</span>` : a.endOfLifeDate) : '—'
          return `<tr>
            <td><strong>${escHtml(a.name)}</strong><br><span style="font-size:.75rem;color:var(--text-subtle)">${escHtml(assetCatLabel(a.category))}</span></td>
            <td style="font-size:.78rem;color:var(--text-subtle)">${escHtml(a.type ? assetTypeLabel(a.type) : '—')}</td>
            <td>${assetProtChips(a, _assetNames)}</td>
            <td>${assetClassBadge(a.classification)}</td>
            <td>${assetCritBadge(a.criticality)}</td>
            <td style="font-size:.78rem">${escHtml(a.owner||'—')}</td>
            <td style="font-size:.78rem">${escHtml(ASSET_STATUS_LABELS[a.status]||a.status)}</td>
            <td style="font-size:.78rem">${eolStr}</td>
            ${canEdit ? `<td>
              <button class="btn btn-secondary btn-xs" onclick="openAssetForm('${a.id}')"><i class="ph ph-pencil"></i></button>
              ${isAdmin ? `<button class="btn btn-danger btn-xs" onclick="deleteAsset('${a.id}')"><i class="ph ph-trash"></i></button>` : ''}
            </td>` : ''}
          </tr>`
        }).join('')}
      </tbody>
    </table>
  `
}

async function _filterAssets() {
  const cat    = dom('assetFilterCat')?.value    || ''
  const cls    = dom('assetFilterClass')?.value  || ''
  const crit   = dom('assetFilterCrit')?.value   || ''
  const status = dom('assetFilterStatus')?.value || ''
  const search = (dom('assetSearch')?.value || '').toLowerCase()
  const protGoal = dom('assetFilterProtGoal')?.value || 'c'
  const protMin  = dom('assetFilterProtMin')?.value  || ''

  const params = new URLSearchParams()
  if (cat)    params.set('category', cat)
  if (cls)    params.set('classification', cls)
  if (crit)   params.set('criticality', crit)
  if (status) params.set('status', status)
  // Filter auf den effektiven (vererbten) Schutzbedarf
  if (protMin) params.set({ c: 'minC', i: 'minI', a: 'minA', auth: 'minAuth' }[protGoal] || 'minC', protMin)

  const [listRes, entRes] = await Promise.all([
    fetch(`/assets?${params}`, { headers: apiHeaders() }),
    fetch('/entities', { headers: apiHeaders() }),
  ])
  let list = listRes.ok ? await listRes.json() : []
  _cacheAssetNames(list)
  const entities = entRes.ok ? (await entRes.json()) : []
  const entMap = {}
  entities.forEach(e => { entMap[e.id] = e.name })

  if (search) list = list.filter(a =>
    (a.name||'').toLowerCase().includes(search) ||
    (a.owner||'').toLowerCase().includes(search) ||
    (a.description||'').toLowerCase().includes(search) ||
    (a.vendor||'').toLowerCase().includes(search)
  )
  const rank    = ROLE_RANK[getCurrentRole()] || 0
  _renderAssetsTable(list, rank >= ROLE_RANK.editor, rank >= ROLE_RANK.admin, entMap)
}

async function renderAssetsByCategory(el) {
  const res = await fetch('/assets', { headers: apiHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw  = await res.json()
  const list = Array.isArray(raw) ? raw : []

  const grouped = {}
  for (const catKey of Object.keys(ASSET_CAT_LABELS)) {
    const catLabel = assetCatLabel(catKey)
    grouped[catKey] = { label: catLabel, items: list.filter(a => a.category === catKey) }
  }

  el.innerHTML = Object.entries(grouped).map(([catKey, g]) => `
    <div class="asset-category-section">
      <div class="asset-category-header">
        <i class="ph ph-folder"></i>
        <span>${escHtml(g.label)}</span>
        <span class="asset-badge" style="color:#60a5fa;border-color:#60a5fa">${g.items.length}</span>
      </div>
      ${g.items.length === 0
        ? `<p style="color:var(--text-subtle);font-size:.82rem;padding:4px 0">${t('assets_noneInCategory')}</p>`
        : `<table class="asset-table">
            <thead><tr><th>${t('ui_name')}</th><th>${t('col_type')}</th><th>${t('assets_classification')}</th><th>${t('assets_criticality')}</th><th>${t('col_status')}</th></tr></thead>
            <tbody>
              ${g.items.map(a => `<tr>
                <td><strong>${escHtml(a.name)}</strong></td>
                <td style="font-size:.78rem;color:var(--text-subtle)">${escHtml(a.type ? assetTypeLabel(a.type) : '—')}</td>
                <td>${assetClassBadge(a.classification)}</td>
                <td>${assetCritBadge(a.criticality)}</td>
                <td style="font-size:.78rem">${escHtml(ASSET_STATUS_LABELS[a.status]||a.status)}</td>
              </tr>`).join('')}
            </tbody>
          </table>`}
    </div>
  `).join('')
}

async function renderAssetsByClass(el) {
  const [listRes, sumRes] = await Promise.all([
    fetch('/assets', { headers: apiHeaders() }),
    fetch('/assets/summary', { headers: apiHeaders() }),
  ])
  if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`)
  const raw     = await listRes.json()
  const summary = sumRes.ok ? await sumRes.json() : {}
  const list    = Array.isArray(raw) ? raw : []

  const kpiHtml = `
    <div class="asset-summary-grid">
      ${Object.entries(ASSET_CLASS).map(([k, c]) => `
        <div class="asset-summary-card">
          <div class="assc-value" style="color:${c.color}">${summary.byClassification?.[k] || 0}</div>
          <div class="assc-label">${c.label}</div>
        </div>
      `).join('')}
      <div class="asset-summary-card">
        <div class="assc-value" style="color:#f87171">${summary.criticalUnclassified || 0}</div>
        <div class="assc-label">${t('assets_critUnclassified')}</div>
      </div>
      <div class="asset-summary-card">
        <div class="assc-value" style="color:#f0b429">${summary.endOfLifeSoon || 0}</div>
        <div class="assc-label">${t('assets_eol90d')}</div>
      </div>
    </div>
  `

  const groupedByClass = {}
  for (const [k, c] of Object.entries(ASSET_CLASS)) {
    groupedByClass[k] = { label: c.label, color: c.color, items: list.filter(a => a.classification === k) }
  }

  const tableHtml = Object.entries(groupedByClass).map(([k, g]) => `
    <div class="asset-category-section">
      <div class="asset-category-header">
        <span class="asset-badge" style="color:${g.color};border-color:${g.color}">${g.label}</span>
        <span style="color:var(--text-subtle);font-size:.82rem">${g.items.length} Asset(s)</span>
      </div>
      ${g.items.length === 0
        ? `<p style="color:var(--text-subtle);font-size:.82rem;padding:4px 0">${t('assets_none')}</p>`
        : `<table class="asset-table">
            <thead><tr><th>${t('ui_name')}</th><th>${t('ui_category')}</th><th>${t('assets_criticality')}</th><th>${t('ui_owner')}</th><th>${t('col_status')}</th></tr></thead>
            <tbody>
              ${g.items.map(a => `<tr>
                <td><strong>${escHtml(a.name)}</strong></td>
                <td style="font-size:.78rem;color:var(--text-subtle)">${escHtml(assetCatLabel(a.category))}</td>
                <td>${assetCritBadge(a.criticality)}</td>
                <td style="font-size:.78rem">${escHtml(a.owner||'—')}</td>
                <td style="font-size:.78rem">${escHtml(ASSET_STATUS_LABELS[a.status]||a.status)}</td>
              </tr>`).join('')}
            </tbody>
          </table>`}
    </div>
  `).join('')

  el.innerHTML = kpiHtml + tableHtml
}

// Im Formular ausgewählte Abhängigkeiten (IDs)
let _assetFormDeps = new Set()

// Klassifizierung (Altfeld) und Vertraulichkeit sind dasselbe Merkmal in zwei
// Skalen — im Formular werden beide Felder gekoppelt, damit sie nicht auseinanderlaufen.
const ASSET_CLASS_TO_LEVEL = { public: 1, internal: 2, confidential: 3, strictly_confidential: 4 }
const ASSET_LEVEL_TO_CLASS = { 1: 'public', 2: 'internal', 3: 'confidential', 4: 'strictly_confidential' }

function _syncAssetConfidentiality(source) {
  const clsEl = dom('asClass')
  const cEl   = dom('asProt_c')
  if (!clsEl || !cEl) return
  if (source === 'class') cEl.value   = String(ASSET_CLASS_TO_LEVEL[clsEl.value] || 2)
  else                    clsEl.value = ASSET_LEVEL_TO_CLASS[Number(cEl.value)] || 'internal'
}

/** Eingabefelder für die vier Schutzziele inkl. Hinweis auf geerbte Werte. */
function _assetProtFields(item) {
  const own = item?.protection          || {}
  const eff = item?.effectiveProtection || {}
  const org = item?.protectionOrigins   || {}
  const src = item?.protectionSources   || {}
  const defaults = { c: 2, i: 2, a: 2, auth: null }

  // #64 Teil 2: Gibt der Typ Schutzziele vor und ist die Vererbung nicht
  // gebrochen, sind die Felder gesperrt — sonst schriebe ein Speichern den
  // Typwert als Eigenwert fest und der Bezug ginge still verloren.
  const typeProt = ASSET_TYPES.find(at => at.id === item?.type)?.protection || null
  const overridden = !!item?.protectionOverride
  const lockedByType = !!typeProt && !overridden

  return ASSET_PROT_GOALS.map(g => {
    const optional = g.key === 'auth'
    const cur = own[g.key] !== undefined ? own[g.key] : defaults[g.key]

    const opts = (optional ? `<option value=""${cur == null ? ' selected' : ''}>${escHtml(t('assets_lvlNone'))}</option>` : '')
      + [1, 2, 3, 4].map(v =>
          `<option value="${v}"${cur === v ? ' selected' : ''}>${escHtml(ASSET_PROT_LEVELS[v].label)}</option>`
        ).join('')

    const from = (item && org[g.key] && org[g.key] !== item.id) ? org[g.key] : null
    let hint = ''
    if (from) {
      // Ein anderes Asset hebt den Wert an — Maximumprinzip, gewinnt immer.
      hint = `<span class="apf-inherit"><i class="ph ph-arrow-fat-line-up"></i> ${escHtml(t('assets_effective'))}:
        <strong style="color:${protLevelColor(eff[g.key])}">${eff[g.key]}</strong>
        — ${escHtml(t('assets_inheritedFrom'))} ${escHtml(_assetNames[from] || from)}</span>`
    } else if (src[g.key] === 'type') {
      hint = `<span class="apf-inherit apf-from-type"><i class="ph ph-tag"></i> ${escHtml(t('at_fromType'))}</span>`
    } else if (optional) {
      hint = `<span class="apf-inherit">${escHtml(t('assets_protAuthHint'))}</span>`
    }

    return `<div class="asset-prot-field">
      <div class="apf-head">
        <span class="apf-label">${escHtml(t(g.i18n))}</span>
        <span class="apf-letter">${g.letter}</span>
      </div>
      <select id="asProt_${g.key}" class="select"${lockedByType ? ' disabled' : ''}${g.key === 'c' ? ' onchange="_syncAssetConfidentiality(\'level\')"' : ''}>${opts}</select>
      ${hint}
    </div>`
  }).join('')
}

/** Schalter, der die Schutzziel-Vorgabe des Typs für dieses Asset aufhebt. */
function _assetProtOverrideToggle(item) {
  const typeProt = ASSET_TYPES.find(at => at.id === item?.type)?.protection || null
  if (!typeProt) return ''      // ohne Typvorgabe gibt es nichts zu übersteuern
  const on = !!item?.protectionOverride
  return `<label class="asset-prot-override">
    <input type="checkbox" id="asProtOverride"${on ? ' checked' : ''} onchange="_toggleAssetProtOverride(this.checked)">
    <span>${escHtml(t('at_override'))}</span>
    <small>${escHtml(t('at_overrideHint'))}</small>
  </label>`
}

/** Sperrt bzw. entsperrt die vier Stufenfelder ohne Neuladen des Formulars. */
function _toggleAssetProtOverride(on) {
  ASSET_PROT_GOALS.forEach(g => {
    const el = dom(`asProt_${g.key}`)
    if (el) el.disabled = !on
  })
}

/** Checkbox-Liste aller anderen Assets als Abhängigkeits-Auswahl. */
function _assetDepPicker(list) {
  if (!list.length) {
    return `<div class="asset-dep-picker"><div class="asset-dep-empty">${escHtml(t('assets_noDeps'))}</div></div>`
  }
  const items = list
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .map(a => `<label class="asset-dep-item" data-name="${escHtml((a.name || '').toLowerCase())}">
        <input type="checkbox" value="${a.id}"${_assetFormDeps.has(a.id) ? ' checked' : ''} onchange="_toggleAssetDep('${a.id}')">
        <span>${escHtml(a.name || a.id)}</span>
        <span class="adi-meta">${escHtml(a.category ? assetCatLabel(a.category) : '')}</span>
      </label>`).join('')

  return `<div class="asset-dep-picker">
    <input id="asDepSearch" class="asset-dep-search" placeholder="${t('ui_searchPh')}" oninput="_filterAssetDepList()">
    <div id="asDepList" class="asset-dep-list">${items}</div>
  </div>`
}

function _toggleAssetDep(assetId) {
  if (_assetFormDeps.has(assetId)) _assetFormDeps.delete(assetId)
  else _assetFormDeps.add(assetId)
  _renderAssetDepTags()
}

function _removeAssetDep(assetId) {
  _assetFormDeps.delete(assetId)
  const cb = document.querySelector(`#asDepList input[value="${assetId}"]`)
  if (cb) cb.checked = false
  _renderAssetDepTags()
}

function _renderAssetDepTags() {
  const el = dom('asDepTags')
  if (!el) return
  if (!_assetFormDeps.size) {
    el.innerHTML = `<span class="asset-prot-none">${escHtml(t('assets_noDeps'))}</span>`
    return
  }
  el.innerHTML = [..._assetFormDeps].map(depId => `<span class="asset-dep-tag">
      ${escHtml(_assetNames[depId] || depId)}
      <button type="button" title="Remove" onclick="_removeAssetDep('${depId}')">&times;</button>
    </span>`).join('')
}

function _filterAssetDepList() {
  const q = (dom('asDepSearch')?.value || '').toLowerCase()
  document.querySelectorAll('#asDepList .asset-dep-item').forEach(row => {
    row.style.display = !q || (row.dataset.name || '').includes(q) ? '' : 'none'
  })
}

async function openAssetForm(id) {
  const isEdit = !!id
  let item = null
  if (isEdit) {
    const r = await fetch(`/assets/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }

  let entities = []
  try {
    const er = await fetch('/entities', { headers: apiHeaders() })
    if (er.ok) entities = await er.json()
  } catch {}

  // Kandidaten für Abhängigkeiten: alle Assets außer diesem selbst
  let allAssets = []
  try {
    const ar = await fetch('/assets', { headers: apiHeaders() })
    if (ar.ok) allAssets = (await ar.json()).filter(a => a.id !== id)
  } catch {}
  _cacheAssetNames(allAssets)
  _assetFormDeps = new Set(item?.dependsOn || [])

  const el = dom('assetsTabContent')
  if (!el) return

  document.querySelectorAll('.training-tab').forEach(b => b.classList.remove('active'))

  const catOptions = Object.keys(ASSET_CAT_LABELS).map(v => [v, assetCatLabel(v)]).map(([v,l]) =>
    `<option value="${v}"${item?.category===v?' selected':''}>${l}</option>`
  ).join('')

  // Nach Kategorie gruppiert — die Zuordnung liefert der Server mit dem Typ.
  // Ein Typ, den es nicht mehr gibt (Bestandsdaten), bekommt eine eigene
  // Gruppe, damit er beim Bearbeiten nicht stillschweigend verschwindet.
  const typeOptions = (() => {
    const groups = Object.keys(ASSET_CAT_LABELS).map(catId => [catId, assetCatLabel(catId)]).map(([catId, catLabel]) => {
      const opts = ASSET_TYPES.filter(t => t.category === catId)
        .map(at => `<option value="${escHtml(at.id)}"${item?.type === at.id ? ' selected' : ''}>${escHtml(assetTypeLabel(at))}</option>`)
        .join('')
      return opts ? `<optgroup label="${escHtml(catLabel)}">${opts}</optgroup>` : ''
    }).join('')
    const known = new Set(ASSET_TYPES.map(t => t.id))
    const orphan = item?.type && !known.has(item.type)
      ? `<optgroup label="${escHtml(t('assets_unknownType'))}"><option value="${escHtml(item.type)}" selected>${escHtml(item.type)}</option></optgroup>`
      : ''
    return groups + orphan
  })()

  const classOptions = Object.entries(ASSET_CLASS).map(([v,c]) =>
    `<option value="${v}"${item?.classification===v?' selected':''}>${c.label}</option>`
  ).join('')

  const critOptions = Object.entries(ASSET_CRIT).map(([v,c]) =>
    `<option value="${v}"${item?.criticality===v?' selected':''}>${c.label}</option>`
  ).join('')

  const statusOptions = Object.entries(ASSET_STATUS_LABELS).map(([v,l]) =>
    `<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`
  ).join('')

  const entityOptions = `<option value="">${t('ui_noEntity')}</option>` +
    entities.map(e => `<option value="${e.id}"${item?.entityId===e.id?' selected':''}>${escHtml(e.name)}</option>`).join('')

  const ouOptsAsset = await getOrgUnitOptions(item?.orgUnitId || '')

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchAssetsTab('list')">
          <i class="ph ph-arrow-left"></i> ${t('ui_backToOverview')}
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-buildings"></i>
          ${isEdit ? t('assets_editAsset') : t('assets_newAsset')}
        </h3>
      </div>
      <div class="training-form-body">

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-info"></i> ${t('asset_basicInfo')}</h4>
          <div class="form-group">
            <label class="form-label">${t('ui_name')} <span class="form-required">*</span></label>
            <input id="asName" class="form-input" value="${escHtml(item?.name||'')}" placeholder="${t('asset_namePh')}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('ui_category')}</label>
              <select id="asCat" class="select">${catOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('col_type')}</label>
              <select id="asType" class="select">${typeOptions}</select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('ui_description')}</label>
            <textarea id="asDesc" class="form-input" rows="3" placeholder="${t('asset_descPh')}">${escHtml(item?.description||'')}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('col_status')}</label>
              <select id="asStatus" class="select">${statusOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('ui_tagsCsv')}</label>
              <input id="asTags" class="form-input" value="${escHtml((item?.tags||[]).join(', '))}" placeholder="${t('asset_tagsPh')}">
            </div>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-shield-check"></i> ${t('assets_classCritTitle')} <span style="font-size:.75rem;color:var(--text-subtle);font-weight:400">(ISO 27001 A.5.12)</span></h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('assets_classification')}</label>
              <select id="asClass" class="select" onchange="_syncAssetConfidentiality('class')">${classOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('assets_criticality')}</label>
              <select id="asCrit" class="select">${critOptions}</select>
            </div>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title">
            <i class="ph ph-shield-star"></i> ${escHtml(t('assets_protection'))}
            <span style="font-size:.75rem;color:var(--text-subtle);font-weight:400">(ISO 27001 / BSI IT-Grundschutz)</span>
          </h4>
          <p class="asset-prot-hint">${escHtml(t('assets_inheritHint'))}</p>
          <div class="asset-prot-grid">
            ${_assetProtFields(item)}
            ${_assetProtOverrideToggle(item)}
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-graph"></i> ${escHtml(t('assets_dependsOn'))}</h4>
          <p class="asset-prot-hint">${escHtml(t('assets_selectDeps'))}</p>
          ${_assetDepPicker(allAssets)}
          <div id="asDepTags" class="asset-dep-selected"></div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-users"></i> ${t('asset_responsibilities')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('asset_infoOwner')}</label>
              <input id="asOwner" class="form-input" value="${escHtml(item?.owner||'')}" placeholder="${t('asset_infoOwnerPh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('ui_ownerEmail')}</label>
              <input id="asOwnerEmail" type="email" class="form-input" value="${escHtml(item?.ownerEmail||'')}" placeholder="${t('asset_ownerEmailPh')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('asset_technicalCustodian')}</label>
              <input id="asCustodian" class="form-input" value="${escHtml(item?.custodian||'')}" placeholder="${t('asset_teamPersonPh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('asset_responsibleUnit')}</label>
              <select id="asOrgUnit" class="select">${ouOptsAsset}</select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('ui_entity')}</label>
              <select id="asEntity" class="select">${entityOptions}</select>
            </div>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-gear"></i> ${t('asset_technicalDetails')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('asset_manufacturerVendor')}</label>
              <input id="asVendor" class="form-input" value="${escHtml(item?.vendor||'')}" placeholder="${t('asset_vendorPh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('ui_version')}</label>
              <input id="asVersion" class="form-input" value="${escHtml(item?.version||'')}" placeholder="${t('asset_versionPh')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('asset_serialNumber')}</label>
              <input id="asSerial" class="form-input" value="${escHtml(item?.serialNumber||'')}" placeholder="${t('asset_serialNumberPh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('ui_location')}</label>
              <input id="asLocation" class="form-input" value="${escHtml(item?.location||'')}" placeholder="${t('asset_locationPh')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('ui_purchaseDate')}</label>
              <input id="asPurchase" type="date" class="form-input" value="${item?.purchaseDate||''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">${t('asset_eolDate')}</label>
              <input id="asEol" type="date" class="form-input" value="${item?.endOfLifeDate||''}" style="color-scheme:dark">
            </div>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-note-pencil"></i> ${t('ui_notes')}</h4>
          <div class="form-group">
            <textarea id="asNotes" class="form-input" rows="4" placeholder="${t('asset_notesPh')}">${escHtml(item?.notes||'')}</textarea>
          </div>
          ${renderLinksBlock('as', item?.linkedControls||[], item?.linkedPolicies||[])}
        </div>

      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchAssetsTab('list')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveAsset('${id||''}')">
          <i class="ph ph-floppy-disk"></i> ${t('ui_save')}
        </button>
      </div>
    </div>
  `
  initLinkPickers('as')
  _renderAssetDepTags()
}

async function saveAsset(id) {
  const tagsRaw = dom('asTags')?.value || ''
  const tags    = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
  const payload = {
    name:           dom('asName')?.value?.trim()      || '',
    category:       dom('asCat')?.value               || 'hardware',
    type:           dom('asType')?.value              || '',
    description:    dom('asDesc')?.value              || '',
    status:         dom('asStatus')?.value            || 'active',
    tags,
    classification: dom('asClass')?.value             || 'internal',
    criticality:    dom('asCrit')?.value              || 'medium',
    owner:          dom('asOwner')?.value             || '',
    ownerEmail:     dom('asOwnerEmail')?.value        || '',
    custodian:      dom('asCustodian')?.value         || '',
    orgUnitId:      dom('asOrgUnit')?.value           || null,
    entityId:       dom('asEntity')?.value            || '',
    vendor:         dom('asVendor')?.value            || '',
    version:        dom('asVersion')?.value           || '',
    serialNumber:   dom('asSerial')?.value            || '',
    location:       dom('asLocation')?.value          || '',
    purchaseDate:   dom('asPurchase')?.value          || '',
    endOfLifeDate:  dom('asEol')?.value               || '',
    notes:          dom('asNotes')?.value             || '',
    linkedControls: getLinkedValues('as', 'ctrl'),
    linkedPolicies: getLinkedValues('as', 'pol'),
    dependsOn: [..._assetFormDeps],
  }

  // #64 Teil 2: Gesperrte Felder zeigen die Vorgabe des Typs. Würden sie
  // mitgesendet, schriebe das Speichern den Typwert als Eigenwert fest und der
  // Bezug zum Typ ginge unbemerkt verloren. Deshalb: nur senden, wenn der
  // Nutzer die Werte auch bearbeiten durfte.
  const overrideEl = dom('asProtOverride')
  payload.protectionOverride = overrideEl ? overrideEl.checked : false
  const felderGesperrt = !!overrideEl && !overrideEl.checked
  if (!felderGesperrt) {
    payload.protection = {
      c:    dom('asProt_c')?.value    || null,
      i:    dom('asProt_i')?.value    || null,
      a:    dom('asProt_a')?.value    || null,
      auth: dom('asProt_auth')?.value || null,
    }
  }
  if (!payload.name) { alert('Name is required'); return }
  const url    = id ? `/assets/${id}` : '/assets'
  const method = id ? 'PUT' : 'POST'
  const res    = await fetch(url, { method, headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error saving'); return }
  switchAssetsTab('list')
}

async function deleteAsset(id) {
  if (!confirm('Delete asset?')) return
  const res = await fetch(`/assets/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error'); return }
  switchAssetsTab(_assetsTab)
}

// ── Abhängigkeits- und Vererbungsgraph (Canvas) ───────────────
// Ebenen ergeben sich aus der Abhängigkeitsrichtung: Assets, von denen nichts
// abhängt (typisch Anwendungen), stehen oben; Infrastruktur wandert nach unten.
// Vererbung fließt entlang der Pfeile von oben nach unten.

const AG_NODE_W = 200, AG_NODE_H = 58, AG_GAP_X = 26, AG_GAP_Y = 78, AG_PAD = 28

let _assetGraphState = null

function _layoutAssetGraph(nodes, edges) {
  const byId  = new Map(nodes.map(n => [n.id, n]))
  const layer = new Map()
  const busy  = new Set()

  function calcLayer(id) {
    if (layer.has(id)) return layer.get(id)
    if (busy.has(id)) return 0                    // Zyklenschutz bei Altdaten
    busy.add(id)
    const node    = byId.get(id)
    const parents = (node.requiredBy || []).filter(p => byId.has(p))
    const value   = parents.length ? Math.max(...parents.map(calcLayer)) + 1 : 0
    busy.delete(id)
    layer.set(id, value)
    return value
  }
  nodes.forEach(n => calcLayer(n.id))

  const rows = []
  for (const node of nodes) {
    const l = layer.get(node.id) || 0
    ;(rows[l] = rows[l] || []).push(node)
  }
  rows.forEach(row => row.sort((a, b) => (a.name || '').localeCompare(b.name || '')))

  const widest = Math.max(1, ...rows.map(r => r.length))
  const width  = AG_PAD * 2 + widest * AG_NODE_W + (widest - 1) * AG_GAP_X
  const height = AG_PAD * 2 + rows.length * AG_NODE_H + Math.max(0, rows.length - 1) * AG_GAP_Y

  const placed = new Map()
  rows.forEach((row, li) => {
    const rowWidth = row.length * AG_NODE_W + (row.length - 1) * AG_GAP_X
    const startX   = (width - rowWidth) / 2
    row.forEach((node, ci) => {
      placed.set(node.id, {
        node,
        x: startX + ci * (AG_NODE_W + AG_GAP_X),
        y: AG_PAD + li * (AG_NODE_H + AG_GAP_Y),
        w: AG_NODE_W, h: AG_NODE_H,
      })
    })
  })

  return { placed, width, height, edges: edges.filter(e => placed.has(e.from) && placed.has(e.to)) }
}

function _agTheme() {
  const cs = getComputedStyle(document.documentElement)
  const pick = (name, fallback) => (cs.getPropertyValue(name) || '').trim() || fallback
  return {
    text:   pick('--text', '#e6edf3'),
    subtle: pick('--text-subtle', '#8C9BAB'),
    border: pick('--border', '#30363d'),
    panel:  pick('--surface', '#161b22'),
  }
}

function _drawAssetGraph(canvas, layout, selectedId) {
  const theme = _agTheme()
  const dpr   = window.devicePixelRatio || 1
  canvas.width        = Math.round(layout.width  * dpr)
  canvas.height       = Math.round(layout.height * dpr)
  canvas.style.width  = layout.width  + 'px'
  canvas.style.height = layout.height + 'px'

  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, layout.width, layout.height)

  // Kanten: vom abhängigen Asset (oben) zur Abhängigkeit (unten)
  for (const edge of layout.edges) {
    const from = layout.placed.get(edge.from)
    const to   = layout.placed.get(edge.to)
    const x1 = from.x + from.w / 2, y1 = from.y + from.h
    const x2 = to.x   + to.w   / 2, y2 = to.y
    const active = selectedId && (edge.from === selectedId || edge.to === selectedId)

    ctx.save()
    ctx.strokeStyle = active ? '#60a5fa' : theme.border
    ctx.lineWidth   = active ? 2 : 1.2
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.bezierCurveTo(x1, y1 + AG_GAP_Y * 0.5, x2, y2 - AG_GAP_Y * 0.5, x2, y2)
    ctx.stroke()

    // Pfeilspitze in Vererbungsrichtung (nach unten)
    const size = 6
    ctx.fillStyle = active ? '#60a5fa' : theme.border
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - size, y2 - size * 1.6)
    ctx.lineTo(x2 + size, y2 - size * 1.6)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Knoten
  for (const { node, x, y, w, h } of layout.placed.values()) {
    const selected = node.id === selectedId
    ctx.save()
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 8)
    else ctx.rect(x, y, w, h)
    ctx.fillStyle = theme.panel
    ctx.fill()
    ctx.lineWidth   = selected ? 2 : 1
    ctx.strokeStyle = selected ? '#60a5fa' : (node.inherited ? '#f0b429' : theme.border)
    if (node.inherited && !selected) ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.setLineDash([])

    // Name (bei Bedarf gekürzt)
    ctx.fillStyle = theme.text
    ctx.font = '600 12.5px system-ui, sans-serif'
    let label = node.name || node.id
    const maxW = w - 20
    if (ctx.measureText(label).width > maxW) {
      while (label.length > 1 && ctx.measureText(label + '…').width > maxW) label = label.slice(0, -1)
      label += '…'
    }
    ctx.fillText(label, x + 10, y + 21)

    // Effektive Schutzziele als farbige Kürzel
    ctx.font = '700 11px ui-monospace, monospace'
    let cx = x + 10
    for (const goal of ASSET_PROT_GOALS) {
      const v = node.effectiveProtection?.[goal.key]
      if (v === null || v === undefined) continue
      const own       = node.protection?.[goal.key]
      const inherited = node.protectionOrigins?.[goal.key] && node.protectionOrigins[goal.key] !== node.id
      const text      = `${goal.letter}${v}${inherited ? '↑' : ''}`
      ctx.fillStyle   = protLevelColor(v)
      ctx.globalAlpha = inherited && own !== v ? 0.95 : 1
      ctx.fillText(text, cx, y + 41)
      cx += ctx.measureText(text).width + 9
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }
}

function _assetGraphDetail(node, byId) {
  if (!node) return ''
  const rowsHtml = ASSET_PROT_GOALS.map(g => {
    const eff = node.effectiveProtection?.[g.key]
    if (eff === null || eff === undefined) return ''
    const own = node.protection?.[g.key]
    const src = node.protectionOrigins?.[g.key]
    const inherited = src && src !== node.id
    return `<div class="agd-row">
      <span class="agd-key">${escHtml(t(g.i18n))}</span>
      <span><strong style="color:${protLevelColor(eff)}">${eff}</strong>
        ${inherited
          ? `<span style="color:var(--text-subtle)"> — ${escHtml(t('assets_ownValue'))} ${own ?? '—'},
             ${escHtml(t('assets_inheritedFrom'))} <strong>${escHtml(byId.get(src)?.name || src)}</strong></span>`
          : ''}
      </span>
    </div>`
  }).join('')

  const nameList = ids => (ids || []).length
    ? (ids || []).map(i => escHtml(byId.get(i)?.name || i)).join(', ')
    : `<span style="color:var(--text-subtle)">—</span>`

  return `<div class="asset-graph-detail">
    <h4><i class="ph ph-buildings"></i> ${escHtml(node.name || node.id)}</h4>
    ${rowsHtml}
    <div class="agd-row"><span class="agd-key">${escHtml(t('assets_dependsOn'))}</span><span>${nameList(node.dependsOn)}</span></div>
    <div class="agd-row"><span class="agd-key">${escHtml(t('assets_requiredBy'))}</span><span>${nameList(node.requiredBy)}</span></div>
  </div>`
}

function _selectAssetGraphNode(id) {
  if (!_assetGraphState) return
  _assetGraphState.selected = _assetGraphState.selected === id ? null : id
  const { canvas, layout, byId, selected } = _assetGraphState
  _drawAssetGraph(canvas, layout, selected)
  const detail = dom('assetGraphDetail')
  if (detail) detail.innerHTML = selected ? _assetGraphDetail(byId.get(selected), byId) : ''
}

async function renderAssetsGraph(el) {
  const res = await fetch('/assets/graph', { headers: apiHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const graph = await res.json()
  _cacheAssetNames(graph.nodes)

  // Nur Assets zeigen, die tatsächlich in Beziehungen stehen — isolierte Assets
  // würden den Graphen fluten, ohne Aussage zu liefern.
  const connected = graph.nodes.filter(n => (n.dependsOn || []).length || (n.requiredBy || []).length)
  const isolated  = graph.nodes.length - connected.length

  const summary = `
    <div class="asset-summary-grid">
      <div class="asset-summary-card">
        <div class="assc-value">${connected.length}</div>
        <div class="assc-label">${escHtml(t('assets_tabDeps'))}</div>
      </div>
      <div class="asset-summary-card">
        <div class="assc-value">${graph.edges.length}</div>
        <div class="assc-label">${t('ui_relations')}</div>
      </div>
      <div class="asset-summary-card">
        <div class="assc-value" style="color:#f0b429">${graph.nodes.filter(n => n.inherited).length}</div>
        <div class="assc-label">${escHtml(t('assets_inheritedCount'))}</div>
      </div>
      <div class="asset-summary-card">
        <div class="assc-value" style="color:var(--text-subtle)">${isolated}</div>
        <div class="assc-label">${escHtml(t('assets_noDeps'))}</div>
      </div>
    </div>`

  if (!connected.length) {
    el.innerHTML = summary + `<p class="asset-prot-hint" style="padding:16px">${escHtml(t('assets_graphEmpty'))}</p>`
    return
  }

  const layout = _layoutAssetGraph(connected, graph.edges)

  el.innerHTML = summary + `
    <p class="asset-prot-hint">${escHtml(t('assets_inheritHint'))}</p>
    <div class="asset-graph-wrap">
      <canvas id="assetGraphCanvas"></canvas>
      <div class="asset-graph-legend">
        <span class="agl-item"><span class="agl-swatch" style="color:#f0b429"></span> ${escHtml(t('assets_inheritedCount'))}</span>
        ${[1,2,3,4].map(v => `<span class="agl-item"><span class="agl-swatch" style="color:${protLevelColor(v)};background:${protLevelColor(v)}"></span> ${escHtml(ASSET_PROT_LEVELS[v].label)}</span>`).join('')}
        <span class="agl-item" style="margin-left:auto"><i class="ph ph-arrow-down"></i> ${escHtml(t('assets_inheritedFrom'))} ↓</span>
      </div>
    </div>
    <div id="assetGraphDetail"></div>`

  const canvas = dom('assetGraphCanvas')
  const byId   = new Map(connected.map(n => [n.id, n]))
  _assetGraphState = { canvas, layout, byId, selected: null }
  _drawAssetGraph(canvas, layout, null)

  canvas.addEventListener('click', ev => {
    const rect = canvas.getBoundingClientRect()
    const px = ev.clientX - rect.left
    const py = ev.clientY - rect.top
    for (const { node, x, y, w, h } of layout.placed.values()) {
      if (px >= x && px <= x + w && py >= y && py <= y + h) { _selectAssetGraphNode(node.id); return }
    }
    _selectAssetGraphNode(null)
  })
}

// ════════════════════════════════════════════════════════════
// NIS2 — Art. 21 Governance-Checkliste + Art. 23 Meldefristen
// ════════════════════════════════════════════════════════════

let _nis2Tab = 'governance'

const NIS2_PRIO = {
  CRITICAL: { color: '#f87171' },
  HIGH:     { color: '#f0b429' },
  MEDIUM:   { color: '#60a5fa' },
}

const NIS2_STATUS = {
  open:        { color: '#8C9BAB', i18n: 'nis2_statusOpen'     },
  in_progress: { color: '#60a5fa', i18n: 'nis2_statusProgress' },
  completed:   { color: '#4ade80', i18n: 'nis2_statusDone'     },
  na:          { color: '#6b7280', i18n: 'nis2_statusNa'       },
}

const NIS2_PHASE_STATE = {
  pending:   { color: '#8C9BAB', icon: 'ph-clock',          i18n: 'nis2_statePending'   },
  due_soon:  { color: '#f0b429', icon: 'ph-warning',        i18n: 'nis2_stateDueSoon'   },
  overdue:   { color: '#f87171', icon: 'ph-warning-octagon',i18n: 'nis2_stateOverdue'   },
  submitted: { color: '#4ade80', icon: 'ph-check-circle',   i18n: 'nis2_stateSubmitted' },
}

const NIS2_PHASE_I18N = {
  earlyWarning: 'nis2_phaseEarly',
  notification: 'nis2_phaseNotify',
  finalReport:  'nis2_phaseFinal',
}

function _nis2PrioLabel(p) {
  return { CRITICAL: t('nis2_prioCritical'), HIGH: t('nis2_prioHigh'), MEDIUM: t('nis2_prioMedium') }[p] || p
}

function nis2Badge(text, color) {
  return `<span class="asset-badge" style="color:${color};border-color:${color}">${escHtml(text)}</span>`
}

function nis2StatusBadge(status) {
  const s = NIS2_STATUS[status] || NIS2_STATUS.open
  return nis2Badge(t(s.i18n), s.color)
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

async function renderNis2() {
  dom('nis2Container')?.remove()
  const main = document.querySelector('main') || document.body
  const container = document.createElement('div')
  container.id = 'nis2Container'
  container.className = 'training-container'
  main.appendChild(container)

  const tabs = [
    { id: 'governance', get label() { return t('nis2_tabGovernance') }, icon: 'ph-list-checks' },
    { id: 'deadlines',  get label() { return t('nis2_tabDeadlines')  }, icon: 'ph-timer' },
  ]

  container.innerHTML = `
    <div class="training-header">
      <h2 class="training-title"><i class="ph ph-shield-star"></i> NIS2</h2>
      <div class="training-tab-bar">
        ${tabs.map(tab => `<button class="training-tab${tab.id === _nis2Tab ? ' active' : ''}" data-tab="${tab.id}">
          <i class="ph ${tab.icon}"></i> ${tab.label}
        </button>`).join('')}
      </div>
    </div>
    <div id="nis2TabContent" class="training-tab-content"></div>
  `
  container.querySelectorAll('.training-tab').forEach(btn => {
    btn.addEventListener('click', () => switchNis2Tab(btn.dataset.tab))
  })
  switchNis2Tab(_nis2Tab)
}

async function switchNis2Tab(tab) {
  _nis2Tab = tab
  // Auch bei programmatischem Wechsel (z. B. "Back" aus einem Formular) muss
  // die Tab-Leiste mitziehen, sonst bleibt die Markierung stehen.
  document.querySelectorAll('#nis2Container .training-tab')
    .forEach(b => b.classList.toggle('active', b.dataset.tab === tab))

  const el = dom('nis2TabContent')
  if (!el) return
  el.innerHTML = `<p style="color:var(--text-subtle);padding:24px">${t('ui_loading')}</p>`
  try {
    if (tab === 'governance') await renderNis2Governance(el)
    if (tab === 'deadlines')  await renderNis2Deadlines(el)
  } catch (e) {
    el.innerHTML = `<p style="color:var(--danger-text);padding:24px"><i class="ph ph-warning"></i> ${t('error')}: ${escHtml(e.message)}</p>`
  }
}

// ── Art. 21 — Governance-Checkliste ───────────────────────────

async function renderNis2Governance(el) {
  const res = await fetch('/nis2/governance', { headers: apiHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { items, summary } = await res.json()

  const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.contentowner

  el.innerHTML = `
    <div class="asset-summary-grid">
      <div class="asset-summary-card">
        <div class="assc-value" style="color:#4ade80">${summary.completionPct}%</div>
        <div class="assc-label">${escHtml(t('nis2_completion'))}</div>
      </div>
      <div class="asset-summary-card">
        <div class="assc-value">${summary.completed} / ${summary.total}</div>
        <div class="assc-label">${escHtml(t('nis2_statusDone'))}</div>
      </div>
      <div class="asset-summary-card">
        <div class="assc-value" style="color:${summary.criticalOpen ? '#f87171' : '#4ade80'}">${summary.criticalOpen}</div>
        <div class="assc-label">${escHtml(t('nis2_criticalOpen'))}</div>
      </div>
      <div class="asset-summary-card">
        <div class="assc-value" style="color:${summary.unassigned ? '#f0b429' : '#4ade80'}">${summary.unassigned}</div>
        <div class="assc-label">${escHtml(t('nis2_unassigned'))}</div>
      </div>
      <div class="asset-summary-card">
        <div class="assc-value">${summary.withEvidence}</div>
        <div class="assc-label">${escHtml(t('nis2_withEvidence'))}</div>
      </div>
    </div>

    <p class="asset-prot-hint">${escHtml(t('nis2_art21Hint'))}</p>

    <div class="asset-filter-bar">
      <select id="nis2FilterPrio" onchange="_filterNis2()">
        <option value="">${escHtml(t('nis2_allPriorities'))}</option>
        ${Object.keys(NIS2_PRIO).map(p => `<option value="${p}">${_nis2PrioLabel(p)}</option>`).join('')}
      </select>
      <select id="nis2FilterStatus" onchange="_filterNis2()">
        <option value="">${escHtml(t('nis2_allStatuses'))}</option>
        ${Object.entries(NIS2_STATUS).map(([v, s]) => `<option value="${v}">${escHtml(t(s.i18n))}</option>`).join('')}
      </select>
      <select id="nis2FilterSub" onchange="_filterNis2()">
        <option value="">${escHtml(t('nis2_allSubs'))}</option>
        ${'abcdefghij'.split('').map(c => `<option value="${c}">${c})</option>`).join('')}
      </select>
      <input id="nis2Search" placeholder="${t('ui_searchPh')}" oninput="_filterNis2()" style="flex:1;min-width:140px">
    </div>
    <div id="nis2TableWrap"></div>
  `

  _nis2AllItems = items
  _renderNis2Table(items, canEdit)
}

let _nis2AllItems = []

function _renderNis2Table(items, canEdit) {
  const el = dom('nis2TableWrap')
  if (!el) return
  if (!items.length) {
    el.innerHTML = `<p style="color:var(--text-subtle);padding:16px">${t('nis2_noItems')}</p>`
    return
  }

  el.innerHTML = `
    <table class="asset-table">
      <thead><tr>
        <th>#</th>
        <th>${escHtml(t('nis2_subParagraph'))}</th>
        <th>${escHtml(t('ui_priority'))}</th>
        <th>${escHtml(t('col_title'))}</th>
        <th>${escHtml(t('col_status'))}</th>
        <th>${escHtml(t('nis2_owner'))}</th>
        <th>${escHtml(t('nis2_withEvidence'))}</th>
        ${canEdit ? '<th></th>' : ''}
      </tr></thead>
      <tbody>
        ${items.map(item => `<tr>
          <td style="font-size:.75rem;color:var(--text-subtle)">${escHtml(item.id.replace('nis2_gov_', ''))}</td>
          <td style="font-size:.78rem" title="${escHtml(item.subParagraphText)}">${escHtml(item.subParagraph)})</td>
          <td>${nis2Badge(_nis2PrioLabel(item.priority), NIS2_PRIO[item.priority]?.color || '#8C9BAB')}</td>
          <td>
            <strong>${escHtml(item.title)}</strong>
            <br><span style="font-size:.74rem;color:var(--text-subtle)">${escHtml(item.category)}</span>
          </td>
          <td>${nis2StatusBadge(item.status)}</td>
          <td style="font-size:.78rem">${escHtml(item.ownerEmail || '—')}</td>
          <td style="font-size:.78rem">${item.evidenceUrls.length ? `<i class="ph ph-paperclip"></i> ${item.evidenceUrls.length}` : '—'}</td>
          ${canEdit ? `<td>
            <button class="btn btn-secondary btn-xs" onclick="openNis2ItemForm('${item.id}')">
              <i class="ph ph-pencil"></i>
            </button>
          </td>` : ''}
        </tr>`).join('')}
      </tbody>
    </table>
  `
}

function _filterNis2() {
  const prio   = dom('nis2FilterPrio')?.value   || ''
  const status = dom('nis2FilterStatus')?.value || ''
  const sub    = dom('nis2FilterSub')?.value    || ''
  const search = (dom('nis2Search')?.value || '').toLowerCase()

  let list = _nis2AllItems
  if (prio)   list = list.filter(i => i.priority     === prio)
  if (status) list = list.filter(i => i.status       === status)
  if (sub)    list = list.filter(i => i.subParagraph === sub)
  if (search) list = list.filter(i =>
    (i.title || '').toLowerCase().includes(search) ||
    (i.description || '').toLowerCase().includes(search) ||
    (i.category || '').toLowerCase().includes(search))

  const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.contentowner
  _renderNis2Table(list, canEdit)
}

/** Ganzseitiges Inline-Formular (kein Modal) für ein Checklisten-Item. */
async function openNis2ItemForm(id) {
  const res = await fetch(`/nis2/governance/${id}`, { headers: apiHeaders() })
  if (!res.ok) return
  const item = await res.json()

  const el = dom('nis2TabContent')
  if (!el) return

  const statusOptions = Object.entries(NIS2_STATUS)
    .map(([v, s]) => `<option value="${v}"${item.status === v ? ' selected' : ''}>${escHtml(t(s.i18n))}</option>`).join('')

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchNis2Tab('governance')">
          <i class="ph ph-arrow-left"></i> ${t('ui_back')}
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-shield-star"></i> ${escHtml(item.title)}
        </h3>
      </div>
      <div class="training-form-body">

        <div class="training-form-section">
          <h4 class="training-form-section-title">
            <i class="ph ph-info"></i> Art. ${escHtml(item.article)} lit. ${escHtml(item.subParagraph)}
            ${nis2Badge(item.priority, NIS2_PRIO[item.priority]?.color || '#8C9BAB')}
          </h4>
          <p style="font-size:.86rem;line-height:1.5">${escHtml(item.description)}</p>
          <p style="font-size:.76rem;color:var(--text-subtle);margin-top:8px">
            <strong>${escHtml(item.subParagraph)})</strong> ${escHtml(item.subParagraphText)}
          </p>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-check-square"></i> ${t('col_status')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('col_status')}</label>
              <select id="nis2Status" class="select">${statusOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">${escHtml(t('nis2_ownerEmail'))}</label>
              <input id="nis2OwnerEmail" type="email" class="form-input"
                     value="${escHtml(item.ownerEmail || '')}" placeholder="owner@company.com">
            </div>
          </div>
          ${item.completedAt ? `<p style="font-size:.76rem;color:var(--text-subtle)">
            <i class="ph ph-check-circle"></i> ${escHtml(t('nis2_statusDone'))}: ${escHtml(fmtDateTime(item.completedAt))}
          </p>` : ''}
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-paperclip"></i> ${escHtml(t('nis2_evidence'))}</h4>
          <div class="form-group">
            <textarea id="nis2Evidence" class="form-input" rows="3"
              placeholder="https://intranet/nachweis.pdf">${escHtml((item.evidenceUrls || []).join('\n'))}</textarea>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-note-pencil"></i> ${escHtml(t('nis2_notes'))}</h4>
          <div class="form-group">
            <textarea id="nis2Notes" class="form-input" rows="4">${escHtml(item.notes || '')}</textarea>
          </div>
        </div>

      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchNis2Tab('governance')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveNis2Item('${item.id}')">
          <i class="ph ph-floppy-disk"></i> ${t('ui_save')}
        </button>
      </div>
    </div>
  `
}

async function saveNis2Item(id) {
  const payload = {
    status:       dom('nis2Status')?.value || 'open',
    ownerEmail:   dom('nis2OwnerEmail')?.value?.trim() || '',
    notes:        dom('nis2Notes')?.value || '',
    evidenceUrls: (dom('nis2Evidence')?.value || '').split('\n').map(s => s.trim()).filter(Boolean),
  }
  const res = await fetch(`/nis2/governance/${id}`, {
    method: 'PUT',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    alert(e.error || 'Error saving')
    return
  }
  switchNis2Tab('governance')
}

// ── Art. 23 — Meldefristen ────────────────────────────────────

async function renderNis2Deadlines(el) {
  const [dlRes, incRes] = await Promise.all([
    fetch('/nis2/incidents/deadlines', { headers: apiHeaders() }),
    fetch('/public/incidents', { headers: apiHeaders() }),
  ])
  if (!dlRes.ok) throw new Error(`HTTP ${dlRes.status}`)

  const rows      = await dlRes.json()
  const incidents = incRes.ok ? await incRes.json() : []
  const canEdit   = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.contentowner

  const overdue = rows.filter(r => r.overdue.length).length
  const dueSoon = rows.filter(r => r.dueSoon.length).length

  // Vorfälle, für die noch keine Fristenverfolgung läuft
  const tracked   = new Set(rows.map(r => r.id))
  const untracked = incidents.filter(i => !tracked.has(i.id) && !i.art23)

  const deadlineRows = rows.map(row => {
    const phaseCells = row.phases.map(p => {
      const st = NIS2_PHASE_STATE[p.state] || NIS2_PHASE_STATE.pending
      const left = p.minutesLeft === null ? ''
        : p.minutesLeft < 0
          ? ` (−${Math.abs(Math.round(p.minutesLeft / 60))} h)`
          : ` (${Math.round(p.minutesLeft / 60)} h)`
      return `<div style="font-size:.78rem;padding:1px 0">
        <i class="ph ${st.icon}" style="color:${st.color}"></i>
        ${escHtml(t(NIS2_PHASE_I18N[p.phase]))} — ${escHtml(fmtDateTime(p.deadline))}${left}
      </div>`
    }).join('')

    return `<tr>
      <td><strong>${escHtml(row.refNumber || row.id)}</strong>
        <br><span style="font-size:.74rem;color:var(--text-subtle)">${escHtml(row.entityName || '—')}</span></td>
      <td>${phaseCells}</td>
      <td>${row.overdue.length
        ? nis2Badge(t('nis2_stateOverdue'), '#f87171')
        : row.dueSoon.length ? nis2Badge(t('nis2_stateDueSoon'), '#f0b429') : nis2Badge(t('nis2_statePending'), '#8C9BAB')}</td>
      <td>
        <button class="btn btn-secondary btn-xs" onclick="openNis2IncidentForm('${row.id}')">
          <i class="ph ph-arrow-right"></i> ${escHtml(t('nis2_details'))}
        </button>
      </td>
    </tr>`
  }).join('')

  el.innerHTML = `
    <div class="asset-summary-grid">
      <div class="asset-summary-card">
        <div class="assc-value">${rows.length}</div>
        <div class="assc-label">${escHtml(t('nis2_tabDeadlines'))}</div>
      </div>
      <div class="asset-summary-card">
        <div class="assc-value" style="color:${overdue ? '#f87171' : '#4ade80'}">${overdue}</div>
        <div class="assc-label">${escHtml(t('nis2_stateOverdue'))}</div>
      </div>
      <div class="asset-summary-card">
        <div class="assc-value" style="color:${dueSoon ? '#f0b429' : '#4ade80'}">${dueSoon}</div>
        <div class="assc-label">${escHtml(t('nis2_stateDueSoon'))}</div>
      </div>
      <div class="asset-summary-card">
        <div class="assc-value" style="color:var(--text-subtle)">${untracked.length}</div>
        <div class="assc-label">${escHtml(t('nis2_startTracking'))}</div>
      </div>
    </div>

    <p class="asset-prot-hint">${escHtml(t('nis2_art23Hint'))}</p>

    ${rows.length ? `<table class="asset-table">
      <thead><tr>
        <th>${escHtml(t('nis2_incidentCol'))}</th><th>${escHtml(t('nis2_deadline'))}</th><th>${escHtml(t('col_status'))}</th><th></th>
      </tr></thead>
      <tbody>${deadlineRows}</tbody>
    </table>` : `<p class="asset-prot-hint" style="padding:16px">${escHtml(t('nis2_noDeadlines'))}</p>`}

    ${untracked.length && canEdit ? `
      <div class="asset-category-section" style="margin-top:24px">
        <div class="asset-category-header">
          <i class="ph ph-plus-circle"></i> ${escHtml(t('nis2_startTracking'))}
        </div>
        <table class="asset-table">
          <tbody>
            ${untracked.map(i => `<tr>
              <td><strong>${escHtml(i.refNumber || i.id)}</strong>
                <br><span style="font-size:.74rem;color:var(--text-subtle)">${escHtml(i.entityName || '—')}</span></td>
              <td style="font-size:.78rem">${escHtml(fmtDateTime(i.createdAt))}</td>
              <td><button class="btn btn-secondary btn-xs" onclick="openNis2IncidentForm('${i.id}')">
                <i class="ph ph-timer"></i> ${escHtml(t('nis2_startTracking'))}
              </button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    ${!incidents.length ? `<p class="asset-prot-hint" style="padding:16px">${escHtml(t('nis2_noIncidents'))}</p>` : ''}
  `
}

/** Ganzseitige Inline-Ansicht der Meldefristen eines Vorfalls (kein Modal). */
async function openNis2IncidentForm(id) {
  const res = await fetch(`/nis2/incidents/${id}`, { headers: apiHeaders() })
  if (!res.ok) return
  const incident = await res.json()

  const el = dom('nis2TabContent')
  if (!el) return
  const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.contentowner

  // Noch keine Fristenverfolgung: nur den Startzeitpunkt abfragen
  if (!incident.art23) {
    const defaultWhen = (incident.createdAt || new Date().toISOString()).slice(0, 16)
    el.innerHTML = `
      <div class="training-form-page">
        <div class="training-form-header">
          <button class="btn btn-secondary btn-sm" onclick="switchNis2Tab('deadlines')">
            <i class="ph ph-arrow-left"></i> ${t('ui_back')}
          </button>
          <h3 class="training-form-title">
            <i class="ph ph-timer"></i> ${escHtml(incident.refNumber || incident.id)}
          </h3>
        </div>
        <div class="training-form-body">
          <div class="training-form-section">
            <h4 class="training-form-section-title"><i class="ph ph-info"></i> ${escHtml(t('nis2_startTracking'))}</h4>
            <p class="asset-prot-hint">${escHtml(t('nis2_art23Hint'))}</p>
            <div class="form-group">
              <label class="form-label">${escHtml(t('nis2_discoveredAt'))}</label>
              <input id="nis2Discovered" type="datetime-local" class="form-input"
                     value="${escHtml(defaultWhen)}" style="color-scheme:dark">
            </div>
          </div>
        </div>
        <div class="training-form-footer">
          <button class="btn btn-secondary" onclick="switchNis2Tab('deadlines')">${t('ui_cancel')}</button>
          ${canEdit ? `<button class="btn btn-primary" onclick="startNis2Tracking('${incident.id}')">
            <i class="ph ph-timer"></i> ${escHtml(t('nis2_startTracking'))}
          </button>` : ''}
        </div>
      </div>`
    return
  }

  const phasesHtml = incident.art23Status.phases.map(p => {
    const st     = NIS2_PHASE_STATE[p.state] || NIS2_PHASE_STATE.pending
    const report = incident.art23.reports?.[p.phase] || {}
    const left   = p.minutesLeft === null ? ''
      : p.minutesLeft < 0
        ? ` — ${Math.abs(Math.round(p.minutesLeft / 60))} h ${t('nis2_stateOverdue').toLowerCase()}`
        : ` — ${t('nis2_hoursLeft', { h: Math.round(p.minutesLeft / 60) })}`

    return `<div class="training-form-section">
      <h4 class="training-form-section-title">
        <i class="ph ${st.icon}" style="color:${st.color}"></i>
        ${escHtml(t(NIS2_PHASE_I18N[p.phase]))}
        ${nis2Badge(t(st.i18n), st.color)}
      </h4>
      <p style="font-size:.8rem;color:var(--text-subtle);margin-bottom:10px">
        ${escHtml(t('nis2_deadline'))}: <strong>${escHtml(fmtDateTime(p.deadline))}</strong>${escHtml(left)}
        ${p.submittedAt ? `<br><i class="ph ph-check"></i> ${escHtml(t('nis2_stateSubmitted'))}: ${escHtml(fmtDateTime(p.submittedAt))}` : ''}
      </p>
      <div class="form-group">
        <label class="form-label">${escHtml(t('nis2_reportContent'))}</label>
        <textarea id="nis2Report_${p.phase}" class="form-input" rows="4"
          ${canEdit ? '' : 'readonly'}>${escHtml(report.content || '')}</textarea>
      </div>
      ${canEdit ? `<div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="saveNis2Report('${incident.id}','${p.phase}')">
          <i class="ph ph-floppy-disk"></i> ${escHtml(t('nis2_saveReport'))}
        </button>
        ${!p.submittedAt ? `<button class="btn btn-primary btn-sm" onclick="submitNis2Phase('${incident.id}','${p.phase}')">
          <i class="ph ph-paper-plane-tilt"></i> ${escHtml(t('nis2_markSubmitted'))}
        </button>` : ''}
      </div>` : ''}
    </div>`
  }).join('')

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchNis2Tab('deadlines')">
          <i class="ph ph-arrow-left"></i> Back
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-timer"></i> ${escHtml(incident.refNumber || incident.id)}
          ${incident.entityName ? `<span style="font-size:.8rem;color:var(--text-subtle);font-weight:400">${escHtml(incident.entityName)}</span>` : ''}
        </h3>
      </div>
      <div class="training-form-body">
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-info"></i> ${escHtml(t('nis2_discoveredAt'))}</h4>
          <p style="font-size:.85rem">${escHtml(fmtDateTime(incident.art23.discoveredAt))}</p>
          <p style="font-size:.82rem;color:var(--text-subtle);margin-top:6px">${escHtml(incident.description || '')}</p>
        </div>
        ${phasesHtml}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchNis2Tab('deadlines')">${t('ui_back')}</button>
        <button class="btn btn-primary" onclick="exportNis2Report('${incident.id}')">
          <i class="ph ph-download-simple"></i> ${escHtml(t('nis2_exportReport'))}
        </button>
      </div>
    </div>
  `
}

async function startNis2Tracking(id) {
  const raw = dom('nis2Discovered')?.value
  const res = await fetch(`/nis2/incidents/${id}/init`, {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ discoveredAt: raw ? new Date(raw).toISOString() : undefined }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    alert(e.error || 'Error')
    return
  }
  openNis2IncidentForm(id)
}

async function saveNis2Report(id, phase) {
  const content = dom(`nis2Report_${phase}`)?.value || ''
  const res = await fetch(`/nis2/incidents/${id}/report/${phase}`, {
    method: 'PUT',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) { alert('Error'); return }
  openNis2IncidentForm(id)
}

async function submitNis2Phase(id, phase) {
  if (!confirm(`${t('nis2_markSubmitted')}?`)) return
  const res = await fetch(`/nis2/incidents/${id}/phase/${phase}`, {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    alert(e.error || 'Error')
    return
  }
  openNis2IncidentForm(id)
}

async function exportNis2Report(id) {
  const res = await fetch(`/nis2/incidents/${id}/export`, { headers: apiHeaders() })
  if (!res.ok) { alert('Error'); return }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `nis2-art23-${id}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ════════════════════════════════════════════════════════════
// GOVERNANCE & MANAGEMENT-REVIEW (ISO 27001 Kap. 9.3)
// ════════════════════════════════════════════════════════════

let _govTab = 'reviews'

async function renderGovernance() {
  dom('governanceContainer')?.remove()
  const main = document.querySelector('main') || document.body
  const container = document.createElement('div')
  container.id = 'governanceContainer'
  container.className = 'training-container'
  main.appendChild(container)

  const tabs = [
    { id: 'reviews',  get label() { return t('gov_tabReviews') },  icon: 'ph-clipboard-text' },
    { id: 'actions',  get label() { return t('gov_tabActions') },  icon: 'ph-check-square'   },
    { id: 'meetings', get label() { return t('gov_tabMeetings') }, icon: 'ph-users'           },
  ]

  container.innerHTML = `
    <div class="training-header">
      <h2 class="training-title"><i class="ph ph-chalkboard-teacher"></i> Governance &amp; Management Review</h2>
      <div class="training-tab-bar">
        ${tabs.map(t => `<button class="training-tab${t.id===_govTab?' active':''}" data-tab="${t.id}">
          <i class="ph ${t.icon}"></i> ${t.label}
        </button>`).join('')}
      </div>
    </div>
    <div id="govTabContent" class="training-tab-content"></div>
  `
  container.querySelectorAll('.training-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _govTab = btn.dataset.tab
      container.querySelectorAll('.training-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === _govTab))
      switchGovTab(_govTab)
    })
  })
  switchGovTab(_govTab)
}

async function switchGovTab(tab) {
  _govTab = tab
  const el = dom('govTabContent')
  if (!el) return
  el.innerHTML = `<p style="color:var(--text-subtle);padding:24px">${t('ui_loading')}</p>`
  try {
    if (tab === 'reviews')  await renderGovReviews(el)
    if (tab === 'actions')  await renderGovActions(el)
    if (tab === 'meetings') await renderGovMeetings(el)
  } catch(e) {
    el.innerHTML = `<p style="color:var(--danger-text);padding:24px"><i class="ph ph-warning"></i> ${t('error')}: ${escHtml(e.message)}</p>`
  }
}

const GOV_REVIEW_TYPE_LABELS = { get annual() { return t('govl_typeAnnual') }, get interim() { return t('govl_typeInterim') }, get extraordinary() { return t('govl_typeExtra') } }
const GOV_REVIEW_STATUS_LABELS = { get planned() { return t('govl_statPlanned') }, get completed() { return t('govl_statCompleted') }, get approved() { return t('govl_statApproved') } }
const GOV_REVIEW_STATUS_COLORS = { planned: '#888', completed: '#60a5fa', approved: '#4ade80' }
const GOV_PRIORITY_LABELS = { get low() { return t('govl_prioLow') }, get medium() { return t('govl_prioMedium') }, get high() { return t('govl_prioHigh') }, get critical() { return t('govl_prioCritical') } }
const GOV_PRIORITY_COLORS = { low: '#4ade80', medium: '#f0b429', high: '#fb923c', critical: '#f87171' }
const GOV_ACTION_STATUS_LABELS = { get open() { return t('govl_actOpen') }, get in_progress() { return t('govl_actProgress') }, get completed() { return t('govl_actCompleted') }, get cancelled() { return t('govl_actCancelled') } }
const GOV_ACTION_STATUS_COLORS = { open: '#888', in_progress: '#60a5fa', completed: '#4ade80', cancelled: '#555' }
const GOV_SOURCE_LABELS = { get management_review() { return t('govl_srcMgmtReview') }, get internal_audit() { return t('govl_srcInternal') }, get external_audit() { return t('govl_srcExternal') }, get incident() { return t('govl_srcIncident') }, get other() { return t('govl_srcOther') } }
const GOV_COMMITTEE_LABELS = { get isms_committee() { return t('govl_cmtIsms') }, get ciso_meeting() { return t('govl_cmtCiso') }, get risk_committee() { return t('govl_cmtRisk') }, get management() { return t('govl_cmtMgmt') }, get other() { return t('govl_cmtOther') } }

function govBadge(label, color) {
  return `<span class="gov-badge" style="color:${color};border-color:${color}">${escHtml(label)}</span>`
}

async function renderGovReviews(el) {
  const rank    = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.editor
  const isAdmin = rank >= ROLE_RANK.admin

  const res = await fetch('/governance/reviews', { headers: apiHeaders() })
  if (!res.ok) throw new Error('Error loading reviews')
  const reviews = await res.json()

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="color:var(--text-subtle);font-size:.85rem">${reviews.length} Management Reviews</span>
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openGovReviewForm()"><i class="ph ph-plus"></i> ${t('gov_newReview')}</button>` : ''}
    </div>
    ${reviews.length === 0 ? '<p class="dash-empty">No management reviews found.</p>' : `
    <table class="gov-table">
      <thead><tr>
        <th>Title</th><th>Type</th><th>Date</th><th>Status</th><th>Chair</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${reviews.map(r => `<tr>
          <td><strong>${escHtml(r.title)}</strong></td>
          <td>${govBadge(GOV_REVIEW_TYPE_LABELS[r.type]||r.type, '#a78bfa')}</td>
          <td>${r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—'}</td>
          <td>${govBadge(GOV_REVIEW_STATUS_LABELS[r.status]||r.status, GOV_REVIEW_STATUS_COLORS[r.status]||'#888')}</td>
          <td style="font-size:.82rem">${escHtml(r.chair||'—')}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-secondary btn-sm" onclick="openGovReviewForm('${r.id}')"><i class="ph ph-pencil"></i></button>
            ${isAdmin ? `<button class="btn btn-danger btn-sm" style="margin-left:4px" onclick="deleteGovReview('${r.id}')"><i class="ph ph-trash"></i></button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  `
}

async function renderGovActions(el) {
  const rank    = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.editor
  const isAdmin = rank >= ROLE_RANK.admin

  const res = await fetch('/governance/actions', { headers: apiHeaders() })
  if (!res.ok) throw new Error('Error loading actions')
  let actions = await res.json()

  const today = new Date().toISOString().slice(0,10)

  el.innerHTML = `
    <div class="gov-filter-bar">
      <select id="govActStatusFilter" onchange="filterGovActions()">
        <option value="">All statuses</option>
        ${Object.entries(GOV_ACTION_STATUS_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
      <select id="govActPrioFilter" onchange="filterGovActions()">
        <option value="">All priorities</option>
        ${Object.entries(GOV_PRIORITY_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
      <select id="govActSourceFilter" onchange="filterGovActions()">
        <option value="">${t('gov_allSources')}</option>
        ${Object.entries(GOV_SOURCE_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
      <input id="govActSearch" type="text" placeholder="${t('ui_searchPh')}" oninput="filterGovActions()" style="flex:1;min-width:120px">
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openGovActionForm()"><i class="ph ph-plus"></i> ${t('gov_newAction')}</button>` : ''}
    </div>
    <div id="govActTableWrap"></div>
  `
  window._govActionsAll = actions
  window._govActionsToday = today
  filterGovActions()
}

function filterGovActions() {
  const el   = dom('govActTableWrap')
  if (!el) return
  const status = dom('govActStatusFilter')?.value || ''
  const prio   = dom('govActPrioFilter')?.value   || ''
  const source = dom('govActSourceFilter')?.value || ''
  const search = (dom('govActSearch')?.value || '').toLowerCase()
  const isAdmin = ROLE_RANK[getCurrentRole()] >= ROLE_RANK.admin
  const today  = window._govActionsToday || ''

  let list = (window._govActionsAll || [])
  if (status) list = list.filter(a => a.status === status)
  if (prio)   list = list.filter(a => a.priority === prio)
  if (source) list = list.filter(a => a.source === source)
  if (search) list = list.filter(a => (a.title+a.owner+a.description).toLowerCase().includes(search))

  if (!list.length) { el.innerHTML = '<p class="dash-empty">No actions found.</p>'; return }

  el.innerHTML = `<table class="gov-table">
    <thead><tr>
      <th>Title</th><th>Source</th><th>Owner</th><th>Due</th><th>Priority</th><th>Status</th><th>Progress</th><th>Actions</th>
    </tr></thead>
    <tbody>
      ${list.map(a => {
        const overdue = (a.status==='open'||a.status==='in_progress') && a.dueDate && a.dueDate < today
        return `<tr class="${overdue?'overdue':''}">
          <td><strong>${escHtml(a.title)}</strong>${a.notes?`<br><span style="font-size:.75rem;color:var(--text-subtle)">${escHtml(a.notes.slice(0,60))}${a.notes.length>60?'…':''}</span>`:''}</td>
          <td style="font-size:.8rem">${escHtml(GOV_SOURCE_LABELS[a.source]||a.source)}</td>
          <td style="font-size:.82rem">${escHtml(a.owner||'—')}</td>
          <td style="font-size:.82rem;${overdue?'color:#f87171;font-weight:600':''}">${a.dueDate?new Date(a.dueDate).toLocaleDateString('en-GB'):'—'}</td>
          <td>${govBadge(GOV_PRIORITY_LABELS[a.priority]||a.priority, GOV_PRIORITY_COLORS[a.priority]||'#888')}</td>
          <td>${govBadge(GOV_ACTION_STATUS_LABELS[a.status]||a.status, GOV_ACTION_STATUS_COLORS[a.status]||'#888')}</td>
          <td>
            <div style="background:var(--border);border-radius:2px;height:6px;width:80px">
              <div style="width:${a.progress||0}%;background:var(--brand);height:6px;border-radius:2px"></div>
            </div>
            <span style="font-size:.72rem;color:var(--text-subtle)">${a.progress||0}%</span>
          </td>
          <td style="white-space:nowrap">
            <button class="btn btn-secondary btn-sm" onclick="openGovActionForm('${a.id}')"><i class="ph ph-pencil"></i></button>
            ${isAdmin?`<button class="btn btn-danger btn-sm" style="margin-left:4px" onclick="deleteGovAction('${a.id}')"><i class="ph ph-trash"></i></button>`:''}
          </td>
        </tr>`
      }).join('')}
    </tbody>
  </table>`
}

async function renderGovMeetings(el) {
  const rank    = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.editor
  const isAdmin = rank >= ROLE_RANK.admin

  const res = await fetch('/governance/meetings', { headers: apiHeaders() })
  if (!res.ok) throw new Error('Error loading meetings')
  const meetings = await res.json()

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="color:var(--text-subtle);font-size:.85rem">${meetings.length} Meeting minutes</span>
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openGovMeetingForm()"><i class="ph ph-plus"></i> ${t('gov_newMeeting')}</button>` : ''}
    </div>
    ${meetings.length === 0 ? '<p class="dash-empty">No meetings found.</p>' : `
    <table class="gov-table">
      <thead><tr>
        <th>Title</th><th>Committee</th><th>Date</th><th>Chair</th><th>Approved</th><th>Actions</th>
      </tr></thead>
      <tbody>
        ${meetings.map(m => `<tr>
          <td><strong>${escHtml(m.title)}</strong></td>
          <td style="font-size:.82rem">${escHtml(GOV_COMMITTEE_LABELS[m.committee]||m.committee)}</td>
          <td>${m.date ? new Date(m.date).toLocaleDateString('en-GB') : '—'}</td>
          <td style="font-size:.82rem">${escHtml(m.chair||'—')}</td>
          <td>${m.approved
            ? `<span style="color:#4ade80"><i class="ph ph-check-circle"></i> Yes</span>`
            : `<span style="color:#888"><i class="ph ph-clock"></i> Pending</span>`}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-secondary btn-sm" onclick="openGovMeetingForm('${m.id}')"><i class="ph ph-pencil"></i></button>
            ${isAdmin ? `<button class="btn btn-danger btn-sm" style="margin-left:4px" onclick="deleteGovMeeting('${m.id}')"><i class="ph ph-trash"></i></button>` : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  `
}

// ── Forms ──

async function openGovReviewForm(id = null) {
  const el = dom('govTabContent')
  if (!el) return
  el.innerHTML = `<p style="color:var(--text-subtle);padding:24px">${t('ui_loading')}</p>`

  let review = {}
  if (id) {
    const res = await fetch(`/governance/reviews/${id}`, { headers: apiHeaders() })
    if (res.ok) review = await res.json()
  }

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <h3>${id ? t('gov_editReview') : t('gov_newReview')}</h3>
      </div>
      <div class="training-form-body">
        <div class="gov-section-title">${t('ui_basicData')}</div>
        <label class="form-label">${t('col_title')} *</label>
        <input id="grTitle" class="input" value="${escHtml(review.title||'')}" placeholder="e.g. Management Review 2025">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:8px">
          <div>
            <label class="form-label">${t('col_type')}</label>
            <select id="grType" class="select">
              <option value="annual" ${review.type==='annual'?'selected':''}>${t('govl_typeAnnual')}</option>
              <option value="interim" ${review.type==='interim'?'selected':''}>${t('govl_typeInterim')}</option>
              <option value="extraordinary" ${review.type==='extraordinary'?'selected':''}>${t('govl_typeExtra')}</option>
            </select>
          </div>
          <div>
            <label class="form-label">${t('ui_date')}</label>
            <input id="grDate" type="date" class="input" value="${review.date||''}">
          </div>
          <div>
            <label class="form-label">${t('gov_nextReview')}</label>
            <input id="grNextDate" type="date" class="input" value="${review.nextReviewDate||''}">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
          <div>
            <label class="form-label">${t('col_status')}</label>
            <select id="grStatus" class="select">
              <option value="planned" ${review.status==='planned'?'selected':''}>${t('govl_statPlanned')}</option>
              <option value="completed" ${review.status==='completed'?'selected':''}>${t('govl_statCompleted')}</option>
              <option value="approved" ${review.status==='approved'?'selected':''}>${t('govl_statApproved')}</option>
            </select>
          </div>
          <div>
            <label class="form-label">${t('ui_chair')}</label>
            <input id="grChair" class="input" value="${escHtml(review.chair||'')}" placeholder="e.g. Dr. Smith (CEO)">
          </div>
        </div>
        <label class="form-label" style="margin-top:8px">${t('ui_participantsCsv')}</label>
        <textarea id="grParticipants" class="input" rows="2">${escHtml(review.participants||'')}</textarea>

        <div class="gov-section-title">${t('gov_inputsIso')}</div>
        <div class="gov-inputs-grid">
          <div><label>${t('gov_auditResults')}</label><textarea id="grInputAudit" class="input" rows="3">${escHtml(review.inputAuditResults||'')}</textarea></div>
          <div><label>${t('gov_stakeholderFeedback')}</label><textarea id="grInputStakeholder" class="input" rows="3">${escHtml(review.inputStakeholderFeedback||'')}</textarea></div>
          <div><label>${t('gov_kpiStatus')}</label><textarea id="grInputPerf" class="input" rows="3">${escHtml(review.inputPerformance||'')}</textarea></div>
          <div><label>${t('gov_nonconformities')}</label><textarea id="grInputNc" class="input" rows="3">${escHtml(review.inputNonconformities||'')}</textarea></div>
          <div><label>${t('gov_prevActionsStatus')}</label><textarea id="grInputPrev" class="input" rows="3">${escHtml(review.inputPreviousActions||'')}</textarea></div>
          <div><label>${t('gov_risksOpportunities')}</label><textarea id="grInputRisks" class="input" rows="3">${escHtml(review.inputRisksOpportunities||'')}</textarea></div>
          <div><label>${t('gov_externalChanges')}</label><textarea id="grInputExt" class="input" rows="3">${escHtml(review.inputExternalChanges||'')}</textarea></div>
        </div>

        <div class="gov-section-title">${t('gov_outputsIso')}</div>
        <label class="form-label">${t('gov_decisions')}</label>
        <textarea id="grDecisions" class="input" rows="4">${escHtml(review.decisions||'')}</textarea>
        <label class="form-label" style="margin-top:8px">${t('gov_improvementActions')}</label>
        <textarea id="grImprovements" class="input" rows="3">${escHtml(review.improvements||'')}</textarea>
        <label class="form-label" style="margin-top:8px">${t('gov_resourceNeeds')}</label>
        <textarea id="grResourceNeeds" class="input" rows="2">${escHtml(review.resourceNeeds||'')}</textarea>

        <div class="gov-section-title">${t('ui_notes')}</div>
        <textarea id="grNotes" class="input" rows="3">${escHtml(review.notes||'')}</textarea>

        ${renderLinksBlock('gr', review.linkedControls||[], review.linkedPolicies||[])}

        ${id ? `<div class="gov-section-title" style="margin-top:16px">${t('ui_docsAttachments')}</div>
        <div id="govReviewAttachPanel"></div>` : ''}

        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn btn-primary" onclick="saveGovReview(${id?`'${id}'`:'null'})"><i class="ph ph-floppy-disk"></i> ${t('ui_save')}</button>
          <button class="btn btn-secondary" onclick="switchGovTab('reviews')">${t('ui_cancel')}</button>
        </div>
      </div>
    </div>
  `
  initLinkPickers('gr')
  if (id) {
    const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.editor
    renderDocAttachPanel('govReviewAttachPanel', '/governance', 'reviews', id, review.attachments || [], canEdit)
  }
}

async function saveGovReview(id) {
  const payload = {
    title:                   dom('grTitle')?.value?.trim()       || '',
    type:                    dom('grType')?.value                 || 'annual',
    date:                    dom('grDate')?.value                 || '',
    nextReviewDate:          dom('grNextDate')?.value             || '',
    status:                  dom('grStatus')?.value               || 'planned',
    chair:                   dom('grChair')?.value?.trim()        || '',
    participants:            dom('grParticipants')?.value?.trim() || '',
    inputAuditResults:       dom('grInputAudit')?.value           || '',
    inputStakeholderFeedback:dom('grInputStakeholder')?.value     || '',
    inputPerformance:        dom('grInputPerf')?.value            || '',
    inputNonconformities:    dom('grInputNc')?.value              || '',
    inputPreviousActions:    dom('grInputPrev')?.value            || '',
    inputRisksOpportunities: dom('grInputRisks')?.value           || '',
    inputExternalChanges:    dom('grInputExt')?.value             || '',
    decisions:               dom('grDecisions')?.value            || '',
    improvements:            dom('grImprovements')?.value         || '',
    resourceNeeds:           dom('grResourceNeeds')?.value        || '',
    notes:                   dom('grNotes')?.value                || '',
    linkedControls:          getLinkedValues('gr', 'ctrl'),
    linkedPolicies:          getLinkedValues('gr', 'pol'),
  }
  if (!payload.title) { alert('Title is required'); return }
  const url    = id ? `/governance/reviews/${id}` : '/governance/reviews'
  const method = id ? 'PUT' : 'POST'
  const res    = await fetch(url, { method, headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error saving'); return }
  switchGovTab('reviews')
}

async function deleteGovReview(id) {
  if (!confirm('Really delete this management review?')) return
  const res = await fetch(`/governance/reviews/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error'); return }
  switchGovTab('reviews')
}

async function openGovActionForm(id = null) {
  const el = dom('govTabContent')
  if (!el) return
  el.innerHTML = `<p style="color:var(--text-subtle);padding:24px">${t('ui_loading')}</p>`

  let action = {}
  if (id) {
    const res = await fetch(`/governance/actions/${id}`, { headers: apiHeaders() })
    if (res.ok) action = await res.json()
  }

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <h3>${id ? t('gov_editAction') : t('gov_newAction')}</h3>
      </div>
      <div class="training-form-body">
        <div class="gov-section-title">${t('ui_basicData')}</div>
        <label class="form-label">${t('col_title')} *</label>
        <input id="gaTitle" class="input" value="${escHtml(action.title||'')}" placeholder="e.g. Penetration test production network">
        <label class="form-label" style="margin-top:8px">${t('ui_description')}</label>
        <textarea id="gaDesc" class="input" rows="3">${escHtml(action.description||'')}</textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:8px">
          <div>
            <label class="form-label">${t('ui_source')}</label>
            <select id="gaSource" class="select">
              ${Object.entries(GOV_SOURCE_LABELS).map(([v,l])=>`<option value="${v}" ${action.source===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">${t('ui_priority')}</label>
            <select id="gaPrio" class="select">
              ${Object.entries(GOV_PRIORITY_LABELS).map(([v,l])=>`<option value="${v}" ${action.priority===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">${t('col_status')}</label>
            <select id="gaStatus" class="select">
              ${Object.entries(GOV_ACTION_STATUS_LABELS).map(([v,l])=>`<option value="${v}" ${action.status===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <label class="form-label" style="margin-top:8px">${t('gov_sourceRefPh')}</label>
        <input id="gaSourceRef" class="input" value="${escHtml(action.sourceRef||'')}" placeholder="e.g. Finding A-2024-007">

        <div class="gov-section-title">${t('gov_responsibility')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="form-label">${t('ui_owner')}</label>
            <input id="gaOwner" class="input" value="${escHtml(action.owner||'')}" placeholder="${t('ui_namePh')}">
          </div>
          <div>
            <label class="form-label">${t('ui_email')}</label>
            <input id="gaOwnerEmail" type="email" class="input" value="${escHtml(action.ownerEmail||'')}" placeholder="name@example.com">
          </div>
          <div>
            <label class="form-label">${t('ui_dueDate')}</label>
            <input id="gaDue" type="date" class="input" value="${action.dueDate||''}">
          </div>
          <div>
            <label class="form-label">${t('ui_completedOn')}</label>
            <input id="gaCompleted" type="date" class="input" value="${action.completedDate||''}">
          </div>
        </div>
        <label class="form-label" style="margin-top:8px">${t('gov_progress')}</label>
        <input id="gaProgress" type="number" min="0" max="100" class="input" value="${action.progress||0}" style="width:120px">

        <div class="gov-section-title">${t('ui_notes')}</div>
        <textarea id="gaNotes" class="input" rows="3">${escHtml(action.notes||'')}</textarea>

        ${renderLinksBlock('ga', action.linkedControls||[], action.linkedPolicies||[])}

        ${id ? `<div class="gov-section-title" style="margin-top:16px">${t('ui_docsAttachments')}</div>
        <div id="govActionAttachPanel"></div>` : ''}

        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn btn-primary" onclick="saveGovAction(${id?`'${id}'`:'null'})"><i class="ph ph-floppy-disk"></i> ${t('ui_save')}</button>
          <button class="btn btn-secondary" onclick="switchGovTab('actions')">${t('ui_cancel')}</button>
        </div>
      </div>
    </div>
  `
  initLinkPickers('ga')
  if (id) {
    const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.editor
    renderDocAttachPanel('govActionAttachPanel', '/governance', 'actions', id, action.attachments || [], canEdit)
  }
}

async function saveGovAction(id) {
  const payload = {
    title:         dom('gaTitle')?.value?.trim() || '',
    description:   dom('gaDesc')?.value          || '',
    source:        dom('gaSource')?.value         || 'management_review',
    sourceRef:     dom('gaSourceRef')?.value      || '',
    priority:      dom('gaPrio')?.value           || 'medium',
    status:        dom('gaStatus')?.value         || 'open',
    owner:         dom('gaOwner')?.value?.trim()  || '',
    ownerEmail:    dom('gaOwnerEmail')?.value     || '',
    dueDate:       dom('gaDue')?.value            || '',
    completedDate: dom('gaCompleted')?.value      || '',
    progress:       parseInt(dom('gaProgress')?.value || '0', 10),
    notes:          dom('gaNotes')?.value          || '',
    linkedControls: getLinkedValues('ga', 'ctrl'),
    linkedPolicies: getLinkedValues('ga', 'pol'),
  }
  if (!payload.title) { alert('Title is required'); return }
  const url    = id ? `/governance/actions/${id}` : '/governance/actions'
  const method = id ? 'PUT' : 'POST'
  const res    = await fetch(url, { method, headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error saving'); return }
  switchGovTab('actions')
}

async function deleteGovAction(id) {
  if (!confirm('Really delete this action?')) return
  const res = await fetch(`/governance/actions/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error'); return }
  switchGovTab('actions')
}

async function openGovMeetingForm(id = null) {
  const el = dom('govTabContent')
  if (!el) return
  el.innerHTML = `<p style="color:var(--text-subtle);padding:24px">${t('ui_loading')}</p>`

  let meeting = {}
  if (id) {
    const res = await fetch(`/governance/meetings/${id}`, { headers: apiHeaders() })
    if (res.ok) meeting = await res.json()
  }

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <h3>${id ? t('gov_editMeeting') : t('gov_newMeeting')}</h3>
      </div>
      <div class="training-form-body">
        <div class="gov-section-title">${t('ui_basicData')}</div>
        <label class="form-label">${t('col_title')} *</label>
        <input id="gmTitle" class="input" value="${escHtml(meeting.title||'')}" placeholder="e.g. ISMS Committee Q1/2025">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:8px">
          <div>
            <label class="form-label">${t('gov_committee')}</label>
            <select id="gmCommittee" class="select">
              ${Object.entries(GOV_COMMITTEE_LABELS).map(([v,l])=>`<option value="${v}" ${meeting.committee===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">${t('ui_date')}</label>
            <input id="gmDate" type="date" class="input" value="${meeting.date||''}">
          </div>
          <div>
            <label class="form-label">${t('gov_nextMeeting')}</label>
            <input id="gmNextDate" type="date" class="input" value="${meeting.nextMeetingDate||''}">
          </div>
        </div>
        <label class="form-label" style="margin-top:8px">${t('ui_location')}</label>
        <input id="gmLocation" class="input" value="${escHtml(meeting.location||'')}" placeholder="e.g. Conference room 1">

        <div class="gov-section-title">${t('ui_participants')}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="form-label">${t('ui_chair')}</label>
            <input id="gmChair" class="input" value="${escHtml(meeting.chair||'')}" placeholder="${t('gov_chairRolePh')}">
          </div>
          <div>
            <label class="form-label">${t('gov_secretary')}</label>
            <input id="gmSecretary" class="input" value="${escHtml(meeting.secretary||'')}" placeholder="${t('ui_namePh')}">
          </div>
        </div>
        <label class="form-label" style="margin-top:8px">${t('ui_participantsCsv')}</label>
        <textarea id="gmParticipants" class="input" rows="2">${escHtml(meeting.participants||'')}</textarea>

        <div class="gov-section-title">${t('gov_minutes')}</div>
        <label class="form-label">${t('gov_agendaPh')}</label>
        <textarea id="gmAgenda" class="input" rows="5">${escHtml(meeting.agenda||'')}</textarea>
        <label class="form-label" style="margin-top:8px">${t('gov_decisionsOutcomes')}</label>
        <textarea id="gmDecisions" class="input" rows="5">${escHtml(meeting.decisions||'')}</textarea>

        <div class="gov-section-title">${t('gov_approval')}</div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input id="gmApproved" type="checkbox" ${meeting.approved?'checked':''}>
            <span>${t('gov_minutesApproved')}</span>
          </label>
        </div>
        <label class="form-label">${t('ui_approvedBy')}</label>
        <input id="gmApprovedBy" class="input" value="${escHtml(meeting.approvedBy||'')}" placeholder="${t('ui_namePh')}">

        <div class="gov-section-title">${t('ui_notes')}</div>
        <textarea id="gmNotes" class="input" rows="3">${escHtml(meeting.notes||'')}</textarea>

        ${renderLinksBlock('gm', meeting.linkedControls||[], meeting.linkedPolicies||[])}

        ${id ? `<div class="gov-section-title" style="margin-top:16px">${t('ui_docsAttachments')}</div>
        <div id="govMeetingAttachPanel"></div>` : ''}

        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn btn-primary" onclick="saveGovMeeting(${id?`'${id}'`:'null'})"><i class="ph ph-floppy-disk"></i> ${t('ui_save')}</button>
          <button class="btn btn-secondary" onclick="switchGovTab('meetings')">${t('ui_cancel')}</button>
        </div>
      </div>
    </div>
  `
  initLinkPickers('gm')
  if (id) {
    const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.editor
    renderDocAttachPanel('govMeetingAttachPanel', '/governance', 'meetings', id, meeting.attachments || [], canEdit)
  }
}

async function saveGovMeeting(id) {
  const payload = {
    title:           dom('gmTitle')?.value?.trim()        || '',
    committee:       dom('gmCommittee')?.value             || 'isms_committee',
    date:            dom('gmDate')?.value                  || '',
    location:        dom('gmLocation')?.value              || '',
    nextMeetingDate: dom('gmNextDate')?.value              || '',
    chair:           dom('gmChair')?.value?.trim()         || '',
    secretary:       dom('gmSecretary')?.value?.trim()     || '',
    participants:    dom('gmParticipants')?.value?.trim()  || '',
    agenda:          dom('gmAgenda')?.value                || '',
    decisions:       dom('gmDecisions')?.value             || '',
    approved:        dom('gmApproved')?.checked            === true,
    approvedBy:      dom('gmApprovedBy')?.value?.trim()   || '',
    notes:           dom('gmNotes')?.value                 || '',
    linkedControls:  getLinkedValues('gm', 'ctrl'),
    linkedPolicies:  getLinkedValues('gm', 'pol'),
  }
  if (!payload.title) { alert('Title is required'); return }
  const url    = id ? `/governance/meetings/${id}` : '/governance/meetings'
  const method = id ? 'PUT' : 'POST'
  const res    = await fetch(url, { method, headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error saving'); return }
  switchGovTab('meetings')
}

async function deleteGovMeeting(id) {
  if (!confirm('Delete meeting minutes?')) return
  const res = await fetch(`/governance/meetings/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error'); return }
  switchGovTab('meetings')
}

// ════════════════════════════════════════════════════════════
// BCM – Business Continuity Management
// ════════════════════════════════════════════════════════════

let _bcmTab = 'bia'

const BCM_CRIT_LABELS = { get critical() { return t('bcml_critCritical') }, get high() { return t('bcml_critHigh') }, get medium() { return t('bcml_critMedium') }, get low() { return t('bcml_critLow') } }
const BCM_STATUS_LABELS = { get draft() { return t('bcml_statDraft') }, get reviewed() { return t('bcml_statReviewed') }, get approved() { return t('bcml_statApproved') }, get tested() { return t('bcml_statTested') }, get review() { return t('bcml_statInReview') } }
const BCM_PLAN_TYPE_LABELS = { get bcp() { return t('bcml_planBcp') }, get drp() { return t('bcml_planDrp') }, get itp() { return t('bcml_planItp') }, get crisis_communication() { return t('bcml_planCrisis') } }
const BCM_RESULT_LABELS = { get pass() { return t('bcml_resPass') }, get fail() { return t('bcml_resFail') }, get partial() { return t('bcml_resPartial') }, get planned() { return t('bcml_resPlanned') }, get not_tested() { return t('bcml_resNotTested') } }
const BCM_EXERCISE_TYPE_LABELS = { get tabletop() { return t('bcml_exTabletop') }, get simulation() { return t('bcml_exSimulation') }, get full_drill() { return t('bcml_exFullDrill') }, get walkthrough() { return t('bcml_exWalkthrough') } }

function bcmCritBadge(v) {
  return `<span class="bcm-badge ${v}">${BCM_CRIT_LABELS[v] || v}</span>`
}
function bcmStatusBadge(v) {
  return `<span class="bcm-badge ${v}">${BCM_STATUS_LABELS[v] || v}</span>`
}
function bcmResultBadge(v) {
  return `<span class="bcm-badge ${v||'not_tested'}">${BCM_RESULT_LABELS[v] || v || 'Not Tested'}</span>`
}

async function renderBcm() {
  const existing = document.getElementById('bcmContainer')
  if (existing) existing.remove()

  const container = document.createElement('div')
  container.id = 'bcmContainer'
  container.className = 'training-container'
  document.querySelector('.editor').appendChild(container)

  const rank = ROLE_RANK[getCurrentRole()] || 0
  const canEdit  = rank >= ROLE_RANK.editor
  const isAdmin  = rank >= ROLE_RANK.admin

  const tabs = [
    { id:'bia',       get label() { return t('bcm_tabBia') },       icon:'ph-clipboard-text' },
    { id:'plans',     get label() { return t('bcm_tabPlans') },     icon:'ph-file-doc' },
    { id:'exercises', get label() { return t('bcm_tabExercises') }, icon:'ph-flag-checkered' },
  ]

  container.innerHTML = `
    <div class="training-header">
      <h2 class="training-title"><i class="ph ph-heartbeat"></i> Business Continuity Management</h2>
      <p class="training-subtitle" style="color:var(--text-subtle);font-size:.85rem;margin:4px 0 0">
        BIA Register · Continuity Plans (BCP/DRP/ITP) · Exercises & Tests | ISO 22301
      </p>
    </div>
    <div class="training-tab-bar">
      ${tabs.map(t => `<button class="training-tab${t.id===_bcmTab?' active':''}" data-tab="${t.id}">
        <i class="ph ${t.icon}"></i> ${t.label}
      </button>`).join('')}
    </div>
    <div id="bcmTabContent" class="training-tab-content"></div>
  `

  container.querySelectorAll('.training-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _bcmTab = btn.dataset.tab
      container.querySelectorAll('.training-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === _bcmTab))
      switchBcmTab(_bcmTab)
    })
  })

  switchBcmTab(_bcmTab)
}

async function switchBcmTab(tab) {
  _bcmTab = tab
  const el = dom('bcmTabContent')
  if (!el) return
  el.innerHTML = `<p class="report-loading">${t('ui_loading')}</p>`
  if (tab === 'bia')       await renderBcmBia(el)
  if (tab === 'plans')     await renderBcmPlans(el)
  if (tab === 'exercises') await renderBcmExercises(el)
}

async function renderBcmBia(el) {
  const rank     = ROLE_RANK[getCurrentRole()] || 0
  const canEdit  = rank >= ROLE_RANK.editor
  const isAdmin  = rank >= ROLE_RANK.admin

  const [biaRes, entRes] = await Promise.all([
    fetch('/bcm/bia', { headers: apiHeaders() }),
    fetch('/entities', { headers: apiHeaders() }),
  ])
  const list = biaRes.ok ? await biaRes.json() : []
  const entities = entRes.ok ? await entRes.json() : []

  let filterCrit = '', filterStatus = ''

  function renderTable() {
    let rows = list.filter(b => {
      if (filterCrit   && b.criticality !== filterCrit)   return false
      if (filterStatus && b.status      !== filterStatus) return false
      return true
    })
    const today = new Date().toISOString().slice(0,10)
    return `
      <table class="bcm-table">
        <thead><tr>
          <th>${t('bcm_process')}</th><th>${t('bcm_responsible')}</th><th>${t('bcm_department')}</th>
          <th>${t('assets_criticality')}</th><th>${t('bcm_rtoShort')}</th><th>${t('bcm_rpoShort')}</th>
          <th>${t('col_status')}</th><th>${t('ui_actions')}</th>
        </tr></thead>
        <tbody>
          ${rows.length ? rows.map(b => `
            <tr>
              <td><strong>${escHtml(b.title)}</strong></td>
              <td>${escHtml(b.processOwner)}</td>
              <td>${escHtml(b.department)}</td>
              <td>${bcmCritBadge(b.criticality)}</td>
              <td>${b.rto}</td>
              <td>${b.rpo}</td>
              <td>${bcmStatusBadge(b.status)}</td>
              <td style="white-space:nowrap">
                ${canEdit ? `<button class="btn btn-secondary btn-xs" onclick="openBiaForm('${b.id}')"><i class="ph ph-pencil"></i></button>` : ''}
                ${isAdmin ? `<button class="btn btn-danger btn-xs" onclick="deleteBia('${b.id}')"><i class="ph ph-trash"></i></button>` : ''}
              </td>
            </tr>`).join('') : `<tr><td colspan="8" class="dash-empty">${t('bcm_noBia')}</td></tr>`}
        </tbody>
      </table>
    `
  }

  el.innerHTML = `
    <div class="bcm-filter-bar">
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openBiaForm()"><i class="ph ph-plus"></i> ${t('bcm_newBia')}</button>` : ''}
      <select id="bcmBiaCrit" class="select" style="max-width:150px">
        <option value="">${t('assets_allCrit')}</option>
        ${Object.entries(BCM_CRIT_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
      <select id="bcmBiaStatus" class="select" style="max-width:150px">
        <option value="">${t('filter_allStatuses')}</option>
        ${Object.entries(BCM_STATUS_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
    </div>
    <div id="bcmBiaTable">${renderTable()}</div>
  `

  el.querySelector('#bcmBiaCrit')?.addEventListener('change', e => {
    filterCrit = e.target.value
    el.querySelector('#bcmBiaTable').innerHTML = renderTable()
  })
  el.querySelector('#bcmBiaStatus')?.addEventListener('change', e => {
    filterStatus = e.target.value
    el.querySelector('#bcmBiaTable').innerHTML = renderTable()
  })
}

async function openBiaForm(id = null) {
  const isEdit = !!id
  let item = null
  if (isEdit) {
    const r = await fetch(`/bcm/bia/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }
  const el = dom('bcmTabContent')
  if (!el) return

  const entRes = await fetch('/entities', { headers: apiHeaders() })
  const entities = entRes.ok ? await entRes.json() : []

  document.querySelectorAll('.training-tab').forEach(b => b.classList.remove('active'))

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchBcmTab('bia')">
          <i class="ph ph-arrow-left"></i> ${t('ui_backToBiaRegister')}
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-clipboard-text"></i>
          ${isEdit ? t('bcm_editBia') : t('bcm_newBia')}
        </h3>
      </div>
      <div class="training-form-body">
        <div class="training-form-section">
          <div class="form-group">
            <label class="form-label">${t('bcm_processSystem')} <span class="form-required">*</span></label>
            <input id="biaTitle" class="form-input" value="${escHtml(item?.title||'')}" placeholder="${t('bcm_processSystemPh')}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('bcm_processOwner')}</label>
              <input id="biaOwner" class="form-input" value="${escHtml(item?.processOwner||'')}" placeholder="${t('ui_nameRolePh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('bcm_department')}</label>
              <input id="biaDept" class="form-input" value="${escHtml(item?.department||'')}" placeholder="${t('bcm_deptPh')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('assets_criticality')}</label>
              <select id="biaCrit" class="select">
                ${Object.entries(BCM_CRIT_LABELS).map(([v,l])=>`<option value="${v}"${item?.criticality===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('col_status')}</label>
              <select id="biaStatus" class="select">
                ${Object.entries(BCM_STATUS_LABELS).map(([v,l])=>`<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-timer"></i> ${t('bcm_recoveryObjectives')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('bcm_rtoFull')}</label>
              <input id="biaRto" type="number" min="0" class="form-input" value="${item?.rto??''}" placeholder="${t('bcm_rtoPh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('bcm_rpoFull')}</label>
              <input id="biaRpo" type="number" min="0" class="form-input" value="${item?.rpo??''}" placeholder="${t('bcm_rpoPh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('bcm_mtpdFull')}</label>
              <input id="biaMtpd" type="number" min="0" class="form-input" value="${item?.mtpd??''}" placeholder="${t('bcm_mtpdPh')}">
            </div>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-link"></i> ${t('bcm_depsSystemsTitle')}</h4>
          <div class="form-group">
            <label class="form-label">${t('bcm_depsCsv')}</label>
            <textarea id="biaDeps" class="form-input" rows="2" placeholder="${t('bcm_depsPh')}">${escHtml((item?.dependencies||[]).join(', '))}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">${t('bcm_affectedSystemsCsv')}</label>
            <textarea id="biaSystems" class="form-input" rows="2" placeholder="${t('bcm_sysPh')}">${escHtml((item?.affectedSystems||[]).join(', '))}</textarea>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-calendar"></i> ${t('ui_review')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('ui_lastReview')}</label>
              <input id="biaReview" type="date" class="form-input" value="${item?.lastReviewDate||''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">${t('ui_entity')}</label>
              <select id="biaEntity" class="select">
                <option value="">${t('ui_noEntity')}</option>
                ${entities.map(e=>`<option value="${e.id}"${item?.entityId===e.id?' selected':''}>${escHtml(e.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('bcm_notesRemarks')}</label>
            <textarea id="biaNotes" class="form-input" rows="3" placeholder="${t('bcm_biaNotesPh')}">${escHtml(item?.notes||'')}</textarea>
          </div>
          ${renderLinksBlock('bia', item?.linkedControls||[], item?.linkedPolicies||[])}
        </div>
      </div>
      ${id ? `<div style="padding:0 24px 16px"><div class="gov-section-title">${t('ui_docsAttachments')}</div>
        <div id="bcmBiaAttachPanel"></div></div>` : ''}
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchBcmTab('bia')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveBia('${id||''}')">
          <i class="ph ph-floppy-disk"></i> ${t('ui_save')}
        </button>
      </div>
    </div>
  `
  initLinkPickers('bia')
  if (id) {
    const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.editor
    renderDocAttachPanel('bcmBiaAttachPanel', '/bcm', 'bia', id, item?.attachments || [], canEdit)
  }
}

async function saveBia(id) {
  const splitList = v => (v||'').split(',').map(s=>s.trim()).filter(Boolean)
  const payload = {
    title:          dom('biaTitle')?.value?.trim() || '',
    processOwner:   dom('biaOwner')?.value?.trim() || '',
    department:     dom('biaDept')?.value?.trim()  || '',
    criticality:    dom('biaCrit')?.value          || 'medium',
    rto:            parseFloat(dom('biaRto')?.value)  || 0,
    rpo:            parseFloat(dom('biaRpo')?.value)  || 0,
    mtpd:           parseFloat(dom('biaMtpd')?.value) || 0,
    dependencies:   splitList(dom('biaDeps')?.value),
    affectedSystems:splitList(dom('biaSystems')?.value),
    status:         dom('biaStatus')?.value        || 'draft',
    lastReviewDate: dom('biaReview')?.value        || '',
    notes:          dom('biaNotes')?.value         || '',
    entityId:       dom('biaEntity')?.value        || '',
    linkedControls: getLinkedValues('bia', 'ctrl'),
    linkedPolicies: getLinkedValues('bia', 'pol'),
  }
  if (!payload.title) { alert('Title is required'); return }
  const url    = id ? `/bcm/bia/${id}` : '/bcm/bia'
  const method = id ? 'PUT' : 'POST'
  const res    = await fetch(url, { method, headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error saving'); return }
  switchBcmTab('bia')
}

async function deleteBia(id) {
  if (!confirm('Delete BIA entry?')) return
  const res = await fetch(`/bcm/bia/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error'); return }
  switchBcmTab('bia')
}

// ── Plans ────────────────────────────────────────────────────────────────────

async function renderBcmPlans(el) {
  const rank    = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.editor
  const isAdmin = rank >= ROLE_RANK.admin
  const today   = new Date().toISOString().slice(0,10)

  const [plansRes, biaRes] = await Promise.all([
    fetch('/bcm/plans', { headers: apiHeaders() }),
    fetch('/bcm/bia',   { headers: apiHeaders() }),
  ])
  const list = plansRes.ok ? await plansRes.json() : []
  const biaList = biaRes.ok ? await biaRes.json() : []

  let filterType = '', filterStatus = ''

  function renderTable() {
    let rows = list.filter(p => {
      if (filterType   && p.type   !== filterType)   return false
      if (filterStatus && p.status !== filterStatus) return false
      return true
    })
    return `
      <table class="bcm-table">
        <thead><tr>
          <th>${t('col_title')}</th><th>${t('col_type')}</th><th>${t('bcm_responsible')}</th>
          <th>${t('col_status')}</th><th>${t('bcm_lastTest')}</th>
          <th>${t('bcm_nextTest')}</th><th>${t('bcm_testResult')}</th><th>${t('ui_actions')}</th>
        </tr></thead>
        <tbody>
          ${rows.length ? rows.map(p => {
            const overdue = p.nextTest && p.nextTest < today
            return `<tr class="${overdue?'overdue':''}">
              <td><strong>${escHtml(p.title)}</strong><br><small style="color:var(--text-subtle)">${BCM_PLAN_TYPE_LABELS[p.type]||p.type} · v${escHtml(p.version||'1.0')}</small></td>
              <td>${BCM_PLAN_TYPE_LABELS[p.type]||p.type}</td>
              <td>${escHtml(p.planOwner)}</td>
              <td>${bcmStatusBadge(p.status)}</td>
              <td>${p.lastTested||'—'}</td>
              <td class="${overdue?'bcm-overdue':''}">${p.nextTest||'—'}${overdue?` <i class="ph ph-warning-circle" title="${escHtml(t('bcm_overdue'))}"></i>`:''}</td>
              <td>${bcmResultBadge(p.testResult)}</td>
              <td style="white-space:nowrap">
                ${canEdit ? `<button class="btn btn-secondary btn-xs" onclick="openPlanForm('${p.id}')"><i class="ph ph-pencil"></i></button>` : ''}
                ${isAdmin ? `<button class="btn btn-danger btn-xs" onclick="deletePlan('${p.id}')"><i class="ph ph-trash"></i></button>` : ''}
              </td>
            </tr>`
          }).join('') : `<tr><td colspan="8" class="dash-empty">${t('bcm_noPlansFound')}</td></tr>`}
        </tbody>
      </table>
    `
  }

  el.innerHTML = `
    <div class="bcm-filter-bar">
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openPlanForm()"><i class="ph ph-plus"></i> ${t('bcm_newPlan')}</button>` : ''}
      <select id="bcmPlanType" class="select" style="max-width:180px">
        <option value="">${t('ui_allTypes')}</option>
        ${Object.entries(BCM_PLAN_TYPE_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
      <select id="bcmPlanStatus" class="select" style="max-width:160px">
        <option value="">${t('filter_allStatuses')}</option>
        ${Object.entries(BCM_STATUS_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
    </div>
    <div id="bcmPlansTable">${renderTable()}</div>
  `

  el.querySelector('#bcmPlanType')?.addEventListener('change', e => {
    filterType = e.target.value
    el.querySelector('#bcmPlansTable').innerHTML = renderTable()
  })
  el.querySelector('#bcmPlanStatus')?.addEventListener('change', e => {
    filterStatus = e.target.value
    el.querySelector('#bcmPlansTable').innerHTML = renderTable()
  })
}

async function openPlanForm(id = null) {
  const isEdit = !!id
  let item = null
  if (isEdit) {
    const r = await fetch(`/bcm/plans/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }
  const el = dom('bcmTabContent')
  if (!el) return

  const biaRes = await fetch('/bcm/bia', { headers: apiHeaders() })
  const biaList = biaRes.ok ? await biaRes.json() : []

  document.querySelectorAll('.training-tab').forEach(b => b.classList.remove('active'))

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchBcmTab('plans')">
          <i class="ph ph-arrow-left"></i> ${t('ui_backToPlans')}
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-file-doc"></i>
          ${isEdit ? t('bcm_editPlan') : t('bcm_newPlan')}
        </h3>
      </div>
      <div class="training-form-body">
        <div class="training-form-section">
          <div class="form-group">
            <label class="form-label">${t('col_title')} <span class="form-required">*</span></label>
            <input id="planTitle" class="form-input" value="${escHtml(item?.title||'')}" placeholder="${t('bcm_planTitlePh')}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('col_type')}</label>
              <select id="planType" class="select">
                ${Object.entries(BCM_PLAN_TYPE_LABELS).map(([v,l])=>`<option value="${v}"${item?.type===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('col_status')}</label>
              <select id="planStatus" class="select">
                ${Object.entries(BCM_STATUS_LABELS).map(([v,l])=>`<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('ui_version')}</label>
              <input id="planVersion" class="form-input" value="${escHtml(item?.version||'1.0')}" placeholder="${t('bcm_versionPh')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('bcm_scope')}</label>
              <input id="planScope" class="form-input" value="${escHtml(item?.scope||'')}" placeholder="${t('bcm_scopePh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('bcm_planOwner')}</label>
              <input id="planOwner" class="form-input" value="${escHtml(item?.planOwner||'')}" placeholder="${t('ui_nameRolePh')}">
            </div>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-calendar-check"></i> ${t('bcm_tests')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('bcm_lastTest')}</label>
              <input id="planLastTested" type="date" class="form-input" value="${item?.lastTested||''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">${t('bcm_nextTest')}</label>
              <input id="planNextTest" type="date" class="form-input" value="${item?.nextTest||''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">${t('bcm_testResult')}</label>
              <select id="planTestResult" class="select">
                ${Object.entries(BCM_RESULT_LABELS).map(([v,l])=>`<option value="${v}"${item?.testResult===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-link"></i> ${t('bcm_linkedBias')}</h4>
          <div class="form-group">
            <label class="form-label">${t('bcm_biasMultiSelect')}</label>
            <select id="planBias" class="select" multiple style="height:120px">
              ${biaList.map(b=>`<option value="${b.id}"${(item?.linkedBiaIds||[]).includes(b.id)?' selected':''}>${escHtml(b.title)} (${BCM_CRIT_LABELS[b.criticality]||b.criticality})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-list-checks"></i> ${t('bcm_actionsProcedures')}</h4>
          <div class="form-group">
            <label class="form-label">${t('bcm_emergencyProcs')}</label>
            <textarea id="planProcs" class="form-input" rows="6" placeholder="${t('bcm_procsPh')}">${escHtml(item?.procedures||'')}</textarea>
          </div>
          ${renderLinksBlock('plan', item?.linkedControls||[], item?.linkedPolicies||[])}
        </div>
      </div>
      ${id ? `<div style="padding:0 24px 16px"><div class="gov-section-title">${t('ui_docsAttachments')}</div>
        <div id="bcmPlanAttachPanel"></div></div>` : ''}
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchBcmTab('plans')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="savePlan('${id||''}')">
          <i class="ph ph-floppy-disk"></i> ${t('ui_save')}
        </button>
      </div>
    </div>
  `
  initLinkPickers('plan')
  if (id) {
    const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.editor
    renderDocAttachPanel('bcmPlanAttachPanel', '/bcm', 'plans', id, item?.attachments || [], canEdit)
  }
}

async function savePlan(id) {
  const biaSel = dom('planBias')
  const linkedBiaIds = biaSel ? Array.from(biaSel.selectedOptions).map(o=>o.value) : []
  const payload = {
    title:        dom('planTitle')?.value?.trim()  || '',
    type:         dom('planType')?.value           || 'bcp',
    scope:        dom('planScope')?.value?.trim()  || '',
    planOwner:    dom('planOwner')?.value?.trim()  || '',
    status:       dom('planStatus')?.value         || 'draft',
    version:      dom('planVersion')?.value?.trim()|| '1.0',
    lastTested:   dom('planLastTested')?.value     || '',
    nextTest:     dom('planNextTest')?.value       || '',
    testResult:   dom('planTestResult')?.value     || 'not_tested',
    linkedBiaIds,
    procedures:     dom('planProcs')?.value          || '',
    linkedControls: getLinkedValues('plan', 'ctrl'),
    linkedPolicies: getLinkedValues('plan', 'pol'),
  }
  if (!payload.title) { alert('Title is required'); return }
  const url    = id ? `/bcm/plans/${id}` : '/bcm/plans'
  const method = id ? 'PUT' : 'POST'
  const res    = await fetch(url, { method, headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error saving'); return }
  switchBcmTab('plans')
}

async function deletePlan(id) {
  if (!confirm('Delete continuity plan?')) return
  const res = await fetch(`/bcm/plans/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error'); return }
  switchBcmTab('plans')
}

// ── Exercises ────────────────────────────────────────────────────────────────

async function renderBcmExercises(el) {
  const rank    = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.editor
  const isAdmin = rank >= ROLE_RANK.admin

  const [exRes, planRes] = await Promise.all([
    fetch('/bcm/exercises', { headers: apiHeaders() }),
    fetch('/bcm/plans',     { headers: apiHeaders() }),
  ])
  const list  = exRes.ok   ? await exRes.json()  : []
  const plans = planRes.ok ? await planRes.json() : []
  const planMap = Object.fromEntries(plans.map(p=>[p.id, p.title]))

  el.innerHTML = `
    <div class="bcm-filter-bar">
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openExerciseForm()"><i class="ph ph-plus"></i> ${t('bcm_newExercise')}</button>` : ''}
    </div>
    <table class="bcm-table">
      <thead><tr>
        <th>${t('col_title')}</th><th>${t('col_type')}</th><th>${t('ui_date')}</th><th>${t('bcm_conductor')}</th>
        <th>${t('bcm_result')}</th><th>${t('bcm_linkedPlan')}</th><th>${t('ui_actions')}</th>
      </tr></thead>
      <tbody>
        ${list.length ? list.map(e => `
          <tr>
            <td><strong>${escHtml(e.title)}</strong></td>
            <td>${BCM_EXERCISE_TYPE_LABELS[e.type]||e.type}</td>
            <td>${e.date||'—'}</td>
            <td>${escHtml(e.conductor)}</td>
            <td>${bcmResultBadge(e.result)}</td>
            <td>${e.linkedPlanId ? escHtml(planMap[e.linkedPlanId]||e.linkedPlanId) : '—'}</td>
            <td style="white-space:nowrap">
              ${canEdit ? `<button class="btn btn-secondary btn-xs" onclick="openExerciseForm('${e.id}')"><i class="ph ph-pencil"></i></button>` : ''}
              ${isAdmin ? `<button class="btn btn-danger btn-xs" onclick="deleteExercise('${e.id}')"><i class="ph ph-trash"></i></button>` : ''}
            </td>
          </tr>`).join('') : `<tr><td colspan="7" class="dash-empty">${t('bcm_noExercisesFound')}</td></tr>`}
      </tbody>
    </table>
  `
}

async function openExerciseForm(id = null) {
  const isEdit = !!id
  let item = null
  if (isEdit) {
    const r = await fetch(`/bcm/exercises/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }
  const el = dom('bcmTabContent')
  if (!el) return

  const planRes = await fetch('/bcm/plans', { headers: apiHeaders() })
  const plans = planRes.ok ? await planRes.json() : []

  document.querySelectorAll('.training-tab').forEach(b => b.classList.remove('active'))

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchBcmTab('exercises')">
          <i class="ph ph-arrow-left"></i> ${t('ui_backToExercises')}
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-flag-checkered"></i>
          ${isEdit ? t('bcm_editExercise') : t('bcm_newExercise')}
        </h3>
      </div>
      <div class="training-form-body">
        <div class="training-form-section">
          <div class="form-group">
            <label class="form-label">${t('col_title')} <span class="form-required">*</span></label>
            <input id="exTitle" class="form-input" value="${escHtml(item?.title||'')}" placeholder="${t('bcm_exerciseTitlePh')}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('bcm_exerciseType')}</label>
              <select id="exType" class="select">
                ${Object.entries(BCM_EXERCISE_TYPE_LABELS).map(([v,l])=>`<option value="${v}"${item?.type===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('ui_date')}</label>
              <input id="exDate" type="date" class="form-input" value="${item?.date||''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">${t('bcm_result')}</label>
              <select id="exResult" class="select">
                ${Object.entries(BCM_RESULT_LABELS).map(([v,l])=>`<option value="${v}"${item?.result===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('bcm_conductor')}</label>
              <input id="exConductor" class="form-input" value="${escHtml(item?.conductor||'')}" placeholder="${t('bcm_conductorPh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('bcm_linkedPlan')}</label>
              <select id="exPlan" class="select">
                <option value="">${t('bcm_noPlan')}</option>
                ${plans.map(p=>`<option value="${p.id}"${item?.linkedPlanId===p.id?' selected':''}>${escHtml(p.title)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('ui_participantsCsv')}</label>
            <textarea id="exParticipants" class="form-input" rows="2" placeholder="${t('bcm_participantsPh')}">${escHtml((item?.participants||[]).join(', '))}</textarea>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-note-pencil"></i> ${t('bcm_resultsFollowup')}</h4>
          <div class="form-group">
            <label class="form-label">${t('bcm_findings')}</label>
            <textarea id="exFindings" class="form-input" rows="4" placeholder="${t('bcm_findingsPh')}">${escHtml(item?.findings||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">${t('ui_actions')}</label>
            <textarea id="exActions" class="form-input" rows="3" placeholder="${t('bcm_actionsPh')}">${escHtml(item?.actions||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">${t('bcm_nextExercise')}</label>
            <input id="exNext" type="date" class="form-input" value="${item?.nextExercise||''}" style="color-scheme:dark">
          </div>
          ${renderLinksBlock('ex', item?.linkedControls||[], item?.linkedPolicies||[])}
        </div>
      </div>
      ${id ? `<div style="padding:0 24px 16px"><div class="gov-section-title">${t('ui_docsAttachments')}</div>
        <div id="bcmExerciseAttachPanel"></div></div>` : ''}
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchBcmTab('exercises')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveExercise('${id||''}')">
          <i class="ph ph-floppy-disk"></i> ${t('ui_save')}
        </button>
      </div>
    </div>
  `
  initLinkPickers('ex')
  if (id) {
    const canEdit = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK.editor
    renderDocAttachPanel('bcmExerciseAttachPanel', '/bcm', 'exercises', id, item?.attachments || [], canEdit)
  }
}

async function saveExercise(id) {
  const splitList = v => (v||'').split(',').map(s=>s.trim()).filter(Boolean)
  const payload = {
    title:        dom('exTitle')?.value?.trim()   || '',
    type:         dom('exType')?.value            || 'tabletop',
    date:         dom('exDate')?.value            || '',
    conductor:    dom('exConductor')?.value?.trim()|| '',
    participants: splitList(dom('exParticipants')?.value),
    linkedPlanId: dom('exPlan')?.value            || '',
    result:       dom('exResult')?.value          || 'planned',
    findings:     dom('exFindings')?.value        || '',
    actions:      dom('exActions')?.value         || '',
    nextExercise:   dom('exNext')?.value            || '',
    linkedControls: getLinkedValues('ex', 'ctrl'),
    linkedPolicies: getLinkedValues('ex', 'pol'),
  }
  if (!payload.title) { alert('Title is required'); return }
  const url    = id ? `/bcm/exercises/${id}` : '/bcm/exercises'
  const method = id ? 'PUT' : 'POST'
  const res    = await fetch(url, { method, headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error saving'); return }
  switchBcmTab('exercises')
}

async function deleteExercise(id) {
  if (!confirm('Delete exercise?')) return
  const res = await fetch(`/bcm/exercises/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json().catch(()=>({})); alert(e.error || 'Error'); return }
  switchBcmTab('exercises')
}

// ════════════════════════════════════════════════════════════
// LIEFERKETTENMANAGEMENT – Supply Chain Management
// ════════════════════════════════════════════════════════════

let _suppliersTab = 'list'

const SUP_TYPE_LABELS = {
  get software()   { return t('supl_typeSoftware') },
  get hardware()   { return t('supl_typeHardware') },
  get service()    { return t('supl_typeService') },
  get cloud()      { return t('supl_typeCloud') },
  get consulting() { return t('supl_typeConsulting') },
  get other()      { return t('supl_typeOther') },
}
const SUP_CRIT_LABELS = { get critical() { return t('supl_critCritical') }, get high() { return t('supl_critHigh') }, get medium() { return t('supl_critMedium') }, get low() { return t('supl_critLow') } }
const SUP_STATUS_LABELS = {
  get active()       { return t('supl_statActive') },
  get under_review() { return t('bcml_statInReview') },
  get inactive()     { return t('supl_statInactive') },
  get terminated()   { return t('supl_statTerminated') },
}
const SUP_AUDIT_LABELS = {
  get passed()        { return t('supl_audPassed') },
  get failed()        { return t('supl_audFailed') },
  get pending()       { return t('supl_audPending') },
  get not_scheduled() { return t('supl_audNotSched') },
}

function _supplierCritColor(c) {
  const map = { critical: 'var(--color-R400,#de350b)', high: 'var(--color-O400,#f18d13)', medium: 'var(--color-Y400,#f0b429)', low: 'var(--color-G400,#4ade80)' }
  return map[c] || 'var(--text-subtle)'
}

function supCritBadge(v) {
  return `<span style="display:inline-block;padding:2px 7px;border-radius:3px;font-size:.75rem;font-weight:700;background:${_supplierCritColor(v)}22;color:${_supplierCritColor(v)};border:1px solid ${_supplierCritColor(v)}44">${SUP_CRIT_LABELS[v] || v}</span>`
}
function supStatusBadge(v) {
  const cls = { active: 'var(--success-text,#4ade80)', under_review: 'var(--warning-text,#f0b429)', inactive: 'var(--text-subtle)', terminated: 'var(--danger-text,#f87171)' }
  return `<span style="display:inline-block;padding:2px 7px;border-radius:3px;font-size:.75rem;font-weight:600;color:${cls[v]||'var(--text-subtle)'};">${SUP_STATUS_LABELS[v] || v}</span>`
}

// ── Lieferanten-Schnelltriage (#63) ──
const SUP_TRIAGE_LEVEL_LABELS = {
  get low()        { return t('supl_triageLevelLow') },
  get medium()     { return t('supl_triageLevelMedium') },
  get high()       { return t('supl_triageLevelHigh') },
  get unassessed() { return t('supl_triageLevelUnassessed') },
}
const SUP_TRIAGE_PII_LABELS = {
  get none()     { return t('supl_triagePiiNone') },
  get personal() { return t('supl_triagePiiPersonal') },
  get special()  { return t('supl_triagePiiSpecial') },
}
const SUP_TRIAGE_SOC2_LABELS = {
  get in_place()     { return t('supl_triageSoc2InPlace') },
  get na()           { return t('supl_triageSoc2Na') },
  get partial()      { return t('supl_triageSoc2Partial') },
  get not_available(){ return t('supl_triageSoc2NotAvail') },
}
const SUP_TRIAGE_ISO_LABELS = {
  get in_place() { return t('supl_triageIsoInPlace') },
  get partial()  { return t('supl_triageIsoPartial') },
  get none()     { return t('supl_triageIsoNone') },
}

function _supplierTriageColor(level) {
  const map = { high: 'var(--color-R400,#de350b)', medium: 'var(--color-Y400,#f0b429)', low: 'var(--color-G400,#4ade80)', unassessed: 'var(--text-subtle)' }
  return map[level] || 'var(--text-subtle)'
}
function supTriageBadge(triageResult) {
  const level = triageResult?.level || 'unassessed'
  const color = _supplierTriageColor(level)
  return `<span style="display:inline-block;padding:2px 7px;border-radius:3px;font-size:.75rem;font-weight:700;background:${color}22;color:${color};border:1px solid ${color}44">${SUP_TRIAGE_LEVEL_LABELS[level] || level}</span>`
}
function _triageSelectOptions(labels, current) {
  return `<option value="">${t('supl_triageNotAnswered')}</option>` +
    Object.entries(labels).map(([v, l]) => `<option value="${v}"${current === v ? ' selected' : ''}>${l}</option>`).join('')
}

async function renderSuppliers() {
  const existing = document.getElementById('suppliersContainer')
  if (existing) existing.remove()

  const container = document.createElement('div')
  container.id = 'suppliersContainer'
  container.className = 'training-container'
  document.querySelector('.editor').appendChild(container)

  const rank    = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.editor
  const isAdmin = rank >= ROLE_RANK.admin

  const tabs = [
    { id: 'list',      get label() { return t('suppliers_tabList') }, icon: 'ph-list-bullets' },
    { id: 'critical',  label: 'Critical',           icon: 'ph-warning-octagon' },
    { id: 'dataaccess',get label() { return t('suppliers_tabData') }, icon: 'ph-database' },
  ]

  container.innerHTML = `
    <div class="training-header">
      <h2 class="training-title"><i class="ph ph-truck"></i> ${t('suppliers_title')}</h2>
      <p class="training-subtitle" style="color:var(--text-subtle);font-size:.85rem;margin:4px 0 0">
        Supplier Register · Risk Assessment · Audit Tracking | ISO 27001 A.5.21–22, NIS2 Art. 21
      </p>
    </div>
    <div id="suppliersKpiBar" style="display:flex;gap:10px;flex-wrap:wrap;margin:0 0 16px"></div>
    <div class="training-tab-bar">
      ${tabs.map(t => `<button class="training-tab${t.id===_suppliersTab?' active':''}" data-tab="${t.id}">
        <i class="ph ${t.icon}"></i> ${t.label}
      </button>`).join('')}
    </div>
    <div id="suppliersTabContent" class="training-tab-content"></div>
  `

  // Load KPI bar
  try {
    const sumRes = await fetch('/suppliers/summary', { headers: apiHeaders() })
    if (sumRes.ok) {
      const s = await sumRes.json()
      const kpiBar = document.getElementById('suppliersKpiBar')
      if (kpiBar) {
        kpiBar.innerHTML = [
          { label: 'Total',            value: s.total,          color: 'var(--text-primary)' },
          { label: 'Critical',         value: s.critical,       color: 'var(--color-R400,#de350b)' },
          { label: 'Overdue Audits',   value: s.overdueAudits,  color: s.overdueAudits > 0 ? 'var(--color-R400,#f87171)' : 'var(--success-text)' },
          { label: 'With Data Access', value: s.withDataAccess, color: 'var(--warning-text,#f0b429)' },
        ].map(k => `
          <div class="dash-card kpi" style="flex:1;min-width:120px;padding:12px 16px;text-align:center">
            <div style="font-size:1.5rem;font-weight:700;color:${k.color}">${k.value}</div>
            <div style="font-size:.75rem;color:var(--text-subtle)">${k.label}</div>
          </div>
        `).join('')
      }
    }
  } catch {}

  container.querySelectorAll('.training-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _suppliersTab = btn.dataset.tab
      container.querySelectorAll('.training-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === _suppliersTab))
      switchSuppliersTab(_suppliersTab)
    })
  })

  switchSuppliersTab(_suppliersTab)
}

async function switchSuppliersTab(tab) {
  _suppliersTab = tab
  const el = dom('suppliersTabContent')
  if (!el) return
  el.innerHTML = `<p class="report-loading">${t('ui_loading')}</p>`

  const res = await fetch('/suppliers', { headers: apiHeaders() })
  const list = res.ok ? await res.json() : []

  const rank    = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.editor
  const isAdmin = rank >= ROLE_RANK.admin
  const today   = new Date().toISOString().slice(0, 10)

  let filtered = list
  if (tab === 'critical')   filtered = list.filter(s => s.criticality === 'critical' || s.criticality === 'high')
  if (tab === 'dataaccess') filtered = list.filter(s => s.dataAccess)

  let filterType = '', filterCrit = '', filterStatus = '', filterTriage = ''

  function renderTable() {
    let rows = filtered.filter(s => {
      if (filterType   && s.type        !== filterType)   return false
      if (filterCrit   && s.criticality !== filterCrit)   return false
      if (filterStatus && s.status      !== filterStatus) return false
      if (filterTriage && (s.triageResult?.level || 'unassessed') !== filterTriage) return false
      return true
    })
    return `
      <table class="bcm-table">
        <thead><tr>
          <th>Name</th><th>Type</th><th>Criticality</th><th>Status</th>
          <th>${t('supl_triage')}</th>
          <th>Country</th><th>Next Audit</th><th>Audit Result</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${rows.length ? rows.map(s => {
            const overdue = s.nextAuditDate && s.nextAuditDate < today
            return `<tr class="${overdue ? 'overdue' : ''}">
              <td>
                <strong>${escHtml(s.name)}</strong>
                ${s.dataAccess ? '<br><small style="color:var(--warning-text)"><i class="ph ph-database"></i> Data Access</small>' : ''}
              </td>
              <td>${escHtml(SUP_TYPE_LABELS[s.type] || s.type)}</td>
              <td>${supCritBadge(s.criticality)}</td>
              <td>${supStatusBadge(s.status)}</td>
              <td>${supTriageBadge(s.triageResult)}</td>
              <td>${escHtml(s.country || '—')}</td>
              <td class="${overdue ? 'bcm-overdue' : ''}">${s.nextAuditDate || '—'}${overdue ? ' <i class="ph ph-warning-circle" title="Overdue!"></i>' : ''}</td>
              <td>${escHtml(SUP_AUDIT_LABELS[s.auditResult] || s.auditResult || '—')}</td>
              <td style="white-space:nowrap">
                <button class="btn btn-secondary btn-xs" title="Self-Assessments" onclick="openSupplierAssessments('${s.id}')"><i class="ph ph-clipboard-text"></i></button>
                ${canEdit ? `<button class="btn btn-secondary btn-xs" onclick="openSupplierForm('${s.id}')"><i class="ph ph-pencil"></i></button>` : ''}
                ${isAdmin ? `<button class="btn btn-danger btn-xs" onclick="deleteSupplier('${s.id}')"><i class="ph ph-trash"></i></button>` : ''}
              </td>
            </tr>`
          }).join('') : `<tr><td colspan="9" class="dash-empty">No suppliers found</td></tr>`}
        </tbody>
      </table>
    `
  }

  el.innerHTML = `
    <div class="bcm-filter-bar">
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openSupplierForm()"><i class="ph ph-plus"></i> New Supplier</button>` : ''}
      <select id="supFilterType" class="select" style="max-width:160px">
        <option value="">All Types</option>
        ${Object.entries(SUP_TYPE_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
      </select>
      <select id="supFilterCrit" class="select" style="max-width:160px">
        <option value="">${t('assets_allCrit')}</option>
        ${Object.entries(SUP_CRIT_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
      </select>
      <select id="supFilterStatus" class="select" style="max-width:160px">
        <option value="">${t('filter_allStatuses')}</option>
        ${Object.entries(SUP_STATUS_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
      </select>
      <select id="supFilterTriage" class="select" style="max-width:180px">
        <option value="">${t('supl_triageAllLevels')}</option>
        ${Object.entries(SUP_TRIAGE_LEVEL_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
      </select>
    </div>
    <div id="suppliersTable">${renderTable()}</div>
  `

  el.querySelector('#supFilterType')?.addEventListener('change', e => {
    filterType = e.target.value
    el.querySelector('#suppliersTable').innerHTML = renderTable()
  })
  el.querySelector('#supFilterCrit')?.addEventListener('change', e => {
    filterCrit = e.target.value
    el.querySelector('#suppliersTable').innerHTML = renderTable()
  })
  el.querySelector('#supFilterStatus')?.addEventListener('change', e => {
    filterStatus = e.target.value
    el.querySelector('#suppliersTable').innerHTML = renderTable()
  })
  el.querySelector('#supFilterTriage')?.addEventListener('change', e => {
    filterTriage = e.target.value
    el.querySelector('#suppliersTable').innerHTML = renderTable()
  })
}

async function openSupplierForm(id = null) {
  const isEdit = !!id
  let item = null
  if (isEdit) {
    const r = await fetch(`/suppliers/${id}`, { headers: apiHeaders() })
    if (r.ok) item = await r.json()
  }
  const el = dom('suppliersTabContent')
  if (!el) return

  const ouOptsSup = await getOrgUnitOptions(item?.orgUnitId || '')

  document.querySelectorAll('.training-tab').forEach(b => b.classList.remove('active'))

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchSuppliersTab('${_suppliersTab}')">
          <i class="ph ph-arrow-left"></i> ${t('sup_backToList')}
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-truck"></i>
          ${isEdit ? t('sup_editSupplier') : t('sup_newSupplier')}
        </h3>
      </div>
      <div class="training-form-body">

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-buildings"></i> ${t('sup_masterData')}</h4>
          <div class="form-group">
            <label class="form-label">${t('ui_name')} <span class="form-required">*</span></label>
            <input id="supName" class="form-input" value="${escHtml(item?.name || '')}" placeholder="${t('sup_companyNamePh')}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('col_type')}</label>
              <select id="supType" class="select">
                ${Object.entries(SUP_TYPE_LABELS).map(([v, l]) => `<option value="${v}"${item?.type === v ? ' selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('assets_criticality')}</label>
              <select id="supCrit" class="select">
                ${Object.entries(SUP_CRIT_LABELS).map(([v, l]) => `<option value="${v}"${item?.criticality === v ? ' selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('col_status')}</label>
              <select id="supStatus" class="select">
                ${Object.entries(SUP_STATUS_LABELS).map(([v, l]) => `<option value="${v}"${item?.status === v ? ' selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('sup_countryIso')}</label>
              <input id="supCountry" class="form-input" value="${escHtml(item?.country || '')}" placeholder="${t('sup_countryPh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('ui_website')}</label>
              <input id="supWebsite" class="form-input" value="${escHtml(item?.website || '')}" placeholder="${t('ui_urlPh')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('sup_contactPerson')}</label>
              <input id="supContactName" class="form-input" value="${escHtml(item?.contactName || '')}" placeholder="${t('ui_namePh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('sup_contactEmail')}</label>
              <input id="supContactEmail" class="form-input" type="email" value="${escHtml(item?.contactEmail || '')}" placeholder="${t('sup_contactEmailPh')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('sup_internalOrgUnit')}</label>
              <select id="supOrgUnit" class="select">${ouOptsSup}</select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('sup_productsServices')}</label>
            <textarea id="supProducts" class="form-input" rows="2" placeholder="${t('sup_productsPh')}">${escHtml(item?.products || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">${t('ui_description')}</label>
            <textarea id="supDescription" class="form-input" rows="2" placeholder="${t('sup_descriptionPh')}">${escHtml(item?.description || '')}</textarea>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-database"></i> ${t('sup_dataAccessPrivacy')}</h4>
          <div class="form-group" style="display:flex;align-items:center;gap:10px">
            <label class="module-toggle">
              <input type="checkbox" id="supDataAccess" ${item?.dataAccess ? 'checked' : ''}>
              <span class="module-toggle-slider"></span>
            </label>
            <span>${t('sup_hasDataAccess')}</span>
          </div>
          <div class="form-group">
            <label class="form-label">${t('sup_dataCategoriesCsv')}</label>
            <textarea id="supDataCategories" class="form-input" rows="2" placeholder="${t('sup_dataCategoriesPh')}">${escHtml((item?.dataCategories || []).join(', '))}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('sup_contractId')}</label>
              <input id="supContractId" class="form-input" value="${escHtml(item?.contractId || '')}" placeholder="${t('sup_contractIdPh')}">
            </div>
            <div class="form-group">
              <label class="form-label">${t('sup_dpaContractId')}</label>
              <input id="supAvContractId" class="form-input" value="${escHtml(item?.avContractId || '')}" placeholder="${t('sup_dpaContractIdPh')}">
            </div>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-clipboard-text"></i> ${t('sup_auditRisk')}</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('sup_lastAudit')}</label>
              <input id="supLastAudit" type="date" class="form-input" value="${item?.lastAuditDate || ''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">${t('sup_nextAudit')}</label>
              <input id="supNextAudit" type="date" class="form-input" value="${item?.nextAuditDate || ''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">${t('sup_auditResult')}</label>
              <select id="supAuditResult" class="select">
                ${Object.entries(SUP_AUDIT_LABELS).map(([v, l]) => `<option value="${v}"${item?.auditResult === v ? ' selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('sup_riskScore')}</label>
            <input id="supRiskScore" type="number" min="0" max="25" class="form-input" value="${item?.riskScore ?? 0}" style="max-width:120px">
          </div>
          <div class="form-group">
            <label class="form-label">${t('sup_secReqsCsv')}</label>
            <textarea id="supSecReqs" class="form-input" rows="2" placeholder="${t('sup_secReqsPh')}">${escHtml((item?.securityRequirements || []).join(', '))}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">${t('ui_notes')}</label>
            <textarea id="supNotes" class="form-input" rows="3" placeholder="${t('sup_notesPh')}">${escHtml(item?.notes || '')}</textarea>
          </div>
          ${renderLinksBlock('sup', item?.linkedControls || [], item?.linkedPolicies || [])}
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-gauge"></i> ${t('supl_triageSection')} ${supTriageBadge(item?.triageResult)}</h4>
          <p style="font-size:.82rem;color:var(--text-subtle);margin:0 0 12px">${t('supl_triageDesc')}</p>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">${t('supl_triagePii')}</label>
              <select id="supTriagePii" class="select">${_triageSelectOptions(SUP_TRIAGE_PII_LABELS, item?.triage?.pii?.processes || '')}</select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('supl_triageSoc2')}</label>
              <select id="supTriageSoc2" class="select">${_triageSelectOptions(SUP_TRIAGE_SOC2_LABELS, item?.triage?.soc2?.status || '')}</select>
            </div>
            <div class="form-group">
              <label class="form-label">${t('supl_triageIso27001')}</label>
              <select id="supTriageIso" class="select">${_triageSelectOptions(SUP_TRIAGE_ISO_LABELS, item?.triage?.iso27001?.status || '')}</select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t('supl_triageNotes')}</label>
            <textarea id="supTriageNotes" class="form-input" rows="2">${escHtml(item?.triage?.notes || '')}</textarea>
          </div>
        </div>

      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchSuppliersTab('${_suppliersTab}')">${t('ui_cancel')}</button>
        <button class="btn btn-primary" onclick="saveSupplier('${id || ''}')">
          <i class="ph ph-floppy-disk"></i> ${t('ui_save')}
        </button>
      </div>
    </div>
  `
  initLinkPickers('sup')
}

async function saveSupplier(id) {
  const splitList = v => (v || '').split(',').map(s => s.trim()).filter(Boolean)
  const payload = {
    name:                 dom('supName')?.value?.trim()          || '',
    type:                 dom('supType')?.value                  || 'other',
    criticality:          dom('supCrit')?.value                  || 'medium',
    status:               dom('supStatus')?.value                || 'active',
    country:              dom('supCountry')?.value?.trim()       || '',
    website:              dom('supWebsite')?.value?.trim()       || '',
    contactName:          dom('supContactName')?.value?.trim()   || '',
    contactEmail:         dom('supContactEmail')?.value?.trim()  || '',
    orgUnitId:            dom('supOrgUnit')?.value               || null,
    products:             dom('supProducts')?.value              || '',
    description:          dom('supDescription')?.value           || '',
    dataAccess:           !!dom('supDataAccess')?.checked,
    dataCategories:       splitList(dom('supDataCategories')?.value),
    contractId:           dom('supContractId')?.value?.trim()    || '',
    avContractId:         dom('supAvContractId')?.value?.trim()  || '',
    lastAuditDate:        dom('supLastAudit')?.value             || '',
    nextAuditDate:        dom('supNextAudit')?.value             || '',
    auditResult:          dom('supAuditResult')?.value           || 'not_scheduled',
    riskScore:            parseInt(dom('supRiskScore')?.value)   || 0,
    securityRequirements: splitList(dom('supSecReqs')?.value),
    notes:                dom('supNotes')?.value                 || '',
    linkedControls:       getLinkedValues('sup', 'ctrl'),
    linkedPolicies:       getLinkedValues('sup', 'pol'),
    triage: {
      pii:      { processes: dom('supTriagePii')?.value || '' },
      soc2:     { status: dom('supTriageSoc2')?.value || '' },
      iso27001: { status: dom('supTriageIso')?.value || '' },
      notes:      dom('supTriageNotes')?.value || '',
      assessedAt: new Date().toISOString(),
      assessedBy: getCurrentUser(),
    },
  }
  if (!payload.name) { alert('Name is required'); return }
  const url    = id ? `/suppliers/${id}` : '/suppliers'
  const method = id ? 'PUT' : 'POST'
  const res    = await fetch(url, { method, headers: { ...apiHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Error saving'); return }
  renderSuppliers()
}

async function deleteSupplier(id) {
  if (!confirm('Move supplier to trash?')) return
  const res = await fetch(`/suppliers/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Error'); return }
  renderSuppliers()
}

// ════════════════════════════════════════════════════════════
// SUPPLIER SELF-ASSESSMENTS
// ════════════════════════════════════════════════════════════

// Supplier-Name per API laden — nie per onclick-Parameter übertragen
async function _getSupplierName(supplierId) {
  try {
    const r = await fetch(`/suppliers/${supplierId}`, { headers: apiHeaders() })
    if (r.ok) return (await r.json()).name || supplierId
  } catch {}
  return supplierId
}

function _assessmentAnswersTable(a) {
  return a.questions.map(section => {
    const qHtml = section.questions.map(q => {
      const ans = (a.answers || []).find(x => x.id === q.id)
      const val = ans?.value || '—'
      const display = q.type === 'yesno'
        ? (val === 'yes' ? `✓ ${t('yes')}` : val === 'no' ? `✗ ${t('no')}` : '—')
        : escHtml(val)
      const color = q.type === 'yesno' ? (val === 'yes' ? 'var(--success-text)' : val === 'no' ? 'var(--danger-text)' : '') : ''
      return `<tr><td style="width:65%">${escHtml(q.text)}</td><td style="font-weight:600;color:${color}">${display}</td></tr>`
    }).join('')
    return `<tr><td colspan="2" style="background:var(--bg-subtle,#f4f5f7);font-weight:700;padding:8px 12px">${escHtml(section.section)}</td></tr>${qHtml}`
  }).join('')
}

async function openSupplierAssessments(supplierId) {
  const el = dom('suppliersTabContent')
  if (!el) return
  const rank    = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.editor
  const isAdmin = rank >= ROLE_RANK.admin

  el.innerHTML = `<p class="report-loading">${t('ui_loading')}</p>`

  const [supplierName, listRes] = await Promise.all([
    _getSupplierName(supplierId),
    fetch(`/assessments?supplierId=${encodeURIComponent(supplierId)}`, { headers: apiHeaders() }),
  ])
  const list = listRes.ok ? await listRes.json() : []

  const STATUS_BADGE = {
    pending:   `<span class="badge badge-warn">${t('sup_statPending')}</span>`,
    submitted: `<span class="badge badge-info">${t('sup_statSubmitted')}</span>`,
    reviewed:  `<span class="badge badge-success">${t('sup_statReviewed')}</span>`,
    accepted:  `<span class="badge badge-success">${t('sup_statAccepted')}</span>`,
    rejected:  `<span class="badge badge-danger">${t('sup_statRejected')}</span>`,
  }

  const LANG_FLAG = { de: '🇩🇪', en: '🇬🇧', fr: '🇫🇷', nl: '🇳🇱' }

  const rows = list.map(a => {
    const scoreHtml = a.score !== null
      ? `<span style="font-weight:700;color:${a.score>=70?'var(--success-text)':a.score>=40?'var(--warning-text)':'var(--danger-text)'}">${a.score}%</span>`
      : '—'
    const langFlag = LANG_FLAG[a.language] || ''
    return `<tr>
      <td>${langFlag} ${escHtml(a.title)}</td>
      <td>${STATUS_BADGE[a.status] || escHtml(a.status)}</td>
      <td>${scoreHtml}</td>
      <td>${a.dueDate || '—'}</td>
      <td>${a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('de-DE') : '—'}</td>
      <td style="white-space:nowrap">
        ${a.status === 'pending' ? `<button class="btn btn-secondary btn-xs" title="${escHtml(t('sup_copyLink'))}" data-token="${a.token}" onclick="copyAssessmentLink(this)"><i class="ph ph-link"></i></button>` : ''}
        ${(canEdit && a.status === 'submitted') ? `<button class="btn btn-primary btn-xs" onclick="openAssessmentReview('${a.id}')"><i class="ph ph-check-circle"></i> ${t('ui_review')}</button>` : ''}
        ${(canEdit && a.status !== 'pending') ? `<button class="btn btn-secondary btn-xs" onclick="openAssessmentDetail('${a.id}')"><i class="ph ph-eye"></i></button>` : ''}
        ${isAdmin ? `<button class="btn btn-danger btn-xs" onclick="deleteAssessment('${a.id}', '${supplierId}')"><i class="ph ph-trash"></i></button>` : ''}
      </td>
    </tr>`
  }).join('')

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchSuppliersTab('list')">
          <i class="ph ph-arrow-left"></i> ${t('ui_back')}
        </button>
        <h3 style="margin:0">${t('sup_selfAssessments')}: ${escHtml(supplierName)}</h3>
        ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openCreateAssessment('${supplierId}')">
          <i class="ph ph-plus"></i> ${t('sup_newAssessmentLink')}
        </button>` : ''}
      </div>

      ${list.length ? `
        <table class="bcm-table" style="margin-top:16px">
          <thead><tr>
            <th>${t('ui_title')}</th><th>${t('col_status')}</th><th>${t('ui_score')}</th><th>${t('ui_dueDate')}</th><th>${t('ui_submittedOn')}</th><th>${t('ui_actions')}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      ` : `<p class="dash-empty" style="margin-top:24px">${t('sup_noAssessments')}</p>`}
    </div>`
}

async function openCreateAssessment(supplierId) {
  const el = dom('suppliersTabContent')
  if (!el) return
  const supplierName = await _getSupplierName(supplierId)

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="openSupplierAssessments('${supplierId}')">
          <i class="ph ph-arrow-left"></i> ${t('ui_back')}
        </button>
        <h3 style="margin:0">${t('sup_newAssessmentLinkTitle', { supplier: escHtml(supplierName) })}</h3>
      </div>
      <div class="form-grid" style="margin-top:20px;max-width:600px">
        <label class="form-label">${t('sup_language')}</label>
        <select id="assLanguage" class="form-select" onchange="updateAssTitle(this)">
          <option value="de">🇩🇪 Deutsch</option>
          <option value="en">🇬🇧 English</option>
          <option value="fr">🇫🇷 Français</option>
          <option value="nl">🇳🇱 Nederlands</option>
        </select>

        <label class="form-label">${t('col_title')}</label>
        <input id="assTitle" class="form-input" value="Lieferanten-Selbstauskunft" />

        <label class="form-label">${t('sup_dueDateOptional')}</label>
        <input id="assDueDate" type="date" class="form-input" />

        <label class="form-label">${t('sup_noteToSupplier')}</label>
        <textarea id="assNote" class="form-textarea" rows="2" placeholder="Bitte bis zum Fälligkeitsdatum ausfüllen."></textarea>

        <div style="display:flex;gap:10px;margin-top:8px">
          <button class="btn btn-primary" onclick="createAssessment('${supplierId}')">
            <i class="ph ph-link"></i> ${t('sup_generateLink')}
          </button>
          <button class="btn btn-secondary" onclick="openSupplierAssessments('${supplierId}')">${t('ui_cancel')}</button>
        </div>
      </div>
    </div>`
}

const ASS_DEFAULT_TITLES = { de: 'Lieferanten-Selbstauskunft', en: 'Supplier Self-Assessment', fr: 'Auto-évaluation fournisseur', nl: 'Leveranciers zelfevaluatie' }

function updateAssTitle(sel) {
  const t = dom('assTitle')
  if (!t) return
  const current = t.value.trim()
  const wasDefault = Object.values(ASS_DEFAULT_TITLES).includes(current) || current === ''
  if (wasDefault) t.value = ASS_DEFAULT_TITLES[sel.value] || current
}

async function createAssessment(supplierId) {
  const lang = dom('assLanguage')?.value || 'de'
  const payload = {
    supplierId,
    language: lang,
    title:   dom('assTitle')?.value?.trim()   || ASS_DEFAULT_TITLES[lang],
    dueDate: dom('assDueDate')?.value         || '',
    note:    dom('assNote')?.value?.trim()    || '',
  }
  const res = await fetch('/assessments', {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Error'); return }
  const a    = await res.json()
  const link = `${location.origin}/supplier-assessment/${a.token}`
  const el   = dom('suppliersTabContent')
  if (!el) return
  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <h3 style="margin:0"><i class="ph ph-check-circle" style="color:var(--success-text)"></i> ${t('sup_linkGenerated')}</h3>
      </div>
      <div class="dash-card" style="margin-top:20px;max-width:700px;padding:24px">
        <p style="margin:0 0 8px;font-weight:600">${t('sup_assessmentLinkFor', { supplier: escHtml(a.supplierName) })}</p>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" class="form-input" id="assessLinkInput" value="${escHtml(link)}" readonly style="font-family:monospace;font-size:13px;flex:1" />
          <button class="btn btn-primary" data-token="${a.token}" onclick="copyAssessmentLink(this)">
            <i class="ph ph-copy"></i> ${t('sup_copyLink')}
          </button>
        </div>
        <p style="margin:12px 0 0;color:var(--text-subtle);font-size:13px">
          ${t('sup_linkHint')}
        </p>
      </div>
      <div style="margin-top:16px;display:flex;gap:10px">
        <button class="btn btn-secondary" onclick="openSupplierAssessments('${supplierId}')">
          <i class="ph ph-arrow-left"></i> ${t('sup_backToAssessments')}
        </button>
      </div>
    </div>`
}

function copyAssessmentLink(btn) {
  const token = btn.dataset.token
  const link  = `${location.origin}/supplier-assessment/${token}`
  navigator.clipboard.writeText(link).then(() => {
    const old = btn.innerHTML
    btn.innerHTML = `<i class="ph ph-check"></i> ${t('sup_copied')}`
    setTimeout(() => { btn.innerHTML = old }, 2000)
  }).catch(() => { prompt('Copy link:', link) })
}

async function openAssessmentDetail(id) {
  const el = dom('suppliersTabContent')
  if (!el) return
  const res = await fetch(`/assessments/${id}`, { headers: apiHeaders() })
  if (!res.ok) { alert('Not found'); return }
  const a = await res.json()
  const scoreColor = a.score >= 70 ? 'var(--success-text)' : a.score >= 40 ? 'var(--warning-text)' : 'var(--danger-text)'

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="openSupplierAssessments('${a.supplierId}')">
          <i class="ph ph-arrow-left"></i> ${t('ui_back')}
        </button>
        <h3 style="margin:0">${escHtml(a.title)} — ${escHtml(a.supplierName)}</h3>
        ${a.score !== null ? `<span style="font-size:1.4rem;font-weight:700;color:${scoreColor}">${a.score}%</span>` : ''}
      </div>
      ${a.reviewNote ? `<div class="dash-card" style="margin:12px 0;padding:14px 18px;border-left:4px solid var(--color-B300,#0052cc)">
        <strong>${t('sup_reviewNote')}:</strong> ${escHtml(a.reviewNote)}
        ${a.reviewedBy ? `<span style="color:var(--text-subtle);font-size:12px;margin-left:8px">— ${escHtml(a.reviewedBy)}, ${new Date(a.reviewedAt).toLocaleDateString('de-DE')}</span>` : ''}
      </div>` : ''}
      <table class="bcm-table" style="margin-top:12px">
        <thead><tr><th>${t('sup_questionCol')}</th><th>${t('sup_answerCol')}</th></tr></thead>
        <tbody>${_assessmentAnswersTable(a)}</tbody>
      </table>
    </div>`
}

async function openAssessmentReview(id) {
  const el = dom('suppliersTabContent')
  if (!el) return
  const res = await fetch(`/assessments/${id}`, { headers: apiHeaders() })
  if (!res.ok) { alert('Not found'); return }
  const a = await res.json()
  const scoreColor = a.score >= 70 ? 'var(--success-text)' : a.score >= 40 ? 'var(--warning-text)' : 'var(--danger-text)'

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="openSupplierAssessments('${a.supplierId}')">
          <i class="ph ph-arrow-left"></i> ${t('ui_back')}
        </button>
        <h3 style="margin:0">${t('sup_reviewTitle', { title: escHtml(a.title), supplier: escHtml(a.supplierName) })}</h3>
        ${a.score !== null ? `<span style="font-size:1.4rem;font-weight:700;color:${scoreColor}">${t('ui_score')}: ${a.score}%</span>` : ''}
      </div>
      <table class="bcm-table" style="margin:12px 0 20px">
        <thead><tr><th>${t('sup_questionCol')}</th><th>${t('sup_answerCol')}</th></tr></thead>
        <tbody>${_assessmentAnswersTable(a)}</tbody>
      </table>
      <div class="form-grid" style="max-width:600px">
        <label class="form-label">${t('sup_reviewNote')}</label>
        <textarea id="assReviewNote" class="form-textarea" rows="3" placeholder="${t('sup_reviewNotePh')}"></textarea>
        <label class="form-label">${t('col_status')}</label>
        <select id="assReviewStatus" class="form-select">
          <option value="reviewed">${t('sup_statReviewed')}</option>
          <option value="accepted">${t('sup_statAccepted')}</option>
          <option value="rejected">${t('sup_statRejected')}</option>
        </select>
        <div style="display:flex;gap:10px;margin-top:8px">
          <button class="btn btn-primary" onclick="submitAssessmentReview('${id}', '${a.supplierId}')">
            <i class="ph ph-check"></i> ${t('sup_saveReview')}
          </button>
          <button class="btn btn-secondary" onclick="openSupplierAssessments('${a.supplierId}')">${t('ui_cancel')}</button>
        </div>
      </div>
    </div>`
}

async function submitAssessmentReview(id, supplierId) {
  const payload = {
    reviewNote: dom('assReviewNote')?.value?.trim() || '',
    status:     dom('assReviewStatus')?.value       || 'reviewed',
  }
  const res = await fetch(`/assessments/${id}/review`, {
    method: 'PUT',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Error'); return }
  openSupplierAssessments(supplierId)
}

async function deleteAssessment(id, supplierId) {
  if (!confirm('Delete this assessment permanently?')) return
  const res = await fetch(`/assessments/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Error'); return }
  openSupplierAssessments(supplierId)
}

// ════════════════════════════════════════════════════════════
// POLICY ACKNOWLEDGEMENTS
// ════════════════════════════════════════════════════════════

let _ackTab = 'list'  // 'list' | 'new'

async function renderPolicyAcks() {
  const main = document.querySelector('main') || document.body
  let container = dom('policyAcksContainer')
  if (!container) {
    container = document.createElement('div')
    container.id = 'policyAcksContainer'
    container.className = 'training-container'
    main.appendChild(container)
  }

  // Modus aus Org-Settings laden
  let mode = 'manual'
  try {
    const cfg = await fetch('/admin/ack-settings', { headers: apiHeaders() }).then(r => r.json())
    mode = cfg.policyAckMode || 'manual'
  } catch {}

  const modeLabels = { email_campaign: t('ack_modeEmail'), manual: t('ack_modeManualShort'), distribution_only: t('ack_modeDistributionOnly') }
  const modeIcons  = { email_campaign: 'ph-envelope', manual: 'ph-pencil', distribution_only: 'ph-file-text' }

  container.innerHTML = `
    <div class="reports-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <h2 class="reports-title"><i class="ph ph-check-circle"></i> ${t('nav_policyAcks')}</h2>
      <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-muted)">
        <i class="ph ${modeIcons[mode]}"></i>
        ${t('ack_mode')}: <strong>${modeLabels[mode] || mode}</strong>
        ${getCurrentRole() === 'admin' ? `<button class="btn btn-secondary btn-sm" onclick="renderPolicyAckSettings()"><i class="ph ph-gear"></i> ${t('ack_changeMode')}</button>` : ''}
      </div>
    </div>
    <div class="training-tab-bar" style="margin-bottom:16px">
      <button class="training-tab${_ackTab==='list'?' active':''}" onclick="_ackTab='list';renderPolicyAcks()">
        <i class="ph ph-list-checks"></i> ${t('ack_distributions')}
      </button>
      <button class="training-tab${_ackTab==='new'?' active':''}" onclick="_ackTab='new';renderPolicyAcks()">
        <i class="ph ph-plus-circle"></i> ${t('ack_newDistribution')}
      </button>
    </div>
    <div id="policyAcksContent"></div>
  `

  const content = dom('policyAcksContent')
  if (_ackTab === 'new') {
    _renderNewDistributionForm(content, mode)
  } else {
    await _renderDistributionList(content, mode)
  }
}

async function _renderDistributionList(container, mode) {
  container.innerHTML = `<div class="loading-spinner" style="padding:40px;text-align:center"><i class="ph ph-spinner" style="font-size:32px;animation:spin 1s linear infinite"></i></div>`
  let dists = []
  try { dists = await fetch('/distributions', { headers: apiHeaders() }).then(r => r.json()) } catch {}

  if (!Array.isArray(dists) || dists.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="ph ph-check-circle" style="font-size:48px;color:var(--text-muted)"></i><p>${t('ack_noDistributions')}</p><button class="btn btn-primary" onclick="_ackTab='new';renderPolicyAcks()"><i class="ph ph-plus"></i> ${t('ack_createFirst')}</button></div>`
    return
  }

  const statusLabel  = { active: t('ack_statusActive'), completed: t('ack_statusCompleted'), expired: t('ack_statusExpired') }
  const statusColor  = { active: '#4ade80', completed: '#60a5fa', expired: '#f87171' }

  container.innerHTML = `
    <table class="data-table" style="width:100%">
      <thead><tr>
        <th>${t('ack_policy')}</th><th>${t('ack_targetGroup')}</th><th>${t('ack_deadline')}</th><th>${t('dash_progress')}</th><th>${t('col_status')}</th><th>${t('findings_created')}</th><th></th>
      </tr></thead>
      <tbody>
        ${dists.map(d => {
          const pct = d.stats.total > 0 ? Math.round(d.stats.confirmed / d.stats.total * 100) : (d.mode === 'distribution_only' ? 100 : 0)
          const progressHtml = d.mode === 'distribution_only'
            ? `<span style="color:var(--text-muted);font-size:12px">–</span>`
            : `<div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1;background:var(--bg-tertiary);border-radius:4px;height:8px;min-width:80px">
                  <div style="width:${pct}%;background:#4ade80;height:8px;border-radius:4px"></div>
                </div>
                <span style="font-size:12px;color:var(--text-muted)">${d.stats.confirmed}/${d.stats.total}</span>
              </div>`
          return `<tr>
            <td><strong>${escHtml(d.templateTitle)}</strong><br><span style="font-size:12px;color:var(--text-muted)">${escHtml(d.templateType)} · V${d.templateVersion}</span></td>
            <td>${escHtml(d.targetGroup || '–')}</td>
            <td>${d.dueDate ? new Date(d.dueDate).toLocaleDateString('de-DE') : '–'}</td>
            <td style="min-width:140px">${progressHtml}</td>
            <td><span class="status-badge" style="background:${statusColor[d.status]||'#666'}20;color:${statusColor[d.status]||'#666'};border:1px solid ${statusColor[d.status]||'#666'}40">${statusLabel[d.status]||d.status}</span></td>
            <td style="font-size:12px;color:var(--text-muted)">${new Date(d.createdAt).toLocaleDateString('de-DE')}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-secondary btn-sm" onclick="openDistributionDetail('${d.id}')"><i class="ph ph-eye"></i></button>
              ${d.mode === 'email_campaign' ? `<button class="btn btn-secondary btn-sm" title="${t('ack_sendReminder')}" onclick="sendAckReminder('${d.id}')"><i class="ph ph-envelope"></i></button>` : ''}
              <a href="/distributions/${d.id}/export/csv" class="btn btn-secondary btn-sm" title="CSV-Export"><i class="ph ph-download-simple"></i></a>
              ${getCurrentRole() === 'admin' ? `<button class="btn btn-danger btn-sm" onclick="deleteDistribution('${d.id}')"><i class="ph ph-trash"></i></button>` : ''}
            </td>
          </tr>`
        }).join('')}
      </tbody>
    </table>
  `
}

function _renderNewDistributionForm(container, mode) {
  const modeInfo = {
    email_campaign:    t('ack_modeEmailDesc'),
    manual:            t('ack_modeManualDesc'),
    distribution_only: t('ack_modeDistributionOnlyDesc'),
  }

  container.innerHTML = `
    <div class="training-form-page">
      <div class="form-section-header"><h3><i class="ph ph-plus-circle"></i> ${t('ack_newDistribution')}</h3></div>

      <div class="info-box" style="margin-bottom:20px">
        <i class="ph ph-info"></i> <strong>${t('ack_activeMode')}:</strong> ${modeInfo[mode] || mode}
      </div>

      <label class="form-label">${t('ack_policyApprovedOnly')} <span style="color:#f87171">*</span></label>
      <select id="ackTemplateId" class="select" style="margin-bottom:16px">
        <option value="">${t('loading')}</option>
      </select>

      <label class="form-label">${t('ack_targetGroupDescription')}</label>
      <input type="text" id="ackTargetGroup" class="form-input" placeholder="${t('ack_targetGroupPlaceholder')}" style="margin-bottom:16px"/>

      <label class="form-label">${t('ack_deadlineOptional')}</label>
      <input type="date" id="ackDueDate" class="form-input" style="margin-bottom:16px"/>

      ${mode === 'email_campaign' ? `
      <label class="form-label">${t('ack_emailAddresses')} <span style="color:var(--text-muted);font-weight:400">(${t('ack_emailHint')})</span></label>
      <textarea id="ackEmailList" class="form-textarea" rows="6" placeholder="alice@firma.de&#10;bob@firma.de&#10;carol@firma.de"></textarea>
      ` : ''}

      <label class="form-label">${t('ack_notes')}</label>
      <textarea id="ackNotes" class="form-textarea" rows="3" placeholder="${t('ack_notesPlaceholder')}" style="margin-bottom:20px"></textarea>

      <div style="display:flex;gap:12px">
        <button class="btn btn-primary" onclick="saveNewDistribution()">
          <i class="ph ph-paper-plane-tilt"></i> ${mode === 'email_campaign' ? t('ack_createAndPrepareEmails') : t('ack_createDistribution')}
        </button>
        <button class="btn btn-secondary" onclick="_ackTab='list';renderPolicyAcks()">${t('cancel')}</button>
      </div>
    </div>
  `

  // Approved templates laden
  fetch('/templates?status=approved', { headers: apiHeaders() })
    .then(r => r.json())
    .then(templates => {
      const sel = dom('ackTemplateId')
      if (!sel) return
      const approved = Array.isArray(templates) ? templates.filter(t => t.status === 'approved') : []
      sel.innerHTML = `<option value="">${t('ack_choosePolicy')}</option>` +
        approved.map(t => `<option value="${t.id}">${escHtml(t.title)} (${escHtml(t.type)})</option>`).join('')
    }).catch(() => {})
}

async function saveNewDistribution() {
  const templateId  = dom('ackTemplateId')?.value
  const targetGroup = dom('ackTargetGroup')?.value?.trim() || ''
  const dueDate     = dom('ackDueDate')?.value || null
  const notes       = dom('ackNotes')?.value?.trim() || ''

  if (!templateId) { alert(t('ack_choosePolicyAlert')); return }

  // E-Mail-Liste parsen (für email_campaign Modus)
  let emailList = []
  const emailRaw = dom('ackEmailList')?.value || ''
  if (emailRaw) {
    emailList = emailRaw.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes('@'))
  }

  const res = await fetch('/distributions', {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, targetGroup, dueDate, notes, emailList }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    alert(err.error || t('ack_createFailed'))
    return
  }

  const dist = await res.json()

  // Bei email_campaign sofort E-Mails verschicken?
  // Nur wenn E-Mail-Adressen vorhanden und SMTP konfiguriert
  if (emailList.length > 0) {
    const sendRes = await fetch(`/distributions/${dist.id}/send`, {
      method: 'POST',
      headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailList }),
    })
    if (sendRes.ok) {
      const r = await sendRes.json()
      alert(t('ack_createdEmailsSent', { count: r.sent }))
    } else {
      alert(t('ack_createdEmailsFailed'))
    }
  } else {
    alert(t('ack_created'))
  }

  _ackTab = 'list'
  renderPolicyAcks()
}

async function openDistributionDetail(id) {
  let dist
  try { dist = await fetch(`/distributions/${id}`, { headers: apiHeaders() }).then(r => r.json()) } catch {}
  if (!dist) return

  let acks = []
  try { acks = await fetch(`/distributions/${id}/acks`, { headers: apiHeaders() }).then(r => r.json()) } catch {}

  const container = dom('policyAcksContent')
  if (!container) return

  const modeLabels = { email_campaign: t('ack_modeEmail'), manual: t('ack_modeManualShort'), distribution_only: t('ack_modeDistributionOnlyShort') }
  const pct = dist.stats.total > 0 ? Math.round(dist.stats.confirmed / dist.stats.total * 100) : 0

  const acksHtml = acks.length === 0
    ? `<p style="color:var(--text-muted);padding:20px 0">${t('ack_noAcknowledgements')}</p>`
    : `<table class="data-table" style="width:100%;margin-top:12px">
        <thead><tr><th>E-Mail</th><th>${t('col_name')}</th><th>${t('ack_confirmedAt')}</th><th>${t('ack_method')}</th>${getCurrentRole()==='admin'?'<th></th>':''}</tr></thead>
        <tbody>${acks.map(a => `<tr>
          <td>${escHtml(a.recipientEmail||'–')}</td>
          <td>${escHtml(a.recipientName||'–')}</td>
          <td>${a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleString() : `<span style="color:#fbbf24">${t('ack_pending')}</span>`}</td>
          <td style="font-size:12px;color:var(--text-muted)">${a.method||'–'}</td>
          ${getCurrentRole()==='admin'?`<td><button class="btn btn-danger btn-sm" onclick="deleteAck('${a.id}','${id}')"><i class="ph ph-trash"></i></button></td>`:''}
        </tr>`).join('')}</tbody>
      </table>`

  // Manuelle Bestätigung hinzufügen (nur für manual/csv mode)
  const addManualHtml = (dist.mode !== 'email_campaign') ? `
    <div style="margin-top:24px;border-top:1px solid var(--border-color);padding-top:20px">
      <h4 style="margin-bottom:12px"><i class="ph ph-plus"></i> ${t('ack_addManual')}</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end">
        <div>
          <label class="form-label">${t('ui_email')}</label>
          <input type="email" id="manAckEmail" class="form-input" placeholder="alice@firma.de"/>
        </div>
        <div>
          <label class="form-label">${t('col_name')}</label>
          <input type="text" id="manAckName" class="form-input" placeholder="Alice Müller"/>
        </div>
        <button class="btn btn-primary" onclick="addManualAck('${id}')"><i class="ph ph-plus"></i> ${t('add')}</button>
      </div>
    </div>
  ` : ''

  // CSV-Import-Bereich (nur manual mode)
  const csvImportHtml = dist.mode === 'manual' ? `
    <div style="margin-top:16px">
      <h4 style="margin-bottom:8px"><i class="ph ph-upload-simple"></i> ${t('ack_importCsv')}</h4>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:8px">${t('ack_csvFormat')}: <code>email;name;date</code> (${t('ack_csvHint')})</p>
      <textarea id="csvImportData" class="form-textarea" rows="4" placeholder="alice@firma.de;Alice Müller;2026-03-13&#10;bob@firma.de;Bob Schmidt;"></textarea>
      <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="importAcksCsv('${id}')"><i class="ph ph-upload-simple"></i> ${t('import_action')}</button>
    </div>
  ` : ''

  container.innerHTML = `
    <div class="training-form-page">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <button class="btn btn-secondary btn-sm" onclick="_ackTab='list';renderPolicyAcks()"><i class="ph ph-arrow-left"></i> ${t('common_back')}</button>
        <h3 style="margin:0">${escHtml(dist.templateTitle)}</h3>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px">
        <div class="kpi-card"><div class="kpi-label">${t('ack_mode')}</div><div class="kpi-value">${modeLabels[dist.mode]||dist.mode}</div></div>
        <div class="kpi-card"><div class="kpi-label">${t('ack_targetGroup')}</div><div class="kpi-value" style="font-size:14px">${escHtml(dist.targetGroup||'–')}</div></div>
        <div class="kpi-card"><div class="kpi-label">${t('ack_deadline')}</div><div class="kpi-value" style="font-size:14px">${dist.dueDate ? new Date(dist.dueDate).toLocaleDateString() : '–'}</div></div>
        ${dist.mode !== 'distribution_only' ? `
        <div class="kpi-card"><div class="kpi-label">${t('ack_confirmed')}</div><div class="kpi-value">${dist.stats.confirmed}/${dist.stats.total} <span style="font-size:13px;color:var(--text-muted)">(${pct}%)</span></div></div>
        ` : ''}
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
        <a href="/distributions/${id}/export/csv" class="btn btn-secondary btn-sm"><i class="ph ph-download-simple"></i> CSV-Export</a>
        ${dist.mode === 'email_campaign' ? `<button class="btn btn-secondary btn-sm" onclick="sendAckReminder('${id}')"><i class="ph ph-envelope"></i> ${t('ack_sendReminder')}</button>` : ''}
        <select id="distStatusSel" class="select" style="max-width:180px;padding:6px 10px;font-size:13px" onchange="updateDistStatus('${id}',this.value)">
          <option value="active"${dist.status==='active'?' selected':''}>${t('ack_statusActive')}</option>
          <option value="completed"${dist.status==='completed'?' selected':''}>${t('ack_statusCompleted')}</option>
          <option value="expired"${dist.status==='expired'?' selected':''}>${t('ack_statusExpired')}</option>
        </select>
      </div>

      <h4>${t('ack_acknowledgements')} (${acks.length})</h4>
      ${acksHtml}
      ${addManualHtml}
      ${csvImportHtml}
    </div>
  `
}

async function sendAckReminder(distId) {
  if (!confirm(t('ack_sendReminderConfirm'))) return
  const res = await fetch(`/distributions/${distId}/remind`, { method: 'POST', headers: apiHeaders() })
  const r = await res.json().catch(() => ({}))
  alert(res.ok ? t('ack_remindersSent', { count: r.sent }) : (r.error || t('error')))
}

async function updateDistStatus(distId, status) {
  await fetch(`/distributions/${distId}`, {
    method: 'PUT',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

async function deleteDistribution(id) {
  if (!confirm(t('ack_deleteDistributionConfirm'))) return
  const res = await fetch(`/distributions/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || t('error')); return }
  renderPolicyAcks()
}

async function addManualAck(distId) {
  const email = dom('manAckEmail')?.value?.trim()
  const name  = dom('manAckName')?.value?.trim() || ''
  if (!email) { alert(t('ack_enterEmail')); return }
  const res = await fetch(`/distributions/${distId}/acks`, {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientEmail: email, recipientName: name }),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || t('error')); return }
  openDistributionDetail(distId)
}

async function importAcksCsv(distId) {
  const raw = dom('csvImportData')?.value?.trim()
  if (!raw) return
  const rows = raw.split('\n').map(line => {
    const parts = line.split(';')
    return { email: (parts[0]||'').trim(), name: (parts[1]||'').trim(), acknowledgedAt: (parts[2]||'').trim() || null }
  }).filter(r => r.email)
  if (!rows.length) { alert(t('ack_noValidRows')); return }
  const res = await fetch(`/distributions/${distId}/acks/import`, {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  })
  const r = await res.json().catch(() => ({}))
  alert(t('ack_importSummary', { imported: r.imported || 0, skipped: r.skipped || 0 }))
  openDistributionDetail(distId)
}

async function deleteAck(ackId, distId) {
  if (!confirm(t('ack_deleteConfirm'))) return
  await fetch(`/distributions/${distId}/acks/${ackId}`, { method: 'DELETE', headers: apiHeaders() })
  openDistributionDetail(distId)
}

async function renderPolicyAckSettings() {
  const container = dom('policyAcksContent')
  if (!container) return

  let current = 'manual'
  try { current = (await fetch('/admin/ack-settings', { headers: apiHeaders() }).then(r => r.json())).policyAckMode || 'manual' } catch {}

  container.innerHTML = `
    <div class="training-form-page">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
        <button class="btn btn-secondary btn-sm" onclick="renderPolicyAcks()"><i class="ph ph-arrow-left"></i> ${t('common_back')}</button>
        <h3 style="margin:0"><i class="ph ph-gear"></i> ${t('ack_configureMode')}</h3>
      </div>

      <div class="info-box" style="margin-bottom:24px">
        <i class="ph ph-warning"></i> ${t('ack_modeWarningPrefix')} <strong>${t('ack_modeWarningEmphasis')}</strong>.
        ${t('ack_modeWarningSuffix')}
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;max-width:600px">
        ${[
          { val:'email_campaign',    icon:'ph-envelope',   title:t('ack_modeEmail'),              desc:t('ack_modeEmailDesc') },
          { val:'manual',            icon:'ph-pencil',     title:t('ack_modeManual'),             desc:t('ack_modeManualDesc') },
          { val:'distribution_only', icon:'ph-file-text',  title:t('ack_modeDistributionOnly'),    desc:t('ack_modeDistributionOnlyDesc') },
        ].map(opt => `
          <label style="display:flex;align-items:flex-start;gap:14px;padding:16px;border:2px solid ${current===opt.val?'var(--brand-color)':'var(--border-color)'};border-radius:8px;cursor:pointer;background:${current===opt.val?'var(--brand-color)18':'transparent'}">
            <input type="radio" name="ackMode" value="${opt.val}" ${current===opt.val?'checked':''} style="margin-top:3px;accent-color:var(--brand-color)"/>
            <div>
              <div style="font-weight:600"><i class="ph ${opt.icon}"></i> ${opt.title}</div>
              <div style="font-size:13px;color:var(--text-muted);margin-top:2px">${opt.desc}</div>
            </div>
          </label>
        `).join('')}
      </div>

      <div style="margin-top:24px;display:flex;gap:12px">
        <button class="btn btn-primary" onclick="savePolicyAckMode()"><i class="ph ph-floppy-disk"></i> ${t('ack_saveMode')}</button>
        <button class="btn btn-secondary" onclick="renderPolicyAcks()">${t('cancel')}</button>
      </div>
    </div>
  `
}

async function savePolicyAckMode() {
  const sel = document.querySelector('input[name="ackMode"]:checked')
  if (!sel) return
  const res = await fetch('/admin/ack-settings', {
    method: 'PUT',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ policyAckMode: sel.value }),
  })
  if (res.ok) { renderPolicyAcks() } else { alert(t('err_saveFailed')) }
}

// Init app after DOM load – nur auf der SPA-Hauptseite (index.html)
window.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.app-body')) init()
})

// bfcache: Chrome hält Seiten im Arbeitsspeicher (Back/Forward Cache).
// Beim Wiederherstellen aus dem bfcache läuft DOMContentLoaded NICHT erneut.
// pageshow mit persisted:true feuert stattdessen — aber NUR dann neu rendern,
// wenn noch kein Section-Container existiert (d.h. Seite wirklich veraltet).
// Andernfalls würde Chrome während eines laufenden async-Renders removeAllDynamicPanels()
// auslösen und den halbfertigen Container entfernen (Chrome bfcache-Bug).
window.addEventListener('pageshow', (e) => {
  if (!e.persisted || !document.querySelector('.app-body')) return
  const containerIds = [
    'dashboardContainer','soaContainer','guidanceContainer','riskContainer',
    'calendarContainer','adminPanelContainer','settingsPanelContainer','reportsContainer',
    'gdprContainer','trainingContainer','incidentContainer','legalContainer',
    'goalsContainer','assetsContainer','governanceContainer','bcmContainer','suppliersContainer','policyAcksContainer'
  ]
  const alreadyRendered = containerIds.some(id => !!document.getElementById(id))
  if (!alreadyRendered) loadSection(currentSection)
})
