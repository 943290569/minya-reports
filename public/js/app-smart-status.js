/* =========================================================
   المؤشرات والتنبيهات الذكية - شاشة التقرير فقط
========================================================= */

(function () {
  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
  if (currentPath !== "/report") return;

  let monthlyBenchmarks = { waste: 0, trucks: 0, diesel: 0, days: 0 };

  function number(value) {
    return Number(value || 0);
  }

  function formatValue(value) {
    return typeof formatNumber === "function" ? formatNumber(value) : number(value).toFixed(2);
  }

  async function loadMonthlyBenchmarks() {
    try {
      const response = await fetch(`${typeof API !== "undefined" ? API : ""}/api/reports`);
      const data = await response.json();
      if (!response.ok || !data.ok) return;

      const now = new Date();
      const monthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const reports = (data.reports || []).filter((report) =>
        String(report.report_date || "").startsWith(monthValue)
      );

      if (!reports.length) return;

      const waste = reports.reduce((sum, report) => sum + number(report.total_waste_tons), 0);
      const trucks = reports.reduce((sum, report) => sum + number(report.total_trucks), 0);
      const diesel = reports.reduce((sum, report) => sum + number(report.total_diesel), 0);

      monthlyBenchmarks = {
        waste: waste / reports.length,
        trucks: trucks / reports.length,
        diesel: diesel / reports.length,
        days: reports.length,
      };

      refreshSmartStatus();
    } catch (error) {
      console.error("تعذر تحميل متوسطات الشهر", error);
    }
  }

  function ensureSmartPanel() {
    if (document.getElementById("smartStatusPanel")) return;

    const actions = document.querySelector("section.actions");
    if (!actions) return;

    const panel = document.createElement("section");
    panel.id = "smartStatusPanel";
    panel.className = "panel smart-status-panel";
    panel.innerHTML = `
      <div class="smart-status-heading">
        <div>
          <span class="smart-status-kicker">SMART MONITORING</span>
          <h2>المؤشرات والتنبيهات الذكية</h2>
        </div>
        <span id="smartOverallStatus" class="smart-overall-status is-good">الوضع طبيعي</span>
      </div>

      <div class="smart-kpi-grid">
        <div class="smart-kpi-card" data-kpi="waste">
          <span>النفايات اليوم</span>
          <strong id="smartWasteValue">0</strong>
          <small id="smartWasteCompare">لا يوجد متوسط شهري بعد</small>
        </div>
        <div class="smart-kpi-card" data-kpi="trucks">
          <span>الشاحنات اليوم</span>
          <strong id="smartTrucksValue">0</strong>
          <small id="smartTrucksCompare">لا يوجد متوسط شهري بعد</small>
        </div>
        <div class="smart-kpi-card" data-kpi="diesel">
          <span>السولار اليوم</span>
          <strong id="smartDieselValue">0</strong>
          <small id="smartDieselCompare">لا يوجد متوسط شهري بعد</small>
        </div>
        <div class="smart-kpi-card" data-kpi="equipment">
          <span>حالة المعدات</span>
          <strong id="smartEquipmentValue">0 / 0</strong>
          <small id="smartEquipmentCompare">جاهزية المعدات</small>
        </div>
      </div>

      <div id="smartAlertsList" class="smart-alerts-list"></div>
    `;

    actions.parentNode.insertBefore(panel, actions);
  }

  function compareText(value, average, unit) {
    if (!average) return "لا يوجد متوسط شهري بعد";
    const percent = ((value - average) / average) * 100;
    if (Math.abs(percent) < 5) return `قريب من متوسط الشهر (${formatValue(average)} ${unit})`;
    return `${percent > 0 ? "أعلى" : "أقل"} من متوسط الشهر بـ ${formatValue(Math.abs(percent))}%`;
  }

  function setKpiState(type, state) {
    const card = document.querySelector(`.smart-kpi-card[data-kpi="${type}"]`);
    if (!card) return;
    card.classList.remove("is-good", "is-warning", "is-danger");
    card.classList.add(state);
  }

  function colorEquipmentRows() {
    document.querySelectorAll('#equipmentTable tbody tr').forEach((row, index) => {
      row.classList.remove("equipment-good", "equipment-ready", "equipment-warning", "equipment-danger");
      const status = String(equipment?.[index]?.operating_status || "");
      if (status === "يعمل") row.classList.add("equipment-good");
      else if (status === "جاهز") row.classList.add("equipment-ready");
      else if (status === "تحت الصيانة") row.classList.add("equipment-warning");
      else if (status === "متعطل") row.classList.add("equipment-danger");
    });
  }

  function buildAlerts(totals) {
    const alerts = [];
    const stopped = equipment.filter((item) => item.operating_status === "متعطل");
    const maintenance = equipment.filter((item) => item.operating_status === "تحت الصيانة");

    if (stopped.length) {
      alerts.push({ level: "danger", title: `${stopped.length} معدات متعطلة`, text: stopped.map((item) => item.equipment_name).join("، ") });
    }

    if (maintenance.length) {
      alerts.push({ level: "warning", title: `${maintenance.length} معدات تحت الصيانة`, text: maintenance.map((item) => item.equipment_name).join("، ") });
    }

    if (monthlyBenchmarks.waste && totals.total_waste_tons > monthlyBenchmarks.waste * 1.2) {
      alerts.push({ level: "warning", title: "كمية النفايات أعلى من المعتاد", text: `تجاوزت متوسط الشهر بأكثر من 20% (${formatValue(monthlyBenchmarks.waste)} طن/يوم).` });
    }

    if (monthlyBenchmarks.diesel && totals.total_diesel > monthlyBenchmarks.diesel * 1.2) {
      alerts.push({ level: "warning", title: "استهلاك السولار أعلى من المعتاد", text: `تجاوز متوسط الشهر بأكثر من 20% (${formatValue(monthlyBenchmarks.diesel)} لتر/يوم).` });
    }

    if (totals.total_waste_tons > 0 && totals.total_trucks === 0) {
      alerts.push({ level: "danger", title: "تحقق من البيانات", text: "تم تسجيل كمية نفايات بدون تسجيل عدد شاحنات." });
    }

    if (totals.total_trucks > 0 && totals.total_waste_tons === 0) {
      alerts.push({ level: "warning", title: "تحقق من البيانات", text: "تم تسجيل شاحنات بدون تسجيل كمية نفايات." });
    }

    equipment.forEach((item) => {
      const inactive = item.operating_status === "متعطل" || item.operating_status === "تحت الصيانة";
      if (inactive && (number(item.working_hours) > 0 || number(item.diesel_liters) > 0)) {
        alerts.push({
          level: "warning",
          title: `مراجعة بيانات ${item.equipment_name}`,
          text: `الحالة «${item.operating_status}» مع وجود ${number(item.working_hours) > 0 ? "ساعات عمل" : "سولار مسجل"}.`,
        });
      }
    });

    return alerts;
  }

  function renderAlerts(alerts) {
    const list = document.getElementById("smartAlertsList");
    const overall = document.getElementById("smartOverallStatus");
    if (!list || !overall) return;

    if (!alerts.length) {
      list.innerHTML = `<div class="smart-alert is-good"><strong>لا توجد تنبيهات حالية</strong><span>البيانات المدخلة وحالات المعدات تبدو طبيعية.</span></div>`;
      overall.className = "smart-overall-status is-good";
      overall.textContent = "الوضع طبيعي";
      return;
    }

    const hasDanger = alerts.some((alert) => alert.level === "danger");
    overall.className = `smart-overall-status ${hasDanger ? "is-danger" : "is-warning"}`;
    overall.textContent = hasDanger ? "يحتاج متابعة" : "يوجد تنبيه";

    list.innerHTML = alerts.map((alert) => `
      <div class="smart-alert is-${alert.level}">
        <strong>${escapeHtml(alert.title)}</strong>
        <span>${escapeHtml(alert.text)}</span>
      </div>
    `).join("");
  }

  function refreshSmartStatus() {
    ensureSmartPanel();
    if (typeof calculateTotals !== "function" || typeof equipment === "undefined") return;

    const totals = calculateTotals();
    const totalEquipment = equipment.length;
    const unavailable = equipment.filter((item) => item.operating_status === "متعطل" || item.operating_status === "تحت الصيانة").length;
    const available = totalEquipment - unavailable;

    const values = {
      smartWasteValue: `${formatValue(totals.total_waste_tons)} طن`,
      smartTrucksValue: formatValue(totals.total_trucks),
      smartDieselValue: `${formatValue(totals.total_diesel)} لتر`,
      smartEquipmentValue: `${available} / ${totalEquipment}`,
      smartWasteCompare: compareText(totals.total_waste_tons, monthlyBenchmarks.waste, "طن"),
      smartTrucksCompare: compareText(totals.total_trucks, monthlyBenchmarks.trucks, "شاحنة"),
      smartDieselCompare: compareText(totals.total_diesel, monthlyBenchmarks.diesel, "لتر"),
      smartEquipmentCompare: unavailable ? `${unavailable} غير متاحة حاليًا` : "جميع المعدات متاحة",
    };

    Object.entries(values).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });

    setKpiState("waste", monthlyBenchmarks.waste && totals.total_waste_tons > monthlyBenchmarks.waste * 1.2 ? "is-warning" : "is-good");
    setKpiState("trucks", "is-good");
    setKpiState("diesel", monthlyBenchmarks.diesel && totals.total_diesel > monthlyBenchmarks.diesel * 1.2 ? "is-warning" : "is-good");
    setKpiState("equipment", unavailable > 0 ? (equipment.some((item) => item.operating_status === "متعطل") ? "is-danger" : "is-warning") : "is-good");

    colorEquipmentRows();
    renderAlerts(buildAlerts(totals));
  }

  function loadStyles() {
    if (document.querySelector('link[href="smart-status.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "smart-status.css";
    document.head.appendChild(link);
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadStyles();
    ensureSmartPanel();
    refreshSmartStatus();
    loadMonthlyBenchmarks();

    document.addEventListener("input", () => setTimeout(refreshSmartStatus, 0));
    document.addEventListener("change", () => setTimeout(refreshSmartStatus, 0));

    const equipmentBody = document.querySelector("#equipmentTable tbody");
    if (equipmentBody && typeof MutationObserver !== "undefined") {
      new MutationObserver(() => setTimeout(refreshSmartStatus, 0)).observe(equipmentBody, { childList: true, subtree: true });
    }
  });

  window.refreshSmartStatus = refreshSmartStatus;
})();
