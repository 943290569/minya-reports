(function(){
  function apply(){
    const body=document.getElementById('licenseBody');
    if(!body)return;
    body.querySelectorAll('tr').forEach(tr=>{
      const cells=tr.querySelectorAll('td');
      if(cells.length<7)return;
      const statusCell=cells[6];
      const text=String(statusCell.textContent||'').trim();
      if(text==='تنتهي قريبًا'){
        statusCell.style.setProperty('background','#dc2626','important');
        statusCell.style.setProperty('color','#fff','important');
        statusCell.style.setProperty('font-weight','800','important');
        statusCell.style.setProperty('border-color','#b91c1c','important');
        statusCell.querySelectorAll('*').forEach(el=>{
          el.style.setProperty('background','#dc2626','important');
          el.style.setProperty('color','#fff','important');
          el.style.setProperty('border-color','#b91c1c','important');
        });
      }
    });
  }
  function init(){
    const body=document.getElementById('licenseBody');
    if(!body)return;
    apply();
    new MutationObserver(apply).observe(body,{childList:true,subtree:true,characterData:true});
    window.addEventListener('driver-licenses-updated',apply);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
