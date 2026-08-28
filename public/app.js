// Minya Landfill app loader
const MINYA_ASSET_VERSION = "3.2.0-modern-ui-v4";
const MINYA_LOADING_STARTED_AT = Date.now();
const MINYA_LOADING_MIN_MS = 150;

(function mountMinyaLoadingScreen(){
  const messages = [
    "لا تنسَ ذكر الله",
    "صلِّ على النبي ﷺ",
    "سبحان الله وبحمده",
    "الحمد لله",
    "لا إله إلا الله"
  ];

  const chosen = messages[Math.floor(Math.random() * messages.length)];

  const style = document.createElement("style");
  style.id = "minyaLoadingStyle";
  style.textContent = `
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
      visibility: visible;
    }
    #minyaLoadingScreen .minya-loading-card {
      text-align: center;
      padding: 28px 36px;
    }
    #minyaLoadingScreen .minya-loading-message {
      margin: 0;
      color: #176b4f;
      font-size: clamp(30px, 5vw, 54px);
      font-weight: 800;
      line-height: 1.45;
      letter-spacing: -.4px;
    }
    #minyaLoadingScreen .minya-loading-dot {
      width: 8px;
      height: 8px;
      margin: 20px auto 0;
      border-radius: 50%;
      background: #176b4f;
      animation: minyaLoadingPulse .5s ease-in-out infinite alternate;
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

[
  "js/app-auth.js",
  "js/app-core.js",
  "js/app-form.js",
  "js/app-monthly.js",
  "js/app-edit.js",
  "js/app-print-daily.js",
  "js/app-print-monthly.js",
  "js/app-final.js",
  "js/app-annual-export.js",
  "js/app-print-annual.js",
  "js/app-annual-comparison.js",
  "js/app-annual-insights.js",
  "js/app-annual-loader.js",
  "js/app-archive-search.js",
  "js/app-archive-pagination.js",
  "js/page-mode.js",
  "js/app-smart-status.js",
  "js/app-modern-charts.js",
  "js/app-monthly-table.js",
  "js/app-executive-dashboard.js",
  "js/app-system-link.js",
  "js/app-credit.js",
  "js/app-v3-pages.js",
  "js/app-report-attachments.js",
  "js/app-permissions-ui.js",
  "js/app-admin-audit.js",
  "js/app-admin-security.js",
  "js/app-admin-users.js",
  "js/app-report-workflow.js",
  "js/app-reviews.js",
  "js/app-logout-header.js",
  "js/app-review-print.js"
].forEach((src) => {
  const versionedSrc = `${src}?v=${MINYA_ASSET_VERSION}`;
  document.write(`<script src="${versionedSrc}"><\/script>`);
});

[
  "modern-charts.css",
  "executive-dashboard.css",
  "v3.css",
  "report-attachments.css",
  "edit-flow.css",
  "admin-audit.css",
  "admin-security.css",
  "admin-users.css",
  "report-workflow.css",
  "reviews.css",
  "report-responsive.css",
  "archive-mobile.css",
  "calm-theme.css"
].forEach((href) => {
  if (!document.querySelector(`link[href^="${href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${href}?v=${MINYA_ASSET_VERSION}`;
    document.head.appendChild(link);
  }
});

function revealMinyaApp(){
  const elapsed = Date.now() - MINYA_LOADING_STARTED_AT;
  const delay = Math.max(0, MINYA_LOADING_MIN_MS - elapsed);

  setTimeout(() => {
    const screen = document.getElementById("minyaLoadingScreen");
    if (screen) {
      screen.style.transition = "opacity .08s ease";
      screen.style.opacity = "0";
      setTimeout(() => screen.remove(), 90);
    }

    const style = document.getElementById("minyaLoadingStyle");
    if (style) setTimeout(() => style.remove(), 100);
  }, delay);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", revealMinyaApp, { once: true });
} else {
  revealMinyaApp();
}

setTimeout(revealMinyaApp, 1200);
