/* =========================================================
   صندوق مراجعة واعتماد التقارير
========================================================= */
(function () {
  const currentPath = location.pathname.replace(/\/+$/, "") || "/";
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const fmt = (value) => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const cleanMobile = (value) => String(value || "").trim().replace(/[\s().+-]/g, "");

  function whatsappNumber(value) {
    let mobile = cleanMobile(value);
    if (!mobile) return "";
    if (mobile.startsWith("00970") || mobile.startsWith("00972")) mobile = mobile.slice(2);
    if (mobile.startsWith("059") || mobile.startsWith("056")) mobile = `970${mobile.slice(1)}`;
    return /^\d{8,15}$/.test(mobile) ? mobile : "";
  }

  function dt(value) {
    if (!value) return "-";
    try { return new Date(value).toLocaleString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
    catch { return String(value); }
  }

  async function api(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || "فشل الطلب");
    return data;
  }

  async function waitForUser() {
    for (let i = 0; i < 40 && !window.MINYA_USER; i += 1) await new Promise((resolve) => setTimeout(resolve, 50));
    return window.MINYA_USER || null;
  }

  function addReviewNav(count = null) {
    if (window.MINYA_USER?.role !== "admin") return;
    const nav = document.querySelector(".top-header nav"); if (!nav) return;
    let link = nav.querySelector('a[href="/reviews"]');
    if (!link) { link = document.createElement("a"); link.href = "/reviews"; link.className = "app-nav-link review-nav-link"; nav.appendChild(link); }
    link.innerHTML = `المراجعة${Number.isFinite(count) && count > 0 ? `<b>${count}</b>` : ""}`;
    link.classList.toggle("active", currentPath === "/reviews");
  }

  async function refreshGlobalReviewCount() {
    if (window.MINYA_USER?.role !== "admin") return null;
    try { const data = await api("/api/reviews/pending"); addReviewNav(Number(data.count || 0)); return Number(data.count || 0); }
    catch { return null; }
  }

  function reviewAgeHours(report) {
    const submitted = new Date(report?.submitted_at || 0).getTime();
    if (!Number.isFinite(submitted) || submitted <= 0) return 0;
    return Math.max(0, (Date.now() - submitted) / 3600000);
  }

  async function addDashboardReviewCard() {
    if (currentPath !== "/" || window.MINYA_USER?.role !== "admin") return;
    let data;
    try { data = await api("/api/reviews/pending"); }
    catch { return; }
    const reports = Array.isArray(data.reports) ? data.reports : [];
    const count = reports.length;
    addReviewNav(count);
    const overdue = reports.filter((report) => reviewAgeHours(report) >= 24).sort((a, b) => reviewAgeHours(b) - reviewAgeHours(a));
    const grid = document.querySelector(".dashboard-grid, .home-dashboard-grid, [data-dashboard-grid]");
    if (!grid || document.getElementById("dashboardReviewCard")) return;
    const card = document.createElement("div");
    card.id = "dashboardReviewCard";
    card.className = `dashboard-card review-dashboard-card${count ? " has-pending" : ""}${overdue.length ? " has-overdue" : ""}`;
    card.style.position = "relative";
    const overdueList = overdue.slice(0, 4).map((report) => {
      const hours = Math.floor(reviewAgeHours(report));
      const age = hours >= 48 ? `${Math.floor(hours / 24)} يوم` : `${hours} ساعة`;
      return `<a href="/report?edit=${report.id}" style="display:flex;justify-content:space-between;gap:8px;margin-top:6px;text-decoration:none"><span>${esc(report.report_no || report.report_date)}</span><small>${age}</small></a>`;
    }).join("");
    card.innerHTML = `<a href="/reviews" style="color:inherit;text-decoration:none;display:block"><span class="dashboard-icon">✓</span><h3>مراجعة واعتماد التقارير</h3><p>${count ? `يوجد ${count} تقرير بانتظار المراجعة والاعتماد.` : "لا توجد تقارير بانتظار الاعتماد حاليًا."}</p><strong class="review-count">${count}</strong></a>${overdue.length ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(160,90,0,.25)"><strong style="display:block;color:#9a5b00">متأخر أكثر من 24 ساعة: ${overdue.length}</strong>${overdueList}</div>` : ""}`;
    grid.appendChild(card);
  }

  function renderShell() {
    const main = document.querySelector("main.container"); if (!main) return null;
    main.innerHTML = `<section class="reviews-page"><div class="reviews-hero"><div><span>REPORT APPROVAL</span><h2>مراجعة واعتماد التقارير</h2><p>التقارير التي أرسلها المحررون للمراجعة قبل اعتمادها النهائي.</p></div><div class="reviews-hero-count"><strong id="reviewsCount">0</strong><small>بانتظار الاعتماد</small></div></div><div class="reviews-toolbar"><label>من<input id="reviewsFrom" type="date"></label><label>إلى<input id="reviewsTo" type="date"></label><button id="reviewsRefresh" type="button">تحديث</button><button id="reviewsClear" type="button">مسح الفلاتر</button><span id="reviewsMsg"></span><span id="reviewWhatsappAction"></span></div><div class="reviews-panel"><div class="reviews-table-wrap"><table class="reviews-table"><thead><tr><th>التقرير</th><th>التاريخ</th><th>أرسله</th><th>وقت الإرسال</th><th>النفايات</th><th>الشاحنات</th><th>السولار</th><th>الإجراء</th></tr></thead><tbody id="reviewsBody"></tbody></table></div></div></section>`;
    return main;
  }

  async function renderReviewsPage() {
    if (currentPath !== "/reviews") return;
    const user = await waitForUser(); addReviewNav(); const main = renderShell(); if (!main) return;
    if (user?.role !== "admin") { main.querySelector(".reviews-page").innerHTML = `<div class="reviews-denied"><h2>هذه الصفحة للمدير فقط</h2><a href="/">العودة للرئيسية</a></div>`; return; }

    const body = document.getElementById("reviewsBody"); const msg = document.getElementById("reviewsMsg");
    const fromInput = document.getElementById("reviewsFrom"); const toInput = document.getElementById("reviewsTo"); const countEl = document.getElementById("reviewsCount");
    const refreshBtn = document.getElementById("reviewsRefresh"); const clearBtn = document.getElementById("reviewsClear");
    const whatsappAction = document.getElementById("reviewWhatsappAction");
    let usersById = new Map();

    async function loadUsers() {
      try {
        const data = await api("/api/security/sessions");
        usersById = new Map((data.users || []).map((item) => [String(item.id), item]));
      } catch { usersById = new Map(); }
    }

    function showWhatsapp(report, type, reason = "") {
      if (!whatsappAction || !report) return;
      whatsappAction.innerHTML = "";
      const owner = usersById.get(String(report.submitted_by));
      const mobile = whatsappNumber(owner?.mobile);
      if (!mobile) {
        const note = document.createElement("small");
        note.textContent = "لا يوجد رقم جوال محفوظ لمحرر التقرير.";
        whatsappAction.appendChild(note);
        return;
      }
      const approved = type === "approved";
      const text = approved
        ? `تم اعتماد التقرير ${report.report_no} بتاريخ ${report.report_date}.`
        : `تمت إعادة التقرير ${report.report_no} بتاريخ ${report.report_date} للتعديل.${reason ? ` السبب: ${reason}` : ""}`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "v3-primary review-whatsapp-btn";
      button.textContent = approved ? "واتساب: تم الاعتماد" : "واتساب: إعادة للتعديل";
      button.onclick = () => window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      whatsappAction.appendChild(button);
    }

    await loadUsers();

    async function load() {
      try {
        refreshBtn.disabled = true; msg.textContent = "جاري التحديث..."; if (whatsappAction) whatsappAction.innerHTML = "";
        const params = new URLSearchParams(); if (fromInput.value) params.set("from", fromInput.value); if (toInput.value) params.set("to", toInput.value);
        const data = await api(`/api/reviews/pending?${params}`); const reports = data.reports || []; countEl.textContent = reports.length; addReviewNav(reports.length);
        const reportsById = new Map(reports.map((report) => [String(report.id), report]));
        body.innerHTML = reports.length ? reports.map((r) => `<tr><td><strong>${esc(r.report_no)}</strong><small>${reviewAgeHours(r) >= 24 ? `متأخر ${Math.floor(reviewAgeHours(r))} ساعة` : "مرسل للمراجعة"}</small></td><td>${esc(r.report_date)}</td><td>${esc(r.submitted_by_name || "-")}</td><td>${dt(r.submitted_at)}</td><td>${fmt(r.total_waste_tons)} طن</td><td>${fmt(r.total_trucks)}</td><td>${fmt(r.total_diesel)} لتر</td><td class="review-row-actions"><a href="/report?edit=${r.id}">فتح ومراجعة</a><button class="review-approve" data-id="${r.id}" data-no="${esc(r.report_no)}">اعتماد</button><button class="review-return" data-id="${r.id}" data-no="${esc(r.report_no)}">إعادة كمسودة</button></td></tr>`).join("") : `<tr><td colspan="8" class="reviews-empty">لا توجد تقارير بانتظار الاعتماد.</td></tr>`;
        body.querySelectorAll(".review-approve").forEach((button) => button.onclick = async () => {
          if (!confirm(`اعتماد التقرير ${button.dataset.no}؟`)) return;
          const report = reportsById.get(String(button.dataset.id));
          try {
            await api(`/api/reports/${button.dataset.id}/approve`, { method: "POST" });
            await load();
            msg.textContent = "تم اعتماد التقرير";
            showWhatsapp(report, "approved");
          } catch (error) { msg.textContent = error.message; }
        });
        body.querySelectorAll(".review-return").forEach((button) => button.onclick = async () => {
          const reason = prompt(`سبب إعادة التقرير ${button.dataset.no} كمسودة (اختياري):`, "");
          if (reason === null || !confirm("إعادة التقرير كمسودة ليتم تعديله؟")) return;
          const report = reportsById.get(String(button.dataset.id));
          try {
            await api(`/api/reports/${button.dataset.id}/reopen`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
            await load();
            msg.textContent = "تمت إعادة التقرير كمسودة";
            showWhatsapp(report, "returned", reason);
          } catch (error) { msg.textContent = error.message; }
        });
        msg.textContent = `تم التحديث — ${reports.length} تقرير`;
      } catch (error) { body.innerHTML = `<tr><td colspan="8" class="reviews-empty">${esc(error.message)}</td></tr>`; msg.textContent = error.message; }
      finally { refreshBtn.disabled = false; }
    }

    refreshBtn.addEventListener("click", load); clearBtn.addEventListener("click", () => { fromInput.value = ""; toInput.value = ""; load(); }); load();
  }

  async function init() {
    await waitForUser();
    if (window.MINYA_USER?.role === "admin") { addReviewNav(); refreshGlobalReviewCount(); }
    if (currentPath === "/reviews") renderReviewsPage();
    if (currentPath === "/") setTimeout(addDashboardReviewCard, 450);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
