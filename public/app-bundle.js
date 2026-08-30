// Minya Landfill app loader
const MINYA_ASSET_VERSION = "3.3.0-20260830-v14";
const MINYA_LOADING_STARTED_AT = Date.now();
const MINYA_APPEARANCE_STORAGE_KEY = "minya_appearance_settings_v1";

function readMinyaAppearanceSettings() {
  const defaults = {
    loadingSeconds: 3,
    theme: "day",
    color: "green",
    fontSize: "normal",
    navPosition: "top",
    density: "comfortable",
    contrast: "normal",
    motion: "full",
  };

  try {
    const saved = JSON.parse(localStorage.getItem(MINYA_APPEARANCE_STORAGE_KEY) || "{}");
    const settings = { ...defaults, ...(saved && typeof saved === "object" ? saved : {}) };
    const loadingSeconds = Number(settings.loadingSeconds);
    settings.loadingSeconds = [1, 2, 3, 4, 5].includes(loadingSeconds) ? loadingSeconds : 3;
    settings.color = ["green", "blue"].includes(settings.color) ? settings.color : "green";
    return settings;
  } catch (_) {
    return defaults;
  }
}

window.MINYA_APPEARANCE_SETTINGS = readMinyaAppearanceSettings();
const MINYA_RESOLVED_THEME = window.MINYA_APPEARANCE_SETTINGS.theme === "auto"
  ? (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "night" : "day")
  : window.MINYA_APPEARANCE_SETTINGS.theme;
const MINYA_LOADING_MIN_MS = Math.min(
  5000,
  Math.max(1000, Number(window.MINYA_APPEARANCE_SETTINGS.loadingSeconds || 3) * 1000)
);

[
  ["theme", MINYA_RESOLVED_THEME],
  ["color", window.MINYA_APPEARANCE_SETTINGS.color],
  ["fontSize", window.MINYA_APPEARANCE_SETTINGS.fontSize],
  ["navPosition", window.MINYA_APPEARANCE_SETTINGS.navPosition],
  ["density", window.MINYA_APPEARANCE_SETTINGS.density],
  ["contrast", window.MINYA_APPEARANCE_SETTINGS.contrast],
  ["motion", window.MINYA_APPEARANCE_SETTINGS.motion],
].forEach(([name, value]) => {
  document.documentElement.dataset[name] = String(value || "");
});

(function mountMinyaLoadingScreen(){
  const messages = [
    "لا تنسَ ذكر الله",
    "صلِّ على النبي ﷺ",
    "سبحان الله وبحمده",
    "الحمد لله",
    "لا إله إلا الله"
  ];

  const chosen = messages[Math.floor(Math.random() * messages.length)];

  document.documentElement.classList.add("minya-app-loading");

  const style = document.createElement("style");
  style.id = "minyaLoadingStyle";
  style.textContent = `
    html.minya-app-loading {
      background: #f3f6f5 !important;
    }
    html.minya-app-loading body {
      visibility: hidden !important;
    }
    #minyaLoadingScreen {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(135deg, #f7fbf9 0%, #eef6f2 100%);
      direction: rtl;
      font-family: Tahoma, Arial, sans-serif;
      opacity: 1;
      visibility: visible !important;
    }
    #minyaLoadingScreen .minya-loading-card {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 32px 20px;
    }
    #minyaLoadingScreen .minya-loading-message {
      margin: 0;
      color: #176b4f;
      font-size: clamp(44px, 9vw, 84px);
      font-weight: 800;
      line-height: 1.35;
      letter-spacing: -.4px;
      text-align: center;
      text-wrap: balance;
    }
    #minyaLoadingScreen .minya-loading-dot {
      width: 8px;
      height: 8px;
      margin: 20px auto 0;
      border-radius: 50%;
      background: #176b4f;
      animation: minyaLoadingPulse .5s ease-in-out infinite alternate;
    }
    html[data-theme="night"] #minyaLoadingScreen {
      background: linear-gradient(135deg, #0e1714 0%, #17231f 100%);
    }
    html[data-theme="night"] #minyaLoadingScreen .minya-loading-message {
      color: #dff5ea;
    }
    html[data-theme="night"] #minyaLoadingScreen .minya-loading-dot {
      background: #75cfa9;
    }
    @keyframes minyaLoadingPulse {
      from { opacity: .25; transform: scale(.85); }
      to { opacity: .85; transform: scale(1.15); }
    }
    @media (prefers-reduced-motion: reduce) {
      #minyaLoadingScreen .minya-loading-dot { animation: none; }
    }
  `;
  document.head.appendChild(style);

  const screen = document.createElement("div");
  screen.id = "minyaLoadingScreen";
  screen.setAttribute("role", "status");
  screen.setAttribute("aria-live", "polite");
  screen.innerHTML = `
    <div class="minya-loading-card">
      <p class="minya-loading-message">${chosen}</p>
      <div class="minya-loading-dot" aria-hidden="true"></div>
    </div>
  `;

  document.documentElement.appendChild(screen);
})();


/* ===== js/app-auth.js ===== */
/* Authentication guard */
(function(){
  const publicPages=["/login.html","/setup.html"];

  function applyRoleNavigation(user){
    if(!user) return;
    const adminOnlyHrefs=["/admin","/admin.html","/reviews","/system.html","/drive-import.html"];
    document.querySelectorAll("a[href]").forEach(link=>{
      const href=link.getAttribute("href");
      if(adminOnlyHrefs.includes(href) && user.role!=="admin") link.remove();
    });
  }

  function removeUserBox(){
    document.getElementById("minyaUserBox")?.remove();
  }

  function setupAuthenticatedUI(user){
    if(!user) return;

    applyRoleNavigation(user);
    removeUserBox();

    if(!window.__MINYA_ROLE_OBSERVER__){
      let scheduled=false;
      const observer=new MutationObserver(()=>{
        if(scheduled) return;
        scheduled=true;
        requestAnimationFrame(()=>{
          scheduled=false;
          applyRoleNavigation(user);
          removeUserBox();
        });
      });
      observer.observe(document.body,{childList:true,subtree:true});
      window.__MINYA_ROLE_OBSERVER__=observer;
    }

    if(user.role==="viewer"){
      const save=document.getElementById("saveBtn");
      if(save){save.disabled=true;save.title="حساب قراءة فقط";}
    }
  }

  async function check(){
    try{
      const r=await fetch("/api/auth/status",{cache:"no-store"});
      const d=await r.json();
      const path=location.pathname;
      if(d.setupRequired && path!=="/setup.html"){ location.replace("/setup.html"); return; }
      if(!d.setupRequired && !d.authenticated && !publicPages.includes(path)){ location.replace("/login.html"); return; }
      if(d.authenticated){
        window.MINYA_USER=d.user;
        document.documentElement.dataset.userRole=d.user.role;
        if(document.readyState==="loading"){
          document.addEventListener("DOMContentLoaded",()=>setupAuthenticatedUI(d.user),{once:true});
        }else{
          setupAuthenticatedUI(d.user);
        }
      }
    }catch(e){ console.error("Auth check failed",e); }
  }
  check();
})();
;

/* ===== js/app-core.js ===== */
const API = "";

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
    { operation_name: "مكب نفايات المنيا", vehicle_count: 0, quantity: 0, unit: "طن", notes: "" },
    { operation_name: "مواد التغطية (اسلوب)", vehicle_count: 0, quantity: 0, unit: "نقلة", notes: "" },
    { operation_name: "مواد التغطية (طمم)", vehicle_count: 0, quantity: 0, unit: "كوب", notes: "" },
    { operation_name: "كميات المياه للتعقيم والترطيب", vehicle_count: 0, quantity: 0, unit: "كوب", notes: "" },
    { operation_name: "عدد مرات رش المياه", vehicle_count: 0, quantity: 0, unit: "مرة", notes: "" },
    { operation_name: "كميات العصارة المرحلة", vehicle_count: 0, quantity: 0, unit: "كوب", notes: "" },
    { operation_name: "خط الفرز", vehicle_count: 0, quantity: 0, unit: "طن", notes: "" },
    { operation_name: "طمم خارجي", vehicle_count: 0, quantity: 0, unit: "طن", notes: "" },
  ];
}

function getDefaultStations() {
  return [
    { station_name: "محطة ترحيل الخليل", truck_count: 0, waste_tons: 0, unit: "طن", notes: "" },
    { station_name: "محطة ترحيل ترقوميا", truck_count: 0, waste_tons: 0, unit: "طن", notes: "" },
    { station_name: "محطة ترحيل يطا", truck_count: 0, waste_tons: 0, unit: "طن", notes: "" },
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

const message = document.getElementById("message");
const crewsBody = document.querySelector("#crewsTable tbody");
const operationsBody = document.querySelector("#operationsTable tbody");
const stationsBody = document.querySelector("#stationsTable tbody");
const equipmentBody = document.querySelector("#equipmentTable tbody");
const archiveBody = document.querySelector("#archiveTable tbody");

function showMessage(text) {
  if (message) message.textContent = text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "-";
  const parts = String(value).split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatTime(value) {
  return value || "-";
}

function getMonthName(monthValue) {
  if (!monthValue) return "-";
  const [year, month] = monthValue.split("-");
  const names = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const index = Number(month) - 1;
  return `${names[index] || month} ${year}`;
}

function renderCrews() {
  crewsBody.innerHTML = crews.map((item, index) => `
    <tr>
      <td>${escapeHtml(item.crew_name)}</td>
      <td><input type="number" value="${Number(item.crew_count || 0)}" data-type="crew" data-index="${index}" data-field="crew_count"></td>
      <td><input type="text" value="${escapeHtml(item.notes || "")}" data-type="crew" data-index="${index}" data-field="notes"></td>
    </tr>`).join("");
}

function renderOperations() {
  operationsBody.innerHTML = operations.map((item, index) => `
    <tr>
      <td>${escapeHtml(item.operation_name)}</td>
      <td><input type="number" step="1" value="${Number(item.vehicle_count || 0)}" data-type="operation" data-index="${index}" data-field="vehicle_count"></td>
      <td><input type="number" step="0.01" value="${Number(item.quantity || 0)}" data-type="operation" data-index="${index}" data-field="quantity"></td>
      <td>${escapeHtml(item.unit || "")}</td>
    </tr>`).join("");
}

function renderStations() {
  stationsBody.innerHTML = stations.map((item, index) => `
    <tr>
      <td>${escapeHtml(item.station_name)}</td>
      <td><input type="number" step="1" value="${Number(item.truck_count || 0)}" data-type="station" data-index="${index}" data-field="truck_count"></td>
      <td><input type="number" step="0.01" value="${Number(item.waste_tons || 0)}" data-type="station" data-index="${index}" data-field="waste_tons"></td>
      <td>${escapeHtml(item.unit || "طن")}</td>
    </tr>`).join("");
}

function renderEquipment() {
  equipmentBody.innerHTML = equipment.map((item, index) => `
    <tr>
      <td>${escapeHtml(item.equipment_name)}</td>
      <td>
        <select data-type="equipment" data-index="${index}" data-field="operating_status">
          <option ${item.operating_status === "يعمل" ? "selected" : ""}>يعمل</option>
          <option ${item.operating_status === "جاهز" ? "selected" : ""}>جاهز</option>
          <option ${item.operating_status === "تحت الصيانة" ? "selected" : ""}>تحت الصيانة</option>
          <option ${item.operating_status === "متعطل" ? "selected" : ""}>متعطل</option>
        </select>
      </td>
      <td><input type="text" value="${escapeHtml(item.status_description || "")}" data-type="equipment" data-index="${index}" data-field="status_description"></td>
      <td><input type="number" step="0.1" value="${Number(item.working_hours || 0)}" data-type="equipment" data-index="${index}" data-field="working_hours"></td>
      <td><input type="number" step="0.1" value="${Number(item.diesel_liters || 0)}" data-type="equipment" data-index="${index}" data-field="diesel_liters"></td>
    </tr>`).join("");
}

function renderAll() {
  renderCrews();
  renderOperations();
  renderStations();
  renderEquipment();
  updateDailySummary();
}

function calculateTotals() {
  const landfillOperation = operations.find((item) => item.operation_name === "مكب نفايات المنيا");
  const landfillTrucks = Number(landfillOperation?.vehicle_count || 0);
  const landfillWaste = Number(landfillOperation?.quantity || 0);
  const stationTrucks = stations.reduce((sum, item) => sum + Number(item.truck_count || 0), 0);
  const stationWaste = stations.reduce((sum, item) => sum + Number(item.waste_tons || 0), 0);
  const totalDiesel = equipment.reduce((sum, item) => sum + Number(item.diesel_liters || 0), 0);
  const totalWorkers = crews.reduce((sum, item) => sum + Number(item.crew_count || 0), 0);
  const workingEquipment = equipment.filter((item) => item.operating_status === "يعمل").length;
  const stoppedEquipment = equipment.filter((item) => item.operating_status === "متعطل" || item.operating_status === "تحت الصيانة").length;

  return {
    total_trucks: landfillTrucks + stationTrucks,
    total_waste_tons: landfillWaste + stationWaste,
    total_diesel: totalDiesel,
    total_workers: totalWorkers,
    working_equipment: workingEquipment,
    stopped_equipment: stoppedEquipment,
  };
}

function updateDailySummary() {
  const totals = calculateTotals();
  const values = {
    summaryWorkers: totals.total_workers,
    summaryTrucks: totals.total_trucks,
    summaryWaste: totals.total_waste_tons,
    summaryDiesel: totals.total_diesel,
    summaryWorkingEquipment: totals.working_equipment,
    summaryStoppedEquipment: totals.stopped_equipment,
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = formatNumber(value);
  });
}

;

/* ===== js/app-form.js ===== */
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
  }
);

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

    if (wasEditing) {
      await loadArchive(false);

      showMessage(
        `تم تحديث التقرير بنجاح. رقم التقرير: ${
          data.report.report_no ||
          data.report.id
        }`
      );
    } else {
      showMessage(
        `تم حفظ التقرير بنجاح. رقم التقرير: ${
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

;

/* ===== js/app-monthly.js ===== */
/* =========================================================
   التقرير الشهري والأرشيف
========================================================= */

async function getMonthlyDetailedReports(monthValue) {
  const monthlyReports = archiveReports.filter((report) =>
    String(report.report_date || "").startsWith(monthValue)
  );

  const detailedReports = await Promise.all(
    monthlyReports.map(async (report) => {
      try {
        return await getReport(report.id);
      } catch (error) {
        console.error(`فشل تحميل التقرير ${report.id}`, error);
        return null;
      }
    })
  );

  return detailedReports.filter(Boolean);
}

function calculateMonthlyOperations(detailedReports) {
  const totals = {
    coverAslobVehicles: 0,
    coverAslobQuantity: 0,
    coverTammVehicles: 0,
    coverTammQuantity: 0,
    waterVehicles: 0,
    waterQuantity: 0,
    waterSprays: 0,
    leachateVehicles: 0,
    leachateQuantity: 0,
    sortingVehicles: 0,
    sortingQuantity: 0,
    externalTammVehicles: 0,
    externalTammQuantity: 0,
  };

  detailedReports.forEach((data) => {
    (data.operations || []).forEach((item) => {
      const name = String(item.operation_name || "").trim();
      const vehicles = Number(item.vehicle_count || 0);
      const quantity = Number(item.quantity || 0);

      if (name === "مواد التغطية (اسلوب)") {
        totals.coverAslobVehicles += vehicles;
        totals.coverAslobQuantity += quantity;
      } else if (name === "مواد التغطية (طمم)") {
        totals.coverTammVehicles += vehicles;
        totals.coverTammQuantity += quantity;
      } else if (name === "كميات المياه للتعقيم والترطيب") {
        totals.waterVehicles += vehicles;
        totals.waterQuantity += quantity;
      } else if (name === "عدد مرات رش المياه") {
        totals.waterSprays += quantity;
      } else if (name === "كميات العصارة المرحلة") {
        totals.leachateVehicles += vehicles;
        totals.leachateQuantity += quantity;
      } else if (name === "خط الفرز") {
        totals.sortingVehicles += vehicles;
        totals.sortingQuantity += quantity;
      } else if (name === "طمم خارجي") {
        totals.externalTammVehicles += vehicles;
        totals.externalTammQuantity += quantity;
      }
    });
  });

  return totals;
}

function calculateDieselFromDetailedReports(detailedReports) {
  const dieselByReportId = new Map();
  let dieselTotal = 0;

  detailedReports.forEach((data) => {
    const reportId = Number(data.report?.id || 0);
    const storedDieselRaw = data.report?.total_diesel;
    const storedDiesel = Number(storedDieselRaw);
    const equipmentDiesel = (data.equipment || []).reduce(
      (sum, item) => sum + Number(item.diesel_liters || 0),
      0
    );
    const reportDiesel = storedDieselRaw !== undefined &&
      storedDieselRaw !== null &&
      Number.isFinite(storedDiesel)
      ? storedDiesel
      : equipmentDiesel;

    dieselByReportId.set(reportId, reportDiesel);
    dieselTotal += reportDiesel;
  });

  return { dieselTotal, dieselByReportId };
}

async function buildMonthlyOperationsData() {
  const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
  if (!monthValue) return null;

  const detailedReports = await getMonthlyDetailedReports(monthValue);
  return {
    monthValue,
    detailedReports,
    operationsTotals: calculateMonthlyOperations(detailedReports),
    diesel: calculateDieselFromDetailedReports(detailedReports),
  };
}

function getPreviousMonthForArchive(monthValue) {
  const [year, month] = String(monthValue || "").split("-").map(Number);
  if (!year || !month) return "";
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatArchiveChange(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return "-";
  const percent = ((currentValue - previousValue) / previousValue) * 100;
  if (Math.abs(percent) < 0.05) return "بدون تغير";
  return `${percent > 0 ? "زيادة" : "انخفاض"} ${formatNumber(Math.abs(percent))}%`;
}

async function updateMonthlyComparison(monthValue, currentDieselTotal = null) {
  const title = document.getElementById("monthlyComparisonTitle");
  const grid = document.getElementById("monthlyComparisonGrid");
  const empty = document.getElementById("monthlyComparisonEmpty");

  if (!title || !grid || !empty) return;

  const setValue = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  if (!monthValue) {
    title.textContent = "مقارنة مع الشهر السابق";
    grid.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.textContent = "اختر شهرًا لعرض المقارنة.";
    return;
  }

  const currentReports = archiveReports.filter((report) =>
    String(report.report_date || "").startsWith(monthValue)
  );

  const previousMonth = getPreviousMonthForArchive(monthValue);
  const previousReports = archiveReports.filter((report) =>
    String(report.report_date || "").startsWith(previousMonth)
  );

  title.textContent = `مقارنة مع الشهر السابق - ${getMonthName(previousMonth)}`;

  if (!currentReports.length || !previousReports.length) {
    grid.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.textContent = "لا توجد بيانات محفوظة للشهر السابق للمقارنة.";
    return;
  }

  const currentWaste = currentReports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0);
  const currentTrucks = currentReports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0);
  const previousWaste = previousReports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0);
  const previousTrucks = previousReports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0);

  let currentDiesel = currentDieselTotal;
  if (currentDiesel === null) {
    const currentDetails = await getMonthlyDetailedReports(monthValue);
    currentDiesel = calculateDieselFromDetailedReports(currentDetails).dieselTotal;
  }

  let previousDiesel = previousReports.reduce((sum, report) => sum + Number(report.total_diesel || 0), 0);
  try {
    const previousDetails = await getMonthlyDetailedReports(previousMonth);
    previousDiesel = calculateDieselFromDetailedReports(previousDetails).dieselTotal;
  } catch (error) {
    console.error("فشل حساب سولار الشهر السابق", error);
  }

  setValue("monthlyWasteChange", formatArchiveChange(currentWaste, previousWaste));
  setValue("monthlyWasteChangeValues", `${formatNumber(previousWaste)} ← ${formatNumber(currentWaste)} طن`);
  setValue("monthlyTrucksChange", formatArchiveChange(currentTrucks, previousTrucks));
  setValue("monthlyTrucksChangeValues", `${formatNumber(previousTrucks)} ← ${formatNumber(currentTrucks)}`);
  setValue("monthlyDieselChange", formatArchiveChange(currentDiesel, previousDiesel));
  setValue("monthlyDieselChangeValues", `${formatNumber(previousDiesel)} ← ${formatNumber(currentDiesel)} لتر`);

  empty.classList.add("hidden");
  grid.classList.remove("hidden");
}

function calculateMonthlyReport() {
  const monthValue = document.getElementById("archiveMonthFilter")?.value || "";

  if (!monthValue) {
    return {
      month: "",
      reports: [],
      days: 0,
      wasteTotal: 0,
      wasteAverage: 0,
      trucksTotal: 0,
      trucksAverage: 0,
      dieselTotal: 0,
      dieselAverage: 0,
      maxWaste: 0,
      maxWasteDate: "-",
      minWaste: 0,
      minWasteDate: "-",
    };
  }

  const reports = archiveReports.filter((report) =>
    String(report.report_date || "").startsWith(monthValue)
  );
  const days = reports.length;
  const wasteTotal = reports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0);
  const trucksTotal = reports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0);
  const dieselTotal = reports.reduce((sum, report) => sum + Number(report.total_diesel || 0), 0);

  let maxReport = null;
  let minReport = null;
  if (reports.length) {
    maxReport = reports.reduce((max, report) =>
      Number(report.total_waste_tons || 0) > Number(max.total_waste_tons || 0) ? report : max
    );
    minReport = reports.reduce((min, report) =>
      Number(report.total_waste_tons || 0) < Number(min.total_waste_tons || 0) ? report : min
    );
  }

  return {
    month: monthValue,
    reports,
    days,
    wasteTotal,
    wasteAverage: days ? wasteTotal / days : 0,
    trucksTotal,
    trucksAverage: days ? trucksTotal / days : 0,
    dieselTotal,
    dieselAverage: days ? dieselTotal / days : 0,
    maxWaste: maxReport ? Number(maxReport.total_waste_tons || 0) : 0,
    maxWasteDate: maxReport ? maxReport.report_date : "-",
    minWaste: minReport ? Number(minReport.total_waste_tons || 0) : 0,
    minWasteDate: minReport ? minReport.report_date : "-",
  };
}

async function updateMonthlySummary() {
  const monthly = calculateMonthlyReport();
  const setValue = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  setValue("monthlyDaysCount", formatNumber(monthly.days));
  setValue("monthlyWasteTotal", formatNumber(monthly.wasteTotal));
  setValue("monthlyWasteAverage", formatNumber(monthly.wasteAverage));
  setValue("monthlyTrucksTotal", formatNumber(monthly.trucksTotal));
  setValue("monthlyTrucksAverage", formatNumber(monthly.trucksAverage));
  setValue("monthlyMaxWaste", formatNumber(monthly.maxWaste));
  setValue("monthlyMaxWasteDate", monthly.maxWasteDate === "-" ? "-" : formatDate(monthly.maxWasteDate));
  setValue("monthlyMinWaste", formatNumber(monthly.minWaste));
  setValue("monthlyMinWasteDate", monthly.minWasteDate === "-" ? "-" : formatDate(monthly.minWasteDate));

  if (!monthly.month || !monthly.reports.length) {
    setValue("monthlyDieselTotal", "0");
    setValue("monthlyDieselAverage", "0");
    await updateMonthlyComparison(monthly.month, 0);
    return;
  }

  setValue("monthlyDieselTotal", formatNumber(monthly.dieselTotal));
  setValue("monthlyDieselAverage", formatNumber(monthly.dieselAverage));
  await updateMonthlyComparison(monthly.month, monthly.dieselTotal);
}

async function refreshArchiveDiesel(filteredReports) {
  const target = document.getElementById("archiveDieselTotal");
  if (!target) return;
  if (!filteredReports.length) {
    target.textContent = "0";
    return;
  }

  const dieselTotal = filteredReports.reduce(
    (sum, report) => sum + Number(report.total_diesel || 0),
    0
  );
  target.textContent = formatNumber(dieselTotal);
}

function goToEditReport(id) {
  window.location.href = `/report?edit=${encodeURIComponent(id)}`;
}

function renderArchiveReports() {
  const dateFilter = document.getElementById("archiveDateFilter")?.value || "";
  const monthFilter = document.getElementById("archiveMonthFilter")?.value || "";
  let filteredReports = [...archiveReports];

  if (dateFilter) filteredReports = filteredReports.filter((report) => report.report_date === dateFilter);
  if (monthFilter) {
    filteredReports = filteredReports.filter((report) =>
      String(report.report_date || "").startsWith(monthFilter)
    );
  }

  const wasteTotal = filteredReports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0);
  const trucksTotal = filteredReports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0);
  const dieselFallback = filteredReports.reduce((sum, report) => sum + Number(report.total_diesel || 0), 0);

  document.getElementById("archiveReportsCount").textContent = filteredReports.length;
  document.getElementById("archiveWasteTotal").textContent = formatNumber(wasteTotal);
  document.getElementById("archiveTrucksTotal").textContent = formatNumber(trucksTotal);
  document.getElementById("archiveDieselTotal").textContent = formatNumber(dieselFallback);

  archiveBody.innerHTML = filteredReports.length === 0
    ? `<tr><td colspan="6">لا توجد تقارير مطابقة</td></tr>`
    : filteredReports.map((report) => `
      <tr>
        <td>${escapeHtml(report.report_no)}</td>
        <td>${formatDate(report.report_date)}</td>
        <td>${formatNumber(report.total_waste_tons)}</td>
        <td>${formatNumber(report.total_trucks)}</td>
        <td>${formatNumber(report.total_diesel)}</td>
        <td>
          <button class="archive-open" onclick="openReport(${report.id})">فتح</button>
          <button class="role-editor-action archive-edit" onclick="goToEditReport(${report.id})">تعديل</button>
          <button class="archive-print" onclick="printReport(${report.id})">طباعة</button>
          <button class="role-admin-action" onclick="deleteReport(${report.id})" style="background:#b91c1c">حذف</button>
        </td>
      </tr>`).join("");

  refreshArchiveDiesel(filteredReports);
  updateMonthlySummary();
  if (typeof window.applyRoleAwareUI === "function") window.applyRoleAwareUI();
}

async function loadArchive(showStatus = true) {
  try {
    if (showStatus) showMessage("جاري تحميل الأرشيف...");

    const response = await fetch(`${API}/api/reports`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      showMessage(data.message || "فشل تحميل الأرشيف");
      return;
    }

    archiveReports = data.reports || [];
    renderArchiveReports();
    document.getElementById("archiveSection").classList.remove("hidden");
    if (showStatus) showMessage(`تم تحميل ${archiveReports.length} تقرير`);
  } catch (error) {
    console.error(error);
    showMessage("حدث خطأ أثناء تحميل الأرشيف");
  }
}

/* =========================================================
   V3.2 - تحميل بيانات الشهر فقط
========================================================= */

async function loadMonthlyArchiveData(showStatus = false) {
  try {
    const monthInput = document.getElementById("archiveMonthFilter");
    if (!monthInput) return;

    if (!monthInput.value) {
      const now = new Date();
      monthInput.value =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    const month = monthInput.value;
    const previousMonth = getPreviousMonthForArchive(month);

    if (showStatus) showMessage("جاري تحميل التقرير الشهري...");

    const [currentResponse, previousResponse] = await Promise.all([
      fetch(`${API}/api/monthly-summary?month=${encodeURIComponent(month)}`),
      fetch(`${API}/api/monthly-summary?month=${encodeURIComponent(previousMonth)}`)
    ]);

    const current = await currentResponse.json();
    const previous = await previousResponse.json();

    if (!currentResponse.ok || !current.ok) {
      throw new Error(current.message || "فشل تحميل الشهر");
    }

    archiveReports = [
      ...(current.reports || []),
      ...((previousResponse.ok && previous.ok) ? (previous.reports || []) : [])
    ];

    renderArchiveReports();
    await updateMonthlySummary();

    if (typeof renderMonthlyMetricChart === "function") {
      await renderMonthlyMetricChart("waste");
    }

    document.getElementById("archiveSection")?.classList.remove("hidden");

    if (showStatus) {
      showMessage(`تم تحميل ${current.days || 0} يومًا من الشهر`);
    }
  } catch (error) {
    console.error(error);
    showMessage("تعذر تحميل التقرير الشهري");
  }
}

document.getElementById("archiveMonthFilter")?.addEventListener("change", () => {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/monthly") {
    loadMonthlyArchiveData(false);
  }
});

window.loadMonthlyArchiveData = loadMonthlyArchiveData;

;

/* ===== js/app-edit.js ===== */
/* =========================================================
   تقرير كامل
========================================================= */

async function getReport(id) {
  const response = await fetch(`${API}/api/reports/${id}`);
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.message || data.error || "فشل تحميل التقرير");
  }
  return data;
}

function ensureEditBanner(reportNo = "") {
  let banner = document.getElementById("reportEditBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "reportEditBanner";
    banner.className = "report-edit-banner no-print";
    const main = document.querySelector("main.container");
    const firstPanel = main?.querySelector("section.panel");
    if (main && firstPanel) main.insertBefore(banner, firstPanel);
  }
  if (!banner) return;
  banner.innerHTML = `
    <div>
      <span>وضع التعديل</span>
      <strong>${escapeHtml(reportNo || "تقرير محفوظ")}</strong>
    </div>
    <div class="report-edit-actions">
      <a href="/archive">العودة للأرشيف</a>
      <button type="button" id="cancelReportEditBtn">إلغاء التعديل</button>
    </div>
  `;
  const cancel = document.getElementById("cancelReportEditBtn");
  if (cancel) cancel.onclick = () => { window.location.href = "/report"; };
}

function clearEditBanner() {
  document.getElementById("reportEditBanner")?.remove();
}

async function editReport(id) {
  try {
    if (window.MINYA_USER?.role === "viewer") {
      showMessage("هذا الحساب للقراءة فقط ولا يمكنه تعديل التقارير");
      return;
    }

    showMessage("جاري تحميل التقرير للتعديل...");
    const data = await getReport(id);
    editingId = Number(id);

    document.getElementById("reportDate").value = data.report.report_date || "";
    document.getElementById("weather").value = data.report.weather || "";
    document.getElementById("temperature").value = Number(data.report.temperature || 0);
    document.getElementById("startTime").value = data.report.start_time || "";
    document.getElementById("endTime").value = data.report.end_time || "";
    document.getElementById("notes").value = data.report.notes || "";

    crews = data.crews.map((item) => ({
      crew_name: item.crew_name,
      crew_count: Number(item.crew_count || 0),
      notes: item.notes || "",
    }));

    operations = data.operations.map((item) => ({
      operation_name: item.operation_name,
      start_time: item.start_time || "",
      end_time: item.end_time || "",
      vehicle_count: Number(item.vehicle_count || 0),
      quantity: Number(item.quantity || 0),
      unit: item.unit || "",
      notes: item.notes || "",
    }));

    stations = data.stations.map((item) => ({
      station_name: item.station_name,
      truck_count: Number(item.truck_count || 0),
      waste_tons: Number(item.waste_tons || 0),
      unit: item.unit || "طن",
      notes: item.notes || "",
    }));

    equipment = data.equipment.map((item) => ({
      equipment_name: item.equipment_name,
      operating_status: item.operating_status || "يعمل",
      status_description: item.status_description || "",
      working_hours: Number(item.working_hours || 0),
      diesel_liters: Number(item.diesel_liters || 0),
      notes: item.notes || "",
    }));

    renderAll();
    document.getElementById("saveBtn").textContent = "تحديث التقرير";
    ensureEditBanner(data.report.report_no);
    if (typeof window.refreshReportAttachments === "function") {
      window.refreshReportAttachments(editingId);
    }
    if (typeof window.refreshSmartStatus === "function") {
      window.refreshSmartStatus();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    showMessage(`أنت تعدل التقرير: ${data.report.report_no}`);
  } catch (error) {
    console.error(error);
    showMessage(error.message);
  }
}

async function loadEditFromQuery() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/report") return;
  const id = Number(new URLSearchParams(window.location.search).get("edit") || 0);
  if (!id) {
    clearEditBanner();
    return;
  }

  const waitForAuth = async () => {
    for (let i = 0; i < 30 && !window.MINYA_USER; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (window.MINYA_USER?.role === "viewer") {
      showMessage("هذا الحساب للقراءة فقط");
      setTimeout(() => { window.location.href = "/archive"; }, 700);
      return;
    }
    await editReport(id);
  };

  waitForAuth();
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(loadEditFromQuery, 120);
});

;

/* ===== js/app-print-daily.js ===== */
/* =========================================================
   التقرير اليومي الرسمي
========================================================= */

function buildFullReportHtml(data, autoPrint = false) {
  const report = data.report;
  const totalWorkers = data.crews.reduce((sum, item) => sum + Number(item.crew_count || 0), 0);
  const totalDiesel = data.equipment.reduce((sum, item) => sum + Number(item.diesel_liters || 0), 0);

  const crewRows = data.crews.map((item) => `
      <tr><td>${escapeHtml(item.crew_name)}</td><td>${formatNumber(item.crew_count)}</td><td>${escapeHtml(item.notes || "-")}</td></tr>`).join("");

  const operationRows = data.operations.map((item) => `
      <tr><td>${escapeHtml(item.operation_name)}</td><td>${formatNumber(item.vehicle_count)}</td><td>${formatNumber(item.quantity)}</td><td>${escapeHtml(item.unit || "")}</td></tr>`).join("");

  const stationRows = data.stations.map((item) => `
      <tr><td>${escapeHtml(item.station_name)}</td><td>${formatNumber(item.truck_count)}</td><td>${formatNumber(item.waste_tons)}</td><td>${escapeHtml(item.unit || "طن")}</td></tr>`).join("");

  const equipmentRows = data.equipment.map((item) => `
      <tr><td>${escapeHtml(item.equipment_name)}</td><td>${escapeHtml(item.operating_status || "-")}</td><td>${escapeHtml(item.status_description || "-")}</td><td>${formatNumber(item.working_hours)}</td><td>${formatNumber(item.diesel_liters)}</td></tr>`).join("");

  const previewAttachments = !autoPrint ? `
  <section class="preview-attachments">
    <h2>مرفقات التقرير</h2>
    ${(Array.isArray(data.attachments) && data.attachments.length)
      ? data.attachments.map((item) => `
        <div class="preview-attachment-row">
          <span>${escapeHtml(item.original_name || "مرفق")}</span>
          <a href="/api/attachments/${Number(item.id)}/download" target="_blank" rel="noopener">فتح</a>
        </div>`).join("")
      : '<div class="preview-attachments-empty">لا توجد مرفقات لهذا التقرير.</div>'}
  </section>` : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(report.report_no)}</title>
<style>
@page { size: A4 portrait; margin: 4mm; }
* { box-sizing: border-box; }
html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
body { font-family: Arial, Tahoma, sans-serif; direction: rtl; color: #111; background: white; }
.report { width: 202mm; height: 289mm; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; }
.official-header { width: 210mm; height: 30mm; margin-right: -4mm; margin-left: -4mm; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.official-header img { width: 210mm; height: 30mm; display: block; object-fit: fill; }
.report-content { width: 200mm; margin-right: 1mm; margin-left: 1mm; flex: 1 1 auto; min-height: 0; overflow: visible; display: flex; flex-direction: column; transform-origin: top right; }
.report-title { text-align: center; border-top: 1px solid #444; border-bottom: 1px solid #444; padding: 1.5mm 1mm; margin-bottom: 1mm; }
.report-title h1 { margin: 0; font-size: 13px; }
.report-number { direction: ltr; margin-top: 1mm; font-size: 9px; font-weight: bold; }
.info-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1mm; margin-bottom: 1mm; }
.info-box { border: 1px solid #444; text-align: center; padding: 1mm 0.5mm; }
.info-box span { display: block; font-size: 8px; color: #555; margin-bottom: 0.5mm; }
.info-box strong { font-size: 9px; }
.section-title { background: #eeeeee; border: 1px solid #444; text-align: center; font-weight: bold; font-size: 9.5px; padding: 0.7mm; margin: 0.8mm 0 0.5mm; }
table { width: 100%; max-width: 100%; margin: 0; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #555; padding: calc(0.55mm + 0.5px) 0.7mm; text-align: center; vertical-align: middle; font-size: 9px; line-height: 1.05; overflow-wrap: anywhere; word-break: normal; }
th { background: #f5f5f5; font-weight: bold; }
.totals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1mm; margin: 1mm 0; }
.total-box { border: 1px solid #444; text-align: center; padding: 1mm; }
.total-box span { display: block; font-size: 9.5px; color: #555; }
.total-box strong { display: block; font-size: 10.5px; margin-top: 0.5mm; }
.notes { border: 1px solid #444; min-height: 9mm; padding: 1mm; font-size: 9.5px; white-space: pre-wrap; }
.official-footer { width: 210mm; height: 22mm; margin-right: -10mm; margin-left: -4mm; margin-top: auto; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; flex-shrink: 0; }
.official-footer img { width: 210mm; height: 22mm; display: block; object-fit: fill; }
.preview-attachments { width: min(202mm, calc(100% - 24px)); margin: 18px auto 32px; padding: 14px; border: 1px solid #d7dfda; border-radius: 12px; background: #fff; }
.preview-attachments h2 { margin: 0 0 12px; font-size: 16px; }
.preview-attachment-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid #edf0ee; }
.preview-attachment-row:first-of-type { border-top: 0; }
.preview-attachment-row span { min-width: 0; overflow-wrap: anywhere; }
.preview-attachment-row a { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; min-width: 70px; padding: 9px 14px; border-radius: 9px; background: #176b4f; color: #fff; text-decoration: none; font-weight: bold; }
.preview-attachments-empty { color: #68746e; }
@media(max-width:560px){.preview-attachment-row{align-items:stretch;flex-direction:column}.preview-attachment-row a{width:100%}}
@media print { html, body { width: 202mm; height: 289mm; overflow: hidden; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .report { width: 202mm; height: 289mm; margin: 0; overflow: hidden; } .preview-attachments { display:none!important; } table, tr, th, td { page-break-inside: avoid; } }
</style>
</head>
<body>
<div class="report">
  <div class="official-header"><img src="/assets/header.png" alt="الترويسة الرسمية"></div>
  <div class="report-content">
    <div class="report-title"><h1>التقرير اليومي لمهام العمل داخل مكب المنيا</h1><div class="report-number">${escapeHtml(report.report_no)}</div></div>
    <div class="info-grid">
      <div class="info-box"><span>التاريخ</span><strong>${formatDate(report.report_date)}</strong></div>
      <div class="info-box"><span>حالة الطقس</span><strong>${escapeHtml(report.weather || "-")}</strong></div>
      <div class="info-box"><span>درجة الحرارة</span><strong>${formatNumber(report.temperature)}</strong></div>
      <div class="info-box"><span>وقت البداية</span><strong>${formatTime(report.start_time)}</strong></div>
      <div class="info-box"><span>وقت النهاية</span><strong>${formatTime(report.end_time)}</strong></div>
    </div>
    <div class="section-title">شؤون الموظفين</div>
    <table><thead><tr><th>طواقم العمل</th><th>العدد</th><th>الملاحظات</th></tr></thead><tbody>${crewRows}<tr><th>المجموع</th><th>${formatNumber(totalWorkers)}</th><th>-</th></tr></tbody></table>
    <div class="section-title">العمليات</div>
    <table><thead><tr><th>العملية</th><th>عدد المركبات</th><th>الكمية</th><th>الوحدة</th></tr></thead><tbody>${operationRows}</tbody></table>
    <div class="section-title">محطات الترحيل</div>
    <table><thead><tr><th>المحطة</th><th>عدد الشاحنات</th><th>الكمية</th><th>الوحدة</th></tr></thead><tbody>${stationRows}</tbody></table>
    <div class="section-title">كميات النفايات الواردة لمكب المنيا</div>
    <div class="totals">
      <div class="total-box"><span>عدد الشاحنات النهائي</span><strong>${formatNumber(report.total_trucks)}</strong></div>
      <div class="total-box"><span>كمية النفايات النهائية</span><strong>${formatNumber(report.total_waste_tons)} طن</strong></div>
      <div class="total-box"><span>عدد العاملين</span><strong>${formatNumber(totalWorkers)}</strong></div>
      <div class="total-box"><span>مجموع السولار</span><strong>${formatNumber(totalDiesel)} لتر</strong></div>
    </div>
    <div class="section-title">تقرير الصيانة اليومي</div>
    <table><thead><tr><th>اسم الآلية</th><th>حالة الآلية</th><th>وصف حالة الآلية</th><th>ساعات العمل</th><th>كمية السولار</th></tr></thead><tbody>${equipmentRows}<tr><th colspan="4">مجموع كمية السولار للمعدات السابقة</th><th>${formatNumber(totalDiesel)}</th></tr></tbody></table>
    <div class="section-title">الملاحظات</div>
    <div class="notes">${escapeHtml(report.notes || "-")}</div>
  </div>
  <div class="official-footer"><img src="/assets/footer.png" alt="التذييل الرسمي"></div>
</div>
${previewAttachments}
<script>
function fitDailyReport(){
  const report=document.querySelector('.report');
  const header=document.querySelector('.official-header');
  const footer=document.querySelector('.official-footer');
  const content=document.querySelector('.report-content');
  if(!report||!header||!footer||!content)return;
  content.style.transform='none';
  content.style.width='200mm';
  const baseWidth=Math.max(1,content.clientWidth);
  const available=Math.max(1,report.clientHeight-header.offsetHeight-footer.offsetHeight);
  const needed=Math.max(1,content.scrollHeight);
  const scale=Math.min(1,available/needed);
  if(scale<0.999){
    content.style.width=(baseWidth/scale)+'px';
    content.style.transform='scale('+scale+')';
  }
}
window.onload=function(){
  const images=Array.from(document.images);
  Promise.all(images.map(function(img){if(img.complete){return Promise.resolve();}return new Promise(function(resolve){img.onload=resolve;img.onerror=resolve;});})).then(function(){
    requestAnimationFrame(function(){
      fitDailyReport();
      ${autoPrint ? "setTimeout(function(){window.print();},300);" : ""}
    });
  });
};
<\/script>
</body>
</html>`;
}

async function openReport(id) {
  try {
    const data = await getReport(id);
    const popup = window.open("", "_blank");
    if (!popup) {
      showMessage("المتصفح منع فتح نافذة التقرير");
      return;
    }
    popup.document.write(buildFullReportHtml(data, false));
    popup.document.close();
    showMessage("تم فتح التقرير");
  } catch (error) {
    console.error(error);
    showMessage(error.message);
  }
}

async function printReport(id) {
  try {
    const data = await getReport(id);
    const popup = window.open("", "_blank");
    if (!popup) {
      showMessage("المتصفح منع نافذة الطباعة");
      return;
    }
    popup.document.write(buildFullReportHtml(data, true));
    popup.document.close();
  } catch (error) {
    console.error(error);
    showMessage(error.message);
  }
}

;

/* ===== js/app-print-monthly.js ===== */
/* =========================================================
   بناء التقرير الشهري
========================================================= */

function getPreviousMonthValue(monthValue) {
  const [year, month] = String(monthValue || "").split("-").map(Number);
  if (!year || !month) return "";
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function calculateChangePercent(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return null;
  return ((currentValue - previousValue) / previousValue) * 100;
}

function formatChangeText(current, previous) {
  const percent = calculateChangePercent(current, previous);
  if (percent === null) return "-";
  if (Math.abs(percent) < 0.05) return "بدون تغير";
  return `${percent > 0 ? "زيادة" : "انخفاض"} ${formatNumber(Math.abs(percent))}%`;
}

async function buildPreviousMonthComparison(monthValue) {
  const previousMonth = getPreviousMonthValue(monthValue);
  if (!previousMonth) return null;

  const reports = archiveReports.filter((report) =>
    String(report.report_date || "").startsWith(previousMonth)
  );

  if (!reports.length) {
    return {
      month: previousMonth,
      days: 0,
      wasteTotal: 0,
      trucksTotal: 0,
      dieselTotal: 0,
      hasData: false,
    };
  }

  const wasteTotal = reports.reduce(
    (sum, report) => sum + Number(report.total_waste_tons || 0),
    0
  );
  const trucksTotal = reports.reduce(
    (sum, report) => sum + Number(report.total_trucks || 0),
    0
  );

  let dieselTotal = reports.reduce(
    (sum, report) => sum + Number(report.total_diesel || 0),
    0
  );

  try {
    const detailedReports = await getMonthlyDetailedReports(previousMonth);
    dieselTotal = calculateDieselFromDetailedReports(detailedReports).dieselTotal;
  } catch (error) {
    console.error("فشل حساب سولار الشهر السابق", error);
  }

  return {
    month: previousMonth,
    days: reports.length,
    wasteTotal,
    trucksTotal,
    dieselTotal,
    hasData: true,
  };
}

async function buildMonthlyReportHtml() {
  const monthly = calculateMonthlyReport();
  if (!monthly.month || monthly.reports.length === 0) return null;

  const monthlyOperationsData = await buildMonthlyOperationsData();
  const operationsTotals = monthlyOperationsData?.operationsTotals || {
    coverAslobVehicles: 0,
    coverAslobQuantity: 0,
    coverTammVehicles: 0,
    coverTammQuantity: 0,
    waterVehicles: 0,
    waterQuantity: 0,
    waterSprays: 0,
    leachateVehicles: 0,
    leachateQuantity: 0,
    sortingVehicles: 0,
    sortingQuantity: 0,
    externalTammVehicles: 0,
    externalTammQuantity: 0,
  };

  const dieselData = monthlyOperationsData?.diesel || {
    dieselTotal: monthly.dieselTotal,
    dieselByReportId: new Map(),
  };

  const dieselTotal = Number(dieselData.dieselTotal || 0);
  const dieselAverage = monthly.days > 0 ? dieselTotal / monthly.days : 0;
  const previous = await buildPreviousMonthComparison(monthly.month);

  const rows = monthly.reports.map((report) => {
    const id = Number(report.id);
    const dailyDiesel = dieselData.dieselByReportId?.has(id)
      ? dieselData.dieselByReportId.get(id)
      : Number(report.total_diesel || 0);

    return `<tr><td>${formatDate(report.report_date)}</td><td>${formatNumber(report.total_trucks)}</td><td>${formatNumber(report.total_waste_tons)}</td><td>${formatNumber(dailyDiesel)}</td></tr>`;
  }).join("");

  const previousMonthLabel = previous?.month ? getMonthName(previous.month) : "الشهر السابق";
  const comparisonHtml = previous?.hasData ? `
    <div class="section-title comparison-title">مقارنة مع الشهر السابق - ${previousMonthLabel}</div>
    <div class="comparison-grid">
      <div><span>النفايات</span><strong>${formatChangeText(monthly.wasteTotal, previous.wasteTotal)}</strong><small>${formatNumber(previous.wasteTotal)} ← ${formatNumber(monthly.wasteTotal)} طن</small></div>
      <div><span>الشاحنات</span><strong>${formatChangeText(monthly.trucksTotal, previous.trucksTotal)}</strong><small>${formatNumber(previous.trucksTotal)} ← ${formatNumber(monthly.trucksTotal)}</small></div>
      <div><span>السولار</span><strong>${formatChangeText(dieselTotal, previous.dieselTotal)}</strong><small>${formatNumber(previous.dieselTotal)} ← ${formatNumber(dieselTotal)} لتر</small></div>
    </div>
    <div class="executive-summary">خلال ${getMonthName(monthly.month)} تم تسجيل ${formatNumber(monthly.days)} يوم تشغيل، بإجمالي ${formatNumber(monthly.wasteTotal)} طن نفايات ومتوسط ${formatNumber(monthly.wasteAverage)} طن/يوم. مقارنة بالشهر السابق، سجلت النفايات ${formatChangeText(monthly.wasteTotal, previous.wasteTotal)}، والشاحنات ${formatChangeText(monthly.trucksTotal, previous.trucksTotal)}، والسولار ${formatChangeText(dieselTotal, previous.dieselTotal)}.</div>
  ` : `
    <div class="section-title comparison-title">مقارنة مع الشهر السابق - ${previousMonthLabel}</div>
    <div class="comparison-empty">لا توجد بيانات محفوظة للشهر السابق للمقارنة.</div>
  `;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>التقرير الشهري ${getMonthName(monthly.month)}</title>
<style>
@page { size: A4 portrait; margin: 0mm; }
* { box-sizing: border-box; }
html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
body { font-family: Arial, Tahoma, sans-serif; direction: rtl; color: #111; background: white; }
.report { width: 202mm; height: 289mm; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; }
.official-header { width: 210mm; height: 30mm; margin-right: -4mm; margin-left: -4mm; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.official-header img { width: 210mm; height: 30mm; display: block; object-fit: fill; }
.report-content { width: 202mm; min-width: 202mm; max-width: 202mm; flex: 1; min-height: 0; overflow: hidden; }
.title { text-align: center; border-top: 1px solid #444; border-bottom: 1px solid #444; padding: 1.4mm; margin-bottom: 1.2mm; }
.title h1 { margin: 0; font-size: 17px; }
.title p { margin: 0.7mm 0 0; font-size: 13px; font-weight: bold; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1mm; margin-bottom: 1.2mm; }
.summary-box { border: 1px solid #444; text-align: center; padding: 1.4mm 0.7mm; }
.summary-box span { display: block; font-size: 9.5px; color: #555; margin-bottom: 0.5mm; }
.summary-box strong { display: block; font-size: 12px; }
.section-title { background: #eeeeee; border: 1px solid #444; text-align: center; font-weight: bold; font-size: 12px; padding: 0.7mm; margin: 1mm 0 0.6mm; }
.comparison-title { margin-top: 0.6mm; }
.comparison-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1mm; margin-bottom: 0.8mm; }
.comparison-grid > div { border: 1px solid #555; text-align: center; padding: 1mm 0.6mm; }
.comparison-grid span { display: block; font-size: 9.5px; color: #555; }
.comparison-grid strong { display: block; font-size: 11.5px; margin: 0.4mm 0; }
.comparison-grid small { display: block; font-size: 8.5px; }
.comparison-empty { border: 1px solid #777; text-align: center; padding: 1.3mm; font-size: 10.5px; font-weight: bold; margin-bottom: 0.8mm; }
.executive-summary { border: 1px solid #777; padding: 1mm 1.3mm; font-size: 9.5px; line-height: 1.25; margin-bottom: 0.8mm; text-align: right; }
table { width: 202mm; min-width: 202mm; max-width: 202mm; margin: 0; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #555; padding: 1.1mm 1mm; text-align: center; font-size: 10.5px; line-height: 1.1; overflow-wrap: anywhere; word-break: normal; }
th { background: #f5f5f5; font-size: 11px; }
.official-footer { width: 210mm; height: 22mm; margin-right: -10mm; margin-left: -4mm; margin-top: auto; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; flex-shrink: 0; }
.official-footer img { width: 210mm; height: 22mm; display: block; object-fit: fill; }
@media print { html, body { width: 210mm; height: 297mm; overflow: hidden; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } table { width: 202mm !important; min-width: 202mm !important; max-width: 202mm !important; } }
</style>
</head>
<body>
<div class="report">
  <div class="official-header"><img src="/assets/header.png" alt="الترويسة الرسمية"></div>
  <div class="report-content">
    <div class="title"><h1>التقرير الشهري لمهام العمل داخل مكب المنيا</h1><p>${getMonthName(monthly.month)}</p></div>
    <div class="summary-grid">
      <div class="summary-box"><span>أيام التشغيل</span><strong>${formatNumber(monthly.days)}</strong></div>
      <div class="summary-box"><span>إجمالي النفايات</span><strong>${formatNumber(monthly.wasteTotal)} طن</strong></div>
      <div class="summary-box"><span>متوسط النفايات اليومي</span><strong>${formatNumber(monthly.wasteAverage)} طن</strong></div>
      <div class="summary-box"><span>إجمالي الشاحنات</span><strong>${formatNumber(monthly.trucksTotal)}</strong></div>
      <div class="summary-box"><span>متوسط الشاحنات اليومي</span><strong>${formatNumber(monthly.trucksAverage)}</strong></div>
      <div class="summary-box"><span>إجمالي السولار</span><strong>${formatNumber(dieselTotal)} لتر</strong></div>
      <div class="summary-box"><span>متوسط السولار اليومي</span><strong>${formatNumber(dieselAverage)} لتر</strong></div>
      <div class="summary-box"><span>أعلى كمية</span><strong>${formatNumber(monthly.maxWaste)} طن</strong></div>
      <div class="summary-box"><span>تاريخ الأعلى</span><strong>${formatDate(monthly.maxWasteDate)}</strong></div>
      <div class="summary-box"><span>أقل كمية</span><strong>${formatNumber(monthly.minWaste)} طن</strong></div>
      <div class="summary-box"><span>تاريخ الأقل</span><strong>${formatDate(monthly.minWasteDate)}</strong></div>
    </div>
    ${comparisonHtml}
    <div class="section-title">ملخص العمليات الشهرية</div>
    <table><thead><tr><th>العملية</th><th>عدد المركبات / النقلات</th><th>الكمية</th><th>الوحدة</th></tr></thead><tbody>
      <tr><td>مواد التغطية (اسلوب)</td><td>${formatNumber(operationsTotals.coverAslobVehicles)}</td><td>${formatNumber(operationsTotals.coverAslobQuantity)}</td><td>نقلة</td></tr>
      <tr><td>مواد التغطية (طمم)</td><td>${formatNumber(operationsTotals.coverTammVehicles)}</td><td>${formatNumber(operationsTotals.coverTammQuantity)}</td><td>كوب</td></tr>
      <tr><td>كميات المياه للتعقيم والترطيب</td><td>${formatNumber(operationsTotals.waterVehicles)}</td><td>${formatNumber(operationsTotals.waterQuantity)}</td><td>كوب</td></tr>
      <tr><td>عدد مرات رش المياه</td><td>-</td><td>${formatNumber(operationsTotals.waterSprays)}</td><td>مرة</td></tr>
      <tr><td>كميات العصارة المرحلة</td><td>${formatNumber(operationsTotals.leachateVehicles)}</td><td>${formatNumber(operationsTotals.leachateQuantity)}</td><td>كوب</td></tr>
      <tr><td>خط الفرز</td><td>${formatNumber(operationsTotals.sortingVehicles)}</td><td>${formatNumber(operationsTotals.sortingQuantity)}</td><td>طن</td></tr>
      <tr><td>طمم خارجي</td><td>${formatNumber(operationsTotals.externalTammVehicles)}</td><td>${formatNumber(operationsTotals.externalTammQuantity)}</td><td>طن</td></tr>
    </tbody></table>
    <div class="section-title">التفاصيل اليومية للشهر</div>
    <table><thead><tr><th>التاريخ</th><th>عدد الشاحنات</th><th>كمية النفايات طن</th><th>السولار لتر</th></tr></thead><tbody>${rows}<tr><th>المجموع</th><th>${formatNumber(monthly.trucksTotal)}</th><th>${formatNumber(monthly.wasteTotal)}</th><th>${formatNumber(dieselTotal)}</th></tr></tbody></table>
  </div>
  <div class="official-footer"><img src="/assets/footer.png" alt="التذييل الرسمي"></div>
</div>
<script>window.onload=function(){const images=Array.from(document.images);Promise.all(images.map(function(img){if(img.complete){return Promise.resolve();}return new Promise(function(resolve){img.onload=resolve;img.onerror=resolve;});})).then(function(){setTimeout(function(){window.print();},300);});};<\/script>
</body>
</html>`;
}

async function printMonthlyReport() {
  const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
  if (!monthValue) {
    showMessage("اختر الشهر أولًا");
    return;
  }

  const html = await buildMonthlyReportHtml();
  if (!html) {
    showMessage("لا توجد تقارير محفوظة لهذا الشهر");
    return;
  }

  const popup = window.open("", "_blank");
  if (!popup) {
    showMessage("المتصفح منع نافذة الطباعة");
    return;
  }

  popup.document.write(html);
  popup.document.close();
}

;

/* ===== js/app-final.js ===== */
/* =========================================================
   حذف
========================================================= */

async function deleteReport(id) {
  const confirmation = confirm("هل تريد حذف هذا التقرير نهائيًا؟");
  if (!confirmation) return;

  try {
    const response = await fetch(`${API}/api/reports/${id}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      showMessage(data.message || "فشل حذف التقرير");
      return;
    }

    if (editingId === Number(id)) {
      editingId = null;
      document.getElementById("saveBtn").textContent = "حفظ التقرير";
    }

    await loadArchive(false);
    showMessage("تم حذف التقرير بنجاح");
  } catch (error) {
    console.error(error);
    showMessage("حدث خطأ أثناء حذف التقرير");
  }
}

function resetNewReport() {
  editingId = null;
  document.getElementById("reportDate").value = "";
  document.getElementById("weather").value = "مشمس";
  document.getElementById("temperature").value = 10;
  document.getElementById("startTime").value = "04:00";
  document.getElementById("endTime").value = "19:00";
  document.getElementById("notes").value = "";

  crews = getDefaultCrews();
  operations = getDefaultOperations();
  stations = getDefaultStations();
  equipment = getDefaultEquipment();

  renderAll();
  document.getElementById("saveBtn").textContent = "حفظ التقرير";
  showMessage("تقرير جديد");
}

document.getElementById("archiveDateFilter")?.addEventListener("change", () => {
  renderArchiveReports();
});

document.getElementById("archiveMonthFilter")?.addEventListener("change", () => {
  renderArchiveReports();
  updateMonthlySummary();
});

document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
  document.getElementById("archiveDateFilter").value = "";
  document.getElementById("archiveMonthFilter").value = "";
  renderArchiveReports();
  updateMonthlySummary();
});

document.getElementById("saveBtn").addEventListener("click", saveReport);
document.getElementById("archiveBtn").addEventListener("click", () => loadArchive(true));
document.getElementById("newReportBtn").addEventListener("click", resetNewReport);
document.getElementById("printMonthlyReportBtn")?.addEventListener("click", printMonthlyReport);

/* =========================================================
   تبديل مؤشر الرسم البياني الشهري
========================================================= */

let monthlyChartMetric = "waste";

function getMonthlyChartReports() {
  const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
  if (!monthValue) return [];

  return [...archiveReports]
    .filter((report) => String(report.report_date || "").startsWith(monthValue))
    .sort((a, b) => String(a.report_date || "").localeCompare(String(b.report_date || "")));
}

function updateMonthlyChartButtons() {
  document.querySelectorAll("[data-monthly-chart-metric]").forEach((button) => {
    const active = button.dataset.monthlyChartMetric === monthlyChartMetric;
    button.style.fontWeight = active ? "700" : "400";
    button.style.border = active ? "2px solid #374151" : "1px solid #d1d5db";
    button.style.background = active ? "#f3f4f6" : "#ffffff";
  });
}

async function renderMonthlyMetricChart(metric = monthlyChartMetric) {
  monthlyChartMetric = metric;
  updateMonthlyChartButtons();

  const target = document.getElementById("monthlyWasteChart");
  const title = document.querySelector(".monthly-chart h4");
  const monthValue = document.getElementById("archiveMonthFilter")?.value || "";

  if (!target || !title) return;

  const settings = {
    waste: { title: "كميات النفايات اليومية خلال الشهر", unit: "طن" },
    trucks: { title: "عدد الشاحنات اليومية خلال الشهر", unit: "شاحنة" },
    diesel: { title: "استهلاك السولار اليومي خلال الشهر", unit: "لتر" },
  };

  const setting = settings[metric] || settings.waste;
  title.textContent = setting.title;

  if (!monthValue) {
    target.innerHTML = '<div class="monthly-chart-empty">اختر شهرًا لعرض الرسم البياني.</div>';
    return;
  }

  const reports = getMonthlyChartReports();
  if (!reports.length) {
    target.innerHTML = '<div class="monthly-chart-empty">لا توجد بيانات لهذا الشهر.</div>';
    return;
  }

  let values = [];

  if (metric === "waste") {
    values = reports.map((report) => Number(report.total_waste_tons || 0));
  } else if (metric === "trucks") {
    values = reports.map((report) => Number(report.total_trucks || 0));
  } else {
    target.innerHTML = '<div class="monthly-chart-empty">جاري تحميل بيانات السولار...</div>';
    const details = await Promise.all(
      reports.map((report) => getReport(report.id).catch(() => null))
    );
    values = reports.map((report, index) => {
      const data = details[index];
      if (!data) return Number(report.total_diesel || 0);
      return (data.equipment || []).reduce(
        (sum, item) => sum + Number(item.diesel_liters || 0),
        0
      );
    });
  }

  const maxValue = Math.max(...values, 1);
  const bars = reports.map((report, index) => {
    const value = Number(values[index] || 0);
    const height = Math.max(2, Math.round((value / maxValue) * 170));
    const day = String(report.report_date || "").slice(-2);
    const displayValue = formatNumber(value);

    return `<div class="monthly-chart-item" title="${escapeHtml(String(report.report_date || ""))} - ${displayValue} ${setting.unit}">
      <div class="monthly-chart-value">${displayValue}</div>
      <div class="monthly-chart-bar" style="height:${height}px"></div>
      <div class="monthly-chart-day">${day}</div>
    </div>`;
  }).join("");

  target.innerHTML = `<div class="monthly-chart-bars">${bars}</div>`;
}

function setupMonthlyChartMetricSwitcher() {
  const chart = document.querySelector(".monthly-chart");
  const chartTitle = chart?.querySelector("h4");
  if (!chart || !chartTitle || document.getElementById("monthlyChartMetricSwitcher")) return;

  const controls = document.createElement("div");
  controls.id = "monthlyChartMetricSwitcher";
  controls.style.display = "flex";
  controls.style.justifyContent = "center";
  controls.style.flexWrap = "wrap";
  controls.style.gap = "8px";
  controls.style.margin = "0 0 14px";
  controls.innerHTML = `
    <button type="button" data-monthly-chart-metric="waste" style="padding:7px 16px;border-radius:6px;cursor:pointer;">النفايات</button>
    <button type="button" data-monthly-chart-metric="trucks" style="padding:7px 16px;border-radius:6px;cursor:pointer;">الشاحنات</button>
    <button type="button" data-monthly-chart-metric="diesel" style="padding:7px 16px;border-radius:6px;cursor:pointer;">السولار</button>
  `;

  chartTitle.insertAdjacentElement("afterend", controls);

  controls.querySelectorAll("[data-monthly-chart-metric]").forEach((button) => {
    button.addEventListener("click", () => {
      renderMonthlyMetricChart(button.dataset.monthlyChartMetric);
    });
  });

  updateMonthlyChartButtons();
}

setupMonthlyChartMetricSwitcher();

document.getElementById("archiveMonthFilter")?.addEventListener("change", () => {
  monthlyChartMetric = "waste";
  setTimeout(() => renderMonthlyMetricChart("waste"), 100);
});

document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
  monthlyChartMetric = "waste";
  setTimeout(() => renderMonthlyMetricChart("waste"), 100);
});

/* =========================================================
   تصدير التقرير الشهري CSV لفتحه في Excel
========================================================= */

function csvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

async function exportMonthlyCsv() {
  const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
  if (!monthValue) {
    showMessage("اختر الشهر أولًا");
    return;
  }

  const reports = [...archiveReports]
    .filter((report) => String(report.report_date || "").startsWith(monthValue))
    .sort((a, b) => String(a.report_date || "").localeCompare(String(b.report_date || "")));

  if (!reports.length) {
    showMessage("لا توجد تقارير محفوظة لهذا الشهر");
    return;
  }

  showMessage("جاري تجهيز ملف الشهر...");

  const wasteTotal = reports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0);
  const trucksTotal = reports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0);
  const dieselTotal = reports.reduce((sum, report) => sum + Number(report.total_diesel || 0), 0);
  const days = reports.length;

  const maxReport = reports.reduce((max, report) =>
    Number(report.total_waste_tons || 0) > Number(max.total_waste_tons || 0) ? report : max
  );
  const minReport = reports.reduce((min, report) =>
    Number(report.total_waste_tons || 0) < Number(min.total_waste_tons || 0) ? report : min
  );

  const rows = [
    ["التقرير الشهري لمكب المنيا", getMonthName(monthValue)],
    [],
    ["البيان", "القيمة"],
    ["عدد أيام التشغيل المسجلة", days],
    ["إجمالي النفايات طن", wasteTotal],
    ["متوسط النفايات اليومي طن/يوم", days ? wasteTotal / days : 0],
    ["إجمالي الشاحنات", trucksTotal],
    ["متوسط الشاحنات اليومي", days ? trucksTotal / days : 0],
    ["إجمالي السولار لتر", dieselTotal],
    ["متوسط السولار اليومي لتر/يوم", days ? dieselTotal / days : 0],
    ["أعلى كمية نفايات طن", Number(maxReport.total_waste_tons || 0)],
    ["تاريخ أعلى كمية", maxReport.report_date],
    ["أقل كمية نفايات طن", Number(minReport.total_waste_tons || 0)],
    ["تاريخ أقل كمية", minReport.report_date],
    [],
    ["التاريخ", "عدد الشاحنات", "كمية النفايات طن", "السولار لتر"],
    ...reports.map((report) => [
      report.report_date,
      Number(report.total_trucks || 0),
      Number(report.total_waste_tons || 0),
      Number(report.total_diesel || 0),
    ]),
    ["المجموع", trucksTotal, wasteTotal, dieselTotal],
  ];

  const csv = "\uFEFF" + rows
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `minya-monthly-${monthValue}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showMessage("تم تصدير التقرير الشهري بنجاح");
}

function setupMonthlyExportButton() {
  const actions = document.querySelector(".monthly-actions");
  if (!actions || document.getElementById("exportMonthlyCsvBtn")) return;

  actions.style.gap = "10px";
  actions.style.flexWrap = "wrap";

  const button = document.createElement("button");
  button.id = "exportMonthlyCsvBtn";
  button.type = "button";
  button.textContent = "تصدير Excel / CSV";
  button.style.minWidth = "220px";
  button.style.padding = "11px 20px";
  button.style.border = "0";
  button.style.borderRadius = "7px";
  button.style.cursor = "pointer";
  button.style.fontSize = "15px";
  button.style.fontWeight = "700";
  button.addEventListener("click", exportMonthlyCsv);

  actions.appendChild(button);
}

setupMonthlyExportButton();

/* =========================================================
   الملخص السنوي داخل الأرشيف
========================================================= */

function getArchiveYears() {
  if (Array.isArray(window.annualAvailableYears) && window.annualAvailableYears.length) {
    return [...window.annualAvailableYears];
  }

  return [...new Set(
    archiveReports
      .map((report) => String(report.report_date || "").slice(0, 4))
      .filter((year) => /^\d{4}$/.test(year))
  )].sort((a, b) => Number(b) - Number(a));
}

function setupAnnualSummarySection() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/annual") return;
  const archiveTable = document.getElementById("archiveTable");
  if (!archiveTable || document.getElementById("annualSummarySection")) return;

  const section = document.createElement("div");
  section.id = "annualSummarySection";
  section.style.margin = "28px 0 22px";
  section.style.paddingTop = "20px";
  section.style.borderTop = "2px solid #d1d5db";
  section.innerHTML = `
    <h3 style="text-align:center;margin:0 0 16px;font-size:20px;">الملخص السنوي</h3>
    <div style="display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
      <label for="annualYearFilter" style="font-weight:700;">السنة</label>
      <select id="annualYearFilter" style="min-width:140px;padding:9px 12px;border:1px solid #d1d5db;border-radius:7px;"></select>
    </div>
    <div id="annualSummaryCards" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px;"></div>
    <div style="overflow-x:auto;">
      <table style="width:100%;min-width:650px;border-collapse:collapse;">
        <thead><tr><th>الشهر</th><th>أيام التشغيل</th><th>النفايات طن</th><th>الشاحنات</th><th>السولار لتر</th></tr></thead>
        <tbody id="annualSummaryBody"></tbody>
      </table>
    </div>
  `;

  archiveTable.parentNode.insertBefore(section, archiveTable);
  document.getElementById("annualYearFilter")?.addEventListener("change", renderAnnualSummary);
}

async function renderAnnualSummary() {
  setupAnnualSummarySection();

  const select = document.getElementById("annualYearFilter");
  const cards = document.getElementById("annualSummaryCards");
  const body = document.getElementById("annualSummaryBody");
  if (!select || !cards || !body) return;

  const years = getArchiveYears();
  const currentSelected = select.value;
  const defaultYear = currentSelected && years.includes(currentSelected)
    ? currentSelected
    : (years[0] || String(new Date().getFullYear()));

  select.innerHTML = years.length
    ? years.map((year) => `<option value="${year}"${year === defaultYear ? " selected" : ""}>${year}</option>`).join("")
    : `<option value="${defaultYear}">${defaultYear}</option>`;

  const year = select.value || defaultYear;
  const reports = archiveReports.filter((report) =>
    String(report.report_date || "").startsWith(`${year}-`)
  );

  if (!reports.length) {
    cards.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:18px;border:1px solid #d1d5db;border-radius:8px;color:#6b7280;">لا توجد بيانات محفوظة لهذه السنة.</div>`;
    body.innerHTML = `<tr><td colspan="5">لا توجد بيانات لهذه السنة</td></tr>`;
    return;
  }

  cards.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:12px;">جاري حساب الملخص السنوي...</div>`;

  const months = Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");
    const monthValue = `${year}-${monthNumber}`;
    const monthReports = reports.filter((report) =>
      String(report.report_date || "").startsWith(monthValue)
    );
    return {
      monthValue,
      reports: monthReports,
      days: monthReports.length,
      waste: monthReports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0),
      trucks: monthReports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0),
      diesel: monthReports.reduce((sum, report) => sum + Number(report.total_diesel || 0), 0),
    };
  });

  const daysTotal = months.reduce((sum, item) => sum + item.days, 0);
  const wasteTotal = months.reduce((sum, item) => sum + item.waste, 0);
  const trucksTotal = months.reduce((sum, item) => sum + item.trucks, 0);
  const dieselTotal = months.reduce((sum, item) => sum + item.diesel, 0);

  const cardStyle = "border:1px solid #d1d5db;border-radius:8px;padding:14px 10px;text-align:center;background:#fff;";
  cards.innerHTML = `
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">أيام التشغيل</span><strong style="font-size:20px;">${formatNumber(daysTotal)}</strong></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">إجمالي النفايات</span><strong style="font-size:20px;">${formatNumber(wasteTotal)} طن</strong></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">إجمالي الشاحنات</span><strong style="font-size:20px;">${formatNumber(trucksTotal)}</strong></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">إجمالي السولار</span><strong style="font-size:20px;">${formatNumber(dieselTotal)} لتر</strong></div>
  `;

  body.innerHTML = months.map((item) => `
    <tr>
      <td>${getMonthName(item.monthValue)}</td>
      <td>${formatNumber(item.days)}</td>
      <td>${formatNumber(item.waste)}</td>
      <td>${formatNumber(item.trucks)}</td>
      <td>${formatNumber(item.diesel)}</td>
    </tr>
  `).join("") + `
    <tr>
      <th>المجموع</th>
      <th>${formatNumber(daysTotal)}</th>
      <th>${formatNumber(wasteTotal)}</th>
      <th>${formatNumber(trucksTotal)}</th>
      <th>${formatNumber(dieselTotal)}</th>
    </tr>
  `;
}

setupAnnualSummarySection();

document.getElementById("archiveBtn")?.addEventListener("click", () => {
  setTimeout(renderAnnualSummary, 250);
});

document.getElementById("archiveMonthFilter")?.addEventListener("change", () => {
  setTimeout(renderAnnualSummary, 150);
});

document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
  setTimeout(renderAnnualSummary, 150);
});

window.openReport = openReport;
window.editReport = editReport;
window.printReport = printReport;
window.deleteReport = deleteReport;
window.printMonthlyReport = printMonthlyReport;
window.renderMonthlyMetricChart = renderMonthlyMetricChart;
window.exportMonthlyCsv = exportMonthlyCsv;
window.renderAnnualSummary = renderAnnualSummary;

renderAll();

;

/* ===== js/app-annual-export.js ===== */
/* =========================================================
   تصدير الملخص السنوي CSV لفتحه في Excel
========================================================= */

function annualCsvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

async function exportAnnualCsv() {
  const year = document.getElementById("annualYearFilter")?.value || "";
  if (!year) {
    showMessage("اختر السنة أولًا");
    return;
  }

  const reports = [...archiveReports]
    .filter((report) => String(report.report_date || "").startsWith(`${year}-`))
    .sort((a, b) => String(a.report_date || "").localeCompare(String(b.report_date || "")));

  if (!reports.length) {
    showMessage("لا توجد تقارير محفوظة لهذه السنة");
    return;
  }

  showMessage("جاري تجهيز ملف السنة...");

  const months = Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");
    const monthValue = `${year}-${monthNumber}`;
    const monthReports = reports.filter((report) =>
      String(report.report_date || "").startsWith(monthValue)
    );

    return {
      monthValue,
      days: monthReports.length,
      waste: monthReports.reduce(
        (sum, report) => sum + Number(report.total_waste_tons || 0),
        0
      ),
      trucks: monthReports.reduce(
        (sum, report) => sum + Number(report.total_trucks || 0),
        0
      ),
      diesel: monthReports.reduce(
        (sum, report) => sum + Number(report.total_diesel || 0),
        0
      ),
    };
  });

  const daysTotal = months.reduce((sum, item) => sum + item.days, 0);
  const wasteTotal = months.reduce((sum, item) => sum + item.waste, 0);
  const trucksTotal = months.reduce((sum, item) => sum + item.trucks, 0);
  const dieselTotal = months.reduce((sum, item) => sum + item.diesel, 0);

  const rows = [
    ["الملخص السنوي لمكب المنيا", year],
    [],
    ["البيان", "القيمة"],
    ["إجمالي أيام التشغيل", daysTotal],
    ["إجمالي النفايات طن", wasteTotal],
    ["إجمالي الشاحنات", trucksTotal],
    ["إجمالي السولار لتر", dieselTotal],
    [],
    ["الشهر", "أيام التشغيل", "النفايات طن", "الشاحنات", "السولار لتر"],
    ...months.map((item) => [
      getMonthName(item.monthValue),
      item.days,
      item.waste,
      item.trucks,
      item.diesel,
    ]),
    ["المجموع", daysTotal, wasteTotal, trucksTotal, dieselTotal],
  ];

  const csv = "\uFEFF" + rows
    .map((row) => row.map(annualCsvCell).join(","))
    .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `minya-annual-${year}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showMessage("تم تصدير الملخص السنوي بنجاح");
}

function setupAnnualExportButton() {
  const section = document.getElementById("annualSummarySection");
  const select = document.getElementById("annualYearFilter");
  if (!section || !select || document.getElementById("exportAnnualCsvBtn")) return false;

  const controls = select.closest("div");
  if (!controls) return false;

  const button = document.createElement("button");
  button.id = "exportAnnualCsvBtn";
  button.type = "button";
  button.textContent = "تصدير السنوي Excel / CSV";
  button.style.minWidth = "210px";
  button.style.padding = "9px 16px";
  button.style.border = "0";
  button.style.borderRadius = "7px";
  button.style.cursor = "pointer";
  button.style.fontSize = "14px";
  button.style.fontWeight = "700";
  button.addEventListener("click", exportAnnualCsv);

  controls.appendChild(button);
  return true;
}

function ensureAnnualExportButton() {
  if (setupAnnualExportButton()) return;
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (setupAnnualExportButton() || tries >= 30) clearInterval(timer);
  }, 120);
}

ensureAnnualExportButton();

document.addEventListener("DOMContentLoaded", ensureAnnualExportButton, { once: true });

document.getElementById("archiveBtn")?.addEventListener("click", () => {
  setTimeout(ensureAnnualExportButton, 300);
});

window.exportAnnualCsv = exportAnnualCsv;
window.setupAnnualExportButton = setupAnnualExportButton;
window.ensureAnnualExportButton = ensureAnnualExportButton;

;

/* ===== js/app-print-annual.js ===== */
/* =========================================================
   طباعة التقرير السنوي
========================================================= */

async function buildAnnualPrintData() {
  const year = document.getElementById("annualYearFilter")?.value || "";
  if (!year) return null;

  const reports = [...archiveReports]
    .filter((report) => String(report.report_date || "").startsWith(`${year}-`))
    .sort((a, b) => String(a.report_date || "").localeCompare(String(b.report_date || "")));

  if (!reports.length) return null;

  const months = Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");
    const monthValue = `${year}-${monthNumber}`;
    const monthReports = reports.filter((report) =>
      String(report.report_date || "").startsWith(monthValue)
    );

    return {
      monthValue,
      days: monthReports.length,
      waste: monthReports.reduce(
        (sum, report) => sum + Number(report.total_waste_tons || 0),
        0
      ),
      trucks: monthReports.reduce(
        (sum, report) => sum + Number(report.total_trucks || 0),
        0
      ),
      diesel: monthReports.reduce(
        (sum, report) => sum + Number(report.total_diesel || 0),
        0
      ),
    };
  });

  return {
    year,
    months,
    daysTotal: months.reduce((sum, item) => sum + item.days, 0),
    wasteTotal: months.reduce((sum, item) => sum + item.waste, 0),
    trucksTotal: months.reduce((sum, item) => sum + item.trucks, 0),
    dieselTotal: months.reduce((sum, item) => sum + item.diesel, 0),
  };
}

async function buildAnnualReportHtml() {
  const annual = await buildAnnualPrintData();
  if (!annual) return null;

  const rows = annual.months.map((item) => `
    <tr>
      <td>${getMonthName(item.monthValue)}</td>
      <td>${formatNumber(item.days)}</td>
      <td>${formatNumber(item.waste)}</td>
      <td>${formatNumber(item.trucks)}</td>
      <td>${formatNumber(item.diesel)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>التقرير السنوي ${annual.year}</title>
<style>
@page { size: A4 portrait; margin: 0mm; }
* { box-sizing: border-box; }
html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
body { font-family: Arial, Tahoma, sans-serif; direction: rtl; color: #111; background: white; }
.report { width: 202mm; height: 289mm; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; }
.official-header { width: 210mm; height: 30mm; margin-right: -4mm; margin-left: -4mm; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.official-header img { width: 210mm; height: 30mm; display: block; object-fit: fill; }
.report-content { width: 202mm; min-width: 202mm; max-width: 202mm; flex: 1; min-height: 0; overflow: hidden; }
.title { text-align: center; border-top: 1px solid #444; border-bottom: 1px solid #444; padding: 2mm; margin-bottom: 2mm; }
.title h1 { margin: 0; font-size: 18px; }
.title p { margin: 1mm 0 0; font-size: 14px; font-weight: bold; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5mm; margin-bottom: 2.5mm; }
.summary-box { border: 1px solid #444; text-align: center; padding: 2mm 1mm; }
.summary-box span { display: block; font-size: 10px; color: #555; margin-bottom: 0.8mm; }
.summary-box strong { display: block; font-size: 13px; }
.section-title { background: #eeeeee; border: 1px solid #444; text-align: center; font-weight: bold; font-size: 13px; padding: 1mm; margin: 1mm 0 0.8mm; }
table { width: 202mm; min-width: 202mm; max-width: 202mm; margin: 0; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #555; padding: 1.7mm 1mm; text-align: center; font-size: 11px; line-height: 1.15; }
th { background: #f5f5f5; font-size: 11.5px; }
.official-footer { width: 210mm; height: 22mm; margin-right: -10mm; margin-left: -4mm; margin-top: auto; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; flex-shrink: 0; }
.official-footer img { width: 210mm; height: 22mm; display: block; object-fit: fill; }
@media print {
  html, body { width: 210mm; height: 297mm; overflow: hidden; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 202mm !important; min-width: 202mm !important; max-width: 202mm !important; }
}
</style>
</head>
<body>
<div class="report">
  <div class="official-header"><img src="/assets/header.png" alt="الترويسة الرسمية"></div>
  <div class="report-content">
    <div class="title"><h1>التقرير السنوي لمهام العمل داخل مكب المنيا</h1><p>${annual.year}</p></div>
    <div class="summary-grid">
      <div class="summary-box"><span>أيام التشغيل</span><strong>${formatNumber(annual.daysTotal)}</strong></div>
      <div class="summary-box"><span>إجمالي النفايات</span><strong>${formatNumber(annual.wasteTotal)} طن</strong></div>
      <div class="summary-box"><span>إجمالي الشاحنات</span><strong>${formatNumber(annual.trucksTotal)}</strong></div>
      <div class="summary-box"><span>إجمالي السولار</span><strong>${formatNumber(annual.dieselTotal)} لتر</strong></div>
    </div>
    <div class="section-title">الملخص الشهري للسنة</div>
    <table>
      <thead><tr><th>الشهر</th><th>أيام التشغيل</th><th>النفايات طن</th><th>الشاحنات</th><th>السولار لتر</th></tr></thead>
      <tbody>
        ${rows}
        <tr><th>المجموع</th><th>${formatNumber(annual.daysTotal)}</th><th>${formatNumber(annual.wasteTotal)}</th><th>${formatNumber(annual.trucksTotal)}</th><th>${formatNumber(annual.dieselTotal)}</th></tr>
      </tbody>
    </table>
  </div>
  <div class="official-footer"><img src="/assets/footer.png" alt="التذييل الرسمي"></div>
</div>
<script>window.onload=function(){const images=Array.from(document.images);Promise.all(images.map(function(img){if(img.complete){return Promise.resolve();}return new Promise(function(resolve){img.onload=resolve;img.onerror=resolve;});})).then(function(){setTimeout(function(){window.print();},300);});};<\/script>
</body>
</html>`;
}

async function printAnnualReport() {
  const year = document.getElementById("annualYearFilter")?.value || "";
  if (!year) {
    showMessage("اختر السنة أولًا");
    return;
  }

  const html = await buildAnnualReportHtml();
  if (!html) {
    showMessage("لا توجد تقارير محفوظة لهذه السنة");
    return;
  }

  const popup = window.open("", "_blank");
  if (!popup) {
    showMessage("المتصفح منع نافذة الطباعة");
    return;
  }

  popup.document.write(html);
  popup.document.close();
}

function setupAnnualPrintButton() {
  const section = document.getElementById("annualSummarySection");
  const select = document.getElementById("annualYearFilter");
  if (!section || !select || document.getElementById("printAnnualReportBtn")) return;

  const controls = select.closest("div");
  if (!controls) return;

  const button = document.createElement("button");
  button.id = "printAnnualReportBtn";
  button.type = "button";
  button.textContent = "طباعة التقرير السنوي";
  button.style.minWidth = "210px";
  button.style.padding = "9px 16px";
  button.style.border = "0";
  button.style.borderRadius = "7px";
  button.style.cursor = "pointer";
  button.style.fontSize = "14px";
  button.style.fontWeight = "700";
  button.addEventListener("click", printAnnualReport);

  controls.appendChild(button);
}

setupAnnualPrintButton();

document.getElementById("archiveBtn")?.addEventListener("click", () => {
  setTimeout(setupAnnualPrintButton, 350);
});

window.printAnnualReport = printAnnualReport;

;

/* ===== js/app-annual-comparison.js ===== */
/* =========================================================
   مقارنة الملخص السنوي مع السنة السابقة
========================================================= */

function formatAnnualChange(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return "-";
  const percent = ((currentValue - previousValue) / previousValue) * 100;
  if (Math.abs(percent) < 0.05) return "بدون تغير";
  return `${percent > 0 ? "زيادة" : "انخفاض"} ${formatNumber(Math.abs(percent))}%`;
}

async function getAnnualReportsForYear(year) {
  const localReports = archiveReports.filter((report) =>
    String(report.report_date || "").startsWith(`${year}-`)
  );

  if (localReports.length) return localReports;

  if (window.annualPreviousReports?.year === String(year)) {
    return Array.isArray(window.annualPreviousReports.reports)
      ? window.annualPreviousReports.reports
      : [];
  }

  try {
    const response = await fetch(
      `${API}/api/annual-summary?year=${encodeURIComponent(year)}`,
      { cache: "no-store" }
    );
    const data = await response.json();
    if (!response.ok || !data.ok) return [];
    return Array.isArray(data.reports) ? data.reports : [];
  } catch (error) {
    console.error(`تعذر تحميل بيانات سنة ${year}`, error);
    return [];
  }
}

async function calculateAnnualTotals(year) {
  const reports = await getAnnualReportsForYear(year);
  if (!reports.length) return null;

  const dieselTotal = reports.reduce(
    (sum, report) => sum + Number(report.total_diesel || 0),
    0
  );

  return {
    year,
    days: reports.length,
    waste: reports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0),
    trucks: reports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0),
    diesel: dieselTotal,
  };
}

function setupAnnualComparisonSection() {
  const section = document.getElementById("annualSummarySection");
  const cards = document.getElementById("annualSummaryCards");
  if (!section || !cards || document.getElementById("annualComparisonSection")) return;

  const comparison = document.createElement("div");
  comparison.id = "annualComparisonSection";
  comparison.style.margin = "16px 0";
  comparison.style.padding = "14px";
  comparison.style.border = "1px solid #d1d5db";
  comparison.style.borderRadius = "8px";
  comparison.style.background = "#f9fafb";
  comparison.innerHTML = `
    <h4 id="annualComparisonTitle" style="margin:0 0 12px;text-align:center;font-size:16px;">مقارنة مع السنة السابقة</h4>
    <div id="annualComparisonGrid" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;"></div>
    <div id="annualComparisonEmpty" style="display:none;text-align:center;color:#6b7280;padding:8px 0;"></div>
  `;

  cards.insertAdjacentElement("afterend", comparison);
}

async function renderAnnualComparison() {
  setupAnnualComparisonSection();

  const select = document.getElementById("annualYearFilter");
  const title = document.getElementById("annualComparisonTitle");
  const grid = document.getElementById("annualComparisonGrid");
  const empty = document.getElementById("annualComparisonEmpty");
  if (!select || !title || !grid || !empty) return;

  const year = Number(select.value || 0);
  if (!year) {
    grid.style.display = "none";
    empty.style.display = "block";
    empty.textContent = "اختر سنة لعرض المقارنة.";
    return;
  }

  const previousYear = year - 1;
  title.textContent = `مقارنة مع السنة السابقة - ${previousYear}`;
  grid.style.display = "none";
  empty.style.display = "block";
  empty.textContent = "جاري تحميل المقارنة...";

  const [current, previous] = await Promise.all([
    calculateAnnualTotals(String(year)),
    calculateAnnualTotals(String(previousYear)),
  ]);

  if (!current || !previous) {
    grid.style.display = "none";
    empty.style.display = "block";
    empty.textContent = "لا توجد بيانات محفوظة للسنة السابقة للمقارنة.";
    return;
  }

  const cardStyle = "background:#fff;border:1px solid #d1d5db;border-radius:8px;padding:12px 8px;text-align:center;";
  grid.innerHTML = `
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;">النفايات</span><strong style="display:block;margin:6px 0;font-size:18px;">${formatAnnualChange(current.waste, previous.waste)}</strong><small style="display:block;color:#6b7280;">${formatNumber(previous.waste)} ← ${formatNumber(current.waste)} طن</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;">الشاحنات</span><strong style="display:block;margin:6px 0;font-size:18px;">${formatAnnualChange(current.trucks, previous.trucks)}</strong><small style="display:block;color:#6b7280;">${formatNumber(previous.trucks)} ← ${formatNumber(current.trucks)}</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;">السولار</span><strong style="display:block;margin:6px 0;font-size:18px;">${formatAnnualChange(current.diesel, previous.diesel)}</strong><small style="display:block;color:#6b7280;">${formatNumber(previous.diesel)} ← ${formatNumber(current.diesel)} لتر</small></div>
  `;

  empty.style.display = "none";
  grid.style.display = "grid";
}

function bindAnnualComparison() {
  setupAnnualComparisonSection();
}

bindAnnualComparison();

window.renderAnnualComparison = renderAnnualComparison;

;

/* ===== js/app-annual-insights.js ===== */
/* =========================================================
   مؤشرات إضافية للملخص السنوي
========================================================= */

function setupAnnualInsights() {
  const section = document.getElementById("annualSummarySection");
  const cards = document.getElementById("annualSummaryCards");
  if (!section || !cards || document.getElementById("annualInsights")) return;

  const insights = document.createElement("div");
  insights.id = "annualInsights";
  insights.style.display = "grid";
  insights.style.gridTemplateColumns = "repeat(3,minmax(0,1fr))";
  insights.style.gap = "12px";
  insights.style.margin = "0 0 16px";
  insights.innerHTML = `
    <div style="border:1px solid #d1d5db;border-radius:8px;padding:14px 10px;text-align:center;background:#fff;">
      <span style="display:block;color:#6b7280;margin-bottom:6px;">أعلى شهر نفايات</span>
      <strong id="annualBestMonth" style="display:block;font-size:18px;">-</strong>
      <small id="annualBestMonthValue" style="display:block;margin-top:4px;color:#6b7280;">-</small>
    </div>
    <div style="border:1px solid #d1d5db;border-radius:8px;padding:14px 10px;text-align:center;background:#fff;">
      <span style="display:block;color:#6b7280;margin-bottom:6px;">أقل شهر نفايات</span>
      <strong id="annualWorstMonth" style="display:block;font-size:18px;">-</strong>
      <small id="annualWorstMonthValue" style="display:block;margin-top:4px;color:#6b7280;">-</small>
    </div>
    <div style="border:1px solid #d1d5db;border-radius:8px;padding:14px 10px;text-align:center;background:#fff;">
      <span style="display:block;color:#6b7280;margin-bottom:6px;">متوسط النفايات الشهري</span>
      <strong id="annualMonthlyWasteAverage" style="display:block;font-size:18px;">0 طن</strong>
      <small style="display:block;margin-top:4px;color:#6b7280;">للأشهر التي تحتوي بيانات</small>
    </div>
  `;

  cards.insertAdjacentElement("afterend", insights);
}

function renderAnnualInsights() {
  setupAnnualInsights();

  const year = document.getElementById("annualYearFilter")?.value || "";
  const bestMonth = document.getElementById("annualBestMonth");
  const bestValue = document.getElementById("annualBestMonthValue");
  const worstMonth = document.getElementById("annualWorstMonth");
  const worstValue = document.getElementById("annualWorstMonthValue");
  const averageValue = document.getElementById("annualMonthlyWasteAverage");

  if (!bestMonth || !bestValue || !worstMonth || !worstValue || !averageValue) return;

  if (!year) {
    bestMonth.textContent = "-";
    bestValue.textContent = "-";
    worstMonth.textContent = "-";
    worstValue.textContent = "-";
    averageValue.textContent = "0 طن";
    return;
  }

  const months = Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");
    const monthValue = `${year}-${monthNumber}`;
    const reports = archiveReports.filter((report) =>
      String(report.report_date || "").startsWith(monthValue)
    );
    return {
      monthValue,
      reportsCount: reports.length,
      waste: reports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0),
    };
  }).filter((item) => item.reportsCount > 0);

  if (!months.length) {
    bestMonth.textContent = "-";
    bestValue.textContent = "لا توجد بيانات";
    worstMonth.textContent = "-";
    worstValue.textContent = "لا توجد بيانات";
    averageValue.textContent = "0 طن";
    return;
  }

  const highest = months.reduce((max, item) => item.waste > max.waste ? item : max);
  const lowest = months.reduce((min, item) => item.waste < min.waste ? item : min);
  const totalWaste = months.reduce((sum, item) => sum + item.waste, 0);
  const monthlyAverage = totalWaste / months.length;

  bestMonth.textContent = getMonthName(highest.monthValue);
  bestValue.textContent = `${formatNumber(highest.waste)} طن`;
  worstMonth.textContent = getMonthName(lowest.monthValue);
  worstValue.textContent = `${formatNumber(lowest.waste)} طن`;
  averageValue.textContent = `${formatNumber(monthlyAverage)} طن`;
}

setupAnnualInsights();

document.getElementById("archiveBtn")?.addEventListener("click", () => {
  setTimeout(renderAnnualInsights, 350);
});

document.addEventListener("change", (event) => {
  if (event.target?.id === "annualYearFilter") {
    setTimeout(renderAnnualInsights, 180);
  }
});

const annualSummaryBody = document.getElementById("annualSummaryBody");
if (annualSummaryBody && typeof MutationObserver !== "undefined") {
  new MutationObserver(() => renderAnnualInsights()).observe(annualSummaryBody, {
    childList: true,
    subtree: true,
  });
}

window.renderAnnualInsights = renderAnnualInsights;

;

/* ===== js/app-annual-loader.js ===== */
/* =========================================================
   V3.3 - تحميل بيانات السنة المطلوبة فقط + تثبيت أدوات الفترة
========================================================= */

window.annualAvailableYears = window.annualAvailableYears || [];
window.annualPreviousReports = window.annualPreviousReports || { year: "", reports: [] };
let annualLoading = false;
let annualPendingYear = "";

async function refreshAnnualCompanions() {
  try {
    if (typeof window.renderAnnualComparison === "function") {
      await window.renderAnnualComparison();
    }
    if (typeof window.renderAnnualInsights === "function") {
      window.renderAnnualInsights();
    }
    if (typeof window.setupAnnualExportButton === "function") {
      window.setupAnnualExportButton();
    }
  } catch (error) {
    console.error("تعذر تحديث أقسام السنوي الإضافية", error);
  }
}

async function loadAnnualArchiveData(year = "") {
  const requestedYear = String(
    year ||
    annualPendingYear ||
    document.getElementById("annualYearFilter")?.value ||
    new Date().getFullYear()
  );

  if (annualLoading) {
    annualPendingYear = requestedYear;
    return;
  }

  try {
    annualLoading = true;
    annualPendingYear = "";

    const response = await fetch(
      `${API}/api/annual-summary?year=${encodeURIComponent(requestedYear)}`,
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "فشل تحميل التقرير السنوي");
    }

    window.annualAvailableYears = [...new Set([
      ...(Array.isArray(window.annualAvailableYears) ? window.annualAvailableYears : []),
      ...(Array.isArray(data.years) ? data.years.map(String) : []),
      requestedYear,
    ])].filter((value) => /^\d{4}$/.test(value))
      .sort((a, b) => Number(b) - Number(a));

    archiveReports = Array.isArray(data.reports)
      ? data.reports
      : [];

    window.annualPreviousReports = {
      year: String(Number(requestedYear) - 1),
      reports: Array.isArray(data.previous_reports) ? data.previous_reports : [],
    };

    if (typeof renderAnnualSummary === "function") {
      await renderAnnualSummary();
    }

    const select = document.getElementById("annualYearFilter");
    if (select) {
      if (
        !Array.from(select.options).some((option) => option.value === requestedYear)
      ) {
        const option = document.createElement("option");
        option.value = requestedYear;
        option.textContent = requestedYear;
        select.appendChild(option);
      }
      select.value = requestedYear;
    }

    await refreshAnnualCompanions();
    document.getElementById("archiveSection")?.classList.remove("hidden");

  } catch (error) {
    console.error("فشل تحميل السنوي", error);
    showMessage("تعذر تحميل التقرير السنوي");
  } finally {
    annualLoading = false;

    if (annualPendingYear && annualPendingYear !== requestedYear) {
      const nextYear = annualPendingYear;
      annualPendingYear = "";
      setTimeout(() => loadAnnualArchiveData(nextYear), 0);
    }
  }
}

/*
  نلتقط تغيير السنة قبل المستمع القديم الموجود داخل الملخص السنوي.
  هذا يمنع إعادة القائمة إلى السنة السابقة أثناء تحميل البيانات الجديدة.
*/
document.addEventListener(
  "change",
  (event) => {
    if (
      event.target?.id === "annualYearFilter" &&
      location.pathname.replace(/\/+$/, "") === "/annual"
    ) {
      const requestedYear = String(event.target.value || "");
      event.stopImmediatePropagation();
      if (requestedYear) loadAnnualArchiveData(requestedYear);
    }
  },
  true
);

function simplifyPeriodFilters() {
  const path = location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/monthly") {
    const dateInput = document.getElementById("archiveDateFilter");
    const dateLabel = dateInput?.closest("label");
    if (dateInput) dateInput.value = "";
    if (dateLabel) dateLabel.style.display = "none";

    const filters = document.querySelector(".archive-filters");
    if (filters) filters.style.gridTemplateColumns = "minmax(220px, 1fr) auto";
  }

  if (path === "/annual") {
    const dateInput = document.getElementById("archiveDateFilter");
    if (dateInput) dateInput.value = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  simplifyPeriodFilters();

  if (location.pathname.replace(/\/+$/, "") === "/annual") {
    setTimeout(() => {
      const year = document.getElementById("annualYearFilter")?.value || "";
      if (year) loadAnnualArchiveData(year);
    }, 180);
  }
});

window.loadAnnualArchiveData = loadAnnualArchiveData;

;

/* ===== js/app-archive-search.js ===== */
/* =========================================================
   V3.3 - البحث السريع في الأرشيف (صفحة الأرشيف فقط)
========================================================= */

let archiveSearchTimer = null;

function isArchiveSearchPage() {
  return (location.pathname.replace(/\/+$/, "") || "/") === "/archive";
}

function setupArchiveQuickSearch() {
  if (!isArchiveSearchPage()) return;

  const filters = document.querySelector(".archive-filters");
  if (!filters || document.getElementById("archiveQuickSearch")) return;

  const label = document.createElement("label");
  label.innerHTML = `
    بحث سريع
    <input
      id="archiveQuickSearch"
      type="search"
      placeholder="رقم التقرير أو كلمة من الملاحظات"
      autocomplete="off"
    >
  `;

  filters.insertBefore(label, filters.lastElementChild);

  const input = document.getElementById("archiveQuickSearch");
  input?.addEventListener("input", () => {
    clearTimeout(archiveSearchTimer);
    archiveSearchTimer = setTimeout(() => {
      if (typeof window.loadArchivePage === "function") window.loadArchivePage(1);
    }, 300);
  });

  document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
    if (input) input.value = "";
    clearTimeout(archiveSearchTimer);
    setTimeout(() => {
      if (typeof window.loadArchivePage === "function") window.loadArchivePage(1);
    }, 80);
  });
}

if (isArchiveSearchPage()) {
  setupArchiveQuickSearch();
  document.getElementById("archiveBtn")?.addEventListener("click", () => {
    setTimeout(setupArchiveQuickSearch, 200);
  });
}

window.setupArchiveQuickSearch = setupArchiveQuickSearch;

;

/* ===== js/app-archive-pagination.js ===== */
/* =========================================================
   V3.3 - ترقيم صفحات جدول الأرشيف (صفحة الأرشيف فقط)
========================================================= */

let archivePage = 1;
let archivePages = 1;
const archivePageLimit = 50;

function isArchivePage() {
  return (location.pathname.replace(/\/+$/, "") || "/") === "/archive";
}

function setupArchivePagination() {
  if (!isArchivePage()) return;

  const table = document.getElementById("archiveTable");
  if (!table || document.getElementById("archivePagination")) return;

  const box = document.createElement("div");
  box.id = "archivePagination";
  box.style.cssText =
    "display:flex;justify-content:center;align-items:center;gap:12px;" +
    "margin:16px 0;flex-wrap:wrap;";

  box.innerHTML = `
    <button type="button" id="archivePrevPage">السابق</button>
    <strong id="archivePageInfo">صفحة 1 من 1</strong>
    <button type="button" id="archiveNextPage">التالي</button>
  `;

  table.insertAdjacentElement("afterend", box);

  document.getElementById("archivePrevPage").onclick = () => {
    if (archivePage > 1) loadArchivePage(archivePage - 1);
  };

  document.getElementById("archiveNextPage").onclick = () => {
    if (archivePage < archivePages) loadArchivePage(archivePage + 1);
  };
}

async function loadArchivePage(page = 1) {
  if (!isArchivePage()) return;

  const tbody = document.querySelector("#archiveTable tbody");
  if (!tbody) return;

  try {
    const dateValue = document.getElementById("archiveDateFilter")?.value || "";
    const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
    const searchValue = document.getElementById("archiveQuickSearch")?.value?.trim() || "";

    const params = new URLSearchParams({
      page: String(page),
      limit: String(archivePageLimit)
    });

    if (searchValue) params.set("q", searchValue);

    if (dateValue) {
      params.set("from", dateValue);
      params.set("to", dateValue);
    } else if (monthValue) {
      const [year, month] = monthValue.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      params.set("from", `${monthValue}-01`);
      params.set("to", `${monthValue}-${String(lastDay).padStart(2, "0")}`);
    }

    tbody.innerHTML = `<tr><td colspan="6">جاري تحميل الأرشيف...</td></tr>`;

    const response = await fetch(`${API}/api/archive?${params}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "فشل تحميل صفحة الأرشيف");
    }

    archivePage = Number(data.page || 1);
    archivePages = Number(data.pages || 1);
    const reports = data.reports || [];

    tbody.innerHTML = reports.length
      ? reports.map((report) => `
        <tr>
          <td>${escapeHtml(report.report_no)}</td>
          <td>${formatDate(report.report_date)}</td>
          <td>${formatNumber(report.total_waste_tons)}</td>
          <td>${formatNumber(report.total_trucks)}</td>
          <td>${formatNumber(report.total_diesel)}</td>
          <td>
            <button class="archive-open" onclick="openReport(${report.id})">فتح</button>
            <button class="role-editor-action archive-edit" onclick="goToEditReport(${report.id})">تعديل</button>
            <button class="archive-print" onclick="printReport(${report.id})">طباعة</button>
            <button class="role-admin-action" onclick="deleteReport(${report.id})" style="background:#b91c1c">حذف</button>
          </td>
        </tr>
      `).join("")
      : `<tr><td colspan="6">لا توجد تقارير مطابقة</td></tr>`;

    const info = document.getElementById("archivePageInfo");
    if (info) info.textContent = `صفحة ${archivePage} من ${archivePages} — ${data.count} تقرير`;

    const prev = document.getElementById("archivePrevPage");
    const next = document.getElementById("archiveNextPage");
    if (prev) prev.disabled = archivePage <= 1;
    if (next) next.disabled = archivePage >= archivePages;

    if (typeof window.applyRoleAwareUI === "function") window.applyRoleAwareUI();
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="6">تعذر تحميل الأرشيف</td></tr>`;
  }
}

if (isArchivePage()) {
  setupArchivePagination();

  document.getElementById("archiveBtn")?.addEventListener("click", () => {
    setTimeout(() => loadArchivePage(1), 300);
  });

  document.getElementById("archiveDateFilter")?.addEventListener("change", () => loadArchivePage(1));
  document.getElementById("archiveMonthFilter")?.addEventListener("change", () => loadArchivePage(1));
  document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
    setTimeout(() => loadArchivePage(1), 80);
  });
}

window.loadArchivePage = loadArchivePage;

;

/* ===== js/page-mode.js ===== */
/* =========================================================
   تنقل الصفحات ووضع العرض
========================================================= */

(function () {
  function getPageFromPath() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/report") return "report";
    if (path === "/archive") return "archive";
    if (path === "/monthly") return "monthly";
    if (path === "/annual") return "annual";
    return "dashboard";
  }

  const page = getPageFromPath();

  function formatDashboardNumber(value) {
    const number = Number(value || 0);
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number);
  }

  function getLocalDateParts() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return {
      today: `${year}-${month}-${day}`,
      month: `${year}-${month}`,
      year: String(year),
    };
  }

  function buildNavigation() {
    const header = document.querySelector(".top-header");
    if (!header) return;

    let nav = header.querySelector("nav");
    if (!nav) {
      nav = document.createElement("nav");
      header.appendChild(nav);
    }

    const items = [
      ["dashboard", "الرئيسية", "/"],
      ["report", "تقرير جديد", "/report"],
      ["archive", "الأرشيف", "/archive"],
      ["monthly", "التقرير الشهري", "/monthly"],
      ["annual", "التقرير السنوي", "/annual"],
    ];

    nav.innerHTML = items.map(([key, label, href]) =>
      `<a class="app-nav-link${page === key ? " active" : ""}" href="${href}">${label}</a>`
    ).join("");
  }

  function hideReportEditor() {
    const save = document.querySelector("section.actions");
    if (save) save.style.display = "none";

    document.querySelectorAll("main.container > section.panel").forEach((section) => {
      if (section.id !== "archiveSection") section.style.display = "none";
    });
  }

  function showArchive() {
    const archive = document.getElementById("archiveSection");
    if (archive) archive.classList.remove("hidden");

    if (page === "annual" && typeof window.loadAnnualArchiveData === "function") {
      setTimeout(() => window.loadAnnualArchiveData(), 50);
    } else if (page === "monthly" && typeof window.loadMonthlyArchiveData === "function") {
      setTimeout(() => window.loadMonthlyArchiveData(false), 50);
    } else if (typeof loadArchive === "function") {
      setTimeout(() => loadArchive(false), 50);
    }
  }

  async function loadDashboardData() {
    const status = document.getElementById("dashboardDataStatus");

    try {
      if (status) status.textContent = "جاري تحميل المؤشرات...";

      const dates = getLocalDateParts();

      const params = new URLSearchParams({
        today: dates.today,
        month: dates.month,
        year: dates.year,
      });

      const response = await fetch(`/api/dashboard?${params}`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "فشل تحميل البيانات");
      }

      const todayReport = data.today || null;
      const month = data.month || {};
      const year = data.year || {};
      const recent = Array.isArray(data.recent) ? data.recent : [];

      const values = {
        todayWaste: todayReport ? Number(todayReport.total_waste_tons || 0) : 0,
        todayTrucks: todayReport ? Number(todayReport.total_trucks || 0) : 0,
        todayDiesel: todayReport ? Number(todayReport.total_diesel || 0) : 0,
        monthWaste: Number(month.waste || 0),
        monthTrucks: Number(month.trucks || 0),
        monthDays: Number(month.days || 0),
        yearWaste: Number(year.waste || 0),
        yearReports: Number(year.reports || 0),
      };

      Object.entries(values).forEach(([key, value]) => {
        const element = document.getElementById(`dash-${key}`);
        if (element) element.textContent = formatDashboardNumber(value);
      });

      const todayState = document.getElementById("dashboardTodayState");
      if (todayState) {
        todayState.textContent = todayReport
          ? `تم تسجيل تقرير اليوم ${dates.today}`
          : `لا يوجد تقرير محفوظ لليوم ${dates.today}`;

        todayState.classList.toggle("has-report", Boolean(todayReport));
      }

      const recentBody = document.getElementById("dashboardRecentReports");

      if (recentBody) {
        recentBody.innerHTML = recent.length
          ? recent.map((report) => `
              <tr>
                <td>${String(report.report_date || "-")}</td>
                <td>${String(report.report_no || "-")}</td>
                <td>${formatDashboardNumber(report.total_waste_tons)} طن</td>
                <td>${formatDashboardNumber(report.total_trucks)}</td>
                <td>${formatDashboardNumber(report.total_diesel)} لتر</td>
              </tr>
            `).join("")
          : '<tr><td colspan="5">لا توجد تقارير محفوظة حتى الآن.</td></tr>';
      }

      if (status) {
        status.textContent =
          `آخر تحديث: ${new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
          })}`;
      }

    } catch (error) {
      console.error("فشل تحميل لوحة المعلومات", error);
      if (status) status.textContent = "تعذر تحميل مؤشرات لوحة المعلومات.";
    }
  }

  function buildDashboard() {
    const main = document.querySelector("main.container");
    if (!main) return;

    main.querySelectorAll(":scope > section").forEach((section) => {
      section.style.display = "none";
    });

    const dashboard = document.createElement("section");
    dashboard.className = "dashboard-home";
    dashboard.innerHTML = `
      <div class="dashboard-hero">
        <div>
          <span class="dashboard-kicker">MINYA LANDFILL</span>
          <h2>لوحة إدارة التقارير التشغيلية</h2>
          <p>متابعة فورية لأداء المكب والوصول إلى التقارير اليومية والتحليلات الشهرية والسنوية.</p>
          <div id="dashboardTodayState" class="dashboard-today-state">جاري التحقق من تقرير اليوم...</div>
        </div>
        <a class="dashboard-primary-action" href="/report">إنشاء تقرير جديد</a>
      </div>

      <div class="dashboard-section-head">
        <div>
          <span>نظرة سريعة</span>
          <h3>مؤشرات التشغيل الحالية</h3>
        </div>
        <small id="dashboardDataStatus">جاري تحميل المؤشرات...</small>
      </div>

      <div class="dashboard-metrics">
        <div class="dashboard-metric-card"><span>نفايات اليوم</span><strong id="dash-todayWaste">0</strong><small>طن</small></div>
        <div class="dashboard-metric-card"><span>شاحنات اليوم</span><strong id="dash-todayTrucks">0</strong><small>شاحنة</small></div>
        <div class="dashboard-metric-card"><span>سولار اليوم</span><strong id="dash-todayDiesel">0</strong><small>لتر</small></div>
        <div class="dashboard-metric-card"><span>نفايات الشهر</span><strong id="dash-monthWaste">0</strong><small>طن</small></div>
        <div class="dashboard-metric-card"><span>شاحنات الشهر</span><strong id="dash-monthTrucks">0</strong><small>شاحنة</small></div>
        <div class="dashboard-metric-card"><span>أيام الشهر المسجلة</span><strong id="dash-monthDays">0</strong><small>يوم</small></div>
        <div class="dashboard-metric-card"><span>نفايات السنة</span><strong id="dash-yearWaste">0</strong><small>طن</small></div>
        <div class="dashboard-metric-card"><span>تقارير السنة</span><strong id="dash-yearReports">0</strong><small>تقرير</small></div>
      </div>

      <div class="dashboard-grid">
        <a class="dashboard-card" href="/report"><span class="dashboard-icon">01</span><h3>التقرير اليومي</h3><p>إدخال بيانات التشغيل والموظفين والعمليات والمعدات وحفظ التقرير.</p></a>
        <a class="dashboard-card" href="/archive"><span class="dashboard-icon">02</span><h3>أرشيف التقارير</h3><p>البحث والفتح والتعديل والطباعة والوصول السريع للتقارير السابقة.</p></a>
        <a class="dashboard-card" href="/monthly"><span class="dashboard-icon">03</span><h3>التقرير الشهري</h3><p>المجاميع والمتوسطات والمقارنات والرسوم البيانية والتصدير.</p></a>
        <a class="dashboard-card" href="/annual"><span class="dashboard-icon">04</span><h3>التقرير السنوي</h3><p>تحليل سنوي متكامل، مقارنة السنوات، المؤشرات والطباعة والتصدير.</p></a>
      </div>

      <div class="dashboard-recent-panel">
        <div class="dashboard-section-head compact">
          <div><span>آخر النشاطات</span><h3>آخر 5 تقارير محفوظة</h3></div>
          <a href="/archive">عرض الأرشيف كاملًا</a>
        </div>
        <div class="dashboard-table-wrap">
          <table class="dashboard-recent-table">
            <thead><tr><th>التاريخ</th><th>رقم التقرير</th><th>النفايات</th><th>الشاحنات</th><th>السولار</th></tr></thead>
            <tbody id="dashboardRecentReports"><tr><td colspan="5">جاري تحميل التقارير...</td></tr></tbody>
          </table>
        </div>
      </div>
    `;

    main.appendChild(dashboard);
    loadDashboardData();
  }

  function applyPageMode() {
    const archive = document.getElementById("archiveSection");
    const monthly = document.getElementById("monthlyReportSection");
    const archiveTable = document.getElementById("archiveTable");
    const filters = document.querySelector(".archive-filters");
    const archiveSummary = document.querySelector(".archive-summary");

    document.body.dataset.page = page;

    if (page === "dashboard") {
      buildDashboard();
      return;
    }

    if (page === "report") {
      if (archive) archive.style.display = "none";
      return;
    }

    if (["archive", "monthly", "annual"].includes(page)) {
      hideReportEditor();
      showArchive();
    }

    if (page === "archive") {
      if (monthly) monthly.style.display = "none";
      const annual = document.getElementById("annualSummarySection");
      if (annual) annual.style.display = "none";
      document.documentElement.classList.add("archive-page");
      return;
    }

    if (page === "monthly") {
      const title = document.getElementById("periodPageTitle");
      if (title) title.textContent = "التقرير الشهري";
      if (archiveTable) archiveTable.style.display = "none";
      if (archiveSummary) archiveSummary.style.display = "none";
      const dateControl = document.querySelector(".archive-date-control");
      if (dateControl) dateControl.style.display = "none";
      const clearFilters = document.getElementById("clearArchiveFiltersBtn");
      if (clearFilters) clearFilters.style.display = "none";
      const annual = document.getElementById("annualSummarySection");
      if (annual) annual.style.display = "none";
      document.documentElement.classList.add("monthly-page");
      return;
    }

    if (page === "annual") {
      const title = document.getElementById("periodPageTitle");
      if (title) title.textContent = "التقرير السنوي";
      if (monthly) monthly.style.display = "none";
      if (archiveTable) archiveTable.style.display = "none";
      if (filters) filters.style.display = "none";
      if (archiveSummary) archiveSummary.style.display = "none";
      document.documentElement.classList.add("annual-page");

      const revealAnnual = () => {
        const annual = document.getElementById("annualSummarySection");
        if (annual) {
          annual.style.display = "block";
          return true;
        }
        return false;
      };

      if (!revealAnnual()) {
        const timer = setInterval(() => {
          if (revealAnnual()) clearInterval(timer);
        }, 100);
        setTimeout(() => clearInterval(timer), 5000);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildNavigation();
    applyPageMode();
  });
})();

;

/* ===== js/app-smart-status.js ===== */
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

  document.addEventListener("DOMContentLoaded", () => {
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

;

/* ===== js/app-modern-charts.js ===== */
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

    return reports.map((report) => Number(report.total_diesel || 0));
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

;

/* ===== js/app-monthly-table.js ===== */
/* =========================================================
   جدول تفاصيل التقرير الشهري - شاشة فقط
========================================================= */

(function () {
  function isMonthlyPage() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    return path === "/monthly";
  }

  function ensureMonthlyTableStyles() {
    if (document.getElementById("monthlyDetailsTableStyles")) return;
    const style = document.createElement("style");
    style.id = "monthlyDetailsTableStyles";
    style.textContent = `
      .monthly-details-section {
        margin: 24px 0 8px;
        padding: 20px;
        background: #fff;
        border: 1px solid #dfe6ee;
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(16,24,40,.06);
      }

      .monthly-details-section h4 {
        margin: 0 0 14px;
        color: #22313c;
        font-size: 20px;
        font-weight: 900;
        text-align: center;
      }

      .monthly-details-wrap {
        width: 100%;
        overflow-x: auto;
        padding-bottom: 8px;
        -webkit-overflow-scrolling: touch;
      }

      #monthlyDetailsTable {
        width: 100%;
        min-width: 900px;
        table-layout: fixed;
      }

      #monthlyDetailsTable th,
      #monthlyDetailsTable td {
        padding: 16px 14px !important;
        font-size: 15px !important;
        line-height: 1.5;
        white-space: nowrap;
      }

      #monthlyDetailsTable th {
        font-size: 15px !important;
        font-weight: 900 !important;
      }

      #monthlyDetailsTable tbody td {
        font-weight: 700;
      }

      #monthlyDetailsTable th:first-child,
      #monthlyDetailsTable td:first-child {
        width: 190px;
      }

      #monthlyDetailsTable tfoot td {
        font-weight: 900;
        background: #f5f8f7;
      }

      @media (max-width: 820px) {
        .monthly-details-section {
          padding: 16px 12px;
        }

        #monthlyDetailsTable {
          min-width: 980px;
        }

        #monthlyDetailsTable th,
        #monthlyDetailsTable td {
          padding: 17px 15px !important;
          font-size: 16px !important;
        }
      }

      @media (max-width: 560px) {
        #monthlyDetailsTable {
          min-width: 1020px;
        }

        #monthlyDetailsTable th,
        #monthlyDetailsTable td {
          padding: 18px 16px !important;
          font-size: 16px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureMonthlyTableSection() {
    if (!isMonthlyPage()) return null;
    const monthlySection = document.getElementById("monthlyReportSection");
    if (!monthlySection) return null;

    let section = document.getElementById("monthlyDetailsSection");
    if (section) return section;

    section = document.createElement("div");
    section.id = "monthlyDetailsSection";
    section.className = "monthly-details-section";
    section.innerHTML = `
      <h4>تفاصيل أيام الشهر</h4>
      <div class="monthly-details-wrap">
        <table id="monthlyDetailsTable">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>عدد الشاحنات</th>
              <th>النفايات طن</th>
              <th>السولار لتر</th>
            </tr>
          </thead>
          <tbody id="monthlyDetailsBody">
            <tr><td colspan="4">اختر شهرًا لعرض التفاصيل.</td></tr>
          </tbody>
          <tfoot id="monthlyDetailsFoot"></tfoot>
        </table>
      </div>
    `;

    const actions = monthlySection.querySelector(".monthly-actions");
    if (actions) actions.insertAdjacentElement("beforebegin", section);
    else monthlySection.appendChild(section);
    return section;
  }

  async function renderMonthlyDetailsTable() {
    if (!isMonthlyPage()) return;
    ensureMonthlyTableStyles();
    ensureMonthlyTableSection();

    const body = document.getElementById("monthlyDetailsBody");
    const foot = document.getElementById("monthlyDetailsFoot");
    const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
    if (!body || !foot) return;

    if (!monthValue) {
      body.innerHTML = '<tr><td colspan="4">اختر شهرًا لعرض تفاصيل الأيام.</td></tr>';
      foot.innerHTML = "";
      return;
    }

    const reports = [...(typeof archiveReports !== "undefined" ? archiveReports : [])]
      .filter((report) => String(report.report_date || "").startsWith(monthValue))
      .sort((a, b) => String(a.report_date || "").localeCompare(String(b.report_date || "")));

    if (!reports.length) {
      body.innerHTML = '<tr><td colspan="4">لا توجد بيانات محفوظة لهذا الشهر.</td></tr>';
      foot.innerHTML = "";
      return;
    }

    const dieselValues = reports.map((report) => Number(report.total_diesel || 0));

    body.innerHTML = reports.map((report, index) => `
      <tr>
        <td>${typeof formatDate === "function" ? formatDate(report.report_date) : report.report_date}</td>
        <td>${typeof formatNumber === "function" ? formatNumber(report.total_trucks) : Number(report.total_trucks || 0)}</td>
        <td>${typeof formatNumber === "function" ? formatNumber(report.total_waste_tons) : Number(report.total_waste_tons || 0)}</td>
        <td>${typeof formatNumber === "function" ? formatNumber(dieselValues[index]) : dieselValues[index]}</td>
      </tr>
    `).join("");

    const trucksTotal = reports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0);
    const wasteTotal = reports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0);
    const dieselTotal = dieselValues.reduce((sum, value) => sum + Number(value || 0), 0);

    const f = typeof formatNumber === "function" ? formatNumber : (value) => String(value);
    foot.innerHTML = `
      <tr>
        <td>المجموع</td>
        <td>${f(trucksTotal)}</td>
        <td>${f(wasteTotal)}</td>
        <td>${f(dieselTotal)}</td>
      </tr>
    `;
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!isMonthlyPage()) return;
    ensureMonthlyTableStyles();
    ensureMonthlyTableSection();

    document.getElementById("archiveMonthFilter")?.addEventListener("change", () => {
      setTimeout(renderMonthlyDetailsTable, 120);
    });

    const days = document.getElementById("monthlyDaysCount");
    if (days && typeof MutationObserver !== "undefined") {
      new MutationObserver(() => setTimeout(renderMonthlyDetailsTable, 80))
        .observe(days, { childList: true, characterData: true, subtree: true });
    }

    setTimeout(renderMonthlyDetailsTable, 350);
  });

  window.renderMonthlyDetailsTable = renderMonthlyDetailsTable;
})();

;

/* ===== js/app-executive-dashboard.js ===== */
/* =========================================================
   Executive Dashboard — مؤشرات إدارية للرئيسية
========================================================= */

(function () {
  function isDashboardPage() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    return path === "/";
  }

  function fmt(value) {
    return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 1 });
  }

  function monthLabel(monthValue) {
    if (!monthValue) return "-";
    const [year, month] = monthValue.split("-");
    const names = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    return `${names[Number(month) - 1] || month} ${year}`;
  }

  function previousMonth(monthValue) {
    const [year, month] = String(monthValue || "").split("-").map(Number);
    if (!year || !month) return "";
    const d = new Date(year, month - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function changeText(current, previous) {
    const c = Number(current || 0);
    const p = Number(previous || 0);
    if (!p) return { text: "لا توجد بيانات سابقة", tone: "neutral" };
    const percent = ((c - p) / p) * 100;
    if (Math.abs(percent) < 0.05) return { text: "بدون تغير", tone: "neutral" };
    return {
      text: `${percent > 0 ? "↑" : "↓"} ${fmt(Math.abs(percent))}%`,
      tone: percent > 0 ? "up" : "down",
    };
  }

  function ensureShell() {
    const dashboard = document.querySelector(".dashboard-home");
    if (!dashboard || document.getElementById("executiveDashboardSection")) return null;

    const grid = dashboard.querySelector(".dashboard-grid");
    const section = document.createElement("section");
    section.id = "executiveDashboardSection";
    section.className = "executive-dashboard";
    section.innerHTML = `
      <div class="executive-head">
        <div>
          <span>EXECUTIVE OVERVIEW</span>
          <h3>المؤشرات التنفيذية</h3>
          <p>مقارنة الأداء الحالي واتجاه السنة من التقارير المحفوظة.</p>
        </div>
        <a href="/monthly">فتح التحليل الشهري</a>
      </div>

      <div class="executive-comparison-grid">
        <div class="executive-card">
          <span>نفايات الشهر</span>
          <strong id="execMonthWaste">0</strong>
          <small id="execMonthWasteChange">-</small>
        </div>
        <div class="executive-card">
          <span>شاحنات الشهر</span>
          <strong id="execMonthTrucks">0</strong>
          <small id="execMonthTrucksChange">-</small>
        </div>
        <div class="executive-card">
          <span>سولار الشهر</span>
          <strong id="execMonthDiesel">0</strong>
          <small id="execMonthDieselChange">-</small>
        </div>
        <div class="executive-card">
          <span>أيام التشغيل</span>
          <strong id="execMonthDays">0</strong>
          <small id="execMonthDaysChange">-</small>
        </div>
      </div>

      <div class="executive-year-grid">
        <div class="executive-highlight"><span>أعلى شهر نفايات</span><strong id="execBestMonth">-</strong><small id="execBestMonthValue">-</small></div>
        <div class="executive-highlight"><span>أقل شهر نفايات</span><strong id="execLowMonth">-</strong><small id="execLowMonthValue">-</small></div>
        <div class="executive-highlight"><span>متوسط النفايات الشهري</span><strong id="execYearAverage">0</strong><small>طن / شهر مسجل</small></div>
      </div>

      <div class="executive-trend-panel">
        <div class="executive-trend-head">
          <strong>اتجاه النفايات خلال السنة</strong>
          <small id="execTrendYear">-</small>
        </div>
        <div id="execYearTrend" class="executive-trend-bars"></div>
      </div>
    `;

    if (grid) dashboard.insertBefore(section, grid);
    else dashboard.appendChild(section);
    return section;
  }

  async function loadExecutiveDashboard() {
    if (!isDashboardPage()) return;
    const shell = ensureShell();
    if (!shell) return;

    try {
      const response = await fetch("/api/reports");
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "فشل تحميل البيانات");

      const reports = Array.isArray(data.reports) ? data.reports : [];
      const now = new Date();
      const year = String(now.getFullYear());
      const month = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const prevMonth = previousMonth(month);

      const byMonth = (value) => reports.filter((r) => String(r.report_date || "").startsWith(value));
      const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0);

      const currentReports = byMonth(month);
      const prevReports = byMonth(prevMonth);

      const current = {
        waste: sum(currentReports, "total_waste_tons"),
        trucks: sum(currentReports, "total_trucks"),
        diesel: sum(currentReports, "total_diesel"),
        days: currentReports.length,
      };
      const previous = {
        waste: sum(prevReports, "total_waste_tons"),
        trucks: sum(prevReports, "total_trucks"),
        diesel: sum(prevReports, "total_diesel"),
        days: prevReports.length,
      };

      const values = {
        execMonthWaste: `${fmt(current.waste)} طن`,
        execMonthTrucks: fmt(current.trucks),
        execMonthDiesel: `${fmt(current.diesel)} لتر`,
        execMonthDays: fmt(current.days),
      };
      Object.entries(values).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      });

      [
        ["execMonthWasteChange", current.waste, previous.waste],
        ["execMonthTrucksChange", current.trucks, previous.trucks],
        ["execMonthDieselChange", current.diesel, previous.diesel],
        ["execMonthDaysChange", current.days, previous.days],
      ].forEach(([id, c, p]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const result = changeText(c, p);
        el.textContent = `${result.text} مقارنة بـ ${monthLabel(prevMonth)}`;
        el.dataset.tone = result.tone;
      });

      const months = Array.from({ length: 12 }, (_, index) => {
        const monthValue = `${year}-${String(index + 1).padStart(2, "0")}`;
        const items = byMonth(monthValue);
        return {
          monthValue,
          waste: sum(items, "total_waste_tons"),
          days: items.length,
        };
      });

      const activeMonths = months.filter((item) => item.days > 0);
      if (activeMonths.length) {
        const best = activeMonths.reduce((a, b) => b.waste > a.waste ? b : a);
        const low = activeMonths.reduce((a, b) => b.waste < a.waste ? b : a);
        const average = activeMonths.reduce((s, item) => s + item.waste, 0) / activeMonths.length;

        document.getElementById("execBestMonth").textContent = monthLabel(best.monthValue);
        document.getElementById("execBestMonthValue").textContent = `${fmt(best.waste)} طن`;
        document.getElementById("execLowMonth").textContent = monthLabel(low.monthValue);
        document.getElementById("execLowMonthValue").textContent = `${fmt(low.waste)} طن`;
        document.getElementById("execYearAverage").textContent = fmt(average);
      }

      const trend = document.getElementById("execYearTrend");
      const trendYear = document.getElementById("execTrendYear");
      if (trendYear) trendYear.textContent = year;
      if (trend) {
        const max = Math.max(...months.map((item) => item.waste), 1);
        trend.innerHTML = months.map((item, index) => {
          const height = item.waste ? Math.max(8, Math.round((item.waste / max) * 100)) : 3;
          return `<div class="executive-trend-item" title="${monthLabel(item.monthValue)} — ${fmt(item.waste)} طن">
            <div class="executive-trend-column"><span style="height:${height}%"></span></div>
            <small>${index + 1}</small>
          </div>`;
        }).join("");
      }
    } catch (error) {
      console.error("فشل تحميل المؤشرات التنفيذية", error);
      shell.classList.add("executive-error");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(loadExecutiveDashboard, 120);
  });
})();

;

/* ===== js/app-system-link.js ===== */
/* =========================================================
   رابط إدارة النظام في جميع الصفحات
========================================================= */

(function () {
  function isAdmin() {
    return window.MINYA_USER?.role === "admin" || document.documentElement.dataset.userRole === "admin";
  }

  function removeSystemAccess() {
    document.querySelectorAll('a[href="/system.html"]').forEach(link => link.remove());
  }

  function addSystemNavigation() {
    if (!isAdmin()) { removeSystemAccess(); return; }
    const nav = document.querySelector(".top-header nav");
    if (!nav || nav.querySelector('a[href="/system.html"]')) return;

    const link = document.createElement("a");
    link.className = "app-nav-link";
    link.href = "/system.html";
    link.textContent = "إدارة النظام";
    nav.appendChild(link);
  }

  function addDashboardSystemCard() {
    if (!isAdmin()) { removeSystemAccess(); return; }
    const grid = document.querySelector(".dashboard-grid");
    if (!grid || grid.querySelector('a[href="/system.html"]')) return;

    const card = document.createElement("a");
    card.className = "dashboard-card";
    card.href = "/system.html";
    card.innerHTML = `
      <span class="dashboard-icon">05</span>
      <h3>إدارة النظام</h3>
      <p>فحص حالة النظام وتنزيل نسخة احتياطية كاملة من بيانات التقارير.</p>
    `;
    grid.appendChild(card);
  }

  document.addEventListener("DOMContentLoaded", () => {
    addSystemNavigation();
    setTimeout(() => {
      addSystemNavigation();
      addDashboardSystemCard();
    }, 220);
  });
})();

;

/* ===== js/app-credit.js ===== */
/* =========================================================
   اعتماد تصميم النظام
========================================================= */

(function () {
  function addDesignCredit() {
    if (document.getElementById("landfillDesignCredit")) return;

    const footer = document.createElement("footer");
    footer.id = "landfillDesignCredit";
    footer.className = "landfill-design-credit";
    footer.innerHTML = `
      <span>تصميم قسم المكب</span>
      <strong>المهندس محمد جبرين</strong>
    `;
    document.body.appendChild(footer);

    if (!document.getElementById("landfillDesignCreditStyle")) {
      const style = document.createElement("style");
      style.id = "landfillDesignCreditStyle";
      style.textContent = `
        .landfill-design-credit {
          width: min(94%, 1480px);
          margin: 26px auto 18px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          color: #667085;
          border-top: 1px solid #dfe6ee;
          font-size: 12px;
          text-align: center;
        }
        .landfill-design-credit span::after {
          content: " — ";
          color: #98a2b3;
        }
        .landfill-design-credit strong {
          color: #176b4f;
          font-size: 13px;
          font-weight: 900;
        }
        @media (max-width: 560px) {
          .landfill-design-credit {
            flex-direction: column;
            gap: 3px;
            margin-top: 20px;
          }
          .landfill-design-credit span::after { content: ""; }
        }
        @media print {
          .landfill-design-credit { display: none !important; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addDesignCredit);
  } else {
    addDesignCredit();
  }
})();

;

/* ===== js/app-v3-pages.js ===== */
/* =========================================================
   V3 management pages
========================================================= */
(function(){
  const path=location.pathname.replace(/\/+$/,"")||"/";
  const fmt=v=>Number(v||0).toLocaleString("en-US",{maximumFractionDigits:2});
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  function shell(title,subtitle){
    const main=document.querySelector("main.container"); if(!main)return null;
    main.innerHTML=`<section class="v3-page"><div class="v3-hero"><div><span>MINYA LANDFILL</span><h2>${title}</h2><p>${subtitle}</p></div></div><div id="v3Content"></div></section>`;
    return document.getElementById("v3Content");
  }
  function activeNav(href,label){
    const nav=document.querySelector(".top-header nav"); if(!nav)return;
    let a=nav.querySelector(`a[href="${href}"]`); if(!a){a=document.createElement("a");a.href=href;a.className="app-nav-link";a.textContent=label;nav.appendChild(a);} nav.querySelectorAll(".app-nav-link").forEach(x=>x.classList.toggle("active",x.getAttribute("href")===href));
  }
  function addGlobalNav(){
    const nav=document.querySelector(".top-header nav"); if(!nav)return;
    const items=[["/equipment","المعدات"],["/weekly","الأسبوعي"],["/search","بحث متقدم"],["/managerial","تقرير إداري"],["/admin","الإدارة"]];
    items.forEach(([href,label])=>{if(!nav.querySelector(`a[href="${href}"]`)){const a=document.createElement("a");a.href=href;a.className="app-nav-link";a.textContent=label;nav.appendChild(a);}});
  }
  async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||"فشل الطلب");return d;}

  async function renderEquipment(){
    activeNav("/equipment","المعدات"); const c=shell("المعدات والصيانة","متابعة حالة الآليات وساعات العمل والسولار وسجل الأعطال والصيانة."); if(!c)return;
    c.innerHTML=`<div class="v3-filter"><label>من<input id="eqFrom" type="date"></label><label>إلى<input id="eqTo" type="date"></label><button id="eqLoad">تحديث</button></div><div class="v3-panel"><h3>ملخص المعدات</h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>الآلية</th><th>الحالة الأخيرة</th><th>ساعات العمل</th><th>السولار</th><th>أيام التسجيل</th><th>سجلات الصيانة</th></tr></thead><tbody id="eqBody"></tbody></table></div></div><div class="v3-panel"><h3>إضافة سجل صيانة / عطل</h3><div class="v3-form-grid"><label>اسم الآلية<input id="maintName"></label><label>التاريخ<input id="maintDate" type="date"></label><label>الحالة<select id="maintStatus"><option>ملاحظة</option><option>صيانة</option><option>عطل</option><option>إصلاح</option></select></label><label>التكلفة<input id="maintCost" type="number" step="0.01"></label></div><label>الوصف<textarea id="maintDesc" rows="3"></textarea></label><label>الإجراء المتخذ<textarea id="maintAction" rows="2"></textarea></label><button id="maintSave" class="v3-primary">حفظ سجل الصيانة</button><p id="maintMsg"></p></div><div class="v3-panel"><h3>سجل الصيانة</h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>الآلية</th><th>الحالة</th><th>الوصف</th><th>الإجراء</th><th>التكلفة</th></tr></thead><tbody id="maintBody"></tbody></table></div></div>`;
    const now=new Date(), start=new Date(now.getFullYear(),now.getMonth(),1); eqFrom.value=start.toISOString().slice(0,10); eqTo.value=now.toISOString().slice(0,10); maintDate.value=eqTo.value;
    async function load(){try{const [s,m]=await Promise.all([api(`/api/equipment/summary?from=${eqFrom.value}&to=${eqTo.value}`),api(`/api/maintenance?from=${eqFrom.value}&to=${eqTo.value}`)]);eqBody.innerHTML=s.rows.length?s.rows.map(r=>`<tr><td>${esc(r.equipment_name)}</td><td><span class="status-pill status-${encodeURIComponent(r.latest_status||"")}">${esc(r.latest_status||"-")}</span><small>${esc(r.latest_date||"")}</small></td><td>${fmt(r.working_hours)}</td><td>${fmt(r.diesel_liters)} لتر</td><td>${fmt(r.report_days)}</td><td>${fmt(r.maintenance_count)}</td></tr>`).join(""):`<tr><td colspan="6">لا توجد بيانات</td></tr>`;maintBody.innerHTML=m.logs.length?m.logs.map(x=>`<tr><td>${esc(x.log_date)}</td><td>${esc(x.equipment_name)}</td><td>${esc(x.status)}</td><td>${esc(x.description)}</td><td>${esc(x.action_taken)}</td><td>${fmt(x.cost)}</td></tr>`).join(""):`<tr><td colspan="6">لا توجد سجلات صيانة</td></tr>`;}catch(e){eqBody.innerHTML=`<tr><td colspan="6">${esc(e.message)}</td></tr>`;}}
    eqLoad.onclick=load; maintSave.onclick=async()=>{try{await api("/api/maintenance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({equipment_name:maintName.value,log_date:maintDate.value,status:maintStatus.value,description:maintDesc.value,action_taken:maintAction.value,cost:maintCost.value})});maintMsg.textContent="تم حفظ سجل الصيانة";maintDesc.value="";maintAction.value="";load();}catch(e){maintMsg.textContent=e.message;}}; load();
  }

  async function renderWeekly(){
    activeNav("/weekly","الأسبوعي"); const c=shell("التقرير الأسبوعي","ملخص سبعة أيام للنفايات والشاحنات والسولار مع التفاصيل اليومية."); if(!c)return;
    c.innerHTML=`<div class="v3-filter"><label>بداية الأسبوع<input id="weekStart" type="date"></label><button id="weekLoad">عرض الأسبوع</button></div><div id="weekCards" class="v3-kpis"></div><div class="v3-panel"><h3 id="weekTitle">تفاصيل الأسبوع</h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>رقم التقرير</th><th>النفايات طن</th><th>الشاحنات</th><th>السولار لتر</th></tr></thead><tbody id="weekBody"></tbody></table></div></div>`;
    const d=new Date();d.setDate(d.getDate()-6);weekStart.value=d.toISOString().slice(0,10);
    async function load(){try{const x=await api(`/api/weekly?start=${weekStart.value}`);weekTitle.textContent=`${x.start} — ${x.end}`;weekCards.innerHTML=[['أيام مسجلة',x.summary.days,'يوم'],['إجمالي النفايات',x.summary.waste,'طن'],['إجمالي الشاحنات',x.summary.trucks,'شاحنة'],['إجمالي السولار',x.summary.diesel,'لتر'],['متوسط النفايات',x.summary.waste_avg,'طن/يوم'],['متوسط الشاحنات',x.summary.trucks_avg,'شاحنة/يوم']].map(v=>`<div><span>${v[0]}</span><strong>${fmt(v[1])}</strong><small>${v[2]}</small></div>`).join("");weekBody.innerHTML=x.reports.length?x.reports.map(r=>`<tr><td>${r.report_date}</td><td>${r.report_no}</td><td>${fmt(r.total_waste_tons)}</td><td>${fmt(r.total_trucks)}</td><td>${fmt(r.total_diesel)}</td></tr>`).join(""):`<tr><td colspan="5">لا توجد تقارير في هذه الفترة</td></tr>`;}catch(e){weekBody.innerHTML=`<tr><td colspan="5">${esc(e.message)}</td></tr>`;}}
    weekLoad.onclick=load;load();
  }

  async function renderSearch(){
    activeNav("/search","بحث متقدم"); const c=shell("البحث المتقدم","البحث داخل التقارير والملاحظات والمعدات مع فلاتر التاريخ والحالة والكميات."); if(!c)return;
    c.innerHTML=`<div class="v3-panel"><div class="v3-search-grid"><label>كلمة البحث<input id="sQ" placeholder="رقم تقرير، ملاحظة، آلية..."></label><label>من<input id="sFrom" type="date"></label><label>إلى<input id="sTo" type="date"></label><label>حالة المعدات<select id="sStatus"><option value="">الكل</option><option>يعمل</option><option>جاهز</option><option>تحت الصيانة</option><option>متعطل</option></select></label><label>أقل نفايات<input id="sMin" type="number"></label><label>أعلى نفايات<input id="sMax" type="number"></label></div><button id="sGo" class="v3-primary">بحث</button></div><div class="v3-panel"><h3>النتائج <small id="sCount"></small></h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>رقم التقرير</th><th>النفايات</th><th>الشاحنات</th><th>السولار</th><th>إجراء</th></tr></thead><tbody id="sBody"></tbody></table></div></div>`;
    async function run(){try{const p=new URLSearchParams({q:sQ.value,from:sFrom.value,to:sTo.value,equipment_status:sStatus.value,min_waste:sMin.value,max_waste:sMax.value});const d=await api(`/api/search?${p}`);sCount.textContent=`(${d.reports.length})`;sBody.innerHTML=d.reports.length?d.reports.map(r=>`<tr><td>${r.report_date}</td><td>${r.report_no}</td><td>${fmt(r.total_waste_tons)}</td><td>${fmt(r.total_trucks)}</td><td>${fmt(r.total_diesel)}</td><td><button onclick="printReport(${r.id})">طباعة</button></td></tr>`).join(""):`<tr><td colspan="6">لا توجد نتائج</td></tr>`;}catch(e){sBody.innerHTML=`<tr><td colspan="6">${esc(e.message)}</td></tr>`;}}
    sGo.onclick=run;sQ.addEventListener("keydown",e=>{if(e.key==="Enter")run();});run();
  }

  async function renderManagerial(){
    activeNav("/managerial","تقرير إداري"); const c=shell("التقرير الإداري المختصر","تقرير تنفيذي للفترة المحددة، مناسب للطباعة PDF والتصدير إلى Excel/CSV."); if(!c)return;
    c.innerHTML=`<div class="v3-filter no-print"><label>من<input id="mFrom" type="date"></label><label>إلى<input id="mTo" type="date"></label><button id="mLoad">تحديث</button><button id="mPrint">طباعة / PDF</button><a id="mCsv" class="v3-link-btn">Excel / CSV</a></div><section id="managerialReport" class="managerial-report"><div class="managerial-title"><h2>التقرير الإداري التشغيلي</h2><p id="mPeriod"></p></div><div id="mCards" class="v3-kpis"></div><div class="v3-panel flat"><h3>البيانات اليومية</h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>النفايات</th><th>الشاحنات</th><th>السولار</th></tr></thead><tbody id="mBody"></tbody></table></div></div><div class="managerial-sign">تصميم قسم المكب — المهندس محمد جبرين</div></section>`;
    const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1);mFrom.value=start.toISOString().slice(0,10);mTo.value=now.toISOString().slice(0,10);
    async function load(){try{const p=new URLSearchParams({from:mFrom.value,to:mTo.value});const d=await api(`/api/search?${p}`);const rs=d.reports.sort((a,b)=>a.report_date.localeCompare(b.report_date));const sum=k=>rs.reduce((s,r)=>s+Number(r[k]||0),0);mPeriod.textContent=`الفترة من ${mFrom.value} إلى ${mTo.value}`;mCards.innerHTML=[['عدد التقارير',rs.length,'تقرير'],['النفايات',sum('total_waste_tons'),'طن'],['الشاحنات',sum('total_trucks'),'شاحنة'],['السولار',sum('total_diesel'),'لتر']].map(v=>`<div><span>${v[0]}</span><strong>${fmt(v[1])}</strong><small>${v[2]}</small></div>`).join('');mBody.innerHTML=rs.length?rs.map(r=>`<tr><td>${r.report_date}</td><td>${fmt(r.total_waste_tons)}</td><td>${fmt(r.total_trucks)}</td><td>${fmt(r.total_diesel)}</td></tr>`).join(''):`<tr><td colspan="4">لا توجد بيانات</td></tr>`;mCsv.href=`/api/export/managerial.csv?from=${mFrom.value}&to=${mTo.value}`;}catch(e){mBody.innerHTML=`<tr><td colspan="4">${esc(e.message)}</td></tr>`;}}
    mLoad.onclick=load;mPrint.onclick=()=>window.print();load();
  }

  async function renderAdmin(){
    activeNav("/admin","الإدارة"); const c=shell("الإدارة والصلاحيات","إدارة المستخدمين، سجل التعديلات، النسخ الاحتياطي والاستعادة."); if(!c)return;
    c.innerHTML=`<div class="v3-admin-grid"><div class="v3-panel"><h3>النسخ الاحتياطي والاستعادة</h3><a class="v3-primary inline" href="/api/backup/download">تنزيل نسخة كاملة</a><p>للحماية من استعادة ملف غير صالح، تتم الاستعادة من شاشة إدارة النظام بعد فحص النسخة ومعاينتها والتأكيد.</p><a class="v3-link-btn" href="/system.html">فتح الاستعادة الآمنة</a></div></div><div class="v3-panel"><h3>سجل التعديلات Audit Log</h3><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>النوع</th><th>المعرف</th><th>التفاصيل</th></tr></thead><tbody id="auditBody"></tbody></table></div></div>`;
    async function load(){try{const a=await api('/api/audit?limit=300');auditBody.innerHTML=a.logs.map(x=>`<tr><td>${esc(x.created_at)}</td><td>${esc(x.username)}</td><td>${esc(x.action)}</td><td>${esc(x.entity_type)}</td><td>${esc(x.entity_id)}</td><td>${esc(x.details)}</td></tr>`).join('');}catch(e){c.innerHTML=`<div class="v3-panel">${esc(e.message)} — هذه الصفحة للمدير فقط.</div>`;}}
    load();
  }

  function enhanceReportAttachments(){
    if(path!=="/report")return;
    const actions=document.querySelector("section.actions"); if(!actions||document.getElementById("reportAttachmentsPanel"))return;
    const p=document.createElement("section");p.id="reportAttachmentsPanel";p.className="panel";p.innerHTML=`<h2>مرفقات التقرير</h2><p class="muted">بعد حفظ التقرير يمكنك إرفاق صور الموقع أو الأعطال أو الأعمال المنفذة. الحد الأقصى 8MB للملف.</p><input id="attachmentFile" type="file" accept="image/*,.pdf"><button id="attachmentUploadBtn" type="button">رفع المرفق</button><div id="attachmentList" class="attachment-list"></div>`;actions.before(p);
    async function refresh(){if(!window.editingId)return;try{const d=await api(`/api/reports/${window.editingId||editingId}/attachments`);attachmentList.innerHTML=d.attachments.length?d.attachments.map(a=>`<div><a href="/api/attachments/${a.id}/download" target="_blank">${esc(a.original_name)}</a><small>${fmt(a.size_bytes/1024)} KB</small></div>`).join(''):'لا توجد مرفقات';}catch{}}
    attachmentUploadBtn.onclick=async()=>{const f=attachmentFile.files[0];if(!f)return alert('اختر ملفًا');const id=window.editingId||editingId;if(!id)return alert('احفظ التقرير أولًا ثم ارفع المرفق');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f);});try{await api(`/api/reports/${id}/attachments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.name,mime_type:f.type,data_base64:data})});attachmentFile.value='';refresh();}catch(e){alert(e.message);}};setInterval(refresh,2500);refresh();
  }

  async function addAlerts(){
    if(path!=="/")return;setTimeout(async()=>{const dash=document.querySelector('.dashboard-home');if(!dash||document.getElementById('dashboardAlerts'))return;try{const d=await api('/api/alerts');const s=document.createElement('section');s.id='dashboardAlerts';s.className='dashboard-alerts';s.innerHTML=`<div class="dashboard-section-head compact"><div><span>تنبيهات</span><h3>تنبيهات التشغيل</h3></div></div>${d.alerts.length?`<div class="alerts-grid">${d.alerts.map(a=>`<div class="alert-card ${a.level}"><strong>${esc(a.title)}</strong><small>${esc(a.detail)}</small></div>`).join('')}</div>`:'<div class="alert-card success"><strong>لا توجد تنبيهات حالية</strong><small>البيانات المسجلة تبدو طبيعية.</small></div>'}`;dash.insertBefore(s,dash.querySelector('.dashboard-grid'));}catch{}},400);
  }

  document.addEventListener("DOMContentLoaded",()=>{
    addGlobalNav();
    if(path==="/equipment")renderEquipment();
    else if(path==="/weekly")renderWeekly();
    else if(path==="/search")renderSearch();
    else if(path==="/managerial")renderManagerial();
    else if(path==="/admin")renderAdmin();
    else {enhanceReportAttachments();addAlerts();}
  });
})();

;

/* ===== js/app-report-attachments.js ===== */
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
      count.textContent = `${items.length} مرفق`;
      list.innerHTML = items.length ? items.map(item => `
        <div class="attachment-row">
          <div class="attachment-meta">
            <strong>${esc(item.original_name)}</strong>
            <small>${fmtBytes(item.size_bytes)} • ${esc(String(item.created_at || "").slice(0, 16).replace("T", " "))}</small>
          </div>
          <div class="attachment-actions">
            <a href="/api/attachments/${item.id}/download" target="_blank" rel="noopener">فتح</a>
            ${canEdit() ? `<button type="button" data-delete-attachment="${item.id}">حذف</button>` : ""}
          </div>
        </div>
      `).join("") : '<div class="muted">لا توجد مرفقات لهذا التقرير.</div>';

      list.querySelectorAll("[data-delete-attachment]").forEach(button => {
        button.addEventListener("click", () => deleteAttachment(Number(button.dataset.deleteAttachment)));
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

;

/* ===== js/app-permissions-ui.js ===== */
/* =========================================================
   واجهة الصلاحيات حسب الدور
========================================================= */
(function () {
  let role = null;
  let applying = false;

  async function resolveRole() {
    try {
      const response = await fetch("/api/auth/status", { cache: "no-store" });
      const data = await response.json();
      if (data?.authenticated && data.user?.role) {
        role = data.user.role;
        window.MINYA_USER = data.user;
      }
    } catch {}
    return role;
  }

  function hide(el) {
    if (!el) return;
    if (el.style.display !== "none") el.style.display = "none";
    if (el.getAttribute("aria-hidden") !== "true") el.setAttribute("aria-hidden", "true");
  }

  function disableEditorForm() {
    document.querySelectorAll("#reportFormSection input, #reportFormSection select, #reportFormSection textarea, #crewsTable input, #crewsTable select, #operationsTable input, #operationsTable select, #stationsTable input, #stationsTable select, #equipmentTable input, #equipmentTable select, #notes").forEach(el => {
      if (!el.disabled) el.disabled = true;
      el.title = "حساب قراءة فقط";
    });
    hide(document.getElementById("saveBtn")?.closest("section") || document.getElementById("saveBtn"));
    hide(document.getElementById("attachmentsControls"));
  }

  function applyArchivePermissions() {
    document.querySelectorAll("button").forEach(button => {
      const text = String(button.textContent || "").trim();
      const onclick = String(button.getAttribute("onclick") || "");
      if (role === "viewer" && (text === "تعديل" || text === "حذف" || /editReport|deleteReport/.test(onclick))) hide(button);
      if (role === "editor" && (text === "حذف" || /deleteReport/.test(onclick))) hide(button);
    });
  }

  function applyNavigationPermissions() {
    document.querySelectorAll('a[href="/admin"], a[href="/admin.html"]').forEach(link => {
      if (role !== "admin") hide(link);
    });

    if (role === "viewer") {
      document.querySelectorAll('a[href="/report"]').forEach(hide);
    }
  }

  function applyV3Permissions() {
    if (role === "viewer") {
      hide(document.getElementById("maintSave"));
      document.querySelectorAll("#v3Content input, #v3Content textarea, #v3Content select").forEach(el => {
        if (!el.closest(".v3-filter") && !el.closest(".v3-search-grid")) el.disabled = true;
      });
    }
    if (role !== "admin") {
      document.querySelectorAll("[data-admin-only], .admin-only").forEach(hide);
    }
  }

  function apply() {
    if (!role || applying) return;
    applying = true;
    try {
      document.documentElement.dataset.userRole = role;
      applyNavigationPermissions();
      applyArchivePermissions();
      applyV3Permissions();
      if (role === "viewer") disableEditorForm();
    } finally {
      applying = false;
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await resolveRole();

    if (role === "viewer" && (location.pathname.replace(/\/+$/, "") || "/") === "/report") {
      location.replace("/archive");
      return;
    }

    apply();

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        apply();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();

;

/* ===== js/app-admin-audit.js ===== */
/* =========================================================
   Admin audit log filters and review tools
========================================================= */
(function () {
  const pagePath = location.pathname.replace(/\/+$/, "") || "/";
  if (pagePath !== "/admin") return;

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  function actionLabel(action) {
    const labels = {
      LOGIN: "تسجيل دخول",
      LOGOUT: "تسجيل خروج",
      LOGIN_FAILED: "محاولة دخول فاشلة",
      LOGIN_LOCKED: "قفل دخول مؤقت",
      SETUP_ADMIN: "إنشاء مدير النظام",
      CREATE_USER: "إضافة مستخدم",
      UPDATE_USER: "تعديل مستخدم",
      CREATE_REPORT: "إنشاء تقرير",
      UPDATE_REPORT: "تعديل تقرير",
      DELETE_REPORT: "حذف تقرير",
      SUBMIT_REPORT: "إرسال التقرير للمراجعة",
      APPROVE_REPORT: "اعتماد التقرير",
      REOPEN_REPORT: "إعادة فتح التقرير كمسودة",
      ADD_ATTACHMENT: "إضافة مرفق",
      DELETE_ATTACHMENT: "حذف مرفق",
      CREATE_MAINTENANCE: "إضافة صيانة",
      DELETE_MAINTENANCE: "حذف صيانة",
      DOWNLOAD_BACKUP: "تنزيل نسخة احتياطية",
      DOWNLOAD_SAVED_BACKUP: "تنزيل نسخة محفوظة",
      RESTORE_BACKUP: "استعادة نسخة احتياطية",
      TERMINATE_SESSION: "إنهاء جلسة",
      LOGOUT_USER_ALL: "تسجيل خروج المستخدم من كل الأجهزة",
      CLEANUP_SESSIONS: "تنظيف الجلسات المنتهية"
    };
    return labels[action] || action || "-";
  }

  function isSensitive(action) {
    return /DELETE|RESTORE|UPDATE_USER|CREATE_USER|SETUP_ADMIN|APPROVE_REPORT|REOPEN_REPORT|TERMINATE_SESSION|LOGOUT_USER_ALL|LOGIN_LOCKED/.test(action || "");
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const raw = String(value).includes("T") ? String(value) : String(value).replace(" ", "T") + "Z";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function dateOnly(value) {
    if (!value) return "";
    return String(value).slice(0, 10);
  }

  async function fetchLogs() {
    const response = await fetch("/api/audit?limit=200");
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.message || "فشل تحميل سجل النشاط");
    return Array.isArray(data.logs) ? data.logs : [];
  }

  function initAuditReview() {
    const body = document.getElementById("auditBody");
    if (!body || document.getElementById("auditReviewTools")) return;

    const tableWrap = body.closest(".v3-table-wrap");
    const panel = tableWrap?.closest(".v3-panel");
    if (!tableWrap || !panel) return;

    const tools = document.createElement("div");
    tools.id = "auditReviewTools";
    tools.className = "audit-review-tools";
    tools.innerHTML = `
      <div class="audit-kpis">
        <div><span>العمليات المعروضة</span><strong id="auditShownCount">0</strong></div>
        <div><span>المستخدمون</span><strong id="auditUsersCount">0</strong></div>
        <div><span>عمليات التقارير</span><strong id="auditReportsCount">0</strong></div>
        <div><span>عمليات حساسة</span><strong id="auditSensitiveCount">0</strong></div>
      </div>
      <div class="audit-filter-grid">
        <label>المستخدم<select id="auditUserFilter"><option value="">الكل</option></select></label>
        <label>نوع العملية<select id="auditActionFilter"><option value="">الكل</option></select></label>
        <label>من<input id="auditFromFilter" type="date"></label>
        <label>إلى<input id="auditToFilter" type="date"></label>
        <label class="audit-search-field">بحث<input id="auditTextFilter" type="search" placeholder="المعرف، التفاصيل، النوع..."></label>
        <button id="auditRefreshBtn" type="button">تحديث السجل</button>
        <button id="auditClearBtn" type="button" class="secondary">مسح الفلاتر</button>
      </div>
      <div id="auditFilterStatus" class="audit-filter-status">جاري تحميل آخر 200 عملية...</div>
    `;
    tableWrap.before(tools);

    const userFilter = document.getElementById("auditUserFilter");
    const actionFilter = document.getElementById("auditActionFilter");
    const fromFilter = document.getElementById("auditFromFilter");
    const toFilter = document.getElementById("auditToFilter");
    const textFilter = document.getElementById("auditTextFilter");
    const refreshBtn = document.getElementById("auditRefreshBtn");
    const clearBtn = document.getElementById("auditClearBtn");
    const filterStatus = document.getElementById("auditFilterStatus");
    const shownCount = document.getElementById("auditShownCount");
    const usersCountEl = document.getElementById("auditUsersCount");
    const reportsCount = document.getElementById("auditReportsCount");
    const sensitiveCount = document.getElementById("auditSensitiveCount");

    let logs = [];

    function populateFilters() {
      const users = [...new Set(logs.map(x => x.username).filter(Boolean))].sort();
      const actions = [...new Set(logs.map(x => x.action).filter(Boolean))].sort();
      userFilter.innerHTML = `<option value="">الكل</option>${users.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join("")}`;
      actionFilter.innerHTML = `<option value="">الكل</option>${actions.map(v => `<option value="${esc(v)}">${esc(actionLabel(v))}</option>`).join("")}`;
    }

    function render() {
      const user = userFilter.value;
      const action = actionFilter.value;
      const from = fromFilter.value;
      const to = toFilter.value;
      const text = textFilter.value.trim().toLowerCase();

      const filtered = logs.filter((row) => {
        const day = dateOnly(row.created_at);
        if (user && row.username !== user) return false;
        if (action && row.action !== action) return false;
        if (from && day < from) return false;
        if (to && day > to) return false;
        if (text) {
          const haystack = [row.username, row.action, row.entity_type, row.entity_id, row.details, actionLabel(row.action)].join(" ").toLowerCase();
          if (!haystack.includes(text)) return false;
        }
        return true;
      });

      const reportActions = filtered.filter(x => x.entity_type === "report" || /REPORT/.test(x.action || "")).length;
      const sensitiveActions = filtered.filter(x => isSensitive(x.action)).length;
      const usersCount = new Set(filtered.map(x => x.username).filter(Boolean)).size;

      shownCount.textContent = filtered.length;
      usersCountEl.textContent = usersCount;
      reportsCount.textContent = reportActions;
      sensitiveCount.textContent = sensitiveActions;
      filterStatus.textContent = `عرض ${filtered.length} من أصل ${logs.length} عملية محفوظة ضمن آخر 200 سجل.`;

      body.innerHTML = filtered.length ? filtered.map((x) => `
        <tr class="audit-row ${isSensitive(x.action) ? "sensitive" : ""}">
          <td>${esc(formatDateTime(x.created_at))}</td>
          <td>${esc(x.username || "system")}</td>
          <td><span class="audit-action-pill">${esc(actionLabel(x.action))}</span><small>${esc(x.action || "")}</small></td>
          <td>${esc(x.entity_type || "-")}</td>
          <td>${esc(x.entity_id || "-")}</td>
          <td class="audit-details-cell">${esc(x.details || "-")}</td>
        </tr>
      `).join("") : `<tr><td colspan="6">لا توجد عمليات مطابقة للفلاتر الحالية.</td></tr>`;
    }

    async function load() {
      refreshBtn.disabled = true;
      filterStatus.textContent = "جاري تحديث سجل النشاط...";
      try {
        logs = await fetchLogs();
        populateFilters();
        render();
      } catch (error) {
        filterStatus.textContent = error.message || "تعذر تحميل السجل";
        body.innerHTML = `<tr><td colspan="6">${esc(error.message || "تعذر تحميل سجل النشاط")}</td></tr>`;
      } finally {
        refreshBtn.disabled = false;
      }
    }

    [userFilter, actionFilter, fromFilter, toFilter, textFilter].forEach((element) => {
      element.addEventListener(element.tagName === "INPUT" && element.type === "search" ? "input" : "change", render);
    });

    refreshBtn.addEventListener("click", load);
    clearBtn.addEventListener("click", () => {
      userFilter.value = "";
      actionFilter.value = "";
      fromFilter.value = "";
      toFilter.value = "";
      textFilter.value = "";
      render();
    });

    load();
  }

  function start() {
    setTimeout(initAuditReview, 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

;

/* ===== js/app-admin-security.js ===== */
(function(){
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/admin') return;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const dt=v=>v?new Date(v).toLocaleString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'-';
  async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;}
  function build(){
    if(document.getElementById('adminSecurityPanel')) return;
    const content=document.getElementById('v3Content'); if(!content) return;
    const panel=document.createElement('section'); panel.id='adminSecurityPanel'; panel.className='v3-panel admin-security-panel';
    panel.innerHTML=`<div class="security-head"><div><span>SECURITY</span><h3>أمان الدخول والجلسات</h3></div><button id="securityRefresh" type="button">تحديث</button></div>
      <div class="security-kpis"><div><span>الجلسات النشطة</span><strong id="secSessions">0</strong></div><div><span>المستخدمون النشطون</span><strong id="secUsers">0</strong></div><div><span>آخر دخول ناجح</span><strong id="secLastLogin">-</strong></div><div><span>آخر محاولة فاشلة</span><strong id="secLastFailed">-</strong></div></div>
      <div class="security-actions"><button id="securityCleanup" type="button">تنظيف الجلسات المنتهية</button><small id="securityMsg"></small></div>
      <div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>المستخدم</th><th>الصلاحية</th><th>الجلسات</th><th>آخر دخول</th><th>آخر محاولة فاشلة</th><th>إجراء</th></tr></thead><tbody id="securityUsersBody"></tbody></table></div>
      <h4>الجلسات النشطة</h4><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>المستخدم</th><th>بداية الجلسة</th><th>تنتهي</th><th>إجراء</th></tr></thead><tbody id="securitySessionsBody"></tbody></table></div>`;
    content.appendChild(panel);
  }
  async function load(){
    build();
    const ub=document.getElementById('securityUsersBody');
    const sb=document.getElementById('securitySessionsBody');
    const sessionsCount=document.getElementById('secSessions');
    const usersCount=document.getElementById('secUsers');
    const lastLogin=document.getElementById('secLastLogin');
    const lastFailed=document.getElementById('secLastFailed');
    const msg=document.getElementById('securityMsg');
    if(!ub||!sb||!sessionsCount||!usersCount||!lastLogin||!lastFailed||!msg)return;
    try{
      const d=await api('/api/security/sessions'); const users=d.users||[], sessions=d.sessions||[];
      sessionsCount.textContent=sessions.length;
      usersCount.textContent=users.filter(x=>x.is_active).length;
      const last=users.map(x=>x.last_success_login).filter(Boolean).sort().slice(-1)[0];
      const failed=users.map(x=>x.last_failed_login).filter(Boolean).sort().slice(-1)[0];
      lastLogin.textContent=dt(last); lastFailed.textContent=dt(failed);
      ub.innerHTML=users.length?users.map(u=>`<tr><td><strong>${esc(u.display_name)}</strong><small>${esc(u.username)}</small></td><td>${esc(u.role)}</td><td>${u.active_sessions||0}</td><td>${dt(u.last_success_login)}</td><td>${dt(u.last_failed_login)}</td><td><button class="logout-all" data-user="${u.id}" ${u.active_sessions?``:`disabled`}>خروج من كل الأجهزة</button></td></tr>`).join(''):`<tr><td colspan="6">لا توجد بيانات</td></tr>`;
      sb.innerHTML=sessions.length?sessions.map(s=>`<tr><td>${esc(s.display_name)}<small>${esc(s.username)}</small></td><td>${dt(s.created_at)}</td><td>${dt(s.expires_at)}</td><td><button class="revoke-session" data-session="${s.id}">إنهاء الجلسة</button></td></tr>`).join(''):`<tr><td colspan="4">لا توجد جلسات نشطة</td></tr>`;
      document.querySelectorAll('.logout-all').forEach(b=>b.onclick=async()=>{if(!confirm('إنهاء جميع جلسات هذا المستخدم؟'))return;try{await api(`/api/security/users/${b.dataset.user}/logout-all`,{method:'POST'});msg.textContent='تم إنهاء الجلسات';load();}catch(e){msg.textContent=e.message;}});
      document.querySelectorAll('.revoke-session').forEach(b=>b.onclick=async()=>{if(!confirm('إنهاء هذه الجلسة؟'))return;try{await api(`/api/security/sessions/${b.dataset.session}`,{method:'DELETE'});msg.textContent='تم إنهاء الجلسة';load();}catch(e){msg.textContent=e.message;}});
    }catch(e){ub.innerHTML=`<tr><td colspan="6">${esc(e.message)}</td></tr>`;}
  }
  function init(){
    setTimeout(()=>{
      build(); load();
      document.getElementById('securityRefresh')?.addEventListener('click',load);
      document.getElementById('securityCleanup')?.addEventListener('click',async()=>{
        const msg=document.getElementById('securityMsg');
        try{const d=await api('/api/security/cleanup',{method:'POST'});if(msg)msg.textContent=`تم حذف ${d.sessions_removed||0} جلسة منتهية و${d.attempts_removed||0} محاولة قديمة`;load();}
        catch(e){if(msg)msg.textContent=e.message;}
      });
    },250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

;

/* ===== js/app-admin-users.js ===== */
(function(){
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/admin') return;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const dt=v=>v?new Date(v).toLocaleString('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'-';
  const roleLabel={admin:'مدير',editor:'محرر',viewer:'قراءة فقط'};
  const emailOk=v=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  let currentUser=null;
  async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;}
  function build(){
    if(document.getElementById('fullUserManagement')) return;
    const content=document.getElementById('v3Content'); if(!content)return;
    const section=document.createElement('section');
    section.id='fullUserManagement'; section.className='v3-panel user-management-panel';
    section.innerHTML=`
      <div class="user-management-head"><div><span>USERS</span><h3>إدارة المستخدمين</h3><p>إنشاء المستخدمين، إدارة البريد الإلكتروني والصلاحيات، تفعيل الحسابات، وتغيير كلمات المرور بأمان.</p></div><div class="user-management-actions"><button id="addUserBtn" class="v3-primary" type="button">إضافة مستخدم</button><button id="usersManageRefresh" type="button">تحديث</button></div></div>
      <div id="usersManageMsg" class="users-manage-msg"></div>
      <div id="userCreateDialog" class="user-edit-card hidden">
        <div class="user-edit-head"><div><span>مستخدم جديد</span><strong>إنشاء حساب جديد</strong></div><button id="closeUserCreate" type="button">إغلاق</button></div>
        <div class="user-edit-grid">
          <label>اسم المستخدم<input id="createUsername" type="text" autocomplete="off" placeholder="مثال: testadmin"></label>
          <label>البريد الإلكتروني<input id="createEmail" type="email" autocomplete="off" placeholder="name@example.com" dir="ltr"></label>
          <label>الاسم الظاهر<input id="createDisplayName" type="text" autocomplete="off" placeholder="مثال: حساب اختبار"></label>
          <label>الصلاحية<select id="createRole"><option value="viewer">قراءة فقط</option><option value="editor">محرر</option><option value="admin">مدير</option></select></label>
          <label>كلمة المرور<input id="createPassword" type="password" autocomplete="new-password" placeholder="8 أحرف على الأقل"></label>
        </div>
        <small>البريد الإلكتروني اختياري، وإذا تمت إضافته يمكن استخدامه لتسجيل الدخول بدل اسم المستخدم.</small>
        <div class="user-edit-actions"><button id="saveNewUser" class="v3-primary" type="button">إنشاء المستخدم</button></div>
      </div>
      <div class="v3-table-wrap"><table class="v3-table users-manage-table"><thead><tr><th>المستخدم</th><th>البريد الإلكتروني</th><th>الصلاحية</th><th>الحالة</th><th>الجلسات</th><th>آخر دخول</th><th>إجراءات</th></tr></thead><tbody id="usersManageBody"><tr><td colspan="7">جاري التحميل...</td></tr></tbody></table></div>
      <div id="userEditDialog" class="user-edit-card hidden">
        <div class="user-edit-head"><div><span>تعديل المستخدم</span><strong id="editUserTitle">-</strong></div><button id="closeUserEdit" type="button">إغلاق</button></div>
        <input id="editUserId" type="hidden">
        <div class="user-edit-grid">
          <label>الاسم الظاهر<input id="editDisplayName" type="text"></label>
          <label>البريد الإلكتروني<input id="editEmail" type="email" placeholder="name@example.com" dir="ltr"></label>
          <label>الصلاحية<select id="editRole"><option value="viewer">قراءة فقط</option><option value="editor">محرر</option><option value="admin">مدير</option></select></label>
          <label>الحالة<select id="editActive"><option value="1">نشط</option><option value="0">موقوف</option></select></label>
          <label>كلمة مرور جديدة<input id="editPassword" type="password" placeholder="اتركها فارغة دون تغيير"></label>
        </div>
        <small>عند تغيير كلمة المرور سيتم إنهاء جميع جلسات هذا المستخدم تلقائيًا.</small>
        <div class="user-edit-actions"><button id="saveUserEdit" class="v3-primary" type="button">حفظ التعديلات</button><button id="logoutUserEverywhere" type="button">تسجيل خروج من جميع الأجهزة</button></div>
      </div>`;
    const first=content.querySelector('.v3-admin-grid');
    if(first) content.insertBefore(section,first); else content.prepend(section);
  }
  function refs(){
    return {
      id:document.getElementById('editUserId'), title:document.getElementById('editUserTitle'), display:document.getElementById('editDisplayName'), email:document.getElementById('editEmail'),
      role:document.getElementById('editRole'), active:document.getElementById('editActive'), password:document.getElementById('editPassword'),
      dialog:document.getElementById('userEditDialog'), logout:document.getElementById('logoutUserEverywhere'),
      msg:document.getElementById('usersManageMsg'), save:document.getElementById('saveUserEdit')
    };
  }
  function createRefs(){
    return {
      username:document.getElementById('createUsername'), email:document.getElementById('createEmail'), display:document.getElementById('createDisplayName'), role:document.getElementById('createRole'),
      password:document.getElementById('createPassword'), dialog:document.getElementById('userCreateDialog'), save:document.getElementById('saveNewUser'), msg:document.getElementById('usersManageMsg')
    };
  }
  function openCreate(){
    const e=createRefs(); if(!e.username||!e.email||!e.display||!e.role||!e.password||!e.dialog||!e.msg)return;
    e.username.value=''; e.email.value=''; e.display.value=''; e.role.value='viewer'; e.password.value=''; e.msg.textContent='';
    document.getElementById('userEditDialog')?.classList.add('hidden');
    e.dialog.classList.remove('hidden');
    e.username.focus();
  }
  function openEdit(user){
    if(!user)return;
    const e=refs(); if(!e.id||!e.title||!e.display||!e.email||!e.role||!e.active||!e.password||!e.dialog||!e.logout||!e.msg)return;
    document.getElementById('userCreateDialog')?.classList.add('hidden');
    e.id.value=user.id; e.title.textContent=`${user.display_name} (${user.username})`;
    e.display.value=user.display_name||''; e.email.value=user.email||''; e.role.value=user.role; e.active.value=String(Number(Boolean(user.is_active))); e.password.value='';
    e.dialog.classList.remove('hidden');
    const self=Number(user.id)===Number(currentUser?.id);
    e.active.disabled=self;
    e.logout.disabled=Number(user.active_sessions||0)===0;
    e.msg.textContent=self?'هذا هو حسابك الحالي؛ لا يمكن إيقافه من هذه الجلسة.':'';
    e.dialog.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  async function load(){
    build(); const body=document.getElementById('usersManageBody'); if(!body)return;
    try{
      const [me,sec]=await Promise.all([api('/api/auth/me'),api('/api/security/sessions')]);
      currentUser=me.user; const users=sec.users||[];
      body.innerHTML=users.length?users.map(u=>`<tr data-user="${u.id}"><td><strong>${esc(u.display_name)}</strong><small>${esc(u.username)}${Number(u.id)===Number(currentUser.id)?' · حسابك':''}</small></td><td><span dir="ltr">${u.email?esc(u.email):'<span class="user-email-empty">—</span>'}</span></td><td><span class="user-role role-${esc(u.role)}">${esc(roleLabel[u.role]||u.role)}</span></td><td><span class="user-state ${u.is_active?'active':'inactive'}">${u.is_active?'نشط':'موقوف'}</span></td><td>${Number(u.active_sessions||0)}</td><td>${dt(u.last_success_login)}</td><td><button class="manage-user-btn" type="button" data-user="${u.id}">إدارة</button></td></tr>`).join(''):`<tr><td colspan="7">لا توجد حسابات</td></tr>`;
      document.querySelectorAll('.manage-user-btn').forEach(btn=>btn.onclick=()=>openEdit(users.find(u=>String(u.id)===btn.dataset.user)));
    }catch(err){body.innerHTML=`<tr><td colspan="7">${esc(err.message)}</td></tr>`;}
  }
  async function createUser(){
    const e=createRefs(); if(!e.username||!e.email||!e.display||!e.role||!e.password||!e.dialog||!e.save||!e.msg)return;
    const username=e.username.value.trim(); const email=e.email.value.trim().toLowerCase(); const display_name=e.display.value.trim(); const password=e.password.value; const role=e.role.value;
    if(!username){e.msg.textContent='اسم المستخدم مطلوب.';return;}
    if(email&&!emailOk(email)){e.msg.textContent='البريد الإلكتروني غير صالح.';return;}
    if(password.length<8){e.msg.textContent='كلمة المرور يجب أن تكون 8 أحرف على الأقل.';return;}
    if(role==='admin'&&!confirm('سيتم إنشاء مستخدم بصلاحية مدير كاملة. هل تريد المتابعة؟'))return;
    e.save.disabled=true; e.msg.textContent='جاري إنشاء المستخدم...';
    try{
      await api('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,email,display_name:display_name||username,password,role})});
      e.msg.textContent='تم إنشاء المستخدم بنجاح'; e.dialog.classList.add('hidden'); await load();
    }catch(err){e.msg.textContent=err.message;}finally{e.save.disabled=false;}
  }
  async function save(){
    const e=refs(); if(!e.id||!e.display||!e.email||!e.role||!e.active||!e.password||!e.msg||!e.save||!e.dialog)return;
    const id=Number(e.id.value); if(!id)return;
    const email=e.email.value.trim().toLowerCase();
    if(email&&!emailOk(email)){e.msg.textContent='البريد الإلكتروني غير صالح.';return;}
    const payload={display_name:e.display.value.trim(),email,role:e.role.value,is_active:Number(e.active.value)};
    if(e.password.value) payload.password=e.password.value;
    if(payload.password&&payload.password.length<8){e.msg.textContent='كلمة المرور يجب أن تكون 8 أحرف على الأقل.';return;}
    const sensitive=payload.role==='admin'||payload.is_active===0||Boolean(payload.password);
    if(sensitive&&!confirm('هذا تغيير حساس على حساب المستخدم. هل تريد المتابعة؟'))return;
    e.save.disabled=true; e.msg.textContent='جاري حفظ التعديلات...';
    try{
      const d=await api(`/api/users/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      e.msg.textContent=d.message||'تم تحديث المستخدم'; e.password.value=''; await load(); e.dialog.classList.add('hidden');
    }catch(err){e.msg.textContent=err.message;}finally{e.save.disabled=false;}
  }
  async function logoutAll(){
    const e=refs(); if(!e.id||!e.msg||!e.dialog)return;
    const id=Number(e.id.value); if(!id)return;
    if(Number(id)===Number(currentUser?.id)){if(!confirm('سيتم تسجيل خروج حسابك من جميع الأجهزة بما فيها هذه الجلسة. متابعة؟'))return;}
    else if(!confirm('إنهاء جميع جلسات هذا المستخدم؟'))return;
    try{
      const d=await api(`/api/security/users/${id}/logout-all`,{method:'POST'}); e.msg.textContent=`تم إنهاء ${d.count||0} جلسة`;
      if(Number(id)===Number(currentUser?.id)){location.reload();return;}
      await load(); e.dialog.classList.add('hidden');
    }catch(err){e.msg.textContent=err.message;}
  }
  function init(){
    setTimeout(()=>{
      build(); load();
      document.getElementById('addUserBtn')?.addEventListener('click',openCreate);
      document.getElementById('closeUserCreate')?.addEventListener('click',()=>document.getElementById('userCreateDialog')?.classList.add('hidden'));
      document.getElementById('saveNewUser')?.addEventListener('click',createUser);
      document.getElementById('usersManageRefresh')?.addEventListener('click',load);
      document.getElementById('closeUserEdit')?.addEventListener('click',()=>document.getElementById('userEditDialog')?.classList.add('hidden'));
      document.getElementById('saveUserEdit')?.addEventListener('click',save);
      document.getElementById('logoutUserEverywhere')?.addEventListener('click',logoutAll);
    },320);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

;

/* ===== js/app-excel-import.js ===== */
/* Excel import: preview -> approve/cancel. Admin page only. */
(function(){
  const path=location.pathname.replace(/\/+$/,"")||"/";
  if(path!=="/admin") return;

  const state={reports:[],ready:[],duplicates:[],invalid:[],fileName:""};
  const fmt=v=>Number(v||0).toLocaleString("en-US",{maximumFractionDigits:2});
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const clean=v=>String(v??"").replace(/\s+/g," ").trim();
  const num=v=>{const n=Number(String(v??"").replace(/,/g,""));return Number.isFinite(n)?n:0;};

  function toIsoDate(value, sheetName=""){
    if(value instanceof Date && !Number.isNaN(value.getTime())){
      return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
    }
    if(typeof value==="number" && window.XLSX?.SSF){
      const d=window.XLSX.SSF.parse_date_code(value);
      if(d) return `${String(d.y).padStart(4,"0")}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
    }
    const s=clean(value);
    let m=s.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)/);
    if(m) return `${m[1]}-${String(Number(m[2])).padStart(2,"0")}-${String(Number(m[3])).padStart(2,"0")}`;
    m=s.match(/^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{4})/);
    if(m) return `${m[3]}-${String(Number(m[2])).padStart(2,"0")}-${String(Number(m[1])).padStart(2,"0")}`;
    const digits=clean(sheetName).replace(/\D/g,"");
    if(digits.length>=6){
      const year=digits.slice(-4), rest=digits.slice(0,-4);
      for(let dayLen=1;dayLen<=2;dayLen++){
        const dd=Number(rest.slice(0,dayLen)), mm=Number(rest.slice(dayLen));
        if(dd>=1&&dd<=31&&mm>=1&&mm<=12) return `${year}-${String(mm).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
      }
    }
    return "";
  }

  function toTime(value){
    if(value instanceof Date) return `${String(value.getHours()).padStart(2,"0")}:${String(value.getMinutes()).padStart(2,"0")}`;
    if(typeof value==="number" && value>=0 && value<1){
      const mins=Math.round(value*24*60); return `${String(Math.floor(mins/60)%24).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;
    }
    const s=clean(value); if(!s) return "";
    let m=s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if(m){let h=Number(m[1]);const mi=Number(m[2]);const ap=(m[3]||"").toUpperCase();if(ap==="PM"&&h<12)h+=12;if(ap==="AM"&&h===12)h=0;return `${String(h).padStart(2,"0")}:${String(mi).padStart(2,"0")}`;}
    return s.slice(0,5);
  }

  function findRow(rows,predicate,start=0){for(let i=start;i<rows.length;i++){if(predicate(rows[i]||[],i))return i;}return -1;}
  function firstText(row){return clean((row||[])[0]);}
  function rowHas(row,text){return (row||[]).some(v=>clean(v).includes(text));}

  function parseSheet(ws,sheetName){
    const rows=window.XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:""});
    const date=toIsoDate(rows?.[0]?.[0],sheetName);
    if(!date) return {valid:false,sheet:sheetName,error:"تعذر تحديد تاريخ التقرير"};

    const weatherIdx=findRow(rows,r=>firstText(r).includes("حالة الطقس"));
    const weather=weatherIdx>=0?clean(rows[weatherIdx][1]):"";
    const temperature=weatherIdx>=0?num(rows[weatherIdx][4]):0;

    const crews=[];
    const crewStart=findRow(rows,r=>firstText(r).includes("طواقم العمل"));
    const crewEnd=findRow(rows,r=>firstText(r).includes("المجموع"),Math.max(crewStart+1,0));
    if(crewStart>=0&&crewEnd>crewStart){
      for(let i=crewStart+1;i<crewEnd;i++){
        const name=clean(rows[i][0]); if(!name) continue;
        crews.push({crew_name:name,crew_count:num(rows[i][2]),notes:""});
      }
    }

    const opHeader=findRow(rows,r=>firstText(r).includes("موقع مكب المنيا")&&rowHas(r,"وقت البداية"));
    const stationHeader=findRow(rows,r=>firstText(r).includes("موقع محطات الترحيل"),Math.max(opHeader+1,0));
    const operations=[];
    if(opHeader>=0){
      const end=stationHeader>opHeader?stationHeader:rows.length;
      for(let i=opHeader+1;i<end;i++){
        const name=clean(rows[i][0]); if(!name) continue;
        if(name.includes("كميات النفايات الواردة")) break;
        operations.push({operation_name:name,start_time:toTime(rows[i][1]),end_time:toTime(rows[i][2]),vehicle_count:num(rows[i][3]),quantity:num(rows[i][4]),unit:clean(rows[i][5]),notes:""});
      }
    }

    const wasteHeader=findRow(rows,r=>firstText(r).includes("كميات النفايات الواردة"),Math.max(stationHeader+1,0));
    const stations=[];
    if(stationHeader>=0){
      const end=wasteHeader>stationHeader?wasteHeader:rows.length;
      for(let i=stationHeader+1;i<end;i++){
        const name=clean(rows[i][0]); if(!name||name.includes("محطات الترحيل")) continue;
        stations.push({station_name:name,truck_count:num(rows[i][3]),waste_tons:num(rows[i][4]),unit:clean(rows[i][5])||"طن",notes:""});
      }
    }

    const totalIdx=findRow(rows,r=>firstText(r).includes("المجموع النهائي"),Math.max(wasteHeader,0));
    const totalTrucks=totalIdx>=0?num(rows[totalIdx][3]):0;
    const totalWaste=totalIdx>=0?num(rows[totalIdx][4]):0;

    const eqHeader=findRow(rows,r=>firstText(r).includes("اسم الالية")||firstText(r).includes("اسم الآلية"));
    const notesHeader=findRow(rows,r=>firstText(r).includes("ملاحظات"),Math.max(eqHeader+1,0));
    const equipment=[];
    let totalDiesel=0;
    if(eqHeader>=0){
      const end=notesHeader>eqHeader?notesHeader:rows.length;
      for(let i=eqHeader+1;i<end;i++){
        const name=clean(rows[i][0]); if(!name) continue;
        if(name.includes("مجموع كمية السولار")){totalDiesel=num(rows[i][5]);continue;}
        equipment.push({equipment_name:name,operating_status:clean(rows[i][1])||"-",status_description:clean(rows[i][2]),working_hours:0,diesel_liters:num(rows[i][5]),notes:""});
      }
    }
    if(!totalDiesel) totalDiesel=equipment.reduce((s,x)=>s+num(x.diesel_liters),0);

    let notes="";
    if(notesHeader>=0){
      const parts=[];
      for(let i=notesHeader+1;i<rows.length;i++){
        const text=(rows[i]||[]).map(clean).filter(Boolean).join(" — ");
        if(!text||text.toLowerCase().includes("with the term lagoon level")) continue;
        parts.push(text);
      }
      notes=parts.join("\n");
    }

    const mainOp=operations.find(x=>x.operation_name.includes("مكب نفايات المنيا"))||operations[0]||{};
    const valid=Boolean(date&&totalIdx>=0&&equipment.length);
    return {valid,sheet:sheetName,error:valid?"":"الورقة لا تحتوي البنية المتوقعة",payload:{
      report_date:date,weather,temperature,start_time:mainOp.start_time||"04:00",end_time:mainOp.end_time||"19:00",
      total_trucks:totalTrucks,total_waste_tons:totalWaste,total_diesel:totalDiesel,notes,crews,operations,stations,equipment
    }};
  }

  function loadSheetJs(){
    if(window.XLSX) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement("script");
      s.src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
      s.onload=resolve; s.onerror=()=>reject(new Error("تعذر تحميل قارئ Excel. تحقق من اتصال الإنترنت ثم حاول مجددًا."));
      document.head.appendChild(s);
    });
  }

  async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.message||d.error||"فشل الطلب");return d;}

  function renderPreview(){
    const root=document.getElementById("excelImportPreview"); if(!root)return;
    const all=state.reports;
    root.innerHTML=`
      <div class="excel-import-summary">
        <div><span>إجمالي الأوراق اليومية</span><strong>${all.length}</strong></div>
        <div><span>جاهز للاستيراد</span><strong>${state.ready.length}</strong></div>
        <div><span>موجود مسبقًا</span><strong>${state.duplicates.length}</strong></div>
        <div><span>يحتاج مراجعة</span><strong>${state.invalid.length}</strong></div>
      </div>
      <div class="excel-import-table-wrap"><table class="v3-table excel-import-table"><thead><tr><th>الحالة</th><th>التاريخ</th><th>العمال</th><th>النفايات</th><th>الشاحنات</th><th>السولار</th><th>المعدات</th></tr></thead><tbody>${all.map(x=>{
        const p=x.payload||{}; const workers=(p.crews||[]).reduce((s,c)=>s+num(c.crew_count),0);
        const status=x.status==="ready"?"جاهز":x.status==="duplicate"?"موجود مسبقًا":"مراجعة";
        return `<tr class="excel-row-${x.status}"><td><span class="excel-import-status ${x.status}">${status}</span></td><td>${esc(p.report_date||x.sheet)}</td><td>${fmt(workers)}</td><td>${fmt(p.total_waste_tons)} طن</td><td>${fmt(p.total_trucks)}</td><td>${fmt(p.total_diesel)} لتر</td><td>${fmt((p.equipment||[]).length)}</td></tr>`;
      }).join("")}</tbody></table></div>
      <div class="excel-import-actions">
        <button id="excelImportApprove" type="button" class="v3-primary" ${state.ready.length?"":"disabled"}>اعتماد الاستيراد (${state.ready.length})</button>
        <button id="excelImportCancel" type="button" class="excel-import-cancel">إلغاء</button>
      </div>
      <p class="excel-import-note">لن يتم حفظ الأوراق الموجودة مسبقًا أو الأوراق التي تحتاج مراجعة.</p>`;
    document.getElementById("excelImportApprove")?.addEventListener("click",approveImport);
    document.getElementById("excelImportCancel")?.addEventListener("click",resetImport);
  }

  async function previewFile(file){
    const msg=document.getElementById("excelImportMessage");
    try{
      msg.textContent="جاري قراءة الملف وبناء المعاينة...";
      await loadSheetJs();
      const wb=window.XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
      const parsed=[];
      for(const sheetName of wb.SheetNames){
        if(clean(sheetName).toLowerCase()==="summary") continue;
        const item=parseSheet(wb.Sheets[sheetName],sheetName);
        parsed.push(item);
      }
      const current=await api("/api/reports");
      const existing=new Set((current.reports||[]).map(r=>String(r.report_date||"")));
      state.fileName=file.name; state.reports=parsed.map(x=>({...x,status:!x.valid?"invalid":existing.has(x.payload.report_date)?"duplicate":"ready"}));
      state.ready=state.reports.filter(x=>x.status==="ready"); state.duplicates=state.reports.filter(x=>x.status==="duplicate"); state.invalid=state.reports.filter(x=>x.status==="invalid");
      msg.textContent=`تمت قراءة ${state.reports.length} ورقة يومية من ${file.name}. راجع المعاينة ثم اختر اعتماد أو إلغاء.`;
      renderPreview();
    }catch(e){console.error(e);msg.textContent=e.message||"تعذر قراءة ملف Excel";}
  }

  async function approveImport(){
    if(!state.ready.length) return;
    const btn=document.getElementById("excelImportApprove"),msg=document.getElementById("excelImportMessage");
    if(btn)btn.disabled=true;
    let saved=0; const created=[];
    try{
      msg.textContent=`جاري استيراد ${state.ready.length} تقرير...`;
      for(const item of state.ready){
        const data=await api("/api/reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(item.payload)});
        saved++; if(data.report?.id)created.push(data.report.id);
        msg.textContent=`تم حفظ ${saved} من ${state.ready.length} تقرير...`;
      }
      msg.textContent=`تم استيراد الشهر بنجاح: ${saved} تقرير. يمكنك الآن مراجعة يناير 2025 من الأرشيف قبل الانتقال للشهر التالي.`;
      state.reports.forEach(x=>{if(x.status==="ready")x.status="duplicate";}); state.duplicates=state.reports.filter(x=>x.status==="duplicate");state.ready=[];renderPreview();
    }catch(e){
      console.error(e);
      msg.textContent=`توقف الاستيراد بعد حفظ ${saved} تقرير. السبب: ${e.message}. لا تعِد الاستيراد قبل مراجعة الأرشيف؛ المعاينة ستتعرف على التقارير المحفوظة كمكررة.`;
      try{const current=await api("/api/reports");const existing=new Set((current.reports||[]).map(r=>String(r.report_date||"")));state.reports=state.reports.map(x=>({...x,status:!x.valid?"invalid":existing.has(x.payload.report_date)?"duplicate":"ready"}));state.ready=state.reports.filter(x=>x.status==="ready");state.duplicates=state.reports.filter(x=>x.status==="duplicate");renderPreview();}catch{}
    }finally{if(btn)btn.disabled=false;}
  }

  function resetImport(){
    state.reports=[];state.ready=[];state.duplicates=[];state.invalid=[];state.fileName="";
    const input=document.getElementById("excelImportFile");if(input)input.value="";
    const preview=document.getElementById("excelImportPreview");if(preview)preview.innerHTML="";
    const msg=document.getElementById("excelImportMessage");if(msg)msg.textContent="لم يتم اختيار ملف بعد.";
  }

  function mount(){
    const c=document.getElementById("v3Content"); if(!c||document.getElementById("excelImportPanel"))return;
    const panel=document.createElement("div");panel.id="excelImportPanel";panel.className="v3-panel excel-import-panel";
    panel.innerHTML=`<div class="excel-import-head"><div><span>EXCEL IMPORT</span><h3>استيراد التقارير القديمة من Excel</h3><p>اختر ملف شهر واحد. يتم تجاهل ورقة <b>summary</b> تلقائيًا، ثم تظهر المعاينة قبل أي حفظ.</p></div></div><div class="excel-import-picker"><input id="excelImportFile" type="file" accept=".xlsx,.xls"><button id="excelImportPreviewBtn" type="button" class="v3-primary">معاينة الملف</button></div><p id="excelImportMessage" class="excel-import-message">لم يتم اختيار ملف بعد.</p><div id="excelImportPreview"></div>`;
    c.prepend(panel);
    document.getElementById("excelImportPreviewBtn")?.addEventListener("click",()=>{const f=document.getElementById("excelImportFile")?.files?.[0];if(!f){document.getElementById("excelImportMessage").textContent="اختر ملف Excel أولًا.";return;}previewFile(f);});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>setTimeout(mount,0)); else setTimeout(mount,0);
})();

;

/* ===== js/app-report-workflow.js ===== */
/* =========================================================
   سير اعتماد التقرير: مسودة -> مراجعة -> معتمد
========================================================= */
(function () {
  const pathName = location.pathname.replace(/\/+$/, "") || "/";
  let workflowReportId = null;

  const statusInfo = {
    draft: { label: "مسودة", className: "draft" },
    pending: { label: "مرسل للمراجعة", className: "pending" },
    approved: { label: "معتمد", className: "approved" },
  };

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }

  function formatDateTime(value) {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return String(value); }
  }

  async function api(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || "فشل تنفيذ الطلب");
    return data;
  }

  function getCurrentReportId() {
    const queryId = Number(new URLSearchParams(location.search).get("edit") || 0);
    if (queryId) return queryId;
    try { if (typeof editingId !== "undefined" && editingId) return Number(editingId); } catch {}
    return 0;
  }

  function setControlLocked(element, locked) {
    if (!element) return;
    if (locked) {
      if (!element.dataset.workflowWasDisabled) element.dataset.workflowWasDisabled = element.disabled ? "1" : "0";
      element.disabled = true;
      element.setAttribute("aria-disabled", "true");
    } else {
      const wasDisabled = element.dataset.workflowWasDisabled === "1";
      element.disabled = wasDisabled;
      delete element.dataset.workflowWasDisabled;
      element.removeAttribute("aria-disabled");
    }
  }

  function applyReportLock(status) {
    const main = document.querySelector("main.container");
    if (!main) return;
    const locked = status !== "draft";
    main.classList.toggle("workflow-locked", locked);

    const editableSelectors = [
      "#reportFormSection input", "#reportFormSection select", "#reportFormSection textarea",
      "#crewsTable input", "#crewsTable select", "#crewsTable textarea",
      "#operationsTable input", "#operationsTable select", "#operationsTable textarea",
      "#stationsTable input", "#stationsTable select", "#stationsTable textarea",
      "#equipmentTable input", "#equipmentTable select", "#equipmentTable textarea",
      "#notes", "#saveBtn", "#attachmentFile", "#attachmentUploadBtn"
    ];
    main.querySelectorAll(editableSelectors.join(",")).forEach((element) => setControlLocked(element, locked));

    if (locked) {
      main.querySelectorAll("#reportAttachmentsPanel button[data-delete], #reportAttachmentsPanel .attachment-delete").forEach((element) => setControlLocked(element, true));
    }

    let notice = document.getElementById("workflowReadOnlyNotice");
    if (locked && !notice) {
      notice = document.createElement("div");
      notice.id = "workflowReadOnlyNotice";
      notice.className = "workflow-readonly-notice no-print";
      notice.textContent = "التقرير للقراءة فقط. لإجراء تعديل يجب على المدير إعادة فتحه كمسودة.";
      const panel = document.getElementById("reportWorkflowPanel");
      panel?.after(notice);
    } else if (!locked && notice) notice.remove();
  }

  function buildWorkflowPanel(report) {
    let panel = document.getElementById("reportWorkflowPanel");
    if (!panel) {
      panel = document.createElement("section"); panel.id = "reportWorkflowPanel"; panel.className = "report-workflow-panel no-print";
      const main = document.querySelector("main.container"); const banner = document.getElementById("reportEditBanner"); const firstPanel = main?.querySelector("section.panel");
      if (main && banner) banner.after(panel); else if (main && firstPanel) main.insertBefore(panel, firstPanel); else main?.prepend(panel);
    }

    const status = report.workflow_status || "draft"; const info = statusInfo[status] || statusInfo.draft; const role = window.MINYA_USER?.role || "viewer";
    const canSubmit = status === "draft" && (role === "admin" || role === "editor"); const canApprove = status === "pending" && role === "admin"; const canReopen = status !== "draft" && role === "admin";
    let detail = "التقرير قابل للتعديل والحفظ.";
    if (status === "pending") detail = "التقرير مقفل حاليًا بانتظار مراجعة المدير واعتماده.";
    if (status === "approved") detail = `تم اعتماد التقرير${report.approved_by_name ? ` بواسطة ${escapeHtml(report.approved_by_name)}` : ""}${report.approved_at ? ` بتاريخ ${formatDateTime(report.approved_at)}` : ""}.`;

    panel.innerHTML = `<div class="workflow-summary"><div><span class="workflow-kicker">حالة التقرير</span><div class="workflow-status-line"><strong>${escapeHtml(report.report_no || "تقرير محفوظ")}</strong><span class="workflow-badge ${info.className}">${info.label}</span></div><small>${detail}</small></div><div class="workflow-actions">${canSubmit ? `<button type="button" data-workflow-action="submit" class="workflow-primary">إرسال للمراجعة</button>` : ""}${canApprove ? `<button type="button" data-workflow-action="approve" class="workflow-approve">اعتماد التقرير</button>` : ""}${canReopen ? `<button type="button" data-workflow-action="reopen" class="workflow-secondary">إعادة فتح كمسودة</button>` : ""}</div></div><div class="workflow-steps"><div class="${status === "draft" ? "active" : "done"}"><i>1</i><span>مسودة</span></div><b></b><div class="${status === "pending" ? "active" : status === "approved" ? "done" : ""}"><i>2</i><span>مراجعة</span></div><b></b><div class="${status === "approved" ? "active done" : ""}"><i>3</i><span>معتمد</span></div></div>`;
    panel.querySelectorAll("[data-workflow-action]").forEach((button) => button.addEventListener("click", () => runWorkflowAction(button.dataset.workflowAction, report)));
    applyReportLock(status);
  }

  async function runWorkflowAction(action, report) {
    const messages = { submit: "إرسال التقرير للمراجعة؟ بعد الإرسال سيتوقف التعديل حتى يعيد المدير فتحه.", approve: "اعتماد هذا التقرير نهائيًا؟ سيصبح مقفلًا بعد الاعتماد.", reopen: "إعادة فتح التقرير كمسودة؟ سيتم إلغاء حالة المراجعة/الاعتماد الحالية." };
    if (!confirm(messages[action] || "متابعة؟")) return;
    try {
      const data = await api(`/api/reports/${report.id}/${action}`, { method: "POST" });
      if (typeof showMessage === "function") showMessage(data.message || "تم تحديث حالة التقرير");
      setTimeout(() => location.reload(), 250);
    } catch (error) { if (typeof showMessage === "function") showMessage(error.message); else alert(error.message); }
  }

  async function refreshReportWorkflow(force = false) {
    if (pathName !== "/report") return; const id = getCurrentReportId(); if (!id) return;
    if (!force && workflowReportId === id && document.getElementById("reportWorkflowPanel")) return;
    try { const data = await api(`/api/reports/${id}`); workflowReportId = id; buildWorkflowPanel(data.report || data); } catch (error) { console.error("Report workflow load failed", error); }
  }

  async function decorateArchiveStatuses() {
    if (pathName !== "/archive") return;
    try {
      const data = await api("/api/reports"); const reports = Array.isArray(data.reports) ? data.reports : []; const byNumber = new Map(reports.map((r) => [String(r.report_no || ""), r]));
      const decorate = () => { const tbody = document.querySelector("#archiveTable tbody"); if (!tbody) return; Array.from(tbody.rows).forEach((row) => { const firstCell = row.cells?.[0]; if (!firstCell || firstCell.querySelector(".archive-workflow-badge")) return; const report = byNumber.get(String(firstCell.textContent || "").trim()); if (!report) return; const info = statusInfo[report.workflow_status || "draft"] || statusInfo.draft; const badge = document.createElement("span"); badge.className = `archive-workflow-badge ${info.className}`; badge.textContent = info.label; firstCell.appendChild(badge); }); };
      decorate(); const observer = new MutationObserver(decorate); const body = document.querySelector("#archiveTable tbody"); if (body) observer.observe(body, { childList: true, subtree: true }); setTimeout(decorate, 500); setTimeout(decorate, 1500);
    } catch (error) { console.error("Archive workflow status failed", error); }
  }

  function init() {
    if (pathName === "/report") { setTimeout(() => refreshReportWorkflow(true), 250); const timer = setInterval(() => refreshReportWorkflow(false), 700); setTimeout(() => clearInterval(timer), 30000); }
    else if (pathName === "/archive") setTimeout(decorateArchiveStatuses, 450);
  }

  window.refreshReportWorkflow = refreshReportWorkflow;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();

;

/* ===== js/app-reviews.js ===== */
/* =========================================================
   صندوق مراجعة واعتماد التقارير
========================================================= */
(function () {
  const currentPath = location.pathname.replace(/\/+$/, "") || "/";
  const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const fmt = (value) => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

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

  async function addDashboardReviewCard() {
    if (currentPath !== "/" || window.MINYA_USER?.role !== "admin") return;
    const count = await refreshGlobalReviewCount(); if (count === null) return;
    const grid = document.querySelector(".dashboard-grid, .home-dashboard-grid, [data-dashboard-grid]");
    if (!grid || document.getElementById("dashboardReviewCard")) return;
    const card = document.createElement("a"); card.id = "dashboardReviewCard"; card.className = `dashboard-card review-dashboard-card${count ? " has-pending" : ""}`; card.href = "/reviews";
    card.innerHTML = `<span class="dashboard-icon">✓</span><h3>مراجعة واعتماد التقارير</h3><p>${count ? `يوجد ${count} تقرير بانتظار المراجعة والاعتماد.` : "لا توجد تقارير بانتظار الاعتماد حاليًا."}</p><strong class="review-count">${count}</strong>`;
    grid.appendChild(card);
  }

  function renderShell() {
    const main = document.querySelector("main.container"); if (!main) return null;
    main.innerHTML = `<section class="reviews-page"><div class="reviews-hero"><div><span>REPORT APPROVAL</span><h2>مراجعة واعتماد التقارير</h2><p>التقارير التي أرسلها المحررون للمراجعة قبل اعتمادها النهائي.</p></div><div class="reviews-hero-count"><strong id="reviewsCount">0</strong><small>بانتظار الاعتماد</small></div></div><div class="reviews-toolbar"><label>من<input id="reviewsFrom" type="date"></label><label>إلى<input id="reviewsTo" type="date"></label><button id="reviewsRefresh" type="button">تحديث</button><button id="reviewsClear" type="button">مسح الفلاتر</button><span id="reviewsMsg"></span></div><div class="reviews-panel"><div class="reviews-table-wrap"><table class="reviews-table"><thead><tr><th>التقرير</th><th>التاريخ</th><th>أرسله</th><th>وقت الإرسال</th><th>النفايات</th><th>الشاحنات</th><th>السولار</th><th>الإجراء</th></tr></thead><tbody id="reviewsBody"></tbody></table></div></div></section>`;
    return main;
  }

  async function renderReviewsPage() {
    if (currentPath !== "/reviews") return;
    const user = await waitForUser(); addReviewNav(); const main = renderShell(); if (!main) return;
    if (user?.role !== "admin") { main.querySelector(".reviews-page").innerHTML = `<div class="reviews-denied"><h2>هذه الصفحة للمدير فقط</h2><a href="/">العودة للرئيسية</a></div>`; return; }

    const body = document.getElementById("reviewsBody"); const msg = document.getElementById("reviewsMsg");
    const fromInput = document.getElementById("reviewsFrom"); const toInput = document.getElementById("reviewsTo"); const countEl = document.getElementById("reviewsCount");
    const refreshBtn = document.getElementById("reviewsRefresh"); const clearBtn = document.getElementById("reviewsClear");

    async function load() {
      try {
        refreshBtn.disabled = true; msg.textContent = "جاري التحديث...";
        const params = new URLSearchParams(); if (fromInput.value) params.set("from", fromInput.value); if (toInput.value) params.set("to", toInput.value);
        const data = await api(`/api/reviews/pending?${params}`); const reports = data.reports || []; countEl.textContent = reports.length; addReviewNav(reports.length);
        body.innerHTML = reports.length ? reports.map((r) => `<tr><td><strong>${esc(r.report_no)}</strong><small>مرسل للمراجعة</small></td><td>${esc(r.report_date)}</td><td>${esc(r.submitted_by_name || "-")}</td><td>${dt(r.submitted_at)}</td><td>${fmt(r.total_waste_tons)} طن</td><td>${fmt(r.total_trucks)}</td><td>${fmt(r.total_diesel)} لتر</td><td class="review-row-actions"><a href="/report?edit=${r.id}">فتح ومراجعة</a><button class="review-approve" data-id="${r.id}" data-no="${esc(r.report_no)}">اعتماد</button><button class="review-return" data-id="${r.id}" data-no="${esc(r.report_no)}">إعادة كمسودة</button></td></tr>`).join("") : `<tr><td colspan="8" class="reviews-empty">لا توجد تقارير بانتظار الاعتماد.</td></tr>`;
        body.querySelectorAll(".review-approve").forEach((button) => button.onclick = async () => { if (!confirm(`اعتماد التقرير ${button.dataset.no}؟`)) return; try { await api(`/api/reports/${button.dataset.id}/approve`, { method: "POST" }); msg.textContent = "تم اعتماد التقرير"; await load(); } catch (error) { msg.textContent = error.message; } });
        body.querySelectorAll(".review-return").forEach((button) => button.onclick = async () => { const reason = prompt(`سبب إعادة التقرير ${button.dataset.no} كمسودة (اختياري):`, ""); if (reason === null || !confirm("إعادة التقرير كمسودة ليتم تعديله؟")) return; try { await api(`/api/reports/${button.dataset.id}/reopen`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }); msg.textContent = "تمت إعادة التقرير كمسودة"; await load(); } catch (error) { msg.textContent = error.message; } });
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

;

/* ===== js/app-logout-header.js ===== */
/* Stable header logout button — always visible inside top header */
(function () {
  const publicPages = ['/login.html', '/setup.html'];
  if (publicPages.includes(location.pathname)) return;

  async function logout(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const btn = document.getElementById('minyaLogoutBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'جاري الخروج...';
    }

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
    } catch (_) {
      // Redirect anyway; auth guard will handle any stale session state on reload.
    } finally {
      window.location.href = '/login.html';
    }
  }

  function styleButton(btn) {
    Object.assign(btn.style, {
      position: 'absolute',
      left: '16px',
      top: '16px',
      zIndex: '80',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '64px',
      minHeight: '34px',
      padding: '7px 12px',
      margin: '0',
      color: 'rgba(255,255,255,.96)',
      background: 'rgba(255,255,255,.10)',
      border: '1px solid rgba(255,255,255,.24)',
      borderRadius: '9px',
      fontSize: '13px',
      fontWeight: '700',
      lineHeight: '1',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,.08)',
      transition: 'background .15s ease,border-color .15s ease',
      pointerEvents: 'auto'
    });

    btn.onmouseenter = () => {
      btn.style.background = 'rgba(255,255,255,.17)';
      btn.style.borderColor = 'rgba(255,255,255,.34)';
    };
    btn.onmouseleave = () => {
      btn.style.background = 'rgba(255,255,255,.10)';
      btn.style.borderColor = 'rgba(255,255,255,.24)';
    };
  }

  function ensureButton() {
    const header = document.querySelector('.top-header');
    if (!header) return false;

    if (getComputedStyle(header).position === 'static') {
      header.style.position = 'relative';
    }

    let btn = document.getElementById('minyaLogoutBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'minyaLogoutBtn';
      btn.textContent = 'خروج';
      btn.setAttribute('aria-label', 'تسجيل الخروج');
      btn.addEventListener('click', logout, true);
    }

    styleButton(btn);
    if (btn.parentElement !== header) header.appendChild(btn);
    return true;
  }

  function init() {
    ensureButton();
    setTimeout(ensureButton, 50);
    setTimeout(ensureButton, 150);
    setTimeout(ensureButton, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
;

/* ===== js/app-review-print.js ===== */
/* Review-only PDF print for the current report screen. Does not modify official report printing. */
(function () {
  const BUTTON_ID = "printUiReviewBtn";
  const FRAME_ID = "minyaUiReviewPrintFrame";

  function syncFormValues(root) {
    root.querySelectorAll("input").forEach((input) => {
      if (input.type === "checkbox" || input.type === "radio") {
        if (input.checked) input.setAttribute("checked", "checked");
        else input.removeAttribute("checked");
      } else {
        input.setAttribute("value", input.value ?? "");
      }
    });

    root.querySelectorAll("textarea").forEach((textarea) => {
      textarea.textContent = textarea.value ?? "";
    });

    root.querySelectorAll("select").forEach((select) => {
      Array.from(select.options).forEach((option, index) => {
        if (index === select.selectedIndex) option.setAttribute("selected", "selected");
        else option.removeAttribute("selected");
      });
    });
  }

  function buildReviewDocument() {
    const sourceMain = document.querySelector("main.container");
    if (!sourceMain) return null;

    const clone = sourceMain.cloneNode(true);
    syncFormValues(clone);

    clone.querySelectorAll("#archiveSection, .actions, #message, script").forEach((el) => el.remove());
    clone.querySelectorAll(".hidden").forEach((el) => {
      if (el.id !== "archiveSection") el.classList.remove("hidden");
    });

    const title = document.createElement("div");
    title.className = "review-print-title";
    title.innerHTML = `
      <strong>مراجعة تنسيق واجهة التقرير اليومي</strong>
      <span>نسخة مخصصة لمراجعة جميع الأقسام قبل اعتماد أي تعديلات تصميمية</span>
    `;
    clone.prepend(title);

    return clone;
  }

  function buildHtml(reviewMain) {
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map((link) => `<link rel="stylesheet" href="${link.href}">`)
      .join("\n");

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>مراجعة واجهة التقرير اليومي</title>
${styles}
<style>
  html,body{margin:0!important;padding:0!important;background:#f3f6f5!important;color:#1f2d27!important;direction:rtl!important;}
  body{padding:10mm 8mm!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .container{width:100%!important;max-width:none!important;margin:0 auto!important;}
  .review-print-title{margin:0 0 14px;padding:14px 16px;background:#174b3a;color:#fff;border-radius:12px;display:flex;flex-direction:column;gap:3px;break-inside:avoid;}
  .review-print-title strong{font-size:18px;}
  .review-print-title span{font-size:10px;color:rgba(255,255,255,.72);}
  .top-header,.actions,#archiveSection,#message{display:none!important;}
  .panel,.smart-status-panel,.smart-monitoring,.dashboard-card,.daily-summary>div{break-inside:avoid;page-break-inside:avoid;}
  .panel{margin-bottom:9px!important;padding:12px!important;border-radius:11px!important;box-shadow:none!important;}
  .panel>h2{margin-bottom:9px!important;font-size:15px!important;}
  table{width:100%!important;table-layout:auto!important;box-shadow:none!important;}
  th,td{padding:5px 5px!important;font-size:10px!important;}
  input,select,textarea{min-height:28px!important;padding:4px 6px!important;font-size:10px!important;background:#fff!important;}
  textarea{min-height:58px!important;}
  .daily-summary{gap:6px!important;}
  .daily-summary>div{min-height:58px!important;padding:7px 8px!important;}
  button{display:none!important;}
  @page{size:A4 portrait;margin:7mm;}
  @media print{
    html,body{background:#f3f6f5!important;}
    .container{width:100%!important;}
  }
</style>
</head>
<body>${reviewMain.outerHTML}</body>
</html>`;
  }

  function printReview() {
    const reviewMain = buildReviewDocument();
    if (!reviewMain) {
      alert("تعذر تجهيز أقسام التقرير للمراجعة.");
      return;
    }

    const oldFrame = document.getElementById(FRAME_ID);
    if (oldFrame) oldFrame.remove();

    const frame = document.createElement("iframe");
    frame.id = FRAME_ID;
    frame.setAttribute("aria-hidden", "true");
    Object.assign(frame.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "1px",
      height: "1px",
      border: "0",
      opacity: "0",
      pointerEvents: "none"
    });
    document.body.appendChild(frame);

    const frameWindow = frame.contentWindow;
    const frameDocument = frame.contentDocument || frameWindow?.document;
    if (!frameWindow || !frameDocument) {
      frame.remove();
      alert("تعذر فتح معاينة الطباعة.");
      return;
    }

    frameDocument.open();
    frameDocument.write(buildHtml(reviewMain));
    frameDocument.close();

    let printed = false;
    const runPrint = () => {
      if (printed) return;
      printed = true;
      setTimeout(() => {
        try {
          frameWindow.focus();
          frameWindow.print();
        } catch (error) {
          console.error("Review print failed", error);
          alert("تعذر تشغيل الطباعة. حاول مرة أخرى.");
        }
        setTimeout(() => frame.remove(), 1500);
      }, 450);
    };

    frame.onload = runPrint;
    setTimeout(runPrint, 900);
  }

  function mountButton() {
    if (location.pathname !== "/report") return;
    if (document.getElementById(BUTTON_ID)) return;

    const actions = document.querySelector("section.actions");
    if (!actions) return;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "طباعة مراجعة الواجهة";
    button.title = "تجميع جميع أقسام شاشة التقرير في ملف PDF للمراجعة";
    Object.assign(button.style, {
      marginInlineStart: "10px",
      background: "#f5f8f7",
      color: "#295443",
      border: "1px solid #cfded6",
      minHeight: "42px",
      padding: "9px 16px",
      fontWeight: "700",
      cursor: "pointer"
    });
    button.addEventListener("click", printReview);
    actions.appendChild(button);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(mountButton, 200), { once: true });
  } else {
    setTimeout(mountButton, 200);
  }
})();

;

/* ===== js/app-site-review-print.js ===== */
/* Full-site review print. Collects all application pages into one printable document. */
(function () {
  const BUTTON_ID = "printWholeSiteReviewBtn";
  const FRAME_ID = "minyaSiteReviewFrame";

  const pages = [
    ["/", "الصفحة الرئيسية"],
    ["/report", "التقرير اليومي"],
    ["/archive", "أرشيف التقارير"],
    ["/monthly", "التقرير الشهري"],
    ["/annual", "التقرير السنوي"],
    ["/equipment", "المعدات والصيانة"],
    ["/weekly", "التقرير الأسبوعي"],
    ["/search", "البحث المتقدم"],
    ["/managerial", "التقرير الإداري"],
    ["/admin", "الإدارة والصلاحيات"],
    ["/system.html", "إدارة النظام"],
    ["/reviews", "مراجعة واعتماد التقارير"]
  ];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function syncValues(root) {
    root.querySelectorAll("input").forEach((input) => {
      if (input.type === "checkbox" || input.type === "radio") {
        if (input.checked) input.setAttribute("checked", "checked");
        else input.removeAttribute("checked");
      } else {
        input.setAttribute("value", input.value || "");
      }
    });
    root.querySelectorAll("textarea").forEach((el) => { el.textContent = el.value || ""; });
    root.querySelectorAll("select").forEach((select) => {
      Array.from(select.options).forEach((option, index) => {
        if (index === select.selectedIndex) option.setAttribute("selected", "selected");
        else option.removeAttribute("selected");
      });
    });
  }

  function cleanupClone(root) {
    root.querySelectorAll("script, #minyaLoadingScreen, #minyaLogoutBtn, #printUiReviewBtn, #printWholeSiteReviewBtn").forEach((el) => el.remove());
    root.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
      button.removeAttribute("onclick");
    });
    root.querySelectorAll("a").forEach((a) => a.removeAttribute("href"));
    return root;
  }

  function createLoaderFrame() {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    Object.assign(frame.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: "1280px",
      height: "900px",
      opacity: "0",
      pointerEvents: "none",
      border: "0"
    });
    document.body.appendChild(frame);
    return frame;
  }

  function loadRoute(frame, route) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = async () => {
        if (settled) return;
        settled = true;
        await sleep(1100);
        resolve();
      };
      frame.onload = finish;
      frame.src = route;
      setTimeout(finish, 3500);
    });
  }

  function collectStyleLinks(doc, bag) {
    doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      if (link.href) bag.add(link.href);
    });
  }

  async function capturePages(button) {
    const frame = createLoaderFrame();
    const styleLinks = new Set();
    const sections = [];

    try {
      for (let i = 0; i < pages.length; i += 1) {
        const [route, label] = pages[i];
        button.textContent = `تجهيز ${i + 1} / ${pages.length}`;
        await loadRoute(frame, route);

        let doc;
        try { doc = frame.contentDocument; } catch (_) { doc = null; }
        if (!doc || !doc.body) continue;

        const currentPath = frame.contentWindow?.location?.pathname || "";
        if (currentPath === "/login.html" || currentPath === "/setup.html") continue;

        collectStyleLinks(doc, styleLinks);

        const source = doc.querySelector("main.container") || doc.querySelector("main") || doc.body;
        if (!source) continue;
        const clone = cleanupClone(source.cloneNode(true));
        syncValues(clone);

        const wrapper = document.createElement("section");
        wrapper.className = "site-review-page";
        wrapper.innerHTML = `<div class="site-review-page-title"><span>MINYA LANDFILL</span><strong>${label}</strong><small>${route}</small></div>`;
        wrapper.appendChild(clone);
        sections.push(wrapper.outerHTML);
      }
    } finally {
      frame.remove();
    }

    return { sections, styleLinks: Array.from(styleLinks) };
  }

  function buildPrintFrame(payload) {
    document.getElementById(FRAME_ID)?.remove();
    const frame = document.createElement("iframe");
    frame.id = FRAME_ID;
    frame.setAttribute("aria-hidden", "true");
    Object.assign(frame.style, {
      position: "fixed",
      left: "0",
      bottom: "0",
      width: "1px",
      height: "1px",
      opacity: "0",
      border: "0",
      pointerEvents: "none"
    });
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    const links = payload.styleLinks.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n");
    doc.open();
    doc.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>مراجعة جميع صفحات نظام مكب المنيا</title>
${links}
<style>
  *{box-sizing:border-box!important}
  html,body{margin:0!important;padding:0!important;background:#eef2f0!important;color:#1f2d27!important;direction:rtl!important;font-family:Tahoma,Arial,sans-serif!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{padding:7mm!important}
  .site-review-cover{background:#174b3a!important;color:#fff!important;padding:18mm 14mm!important;border-radius:16px!important;margin-bottom:8mm!important;page-break-after:always!important}
  .site-review-cover h1{margin:0 0 6px!important;font-size:27px!important}.site-review-cover p{margin:0!important;color:rgba(255,255,255,.72)!important}
  .site-review-page{background:#f5f7f6!important;margin:0 0 8mm!important;padding:5mm!important;border-radius:12px!important;page-break-before:always!important}
  .site-review-page:first-of-type{page-break-before:auto!important}
  .site-review-page-title{display:flex!important;align-items:baseline!important;gap:9px!important;padding:10px 12px!important;margin:0 0 12px!important;background:#174b3a!important;color:#fff!important;border-radius:10px!important;break-inside:avoid!important}
  .site-review-page-title span{font-size:8px!important;letter-spacing:1px!important;opacity:.65!important}.site-review-page-title strong{font-size:16px!important}.site-review-page-title small{margin-right:auto!important;direction:ltr!important;opacity:.55!important;font-size:8px!important}
  .top-header,#minyaLogoutBtn,#minyaLoadingScreen{display:none!important}
  main.container,.container,main{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
  .panel,.dashboard-card,.dashboard-metric-card,.dashboard-recent-panel,.executive-dashboard,.v3-panel,.v3-hero,.reviews-panel,.reviews-hero,.monthly-chart,.monthly-comparison,#annualSummarySection{box-shadow:none!important;break-inside:avoid!important;page-break-inside:avoid!important}
  table{width:100%!important;max-width:100%!important;box-shadow:none!important} th,td{font-size:9px!important;padding:5px 4px!important}
  input,select,textarea{font-size:9px!important;min-height:28px!important;padding:4px 6px!important}
  button{pointer-events:none!important}
  .no-print{display:block!important}
  @page{size:A4 portrait;margin:7mm}
  @media print{body{background:#eef2f0!important;padding:0!important}.site-review-page{margin-bottom:0!important;border-radius:0!important}.site-review-cover{border-radius:0!important}}
</style>
</head>
<body>
<section class="site-review-cover"><h1>مراجعة جميع صفحات نظام إدارة مكب المنيا</h1><p>نسخة موحدة لمراجعة تصميم وتنسيق جميع صفحات وأقسام النظام.</p></section>
${payload.sections.join("\n")}
</body>
</html>`);
    doc.close();
    return frame;
  }

  async function printWholeSite() {
    const button = document.getElementById(BUTTON_ID);
    if (!button || button.dataset.busy === "1") return;
    button.dataset.busy = "1";
    button.disabled = true;
    const original = button.textContent;

    try {
      const payload = await capturePages(button);
      if (!payload.sections.length) throw new Error("لم يتم العثور على صفحات قابلة للطباعة");
      button.textContent = "فتح الطباعة...";
      const frame = buildPrintFrame(payload);
      await sleep(1300);
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 60000);
    } catch (error) {
      console.error("Full site review print failed", error);
      alert(`تعذر تجهيز ملف مراجعة النظام: ${error.message || error}`);
    } finally {
      button.dataset.busy = "0";
      button.disabled = false;
      button.textContent = original;
    }
  }

  function mountButton() {
    if ((location.pathname.replace(/\/+$/, "") || "/") !== "/") return;
    if (document.getElementById(BUTTON_ID)) return;
    const main = document.querySelector("main.container");
    if (!main) return;

    const panel = document.createElement("section");
    panel.className = "site-review-action-panel";
    Object.assign(panel.style, {
      marginTop: "18px",
      padding: "18px",
      textAlign: "center",
      background: "#fff",
      border: "1px solid #e2e9e5",
      borderRadius: "16px",
      boxShadow: "0 4px 12px rgba(19,45,34,.05)"
    });
    panel.innerHTML = `<div style="margin-bottom:10px"><strong style="display:block;color:#26362f;font-size:16px">مراجعة تصميم النظام كاملًا</strong><small style="color:#6f7d76">تجميع جميع صفحات وأقسام الموقع في ملف PDF واحد للمراجعة.</small></div>`;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "طباعة جميع صفحات النظام";
    Object.assign(button.style, {
      minHeight: "42px",
      padding: "9px 18px",
      background: "#246b52",
      color: "#fff",
      border: "1px solid #246b52",
      borderRadius: "10px",
      fontWeight: "800",
      cursor: "pointer"
    });
    button.addEventListener("click", printWholeSite);
    panel.appendChild(button);
    main.appendChild(panel);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(mountButton, 1000), { once: true });
  else setTimeout(mountButton, 1000);
})();

;

/* ===== js/app-header-menu.js ===== */
/* Mobile-only vertical header menu */
(function(){
  const items = [
    {label:"الرئيسية", href:"/", icon:"⌂"},
    {label:"تقرير جديد", href:"/report", icon:"✎", hideFor:["viewer"]},
    {label:"أرشيف التقارير", href:"/archive", icon:"▤"},
    {label:"التقرير الشهري", href:"/monthly", icon:"▦"},
    {label:"التقرير السنوي", href:"/annual", icon:"◔"},
    {label:"المعدات والصيانة", href:"/equipment", icon:"⚙"},
    {label:"التقرير الأسبوعي", href:"/weekly", icon:"≋"},
    {label:"البحث المتقدم", href:"/search", icon:"⌕"},
    {label:"التقرير الإداري", href:"/managerial", icon:"▧"},
    {label:"الإدارة والصلاحيات", href:"/admin", icon:"◇", adminOnly:true},
    {label:"إدارة النظام", href:"/system.html", icon:"⚙", adminOnly:true},
    {label:"استيراد Google Drive", href:"/drive-import.html", icon:"⇩", adminOnly:true},
    {label:"المراجعة والاعتماد", href:"/reviews", icon:"✓", adminOnly:true}
  ];

  function currentPath(){
    return location.pathname.replace(/\/+$/,"") || "/";
  }

  function build(){
    if(!window.matchMedia("(max-width: 760px)").matches) return;
    const header=document.querySelector(".top-header");
    if(!header || document.getElementById("minyaMenuButton")) return;

    const role=(window.MINYA_USER && window.MINYA_USER.role) || document.documentElement.dataset.userRole || "";
    const path=currentPath();

    const wrap=document.createElement("div");
    wrap.className="minya-header-menu-wrap";

    const btn=document.createElement("button");
    btn.id="minyaMenuButton";
    btn.type="button";
    btn.className="minya-menu-button";
    btn.setAttribute("aria-label","فتح قائمة التنقل");
    btn.setAttribute("aria-expanded","false");
    btn.innerHTML='<span aria-hidden="true">☰</span><small>القائمة</small>';

    const menu=document.createElement("div");
    menu.id="minyaHeaderMenu";
    menu.className="minya-header-menu";
    menu.hidden=true;

    menu.innerHTML=items.filter(item=>{
      if(item.adminOnly && role!=="admin") return false;
      if(item.hideFor && item.hideFor.includes(role)) return false;
      return true;
    }).map(item=>{
      const active=(path===item.href || (item.href!=="/" && path.startsWith(item.href))) ? " active" : "";
      return `<a class="minya-menu-item${active}" href="${item.href}"><span class="minya-menu-label"><i class="minya-menu-symbol" aria-hidden="true">${item.icon}</i><span>${item.label}</span></span><b aria-hidden="true">‹</b></a>`;
    }).join("");

    wrap.append(btn,menu);
    header.appendChild(wrap);

    const close=()=>{
      menu.hidden=true;
      wrap.classList.remove("open");
      btn.setAttribute("aria-expanded","false");
    };

    btn.addEventListener("click",(event)=>{
      event.stopPropagation();
      const open=menu.hidden;
      menu.hidden=!open;
      wrap.classList.toggle("open",open);
      btn.setAttribute("aria-expanded",String(open));
    });

    document.addEventListener("click",(event)=>{
      if(!wrap.contains(event.target)) close();
    });
    document.addEventListener("keydown",(event)=>{
      if(event.key==="Escape") close();
    });
  }

  function start(){
    let tries=0;
    const timer=setInterval(()=>{
      tries += 1;
      if(document.documentElement.dataset.userRole || tries>=8){
        clearInterval(timer);
        build();
      }
    },80);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.addEventListener("resize",()=>{
    if(window.matchMedia("(max-width: 760px)").matches) build();
  });
})();

;

/* ===== js/app-ui-enhancements.js ===== */
/* System-wide visual state enhancement — no business logic changes */
(function(){
  const emptyPhrases=[
    "لا توجد بيانات",
    "لا توجد نتائج",
    "لا توجد تقارير",
    "لا توجد سجلات",
    "لا توجد تقارير في هذه الفترة",
    "لا توجد سجلات صيانة"
  ];

  function classifyEmptyCells(root=document){
    root.querySelectorAll('td[colspan]').forEach(td=>{
      const text=(td.textContent||'').trim();
      if(emptyPhrases.some(p=>text.includes(p))) td.classList.add('minya-empty-state');
      else td.classList.remove('minya-empty-state');
    });
  }

  function classifyMessages(root=document){
    root.querySelectorAll('#maintMsg,.message,[id$="Msg"],[class*="message"]').forEach(el=>{
      const text=(el.textContent||'').trim();
      if(!text) return;
      el.classList.add('minya-ui-message');
      el.classList.remove('is-success','is-warning','is-error');
      if(/تم |نجاح|حفظ|مكتمل|سليم|لا توجد تنبيهات/.test(text)) el.classList.add('is-success');
      else if(/خطأ|فشل|تعذر|غير مسموح|مرفوض/.test(text)) el.classList.add('is-error');
      else if(/تحذير|تنبيه|مطلوب|قيد|انتظار/.test(text)) el.classList.add('is-warning');
    });
  }

  function enhance(root=document){
    classifyEmptyCells(root);
    classifyMessages(root);
  }

  function start(){
    enhance();
    let queued=false;
    const observer=new MutationObserver(mutations=>{
      if(queued) return;
      queued=true;
      requestAnimationFrame(()=>{
        queued=false;
        mutations.forEach(m=>{
          if(m.target && m.target.nodeType===1) enhance(m.target.closest?.('main') || document);
        });
      });
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

;

/* ===== js/app-english-digits.js ===== */
/* Force all displayed numerals to English 0-9 without changing Arabic text */
(function(){
  const arabicIndic = /[٠-٩]/g;
  const easternArabic = /[۰-۹]/g;

  function normalize(value){
    return String(value ?? "")
      .replace(arabicIndic, d => String(d.charCodeAt(0) - 0x0660))
      .replace(easternArabic, d => String(d.charCodeAt(0) - 0x06F0))
      .replace(/٫/g, ".")
      .replace(/٬/g, ",")
      .replace(/٪/g, "%");
  }

  function skip(node){
    const parent = node && node.parentElement;
    if(!parent) return true;
    return Boolean(parent.closest("script,style,textarea"));
  }

  function normalizeTextNode(node){
    if(!node || node.nodeType !== Node.TEXT_NODE || skip(node)) return;
    const next = normalize(node.nodeValue);
    if(next !== node.nodeValue) node.nodeValue = next;
  }

  function normalizeTree(root){
    if(!root) return;
    if(root.nodeType === Node.TEXT_NODE){
      normalizeTextNode(root);
      return;
    }
    if(root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while((node = walker.nextNode())) normalizeTextNode(node);
  }

  function start(){
    normalizeTree(document.body);

    const observer = new MutationObserver(mutations => {
      for(const mutation of mutations){
        if(mutation.type === "characterData") normalizeTextNode(mutation.target);
        for(const added of mutation.addedNodes) normalizeTree(added);
      }
    });

    observer.observe(document.body, {
      subtree:true,
      childList:true,
      characterData:true
    });
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();

;

/* ===== js/app-date-display.js ===== */
/* Unified screen date/month display — no print module changes */
(function(){
  const shortMonths=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const arabicMonths=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  function shortMonth(value){
    const match=String(value||"").match(/^(\d{4})-(\d{2})$/);
    if(!match) return value;
    const index=Number(match[2])-1;
    return `${shortMonths[index]||match[2]} ${match[1]}`;
  }

  function dateSlash(value){
    const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }

  function monthSlash(value){
    const match=String(value||"").match(/^(\d{4})-(\d{2})$/);
    return match ? `${match[2]}/${match[1]}` : value;
  }

  function arabicNameToShort(text){
    let output=String(text||"");
    arabicMonths.forEach((name,index)=>{
      output=output.replace(new RegExp(name,"g"),shortMonths[index]);
    });
    return output;
  }

  function applyChartMonths(root=document){
    root.querySelectorAll?.(".executive-trend-item small").forEach((el,index)=>{
      if(index<12) el.textContent=shortMonths[index];
    });

    root.querySelectorAll?.(".modern-chart-eyebrow,#annualBestMonth,#annualWorstMonth").forEach(el=>{
      el.textContent=arabicNameToShort(el.textContent);
    });
  }

  function applyTableDates(root=document){
    root.querySelectorAll?.(".dashboard-recent-table td,.v3-table td,#archiveTable td").forEach(td=>{
      if(td.children.length) return;
      const text=td.textContent.trim();
      if(/^\d{4}-\d{2}-\d{2}$/.test(text)) td.textContent=dateSlash(text);
      else if(/^\d{4}-\d{2}$/.test(text)) td.textContent=monthSlash(text);
    });
  }

  function apply(){
    applyChartMonths(document);
    applyTableDates(document);
  }

  window.MINYA_DATE_DISPLAY={shortMonth,dateSlash,monthSlash};

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",apply,{once:true});
  else apply();

  if(typeof MutationObserver!=="undefined"){
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued) return;
      queued=true;
      requestAnimationFrame(()=>{ queued=false; apply(); });
    });
    observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }
})();

;

/* ===== js/app-appearance-settings.js ===== */
/* =========================================================
   إعدادات المظهر المحلية لكل جهاز
========================================================= */

(function () {
  const storageKey = "minya_appearance_settings_v1";
  const defaults = {
    loadingSeconds: 3,
    theme: "day",
    color: "green",
    fontSize: "normal",
    navPosition: "top",
    density: "comfortable",
    contrast: "normal",
    motion: "full",
  };

  const allowed = {
    loadingSeconds: [1, 2, 3, 4, 5],
    theme: ["day", "night", "auto"],
    color: ["green", "blue"],
    fontSize: ["small", "normal", "large", "xlarge"],
    navPosition: ["top", "right", "left"],
    density: ["comfortable", "compact"],
    contrast: ["normal", "high"],
    motion: ["full", "reduced"],
  };

  const systemTheme = window.matchMedia?.("(prefers-color-scheme: dark)");

  function normalize(input) {
    const output = { ...defaults };
    Object.keys(defaults).forEach((key) => {
      const value = key === "loadingSeconds" ? Number(input?.[key]) : input?.[key];
      if (allowed[key].includes(value)) output[key] = value;
    });
    return output;
  }

  function read() {
    try {
      return normalize(JSON.parse(localStorage.getItem(storageKey) || "{}"));
    } catch (_) {
      return { ...defaults };
    }
  }

  function save(settings) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (_) {}
  }

  function apply(settings) {
    const root = document.documentElement;
    root.dataset.theme = settings.theme === "auto" ? (systemTheme?.matches ? "night" : "day") : settings.theme;
    root.dataset.themePreference = settings.theme;
    root.dataset.color = settings.color;
    root.dataset.fontSize = settings.fontSize;
    root.dataset.navPosition = settings.navPosition;
    root.dataset.density = settings.density;
    root.dataset.contrast = settings.contrast;
    root.dataset.motion = settings.motion;
    window.MINYA_APPEARANCE_SETTINGS = { ...settings };
  }

  function option(value, label) {
    return `<option value="${value}">${label}</option>`;
  }

  async function isAdmin() {
    const knownRole = window.MINYA_USER?.role || document.documentElement.dataset.userRole;
    if (knownRole) return knownRole === "admin";

    try {
      const response = await fetch("/api/auth/status", { cache: "no-store" });
      const data = await response.json();
      return data?.authenticated === true && data?.user?.role === "admin";
    } catch (_) {
      return false;
    }
  }

  function mount() {
    if (document.getElementById("minyaAppearanceButton")) return;

    const button = document.createElement("button");
    button.id = "minyaAppearanceButton";
    button.type = "button";
    button.setAttribute("aria-label", "إعدادات المظهر");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = '<span aria-hidden="true">⚙</span><b>المظهر</b>';

    const backdrop = document.createElement("div");
    backdrop.id = "minyaAppearanceBackdrop";
    backdrop.hidden = true;

    const panel = document.createElement("aside");
    panel.id = "minyaAppearancePanel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "minyaAppearanceTitle");
    panel.innerHTML = `
      <div class="appearance-head">
        <div><small>إعدادات هذا الجهاز</small><h2 id="minyaAppearanceTitle">المظهر وسهولة الاستخدام</h2></div>
        <button type="button" id="minyaAppearanceClose" aria-label="إغلاق">×</button>
      </div>
      <div class="appearance-grid">
        <label>مدة ظهور الذكر
          <select data-appearance-key="loadingSeconds">
            ${option("1", "ثانية واحدة")}${option("2", "ثانيتان")}${option("3", "3 ثوانٍ")}${option("4", "4 ثوانٍ")}${option("5", "5 ثوانٍ")}
          </select>
          <small>تُطبق عند فتح الصفحة التالية.</small>
        </label>
        <label>وضع العرض
          <select data-appearance-key="theme">
            ${option("day", "نهاري")}${option("night", "ليلي")}${option("auto", "تلقائي حسب الجهاز")}
          </select>
        </label>
        <label>اللون الرئيسي
          <select data-appearance-key="color">
            ${option("green", "أخضر")}${option("blue", "أزرق")}
          </select>
        </label>
        <label>حجم الخط
          <select data-appearance-key="fontSize">
            ${option("small", "صغير")}${option("normal", "عادي")}${option("large", "كبير")}${option("xlarge", "كبير جدًا")}
          </select>
        </label>
        <label>موقع القائمة
          <select data-appearance-key="navPosition">
            ${option("top", "أعلى الصفحة")}${option("right", "جانب أيمن")}${option("left", "جانب أيسر")}
          </select>
        </label>
        <label>مسافات العرض
          <select data-appearance-key="density">
            ${option("comfortable", "مريحة")}${option("compact", "مضغوطة")}
          </select>
        </label>
        <label>التباين
          <select data-appearance-key="contrast">
            ${option("normal", "عادي")}${option("high", "عالٍ")}
          </select>
        </label>
        <label>الحركة
          <select data-appearance-key="motion">
            ${option("full", "عادية")}${option("reduced", "تقليل الحركة")}
          </select>
        </label>
      </div>
      <div class="appearance-actions">
        <button type="button" id="minyaAppearanceReset">استعادة الافتراضي</button>
        <button type="button" id="minyaAppearanceDone">تم</button>
      </div>
      <p id="minyaAppearanceStatus" aria-live="polite"></p>
    `;

    document.body.append(button, backdrop, panel);

    let settings = read();
    apply(settings);

    const syncControls = () => {
      panel.querySelectorAll("[data-appearance-key]").forEach((control) => {
        control.value = String(settings[control.dataset.appearanceKey]);
      });
    };

    const setOpen = (open) => {
      panel.hidden = !open;
      backdrop.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("appearance-panel-open", open);
      if (open) {
        syncControls();
        panel.querySelector("select")?.focus();
      }
    };

    button.addEventListener("click", () => setOpen(true));
    backdrop.addEventListener("click", () => setOpen(false));
    panel.querySelector("#minyaAppearanceClose")?.addEventListener("click", () => setOpen(false));
    panel.querySelector("#minyaAppearanceDone")?.addEventListener("click", () => setOpen(false));

    panel.addEventListener("change", (event) => {
      const key = event.target?.dataset?.appearanceKey;
      if (!key) return;
      const value = key === "loadingSeconds" ? Number(event.target.value) : event.target.value;
      settings = normalize({ ...settings, [key]: value });
      save(settings);
      apply(settings);
      const status = panel.querySelector("#minyaAppearanceStatus");
      if (status) status.textContent = key === "loadingSeconds" ? "حُفظت المدة وستظهر في الصفحة التالية." : "تم تطبيق الإعداد وحفظه.";
    });

    panel.querySelector("#minyaAppearanceReset")?.addEventListener("click", () => {
      settings = { ...defaults };
      save(settings);
      apply(settings);
      syncControls();
      const status = panel.querySelector("#minyaAppearanceStatus");
      if (status) status.textContent = "تمت استعادة الإعدادات الافتراضية.";
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });
  }

  async function mountForAdmin() {
    if (await isAdmin()) mount();
  }

  apply(read());
  systemTheme?.addEventListener?.("change", () => {
    const settings = read();
    if (settings.theme === "auto") apply(settings);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountForAdmin, { once: true });
  else mountForAdmin();
})();

;

/* ===== js/app-review-polish.js ===== */
/* =========================================================
   Final review helpers - presentation only
========================================================= */
(function(){
  const path=(location.pathname.replace(/\/+$/,'')||'/');
  const pageMap={
    '/':'home','/report':'report','/archive':'archive','/monthly':'monthly','/annual':'annual',
    '/equipment':'equipment','/weekly':'weekly','/search':'search','/managerial':'managerial','/admin':'admin','/reviews':'reviews'
  };
  const page=pageMap[path];
  if(page) document.body.classList.add(`page-${page}`);

  function displayDate(value){
    const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?`${m[3]}/${m[2]}/${m[1]}`:String(value||'');
  }

  function replaceIsoText(root){
    if(!root) return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const parent=node.parentElement;
      if(!parent || ['INPUT','TEXTAREA','OPTION','SCRIPT','STYLE'].includes(parent.tagName)) return;
      const text=node.nodeValue||'';
      const next=text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,(_,y,m,d)=>`${d}/${m}/${y}`);
      if(next!==text) node.nodeValue=next;
    });
  }

  function polishDynamicText(){
    if(path==='/weekly') replaceIsoText(document.getElementById('v3Content'));
    if(path==='/equipment') replaceIsoText(document.getElementById('v3Content'));
    if(path==='/search') replaceIsoText(document.getElementById('v3Content'));
    if(path==='/managerial') replaceIsoText(document.getElementById('managerialReport'));

    if(path==='/admin'){
      document.querySelectorAll('.v3-panel h3').forEach(h=>{
        if(h.textContent.trim()==='سجل التعديلات Audit Log') h.innerHTML='سجل التعديلات <small style="font-size:.62em;color:#7a8794;font-weight:700;">Audit Log</small>';
      });
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    polishDynamicText();
    const root=document.getElementById('v3Content')||document.body;
    if(typeof MutationObserver!=='undefined'){
      let queued=false;
      new MutationObserver(()=>{
        if(queued)return;
        queued=true;
        requestAnimationFrame(()=>{queued=false;polishDynamicText();});
      }).observe(root,{childList:true,subtree:true,characterData:true});
    }
  });
})();

;




function revealMinyaApp(){
  if (window.__MINYA_APP_REVEALED__) return;
  window.__MINYA_APP_REVEALED__ = true;

  const elapsed = Date.now() - MINYA_LOADING_STARTED_AT;
  const delay = Math.max(0, MINYA_LOADING_MIN_MS - elapsed);

  setTimeout(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("minya-app-loading");

        const screen = document.getElementById("minyaLoadingScreen");
        if (screen) {
          screen.style.transition = "opacity .10s ease";
          screen.style.opacity = "0";
          setTimeout(() => screen.remove(), 110);
        }

        const style = document.getElementById("minyaLoadingStyle");
        if (style) setTimeout(() => style.remove(), 130);
      });
    });
  }, delay);
}

if (document.readyState === "complete") {
  revealMinyaApp();
} else {
  window.addEventListener("load", revealMinyaApp, { once: true });
}

// Safety fallback only if a resource fails to finish loading.
setTimeout(revealMinyaApp, 30000);
