/* Stable header logout button — always visible inside top header */
(function () {
  const publicPages = ['/login.html', '/setup.html'];
  if (publicPages.includes(location.pathname)) return;

  async function logout(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const btn = document.getElementById('minyaLogoutBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'جاري الخروج...';
    }

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
    } catch (_) {
      // Redirect anyway; auth guard will handle any stale session state on reload.
    } finally {
      window.location.href = '/login.html';
    }
  }

  function styleButton(btn) {
    Object.assign(btn.style, {
      position: 'absolute',
      left: '16px',
      top: '16px',
      zIndex: '80',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '64px',
      minHeight: '34px',
      padding: '7px 12px',
      margin: '0',
      color: 'rgba(255,255,255,.96)',
      background: 'rgba(255,255,255,.10)',
      border: '1px solid rgba(255,255,255,.24)',
      borderRadius: '9px',
      fontSize: '13px',
      fontWeight: '700',
      lineHeight: '1',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,.08)',
      transition: 'background .15s ease,border-color .15s ease',
      pointerEvents: 'auto'
    });

    btn.onmouseenter = () => {
      btn.style.background = 'rgba(255,255,255,.17)';
      btn.style.borderColor = 'rgba(255,255,255,.34)';
    };
    btn.onmouseleave = () => {
      btn.style.background = 'rgba(255,255,255,.10)';
      btn.style.borderColor = 'rgba(255,255,255,.24)';
    };
  }

  function ensureButton() {
    const header = document.querySelector('.top-header');
    if (!header) return false;

    if (getComputedStyle(header).position === 'static') {
      header.style.position = 'relative';
    }

    let btn = document.getElementById('minyaLogoutBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'minyaLogoutBtn';
      btn.textContent = 'خروج';
      btn.setAttribute('aria-label', 'تسجيل الخروج');
      btn.addEventListener('click', logout, true);
    }

    styleButton(btn);
    if (btn.parentElement !== header) header.appendChild(btn);
    return true;
  }

  function init() {
    ensureButton();
    setTimeout(ensureButton, 50);
    setTimeout(ensureButton, 150);
    setTimeout(ensureButton, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();