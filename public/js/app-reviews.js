/* =========================================================
   صندوق مراجعة واعتماد التقارير
========================================================= */
(function () {
  const currentPath = location.pathname.replace(/\/+$/, "") || "/";

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const fmt = (value) => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

  function dt(value) {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString("ar-EG", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return String(value); }
  }

  async function api(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || "فشل الطلب");
    return data;
  }

  async function waitForUser() {
    for (let i = 0; i < 40 && !window.MINYA_USER; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return window.MINYA_USER || null;
  }

  function addReviewNav(count = null) {
    if (window.MINYA_USER?.role !== "admin") return;
    const nav = document.querySelector(".top-header nav");
    if (!nav) return;
    let link = nav.querySelector('a[href="/reviews"]');
    if (!link) {
      link = document.createElement("a");
      link.href = "/reviews";
      link.className = "app-nav-link review-nav-link";
      nav.appendChild(link);
    }
    link.innerHTML = `المراجعة${Number.isFinite(count) && count > 0 ? `<b>${count}</b>` : ""}`;
    link.classList.toggle("active", currentPath === "/reviews");
  }

  async function addDashboardReviewCard() {
    if (currentPath !== "/" || window.MINYA_USER?.role !== "admin") return;
    try {
      const data = await api("/api/reviews/pending");
      addReviewNav(data.count || 0);
      const grid = document.querySelector(".dashboard-grid");
      if (!grid || document.getElementById("dashboardReviewCard")) return;
      const card = document.createElement("a");
      card.id = "dashboardReviewCard";
      card.className = `dashboard-card review-dashboard-card${data.count ? " has-pending" : ""}`;
      card.href = "/reviews";
      card.innerHTML = `
        <span class="dashboard-icon">✓</span>
        <h3>مراجعة واعتماد التقارير</h3>
        <p>${data.count ? `يوجد ${data.count} تقرير بانتظار المراجعة والاعتماد.` : "لا توجد تقارير بانتظار الاعتماد حاليًا."}</p>
        <strong class="review-count">${data.count || 0}</strong>
      `;
      grid.appendChild(card);
    } catch {}
  }

  function renderShell() {
    const main = document.querySelector("main.container");
    if (!main) return null;
    main.innerHTML = `
      <section class="reviews-page">
        <div class="reviews-hero">
          <div>
            <span>REPORT APPROVAL</span>
            <h2>مراجعة واعتماد التقارير</h2>
            <p>التقارير التي أرسلها المحررون للمراجعة قبل اعتمادها النهائي.</p>
          </div>
          <div class="reviews-hero-count"><strong id="reviewsCount">0</strong><small>بانتظار الاعتماد</small></div>
        </div>
        <div class="reviews-toolbar">
          <label>من<input id="reviewsFrom" type="date"></label>
          <label>إلى<input id="reviewsTo" type="date"></label>
          <button id="reviewsRefresh" type="button">تحديث</button>
          <button id="reviewsClear" type="button">مسح الفلاتر</button>
          <span id="reviewsMsg"></span>
        </div>
        <div class="reviews-panel">
          <div class="reviews-table-wrap">
            <table class="reviews-table">
              <thead><tr><th>التقرير</th><th>التاريخ</th><th>أرسله</th><th>وقت الإرسال</th><th>النفايات</th><th>الشاحنات</th><th>السولار</th><th>الإجراء</th></tr></thead>
              <tbody id="reviewsBody"></tbody>
            </table>
          </div>
        </div>
      </section>`;
    return main;
  }

  async function renderReviewsPage() {
    if (currentPath !== "/reviews") return;
    const user = await waitForUser();
    addReviewNav();
    const main = renderShell();
    if (!main) return;

    if (user?.role !== "admin") {
      main.querySelector(".reviews-page").innerHTML = `<div class="reviews-denied"><h2>هذه الصفحة للمدير فقط</h2><a href="/">العودة للرئيسية</a></div>`;
      return;
    }

    const body = document.getElementById("reviewsBody");
    const msg = document.getElementById("reviewsMsg");

    async function load() {
      try {
        msg.textContent = "جاري التحديث...";
        const params = new URLSearchParams();
        if (reviewsFrom.value) params.set("from", reviewsFrom.value);
        if (reviewsTo.value) params.set("to", reviewsTo.value);
        const data = await api(`/api/reviews/pending?${params}`);
        const reports = data.reports || [];
        reviewsCount.textContent = reports.length;
        addReviewNav(reports.length);
        body.innerHTML = reports.length ? reports.map((r) => `
          <tr>
            <td><strong>${esc(r.report_no)}</strong><small>مرسل للمراجعة</small></td>
            <td>${esc(r.report_date)}</td>
            <td>${esc(r.submitted_by_name || "-")}</td>
            <td>${dt(r.submitted_at)}</td>
            <td>${fmt(r.total_waste_tons)} طن</td>
            <td>${fmt(r.total_trucks)}</td>
            <td>${fmt(r.total_diesel)} لتر</td>
            <td class="review-row-actions">
              <a href="/report?edit=${r.id}">فتح ومراجعة</a>
              <button class="review-approve" data-id="${r.id}" data-no="${esc(r.report_no)}">اعتماد</button>
              <button class="review-return" data-id="${r.id}" data-no="${esc(r.report_no)}">إعادة كمسودة</button>
            </td>
          </tr>`).join("") : `<tr><td colspan="8" class="reviews-empty">لا توجد تقارير بانتظار الاعتماد.</td></tr>`;

        body.querySelectorAll(".review-approve").forEach((button) => {
          button.onclick = async () => {
            if (!confirm(`اعتماد التقرير ${button.dataset.no}؟`)) return;
            try {
              await api(`/api/reports/${button.dataset.id}/approve`, { method: "POST" });
              msg.textContent = "تم اعتماد التقرير";
              load();
            } catch (error) { msg.textContent = error.message; }
          };
        });

        body.querySelectorAll(".review-return").forEach((button) => {
          button.onclick = async () => {
            const reason = prompt(`سبب إعادة التقرير ${button.dataset.no} كمسودة (اختياري):`, "");
            if (reason === null) return;
            if (!confirm("إعادة التقرير كمسودة ليتم تعديله؟")) return;
            try {
              await api(`/api/reports/${button.dataset.id}/reopen`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason }),
              });
              msg.textContent = "تمت إعادة التقرير كمسودة";
              load();
            } catch (error) { msg.textContent = error.message; }
          };
        });
        msg.textContent = `تم التحديث — ${reports.length} تقرير`;
      } catch (error) {
        body.innerHTML = `<tr><td colspan="8" class="reviews-empty">${esc(error.message)}</td></tr>`;
        msg.textContent = error.message;
      }
    }

    reviewsRefresh.onclick = load;
    reviewsClear.onclick = () => { reviewsFrom.value = ""; reviewsTo.value = ""; load(); };
    load();
  }

  async function init() {
    await waitForUser();
    if (window.MINYA_USER?.role === "admin") addReviewNav();
    if (currentPath === "/reviews") renderReviewsPage();
    if (currentPath === "/") setTimeout(addDashboardReviewCard, 450);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
