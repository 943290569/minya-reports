/* Local PWA notifications — no paid push service */
(function(){
  const ENABLED_KEY='minya_local_notifications_enabled_v1';
  const SENT_KEY='minya_local_notifications_sent_v1';
  let enabled=localStorage.getItem(ENABLED_KEY)==='1';

  function isStandalone(){return window.matchMedia?.('(display-mode: standalone)')?.matches||window.navigator.standalone===true;}
  function readSent(){try{return JSON.parse(localStorage.getItem(SENT_KEY)||'{}')||{};}catch{return {};}}
  function writeSent(v){try{localStorage.setItem(SENT_KEY,JSON.stringify(v));}catch{}}
  function fingerprint(item){return `${item.title||''}|${item.text||''}|${item.href||''}`;}

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

  async function requestEnable(){
    if(!('Notification' in window)){alert('هذا الجهاز أو المتصفح لا يدعم إشعارات الويب.');return;}
    const permission=await Notification.requestPermission();
    enabled=permission==='granted';
    localStorage.setItem(ENABLED_KEY,enabled?'1':'0');
    renderState();
    if(enabled){await show('تم تفعيل التنبيهات','سيعرض التطبيق التنبيهات المهمة على هذا الجهاز.','/');notifyItems(window.MINYA_NOTIFICATIONS||[]);}else if(permission==='denied')alert('تم رفض إذن الإشعارات. يمكنك تغييره لاحقًا من إعدادات الموقع في المتصفح.');
  }

  function disable(){enabled=false;localStorage.setItem(ENABLED_KEY,'0');renderState();}

  function renderState(){
    const b=document.getElementById('minyaEnableNotificationsBtn');if(!b)return;
    const granted='Notification' in window&&Notification.permission==='granted';
    if(enabled&&granted){b.textContent='التنبيهات مفعّلة';b.dataset.active='true';b.title='اضغط لإيقاف تنبيهات هذا الجهاز';b.onclick=disable;}
    else{b.textContent='تفعيل تنبيهات الجوال';b.dataset.active='false';b.title='السماح للتطبيق بعرض التنبيهات المهمة';b.onclick=requestEnable;}
  }

  function mount(){
    if(document.getElementById('minyaEnableNotificationsBtn'))return;
    const header=document.querySelector('.top-header');if(!header)return;
    const b=document.createElement('button');b.id='minyaEnableNotificationsBtn';b.type='button';b.className='minya-enable-notifications';header.appendChild(b);renderState();
    document.documentElement.dataset.pwaInstalled=isStandalone()?'true':'false';
  }

  function init(){
    mount();
    window.addEventListener('minya-notifications-updated',e=>notifyItems(e.detail?.items||[]));
    if(Array.isArray(window.MINYA_NOTIFICATIONS))notifyItems(window.MINYA_NOTIFICATIONS);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
