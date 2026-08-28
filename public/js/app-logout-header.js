/* Stable header logout button — always mounted on authenticated app pages */
(function () {
  const publicPages = ['/login.html', '/setup.html'];
  if (publicPages.includes(location.pathname)) return;

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.replace('/login.html');
    }
  }

  function styleButton(btn) {
    Object.assign(btn.style, {
      position: 'static',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '64px',
      minHeight: '36px',
      padding: '7px 12px',
      margin: '0',
      color: 'rgba(255,255,255,.94)',
      background: 'rgba(255,255,255,.08)',
      border: '1px solid rgba(255,255,255,.20)',
      borderRadius: '9px',
      fontSize: '13px',
      fontWeight: '600',
      lineHeight: '1',
      cursor: 'pointer',
      boxShadow: 'none',
      transition: 'background .15s ease,border-color .15s ease'
    });

    btn.onmouseenter = () => {
      btn.style.background = 'rgba(255,255,255,.15)';
      btn.style.borderColor = 'rgba(255,255,255,.32)';
    };
    btn.onmouseleave = () => {
      btn.style.background = 'rgba(255,255,255,.08)';
      btn.style.borderColor = 'rgba(255,255,255,.20)';
    };
  }

  function ensureButton() {
    const header = document.querySelector('.top-header');
    if (!header) return false;

    let nav = header.querySelector('nav');
    if (!nav) {
      nav = document.createElement('nav');
      header.appendChild(nav);
    }

    let btn = document.getElementById('minyaLogoutBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'minyaLogoutBtn';
      btn.textContent = 'خروج';
      btn.setAttribute('aria-label', 'تسجيل الخروج');
    }

    btn.onclick = logout;
    styleButton(btn);
    if (btn.parentElement !== nav) nav.appendChild(btn);
    return true;
  }

  function init() {
    ensureButton();
    setTimeout(ensureButton, 50);
    setTimeout(ensureButton, 150);
    setTimeout(ensureButton, 400);
    setTimeout(ensureButton, 900);

    if (!window.__MINYA_LOGOUT_HEADER_OBSERVER__) {
      const observer = new MutationObserver(() => ensureButton());
      observer.observe(document.documentElement, { childList: true, subtree: true });
      window.__MINYA_LOGOUT_HEADER_OBSERVER__ = observer;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
