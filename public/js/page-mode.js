/* =========================================================
   تنقل الصفحات ووضع العرض
========================================================= */

(function () {
  const page = document.body?.dataset?.page || "report";

  function buildNavigation() {
    const header = document.querySelector(".top-header");
    if (!header) return;

    let nav = header.querySelector("nav");
    if (!nav) {
      nav = document.createElement("nav");
      header.appendChild(nav);
    }

    const items = [
      ["dashboard", "الرئيسية", "index.html"],
      ["report", "تقرير جديد", "report.html"],
      ["archive", "الأرشيف", "archive.html"],
      ["monthly", "التقرير الشهري", "monthly.html"],
      ["annual", "التقرير السنوي", "annual.html"],
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
    if (typeof loadArchive === "function") setTimeout(() => loadArchive(false), 50);
  }

  function applyPageMode() {
    const archive = document.getElementById("archiveSection");
    const monthly = document.getElementById("monthlyReportSection");
    const archiveTable = document.getElementById("archiveTable");
    const filters = document.querySelector(".archive-filters");
    const archiveSummary = document.querySelector(".archive-summary");

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
      document.documentElement.classList.add("archive-page");
      return;
    }

    if (page === "monthly") {
      if (archiveTable) archiveTable.style.display = "none";
      document.documentElement.classList.add("monthly-page");
      return;
    }

    if (page === "annual") {
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
