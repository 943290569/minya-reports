/* Excel import: preview -> approve/cancel. Admin page only. */
(function(){
  const path=location.pathname.replace(/\/+$/,"")||"/";
  if(path!=="/admin") return;

  const state={reports:[],ready:[],duplicates:[],invalid:[],fileName:""};
  const fmt=v=>Number(v||0).toLocaleString("en-US",{maximumFractionDigits:2});
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const clean=v=>String(v??"").replace(/\s+/g," ").trim();
  const num=v=>{const n=Number(String(v??"").replace(/,/g,""));return Number.isFinite(n)?n:0;};

  function toIsoDate(value, sheetName=""){
    if(value instanceof Date && !Number.isNaN(value.getTime())){
      return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
    }
    if(typeof value==="number" && window.XLSX?.SSF){
      const d=window.XLSX.SSF.parse_date_code(value);
      if(d) return `${String(d.y).padStart(4,"0")}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
    }
    const s=clean(value);
    let m=s.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)/);
    if(m) return `${m[1]}-${String(Number(m[2])).padStart(2,"0")}-${String(Number(m[3])).padStart(2,"0")}`;
    m=s.match(/^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{4})/);
    if(m) return `${m[3]}-${String(Number(m[2])).padStart(2,"0")}-${String(Number(m[1])).padStart(2,"0")}`;
    const digits=clean(sheetName).replace(/\D/g,"");
    if(digits.length>=6){
      const year=digits.slice(-4), rest=digits.slice(0,-4);
      for(let dayLen=1;dayLen<=2;dayLen++){
        const dd=Number(rest.slice(0,dayLen)), mm=Number(rest.slice(dayLen));
        if(dd>=1&&dd<=31&&mm>=1&&mm<=12) return `${year}-${String(mm).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
      }
    }
    return "";
  }

  function toTime(value){
    if(value instanceof Date) return `${String(value.getHours()).padStart(2,"0")}:${String(value.getMinutes()).padStart(2,"0")}`;
    if(typeof value==="number" && value>=0 && value<1){
      const mins=Math.round(value*24*60); return `${String(Math.floor(mins/60)%24).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`;
    }
    const s=clean(value); if(!s) return "";
    let m=s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if(m){let h=Number(m[1]);const mi=Number(m[2]);const ap=(m[3]||"").toUpperCase();if(ap==="PM"&&h<12)h+=12;if(ap==="AM"&&h===12)h=0;return `${String(h).padStart(2,"0")}:${String(mi).padStart(2,"0")}`;}
    return s.slice(0,5);
  }

  function findRow(rows,predicate,start=0){for(let i=start;i<rows.length;i++){if(predicate(rows[i]||[],i))return i;}return -1;}
  function firstText(row){return clean((row||[])[0]);}
  function rowHas(row,text){return (row||[]).some(v=>clean(v).includes(text));}

  function parseSheet(ws,sheetName){
    const rows=window.XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:""});
    const date=toIsoDate(rows?.[0]?.[0],sheetName);
    if(!date) return {valid:false,sheet:sheetName,error:"تعذر تحديد تاريخ التقرير"};

    const weatherIdx=findRow(rows,r=>firstText(r).includes("حالة الطقس"));
    const weather=weatherIdx>=0?clean(rows[weatherIdx][1]):"";
    const temperature=weatherIdx>=0?num(rows[weatherIdx][4]):0;

    const crews=[];
    const crewStart=findRow(rows,r=>firstText(r).includes("طواقم العمل"));
    const crewEnd=findRow(rows,r=>firstText(r).includes("المجموع"),Math.max(crewStart+1,0));
    if(crewStart>=0&&crewEnd>crewStart){
      for(let i=crewStart+1;i<crewEnd;i++){
        const name=clean(rows[i][0]); if(!name) continue;
        crews.push({crew_name:name,crew_count:num(rows[i][2]),notes:""});
      }
    }

    const opHeader=findRow(rows,r=>firstText(r).includes("موقع مكب المنيا")&&rowHas(r,"وقت البداية"));
    const stationHeader=findRow(rows,r=>firstText(r).includes("موقع محطات الترحيل"),Math.max(opHeader+1,0));
    const operations=[];
    if(opHeader>=0){
      const end=stationHeader>opHeader?stationHeader:rows.length;
      for(let i=opHeader+1;i<end;i++){
        const name=clean(rows[i][0]); if(!name) continue;
        if(name.includes("كميات النفايات الواردة")) break;
        operations.push({operation_name:name,start_time:toTime(rows[i][1]),end_time:toTime(rows[i][2]),vehicle_count:num(rows[i][3]),quantity:num(rows[i][4]),unit:clean(rows[i][5]),notes:""});
      }
    }

    const wasteHeader=findRow(rows,r=>firstText(r).includes("كميات النفايات الواردة"),Math.max(stationHeader+1,0));
    const stations=[];
    if(stationHeader>=0){
      const end=wasteHeader>stationHeader?wasteHeader:rows.length;
      for(let i=stationHeader+1;i<end;i++){
        const name=clean(rows[i][0]); if(!name||name.includes("محطات الترحيل")) continue;
        stations.push({station_name:name,truck_count:num(rows[i][3]),waste_tons:num(rows[i][4]),unit:clean(rows[i][5])||"طن",notes:""});
      }
    }

    const totalIdx=findRow(rows,r=>firstText(r).includes("المجموع النهائي"),Math.max(wasteHeader,0));
    const totalTrucks=totalIdx>=0?num(rows[totalIdx][3]):0;
    const totalWaste=totalIdx>=0?num(rows[totalIdx][4]):0;

    const eqHeader=findRow(rows,r=>firstText(r).includes("اسم الالية")||firstText(r).includes("اسم الآلية"));
    const notesHeader=findRow(rows,r=>firstText(r).includes("ملاحظات"),Math.max(eqHeader+1,0));
    const equipment=[];
    let totalDiesel=0;
    if(eqHeader>=0){
      const end=notesHeader>eqHeader?notesHeader:rows.length;
      for(let i=eqHeader+1;i<end;i++){
        const name=clean(rows[i][0]); if(!name) continue;
        if(name.includes("مجموع كمية السولار")){totalDiesel=num(rows[i][5]);continue;}
        equipment.push({equipment_name:name,operating_status:clean(rows[i][1])||"-",status_description:clean(rows[i][2]),working_hours:0,diesel_liters:num(rows[i][5]),notes:""});
      }
    }
    if(!totalDiesel) totalDiesel=equipment.reduce((s,x)=>s+num(x.diesel_liters),0);

    let notes="";
    if(notesHeader>=0){
      const parts=[];
      for(let i=notesHeader+1;i<rows.length;i++){
        const text=(rows[i]||[]).map(clean).filter(Boolean).join(" — ");
        if(!text||text.toLowerCase().includes("with the term lagoon level")) continue;
        parts.push(text);
      }
      notes=parts.join("\n");
    }

    const mainOp=operations.find(x=>x.operation_name.includes("مكب نفايات المنيا"))||operations[0]||{};
    const valid=Boolean(date&&totalIdx>=0&&equipment.length);
    return {valid,sheet:sheetName,error:valid?"":"الورقة لا تحتوي البنية المتوقعة",payload:{
      report_date:date,weather,temperature,start_time:mainOp.start_time||"04:00",end_time:mainOp.end_time||"19:00",
      total_trucks:totalTrucks,total_waste_tons:totalWaste,total_diesel:totalDiesel,notes,crews,operations,stations,equipment
    }};
  }

  function loadSheetJs(){
    if(window.XLSX) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement("script");
      s.src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
      s.onload=resolve; s.onerror=()=>reject(new Error("تعذر تحميل قارئ Excel. تحقق من اتصال الإنترنت ثم حاول مجددًا."));
      document.head.appendChild(s);
    });
  }

  async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.message||d.error||"فشل الطلب");return d;}

  function renderPreview(){
    const root=document.getElementById("excelImportPreview"); if(!root)return;
    const all=state.reports;
    root.innerHTML=`
      <div class="excel-import-summary">
        <div><span>إجمالي الأوراق اليومية</span><strong>${all.length}</strong></div>
        <div><span>جاهز للاستيراد</span><strong>${state.ready.length}</strong></div>
        <div><span>موجود مسبقًا</span><strong>${state.duplicates.length}</strong></div>
        <div><span>يحتاج مراجعة</span><strong>${state.invalid.length}</strong></div>
      </div>
      <div class="excel-import-table-wrap"><table class="v3-table excel-import-table"><thead><tr><th>الحالة</th><th>التاريخ</th><th>العمال</th><th>النفايات</th><th>الشاحنات</th><th>السولار</th><th>المعدات</th></tr></thead><tbody>${all.map(x=>{
        const p=x.payload||{}; const workers=(p.crews||[]).reduce((s,c)=>s+num(c.crew_count),0);
        const status=x.status==="ready"?"جاهز":x.status==="duplicate"?"موجود مسبقًا":"مراجعة";
        return `<tr class="excel-row-${x.status}"><td><span class="excel-import-status ${x.status}">${status}</span></td><td>${esc(p.report_date||x.sheet)}</td><td>${fmt(workers)}</td><td>${fmt(p.total_waste_tons)} طن</td><td>${fmt(p.total_trucks)}</td><td>${fmt(p.total_diesel)} لتر</td><td>${fmt((p.equipment||[]).length)}</td></tr>`;
      }).join("")}</tbody></table></div>
      <div class="excel-import-actions">
        <button id="excelImportApprove" type="button" class="v3-primary" ${state.ready.length?"":"disabled"}>اعتماد الاستيراد (${state.ready.length})</button>
        <button id="excelImportCancel" type="button" class="excel-import-cancel">إلغاء</button>
      </div>
      <p class="excel-import-note">لن يتم حفظ الأوراق الموجودة مسبقًا أو الأوراق التي تحتاج مراجعة.</p>`;
    document.getElementById("excelImportApprove")?.addEventListener("click",approveImport);
    document.getElementById("excelImportCancel")?.addEventListener("click",resetImport);
  }

  async function previewFile(file){
    const msg=document.getElementById("excelImportMessage");
    try{
      msg.textContent="جاري قراءة الملف وبناء المعاينة...";
      await loadSheetJs();
      const wb=window.XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
      const parsed=[];
      for(const sheetName of wb.SheetNames){
        if(clean(sheetName).toLowerCase()==="summary") continue;
        const item=parseSheet(wb.Sheets[sheetName],sheetName);
        parsed.push(item);
      }
      const current=await api("/api/reports");
      const existing=new Set((current.reports||[]).map(r=>String(r.report_date||"")));
      state.fileName=file.name; state.reports=parsed.map(x=>({...x,status:!x.valid?"invalid":existing.has(x.payload.report_date)?"duplicate":"ready"}));
      state.ready=state.reports.filter(x=>x.status==="ready"); state.duplicates=state.reports.filter(x=>x.status==="duplicate"); state.invalid=state.reports.filter(x=>x.status==="invalid");
      msg.textContent=`تمت قراءة ${state.reports.length} ورقة يومية من ${file.name}. راجع المعاينة ثم اختر اعتماد أو إلغاء.`;
      renderPreview();
    }catch(e){console.error(e);msg.textContent=e.message||"تعذر قراءة ملف Excel";}
  }

  async function approveImport(){
    if(!state.ready.length) return;
    const btn=document.getElementById("excelImportApprove"),msg=document.getElementById("excelImportMessage");
    if(btn)btn.disabled=true;
    let saved=0; const created=[];
    try{
      msg.textContent=`جاري استيراد ${state.ready.length} تقرير...`;
      for(const item of state.ready){
        const data=await api("/api/reports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(item.payload)});
        saved++; if(data.report?.id)created.push(data.report.id);
        msg.textContent=`تم حفظ ${saved} من ${state.ready.length} تقرير...`;
      }
      msg.textContent=`تم استيراد الشهر بنجاح: ${saved} تقرير. يمكنك الآن مراجعة يناير 2025 من الأرشيف قبل الانتقال للشهر التالي.`;
      state.reports.forEach(x=>{if(x.status==="ready")x.status="duplicate";}); state.duplicates=state.reports.filter(x=>x.status==="duplicate");state.ready=[];renderPreview();
    }catch(e){
      console.error(e);
      msg.textContent=`توقف الاستيراد بعد حفظ ${saved} تقرير. السبب: ${e.message}. لا تعِد الاستيراد قبل مراجعة الأرشيف؛ المعاينة ستتعرف على التقارير المحفوظة كمكررة.`;
      try{const current=await api("/api/reports");const existing=new Set((current.reports||[]).map(r=>String(r.report_date||"")));state.reports=state.reports.map(x=>({...x,status:!x.valid?"invalid":existing.has(x.payload.report_date)?"duplicate":"ready"}));state.ready=state.reports.filter(x=>x.status==="ready");state.duplicates=state.reports.filter(x=>x.status==="duplicate");renderPreview();}catch{}
    }finally{if(btn)btn.disabled=false;}
  }

  function resetImport(){
    state.reports=[];state.ready=[];state.duplicates=[];state.invalid=[];state.fileName="";
    const input=document.getElementById("excelImportFile");if(input)input.value="";
    const preview=document.getElementById("excelImportPreview");if(preview)preview.innerHTML="";
    const msg=document.getElementById("excelImportMessage");if(msg)msg.textContent="لم يتم اختيار ملف بعد.";
  }

  function mount(){
    const c=document.getElementById("v3Content"); if(!c||document.getElementById("excelImportPanel"))return;
    const panel=document.createElement("div");panel.id="excelImportPanel";panel.className="v3-panel excel-import-panel";
    panel.innerHTML=`<div class="excel-import-head"><div><span>DRIVE & EXCEL IMPORT</span><h3>الاستيراد الموحد مع المعاينة</h3><p>ارفع Excel أو اختر ملفًا من Google Drive في صفحة واحدة، مع جودة القراءة والتطابق والاختلافات والتحديد قبل الاعتماد.</p></div></div><div class="excel-import-actions"><a class="v3-primary" href="/drive-import.html">فتح صفحة الاستيراد والمعاينة</a></div>`;
    c.prepend(panel);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>setTimeout(mount,0)); else setTimeout(mount,0);
})();
