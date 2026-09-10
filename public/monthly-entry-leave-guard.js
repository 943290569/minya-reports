(()=>{
  let dirty=false;
  let busy=false;
  let allowLeave=false;
  const status=()=>document.getElementById('status');
  const isEditorTarget=el=>!!el?.closest?.('#rowsBody input,#rowsBody select,#rowsBody textarea');
  const setBusy=v=>{busy=!!v;};
  const shouldWarn=()=>!allowLeave&&(dirty||busy);
  const warningText=()=>busy
    ? 'توجد عملية جارية الآن. إذا غادرت الصفحة أو حدّثتها فقد تتوقف العملية أو لا يكتمل الحفظ. هل تريد المتابعة؟'
    : 'لديك تعديلات لم تُحفظ بعد. إذا غادرت الصفحة أو حدّثتها ستفقد هذه التعديلات. هل تريد المتابعة؟';

  document.addEventListener('input',e=>{if(isEditorTarget(e.target))dirty=true;},true);
  document.addEventListener('change',e=>{if(isEditorTarget(e.target))dirty=true;},true);

  document.addEventListener('click',e=>{
    const id=e.target?.closest?.('button')?.id;
    if(['saveBtn','commitBtn','addNewApproveBtn','loadBtn'].includes(id)) setBusy(true);
  },true);

  const s=status();
  if(s){
    new MutationObserver(()=>{
      const t=String(s.textContent||'').trim();
      if(/^(تم|جاهز)|نجاح|اكتمل|لا توجد|لا يوجد|خطأ|تعذر|يوجد تقارير/.test(t)){
        busy=false;
        if(/تم (حفظ|تحديث|اعتماد|تحميل)|تم إنشاء|تمت/.test(t)) dirty=false;
      } else if(/جاري|سيتم/.test(t)) busy=true;
    }).observe(s,{childList:true,subtree:true,characterData:true});
  }

  window.addEventListener('beforeunload',e=>{
    if(!shouldWarn())return;
    e.preventDefault();
    e.returnValue='';
  });

  document.addEventListener('click',e=>{
    if(!shouldWarn())return;
    const a=e.target?.closest?.('a[href]');
    const refresh=e.target?.closest?.('#refreshPageBtn');
    if(!a&&!refresh)return;
    if(a&&(/^(#|javascript:)/i.test(a.getAttribute('href')||'')))return;
    if(!window.confirm(warningText())){
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    allowLeave=true;
  },true);

  window.MINYA_MONTHLY_LEAVE_GUARD={
    markDirty(){dirty=true;},
    setBusy,
    clear(){dirty=false;busy=false;},
    getState(){return{dirty,busy};}
  };
})();