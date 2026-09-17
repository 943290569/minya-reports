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
        <div><small>استعادة البيانات القديمة</small><h3>استعادة يناير–مارس من Google Drive</h3></div>
        <span class="drive-readonly">ينشئ المفقود ويحدّث الموجود</span>
      </div>
      <p>تقرأ العملية التقارير اليومية الأصلية من Google Drive، وتنشئ الأيام المفقودة في الموقع وتحدّث الأيام القديمة غير المكتملة.</p>
      <div class="source-import-toolbar">
        <button id="historicalSyncBtn" type="button" class="drive-primary">بدء الاستعادة الآن</button>
      </div>
      <div id="historicalSyncState" class="drive-state">اربط Google Drive أولًا، ثم اضغط «بدء الاستعادة الآن».</div>`;
    setup.insertAdjacentElement('afterend',section);

    const state=document.getElementById('historicalSyncState');
    const conn=document.getElementById('driveConnectionState');
    const mirror=()=>{
      const t=String(conn?.textContent||'').trim();
      if(!t)return;
      if(/استعاد|إنشاء|تحديث|تعذر/.test(t)){
        state.textContent=t;
        state.className=conn.className||'drive-state';
      }else if(/تم ربط/.test(t)){
        state.textContent='Drive مربوط وجاهز. اضغط «بدء الاستعادة الآن».';
        state.className='drive-state ok';
      }
    };
    if(conn)new MutationObserver(mirror).observe(conn,{childList:true,subtree:true,characterData:true,attributes:true});
    mirror();

    document.getElementById('historicalSyncBtn').addEventListener('click',async()=>{
      const panel=document.getElementById('driveFilesPanel');
      const connected=panel && !panel.classList.contains('hidden');
      if(!connected){
        state.textContent='اربط Google Drive أولًا من القسم أعلاه.';
        state.className='drive-state error';
        document.getElementById('connectDriveBtn')?.scrollIntoView({behavior:'smooth',block:'center'});
        return;
      }
      if(typeof window.MINYA_RUN_HISTORICAL_REPAIR!=='function'){
        state.textContent='أداة الاستعادة لم تُحمّل. نفّذ Ctrl + F5 ثم أعد المحاولة.';
        state.className='drive-state error';
        return;
      }
      state.textContent='جاري استعادة التقارير من Drive...';
      state.className='drive-state';
      await window.MINYA_RUN_HISTORICAL_REPAIR();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();