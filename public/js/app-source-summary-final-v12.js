/* Source import V12 final summaries: restore station/Aziz cards after staged renders without MutationObserver. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const numFromCell=cell=>{const m=clean(cell?.textContent).match(/([\d,.]+)\s*طن/);if(!m)return 0;const n=Number(m[1].replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  function mainTable(){const root=$('sourceFilesPreview');return root?[...root.querySelectorAll('.source-import-table')].find(t=>t.querySelector('tbody tr td:nth-child(16)'))||null:null;}
  function apply(){
    const root=$('sourceFilesPreview'),table=mainTable();if(!root||!table)return;
    let stations=0,aziz=0,seen=false;
    table.querySelectorAll('tbody tr').forEach(tr=>{const c=tr.querySelectorAll('td');if(c.length<15)return;const y=numFromCell(c[11]),a=numFromCell(c[12]),t=numFromCell(c[13]),h=numFromCell(c[14]);if(/طن/.test(clean(c[11].textContent))||/طن/.test(clean(c[13].textContent))||/طن/.test(clean(c[14].textContent)))seen=true;stations+=y+t+h;aziz+=a;});
    if(!seen)return;
    const cards=root.querySelector('.source-import-summary')?.querySelectorAll(':scope > div');
    if(cards?.[2]){const s=cards[2].querySelector('strong'),v=`${fmt(stations)} طن`;if(s&&s.textContent!==v)s.textContent=v;}
    if(cards?.[3]){const s=cards[3].querySelector('strong'),v=`${fmt(aziz)} طن`;if(s&&s.textContent!==v)s.textContent=v;}
  }
  function staged(){[500,1500,3000,5500,8500,11000].forEach(ms=>setTimeout(apply,ms));}
  function init(){const btn=$('analyzeSourceFilesBtn');if(!btn)return;btn.addEventListener('click',staged);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
