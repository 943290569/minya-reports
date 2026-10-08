import sqlite3,json,datetime,hashlib
from pathlib import Path

ASSET_NAMES={5:'CAT 963 موديل 2022',6:'CAT 816',7:'CAT 963K',8:'CAT 963 موديل 2023',11:'Bomag 36 طن',12:'Ford Medical Waste',13:'CAT 336E',16:'CAT 950H',18:'Bomag 24 طن',19:'Kia'}
def plate_label(r):
    return r['plate'] or ('غير متوفر — JOHN DEERE 5080G' if r['index']==9 else 'غير مقروء — Ford TRANSIT')
def snapshot(db,excluded):
    result={}
    for (name,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"):
        if name not in excluded:
            rows=db.execute('SELECT * FROM "'+name.replace('"','""')+'" ORDER BY rowid').fetchall()
            result[name]=hashlib.sha256(repr([tuple(r) for r in rows]).encode()).hexdigest()
    return result
def run(path,data,backups,verify=False):
    records=data['records'];assert len(records)==20
    assert len(set(plate_label(r) for r in records))==20
    db=sqlite3.connect(path);db.row_factory=sqlite3.Row;db.execute('PRAGMA foreign_keys=ON')
    allowed={'movement_vehicles','equipment_assets','vehicle_document_imports','audit_logs'}
    before=snapshot(db,allowed)
    if not verify:
        backups=Path(backups);backups.mkdir(parents=True,exist_ok=True)
        target=backups/('vehicle-register-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%f')+'.db')
        with sqlite3.connect(target) as backup:db.backup(backup)
    try:
        db.execute('BEGIN IMMEDIATE')
        db.execute('''CREATE TABLE IF NOT EXISTS vehicle_document_imports(source TEXT NOT NULL,source_row INTEGER NOT NULL,vehicle_id INTEGER NOT NULL,asset_id INTEGER,document_json TEXT NOT NULL,imported_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(source,source_row),FOREIGN KEY(vehicle_id) REFERENCES movement_vehicles(id))''')
        created=updated=linked=0
        for r in records:
            prior=db.execute('SELECT * FROM vehicle_document_imports WHERE source=? AND source_row=?',(data['source'],r['index'])).fetchone()
            if prior:
                assert json.loads(prior['document_json'])==r,'Source changed: requires a separately reviewed import'
                assert db.execute('SELECT id FROM movement_vehicles WHERE id=?',(prior['vehicle_id'],)).fetchone()
                continue
            label=plate_label(r)
            candidates=db.execute('SELECT * FROM movement_vehicles WHERE plate_number=?',(label,)).fetchall()
            if not candidates and r.get('review'):
                import re
                oldplate=re.search(r'الرقم السابق (\d+)',r['review'])
                if oldplate:candidates=db.execute('SELECT * FROM movement_vehicles WHERE plate_number=?',(oldplate[1],)).fetchall()
            assert len(candidates)<=1,'Ambiguous vehicle identity'
            asset=None
            if r.get('chassis'):
                matches=db.execute("SELECT * FROM equipment_assets WHERE serial_number<>'' AND serial_number=?",(r['chassis'],)).fetchall()
                assert len(matches)<=1,'Ambiguous chassis'
                if matches:asset=matches[0]
            if asset is None and r['index'] in ASSET_NAMES:
                asset=db.execute('SELECT * FROM equipment_assets WHERE name=?',(ASSET_NAMES[r['index']],)).fetchone()
            note='مصدر الرخصة سجل المركبات، صفحات PDF '+r['pages']+'. تواريخ نسخ المستندات، وقد توجد تجديدات غير مرفقة.'
            if not r['plate']:note+=' رقم اللوحة يحتاج مراجعة؛ العبارة المعروضة ليست رقم لوحة.'
            if r.get('year'):note+=' سنة الإنتاج '+str(r['year'])+'.'
            if r.get('chassis'):note+=' الشاصي '+r['chassis']+'.'
            if r.get('engine'):note+=' المحرك '+r['engine']+'.'
            if r.get('review'):note+=' '+r['review']
            insurance='2019-05-14' if r['index']==9 else ''
            expiry=r.get('license_expiry') or ''
            if candidates:
                v=candidates[0];vid=v['id']
                # Existing populated values and renewal dates take precedence.
                notes=v['notes'] or ''
                if note not in notes:notes=(notes+'\n'+note).strip()
                db.execute('UPDATE movement_vehicles SET vehicle_license_expiry=?,insurance_expiry=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',(v['vehicle_license_expiry'] or expiry,v['insurance_expiry'] or insurance,notes,vid));updated+=1
            else:
                vid=db.execute('INSERT INTO movement_vehicles(plate_number,vehicle_type,model,vehicle_license_expiry,insurance_expiry,status,notes) VALUES(?,?,?,?,?,?,?)',(label,r['name'],r['model'],expiry,insurance,'غير محدد',note)).lastrowid;created+=1
            if asset:
                aid=asset['id'];notes=asset['notes'] or ''
                if note not in notes:notes=(notes+'\n'+note).strip()
                # Keep asset names, hours, operating status and existing identifiers intact.
                db.execute('UPDATE equipment_assets SET model=?,serial_number=?,manufacture_year=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',(asset['model'] or r['model'],asset['serial_number'] or r.get('chassis') or '',asset['manufacture_year'] or r.get('year'),notes,aid));linked+=1
            else:aid=None
            db.execute('INSERT INTO vehicle_document_imports(source,source_row,vehicle_id,asset_id,document_json) VALUES(?,?,?,?,?)',(data['source'],r['index'],vid,aid,json.dumps(r,ensure_ascii=False,sort_keys=True)))
        assert db.execute('SELECT COUNT(*) FROM vehicle_document_imports WHERE source=?',(data['source'],)).fetchone()[0]==20
        assert before==snapshot(db,allowed),'Unrelated records changed'
        assert not db.execute('PRAGMA foreign_key_check').fetchall()
        if verify:
            assert created==updated==linked==0,'Repeated import must not modify records'
            db.rollback()
        else:
            db.execute("INSERT INTO audit_logs(username,action,entity_type,entity_id,details) VALUES(?,?,?,?,?)",('Codex','IMPORT_VEHICLE_LICENSE_REGISTER','vehicle_register',data['source'],json.dumps({'records':20,'created':created,'updated':updated,'linked_assets':linked},ensure_ascii=False)))
            db.commit()
        print('IMPORT_RESULT',json.dumps({'verify':verify,'records':20,'created':created,'updated':updated,'linked_assets':linked,'missing_plate':2,'preserved_other_tables':True},ensure_ascii=False))
    except BaseException:
        db.rollback();raise
    finally:db.close()
