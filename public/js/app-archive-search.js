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
  if (!isArchiveSearchPage()) return;
  try {
    const response = await fetch(`${API}/api/archive?${buildArchiveSummaryParams()}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "فشل تحميل ملخص الأرشيف");

    const summary = data.summary || {};
    const setValue = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = typeof formatNumber === "function" ? formatNumber(value) : String(value ?? 0);
    };

    setValue("archiveReportsCount", Number(data.count || 0));
    setValue("archiveWasteTotal", Number(summary.total_waste_tons || 0));
    setValue("archiveTrucksTotal", Number(summary.total_trucks || 0));
    setValue("archiveDieselTotal", Number(summary.total_diesel || 0));
  } catch (error) {
    console.error("فشل تحديث بطاقات ملخص الأرشيف", error);
  }
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
      syncArchiveSummaryCards();
    }, 300);
  });

  document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
    if (input) input.value = "";
    clearTimeout(archiveSearchTimer);
    setTimeout(() => {
      if (typeof window.loadArchivePage === "function") window.loadArchivePage(1);
      syncArchiveSummaryCards();
    }, 80);
  });
}

if (isArchiveSearchPage()) {
  setupArchiveQuickSearch();

  document.addEventListener("change", (event) => {
    if (["archiveDateFilter", "archiveMonthFilter"].includes(event.target?.id)) {
      setTimeout(syncArchiveSummaryCards, 30);
    }
  });

  document.getElementById("archiveBtn")?.addEventListener("click", () => {
    setTimeout(() => {
      setupArchiveQuickSearch();
      syncArchiveSummaryCards();
    }, 200);
  });

  setTimeout(syncArchiveSummaryCards, 100);
}

window.setupArchiveQuickSearch = setupArchiveQuickSearch;
window.syncArchiveSummaryCards = syncArchiveSummaryCards;
