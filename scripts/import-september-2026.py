"""Import reviewed September quantities only. Run against the active Google DB."""
import argparse
import datetime
import hashlib
import json
import re
import sqlite3
from decimal import Decimal
from pathlib import Path

PERIOD = '2026-09'
LANDFILL = 'مكب نفايات المنيا'
STATIONS = ('محطة ترحيل يطا', 'محطة ترحيل ترقوميا', 'محطة ترحيل الخليل')
SOURCE = 'شركة عبد العزيز السعدي'
NOTE = 'الكمية جزء من إجمالي محطة ترحيل يطا ولا تضاف مرة أخرى إلى الإجمالي العام.'


def norm(s):
    return re.sub(r'\s+', '', s).replace('أ', 'ا').replace('إ', 'ا').replace('ة', 'ه').replace('ى', 'ي')


def check(value, expected):
    assert abs(Decimal(str(value)) - Decimal(str(expected))) < Decimal('0.005'), (value, expected)


def validated(data):
    days = data['daily']
    assert list(days) == [f'2026-09-{i:02}' for i in range(1, 31)], 'Expected exactly 30 September dates'
    for d in days.values():
        assert set(d['stations']) == set(STATIONS)
        assert all(isinstance(v, int) and v >= 0 for v in [d['landfill_count'], d['aziz_count'], d['incoming_count']] + [s['count'] for s in d['stations'].values()])
        assert all(Decimal(str(v)) >= 0 for v in [d['landfill_tons'], d['aziz_tons'], d['incoming_tons']] + [s['tons'] for s in d['stations'].values()])
        assert d['aziz_count'] <= d['stations'][STATIONS[0]]['count']
        assert Decimal(d['aziz_tons']) <= Decimal(d['stations'][STATIONS[0]]['tons'])
        assert d['incoming_count'] == d['landfill_count'] + sum(s['count'] for s in d['stations'].values())
        check(d['incoming_tons'], Decimal(d['landfill_tons']) + sum(Decimal(s['tons']) for s in d['stations'].values()))
    check(sum(Decimal(d['incoming_tons']) for d in days.values()), '44909.56')
    assert sum(d['incoming_count'] for d in days.values()) == 3699
    check(sum(Decimal(d['landfill_tons']) for d in days.values()), '30487.44')
    check(sum(Decimal(d['aziz_tons']) for d in days.values()), '1336.07')
    assert sum(d['aziz_count'] for d in days.values()) == 43
    return days


def protected(db):
    """All database content except the narrowly scoped import fields."""
    out = {}
    reports = {r['id'] for r in db.execute("SELECT id FROM daily_reports WHERE report_date LIKE '2026-09-%'")}
    tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
    for table in tables:
        rows = []
        for row in db.execute('SELECT * FROM "' + table.replace('"', '""') + '"'):
            r = dict(row)
            if table == 'daily_reports' and r['id'] in reports:
                for k in ('total_trucks', 'total_waste_tons', 'updated_at'):
                    r.pop(k, None)
            elif table == 'operations' and r['report_id'] in reports and norm(r['operation_name']) == norm(LANDFILL):
                for k in ('vehicle_count', 'quantity', 'unit'):
                    r.pop(k, None)
            elif table == 'transfer_stations' and r['report_id'] in reports and norm(r['station_name']) in {norm(s) for s in STATIONS}:
                for k in ('truck_count', 'waste_tons', 'unit'):
                    r.pop(k, None)
            elif table == 'station_subsource_daily' and r['entry_date'].startswith(PERIOD + '-') and r['station_name'] == STATIONS[0] and r['source_name'] == SOURCE:
                for k in ('record_count', 'quantity_tons', 'included_in_station_total', 'updated_at'):
                    r.pop(k, None)
            rows.append(r)
        out[table] = rows
    return out


def verify(db, days):
    for date, d in days.items():
        r = db.execute('SELECT * FROM daily_reports WHERE report_date=?', (date,)).fetchone()
        assert r is not None
        check(r['total_waste_tons'], d['incoming_tons'])
        assert r['total_trucks'] == d['incoming_count']
        ops = [x for x in db.execute('SELECT * FROM operations WHERE report_id=?', (r['id'],)) if norm(x['operation_name']) == norm(LANDFILL)]
        assert len(ops) == 1
        check(ops[0]['quantity'], d['landfill_tons'])
        assert ops[0]['vehicle_count'] == d['landfill_count']
        stations = list(db.execute('SELECT * FROM transfer_stations WHERE report_id=?', (r['id'],)))
        assert len(stations) == 3
        for name, target in d['stations'].items():
            found = [x for x in stations if norm(x['station_name']) == norm(name)]
            assert len(found) == 1
            check(found[0]['waste_tons'], target['tons'])
            assert found[0]['truck_count'] == target['count']
        az = db.execute('SELECT * FROM station_subsource_daily WHERE entry_date=? AND station_name=? AND source_name=?', (date, STATIONS[0], SOURCE)).fetchone()
        assert az is not None and az['included_in_station_total'] == 1
        check(az['quantity_tons'], d['aziz_tons'])
        assert az['record_count'] == d['aziz_count']
    result = dict(db.execute("SELECT COUNT(*) days,SUM(total_trucks) trucks,ROUND(SUM(total_waste_tons),2) tons FROM daily_reports WHERE report_date LIKE '2026-09-%'").fetchone())
    assert result == {'days': 30, 'trucks': 3699, 'tons': 44909.56}, result
    return result


def run(db_path, data, backup_dir, apply=False):
    days = validated(data)
    assert Path(db_path).is_file(), 'Database must already exist'
    db = sqlite3.connect(str(db_path), timeout=30, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    for table in ('daily_reports', 'operations', 'transfer_stations', 'station_subsource_daily', 'audit_logs'):
        assert db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone(), table
    backup = None
    if apply:
        Path(backup_dir).mkdir(parents=True, exist_ok=True)
        backup = Path(backup_dir) / ('before-september-2026-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.db')
        with sqlite3.connect(str(backup)) as dest:
            db.backup(dest)
            assert dest.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        backup.chmod(0o600)
    db.execute('BEGIN IMMEDIATE')
    try:
        before = protected(db)
        original_ids = {t: {r['id'] for r in rows if 'id' in r} for t, rows in before.items()}
        counts = {'created': 0, 'updated': 0}
        before_summary = dict(db.execute("SELECT COUNT(*) days,COALESCE(SUM(total_trucks),0) trucks,ROUND(COALESCE(SUM(total_waste_tons),0),2) tons FROM daily_reports WHERE report_date LIKE '2026-09-%'").fetchone())
        for date, d in days.items():
            r = db.execute('SELECT * FROM daily_reports WHERE report_date=?', (date,)).fetchone()
            if r is None:
                cols = {x['name'] for x in db.execute('PRAGMA table_info(daily_reports)')}
                fields = {'report_date': date, 'report_no': 'MINYA-' + date, 'start_time': '', 'end_time': '', 'notes': 'كميات مستوردة من كشوف سبتمبر 2026. بقية البيانات غير مدخلة.'}
                if 'workflow_status' in cols:
                    fields['workflow_status'] = 'draft'
                sql = 'INSERT INTO daily_reports (' + ','.join(fields) + ') VALUES (' + ','.join('?' for _ in fields) + ')'
                rid = db.execute(sql, tuple(fields.values())).lastrowid
                counts['created'] += 1
            else:
                rid = r['id']
                counts['updated'] += 1
            ops = [x for x in db.execute('SELECT * FROM operations WHERE report_id=?', (rid,)) if norm(x['operation_name']) == norm(LANDFILL)]
            assert len(ops) <= 1, 'Duplicate landfill operation on ' + date
            if ops:
                db.execute("UPDATE operations SET vehicle_count=?,quantity=?,unit='طن' WHERE id=?", (d['landfill_count'], float(d['landfill_tons']), ops[0]['id']))
            else:
                db.execute("INSERT INTO operations(report_id,operation_name,vehicle_count,quantity,unit) VALUES(?,?,?,?,'طن')", (rid, LANDFILL, d['landfill_count'], float(d['landfill_tons'])))
            existing = list(db.execute('SELECT * FROM transfer_stations WHERE report_id=?', (rid,)))
            assert all(norm(x['station_name']) in {norm(s) for s in STATIONS} for x in existing), 'Unexpected station on ' + date
            for name, target in d['stations'].items():
                found = [x for x in existing if norm(x['station_name']) == norm(name)]
                assert len(found) <= 1, 'Duplicate station on ' + date
                if found:
                    db.execute("UPDATE transfer_stations SET truck_count=?,waste_tons=?,unit='طن' WHERE id=?", (target['count'], float(target['tons']), found[0]['id']))
                else:
                    db.execute("INSERT INTO transfer_stations(report_id,station_name,truck_count,waste_tons,unit,notes) VALUES(?,?,?,?,'طن',?)", (rid, name, target['count'], float(target['tons']), NOTE if name == STATIONS[0] else ''))
            db.execute('''INSERT INTO station_subsource_daily(entry_date,station_name,source_name,record_count,quantity_tons,included_in_station_total,notes)
                VALUES(?,?,?,?,?,1,?) ON CONFLICT(entry_date,station_name,source_name) DO UPDATE SET
                record_count=excluded.record_count,quantity_tons=excluded.quantity_tons,included_in_station_total=1,updated_at=CURRENT_TIMESTAMP''', (date, STATIONS[0], SOURCE, d['aziz_count'], float(d['aziz_tons']), NOTE))
            db.execute('UPDATE daily_reports SET total_trucks=?,total_waste_tons=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', (d['incoming_count'], float(d['incoming_tons']), rid))
        result = verify(db, days)
        after = protected(db)
        for table, rows in before.items():
            preserved = [r for r in after[table] if 'id' not in r or r['id'] in original_ids[table]]
            assert rows == preserved, 'Unexpected change to protected content: ' + table
        assert not list(db.execute('PRAGMA foreign_key_check'))
        db.execute('''INSERT INTO audit_logs(username,action,entity_type,entity_id,details) VALUES('github-data-import','IMPORT_SEPTEMBER_2026','reports','2026-09',?)''', (json.dumps({'totals': result, 'source_review_required': data.get('source_review_required', []), 'backup': backup.name if backup else None}, ensure_ascii=False),))
        if apply:
            db.execute('COMMIT')
            result = verify(db, days)
        else:
            db.execute('ROLLBACK')
        summary = {'mode': 'applied' if apply else 'dry-run', **counts, 'before': before_summary, 'after': result, 'protected_data_unchanged': True, 'backup_created': bool(backup)}
        print(json.dumps(summary, ensure_ascii=False))
        return summary
    except BaseException:
        if db.in_transaction:
            db.execute('ROLLBACK')
        raise
    finally:
        db.close()


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--db', required=True)
    p.add_argument('--data', required=True)
    p.add_argument('--backup-dir', required=True)
    p.add_argument('--apply', action='store_true')
    a = p.parse_args()
    run(a.db, json.loads(Path(a.data).read_text()), a.backup_dir, a.apply)
