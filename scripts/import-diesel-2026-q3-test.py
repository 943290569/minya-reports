import importlib.util
import json
import sqlite3
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('diesel',ROOT/'scripts/import-diesel-2026-q3.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
data=json.loads((ROOT/'scripts/diesel-2026-q3-data.json').read_text())
schema=(ROOT/'server.js').read_text().split('db.exec(`',1)[1].split('`);',1)[0]
with tempfile.TemporaryDirectory() as tmp:
    path=Path(tmp)/'database.db';db=sqlite3.connect(path);db.executescript(schema)
    db.execute('CREATE TABLE monthly_entry_rows(id INTEGER PRIMARY KEY,report_date TEXT UNIQUE,data_json TEXT,updated_by INTEGER,updated_at TEXT)')
    for month in data['months']:
        for day in range(1,31 if month=='2026-09' else 32):
            date=month+f'-{day:02}'
            db.execute('INSERT INTO daily_reports(report_date,report_no,total_diesel,total_waste_tons,notes) VALUES(?,?,100,1400,?)',(date,'MINYA-'+date,'ملاحظات التشغيل'))
    rid=db.execute("SELECT id FROM daily_reports WHERE report_date='2026-09-01'").fetchone()[0]
    db.execute("INSERT INTO equipment(report_id,equipment_name,operating_status,working_hours,diesel_liters,notes) VALUES(?,'جرافة جنزير 2023','متوقفة',2,100,'ملاحظة المعدة')",(rid,))
    db.execute("INSERT INTO operations(report_id,operation_name,quantity) VALUES(?,'عدد مرات رش المياه',9)",(rid,))
    staged={'equipment':[{'equipment_name':'جرافة جنزير 2023','working_hours':2,'operating_status':'متوقفة','notes':'ملاحظة','diesel_liters':100}],'weather':'ماطر','operations':[{'quantity':9}]}
    db.execute('INSERT INTO monthly_entry_rows(report_date,data_json) VALUES(?,?)',('2026-09-01',json.dumps(staged,ensure_ascii=False)))
    db.commit();before=list(db.iterdump());db.close()
    m.run(path,data,Path(tmp)/'backups')
    with sqlite3.connect(path) as db:assert list(db.iterdump())==before
    result=m.run(path,data,Path(tmp)/'backups',True)
    assert result['months']['2026-09']['whole_month_liters']==7102
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT operating_status,working_hours,notes FROM equipment WHERE report_id=? AND equipment_name=?',(rid,'جرافة جنزير 2023')).fetchone()==('متوقفة',2,'ملاحظة المعدة')
        assert db.execute("SELECT quantity FROM operations WHERE report_id=?",(rid,)).fetchone()[0]==9
        assert db.execute("SELECT total_diesel FROM daily_reports WHERE report_date='2026-09-07'").fetchone()[0]==100
        assert db.execute('SELECT SUM(total_waste_tons) FROM daily_reports').fetchone()[0]==92*1400
        obj=json.loads(db.execute('SELECT data_json FROM monthly_entry_rows').fetchone()[0]);assert obj['weather']=='ماطر' and obj['equipment'][0]['working_hours']==2 and obj['equipment'][0]['diesel_liters']==209
        count=db.execute('SELECT COUNT(*) FROM equipment').fetchone()[0]
    m.run(path,data,Path(tmp)/'backups',True)
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT COUNT(*) FROM equipment').fetchone()[0]==count
        db.execute("INSERT INTO equipment(report_id,equipment_name,diesel_liters) VALUES(?,'سيارة غير مرتبطة',50)",(rid,));db.commit();before=list(db.iterdump())
    try:m.run(path,data,Path(tmp)/'backups',True);raise RuntimeError('Must reject unexpected diesel')
    except AssertionError as e:assert 'outside landfill whitelist' in str(e)
    with sqlite3.connect(path) as db:assert list(db.iterdump())==before
print('Q3 diesel import: source totals, partial coverage, protected values, dry-run, rerun and rollback passed.')
