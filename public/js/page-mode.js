/* =========================================================
   تنقل الصفحات ووضع العرض
========================================================= */

(function () {
  if (!document.querySelector('link[href="multipage.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "multipage.css";
    document.head.appendChild(link);
  }

  function getPageFromPath() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/report") return "report";
    if (path === "/archive") return "archive";
    if (path === "/monthly") return "monthly";
    if (path === "/annual") return "annual";
    return "dashboard";
  }

  const page = getPageFromPath();

  function buildNavigation() {
    const header = document.querySelector(".top-header");
    if (!header) return;

    let nav = header.querySelector("nav");
    if (!nav) {
      nav = document.createElement("nav");
      header.appendChild(nav);
    }

    const items = [
      ["dashboard", "الرئيسية", "/"],
      ["report", "تقرير جديد", "/report"],
      ["archive", "الأرشيف", "/archive"],
      ["monthly", "التقرير الشهري", "/monthly"],
      ["annual", "التقرير السنوي", "/annual"],
    ];

    nav.innerHTML = items.map(([key, label, href]) =>
      `<a class="app-nav-link${page === key ? " active" : ""}" href="${href}">${label}</a>`
    ).join("");
  }

  function hideReportEditor() {
    const save = document.querySelector("section.actions");
    if (save) save.style.display = "none";

    document.querySelectorAll("main.container > section.panel").forEach((section) => {
      if (section.id !== "archiveSection") section.style.display = "none";
    });
  }

  function showArchive() {
    const archive = document.getElementById("archiveSection");
    if (archive) archive.classList.remove("hidden");
    if (typeof loadArchive === "function") setTimeout(() => loadArchive(false), 50);
  }

  function buildDashboard() {
    const main = document.querySelector("main.container");
    if (!main) return;

    main.querySelectorAll(":scope > section").forEach((section) => {
      section.style.display = "none";
    });

    const dashboard = document.createElement("section");
    dashboard.className = "dashboard-home";
    dashboard.innerHTML = `
      <div class="dashboard-hero">
        <div>
          <span class="dashboard-kicker">MINYA LANDFILL</span>
          <h2>لوحة إدارة التقارير التشغيلية</h2>
          <p>إدارة التقارير اليومية، الأرشيف، التحليل الشهري والسنوي من واجهة واحدة منظمة.</p>
        </div>
        <a class="dashboard-primary-action" href="/report">إنشاء تقرير جديد</a>
      </div>

      <div class="dashboard-grid">
        <a class="dashboard-card" href="/report">
          <span class="dashboard-icon">01</span>
          <h3>التقرير اليومي</h3>
          <p>إدخال بيانات التشغيل والموظفين والعمليات والمعدات وحفظ التقرير.</p>
        </a>
        <a class="dashboard-card" href="/archive">
          <span class="dashboard-icon">02</span>
          <h3>أرشيف التقارير</h3>
          <p>البحث والفتح والتعديل والطباعة والوصول السريع للتقارير السابقة.</p>
        </a>
        <a class="dashboard-card" href="/monthly">
          <span class="dashboard-icon">03</span>
          <h3>التقرير الشهري</h3>
          <p>المجاميع والمتوسطات والمقارنات والرسوم البيانية والتصدير.</p>
        </a>
        <a class="dashboard-card" href="/annual">
          <span class="dashboard-icon">04</span>
          <h3>التقرير السنوي</h3>
          <p>تحليل سنوي متكامل، مقارنة السنوات، المؤشرات والطباعة والتصدير.</p>
        </a>
      </div>
    `;

    main.appendChild(dashboard);
  }

  function applyPageMode() {
    const archive = document.getElementById("archiveSection");
    const monthly = document.getElementById("monthlyReportSection");
    const archiveTable = document.getElementById("archiveTable");
    const filters = document.querySelector(".archive-filters");
    const archiveSummary = document.querySelector(".archive-summary");

    document.body.dataset.page = page;

    if (page === "dashboard") {
      buildDashboard();
      return;
    }

    if (page === "report") {
      if (archive) archive.style.display = "none";
      return;
    }

    if (["archive", "monthly", "annual"].includes(page)) {
      hideReportEditor();
      showArchive();
    }

    if (page === "archive") {
      if (monthly) monthly.style.display = "none";
      document.documentElement.classList.add("archive-page");
      return;
    }

    if (page === "monthly") {
      if (archiveTable) archiveTable.style.display = "none";
      document.documentElement.classList.add("monthly-page");
      return;
    }

    if (page === "annual") {
      if (monthly) monthly.style.display = "none";
      if (archiveTable) archiveTable.style.display = "none";
      if (filters) filters.style.display = "none";
      if (archiveSummary) archiveSummary.style.display = "none";
      document.documentElement.classList.add("annual-page");

      const revealAnnual = () => {
        const annual = document.getElementById("annualSummarySection");
        if (annual) {
          annual.style.display = "block";
          return true;
        }
        return false;
      };

      if (!revealAnnual()) {
        const timer = setInterval(() => {
          if (revealAnnual()) clearInterval(timer);
        }, 100);
        setTimeout(() => clearInterval(timer), 5000);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildNavigation();
    applyPageMode();
  });
})();
