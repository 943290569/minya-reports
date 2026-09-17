(()=>{
  let selectedKey='';
  let selectedLabel='';
  let lastBulk=null;

  const $=s=>document.querySelector(s);
  const $$=s=>Array.from(document.querySelectorAll(s));

  function tablePanel(){return $('.me-table')?.closest('.me-panel')||null;}

  function controlsForKey(key){
    if(!key)return[];
    return $$('#rowsBody [data-i][data-key]').filter(el=>el.dataset.key===key);
  }

  function editableColumns(){
    const ths=$$('.me-table thead tr:nth-child(2) th');
    const firstRow=$('#rowsBody tr');
    if(!firstRow)return[];
    const out=[];
    ths.forEach((th,index)=>{
      const control=firstRow.children[index+1]?.querySelector('[data-i][data-key]');
      if(!control)return;
      out.push({key:control.dataset.key||'',label:String(th.textContent||'').trim(),index,control});
    });
    return out;
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
          <strong>تعديل عمود لجميع أيام الشهر</strong>
          <small>اختر العمود ثم استخدم قيمة واحدة لجميع الأيام، أو ألصق عمودًا كاملًا من Excel.</small>
        </div>
        <span id="bulkSelectedName" class="me-bulk-selected">لم يتم تحديد عمود</span>
      </div>
      <div class="me-bulk-actions">
        <label class="me-bulk-column-label">العمود
          <select id="bulkColumnSelect"><option value="">اختر العمود</option></select>
        </label>
        <div id="bulkValueWrap" class="me-bulk-value"><input id="bulkValue" type="text" placeholder="اختر العمود أولًا" disabled></div>
        <button id="bulkApplyBtn" class="me-btn me-primary" type="button" disabled>تطبيق قيمة واحدة على جميع الأيام</button>
        <button id="bulkUndoBtn" class="me-btn me-secondary" type="button" disabled>تراجع عن آخر تطبيق</button>
        <button id="bulkClearBtn" class="me-btn me-secondary" type="button">إلغاء التحديد</button>
      </div>
      <div class="me-bulk-paste-box">
        <label>لصق عمود كامل من Excel
          <textarea id="bulkColumnPaste" rows="5" placeholder="انسخ عمودًا من Excel ثم الصقه هنا بـ Ctrl + V" disabled></textarea>
        </label>
        <div class="me-bulk-paste-row">
          <span id="bulkPasteCount">0 قيمة</span>
          <button id="bulkPasteApplyBtn" class="me-btn me-primary" type="button" disabled>تطبيق القيم على العمود</button>
        </div>
      </div>
      <div id="bulkEditState" class="me-bulk-state">اختر عمودًا من القائمة أو اضغط على عنوان العمود في الجدول.</div>`;
    target.parentNode.insertBefore(panel,target);

    $('#bulkColumnSelect').addEventListener('change',()=>selectByKey($('#bulkColumnSelect').value));
    $('#bulkApplyBtn').addEventListener('click',applyBulk);
    $('#bulkPasteApplyBtn').addEventListener('click',applyPastedColumn);
    $('#bulkColumnPaste').addEventListener('input',updatePasteCount);
    $('#bulkUndoBtn').addEventListener('click',undoBulk);
    $('#bulkClearBtn').addEventListener('click',clearSelection);
  }

  function refreshColumnOptions(){
    installPanel();
    const select=$('#bulkColumnSelect');
    if(!select)return;
    const cols=editableColumns();
    const current=selectedKey;
    select.innerHTML='<option value="">اختر العمود</option>'+cols.map(c=>`<option value="${escapeHtml(c.key)}">${escapeHtml(c.label)}</option>`).join('');
    if(current&&cols.some(c=>c.key===current))select.value=current;
    else if(current){selectedKey='';selectedLabel='';}
    decorateHeaders(cols);
    updatePasteCount();
  }

  function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}

  function decorateHeaders(cols=editableColumns()){
    $$('.me-table thead tr:nth-child(2) th').forEach(th=>{
      th.classList.remove('me-bulk-editable','me-bulk-selected-col');
      delete th.dataset.bulkKey;
    });
    cols.forEach(c=>{
      const th=$$('.me-table thead tr:nth-child(2) th')[c.index];
      if(!th)return;
      th.classList.add('me-bulk-editable');
      th.dataset.bulkKey=c.key;
      th.title='اضغط لاختيار هذا العمود للتعديل على جميع أيام الشهر';
      if(c.key===selectedKey)th.classList.add('me-bulk-selected-col');
    });
  }

  function makeEditor(control){
    const wrap=$('#bulkValueWrap');
    if(!wrap||!control)return null;
    wrap.innerHTML='';
    let editor;
    if(control.tagName==='SELECT'){
      editor=document.createElement('select');
      for(const option of control.options)editor.appendChild(option.cloneNode(true));
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

  function selectByKey(key){
    if(!key){clearSelection();return;}
    const col=editableColumns().find(c=>c.key===key);
    const controls=controlsForKey(key);
    if(!col||!controls.length){clearSelection();return;}
    selectedKey=key;
    selectedLabel=col.label;
    $('#bulkColumnSelect').value=key;
    const editor=makeEditor(controls[0]);
    $('#bulkSelectedName').textContent=`العمود المحدد: ${selectedLabel}`;
    $('#bulkApplyBtn').disabled=false;
    $('#bulkColumnPaste').disabled=false;
    $('#bulkEditState').textContent=`يمكن تطبيق قيمة واحدة أو لصق ${controls.length} قيمة بالترتيب على عمود «${selectedLabel}».`;
    decorateHeaders();
    updatePasteCount();
    editor?.focus();
    editor?.select?.();
  }

  function normalizeForControl(control,raw){
    const v=String(raw??'').trim();
    if(control.tagName==='SELECT'){
      const options=[...control.options];
      let hit=options.find(o=>o.value===v)||options.find(o=>o.text.trim()===v);
      if(!hit&&/عطلة|طوارئ/.test(v))hit=options.find(o=>o.value==='holiday');
      if(!hit&&/رسمي|دوام/.test(v))hit=options.find(o=>o.value==='official');
      return hit?{ok:true,value:hit.value}:{ok:false,value:v};
    }
    if(control.type==='number'){
      const value=v.replace(/,/g,'').replace(/٫/g,'.');
      return value===''||Number.isFinite(Number(value))?{ok:true,value}:{ok:false,value};
    }
    return{ok:true,value:v};
  }

  function triggerValue(control,value){
    control.value=value;
    control.dispatchEvent(new Event('input',{bubbles:true}));
    control.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function rememberCurrent(controls){
    lastBulk={
      key:selectedKey,
      label:selectedLabel,
      items:controls.map(control=>({i:control.dataset.i,key:control.dataset.key,value:control.value}))
    };
  }

  function applyBulk(){
    if(!selectedKey)return;
    const editor=$('#bulkValue');
    if(!editor)return;
    const controls=controlsForKey(selectedKey);
    if(!controls.length)return;
    const normalized=normalizeForControl(controls[0],editor.value);
    if(!normalized.ok){
      $('#bulkEditState').textContent='القيمة المدخلة غير مقبولة لهذا العمود.';
      return;
    }

    rememberCurrent(controls);
    controls.forEach(control=>triggerValue(control,normalized.value));
    $('#bulkUndoBtn').disabled=false;
    $('#bulkEditState').textContent=`تم تطبيق «${normalized.value}» على جميع أيام الشهر (${controls.length} يومًا) في عمود «${selectedLabel}». اضغط «تحديث البيانات» للحفظ.`;
    const status=$('#status');
    if(status)status.textContent=`تم تعديل عمود «${selectedLabel}» لجميع أيام الشهر — اضغط تحديث البيانات للحفظ`;
  }

  function pastedValues(){
    const area=$('#bulkColumnPaste');
    if(!area)return[];
    const raw=String(area.value||'').replace(/\r/g,'');
    if(!raw)return[];
    const lines=raw.split('\n');
    while(lines.length&&lines.at(-1)==='')lines.pop();
    return lines.map(line=>{
      const cells=line.split('\t');
      return cells[0]??'';
    });
  }

  function updatePasteCount(){
    const count=$('#bulkPasteCount');
    const btn=$('#bulkPasteApplyBtn');
    if(!count||!btn)return;
    const values=pastedValues();
    const expected=selectedKey?controlsForKey(selectedKey).length:0;
    count.textContent=expected?`${values.length} / ${expected} قيمة`:`${values.length} قيمة`;
    btn.disabled=!selectedKey||values.length!==expected||expected===0;
    count.classList.toggle('is-ok',!!expected&&values.length===expected);
    count.classList.toggle('is-error',values.length>0&&!!expected&&values.length!==expected);
  }

  function applyPastedColumn(){
    if(!selectedKey)return;
    const controls=controlsForKey(selectedKey);
    const values=pastedValues();
    if(!controls.length)return;
    if(values.length!==controls.length){
      $('#bulkEditState').textContent=`عدد القيم الملصقة ${values.length} لا يساوي عدد أيام الشهر ${controls.length}. لم يتم تغيير أي قيمة.`;
      updatePasteCount();
      return;
    }

    const normalized=[];
    for(let i=0;i<controls.length;i++){
      const n=normalizeForControl(controls[i],values[i]);
      if(!n.ok){
        $('#bulkEditState').textContent=`القيمة في الصف ${i+1} غير مقبولة لهذا العمود. لم يتم تغيير أي قيمة.`;
        return;
      }
      normalized.push(n.value);
    }

    rememberCurrent(controls);
    controls.forEach((control,i)=>triggerValue(control,normalized[i]));
    $('#bulkUndoBtn').disabled=false;
    $('#bulkEditState').textContent=`تم لصق ${controls.length} قيمة على عمود «${selectedLabel}» من أول يوم إلى آخر يوم. اضغط «تحديث البيانات» للحفظ.`;
    const status=$('#status');
    if(status)status.textContent=`تم لصق عمود «${selectedLabel}» كاملًا (${controls.length} يومًا) — اضغط تحديث البيانات للحفظ`;
  }

  function findControl(item){
    return $$('#rowsBody [data-i][data-key]').find(el=>el.dataset.i===item.i&&el.dataset.key===item.key)||null;
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
    $('#bulkEditState').textContent=`تم التراجع وإعادة ${restored} قيمة في عمود «${lastBulk.label}».`;
    lastBulk=null;
    $('#bulkUndoBtn').disabled=true;
  }

  function clearSelection(){
    selectedKey='';selectedLabel='';
    const select=$('#bulkColumnSelect');if(select)select.value='';
    $('#bulkSelectedName').textContent='لم يتم تحديد عمود';
    $('#bulkValueWrap').innerHTML='<input id="bulkValue" type="text" placeholder="اختر العمود أولًا" disabled>';
    $('#bulkApplyBtn').disabled=true;
    const area=$('#bulkColumnPaste');if(area){area.value='';area.disabled=true;}
    $('#bulkPasteApplyBtn').disabled=true;
    $('#bulkEditState').textContent='اختر عمودًا من القائمة أو اضغط على عنوان العمود في الجدول.';
    updatePasteCount();
    decorateHeaders();
  }

  document.addEventListener('click',e=>{
    const th=e.target.closest?.('.me-table thead tr:nth-child(2) th.me-bulk-editable');
    if(!th)return;
    e.preventDefault();
    selectByKey(th.dataset.bulkKey||'');
  });

  function init(){
    installPanel();
    refreshColumnOptions();
    const thead=$('.me-table thead');
    const tbody=$('#rowsBody');
    let timer=null;
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(refreshColumnOptions,30);};
    if(thead)new MutationObserver(schedule).observe(thead,{childList:true,subtree:true});
    if(tbody)new MutationObserver(schedule).observe(tbody,{childList:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
