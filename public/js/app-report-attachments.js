/* =========================================================
   مرفقات التقرير اليومي
========================================================= */
(function () {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/report") return;

  const MAX_BYTES = 8 * 1024 * 1024;
  let currentRole = "viewer";

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function fmtBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} بايت`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function getRole() {
    try {
      const response = await fetch("/api/auth/status");
      const data = await response.json();
      if (data?.authenticated && data.user?.role) currentRole = data.user.role;
    } catch {}
  }

  function canEdit() {
    return currentRole === "admin" || currentRole === "editor";
  }

  function ensurePanel() {
    if (document.getElementById("reportAttachmentsPanel")) return;
    const notesPanel = document.getElementById("notes")?.closest("section.panel");
    const summaryPanel = document.getElementById("summaryWorkers")?.closest("section.panel");
    const anchor = notesPanel || summaryPanel;
    if (!anchor) return;

    const panel = document.createElement("section");
    panel.id = "reportAttachmentsPanel";
    panel.className = "panel no-print";
    panel.innerHTML = `
      <div class="report-attachments-head">
        <div>
          <h2>مرفقات التقرير</h2>
          <p>صور الموقع أو مستندات PDF المرتبطة بالتقرير. الحد الأقصى 8MB للملف.</p>
        </div>
        <span id="attachmentsCount" class="attachments-count">0 مرفق</span>
      </div>
      <div id="attachmentsUnsaved" class="attachments-unsaved">احفظ التقرير أولًا حتى تتمكن من إضافة المرفقات.</div>
      <div id="attachmentsControls" class="attachments-controls" hidden>
        <input id="attachmentFileInput" type="file" accept="image/*,application/pdf">
        <button id="uploadAttachmentBtn" type="button">إضافة مرفق</button>
        <span id="attachmentStatus" class="muted"></span>
      </div>
      <div id="reportAttachmentsList" class="attachment-list"></div>
    `;
    anchor.insertAdjacentElement("afterend", panel);

    document.getElementById("uploadAttachmentBtn")?.addEventListener("click", uploadSelectedFile);
  }

  function updateControls() {
    const saved = Number(editingId || 0) > 0;
    const unsaved = document.getElementById("attachmentsUnsaved");
    const controls = document.getElementById("attachmentsControls");
    if (unsaved) unsaved.hidden = saved;
    if (controls) controls.hidden = !saved || !canEdit();
    const panel = document.getElementById('reportAttachmentsPanel');
    let reuse = document.getElementById('reportCloudFilesLink');
    if (panel && !reuse) {
      reuse = document.createElement('a');
      reuse.id = 'reportCloudFilesLink';
      reuse.className = 'attachment-actions no-print';
      reuse.textContent = 'اختيار ملف من ملفات الموقع';
      panel.querySelector('.report-attachments-head')?.after(reuse);
    }
    if (reuse) {
      reuse.hidden = !saved || !canEdit();
      reuse.href = `/files?type=report&record=${Number(editingId || 0)}`;
    }
  }

  async function loadAttachments() {
    ensurePanel();
    updateControls();
    const list = document.getElementById("reportAttachmentsList");
    const count = document.getElementById("attachmentsCount");
    if (!list || !count) return;

    const reportId = Number(editingId || 0);
    if (!reportId) {
      count.textContent = "0 مرفق";
      list.innerHTML = "";
      return;
    }

    try {
      list.innerHTML = '<div class="muted">جاري تحميل المرفقات...</div>';
      const response = await fetch(`/api/reports/${reportId}/attachments`);
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "فشل تحميل المرفقات");
      const items = Array.isArray(data.attachments) ? data.attachments : [];
      const cloudResponse = await fetch(`/api/cloud-files/linked?type=report&id=${reportId}`);
      const cloudData = await cloudResponse.json();
      if (!cloudResponse.ok || !cloudData.ok) throw new Error(cloudData.message || 'تعذر تحميل الملفات المرتبطة');
      (cloudData.files || []).forEach(item => items.push({ ...item, cloud_file: true }));
      if (reportId !== Number(editingId || 0)) return;
      count.textContent = `${items.length} مرفق`;
      list.innerHTML = items.length ? items.map(item => `
        <div class="attachment-row">
          <div class="attachment-meta">
            <strong>${esc(item.original_name)}</strong>
            <small>${fmtBytes(item.size_bytes)} • ${esc(String(item.created_at || "").slice(0, 16).replace("T", " "))}</small>
          </div>
          <div class="attachment-actions">
            <a href="/api/${item.cloud_file ? 'cloud-files' : 'attachments'}/${item.id}/download" target="_blank" rel="noopener">فتح</a>
            ${canEdit() ? item.cloud_file ? `<button type="button" data-unlink-cloud-file="${item.id}">فك الربط</button>` : `<button type="button" data-delete-attachment="${item.id}">حذف</button>` : ""}
          </div>
        </div>
      `).join("") : '<div class="muted">لا توجد مرفقات لهذا التقرير.</div>';

      list.querySelectorAll("[data-delete-attachment]").forEach(button => {
        button.addEventListener("click", () => deleteAttachment(Number(button.dataset.deleteAttachment)));
      });
      list.querySelectorAll('[data-unlink-cloud-file]').forEach(button => {
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            const r = await fetch(`/api/cloud-files/${button.dataset.unlinkCloudFile}/links/report/${reportId}`, {method:'DELETE'});
            const d = await r.json();
            if (!r.ok || !d.ok) throw new Error(d.message || 'تعذر فك الربط');
            await loadAttachments();
          } catch (error) {
            document.getElementById('attachmentStatus').textContent = error.message;
            button.disabled = false;
          }
        });
      });
    } catch (error) {
      list.innerHTML = `<div class="muted">${esc(error.message)}</div>`;
    }
  }

  function fileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
      reader.readAsDataURL(file);
    });
  }

  async function uploadSelectedFile() {
    const reportId = Number(editingId || 0);
    const input = document.getElementById("attachmentFileInput");
    const status = document.getElementById("attachmentStatus");
    const file = input?.files?.[0];
    if (!reportId) return;
    if (!file) {
      if (status) status.textContent = "اختر ملفًا أولًا";
      return;
    }
    if (file.size > MAX_BYTES) {
      if (status) status.textContent = "حجم الملف أكبر من 8MB";
      return;
    }
    if (!(file.type.startsWith("image/") || file.type === "application/pdf")) {
      if (status) status.textContent = "المسموح صور أو PDF فقط";
      return;
    }

    try {
      if (status) status.textContent = "جاري رفع المرفق...";
      const dataUrl = await fileAsDataUrl(file);
      const response = await fetch(`/api/reports/${reportId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, mime_type: file.type, data_base64: dataUrl }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "فشل رفع المرفق");
      if (input) input.value = "";
      if (status) status.textContent = "تمت إضافة المرفق";
      await loadAttachments();
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  }

  async function deleteAttachment(id) {
    if (!confirm("هل تريد حذف هذا المرفق؟")) return;
    try {
      const response = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "فشل حذف المرفق");
      await loadAttachments();
    } catch (error) {
      const status = document.getElementById("attachmentStatus");
      if (status) status.textContent = error.message;
    }
  }

  async function waitForSavedReport() {
    for (let i = 0; i < 12; i += 1) {
      if (Number(editingId || 0) > 0) {
        await loadAttachments();
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    updateControls();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await getRole();
    ensurePanel();
    updateControls();
    if (Number(editingId || 0) > 0) loadAttachments();

    document.getElementById("saveBtn")?.addEventListener("click", () => {
      setTimeout(waitForSavedReport, 150);
    });
    document.getElementById("newReportBtn")?.addEventListener("click", () => {
      setTimeout(() => {
        const status = document.getElementById("attachmentStatus");
        if (status) status.textContent = "";
        loadAttachments();
      }, 100);
    });
  });

  const originalEditReport = window.editReport;
  if (typeof originalEditReport === "function") {
    window.editReport = async function (id) {
      const result = await originalEditReport(id);
      await getRole();
      await loadAttachments();
      return result;
    };
  }
})();
