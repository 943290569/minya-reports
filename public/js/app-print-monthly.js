/* =========================================================
   بناء التقرير الشهري
========================================================= */

function getPreviousMonthValue(monthValue) {
  const [year, month] = String(monthValue || "").split("-").map(Number);
  if (!year || !month) return "";
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function calculateChangePercent(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
}

function formatChangeText(current, previous) {
  const percent = calculateChangePercent(current, previous);
  if (percent === null) return "-";
  if (Math.abs(percent) < 0.05) return "بدون تغير";
  return `${percent > 0 ? "زيادة" : "انخفاض"} ${formatNumber(Math.abs(percent))}%`;
}

async function buildPreviousMonthComparison(monthValue) {
  const previousMonth = getPreviousMonthValue(monthValue);
  if (!previousMonth) return null;

  const reports = archiveReports.filter((report) =>
    String(report.report_date || "").startsWith(previousMonth)
  );

  if (!reports.length) {
    return {
      month: previousMonth,
      days: 0,
      wasteTotal: 0,
      trucksTotal: 0,
      dieselTotal: 0,
      hasData: false,
    };
  }

  const wasteTotal = reports.reduce(
    (sum, report) => sum + Number(report.total_waste_tons || 0),
    0
  );
  const trucksTotal = reports.reduce(
    (sum, report) => sum + Number(report.total_trucks || 0),
    0
  );

  let dieselTotal = reports.reduce(
    (sum, report) => sum + Number(report.total_diesel || 0),
    0
  );

  try {
    const detailedReports = await getMonthlyDetailedReports(previousMonth);
    dieselTotal = calculateDieselFromDetailedReports(detailedReports).dieselTotal;
  } catch (error) {
    console.error("فشل حساب سولار الشهر السابق", error);
  }

  return {
    month: previousMonth,
    days: reports.length,
    wasteTotal,
    trucksTotal,
    dieselTotal,
    hasData: true,
  };
}

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
  const previous = await buildPreviousMonthComparison(monthly.month);

  const rows = monthly.reports.map((report) => {
    const id = Number(report.id);
    const dailyDiesel = dieselData.dieselByReportId?.has(id)
      ? dieselData.dieselByReportId.get(id)
      : Number(report.total_diesel || 0);

    return `<tr><td>${formatDate(report.report_date)}</td><td>${formatNumber(report.total_trucks)}</td><td>${formatNumber(report.total_waste_tons)}</td><td>${formatNumber(dailyDiesel)}</td></tr>`;
  }).join("");

  const previousMonthLabel = previous?.month ? getMonthName(previous.month) : "الشهر السابق";
  const comparisonHtml = previous?.hasData ? `
    <div class="section-title comparison-title">مقارنة مع الشهر السابق - ${previousMonthLabel}</div>
    <div class="comparison-grid">
      <div><span>النفايات</span><strong>${formatChangeText(monthly.wasteTotal, previous.wasteTotal)}</strong><small>${formatNumber(previous.wasteTotal)} ← ${formatNumber(monthly.wasteTotal)} طن</small></div>
      <div><span>الشاحنات</span><strong>${formatChangeText(monthly.trucksTotal, previous.trucksTotal)}</strong><small>${formatNumber(previous.trucksTotal)} ← ${formatNumber(monthly.trucksTotal)}</small></div>
      <div><span>السولار</span><strong>${formatChangeText(dieselTotal, previous.dieselTotal)}</strong><small>${formatNumber(previous.dieselTotal)} ← ${formatNumber(dieselTotal)} لتر</small></div>
    </div>
    <div class="executive-summary">خلال ${getMonthName(monthly.month)} تم تسجيل ${formatNumber(monthly.days)} يوم تشغيل، بإجمالي ${formatNumber(monthly.wasteTotal)} طن نفايات ومتوسط ${formatNumber(monthly.wasteAverage)} طن/يوم. مقارنة بالشهر السابق، سجلت النفايات ${formatChangeText(monthly.wasteTotal, previous.wasteTotal)}، والشاحنات ${formatChangeText(monthly.trucksTotal, previous.trucksTotal)}، والسولار ${formatChangeText(dieselTotal, previous.dieselTotal)}.</div>
  ` : `
    <div class="section-title comparison-title">مقارنة مع الشهر السابق - ${previousMonthLabel}</div>
    <div class="comparison-empty">لا توجد بيانات محفوظة للشهر السابق للمقارنة.</div>
  `;

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
.report-content { width: 202mm; min-width: 202mm; max-width: 202mm; flex: 1; min-height: 0; overflow: hidden; }
.title { text-align: center; border-top: 1px solid #444; border-bottom: 1px solid #444; padding: 1.4mm; margin-bottom: 1.2mm; }
.title h1 { margin: 0; font-size: 17px; }
.title p { margin: 0.7mm 0 0; font-size: 13px; font-weight: bold; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1mm; margin-bottom: 1.2mm; }
.summary-box { border: 1px solid #444; text-align: center; padding: 1.4mm 0.7mm; }
.summary-box span { display: block; font-size: 9.5px; color: #555; margin-bottom: 0.5mm; }
.summary-box strong { display: block; font-size: 12px; }
.section-title { background: #eeeeee; border: 1px solid #444; text-align: center; font-weight: bold; font-size: 12px; padding: 0.7mm; margin: 1mm 0 0.6mm; }
.comparison-title { margin-top: 0.6mm; }
.comparison-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1mm; margin-bottom: 0.8mm; }
.comparison-grid > div { border: 1px solid #555; text-align: center; padding: 1mm 0.6mm; }
.comparison-grid span { display: block; font-size: 9.5px; color: #555; }
.comparison-grid strong { display: block; font-size: 11.5px; margin: 0.4mm 0; }
.comparison-grid small { display: block; font-size: 8.5px; }
.comparison-empty { border: 1px solid #777; text-align: center; padding: 1.3mm; font-size: 10.5px; font-weight: bold; margin-bottom: 0.8mm; }
.executive-summary { border: 1px solid #777; padding: 1mm 1.3mm; font-size: 9.5px; line-height: 1.25; margin-bottom: 0.8mm; text-align: right; }
table { width: 202mm; min-width: 202mm; max-width: 202mm; margin: 0; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #555; padding: 1.1mm 1mm; text-align: center; font-size: 10.5px; line-height: 1.1; overflow-wrap: anywhere; word-break: normal; }
th { background: #f5f5f5; font-size: 11px; }
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
      <div class="summary-box"><span>أيام التشغيل</span><strong>${formatNumber(monthly.days)}</strong></div>
      <div class="summary-box"><span>إجمالي النفايات</span><strong>${formatNumber(monthly.wasteTotal)} طن</strong></div>
      <div class="summary-box"><span>متوسط النفايات اليومي</span><strong>${formatNumber(monthly.wasteAverage)} طن</strong></div>
      <div class="summary-box"><span>إجمالي الشاحنات</span><strong>${formatNumber(monthly.trucksTotal)}</strong></div>
      <div class="summary-box"><span>متوسط الشاحنات اليومي</span><strong>${formatNumber(monthly.trucksAverage)}</strong></div>
      <div class="summary-box"><span>إجمالي السولار</span><strong>${formatNumber(dieselTotal)} لتر</strong></div>
      <div class="summary-box"><span>متوسط السولار اليومي</span><strong>${formatNumber(dieselAverage)} لتر</strong></div>
      <div class="summary-box"><span>أعلى كمية</span><strong>${formatNumber(monthly.maxWaste)} طن</strong></div>
      <div class="summary-box"><span>تاريخ الأعلى</span><strong>${formatDate(monthly.maxWasteDate)}</strong></div>
      <div class="summary-box"><span>أقل كمية</span><strong>${formatNumber(monthly.minWaste)} طن</strong></div>
      <div class="summary-box"><span>تاريخ الأقل</span><strong>${formatDate(monthly.minWasteDate)}</strong></div>
    </div>
    ${comparisonHtml}
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
