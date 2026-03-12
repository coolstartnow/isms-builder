// ISMS Builder V 1.29 – Single Page Application
// © 2026 Claude Hecker — AGPL-3.0

let TYPES = ['Policy','Procedure','Risk','SoA','Incident','Release']
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
  'Risk':            'ph-warning',
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
  bar.innerHTML = `<span class="action-label">Aktion:</span>`
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
  // Liste aktualisieren
  selectType(currentType, true)
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
    _open(`<div class="search-loading"><i class="ph ph-spinner"></i> Suche…</div>`)
    try {
      const res = await fetch(`/api/ai/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      _results = data.results || []
      if (!_results.length) {
        _open(`<div class="search-no-results">No results for <strong>${q}</strong></div>`)
        return
      }
      const mode = data.mode || 'keyword'
      const modeBadge = mode === 'semantic'
        ? '<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(168,85,247,.15);color:#a855f7;font-weight:600;margin-left:6px;">KI</span>'
        : '<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(255,255,255,.08);color:var(--text-subtle);font-weight:600;margin-left:6px;">Keyword</span>'
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
      _open(`<div class="search-dropdown-header">Suchergebnisse (${_results.length})${modeBadge}</div>${rows}`)
      _activeIdx = -1
    } catch {
      _open(`<div class="search-offline"><i class="ph ph-plug-slash"></i> AI search unavailable</div>`)
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
      <label class="form-label" style="margin-bottom:4px">Policies / Templates</label>
      <div style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap">
        <div>
          <input id="${formId}_polSearch" class="form-input" style="width:160px;padding:4px 8px;font-size:.8rem" placeholder="Suche…"
            oninput="filterLinkSelect('${formId}_polSelect', this.value)">
          <select id="${formId}_polSelect" class="select" multiple size="5" style="margin-top:4px;width:340px;font-size:.8rem"
            ondblclick="addLinkChip('${formId}_pol', this)"></select>
        </div>
        <div>
          <div id="${formId}_pol_chips" class="link-chip-area">${polChips}</div>
          <small style="color:var(--text-subtle);font-size:.72rem">Double-click to add</small>
        </div>
      </div>
    </div>` : ''

  return `
  <details class="link-picker-details">
    <summary><i class="ph ph-link"></i> Links</summary>
    <div style="padding:10px 0">
      <div class="link-picker-group">
        <label class="form-label" style="margin-bottom:4px">SoA-Controls</label>
        <div style="display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap">
          <div>
            <input id="${formId}_ctrlSearch" class="form-input" style="width:160px;padding:4px 8px;font-size:.8rem" placeholder="Suche Control-ID…"
              oninput="filterLinkSelect('${formId}_ctrlSelect', this.value)">
            <select id="${formId}_ctrlSelect" class="select" multiple size="5" style="margin-top:4px;width:340px;font-size:.8rem"
              ondblclick="addLinkChip('${formId}_ctrl', this)"></select>
          </div>
          <div>
            <div id="${formId}_ctrl_chips" class="link-chip-area">${ctrlChips}</div>
            <small style="color:var(--text-subtle);font-size:.72rem">Double-click to add</small>
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

function selectType(type, init=false) {
  currentType = type
  document.querySelectorAll('#typeList .sidebar-tree-parent').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type)
  })
  dom('selType').textContent = type

  const isAdmin = (ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK['admin']

  fetch(`/templates/tree?type=${encodeURIComponent(type)}&language=de`, { headers: apiHeaders('reader') })
    .then(r => r.json())
    .then(treeData => {
      const list = dom('templateList')
      list.innerHTML = ''
      if (treeData.length === 0) {
        const empty = document.createElement('li')
        empty.className = 'tmpl-tree-empty'
        empty.textContent = 'No templates found.'
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
  if (!confirm(`Delete template "${t.title}"?\nThis action cannot be undone.`)) return
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
    ul.innerHTML = '<li class="sidebar-tree-empty">No templates</li>'
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
  ['dashboardContainer','soaContainer','guidanceContainer','riskContainer','calendarContainer','adminPanelContainer','settingsPanelContainer','reportsContainer','gdprContainer','trainingContainer','incidentContainer','legalContainer','goalsContainer','assetsContainer','governanceContainer','bcmContainer','suppliersContainer'].forEach(id => {
    dom(id)?.remove()
  })
}

// ── Reports ─────────────────────────────────────────────────────────
// ── Findings: Severity- und Status-Labels ─────────────────────────────────────
const FINDING_SEVERITY_LABELS = { critical:'Kritisch', high:'Hoch', medium:'Mittel', low:'Niedrig', observation:'Hinweis' }
const FINDING_STATUS_LABELS   = { open:'Offen', in_progress:'In Bearbeitung', resolved:'Behoben', accepted:'Akzeptiert' }
const FINDING_ACT_STATUS_LABELS = { open:'Offen', in_progress:'In Bearbeitung', done:'Erledigt' }
const FINDING_SEVERITY_COLOR  = { critical:'#f87171', high:'#fb923c', medium:'#fbbf24', low:'#4ade80', observation:'#60a5fa' }
const FINDING_STATUS_COLOR    = { open:'#f87171', in_progress:'#fbbf24', resolved:'#4ade80', accepted:'#60a5fa' }

let _reportsMainTab  = 'reports'   // 'reports' | 'findings'
let _findingsTab     = 'list'      // 'list' | 'open' | 'resolved'
let _findingFormBack = 'list'

const REPORT_TYPES = [
  { id: 'compliance', label: 'Compliance',            icon: 'ph-shield-check',            desc: 'Implementation rate per entity and framework', needsEntity: true },
  { id: 'framework',  label: 'Framework Coverage',   icon: 'ph-chart-bar',               desc: 'Controls per framework: applicable / implemented / gap', needsEntity: false },
  { id: 'gap',        label: 'Gap Analysis',          icon: 'ph-warning-circle',          desc: 'Controls without linked policy templates', needsEntity: true },
  { id: 'templates',  label: 'Template Overview',     icon: 'ph-files',                   desc: 'All templates of an entity by status', needsEntity: true },
  { id: 'reviews',    label: 'Due Reviews',           icon: 'ph-calendar-x',             desc: 'Templates with overdue or upcoming review date', needsEntity: false },
  { id: 'matrix',     label: 'Compliance Matrix',     icon: 'ph-table',                  desc: 'Control × Entity traffic light overview', needsEntity: false },
  { id: 'audit',      label: 'Audit Trail',            icon: 'ph-clock-counter-clockwise', desc: 'Status changes on templates in a given period', needsEntity: false },
  { id: 'findings',   label: 'Audit Findings',         icon: 'ph-magnifying-glass',        desc: 'Audit findings with action plans (IST→SOLL→Risk→Recommendation)', needsEntity: false },
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
      <h2 class="reports-title"><i class="ph ph-chart-line"></i> Reports &amp; Compliance</h2>
    </div>
    <div class="training-tab-bar" style="margin-bottom:16px">
      <button class="training-tab${_reportsMainTab==='reports'?' active':''}" onclick="switchReportsMainTab('reports')">
        <i class="ph ph-chart-bar"></i> Berichte
      </button>
      <button class="training-tab${_reportsMainTab==='findings'?' active':''}" onclick="switchReportsMainTab('findings')">
        <i class="ph ph-magnifying-glass"></i> Feststellungen
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
    b.classList.toggle('active', b.textContent.trim().toLowerCase().includes(tab === 'reports' ? 'bericht' : 'feststellung'))
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
          <h3 class="report-card-title">${rt.label}</h3>
          <p class="report-card-desc">${rt.desc}</p>
          <button class="btn btn-primary btn-sm report-run-btn" data-report="${rt.id}">
            Run <i class="ph ph-play"></i>
          </button>
        </div>
      `).join('')}
    </div>
    <div id="reportFilters" class="report-filters" style="display:none;">
      <div id="reportEntityWrap">
        <label class="form-label">Entity</label>
        <select id="reportEntitySel" class="select report-sel">
          <option value="">${t('filter_allEntities')}</option>
          ${_reportEntities.map(e => `<option value="${e.id}">${e.name} (${e.shortCode || e.id})</option>`).join('')}
        </select>
      </div>
      <label class="form-label">Framework</label>
      <select id="reportFwSel" class="select report-sel">
        <option value="">Alle Frameworks</option>
        <option value="ISO27001">ISO 27001:2022</option>
        <option value="BSI">BSI IT-Grundschutz</option>
        <option value="NIS2">EU NIS2</option>
        <option value="EUCS">EU Cloud (EUCS)</option>
        <option value="EUAI">EU AI Act</option>
        <option value="ISO9000">ISO 9000:2015</option>
        <option value="ISO9001">ISO 9001:2015</option>
        <option value="CRA">EU Cyber Resilience Act</option>
      </select>
      <label class="form-label">From</label>
      <input type="date" id="reportFrom" class="form-input report-date" />
      <label class="form-label">To</label>
      <input type="date" id="reportTo" class="form-input report-date" />
      <button id="reportRunBtn" class="btn btn-primary"><i class="ph ph-play"></i> Create Report</button>
      <button class="btn btn-secondary" onclick="exportReportJson()"><i class="ph ph-download-simple"></i> JSON</button>
      <button class="btn btn-secondary" onclick="exportReportCsv()"><i class="ph ph-file-csv"></i> CSV</button>
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
  resultEl.innerHTML = '<p class="report-loading"><i class="ph ph-spinner"></i> Wird berechnet…</p>'

  let url = `/reports/${type}`
  const params = new URLSearchParams()
  if (entity) params.set('entity', entity)
  if (fw)     params.set('framework', fw)
  if (from)   params.set('from', from)
  if (to)     params.set('to', to)
  if ([...params].length) url += '?' + params.toString()

  try {
    const res = await fetch(url, { headers: apiHeaders('reader') })
    if (!res.ok) { resultEl.innerHTML = `<p class="report-error">Error: ${res.status}</p>`; return }
    _lastReportData = await res.json()
    renderReportResult(type, _lastReportData, resultEl)
  } catch (e) {
    resultEl.innerHTML = `<p class="report-error">Netzwerkfehler: ${e.message}</p>`
  }
}

function renderReportResult(type, data, el) {
  if (type === 'compliance') {
    el.innerHTML = `<h3 class="report-result-title">Compliance Overview</h3>` +
      (Array.isArray(data) ? data : [data]).map(row => `
        <div class="report-compliance-card">
          <h4>${row.entity?.name || 'All'} <span class="picker-id">${row.entity?.shortCode || ''}</span></h4>
          <div class="report-kpi-row">
            <div class="report-kpi"><span class="report-kpi-val">${row.totalApplicable}</span><span class="report-kpi-label">Applicable</span></div>
            <div class="report-kpi"><span class="report-kpi-val">${row.totalImplemented}</span><span class="report-kpi-label">Implemented</span></div>
            <div class="report-kpi"><span class="report-kpi-val ${row.implementationRate < 50 ? 'red' : row.implementationRate < 80 ? 'yellow' : 'green'}">${row.implementationRate}%</span><span class="report-kpi-label">Rate</span></div>
          </div>
          <table class="report-table">
            <thead><tr><th>Framework</th><th>Applicable</th><th>Implemented</th><th>Rate</th></tr></thead>
            <tbody>${Object.entries(row.byFramework || {}).map(([fw, v]) =>
              `<tr><td>${fw}</td><td>${v.applicable}</td><td>${v.implemented}</td>
               <td>${v.applicable > 0 ? Math.round(v.implemented/v.applicable*100) : 0}%</td></tr>`
            ).join('')}</tbody>
          </table>
        </div>
      `).join('')
  } else if (type === 'framework') {
    el.innerHTML = `<h3 class="report-result-title">Framework Coverage</h3>
      <table class="report-table">
        <thead><tr><th>Framework</th><th>Controls</th><th>Applicable</th><th>n/a</th><th>Implemented</th><th>Rate</th></tr></thead>
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
    el.innerHTML = `<h3 class="report-result-title">Gap Analysis — ${data.totalGaps} Controls without Policy</h3>
      <table class="report-table">
        <thead><tr><th>Control ID</th><th>Framework</th><th>Title</th><th>Status</th><th>Owner</th></tr></thead>
        <tbody>${(data.gaps || []).map(g => `
          <tr><td class="picker-id">${g.id}</td><td>${g.framework}</td><td>${g.title}</td>
              <td>${g.status || '—'}</td><td>${g.owner || '—'}</td></tr>`).join('')}
        </tbody>
      </table>`
  } else if (type === 'templates') {
    el.innerHTML = `<h3 class="report-result-title">Templates (${data.total})</h3>
      <div class="report-kpi-row">
        ${Object.entries(data.byStatus||{}).map(([s,n])=>`<div class="report-kpi"><span class="report-kpi-val">${n}</span><span class="report-kpi-label status-${s}">${s}</span></div>`).join('')}
      </div>
      <table class="report-table">
        <thead><tr><th>Type</th><th>Title</th><th>Status</th><th>Version</th><th>Controls</th></tr></thead>
        <tbody>${(data.templates||[]).map(t=>`
          <tr><td>${t.type}</td><td>${t.title}</td>
              <td><span class="status-badge status-${t.status}">${t.status}</span></td>
              <td>v${t.version}</td><td>${t.linkedControls.length}</td></tr>`).join('')}
        </tbody>
      </table>`
  } else if (type === 'reviews') {
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB') : '—'
    const reviewRow = (t, cls) =>
      `<tr class="${cls}"><td>${fmtDate(t.nextReviewDate)}</td><td>${t.type}</td>
       <td>${escHtml(t.title)}</td><td><span class="status-badge status-${t.status}">${t.status}</span></td>
       <td>${escHtml(t.owner||'—')}</td>
       <td>${t.daysUntil !== null ? (t.daysUntil < 0 ? `<span style="color:var(--color-danger)">${t.daysUntil} days</span>` : `${t.daysUntil} days`) : '—'}</td></tr>`
    el.innerHTML = `
      <h3 class="report-result-title">Due Reviews</h3>
      <div class="report-kpi-row">
        <div class="report-kpi"><span class="report-kpi-val red">${data.overdue?.length||0}</span><span class="report-kpi-label">Overdue</span></div>
        <div class="report-kpi"><span class="report-kpi-val yellow">${data.upcoming?.length||0}</span><span class="report-kpi-label">In ${data.daysAhead} days</span></div>
        <div class="report-kpi"><span class="report-kpi-val">${data.noReview?.length||0}</span><span class="report-kpi-label">No review date</span></div>
      </div>
      ${data.overdue?.length ? `<h4 style="color:var(--color-danger);margin-top:1rem">Overdue</h4>
      <table class="report-table"><thead><tr><th>Review Date</th><th>Type</th><th>Title</th><th>Status</th><th>Owner</th><th>Due</th></tr></thead>
      <tbody>${data.overdue.map(t => reviewRow(t, 'review-overdue')).join('')}</tbody></table>` : ''}
      ${data.upcoming?.length ? `<h4 style="color:var(--color-warning);margin-top:1rem">Due soon (${data.daysAhead} days)</h4>
      <table class="report-table"><thead><tr><th>Review Date</th><th>Type</th><th>Title</th><th>Status</th><th>Owner</th><th>Due</th></tr></thead>
      <tbody>${data.upcoming.map(t => reviewRow(t, 'review-upcoming')).join('')}</tbody></table>` : ''}`
  } else if (type === 'matrix') {
    const statusColor = s => ({ implemented:'var(--color-success)', optimized:'var(--color-success)',
      partial:'var(--color-warning)', not_started:'var(--color-danger)', 'n/a':'var(--color-muted)' })[s] || '#888'
    const statusEmoji = s => ({ implemented:'✓', optimized:'★', partial:'◑', not_started:'✗', 'n/a':'—' })[s] || '?'
    el.innerHTML = `
      <h3 class="report-result-title">Compliance Matrix — ${data.framework === 'all' ? 'All Frameworks' : data.framework}</h3>
      <div style="overflow-x:auto">
      <table class="report-table matrix-table">
        <thead><tr><th>Control</th><th>Framework</th><th>Title</th>${(data.entities||[]).map(e=>`<th title="${e.name}">${e.shortCode||e.name}</th>`).join('')}</tr></thead>
        <tbody>${(data.controls||[]).map(ctrl=>`
          <tr>
            <td class="picker-id">${ctrl.id}</td>
            <td>${ctrl.framework}</td>
            <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(ctrl.title)}">${escHtml(ctrl.title)}</td>
            ${(data.entities||[]).map(e=>{
              const s = ctrl[e.id] || 'n/a'
              return `<td style="text-align:center;color:${statusColor(s)}" title="${s}">${statusEmoji(s)}</td>`
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table></div>
      <p style="margin-top:.5rem;font-size:.8rem;color:var(--color-muted)">✓ implemented &nbsp; ★ optimized &nbsp; ◑ partial &nbsp; ✗ not started &nbsp; — not applicable</p>`
  } else if (type === 'audit') {
    el.innerHTML = `<h3 class="report-result-title">Audit Trail (${data.total} entries)</h3>
      <table class="report-table">
        <thead><tr><th>Date</th><th>Template</th><th>Type</th><th>Status</th><th>Changed by</th></tr></thead>
        <tbody>${(data.entries||[]).map(e=>`
          <tr><td>${new Date(e.changedAt).toLocaleString('en-GB')}</td>
              <td>${e.templateTitle}</td><td>${e.type}</td>
              <td><span class="status-badge status-${e.status}">${e.status}</span></td>
              <td>${e.changedBy}</td></tr>`).join('')}
        </tbody>
      </table>`
  } else if (type === 'findings') {
    const sevColor = { critical:'#f87171', high:'#fb923c', medium:'#fbbf24', low:'#4ade80', observation:'#60a5fa' }
    const stColor  = { open:'#f87171', in_progress:'#fbbf24', resolved:'#4ade80', accepted:'#60a5fa' }
    el.innerHTML = `
      <h3 class="report-result-title">Audit Findings (${data.total})</h3>
      <div class="report-kpi-row" style="margin-bottom:16px">
        <div class="report-kpi"><span class="report-kpi-val red">${data.byStatus?.open||0}</span><span class="report-kpi-label">Open</span></div>
        <div class="report-kpi"><span class="report-kpi-val yellow">${data.byStatus?.in_progress||0}</span><span class="report-kpi-label">In Progress</span></div>
        <div class="report-kpi"><span class="report-kpi-val green">${data.byStatus?.resolved||0}</span><span class="report-kpi-label">Resolved</span></div>
        <div class="report-kpi"><span class="report-kpi-val">${data.byStatus?.accepted||0}</span><span class="report-kpi-label">Accepted</span></div>
        <div class="report-kpi"><span class="report-kpi-val" style="color:#f87171">${data.bySeverity?.critical||0}</span><span class="report-kpi-label">Critical</span></div>
        <div class="report-kpi"><span class="report-kpi-val" style="color:#fb923c">${data.bySeverity?.high||0}</span><span class="report-kpi-label">High</span></div>
        <div class="report-kpi"><span class="report-kpi-val ${data.overdueActions>0?'red':''}">${data.openActions||0}</span><span class="report-kpi-label">Open Actions</span></div>
        ${data.overdueActions > 0 ? `<div class="report-kpi"><span class="report-kpi-val red">${data.overdueActions}</span><span class="report-kpi-label">Overdue Actions</span></div>` : ''}
      </div>
      <table class="report-table">
        <thead><tr><th>Ref</th><th>Title</th><th>Severity</th><th>Status</th><th>Auditor</th><th>Area</th><th>Open Actions</th></tr></thead>
        <tbody>${(data.findings||[]).map(f => {
          const openActs = (f.actions||[]).filter(a => a.status !== 'done').length
          return `<tr>
            <td class="picker-id">${f.ref}</td>
            <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(f.title)}">${escHtml(f.title)}</td>
            <td><span style="color:${sevColor[f.severity]||'#888'};font-weight:600">${f.severity}</span></td>
            <td><span style="color:${stColor[f.status]||'#888'}">${f.status.replace(/_/g,' ')}</span></td>
            <td>${escHtml(f.auditor||'—')}</td>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(f.auditedArea||'—')}</td>
            <td style="text-align:center;color:${openActs>0?'#fb923c':'var(--text-muted)'}">${openActs}</td>
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
    { id: 'list',     label: 'Alle',         icon: 'ph-list-bullets' },
    { id: 'open',     label: 'Offen',        icon: 'ph-warning-circle' },
    { id: 'resolved', label: 'Behoben',      icon: 'ph-check-circle' },
  ]

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <h3 style="margin:0;font-size:15px;font-weight:700;color:var(--text-inv)">
        <i class="ph ph-magnifying-glass"></i> Audit-Feststellungen
      </h3>
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openFindingForm()">
        <i class="ph ph-plus"></i> Neue Feststellung
      </button>` : ''}
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
      ${[
        { label:'Gesamt',       value: sum.total || 0,           color:'var(--text-primary)' },
        { label:'Kritisch',     value: sum.bySeverity?.critical||0, color: FINDING_SEVERITY_COLOR.critical },
        { label:'Hoch',         value: sum.bySeverity?.high||0,     color: FINDING_SEVERITY_COLOR.high },
        { label:'Offen',        value: sum.byStatus?.open||0,        color: FINDING_STATUS_COLOR.open },
        { label:'Maßn. offen',  value: sum.openActions||0,           color: sum.openActions > 0 ? '#fbbf24':'#4ade80' },
        { label:'Maßn. überfällig', value: sum.overdueActions||0,   color: sum.overdueActions > 0 ? FINDING_SEVERITY_COLOR.critical:'#4ade80' },
      ].map(k => `
        <div class="dash-card kpi" style="flex:1;min-width:100px;padding:10px 14px;text-align:center">
          <div style="font-size:1.4rem;font-weight:700;color:${k.color}">${k.value}</div>
          <div style="font-size:.72rem;color:var(--text-subtle)">${k.label}</div>
        </div>
      `).join('')}
    </div>

    <div class="training-tab-bar" style="margin-bottom:12px">
      ${tabs.map(tb => `<button class="training-tab${_findingsTab===tb.id?' active':''}"
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
    b.classList.toggle('active', b.textContent.trim() === ({list:'Alle',open:'Offen',resolved:'Behoben'}[tab]||tab))
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
      Keine Feststellungen
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
            ${f.auditor ? `· Auditor: ${escHtml(f.auditor)}` : ''}
            ${f.auditPeriodFrom ? `· ${f.auditPeriodFrom}${f.auditPeriodTo?' – '+f.auditPeriodTo:''}` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span style="font-size:11px;color:${actOpen>0?'#fbbf24':'var(--text-subtle)'}">
            <i class="ph ph-checks"></i> ${actOpen}/${actTotal} offen
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
        <b>IST:</b> ${escHtml(f.observation.slice(0,120))}${f.observation.length>120?'…':''}
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

  content.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchReportsMainTab('findings')">
          <i class="ph ph-arrow-left"></i> Zurück
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-magnifying-glass"></i>
          <span style="font-size:12px;color:var(--text-subtle);font-family:monospace">${escHtml(f.ref)}</span>
          ${escHtml(f.title)}
        </h3>
      </div>
      <div class="training-form-body">

        <div class="training-form-section">
          <h4 class="training-form-section-title" style="display:flex;align-items:center;gap:8px">
            Feststellung ${_findingSeverityBadge(f.severity)} ${_findingStatusBadge(f.status)}
          </h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-bottom:12px;font-size:13px">
            <div><span style="color:var(--text-subtle)">Bereich:</span> ${escHtml(f.auditedArea||'—')}</div>
            <div><span style="color:var(--text-subtle)">Auditor:</span> ${escHtml(f.auditor||'—')}</div>
            <div><span style="color:var(--text-subtle)">Zeitraum:</span>
              ${f.auditPeriodFrom ? escHtml(f.auditPeriodFrom)+(f.auditPeriodTo?' – '+escHtml(f.auditPeriodTo):'') : '—'}
            </div>
            <div><span style="color:var(--text-subtle)">Erstellt:</span> ${f.createdAt?.slice(0,10)||'—'}</div>
          </div>

          <div class="form-group">
            <label class="form-label" style="color:var(--warn)">📋 IST-Zustand (Beobachtung)</label>
            <div style="background:var(--raised);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:13px;white-space:pre-wrap">${escHtml(f.observation||'—')}</div>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:#60a5fa">🎯 SOLL-Zustand (Anforderung)</label>
            <div style="background:var(--raised);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:13px;white-space:pre-wrap">${escHtml(f.requirement||'—')}</div>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:${FINDING_SEVERITY_COLOR.high}">⚠ Risiko / Auswirkung</label>
            <div style="background:var(--raised);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:13px;white-space:pre-wrap">${escHtml(f.impact||'—')}</div>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:#4ade80">💡 Empfehlung</label>
            <div style="background:var(--raised);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:13px;white-space:pre-wrap">${escHtml(f.recommendation||'—')}</div>
          </div>
        </div>

        <div class="training-form-section" id="actionsSection">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <h4 class="training-form-section-title" style="margin:0">
              <i class="ph ph-check-square"></i> Maßnahmenplan
            </h4>
            ${canAct ? `<button class="btn btn-primary btn-sm" onclick="openAddActionForm('${f.id}')">
              <i class="ph ph-plus"></i> Maßnahme
            </button>` : ''}
          </div>
          <div id="actionsList">
            ${_renderActionsList(f.actions || [], f.id, canAct)}
          </div>
        </div>

        ${canEdit ? `
        <div class="training-form-section">
          <button class="btn btn-primary" onclick="openFindingForm('${f.id}')">
            <i class="ph ph-pencil-simple"></i> Feststellung bearbeiten
          </button>
        </div>` : ''}
      </div>
    </div>
  `
}

function _renderActionsList(actions, findingId, canEdit) {
  if (!actions.length) return `<div style="color:var(--text-subtle);font-size:13px;padding:8px 0">Noch keine Maßnahmen eingetragen.</div>`
  return actions.map(a => {
    const colAct = a.status === 'done' ? '#4ade80' : a.status === 'in_progress' ? '#fbbf24' : '#f87171'
    const overdue = a.status !== 'done' && a.dueDate && new Date(a.dueDate) < new Date()
    return `
    <div class="risk-item" style="padding:10px 14px;margin-bottom:8px">
      <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;margin-bottom:3px">${escHtml(a.description)}</div>
          <div style="font-size:12px;color:var(--text-subtle)">
            Verantwortlich: <b>${escHtml(a.responsible||'—')}</b>
            ${a.dueDate ? `· Fällig: <span style="color:${overdue?'#f87171':'inherit'}">${a.dueDate}${overdue?' ⚠':''}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          ${canEdit ? `<select class="select" style="font-size:11px;padding:2px 6px"
            onchange="updateActionStatus('${findingId}','${a.id}',this.value)">
            ${Object.entries(FINDING_ACT_STATUS_LABELS).map(([v,l]) =>
              `<option value="${v}"${a.status===v?' selected':''}>${l}</option>`).join('')}
          </select>
          <button class="btn btn-sm" style="color:var(--danger)" title="Löschen"
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
      <label class="form-label">Maßnahme <span class="form-required">*</span></label>
      <textarea id="actDesc" class="form-input" rows="2" placeholder="Was wird konkret getan?"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Verantwortlich</label>
        <input id="actResp" class="form-input" placeholder="Name / Rolle">
      </div>
      <div class="form-group">
        <label class="form-label">Zieldatum</label>
        <input id="actDue" class="form-input" type="date">
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-primary btn-sm" onclick="saveNewAction('${findingId}')">Speichern</button>
      <button class="btn btn-secondary btn-sm" onclick="dom('${formId}').remove()">Abbrechen</button>
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
  if (!r.ok) { showToast('Fehler beim Speichern', 'error'); return }
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
  if (!confirm('Maßnahme löschen?')) return
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
          <i class="ph ph-arrow-left"></i> Zurück
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-magnifying-glass"></i>
          ${isEdit ? `Feststellung bearbeiten <span style="font-family:monospace;font-size:12px;color:var(--text-subtle)">${escHtml(f?.ref||'')}</span>` : 'Neue Feststellung'}
        </h3>
      </div>
      <div class="training-form-body">

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-info"></i> Grunddaten</h4>
          <div class="form-group">
            <label class="form-label">Titel <span class="form-required">*</span></label>
            <input id="fndTitle" class="form-input" value="${escHtml(f?.title||'')}" placeholder="Kurzer prägnanter Name der Feststellung">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Schweregrad</label>
              <select id="fndSeverity" class="select">
                ${Object.entries(FINDING_SEVERITY_LABELS).map(([v,l]) =>
                  `<option value="${v}"${(f?.severity||'medium')===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="fndStatus" class="select">
                ${Object.entries(FINDING_STATUS_LABELS).map(([v,l]) =>
                  `<option value="${v}"${(f?.status||'open')===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Geprüfter Bereich</label>
              <input id="fndArea" class="form-input" value="${escHtml(f?.auditedArea||'')}" placeholder="z.B. IT-Operations / ISO A.8">
            </div>
            <div class="form-group">
              <label class="form-label">Auditor</label>
              <input id="fndAuditor" class="form-input" value="${escHtml(f?.auditor||'')}" placeholder="Name oder Kürzel">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Audit-Zeitraum von</label>
              <input id="fndPeriodFrom" class="form-input" type="date" value="${f?.auditPeriodFrom||''}">
            </div>
            <div class="form-group">
              <label class="form-label">bis</label>
              <input id="fndPeriodTo" class="form-input" type="date" value="${f?.auditPeriodTo||''}">
            </div>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-clipboard-text"></i> Feststellungsdetails</h4>
          <div class="form-group">
            <label class="form-label" style="color:var(--warn)">📋 IST-Zustand (Beobachtung)</label>
            <textarea id="fndObservation" class="form-input" rows="4"
              placeholder="Was wurde gefunden? Stichprobengröße, konkrete Zahlen…">${escHtml(f?.observation||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:#60a5fa">🎯 SOLL-Zustand (Anforderung)</label>
            <textarea id="fndRequirement" class="form-input" rows="3"
              placeholder="Was verlangt die Norm oder die interne Richtlinie?">${escHtml(f?.requirement||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:${FINDING_SEVERITY_COLOR.high}">⚠ Risiko / Auswirkung</label>
            <textarea id="fndImpact" class="form-input" rows="3"
              placeholder="Was kann passieren, wenn das nicht behoben wird?">${escHtml(f?.impact||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" style="color:#4ade80">💡 Empfehlung</label>
            <textarea id="fndRecommendation" class="form-input" rows="3"
              placeholder="Was sollte konkret getan werden?">${escHtml(f?.recommendation||'')}</textarea>
          </div>
        </div>

        <div class="training-form-section">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="saveFinding(${id ? `'${id}'` : 'null'})">
              <i class="ph ph-floppy-disk"></i> ${isEdit ? 'Speichern' : 'Feststellung anlegen'}
            </button>
            <button class="btn btn-secondary" onclick="switchReportsMainTab('findings')">Abbrechen</button>
            ${isEdit ? `<button class="btn btn-secondary" onclick="openFindingDetail('${id}')">
              <i class="ph ph-eye"></i> Detail-Ansicht
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
  if (!title) { dom('fndTitle')?.focus(); showToast('Titel ist Pflichtfeld', 'error'); return }
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
    if (msg) { msg.textContent = id ? 'Gespeichert.' : `Feststellung ${saved.ref} angelegt.`; msg.style.color = 'var(--success,#4ade80)'; msg.style.display = '' }
    setTimeout(() => { if (id) openFindingDetail(id); else switchReportsMainTab('findings') }, 1000)
  } else {
    const e = await r.json().catch(() => ({}))
    if (msg) { msg.textContent = 'Fehler: ' + (e.error || r.status); msg.style.color = 'var(--danger-text,#f87171)'; msg.style.display = '' }
  }
}

async function deleteFinding(id) {
  if (!confirm('Feststellung in den Papierkorb verschieben?')) return
  const r = await fetch(`/findings/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (r.ok) { showToast('Feststellung gelöscht', 'success'); switchReportsMainTab('findings') }
  else showToast('Fehler beim Löschen', 'error')
}

// ── Ende Findings UI ──────────────────────────────────────────────────────────

function renderSectionContent(sectionId){
  const editorCard = document.querySelector('.editor-card')
  const listPanel = dom('listPanel')

  removeAllDynamicPanels()

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
const INC_CLEANED_LABELS = { yes: 'Yes, resolved', no: 'No – pending follow-up', partial: 'Partial' }
const INC_STATUS_LABELS  = { new: 'New', in_review: 'Under Review', assigned: 'Assigned', closed: 'Closed' }
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
        <h2><i class="ph ph-siren"></i> Incident Inbox – CISO Processing</h2>
        <div style="display:flex;gap:8px;align-items:center;">
          <select class="select" id="incStatusFilter" onchange="loadIncidents()" style="font-size:.82rem">
            <option value="">${t('filter_allStatuses')}</option>
            <option value="new">New</option>
            <option value="in_review">Under Review</option>
            <option value="assigned">Assigned</option>
            <option value="closed">Closed</option>
          </select>
          <button class="btn btn-secondary btn-sm" onclick="loadIncidents()">
            <i class="ph ph-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </div>
      <div class="incident-inbox-body">
        <div class="incident-list-panel" id="incListPanel">
          <p class="report-loading">Loading…</p>
        </div>
        <div class="incident-detail-panel" id="incDetailPanel">
          <div class="incident-detail-empty">
            <i class="ph ph-siren" style="font-size:40px;color:var(--text-disabled)"></i>
            <p>Select an incident from the list</p>
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
  panel.innerHTML = '<p class="report-loading">Lädt…</p>'

  const res  = await fetch('/public/incidents' + (status ? `?status=${status}` : ''), { headers: apiHeaders() })
  const list = res.ok ? await res.json() : []

  if (list.length === 0) {
    panel.innerHTML = '<p class="gdpr-empty" style="padding:20px">No incidents found.</p>'
    return
  }

  panel.innerHTML = `
    <table class="incident-table">
      <thead><tr>
        <th>Reference</th><th>Date</th><th>Company</th>
        <th>Type</th><th>Status</th>
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
        <div class="inc-field"><div class="inc-field-label">Reporter E-Mail</div><div>${escHtml(i.email)}</div></div>
        <div class="inc-field"><div class="inc-field-label">Entity</div><div>${escHtml(i.entityName || '—')}</div></div>
        <div class="inc-field"><div class="inc-field-label">Incident Type</div><div>${escHtml(INC_TYPE_LABELS[i.incidentType] || i.incidentType)}</div></div>
        <div class="inc-field"><div class="inc-field-label">Resolved?</div><div>${escHtml(INC_CLEANED_LABELS[i.cleanedUp] || i.cleanedUp)}</div></div>
        <div class="inc-field full"><div class="inc-field-label">Description</div><div class="inc-field-text">${escHtml(i.description)}</div></div>
        <div class="inc-field full"><div class="inc-field-label">Measures Already Taken</div><div class="inc-field-text">${escHtml(i.measuresTaken || '—')}</div></div>
        <div class="inc-field"><div class="inc-field-label">Local Contact</div><div>${escHtml(i.localContact || '—')}</div></div>
      </div>

      <div class="incident-ciso-panel">
        <h4><i class="ph ph-shield-check"></i> CISO Decision</h4>
        <div class="incident-ciso-grid">
          <div class="inc-field">
            <div class="inc-field-label">Set Status</div>
            <select class="select" id="incEditStatus" style="font-size:.82rem">
              ${Object.entries(INC_STATUS_LABELS).map(([v,l]) =>
                `<option value="${v}" ${i.status === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="inc-field">
            <div class="inc-field-label">Assign To</div>
            <select class="select" id="incAssignedTo" style="font-size:.82rem">
              <option value="">— not yet assigned —</option>
              <option value="it" ${i.assignedTo === 'it' ? 'selected' : ''}>IT Department</option>
              <option value="datenschutz" ${i.assignedTo === 'datenschutz' ? 'selected' : ''}>Data Protection / GDPO</option>
            </select>
          </div>
          <div class="inc-field">
            <div class="inc-field-label">Reportable (GDPO)</div>
            <select class="select" id="incReportable" style="font-size:.82rem">
              <option value="">— still open —</option>
              <option value="tbd" ${i.reportable === 'tbd' ? 'selected' : ''}>Unclear – under review</option>
              <option value="yes" ${i.reportable === 'yes' ? 'selected' : ''}>Yes – reportable</option>
              <option value="no"  ${i.reportable === 'no'  ? 'selected' : ''}>No – not reportable</option>
            </select>
          </div>
        </div>
        <div class="inc-field" style="margin-top:10px">
          <div class="inc-field-label">CISO Notes</div>
          <textarea class="form-textarea" id="incCisoNotes" rows="3" style="font-size:.82rem">${escHtml(i.cisoNotes || '')}</textarea>
        </div>
        ${i.updatedAt ? `<p style="font-size:.75rem;color:var(--text-disabled);margin-top:6px">Last updated: ${new Date(i.updatedAt).toLocaleString('en-GB')} by ${escHtml(i.updatedBy || '—')}</p>` : ''}
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
          ${canAccess('admin') ? `<button class="btn btn-danger btn-sm" onclick="deleteIncident('${i.id}','${escHtml(i.refNumber)}')">
            <i class="ph ph-trash"></i> Delete
          </button>` : ''}
          <button class="btn btn-primary btn-sm" onclick="saveIncidentDecision('${i.id}')">
            <i class="ph ph-floppy-disk"></i> Save Decision
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
      <div class="uc-badge"><i class="ph ph-wrench"></i> Under Construction</div>
      <p class="uc-hint">This module will be available in one of the next releases.</p>
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
const STATUS_LABELS = {
  not_started: 'Nicht begonnen',
  partial:     'Teilweise',
  implemented: 'Umgesetzt',
  optimized:   'Optimiert'
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
      <h2 class="soa-title">Statement of Applicability</h2>
      <div class="soa-fw-tabs">${tabsHtml}</div>
      <div class="soa-summary-row">
        <span class="soa-kpi">${total} Controls</span>
        <span class="soa-kpi soa-kpi-green">${applied} anwendbar</span>
        <span class="soa-kpi soa-kpi-blue">${implRate}% umgesetzt</span>
        <a class="btn btn-export" href="/soa/export" download="soa-export.json">Export JSON</a>
        ${(ROLE_RANK[getCurrentRole()] || 0) >= ROLE_RANK['admin'] ? `<button class="btn btn-import-iso" onclick="openSoaIsoImport()" title="ISO 27001/9000/9001 Controls importieren">⬆ ISO Controls importieren</button>` : ''}
      </div>
      <div class="soa-filters">
        <select id="soaFilterTheme" class="soa-select">
          <option value="">Alle Themes</option>
          ${themes.map(t => `<option value="${t}" ${soaFilters.theme===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <select id="soaFilterStatus" class="soa-select">
          <option value="">${t('filter_allStatuses')}</option>
          ${Object.entries(STATUS_LABELS).map(([v,l]) => `<option value="${v}" ${soaFilters.status===v?'selected':''}>${l}</option>`).join('')}
        </select>
        <select id="soaFilterApplicable" class="soa-select">
          <option value="">All</option>
          <option value="yes" ${soaFilters.applicable==='yes'?'selected':''}>Applicable</option>
          <option value="no"  ${soaFilters.applicable==='no'?'selected':''}>Not Applicable</option>
        </select>
      </div>
    </div>

    <div class="soa-table-wrap">
      <table class="soa-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Theme</th>
            <th>Control</th>
            <th>Applicable</th>
            <th>Status</th>
            <th>Responsible</th>
            <th>Justification</th>
            ${canEdit ? '<th></th>' : ''}
          </tr>
        </thead>
        <!-- colCount: 7 base + 1 if canEdit = 8 total; detail rows use colspan=8 -->
        <tbody>
          ${filtered.map(c => soaRow(c, canEdit)).join('')}
        </tbody>
      </table>
      ${filtered.length === 0 ? '<div class="soa-empty">No controls found.</div>' : ''}
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
    ? `<span class="soa-linked-badge">${linkedCount} Template${linkedCount > 1 ? 's' : ''}</span>`
    : ''
  return `
    <tr class="soa-row ${c.applicable ? '' : 'soa-row-na'}" data-id="${c.id}">
      <td class="soa-id">
        <button class="soa-expand-btn" data-id="${c.id}" title="Details einblenden">&#9656;</button>
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
          ? `<input class="soa-owner-input" data-id="${c.id}" value="${c.owner||''}" placeholder="Name…">`
          : (c.owner || '—')}
      </td>
      <td>
        ${canEdit
          ? `<input class="soa-just-input" data-id="${c.id}" value="${c.justification||''}" placeholder="Justification…">`
          : (c.justification || '')}
      </td>
      ${canEdit ? `<td><button class="btn-soa-save soa-save-btn" data-id="${c.id}">Save</button></td>` : ''}
    </tr>
    <tr class="soa-detail-row" data-for="${c.id}" style="display:none;">
      <td colspan="8" class="soa-detail-cell">
        <div class="soa-detail-content" id="soa-detail-${c.id}">
          <div class="soa-detail-loading">Loading details…</div>
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
    detailEl.innerHTML = '<span class="soa-detail-error">Error loading.</span>'
  }
}

function renderSoaDetail(el, id, crossGroups, allTemplates, control, canEdit, container) {
  const linked = control.linkedTemplates || []

  // ── Cross-Mapping ──
  let crossHtml = ''
  if (crossGroups.length === 0) {
    crossHtml = '<span class="soa-detail-none">No cross-mapping for this control.</span>'
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
    : '<span class="soa-detail-none">No templates linked.</span>'

  // Template-Picker
  const unlinked = allTemplates.filter(t => !linked.includes(t.id))
  const pickerHtml = canEdit && unlinked.length > 0
    ? `<select id="soa-tmpl-picker-${id}" class="soa-tmpl-picker">
        <option value="">Link template…</option>
        ${unlinked.map(t => `<option value="${t.id}">${t.title} (${t.type})</option>`).join('')}
       </select>
       <button class="soa-tmpl-add-btn" data-id="${id}">Link</button>`
    : ''

  // ── Entity-Applicability ──
  const applicableEnts = control.applicableEntities || []
  const entLabel = applicableEnts.length === 0
    ? t('filter_allEntities')
    : applicableEnts.map(id => `<span class="tmpl-bar-pill">${id}</span>`).join('')
  const entEditorHtml = canEdit
    ? `<button class="btn btn-secondary btn-sm soa-ent-edit" data-id="${id}" style="margin-left:6px;" title="Edit applicability"><i class="ph ph-pencil-simple"></i></button>`
    : ''

  el.innerHTML = `
    <div class="soa-detail-grid">
      <section class="soa-detail-section">
        <h4 class="soa-detail-heading">Cross-Mapping (related controls)</h4>
        ${crossHtml}
      </section>
      <section class="soa-detail-section">
        <h4 class="soa-detail-heading">Linked Templates / Policies</h4>
        <div class="soa-tmpl-list" id="soa-tmpl-list-${id}">${linkedTmplHtml}</div>
        <div class="soa-tmpl-picker-row">${pickerHtml}</div>
      </section>
      <section class="soa-detail-section soa-detail-full">
        <h4 class="soa-detail-heading"><i class="ph ph-buildings"></i> Applicable Entities${entEditorHtml}</h4>
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
  if (!res.ok) { alert('Error saving template link'); return }

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
      badge.textContent = `${linkedTemplates.length} Template${linkedTemplates.length > 1 ? 's' : ''}`
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
        return showToast('Ungültige JSON-Datei.', 'error')
      }
      if (!Array.isArray(controls) || controls.length === 0) {
        return showToast('JSON muss ein Array von Controls enthalten.', 'error')
      }
      try {
        const res = await fetch('/soa/import-controls', {
          method: 'POST',
          headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
          body: JSON.stringify(controls)
        })
        const data = await res.json()
        if (!res.ok) return showToast('Fehler: ' + (data.error || res.status), 'error')
        showToast(`✓ ${data.imported} ISO-Controls importiert. Seite wird neu geladen…`, 'success')
        setTimeout(() => renderSoa(), 1200)
      } catch (e) {
        showToast('Netzwerkfehler: ' + e.message, 'error')
      }
    }
  }
  inp.click()
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

  let data, soaSummary, riskSummary, gdprDash, trainSummary, legalSummary, calEvents, goalsSummary, assetSummary, govSummary, bcmSummary, supplierSummary, findingsSummary
  try {
    const [dashRes, soaRes, riskRes, gdprRes, trainRes, legalRes, calRes, goalsRes, assetRes, govRes, bcmRes, supplierRes, findRes] = await Promise.all([
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
    ])
    if (!dashRes.ok) throw new Error('API error')
    data             = await dashRes.json()
    soaSummary       = soaRes.ok       ? await soaRes.json()       : null
    riskSummary      = riskRes.ok      ? await riskRes.json()      : null
    gdprDash         = gdprRes.ok      ? await gdprRes.json()      : null
    trainSummary     = trainRes.ok     ? await trainRes.json()     : null
    legalSummary     = legalRes.ok     ? await legalRes.json()     : null
    calEvents        = calRes.ok       ? await calRes.json()       : []
    goalsSummary     = goalsRes.ok     ? await goalsRes.json()     : null
    assetSummary     = assetRes?.ok    ? await assetRes.json()     : null
    govSummary       = govRes?.ok      ? await govRes.json()       : null
    bcmSummary       = bcmRes?.ok      ? await bcmRes.json()       : null
    supplierSummary  = supplierRes?.ok ? await supplierRes.json()  : null
    findingsSummary  = findRes?.ok     ? await findRes.json()      : null
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
      alerts.push({ color: 'var(--warning-text)', icon: 'ph-clock', text: `${data.byStatus.review} Template(s) awaiting review`, nav: 'policy' })
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
    if (alerts.length === 0) return '<p class="dash-empty" style="color:var(--success-text)"><i class="ph ph-check-circle"></i> No critical issues</p>'
    return alerts.map(a => `<div class="dash-alert dash-link" data-nav="${a.nav}" style="border-left:3px solid ${a.color};padding:6px 10px;margin-bottom:6px;background:var(--surface);border-radius:var(--radius-sm);cursor:pointer;display:flex;align-items:center;gap:8px">
      <i class="ph ${a.icon}" style="color:${a.color};font-size:1rem"></i>
      <span style="font-size:.85rem">${a.text}</span>
    </div>`).join('')
  })()

  container.innerHTML = `
    <div class="dash-isms-header">
      <h2 class="dashboard-title"><i class="ph ph-gauge"></i> ISMS Dashboard</h2>
      <span class="dash-timestamp" style="font-size:.75rem;color:var(--text-subtle)">As of: ${new Date().toLocaleDateString('en-GB', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
    </div>

    <!-- Alerts -->
    <div class="dash-section">
      <div class="dash-section-title"><i class="ph ph-bell"></i> Action Required</div>
      ${alertsHtml}
    </div>

    <!-- KPI Row 1: Templates & Compliance -->
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-files"></i> Policies & Compliance</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="policy" title="Open templates">
        <div class="kpi-value">${data.total}</div>
        <div class="kpi-label">Templates</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="policy">
        <div class="kpi-value" style="color:var(--success-text)">${data.approvalRate}%</div>
        <div class="kpi-label">Approved</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="policy">
        <div class="kpi-value" style="color:var(--warning-text)">${data.byStatus?.review || 0}</div>
        <div class="kpi-label">In Review</div>
      </div>
      ${MODULE_CONFIG.soa && soaSummary ? `<div class="dash-card kpi dash-link" data-nav="soa">
        <div class="kpi-value" style="color:var(--accent-text)">${Math.round(Object.values(soaSummary).reduce((s,fw)=>s+fw.implementationRate,0)/Object.values(soaSummary).length)}%</div>
        <div class="kpi-label">Ø Framework Rate</div>
      </div>` : ''}
    </div>

    <!-- KPI Row 2: Risiken -->
    ${MODULE_CONFIG.risk ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-chart-bar"></i> Risk Management</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="risk">
        <div class="kpi-value">${riskSummary?.total || 0}</div>
        <div class="kpi-label">Total Risks</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="risk">
        <div class="kpi-value" style="color:#f87171">${riskSummary?.byLevel?.critical || 0}</div>
        <div class="kpi-label">Critical</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="risk">
        <div class="kpi-value" style="color:#fb923c">${riskSummary?.byLevel?.high || 0}</div>
        <div class="kpi-label">High</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="risk">
        <div class="kpi-value" style="color:var(--warning-text)">${riskSummary?.openTreatments || 0}</div>
        <div class="kpi-label">Open Treatments</div>
      </div>
    </div>` : ''}

    <!-- KPI Row 3: GDPR -->
    ${MODULE_CONFIG.gdpr ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-shield-check"></i> Data Protection (GDPR)</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="gdpr">
        <div class="kpi-value">${gdprDash?.vvt?.total || 0}</div>
        <div class="kpi-label">RoPA Entries</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="gdpr">
        <div class="kpi-value" style="color:${(gdprDash?.incidents?.open||0)>0?'#f87171':'var(--success-text)'}">${gdprDash?.incidents?.open || 0}</div>
        <div class="kpi-label">Open Data Breaches</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="gdpr">
        <div class="kpi-value" style="color:var(--warning-text)">${gdprDash?.dsar?.open || 0}</div>
        <div class="kpi-label">Open DSARs</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="gdpr">
        <div class="kpi-value">${gdprDash?.toms?.implemented || 0}</div>
        <div class="kpi-label">TOMs Implemented</div>
      </div>
    </div>` : ''}

    <!-- KPI Row 3b: Sicherheitsziele -->
    ${MODULE_CONFIG.goals && goalsSummary ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-target"></i> Security Goals (ISO 27001 Cl. 6.2)</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="goals">
        <div class="kpi-value">${goalsSummary.active||0}</div>
        <div class="kpi-label">Active Goals</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="goals">
        <div class="kpi-value" style="color:#4ade80">${goalsSummary.achieved||0}</div>
        <div class="kpi-label">Achieved</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="goals">
        <div class="kpi-value" style="color:${(goalsSummary.overdue||0)>0?'#f87171':'var(--success-text)'}">${goalsSummary.overdue||0}</div>
        <div class="kpi-label">Overdue</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="goals">
        <div class="kpi-value" style="color:#60a5fa">${goalsSummary.avgProgress||0}%</div>
        <div class="kpi-label">Ø Progress</div>
      </div>
    </div>` : ''}

    <!-- KPI Row 3c: Asset Management -->
    ${MODULE_CONFIG.assets && assetSummary ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-buildings"></i> Asset Management</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="assets">
        <div class="kpi-value">${assetSummary.total || 0}</div>
        <div class="kpi-label">Total Assets</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="assets">
        <div class="kpi-value" style="color:#f87171">${assetSummary.byCriticality?.critical || 0}</div>
        <div class="kpi-label">Critical</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="assets">
        <div class="kpi-value" style="color:#fb923c">${assetSummary.criticalUnclassified || 0}</div>
        <div class="kpi-label">Unclassified crit.</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="assets">
        <div class="kpi-value" style="color:#f0b429">${assetSummary.endOfLifeSoon || 0}</div>
        <div class="kpi-label">EoL in 90 days</div>
      </div>
    </div>` : ''}

    <!-- KPI Row 3d: Governance -->
    ${MODULE_CONFIG.governance && govSummary ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-chalkboard-teacher"></i> Governance</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="governance">
        <div class="kpi-value">${govSummary.reviews?.total || 0}</div>
        <div class="kpi-label">Management Reviews</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="governance">
        <div class="kpi-value" style="color:${(govSummary.actions?.overdue||0)>0?'#f87171':'var(--success-text)'}">
          ${govSummary.actions?.overdue || 0}
        </div>
        <div class="kpi-label">Actions Overdue</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="governance">
        <div class="kpi-value" style="color:var(--warning-text)">${govSummary.actions?.open || 0}</div>
        <div class="kpi-label">Open Actions</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="governance">
        <div class="kpi-value">${govSummary.meetings?.total || 0}</div>
        <div class="kpi-label">Meetings</div>
      </div>
    </div>` : ''}

    ${MODULE_CONFIG.bcm && bcmSummary ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-heartbeat"></i> Business Continuity (BCM)</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="bcm">
        <div class="kpi-value">${bcmSummary.plans?.total || 0}</div>
        <div class="kpi-label">Continuity Plans</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="bcm">
        <div class="kpi-value" style="color:var(--success-text)">${bcmSummary.plans?.tested || 0}</div>
        <div class="kpi-label">Tested Plans</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="bcm">
        <div class="kpi-value" style="color:#f87171">${bcmSummary.bia?.critical || 0}</div>
        <div class="kpi-label">Critical Processes</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="bcm">
        <div class="kpi-value" style="color:${(bcmSummary.plans?.overdueTest||0)>0?'#f87171':'var(--success-text)'}">
          ${bcmSummary.plans?.overdueTest || 0}
        </div>
        <div class="kpi-label">Tests Overdue</div>
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
        <div class="kpi-label">Critical Suppliers</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="suppliers">
        <div class="kpi-value" style="color:${(supplierSummary.overdueAudits||0)>0?'#f87171':'var(--success-text)'}">
          ${supplierSummary.overdueAudits || 0}
        </div>
        <div class="kpi-label">Audits Overdue</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="suppliers">
        <div class="kpi-value" style="color:var(--warning-text)">${supplierSummary.withDataAccess || 0}</div>
        <div class="kpi-label">With Data Access</div>
      </div>
    </div>` : ''}

    <!-- KPI Row: Audit-Feststellungen -->
    ${findingsSummary ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-magnifying-glass"></i> Audit Findings</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      <div class="dash-card kpi dash-link" data-nav="reports">
        <div class="kpi-value">${findingsSummary.total || 0}</div>
        <div class="kpi-label">Total Findings</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="reports">
        <div class="kpi-value" style="color:${(findingsSummary.byStatus?.open||0)>0?'#fb923c':'var(--success-text)'}">
          ${findingsSummary.byStatus?.open || 0}
        </div>
        <div class="kpi-label">Open</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="reports">
        <div class="kpi-value" style="color:${(findingsSummary.bySeverity?.critical||0)>0?'#f87171':(findingsSummary.bySeverity?.high||0)>0?'#fb923c':'var(--success-text)'}">
          ${(findingsSummary.bySeverity?.critical||0) + (findingsSummary.bySeverity?.high||0)}
        </div>
        <div class="kpi-label">Critical/High</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="reports">
        <div class="kpi-value" style="color:${(findingsSummary.overdueActions||0)>0?'#f87171':'var(--success-text)'}">
          ${findingsSummary.overdueActions || 0}
        </div>
        <div class="kpi-label">Actions Overdue</div>
      </div>
    </div>` : ''}

    <!-- KPI Row 4: Legal & Training -->
    ${(MODULE_CONFIG.legal || MODULE_CONFIG.training) ? `
    <div class="dash-section-title" style="margin:16px 0 8px"><i class="ph ph-briefcase"></i> Legal & Training</div>
    <div class="dashboard-grid" style="margin-bottom:0">
      ${MODULE_CONFIG.legal ? `
      <div class="dash-card kpi dash-link" data-nav="legal">
        <div class="kpi-value">${legalSummary?.contracts?.active || 0}</div>
        <div class="kpi-label">Active Contracts</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="legal">
        <div class="kpi-value" style="color:${(legalSummary?.contracts?.expiring||0)>0?'#fb923c':'var(--success-text)'}">${legalSummary?.contracts?.expiring || 0}</div>
        <div class="kpi-label">Contracts Expiring</div>
      </div>` : ''}
      ${MODULE_CONFIG.training ? `
      <div class="dash-card kpi dash-link" data-nav="training">
        <div class="kpi-value">${trainSummary?.completionRate || 0}%</div>
        <div class="kpi-label">Training Rate</div>
      </div>
      <div class="dash-card kpi dash-link" data-nav="training">
        <div class="kpi-value" style="color:${(trainSummary?.overdue||0)>0?'#f87171':'var(--success-text)'}">${trainSummary?.overdue || 0}</div>
        <div class="kpi-label">Overdue Trainings</div>
      </div>` : ''}
    </div>` : ''}

    <!-- Framework-Compliance -->
    ${MODULE_CONFIG.soa && soaSummary ? `
    <div class="dash-section" style="margin-top:16px">
      <div class="dash-section-title"><i class="ph ph-check-square"></i> Framework-Compliance</div>
      <div class="fw-summary-grid">
        ${Object.values(soaSummary).map(fw => `
          <div class="fw-summary-item dash-link" data-nav="soa" data-fw="${fw.framework}" title="Open ${fw.label}" style="cursor:pointer">
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
        <div class="dash-card-title"><i class="ph ph-chart-bar"></i> Top-5 Risiken</div>
        ${riskSummary?.top5?.length ? `
        <table style="width:100%;font-size:.8rem;border-collapse:collapse">
          ${riskSummary.top5.map(r => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:4px 0">${escHtml(r.title)}</td>
              <td style="padding:4px 6px;text-align:right">
                <span style="color:${riskColors[r.riskLevel]};font-weight:600">${r.score}</span>
              </td>
            </tr>`).join('')}
        </table>` : '<p class="dash-empty">No risks found</p>'}
      </div>` : ''}

      ${MODULE_CONFIG.calendar ? `
      <div class="dash-card">
        <div class="dash-card-title"><i class="ph ph-calendar-check"></i> Next 14 Days</div>
        ${upcoming.length ? `
        <ul style="list-style:none;padding:0;margin:0;font-size:.8rem">
          ${upcoming.map(ev => `
            <li style="padding:4px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px">
              <span class="cal-chip ${ev.type}" style="font-size:.7rem;padding:1px 5px;border-radius:3px">${ev.type.replace(/_/g,' ')}</span>
              <span>${escHtml(ev.title)}</span>
              <span style="margin-left:auto;color:var(--text-subtle)">${new Date(ev.date).toLocaleDateString('en-GB')}</span>
            </li>`).join('')}
        </ul>` : '<p class="dash-empty">No upcoming events</p>'}
      </div>` : ''}
    </div>` : ''}

    <!-- Recent Activity -->
    <div class="dash-card" style="margin-top:12px">
      <div class="dash-card-title"><i class="ph ph-activity"></i> Recent Activity</div>
      ${data.recentActivity.length === 0
        ? '<p class="dash-empty">No activity yet.</p>'
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
        <h2><i class="ph ph-wrench"></i> Administration</h2>
      </div>
      <div class="admin-tab-bar">
        <button class="admin-tab active" id="adminTabUsers" onclick="adminShowTab('users')">
          <i class="ph ph-users"></i> Users
        </button>
        <button class="admin-tab" id="adminTabEntities" onclick="adminShowTab('entities')">
          <i class="ph ph-buildings"></i> Entities
        </button>
        <button class="admin-tab" id="adminTabTemplates" onclick="adminShowTab('templates')">
          <i class="ph ph-files"></i> Templates
        </button>
        <button class="admin-tab" id="adminTabLists" onclick="adminShowTab('lists')">
          <i class="ph ph-list-bullets"></i> Lists
        </button>
        <button class="admin-tab" id="adminTabOrg" onclick="adminShowTab('org')">
          <i class="ph ph-buildings"></i> Organisation
        </button>
        <button class="admin-tab" id="adminTabAudit" onclick="adminShowTab('audit')">
          <i class="ph ph-scroll"></i> Audit Log
        </button>
        <button class="admin-tab" id="adminTabMaintenance" onclick="adminShowTab('maintenance')">
          <i class="ph ph-hard-drives"></i> Maintenance
        </button>
        <button class="admin-tab" id="adminTabTrash" onclick="adminShowTab('trash')">
          <i class="ph ph-trash-simple"></i> Trash
        </button>
        <button class="admin-tab" id="adminTabModules" onclick="adminShowTab('modules')">
          <i class="ph ph-sliders"></i> System Configuration
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
  container.innerHTML = '<p class="report-loading">Loading…</p>'
  const res = await fetch('/templates', { headers: apiHeaders('reader') })
  if (!res.ok) { container.innerHTML = '<p class="report-error">Error loading</p>'; return }
  const templates = await res.json()
  if (templates.length === 0) {
    container.innerHTML = '<p style="color:var(--text-subtle);padding:12px;">No templates found.</p>'
    return
  }
  const STATUS_CLS = { draft: 'status-draft', review: 'status-review', approved: 'status-approved', archived: 'status-archived' }
  container.innerHTML = `
    <table class="admin-user-table" style="margin-top:12px;">
      <thead>
        <tr>
          <th>Title</th>
          <th>Type</th>
          <th>Status</th>
          <th>Language</th>
          <th>Version</th>
          <th>Modified</th>
          <th style="width:50px;"></th>
        </tr>
      </thead>
      <tbody>
        ${templates.map(t => `
          <tr>
            <td>${escHtml(t.title || '—')}</td>
            <td><span class="badge">${escHtml(t.type || '—')}</span></td>
            <td><span class="badge status-badge ${STATUS_CLS[t.status] || ''}">${t.status || 'draft'}</span></td>
            <td>${escHtml(t.language || '—')}</td>
            <td>${t.version || 1}</td>
            <td style="color:var(--text-subtle);font-size:12px;">${t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('en-GB') : '—'}</td>
            <td>
              <button class="btn btn-sm" style="color:var(--danger-text);" title="Delete"
                onclick="adminDeleteTemplate('${escHtml(t.type)}','${escHtml(t.id)}','${escHtml(t.title || '')}')">
                <i class="ph ph-trash"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`
}

async function adminDeleteTemplate(type, id, title) {
  if (!confirm(`Delete template "${title}"?`)) return
  const res = await fetch(`/template/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: apiHeaders('admin')
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error deleting'); return }
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
]

let _adminListsData   = null  // cached from server
let _adminActiveList  = LIST_META[0].id

async function renderAdminListsTab() {
  const container = document.getElementById('adminTabPanelLists')
  if (!container) return
  container.innerHTML = '<p class="report-loading">Loading…</p>'

  const res = await fetch('/admin/lists', { headers: apiHeaders() })
  if (!res.ok) { container.innerHTML = '<p class="report-empty">Error loading.</p>'; return }
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
        <button class="btn btn-sm" onclick="_adminListReset('${meta.id}')" title="Restore defaults">
          <i class="ph ph-arrow-counter-clockwise"></i> Reset
        </button>
      </div>
      <div class="admin-lists-add-row">
        <input class="input" id="adminListNewVal" placeholder="New entry…" style="flex:1"
               onkeydown="if(event.key==='Enter')_adminListAddString()">
        <button class="btn btn-primary btn-sm" onclick="_adminListAddString()">
          <i class="ph ph-plus"></i> Add
        </button>
      </div>
      <div class="admin-lists-items">
        ${items.map((val, idx) => `
          <div class="admin-lists-item">
            <input class="input admin-lists-item-input" value="${escHtml(val)}"
                   onchange="_adminListUpdateString(${idx}, this.value)">
            <button class="btn btn-sm" style="color:var(--danger-text)" onclick="_adminListRemoveItem(${idx})"
                    title="Remove"><i class="ph ph-trash"></i></button>
          </div>`).join('')}
      </div>`
  } else {
    panel.innerHTML = `
      <div class="admin-lists-panel-header">
        <span class="admin-panel-title">${escHtml(meta.label)}</span>
        <button class="btn btn-sm" onclick="_adminListReset('${meta.id}')" title="Restore defaults">
          <i class="ph ph-arrow-counter-clockwise"></i> Reset
        </button>
      </div>
      <div class="admin-lists-add-row" style="gap:6px">
        <input class="input" id="adminListNewId"    placeholder="ID (e.g. my_cat)"  style="width:160px">
        <input class="input" id="adminListNewLabel" placeholder="Label…"             style="flex:1"
               onkeydown="if(event.key==='Enter')_adminListAddObject()">
        <button class="btn btn-primary btn-sm" onclick="_adminListAddObject()">
          <i class="ph ph-plus"></i> Add
        </button>
      </div>
      <div class="admin-lists-items">
        ${items.map((item, idx) => `
          <div class="admin-lists-item">
            <input class="input admin-lists-item-id" value="${escHtml(item.id || '')}"
                   placeholder="ID" style="width:160px"
                   onchange="_adminListUpdateObjectField(${idx},'id',this.value)">
            <input class="input admin-lists-item-input" value="${escHtml(item.label || '')}"
                   placeholder="Label" style="flex:1"
                   onchange="_adminListUpdateObjectField(${idx},'label',this.value)">
            <button class="btn btn-sm" style="color:var(--danger-text)" onclick="_adminListRemoveItem(${idx})"
                    title="Remove"><i class="ph ph-trash"></i></button>
          </div>`).join('')}
      </div>`
  }
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
  const id    = document.getElementById('adminListNewId')?.value?.trim().replace(/\s+/g, '_')
  const label = document.getElementById('adminListNewLabel')?.value?.trim()
  if (!id || !label) { alert('ID and label are required.'); return }
  _adminListsData[_adminActiveList] = [...(_adminListsData[_adminActiveList] || []), { id, label }]
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
  if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Save failed') }
}

async function _adminListReset(listId) {
  if (!confirm('Reset list to default values?')) return
  const res = await fetch(`/admin/list/${encodeURIComponent(listId)}/reset`, {
    method: 'POST', headers: apiHeaders('admin'),
  })
  if (!res.ok) { alert('Error resetting'); return }
  _adminListsData[listId] = await res.json()
  _renderListPanel()
}

// ── Admin: Ende Listen-Verwaltung ────────────────────────────────────────────

// ── Admin: Organisationsdaten ─────────────────────────────────────────────────

async function renderAdminOrgTab() {
  const container = document.getElementById('adminTabPanelOrg')
  if (!container) return
  container.innerHTML = '<p class="report-loading">Loading…</p>'
  const [orgRes, secRes] = await Promise.all([
    fetch('/admin/org-settings', { headers: apiHeaders() }),
    fetch('/admin/security',     { headers: apiHeaders() }),
  ])
  if (!orgRes.ok) { container.innerHTML = '<p class="report-empty">Error loading.</p>'; return }
  const s    = await orgRes.json()
  const sec  = secRes.ok ? await secRes.json() : { require2FA: false }
  const en   = s.emailNotifications || {}
  const smtp = s.smtpSettings || {}
  const nav  = Array.isArray(s.navOrder) && s.navOrder.length ? s.navOrder : _NAV_ORDER_DEFAULT.slice()

  container.innerHTML = `
    <div class="org-settings-panel">
      <div class="admin-lists-panel-header" style="margin-bottom:16px">
        <span class="admin-panel-title"><i class="ph ph-buildings"></i> Organisation Data & Configuration</span>
        <button class="btn btn-primary btn-sm" onclick="saveOrgSettings()"><i class="ph ph-floppy-disk"></i> Save</button>
      </div>

      <div class="org-section">
        <h4 class="org-section-title">General Information</h4>
        <div class="org-grid">
          <label class="org-label">Organisation Name</label>
          <input class="input" id="orgName" value="${escHtml(s.orgName||'')}" placeholder="Example Ltd">
          <label class="org-label">Short Name</label>
          <input class="input" id="orgShort" value="${escHtml(s.orgShort||'')}" placeholder="EL">
          <label class="org-label">Logo Text / Abbreviation</label>
          <input class="input" id="orgLogoText" value="${escHtml(s.logoText||'')}" placeholder="ISMS">
          <label class="org-label">ISMS Scope</label>
          <textarea class="input" id="orgScope" rows="3" style="resize:vertical">${escHtml(s.ismsScope||'')}</textarea>
        </div>
      </div>

      <div class="org-section">
        <h4 class="org-section-title">Responsibilities</h4>
        <div class="org-grid">
          <label class="org-label">CISO / ISB Name</label>
          <input class="input" id="orgCisoName" value="${escHtml(s.cisoName||'')}">
          <label class="org-label">CISO / ISB E-Mail</label>
          <input class="input" id="orgCisoEmail" value="${escHtml(s.cisoEmail||'')}" type="email">
          <label class="org-label">DPO / GDPO Name</label>
          <input class="input" id="orgGdpoName" value="${escHtml(s.gdpoName||'')}">
          <label class="org-label">DPO / GDPO E-Mail</label>
          <input class="input" id="orgGdpoEmail" value="${escHtml(s.gdpoEmail||'')}" type="email">
          <label class="org-label">ICS Contact</label>
          <input class="input" id="orgIcsContact" value="${escHtml(s.icsContact||'')}">
        </div>
      </div>

      <div class="org-section" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <h4 class="org-section-title"><i class="ph ph-shield-check"></i> Security Policies</h4>
        <div style="display:flex;align-items:flex-start;gap:14px;padding:12px 0">
          <label class="module-toggle" style="margin-top:2px;flex-shrink:0">
            <input type="checkbox" id="org2FAEnforce" ${sec.require2FA ? 'checked' : ''}>
            <span class="module-toggle-slider"></span>
          </label>
          <div>
            <div style="font-weight:600;font-size:.9rem">Enforce two-factor authentication (2FA) system-wide</div>
            <div style="font-size:.8rem;color:var(--text-subtle);margin-top:3px">
              When enabled, users <strong>cannot log in without 2FA configured</strong>.
              Login will be rejected with an explanatory message.
            </div>
            <div class="settings-notice" style="margin-top:8px;font-size:.78rem">
              <i class="ph ph-warning"></i>
              <strong>Warning:</strong> Only enable if <em>all</em> user accounts already have 2FA set up.
              Otherwise affected accounts will be locked out immediately.
            </div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveSecuritySettings()">
          <i class="ph ph-floppy-disk"></i> Save security settings
        </button>
        <p id="secSaveMsg" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <div class="org-section" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <h4 class="org-section-title"><i class="ph ph-translate"></i> Language Configuration</h4>
        <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:12px">
          Enable or disable languages system-wide. The default language is shown on the login page
          for users without a stored preference.
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:14px">
          ${[{code:'de',label:'🇩🇪 Deutsch'},{code:'en',label:'🇬🇧 English'},{code:'fr',label:'🇫🇷 Français'},{code:'nl',label:'🇳🇱 Nederlands'}].map(l => `
            <label style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer">
              <input type="checkbox" id="langAvail_${l.code}" ${(_langConfig?.available||['de','en','fr','nl']).includes(l.code)?'checked':''}>
              <span style="font-size:.9rem">${l.label}</span>
            </label>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <label style="font-size:.85rem;color:var(--text-muted);flex-shrink:0">Default language:</label>
          <select id="langDefault" style="padding:5px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:.85rem">
            ${[{code:'de',label:'Deutsch'},{code:'en',label:'English'},{code:'fr',label:'Français'},{code:'nl',label:'Nederlands'}].map(l =>
              `<option value="${l.code}" ${(_langConfig?.default||'en')===l.code?'selected':''}>${l.label}</option>`
            ).join('')}
          </select>
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveLangConfig()">
          <i class="ph ph-floppy-disk"></i> Save language settings
        </button>
        <p id="langConfigMsg" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <div class="org-section" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <h4 class="org-section-title"><i class="ph ph-envelope"></i> E-Mail Notifications</h4>
        <div class="settings-notice" style="margin-bottom:12px">
          <i class="ph ph-info"></i>
          SMTP credentials are configured in the <code>.env</code> file (<code>SMTP_HOST</code>, <code>SMTP_USER</code> etc.).
          Only notification types are controlled here.
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <label class="module-toggle" style="flex-shrink:0">
            <input type="checkbox" id="emailEnabled" ${en.enabled ? 'checked' : ''}>
            <span class="module-toggle-slider"></span>
          </label>
          <div>
            <div style="font-weight:600;font-size:.9rem">Enable daily digest e-mails</div>
            <div style="font-size:.8rem;color:var(--text-subtle)">Sends a daily summary to CISO, GDPO and admin e-mail once per day.</div>
          </div>
        </div>
        <div class="org-grid">
          <label class="org-label">Admin E-Mail</label>
          <input class="input" id="emailAdminEmail" value="${escHtml(en.adminEmail||'')}" type="email" placeholder="admin@example.com">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
          ${[
            ['emailRisks',          en.risks,          'High/critical risks',                  '→ CISO e-mail'],
            ['emailBcm',            en.bcm,            'BCM tests due (≤ 14 days)',             '→ CISO e-mail'],
            ['emailSupplierAudits', en.supplierAudits, 'Supplier audits due (≤ 14 days)',       '→ CISO e-mail'],
            ['emailDsar',           en.dsar,           'DSAR deadlines (≤ 3 days)',             '→ GDPO e-mail'],
            ['emailGdprIncidents',  en.gdprIncidents,  'GDPR incidents > 48h open',             '→ GDPO e-mail'],
            ['emailDeletionLog',    en.deletionLog,    'Deletion log Art. 17 GDPR',             '→ GDPO e-mail'],
            ['emailContracts',      en.contracts,      'Expiring contracts (≤ 30 days)',        '→ Admin e-mail'],
            ['emailTemplateReview', en.templateReview, 'Template review due (≤ 14 days)',       '→ Admin e-mail'],
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
          <i class="ph ph-floppy-disk"></i> Save e-mail settings
        </button>
        <p id="emailSaveMsg" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <div class="org-section" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <h4 class="org-section-title"><i class="ph ph-paper-plane-tilt"></i> SMTP Configuration</h4>
        <div class="settings-notice" style="margin-bottom:12px">
          <i class="ph ph-warning"></i>
          <strong>Security notice:</strong> The SMTP password is stored in <code>org-settings.json</code> (plaintext).
          For higher security, use environment variables (<code>SMTP_HOST</code> etc.) in <code>.env</code> — these always take precedence.
        </div>
        <div id="smtpEnvBanner" style="display:none;padding:8px 12px;border-radius:6px;background:var(--bg-info,#1e3a5f);color:var(--info,#93c5fd);font-size:.82rem;margin-bottom:12px">
          <i class="ph ph-info"></i> SMTP is configured via <code>.env</code> variables — UI settings are ignored.
        </div>
        <div class="org-grid">
          <label class="org-label">SMTP Host</label>
          <input class="input" id="smtpHost" value="${escHtml(smtp.host||'')}" placeholder="smtp.example.com">
          <label class="org-label">Port</label>
          <input class="input" id="smtpPort" value="${smtp.port||587}" type="number" style="max-width:120px">
          <label class="org-label">TLS / Encryption</label>
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
          <label class="org-label">Username</label>
          <input class="input" id="smtpUser" value="${escHtml(smtp.user||'')}" placeholder="isms@example.com" autocomplete="off">
          <label class="org-label">Password</label>
          <input class="input" id="smtpPass" type="password" value="${escHtml(smtp.pass||'')}" placeholder="••••••••" autocomplete="new-password">
          <label class="org-label">Sender (From)</label>
          <input class="input" id="smtpFrom" value="${escHtml(smtp.from||'')}" placeholder="ISMS Builder <isms@example.com>">
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;align-items:center">
          <button class="btn btn-primary btn-sm" onclick="saveSmtpSettings()">
            <i class="ph ph-floppy-disk"></i> Save SMTP
          </button>
          <button class="btn btn-secondary btn-sm" onclick="sendTestMail()">
            <i class="ph ph-paper-plane-tilt"></i> Send test mail
          </button>
          <span id="smtpSaveMsg" style="font-size:13px;display:none"></span>
        </div>
        <div style="margin-top:10px;font-size:.8rem;color:var(--text-subtle)">
          Test mail will be sent to the CISO e-mail (${escHtml(s.cisoEmail || '–')}).
          Please enter a CISO e-mail under Responsibilities first.
        </div>
      </div>

      <div class="org-section" style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
        <h4 class="org-section-title"><i class="ph ph-list-numbers"></i> Menu Order</h4>
        <p style="font-size:.82rem;color:var(--text-subtle);margin:0 0 12px">
          Drag entries with <i class="ph ph-dots-six-vertical"></i> or use ↑/↓ to adjust the sidebar order.
          Dashboard, Admin and Settings are always shown.
        </p>
        <div id="navOrderList" style="display:flex;flex-direction:column;gap:4px;max-width:380px">
          ${_renderNavOrderItems(nav)}
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="saveNavOrder()">
          <i class="ph ph-floppy-disk"></i> Save order
        </button>
        <button class="btn btn-secondary btn-sm" style="margin-top:12px;margin-left:8px" onclick="resetNavOrder()">
          <i class="ph ph-arrow-counter-clockwise"></i> Default
        </button>
        <p id="navOrderSaveMsg" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <p id="orgSaveMsg" style="margin-top:10px;font-size:13px;color:var(--success,#4ade80);display:none"></p>
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
    msg.textContent = 'Saved.'; msg.style.color = 'var(--success,#4ade80)'; msg.style.display = ''
    setTimeout(() => { msg.style.display = 'none' }, 3000)
  } else {
    const e = await res.json().catch(() => ({}))
    msg.textContent = e.error || 'Error saving'; msg.style.color = 'var(--danger-text,#f87171)'; msg.style.display = ''
  }
}

async function saveLangConfig() {
  const available = ['de','en','fr','nl'].filter(c => document.getElementById('langAvail_'+c)?.checked)
  if (available.length === 0) {
    const msg = document.getElementById('langConfigMsg')
    msg.textContent = 'At least one language must be enabled.'; msg.style.color = 'var(--danger-text,#f87171)'; msg.style.display = ''
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
    msg.textContent = 'Language settings saved.'; msg.style.color = 'var(--success,#4ade80)'
  } else {
    msg.textContent = 'Error saving.'; msg.style.color = 'var(--danger-text,#f87171)'
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
    msg.textContent = `2FA enforcement ${require2FA ? 'enabled' : 'disabled'}.`
    msg.style.color = 'var(--success,#4ade80)'
  } else {
    msg.textContent = 'Error saving.'
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
    msg.textContent = 'Splash screen settings saved.'
    msg.style.color = 'var(--success,#4ade80)'
  } else {
    msg.textContent = 'Error saving.'
    msg.style.color = 'var(--danger-text,#f87171)'
  }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

// ── Nav-Reihenfolge Hilfsfunktion ─────────────────────────────────────────────

const _NAV_ORDER_DEFAULT = ['dashboard','soa','guidance','goals','risk','legal','incident','gdpr','training','assets','governance','bcm','suppliers','reports','calendar','settings','admin']

function _renderNavOrderItems(order) {
  const list = (order && order.length) ? order : _NAV_ORDER_DEFAULT.slice()
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
            <button onclick="navOrderMove('${escHtml(sid)}',-1)" class="btn-icon-sm" title="Nach oben"><i class="ph ph-arrow-up"></i></button>
            <button onclick="navOrderMove('${escHtml(sid)}',1)"  class="btn-icon-sm" title="Nach unten"><i class="ph ph-arrow-down"></i></button>
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
    msg.textContent = 'Order saved. Reload the page for the change to take effect.'
    msg.style.color = 'var(--success,#4ade80)'
    // live update nav
    populateSectionNav()
  } else {
    msg.textContent = 'Error saving.'
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
    msg.textContent = 'SMTP saved.'
    msg.style.color = 'var(--success,#4ade80)'
  } else {
    msg.textContent = 'Error saving.'
    msg.style.color = 'var(--danger-text,#f87171)'
  }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

async function sendTestMail() {
  const msg = document.getElementById('smtpSaveMsg')
  msg.style.display = ''
  msg.textContent = 'Sending test mail…'
  msg.style.color = 'var(--text-subtle)'

  // Recipient: CISO e-mail from the form (if currently open) or org settings
  const to = document.getElementById('orgCisoEmail')?.value.trim()
  if (!to) {
    msg.textContent = 'CISO email missing — please enter it first and save org settings.'
    msg.style.color = 'var(--danger-text,#f87171)'
    return
  }
  const res = await fetch('/admin/email/test', {
    method: 'POST',
    headers: { ...apiHeaders('admin'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ to }),
  })
  if (res.ok) {
    msg.textContent = `Test mail sent to ${to}.`
    msg.style.color = 'var(--success,#4ade80)'
  } else {
    const e = await res.json().catch(() => ({}))
    msg.textContent = `Error: ${e.error || 'SMTP connection failed'}`
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
    msg.textContent = 'E-mail settings saved.'
    msg.style.color = 'var(--success,#4ade80)'
  } else {
    msg.textContent = 'Error saving.'
    msg.style.color = 'var(--danger-text,#f87171)'
  }
  setTimeout(() => { msg.style.display = 'none' }, 3000)
}

// ── Admin: Audit-Log ──────────────────────────────────────────────────────────

const AUDIT_ACTION_LABELS = {
  create:'Created', update:'Updated', delete:'Deleted',
  login:'Login', logout:'Logout', export:'Export', settings:'Settings',
}
const AUDIT_RESOURCE_LABELS = {
  template:'Template', risk:'Risk', user:'User', incident:'Incident',
  org:'Organisation', gdpr:'GDPR', soa:'SoA', list:'List', entity:'Entity', audit:'Audit Log',
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
        <span class="admin-panel-title"><i class="ph ph-scroll"></i> Audit Log</span>
        <button class="btn btn-sm" style="color:var(--danger-text)" onclick="clearAuditLog()">
          <i class="ph ph-trash"></i> Clear log
        </button>
      </div>
      <div class="audit-filter-bar">
        <input class="input" id="auditFilterUser" placeholder="User…" style="width:180px"
               oninput="loadAuditLog()">
        <select class="select" id="auditFilterAction" onchange="loadAuditLog()" style="width:140px">
          <option value="">All actions</option>
          ${Object.entries(AUDIT_ACTION_LABELS).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>
        <select class="select" id="auditFilterResource" onchange="loadAuditLog()" style="width:140px">
          <option value="">All resources</option>
          ${Object.entries(AUDIT_RESOURCE_LABELS).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>
        <input class="input" id="auditFilterFrom" type="date" title="From" onchange="loadAuditLog()" style="width:140px">
        <input class="input" id="auditFilterTo"   type="date" title="To" onchange="loadAuditLog()" style="width:140px">
      </div>
      <div id="auditLogTable"></div>
      <div id="auditPager" style="padding:10px 0;display:flex;gap:8px;align-items:center"></div>
    </div>`
  loadAuditLog()
}

async function loadAuditLog() {
  const container = document.getElementById('auditLogTable')
  if (!container) return
  container.innerHTML = '<p class="report-loading">Loading…</p>'

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
  if (!res.ok) { container.innerHTML = '<p class="report-empty">Error loading.</p>'; return }
  const { total, entries } = await res.json()

  if (!entries.length) {
    container.innerHTML = '<p class="report-empty">No entries.</p>'
  } else {
    container.innerHTML = `
      <table class="admin-user-table audit-table">
        <thead><tr>
          <th style="width:150px">Timestamp</th>
          <th style="width:180px">User</th>
          <th style="width:100px">Action</th>
          <th style="width:110px">Resource</th>
          <th>Detail</th>
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
      <span style="font-size:12px;color:var(--text-subtle)">${total} entries total</span>
      <button class="btn btn-sm" onclick="_auditOffset=Math.max(0,_auditOffset-${_AUDIT_LIMIT});loadAuditLog()"
              ${_auditOffset === 0 ? 'disabled' : ''}><i class="ph ph-caret-left"></i></button>
      <span style="font-size:12px">${curPage} / ${totPages}</span>
      <button class="btn btn-sm" onclick="_auditOffset=_auditOffset+${_AUDIT_LIMIT};loadAuditLog()"
              ${_auditOffset + _AUDIT_LIMIT >= total ? 'disabled' : ''}><i class="ph ph-caret-right"></i></button>`
  }
}

async function clearAuditLog() {
  if (!confirm('Really clear the audit log? This action cannot be undone.')) return
  const res = await fetch('/admin/audit-log', { method: 'DELETE', headers: apiHeaders('admin') })
  if (res.ok) loadAuditLog()
  else alert('Error clearing the log.')
}

// ── Admin: Daten & Wartung ────────────────────────────────────────────────────

async function renderAdminMaintenanceTab() {
  const container = document.getElementById('adminTabPanelMaintenance')
  if (!container) return
  container.innerHTML = `
    <div class="maintenance-panel">
      <div class="admin-lists-panel-header" style="margin-bottom:16px">
        <span class="admin-panel-title"><i class="ph ph-hard-drives"></i> Data & Maintenance</span>
      </div>

      <!-- ── Production transition notice ── -->
      <div id="productionHintBox" style="display:none;margin-bottom:20px;padding:16px 20px;border-radius:8px;border:2px solid #f59e0b;background:rgba(245,158,11,.08);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <i class="ph ph-warning" style="color:#f59e0b;font-size:20px;flex-shrink:0"></i>
          <strong style="color:#f59e0b;font-size:15px;">Transition to production — server restart required</strong>
        </div>
        <p style="margin:0 0 10px;font-size:13px;color:var(--text);">
          The demo reset has set <code>STORAGE_BACKEND=sqlite</code> in <code>.env</code>.
          The change will take effect after a server restart.
          Until then the server is still running with the old backend.
        </p>
        <div style="background:var(--bg);border-radius:6px;padding:10px 14px;font-size:12px;font-family:monospace;color:var(--text);">
          # Restart (direct):<br>
          npm start<br><br>
          # Restart (Docker):<br>
          docker compose restart
        </div>
        <p style="margin:10px 0 0;font-size:12px;color:var(--text-subtle);">
          After restart, the system stores all data in <code>data/isms.db</code> (SQLite, WAL mode).
          JSON files are retained as a fallback backup.
        </p>
      </div>

      <div class="maintenance-section">
        <h4 class="org-section-title"><i class="ph ph-database"></i> Storage Backend</h4>
        <div id="storageBackendInfo" style="font-size:13px;padding:10px 14px;background:var(--bg-card);border-radius:6px;border:1px solid var(--border);margin-bottom:6px;">
          Loading…
        </div>
        <p class="settings-desc">
          <strong>JSON</strong> — for demo and development only.
          <strong>SQLite</strong> — required for production (ACID-compliant, WAL mode, no data loss on crash).
          The demo reset automatically sets <code>STORAGE_BACKEND=sqlite</code> in <code>.env</code> and
          requires a server restart afterwards.
        </p>
      </div>

      <div class="maintenance-section">
        <h4 class="org-section-title">Backup & Export</h4>
        <p class="settings-desc">
          Exports all data (templates, SoA, risks, GDPR, users, settings) as a single JSON file.
          Attachments (PDF/DOCX) are not included.
        </p>
        <button class="btn btn-primary" onclick="triggerExport()">
          <i class="ph ph-download-simple"></i> Download full export
        </button>
      </div>

      <div class="maintenance-section" style="margin-top:20px">
        <h4 class="org-section-title">Clean up orphaned attachments</h4>
        <p class="settings-desc">
          Removes files from the upload directory that are no longer associated with any template.
        </p>
        <button class="btn" onclick="runCleanup()" id="btnCleanup">
          <i class="ph ph-broom"></i> Start cleanup
        </button>
        <p id="cleanupResult" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <div class="maintenance-section" id="aiSettingsSection" style="margin-top:24px;border-top:1px solid var(--border);padding-top:20px">
        <h4 class="org-section-title"><i class="ph ph-robot"></i> AI Integration (Ollama)</h4>
        <p class="settings-desc">
          Controls semantic search and future AI features. Ollama must be installed and running locally.
          If Ollama is unavailable, features can be disabled here —
          the topbar search will then fall back to "unavailable".
        </p>

        <div id="aiStatusBadge" style="margin-bottom:14px"></div>

        <div class="settings-group" style="margin-bottom:14px">
          <label class="settings-label">Enable AI search</label>
          <label class="toggle-switch" style="margin-top:4px">
            <input type="checkbox" id="aiEnabledToggle" onchange="saveAiSettings()" />
            <span class="toggle-slider"></span>
          </label>
          <p class="settings-desc" style="margin-top:4px">
            Global switch — disables all AI features system-wide.
          </p>
        </div>

        <div id="aiAdvancedSettings">
          <div class="settings-group" style="margin-bottom:10px">
            <label class="settings-label" for="aiOllamaUrlInput">Ollama URL</label>
            <input class="form-input" id="aiOllamaUrlInput" placeholder="http://localhost:11434 (default)"
                   style="max-width:320px" onblur="saveAiSettings()" />
          </div>
          <div class="settings-group" style="margin-bottom:14px">
            <label class="settings-label" for="aiEmbedModelInput">Embedding model</label>
            <input class="form-input" id="aiEmbedModelInput" placeholder="nomic-embed-text (default)"
                   style="max-width:220px" onblur="saveAiSettings()" />
          </div>

          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="triggerReindex()" id="btnReindex">
              <i class="ph ph-arrows-clockwise"></i> Rebuild index
            </button>
            <button class="btn" onclick="refreshAiStatus()">
              <i class="ph ph-plugs-connected"></i> Check status
            </button>
          </div>
          <p id="reindexResult" style="margin-top:8px;font-size:13px;display:none"></p>
        </div>
      </div>

      <div class="maintenance-section" style="margin-top:24px;border-top:1px solid var(--border);padding-top:20px">
        <h4 class="org-section-title" style="color:#e74c3c"><i class="ph ph-arrow-counter-clockwise"></i> Demo Reset</h4>
        <p class="settings-desc">
          Exports all current demo data, then deletes all module data and users (except admin)
          and resets the admin account to <code>adminpass</code> without 2FA.
          The exported JSON file is automatically downloaded.
          After the reset, a notice for the administrator will appear on the login page.
        </p>
        <button class="btn" style="background:rgba(231,76,60,.15);border-color:#e74c3c;color:#e74c3c"
                onclick="triggerDemoReset()" id="btnDemoReset">
          <i class="ph ph-trash"></i> Perform demo reset
        </button>
        <p id="demoResetResult" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <div class="maintenance-section" style="margin-top:20px">
        <h4 class="org-section-title" style="color:#d98c00"><i class="ph ph-upload-simple"></i> Import demo data</h4>
        <p class="settings-desc">
          Restores a previously exported demo dataset. All module data will be overwritten.
          Users alice and bob will be restored with original passwords and without 2FA.
          The admin account remains unchanged.
        </p>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <input type="file" id="demoImportFile" accept=".json" style="display:none" onchange="triggerDemoImport(this)" />
          <button class="btn" style="background:rgba(217,140,0,.12);border-color:#d98c00;color:#d98c00"
                  onclick="document.getElementById('demoImportFile').click()">
            <i class="ph ph-upload-simple"></i> Select JSON file &amp; import
          </button>
        </div>
        <p id="demoImportResult" style="margin-top:8px;font-size:13px;display:none"></p>
      </div>

      <div class="maintenance-section" id="splashScreenSection" style="margin-top:24px;border-top:1px solid var(--border);padding-top:20px">
        <h4 class="org-section-title"><i class="ph ph-image"></i> Login Splash Screen</h4>
        <p class="settings-desc">
          After login, show the ISMS Builder banner image for a few seconds before the dashboard opens.
        </p>
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
          <label class="module-toggle" style="flex-shrink:0">
            <input type="checkbox" id="splashEnabled">
            <span class="module-toggle-slider"></span>
          </label>
          <div>
            <div style="font-size:13px;color:var(--text)">Enable splash screen</div>
            <div style="font-size:12px;color:var(--text-subtle)">Show banner image after successful login</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <label style="white-space:nowrap;font-size:13px;color:var(--text-subtle)">Duration (seconds)</label>
          <input class="input" id="splashDuration" type="number" min="1" max="30" style="width:80px" value="7">
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="saveSplashSettings()">
          <i class="ph ph-floppy-disk"></i> Save
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
      ? '<span style="background:rgba(74,222,128,.12);color:#4ade80;border:1px solid rgba(74,222,128,.3);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;">✓ Enabled</span>'
      : '<span style="background:rgba(255,255,255,.05);color:var(--text-subtle);border:1px solid var(--border);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;">Disabled</span>'

    const ollamaBadge = st.ollama
      ? '<span style="background:rgba(74,222,128,.12);color:#4ade80;border:1px solid rgba(74,222,128,.3);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;margin-left:8px;">⬤ Ollama online</span>'
      : '<span style="background:rgba(239,68,68,.1);color:#f87171;border:1px solid rgba(239,68,68,.3);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;margin-left:8px;">⬤ Ollama offline</span>'

    const modeBadge = st.mode === 'semantic'
      ? '<span style="background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.3);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;margin-left:8px;">Semantic search active</span>'
      : '<span style="background:rgba(255,255,255,.06);color:var(--text-subtle);border:1px solid var(--border);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;margin-left:8px;">Keyword search (fallback)</span>'
    const indexBadge = `<span style="color:var(--text-subtle);font-size:12px;margin-left:10px;">${st.indexed ?? 0} documents indexed · Model: ${st.model || 'nomic-embed-text'}</span>`

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
    container.innerHTML = '<p class="report-error" style="padding:20px">Error loading trash.</p>'
    return
  }
  const items = await res.json()

  if (items.length === 0) {
    container.innerHTML = '<p class="gdpr-empty" style="padding:20px">The trash is empty.</p>'
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
      <i class="ph ph-info"></i> Entries are automatically permanently deleted after 30 days.
      <strong>${items.length} entries</strong> in trash.
    </div>
    ${Object.entries(groups).map(([label, group]) => `
      <div class="trash-group">
        <h4 class="trash-group-title">${escHtml(label)} (${group.length})</h4>
        <table class="gdpr-table">
          <thead><tr><th>Title</th><th>Deleted By</th><th>Deleted At</th><th>Expires</th><th>Actions</th></tr></thead>
          <tbody>
            ${group.map(item => {
              const daysLeft = Math.max(0, Math.ceil((new Date(item.expiresAt) - Date.now()) / 86400000))
              return `<tr>
                <td><strong>${escHtml(item.title || item.id)}</strong></td>
                <td>${escHtml(item.deletedBy || '—')}</td>
                <td style="white-space:nowrap">${new Date(item.deletedAt).toLocaleDateString('en-GB')}</td>
                <td style="color:${daysLeft < 7 ? '#f87171' : 'inherit'}">${daysLeft} days</td>
                <td style="display:flex;gap:6px">
                  <button class="btn btn-secondary btn-sm" onclick="restoreTrashItem('${escHtml(item.module)}','${escHtml(item.id)}',${JSON.stringify(item.meta||{})})">
                    <i class="ph ph-arrow-counter-clockwise"></i> Restore
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="permanentDeleteTrashItem('${escHtml(item.module)}','${escHtml(item.id)}',${JSON.stringify(item.meta||{})})">
                    <i class="ph ph-trash"></i> Delete permanently
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
  if (!confirm('Restore item?')) return
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
  else { alert('Unknown module'); return }

  const res = await fetch(url, { method: 'POST', headers: apiHeaders('admin') })
  if (!res.ok) { alert('Restore failed'); return }
  renderAdminTrashTab()
}

async function permanentDeleteTrashItem(module, id, meta) {
  if (!confirm('Permanently delete? This action CANNOT be undone!')) return
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
  else { alert('Unknown module'); return }

  const res = await fetch(url, { method: 'DELETE', headers: apiHeaders('admin') })
  if (!res.ok) { alert('Delete failed'); return }
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
    desc: '7 report types: Compliance, Framework, Gap Analysis, Templates, Reviews, Compliance Matrix, Audit Trail. CSV export.',
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
  container.innerHTML = '<p class="report-loading">Loading…</p>'

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
        <h3 class="admin-panel-title"><i class="ph ph-sliders"></i> System Configuration – Module Management</h3>
        <p class="admin-modules-desc">
          Enable or disable modules according to your organisation structure and applicable standards.
          Disabled modules are hidden system-wide — for all users.
          <strong>Dashboard, Admin and Settings</strong> are always active.
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
              ${enabled ? 'Active' : 'Disabled'}
            </div>
          </div>`
        }).join('')}
      </div>

      <!-- SoA Framework selection -->
      <div class="admin-modules-header" style="margin-top:28px;border-top:1px solid var(--border);padding-top:20px">
        <h3 class="admin-panel-title"><i class="ph ph-shield-check"></i> SoA – Active Compliance Frameworks</h3>
        <p class="admin-modules-desc">
          Select the frameworks relevant to your organisation. Disabled frameworks are hidden in SoA,
          Dashboard and Reports.
        </p>
        <div class="settings-notice">
          <i class="ph ph-warning"></i>
          <strong>Note:</strong> At least one framework must remain active —
          an ISMS without a compliance framework would not make sense.
          The system prevents disabling the last active framework.
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
              ${enabled ? 'Active' : 'Disabled'}
            </div>
          </div>`
        }).join('')}
      </div>

      <div class="admin-modules-footer">
        <button class="btn btn-primary" onclick="saveModuleConfig()">
          <i class="ph ph-floppy-disk"></i> Save &amp; apply configuration
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
      msg.textContent = 'At least one framework must remain active — the last active framework cannot be disabled.'
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
  card.querySelector('.module-card-status').lastChild.textContent = ` ${enabled ? 'Active' : 'Disabled'}`
}

function moduleToggleChange(checkbox) {
  const card = checkbox.closest('.module-card')
  const enabled = checkbox.checked
  card.className = `module-card ${enabled ? 'module-card-active' : 'module-card-inactive'}`
  card.querySelector('.module-status-dot').className = `module-status-dot ${enabled ? 'active' : 'inactive'}`
  card.querySelector('.module-card-status').lastChild.textContent = ` ${enabled ? 'Active' : 'Disabled'}`
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
    msg.textContent = 'Saved. Sidebar and SoA are being updated…'
    msg.style.color = 'var(--success,#4ade80)'
    setTimeout(() => { populateSectionNav(); msg.style.display = 'none' }, 1200)
  } else {
    msg.textContent = 'Error saving.'
    msg.style.color = 'var(--danger-text)'
    setTimeout(() => { msg.style.display = 'none' }, 3000)
  }
}

// ── Admin: Ende Organisationsdaten / Audit / Wartung ─────────────────────────

const ROLES_LIST = [
  { id: 'reader',       label: 'reader – Read access' },
  { id: 'revision',     label: 'revision – Internal audit (read-only)' },
  { id: 'editor',       label: 'editor – Create/edit content' },
  { id: 'dept_head',    label: 'dept_head – Department head' },
  { id: 'qmb',          label: 'qmb – Quality management officer' },
  { id: 'contentowner', label: 'contentowner – CISO / ISB / DPO (approve, GDPR, risks)' },
  { id: 'auditor',      label: 'auditor – ICS/OT security / Risk auditor' },
  { id: 'admin',        label: 'admin – System administrator (all rights)' },
]

// Organisational functions (independent of RBAC rank)
const FUNCTIONS_LIST = [
  { id: 'ciso',         label: 'CISO – Chief Information Security Officer',   icon: 'ph-shield-warning' },
  { id: 'dso',          label: 'DPO – Data Protection Officer',               icon: 'ph-lock-key' },
  { id: 'qmb',          label: 'QMO – Quality Management Officer',            icon: 'ph-seal-check' },
  { id: 'bcm_manager',  label: 'BCM Manager – Business Continuity',           icon: 'ph-lifebuoy' },
  { id: 'dept_head',    label: 'Department Head',                             icon: 'ph-users-three' },
  { id: 'auditor',      label: 'Internal Auditor',                            icon: 'ph-magnifying-glass' },
  { id: 'admin_notify', label: 'Admin Notification (Contracts / Reviews)',    icon: 'ph-bell' },
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
        <span class="admin-panel-title"><i class="ph ph-users"></i> User Management</span>
        <button class="btn btn-primary btn-sm" onclick="openUserModal()">
          <i class="ph ph-user-plus"></i> New User
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
  tbody.innerHTML = '<p class="report-loading">Loading…</p>'
  const res = await fetch('/admin/users', { headers: apiHeaders('admin') })
  if (!res.ok) { tbody.innerHTML = '<p class="report-error">Error loading</p>'; return }
  const users = await res.json()
  if (users.length === 0) { tbody.innerHTML = '<p style="color:var(--text-subtle);padding:12px;">No users found</p>'; return }

  tbody.innerHTML = `
    <table class="admin-user-table">
      <thead>
        <tr>
          <th>User</th>
          <th>E-Mail</th>
          <th>Role</th>
          <th>Functions</th>
          <th>Domain</th>
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
              <button class="btn btn-secondary btn-sm" title="Edit"
                onclick='openUserModal(${JSON.stringify(u)})'>
                <i class="ph ph-pencil"></i>
              </button>
              <button class="btn btn-sm" style="color:var(--danger-text);" title="Delete"
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
            ${isEdit ? 'Edit User' : 'New User'}
          </h3>
          <button class="modal-close" onclick="document.getElementById('userEditModal').remove()">
            <i class="ph ph-x"></i>
          </button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="form-label">Username *</label>
              <input id="uModalUsername" class="form-input" value="${escHtml(user?.username || '')}"
                ${isEdit ? 'readonly style="opacity:.6;"' : 'placeholder="max.mustermann"'} />
            </div>
            <div>
              <label class="form-label">E-Mail *</label>
              <input id="uModalEmail" class="form-input" type="email"
                value="${escHtml(user?.email || '')}" placeholder="max@example.com" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="form-label">Role *</label>
              <select id="uModalRole" class="select">${roleOpts}</select>
            </div>
            <div>
              <label class="form-label">Domain</label>
              <input id="uModalDomain" class="form-input"
                value="${escHtml(user?.domain || 'Global')}" placeholder="Global" />
            </div>
          </div>
          <div>
            <label class="form-label">Organisational Functions</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--surface-raised,#1e2129);border-radius:4px;border:1px solid var(--border,#3c4257);">
              ${FUNCTIONS_LIST.map(f => `
                <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:3px 8px;border-radius:3px;background:var(--surface,#161b27);">
                  <input type="checkbox" class="uModalFn" value="${f.id}"
                    ${(user?.functions||[]).includes(f.id) ? 'checked' : ''}>
                  <i class="ph ${f.icon}" style="font-size:13px;"></i> ${escHtml(f.label)}
                </label>`).join('')}
            </div>
            <p style="font-size:11px;color:var(--text-subtle);margin:4px 0 0;">Multiple functions possible — independent of RBAC rank</p>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="form-label">${isEdit ? 'New Password' : 'Password *'}</label>
              <input id="uModalPw" class="form-input" type="password"
                placeholder="${isEdit ? 'Leave blank = unchanged' : 'At least 6 characters'}" />
            </div>
            <div>
              <label class="form-label">${isEdit ? 'Confirm Password' : 'Repeat Password *'}</label>
              <input id="uModalPw2" class="form-input" type="password" placeholder="Repeat password" />
            </div>
          </div>
          <p id="uModalError" style="color:var(--danger-text);font-size:12px;display:none;margin:0;"></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary"
            onclick="document.getElementById('userEditModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="submitUserModal('${isEdit ? user.username : ''}')">
            <i class="ph ph-floppy-disk"></i> Save
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

  if (!username || !email || !role) return show('Username, e-mail and role are required.')
  if (pw !== pw2) return show('Passwords do not match.')
  if (!existingUsername && (!pw || pw.length < 6)) return show('Password must be at least 6 characters.')
  if (pw && pw.length < 6) return show('Password must be at least 6 characters.')

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
    return show(err.error || 'Error saving')
  }
  document.getElementById('userEditModal')?.remove()
  adminLoadUsers()
}

async function adminDeleteUser(username) {
  if (!confirm(`Delete user "${username}"?`)) return
  const res = await fetch(`/admin/users/${encodeURIComponent(username)}`, {
    method: 'DELETE', headers: apiHeaders('admin')
  })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  adminLoadUsers()
}

function renderAdminEntitiesTab() {
  const container = document.getElementById('adminTabPanelEntities')
  if (!container) return
  container.innerHTML = `
    <div style="padding:12px 0;">
      <h3 style="margin-bottom:8px;">Corporate Structure – Entities</h3>
      <div class="admin-entity-toolbar">
        <button class="btn btn-primary btn-sm" onclick="adminAddEntity()"><i class="ph ph-plus"></i> New Entity</button>
        <button class="btn btn-secondary btn-sm" onclick="adminLoadEntities()"><i class="ph ph-arrows-clockwise"></i> Refresh</button>
      </div>
      <div id="adminEntityTree" class="admin-entity-tree"></div>
    </div>`
  adminLoadEntities()
}

async function adminLoadEntities() {
  const tree = document.getElementById('adminEntityTree')
  if (!tree) return
  tree.innerHTML = '<p class="report-loading">Loading…</p>'
  try {
    const res = await fetch('/entities/tree', { headers: apiHeaders('reader') })
    const roots = await res.json()
    tree.innerHTML = ''
    roots.forEach(e => tree.appendChild(renderEntityNode(e)))
  } catch (err) {
    tree.innerHTML = `<p class="report-error">Error: ${err.message}</p>`
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
        <button class="btn btn-secondary btn-sm" onclick='adminEditEntity(${JSON.stringify(e)})' title="Edit"><i class="ph ph-pencil"></i></button>
        ${e.type !== 'holding' ? `<button class="btn btn-sm" style="color:#ef4444;" onclick="adminDeleteEntity('${e.id}','${e.name}')" title="Delete"><i class="ph ph-trash"></i></button>` : ''}
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
            ${isEdit ? 'Edit Entity' : 'New Entity'}
          </h3>
          <button class="modal-close" onclick="document.getElementById('entityEditModal').remove()">
            <i class="ph ph-x"></i>
          </button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label class="form-label">Name *</label>
            <input id="entModalName" class="form-input"
              value="${escHtml(entity?.name || '')}" placeholder="e.g. Alpha Ltd" />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="form-label">Short Code</label>
              <input id="entModalCode" class="form-input"
                value="${escHtml(entity?.shortCode || '')}" placeholder="ALP" maxlength="10" />
            </div>
            <div>
              <label class="form-label">Type</label>
              <select id="entModalType" class="select" ${isEdit ? 'disabled style="opacity:.6;"' : ''}>
                <option value="subsidiary" ${entity?.type !== 'holding' ? 'selected' : ''}>Subsidiary</option>
                <option value="holding"    ${entity?.type === 'holding'  ? 'selected' : ''}>Holding</option>
              </select>
            </div>
          </div>
          <p id="entModalError" style="color:var(--danger-text);font-size:12px;display:none;margin:0;"></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary"
            onclick="document.getElementById('entityEditModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="submitEntityModal('${isEdit ? entity.id : ''}')">
            <i class="ph ph-floppy-disk"></i> Save
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

  if (!name) return show('Name is required.')

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
    return show(err.error || 'Error saving')
  }
  document.getElementById('entityEditModal')?.remove()
  _entityCache = []
  adminLoadEntities()
}

async function adminDeleteEntity(id, name) {
  if (!confirm(`Delete entity "${name}"?`)) return
  const res = await fetch(`/entities/${id}`, { method: 'DELETE', headers: apiHeaders('admin') })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  _entityCache = []
  adminLoadEntities()
}

// ════════════════════════════════════════════════════════════
// SICHERHEITSZIELE – ISO 27001 Kap. 6.2
// ════════════════════════════════════════════════════════════

const GOAL_CATEGORIES = [
  { id: 'confidentiality', label: 'Confidentiality' },
  { id: 'integrity',       label: 'Integrity' },
  { id: 'availability',    label: 'Availability' },
  { id: 'compliance',      label: 'Compliance' },
  { id: 'operational',     label: 'Operational' },
  { id: 'technical',       label: 'Technisch' },
  { id: 'organizational',  label: 'Organisatorisch' }
]
const GOAL_STATUSES = [
  { id: 'planned',   label: 'Planned',    color: '#888' },
  { id: 'active',    label: 'Active',     color: '#60a5fa' },
  { id: 'achieved',  label: 'Achieved',   color: '#4ade80' },
  { id: 'missed',    label: 'Missed',     color: '#f87171' },
  { id: 'cancelled', label: 'Cancelled',  color: '#555' }
]
const GOAL_PRIORITIES = [
  { id: 'low',      label: 'Low',      color: '#888' },
  { id: 'medium',   label: 'Medium',   color: '#f0b429' },
  { id: 'high',     label: 'High',     color: '#fb923c' },
  { id: 'critical', label: 'Critical', color: '#f87171' }
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
        <h2><i class="ph ph-target"></i> Security Goals <small style="font-size:.7em;font-weight:400;color:var(--text-subtle)">ISO 27001 Kap. 6.2</small></h2>
        ${goalCanEdit() ? `<button class="btn btn-primary btn-sm" onclick="openGoalForm()"><i class="ph ph-plus"></i> ${t('goals_new')}</button>` : ''}
      </div>

      <!-- KPI-Leiste -->
      <div class="goals-kpi-row">
        <div class="goals-kpi"><span class="goals-kpi-val">${summary.total||0}</span><span class="goals-kpi-lbl">Total</span></div>
        <div class="goals-kpi"><span class="goals-kpi-val" style="color:#60a5fa">${summary.active||0}</span><span class="goals-kpi-lbl">Active</span></div>
        <div class="goals-kpi"><span class="goals-kpi-val" style="color:#4ade80">${summary.achieved||0}</span><span class="goals-kpi-lbl">Achieved</span></div>
        <div class="goals-kpi"><span class="goals-kpi-val" style="color:#f87171">${summary.overdue||0}</span><span class="goals-kpi-lbl">Overdue</span></div>
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
        <span class="gdpr-filter-count">${list.length} Goal(s)</span>
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
                ${g.targetDate ? `<span style="${isOverdue?'color:#f87171;font-weight:600':''}"><i class="ph ph-calendar-x"></i> ${new Date(g.targetDate).toLocaleDateString('en-GB')}${isOverdue?' (overdue)':''}</span>` : ''}
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
    <input class="form-input" placeholder="Metric / KPI" style="flex:2" value="${escHtml(kpi.metric||'')}">
    <input type="number" class="form-input" placeholder="Target" style="width:90px" value="${kpi.targetValue||''}">
    <input type="number" class="form-input" placeholder="Current" style="width:90px" value="${kpi.currentValue||''}">
    <input class="form-input" placeholder="Unit" style="width:80px" value="${escHtml(kpi.unit||'')}" title="e.g. %, days, items">
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
        <button class="btn btn-secondary btn-sm" onclick="renderGoals()"><i class="ph ph-arrow-left"></i> Back</button>
        <h2>${id ? 'Edit Security Goal' : 'New Security Goal'}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-row">
          <div class="form-group" style="flex:3"><label class="form-label">Name *</label>
            <input id="goalTitle" class="form-input" value="${escHtml(g.title||'')}" placeholder="e.g. Reduce critical vulnerabilities by 80%"></div>
          <div class="form-group"><label class="form-label">Priority</label>
            <select id="goalPriority" class="select">${priOpts}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Description / Context</label>
          <textarea id="goalDesc" class="form-input" rows="3" placeholder="What should be achieved and why?">${escHtml(g.description||'')}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Category</label>
            <select id="goalCategory" class="select">${catOpts}</select></div>
          <div class="form-group"><label class="form-label">Status</label>
            <select id="goalStatus" class="select">${stOpts}</select></div>
          <div class="form-group"><label class="form-label">Owner / Responsible</label>
            <input id="goalOwner" class="form-input" value="${escHtml(g.owner||'')}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Target Date</label>
            <input id="goalTargetDate" type="date" class="form-input" value="${g.targetDate||''}"></div>
          <div class="form-group"><label class="form-label">Review Date</label>
            <input id="goalReviewDate" type="date" class="form-input" value="${g.reviewDate||''}"></div>
          <div class="form-group"><label class="form-label">Manual Progress (%)</label>
            <input id="goalProgress" type="number" class="form-input" min="0" max="100" value="${g.progress||0}" placeholder="0–100" title="Calculated from KPIs if available"></div>
        </div>

        <div class="legal-form-section">
          <div class="legal-form-section-title"><i class="ph ph-chart-line-up"></i> KPIs (Metrics)</div>
          <p style="font-size:.8rem;color:var(--text-subtle);margin-bottom:8px">Define measurable metrics — progress is automatically calculated from the KPIs.</p>
          <div class="goal-kpi-header">
            <span style="flex:2">Metric / KPI</span>
            <span style="width:90px">Target</span>
            <span style="width:90px">Current</span>
            <span style="width:80px">Unit</span>
            <span style="width:32px"></span>
          </div>
          <div id="goalKpisContainer">${kpisHtml}</div>
          <button class="btn btn-secondary btn-sm" onclick="addGoalKpi()" style="margin-top:6px">
            <i class="ph ph-plus"></i> Add KPI
          </button>
        </div>

        <div class="form-group"><label class="form-label">Notes</label>
          <textarea id="goalNotes" class="form-input" rows="2">${escHtml(g.notes||'')}</textarea></div>
        ${renderLinksBlock('goal', g.linkedControls||[], g.linkedPolicies||[])}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="renderGoals()">Cancel</button>
        <button class="btn btn-primary" onclick="saveGoal(${id?`'${id}'`:'null'})"><i class="ph ph-floppy-disk"></i> Save</button>
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
  if (!title) { alert('Name is required'); return }

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
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  renderGoals()
}

async function deleteGoal(id) {
  if (!confirm('Delete security goal?')) return
  const res = await fetch(`/goals/${id}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
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
      <h4><i class="ph ph-shield-warning"></i> CISO / ISB – Incident Settings</h4>
      <p class="settings-desc">Configuration for incident management and escalation.</p>
      <div class="org-grid" style="max-width:600px">
        <label class="org-label">Escalation e-mail</label>
        <input class="input" id="cisoEscalationEmail" value="${escHtml(cs.escalationEmail||'')}" type="email" placeholder="ciso@company.com">
        <label class="org-label">Incident response SLA (hrs)</label>
        <input class="input" id="cisoSLA" value="${cs.incidentResponseSLA||24}" type="number" min="1" max="168" style="width:100px">
        <label class="org-label">Reportable from risk level</label>
        <select class="select" id="cisoThreshold">
          <option value="low"      ${cs.reportableThreshold==='low'      ?'selected':''}>Low</option>
          <option value="medium"   ${cs.reportableThreshold==='medium'   ?'selected':''}>Medium</option>
          <option value="high"     ${cs.reportableThreshold==='high'     ?'selected':''}>High</option>
          <option value="critical" ${cs.reportableThreshold==='critical' ?'selected':''}>Critical</option>
        </select>
        <label class="org-label">Reportable incident types</label>
        <select class="select" id="cisoReportableTypes" multiple size="4" style="height:auto">${incTypeOpts}</select>
      </div>
      <div class="settings-actions" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" onclick="saveCisoSettings()">
          <i class="ph ph-floppy-disk"></i> Save CISO settings
        </button>
      </div>
      <p id="cisoSaveMsg" style="font-size:13px;margin-top:6px;display:none"></p>
    </div>` : ''

  const gdpoSection = showDso ? `
    <div class="settings-section">
      <h4><i class="ph ph-lock-key"></i> DPO / GDPO – Data Protection Settings</h4>
      <p class="settings-desc">Configuration for DSAR deadlines, reporting obligations and default texts.</p>
      <div class="org-grid" style="max-width:600px">
        <label class="org-label">DSAR default deadline (days)</label>
        <input class="input" id="gdpoDsar" value="${gs.dsarDeadlineDays||30}" type="number" min="1" max="90" style="width:100px">
        <label class="org-label">Extended DSAR deadline (days)</label>
        <input class="input" id="gdpoDsarExt" value="${gs.dsarExtendedDays||90}" type="number" min="1" max="180" style="width:100px">
        <label class="org-label">72h reporting obligation active</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px">
          <input type="checkbox" id="gdpo72h" ${gs.timer72hEnabled!==false?'checked':''}> Enabled
        </label>
        <label class="org-label">Data protection authority</label>
        <input class="input" id="gdpoDSA" value="${escHtml(gs.supervisoryAuthority||'')}" placeholder="e.g. ICO, CNIL, BfDI">
        <label class="org-label">Authority contact / URL</label>
        <input class="input" id="gdpoDSAContact" value="${escHtml(gs.supervisoryContact||'')}">
        <label class="org-label">Default DSAR response text</label>
        <textarea class="input" id="gdpoDsarText" rows="3" style="resize:vertical">${escHtml(gs.dsarDefaultResponse||'')}</textarea>
      </div>
      <div class="settings-actions" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" onclick="saveGdpoSettings()">
          <i class="ph ph-floppy-disk"></i> Save DPO settings
        </button>
      </div>
      <p id="gdpoSaveMsg" style="font-size:13px;margin-top:6px;display:none"></p>
    </div>` : ''

  const icsSection = rank >= ROLE_RANK.contentowner ? `
    <div class="settings-section">
      <h4><i class="ph ph-factory"></i> ICS / OT – Operational Technology Settings</h4>
      <p class="settings-desc">Configuration for OT/ICS environments (PLC, SCADA, field devices, building technology) per IEC 62443 / NIS2.</p>
      ${!is.otResponsible ? `<div class="settings-notice"><i class="ph ph-warning"></i> No OT security responsible assigned — position not yet filled.</div>` : ''}
      <div class="org-grid" style="max-width:600px;margin-top:10px">
        <label class="org-label">OT security responsible</label>
        <input class="input" id="icsResponsible" value="${escHtml(is.otResponsible||'')}" placeholder="Name (position not yet filled)">
        <label class="org-label">E-Mail</label>
        <input class="input" id="icsEmail" value="${escHtml(is.otResponsibleEmail||'')}" type="email" placeholder="ot-security@company.com">
        <label class="org-label">OT/ICS Scope</label>
        <textarea class="input" id="icsScope" rows="2" style="resize:vertical" placeholder="e.g. Production line 1–3, SCADA plant north, building management">${escHtml(is.otScope||'')}</textarea>
        <label class="org-label">Applied standard</label>
        <select class="select" id="icsStandard">
          <option value="iec62443" ${(is.otStandard||'iec62443')==='iec62443'?'selected':''}>IEC 62443</option>
          <option value="vdi2182"  ${is.otStandard==='vdi2182' ?'selected':''}>VDI/VDE 2182</option>
          <option value="namur"    ${is.otStandard==='namur'   ?'selected':''}>NAMUR NA 163</option>
          <option value="bsi"      ${is.otStandard==='bsi'     ?'selected':''}>BSI ICS Security Compendium</option>
          <option value="other"    ${is.otStandard==='other'   ?'selected':''}>Other</option>
        </select>
        <label class="org-label">NIS2 sector</label>
        <select class="select" id="icsNis2Sector">
          <option value=""           ${!is.otNis2Sector            ?'selected':''}>— not applicable —</option>
          <option value="energie"    ${is.otNis2Sector==='energie'   ?'selected':''}>Energy</option>
          <option value="wasser"     ${is.otNis2Sector==='wasser'    ?'selected':''}>Drinking water / Wastewater</option>
          <option value="transport"  ${is.otNis2Sector==='transport' ?'selected':''}>Transport / Traffic</option>
          <option value="produktion" ${is.otNis2Sector==='produktion'?'selected':''}>Manufacturing</option>
          <option value="chemie"     ${is.otNis2Sector==='chemie'    ?'selected':''}>Chemicals</option>
          <option value="lebensmittel"${is.otNis2Sector==='lebensmittel'?'selected':''}>Food</option>
          <option value="other"      ${is.otNis2Sector==='other'     ?'selected':''}>Other</option>
        </select>
        <label class="org-label">Critical infrastructure relevant</label>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px">
          <input type="checkbox" id="icsKritis" ${is.otKritisRelevant?'checked':''}> Yes, critical infrastructure operator
        </label>
        <label class="org-label">Network segmentation</label>
        <select class="select" id="icsSegmentation">
          <option value="implemented" ${is.otNetworkSegmentation==='implemented'?'selected':''}>Fully implemented</option>
          <option value="partial"     ${(is.otNetworkSegmentation||'partial')==='partial'?'selected':''}>Partially implemented</option>
          <option value="planned"     ${is.otNetworkSegmentation==='planned'    ?'selected':''}>Planned</option>
        </select>
        <label class="org-label">Patch cycle (weeks)</label>
        <input class="input" id="icsPatchCycle" value="${is.otPatchCycleWeeks||12}" type="number" min="1" max="52" style="width:100px">
        <label class="org-label">Maintenance window</label>
        <input class="input" id="icsMaintenanceWindow" value="${escHtml(is.otMaintenanceWindow||'')}" placeholder="e.g. Sat 02:00–06:00">
        <label class="org-label">Emergency contact (control room / shift)</label>
        <input class="input" id="icsEmergencyContact" value="${escHtml(is.otEmergencyContact||'')}" placeholder="Phone or shift supervisor name">
      </div>
      <div class="settings-actions" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" onclick="saveIcsSettings()">
          <i class="ph ph-floppy-disk"></i> Save OT/ICS settings
        </button>
      </div>
      <p id="icsSaveMsg" style="font-size:13px;margin-top:6px;display:none"></p>
    </div>` : ''

  const revSection = rank >= ROLE_RANK.contentowner ? `
    <div class="settings-section">
      <h4><i class="ph ph-magnifying-glass"></i> Internal Audit</h4>
      <p class="settings-desc">Independent audit function of the internal control system (ICS). Internal Audit is free from instructions and reports directly to management or the supervisory board.</p>
      ${!rs.revResponsible ? `<div class="settings-notice"><i class="ph ph-warning"></i> No audit responsible assigned — position not yet filled.</div>` : ''}
      <div class="org-grid" style="max-width:600px;margin-top:10px">
        <label class="org-label">Head of Internal Audit</label>
        <input class="input" id="revResponsible" value="${escHtml(rs.revResponsible||'')}" placeholder="Name (position not yet filled)">
        <label class="org-label">E-Mail</label>
        <input class="input" id="revEmail" value="${escHtml(rs.revResponsibleEmail||'')}" type="email" placeholder="audit@company.com">
        <label class="org-label">Audit scope</label>
        <textarea class="input" id="revScope" rows="2" style="resize:vertical" placeholder="e.g. All group entities, finance and IT processes">${escHtml(rs.revScope||'')}</textarea>
        <label class="org-label">Reports to</label>
        <select class="select" id="revReportsTo">
          <option value="gf"                ${(rs.revReportsTo||'gf')==='gf'               ?'selected':''}>Management board</option>
          <option value="aufsichtsrat"       ${rs.revReportsTo==='aufsichtsrat'             ?'selected':''}>Supervisory board</option>
          <option value="prüfungsausschuss"  ${rs.revReportsTo==='prüfungsausschuss'        ?'selected':''}>Audit committee</option>
        </select>
        <label class="org-label">Audit cycle (months)</label>
        <input class="input" id="revCycle" value="${rs.revCycleMonths||12}" type="number" min="1" max="36" style="width:100px">
        <label class="org-label">Last internal audit</label>
        <input class="input" id="revLastAudit" type="date" value="${rs.revLastAuditDate||''}">
        <label class="org-label">Next planned audit</label>
        <input class="input" id="revNextAudit" type="date" value="${rs.revNextAuditDate||''}">
        <label class="org-label">External auditor / CA (optional)</label>
        <input class="input" id="revExternal" value="${escHtml(rs.revExternalSupport||'')}" placeholder="e.g. KPMG, PwC, Deloitte">
      </div>
      <div class="settings-actions" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" onclick="saveRevisionSettings()">
          <i class="ph ph-floppy-disk"></i> Save audit settings
        </button>
      </div>
      <p id="revSaveMsg" style="font-size:13px;margin-top:6px;display:none"></p>
    </div>` : ''

  const qmSection = rank >= ROLE_RANK.contentowner ? `
    <div class="settings-section">
      <h4><i class="ph ph-medal"></i> QMO – Quality Management</h4>
      <p class="settings-desc">The Quality Management Officer (QMO) is formally required under ISO 9001:2015 Cl. 5.3 and is responsible for the Quality Management System (QMS) across the group including certification and surveillance audits.</p>
      ${!qs.qmResponsible ? `<div class="settings-notice"><i class="ph ph-warning"></i> No QMO assigned — position not yet filled.</div>` : ''}
      <div class="org-grid" style="max-width:600px;margin-top:10px">
        <label class="org-label">QMO – Name</label>
        <input class="input" id="qmResponsible" value="${escHtml(qs.qmResponsible||'')}" placeholder="Name (position not yet filled)">
        <label class="org-label">E-Mail</label>
        <input class="input" id="qmEmail" value="${escHtml(qs.qmResponsibleEmail||'')}" type="email" placeholder="qmo@company.com">
        <label class="org-label">QMS scope</label>
        <textarea class="input" id="qmScope" rows="2" style="resize:vertical" placeholder="e.g. Development, production and sales at all sites">${escHtml(qs.qmScope||'')}</textarea>
        <label class="org-label">Standard / norm</label>
        <select class="select" id="qmStandard">
          <option value="iso9001"   ${(qs.qmStandard||'iso9001')==='iso9001'  ?'selected':''}>ISO 9001:2015</option>
          <option value="iso9000"   ${qs.qmStandard==='iso9000'               ?'selected':''}>ISO 9000 (Fundamentals)</option>
          <option value="iatf16949" ${qs.qmStandard==='iatf16949'             ?'selected':''}>IATF 16949 (Automotive)</option>
          <option value="iso13485"  ${qs.qmStandard==='iso13485'              ?'selected':''}>ISO 13485 (Medical devices)</option>
          <option value="as9100"    ${qs.qmStandard==='as9100'                ?'selected':''}>AS9100 (Aerospace)</option>
          <option value="other"     ${qs.qmStandard==='other'                 ?'selected':''}>Other</option>
        </select>
        <label class="org-label">Certification body</label>
        <input class="input" id="qmCertBody" value="${escHtml(qs.qmCertBody||'')}" placeholder="e.g. TÜV SÜD, DQS, Bureau Veritas, DNV">
        <label class="org-label">Certificate valid until</label>
        <input class="input" id="qmCertValid" type="date" value="${qs.qmCertValidUntil||''}">
        <label class="org-label">Last surveillance audit</label>
        <input class="input" id="qmLastAudit" type="date" value="${qs.qmLastAuditDate||''}">
        <label class="org-label">Next surveillance audit</label>
        <input class="input" id="qmNextAudit" type="date" value="${qs.qmNextAuditDate||''}">
        <label class="org-label">Next recertification</label>
        <input class="input" id="qmRecert" type="date" value="${qs.qmRecertDate||''}">
      </div>
      <div class="settings-actions" style="margin-top:10px">
        <button class="btn btn-primary btn-sm" onclick="saveQmSettings()">
          <i class="ph ph-floppy-disk"></i> Save QM settings
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
          <h3><i class="ph ph-user-circle"></i> Personal Settings</h3>
          <p class="settings-desc" style="margin-bottom:16px">Password and two-factor authentication for <strong>${escHtml(username)}</strong>.</p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:760px">

            <!-- Change password -->
            <div>
              <h4 style="margin:0 0 10px;font-size:.9rem"><i class="ph ph-lock-key"></i> Change password</h4>
              <div style="display:flex;flex-direction:column;gap:8px">
                <input class="input" id="pwOld" type="password" placeholder="Current password" autocomplete="current-password">
                <input class="input" id="pwNew" type="password" placeholder="New password (min. 6 characters)" autocomplete="new-password">
                <input class="input" id="pwConfirm" type="password" placeholder="Confirm new password" autocomplete="new-password">
                <button class="btn btn-primary btn-sm" onclick="saveMyPassword()">
                  <i class="ph ph-floppy-disk"></i> Save password
                </button>
                <p id="pwSaveMsg" style="font-size:13px;display:none"></p>
              </div>
            </div>

            <!-- 2FA -->
            <div id="twofa-settings-block">
              <h4 style="margin:0 0 10px;font-size:.9rem"><i class="ph ph-shield-check"></i> Two-factor authentication (TOTP)</h4>
              <p id="twofa-status-msg" style="font-size:.82rem;color:var(--text-subtle);margin-bottom:10px">Loading status…</p>
              <div id="twofa-setup-area"></div>
            </div>
          </div>
        </div>

        ${cisoSection}
        ${gdpoSection}
        ${icsSection}
        ${revSection}
        ${qmSection}

        <div class="settings-section" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
          <p class="settings-desc" style="color:var(--text-subtle);font-size:12px">
            <i class="ph ph-info"></i> System-wide configuration (users, entities, lists, organisation, audit) is located under
            <strong>Admin</strong> in the navigation.
          </p>
        </div>
      </div>
    </div>`

  // 2FA-Status laden und Bereich rendern
  _renderTwofaSettingsBlock()
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
    statusMsg.innerHTML = '<span style="color:var(--success,#4ade80)"><i class="ph ph-check-circle"></i> 2FA is active.</span>'
    setupArea.innerHTML = `
      <p style="font-size:.82rem;color:var(--text-subtle);margin-bottom:8px">You can disable 2FA — this significantly reduces account security.</p>
      <button class="btn btn-sm" style="border-color:var(--danger-text);color:var(--danger-text)" onclick="disable2FA()">
        <i class="ph ph-shield-slash"></i> Disable 2FA
      </button>
      <p id="twofaMsg" style="font-size:13px;margin-top:8px;display:none"></p>`
  } else {
    statusMsg.innerHTML = '<span style="color:#f0b429"><i class="ph ph-shield-warning"></i> 2FA is <strong>not</strong> active. Your account is only protected by a password.</span>'
    // Load QR code
    try {
      const r = await fetch('/2fa/setup', { headers: apiHeaders() })
      if (r.ok) {
        const { qrDataUri, secret } = await r.json()
        const qrDataUrl = qrDataUri
        setupArea.innerHTML = `
          <div class="personal-2fa-qr">
            <p style="font-size:.82rem;color:var(--text-subtle);margin:0">Scan this QR code with your authenticator app (Google Authenticator, Aegis, …):</p>
            <img src="${qrDataUrl}" alt="2FA QR Code" width="180" height="180">
            <details style="font-size:.78rem;color:var(--text-subtle)">
              <summary style="cursor:pointer">Manual key (if QR code cannot be scanned)</summary>
              <code style="font-family:monospace;word-break:break-all">${escHtml(secret||'')}</code>
            </details>
            <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
              <input class="input" id="totpVerifyCode" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code" style="width:140px">
              <button class="btn btn-primary btn-sm" onclick="verify2FA()">
                <i class="ph ph-check"></i> Enable
              </button>
            </div>
            <p id="twofaMsg" style="font-size:13px;margin-top:4px;display:none"></p>
          </div>`
      } else {
        setupArea.innerHTML = '<p style="color:var(--danger-text);font-size:.82rem">2FA module not available.</p>'
      }
    } catch {
      setupArea.innerHTML = '<p style="color:var(--danger-text);font-size:.82rem">Error loading 2FA setup.</p>'
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
  renderTmplControlsBar(t)
  renderTmplEntityBar(t)
  renderAttachmentsBar(t)
  renderBreadcrumb(t)
  // Kind-Seite + Verschieben nur für contentowner+
  const rank = ROLE_RANK[getCurrentRole()] || 0
  const canMove = rank >= ROLE_RANK.contentowner
  const btnChild = dom('btnChildPage')
  if (btnChild) btnChild.style.display = canMove ? '' : 'none'
  const btnMove = dom('btnMovePage')
  if (btnMove) btnMove.style.display = canMove ? '' : 'none'
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
  if (!currentTemplate) return alert('Please select a template first.')
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
  if (!currentTemplate) return alert('Please select a template first.')
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
  if (!currentTemplate) return alert('Please select a template first.')
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
      alert('Template aktualisiert (Version '+t.version+')')
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
      alert('Template erstellt (Version '+t.version+')')
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
    if (hintEl) { hintEl.textContent = `Subpage of: ${opts.parentTitle}`; hintEl.style.display = '' }
    if (titleEl) titleEl.textContent = 'Create Child Page'
  } else {
    if (parentIdEl) parentIdEl.value = ''
    select.disabled = false
    if (hintEl) hintEl.style.display = 'none'
    if (titleEl) titleEl.textContent = 'Create New Template'
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
  { id: 'systemhandbuch',  label: 'Systemhandbuch',      icon: 'ph-book-open' },
  { id: 'rollen',          label: 'Rollen',              icon: 'ph-users-three' },
  { id: 'policy-prozesse', label: 'Policy-Prozesse',     icon: 'ph-flow-arrow' },
  { id: 'soa-audit',       label: 'SoA & Audit',         icon: 'ph-shield-check' },
  { id: 'admin-intern',    label: 'Admin-Dokumentation', icon: 'ph-lock-key',   minRole: 'admin' },
]

let _guidanceDocs  = []
let _guidanceCat   = 'systemhandbuch'
let _guidanceDocId = null

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
      <h2><i class="ph ph-compass"></i> Guidance & Dokumentation</h2>
      <div class="guidance-header-actions" id="guidanceHeaderActions">
        ${canEdit ? `
          <button class="btn btn-secondary btn-sm" onclick="openGuidanceEditor()">
            <i class="ph ph-plus"></i> Neu
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openGuidanceUpload()">
            <i class="ph ph-upload-simple"></i> Upload
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
    </div>
    <div class="guidance-body">
      <div class="guidance-list-col">
        <div class="guidance-list-header">
          <span>Dokumente</span>
        </div>
        <ul class="guidance-doc-list" id="guidanceDocList"></ul>
      </div>
      <div class="guidance-viewer-col" id="guidanceViewerCol">
        <div class="guidance-empty">
          <i class="ph ph-file-text"></i>
          <span>Select a document</span>
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
    ul.innerHTML = `<li style="padding:12px;color:var(--text-subtle);font-size:13px;">No documents</li>`
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
  col.innerHTML = `<div class="guidance-empty"><i class="ph ph-file-text"></i><span>Select a document</span></div>`
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
        <span>${escHtml(doc.filename || 'Document')}</span>
        <a href="/guidance/${doc.id}/file" class="btn btn-primary" download="${escHtml(doc.filename || 'document')}">
          <i class="ph ph-download-simple"></i> Download
        </a>
      </div>`
  }

  col.innerHTML = `
    <div class="guidance-viewer-toolbar">
      <span class="guidance-viewer-title">${escHtml(doc.title)}</span>
      <span class="badge" style="background:var(--surface-raised);color:var(--text-subtle);font-size:11px;">
        v${doc.version || 1}
      </span>
      ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="openGuidanceEditor(${JSON.stringify(doc).replace(/"/g,"'")})">
        <i class="ph ph-pencil"></i> Edit
      </button>` : ''}
      ${canDel ? `<button class="btn btn-sm" style="color:var(--danger-text);" onclick="deleteGuidanceDoc('${doc.id}')">
        <i class="ph ph-trash"></i>
      </button>` : ''}
    </div>
    <div class="guidance-viewer-body">${bodyHtml}</div>
  `
}

function switchGuidanceCat(cat) {
  _guidanceCat = cat
  _guidanceDocId = null
  document.querySelectorAll('.guidance-cat-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat)
  })
  loadGuidanceDocs()
}

async function deleteGuidanceDoc(id) {
  if (!confirm('Delete document?')) return
  const res = await fetch(`/guidance/${id}`, { method: 'DELETE', headers: apiHeaders('admin') })
  if (!res.ok) { alert('Error deleting'); return }
  if (_guidanceDocId === id) { _guidanceDocId = null }
  await loadGuidanceDocs()
}

// ── Editor Modal ──

function openGuidanceEditor(docArg) {
  // If called from inline HTML with single-quoted JSON string
  let doc = null
  if (typeof docArg === 'string') {
    try { doc = JSON.parse(docArg.replace(/'/g, '"')) } catch { doc = null }
  } else if (docArg && typeof docArg === 'object') {
    doc = docArg
  }

  const isEdit = !!doc
  const cats = GUIDANCE_CATS
    .filter(c => !c.minRole || (ROLE_RANK[getCurrentRole()] || 0) >= (ROLE_RANK[c.minRole] || 0))
    .map(c => `<option value="${c.id}" ${doc?.category === c.id ? 'selected' : ''}>${c.label}</option>`)
    .join('')

  const modalHtml = `
    <div id="guidanceEditorModal" class="modal" style="visibility:visible;">
      <div class="modal-content modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">
            <i class="ph ph-pencil"></i> ${isEdit ? 'Edit Document' : 'New Document'}
          </h3>
          <button class="modal-close" onclick="closeGuidanceEditor()"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="form-label">Title</label>
              <input id="gEditTitle" class="form-input" value="${escHtml(doc?.title || '')}" placeholder="Document title…" />
            </div>
            <div>
              <label class="form-label">Category</label>
              <select id="gEditCat" class="select">${cats}</select>
            </div>
          </div>
          ${!isEdit ? `
            <div>
              <label class="form-label">Type</label>
              <select id="gEditType" class="select" onchange="toggleGuidanceEditorType()">
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
              </select>
            </div>
          ` : ''}
          <div id="gEditContentArea">
            <div class="guidance-editor-tabs">
              <button class="guidance-editor-tab active" onclick="switchGuidanceEditorTab('edit', this)">Edit</button>
              <button class="guidance-editor-tab" onclick="switchGuidanceEditorTab('preview', this)">Preview</button>
            </div>
            <textarea id="gEditContent" class="form-textarea" rows="14"
              oninput="refreshGuidancePreview()">${escHtml(doc?.content || '')}</textarea>
            <div id="gEditPreview" class="guidance-editor-preview guidance-md" style="display:none;"></div>
          </div>
          ${renderLinksBlock('ge', doc?.linkedControls||[], [], false)}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeGuidanceEditor()">Cancel</button>
          <button class="btn btn-primary" onclick="saveGuidanceEditor('${isEdit ? doc.id : ''}')">
            <i class="ph ph-floppy-disk"></i> Save
          </button>
        </div>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHtml)
  initLinkPickers('ge', false)
}

function closeGuidanceEditor() { dom('guidanceEditorModal')?.remove() }

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

// ── Upload Modal ──

function openGuidanceUpload() {
  const cats = GUIDANCE_CATS
    .filter(c => !c.minRole || (ROLE_RANK[getCurrentRole()] || 0) >= (ROLE_RANK[c.minRole] || 0))
    .map(c => `<option value="${c.id}">${c.label}</option>`)
    .join('')

  const modalHtml = `
    <div id="guidanceUploadModal" class="modal" style="visibility:visible;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title"><i class="ph ph-upload-simple"></i> Upload File</h3>
          <button class="modal-close" onclick="closeGuidanceUpload()"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label class="form-label">Title</label>
            <input id="gUploadTitle" class="form-input" placeholder="Document title…" />
          </div>
          <div>
            <label class="form-label">Category</label>
            <select id="gUploadCat" class="select">${cats}</select>
          </div>
          <div>
            <label class="form-label">File (PDF, DOCX, DOC · max. 20 MB)</label>
            <div class="guidance-upload-area" onclick="dom('gUploadFile').click()">
              <i class="ph ph-file-arrow-up" style="font-size:32px;"></i>
              <p id="gUploadFileLabel">Select file or drag here</p>
            </div>
            <input type="file" id="gUploadFile" accept=".pdf,.docx,.doc" style="display:none;"
              onchange="updateGuidanceUploadLabel(this)" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeGuidanceUpload()">Cancel</button>
          <button class="btn btn-primary" onclick="submitGuidanceUpload()">
            <i class="ph ph-upload-simple"></i> Upload
          </button>
        </div>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHtml)
}

function closeGuidanceUpload() { dom('guidanceUploadModal')?.remove() }

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
  template_due:         { label:'Template Due',            cls:'cal-chip-template',  icon:'ph-clock' },
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
  { id:'technical',       label:'Technisch',        icon:'ph-cpu' },
  { id:'organizational',  label:'Organisatorisch',   icon:'ph-users' },
  { id:'physical',        label:'Physisch',          icon:'ph-building' },
  { id:'legal',           label:'Rechtlich',         icon:'ph-scales' },
]
let RISK_TREATMENTS = [
  { id:'reduce',   label:'Reduzieren' },
  { id:'accept',   label:'Akzeptieren' },
  { id:'avoid',    label:'Vermeiden' },
  { id:'transfer', label:'Übertragen' },
]
const RISK_STATUSES = [
  { id:'open',         label:'Open' },
  { id:'in_treatment', label:'In Treatment' },
  { id:'accepted',     label:'Accepted' },
  { id:'closed',       label:'Closed' },
]
const RISK_LEVEL_CFG = {
  low:      { label:'Low',      cls:'risk-low' },
  medium:   { label:'Medium',   cls:'risk-medium' },
  high:     { label:'High',     cls:'risk-high' },
  critical: { label:'Critical', cls:'risk-critical' },
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
        <h2><i class="ph ph-warning"></i> Risk & Compliance</h2>
        ${canManageRisks() ? `<button class="btn btn-primary btn-sm" onclick="openRiskModal()">
          <i class="ph ph-plus"></i> ${t('risk_new')}
        </button>` : ''}
      </div>
      <div class="risk-tab-bar">
        <button class="risk-tab active" data-tab="register"  onclick="switchRiskTab('register')"><i class="ph ph-table"></i> ${t('risk_register')}</button>
        <button class="risk-tab"        data-tab="heatmap"   onclick="switchRiskTab('heatmap')"><i class="ph ph-grid-four"></i> Heatmap</button>
        <button class="risk-tab"        data-tab="treatments"onclick="switchRiskTab('treatments')"><i class="ph ph-list-checks"></i> ${t('risk_treatmentsTab')}</button>
        <button class="risk-tab"        data-tab="calendar"  onclick="switchRiskTab('calendar')"><i class="ph ph-calendar"></i> Kalender</button>
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
  content.innerHTML = '<p class="report-loading">Loading…</p>'
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
    `<option value="${c.id}" ${_riskFilterCat === c.id ? 'selected':''}>${c.label}</option>`).join('')
  const stOpts = [{ id:'', label:t('filter_allStatuses') }, ...RISK_STATUSES].map(s =>
    `<option value="${s.id}" ${_riskFilterStatus === s.id ? 'selected':''}>${s.label}</option>`).join('')

  el.innerHTML = `
    <div class="risk-filter-bar">
      <select class="select risk-filter-sel" onchange="_riskFilterCat=this.value;switchRiskTab('register')">${catOpts}</select>
      <select class="select risk-filter-sel" onchange="_riskFilterStatus=this.value;switchRiskTab('register')">${stOpts}</select>
      <span class="risk-filter-count">${risks.length} Risk${risks.length !== 1 ? 's' : ''}</span>
    </div>
    ${risks.length === 0 ? '<p class="risk-empty">No risks found.</p>' : `
    <table class="risk-table">
      <thead><tr>
        <th>Level</th><th>Title</th><th>Category</th>
        <th>W × S = Score</th><th>Treatment</th><th>Status</th><th>Owner</th><th style="width:70px;"></th>
      </tr></thead>
      <tbody>
        ${risks.map(r => {
          const lv = RISK_LEVEL_CFG[r.riskLevel] || { label: r.riskLevel, cls: '' }
          const cat = RISK_CATS.find(c => c.id === r.category)
          const st  = RISK_STATUSES.find(s => s.id === r.status)
          const tr  = RISK_TREATMENTS.find(t => t.id === r.treatmentOption)
          return `<tr class="risk-row" onclick="openRiskDetail('${r.id}')">
            <td><span class="risk-badge ${lv.cls}">${lv.label}</span></td>
            <td class="risk-title-cell">${escHtml(r.title)}</td>
            <td>${escHtml(cat?.label || r.category)}</td>
            <td class="risk-score-cell">${r.probability} × ${r.impact} = <strong>${r.score}</strong></td>
            <td>${escHtml(tr?.label || r.treatmentOption)}</td>
            <td><span class="risk-status-badge risk-st-${r.status}">${st?.label || r.status}</span></td>
            <td>${escHtml(r.owner || '—')}</td>
            <td onclick="event.stopPropagation()" class="risk-actions">
              ${canEditRisk(r) ? `<button class="btn btn-secondary btn-sm" title="Edit" onclick="openRiskModal('${r.id}')"><i class="ph ph-pencil"></i></button>` : ''}
              ${getCurrentRole()==='admin' ? `<button class="btn btn-sm" style="color:var(--danger-text)" title="Delete" onclick="deleteRisk('${r.id}')"><i class="ph ph-trash"></i></button>` : ''}
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
      <span class="hm-leg hm-low">Low (1–4)</span>
      <span class="hm-leg hm-medium">Medium (5–9)</span>
      <span class="hm-leg hm-high">High (10–14)</span>
      <span class="hm-leg hm-critical">Critical (15–25)</span>
    </div>
    <p class="heatmap-hint">Click a point to open risk details.</p>`

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

  const statusLabel = { open:'Offen', in_progress:'In Arbeit', completed:'Abgeschlossen' }
  const today = new Date().toISOString().slice(0,10)

  const riskOpts = risks.map(r => `<option value="${escHtml(r.id)}">${escHtml(r.title)}</option>`).join('')

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <h4 style="margin:0;flex:1;">Alle Behandlungsmaßnahmen (${rows.length})</h4>
      ${canManageRisks() ? `
        <select id="tpRiskPicker" class="select" style="max-width:220px;">
          <option value="">— Select risk —</option>
          ${riskOpts}
        </select>
        <button class="btn btn-primary btn-sm" onclick="openTreatmentModalForRisk()">
          <i class="ph ph-plus"></i> New Measure
        </button>` : ''}
    </div>
    ${rows.length === 0 ? '<p class="risk-empty">No treatment measures recorded.</p>' : `
    <table class="risk-table">
      <thead><tr>
        <th>Measure</th><th>Risk</th><th>Responsible</th>
        <th>Due Date</th><th>Status</th>
        ${canManageRisks() ? '<th style="width:90px;"></th>' : ''}
      </tr></thead>
      <tbody>
        ${rows.map(tp => {
          const overdue = tp.dueDate && tp.dueDate < today && tp.status !== 'completed'
          const lv = RISK_LEVEL_CFG[tp.riskLevel] || { cls:'' }
          return `<tr>
            <td>${escHtml(tp.title)}<br><small style="color:var(--text-subtle)">${escHtml(tp.description || '')}</small></td>
            <td><span class="risk-badge ${lv.cls}" style="font-size:10px;">${escHtml(tp.riskTitle)}</span></td>
            <td>${escHtml(tp.responsible || '—')}</td>
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
  if (!riskId) { alert('Please select a risk first.'); return }
  openTreatmentModal(riskId, null)
}

// ── Calendar ──

async function renderRiskCalendar(el) {
  const res = await fetch('/risks/calendar', { headers: apiHeaders() })
  const events = res.ok ? await res.json() : []

  const today = new Date().toISOString().slice(0, 10)
  const typeLabel = { risk_due:'Due Date', risk_review:'Review', treatment_due:'Measure' }
  const typeCls   = { risk_due:'cal-due', risk_review:'cal-review', treatment_due:'cal-treatment' }

  if (events.length === 0) {
    el.innerHTML = '<p class="risk-empty">No events recorded.</p>'
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
  const res = await fetch('/risks/summary', { headers: apiHeaders() })
  const s = res.ok ? await res.json() : null
  if (!s) { el.innerHTML = '<p class="report-error">Error loading</p>'; return }

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
        <h4>Total</h4>
        <div class="risk-kpi-big">${s.total}</div>
        <div class="risk-kpi-sub">Risks recorded</div>
      </div>
      <div class="risk-report-card">
        <h4>Open Measures</h4>
        <div class="risk-kpi-big ${s.openTreatments > 0 ? 'risk-kpi-warn' : ''}">${s.openTreatments}</div>
        <div class="risk-kpi-sub">Treatment plans open</div>
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
            <span style="width:130px;font-size:12px;">${c.label}</span>
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
        <h4>Top 5 Risks (by Score)</h4>
        <table class="risk-table">
          <thead><tr><th>Title</th><th>Level</th><th>Score</th><th>Status</th></tr></thead>
          <tbody>${top5rows || '<tr><td colspan="4" style="color:var(--text-subtle)">No risks</td></tr>'}</tbody>
        </table>
      </div>
    </div>`
}

// ── Risk Detail ──

async function openRiskDetail(id) {
  const res = await fetch(`/risks/${id}`, { headers: apiHeaders() })
  if (!res.ok) return
  const r = await res.json()
  const lv  = RISK_LEVEL_CFG[r.riskLevel] || { label: r.riskLevel, cls: '' }
  const cat = RISK_CATS.find(c => c.id === r.category)
  const tr  = RISK_TREATMENTS.find(t => t.id === r.treatmentOption)
  const st  = RISK_STATUSES.find(s => s.id === r.status)
  const tpStatusLabel = { open:'Open', in_progress:'In Progress', completed:'Completed' }

  document.getElementById('riskDetailModal')?.remove()
  const html = `
    <div id="riskDetailModal" class="modal" style="visibility:visible;">
      <div class="modal-content modal-xl">
        <div class="modal-header">
          <h3 class="modal-title">
            <span class="risk-badge ${lv.cls}">${lv.label}</span>
            ${escHtml(r.title)}
          </h3>
          <button class="modal-close" onclick="document.getElementById('riskDetailModal').remove()"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body risk-detail-body">
          <div class="risk-detail-grid">
            <div class="risk-detail-section">
              <h4>${t('risk_descHeading')}</h4>
              <p>${escHtml(r.description || '—')}</p>
              <div class="risk-detail-row"><label>${t('risk_threat')}</label><span>${escHtml(r.threat || '—')}</span></div>
              <div class="risk-detail-row"><label>${t('risk_vulnerability')}</label><span>${escHtml(r.vulnerability || '—')}</span></div>
              ${r.mitigationNotes ? `<div class="risk-detail-row risk-detail-mitigation">
                <label>${t('risk_mitigation')}</label>
                <span>${escHtml(r.mitigationNotes)}</span>
              </div>` : ''}
            </div>
            <div class="risk-detail-section">
              <h4>${t('risk_assessment')}</h4>
              <div class="risk-detail-row"><label>Category</label><span>${escHtml(cat?.label||r.category)}</span></div>
              <div class="risk-detail-row"><label>${t('risk_probability')}</label><span>${r.probability} / 5</span></div>
              <div class="risk-detail-row"><label>${t('risk_impact')}</label><span>${r.impact} / 5</span></div>
              <div class="risk-detail-row"><label>Score</label><span><strong>${r.score}</strong> — <span class="risk-badge ${lv.cls}">${lv.label}</span></span></div>
              <div class="risk-detail-row"><label>${t('risk_treatmentOpt')}</label><span>${escHtml(tr?.label||r.treatmentOption)}</span></div>
              <div class="risk-detail-row"><label>Status</label><span class="risk-status-badge risk-st-${r.status}">${st?.label||r.status}</span></div>
              <div class="risk-detail-row"><label>Owner</label><span>${escHtml(r.owner||'—')}</span></div>
              <div class="risk-detail-row"><label>Due Date</label><span>${r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-GB') : '—'}</span></div>
              <div class="risk-detail-row"><label>Review</label><span>${r.reviewDate ? new Date(r.reviewDate).toLocaleDateString('en-GB') : '—'}</span></div>
            </div>
          </div>
          <div class="risk-detail-section">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <h4 style="margin:0;flex:1;">Treatment Measures (${(r.treatmentPlans||[]).length})</h4>
              ${canManageRisks() ? `<button class="btn btn-primary btn-sm" onclick="openTreatmentModal('${r.id}',null)">
                <i class="ph ph-plus"></i> Measure
              </button>` : ''}
            </div>
            <div id="riskDetailTps">
              ${(r.treatmentPlans||[]).length === 0 ? `<p style="color:var(--text-subtle);font-size:13px;">${t('risk_noMeasures')}</p>` :
                r.treatmentPlans.map(tp => {
                  _tpCache[tp.id] = { ...tp, riskId: r.id }
                  return `
                  <div class="risk-tp-card">
                    <div class="risk-tp-header">
                      <strong>${escHtml(tp.title)}</strong>
                      <span class="risk-tp-status risk-tp-${tp.status}">${tpStatusLabel[tp.status]||tp.status}</span>
                      ${canManageRisks() ? `
                        <button class="btn btn-secondary btn-sm" title="Edit" onclick="openTreatmentModal('${r.id}','${tp.id}')"><i class="ph ph-pencil"></i></button>
                        <button class="btn btn-sm" style="color:var(--danger-text)" title="Löschen" onclick="deleteTreatment('${r.id}','${tp.id}')"><i class="ph ph-trash"></i></button>
                      ` : ''}
                    </div>
                    <div class="risk-tp-meta">
                      ${escHtml(tp.description||'')}
                      ${tp.responsible ? `· <i class="ph ph-user"></i> ${escHtml(tp.responsible)}` : ''}
                      ${tp.dueDate ? `· <i class="ph ph-calendar"></i> ${new Date(tp.dueDate).toLocaleDateString('en-GB')}` : ''}
                    </div>
                  </div>`}).join('')}
            </div>
          </div>
          ${r.linkedControls?.length ? `<div class="risk-detail-section">
            <h4>Linked SoA Controls (${r.linkedControls.length})</h4>
            <div class="tmpl-controls-bar" style="display:flex;flex-wrap:wrap;gap:6px;">
              ${r.linkedControls.map(c => `<span class="tmpl-bar-pill">${escHtml(c)}</span>`).join('')}
            </div>
          </div>` : ''}
          ${r.applicableEntities?.length ? `<div class="risk-detail-section">
            <h4>Applicable to Entities</h4>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${r.applicableEntities.map(e => `<span class="tmpl-bar-pill"><i class="ph ph-buildings"></i> ${escHtml(e)}</span>`).join('')}
            </div>
          </div>` : ''}
        </div>
        <div class="modal-footer">
          ${canEditRisk(r) ? `<button class="btn btn-secondary" onclick="document.getElementById('riskDetailModal').remove();openRiskModal('${r.id}')">
            <i class="ph ph-pencil"></i> Edit
          </button>` : ''}
          <button class="btn btn-primary" onclick="document.getElementById('riskDetailModal').remove()">Close</button>
        </div>
      </div>
    </div>`
  document.body.insertAdjacentHTML('beforeend', html)
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
          <i class="ph ph-arrow-left"></i> Back
        </button>
        <h2><i class="ph ph-warning"></i> ${risk ? 'Edit Risk' : 'New Risk'}</h2>
      </div>
      <div class="risk-form-body">
        <div class="risk-form-grid">

          <div class="risk-form-card risk-form-full">
            <h3 class="risk-form-section-title"><i class="ph ph-text-align-left"></i> Basic Information</h3>
            <div class="risk-form-row">
              <div class="risk-form-field risk-form-wide">
                <label class="form-label">Title *</label>
                <input id="rModalTitle" class="form-input" value="${escHtml(risk?.title||'')}" placeholder="Short, concise risk title…" />
              </div>
              <div class="risk-form-field">
                <label class="form-label">Category</label>
                <select id="rModalCat" class="select">${catOpts}</select>
              </div>
            </div>
            <div class="risk-form-field" style="margin-top:10px;">
              <label class="form-label">Description</label>
              <textarea id="rModalDesc" class="form-textarea" rows="3" placeholder="Detailed description of the risk…">${escHtml(risk?.description||'')}</textarea>
            </div>
          </div>

          <div class="risk-form-card">
            <h3 class="risk-form-section-title"><i class="ph ph-bug"></i> Threat & Vulnerability</h3>
            <div class="risk-form-field">
              <label class="form-label">Threat</label>
              <textarea id="rModalThreat" class="form-textarea" rows="3" placeholder="What threat exists?">${escHtml(risk?.threat||'')}</textarea>
            </div>
            <div class="risk-form-field" style="margin-top:10px;">
              <label class="form-label">Vulnerability</label>
              <textarea id="rModalVuln" class="form-textarea" rows="3" placeholder="Which vulnerability is being exploited?">${escHtml(risk?.vulnerability||'')}</textarea>
            </div>
          </div>

          <div class="risk-form-card">
            <h3 class="risk-form-section-title"><i class="ph ph-chart-line-up"></i> Risk Assessment</h3>
            <div class="risk-form-row">
              <div class="risk-form-field">
                <label class="form-label">Likelihood (1–5)</label>
                <select id="rModalProb" class="select" onchange="updateRiskScorePreview()">${scaleOpts('probability')}</select>
              </div>
              <div class="risk-form-field">
                <label class="form-label">Impact (1–5)</label>
                <select id="rModalImpact" class="select" onchange="updateRiskScorePreview()">${scaleOpts('impact')}</select>
              </div>
            </div>
            <div id="rScorePreview" class="risk-score-preview" style="margin-top:12px;"></div>
            <div class="risk-form-field" style="margin-top:12px;">
              <label class="form-label">Treatment Option</label>
              <select id="rModalTreat" class="select">${trOpts}</select>
            </div>
            <div class="risk-form-field" style="margin-top:10px;">
              <label class="form-label">Risk Mitigation Measures</label>
              <textarea id="rModalMitigation" class="form-textarea" rows="4"
                placeholder="Describe concrete measures to reduce, avoid or transfer this risk…">${escHtml(risk?.mitigationNotes||'')}</textarea>
            </div>
          </div>

          <div class="risk-form-card">
            <h3 class="risk-form-section-title"><i class="ph ph-clock"></i> Control & Dates</h3>
            <div class="risk-form-field">
              <label class="form-label">Status</label>
              <select id="rModalStatus" class="select">${stOpts}</select>
            </div>
            <div class="risk-form-field" style="margin-top:10px;">
              <label class="form-label">Owner / Responsible *</label>
              <input id="rModalOwner" class="form-input" value="${escHtml(risk?.owner||'')}" placeholder="Name or role" />
            </div>
            <div class="risk-form-row" style="margin-top:10px;">
              <div class="risk-form-field">
                <label class="form-label">Due Date</label>
                <input id="rModalDue" class="form-input" type="date" value="${risk?.dueDate||''}" />
              </div>
              <div class="risk-form-field">
                <label class="form-label">Review Date</label>
                <input id="rModalReview" class="form-input" type="date" value="${risk?.reviewDate||''}" />
              </div>
            </div>
          </div>

          ${entityTree.length ? `
          <div class="risk-form-card risk-form-full">
            <h3 class="risk-form-section-title"><i class="ph ph-buildings"></i> Applicable Entities</h3>
            <div class="ent-tree-wrap">
              <label class="ent-tree-all-label">
                <input type="checkbox" id="rEntitySelectAll" onchange="riskEntitySelectAll(this)">
                <strong>Select all entities</strong>
              </label>
              <div class="ent-tree-divider"></div>
              <div class="ent-tree-root">${entTreeHtml}</div>
            </div>
          </div>` : ''}

        </div>

        <div class="risk-form-footer">
          <p id="rModalError" style="color:var(--danger-text);font-size:13px;display:none;flex:1;margin:0;"></p>
          <button class="btn btn-secondary" onclick="renderRisk()">Cancel</button>
          <button class="btn btn-primary btn-lg" onclick="submitRiskForm()">
            <i class="ph ph-floppy-disk"></i> Save Risk
          </button>
        </div>
      </div>
    </div>`

  updateRiskScorePreview()
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
      <span class="risk-score-preview-label">Risk Score</span>
      <span class="risk-score-preview-val">${p} × ${i} = <strong>${score}</strong></span>
      <span class="risk-badge ${cfg.cls}">${cfg.label}</span>
    </div>`
}

async function submitRiskForm() {
  const errEl = dom('rModalError')
  const show = msg => { errEl.textContent = msg; errEl.style.display = '' }

  const title = dom('rModalTitle')?.value.trim()
  if (!title) return show('Title is required.')

  const owner = dom('rModalOwner')?.value.trim()
  if (!owner) return show('Owner / Responsible is required.')

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
    applicableEntities
  }

  const url    = _riskEditId ? `/risks/${_riskEditId}` : '/risks'
  const method = _riskEditId ? 'PUT' : 'POST'
  const res = await fetch(url, { method, headers: apiHeaders(), body: JSON.stringify(body) })
  if (!res.ok) { const e = await res.json(); return show(e.error || 'Error saving') }
  _riskEditId = null
  renderRisk()
}

async function deleteRisk(id) {
  if (!confirm('Delete risk?')) return
  const res = await fetch(`/risks/${id}`, { method: 'DELETE', headers: apiHeaders('admin') })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  switchRiskTab(_riskTab)
}

// ── Treatment Plan Modal ──

function openTreatmentModal(riskId, tpOrId) {
  // tpOrId can be null (new), a tp ID string (edit via cache), or a tp object
  let tp = null
  if (tpOrId) {
    tp = (typeof tpOrId === 'string') ? (_tpCache[tpOrId] || null) : tpOrId
  }
  document.getElementById('treatmentModal')?.remove()
  const html = `
    <div id="treatmentModal" class="modal" style="visibility:visible;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title"><i class="ph ph-list-checks"></i> ${tp ? 'Edit Measure' : 'New Measure'}</h3>
          <button class="modal-close" onclick="document.getElementById('treatmentModal').remove()"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <label class="form-label">Title *</label>
            <input id="tpTitle" class="form-input" value="${escHtml(tp?.title||'')}" placeholder="Measure title…" />
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea id="tpDesc" class="form-textarea" rows="3">${escHtml(tp?.description||'')}</textarea>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="form-label">Responsible</label>
              <input id="tpResp" class="form-input" value="${escHtml(tp?.responsible||'')}" placeholder="Name or role" />
            </div>
            <div>
              <label class="form-label">Due Date</label>
              <input id="tpDue" class="form-input" type="date" value="${tp?.dueDate||''}" />
            </div>
          </div>
          <div>
            <label class="form-label">Status</label>
            <select id="tpStatus" class="select">
              <option value="open"        ${tp?.status==='open'?'selected':''}>Open</option>
              <option value="in_progress" ${tp?.status==='in_progress'?'selected':''}>In Progress</option>
              <option value="completed"   ${tp?.status==='completed'?'selected':''}>Completed</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('treatmentModal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="submitTreatmentModal('${riskId}','${tp?.id||''}')">
            <i class="ph ph-floppy-disk"></i> Save
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
    description:  dom('tpDesc')?.value   || '',
    responsible:  dom('tpResp')?.value   || '',
    dueDate:      dom('tpDue')?.value    || null,
    status:       dom('tpStatus')?.value || 'open'
  }
  const url    = tpId ? `/risks/${riskId}/treatments/${tpId}` : `/risks/${riskId}/treatments`
  const method = tpId ? 'PUT' : 'POST'
  const res = await fetch(url, { method, headers: apiHeaders(), body: JSON.stringify(body) })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  document.getElementById('treatmentModal')?.remove()
  document.getElementById('riskDetailModal')?.remove()
  switchRiskTab(_riskTab)
}

async function deleteTreatment(riskId, tpId) {
  if (!confirm('Delete treatment?')) return
  const res = await fetch(`/risks/${riskId}/treatments/${tpId}`, { method: 'DELETE', headers: apiHeaders() })
  if (!res.ok) { const e = await res.json(); alert(e.error || 'Error'); return }
  document.getElementById('riskDetailModal')?.remove()
  switchRiskTab(_riskTab)
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
  { id: 'consent',              label: 'Consent (Art. 6(1)(a))' },
  { id: 'contract',             label: 'Contract Performance (Art. 6(1)(b))' },
  { id: 'legal_obligation',     label: 'Legal Obligation (Art. 6(1)(c))' },
  { id: 'vital_interests',      label: 'Vital Interests (Art. 6(1)(d))' },
  { id: 'public_task',          label: 'Public Interest (Art. 6(1)(e))' },
  { id: 'legitimate_interest',  label: 'Legitimate Interests (Art. 6(1)(f))' },
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
  { id:'adequacy', label:'Adequacy Decision' },
  { id:'scc', label:'Standard Contractual Clauses (SCC)' },
  { id:'bcr', label:'Binding Corporate Rules (BCR)' },
  { id:'other', label:'Other Safeguards' },
]
const GDPR_AV_STATUSES = [
  { id:'draft',       label:'Draft' },
  { id:'negotiation', label:'Negotiation' },
  { id:'signed',      label:'Signed' },
  { id:'active',      label:'Active' },
  { id:'terminated',  label:'Terminated' },
]
const GDPR_VVT_STATUSES = [
  { id:'draft',    label:'Draft' },
  { id:'approved', label:'Approved' },
  { id:'archived', label:'Archived' },
]
const GDPR_DSFA_STATUSES = [
  { id:'draft',    label:'Draft' },
  { id:'review',   label:'Review' },
  { id:'approved', label:'Approved' },
  { id:'archived', label:'Archived' },
]
const GDPR_INC_TYPES = [
  { id:'unauthorized_access', label:'Unauthorized Access' },
  { id:'loss',                label:'Data Loss' },
  { id:'deletion',            label:'Unintentional Deletion' },
  { id:'theft',               label:'Theft' },
  { id:'ransomware',          label:'Ransomware' },
  { id:'other',               label:'Other' },
]
const GDPR_INC_STATUSES = [
  { id:'detected',  label:'Detected' },
  { id:'contained', label:'Contained' },
  { id:'reported',  label:'Reported' },
  { id:'closed',    label:'Closed' },
]
const GDPR_DSAR_TYPES = [
  { id:'access',            label:'Access (Art. 15)' },
  { id:'rectification',     label:'Rectification (Art. 16)' },
  { id:'erasure',           label:'Erasure (Art. 17)' },
  { id:'restriction',       label:'Restriction (Art. 18)' },
  { id:'portability',       label:'Data Portability (Art. 20)' },
  { id:'objection',         label:'Objection (Art. 21)' },
  { id:'review_automated',  label:'Automated Decision Review (Art. 22)' },
]
const GDPR_DSAR_STATUSES = [
  { id:'received',    label:'Received' },
  { id:'in_progress', label:'In Progress' },
  { id:'extended',    label:'Extended (+60 Days)' },
  { id:'completed',   label:'Completed' },
  { id:'refused',     label:'Refused' },
]
const GDPR_TOM_CATS = [
  { id:'access',          label:'Access Control' },
  { id:'encryption',      label:'Encryption' },
  { id:'logging',         label:'Logging' },
  { id:'network',         label:'Network Security' },
  { id:'application',     label:'Application Security' },
  { id:'backup',          label:'Backup & Recovery' },
  { id:'organizational',  label:'Organizational' },
  { id:'training',        label:'Training' },
  { id:'retention',       label:'Data Retention' },
]
const GDPR_TOM_STATUSES = [
  { id:'planned',     label:'Planned' },
  { id:'in_progress', label:'In Progress' },
  { id:'implemented', label:'Implemented' },
  { id:'verified',    label:'Verified' },
]
const GDPR_RISK_LEVELS = [
  { id:'low',      label:'Low' },
  { id:'medium',   label:'Medium' },
  { id:'high',     label:'High' },
  { id:'critical', label:'Critical' },
]

const GDPR_ART28_ITEMS = [
  { key:'instructionsOnly',     label:'Processing only on instruction (Art. 28(3)(a))' },
  { key:'confidentiality',      label:'Confidentiality obligation (Art. 28(3)(b))' },
  { key:'security',             label:'TOMs pursuant to Art. 32 (Art. 28(3)(c))' },
  { key:'subProcessorApproval', label:'Sub-processor approval (Art. 28(3)(d))' },
  { key:'assistanceRights',     label:'Assistance with data subject rights (Art. 28(3)(e))' },
  { key:'deletionReturn',       label:'Deletion/return after contract end (Art. 28(3)(f))' },
  { key:'auditRights',          label:'Accountability & audit rights (Art. 28(3)(h))' },
  { key:'cooperation',          label:'Cooperation with supervisory authority (Art. 28(3)(h))' },
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
        <button class="gdpr-tab" data-tab="overview"   onclick="switchGdprTab('overview')"><i class="ph ph-gauge"></i> Overview</button>
        <button class="gdpr-tab" data-tab="vvt"        onclick="switchGdprTab('vvt')"><i class="ph ph-list-bullets"></i> RoPA (Art. 30)</button>
        <button class="gdpr-tab" data-tab="av"         onclick="switchGdprTab('av')"><i class="ph ph-handshake"></i> DPA Contracts (Art. 28)</button>
        <button class="gdpr-tab" data-tab="dsfa"       onclick="switchGdprTab('dsfa')"><i class="ph ph-magnifying-glass"></i> DPIA (Art. 35)</button>
        <button class="gdpr-tab" data-tab="incidents"  onclick="switchGdprTab('incidents')"><i class="ph ph-siren"></i> Data Breaches</button>
        <button class="gdpr-tab" data-tab="dsar"       onclick="switchGdprTab('dsar')"><i class="ph ph-user-circle"></i> Data Subject Rights</button>
        <button class="gdpr-tab" data-tab="toms"       onclick="switchGdprTab('toms')"><i class="ph ph-shield"></i> TOMs</button>
        <button class="gdpr-tab" data-tab="deletion"   onclick="switchGdprTab('deletion')"><i class="ph ph-trash"></i> Deletion Log</button>
        ${gdprCanOwn() ? `<button class="gdpr-tab" data-tab="dsb" onclick="switchGdprTab('dsb')"><i class="ph ph-identification-badge"></i> DPO</button>` : ''}
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
  content.innerHTML = '<p class="report-loading">Loading…</p>'
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
    content.innerHTML = `<p style="color:var(--danger-text);padding:16px"><i class="ph ph-warning"></i> Error loading tab: ${e.message}</p>`
  }
}

// ── Overview / Dashboard ──────────────────────────────────────────

async function renderGdprOverview(el) {
  const r = await fetch('/gdpr/dashboard' + gdprEntityQ(), { headers: apiHeaders() })
  const s = r.ok ? await r.json() : null
  if (!s) { el.innerHTML = '<p class="gdpr-empty">Error loading dashboard.</p>'; return }

  const tomPct = s.toms.total > 0 ? Math.round((s.toms.implemented / s.toms.total) * 100) : 0
  const alerts = []
  if (s.incidents.missed72h > 0) alerts.push(`<div class="gdpr-alert gdpr-alert-error"><i class="ph ph-warning"></i> <strong>${s.incidents.missed72h}</strong> data breach(es): 72-hour reporting deadline exceeded!</div>`)
  if (s.dsar.overdue > 0)        alerts.push(`<div class="gdpr-alert gdpr-alert-error"><i class="ph ph-clock"></i> <strong>${s.dsar.overdue}</strong> data subject request(s) overdue!</div>`)
  if (s.vvt.noLegal > 0)         alerts.push(`<div class="gdpr-alert gdpr-alert-warn"><i class="ph ph-warning-circle"></i> <strong>${s.vvt.noLegal}</strong> RoPA entries without legal basis.</div>`)
  if (!s.dsbSet)                  alerts.push(`<div class="gdpr-alert gdpr-alert-info"><i class="ph ph-info"></i> No Data Protection Officer (DPO) configured.</div>`)

  el.innerHTML = `
    ${alerts.length ? `<div class="gdpr-alerts">${alerts.join('')}</div>` : ''}
    <div class="gdpr-kpi-grid">
      <div class="gdpr-kpi-card"><div class="kpi-value">${s.vvt.total}</div><div class="kpi-label">RoPA Entries</div></div>
      <div class="gdpr-kpi-card ${s.vvt.highRisk > 0 ? 'kpi-warn' : ''}"><div class="kpi-value">${s.vvt.highRisk}</div><div class="kpi-label">High-Risk RoPA</div></div>
      <div class="gdpr-kpi-card"><div class="kpi-value">${s.av.total}</div><div class="kpi-label">DPA Contracts</div></div>
      <div class="gdpr-kpi-card ${s.av.active < s.av.total ? 'kpi-warn' : 'kpi-ok'}"><div class="kpi-value">${s.av.active}</div><div class="kpi-label">DPA active/signed</div></div>
      <div class="gdpr-kpi-card ${s.dsar.open > 0 ? 'kpi-warn' : 'kpi-ok'}"><div class="kpi-value">${s.dsar.open}</div><div class="kpi-label">Open DSARs</div></div>
      <div class="gdpr-kpi-card ${s.dsar.overdue > 0 ? 'kpi-danger' : ''}"><div class="kpi-value">${s.dsar.overdue}</div><div class="kpi-label">Overdue DSARs</div></div>
      <div class="gdpr-kpi-card ${s.incidents.open > 0 ? 'kpi-warn' : ''}"><div class="kpi-value">${s.incidents.open}</div><div class="kpi-label">Open Data Breaches</div></div>
      <div class="gdpr-kpi-card ${s.incidents.missed72h > 0 ? 'kpi-danger' : ''}"><div class="kpi-value">${s.incidents.missed72h}</div><div class="kpi-label">72h Deadline Missed</div></div>
      <div class="gdpr-kpi-card ${tomPct >= 80 ? 'kpi-ok' : tomPct >= 50 ? 'kpi-warn' : 'kpi-danger'}"><div class="kpi-value">${tomPct}%</div><div class="kpi-label">TOMs Implemented</div></div>
      <div class="gdpr-kpi-card ${s.dsbSet ? 'kpi-ok' : 'kpi-warn'}"><div class="kpi-value">${s.dsbSet ? '✓' : '—'}</div><div class="kpi-label">DPO Appointed</div></div>
    </div>`
}

// ── VVT ───────────────────────────────────────────────────────────

async function renderGdprVvt(el) {
  const r = await fetch('/gdpr/vvt' + gdprEntityQ(), { headers: apiHeaders() })
  const list = r.ok ? await r.json() : []

  el.innerHTML = `
    <div class="gdpr-filter-bar">
      ${gdprCanEdit() ? `<button class="btn btn-primary btn-sm" onclick="openVvtForm()"><i class="ph ph-plus"></i> New Entry</button>` : ''}
      <span class="gdpr-filter-count">${list.length} entries</span>
    </div>
    ${list.length === 0 ? '<p class="gdpr-empty">No RoPA entries found.</p>' : `
    <table class="gdpr-table">
      <thead><tr>
        <th>Title</th><th>Legal Basis</th><th>Data Categories</th><th>Risk</th><th>Status</th><th>Owner</th><th style="width:80px"></th>
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
        <button class="btn btn-secondary btn-sm" onclick="switchGdprTab('vvt')"><i class="ph ph-arrow-left"></i> Back</button>
        <h2>${id ? 'Edit RoPA Entry' : 'New RoPA Entry'}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-group"><label class="form-label">Name *</label>
          <input id="vvtTitle" class="form-input" value="${escHtml(v.title||'')}" placeholder="e.g. Customer Management CRM"></div>
        <div class="form-group"><label class="form-label">Purpose of Processing</label>
          <textarea id="vvtPurpose" class="form-input" rows="2">${escHtml(v.purpose||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Legal Basis</label>
          <select id="vvtLegal" class="select">${lbOpts}</select></div>
        <div class="form-group"><label class="form-label">Legal Basis Note</label>
          <input id="vvtLegalNote" class="form-input" value="${escHtml(v.legalBasisNote||'')}" placeholder="e.g. Art. 6(1)(b) GDPR"></div>
        <div class="form-group"><label class="form-label">Data Categories</label>
          <div>${catChecks}</div></div>
        <div class="form-group"><label class="form-label">Data Subjects</label>
          <div>${subChecks}</div></div>
        <div class="form-group"><label class="form-label">Recipients (comma-separated)</label>
          <input id="vvtRecipients" class="form-input" value="${escHtml((v.recipients||[]).join(', '))}" placeholder="e.g. Tax advisor, HR department"></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="vvtIntlTransfer" ${v.internationalTransfer?'checked':''}> International Data Transfer
          </label></div>
        <div class="form-group"><label class="form-label">Transfer Mechanism</label>
          <select id="vvtTransferMech" class="select">${tmOpts}</select></div>
        <div class="form-group"><label class="form-label">Retention Period (text)</label>
          <input id="vvtRetention" class="form-input" value="${escHtml(v.retentionPeriod||'')}" placeholder="e.g. 7 years (§ 257 HGB)"></div>
        <div class="form-group"><label class="form-label">Retention Period (months, for alerts)</label>
          <input id="vvtRetentionMonths" type="number" class="form-input" value="${v.retentionMonths||''}" placeholder="e.g. 84"></div>
        <div class="form-group"><label class="form-label">Deletion Procedure</label>
          <textarea id="vvtDeletion" class="form-input" rows="2">${escHtml(v.deletionProcedure||'')}</textarea></div>
        <div class="form-group" style="display:flex;gap:20px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="vvtHighRisk" ${v.isHighRisk?'checked':''}> High Risk (DPIA required)
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="vvtAutomated" ${v.automatedDecision?'checked':''}> Automated Decision
          </label>
        </div>
        <div class="form-group"><label class="form-label">Owner</label>
          <input id="vvtOwner" class="form-input" value="${escHtml(v.owner||'')}" placeholder="Responsible person"></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select id="vvtStatus" class="select">${stOpts}</select></div>
        ${_gdprEntities.length ? `<div class="form-group"><label class="form-label">Applicable Entities</label>
          <div>${entityChecks}</div></div>` : ''}
        ${renderLinksBlock('vvt', v.linkedControls||[], v.linkedPolicies||[])}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchGdprTab('vvt')">Cancel</button>
        <button class="btn btn-primary" onclick="saveVvt(${id ? `'${id}'` : 'null'})">Save</button>
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
      ${gdprCanOwn() ? `<button class="btn btn-primary btn-sm" onclick="openAvForm()"><i class="ph ph-plus"></i> New DPA Contract</button>` : ''}
      <span class="gdpr-filter-count">${list.length} contracts</span>
    </div>
    ${list.length === 0 ? '<p class="gdpr-empty">No DPA contracts found.</p>' : `
    <table class="gdpr-table">
      <thead><tr>
        <th>Processor</th><th>Status</th><th>Signed On</th><th>Art.28 Checklist</th><th>Valid Until</th><th style="width:80px"></th>
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
        <button class="btn btn-secondary btn-sm" onclick="switchGdprTab('av')"><i class="ph ph-arrow-left"></i> Back</button>
        <h2>${id ? 'Edit DPA Contract' : 'New DPA Contract'}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-group"><label class="form-label">Name *</label>
          <input id="avTitle" class="form-input" value="${escHtml(a.title||'')}"></div>
        <div class="form-group"><label class="form-label">Processor Name *</label>
          <input id="avProcessorName" class="form-input" value="${escHtml(a.processorName||'')}"></div>
        <div class="form-group"><label class="form-label">Country</label>
          <input id="avCountry" class="form-input" value="${escHtml(a.processorCountry||'')}" placeholder="e.g. DE, IE, US"></div>
        <div class="form-group"><label class="form-label">Contact E-Mail</label>
          <input id="avEmail" class="form-input" value="${escHtml(a.processorContactEmail||'')}"></div>
        <div class="form-group"><label class="form-label">Processing Scope</label>
          <textarea id="avScope" class="form-input" rows="2">${escHtml(a.processingScope||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Transfer Mechanism</label>
          <select id="avTransferMech" class="select">${tmOpts}</select></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select id="avStatus" class="select">${stOpts}</select></div>
        <div class="form-group"><label class="form-label">Signed On</label>
          <input id="avSignDate" type="date" class="form-input" value="${a.signatureDate||''}"></div>
        <div class="form-group"><label class="form-label">Valid Until</label>
          <input id="avEffUntil" type="date" class="form-input" value="${a.effectiveUntil||''}"></div>
        <div class="form-group"><label class="form-label">Art. 28 Para. 3 Checklist</label>
          <div class="gdpr-checklist">${checklistHtml}</div></div>
        <div class="form-group"><label class="form-label">Notes</label>
          <textarea id="avNotes" class="form-input" rows="2">${escHtml(a.notes||'')}</textarea></div>
        ${_gdprEntities.length ? `<div class="form-group"><label class="form-label">Applicable Entities</label>
          <div>${entityChecks}</div></div>` : ''}
        <div class="form-group"><label class="form-label">Upload PDF (optional)</label>
          <input type="file" id="avFile" accept=".pdf,.docx,.doc"></div>
        ${renderLinksBlock('avf', a.linkedControls||[], a.linkedPolicies||[])}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchGdprTab('av')">Cancel</button>
        <button class="btn btn-primary" onclick="saveAv(${id ? `'${id}'` : 'null'})">Save</button>
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
      ${gdprCanOwn() ? `<button class="btn btn-primary btn-sm" onclick="openDsfaForm()"><i class="ph ph-plus"></i> New DPIA</button>` : ''}
      <span class="gdpr-filter-count">${list.length} DPIA(s)</span>
    </div>
    ${list.length === 0 ? '<p class="gdpr-empty">No DPIAs found.</p>' : `
    <table class="gdpr-table">
      <thead><tr>
        <th>Title</th><th>RoPA Link</th><th>Residual Risk</th><th>DPO Consulted</th><th>Status</th><th style="width:80px"></th>
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
        <button class="btn btn-secondary btn-sm" onclick="switchGdprTab('dsfa')"><i class="ph ph-arrow-left"></i> Back</button>
        <h2>${id ? 'Edit DPIA' : 'New DPIA'}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-group"><label class="form-label">Name *</label>
          <input id="dsfaTitle" class="form-input" value="${escHtml(d.title||'')}"></div>
        <div class="form-group"><label class="form-label">Linked RoPA ID</label>
          <input id="dsfaVvtId" class="form-input" value="${escHtml(d.linkedVvtId||'')}" placeholder="vvt_seed_001"></div>
        <div class="form-group"><label class="form-label">Processing Description</label>
          <textarea id="dsfaDesc" class="form-input" rows="3">${escHtml(d.processingDescription||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Necessity and Proportionality Assessment</label>
          <textarea id="dsfaNecessity" class="form-input" rows="3">${escHtml(d.necessityAssessment||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Existing Controls / TOMs</label>
          <textarea id="dsfaControls" class="form-input" rows="2">${escHtml(d.existingControls||'')}</textarea></div>

        <h4 style="margin:16px 0 8px;font-size:.9rem">Identified Risks</h4>
        <div id="dsfaRisksContainer">${risksHtml}</div>
        <button class="btn btn-secondary btn-sm" onclick="addDsfaRisk()" style="margin-top:6px"><i class="ph ph-plus"></i> Add Risk</button>

        <div class="form-group" style="margin-top:16px"><label class="form-label">Residual Risk</label>
          <select id="dsfaResidual" class="select">${rrOpts}</select></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="dsfaDpoConsulted" ${d.dpoConsulted?'checked':''}> DPO Consulted
          </label></div>
        <div class="form-group"><label class="form-label">DPO Opinion</label>
          <textarea id="dsfaDpoOpinion" class="form-input" rows="2">${escHtml(d.dpoOpinion||'')}</textarea></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="dsfaSaRequired" ${d.saConsultationRequired?'checked':''}> Prior consultation with supervisory authority required (Art. 36)
          </label></div>
        <div class="form-group"><label class="form-label">Decision</label>
          <select id="dsfaDecision" class="select">${decOpts}</select></div>
        <div class="form-group"><label class="form-label">Decision Justification</label>
          <textarea id="dsfaDecJustify" class="form-input" rows="2">${escHtml(d.decisionJustification||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Owner</label>
          <input id="dsfaOwner" class="form-input" value="${escHtml(d.owner||'')}"></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select id="dsfaStatus" class="select">${stOpts}</select></div>
        ${_gdprEntities.length ? `<div class="form-group"><label class="form-label">Applicable Entities</label>
          <div>${entityChecks}</div></div>` : ''}
        ${renderLinksBlock('dsfa', d.linkedControls||[], d.linkedPolicies||[])}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchGdprTab('dsfa')">Cancel</button>
        <button class="btn btn-primary" onclick="saveDsfa(${id ? `'${id}'` : 'null'})">Save</button>
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
      ${gdprCanAudit() ? `<button class="btn btn-primary btn-sm" onclick="openIncidentForm()"><i class="ph ph-plus"></i> New Data Breach</button>` : ''}
      <span class="gdpr-filter-count">${list.length} data breach(es)</span>
    </div>
    ${list.length === 0 ? '<p class="gdpr-empty">No data breaches recorded.</p>' : `
    <table class="gdpr-table">
      <thead><tr>
        <th>Title</th><th>Type</th><th>Discovered</th><th>72h Timer</th><th>Risk</th><th>SA Notified</th><th>Status</th><th style="width:80px"></th>
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
        <button class="btn btn-secondary btn-sm" onclick="switchGdprTab('incidents')"><i class="ph ph-arrow-left"></i> Back</button>
        <h2>${id ? 'Edit Data Breach' : 'Record New Data Breach'}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-group"><label class="form-label">Name *</label>
          <input id="incTitle" class="form-input" value="${escHtml(inc.title||'')}"></div>
        <div class="form-group"><label class="form-label">Breach Type</label>
          <select id="incType" class="select">${typeOpts}</select></div>
        <div class="form-group"><label class="form-label">Discovered On</label>
          <input id="incDiscovered" type="datetime-local" class="form-input" value="${inc.discoveredAt ? inc.discoveredAt.slice(0,16) : ''}"></div>
        <div class="form-group"><label class="form-label">Affected Data Categories</label>
          <div>${catChecks}</div></div>
        <div class="form-group"><label class="form-label">Estimated Number of Data Subjects Affected</label>
          <input id="incAffected" type="number" class="form-input" value="${inc.estimatedAffected||''}"></div>
        <div class="form-group"><label class="form-label">Risk Assessment</label>
          <select id="incRiskLevel" class="select">${rlOpts}</select></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="incSaRequired" ${inc.saNotificationRequired?'checked':''}> Notification obligation to supervisory authority (Art. 33) — within 72 hours
          </label></div>
        <div class="form-group"><label class="form-label">SA Reference Number</label>
          <input id="incSaRef" class="form-input" value="${escHtml(inc.saReference||'')}" placeholder="if notified"></div>
        <div class="form-group"><label class="form-label">SA Notified On</label>
          <input id="incSaNotified" type="datetime-local" class="form-input" value="${inc.saNotifiedAt ? inc.saNotifiedAt.slice(0,16) : ''}"></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="incDsRequired" ${inc.dsNotificationRequired?'checked':''}> Notification obligation to data subjects (Art. 34)
          </label></div>
        <div class="form-group"><label class="form-label">Containment Measures</label>
          <textarea id="incContainment" class="form-input" rows="2">${escHtml(inc.containmentMeasures||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Root Cause Analysis</label>
          <textarea id="incRootCause" class="form-input" rows="2">${escHtml(inc.rootCause||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Remediation Measures</label>
          <textarea id="incRemediation" class="form-input" rows="2">${escHtml(inc.remediationMeasures||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select id="incStatus" class="select">${stOpts}</select></div>
        ${_gdprEntities.length ? `<div class="form-group"><label class="form-label">Applicable Entities</label>
          <div>${entityChecks}</div></div>` : ''}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchGdprTab('incidents')">Cancel</button>
        <button class="btn btn-primary" onclick="saveIncident(${id ? `'${id}'` : 'null'})">Save</button>
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
      ${gdprCanEdit() ? `<button class="btn btn-primary btn-sm" onclick="openDsarForm()"><i class="ph ph-plus"></i> New Request</button>` : ''}
      <span class="gdpr-filter-count">${list.length} requests</span>
    </div>
    ${list.length === 0 ? '<p class="gdpr-empty">No data subject requests found.</p>' : `
    <table class="gdpr-table">
      <thead><tr>
        <th>Type</th><th>Data Subject</th><th>Received</th><th>Deadline</th><th>Status</th><th style="width:80px"></th>
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
        <button class="btn btn-secondary btn-sm" onclick="switchGdprTab('dsar')"><i class="ph ph-arrow-left"></i> Back</button>
        <h2>${id ? 'Edit DSAR' : 'New Data Subject Request'}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-group"><label class="form-label">Request Type</label>
          <select id="dsarType" class="select">${typeOpts}</select></div>
        <div class="form-group"><label class="form-label">Data Subject Name</label>
          <input id="dsarName" class="form-input" value="${escHtml(d.dataSubjectName||'')}"></div>
        <div class="form-group"><label class="form-label">Data Subject E-Mail</label>
          <input id="dsarEmail" class="form-input" value="${escHtml(d.dataSubjectEmail||'')}"></div>
        <div class="form-group"><label class="form-label">Received On (deadline: +30 days)</label>
          <input id="dsarReceived" type="date" class="form-input" value="${d.receivedAt ? d.receivedAt.slice(0,10) : new Date().toISOString().slice(0,10)}"></div>
        <div class="form-group">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="dsarVerified" ${d.identityVerified?'checked':''}> Identity verified
          </label></div>
        <div class="form-group"><label class="form-label">Response / Justification</label>
          <textarea id="dsarResponse" class="form-input" rows="3">${escHtml(d.response||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Refusal Reason (if status: Refused)</label>
          <input id="dsarRefusal" class="form-input" value="${escHtml(d.refusalReason||'')}"></div>
        <div class="form-group"><label class="form-label">Handled By</label>
          <input id="dsarHandler" class="form-input" value="${escHtml(d.handledBy||'')}" placeholder="Responsible person"></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select id="dsarStatus" class="select">${stOpts}</select></div>
        ${_gdprEntities.length ? `<div class="form-group"><label class="form-label">Applicable Entities</label>
          <div>${entityChecks}</div></div>` : ''}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchGdprTab('dsar')">Cancel</button>
        <button class="btn btn-primary" onclick="saveDsar(${id ? `'${id}'` : 'null'})">Save</button>
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
      ${gdprCanOwn() ? `<button class="btn btn-primary btn-sm" onclick="openTomForm()"><i class="ph ph-plus"></i> New TOM</button>` : ''}
      <select class="select" style="font-size:.82rem" onchange="_gdprTomCategory=this.value;switchGdprTab('toms')">${catOpts}</select>
      <span class="gdpr-filter-count">${list.length} TOMs</span>
    </div>
    ${list.length === 0 ? '<p class="gdpr-empty">No TOMs found.</p>' : `
    <table class="gdpr-table">
      <thead><tr>
        <th>Title</th><th>Category</th><th>Status</th><th>Owner</th><th>Review</th><th style="width:80px"></th>
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
  const t = item || {}

  const catOpts = GDPR_TOM_CATS.map(c => `<option value="${c.id}" ${t.category === c.id ? 'selected':''}>${c.label}</option>`).join('')
  const stOpts  = GDPR_TOM_STATUSES.map(s => `<option value="${s.id}" ${t.status === s.id ? 'selected':''}>${s.label}</option>`).join('')
  const rlOpts  = GDPR_RISK_LEVELS.map(l => `<option value="${l.id}" ${t.riskLevel === l.id ? 'selected':''}>${l.label}</option>`).join('')
  const entityChecks = _gdprEntities.map(e =>
    `<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-size:.8rem">
       <input type="checkbox" value="${e.id}" class="tom-entity-cb" ${(t.applicableEntities||[]).includes(e.id)?'checked':''}> ${escHtml(e.name)}
     </label>`).join('')

  document.getElementById('gdprTabContent').innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchGdprTab('toms')"><i class="ph ph-arrow-left"></i> Back</button>
        <h2>${id ? 'Edit TOM' : 'New TOM'}</h2>
      </div>
      <div class="training-form-body">
        <div class="form-group"><label class="form-label">Name *</label>
          <input id="tomTitle" class="form-input" value="${escHtml(t.title||'')}"></div>
        <div class="form-group"><label class="form-label">Category</label>
          <select id="tomCategory" class="select">${catOpts}</select></div>
        <div class="form-group"><label class="form-label">Description</label>
          <textarea id="tomDesc" class="form-input" rows="2">${escHtml(t.description||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Implementation / Details</label>
          <textarea id="tomImpl" class="form-input" rows="2">${escHtml(t.implementation||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select id="tomStatus" class="select">${stOpts}</select></div>
        <div class="form-group"><label class="form-label">Owner</label>
          <input id="tomOwner" class="form-input" value="${escHtml(t.owner||'')}"></div>
        <div class="form-group"><label class="form-label">Risk Level</label>
          <select id="tomRisk" class="select">${rlOpts}</select></div>
        <div class="form-group"><label class="form-label">Evidence / Proof</label>
          <input id="tomEvidence" class="form-input" value="${escHtml(t.evidenceNote||'')}" placeholder="e.g. Audit report, screenshot"></div>
        <div class="form-group"><label class="form-label">Retention Rule</label>
          <input id="tomRetention" class="form-input" value="${escHtml(t.retentionRule||'')}" placeholder="e.g. Logs 3 years"></div>
        <div class="form-group"><label class="form-label">Review Date</label>
          <input id="tomReview" type="date" class="form-input" value="${t.reviewDate||''}"></div>
        ${_gdprEntities.length ? `<div class="form-group"><label class="form-label">Applicable Entities</label>
          <div>${entityChecks}</div></div>` : ''}
        ${renderLinksBlock('tom', t.linkedControls||[], t.linkedPolicies||[])}
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchGdprTab('toms')">Cancel</button>
        <button class="btn btn-primary" onclick="saveTom(${id ? `'${id}'` : 'null'})">Save</button>
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
      <h3 style="margin:0"><i class="ph ph-trash"></i> Deletion Log (Art. 17 GDPR)</h3>
    </div>

    ${due.length > 0 ? `
    <div class="gdpr-alert gdpr-alert-error" style="margin-bottom:1rem">
      <i class="ph ph-warning"></i> <strong>${due.length}</strong> RoPA entries with expired retention period must be deleted.
    </div>
    <h4 style="color:var(--color-danger)">Deletion Due (${due.length})</h4>
    <table class="gdpr-table">
      <thead><tr><th>RoPA Title</th><th>Due Since</th><th>Period (Months)</th>${canOwn ? '<th>Action</th>' : ''}</tr></thead>
      <tbody>${due.map(v => `
        <tr>
          <td>${escHtml(v.title)}</td>
          <td style="color:var(--color-danger)">${fmtDate(v.deletionDue)}</td>
          <td>${v.retentionMonths} months</td>
          ${canOwn ? `<td><button class="btn btn-sm btn-danger" onclick="confirmDeletion('${v.id}','${escHtml(v.title).replace(/'/g,"\\'")}')"><i class="ph ph-check"></i> Confirm Deletion</button></td>` : ''}
        </tr>`).join('')}
      </tbody>
    </table>` : `<p class="gdpr-empty" style="color:var(--color-success)"><i class="ph ph-check-circle"></i> No deletion deadlines due.</p>`}

    ${upcoming.length > 0 ? `
    <h4 style="color:var(--color-warning);margin-top:1.5rem">Due Soon – next 90 days (${upcoming.length})</h4>
    <table class="gdpr-table">
      <thead><tr><th>RoPA Title</th><th>Due On</th><th>Period (Months)</th></tr></thead>
      <tbody>${upcoming.map(v => `
        <tr>
          <td>${escHtml(v.title)}</td>
          <td style="color:var(--color-warning)">${fmtDate(v.deletionDue)}</td>
          <td>${v.retentionMonths} months</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}

    <h4 style="margin-top:1.5rem">Log of Confirmed Deletions (${log.length})</h4>
    ${log.length === 0 ? '<p class="gdpr-empty">No deletions recorded yet.</p>' : `
    <table class="gdpr-table">
      <thead><tr><th>RoPA Title</th><th>Confirmed On</th><th>By</th><th>Method</th><th>Note</th></tr></thead>
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
      <h3 style="font-size:1rem;margin-bottom:4px">Data Protection Officer (DPO)</h3>
      <p style="font-size:.8rem;color:var(--text-subtle);margin-bottom:16px">Art. 37 GDPR – Designation of a DPO</p>
      <div class="form-group"><label class="form-label">Type</label>
        <select id="dsbType" class="select">
          <option value="internal" ${d.type==='internal'?'selected':''}>Internal</option>
          <option value="external" ${d.type==='external'?'selected':''}>External</option>
        </select></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Name</label>
          <input id="dsbName" class="form-input" value="${escHtml(d.name||'')}"></div>
        <div class="form-group"><label class="form-label">E-Mail</label>
          <input id="dsbEmail" class="form-input" value="${escHtml(d.email||'')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Phone</label>
          <input id="dsbPhone" class="form-input" value="${escHtml(d.phone||'')}"></div>
        <div class="form-group"><label class="form-label">Appointed On</label>
          <input id="dsbApptDate" type="date" class="form-input" value="${d.appointmentDate||''}"></div>
      </div>
      <div class="form-group"><label class="form-label">Contract Until (for external DPO)</label>
        <input id="dsbContractEnd" type="date" class="form-input" value="${d.contractEnd||''}"></div>
      <div class="form-group"><label class="form-label">Notes</label>
        <textarea id="dsbNotes" class="form-input" rows="3">${escHtml(d.notes||'')}</textarea></div>

      <div class="form-group">
        <label class="form-label">Appointment Certificate (PDF/DOCX)</label>
        ${d.filePath ? `<div style="margin-bottom:8px"><a href="/gdpr/dsb/file" target="_blank" class="btn btn-secondary btn-sm"><i class="ph ph-file-pdf"></i> ${escHtml(d.filename || 'Open document')}</a></div>` : ''}
        <input type="file" id="dsbFile" accept=".pdf,.docx,.doc">
      </div>

      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary" onclick="saveDsb()"><i class="ph ph-floppy-disk"></i> Save</button>
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
  security_awareness: 'Security Awareness',
  iso27001:           'ISO 27001',
  gdpr:               'GDPR',
  technical:          'Technical',
  management:         'Management',
  other:              'Other'
}
const TRAINING_STATUS_LABELS = {
  planned:     'Planned',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled'
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
      <h2 class="training-title"><i class="ph ph-graduation-cap"></i> Training</h2>
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
  el.innerHTML = '<p style="color:var(--text-subtle);padding:24px">Loading…</p>'
  try {
    if (tab === 'overview')  await renderTrainingOverview(el)
    if (tab === 'plan')      await renderTrainingPlan(el)
    if (tab === 'evidence')  await renderTrainingEvidence(el)
  } catch(e) {
    el.innerHTML = `<p style="color:var(--danger-text);padding:24px"><i class="ph ph-warning"></i> Error loading: ${e.message}. Bitte Server neu starten.</p>`
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
      <div class="training-kpi"><span class="training-kpi-val">${summary.total}</span><span class="training-kpi-label">Total</span></div>
      <div class="training-kpi planned"><span class="training-kpi-val">${summary.planned}</span><span class="training-kpi-label">Planned</span></div>
      <div class="training-kpi inprogress"><span class="training-kpi-val">${summary.inProgress}</span><span class="training-kpi-label">In Progress</span></div>
      <div class="training-kpi completed"><span class="training-kpi-val">${summary.completed}</span><span class="training-kpi-label">Completed</span></div>
      <div class="training-kpi overdue"><span class="training-kpi-val">${summary.overdue}</span><span class="training-kpi-label">Overdue</span></div>
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
            <span class="training-due ${urgency}">${i.dueDate ? (i.overdue ? `${t('training_overdueSince')} ${i.dueDate}` : `Due: ${i.dueDate}`) : '—'}</span>
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
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openTrainingForm()"><i class="ph ph-plus"></i> New Training</button>` : ''}
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
  if (!list.length) { el.innerHTML = '<p style="color:var(--text-subtle);padding:16px">No training records found.</p>'; return }
  el.innerHTML = `
    <table class="training-table">
      <thead><tr>
        <th>Title</th><th>Category</th><th>Status</th><th>Due</th><th>Mandatory</th><th>Assigned To</th>${canEdit?'<th></th>':''}
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
            <span style="color:var(--text-subtle);font-size:.78rem">Abgeschlossen: ${i.completedDate||'—'}</span>
          </div>
          <div class="training-evidence-meta">
            <span><i class="ph ph-user"></i> ${escHtml(i.instructor||'—')}</span>
            <span><i class="ph ph-users"></i> ${escHtml(i.assignees||'—')}</span>
          </div>
          ${i.evidence ? `<div class="training-evidence-text"><i class="ph ph-note-pencil"></i> ${escHtml(i.evidence)}</div>` : '<div class="training-evidence-text" style="color:var(--text-subtle);font-style:italic">Kein Nachweis hinterlegt.</div>'}
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
          <i class="ph ph-arrow-left"></i> Back to Overview
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-graduation-cap"></i>
          ${isEdit ? 'Edit Training' : 'New Training'}
        </h3>
      </div>
      <div class="training-form-body">
        <div class="training-form-section">
          <div class="form-group">
            <label class="form-label">Title <span class="form-required">*</span></label>
            <input id="tmTitel" class="form-input" value="${escHtml(item?.title||'')}" placeholder="Training title">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="tmCat" class="select">
                ${Object.entries(TRAINING_CAT_LABELS).map(([v,l])=>`<option value="${v}"${item?.category===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="tmStatus" class="select">
                ${Object.entries(TRAINING_STATUS_LABELS).map(([v,l])=>`<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="tmDesc" class="form-input" rows="3" placeholder="Goals and content of the training">${escHtml(item?.description||'')}</textarea>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-calendar"></i> Planning</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Due Date</label>
              <input id="tmDue" type="date" class="form-input" value="${item?.dueDate||''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">Completed On</label>
              <input id="tmDone" type="date" class="form-input" value="${item?.completedDate||''}" style="color-scheme:dark">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Instructor / Provider</label>
              <input id="tmInstructor" class="form-input" value="${escHtml(item?.instructor||'')}" placeholder="e.g. IT Security Team, external provider">
            </div>
            <div class="form-group">
              <label class="form-label">Assigned To</label>
              <input id="tmAssignees" class="form-input" value="${escHtml(item?.assignees||'')}" placeholder="e.g. All staff, HR department">
            </div>
          </div>
          <div class="form-group" style="display:flex;align-items:center;gap:10px;margin-top:4px">
            <input id="tmMandatory" type="checkbox" ${item?.mandatory?'checked':''} style="width:16px;height:16px">
            <label for="tmMandatory" class="form-label" style="margin:0;cursor:pointer">Mandatory Training</label>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-certificate"></i> Evidence</h4>
          <div class="form-group">
            <label class="form-label">Evidence / Notes</label>
            <textarea id="tmEvidence" class="form-input" rows="4" placeholder="Attendance list, certificates, links to documents…">${escHtml(item?.evidence||'')}</textarea>
          </div>
          ${renderLinksBlock('tm', item?.linkedControls||[], item?.linkedPolicies||[])}
        </div>
      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchTrainingTab('plan')">Cancel</button>
        <button class="btn btn-primary" onclick="saveTraining('${id||''}')">
          <i class="ph ph-floppy-disk"></i> Save
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

const LEGAL_CONTRACT_STATUS_LABELS = { draft:'Draft', review:'Review', active:'Active', expired:'Expired', terminated:'Terminated' }
const LEGAL_NDA_STATUS_LABELS      = { draft:'Draft', signed:'Signed', expired:'Expired', terminated:'Terminated' }
const LEGAL_POLICY_STATUS_LABELS   = { draft:'Draft', review:'Review', published:'Published', archived:'Archived' }
const LEGAL_CONTRACT_TYPE_LABELS   = { service:'Service', supply:'Supply', nda:'NDA', framework:'Framework Agreement', other:'Other' }
const LEGAL_NDA_TYPE_LABELS        = { bilateral:'Bilateral', unilateral_recv:'Unilateral (Receiving)', unilateral_give:'Unilateral (Giving)' }
const LEGAL_POLICY_TYPE_LABELS     = { privacy_notice:'Privacy Notice', cookie:'Cookie Policy', consent_form:'Consent Form', employee:'Employee', internal:'Internal', other:'Other' }

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
      <h4 class="legal-form-section-title"><i class="ph ph-paperclip"></i> Attachments</h4>
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
            <label class="form-label">Title <span class="form-required">*</span></label>
            <input id="lc_title" class="form-input" value="${escHtml(item?.title||'')}" placeholder="Contract name">
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select id="lc_type" class="select">
              ${Object.entries(LEGAL_CONTRACT_TYPE_LABELS).map(([v,l])=>`<option value="${v}"${item?.contractType===v?' selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">Counterparty</label>
            <input id="lc_party" class="form-input" value="${escHtml(item?.counterparty||'')}" placeholder="Company name">
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="lc_status" class="select">
              ${Object.entries(LEGAL_CONTRACT_STATUS_LABELS).map(([v,l])=>`<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Start</label><input id="lc_start" type="date" class="form-input" value="${item?.startDate||''}" style="color-scheme:dark"></div>
          <div class="form-group"><label class="form-label">End</label><input id="lc_end" type="date" class="form-input" value="${item?.endDate||''}" style="color-scheme:dark"></div>
          <div class="form-group"><label class="form-label">Notice Period (days)</label><input id="lc_notice" type="number" class="form-input" value="${item?.noticePeriodDays||''}" placeholder="e.g. 30"></div>
          <div class="form-group"><label class="form-label">Contract Value</label><input id="lc_value" class="form-input" value="${escHtml(item?.value||'')}" placeholder="e.g. 12,000 EUR/year"></div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">Owner / Responsible</label>
            <input id="lc_owner" class="form-input" value="${escHtml(item?.owner||'')}" placeholder="Name or department">
          </div>
          <div class="form-group" style="display:flex;align-items:center;gap:.5rem;padding-top:1.5rem">
            <input type="checkbox" id="lc_autorenew" ${item?.autoRenew?'checked':''} style="width:16px;height:16px">
            <label for="lc_autorenew" class="form-label" style="margin:0;cursor:pointer">Auto-Renewal</label>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Description / Subject</label>
          <textarea id="lc_desc" class="form-input" rows="4" placeholder="Service description, subject matter of the contract…">${escHtml(item?.description||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Internal Notes</label>
          <textarea id="lc_notes" class="form-input" rows="3" placeholder="Notes for internal use…">${escHtml(item?.notes||'')}</textarea></div>
        ${renderLinksBlock('lc', item?.linkedControls||[], item?.linkedPolicies||[])}
      </div>
      ${attachSection}`
  } else if (type === 'nda') {
    formBody = `
      <div class="legal-form-section">
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">Title <span class="form-required">*</span></label>
            <input id="ln_title" class="form-input" value="${escHtml(item?.title||'')}" placeholder="NDA name">
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select id="ln_type" class="select">
              ${Object.entries(LEGAL_NDA_TYPE_LABELS).map(([v,l])=>`<option value="${v}"${item?.ndaType===v?' selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="ln_status" class="select">
              ${Object.entries(LEGAL_NDA_STATUS_LABELS).map(([v,l])=>`<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">Counterparty</label>
            <input id="ln_party" class="form-input" value="${escHtml(item?.counterparty||'')}" placeholder="Company / person name">
          </div>
          <div class="form-group"><label class="form-label">Signed On</label>
            <input id="ln_signed" type="date" class="form-input" value="${item?.signingDate||''}" style="color-scheme:dark"></div>
          <div class="form-group"><label class="form-label">Expires On</label>
            <input id="ln_expiry" type="date" class="form-input" value="${item?.expiryDate||''}" style="color-scheme:dark"></div>
        </div>
        <div class="form-group"><label class="form-label">Owner / Responsible</label>
          <input id="ln_owner" class="form-input" value="${escHtml(item?.owner||'')}" placeholder="Name or department"></div>
        <div class="form-group"><label class="form-label">Scope / Subject of Confidentiality</label>
          <textarea id="ln_scope" class="form-input" rows="4" placeholder="Which information is covered by the NDA?">${escHtml(item?.scope||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Internal Notes</label>
          <textarea id="ln_notes" class="form-input" rows="3">${escHtml(item?.notes||'')}</textarea></div>
        ${renderLinksBlock('ln', item?.linkedControls||[], item?.linkedPolicies||[])}
      </div>
      ${attachSection}`
  } else if (type === 'policy') {
    formBody = `
      <div class="legal-form-section">
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">Title <span class="form-required">*</span></label>
            <input id="lp_title" class="form-input" value="${escHtml(item?.title||'')}" placeholder="Policy name">
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select id="lp_type" class="select">
              ${Object.entries(LEGAL_POLICY_TYPE_LABELS).map(([v,l])=>`<option value="${v}"${item?.policyType===v?' selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="lp_status" class="select">
              ${Object.entries(LEGAL_POLICY_STATUS_LABELS).map(([v,l])=>`<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">URL (public page)</label>
            <input id="lp_url" class="form-input" value="${escHtml(item?.url||'')}" placeholder="https://…">
          </div>
          <div class="form-group"><label class="form-label">Published On</label>
            <input id="lp_pub" type="date" class="form-input" value="${item?.publishedAt||''}" style="color-scheme:dark"></div>
          <div class="form-group"><label class="form-label">Next Review</label>
            <input id="lp_review" type="date" class="form-input" value="${item?.nextReviewDate||''}" style="color-scheme:dark"></div>
        </div>
        <div class="form-group"><label class="form-label">Owner / Responsible</label>
          <input id="lp_owner" class="form-input" value="${escHtml(item?.owner||'')}" placeholder="Name or department"></div>
        <div class="form-group"><label class="form-label">Description</label>
          <textarea id="lp_desc" class="form-input" rows="3" placeholder="Brief description and scope">${escHtml(item?.description||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Policy Content (Markdown)</label>
          <textarea id="lp_content" class="form-input" rows="8" placeholder="## Privacy Policy&#10;&#10;We process your data pursuant to Art. 6 GDPR…">${escHtml(item?.content||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Internal Notes</label>
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
        <button class="btn btn-secondary" onclick="switchLegalTab('${LEGAL_BACK_TAB[type]}')">Cancel</button>
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

const ASSET_TYPES_MAP = {
  hardware_server: 'Server', hardware_workstation: 'Workstation / PC', hardware_laptop: 'Laptop / Notebook',
  hardware_mobile: 'Mobile Device', hardware_network: 'Network Equipment', hardware_ics_ot: 'ICS/OT System',
  hardware_building: 'Building Technology (BAS)', hardware_other: 'Hardware (Other)',
  software_app: 'Application Software', software_os: 'Operating System', software_cloud: 'Cloud Service (IaaS/PaaS)',
  software_saas: 'SaaS Application', software_other: 'Software (Other)',
  data_database: 'Database', data_document: 'Document Collection', data_backup: 'Backup / Archive', data_other: 'Data (Other)',
  service_internal: 'Internal Service', service_cloud: 'Cloud Service (External)', service_external: 'External Service Provider',
  facility_office: 'Office Building', facility_datacenter: 'Data Centre / Server Room',
  facility_production: 'Production Site / Plant', facility_other: 'Facility (Other)',
}

const ASSET_CAT_LABELS = {
  hardware: 'Hardware',
  software: 'Software',
  data:     'Data / Information',
  service:  'Services',
  facility: 'Facilities',
}

const ASSET_CLASS = {
  public:               { label: 'Public',               color: '#4ade80' },
  internal:             { label: 'Internal',             color: '#60a5fa' },
  confidential:         { label: 'Confidential',         color: '#f0b429' },
  strictly_confidential:{ label: 'Strictly Confidential', color: '#f87171' },
}

const ASSET_CRIT = {
  low:      { label: 'Low',      color: '#4ade80' },
  medium:   { label: 'Medium',   color: '#60a5fa' },
  high:     { label: 'High',     color: '#f0b429' },
  critical: { label: 'Critical', color: '#f87171' },
}

const ASSET_STATUS_LABELS = { active: 'Active', planned: 'Planned', decommissioned: 'Decommissioned' }

function assetClassBadge(cls) {
  const c = ASSET_CLASS[cls] || { label: cls || '—', color: '#8C9BAB' }
  return `<span class="asset-badge" style="color:${c.color};border-color:${c.color}">${c.label}</span>`
}

function assetCritBadge(crit) {
  const c = ASSET_CRIT[crit] || { label: crit || '—', color: '#8C9BAB' }
  return `<span class="asset-badge" style="color:${c.color};border-color:${c.color}">${c.label}</span>`
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
  ]

  container.innerHTML = `
    <div class="training-header">
      <h2 class="training-title"><i class="ph ph-buildings"></i> Asset Management</h2>
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
  el.innerHTML = '<p style="color:var(--text-subtle);padding:24px">Loading…</p>'
  try {
    if (tab === 'list')        await renderAssetsList(el)
    if (tab === 'by-category') await renderAssetsByCategory(el)
    if (tab === 'by-class')    await renderAssetsByClass(el)
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

  el.innerHTML = `
    <div class="asset-filter-bar">
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openAssetForm()"><i class="ph ph-plus"></i> ${t('assets_new')}</button>` : ''}
      <select id="assetFilterCat" onchange="_filterAssets()" title="Category">
        <option value="">${t('filter_allCats')}</option>
        ${Object.entries(ASSET_CAT_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
      <select id="assetFilterClass" onchange="_filterAssets()" title="Classification">
        <option value="">${t('assets_allClass')}</option>
        ${Object.entries(ASSET_CLASS).map(([v,c])=>`<option value="${v}">${c.label}</option>`).join('')}
      </select>
      <select id="assetFilterCrit" onchange="_filterAssets()" title="Criticality">
        <option value="">${t('assets_allCrit')}</option>
        ${Object.entries(ASSET_CRIT).map(([v,c])=>`<option value="${v}">${c.label}</option>`).join('')}
      </select>
      <select id="assetFilterStatus" onchange="_filterAssets()" title="Status">
        <option value="">${t('filter_allStatuses')}</option>
        ${Object.entries(ASSET_STATUS_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
      <input id="assetSearch" placeholder="Search…" oninput="_filterAssets()" style="flex:1;min-width:140px">
    </div>
    <div id="assetsTableWrap"></div>
  `

  _renderAssetsTable(list, canEdit, isAdmin, entMap)
}

function _renderAssetsTable(list, canEdit, isAdmin, entMap) {
  const el = dom('assetsTableWrap')
  if (!el) return
  if (!list.length) { el.innerHTML = '<p style="color:var(--text-subtle);padding:16px">No assets found.</p>'; return }
  const now = new Date()
  el.innerHTML = `
    <table class="asset-table">
      <thead><tr>
        <th>Name</th><th>Type</th><th>Classification</th><th>Criticality</th><th>Owner</th><th>Status</th><th>EoL</th>${canEdit?'<th></th>':''}
      </tr></thead>
      <tbody>
        ${list.map(a => {
          const eolDays = a.endOfLifeDate ? Math.ceil((new Date(a.endOfLifeDate) - now) / 86400000) : null
          const eolStr  = a.endOfLifeDate ? (eolDays < 0 ? `<span style="color:#f87171">Expired</span>` : eolDays <= 90 ? `<span style="color:#f0b429">${a.endOfLifeDate}</span>` : a.endOfLifeDate) : '—'
          return `<tr>
            <td><strong>${escHtml(a.name)}</strong><br><span style="font-size:.75rem;color:var(--text-subtle)">${escHtml(ASSET_CAT_LABELS[a.category]||a.category)}</span></td>
            <td style="font-size:.78rem;color:var(--text-subtle)">${escHtml(ASSET_TYPES_MAP[a.type]||a.type||'—')}</td>
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

  const params = new URLSearchParams()
  if (cat)    params.set('category', cat)
  if (cls)    params.set('classification', cls)
  if (crit)   params.set('criticality', crit)
  if (status) params.set('status', status)

  const [listRes, entRes] = await Promise.all([
    fetch(`/assets?${params}`, { headers: apiHeaders() }),
    fetch('/entities', { headers: apiHeaders() }),
  ])
  let list = listRes.ok ? await listRes.json() : []
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
  for (const [catKey, catLabel] of Object.entries(ASSET_CAT_LABELS)) {
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
        ? '<p style="color:var(--text-subtle);font-size:.82rem;padding:4px 0">No assets in this category.</p>'
        : `<table class="asset-table">
            <thead><tr><th>Name</th><th>Type</th><th>Classification</th><th>Criticality</th><th>Status</th></tr></thead>
            <tbody>
              ${g.items.map(a => `<tr>
                <td><strong>${escHtml(a.name)}</strong></td>
                <td style="font-size:.78rem;color:var(--text-subtle)">${escHtml(ASSET_TYPES_MAP[a.type]||a.type||'—')}</td>
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
        <div class="assc-label">Critical unclassified</div>
      </div>
      <div class="asset-summary-card">
        <div class="assc-value" style="color:#f0b429">${summary.endOfLifeSoon || 0}</div>
        <div class="assc-label">EoL in 90 days</div>
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
        ? '<p style="color:var(--text-subtle);font-size:.82rem;padding:4px 0">No assets.</p>'
        : `<table class="asset-table">
            <thead><tr><th>Name</th><th>Category</th><th>Criticality</th><th>Owner</th><th>Status</th></tr></thead>
            <tbody>
              ${g.items.map(a => `<tr>
                <td><strong>${escHtml(a.name)}</strong></td>
                <td style="font-size:.78rem;color:var(--text-subtle)">${escHtml(ASSET_CAT_LABELS[a.category]||a.category)}</td>
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

  const el = dom('assetsTabContent')
  if (!el) return

  document.querySelectorAll('.training-tab').forEach(b => b.classList.remove('active'))

  const catOptions = Object.entries(ASSET_CAT_LABELS).map(([v,l]) =>
    `<option value="${v}"${item?.category===v?' selected':''}>${l}</option>`
  ).join('')

  const typeOptions = Object.entries(ASSET_TYPES_MAP).map(([v,l]) =>
    `<option value="${v}"${item?.type===v?' selected':''}>${l}</option>`
  ).join('')

  const classOptions = Object.entries(ASSET_CLASS).map(([v,c]) =>
    `<option value="${v}"${item?.classification===v?' selected':''}>${c.label}</option>`
  ).join('')

  const critOptions = Object.entries(ASSET_CRIT).map(([v,c]) =>
    `<option value="${v}"${item?.criticality===v?' selected':''}>${c.label}</option>`
  ).join('')

  const statusOptions = Object.entries(ASSET_STATUS_LABELS).map(([v,l]) =>
    `<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`
  ).join('')

  const entityOptions = `<option value="">— No entity —</option>` +
    entities.map(e => `<option value="${e.id}"${item?.entityId===e.id?' selected':''}>${escHtml(e.name)}</option>`).join('')

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchAssetsTab('list')">
          <i class="ph ph-arrow-left"></i> Back to Overview
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-buildings"></i>
          ${isEdit ? 'Edit Asset' : 'New Asset'}
        </h3>
      </div>
      <div class="training-form-body">

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-info"></i> Basic Information</h4>
          <div class="form-group">
            <label class="form-label">Name <span class="form-required">*</span></label>
            <input id="asName" class="form-input" value="${escHtml(item?.name||'')}" placeholder="Asset name">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="asCat" class="select">${catOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select id="asType" class="select">${typeOptions}</select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="asDesc" class="form-input" rows="3" placeholder="Brief description of the asset">${escHtml(item?.description||'')}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="asStatus" class="select">${statusOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Tags (comma-separated)</label>
              <input id="asTags" class="form-input" value="${escHtml((item?.tags||[]).join(', '))}" placeholder="e.g. erp, production">
            </div>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-shield-check"></i> Classification &amp; Criticality <span style="font-size:.75rem;color:var(--text-subtle);font-weight:400">(ISO 27001 A.5.12)</span></h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Classification</label>
              <select id="asClass" class="select">${classOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Criticality</label>
              <select id="asCrit" class="select">${critOptions}</select>
            </div>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-users"></i> Responsibilities</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Information Owner</label>
              <input id="asOwner" class="form-input" value="${escHtml(item?.owner||'')}" placeholder="Information owner name">
            </div>
            <div class="form-group">
              <label class="form-label">Owner E-Mail</label>
              <input id="asOwnerEmail" type="email" class="form-input" value="${escHtml(item?.ownerEmail||'')}" placeholder="owner@company.com">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Technical Custodian</label>
              <input id="asCustodian" class="form-input" value="${escHtml(item?.custodian||'')}" placeholder="Team or person">
            </div>
            <div class="form-group">
              <label class="form-label">Entity</label>
              <select id="asEntity" class="select">${entityOptions}</select>
            </div>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-gear"></i> Technical Details</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Manufacturer / Vendor</label>
              <input id="asVendor" class="form-input" value="${escHtml(item?.vendor||'')}" placeholder="e.g. SAP SE, Microsoft">
            </div>
            <div class="form-group">
              <label class="form-label">Version</label>
              <input id="asVersion" class="form-input" value="${escHtml(item?.version||'')}" placeholder="e.g. 2023, v2.9">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Serial Number / Asset ID</label>
              <input id="asSerial" class="form-input" value="${escHtml(item?.serialNumber||'')}" placeholder="Serial number or internal ID">
            </div>
            <div class="form-group">
              <label class="form-label">Location / Room</label>
              <input id="asLocation" class="form-input" value="${escHtml(item?.location||'')}" placeholder="e.g. DC Frankfurt, Room A-03">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Purchase Date</label>
              <input id="asPurchase" type="date" class="form-input" value="${item?.purchaseDate||''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">End-of-Life Date</label>
              <input id="asEol" type="date" class="form-input" value="${item?.endOfLifeDate||''}" style="color-scheme:dark">
            </div>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-note-pencil"></i> Notes</h4>
          <div class="form-group">
            <textarea id="asNotes" class="form-input" rows="4" placeholder="Internal remarks, maintenance notes, references to other documents…">${escHtml(item?.notes||'')}</textarea>
          </div>
          ${renderLinksBlock('as', item?.linkedControls||[], item?.linkedPolicies||[])}
        </div>

      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchAssetsTab('list')">Cancel</button>
        <button class="btn btn-primary" onclick="saveAsset('${id||''}')">
          <i class="ph ph-floppy-disk"></i> Save
        </button>
      </div>
    </div>
  `
  initLinkPickers('as')
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
  el.innerHTML = '<p style="color:var(--text-subtle);padding:24px">Loading…</p>'
  try {
    if (tab === 'reviews')  await renderGovReviews(el)
    if (tab === 'actions')  await renderGovActions(el)
    if (tab === 'meetings') await renderGovMeetings(el)
  } catch(e) {
    el.innerHTML = `<p style="color:var(--danger-text);padding:24px"><i class="ph ph-warning"></i> Error: ${escHtml(e.message)}</p>`
  }
}

const GOV_REVIEW_TYPE_LABELS = { annual: 'Annual', interim: 'Interim Review', extraordinary: 'Extraordinary' }
const GOV_REVIEW_STATUS_LABELS = { planned: 'Planned', completed: 'Completed', approved: 'Approved' }
const GOV_REVIEW_STATUS_COLORS = { planned: '#888', completed: '#60a5fa', approved: '#4ade80' }
const GOV_PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }
const GOV_PRIORITY_COLORS = { low: '#4ade80', medium: '#f0b429', high: '#fb923c', critical: '#f87171' }
const GOV_ACTION_STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }
const GOV_ACTION_STATUS_COLORS = { open: '#888', in_progress: '#60a5fa', completed: '#4ade80', cancelled: '#555' }
const GOV_SOURCE_LABELS = { management_review: 'Management Review', internal_audit: 'Internal Audit', external_audit: 'External Audit', incident: 'Incident', other: 'Other' }
const GOV_COMMITTEE_LABELS = { isms_committee: 'ISMS Committee', ciso_meeting: 'CISO Meeting', risk_committee: 'Risk Committee', management: 'Management', other: 'Other' }

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
        <option value="">All sources</option>
        ${Object.entries(GOV_SOURCE_LABELS).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
      <input id="govActSearch" type="text" placeholder="Search…" oninput="filterGovActions()" style="flex:1;min-width:120px">
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
  el.innerHTML = '<p style="color:var(--text-subtle);padding:24px">Loading…</p>'

  let review = {}
  if (id) {
    const res = await fetch(`/governance/reviews/${id}`, { headers: apiHeaders() })
    if (res.ok) review = await res.json()
  }

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <h3>${id ? 'Edit Management Review' : 'Create New Management Review'}</h3>
      </div>
      <div class="training-form-body">
        <div class="gov-section-title">Basic Data</div>
        <label class="form-label">Title *</label>
        <input id="grTitle" class="input" value="${escHtml(review.title||'')}" placeholder="e.g. Management Review 2025">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:8px">
          <div>
            <label class="form-label">Type</label>
            <select id="grType" class="select">
              <option value="annual" ${review.type==='annual'?'selected':''}>Annual</option>
              <option value="interim" ${review.type==='interim'?'selected':''}>Interim Review</option>
              <option value="extraordinary" ${review.type==='extraordinary'?'selected':''}>Extraordinary</option>
            </select>
          </div>
          <div>
            <label class="form-label">Date</label>
            <input id="grDate" type="date" class="input" value="${review.date||''}">
          </div>
          <div>
            <label class="form-label">Next Review</label>
            <input id="grNextDate" type="date" class="input" value="${review.nextReviewDate||''}">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
          <div>
            <label class="form-label">Status</label>
            <select id="grStatus" class="select">
              <option value="planned" ${review.status==='planned'?'selected':''}>Planned</option>
              <option value="completed" ${review.status==='completed'?'selected':''}>Completed</option>
              <option value="approved" ${review.status==='approved'?'selected':''}>Approved</option>
            </select>
          </div>
          <div>
            <label class="form-label">Chair</label>
            <input id="grChair" class="input" value="${escHtml(review.chair||'')}" placeholder="e.g. Dr. Smith (CEO)">
          </div>
        </div>
        <label class="form-label" style="margin-top:8px">Participants (comma-separated)</label>
        <textarea id="grParticipants" class="input" rows="2">${escHtml(review.participants||'')}</textarea>

        <div class="gov-section-title">Inputs (ISO 27001 Cl. 9.3.2)</div>
        <div class="gov-inputs-grid">
          <div><label>Audit results</label><textarea id="grInputAudit" class="input" rows="3">${escHtml(review.inputAuditResults||'')}</textarea></div>
          <div><label>Stakeholder feedback</label><textarea id="grInputStakeholder" class="input" rows="3">${escHtml(review.inputStakeholderFeedback||'')}</textarea></div>
          <div><label>Performance / KPI status</label><textarea id="grInputPerf" class="input" rows="3">${escHtml(review.inputPerformance||'')}</textarea></div>
          <div><label>Nonconformities</label><textarea id="grInputNc" class="input" rows="3">${escHtml(review.inputNonconformities||'')}</textarea></div>
          <div><label>Status of previous actions</label><textarea id="grInputPrev" class="input" rows="3">${escHtml(review.inputPreviousActions||'')}</textarea></div>
          <div><label>Risks and opportunities</label><textarea id="grInputRisks" class="input" rows="3">${escHtml(review.inputRisksOpportunities||'')}</textarea></div>
          <div><label>External changes</label><textarea id="grInputExt" class="input" rows="3">${escHtml(review.inputExternalChanges||'')}</textarea></div>
        </div>

        <div class="gov-section-title">Outputs / Decisions (ISO 27001 Cl. 9.3.3)</div>
        <label class="form-label">Decisions</label>
        <textarea id="grDecisions" class="input" rows="4">${escHtml(review.decisions||'')}</textarea>
        <label class="form-label" style="margin-top:8px">Improvement actions</label>
        <textarea id="grImprovements" class="input" rows="3">${escHtml(review.improvements||'')}</textarea>
        <label class="form-label" style="margin-top:8px">Resource needs</label>
        <textarea id="grResourceNeeds" class="input" rows="2">${escHtml(review.resourceNeeds||'')}</textarea>

        <div class="gov-section-title">Notes</div>
        <textarea id="grNotes" class="input" rows="3">${escHtml(review.notes||'')}</textarea>

        ${renderLinksBlock('gr', review.linkedControls||[], review.linkedPolicies||[])}

        ${id ? `<div class="gov-section-title" style="margin-top:16px">Documents &amp; Attachments</div>
        <div id="govReviewAttachPanel"></div>` : ''}

        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn btn-primary" onclick="saveGovReview(${id?`'${id}'`:'null'})"><i class="ph ph-floppy-disk"></i> Save</button>
          <button class="btn btn-secondary" onclick="switchGovTab('reviews')">Cancel</button>
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
  el.innerHTML = '<p style="color:var(--text-subtle);padding:24px">Loading…</p>'

  let action = {}
  if (id) {
    const res = await fetch(`/governance/actions/${id}`, { headers: apiHeaders() })
    if (res.ok) action = await res.json()
  }

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <h3>${id ? 'Edit Action' : 'Create New Action'}</h3>
      </div>
      <div class="training-form-body">
        <div class="gov-section-title">Basic Data</div>
        <label class="form-label">Title *</label>
        <input id="gaTitle" class="input" value="${escHtml(action.title||'')}" placeholder="e.g. Penetration test production network">
        <label class="form-label" style="margin-top:8px">Description</label>
        <textarea id="gaDesc" class="input" rows="3">${escHtml(action.description||'')}</textarea>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:8px">
          <div>
            <label class="form-label">Source</label>
            <select id="gaSource" class="select">
              ${Object.entries(GOV_SOURCE_LABELS).map(([v,l])=>`<option value="${v}" ${action.source===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Priority</label>
            <select id="gaPrio" class="select">
              ${Object.entries(GOV_PRIORITY_LABELS).map(([v,l])=>`<option value="${v}" ${action.priority===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Status</label>
            <select id="gaStatus" class="select">
              ${Object.entries(GOV_ACTION_STATUS_LABELS).map(([v,l])=>`<option value="${v}" ${action.status===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <label class="form-label" style="margin-top:8px">Source reference (audit finding, incident ID etc.)</label>
        <input id="gaSourceRef" class="input" value="${escHtml(action.sourceRef||'')}" placeholder="e.g. Finding A-2024-007">

        <div class="gov-section-title">Responsibility</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="form-label">Owner</label>
            <input id="gaOwner" class="input" value="${escHtml(action.owner||'')}" placeholder="Name">
          </div>
          <div>
            <label class="form-label">E-Mail</label>
            <input id="gaOwnerEmail" type="email" class="input" value="${escHtml(action.ownerEmail||'')}" placeholder="name@example.com">
          </div>
          <div>
            <label class="form-label">Due date</label>
            <input id="gaDue" type="date" class="input" value="${action.dueDate||''}">
          </div>
          <div>
            <label class="form-label">Completed on</label>
            <input id="gaCompleted" type="date" class="input" value="${action.completedDate||''}">
          </div>
        </div>
        <label class="form-label" style="margin-top:8px">Progress (0–100 %)</label>
        <input id="gaProgress" type="number" min="0" max="100" class="input" value="${action.progress||0}" style="width:120px">

        <div class="gov-section-title">Notes</div>
        <textarea id="gaNotes" class="input" rows="3">${escHtml(action.notes||'')}</textarea>

        ${renderLinksBlock('ga', action.linkedControls||[], action.linkedPolicies||[])}

        ${id ? `<div class="gov-section-title" style="margin-top:16px">Documents &amp; Attachments</div>
        <div id="govActionAttachPanel"></div>` : ''}

        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn btn-primary" onclick="saveGovAction(${id?`'${id}'`:'null'})"><i class="ph ph-floppy-disk"></i> Save</button>
          <button class="btn btn-secondary" onclick="switchGovTab('actions')">Cancel</button>
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
  el.innerHTML = '<p style="color:var(--text-subtle);padding:24px">Loading…</p>'

  let meeting = {}
  if (id) {
    const res = await fetch(`/governance/meetings/${id}`, { headers: apiHeaders() })
    if (res.ok) meeting = await res.json()
  }

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <h3>${id ? 'Edit Meeting Minutes' : 'Create New Meeting Minutes'}</h3>
      </div>
      <div class="training-form-body">
        <div class="gov-section-title">Basic Data</div>
        <label class="form-label">Title *</label>
        <input id="gmTitle" class="input" value="${escHtml(meeting.title||'')}" placeholder="e.g. ISMS Committee Q1/2025">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:8px">
          <div>
            <label class="form-label">Committee</label>
            <select id="gmCommittee" class="select">
              ${Object.entries(GOV_COMMITTEE_LABELS).map(([v,l])=>`<option value="${v}" ${meeting.committee===v?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Date</label>
            <input id="gmDate" type="date" class="input" value="${meeting.date||''}">
          </div>
          <div>
            <label class="form-label">Next meeting</label>
            <input id="gmNextDate" type="date" class="input" value="${meeting.nextMeetingDate||''}">
          </div>
        </div>
        <label class="form-label" style="margin-top:8px">Location / Room</label>
        <input id="gmLocation" class="input" value="${escHtml(meeting.location||'')}" placeholder="e.g. Conference room 1">

        <div class="gov-section-title">Participants</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label class="form-label">Chair</label>
            <input id="gmChair" class="input" value="${escHtml(meeting.chair||'')}" placeholder="Name (Role)">
          </div>
          <div>
            <label class="form-label">Secretary</label>
            <input id="gmSecretary" class="input" value="${escHtml(meeting.secretary||'')}" placeholder="Name">
          </div>
        </div>
        <label class="form-label" style="margin-top:8px">Participants (comma-separated)</label>
        <textarea id="gmParticipants" class="input" rows="2">${escHtml(meeting.participants||'')}</textarea>

        <div class="gov-section-title">Minutes</div>
        <label class="form-label">Agenda (one item per line)</label>
        <textarea id="gmAgenda" class="input" rows="5">${escHtml(meeting.agenda||'')}</textarea>
        <label class="form-label" style="margin-top:8px">Decisions / Outcomes</label>
        <textarea id="gmDecisions" class="input" rows="5">${escHtml(meeting.decisions||'')}</textarea>

        <div class="gov-section-title">Approval</div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input id="gmApproved" type="checkbox" ${meeting.approved?'checked':''}>
            <span>Minutes approved</span>
          </label>
        </div>
        <label class="form-label">Approved by</label>
        <input id="gmApprovedBy" class="input" value="${escHtml(meeting.approvedBy||'')}" placeholder="Name">

        <div class="gov-section-title">Notes</div>
        <textarea id="gmNotes" class="input" rows="3">${escHtml(meeting.notes||'')}</textarea>

        ${renderLinksBlock('gm', meeting.linkedControls||[], meeting.linkedPolicies||[])}

        ${id ? `<div class="gov-section-title" style="margin-top:16px">Documents &amp; Attachments</div>
        <div id="govMeetingAttachPanel"></div>` : ''}

        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn btn-primary" onclick="saveGovMeeting(${id?`'${id}'`:'null'})"><i class="ph ph-floppy-disk"></i> Save</button>
          <button class="btn btn-secondary" onclick="switchGovTab('meetings')">Cancel</button>
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

const BCM_CRIT_LABELS = { critical:'Critical', high:'High', medium:'Medium', low:'Low' }
const BCM_STATUS_LABELS = { draft:'Draft', reviewed:'Reviewed', approved:'Approved', tested:'Tested', review:'Under Review' }
const BCM_PLAN_TYPE_LABELS = { bcp:'BCP', drp:'DRP', itp:'ITP', crisis_communication:'Crisis Communication' }
const BCM_RESULT_LABELS = { pass:'Pass', fail:'Fail', partial:'Partial', planned:'Planned', not_tested:'Not Tested' }
const BCM_EXERCISE_TYPE_LABELS = { tabletop:'Tabletop', simulation:'Simulation', full_drill:'Full Drill', walkthrough:'Walkthrough' }

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
  el.innerHTML = '<p class="report-loading">Loading…</p>'
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
          <th>Process</th><th>Responsible</th><th>Department</th>
          <th>Criticality</th><th>RTO (h)</th><th>RPO (h)</th>
          <th>Status</th><th>Actions</th>
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
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openBiaForm()"><i class="ph ph-plus"></i> New BIA</button>` : ''}
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
          <i class="ph ph-arrow-left"></i> Back to BIA Register
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-clipboard-text"></i>
          ${isEdit ? 'Edit BIA' : 'New BIA'}
        </h3>
      </div>
      <div class="training-form-body">
        <div class="training-form-section">
          <div class="form-group">
            <label class="form-label">Process / System <span class="form-required">*</span></label>
            <input id="biaTitle" class="form-input" value="${escHtml(item?.title||'')}" placeholder="Business process or system name">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Process Owner</label>
              <input id="biaOwner" class="form-input" value="${escHtml(item?.processOwner||'')}" placeholder="Name (role)">
            </div>
            <div class="form-group">
              <label class="form-label">Department</label>
              <input id="biaDept" class="form-input" value="${escHtml(item?.department||'')}" placeholder="e.g. IT, Production, HR">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Criticality</label>
              <select id="biaCrit" class="select">
                ${Object.entries(BCM_CRIT_LABELS).map(([v,l])=>`<option value="${v}"${item?.criticality===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="biaStatus" class="select">
                ${Object.entries(BCM_STATUS_LABELS).map(([v,l])=>`<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-timer"></i> Recovery Objectives</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">RTO – Recovery Time Objective (hours)</label>
              <input id="biaRto" type="number" min="0" class="form-input" value="${item?.rto??''}" placeholder="e.g. 4">
            </div>
            <div class="form-group">
              <label class="form-label">RPO – Recovery Point Objective (hours)</label>
              <input id="biaRpo" type="number" min="0" class="form-input" value="${item?.rpo??''}" placeholder="e.g. 1">
            </div>
            <div class="form-group">
              <label class="form-label">MTPD – Max. Tolerable Period of Disruption (hours)</label>
              <input id="biaMtpd" type="number" min="0" class="form-input" value="${item?.mtpd??''}" placeholder="e.g. 8">
            </div>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-link"></i> Dependencies &amp; Systems</h4>
          <div class="form-group">
            <label class="form-label">Dependencies (comma-separated)</label>
            <textarea id="biaDeps" class="form-input" rows="2" placeholder="e.g. Network, Power, SAP">${escHtml((item?.dependencies||[]).join(', '))}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Affected Systems (comma-separated)</label>
            <textarea id="biaSystems" class="form-input" rows="2" placeholder="e.g. SAP S/4HANA, Oracle DB">${escHtml((item?.affectedSystems||[]).join(', '))}</textarea>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-calendar"></i> Review</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Last Review</label>
              <input id="biaReview" type="date" class="form-input" value="${item?.lastReviewDate||''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">Entity</label>
              <select id="biaEntity" class="select">
                <option value="">— No entity —</option>
                ${entities.map(e=>`<option value="${e.id}"${item?.entityId===e.id?' selected':''}>${escHtml(e.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Notes / Remarks</label>
            <textarea id="biaNotes" class="form-input" rows="3" placeholder="Additional notes on the BIA">${escHtml(item?.notes||'')}</textarea>
          </div>
          ${renderLinksBlock('bia', item?.linkedControls||[], item?.linkedPolicies||[])}
        </div>
      </div>
      ${id ? `<div style="padding:0 24px 16px"><div class="gov-section-title">Documents &amp; Attachments</div>
        <div id="bcmBiaAttachPanel"></div></div>` : ''}
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchBcmTab('bia')">Cancel</button>
        <button class="btn btn-primary" onclick="saveBia('${id||''}')">
          <i class="ph ph-floppy-disk"></i> Save
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
          <th>Title</th><th>Type</th><th>Responsible</th>
          <th>Status</th><th>Last Test</th>
          <th>Next Test</th><th>Test Result</th><th>Actions</th>
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
              <td class="${overdue?'bcm-overdue':''}">${p.nextTest||'—'}${overdue?' <i class="ph ph-warning-circle" title="Overdue!"></i>':''}</td>
              <td>${bcmResultBadge(p.testResult)}</td>
              <td style="white-space:nowrap">
                ${canEdit ? `<button class="btn btn-secondary btn-xs" onclick="openPlanForm('${p.id}')"><i class="ph ph-pencil"></i></button>` : ''}
                ${isAdmin ? `<button class="btn btn-danger btn-xs" onclick="deletePlan('${p.id}')"><i class="ph ph-trash"></i></button>` : ''}
              </td>
            </tr>`
          }).join('') : `<tr><td colspan="8" class="dash-empty">No plans found</td></tr>`}
        </tbody>
      </table>
    `
  }

  el.innerHTML = `
    <div class="bcm-filter-bar">
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openPlanForm()"><i class="ph ph-plus"></i> New Plan</button>` : ''}
      <select id="bcmPlanType" class="select" style="max-width:180px">
        <option value="">All Types</option>
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
          <i class="ph ph-arrow-left"></i> Back to Plans
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-file-doc"></i>
          ${isEdit ? 'Edit Plan' : 'New Plan'}
        </h3>
      </div>
      <div class="training-form-body">
        <div class="training-form-section">
          <div class="form-group">
            <label class="form-label">Title <span class="form-required">*</span></label>
            <input id="planTitle" class="form-input" value="${escHtml(item?.title||'')}" placeholder="Continuity plan title">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Type</label>
              <select id="planType" class="select">
                ${Object.entries(BCM_PLAN_TYPE_LABELS).map(([v,l])=>`<option value="${v}"${item?.type===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="planStatus" class="select">
                ${Object.entries(BCM_STATUS_LABELS).map(([v,l])=>`<option value="${v}"${item?.status===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Version</label>
              <input id="planVersion" class="form-input" value="${escHtml(item?.version||'1.0')}" placeholder="e.g. 1.0">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Scope</label>
              <input id="planScope" class="form-input" value="${escHtml(item?.scope||'')}" placeholder="Affected systems / processes">
            </div>
            <div class="form-group">
              <label class="form-label">Plan Owner</label>
              <input id="planOwner" class="form-input" value="${escHtml(item?.planOwner||'')}" placeholder="Name (role)">
            </div>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-calendar-check"></i> Tests</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Last Test</label>
              <input id="planLastTested" type="date" class="form-input" value="${item?.lastTested||''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">Next Test</label>
              <input id="planNextTest" type="date" class="form-input" value="${item?.nextTest||''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">Test Result</label>
              <select id="planTestResult" class="select">
                ${Object.entries(BCM_RESULT_LABELS).map(([v,l])=>`<option value="${v}"${item?.testResult===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-link"></i> Linked BIAs</h4>
          <div class="form-group">
            <label class="form-label">BIAs (multi-select with Ctrl/Cmd)</label>
            <select id="planBias" class="select" multiple style="height:120px">
              ${biaList.map(b=>`<option value="${b.id}"${(item?.linkedBiaIds||[]).includes(b.id)?' selected':''}>${escHtml(b.title)} (${BCM_CRIT_LABELS[b.criticality]||b.criticality})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-list-checks"></i> Actions &amp; Procedures</h4>
          <div class="form-group">
            <label class="form-label">Emergency Procedures</label>
            <textarea id="planProcs" class="form-input" rows="6" placeholder="Step-by-step instructions…">${escHtml(item?.procedures||'')}</textarea>
          </div>
          ${renderLinksBlock('plan', item?.linkedControls||[], item?.linkedPolicies||[])}
        </div>
      </div>
      ${id ? `<div style="padding:0 24px 16px"><div class="gov-section-title">Documents &amp; Attachments</div>
        <div id="bcmPlanAttachPanel"></div></div>` : ''}
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchBcmTab('plans')">Cancel</button>
        <button class="btn btn-primary" onclick="savePlan('${id||''}')">
          <i class="ph ph-floppy-disk"></i> Save
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
      ${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openExerciseForm()"><i class="ph ph-plus"></i> New Exercise</button>` : ''}
    </div>
    <table class="bcm-table">
      <thead><tr>
        <th>Title</th><th>Type</th><th>Date</th><th>Conductor</th>
        <th>Result</th><th>Linked Plan</th><th>Actions</th>
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
          </tr>`).join('') : `<tr><td colspan="7" class="dash-empty">No exercises found</td></tr>`}
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
          <i class="ph ph-arrow-left"></i> Back to Exercises
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-flag-checkered"></i>
          ${isEdit ? 'Edit Exercise' : 'New Exercise'}
        </h3>
      </div>
      <div class="training-form-body">
        <div class="training-form-section">
          <div class="form-group">
            <label class="form-label">Title <span class="form-required">*</span></label>
            <input id="exTitle" class="form-input" value="${escHtml(item?.title||'')}" placeholder="Exercise title">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Exercise Type</label>
              <select id="exType" class="select">
                ${Object.entries(BCM_EXERCISE_TYPE_LABELS).map(([v,l])=>`<option value="${v}"${item?.type===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <input id="exDate" type="date" class="form-input" value="${item?.date||''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">Result</label>
              <select id="exResult" class="select">
                ${Object.entries(BCM_RESULT_LABELS).map(([v,l])=>`<option value="${v}"${item?.result===v?' selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Conductor</label>
              <input id="exConductor" class="form-input" value="${escHtml(item?.conductor||'')}" placeholder="Name (Role)">
            </div>
            <div class="form-group">
              <label class="form-label">Linked Plan</label>
              <select id="exPlan" class="select">
                <option value="">— No Plan —</option>
                ${plans.map(p=>`<option value="${p.id}"${item?.linkedPlanId===p.id?' selected':''}>${escHtml(p.title)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Participants (comma-separated)</label>
            <textarea id="exParticipants" class="form-input" rows="2" placeholder="e.g. CISO, CIO, HR Manager">${escHtml((item?.participants||[]).join(', '))}</textarea>
          </div>
        </div>
        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-note-pencil"></i> Results & Follow-up</h4>
          <div class="form-group">
            <label class="form-label">Findings</label>
            <textarea id="exFindings" class="form-input" rows="4" placeholder="What was observed?">${escHtml(item?.findings||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Actions</label>
            <textarea id="exActions" class="form-input" rows="3" placeholder="Derived actions with due dates">${escHtml(item?.actions||'')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Next Exercise</label>
            <input id="exNext" type="date" class="form-input" value="${item?.nextExercise||''}" style="color-scheme:dark">
          </div>
          ${renderLinksBlock('ex', item?.linkedControls||[], item?.linkedPolicies||[])}
        </div>
      </div>
      ${id ? `<div style="padding:0 24px 16px"><div class="gov-section-title">Documents & Attachments</div>
        <div id="bcmExerciseAttachPanel"></div></div>` : ''}
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchBcmTab('exercises')">Cancel</button>
        <button class="btn btn-primary" onclick="saveExercise('${id||''}')">
          <i class="ph ph-floppy-disk"></i> Save
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
  software:    'Software',
  hardware:    'Hardware',
  service:     'Service',
  cloud:       'Cloud',
  consulting:  'Consulting',
  other:       'Other',
}
const SUP_CRIT_LABELS = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }
const SUP_STATUS_LABELS = {
  active:       'Active',
  under_review: 'Under Review',
  inactive:     'Inactive',
  terminated:   'Terminated',
}
const SUP_AUDIT_LABELS = {
  passed:        'Passed',
  failed:        'Failed',
  pending:       'Pending',
  not_scheduled: 'Not Scheduled',
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
  el.innerHTML = '<p class="report-loading">Loading…</p>'

  const res = await fetch('/suppliers', { headers: apiHeaders() })
  const list = res.ok ? await res.json() : []

  const rank    = ROLE_RANK[getCurrentRole()] || 0
  const canEdit = rank >= ROLE_RANK.editor
  const isAdmin = rank >= ROLE_RANK.admin
  const today   = new Date().toISOString().slice(0, 10)

  let filtered = list
  if (tab === 'critical')   filtered = list.filter(s => s.criticality === 'critical' || s.criticality === 'high')
  if (tab === 'dataaccess') filtered = list.filter(s => s.dataAccess)

  let filterType = '', filterCrit = '', filterStatus = ''

  function renderTable() {
    let rows = filtered.filter(s => {
      if (filterType   && s.type        !== filterType)   return false
      if (filterCrit   && s.criticality !== filterCrit)   return false
      if (filterStatus && s.status      !== filterStatus) return false
      return true
    })
    return `
      <table class="bcm-table">
        <thead><tr>
          <th>Name</th><th>Type</th><th>Criticality</th><th>Status</th>
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
              <td>${escHtml(s.country || '—')}</td>
              <td class="${overdue ? 'bcm-overdue' : ''}">${s.nextAuditDate || '—'}${overdue ? ' <i class="ph ph-warning-circle" title="Overdue!"></i>' : ''}</td>
              <td>${escHtml(SUP_AUDIT_LABELS[s.auditResult] || s.auditResult || '—')}</td>
              <td style="white-space:nowrap">
                ${canEdit ? `<button class="btn btn-secondary btn-xs" onclick="openSupplierForm('${s.id}')"><i class="ph ph-pencil"></i></button>` : ''}
                ${isAdmin ? `<button class="btn btn-danger btn-xs" onclick="deleteSupplier('${s.id}')"><i class="ph ph-trash"></i></button>` : ''}
              </td>
            </tr>`
          }).join('') : `<tr><td colspan="8" class="dash-empty">No suppliers found</td></tr>`}
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

  document.querySelectorAll('.training-tab').forEach(b => b.classList.remove('active'))

  el.innerHTML = `
    <div class="training-form-page">
      <div class="training-form-header">
        <button class="btn btn-secondary btn-sm" onclick="switchSuppliersTab('${_suppliersTab}')">
          <i class="ph ph-arrow-left"></i> Back to List
        </button>
        <h3 class="training-form-title">
          <i class="ph ph-truck"></i>
          ${isEdit ? 'Edit Supplier' : 'New Supplier'}
        </h3>
      </div>
      <div class="training-form-body">

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-buildings"></i> Master Data</h4>
          <div class="form-group">
            <label class="form-label">Name <span class="form-required">*</span></label>
            <input id="supName" class="form-input" value="${escHtml(item?.name || '')}" placeholder="Company name">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Type</label>
              <select id="supType" class="select">
                ${Object.entries(SUP_TYPE_LABELS).map(([v, l]) => `<option value="${v}"${item?.type === v ? ' selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Criticality</label>
              <select id="supCrit" class="select">
                ${Object.entries(SUP_CRIT_LABELS).map(([v, l]) => `<option value="${v}"${item?.criticality === v ? ' selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Status</label>
              <select id="supStatus" class="select">
                ${Object.entries(SUP_STATUS_LABELS).map(([v, l]) => `<option value="${v}"${item?.status === v ? ' selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Country (ISO Code)</label>
              <input id="supCountry" class="form-input" value="${escHtml(item?.country || '')}" placeholder="e.g. DE, LU, US">
            </div>
            <div class="form-group">
              <label class="form-label">Website</label>
              <input id="supWebsite" class="form-input" value="${escHtml(item?.website || '')}" placeholder="https://…">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Contact Person</label>
              <input id="supContactName" class="form-input" value="${escHtml(item?.contactName || '')}" placeholder="Name">
            </div>
            <div class="form-group">
              <label class="form-label">Contact E-Mail</label>
              <input id="supContactEmail" class="form-input" type="email" value="${escHtml(item?.contactEmail || '')}" placeholder="email@supplier.com">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Products / Services</label>
            <textarea id="supProducts" class="form-input" rows="2" placeholder="Brief description of services provided">${escHtml(item?.products || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea id="supDescription" class="form-input" rows="2" placeholder="Further details about the supplier">${escHtml(item?.description || '')}</textarea>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-database"></i> Data Access & Privacy</h4>
          <div class="form-group" style="display:flex;align-items:center;gap:10px">
            <label class="module-toggle">
              <input type="checkbox" id="supDataAccess" ${item?.dataAccess ? 'checked' : ''}>
              <span class="module-toggle-slider"></span>
            </label>
            <span>Supplier has access to personal or confidential data</span>
          </div>
          <div class="form-group">
            <label class="form-label">Data Categories (comma-separated)</label>
            <textarea id="supDataCategories" class="form-input" rows="2" placeholder="e.g. HR data, financial data, customer data">${escHtml((item?.dataCategories || []).join(', '))}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Contract ID</label>
              <input id="supContractId" class="form-input" value="${escHtml(item?.contractId || '')}" placeholder="Reference to contract">
            </div>
            <div class="form-group">
              <label class="form-label">DPA Contract ID (GDPR Art. 28)</label>
              <input id="supAvContractId" class="form-input" value="${escHtml(item?.avContractId || '')}" placeholder="Reference to DPA">
            </div>
          </div>
        </div>

        <div class="training-form-section">
          <h4 class="training-form-section-title"><i class="ph ph-clipboard-text"></i> Audit & Risk</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Last Audit</label>
              <input id="supLastAudit" type="date" class="form-input" value="${item?.lastAuditDate || ''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">Next Audit</label>
              <input id="supNextAudit" type="date" class="form-input" value="${item?.nextAuditDate || ''}" style="color-scheme:dark">
            </div>
            <div class="form-group">
              <label class="form-label">Audit Result</label>
              <select id="supAuditResult" class="select">
                ${Object.entries(SUP_AUDIT_LABELS).map(([v, l]) => `<option value="${v}"${item?.auditResult === v ? ' selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Risk Score (0–25)</label>
            <input id="supRiskScore" type="number" min="0" max="25" class="form-input" value="${item?.riskScore ?? 0}" style="max-width:120px">
          </div>
          <div class="form-group">
            <label class="form-label">Security Requirements (comma-separated)</label>
            <textarea id="supSecReqs" class="form-input" rows="2" placeholder="e.g. ISO 27001, SOC 2, NDA, GDPR compliance">${escHtml((item?.securityRequirements || []).join(', '))}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea id="supNotes" class="form-input" rows="3" placeholder="Additional remarks about the supplier">${escHtml(item?.notes || '')}</textarea>
          </div>
          ${renderLinksBlock('sup', item?.linkedControls || [], item?.linkedPolicies || [])}
        </div>

      </div>
      <div class="training-form-footer">
        <button class="btn btn-secondary" onclick="switchSuppliersTab('${_suppliersTab}')">Cancel</button>
        <button class="btn btn-primary" onclick="saveSupplier('${id || ''}')">
          <i class="ph ph-floppy-disk"></i> Save
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

// Init app after DOM load – nur auf der SPA-Hauptseite (index.html)
window.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.app-body')) init()
})

// bfcache: Chrome hält Seiten im Arbeitsspeicher (Back/Forward Cache).
// Beim Wiederherstellen aus dem bfcache läuft DOMContentLoaded NICHT erneut.
// pageshow mit persisted:true feuert stattdessen — Section neu rendern,
// damit kein veralteter Ladestand aus dem Cache angezeigt wird.
window.addEventListener('pageshow', (e) => {
  if (e.persisted && document.querySelector('.app-body')) {
    loadSection(currentSection)
  }
})
