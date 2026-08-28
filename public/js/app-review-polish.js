/* =========================================================
   Final review helpers - presentation only
========================================================= */
(function(){
  const path=(location.pathname.replace(/\/+$/,'')||'/');
  const pageMap={
    '/':'home','/report':'report','/archive':'archive','/monthly':'monthly','/annual':'annual',
    '/equipment':'equipment','/weekly':'weekly','/search':'search','/managerial':'managerial','/admin':'admin','/reviews':'reviews'
  };
  const page=pageMap[path];
  if(page) document.body.classList.add(`page-${page}`);

  function displayDate(value){
    const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m?`${m[3]}/${m[2]}/${m[1]}`:String(value||'');
  }

  function replaceIsoText(root){
    if(!root) return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const parent=node.parentElement;
      if(!parent || ['INPUT','TEXTAREA','OPTION','SCRIPT','STYLE'].includes(parent.tagName)) return;
      const text=node.nodeValue||'';
      const next=text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,(_,y,m,d)=>`${d}/${m}/${y}`);
      if(next!==text) node.nodeValue=next;
    });
  }

  function polishDynamicText(){
    if(path==='/weekly') replaceIsoText(document.getElementById('v3Content'));
    if(path==='/equipment') replaceIsoText(document.getElementById('v3Content'));
    if(path==='/search') replaceIsoText(document.getElementById('v3Content'));
    if(path==='/managerial') replaceIsoText(document.getElementById('managerialReport'));

    if(path==='/admin'){
      document.querySelectorAll('.v3-panel h3').forEach(h=>{
        if(h.textContent.trim()==='سجل التعديلات Audit Log') h.innerHTML='سجل التعديلات <small style="font-size:.62em;color:#7a8794;font-weight:700;">Audit Log</small>';
      });
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    polishDynamicText();
    const root=document.getElementById('v3Content')||document.body;
    if(typeof MutationObserver!=='undefined'){
      let queued=false;
      new MutationObserver(()=>{
        if(queued)return;
        queued=true;
        requestAnimationFrame(()=>{queued=false;polishDynamicText();});
      }).observe(root,{childList:true,subtree:true,characterData:true});
    }
  });
})();
