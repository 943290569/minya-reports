import sqlite3,json
def run(path,data,backups,verify):
    db=sqlite3.connect('file:'+str(path)+'?mode=ro',uri=True)
    db.row_factory=sqlite3.Row
    for table in ('equipment_assets','movement_vehicles'):
        print(table.upper(),json.dumps([dict(r) for r in db.execute('SELECT * FROM '+table)],ensure_ascii=False))
    print('SCHEMA',json.dumps([dict(r) for r in db.execute("SELECT name,sql FROM sqlite_master WHERE name IN ('audit_log','audit_logs')")],ensure_ascii=False))
    db.close()
