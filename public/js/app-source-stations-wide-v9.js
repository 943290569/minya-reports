/* Source stations V9: parse wide station groups and show quantity then truck count. */
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
    const s=clean(v);let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    return '';
  }
  function day(map,date){if(!map.has(date))map.set(date,{yata:{trucks:0,tons:0},tarqumia:{trucks:0,tons:0},hebron:{trucks:0,tons:0}});return map.get(date);}
  function stationKey(v){const n=norm(v);if(n.includes('يطا'))return'yata';if(n.includes('ترقوميا'))return'tarqumia';if(n.includes('الخليل'))return'hebron';return'';}
  function rowsFrom(file){return file.arrayBuffer().then(buf=>{const wb=XLSX.read(buf,{type:'array',cellDates:true,cellStyles:false,cellNF:false,cellHTML:false});const name=wb.SheetNames[0];return XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:'',blankrows:false});});}
  function dateRatio(rows,col,start){let n=0,ok=0;for(let r=start;r<Math.min(rows.length,start+50);r++){const v=(rows[r]||[])[col];if(clean(v)==='')continue;n++;if(excelDate(v))ok++;}return n?ok/n:0;}
  function intRatio(rows,col,start){let n=0,ok=0;for(let r=start;r<Math.min(rows.length,start+50);r++){const v=clean((rows[r]||[])[col]);if(v==='')continue;const x=num(v);n++;if(Number.isInteger(x)&&x>=0&&x<=100)ok++;}return n?ok/n:0;}
  function qtyScore(rows,col,start){let n=0,score=0;for(let r=start;r<Math.min(rows.length,start+50);r++){const v=clean((rows[r]||[])[col]);if(v==='')continue;const x=num(v);n++;if(x>0)score+=x>100?3:x>20?2:1;}return n?score/n:0;}
  function detectGroup(rows,h,col){const start=h+1,cands=[col-1,col,col+1,col+2].filter(c=>c>=0);let dateCol=-1,bestD=0,truckCol=-1,bestT=0,qtyCol=-1,bestQ=-1;for(const c of cands){const d=dateRatio(rows,c,start);if(d>bestD){bestD=d;dateCol=c;}}for(const c of cands){if(c===dateCol)continue;const t=intRatio(rows,c,start);if(t>bestT){bestT=t;truckCol=c;}}for(const c of cands){if(c===dateCol||c===truckCol)continue;const q=qtyScore(rows,c,start);if(q>bestQ){bestQ=q;qtyCol=c;}}if(dateCol<0||truckCol<0||qtyCol<0)return null;return{dateCol,truckCol,qtyCol,start};}
  async function parseStations(file){
    const rows=await rowsFrom(file),out=new Map();let groups={};
    for(let h=0;h<Math.min(rows.length,20);h++)for(let c=0;c<(rows[h]||[]).length;c++){const k=stationKey(rows[h][c]);if(k&&!groups[k]){const g=detectGroup(rows,h,c);if(g)groups[k]=g;}}
    if(Object.keys(groups).length<2)throw new Error('ملف المحطات: لم أتعرف على مجموعات يطا/ترقوميا/الخليل بالشكل العريض');
    for(const [k,g] of Object.entries(groups))for(let r=g.start;r<rows.length;r++){const row=rows[r]||[],date=excelDate(row[g.dateCol]);if(!date)continue;const rawT=clean(row[g.truckCol]),rawQ=clean(row[g.qtyCol]);if(rawT===''&&rawQ==='')continue;const d=day(out,date);d[k].trucks+=num(row[g.truckCol]);d[k].tons+=num(row[g.qtyCol]);}
    state.stations=out;
  }
  async function parseAziz(file){
    const rows=await rowsFrom(file),out=new Map();let bestDate=-1,bestQty=-1,bestD=0,bestQ=-1,start=0;
    for(let h=0;h<Math.min(rows.length,20);h++){const row=rows[h]||[];for(let c=0;c<row.length;c++){const n=norm(row[c]);if(n==='تاريخ'||n==='التاريخ'||n.includes('تاريخ')){const d=dateRatio(rows,c,h+1);if(d>bestD){bestD=d;bestDate=c;start=h+1;}}}}
    if(bestDate<0){for(let c=0;c<Math.min(10,(rows[0]||[]).length);c++){const d=dateRatio(rows,c,0);if(d>bestD){bestD=d;bestDate=c;start=0;}}}
    for(let c=0;c<Math.min(12,Math.max(...rows.slice(0,10).map(r=>(r||[]).length),0));c++){if(c===bestDate)continue;const q=qtyScore(rows,c,start);if(q>bestQ){bestQ=q;bestQty=c;}}
    if(bestDate<0||bestQty<0)throw new Error('ملف عبد العزيز: لم أتعرف على التاريخ والكمية');
    for(let r=start;r<rows.length;r++){const row=rows[r]||[],date=excelDate(row[bestDate]),raw=clean(row[bestQty]);if(!date||raw==='')continue;if(!out.has(date))out.set(date,{trucks:0,tons:0});const d=out.get(date);d.trucks+=1;d.tons+=num(row[bestQty]);}
    state.aziz=out;
  }
  function mainTable(){const root=$('sourceFilesPreview');if(!root)return null;return [...root.querySelectorAll('.source-import-table')].find(t=>t.querySelector('tbody tr td:nth-child(16)'))||null;}
  function text(tons,trucks){return `${fmt(tons)} طن · ${fmt(trucks)} شاحنة`;}
  function apply(){
    if(state.busy)return;const table=mainTable();if(!table||!state.stations.size)return;state.busy=true;observer?.disconnect();
    try{
      let stationMonth=0,azizMonth=0;
      table.querySelectorAll('tbody tr').forEach(tr=>{const c=tr.querySelectorAll('td');if(c.length<15)return;const date=clean(c[0].textContent),s=state.stations.get(date)||{yata:{trucks:0,tons:0},tarqumia:{trucks:0,tons:0},hebron:{trucks:0,tons:0}},a=state.aziz.get(date)||{trucks:0,tons:0};const yata={trucks:s.yata.trucks+a.trucks,tons:s.yata.tons+a.tons};stationMonth+=yata.tons+s.tarqumia.tons+s.hebron.tons;azizMonth+=a.tons;
        const vals=[[11,yata],[12,a],[13,s.tarqumia],[14,s.hebron]];for(const [idx,v] of vals){const next=text(v.tons,v.trucks);if(clean(c[idx].textContent)!==next)c[idx].textContent=next;}
      });
      const root=$('sourceFilesPreview'),cards=root?.querySelector('.source-import-summary')?.querySelectorAll(':scope > div');if(cards?.[2]){const s=cards[2].querySelector('strong'),v=`${fmt(stationMonth)} طن`;if(s&&s.textContent!==v)s.textContent=v;}if(cards?.[3]){const s=cards[3].querySelector('strong'),v=`${fmt(azizMonth)} طن`;if(s&&s.textContent!==v)s.textContent=v;}
      let note=root?.querySelector('#stationsWideV9');if(root&&!note){note=document.createElement('div');note.id='stationsWideV9';note.className='drive-preview-note';note.innerHTML='<strong>المحطات:</strong> تمت قراءة يطا وترقوميا والخليل كمجموعات أعمدة مستقلة. يظهر لكل يوم: الكمية ثم عدد الشاحنات، وعبد العزيز مضاف إلى يطا.';root.prepend(note);}
    }finally{state.busy=false;observe();}
  }
  async function refresh(){try{const tasks=[];if(state.stationsFile)tasks.push(parseStations(state.stationsFile));else state.stations.clear();if(state.azizFile)tasks.push(parseAziz(state.azizFile));else state.aziz.clear();await Promise.all(tasks);apply();}catch(e){console.error(e);const m=$('sourceFilesMessage');if(m)m.textContent=`تنبيه المحطات: ${e.message||'تعذر القراءة'}`;}}
  function observe(){const root=$('sourceFilesPreview');if(observer&&root)observer.observe(root,{childList:true,subtree:true,characterData:true});}
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(!state.busy&&state.stations.size)apply();},80);}
  function init(){const sf=$('sourceFile_stations'),af=$('sourceFile_aziz'),btn=$('analyzeSourceFilesBtn'),root=$('sourceFilesPreview');if(!sf||!btn||!root)return;state.stationsFile=sf.files?.[0]||null;state.azizFile=af?.files?.[0]||null;sf.addEventListener('change',e=>state.stationsFile=e.target.files?.[0]||null);af?.addEventListener('change',e=>state.azizFile=e.target.files?.[0]||null);btn.addEventListener('click',()=>setTimeout(refresh,0));observer=new MutationObserver(schedule);observe();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
