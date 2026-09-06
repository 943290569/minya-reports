const fs = require("fs");
const path = require("path");
const Module = require("module");

const root = path.resolve(__dirname, "..");
const serverPath = path.join(root, "server.js");
const pkg = require(path.join(root, "package.json"));
const version = String(pkg.version || "3.3.0");

let source = fs.readFileSync(serverPath, "utf8");

const replacements = [
  [
    'const backupJsonParser = express.json({ limit: "50mb" });',
    'const backupJsonParser = express.json({ limit: "64mb" });'
  ],
  [
    '["approved_by_name", "TEXT DEFAULT \'\'"]\n].forEach(([name, definition]) => {',
    '["approved_by_name", "TEXT DEFAULT \'\'"],\n  ["returned_reason", "TEXT DEFAULT \'\'"],\n  ["returned_at", "TEXT"],\n  ["returned_by", "INTEGER"],\n  ["returned_to", "INTEGER"]\n].forEach(([name, definition]) => {'
  ],
  [
    "db.prepare(`UPDATE daily_reports SET workflow_status='pending',submitted_at=?,submitted_by=?,approved_at=NULL,approved_by=NULL,approved_by_name='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(now,req.user.id,id);",
    "db.prepare(`UPDATE daily_reports SET workflow_status='pending',submitted_at=?,submitted_by=?,approved_at=NULL,approved_by=NULL,approved_by_name='',returned_reason='',returned_at=NULL,returned_by=NULL,returned_to=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(now,req.user.id,id);"
  ],
  [
    "const reason=String(req.body?.reason||\"\").trim().slice(0,500);db.prepare(`UPDATE daily_reports SET workflow_status='draft',submitted_at=NULL,submitted_by=NULL,approved_at=NULL,approved_by=NULL,approved_by_name='',updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(id);",
    "const reason=String(req.body?.reason||\"\").trim().slice(0,500);const returnedAt=new Date().toISOString();const returnedTo=report.submitted_by||null;db.prepare(`UPDATE daily_reports SET workflow_status='draft',submitted_at=NULL,submitted_by=NULL,approved_at=NULL,approved_by=NULL,approved_by_name='',returned_reason=?,returned_at=?,returned_by=?,returned_to=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(reason,returnedAt,req.user.id,returnedTo,id);"
  ],
  [
    'return { system: "Minya Landfill System", version: "3.2.0", exported_at:',
    `return { system: "Minya Landfill System", version: "${version}", exported_at:`
  ],
  [
    'res.json({ ok: true, system: "Minya Landfill System V3.2 Stable", database: "SQLite", version: "3.2.0", integrity });',
    `res.json({ ok: true, system: "Minya Landfill System V${version} Stable", database: "SQLite", version: "${version}", integrity });`
  ],
  [
    'app.listen(PORT, HOST, () => console.log(`Minya Landfill V3 running on http://${HOST}:${PORT}`));',
    `app.listen(PORT, HOST, () => console.log(\`Minya Landfill V${version} running on http://\${HOST}:\${PORT}\`));`
  ]
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`Runtime server sync failed: expected source fragment not found: ${before.slice(0, 80)}`);
  }
  source = source.replace(before, after);
}

const runtimeModule = new Module(serverPath, module);
runtimeModule.filename = serverPath;
runtimeModule.paths = Module._nodeModulePaths(root);
runtimeModule._compile(source, serverPath);
