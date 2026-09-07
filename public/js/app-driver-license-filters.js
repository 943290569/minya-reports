/* Driver license quick filters */
(function(){
  if(window.__MINYA_LICENSE_FILTERS__)return;
  window.__MINYA_LICENSE_FILTERS__=true;
  let filter='all';

  function ensure(){
    const kpis=document.getElementById('licenseKpis');
    if(!kpis||document.getElementById('licenseQuickFilters'))return;
    const bar=document.createElement('div');
    bar.id='licenseQuickFilters';
    bar.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 4px';
    const items=[['all','الكل'],['expired','منتهية'],['30','30 يوم أو أقل'],['15','15 يوم أو أقل'],['valid','سارية']];
    bar.innerHTML=items.map(([key,label])=>`<button type="button" data-license-filter="${key}" style="padding:7px 11px;border:1px solid #cbd8d1;border-radius:9px;background:#fff;color:#264239;font:inherit;font-size:12px;font-weight:800;cursor:pointer">${label}</button>`).join('');
    kpis.insertAdjacentElement('afterend',bar);
    bar.querySelectorAll('[data-license-filter]').forEach(btn=>btn.addEventListener('click',()=>{
      filter=btn.dataset.licenseFilter||'all';
      bar.querySelectorAll('[data-license-filter]').forEach(x=>{x.style.background=x===btn?'#176b4f':'#fff';x.style.color=x===btn?'#fff':'#264239';});
      apply();
    }));
    const first=bar.querySelector('[data-license-filter="all"]');
    if(first){first.style.background='#176b4f';first.style.color='#fff';}
  }

  function match(row){
    if(filter==='all')return true;
    const cells=row.querySelectorAll('td');
    if(cells.length<7)return true;
    const days=Number(String(cells[5].textContent||'').trim());
    const status=String(cells[6].textContent||'').trim();
    if(filter==='expired')return status.includes('منتهية')||Number.isFinite(days)&&days<0;
    if(filter==='30')return Number.isFinite(days)&&days>=0&&days<=30;
    if(filter==='15')return Number.isFinite(days)&&days>=0&&days<=15;
    if(filter==='valid')return status.includes('سارية')&&(!Number.isFinite(days)||days>30);
    return true;
  }

  function apply(){
    ensure();
    const body=document.getElementById('licenseBody');if(!body)return;
    const rows=[...body.querySelectorAll('tr')];
    let shown=0;
    rows.forEach(row=>{const ok=match(row);row.style.display=ok?'':'none';if(ok)shown++;});
    const bar=document.getElementById('licenseQuickFilters');
    if(bar){bar.title=`المعروض حاليًا: ${shown}`;}
  }

  function init(){
    ensure();apply();
    window.addEventListener('driver-licenses-loaded',()=>setTimeout(apply,0));
    window.addEventListener('driver-licenses-updated',()=>setTimeout(apply,0));
    const search=document.getElementById('licenseSearch');
    if(search)search.addEventListener('input',()=>setTimeout(apply,0));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
