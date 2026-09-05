const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const loaderPath = path.join(root, "public", "app.js");
const outputPath = path.join(root, "public", "app-bundle.js");
const styleOutputPath = path.join(root, "public", "app-bundle.css");
const indexPath = path.join(root, "public", "index.html");
const loader = fs.readFileSync(loaderPath, "utf8");

const startMarker = "/* MINYA_MODULES_START */";
const endMarker = "/* MINYA_MODULES_END */";
const styleStartMarker = "/* MINYA_STYLES_START */";
const styleEndMarker = "/* MINYA_STYLES_END */";
const start = loader.indexOf(startMarker);
const end = loader.indexOf(endMarker);
const styleStart = loader.indexOf(styleStartMarker);
const styleEnd = loader.indexOf(styleEndMarker);

if (start < 0 || end < 0 || end <= start || styleStart < 0 || styleEnd < 0 || styleEnd <= styleStart) {
  throw new Error("App loader bundle markers are missing or invalid");
}

const versionMatch = loader.match(/const\s+MINYA_ASSET_VERSION\s*=\s*["']([^"']+)["']/);
if (!versionMatch) {
  throw new Error("MINYA_ASSET_VERSION is missing from public/app.js");
}
const assetVersion = versionMatch[1];

const loaderBlock = loader.slice(start, end + endMarker.length);
const styleBlock = loader.slice(styleStart, styleEnd + styleEndMarker.length);
const modulePaths = [...loaderBlock.matchAll(/"(js\/[^"]+\.js)"/g)].map((match) => match[1]);
const stylePaths = [...styleBlock.matchAll(/"([^"]+\.css)"/g)].map((match) => match[1]);

if (!modulePaths.length || !stylePaths.length) {
  throw new Error("No frontend modules or styles were found in the app loader");
}

const modules = modulePaths.map((relativePath) => {
  const absolutePath = path.join(root, "public", relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  return `\n/* ===== ${relativePath} ===== */\n${source}\n;`;
}).join("\n");

const styles = stylePaths.map((relativePath) => {
  const source = fs.readFileSync(path.join(root, "public", relativePath), "utf8");
  return `\n/* ===== ${relativePath} ===== */\n${source}\n`;
}).join("\n");

const bundleWithModules = `${loader.slice(0, start)}${modules}\n${loader.slice(end + endMarker.length)}`;
const bundle = bundleWithModules.replace(styleBlock, "");
new vm.Script(bundle, { filename: "public/app-bundle.js" });

function syncIndexAssetVersion(source) {
  return source
    .replace(/app-bundle\.css\?v=[^"']+/g, `app-bundle.css?v=${assetVersion}`)
    .replace(/app-bundle\.js\?v=[^"']+/g, `app-bundle.js?v=${assetVersion}`);
}

const indexSource = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
const syncedIndexSource = syncIndexAssetVersion(indexSource);

if (process.argv.includes("--check")) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  const currentStyles = fs.existsSync(styleOutputPath) ? fs.readFileSync(styleOutputPath, "utf8") : "";
  const bundleOutdated = current !== bundle || currentStyles !== styles;
  const indexOutdated = indexSource !== syncedIndexSource;

  if (bundleOutdated || indexOutdated) {
    if (bundleOutdated) console.error("Frontend bundles are outdated. Run: npm run build:app");
    if (indexOutdated) console.error(`public/index.html does not reference asset version ${assetVersion}. Run: npm run build:app`);
    process.exit(1);
  }
  console.log(`Frontend bundles are current (${modulePaths.length} modules, ${stylePaths.length} styles, version ${assetVersion}).`);
} else {
  fs.writeFileSync(outputPath, bundle);
  fs.writeFileSync(styleOutputPath, styles);
  if (indexSource !== syncedIndexSource) fs.writeFileSync(indexPath, syncedIndexSource, "utf8");
  console.log(`Built frontend bundles from ${modulePaths.length} modules and ${stylePaths.length} styles (version ${assetVersion}).`);
}
