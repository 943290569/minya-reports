/* =========================================================
   مؤشرات إضافية للملخص السنوي
========================================================= */

function setupAnnualInsights() {
  const section = document.getElementById("annualSummarySection");
  const cards = document.getElementById("annualSummaryCards");
  if (!section || !cards || document.getElementById("annualInsights")) return;

  const insights = document.createElement("div");
  insights.id = "annualInsights";
  insights.style.display = "grid";
  insights.style.gridTemplateColumns = "repeat(3,minmax(0,1fr))";
  insights.style.gap = "12px";
  insights.style.margin = "0 0 16px";
  insights.innerHTML = `
    <div style="border:1px solid #d1d5db;border-radius:8px;padding:14px 10px;text-align:center;background:#fff;">
      <span style="display:block;color:#6b7280;margin-bottom:6px;">أعلى شهر نفايات</span>
      <strong id="annualBestMonth" style="display:block;font-size:18px;">-</strong>
      <small id="annualBestMonthValue" style="display:block;margin-top:4px;color:#6b7280;">-</small>
    </div>
    <div style="border:1px solid #d1d5db;border-radius:8px;padding:14px 10px;text-align:center;background:#fff;">
      <span style="display:block;color:#6b7280;margin-bottom:6px;">أقل شهر نفايات</span>
      <strong id="annualWorstMonth" style="display:block;font-size:18px;">-</strong>
      <small id="annualWorstMonthValue" style="display:block;margin-top:4px;color:#6b7280;">-</small>
    </div>
    <div style="border:1px solid #d1d5db;border-radius:8px;padding:14px 10px;text-align:center;background:#fff;">
      <span style="display:block;color:#6b7280;margin-bottom:6px;">متوسط النفايات الشهري</span>
      <strong id="annualMonthlyWasteAverage" style="display:block;font-size:18px;">0 طن</strong>
      <small style="display:block;margin-top:4px;color:#6b7280;">للأشهر التي تحتوي بيانات</small>
    </div>
  `;

  cards.insertAdjacentElement("afterend", insights);
}

function renderAnnualInsights() {
  setupAnnualInsights();

  const year = document.getElementById("annualYearFilter")?.value || "";
  const bestMonth = document.getElementById("annualBestMonth");
  const bestValue = document.getElementById("annualBestMonthValue");
  const worstMonth = document.getElementById("annualWorstMonth");
  const worstValue = document.getElementById("annualWorstMonthValue");
  const averageValue = document.getElementById("annualMonthlyWasteAverage");

  if (!bestMonth || !bestValue || !worstMonth || !worstValue || !averageValue) return;

  if (!year) {
    bestMonth.textContent = "-";
    bestValue.textContent = "-";
    worstMonth.textContent = "-";
    worstValue.textContent = "-";
    averageValue.textContent = "0 طن";
    return;
  }

  const months = Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");
    const monthValue = `${year}-${monthNumber}`;
    const reports = archiveReports.filter((report) =>
      String(report.report_date || "").startsWith(monthValue)
    );
    return {
      monthValue,
      reportsCount: reports.length,
      waste: reports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0),
    };
  }).filter((item) => item.reportsCount > 0);

  if (!months.length) {
    bestMonth.textContent = "-";
    bestValue.textContent = "لا توجد بيانات";
    worstMonth.textContent = "-";
    worstValue.textContent = "لا توجد بيانات";
    averageValue.textContent = "0 طن";
    return;
  }

  const highest = months.reduce((max, item) => item.waste > max.waste ? item : max);
  const lowest = months.reduce((min, item) => item.waste < min.waste ? item : min);
  const totalWaste = months.reduce((sum, item) => sum + item.waste, 0);
  const monthlyAverage = totalWaste / months.length;

  bestMonth.textContent = getMonthName(highest.monthValue);
  bestValue.textContent = `${formatNumber(highest.waste)} طن`;
  worstMonth.textContent = getMonthName(lowest.monthValue);
  worstValue.textContent = `${formatNumber(lowest.waste)} طن`;
  averageValue.textContent = `${formatNumber(monthlyAverage)} طن`;
}

setupAnnualInsights();

document.getElementById("archiveBtn")?.addEventListener("click", () => {
  setTimeout(renderAnnualInsights, 350);
});

document.addEventListener("change", (event) => {
  if (event.target?.id === "annualYearFilter") {
    setTimeout(renderAnnualInsights, 180);
  }
});

const annualSummaryBody = document.getElementById("annualSummaryBody");
if (annualSummaryBody && typeof MutationObserver !== "undefined") {
  new MutationObserver(() => renderAnnualInsights()).observe(annualSummaryBody, {
    childList: true,
    subtree: true,
  });
}

window.renderAnnualInsights = renderAnnualInsights;
