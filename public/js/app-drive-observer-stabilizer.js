/* Prevent Drive preview helper observers from reacting to their own nested DOM updates. */
(function(){
  const NativeMutationObserver=window.MutationObserver;
  if(!NativeMutationObserver||window.__MINYA_DRIVE_OBSERVER_STABILIZED__)return;
  window.__MINYA_DRIVE_OBSERVER_STABILIZED__=true;

  const WORKDAY_OVERRIDE_KEY='minya_workday_overrides_v1';
  const NORMAL_CREW_TOTAL=18;
  const EMERGENCY_CREW_TOTAL=3;
  const FIXED_HOLIDAYS={
    '01-01':'رأس السنة الميلادية',
    '01-07':'عيد الميلاد المجيد الشرقي',
    '03-08':'يوم المرأة العالمي',
    '04-12':'عيد الفصح المجيد',
    '05-01':'عيد العمال',
    '11-15':'عيد الاستقلال',
    '12-25':'عيد الميلاد المجيد الغربي'
  };

  window.MutationObserver=class MinyaStableMutationObserver extends NativeMutationObserver{
    observe(target,options){
      let safeOptions=options;
      if(target?.id==='previewReports'&&options?.subtree){
        safeOptions={...options,subtree:false,childList:true};
      }
      return super.observe(target,safeOptions);
    }
  };

  function installMobileApprovalBarFix(){
    if(document.getElementById('minyaDriveMobileApprovalStyle')) return;
    const style=document.createElement('style');
    style.id='minyaDriveMobileApprovalStyle';
    style.textContent=`
      @media screen and (max-width: 760px) {
        .drive-import-page {
          padding-bottom: calc(150px + env(safe-area-inset-bottom, 0px)) !important;
        }
        #previewPanel:not(.hidden) .drive-approval-bar {
          position: fixed !important;
          left: 10px !important;
          right: 10px !important;
          bottom: calc(10px + env(safe-area-inset-bottom, 0px)) !important;
          z-index: 2000 !important;
          margin: 0 !important;
          padding: 10px !important;
          display: grid !important;
          grid-template-columns: 1fr 1.45fr !important;
          gap: 8px !important;
          background: rgba(255,255,255,.97) !important;
          border: 1px solid #d9e4df !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 30px rgba(16,24,40,.18) !important;
          backdrop-filter: blur(9px) !important;
          -webkit-backdrop-filter: blur(9px) !important;
        }
        #previewPanel:not(.hidden) .drive-approval-bar button {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 44px !important;
          margin: 0 !important;
        }
        .minya-workday-select { min-width: 145px !important; }
      }
      .minya-workday-cell { min-width: 190px; }
      .minya-workday-select {
        width: 100%;
        min-width: 170px;
        padding: 6px 8px;
        border: 1px solid #cfd8d3;
        border-radius: 8px;
        background: #fff;
        font: inherit;
      }
      .minya-workday-reason {
        display:block;
        margin-top:4px;
        font-size:11px;
        color:#667085;
        white-space:normal;
        line-height:1.4;
      }
      tr.minya-official-holiday td:first-child { font-weight:700; }
    `;
    document.head.appendChild(style);
  }

  function readOverrides(){
    try{return JSON.parse(localStorage.getItem(WORKDAY_OVERRIDE_KEY)||'{}')||{};}catch{return {};}
  }
  function saveOverride(date,value){
    const data=readOverrides();
    if(value==='auto') delete data[date]; else data[date]=value;
    localStorage.setItem(WORKDAY_OVERRIDE_KEY,JSON.stringify(data));
  }

  function islamicHoliday(date){
    try{
      const parts=new Intl.DateTimeFormat('en-u-ca-islamic',{month:'numeric',day:'numeric',timeZone:'Asia/Hebron'}).formatToParts(date);
      const month=Number(parts.find(p=>p.type==='month')?.value||0);
      const day=Number(parts.find(p=>p.type==='day')?.value||0);
      if(month===1&&day===1)return'رأس السنة الهجرية - 1 محرم';
      if(month===3&&day===12)return'ذكرى المولد النبوي الشريف - 12 ربيع الأول';
      if(month===7&&day===27)return'ذكرى الإسراء والمعراج - 27 رجب';
    }catch{}
    return'';
  }

  function automaticWorkday(dateText){
    const m=String(dateText||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m)return{status:'official',reason:'دوام رسمي'};
    const date=new Date(`${dateText}T12:00:00+03:00`);
    if(date.getDay()===5)return{status:'holiday',reason:'يوم الجمعة - عطلة رسمية / دوام طوارئ'};
    const fixed=FIXED_HOLIDAYS[`${m[2]}-${m[3]}`];
    if(fixed)return{status:'holiday',reason:`${fixed} - عطلة رسمية / دوام طوارئ`};
    const hijri=islamicHoliday(date);
    if(hijri)return{status:'holiday',reason:`${hijri} - عطلة رسمية / دوام طوارئ`};
    return{status:'official',reason:'دوام رسمي'};
  }

  function applyWorkdayToRow(tr){
    const cells=tr.querySelectorAll('td');
    if(cells.length<16)return;
    const date=String(cells[0].textContent||'').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    const auto=automaticWorkday(date);
    const override=readOverrides()[date];
    const status=override==='holiday'||override==='official'?override:auto.status;
    const reason=override==='holiday'?'محدد يدويًا: عطلة رسمية / دوام طوارئ':override==='official'?'محدد يدويًا: دوام رسمي':auto.reason;
    if(cells[3])cells[3].textContent=String(status==='holiday'?EMERGENCY_CREW_TOTAL:NORMAL_CREW_TOTAL);
    tr.classList.toggle('minya-official-holiday',status==='holiday');

    let cell=tr.querySelector('.minya-workday-cell');
    if(!cell){
      cell=document.createElement('td');
      cell.className='minya-workday-cell';
      tr.appendChild(cell);
    }
    cell.innerHTML=`<select class="minya-workday-select" data-workday-date="${date}">
      <option value="holiday" ${status==='holiday'?'selected':''}>عطلة رسمية - دوام طوارئ</option>
      <option value="official" ${status==='official'?'selected':''}>دوام رسمي</option>
    </select><small class="minya-workday-reason">${reason}</small>`;
  }

  function enhanceWorkdayTable(){
    const table=document.querySelector('#sourceFilesPreview .source-import-table');
    if(!table)return;
    const head=table.querySelector('thead tr');
    if(head&&!head.querySelector('.minya-workday-head')){
      const th=document.createElement('th');th.className='minya-workday-head';th.textContent='نوع الدوام';head.appendChild(th);
    }
    table.querySelectorAll('tbody tr').forEach(applyWorkdayToRow);
  }

  function installWorkdayControls(){
    const root=document.getElementById('sourceFilesPreview');
    if(!root)return;
    enhanceWorkdayTable();
    root.addEventListener('change',(event)=>{
      const select=event.target.closest('.minya-workday-select');
      if(!select)return;
      saveOverride(select.dataset.workdayDate,select.value);
      applyWorkdayToRow(select.closest('tr'));
    });
    const observer=new NativeMutationObserver(()=>enhanceWorkdayTable());
    observer.observe(root,{childList:true,subtree:true});
  }

  function enforceRainyWaterZero(){
    const root=document.getElementById('sourceFilesPreview');
    if(!root)return;
    root.querySelectorAll('.source-import-table tbody tr').forEach((tr)=>{
      const cells=tr.querySelectorAll('td');
      if(cells.length<6)return;
      const weather=String(cells[1]?.textContent||'').replace(/\s+/g,' ').trim();
      if(!/ماطر|ممطر|امطار|أمطار|مطر|ثلجي/.test(weather))return;
      if(String(cells[4].textContent||'').trim()!=='0')cells[4].textContent='0';
      if(String(cells[5].textContent||'').trim()!=='0')cells[5].textContent='0';
    });
  }

  function installRainyWaterRule(){
    const root=document.getElementById('sourceFilesPreview');
    if(!root)return;
    enforceRainyWaterZero();
    const observer=new NativeMutationObserver(()=>enforceRainyWaterZero());
    observer.observe(root,{childList:true,subtree:true,characterData:true});
  }

  function init(){
    installMobileApprovalBarFix();
    installRainyWaterRule();
    installWorkdayControls();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();
