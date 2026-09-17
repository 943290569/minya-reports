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

  function setStatus(message,error=false){
    const status=document.querySelector('#status');
    if(status){
      status.textContent=message;
      status.style.color=error?'#a32121':'#176b4f';
    }
  }

  function setCellValue(el,value){
    const v=String(value??'').trim();
    if(el.tagName==='SELECT'){
      const options=[...el.options];
      let hit=options.find(o=>o.value===v)||options.find(o=>o.text.trim()===v);
      if(!hit && /عطلة|طوارئ/.test(v)) hit=options.find(o=>o.value==='holiday');
      if(!hit && /رسمي|دوام/.test(v)) hit=options.find(o=>o.value==='official');
      if(!hit)return false;
      el.value=hit.value;
      return true;
    }
    if(el.type==='number'){
      const normalized=v.replace(/,/g,'').replace(/٫/g,'.');
      if(normalized!==''&&!Number.isFinite(Number(normalized)))return false;
      el.value=normalized;
      return true;
    }
    el.value=v;
    return true;
  }

  table.addEventListener('paste',e=>{
    const start=e.target.closest(editableSelector);
    if(!start)return;
    const text=e.clipboardData?.getData('text/plain');
    if(!text)return;
    const matrix=parseClipboard(text);
    if(!matrix.length)return;

    const tbody=table.querySelector('tbody');
    const trs=tbody?[...tbody.querySelectorAll('tr')]:[];
    if(!trs.length)return;

    const startRow=start.closest('tr');
    const startCells=rowEditableCells(startRow);
    const startColIndex=startCells.indexOf(start);
    if(startColIndex<0)return;

    const oneColumn=matrix.every(r=>r.length===1);
    if(oneColumn && matrix.length>1){
      e.preventDefault();
      if(matrix.length!==trs.length){
        setStatus(`عدد الصفوف المنسوخة ${matrix.length} لا يساوي عدد أيام الشهر ${trs.length}. لم يتم تغيير أي قيمة.`,true);
        return;
      }
      const targets=trs.map(tr=>rowEditableCells(tr)[startColIndex]).filter(Boolean);
      if(targets.length!==trs.length){
        setStatus('لا يمكن لصق هذا العمود لأن بعض الصفوف لا تحتوي الخانة نفسها.',true);
        return;
      }
      for(let i=0;i<targets.length;i++){
        if(!setCellValue(targets[i],matrix[i][0])){
          setStatus(`تعذر قبول القيمة في الصف ${i+1}. لم يتم تنفيذ اللصق الكامل.`,true);
          return;
        }
      }
      targets.forEach(dispatchEdit);
      setStatus(`تم لصق العمود كاملًا على ${targets.length} يومًا — اضغط «تحديث البيانات» للحفظ.`);
      return;
    }

    // Multi-column paste keeps Excel-like behavior starting from the clicked cell.
    const multi=matrix.length>1||matrix.some(r=>r.length>1);
    if(!multi)return;
    e.preventDefault();

    const startRowIndex=trs.indexOf(startRow);
    if(startRowIndex<0)return;
    let written=0;
    matrix.forEach((values,rOffset)=>{
      const tr=trs[startRowIndex+rOffset];
      if(!tr)return;
      const cells=rowEditableCells(tr);
      values.forEach((value,cOffset)=>{
        const cell=cells[startColIndex+cOffset];
        if(!cell)return;
        if(setCellValue(cell,value)){
          dispatchEdit(cell);
          written++;
        }
      });
    });
    setStatus(`تم لصق ${written} خانة — اضغط «تحديث البيانات» للحفظ.`);
  });
})();