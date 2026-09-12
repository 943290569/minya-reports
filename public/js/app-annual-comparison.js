/* =========================================================
   مقارنة الملخص السنوي مع السنة السابقة
========================================================= */

function formatAnnualChange(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return "-";
  const percent = ((currentValue - previousValue) / previousValue) * 100;
  if (Math.abs(percent) < 0.05) return "بدون تغير";
  return `${percent > 0 ? "زيادة" : "انخفاض"} ${formatNumber(Math.abs(percent))}%`;
}

function annualPeriodCutoff(reports, year) {
  const prefix = `${year}-`;
  const dates = (Array.isArray(reports) ? reports : [])
    .map((report) => String(report.report_date || ""))
    .filter((date) => date.startsWith(prefix) && /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
  return dates.length ? dates.at(-1).slice(5) : null;
}

function filterAnnualPeriod(reports, year, cutoff = null) {
  const prefix = `${year}-`;
  return reports.filter((report) => {
    const date = String(report.report_date || "");
    if (!date.startsWith(prefix)) return false;
    return !cutoff || date.slice(5) <= cutoff;
  });
}

async function getAnnualReportsForYear(year) {
  const localReports = archiveReports.filter((report) =>
    String(report.report_date || "").startsWith(`${year}-`)
  );

  if (localReports.length) return localReports;

  if (window.annualPreviousReports?.year === String(year)) {
    return Array.isArray(window.annualPreviousReports.reports)
      ? window.annualPreviousReports.reports
      : [];
  }

  try {
    const response = await fetch(
      `${API}/api/annual-summary?year=${encodeURIComponent(year)}`,
      { cache: "no-store" }
    );
    const data = await response.json();
    if (!response.ok || !data.ok) return [];
    return Array.isArray(data.reports) ? data.reports : [];
  } catch (error) {
    console.error(`تعذر تحميل بيانات سنة ${year}`, error);
    return [];
  }
}

async function calculateAnnualTotals(year, cutoff = null, providedReports = null) {
  const allReports = Array.isArray(providedReports)
    ? providedReports
    : await getAnnualReportsForYear(year);
  const reports = filterAnnualPeriod(allReports, year, cutoff);
  if (!reports.length) return null;

  const dieselTotal = reports.reduce(
    (sum, report) => sum + Number(report.total_diesel || 0),
    0
  );

  return {
    year,
    days: reports.length,
    waste: reports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0),
    trucks: reports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0),
    diesel: dieselTotal,
  };
}

function setupAnnualComparisonSection() {
  const section = document.getElementById("annualSummarySection");
  const cards = document.getElementById("annualSummaryCards");
  if (!section || !cards || document.getElementById("annualComparisonSection")) return;

  const comparison = document.createElement("div");
  comparison.id = "annualComparisonSection";
  comparison.style.margin = "16px 0";
  comparison.style.padding = "14px";
  comparison.style.border = "1px solid #d1d5db";
  comparison.style.borderRadius = "8px";
  comparison.style.background = "#f9fafb";
  comparison.innerHTML = `
    <h4 id="annualComparisonTitle" style="margin:0 0 12px;text-align:center;font-size:16px;">مقارنة مع السنة السابقة</h4>
    <div id="annualComparisonGrid" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;"></div>
    <div id="annualComparisonEmpty" style="display:none;text-align:center;color:#6b7280;padding:8px 0;"></div>
  `;

  cards.insertAdjacentElement("afterend", comparison);
}

async function renderAnnualComparison() {
  setupAnnualComparisonSection();

  const select = document.getElementById("annualYearFilter");
  const title = document.getElementById("annualComparisonTitle");
  const grid = document.getElementById("annualComparisonGrid");
  const empty = document.getElementById("annualComparisonEmpty");
  if (!select || !title || !grid || !empty) return;

  const year = Number(select.value || 0);
  if (!year) {
    grid.style.display = "none";
    empty.style.display = "block";
    empty.textContent = "اختر سنة لعرض المقارنة.";
    return;
  }

  const previousYear = year - 1;
  const currentReports = await getAnnualReportsForYear(String(year));
  const cutoff = annualPeriodCutoff(currentReports, String(year));
  const periodLabel = cutoff ? ` حتى ${cutoff.slice(3, 5)}/${cutoff.slice(0, 2)} في السنتين` : "";
  title.textContent = `مقارنة مع السنة السابقة - ${previousYear}${periodLabel}`;
  grid.style.display = "none";
  empty.style.display = "block";
  empty.textContent = "جاري تحميل المقارنة...";

  const [current, previous] = await Promise.all([
    calculateAnnualTotals(String(year), cutoff, currentReports),
    calculateAnnualTotals(String(previousYear), cutoff),
  ]);

  if (!current || !previous) {
    grid.style.display = "none";
    empty.style.display = "block";
    empty.textContent = "لا توجد بيانات محفوظة للسنة السابقة للمقارنة.";
    return;
  }

  const cardStyle = "background:#fff;border:1px solid #d1d5db;border-radius:8px;padding:12px 8px;text-align:center;";
  grid.innerHTML = `
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;">النفايات</span><strong style="display:block;margin:6px 0;font-size:18px;">${formatAnnualChange(current.waste, previous.waste)}</strong><small style="display:block;color:#6b7280;">${year}: ${formatNumber(current.waste)} طن · ${previousYear}: ${formatNumber(previous.waste)} طن</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;">الشاحنات</span><strong style="display:block;margin:6px 0;font-size:18px;">${formatAnnualChange(current.trucks, previous.trucks)}</strong><small style="display:block;color:#6b7280;">${year}: ${formatNumber(current.trucks)} · ${previousYear}: ${formatNumber(previous.trucks)}</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;">السولار</span><strong style="display:block;margin:6px 0;font-size:18px;">${formatAnnualChange(current.diesel, previous.diesel)}</strong><small style="display:block;color:#6b7280;">${year}: ${formatNumber(current.diesel)} لتر · ${previousYear}: ${formatNumber(previous.diesel)} لتر</small></div>
  `;

  empty.style.display = "none";
  grid.style.display = "grid";
}

function bindAnnualComparison() {
  setupAnnualComparisonSection();
}

bindAnnualComparison();

window.renderAnnualComparison = renderAnnualComparison;
