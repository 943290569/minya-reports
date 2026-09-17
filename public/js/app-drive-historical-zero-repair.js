(()=>{
  const originalFetch=window.fetch.bind(window);
  let driveToken='';
  let running=false;
  const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const SHEET_MIME='application/vnd.google-apps.spreadsheet';
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0};
  const text=v=>String(v??'').trim();
  const norm=s=>text(s).replace(/\s+/g,' ').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase();
  const setState=(msg,kind='')=>{const el=document.getElementById('driveConnectionState');if(el){el.textContent=msg;el.className=`drive-state${kind?` ${kind}`:''}`;}const mirror=document.getElementById('historicalSyncState');if(mirror){mirror.textContent=msg;mirror.className=`drive-state${kind?` ${kind}`:''}`;}};
  const validDate=(y,m,d)=>{y=Number(y);m=Number(m);d=Number(d);const x=new Date(Date.UTC(y,m-1,d));return y>=2000&&y<=2100&&x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d?`${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:''};
  function dateIso(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return validDate(v.getFullYear(),v.getMonth()+1,v.getDate());
    if(typeof v==='number'&&window.XLSX?.SSF){const d=window.XLSX.SSF.parse_date_code(v);if(d)return validDate(d.y,d.m,d.d)}
    const s=text(v);let m=s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:\D.*)?$/);if(m)return validDate(m[1],m[2],m[3]);
    m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})(?:\D.*)?$/);if(m)return validDate(m[3].length===2?2000+Number(m[3]):m[3],m[2],m[1]);
    m=s.match(/^(\d{2})(\d{2})(\d{4})$/);return m?validDate(m[3],m[2],m[1]):'';
  }
  const findRow=(rows,needle,start=0)=>{const n=norm(needle);return rows.findIndex((r,i)=>i>=start&&r.some(c=>norm(c).includes(n)))};
  const findCell=(rows,needle)=>{const n=norm(needle);for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++)if(norm(rows[r][c]).includes(n))return{r,c};return null};
  const nearby=(rows,pos,preferNumber=false)=>{if(!pos)return'';const row=rows[pos.r]||[];const a=[row[pos.c+1],row[pos.c-1],row[pos.c+2],row[pos.c-2]].filter(v=>text(v)!=='');if(preferNumber){const hit=a.find(v=>Number.isFinite(Number(String(v).replace(/,/g,''))));if(hit!==undefined)return hit}return a[0]??''};
  const unit=v=>{const s=norm(v);if(s.includes('طن')||s.includes('طون'))return'طن';if(s.includes('كوب'))return'كوب';if(s.includes('نقله'))return'نقلة';return text(v)};
  const eqStatus=v=>{const s=norm(v);if(s.includes('لا يعمل')||s.includes('عطل')||s.includes('متوقف'))return'متعطل';if(s.includes('صيانه'))return'تحت الصيانة';if(s.includes('جاهز'))return'جاهز';return'يعمل'};
  function parseSheet(name,sheet){
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''}).slice(0,130).map(r=>Array.from({length:Math.max(r.length,6)},(_,i)=>r[i]??''));
    const report_date=dateIso(name)||dateIso(rows?.[1]?.[0])||dateIso(rows?.[0]?.[0]);if(!report_date)return null;
    const weather=text(nearby(rows,findCell(rows,'حالة الطقس'))),temperature=num(nearby(rows,findCell(rows,'درجة الحرارة'),true));
    const crews=[];const crewStart=findRow(rows,'طواقم العمل');if(crewStart>=0){let end=findRow(rows,'العمليات',crewStart+1);if(end<0)end=Math.min(rows.length,crewStart+20);for(let i=crewStart+1;i<end;i++){const r=rows[i],n=text(r[0]);if(!n||norm(n).includes('مجموع'))continue;crews.push({crew_name:n,crew_count:[r[2],r[1],r[3]].map(num).find(x=>x!==0)||0,notes:''})}}
    const operations=[];const opStart=findRow(rows,'موقع مكب المنيا'),stStart=findRow(rows,'موقع محطات الترحيل');if(opStart>=0){const end=stStart>opStart?stStart:rows.length;for(let i=opStart+1;i<end;i++){const r=rows[i],n=text(r[0]);if(!n)continue;const nn=norm(n);if(nn.includes('كميات النفايات الوارده')||nn.includes('المجموع النهائي'))break;operations.push({operation_name:n,start_time:text(r[1]),end_time:text(r[2]),vehicle_count:num(r[3]),quantity:num(r[4]),unit:unit(r[5]),notes:''})}}
    const stations=[];if(stStart>=0){let end=findRow(rows,'كميات النفايات الواردة',stStart+1);if(end<0)end=rows.length;for(let i=stStart+1;i<end;i++){const r=rows[i],n=text(r[0]);if(!n)continue;stations.push({station_name:n,truck_count:num(r[3]),waste_tons:num(r[4]),unit:unit(r[5])||'طن',notes:''})}}
    const landfill=operations.find(x=>{const n=norm(x.operation_name);return(n.includes('مكب')&&n.includes('المنيا'))||(n.includes('نفايات')&&!n.includes('ترحيل')&&!n.includes('محطه'))})||{};
    const equipment=[];const eqStart=findRow(rows,'اسم الالية');if(eqStart>=0){for(let i=eqStart+1;i<rows.length;i++){const r=rows[i],n=text(r[0]);if(!n)continue;const nn=norm(n);if(nn.includes('مجموع كميه السولار')||nn.includes('ملاحظات'))break;equipment.push({equipment_name:n,operating_status:eqStatus(r[1]),status_description:text(r[2]),working_hours:0,diesel_liters:num(r[5]),notes:''})}}
    const total_trucks=num(landfill.vehicle_count)+stations.reduce((s,x)=>s+num(x.truck_count),0);
    const total_waste_tons=num(landfill.quantity)+stations.reduce((s,x)=>s+num(x.waste_tons),0);
    const total_diesel=equipment.reduce((s,x)=>s+num(x.diesel_liters),0);
    if(total_trucks<=0&&total_waste_tons<=0&&total_diesel<=0)return null;
    return{report_date,weather,temperature,start_time:text(landfill.start_time)||'04:00',end_time:text(landfill.end_time)||'19:00',total_trucks,total_waste_tons,total_diesel,notes:'',crews,operations,stations,equipment};
  }
  async function driveJson(url){const r=await originalFetch(url,{headers:{Authorization:`Bearer ${driveToken}`},cache:'no-store'});if(!r.ok)throw new Error(`Drive ${r.status}`);return r.json()}
  async function driveWorkbook(file){const url=file.mimeType===SHEET_MIME?`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(XLSX_MIME)}`:`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;const r=await originalFetch(url,{headers:{Authorization:`Bearer ${driveToken}`}});if(!r.ok)throw new Error(`Drive file ${r.status}`);return XLSX.read(await r.arrayBuffer(),{type:'array',cellDates:false})}
  async function allDriveFiles(){let files=[],pageToken='';for(let page=0;page<10;page++){const q=encodeURIComponent(`trashed=false and (mimeType='${SHEET_MIME}' or mimeType='${XLSX_MIME}')`);const fields=encodeURIComponent('nextPageToken,files(id,name,mimeType,modifiedTime,size)');const url=`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=1000${pageToken?`&pageToken=${encodeURIComponent(pageToken)}`:''}`;const d=await driveJson(url);files.push(...(d.files||[]));pageToken=d.nextPageToken||'';if(!pageToken)break}return files}
  function q1Dates(){const out=new Set();for(let m=1;m<=3;m++){const days=new Date(Date.UTC(2026,m,0)).getUTCDate();for(let d=1;d<=days;d++)out.add(`2026-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`)}return out}
  async function saveRow(row,existingByDate){
    const current=existingByDate.get(row.report_date);
    let method=current?'PUT':'POST',url=current?`/api/reports/${current.id}`:'/api/reports';
    let res=await originalFetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(row)});
    let data=await res.json().catch(()=>({}));
    if(!current&&res.status===409){
      const rr=await originalFetch('/api/reports',{cache:'no-store'}),rd=await rr.json().catch(()=>({}));
      const now=(Array.isArray(rd.reports)?rd.reports:[]).find(x=>String(x.report_date)===row.report_date);
      if(now){existingByDate.set(row.report_date,now);res=await originalFetch(`/api/reports/${now.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(row)});data=await res.json().catch(()=>({}));method='PUT';}
    }
    if(!res.ok||!data.ok)throw new Error(data.message||`فشل حفظ ${row.report_date}`);
    return method==='POST'?'created':'updated';
  }
  async function runRepair(){
    if(running)return;
    if(!driveToken){setState('اربط Google Drive أولًا ثم اضغط بدء الاستعادة.','error');return;}
    if(!window.XLSX){setState('قارئ Excel غير جاهز. حدّث الصفحة ثم أعد المحاولة.','error');return;}
    running=true;
    try{
      const rr=await originalFetch('/api/reports',{cache:'no-store'}),rd=await rr.json();
      const reports=Array.isArray(rd.reports)?rd.reports:[],existingByDate=new Map(reports.filter(r=>r?.report_date).map(r=>[String(r.report_date),r]));
      const targets=q1Dates();
      reports.forEach(r=>{if(r?.report_date&&num(r.total_trucks)===0&&num(r.total_waste_tons)===0&&num(r.total_diesel)===0)targets.add(String(r.report_date));});
      setState(`جاري قراءة ملفات Drive واستعادة يناير–مارس (${targets.size} يومًا مستهدفًا)...`);
      const files=await allDriveFiles(),found=new Map();let checked=0;
      for(const file of files){const n=norm(file.name);if(!(n.includes('تقرير')||n.includes('يومي')||n.includes('مكب')||n.includes('شهر')))continue;try{const wb=await driveWorkbook(file);checked++;for(const s of wb.SheetNames){if(norm(s)==='summary')continue;const row=parseSheet(s,wb.Sheets[s]);if(row&&targets.has(row.report_date)&&!found.has(row.report_date))found.set(row.report_date,row)}}catch(e){console.warn('historical restore skipped',file.name,e.message)}}
      if(!found.size)throw new Error('لم يتم العثور على صفحات يومية مطابقة في ملفات Drive');
      let created=0,updated=0,failed=0;
      for(const row of [...found.values()].sort((a,b)=>a.report_date.localeCompare(b.report_date))){try{const action=await saveRow(row,existingByDate);if(action==='created')created++;else updated++;}catch(e){failed++;console.error('historical restore save',row.report_date,e)}}
      const fixed=created+updated;
      if(fixed)window.dispatchEvent(new CustomEvent('minya:historical-repair-complete',{detail:{fixed,created,updated,failed}}));
      setState(`اكتملت الاستعادة: إنشاء ${created} تقرير وتحديث ${updated}${failed?`، وتعذر ${failed}`:''}. تم فحص ${checked} ملفًا.`,failed?'error':'ok');
    }catch(e){console.error('historical restore',e);setState(`تعذر الاستعادة التاريخية: ${e.message}`,'error')}finally{running=false}
  }
  window.MINYA_RUN_HISTORICAL_REPAIR=runRepair;
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:String(input?.url||''),headers=new Headers(init?.headers||(input instanceof Request?input.headers:undefined));
    const auth=headers.get('Authorization')||headers.get('authorization')||'';
    if(url.includes('www.googleapis.com/drive/v3/')&&auth.startsWith('Bearer '))driveToken=auth.slice(7);
    const res=await originalFetch(input,init);
    if(driveToken&&url.includes('www.googleapis.com/drive/v3/files?')&&res.ok)setTimeout(()=>runRepair(),500);
    return res;
  };
})();