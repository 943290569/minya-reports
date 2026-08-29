const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const loaderPath = path.join(root, "public", "app.js");
const outputPath = path.join(root, "public", "app-bundle.js");
const loader = fs.readFileSync(loaderPath, "utf8");

const startMarker = "/* MINYA_MODULES_START */";
const endMarker = "/* MINYA_MODULES_END */";
const start = loader.indexOf(startMarker);
const end = loader.indexOf(endMarker);

if (start < 0 || end < 0 || end <= start) {
  throw new Error("App loader module markers are missing or invalid");
}

const loaderBlock = loader.slice(start, end + endMarker.length);
const modulePaths = [...loaderBlock.matchAll(/"(js\/[^"]+\.js)"/g)].map((match) => match[1]);

if (!modulePaths.length) {
  throw new Error("No frontend modules were found in the app loader");
}

const modules = modulePaths.map((relativePath) => {
  const absolutePath = path.join(root, "public", relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  return `\n/* ===== ${relativePath} ===== */\n${source}\n;`;
}).join("\n");

const bundle = `${loader.slice(0, start)}${modules}\n${loader.slice(end + endMarker.length)}`;
new vm.Script(bundle, { filename: "public/app-bundle.js" });

if (process.argv.includes("--check")) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== bundle) {
    console.error("public/app-bundle.js is outdated. Run: npm run build:app");
    process.exit(1);
  }
  console.log(`Frontend bundle is current (${modulePaths.length} modules).`);
} else {
  fs.writeFileSync(outputPath, bundle);
  console.log(`Built public/app-bundle.js from ${modulePaths.length} modules.`);
}
