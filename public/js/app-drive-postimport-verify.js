/* Post-import verification for Drive/Excel daily reports. Read-only: never changes saved data. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[()\-–—]/g,' ').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const same=(a,b,t=0.05)=>Math.abs(num(a)-num(b))<=t;
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  let activeObserver=null;
  let activeTimeout=null;
  let verificationInFlight=false;

  function isoFromCard(card){
    const s=clean(card.querySelector('.drive-report-main strong')?.textContent||'');
    let m=s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    m=s.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m?`${m[1]}-${m[2]}-${m[3]}`:'';
  }
  function numberAfter(label,s){const m=clean(s).match(new RegExp(label+'\\s*([\\d,.]+)','i'));return m?num(m[1]):0;}
  function snapshotCard(card){
    const metrics=[...card.querySelectorAll('.drive-report-details > div')];
    const values={};
    metrics.forEach(x=>{values[norm(x.querySelector('span')?.textContent)]=num(x.querySelector('strong')?.textContent);});
    const operations=[],stations=[];
    const grid=[...card.querySelectorAll('.drive-detail-grid > div')];
    for(const p of grid[1]?.querySelectorAll('p')||[]){
      const s=clean(p.textContent),i=s.indexOf(':');if(i<0)continue;
      const name=clean(s.slice(0,i));
      if(norm(name).includes('محطه ترحيل'))stations.push({name,trucks:numberAfter('عدد الشاحنات',s),quantity:numberAfter('الكمية',s)});
      else operations.push({name,vehicles:numberAfter('عدد المركبات',s),quantity:numberAfter('الكمية',s)});
    }
    return {date:isoFromCard(card),totalWaste:values['النفايات']||0,totalTrucks:values['الشاحنات']||0,totalDiesel:values['السولار']||0,operations,stations};
  }
  function selectedSnapshots(){
    const byDate=new Map();
    for(const cb of document.querySelectorAll('#previewReports [data-import-check]:checked')){
      if(cb.disabled)continue;
      const card=cb.closest('.drive-report-card');if(!card)continue;
      const s=snapshotCard(card);if(s.date)byDate.set(s.date,s);
    }
    return [...byDate.values()];
  }
  function findLoose(rows,key,name){
    const n=norm(name);
    return (rows||[]).find(x=>{const k=norm(x?.[key]);return k===n||k.includes(n)||n.includes(k);})||null;
  }
  function compare(src,data){
    const diffs=[];
    const report=data?.report||{};
    if(!same(src.totalWaste,report.total_waste_tons))diffs.push(`النفايات: المعاينة ${fmt(src.totalWaste)} / المحفوظ ${fmt(report.total_waste_tons)}`);
    if(!same(src.totalTrucks,report.total_trucks))diffs.push(`الشاحنات: المعاينة ${fmt(src.totalTrucks)} / المحفوظ ${fmt(report.total_trucks)}`);
    if(!same(src.totalDiesel,report.total_diesel))diffs.push(`السولار: المعاينة ${fmt(src.totalDiesel)} / المحفوظ ${fmt(report.total_diesel)}`);
    for(const x of src.operations){
      const y=findLoose(data.operations,'operation_name',x.name);
      if(!y){diffs.push(`العملية غير موجودة بعد الحفظ: ${x.name}`);continue;}
      if(!same(x.vehicles,y.vehicle_count))diffs.push(`${x.name} - المركبات: ${fmt(x.vehicles)} / ${fmt(y.vehicle_count)}`);
      if(!same(x.quantity,y.quantity))diffs.push(`${x.name} - الكمية: ${fmt(x.quantity)} / ${fmt(y.quantity)}`);
    }
    for(const x of src.stations){
      const y=findLoose(data.stations,'station_name',x.name);
      if(!y){diffs.push(`المحطة غير موجودة بعد الحفظ: ${x.name}`);continue;}
      if(!same(x.trucks,y.truck_count))diffs.push(`${x.name} - الشاحنات: ${fmt(x.trucks)} / ${fmt(y.truck_count)}`);
      if(!same(x.quantity,y.waste_tons))diffs.push(`${x.name} - الكمية: ${fmt(x.quantity)} / ${fmt(y.waste_tons)}`);
    }
    return diffs;
  }
  async function verify(snapshots){
    if(!snapshots.length)return;
    let listing;
    try{const r=await fetch('/api/reports',{cache:'no-store'});listing=await r.json();if(!r.ok)throw new Error(listing.message||'تعذر قراءة التقارير بعد الحفظ');}
    catch(e){showResult('warning',`تعذر تنفيذ التحقق بعد الحفظ: ${e.message||e}`);return;}
    const ids=new Map((listing.reports||[]).filter(x=>x.report_date&&x.id).map(x=>[String(x.report_date),Number(x.id)]));
    const problems=[];
    for(const src of snapshots){
      const id=ids.get(src.date);if(!id){problems.push(`${src.date}: التقرير غير موجود بعد عملية الحفظ`);continue;}
      try{
        const r=await fetch(`/api/reports/${id}`,{cache:'no-store'}),data=await r.json();if(!r.ok||data.ok===false)throw new Error(data.message||'تعذر قراءة التقرير');
        const diffs=compare(src,data);if(diffs.length)problems.push(`${src.date}: ${diffs.join('؛ ')}`);
      }catch(e){problems.push(`${src.date}: ${e.message||e}`);}
    }
    if(problems.length)showResult('danger',`التحقق بعد الحفظ وجد ${problems.length} تقرير يحتاج مراجعة.`,problems);
    else showResult('ok',`تم التحقق بعد الحفظ: ${snapshots.length} تقرير مطابق للمعاينة.`);
  }
  function showResult(level,message,details=[]){
    const panel=$('previewPanel')||$('importProgress')?.parentElement;if(!panel)return;
    let box=$('postImportVerifyResult');if(!box){box=document.createElement('div');box.id='postImportVerifyResult';panel.appendChild(box);}
    const bg=level==='ok'?'#eef9f1':level==='danger'?'#fff0f0':'#fff8e8';
    const border=level==='ok'?'#c8dfcf':level==='danger'?'#e8bcbc':'#ead59a';
    box.style.cssText=`margin-top:12px;padding:10px 12px;border:1px solid ${border};border-radius:10px;background:${bg};font-size:13px;line-height:1.8`;
    box.innerHTML=`<strong>${clean(message)}</strong>${details.length?`<details style="margin-top:6px"><summary>عرض التفاصيل</summary>${details.slice(0,30).map(x=>`<div>${clean(x)}</div>`).join('')}</details>`:''}`;
    box.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function clearActiveObserver(){
    if(activeObserver)activeObserver.disconnect();
    if(activeTimeout)clearTimeout(activeTimeout);
    activeObserver=null;
    activeTimeout=null;
  }
  function arm(){
    if(activeObserver||verificationInFlight)return;
    const snapshots=selectedSnapshots();if(!snapshots.length)return;
    const progress=$('importProgress');if(!progress)return;
    let done=false;
    const observer=new MutationObserver(()=>{
      const t=clean(progress.textContent);
      if(done||!t.startsWith('اكتملت العملية:'))return;
      done=true;
      clearActiveObserver();
      verificationInFlight=true;
      setTimeout(async()=>{
        try{await verify(snapshots);}
        finally{verificationInFlight=false;}
      },700);
    });
    activeObserver=observer;
    observer.observe(progress,{childList:true,subtree:true,characterData:true});
    activeTimeout=setTimeout(()=>{if(!done)clearActiveObserver();},180000);
  }
  function init(){
    const btn=$('approveImportBtn');if(!btn)return;
    btn.addEventListener('click',arm,true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();