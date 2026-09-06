const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const loaderPath = path.join(root, "public", "app.js");
const outputPath = path.join(root, "public", "app-bundle.js");
const styleOutputPath = path.join(root, "public", "app-bundle.css");
const indexPath = path.join(root, "public", "index.html");
const driveIndexPath = path.join(root, "public", "drive-import.html");
const driveScriptOutputPath = path.join(root, "public", "drive-import-bundle.js");
const driveStyleOutputPath = path.join(root, "public", "drive-import-bundle.css");
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
const assetVersion = `${versionMatch[1]}-wa7`;
const driveAssetVersion = `${assetVersion}-drive1`;

const driveScriptPaths = [
  "js/app-auth.js",
  "js/app-drive-admin-guard.js",
  "js/app-logout-header.js",
  "js/app-header-menu.js",
  "js/app-source-files-import.js",
  "js/app-source-import-guard-v6.js",
  "js/app-source-stable-v16.js",
  "js/app-source-pivot-raw-v30.js",
  "js/app-source-stations-wide-v9.js",
  "js/app-source-usage-note-v22.js",
  "js/app-drive-import.js",
  "js/app-drive-quality.js",
  "js/app-drive-quality-details.js",
  "js/app-drive-folder-nav.js",
  "js/app-english-digits.js"
];
const driveStylePaths = [
  "style.css",
  "v3.css",
  "header-tone.css",
  "account-position.css",
  "header-compact.css",
  "desktop-nav-hero.css",
  "final-ui-stabilize.css",
  "mobile-vertical-menu.css",
  "drive-import.css",
  "drive-folder-nav.css",
  "source-files-import.css"
];

const loaderBlock = loader.slice(start, end + endMarker.length);
const styleBlock = loader.slice(styleStart, styleEnd + styleEndMarker.length);
const modulePaths = [...loaderBlock.matchAll(/"(js\/[^"]+\.js)"/g)].map((match) => match[1]);
const compatibilityModule = "js/app-monthly-operation-aliases.js";
if (!modulePaths.includes(compatibilityModule)) {
  const monthlyIndex = modulePaths.indexOf("js/app-monthly.js");
  modulePaths.splice(monthlyIndex >= 0 ? monthlyIndex + 1 : modulePaths.length, 0, compatibilityModule);
}
const monthlyUnitModule = "js/app-monthly-unit-compat.js";
if (!modulePaths.includes(monthlyUnitModule)) {
  const printMonthlyIndex = modulePaths.indexOf("js/app-print-monthly.js");
  modulePaths.splice(printMonthlyIndex >= 0 ? printMonthlyIndex + 1 : modulePaths.length, 0, monthlyUnitModule);
}
const adminWhatsAppModule = "js/app-admin-whatsapp.js";
if (!modulePaths.includes(adminWhatsAppModule)) {
  const adminUsersIndex = modulePaths.indexOf("js/app-admin-users.js");
  modulePaths.splice(adminUsersIndex >= 0 ? adminUsersIndex + 1 : modulePaths.length, 0, adminWhatsAppModule);
}
const returnedReportModule = "js/app-returned-report-notice.js";
if (!modulePaths.includes(returnedReportModule)) {
  const workflowIndex = modulePaths.indexOf("js/app-report-workflow.js");
  modulePaths.splice(workflowIndex >= 0 ? workflowIndex + 1 : modulePaths.length, 0, returnedReportModule);
}
const adminWorkflowSummaryModule = "js/app-admin-workflow-summary.js";
if (!modulePaths.includes(adminWorkflowSummaryModule)) {
  const reviewsIndex = modulePaths.indexOf("js/app-reviews.js");
  modulePaths.splice(reviewsIndex >= 0 ? reviewsIndex + 1 : modulePaths.length, 0, adminWorkflowSummaryModule);
}
const adminTodayOpsModule = "js/app-admin-today-ops.js";
if (!modulePaths.includes(adminTodayOpsModule)) {
  const workflowSummaryIndex = modulePaths.indexOf(adminWorkflowSummaryModule);
  modulePaths.splice(workflowSummaryIndex >= 0 ? workflowSummaryIndex + 1 : modulePaths.length, 0, adminTodayOpsModule);
}
const adminSystemHealthModule = "js/app-admin-system-health.js";
if (!modulePaths.includes(adminSystemHealthModule)) {
  const todayOpsIndex = modulePaths.indexOf(adminTodayOpsModule);
  modulePaths.splice(todayOpsIndex >= 0 ? todayOpsIndex + 1 : modulePaths.length, 0, adminSystemHealthModule);
}
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

const driveScripts = driveScriptPaths.map((relativePath) => {
  const source = fs.readFileSync(path.join(root, "public", relativePath), "utf8");
  return `\n/* ===== ${relativePath} ===== */\n${source}\n;`;
}).join("\n");
const driveStyles = driveStylePaths.map((relativePath) => {
  const source = fs.readFileSync(path.join(root, "public", relativePath), "utf8");
  return `\n/* ===== ${relativePath} ===== */\n${source}\n`;
}).join("\n");
new vm.Script(driveScripts, { filename: "public/drive-import-bundle.js" });

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
const driveIndexSource = fs.readFileSync(driveIndexPath, "utf8");
const syncedDriveIndexSource = driveIndexSource
  .replace(/drive-import-bundle\.css\?v=[^"']+/g, `drive-import-bundle.css?v=${driveAssetVersion}`)
  .replace(/drive-import-bundle\.js\?v=[^"']+/g, `drive-import-bundle.js?v=${driveAssetVersion}`);

if (process.argv.includes("--check")) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  const currentStyles = fs.existsSync(styleOutputPath) ? fs.readFileSync(styleOutputPath, "utf8") : "";
  const currentDriveScripts = fs.existsSync(driveScriptOutputPath) ? fs.readFileSync(driveScriptOutputPath, "utf8") : "";
  const currentDriveStyles = fs.existsSync(driveStyleOutputPath) ? fs.readFileSync(driveStyleOutputPath, "utf8") : "";
  const bundleOutdated = current !== bundle || currentStyles !== styles || currentDriveScripts !== driveScripts || currentDriveStyles !== driveStyles;
  const indexOutdated = indexSource !== syncedIndexSource;
  const driveIndexOutdated = driveIndexSource !== syncedDriveIndexSource;

  if (bundleOutdated || indexOutdated || driveIndexOutdated) {
    if (bundleOutdated) console.error("Frontend bundles are outdated. Run: npm run build:app");
    if (indexOutdated) console.error(`public/index.html does not reference asset version ${assetVersion}. Run: npm run build:app`);
    if (driveIndexOutdated) console.error(`public/drive-import.html does not reference asset version ${driveAssetVersion}. Run: npm run build:app`);
    process.exit(1);
  }
  console.log(`Frontend bundles are current (${modulePaths.length} modules, ${stylePaths.length} styles, version ${assetVersion}).`);
} else {
  fs.writeFileSync(outputPath, bundle);
  fs.writeFileSync(styleOutputPath, styles);
  fs.writeFileSync(driveScriptOutputPath, driveScripts);
  fs.writeFileSync(driveStyleOutputPath, driveStyles);
  if (indexSource !== syncedIndexSource) fs.writeFileSync(indexPath, syncedIndexSource, "utf8");
  if (driveIndexSource !== syncedDriveIndexSource) fs.writeFileSync(driveIndexPath, syncedDriveIndexSource, "utf8");
  console.log(`Built frontend bundles from ${modulePaths.length} modules and ${stylePaths.length} styles (version ${assetVersion}).`);
}
