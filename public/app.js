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

/* MINYA_MODULES_START */
[
  "js/app-auth.js",
  "js/app-core.js",
  "js/app-form.js",
  "js/app-monthly.js",
  "js/app-edit.js",
  "js/app-print-daily.js",
  "js/app-print-monthly.js",
  "js/app-final.js",
  "js/app-monthly-chart-stable10.js",
  "js/app-annual-export.js",
  "js/app-print-annual.js",
  "js/app-annual-comparison.js",
  "js/app-annual-insights.js",
  "js/app-annual-loader.js",
  "js/app-period-linked-summary.js",
  "js/app-archive-search.js",
  "js/app-archive-pagination.js",
  "js/page-mode.js",
  "js/app-smart-status.js",
  "js/app-notification-center.js",
  "js/app-modern-charts.js",
  "js/app-monthly-table.js",
  "js/app-today-dashboard.js",
  "js/app-executive-dashboard.js",
  "js/app-system-link.js",
  "js/app-credit.js",
  "js/app-v3-pages.js",
  "js/app-driver-license-badge.js",
  "js/app-report-attachments.js",
  "js/app-permissions-ui.js",
  "js/app-admin-audit.js",
  "js/app-admin-security.js",
  "js/app-admin-users.js",
  "js/app-excel-import.js",
  "js/app-report-workflow.js",
  "js/app-reviews.js",
  "js/app-logout-header.js",
  "js/app-review-print.js",
  "js/app-site-review-print.js",
  "js/app-header-menu.js",
  "js/app-ui-enhancements.js",
  "js/app-english-digits.js",
  "js/app-date-display.js",
  "js/app-appearance-settings.js",
  "js/app-review-polish.js"
].forEach((src) => {
  const versionedSrc = `${src}?v=${MINYA_ASSET_VERSION}`;
  document.write(`<script defer src="${versionedSrc}"><\/script>`);
});
/* MINYA_MODULES_END */

/* MINYA_STYLES_START */
[
  "multipage.css",
  "smart-status.css",
  "appearance-settings.css",
  "notification-center.css",
  "modern-charts.css",
  "today-dashboard.css",
  "executive-dashboard.css",
  "v3.css",
  "report-attachments.css",
  "edit-flow.css",
  "admin-audit.css",
  "admin-security.css",
  "admin-users.css",
  "excel-import.css",
  "report-workflow.css",
  "reviews.css",
  "report-responsive.css",
  "archive-mobile.css",
  "calm-theme.css",
  "premium-theme.css",
  "compact-theme.css",
  "header-tone.css",
  "account-position.css",
  "header-compact.css",
  "hero-clarity.css",
  "desktop-nav-hero.css",
  "final-ui-stabilize.css",
  "report-mobile-scroll.css",
  "mobile-vertical-menu.css",
  "ui-polish-v2.css",
  "ui-polish-v3.css",
  "system-polish-final.css",
  "dashboard-metrics-fix.css",
  "review-polish.css",
  "appearance-day.css",
  "appearance-night.css",
  "period-linked-summary.css"
].forEach((href) => {
  if (!document.querySelector(`link[href^="${href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${href}?v=${MINYA_ASSET_VERSION}`;
    document.head.appendChild(link);
  }
});
/* MINYA_STYLES_END */

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
