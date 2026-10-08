import json,subprocess,sys,os,sqlite3,tempfile,datetime
from pathlib import Path
p=json.load(sys.stdin)
apps=json.loads(subprocess.check_output(['pm2','jlist'],text=True))
matches=[a for a in apps if a.get('name')==p['name']]
assert len(matches)==1,'Active application must be uniquely identified'
env=matches[0]['pm2_env']; env={**env.get('env',{}),**env}
cwd=Path(env.get('pm_cwd') or p['path']).resolve()
root=Path(env.get('MINYA_DATA_DIR') or ('/data' if env.get('RAILWAY_ENVIRONMENT') else cwd)).resolve()
dbfile=root/'database.db'
assert dbfile.is_file(),'Active database must exist'
db=sqlite3.connect('file:'+str(dbfile)+'?mode=ro',uri=True)
assert db.execute('PRAGMA quick_check').fetchone()[0]=='ok'
backupdir=Path.home()/'minya-db-backups'/'soil-2026-08-09'
backupdir.mkdir(parents=True,exist_ok=True)
backup=backupdir/('soil-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%f')+'.db')
target=sqlite3.connect(backup); db.backup(target); target.close()
os.chmod(backup,0o600)
print('Backup created before import',flush=True)
with tempfile.TemporaryDirectory(prefix='.soil-import-',dir=cwd) as temporary:
    work=Path(temporary)
    (work/'scripts').mkdir()
    (work/'data'/'pending-review').mkdir(parents=True)
    (work/'node_modules').symlink_to(cwd/'node_modules',target_is_directory=True)
    script=work/'scripts'/'import-soil-trips-2026.js'
    script.write_text(p['script'],encoding='utf-8')
    (work/'data'/'pending-review'/'soil-trips-2026-08-09.csv').write_text(p['csv'],encoding='utf-8')
    nodeenv=os.environ.copy(); nodeenv['MINYA_DATA_DIR']=str(root)
    def run(apply=False):
        command=['node',str(script)]+(['--apply-acknowledge-unverified'] if apply else [])
        output=subprocess.check_output(command,cwd=cwd,env=nodeenv,text=True)
        print(output,flush=True)
        return json.JSONDecoder().raw_decode(output.strip())[0]
    dry=run()
    assert dry['source_rows']==78 and dry['source_trips']==959
    assert not dry['conflicts'],'Existing rows conflict, database was not modified'
    applied=run(True)
    repeated=run()
    assert repeated['inserted_days']==0 and not repeated['conflicts'],'Idempotency verification failed'
    assert applied['inserted_days']+applied['already_present']+len(applied['missing_reports'])==applied['days']
    expected={}
    for line in p['csv'].strip().splitlines()[1:]:
        date,machine,trips,status,photo=line.split(',')
        expected[date]=expected.get(date,0)+int(trips)
    verified=[]
    for date,total in sorted(expected.items()):
        report=db.execute('SELECT id FROM daily_reports WHERE report_date=?',(date,)).fetchone()
        if report is None: continue
        rows=db.execute("SELECT vehicle_count,quantity,unit FROM operations WHERE report_id=? AND operation_name=? AND notes LIKE ?",(report[0],'مواد التغطية (طمم)','%[soil-trip-import-2026-08-09:'+date+':daily]%')).fetchall()
        assert len(rows)==1 and float(rows[0][0])==total and float(rows[0][1])==total*15 and rows[0][2]=='كوب','Daily total verification failed: '+date
        verified.append((date,total))
    assert db.execute('PRAGMA quick_check').fetchone()[0]=='ok'
    baseline=sqlite3.connect('file:'+str(backup)+'?mode=ro',uri=True)
    # Verify each pre-existing operation is preserved exactly.
    columns=[r[1] for r in baseline.execute('PRAGMA table_info(operations)')]
    idcol=columns.index('id')
    for before in baseline.execute('SELECT * FROM operations'):
        after=db.execute('SELECT * FROM operations WHERE id=?',(before[idcol],)).fetchone()
        date=baseline.execute('SELECT report_date FROM daily_reports WHERE id=?',(before[columns.index('report_id')],)).fetchone()[0]
        name=before[columns.index('operation_name')]
        note=str(before[columns.index('notes')] or '')
        migrated_cover=date in expected and name.strip() in ('مواد التغطية (طمم)','مواد التغطية ( طمم)')
        migrated_import=date in expected and name=='نقل الطمم' and ('[soil-trip-import-2026-08-09:'+date+':daily]') in note
        if migrated_import: assert after is None,'Duplicate transport row remains'
        elif migrated_cover:
            assert after is not None and after[columns.index('vehicle_count')]==expected[date] and after[columns.index('quantity')]==expected[date]*15
            for index,col in enumerate(columns):
                if col not in ('operation_name','vehicle_count','quantity','unit','notes'): assert after[index]==before[index],'Cover metadata changed'
        else: assert after==before,'Unrelated operation changed'
    # Compare daily report rows from the backup, including waste quantities and truck counts.
    reportcols=[r[1] for r in baseline.execute('PRAGMA table_info(daily_reports)')]
    reportid=reportcols.index('id')
    for before in baseline.execute('SELECT * FROM daily_reports'):
        after=db.execute('SELECT * FROM daily_reports WHERE id=?',(before[reportid],)).fetchone()
        assert after==before,'Daily report fields changed'
    baseline.close()
    monthly={}
    for date,total in verified: monthly[date[:7]]=monthly.get(date[:7],0)+total
    print(json.dumps({'verified_days':len(verified),'verified_trips':sum(x[1] for x in verified),'monthly_trips':monthly,'missing_reports':applied['missing_reports'],'preserved_unrelated_operations':True,'verified_volume':sum(x[1] for x in verified)*15,'preserved_daily_reports':True,'idempotent':True},ensure_ascii=False),flush=True)
db.close()

