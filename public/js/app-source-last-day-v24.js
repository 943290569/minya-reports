/* V24: preserve original Pivot files and re-apply the last day of the selected month. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const saved={landfill:null,stations:null,aziz:null};
  const timers=[];

  function toLatin(s){return String(s??'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));}
  function monthFromName(name){const s=toLatin(name);let m=s.match(/شهر\s*[-_ ]*([0-9]{1,2})/i);if(!m)m=s.match(/month\s*[-_ ]*([0-9]{1,2})/i);const n=m?Number(m[1]):0;return n>=1&&n<=12?n:0;}
  function iso(v,fallbackYear=0){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=toLatin(clean(v));let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})$/);if(m&&fallbackYear)return `${fallbackYear}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    return'';
  }
  function emptyLand(){return{local:{tons:0,trucks:0},settlements:{tons:0,trucks:0},individuals:{tons:0,trucks:0},companies:{tons:0,trucks:0},other:{tons:0,trucks:0},leachate:{tons:0,trucks:0},tamm:{tons:0,trucks:0},cover:{tons:0,trucks:0}};}
  function emptyStations(){return{yata:{tons:0,trucks:0},tarqumia:{tons:0,trucks:0},hebron:{tons:0,trucks:0}};}
  function bucket(label){const n=norm(label);if(n.includes('عصاره'))return'leachate';if(n.includes('مواد لتغطيه المكب'))return'cover';if(n.includes('طمم'))return'tamm';if(n.includes('هيئات محليه'))return'local';if(n.includes('اسرائيلي')||n.includes('مستوطن'))return'settlements';if(n.includes('افراد')||n.includes('نقديه'))return'individuals';if(n.includes('شركات')||n.includes('مصانع'))return'companies';return'other';}
  function stationKey(label){const n=norm(label);if(n.includes('يطا'))return'yata';if(n.includes('ترقوميا'))return'tarqumia';if(n.includes('الخليل'))return'hebron';return'';}
  function text(x){return `${fmt(x.tons)} طن · ${fmt(x.trucks)} شاحنة`;}
  function totalLand(x){return['local','settlements','individuals','companies','other'].reduce((a,k)=>({tons:a.tons+x[k].tons,trucks:a.trucks+x[k].trucks}),{tons:0,trucks:0});}

  async function pivot(file){
    if(!file)return null;const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellStyles:false,cellNF:false,cellHTML:false});let best=null;
    for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:'',blankrows:false});for(let h=0;h<Math.min(rows.length,25);h++){const a=norm(rows[h]?.[0]),b=norm(rows[h]?.[1]),c=norm(rows[h]?.[2]);if((a.includes('row labels')||a.includes('تسميات'))&&(b.includes('كمي')||b.includes('مجموع'))&&(c.includes('عدد')||c.includes('وحد')||c.includes('مركبات')||c.includes('شاحنات'))){if(!best||rows.length>best.rows.length)best={rows,h};break;}}}
    return best;
  }
  function inferYear(rows,h){for(let r=h+1;r<rows.length;r++){const d=iso(rows[r]?.[0]);if(d)return Number(d.slice(0,4));}return 0;}
  async function parseLand(file){const p=await pivot(file),map=new Map();if(!p)return map;const y=inferYear(p.rows,p.h);let d='';for(let r=p.h+1;r<p.rows.length;r++){const row=p.rows[r]||[],date=iso(row[0],y);if(date){d=date;if(!map.has(d))map.set(d,emptyLand());continue;}if(!d||norm(row[0]).includes('الاجمالي الكلي')||norm(row[0]).includes('grand total'))continue;const label=clean(row[0]);if(!label)continue;const x=map.get(d)[bucket(label)];x.tons+=num(row[1]);x.trucks+=num(row[2]);}return map;}
  async function parseStations(file){const p=await pivot(file),map=new Map();if(!p)return map;const y=inferYear(p.rows,p.h);let d='';for(let r=p.h+1;r<p.rows.length;r++){const row=p.rows[r]||[],date=iso(row[0],y);if(date){d=date;if(!map.has(d))map.set(d,emptyStations());continue;}if(!d||norm(row[0]).includes('الاجمالي الكلي')||norm(row[0]).includes('grand total'))continue;const k=stationKey(row[0]);if(!k)continue;const x=map.get(d)[k];x.tons+=num(row[1]);x.trucks+=num(row[2]);}return map;}
  async function parseAziz(file){const p=await pivot(file),map=new Map();if(!p)return map;const y=inferYear(p.rows,p.h);for(let r=p.h+1;r<p.rows.length;r++){const row=p.rows[r]||[],d=iso(row[0],y);if(!d)continue;map.set(d,{tons:num(row[1]),trucks:Math.max(0,Math.round(num(row[2])))});}return map;}
  function chosenMonth(maps){const byName=[saved.landfill,saved.stations,saved.aziz].map(f=>monthFromName(f?.name||'')).filter(Boolean);if(byName.length){const c={};byName.forEach(m=>c[m]=(c[m]||0)+1);return Number(Object.keys(c).sort((a,b)=>c[b]-c[a])[0]);}const c={};maps.forEach(mp=>mp.forEach((_,d)=>{const m=Number(d.slice(5,7));c[m]=(c[m]||0)+1;}));return Number(Object.keys(c).sort((a,b)=>c[b]-c[a])[0]||0);}
  function lastDate(maps,month){let last='';maps.forEach(mp=>mp.forEach((_,d)=>{if(Number(d.slice(5,7))===month&&d>last)last=d;}));return last;}
  function mainTable(){const root=$('sourceFilesPreview');return root?[...root.querySelectorAll('.source-import-table')].find(t=>t.querySelector('tbody tr td:nth-child(16)'))||null:null;}
  function sumMap(mp,kind){let t={tons:0,trucks:0};if(kind==='land'){for(const x of mp.values()){const v=totalLand(x);t.tons+=v.tons;t.trucks+=v.trucks;}}else if(kind==='stations'){for(const x of mp.values())for(const k of ['yata','tarqumia','hebron']){t.tons+=x[k].tons;t.trucks+=x[k].trucks;}}else for(const x of mp.values()){t.tons+=x.tons;t.trucks+=x.trucks;}return t;}
  async function apply(){
    try{
      if(!saved.landfill&&!saved.stations&&!saved.aziz)return;const [land,stations,aziz]=await Promise.all([parseLand(saved.landfill),parseStations(saved.stations),parseAziz(saved.aziz)]);const month=chosenMonth([land,stations,aziz]);if(!month)return;const last=lastDate([land,stations,aziz],month),table=mainTable();if(!last||!table)return;
      const tr=[...table.querySelectorAll('tbody tr')].find(r=>clean(r.querySelector('td')?.textContent)===last);if(tr){const c=tr.querySelectorAll('td'),l=land.get(last),s=stations.get(last),a=aziz.get(last)||{tons:0,trucks:0};if(l){[[6,l.local],[7,l.settlements],[8,l.individuals],[9,l.companies],[10,totalLand(l)]].forEach(([i,v])=>{if(c[i])c[i].textContent=text(v);});}if(s||aziz.has(last)){const ss=s||emptyStations(),yata={tons:ss.yata.tons+a.tons,trucks:ss.yata.trucks+a.trucks};[[11,yata],[12,a],[13,ss.tarqumia],[14,ss.hebron]].forEach(([i,v])=>{if(c[i])c[i].textContent=text(v);});}}
      const root=$('sourceFilesPreview'),lt=sumMap(land,'land'),st=sumMap(stations,'stations'),at=sumMap(aziz,'aziz'),all={tons:st.tons+at.tons,trucks:st.trucks+at.trucks};const box=root?.querySelector('#pivotTotalsV18'),cards=box?.querySelectorAll(':scope > div');if(cards?.[0])cards[0].querySelector('strong').textContent=text(lt);if(cards?.[1])cards[1].querySelector('strong').textContent=text(all);if(cards?.[2])cards[2].querySelector('strong').textContent=text(at);
    }catch(e){console.error('last day pivot fix',e);}
  }
  function capture(){saved.landfill=$('sourceFile_landfill')?.files?.[0]||saved.landfill;saved.stations=$('sourceFile_stations')?.files?.[0]||saved.stations;saved.aziz=$('sourceFile_aziz')?.files?.[0]||saved.aziz;timers.splice(0).forEach(clearTimeout);[600,1600,3200,6000,10000,13000].forEach(ms=>timers.push(setTimeout(apply,ms)));}
  function init(){const btn=$('analyzeSourceFilesBtn');if(!btn)return;btn.addEventListener('click',capture,true);$('clearSourceFilesBtn')?.addEventListener('click',()=>{saved.landfill=saved.stations=saved.aziz=null;timers.splice(0).forEach(clearTimeout);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();