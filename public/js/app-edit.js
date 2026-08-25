/* =========================================================
   تقرير كامل
========================================================= */

async function getReport(id) {
  const response = await fetch(`${API}/api/reports/${id}`);
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.message || data.error || "فشل تحميل التقرير");
  }
  return data;
}

async function editReport(id) {
  try {
    showMessage("جاري تحميل التقرير للتعديل...");
    const data = await getReport(id);
    editingId = Number(id);

    document.getElementById("reportDate").value = data.report.report_date || "";
    document.getElementById("weather").value = data.report.weather || "";
    document.getElementById("temperature").value = Number(data.report.temperature || 0);
    document.getElementById("startTime").value = data.report.start_time || "";
    document.getElementById("endTime").value = data.report.end_time || "";
    document.getElementById("notes").value = data.report.notes || "";

    crews = data.crews.map((item) => ({
      crew_name: item.crew_name,
      crew_count: Number(item.crew_count || 0),
      notes: item.notes || "",
    }));

    operations = data.operations.map((item) => ({
      operation_name: item.operation_name,
      start_time: item.start_time || "",
      end_time: item.end_time || "",
      vehicle_count: Number(item.vehicle_count || 0),
      quantity: Number(item.quantity || 0),
      unit: item.unit || "",
      notes: item.notes || "",
    }));

    stations = data.stations.map((item) => ({
      station_name: item.station_name,
      truck_count: Number(item.truck_count || 0),
      waste_tons: Number(item.waste_tons || 0),
      unit: item.unit || "طن",
      notes: item.notes || "",
    }));

    equipment = data.equipment.map((item) => ({
      equipment_name: item.equipment_name,
      operating_status: item.operating_status || "يعمل",
      status_description: item.status_description || "",
      working_hours: Number(item.working_hours || 0),
      diesel_liters: Number(item.diesel_liters || 0),
      notes: item.notes || "",
    }));

    renderAll();
    document.getElementById("saveBtn").textContent = "تحديث التقرير";
    window.scrollTo({ top: 0, behavior: "smooth" });
    showMessage(`أنت تعدل التقرير: ${data.report.report_no}`);
  } catch (error) {
    console.error(error);
    showMessage(error.message);
  }
}
