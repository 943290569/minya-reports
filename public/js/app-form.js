/* =========================================================
   تحديث الحقول
========================================================= */

document.addEventListener(
  "input",
  (event) => {
    const element =
      event.target;

    if (!element.dataset) return;

    const type =
      element.dataset.type;

    const index =
      Number(
        element.dataset.index
      );

    const field =
      element.dataset.field;

    if (
      !type ||
      Number.isNaN(index) ||
      !field
    ) {
      return;
    }

    let value =
      element.value;

    const numericFields = [
      "crew_count",
      "vehicle_count",
      "quantity",
      "truck_count",
      "waste_tons",
      "working_hours",
      "diesel_liters",
    ];

    if (
      numericFields.includes(field)
    ) {
      value =
        Number(value || 0);
    }

    if (type === "crew") {
      crews[index][field] =
        value;
    }

    if (type === "operation") {
      operations[index][field] =
        value;
    }

    if (type === "station") {
      stations[index][field] =
        value;
    }

    if (type === "equipment") {
      equipment[index][field] =
        value;
    }

    updateDailySummary();
  }
);

document.addEventListener(
  "change",
  (event) => {
    const element =
      event.target;

    if (!element.dataset) return;

    const type =
      element.dataset.type;

    const index =
      Number(
        element.dataset.index
      );

    const field =
      element.dataset.field;

    if (
      type === "equipment" &&
      !Number.isNaN(index) &&
      field
    ) {
      equipment[index][field] =
        element.value;
    }

    updateDailySummary();
  }
);

/* =========================================================
   Payload
========================================================= */

function buildPayload() {
  const totals =
    calculateTotals();

  return {
    report_date:
      document.getElementById(
        "reportDate"
      ).value,

    weather:
      document.getElementById(
        "weather"
      ).value,

    temperature: Number(
      document.getElementById(
        "temperature"
      ).value || 0
    ),

    start_time:
      document.getElementById(
        "startTime"
      ).value,

    end_time:
      document.getElementById(
        "endTime"
      ).value,

    total_trucks:
      totals.total_trucks,

    total_waste_tons:
      totals.total_waste_tons,

    total_diesel:
      totals.total_diesel,

    notes:
      document.getElementById(
        "notes"
      ).value,

    crews,
    operations,
    stations,
    equipment,
  };
}

/* =========================================================
   حفظ وتحديث
========================================================= */

async function saveReport() {
  try {
    const wasEditing =
      editingId !== null;

    showMessage(
      wasEditing
        ? "جاري تحديث التقرير..."
        : "جاري حفظ التقرير..."
    );

    const payload =
      buildPayload();

    if (!payload.report_date) {
      showMessage(
        "أدخل تاريخ التقرير"
      );

      return;
    }

    const url =
      wasEditing
        ? `${API}/api/reports/${editingId}`
        : `${API}/api/reports`;

    const method =
      wasEditing
        ? "PUT"
        : "POST";

    const response =
      await fetch(
        url,
        {
          method,

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.ok
    ) {
      showMessage(
        data.message ||
          data.error ||
          "فشل حفظ التقرير"
      );

      return;
    }

    editingId =
      Number(
        data.report.id
      );

    document.getElementById(
      "saveBtn"
    ).textContent =
      "تحديث التقرير";

    updateDailySummary();

    if (wasEditing) {
      await loadArchive(false);

      showMessage(
        `تم تحديث التقرير بنجاح. رقم التقرير: ${
          data.report.report_no ||
          data.report.id
        }`
      );
    } else {
      showMessage(
        `تم حفظ التقرير بنجاح. رقم التقرير: ${
          data.report.report_no ||
          data.report.id
        }`
      );
    }
  } catch (error) {
    console.error(error);

    showMessage(
      "حدث خطأ أثناء الاتصال بالسيرفر"
    );
  }
}
