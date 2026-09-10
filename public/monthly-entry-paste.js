(()=>{
  const table=document.querySelector('.me-table');
  if(!table)return;

  const editableSelector='tbody input:not([disabled]):not([readonly]), tbody select:not([disabled])';

  function dispatchEdit(el){
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function parseClipboard(text){
    return String(text||'')
      .replace(/\r/g,'')
      .split('\n')
      .filter((row,i,arr)=>!(i===arr.length-1&&row===''))
      .map(row=>row.split('\t'));
  }

  function rowEditableCells(tr){
    return [...tr.querySelectorAll('input:not([disabled]):not([readonly]),select:not([disabled])')];
  }

  function setCellValue(el,value){
    const v=String(value??'').trim();
    if(el.tagName==='SELECT'){
      const options=[...el.options];
      let hit=options.find(o=>o.value===v)||options.find(o=>o.text.trim()===v);
      if(!hit && /عطلة|طوارئ/.test(v)) hit=options.find(o=>o.value==='holiday');
      if(!hit && /رسمي|دوام/.test(v)) hit=options.find(o=>o.value==='official');
      if(hit) el.value=hit.value;
      return;
    }
    if(el.type==='number'){
      const normalized=v.replace(/,/g,'').replace(/٫/g,'.');
      if(normalized===''||Number.isFinite(Number(normalized))) el.value=normalized;
      return;
    }
    el.value=v;
  }

  table.addEventListener('paste',e=>{
    const start=e.target.closest(editableSelector);
    if(!start)return;
    const text=e.clipboardData?.getData('text/plain');
    if(!text)return;
    const matrix=parseClipboard(text);
    if(!matrix.length)return;

    const startRow=start.closest('tr');
    const tbody=startRow?.parentElement;
    if(!tbody)return;
    const trs=[...tbody.querySelectorAll('tr')];
    const startRowIndex=trs.indexOf(startRow);
    const startCells=rowEditableCells(startRow);
    const startColIndex=startCells.indexOf(start);
    if(startRowIndex<0||startColIndex<0)return;

    // Single-cell paste is handled natively. Multi-cell/row paste behaves like Excel.
    const multi=matrix.length>1||matrix.some(r=>r.length>1);
    if(!multi)return;
    e.preventDefault();

    let written=0;
    matrix.forEach((values,rOffset)=>{
      const tr=trs[startRowIndex+rOffset];
      if(!tr)return;
      const cells=rowEditableCells(tr);
      values.forEach((value,cOffset)=>{
        const cell=cells[startColIndex+cOffset];
        if(!cell)return;
        setCellValue(cell,value);
        dispatchEdit(cell);
        written++;
      });
    });

    const status=document.querySelector('#status');
    if(status){status.textContent=`تم لصق ${written} خانة — اضغط تحديث البيانات للحفظ`;status.style.color='#176b4f';}
  });
})();
