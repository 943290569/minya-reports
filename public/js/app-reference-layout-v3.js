/* Reference layout V3: desktop sidebar + reference header structure.
   Presentation only: no data or API behavior changes. */
(function () {
  if (['/login.html','/setup.html'].includes(location.pathname)) return;

  const primaryItems = [
    ['الرئيسية','/','⌂'],
    ['تقرير جديد','/report','✎'],
    ['أرشيف التقارير','/archive','▤'],
    ['التقرير الشهري','/monthly','▦'],
    ['التقرير السنوي','/annual','◔'],
    ['لوحة التشغيل','/ops-dashboard','▥'],
    ['المعدات والصيانة','/equipment','⚙'],
    ['مركبات حركة المكب','/fleet','▣'],
    ['السولار الخارجي','/external-diesel','▦']
  ];
  const adminItems = [
    ['الإدارة والصلاحيات','/admin','◇'],
    ['إدارة النظام','/system.html','⚙'],
    ['الاستيراد','/drive-import.html','⇩'],
    ['المراجعة والاعتماد','/reviews','✓']
  ];

  function normalize(path) {
    const value = String(path || '/').replace(/\/+$/,'') || '/';
    return value.endsWith('.html') ? value.slice(0,-5) : value;
  }

  function role() {
    return (window.MINYA_USER && window.MINYA_USER.role) ||
      document.documentElement.dataset.userRole || '';
  }

  function makeLink(item) {
    const [label, href, icon] = item;
    const link = document.createElement('a');
    link.className = 'ref-side-link';
    link.href = href;
    link.innerHTML = '<span class="ref-side-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span>';
    if (normalize(location.pathname) === normalize(href)) {
      link.classList.add('active');
      link.setAttribute('aria-current','page');
    }
    return link;
  }

  function buildSidebar() {
    if (document.getElementById('referenceSidebarV3')) return;
    const aside = document.createElement('aside');
    aside.id = 'referenceSidebarV3';
    aside.className = 'reference-sidebar-v3';
    aside.setAttribute('aria-label','التنقل الرئيسي');

    const title = document.createElement('div');
    title.className = 'ref-side-section-title';
    title.textContent = 'القائمة الرئيسية';
    aside.appendChild(title);

    const nav = document.createElement('nav');
    nav.className = 'ref-side-nav';
    primaryItems.forEach(item => nav.appendChild(makeLink(item)));
    aside.appendChild(nav);

    const sep = document.createElement('div');
    sep.className = 'ref-side-separator';
    aside.appendChild(sep);

    const adminTitle = document.createElement('div');
    adminTitle.className = 'ref-side-section-title';
    adminTitle.textContent = 'الإدارة';
    aside.appendChild(adminTitle);

    const adminNav = document.createElement('nav');
    adminNav.className = 'ref-side-nav ref-admin-nav';
    const currentRole = role();
    adminItems.forEach(item => {
      const link = makeLink(item);
      if (currentRole && currentRole !== 'admin') link.hidden = true;
      adminNav.appendChild(link);
    });
    aside.appendChild(adminNav);

    const status = document.createElement('div');
    status.className = 'ref-system-status';
    status.innerHTML = '<strong><span aria-hidden="true">✓</span> النظام يعمل بشكل جيد</strong><small>نظام تقارير مكب المنيا</small>';
    aside.appendChild(status);

    document.body.appendChild(aside);
    document.documentElement.classList.add('reference-layout-v3');
  }

  function syncRole() {
    const currentRole = role();
    document.querySelectorAll('#referenceSidebarV3 .ref-admin-nav a').forEach(link => {
      link.hidden = Boolean(currentRole && currentRole !== 'admin');
    });
  }

  function enhanceHeader() {
    const header = document.querySelector('.top-header');
    if (!header) return;
    header.classList.add('reference-header-v3');
    const copy = header.querySelector('.header-identity-copy');
    if (copy && !copy.querySelector('.ref-header-kicker')) {
      const kicker = document.createElement('span');
      kicker.className = 'ref-header-kicker';
      kicker.textContent = 'نظام تقارير مكب المنيا';
      copy.prepend(kicker);
    }
  }

  function init() {
    buildSidebar();
    enhanceHeader();
    syncRole();
    setTimeout(syncRole,250);
    setTimeout(syncRole,800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();