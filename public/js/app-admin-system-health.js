/* Admin system health snapshot for the home dashboard. */
(function(){
  const pathName=location.pathname.replace(/\/+$/,'')||'/';
  if(pathName!=='/') return;

  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const fmtBytes=value=>{
    const bytes=Number(value||0);
    if(!Number.isFinite(bytes)||bytes<=0) return '0 MB';
    if(bytes>=1024*1024*1024) return `${(bytes/(1024*1024*1024)).toLocaleString('en-US',{maximumFractionDigits:2})} GB`;
    return `${(bytes/(1024*1024)).toLocaleString('en-US',{maximumFractionDigits:1})} MB`;
  };

  async function waitForAdmin(){
    for(let i=0;i<40&&!window.MINYA_USER;i+=1) await new Promise(resolve=>setTimeout(resolve,50));
    return window.MINYA_USER?.role==='admin';
  }

  async function api(url){
    const response=await fetch(url);
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false) throw new Error(data.message||'فشل تحميل حالة النظام');
    return data;
  }

  function statusLabel(integrity){
    if(integrity?.level==='danger') return ['تحتاج تدخلًا','خطر'];
    if(integrity?.level==='warning') return ['تحتاج متابعة','تنبيه'];
    return ['سليمة','مستقرة'];
  }

  function metric(label,value,detail,tone){
    return `<div style="padding:12px 13px;border:1px solid rgba(0,0,0,.08);border-radius:10px;background:${tone};min-width:0"><small style="display:block;margin-bottom:5px;opacity:.75">${esc(label)}</small><strong style="display:block;font-size:18px;line-height:1.2">${esc(value)}</strong><span style="display:block;margin-top:6px;font-size:12px;opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(detail)}</span></div>`;
  }

  async function render(){
    if(!(await waitForAdmin())) return;
    let integrity,storage,backups;
    try{
      [integrity,storage,backups]=await Promise.all([
        api('/api/system/integrity'),
        api('/api/system/storage'),
        api('/api/backups')
      ]);
    }catch(error){
      console.error('Admin system health failed',error);
      return;
    }

    const issues=Array.isArray(integrity.issues)?integrity.issues:[];
    const [healthText,healthDetail]=statusLabel(integrity);
    const latest=Array.isArray(backups.backups)?backups.backups[0]:null;
    const backupAge=integrity.latest_backup_age_hours;
    const backupText=latest?'موجودة':'غير موجودة';
    const backupDetail=latest?(backupAge==null?'آخر نسخة محفوظة':`منذ ${Number(backupAge).toLocaleString('en-US',{maximumFractionDigits:1})} ساعة`):'أنشئ نسخة احتياطية';
    const storagePercent=Number(storage.percent||0);
    const storageDetail=`${fmtBytes(storage.total_bytes)} مستخدم`;
    const attachmentProblems=(integrity.missing_attachments?.length||0)+(integrity.invalid_attachment_paths?.length||0)+(integrity.orphan_files?.length||0);

    document.getElementById('adminSystemHealth')?.remove();
    const section=document.createElement('section');
    section.id='adminSystemHealth';
    section.className='no-print';
    section.style.cssText='margin:14px 0 18px;padding:14px;border:1px solid rgba(0,0,0,.08);border-radius:12px;background:rgba(255,255,255,.78);';
    section.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap"><div><strong style="font-size:16px">صحة النظام</strong><small style="display:block;margin-top:2px;opacity:.7">فحص قاعدة البيانات والنسخ الاحتياطية والتخزين</small></div><a href="/system.html" style="text-decoration:none;font-size:13px">فتح إدارة النظام</a></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px">${metric('سلامة النظام',healthText,healthDetail,integrity.level==='danger'?'#fff0f0':integrity.level==='warning'?'#fff8e8':'#eef9f1')}${metric('الملاحظات',issues.length,String(issues[0]?.message||'لا توجد ملاحظات حرجة'),issues.length?'#fff8e8':'#f4f8ff')}${metric('آخر نسخة احتياطية',backupText,backupDetail,latest?'#eef9f1':'#fff0f0')}${metric('التخزين',`${storagePercent.toLocaleString('en-US',{maximumFractionDigits:1})}%`,storageDetail,storage.level==='danger'?'#fff0f0':storage.level==='warning'?'#fff8e8':'#f4f8ff')}${metric('مشاكل المرفقات',attachmentProblems,attachmentProblems?'ملفات مفقودة أو يتيمة أو مسارات غير صالحة':'لا توجد مشاكل مرفقات','#f4f8ff')}</div>`;

    const workflow=document.getElementById('adminWorkflowSummary');
    const todayOps=document.getElementById('adminTodayOps');
    if(todayOps?.parentNode) todayOps.parentNode.insertBefore(section,todayOps.nextSibling);
    else if(workflow?.parentNode) workflow.parentNode.insertBefore(section,workflow.nextSibling);
    else document.querySelector('main.container')?.prepend(section);
  }

  function init(){setTimeout(render,650);}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
