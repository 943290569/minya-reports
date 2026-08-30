/* Drive import quality/confidence assistant. Works on preview DOM without changing import safety rules. */
(function(){
  const $=id=>document.getElementById(id);
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const text=v=>String(v??'').trim();
  const norm=v=>text(v).replace(/\s+/g,' ').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[()\-–—]/g,' ').trim();
  const sameNum=(a,b)=>Math.abs(num(a)-num(b))<=0.05;
  let reportsByDate=new Map();
  let scanToken=0;

  function isoFromDisplay(v){const m=text(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';}
  function getNumberAfter(label,s){const m=text(s).match(new RegExp(label+'\\s*([\\d,.]+)','i'));return m?num(m[1]):0;}
  function keyMap(rows,nameKey){const out=new Map();for(const r of rows||[]){const k=norm(r?.[nameKey]);if(k)out.set(k,r);}return out;}
  function findByLooseName(map,name){const n=norm(name);if(map.has(n))return map.get(n);for(const [k,v] of map){if(k.includes(n)||n.includes(k))return v;}return null;}

  function parseCard(card){
    const date=isoFromDisplay(card.querySelector('.drive-report-main strong')?.textContent||'');
    const detailEls=[...card.querySelectorAll('.drive-report-details > div')];
    const values={};
    detailEls.forEach(el=>{const k=norm(el.querySelector('span')?.textContent);const v=num(el.querySelector('strong')?.textContent);values[k]=v;});
    const grid=[...card.querySelectorAll('.drive-detail-grid > div')];
    const crews=[]; for(const p of grid[0]?.querySelectorAll('p')||[]){const s=text(p.textContent),i=s.lastIndexOf(':');if(i>0)crews.push({name:s.slice(0,i),count:num(s.slice(i+1))});}
    const operations=[],stations=[];
    for(const p of grid[1]?.querySelectorAll('p')||[]){const s=text(p.textContent),i=s.indexOf(':');if(i<0)continue;const name=s.slice(0,i);if(norm(name).includes('محطه ترحيل'))stations.push({name,trucks:getNumberAfter('عدد الشاحنات',s),quantity:getNumberAfter('الكمية',s)});else operations.push({name,vehicles:getNumberAfter('عدد المركبات',s),quantity:getNumberAfter('الكمية',s)});}
    const equipment=[];for(const p of grid[2]?.querySelectorAll('p')||[]){const s=text(p.textContent),i=s.indexOf(':');if(i<0)continue;const rest=s.slice(i+1),parts=rest.split('·');equipment.push({name:s.slice(0,i),status:text(parts[0]),diesel:num(parts[1])});}
    return {date,totalWaste:values['النفايات']||0,totalTrucks:values['الشاحنات']||0,totalDiesel:values['السولار']||0,equipmentCount:values['المعدات']||equipment.length,crews,operations,stations,equipment};
  }

  function readingScore(src,card){
    let score=0;
    if(src.date)score+=15;
    if(src.operations.length>=1)score+=25;
    if(src.stations.length>=3)score+=10; else if(src.stations.length)score+=5;
    if(src.equipment.length>=10)score+=20; else if(src.equipment.length)score+=10;
    if(src.crews.length>=3)score+=10; else if(src.crews.length)score+=5;
    if(src.totalWaste>0)score+=10;
    if(src.totalTrucks>0)score+=5;
    if(Number.isFinite(src.totalDiesel))score+=5;
    if(card.querySelector('.drive-status.invalid'))score=Math.min(score,69);
    return Math.min(100,score);
  }

  function compareExisting(src,data){
    const diffs=[],critical=[];let checks=0;
    function check(label,a,b,isCritical=false){checks++;if(!sameNum(a,b)){diffs.push(`${label}: المصدر ${fmt(a)} / الموقع ${fmt(b)}`);if(isCritical)critical.push(label);}}
    check('إجمالي النفايات',src.totalWaste,data.report?.total_waste_tons,true);
    check('إجمالي الشاحنات',src.totalTrucks,data.report?.total_trucks,true);
    check('إجمالي السولار',src.totalDiesel,data.report?.total_diesel,false);
    const ops=keyMap(data.operations,'operation_name');
    for(const x of src.operations){const old=findByLooseName(ops,x.name);checks+=2;if(!old){diffs.push(`عملية غير موجودة: ${x.name}`);critical.push(x.name);continue;}if(!sameNum(x.vehicles,old.vehicle_count)){diffs.push(`${x.name} - المركبات: المصدر ${fmt(x.vehicles)} / الموقع ${fmt(old.vehicle_count)}`);if(norm(x.name).includes('مكب نفايات المنيا'))critical.push(`${x.name} - المركبات`);}if(!sameNum(x.quantity,old.quantity)){diffs.push(`${x.name} - الكمية: المصدر ${fmt(x.quantity)} / الموقع ${fmt(old.quantity)}`);if(norm(x.name).includes('مكب نفايات المنيا'))critical.push(`${x.name} - الكمية`);}}
    const sts=keyMap(data.stations,'station_name');
    for(const x of src.stations){const old=findByLooseName(sts,x.name);checks+=2;if(!old){diffs.push(`محطة غير موجودة: ${x.name}`);critical.push(x.name);continue;}if(!sameNum(x.trucks,old.truck_count)){diffs.push(`${x.name} - الشاحنات: المصدر ${fmt(x.trucks)} / الموقع ${fmt(old.truck_count)}`);critical.push(`${x.name} - الشاحنات`);}if(!sameNum(x.quantity,old.waste_tons)){diffs.push(`${x.name} - الكمية: المصدر ${fmt(x.quantity)} / الموقع ${fmt(old.waste_tons)}`);critical.push(`${x.name} - الكمية`);}}
    const crews=keyMap(data.crews,'crew_name');
    for(const x of src.crews){const old=findByLooseName(crews,x.name);checks++;if(!old||!sameNum(x.count,old.crew_count))diffs.push(`${x.name} - العمال: المصدر ${fmt(x.count)} / الموقع ${fmt(old?.crew_count||0)}`);}
    const eq=keyMap(data.equipment,'equipment_name');
    for(const x of src.equipment){const old=findByLooseName(eq,x.name);checks++;if(!old||!sameNum(x.diesel,old.diesel_liters))diffs.push(`${x.name} - السولار: المصدر ${fmt(x.diesel)} / الموقع ${fmt(old?.diesel_liters||0)}`);}
    const match=checks?Math.max(0,Math.round(((checks-diffs.length)/checks)*100)):0;
    return {match,diffs,critical};
  }

  async function fullReport(date){
    const r=reportsByDate.get(date);if(!r?.id)return null;
    try{const res=await fetch(`/api/reports/${r.id}`,{cache:'no-store'});const d=await res.json();return res.ok&&d.ok?d:null;}catch{return null;}
  }

  function ensureControls(){
    const preview=$('previewPanel'),list=$('previewReports');if(!preview||!list||$('driveBulkQualityControls'))return;
    const box=document.createElement('div');box.id='driveBulkQualityControls';box.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0;padding:10px;border:1px solid #d9e7df;border-radius:10px;background:#f8fcf9';
    box.innerHTML='<button type="button" id="driveSelectAll" class="drive-secondary">تحديد الكل</button><button type="button" id="driveClearAll" class="drive-secondary">إلغاء تحديد الكل</button><button type="button" id="driveSelectSafe" class="drive-primary">تحديد الآمن تلقائيًا</button><span id="driveManualReviewCount" style="font-weight:700">المراجعة اليدوية: -</span>';
    list.parentNode.insertBefore(box,list);
    const apply=(mode)=>{for(const cb of list.querySelectorAll('[data-import-check]')){if(cb.disabled)continue;const card=cb.closest('.drive-report-card');const safe=Number(card?.dataset.readingScore||0)>=90;if(mode==='all')cb.checked=true;else if(mode==='none')cb.checked=false;else cb.checked=safe;cb.dispatchEvent(new Event('change',{bubbles:true}));}};
    $('driveSelectAll').onclick=()=>apply('all');$('driveClearAll').onclick=()=>apply('none');$('driveSelectSafe').onclick=()=>apply('safe');
  }

  function metricHtml(read,cmp){
    const review=read<90||(cmp&&cmp.critical.length>0&&cmp.match<95);
    const chips=[`<span style="font-weight:800">جودة القراءة ${read}%</span>`];
    if(cmp)chips.push(`<span>التطابق ${cmp.match}%</span><span>الاختلافات ${cmp.diffs.length}</span><span>حرجة ${cmp.critical.length}</span>`);
    chips.push(`<span style="font-weight:800">${review?'⚠ مراجعة':'✓ آمن'}</span>`);
    return `<div class="drive-auto-metrics" style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;font-size:12px">${chips.map(x=>`<span style="padding:4px 7px;border:1px solid #d8e4dc;border-radius:999px;background:#fff">${x}</span>`).join('')}</div>${cmp?.diffs.length?`<details style="margin-top:6px"><summary>عرض الاختلافات (${cmp.diffs.length})</summary><div style="font-size:12px;line-height:1.8">${cmp.diffs.slice(0,30).map(x=>`<div>• ${x}</div>`).join('')}</div></details>`:''}`;
  }

  async function scan(){
    const token=++scanToken;ensureControls();
    try{const r=await fetch('/api/reports',{cache:'no-store'});const d=await r.json();reportsByDate=new Map((d.reports||[]).map(x=>[String(x.report_date||''),x]));}catch{}
    const cards=[...document.querySelectorAll('#previewReports .drive-report-card')];let manual=0;
    for(const card of cards){if(token!==scanToken)return;const old=card.querySelector('.drive-auto-metrics-wrap');if(old)old.remove();const src=parseCard(card),read=readingScore(src,card);card.dataset.readingScore=String(read);let cmp=null;if(reportsByDate.has(src.date)){const data=await fullReport(src.date);if(data)cmp=compareExisting(src,data);}const needs=read<90||(cmp&&cmp.critical.length>0&&cmp.match<95);if(needs)manual++;const wrap=document.createElement('div');wrap.className='drive-auto-metrics-wrap';wrap.innerHTML=metricHtml(read,cmp);card.querySelector('.drive-report-main')?.appendChild(wrap);}
    const counter=$('driveManualReviewCount');if(counter)counter.textContent=`المراجعة اليدوية: ${manual} من ${cards.length}`;
  }

  function watch(){const root=$('previewReports');if(!root)return;let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(scan,180);}).observe(root,{childList:true,subtree:true});}
  document.addEventListener('DOMContentLoaded',()=>{ensureControls();watch();});
})();
