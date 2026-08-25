/* =========================================================
   حذف
========================================================= */

async function deleteReport(id) {
  const confirmation = confirm("هل تريد حذف هذا التقرير نهائيًا؟");
  if (!confirmation) return;

  try {
    const response = await fetch(`${API}/api/reports/${id}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      showMessage(data.message || "فشل حذف التقرير");
      return;
    }

    if (editingId === Number(id)) {
      editingId = null;
      document.getElementById("saveBtn").textContent = "حفظ التقرير";
    }

    await loadArchive(false);
    showMessage("تم حذف التقرير بنجاح");
  } catch (error) {
    console.error(error);
    showMessage("حدث خطأ أثناء حذف التقرير");
  }
}

function resetNewReport() {
  editingId = null;
  document.getElementById("reportDate").value = "";
  document.getElementById("weather").value = "مشمس";
  document.getElementById("temperature").value = 10;
  document.getElementById("startTime").value = "04:00";
  document.getElementById("endTime").value = "19:00";
  document.getElementById("notes").value = "";

  crews = getDefaultCrews();
  operations = getDefaultOperations();
  stations = getDefaultStations();
  equipment = getDefaultEquipment();

  renderAll();
  document.getElementById("saveBtn").textContent = "حفظ التقرير";
  showMessage("تقرير جديد");
}

document.getElementById("archiveDateFilter")?.addEventListener("change", () => {
  renderArchiveReports();
});

document.getElementById("archiveMonthFilter")?.addEventListener("change", () => {
  renderArchiveReports();
  updateMonthlySummary();
});

document.getElementById("clearArchiveFiltersBtn")?.addEventListener("click", () => {
  document.getElementById("archiveDateFilter").value = "";
  document.getElementById("archiveMonthFilter").value = "";
  renderArchiveReports();
  updateMonthlySummary();
});

document.getElementById("saveBtn").addEventListener("click", saveReport);
document.getElementById("archiveBtn").addEventListener("click", () => loadArchive(true));
document.getElementById("newReportBtn").addEventListener("click", resetNewReport);
document.getElementById("printMonthlyReportBtn")?.addEventListener("click", printMonthlyReport);

window.openReport = openReport;
window.editReport = editReport;
window.printReport = printReport;
window.deleteReport = deleteReport;
window.printMonthlyReport = printMonthlyReport;

renderAll();
