/* =========================================================
   طباعة التقرير السنوي
========================================================= */

async function buildAnnualPrintData() {
  const year = document.getElementById("annualYearFilter")?.value || "";
  if (!year) return null;

  const reports = [...archiveReports]
    .filter((report) => String(report.report_date || "").startsWith(`${year}-`))
    .sort((a, b) => String(a.report_date || "").localeCompare(String(b.report_date || "")));

  if (!reports.length) return null;

  const details = await Promise.all(
    reports.map((report) => getReport(report.id).catch(() => null))
  );

  const dieselById = new Map();
  details.forEach((data, index) => {
    const report = reports[index];
    const diesel = data
      ? (data.equipment || []).reduce(
          (sum, item) => sum + Number(item.diesel_liters || 0),
          0
        )
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
        (sum, report) => sum + Number(dieselById.get(Number(report.id)) || 0),
        0
      ),
    };
  });

  return {
    year,
    months,
    daysTotal: months.reduce((sum, item) => sum + item.days, 0),
    wasteTotal: months.reduce((sum, item) => sum + item.waste, 0),
    trucksTotal: months.reduce((sum, item) => sum + item.trucks, 0),
    dieselTotal: months.reduce((sum, item) => sum + item.diesel, 0),
  };
}

async function buildAnnualReportHtml() {
  const annual = await buildAnnualPrintData();
  if (!annual) return null;

  const rows = annual.months.map((item) => `
    <tr>
      <td>${getMonthName(item.monthValue)}</td>
      <td>${formatNumber(item.days)}</td>
      <td>${formatNumber(item.waste)}</td>
      <td>${formatNumber(item.trucks)}</td>
      <td>${formatNumber(item.diesel)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>التقرير السنوي ${annual.year}</title>
<style>
@page { size: A4 portrait; margin: 0mm; }
* { box-sizing: border-box; }
html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
body { font-family: Arial, Tahoma, sans-serif; direction: rtl; color: #111; background: white; }
.report { width: 202mm; height: 289mm; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; }
.official-header { width: 210mm; height: 30mm; margin-right: -4mm; margin-left: -4mm; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.official-header img { width: 210mm; height: 30mm; display: block; object-fit: fill; }
.report-content { width: 202mm; min-width: 202mm; max-width: 202mm; flex: 1; min-height: 0; overflow: hidden; }
.title { text-align: center; border-top: 1px solid #444; border-bottom: 1px solid #444; padding: 2mm; margin-bottom: 2mm; }
.title h1 { margin: 0; font-size: 18px; }
.title p { margin: 1mm 0 0; font-size: 14px; font-weight: bold; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5mm; margin-bottom: 2.5mm; }
.summary-box { border: 1px solid #444; text-align: center; padding: 2mm 1mm; }
.summary-box span { display: block; font-size: 10px; color: #555; margin-bottom: 0.8mm; }
.summary-box strong { display: block; font-size: 13px; }
.section-title { background: #eeeeee; border: 1px solid #444; text-align: center; font-weight: bold; font-size: 13px; padding: 1mm; margin: 1mm 0 0.8mm; }
table { width: 202mm; min-width: 202mm; max-width: 202mm; margin: 0; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #555; padding: 1.7mm 1mm; text-align: center; font-size: 11px; line-height: 1.15; }
th { background: #f5f5f5; font-size: 11.5px; }
.official-footer { width: 210mm; height: 22mm; margin-right: -10mm; margin-left: -4mm; margin-top: auto; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; flex-shrink: 0; }
.official-footer img { width: 210mm; height: 22mm; display: block; object-fit: fill; }
@media print {
  html, body { width: 210mm; height: 297mm; overflow: hidden; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 202mm !important; min-width: 202mm !important; max-width: 202mm !important; }
}
</style>
</head>
<body>
<div class="report">
  <div class="official-header"><img src="/assets/header.png" alt="الترويسة الرسمية"></div>
  <div class="report-content">
    <div class="title"><h1>التقرير السنوي لمهام العمل داخل مكب المنيا</h1><p>${annual.year}</p></div>
    <div class="summary-grid">
      <div class="summary-box"><span>أيام التشغيل</span><strong>${formatNumber(annual.daysTotal)}</strong></div>
      <div class="summary-box"><span>إجمالي النفايات</span><strong>${formatNumber(annual.wasteTotal)} طن</strong></div>
      <div class="summary-box"><span>إجمالي الشاحنات</span><strong>${formatNumber(annual.trucksTotal)}</strong></div>
      <div class="summary-box"><span>إجمالي السولار</span><strong>${formatNumber(annual.dieselTotal)} لتر</strong></div>
    </div>
    <div class="section-title">الملخص الشهري للسنة</div>
    <table>
      <thead><tr><th>الشهر</th><th>أيام التشغيل</th><th>النفايات طن</th><th>الشاحنات</th><th>السولار لتر</th></tr></thead>
      <tbody>
        ${rows}
        <tr><th>المجموع</th><th>${formatNumber(annual.daysTotal)}</th><th>${formatNumber(annual.wasteTotal)}</th><th>${formatNumber(annual.trucksTotal)}</th><th>${formatNumber(annual.dieselTotal)}</th></tr>
      </tbody>
    </table>
  </div>
  <div class="official-footer"><img src="/assets/footer.png" alt="التذييل الرسمي"></div>
</div>
<script>window.onload=function(){const images=Array.from(document.images);Promise.all(images.map(function(img){if(img.complete){return Promise.resolve();}return new Promise(function(resolve){img.onload=resolve;img.onerror=resolve;});})).then(function(){setTimeout(function(){window.print();},300);});};<\/script>
</body>
</html>`;
}

async function printAnnualReport() {
  const year = document.getElementById("annualYearFilter")?.value || "";
  if (!year) {
    showMessage("اختر السنة أولًا");
    return;
  }

  const html = await buildAnnualReportHtml();
  if (!html) {
    showMessage("لا توجد تقارير محفوظة لهذه السنة");
    return;
  }

  const popup = window.open("", "_blank");
  if (!popup) {
    showMessage("المتصفح منع نافذة الطباعة");
    return;
  }

  popup.document.write(html);
  popup.document.close();
}

function setupAnnualPrintButton() {
  const section = document.getElementById("annualSummarySection");
  const select = document.getElementById("annualYearFilter");
  if (!section || !select || document.getElementById("printAnnualReportBtn")) return;

  const controls = select.closest("div");
  if (!controls) return;

  const button = document.createElement("button");
  button.id = "printAnnualReportBtn";
  button.type = "button";
  button.textContent = "طباعة التقرير السنوي";
  button.style.minWidth = "210px";
  button.style.padding = "9px 16px";
  button.style.border = "0";
  button.style.borderRadius = "7px";
  button.style.cursor = "pointer";
  button.style.fontSize = "14px";
  button.style.fontWeight = "700";
  button.addEventListener("click", printAnnualReport);

  controls.appendChild(button);
}

setupAnnualPrintButton();

document.getElementById("archiveBtn")?.addEventListener("click", () => {
  setTimeout(setupAnnualPrintButton, 350);
});

window.printAnnualReport = printAnnualReport;
