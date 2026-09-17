(()=>{
  const MONTHLY_RE=/\/api\/monthly-entry\?month=(\d{4}-\d{2})/;
  const SHEET_MIME='application/vnd.google-apps.spreadsheet';
  const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.readonly';
  const originalFetch=window.fetch.bind(window);
  let accessToken='';
  let tokenClient=null;
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0};
  const text=v=>String(v??'').trim();
  const norm=v=>text(v).replace(/\s+/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[()ـ_\-]/g,'').toLowerCase();
  const validDate=(y,m,d)=>{y=+y;m=+m;d=+d;const x=new Date(Date.UTC(y,m-1,d));return y>=2000&&y<=2100&&x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d?`${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:''};
  function dateIso(value){
    const s=text(value);let m=s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);if(m)return validDate(m[1],m[2],m[3]);
    m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})/);if(m)return validDate(m[3].length===2?2000+Number(m[3]):m[3],m[2],m[1]);
    m=s.match(/^(\d{2})(\d{2})(\d{4})$/);if(m)return validDate(m[3],m[2],m[1]);return '';
  }
  function setStatus(message){const el=document.getElementById('status');if(el)el.textContent=message}
  function ensureToken(){
    if(accessToken)return Promise.resolve(accessToken);
    const clientId=localStorage.getItem('minyaGoogleDriveClientId')||'';
    if(!clientId||!window.google?.accounts?.oauth2)return Promise.resolve('');
    return new Promise(resolve=>{
      try{
        tokenClient=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:DRIVE_SCOPE,callback:r=>{accessToken=r?.access_token||'';resolve(accessToken)}});
        tokenClient.requestAccessToken({prompt:''});
      }catch(_){resolve('')}
    });
  }
  async function driveFetch(url,token){const r=await originalFetch(url,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error('تعذر قراءة Google Drive');return r}
  async function listFiles(token){
    const q=encodeURIComponent(`trashed=false and (mimeType='${SHEET_MIME}' or mimeType='${XLSX_MIME}')`);
    const fields=encodeURIComponent('files(id,name,mimeType,modifiedTime,size)');
    const r=await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=300`,token);
    const d=await r.json();return Array.isArray(d.files)?d.files:[];
  }
  function filenameScore(name,month){
    const m=Number(month.slice(5)),n=norm(name),s=String(m),s2=String(m).padStart(2,'0');let score=0;
    if(n.includes('تقرير')||n.includes('يومي'))score+=3;
    const raw=String(name||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    if(new RegExp(`شهر\\s*[(:_\\-]*\\s*0?${s}(?:\\D|$)`,'i').test(raw))score+=12;
    if(new RegExp(`(?:^|\\D)${s2}(?:\\D|$)`).test(raw))score+=3;
    return score;
  }
  async function workbookFor(file,token){
    const url=file.mimeType===SHEET_MIME
      ?`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(XLSX_MIME)}`
      :`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;
    const r=await driveFetch(url,token);return XLSX.read(await r.arrayBuffer(),{type:'array',cellDates:false});
  }
  async function findBestWorkbook(month,token){
    const files=(await listFiles(token)).map(f=>({...f,score:filenameScore(f.name,month)})).filter(f=>f.score>0).sort((a,b)=>b.score-a.score||String(b.modifiedTime).localeCompare(String(a.modifiedTime))).slice(0,12);
    let best=null;
    for(const file of files){
      try{
        const wb=await workbookFor(file,token);const count=wb.SheetNames.filter(n=>dateIso(n).startsWith(month+'-')).length;
        if(!best||count>best.count||(count===best.count&&file.score>best.file.score))best={file,wb,count};
        if(count>=28)break;
      }catch(_){}
    }
    return best&&best.count>0?best:null;
  }
  function cleanUnit(v){const n=norm(v);if(n.includes('طن')||n.includes('طون'))return'طن';if(n.includes('كوب'))return'كوب';if(n.includes('نقله'))return'نقلة';return text(v)}
  function time24(v){const s=text(v),m=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);if(!m)return s;let h=+m[1],ap=(m[3]||'').toUpperCase();if(ap==='PM'&&h<12)h+=12;if(ap==='AM'&&h===12)h=0;return`${String(h).padStart(2,'0')}:${m[2]}`}
  function findRow(rows,needle,start=0){const n=norm(needle);return rows.findIndex((r,i)=>i>=start&&r.some(c=>norm(c).includes(n)))}
  function parseDailySheet(name,sheet){
    const report_date=dateIso(name);if(!report_date)return null;
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''}).slice(0,120);
    const operations=[],stations=[],equipment=[];
    const opHeader=findRow(rows,'موقع مكب المنيا'),stHeader=findRow(rows,'موقع محطات الترحيل');
    if(opHeader>=0){const end=stHeader>opHeader?stHeader:rows.length;for(let i=opHeader+1;i<end;i++){const r=rows[i]||[],nm=text(r[0]);if(!nm)continue;const nn=norm(nm);if(nn.includes('كمياتالنفاياتالوارده')||nn.includes('المجموعالنهائي'))break;operations.push({operation_name:nm,start_time:time24(r[1]),end_time:time24(r[2]),vehicle_count:num(r[3]),quantity:num(r[4]),unit:cleanUnit(r[5]),notes:''})}}
    if(stHeader>=0){let end=findRow(rows,'كميات النفايات الواردة',stHeader+1);if(end<0)end=rows.length;for(let i=stHeader+1;i<end;i++){const r=rows[i]||[],nm=text(r[0]);if(!nm)continue;stations.push({station_name:nm,truck_count:num(r[3]),waste_tons:num(r[4]),unit:cleanUnit(r[5])||'طن',notes:''})}}
    const eqHeader=findRow(rows,'اسم الالية');if(eqHeader>=0){for(let i=eqHeader+1;i<rows.length;i++){const r=rows[i]||[],nm=text(r[0]);if(!nm)continue;const nn=norm(nm);if(nn.includes('مجموعكميهالسولار')||nn.includes('ملاحظات'))break;equipment.push({equipment_name:nm,operating_status:text(r[1])||'يعمل',status_description:text(r[2]),working_hours:0,diesel_liters:num(r[5]),notes:''})}}
    return{report_date,operations,stations,equipment};
  }
  function canonicalOp(name){const n=norm(name);if(n.includes('مكب')&&n.includes('المنيا'))return'مكب نفايات المنيا';if(n.includes('تغطي')&&n.includes('اسلوب'))return'مواد التغطية (اسلوب)';if(n.includes('تغطي')&&n.includes('طمم')&&!n.includes('خارجي'))return'مواد التغطية (طمم)';if(n.includes('مياه')&&!n.includes('رش'))return'كميات المياه للتعقيم والترطيب';if(n.includes('رش')&&n.includes('مياه'))return'عدد مرات رش المياه';if(n.includes('عصار'))return'كميات العصارة المرحلة';if(n.includes('فرز'))return'خط الفرز';if((n.includes('طمم')||n.includes('ردم'))&&n.includes('خارجي'))return'طمم خارجي';return''}
  function canonicalStation(name){const n=norm(name);if(n.includes('خليل'))return'محطة ترحيل الخليل';if(n.includes('ترقوميا'))return'محطة ترحيل ترقوميا';if(n.includes('يطا')||n.includes('عزيز'))return'محطة ترحيل يطا';return''}
  function fillNonZero(target,source,fields){for(const f of fields){if(num(target[f])===0&&num(source[f])!==0)target[f]=num(source[f])}}
  function mergeDay(data,src){
    data.operations=Array.isArray(data.operations)?data.operations:[];data.stations=Array.isArray(data.stations)?data.stations:[];data.equipment=Array.isArray(data.equipment)?data.equipment:[];
    for(const x of src.operations){const name=canonicalOp(x.operation_name);if(!name)continue;let t=data.operations.find(v=>v.operation_name===name);if(!t){t={operation_name:name,vehicle_count:0,quantity:0,unit:x.unit||'',notes:''};data.operations.push(t)}fillNonZero(t,x,['vehicle_count','quantity'])}
    for(const x of src.stations){const name=canonicalStation(x.station_name);if(!name)continue;let t=data.stations.find(v=>v.station_name===name);if(!t){t={station_name:name,truck_count:0,waste_tons:0,unit:'طن',notes:''};data.stations.push(t)}fillNonZero(t,x,['truck_count','waste_tons'])}
    for(const x of src.equipment){const xn=norm(x.equipment_name);let t=data.equipment.find(v=>norm(v.equipment_name)===xn);if(!t)t=data.equipment.find(v=>{const vn=norm(v.equipment_name),year=(xn.match(/20\d{2}/)||[])[0];return (!year||vn.includes(year))&&(vn.includes(xn)||xn.includes(vn))});if(t)fillNonZero(t,x,['diesel_liters','working_hours']);else data.equipment.push({...x})}
    const landfill=data.operations.find(v=>v.operation_name==='مكب نفايات المنيا')||{};
    const waste=num(landfill.quantity)+data.stations.reduce((s,v)=>s+num(v.waste_tons),0),trucks=num(landfill.vehicle_count)+data.stations.reduce((s,v)=>s+num(v.truck_count),0),diesel=data.equipment.reduce((s,v)=>s+num(v.diesel_liters),0);
    data.summary_totals={...(data.summary_totals||{}),waste,trucks,diesel};data.stored_totals={...(data.stored_totals||{}),waste,trucks,diesel};data.drive_auto_source=true;return data;
  }
  function needsDrive(json){const rows=Array.isArray(json?.rows)?json.rows:[];if(!rows.length)return false;const existing=rows.filter(r=>r?.source!=='new');if(!existing.length)return false;const totals=existing.reduce((a,r)=>{const d=r.data||{},land=(d.operations||[]).find(x=>canonicalOp(x.operation_name)==='مكب نفايات المنيا')||{};a.waste+=num(land.quantity);a.trucks+=num(land.vehicle_count)+(d.stations||[]).reduce((s,x)=>s+num(x.truck_count),0);a.diesel+=(d.equipment||[]).reduce((s,x)=>s+num(x.diesel_liters),0);return a},{waste:0,trucks:0,diesel:0});return totals.waste===0||totals.trucks===0||totals.diesel===0}
  async function enrich(json,month,token){
    if(!token||!window.XLSX||!needsDrive(json))return json;
    setStatus('جاري البحث تلقائيًا عن ملف الشهر في Google Drive...');
    const found=await findBestWorkbook(month,token);if(!found)return json;
    const parsed=new Map();for(const name of found.wb.SheetNames){const d=dateIso(name);if(!d.startsWith(month+'-'))continue;const p=parseDailySheet(name,found.wb.Sheets[name]);if(p)parsed.set(p.report_date,p)}
    let changed=0;for(const row of json.rows||[]){const p=parsed.get(row.report_date);if(!p)continue;const before=JSON.stringify(row.data);row.data=mergeDay(row.data||{},p);if(JSON.stringify(row.data)!==before)changed++}
    if(changed){json.drive_auto={file_id:found.file.id,file_name:found.file.name,days:parsed.size};const existing=(json.rows||[]).filter(r=>r.source!=='new');json.monthly_totals=existing.reduce((a,r)=>{const t=r.data?.summary_totals||{};a.trucks+=num(t.trucks);a.waste+=num(t.waste);a.diesel+=num(t.diesel);return a},{trucks:0,waste:0,diesel:0});setStatus(`تم استكمال بيانات الشهر تلقائيًا من Drive: ${found.file.name}`)}
    return json;
  }
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:input?.url||'';const m=url.match(MONTHLY_RE);if(!m||String(init?.method||'GET').toUpperCase()!=='GET')return originalFetch(input,init);
    const month=m[1];const tokenPromise=navigator.userActivation?.isActive?ensureToken():Promise.resolve(accessToken);
    const response=await originalFetch(input,init);if(!response.ok)return response;
    let json;try{json=await response.clone().json()}catch(_){return response}
    const token=await tokenPromise;try{json=await enrich(json,month,token)}catch(e){console.warn('Automatic Drive monthly recovery skipped:',e)}
    const headers=new Headers(response.headers);headers.set('content-type','application/json; charset=utf-8');return new Response(JSON.stringify(json),{status:response.status,statusText:response.statusText,headers});
  };
})();
