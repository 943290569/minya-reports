(function(){
  function setVehiclesDriversScope(){
    const nav=document.querySelector('.top-header nav');
    const link=nav&&nav.querySelector('a[href="/drivers-licenses.html"]');
    if(link){
      const badge=link.querySelector('.driver-license-alert-badge');
      link.childNodes.forEach(node=>{if(node.nodeType===Node.TEXT_NODE)node.remove();});
      link.insertBefore(document.createTextNode('المركبات والسائقين'),badge||link.firstChild);
    }

    if(location.pathname==='/drivers-licenses.html'){
      document.title='المركبات والسائقين';
      const headerText=document.querySelector('.top-header > div > p');
      if(headerText)headerText.textContent='مركبات حركة المكب وسائقو المجلس';
      const mainTitle=document.querySelector('main.container .panel h2');
      if(mainTitle)mainTitle.textContent='رخص سائقي حركة المكب';
      const mainDesc=mainTitle&&mainTitle.parentElement&&mainTitle.parentElement.querySelector('p');
      if(mainDesc)mainDesc.textContent='سجل سائقي المجلس العاملين على مركبات حركة المكب ومتابعة رخصهم ومرفقاتها وتواريخ انتهائها.';
    }
  }

  function ensureBadge(count){
    setVehiclesDriversScope();
    const nav=document.querySelector('.top-header nav');
    if(!nav)return false;
    const link=nav.querySelector('a[href="/drivers-licenses.html"]');
    if(!link)return false;
    let badge=link.querySelector('.driver-license-alert-badge');
    if(!badge){
      badge=document.createElement('span');
      badge.className='driver-license-alert-badge';
      badge.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 6px;margin-inline-start:6px;border-radius:999px;background:#c62828;color:#fff;font-size:12px;font-weight:800;line-height:1;vertical-align:middle;box-shadow:0 0 0 2px rgba(198,40,40,.12)';
      link.appendChild(badge);
    }
    badge.textContent=String(count);
    badge.title=`${count} رخصة متبقي على انتهائها 45 يومًا أو أقل`;
    badge.style.display=count>0?'inline-flex':'none';
    return true;
  }
  async function refresh(){
    setVehiclesDriversScope();
    try{
      const r=await fetch('/api/driver-licenses',{cache:'no-store'});
      if(!r.ok)return;
      const d=await r.json();
      const rows=Array.isArray(d.rows)?d.rows:[];
      const count=rows.filter(x=>Number.isFinite(Number(x.days_remaining))&&Number(x.days_remaining)>=0&&Number(x.days_remaining)<=45).length;
      let tries=0;
      const paint=()=>{if(ensureBadge(count)||tries++>20)return;setTimeout(paint,250);};
      paint();
    }catch(_){ }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();
  window.addEventListener('driver-licenses-updated',refresh);
})();
