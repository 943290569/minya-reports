/* Web Push + local notification controls — free, no paid service */
(function(){
  const ENABLED_KEY='minya_local_notifications_enabled_v1';
  const SENT_KEY='minya_local_notifications_sent_v1';
  let enabled=localStorage.getItem(ENABLED_KEY)==='1';
  let observer=null;

  function isStandalone(){return window.matchMedia?.('(display-mode: standalone)')?.matches||window.navigator.standalone===true;}
  function readSent(){try{return JSON.parse(localStorage.getItem(SENT_KEY)||'{}')||{};}catch{return {};}}
  function writeSent(v){try{localStorage.setItem(SENT_KEY,JSON.stringify(v));}catch{}}
  function fingerprint(item){return `${item.title||''}|${item.text||''}|${item.href||''}`;}
  function urlBase64ToUint8Array(base64String){
    const padding='='.repeat((4-base64String.length%4)%4);
    const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64);const out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  async function json(url,options={}){
    const response=await fetch(url,{cache:'no-store',...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok===false)throw new Error(data.message||'تعذر تنفيذ العملية');
    return data;
  }

  async function show(title,body,href='/'){
    if(!enabled||Notification.permission!=='granted'||!('serviceWorker' in navigator))return;
    try{
      const reg=await navigator.serviceWorker.ready;
      await reg.showNotification(title,{body,icon:'/assets/app-icon.svg',badge:'/assets/app-icon.svg',tag:`minya-${title}-${body}`.slice(0,120),renotify:false,data:{href}});
    }catch(_){ }
  }

  async function notifyItems(items){
    if(!enabled||Notification.permission!=='granted')return;
    const sent=readSent();const now=Date.now();
    Object.keys(sent).forEach(k=>{if(now-Number(sent[k]||0)>36*60*60*1000)delete sent[k];});
    for(const item of (Array.isArray(items)?items:[])){
      if(!['danger','warning'].includes(item.tone))continue;
      const key=fingerprint(item);if(sent[key])continue;
      await show(item.title||'تنبيه من مكب المنيا',item.text||'',item.href||'/');sent[key]=now;
    }
    writeSent(sent);
  }

  async function ensurePushSubscription(){
    if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('هذا الجهاز لا يدعم Web Push.');
    const reg=await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub){
      const data=await json('/api/push/public-key');
      sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(data.publicKey)});
    }
    await json('/api/push/subscribe',{method:'POST',body:JSON.stringify({subscription:sub.toJSON()})});
    return sub;
  }

  async function requestEnable(){
    if(!('Notification' in window)){alert('هذا الجهاز أو المتصفح لا يدعم إشعارات الويب.');return;}
    try{
      const permission=await Notification.requestPermission();
      if(permission!=='granted'){
        enabled=false;localStorage.setItem(ENABLED_KEY,'0');renderState();
        if(permission==='denied')alert('تم رفض إذن الإشعارات. يمكنك تغييره لاحقًا من إعدادات الموقع في المتصفح.');
        return;
      }
      await ensurePushSubscription();
      enabled=true;localStorage.setItem(ENABLED_KEY,'1');renderState();
      await show('تم تفعيل التنبيهات','أصبحت تنبيهات السيرفر مفعّلة على هذا الجهاز حتى عند إغلاق التطبيق.','/');
      notifyItems(window.MINYA_NOTIFICATIONS||[]);
    }catch(error){
      enabled=false;localStorage.setItem(ENABLED_KEY,'0');renderState();
      alert(error.message||'تعذر تفعيل تنبيهات الجوال.');
    }
  }

  async function disable(){
    try{
      if('serviceWorker' in navigator){
        const reg=await navigator.serviceWorker.ready;
        const sub=await reg.pushManager?.getSubscription();
        if(sub){
          try{await json('/api/push/subscribe',{method:'DELETE',body:JSON.stringify({endpoint:sub.endpoint})});}catch(_){ }
          await sub.unsubscribe().catch(()=>{});
        }
      }
    }finally{
      enabled=false;localStorage.setItem(ENABLED_KEY,'0');renderState();
    }
  }

  async function testPush(){
    const b=document.getElementById('minyaTestNotificationsBtn');
    if(b){b.disabled=true;b.textContent='جاري الإرسال...';}
    try{
      if(!enabled||Notification.permission!=='granted')throw new Error('فعّل التنبيهات أولًا.');
      await ensurePushSubscription();
      const data=await json('/api/push/test',{method:'POST',body:'{}'});
      if(!data.sent)throw new Error(data.message||'لم يتم إرسال الإشعار.');
    }catch(error){alert(error.message||'تعذر إرسال الإشعار التجريبي.');}
    finally{if(b){b.disabled=false;b.textContent='اختبار التنبيه';}}
  }

  async function syncServerState(){
    if(!enabled||Notification.permission!=='granted')return;
    try{await ensurePushSubscription();}catch(_){ }
  }

  function renderState(){
    const b=document.getElementById('minyaEnableNotificationsBtn');
    const test=document.getElementById('minyaTestNotificationsBtn');
    const status=document.getElementById('minyaNotificationsSettingStatus');
    const supported='Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window;
    const granted='Notification' in window&&Notification.permission==='granted';
    if(status){
      if(!supported) status.textContent='Web Push غير مدعوم على هذا الجهاز.';
      else if(enabled&&granted) status.textContent='مفعّلة — تصل التنبيهات حتى عند إغلاق التطبيق.';
      else if(Notification.permission==='denied') status.textContent='الإذن مرفوض من إعدادات المتصفح.';
      else status.textContent='غير مفعّلة على هذا الجهاز.';
    }
    if(test)test.hidden=!(enabled&&granted);
    if(!b)return;
    if(enabled&&granted){b.textContent='إيقاف تنبيهات الجوال';b.dataset.active='true';b.title='إيقاف تنبيهات هذا الجهاز';b.onclick=disable;}
    else{b.textContent='تفعيل تنبيهات الجوال';b.dataset.active='false';b.title='تفعيل Web Push على هذا الجهاز';b.onclick=requestEnable;}
  }

  function removeHeaderButton(){
    const old=document.querySelector('.top-header #minyaEnableNotificationsBtn');
    if(old)old.remove();
  }

  function mountInSettings(){
    removeHeaderButton();
    if(document.getElementById('minyaNotificationsSettingsSection')){renderState();return true;}
    const panel=document.getElementById('minyaAppearancePanel');
    if(!panel)return false;
    const actions=panel.querySelector('.appearance-actions');
    if(!actions)return false;

    const section=document.createElement('section');
    section.id='minyaNotificationsSettingsSection';
    section.className='minya-notifications-settings';
    section.innerHTML=`
      <div class="minya-notifications-settings-copy">
        <strong>تنبيهات الجوال</strong>
        <span id="minyaNotificationsSettingStatus">جاري التحقق...</span>
      </div>
      <div class="minya-notifications-settings-actions">
        <button id="minyaEnableNotificationsBtn" type="button" class="minya-enable-notifications"></button>
        <button id="minyaTestNotificationsBtn" type="button" class="minya-test-notifications" hidden>اختبار التنبيه</button>
      </div>
    `;
    actions.insertAdjacentElement('beforebegin',section);
    section.querySelector('#minyaTestNotificationsBtn')?.addEventListener('click',testPush);
    renderState();
    return true;
  }

  function watchForSettings(){
    if(mountInSettings())return;
    if(observer)return;
    observer=new MutationObserver(()=>{
      if(mountInSettings()){
        observer.disconnect();
        observer=null;
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function init(){
    document.documentElement.dataset.pwaInstalled=isStandalone()?'true':'false';
    removeHeaderButton();watchForSettings();syncServerState();
    window.addEventListener('minya-notifications-updated',e=>notifyItems(e.detail?.items||[]));
    if(Array.isArray(window.MINYA_NOTIFICATIONS))notifyItems(window.MINYA_NOTIFICATIONS);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
