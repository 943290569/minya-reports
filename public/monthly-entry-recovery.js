(()=>{
  const $=s=>document.querySelector(s);
  const norm=v=>String(v||'').replace(/[\s()ـ_\-]+/g,'').replace(/[أإآ]/g,'ا').toLowerCase();
  const monthKey=()=>`${$('#yearSelect')?.value||''}-${String($('#monthSelect')?.value||'').padStart(2,'0')}`;
  const setStatus=(text,error=false)=>{const el=$('#status');if(!el)return;el.textContent=text;el.style.color=error?'#a32121':'#176b4f';};
  async function api(url){const r=await fetch(url,{cache:'no-store',credentials:'same-origin'});if(r.status===401){location.href='/login.html';throw new Error('يجب تسجيل الدخول');}const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||`خطأ ${r.status}`);return d;}
  function findOperation(list,kind){return (list||[]).find(x=>{const n=norm(x.operation_name);if(kind==='landfill')return n.includes('مكب')&&n.includes('المنيا');if(kind==='leachate')return n.includes('عصار');if(kind==='external')return n.includes('طمم')&&n.includes('خارجي');if(kind==='internal')return n.includes('طمم')&&!n.includes('خارجي');if(kind==='slope')return n.includes('اسلوب')||n.includes('سلوب');if(kind==='sorting')return n.includes('فرز');if(kind==='water')return n.includes('مياه')&&(n.includes('تعقيم')||n.includes('ترطيب'));if(kind==='spray')return n.includes('رش')&&n.includes('مياه');return false;})||{};}
  function findStation(list,name){return (list||[]).find(x=>norm(x.station_name).includes(norm(name)))||{};}
  function setInput(tr,selector,value){const el=tr?.querySelector(selector);if(!el)return;el.value=value??0;el.dispatchEvent(new Event('input',{bubbles:true}));}
  function rowForDate(date){const day=Number(String(date).slice(8,10));return document.querySelector(`tr[data-i="${day-1}"]`);}
  function applyReport(full){const r=full.report||{},tr=rowForDate(r.report_date);if(!tr)return;
    const badge=tr.querySelector('.me-badge');if(badge){badge.textContent='موجود';badge.classList.remove('new');badge.classList.add('exists');}
    setInput(tr,'[data-core="weather"]',r.weather||'');setInput(tr,'[data-core="temperature"]',Number(r.temperature||0));
    const ops=full.operations||[],sts=full.stations||[];
    const landfill=findOperation(ops,'landfill'),leachate=findOperation(ops,'leachate'),external=findOperation(ops,'external'),internal=findOperation(ops,'internal'),slope=findOperation(ops,'slope'),sorting=findOperation(ops,'sorting'),water=findOperation(ops,'water'),spray=findOperation(ops,'spray');
    const tq=findStation(sts,'ترقوميا'),yt=findStation(sts,'يطا'),hb=findStation(sts,'الخليل');
    const pairs=[
      ['op','مكب نفايات المنيا','vehicle_count',landfill.vehicle_count],['op','مكب نفايات المنيا','quantity',landfill.quantity],
      ['st','محطة ترحيل ترقوميا','truck_count',tq.truck_count],['st','محطة ترحيل ترقوميا','waste_tons',tq.waste_tons],
      ['st','محطة ترحيل يطا','truck_count',yt.truck_count],['st','محطة ترحيل يطا','waste_tons',yt.waste_tons],
      ['st','محطة ترحيل الخليل','truck_count',hb.truck_count],['st','محطة ترحيل الخليل','waste_tons',hb.waste_tons],
      ['op','كميات العصارة المرحلة','vehicle_count',leachate.vehicle_count],['op','كميات العصارة المرحلة','quantity',leachate.quantity],
      ['op','طمم خارجي','vehicle_count',external.vehicle_count],['op','طمم خارجي','quantity',external.quantity],
      ['op','مواد التغطية (طمم)','vehicle_count',internal.vehicle_count],['op','مواد التغطية (طمم)','quantity',internal.quantity],
      ['op','مواد التغطية (اسلوب)','vehicle_count',slope.vehicle_count],['op','مواد التغطية (اسلوب)','quantity',slope.quantity],
      ['op','خط الفرز','vehicle_count',sorting.vehicle_count],['op','خط الفرز','quantity',sorting.quantity],
      ['op','كميات المياه للتعقيم والترطيب','quantity',water.quantity],['op','عدد مرات رش المياه','quantity',spray.quantity]
    ];
    for(const [kind,name,field,value] of pairs){setInput(tr,`[data-kind="${kind}"][data-name="${CSS.escape(name)}"][data-field="${field}"]`,Number(value||0));}
    const diesel=(full.equipment||[]).reduce((s,x)=>s+Number(x.diesel_liters||0),0);const strong=tr.querySelector('td:nth-last-child(2) strong');if(strong)strong.textContent=diesel.toLocaleString('en-US');
  }
  function weatherLabel(code){code=Number(code);if(code===0)return'مشمس';if([1,2].includes(code))return'غائم جزئيًا';if(code===3)return'غائم';if([45,48].includes(code))return'ضباب';if([51,53,55,56,57].includes(code))return'رذاذ';if([61,63,65,66,67,80,81,82].includes(code))return'ماطر';if([71,73,75,77,85,86].includes(code))return'ثلجي';if([95,96,99].includes(code))return'عاصف ممطر';return'متغير';}
  async function fillWeather(month,existingDates){const [y,m]=month.split('-').map(Number),days=new Date(y,m,0).getDate(),first=`${month}-01`,last=`${month}-${String(days).padStart(2,'0')}`;let url='';const today=new Date().toISOString().slice(0,10);const monthEnd=new Date(`${last}T12:00:00Z`);const old=monthEnd.getTime()<Date.now()-5*86400000;url=old?`https://archive-api.open-meteo.com/v1/archive?latitude=31.6172667&longitude=35.2321917&start_date=${first}&end_date=${last}&daily=weather_code,temperature_2m_mean&timezone=Asia%2FHebron`:`https://api.open-meteo.com/v1/forecast?latitude=31.6172667&longitude=35.2321917&start_date=${first}&end_date=${last}&daily=weather_code,temperature_2m_mean&timezone=Asia%2FHebron`;
    try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)return 0;const d=await r.json(),daily=d.daily||{};let count=0;(daily.time||[]).forEach((date,i)=>{if(existingDates.has(date))return;const tr=rowForDate(date);if(!tr)return;const t=Number(daily.temperature_2m_mean?.[i]),c=daily.weather_code?.[i];if(Number.isFinite(t)){setInput(tr,'[data-core="temperature"]',Math.round(t*10)/10);count++;}if(c!==undefined&&c!==null)setInput(tr,'[data-core="weather"]',weatherLabel(c));});return count;}catch{return 0;}
  }
  async function recover(){const month=monthKey();if(!/^\d{4}-\d{2}$/.test(month))return;setStatus('جاري تحميل البيانات الفعلية...');try{
      const list=await api('/api/reports');const summaries=(list.reports||[]).filter(r=>String(r.report_date||'').startsWith(month+'-'));const existingDates=new Set(summaries.map(r=>r.report_date));
      if(!document.querySelector('#rowsBody tr')) await new Promise(r=>setTimeout(r,700));
      const details=await Promise.all(summaries.map(r=>api(`/api/reports/${r.id}`)));details.forEach(applyReport);
      const weatherDays=await fillWeather(month,existingDates);
      const summary=$('#summary');if(summary){const first=summary.querySelectorAll('strong');if(first[1])first[1].textContent=String(summaries.length);}
      setStatus(`تم تحميل ${summaries.length} تقرير موجود${weatherDays?` وتحديث الطقس لـ ${weatherDays} يوم جديد`:''}`);
    }catch(e){setStatus(`تعذر تحميل البيانات الفعلية: ${e.message}`,true);}
  }
  function hook(){const btn=$('#loadBtn');if(!btn||btn.dataset.recoveryHooked)return;btn.dataset.recoveryHooked='1';btn.addEventListener('click',()=>setTimeout(recover,350));setTimeout(recover,1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
})();
