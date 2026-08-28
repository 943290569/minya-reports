/* =========================================================
   V3.2 - تحميل بيانات السنة المطلوبة فقط
========================================================= */

window.annualAvailableYears = window.annualAvailableYears || [];
let annualLoading = false;

async function loadAnnualArchiveData(year = "") {
  if (annualLoading) return;

  try {
    annualLoading = true;

    const selectedYear =
      String(year || document.getElementById("annualYearFilter")?.value || new Date().getFullYear());

    const response = await fetch(
      `${API}/api/annual-summary?year=${encodeURIComponent(selectedYear)}`
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "فشل تحميل التقرير السنوي");
    }

    window.annualAvailableYears = Array.isArray(data.years)
      ? data.years
      : [];

    archiveReports = Array.isArray(data.reports)
      ? data.reports
      : [];

    if (typeof renderAnnualSummary === "function") {
      await renderAnnualSummary();

      const select = document.getElementById("annualYearFilter");
      if (select && window.annualAvailableYears.includes(selectedYear)) {
        select.value = selectedYear;
      }
    }

    document.getElementById("archiveSection")?.classList.remove("hidden");

  } catch (error) {
    console.error("فشل تحميل السنوي", error);
    showMessage("تعذر تحميل التقرير السنوي");
  } finally {
    annualLoading = false;
  }
}

document.addEventListener("change", (event) => {
  if (
    event.target?.id === "annualYearFilter" &&
    location.pathname.replace(/\/+$/, "") === "/annual"
  ) {
    loadAnnualArchiveData(event.target.value);
  }
});

window.loadAnnualArchiveData = loadAnnualArchiveData;
