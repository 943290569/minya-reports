/* =========================================================
   Stable 10 — توحيد الرسم الشهري مع المجاميع المحفوظة
========================================================= */

(function () {
  function storedMetricValues(reports, metric) {
    if (metric === "trucks") {
      return reports.map((report) => Number(report.total_trucks || 0));
    }
    if (metric === "diesel") {
      return reports.map((report) => Number(report.total_diesel || 0));
    }
    return reports.map((report) => Number(report.total_waste_tons || 0));
  }

  window.renderMonthlyMetricChart = async function renderMonthlyMetricChartStable10(metric = "waste") {
    monthlyChartMetric = metric;
    updateMonthlyChartButtons();

    const target = document.getElementById("monthlyWasteChart");
    const title = document.querySelector(".monthly-chart h4");
    const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
    if (!target || !title) return;

    const settings = {
      waste: { title: "كميات النفايات اليومية خلال الشهر", unit: "طن" },
      trucks: { title: "عدد الشاحنات اليومية خلال الشهر", unit: "شاحنة" },
      diesel: { title: "استهلاك السولار اليومي خلال الشهر", unit: "لتر" },
    };
    const setting = settings[metric] || settings.waste;
    title.textContent = setting.title;

    if (!monthValue) {
      target.innerHTML = '<div class="monthly-chart-empty">اختر شهرًا لعرض الرسم البياني.</div>';
      return;
    }

    const reports = getMonthlyChartReports();
    if (!reports.length) {
      target.innerHTML = '<div class="monthly-chart-empty">لا توجد بيانات لهذا الشهر.</div>';
      return;
    }

    const values = storedMetricValues(reports, metric);
    const maxValue = Math.max(...values, 1);
    const bars = reports.map((report, index) => {
      const value = Number(values[index] || 0);
      const height = Math.max(2, Math.round((value / maxValue) * 170));
      const day = String(report.report_date || "").slice(-2);
      const displayValue = formatNumber(value);
      return `<div class="monthly-chart-item" title="${escapeHtml(String(report.report_date || ""))} - ${displayValue} ${setting.unit}">
        <div class="monthly-chart-value">${displayValue}</div>
        <div class="monthly-chart-bar" style="height:${height}px"></div>
        <div class="monthly-chart-day">${day}</div>
      </div>`;
    }).join("");

    target.innerHTML = `<div class="monthly-chart-bars">${bars}</div>`;
  };

  renderMonthlyMetricChart = window.renderMonthlyMetricChart;
})();
