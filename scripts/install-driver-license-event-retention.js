const path=require('path');
const Database=require('better-sqlite3');

const dataDir=process.env.MINYA_DATA_DIR?path.resolve(process.env.MINYA_DATA_DIR):(process.env.RAILWAY_ENVIRONMENT?'/data':path.resolve(__dirname,'..'));
const dbPath=path.join(dataDir,'database.db');
const db=new Database(dbPath);

db.exec(`
CREATE TRIGGER IF NOT EXISTS trg_driver_license_events_keep_3
AFTER INSERT ON driver_license_events
BEGIN
  DELETE FROM driver_license_events
  WHERE driver_id = NEW.driver_id
    AND id NOT IN (
      SELECT id FROM driver_license_events
      WHERE driver_id = NEW.driver_id
      ORDER BY id DESC
      LIMIT 3
    );
END;

DELETE FROM driver_license_events
WHERE id IN (
  SELECT e.id
  FROM driver_license_events e
  WHERE e.id NOT IN (
    SELECT e2.id
    FROM driver_license_events e2
    WHERE e2.driver_id = e.driver_id
    ORDER BY e2.id DESC
    LIMIT 3
  )
);
`);

const left=db.prepare('SELECT COUNT(*) AS c FROM driver_license_events').get().c;
console.log(`Driver license event retention installed. Remaining events: ${left}`);
db.close();
