(function(){
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/admin') return;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const fmtDate=v=>v?new Date(v).toLocaleString('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'-';
  async function api(url,options){const r=await fetch(url,options);const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;}

  function mount(){
    if(document.getElementById('guestLinksPanel')) return;
    const content=document.getElementById('v3Content');
    if(!content) return;
    const panel=document.createElement('section');
    panel.id='guestLinksPanel';
    panel.className='v3-panel';
    panel.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px">
        <div><span style="font-size:11px;font-weight:800;color:#176b4f">VIEWER LINKS</span><h3 style="margin:4px 0 6px">روابط دخول للقراءة فقط</h3><p style="margin:0;color:#65736e">أنشئ رابطًا مؤقتًا يفتح الموقع مباشرة بصلاحية قارئ.</p></div>
        <button id="guestLinksRefresh" type="button">تحديث</button>
      </div>
      <div id="guestLinkForm" style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;align-items:end;margin-bottom:14px">
        <label>اسم الرابط<input id="guestLinkLabel" type="text" value="رابط قارئ"></label>
        <label>المدة<select id="guestLinkHours"><option value="24">24 ساعة</option><option value="72">3 أيام</option><option value="168" selected>7 أيام</option><option value="720">30 يومًا</option></select></label>
        <label>عدد مرات الاستخدام<select id="guestLinkUses"><option value="0" selected>غير محدود</option><option value="1">مرة واحدة</option><option value="5">5 مرات</option><option value="10">10 مرات</option></select></label>
        <button id="createGuestLink" class="v3-primary" type="button">إنشاء رابط</button>
      </div>
      <div id="guestLinkResult" style="display:none;margin:0 0 14px;padding:12px;border:1px solid #176b4f;border-radius:10px;background:#eef8f3">
        <div style="font-weight:800;margin-bottom:6px">الرابط الجاهز للإرسال</div>
        <input id="guestLinkUrl" type="text" readonly dir="ltr" style="width:100%">
      </div>
      <div id="guestLinksMsg" style="min-height:20px;margin-bottom:8px"></div>
      <div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>الاسم</th><th>ينتهي</th><th>الاستخدام</th><th>الحالة</th><th>آخر استخدام</th><th>إجراء</th></tr></thead><tbody id="guestLinksBody"><tr><td colspan="6">جاري التحميل...</td></tr></tbody></table></div>`;
    const users=document.getElementById('fullUserManagement');
    if(users && users.nextSibling) content.insertBefore(panel,users.nextSibling); else content.appendChild(panel);
    const media=document.createElement('style');
    media.textContent='@media(max-width:760px){#guestLinkForm{grid-template-columns:1fr!important}}';
    document.head.appendChild(media);
    document.getElementById('createGuestLink').onclick=createLink;
    document.getElementById('guestLinksRefresh').onclick=load;
  }

  async function load(){
    mount();
    const body=document.getElementById('guestLinksBody');
    if(!body) return;
    try{
      const d=await api('/api/guest-links');
      const links=d.links||[];
      body.innerHTML=links.length?links.map(x=>{
        const ended=!x.is_active||new Date(x.expires_at).getTime()<=Date.now()||(Number(x.max_uses||0)>0&&Number(x.use_count||0)>=Number(x.max_uses));
        const uses=Number(x.max_uses||0)>0?`${Number(x.use_count||0)} / ${Number(x.max_uses)}`:`${Number(x.use_count||0)} / غير محدود`;
        return `<tr><td>${esc(x.label||'رابط قارئ')}</td><td>${fmtDate(x.expires_at)}</td><td>${esc(uses)}</td><td>${ended?'غير فعال':'فعال'}</td><td>${fmtDate(x.last_used_at)}</td><td>${ended?'—':`<button type="button" class="revokeGuestLink" data-id="${x.id}">إلغاء</button>`}</td></tr>`;
      }).join(''):'<tr><td colspan="6">لا توجد روابط بعد</td></tr>';
      document.querySelectorAll('.revokeGuestLink').forEach(btn=>btn.onclick=async()=>{
        if(!confirm('إلغاء هذا الرابط؟')) return;
        try{await api(`/api/guest-links/${btn.dataset.id}`,{method:'DELETE'});await load();}
        catch(e){document.getElementById('guestLinksMsg').textContent=e.message;}
      });
    }catch(e){body.innerHTML=`<tr><td colspan="6">${esc(e.message)}</td></tr>`;}
  }

  async function createLink(){
    const btn=document.getElementById('createGuestLink');
    const msg=document.getElementById('guestLinksMsg');
    btn.disabled=true; msg.textContent='جاري إنشاء الرابط...';
    try{
      const d=await api('/api/guest-links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:document.getElementById('guestLinkLabel').value,hours:Number(document.getElementById('guestLinkHours').value),max_uses:Number(document.getElementById('guestLinkUses').value)})});
      document.getElementById('guestLinkUrl').value=`${location.origin}/access?token=${encodeURIComponent(d.token)}`;
      document.getElementById('guestLinkResult').style.display='block';
      msg.textContent='تم إنشاء الرابط بصلاحية قارئ فقط';
      await load();
    }catch(e){msg.textContent=e.message;}finally{btn.disabled=false;}
  }

  const timer=setInterval(()=>{
    if(document.getElementById('v3Content')){clearInterval(timer);mount();load();}
  },150);
  setTimeout(()=>clearInterval(timer),10000);
})();
