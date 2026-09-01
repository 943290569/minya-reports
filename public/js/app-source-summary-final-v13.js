/* Source import V13 final summaries: persistent standalone station/Aziz totals, no continuous observer. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const numFromCell=cell=>{const m=clean(cell?.textContent).match(/([\d,.]+)\s*طن/);if(!m)return 0;const n=Number(m[1].replace(/,/g,''));return Number.isFinite(n)?n:0;};
  function mainTable(){const root=$('sourceFilesPreview');if(!root)return null;return [...root.querySelectorAll('table')].find(t=>{const r=t.querySelector('tbody tr');return r&&r.querySelectorAll('td').length>=15;})||null;}
  function ensureBox(root){
    let box=$('stationTotalsV13');
    if(!box){
      box=document.createElement('div');
      box.id='stationTotalsV13';
      box.className='source-import-summary';
      box.style.margin='12px 0';
      box.innerHTML='<div><span>مجموع نفايات المحطات</span><strong id="stationTotalV13">-</strong></div><div><span>مجموع عبد العزيز</span><strong id="azizTotalV13">-</strong></div>';
      const table=mainTable();
      if(table?.parentNode)table.parentNode.insertBefore(box,table);else root.prepend(box);
    }
    return box;
  }
  function apply(){
    const root=$('sourceFilesPreview'),table=mainTable();if(!root||!table)return false;
    let stations=0,aziz=0,seen=false;
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const c=tr.querySelectorAll('td');if(c.length<15)return;
      const y=numFromCell(c[11]),a=numFromCell(c[12]),t=numFromCell(c[13]),h=numFromCell(c[14]);
      const has=/طن/.test(clean(c[11]?.textContent))||/طن/.test(clean(c[12]?.textContent))||/طن/.test(clean(c[13]?.textContent))||/طن/.test(clean(c[14]?.textContent));
      if(has)seen=true;
      stations+=y+t+h;aziz+=a;
    });
    if(!seen)return false;
    ensureBox(root);
    const s=$('stationTotalV13'),a=$('azizTotalV13');
    const sv=`${fmt(stations)} طن`,av=`${fmt(aziz)} طن`;
    if(s&&s.textContent!==sv)s.textContent=sv;
    if(a&&a.textContent!==av)a.textContent=av;
    return true;
  }
  function staged(){
    [400,900,1600,2600,4000,6000,9000,12000].forEach(ms=>setTimeout(apply,ms));
  }
  function init(){
    const btn=$('analyzeSourceFilesBtn');if(!btn)return;
    btn.addEventListener('click',()=>{const old=$('stationTotalsV13');if(old)old.remove();staged();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
