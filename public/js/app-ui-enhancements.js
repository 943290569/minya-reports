/* System-wide visual state enhancement — no business logic changes */
(function(){
  const emptyPhrases=[
    "لا توجد بيانات",
    "لا توجد نتائج",
    "لا توجد تقارير",
    "لا توجد سجلات",
    "لا توجد تقارير في هذه الفترة",
    "لا توجد سجلات صيانة"
  ];

  function classifyEmptyCells(root=document){
    root.querySelectorAll('td[colspan]').forEach(td=>{
      const text=(td.textContent||'').trim();
      if(emptyPhrases.some(p=>text.includes(p))) td.classList.add('minya-empty-state');
      else td.classList.remove('minya-empty-state');
    });
  }

  function classifyMessages(root=document){
    root.querySelectorAll('#maintMsg,.message,[id$="Msg"],[class*="message"]').forEach(el=>{
      const text=(el.textContent||'').trim();
      if(!text) return;
      el.classList.add('minya-ui-message');
      el.classList.remove('is-success','is-warning','is-error');
      if(/تم |نجاح|حفظ|مكتمل|سليم|لا توجد تنبيهات/.test(text)) el.classList.add('is-success');
      else if(/خطأ|فشل|تعذر|غير مسموح|مرفوض/.test(text)) el.classList.add('is-error');
      else if(/تحذير|تنبيه|مطلوب|قيد|انتظار/.test(text)) el.classList.add('is-warning');
    });
  }

  function enhance(root=document){
    classifyEmptyCells(root);
    classifyMessages(root);
  }

  function start(){
    enhance();
    let queued=false;
    const observer=new MutationObserver(mutations=>{
      if(queued) return;
      queued=true;
      requestAnimationFrame(()=>{
        queued=false;
        mutations.forEach(m=>{
          if(m.target && m.target.nodeType===1) enhance(m.target.closest?.('main') || document);
        });
      });
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
