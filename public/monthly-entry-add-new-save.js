(()=>{
  function init(){
    const btn=document.getElementById('addNewApproveBtn');
    const save=document.getElementById('saveBtn');
    const status=document.getElementById('status');
    if(!btn||!save)return;
    btn.addEventListener('click',()=>{
      if(status)status.textContent='سيتم حفظ التقرير الجديد لأول مرة بدون اعتماد...';
      save.click();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();