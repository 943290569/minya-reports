(function(){
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/admin') return;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const dt=v=>v?new Date(v).toLocaleString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'-';
  const roleLabel={admin:'مدير',editor:'محرر',viewer:'قراءة فقط'};
  let currentUser=null;
  async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;}
  function build(){
    if(document.getElementById('fullUserManagement')) return;
    const content=document.getElementById('v3Content'); if(!content)return;
    const section=document.createElement('section');
    section.id='fullUserManagement'; section.className='v3-panel user-management-panel';
    section.innerHTML=`
      <div class="user-management-head"><div><span>USERS</span><h3>إدارة المستخدمين</h3><p>تعديل الصلاحيات، تفعيل الحسابات، وتغيير كلمات المرور بأمان.</p></div><button id="usersManageRefresh" type="button">تحديث</button></div>
      <div id="usersManageMsg" class="users-manage-msg"></div>
      <div class="v3-table-wrap"><table class="v3-table users-manage-table"><thead><tr><th>المستخدم</th><th>الصلاحية</th><th>الحالة</th><th>الجلسات</th><th>آخر دخول</th><th>إجراءات</th></tr></thead><tbody id="usersManageBody"><tr><td colspan="6">جاري التحميل...</td></tr></tbody></table></div>
      <div id="userEditDialog" class="user-edit-card hidden">
        <div class="user-edit-head"><div><span>تعديل المستخدم</span><strong id="editUserTitle">-</strong></div><button id="closeUserEdit" type="button">إغلاق</button></div>
        <input id="editUserId" type="hidden">
        <div class="user-edit-grid">
          <label>الاسم الظاهر<input id="editDisplayName" type="text"></label>
          <label>الصلاحية<select id="editRole"><option value="viewer">قراءة فقط</option><option value="editor">محرر</option><option value="admin">مدير</option></select></label>
          <label>الحالة<select id="editActive"><option value="1">نشط</option><option value="0">موقوف</option></select></label>
          <label>كلمة مرور جديدة<input id="editPassword" type="password" placeholder="اتركها فارغة دون تغيير"></label>
        </div>
        <small>عند تغيير كلمة المرور سيتم إنهاء جميع جلسات هذا المستخدم تلقائيًا.</small>
        <div class="user-edit-actions"><button id="saveUserEdit" class="v3-primary" type="button">حفظ التعديلات</button><button id="logoutUserEverywhere" type="button">تسجيل خروج من جميع الأجهزة</button></div>
      </div>`;
    const first=content.querySelector('.v3-admin-grid');
    if(first) content.insertBefore(section,first); else content.prepend(section);
  }
  function refs(){
    return {
      id:document.getElementById('editUserId'), title:document.getElementById('editUserTitle'), display:document.getElementById('editDisplayName'),
      role:document.getElementById('editRole'), active:document.getElementById('editActive'), password:document.getElementById('editPassword'),
      dialog:document.getElementById('userEditDialog'), logout:document.getElementById('logoutUserEverywhere'),
      msg:document.getElementById('usersManageMsg'), save:document.getElementById('saveUserEdit')
    };
  }
  function openEdit(user){
    if(!user)return;
    const e=refs(); if(!e.id||!e.title||!e.display||!e.role||!e.active||!e.password||!e.dialog||!e.logout||!e.msg)return;
    e.id.value=user.id; e.title.textContent=`${user.display_name} (${user.username})`;
    e.display.value=user.display_name||''; e.role.value=user.role; e.active.value=String(Number(Boolean(user.is_active))); e.password.value='';
    e.dialog.classList.remove('hidden');
    const self=Number(user.id)===Number(currentUser?.id);
    e.active.disabled=self;
    e.logout.disabled=Number(user.active_sessions||0)===0;
    e.msg.textContent=self?'هذا هو حسابك الحالي؛ لا يمكن إيقافه من هذه الجلسة.':'';
    e.dialog.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  async function load(){
    build(); const body=document.getElementById('usersManageBody'); if(!body)return;
    try{
      const [me,sec]=await Promise.all([api('/api/auth/me'),api('/api/security/sessions')]);
      currentUser=me.user; const users=sec.users||[];
      body.innerHTML=users.length?users.map(u=>`<tr data-user="${u.id}"><td><strong>${esc(u.display_name)}</strong><small>${esc(u.username)}${Number(u.id)===Number(currentUser.id)?' · حسابك':''}</small></td><td><span class="user-role role-${esc(u.role)}">${esc(roleLabel[u.role]||u.role)}</span></td><td><span class="user-state ${u.is_active?'active':'inactive'}">${u.is_active?'نشط':'موقوف'}</span></td><td>${Number(u.active_sessions||0)}</td><td>${dt(u.last_success_login)}</td><td><button class="manage-user-btn" type="button" data-user="${u.id}">إدارة</button></td></tr>`).join(''):`<tr><td colspan="6">لا توجد حسابات</td></tr>`;
      document.querySelectorAll('.manage-user-btn').forEach(btn=>btn.onclick=()=>openEdit(users.find(u=>String(u.id)===btn.dataset.user)));
    }catch(err){body.innerHTML=`<tr><td colspan="6">${esc(err.message)}</td></tr>`;}
  }
  async function save(){
    const e=refs(); if(!e.id||!e.display||!e.role||!e.active||!e.password||!e.msg||!e.save||!e.dialog)return;
    const id=Number(e.id.value); if(!id)return;
    const payload={display_name:e.display.value.trim(),role:e.role.value,is_active:Number(e.active.value)};
    if(e.password.value) payload.password=e.password.value;
    if(payload.password&&payload.password.length<8){e.msg.textContent='كلمة المرور يجب أن تكون 8 أحرف على الأقل.';return;}
    const sensitive=payload.role==='admin'||payload.is_active===0||Boolean(payload.password);
    if(sensitive&&!confirm('هذا تغيير حساس على حساب المستخدم. هل تريد المتابعة؟'))return;
    e.save.disabled=true; e.msg.textContent='جاري حفظ التعديلات...';
    try{
      const d=await api(`/api/users/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      e.msg.textContent=d.message||'تم تحديث المستخدم'; e.password.value=''; await load(); e.dialog.classList.add('hidden');
    }catch(err){e.msg.textContent=err.message;}finally{e.save.disabled=false;}
  }
  async function logoutAll(){
    const e=refs(); if(!e.id||!e.msg||!e.dialog)return;
    const id=Number(e.id.value); if(!id)return;
    if(Number(id)===Number(currentUser?.id)){if(!confirm('سيتم تسجيل خروج حسابك من جميع الأجهزة بما فيها هذه الجلسة. متابعة؟'))return;}
    else if(!confirm('إنهاء جميع جلسات هذا المستخدم؟'))return;
    try{
      const d=await api(`/api/security/users/${id}/logout-all`,{method:'POST'}); e.msg.textContent=`تم إنهاء ${d.count||0} جلسة`;
      if(Number(id)===Number(currentUser?.id)){location.reload();return;}
      await load(); e.dialog.classList.add('hidden');
    }catch(err){e.msg.textContent=err.message;}
  }
  function init(){
    setTimeout(()=>{
      build(); load();
      document.getElementById('usersManageRefresh')?.addEventListener('click',load);
      document.getElementById('closeUserEdit')?.addEventListener('click',()=>document.getElementById('userEditDialog')?.classList.add('hidden'));
      document.getElementById('saveUserEdit')?.addEventListener('click',save);
      document.getElementById('logoutUserEverywhere')?.addEventListener('click',logoutAll);
    },320);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
