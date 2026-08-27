/* =========================================================
   Admin audit log filters and review tools
========================================================= */
(function () {
  const pagePath = location.pathname.replace(/\/+$/, "") || "/";
  if (pagePath !== "/admin") return;

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  function actionLabel(action) {
    const labels = {
      LOGIN: "تسجيل دخول",
      LOGOUT: "تسجيل خروج",
      SETUP_ADMIN: "إنشاء مدير النظام",
      CREATE_USER: "إضافة مستخدم",
      UPDATE_USER: "تعديل مستخدم",
      CREATE_REPORT: "إنشاء تقرير",
      UPDATE_REPORT: "تعديل تقرير",
      DELETE_REPORT: "حذف تقرير",
      ADD_ATTACHMENT: "إضافة مرفق",
      DELETE_ATTACHMENT: "حذف مرفق",
      CREATE_MAINTENANCE: "إضافة صيانة",
      DELETE_MAINTENANCE: "حذف صيانة",
      DOWNLOAD_BACKUP: "تنزيل نسخة احتياطية",
      DOWNLOAD_SAVED_BACKUP: "تنزيل نسخة محفوظة",
      RESTORE_BACKUP: "استعادة نسخة احتياطية"
    };
    return labels[action] || action || "-";
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const raw = String(value).includes("T") ? String(value) : String(value).replace(" ", "T") + "Z";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function dateOnly(value) {
    if (!value) return "";
    return String(value).slice(0, 10);
  }

  async function fetchLogs() {
    const response = await fetch("/api/audit?limit=200");
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.message || "فشل تحميل سجل النشاط");
    return Array.isArray(data.logs) ? data.logs : [];
  }

  function initAuditReview() {
    const body = document.getElementById("auditBody");
    if (!body || document.getElementById("auditReviewTools")) return;

    const tableWrap = body.closest(".v3-table-wrap");
    const panel = tableWrap?.closest(".v3-panel");
    if (!tableWrap || !panel) return;

    const tools = document.createElement("div");
    tools.id = "auditReviewTools";
    tools.className = "audit-review-tools";
    tools.innerHTML = `
      <div class="audit-kpis">
        <div><span>العمليات المعروضة</span><strong id="auditShownCount">0</strong></div>
        <div><span>المستخدمون</span><strong id="auditUsersCount">0</strong></div>
        <div><span>عمليات التقارير</span><strong id="auditReportsCount">0</strong></div>
        <div><span>عمليات حساسة</span><strong id="auditSensitiveCount">0</strong></div>
      </div>
      <div class="audit-filter-grid">
        <label>المستخدم<select id="auditUserFilter"><option value="">الكل</option></select></label>
        <label>نوع العملية<select id="auditActionFilter"><option value="">الكل</option></select></label>
        <label>من<input id="auditFromFilter" type="date"></label>
        <label>إلى<input id="auditToFilter" type="date"></label>
        <label class="audit-search-field">بحث<input id="auditTextFilter" type="search" placeholder="المعرف، التفاصيل، النوع..."></label>
        <button id="auditRefreshBtn" type="button">تحديث السجل</button>
        <button id="auditClearBtn" type="button" class="secondary">مسح الفلاتر</button>
      </div>
      <div id="auditFilterStatus" class="audit-filter-status">جاري تحميل آخر 200 عملية...</div>
    `;
    tableWrap.before(tools);

    let logs = [];

    function populateFilters() {
      const users = [...new Set(logs.map(x => x.username).filter(Boolean))].sort();
      const actions = [...new Set(logs.map(x => x.action).filter(Boolean))].sort();
      auditUserFilter.innerHTML = `<option value="">الكل</option>${users.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("")}`;
      auditActionFilter.innerHTML = `<option value="">الكل</option>${actions.map(v => `<option value="${esc(v)}">${esc(actionLabel(v))}</option>`).join("")}`;
    }

    function render() {
      const user = auditUserFilter.value;
      const action = auditActionFilter.value;
      const from = auditFromFilter.value;
      const to = auditToFilter.value;
      const text = auditTextFilter.value.trim().toLowerCase();

      const filtered = logs.filter((row) => {
        const day = dateOnly(row.created_at);
        if (user && row.username !== user) return false;
        if (action && row.action !== action) return false;
        if (from && day < from) return false;
        if (to && day > to) return false;
        if (text) {
          const haystack = [row.username, row.action, row.entity_type, row.entity_id, row.details, actionLabel(row.action)].join(" ").toLowerCase();
          if (!haystack.includes(text)) return false;
        }
        return true;
      });

      const reportActions = filtered.filter(x => x.entity_type === "report" || /REPORT/.test(x.action || "")).length;
      const sensitiveActions = filtered.filter(x => /DELETE|RESTORE|UPDATE_USER|CREATE_USER|SETUP_ADMIN/.test(x.action || "")).length;
      const usersCount = new Set(filtered.map(x => x.username).filter(Boolean)).size;

      auditShownCount.textContent = filtered.length;
      auditUsersCount.textContent = usersCount;
      auditReportsCount.textContent = reportActions;
      auditSensitiveCount.textContent = sensitiveActions;
      auditFilterStatus.textContent = `عرض ${filtered.length} من أصل ${logs.length} عملية محفوظة ضمن آخر 200 سجل.`;

      body.innerHTML = filtered.length ? filtered.map((x) => `
        <tr class="audit-row ${/DELETE|RESTORE/.test(x.action || "") ? "sensitive" : ""}">
          <td>${esc(formatDateTime(x.created_at))}</td>
          <td>${esc(x.username || "system")}</td>
          <td><span class="audit-action-pill">${esc(actionLabel(x.action))}</span><small>${esc(x.action || "")}</small></td>
          <td>${esc(x.entity_type || "-")}</td>
          <td>${esc(x.entity_id || "-")}</td>
          <td class="audit-details-cell">${esc(x.details || "-")}</td>
        </tr>
      `).join("") : `<tr><td colspan="6">لا توجد عمليات مطابقة للفلاتر الحالية.</td></tr>`;
    }

    async function load() {
      auditRefreshBtn.disabled = true;
      auditFilterStatus.textContent = "جاري تحديث سجل النشاط...";
      try {
        logs = await fetchLogs();
        populateFilters();
        render();
      } catch (error) {
        auditFilterStatus.textContent = error.message || "تعذر تحميل السجل";
        body.innerHTML = `<tr><td colspan="6">${esc(error.message || "تعذر تحميل سجل النشاط")}</td></tr>`;
      } finally {
        auditRefreshBtn.disabled = false;
      }
    }

    [auditUserFilter, auditActionFilter, auditFromFilter, auditToFilter, auditTextFilter].forEach((element) => {
      element.addEventListener(element.tagName === "INPUT" && element.type === "search" ? "input" : "change", render);
    });

    auditRefreshBtn.addEventListener("click", load);
    auditClearBtn.addEventListener("click", () => {
      auditUserFilter.value = "";
      auditActionFilter.value = "";
      auditFromFilter.value = "";
      auditToFilter.value = "";
      auditTextFilter.value = "";
      render();
    });

    load();
  }

  function start() {
    setTimeout(initAuditReview, 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
