/* =========================================================
   تفاصيل مصادر محطة يطا داخل التقارير الشهرية والسنوية
   شركة عبد العزيز السعدي جزء من إجمالي محطة يطا ولا تُجمع مرة ثانية.
========================================================= */
(function(){
  const STATION_NAME = "محطة ترحيل يطا";
  const SOURCE_NAME = "شركة عبد العزيز السعدي";
  const cache = new Map();

  const number = (value) => Number(value || 0);
  const fmt = (value) => typeof window.formatNumber === "function"
    ? window.formatNumber(number(value))
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number(value));

  async function loadYear(year){
    const key = String(year || "");
    if (!/^\d{4}$/.test(key)) return { rows: [], summary: { record_count: 0, quantity_tons: 0 } };
    if (cache.has(key)) return cache.get(key);

    const params = new URLSearchParams({
      year: key,
      station_name: STATION_NAME,
      source_name: SOURCE_NAME,
    });
    const promise = fetch(`/api/station-subsources?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.message || "تعذر تحميل تفاصيل محطة يطا");
        return {
          rows: Array.isArray(data.rows) ? data.rows : [],
          summary: data.summary || { record_count: 0, quantity_tons: 0 },
        };
      })
      .catch((error) => {
        cache.delete(key);
        throw error;
      });
    cache.set(key, promise);
    return promise;
  }

  async function getMonth(monthValue){
    const match = String(monthValue || "").match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    const data = await loadYear(match[1]);
    const month = Number(match[2]);
    const row = data.rows.find((item) => Number(item.month) === month);
    if (!row) return null;
    return {
      year: Number(match[1]),
      month,
      record_count: number(row.record_count),
      quantity_tons: number(row.quantity_tons),
      detail_days: number(row.detail_days),
      included_in_station_total: Number(row.included_in_station_total) !== 0,
      source: row.source || "monthly",
      station_name: row.station_name || STATION_NAME,
      source_name: row.source_name || SOURCE_NAME,
    };
  }

  function ensureStyles(){
    if (document.getElementById("stationSubsourceReportStyles")) return;
    const style = document.createElement("style");
    style.id = "stationSubsourceReportStyles";
    style.textContent = `
      .station-subsource-report{margin:16px 0;padding:14px;border:1px solid #d9e4df;border-radius:10px;background:#f8fbf9}
      .station-subsource-report h4{margin:0 0 10px;text-align:center;font-size:16px;color:#183b2e}
      .station-subsource-report .ssr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .station-subsource-report .ssr-card{background:#fff;border:1px solid #dbe5df;border-radius:8px;padding:11px;text-align:center}
      .station-subsource-report .ssr-card span{display:block;color:#64748b;font-size:12px;margin-bottom:5px}
      .station-subsource-report .ssr-card strong{display:block;font-size:20px;color:#111827}
      .station-subsource-report .ssr-card small{display:block;margin-top:3px;color:#64748b;font-size:11px}
      .station-subsource-report .ssr-note{margin:10px 0 0;text-align:center;color:#7a5b00;font-size:12px;font-weight:700}
      .station-subsource-annual{margin:16px 0 0;padding:14px;border:1px solid #d9e4df;border-radius:10px;background:#f8fbf9}
      .station-subsource-annual h4{margin:0 0 10px;text-align:center;font-size:16px}
      .station-subsource-annual table{width:100%;border-collapse:collapse}
      .station-subsource-annual th,.station-subsource-annual td{border:1px solid #dfe8e3;padding:8px;text-align:center}
      .station-subsource-annual th{background:#edf4f0}
      @media(max-width:600px){.station-subsource-report .ssr-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  async function renderMonthly(){
    if (location.pathname.replace(/\/+$/, "") !== "/monthly") return;
    const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
    const section = document.getElementById("monthlyReportSection");
    if (!section) return;
    ensureStyles();

    let box = document.getElementById("monthlyStationSubsourceReport");
    if (!box) {
      box = document.createElement("div");
      box.id = "monthlyStationSubsourceReport";
      box.className = "station-subsource-report";
      const comparison = document.getElementById("monthlyComparison");
      if (comparison) comparison.insertAdjacentElement("beforebegin", box);
      else section.appendChild(box);
    }

    if (!monthValue) {
      box.style.display = "none";
      return;
    }

    try {
      const row = await getMonth(monthValue);
      if (!row || (row.record_count === 0 && row.quantity_tons === 0)) {
        box.style.display = "none";
        return;
      }
      box.style.display = "block";
      box.innerHTML = `
        <h4>تفصيل محطة يطا — ${SOURCE_NAME}</h4>
        <div class="ssr-grid">
          <div class="ssr-card"><span>عدد النقلات / الإرساليات</span><strong>${fmt(row.record_count)}</strong></div>
          <div class="ssr-card"><span>مجموع الكمية</span><strong>${fmt(row.quantity_tons)}</strong><small>طن</small></div>
        </div>
        <p class="ssr-note">هذه الكمية مشمولة ضمن إجمالي محطة ترحيل يطا ولا تُضاف مرة أخرى إلى إجمالي الشهر.</p>
      `;
    } catch (error) {
      console.error("تعذر عرض تفصيل محطة يطا في التقرير الشهري", error);
      box.style.display = "none";
    }
  }

  async function renderAnnual(){
    if (location.pathname.replace(/\/+$/, "") !== "/annual") return;
    const annual = document.getElementById("annualSummarySection");
    const select = document.getElementById("annualYearFilter");
    if (!annual || !select?.value) return;
    ensureStyles();

    let box = document.getElementById("annualStationSubsourceReport");
    if (!box) {
      box = document.createElement("div");
      box.id = "annualStationSubsourceReport";
      box.className = "station-subsource-annual";
      annual.appendChild(box);
    }

    try {
      const data = await loadYear(select.value);
      const rows = data.rows.filter((row) => number(row.record_count) !== 0 || number(row.quantity_tons) !== 0);
      if (!rows.length) {
        box.style.display = "none";
        return;
      }
      const names = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
      const count = rows.reduce((sum,row) => sum + number(row.record_count), 0);
      const qty = rows.reduce((sum,row) => sum + number(row.quantity_tons), 0);
      box.style.display = "block";
      box.innerHTML = `
        <h4>تفصيل محطة يطا — ${SOURCE_NAME}</h4>
        <div style="overflow:auto"><table>
          <thead><tr><th>الشهر</th><th>عدد النقلات / الإرساليات</th><th>الكمية طن</th></tr></thead>
          <tbody>${rows.map((row) => `<tr><td>${names[Number(row.month)-1] || row.month}</td><td>${fmt(row.record_count)}</td><td>${fmt(row.quantity_tons)}</td></tr>`).join("")}
          <tr><th>المجموع</th><th>${fmt(count)}</th><th>${fmt(qty)}</th></tr></tbody>
        </table></div>
        <p class="ssr-note">تفصيل فرعي مشمول ضمن إجمالي محطة ترحيل يطا ولا يُضاف إلى الإجمالي السنوي مرة ثانية.</p>
      `;
    } catch (error) {
      console.error("تعذر عرض تفصيل محطة يطا في التقرير السنوي", error);
      box.style.display = "none";
    }
  }

  function clearYearCache(year){
    if (year) cache.delete(String(year));
    else cache.clear();
  }

  window.getStationSubsourceYearSummary = loadYear;
  window.getStationSubsourceMonthSummary = getMonth;
  window.renderStationSubsourceMonthly = renderMonthly;
  window.renderStationSubsourceAnnual = renderAnnual;
  window.clearStationSubsourceReportCache = clearYearCache;

  document.addEventListener("DOMContentLoaded", () => {
    const monthInput = document.getElementById("archiveMonthFilter");
    if (monthInput) {
      monthInput.addEventListener("change", () => setTimeout(renderMonthly, 30));
      monthInput.addEventListener("input", () => setTimeout(renderMonthly, 30));
    }
    document.addEventListener("change", (event) => {
      if (event.target?.id === "annualYearFilter") setTimeout(renderAnnual, 80);
    });

    const monthlyDays = document.getElementById("monthlyDaysCount");
    if (monthlyDays && typeof MutationObserver !== "undefined") {
      new MutationObserver(() => renderMonthly()).observe(monthlyDays, { childList:true, subtree:true, characterData:true });
    }

    const watchAnnual = () => {
      const body = document.getElementById("annualSummaryBody");
      if (!body || body.dataset.subsourceObserved === "1") return false;
      body.dataset.subsourceObserved = "1";
      new MutationObserver(() => renderAnnual()).observe(body, { childList:true, subtree:true });
      renderAnnual();
      return true;
    };
    if (!watchAnnual()) {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        if (watchAnnual() || tries > 40) clearInterval(timer);
      }, 100);
    }

    setTimeout(renderMonthly, 120);
    setTimeout(renderAnnual, 220);
  });
})();
