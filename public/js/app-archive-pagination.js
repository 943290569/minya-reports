/* =========================================================
   V3.3 - ترقيم صفحات جدول الأرشيف (صفحة الأرشيف فقط)
========================================================= */

let archivePage = 1;
let archivePages = 1;
const archivePageLimit = 50;
const archiveSelectedReports = new Set();

function updateArchiveSelectionUI() {
  const checkboxes = Array.from(document.querySelectorAll(".archive-select-report"));
  archiveSelectedReports.clear();
  checkboxes.filter(box => box.checked).forEach(box => archiveSelectedReports.add(Number(box.value)));
  const selectAll = document.getElementById("archiveSelectAll");
  if (selectAll) {
    selectAll.checked = checkboxes.length > 0 && checkboxes.every(box => box.checked);
    selectAll.indeterminate = checkboxes.some(box => box.checked) && !selectAll.checked;
  }
  const count = document.getElementById("archiveSelectedCount");
  if (count) count.textContent = `${archiveSelectedReports.size} محدد`;
  const deleteButton = document.getElementById("archiveBulkDelete");
  if (deleteButton) deleteButton.disabled = archiveSelectedReports.size === 0;
}

function archiveSelectAllReports() {
  document.querySelectorAll(".archive-select-report").forEach(box => { box.checked = true; });
  updateArchiveSelectionUI();
}

function archiveClearSelectedReports() {
  document.querySelectorAll(".archive-select-report").forEach(box => { box.checked = false; });
  updateArchiveSelectionUI();
}

function archiveToggleSelectAll(checked) {
  document.querySelectorAll(".archive-select-report").forEach(box => { box.checked = Boolean(checked); });
  updateArchiveSelectionUI();
}

async function archiveBulkDeleteSelected() {
  updateArchiveSelectionUI();
  const ids = Array.from(archiveSelectedReports);
  if (!ids.length) return;
  if (!confirm(`سيتم حذف ${ids.length} تقرير نهائيًا. هل تريد المتابعة؟`)) return;
  const button = document.getElementById("archiveBulkDelete");
  if (button) button.disabled = true;
  try {
    const response = await fetch(`${API}/api/reports/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.message || "فشل حذف التقارير المحددة");
    archiveSelectedReports.clear();
    if (typeof showMessage === "function") showMessage(data.message || `تم حذف ${ids.length} تقرير`);
    await loadArchivePage(archivePage);
  } catch (error) {
    console.error(error);
    if (typeof showMessage === "function") showMessage(error.message || "فشل حذف التقارير المحددة");
    else alert(error.message || "فشل حذف التقارير المحددة");
    updateArchiveSelectionUI();
  }
}

function isArchivePage() {
  return (location.pathname.replace(/\/+$/, "") || "/") === "/archive";
}

async function archiveDeleteReport(id) {
  if (!confirm("هل تريد حذف هذا التقرير نهائيًا؟")) return;
  try {
    let response = await fetch(`${API}/api/reports/${id}`, { method: "DELETE" });
    let data = await response.json().catch(() => ({}));

    if (response.status === 423) {
      const reopen = await fetch(`${API}/api/reports/${id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "حذف من الأرشيف بواسطة المدير" })
      });
      const reopenData = await reopen.json().catch(() => ({}));
      if (!reopen.ok || !reopenData.ok) throw new Error(reopenData.message || "تعذر إعادة فتح التقرير للحذف");
      response = await fetch(`${API}/api/reports/${id}`, { method: "DELETE" });
      data = await response.json().catch(() => ({}));
    }

    if (!response.ok || !data.ok) throw new Error(data.message || "فشل حذف التقرير");
    if (typeof showMessage === "function") showMessage("تم حذف التقرير بنجاح");
    await loadArchivePage(archivePage);
  } catch (error) {
    console.error(error);
    if (typeof showMessage === "function") showMessage(error.message || "حدث خطأ أثناء حذف التقرير");
    else alert(error.message || "حدث خطأ أثناء حذف التقرير");
  }
}

function setupArchivePagination() {
  if (!isArchivePage()) return;

  const table = document.getElementById("archiveTable");
  if (!table || document.getElementById("archivePagination")) return;

  const headerRow = table.querySelector("thead tr");
  if (headerRow && !headerRow.querySelector(".archive-select-column")) {
    const header = document.createElement("th");
    header.className = "archive-select-column";
    header.innerHTML = '<input id="archiveSelectAll" type="checkbox" aria-label="تحديد كل التقارير الظاهرة">';
    headerRow.insertBefore(header, headerRow.firstChild);
  }

  const toolbar = document.createElement("div");
  toolbar.id = "archiveBulkActions";
  toolbar.style.cssText = "display:flex;align-items:center;gap:10px;margin:12px 0;flex-wrap:wrap;";
  toolbar.innerHTML = `
    <button type="button" id="archiveSelectAllButton">تحديد الكل</button>
    <button type="button" id="archiveClearSelectionButton">إلغاء التحديد</button>
    <strong id="archiveSelectedCount">0 محدد</strong>
    <button type="button" id="archiveBulkDelete" class="role-admin-action" style="background:#b91c1c" disabled>حذف المحدد</button>
  `;
  table.insertAdjacentElement("beforebegin", toolbar);

  if (!document.getElementById("archiveTableScroll")) {
    const tableScroll = document.createElement("div");
    tableScroll.id = "archiveTableScroll";
    tableScroll.setAttribute("role", "region");
    tableScroll.setAttribute("aria-label", "جدول أرشيف التقارير");
    tableScroll.tabIndex = 0;
    table.parentNode.insertBefore(tableScroll, table);
    tableScroll.appendChild(table);
  }

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

    tbody.innerHTML = `<tr><td colspan="7">جاري تحميل الأرشيف...</td></tr>`;

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
          <td class="archive-select-column"><input class="archive-select-report" type="checkbox" value="${report.id}" aria-label="تحديد التقرير ${escapeHtml(report.report_no)}"></td>
          <td>${escapeHtml(report.report_no)}</td>
          <td>${formatDate(report.report_date)}</td>
          <td>${formatNumber(report.total_waste_tons)}</td>
          <td>${formatNumber(report.total_trucks)}</td>
          <td>${formatNumber(report.total_diesel)}</td>
          <td>
            <button class="archive-open" onclick="openReport(${report.id})">فتح</button>
            <button class="role-editor-action archive-edit" onclick="goToEditReport(${report.id})">تعديل</button>
            <button class="archive-print" onclick="printReport(${report.id})">طباعة</button>
            <button class="role-admin-action" onclick="archiveDeleteReport(${report.id})" style="background:#b91c1c">حذف</button>
          </td>
        </tr>
      `).join("")
      : `<tr><td colspan="7">لا توجد تقارير مطابقة</td></tr>`;

    const info = document.getElementById("archivePageInfo");
    if (info) info.textContent = `صفحة ${archivePage} من ${archivePages} — ${data.count} تقرير`;

    const prev = document.getElementById("archivePrevPage");
    const next = document.getElementById("archiveNextPage");
    if (prev) prev.disabled = archivePage <= 1;
    if (next) next.disabled = archivePage >= archivePages;

    archiveSelectedReports.clear();
    updateArchiveSelectionUI();
    if (typeof window.applyRoleAwareUI === "function") window.applyRoleAwareUI();
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="7">تعذر تحميل الأرشيف</td></tr>`;
  }
}

/* Imported source reports: show unavailable values as '-' in the official daily report. */
(function installUnavailableDash(){
  if (typeof buildFullReportHtml !== "function" || window.__MINYA_DASH_PRINT__) return;
  window.__MINYA_DASH_PRINT__ = true;
  const original = buildFullReportHtml;
  buildFullReportHtml = function(data, autoPrint = false) {
    let html = original(data, autoPrint);
    html = html.replaceAll('<td>غير محدد</td><td>حالة الآلية غير متوفرة في ملفات المصدر</td><td>0</td>', '<td>-</td><td>-</td><td>-</td>');
    html = html.replaceAll('<td>0</td><td>التفصيل غير متوفر في ملفات المصدر</td>', '<td>-</td><td>-</td>');
    html = html.replace(/<tr><td>خط الفرز<\/td><td>0<\/td><td>0<\/td><td>طن<\/td><\/tr>/g, '<tr><td>خط الفرز</td><td>-</td><td>-</td><td>طن</td></tr>');
    html = html.replace(/<tr><td>\( طمم\) خارجي<\/td><td>0<\/td><td>0<\/td><td>طن<\/td><\/tr>/g, '<tr><td>( طمم) خارجي</td><td>-</td><td>-</td><td>طن</td></tr>');
    return html;
  };
})();

if (isArchivePage()) {
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target?.matches?.(".archive-select-report")) updateArchiveSelectionUI();
    if (target?.id === "archiveSelectAll") archiveToggleSelectAll(target.checked);
  });

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;
    if (button.id === "archiveSelectAllButton") archiveSelectAllReports();
    if (button.id === "archiveClearSelectionButton") archiveClearSelectedReports();
    if (button.id === "archiveBulkDelete") archiveBulkDeleteSelected();
  });

  setupArchivePagination();
  setTimeout(() => loadArchivePage(1), 0);

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
window.archiveDeleteReport = archiveDeleteReport;
window.updateArchiveSelectionUI = updateArchiveSelectionUI;
