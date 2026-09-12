(() => {
  const $ = (id) => document.getElementById(id);
  const state = { entries: [], summary: {}, sources: [], associations: [], editingId: null, preview: [], previewFormat: "", canEdit: false, isAdmin: false };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const clean = (value) => String(value ?? "").replace(/[\u200e\u200f\u202a-\u202e]/g, "").trim();
  const companyName = (value) => clean(value).replace(/^شركة\s+/i, "");
  const formatNumber = (value) => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const formatDate = (value) => { const parts = String(value || "").split("-"); return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value || "-"); };
  const monthLabel = (value) => { const [year, month] = String(value || "").split("-"); return month && year ? `شهر ${Number(month)}/${year}` : "الفترة غير محددة"; };
  const currentMonth = () => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit" }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}`;
  };
  async function api(url, options = {}) {
    const response = await fetch(url, { headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || "تعذر تنفيذ العملية");
    return data;
  }
  function message(id, text, type = "") { const node = $(id); node.textContent = text || ""; node.className = `ed-message ${type}`.trim(); }
  function selectedSource() { return clean($("edFilterSource").value); }
  function selectedMonth() { return $("edReportMonth").value; }
  function syncPeriod() {
    const source = selectedSource();
    const month = selectedMonth();
    $("edPeriodBadge").textContent = monthLabel(month);
    $("edListTitle").textContent = source ? `كشف تعبئة السولار لشركة ${companyName(source)}` : "كشف السولار المعبأ للشركات";
    $("edListSubtitle").textContent = `${monthLabel(month)}${source ? ` · ${source}` : " · حدد الشركة"}`;
    if (!state.editingId && source) $("edSource").value = source;
    if (!state.editingId && month && !String($("edDate").value || "").startsWith(month)) $("edDate").value = `${month}-01`;
    if ($("edQuickCompany")) $("edQuickCompany").textContent = source || "حدد الشركة";
    if ($("edQuickMonth")) $("edQuickMonth").textContent = monthLabel(month);
    if (state.associations.length) renderSuggestions();
  }
  function renderSources() {
    $("edSources").innerHTML = state.sources.map((item) => `<option value="${esc(item.source_name)}">${formatNumber(item.total_liters)} لتر</option>`).join("");
  }
  const lookupKey = (value) => clean(value).toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/\s+/g, " ");
  function rankedAssociations() {
    const sourceKey = lookupKey(selectedSource());
    return [...state.associations].sort((left, right) => Number(lookupKey(right.source_name) === sourceKey) - Number(lookupKey(left.source_name) === sourceKey));
  }
  function renderSuggestions() {
    const drivers = new Map();
    const vehicles = new Map();
    rankedAssociations().forEach((pair) => {
      if (!drivers.has(pair.driver_name)) drivers.set(pair.driver_name, pair.vehicle_number);
      if (!vehicles.has(pair.vehicle_number)) vehicles.set(pair.vehicle_number, pair.driver_name);
    });
    $("edDrivers").innerHTML = [...drivers].map(([driver, vehicle]) => `<option value="${esc(driver)}">آخر مركبة ${esc(vehicle)}</option>`).join("");
    $("edVehicles").innerHTML = [...vehicles].map(([vehicle, driver]) => `<option value="${esc(vehicle)}">آخر سائق ${esc(driver)}</option>`).join("");
  }
  async function loadSuggestions() {
    const data = await api("/api/external-diesel/suggestions");
    state.associations = data.pairs || [];
    renderSuggestions();
  }
  function pairForDriver(value) {
    const key = lookupKey(value);
    return key ? rankedAssociations().find((pair) => lookupKey(pair.driver_name) === key) : null;
  }
  function pairForVehicle(value) {
    const key = lookupKey(value);
    return key ? rankedAssociations().find((pair) => lookupKey(pair.vehicle_number) === key) : null;
  }
  function applyDriverSuggestion(driverInput, vehicleInput) {
    const pair = pairForDriver(driverInput.value);
    if (pair && (!clean(vehicleInput.value) || vehicleInput.dataset.suggested === "true")) {
      vehicleInput.value = pair.vehicle_number;
      vehicleInput.dataset.suggested = "true";
    }
  }
  function applyVehicleSuggestion(vehicleInput, driverInput) {
    const pair = pairForVehicle(vehicleInput.value);
    if (pair && (!clean(driverInput.value) || driverInput.dataset.suggested === "true")) {
      driverInput.value = pair.driver_name;
      driverInput.dataset.suggested = "true";
    }
  }
  function incrementReceipt(value) {
    const text = clean(value);
    if (!/^\d+$/.test(text)) return "";
    try { return String(BigInt(text) + 1n).padStart(text.length, "0"); }
    catch (_) { return ""; }
  }
  function lastQuickDefaults() {
    const rows = [...$("edQuickBody").querySelectorAll("tr")];
    const previous = rows[rows.length - 1];
    if (previous) return {
      entry_date: previous.querySelector('[data-field="entry_date"]').value,
      receipt_number: incrementReceipt(previous.querySelector('[data-field="receipt_number"]').value)
    };
    const previousEntry = state.entries[state.entries.length - 1];
    const month = selectedMonth();
    return {
      entry_date: previousEntry?.entry_date?.startsWith(month) ? previousEntry.entry_date : (month ? `${month}-01` : ""),
      receipt_number: incrementReceipt(previousEntry?.receipt_number || "")
    };
  }
  function updateQuickTotal() {
    const rows = [...$("edQuickBody").querySelectorAll("tr")];
    const active = rows.filter((row) => ["driver_name", "vehicle_number", "quantity_liters", "receipt_number", "notes"].some((field) => clean(row.querySelector(`[data-field="${field}"]`).value)));
    const liters = active.reduce((sum, row) => sum + Number(row.querySelector('[data-field="quantity_liters"]').value || 0), 0);
    $("edQuickRowsCount").textContent = formatNumber(active.length);
    $("edQuickLiters").textContent = formatNumber(liters);
  }
  function bindQuickRow(row) {
    const fields = [...row.querySelectorAll("input[data-field]")];
    const driver = row.querySelector('[data-field="driver_name"]');
    const vehicle = row.querySelector('[data-field="vehicle_number"]');
    driver.addEventListener("input", () => { driver.dataset.suggested = ""; applyDriverSuggestion(driver, vehicle); updateQuickTotal(); });
    vehicle.addEventListener("input", () => { vehicle.dataset.suggested = ""; applyVehicleSuggestion(vehicle, driver); updateQuickTotal(); });
    fields.forEach((input, index) => {
      input.addEventListener("input", updateQuickTotal);
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        if (fields[index + 1]) fields[index + 1].focus();
        else { const next = addQuickRow(); next.querySelector('[data-field="driver_name"]').focus(); }
      });
    });
    row.querySelector("[data-remove-row]").addEventListener("click", () => {
      row.remove();
      if (!$("edQuickBody").children.length) addQuickRow();
      updateQuickTotal();
    });
  }
  function addQuickRow(values = {}) {
    const defaults = lastQuickDefaults();
    const row = document.createElement("tr");
    row.innerHTML = `<td data-label="التاريخ"><input data-field="entry_date" type="date" value="${esc(values.entry_date || defaults.entry_date)}"></td><td data-label="اسم السائق"><input data-field="driver_name" list="edDrivers" autocomplete="off" placeholder="اكتب أول حرف" value="${esc(values.driver_name || "")}"></td><td data-label="رقم المركبة"><input data-field="vehicle_number" list="edVehicles" autocomplete="off" inputmode="numeric" placeholder="اكتب أول رقم" value="${esc(values.vehicle_number || "")}"></td><td data-label="الكمية لتر"><input data-field="quantity_liters" type="number" min="0.01" max="50000" step="0.01" value="${esc(values.quantity_liters || "")}"></td><td data-label="رقم الوصل"><input data-field="receipt_number" inputmode="numeric" value="${esc(values.receipt_number || defaults.receipt_number)}"></td><td data-label="ملاحظات"><input data-field="notes" value="${esc(values.notes || "")}"></td><td data-label="إجراء"><button type="button" class="ed-quick-remove" data-remove-row>حذف الصف</button></td>`;
    $("edQuickBody").appendChild(row);
    bindQuickRow(row);
    updateQuickTotal();
    return row;
  }
  function quickRowPayload(row) {
    const get = (field) => row.querySelector(`[data-field="${field}"]`).value;
    return { source_name: selectedSource(), entry_date: get("entry_date"), driver_name: clean(get("driver_name")), vehicle_number: clean(get("vehicle_number")), quantity_liters: Number(get("quantity_liters")), receipt_number: clean(get("receipt_number")), notes: clean(get("notes")) };
  }
  async function saveQuickRows() {
    const source = selectedSource();
    const month = selectedMonth();
    if (!source || !month) { message("edQuickMessage", "حدد الشركة والشهر والسنة أولاً", "error"); return; }
    const rows = [...$("edQuickBody").querySelectorAll("tr")];
    const entries = rows.map(quickRowPayload).filter((entry) => entry.driver_name || entry.vehicle_number || entry.quantity_liters > 0 || entry.receipt_number || entry.notes);
    if (!entries.length) { message("edQuickMessage", "أدخل تعبئة واحدة على الأقل", "error"); return; }
    const invalidIndex = entries.findIndex((entry) => !entry.entry_date || !entry.entry_date.startsWith(month) || !entry.driver_name || !entry.vehicle_number || !(entry.quantity_liters > 0));
    if (invalidIndex >= 0) { message("edQuickMessage", `أكمل بيانات الصف ${invalidIndex + 1} وتأكد أن تاريخه ضمن الشهر المحدد`, "error"); return; }
    $("edQuickSaveBtn").disabled = true;
    message("edQuickMessage", `جاري حفظ ${entries.length} صف`);
    try {
      const data = await api("/api/external-diesel/import", { method: "POST", body: JSON.stringify({ entries }) });
      const lastEntry = entries[entries.length - 1];
      $("edQuickBody").innerHTML = "";
      await Promise.all([loadSources(), loadEntries(), loadSuggestions()]);
      addQuickRow({ entry_date: lastEntry.entry_date, receipt_number: incrementReceipt(lastEntry.receipt_number) });
      message("edQuickMessage", `تم حفظ ${data.created} صف${data.skipped ? ` · تم تجاوز ${data.skipped} وصل مكرر` : ""}`, data.created ? "success" : "error");
    } catch (error) { message("edQuickMessage", error.message, "error"); }
    finally { $("edQuickSaveBtn").disabled = false; }
  }
  function renderSummary() {
    $("edTotalLiters").textContent = formatNumber(state.summary.total_liters);
    $("edEntriesCount").textContent = formatNumber(state.summary.entries_count);
    $("edDaysCount").textContent = formatNumber(state.summary.days_count);
    $("edDailyAverage").textContent = formatNumber(state.summary.daily_average);
  }
  function groupedRows() {
    const groups = new Map();
    state.entries.forEach((entry) => {
      if (!groups.has(entry.entry_date)) groups.set(entry.entry_date, []);
      groups.get(entry.entry_date).push(entry);
    });
    return groups;
  }
  function renderEntries() {
    const body = $("edBody");
    if (!state.entries.length) {
      body.innerHTML = `<tr><td colspan="7">لا توجد تعبئات مسجلة للشركة والفترة المحددتين</td></tr>`;
      $("edFoot").innerHTML = "";
      return;
    }
    const html = [];
    groupedRows().forEach((rows, date) => {
      rows.forEach((entry) => html.push(`<tr>
        <td>${formatDate(entry.entry_date)}</td><td>${esc(entry.driver_name)}</td><td>${esc(entry.vehicle_number)}</td>
        <td>${formatNumber(entry.quantity_liters)}</td><td>${esc(entry.receipt_number || "-")}</td><td>${esc(entry.notes || "-")}</td>
        <td class="ed-action-column">${state.canEdit ? `<div class="ed-row-actions"><button type="button" data-edit="${entry.id}">تعديل</button>${state.isAdmin ? `<button type="button" class="ed-delete" data-delete="${entry.id}">حذف</button>` : ""}</div>` : "-"}</td>
      </tr>`));
      const dailyTotal = rows.reduce((sum, entry) => sum + Number(entry.quantity_liters || 0), 0);
      html.push(`<tr class="ed-day-total"><td colspan="3">مجموع يوم ${formatDate(date)}</td><td>${formatNumber(dailyTotal)} لتر</td><td colspan="3"></td></tr>`);
    });
    body.innerHTML = html.join("");
    $("edFoot").innerHTML = `<tr><th colspan="3">المجموع الشهري</th><th>${formatNumber(state.summary.total_liters)} لتر</th><th colspan="3">${formatNumber(state.summary.entries_count)} تعبئة</th></tr>`;
    body.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => startEdit(Number(button.dataset.edit))));
    body.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteEntry(Number(button.dataset.delete))));
  }
  async function loadSources() {
    const data = await api("/api/external-diesel/sources");
    state.sources = data.sources || [];
    renderSources();
  }
  async function loadEntries() {
    syncPeriod();
    const source = selectedSource();
    const month = selectedMonth();
    if (!month) { message("edFilterMessage", "حدد الشهر والسنة"); return; }
    message("edFilterMessage", "جاري تحميل الكشف");
    try {
      const query = new URLSearchParams({ month });
      if (source) query.set("source", source);
      const data = await api(`/api/external-diesel?${query}`);
      state.entries = data.entries || [];
      state.summary = data.summary || {};
      renderSummary();
      renderEntries();
      message("edFilterMessage", `تم عرض ${formatNumber(state.entries.length)} تعبئة`, "success");
    } catch (error) { message("edFilterMessage", error.message, "error"); }
  }
  function formPayload() {
    return {
      source_name: clean($("edSource").value), entry_date: $("edDate").value, driver_name: clean($("edDriver").value),
      vehicle_number: clean($("edVehicle").value), quantity_liters: Number($("edQuantity").value),
      receipt_number: clean($("edReceipt").value), notes: clean($("edNotes").value)
    };
  }
  function resetForm() {
    state.editingId = null;
    $("edFormTitle").textContent = "تعديل تعبئة السولار";
    $("edSaveBtn").textContent = "حفظ التعديل";
    $("edEntryPanel").classList.add("hidden");
    ["edDriver", "edVehicle", "edQuantity", "edReceipt", "edNotes"].forEach((id) => { $(id).value = ""; });
    $("edSource").value = selectedSource();
    $("edDate").value = `${selectedMonth()}-01`;
    message("edFormMessage", "");
  }
  function startEdit(id) {
    const entry = state.entries.find((item) => Number(item.id) === Number(id));
    if (!entry) return;
    state.editingId = entry.id;
    $("edFormTitle").textContent = "تعديل تعبئة السولار";
    $("edSaveBtn").textContent = "حفظ التعديل";
    $("edEntryPanel").classList.remove("hidden");
    $("edSource").value = entry.source_name; $("edDate").value = entry.entry_date; $("edDriver").value = entry.driver_name;
    $("edVehicle").value = entry.vehicle_number; $("edQuantity").value = entry.quantity_liters; $("edReceipt").value = entry.receipt_number || ""; $("edNotes").value = entry.notes || "";
    $("edEntryPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function saveEntry() {
    const payload = formPayload();
    if (!payload.source_name || !payload.entry_date || !payload.driver_name || !payload.vehicle_number || !(payload.quantity_liters > 0)) {
      message("edFormMessage", "أكمل الشركة والتاريخ والسائق والمركبة والكمية", "error"); return;
    }
    message("edFormMessage", "جاري الحفظ");
    try {
      await api(state.editingId ? `/api/external-diesel/${state.editingId}` : "/api/external-diesel", { method: state.editingId ? "PUT" : "POST", body: JSON.stringify(payload) });
      $("edFilterSource").value = payload.source_name;
      $("edReportMonth").value = payload.entry_date.slice(0, 7);
      resetForm();
      await Promise.all([loadSources(), loadEntries(), loadSuggestions()]);
      message("edFormMessage", "تم حفظ السجل", "success");
    } catch (error) { message("edFormMessage", error.message, "error"); }
  }
  async function deleteEntry(id) {
    const entry = state.entries.find((item) => Number(item.id) === Number(id));
    if (!entry || !confirm(`حذف وصل رقم ${entry.receipt_number || "بدون رقم"}؟`)) return;
    try { await api(`/api/external-diesel/${id}`, { method: "DELETE" }); await Promise.all([loadSources(), loadEntries(), loadSuggestions()]); }
    catch (error) { message("edFilterMessage", error.message, "error"); }
  }
  const normalizedHeader = (value) => clean(value).toLowerCase().replace(/[أإآ]/g, "ا").replace(/[ة]/g, "ه").replace(/[^\u0600-\u06ffa-z0-9]/g, "");
  const aliases = {
    entry_date: ["التاريخ", "تاريخ", "date"], driver_name: ["اسمالسائق", "السائق", "driver"],
    vehicle_number: ["رقمالمركبه", "رقمالسياره", "المركبه", "vehicle"],
    quantity_liters: ["الكميهلتر", "الكميه", "لتر", "quantity", "liters"],
    receipt_number: ["رقمالوصل", "الوصل", "receipt"], notes: ["ملاحظات", "الملاحظات", "notes"]
  };
  function parseDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    if (typeof value === "number" && window.XLSX?.SSF) { const date = XLSX.SSF.parse_date_code(value); if (date) return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`; }
    const text = clean(value).replace(/\./g, "/");
    let match = /^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)$/.exec(text);
    if (match) return `${match[1]}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}`;
    match = /^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{2}|\d{4})$/.exec(text);
    if (match) { const year = match[3].length === 2 ? `20${match[3]}` : match[3]; return `${year}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`; }
    return "";
  }
  function parseWorkbook(file) {
    return file.arrayBuffer().then((buffer) => {
      if (!window.XLSX) throw new Error("قارئ Excel غير متاح");
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      let selected = null;
      workbook.SheetNames.some((name) => {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: "", blankrows: false });
        for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
          const headers = (rows[index] || []).map(normalizedHeader);
          const hasDate = headers.some((header) => aliases.entry_date.map(normalizedHeader).includes(header));
          const hasQuantity = headers.some((header) => aliases.quantity_liters.map(normalizedHeader).includes(header));
          if (hasDate && hasQuantity) { selected = { rows, headerIndex: index, headers }; return true; }
        }
        return false;
      });
      if (!selected) throw new Error("لم أجد صف العناوين المعتمد في ملف Excel");
      const columns = {};
      Object.entries(aliases).forEach(([key, values]) => {
        const normalizedAliases = values.map(normalizedHeader);
        columns[key] = selected.headers.findIndex((header) => normalizedAliases.includes(header));
      });
      const source = selectedSource();
      const month = selectedMonth();
      if (!source || !month) throw new Error("حدد الشركة والشهر قبل معاينة الملف");
      return selected.rows.slice(selected.headerIndex + 1).map((row, index) => {
        const entry = {
          source_name: source, entry_date: columns.entry_date >= 0 ? parseDate(row[columns.entry_date]) : "",
          driver_name: columns.driver_name >= 0 ? clean(row[columns.driver_name]) : "",
          vehicle_number: columns.vehicle_number >= 0 ? clean(row[columns.vehicle_number]) : "",
          quantity_liters: columns.quantity_liters >= 0 ? Number(String(row[columns.quantity_liters]).replace(/,/g, "")) : 0,
          receipt_number: columns.receipt_number >= 0 ? clean(row[columns.receipt_number]) : "",
          notes: columns.notes >= 0 ? clean(row[columns.notes]) : ""
        };
        const errors = [];
        if (!entry.entry_date) errors.push("تاريخ غير صالح"); else if (!entry.entry_date.startsWith(month)) errors.push("خارج الشهر المحدد");
        if (!entry.driver_name) errors.push("اسم السائق مفقود"); if (!entry.vehicle_number) errors.push("رقم المركبة مفقود"); if (!(entry.quantity_liters > 0)) errors.push("الكمية غير صالحة");
        return { entry, rowNumber: selected.headerIndex + index + 2, errors };
      }).filter((item) => Object.values(item.entry).some((value) => value !== "" && value !== 0));
    });
  }
  function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 32768) binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
    return btoa(binary);
  }
  async function parseWordDocument(file) {
    if (file.size > 8 * 1024 * 1024) throw new Error("حجم ملف وورد يجب ألا يتجاوز 8 ميجابايت");
    const data = await api("/api/external-diesel/parse-word", {
      method: "POST",
      body: JSON.stringify({ filename: file.name, data_base64: bufferToBase64(await file.arrayBuffer()) })
    });
    if (data.source_name) { $("edFilterSource").value = data.source_name; $("edSource").value = data.source_name; }
    if (data.month) $("edReportMonth").value = data.month;
    syncPeriod();
    const source = selectedSource();
    const month = selectedMonth();
    if (!source || !month) throw new Error("تعذر تحديد المصدر أو الشهر من كشف وورد. حددهما ثم أعد المعاينة");
    return (data.entries || []).map((row, index) => {
      const entry = { ...row, source_name: source };
      const errors = [];
      if (!entry.entry_date) errors.push("تاريخ غير صالح"); else if (!entry.entry_date.startsWith(month)) errors.push("خارج الشهر المحدد");
      if (!entry.driver_name) errors.push("اسم السائق مفقود");
      if (!entry.vehicle_number) errors.push("رقم المركبة مفقود");
      if (!(Number(entry.quantity_liters) > 0)) errors.push("الكمية غير صالحة");
      return { entry, rowNumber: row.row_number || index + 1, errors };
    });
  }
  function renderPreview() {
    $("edPreviewWrap").classList.remove("hidden");
    $("edPreviewBody").innerHTML = state.preview.slice(0, 60).map((item) => `<tr><td>${esc(formatDate(item.entry.entry_date))}</td><td>${esc(item.entry.driver_name)}</td><td>${esc(item.entry.vehicle_number)}</td><td>${formatNumber(item.entry.quantity_liters)}</td><td>${esc(item.entry.receipt_number || "-")}</td><td class="${item.errors.length ? "ed-preview-error" : "ed-preview-ok"}">${item.errors.length ? esc(item.errors.join("، ")) : "جاهز"}</td></tr>`).join("");
    const valid = state.preview.filter((item) => !item.errors.length).length;
    const invalid = state.preview.length - valid;
    const previewLiters = state.preview.filter((item) => !item.errors.length).reduce((sum, item) => sum + Number(item.entry.quantity_liters || 0), 0);
    $("edImportBtn").classList.toggle("hidden", valid === 0);
    message("edImportMessage", `${state.previewFormat ? `${state.previewFormat} · ` : ""}جاهز للحفظ ${valid} صف · الإجمالي ${formatNumber(previewLiters)} لتر · يحتاج مراجعة ${invalid} صف`, invalid ? "error" : "success");
  }
  async function previewImportFile() {
    const file = $("edExcelFile").files[0];
    if (!file) { message("edImportMessage", "اختر كشف إكسل أو وورد أولاً", "error"); return; }
    const extension = file.name.toLowerCase().split(".").pop();
    if (!["xls", "xlsx", "doc", "docx"].includes(extension)) { message("edImportMessage", "الصيغ المقبولة هي DOC وDOCX وXLS وXLSX", "error"); return; }
    const isWord = extension === "doc" || extension === "docx";
    message("edImportMessage", `جاري قراءة كشف ${isWord ? "وورد" : "إكسل"}`);
    try {
      state.previewFormat = isWord ? "كشف وورد" : "كشف إكسل";
      state.preview = isWord ? await parseWordDocument(file) : await parseWorkbook(file);
      renderPreview();
    }
    catch (error) { message("edImportMessage", error.message, "error"); }
  }
  async function importPreview() {
    const entries = state.preview.filter((item) => !item.errors.length).map((item) => item.entry);
    if (!entries.length) return;
    message("edImportMessage", "جاري حفظ الصفوف");
    try {
      const data = await api("/api/external-diesel/import", { method: "POST", body: JSON.stringify({ entries }) });
      state.preview = []; $("edPreviewWrap").classList.add("hidden"); $("edImportBtn").classList.add("hidden"); $("edExcelFile").value = ""; $("edFileName").textContent = "لم يتم اختيار ملف";
      await Promise.all([loadSources(), loadEntries(), loadSuggestions()]);
      message("edImportMessage", `تم حفظ ${data.created} سجل · تم تجاوز ${data.skipped} وصل مكرر`, "success");
    } catch (error) { message("edImportMessage", error.message, "error"); }
  }
  function workbookRows(includeData) {
    const source = selectedSource() || "اسم الشركة";
    const month = selectedMonth() || currentMonth();
    const [year, monthNumber] = month.split("-");
    const rows = [[`كشف تعبئة السولار لشركة ${companyName(source)} شهر ${Number(monthNumber)}/${year}`], [], ["التاريخ", "اسم السائق", "رقم المركبة", "الكمية (لتر)", "رقم الوصل", "ملاحظات"]];
    if (includeData) state.entries.forEach((entry) => rows.push([formatDate(entry.entry_date), entry.driver_name, entry.vehicle_number, Number(entry.quantity_liters), entry.receipt_number, entry.notes]));
    return rows;
  }
  function writeWorkbook(includeData) {
    if (!window.XLSX) { message("edImportMessage", "قارئ Excel غير متاح", "error"); return; }
    const month = selectedMonth() || currentMonth();
    const sheet = XLSX.utils.aoa_to_sheet(workbookRows(includeData));
    sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    sheet["!cols"] = [{ wch: 14 }, { wch: 24 }, { wch: 15 }, { wch: 16 }, { wch: 15 }, { wch: 28 }];
    const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, "كشف السولار");
    if (includeData) {
      const dailyRows = [["التاريخ", "مجموع اليوم (لتر)"]];
      groupedRows().forEach((entries, date) => dailyRows.push([formatDate(date), entries.reduce((sum, entry) => sum + Number(entry.quantity_liters || 0), 0)]));
      dailyRows.push(["المجموع الشهري", Number(state.summary.total_liters || 0)]);
      const summarySheet = XLSX.utils.aoa_to_sheet(dailyRows); summarySheet["!cols"] = [{ wch: 18 }, { wch: 22 }]; XLSX.utils.book_append_sheet(workbook, summarySheet, "الملخص اليومي");
    }
    XLSX.writeFile(workbook, `${includeData ? "كشف" : "نموذج"}-سولار-الشركات-${month}.xlsx`);
  }
  function printDayBlocks() {
    const blocks = [];
    groupedRows().forEach((entries, date) => {
      const rows = entries.map((entry) => `<tr><td>${formatDate(entry.entry_date)}</td><td>${esc(entry.driver_name)}</td><td>${esc(entry.vehicle_number)}</td><td>${formatNumber(entry.quantity_liters)}</td><td>${esc(entry.receipt_number || "")}</td><td>${esc(entry.notes || "")}</td></tr>`).join("");
      const total = entries.reduce((sum, entry) => sum + Number(entry.quantity_liters || 0), 0);
      blocks.push({ units: entries.length + 1, html: `<tbody class="day-group">${rows}<tr class="day-total"><td colspan="3">مجموع يوم ${formatDate(date)}</td><td>${formatNumber(total)}</td><td colspan="2"></td></tr></tbody>` });
    });
    return blocks;
  }
  function paginatedPrintRows(firstPageUnits = 30, nextPageUnits = 34) {
    const pages = [];
    let current = [];
    let units = 0;
    printDayBlocks().forEach((block) => {
      const pageLimit = pages.length ? nextPageUnits : firstPageUnits;
      if (current.length && units + block.units > pageLimit) {
        pages.push(current.join(""));
        current = [];
        units = 0;
      }
      current.push(block.html);
      units += block.units;
    });
    if (current.length) pages.push(current.join(""));
    return pages;
  }
  function printReport() {
    const source = selectedSource(); const month = selectedMonth();
    if (!source || !month) { message("edFilterMessage", "حدد الشركة والشهر والسنة قبل الطباعة", "error"); return; }
    if (!state.entries.length) { message("edFilterMessage", "لا توجد بيانات لطباعتها", "error"); return; }
    const [year, monthNumber] = month.split("-");
    const popup = window.open("", "_blank");
    if (!popup) { message("edFilterMessage", "المتصفح منع نافذة الطباعة", "error"); return; }
    const pages = paginatedPrintRows();
    const pageHtml = pages.map((rows, index) => {
      const isLast = index === pages.length - 1;
      const summary = index === 0 ? `<section class="summary"><div><span>الشركة</span><strong>${esc(source)}</strong></div><div><span>الفترة</span><strong>${Number(monthNumber)}/${year}</strong></div><div><span>عدد التعبئات</span><strong>${formatNumber(state.summary.entries_count)}</strong></div><div><span>إجمالي السولار</span><strong>${formatNumber(state.summary.total_liters)} لتر</strong></div></section>` : "";
      return `<section class="print-page"><div class="official-header"><img src="/assets/header.png" alt="الترويسة الرسمية"></div><main><section class="title"><h1>كشف تعبئة السولار لشركة ${esc(companyName(source))} شهر ${Number(monthNumber)}/${year}</h1><p>تمت تعبئة السولار للشركة بواسطة طاقم المكب</p></section>${summary}<table><colgroup><col style="width:14%"><col style="width:22%"><col style="width:14%"><col style="width:14%"><col style="width:14%"><col style="width:22%"></colgroup><thead><tr><th>التاريخ</th><th>اسم السائق</th><th>رقم المركبة</th><th>الكمية (لتر)</th><th>رقم الوصل</th><th>ملاحظات</th></tr></thead>${rows}${isLast ? `<tfoot><tr class="grand-total"><td colspan="3">المجموع الشهري</td><td>${formatNumber(state.summary.total_liters)}</td><td colspan="2">${formatNumber(state.summary.entries_count)} تعبئة</td></tr></tfoot>` : ""}</table>${isLast ? `<section class="signatures"><div>توقيع مسؤول تعبئة السولار</div><div>توقيع قسم المكب</div></section>` : ""}</main><div class="page-number">(${index + 1})</div><div class="official-footer"><img src="/assets/footer.png" alt="التذييل الرسمي"></div></section>`;
    }).join("");
    popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>كشف السولار ${esc(source)} ${month}</title><style>
      @page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Tahoma,sans-serif;direction:rtl}.print-page{width:210mm;height:297mm;padding:0 4mm 4mm;display:flex;flex-direction:column;overflow:hidden;break-after:page;page-break-after:always}.print-page:last-child{break-after:auto;page-break-after:auto}.official-header{width:210mm;height:30mm;margin:0 -4mm;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}.official-header img{display:block;width:210mm;height:30mm;object-fit:fill}main{width:202mm;flex:1;min-height:0}.page-number{height:5mm;line-height:5mm;text-align:center;font-size:11px;font-weight:800;direction:ltr;flex-shrink:0}.official-footer{width:210mm;height:22mm;margin:0 -4mm;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;flex-shrink:0}.official-footer img{display:block;width:210mm;height:22mm;object-fit:fill}.title{text-align:center;border-top:1px solid #444;border-bottom:1px solid #444;padding:2.2mm 1mm;margin:0 0 2mm}.title h1{font-size:17px;margin:0}.title p{font-size:12px;font-weight:700;margin:1mm 0 0}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:1mm;margin-bottom:2mm}.summary div{border:1px solid #777;text-align:center;padding:1.5mm}.summary span{display:block;font-size:9px}.summary strong{display:block;font-size:12px;margin-top:.5mm}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #555;padding:1.35mm .9mm;text-align:center;vertical-align:middle;font-size:10.5px;line-height:1.25;overflow-wrap:anywhere}th{background:#e9efec;font-weight:800}.day-group{break-inside:avoid}.day-total td{background:#f0f5f2;font-weight:800}.grand-total td{background:#173f31;color:#fff;font-weight:800}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:30mm;margin-top:8mm;text-align:center;font-size:12px;font-weight:800;break-inside:avoid}.signatures div{padding-top:8mm;border-top:1px solid #555}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${pageHtml}<script>window.onload=()=>Promise.all(Array.from(document.images).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve}))).then(()=>setTimeout(()=>window.print(),250));<\/script></body></html>`);
    popup.document.close();
  }
  async function init() {
    $("edReportMonth").value = currentMonth(); $("edDate").value = `${currentMonth()}-01`; syncPeriod();
    try {
      const auth = await api("/api/auth/status");
      state.canEdit = ["admin", "editor"].includes(auth.user?.role); state.isAdmin = auth.user?.role === "admin";
      if (!state.canEdit) { $("edQuickPanel").classList.add("hidden"); $("edEntryPanel").classList.add("hidden"); $("edImportPanel").classList.add("hidden"); }
      await Promise.all([loadSources(), loadSuggestions()]);
      if (!selectedSource() && state.sources[0]) { $("edFilterSource").value = state.sources[0].source_name; $("edSource").value = state.sources[0].source_name; }
      await loadEntries();
      if (state.canEdit && !$("edQuickBody").children.length) addQuickRow();
    } catch (error) { message("edFilterMessage", error.message, "error"); }
  }
  $("edLoadBtn").addEventListener("click", loadEntries); $("edFilterSource").addEventListener("change", loadEntries); $("edReportMonth").addEventListener("change", loadEntries);
  $("edSaveBtn").addEventListener("click", saveEntry); $("edCancelEditBtn").addEventListener("click", resetForm);
  $("edQuickAddBtn").addEventListener("click", () => { const row = addQuickRow(); row.querySelector('[data-field="driver_name"]').focus(); });
  $("edQuickSaveBtn").addEventListener("click", saveQuickRows);
  $("edDriver").addEventListener("input", () => { $("edDriver").dataset.suggested = ""; applyDriverSuggestion($("edDriver"), $("edVehicle")); });
  $("edVehicle").addEventListener("input", () => { $("edVehicle").dataset.suggested = ""; applyVehicleSuggestion($("edVehicle"), $("edDriver")); });
  $("edExcelFile").addEventListener("change", (event) => { $("edFileName").textContent = event.target.files[0]?.name || "لم يتم اختيار ملف"; });
  $("edPreviewBtn").addEventListener("click", previewImportFile); $("edImportBtn").addEventListener("click", importPreview);
  $("edTemplateBtn").addEventListener("click", () => writeWorkbook(false)); $("edExportBtn").addEventListener("click", () => writeWorkbook(true)); $("edPrintBtn").addEventListener("click", printReport);
  init();
})();
