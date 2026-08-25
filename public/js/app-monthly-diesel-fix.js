/* =========================================================
   تصحيح مجاميع السولار الشهرية والأرشيف
   المصدر المعتمد: equipment.diesel_liters داخل كل تقرير
========================================================= */

const _baseCalculateMonthlyReport = calculateMonthlyReport;
const _baseBuildMonthlyReportHtml = buildMonthlyReportHtml;
const _baseRenderArchiveReports = renderArchiveReports;

async function getAccurateDieselData(reports) {
  const detailedReports = await Promise.all(
    reports.map(async (report) => {
      try {
        return await getReport(report.id);
      } catch (error) {
        console.error(`فشل تحميل التقرير ${report.id} لحساب السولار`, error);
        return null;
      }
    })
  );

  const dieselByReportId = new Map();
  let dieselTotal = 0;

  detailedReports.filter(Boolean).forEach((data) => {
    const reportId = Number(data.report?.id || 0);
    const reportDiesel = (data.equipment || []).reduce(
      (sum, item) => sum + Number(item.diesel_liters || 0),
      0
    );

    dieselByReportId.set(reportId, reportDiesel);
    dieselTotal += reportDiesel;
  });

  return {
    dieselTotal,
    dieselByReportId,
  };
}

async function updateMonthlySummary() {
  const monthly = _baseCalculateMonthlyReport();

  const setValue = (id, value) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  };

  setValue("monthlyDaysCount", formatNumber(monthly.days));
  setValue("monthlyWasteTotal", formatNumber(monthly.wasteTotal));
  setValue("monthlyWasteAverage", formatNumber(monthly.wasteAverage));
  setValue("monthlyTrucksTotal", formatNumber(monthly.trucksTotal));
  setValue("monthlyTrucksAverage", formatNumber(monthly.trucksAverage));
  setValue("monthlyMaxWaste", formatNumber(monthly.maxWaste));
  setValue(
    "monthlyMaxWasteDate",
    monthly.maxWasteDate === "-" ? "-" : formatDate(monthly.maxWasteDate)
  );
  setValue("monthlyMinWaste", formatNumber(monthly.minWaste));
  setValue(
    "monthlyMinWasteDate",
    monthly.minWasteDate === "-" ? "-" : formatDate(monthly.minWasteDate)
  );

  if (!monthly.month || monthly.reports.length === 0) {
    setValue("monthlyDieselTotal", "0");
    setValue("monthlyDieselAverage", "0");
    return;
  }

  try {
    const diesel = await getAccurateDieselData(monthly.reports);
    const dieselAverage =
      monthly.days > 0 ? diesel.dieselTotal / monthly.days : 0;

    setValue("monthlyDieselTotal", formatNumber(diesel.dieselTotal));
    setValue("monthlyDieselAverage", formatNumber(dieselAverage));
  } catch (error) {
    console.error("فشل تحديث ملخص السولار الشهري", error);
    setValue("monthlyDieselTotal", formatNumber(monthly.dieselTotal));
    setValue("monthlyDieselAverage", formatNumber(monthly.dieselAverage));
  }
}

async function refreshArchiveDieselAccurate() {
  const dateFilter =
    document.getElementById("archiveDateFilter")?.value || "";
  const monthFilter =
    document.getElementById("archiveMonthFilter")?.value || "";

  let filteredReports = [...archiveReports];

  if (dateFilter) {
    filteredReports = filteredReports.filter(
      (report) => report.report_date === dateFilter
    );
  }

  if (monthFilter) {
    filteredReports = filteredReports.filter((report) =>
      String(report.report_date || "").startsWith(monthFilter)
    );
  }

  const target = document.getElementById("archiveDieselTotal");
  if (!target) return;

  if (filteredReports.length === 0) {
    target.textContent = "0";
    return;
  }

  try {
    const diesel = await getAccurateDieselData(filteredReports);
    target.textContent = formatNumber(diesel.dieselTotal);
  } catch (error) {
    console.error("فشل تحديث مجموع سولار الأرشيف", error);
  }
}

function renderArchiveReports() {
  _baseRenderArchiveReports();
  refreshArchiveDieselAccurate();
}

async function buildMonthlyReportHtml() {
  const monthly = _baseCalculateMonthlyReport();

  if (!monthly.month || monthly.reports.length === 0) {
    return null;
  }

  let diesel;

  try {
    diesel = await getAccurateDieselData(monthly.reports);
  } catch (error) {
    console.error("فشل حساب سولار التقرير الشهري للطباعة", error);
    return _baseBuildMonthlyReportHtml();
  }

  const correctedReports = monthly.reports.map((report) => ({
    ...report,
    total_diesel: diesel.dieselByReportId.has(Number(report.id))
      ? diesel.dieselByReportId.get(Number(report.id))
      : Number(report.total_diesel || 0),
  }));

  const correctedMonthly = {
    ...monthly,
    reports: correctedReports,
    dieselTotal: diesel.dieselTotal,
    dieselAverage:
      monthly.days > 0 ? diesel.dieselTotal / monthly.days : 0,
  };

  const savedCalculateMonthlyReport = calculateMonthlyReport;

  try {
    calculateMonthlyReport = () => correctedMonthly;
    return await _baseBuildMonthlyReportHtml();
  } finally {
    calculateMonthlyReport = savedCalculateMonthlyReport;
  }
}
