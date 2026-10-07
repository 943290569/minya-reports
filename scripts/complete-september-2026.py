"""Complete missing generated report fields using the site's established rules."""
import datetime
import json
import math
import sqlite3
import urllib.request
from collections import Counter
from pathlib import Path

CREWS = ['سائقين جرافات واليات','سائقين شحن(قلابات)','عمال زراعة','استقبال وتوجيه الشاحنات','عمال تنظيف وتطاير داخلي','عمال تنظيف تطاير خارجي']
EQUIPMENT = ['جرافة جنزير 2023','جرافة جنزير 2019','جرافة جنزير 2022','باجر جنزير','مدحلة نفايات 2024','قلاب 1770','قلاب 1772','مدحلة 36 طن','مدحلة 24 طن','تركتر لانديني','تركتر جندير','شاحنة تنك مياه','باجر عجل F428','بوبكات','ماكنة رش الضباب','مولد الكهرباء']
OPS = [('مواد التغطية (اسلوب)','نقلة'),('مواد التغطية (طمم)','كوب'),('كميات المياه للتعقيم والترطيب','كوب'),('عدد مرات رش المياه','مرة'),('كميات العصارة المرحلة','كوب'),('خط الفرز','طن'),('طمم خارجي','طن')]
GENERATED = 'توليد تلقائي حسب قواعد التقرير المعتمدة؛ قابل للتعديل.'


def label(code):
    if code == 0: return 'مشمس'
    if code in (1,2): return 'غائم جزئيًا'
    if code == 3: return 'غائم'
    if code in (45,48): return 'ضباب'
    if code in (51,53,55,61,63,65,80,81,82): return 'ماطر'
    if code in (71,73,75,85,86): return 'ثلجي'
    if code in (95,96,99): return 'عاصف'
    return 'غير محدد'


def weather():
    url = 'https://archive-api.open-meteo.com/v1/archive?latitude=31.6364&longitude=35.2145&start_date=2026-09-01&end_date=2026-09-30&hourly=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FHebron'
    with urllib.request.urlopen(url, timeout=30) as response:
        raw = json.load(response)['hourly']
    grouped = {}
    for i, time in enumerate(raw['time']):
        if not 9 <= int(time[11:13]) <= 13: continue
        values = [raw[k][i] for k in ('temperature_2m','relative_humidity_2m','weather_code')]
        assert all(v is not None and math.isfinite(v) for v in values), 'Missing weather observation'
        grouped.setdefault(time[:10], []).append(values)
    result = {}
    for date, values in grouped.items():
        assert len(values) == 5
        freq = Counter(v[2] for v in values)
        # Mirrors the site's ascending weather-code enumeration for tied frequencies.
        code = max(sorted(freq), key=lambda c:freq[c])
        result[date] = {'weather':label(code),'temperature':sum(v[0] for v in values)/5,'humidity':sum(v[1] for v in values)/5}
    assert list(sorted(result)) == [f'2026-09-{d:02}' for d in range(1,31)]
    return result


def sprays(date, w):
    seed = int(date.replace('-','')[-4:])
    if w['weather'] in ('ماطر','ثلجي'): return 0, 'ماطر/ثلجي'
    if datetime.date.fromisoformat(date).weekday() == 4: return 4 + seed % 2, 'الجمعة'
    if w['temperature'] <= 15: return 4, 'بارد'
    if w['humidity'] >= 75: return 2 + seed % 2, 'رطب'
    return 8 + seed % 2, 'جاف'


def snapshot(db):
    out = {}
    for table, in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"):
        out[table] = [dict(r) for r in db.execute('SELECT * FROM "'+table.replace('"','""')+'" ORDER BY rowid')]
    return out


def run(dbpath, wx, backups, apply=False):
    assert Path(dbpath).is_file()
    db = sqlite3.connect(dbpath, timeout=30, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    if apply:
        Path(backups).mkdir(parents=True,exist_ok=True)
        target=Path(backups)/('before-completion-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'.db')
        with sqlite3.connect(target) as dest:
            db.backup(dest)
            assert dest.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
        target.chmod(0o600)
    db.execute('BEGIN IMMEDIATE')
    try:
        before=snapshot(db)
        reports=list(db.execute("SELECT * FROM daily_reports WHERE report_date LIKE '2026-09-%' ORDER BY report_date"))
        assert len(reports)==30
        changed={'weather':0,'times':0,'workday':0,'water':0,'crews':0,'equipment':0,'operation_rows':0,'staged':0}
        allowed_reports=set(); allowed_staged=set()
        for row in reports:
            r=dict(row); date=r['report_date']; rid=r['id']; w=wx[date]
            assert 'كميات مستوردة من كشوف سبتمبر 2026' in r['notes'], 'Only the imported September reports can be completed'
            friday=datetime.date.fromisoformat(date).weekday()==4
            fields={}
            if not r['weather']:
                fields.update(weather=w['weather'],temperature=math.floor(w['temperature']+0.5));changed['weather']+=1
            for name,value in [('start_time','04:00'),('end_time','19:00')]:
                if not r[name]:fields[name]=value;changed['times']+=1
            if not r.get('workday_manual',0) and 'workday_type' in r:
                fields['workday_type']='holiday' if friday else 'official'
                fields['workday_reason']='يوم الجمعة - عطلة رسمية / دوام طوارئ' if friday else 'دوام رسمي'
                changed['workday']+=1
            if fields:
                db.execute('UPDATE daily_reports SET '+','.join(k+'=?' for k in fields)+',updated_at=CURRENT_TIMESTAMP WHERE id=?',tuple(fields.values())+(rid,));allowed_reports.add(rid)
            ops=list(db.execute('SELECT * FROM operations WHERE report_id=?',(rid,)))
            assert len([x for x in ops if x['operation_name']=='مكب نفايات المنيا'])==1
            water_count,rule=sprays(date,w)
            # Prefer actual driver entries if present; those driver's tanks hold 4 m3.
            real=db.execute('SELECT SUM(tanks) tanks,COUNT(DISTINCT driver_id) drivers FROM water_entries WHERE entry_date=?',(date,)).fetchone() if 'water_entries' in before else None
            for name,unit in OPS:
                matches=[x for x in ops if x['operation_name']==name]
                assert len(matches)<=1
                if matches:continue  # Includes deliberate saved zero values.
                qty=None; vehicles=None; note='لم تُقدم كمية لهذا البند في ملفات سبتمبر.'
                if name in ('عدد مرات رش المياه','كميات المياه للتعقيم والترطيب'):
                    count=int(real['tanks']) if real and real['tanks'] is not None else water_count
                    capacity=4 if real and real['tanks'] is not None else 3
                    qty=count if unit=='مرة' else count*capacity
                    vehicles=int(real['drivers']) if real and real['tanks'] is not None else (1 if count else 0)
                    note=('من إدخالات سائقي الرش، سعة التنك 4 كوب.' if capacity==4 else GENERATED+' '+rule+'؛ سعة الحساب 3 كوب.')
                    changed['water']+=1
                db.execute('INSERT INTO operations(report_id,operation_name,vehicle_count,quantity,unit,notes) VALUES(?,?,?,?,?,?)',(rid,name,vehicles,qty,unit,note));changed['operation_rows']+=1
            if not db.execute('SELECT 1 FROM crews WHERE report_id=?',(rid,)).fetchone():
                for name,count in zip(CREWS,[2,0,0,1,0,0] if friday else [4,2,1,2,4,5]):
                    db.execute('INSERT INTO crews(report_id,crew_name,crew_count,notes) VALUES(?,?,?,?)',(rid,name,count,GENERATED));changed['crews']+=1
            if not db.execute('SELECT 1 FROM equipment WHERE report_id=?',(rid,)).fetchone():
                for name in EQUIPMENT:
                    db.execute("INSERT INTO equipment(report_id,equipment_name,operating_status,working_hours,diesel_liters,notes) VALUES(?,?,'',NULL,NULL,'قائمة الآليات الافتراضية؛ الحالة والساعات والسولار غير مدخلة.')",(rid,name));changed['equipment']+=1
            staged=db.execute('SELECT * FROM monthly_entry_rows WHERE report_date=?',(date,)).fetchone() if 'monthly_entry_rows' in before else None
            if staged:
                data=json.loads(staged['data_json'])
                for item in data.get('operations',[]):
                    if item.get('operation_name')!='مكب نفايات المنيا':
                        saved=db.execute('SELECT quantity,vehicle_count FROM operations WHERE report_id=? AND operation_name=?',(rid,item.get('operation_name'))).fetchone()
                        assert (not item.get('quantity') and not item.get('vehicle_count')) or (saved and item.get('quantity')==saved['quantity'] and item.get('vehicle_count')==saved['vehicle_count']), 'Staged manual operation must be reviewed before replacement'
                assert not any(x.get('diesel_liters') or x.get('working_hours') for x in data.get('equipment',[])), 'Staged equipment data requires review'
                current=dict(db.execute('SELECT * FROM daily_reports WHERE id=?',(rid,)).fetchone())
                for k in ('weather','temperature','start_time','end_time','workday_type','workday_reason','workday_manual'):data[k]=current.get(k)
                for table in ('operations','equipment','crews'):
                    data[table]=[dict(x) for x in db.execute('SELECT * FROM '+table+' WHERE report_id=? ORDER BY id',(rid,))]
                data['auto']={**data.get('auto',{}),'water':False,'weather':False,'workday':False}
                db.execute('UPDATE monthly_entry_rows SET data_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',(json.dumps(data,ensure_ascii=False),staged['id']));allowed_staged.add(staged['id']);changed['staged']+=1
        after=snapshot(db)
        for table,rows in before.items():
            byid={r['id']:r for r in after[table] if 'id' in r}
            for old in rows:
                if table=='daily_reports' and old['id'] in allowed_reports:
                    current=byid[old['id']]
                    ignored={'weather','temperature','start_time','end_time','workday_type','workday_reason','updated_at'}
                    assert {k:v for k,v in old.items() if k not in ignored}=={k:v for k,v in current.items() if k not in ignored}
                elif table=='monthly_entry_rows' and old['id'] in allowed_staged:
                    assert old['updated_by']==byid[old['id']]['updated_by']
                else:
                    assert old in after[table], 'Unexpected change in '+table
        totals=dict(db.execute("SELECT COUNT(*) days,SUM(total_trucks) trucks,ROUND(SUM(total_waste_tons),2) tons,SUM(total_diesel) diesel FROM daily_reports WHERE report_date LIKE '2026-09-%'").fetchone())
        assert totals['days']==30 and totals['trucks']==3699 and totals['tons']==44909.56
        water_totals={r['operation_name']:r['quantity'] for r in db.execute("SELECT operation_name,SUM(quantity) quantity FROM operations WHERE report_id IN(SELECT id FROM daily_reports WHERE report_date LIKE '2026-09-%') AND operation_name IN('عدد مرات رش المياه','كميات المياه للتعقيم والترطيب') GROUP BY operation_name")}
        assert not list(db.execute('PRAGMA foreign_key_check'))
        summary={'mode':'applied' if apply else 'dry-run','changed':changed,'totals':totals,'water_totals':water_totals,'weather_source':'Open-Meteo archive 09:00–13:00','water_generated':True,'protected_data_unchanged':True}
        db.execute("INSERT INTO audit_logs(username,action,entity_type,entity_id,details) VALUES('github-data-import','COMPLETE_SEPTEMBER_AUTOMATIC_FIELDS','reports','2026-09',?)",(json.dumps(summary,ensure_ascii=False),))
        db.execute('COMMIT' if apply else 'ROLLBACK')
        print(json.dumps(summary,ensure_ascii=False))
        return summary
    except BaseException:
        if db.in_transaction:db.execute('ROLLBACK')
        raise
    finally:db.close()
