(()=>{
  let selected=null;
  let lastBulk=null;

  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));

  function tablePanel(){
    return $('.me-table')?.closest('.me-panel')||null;
  }

  function installPanel(){
    if($('#bulkEditPanel'))return;
    const target=tablePanel();
    if(!target)return;
    const panel=document.createElement('section');
    panel.id='bulkEditPanel';
    panel.className='me-panel me-bulk-panel';
    panel.innerHTML=`
      <div class="me-bulk-head">
        <div>
          <strong>تعديل عمود كامل</strong>
          <small>اضغط على عنوان أي عمود في الجدول، ثم اكتب القيمة مرة واحدة.</small>
        </div>
        <span id="bulkSelectedName" class="me-bulk-selected">لم يتم تحديد عمود</span>
      </div>
      <div class="me-bulk-actions">
        <div id="bulkValueWrap" class="me-bulk-value"><input id="bulkValue" type="text" placeholder="حدد عمودًا أولًا" disabled></div>
        <button id="bulkApplyBtn" class="me-btn me-primary" type="button" disabled>تطبيق على العمود</button>
        <button id="bulkUndoBtn" class="me-btn me-secondary" type="button" disabled>تراجع عن التعديل الجماعي</button>
        <button id="bulkClearBtn" class="me-btn me-secondary" type="button" disabled>إلغاء التحديد</button>
      </div>
      <div id="bulkEditState" class="me-bulk-state">يمكن تعديل جميع أيام الشهر الظاهرة في العمود بضغطة واحدة، ثم استخدام «تحديث البيانات» للحفظ.</div>`;
    target.parentNode.insertBefore(panel,target);

    $('#bulkApplyBtn').addEventListener('click',applyBulk);
    $('#bulkUndoBtn').addEventListener('click',undoBulk);
    $('#bulkClearBtn').addEventListener('click',clearSelection);
  }

  function headers(){
    return $$('.me-table thead tr:nth-child(2) th');
  }

  function controlsForColumn(index){
    return $$('#rowsBody tr').map(tr=>tr.children[index+1]?.querySelector('[data-i][data-key]')).filter(Boolean);
  }

  function decorateHeaders(){
    installPanel();
    headers().forEach((th,index)=>{
      const controls=controlsForColumn(index);
      if(!controls.length){
        th.classList.remove('me-bulk-editable','me-bulk-selected-col');
        delete th.dataset.bulkIndex;
        return;
      }
      th.classList.add('me-bulk-editable');
      th.dataset.bulkIndex=String(index);
      th.title='اضغط لتعديل هذا العمود كاملًا';
      th.classList.toggle('me-bulk-selected-col',selected?.index===index);
    });
  }

  function makeEditor(control){
    const wrap=$('#bulkValueWrap');
    if(!wrap)return null;
    wrap.innerHTML='';
    let editor;
    if(control.tagName==='SELECT'){
      editor=document.createElement('select');
      for(const option of control.options){
        editor.appendChild(option.cloneNode(true));
      }
      editor.value=control.value;
    }else{
      editor=document.createElement('input');
      editor.type=control.type||'text';
      if(editor.type==='number')editor.step='any';
      editor.value=control.value??'';
      editor.placeholder='أدخل القيمة الجديدة';
    }
    editor.id='bulkValue';
    wrap.appendChild(editor);
    return editor;
  }

  function selectColumn(th){
    const index=Number(th.dataset.bulkIndex);
    if(!Number.isInteger(index))return;
    const controls=controlsForColumn(index);
    if(!controls.length)return;
    selected={index,label:String(th.textContent||'').trim(),key:controls[0].dataset.key||''};
    const editor=makeEditor(controls[0]);
    $('#bulkSelectedName').textContent=`العمود المحدد: ${selected.label}`;
    $('#bulkApplyBtn').disabled=false;
    $('#bulkClearBtn').disabled=false;
    $('#bulkEditState').textContent=`سيتم تطبيق القيمة على ${controls.length} يومًا في عمود «${selected.label}».`;
    decorateHeaders();
    editor?.focus();
    editor?.select?.();
  }

  function triggerValue(control,value){
    control.value=value;
    control.dispatchEvent(new Event('input',{bubbles:true}));
    if(control.tagName==='SELECT')control.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function applyBulk(){
    if(!selected)return;
    const editor=$('#bulkValue');
    if(!editor)return;
    const controls=controlsForColumn(selected.index);
    if(!controls.length)return;

    lastBulk={
      label:selected.label,
      items:controls.map(control=>({
        i:control.dataset.i,
        key:control.dataset.key,
        value:control.value
      }))
    };

    const value=editor.value;
    controls.forEach(control=>triggerValue(control,value));
    $('#bulkUndoBtn').disabled=false;
    $('#bulkEditState').textContent=`تم تطبيق «${value}» على ${controls.length} يومًا في عمود «${selected.label}». اضغط «تحديث البيانات» لحفظ التغيير.`;
  }

  function findControl(item){
    return $$(`[data-i="${item.i}"]`).find(el=>el.dataset.key===item.key)||null;
  }

  function undoBulk(){
    if(!lastBulk)return;
    let restored=0;
    for(const item of lastBulk.items){
      const control=findControl(item);
      if(!control)continue;
      triggerValue(control,item.value);
      restored++;
    }
    $('#bulkEditState').textContent=`تم التراجع عن آخر تعديل جماعي وإعادة ${restored} قيمة.`;
    lastBulk=null;
    $('#bulkUndoBtn').disabled=true;
  }

  function clearSelection(){
    selected=null;
    $('#bulkSelectedName').textContent='لم يتم تحديد عمود';
    $('#bulkValueWrap').innerHTML='<input id="bulkValue" type="text" placeholder="حدد عمودًا أولًا" disabled>';
    $('#bulkApplyBtn').disabled=true;
    $('#bulkClearBtn').disabled=true;
    $('#bulkEditState').textContent='اضغط على عنوان العمود الذي تريد تغيير قيمه دفعة واحدة.';
    decorateHeaders();
  }

  document.addEventListener('click',e=>{
    const th=e.target.closest?.('.me-table thead tr:nth-child(2) th.me-bulk-editable');
    if(th){
      e.preventDefault();
      selectColumn(th);
    }
  });

  function init(){
    installPanel();
    decorateHeaders();
    const thead=$('.me-table thead');
    const tbody=$('#rowsBody');
    if(thead)new MutationObserver(()=>decorateHeaders()).observe(thead,{childList:true,subtree:true});
    if(tbody)new MutationObserver(()=>decorateHeaders()).observe(tbody,{childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
