/* =========================================================
   حذف
========================================================= */

async function deleteReport(id) {
  const confirmation = confirm("هل تريد حذف هذا التقرير نهائيًا؟");
  if (!confirmation) return;

  try {
    const response = await fetch(`${API}/api/reports/${id}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      showMessage(data.message || "فشل حذف التقرير");
      return;
    }

    if (editingId === Number(id)) {
      editingId = null;
      document.getElementById("saveBtn").textContent = "حفظ التقرير";
    }

    await loadArchive(false);
    showMessage("تم حذف التقرير بنجاح");
  } catch (error) {
    console.error(error);
    showMessage("حدث خطأ أثناء حذف التقرير");
  }
}

function resetNewReport() {
  editingId = null;
  document.getElementById("reportDate").value = "";
  document.getElementById("weather").value = "مشمس";
  document.getElementById("temperature").value = 10;
  document.getElementById("startTime").value = "04:00";
  document.getElementById("endTime").value = "19:00";
  document.getElementById("notes").value = "";

  crews = getDefaultCrews();
  operations = getDefaultOperations();
  stations = getDefaultStations();
  equipment = getDefaultEquipment();

  renderAll();
  document.getElementById("saveBtn").textContent = "حفظ التقرير";
  showMessage("تقرير جديد");
}

document.getElementById("archiveDateFilter")?.addEventListener("change", () => {
  renderArchiveReports();
});

document.getElementById("archiveMonthFilter")?.addEventListener("change", () => {
  renderArchiveReports();
  updateMonthlySummary();
});

document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
  document.getElementById("archiveDateFilter").value = "";
  document.getElementById("archiveMonthFilter").value = "";
  renderArchiveReports();
  updateMonthlySummary();
});

document.getElementById("saveBtn").addEventListener("click", saveReport);
document.getElementById("archiveBtn").addEventListener("click", () => loadArchive(true));
document.getElementById("newReportBtn").addEventListener("click", resetNewReport);
document.getElementById("printMonthlyReportBtn")?.addEventListener("click", printMonthlyReport);

/* =========================================================
   تبديل مؤشر الرسم البياني الشهري
========================================================= */

let monthlyChartMetric = "waste";

function getMonthlyChartReports() {
  const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
  if (!monthValue) return [];

  return [...archiveReports]
    .filter((report) => String(report.report_date || "").startsWith(monthValue))
    .sort((a, b) => String(a.report_date || "").localeCompare(String(b.report_date || "")));
}

function updateMonthlyChartButtons() {
  document.querySelectorAll("[data-monthly-chart-metric]").forEach((button) => {
    const active = button.dataset.monthlyChartMetric === monthlyChartMetric;
    button.style.fontWeight = active ? "700" : "400";
    button.style.border = active ? "2px solid #374151" : "1px solid #d1d5db";
    button.style.background = active ? "#f3f4f6" : "#ffffff";
  });
}

async function renderMonthlyMetricChart(metric = monthlyChartMetric) {
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

  let values = [];

  if (metric === "waste") {
    values = reports.map((report) => Number(report.total_waste_tons || 0));
  } else if (metric === "trucks") {
    values = reports.map((report) => Number(report.total_trucks || 0));
  } else {
    target.innerHTML = '<div class="monthly-chart-empty">جاري تحميل بيانات السولار...</div>';
    const details = await Promise.all(
      reports.map((report) => getReport(report.id).catch(() => null))
    );
    values = reports.map((report, index) => {
      const data = details[index];
      if (!data) return Number(report.total_diesel || 0);
      return (data.equipment || []).reduce(
        (sum, item) => sum + Number(item.diesel_liters || 0),
        0
      );
    });
  }

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
}

function setupMonthlyChartMetricSwitcher() {
  const chart = document.querySelector(".monthly-chart");
  const chartTitle = chart?.querySelector("h4");
  if (!chart || !chartTitle || document.getElementById("monthlyChartMetricSwitcher")) return;

  const controls = document.createElement("div");
  controls.id = "monthlyChartMetricSwitcher";
  controls.style.display = "flex";
  controls.style.justifyContent = "center";
  controls.style.flexWrap = "wrap";
  controls.style.gap = "8px";
  controls.style.margin = "0 0 14px";
  controls.innerHTML = `
    <button type="button" data-monthly-chart-metric="waste" style="padding:7px 16px;border-radius:6px;cursor:pointer;">النفايات</button>
    <button type="button" data-monthly-chart-metric="trucks" style="padding:7px 16px;border-radius:6px;cursor:pointer;">الشاحنات</button>
    <button type="button" data-monthly-chart-metric="diesel" style="padding:7px 16px;border-radius:6px;cursor:pointer;">السولار</button>
  `;

  chartTitle.insertAdjacentElement("afterend", controls);

  controls.querySelectorAll("[data-monthly-chart-metric]").forEach((button) => {
    button.addEventListener("click", () => {
      renderMonthlyMetricChart(button.dataset.monthlyChartMetric);
    });
  });

  updateMonthlyChartButtons();
}

setupMonthlyChartMetricSwitcher();

document.getElementById("archiveMonthFilter")?.addEventListener("change", () => {
  monthlyChartMetric = "waste";
  setTimeout(() => renderMonthlyMetricChart("waste"), 100);
});

document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
  monthlyChartMetric = "waste";
  setTimeout(() => renderMonthlyMetricChart("waste"), 100);
});

window.openReport = openReport;
window.editReport = editReport;
window.printReport = printReport;
window.deleteReport = deleteReport;
window.printMonthlyReport = printMonthlyReport;
window.renderMonthlyMetricChart = renderMonthlyMetricChart;

renderAll();
