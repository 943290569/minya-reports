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
    const initial = await api("/api/incidents").catch(() => ({ incidents: [], permission: {} }));
    const editable = Boolean(initial.permission?.can_edit);
    main.innerHTML = `<section class="v3-page"><div class="v3-hero"><div><span>MAINTENANCE & INCIDENTS</span><h2>الصيانة والحوادث</h2><p>متابعة الأعطال والحوادث والإجراءات والتكاليف والصور والمرفقات وحالة الإغلاق.</p></div></div><div id="incidentPage"><div id="incidentEditor" class="v3-panel"><h3>إضافة سجل</h3><div class="v3-form-grid"><label>التاريخ<input id="incDate" type="date"></label><label>المركبة أو المعدة<input id="incAsset"></label><label>النوع<select id="incType"><option>حادث</option><option>عطل</option><option>صيانة</option><option>إصلاح</option></select></label><label>الحالة<select id="incStatus"><option>مفتوحة</option><option>تحت المعالجة</option><option>مغلقة</option></select></label><label>مسؤول المتابعة<input id="incOwner"></label><label>التكلفة<input id="incCost" type="number" step="0.01"></label><label>صورة أو مرفق حتى 5MB<input id="incFile" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"></label></div><label>الوصف<textarea id="incDesc" rows="3"></textarea></label><label>الإجراء المتخذ<textarea id="incAction" rows="2"></textarea></label><button id="incSave" class="v3-primary">حفظ السجل</button><span id="incMsg"></span></div><div class="v3-panel"><div class="v3-filter"><input id="incSearch" placeholder="بحث"><select id="incFilter"><option value="">كل الحالات</option><option>مفتوحة</option><option>تحت المعالجة</option><option>مغلقة</option></select><button id="incLoad">تحديث</button></div><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>المركبة/المعدة</th><th>النوع</th><th>الحالة</th><th>الوصف</th><th>الإجراء</th><th>التكلفة</th><th>المرفقات</th></tr></thead><tbody id="incBody"></tbody></table></div><div id="incFilesPanel"></div></div></div></section>`;
    if (!editable) document.getElementById("incidentEditor").classList.add("hidden");
    const el = id => document.getElementById(id);
    el("incDate").value = new Date().toISOString().slice(0,10);
    function fileBase64(file) { return new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "").split(",")[1] || ""); reader.onerror = reject; reader.readAsDataURL(file); }); }
    async function showFiles(id) {
      try {
        const d = await api(`/api/incidents/${id}/files`);
        el("incFilesPanel").innerHTML = `<div class="v3-panel flat"><h4>مرفقات السجل</h4>${d.files.length ? d.files.map(f => `<a href="/api/incident-files/${f.id}" target="_blank" style="display:block;margin:6px 0">${esc(f.file_name)} (${Math.max(1,Math.round(Number(f.size_bytes||0)/1024))} KB)</a>`).join("") : "لا توجد مرفقات"}</div>`;
      } catch (e) { el("incFilesPanel").textContent = e.message; }
    }
    async function load() {
      const d = await api(`/api/incidents?q=${encodeURIComponent(el("incSearch").value)}&status=${encodeURIComponent(el("incFilter").value)}`);
      el("incBody").innerHTML = d.incidents.length ? d.incidents.map(x => `<tr><td>${esc(x.incident_date)}</td><td>${esc(x.asset_name)}</td><td>${esc(x.incident_type)}</td><td>${esc(x.followup_status)}</td><td>${esc(x.description)}</td><td>${esc(x.action_taken || "-")}</td><td>${Number(x.cost || 0).toLocaleString("en-US")}</td><td><button type="button" data-files="${x.id}">${Number(x.attachment_count||0)} مرفق</button></td></tr>`).join("") : `<tr><td colspan="8">لا توجد سجلات</td></tr>`;
      document.querySelectorAll("[data-files]").forEach(btn => btn.onclick = () => showFiles(btn.dataset.files));
    }
    el("incSave").onclick = async () => {
      try {
        const saved = await api("/api/incidents", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({asset_name:el("incAsset").value,incident_date:el("incDate").value,incident_type:el("incType").value,followup_status:el("incStatus").value,description:el("incDesc").value,action_taken:el("incAction").value,followup_owner:el("incOwner").value,cost:el("incCost").value}) });
        const file = el("incFile").files?.[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) throw new Error("المرفق أكبر من 5MB");
          await api(`/api/incidents/${saved.id}/files`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:file.name,mime_type:file.type||"application/octet-stream",data_base64:await fileBase64(file)}) });
        }
        el("incMsg").textContent = file ? "تم حفظ السجل والمرفق" : "تم حفظ السجل";
        el("incDesc").value = ""; el("incAction").value = ""; el("incFile").value = ""; load();
      } catch(e) { el("incMsg").textContent = e.message; }
    };
    el("incLoad").onclick = load;
    el("incSearch").onkeydown = e => { if (e.key === "Enter") load(); };
    load();
  }

  const run = () => { addDesignCredit(); renderIncidentsPage(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
