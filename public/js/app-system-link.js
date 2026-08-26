/* =========================================================
   رابط إدارة النظام في جميع الصفحات
========================================================= */

(function () {
  function addSystemNavigation() {
    const nav = document.querySelector(".top-header nav");
    if (!nav || nav.querySelector('a[href="/system.html"]')) return;

    const link = document.createElement("a");
    link.className = "app-nav-link";
    link.href = "/system.html";
    link.textContent = "إدارة النظام";
    nav.appendChild(link);
  }

  function addDashboardSystemCard() {
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
    setTimeout(addDashboardSystemCard, 160);
  });
})();
