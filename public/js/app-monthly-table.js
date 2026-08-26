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

    body.innerHTML = '<tr><td colspan="4">جاري تحميل تفاصيل الشهر...</td></tr>';

    const details = await Promise.all(
      reports.map((report) =>
        typeof getReport === "function"
          ? getReport(report.id).catch(() => null)
          : Promise.resolve(null)
      )
    );

    const dieselValues = reports.map((report, index) => {
      const detail = details[index];
      if (!detail) return Number(report.total_diesel || 0);
      return (detail.equipment || []).reduce(
        (sum, item) => sum + Number(item.diesel_liters || 0),
        0
      );
    });

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
