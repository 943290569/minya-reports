(function(){
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  function getRows(){
    const all=Array.isArray(window.MINYA_DRIVER_LICENSE_ROWS)?window.MINYA_DRIVER_LICENSE_ROWS:[];
    const q=String(document.getElementById('licenseSearch')?.value||'').trim().toLowerCase();
    return all.filter(x=>!q||[x.name_ar,x.name_en,x.address,x.license_class,x.license_type].join(' ').toLowerCase().includes(q));
  }
  function pageRows(rows,start){
    return rows.map((x,i)=>`<tr><td class="no">${start+i+1}</td><td class="name"><strong>${esc(x.name_ar)}</strong><small>${esc(x.name_en||'')}</small></td><td>${esc(x.address||'-')}</td><td>${esc(x.license_class||'-')}</td><td>${esc(x.license_type||'-')}</td><td>${esc(x.expiry_date||'-')}</td><td>${x.days_remaining??'-'}</td><td class="${x.status==='تنتهي قريبًا'||x.status==='منتهية'?'warn':''}">${esc(x.status||'-')}</td></tr>`).join('');
  }
  function printNow(){
    const rows=getRows();
    if(!rows.length){alert('لا توجد بيانات للطباعة');return;}
    const header=new URL('assets/header.png',location.href).href;
    const footer=new URL('assets/footer.png',location.href).href;
    const perPage=18,pages=[];
    for(let i=0;i<rows.length;i+=perPage){
      const part=rows.slice(i,i+perPage);
      pages.push(`<section class="sheet"><header><img src="${header}" alt="هيدر المجلس"><h1>سجل رخص السائقين والموظفين</h1><p>قاعدة الموظفين المعتمدة ومتابعة انتهاء الرخص</p></header><div class="table-wrap"><table><thead><tr><th>الرقم</th><th>الاسم</th><th>العنوان</th><th>الفئة</th><th>نوع الرخصة</th><th>تاريخ الانتهاء</th><th>الأيام المتبقية</th><th>الحالة</th></tr></thead><tbody>${pageRows(part,i)}</tbody></table></div><footer><img src="${footer}" alt="تذييل المجلس"><div class="page-no">صفحة ${pages.length+1}</div></footer></section>`);
    }
    const w=window.open('','_blank','width=900,height=1000');
    if(!w){alert('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة للموقع.');return;}
    w.document.open();
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>سجل رخص السائقين</title><style>
@page{size:A4 portrait;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Tahoma,"Noto Kufi Arabic",Arial,sans-serif}
.sheet{width:210mm;height:297mm;padding:0 8mm;display:flex;flex-direction:column;page-break-after:always;overflow:hidden}
.sheet:last-child{page-break-after:auto}
header{flex:0 0 auto;text-align:center}
header img{display:block;width:210mm;height:auto;max-height:29mm;object-fit:fill;margin:0 -8mm 1.2mm}
h1{font-size:14pt;margin:0 0 .6mm;font-weight:800}
header p{font-size:8.2pt;margin:0 0 2mm;color:#555}
.table-wrap{width:100%;overflow:visible}
table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8pt}
th,td{border:1px solid #333;text-align:center;vertical-align:middle;padding:1.1mm .7mm;line-height:1.1;height:9.25mm;white-space:normal;overflow-wrap:normal;word-break:normal}
th{background:#eef2f6;font-weight:800;height:8mm;font-size:8.1pt}
.no{font-weight:700}
.name{white-space:normal!important;overflow:visible!important}
.name strong{display:block;font-size:8.4pt;line-height:1.08;white-space:normal}
.name small{display:block;margin-top:.4mm;font-size:6.1pt;line-height:1;color:#777;direction:ltr;white-space:nowrap}
.warn{font-weight:800;color:#b91c1c;background:#fff2f2}
th:nth-child(1),td:nth-child(1){width:7%}
th:nth-child(2),td:nth-child(2){width:23%}
th:nth-child(3),td:nth-child(3){width:12%}
th:nth-child(4),td:nth-child(4){width:8%}
th:nth-child(5),td:nth-child(5){width:18%}
th:nth-child(6),td:nth-child(6){width:14%}
th:nth-child(7),td:nth-child(7){width:9%}
th:nth-child(8),td:nth-child(8){width:9%}
footer{margin-top:auto;flex:0 0 auto;position:relative;padding-top:1.5mm}
footer img{display:block;width:210mm;height:auto;max-height:13mm;object-fit:fill;margin:0 -8mm}
.page-no{position:absolute;left:0;bottom:1mm;font-size:7pt;color:#666}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{break-after:page}.sheet:last-child{break-after:auto}}
</style></head><body>${pages.join('')}<script>window.onload=()=>setTimeout(()=>window.print(),350);<\/script></body></html>`);
    w.document.close();
  }
  function bind(){const b=document.getElementById('printLicensesBtn');if(b)b.onclick=printNow;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
