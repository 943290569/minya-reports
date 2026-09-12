// Minya Landfill app loader
const MINYA_ASSET_VERSION = "3.5.0-20260912-startup-speed-v1";
const MINYA_LOADING_STARTED_AT = Date.now();
const MINYA_APPEARANCE_STORAGE_KEY = "minya_appearance_settings_v1";
const MINYA_TYPOGRAPHY_PRESETS = {
  compact: { siteFontSize: 13, navFontSize: 12, headingFontSize: 18, metricFontSize: 21, smallFontSize: 11, lineHeight: 1.45 },
  balanced: { siteFontSize: 14, navFontSize: 13, headingFontSize: 20, metricFontSize: 24, smallFontSize: 12, lineHeight: 1.6 },
  large: { siteFontSize: 16, navFontSize: 15, headingFontSize: 22, metricFontSize: 27, smallFontSize: 13, lineHeight: 1.7 },
  accessible: { siteFontSize: 18, navFontSize: 17, headingFontSize: 25, metricFontSize: 31, smallFontSize: 15, lineHeight: 1.8 },
};

function readMinyaAppearanceSettings() {
  const defaults = {
    loadingSeconds: 1,
    loadingDurationRevision: 2,
    remembranceFontSize: 72,
    remembranceFontRevision: 2,
    typographyRevision: 2,
    typographyPreset: "balanced",
    siteFontSize: 14,
    navFontSize: 13,
    headingFontSize: 20,
    metricFontSize: 24,
    smallFontSize: 12,
    lineHeight: 1.6,
    fontFamily: "system",
    fontWeight: "medium",
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
    const savedSettings = saved && typeof saved === "object" ? saved : {};
    const settings = { ...defaults, ...savedSettings };
    if (Number(saved?.remembranceFontRevision) !== 2) settings.remembranceFontSize = 72;
    settings.remembranceFontRevision = 2;
    if (Number(saved?.loadingDurationRevision) !== 2) settings.loadingSeconds = 1;
    settings.loadingDurationRevision = 2;
    const loadingSeconds = Number(settings.loadingSeconds);
    settings.loadingSeconds = [1, 2, 3, 4, 5].includes(loadingSeconds) ? loadingSeconds : 1;
    const remembranceFontSize = Math.round(Number(settings.remembranceFontSize));
    settings.remembranceFontSize = Number.isFinite(remembranceFontSize)
      ? Math.min(72, Math.max(11, remembranceFontSize))
      : 72;
    const hasModernTypography = Number(savedSettings.typographyRevision) === 2;
    settings.typographyRevision = 2;
    settings.typographyPreset = ["compact", "balanced", "large", "accessible", "custom"].includes(settings.typographyPreset)
      ? settings.typographyPreset
      : "balanced";
    if (!hasModernTypography) {
      const legacySize = Number(savedSettings.siteFontSize);
      settings.typographyPreset = legacySize >= 19 || savedSettings.fontSize === "xlarge"
        ? "accessible"
        : legacySize >= 17 || savedSettings.fontSize === "large"
          ? "large"
          : "balanced";
    }
    const ranges = {
      siteFontSize: [13, 20, 0], navFontSize: [12, 18, 0], headingFontSize: [18, 28, 0],
      metricFontSize: [20, 34, 0], smallFontSize: [11, 16, 0], lineHeight: [1.35, 1.9, 2],
    };
    if (hasModernTypography) Object.entries(ranges).forEach(([key, [minimum, maximum, decimals]]) => {
      const value = Number(savedSettings[key]);
      if (!Number.isFinite(value)) return;
      const bounded = Math.min(maximum, Math.max(minimum, value));
      settings[key] = decimals ? Number(bounded.toFixed(decimals)) : Math.round(bounded);
    });
    if (settings.typographyPreset !== "custom") Object.assign(settings, MINYA_TYPOGRAPHY_PRESETS[settings.typographyPreset]);
    settings.fontFamily = ["system", "tahoma", "segoe"].includes(settings.fontFamily) ? settings.fontFamily : "system";
    settings.fontWeight = ["regular", "medium", "bold"].includes(settings.fontWeight) ? settings.fontWeight : "medium";
    settings.color = ["green", "blue"].includes(settings.color) ? settings.color : "green";
    localStorage.setItem(MINYA_APPEARANCE_STORAGE_KEY, JSON.stringify(settings));
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
  Math.max(1000, Number(window.MINYA_APPEARANCE_SETTINGS.loadingSeconds || 1) * 1000)
);

[
  ["theme", MINYA_RESOLVED_THEME],
  ["color", window.MINYA_APPEARANCE_SETTINGS.color],
  ["fontSize", window.MINYA_APPEARANCE_SETTINGS.fontSize],
  ["typographyRevision", window.MINYA_APPEARANCE_SETTINGS.typographyRevision],
  ["typographyPreset", window.MINYA_APPEARANCE_SETTINGS.typographyPreset],
  ["fontFamily", window.MINYA_APPEARANCE_SETTINGS.fontFamily],
  ["fontWeight", window.MINYA_APPEARANCE_SETTINGS.fontWeight],
  ["navPosition", window.MINYA_APPEARANCE_SETTINGS.navPosition],
  ["density", window.MINYA_APPEARANCE_SETTINGS.density],
  ["contrast", window.MINYA_APPEARANCE_SETTINGS.contrast],
  ["motion", window.MINYA_APPEARANCE_SETTINGS.motion],
].forEach(([name, value]) => {
  document.documentElement.dataset[name] = String(value || "");
});
document.documentElement.style.setProperty(
  "--appearance-font-size",
  `${window.MINYA_APPEARANCE_SETTINGS.siteFontSize}px`
);
document.documentElement.style.setProperty("--appearance-nav-font-size", `${window.MINYA_APPEARANCE_SETTINGS.navFontSize}px`);
document.documentElement.style.setProperty("--appearance-heading-font-size", `${window.MINYA_APPEARANCE_SETTINGS.headingFontSize}px`);
document.documentElement.style.setProperty("--appearance-metric-font-size", `${window.MINYA_APPEARANCE_SETTINGS.metricFontSize}px`);
document.documentElement.style.setProperty("--appearance-small-font-size", `${window.MINYA_APPEARANCE_SETTINGS.smallFontSize}px`);
document.documentElement.style.setProperty("--appearance-line-height", String(window.MINYA_APPEARANCE_SETTINGS.lineHeight));

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
      font-size: ${window.MINYA_APPEARANCE_SETTINGS.remembranceFontSize}px !important;
      font-weight: 900;
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
      <p class="minya-loading-message" style="font-size:${window.MINYA_APPEARANCE_SETTINGS.remembranceFontSize}px !important">${chosen}</p>
      <div class="minya-loading-dot" aria-hidden="true"></div>
    </div>
  `;

  document.documentElement.appendChild(screen);
})();


/* ===== js/app-auth.js ===== */
/* Authentication guard */
(function(){
  const publicPages=["/login.html","/setup.html"];

  function mountStandaloneRemembrance(){
    if(publicPages.includes(location.pathname)) return;
    if(document.getElementById("minyaLoadingScreen")) return;

    const messages=[
      "لا تنسَ ذكر الله",
      "صلِّ على النبي ﷺ",
      "سبحان الله وبحمده",
      "الحمد لله",
      "لا إله إلا الله"
    ];

    let loadingSeconds=1;
    let remembranceFontSize=72;
    let theme="day";
    try{
      const saved=JSON.parse(localStorage.getItem("minya_appearance_settings_v1")||"{}");
      const seconds=Number(saved?.loadingSeconds);
      const fontSize=Math.round(Number(saved?.remembranceFontSize));
      const hasFastLoading=Number(saved?.loadingDurationRevision)===2;
      loadingSeconds=hasFastLoading&&[1,2,3,4,5].includes(seconds)?seconds:1;
      remembranceFontSize=Number.isFinite(fontSize)?Math.min(72,Math.max(11,fontSize)):72;
      theme=saved?.theme==="night"?"night":"day";
    }catch(_){}

    const screen=document.createElement("div");
    screen.id="minyaLoadingScreen";
    screen.setAttribute("role","status");
    screen.setAttribute("aria-live","polite");
    const chosen=messages[Math.floor(Math.random()*messages.length)];
    const night=theme==="night";
    screen.style.cssText=`position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:${night?"linear-gradient(135deg,#0e1714 0%,#17231f 100%)":"linear-gradient(135deg,#f7fbf9 0%,#eef6f2 100%)"};direction:rtl;font-family:Tahoma,Arial,sans-serif;opacity:1;transition:opacity .10s ease`;
    screen.innerHTML=`<div style="width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px 20px"><p style="margin:0;color:${night?"#dff5ea":"#176b4f"};font-size:${remembranceFontSize}px;font-weight:900;line-height:1.35;text-align:center">${chosen}</p><div style="width:8px;height:8px;margin:20px auto 0;border-radius:50%;background:${night?"#75cfa9":"#176b4f"}"></div></div>`;
    document.documentElement.appendChild(screen);

    setTimeout(()=>{
      screen.style.opacity="0";
      setTimeout(()=>screen.remove(),110);
    },loadingSeconds*1000);
  }

  function loadScriptOnce(src,attribute){
    if(document.querySelector(`script[${attribute}]`)) return;
    const script=document.createElement('script');
    script.src=src;
    script.defer=true;
    script.setAttribute(attribute,'1');
    document.head.appendChild(script);
  }

  function loadStyleOnce(href,marker){
    if(document.querySelector(`link[${marker}]`)) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.setAttribute(marker,'1');
    document.head.appendChild(link);
  }

  function loadSharedEnhancements(){
    if(publicPages.includes(location.pathname)) return;
    loadStyleOnce('/notification-center.css?v=stable9-update1','data-minya-notification-style');
    if(!window.__MINYA_NOTIFICATION_CENTER__) loadScriptOnce('/js/app-notification-center.js?v=stable9-update1','data-minya-notifications');
    if(location.pathname==='/drivers-licenses.html'&&!window.__MINYA_LICENSE_FILTERS__) loadScriptOnce('/js/app-driver-license-filters.js?v=stable9-update1','data-minya-license-filters');

    loadStyleOnce('/pwa.css?v=stable10-pwa5','data-minya-pwa-style');
    loadScriptOnce('/js/app-pwa.js?v=stable10-pwa5','data-minya-pwa');
    loadStyleOnce('/local-notifications.css?v=stable10-push4','data-minya-local-notifications-style');
    loadScriptOnce('/js/app-local-notifications.js?v=stable10-push4','data-minya-local-notifications');

    const path=location.pathname.replace(/\/+$/,'')||'/';
    if(path==='/'){
      loadStyleOnce('/smart-insights-free.css?v=stable10-free4','data-minya-smart-free-style');
      loadScriptOnce('/js/app-smart-insights-free.js?v=stable10-free4','data-minya-smart-free');
      loadStyleOnce('/smart-search-free.css?v=stable10-free4','data-minya-smart-search-style');
      loadScriptOnce('/js/app-smart-search-free.js?v=stable10-free4','data-minya-smart-search');
      loadStyleOnce('/smart-monthly-compare.css?v=stable10-free4','data-minya-smart-compare-style');
      loadScriptOnce('/js/app-smart-monthly-compare.js?v=stable10-free4','data-minya-smart-compare');
      loadStyleOnce('/smart-operations-free.css?v=stable10-free4','data-minya-smart-ops-style');
      loadScriptOnce('/js/app-smart-operations-free.js?v=stable10-free5','data-minya-smart-ops');
      loadStyleOnce('/operational-summaries.css?v=stable10-summary2','data-minya-operational-summary-style');
      loadScriptOnce('/js/app-operational-summaries.js?v=stable10-summary2','data-minya-operational-summary');
      loadScriptOnce('/js/app-home-layout-stable10.js?v=stable10-home2','data-minya-home-layout');
    }
  }

  mountStandaloneRemembrance();

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
    loadSharedEnhancements();

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

    const response = await fetch(`${API}/api/reports`, { cache: "no-store" });
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

function normalizeMonthlyFilterValue(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return text;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return text;
  return `${match[1]}-${String(month).padStart(2, "0")}`;
}

async function loadMonthlyArchiveData(showStatus = false) {
  try {
    const monthInput = document.getElementById("archiveMonthFilter");
    if (!monthInput) return;

    if (!monthInput.value) {
      const now = new Date();
      monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    const month = normalizeMonthlyFilterValue(monthInput.value);
    if (month !== monthInput.value) monthInput.value = month;
    if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("قيمة الشهر غير صالحة");

    const previousMonth = getPreviousMonthForArchive(month);
    if (showStatus) showMessage("جاري تحميل التقرير الشهري...");

    let currentReports = [];
    let previousReports = [];
    let current = { ok: false, details: null };

    try {
      const [currentResponse, previousResponse] = await Promise.all([
        fetch(`${API}/api/monthly-summary?month=${encodeURIComponent(month)}`, { cache: "no-store" }),
        fetch(`${API}/api/monthly-summary?month=${encodeURIComponent(previousMonth)}`, { cache: "no-store" })
      ]);
      current = await currentResponse.json();
      const previous = await previousResponse.json();
      if (currentResponse.ok && current.ok && Array.isArray(current.reports)) currentReports = current.reports;
      if (previousResponse.ok && previous.ok && Array.isArray(previous.reports)) previousReports = previous.reports;
    } catch (monthlyError) {
      console.error("فشل مسار الملخص الشهري، سيتم استخدام الأرشيف", monthlyError);
    }

    if (!currentReports.length) {
      const archiveResponse = await fetch(`${API}/api/reports`, { cache: "no-store" });
      const archiveData = await archiveResponse.json();
      if (!archiveResponse.ok || !archiveData.ok || !Array.isArray(archiveData.reports)) {
        throw new Error(archiveData.message || "فشل تحميل تقارير الشهر");
      }
      currentReports = archiveData.reports.filter((report) => String(report.report_date || "").startsWith(month));
      if (!previousReports.length && previousMonth) {
        previousReports = archiveData.reports.filter((report) => String(report.report_date || "").startsWith(previousMonth));
      }
    }

    archiveReports = [...currentReports, ...previousReports];
    window.MINYA_MONTHLY_LINKED_SUMMARY = current.details || null;

    renderArchiveReports();
    await updateMonthlySummary();
    if (typeof window.renderLinkedPeriodSummary === "function") window.renderLinkedPeriodSummary("monthly", current.details || null);
    if (typeof renderMonthlyMetricChart === "function") await renderMonthlyMetricChart("waste");
    if (typeof renderMonthlyTable === "function") renderMonthlyTable();
    if (typeof window.renderMonthlyComparisonStable10 === "function") await window.renderMonthlyComparisonStable10();

    if (showStatus) showMessage(`تم تحميل ${currentReports.length} تقرير لشهر ${getMonthName(month)}`);
  } catch (error) {
    console.error(error);
    showMessage(error.message || "حدث خطأ أثناء تحميل التقرير الشهري");
  }
}

document.getElementById("archiveMonthFilter")?.addEventListener("change", () => {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/monthly") loadMonthlyArchiveData(false);
});

window.loadMonthlyArchiveData = loadMonthlyArchiveData;

;

/* ===== js/app-monthly-operation-aliases.js ===== */
/* Normalize legacy/imported operation names in monthly aggregation. */
(function(){
  const original = window.calculateMonthlyOperations;
  if (typeof original !== "function") return;

  const canonical = (name) => {
    const value = String(name || "").replace(/\s+/g, " ").trim();
    const aliases = new Map([
      ["مواد التغطية ( طمم)", "مواد التغطية (طمم)"],
      ["كميات المياه", "كميات المياه للتعقيم والترطيب"],
      ["كميات العصارة", "كميات العصارة المرحلة"],
      ["( طمم) خارجي", "طمم خارجي"],
      ["(طمم) خارجي", "طمم خارجي"]
    ]);
    return aliases.get(value) || value;
  };

  window.calculateMonthlyOperations = function(detailedReports){
    const normalized = (detailedReports || []).map((data) => ({
      ...data,
      operations: (data.operations || []).map((item) => ({
        ...item,
        operation_name: canonical(item.operation_name)
      }))
    }));
    return original(normalized);
  };
})();

;

/* ===== js/app-monthly-comparison-stable10.js ===== */
/* Stable 10 — monthly report comparison aligned with elapsed days for the current month. */
(function(){
  function jerusalemToday(){
    return new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'
    }).format(new Date());
  }

  function isCurrentMonth(monthValue){
    return String(monthValue||'')===jerusalemToday().slice(0,7);
  }

  function throughElapsedDay(reports,monthValue){
    const rows=Array.isArray(reports)?reports:[];
    if(!isCurrentMonth(monthValue))return rows;
    const elapsedDay=Number(jerusalemToday().slice(8,10));
    return rows.filter(report=>{
      const date=String(report?.report_date||'');
      return Number(date.slice(8,10))<=elapsedDay;
    });
  }

  updateMonthlyComparison=async function(monthValue,currentDieselTotal=null){
    const title=document.getElementById('monthlyComparisonTitle');
    const grid=document.getElementById('monthlyComparisonGrid');
    const empty=document.getElementById('monthlyComparisonEmpty');
    if(!title||!grid||!empty)return;

    const setValue=(id,value)=>{const element=document.getElementById(id);if(element)element.textContent=value;};
    if(!monthValue){
      title.textContent='مقارنة مع الشهر السابق';
      grid.classList.add('hidden');empty.classList.remove('hidden');empty.textContent='اختر شهرًا لعرض المقارنة.';return;
    }

    const previousMonth=getPreviousMonthForArchive(monthValue);
    const currentAll=archiveReports.filter(report=>String(report.report_date||'').startsWith(monthValue));
    const previousAll=archiveReports.filter(report=>String(report.report_date||'').startsWith(previousMonth));
    const currentReports=throughElapsedDay(currentAll,monthValue);
    const previousReports=isCurrentMonth(monthValue)?throughElapsedDay(previousAll,monthValue):previousAll;
    const elapsedDay=isCurrentMonth(monthValue)?Number(jerusalemToday().slice(8,10)):null;

    title.textContent=`مقارنة مع الشهر السابق - ${getMonthName(previousMonth)}${elapsedDay?` حتى اليوم ${elapsedDay}`:''}`;
    if(!currentReports.length||!previousReports.length){
      grid.classList.add('hidden');empty.classList.remove('hidden');empty.textContent='لا توجد بيانات محفوظة للشهر السابق للمقارنة.';return;
    }

    const sum=(rows,key)=>rows.reduce((total,report)=>total+Number(report?.[key]||0),0);
    const currentWaste=sum(currentReports,'total_waste_tons');
    const currentTrucks=sum(currentReports,'total_trucks');
    const previousWaste=sum(previousReports,'total_waste_tons');
    const previousTrucks=sum(previousReports,'total_trucks');

    let currentDiesel=currentDieselTotal;
    if(isCurrentMonth(monthValue))currentDiesel=sum(currentReports,'total_diesel');
    else if(currentDiesel===null)currentDiesel=sum(currentReports,'total_diesel');
    const previousDiesel=sum(previousReports,'total_diesel');

    setValue('monthlyWasteChange',formatArchiveChange(currentWaste,previousWaste));
    setValue('monthlyWasteChangeValues',`${formatNumber(previousWaste)} ← ${formatNumber(currentWaste)} طن`);
    setValue('monthlyTrucksChange',formatArchiveChange(currentTrucks,previousTrucks));
    setValue('monthlyTrucksChangeValues',`${formatNumber(previousTrucks)} ← ${formatNumber(currentTrucks)}`);
    setValue('monthlyDieselChange',formatArchiveChange(currentDiesel,previousDiesel));
    setValue('monthlyDieselChangeValues',`${formatNumber(previousDiesel)} ← ${formatNumber(currentDiesel)} لتر`);
    empty.classList.add('hidden');grid.classList.remove('hidden');
  };
})();

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
  const workdayType = report.workday_type === "holiday" ? "عطلة رسمية - دوام طوارئ" : "دوام رسمي";

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
.info-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 1mm; margin-bottom: 1mm; }
.info-box { border: 1px solid #444; text-align: center; padding: 1mm 0.5mm; min-width: 0; }
.info-box span { display: block; font-size: 8px; color: #555; margin-bottom: 0.5mm; }
.info-box strong { display: block; font-size: 9px; line-height: 1.15; overflow-wrap: anywhere; }
.info-box.workday-box strong { font-size: 8.2px; }
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
      <div class="info-box workday-box"><span>طبيعة الدوام</span><strong>${escapeHtml(workdayType)}</strong></div>
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

function getMonthlyPrintJerusalemToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
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

  const today = getMonthlyPrintJerusalemToday();
  const isCurrentMonth = String(monthValue || "") === today.slice(0, 7);
  const elapsedDay = Number(today.slice(8, 10));
  const reports = archiveReports.filter((report) => {
    const date = String(report.report_date || "");
    if (!date.startsWith(previousMonth)) return false;
    return !isCurrentMonth || Number(date.slice(8, 10)) <= elapsedDay;
  });

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
  const dieselTotal = reports.reduce(
    (sum, report) => sum + Number(report.total_diesel || 0),
    0
  );

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

  const dieselTotal = monthly.reports.reduce(
    (sum, report) => sum + Number(report.total_diesel || 0),
    0
  );
  const dieselAverage = monthly.days > 0 ? dieselTotal / monthly.days : 0;
  const previous = await buildPreviousMonthComparison(monthly.month);

  const rows = monthly.reports.map((report) => {
    const dailyDiesel = Number(report.total_diesel || 0);
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

/* ===== js/app-monthly-unit-compat.js ===== */
/* Preserve operation units in monthly print and warn on mixed leachate units. */
(function(){
  const original = window.buildMonthlyReportHtml;
  if (typeof original !== 'function') return;

  function clean(v){ return String(v ?? '').replace(/\s+/g,' ').trim(); }
  function canonical(name){
    const v=clean(name);
    const aliases=new Map([
      ['كميات العصارة','كميات العصارة المرحلة'],
      ['مواد التغطية ( طمم)','مواد التغطية (طمم)'],
      ['كميات المياه','كميات المياه للتعقيم والترطيب'],
      ['( طمم) خارجي','طمم خارجي'],
      ['(طمم) خارجي','طمم خارجي']
    ]);
    return aliases.get(v)||v;
  }

  async function monthlyLeachateUnits(){
    const monthValue=document.getElementById('archiveMonthFilter')?.value||'';
    if(!monthValue || typeof window.getMonthlyDetailedReports!=='function') return [];
    try{
      const details=await window.getMonthlyDetailedReports(monthValue);
      const units=new Set();
      for(const data of details||[]){
        for(const item of data.operations||[]){
          if(canonical(item.operation_name)==='كميات العصارة المرحلة'){
            const unit=clean(item.unit);
            if(unit) units.add(unit);
          }
        }
      }
      return [...units];
    }catch(_){ return []; }
  }

  window.buildMonthlyReportHtml = async function(){
    let html=await original();
    if(!html) return html;
    const units=await monthlyLeachateUnits();
    if(!units.length) return html;

    if(units.length===1){
      html=html.replace(/(<tr><td>كميات العصارة المرحلة<\/td><td>[^<]*<\/td><td>[^<]*<\/td><td>)([^<]*)(<\/td><\/tr>)/,
        `$1${units[0]}$3`);
      return html;
    }

    html=html.replace(/(<tr><td>كميات العصارة المرحلة<\/td><td>[^<]*<\/td><td>)([^<]*)(<\/td><td>)([^<]*)(<\/td><\/tr>)/,
      '$1راجع التفاصيل$3وحدات مختلفة$5');
    html=html.replace('<div class="section-title">ملخص العمليات الشهرية</div>',
      '<div class="section-title">ملخص العمليات الشهرية</div><div class="comparison-empty">تنبيه: بيانات العصارة في هذا الشهر تحتوي أكثر من وحدة قياس، لذلك لم يتم اعتماد مجموع موحد لها.</div>');
    return html;
  };
})();

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
document.getElementById("archiveBtn").addEventListener("click", () => {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/archive" && typeof window.loadArchivePage === "function") {
    window.loadArchivePage(1);
    return;
  }
  loadArchive(true);
});
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

/* ===== js/app-monthly-chart-stable10.js ===== */
/* =========================================================
   Stable 10 — توحيد الرسم الشهري مع المجاميع المحفوظة
========================================================= */

(function () {
  function storedMetricValues(reports, metric) {
    if (metric === "trucks") {
      return reports.map((report) => Number(report.total_trucks || 0));
    }
    if (metric === "diesel") {
      return reports.map((report) => Number(report.total_diesel || 0));
    }
    return reports.map((report) => Number(report.total_waste_tons || 0));
  }

  window.renderMonthlyMetricChart = async function renderMonthlyMetricChartStable10(metric = "waste") {
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

    const values = storedMetricValues(reports, metric);
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
  };

  renderMonthlyMetricChart = window.renderMonthlyMetricChart;
})();

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
    const monthReports = reports.filter((report) => String(report.report_date || "").startsWith(monthValue));
    return {
      monthValue,
      days: monthReports.length,
      waste: monthReports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0),
      trucks: monthReports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0),
      diesel: monthReports.reduce((sum, report) => sum + Number(report.total_diesel || 0), 0),
    };
  });

  const daysTotal = reports.length;
  const wasteTotal = reports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0);
  const trucksTotal = reports.reduce((sum, report) => sum + Number(report.total_trucks || 0), 0);
  const dieselTotal = reports.reduce((sum, report) => sum + Number(report.total_diesel || 0), 0);
  const dailyWasteAverage = daysTotal ? wasteTotal / daysTotal : 0;
  const highestDay = reports.reduce((max, report) => Number(report.total_waste_tons || 0) > Number(max.total_waste_tons || 0) ? report : max);
  const lowestDay = reports.reduce((min, report) => Number(report.total_waste_tons || 0) < Number(min.total_waste_tons || 0) ? report : min);

  const rows = [
    ["الملخص السنوي لمكب المنيا", year],
    [],
    ["البيان", "القيمة"],
    ["إجمالي أيام التشغيل المسجلة", daysTotal],
    ["إجمالي النفايات طن", wasteTotal],
    ["متوسط النفايات اليومي طن/يوم مسجل", dailyWasteAverage],
    ["أعلى كمية نفايات يومية طن", Number(highestDay.total_waste_tons || 0)],
    ["تاريخ أعلى كمية", highestDay.report_date],
    ["أقل كمية نفايات يومية طن", Number(lowestDay.total_waste_tons || 0)],
    ["تاريخ أقل كمية", lowestDay.report_date],
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

  const csv = "\uFEFF" + rows.map((row) => row.map(annualCsvCell).join(",")).join("\r\n");
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
document.getElementById("archiveBtn")?.addEventListener("click", () => setTimeout(ensureAnnualExportButton, 300));

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

function annualPeriodCutoff(reports, year) {
  const prefix = `${year}-`;
  const dates = (Array.isArray(reports) ? reports : [])
    .map((report) => String(report.report_date || ""))
    .filter((date) => date.startsWith(prefix) && /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
  return dates.length ? dates.at(-1).slice(5) : null;
}

function filterAnnualPeriod(reports, year, cutoff = null) {
  const prefix = `${year}-`;
  return reports.filter((report) => {
    const date = String(report.report_date || "");
    if (!date.startsWith(prefix)) return false;
    return !cutoff || date.slice(5) <= cutoff;
  });
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

async function calculateAnnualTotals(year, cutoff = null, providedReports = null) {
  const allReports = Array.isArray(providedReports)
    ? providedReports
    : await getAnnualReportsForYear(year);
  const reports = filterAnnualPeriod(allReports, year, cutoff);
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
  const currentReports = await getAnnualReportsForYear(String(year));
  const cutoff = annualPeriodCutoff(currentReports, String(year));
  const periodLabel = cutoff ? ` حتى ${cutoff.slice(3, 5)}/${cutoff.slice(0, 2)} في السنتين` : "";
  title.textContent = `مقارنة مع السنة السابقة - ${previousYear}${periodLabel}`;
  grid.style.display = "none";
  empty.style.display = "block";
  empty.textContent = "جاري تحميل المقارنة...";

  const [current, previous] = await Promise.all([
    calculateAnnualTotals(String(year), cutoff, currentReports),
    calculateAnnualTotals(String(previousYear), cutoff),
  ]);

  if (!current || !previous) {
    grid.style.display = "none";
    empty.style.display = "block";
    empty.textContent = "لا توجد بيانات محفوظة للسنة السابقة للمقارنة.";
    return;
  }

  const cardStyle = "background:#fff;border:1px solid #d1d5db;border-radius:8px;padding:12px 8px;text-align:center;";
  grid.innerHTML = `
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;">النفايات</span><strong style="display:block;margin:6px 0;font-size:18px;">${formatAnnualChange(current.waste, previous.waste)}</strong><small style="display:block;color:#6b7280;">${year}: ${formatNumber(current.waste)} طن · ${previousYear}: ${formatNumber(previous.waste)} طن</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;">الشاحنات</span><strong style="display:block;margin:6px 0;font-size:18px;">${formatAnnualChange(current.trucks, previous.trucks)}</strong><small style="display:block;color:#6b7280;">${year}: ${formatNumber(current.trucks)} · ${previousYear}: ${formatNumber(previous.trucks)}</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;">السولار</span><strong style="display:block;margin:6px 0;font-size:18px;">${formatAnnualChange(current.diesel, previous.diesel)}</strong><small style="display:block;color:#6b7280;">${year}: ${formatNumber(current.diesel)} لتر · ${previousYear}: ${formatNumber(previous.diesel)} لتر</small></div>
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

  const cardStyle = "border:1px solid #d1d5db;border-radius:8px;padding:14px 10px;text-align:center;background:#fff;";
  const insights = document.createElement("div");
  insights.id = "annualInsights";
  insights.style.display = "grid";
  insights.style.gridTemplateColumns = "repeat(3,minmax(0,1fr))";
  insights.style.gap = "12px";
  insights.style.margin = "0 0 16px";
  insights.innerHTML = `
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">أعلى شهر نفايات</span><strong id="annualBestMonth" style="display:block;font-size:18px;">-</strong><small id="annualBestMonthValue" style="display:block;margin-top:4px;color:#6b7280;">-</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">أقل شهر نفايات</span><strong id="annualWorstMonth" style="display:block;font-size:18px;">-</strong><small id="annualWorstMonthValue" style="display:block;margin-top:4px;color:#6b7280;">-</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">متوسط النفايات الشهري</span><strong id="annualMonthlyWasteAverage" style="display:block;font-size:18px;">0 طن</strong><small id="annualMonthlyWasteAverageNote" style="display:block;margin-top:4px;color:#6b7280;">للأشهر التي تحتوي بيانات</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">متوسط النفايات اليومي</span><strong id="annualDailyWasteAverage" style="display:block;font-size:18px;">0 طن</strong><small id="annualDailyWasteAverageNote" style="display:block;margin-top:4px;color:#6b7280;">لأيام التشغيل المسجلة</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">أعلى يوم نفايات</span><strong id="annualBestDay" style="display:block;font-size:18px;">-</strong><small id="annualBestDayValue" style="display:block;margin-top:4px;color:#6b7280;">-</small></div>
    <div style="${cardStyle}"><span style="display:block;color:#6b7280;margin-bottom:6px;">أقل يوم نفايات</span><strong id="annualWorstDay" style="display:block;font-size:18px;">-</strong><small id="annualWorstDayValue" style="display:block;margin-top:4px;color:#6b7280;">-</small></div>
  `;

  cards.insertAdjacentElement("afterend", insights);
}

function annualJerusalemPeriod() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: String(values.year), month: `${values.year}-${values.month}` };
}

function renderAnnualInsights() {
  setupAnnualInsights();

  const year = document.getElementById("annualYearFilter")?.value || "";
  const bestMonth = document.getElementById("annualBestMonth");
  const bestValue = document.getElementById("annualBestMonthValue");
  const worstMonth = document.getElementById("annualWorstMonth");
  const worstValue = document.getElementById("annualWorstMonthValue");
  const averageValue = document.getElementById("annualMonthlyWasteAverage");
  const averageNote = document.getElementById("annualMonthlyWasteAverageNote");
  const dailyAverage = document.getElementById("annualDailyWasteAverage");
  const dailyAverageNote = document.getElementById("annualDailyWasteAverageNote");
  const bestDay = document.getElementById("annualBestDay");
  const bestDayValue = document.getElementById("annualBestDayValue");
  const worstDay = document.getElementById("annualWorstDay");
  const worstDayValue = document.getElementById("annualWorstDayValue");

  if (!bestMonth || !bestValue || !worstMonth || !worstValue || !averageValue || !dailyAverage || !bestDay || !worstDay) return;

  const annualReports = year ? archiveReports.filter((report) =>
    String(report.report_date || "").startsWith(`${year}-`)
  ) : [];

  if (!year || !annualReports.length) {
    bestMonth.textContent = worstMonth.textContent = bestDay.textContent = worstDay.textContent = "-";
    bestValue.textContent = worstValue.textContent = bestDayValue.textContent = worstDayValue.textContent = year ? "لا توجد بيانات" : "-";
    averageValue.textContent = dailyAverage.textContent = "0 طن";
    if (averageNote) averageNote.textContent = "للأشهر التي تحتوي بيانات";
    if (dailyAverageNote) dailyAverageNote.textContent = "لأيام التشغيل المسجلة";
    return;
  }

  const currentPeriod = annualJerusalemPeriod();
  const isCurrentYear = String(year) === currentPeriod.year;
  const months = Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, "0");
    const monthValue = `${year}-${monthNumber}`;
    const reports = annualReports.filter((report) => String(report.report_date || "").startsWith(monthValue));
    return {
      monthValue,
      reportsCount: reports.length,
      waste: reports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0),
    };
  }).filter((item) => item.reportsCount > 0 && (!isCurrentYear || item.monthValue < currentPeriod.month));

  if (!months.length) {
    bestMonth.textContent = worstMonth.textContent = "-";
    bestValue.textContent = worstValue.textContent = isCurrentYear ? "لا توجد أشهر مكتملة" : "لا توجد بيانات";
    averageValue.textContent = "0 طن";
    if (averageNote) averageNote.textContent = isCurrentYear ? "يُحسب بعد اكتمال أول شهر" : "للأشهر التي تحتوي بيانات";
  } else {
    const highest = months.reduce((max, item) => item.waste > max.waste ? item : max);
    const lowest = months.reduce((min, item) => item.waste < min.waste ? item : min);
    const totalWaste = months.reduce((sum, item) => sum + item.waste, 0);
    bestMonth.textContent = getMonthName(highest.monthValue);
    bestValue.textContent = `${formatNumber(highest.waste)} طن`;
    worstMonth.textContent = getMonthName(lowest.monthValue);
    worstValue.textContent = `${formatNumber(lowest.waste)} طن`;
    averageValue.textContent = `${formatNumber(totalWaste / months.length)} طن`;
    if (averageNote) averageNote.textContent = isCurrentYear
      ? `للأشهر المكتملة فقط — ${months.length} شهر`
      : `للأشهر التي تحتوي بيانات — ${months.length} شهر`;
  }

  const yearWaste = annualReports.reduce((sum, report) => sum + Number(report.total_waste_tons || 0), 0);
  const highestDay = annualReports.reduce((max, report) => Number(report.total_waste_tons || 0) > Number(max.total_waste_tons || 0) ? report : max);
  const lowestDay = annualReports.reduce((min, report) => Number(report.total_waste_tons || 0) < Number(min.total_waste_tons || 0) ? report : min);
  dailyAverage.textContent = `${formatNumber(yearWaste / annualReports.length)} طن`;
  if (dailyAverageNote) dailyAverageNote.textContent = `لأيام التشغيل المسجلة — ${annualReports.length} يوم`;
  bestDay.textContent = formatDate(highestDay.report_date);
  bestDayValue.textContent = `${formatNumber(highestDay.total_waste_tons)} طن`;
  worstDay.textContent = formatDate(lowestDay.report_date);
  worstDayValue.textContent = `${formatNumber(lowestDay.total_waste_tons)} طن`;
}

setupAnnualInsights();

document.getElementById("archiveBtn")?.addEventListener("click", () => setTimeout(renderAnnualInsights, 350));
document.addEventListener("change", (event) => {
  if (event.target?.id === "annualYearFilter") setTimeout(renderAnnualInsights, 180);
});

const annualSummaryBody = document.getElementById("annualSummaryBody");
if (annualSummaryBody && typeof MutationObserver !== "undefined") {
  new MutationObserver(() => renderAnnualInsights()).observe(annualSummaryBody, { childList: true, subtree: true });
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
    window.MINYA_ANNUAL_LINKED_SUMMARY = data.details || null;

    if (typeof renderAnnualSummary === "function") {
      await renderAnnualSummary();
    }
    if (typeof window.renderLinkedPeriodSummary === "function") {
      window.renderLinkedPeriodSummary("annual", data.details || null);
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

/* ===== js/app-period-linked-summary.js ===== */
/* Linked monthly/annual Summary generated directly from stored daily reports. */
(function(){
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const fmt=value=>Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2});

  function canonicalOperationName(name){
    const value=String(name||'').replace(/\s+/g,' ').trim();
    const aliases=new Map([
      ['مواد التغطية ( طمم)','مواد التغطية (طمم)'],
      ['كميات المياه','كميات المياه للتعقيم والترطيب'],
      ['كميات العصارة','كميات العصارة المرحلة'],
      ['( طمم) خارجي','طمم خارجي'],
      ['(طمم) خارجي','طمم خارجي']
    ]);
    return aliases.get(value)||value;
  }

  function mergeOperationRows(rows){
    if(!Array.isArray(rows))return [];
    const map=new Map();
    rows.forEach(row=>{
      const name=canonicalOperationName(row?.name);
      if(!name)return;
      const current=map.get(name)||{name,vehicles:0,quantity:0,unit:row?.unit||'',daily_average:0};
      current.vehicles+=Number(row?.vehicles||0);
      current.quantity+=Number(row?.quantity||0);
      if(!current.unit&&row?.unit)current.unit=row.unit;
      map.set(name,current);
    });
    return [...map.values()];
  }

  function quantityTable(title,rows){
    if(!Array.isArray(rows)||!rows.length)return '';
    return `<section class="linked-summary-block"><h5>${esc(title)}</h5><div class="linked-summary-scroll"><table><thead><tr><th>البيان</th><th>المركبات / المرات</th><th>الكمية</th><th>المعدل اليومي</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.name)}</td><td>${fmt(row.vehicles)}</td><td>${fmt(row.quantity)} ${esc(row.unit||'')}</td><td>${fmt(row.daily_average)} ${esc(row.unit||'')}</td></tr>`).join('')}</tbody></table></div></section>`;
  }

  function equipmentTable(rows){
    if(!Array.isArray(rows)||!rows.length)return '';
    const total=rows.reduce((sum,row)=>sum+Number(row.diesel_liters||0),0);
    return `<section class="linked-summary-block"><h5>مجموع سولار المعدات</h5><div class="linked-summary-scroll"><table><thead><tr><th>الآلية</th><th>السولار</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.name)}</td><td>${fmt(row.diesel_liters)} لتر</td></tr>`).join('')}<tr class="linked-summary-total"><th>المجموع</th><th>${fmt(total)} لتر</th></tr></tbody></table></div></section>`;
  }

  function renderLinkedPeriodSummary(mode,details){
    const isAnnual=mode==='annual';
    const root=isAnnual?document.getElementById('annualSummarySection'):document.getElementById('monthlyReportSection');
    const anchor=isAnnual?document.getElementById('annualSummaryCards'):root?.querySelector('.monthly-summary');
    const id=isAnnual?'annualLinkedSummary':'monthlyLinkedSummary';
    let panel=document.getElementById(id);
    if(!root||!anchor)return;
    if(!panel){panel=document.createElement('section');panel.id=id;panel.className='linked-period-summary';anchor.insertAdjacentElement('afterend',panel);}
    if(!details||!Number(details.days||0)){
      panel.innerHTML='<div class="linked-summary-empty">لا توجد تقارير يومية لحساب المجاميع المرتبطة.</div>';
      return;
    }
    const totals=details.totals||{};
    const operations=mergeOperationRows(details.operations).map(row=>({...row,daily_average:Number(details.days||0)?row.quantity/Number(details.days):0}));
    const wasteDifference=Math.abs(Number(totals.recorded_waste_tons||0)-Number(totals.incoming_waste_tons||0));
    const differenceNotice=wasteDifference>0.01?`<div class="linked-summary-warning"><b>تنبيه اختلاف:</b> الإجمالي المسجل في التقارير اليومية هو ${fmt(totals.recorded_waste_tons)} طن، بينما مجموع المكب والمحطات هو ${fmt(totals.incoming_waste_tons)} طن. الفرق ${fmt(wasteDifference)} طن ويحتاج مراجعة التقارير اليومية.</div>`:'';
    panel.innerHTML=`<div class="linked-summary-head"><div><span>SUMMARY LINK</span><h4>المجاميع المرتبطة بالتقارير اليومية</h4><p>تتحدث تلقائيًا من ${fmt(details.days)} تقريرًا دون جمع مكرر.</p></div><div class="linked-summary-kpis"><div><small>نفايات مكب المنيا</small><strong>${fmt(totals.landfill_waste_tons)} طن</strong><em>${fmt(totals.landfill_trucks)} مركبة</em></div><div><small>نفايات محطات الترحيل</small><strong>${fmt(totals.station_waste_tons)} طن</strong><em>${fmt(totals.station_trucks)} شاحنة</em></div><div class="linked-summary-grand"><small>إجمالي الوارد لمكب المنيا</small><strong>${fmt(totals.incoming_waste_tons)} طن</strong><em>${fmt(totals.incoming_trucks)} مركبة وشاحنة</em></div><div><small>إجمالي السولار</small><strong>${fmt(totals.diesel_liters)} لتر</strong></div></div></div><div class="linked-summary-formula"><b>طريقة الحساب:</b> إجمالي النفايات الواردة لمكب المنيا = نفايات مكب المنيا + نفايات جميع محطات الترحيل.</div>${differenceNotice}${quantityTable('عمليات مكب المنيا والخدمات',operations)}${quantityTable('محطات الترحيل — محسوبة بصورة مستقلة',details.stations)}${equipmentTable(details.equipment)}`;
  }

  window.renderLinkedPeriodSummary=renderLinkedPeriodSummary;
})();

;

/* ===== js/app-archive-search.js ===== */
/* =========================================================
   V3.3 - البحث السريع في الأرشيف (صفحة الأرشيف فقط)
========================================================= */

let archiveSearchTimer = null;

function isArchiveSearchPage() {
  return (location.pathname.replace(/\/+$/, "") || "/") === "/archive";
}

function buildArchiveSummaryParams() {
  const dateValue = document.getElementById("archiveDateFilter")?.value || "";
  const monthValue = document.getElementById("archiveMonthFilter")?.value || "";
  const searchValue = document.getElementById("archiveQuickSearch")?.value?.trim() || "";
  const params = new URLSearchParams({ page: "1", limit: "10" });

  if (searchValue) params.set("q", searchValue);

  if (dateValue) {
    params.set("from", dateValue);
    params.set("to", dateValue);
  } else if (monthValue) {
    const [year, month] = monthValue.split("-").map(Number);
    if (year && month >= 1 && month <= 12) {
      const normalizedMonth = `${year}-${String(month).padStart(2, "0")}`;
      const lastDay = new Date(year, month, 0).getDate();
      params.set("from", `${normalizedMonth}-01`);
      params.set("to", `${normalizedMonth}-${String(lastDay).padStart(2, "0")}`);
    }
  }

  return params;
}

async function syncArchiveSummaryCards() {
  if (!isArchiveSearchPage()) return;
  try {
    const response = await fetch(`${API}/api/archive?${buildArchiveSummaryParams()}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || "فشل تحميل ملخص الأرشيف");

    const summary = data.summary || {};
    const setValue = (id, value) => {
      const element = document.getElementById(id);
      if (element) element.textContent = typeof formatNumber === "function" ? formatNumber(value) : String(value ?? 0);
    };

    setValue("archiveReportsCount", Number(data.count || 0));
    setValue("archiveWasteTotal", Number(summary.total_waste_tons || 0));
    setValue("archiveTrucksTotal", Number(summary.total_trucks || 0));
    setValue("archiveDieselTotal", Number(summary.total_diesel || 0));
  } catch (error) {
    console.error("فشل تحديث بطاقات ملخص الأرشيف", error);
  }
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
      syncArchiveSummaryCards();
    }, 300);
  });

  document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
    if (input) input.value = "";
    clearTimeout(archiveSearchTimer);
    setTimeout(() => {
      if (typeof window.loadArchivePage === "function") window.loadArchivePage(1);
      syncArchiveSummaryCards();
    }, 80);
  });
}

if (isArchiveSearchPage()) {
  setupArchiveQuickSearch();

  document.addEventListener("change", (event) => {
    if (["archiveDateFilter", "archiveMonthFilter"].includes(event.target?.id)) {
      setTimeout(syncArchiveSummaryCards, 30);
    }
  });

  document.getElementById("archiveBtn")?.addEventListener("click", () => {
    setTimeout(() => {
      setupArchiveQuickSearch();
      syncArchiveSummaryCards();
    }, 200);
  });

  setTimeout(syncArchiveSummaryCards, 100);
}

window.setupArchiveQuickSearch = setupArchiveQuickSearch;
window.syncArchiveSummaryCards = syncArchiveSummaryCards;

;

/* ===== js/app-archive-pagination.js ===== */
/* =========================================================
   V3.3 - ترقيم صفحات جدول الأرشيف (صفحة الأرشيف فقط)
========================================================= */

let archivePage = 1;
let archivePages = 1;
const archivePageLimit = 50;
const archiveSelectedReports = new Set();

function updateArchiveSelectionUI() {
  const checkboxes = Array.from(document.querySelectorAll(".archive-select-report"));
  archiveSelectedReports.clear();
  checkboxes.filter(box => box.checked).forEach(box => archiveSelectedReports.add(Number(box.value)));
  const selectAll = document.getElementById("archiveSelectAll");
  if (selectAll) {
    selectAll.checked = checkboxes.length > 0 && checkboxes.every(box => box.checked);
    selectAll.indeterminate = checkboxes.some(box => box.checked) && !selectAll.checked;
  }
  const count = document.getElementById("archiveSelectedCount");
  if (count) count.textContent = `${archiveSelectedReports.size} محدد`;
  const deleteButton = document.getElementById("archiveBulkDelete");
  if (deleteButton) deleteButton.disabled = archiveSelectedReports.size === 0;
}

function archiveSelectAllReports() {
  document.querySelectorAll(".archive-select-report").forEach(box => { box.checked = true; });
  updateArchiveSelectionUI();
}

function archiveClearSelectedReports() {
  document.querySelectorAll(".archive-select-report").forEach(box => { box.checked = false; });
  updateArchiveSelectionUI();
}

function archiveToggleSelectAll(checked) {
  document.querySelectorAll(".archive-select-report").forEach(box => { box.checked = Boolean(checked); });
  updateArchiveSelectionUI();
}

async function archiveBulkDeleteSelected() {
  updateArchiveSelectionUI();
  const ids = Array.from(archiveSelectedReports);
  if (!ids.length) return;
  if (!confirm(`سيتم حذف ${ids.length} تقرير نهائيًا. هل تريد المتابعة؟`)) return;
  const button = document.getElementById("archiveBulkDelete");
  if (button) button.disabled = true;
  try {
    const response = await fetch(`${API}/api/reports/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.message || "فشل حذف التقارير المحددة");
    archiveSelectedReports.clear();
    if (typeof showMessage === "function") showMessage(data.message || `تم حذف ${ids.length} تقرير`);
    await loadArchivePage(archivePage);
  } catch (error) {
    console.error(error);
    if (typeof showMessage === "function") showMessage(error.message || "فشل حذف التقارير المحددة");
    else alert(error.message || "فشل حذف التقارير المحددة");
    updateArchiveSelectionUI();
  }
}

function isArchivePage() {
  return (location.pathname.replace(/\/+$/, "") || "/") === "/archive";
}

async function archiveDeleteReport(id) {
  if (!confirm("هل تريد حذف هذا التقرير نهائيًا؟")) return;
  try {
    let response = await fetch(`${API}/api/reports/${id}`, { method: "DELETE" });
    let data = await response.json().catch(() => ({}));

    if (response.status === 423) {
      const reopen = await fetch(`${API}/api/reports/${id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "حذف من الأرشيف بواسطة المدير" })
      });
      const reopenData = await reopen.json().catch(() => ({}));
      if (!reopen.ok || !reopenData.ok) throw new Error(reopenData.message || "تعذر إعادة فتح التقرير للحذف");
      response = await fetch(`${API}/api/reports/${id}`, { method: "DELETE" });
      data = await response.json().catch(() => ({}));
    }

    if (!response.ok || !data.ok) throw new Error(data.message || "فشل حذف التقرير");
    if (typeof showMessage === "function") showMessage("تم حذف التقرير بنجاح");
    await loadArchivePage(archivePage);
  } catch (error) {
    console.error(error);
    if (typeof showMessage === "function") showMessage(error.message || "حدث خطأ أثناء حذف التقرير");
    else alert(error.message || "حدث خطأ أثناء حذف التقرير");
  }
}

function setupArchivePagination() {
  if (!isArchivePage()) return;

  const table = document.getElementById("archiveTable");
  if (!table || document.getElementById("archivePagination")) return;

  const headerRow = table.querySelector("thead tr");
  if (headerRow && !headerRow.querySelector(".archive-select-column")) {
    const header = document.createElement("th");
    header.className = "archive-select-column";
    header.innerHTML = '<input id="archiveSelectAll" type="checkbox" aria-label="تحديد كل التقارير الظاهرة">';
    headerRow.insertBefore(header, headerRow.firstChild);
  }

  const toolbar = document.createElement("div");
  toolbar.id = "archiveBulkActions";
  toolbar.style.cssText = "display:flex;align-items:center;gap:10px;margin:12px 0;flex-wrap:wrap;";
  toolbar.innerHTML = `
    <button type="button" id="archiveSelectAllButton">تحديد الكل</button>
    <button type="button" id="archiveClearSelectionButton">إلغاء التحديد</button>
    <strong id="archiveSelectedCount">0 محدد</strong>
    <button type="button" id="archiveBulkDelete" class="role-admin-action" style="background:#b91c1c" disabled>حذف المحدد</button>
  `;
  table.insertAdjacentElement("beforebegin", toolbar);

  if (!document.getElementById("archiveTableScroll")) {
    const tableScroll = document.createElement("div");
    tableScroll.id = "archiveTableScroll";
    tableScroll.setAttribute("role", "region");
    tableScroll.setAttribute("aria-label", "جدول أرشيف التقارير");
    tableScroll.tabIndex = 0;
    table.parentNode.insertBefore(tableScroll, table);
    tableScroll.appendChild(table);
  }

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

    tbody.innerHTML = `<tr><td colspan="7">جاري تحميل الأرشيف...</td></tr>`;

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
          <td class="archive-select-column"><input class="archive-select-report" type="checkbox" value="${report.id}" aria-label="تحديد التقرير ${escapeHtml(report.report_no)}"></td>
          <td>${escapeHtml(report.report_no)}</td>
          <td>${formatDate(report.report_date)}</td>
          <td>${formatNumber(report.total_waste_tons)}</td>
          <td>${formatNumber(report.total_trucks)}</td>
          <td>${formatNumber(report.total_diesel)}</td>
          <td>
            <button class="archive-open" onclick="openReport(${report.id})">فتح</button>
            <button class="role-editor-action archive-edit" onclick="goToEditReport(${report.id})">تعديل</button>
            <button class="archive-print" onclick="printReport(${report.id})">طباعة</button>
            <button class="role-admin-action" onclick="archiveDeleteReport(${report.id})" style="background:#b91c1c">حذف</button>
          </td>
        </tr>
      `).join("")
      : `<tr><td colspan="7">لا توجد تقارير مطابقة</td></tr>`;

    const info = document.getElementById("archivePageInfo");
    if (info) info.textContent = `صفحة ${archivePage} من ${archivePages} — ${data.count} تقرير`;

    const prev = document.getElementById("archivePrevPage");
    const next = document.getElementById("archiveNextPage");
    if (prev) prev.disabled = archivePage <= 1;
    if (next) next.disabled = archivePage >= archivePages;

    archiveSelectedReports.clear();
    updateArchiveSelectionUI();
    if (typeof window.applyRoleAwareUI === "function") window.applyRoleAwareUI();
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="7">تعذر تحميل الأرشيف</td></tr>`;
  }
}

/* Imported source reports: show unavailable values as '-' in the official daily report. */
(function installUnavailableDash(){
  if (typeof buildFullReportHtml !== "function" || window.__MINYA_DASH_PRINT__) return;
  window.__MINYA_DASH_PRINT__ = true;
  const original = buildFullReportHtml;
  buildFullReportHtml = function(data, autoPrint = false) {
    let html = original(data, autoPrint);
    html = html.replaceAll('<td>غير محدد</td><td>حالة الآلية غير متوفرة في ملفات المصدر</td><td>0</td>', '<td>-</td><td>-</td><td>-</td>');
    html = html.replaceAll('<td>0</td><td>التفصيل غير متوفر في ملفات المصدر</td>', '<td>-</td><td>-</td>');
    html = html.replace(/<tr><td>خط الفرز<\/td><td>0<\/td><td>0<\/td><td>طن<\/td><\/tr>/g, '<tr><td>خط الفرز</td><td>-</td><td>-</td><td>طن</td></tr>');
    html = html.replace(/<tr><td>\( طمم\) خارجي<\/td><td>0<\/td><td>0<\/td><td>طن<\/td><\/tr>/g, '<tr><td>( طمم) خارجي</td><td>-</td><td>-</td><td>طن</td></tr>');
    return html;
  };
})();

if (isArchivePage()) {
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target?.matches?.(".archive-select-report")) updateArchiveSelectionUI();
    if (target?.id === "archiveSelectAll") archiveToggleSelectAll(target.checked);
  });

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;
    if (button.id === "archiveSelectAllButton") archiveSelectAllReports();
    if (button.id === "archiveClearSelectionButton") archiveClearSelectedReports();
    if (button.id === "archiveBulkDelete") archiveBulkDeleteSelected();
  });

  setupArchivePagination();
  setTimeout(() => loadArchivePage(1), 0);

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
window.archiveDeleteReport = archiveDeleteReport;
window.updateArchiveSelectionUI = updateArchiveSelectionUI;

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

  function monthLabel(monthValue) {
    const names = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    const [year, month] = String(monthValue || "").split("-");
    const index = Number(month) - 1;
    return year && index >= 0 && index < 12 ? `${names[index]} ${year}` : String(monthValue || "-");
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

  function setMetricCard(id, label, value, unit) {
    const strong = document.getElementById(id);
    if (!strong) return;
    const card = strong.closest(".dashboard-metric-card");
    const labelEl = card?.querySelector("span");
    const unitEl = card?.querySelector("small");
    if (labelEl) labelEl.textContent = label;
    strong.textContent = value;
    if (unitEl) unitEl.textContent = unit || "";
  }

  async function resolveLastAvailableMonth(dates) {
    try {
      const [closeResponse, reportsResponse] = await Promise.all([
        fetch(`/api/monthly-close?year=${encodeURIComponent(dates.year)}`, { cache: "no-store" }),
        fetch("/api/reports", { cache: "no-store" })
      ]);
      const closeData = await closeResponse.json().catch(() => ({}));
      const reportsData = await reportsResponse.json().catch(() => ({}));
      const reports = Array.isArray(reportsData.reports) ? reportsData.reports : [];
      const eligible = Array.isArray(closeData.months)
        ? closeData.months.filter(item => item.month_key < dates.month && Number(item.reports_count || 0) > 0)
        : [];
      eligible.sort((a, b) => String(b.month_key).localeCompare(String(a.month_key)));
      const preferred = eligible.find(item => ["approved", "completed"].includes(String(item.status || ""))) || eligible[0];
      let monthKey = preferred?.month_key || "";
      if (!monthKey) {
        const keys = [...new Set(reports.map(r => String(r.report_date || "").slice(0, 7)).filter(k => /^\d{4}-\d{2}$/.test(k) && k < dates.month))].sort().reverse();
        monthKey = keys[0] || "";
      }
      if (!monthKey) return null;
      const monthReports = reports.filter(r => String(r.report_date || "").startsWith(`${monthKey}-`));
      if (!monthReports.length) return null;
      const sum = key => monthReports.reduce((total, report) => total + Number(report[key] || 0), 0);
      return {
        month: monthKey,
        waste: sum("total_waste_tons"),
        trucks: sum("total_trucks"),
        days: monthReports.length,
        status: preferred?.status || "data",
        statusLabel: preferred?.status_label || "آخر شهر متوفر"
      };
    } catch (error) {
      console.error("تعذر تحديد آخر شهر متوفر", error);
      return null;
    }
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
    } else if (page === "archive" && typeof window.loadArchivePage === "function") {
      setTimeout(() => window.loadArchivePage(1), 50);
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
        yearWaste: Number(year.waste || 0),
        yearReports: Number(year.reports || 0),
      };

      Object.entries(values).forEach(([key, value]) => {
        const element = document.getElementById(`dash-${key}`);
        if (element) element.textContent = formatDashboardNumber(value);
      });

      const currentMonthDays = Number(month.days || 0);
      if (currentMonthDays > 0) {
        setMetricCard("dash-monthWaste", "نفايات الشهر", formatDashboardNumber(month.waste), "طن");
        setMetricCard("dash-monthTrucks", "شاحنات الشهر", formatDashboardNumber(month.trucks), "شاحنة");
        setMetricCard("dash-monthDays", "أيام الشهر المسجلة", formatDashboardNumber(currentMonthDays), "يوم");
      } else {
        const lastMonth = await resolveLastAvailableMonth(dates);
        if (lastMonth) {
          const label = monthLabel(lastMonth.month);
          setMetricCard("dash-monthWaste", `نفايات آخر شهر مكتمل`, formatDashboardNumber(lastMonth.waste), `طن · ${label}`);
          setMetricCard("dash-monthTrucks", `شاحنات آخر شهر مكتمل`, formatDashboardNumber(lastMonth.trucks), `شاحنة · ${label}`);
          setMetricCard("dash-monthDays", "حالة الشهر الحالي", "بانتظار البيانات", monthLabel(dates.month));
          if (status) status.textContent = `${monthLabel(dates.month)}: بانتظار بيانات الشهر · آخر شهر متوفر ${label}`;
        } else {
          setMetricCard("dash-monthWaste", "نفايات الشهر", "بانتظار البيانات", monthLabel(dates.month));
          setMetricCard("dash-monthTrucks", "شاحنات الشهر", "بانتظار البيانات", monthLabel(dates.month));
          setMetricCard("dash-monthDays", "حالة الشهر الحالي", "بانتظار البيانات", monthLabel(dates.month));
        }
      }

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

      if (status && currentMonthDays > 0) {
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

/* ===== js/app-notification-center.js ===== */
/* Unified notification center */
(function () {
  if (window.__MINYA_NOTIFICATION_CENTER__) return;
  window.__MINYA_NOTIFICATION_CENTER__ = true;
  const state = { items: [], open: false, refreshPromise: null };

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
    const normalized = { tone: "info", href: "/", ...item };
    const key = `${normalized.title || ""}|${normalized.text}|${normalized.href}`;
    const exists = state.items.some((x) => `${x.title || ""}|${x.text}|${x.href}` === key);
    if (!exists) state.items.push(normalized);
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

  async function doRefresh() {
    state.items = [];
    await Promise.all([collectLicenseAlerts(), collectReportAlerts()]);
    state.items.sort((a, b) => ({ danger: 0, warning: 1, info: 2 }[a.tone] ?? 3) - ({ danger: 0, warning: 1, info: 2 }[b.tone] ?? 3));
    render();
    window.MINYA_NOTIFICATIONS = state.items.slice();
    window.dispatchEvent(new CustomEvent("minya-notifications-updated", { detail: { items: state.items.slice() } }));
  }

  function refresh() {
    if (state.refreshPromise) return state.refreshPromise;
    state.refreshPromise = doRefresh().finally(() => {
      state.refreshPromise = null;
    });
    return state.refreshPromise;
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

/* ===== js/app-today-dashboard.js ===== */
/* Today operations dashboard */
(function(){
  function isHome(){const p=location.pathname.replace(/\/+$/,"")||"/";return p==="/";}
  function fmt(v){return Number(v||0).toLocaleString("en-US",{maximumFractionDigits:1});}
  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
  function todayIso(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  function ensure(){
    const home=document.querySelector('.dashboard-home');
    if(!home||document.getElementById('todayOperationsSection'))return null;
    const section=document.createElement('section');
    section.id='todayOperationsSection';
    section.className='today-operations';
    section.innerHTML=`<div class="today-operations-head"><div><span>TODAY</span><h3>حالة التشغيل اليوم</h3><p id="todayOperationsDate">-</p></div><a href="/report">فتح تقرير اليوم</a></div><div class="today-operations-grid"><div><span>النفايات</span><strong id="todayWaste">0</strong><small>طن</small></div><div><span>الشاحنات</span><strong id="todayTrucks">0</strong></div><div><span>السولار</span><strong id="todayDiesel">0</strong><small>لتر</small></div><div><span>المعدات المتوقفة</span><strong id="todayStopped">0</strong></div><div><span>حالة التقرير</span><strong id="todayReportState">غير محفوظ</strong></div></div><div id="todayStoppedList" class="today-stopped-list"></div>`;
    const executive=document.getElementById('executiveDashboardSection');
    if(executive) home.insertBefore(section,executive); else home.prepend(section);
    return section;
  }
  async function load(){
    if(!isHome())return;const shell=ensure();if(!shell)return;
    const today=todayIso();document.getElementById('todayOperationsDate').textContent=today;
    try{
      const r=await fetch('/api/reports',{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.message||'load failed');
      const reports=Array.isArray(d.reports)?d.reports:[];const row=reports.find(x=>String(x.report_date||'')===today);
      if(!row){shell.dataset.state='missing';return;}
      document.getElementById('todayWaste').textContent=fmt(row.total_waste_tons);
      document.getElementById('todayTrucks').textContent=fmt(row.total_trucks);
      document.getElementById('todayDiesel').textContent=fmt(row.total_diesel);
      document.getElementById('todayReportState').textContent='محفوظ';shell.dataset.state='ok';
      if(!row.id)return;
      const rr=await fetch(`/api/reports/${row.id}`,{cache:'no-store'}),dd=await rr.json();if(!rr.ok)return;
      const report=dd.report||dd;const eq=Array.isArray(report.equipment)?report.equipment:Array.isArray(dd.equipment)?dd.equipment:[];
      const stopped=eq.filter(x=>{const s=String(x.operating_status||x.status||'').trim();return s&&!["يعمل","شغال","متاح"].includes(s);});
      document.getElementById('todayStopped').textContent=stopped.length;
      const list=document.getElementById('todayStoppedList');
      if(stopped.length){list.innerHTML=`<strong>معدات تحتاج متابعة</strong><div>${stopped.map(x=>`<span>${esc(x.equipment_name||x.name||'معدة')} — ${esc(x.operating_status||x.status||'')}</span>`).join('')}</div>`;}
      else list.innerHTML='<span>لا توجد معدات متوقفة في تقرير اليوم.</span>';
    }catch(e){shell.dataset.state='error';console.error('Today dashboard failed',e);}
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(load,180));
  window.addEventListener('minya-notifications-updated',()=>{const shell=document.getElementById('todayOperationsSection');if(shell&&!shell.dataset.refreshed){shell.dataset.refreshed='1';setTimeout(load,80);}});
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

  function jerusalemParts() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { year: values.year, month: `${values.year}-${values.month}`, monthNumber: Number(values.month), day: Number(values.day) };
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
    const d = new Date(Date.UTC(year, month - 2, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
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
        <div class="executive-highlight"><span>أعلى شهر مكتمل</span><strong id="execBestMonth">-</strong><small id="execBestMonthValue">-</small></div>
        <div class="executive-highlight"><span>أقل شهر مكتمل</span><strong id="execLowMonth">-</strong><small id="execLowMonthValue">-</small></div>
        <div class="executive-highlight"><span>متوسط النفايات للشهور المكتملة</span><strong id="execYearAverage">0</strong><small>طن / شهر مكتمل مسجل</small></div>
      </div>

      <div class="executive-trend-panel">
        <div class="executive-trend-head">
          <div>
            <strong>اتجاه النفايات خلال السنة</strong>
            <p id="execTrendSummary">-</p>
          </div>
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
      const response = await fetch("/api/reports", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "فشل تحميل البيانات");

      const reports = Array.isArray(data.reports) ? data.reports : [];
      const currentPeriod = jerusalemParts();
      const year = String(currentPeriod.year);
      const month = currentPeriod.month;
      const prevMonth = previousMonth(month);
      const elapsedDay = currentPeriod.day;

      const byMonth = (value) => reports.filter((r) => String(r.report_date || "").startsWith(value));
      const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0);

      const currentReports = byMonth(month);
      const prevReports = byMonth(prevMonth).filter((r) => {
        const date = String(r.report_date || "");
        return Number(date.slice(8, 10)) <= elapsedDay;
      });

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
        el.textContent = `${result.text} مقارنة بـ ${monthLabel(prevMonth)} حتى اليوم ${elapsedDay}`;
        el.dataset.tone = result.tone;
      });

      const months = Array.from({ length: 12 }, (_, index) => {
        const monthValue = `${year}-${String(index + 1).padStart(2, "0")}`;
        const items = byMonth(monthValue);
        return {
          monthValue,
          monthNumber: index + 1,
          waste: sum(items, "total_waste_tons"),
          days: items.length,
          isCurrent: index + 1 === currentPeriod.monthNumber,
        };
      });

      const completedMonths = months.filter((item) => item.days > 0 && item.monthNumber < currentPeriod.monthNumber);
      if (completedMonths.length) {
        const best = completedMonths.reduce((a, b) => b.waste > a.waste ? b : a);
        const low = completedMonths.reduce((a, b) => b.waste < a.waste ? b : a);
        const average = completedMonths.reduce((s, item) => s + item.waste, 0) / completedMonths.length;

        document.getElementById("execBestMonth").textContent = monthLabel(best.monthValue);
        document.getElementById("execBestMonthValue").textContent = `${fmt(best.waste)} طن`;
        document.getElementById("execLowMonth").textContent = monthLabel(low.monthValue);
        document.getElementById("execLowMonthValue").textContent = `${fmt(low.waste)} طن`;
        document.getElementById("execYearAverage").textContent = fmt(average);
      } else {
        document.getElementById("execBestMonth").textContent = "لا يوجد شهر مكتمل";
        document.getElementById("execBestMonthValue").textContent = "-";
        document.getElementById("execLowMonth").textContent = "لا يوجد شهر مكتمل";
        document.getElementById("execLowMonthValue").textContent = "-";
        document.getElementById("execYearAverage").textContent = "0";
      }

      const trend = document.getElementById("execYearTrend");
      const trendYear = document.getElementById("execTrendYear");
      const trendSummary = document.getElementById("execTrendSummary");
      const recordedMonths = months.filter((item) => item.days > 0);
      const yearTotal = recordedMonths.reduce((total, item) => total + item.waste, 0);
      const currentRecorded = recordedMonths.find((item) => item.isCurrent);
      if (trendYear) trendYear.textContent = year;
      if (trendSummary) {
        const currentNote = currentRecorded ? ` · ${monthLabel(currentRecorded.monthValue)} جزئي حتى اليوم ${elapsedDay}` : "";
        trendSummary.textContent = `عدد الأشهر المسجلة ${recordedMonths.length} · الإجمالي ${fmt(yearTotal)} طن${currentNote}`;
      }
      if (trend) {
        if (!recordedMonths.length) {
          trend.classList.add("executive-trend-empty");
          trend.removeAttribute("style");
          trend.innerHTML = "لا توجد بيانات شهرية مسجلة لهذه السنة.";
          return;
        }
        trend.classList.remove("executive-trend-empty");
        const max = Math.max(...recordedMonths.map((item) => item.waste), 1);
        trend.style.gridTemplateColumns = `repeat(${recordedMonths.length}, minmax(104px, 1fr))`;
        trend.style.minWidth = `${Math.max(0, recordedMonths.length * 112)}px`;
        trend.innerHTML = recordedMonths.map((item) => {
          const height = Math.max(10, Math.round((item.waste / max) * 100));
          const partial = item.isCurrent ? ` · جزئي حتى اليوم ${elapsedDay}` : "";
          return `<div class="executive-trend-item${item.isCurrent ? " is-current" : ""}" title="${monthLabel(item.monthValue)} — ${fmt(item.waste)} طن${partial}">
            <strong class="executive-trend-value">${fmt(item.waste)} <small>طن</small></strong>
            <div class="executive-trend-column"><span style="height:${height}%"></span></div>
            <div class="executive-trend-label">
              <strong>${monthLabel(item.monthValue).replace(` ${year}`, "")}${item.isCurrent ? "*" : ""}</strong>
              <small>${fmt(item.days)} يوم مسجل</small>
            </div>
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
   روابط الإدارة والتشغيل في جميع الصفحات
========================================================= */

(function () {
  function isAdmin() {
    return window.MINYA_USER?.role === "admin" || document.documentElement.dataset.userRole === "admin";
  }

  function removeSystemAccess() {
    document.querySelectorAll('a[href="/system.html"]').forEach(link => link.remove());
  }

  function addLink(nav, href, label) {
    if (!nav || nav.querySelector(`a[href="${href}"]`)) return;
    const link = document.createElement("a");
    link.className = "app-nav-link";
    link.href = href;
    link.textContent = label;
    nav.appendChild(link);
  }

  function addSystemNavigation() {
    const nav = document.querySelector(".top-header nav");
    if (!nav) return;
    addLink(nav, "/ops-dashboard", "لوحة التشغيل");
    addLink(nav, "/fleet", "المركبات والسائقون");
    addLink(nav, "/maintenance-incidents", "الصيانة والحوادث");
    addLink(nav, "/environment", "العصارة والغطاء");
    addLink(nav, "/global-search", "بحث شامل");
    if (!isAdmin()) { removeSystemAccess(); return; }
    addLink(nav, "/system.html", "إدارة النظام");
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
   اعتماد تصميم النظام + صفحة الصيانة والحوادث
========================================================= */
(function () {
  function addDesignCredit() {
    if (document.getElementById("landfillDesignCredit")) return;
    const footer = document.createElement("footer");
    footer.id = "landfillDesignCredit";
    footer.className = "landfill-design-credit";
    footer.innerHTML = `<span>تصميم قسم المكب</span><strong>المهندس محمد جبرين</strong>`;
    document.body.appendChild(footer);
    if (!document.getElementById("landfillDesignCreditStyle")) {
      const style = document.createElement("style");
      style.id = "landfillDesignCreditStyle";
      style.textContent = `.landfill-design-credit{width:min(94%,1480px);margin:26px auto 18px;padding:14px 18px;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;color:#667085;border-top:1px solid #dfe6ee;font-size:12px;text-align:center}.landfill-design-credit span::after{content:" — ";color:#98a2b3}.landfill-design-credit strong{color:#176b4f;font-size:13px;font-weight:900}@media(max-width:560px){.landfill-design-credit{flex-direction:column;gap:3px;margin-top:20px}.landfill-design-credit span::after{content:""}}@media print{.landfill-design-credit{display:none!important}}`;
      document.head.appendChild(style);
    }
  }

  async function renderIncidentsPage() {
    const route = location.pathname.replace(/\/+$/, "") || "/";
    if (route !== "/maintenance-incidents") return;
    const main = document.querySelector("main.container");
    if (!main) return;
    const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const api = async (url, options) => { const r = await fetch(url, options); const d = await r.json().catch(() => ({})); if (!r.ok || d.ok === false) throw new Error(d.message || "فشل الطلب"); return d; };
    const initial = await api("/api/incidents").catch(() => ({ incidents: [], permission: {} }));
    const editable = Boolean(initial.permission?.can_edit);
    main.innerHTML = `<section class="v3-page"><div class="v3-hero"><div><span>MAINTENANCE & INCIDENTS</span><h2>الصيانة والحوادث</h2><p>متابعة الأعطال والحوادث والإجراءات والتكاليف والصور والمرفقات وحالة الإغلاق.</p></div></div><div id="incidentPage"><div id="incidentEditor" class="v3-panel"><h3>إضافة سجل</h3><div class="v3-form-grid"><label>التاريخ<input id="incDate" type="date"></label><label>المركبة أو المعدة<input id="incAsset"></label><label>النوع<select id="incType"><option>حادث</option><option>عطل</option><option>صيانة</option><option>إصلاح</option></select></label><label>الحالة<select id="incStatus"><option>مفتوحة</option><option>تحت المعالجة</option><option>مغلقة</option></select></label><label>مسؤول المتابعة<input id="incOwner"></label><label>التكلفة<input id="incCost" type="number" step="0.01"></label><label>صورة أو مرفق حتى 5MB<input id="incFile" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"></label></div><label>الوصف<textarea id="incDesc" rows="3"></textarea></label><label>الإجراء المتخذ<textarea id="incAction" rows="2"></textarea></label><button id="incSave" class="v3-primary">حفظ السجل</button><span id="incMsg"></span></div><div class="v3-panel"><div class="v3-filter"><input id="incSearch" placeholder="بحث"><select id="incFilter"><option value="">كل الحالات</option><option>مفتوحة</option><option>تحت المعالجة</option><option>مغلقة</option></select><button id="incLoad">تحديث</button></div><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>المركبة/المعدة</th><th>النوع</th><th>الحالة</th><th>الوصف</th><th>الإجراء</th><th>التكلفة</th><th>المرفقات</th></tr></thead><tbody id="incBody"></tbody></table></div><div id="incFilesPanel"></div></div></div></section>`;
    if (!editable) document.getElementById("incidentEditor").classList.add("hidden");
    const el = id => document.getElementById(id);
    el("incDate").value = new Date().toISOString().slice(0,10);
    function fileBase64(file) { return new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "").split(",")[1] || ""); reader.onerror = reject; reader.readAsDataURL(file); }); }
    async function showFiles(id) {
      try {
        const d = await api(`/api/incidents/${id}/files`);
        el("incFilesPanel").innerHTML = `<div class="v3-panel flat"><h4>مرفقات السجل</h4>${d.files.length ? d.files.map(f => `<a href="/api/incident-files/${f.id}" target="_blank" style="display:block;margin:6px 0">${esc(f.file_name)} (${Math.max(1,Math.round(Number(f.size_bytes||0)/1024))} KB)</a>`).join("") : "لا توجد مرفقات"}</div>`;
      } catch (e) { el("incFilesPanel").textContent = e.message; }
    }
    async function load() {
      const d = await api(`/api/incidents?q=${encodeURIComponent(el("incSearch").value)}&status=${encodeURIComponent(el("incFilter").value)}`);
      el("incBody").innerHTML = d.incidents.length ? d.incidents.map(x => `<tr><td>${esc(x.incident_date)}</td><td>${esc(x.asset_name)}</td><td>${esc(x.incident_type)}</td><td>${esc(x.followup_status)}</td><td>${esc(x.description)}</td><td>${esc(x.action_taken || "-")}</td><td>${Number(x.cost || 0).toLocaleString("en-US")}</td><td><button type="button" data-files="${x.id}">${Number(x.attachment_count||0)} مرفق</button></td></tr>`).join("") : `<tr><td colspan="8">لا توجد سجلات</td></tr>`;
      document.querySelectorAll("[data-files]").forEach(btn => btn.onclick = () => showFiles(btn.dataset.files));
    }
    el("incSave").onclick = async () => {
      try {
        const saved = await api("/api/incidents", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({asset_name:el("incAsset").value,incident_date:el("incDate").value,incident_type:el("incType").value,followup_status:el("incStatus").value,description:el("incDesc").value,action_taken:el("incAction").value,followup_owner:el("incOwner").value,cost:el("incCost").value}) });
        const file = el("incFile").files?.[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) throw new Error("المرفق أكبر من 5MB");
          await api(`/api/incidents/${saved.id}/files`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:file.name,mime_type:file.type||"application/octet-stream",data_base64:await fileBase64(file)}) });
        }
        el("incMsg").textContent = file ? "تم حفظ السجل والمرفق" : "تم حفظ السجل";
        el("incDesc").value = ""; el("incAction").value = ""; el("incFile").value = ""; load();
      } catch(e) { el("incMsg").textContent = e.message; }
    };
    el("incLoad").onclick = load;
    el("incSearch").onkeydown = e => { if (e.key === "Enter") load(); };
    load();
  }

  const run = () => { addDesignCredit(); renderIncidentsPage(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
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
    const items=[["/equipment","المعدات"],["/drivers-licenses.html","رخص السائقين"],["/weekly","الأسبوعي"],["/search","بحث متقدم"],["/managerial","تقرير إداري"],["/admin","الإدارة"]];
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

/* ===== js/app-driver-license-badge.js ===== */
(function(){
  function setVehiclesDriversScope(){
    const nav=document.querySelector('.top-header nav');
    const link=nav&&nav.querySelector('a[href="/drivers-licenses.html"]');
    if(link){
      const badge=link.querySelector('.driver-license-alert-badge');
      link.childNodes.forEach(node=>{if(node.nodeType===Node.TEXT_NODE)node.remove();});
      link.insertBefore(document.createTextNode('المركبات والسائقين'),badge||link.firstChild);
    }

    if(location.pathname==='/drivers-licenses.html'){
      document.title='المركبات والسائقين';
      const headerText=document.querySelector('.top-header > div > p');
      if(headerText)headerText.textContent='مركبات حركة المكب وسائقو المجلس';
      const mainTitle=document.querySelector('main.container .panel h2');
      if(mainTitle)mainTitle.textContent='رخص سائقي حركة المكب';
      const mainDesc=mainTitle&&mainTitle.parentElement&&mainTitle.parentElement.querySelector('p');
      if(mainDesc)mainDesc.textContent='سجل سائقي المجلس العاملين على مركبات حركة المكب ومتابعة رخصهم ومرفقاتها وتواريخ انتهائها.';
    }
  }

  function ensureBadge(count){
    setVehiclesDriversScope();
    const nav=document.querySelector('.top-header nav');
    if(!nav)return false;
    const link=nav.querySelector('a[href="/drivers-licenses.html"]');
    if(!link)return false;
    let badge=link.querySelector('.driver-license-alert-badge');
    if(!badge){
      badge=document.createElement('span');
      badge.className='driver-license-alert-badge';
      badge.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;margin-inline-start:6px;border-radius:999px;background:#c62828;color:#fff;font-size:12px;font-weight:800;line-height:1;vertical-align:middle;box-shadow:0 0 0 2px rgba(198,40,40,.12)';
      link.appendChild(badge);
    }
    badge.textContent=String(count);
    badge.title=`${count} رخصة متبقي على انتهائها 45 يومًا أو أقل`;
    badge.style.display=count>0?'inline-flex':'none';
    return true;
  }
  async function refresh(){
    setVehiclesDriversScope();
    try{
      const r=await fetch('/api/driver-licenses',{cache:'no-store'});
      if(!r.ok)return;
      const d=await r.json();
      const rows=Array.isArray(d.rows)?d.rows:[];
      const count=rows.filter(x=>Number.isFinite(Number(x.days_remaining))&&Number(x.days_remaining)>=0&&Number(x.days_remaining)<=45).length;
      let tries=0;
      const paint=()=>{if(ensureBadge(count)||tries++>20)return;setTimeout(paint,250);};
      paint();
    }catch(_){ }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();
  window.addEventListener('driver-licenses-updated',refresh);
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
   واجهة الصلاحيات حسب الدور والأقسام
========================================================= */
(function () {
  let role = null;
  let applying = false;
  let featurePermissions = null;

  async function resolveRole() {
    try {
      const response = await fetch("/api/auth/status", { cache: "no-store" });
      const data = await response.json();
      if (data?.authenticated && data.user?.role) {
        role = data.user.role;
        window.MINYA_USER = data.user;
      }
    } catch {}
    try {
      const response = await fetch("/api/feature-permissions/me", { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data?.ok) featurePermissions = data.permissions || null;
    } catch {}
    return role;
  }

  function hide(el) { if (!el) return; if (el.style.display !== "none") el.style.display = "none"; if (el.getAttribute("aria-hidden") !== "true") el.setAttribute("aria-hidden", "true"); }
  function disableEditorForm() {
    document.querySelectorAll("#reportFormSection input, #reportFormSection select, #reportFormSection textarea, #crewsTable input, #crewsTable select, #operationsTable input, #operationsTable select, #stationsTable input, #stationsTable select, #equipmentTable input, #equipmentTable select, #notes").forEach(el => { if (!el.disabled) el.disabled = true; el.title = "حساب قراءة فقط"; });
    hide(document.getElementById("saveBtn")?.closest("section") || document.getElementById("saveBtn"));
    hide(document.getElementById("attachmentsControls"));
  }
  function applyArchivePermissions() {
    document.querySelectorAll("button").forEach(button => { const text = String(button.textContent || "").trim(); const onclick = String(button.getAttribute("onclick") || ""); if (role === "viewer" && (text === "تعديل" || text === "حذف" || /editReport|deleteReport/.test(onclick))) hide(button); if (role === "editor" && (text === "حذف" || /deleteReport/.test(onclick))) hide(button); });
  }
  function applyNavigationPermissions() {
    const adminOnlyHrefs = ["/admin","/admin.html","/system.html","/drive-import.html","/reviews"];
    adminOnlyHrefs.forEach(href => document.querySelectorAll(`a[href="${href}"]`).forEach(link => { if (role !== "admin") hide(link); }));
    if (role === "viewer") document.querySelectorAll('a[href="/report"]').forEach(hide);
    const featureLinks = { fleet:"/fleet", incidents:"/maintenance-incidents", environment:"/environment", global_search:"/global-search" };
    if (featurePermissions) Object.entries(featureLinks).forEach(([feature,href]) => { if (!featurePermissions[feature]?.can_view) document.querySelectorAll(`a[href="${href}"]`).forEach(hide); });
  }
  function applyV3Permissions() {
    if (role === "viewer") { hide(document.getElementById("maintSave")); document.querySelectorAll("#v3Content input, #v3Content textarea, #v3Content select").forEach(el => { if (!el.closest(".v3-filter") && !el.closest(".v3-search-grid")) el.disabled = true; }); }
    if (role !== "admin") document.querySelectorAll("[data-admin-only], .admin-only").forEach(hide);
  }
  function apply() { if (!role || applying) return; applying = true; try { document.documentElement.dataset.userRole = role; applyNavigationPermissions(); applyArchivePermissions(); applyV3Permissions(); if (role === "viewer") disableEditorForm(); } finally { applying = false; } }

  async function buildFeaturePermissionManager() {
    if (role !== "admin" || (location.pathname.replace(/\/+$/, "") || "/") !== "/admin") return;
    if (document.getElementById("featurePermissionManager")) return;
    const host = document.getElementById("v3Content"); if (!host) return;
    try {
      const response = await fetch("/api/feature-permissions", { cache:"no-store" });
      const data = await response.json(); if (!response.ok || !data.ok) return;
      const labels = { fleet:"المركبات والسائقون", incidents:"الصيانة والحوادث", environment:"العصارة والغطاء", global_search:"البحث الشامل", backups:"النسخ الاحتياطي" };
      const section = document.createElement("section"); section.id = "featurePermissionManager"; section.className = "v3-panel";
      section.innerHTML = `<h3>صلاحيات الأقسام</h3><p>تحديد من يستطيع مشاهدة أو تعديل كل قسم. صلاحيات المدير كاملة دائمًا.</p><label>المستخدم<select id="featurePermissionUser"><option value="">اختر مستخدمًا</option>${data.users.filter(u=>u.role!=="admin").map(u=>`<option value="${u.id}">${u.display_name} (${u.username})</option>`).join("")}</select></label><div id="featurePermissionRows"></div><button id="featurePermissionSave" class="v3-primary" type="button">حفظ الصلاحيات</button><span id="featurePermissionMsg"></span>`;
      host.appendChild(section);
      const select = section.querySelector("#featurePermissionUser"), rows = section.querySelector("#featurePermissionRows"), msg = section.querySelector("#featurePermissionMsg");
      function renderRows() {
        const uid = Number(select.value); if (!uid) { rows.innerHTML = ""; return; }
        const user = data.users.find(u=>Number(u.id)===uid); rows.innerHTML = data.features.map(feature => { const saved = data.rows.find(r=>Number(r.user_id)===uid && r.feature===feature); const view = saved ? Number(saved.can_view)===1 : true; const edit = saved ? Number(saved.can_edit)===1 : user?.role === "editor"; return `<div class="feature-permission-row" data-feature="${feature}" style="display:grid;grid-template-columns:minmax(160px,1fr) auto auto;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid #e5e7eb"><strong>${labels[feature]||feature}</strong><label><input type="checkbox" data-view ${view?'checked':''}> مشاهدة</label><label><input type="checkbox" data-edit ${edit?'checked':''}> تعديل</label></div>`; }).join("");
      }
      select.onchange = renderRows;
      section.querySelector("#featurePermissionSave").onclick = async () => { const uid = Number(select.value); if (!uid) { msg.textContent = "اختر مستخدمًا"; return; } const permissions = [...rows.querySelectorAll("[data-feature]")].map(r=>({feature:r.dataset.feature,can_view:r.querySelector("[data-view]").checked,can_edit:r.querySelector("[data-edit]").checked})); const res = await fetch(`/api/feature-permissions/${uid}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({permissions}) }); const out = await res.json().catch(()=>({})); msg.textContent = res.ok ? "تم حفظ الصلاحيات" : (out.message || "تعذر الحفظ"); };
    } catch {}
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await resolveRole();
    if (role === "viewer" && (location.pathname.replace(/\/+$/, "") || "/") === "/report") { location.replace("/archive"); return; }
    apply(); setTimeout(buildFeaturePermissionManager, 300);
    let scheduled = false;
    const observer = new MutationObserver(() => { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; apply(); }); });
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
    const response = await fetch("/api/audit?limit=5");
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
      <div id="auditFilterStatus" class="audit-filter-status">جاري تحميل آخر 5 عملية...</div>
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
      filterStatus.textContent = `عرض ${filtered.length} من أصل ${logs.length} عملية محفوظة ضمن آخر 5 سجل.`;

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
      const [d,auditData]=await Promise.all([
        api('/api/security/sessions'),
        api('/api/audit?limit=1000').catch(()=>({logs:[]}))
      ]);
      const users=d.users||[], sessions=d.sessions||[], logs=auditData.logs||[];
      const failedLogs=logs.filter(x=>x.action==='LOGIN_FAILED');
      const failedByUser=new Map();
      failedLogs.forEach(log=>{
        const key=String(log.entity_id||'').trim().toLowerCase();
        if(key&&!failedByUser.has(key)) failedByUser.set(key,log.created_at||null);
      });
      users.forEach(u=>{
        const keys=[u.username,u.email].map(v=>String(v||'').trim().toLowerCase()).filter(Boolean);
        u.last_failed_login=keys.map(k=>failedByUser.get(k)).filter(Boolean).sort().slice(-1)[0]||null;
      });
      sessionsCount.textContent=sessions.length;
      usersCount.textContent=users.filter(x=>x.is_active).length;
      const last=users.map(x=>x.last_success_login).filter(Boolean).sort().slice(-1)[0];
      const failed=failedLogs.map(x=>x.created_at).filter(Boolean).sort().slice(-1)[0];
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
  const cleanMobile=v=>{let mobile=String(v||'').trim().replace(/[\s().-]/g,'');if(mobile.startsWith('00'))mobile=`+${mobile.slice(2)}`;return mobile;};
  const mobileOk=v=>!v||/^\+?\d{8,15}$/.test(cleanMobile(v));
  let currentUser=null;
  let managedUsers=[];
  async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;}
  function build(){
    if(document.getElementById('fullUserManagement')) return;
    const content=document.getElementById('v3Content'); if(!content)return;
    const section=document.createElement('section');
    section.id='fullUserManagement'; section.className='v3-panel user-management-panel';
    section.innerHTML=`
      <div class="user-management-head"><div><span>USERS</span><h3>إدارة المستخدمين</h3><p>إنشاء المستخدمين، إدارة البريد والجوال والصلاحيات، وإرسال رسائل SMS من الهاتف.</p></div><div class="user-management-actions"><button id="addUserBtn" class="v3-primary" type="button">إضافة مستخدم</button><button id="usersManageRefresh" type="button">تحديث</button></div></div>
      <div id="usersManageMsg" class="users-manage-msg"></div>
      <div id="userCreateDialog" class="user-edit-card hidden">
        <div class="user-edit-head"><div><span>مستخدم جديد</span><strong>إنشاء حساب جديد</strong></div><button id="closeUserCreate" type="button">إغلاق</button></div>
        <div class="user-edit-grid">
          <label>اسم المستخدم<input id="createUsername" type="text" autocomplete="off" placeholder="مثال: testadmin"></label>
          <label>البريد الإلكتروني<input id="createEmail" type="email" autocomplete="off" placeholder="name@example.com" dir="ltr"></label>
          <label>رقم الجوال<input id="createMobile" type="tel" autocomplete="tel" inputmode="tel" placeholder="0590000000 أو +970590000000" dir="ltr"></label>
          <label>الاسم الظاهر<input id="createDisplayName" type="text" autocomplete="off" placeholder="مثال: حساب اختبار"></label>
          <label>الصلاحية<select id="createRole"><option value="viewer">قراءة فقط</option><option value="editor">محرر</option><option value="admin">مدير</option></select></label>
          <label>كلمة المرور<input id="createPassword" type="password" autocomplete="new-password" placeholder="8 أحرف على الأقل"></label>
        </div>
        <small>البريد الإلكتروني اختياري، وإذا تمت إضافته يمكن استخدامه لتسجيل الدخول بدل اسم المستخدم.</small>
        <div class="user-edit-actions"><button id="saveNewUser" class="v3-primary" type="button">إنشاء المستخدم</button></div>
      </div>
      <div class="v3-table-wrap"><table class="v3-table users-manage-table"><thead><tr><th>المستخدم</th><th>البريد الإلكتروني</th><th>الجوال</th><th>الصلاحية</th><th>الحالة</th><th>الجلسات</th><th>آخر دخول</th><th>إجراءات</th></tr></thead><tbody id="usersManageBody"><tr><td colspan="8">جاري التحميل...</td></tr></tbody></table></div>
      <div id="userEditDialog" class="user-edit-card hidden">
        <div class="user-edit-head"><div><span>تعديل المستخدم</span><strong id="editUserTitle">-</strong></div><button id="closeUserEdit" type="button">إغلاق</button></div>
        <input id="editUserId" type="hidden">
        <div class="user-edit-grid">
          <label>الاسم الظاهر<input id="editDisplayName" type="text"></label>
          <label>البريد الإلكتروني<input id="editEmail" type="email" placeholder="name@example.com" dir="ltr"></label>
          <label>رقم الجوال<input id="editMobile" type="tel" autocomplete="tel" inputmode="tel" placeholder="0590000000 أو +970590000000" dir="ltr"></label>
          <label>الصلاحية<select id="editRole"><option value="viewer">قراءة فقط</option><option value="editor">محرر</option><option value="admin">مدير</option></select></label>
          <label>الحالة<select id="editActive"><option value="1">نشط</option><option value="0">موقوف</option></select></label>
          <label>كلمة مرور جديدة<input id="editPassword" type="password" placeholder="اتركها فارغة دون تغيير"></label>
        </div>
        <small>عند تغيير كلمة المرور سيتم إنهاء جميع جلسات هذا المستخدم تلقائيًا.</small>
        <div class="user-edit-actions"><button id="saveUserEdit" class="v3-primary" type="button">حفظ التعديلات</button><button id="logoutUserEverywhere" type="button">تسجيل خروج من جميع الأجهزة</button></div>
      </div>
      <div class="sms-compose-card">
        <div class="sms-compose-head"><div><span>SMS</span><h3>إرسال رسالة جوال</h3><p>يفتح تطبيق الرسائل بالرقم والنص، ثم ترسل الرسالة من هاتفك.</p></div></div>
        <div class="sms-compose-grid">
          <label>المستلم<select id="smsRecipient"><option value="">اختر مستخدمًا</option></select></label>
          <label>نص جاهز<select id="smsTemplate"><option value="">رسالة مخصصة</option><option value="pending">تقرير بانتظار المراجعة</option><option value="approved">تم اعتماد التقرير</option><option value="returned">إعادة التقرير للتعديل</option></select></label>
        </div>
        <label class="sms-message-label">نص الرسالة<textarea id="smsMessage" rows="4" maxlength="500" placeholder="اكتب نص الرسالة"></textarea></label>
        <div class="sms-compose-actions"><small><span id="smsCharCount">0</span> من 500 حرف</small><button id="openSmsApp" class="v3-primary" type="button">فتح تطبيق الرسائل</button></div>
        <div id="smsComposeMsg" class="users-manage-msg"></div>
      </div>`;
    const first=content.querySelector('.v3-admin-grid');
    if(first) content.insertBefore(section,first); else content.prepend(section);
  }
  function refs(){
    return {
      id:document.getElementById('editUserId'), title:document.getElementById('editUserTitle'), display:document.getElementById('editDisplayName'), email:document.getElementById('editEmail'), mobile:document.getElementById('editMobile'),
      role:document.getElementById('editRole'), active:document.getElementById('editActive'), password:document.getElementById('editPassword'),
      dialog:document.getElementById('userEditDialog'), logout:document.getElementById('logoutUserEverywhere'),
      msg:document.getElementById('usersManageMsg'), save:document.getElementById('saveUserEdit')
    };
  }
  function createRefs(){
    return {
      username:document.getElementById('createUsername'), email:document.getElementById('createEmail'), mobile:document.getElementById('createMobile'), display:document.getElementById('createDisplayName'), role:document.getElementById('createRole'),
      password:document.getElementById('createPassword'), dialog:document.getElementById('userCreateDialog'), save:document.getElementById('saveNewUser'), msg:document.getElementById('usersManageMsg')
    };
  }
  function openCreate(){
    const e=createRefs(); if(!e.username||!e.email||!e.mobile||!e.display||!e.role||!e.password||!e.dialog||!e.msg)return;
    e.username.value=''; e.email.value=''; e.mobile.value=''; e.display.value=''; e.role.value='viewer'; e.password.value=''; e.msg.textContent='';
    document.getElementById('userEditDialog')?.classList.add('hidden');
    e.dialog.classList.remove('hidden');
    e.username.focus();
  }
  function openEdit(user){
    if(!user)return;
    const e=refs(); if(!e.id||!e.title||!e.display||!e.email||!e.mobile||!e.role||!e.active||!e.password||!e.dialog||!e.logout||!e.msg)return;
    document.getElementById('userCreateDialog')?.classList.add('hidden');
    e.id.value=user.id; e.title.textContent=`${user.display_name} (${user.username})`;
    e.display.value=user.display_name||''; e.email.value=user.email||''; e.mobile.value=user.mobile||''; e.role.value=user.role; e.active.value=String(Number(Boolean(user.is_active))); e.password.value='';
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
      currentUser=me.user; const users=sec.users||[]; managedUsers=users;
      body.innerHTML=users.length?users.map(u=>`<tr data-user="${u.id}"><td><strong>${esc(u.display_name)}</strong><small>${esc(u.username)}${Number(u.id)===Number(currentUser.id)?' · حسابك':''}</small></td><td><span dir="ltr">${u.email?esc(u.email):'<span class="user-email-empty">—</span>'}</span></td><td><span dir="ltr">${u.mobile?esc(u.mobile):'—'}</span></td><td><span class="user-role role-${esc(u.role)}">${esc(roleLabel[u.role]||u.role)}</span></td><td><span class="user-state ${u.is_active?'active':'inactive'}">${u.is_active?'نشط':'موقوف'}</span></td><td>${Number(u.active_sessions||0)}</td><td>${dt(u.last_success_login)}</td><td><button class="manage-user-btn" type="button" data-user="${u.id}">إدارة</button><button class="sms-user-btn" type="button" data-user="${u.id}" ${u.mobile?'':'disabled'}>SMS</button></td></tr>`).join(''):`<tr><td colspan="8">لا توجد حسابات</td></tr>`;
      document.querySelectorAll('.manage-user-btn').forEach(btn=>btn.onclick=()=>openEdit(users.find(u=>String(u.id)===btn.dataset.user)));
      document.querySelectorAll('.sms-user-btn').forEach(btn=>btn.onclick=()=>selectSmsUser(users.find(u=>String(u.id)===btn.dataset.user)));
      fillSmsRecipients(users);
    }catch(err){body.innerHTML=`<tr><td colspan="8">${esc(err.message)}</td></tr>`;}
  }
  async function createUser(){
    const e=createRefs(); if(!e.username||!e.email||!e.mobile||!e.display||!e.role||!e.password||!e.dialog||!e.save||!e.msg)return;
    const username=e.username.value.trim(); const email=e.email.value.trim().toLowerCase(); const mobile=e.mobile.value.trim(); const display_name=e.display.value.trim(); const password=e.password.value; const role=e.role.value;
    if(!username){e.msg.textContent='اسم المستخدم مطلوب.';return;}
    if(email&&!emailOk(email)){e.msg.textContent='البريد الإلكتروني غير صالح.';return;}
    if(mobile&&!mobileOk(mobile)){e.msg.textContent='رقم الجوال غير صالح.';return;}
    if(password.length<8){e.msg.textContent='كلمة المرور يجب أن تكون 8 أحرف على الأقل.';return;}
    if(role==='admin'&&!confirm('سيتم إنشاء مستخدم بصلاحية مدير كاملة. هل تريد المتابعة؟'))return;
    e.save.disabled=true; e.msg.textContent='جاري إنشاء المستخدم...';
    try{
      await api('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,email,mobile,display_name:display_name||username,password,role})});
      e.msg.textContent='تم إنشاء المستخدم بنجاح'; e.dialog.classList.add('hidden'); await load();
    }catch(err){e.msg.textContent=err.message;}finally{e.save.disabled=false;}
  }
  async function save(){
    const e=refs(); if(!e.id||!e.display||!e.email||!e.mobile||!e.role||!e.active||!e.password||!e.msg||!e.save||!e.dialog)return;
    const id=Number(e.id.value); if(!id)return;
    const email=e.email.value.trim().toLowerCase();
    const mobile=e.mobile.value.trim();
    if(email&&!emailOk(email)){e.msg.textContent='البريد الإلكتروني غير صالح.';return;}
    if(mobile&&!mobileOk(mobile)){e.msg.textContent='رقم الجوال غير صالح.';return;}
    const payload={display_name:e.display.value.trim(),email,mobile,role:e.role.value,is_active:Number(e.active.value)};
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
  function fillSmsRecipients(users=managedUsers){
    const select=document.getElementById('smsRecipient'); if(!select)return;
    const selected=select.value;
    select.innerHTML='<option value="">اختر مستخدمًا</option>'+users.filter(user=>user.mobile).map(user=>`<option value="${user.id}">${esc(user.display_name)} — ${esc(user.mobile)}</option>`).join('');
    if(Array.from(select.options).some(option=>option.value===selected))select.value=selected;
  }
  function selectSmsUser(user){
    if(!user?.mobile)return;
    const select=document.getElementById('smsRecipient');
    const message=document.getElementById('smsMessage');
    const status=document.getElementById('smsComposeMsg');
    if(select)select.value=String(user.id);
    if(message&&!message.value)message.value=`مرحبًا ${user.display_name}، `;
    if(status)status.textContent=`المستلم: ${user.display_name} — ${user.mobile}`;
    updateSmsCount();
    document.querySelector('.sms-compose-card')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    message?.focus();
  }
  function updateSmsCount(){
    const message=document.getElementById('smsMessage');
    const count=document.getElementById('smsCharCount');
    if(message&&count)count.textContent=String(message.value.length);
  }
  function applySmsTemplate(){
    const type=document.getElementById('smsTemplate')?.value;
    const message=document.getElementById('smsMessage'); if(!message||!type)return;
    const templates={
      pending:'يوجد تقرير بانتظار المراجعة. يرجى الدخول إلى نظام إدارة مكب المنيا.',
      approved:'تم اعتماد التقرير في نظام إدارة مكب المنيا.',
      returned:'تمت إعادة التقرير للتعديل. يرجى الدخول إلى نظام إدارة مكب المنيا ومراجعة البيانات.'
    };
    message.value=templates[type]||''; updateSmsCount(); message.focus();
  }
  function openSmsApp(){
    const recipientId=document.getElementById('smsRecipient')?.value;
    const message=document.getElementById('smsMessage')?.value.trim()||'';
    const status=document.getElementById('smsComposeMsg');
    const user=managedUsers.find(item=>String(item.id)===String(recipientId));
    if(!user?.mobile){if(status)status.textContent='اختر مستخدمًا لديه رقم جوال.';return;}
    if(!message){if(status)status.textContent='اكتب نص الرسالة.';return;}
    const mobile=cleanMobile(user.mobile);
    if(!mobileOk(mobile)){if(status)status.textContent='رقم الجوال غير صالح.';return;}
    if(status)status.textContent='تم فتح تطبيق الرسائل. اضغط إرسال من هاتفك.';
    location.href=`sms:${mobile}?body=${encodeURIComponent(message)}`;
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
      document.getElementById('smsTemplate')?.addEventListener('change',applySmsTemplate);
      document.getElementById('smsMessage')?.addEventListener('input',updateSmsCount);
      document.getElementById('openSmsApp')?.addEventListener('click',openSmsApp);
    },320);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

;

/* ===== js/app-admin-whatsapp.js ===== */
(function(){
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/admin') return;

  const clean=v=>String(v||'').trim().replace(/[\s().-]/g,'');
  function whatsappNumber(v){
    let n=clean(v);
    if(n.startsWith('00'))n=n.slice(2);
    if(n.startsWith('+'))n=n.slice(1);
    if(n.startsWith('0'))n=`970${n.slice(1)}`;
    return /^\d{8,15}$/.test(n)?n:'';
  }
  function rowMobile(userId){
    const row=document.querySelector(`#usersManageBody tr[data-user="${CSS.escape(String(userId||''))}"]`);
    return clean(row?.querySelector('td:nth-child(3)')?.textContent||'');
  }
  function selectUser(userId){
    const smsBtn=document.querySelector(`.sms-user-btn[data-user="${CSS.escape(String(userId||''))}"]`);
    if(smsBtn&&!smsBtn.disabled)smsBtn.click();
    const select=document.getElementById('smsRecipient');
    if(select)select.value=String(userId||'');
    document.querySelector('.sms-compose-card')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    const status=document.getElementById('smsComposeMsg');
    if(status)status.textContent='تم اختيار المستخدم. اكتب الرسالة أو اختر نصًا جاهزًا ثم اضغط فتح واتساب.';
  }
  function openWhatsApp(){
    const select=document.getElementById('smsRecipient');
    const message=document.getElementById('smsMessage');
    const status=document.getElementById('smsComposeMsg');
    const id=select?.value||'';
    const number=whatsappNumber(rowMobile(id));
    const text=String(message?.value||'').trim();
    if(!id){if(status)status.textContent='اختر مستخدمًا أولًا.';return;}
    if(!number){if(status)status.textContent='رقم الجوال غير صالح لواتساب.';return;}
    if(!text){if(status)status.textContent='اكتب نص الرسالة أولًا.';return;}
    const url=`https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    window.open(url,'_blank','noopener,noreferrer');
    if(status)status.textContent='تم فتح واتساب بالرقم والنص. راجع الرسالة ثم اضغط إرسال من واتساب.';
  }
  function enhanceComposer(){
    const card=document.querySelector('.sms-compose-card');
    if(!card)return;
    const head=card.querySelector('.sms-compose-head');
    const tag=head?.querySelector('span');
    const title=head?.querySelector('h3');
    const desc=head?.querySelector('p');
    if(tag&&tag.textContent!=='SMS / WHATSAPP')tag.textContent='SMS / WHATSAPP';
    if(title&&title.textContent!=='إرسال رسالة جوال أو واتساب')title.textContent='إرسال رسالة جوال أو واتساب';
    if(desc&&desc.textContent!=='استخدم نفس المستلم والنص الجاهز، ثم افتح تطبيق الرسائل أو واتساب من هاتفك.')desc.textContent='استخدم نفس المستلم والنص الجاهز، ثم افتح تطبيق الرسائل أو واتساب من هاتفك.';
    const actions=card.querySelector('.sms-compose-actions');
    const sms=document.getElementById('openSmsApp');
    if(actions&&sms&&!document.getElementById('openWhatsAppApp')){
      const btn=document.createElement('button');
      btn.id='openWhatsAppApp';
      btn.type='button';
      btn.className='v3-primary';
      btn.textContent='فتح واتساب';
      btn.addEventListener('click',openWhatsApp);
      actions.appendChild(btn);
    }
  }
  function enhanceRows(){
    document.querySelectorAll('#usersManageBody tr[data-user]').forEach(row=>{
      if(row.querySelector('.whatsapp-user-btn'))return;
      const sms=row.querySelector('.sms-user-btn');
      if(!sms)return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='whatsapp-user-btn';
      btn.dataset.user=sms.dataset.user||row.dataset.user||'';
      btn.textContent='واتساب';
      btn.disabled=sms.disabled;
      btn.addEventListener('click',()=>selectUser(btn.dataset.user));
      sms.insertAdjacentElement('afterend',btn);
    });
  }
  function enhance(){enhanceComposer();enhanceRows();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
  const observer=new MutationObserver(enhance);
  observer.observe(document.documentElement,{childList:true,subtree:true});
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
    panel.innerHTML=`<div class="excel-import-head"><div><span>DRIVE & EXCEL IMPORT</span><h3>الاستيراد الموحد مع المعاينة</h3><p>ارفع Excel أو اختر ملفًا من Google Drive في صفحة واحدة، مع جودة القراءة والتطابق والاختلافات والتحديد قبل الاعتماد.</p></div></div><div class="excel-import-actions"><a class="v3-primary" href="/drive-import.html">فتح صفحة الاستيراد والمعاينة</a></div>`;
    c.prepend(panel);
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
    const locked = status !== "draft" && window.MINYA_USER?.role !== "admin";
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
    } else if (window.MINYA_USER?.role === "admin") {
      main.querySelectorAll("#reportAttachmentsPanel button[data-delete], #reportAttachmentsPanel .attachment-delete").forEach((element) => setControlLocked(element, false));
    }

    let notice = document.getElementById("workflowReadOnlyNotice");
    if (locked && !notice) {
      notice = document.createElement("div");
      notice.id = "workflowReadOnlyNotice";
      notice.className = "workflow-readonly-notice no-print";
      notice.textContent = "التقرير للقراءة فقط. المدير يستطيع تعديل التقرير كاملًا مباشرة، أما المحرر فيلزم إعادة فتحه كمسودة.";
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
    panel.dataset.workflowStatus = status;
    const canSubmit = status === "draft" && (role === "admin" || role === "editor"); const canApprove = status === "pending" && role === "admin"; const canReopen = status !== "draft" && role === "admin";
    let detail = "التقرير قابل للتعديل والحفظ.";
    if (status === "pending") detail = role === "admin" ? "التقرير مرسل للمراجعة، والمدير يستطيع تعديل كامل التقرير مباشرة ثم حفظه مع اعتماده." : "التقرير مقفل حاليًا بانتظار مراجعة المدير واعتماده.";
    if (status === "approved") detail = `تم اعتماد التقرير${report.approved_by_name ? ` بواسطة ${escapeHtml(report.approved_by_name)}` : ""}${report.approved_at ? ` بتاريخ ${formatDateTime(report.approved_at)}` : ""}.${role === "admin" ? " المدير يستطيع تعديل كامل التقرير مباشرة مع بقاءه معتمدًا بعد الحفظ." : ""}`;

    panel.innerHTML = `<div class="workflow-summary"><div><span class="workflow-kicker">حالة التقرير</span><div class="workflow-status-line"><strong>${escapeHtml(report.report_no || "تقرير محفوظ")}</strong><span class="workflow-badge ${info.className}">${info.label}</span></div><small>${detail}</small></div><div class="workflow-actions">${canSubmit ? `<button type="button" data-workflow-action="submit" class="workflow-primary">إرسال للمراجعة</button>` : ""}${canApprove ? `<button type="button" data-workflow-action="approve" class="workflow-approve">اعتماد التقرير</button>` : ""}${canReopen ? `<button type="button" data-workflow-action="reopen" class="workflow-secondary">إعادة فتح كمسودة</button>` : ""}</div></div><div class="workflow-steps"><div class="${status === "draft" ? "active" : "done"}"><i>1</i><span>مسودة</span></div><b></b><div class="${status === "pending" ? "active" : status === "approved" ? "done" : ""}"><i>2</i><span>مراجعة</span></div><b></b><div class="${status === "approved" ? "active done" : ""}"><i>3</i><span>معتمد</span></div></div>`;
    panel.querySelectorAll("[data-workflow-action]").forEach((button) => button.addEventListener("click", () => runWorkflowAction(button.dataset.workflowAction, report)));
    applyReportLock(status);
  }

  async function runWorkflowAction(action, report) {
    const messages = { submit: "إرسال التقرير للمراجعة؟ بعد الإرسال سيتوقف التعديل للمحرر حتى يعيد المدير فتحه.", approve: "اعتماد هذا التقرير؟ سيبقى المدير قادرًا على تعديل كامل التقرير بعد الاعتماد.", reopen: "إعادة فتح التقرير كمسودة؟ سيتم إلغاء حالة المراجعة/الاعتماد الحالية." };
    if (!confirm(messages[action] || "متابعة؟")) return;
    try {
      const data = await api(`/api/reports/${report.id}/${action}`, { method: "POST" });
      if (typeof showMessage === "function") showMessage(data.message || "تم تحديث حالة التقرير");
      setTimeout(() => location.reload(), 250);
    } catch (error) { if (typeof showMessage === "function") showMessage(error.message); else alert(error.message); }
  }

  async function refreshReportWorkflow(force = false) {
    if (pathName !== "/report") return; const id = getCurrentReportId(); if (!id) return;
    const existingPanel = document.getElementById("reportWorkflowPanel");
    if (!force && workflowReportId === id && existingPanel) {
      applyReportLock(existingPanel.dataset.workflowStatus || "draft");
      return;
    }
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

/* ===== js/app-returned-report-notice.js ===== */
/* Returned report notice + editor home alerts. */
(function(){
  const pathName=location.pathname.replace(/\/+$/,'')||'/';

  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const fmtDate=value=>{
    if(!value) return '';
    try{return new Date(value).toLocaleString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}catch{return String(value);}
  };
  const reportId=()=>Number(new URLSearchParams(location.search).get('edit')||0);

  async function waitForUser(){
    for(let i=0;i<40&&!window.MINYA_USER;i+=1) await new Promise(resolve=>setTimeout(resolve,50));
    return window.MINYA_USER||null;
  }

  async function api(url){
    const response=await fetch(url);
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false) throw new Error(data.message||'فشل تحميل البيانات');
    return data;
  }

  function renderReportNotice(report){
    document.getElementById('returnedReportNotice')?.remove();
    if(!report||String(report.workflow_status||'draft')!=='draft'||!report.returned_at) return;
    const role=window.MINYA_USER?.role||'viewer';
    if(role!=='editor'&&role!=='admin') return;

    const card=document.createElement('section');
    card.id='returnedReportNotice';
    card.className='no-print';
    card.style.cssText='margin:12px 0;padding:14px 16px;border:1px solid #f0b44d;border-radius:10px;background:#fff8e8;color:#5b3a00;line-height:1.7;';
    const reason=String(report.returned_reason||'').trim();
    card.innerHTML=`<strong style="display:block;margin-bottom:4px;font-size:16px">أُعيد التقرير للتعديل</strong><div>${reason?`<b>السبب:</b> ${esc(reason)}`:'لم يتم تسجيل سبب محدد للإعادة.'}</div><small style="display:block;margin-top:4px">تاريخ الإعادة: ${esc(fmtDate(report.returned_at))}</small>`;
    const workflow=document.getElementById('reportWorkflowPanel');
    if(workflow) workflow.after(card); else document.querySelector('main.container')?.prepend(card);
  }

  async function loadReportNotice(){
    const id=reportId(); if(!id) return;
    try{const data=await api(`/api/reports/${id}`); renderReportNotice(data.report||data);}catch(error){console.error('Returned report notice failed',error);}
  }

  function renderHomeCard(reports){
    document.getElementById('returnedReportsHomeCard')?.remove();
    if(!reports.length) return;
    const main=document.querySelector('main.container');
    if(!main) return;

    const card=document.createElement('section');
    card.id='returnedReportsHomeCard';
    card.className='no-print';
    card.style.cssText='margin:16px 0;padding:16px;border:1px solid #f0b44d;border-radius:12px;background:#fff8e8;color:#5b3a00;';
    const items=reports.slice(0,6).map(report=>{
      const reason=String(report.returned_reason||'').trim();
      return `<a href="/report?edit=${Number(report.id)}" style="display:block;margin-top:9px;padding:10px 12px;border:1px solid #efd49a;border-radius:8px;background:#fff;text-decoration:none;color:#5b3a00"><strong>${esc(report.report_no||report.report_date||'تقرير')}</strong><span style="display:block;margin-top:3px;font-size:13px">${esc(report.report_date||'')}${reason?` · ${esc(reason)}`:''}</span></a>`;
    }).join('');
    card.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><strong style="font-size:17px">تقارير أُعيدت للتعديل</strong><div style="margin-top:3px;font-size:14px">لديك ${reports.length} تقرير يحتاج مراجعتك.</div></div><span style="display:inline-flex;min-width:36px;height:36px;align-items:center;justify-content:center;border-radius:999px;background:#9a6700;color:#fff;font-weight:700">${reports.length}</span></div>${items}${reports.length>6?`<small style="display:block;margin-top:8px">يوجد ${reports.length-6} تقرير إضافي في الأرشيف.</small>`:''}`;

    const firstPanel=main.querySelector('section.panel, .dashboard-grid, .home-dashboard-grid, [data-dashboard-grid]');
    if(firstPanel) main.insertBefore(card,firstPanel); else main.prepend(card);
  }

  async function loadHomeReturnedReports(){
    const user=await waitForUser();
    if(pathName!=='/'||user?.role!=='editor') return;
    try{
      const data=await api('/api/reports');
      const reports=Array.isArray(data.reports)?data.reports:[];
      const mine=reports.filter(report=>String(report.workflow_status||'draft')==='draft'&&report.returned_at&&Number(report.returned_to||0)===Number(user.id||0)).sort((a,b)=>String(b.returned_at||'').localeCompare(String(a.returned_at||'')));
      renderHomeCard(mine);
    }catch(error){console.error('Returned reports home card failed',error);}
  }

  function init(){
    if(pathName==='/report'){setTimeout(loadReportNotice,350);setTimeout(loadReportNotice,1000);}
    if(pathName==='/'){setTimeout(loadHomeReturnedReports,500);setTimeout(loadHomeReturnedReports,1400);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
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

;

/* ===== js/app-admin-workflow-summary.js ===== */
/* Admin workflow summary strip for dashboard. */
(function(){
  const pathName=location.pathname.replace(/\/+$/,'')||'/';
  if(pathName!=='/') return;

  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  async function waitForAdmin(){
    for(let i=0;i<40&&!window.MINYA_USER;i+=1) await new Promise(resolve=>setTimeout(resolve,50));
    return window.MINYA_USER?.role==='admin';
  }

  async function api(url){
    const response=await fetch(url);
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false) throw new Error(data.message||'فشل تحميل الملخص');
    return data;
  }

  function ageHours(report){
    const time=new Date(report?.submitted_at||0).getTime();
    return Number.isFinite(time)&&time>0?Math.max(0,(Date.now()-time)/3600000):0;
  }

  function isToday(value){
    if(!value) return false;
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return false;
    const now=new Date();
    return date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth()&&date.getDate()===now.getDate();
  }

  function metric(label,value,detail,href,tone){
    return `<a href="${href}" style="display:block;text-decoration:none;color:inherit;padding:13px 14px;border:1px solid rgba(0,0,0,.1);border-radius:10px;background:${tone};min-width:0"><small style="display:block;margin-bottom:5px;opacity:.8">${esc(label)}</small><strong style="display:block;font-size:24px;line-height:1">${Number(value||0).toLocaleString('en-US')}</strong><span style="display:block;margin-top:6px;font-size:12px;opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(detail)}</span></a>`;
  }

  async function render(){
    if(!(await waitForAdmin())) return;
    let pendingData,reportsData;
    try{
      [pendingData,reportsData]=await Promise.all([api('/api/reviews/pending'),api('/api/reports')]);
    }catch(error){console.error('Admin workflow summary failed',error);return;}

    const pending=Array.isArray(pendingData.reports)?pendingData.reports:[];
    const reports=Array.isArray(reportsData.reports)?reportsData.reports:[];
    const overdue=pending.filter(report=>ageHours(report)>=24);
    const returned=reports.filter(report=>String(report.workflow_status||'draft')==='draft'&&report.returned_at);
    const approvedToday=reports.filter(report=>String(report.workflow_status||'')==='approved'&&isToday(report.approved_at));

    document.getElementById('adminWorkflowSummary')?.remove();
    const section=document.createElement('section');
    section.id='adminWorkflowSummary';
    section.className='no-print';
    section.style.cssText='margin:14px 0 18px;padding:14px;border:1px solid rgba(0,0,0,.08);border-radius:12px;background:rgba(255,255,255,.75);';
    section.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px"><div><strong style="font-size:16px">ملخص سير التقارير</strong><small style="display:block;margin-top:2px;opacity:.7">حالة العمل الحالية للمدير</small></div><a href="/reviews" style="text-decoration:none;font-size:13px">فتح المراجعة</a></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px">${metric('بانتظار المراجعة',pending.length,pending.length?'تقارير تحتاج قرارًا':'لا توجد تقارير معلقة','/reviews','#f4f8ff')}${metric('متأخر أكثر من 24 ساعة',overdue.length,overdue.length?'يحتاج متابعة عاجلة':'لا يوجد تأخير','/reviews','#fff5e8')}${metric('معاد للتعديل',returned.length,returned.length?'مسودات أعيدت للمحررين':'لا توجد تقارير معادة','/archive','#fff8e8')}${metric('معتمد اليوم',approvedToday.length,approvedToday.length?'تم إنجازها اليوم':'لا يوجد اعتماد اليوم','/archive','#eef9f1')}</div>`;

    const grid=document.querySelector('.dashboard-grid, .home-dashboard-grid, [data-dashboard-grid]');
    if(grid?.parentNode) grid.parentNode.insertBefore(section,grid); else document.querySelector('main.container')?.prepend(section);
  }

  function init(){setTimeout(render,500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

;

/* ===== js/app-admin-today-ops.js ===== */
/* Admin daily operational KPIs on home dashboard. */
(function(){
  const pathName=location.pathname.replace(/\/+$/,'')||'/';
  if(pathName!=='/') return;

  const fmt=value=>Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  function jerusalemDateFor(date){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const map=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function todayAndYesterday(){
    const now=new Date();
    return {today:jerusalemDateFor(now),yesterday:jerusalemDateFor(new Date(now.getTime()-86400000))};
  }

  async function api(url){
    const response=await fetch(url);
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false) throw new Error(data.message||'فشل تحميل البيانات');
    return data;
  }

  async function waitForUser(){
    for(let i=0;i<40&&!window.MINYA_USER;i+=1) await new Promise(resolve=>setTimeout(resolve,50));
    return window.MINYA_USER||null;
  }

  function equipmentSummary(equipment){
    const list=Array.isArray(equipment)?equipment:[];
    if(!list.length) return {total:0,working:0,issues:0,text:'لا توجد بيانات معدات'};
    const working=list.filter(item=>String(item.operating_status||'').trim()==='يعمل').length;
    const issues=list.length-working;
    return {total:list.length,working,issues,text:issues?`${working} يعمل / ${issues} يحتاج متابعة`:`${working} يعمل / لا توجد أعطال مسجلة`};
  }

  function compareText(current,previous){
    const now=Number(current||0); const before=Number(previous||0);
    if(!Number.isFinite(now)||!Number.isFinite(before)) return '';
    const diff=now-before;
    if(before===0){
      if(now===0) return 'مثل أمس';
      return '↑ جديد عن أمس';
    }
    const percent=Math.abs((diff/before)*100);
    if(Math.abs(diff)<1e-9) return '→ مثل أمس';
    return `${diff>0?'↑':'↓'} ${percent.toLocaleString('en-US',{maximumFractionDigits:1})}% عن أمس`;
  }

  function metricCard(label,value,unit,current,previous,hasYesterday){
    return `<div style="padding:12px;border-radius:10px;background:rgba(255,255,255,.9)"><small>${esc(label)}</small><strong style="display:block;font-size:22px;margin-top:3px">${esc(value)}${unit?` ${esc(unit)}`:''}</strong><small style="display:block;margin-top:5px;opacity:.75">${hasYesterday?esc(compareText(current,previous)):'لا يوجد تقرير أمس للمقارنة'}</small></div>`;
  }

  function renderMissing(today){
    if(document.getElementById('adminTodayOps')) return;
    const main=document.querySelector('main.container'); if(!main) return;
    const section=document.createElement('section');
    section.id='adminTodayOps'; section.className='no-print';
    section.style.cssText='margin:14px 0;padding:14px 16px;border:1px solid rgba(120,120,120,.22);border-radius:12px;background:rgba(255,255,255,.7);';
    section.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><strong style="font-size:17px">مؤشرات تشغيل اليوم</strong><small style="display:block;margin-top:3px">${esc(today)}</small></div><a href="/report" style="text-decoration:none">إنشاء تقرير اليوم</a></div><p style="margin:10px 0 0">لم يتم تسجيل تقرير اليوم حتى الآن.</p>`;
    const grid=document.querySelector('.dashboard-grid, .home-dashboard-grid, [data-dashboard-grid]');
    if(grid&&grid.parentElement) grid.parentElement.insertBefore(section,grid); else main.prepend(section);
  }

  function renderReport(report,details,today,yesterdayReport,yesterdayDate){
    if(document.getElementById('adminTodayOps')) return;
    const main=document.querySelector('main.container'); if(!main) return;
    const eq=equipmentSummary(details?.equipment);
    const hasYesterday=Boolean(yesterdayReport);
    const section=document.createElement('section');
    section.id='adminTodayOps'; section.className='no-print';
    section.style.cssText='margin:14px 0;padding:14px 16px;border:1px solid rgba(55,110,160,.22);border-radius:12px;background:rgba(248,252,255,.88);';
    section.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:10px"><div><strong style="font-size:17px">مؤشرات تشغيل اليوم</strong><small style="display:block;margin-top:3px">${esc(today)} — ${esc(report.report_no||'')}</small>${hasYesterday?`<small style="display:block;margin-top:2px;opacity:.7">المقارنة مع ${esc(yesterdayDate)}</small>`:''}</div><a href="/report?edit=${Number(report.id)}" style="text-decoration:none">فتح تقرير اليوم</a></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px">${metricCard('النفايات',fmt(report.total_waste_tons),'طن',report.total_waste_tons,yesterdayReport?.total_waste_tons,hasYesterday)}${metricCard('الشاحنات',fmt(report.total_trucks),'',report.total_trucks,yesterdayReport?.total_trucks,hasYesterday)}${metricCard('السولار',fmt(report.total_diesel),'لتر',report.total_diesel,yesterdayReport?.total_diesel,hasYesterday)}<div style="padding:12px;border-radius:10px;background:rgba(255,255,255,.9)"><small>المعدات</small><strong style="display:block;font-size:16px;margin-top:5px">${esc(eq.text)}</strong><small style="display:block;margin-top:5px;opacity:.75">من تقرير اليوم</small></div></div>`;
    const grid=document.querySelector('.dashboard-grid, .home-dashboard-grid, [data-dashboard-grid]');
    if(grid&&grid.parentElement) grid.parentElement.insertBefore(section,grid); else main.prepend(section);
  }

  async function init(){
    const user=await waitForUser();
    if(user?.role!=='admin') return;
    const dates=todayAndYesterday();
    try{
      const data=await api('/api/reports');
      const reports=Array.isArray(data.reports)?data.reports:[];
      const report=reports.find(item=>String(item.report_date||'')===dates.today);
      if(!report){renderMissing(dates.today);return;}
      const yesterdayReport=reports.find(item=>String(item.report_date||'')===dates.yesterday)||null;
      let details=null;
      try{const full=await api(`/api/reports/${report.id}`);details=full.report||full;}catch{}
      renderReport(report,details,dates.today,yesterdayReport,dates.yesterday);
    }catch(error){console.error('Admin today ops failed',error);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,500));else setTimeout(init,500);
})();

;

/* ===== js/app-admin-system-health.js ===== */
/* Compact admin system health indicator for the home dashboard. */
(function(){
  const pathName=location.pathname.replace(/\/+$/,'')||'/';
  if(pathName!=='/') return;

  async function waitForAdmin(){
    for(let i=0;i<40&&!window.MINYA_USER;i+=1) await new Promise(resolve=>setTimeout(resolve,50));
    return window.MINYA_USER?.role==='admin';
  }

  async function api(url){
    const response=await fetch(url,{cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false) throw new Error(data.message||'فشل تحميل حالة النظام');
    return data;
  }

  function status(integrity){
    if(integrity?.level==='danger') return {text:'تحتاج تدخلًا',bg:'#fff0f0',border:'#e8bcbc',color:'#8a2e2e'};
    if(integrity?.level==='warning') return {text:'تحتاج متابعة',bg:'#fff8e8',border:'#ead59a',color:'#7a5a12'};
    return {text:'سليمة',bg:'#eef9f1',border:'#c8dfcf',color:'#176b4f'};
  }

  async function render(){
    if(!(await waitForAdmin())) return;
    let integrity;
    try{integrity=await api('/api/system/integrity');}
    catch(error){console.error('Admin system health failed',error);return;}

    const s=status(integrity);
    document.getElementById('adminSystemHealth')?.remove();

    const section=document.createElement('section');
    section.id='adminSystemHealth';
    section.className='no-print';
    section.style.cssText=`margin:10px 0 14px;padding:10px 12px;border:1px solid ${s.border};border-radius:10px;background:${s.bg};display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;`;
    section.innerHTML=`<div style="display:flex;align-items:center;gap:8px;min-width:0"><strong style="font-size:14px;color:${s.color}">صحة النظام:</strong><span style="font-size:14px;font-weight:800;color:${s.color}">${s.text}</span></div><a href="/system.html" style="font-size:12px;font-weight:800;text-decoration:none;color:${s.color}">فتح إدارة النظام</a>`;

    const workflow=document.getElementById('adminWorkflowSummary');
    const todayOps=document.getElementById('adminTodayOps');
    if(todayOps?.parentNode) todayOps.parentNode.insertBefore(section,todayOps.nextSibling);
    else if(workflow?.parentNode) workflow.parentNode.insertBefore(section,workflow.nextSibling);
    else document.querySelector('main.container')?.prepend(section);
  }

  function init(){setTimeout(render,650);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
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
    {label:"المركبات والسائقين", href:"/drivers-licenses.html", icon:"▣"},
    {label:"لوحة التشغيل", href:"/ops-dashboard", icon:"▥"},
    {label:"مركبات حركة المكب والسائقون", href:"/fleet", icon:"▣"},
    {label:"الصيانة والحوادث", href:"/maintenance-incidents", icon:"⚒"},
    {label:"العصارة والغطاء اليومي", href:"/environment", icon:"◫"},
    {label:"البحث الشامل", href:"/global-search", icon:"⌕"},
    {label:"التقرير الأسبوعي", href:"/weekly", icon:"≋"},
    {label:"البحث المتقدم", href:"/search", icon:"⌕"},
    {label:"التقرير الإداري", href:"/managerial", icon:"▧"},
    {label:"الإدارة والصلاحيات", href:"/admin", icon:"◇", adminOnly:true},
    {label:"إدارة النظام", href:"/system.html", icon:"⚙", adminOnly:true},
    {label:"الاستيراد", href:"/drive-import.html", icon:"⇩", adminOnly:true},
    {label:"المراجعة والاعتماد", href:"/reviews", icon:"✓", adminOnly:true}
  ];

  function currentPath(){
    return location.pathname.replace(/\/+$/,"") || "/";
  }

  function currentRole(){
    return (window.MINYA_USER && window.MINYA_USER.role) || document.documentElement.dataset.userRole || "";
  }

  function renderItems(menu){
    if(!menu) return;
    const role=currentRole();
    const path=currentPath();
    menu.dataset.renderedRole=role;
    menu.innerHTML=items.filter(item=>{
      if(item.adminOnly && role!=="admin") return false;
      if(item.hideFor && item.hideFor.includes(role)) return false;
      return true;
    }).map(item=>{
      const active=(path===item.href || (item.href!=="/" && path.startsWith(item.href))) ? " active" : "";
      return `<a class="minya-menu-item${active}" href="${item.href}"><span class="minya-menu-label"><i class="minya-menu-symbol" aria-hidden="true">${item.icon}</i><span>${item.label}</span></span><b aria-hidden="true">‹</b></a>`;
    }).join("");
  }

  function mountBackToTop(){
    if(document.getElementById("minyaBackToTop")) return;

    const style=document.createElement("style");
    style.id="minyaBackToTopStyle";
    style.textContent=`
      #minyaBackToTop{
        position:fixed;
        right:18px;
        bottom:18px;
        z-index:1690;
        width:46px;
        height:46px;
        min-width:46px;
        min-height:46px;
        padding:0 !important;
        display:flex;
        align-items:center;
        justify-content:center;
        border:1px solid rgba(255,255,255,.28) !important;
        border-radius:50% !important;
        background:var(--appearance-accent,#176b4f) !important;
        color:#fff !important;
        box-shadow:0 10px 26px rgba(10,45,34,.24) !important;
        font-size:24px !important;
        font-weight:900 !important;
        line-height:1 !important;
        cursor:pointer;
        transition:transform .18s ease,opacity .18s ease;
      }
      #minyaBackToTop[hidden]{display:none !important;}
      #minyaBackToTop:hover{transform:translateY(-2px);}
      #minyaBackToTop:focus-visible{outline:3px solid rgba(37,99,235,.28);outline-offset:3px;}
      @media (max-width:760px){
        #minyaBackToTop{right:12px;bottom:14px;width:44px;height:44px;min-width:44px;min-height:44px;font-size:23px !important;}
      }
      @media print{#minyaBackToTop{display:none !important;}}
    `;
    document.head.appendChild(style);

    const btn=document.createElement("button");
    btn.id="minyaBackToTop";
    btn.type="button";
    btn.hidden=true;
    btn.setAttribute("aria-label","العودة إلى بداية الصفحة");
    btn.setAttribute("title","العودة إلى أعلى الصفحة");
    btn.innerHTML='<span aria-hidden="true">↑</span>';
    document.body.appendChild(btn);

    const sync=()=>{
      btn.hidden=(window.scrollY || document.documentElement.scrollTop || 0)<320;
    };

    btn.addEventListener("click",()=>{
      const reduced=document.documentElement.dataset.motion==="reduced" || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      window.scrollTo({top:0,left:0,behavior:reduced?"auto":"smooth"});
    });
    window.addEventListener("scroll",sync,{passive:true});
    sync();
  }

  function build(){
    if(!window.matchMedia("(max-width: 760px)").matches) return;
    const header=document.querySelector(".top-header");
    if(!header) return;

    const existing=document.getElementById("minyaHeaderMenu");
    if(existing){
      if(existing.dataset.renderedRole!==currentRole()) renderItems(existing);
      return;
    }

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
    renderItems(menu);

    wrap.append(btn,menu);
    header.appendChild(wrap);

    const close=()=>{
      menu.hidden=true;
      wrap.classList.remove("open");
      btn.setAttribute("aria-expanded","false");
    };

    btn.addEventListener("click",(event)=>{
      event.stopPropagation();
      renderItems(menu);
      const open=menu.hidden;
      menu.hidden=!open;
      wrap.classList.toggle("open",open);
      btn.setAttribute("aria-expanded",String(open));
      if(open) menu.scrollTop=0;
    });

    document.addEventListener("click",(event)=>{
      if(!wrap.contains(event.target)) close();
    });
    document.addEventListener("keydown",(event)=>{
      if(event.key==="Escape") close();
    });
  }

  function start(){
    mountBackToTop();
    build();
    let tries=0,lastRole=currentRole();
    const timer=setInterval(()=>{
      tries+=1;
      const role=currentRole();
      if(role!==lastRole){lastRole=role;build();}
      if(tries>=24) clearInterval(timer);
    },250);
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
  const emptyPhrases=["لا توجد بيانات","لا توجد نتائج","لا توجد تقارير","لا توجد سجلات","لا توجد تقارير في هذه الفترة","لا توجد سجلات صيانة"];
  function classifyEmptyCells(root=document){root.querySelectorAll('td[colspan]').forEach(td=>{const text=(td.textContent||'').trim();if(emptyPhrases.some(p=>text.includes(p)))td.classList.add('minya-empty-state');else td.classList.remove('minya-empty-state');});}
  function classifyMessages(root=document){root.querySelectorAll('#maintMsg,.message,[id$="Msg"],[class*="message"]').forEach(el=>{const text=(el.textContent||'').trim();if(!text)return;el.classList.add('minya-ui-message');el.classList.remove('is-success','is-warning','is-error');if(/تم |نجاح|حفظ|مكتمل|سليم|لا توجد تنبيهات/.test(text))el.classList.add('is-success');else if(/خطأ|فشل|تعذر|غير مسموح|مرفوض/.test(text))el.classList.add('is-error');else if(/تحذير|تنبيه|مطلوب|قيد|انتظار/.test(text))el.classList.add('is-warning');});}
  function enhance(root=document){classifyEmptyCells(root);classifyMessages(root);}
  function start(){enhance();let queued=false;const observer=new MutationObserver(mutations=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mutations.forEach(m=>{if(m.target&&m.target.nodeType===1)enhance(m.target.closest?.('main')||document);});});});observer.observe(document.body,{subtree:true,childList:true,characterData:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* Operations dashboard and unified search */
(function(){
  const route=location.pathname.replace(/\/+$/,'')||'/';
  if(!['/ops-dashboard','/global-search'].includes(route))return;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const api=async(url,opt)=>{const r=await fetch(url,opt),d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;};
  const localDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hebron',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function shell(title,sub){const main=document.querySelector('main.container');if(!main)return null;main.innerHTML=`<section class="v3-page"><div class="v3-hero"><div><span>MINYA LANDFILL</span><h2>${title}</h2><p>${sub}</p></div></div><div id="opsAux"></div></section>`;return document.getElementById('opsAux');}
  async function dashboard(){
    const c=shell('لوحة التشغيل','ملخص المركبات والحوادث والعصارة والغطاء والتنبيهات التشغيلية.');if(!c)return;
    const today=localDate(),from=today.slice(0,7)+'-01';
    c.innerHTML=`<div id="opsKpis" class="v3-kpis"></div><div class="v3-panel"><h3>التنبيهات</h3><div id="opsAlerts"></div></div><div class="v3-panel"><h3>الأقسام</h3><div class="dashboard-grid"><a class="dashboard-card" href="/fleet"><h3>المركبات والسائقون</h3><p>الرخص والتأمين وحركة مركبات المكب.</p></a><a class="dashboard-card" href="/maintenance-incidents"><h3>الصيانة والحوادث</h3><p>الأعطال والحوادث والمتابعة والتكاليف.</p></a><a class="dashboard-card" href="/environment"><h3>العصارة والغطاء</h3><p>العصارة ونقلات الصهريج والغطاء اليومي.</p></a><a class="dashboard-card" href="/global-search"><h3>البحث الشامل</h3><p>بحث موحد داخل بيانات النظام.</p></a></div></div>`;
    const [f,i,e,r]=await Promise.all([api('/api/ops/fleet').catch(()=>({vehicles:[]})),api('/api/incidents').catch(()=>({incidents:[]})),api(`/api/ops/environment?from=${from}&to=${today}`).catch(()=>({totals:{},rows:[]})),api('/api/reports').catch(()=>({reports:[]}))]);
    const open=(i.incidents||[]).filter(x=>x.followup_status!=='مغلقة');
    const pending=(r.reports||[]).filter(x=>x.workflow_status==='pending');
    document.getElementById('opsKpis').innerHTML=[['المركبات',(f.vehicles||[]).length,'مركبة'],['السجلات المفتوحة',open.length,'سجل'],['بانتظار الاعتماد',pending.length,'تقرير'],['العصارة هذا الشهر',e.totals?.leachate_m3||0,'م³'],['نقلات الغطاء',e.totals?.cover_trips||0,'نقلة']].map(x=>`<div><span>${x[0]}</span><strong>${fmt(x[1])}</strong><small>${x[2]}</small></div>`).join('');
    const alerts=[];
    (f.vehicles||[]).forEach(v=>[['رخصة السائق',v.driver_license_days],['رخصة المركبة',v.vehicle_license_days],['التأمين',v.insurance_days]].forEach(([name,d])=>{if(d!==null&&d<=30)alerts.push(`${name} - ${v.vehicle_name}: ${d<0?'منتهية منذ '+Math.abs(d)+' يوم':'متبقي '+d+' يوم'}`);}));
    open.slice(0,12).forEach(x=>alerts.push(`${x.incident_type} - ${x.asset_name}: ${x.followup_status}`));
    if(pending.length)alerts.push(`${pending.length} تقرير بانتظار المراجعة أو الاعتماد`);
    if(!(e.rows||[]).some(x=>x.log_date===today))alerts.push(`لم يتم إدخال سجل العصارة والغطاء لليوم ${today}`);
    document.getElementById('opsAlerts').innerHTML=alerts.length?`<ul>${alerts.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>`:'<div class="minya-empty-state">لا توجد تنبيهات حالية</div>';
  }
  async function globalSearch(){
    const c=shell('البحث الشامل','بحث موحد في التقارير والمركبات والسائقين والصيانة والحوادث.');if(!c)return;
    c.innerHTML=`<div class="v3-panel"><div class="v3-filter"><input id="globalQ" placeholder="اكتب كلمة البحث"><button id="globalGo" class="v3-primary">بحث</button></div></div><div id="globalResults"></div>`;
    const q=document.getElementById('globalQ'),out=document.getElementById('globalResults');
    async function run(){const text=q.value.trim();if(!text){out.innerHTML='';return;}out.innerHTML='<div class="minya-empty-state">جاري البحث...</div>';const [reports,fleet,incidents]=await Promise.all([api(`/api/search?q=${encodeURIComponent(text)}`).catch(()=>({reports:[]})),api(`/api/ops/fleet?q=${encodeURIComponent(text)}`).catch(()=>({vehicles:[]})),api(`/api/incidents?q=${encodeURIComponent(text)}`).catch(()=>({incidents:[]}))]);const rows=[...(reports.reports||[]).map(x=>['تقرير',x.report_no,x.report_date,x.notes||'','/archive']),...(fleet.vehicles||[]).map(x=>['مركبة/سائق',x.vehicle_name,x.plate_no,x.driver_name||x.driver_license_no||'','/fleet']),...(incidents.incidents||[]).map(x=>['صيانة/حادث',x.asset_name,x.incident_date,x.description||'','/maintenance-incidents'])];out.innerHTML=rows.length?`<div class="v3-panel"><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>النوع</th><th>العنوان</th><th>التاريخ/الرقم</th><th>التفصيل</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x[0])}</td><td>${esc(x[1])}</td><td>${esc(x[2])}</td><td>${esc(x[3])}</td><td><a href="${x[4]}">فتح</a></td></tr>`).join('')}</tbody></table></div></div>`:'<div class="minya-empty-state">لا توجد نتائج</div>';}
    document.getElementById('globalGo').onclick=run;q.onkeydown=e=>{if(e.key==='Enter')run();};
  }
  const render=()=>route==='/ops-dashboard'?dashboard():globalSearch();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
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
  function shortMonth(value){const match=String(value||"").match(/^(\d{4})-(\d{2})$/);if(!match)return value;const index=Number(match[2])-1;return `${shortMonths[index]||match[2]} ${match[1]}`;}
  function dateSlash(value){const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return match?`${match[3]}/${match[2]}/${match[1]}`:value;}
  function monthSlash(value){const match=String(value||"").match(/^(\d{4})-(\d{2})$/);return match?`${match[2]}/${match[1]}`:value;}
  function arabicNameToShort(text){let output=String(text||"");arabicMonths.forEach((name,index)=>{output=output.replace(new RegExp(name,"g"),shortMonths[index]);});return output;}
  function applyChartMonths(root=document){root.querySelectorAll?.(".modern-chart-eyebrow,#annualBestMonth,#annualWorstMonth").forEach(el=>{el.textContent=arabicNameToShort(el.textContent);});}
  function applyTableDates(root=document){root.querySelectorAll?.(".dashboard-recent-table td,.v3-table td,#archiveTable td").forEach(td=>{if(td.children.length)return;const text=td.textContent.trim();if(/^\d{4}-\d{2}-\d{2}$/.test(text))td.textContent=dateSlash(text);else if(/^\d{4}-\d{2}$/.test(text))td.textContent=monthSlash(text);});}
  function stabilizeDateInputs(root=document){root.querySelectorAll?.('input[type="date"],input[data-minya-date-input="1"]').forEach(input=>{if(input.dataset.minyaDateInput!=="1"){input.dataset.minyaDateInput="1";input.addEventListener("focus",()=>{if(input.type!=="date"){input.type="date";input.removeAttribute("placeholder");input.setAttribute("dir","rtl");requestAnimationFrame(()=>{try{input.showPicker?.();}catch{}});}});input.addEventListener("blur",()=>setDateTextMode(input));input.addEventListener("change",()=>{if(!input.value&&document.activeElement!==input)setDateTextMode(input);});}if(!input.value&&document.activeElement!==input)setDateTextMode(input);});}
  function setDateTextMode(input){if(input.value||document.activeElement===input)return;input.type="text";input.placeholder="YYYY-MM-DD";input.inputMode="numeric";input.setAttribute("dir","ltr");input.setAttribute("aria-label",input.getAttribute("aria-label")||"التاريخ بصيغة سنة-شهر-يوم");}
  function apply(){stabilizeDateInputs(document);applyChartMonths(document);applyTableDates(document);}
  window.MINYA_DATE_DISPLAY={shortMonth,dateSlash,monthSlash};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
  if(typeof MutationObserver!=="undefined"){let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});});observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});}
})();

/* Leachate and daily cover management */
(function(){
  const route=location.pathname.replace(/\/+$/,'')||'/';
  if(route!=='/environment')return;
  const api=async(url,opt)=>{const r=await fetch(url,opt),d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  async function render(){
    const main=document.querySelector('main.container');if(!main)return;
    const auth=await api('/api/auth/status').catch(()=>({}));const editable=['admin','editor'].includes(auth.user?.role);
    const now=new Date(),today=now.toISOString().slice(0,10),month=today.slice(0,7);
    main.innerHTML=`<section class="v3-page"><div class="v3-hero"><div><span>LEACHATE & COVER</span><h2>العصارة والغطاء اليومي</h2><p>متابعة كميات العصارة ونقلات الصهريج والغطاء اليومي مع المجاميع.</p></div></div><div id="envContent"><div id="envEditor" class="v3-panel"><h3>إدخال اليوم</h3><div class="v3-form-grid"><label>التاريخ<input id="envDate" type="date" value="${today}"></label><label>العصارة م³<input id="envLeach" type="number" step="0.01"></label><label>نقلات الصهريج<input id="envTank" type="number" step="0.01"></label><label>نقلات الغطاء<input id="envCover" type="number" step="0.01"></label><label>كمية الغطاء<input id="envQty" type="number" step="0.01"></label><label>الوحدة<input id="envUnit" value="نقلة"></label></div><label>ملاحظات<textarea id="envNotes" rows="2"></textarea></label><button id="envSave" class="v3-primary">حفظ / تحديث</button><span id="envMsg"></span></div><div class="v3-panel"><div class="v3-filter"><label>من<input id="envFrom" type="date" value="${month}-01"></label><label>إلى<input id="envTo" type="date" value="${today}"></label><button id="envLoad">تحديث</button></div><div id="envKpis" class="v3-kpis"></div><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>العصارة م³</th><th>نقلات الصهريج</th><th>نقلات الغطاء</th><th>كمية الغطاء</th><th>ملاحظات</th></tr></thead><tbody id="envBody"></tbody></table></div></div></div></section>`;
    if(!editable)document.getElementById('envEditor').classList.add('hidden');
    const el=id=>document.getElementById(id);
    async function load(){const d=await api(`/api/ops/environment?from=${el('envFrom').value}&to=${el('envTo').value}`);el('envKpis').innerHTML=[['أيام مسجلة',d.totals.days,'يوم'],['العصارة',d.totals.leachate_m3,'م³'],['نقلات الصهريج',d.totals.tanker_trips,'نقلة'],['نقلات الغطاء',d.totals.cover_trips,'نقلة'],['كمية الغطاء',d.totals.cover_quantity,'']].map(x=>`<div><span>${x[0]}</span><strong>${fmt(x[1])}</strong><small>${x[2]}</small></div>`).join('');el('envBody').innerHTML=d.rows.length?d.rows.map(r=>`<tr><td>${esc(r.log_date)}</td><td>${fmt(r.leachate_m3)}</td><td>${fmt(r.tanker_trips)}</td><td>${fmt(r.cover_trips)}</td><td>${fmt(r.cover_quantity)} ${esc(r.cover_unit||'')}</td><td>${esc(r.notes||'')}</td></tr>`).join(''):'<tr><td colspan="6">لا توجد بيانات</td></tr>';}
    el('envSave').onclick=async()=>{try{await api('/api/ops/environment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({log_date:el('envDate').value,leachate_m3:el('envLeach').value,tanker_trips:el('envTank').value,cover_trips:el('envCover').value,cover_quantity:el('envQty').value,cover_unit:el('envUnit').value,notes:el('envNotes').value})});el('envMsg').textContent='تم الحفظ';load();}catch(e){el('envMsg').textContent=e.message;}};
    el('envLoad').onclick=load;load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();

;

/* ===== js/app-appearance-settings.js ===== */
/* =========================================================
   إعدادات المظهر المشتركة لكل المستخدمين
========================================================= */

(function () {
  const storageKey = "minya_appearance_settings_v1";
  const typographyPresets = {
    compact: { siteFontSize: 13, navFontSize: 12, headingFontSize: 18, metricFontSize: 21, smallFontSize: 11, lineHeight: 1.45 },
    balanced: { siteFontSize: 14, navFontSize: 13, headingFontSize: 20, metricFontSize: 24, smallFontSize: 12, lineHeight: 1.6 },
    large: { siteFontSize: 16, navFontSize: 15, headingFontSize: 22, metricFontSize: 27, smallFontSize: 13, lineHeight: 1.7 },
    accessible: { siteFontSize: 18, navFontSize: 17, headingFontSize: 25, metricFontSize: 31, smallFontSize: 15, lineHeight: 1.8 },
  };
  const defaults = {
    loadingSeconds: 1,
    loadingDurationRevision: 2,
    remembranceFontSize: 72,
    remembranceFontRevision: 2,
    typographyRevision: 2,
    typographyPreset: "balanced",
    siteFontSize: 14,
    navFontSize: 13,
    headingFontSize: 20,
    metricFontSize: 24,
    smallFontSize: 12,
    lineHeight: 1.6,
    fontFamily: "system",
    fontWeight: "medium",
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
    loadingDurationRevision: [2],
    remembranceFontRevision: [2],
    typographyRevision: [2],
    typographyPreset: ["compact", "balanced", "large", "accessible", "custom"],
    fontFamily: ["system", "tahoma", "segoe"],
    fontWeight: ["regular", "medium", "bold"],
    theme: ["day", "night", "auto"],
    color: ["green", "blue"],
    fontSize: ["small", "normal", "large", "xlarge"],
    navPosition: ["top", "right", "left"],
    density: ["comfortable", "compact"],
    contrast: ["normal", "high"],
    motion: ["full", "reduced"],
  };

  const systemTheme = window.matchMedia?.("(prefers-color-scheme: dark)");
  const numericTypography = {
    siteFontSize: [13, 20, 0],
    navFontSize: [12, 18, 0],
    headingFontSize: [18, 28, 0],
    metricFontSize: [20, 34, 0],
    smallFontSize: [11, 16, 0],
    lineHeight: [1.35, 1.9, 2],
  };
  const typographyKeys = Object.keys(numericTypography);
  const numericKeys = ["loadingSeconds", "remembranceFontSize", ...typographyKeys];

  function normalize(input) {
    const output = { ...defaults };
    const hasFastLoading = Number(input?.loadingDurationRevision) === 2;
    Object.keys(defaults).forEach((key) => {
      if (key === "remembranceFontSize") {
        const size = Math.round(Number(input?.[key]));
        if (Number.isFinite(size)) output[key] = Math.min(72, Math.max(11, size));
        return;
      }
      if (typographyKeys.includes(key)) {
        return;
      }
      const value = key === "loadingSeconds" ? Number(input?.[key]) : input?.[key];
      if (allowed[key].includes(value)) output[key] = value;
    });
    if (!hasFastLoading) output.loadingSeconds = 1;
    output.loadingDurationRevision = 2;
    const hasModernTypography = Number(input?.typographyRevision) === 2;
    output.typographyRevision = 2;
    if (!hasModernTypography) {
      const legacySize = Number(input?.siteFontSize);
      output.typographyPreset = legacySize >= 19 || input?.fontSize === "xlarge"
        ? "accessible"
        : legacySize >= 17 || input?.fontSize === "large"
          ? "large"
          : "balanced";
    }
    if (hasModernTypography) Object.entries(numericTypography).forEach(([key, [minimum, maximum, decimals]]) => {
      const value = Number(input?.[key]);
      if (!Number.isFinite(value)) return;
      const bounded = Math.min(maximum, Math.max(minimum, value));
      output[key] = decimals ? Number(bounded.toFixed(decimals)) : Math.round(bounded);
    });
    if (output.typographyPreset !== "custom") {
      Object.assign(output, typographyPresets[output.typographyPreset] || typographyPresets.balanced);
    }
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

  function ensureTypographyRuntimeStyles() {
    if (document.getElementById("minyaTypographyRuntimeStyles")) return;
    const style = document.createElement("style");
    style.id = "minyaTypographyRuntimeStyles";
    style.textContent = `
      @media screen {
        html[data-typography-revision="2"] body {
          font-family: var(--appearance-font-family) !important;
          font-size: var(--appearance-font-size) !important;
          line-height: var(--appearance-line-height) !important;
          font-weight: var(--appearance-body-weight) !important;
        }
        html[data-typography-revision="2"] :is(button,input,select,textarea,table) {
          font-family: var(--appearance-font-family) !important;
        }
        html[data-typography-revision="2"] main :is(p,label,li,input:not([type="range"]),select,textarea,button,a),
        html[data-typography-revision="2"] :is(.minya-notification-panel,.appearance-grid) :is(p,label,li,input:not([type="range"]),select,textarea,button,a) {
          font-size: var(--appearance-font-size) !important;
          line-height: var(--appearance-line-height) !important;
        }
        html[data-typography-revision="2"] main :is(td,th) {
          font-size: max(12px, calc(var(--appearance-font-size) - 1px)) !important;
          line-height: var(--appearance-line-height) !important;
        }
        html[data-typography-revision="2"] :is(small,.muted,.v3-kicker,.dashboard-kicker,.reviews-kicker,.system-kicker,.smart-status-kicker,.ss-kicker) {
          font-size: var(--appearance-small-font-size) !important;
          line-height: var(--appearance-line-height) !important;
        }
        html[data-typography-revision="2"] :is(.top-header nav a,.top-header nav button,.app-nav-link,.minya-menu-item,#minyaMenuButton,#minyaLogoutBtn,.minya-notification-button) {
          font-size: var(--appearance-nav-font-size) !important;
          line-height: 1.35 !important;
          font-weight: var(--appearance-ui-weight) !important;
        }
        html[data-typography-revision="2"] .top-header h1 {
          font-size: calc(var(--appearance-heading-font-size) + 4px) !important;
          line-height: 1.3 !important;
          font-weight: var(--appearance-heading-weight) !important;
        }
        html[data-typography-revision="2"] .top-header p {
          font-size: var(--appearance-small-font-size) !important;
          line-height: 1.5 !important;
        }
        html[data-typography-revision="2"] main :is(h1,h2,.panel>h2,.v3-hero h2,.dashboard-hero h2,.system-hero h2) {
          font-size: var(--appearance-heading-font-size) !important;
          line-height: 1.4 !important;
          font-weight: var(--appearance-heading-weight) !important;
        }
        html[data-typography-revision="2"] main h3 {
          font-size: calc(var(--appearance-heading-font-size) - 2px) !important;
          line-height: 1.45 !important;
          font-weight: var(--appearance-heading-weight) !important;
        }
        html[data-typography-revision="2"] main h4 {
          font-size: max(15px, calc(var(--appearance-heading-font-size) - 4px)) !important;
          line-height: 1.45 !important;
          font-weight: var(--appearance-heading-weight) !important;
        }
        html[data-typography-revision="2"] :is(.dashboard-metric-card,.daily-summary>div,.archive-summary>div,.monthly-summary>div,.executive-card,.system-metric,.mi-kpi,.today-operations-grid) > :is(strong,b),
        html[data-typography-revision="2"] :is(.storage-usage,.storage-percent,.storage-breakdown) strong {
          font-size: var(--appearance-metric-font-size) !important;
          line-height: 1.2 !important;
          font-weight: var(--appearance-heading-weight) !important;
        }
        html[data-typography-revision="2"] :is(.dashboard-metric-card,.daily-summary>div,.archive-summary>div,.monthly-summary>div,.system-metric) > span {
          font-size: var(--appearance-font-size) !important;
          line-height: 1.45 !important;
          font-weight: var(--appearance-ui-weight) !important;
        }
        html[data-typography-revision="2"] :is(.dashboard-metric-card,.daily-summary>div,.archive-summary>div,.monthly-summary>div,.system-metric) > small {
          font-size: var(--appearance-small-font-size) !important;
          line-height: 1.45 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function apply(settings) {
    const root = document.documentElement;
    root.dataset.theme = settings.theme === "auto" ? (systemTheme?.matches ? "night" : "day") : settings.theme;
    root.dataset.themePreference = settings.theme;
    root.dataset.color = settings.color;
    root.dataset.fontSize = settings.fontSize;
    root.dataset.typographyRevision = String(settings.typographyRevision);
    root.dataset.typographyPreset = settings.typographyPreset;
    root.dataset.fontFamily = settings.fontFamily;
    root.dataset.fontWeight = settings.fontWeight;
    root.dataset.navPosition = settings.navPosition;
    root.dataset.density = settings.density;
    root.dataset.contrast = settings.contrast;
    root.dataset.motion = settings.motion;
    root.style.setProperty("--appearance-font-size", `${settings.siteFontSize}px`);
    root.style.setProperty("--appearance-nav-font-size", `${settings.navFontSize}px`);
    root.style.setProperty("--appearance-heading-font-size", `${settings.headingFontSize}px`);
    root.style.setProperty("--appearance-metric-font-size", `${settings.metricFontSize}px`);
    root.style.setProperty("--appearance-small-font-size", `${settings.smallFontSize}px`);
    root.style.setProperty("--appearance-line-height", String(settings.lineHeight));
    const fontFamilies = {
      system: 'system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif',
      tahoma: 'Tahoma, Arial, sans-serif',
      segoe: '"Segoe UI", Tahoma, Arial, sans-serif',
    };
    const fontWeights = {
      regular: [500, 600, 700],
      medium: [600, 700, 800],
      bold: [700, 800, 900],
    };
    const [bodyWeight, uiWeight, headingWeight] = fontWeights[settings.fontWeight] || fontWeights.medium;
    root.style.setProperty("--appearance-font-family", fontFamilies[settings.fontFamily] || fontFamilies.system);
    root.style.setProperty("--appearance-body-weight", String(bodyWeight));
    root.style.setProperty("--appearance-ui-weight", String(uiWeight));
    root.style.setProperty("--appearance-heading-weight", String(headingWeight));
    ensureTypographyRuntimeStyles();
    window.MINYA_APPEARANCE_SETTINGS = { ...settings };
    const loadingMessage = document.querySelector("#minyaLoadingScreen .minya-loading-message");
    if (loadingMessage) loadingMessage.style.setProperty("font-size", `${settings.remembranceFontSize}px`, "important");
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

  async function putSharedSettings(settings) {
    const response = await fetch("/api/appearance-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: normalize(settings) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) throw new Error(data?.message || "تعذر حفظ إعدادات المظهر");
    return normalize(data.settings);
  }

  async function loadSharedSettings(adminUser) {
    const localSettings = read();
    try {
      const response = await fetch("/api/appearance-settings", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) return localSettings;
      const sharedSettings = data.configured
        ? normalize(data.settings)
        : adminUser
          ? await putSharedSettings(localSettings)
          : normalize(data.settings);
      save(sharedSettings);
      apply(sharedSettings);
      return sharedSettings;
    } catch (_) {
      return localSettings;
    }
  }

  function mount(initialSettings) {
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
        <div><small>إعدادات مشتركة لكل المستخدمين</small><h2 id="minyaAppearanceTitle">المظهر وسهولة الاستخدام</h2></div>
        <button type="button" id="minyaAppearanceClose" aria-label="إغلاق">×</button>
      </div>
      <div class="appearance-sections">
        <section class="appearance-section appearance-typography-section">
          <div class="appearance-section-head"><div><span>النصوص</span><h3>الخطوط والقراءة</h3></div><small data-typography-mode>متوازن</small></div>
          <div class="appearance-preset-group" role="group" aria-label="أنماط حجم النص">
            <button type="button" data-typography-preset="compact">مدمج</button>
            <button type="button" data-typography-preset="balanced">متوازن</button>
            <button type="button" data-typography-preset="large">كبير</button>
            <button type="button" data-typography-preset="accessible">قراءة أوضح</button>
          </div>
          <div class="appearance-type-preview" aria-label="معاينة أحجام النصوص">
            <div><span class="appearance-type-preview-kicker">معاينة مباشرة</span><strong>مؤشرات التشغيل الحالية</strong><p>متابعة بيانات المكب اليومية بسهولة.</p></div>
            <div><b>46,519.85</b><small>طن · يونيو 2026</small></div>
          </div>
          <div class="appearance-grid appearance-text-options">
            <label>نوع الخط
              <select data-appearance-key="fontFamily">
                ${option("system", "خط الجهاز")}${option("tahoma", "Tahoma")}${option("segoe", "Segoe UI")}
              </select>
            </label>
            <label>سُمك النص
              <select data-appearance-key="fontWeight">
                ${option("regular", "عادي")}${option("medium", "متوسط")}${option("bold", "عريض")}
              </select>
            </label>
          </div>
          <details class="appearance-advanced">
            <summary>التحكم الدقيق في الأحجام</summary>
            <div class="appearance-advanced-grid">
              <label class="appearance-range-field">النص الأساسي
                <div class="appearance-range-row"><input type="range" min="13" max="20" step="1" data-appearance-key="siteFontSize" aria-label="حجم النص الأساسي"><div class="appearance-number-box"><input type="number" min="13" max="20" step="1" value="14" data-appearance-number="siteFontSize" aria-label="قيمة حجم النص الأساسي"><span>px</span></div></div>
              </label>
              <label class="appearance-range-field">القائمة والأزرار
                <div class="appearance-range-row"><input type="range" min="12" max="18" step="1" data-appearance-key="navFontSize" aria-label="حجم خط القائمة والأزرار"><div class="appearance-number-box"><input type="number" min="12" max="18" step="1" value="13" data-appearance-number="navFontSize" aria-label="قيمة حجم خط القائمة والأزرار"><span>px</span></div></div>
              </label>
              <label class="appearance-range-field">عناوين الأقسام
                <div class="appearance-range-row"><input type="range" min="18" max="28" step="1" data-appearance-key="headingFontSize" aria-label="حجم عناوين الأقسام"><div class="appearance-number-box"><input type="number" min="18" max="28" step="1" value="20" data-appearance-number="headingFontSize" aria-label="قيمة حجم عناوين الأقسام"><span>px</span></div></div>
              </label>
              <label class="appearance-range-field">أرقام المؤشرات
                <div class="appearance-range-row"><input type="range" min="20" max="34" step="1" data-appearance-key="metricFontSize" aria-label="حجم أرقام المؤشرات"><div class="appearance-number-box"><input type="number" min="20" max="34" step="1" value="24" data-appearance-number="metricFontSize" aria-label="قيمة حجم أرقام المؤشرات"><span>px</span></div></div>
              </label>
              <label class="appearance-range-field">النصوص المساندة
                <div class="appearance-range-row"><input type="range" min="11" max="16" step="1" data-appearance-key="smallFontSize" aria-label="حجم النصوص المساندة"><div class="appearance-number-box"><input type="number" min="11" max="16" step="1" value="12" data-appearance-number="smallFontSize" aria-label="قيمة حجم النصوص المساندة"><span>px</span></div></div>
              </label>
              <label class="appearance-range-field">تباعد السطور
                <div class="appearance-range-row"><input type="range" min="1.35" max="1.9" step="0.05" data-appearance-key="lineHeight" aria-label="تباعد السطور"><div class="appearance-number-box"><input type="number" min="1.35" max="1.9" step="0.05" value="1.6" data-appearance-number="lineHeight" aria-label="قيمة تباعد السطور"><span>×</span></div></div>
              </label>
            </div>
          </details>
        </section>

        <section class="appearance-section">
          <div class="appearance-section-head"><div><span>العرض</span><h3>الألوان والتخطيط</h3></div></div>
          <div class="appearance-grid">
            <label>وضع العرض<select data-appearance-key="theme">${option("day", "نهاري")}${option("night", "ليلي")}${option("auto", "تلقائي حسب الجهاز")}</select></label>
            <label>اللون الرئيسي<select data-appearance-key="color">${option("green", "أخضر")}${option("blue", "أزرق")}</select></label>
            <label>موقع القائمة<select data-appearance-key="navPosition">${option("top", "أعلى الصفحة")}${option("right", "جانب أيمن")}${option("left", "جانب أيسر")}</select></label>
            <label>مسافات العرض<select data-appearance-key="density">${option("comfortable", "مريحة")}${option("compact", "مضغوطة")}</select></label>
          </div>
        </section>

        <section class="appearance-section">
          <div class="appearance-section-head"><div><span>سهولة الاستخدام</span><h3>الوضوح والحركة</h3></div></div>
          <div class="appearance-grid">
            <label>التباين<select data-appearance-key="contrast">${option("normal", "عادي")}${option("high", "عالٍ")}</select></label>
            <label>الحركة<select data-appearance-key="motion">${option("full", "عادية")}${option("reduced", "تقليل الحركة")}</select></label>
          </div>
        </section>

        <section class="appearance-section">
          <div class="appearance-section-head"><div><span>شاشة البداية</span><h3>الذكر عند فتح الصفحة</h3></div></div>
          <div class="appearance-grid">
            <label>مدة ظهور الذكر<select data-appearance-key="loadingSeconds">${option("1", "ثانية واحدة")}${option("2", "ثانيتان")}${option("3", "3 ثوانٍ")}${option("4", "4 ثوانٍ")}${option("5", "5 ثوانٍ")}</select><small>تُطبق عند فتح الصفحة التالية.</small></label>
            <label class="appearance-range-field">حجم خط الأذكار
              <div class="appearance-range-row"><input type="range" min="11" max="72" step="1" data-appearance-key="remembranceFontSize" aria-label="حجم خط الأذكار"><div class="appearance-number-box"><input type="number" min="11" max="72" step="1" value="72" data-appearance-number="remembranceFontSize" aria-label="قيمة حجم خط الأذكار"><span>px</span></div></div>
              <p class="appearance-remembrance-preview" data-remembrance-preview>سبحان الله وبحمده</p>
            </label>
          </div>
        </section>
      </div>
      <div class="appearance-actions">
        <button type="button" id="minyaAppearanceReset">استعادة الافتراضي</button>
        <button type="button" id="minyaAppearanceDone">تم</button>
      </div>
      <p id="minyaAppearanceStatus" aria-live="polite"></p>
    `;

    document.body.append(button, backdrop, panel);

    let settings = normalize(initialSettings || read());
    apply(settings);
    let sharedSaveTimer = null;
    let pendingSharedSettings = null;

    const syncControls = () => {
      panel.querySelectorAll("[data-appearance-key]").forEach((control) => {
        control.value = String(settings[control.dataset.appearanceKey]);
      });
      panel.querySelectorAll("[data-appearance-number]").forEach((control) => {
        control.value = String(settings[control.dataset.appearanceNumber]);
      });
      const preview = panel.querySelector("[data-remembrance-preview]");
      if (preview) preview.style.fontSize = `${settings.remembranceFontSize}px`;
      panel.querySelectorAll("[data-typography-preset]").forEach((control) => {
        const active = control.dataset.typographyPreset === settings.typographyPreset;
        control.classList.toggle("active", active);
        control.setAttribute("aria-pressed", String(active));
      });
      const mode = panel.querySelector("[data-typography-mode]");
      const modeLabels = { compact: "مدمج", balanced: "متوازن", large: "كبير", accessible: "قراءة أوضح", custom: "مخصص" };
      if (mode) mode.textContent = modeLabels[settings.typographyPreset] || "مخصص";
    };

    const flushSharedSave = async () => {
      if (sharedSaveTimer) clearTimeout(sharedSaveTimer);
      sharedSaveTimer = null;
      const snapshot = pendingSharedSettings || settings;
      pendingSharedSettings = null;
      const status = panel.querySelector("#minyaAppearanceStatus");
      if (status) status.textContent = "جاري حفظ الإعدادات لجميع المستخدمين...";
      try {
        settings = await putSharedSettings(snapshot);
        save(settings);
        apply(settings);
        syncControls();
        if (status) status.textContent = "تم حفظ الإعدادات لجميع المستخدمين والأجهزة.";
        return true;
      } catch (error) {
        if (status) status.textContent = error.message || "تعذر حفظ الإعدادات على السيرفر.";
        return false;
      }
    };

    const queueSharedSave = () => {
      pendingSharedSettings = { ...settings };
      if (sharedSaveTimer) clearTimeout(sharedSaveTimer);
      sharedSaveTimer = setTimeout(flushSharedSave, 350);
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
    panel.querySelector("#minyaAppearanceDone")?.addEventListener("click", async () => {
      if (pendingSharedSettings) await flushSharedSave();
      setOpen(false);
    });

    panel.querySelectorAll("[data-typography-preset]").forEach((control) => {
      control.addEventListener("click", () => {
        const preset = control.dataset.typographyPreset;
        if (!typographyPresets[preset]) return;
        settings = normalize({ ...settings, typographyRevision: 2, typographyPreset: preset, ...typographyPresets[preset] });
        save(settings);
        apply(settings);
        syncControls();
        queueSharedSave();
        const status = panel.querySelector("#minyaAppearanceStatus");
        if (status) status.textContent = "تم تطبيق نمط النصوص وحفظه.";
      });
    });

    panel.addEventListener("change", (event) => {
      const key = event.target?.dataset?.appearanceKey || event.target?.dataset?.appearanceNumber;
      if (!key) return;
      if (["remembranceFontSize", ...typographyKeys].includes(key) && event.target?.dataset?.appearanceKey) return;
      const value = numericKeys.includes(key) ? Number(event.target.value) : event.target.value;
      const typographyUpdate = typographyKeys.includes(key) ? { typographyRevision: 2, typographyPreset: "custom" } : {};
      settings = normalize({ ...settings, ...typographyUpdate, [key]: value });
      save(settings);
      apply(settings);
      syncControls();
      queueSharedSave();
      const status = panel.querySelector("#minyaAppearanceStatus");
      if (status) status.textContent = key === "remembranceFontSize"
        ? "حُفظ حجم الذكر وسيظهر في شاشة الانتظار التالية."
        : key === "loadingSeconds"
          ? "حُفظ الإعداد وسيظهر في الصفحة التالية."
          : "تم تطبيق الإعداد وحفظه.";
    });

    panel.addEventListener("input", (event) => {
      const key = event.target?.dataset?.appearanceKey;
      if (!["remembranceFontSize", ...typographyKeys].includes(key)) return;
      const typographyUpdate = typographyKeys.includes(key) ? { typographyRevision: 2, typographyPreset: "custom" } : {};
      settings = normalize({ ...settings, ...typographyUpdate, [key]: Number(event.target.value) });
      save(settings);
      apply(settings);
      syncControls();
      queueSharedSave();
      const status = panel.querySelector("#minyaAppearanceStatus");
      if (status) status.textContent = key === "remembranceFontSize"
        ? "حُفظ حجم الذكر وسيظهر في شاشة الانتظار التالية."
        : "تم تطبيق إعداد النص وحفظه.";
    });

    panel.querySelector("#minyaAppearanceReset")?.addEventListener("click", () => {
      settings = { ...defaults };
      save(settings);
      apply(settings);
      syncControls();
      queueSharedSave();
      const status = panel.querySelector("#minyaAppearanceStatus");
      if (status) status.textContent = "تمت استعادة الإعدادات الافتراضية.";
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });
  }

  async function mountForAdmin() {
    const adminUser = await isAdmin();
    const sharedSettings = await loadSharedSettings(adminUser);
    if (adminUser) mount(sharedSettings);
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
  const pageMap={'/':'home','/report':'report','/archive':'archive','/monthly':'monthly','/annual':'annual','/equipment':'equipment','/weekly':'weekly','/search':'search','/managerial':'managerial','/admin':'admin','/reviews':'reviews','/fleet':'fleet','/maintenance-incidents':'incidents','/environment':'environment','/global-search':'global-search','/ops-dashboard':'ops-dashboard'};
  const page=pageMap[path];if(page)document.body.classList.add(`page-${page}`);
  function displayDate(value){const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(value||'');}
  function replaceIsoText(root){if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(node=>{const parent=node.parentElement;if(!parent||['INPUT','TEXTAREA','OPTION','SCRIPT','STYLE'].includes(parent.tagName))return;const text=node.nodeValue||'';const next=text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,(_,y,m,d)=>`${d}/${m}/${y}`);if(next!==text)node.nodeValue=next;});}
  function polishDynamicText(){if(['/weekly','/equipment','/search'].includes(path))replaceIsoText(document.getElementById('v3Content'));if(path==='/managerial')replaceIsoText(document.getElementById('managerialReport'));if(path==='/admin'){document.querySelectorAll('.v3-panel h3').forEach(h=>{if(h.textContent.trim()==='سجل التعديلات Audit Log'&&!h.querySelector('small'))h.innerHTML='سجل التعديلات <small style="font-size:.62em;color:#7a8794;font-weight:700;">Audit Log</small>';});}}
  document.addEventListener('DOMContentLoaded',()=>{polishDynamicText();const root=document.getElementById('v3Content')||document.body;if(typeof MutationObserver!=='undefined'){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polishDynamicText();});}).observe(root,{childList:true,subtree:true,characterData:true});}});
})();

/* Fleet and council drivers */
(function(){
  const route=location.pathname.replace(/\/+$/,'')||'/';if(route!=='/fleet')return;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const api=async(url,opt)=>{const r=await fetch(url,opt),d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;};
  function exp(days){if(days===null||days===undefined)return'غير محدد';return days<0?`منتهية منذ ${Math.abs(days)} يوم`:`متبقي ${days} يوم`;}
  async function render(){
    const main=document.querySelector('main.container');if(!main)return;
    const [driversData,vehiclesData]=await Promise.all([api('/api/driver-licenses'),api('/api/ops/fleet')]);
    const drivers=driversData.rows||[];let vehicles=vehiclesData.vehicles||[];const editable=Boolean(vehiclesData.permission?.can_edit);
    main.innerHTML=`<section class="v3-page"><div class="v3-hero"><div><span>FLEET</span><h2>المركبات والسائقون</h2><p>مركبات حركة المكب فقط، مع رخص سائقي المجلس ورخص المركبات والتأمين.</p></div></div><div><div id="fleetEditor" class="v3-panel"><h3>إضافة أو تعديل مركبة حركة</h3><div class="v3-form-grid"><label>رقم اللوحة<input id="fp"></label><label>نوع المركبة<input id="ft"></label><label>الموديل<input id="fm"></label><label>السائق من موظفي المجلس<select id="fd"><option value="">بدون سائق</option>${drivers.map(d=>`<option value="${d.id}">${esc(d.name_ar)} - ${esc(d.license_class||'')}</option>`).join('')}</select></label><label>انتهاء رخصة المركبة<input id="fve" type="date"></label><label>انتهاء التأمين<input id="fie" type="date"></label><label>الحالة<select id="fs"><option>تعمل</option><option>متوقفة</option><option>صيانة</option></select></label></div><label>ملاحظات<textarea id="fnotes" rows="2"></textarea></label><div><button id="fsave" class="v3-primary">حفظ</button> <button id="fcancel" type="button">إلغاء التعديل</button> <span id="fmsg"></span></div></div><div class="v3-panel"><div class="v3-filter"><input id="fq" placeholder="بحث بالمركبة أو السائق"><button id="fload">تحديث</button><a href="/drivers-licenses.html" class="v3-link-btn">إدارة رخص السائقين</a></div><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>المركبة</th><th>اللوحة</th><th>السائق</th><th>رخصة السائق</th><th>رخصة المركبة</th><th>التأمين</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody id="fbody"></tbody></table></div></div></div></section>`;
    if(!editable)document.getElementById('fleetEditor').classList.add('hidden');const el=id=>document.getElementById(id);let editing=0;
    const clear=()=>{['fp','ft','fm','fve','fie','fnotes'].forEach(id=>el(id).value='');el('fd').value='';el('fs').value='تعمل';editing=0;el('fsave').textContent='حفظ';};
    function draw(){const q=el('fq').value.trim().toLowerCase();const rows=q?vehicles.filter(x=>[x.plate_number,x.vehicle_type,x.model,x.driver_name].some(v=>String(v||'').toLowerCase().includes(q))):vehicles;el('fbody').innerHTML=rows.length?rows.map(x=>{const driver=drivers.find(d=>Number(d.id)===Number(x.driver_id));return`<tr><td>${esc(x.vehicle_type)}<small>${esc(x.model||'')}</small></td><td>${esc(x.plate_number)}</td><td>${esc(x.driver_name||'-')}</td><td>${esc(x.driver_license_expiry||'-')}<small>${exp(x.driver_license_days)}</small>${driver?.has_image?`<a href="/api/driver-licenses/${driver.id}/image" target="_blank">عرض الرخصة</a>`:''}</td><td>${esc(x.vehicle_license_expiry||'-')}<small>${exp(x.vehicle_license_days)}</small></td><td>${esc(x.insurance_expiry||'-')}<small>${exp(x.insurance_days)}</small></td><td>${esc(x.status||'-')}</td><td>${editable?`<button type="button" data-edit="${x.id}">تعديل</button>`:'قراءة فقط'}</td></tr>`;}).join(''):'<tr><td colspan="8">لا توجد مركبات حركة مسجلة</td></tr>';document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const x=vehicles.find(z=>String(z.id)===b.dataset.edit);editing=x.id;el('fp').value=x.plate_number||'';el('ft').value=x.vehicle_type||'';el('fm').value=x.model||'';el('fd').value=x.driver_id||'';el('fve').value=x.vehicle_license_expiry||'';el('fie').value=x.insurance_expiry||'';el('fs').value=x.status||'تعمل';el('fnotes').value=x.notes||'';el('fsave').textContent='حفظ التعديل';});}
    async function load(){const d=await api(`/api/ops/fleet?q=${encodeURIComponent(el('fq').value)}`);vehicles=d.vehicles||[];draw();}
    el('fsave').onclick=async()=>{try{const body={plate_number:el('fp').value,vehicle_type:el('ft').value,model:el('fm').value,driver_id:el('fd').value||null,vehicle_license_expiry:el('fve').value,insurance_expiry:el('fie').value,status:el('fs').value,notes:el('fnotes').value};await api(editing?`/api/ops/fleet/${editing}`:'/api/ops/fleet',{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});el('fmsg').textContent='تم الحفظ';clear();load();}catch(e){el('fmsg').textContent=e.message;}};el('fcancel').onclick=clear;el('fload').onclick=load;el('fq').oninput=()=>{clearTimeout(window.__fleetSearch);window.__fleetSearch=setTimeout(load,250)};draw();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", revealMinyaApp, { once: true });
  window.addEventListener("load", revealMinyaApp, { once: true });
} else {
  revealMinyaApp();
}

// Safety fallback only if a resource fails to finish loading.
setTimeout(revealMinyaApp, 8000);
