$ErrorActionPreference = "Stop"

$publicDir = "D:\minya-landfill-v2\public"
$sourcePath = Join-Path $publicDir "app.js"
$outputPath = Join-Path $publicDir "app-fixed.js"
$backupPath = Join-Path $publicDir "app-backup-github-fix.js"

if (!(Test-Path $sourcePath)) {
    throw "لم يتم العثور على: $sourcePath"
}

Copy-Item $sourcePath $backupPath -Force
$content = Get-Content $sourcePath -Raw -Encoding UTF8

# 1) إزالة await الخاطئ من updateMonthlySummary إن كان موجوداً
$badUpdatePattern = '(?s)\r?\n\s*const monthlyOperationsData\s*=\s*\r?\n\s*await buildMonthlyOperationsData\(\);\s*\r?\n\s*const operationsTotals\s*=\s*\r?\n\s*monthlyOperationsData\?\.operationsTotals\s*\|\|\s*\{.*?externalTammQuantity:\s*0,\s*\r?\n\s*\};'
$content = [regex]::Replace($content, $badUpdatePattern, "", 1)

# 2) إزالة جدول ملخص العمليات الشهرية إذا وُضع بالخطأ داخل التقرير اليومي
$misplacedPattern = '(?s)\r?\n\s*<div class="section-title">\s*ملخص العمليات الشهرية\s*</div>\s*<table>.*?</table>\s*(?=<div class="section-title">\s*شؤون الموظفين)'
$content = [regex]::Replace($content, $misplacedPattern, "`r`n`r`n    ", 1)

# 3) إضافة buildMonthlyOperationsData إن لم تكن موجودة
if ($content -notmatch 'async function buildMonthlyOperationsData\(\)') {
$helper = @'

async function buildMonthlyOperationsData() {
  const monthValue =
    document.getElementById(
      "archiveMonthFilter"
    )?.value || "";

  if (!monthValue) {
    return null;
  }

  const detailedReports =
    await getMonthlyDetailedReports(
      monthValue
    );

  const operationsTotals =
    calculateMonthlyOperations(
      detailedReports
    );

  return {
    monthValue,
    detailedReports,
    operationsTotals,
  };
}
'@

    $content = $content.Replace("`nfunction calculateMonthlyReport() {", "$helper`nfunction calculateMonthlyReport() {")
}

# 4) جعل buildMonthlyReportHtml async
$content = $content.Replace("function buildMonthlyReportHtml() {", "async function buildMonthlyReportHtml() {")

# 5) إضافة operationsTotals داخل buildMonthlyReportHtml فقط
$monthlyStart = @'
async function buildMonthlyReportHtml() {
  const monthly =
    calculateMonthlyReport();
'@

if ($content.Contains($monthlyStart)) {
    $startIndex = $content.IndexOf($monthlyStart)
    $checkLength = [Math]::Min(2200, $content.Length - $startIndex)
    $near = $content.Substring($startIndex, $checkLength)

    if ($near -notmatch 'monthlyOperationsData\?\.operationsTotals') {
$monthlyReplacement = @'
async function buildMonthlyReportHtml() {
  const monthly =
    calculateMonthlyReport();

  const monthlyOperationsData =
    await buildMonthlyOperationsData();

  const operationsTotals =
    monthlyOperationsData?.operationsTotals || {
      coverAslobVehicles: 0,
      coverAslobQuantity: 0,
      coverTammVehicles: 0,
      coverTammQuantity: 0,
      waterVehicles: 0,
      waterQuantity: 0,
      waterSprays: 0,
      leachateVehicles: 0,
      leachateQuantity: 0,
      sortingVehicles: 0,
      sortingQuantity: 0,
      externalTammVehicles: 0,
      externalTammQuantity: 0,
    };
'@
        $content = $content.Replace($monthlyStart, $monthlyReplacement)
    }
}

# 6) إدخال جدول العمليات داخل التقرير الشهري قبل التفاصيل اليومية
$monthlyFunctionIndex = $content.IndexOf("async function buildMonthlyReportHtml()")
$detailsMarker = @'
    <div class="section-title">
      التفاصيل اليومية للشهر
    </div>
'@

if ($monthlyFunctionIndex -ge 0) {
    $detailsIndex = $content.IndexOf($detailsMarker, $monthlyFunctionIndex)

    if ($detailsIndex -ge 0) {
        $between = $content.Substring($monthlyFunctionIndex, $detailsIndex - $monthlyFunctionIndex)

        if ($between -notmatch 'ملخص العمليات الشهرية') {
$operationsHtml = @'
    <div class="section-title">
      ملخص العمليات الشهرية
    </div>

    <table>
      <thead>
        <tr>
          <th>العملية</th>
          <th>عدد المركبات / النقلات</th>
          <th>الكمية</th>
          <th>الوحدة</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>مواد التغطية (اسلوب)</td>
          <td>${formatNumber(operationsTotals.coverAslobVehicles)}</td>
          <td>${formatNumber(operationsTotals.coverAslobQuantity)}</td>
          <td>نقلة</td>
        </tr>
        <tr>
          <td>مواد التغطية (طمم)</td>
          <td>${formatNumber(operationsTotals.coverTammVehicles)}</td>
          <td>${formatNumber(operationsTotals.coverTammQuantity)}</td>
          <td>كوب</td>
        </tr>
        <tr>
          <td>كميات المياه للتعقيم والترطيب</td>
          <td>${formatNumber(operationsTotals.waterVehicles)}</td>
          <td>${formatNumber(operationsTotals.waterQuantity)}</td>
          <td>كوب</td>
        </tr>
        <tr>
          <td>عدد مرات رش المياه</td>
          <td>-</td>
          <td>${formatNumber(operationsTotals.waterSprays)}</td>
          <td>مرة</td>
        </tr>
        <tr>
          <td>كميات العصارة المرحلة</td>
          <td>${formatNumber(operationsTotals.leachateVehicles)}</td>
          <td>${formatNumber(operationsTotals.leachateQuantity)}</td>
          <td>كوب</td>
        </tr>
        <tr>
          <td>خط الفرز</td>
          <td>${formatNumber(operationsTotals.sortingVehicles)}</td>
          <td>${formatNumber(operationsTotals.sortingQuantity)}</td>
          <td>طن</td>
        </tr>
        <tr>
          <td>طمم خارجي</td>
          <td>${formatNumber(operationsTotals.externalTammVehicles)}</td>
          <td>${formatNumber(operationsTotals.externalTammQuantity)}</td>
          <td>طن</td>
        </tr>
      </tbody>
    </table>

'@
            $content = $content.Insert($detailsIndex, $operationsHtml)
        }
    }
}

# 7) جعل الطباعة الشهرية async واستخدام await مرة واحدة
$content = $content.Replace("function printMonthlyReport() {", "async function printMonthlyReport() {")
$content = $content.Replace("async async function printMonthlyReport() {", "async function printMonthlyReport() {")
$content = [regex]::Replace($content, 'const html\s*=\s*\r?\n\s*buildMonthlyReportHtml\(\);', "const html =`r`n  await buildMonthlyReportHtml();", 1)

# كتابة نسخة جديدة وعدم استبدال الأصل فوراً
Set-Content -Path $outputPath -Value $content -Encoding UTF8

# فحص JavaScript
Push-Location $publicDir
try {
    & node --check ".\app-fixed.js"
    if ($LASTEXITCODE -ne 0) {
        throw "فشل فحص JavaScript"
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "تم إنشاء الملف المصحح بنجاح:" -ForegroundColor Green
Write-Host $outputPath -ForegroundColor Cyan
Write-Host ""
Write-Host "تم حفظ نسخة احتياطية هنا:" -ForegroundColor Yellow
Write-Host $backupPath
Write-Host ""
Write-Host "إذا أردت اعتماده نفذ:" -ForegroundColor Green
Write-Host 'Copy-Item "D:\minya-landfill-v2\public\app-fixed.js" "D:\minya-landfill-v2\public\app.js" -Force'
