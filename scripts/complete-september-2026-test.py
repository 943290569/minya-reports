import importlib.util
import json
import sqlite3
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
def load(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/file)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
imp=load('imp','import-september-2026.py')
complete=load('complete','complete-september-2026.py')
assert complete.sprays('2026-09-01',{'weather':'ماطر','temperature':25,'humidity':20})==(0,'ماطر/ثلجي')
assert complete.sprays('2026-09-04',{'weather':'مشمس','temperature':25,'humidity':20})==(4,'الجمعة')
assert complete.sprays('2026-09-01',{'weather':'مشمس','temperature':15,'humidity':20})==(4,'بارد')
assert complete.sprays('2026-09-01',{'weather':'مشمس','temperature':25,'humidity':75})==(3,'رطب')
assert complete.sprays('2026-09-01',{'weather':'مشمس','temperature':25,'humidity':20})==(9,'جاف')
schema=(ROOT/'server.js').read_text().split('db.exec(`',1)[1].split('`);',1)[0]
sub=(ROOT/'station-subsources.js').read_text().split('db.exec(`',1)[1].split('`);',1)[0]
data=json.loads((ROOT/'scripts/september-2026-quantities.json').read_text())
wx={date:{'weather':'مشمس','temperature':25,'humidity':20} for date in data['daily']}
with tempfile.TemporaryDirectory() as tmp:
    path=Path(tmp)/'database.db';db=sqlite3.connect(path);db.executescript(schema+sub)
    db.executescript("ALTER TABLE daily_reports ADD COLUMN workflow_status TEXT DEFAULT 'draft';ALTER TABLE daily_reports ADD COLUMN workday_type TEXT DEFAULT 'official';ALTER TABLE daily_reports ADD COLUMN workday_reason TEXT DEFAULT '';ALTER TABLE daily_reports ADD COLUMN workday_manual INTEGER DEFAULT 0;CREATE TABLE monthly_entry_rows(id INTEGER PRIMARY KEY,report_date TEXT UNIQUE,data_json TEXT,updated_at TEXT,updated_by INTEGER)")
    db.close();imp.run(path,data,Path(tmp)/'backup',True)
    db=sqlite3.connect(path)
    db.execute("INSERT INTO monthly_entry_rows(report_date,data_json) VALUES('2026-09-01','{}')");db.commit();before=list(db.iterdump());db.close()
    complete.run(path,wx,Path(tmp)/'backup')
    with sqlite3.connect(path) as db:assert list(db.iterdump())==before
    result=complete.run(path,wx,Path(tmp)/'backup',True)
    assert result['changed']['water']==60 and result['changed']['crews']==180 and result['changed']['equipment']==480
    assert result['water_totals']['كميات المياه للتعقيم والترطيب']==result['water_totals']['عدد مرات رش المياه']*3
    result=complete.run(path,wx,Path(tmp)/'backup',True)
    assert result['changed']['operation_rows']==0 and result['changed']['crews']==0 and result['changed']['equipment']==0
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT workday_type FROM daily_reports WHERE report_date='2026-09-04'").fetchone()[0]=='holiday'
        assert db.execute("SELECT COUNT(*) FROM operations WHERE operation_name='مواد التغطية (طمم)' AND quantity IS NULL").fetchone()[0]==30
print('September completion: established rules, protected totals, missing data, dry-run and rerun passed.')
