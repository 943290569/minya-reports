"""Replace only recorded landfill-equipment diesel for the supplied dates."""
import datetime
import json
import sqlite3
from pathlib import Path


def norm(value):
    return ''.join(str(value).split()).replace('أ','ا').replace('إ','ا').replace('ة','ه').replace('ى','ي').lower()


def validate(data):
    assert set(data['months'])=={'2026-07','2026-08','2026-09'}
    assert len(data['equipment_names'])==16 and len(set(data['equipment_names']))==16
    expected={'2026-07':(31,19853),'2026-08':(31,21328),'2026-09':(6,4702)}
    for month,source in data['months'].items():
        count,total=expected[month]
        assert list(source['days'])==[month+f'-{day:02}' for day in range(1,count+1)]
        assert sum(d['total'] for d in source['days'].values())==source['equipment_total']==total
        assert total+source['external_total']+source['other_total']==source['full_sheet_total']
        for date,d in source['days'].items():
            datetime.date.fromisoformat(date)
            assert set(d['equipment'])==set(data['equipment_names'])
            assert all(isinstance(q,(int,float)) and q>=0 for q in d['equipment'].values())
            assert sum(d['equipment'].values())==d['total']


def snapshot(db):
    return {table:[dict(r) for r in db.execute('SELECT * FROM "'+table.replace('"','""')+'"')] for table, in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")}


def run(dbpath,data,backups,apply=False):
    validate(data)
    assert Path(dbpath).is_file()
    db=sqlite3.connect(dbpath,timeout=30,isolation_level=None);db.row_factory=sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    if apply:
        Path(backups).mkdir(parents=True,exist_ok=True)
        target=Path(backups)/('before-diesel-q3-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'.db')
        with sqlite3.connect(target) as dest:
            db.backup(dest)
            assert dest.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
        target.chmod(0o600)
    db.execute('BEGIN IMMEDIATE')
    try:
        before=snapshot(db); touched_reports=set();touched_equipment=set();touched_staged=set(); result={}
        for month,source in data['months'].items():
            old_total=0
            for date,day in source['days'].items():
                r=db.execute('SELECT * FROM daily_reports WHERE report_date=?',(date,)).fetchone()
                assert r is not None, 'Missing daily report: '+date
                rid=r['id'];old_total+=r['total_diesel'] or 0
                rows=list(db.execute('SELECT * FROM equipment WHERE report_id=?',(rid,)))
                names={norm(name) for name in data['equipment_names']}
                assert all(norm(x['equipment_name']) in names or not x['diesel_liters'] for x in rows), 'Unexpected equipment diesel outside landfill whitelist: '+date
                for name,quantity in day['equipment'].items():
                    matches=[x for x in rows if norm(x['equipment_name'])==norm(name)]
                    assert len(matches)<=1, 'Duplicate equipment '+name+' on '+date
                    if matches:
                        eid=matches[0]['id'];db.execute('UPDATE equipment SET diesel_liters=? WHERE id=?',(quantity,eid));touched_equipment.add(eid)
                    else:
                        db.execute("INSERT INTO equipment(report_id,equipment_name,operating_status,working_hours,diesel_liters,notes) VALUES(?,?,'',NULL,?,'سولار مستورد من كشف '||?||'؛ الحالة والساعات غير مدخلة.')",(rid,name,quantity,month))
                db.execute('UPDATE daily_reports SET total_diesel=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',(day['total'],rid));touched_reports.add(rid)
                saved=db.execute('SELECT SUM(COALESCE(diesel_liters,0)) FROM equipment WHERE report_id=?',(rid,)).fetchone()[0]
                assert abs(saved-day['total'])<0.005
                staged=db.execute('SELECT * FROM monthly_entry_rows WHERE report_date=?',(date,)).fetchone() if 'monthly_entry_rows' in before else None
                if staged:
                    obj=json.loads(staged['data_json'])
                    stage_equipment=obj.get('equipment') if isinstance(obj.get('equipment'),list) else []
                    for name,quantity in day['equipment'].items():
                        matches=[x for x in stage_equipment if norm(x.get('equipment_name'))==norm(name)]
                        assert len(matches)<=1, 'Duplicate staged equipment'
                        if matches:matches[0]['diesel_liters']=quantity
                        else:stage_equipment.append(dict(db.execute('SELECT * FROM equipment WHERE report_id=? AND equipment_name=?',(rid,name)).fetchone()))
                    obj['equipment']=stage_equipment
                    obj['total_diesel']=day['total']
                    for key in ('stored_totals','summary_totals'):
                        if isinstance(obj.get(key),dict):obj[key]['diesel']=day['total']
                    db.execute('UPDATE monthly_entry_rows SET data_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',(json.dumps(obj,ensure_ascii=False),staged['id']));touched_staged.add(staged['id'])
            result[month]={'imported_days':len(source['days']),'before_selected_days_liters':old_total,'imported_liters':source['equipment_total'],'whole_month_liters':db.execute('SELECT SUM(total_diesel) FROM daily_reports WHERE report_date LIKE ?',(month+'-%',)).fetchone()[0],'coverage':source['coverage']}
        after=snapshot(db)
        for table,rows in before.items():
            current={r['id']:r for r in after[table] if 'id' in r}
            for old in rows:
                ignored=set()
                if table=='daily_reports' and old['id'] in touched_reports:ignored={'total_diesel','updated_at'}
                elif table=='equipment' and old['id'] in touched_equipment:ignored={'diesel_liters'}
                elif table=='monthly_entry_rows' and old['id'] in touched_staged:
                    a=json.loads(old['data_json']);b=json.loads(current[old['id']]['data_json'])
                    for key in ('equipment','total_diesel'):a.pop(key,None);b.pop(key,None)
                    for key in ('stored_totals','summary_totals'):
                        if isinstance(a.get(key),dict):a[key].pop('diesel',None)
                        if isinstance(b.get(key),dict):b[key].pop('diesel',None)
                    assert a==b, 'Unexpected staged data change'
                    ignored={'data_json','updated_at'}
                if ignored:
                    assert {k:v for k,v in old.items() if k not in ignored}=={k:v for k,v in current[old['id']].items() if k not in ignored}, 'Protected fields changed in '+table
                else:assert old in after[table], 'Protected content changed in '+table
        assert not list(db.execute('PRAGMA foreign_key_check'))
        summary={'mode':'applied' if apply else 'dry-run','months':result,'protected_data_unchanged':True,'source_date_corrections':data['corrections'],'external_and_other_columns_not_added_to_landfill':True}
        db.execute("INSERT INTO audit_logs(username,action,entity_type,entity_id,details) VALUES('github-data-import','IMPORT_Q3_2026_DIESEL','reports','2026-Q3',?)",(json.dumps(summary,ensure_ascii=False),))
        db.execute('COMMIT' if apply else 'ROLLBACK')
        print(json.dumps(summary,ensure_ascii=False));return summary
    except BaseException:
        if db.in_transaction:db.execute('ROLLBACK')
        raise
    finally:db.close()
