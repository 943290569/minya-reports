/* PWA install + limited offline snapshot */
(function(){
  const SNAP='minya_offline_snapshot_v1';
  let deferredPrompt=window.__MINYA_INSTALL_PROMPT__||null;

  function ensureManifest(){
    if(!document.querySelector('link[rel="manifest"]')){
      const l=document.createElement('link');
      l.rel='manifest';
      l.href='/manifest.webmanifest?v=stable10-pwa2';
      document.head.appendChild(l);
    }
    let meta=document.querySelector('meta[name="theme-color"]');
    if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta);}
    meta.content='#176b4f';
    if(!document.querySelector('meta[name="mobile-web-app-capable"]')){
      const m=document.createElement('meta');m.name='mobile-web-app-capable';m.content='yes';document.head.appendChild(m);
    }
  }

  function saveSnapshot(){
    if(!navigator.onLine)return;
    fetch('/api/reports',{cache:'no-store'}).then(r=>r.json()).then(d=>{
      const rows=Array.isArray(d.reports)?d.reports:[];
      const recent=rows.slice().sort((a,b)=>String(b.report_date||'').localeCompare(String(a.report_date||''))).slice(0,7).map(r=>({id:r.id,report_date:r.report_date,total_waste_tons:r.total_waste_tons,total_trucks:r.total_trucks,total_diesel:r.total_diesel,notes:r.notes||''}));
      localStorage.setItem(SNAP,JSON.stringify({saved_at:new Date().toISOString(),recent}));
    }).catch(()=>{});
  }

  function offlineCard(){
    if(navigator.onLine)return;
    const raw=localStorage.getItem(SNAP);if(!raw)return;
    let s;try{s=JSON.parse(raw);}catch{return;}
    const main=document.querySelector('.dashboard-home');if(!main||document.getElementById('minyaOfflineCard'))return;
    const rows=Array.isArray(s.recent)?s.recent:[];
    const el=document.createElement('section');el.id='minyaOfflineCard';el.className='minya-offline-card';
    el.innerHTML=`<strong>وضع بدون اتصال</strong><span>يعرض آخر ملخص محفوظ على هذا الجهاز.</span><div>${rows.slice(0,3).map(r=>`<b>${r.report_date||'-'} — ${Number(r.total_waste_tons||0).toLocaleString('en-US')} طن — ${Number(r.total_trucks||0).toLocaleString('en-US')} شاحنة</b>`).join('')}</div>`;
    main.prepend(el);
  }

  function isStandalone(){
    return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone===true;
  }

  function installButton(){
    if(document.getElementById('minyaInstallAppBtn')||isStandalone())return;
    const header=document.querySelector('.top-header');if(!header)return;
    const b=document.createElement('button');
    b.id='minyaInstallAppBtn';b.type='button';b.textContent='تثبيت التطبيق';b.hidden=false;b.className='minya-install-app';
    b.onclick=async()=>{
      const prompt=deferredPrompt||window.__MINYA_INSTALL_PROMPT__;
      if(prompt){
        try{
          prompt.prompt();
          await prompt.userChoice;
          deferredPrompt=null;window.__MINYA_INSTALL_PROMPT__=null;
          if(isStandalone())b.remove();
        }catch(_){}
        return;
      }
      alert('إذا لم تظهر نافذة التثبيت تلقائيًا: افتح قائمة المتصفح ⋮ ثم اختر "إضافة إلى الشاشة الرئيسية" أو "تثبيت التطبيق".');
    };
    header.appendChild(b);
  }

  function init(){
    ensureManifest();
    installButton();
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js?v=stable10-pwa2',{scope:'/'}).catch(()=>{});
    }
    window.addEventListener('beforeinstallprompt',e=>{
      e.preventDefault();
      deferredPrompt=e;window.__MINYA_INSTALL_PROMPT__=e;
      installButton();
      const b=document.getElementById('minyaInstallAppBtn');if(b)b.hidden=false;
    });
    window.addEventListener('appinstalled',()=>{document.getElementById('minyaInstallAppBtn')?.remove();});
    window.addEventListener('online',()=>{document.getElementById('minyaOfflineCard')?.remove();saveSnapshot();});
    window.addEventListener('offline',offlineCard);
    saveSnapshot();offlineCard();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
