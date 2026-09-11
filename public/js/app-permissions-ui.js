/* =========================================================
   واجهة الصلاحيات حسب الدور والأقسام
========================================================= */
(function () {
  let role = null;
  let applying = false;
  let featurePermissions = null;

  async function resolveRole() {
    try {
      const response = await fetch("/api/auth/status", { cache: "no-store" });
      const data = await response.json();
      if (data?.authenticated && data.user?.role) {
        role = data.user.role;
        window.MINYA_USER = data.user;
      }
    } catch {}
    try {
      const response = await fetch("/api/feature-permissions/me", { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data?.ok) featurePermissions = data.permissions || null;
    } catch {}
    return role;
  }

  function hide(el) { if (!el) return; if (el.style.display !== "none") el.style.display = "none"; if (el.getAttribute("aria-hidden") !== "true") el.setAttribute("aria-hidden", "true"); }
  function disableEditorForm() {
    document.querySelectorAll("#reportFormSection input, #reportFormSection select, #reportFormSection textarea, #crewsTable input, #crewsTable select, #operationsTable input, #operationsTable select, #stationsTable input, #stationsTable select, #equipmentTable input, #equipmentTable select, #notes").forEach(el => { if (!el.disabled) el.disabled = true; el.title = "حساب قراءة فقط"; });
    hide(document.getElementById("saveBtn")?.closest("section") || document.getElementById("saveBtn"));
    hide(document.getElementById("attachmentsControls"));
  }
  function applyArchivePermissions() {
    document.querySelectorAll("button").forEach(button => { const text = String(button.textContent || "").trim(); const onclick = String(button.getAttribute("onclick") || ""); if (role === "viewer" && (text === "تعديل" || text === "حذف" || /editReport|deleteReport/.test(onclick))) hide(button); if (role === "editor" && (text === "حذف" || /deleteReport/.test(onclick))) hide(button); });
  }
  function applyNavigationPermissions() {
    const adminOnlyHrefs = ["/admin","/admin.html","/system.html","/drive-import.html","/reviews"];
    adminOnlyHrefs.forEach(href => document.querySelectorAll(`a[href="${href}"]`).forEach(link => { if (role !== "admin") hide(link); }));
    if (role === "viewer") document.querySelectorAll('a[href="/report"]').forEach(hide);
    const featureLinks = { fleet:"/fleet", incidents:"/maintenance-incidents", environment:"/environment", global_search:"/global-search" };
    if (featurePermissions) Object.entries(featureLinks).forEach(([feature,href]) => { if (!featurePermissions[feature]?.can_view) document.querySelectorAll(`a[href="${href}"]`).forEach(hide); });
  }
  function applyV3Permissions() {
    if (role === "viewer") { hide(document.getElementById("maintSave")); document.querySelectorAll("#v3Content input, #v3Content textarea, #v3Content select").forEach(el => { if (!el.closest(".v3-filter") && !el.closest(".v3-search-grid")) el.disabled = true; }); }
    if (role !== "admin") document.querySelectorAll("[data-admin-only], .admin-only").forEach(hide);
  }
  function apply() { if (!role || applying) return; applying = true; try { document.documentElement.dataset.userRole = role; applyNavigationPermissions(); applyArchivePermissions(); applyV3Permissions(); if (role === "viewer") disableEditorForm(); } finally { applying = false; } }

  async function buildFeaturePermissionManager() {
    if (role !== "admin" || (location.pathname.replace(/\/+$/, "") || "/") !== "/admin") return;
    if (document.getElementById("featurePermissionManager")) return;
    const host = document.getElementById("v3Content"); if (!host) return;
    try {
      const response = await fetch("/api/feature-permissions", { cache:"no-store" });
      const data = await response.json(); if (!response.ok || !data.ok) return;
      const labels = { fleet:"المركبات والسائقون", incidents:"الصيانة والحوادث", environment:"العصارة والغطاء", global_search:"البحث الشامل", backups:"النسخ الاحتياطي" };
      const section = document.createElement("section"); section.id = "featurePermissionManager"; section.className = "v3-panel";
      section.innerHTML = `<h3>صلاحيات الأقسام</h3><p>تحديد من يستطيع مشاهدة أو تعديل كل قسم. صلاحيات المدير كاملة دائمًا.</p><label>المستخدم<select id="featurePermissionUser"><option value="">اختر مستخدمًا</option>${data.users.filter(u=>u.role!=="admin").map(u=>`<option value="${u.id}">${u.display_name} (${u.username})</option>`).join("")}</select></label><div id="featurePermissionRows"></div><button id="featurePermissionSave" class="v3-primary" type="button">حفظ الصلاحيات</button><span id="featurePermissionMsg"></span>`;
      host.appendChild(section);
      const select = section.querySelector("#featurePermissionUser"), rows = section.querySelector("#featurePermissionRows"), msg = section.querySelector("#featurePermissionMsg");
      function renderRows() {
        const uid = Number(select.value); if (!uid) { rows.innerHTML = ""; return; }
        const user = data.users.find(u=>Number(u.id)===uid); rows.innerHTML = data.features.map(feature => { const saved = data.rows.find(r=>Number(r.user_id)===uid && r.feature===feature); const view = saved ? Number(saved.can_view)===1 : true; const edit = saved ? Number(saved.can_edit)===1 : user?.role === "editor"; return `<div class="feature-permission-row" data-feature="${feature}" style="display:grid;grid-template-columns:minmax(160px,1fr) auto auto;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid #e5e7eb"><strong>${labels[feature]||feature}</strong><label><input type="checkbox" data-view ${view?'checked':''}> مشاهدة</label><label><input type="checkbox" data-edit ${edit?'checked':''}> تعديل</label></div>`; }).join("");
      }
      select.onchange = renderRows;
      section.querySelector("#featurePermissionSave").onclick = async () => { const uid = Number(select.value); if (!uid) { msg.textContent = "اختر مستخدمًا"; return; } const permissions = [...rows.querySelectorAll("[data-feature]")].map(r=>({feature:r.dataset.feature,can_view:r.querySelector("[data-view]").checked,can_edit:r.querySelector("[data-edit]").checked})); const res = await fetch(`/api/feature-permissions/${uid}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({permissions}) }); const out = await res.json().catch(()=>({})); msg.textContent = res.ok ? "تم حفظ الصلاحيات" : (out.message || "تعذر الحفظ"); };
    } catch {}
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await resolveRole();
    if (role === "viewer" && (location.pathname.replace(/\/+$/, "") || "/") === "/report") { location.replace("/archive"); return; }
    apply(); setTimeout(buildFeaturePermissionManager, 300);
    let scheduled = false;
    const observer = new MutationObserver(() => { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; apply(); }); });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
