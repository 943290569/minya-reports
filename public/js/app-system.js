/* =========================================================
   إدارة النظام والنسخ الاحتياطي
========================================================= */

(function () {
  const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

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
    return `${formatNumber(value / (1024 * 1024))} MB`;
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
      const percent = Math.max(0, Number(data.percent ?? data.usage_percent ?? 0));
      const referenceLimit = Number(data.reference_limit_bytes || 0);
      const totalBytes = Number(data.total_bytes || 0);
      const remaining = Math.max(0, referenceLimit - totalBytes);

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
        bar.dataset.level = data.level || "ok";
      }

      const state = document.getElementById("storageState");
      if (state) {
        state.className = `storage-state ${data.level || "ok"}`;
        state.textContent = data.level === "danger" ? "قريب من الامتلاء" : data.level === "warning" ? "تنبيه مساحة" : "المساحة طبيعية";
      }

      const notice = document.getElementById("storageNotice");
      if (notice) {
        if (data.level === "danger") notice.textContent = "تنبيه: الاستخدام تجاوز 85% من مرجع 512MB. نزّل نسخة خارجية وراجع المرفقات والنسخ القديمة.";
        else if (data.level === "warning") notice.textContent = "الاستخدام تجاوز 70% من مرجع 512MB. يفضل متابعة نمو المرفقات والنسخ الاحتياطية.";
        else notice.textContent = "الاستخدام ضمن المستوى الطبيعي. 512MB هو مرجع مراقبة فقط ولا يتم حذف البيانات تلقائيًا.";
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
