/* =========================================================
   V3.3 - البحث السريع في الأرشيف (صفحة الأرشيف فقط)
========================================================= */

let archiveSearchTimer = null;

function isArchiveSearchPage() {
  return (location.pathname.replace(/\/+$/, "") || "/") === "/archive";
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
  document.getElementById("archiveBtn")?.addEventListener("click", () => {
    setTimeout(setupArchiveQuickSearch, 200);
  });
}

window.setupArchiveQuickSearch = setupArchiveQuickSearch;
