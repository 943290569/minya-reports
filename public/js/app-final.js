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

/* =========================================================
   تصدير التقرير الشهري CSV لفتحه في Excel
========================================================= */

function csvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

async function exportMonthlyCsv() {
  const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
  if (!monthValue) {
    showMessage("اختر الشهر أولًا");
    return;
  }

  const reports = [...archiveReports]
    .filter((report) => String(report.report_date || "").startsWith(monthValue))
    .sort((a, b) => String(a.report_date || "").localeCompare(String(b.report_date || "")));

  if (!reports.length) {
    showMessage("لا توجد تقارير محفوظة لهذا الشهر");
    return;
  }

  showMessage("جاري تجهيز ملف الشهر...");

  const details = await Promise.all(
    reports.map((report) => getReport(report.id).catch(() => null))
  );

  const dieselById = new Map();
  details.forEach((data, index) => {
    const report = reports[index];
    const diesel = data
      ? (data.equipment || []).reduce((sum, item) => sum + Number(item.diesel_liters || 0), 0)
      : Number(report.total_diesel || 0);
    dieselById.set(Number(report.id), diesel);
  });

  const wasteTotal = reports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0);
  const trucksTotal = reports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0);
  const dieselTotal = reports.reduce((sum, report) => sum + Number(dieselById.get(Number(report.id)) || 0), 0);
  const days = reports.length;

  const maxReport = reports.reduce((max, report) =>
    Number(report.total_waste_tons || 0) > Number(max.total_waste_tons || 0) ? report : max
  );
  const minReport = reports.reduce((min, report) =>
    Number(report.total_waste_tons || 0) < Number(min.total_waste_tons || 0) ? report : min
  );

  const rows = [
    ["التقرير الشهري لمكب المنيا", getMonthName(monthValue)],
    [],
    ["البيان", "القيمة"],
    ["عدد أيام التشغيل المسجلة", days],
    ["إجمالي النفايات طن", wasteTotal],
    ["متوسط النفايات اليومي طن/يوم", days ? wasteTotal / days : 0],
    ["إجمالي الشاحنات", trucksTotal],
    ["متوسط الشاحنات اليومي", days ? trucksTotal / days : 0],
    ["إجمالي السولار لتر", dieselTotal],
    ["متوسط السولار اليومي لتر/يوم", days ? dieselTotal / days : 0],
    ["أعلى كمية نفايات طن", Number(maxReport.total_waste_tons || 0)],
    ["تاريخ أعلى كمية", maxReport.report_date],
    ["أقل كمية نفايات طن", Number(minReport.total_waste_tons || 0)],
    ["تاريخ أقل كمية", minReport.report_date],
    [],
    ["التاريخ", "عدد الشاحنات", "كمية النفايات طن", "السولار لتر"],
    ...reports.map((report) => [
      report.report_date,
      Number(report.total_trucks || 0),
      Number(report.total_waste_tons || 0),
      Number(dieselById.get(Number(report.id)) || 0),
    ]),
    ["المجموع", trucksTotal, wasteTotal, dieselTotal],
  ];

  const csv = "\uFEFF" + rows
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `minya-monthly-${monthValue}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showMessage("تم تصدير التقرير الشهري بنجاح");
}

function setupMonthlyExportButton() {
  const actions = document.querySelector(".monthly-actions");
  if (!actions || document.getElementById("exportMonthlyCsvBtn")) return;

  actions.style.gap = "10px";
  actions.style.flexWrap = "wrap";

  const button = document.createElement("button");
  button.id = "exportMonthlyCsvBtn";
  button.type = "button";
  button.textContent = "تصدير Excel / CSV";
  button.style.minWidth = "220px";
  button.style.padding = "11px 20px";
  button.style.border = "0";
  button.style.borderRadius = "7px";
  button.style.cursor = "pointer";
  button.style.fontSize = "15px";
  button.style.fontWeight = "700";
  button.addEventListener("click", exportMonthlyCsv);

  actions.appendChild(button);
}

setupMonthlyExportButton();

/* =========================================================
   الملخص السنوي داخل الأرشيف
========================================================= */

function getArchiveYears() {
  if (Array.isArray(window.annualAvailableYears) && window.annualAvailableYears.length) {
    return [...window.annualAvailableYears];
  }

  return [...new Set(
    archiveReports
      .map((report) => String(report.report_date || "").slice(0, 4))
      .filter((year) => /^\d{4}$/.test(year))
  )].sort((a, b) => Number(b) - Number(a));
}

function setupAnnualSummarySection() {
  const archiveTable = document.getElementById("archiveTable");
  if (!archiveTable || document.getElementById("annualSummarySection")) return;

  const section = document.createElement("div");
  section.id = "annualSummarySection";
  section.style.margin = "28px 0 22px";
  section.style.paddingTop = "20px";
  section.style.borderTop = "2px solid #d1d5db";
  section.innerHTML = `
    <h3 style="text-align:center;margin:0 0 16px;font-size:20px;">الملخص السنوي</h3>
    <div style="display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
      <label for="annualYearFilter" style="font-weight:700;">السنة</label>
      <select id="annualYearFilter" style="min-width:140px;padding:9px 12px;border:1px solid #d1d5db;border-radius:7px;"></select>
    </div>
    <div id="annualSummaryCards" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px;"></div>
    <div style="overflow-x:auto;">
      <table style="width:100%;min-width:650px;border-collapse:collapse;">
        <thead><tr><th>الشهر</th><th>أيام التشغيل</th><th>النفايات طن</th><th>الشاحنات</th><th>السولار لتر</th></tr></thead>
        <tbody id="annualSummaryBody"></tbody>
      </table>
    </div>
  `;

  archiveTable.parentNode.insertBefore(section, archiveTable);
  document.getElementById("annualYearFilter")?.addEventListener("change", renderAnnualSummary);
}

async function renderAnnualSummary() {
  setupAnnualSummarySection();

  const select = document.getElementById("annualYearFilter");
  const cards = document.getElementById("annualSummaryCards");
  const body = document.getElementById("annualSummaryBody");
  if (!select || !cards || !body) return;

  const years = getArchiveYears();
  const currentSelected = select.value;
  const defaultYear = currentSelected && years.includes(currentSelected)
    ? currentSelected
    : (years[0] || String(new Date().getFullYear()));

  select.innerHTML = years.length
    ? years.map((year) => `<option value="${year}"${year === defaultYear ? " selected" : ""}>${year}</option>`).join("")
    : `<option value="${defaultYear}">${defaultYear}</option>`;

  const year = select.value || defaultYear;
  const reports = archiveReports.filter((report) =>
    String(report.report_date || "").startsWith(`${year}-`)
  );

  if (!reports.length) {
    cards.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:18px;border:1px solid #d1d5db;border-radius:8px;color:#6b7280;">لا توجد بيانات محفوظة لهذه السنة.</div>`;
    body.innerHTML = `<tr><td colspan="5">لا توجد بيانات لهذه السنة</td></tr>`;
    return;
  }

  cards.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:12px;">جاري حساب الملخص السنوي...</div>`;

  const details = await Promise.all(
    reports.map((report) => getReport(report.id).catch(() => null))
  );

  const dieselById = new Map();
  details.forEach((data, index) => {
    const report = reports[index];
    const diesel = data
      ? (data.equipment || []).reduce((sum, item) => sum + Number(item.diesel_liters || 0), 0)
      : Number(report.total_diesel || 0);
    dieselById.set(Number(report.id), diesel);
  });

  const months = Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");
    const monthValue = `${year}-${monthNumber}`;
    const monthReports = reports.filter((report) =>
      String(report.report_date || "").startsWith(monthValue)
    );
    return {
      monthValue,
      reports: monthReports,
      days: monthReports.length,
      waste: monthReports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0),
      trucks: monthReports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0),
      diesel: monthReports.reduce((sum, report) => sum + Number(dieselById.get(Number(report.id)) || 0), 0),
    };
  });

  const daysTotal = months.reduce((sum, item) => sum + item.days, 0);
  const wasteTotal = months.reduce((sum, item) => sum + item.waste, 0);
  const trucksTotal = months.reduce((sum, item) => sum + item.trucks, 0);
  const dieselTotal = months.reduce((sum, item) => sum + item.diesel, 0);

  const cardStyle = "border:1px solid #d1d5db;border-radius:8px;padding:14px 10px;text-align:center;background:#fff;";
  cards.innerHTML = `
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">أيام التشغيل</span><strong style="font-size:20px;">${formatNumber(daysTotal)}</strong></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">إجمالي النفايات</span><strong style="font-size:20px;">${formatNumber(wasteTotal)} طن</strong></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">إجمالي الشاحنات</span><strong style="font-size:20px;">${formatNumber(trucksTotal)}</strong></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">إجمالي السولار</span><strong style="font-size:20px;">${formatNumber(dieselTotal)} لتر</strong></div>
  `;

  body.innerHTML = months.map((item) => `
    <tr>
      <td>${getMonthName(item.monthValue)}</td>
      <td>${formatNumber(item.days)}</td>
      <td>${formatNumber(item.waste)}</td>
      <td>${formatNumber(item.trucks)}</td>
      <td>${formatNumber(item.diesel)}</td>
    </tr>
  `).join("") + `
    <tr>
      <th>المجموع</th>
      <th>${formatNumber(daysTotal)}</th>
      <th>${formatNumber(wasteTotal)}</th>
      <th>${formatNumber(trucksTotal)}</th>
      <th>${formatNumber(dieselTotal)}</th>
    </tr>
  `;
}

setupAnnualSummarySection();

document.getElementById("archiveBtn")?.addEventListener("click", () => {
  setTimeout(renderAnnualSummary, 250);
});

document.getElementById("archiveMonthFilter")?.addEventListener("change", () => {
  setTimeout(renderAnnualSummary, 150);
});

document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
  setTimeout(renderAnnualSummary, 150);
});

window.openReport = openReport;
window.editReport = editReport;
window.printReport = printReport;
window.deleteReport = deleteReport;
window.printMonthlyReport = printMonthlyReport;
window.renderMonthlyMetricChart = renderMonthlyMetricChart;
window.exportMonthlyCsv = exportMonthlyCsv;
window.renderAnnualSummary = renderAnnualSummary;

renderAll();
