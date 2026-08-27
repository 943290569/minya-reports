(function () {
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
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(value);
    }
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  async function loadIntegrityDiagnostics() {
    const state = document.getElementById("integrityState");
    const list = document.getElementById("integrityIssues");
    if (!state || !list) return;

    state.className = "integrity-state loading";
    state.textContent = "جاري الفحص...";
    list.innerHTML = `<div class="integrity-empty">جاري فحص قاعدة البيانات والمرفقات والنسخ الاحتياطية...</div>`;

    try {
      const response = await fetch("/api/system/integrity");
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "فشل فحص سلامة البيانات");

      const level = data.level || "ok";
      state.className = `integrity-state ${level}`;
      state.textContent = level === "danger" ? "يوجد خلل يحتاج مراجعة" : level === "warning" ? "توجد ملاحظات للمراجعة" : "البيانات سليمة";

      setText("integritySqlite", data.sqlite_integrity === "ok" ? "سليم" : String(data.sqlite_integrity || "غير معروف"));
      setText("integrityMissingFiles", Number(data.missing_attachments?.length || 0));
      setText("integrityOrphanFiles", Number(data.orphan_files?.length || 0));
      setText("integrityNoOperations", Number(data.reports_without_operations?.length || 0));
      setText("integrityNoEquipment", Number(data.reports_without_equipment?.length || 0));
      setText("integrityExpiredSessions", Number(data.expired_sessions || 0));
      setText("integrityLastBackup", data.latest_backup ? formatDateTime(data.latest_backup.created_at) : "لا توجد نسخة");
      setText("integrityCheckedAt", formatDateTime(data.checked_at));

      const issues = Array.isArray(data.issues) ? data.issues : [];
      if (!issues.length) {
        list.innerHTML = `<div class="integrity-empty ok">لم يتم اكتشاف مشاكل في سلامة البيانات.</div>`;
        return;
      }

      list.innerHTML = issues.map((issue) => `
        <div class="integrity-issue ${escapeHtml(issue.level || "warning")}">
          <div><strong>${escapeHtml(issue.title || "ملاحظة")}</strong><small>${escapeHtml(issue.code || "")}</small></div>
          <span>${Number(issue.count || 0)}</span>
        </div>
      `).join("");
    } catch (error) {
      console.error("فشل فحص سلامة البيانات", error);
      state.className = "integrity-state danger";
      state.textContent = "تعذر إكمال الفحص";
      list.innerHTML = `<div class="integrity-empty danger">${escapeHtml(error.message || "فشل الاتصال بالخادم")}</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("runIntegrityBtn")?.addEventListener("click", loadIntegrityDiagnostics);
    loadIntegrityDiagnostics();
  });
})();
