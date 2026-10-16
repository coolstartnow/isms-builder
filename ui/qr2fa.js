// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
// 2FA-Setup UI-Helper
// QR-Code kommt als dataUri vom Server (/2fa/setup)
// Diese Datei enthält nur clientseitige Hilfsfunktionen

function show2faSetupModal(username, onSuccess) {
  // Bestehendes Modal entfernen falls vorhanden
  const existing = document.getElementById('twofa-modal')
  if (existing) existing.remove()

  const modal = document.createElement('div')
  modal.id = 'twofa-modal'
  modal.className = 'twofa-overlay'
  modal.innerHTML = `
    <div class="twofa-dialog">
      <h3>${t('twofa_setupTitle', { user: username })}</h3>
      <div id="twofa-loading" class="twofa-loading">${t('twofa_loadQr')}</div>
      <div id="twofa-content" style="display:none">
        <p class="twofa-hint">${t('twofa_scanHint')}</p>
        <img id="twofa-qr" src="" alt="${t('twofa_qrCodeAlt')}" class="twofa-qr" />
        <p class="twofa-hint">${t('twofa_manualHint')}</p>
        <code id="twofa-secret" class="twofa-secret"></code>
        <hr class="twofa-hr"/>
        <p class="twofa-hint">${t('twofa_codeHint')}</p>
        <div class="twofa-input-row">
          <input id="twofa-token" class="twofa-token-input" type="text" maxlength="6" inputmode="numeric" placeholder="000000" />
          <button id="twofa-verify-btn" class="btn primary">${t('twofa_activate')}</button>
        </div>
        <p id="twofa-msg" class="twofa-msg"></p>
      </div>
      <div class="twofa-footer">
        <button id="twofa-close" class="btn">${t('incpub_close')}</button>
      </div>
    </div>
  `
  document.body.appendChild(modal)

  modal.querySelector('#twofa-close').onclick = () => modal.remove()

  // QR-Code laden
  fetch(`/2fa/setup?username=${encodeURIComponent(username)}`, {
    headers: { 'Content-Type': 'application/json' }
  })
    .then(r => r.json())
    .then(data => {
      modal.querySelector('#twofa-loading').style.display = 'none'
      modal.querySelector('#twofa-content').style.display = 'block'
      modal.querySelector('#twofa-qr').src = data.qrDataUri
      modal.querySelector('#twofa-secret').textContent = data.secret
    })
    .catch(() => {
      modal.querySelector('#twofa-loading').textContent = t('twofa_qrLoadFailed')
    })

  // Code verifizieren
  modal.querySelector('#twofa-verify-btn').onclick = async () => {
    const token = modal.querySelector('#twofa-token').value.trim()
    const msg = modal.querySelector('#twofa-msg')
    if (token.length !== 6) { msg.textContent = t('twofa_enter6'); return }
    const res = await fetch('/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    const data = await res.json()
    if (res.ok) {
      msg.textContent = '✓ ' + t('twofa_enabled')
      msg.style.color = '#4ade80'
      if (onSuccess) onSuccess()
    } else {
      msg.textContent = data.error || t('twofa_invalidCode')
      msg.style.color = '#f87171'
    }
  }
}

async function disable2fa(username, onSuccess) {
  if (!confirm(t('twofa_disableUserConfirm', { user: username }))) return
  const res = await fetch(`/2fa?username=${encodeURIComponent(username)}`, { method: 'DELETE' })
  const data = await res.json()
  if (res.ok) {
    alert(t('twofa_disabled'))
    if (onSuccess) onSuccess()
  } else {
    alert(data.error || t('error'))
  }
}
