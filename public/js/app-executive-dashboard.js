/* =========================================================
   Executive Dashboard — مؤشرات إدارية للرئيسية
========================================================= */

(function () {
  function isDashboardPage() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    return path === "/";
  }

  function fmt(value) {
    return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 1 });
  }

  function monthLabel(monthValue) {
    if (!monthValue) return "-";
    const [year, month] = monthValue.split("-");
    const names = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    return `${names[Number(month) - 1] || month} ${year}`;
  }

  function previousMonth(monthValue) {
    const [year, month] = String(monthValue || "").split("-").map(Number);
    if (!year || !month) return "";
    const d = new Date(year, month - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function changeText(current, previous) {
    const c = Number(current || 0);
    const p = Number(previous || 0);
    if (!p) return { text: "لا توجد بيانات سابقة", tone: "neutral" };
    const percent = ((c - p) / p) * 100;
    if (Math.abs(percent) < 0.05) return { text: "بدون تغير", tone: "neutral" };
    return {
      text: `${percent > 0 ? "↑" : "↓"} ${fmt(Math.abs(percent))}%`,
      tone: percent > 0 ? "up" : "down",
    };
  }

  function ensureShell() {
    const dashboard = document.querySelector(".dashboard-home");
    if (!dashboard || document.getElementById("executiveDashboardSection")) return null;

    const grid = dashboard.querySelector(".dashboard-grid");
    const section = document.createElement("section");
    section.id = "executiveDashboardSection";
    section.className = "executive-dashboard";
    section.innerHTML = `
      <div class="executive-head">
        <div>
          <span>EXECUTIVE OVERVIEW</span>
          <h3>المؤشرات التنفيذية</h3>
          <p>مقارنة الأداء الحالي واتجاه السنة من التقارير المحفوظة.</p>
        </div>
        <a href="/monthly">فتح التحليل الشهري</a>
      </div>

      <div class="executive-comparison-grid">
        <div class="executive-card">
          <span>نفايات الشهر</span>
          <strong id="execMonthWaste">0</strong>
          <small id="execMonthWasteChange">-</small>
        </div>
        <div class="executive-card">
          <span>شاحنات الشهر</span>
          <strong id="execMonthTrucks">0</strong>
          <small id="execMonthTrucksChange">-</small>
        </div>
        <div class="executive-card">
          <span>سولار الشهر</span>
          <strong id="execMonthDiesel">0</strong>
          <small id="execMonthDieselChange">-</small>
        </div>
        <div class="executive-card">
          <span>أيام التشغيل</span>
          <strong id="execMonthDays">0</strong>
          <small id="execMonthDaysChange">-</small>
        </div>
      </div>

      <div class="executive-year-grid">
        <div class="executive-highlight"><span>أعلى شهر نفايات</span><strong id="execBestMonth">-</strong><small id="execBestMonthValue">-</small></div>
        <div class="executive-highlight"><span>أقل شهر نفايات</span><strong id="execLowMonth">-</strong><small id="execLowMonthValue">-</small></div>
        <div class="executive-highlight"><span>متوسط النفايات الشهري</span><strong id="execYearAverage">0</strong><small>طن / شهر مسجل</small></div>
      </div>

      <div class="executive-trend-panel">
        <div class="executive-trend-head">
          <strong>اتجاه النفايات خلال السنة</strong>
          <small id="execTrendYear">-</small>
        </div>
        <div id="execYearTrend" class="executive-trend-bars"></div>
      </div>
    `;

    if (grid) dashboard.insertBefore(section, grid);
    else dashboard.appendChild(section);
    return section;
  }

  async function loadExecutiveDashboard() {
    if (!isDashboardPage()) return;
    const shell = ensureShell();
    if (!shell) return;

    try {
      const response = await fetch("/api/reports");
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "فشل تحميل البيانات");

      const reports = Array.isArray(data.reports) ? data.reports : [];
      const now = new Date();
      const year = String(now.getFullYear());
      const month = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const prevMonth = previousMonth(month);

      const byMonth = (value) => reports.filter((r) => String(r.report_date || "").startsWith(value));
      const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0);

      const currentReports = byMonth(month);
      const prevReports = byMonth(prevMonth);

      const current = {
        waste: sum(currentReports, "total_waste_tons"),
        trucks: sum(currentReports, "total_trucks"),
        diesel: sum(currentReports, "total_diesel"),
        days: currentReports.length,
      };
      const previous = {
        waste: sum(prevReports, "total_waste_tons"),
        trucks: sum(prevReports, "total_trucks"),
        diesel: sum(prevReports, "total_diesel"),
        days: prevReports.length,
      };

      const values = {
        execMonthWaste: `${fmt(current.waste)} طن`,
        execMonthTrucks: fmt(current.trucks),
        execMonthDiesel: `${fmt(current.diesel)} لتر`,
        execMonthDays: fmt(current.days),
      };
      Object.entries(values).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      });

      [
        ["execMonthWasteChange", current.waste, previous.waste],
        ["execMonthTrucksChange", current.trucks, previous.trucks],
        ["execMonthDieselChange", current.diesel, previous.diesel],
        ["execMonthDaysChange", current.days, previous.days],
      ].forEach(([id, c, p]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const result = changeText(c, p);
        el.textContent = `${result.text} مقارنة بـ ${monthLabel(prevMonth)}`;
        el.dataset.tone = result.tone;
      });

      const months = Array.from({ length: 12 }, (_, index) => {
        const monthValue = `${year}-${String(index + 1).padStart(2, "0")}`;
        const items = byMonth(monthValue);
        return {
          monthValue,
          waste: sum(items, "total_waste_tons"),
          days: items.length,
        };
      });

      const activeMonths = months.filter((item) => item.days > 0);
      if (activeMonths.length) {
        const best = activeMonths.reduce((a, b) => b.waste > a.waste ? b : a);
        const low = activeMonths.reduce((a, b) => b.waste < a.waste ? b : a);
        const average = activeMonths.reduce((s, item) => s + item.waste, 0) / activeMonths.length;

        document.getElementById("execBestMonth").textContent = monthLabel(best.monthValue);
        document.getElementById("execBestMonthValue").textContent = `${fmt(best.waste)} طن`;
        document.getElementById("execLowMonth").textContent = monthLabel(low.monthValue);
        document.getElementById("execLowMonthValue").textContent = `${fmt(low.waste)} طن`;
        document.getElementById("execYearAverage").textContent = fmt(average);
      }

      const trend = document.getElementById("execYearTrend");
      const trendYear = document.getElementById("execTrendYear");
      if (trendYear) trendYear.textContent = year;
      if (trend) {
        const max = Math.max(...months.map((item) => item.waste), 1);
        trend.innerHTML = months.map((item, index) => {
          const height = item.waste ? Math.max(8, Math.round((item.waste / max) * 100)) : 3;
          return `<div class="executive-trend-item" title="${monthLabel(item.monthValue)} — ${fmt(item.waste)} طن">
            <div class="executive-trend-column"><span style="height:${height}%"></span></div>
            <small>${index + 1}</small>
          </div>`;
        }).join("");
      }
    } catch (error) {
      console.error("فشل تحميل المؤشرات التنفيذية", error);
      shell.classList.add("executive-error");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(loadExecutiveDashboard, 120);
  });
})();
