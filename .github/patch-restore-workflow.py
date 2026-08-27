from pathlib import Path
p=Path('server.js')
s=p.read_text()
old='''const result=db.prepare(`INSERT INTO daily_reports (report_date,report_no,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(r.report_date,r.report_no||generateReportNo(r.report_date),r.weather||"",Number(r.temperature||0),r.start_time||"",r.end_time||"",Number(r.total_trucks||0),Number(r.total_waste_tons||0),Number(r.total_diesel||0),r.notes||"",r.created_at||new Date().toISOString(),r.updated_at||new Date().toISOString());'''
new='''const result=db.prepare(`INSERT INTO daily_reports (report_date,report_no,weather,temperature,start_time,end_time,total_trucks,total_waste_tons,total_diesel,notes,created_at,updated_at,workflow_status,submitted_at,submitted_by,approved_at,approved_by,approved_by_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(r.report_date,r.report_no||generateReportNo(r.report_date),r.weather||"",Number(r.temperature||0),r.start_time||"",r.end_time||"",Number(r.total_trucks||0),Number(r.total_waste_tons||0),Number(r.total_diesel||0),r.notes||"",r.created_at||new Date().toISOString(),r.updated_at||new Date().toISOString(),["draft","pending","approved"].includes(r.workflow_status)?r.workflow_status:"draft",r.submitted_at||null,r.submitted_by||null,r.approved_at||null,r.approved_by||null,r.approved_by_name||"");'''
assert old in s, 'restore insert not found'
s=s.replace(old,new,1)
p.write_text(s)
