(()=>{
  const modifiedDates=new Set();
  let saveScope='';
  let bypassPrompt=false;
  const originalFetch=window.fetch.bind(window);

  function setStatus(text,error=false){
    const el=document.getElementById('status');
    if(!el)return;
    el.textContent=text;
    el.style.color=error?'#a32121':'#60736a';
  }

  function trackModified(event){
    const el=event.target?.closest?.('[data-i][data-key]');
    if(!el)return;
    const tr=el.closest('tr[data-date]');
    const date=tr?.dataset?.date;
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))modifiedDates.add(date);
  }

  function ensureDialog(){
    let overlay=document.getElementById('commitScopeOverlay');
    if(overlay)return overlay;

    const style=document.createElement('style');
    style.textContent=`
      .me-scope-overlay{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.48);display:none;align-items:center;justify-content:center;padding:18px}
      .me-scope-overlay.is-open{display:flex}
      .me-scope-dialog{width:min(560px,96vw);background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(15,23,42,.28);padding:22px;direction:rtl;text-align:right}
      .me-scope-dialog h3{margin:0 0 8px;color:#17392d;font-size:20px}
      .me-scope-dialog p{margin:0 0 18px;color:#5c6f66;line-height:1.7}
      .me-scope-options{display:grid;gap:10px}
      .me-scope-choice{border:1px solid #c9d8d1;border-radius:12px;background:#fbfefd;padding:14px;text-align:right;cursor:pointer;color:#17392d}
      .me-scope-choice strong{display:block;font-size:15px;margin-bottom:4px}
      .me-scope-choice small{display:block;color:#64748b;line-height:1.5}
      .me-scope-choice:hover{border-color:#176b4f;background:#f1f8f4}
      .me-scope-choice:disabled{opacity:.48;cursor:not-allowed;background:#f8faf9}
      .me-scope-choice.all{background:#176b4f;color:#fff;border-color:#176b4f}
      .me-scope-choice.all small{color:#e4f2eb}
      .me-scope-footer{display:flex;justify-content:flex-start;margin-top:14px}
      .me-scope-cancel{border:0;background:transparent;color:#64748b;padding:8px 10px;cursor:pointer;font-weight:700}
    `;
    document.head.appendChild(style);

    overlay=document.createElement('div');
    overlay.id='commitScopeOverlay';
    overlay.className='me-scope-overlay';
    overlay.innerHTML=`
      <div class="me-scope-dialog" role="dialog" aria-modal="true" aria-labelledby="commitScopeTitle">
        <h3 id="commitScopeTitle">اعتماد التقارير بعد التعديل</h3>
        <p>كيف تريد حفظ البيانات قبل اعتماد التقارير؟</p>
        <div class="me-scope-options">
          <button id="commitModifiedOnlyBtn" class="me-scope-choice" type="button">
            <strong>حفظ واعتماد البيانات المعدلة فقط</strong>
            <small id="commitModifiedOnlyText">سيتم حفظ الأيام التي عدلتها فقط.</small>
          </button>
          <button id="commitAllDataBtn" class="me-scope-choice all" type="button">
            <strong>حفظ واعتماد جميع بيانات الشهر</strong>
            <small>سيتم حفظ جميع الأيام المفعلة ثم تنفيذ الاعتماد.</small>
          </button>
        </div>
        <div class="me-scope-footer"><button id="commitScopeCancelBtn" class="me-scope-cancel" type="button">إلغاء</button></div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener('click',e=>{if(e.target===overlay)closeDialog();});
    document.getElementById('commitScopeCancelBtn').addEventListener('click',closeDialog);
    document.getElementById('commitModifiedOnlyBtn').addEventListener('click',()=>runCommit('modified'));
    document.getElementById('commitAllDataBtn').addEventListener('click',()=>runCommit('all'));
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('is-open'))closeDialog();});
    return overlay;
  }

  function openDialog(){
    const overlay=ensureDialog();
    const count=modifiedDates.size;
    const btn=document.getElementById('commitModifiedOnlyBtn');
    const text=document.getElementById('commitModifiedOnlyText');
    btn.disabled=count===0;
    text.textContent=count?`سيتم حفظ واعتماد ${count} يومًا تم تعديلها فقط دون المساس بباقي أيام الشهر.`:'لا توجد تعديلات جديدة مسجلة منذ تحميل الشهر.';
    overlay.classList.add('is-open');
    (count?btn:document.getElementById('commitAllDataBtn')).focus();
  }

  function closeDialog(){document.getElementById('commitScopeOverlay')?.classList.remove('is-open');}

  function runCommit(scope){
    if(scope==='modified'&&!modifiedDates.size){setStatus('لا توجد بيانات معدلة لاعتمادها.',true);return;}
    saveScope=scope;
    closeDialog();
    const btn=document.getElementById('commitBtn');
    if(!btn)return;
    bypassPrompt=true;
    btn.click();
    bypassPrompt=false;
  }

  function parseBody(body){
    if(typeof body!=='string')return null;
    try{return JSON.parse(body)}catch{return null}
  }

  window.fetch=async function(input,init={}){
    const url=typeof input==='string'?input:String(input?.url||'');
    const method=String(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
    let nextInit=init;

    if(saveScope==='modified'&&method==='PUT'&&/\/api\/monthly-entry(?:\?|$)/.test(url)){
      const body=parseBody(init.body);
      if(body&&Array.isArray(body.rows)){
        body.rows=body.rows.filter(row=>modifiedDates.has(String(row.report_date||'')));
        nextInit={...init,body:JSON.stringify(body)};
      }
    }

    if(saveScope==='modified'&&method==='POST'&&url.includes('/api/monthly-entry/commit')){
      const body=parseBody(init.body)||{};
      body.dates=[...modifiedDates].sort();
      nextInit={...init,body:JSON.stringify(body)};
    }

    const response=await originalFetch(input,nextInit);
    if(method==='POST'&&url.includes('/api/monthly-entry/commit')){
      if(response.ok){
        modifiedDates.clear();
        saveScope='';
      }
    }
    return response;
  };

  document.addEventListener('input',trackModified,true);
  document.addEventListener('change',trackModified,true);
  document.addEventListener('click',e=>{
    const id=e.target?.id;
    if(id==='loadBtn'){
      modifiedDates.clear();
      saveScope='';
      return;
    }
    if(id!=='commitBtn'||bypassPrompt)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openDialog();
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureDialog,{once:true});else ensureDialog();
})();
