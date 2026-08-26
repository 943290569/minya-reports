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
    const reportDiesel = (data.equipment || []).reduce(
      (sum, item) => sum + Number(item.diesel_liters || 0),
      0
    );

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

  try {
    const detailedReports = await getMonthlyDetailedReports(monthly.month);
    const { dieselTotal } = calculateDieselFromDetailedReports(detailedReports);
    setValue("monthlyDieselTotal", formatNumber(dieselTotal));
    setValue("monthlyDieselAverage", formatNumber(monthly.days ? dieselTotal / monthly.days : 0));
    await updateMonthlyComparison(monthly.month, dieselTotal);
  } catch (error) {
    console.error("فشل حساب السولار الشهري", error);
    setValue("monthlyDieselTotal", formatNumber(monthly.dieselTotal));
    setValue("monthlyDieselAverage", formatNumber(monthly.dieselAverage));
    await updateMonthlyComparison(monthly.month, monthly.dieselTotal);
  }
}

async function refreshArchiveDiesel(filteredReports) {
  const target = document.getElementById("archiveDieselTotal");
  if (!target) return;
  if (!filteredReports.length) {
    target.textContent = "0";
    return;
  }

  try {
    const detailedReports = await Promise.all(
      filteredReports.map((report) => getReport(report.id).catch(() => null))
    );
    const { dieselTotal } = calculateDieselFromDetailedReports(detailedReports.filter(Boolean));
    target.textContent = formatNumber(dieselTotal);
  } catch (error) {
    console.error("فشل حساب سولار الأرشيف", error);
  }
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
          <button onclick="openReport(${report.id})">فتح</button>
          <button onclick="editReport(${report.id})">تعديل</button>
          <button onclick="printReport(${report.id})">طباعة</button>
          <button onclick="deleteReport(${report.id})" style="background:#b91c1c">حذف</button>
        </td>
      </tr>`).join("");

  refreshArchiveDiesel(filteredReports);
  updateMonthlySummary();
}

async function loadArchive(showStatus = true) {
  try {
    if (showStatus) showMessage("جاري تحميل الأرشيف...");

    const response = await fetch(`${API}/api/reports`);
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
