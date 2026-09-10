(()=>{
  const table=document.querySelector('.me-table');
  const undoBtn=document.querySelector('#undoBtn');
  if(!table)return;

  const selector='tbody input:not([disabled]):not([readonly]),tbody select:not([disabled])';
  const undoStack=[];
  let pendingSnapshot=null;
  let restoring=false;
  let pasteSnapshot=null;

  function cells(){return [...table.querySelectorAll(selector)];}
  function snapshot(){return cells().map(el=>({value:el.value,checked:el.checked,type:el.type,tag:el.tagName}));}
  function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
  function refreshButton(){if(undoBtn)undoBtn.disabled=undoStack.length===0;}
  function pushSnapshot(snap){if(!snap||!snap.length)return;const last=undoStack[undoStack.length-1];if(last&&same(last,snap))return;undoStack.push(snap);if(undoStack.length>50)undoStack.shift();refreshButton();}

  function dispatch(el){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  function restore(snap){
    const current=cells();
    if(!snap||snap.length!==current.length)return false;
    restoring=true;
    current.forEach((el,i)=>{const s=snap[i];if(el.type==='checkbox'||el.type==='radio')el.checked=!!s.checked;else el.value=s.value;dispatch(el);});
    restoring=false;
    const status=document.querySelector('#status');
    if(status){status.textContent='تم التراجع عن آخر تعديل';status.style.color='#176b4f';}
    return true;
  }
  function undo(){
    if(!undoStack.length)return;
    const snap=undoStack.pop();
    restore(snap);
    refreshButton();
  }

  // Capture one state before each normal edit.
  table.addEventListener('focusin',e=>{
    if(restoring||!e.target.matches(selector))return;
    pendingSnapshot=snapshot();
  });
  table.addEventListener('change',e=>{
    if(restoring||!e.target.matches(selector))return;
    if(pasteSnapshot){pushSnapshot(pasteSnapshot);pasteSnapshot=null;pendingSnapshot=null;return;}
    if(pendingSnapshot){pushSnapshot(pendingSnapshot);pendingSnapshot=null;}
  });

  // Capture the whole table once before a multi-cell paste.
  table.addEventListener('paste',e=>{
    if(restoring||!e.target.matches(selector))return;
    const text=e.clipboardData?.getData('text/plain')||'';
    if(text.includes('\t')||text.includes('\n')) pasteSnapshot=snapshot();
  },true);

  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&String(e.key).toLowerCase()==='z'){
      e.preventDefault();
      undo();
    }
  });

  undoBtn?.addEventListener('click',undo);
  refreshButton();
})();
