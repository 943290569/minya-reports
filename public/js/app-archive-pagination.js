/* =========================================================
   V3.3 - ترقيم صفحات جدول الأرشيف (صفحة الأرشيف فقط)
========================================================= */

let archivePage = 1;
let archivePages = 1;
const archivePageLimit = 50;

function isArchivePage() {
  return (location.pathname.replace(/\/+$/, "") || "/") === "/archive";
}

async function archiveDeleteReport(id) {
  if (!confirm("هل تريد حذف هذا التقرير نهائيًا؟")) return;
  try {
    let response = await fetch(`${API}/api/reports/${id}`, { method: "DELETE" });
    let data = await response.json().catch(() => ({}));

    if (response.status === 423) {
      const proceed = confirm("هذا التقرير معتمد أو مرسل للمراجعة. سيتم إعادته إلى مسودة ثم حذفه نهائيًا. هل تريد المتابعة؟");
      if (!proceed) return;
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
            <button class="archive-open" onclick="openReport(${report.id})">فتح</button>
            <button class="role-editor-action archive-edit" onclick="goToEditReport(${report.id})">تعديل</button>
            <button class="archive-print" onclick="printReport(${report.id})">طباعة</button>
            <button class="role-admin-action" onclick="archiveDeleteReport(${report.id})" style="background:#b91c1c">حذف</button>
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
window.archiveDeleteReport = archiveDeleteReport;
