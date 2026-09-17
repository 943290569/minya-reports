const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const serverPath=path.join(root,'server.js');
const appPath=path.join(root,'public','app.js');
let server=fs.readFileSync(serverPath,'utf8');
const oldPages='const appPages=["/report","/archive","/monthly","/annual","/equipment","/weekly","/search","/managerial","/reviews","/admin"];';
const newPages='const appPages=["/report","/archive","/monthly","/annual","/equipment","/equipment-management","/files","/weekly","/search","/managerial","/reviews","/admin","/ops-dashboard","/fleet","/maintenance-incidents","/environment","/tasks","/contracts","/cells","/global-search"];';
if(server.includes(oldPages))server=server.replace(oldPages,newPages);
else if(server.includes('const appPages=')&&(!server.includes('"/equipment-management"')||!server.includes('"/files"')))server=server.replace(/const appPages=\[[^;]+\];/,newPages);
else if(!server.includes('"/ops-dashboard"'))throw new Error('appPages mount point not found');
server=server.replace('const AUDIT_LOG_RETENTION_COUNT = 5;','const AUDIT_LOG_RETENTION_COUNT = 1000;');
server=server.replace('const AUTO_BACKUP_RETENTION_COUNT = 5;','const AUTO_BACKUP_RETENTION_COUNT = 10;');
server=server.replace('const backupJsonParser = express.json({ limit: "50mb" });','const backupJsonParser = express.json({ limit: "100mb" });');
server=server.replace('if (req.path === "/api/backup/restore" || req.path === "/api/backup/validate") return backupJsonParser(req,res,next);','if (req.path === "/api/backup/restore" || req.path === "/api/backup/validate" || req.path === "/api/ops/restore") return backupJsonParser(req,res,next);');
const stationModule='require("./station-subsources")(app,{db,requireAuth,requireRole,audit});';
if(!server.includes(stationModule)){
  const stationAnchor='require("./cloud-files")(app,{db,requireAuth,requireRole,audit});';
  if(server.includes(stationAnchor))server=server.replace(stationAnchor,`${stationAnchor}\n${stationModule}`);
  else throw new Error('Station subsource module mount point not found');
}
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
  const managementFiles = rows('management_files').map(item => ({ ...item, data_base64: Buffer.isBuffer(item.data) ? item.data.toString('base64') : '', data: undefined }));
  return { system: "Minya Landfill System", version: "3.2.0", exported_at: new Date().toISOString(), reports, maintenance, external_diesel: rows('external_diesel_entries'), appearance_settings: getSharedAppearanceSettings().settings, operations_data: { movement_vehicles: rows('movement_vehicles'), driver_licenses: driverLicenses, incident_logs: rows('incident_logs'), incident_files: incidentFiles, environmental_logs: rows('environmental_logs'), operation_tasks: rows('operation_tasks'), contractor_contracts: rows('contractor_contracts'), landfill_cells: rows('landfill_cells'), management_files: rows('management_files'), equipment_assets: rows('equipment_assets'), equipment_meter_readings: rows('equipment_meter_readings'), preventive_maintenance_plans: rows('preventive_maintenance_plans'), equipment_work_orders: rows('equipment_work_orders'), external_diesel: rows('external_diesel_entries'), station_subsources: rows('station_subsource_monthly'), station_subsource_daily: rows('station_subsource_daily'), feature_permissions: rows('feature_permissions') } };
}`);
}
fs.writeFileSync(serverPath,server,'utf8');
require('./install-monthly-close');
console.log('Operations suite routes, management modules, permissions, station subsources and complete backup/restore limits installed.');
// Deployment marker: station subsource daily import v2.
