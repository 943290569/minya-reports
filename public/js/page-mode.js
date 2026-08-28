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

  function formatDashboardNumber(value) {
    const number = Number(value || 0);
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number);
  }

  function getLocalDateParts() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return {
      today: `${year}-${month}-${day}`,
      month: `${year}-${month}`,
      year: String(year),
    };
  }

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

    if (page === "annual" && typeof window.loadAnnualArchiveData === "function") {
      setTimeout(() => window.loadAnnualArchiveData(), 50);
    } else if (page === "monthly" && typeof window.loadMonthlyArchiveData === "function") {
      setTimeout(() => window.loadMonthlyArchiveData(false), 50);
    } else if (typeof loadArchive === "function") {
      setTimeout(() => loadArchive(false), 50);
    }
  }

  async function loadDashboardData() {
    const status = document.getElementById("dashboardDataStatus");

    try {
      if (status) status.textContent = "جاري تحميل المؤشرات...";

      const dates = getLocalDateParts();

      const params = new URLSearchParams({
        today: dates.today,
        month: dates.month,
        year: dates.year,
      });

      const response = await fetch(`/api/dashboard?${params}`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "فشل تحميل البيانات");
      }

      const todayReport = data.today || null;
      const month = data.month || {};
      const year = data.year || {};
      const recent = Array.isArray(data.recent) ? data.recent : [];

      const values = {
        todayWaste: todayReport ? Number(todayReport.total_waste_tons || 0) : 0,
        todayTrucks: todayReport ? Number(todayReport.total_trucks || 0) : 0,
        todayDiesel: todayReport ? Number(todayReport.total_diesel || 0) : 0,
        monthWaste: Number(month.waste || 0),
        monthTrucks: Number(month.trucks || 0),
        monthDays: Number(month.days || 0),
        yearWaste: Number(year.waste || 0),
        yearReports: Number(year.reports || 0),
      };

      Object.entries(values).forEach(([key, value]) => {
        const element = document.getElementById(`dash-${key}`);
        if (element) element.textContent = formatDashboardNumber(value);
      });

      const todayState = document.getElementById("dashboardTodayState");
      if (todayState) {
        todayState.textContent = todayReport
          ? `تم تسجيل تقرير اليوم ${dates.today}`
          : `لا يوجد تقرير محفوظ لليوم ${dates.today}`;

        todayState.classList.toggle("has-report", Boolean(todayReport));
      }

      const recentBody = document.getElementById("dashboardRecentReports");

      if (recentBody) {
        recentBody.innerHTML = recent.length
          ? recent.map((report) => `
              <tr>
                <td>${String(report.report_date || "-")}</td>
                <td>${String(report.report_no || "-")}</td>
                <td>${formatDashboardNumber(report.total_waste_tons)} طن</td>
                <td>${formatDashboardNumber(report.total_trucks)}</td>
                <td>${formatDashboardNumber(report.total_diesel)} لتر</td>
              </tr>
            `).join("")
          : '<tr><td colspan="5">لا توجد تقارير محفوظة حتى الآن.</td></tr>';
      }

      if (status) {
        status.textContent =
          `آخر تحديث: ${new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
          })}`;
      }

    } catch (error) {
      console.error("فشل تحميل لوحة المعلومات", error);
      if (status) status.textContent = "تعذر تحميل مؤشرات لوحة المعلومات.";
    }
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
          <p>متابعة فورية لأداء المكب والوصول إلى التقارير اليومية والتحليلات الشهرية والسنوية.</p>
          <div id="dashboardTodayState" class="dashboard-today-state">جاري التحقق من تقرير اليوم...</div>
        </div>
        <a class="dashboard-primary-action" href="/report">إنشاء تقرير جديد</a>
      </div>

      <div class="dashboard-section-head">
        <div>
          <span>نظرة سريعة</span>
          <h3>مؤشرات التشغيل الحالية</h3>
        </div>
        <small id="dashboardDataStatus">جاري تحميل المؤشرات...</small>
      </div>

      <div class="dashboard-metrics">
        <div class="dashboard-metric-card"><span>نفايات اليوم</span><strong id="dash-todayWaste">0</strong><small>طن</small></div>
        <div class="dashboard-metric-card"><span>شاحنات اليوم</span><strong id="dash-todayTrucks">0</strong><small>شاحنة</small></div>
        <div class="dashboard-metric-card"><span>سولار اليوم</span><strong id="dash-todayDiesel">0</strong><small>لتر</small></div>
        <div class="dashboard-metric-card"><span>نفايات الشهر</span><strong id="dash-monthWaste">0</strong><small>طن</small></div>
        <div class="dashboard-metric-card"><span>شاحنات الشهر</span><strong id="dash-monthTrucks">0</strong><small>شاحنة</small></div>
        <div class="dashboard-metric-card"><span>أيام الشهر المسجلة</span><strong id="dash-monthDays">0</strong><small>يوم</small></div>
        <div class="dashboard-metric-card"><span>نفايات السنة</span><strong id="dash-yearWaste">0</strong><small>طن</small></div>
        <div class="dashboard-metric-card"><span>تقارير السنة</span><strong id="dash-yearReports">0</strong><small>تقرير</small></div>
      </div>

      <div class="dashboard-grid">
        <a class="dashboard-card" href="/report"><span class="dashboard-icon">01</span><h3>التقرير اليومي</h3><p>إدخال بيانات التشغيل والموظفين والعمليات والمعدات وحفظ التقرير.</p></a>
        <a class="dashboard-card" href="/archive"><span class="dashboard-icon">02</span><h3>أرشيف التقارير</h3><p>البحث والفتح والتعديل والطباعة والوصول السريع للتقارير السابقة.</p></a>
        <a class="dashboard-card" href="/monthly"><span class="dashboard-icon">03</span><h3>التقرير الشهري</h3><p>المجاميع والمتوسطات والمقارنات والرسوم البيانية والتصدير.</p></a>
        <a class="dashboard-card" href="/annual"><span class="dashboard-icon">04</span><h3>التقرير السنوي</h3><p>تحليل سنوي متكامل، مقارنة السنوات، المؤشرات والطباعة والتصدير.</p></a>
      </div>

      <div class="dashboard-recent-panel">
        <div class="dashboard-section-head compact">
          <div><span>آخر النشاطات</span><h3>آخر 5 تقارير محفوظة</h3></div>
          <a href="/archive">عرض الأرشيف كاملًا</a>
        </div>
        <div class="dashboard-table-wrap">
          <table class="dashboard-recent-table">
            <thead><tr><th>التاريخ</th><th>رقم التقرير</th><th>النفايات</th><th>الشاحنات</th><th>السولار</th></tr></thead>
            <tbody id="dashboardRecentReports"><tr><td colspan="5">جاري تحميل التقارير...</td></tr></tbody>
          </table>
        </div>
      </div>
    `;

    main.appendChild(dashboard);
    loadDashboardData();
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
