/* =========================================================
   واجهة الصلاحيات حسب الدور
========================================================= */
(function () {
  let role = null;

  async function resolveRole() {
    try {
      const response = await fetch("/api/auth/status");
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
    el.style.display = "none";
    el.setAttribute("aria-hidden", "true");
  }

  function disableEditorForm() {
    document.querySelectorAll("#reportFormSection input, #reportFormSection select, #reportFormSection textarea, #crewsTable input, #crewsTable select, #operationsTable input, #operationsTable select, #stationsTable input, #stationsTable select, #equipmentTable input, #equipmentTable select, #notes").forEach(el => {
      el.disabled = true;
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
      document.querySelectorAll('a[href="/report"]').forEach(link => {
        if (link.classList.contains("dashboard-card")) {
          link.querySelector("h3") && (link.querySelector("h3").textContent = "عرض التقرير اليومي");
          link.querySelector("p") && (link.querySelector("p").textContent = "عرض بيانات التقرير اليومي دون تعديل.");
        }
      });
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
    if (!role) return;
    document.documentElement.dataset.userRole = role;
    applyNavigationPermissions();
    applyArchivePermissions();
    applyV3Permissions();
    if (role === "viewer") disableEditorForm();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await resolveRole();
    apply();
    const observer = new MutationObserver(() => apply());
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
