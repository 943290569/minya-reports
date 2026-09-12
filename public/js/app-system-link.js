/* =========================================================
   روابط الإدارة والتشغيل في جميع الصفحات
========================================================= */

(function () {
  function isAdmin() {
    return window.MINYA_USER?.role === "admin" || document.documentElement.dataset.userRole === "admin";
  }

  function removeSystemAccess() {
    document.querySelectorAll('a[href="/system.html"]').forEach(link => link.remove());
  }

  function addLink(nav, href, label) {
    if (!nav || nav.querySelector(`a[href="${href}"]`)) return;
    const link = document.createElement("a");
    link.className = "app-nav-link";
    link.href = href;
    link.textContent = label;
    nav.appendChild(link);
  }

  function addSystemNavigation() {
    const nav = document.querySelector(".top-header nav");
    if (!nav) return;
    addLink(nav, "/ops-dashboard", "لوحة التشغيل");
    addLink(nav, "/fleet", "المركبات والسائقون");
    addLink(nav, "/maintenance-incidents", "الصيانة والحوادث");
    addLink(nav, "/environment", "العصارة والغطاء");
    addLink(nav, "/external-diesel", "السولار الخارجي");
    addLink(nav, "/global-search", "بحث شامل");
    if (!isAdmin()) { removeSystemAccess(); return; }
    addLink(nav, "/system.html", "إدارة النظام");
  }

  function addDashboardSystemCard() {
    if (!isAdmin()) { removeSystemAccess(); return; }
    const grid = document.querySelector(".dashboard-grid");
    if (!grid || grid.querySelector('a[href="/system.html"]')) return;

    const card = document.createElement("a");
    card.className = "dashboard-card";
    card.href = "/system.html";
    card.innerHTML = `
      <span class="dashboard-icon">05</span>
      <h3>إدارة النظام</h3>
      <p>فحص حالة النظام وتنزيل نسخة احتياطية كاملة من بيانات التقارير.</p>
    `;
    grid.appendChild(card);
  }

  document.addEventListener("DOMContentLoaded", () => {
    addSystemNavigation();
    setTimeout(() => {
      addSystemNavigation();
      addDashboardSystemCard();
    }, 220);
  });
})();
