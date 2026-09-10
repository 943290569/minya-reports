(()=>{
  function init(){
    const btn=document.getElementById('addNewApproveBtn');
    const save=document.getElementById('saveBtn');
    const status=document.getElementById('status');
    if(!btn||!save)return;

    btn.textContent='إنشاء التقارير الجديدة تلقائيًا';

    btn.addEventListener('click',()=>{
      const newRows=[...document.querySelectorAll('#rowsBody tr')].filter(r=>r.querySelector('.me-badge.new'));
      if(!newRows.length){
        if(status)status.textContent='لا توجد تقارير جديدة غير محفوظة في هذا الشهر.';
        return;
      }

      let activated=0;
      newRows.forEach(row=>{
        const editable=row.querySelector('input[data-i][data-key],select[data-i][data-key]');
        if(!editable)return;
        editable.dispatchEvent(new Event('input',{bubbles:true}));
        activated++;
      });

      if(!activated){
        if(status)status.textContent='تعذر تجهيز التقارير الجديدة للحفظ.';
        return;
      }

      if(status)status.textContent=`تم تجهيز ${activated} تقريرًا جديدًا بالقواعد التلقائية. كميات النفايات والمحطات والسولار والمعدات تبقى صفرًا، وسيتم حفظها دون اعتماد.`;
      setTimeout(()=>save.click(),50);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();