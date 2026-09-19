/* Full local draft + input validation for the daily report. */
const LOCAL_REPORT_DRAFT_KEY = "minya_daily_report_draft_v2";
let localReportDraftTimer = 0;

function scheduleLocalReportDraft() {
  if ((location.pathname.replace(/\/+$/, "") || "/") !== "/report" || editingId !== null) return;
  clearTimeout(localReportDraftTimer);
  localReportDraftTimer = setTimeout(() => {
    try {
      const payload = buildPayload();
      if (!payload.report_date && !payload.notes && !payload.total_waste_tons && !payload.total_trucks && !payload.total_diesel) return;
      localStorage.setItem(LOCAL_REPORT_DRAFT_KEY, JSON.stringify({ saved_at: Date.now(), payload }));
    } catch {}
  }, 450);
}

function clearLocalReportDraft() {
  try { localStorage.removeItem(LOCAL_REPORT_DRAFT_KEY); } catch {}
}

function median(values) {
  const rows = values.map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if (!rows.length) return 0;
  const middle = Math.floor(rows.length / 2);
  return rows.length % 2 ? rows[middle] : (rows[middle - 1] + rows[middle]) / 2;
}

async function getReportInputWarnings(payload) {
  const warnings = [];
  if (Number(payload.total_waste_tons || 0) === 0) warnings.push("كمية النفايات تساوي صفرًا");
  if (Number(payload.total_trucks || 0) === 0) warnings.push("عدد الشاحنات يساوي صفرًا");
  try {
    const response = await fetch("/api/reports", { cache:"no-store" });
    const data = await response.json();
    const prior = (Array.isArray(data.reports) ? data.reports : [])
      .filter(row => String(row.report_date || "") < payload.report_date)
      .sort((a,b)=>String(b.report_date||"").localeCompare(String(a.report_date||"")))
      .slice(0,14);
    if (prior.length >= 5) {
      const wasteMedian = median(prior.map(row=>row.total_waste_tons));
      const truckMedian = median(prior.map(row=>row.total_trucks));
      const waste = Number(payload.total_waste_tons || 0), trucks = Number(payload.total_trucks || 0);
      if (wasteMedian > 0 && waste > 0 && Math.abs(waste - wasteMedian) / wasteMedian >= 0.5) warnings.push(`كمية النفايات تختلف ${Math.round(Math.abs(waste-wasteMedian)/wasteMedian*100)}% عن وسيط آخر ${prior.length} تقارير`);
      if (truckMedian > 0 && trucks > 0 && Math.abs(trucks - truckMedian) / truckMedian >= 0.5) warnings.push(`عدد الشاحنات يختلف ${Math.round(Math.abs(trucks-truckMedian)/truckMedian*100)}% عن وسيط آخر ${prior.length} تقارير`);
    }
  } catch {}
  return warnings;
}

function restoreLocalReportDraft() {
  if ((location.pathname.replace(/\/+$/, "") || "/") !== "/report" || editingId !== null || document.getElementById("reportDate")?.value) return;
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_REPORT_DRAFT_KEY) || "null");
    if (!stored?.payload || Date.now() - Number(stored.saved_at || 0) > 48 * 3600000) return;
    const p = stored.payload;
    document.getElementById("reportDate").value = p.report_date || "";
    document.getElementById("weather").value = p.weather || "مشمس";
    document.getElementById("temperature").value = Number(p.temperature ?? 10);
    document.getElementById("startTime").value = p.start_time || "04:00";
    document.getElementById("endTime").value = p.end_time || "19:00";
    document.getElementById("notes").value = p.notes || "";
    if (Array.isArray(p.crews) && p.crews.length) crews = p.crews;
    if (Array.isArray(p.operations) && p.operations.length) operations = p.operations;
    if (Array.isArray(p.stations) && p.stations.length) stations = p.stations;
    if (Array.isArray(p.equipment) && p.equipment.length) equipment = p.equipment;
    renderAll();
    showMessage("تم استعادة مسودة محلية كاملة محفوظة خلال آخر 48 ساعة");
  } catch {}
}

/* =========================================================
   تحديث الحقول
========================================================= */

document.addEventListener(
  "input",
  (event) => {
    const element =
      event.target;

    if (!element.dataset) return;

    const type =
      element.dataset.type;

    const index =
      Number(
        element.dataset.index
      );

    const field =
      element.dataset.field;

    if (
      !type ||
      Number.isNaN(index) ||
      !field
    ) {
      return;
    }

    let value =
      element.value;

    const numericFields = [
      "crew_count",
      "vehicle_count",
      "quantity",
      "truck_count",
      "waste_tons",
      "working_hours",
      "diesel_liters",
    ];

    if (
      numericFields.includes(field)
    ) {
      value =
        Number(value || 0);
    }

    if (type === "crew") {
      crews[index][field] =
        value;
    }

    if (type === "operation") {
      operations[index][field] =
        value;
    }

    if (type === "station") {
      stations[index][field] =
        value;
    }

    if (type === "equipment") {
      equipment[index][field] =
        value;
    }

    updateDailySummary();
    scheduleLocalReportDraft();
  }
);

document.addEventListener(
  "change",
  (event) => {
    const element =
      event.target;

    if (!element.dataset) return;

    const type =
      element.dataset.type;

    const index =
      Number(
        element.dataset.index
      );

    const field =
      element.dataset.field;

    if (
      type === "equipment" &&
      !Number.isNaN(index) &&
      field
    ) {
      equipment[index][field] =
        element.value;
    }

    updateDailySummary();
    scheduleLocalReportDraft();
  }
);

document.addEventListener("input", (event) => { if (["reportDate","weather","temperature","startTime","endTime","notes"].includes(event.target?.id)) scheduleLocalReportDraft(); }, true);
document.addEventListener("change", (event) => { if (["reportDate","weather","temperature","startTime","endTime","notes"].includes(event.target?.id)) scheduleLocalReportDraft(); }, true);
document.addEventListener("DOMContentLoaded", () => setTimeout(restoreLocalReportDraft, 180), { once:true });

/* =========================================================
   Payload
========================================================= */

function buildPayload() {
  const totals =
    calculateTotals();

  return {
    report_date:
      document.getElementById(
        "reportDate"
      ).value,

    weather:
      document.getElementById(
        "weather"
      ).value,

    temperature: Number(
      document.getElementById(
        "temperature"
      ).value || 0
    ),

    start_time:
      document.getElementById(
        "startTime"
      ).value,

    end_time:
      document.getElementById(
        "endTime"
      ).value,

    total_trucks:
      totals.total_trucks,

    total_waste_tons:
      totals.total_waste_tons,

    total_diesel:
      totals.total_diesel,

    notes:
      document.getElementById(
        "notes"
      ).value,

    crews,
    operations: operations.map(({ start_time, end_time, ...item }) => item),
    stations,
    equipment,
  };
}

/* =========================================================
   حفظ وتحديث
========================================================= */

async function saveReport() {
  try {
    const wasEditing =
      editingId !== null;

    showMessage(
      wasEditing
        ? "جاري تحديث التقرير..."
        : "جاري حفظ التقرير..."
    );

    const payload =
      buildPayload();

    if (!payload.report_date) {
      showMessage(
        "أدخل تاريخ التقرير"
      );

      return;
    }

    const warnings = await getReportInputWarnings(payload);
    if (warnings.length && !confirm(`راجع القيم قبل الحفظ:\n- ${warnings.join("\n- ")}\n\nهل تريد متابعة الحفظ؟`)) {
      showMessage("تم إيقاف الحفظ للمراجعة");
      return;
    }

    const url =
      wasEditing
        ? `${API}/api/reports/${editingId}`
        : `${API}/api/reports`;

    const method =
      wasEditing
        ? "PUT"
        : "POST";

    const response =
      await fetch(
        url,
        {
          method,

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.ok
    ) {
      showMessage(
        data.message ||
          data.error ||
          "فشل حفظ التقرير"
      );

      return;
    }

    editingId =
      Number(
        data.report.id
      );

    document.getElementById(
      "saveBtn"
    ).textContent =
      "تحديث التقرير";

    updateDailySummary();
    if (!wasEditing) clearLocalReportDraft();

    if (wasEditing) {
      await loadArchive(false);

      showMessage(
        `${data.message || "تم تحديث التقرير بنجاح"}. رقم التقرير: ${
          data.report.report_no ||
          data.report.id
        }`
      );
    } else {
      showMessage(
        `${data.message || "تم حفظ التقرير بنجاح"}. رقم التقرير: ${
          data.report.report_no ||
          data.report.id
        }`
      );
    }
  } catch (error) {
    console.error(error);

    showMessage(
      "حدث خطأ أثناء الاتصال بالسيرفر"
    );
  }
}
