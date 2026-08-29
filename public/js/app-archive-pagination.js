/* =========================================================
   V3.3 - ترقيم صفحات جدول الأرشيف (صفحة الأرشيف فقط)
========================================================= */

let archivePage = 1;
let archivePages = 1;
const archivePageLimit = 50;

function isArchivePage() {
  return (location.pathname.replace(/\/+$/, "") || "/") === "/archive";
}

function setupArchivePagination() {
  if (!isArchivePage()) return;

  const table = document.getElementById("archiveTable");
  if (!table || document.getElementById("archivePagination")) return;

  const box = document.createElement("div");
  box.id = "archivePagination";
  box.style.cssText =
    "display:flex;justify-content:center;align-items:center;gap:12px;" +
    "margin:16px 0;flex-wrap:wrap;";

  box.innerHTML = `
    <button type="button" id="archivePrevPage">السابق</button>
    <strong id="archivePageInfo">صفحة 1 من 1</strong>
    <button type="button" id="archiveNextPage">التالي</button>
  `;

  table.insertAdjacentElement("afterend", box);

  document.getElementById("archivePrevPage").onclick = () => {
    if (archivePage > 1) loadArchivePage(archivePage - 1);
  };

  document.getElementById("archiveNextPage").onclick = () => {
    if (archivePage < archivePages) loadArchivePage(archivePage + 1);
  };
}

async function loadArchivePage(page = 1) {
  if (!isArchivePage()) return;

  const tbody = document.querySelector("#archiveTable tbody");
  if (!tbody) return;

  try {
    const dateValue = document.getElementById("archiveDateFilter")?.value || "";
    const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
    const searchValue = document.getElementById("archiveQuickSearch")?.value?.trim() || "";

    const params = new URLSearchParams({
      page: String(page),
      limit: String(archivePageLimit)
    });

    if (searchValue) params.set("q", searchValue);

    if (dateValue) {
      params.set("from", dateValue);
      params.set("to", dateValue);
    } else if (monthValue) {
      const [year, month] = monthValue.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      params.set("from", `${monthValue}-01`);
      params.set("to", `${monthValue}-${String(lastDay).padStart(2, "0")}`);
    }

    tbody.innerHTML = `<tr><td colspan="6">جاري تحميل الأرشيف...</td></tr>`;

    const response = await fetch(`${API}/api/archive?${params}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "فشل تحميل صفحة الأرشيف");
    }

    archivePage = Number(data.page || 1);
    archivePages = Number(data.pages || 1);
    const reports = data.reports || [];

    tbody.innerHTML = reports.length
      ? reports.map((report) => `
        <tr>
          <td>${escapeHtml(report.report_no)}</td>
          <td>${formatDate(report.report_date)}</td>
          <td>${formatNumber(report.total_waste_tons)}</td>
          <td>${formatNumber(report.total_trucks)}</td>
          <td>${formatNumber(report.total_diesel)}</td>
          <td>
            <button onclick="openReport(${report.id})">فتح</button>
            <button class="role-editor-action" onclick="goToEditReport(${report.id})">تعديل</button>
            <button onclick="printReport(${report.id})">طباعة</button>
            <button class="role-admin-action" onclick="deleteReport(${report.id})" style="background:#b91c1c">حذف</button>
          </td>
        </tr>
      `).join("")
      : `<tr><td colspan="6">لا توجد تقارير مطابقة</td></tr>`;

    const info = document.getElementById("archivePageInfo");
    if (info) info.textContent = `صفحة ${archivePage} من ${archivePages} — ${data.count} تقرير`;

    const prev = document.getElementById("archivePrevPage");
    const next = document.getElementById("archiveNextPage");
    if (prev) prev.disabled = archivePage <= 1;
    if (next) next.disabled = archivePage >= archivePages;

    if (typeof window.applyRoleAwareUI === "function") window.applyRoleAwareUI();
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">تعذر تحميل الأرشيف</td></tr>`;
  }
}

if (isArchivePage()) {
  setupArchivePagination();

  document.getElementById("archiveBtn")?.addEventListener("click", () => {
    setTimeout(() => loadArchivePage(1), 300);
  });

  document.getElementById("archiveDateFilter")?.addEventListener("change", () => loadArchivePage(1));
  document.getElementById("archiveMonthFilter")?.addEventListener("change", () => loadArchivePage(1));
  document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
    setTimeout(() => loadArchivePage(1), 80);
  });
}

window.loadArchivePage = loadArchivePage;
