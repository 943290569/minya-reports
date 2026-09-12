const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const server = read("server.js");
const api = read("external-diesel.js");
const page = read("public/external-diesel.html");
const client = read("public/js/app-external-diesel.js");
const menu = read("public/js/app-header-menu.js");
const desktopMenu = read("public/js/app-system-link.js");
const installer = read("scripts/install-ops-suite.js");

assert(server.includes('require("./external-diesel")'), "external diesel routes are not mounted");
assert(api.includes("CREATE TABLE IF NOT EXISTS external_diesel_entries"), "external diesel table is missing");
assert(api.includes('app.get("/api/external-diesel"'), "external diesel listing route is missing");
assert(api.includes('app.post("/api/external-diesel/import"'), "external diesel import route is missing");
assert(api.includes('requireRole("admin", "editor")'), "external diesel edits are not permission protected");
assert(api.includes('requireRole("admin")'), "external diesel deletion is not admin-only");
assert(page.includes('id="edFilterSource"'), "external source selector is missing");
assert(page.includes('id="edReportMonth" type="month"'), "external diesel month and year selector is missing");
assert(page.includes('id="edExcelFile"'), "external diesel Excel importer is missing");
assert(client.includes("لم أجد صف العناوين المعتمد"), "Excel header validation is missing");
assert(client.includes('src="/assets/header.png"'), "official print header is missing");
assert(client.includes('src="/assets/footer.png"'), "official print footer is missing");
assert(client.includes("توقيع مسؤول تعبئة السولار"), "fuel officer signature is missing from print");
assert(client.includes("توقيع قسم المكب"), "landfill signature is missing from print");
assert(client.includes("مجموع يوم"), "daily diesel totals are missing");
assert(client.includes("المجموع الشهري"), "monthly diesel total is missing");
assert(menu.includes('href:"/external-diesel"'), "external diesel navigation link is missing");
assert(desktopMenu.includes('addLink(nav, "/external-diesel", "السولار الخارجي")'), "external diesel desktop navigation link is missing");
assert(server.includes("external_diesel, appearance_settings"), "external diesel is missing from base backups");
assert(installer.includes("external_diesel: rows('external_diesel_entries')"), "external diesel is missing from deployed backups");
console.log("External diesel regression checks passed: source and period filters, Excel preview/import, daily and monthly totals, protected edits, official print header and footer.");
