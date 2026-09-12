const fs = require("fs");
const path = require("path");
const { parseWordRegister } = require("../external-diesel");

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
const packageJson = JSON.parse(read("package.json"));

assert(server.includes('require("./external-diesel")'), "external diesel routes are not mounted");
assert(api.includes("CREATE TABLE IF NOT EXISTS external_diesel_entries"), "external diesel table is missing");
assert(api.includes('app.get("/api/external-diesel"'), "external diesel listing route is missing");
assert(api.includes('app.post("/api/external-diesel/import"'), "external diesel import route is missing");
assert(api.includes('app.post("/api/external-diesel/parse-word"'), "external diesel Word preview route is missing");
assert(api.includes('requireRole("admin", "editor")'), "external diesel edits are not permission protected");
assert(api.includes('requireRole("admin")'), "external diesel deletion is not admin-only");
assert(page.includes('id="edFilterSource"'), "external source selector is missing");
assert(page.includes('id="edReportMonth" type="month"'), "external diesel month and year selector is missing");
assert(page.includes('id="edExcelFile"'), "external diesel Excel importer is missing");
assert(page.includes(".doc,.docx"), "external diesel Word file selection is missing");
assert(packageJson.dependencies["word-extractor"], "word-extractor dependency is missing");
assert(client.includes("لم أجد صف العناوين المعتمد"), "Excel header validation is missing");
assert(client.includes('src="/assets/header.png"'), "official print header is missing");
assert(client.includes('src="/assets/footer.png"'), "official print footer is missing");
assert(client.includes('class="print-page"'), "print report does not use explicit A4 pages");
assert(client.includes("paginatedPrintRows"), "print report does not paginate rows");
assert(!client.includes(".official-header{position:fixed"), "print header still uses unstable fixed positioning");
assert(page.includes("السولار الذي عبّأه طاقم المكب للشركات الخارجية"), "external diesel page does not identify the landfill team as the filling party");
assert(page.includes("الشركة"), "company label is missing");
assert(!page.includes("المستفيدة"), "obsolete beneficiary wording is still visible");
assert(!client.includes("المستفيدة"), "obsolete beneficiary wording is still used in client messages or print");
assert(client.includes("تمت تعبئة السولار للشركة بواسطة طاقم المكب"), "print report does not identify who filled the diesel");
assert(!client.includes("بسبب نقص السولار لديها"), "print report still displays the diesel-shortage reason");
assert(client.includes("توقيع مسؤول تعبئة السولار"), "fuel officer signature is missing from print");
assert(client.includes("توقيع قسم المكب"), "landfill signature is missing from print");
assert(client.includes("مجموع يوم"), "daily diesel totals are missing");
assert(client.includes("المجموع الشهري"), "monthly diesel total is missing");
assert(client.includes("previewLiters"), "import preview liters total is missing");
assert(menu.includes('href:"/external-diesel"'), "external diesel navigation link is missing");
assert(desktopMenu.includes('addLink(nav, "/external-diesel", "السولار الخارجي")'), "external diesel desktop navigation link is missing");
assert(server.includes("external_diesel, appearance_settings"), "external diesel is missing from base backups");
assert(installer.includes("external_diesel: rows('external_diesel_entries')"), "external diesel is missing from deployed backups");
const wordSample = [
  "كشف تعبئة السولار لشركة رائد أبو القاطم شهر 8/2026",
  "التاريخ\tاسم السائق\tرقم المركبة\tالكمية (لتر)\tرقم الوصل\tملاحظات",
  "01/08/2026\tخليل الهذالين\t10774\t200\t19099\t",
  "01/08/2026\tمصطفى أبو عواد\t0248\t150\t19100\t",
  "\t350\t",
  "توقيع مسؤول تعبئة السولار"
].join("\n");
const parsedWord = parseWordRegister(wordSample);
assert(parsedWord.source_name === "شركة رائد أبو القاطم", "Word source detection is incorrect");
assert(parsedWord.month === "2026-08", "Word month detection is incorrect");
assert(parsedWord.entries.length === 2, "Word daily totals or signatures were imported as entries");
assert(parsedWord.entries[1].vehicle_number === "0248", "Word vehicle leading zero was not preserved");
console.log("External diesel regression checks passed: source and period filters, Excel and Word preview/import, daily and monthly totals, protected edits, official print header and footer.");
