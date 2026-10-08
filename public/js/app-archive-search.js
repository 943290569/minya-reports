/* =========================================================
   V3.3 - البحث السريع في الأرشيف (صفحة الأرشيف فقط)
========================================================= */

let archiveSearchTimer = null;

function isArchiveSearchPage() {
  return (location.pathname.replace(/\/+$/, "") || "/") === "/archive";
}

function buildArchiveSummaryParams() {
  const dateValue = document.getElementById("archiveDateFilter")?.value || "";
  const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
  const searchValue = document.getElementById("archiveQuickSearch")?.value?.trim() || "";
  const params = new URLSearchParams({ page: "1", limit: "10" });

  if (searchValue) params.set("q", searchValue);

  if (dateValue) {
    params.set("from", dateValue);
    params.set("to", dateValue);
  } else if (monthValue) {
    const [year, month] = monthValue.split("-").map(Number);
    if (year && month >= 1 && month <= 12) {
      const normalizedMonth = `${year}-${String(month).padStart(2, "0")}`;
      const lastDay = new Date(year, month, 0).getDate();
      params.set("from", `${normalizedMonth}-01`);
      params.set("to", `${normalizedMonth}-${String(lastDay).padStart(2, "0")}`);
    }
  }

  return params;
}

async function syncArchiveSummaryCards() {
  if (isArchiveSearchPage() && typeof window.loadArchivePage === "function") return window.loadArchivePage(1);
}

function setupArchiveQuickSearch() {
  if (!isArchiveSearchPage()) return;

  const filters = document.querySelector(".archive-filters");
  if (!filters || document.getElementById("archiveQuickSearch")) return;

  const label = document.createElement("label");
  label.innerHTML = `
    بحث سريع
    <input
      id="archiveQuickSearch"
      type="search"
      placeholder="رقم التقرير أو كلمة من الملاحظات"
      autocomplete="off"
    >
  `;

  filters.insertBefore(label, filters.lastElementChild);

  const input = document.getElementById("archiveQuickSearch");
  input?.addEventListener("input", () => {
    clearTimeout(archiveSearchTimer);
    archiveSearchTimer = setTimeout(() => {
      if (typeof window.loadArchivePage === "function") window.loadArchivePage(1);

    }, 300);
  });

  document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
    if (input) input.value = "";
    clearTimeout(archiveSearchTimer);
    setTimeout(() => {
      if (typeof window.loadArchivePage === "function") window.loadArchivePage(1);

    }, 80);
  });
}

if (isArchiveSearchPage()) {
  setupArchiveQuickSearch();

  document.addEventListener("change", (event) => {
    if (["archiveDateFilter", "archiveMonthFilter"].includes(event.target?.id)) {
      // Pagination owns both the table and summary cards.
    }
  });

  document.getElementById("archiveBtn")?.addEventListener("click", () => {
    setTimeout(() => {
      setupArchiveQuickSearch();

    }, 200);
  });


}

window.setupArchiveQuickSearch = setupArchiveQuickSearch;
window.syncArchiveSummaryCards = syncArchiveSummaryCards;
