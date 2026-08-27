(function(){
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/admin') return;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const dt=v=>v?new Date(v).toLocaleString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'-';
  async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;}
  function build(){
    if(document.getElementById('adminSecurityPanel')) return;
    const content=document.getElementById('v3Content'); if(!content) return;
    const panel=document.createElement('section'); panel.id='adminSecurityPanel'; panel.className='v3-panel admin-security-panel';
    panel.innerHTML=`<div class="security-head"><div><span>SECURITY</span><h3>أمان الدخول والجلسات</h3></div><button id="securityRefresh" type="button">تحديث</button></div>
      <div class="security-kpis"><div><span>الجلسات النشطة</span><strong id="secSessions">0</strong></div><div><span>المستخدمون النشطون</span><strong id="secUsers">0</strong></div><div><span>آخر دخول ناجح</span><strong id="secLastLogin">-</strong></div><div><span>آخر محاولة فاشلة</span><strong id="secLastFailed">-</strong></div></div>
      <div class="security-actions"><button id="securityCleanup" type="button">تنظيف الجلسات المنتهية</button><small id="securityMsg"></small></div>
      <div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>المستخدم</th><th>الصلاحية</th><th>الجلسات</th><th>آخر دخول</th><th>آخر محاولة فاشلة</th><th>إجراء</th></tr></thead><tbody id="securityUsersBody"></tbody></table></div>
      <h4>الجلسات النشطة</h4><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>المستخدم</th><th>بداية الجلسة</th><th>تنتهي</th><th>إجراء</th></tr></thead><tbody id="securitySessionsBody"></tbody></table></div>`;
    content.appendChild(panel);
  }
  async function load(){
    build();
    const ub=document.getElementById('securityUsersBody');
    const sb=document.getElementById('securitySessionsBody');
    const sessionsCount=document.getElementById('secSessions');
    const usersCount=document.getElementById('secUsers');
    const lastLogin=document.getElementById('secLastLogin');
    const lastFailed=document.getElementById('secLastFailed');
    const msg=document.getElementById('securityMsg');
    if(!ub||!sb||!sessionsCount||!usersCount||!lastLogin||!lastFailed||!msg)return;
    try{
      const d=await api('/api/security/sessions'); const users=d.users||[], sessions=d.sessions||[];
      sessionsCount.textContent=sessions.length;
      usersCount.textContent=users.filter(x=>x.is_active).length;
      const last=users.map(x=>x.last_success_login).filter(Boolean).sort().slice(-1)[0];
      const failed=users.map(x=>x.last_failed_login).filter(Boolean).sort().slice(-1)[0];
      lastLogin.textContent=dt(last); lastFailed.textContent=dt(failed);
      ub.innerHTML=users.length?users.map(u=>`<tr><td><strong>${esc(u.display_name)}</strong><small>${esc(u.username)}</small></td><td>${esc(u.role)}</td><td>${u.active_sessions||0}</td><td>${dt(u.last_success_login)}</td><td>${dt(u.last_failed_login)}</td><td><button class="logout-all" data-user="${u.id}" ${u.active_sessions?``:`disabled`}>خروج من كل الأجهزة</button></td></tr>`).join(''):`<tr><td colspan="6">لا توجد بيانات</td></tr>`;
      sb.innerHTML=sessions.length?sessions.map(s=>`<tr><td>${esc(s.display_name)}<small>${esc(s.username)}</small></td><td>${dt(s.created_at)}</td><td>${dt(s.expires_at)}</td><td><button class="revoke-session" data-session="${s.id}">إنهاء الجلسة</button></td></tr>`).join(''):`<tr><td colspan="4">لا توجد جلسات نشطة</td></tr>`;
      document.querySelectorAll('.logout-all').forEach(b=>b.onclick=async()=>{if(!confirm('إنهاء جميع جلسات هذا المستخدم؟'))return;try{await api(`/api/security/users/${b.dataset.user}/logout-all`,{method:'POST'});msg.textContent='تم إنهاء الجلسات';load();}catch(e){msg.textContent=e.message;}});
      document.querySelectorAll('.revoke-session').forEach(b=>b.onclick=async()=>{if(!confirm('إنهاء هذه الجلسة؟'))return;try{await api(`/api/security/sessions/${b.dataset.session}`,{method:'DELETE'});msg.textContent='تم إنهاء الجلسة';load();}catch(e){msg.textContent=e.message;}});
    }catch(e){ub.innerHTML=`<tr><td colspan="6">${esc(e.message)}</td></tr>`;}
  }
  function init(){
    setTimeout(()=>{
      build(); load();
      document.getElementById('securityRefresh')?.addEventListener('click',load);
      document.getElementById('securityCleanup')?.addEventListener('click',async()=>{
        const msg=document.getElementById('securityMsg');
        try{const d=await api('/api/security/cleanup',{method:'POST'});if(msg)msg.textContent=`تم حذف ${d.sessions_removed||0} جلسة منتهية و${d.attempts_removed||0} محاولة قديمة`;load();}
        catch(e){if(msg)msg.textContent=e.message;}
      });
    },250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
