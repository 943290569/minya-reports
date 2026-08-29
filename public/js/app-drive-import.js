/* Google Drive read-only import with preview -> approve/cancel */
(function(){
  const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const SHEET_MIME='application/vnd.google-apps.spreadsheet';
  const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.readonly';
  let accessToken='';
  let tokenClient=null;
  let driveFiles=[];
  let previewRows=[];
  let existingDates=new Set();

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const text=v=>String(v??'').trim();
  const normalize=s=>text(s).replace(/\s+/g,' ').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي');

  function setState(message,type=''){
    const el=$('driveConnectionState'); if(!el)return;
    el.className=`drive-state${type?` ${type}`:''}`; el.textContent=message;
  }
  function dateIso(value){
    const s=text(value);
    let m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if(m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    return '';
  }
  function dateDisplay(iso){const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:iso||'-';}
  function time24(v){
    const s=text(v); if(!s)return '';
    const m=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i); if(!m)return s;
    let h=Number(m[1]); const min=m[2], ap=(m[3]||'').toUpperCase();
    if(ap==='PM'&&h<12)h+=12; if(ap==='AM'&&h===12)h=0;
    return `${String(h).padStart(2,'0')}:${min}`;
  }
  function findRow(rows,needle,start=0){
    const n=normalize(needle);
    return rows.findIndex((row,i)=>i>=start&&row.some(cell=>normalize(cell).includes(n)));
  }
  function findCell(rows,needle){
    const n=normalize(needle);
    for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++)if(normalize(rows[r][c]).includes(n))return {r,c};
    return null;
  }
  function nearbyValue(rows,pos,preferNumber=false){
    if(!pos)return '';
    const row=rows[pos.r]||[];
    const candidates=[row[pos.c+1],row[pos.c-1],row[pos.c+2],row[pos.c-2]].filter(v=>text(v)!=='');
    if(preferNumber){const n=candidates.find(v=>Number.isFinite(Number(String(v).replace(/,/g,'')))); if(n!==undefined)return n;}
    return candidates[0]??'';
  }
  function sectionRows(rows,startNeedle,endNeedles){
    const start=findRow(rows,startNeedle); if(start<0)return [];
    let end=rows.length;
    for(const needle of endNeedles){const idx=findRow(rows,needle,start+1);if(idx>=0)end=Math.min(end,idx);}
    return rows.slice(start+1,end);
  }
  function cleanUnit(v){const s=normalize(v);if(s.includes('طون')||s.includes('طن'))return 'طن';if(s.includes('كوب'))return 'كوب';if(s.includes('نقله'))return 'نقلة';return text(v);}
  function mapEquipmentStatus(v){const s=normalize(v);if(s.includes('لا يعمل')||s.includes('عطل')||s.includes('متوقف'))return 'متعطل';if(s.includes('صيانه'))return 'تحت الصيانة';if(s.includes('جاهز'))return 'جاهز';return 'يعمل';}

  function parseDailySheet(sheetName,sheet){
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''}).slice(0,120).map(r=>Array.from({length:Math.max(r.length,6)},(_,i)=>r[i]??''));
    const reportDate=dateIso(sheetName)||dateIso(rows?.[1]?.[0])||dateIso(rows?.[0]?.[0]);
    const weather=nearbyValue(rows,findCell(rows,'حالة الطقس'));
    const temperature=num(nearbyValue(rows,findCell(rows,'درجة الحرارة'),true));

    const crews=[];
    const crewBlock=sectionRows(rows,'طواقم العمل',['المجموع','العمليات']);
    for(const row of crewBlock){
      const name=text(row[0]); if(!name||normalize(name).includes('مجموع'))continue;
      const countCandidates=[row[2],row[1],row[3]].map(num);
      crews.push({crew_name:name,crew_count:countCandidates.find(x=>x!==0)||0,notes:''});
    }

    const operations=[];
    const opHeader=findRow(rows,'موقع مكب المنيا');
    const stationsHeader=findRow(rows,'موقع محطات الترحيل');
    if(opHeader>=0){
      const end=stationsHeader>opHeader?stationsHeader:rows.length;
      for(let i=opHeader+1;i<end;i++){
        const row=rows[i],name=text(row[0]); if(!name)continue;
        if(normalize(name).includes('كميات النفايات الوارده')||normalize(name).includes('المجموع النهائي'))break;
        operations.push({operation_name:name,start_time:time24(row[1]),end_time:time24(row[2]),vehicle_count:num(row[3]),quantity:num(row[4]),unit:cleanUnit(row[5]),notes:''});
      }
    }

    const stations=[];
    if(stationsHeader>=0){
      let end=findRow(rows,'كميات النفايات الواردة',stationsHeader+1); if(end<0)end=rows.length;
      for(let i=stationsHeader+1;i<end;i++){
        const row=rows[i],name=text(row[0]); if(!name)continue;
        stations.push({station_name:name,truck_count:num(row[3]),waste_tons:num(row[4]),unit:cleanUnit(row[5])||'طن',notes:''});
      }
    }

    let totalTrucks=0,totalWaste=0;
    const finalRow=findRow(rows,'المجموع النهائي');
    if(finalRow>=0){totalTrucks=num(rows[finalRow][3]);totalWaste=num(rows[finalRow][4]);}
    if(!totalTrucks) totalTrucks=operations.reduce((s,x)=>s+num(x.vehicle_count),0)+stations.reduce((s,x)=>s+num(x.truck_count),0);
    if(!totalWaste) totalWaste=operations.filter(x=>normalize(x.operation_name).includes('مكب نفايات المنيا')).reduce((s,x)=>s+num(x.quantity),0)+stations.reduce((s,x)=>s+num(x.waste_tons),0);

    const equipment=[];
    const eqHeader=findRow(rows,'اسم الالية');
    let totalDiesel=0;
    if(eqHeader>=0){
      for(let i=eqHeader+1;i<rows.length;i++){
        const row=rows[i],name=text(row[0]); if(!name)continue;
        if(normalize(name).includes('مجموع كميه السولار')){totalDiesel=num(row[5]);break;}
        if(normalize(name).includes('ملاحظات'))break;
        equipment.push({equipment_name:name,operating_status:mapEquipmentStatus(row[1]),status_description:text(row[2]),working_hours:0,diesel_liters:num(row[5]),notes:''});
      }
    }
    if(!totalDiesel)totalDiesel=equipment.reduce((s,x)=>s+num(x.diesel_liters),0);

    let notes='';
    const notesRow=findRow(rows,'ملاحظات');
    if(notesRow>=0){
      const collected=[];
      for(let i=notesRow+1;i<Math.min(rows.length,notesRow+12);i++){
        const line=rows[i].map(text).filter(Boolean).join(' | ');
        if(line&& !line.toLowerCase().includes('lagoon level'))collected.push(line);
      }
      notes=collected.join('\n');
    }
    const landfill=operations.find(x=>normalize(x.operation_name).includes('مكب نفايات المنيا'));
    const startTime=landfill?.start_time||'04:00',endTime=landfill?.end_time||'19:00';
    const issues=[];
    if(!reportDate)issues.push('تعذر تحديد تاريخ التقرير');
    if(!operations.length)issues.push('لم يتم العثور على قسم العمليات');
    if(!equipment.length)issues.push('لم يتم العثور على قسم المعدات');
    return {sheet_name:sheetName,report_date:reportDate,weather:text(weather),temperature,start_time:startTime,end_time:endTime,total_trucks:totalTrucks,total_waste_tons:totalWaste,total_diesel:totalDiesel,notes,crews,operations:operations.map(({start_time,end_time,...rest})=>rest),stations,equipment,issues};
  }

  async function authStatus(){
    const r=await fetch('/api/auth/status',{cache:'no-store'});const d=await r.json();
    for(let i=0;i<30&&!window.MINYA_USER&&d.authenticated;i++)await new Promise(resolve=>setTimeout(resolve,50));
    const user=window.MINYA_USER||d.user;
    if(!user||user.role!=='admin'){
      $('adminOnlyNotice')?.classList.remove('hidden');
      $('driveSetupPanel')?.classList.add('hidden');
      return false;
    }
    return true;
  }

  function waitForGoogle(){return new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(window.google?.accounts?.oauth2){clearInterval(t);resolve();}else if(++n>80){clearInterval(t);reject(new Error('تعذر تحميل خدمة تسجيل Google'));}},100);});}
  function savedClientId(){return localStorage.getItem('minyaGoogleDriveClientId')||'';}
  function initTokenClient(){
    const clientId=text($('googleClientId')?.value)||savedClientId();
    if(!clientId)throw new Error('أدخل Google Client ID أولًا');
    tokenClient=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:DRIVE_SCOPE,callback:response=>{
      if(response.error){setState(`فشل الربط: ${response.error}`,'error');return;}
      accessToken=response.access_token||'';setState('تم ربط Google Drive للقراءة فقط','ok');$('driveFilesPanel')?.classList.remove('hidden');loadDriveFiles();
    }});
  }
  async function connectDrive(){try{await waitForGoogle();initTokenClient();tokenClient.requestAccessToken({prompt:'consent'});}catch(e){setState(e.message,'error');}}
  async function driveFetch(url){const r=await fetch(url,{headers:{Authorization:`Bearer ${accessToken}`}});if(r.status===401){accessToken='';throw new Error('انتهت جلسة Google. أعد الربط.');}if(!r.ok)throw new Error('فشل قراءة Google Drive');return r;}
  async function loadDriveFiles(){
    const list=$('driveFilesList'); if(list)list.innerHTML='<div class="drive-empty">جاري تحميل الملفات...</div>';
    try{
      const q=encodeURIComponent(`trashed=false and (mimeType='${SHEET_MIME}' or mimeType='${XLSX_MIME}')`);
      const fields=encodeURIComponent('files(id,name,mimeType,modifiedTime,size,webViewLink)');
      const r=await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=100`);
      const d=await r.json();driveFiles=Array.isArray(d.files)?d.files:[];renderDriveFiles();
    }catch(e){if(list)list.innerHTML=`<div class="drive-empty">${esc(e.message)}</div>`;setState(e.message,'error');}
  }
  function relevantFile(f,query){const n=normalize(f.name);const q=normalize(query);return (!q||n.includes(q))&&(n.includes('تقرير')||n.includes('يومي')||n.includes('مكب')||q);}
  function renderDriveFiles(){
    const q=$('driveFileSearch')?.value||'';const rows=driveFiles.filter(f=>relevantFile(f,q));$('driveFilesCount').textContent=`${rows.length} ملف`;
    $('driveFilesList').innerHTML=rows.length?rows.map(f=>`<div class="drive-file"><div><strong>${esc(f.name)}</strong><small>${f.mimeType===SHEET_MIME?'Google Sheets':'Excel'} · ${esc(f.modifiedTime?new Date(f.modifiedTime).toLocaleDateString('en-GB'):'')}</small></div><button type="button" data-preview-file="${esc(f.id)}">معاينة</button></div>`).join(''):'<div class="drive-empty">لا توجد ملفات مطابقة.</div>';
  }
  async function downloadWorkbook(file){
    let url;if(file.mimeType===SHEET_MIME)url=`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(XLSX_MIME)}`;else url=`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;
    const r=await driveFetch(url);const data=await r.arrayBuffer();return XLSX.read(data,{type:'array',cellDates:false});
  }
  async function loadExistingDates(){
    const r=await fetch('/api/reports',{cache:'no-store'});const d=await r.json();existingDates=new Set((d.reports||[]).map(x=>String(x.report_date||'')));
  }
  async function previewFile(id){
    const file=driveFiles.find(f=>f.id===id);if(!file)return;
    $('previewPanel').classList.remove('hidden');$('previewFileName').textContent=file.name;$('previewReports').innerHTML='<div class="drive-empty">جاري قراءة الملف وتحليل صفحات الأيام...</div>';window.scrollTo({top:$('previewPanel').offsetTop-90,behavior:'smooth'});
    try{
      await loadExistingDates();const wb=await downloadWorkbook(file);
      const names=wb.SheetNames.filter(name=>normalize(name)!=='summary');
      previewRows=names.map(name=>parseDailySheet(name,wb.Sheets[name])).filter(r=>r.report_date||r.issues.length);
      previewRows.forEach(r=>{r.duplicate=existingDates.has(r.report_date);r.valid=!r.duplicate&&!r.issues.length;r.selected=r.valid;});
      renderPreview();
    }catch(e){$('previewReports').innerHTML=`<div class="drive-empty">${esc(e.message)}</div>`;}
  }
  function renderPreview(){
    const total=previewRows.length,dup=previewRows.filter(x=>x.duplicate).length,invalid=previewRows.filter(x=>x.issues.length&&!x.duplicate).length,valid=previewRows.filter(x=>x.valid).length;
    $('previewTotal').textContent=total;$('previewValid').textContent=valid;$('previewDuplicate').textContent=dup;$('previewInvalid').textContent=invalid;
    $('approveImportBtn').disabled=!previewRows.some(x=>x.selected&&x.valid);
    $('previewReports').innerHTML=previewRows.length?previewRows.map((r,i)=>{
      const status=r.duplicate?['duplicate','موجود مسبقًا']:r.issues.length?['invalid','يحتاج مراجعة']:['valid','صالح للاستيراد'];
      return `<article class="drive-report-card"><div class="drive-report-head"><input type="checkbox" data-import-check="${i}" ${r.selected?'checked':''} ${r.valid?'':'disabled'}><div class="drive-report-main"><strong>${dateDisplay(r.report_date)} · ${esc(r.sheet_name)}</strong><small>${r.issues.length?esc(r.issues.join('، ')):'تمت مطابقة الأقسام الرئيسية'}</small></div><span class="drive-status ${status[0]}">${status[1]}</span></div><div class="drive-report-details"><div><span>النفايات</span><strong>${fmt(r.total_waste_tons)} طن</strong></div><div><span>الشاحنات</span><strong>${fmt(r.total_trucks)}</strong></div><div><span>السولار</span><strong>${fmt(r.total_diesel)} لتر</strong></div><div><span>المعدات</span><strong>${r.equipment.length}</strong></div></div><div class="drive-report-extra"><details><summary>عرض المحتويات المطابقة</summary><div class="drive-detail-grid"><div><b>شؤون الموظفين</b>${r.crews.map(x=>`<p>${esc(x.crew_name)}: ${fmt(x.crew_count)}</p>`).join('')||'<p>لا توجد بيانات</p>'}</div><div><b>العمليات والمحطات</b>${r.operations.map(x=>`<p>${esc(x.operation_name)}: ${fmt(x.quantity)} ${esc(x.unit)}</p>`).join('')}${r.stations.map(x=>`<p>${esc(x.station_name)}: ${fmt(x.waste_tons)} طن</p>`).join('')}</div><div><b>المعدات</b>${r.equipment.map(x=>`<p>${esc(x.equipment_name)}: ${esc(x.operating_status)} · ${fmt(x.diesel_liters)} لتر</p>`).join('')}</div></div></details></div></article>`;
    }).join(''):'<div class="drive-empty">لم يتم العثور على صفحات يومية قابلة للقراءة.</div>';
  }
  function cancelPreview(){previewRows=[];$('previewPanel').classList.add('hidden');$('importProgress').classList.add('hidden');$('importProgress').textContent='';}
  async function approveImport(){
    const selected=previewRows.filter(x=>x.selected&&x.valid);if(!selected.length)return;
    if(!confirm(`سيتم استيراد ${selected.length} تقرير إلى النظام. هل تريد الاعتماد؟`))return;
    const btn=$('approveImportBtn'),progress=$('importProgress');btn.disabled=true;progress.classList.remove('hidden');let ok=0,failed=0;
    for(let i=0;i<selected.length;i++){
      const r=selected[i];progress.textContent=`جاري استيراد ${i+1} من ${selected.length}: ${dateDisplay(r.report_date)}`;
      try{
        const payload={report_date:r.report_date,weather:r.weather,temperature:r.temperature,start_time:r.start_time,end_time:r.end_time,total_trucks:r.total_trucks,total_waste_tons:r.total_waste_tons,total_diesel:r.total_diesel,notes:r.notes,crews:r.crews,operations:r.operations,stations:r.stations,equipment:r.equipment};
        const res=await fetch('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok)throw new Error(data.message||'فشل الحفظ');ok++;existingDates.add(r.report_date);r.duplicate=true;r.valid=false;r.selected=false;
      }catch(e){failed++;r.issues=[...(r.issues||[]),e.message];r.valid=false;r.selected=false;}
    }
    progress.textContent=`اكتمل الاستيراد: ${ok} ناجح${failed?`، ${failed} فشل`:''}.`;renderPreview();btn.disabled=!previewRows.some(x=>x.selected&&x.valid);
  }

  document.addEventListener('DOMContentLoaded',async()=>{
    if(!await authStatus())return;
    $('googleClientId').value=savedClientId();
    $('saveClientIdBtn').onclick=()=>{const id=text($('googleClientId').value);if(!id)return setState('أدخل Google Client ID أولًا','error');localStorage.setItem('minyaGoogleDriveClientId',id);setState('تم حفظ إعداد Google Client ID على هذا المتصفح','ok');};
    $('connectDriveBtn').onclick=connectDrive;
    $('refreshDriveFilesBtn').onclick=loadDriveFiles;
    $('driveFileSearch').addEventListener('input',renderDriveFiles);
    $('driveFilesList').addEventListener('click',e=>{const b=e.target.closest('[data-preview-file]');if(b)previewFile(b.dataset.previewFile);});
    $('previewReports').addEventListener('change',e=>{if(!e.target.matches('[data-import-check]'))return;const i=Number(e.target.dataset.importCheck);if(previewRows[i])previewRows[i].selected=e.target.checked;$('approveImportBtn').disabled=!previewRows.some(x=>x.selected&&x.valid);});
    $('cancelPreviewBtn').onclick=cancelPreview;$('cancelImportBtn').onclick=cancelPreview;$('approveImportBtn').onclick=approveImport;
  });
})();
