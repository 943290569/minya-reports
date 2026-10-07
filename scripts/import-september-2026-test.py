import importlib.util
import json
import sqlite3
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('importer', ROOT / 'scripts/import-september-2026.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
data = json.loads((ROOT / 'scripts/september-2026-quantities.json').read_text())
schema = (ROOT / 'server.js').read_text().split('db.exec(`', 1)[1].split('`);', 1)[0]
subsource_schema = (ROOT / 'station-subsources.js').read_text().split('db.exec(`', 1)[1].split('`);', 1)[0]

with tempfile.TemporaryDirectory() as temp:
    path = Path(temp) / 'database.db'
    db = sqlite3.connect(path)
    db.executescript(schema + subsource_schema)
    db.execute("ALTER TABLE daily_reports ADD COLUMN workflow_status TEXT DEFAULT 'draft'")
    db.execute("INSERT INTO daily_reports(report_date,report_no,total_diesel,notes,workflow_status) VALUES('2026-09-01','MINYA-2026-09-01',250,'ملاحظات أصلية','approved')")
    rid = db.execute('SELECT id FROM daily_reports').fetchone()[0]
    db.execute("INSERT INTO operations(report_id,operation_name,quantity,vehicle_count,unit,notes) VALUES(?,'كميات المياه للتعقيم والترطيب',12,1,'كوب','تنك مياه')", (rid,))
    db.execute("INSERT INTO equipment(report_id,equipment_name,diesel_liters) VALUES(?,'مدحلة 36 طن',250)", (rid,))
    db.execute("INSERT INTO crews(report_id,crew_name,crew_count) VALUES(?,'عمال',4)", (rid,))
    db.execute("INSERT INTO daily_reports(report_date,report_no,total_waste_tons) VALUES('2026-08-31','MINYA-2026-08-31',999)")
    db.commit()
    before = list(db.iterdump())
    db.close()
    summary = module.run(path, data, Path(temp) / 'backups')
    assert summary['created'] == 29 and summary['updated'] == 1
    with sqlite3.connect(path) as db:
        assert list(db.iterdump()) == before
    module.run(path, data, Path(temp) / 'backups', True)
    with sqlite3.connect(path) as db:
        assert db.execute('SELECT total_diesel,notes,workflow_status FROM daily_reports WHERE id=?', (rid,)).fetchone() == (250, 'ملاحظات أصلية', 'approved')
        assert db.execute("SELECT quantity,vehicle_count FROM operations WHERE operation_name='كميات المياه للتعقيم والترطيب'").fetchone() == (12, 1)
        assert db.execute('SELECT SUM(diesel_liters) FROM equipment').fetchone()[0] == 250
        assert db.execute("SELECT total_waste_tons FROM daily_reports WHERE report_date='2026-08-31'").fetchone()[0] == 999
        counts = [db.execute('SELECT COUNT(*) FROM ' + t).fetchone()[0] for t in ('daily_reports', 'operations', 'transfer_stations', 'station_subsource_daily')]
    module.run(path, data, Path(temp) / 'backups', True)
    with sqlite3.connect(path) as db:
        assert counts == [db.execute('SELECT COUNT(*) FROM ' + t).fetchone()[0] for t in ('daily_reports', 'operations', 'transfer_stations', 'station_subsource_daily')]
        db.execute("INSERT INTO transfer_stations(report_id,station_name,waste_tons) VALUES(?,'محطة غير معروفة',10)", (rid,))
        db.commit()
        before = list(db.iterdump())
    try:
        module.run(path, data, Path(temp) / 'backups', True)
        raise RuntimeError('Unexpected station must abort')
    except AssertionError as e:
        assert 'Unexpected station' in str(e)
    with sqlite3.connect(path) as db:
        assert list(db.iterdump()) == before
    assert len(list((Path(temp) / 'backups').glob('*.db'))) == 3
print('September import: source reconciliation, dry-run, preservation, rerun and rollback passed.')
