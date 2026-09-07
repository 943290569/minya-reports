(function(){
  if((location.pathname.replace(/\/+$/,'')||'/')!=='/admin') return;

  const clean=v=>String(v||'').trim().replace(/[\s().-]/g,'');
  function whatsappNumber(v){
    let n=clean(v);
    if(n.startsWith('00'))n=n.slice(2);
    if(n.startsWith('+'))n=n.slice(1);
    if(n.startsWith('0'))n=`970${n.slice(1)}`;
    return /^\d{8,15}$/.test(n)?n:'';
  }
  function rowMobile(userId){
    const row=document.querySelector(`#usersManageBody tr[data-user="${CSS.escape(String(userId||''))}"]`);
    return clean(row?.querySelector('td:nth-child(3)')?.textContent||'');
  }
  function selectUser(userId){
    const smsBtn=document.querySelector(`.sms-user-btn[data-user="${CSS.escape(String(userId||''))}"]`);
    if(smsBtn&&!smsBtn.disabled)smsBtn.click();
    const select=document.getElementById('smsRecipient');
    if(select)select.value=String(userId||'');
    document.querySelector('.sms-compose-card')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    const status=document.getElementById('smsComposeMsg');
    if(status)status.textContent='تم اختيار المستخدم. اكتب الرسالة أو اختر نصًا جاهزًا ثم اضغط فتح واتساب.';
  }
  function openWhatsApp(){
    const select=document.getElementById('smsRecipient');
    const message=document.getElementById('smsMessage');
    const status=document.getElementById('smsComposeMsg');
    const id=select?.value||'';
    const number=whatsappNumber(rowMobile(id));
    const text=String(message?.value||'').trim();
    if(!id){if(status)status.textContent='اختر مستخدمًا أولًا.';return;}
    if(!number){if(status)status.textContent='رقم الجوال غير صالح لواتساب.';return;}
    if(!text){if(status)status.textContent='اكتب نص الرسالة أولًا.';return;}
    const url=`https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    window.open(url,'_blank','noopener,noreferrer');
    if(status)status.textContent='تم فتح واتساب بالرقم والنص. راجع الرسالة ثم اضغط إرسال من واتساب.';
  }
  function enhanceComposer(){
    const card=document.querySelector('.sms-compose-card');
    if(!card)return;
    const head=card.querySelector('.sms-compose-head');
    const tag=head?.querySelector('span');
    const title=head?.querySelector('h3');
    const desc=head?.querySelector('p');
    if(tag&&tag.textContent!=='SMS / WHATSAPP')tag.textContent='SMS / WHATSAPP';
    if(title&&title.textContent!=='إرسال رسالة جوال أو واتساب')title.textContent='إرسال رسالة جوال أو واتساب';
    if(desc&&desc.textContent!=='استخدم نفس المستلم والنص الجاهز، ثم افتح تطبيق الرسائل أو واتساب من هاتفك.')desc.textContent='استخدم نفس المستلم والنص الجاهز، ثم افتح تطبيق الرسائل أو واتساب من هاتفك.';
    const actions=card.querySelector('.sms-compose-actions');
    const sms=document.getElementById('openSmsApp');
    if(actions&&sms&&!document.getElementById('openWhatsAppApp')){
      const btn=document.createElement('button');
      btn.id='openWhatsAppApp';
      btn.type='button';
      btn.className='v3-primary';
      btn.textContent='فتح واتساب';
      btn.addEventListener('click',openWhatsApp);
      actions.appendChild(btn);
    }
  }
  function enhanceRows(){
    document.querySelectorAll('#usersManageBody tr[data-user]').forEach(row=>{
      if(row.querySelector('.whatsapp-user-btn'))return;
      const sms=row.querySelector('.sms-user-btn');
      if(!sms)return;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='whatsapp-user-btn';
      btn.dataset.user=sms.dataset.user||row.dataset.user||'';
      btn.textContent='واتساب';
      btn.disabled=sms.disabled;
      btn.addEventListener('click',()=>selectUser(btn.dataset.user));
      sms.insertAdjacentElement('afterend',btn);
    });
  }
  function enhance(){enhanceComposer();enhanceRows();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
  const observer=new MutationObserver(enhance);
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
