/* Source stations V10: explicit two-row wide headers, tolerant dates, quantity then truck count. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const state={stationsFile:null,azizFile:null,stations:new Map(),aziz:new Map(),busy:false};
  let observer=null,timer=null;

  function excelDate(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=clean(v);if(!s)return'';
    let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T].*)?$/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})(?:[ T].*)?$/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    return'';
  }
  function day(map,date){if(!map.has(date))map.set(date,{yata:{trucks:0,tons:0},tarqumia:{trucks:0,tons:0},hebron:{trucks:0,tons:0}});return map.get(date);}
  function stationKey(v){const n=norm(v);if(n.includes('يطا'))return'yata';if(n.includes('ترقوميا'))return'tarqumia';if(n.includes('الخليل'))return'hebron';return'';}
  async function rowsFrom(file){const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellStyles:false,cellNF:false,cellHTML:false});const name=wb.SheetNames[0];return XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:'',blankrows:false});}
  function explicitGroup(rows,h,c){
    for(let sh=h+1;sh<=Math.min(h+3,rows.length-1);sh++){
      const row=rows[sh]||[],cands=[c-2,c-1,c,c+1,c+2].filter(x=>x>=0&&x<row.length);let dateCol=-1,truckCol=-1,qtyCol=-1;
      for(const x of cands){const n=norm(row[x]);if(dateCol<0&&n.includes('تاريخ'))dateCol=x;else if(truckCol<0&&(n==='عدد'||n.includes('العدد')||n.includes('عدد الشاحنات')))truckCol=x;else if(qtyCol<0&&(n.includes('مجموع')||n.includes('كميه')||n.includes('كمية')))qtyCol=x;}
      if(dateCol>=0&&truckCol>=0&&qtyCol>=0)return{dateCol,truckCol,qtyCol,start:sh+1};
    }
    return null;
  }
  function dateRatio(rows,col,start){let n=0,ok=0;for(let r=start;r<Math.min(rows.length,start+60);r++){const v=(rows[r]||[])[col];if(clean(v)==='')continue;n++;if(excelDate(v))ok++;}return n?ok/n:0;}
  function intRatio(rows,col,start){let n=0,ok=0;for(let r=start;r<Math.min(rows.length,start+60);r++){const v=clean((rows[r]||[])[col]);if(v==='')continue;const x=num(v);n++;if(Number.isInteger(x)&&x>=0&&x<=500)ok++;}return n?ok/n:0;}
  function qtyScore(rows,col,start){let n=0,score=0;for(let r=start;r<Math.min(rows.length,start+60);r++){const v=clean((rows[r]||[])[col]);if(v==='')continue;const x=num(v);n++;if(x>0)score+=x>100?4:x>20?2:1;}return n?score/n:0;}
  function fallbackGroup(rows,h,c){const start=h+1,cands=[c-2,c-1,c,c+1,c+2].filter(x=>x>=0);let dateCol=-1,bestD=0,truckCol=-1,bestT=0,qtyCol=-1,bestQ=-1;for(const x of cands){const s=dateRatio(rows,x,start);if(s>bestD){bestD=s;dateCol=x;}}for(const x of cands){if(x===dateCol)continue;const s=intRatio(rows,x,start);if(s>bestT){bestT=s;truckCol=x;}}for(const x of cands){if(x===dateCol||x===truckCol)continue;const s=qtyScore(rows,x,start);if(s>bestQ){bestQ=s;qtyCol=x;}}return dateCol>=0&&truckCol>=0&&qtyCol>=0?{dateCol,truckCol,qtyCol,start}:null;}
  async function parseStations(file){
    const rows=await rowsFrom(file),out=new Map(),groups={};
    for(let h=0;h<Math.min(rows.length,15);h++)for(let c=0;c<(rows[h]||[]).length;c++){const k=stationKey(rows[h][c]);if(k&&!groups[k])groups[k]=explicitGroup(rows,h,c)||fallbackGroup(rows,h,c);}
    Object.keys(groups).forEach(k=>{if(!groups[k])delete groups[k];});
    if(!groups.yata&&!groups.tarqumia&&!groups.hebron)throw new Error('ملف المحطات: لم أتعرف على مجموعات المحطات');
    for(const [k,g] of Object.entries(groups))for(let r=g.start;r<rows.length;r++){const row=rows[r]||[],date=excelDate(row[g.dateCol]);if(!date)continue;const rt=clean(row[g.truckCol]),rq=clean(row[g.qtyCol]);if(rt===''&&rq==='')continue;const d=day(out,date);d[k].trucks+=num(row[g.truckCol]);d[k].tons+=num(row[g.qtyCol]);}
    state.stations=out;
  }
  async function parseAziz(file){
    const rows=await rowsFrom(file),out=new Map();let dateCol=-1,qtyCol=-1,start=0;
    for(let h=0;h<Math.min(rows.length,20);h++){const row=rows[h]||[];for(let c=0;c<row.length;c++){const n=norm(row[c]);if(dateCol<0&&n.includes('تاريخ')){dateCol=c;start=h+1;}if(qtyCol<0&&(n.includes('مجموع')||n.includes('كميه')||n.includes('كمية')))qtyCol=c;}if(dateCol>=0&&qtyCol>=0)break;}
    if(dateCol<0||qtyCol<0){let bestD=0,bestQ=-1;for(let c=0;c<Math.min(12,Math.max(...rows.slice(0,10).map(r=>(r||[]).length),0));c++){const d=dateRatio(rows,c,0),q=qtyScore(rows,c,0);if(d>bestD){bestD=d;dateCol=c;}if(q>bestQ){bestQ=q;qtyCol=c;}}start=0;}
    if(dateCol<0||qtyCol<0)throw new Error('ملف عبد العزيز: لم أتعرف على التاريخ والكمية');
    for(let r=start;r<rows.length;r++){const row=rows[r]||[],date=excelDate(row[dateCol]),rq=clean(row[qtyCol]);if(!date||rq==='')continue;if(!out.has(date))out.set(date,{trucks:0,tons:0});const d=out.get(date);d.trucks+=1;d.tons+=num(row[qtyCol]);}
    state.aziz=out;
  }
  function mainTable(){const root=$('sourceFilesPreview');return root?[...root.querySelectorAll('.source-import-table')].find(t=>t.querySelector('tbody tr td:nth-child(16)'))||null:null;}
  function cellText(tons,trucks){return `${fmt(tons)} طن · ${fmt(trucks)} شاحنة`;}
  function apply(){
    if(state.busy)return;const table=mainTable();if(!table||(!state.stations.size&&!state.aziz.size))return;state.busy=true;observer?.disconnect();
    try{
      let stationMonth=0,azizMonth=0;
      table.querySelectorAll('tbody tr').forEach(tr=>{const c=tr.querySelectorAll('td');if(c.length<15)return;const date=clean(c[0].textContent),hasS=state.stations.has(date),hasA=state.aziz.has(date);if(!hasS&&!hasA)return;const s=state.stations.get(date)||{yata:{trucks:0,tons:0},tarqumia:{trucks:0,tons:0},hebron:{trucks:0,tons:0}},a=state.aziz.get(date)||{trucks:0,tons:0};const yata={trucks:s.yata.trucks+a.trucks,tons:s.yata.tons+a.tons};stationMonth+=yata.tons+s.tarqumia.tons+s.hebron.tons;azizMonth+=a.tons;[[11,yata],[12,a],[13,s.tarqumia],[14,s.hebron]].forEach(([idx,v])=>{const next=cellText(v.tons,v.trucks);if(clean(c[idx].textContent)!==next)c[idx].textContent=next;});});
      const root=$('sourceFilesPreview'),cards=root?.querySelector('.source-import-summary')?.querySelectorAll(':scope > div');if(cards?.[2]){const s=cards[2].querySelector('strong'),v=`${fmt(stationMonth)} طن`;if(s&&s.textContent!==v)s.textContent=v;}if(cards?.[3]){const s=cards[3].querySelector('strong'),v=`${fmt(azizMonth)} طن`;if(s&&s.textContent!==v)s.textContent=v;}
      let note=root?.querySelector('#stationsWideV10');if(root&&!note){note=document.createElement('div');note.id='stationsWideV10';note.className='drive-preview-note';note.innerHTML='<strong>المحطات V10:</strong> القراءة تعتمد عناوين التاريخ/العدد/المجموع لكل محطة مباشرة. يظهر لكل يوم: الكمية ثم عدد الشاحنات.';root.prepend(note);}
    }finally{state.busy=false;observe();}
  }
  async function refresh(){try{const tasks=[];if(state.stationsFile)tasks.push(parseStations(state.stationsFile));else state.stations.clear();if(state.azizFile)tasks.push(parseAziz(state.azizFile));else state.aziz.clear();await Promise.all(tasks);apply();}catch(e){console.error(e);const m=$('sourceFilesMessage');if(m)m.textContent=`تنبيه المحطات: ${e.message||'تعذر القراءة'}`;}}
  function observe(){const root=$('sourceFilesPreview');if(observer&&root)observer.observe(root,{childList:true,subtree:true});}
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(!state.busy)apply();},120);}
  function init(){const sf=$('sourceFile_stations'),af=$('sourceFile_aziz'),btn=$('analyzeSourceFilesBtn'),root=$('sourceFilesPreview');if(!sf||!btn||!root)return;state.stationsFile=sf.files?.[0]||null;state.azizFile=af?.files?.[0]||null;sf.addEventListener('change',e=>state.stationsFile=e.target.files?.[0]||null);af?.addEventListener('change',e=>state.azizFile=e.target.files?.[0]||null);btn.addEventListener('click',()=>setTimeout(refresh,0));observer=new MutationObserver(schedule);observe();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
