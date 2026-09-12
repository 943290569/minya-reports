const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const serverPath=path.join(root,'server.js');
const appPath=path.join(root,'public','app.js');
let server=fs.readFileSync(serverPath,'utf8');
const oldPages='const appPages=["/report","/archive","/monthly","/annual","/equipment","/weekly","/search","/managerial","/reviews","/admin"];';
const newPages='const appPages=["/report","/archive","/monthly","/annual","/equipment","/weekly","/search","/managerial","/reviews","/admin","/ops-dashboard","/fleet","/maintenance-incidents","/environment","/global-search"];';
if(server.includes(oldPages))server=server.replace(oldPages,newPages);
else if(!server.includes('"/ops-dashboard"'))throw new Error('appPages mount point not found');
server=server.replace('const AUDIT_LOG_RETENTION_COUNT = 5;','const AUDIT_LOG_RETENTION_COUNT = 1000;');
server=server.replace('const AUTO_BACKUP_RETENTION_COUNT = 5;','const AUTO_BACKUP_RETENTION_COUNT = 10;');
server=server.replace('const backupJsonParser = express.json({ limit: "50mb" });','const backupJsonParser = express.json({ limit: "100mb" });');
server=server.replace('if (req.path === "/api/backup/restore" || req.path === "/api/backup/validate") return backupJsonParser(req,res,next);','if (req.path === "/api/backup/restore" || req.path === "/api/backup/validate" || req.path === "/api/ops/restore") return backupJsonParser(req,res,next);');
const backupPattern=/function buildBackupObject\(\) \{[\s\S]*?\n\}/;
if(backupPattern.test(server)){
  server=server.replace(backupPattern,`function buildBackupObject() {
  const reports = db.prepare(\`SELECT id FROM daily_reports ORDER BY report_date\`).all().map(r => getFullReport(r.id, true));
  const maintenance = db.prepare(\`SELECT * FROM maintenance_logs ORDER BY log_date,id\`).all();
  const rows = table => { try { return db.prepare(\`SELECT * FROM \${table}\`).all(); } catch { return []; } };
  const driverImageDir = path.join(uploadsDir, 'driver-licenses');
  const driverLicenses = rows('driver_licenses').map(item => {
    let image_base64 = '';
    try {
      const safeName = path.basename(String(item.image_name || ''));
      const file = safeName ? path.join(driverImageDir, safeName) : null;
      if (file && fs.existsSync(file) && fs.statSync(file).isFile()) image_base64 = fs.readFileSync(file).toString('base64');
    } catch {}
    return { ...item, image_base64 };
  });
  const incidentFiles = rows('incident_files').map(item => ({ ...item, data_base64: Buffer.isBuffer(item.data) ? item.data.toString('base64') : '', data: undefined }));
  return { system: "Minya Landfill System", version: "3.2.0", exported_at: new Date().toISOString(), reports, maintenance, appearance_settings: getSharedAppearanceSettings().settings, operations_data: { movement_vehicles: rows('movement_vehicles'), driver_licenses: driverLicenses, incident_logs: rows('incident_logs'), incident_files: incidentFiles, environmental_logs: rows('environmental_logs'), feature_permissions: rows('feature_permissions') } };
}`);
}
fs.writeFileSync(serverPath,server,'utf8');
require('./install-monthly-close');
let app=fs.readFileSync(appPath,'utf8');
app=app.replace(/const MINYA_ASSET_VERSION = "[^"]+";/,'const MINYA_ASSET_VERSION = "3.5.0-20260911-typography-v2a";');
fs.writeFileSync(appPath,app,'utf8');
console.log('Operations suite routes, permissions, complete backup/restore limits and asset version installed.');
