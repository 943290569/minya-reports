/* Create one downloadable full backup before replacing existing reports from Drive/Excel. */
(function(){
  const $=id=>document.getElementById(id);
  let bypass=false;
  let busy=false;

  function selectedDuplicates(){
    const out=[];
    for(const cb of document.querySelectorAll('#previewReports [data-import-check]:checked')){
      if(cb.disabled)continue;
      const card=cb.closest('.drive-report-card');
      if(!card?.querySelector('.drive-status.duplicate'))continue;
      const label=String(card.querySelector('.drive-report-main strong')?.textContent||'').trim();
      out.push(label);
    }
    return out;
  }

  function filename(){
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    return `minya-before-import-replace-${stamp}.json`;
  }

  async function downloadBackup(){
    const response=await fetch('/api/backup/download',{cache:'no-store'});
    const data=await response.json().catch(()=>null);
    if(!response.ok||!data)throw new Error(data?.message||'تعذر إنشاء نسخة الأمان قبل الاستبدال');
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    try{
      const a=document.createElement('a');
      a.href=url;
      a.download=filename();
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }finally{
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }
  }

  async function handle(event){
    if(bypass){bypass=false;return;}
    const duplicates=selectedDuplicates();
    if(!duplicates.length)return;
    if(busy){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    busy=true;
    const btn=$('approveImportBtn');
    const progress=$('importProgress');
    const previous=progress?.textContent||'';
    try{
      if(btn)btn.disabled=true;
      if(progress){progress.classList.remove('hidden');progress.textContent=`جاري إنشاء نسخة أمان قبل استبدال ${duplicates.length} تقرير...`;}
      await downloadBackup();
      if(progress)progress.textContent='تم إنشاء نسخة الأمان. جاري متابعة الاعتماد...';
      bypass=true;
      if(btn){btn.disabled=false;btn.click();}
    }catch(error){
      if(progress)progress.textContent=previous;
      alert(`${error.message||error}\n\nتم إيقاف الاستبدال ولم يتم تغيير أي تقرير.`);
      if(btn)btn.disabled=false;
    }finally{
      busy=false;
    }
  }

  function init(){
    const btn=$('approveImportBtn');
    if(btn&&!btn.dataset.preReplaceBackup){
      btn.dataset.preReplaceBackup='1';
      btn.addEventListener('click',handle,true);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
