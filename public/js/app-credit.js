/* =========================================================
   اعتماد تصميم النظام + صفحة الصيانة والحوادث
========================================================= */

(function () {
  function addDesignCredit() {
    if (document.getElementById("landfillDesignCredit")) return;
    const footer = document.createElement("footer");
    footer.id = "landfillDesignCredit";
    footer.className = "landfill-design-credit";
    footer.innerHTML = `<span>تصميم قسم المكب</span><strong>المهندس محمد جبرين</strong>`;
    document.body.appendChild(footer);
    if (!document.getElementById("landfillDesignCreditStyle")) {
      const style = document.createElement("style");
      style.id = "landfillDesignCreditStyle";
      style.textContent = `.landfill-design-credit{width:min(94%,1480px);margin:26px auto 18px;padding:14px 18px;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;color:#667085;border-top:1px solid #dfe6ee;font-size:12px;text-align:center}.landfill-design-credit span::after{content:" — ";color:#98a2b3}.landfill-design-credit strong{color:#176b4f;font-size:13px;font-weight:900}@media(max-width:560px){.landfill-design-credit{flex-direction:column;gap:3px;margin-top:20px}.landfill-design-credit span::after{content:""}}@media print{.landfill-design-credit{display:none!important}}`;
      document.head.appendChild(style);
    }
  }

  async function renderIncidentsPage() {
    const route = location.pathname.replace(/\/+$/, "") || "/";
    if (route !== "/maintenance-incidents") return;
    const main = document.querySelector("main.container");
    if (!main) return;
    const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const api = async (url, options) => { const r = await fetch(url, options); const d = await r.json().catch(() => ({})); if (!r.ok || d.ok === false) throw new Error(d.message || "فشل الطلب"); return d; };
    const auth = await api("/api/auth/status").catch(() => ({}));
    const editable = ["admin", "editor"].includes(auth.user?.role);
    main.innerHTML = `<section class="v3-page"><div class="v3-hero"><div><span>MAINTENANCE & INCIDENTS</span><h2>الصيانة والحوادث</h2><p>متابعة الأعطال والحوادث والإجراءات والتكاليف وحالة الإغلاق.</p></div></div><div id="incidentPage"><div id="incidentEditor" class="v3-panel"><h3>إضافة سجل</h3><div class="v3-form-grid"><label>التاريخ<input id="incDate" type="date"></label><label>المركبة أو المعدة<input id="incAsset"></label><label>النوع<select id="incType"><option>حادث</option><option>عطل</option><option>صيانة</option><option>إصلاح</option></select></label><label>الحالة<select id="incStatus"><option>مفتوحة</option><option>تحت المعالجة</option><option>مغلقة</option></select></label><label>مسؤول المتابعة<input id="incOwner"></label><label>التكلفة<input id="incCost" type="number" step="0.01"></label></div><label>الوصف<textarea id="incDesc" rows="3"></textarea></label><label>الإجراء المتخذ<textarea id="incAction" rows="2"></textarea></label><button id="incSave" class="v3-primary">حفظ السجل</button><span id="incMsg"></span></div><div class="v3-panel"><div class="v3-filter"><input id="incSearch" placeholder="بحث"><select id="incFilter"><option value="">كل الحالات</option><option>مفتوحة</option><option>تحت المعالجة</option><option>مغلقة</option></select><button id="incLoad">تحديث</button></div><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>المركبة/المعدة</th><th>النوع</th><th>الحالة</th><th>الوصف</th><th>الإجراء</th><th>التكلفة</th></tr></thead><tbody id="incBody"></tbody></table></div></div></div></section>`;
    if (!editable) document.getElementById("incidentEditor").classList.add("hidden");
    const el = id => document.getElementById(id);
    el("incDate").value = new Date().toISOString().slice(0,10);
    async function load() {
      const d = await api(`/api/incidents?q=${encodeURIComponent(el("incSearch").value)}&status=${encodeURIComponent(el("incFilter").value)}`);
      el("incBody").innerHTML = d.incidents.length ? d.incidents.map(x => `<tr><td>${esc(x.incident_date)}</td><td>${esc(x.asset_name)}</td><td>${esc(x.incident_type)}</td><td>${esc(x.followup_status)}</td><td>${esc(x.description)}</td><td>${esc(x.action_taken || "-")}</td><td>${Number(x.cost || 0).toLocaleString("en-US")}</td></tr>`).join("") : `<tr><td colspan="7">لا توجد سجلات</td></tr>`;
    }
    el("incSave").onclick = async () => { try { await api("/api/incidents", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({asset_name:el("incAsset").value,incident_date:el("incDate").value,incident_type:el("incType").value,followup_status:el("incStatus").value,description:el("incDesc").value,action_taken:el("incAction").value,followup_owner:el("incOwner").value,cost:el("incCost").value}) }); el("incMsg").textContent = "تم الحفظ"; el("incDesc").value = ""; el("incAction").value = ""; load(); } catch(e) { el("incMsg").textContent = e.message; } };
    el("incLoad").onclick = load;
    load();
  }

  const run = () => { addDesignCredit(); renderIncidentsPage(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
