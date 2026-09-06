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
