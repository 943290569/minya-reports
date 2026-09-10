(()=>{
  function setStatus(text,isError=false){
    const el=document.getElementById('status');
    if(!el)return;
    el.textContent=text;
    el.style.color=isError?'#a32121':'#60736a';
  }

  function init(){
    const btn=document.getElementById('addNewApproveBtn');
    const save=document.getElementById('saveBtn');
    const body=document.getElementById('rowsBody');
    if(!btn||!save||!body)return;

    btn.textContent='إنشاء التقارير الجديدة تلقائيًا';

    btn.addEventListener('click',async()=>{
      const newRows=[...body.querySelectorAll('tr')].filter(tr=>tr.querySelector('.me-badge.new'));
      if(!newRows.length){
        setStatus('لا توجد تقارير جديدة لإنشائها في هذا الشهر.',true);
        return;
      }

      btn.disabled=true;
      setStatus(`جاري تجهيز ${newRows.length} تقريرًا جديدًا بالقيم التلقائية...`);

      try{
        // تفعيل كل يوم جديد داخل نموذج الإدخال الشهري بدون الحاجة لإدخال المستخدم.
        // يكفي إرسال حدث input على أحد الحقول الموجودة في الصف ليعتبره النموذج يومًا فعالًا للحفظ.
        for(const tr of newRows){
          const input=tr.querySelector('input[data-i][data-key],select[data-i][data-key]');
          if(!input)continue;
          input.dispatchEvent(new Event('input',{bubbles:true}));
        }

        // إتاحة دورة رسم واحدة حتى تُطبَّق قواعد الدوام/الطقس/المياه قبل الحفظ.
        await new Promise(resolve=>requestAnimationFrame(resolve));

        setStatus(`تم تجهيز ${newRows.length} تقريرًا جديدًا. جاري الحفظ لأول مرة دون اعتماد...`);
        save.click();
      }catch(err){
        console.error(err);
        setStatus('تعذر إنشاء التقارير الجديدة تلقائيًا.',true);
      }finally{
        setTimeout(()=>{btn.disabled=false;},1000);
      }
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();