(()=>{
  const table=()=>document.querySelector('.me-table');
  function apply(){
    const t=table(); if(!t) return;
    const headRows=t.tHead?.rows; if(!headRows||headRows.length<2) return;
    const detailHead=[...headRows[1].cells];
    const hidden=[];
    detailHead.forEach((th,i)=>{
      const txt=String(th.textContent||'').trim();
      const hide=/وصف الحالة|ملاحظات/.test(txt);
      th.style.display=hide?'none':'';
      if(hide) hidden.push(i);
    });
    [...(t.tBodies?.[0]?.rows||[])].forEach(tr=>{
      hidden.forEach(i=>{const td=tr.cells[i+1]; if(td) td.style.display='none';});
    });
    const groups=[...headRows[0].cells].slice(1);
    let start=0;
    groups.forEach(g=>{
      const original=Number(g.dataset.originalColspan||g.colSpan||1);
      if(!g.dataset.originalColspan) g.dataset.originalColspan=String(original);
      let removed=0;
      for(let i=start;i<start+original;i++) if(hidden.includes(i)) removed++;
      const left=original-removed;
      g.style.display=left>0?'':'none';
      if(left>0) g.colSpan=left;
      start+=original;
    });
  }
  const root=document.getElementById('rowsBody');
  if(root)new MutationObserver(apply).observe(root,{childList:true});
  document.addEventListener('DOMContentLoaded',apply,{once:true});
  document.addEventListener('change',e=>{if(e.target?.id==='groupView')setTimeout(apply,0)},true);
  setTimeout(apply,200);
})();