(()=>{
  const table=document.querySelector('.me-table');
  const undoBtn=document.querySelector('#undoBtn');
  if(!table)return;

  const selector='tbody input:not([disabled]):not([readonly]),tbody select:not([disabled])';
  const undoStack=[];
  let pending=null;
  let restoring=false;
  let pasteMode=false;

  function identity(el){
    const tr=el.closest('tr');
    if(!tr)return null;
    const row=tr.dataset.i;
    let key='';
    if(el.dataset.core) key=`core:${el.dataset.core}`;
    else if(el.dataset.kind) key=`${el.dataset.kind}:${el.dataset.name||''}:${el.dataset.field||''}`;
    else return null;
    return {row,key,value:el.value,checked:!!el.checked};
  }

  function allSnapshot(){
    return [...table.querySelectorAll(selector)].map(identity).filter(Boolean);
  }

  function findCell(item){
    const tr=table.querySelector(`tbody tr[data-i="${CSS.escape(String(item.row))}"]`);
    if(!tr)return null;
    if(item.key.startsWith('core:')){
      const field=item.key.slice(5);
      return tr.querySelector(`[data-core="${CSS.escape(field)}"]`);
    }
    const parts=item.key.split(':');
    const kind=parts[0]||'', name=parts[1]||'', field=parts[2]||'';
    return tr.querySelector(`[data-kind="${CSS.escape(kind)}"][data-name="${CSS.escape(name)}"][data-field="${CSS.escape(field)}"]`);
  }

  function refreshButton(){if(undoBtn)undoBtn.disabled=undoStack.length===0;}
  function push(entry){if(!entry)return;undoStack.push(entry);if(undoStack.length>50)undoStack.shift();refreshButton();}
  function dispatch(el){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}

  function restoreEntry(entry){
    restoring=true;
    try{
      const items=entry.type==='snapshot'?entry.items:[entry.item];
      for(const item of items){
        const el=findCell(item);
        if(!el)continue;
        if(el.type==='checkbox'||el.type==='radio')el.checked=!!item.checked;
        else el.value=item.value;
        dispatch(el);
      }
    }finally{
      restoring=false;
    }
    const status=document.querySelector('#status');
    if(status){status.textContent='تم التراجع عن آخر تعديل';status.style.color='#176b4f';}
  }

  function undo(){
    const entry=undoStack.pop();
    if(!entry){
      const status=document.querySelector('#status');
      if(status){status.textContent='لا يوجد تعديل سابق للتراجع عنه';status.style.color='#60736a';}
      refreshButton();
      return;
    }
    restoreEntry(entry);
    refreshButton();
  }

  table.addEventListener('focusin',e=>{
    if(restoring||pasteMode||!e.target.matches(selector))return;
    pending=identity(e.target);
  },true);

  table.addEventListener('input',e=>{
    if(restoring||pasteMode||!e.target.matches(selector))return;
    if(pending){push({type:'cell',item:pending});pending=null;}
  },true);

  table.addEventListener('paste',e=>{
    if(restoring||!e.target.matches(selector))return;
    const text=e.clipboardData?.getData('text/plain')||'';
    if(!(text.includes('\t')||text.includes('\n')))return;
    const items=allSnapshot();
    if(items.length)push({type:'snapshot',items});
    pasteMode=true;
    pending=null;
    setTimeout(()=>{pasteMode=false;},0);
  },true);

  // Use the physical KeyZ code as well as the produced character.
  // This makes Ctrl+Z work even when the active keyboard layout is Arabic (KeyZ => ئ).
  window.addEventListener('keydown',e=>{
    const ctrl=e.ctrlKey||e.metaKey;
    const key=String(e.key||'').toLowerCase();
    const isZ=e.code==='KeyZ'||e.keyCode===90||key==='z'||key==='ئ';
    if(ctrl&&!e.shiftKey&&isZ){
      e.preventDefault();
      e.stopPropagation();
      undo();
    }
  },true);

  undoBtn?.addEventListener('click',e=>{e.preventDefault();undo();});
  refreshButton();
})();
