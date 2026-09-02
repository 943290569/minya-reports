/* V21 Pivot adapter: recurring landfill/stations/Aziz exports with quantity + vehicle counts, including leachate and stable station totals. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const state={busy:false,bypass:false,landfill:new Map(),stations:new Map(),aziz:new Map(),timers:[]};

  function iso(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=clean(v);let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;return'';
  }
  function bucket(label){const n=norm(label);if(n.includes('عصاره'))return'leachate';if(n.includes('مواد لتغطيه المكب'))return'cover';if(n.includes('طمم'))return'tamm';if(n.includes('هيئات محليه'))return'local';if(n.includes('اسرائيلي')||n.includes('مستوطن'))return'settlements';if(n.includes('افراد')||n.includes('نقديه'))return'individuals';if(n.includes('شركات')||n.includes('مصانع'))return'companies';return'other';}
  function stationKey(label){const n=norm(label);if(n.includes('يطا'))return'yata';if(n.includes('ترقوميا'))return'tarqumia';if(n.includes('الخليل'))return'hebron';return'';}
  function emptyLand(){return{local:{tons:0,trucks:0},settlements:{tons:0,trucks:0},individuals:{tons:0,trucks:0},companies:{tons:0,trucks:0},other:{tons:0,trucks:0},leachate:{tons:0,trucks:0},tamm:{tons:0,trucks:0},cover:{tons:0,trucks:0}};}
  function emptyStations(){return{yata:{tons:0,trucks:0},tarqumia:{tons:0,trucks:0},hebron:{tons:0,trucks:0}};}

  async function pivot(file){
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellStyles:false,cellNF:false,cellHTML:false});let best=null;
    for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:'',blankrows:false});for(let h=0;h<Math.min(rows.length,20);h++){const a=norm(rows[h]?.[0]),b=norm(rows[h]?.[1]),c=norm(rows[h]?.[2]);if((a.includes('row labels')||a.includes('تسميات'))&&(b.includes('كمي')||b.includes('مجموع'))&&(c.includes('عدد')||c.includes('وحد')||c.includes('مركبات')||c.includes('شاحنات'))){if(!best||rows.length>best.rows.length)best={rows,h};break;}}}
    return best;
  }
  function makeFile(rows,name){const ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'بيانات');const ab=XLSX.write(wb,{bookType:'xlsx',type:'array'});return new File([ab],name,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
  function assign(input,file){const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));}
  function expand(rows,date,label,tons,trucks){trucks=Math.max(0,Math.round(num(trucks)));tons=num(tons);if(!trucks)return;const each=tons/trucks;for(let i=0;i<trucks;i++)rows.push([date,label,each]);}

  async function normalizeLandfill(input){const p=await pivot(input.files?.[0]);if(!p)return false;const out=[['التاريخ','الاسم','الكمية']],map=new Map();let d='';for(let r=p.h+1;r<p.rows.length;r++){const row=p.rows[r]||[],date=iso(row[0]);if(date){d=date;if(!map.has(d))map.set(d,emptyLand());continue;}if(!d||norm(row[0]).includes('الاجمالي الكلي'))continue;const label=clean(row[0]);if(!label)continue;const k=bucket(label),x=map.get(d);x[k].tons+=num(row[1]);x[k].trucks+=num(row[2]);expand(out,d,label,row[1],row[2]);}state.landfill=map;assign(input,makeFile(out,'مكب-pivot-normalized.xlsx'));return true;}
  async function normalizeStations(input){const p=await pivot(input.files?.[0]);if(!p)return false;const out=[['التاريخ','المحطة','الكمية']],map=new Map();let d='';for(let r=p.h+1;r<p.rows.length;r++){const row=p.rows[r]||[],date=iso(row[0]);if(date){d=date;if(!map.has(d))map.set(d,emptyStations());continue;}if(!d||norm(row[0]).includes('الاجمالي الكلي'))continue;const k=stationKey(row[0]);if(!k)continue;const x=map.get(d)[k];x.tons+=num(row[1]);x.trucks+=num(row[2]);expand(out,d,clean(row[0]),row[1],row[2]);}state.stations=map;assign(input,makeFile(out,'محطات-pivot-normalized.xlsx'));return true;}
  async function normalizeAziz(input){const p=await pivot(input.files?.[0]);if(!p)return false;const out=[['التاريخ','الكمية']],map=new Map();for(let r=p.h+1;r<p.rows.length;r++){const row=p.rows[r]||[],date=iso(row[0]);if(!date)continue;const tons=num(row[1]),trucks=Math.max(0,Math.round(num(row[2])));map.set(date,{tons,trucks});if(trucks){const each=tons/trucks;for(let i=0;i<trucks;i++)out.push([date,each]);}}state.aziz=map;assign(input,makeFile(out,'عبد العزيز-pivot-normalized.xlsx'));return true;}
  function text(x){return `${fmt(x.tons)} طن · ${fmt(x.trucks)} شاحنة`;}
  function totalLand(x){const ks=['local','settlements','individuals','companies','other'];return ks.reduce((a,k)=>({tons:a.tons+x[k].tons,trucks:a.trucks+x[k].trucks}),{tons:0,trucks:0});}
  function leachateTotal(){let t={tons:0,trucks:0};for(const x of state.landfill.values()){t.tons+=x.leachate.tons;t.trucks+=x.leachate.trucks;}return t;}
  function applyLeachate(root){
    const total=leachateTotal(),box=root.querySelector('#specialCategoriesV16');if(!box)return;
    const summary=box.querySelector('.source-import-summary');const first=summary?.querySelector('div:first-child strong');if(first){const next=text(total);if(clean(first.textContent)!==next)first.textContent=next;}
    box.querySelectorAll('table tbody tr').forEach(tr=>{const c=tr.querySelectorAll('td');if(c.length<2)return;const d=clean(c[0].textContent),l=state.landfill.get(d);if(!l)return;const next=text(l.leachate);if(clean(c[1].textContent)!==next)c[1].textContent=next;});
  }
  function apply(){
    const root=$('sourceFilesPreview');if(!root)return;
    const table=[...root.querySelectorAll('.source-import-table')].find(t=>t.querySelector('tbody tr td:nth-child(16)'));if(!table)return;
    table.querySelectorAll('tbody tr').forEach(tr=>{const c=tr.querySelectorAll('td');if(c.length<15)return;const d=clean(c[0].textContent),l=state.landfill.get(d),s=state.stations.get(d),a=state.aziz.get(d)||{tons:0,trucks:0};if(l){[[6,l.local],[7,l.settlements],[8,l.individuals],[9,l.companies],[10,totalLand(l)]].forEach(([i,v])=>{if(c[i])c[i].textContent=text(v);});}if(s||state.aziz.has(d)){const ss=s||emptyStations(),yata={tons:ss.yata.tons+a.tons,trucks:ss.yata.trucks+a.trucks};[[11,yata],[12,a],[13,ss.tarqumia],[14,ss.hebron]].forEach(([i,v])=>{if(c[i])c[i].textContent=text(v);});}});
    let lt={tons:0,trucks:0},st={tons:0,trucks:0},at={tons:0,trucks:0};
    for(const x of state.landfill.values()){const t=totalLand(x);lt.tons+=t.tons;lt.trucks+=t.trucks;}
    for(const x of state.stations.values())for(const k of ['yata','tarqumia','hebron']){st.tons+=x[k].tons;st.trucks+=x[k].trucks;}
    for(const x of state.aziz.values()){at.tons+=x.tons;at.trucks+=x.trucks;}
    const stationAll={tons:st.tons+at.tons,trucks:st.trucks+at.trucks};
    let box=root.querySelector('#pivotTotalsV18');if(!box){box=document.createElement('div');box.id='pivotTotalsV18';box.className='source-import-summary';root.prepend(box);}const html=`<div><span>مجموع وارد المكب</span><strong>${text(lt)}</strong></div><div><span>مجموع المحطات</span><strong>${text(stationAll)}</strong></div><div><span>مجموع عبد العزيز</span><strong>${text(at)}</strong></div>`;if(box.innerHTML!==html)box.innerHTML=html;
    const summaries=[...root.querySelectorAll('.source-import-summary')].filter(x=>x.id!=='pivotTotalsV18'&&!x.closest('#specialCategoriesV16'));const core=summaries.find(x=>x.querySelectorAll(':scope > div').length>=5);const cards=core?.querySelectorAll(':scope > div');if(cards?.[2]){const s=cards[2].querySelector('strong');if(s)s.textContent=text(stationAll);}if(cards?.[3]){const s=cards[3].querySelector('strong');if(s)s.textContent=text(at);}
    applyLeachate(root);
  }
  function schedule(){state.timers.forEach(clearTimeout);state.timers=[250,700,1400,2600,4500,7000,10000,12100].map(ms=>setTimeout(apply,ms));}
  async function intercept(e){if(state.bypass){state.bypass=false;schedule();return;}if(state.busy)return;e.preventDefault();e.stopImmediatePropagation();state.busy=true;try{const tasks=[];const lf=$('sourceFile_landfill'),sf=$('sourceFile_stations'),af=$('sourceFile_aziz');if(lf?.files?.[0])tasks.push(normalizeLandfill(lf));if(sf?.files?.[0])tasks.push(normalizeStations(sf));if(af?.files?.[0])tasks.push(normalizeAziz(af));await Promise.all(tasks);}catch(err){console.error(err);const m=$('sourceFilesMessage');if(m)m.textContent=`تعذر تجهيز Pivot: ${err.message||err}`;}finally{state.busy=false;state.bypass=true;$('analyzeSourceFilesBtn')?.click();}}
  function init(){const btn=$('analyzeSourceFilesBtn');if(!btn)return;btn.addEventListener('click',intercept,true);$('clearSourceFilesBtn')?.addEventListener('click',()=>{state.landfill.clear();state.stations.clear();state.aziz.clear();state.timers.forEach(clearTimeout);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();