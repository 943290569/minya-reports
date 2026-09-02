/* Source stations V12: exact parser for the recurring pivot-style station/Aziz files. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const state={stationsFile:null,azizFile:null,stations:new Map(),aziz:new Map(),busy:false};
  let applyTimers=[];

  function excelDate(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=clean(v);if(!s)return'';
    let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T].*)?$/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})(?:[ T].*)?$/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    return'';
  }
  function emptyStations(){return{yata:{trucks:0,tons:0},tarqumia:{trucks:0,tons:0},hebron:{trucks:0,tons:0}};}
  function day(map,date){if(!map.has(date))map.set(date,emptyStations());return map.get(date);}
  function stationKey(v){const n=norm(v);if(n.includes('يطا'))return'yata';if(n.includes('ترقوميا'))return'tarqumia';if(n.includes('الخليل'))return'hebron';return'';}

  async function pivotRows(file){
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellStyles:false,cellNF:false,cellHTML:false});
    let best=null;
    for(const name of wb.SheetNames){
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:'',blankrows:false});
      let header=-1;
      for(let r=0;r<Math.min(rows.length,20);r++){
        const a=norm(rows[r]?.[0]),b=norm(rows[r]?.[1]),c=norm(rows[r]?.[2]);
        if((a.includes('row labels')||a.includes('تسميات')||a.includes('الاسم')) && (b.includes('كمي')||b.includes('مجموع')) && (c.includes('عدد')||c.includes('وحد'))){header=r;break;}
      }
      if(header>=0&&(!best||rows.length>best.rows.length))best={rows,header,name};
    }
    if(!best)throw new Error('لم أجد جدول Row Labels / الكمية / العدد في الملف');
    return best;
  }

  async function parseStations(file){
    const {rows,header}=await pivotRows(file),out=new Map();let currentDate='';
    for(let r=header+1;r<rows.length;r++){
      const row=rows[r]||[],date=excelDate(row[0]);
      if(date){currentDate=date;continue;}
      if(!currentDate)continue;
      const key=stationKey(row[0]);if(!key)continue;
      const d=day(out,currentDate);d[key].tons+=num(row[1]);d[key].trucks+=num(row[2]);
    }
    if(!out.size)throw new Error('ملف المحطات: لم أجد بيانات يومية للمحطات');
    state.stations=out;
  }

  async function parseAziz(file){
    const {rows,header}=await pivotRows(file),out=new Map();
    for(let r=header+1;r<rows.length;r++){
      const row=rows[r]||[],date=excelDate(row[0]);if(!date)continue;
      out.set(date,{tons:num(row[1]),trucks:num(row[2])});
    }
    if(!out.size)throw new Error('ملف عبد العزيز: لم أجد بيانات يومية');
    state.aziz=out;
  }

  function mainTable(){const root=$('sourceFilesPreview');return root?[...root.querySelectorAll('.source-import-table')].find(t=>t.querySelector('tbody tr td:nth-child(16)'))||null:null;}
  function cellText(tons,trucks){return `${fmt(tons)} طن · ${fmt(trucks)} شاحنة`;}
  function totals(){
    let stationTons=0,stationTrucks=0,azizTons=0,azizTrucks=0;
    for(const s of state.stations.values())for(const k of ['yata','tarqumia','hebron']){stationTons+=s[k].tons;stationTrucks+=s[k].trucks;}
    for(const a of state.aziz.values()){azizTons+=a.tons;azizTrucks+=a.trucks;}
    return{stationTons,stationTrucks,azizTons,azizTrucks};
  }
  function renderTotals(root){
    if(!root)return;const t=totals();let box=root.querySelector('#stationsTotalsV12');
    if(!box){box=document.createElement('div');box.id='stationsTotalsV12';box.className='source-import-summary';const anchor=root.querySelector('.source-import-summary');if(anchor?.nextSibling)anchor.parentNode.insertBefore(box,anchor.nextSibling);else root.prepend(box);}
    const html=`<div><span>مجموع المحطات</span><strong>${cellText(t.stationTons,t.stationTrucks)}</strong></div><div><span>مجموع عبد العزيز</span><strong>${cellText(t.azizTons,t.azizTrucks)}</strong></div>`;
    if(box.innerHTML!==html)box.innerHTML=html;
  }
  function apply(){
    if(state.busy)return;const root=$('sourceFilesPreview'),table=mainTable();if(!root||(!state.stations.size&&!state.aziz.size))return;state.busy=true;
    try{
      if(table)table.querySelectorAll('tbody tr').forEach(tr=>{
        const c=tr.querySelectorAll('td');if(c.length<15)return;const date=clean(c[0].textContent),s=state.stations.get(date)||emptyStations(),a=state.aziz.get(date)||{tons:0,trucks:0};
        const yata={tons:s.yata.tons+a.tons,trucks:s.yata.trucks+a.trucks};
        [[11,yata],[12,a],[13,s.tarqumia],[14,s.hebron]].forEach(([idx,v])=>{const next=cellText(v.tons,v.trucks);if(c[idx]&&clean(c[idx].textContent)!==next)c[idx].textContent=next;});
      });
      renderTotals(root);
    }finally{state.busy=false;}
  }
  function scheduleApply(){applyTimers.forEach(clearTimeout);applyTimers=[80,350,900,1800,3500,6000].map(ms=>setTimeout(apply,ms));}
  async function refresh(){
    try{
      const tasks=[];if(state.stationsFile)tasks.push(parseStations(state.stationsFile));else state.stations.clear();if(state.azizFile)tasks.push(parseAziz(state.azizFile));else state.aziz.clear();await Promise.all(tasks);scheduleApply();
    }catch(e){console.error(e);const m=$('sourceFilesMessage');if(m)m.textContent=`تنبيه المحطات: ${e.message||'تعذر القراءة'}`;}
  }
  function init(){
    const sf=$('sourceFile_stations'),af=$('sourceFile_aziz'),btn=$('analyzeSourceFilesBtn'),clearBtn=$('clearSourceFilesBtn');if(!sf||!btn)return;
    sf.addEventListener('change',e=>state.stationsFile=e.target.files?.[0]||null);af?.addEventListener('change',e=>state.azizFile=e.target.files?.[0]||null);
    btn.addEventListener('click',()=>{state.stationsFile=sf.files?.[0]||null;state.azizFile=af?.files?.[0]||null;setTimeout(refresh,0);});
    clearBtn?.addEventListener('click',()=>{state.stations.clear();state.aziz.clear();applyTimers.forEach(clearTimeout);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
