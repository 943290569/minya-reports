/* =========================================================
   واجهة الصلاحيات حسب الدور
========================================================= */
(function () {
  let role = null;
  let applying = false;

  async function resolveRole() {
    try {
      const response = await fetch("/api/auth/status", { cache: "no-store" });
      const data = await response.json();
      if (data?.authenticated && data.user?.role) {
        role = data.user.role;
        window.MINYA_USER = data.user;
      }
    } catch {}
    return role;
  }

  function hide(el) {
    if (!el) return;
    if (el.style.display !== "none") el.style.display = "none";
    if (el.getAttribute("aria-hidden") !== "true") el.setAttribute("aria-hidden", "true");
  }

  function disableEditorForm() {
    document.querySelectorAll("#reportFormSection input, #reportFormSection select, #reportFormSection textarea, #crewsTable input, #crewsTable select, #operationsTable input, #operationsTable select, #stationsTable input, #stationsTable select, #equipmentTable input, #equipmentTable select, #notes").forEach(el => {
      if (!el.disabled) el.disabled = true;
      el.title = "حساب قراءة فقط";
    });
    hide(document.getElementById("saveBtn")?.closest("section") || document.getElementById("saveBtn"));
    hide(document.getElementById("attachmentsControls"));
  }

  function applyArchivePermissions() {
    document.querySelectorAll("button").forEach(button => {
      const text = String(button.textContent || "").trim();
      const onclick = String(button.getAttribute("onclick") || "");
      if (role === "viewer" && (text === "تعديل" || text === "حذف" || /editReport|deleteReport/.test(onclick))) hide(button);
      if (role === "editor" && (text === "حذف" || /deleteReport/.test(onclick))) hide(button);
    });
  }

  function applyNavigationPermissions() {
    document.querySelectorAll('a[href="/admin"], a[href="/admin.html"]').forEach(link => {
      if (role !== "admin") hide(link);
    });

    if (role === "viewer") {
      document.querySelectorAll('a[href="/report"]').forEach(hide);
    }
  }

  function applyV3Permissions() {
    if (role === "viewer") {
      hide(document.getElementById("maintSave"));
      document.querySelectorAll("#v3Content input, #v3Content textarea, #v3Content select").forEach(el => {
        if (!el.closest(".v3-filter") && !el.closest(".v3-search-grid")) el.disabled = true;
      });
    }
    if (role !== "admin") {
      document.querySelectorAll("[data-admin-only], .admin-only").forEach(hide);
    }
  }

  function apply() {
    if (!role || applying) return;
    applying = true;
    try {
      document.documentElement.dataset.userRole = role;
      applyNavigationPermissions();
      applyArchivePermissions();
      applyV3Permissions();
      if (role === "viewer") disableEditorForm();
    } finally {
      applying = false;
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await resolveRole();

    if (role === "viewer" && (location.pathname.replace(/\/+$/, "") || "/") === "/report") {
      location.replace("/archive");
      return;
    }

    apply();

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        apply();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
