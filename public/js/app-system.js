/* =========================================================
   إدارة النظام والنسخ الاحتياطي
========================================================= */

(function () {
  const numberFormat = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });

  function formatNumber(value) {
    return numberFormat.format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) return "-";
    const parts = String(value).split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
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

  async function fetchReports() {
    const response = await fetch("/api/reports");
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "فشل تحميل التقارير");
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
      setHealth(true, "النظام يعمل بشكل طبيعي");

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
      setText(
        "systemDateRange",
        oldest && latest ? `${formatDate(oldest.report_date)} — ${formatDate(latest.report_date)}` : "لا توجد بيانات"
      );

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

  async function buildFullBackup() {
    const reports = await fetchReports();
    const details = [];

    for (let index = 0; index < reports.length; index += 1) {
      const report = reports[index];
      setText("backupStatus", `جاري تجهيز ${index + 1} من ${reports.length}`);

      try {
        const response = await fetch(`/api/reports/${report.id}`);
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.message || "فشل تحميل التقرير");
        details.push(data);
      } catch (error) {
        console.error(`فشل نسخ التقرير ${report.id}`, error);
        details.push({ ok: false, report, backup_error: error.message });
      }
    }

    return {
      backup_format: "minya-landfill-full-backup",
      backup_version: 1,
      exported_at: new Date().toISOString(),
      reports_count: reports.length,
      reports: details,
    };
  }

  async function downloadBackup() {
    const button = document.getElementById("downloadBackupBtn");
    if (button) button.disabled = true;

    try {
      setText("backupStatus", "جاري تجهيز النسخة...");
      const backup = await buildFullBackup();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");

      const link = document.createElement("a");
      link.href = url;
      link.download = `minya-landfill-backup-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      const timeText = now.toLocaleString("ar-EG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      localStorage.setItem("minyaLastBackupTime", timeText);
      setText("lastBackupTime", timeText);
      setText("backupStatus", `تم تنزيل ${formatNumber(backup.reports_count)} تقرير`);
    } catch (error) {
      console.error("فشل إنشاء النسخة الاحتياطية", error);
      setText("backupStatus", "فشل إنشاء النسخة الاحتياطية");
    } finally {
      if (button) button.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const storedBackupTime = localStorage.getItem("minyaLastBackupTime");
    if (storedBackupTime) setText("lastBackupTime", storedBackupTime);

    document.getElementById("downloadBackupBtn")?.addEventListener("click", downloadBackup);
    loadSystemStatus();
  });
})();
