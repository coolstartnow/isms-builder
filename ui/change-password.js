// © 2026 Claude Hecker — ISMS Builder — AGPL-3.0
// Erzwungener Passwortwechsel: Ein vom Administrator vergebenes Passwort (Anfangs- oder Rücksetz-Passwort) muss beim ersten Login durch
// ein eigenes ersetzt werden. Solange das nicht geschehen ist, sperrt der Server alle Schnittstellen außer Passwort ändern und Abmelden.
(function () {
  const $ = id => document.getElementById(id)
  const tx = k => (typeof window.t === 'function' ? window.t(k) : k)
  const set = (id, key) => { const el = $(id); if (el) el.textContent = tx(key) }
  set('pwTitle', 'pwchange_title'); set('pwHint', 'pwchange_hint'); set('pwCurrentLabel', 'pwchange_current'); set('pwNewLabel', 'pwchange_new')
  set('pwRepeatLabel', 'pwchange_repeat'); set('pwSubmitText', 'pwchange_submit'); set('pwLogoutText', 'pwchange_logout')

  const msg = $('msg')
  const show = text => { msg.textContent = text; msg.style.display = text ? 'block' : 'none' }

  // Nur wer wirklich wechseln muss, bleibt auf dieser Seite
  fetch('/whoami', { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).then(d => {
    if (!d) { window.location.href = '/ui/login.html'; return }
    if (!d.mustChangePassword) window.location.href = '/ui/index.html'
  }).catch(() => {})

  $('pwLogout').addEventListener('click', async () => {
    try { await fetch('/logout', { method: 'POST', credentials: 'include' }) } catch { /* Weiterleitung genügt */ }
    window.location.href = '/ui/login.html'
  })

  $('pwForm').addEventListener('submit', async ev => {
    ev.preventDefault(); show('')
    const currentPassword = $('pwCurrent').value, newPassword = $('pwNew').value, repeat = $('pwRepeat').value
    if (newPassword.length < 6) return show(tx('pwchange_short'))
    if (newPassword !== repeat) return show(tx('pwchange_mismatch'))
    if (newPassword === currentPassword) return show(tx('pwchange_same'))
    const btn = $('pwSubmit'); btn.disabled = true
    try {
      const r = await fetch('/me/password', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) })
      if (r.ok) { window.location.href = '/ui/index.html'; return }
      const body = await r.json().catch(() => ({}))
      show(r.status === 401 ? tx('pwchange_wrong') : body.code === 'PASSWORD_UNCHANGED' ? tx('pwchange_same') : tx('pwchange_failed'))
    } catch { show(tx('pwchange_failed')) } finally { btn.disabled = false }
  })
})()
