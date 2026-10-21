// © 2026 Claude Hecker — ISMS Builder V 1.29 — AGPL-3.0
// Lightweight login state checker for UI
async function ensureLoginState() {
  try {
    const res = await fetch('/whoami', { credentials: 'include' })
    if (!res.ok) {
      window.location.href = '/ui/login.html'
      return false
    }
    const data = await res.json()
    // Vom Administrator vergebenes Passwort noch nicht geändert: nur die Wechselseite ist nutzbar (der Server sperrt alles andere)
    if (data.mustChangePassword && !/change-password\.html$/.test(window.location.pathname)) {
      window.location.href = '/ui/change-password.html'
      return false
    }
    localStorage.setItem('isms_current_user', data.username)
    localStorage.setItem('isms_current_role', data.role)
    localStorage.setItem('isms_current_functions', JSON.stringify(data.functions || []))
    if (data.domain) localStorage.setItem('isms_current_domain', data.domain)
    adjustAdminNavVisibility(data.role)
    // Funktions-Badge in Topbar aktualisieren (falls bereits geladen)
    if (typeof renderFunctionBadges === 'function') renderFunctionBadges(data.functions || [])
    return true
  } catch {
    window.location.href = '/ui/login.html'
    return false
  }
}

function adjustAdminNavVisibility(role) {
  const el = document.getElementById('adminNavLink')
  if (!el) return
  // Admins and domain admins (e.g., dept_head) can see the Admin Console
  const allowed = (role === 'admin' || role === 'dept_head')
  el.style.display = allowed ? '' : 'none'
}
