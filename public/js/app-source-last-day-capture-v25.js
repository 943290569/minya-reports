/* V28: align Pivot dates to the month in the original filename, apply all daily values, and rebuild correct monthly totals. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const text=x=>`${fmt(x.tons)} طن · ${fmt(x.trucks)} شاحنة`;
  const toLatin=s=>String(s??'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const saved={landfill:null,stations:null,aziz:null};
  const timers=[];

  function monthFromName(name){const s=toLatin(name);let m=s.match(/شهر\s*[-_ ]*([0-9]{1,2})/i);if(!m)m=s.match(/month\s*[-_ ]*([0-9]{1,2})/i);const n=m?Number(m[1]):0;return n>=1&&n<=12?n:0;}
  function iso(v,fallbackYear=0){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=toLatin(clean(v));let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})$/);if(m&&fallbackYear)return `${fallbackYear}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    return'';
  }
  function addDay(d,n=1){const x=new Date(`${d}T12:00:00Z`);x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);}
  function emptyLand(){return{local:{tons:0,trucks:0},settlements:{tons:0,trucks:0},individuals:{tons:0,trucks:0},companies:{tons:0,trucks:0},other:{tons:0,trucks:0},leachate:{tons:0,trucks:0},tamm:{tons:0,trucks:0},cover:{tons:0,trucks:0}};}
  function emptyStations(){return{yata:{tons:0,trucks:0},tarqumia:{tons:0,trucks:0},hebron:{tons:0,trucks:0}};}
  function stationKey(v){const n=norm(v);if(n.includes('يطا'))return'yata';if(n.includes('ترقوميا'))return'tarqumia';if(n.includes('الخليل'))return'hebron';return'';}
  function bucket(v){const n=norm(v);if(n.includes('عصاره'))return'leachate';if(n.includes('مواد لتغطيه المكب'))return'cover';if(n.includes('طمم'))return'tamm';if(n.includes('هيئات محليه'))return'local';if(n.includes('اسرائيلي')||n.includes('مستوطن'))return'settlements';if(n.includes('افراد')||n.includes('نقديه'))return'individuals';if(n.includes('شركات')||n.includes('مصانع'))return'companies';return'other';}

  async function pivot(file){if(!file)return null;const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});let best=null;for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:'',blankrows:false});for(let h=0;h<Math.min(25,rows.length);h++){const a=norm(rows[h]?.[0]),b=norm(rows[h]?.[1]),c=norm(rows[h]?.[2]);if((a.includes('row labels')||a.includes('تسميات'))&&(b.includes('كمي')||b.includes('مجموع'))&&(c.includes('عدد')||c.includes('وحد')||c.includes('مركبات')||c.includes('شاحنات'))){if(!best||rows.length>best.rows.length)best={rows,h};break;}}}return best;}

  async function parseLand(file,year){const p=await pivot(file),map=new Map();if(!p)return map;let d='';for(let r=p.h+1;r<p.rows.length;r++){const row=p.rows[r]||[],date=iso(row[0],year);if(date){d=date;if(!map.has(d))map.set(d,emptyLand());continue;}if(!d)continue;const label=clean(row[0]);if(!label||norm(label).includes('الاجمالي')||norm(label).includes('grand total'))continue;const x=map.get(d)[bucket(label)];x.tons+=num(row[1]);x.trucks+=num(row[2]);}return map;}
  async function parseStations(file,year){const p=await pivot(file),map=new Map();if(!p)return map;let d='';for(let r=p.h+1;r<p.rows.length;r++){const row=p.rows[r]||[],date=iso(row[0],year);if(date){d=date;if(!map.has(d))map.set(d,emptyStations());continue;}if(!d)continue;const k=stationKey(row[0]);if(!k)continue;const x=map.get(d)[k];x.tons+=num(row[1]);x.trucks+=num(row[2]);}return map;}
  async function parseAziz(file,year){const p=await pivot(file),map=new Map();if(!p)return map;for(let r=p.h+1;r<p.rows.length;r++){const row=p.rows[r]||[],d=iso(row[0],year);if(d)map.set(d,{tons:num(row[1]),trucks:Math.round(num(row[2]))});}return map;}

  function alignMap(mp,year,month){if(!mp.size||!month)return mp;const first=[...mp.keys()].sort()[0],monthStart=`${year}-${String(month).padStart(2,'0')}-01`,previous=addDay(monthStart,-1);let out=mp;if(first===previous){out=new Map();for(const [d,v] of mp)out.set(addDay(d,1),v);}const filtered=new Map();for(const [d,v] of out)if(Number(d.slice(0,4))===year&&Number(d.slice(5,7))===month)filtered.set(d,v);return filtered;}
  function totalLand(x){return['local','settlements','individuals','companies','other'].reduce((a,k)=>({tons:a.tons+x[k].tons,trucks:a.trucks+x[k].trucks}),{tons:0,trucks:0});}
  function sumLand(mp){let t={tons:0,trucks:0};for(const x of mp.values()){const v=totalLand(x);t.tons+=v.tons;t.trucks+=v.trucks;}return t;}
  function sumStations(mp){let t={tons:0,trucks:0};for(const x of mp.values())for(const k of ['yata','tarqumia','hebron']){t.tons+=x[k].tons;t.trucks+=x[k].trucks;}return t;}
  function sumAziz(mp){let t={tons:0,trucks:0};for(const x of mp.values()){t.tons+=x.tons;t.trucks+=x.trucks;}return t;}

  function setCardByLabel(root,label,value){for(const box of root.querySelectorAll('.source-import-summary'))for(const card of box.querySelectorAll(':scope > div')){const span=clean(card.querySelector('span')?.textContent);if(span.includes(label)){const strong=card.querySelector('strong');if(strong)strong.textContent=value;}}}

  async function apply(){const root=$('sourceFilesPreview');const table=[...(root?.querySelectorAll('.source-import-table')||[])].find(t=>t.querySelector('tbody tr td:nth-child(16)'));if(!table)return;const rows=[...table.querySelectorAll('tbody tr')],firstDate=clean(rows[0]?.querySelector('td')?.textContent);if(!/^\d{4}-\d{2}-\d{2}$/.test(firstDate))return;const year=Number(firstDate.slice(0,4));const fileMonths=[monthFromName(saved.landfill?.name),monthFromName(saved.stations?.name),monthFromName(saved.aziz?.name)].filter(Boolean);const month=fileMonths[0]||Number(firstDate.slice(5,7));let [lmap,smap,amap]=await Promise.all([parseLand(saved.landfill,year),parseStations(saved.stations,year),parseAziz(saved.aziz,year)]);lmap=alignMap(lmap,year,month);smap=alignMap(smap,year,month);amap=alignMap(amap,year,month);
    rows.forEach(tr=>{const c=tr.querySelectorAll('td');if(c.length<15)return;const d=clean(c[0]?.textContent),l=lmap.get(d),s=smap.get(d),a=amap.get(d)||{tons:0,trucks:0};if(l){[[6,l.local],[7,l.settlements],[8,l.individuals],[9,l.companies],[10,totalLand(l)]].forEach(([i,v])=>{if(c[i])c[i].textContent=text(v);});}if(s||amap.has(d)){const ss=s||emptyStations(),yata={tons:ss.yata.tons+a.tons,trucks:ss.yata.trucks+a.trucks};[[11,yata],[12,a],[13,ss.tarqumia],[14,ss.hebron]].forEach(([i,v])=>{if(c[i])c[i].textContent=text(v);});}});
    const lt=sumLand(lmap),st=sumStations(smap),at=sumAziz(amap),all={tons:st.tons+at.tons,trucks:st.trucks+at.trucks};setCardByLabel(root,'مجموع وارد المكب',text(lt));setCardByLabel(root,'نفايات واردة للمكب',text(lt));setCardByLabel(root,'مجموع المحطات',text(all));setCardByLabel(root,'نفايات المحطات',text(all));setCardByLabel(root,'مجموع عبد العزيز',text(at));setCardByLabel(root,'عزيز المضاف إلى يطا',text(at));
  }
  function schedule(){timers.splice(0).forEach(clearTimeout);[400,1000,2200,4000,6500,9500,12500].forEach(ms=>timers.push(setTimeout(()=>apply().catch(console.error),ms)));}
  function keep(id,key){const el=$(id);if(!el)return;el.addEventListener('change',()=>{const f=el.files?.[0];if(f&&!f.name.includes('normalized'))saved[key]=f;});}
  function init(){keep('sourceFile_landfill','landfill');keep('sourceFile_stations','stations');keep('sourceFile_aziz','aziz');$('analyzeSourceFilesBtn')?.addEventListener('click',schedule);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();