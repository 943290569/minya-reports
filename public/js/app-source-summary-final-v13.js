/* Source import V14 station summaries: observe preview only, render totals outside preview so core rerenders cannot remove them. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  let observer=null,timer=null;

  function numFromCell(cell){
    const s=clean(cell?.textContent||'');
    const m=s.match(/-?[0-9][0-9,]*(?:\.[0-9]+)?/);
    if(!m)return 0;
    const n=Number(m[0].replace(/,/g,''));
    return Number.isFinite(n)?n:0;
  }

  function mainTable(){
    const root=$('sourceFilesPreview');
    if(!root)return null;
    return [...root.querySelectorAll('.source-import-table')].find(t=>{
      const row=t.querySelector('tbody tr');
      return row&&row.querySelectorAll('td').length>=16;
    })||null;
  }

  function ensureBox(){
    let box=$('stationTotalsV14');
    if(box)return box;
    const root=$('sourceFilesPreview');
    if(!root||!root.parentNode)return null;
    box=document.createElement('div');
    box.id='stationTotalsV14';
    box.className='source-import-summary';
    box.style.margin='12px 0';
    box.innerHTML='<div><span>مجموع نفايات المحطات</span><strong id="stationTotalV14">-</strong></div><div><span>مجموع عبد العزيز</span><strong id="azizTotalV14">-</strong></div>';
    root.parentNode.insertBefore(box,root);
    return box;
  }

  function apply(){
    const table=mainTable();
    if(!table)return false;
    let stations=0,aziz=0,wideReady=false;
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const c=tr.querySelectorAll('td');
      if(c.length<16)return;
      const stationCells=[c[11],c[12],c[13],c[14]];
      if(stationCells.some(x=>/طن/.test(clean(x?.textContent))))wideReady=true;
      stations+=numFromCell(c[11])+numFromCell(c[13])+numFromCell(c[14]);
      aziz+=numFromCell(c[12]);
    });
    if(!wideReady)return false;
    ensureBox();
    const s=$('stationTotalV14'),a=$('azizTotalV14');
    const sv=`${fmt(stations)} طن`,av=`${fmt(aziz)} طن`;
    if(s&&s.textContent!==sv)s.textContent=sv;
    if(a&&a.textContent!==av)a.textContent=av;
    return true;
  }

  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(apply,80);
  }

  function reset(){
    clearTimeout(timer);
    $('stationTotalsV14')?.remove();
  }

  function init(){
    const root=$('sourceFilesPreview'),btn=$('analyzeSourceFilesBtn');
    if(!root||!btn)return;
    observer=new MutationObserver(schedule);
    observer.observe(root,{childList:true,subtree:true,characterData:true});
    btn.addEventListener('click',()=>{reset();schedule();});
    $('sourceFile_stations')?.addEventListener('change',reset);
    $('sourceFile_aziz')?.addEventListener('change',reset);
    schedule();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
