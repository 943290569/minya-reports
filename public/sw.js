const CACHE_NAME='minya-pwa-v4';
const STATIC_ASSETS=['/','/style.css','/manifest.webmanifest','/assets/app-icon.svg','/assets/app-icon-maskable.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return;
  if(url.pathname.startsWith('/api/')) return;
  const isCode=/\.(?:css|js)$/i.test(url.pathname);
  const isOtherStatic=/\.(?:svg|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname)||url.pathname==='/manifest.webmanifest';
  if(isCode){
    event.respondWith(fetch(req).then(res=>{const clone=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,clone));return res;}).catch(()=>caches.match(req)));
    return;
  }
  if(isOtherStatic){
    event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{const clone=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,clone));return res;})));
    return;
  }
  if(req.mode==='navigate') event.respondWith(fetch(req).catch(()=>caches.match('/')));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const href=event.notification?.data?.href||'/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus' in client){client.navigate(href).catch(()=>{});return client.focus();}}
    return clients.openWindow?clients.openWindow(href):undefined;
  }));
});
