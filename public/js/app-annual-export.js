/* =========================================================
   تصدير الملخص السنوي CSV لفتحه في Excel
========================================================= */

function annualCsvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

async function exportAnnualCsv() {
  const year = document.getElementById("annualYearFilter")?.value || "";
  if (!year) {
    showMessage("اختر السنة أولًا");
    return;
  }

  const reports = [...archiveReports]
    .filter((report) => String(report.report_date || "").startsWith(`${year}-`))
    .sort((a, b) => String(a.report_date || "").localeCompare(String(b.report_date || "")));

  if (!reports.length) {
    showMessage("لا توجد تقارير محفوظة لهذه السنة");
    return;
  }

  showMessage("جاري تجهيز ملف السنة...");

  const months = Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");
    const monthValue = `${year}-${monthNumber}`;
    const monthReports = reports.filter((report) =>
      String(report.report_date || "").startsWith(monthValue)
    );

    return {
      monthValue,
      days: monthReports.length,
      waste: monthReports.reduce(
        (sum, report) => sum + Number(report.total_waste_tons || 0),
        0
      ),
      trucks: monthReports.reduce(
        (sum, report) => sum + Number(report.total_trucks || 0),
        0
      ),
      diesel: monthReports.reduce(
        (sum, report) => sum + Number(report.total_diesel || 0),
        0
      ),
    };
  });

  const daysTotal = months.reduce((sum, item) => sum + item.days, 0);
  const wasteTotal = months.reduce((sum, item) => sum + item.waste, 0);
  const trucksTotal = months.reduce((sum, item) => sum + item.trucks, 0);
  const dieselTotal = months.reduce((sum, item) => sum + item.diesel, 0);

  const rows = [
    ["الملخص السنوي لمكب المنيا", year],
    [],
    ["البيان", "القيمة"],
    ["إجمالي أيام التشغيل", daysTotal],
    ["إجمالي النفايات طن", wasteTotal],
    ["إجمالي الشاحنات", trucksTotal],
    ["إجمالي السولار لتر", dieselTotal],
    [],
    ["الشهر", "أيام التشغيل", "النفايات طن", "الشاحنات", "السولار لتر"],
    ...months.map((item) => [
      getMonthName(item.monthValue),
      item.days,
      item.waste,
      item.trucks,
      item.diesel,
    ]),
    ["المجموع", daysTotal, wasteTotal, trucksTotal, dieselTotal],
  ];

  const csv = "\uFEFF" + rows
    .map((row) => row.map(annualCsvCell).join(","))
    .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `minya-annual-${year}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showMessage("تم تصدير الملخص السنوي بنجاح");
}

function setupAnnualExportButton() {
  const section = document.getElementById("annualSummarySection");
  const select = document.getElementById("annualYearFilter");
  if (!section || !select || document.getElementById("exportAnnualCsvBtn")) return false;

  const controls = select.closest("div");
  if (!controls) return false;

  const button = document.createElement("button");
  button.id = "exportAnnualCsvBtn";
  button.type = "button";
  button.textContent = "تصدير السنوي Excel / CSV";
  button.style.minWidth = "210px";
  button.style.padding = "9px 16px";
  button.style.border = "0";
  button.style.borderRadius = "7px";
  button.style.cursor = "pointer";
  button.style.fontSize = "14px";
  button.style.fontWeight = "700";
  button.addEventListener("click", exportAnnualCsv);

  controls.appendChild(button);
  return true;
}

function ensureAnnualExportButton() {
  if (setupAnnualExportButton()) return;
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (setupAnnualExportButton() || tries >= 30) clearInterval(timer);
  }, 120);
}

ensureAnnualExportButton();

document.addEventListener("DOMContentLoaded", ensureAnnualExportButton, { once: true });

document.getElementById("archiveBtn")?.addEventListener("click", () => {
  setTimeout(ensureAnnualExportButton, 300);
});

window.exportAnnualCsv = exportAnnualCsv;
window.setupAnnualExportButton = setupAnnualExportButton;
window.ensureAnnualExportButton = ensureAnnualExportButton;
