(()=>{
  const NUMERIC_COLS = new Set(Array.from({length:21},(_,i)=>i+5)); // المكب حتى السولار
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const valueFromCell=td=>{
    const input=td?.querySelector('input[type="number"]');
    if(input){const n=Number(input.value);return Number.isFinite(n)?n:0;}
    const text=String(td?.textContent||'').replace(/,/g,'').trim();
    const n=Number(text);return Number.isFinite(n)?n:0;
  };
  function ensureFooter(table){
    let foot=table.tFoot;
    if(!foot) foot=table.createTFoot();
    let row=document.getElementById('monthlyTotalsRow');
    if(!row){row=foot.insertRow();row.id='monthlyTotalsRow';}
    return row;
  }
  function renderTotals(){
    const table=document.querySelector('.me-table'),body=document.getElementById('rowsBody');
    if(!table||!body)return;
    const dataRows=[...body.querySelectorAll('tr')];
    const colCount=table.tHead?.rows?.[0]?.cells?.length||27;
    const sums=Array(colCount).fill(0);
    dataRows.forEach(tr=>{
      [...tr.cells].forEach((td,i)=>{if(NUMERIC_COLS.has(i))sums[i]+=valueFromCell(td);});
    });
    const row=ensureFooter(table);row.innerHTML='';
    for(let i=0;i<colCount;i++){
      const cell=document.createElement(i===0?'th':'td');
      if(i===0){cell.textContent='المجموع';cell.style.fontWeight='800';}
      else if(i===1){cell.textContent=`${dataRows.length} يوم`;}
      else if(NUMERIC_COLS.has(i)){cell.innerHTML=`<strong>${fmt(sums[i])}</strong>`;}
      else cell.textContent='—';
      row.appendChild(cell);
    }
    row.style.position='sticky';
    row.style.bottom='0';
    row.style.zIndex='3';
    [...row.cells].forEach(c=>{
      c.style.background='#eaf4ef';
      c.style.borderTop='2px solid #7da892';
      c.style.fontWeight='700';
      c.style.whiteSpace='nowrap';
    });
  }
  let raf=0;const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(renderTotals);};
  document.addEventListener('input',e=>{if(e.target?.closest?.('#rowsBody'))schedule();},true);
  document.addEventListener('change',e=>{if(e.target?.closest?.('#rowsBody'))schedule();},true);
  document.addEventListener('DOMContentLoaded',()=>{
    const body=document.getElementById('rowsBody');
    if(body)new MutationObserver(schedule).observe(body,{childList:true,subtree:true,characterData:true});
    schedule();
  });
})();
