(()=>{
  function mount(){
    if(document.getElementById('historicalSyncPanel'))return;
    const setup=document.getElementById('driveSetupPanel');
    if(!setup)return;
    const section=document.createElement('section');
    section.id='historicalSyncPanel';
    section.className='drive-panel';
    section.innerHTML=`
      <div class="drive-panel-head">
        <div><small>إصلاح البيانات القديمة</small><h3>المزامنة التاريخية</h3></div>
        <span class="drive-readonly">آمنة للتقارير الصفرية فقط</span>
      </div>
      <p>تفحص ملفات Google Drive وتستعيد تلقائيًا بيانات الأيام القديمة التي حُفظت في الموقع بقيم صفر، دون تعديل التقارير التي تحتوي بيانات صحيحة.</p>
      <div class="source-import-toolbar">
        <button id="historicalSyncBtn" type="button" class="drive-primary">بدء المزامنة التاريخية</button>
      </div>
      <div id="historicalSyncState" class="drive-state">اربط Google Drive أولًا، ثم اضغط بدء المزامنة.</div>`;
    setup.insertAdjacentElement('afterend',section);

    const state=document.getElementById('historicalSyncState');
    const conn=document.getElementById('driveConnectionState');
    const mirror=()=>{
      const t=String(conn?.textContent||'').trim();
      if(!t)return;
      if(/مزامنة|إصلاح|تقريرًا صفريًا|تقارير صفرية|تعذر الإصلاح/.test(t)){
        state.textContent=t;
        state.className=conn.className||'drive-state';
      }else if(/تم ربط/.test(t)){
        state.textContent='Drive مربوط وجاهز. اضغط «بدء المزامنة التاريخية».';
        state.className='drive-state ok';
      }
    };
    if(conn)new MutationObserver(mirror).observe(conn,{childList:true,subtree:true,characterData:true,attributes:true});
    mirror();

    document.getElementById('historicalSyncBtn').addEventListener('click',()=>{
      const panel=document.getElementById('driveFilesPanel');
      const refresh=document.getElementById('refreshDriveFilesBtn');
      const connected=panel && !panel.classList.contains('hidden');
      if(!connected){
        state.textContent='اربط Google Drive أولًا من القسم أعلاه.';
        state.className='drive-state error';
        document.getElementById('connectDriveBtn')?.scrollIntoView({behavior:'smooth',block:'center'});
        return;
      }
      state.textContent='جاري بدء المزامنة التاريخية وفحص ملفات Drive...';
      state.className='drive-state';
      if(refresh)refresh.click();
      else state.textContent='تعذر بدء المزامنة: زر تحديث Drive غير متاح.';
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();