(function(){
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/admin') return;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const dt=v=>v?new Date(v).toLocaleString('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'-';
  const roleLabel={admin:'مدير',editor:'محرر',viewer:'قراءة فقط'};
  const emailOk=v=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const cleanMobile=v=>{let mobile=String(v||'').trim().replace(/[\s().-]/g,'');if(mobile.startsWith('00'))mobile=`+${mobile.slice(2)}`;return mobile;};
  const mobileOk=v=>!v||/^\+?\d{8,15}$/.test(cleanMobile(v));
  let currentUser=null;
  let managedUsers=[];
  async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;}
  function build(){
    if(document.getElementById('fullUserManagement')) return;
    const content=document.getElementById('v3Content'); if(!content)return;
    const section=document.createElement('section');
    section.id='fullUserManagement'; section.className='v3-panel user-management-panel';
    section.innerHTML=`
      <div class="user-management-head"><div><span>USERS</span><h3>إدارة المستخدمين</h3><p>إنشاء المستخدمين، إدارة البريد والجوال والصلاحيات، وإرسال رسائل SMS من الهاتف.</p></div><div class="user-management-actions"><button id="addUserBtn" class="v3-primary" type="button">إضافة مستخدم</button><button id="usersManageRefresh" type="button">تحديث</button></div></div>
      <div id="usersManageMsg" class="users-manage-msg"></div>
      <div id="userCreateDialog" class="user-edit-card hidden">
        <div class="user-edit-head"><div><span>مستخدم جديد</span><strong>إنشاء حساب جديد</strong></div><button id="closeUserCreate" type="button">إغلاق</button></div>
        <div class="user-edit-grid">
          <label>اسم المستخدم<input id="createUsername" type="text" autocomplete="off" placeholder="مثال: testadmin"></label>
          <label>البريد الإلكتروني<input id="createEmail" type="email" autocomplete="off" placeholder="name@example.com" dir="ltr"></label>
          <label>رقم الجوال<input id="createMobile" type="tel" autocomplete="tel" inputmode="tel" placeholder="0590000000 أو +970590000000" dir="ltr"></label>
          <label>الاسم الظاهر<input id="createDisplayName" type="text" autocomplete="off" placeholder="مثال: حساب اختبار"></label>
          <label>الصلاحية<select id="createRole"><option value="viewer">قراءة فقط</option><option value="editor">محرر</option><option value="admin">مدير</option></select></label>
          <label>كلمة المرور<input id="createPassword" type="password" autocomplete="new-password" placeholder="8 أحرف على الأقل"></label>
        </div>
        <small>البريد الإلكتروني اختياري، وإذا تمت إضافته يمكن استخدامه لتسجيل الدخول بدل اسم المستخدم.</small>
        <div class="user-edit-actions"><button id="saveNewUser" class="v3-primary" type="button">إنشاء المستخدم</button></div>
      </div>
      <div class="v3-table-wrap"><table class="v3-table users-manage-table"><thead><tr><th>المستخدم</th><th>البريد الإلكتروني</th><th>الجوال</th><th>الصلاحية</th><th>الحالة</th><th>الجلسات</th><th>آخر دخول</th><th>إجراءات</th></tr></thead><tbody id="usersManageBody"><tr><td colspan="8">جاري التحميل...</td></tr></tbody></table></div>
      <div id="userEditDialog" class="user-edit-card hidden">
        <div class="user-edit-head"><div><span>تعديل المستخدم</span><strong id="editUserTitle">-</strong></div><button id="closeUserEdit" type="button">إغلاق</button></div>
        <input id="editUserId" type="hidden">
        <div class="user-edit-grid">
          <label>الاسم الظاهر<input id="editDisplayName" type="text"></label>
          <label>البريد الإلكتروني<input id="editEmail" type="email" placeholder="name@example.com" dir="ltr"></label>
          <label>رقم الجوال<input id="editMobile" type="tel" autocomplete="tel" inputmode="tel" placeholder="0590000000 أو +970590000000" dir="ltr"></label>
          <label>الصلاحية<select id="editRole"><option value="viewer">قراءة فقط</option><option value="editor">محرر</option><option value="admin">مدير</option></select></label>
          <label>الحالة<select id="editActive"><option value="1">نشط</option><option value="0">موقوف</option></select></label>
          <label>كلمة مرور جديدة<input id="editPassword" type="password" placeholder="اتركها فارغة دون تغيير"></label>
        </div>
        <small>عند تغيير كلمة المرور سيتم إنهاء جميع جلسات هذا المستخدم تلقائيًا.</small>
        <div class="user-edit-actions"><button id="saveUserEdit" class="v3-primary" type="button">حفظ التعديلات</button><button id="logoutUserEverywhere" type="button">تسجيل خروج من جميع الأجهزة</button></div>
      </div>
      <div class="sms-compose-card">
        <div class="sms-compose-head"><div><span>SMS</span><h3>إرسال رسالة جوال</h3><p>يفتح تطبيق الرسائل بالرقم والنص، ثم ترسل الرسالة من هاتفك.</p></div></div>
        <div class="sms-compose-grid">
          <label>المستلم<select id="smsRecipient"><option value="">اختر مستخدمًا</option></select></label>
          <label>نص جاهز<select id="smsTemplate"><option value="">رسالة مخصصة</option><option value="pending">تقرير بانتظار المراجعة</option><option value="approved">تم اعتماد التقرير</option><option value="returned">إعادة التقرير للتعديل</option></select></label>
        </div>
        <label class="sms-message-label">نص الرسالة<textarea id="smsMessage" rows="4" maxlength="500" placeholder="اكتب نص الرسالة"></textarea></label>
        <div class="sms-compose-actions"><small><span id="smsCharCount">0</span> من 500 حرف</small><button id="openSmsApp" class="v3-primary" type="button">فتح تطبيق الرسائل</button></div>
        <div id="smsComposeMsg" class="users-manage-msg"></div>
      </div>`;
    const first=content.querySelector('.v3-admin-grid');
    if(first) content.insertBefore(section,first); else content.prepend(section);
  }
  function refs(){
    return {
      id:document.getElementById('editUserId'), title:document.getElementById('editUserTitle'), display:document.getElementById('editDisplayName'), email:document.getElementById('editEmail'), mobile:document.getElementById('editMobile'),
      role:document.getElementById('editRole'), active:document.getElementById('editActive'), password:document.getElementById('editPassword'),
      dialog:document.getElementById('userEditDialog'), logout:document.getElementById('logoutUserEverywhere'),
      msg:document.getElementById('usersManageMsg'), save:document.getElementById('saveUserEdit')
    };
  }
  function createRefs(){
    return {
      username:document.getElementById('createUsername'), email:document.getElementById('createEmail'), mobile:document.getElementById('createMobile'), display:document.getElementById('createDisplayName'), role:document.getElementById('createRole'),
      password:document.getElementById('createPassword'), dialog:document.getElementById('userCreateDialog'), save:document.getElementById('saveNewUser'), msg:document.getElementById('usersManageMsg')
    };
  }
  function openCreate(){
    const e=createRefs(); if(!e.username||!e.email||!e.mobile||!e.display||!e.role||!e.password||!e.dialog||!e.msg)return;
    e.username.value=''; e.email.value=''; e.mobile.value=''; e.display.value=''; e.role.value='viewer'; e.password.value=''; e.msg.textContent='';
    document.getElementById('userEditDialog')?.classList.add('hidden');
    e.dialog.classList.remove('hidden');
    e.username.focus();
  }
  function openEdit(user){
    if(!user)return;
    const e=refs(); if(!e.id||!e.title||!e.display||!e.email||!e.mobile||!e.role||!e.active||!e.password||!e.dialog||!e.logout||!e.msg)return;
    document.getElementById('userCreateDialog')?.classList.add('hidden');
    e.id.value=user.id; e.title.textContent=`${user.display_name} (${user.username})`;
    e.display.value=user.display_name||''; e.email.value=user.email||''; e.mobile.value=user.mobile||''; e.role.value=user.role; e.active.value=String(Number(Boolean(user.is_active))); e.password.value='';
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
      currentUser=me.user; const users=sec.users||[]; managedUsers=users;
      body.innerHTML=users.length?users.map(u=>`<tr data-user="${u.id}"><td><strong>${esc(u.display_name)}</strong><small>${esc(u.username)}${Number(u.id)===Number(currentUser.id)?' · حسابك':''}</small></td><td><span dir="ltr">${u.email?esc(u.email):'<span class="user-email-empty">—</span>'}</span></td><td><span dir="ltr">${u.mobile?esc(u.mobile):'—'}</span></td><td><span class="user-role role-${esc(u.role)}">${esc(roleLabel[u.role]||u.role)}</span></td><td><span class="user-state ${u.is_active?'active':'inactive'}">${u.is_active?'نشط':'موقوف'}</span></td><td>${Number(u.active_sessions||0)}</td><td>${dt(u.last_success_login)}</td><td><button class="manage-user-btn" type="button" data-user="${u.id}">إدارة</button><button class="sms-user-btn" type="button" data-user="${u.id}" ${u.mobile?'':'disabled'}>SMS</button></td></tr>`).join(''):`<tr><td colspan="8">لا توجد حسابات</td></tr>`;
      document.querySelectorAll('.manage-user-btn').forEach(btn=>btn.onclick=()=>openEdit(users.find(u=>String(u.id)===btn.dataset.user)));
      document.querySelectorAll('.sms-user-btn').forEach(btn=>btn.onclick=()=>selectSmsUser(users.find(u=>String(u.id)===btn.dataset.user)));
      fillSmsRecipients(users);
    }catch(err){body.innerHTML=`<tr><td colspan="8">${esc(err.message)}</td></tr>`;}
  }
  async function createUser(){
    const e=createRefs(); if(!e.username||!e.email||!e.mobile||!e.display||!e.role||!e.password||!e.dialog||!e.save||!e.msg)return;
    const username=e.username.value.trim(); const email=e.email.value.trim().toLowerCase(); const mobile=e.mobile.value.trim(); const display_name=e.display.value.trim(); const password=e.password.value; const role=e.role.value;
    if(!username){e.msg.textContent='اسم المستخدم مطلوب.';return;}
    if(email&&!emailOk(email)){e.msg.textContent='البريد الإلكتروني غير صالح.';return;}
    if(mobile&&!mobileOk(mobile)){e.msg.textContent='رقم الجوال غير صالح.';return;}
    if(password.length<8){e.msg.textContent='كلمة المرور يجب أن تكون 8 أحرف على الأقل.';return;}
    if(role==='admin'&&!confirm('سيتم إنشاء مستخدم بصلاحية مدير كاملة. هل تريد المتابعة؟'))return;
    e.save.disabled=true; e.msg.textContent='جاري إنشاء المستخدم...';
    try{
      await api('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,email,mobile,display_name:display_name||username,password,role})});
      e.msg.textContent='تم إنشاء المستخدم بنجاح'; e.dialog.classList.add('hidden'); await load();
    }catch(err){e.msg.textContent=err.message;}finally{e.save.disabled=false;}
  }
  async function save(){
    const e=refs(); if(!e.id||!e.display||!e.email||!e.mobile||!e.role||!e.active||!e.password||!e.msg||!e.save||!e.dialog)return;
    const id=Number(e.id.value); if(!id)return;
    const email=e.email.value.trim().toLowerCase();
    const mobile=e.mobile.value.trim();
    if(email&&!emailOk(email)){e.msg.textContent='البريد الإلكتروني غير صالح.';return;}
    if(mobile&&!mobileOk(mobile)){e.msg.textContent='رقم الجوال غير صالح.';return;}
    const payload={display_name:e.display.value.trim(),email,mobile,role:e.role.value,is_active:Number(e.active.value)};
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
  function fillSmsRecipients(users=managedUsers){
    const select=document.getElementById('smsRecipient'); if(!select)return;
    const selected=select.value;
    select.innerHTML='<option value="">اختر مستخدمًا</option>'+users.filter(user=>user.mobile).map(user=>`<option value="${user.id}">${esc(user.display_name)} — ${esc(user.mobile)}</option>`).join('');
    if(Array.from(select.options).some(option=>option.value===selected))select.value=selected;
  }
  function selectSmsUser(user){
    if(!user?.mobile)return;
    const select=document.getElementById('smsRecipient');
    const message=document.getElementById('smsMessage');
    const status=document.getElementById('smsComposeMsg');
    if(select)select.value=String(user.id);
    if(message&&!message.value)message.value=`مرحبًا ${user.display_name}، `;
    if(status)status.textContent=`المستلم: ${user.display_name} — ${user.mobile}`;
    updateSmsCount();
    document.querySelector('.sms-compose-card')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    message?.focus();
  }
  function updateSmsCount(){
    const message=document.getElementById('smsMessage');
    const count=document.getElementById('smsCharCount');
    if(message&&count)count.textContent=String(message.value.length);
  }
  function applySmsTemplate(){
    const type=document.getElementById('smsTemplate')?.value;
    const message=document.getElementById('smsMessage'); if(!message||!type)return;
    const templates={
      pending:'يوجد تقرير بانتظار المراجعة. يرجى الدخول إلى نظام إدارة مكب المنيا.',
      approved:'تم اعتماد التقرير في نظام إدارة مكب المنيا.',
      returned:'تمت إعادة التقرير للتعديل. يرجى الدخول إلى نظام إدارة مكب المنيا ومراجعة البيانات.'
    };
    message.value=templates[type]||''; updateSmsCount(); message.focus();
  }
  function openSmsApp(){
    const recipientId=document.getElementById('smsRecipient')?.value;
    const message=document.getElementById('smsMessage')?.value.trim()||'';
    const status=document.getElementById('smsComposeMsg');
    const user=managedUsers.find(item=>String(item.id)===String(recipientId));
    if(!user?.mobile){if(status)status.textContent='اختر مستخدمًا لديه رقم جوال.';return;}
    if(!message){if(status)status.textContent='اكتب نص الرسالة.';return;}
    const mobile=cleanMobile(user.mobile);
    if(!mobileOk(mobile)){if(status)status.textContent='رقم الجوال غير صالح.';return;}
    if(status)status.textContent='تم فتح تطبيق الرسائل. اضغط إرسال من هاتفك.';
    location.href=`sms:${mobile}?body=${encodeURIComponent(message)}`;
  }
  function init(){
    setTimeout(()=>{
      build(); load();
      document.getElementById('addUserBtn')?.addEventListener('click',openCreate);
      document.getElementById('closeUserCreate')?.addEventListener('click',()=>document.getElementById('userCreateDialog')?.classList.add('hidden'));
      document.getElementById('saveNewUser')?.addEventListener('click',createUser);
      document.getElementById('usersManageRefresh')?.addEventListener('click',load);
      document.getElementById('closeUserEdit')?.addEventListener('click',()=>document.getElementById('userEditDialog')?.classList.add('hidden'));
      document.getElementById('saveUserEdit')?.addEventListener('click',save);
      document.getElementById('logoutUserEverywhere')?.addEventListener('click',logoutAll);
      document.getElementById('smsTemplate')?.addEventListener('change',applySmsTemplate);
      document.getElementById('smsMessage')?.addEventListener('input',updateSmsCount);
      document.getElementById('openSmsApp')?.addEventListener('click',openSmsApp);
    },320);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
