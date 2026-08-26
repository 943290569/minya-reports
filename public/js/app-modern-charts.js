/* =========================================================
   Modern monthly charts - SVG dashboard charts
========================================================= */

(function () {
  let activeMetric = "waste";
  let renderToken = 0;

  function chartNumber(value) {
    const n = Number(value || 0);
    return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  }

  function getMonthReports() {
    const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
    if (!monthValue) return [];
    return [...(window.archiveReports || archiveReports || [])]
      .filter((report) => String(report.report_date || "").startsWith(monthValue))
      .sort((a, b) => String(a.report_date || "").localeCompare(String(b.report_date || "")));
  }

  async function getMetricValues(metric, reports) {
    if (metric === "waste") return reports.map((r) => Number(r.total_waste_tons || 0));
    if (metric === "trucks") return reports.map((r) => Number(r.total_trucks || 0));

    const details = await Promise.all(
      reports.map((report) => getReport(report.id).catch(() => null))
    );
    return reports.map((report, index) => {
      const data = details[index];
      if (!data) return Number(report.total_diesel || 0);
      return (data.equipment || []).reduce(
        (sum, item) => sum + Number(item.diesel_liters || 0), 0
      );
    });
  }

  function makeTicks(maxValue) {
    const safeMax = Math.max(maxValue, 1);
    const rough = safeMax / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough || 1)));
    const residual = rough / magnitude;
    const nice = residual >= 5 ? 5 : residual >= 2 ? 2 : 1;
    const step = nice * magnitude;
    const top = Math.ceil(safeMax / step) * step;
    return [0, step, step * 2, step * 3, step * 4].filter((v) => v <= top + step / 2);
  }

  function buildSvg(metric, reports, values) {
    const settings = {
      waste: { title: "كميات النفايات اليومية", unit: "طن", type: "line", cls: "chart-waste" },
      trucks: { title: "عدد الشاحنات اليومية", unit: "شاحنة", type: "bar", cls: "chart-trucks" },
      diesel: { title: "استهلاك السولار اليومي", unit: "لتر", type: "line", cls: "chart-diesel" },
    };
    const setting = settings[metric] || settings.waste;

    const W = 980;
    const H = 380;
    const pad = { top: 28, right: 26, bottom: 52, left: 70 };
    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;
    const maxValue = Math.max(...values, 1);
    const average = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const topValue = Math.max(maxValue * 1.12, average * 1.15, 1);
    const xStep = reports.length > 1 ? innerW / (reports.length - 1) : innerW;
    const barStep = reports.length ? innerW / reports.length : innerW;
    const y = (value) => pad.top + innerH - (Number(value || 0) / topValue) * innerH;
    const x = (i) => pad.left + (reports.length > 1 ? i * xStep : innerW / 2);

    const ticks = makeTicks(topValue);
    const grid = ticks.map((tick) => {
      const yy = y(tick);
      return `
        <line class="modern-chart-grid" x1="${pad.left}" x2="${W - pad.right}" y1="${yy}" y2="${yy}" />
        <text class="modern-chart-axis-label" x="${pad.left - 12}" y="${yy + 4}" text-anchor="end">${chartNumber(tick)}</text>`;
    }).join("");

    const labelEvery = reports.length > 20 ? 5 : reports.length > 12 ? 3 : 2;
    const xLabels = reports.map((report, i) => {
      if (i % labelEvery !== 0 && i !== reports.length - 1) return "";
      return `<text class="modern-chart-x-label" x="${x(i)}" y="${H - 20}" text-anchor="middle">${String(report.report_date || "").slice(-2)}</text>`;
    }).join("");

    const avgY = y(average);
    const averageLine = `
      <line class="modern-chart-average" x1="${pad.left}" x2="${W - pad.right}" y1="${avgY}" y2="${avgY}" />
      <text class="modern-chart-average-label" x="${W - pad.right - 4}" y="${avgY - 7}" text-anchor="end">متوسط ${chartNumber(average)} ${setting.unit}</text>`;

    let series = "";
    if (setting.type === "bar") {
      const barW = Math.max(8, Math.min(30, barStep * 0.58));
      series = values.map((value, i) => {
        const xx = pad.left + i * barStep + barStep / 2 - barW / 2;
        const yy = y(value);
        const hh = pad.top + innerH - yy;
        return `<rect class="modern-chart-bar ${setting.cls}" x="${xx}" y="${yy}" width="${barW}" height="${Math.max(2, hh)}" rx="5" data-index="${i}" />`;
      }).join("");
    } else {
      const points = values.map((value, i) => `${x(i)},${y(value)}`).join(" ");
      const areaPoints = `${pad.left},${pad.top + innerH} ${points} ${x(values.length - 1)},${pad.top + innerH}`;
      series = `
        <polygon class="modern-chart-area ${setting.cls}" points="${areaPoints}" />
        <polyline class="modern-chart-line ${setting.cls}" points="${points}" />
        ${values.map((value, i) => `<circle class="modern-chart-point ${setting.cls}" cx="${x(i)}" cy="${y(value)}" r="4.5" data-index="${i}" />`).join("")}`;
    }

    const peakIndex = values.indexOf(Math.max(...values));
    const peakValue = values[peakIndex] || 0;

    return `
      <div class="modern-chart-shell ${setting.cls}">
        <div class="modern-chart-head">
          <div>
            <span class="modern-chart-eyebrow">${getMonthName(document.getElementById("archiveMonthFilter")?.value || "")}</span>
            <h4>${setting.title}</h4>
          </div>
          <div class="modern-chart-stats">
            <span><small>المتوسط</small><strong>${chartNumber(average)} ${setting.unit}</strong></span>
            <span><small>الأعلى</small><strong>${chartNumber(peakValue)} ${setting.unit}</strong></span>
          </div>
        </div>
        <div class="modern-chart-canvas-wrap">
          <svg class="modern-chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${setting.title}">
            ${grid}
            ${averageLine}
            ${series}
            ${xLabels}
            <text class="modern-chart-axis-title" transform="translate(18 ${H / 2}) rotate(-90)" text-anchor="middle">${setting.unit}</text>
          </svg>
          <div class="modern-chart-tooltip" hidden></div>
        </div>
      </div>`;
  }

  function attachTooltip(target, reports, values, metric) {
    const tooltip = target.querySelector(".modern-chart-tooltip");
    const svg = target.querySelector(".modern-chart-svg");
    if (!tooltip || !svg) return;

    const units = { waste: "طن", trucks: "شاحنة", diesel: "لتر" };
    const unit = units[metric] || "";

    const show = (event) => {
      const index = Number(event.target.dataset.index);
      if (!Number.isInteger(index) || !reports[index]) return;
      const rect = target.getBoundingClientRect();
      tooltip.hidden = false;
      tooltip.innerHTML = `<strong>${formatDate(reports[index].report_date)}</strong><span>${chartNumber(values[index])} ${unit}</span>`;
      tooltip.style.left = `${Math.min(Math.max(event.clientX - rect.left, 70), rect.width - 70)}px`;
      tooltip.style.top = `${Math.max(event.clientY - rect.top - 58, 8)}px`;
    };

    svg.querySelectorAll("[data-index]").forEach((node) => {
      node.addEventListener("mousemove", show);
      node.addEventListener("mouseenter", show);
      node.addEventListener("mouseleave", () => { tooltip.hidden = true; });
    });
  }

  function setActiveButton(metric) {
    document.querySelectorAll("[data-monthly-chart-metric]").forEach((button) => {
      button.classList.toggle("modern-chart-active", button.dataset.monthlyChartMetric === metric);
    });
  }

  async function renderModernMonthlyChart(metric = activeMetric) {
    activeMetric = metric;
    const token = ++renderToken;
    const target = document.getElementById("monthlyWasteChart");
    if (!target) return;

    const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
    setActiveButton(metric);

    if (!monthValue) {
      target.innerHTML = '<div class="monthly-chart-empty">اختر شهرًا لعرض الرسم البياني.</div>';
      return;
    }

    const reports = getMonthReports();
    if (!reports.length) {
      target.innerHTML = '<div class="monthly-chart-empty">لا توجد بيانات لهذا الشهر.</div>';
      return;
    }

    target.innerHTML = '<div class="modern-chart-loading">جاري تجهيز الرسم البياني...</div>';
    const values = await getMetricValues(metric, reports);
    if (token !== renderToken) return;

    target.innerHTML = buildSvg(metric, reports, values);
    attachTooltip(target, reports, values, metric);
  }

  function rebindSwitcher() {
    const switcher = document.getElementById("monthlyChartMetricSwitcher");
    if (!switcher) return;

    const clean = switcher.cloneNode(true);
    switcher.replaceWith(clean);
    clean.querySelectorAll("[data-monthly-chart-metric]").forEach((button) => {
      button.removeAttribute("style");
      button.addEventListener("click", () => renderModernMonthlyChart(button.dataset.monthlyChartMetric));
    });
    setActiveButton(activeMetric);
  }

  function boot() {
    if (!document.querySelector('.monthly-chart')) return;
    rebindSwitcher();

    document.getElementById("archiveMonthFilter")?.addEventListener("change", () => {
      activeMetric = "waste";
      setTimeout(() => renderModernMonthlyChart("waste"), 220);
    });

    document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
      activeMetric = "waste";
      setTimeout(() => renderModernMonthlyChart("waste"), 220);
    });

    const days = document.getElementById("monthlyDaysCount");
    if (days && typeof MutationObserver !== "undefined") {
      new MutationObserver(() => {
        setTimeout(() => renderModernMonthlyChart(activeMetric), 80);
      }).observe(days, { childList: true, characterData: true, subtree: true });
    }

    setTimeout(() => renderModernMonthlyChart(activeMetric), 300);
  }

  window.renderModernMonthlyChart = renderModernMonthlyChart;
  document.addEventListener("DOMContentLoaded", boot);
})();
