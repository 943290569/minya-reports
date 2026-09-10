/* Monthly entry navigation link */
(function(){
  const href='/monthly-entry.html';
  const label='إدخال بيانات الشهر';

  function mount(){
    const nav=document.querySelector('.top-header nav');
    if(!nav || nav.querySelector(`a[href="${href}"]`)) return;

    const link=document.createElement('a');
    link.href=href;
    link.className='app-nav-link';
    link.textContent=label;

    const monthly=nav.querySelector('a[href="/monthly"],a[href="/monthly.html"]');
    if(monthly && monthly.nextSibling) nav.insertBefore(link,monthly.nextSibling);
    else if(monthly) nav.appendChild(link);
    else nav.appendChild(link);

    const path=location.pathname.replace(/\/+$/,'')||'/';
    if(path===href.replace(/\/+$/,'')){
      nav.querySelectorAll('.app-nav-link').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===href));
    }
  }

  function init(){
    mount();
    let tries=0;
    const timer=setInterval(()=>{
      mount();
      if(++tries>=20) clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
