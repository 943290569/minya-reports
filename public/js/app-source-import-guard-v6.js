/* Source import V6 guard: enforce month from source filenames and never block review on weather. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const toLatin=s=>String(s??'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  let busy=false, weatherTimer=null;

  function monthFromName(name){
    const s=toLatin(name);
    let m=s.match(/شهر\s*[-_ ]*([0-9]{1,2})/i);
    if(!m)m=s.match(/month\s*[-_ ]*([0-9]{1,2})/i);
    if(!m)return null;
    const n=Number(m[1]);return n>=1&&n<=12?n:null;
  }
  function expectedMonth(){
    const ids=['sourceFile_landfill','sourceFile_stations','sourceFile_aziz','sourceFile_cover','sourceFile_diesel'];
    const months=ids.map(id=>monthFromName($(id)?.files?.[0]?.name||'')).filter(Boolean);
    if(!months.length)return null;
    const counts={};for(const m of months)counts[m]=(counts[m]||0)+1;
    return Number(Object.keys(counts).sort((a,b)=>counts[b]-counts[a]||Number(a)-Number(b))[0]);
  }
  function dateMonth(text){const m=clean(text).match(/^\d{4}-(\d{2})-\d{2}$/);return m?Number(m[1]):null;}
  function n(cell){const v=Number(clean(cell?.textContent).replace(/,/g,''));return Number.isFinite(v)?v:0;}
  function fmt(v){return Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});}

  function filterTable(table,month){
    if(!table||!month)return;
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const first=tr.querySelector('td');
      const dm=dateMonth(first?.textContent||'');
      if(dm&&dm!==month)tr.remove();
    });
  }
  function recomputeMain(root){
    const table=root.querySelector('.source-import-table');
    const rows=[...(table?.querySelectorAll('tbody tr')||[])];
    if(!rows.length)return;
    let incoming=0,stations=0,aziz=0,diesel=0;
    for(const tr of rows){const c=tr.querySelectorAll('td');if(c.length<16)continue;incoming+=n(c[10]);stations+=n(c[11])+n(c[13])+n(c[14]);aziz+=n(c[12]);diesel+=n(c[15]);}
    const cards=root.querySelector('.source-import-summary')?.querySelectorAll(':scope > div');
    if(!cards||cards.length<5)return;
    const vals=[String(rows.length),`${fmt(incoming)} طن`,`${fmt(stations)} طن`,`${fmt(aziz)} طن`,`${fmt(diesel)} لتر`];
    vals.forEach((v,i)=>{const s=cards[i]?.querySelector('strong');if(s)s.textContent=v;});
  }
  function applyMonthGuard(){
    if(busy)return;const root=$('sourceFilesPreview'),month=expectedMonth();if(!root||!month)return;busy=true;
    try{
      const tables=root.querySelectorAll('.source-import-table');tables.forEach(t=>filterTable(t,month));
      recomputeMain(root);
      let note=root.querySelector('#monthGuardV6');
      if(!note){note=document.createElement('div');note.id='monthGuardV6';note.className='drive-preview-note';root.prepend(note);}
      note.innerHTML=`<strong>فلتر الشهر:</strong> تم اعتماد الشهر ${month} من أسماء الملفات، وأي تاريخ خارج هذا الشهر تم استبعاده من المعاينة.`;
    }finally{busy=false;}
  }
  function weatherFailSafe(){
    const root=$('sourceFilesPreview');if(!root)return;
    let changed=false;
    root.querySelectorAll('.source-import-table tbody tr').forEach(tr=>{
      const c=tr.querySelectorAll('td');if(c.length<6)return;
      const w=clean(c[1].textContent);
      if(w.includes('جاري')){
        c[1].textContent=w.replace('جاري...','غير متوفر').replace('جاري','غير متوفر');
        c[2].textContent='-';c[4].textContent='-';c[5].textContent='-';changed=true;
      }
    });
    if(changed){
      const msg=$('sourceFilesMessage');if(msg)msg.textContent='تم تجميع الكميات. تعذر تحديث الطقس الآن، لذلك لم يتم تعليق التحليل ويمكن مراجعة البيانات مباشرة.';
      const btn=$('analyzeSourceFilesBtn');if(btn)btn.disabled=false;
    }
  }
  function armWeatherTimer(){clearTimeout(weatherTimer);weatherTimer=setTimeout(weatherFailSafe,5000);}
  function init(){
    const root=$('sourceFilesPreview'),btn=$('analyzeSourceFilesBtn');if(!root||!btn)return;
    btn.addEventListener('click',()=>{armWeatherTimer();setTimeout(applyMonthGuard,0);});
    ['sourceFile_landfill','sourceFile_stations','sourceFile_aziz','sourceFile_cover','sourceFile_diesel'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(applyMonthGuard,0)));
    const obs=new MutationObserver(()=>{if(!busy)setTimeout(applyMonthGuard,0);});obs.observe(root,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
