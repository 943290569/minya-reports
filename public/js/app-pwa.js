/* PWA install + limited offline snapshot */
(function(){
  const SNAP='minya_offline_snapshot_v1';
  let deferredPrompt=window.__MINYA_INSTALL_PROMPT__||null;

  function ensureManifest(){
    if(!document.querySelector('link[rel="manifest"]')){
      const l=document.createElement('link');
      l.rel='manifest';
      l.href='/manifest.webmanifest?v=stable10-pwa5';
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

  async function runInstall(){
    const prompt=deferredPrompt||window.__MINYA_INSTALL_PROMPT__;
    if(prompt){
      try{
        prompt.prompt();
        await prompt.userChoice;
        deferredPrompt=null;
        window.__MINYA_INSTALL_PROMPT__=null;
        if(isStandalone())document.getElementById('minyaInstallAppBtn')?.remove();
      }catch(_){}
      return;
    }
    alert('إذا لم تظهر نافذة التثبيت تلقائيًا: افتح قائمة المتصفح ⋮ ثم اختر "إضافة إلى الشاشة الرئيسية" أو "تثبيت التطبيق".');
  }

  function installButton(){
    const existing=document.getElementById('minyaInstallAppBtn');
    if(isStandalone()){
      existing?.remove();
      return true;
    }

    const panel=document.getElementById('minyaAppearancePanel');
    const actions=panel?.querySelector('.appearance-actions');
    if(!actions){
      if(existing && existing.closest('.top-header')) existing.remove();
      return false;
    }

    let button=document.getElementById('minyaInstallAppBtn');
    if(!button){
      button=document.createElement('button');
      button.id='minyaInstallAppBtn';
      button.type='button';
      button.className='minya-install-app';
      button.innerHTML='<span aria-hidden="true">⬇</span><b>تثبيت التطبيق</b>';
      button.onclick=runInstall;
    }
    if(button.parentElement!==actions) actions.insertBefore(button,actions.firstChild);
    button.hidden=false;
    return true;
  }

  function keepInstallInsideAppearance(){
    if(installButton()) return;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(installButton()||attempts>=40)clearInterval(timer);
    },250);
  }

  function init(){
    ensureManifest();
    keepInstallInsideAppearance();
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js?v=stable10-pwa5',{scope:'/'}).catch(()=>{});
    }
    window.addEventListener('beforeinstallprompt',e=>{
      e.preventDefault();
      deferredPrompt=e;
      window.__MINYA_INSTALL_PROMPT__=e;
      keepInstallInsideAppearance();
    });
    window.addEventListener('appinstalled',()=>{document.getElementById('minyaInstallAppBtn')?.remove();});
    window.addEventListener('online',()=>{document.getElementById('minyaOfflineCard')?.remove();saveSnapshot();});
    window.addEventListener('offline',offlineCard);
    const observer=new MutationObserver(()=>{
      const button=document.getElementById('minyaInstallAppBtn');
      if(button?.closest('.top-header')) button.remove();
      if(!isStandalone() && document.getElementById('minyaAppearancePanel')) installButton();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    saveSnapshot();offlineCard();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
