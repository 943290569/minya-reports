/* Stations totals V12: stable dedicated totals, no MutationObserver. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});

  function mainTable(){
    const root=$('sourceFilesPreview');
    if(!root)return null;
    return [...root.querySelectorAll('.source-import-table')].find(t=>t.querySelector('tbody tr td:nth-child(16)'))||null;
  }
  function tonsFromCell(cell){
    const s=clean(cell?.textContent||'');
    const m=s.match(/-?[0-9][0-9,]*(?:\.[0-9]+)?(?=\s*طن)/);
    if(m)return num(m[0]);
    const m2=s.match(/-?[0-9][0-9,]*(?:\.[0-9]+)?/);
    return m2?num(m2[0]):0;
  }
  function render(){
    const root=$('sourceFilesPreview'),table=mainTable();
    if(!root||!table)return;
    let stations=0,aziz=0,rows=0;
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const c=tr.querySelectorAll('td');
      if(c.length<15)return;
      const date=clean(c[0]?.textContent||'');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
      const yata=tonsFromCell(c[11]);
      const a=tonsFromCell(c[12]);
      const tarqumia=tonsFromCell(c[13]);
      const hebron=tonsFromCell(c[14]);
      stations+=yata+tarqumia+hebron;
      aziz+=a;
      rows++;
    });
    if(!rows)return;

    let box=root.querySelector('#stationsTotalsV12');
    if(!box){
      box=document.createElement('div');
      box.id='stationsTotalsV12';
      box.className='source-import-summary';
      const mainSummary=root.querySelector('.source-import-summary');
      if(mainSummary&&mainSummary.parentNode)mainSummary.insertAdjacentElement('afterend',box);
      else root.prepend(box);
    }
    const html=`<div><span>مجموع نفايات المحطات</span><strong>${fmt(stations)} طن</strong></div><div><span>مجموع عبد العزيز</span><strong>${fmt(aziz)} طن</strong></div>`;
    if(box.innerHTML!==html)box.innerHTML=html;
  }
  function schedule(){[250,700,1500,3000,5500,8000].forEach(ms=>setTimeout(render,ms));}
  function init(){
    const btn=$('analyzeSourceFilesBtn');
    if(!btn)return;
    btn.addEventListener('click',schedule);
    ['sourceFile_stations','sourceFile_aziz'].forEach(id=>$(id)?.addEventListener('change',()=>{$('stationsTotalsV12')?.remove();}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
