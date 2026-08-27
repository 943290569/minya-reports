/* =========================================================
   سير اعتماد التقرير: مسودة -> مراجعة -> معتمد
========================================================= */
(function () {
  const pathName = location.pathname.replace(/\/+$/, "") || "/";
  let workflowReportId = null;

  const statusInfo = {
    draft: { label: "مسودة", className: "draft" },
    pending: { label: "مرسل للمراجعة", className: "pending" },
    approved: { label: "معتمد", className: "approved" },
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function formatDateTime(value) {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString("ar-EG", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return String(value);
    }
  }

  async function api(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || "فشل تنفيذ الطلب");
    return data;
  }

  function getCurrentReportId() {
    const queryId = Number(new URLSearchParams(location.search).get("edit") || 0);
    if (queryId) return queryId;
    try {
      if (typeof editingId !== "undefined" && editingId) return Number(editingId);
    } catch {}
    return 0;
  }

  function applyReportLock(status) {
    const main = document.querySelector("main.container");
    if (!main) return;
    const locked = status !== "draft";
    main.classList.toggle("workflow-locked", locked);

    const save = document.getElementById("saveBtn");
    if (save) {
      save.disabled = locked;
      if (locked) save.dataset.workflowLocked = "1";
      else delete save.dataset.workflowLocked;
    }

    ["attachmentFile", "attachmentUploadBtn"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.disabled = locked;
    });
  }

  function buildWorkflowPanel(report) {
    let panel = document.getElementById("reportWorkflowPanel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "reportWorkflowPanel";
      panel.className = "report-workflow-panel no-print";
      const main = document.querySelector("main.container");
      const banner = document.getElementById("reportEditBanner");
      const firstPanel = main?.querySelector("section.panel");
      if (main && banner) banner.after(panel);
      else if (main && firstPanel) main.insertBefore(panel, firstPanel);
      else main?.prepend(panel);
    }

    const status = report.workflow_status || "draft";
    const info = statusInfo[status] || statusInfo.draft;
    const role = window.MINYA_USER?.role || "viewer";
    const canSubmit = status === "draft" && (role === "admin" || role === "editor");
    const canApprove = status === "pending" && role === "admin";
    const canReopen = status !== "draft" && role === "admin";

    let detail = "التقرير قابل للتعديل والحفظ.";
    if (status === "pending") detail = "التقرير مقفل حاليًا بانتظار مراجعة المدير واعتماده.";
    if (status === "approved") detail = `تم اعتماد التقرير${report.approved_by_name ? ` بواسطة ${escapeHtml(report.approved_by_name)}` : ""}${report.approved_at ? ` بتاريخ ${formatDateTime(report.approved_at)}` : ""}.`;

    panel.innerHTML = `
      <div class="workflow-summary">
        <div>
          <span class="workflow-kicker">حالة التقرير</span>
          <div class="workflow-status-line">
            <strong>${escapeHtml(report.report_no || "تقرير محفوظ")}</strong>
            <span class="workflow-badge ${info.className}">${info.label}</span>
          </div>
          <small>${detail}</small>
        </div>
        <div class="workflow-actions">
          ${canSubmit ? `<button type="button" data-workflow-action="submit" class="workflow-primary">إرسال للمراجعة</button>` : ""}
          ${canApprove ? `<button type="button" data-workflow-action="approve" class="workflow-approve">اعتماد التقرير</button>` : ""}
          ${canReopen ? `<button type="button" data-workflow-action="reopen" class="workflow-secondary">إعادة فتح كمسودة</button>` : ""}
        </div>
      </div>
      <div class="workflow-steps">
        <div class="${status === "draft" ? "active" : "done"}"><i>1</i><span>مسودة</span></div>
        <b></b>
        <div class="${status === "pending" ? "active" : status === "approved" ? "done" : ""}"><i>2</i><span>مراجعة</span></div>
        <b></b>
        <div class="${status === "approved" ? "active done" : ""}"><i>3</i><span>معتمد</span></div>
      </div>
    `;

    panel.querySelectorAll("[data-workflow-action]").forEach((button) => {
      button.addEventListener("click", () => runWorkflowAction(button.dataset.workflowAction, report));
    });

    applyReportLock(status);
  }

  async function runWorkflowAction(action, report) {
    const messages = {
      submit: "إرسال التقرير للمراجعة؟ بعد الإرسال سيتوقف التعديل حتى يعيد المدير فتحه.",
      approve: "اعتماد هذا التقرير نهائيًا؟ سيصبح مقفلًا بعد الاعتماد.",
      reopen: "إعادة فتح التقرير كمسودة؟ سيتم إلغاء حالة المراجعة/الاعتماد الحالية.",
    };
    if (!confirm(messages[action] || "متابعة؟")) return;

    try {
      const data = await api(`/api/reports/${report.id}/${action}`, { method: "POST" });
      if (typeof showMessage === "function") showMessage(data.message || "تم تحديث حالة التقرير");
      setTimeout(() => location.reload(), 250);
    } catch (error) {
      if (typeof showMessage === "function") showMessage(error.message);
      else alert(error.message);
    }
  }

  async function refreshReportWorkflow(force = false) {
    if (pathName !== "/report") return;
    const id = getCurrentReportId();
    if (!id) return;
    if (!force && workflowReportId === id && document.getElementById("reportWorkflowPanel")) return;

    try {
      const data = await api(`/api/reports/${id}`);
      workflowReportId = id;
      buildWorkflowPanel(data.report || data);
    } catch (error) {
      console.error("Report workflow load failed", error);
    }
  }

  async function decorateArchiveStatuses() {
    if (pathName !== "/archive") return;
    try {
      const data = await api("/api/reports");
      const reports = Array.isArray(data.reports) ? data.reports : [];
      const byNumber = new Map(reports.map((r) => [String(r.report_no || ""), r]));

      const decorate = () => {
        const tbody = document.querySelector("#archiveTable tbody");
        if (!tbody) return;
        Array.from(tbody.rows).forEach((row) => {
          const firstCell = row.cells?.[0];
          if (!firstCell || firstCell.querySelector(".archive-workflow-badge")) return;
          const number = String(firstCell.textContent || "").trim();
          const report = byNumber.get(number);
          if (!report) return;
          const info = statusInfo[report.workflow_status || "draft"] || statusInfo.draft;
          const badge = document.createElement("span");
          badge.className = `archive-workflow-badge ${info.className}`;
          badge.textContent = info.label;
          firstCell.appendChild(badge);
        });
      };

      decorate();
      const observer = new MutationObserver(decorate);
      const body = document.querySelector("#archiveTable tbody");
      if (body) observer.observe(body, { childList: true, subtree: true });
      setTimeout(decorate, 500);
      setTimeout(decorate, 1500);
    } catch (error) {
      console.error("Archive workflow status failed", error);
    }
  }

  function init() {
    if (pathName === "/report") {
      setTimeout(() => refreshReportWorkflow(true), 250);
      const timer = setInterval(() => refreshReportWorkflow(false), 700);
      setTimeout(() => clearInterval(timer), 30000);
    } else if (pathName === "/archive") {
      setTimeout(decorateArchiveStatuses, 450);
    }
  }

  window.refreshReportWorkflow = refreshReportWorkflow;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
