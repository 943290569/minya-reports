/* =========================================================
   التقرير اليومي الرسمي
========================================================= */

function buildFullReportHtml(data, autoPrint = false) {
  const report = data.report;
  const totalWorkers = data.crews.reduce((sum, item) => sum + Number(item.crew_count || 0), 0);
  const totalDiesel = data.equipment.reduce((sum, item) => sum + Number(item.diesel_liters || 0), 0);

  const crewRows = data.crews.map((item) => `
      <tr><td>${escapeHtml(item.crew_name)}</td><td>${formatNumber(item.crew_count)}</td><td>${escapeHtml(item.notes || "-")}</td></tr>`).join("");

  const operationRows = data.operations.map((item) => `
      <tr><td>${escapeHtml(item.operation_name)}</td><td>${formatNumber(item.vehicle_count)}</td><td>${formatNumber(item.quantity)}</td><td>${escapeHtml(item.unit || "")}</td></tr>`).join("");

  const stationRows = data.stations.map((item) => `
      <tr><td>${escapeHtml(item.station_name)}</td><td>${formatNumber(item.truck_count)}</td><td>${formatNumber(item.waste_tons)}</td><td>${escapeHtml(item.unit || "طن")}</td></tr>`).join("");

  const equipmentRows = data.equipment.map((item) => `
      <tr><td>${escapeHtml(item.equipment_name)}</td><td>${escapeHtml(item.operating_status || "-")}</td><td>${escapeHtml(item.status_description || "-")}</td><td>${formatNumber(item.working_hours)}</td><td>${formatNumber(item.diesel_liters)}</td></tr>`).join("");

  const previewAttachments = !autoPrint ? `
  <section class="preview-attachments">
    <h2>مرفقات التقرير</h2>
    ${(Array.isArray(data.attachments) && data.attachments.length)
      ? data.attachments.map((item) => `
        <div class="preview-attachment-row">
          <span>${escapeHtml(item.original_name || "مرفق")}</span>
          <a href="/api/attachments/${Number(item.id)}/download" target="_blank" rel="noopener">فتح</a>
        </div>`).join("")
      : '<div class="preview-attachments-empty">لا توجد مرفقات لهذا التقرير.</div>'}
  </section>` : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(report.report_no)}</title>
<style>
@page { size: A4 portrait; margin: 4mm; }
* { box-sizing: border-box; }
html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
body { font-family: Arial, Tahoma, sans-serif; direction: rtl; color: #111; background: white; }
.report { width: 202mm; height: 289mm; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; }
.official-header { width: 210mm; height: 30mm; margin-right: -4mm; margin-left: -4mm; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.official-header img { width: 210mm; height: 30mm; display: block; object-fit: fill; }
.report-content { width: 200mm; margin-right: 1mm; margin-left: 1mm; flex: 1 1 auto; min-height: 0; overflow: visible; display: flex; flex-direction: column; transform-origin: top right; }
.report-title { text-align: center; border-top: 1px solid #444; border-bottom: 1px solid #444; padding: 1.5mm 1mm; margin-bottom: 1mm; }
.report-title h1 { margin: 0; font-size: 13px; }
.report-number { direction: ltr; margin-top: 1mm; font-size: 9px; font-weight: bold; }
.info-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1mm; margin-bottom: 1mm; }
.info-box { border: 1px solid #444; text-align: center; padding: 1mm 0.5mm; }
.info-box span { display: block; font-size: 8px; color: #555; margin-bottom: 0.5mm; }
.info-box strong { font-size: 9px; }
.section-title { background: #eeeeee; border: 1px solid #444; text-align: center; font-weight: bold; font-size: 9.5px; padding: 0.7mm; margin: 0.8mm 0 0.5mm; }
table { width: 100%; max-width: 100%; margin: 0; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #555; padding: calc(0.55mm + 0.5px) 0.7mm; text-align: center; vertical-align: middle; font-size: 9px; line-height: 1.05; overflow-wrap: anywhere; word-break: normal; }
th { background: #f5f5f5; font-weight: bold; }
.totals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1mm; margin: 1mm 0; }
.total-box { border: 1px solid #444; text-align: center; padding: 1mm; }
.total-box span { display: block; font-size: 9.5px; color: #555; }
.total-box strong { display: block; font-size: 10.5px; margin-top: 0.5mm; }
.notes { border: 1px solid #444; min-height: 9mm; padding: 1mm; font-size: 9.5px; white-space: pre-wrap; }
.official-footer { width: 210mm; height: 22mm; margin-right: -10mm; margin-left: -4mm; margin-top: auto; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; flex-shrink: 0; }
.official-footer img { width: 210mm; height: 22mm; display: block; object-fit: fill; }
.preview-attachments { width: min(202mm, calc(100% - 24px)); margin: 18px auto 32px; padding: 14px; border: 1px solid #d7dfda; border-radius: 12px; background: #fff; }
.preview-attachments h2 { margin: 0 0 12px; font-size: 16px; }
.preview-attachment-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid #edf0ee; }
.preview-attachment-row:first-of-type { border-top: 0; }
.preview-attachment-row span { min-width: 0; overflow-wrap: anywhere; }
.preview-attachment-row a { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; min-width: 70px; padding: 9px 14px; border-radius: 9px; background: #176b4f; color: #fff; text-decoration: none; font-weight: bold; }
.preview-attachments-empty { color: #68746e; }
@media(max-width:560px){.preview-attachment-row{align-items:stretch;flex-direction:column}.preview-attachment-row a{width:100%}}
@media print { html, body { width: 202mm; height: 289mm; overflow: hidden; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .report { width: 202mm; height: 289mm; margin: 0; overflow: hidden; } .preview-attachments { display:none!important; } table, tr, th, td { page-break-inside: avoid; } }
</style>
</head>
<body>
<div class="report">
  <div class="official-header"><img src="/assets/header.png" alt="الترويسة الرسمية"></div>
  <div class="report-content">
    <div class="report-title"><h1>التقرير اليومي لمهام العمل داخل مكب المنيا</h1><div class="report-number">${escapeHtml(report.report_no)}</div></div>
    <div class="info-grid">
      <div class="info-box"><span>التاريخ</span><strong>${formatDate(report.report_date)}</strong></div>
      <div class="info-box"><span>حالة الطقس</span><strong>${escapeHtml(report.weather || "-")}</strong></div>
      <div class="info-box"><span>درجة الحرارة</span><strong>${formatNumber(report.temperature)}</strong></div>
      <div class="info-box"><span>وقت البداية</span><strong>${formatTime(report.start_time)}</strong></div>
      <div class="info-box"><span>وقت النهاية</span><strong>${formatTime(report.end_time)}</strong></div>
    </div>
    <div class="section-title">شؤون الموظفين</div>
    <table><thead><tr><th>طواقم العمل</th><th>العدد</th><th>الملاحظات</th></tr></thead><tbody>${crewRows}<tr><th>المجموع</th><th>${formatNumber(totalWorkers)}</th><th>-</th></tr></tbody></table>
    <div class="section-title">العمليات</div>
    <table><thead><tr><th>العملية</th><th>عدد المركبات</th><th>الكمية</th><th>الوحدة</th></tr></thead><tbody>${operationRows}</tbody></table>
    <div class="section-title">محطات الترحيل</div>
    <table><thead><tr><th>المحطة</th><th>عدد الشاحنات</th><th>الكمية</th><th>الوحدة</th></tr></thead><tbody>${stationRows}</tbody></table>
    <div class="section-title">كميات النفايات الواردة لمكب المنيا</div>
    <div class="totals">
      <div class="total-box"><span>عدد الشاحنات النهائي</span><strong>${formatNumber(report.total_trucks)}</strong></div>
      <div class="total-box"><span>كمية النفايات النهائية</span><strong>${formatNumber(report.total_waste_tons)} طن</strong></div>
      <div class="total-box"><span>عدد العاملين</span><strong>${formatNumber(totalWorkers)}</strong></div>
      <div class="total-box"><span>مجموع السولار</span><strong>${formatNumber(totalDiesel)} لتر</strong></div>
    </div>
    <div class="section-title">تقرير الصيانة اليومي</div>
    <table><thead><tr><th>اسم الآلية</th><th>حالة الآلية</th><th>وصف حالة الآلية</th><th>ساعات العمل</th><th>كمية السولار</th></tr></thead><tbody>${equipmentRows}<tr><th colspan="4">مجموع كمية السولار للمعدات السابقة</th><th>${formatNumber(totalDiesel)}</th></tr></tbody></table>
    <div class="section-title">الملاحظات</div>
    <div class="notes">${escapeHtml(report.notes || "-")}</div>
  </div>
  <div class="official-footer"><img src="/assets/footer.png" alt="التذييل الرسمي"></div>
</div>
${previewAttachments}
<script>
function fitDailyReport(){
  const report=document.querySelector('.report');
  const header=document.querySelector('.official-header');
  const footer=document.querySelector('.official-footer');
  const content=document.querySelector('.report-content');
  if(!report||!header||!footer||!content)return;
  content.style.transform='none';
  content.style.width='200mm';
  const baseWidth=Math.max(1,content.clientWidth);
  const available=Math.max(1,report.clientHeight-header.offsetHeight-footer.offsetHeight);
  const needed=Math.max(1,content.scrollHeight);
  const scale=Math.min(1,available/needed);
  if(scale<0.999){
    content.style.width=(baseWidth/scale)+'px';
    content.style.transform='scale('+scale+')';
  }
}
window.onload=function(){
  const images=Array.from(document.images);
  Promise.all(images.map(function(img){if(img.complete){return Promise.resolve();}return new Promise(function(resolve){img.onload=resolve;img.onerror=resolve;});})).then(function(){
    requestAnimationFrame(function(){
      fitDailyReport();
      ${autoPrint ? "setTimeout(function(){window.print();},300);" : ""}
    });
  });
};
<\/script>
</body>
</html>`;
}

async function openReport(id) {
  try {
    const data = await getReport(id);
    const popup = window.open("", "_blank");
    if (!popup) {
      showMessage("المتصفح منع فتح نافذة التقرير");
      return;
    }
    popup.document.write(buildFullReportHtml(data, false));
    popup.document.close();
    showMessage("تم فتح التقرير");
  } catch (error) {
    console.error(error);
    showMessage(error.message);
  }
}

async function printReport(id) {
  try {
    const data = await getReport(id);
    const popup = window.open("", "_blank");
    if (!popup) {
      showMessage("المتصفح منع نافذة الطباعة");
      return;
    }
    popup.document.write(buildFullReportHtml(data, true));
    popup.document.close();
  } catch (error) {
    console.error(error);
    showMessage(error.message);
  }
}
