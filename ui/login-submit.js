// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0

// Show splash screen (if enabled) then navigate to dashboard
let _splashCfg = null
async function _getSplashCfg() {
  if (_splashCfg) return _splashCfg
  try {
    const r = await fetch('/public/splash')
    _splashCfg = r.ok ? await r.json() : { enabled: false, duration: 7 }
  } catch { _splashCfg = { enabled: false, duration: 7 } }
  return _splashCfg
}

let _splashTimer = null
function splashDone() {
  if (_splashTimer) { clearTimeout(_splashTimer); _splashTimer = null }
  window.location.href = '/ui/index.html'
}

async function showSplashThenGo() {
  const cfg = await _getSplashCfg()
  if (!cfg.enabled) { window.location.href = '/ui/index.html'; return }
  const overlay = document.getElementById('splashOverlay')
  const bar     = document.getElementById('splashBar')
  if (!overlay) { window.location.href = '/ui/index.html'; return }
  const ms = Math.min(30000, Math.max(1000, (cfg.duration || 7) * 1000))
  overlay.classList.add('active')
  if (bar) {
    bar.style.transition = `transform ${ms}ms linear`
    bar.style.transform  = 'scaleX(1)'
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transform = 'scaleX(0)' }))
  }
  _splashTimer = setTimeout(splashDone, ms)
}

function showError(msg) {
  const el = document.getElementById('error-msg')
  if (!el) { alert(msg); return }
  // Neues Layout: #error-text-Span, falls vorhanden; sonst direkt textContent
  const textEl = document.getElementById('error-text')
  if (textEl) textEl.textContent = msg
  else el.textContent = msg
  el.style.display = 'flex'
}

// Handles login submission for autark login (email + password) with optional 2FA (Totp)
async function submitLogin() {
  const emailEl = document.getElementById('email')
  const pwdEl = document.getElementById('password')
  const totpEl = document.getElementById('totp-input')
  if (!emailEl || !pwdEl) return
  const payload = {
    email: emailEl.value,
    password: pwdEl.value,
    totp: totpEl ? totpEl.value : undefined
  }
  try {
    const resp = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await resp.json()
    if (resp.ok) {
      // Persist session info
      localStorage.setItem('isms_current_user', data.username)
      localStorage.setItem('isms_current_role', data.role)
      localStorage.setItem('isms_current_functions', JSON.stringify(data.functions || []))
      if (data.domain) localStorage.setItem('isms_current_domain', data.domain)
      if (data.mustChangePassword) {
        window.location.href = '/ui/change-password.html'   // vom Administrator vergebenes Passwort: erst ändern
      } else if (data.needsDemoLang && typeof openDemoLangOverlay === 'function') {
        openDemoLangOverlay()
      } else {
        showSplashThenGo()
      }
    } else {
      if (data && data.code === 'ENFORCE_2FA') {
        // 2FA systemweit erzwungen, aber für diesen Account noch nicht eingerichtet
        showError(t('lg_enforce2fa'))
        const el = document.getElementById('error-msg')
        if (el) el.style.borderLeft = '4px solid #f0b429'
      } else if (data && data.twoFactorRequired) {
        // Show inline 2FA area for test/demo (instead of prompt)
        const area = document.getElementById('totp-area')
        if (area) area.style.display = 'block'
        const totpInput = document.getElementById('totp-input')
        const btn = document.getElementById('totp-submit')
        if (totpInput && btn) {
          btn.onclick = async () => {
            const totp = totpInput.value
            if (!totp) { alert(t('lg_totpMissing')); return }
            payload.totp = totp
            const retry = await fetch('/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })
            const data2 = await retry.json()
            if (retry.ok) {
              localStorage.setItem('isms_current_user', data2.username)
              localStorage.setItem('isms_current_role', data2.role)
              localStorage.setItem('isms_current_functions', JSON.stringify(data2.functions || []))
              if (data2.domain) localStorage.setItem('isms_current_domain', data2.domain)
              if (data2.mustChangePassword) {
                window.location.href = '/ui/change-password.html'
              } else if (data2.needsDemoLang && typeof openDemoLangOverlay === 'function') {
                openDemoLangOverlay()
              } else {
                showSplashThenGo()
              }
            } else {
              showError(t('lg_failed') + ': ' + (data2.error || t('lg_unknown')))
            }
          }
        }
      } else {
        showError(t('lg_failed') + ': ' + (data.error || t('lg_unknown')))
      }
    }
  } catch (e) {
    console.error(e)
    showError(t('lg_network'))
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('loginBtn')
  if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); submitLogin() })
})
