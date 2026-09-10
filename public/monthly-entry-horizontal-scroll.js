(()=>{
  function install(){
    const wrap=document.querySelector('.me-table-wrap');
    const table=wrap?.querySelector('.me-table');
    if(!wrap||!table||document.getElementById('monthlyTopScroll'))return;

    const top=document.createElement('div');
    top.id='monthlyTopScroll';
    top.className='me-top-scroll';
    const inner=document.createElement('div');
    inner.className='me-top-scroll-inner';
    top.appendChild(inner);
    wrap.parentNode.insertBefore(top,wrap);

    const syncWidth=()=>{inner.style.width=`${Math.max(table.scrollWidth,wrap.clientWidth)}px`;};
    let syncing=false;
    top.addEventListener('scroll',()=>{
      if(syncing)return;syncing=true;wrap.scrollLeft=top.scrollLeft;syncing=false;
    },{passive:true});
    wrap.addEventListener('scroll',()=>{
      if(syncing)return;syncing=true;top.scrollLeft=wrap.scrollLeft;syncing=false;
    },{passive:true});

    const ro=new ResizeObserver(syncWidth);ro.observe(table);ro.observe(wrap);
    new MutationObserver(syncWidth).observe(table,{childList:true,subtree:true,attributes:true});
    syncWidth();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
