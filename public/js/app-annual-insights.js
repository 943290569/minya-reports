/* =========================================================
   مؤشرات إضافية للملخص السنوي
========================================================= */

function setupAnnualInsights() {
  const section = document.getElementById("annualSummarySection");
  const cards = document.getElementById("annualSummaryCards");
  if (!section || !cards || document.getElementById("annualInsights")) return;

  const cardStyle = "border:1px solid #d1d5db;border-radius:8px;padding:14px 10px;text-align:center;background:#fff;";
  const insights = document.createElement("div");
  insights.id = "annualInsights";
  insights.style.display = "grid";
  insights.style.gridTemplateColumns = "repeat(3,minmax(0,1fr))";
  insights.style.gap = "12px";
  insights.style.margin = "0 0 16px";
  insights.innerHTML = `
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">أعلى شهر نفايات</span><strong id="annualBestMonth" style="display:block;font-size:18px;">-</strong><small id="annualBestMonthValue" style="display:block;margin-top:4px;color:#6b7280;">-</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">أقل شهر نفايات</span><strong id="annualWorstMonth" style="display:block;font-size:18px;">-</strong><small id="annualWorstMonthValue" style="display:block;margin-top:4px;color:#6b7280;">-</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">متوسط النفايات الشهري</span><strong id="annualMonthlyWasteAverage" style="display:block;font-size:18px;">0 طن</strong><small id="annualMonthlyWasteAverageNote" style="display:block;margin-top:4px;color:#6b7280;">للأشهر التي تحتوي بيانات</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">متوسط النفايات اليومي</span><strong id="annualDailyWasteAverage" style="display:block;font-size:18px;">0 طن</strong><small id="annualDailyWasteAverageNote" style="display:block;margin-top:4px;color:#6b7280;">لأيام التشغيل المسجلة</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">أعلى يوم نفايات</span><strong id="annualBestDay" style="display:block;font-size:18px;">-</strong><small id="annualBestDayValue" style="display:block;margin-top:4px;color:#6b7280;">-</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">أقل يوم نفايات</span><strong id="annualWorstDay" style="display:block;font-size:18px;">-</strong><small id="annualWorstDayValue" style="display:block;margin-top:4px;color:#6b7280;">-</small></div>
  `;

  cards.insertAdjacentElement("afterend", insights);
}

function annualJerusalemPeriod() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: String(values.year), month: `${values.year}-${values.month}` };
}

function renderAnnualInsights() {
  setupAnnualInsights();

  const year = document.getElementById("annualYearFilter")?.value || "";
  const bestMonth = document.getElementById("annualBestMonth");
  const bestValue = document.getElementById("annualBestMonthValue");
  const worstMonth = document.getElementById("annualWorstMonth");
  const worstValue = document.getElementById("annualWorstMonthValue");
  const averageValue = document.getElementById("annualMonthlyWasteAverage");
  const averageNote = document.getElementById("annualMonthlyWasteAverageNote");
  const dailyAverage = document.getElementById("annualDailyWasteAverage");
  const dailyAverageNote = document.getElementById("annualDailyWasteAverageNote");
  const bestDay = document.getElementById("annualBestDay");
  const bestDayValue = document.getElementById("annualBestDayValue");
  const worstDay = document.getElementById("annualWorstDay");
  const worstDayValue = document.getElementById("annualWorstDayValue");

  if (!bestMonth || !bestValue || !worstMonth || !worstValue || !averageValue || !dailyAverage || !bestDay || !worstDay) return;

  const annualReports = year ? archiveReports.filter((report) =>
    String(report.report_date || "").startsWith(`${year}-`)
  ) : [];

  if (!year || !annualReports.length) {
    bestMonth.textContent = worstMonth.textContent = bestDay.textContent = worstDay.textContent = "-";
    bestValue.textContent = worstValue.textContent = bestDayValue.textContent = worstDayValue.textContent = year ? "لا توجد بيانات" : "-";
    averageValue.textContent = dailyAverage.textContent = "0 طن";
    if (averageNote) averageNote.textContent = "للأشهر التي تحتوي بيانات";
    if (dailyAverageNote) dailyAverageNote.textContent = "لأيام التشغيل المسجلة";
    return;
  }

  const currentPeriod = annualJerusalemPeriod();
  const isCurrentYear = String(year) === currentPeriod.year;
  const months = Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");
    const monthValue = `${year}-${monthNumber}`;
    const reports = annualReports.filter((report) => String(report.report_date || "").startsWith(monthValue));
    return {
      monthValue,
      reportsCount: reports.length,
      waste: reports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0),
    };
  }).filter((item) => item.reportsCount > 0 && (!isCurrentYear || item.monthValue < currentPeriod.month));

  if (!months.length) {
    bestMonth.textContent = worstMonth.textContent = "-";
    bestValue.textContent = worstValue.textContent = isCurrentYear ? "لا توجد أشهر مكتملة" : "لا توجد بيانات";
    averageValue.textContent = "0 طن";
    if (averageNote) averageNote.textContent = isCurrentYear ? "يُحسب بعد اكتمال أول شهر" : "للأشهر التي تحتوي بيانات";
  } else {
    const highest = months.reduce((max, item) => item.waste > max.waste ? item : max);
    const lowest = months.reduce((min, item) => item.waste < min.waste ? item : min);
    const totalWaste = months.reduce((sum, item) => sum + item.waste, 0);
    bestMonth.textContent = getMonthName(highest.monthValue);
    bestValue.textContent = `${formatNumber(highest.waste)} طن`;
    worstMonth.textContent = getMonthName(lowest.monthValue);
    worstValue.textContent = `${formatNumber(lowest.waste)} طن`;
    averageValue.textContent = `${formatNumber(totalWaste / months.length)} طن`;
    if (averageNote) averageNote.textContent = isCurrentYear
      ? `للأشهر المكتملة فقط — ${months.length} شهر`
      : `للأشهر التي تحتوي بيانات — ${months.length} شهر`;
  }

  const yearWaste = annualReports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0);
  const highestDay = annualReports.reduce((max, report) => Number(report.total_waste_tons || 0) > Number(max.total_waste_tons || 0) ? report : max);
  const lowestDay = annualReports.reduce((min, report) => Number(report.total_waste_tons || 0) < Number(min.total_waste_tons || 0) ? report : min);
  dailyAverage.textContent = `${formatNumber(yearWaste / annualReports.length)} طن`;
  if (dailyAverageNote) dailyAverageNote.textContent = `لأيام التشغيل المسجلة — ${annualReports.length} يوم`;
  bestDay.textContent = formatDate(highestDay.report_date);
  bestDayValue.textContent = `${formatNumber(highestDay.total_waste_tons)} طن`;
  worstDay.textContent = formatDate(lowestDay.report_date);
  worstDayValue.textContent = `${formatNumber(lowestDay.total_waste_tons)} طن`;
}

setupAnnualInsights();

document.getElementById("archiveBtn")?.addEventListener("click", () => setTimeout(renderAnnualInsights, 350));
document.addEventListener("change", (event) => {
  if (event.target?.id === "annualYearFilter") setTimeout(renderAnnualInsights, 180);
});

const annualSummaryBody = document.getElementById("annualSummaryBody");
if (annualSummaryBody && typeof MutationObserver !== "undefined") {
  new MutationObserver(() => renderAnnualInsights()).observe(annualSummaryBody, { childList: true, subtree: true });
}

window.renderAnnualInsights = renderAnnualInsights;
