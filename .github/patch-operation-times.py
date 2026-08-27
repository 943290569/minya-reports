from pathlib import Path

# app-core: hide operation times and stop setting defaults
p=Path('public/js/app-core.js')
s=p.read_text()
s=s.replace('{ operation_name: "مكب نفايات المنيا", start_time: "04:00", end_time: "19:00", vehicle_count: 0, quantity: 0, unit: "طن", notes: "" }','{ operation_name: "مكب نفايات المنيا", vehicle_count: 0, quantity: 0, unit: "طن", notes: "" }')
s=s.replace(', start_time: "", end_time: ""', '')
s=s.replace('''      <td><input type="time" value="${item.start_time || ""}" data-type="operation" data-index="${index}" data-field="start_time"></td>\n      <td><input type="time" value="${item.end_time || ""}" data-type="operation" data-index="${index}" data-field="end_time"></td>\n''','')
p.write_text(s)

# app-form: strip legacy operation times from saved payloads
p=Path('public/js/app-form.js')
s=p.read_text()
s=s.replace('''    crews,\n    operations,\n    stations,''','''    crews,\n    operations: operations.map(({ start_time, end_time, ...item }) => item),\n    stations,''')
p.write_text(s)

# daily print: remove operation time columns only
p=Path('public/js/app-print-daily.js')
s=p.read_text()
s=s.replace('''      <tr><td>${escapeHtml(item.operation_name)}</td><td>${formatTime(item.start_time)}</td><td>${formatTime(item.end_time)}</td><td>${formatNumber(item.vehicle_count)}</td><td>${formatNumber(item.quantity)}</td><td>${escapeHtml(item.unit || "")}</td></tr>''','''      <tr><td>${escapeHtml(item.operation_name)}</td><td>${formatNumber(item.vehicle_count)}</td><td>${formatNumber(item.quantity)}</td><td>${escapeHtml(item.unit || "")}</td></tr>''')
s=s.replace('''<table><thead><tr><th>العملية</th><th>وقت البداية</th><th>وقت النهاية</th><th>عدد المركبات</th><th>الكمية</th><th>الوحدة</th></tr></thead><tbody>${operationRows}</tbody></table>''','''<table><thead><tr><th>العملية</th><th>عدد المركبات</th><th>الكمية</th><th>الوحدة</th></tr></thead><tbody>${operationRows}</tbody></table>''')
p.write_text(s)
