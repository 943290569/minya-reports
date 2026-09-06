
/* ===== js/app-auth.js ===== */
/* Authentication guard */
(function(){
  const publicPages=["/login.html","/setup.html"];

  function applyRoleNavigation(user){
    if(!user) return;
    const adminOnlyHrefs=["/admin","/admin.html","/reviews","/system.html","/drive-import.html"];
    document.querySelectorAll("a[href]").forEach(link=>{
      const href=link.getAttribute("href");
      if(adminOnlyHrefs.includes(href) && user.role!=="admin") link.remove();
    });
  }

  function removeUserBox(){
    document.getElementById("minyaUserBox")?.remove();
  }

  function setupAuthenticatedUI(user){
    if(!user) return;

    applyRoleNavigation(user);
    removeUserBox();

    if(!window.__MINYA_ROLE_OBSERVER__){
      let scheduled=false;
      const observer=new MutationObserver(()=>{
        if(scheduled) return;
        scheduled=true;
        requestAnimationFrame(()=>{
          scheduled=false;
          applyRoleNavigation(user);
          removeUserBox();
        });
      });
      observer.observe(document.body,{childList:true,subtree:true});
      window.__MINYA_ROLE_OBSERVER__=observer;
    }

    if(user.role==="viewer"){
      const save=document.getElementById("saveBtn");
      if(save){save.disabled=true;save.title="حساب قراءة فقط";}
    }
  }

  async function check(){
    try{
      const r=await fetch("/api/auth/status",{cache:"no-store"});
      const d=await r.json();
      const path=location.pathname;
      if(d.setupRequired && path!=="/setup.html"){ location.replace("/setup.html"); return; }
      if(!d.setupRequired && !d.authenticated && !publicPages.includes(path)){ location.replace("/login.html"); return; }
      if(d.authenticated){
        window.MINYA_USER=d.user;
        document.documentElement.dataset.userRole=d.user.role;
        if(document.readyState==="loading"){
          document.addEventListener("DOMContentLoaded",()=>setupAuthenticatedUI(d.user),{once:true});
        }else{
          setupAuthenticatedUI(d.user);
        }
      }
    }catch(e){ console.error("Auth check failed",e); }
  }
  check();
})();
;

/* ===== js/app-system.js ===== */
/* =========================================================
   إدارة النظام والنسخ الاحتياطي
========================================================= */

(function () {
  const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  const STORAGE_REFERENCE_BYTES = 20 * 1024 * 1024 * 1024;

  function formatNumber(value) {
    return numberFormat.format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) return "-";
    const parts = String(value).split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${formatNumber(value)} B`;
    if (value < 1024 * 1024) return `${formatNumber(value / 1024)} KB`;
    if (value < 1024 * 1024 * 1024) return `${formatNumber(value / (1024 * 1024))} MB`;
    return `${formatNumber(value / (1024 * 1024 * 1024))} GB`;
  }

  function formatDateTime(value) {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return String(value);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setHealth(ok, text) {
    const badge = document.getElementById("systemHealthBadge");
    if (!badge) return;
    badge.classList.remove("loading", "ok", "error");
    badge.classList.add(ok ? "ok" : "error");
    badge.textContent = text;
  }

  async function api(url) {
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.message || "فشل تحميل البيانات");
    return data;
  }

  async function fetchReports() {
    const data = await api("/api/reports");
    return Array.isArray(data.reports) ? data.reports : [];
  }

  async function loadSystemStatus() {
    try {
      const [healthResponse, reports] = await Promise.all([
        fetch("/api/health"),
        fetchReports(),
      ]);

      const health = await healthResponse.json();
      if (!healthResponse.ok || !health.ok) throw new Error("فشل فحص الخادم");

      setText("systemServerState", "متصل");
      setText("systemVersion", `${health.database || "SQLite"} · ${health.version || "-"}`);
      setHealth(true, health.integrity === "ok" ? "قاعدة البيانات سليمة" : "النظام يعمل");

      const sorted = [...reports].sort((a, b) =>
        String(a.report_date || "").localeCompare(String(b.report_date || ""))
      );
      const oldest = sorted[0] || null;
      const latest = sorted[sorted.length - 1] || null;

      setText("systemReportsCount", formatNumber(reports.length));
      setText("systemLatestDate", latest ? formatDate(latest.report_date) : "-");
      setText("systemLatestNo", latest?.report_no || "-");
      setText("systemOldestDate", oldest ? formatDate(oldest.report_date) : "-");
      setText("systemOldestNo", oldest?.report_no || "-");
      setText("systemDateRange", oldest && latest ? `${formatDate(oldest.report_date)} — ${formatDate(latest.report_date)}` : "لا توجد بيانات");

      const waste = reports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0);
      const trucks = reports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0);
      const diesel = reports.reduce((sum, report) => sum + Number(report.total_diesel || 0), 0);

      setText("systemWasteTotal", `${formatNumber(waste)} طن`);
      setText("systemTrucksTotal", formatNumber(trucks));
      setText("systemDieselTotal", `${formatNumber(diesel)} لتر`);
    } catch (error) {
      console.error("فشل تحميل حالة النظام", error);
      setText("systemServerState", "غير متاح");
      setHealth(false, "تعذر التحقق من حالة النظام");
    }
  }

  async function loadStorage() {
    try {
      const data = await api("/api/system/storage");
      const totalBytes = Number(data.total_bytes || 0);
      const referenceLimit = STORAGE_REFERENCE_BYTES;
      const percent = referenceLimit ? Math.max(0, Number(((totalBytes / referenceLimit) * 100).toFixed(2))) : 0;
      const remaining = Math.max(0, referenceLimit - totalBytes);
      const level = percent >= 85 ? "danger" : percent >= 70 ? "warning" : "ok";

      setText("storageUsed", formatBytes(totalBytes));
      setText("storagePercent", `${formatNumber(percent)}%`);
      setText("storageRemaining", `متبقي ${formatBytes(remaining)}`);
      setText("storageDatabase", formatBytes(data.db_bytes ?? data.database_bytes ?? 0));
      setText("storageUploads", formatBytes(data.uploads_bytes || 0));
      setText("storageBackups", formatBytes(data.backups_bytes || 0));
      setText("storageAttachmentsCount", `${formatNumber(data.attachment_count ?? data.attachments_count ?? 0)} مرفق`);
      setText("storageBackupsCount", `${formatNumber(data.backup_count ?? data.backups_count ?? 0)} نسخة`);

      const bar = document.getElementById("storageProgressBar");
      if (bar) {
        bar.style.width = `${Math.min(percent, 100)}%`;
        bar.dataset.level = level;
      }

      const state = document.getElementById("storageState");
      if (state) {
        state.className = `storage-state ${level}`;
        state.textContent = level === "danger" ? "قريب من الامتلاء" : level === "warning" ? "تنبيه مساحة" : "المساحة طبيعية";
      }

      const notice = document.getElementById("storageNotice");
      if (notice) {
        if (level === "danger") notice.textContent = "تنبيه: الاستخدام تجاوز 85% من مرجع 20 GB. نزّل نسخة خارجية وراجع المرفقات والنسخ القديمة.";
        else if (level === "warning") notice.textContent = "الاستخدام تجاوز 70% من مرجع 20 GB. يفضل متابعة نمو المرفقات والنسخ الاحتياطية.";
        else notice.textContent = "الاستخدام ضمن المستوى الطبيعي. 20 GB هو مرجع مراقبة آمن ضمن القرص الحالي ولا يتم حذف البيانات تلقائيًا.";
      }
    } catch (error) {
      console.error("فشل تحميل مساحة التخزين", error);
      setText("storageState", "غير متاح");
    }
  }

  async function loadSavedBackups() {
    const body = document.getElementById("savedBackupsBody");
    if (!body) return;
    try {
      const data = await api("/api/backups");
      const rows = Array.isArray(data.backups) ? data.backups : [];
      body.innerHTML = rows.length
        ? rows.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${formatDateTime(item.created_at)}</td><td class="system-ltr-value">${formatBytes(item.size_bytes)}</td><td><a class="backup-download-link" href="/api/backups/${encodeURIComponent(item.name)}/download">تنزيل</a></td></tr>`).join("")
        : `<tr><td colspan="4">لا توجد نسخ تلقائية محفوظة بعد.</td></tr>`;
    } catch (error) {
      console.error("فشل تحميل النسخ المحفوظة", error);
      body.innerHTML = `<tr><td colspan="4">تعذر تحميل قائمة النسخ.</td></tr>`;
    }
  }

  function registerBackupDownload() {
    const link = document.getElementById("downloadCurrentBackup");
    if (!link) return;
    link.addEventListener("click", () => {
      const now = new Date();
      const timeText = now.toLocaleString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
      localStorage.setItem("minyaLastBackupTime", timeText);
      setText("lastBackupTime", timeText);
      setText("backupStatus", "بدأ تنزيل النسخة الكاملة");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const storedBackupTime = localStorage.getItem("minyaLastBackupTime");
    if (storedBackupTime) setText("lastBackupTime", storedBackupTime);

    registerBackupDownload();
    document.getElementById("refreshBackupsBtn")?.addEventListener("click", () => {
      loadStorage();
      loadSavedBackups();
    });

    loadSystemStatus();
    loadStorage();
    loadSavedBackups();
  });
})();

;

/* ===== js/app-system-integrity.js ===== */
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
      return new Date(value).toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
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
      setText("integrityLastBackup", data.latest_backup ? String(data.latest_backup) : "لا توجد نسخة");
      setText("integrityCheckedAt", formatDateTime(new Date().toISOString()));

      const issues = Array.isArray(data.issues) ? data.issues : [];
      if (!issues.length) {
        list.innerHTML = `<div class="integrity-empty ok">لم يتم اكتشاف مشاكل في سلامة البيانات.</div>`;
        return;
      }

      list.innerHTML = issues.map((issue) => `
        <div class="integrity-issue ${escapeHtml(issue.level || "warning")}">
          <div><strong>${escapeHtml(issue.message || issue.title || "ملاحظة")}</strong><small>${escapeHtml(issue.code || "")}</small></div>
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

if (!document.querySelector('script[src^="js/app-system-restore.js"]')) {
  const restoreScript = document.createElement("script");
  restoreScript.src = "js/app-system-restore.js?v=3.2.0-final-review-polish-v1";
  document.body.appendChild(restoreScript);
}

;