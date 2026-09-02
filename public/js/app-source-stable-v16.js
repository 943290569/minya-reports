/* V31 loader: legacy V17 overlay remains disabled. Load exact flat-Pivot landfill reader after the page scripts are ready. */
(function(){
  function load(){
    if(document.querySelector('script[data-landfill-v31]'))return;
    const s=document.createElement('script');
    s.src='js/app-source-landfill-flat-v31.js?v=3.3.0-landfill-flat-v31';
    s.dataset.landfillV31='1';
    s.onload=()=>{const b=document.querySelector('#sourceFilesPanel .drive-readonly');if(b)b.textContent='معاينة مستقرة V31';};
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();
