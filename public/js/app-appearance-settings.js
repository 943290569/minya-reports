/* =========================================================
   إعدادات المظهر المشتركة لكل المستخدمين
========================================================= */

(function () {
  const storageKey = "minya_appearance_settings_v1";
  const defaults = {
    loadingSeconds: 3,
    remembranceFontSize: 72,
    remembranceFontRevision: 2,
    siteFontSize: 16,
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
    remembranceFontRevision: [2],
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
      if (["remembranceFontSize", "siteFontSize"].includes(key)) {
        const size = Math.round(Number(input?.[key]));
        const maximum = key === "remembranceFontSize" ? 72 : 30;
        if (Number.isFinite(size)) output[key] = Math.min(maximum, Math.max(11, size));
        return;
      }
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
    root.style.setProperty("--appearance-font-size", `${settings.siteFontSize}px`);
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
      <div class="appearance-grid">
        <label>مدة ظهور الذكر
          <select data-appearance-key="loadingSeconds">
            ${option("1", "ثانية واحدة")}${option("2", "ثانيتان")}${option("3", "3 ثوانٍ")}${option("4", "4 ثوانٍ")}${option("5", "5 ثوانٍ")}
          </select>
          <small>تُطبق عند فتح الصفحة التالية.</small>
        </label>
        <label class="appearance-range-field">حجم خط الأذكار
          <div class="appearance-range-row">
            <input type="range" min="11" max="72" step="1" data-appearance-key="remembranceFontSize" aria-label="حجم خط الأذكار">
            <div class="appearance-number-box"><input type="number" min="11" max="72" step="1" value="72" data-appearance-number="remembranceFontSize" aria-label="قيمة حجم خط الأذكار"><span>بكسل</span></div>
          </div>
          <p class="appearance-remembrance-preview" data-remembrance-preview>سبحان الله وبحمده</p>
          <small>من 11 إلى 72 بكسل. يعرض المثال الحجم المختار.</small>
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
        <label class="appearance-range-field">حجم خط بيانات الموقع
          <div class="appearance-range-row">
            <input type="range" min="11" max="30" step="1" data-appearance-key="siteFontSize" aria-label="حجم خط بيانات الموقع">
            <div class="appearance-number-box"><input type="number" min="11" max="30" step="1" value="16" data-appearance-number="siteFontSize" aria-label="قيمة حجم خط بيانات الموقع"><span>بكسل</span></div>
          </div>
          <small>من 11 إلى 30 بكسل. يُطبق مباشرة على الصفحة.</small>
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

    panel.addEventListener("change", (event) => {
      const key = event.target?.dataset?.appearanceKey || event.target?.dataset?.appearanceNumber;
      if (!key) return;
      if (["remembranceFontSize", "siteFontSize"].includes(key) && event.target?.dataset?.appearanceKey) return;
      const value = ["loadingSeconds", "remembranceFontSize", "siteFontSize"].includes(key) ? Number(event.target.value) : event.target.value;
      settings = normalize({ ...settings, [key]: value });
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
      if (!["remembranceFontSize", "siteFontSize"].includes(key)) return;
      settings = normalize({ ...settings, [key]: Number(event.target.value) });
      save(settings);
      apply(settings);
      syncControls();
      queueSharedSave();
      const status = panel.querySelector("#minyaAppearanceStatus");
      if (status) status.textContent = key === "remembranceFontSize"
        ? "حُفظ حجم الذكر وسيظهر في شاشة الانتظار التالية."
        : "تم تطبيق حجم خط بيانات الموقع وحفظه.";
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
