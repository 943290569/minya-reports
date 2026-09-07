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

  function fmt(value) {
    return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function nearlyEqual(a, b, tolerance = 0.01) {
    return Math.abs(Number(a || 0) - Number(b || 0)) <= tolerance;
  }

  function ensureTotalsAuditPanel() {
    const integrityPanel = document.querySelector('.integrity-panel');
    if (!integrityPanel || document.getElementById('reportTotalsAudit')) return;

    const panel = document.createElement('div');
    panel.id = 'reportTotalsAudit';
    panel.style.cssText = 'margin-top:14px;padding:12px;border:1px solid #d8e2dd;border-radius:10px;background:#f9fbfa;';
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div>
          <strong style="display:block;font-size:14px;">تطابق العمليات والمجاميع</strong>
          <small style="display:block;margin-top:3px;opacity:.72;">فحص قراءة فقط لآخر 150 تقريرًا. لا يتم تعديل أي بيانات.</small>
        </div>
        <button id="runTotalsAuditBtn" type="button" class="integrity-refresh">تشغيل الفحص</button>
      </div>
      <div id="reportTotalsAuditResult" style="margin-top:10px;font-size:13px;line-height:1.7;">لم يتم تشغيل الفحص بعد.</div>
    `;
    integrityPanel.appendChild(panel);
    document.getElementById('runTotalsAuditBtn')?.addEventListener('click', runTotalsAudit);
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || 'تعذر تحميل البيانات');
    return data;
  }

  function detailTotals(data) {
    const report = data.report || data;
    const operations = Array.isArray(data.operations) ? data.operations : Array.isArray(report.operations) ? report.operations : [];
    const stations = Array.isArray(data.stations) ? data.stations : Array.isArray(report.stations) ? report.stations : [];
    const equipment = Array.isArray(data.equipment) ? data.equipment : Array.isArray(report.equipment) ? report.equipment : [];

    const landfill = operations.find((item) => String(item.operation_name || '').trim() === 'مكب نفايات المنيا');
    const trucks = Number(landfill?.vehicle_count || 0) + stations.reduce((sum, item) => sum + Number(item.truck_count || 0), 0);
    const waste = Number(landfill?.quantity || 0) + stations.reduce((sum, item) => sum + Number(item.waste_tons || 0), 0);
    const diesel = equipment.reduce((sum, item) => sum + Number(item.diesel_liters || 0), 0);

    return { report, trucks, waste, diesel };
  }

  async function runTotalsAudit() {
    const button = document.getElementById('runTotalsAuditBtn');
    const result = document.getElementById('reportTotalsAuditResult');
    if (!button || !result || button.disabled) return;

    button.disabled = true;
    button.textContent = 'جاري الفحص...';
    result.textContent = 'جاري مقارنة المجاميع المحفوظة مع تفاصيل العمليات والمحطات والمعدات...';

    try {
      const listData = await fetchJson('/api/reports');
      const reports = (Array.isArray(listData.reports) ? listData.reports : [])
        .slice()
        .sort((a, b) => String(b.report_date || '').localeCompare(String(a.report_date || '')))
        .slice(0, 150);

      const mismatches = [];
      let checked = 0;
      const batchSize = 6;

      for (let i = 0; i < reports.length; i += batchSize) {
        const batch = reports.slice(i, i + batchSize);
        const details = await Promise.all(batch.map(async (report) => {
          try { return await fetchJson(`/api/reports/${report.id}`); }
          catch { return null; }
        }));

        details.forEach((data, index) => {
          if (!data) return;
          checked += 1;
          const source = batch[index];
          const calc = detailTotals(data);
          const storedTrucks = Number(calc.report.total_trucks ?? source.total_trucks ?? 0);
          const storedWaste = Number(calc.report.total_waste_tons ?? source.total_waste_tons ?? 0);
          const storedDiesel = Number(calc.report.total_diesel ?? source.total_diesel ?? 0);
          const differences = [];

          if (!nearlyEqual(storedTrucks, calc.trucks)) differences.push(`الشاحنات ${fmt(storedTrucks)} / التفاصيل ${fmt(calc.trucks)}`);
          if (!nearlyEqual(storedWaste, calc.waste)) differences.push(`النفايات ${fmt(storedWaste)} / التفاصيل ${fmt(calc.waste)}`);
          if (!nearlyEqual(storedDiesel, calc.diesel)) differences.push(`السولار ${fmt(storedDiesel)} / التفاصيل ${fmt(calc.diesel)}`);

          if (differences.length) mismatches.push({
            id: source.id,
            date: source.report_date || calc.report.report_date || '-',
            reportNo: source.report_no || calc.report.report_no || '',
            differences,
          });
        });

        result.textContent = `تم فحص ${checked} من ${reports.length} تقرير...`;
      }

      if (!mismatches.length) {
        result.innerHTML = `<div class="integrity-empty ok">تم فحص ${checked} تقريرًا: مجاميع الشاحنات والنفايات والسولار متطابقة مع التفاصيل.</div>`;
      } else {
        result.innerHTML = `
          <div class="integrity-issue warning" style="margin-bottom:8px;"><div><strong>تم العثور على ${mismatches.length} تقريرًا يحتاج مراجعة من أصل ${checked}.</strong><small>لم يتم تعديل أي تقرير.</small></div></div>
          ${mismatches.slice(0, 25).map((item) => `
            <div style="padding:8px 10px;border-bottom:1px solid rgba(0,0,0,.08);">
              <strong>${escapeHtml(item.date)}${item.reportNo ? ` — ${escapeHtml(item.reportNo)}` : ''}</strong>
              <div style="margin-top:3px;">${item.differences.map(escapeHtml).join(' · ')}</div>
              <a href="/report?edit=${encodeURIComponent(item.id)}" style="font-size:12px;">فتح التقرير للمراجعة</a>
            </div>
          `).join('')}
          ${mismatches.length > 25 ? `<div style="margin-top:8px;opacity:.72;">تم عرض أول 25 تقريرًا فقط.</div>` : ''}
        `;
      }
    } catch (error) {
      console.error('Totals audit failed', error);
      result.innerHTML = `<div class="integrity-empty danger">${escapeHtml(error.message || 'تعذر إكمال فحص المجاميع')}</div>`;
    } finally {
      button.disabled = false;
      button.textContent = 'تشغيل الفحص';
    }
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
    ensureTotalsAuditPanel();
    document.getElementById("runIntegrityBtn")?.addEventListener("click", loadIntegrityDiagnostics);
    loadIntegrityDiagnostics();
  });
})();

if (!document.querySelector('script[src^="js/app-system-restore.js"]')) {
  const restoreScript = document.createElement("script");
  restoreScript.src = "js/app-system-restore.js?v=3.2.0-final-review-polish-v1";
  document.body.appendChild(restoreScript);
}
