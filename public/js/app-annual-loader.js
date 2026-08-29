/* =========================================================
   V3.3 - تحميل بيانات السنة المطلوبة فقط + تثبيت أدوات الفترة
========================================================= */

window.annualAvailableYears = window.annualAvailableYears || [];
let annualLoading = false;
let annualPendingYear = "";

async function refreshAnnualCompanions() {
  try {
    if (typeof window.renderAnnualComparison === "function") {
      await window.renderAnnualComparison();
    }
    if (typeof window.renderAnnualInsights === "function") {
      window.renderAnnualInsights();
    }
    if (typeof window.setupAnnualExportButton === "function") {
      window.setupAnnualExportButton();
    }
  } catch (error) {
    console.error("تعذر تحديث أقسام السنوي الإضافية", error);
  }
}

async function loadAnnualArchiveData(year = "") {
  const requestedYear = String(
    year ||
    annualPendingYear ||
    document.getElementById("annualYearFilter")?.value ||
    new Date().getFullYear()
  );

  if (annualLoading) {
    annualPendingYear = requestedYear;
    return;
  }

  try {
    annualLoading = true;
    annualPendingYear = "";

    const response = await fetch(
      `${API}/api/annual-summary?year=${encodeURIComponent(requestedYear)}`,
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "فشل تحميل التقرير السنوي");
    }

    window.annualAvailableYears = Array.isArray(data.years)
      ? data.years.map(String)
      : [];

    archiveReports = Array.isArray(data.reports)
      ? data.reports
      : [];

    if (typeof renderAnnualSummary === "function") {
      await renderAnnualSummary();
    }

    const select = document.getElementById("annualYearFilter");
    if (select) {
      if (
        !Array.from(select.options).some((option) => option.value === requestedYear)
      ) {
        const option = document.createElement("option");
        option.value = requestedYear;
        option.textContent = requestedYear;
        select.appendChild(option);
      }
      select.value = requestedYear;
    }

    await refreshAnnualCompanions();
    document.getElementById("archiveSection")?.classList.remove("hidden");

  } catch (error) {
    console.error("فشل تحميل السنوي", error);
    showMessage("تعذر تحميل التقرير السنوي");
  } finally {
    annualLoading = false;

    if (annualPendingYear && annualPendingYear !== requestedYear) {
      const nextYear = annualPendingYear;
      annualPendingYear = "";
      setTimeout(() => loadAnnualArchiveData(nextYear), 0);
    }
  }
}

/*
  نلتقط تغيير السنة قبل المستمع القديم الموجود داخل الملخص السنوي.
  هذا يمنع إعادة القائمة إلى السنة السابقة أثناء تحميل البيانات الجديدة.
*/
document.addEventListener(
  "change",
  (event) => {
    if (
      event.target?.id === "annualYearFilter" &&
      location.pathname.replace(/\/+$/, "") === "/annual"
    ) {
      const requestedYear = String(event.target.value || "");
      event.stopImmediatePropagation();
      if (requestedYear) loadAnnualArchiveData(requestedYear);
    }
  },
  true
);

function simplifyPeriodFilters() {
  const path = location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/monthly") {
    const dateInput = document.getElementById("archiveDateFilter");
    const dateLabel = dateInput?.closest("label");
    if (dateInput) dateInput.value = "";
    if (dateLabel) dateLabel.style.display = "none";

    const filters = document.querySelector(".archive-filters");
    if (filters) filters.style.gridTemplateColumns = "minmax(220px, 1fr) auto";
  }

  if (path === "/annual") {
    const dateInput = document.getElementById("archiveDateFilter");
    if (dateInput) dateInput.value = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  simplifyPeriodFilters();

  if (location.pathname.replace(/\/+$/, "") === "/annual") {
    setTimeout(() => {
      const year = document.getElementById("annualYearFilter")?.value || "";
      if (year) loadAnnualArchiveData(year);
    }, 180);
  }
});

window.loadAnnualArchiveData = loadAnnualArchiveData;
