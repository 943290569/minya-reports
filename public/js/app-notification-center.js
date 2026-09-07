/* Unified notification center */
(function () {
  const state = { items: [], open: false };

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function todayIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  async function json(url) {
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "فشل تحميل التنبيهات");
    return data;
  }

  function ensureUi() {
    if (document.getElementById("minyaNotificationButton")) return;
    const header = document.querySelector(".top-header");
    if (!header) return;

    const host = document.createElement("div");
    host.className = "minya-notification-host";
    host.innerHTML = `
      <button id="minyaNotificationButton" class="minya-notification-button" type="button" aria-expanded="false" aria-controls="minyaNotificationPanel">
        <span>التنبيهات</span>
        <strong id="minyaNotificationCount">0</strong>
      </button>
      <section id="minyaNotificationPanel" class="minya-notification-panel" hidden>
        <div class="minya-notification-head">
          <div><strong>مركز التنبيهات</strong><small id="minyaNotificationSummary">جاري التحديث...</small></div>
          <button id="minyaNotificationClose" type="button" aria-label="إغلاق">×</button>
        </div>
        <div id="minyaNotificationList" class="minya-notification-list"></div>
      </section>`;

    header.appendChild(host);
    const button = document.getElementById("minyaNotificationButton");
    const panel = document.getElementById("minyaNotificationPanel");
    const close = document.getElementById("minyaNotificationClose");

    function setOpen(open) {
      state.open = !!open;
      panel.hidden = !state.open;
      button.setAttribute("aria-expanded", state.open ? "true" : "false");
    }
    button.addEventListener("click", () => setOpen(!state.open));
    close.addEventListener("click", () => setOpen(false));
    document.addEventListener("click", (event) => {
      if (state.open && !host.contains(event.target)) setOpen(false);
    });
  }

  function addItem(item) {
    if (!item || !item.text) return;
    state.items.push({ tone: "info", href: "/", ...item });
  }

  async function collectLicenseAlerts() {
    try {
      const data = await json("/api/driver-licenses");
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const expired = rows.filter((x) => String(x.status || "") === "منتهية");
      const soon = rows.filter((x) => {
        const days = Number(x.days_remaining);
        return Number.isFinite(days) && days >= 0 && days <= 30;
      });
      if (expired.length) addItem({ tone: "danger", href: "/drivers-licenses.html", title: "رخص منتهية", text: `${expired.length} رخصة منتهية تحتاج متابعة.` });
      if (soon.length) addItem({ tone: "warning", href: "/drivers-licenses.html", title: "رخص قريبة الانتهاء", text: `${soon.length} رخصة تنتهي خلال 30 يومًا.` });
    } catch (_) {}
  }

  async function collectReportAlerts() {
    try {
      const data = await json("/api/reports");
      const reports = Array.isArray(data.reports) ? data.reports : [];
      const today = todayIso();
      const hasToday = reports.some((r) => String(r.report_date || "") === today);
      if (!hasToday) addItem({ tone: "warning", href: "/report", title: "تقرير اليوم", text: "لا يوجد تقرير محفوظ بتاريخ اليوم حتى الآن." });

      const latest = reports.slice().sort((a, b) => String(b.report_date || "").localeCompare(String(a.report_date || "")))[0];
      if (!latest?.id) return;
      const detail = await json(`/api/reports/${latest.id}`);
      const report = detail.report || detail;
      const equipment = Array.isArray(report.equipment) ? report.equipment : Array.isArray(detail.equipment) ? detail.equipment : [];
      const stopped = equipment.filter((x) => {
        const status = String(x.operating_status || x.status || "").trim();
        return status && !["يعمل", "شغال", "متاح"].includes(status);
      });
      if (stopped.length) addItem({ tone: "danger", href: "/equipment", title: "معدات تحتاج متابعة", text: `${stopped.length} معدة في آخر تقرير حالتها ليست يعمل.` });
    } catch (_) {}
  }

  function render() {
    ensureUi();
    const count = document.getElementById("minyaNotificationCount");
    const summary = document.getElementById("minyaNotificationSummary");
    const list = document.getElementById("minyaNotificationList");
    if (!count || !summary || !list) return;

    const urgent = state.items.filter((x) => x.tone === "danger").length;
    count.textContent = String(state.items.length);
    count.dataset.empty = state.items.length ? "false" : "true";
    summary.textContent = state.items.length ? `${state.items.length} تنبيه${urgent ? `، منها ${urgent} عاجل` : ""}` : "لا توجد تنبيهات تحتاج إجراء";

    if (!state.items.length) {
      list.innerHTML = `<div class="minya-notification-empty">الوضع الحالي لا يحتوي تنبيهات تحتاج متابعة.</div>`;
      return;
    }
    list.innerHTML = state.items.map((item) => `
      <a class="minya-notification-item" data-tone="${esc(item.tone)}" href="${esc(item.href)}">
        <strong>${esc(item.title || "تنبيه")}</strong>
        <span>${esc(item.text)}</span>
      </a>`).join("");
  }

  async function refresh() {
    state.items = [];
    await Promise.all([collectLicenseAlerts(), collectReportAlerts()]);
    state.items.sort((a, b) => ({ danger: 0, warning: 1, info: 2 }[a.tone] ?? 3) - ({ danger: 0, warning: 1, info: 2 }[b.tone] ?? 3));
    render();
    window.MINYA_NOTIFICATIONS = state.items.slice();
    window.dispatchEvent(new CustomEvent("minya-notifications-updated", { detail: { items: state.items.slice() } }));
  }

  function init() {
    ensureUi();
    refresh();
    window.addEventListener("driver-licenses-updated", refresh);
    window.addEventListener("focus", () => {
      if (document.visibilityState === "visible") refresh();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
