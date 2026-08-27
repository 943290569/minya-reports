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
  function openEdit(user){
    editUserId.value=user.id; editUserTitle.textContent=`${user.display_name} (${user.username})`;
    editDisplayName.value=user.display_name||''; editRole.value=user.role; editActive.value=String(Number(Boolean(user.is_active))); editPassword.value='';
    userEditDialog.classList.remove('hidden');
    const self=Number(user.id)===Number(currentUser?.id);
    editActive.disabled=self;
    logoutUserEverywhere.disabled=Number(user.active_sessions||0)===0;
    usersManageMsg.textContent=self?'هذا هو حسابك الحالي؛ لا يمكن إيقافه من هذه الجلسة.':'';
    userEditDialog.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  async function load(){
    build(); const body=document.getElementById('usersManageBody'); if(!body)return;
    try{
      const [me,sec]=await Promise.all([api('/api/auth/me'),api('/api/security/sessions')]);
      currentUser=me.user; const users=sec.users||[];
      body.innerHTML=users.length?users.map(u=>`<tr data-user="${u.id}"><td><strong>${esc(u.display_name)}</strong><small>${esc(u.username)}${Number(u.id)===Number(currentUser.id)?' · حسابك':''}</small></td><td><span class="user-role role-${esc(u.role)}">${esc(roleLabel[u.role]||u.role)}</span></td><td><span class="user-state ${u.is_active?'active':'inactive'}">${u.is_active?'نشط':'موقوف'}</span></td><td>${Number(u.active_sessions||0)}</td><td>${dt(u.last_success_login)}</td><td><button class="manage-user-btn" type="button" data-user="${u.id}">إدارة</button></td></tr>`).join(''):`<tr><td colspan="6">لا توجد حسابات</td></tr>`;
      document.querySelectorAll('.manage-user-btn').forEach(btn=>btn.onclick=()=>openEdit(users.find(u=>String(u.id)===btn.dataset.user)));
    }catch(e){body.innerHTML=`<tr><td colspan="6">${esc(e.message)}</td></tr>`;}
  }
  async function save(){
    const id=Number(editUserId.value); if(!id)return;
    const payload={display_name:editDisplayName.value.trim(),role:editRole.value,is_active:Number(editActive.value)};
    if(editPassword.value) payload.password=editPassword.value;
    if(payload.password&&payload.password.length<8){usersManageMsg.textContent='كلمة المرور يجب أن تكون 8 أحرف على الأقل.';return;}
    const sensitive=payload.role==='admin'||payload.is_active===0||Boolean(payload.password);
    if(sensitive&&!confirm('هذا تغيير حساس على حساب المستخدم. هل تريد المتابعة؟'))return;
    saveUserEdit.disabled=true; usersManageMsg.textContent='جاري حفظ التعديلات...';
    try{
      const d=await api(`/api/users/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      usersManageMsg.textContent=d.message||'تم تحديث المستخدم'; editPassword.value=''; await load(); userEditDialog.classList.add('hidden');
    }catch(e){usersManageMsg.textContent=e.message;}finally{saveUserEdit.disabled=false;}
  }
  async function logoutAll(){
    const id=Number(editUserId.value); if(!id)return;
    if(Number(id)===Number(currentUser?.id)){if(!confirm('سيتم تسجيل خروج حسابك من جميع الأجهزة بما فيها هذه الجلسة. متابعة؟'))return;}
    else if(!confirm('إنهاء جميع جلسات هذا المستخدم؟'))return;
    try{const d=await api(`/api/security/users/${id}/logout-all`,{method:'POST'});usersManageMsg.textContent=`تم إنهاء ${d.count||0} جلسة`;if(Number(id)===Number(currentUser?.id)){location.reload();return;}await load();userEditDialog.classList.add('hidden');}catch(e){usersManageMsg.textContent=e.message;}
  }
  function init(){setTimeout(()=>{build();load();document.getElementById('usersManageRefresh')?.addEventListener('click',load);document.getElementById('closeUserEdit')?.addEventListener('click',()=>userEditDialog.classList.add('hidden'));document.getElementById('saveUserEdit')?.addEventListener('click',save);document.getElementById('logoutUserEverywhere')?.addEventListener('click',logoutAll);},320);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
