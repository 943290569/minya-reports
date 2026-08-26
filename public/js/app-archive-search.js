/* =========================================================
   البحث السريع داخل الأرشيف برقم التقرير أو الملاحظات
========================================================= */

let archiveSearchDetails = new Map();
let archiveSearchTimer = null;

function setupArchiveQuickSearch() {
  const filters = document.querySelector(".archive-filters");
  if (!filters || document.getElementById("archiveQuickSearch")) return;

  const label = document.createElement("label");
  label.innerHTML = `بحث سريع<input id="archiveQuickSearch" type="search" placeholder="رقم التقرير أو كلمة من الملاحظات">`;
  filters.insertBefore(label, filters.lastElementChild);

  const input = document.getElementById("archiveQuickSearch");
  input?.addEventListener("input", () => {
    clearTimeout(archiveSearchTimer);
    archiveSearchTimer = setTimeout(applyArchiveQuickSearch, 180);
  });

  document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
    if (input) input.value = "";
    setTimeout(applyArchiveQuickSearch, 80);
  });
}

async function loadArchiveSearchDetails() {
  const missing = archiveReports.filter((report) => !archiveSearchDetails.has(Number(report.id)));
  if (!missing.length) return;

  const details = await Promise.all(
    missing.map((report) => getReport(report.id).catch(() => null))
  );

  details.forEach((data, index) => {
    const report = missing[index];
    archiveSearchDetails.set(Number(report.id), String(data?.report?.notes || data?.notes || report.notes || ""));
  });
}

async function applyArchiveQuickSearch() {
  const input = document.getElementById("archiveQuickSearch");
  const query = String(input?.value || "").trim().toLowerCase();
  const tbody = document.querySelector("#archiveTable tbody");
  if (!tbody) return;

  if (!query) {
    Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
      row.style.display = "";
    });
    return;
  }

  await loadArchiveSearchDetails();

  const dateFilter = document.getElementById("archiveDateFilter")?.value || "";
  const monthFilter = document.getElementById("archiveMonthFilter")?.value || "";

  const matchingReports = archiveReports.filter((report) => {
    if (dateFilter && report.report_date !== dateFilter) return false;
    if (monthFilter && !String(report.report_date || "").startsWith(monthFilter)) return false;

    const reportNo = String(report.report_no || "").toLowerCase();
    const notes = String(archiveSearchDetails.get(Number(report.id)) || "").toLowerCase();
    return reportNo.includes(query) || notes.includes(query);
  });

  const matchingNumbers = new Set(matchingReports.map((report) => String(report.report_no || "")));

  Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
    const firstCell = row.cells?.[0];
    if (!firstCell) return;
    const reportNo = String(firstCell.textContent || "").trim();
    row.style.display = matchingNumbers.has(reportNo) ? "" : "none";
  });
}

setupArchiveQuickSearch();

document.getElementById("archiveBtn")?.addEventListener("click", () => {
  setTimeout(() => {
    setupArchiveQuickSearch();
    applyArchiveQuickSearch();
  }, 250);
});

document.getElementById("archiveDateFilter")?.addEventListener("change", () => {
  setTimeout(applyArchiveQuickSearch, 100);
});

document.getElementById("archiveMonthFilter")?.addEventListener("change", () => {
  setTimeout(applyArchiveQuickSearch, 100);
});

window.applyArchiveQuickSearch = applyArchiveQuickSearch;
