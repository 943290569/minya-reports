/* Persistent workday classification UI: official work vs official holiday/emergency duty. */
(function(){
  const FIXED_HOLIDAYS={
    '01-01':'رأس السنة الميلادية','01-07':'عيد الميلاد المجيد الشرقي','03-08':'يوم المرأة العالمي',
    '04-12':'عيد الفصح المجيد','05-01':'عيد العمال','11-15':'عيد الاستقلال','12-25':'عيد الميلاد المجيد الغربي'
  };
  let workdays=[];let loading=null;let refreshTimer=null;
  const $=id=>document.getElementById(id);

  function islamicHoliday(date){
    try{
      const parts=new Intl.DateTimeFormat('en-u-ca-islamic',{month:'numeric',day:'numeric',timeZone:'Asia/Hebron'}).formatToParts(date);
      const month=Number(parts.find(p=>p.type==='month')?.value||0),day=Number(parts.find(p=>p.type==='day')?.value||0);
      if(month===1&&day===1)return'رأس السنة الهجرية - 1 محرم';
      if(month===3&&day===12)return'ذكرى المولد النبوي الشريف - 12 ربيع الأول';
      if(month===7&&day===27)return'ذكرى الإسراء والمعراج - 27 رجب';
    }catch{}
    return'';
  }
  function automatic(dateText){
    const m=String(dateText||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return{type:'official',reason:'دوام رسمي'};
    const date=new Date(`${dateText}T12:00:00+03:00`);if(date.getDay()===5)return{type:'holiday',reason:'يوم الجمعة - عطلة رسمية / دوام طوارئ'};
    const fixed=FIXED_HOLIDAYS[`${m[2]}-${m[3]}`];if(fixed)return{type:'holiday',reason:`${fixed} - عطلة رسمية / دوام طوارئ`};
    const hijri=islamicHoliday(date);if(hijri)return{type:'holiday',reason:`${hijri} - عطلة رسمية / دوام طوارئ`};
    return{type:'official',reason:'دوام رسمي'};
  }
  async function loadWorkdays(force=false){
    if(workdays.length&&!force)return workdays;if(loading)return loading;
    loading=fetch('/api/workdays',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{workdays=Array.isArray(d?.workdays)?d.workdays:[];return workdays;}).catch(()=>workdays).finally(()=>{loading=null;});
    return loading;
  }
  function rowForDate(date){return workdays.find(x=>String(x.report_date)===String(date));}
  function label(type){return type==='holiday'?'عطلة رسمية - دوام طوارئ':'دوام رسمي';}

  function installStyle(){if($('minyaWorkdayUiStyle'))return;const style=document.createElement('style');style.id='minyaWorkdayUiStyle';style.textContent=`
    .minya-workday-label{position:relative}.minya-workday-reason-text{display:block;margin-top:5px;font-size:11px;color:#667085;line-height:1.35}
    .minya-workday-badge{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;margin-inline-start:7px;white-space:nowrap}
    .minya-workday-badge.holiday{background:#fff3e8;color:#a04408;border:1px solid #f4c79f}.minya-workday-badge.official{background:#eaf7ef;color:#176b3a;border:1px solid #b8ddc7}
    .minya-workday-period{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 16px;padding:10px 12px;background:#f8faf9;border:1px solid #dfe8e3;border-radius:10px}
    .minya-workday-period strong{font-size:inherit}.minya-workday-period span{display:inline-flex;gap:5px;align-items:center}
    @media print{.minya-workday-reason-text{font-size:9px}.minya-workday-period{break-inside:avoid}}
  `;document.head.appendChild(style);}

  function ensureReportField(){
    const grid=$('reportFormSection')?.querySelector('.form-grid');if(!grid)return;
    let select=$('workdayType');
    if(!select){
      const wrap=document.createElement('label');wrap.className='minya-workday-label';wrap.innerHTML='نوع الدوام<select id="workdayType"><option value="official">دوام رسمي</option><option value="holiday">عطلة رسمية - دوام طوارئ</option></select><small id="workdayReason" class="minya-workday-reason-text"></small>';grid.appendChild(wrap);select=$('workdayType');
      select.addEventListener('change',()=>{select.dataset.manual='1';const text=select.value==='holiday'?'محدد يدويًا: عطلة رسمية / دوام طوارئ':'محدد يدويًا: دوام رسمي';if($('workdayReason')?.textContent!==text)$('workdayReason').textContent=text;});
      $('reportDate')?.addEventListener('change',syncReportField);
    }
    syncReportField();
  }
  async function syncReportField(){
    const select=$('workdayType'),date=$('reportDate')?.value;if(!select||!date)return;
    await loadWorkdays();const saved=rowForDate(date),auto=automatic(date),value=saved?.workday_type||auto.type,manual=String(Number(saved?.workday_manual||0)),reason=saved?.workday_reason||auto.reason;
    if(select.value!==value)select.value=value;if(select.dataset.manual!==manual)select.dataset.manual=manual;
    if($('workdayReason')?.textContent!==reason)$('workdayReason').textContent=reason;
  }

  function periodFilter(rows){
    const date=$('archiveDateFilter')?.value||'';if(date)return rows.filter(x=>x.report_date===date);
    const month=$('archiveMonthFilter')?.value||'';if(month)return rows.filter(x=>String(x.report_date).startsWith(month));
    const yearEl=document.querySelector('#annualYear,[id*="annualYear"],[id*="YearFilter"],[id*="yearFilter"]');const year=String(yearEl?.value||'').trim();
    if(/^\d{4}$/.test(year))return rows.filter(x=>String(x.report_date).startsWith(`${year}-`));
    return rows;
  }
  async function renderPeriodSummary(){
    const summary=document.querySelector('.archive-summary,.monthly-summary');if(!summary)return;
    await loadWorkdays();const rows=periodFilter(workdays);const holiday=rows.filter(x=>x.workday_type==='holiday').length,official=rows.length-holiday;
    let box=$('workdayPeriodSummary');if(!box){box=document.createElement('div');box.id='workdayPeriodSummary';box.className='minya-workday-period';summary.insertAdjacentElement('afterend',box);}
    const html=`<span>أيام الدوام الرسمي: <strong>${official}</strong></span><span>العطل الرسمية / دوام الطوارئ: <strong>${holiday}</strong></span>`;
    if(box.innerHTML!==html)box.innerHTML=html;
  }

  function decorateDates(){
    if(!workdays.length)return;const map=new Map(workdays.map(x=>[String(x.report_date),x]));
    const roots=[document.getElementById('archiveSection'),document.getElementById('monthlyReportSection'),document.querySelector('[data-page="annual"]')].filter(Boolean);
    for(const root of roots){
      root.querySelectorAll('td,small,strong,p,span').forEach(el=>{
        if(el.querySelector?.('.minya-workday-badge'))return;const text=String(el.textContent||'').trim();const m=text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);if(!m)return;const row=map.get(m[1]);if(!row)return;
        const badge=document.createElement('span');badge.className=`minya-workday-badge ${row.workday_type}`;badge.textContent=label(row.workday_type);el.appendChild(badge);
      });
    }
  }

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:(input?.url||''),method=String(init?.method||(input?.method)||'GET').toUpperCase();
    if((method==='POST'&&/\/api\/reports(?:\?|$)/.test(url))||(method==='PUT'&&/\/api\/reports\/\d+/.test(url))){
      try{
        const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined)),type=headers.get('content-type')||'';
        if(type.includes('application/json')&&typeof init.body==='string'){
          const body=JSON.parse(init.body),date=String(body.report_date||'');let manualType='',reason='';
          const formSelect=$('workdayType');if(formSelect&&$('reportDate')?.value===date&&formSelect.dataset.manual==='1'){manualType=formSelect.value;reason=$('workdayReason')?.textContent||'';}
          if(!manualType){const sourceSelect=document.querySelector(`.minya-workday-select[data-workday-date="${CSS.escape(date)}"][data-workday-manual="1"]`);if(sourceSelect){manualType=sourceSelect.value;reason=sourceSelect.closest('td')?.querySelector('.minya-workday-reason')?.textContent||'';}}
          if(manualType==='official'||manualType==='holiday'){body.workday_type=manualType;body.workday_reason=reason;init={...init,body:JSON.stringify(body)};}
        }
      }catch{}
    }
    const response=await nativeFetch(input,init);
    if(((method==='POST'||method==='PUT')&&/\/api\/reports/.test(url))&&response.ok){setTimeout(async()=>{await loadWorkdays(true);syncReportField();renderPeriodSummary();decorateDates();},150);}
    return response;
  };

  function bindFilters(){['archiveDateFilter','archiveMonthFilter','annualYear'].forEach(id=>$(id)?.addEventListener('change',()=>{renderPeriodSummary();setTimeout(decorateDates,50);}));}
  function scheduleRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{ensureReportField();renderPeriodSummary();decorateDates();},120);}
  async function init(){installStyle();ensureReportField();bindFilters();await loadWorkdays();renderPeriodSummary();decorateDates();
    const observer=new MutationObserver(scheduleRefresh);observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
