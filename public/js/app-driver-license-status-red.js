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
        statusCell.style.setProperty('background','transparent','important');
        statusCell.style.setProperty('color','inherit','important');
        statusCell.style.setProperty('font-weight','400','important');
        const pill=statusCell.querySelector('.status-pill')||statusCell.querySelector('span');
        if(pill){
          pill.style.setProperty('display','inline-flex','important');
          pill.style.setProperty('align-items','center','important');
          pill.style.setProperty('justify-content','center','important');
          pill.style.setProperty('background','#fef2f2','important');
          pill.style.setProperty('color','#b91c1c','important');
          pill.style.setProperty('border','1px solid #fecaca','important');
          pill.style.setProperty('border-radius','999px','important');
          pill.style.setProperty('font-weight','800','important');
          pill.style.setProperty('padding','5px 10px','important');
          pill.style.setProperty('box-shadow','none','important');
        }
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
