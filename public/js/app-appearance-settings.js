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
    color: ["green", "blue", "sand", "purple"],
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
            ${option("green", "أخضر")}${option("blue", "أزرق")}${option("sand", "رملي")}${option("purple", "بنفسجي")}
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
