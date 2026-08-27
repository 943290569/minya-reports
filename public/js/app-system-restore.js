(function () {
  let selectedBackup = null;
  let validationResult = null;

  function formatNumber(value) {
    return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(Number(value || 0));
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
      return new Date(value).toLocaleString("ar-EG", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
      });
    } catch { return String(value); }
  }

  function setStatus(level, text) {
    const el = document.getElementById("restoreValidationState");
    if (!el) return;
    el.className = `restore-state ${level}`;
    el.textContent = text;
  }

  function buildPanel() {
    const backupsPanel = document.querySelector(".backups-panel");
    if (!backupsPanel || document.getElementById("backupRestorePanel")) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "system-restore.css";
    document.head.appendChild(link);

    const section = document.createElement("section");
    section.id = "backupRestorePanel";
    section.className = "system-panel restore-panel";
    section.innerHTML = `
      <div class="system-panel-head">
        <div><span>SAFE RESTORE</span><h3>استعادة نسخة احتياطية</h3></div>
        <strong id="restoreValidationState" class="restore-state idle">بانتظار ملف</strong>
      </div>
      <p>اختر ملف JSON صادرًا من النظام. سيتم فحصه ومعاينة محتواه أولًا، ولن تتغير البيانات قبل الضغط على زر الاستعادة والتأكيد.</p>
      <div class="restore-file-row">
        <label class="restore-file-label">
          <input id="restoreBackupFile" type="file" accept="application/json,.json">
          <span>اختيار ملف النسخة الاحتياطية</span>
        </label>
        <div id="restoreFileName" class="restore-file-name">لم يتم اختيار ملف</div>
      </div>
      <div id="restorePreview" class="restore-preview hidden">
        <div><span>عدد التقارير</span><strong id="restoreReportsCount">0</strong></div>
        <div><span>المرفقات</span><strong id="restoreAttachmentsCount">0</strong></div>
        <div><span>حجم المرفقات داخل النسخة</span><strong id="restoreAttachmentsSize">0 MB</strong></div>
        <div><span>سجل الصيانة</span><strong id="restoreMaintenanceCount">0</strong></div>
        <div><span>الفترة</span><strong id="restoreDateRange">-</strong></div>
        <div><span>تاريخ إنشاء النسخة</span><strong id="restoreExportedAt">-</strong></div>
      </div>
      <div id="restoreErrors" class="restore-errors hidden"></div>
      <div class="restore-confirm-row">
        <label for="restoreConfirmText">للتأكيد اكتب: <strong>استعادة</strong></label>
        <input id="restoreConfirmText" type="text" autocomplete="off" placeholder="اكتب كلمة استعادة" disabled>
      </div>
      <button id="restoreBackupBtn" type="button" class="restore-action-btn" disabled>استعادة النسخة بعد الفحص</button>
      <small class="restore-warning">الاستعادة تستبدل التقارير وسجل الصيانة والمرفقات الحالية بمحتوى النسخة المختارة. ينشئ النظام نسخة تلقائية من الوضع الحالي قبل التنفيذ.</small>
    `;
    backupsPanel.before(section);
  }

  async function validateFile(file) {
    selectedBackup = null;
    validationResult = null;
    const preview = document.getElementById("restorePreview");
    const errors = document.getElementById("restoreErrors");
    const confirm = document.getElementById("restoreConfirmText");
    const button = document.getElementById("restoreBackupBtn");
    if (preview) preview.classList.add("hidden");
    if (errors) { errors.classList.add("hidden"); errors.innerHTML = ""; }
    if (confirm) { confirm.value = ""; confirm.disabled = true; }
    if (button) button.disabled = true;

    if (!file) {
      setStatus("idle", "بانتظار ملف");
      return;
    }

    document.getElementById("restoreFileName").textContent = `${file.name} · ${formatBytes(file.size)}`;
    if (file.size > 40 * 1024 * 1024) {
      setStatus("danger", "الملف كبير جدًا");
      if (errors) { errors.classList.remove("hidden"); errors.textContent = "الحد الآمن للاستعادة من الواجهة هو 40MB."; }
      return;
    }

    setStatus("loading", "جاري فحص النسخة...");
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const response = await fetch("/api/backup/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "فشل فحص النسخة");

      selectedBackup = backup;
      validationResult = data;
      const s = data.summary || {};
      document.getElementById("restoreReportsCount").textContent = formatNumber(s.reports_count);
      document.getElementById("restoreAttachmentsCount").textContent = formatNumber(s.attachments_count);
      document.getElementById("restoreAttachmentsSize").textContent = formatBytes(s.attachments_bytes);
      document.getElementById("restoreMaintenanceCount").textContent = formatNumber(s.maintenance_count);
      document.getElementById("restoreDateRange").textContent = s.first_date && s.last_date ? `${s.first_date} — ${s.last_date}` : "-";
      document.getElementById("restoreExportedAt").textContent = formatDateTime(s.exported_at);
      if (preview) preview.classList.remove("hidden");

      if (!data.valid) {
        setStatus("danger", "النسخة غير صالحة");
        if (errors) {
          errors.classList.remove("hidden");
          errors.innerHTML = (data.errors || []).map(item => `<div>${String(item)}</div>`).join("");
        }
        return;
      }

      setStatus("ok", "النسخة صالحة للاستعادة");
      if (confirm) confirm.disabled = false;
    } catch (error) {
      console.error("Backup validation failed", error);
      setStatus("danger", "تعذر فحص النسخة");
      if (errors) { errors.classList.remove("hidden"); errors.textContent = error.message || "ملف JSON غير صالح"; }
    }
  }

  function updateRestoreButton() {
    const confirm = document.getElementById("restoreConfirmText");
    const button = document.getElementById("restoreBackupBtn");
    if (!button || !confirm) return;
    button.disabled = !(selectedBackup && validationResult?.valid && confirm.value.trim() === "استعادة");
  }

  async function restoreBackup() {
    if (!selectedBackup || !validationResult?.valid) return;
    const confirmInput = document.getElementById("restoreConfirmText");
    if (confirmInput?.value.trim() !== "استعادة") return;
    if (!window.confirm("سيتم استبدال البيانات الحالية بمحتوى النسخة المختارة. هل تريد المتابعة؟")) return;

    const button = document.getElementById("restoreBackupBtn");
    if (button) { button.disabled = true; button.textContent = "جاري الاستعادة..."; }
    setStatus("loading", "جاري الاستعادة...");

    try {
      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedBackup),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.message || "فشل استعادة النسخة");
      setStatus("ok", "تمت الاستعادة بنجاح");
      alert(`تمت استعادة ${data.count || 0} تقرير بنجاح.`);
      window.location.reload();
    } catch (error) {
      console.error("Backup restore failed", error);
      setStatus("danger", "فشلت الاستعادة");
      alert(error.message || "فشل استعادة النسخة");
      if (button) { button.disabled = false; button.textContent = "استعادة النسخة بعد الفحص"; }
    }
  }

  function initRestore() {
    buildPanel();
    document.getElementById("restoreBackupFile")?.addEventListener("change", (event) => validateFile(event.target.files?.[0] || null));
    document.getElementById("restoreConfirmText")?.addEventListener("input", updateRestoreButton);
    document.getElementById("restoreBackupBtn")?.addEventListener("click", restoreBackup);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initRestore);
  else initRestore();
})();
