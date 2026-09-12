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
