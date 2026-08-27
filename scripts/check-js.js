const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const roots = [
  "server.js",
  "public/app.js",
  "public/js",
];

function collect(target) {
  const full = path.join(process.cwd(), target);
  if (!fs.existsSync(full)) return [];
  const stat = fs.statSync(full);
  if (stat.isFile()) return target.endsWith(".js") ? [target] : [];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) return collect(child);
    return entry.isFile() && entry.name.endsWith(".js") ? [child] : [];
  });
}

const files = [...new Set(roots.flatMap(collect))].sort();
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status === 0) {
    console.log(`OK  ${file}`);
  } else {
    failed = true;
    console.error(`FAIL ${file}`);
    if (result.stderr) console.error(result.stderr.trim());
  }
}

console.log(`Checked ${files.length} JavaScript files.`);
process.exit(failed ? 1 : 0);
