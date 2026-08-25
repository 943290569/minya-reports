/* =========================================================
   حساب التقرير الشهري
========================================================= */
async function getMonthlyDetailedReports(monthValue) {
  const monthlyReports = archiveReports.filter(
    (report) =>
      String(report.report_date || "").startsWith(monthValue)
  );

  const detailedReports = await Promise.all(
    monthlyReports.map(async (report) => {
      try {
        return await getReport(report.id);
      } catch (error) {
        console.error(
          `فشل تحميل التقرير ${report.id}`,
          error
        );

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
    const operations = data.operations || [];

    operations.forEach((item) => {
      const name = String(item.operation_name || "").trim();

      if (name === "مواد التغطية (اسلوب)") {
        totals.coverAslobVehicles += Number(item.vehicle_count || 0);
        totals.coverAslobQuantity += Number(item.quantity || 0);
      }

      if (name === "مواد التغطية (طمم)") {
        totals.coverTammVehicles += Number(item.vehicle_count || 0);
        totals.coverTammQuantity += Number(item.quantity || 0);
      }

      if (name === "كميات المياه للتعقيم والترطيب") {
        totals.waterVehicles += Number(item.vehicle_count || 0);
        totals.waterQuantity += Number(item.quantity || 0);
      }

      if (name === "عدد مرات رش المياه") {
        totals.waterSprays += Number(item.quantity || 0);
      }

      if (name === "كميات العصارة المرحلة") {
        totals.leachateVehicles += Number(item.vehicle_count || 0);
        totals.leachateQuantity += Number(item.quantity || 0);
      }

      if (name === "خط الفرز") {
        totals.sortingVehicles += Number(item.vehicle_count || 0);
        totals.sortingQuantity += Number(item.quantity || 0);
      }

      if (name === "طمم خارجي") {
        totals.externalTammVehicles += Number(item.vehicle_count || 0);
        totals.externalTammQuantity += Number(item.quantity || 0);
      }
    });
  });

  return totals;
}

async function buildMonthlyOperationsData() {
  const monthValue =
    document.getElementById("archiveMonthFilter")?.value || "";

  if (!monthValue) {
    return null;
  }

  const detailedReports =
    await getMonthlyDetailedReports(monthValue);

  const operationsTotals =
    calculateMonthlyOperations(detailedReports);

  return {
    monthValue,
    detailedReports,
    operationsTotals,
  };
}

function calculateMonthlyReport() {
  const monthValue =
    document.getElementById("archiveMonthFilter")?.value || "";

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

  const reports = archiveReports.filter(
    (report) =>
      String(report.report_date || "").startsWith(monthValue)
  );

  const days = reports.length;

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

  const wasteAverage = days > 0 ? wasteTotal / days : 0;
  const trucksAverage = days > 0 ? trucksTotal / days : 0;
  const dieselAverage = days > 0 ? dieselTotal / days : 0;

  let maxReport = null;
  let minReport = null;

  if (reports.length > 0) {
    maxReport = reports.reduce((max, report) =>
      Number(report.total_waste_tons || 0) >
      Number(max.total_waste_tons || 0)
        ? report
        : max
    );

    minReport = reports.reduce((min, report) =>
      Number(report.total_waste_tons || 0) <
      Number(min.total_waste_tons || 0)
        ? report
        : min
    );
  }

  return {
    month: monthValue,
    reports,
    days,
    wasteTotal,
    wasteAverage,
    trucksTotal,
    trucksAverage,
    dieselTotal,
    dieselAverage,
    maxWaste: maxReport ? Number(maxReport.total_waste_tons || 0) : 0,
    maxWasteDate: maxReport ? maxReport.report_date : "-",
    minWaste: minReport ? Number(minReport.total_waste_tons || 0) : 0,
    minWasteDate: minReport ? minReport.report_date : "-",
  };
}

function updateMonthlySummary() {
  const monthly = calculateMonthlyReport();

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
  setValue("monthlyDieselTotal", formatNumber(monthly.dieselTotal));
  setValue("monthlyDieselAverage", formatNumber(monthly.dieselAverage));
  setValue("monthlyMaxWaste", formatNumber(monthly.maxWaste));
  setValue("monthlyMaxWasteDate", monthly.maxWasteDate === "-" ? "-" : formatDate(monthly.maxWasteDate));
  setValue("monthlyMinWaste", formatNumber(monthly.minWaste));
  setValue("monthlyMinWasteDate", monthly.minWasteDate === "-" ? "-" : formatDate(monthly.minWasteDate));
}

function renderArchiveReports() {
  const dateFilter = document.getElementById("archiveDateFilter")?.value || "";
  const monthFilter = document.getElementById("archiveMonthFilter")?.value || "";

  let filteredReports = [...archiveReports];

  if (dateFilter) {
    filteredReports = filteredReports.filter(
      (report) => report.report_date === dateFilter
    );
  }

  if (monthFilter) {
    filteredReports = filteredReports.filter(
      (report) => String(report.report_date || "").startsWith(monthFilter)
    );
  }

  const wasteTotal = filteredReports.reduce(
    (sum, report) => sum + Number(report.total_waste_tons || 0),
    0
  );
  const trucksTotal = filteredReports.reduce(
    (sum, report) => sum + Number(report.total_trucks || 0),
    0
  );
  const dieselTotal = filteredReports.reduce(
    (sum, report) => sum + Number(report.total_diesel || 0),
    0
  );

  document.getElementById("archiveReportsCount").textContent = filteredReports.length;
  document.getElementById("archiveWasteTotal").textContent = formatNumber(wasteTotal);
  document.getElementById("archiveTrucksTotal").textContent = formatNumber(trucksTotal);
  document.getElementById("archiveDieselTotal").textContent = formatNumber(dieselTotal);

  archiveBody.innerHTML =
    filteredReports.length === 0
      ? `<tr><td colspan="6">لا توجد تقارير مطابقة</td></tr>`
      : filteredReports
          .map(
            (report) => `
            <tr>
              <td>${escapeHtml(report.report_no)}</td>
              <td>${formatDate(report.report_date)}</td>
              <td>${formatNumber(report.total_waste_tons)}</td>
              <td>${formatNumber(report.total_trucks)}</td>
              <td>${formatNumber(report.total_diesel)}</td>
              <td>
                <button onclick="openReport(${report.id})">فتح</button>
                <button onclick="editReport(${report.id})">تعديل</button>
                <button onclick="printReport(${report.id})">طباعة</button>
                <button onclick="deleteReport(${report.id})" style="background:#b91c1c">حذف</button>
              </td>
            </tr>`
          )
          .join("");

  updateMonthlySummary();
}

async function loadArchive(showStatus = true) {
  try {
    if (showStatus) {
      showMessage("جاري تحميل الأرشيف...");
    }

    const response = await fetch(`${API}/api/reports`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      showMessage(data.message || "فشل تحميل الأرشيف");
      return;
    }

    archiveReports = data.reports || [];
    renderArchiveReports();

    document.getElementById("archiveSection").classList.remove("hidden");

    if (showStatus) {
      showMessage(`تم تحميل ${archiveReports.length} تقرير`);
    }
  } catch (error) {
    console.error(error);
    showMessage("حدث خطأ أثناء تحميل الأرشيف");
  }
}
