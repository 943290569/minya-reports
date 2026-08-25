/* =========================================================
   بناء التقرير الشهري
========================================================= */

async function buildMonthlyReportHtml() {
  const monthly = calculateMonthlyReport();
  if (!monthly.month || monthly.reports.length === 0) return null;

  const monthlyOperationsData = await buildMonthlyOperationsData();
  const operationsTotals = monthlyOperationsData?.operationsTotals || {
    coverAslobVehicles: 0,
    coverAslobQuantity: 0,
    coverTammVehicles: 0,
    coverTammQuantity: 0,
    waterVehicles: 0,
    waterQuantity: 0,
    waterSprays: 0,
    leachateVehicles: 0,
    leachateQuantity: 0,
    sortingVehicles: 0,
    sortingQuantity: 0,
    externalTammVehicles: 0,
    externalTammQuantity: 0,
  };

  const dieselData = monthlyOperationsData?.diesel || {
    dieselTotal: monthly.dieselTotal,
    dieselByReportId: new Map(),
  };

  const dieselTotal = Number(dieselData.dieselTotal || 0);
  const dieselAverage = monthly.days > 0 ? dieselTotal / monthly.days : 0;

  const rows = monthly.reports.map((report) => {
    const id = Number(report.id);
    const dailyDiesel = dieselData.dieselByReportId?.has(id)
      ? dieselData.dieselByReportId.get(id)
      : Number(report.total_diesel || 0);

    return `<tr><td>${formatDate(report.report_date)}</td><td>${formatNumber(report.total_trucks)}</td><td>${formatNumber(report.total_waste_tons)}</td><td>${formatNumber(dailyDiesel)}</td></tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>التقرير الشهري ${getMonthName(monthly.month)}</title>
<style>
@page { size: A4 portrait; margin: 0mm; }
* { box-sizing: border-box; }
html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
body { font-family: Arial, Tahoma, sans-serif; direction: rtl; color: #111; background: white; }
.report { width: 202mm; height: 289mm; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; }
.official-header { width: 210mm; height: 30mm; margin-right: -4mm; margin-left: -4mm; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.official-header img { width: 210mm; height: 30mm; display: block; object-fit: fill; }
.report-content { width: 202mm; min-width: 202mm; max-width: 202mm; flex: 1; }
.title { text-align: center; border-top: 1px solid #444; border-bottom: 1px solid #444; padding: 2mm; margin-bottom: 2mm; }
.title h1 { margin: 0; font-size: 15px; }
.title p { margin: 1mm 0 0; font-size: 11px; font-weight: bold; }
.summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; margin-bottom: 3mm; }
.summary-box { border: 1px solid #444; text-align: center; padding: 3mm 1mm; }
.summary-box span { display: block; font-size: 9px; color: #555; margin-bottom: 1mm; }
.summary-box strong { display: block; font-size: 12px; }
.section-title { background: #eeeeee; border: 1px solid #444; text-align: center; font-weight: bold; font-size: 11px; padding: 1mm; margin: 2mm 0 1mm; }
table { width: 202mm; min-width: 202mm; max-width: 202mm; margin: 0; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #555; padding: 2mm; text-align: center; font-size: 9.5px; overflow-wrap: anywhere; word-break: normal; }
th { background: #f5f5f5; }
.official-footer { width: 210mm; height: 22mm; margin-right: -10mm; margin-left: -4mm; margin-top: auto; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; flex-shrink: 0; }
.official-footer img { width: 210mm; height: 22mm; display: block; object-fit: fill; }
@media print { html, body { width: 210mm; height: 297mm; overflow: hidden; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } table { width: 202mm !important; min-width: 202mm !important; max-width: 202mm !important; } }
</style>
</head>
<body>
<div class="report">
  <div class="official-header"><img src="/assets/header.png" alt="الترويسة الرسمية"></div>
  <div class="report-content">
    <div class="title"><h1>التقرير الشهري لمهام العمل داخل مكب المنيا</h1><p>${getMonthName(monthly.month)}</p></div>
    <div class="summary-grid">
      <div class="summary-box"><span>عدد أيام التشغيل المسجلة</span><strong>${formatNumber(monthly.days)}</strong></div>
      <div class="summary-box"><span>إجمالي النفايات</span><strong>${formatNumber(monthly.wasteTotal)} طن</strong></div>
      <div class="summary-box"><span>متوسط النفايات اليومي</span><strong>${formatNumber(monthly.wasteAverage)} طن/يوم</strong></div>
      <div class="summary-box"><span>إجمالي الشاحنات</span><strong>${formatNumber(monthly.trucksTotal)}</strong></div>
      <div class="summary-box"><span>متوسط الشاحنات اليومي</span><strong>${formatNumber(monthly.trucksAverage)}</strong></div>
      <div class="summary-box"><span>إجمالي السولار</span><strong>${formatNumber(dieselTotal)} لتر</strong></div>
      <div class="summary-box"><span>متوسط السولار اليومي</span><strong>${formatNumber(dieselAverage)} لتر/يوم</strong></div>
      <div class="summary-box"><span>أعلى كمية نفايات</span><strong>${formatNumber(monthly.maxWaste)} طن</strong></div>
      <div class="summary-box"><span>تاريخ أعلى كمية</span><strong>${formatDate(monthly.maxWasteDate)}</strong></div>
      <div class="summary-box"><span>أقل كمية نفايات</span><strong>${formatNumber(monthly.minWaste)} طن</strong></div>
      <div class="summary-box"><span>تاريخ أقل كمية</span><strong>${formatDate(monthly.minWasteDate)}</strong></div>
    </div>
    <div class="section-title">ملخص العمليات الشهرية</div>
    <table><thead><tr><th>العملية</th><th>عدد المركبات / النقلات</th><th>الكمية</th><th>الوحدة</th></tr></thead><tbody>
      <tr><td>مواد التغطية (اسلوب)</td><td>${formatNumber(operationsTotals.coverAslobVehicles)}</td><td>${formatNumber(operationsTotals.coverAslobQuantity)}</td><td>نقلة</td></tr>
      <tr><td>مواد التغطية (طمم)</td><td>${formatNumber(operationsTotals.coverTammVehicles)}</td><td>${formatNumber(operationsTotals.coverTammQuantity)}</td><td>كوب</td></tr>
      <tr><td>كميات المياه للتعقيم والترطيب</td><td>${formatNumber(operationsTotals.waterVehicles)}</td><td>${formatNumber(operationsTotals.waterQuantity)}</td><td>كوب</td></tr>
      <tr><td>عدد مرات رش المياه</td><td>-</td><td>${formatNumber(operationsTotals.waterSprays)}</td><td>مرة</td></tr>
      <tr><td>كميات العصارة المرحلة</td><td>${formatNumber(operationsTotals.leachateVehicles)}</td><td>${formatNumber(operationsTotals.leachateQuantity)}</td><td>كوب</td></tr>
      <tr><td>خط الفرز</td><td>${formatNumber(operationsTotals.sortingVehicles)}</td><td>${formatNumber(operationsTotals.sortingQuantity)}</td><td>طن</td></tr>
      <tr><td>طمم خارجي</td><td>${formatNumber(operationsTotals.externalTammVehicles)}</td><td>${formatNumber(operationsTotals.externalTammQuantity)}</td><td>طن</td></tr>
    </tbody></table>
    <div class="section-title">التفاصيل اليومية للشهر</div>
    <table><thead><tr><th>التاريخ</th><th>عدد الشاحنات</th><th>كمية النفايات طن</th><th>السولار لتر</th></tr></thead><tbody>${rows}<tr><th>المجموع</th><th>${formatNumber(monthly.trucksTotal)}</th><th>${formatNumber(monthly.wasteTotal)}</th><th>${formatNumber(dieselTotal)}</th></tr></tbody></table>
  </div>
  <div class="official-footer"><img src="/assets/footer.png" alt="التذييل الرسمي"></div>
</div>
<script>window.onload=function(){const images=Array.from(document.images);Promise.all(images.map(function(img){if(img.complete){return Promise.resolve();}return new Promise(function(resolve){img.onload=resolve;img.onerror=resolve;});})).then(function(){setTimeout(function(){window.print();},300);});};<\/script>
</body>
</html>`;
}

async function printMonthlyReport() {
  const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
  if (!monthValue) {
    showMessage("اختر الشهر أولًا");
    return;
  }

  const html = await buildMonthlyReportHtml();
  if (!html) {
    showMessage("لا توجد تقارير محفوظة لهذا الشهر");
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
