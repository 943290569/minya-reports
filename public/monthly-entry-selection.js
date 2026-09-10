(()=>{
  const table=document.querySelector('.me-table');
  if(!table)return;
  const selector='tbody input:not([disabled]):not([readonly]),tbody select:not([disabled])';
  let anchor=null, active=null, selected=[];

  const style=document.createElement('style');
  style.textContent=`
    .me-table td.me-selected{background:#dcefe6!important;box-shadow:inset 0 0 0 2px #2b7a5b}
    .me-table td.me-active{box-shadow:inset 0 0 0 3px #176b4f!important}
  `;
  document.head.appendChild(style);

  function allCells(){return [...table.querySelectorAll(selector)];}
  function tdOf(el){return el?.closest('td')||null;}
  function clearMarks(){table.querySelectorAll('td.me-selected,td.me-active').forEach(td=>td.classList.remove('me-selected','me-active'));selected=[];}
  function coords(el){const tr=el.closest('tr');const tbody=tr?.parentElement;if(!tbody)return null;const rows=[...tbody.querySelectorAll('tr')];const r=rows.indexOf(tr);const cells=[...tr.querySelectorAll(selector)];const c=cells.indexOf(el);return {r,c,rows};}
  function cellAt(rows,r,c){const tr=rows[r];if(!tr)return null;return [...tr.querySelectorAll(selector)][c]||null;}
  function markSingle(el){clearMarks();anchor=el;active=el;selected=[el];tdOf(el)?.classList.add('me-selected','me-active');}
  function markRange(a,b){const A=coords(a),B=coords(b);if(!A||!B)return;clearMarks();const r1=Math.min(A.r,B.r),r2=Math.max(A.r,B.r),c1=Math.min(A.c,B.c),c2=Math.max(A.c,B.c);for(let r=r1;r<=r2;r++){for(let c=c1;c<=c2;c++){const el=cellAt(A.rows,r,c);if(el){selected.push(el);tdOf(el)?.classList.add('me-selected');}}}active=b;tdOf(b)?.classList.add('me-active');}

  table.addEventListener('click',e=>{
    const el=e.target.closest(selector);if(!el)return;
    if(e.shiftKey&&anchor){markRange(anchor,el);}else{markSingle(el);}
  });

  document.addEventListener('keydown',e=>{
    if(!selected.length)return;
    const tag=document.activeElement?.tagName;
    const editing=(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA')&&!e.ctrlKey&&!e.metaKey;
    if((e.key==='Delete'||e.key==='Backspace')&&!editing){
      e.preventDefault();
      selected.forEach(el=>{if(el.tagName==='SELECT')return;el.value='';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
      const s=document.querySelector('#status');if(s)s.textContent=`تم مسح ${selected.length} خانة — اضغط تحديث البيانات للحفظ`;
    }
  });

  document.addEventListener('copy',e=>{
    if(!selected.length||!anchor||!active)return;
    const A=coords(anchor),B=coords(active);if(!A||!B)return;
    const r1=Math.min(A.r,B.r),r2=Math.max(A.r,B.r),c1=Math.min(A.c,B.c),c2=Math.max(A.c,B.c);const lines=[];
    for(let r=r1;r<=r2;r++){
      const vals=[];
      for(let c=c1;c<=c2;c++){
        const el=cellAt(A.rows,r,c);if(!el){vals.push('');continue;}
        vals.push(el.tagName==='SELECT'?(el.options[el.selectedIndex]?.text||el.value):el.value);
      }
      lines.push(vals.join('\t'));
    }
    e.clipboardData?.setData('text/plain',lines.join('\n'));e.preventDefault();
    const s=document.querySelector('#status');if(s)s.textContent=`تم نسخ ${selected.length} خانة`;
  });
})();
