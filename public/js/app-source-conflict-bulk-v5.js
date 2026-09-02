/* Bulk conflict actions for source import approval. */
(function(){
  function enhance(){
    const box=document.getElementById('sourceDuplicatePanel');
    if(!box||box.dataset.bulkReady==='1')return;
    box.dataset.bulkReady='1';
    const head=box.querySelector('.drive-panel-head');
    if(!head)return;
    const controls=document.createElement('div');
    controls.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px';
    controls.innerHTML='<button type="button" class="drive-secondary" id="replaceAllSourceDuplicates">استبدال الكل</button><button type="button" class="drive-secondary" id="skipAllSourceDuplicates">تجاهل الكل</button>';
    head.insertAdjacentElement('afterend',controls);
    document.getElementById('replaceAllSourceDuplicates')?.addEventListener('click',()=>document.querySelectorAll('[data-source-conflict]').forEach(s=>s.value='replace'));
    document.getElementById('skipAllSourceDuplicates')?.addEventListener('click',()=>document.querySelectorAll('[data-source-conflict]').forEach(s=>s.value='skip'));
  }
  function schedule(){[50,120,250,500,900].forEach(ms=>setTimeout(enhance,ms));}
  function init(){document.getElementById('approveSourceDailyBtn')?.addEventListener('click',schedule);document.addEventListener('click',e=>{if(e.target?.id==='approveSourceDailyBtn')schedule();},true);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
