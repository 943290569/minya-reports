(()=>{
  function init(){
    const btn=document.getElementById('addNewApproveBtn');
    const action=document.getElementById('existingAction');
    const commit=document.getElementById('commitBtn');
    const status=document.getElementById('status');
    if(!btn||!action||!commit)return;
    btn.addEventListener('click',()=>{
      action.value='ignore';
      if(status)status.textContent='سيتم إضافة التقارير الجديدة واعتمادها مع تجاهل التقارير الموجودة...';
      commit.click();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();