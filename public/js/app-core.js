const API = "http://localhost:5001";

let editingId = null;
let archiveReports = [];

/* =========================================================
   البيانات الافتراضية
========================================================= */

function getDefaultCrews() {
  return [
    { crew_name: "سائقين جرافات واليات", crew_count: 4, notes: "" },
    { crew_name: "سائقين شحن(قلابات)", crew_count: 2, notes: "" },
    { crew_name: "عمال زراعة", crew_count: 1, notes: "" },
    { crew_name: "استقبال وتوجيه الشاحنات", crew_count: 2, notes: "" },
    { crew_name: "عمال تنظيف وتطاير داخلي", crew_count: 4, notes: "" },
    { crew_name: "عمال تنظيف تطاير خارجي", crew_count: 5, notes: "" },
  ];
}

function getDefaultOperations() {
  return [
    {
      operation_name: "مكب نفايات المنيا",
      start_time: "04:00",
      end_time: "19:00",
      vehicle_count: 0,
      quantity: 0,
      unit: "طن",
      notes: "",
    },
    {
      operation_name: "مواد التغطية (اسلوب)",
      start_time: "",
      end_time: "",
      vehicle_count: 0,
      quantity: 0,
      unit: "نقلة",
      notes: "",
    },
    {
      operation_name: "مواد التغطية (طمم)",
      start_time: "",
      end_time: "",
      vehicle_count: 0,
      quantity: 0,
      unit: "كوب",
      notes: "",
    },
    {
      operation_name: "كميات المياه للتعقيم والترطيب",
      start_time: "",
      end_time: "",
      vehicle_count: 0,
      quantity: 0,
      unit: "كوب",
      notes: "",
    },
    {
      operation_name: "عدد مرات رش المياه",
      start_time: "",
      end_time: "",
      vehicle_count: 0,
      quantity: 0,
      unit: "مرة",
      notes: "",
    },
    {
      operation_name: "كميات العصارة المرحلة",
      start_time: "",
      end_time: "",
      vehicle_count: 0,
      quantity: 0,
      unit: "كوب",
      notes: "",
    },
    {
      operation_name: "خط الفرز",
      start_time: "",
      end_time: "",
      vehicle_count: 0,
      quantity: 0,
      unit: "طن",
      notes: "",
    },
    {
      operation_name: "طمم خارجي",
      start_time: "",
      end_time: "",
      vehicle_count: 0,
      quantity: 0,
      unit: "طن",
      notes: "",
    },
  ];
}

function getDefaultStations() {
  return [
    {
      station_name: "محطة ترحيل الخليل",
      truck_count: 0,
      waste_tons: 0,
      unit: "طن",
      notes: "",
    },
    {
      station_name: "محطة ترحيل ترقوميا",
      truck_count: 0,
      waste_tons: 0,
      unit: "طن",
      notes: "",
    },
    {
      station_name: "محطة ترحيل يطا",
      truck_count: 0,
      waste_tons: 0,
      unit: "طن",
      notes: "",
    },
  ];
}

const equipmentNames = [
  "جرافة جنزير 2023",
  "جرافة جنزير 2019",
  "جرافة جنزير 2022",
  "باجر جنزير",
  "مدحلة نفايات 2024",
  "قلاب 1770",
  "قلاب 1772",
  "مدحلة 36 طن",
  "مدحلة 24 طن",
  "تركتر لانديني",
  "تركتر جندير",
  "شاحنة تنك مياه",
  "باجر عجل F428",
  "بوبكات",
  "ماكنة رش الضباب",
  "مولد الكهرباء",
];

function getDefaultEquipment() {
  return equipmentNames.map((name) => ({
    equipment_name: name,
    operating_status: "يعمل",
    status_description: "",
    working_hours: 0,
    diesel_liters: 0,
    notes: "",
  }));
}

let crews = getDefaultCrews();
let operations = getDefaultOperations();
let stations = getDefaultStations();
let equipment = getDefaultEquipment();

/* =========================================================
   عناصر الصفحة
========================================================= */

const message = document.getElementById("message");

const crewsBody =
  document.querySelector("#crewsTable tbody");

const operationsBody =
  document.querySelector("#operationsTable tbody");

const stationsBody =
  document.querySelector("#stationsTable tbody");

const equipmentBody =
  document.querySelector("#equipmentTable tbody");

const archiveBody =
  document.querySelector("#archiveTable tbody");

/* =========================================================
   أدوات
========================================================= */

function showMessage(text) {
  if (message) {
    message.textContent = text;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return "-";

  const parts = String(value).split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatTime(value) {
  return value || "-";
}

function getMonthName(monthValue) {
  if (!monthValue) return "-";

  const [year, month] =
    monthValue.split("-");

  const names = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];

  const index =
    Number(month) - 1;

  return `${names[index] || month} ${year}`;
}

/* =========================================================
   الجداول
========================================================= */

function renderCrews() {
  crewsBody.innerHTML = crews
    .map(
      (item, index) => `
      <tr>

        <td>
          ${escapeHtml(item.crew_name)}
        </td>

        <td>
          <input
            type="number"
            value="${Number(item.crew_count || 0)}"
            data-type="crew"
            data-index="${index}"
            data-field="crew_count"
          >
        </td>

        <td>
          <input
            type="text"
            value="${escapeHtml(item.notes || "")}"
            data-type="crew"
            data-index="${index}"
            data-field="notes"
          >
        </td>

      </tr>
    `
    )
    .join("");
}

function renderOperations() {
  operationsBody.innerHTML = operations
    .map(
      (item, index) => `
      <tr>

        <td>
          ${escapeHtml(item.operation_name)}
        </td>

        <td>
          <input
            type="time"
            value="${item.start_time || ""}"
            data-type="operation"
            data-index="${index}"
            data-field="start_time"
          >
        </td>

        <td>
          <input
            type="time"
            value="${item.end_time || ""}"
            data-type="operation"
            data-index="${index}"
            data-field="end_time"
          >
        </td>

        <td>
          <input
            type="number"
            step="1"
            value="${Number(item.vehicle_count || 0)}"
            data-type="operation"
            data-index="${index}"
            data-field="vehicle_count"
          >
        </td>

        <td>
          <input
            type="number"
            step="0.01"
            value="${Number(item.quantity || 0)}"
            data-type="operation"
            data-index="${index}"
            data-field="quantity"
          >
        </td>

        <td>
          ${escapeHtml(item.unit || "")}
        </td>

      </tr>
    `
    )
    .join("");
}

function renderStations() {
  stationsBody.innerHTML = stations
    .map(
      (item, index) => `
      <tr>

        <td>
          ${escapeHtml(item.station_name)}
        </td>

        <td>
          <input
            type="number"
            step="1"
            value="${Number(item.truck_count || 0)}"
            data-type="station"
            data-index="${index}"
            data-field="truck_count"
          >
        </td>

        <td>
          <input
            type="number"
            step="0.01"
            value="${Number(item.waste_tons || 0)}"
            data-type="station"
            data-index="${index}"
            data-field="waste_tons"
          >
        </td>

        <td>
          ${escapeHtml(item.unit || "طن")}
        </td>

      </tr>
    `
    )
    .join("");
}

function renderEquipment() {
  equipmentBody.innerHTML = equipment
    .map(
      (item, index) => `
      <tr>

        <td>
          ${escapeHtml(item.equipment_name)}
        </td>

        <td>

          <select
            data-type="equipment"
            data-index="${index}"
            data-field="operating_status"
          >

            <option
              ${item.operating_status === "يعمل" ? "selected" : ""}
            >
              يعمل
            </option>

            <option
              ${item.operating_status === "جاهز" ? "selected" : ""}
            >
              جاهز
            </option>

            <option
              ${
                item.operating_status === "تحت الصيانة"
                  ? "selected"
                  : ""
              }
            >
              تحت الصيانة
            </option>

            <option
              ${item.operating_status === "متعطل" ? "selected" : ""}
            >
              متعطل
            </option>

          </select>

        </td>

        <td>

          <input
            type="text"
            value="${escapeHtml(item.status_description || "")}"
            data-type="equipment"
            data-index="${index}"
            data-field="status_description"
          >

        </td>

        <td>

          <input
            type="number"
            step="0.1"
            value="${Number(item.working_hours || 0)}"
            data-type="equipment"
            data-index="${index}"
            data-field="working_hours"
          >

        </td>

        <td>

          <input
            type="number"
            step="0.1"
            value="${Number(item.diesel_liters || 0)}"
            data-type="equipment"
            data-index="${index}"
            data-field="diesel_liters"
          >

        </td>

      </tr>
    `
    )
    .join("");
}

function renderAll() {
  renderCrews();
  renderOperations();
  renderStations();
  renderEquipment();
  updateDailySummary();
}

/* =========================================================
   الحسابات اليومية
========================================================= */

function calculateTotals() {
  const landfillOperation =
    operations.find(
      (item) =>
        item.operation_name ===
        "مكب نفايات المنيا"
    );

  const landfillTrucks =
    Number(
      landfillOperation?.vehicle_count || 0
    );

  const landfillWaste =
    Number(
      landfillOperation?.quantity || 0
    );

  const stationTrucks =
    stations.reduce(
      (sum, item) =>
        sum +
        Number(item.truck_count || 0),
      0
    );

  const stationWaste =
    stations.reduce(
      (sum, item) =>
        sum +
        Number(item.waste_tons || 0),
      0
    );

  const totalDiesel =
    equipment.reduce(
      (sum, item) =>
        sum +
        Number(item.diesel_liters || 0),
      0
    );

  const totalWorkers =
    crews.reduce(
      (sum, item) =>
        sum +
        Number(item.crew_count || 0),
      0
    );

  const workingEquipment =
    equipment.filter(
      (item) =>
        item.operating_status === "يعمل"
    ).length;

  const stoppedEquipment =
    equipment.filter(
      (item) =>
        item.operating_status === "متعطل" ||
        item.operating_status === "تحت الصيانة"
    ).length;

  return {
    total_trucks:
      landfillTrucks + stationTrucks,

    total_waste_tons:
      landfillWaste + stationWaste,

    total_diesel:
      totalDiesel,

    total_workers:
      totalWorkers,

    working_equipment:
      workingEquipment,

    stopped_equipment:
      stoppedEquipment,
  };
}

function updateDailySummary() {
  const totals =
    calculateTotals();

  const values = {
    summaryWorkers:
      totals.total_workers,

    summaryTrucks:
      totals.total_trucks,

    summaryWaste:
      totals.total_waste_tons,

    summaryDiesel:
      totals.total_diesel,

    summaryWorkingEquipment:
      totals.working_equipment,

    summaryStoppedEquipment:
      totals.stopped_equipment,
  };

  Object.entries(values).forEach(
    ([id, value]) => {
      const element =
        document.getElementById(id);

      if (element) {
        element.textContent =
          formatNumber(value);
      }
    }
  );
}
