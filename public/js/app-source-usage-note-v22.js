/* V22: clarify Pivot quantity + vehicle-count fields in selective-reading note. */
(function(){
  const $=id=>document.getElementById(id);
  function apply(){
    const root=$('sourceFilesPreview');if(!root)return;
    const note=[...root.querySelectorAll('.drive-preview-note')].find(el=>el.textContent.includes('القراءة الانتقائية:'));
    if(!note)return;
    note.innerHTML='<strong>القراءة الانتقائية:</strong> المكب: التاريخ + الجهة/نوع الوارد + الكمية + العدد/المركبات — المحطات: التاريخ + المحطة + الكمية + عدد الشاحنات — عزيز: التاريخ + الكمية + عدد الشاحنات — السولار: التاريخ + أعمدة آليات المكب فقط. بقية الأعمدة تم تجاهلها.';
  }
  function schedule(){[150,400,900,1800,3500,6000,9500,12500].forEach(ms=>setTimeout(apply,ms));}
  function loadScript(src,key){if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.src=src;s.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]='1';document.body.appendChild(s);}
  function loadApproval(){
    loadScript('js/app-source-approve-v4.js?v=3.3.0-source-approve-v4','source-approve-v4');
    loadScript('js/app-source-conflict-bulk-v5.js?v=3.3.0-source-conflict-bulk-v5','source-conflict-bulk-v5');
    loadScript('js/app-source-landfill-dedupe-v61.js?v=3.3.0-landfill-dedupe-v61','source-landfill-dedupe-v61');
  }
  function init(){const btn=$('analyzeSourceFilesBtn');if(btn)btn.addEventListener('click',schedule);loadApproval();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
