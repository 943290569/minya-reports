(()=>{
  let selectedRow=null;
  function markRow(row){
    if(!row)return;
    document.querySelectorAll('#rowsBody tr').forEach(r=>r.classList.remove('me-selected-new-row'));
    selectedRow=row;
    row.classList.add('me-selected-new-row');
  }
  function init(){
    const btn=document.getElementById('addNewApproveBtn');
    const save=document.getElementById('saveBtn');
    const status=document.getElementById('status');
    const body=document.getElementById('rowsBody');
    if(!btn||!save)return;

    btn.textContent='حفظ تقرير جديد لأول مرة';

    body?.addEventListener('focusin',e=>{
      const row=e.target.closest('tr');
      if(row)markRow(row);
    });
    body?.addEventListener('click',e=>{
      const row=e.target.closest('tr');
      if(row)markRow(row);
    });

    btn.addEventListener('click',()=>{
      let row=selectedRow;
      if(!row||!document.body.contains(row)||!row.querySelector('.me-badge.new')){
        row=[...document.querySelectorAll('#rowsBody tr')].find(r=>r.querySelector('.me-badge.new'))||null;
      }
      if(!row){
        if(status)status.textContent='لا يوجد يوم جديد للحفظ في هذا الشهر.';
        return;
      }
      const editable=row.querySelector('input[data-i][data-key],select[data-i][data-key]');
      if(!editable){
        if(status)status.textContent='تعذر تحديد بيانات اليوم الجديد.';
        return;
      }
      markRow(row);
      editable.dispatchEvent(new Event('input',{bubbles:true}));
      if(status)status.textContent='تم تحديد اليوم الجديد وسيتم حفظه لأول مرة دون اعتماد.';
      save.click();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();