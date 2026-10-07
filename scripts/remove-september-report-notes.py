import datetime
import json
import sqlite3
from pathlib import Path

TEXT = 'كميات مستوردة من كشوف سبتمبر 2026. بقية البيانات غير مدخلة.'

def snapshot(db):
    return {t: [dict(r) for r in db.execute('SELECT * FROM "'+t.replace('"','""')+'" ORDER BY rowid')] for t, in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")}

def run(dbpath, backups, apply=False):
    assert Path(dbpath).is_file()
    db = sqlite3.connect(dbpath, timeout=30, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    if apply:
        Path(backups).mkdir(parents=True, exist_ok=True)
        target = Path(backups)/('before-report-note-cleanup-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'.db')
        with sqlite3.connect(target) as dest:
            db.backup(dest)
            assert dest.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        target.chmod(0o600)
    db.execute('BEGIN IMMEDIATE')
    try:
        before = snapshot(db)
        expected = json.loads(json.dumps(before, ensure_ascii=False))
        ids = {r['id'] for r in before['daily_reports'] if r['report_date'].startswith('2026-09-')}
        assert len(ids) == 30
        changed = 0
        for r in expected['daily_reports']:
            if r['id'] in ids and r['notes'] == TEXT:
                r['notes'] = ''
                db.execute('UPDATE daily_reports SET notes=? WHERE id=?', ('', r['id']))
                changed += 1
        staged_changed = 0
        for r in expected.get('monthly_entry_rows', []):
            if not r['report_date'].startswith('2026-09-'): continue
            data = json.loads(r['data_json'])
            dirty = False
            if data.get('notes') == TEXT:
                data['notes'] = ''
                dirty = True
            if dirty:
                r['data_json'] = json.dumps(data, ensure_ascii=False)
                db.execute('UPDATE monthly_entry_rows SET data_json=? WHERE id=?', (r['data_json'], r['id']))
                staged_changed += 1
        assert snapshot(db) == expected, 'Unexpected data change'
        assert not db.execute('PRAGMA foreign_key_check').fetchall()
        db.execute('COMMIT' if apply else 'ROLLBACK')
        if not apply: assert snapshot(db) == before
        result = {'applied': apply, 'report_notes_removed': changed, 'staged_rows_updated': staged_changed, 'all_other_data_unchanged': True}
        print(json.dumps(result))
        return result
    except Exception:
        if db.in_transaction: db.execute('ROLLBACK')
        raise
    finally:
        db.close()
