/* Source preview -> daily reports approval with per-duplicate replace/skip choices. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  function pair(v){
    const s=clean(v),tm=s.match(/([\d,.]+)\s*طن/),cm=s.match(/([\d,.]+)\s*شاحنه|([\d,.]+)\s*شاحنة/);
    return{tons:tm?num(tm[1]):num(s),trucks:cm?num(cm[1]||cm[2]):0};
  }
  function iso(v){const s=clean(v);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:'';}
  function isFriday(d){return new Date(`${d}T12:00:00Z`).getUTCDay()===5;}
  function crewsFor(date,total){
    const names=['عمال المكب','سائقو الآليات','الإدارة','الحراسة','الميزان','الفرز'];
    const counts=isFriday(date)?[2,0,0,1,0,0]:[4,2,1,2,4,5];
    const known=counts.reduce((a,b)=>a+b,0);
    if(total&&total!==known)return[{crew_name:'إجمالي طواقم العمل',crew_count:total,notes:'مستورد من المعاينة'}];
    return names.map((crew_name,i)=>({crew_name,crew_count:counts[i],notes:'مستورد من المعاينة'}));
  }
  function payloadFromRow(tr){
    const c=tr.querySelectorAll('td');if(c.length<16)return null;const report_date=iso(c[0].textContent);if(!report_date)return null;
    const local=pair(c[6].textContent),sett=pair(c[7].textContent),ind=pair(c[8].textContent),comp=pair(c[9].textContent),incoming=pair(c[10].textContent),yata=pair(c[11].textContent),tarq=pair(c[13].textContent),heb=pair(c[14].textContent);
    const sprays=num(c[4].textContent),water=num(c[5].textContent),diesel=num(c[15].textContent),crewTotal=num(c[3].textContent);
    const stations=[['يطا',yata],['ترقوميا',tarq],['الخليل',heb]].filter(([,v])=>v.tons||v.trucks).map(([station_name,v])=>({station_name,truck_count:v.trucks,waste_tons:v.tons,unit:'طن',notes:'مستورد من المعاينة الشهرية'}));
    const ops=[['نفايات هيئات محلية',local],['نفايات مستوطنات',sett],['نفايات أفراد',ind],['نفايات شركات ومصانع',comp]].filter(([,v])=>v.tons||v.trucks).map(([operation_name,v])=>({operation_name,start_time:'',end_time:'',vehicle_count:v.trucks,quantity:v.tons,unit:'طن',notes:'مستورد من المعاينة الشهرية'}));
    if(sprays||water)ops.push({operation_name:'رش المياه',start_time:'',end_time:'',vehicle_count:sprays,quantity:water,unit:'كوب',notes:'مستورد من المعاينة الشهرية'});
    const totalStationTrucks=stations.reduce((s,x)=>s+x.truck_count,0),totalStationTons=stations.reduce((s,x)=>s+x.waste_tons,0);
    return{report_date,weather:clean(c[1].textContent).replace(/\s*·\s*جمعة/g,'').replace('جاري...',''),temperature:num(c[2].textContent),start_time:'04:00',end_time:'19:00',total_trucks:incoming.trucks+totalStationTrucks,total_waste_tons:incoming.tons+totalStationTons,total_diesel:diesel,notes:'تم إنشاؤه من معاينة ملفات المصدر الشهرية.',crews:crewsFor(report_date,crewTotal),operations:ops,stations,equipment:[]};
  }
  function getRows(){const root=$('sourceFilesPreview');const table=[...(root?.querySelectorAll('.source-import-table')||[])].find(t=>t.querySelector('tbody tr td:nth-child(16)'));return table?[...table.querySelectorAll('tbody tr')].map(payloadFromRow).filter(Boolean):[];}
  async function existing(){const r=await fetch('/api/reports',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.message||'تعذر قراءة التقارير الموجودة');const rows=Array.isArray(d.reports)?d.reports:[];return new Map(rows.filter(x=>x.report_date&&x.id).map(x=>[String(x.report_date),Number(x.id)]));}
  function ensureUi(){
    const panel=$('sourceFilesPanel');if(!panel||$('sourceApproveBar'))return;
    const bar=document.createElement('div');bar.id='sourceApproveBar';bar.className='drive-approval-bar';bar.style.marginTop='14px';bar.innerHTML='<button id="cancelSourceApprovalBtn" type="button" class="drive-cancel">إلغاء الاعتماد</button><button id="approveSourceDailyBtn" type="button" class="drive-primary">اعتماد كتقارير يومية</button><div id="sourceApproveProgress" class="drive-progress hidden" style="width:100%"></div>';
    panel.appendChild(bar);
    $('cancelSourceApprovalBtn').addEventListener('click',()=>{const p=$('sourceDuplicatePanel');if(p)p.remove();const pr=$('sourceApproveProgress');if(pr){pr.classList.add('hidden');pr.textContent='';}});
    $('approveSourceDailyBtn').addEventListener('click',begin);
  }
  function showDuplicates(rows,existingMap){
    document.getElementById('sourceDuplicatePanel')?.remove();
    const dups=rows.filter(x=>existingMap.has(x.report_date));
    if(!dups.length)return false;
    const box=document.createElement('div');box.id='sourceDuplicatePanel';box.className='drive-panel';box.style.marginTop='14px';
    box.innerHTML=`<div class="drive-panel-head"><div><small>تقارير موجودة مسبقًا</small><h3>اختر الإجراء لكل تاريخ</h3></div><span class="drive-readonly">الافتراضي: تجاهل</span></div><div class="drive-preview-note">التقارير الجديدة ستُحفظ تلقائيًا. لكل تاريخ موجود اختر استبدال أو تجاهل. التجاهل لا يوقف بقية التقارير.</div><div class="source-import-table-wrap"><table class="v3-table source-import-table"><thead><tr><th>التاريخ</th><th>الإجراء</th></tr></thead><tbody>${dups.map(x=>`<tr><td>${esc(x.report_date)}</td><td><select data-source-conflict="${esc(x.report_date)}"><option value="skip" selected>تجاهل الموجود والمتابعة</option><option value="replace">استبدال التقرير الموجود</option></select></td></tr>`).join('')}</tbody></table></div><div class="drive-approval-bar"><button id="cancelDuplicateImport" class="drive-cancel" type="button">إلغاء العملية</button><button id="continueDuplicateImport" class="drive-primary" type="button">متابعة الاعتماد</button></div>`;
    $('sourceApproveBar').before(box);
    $('cancelDuplicateImport').addEventListener('click',()=>box.remove());
    $('continueDuplicateImport').addEventListener('click',()=>run(rows,existingMap));
    return true;
  }
  async function begin(){
    const rows=getRows();if(!rows.length){alert('لا توجد بيانات يومية جاهزة للاعتماد. نفّذ المعاينة أولًا.');return;}
    const btn=$('approveSourceDailyBtn');btn.disabled=true;try{const ex=await existing();if(!showDuplicates(rows,ex))await run(rows,ex);}catch(e){alert(e.message||e);}finally{btn.disabled=false;}
  }
  async function run(rows,existingMap){
    const actions=new Map([...document.querySelectorAll('[data-source-conflict]')].map(s=>[s.dataset.sourceConflict,s.value]));
    document.getElementById('sourceDuplicatePanel')?.remove();
    const progress=$('sourceApproveProgress');progress.classList.remove('hidden');
    let created=0,replaced=0,skipped=0,failed=0;const errors=[];
    for(let i=0;i<rows.length;i++){
      const p=rows[i],id=existingMap.get(p.report_date),action=id?(actions.get(p.report_date)||'skip'):'create';
      progress.textContent=`جاري الاعتماد ${i+1} من ${rows.length} — ${p.report_date}`;
      if(action==='skip'){skipped++;continue;}
      try{
        const r=await fetch(id?`/api/reports/${id}`:'/api/reports',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});const d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.message||`خطأ ${r.status}`);if(id)replaced++;else created++;
      }catch(e){failed++;errors.push(`${p.report_date}: ${e.message||e}`);}
    }
    progress.textContent=`تم الاعتماد: ${created} جديد · ${replaced} مستبدل · ${skipped} متجاهل · ${failed} فشل${errors.length?` | ${errors.slice(0,3).join('، ')}`:''}`;
    await new Promise(r=>setTimeout(r,200));
    if(failed===0)alert(`اكتملت العملية بنجاح\nجديد: ${created}\nمستبدل: ${replaced}\nمتجاهل: ${skipped}`);else alert(`اكتملت العملية مع أخطاء\nجديد: ${created}\nمستبدل: ${replaced}\nمتجاهل: ${skipped}\nفشل: ${failed}\n${errors.slice(0,5).join('\n')}`);
  }
  function watch(){ensureUi();const root=$('sourceFilesPreview');if(!root)return;new MutationObserver(()=>{const has=Boolean(root.querySelector('.source-import-table tbody tr'));const bar=$('sourceApproveBar');if(bar)bar.style.display=has?'flex':'none';}).observe(root,{childList:true,subtree:true});const bar=$('sourceApproveBar');if(bar)bar.style.display=root.querySelector('.source-import-table tbody tr')?'flex':'none';}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();
