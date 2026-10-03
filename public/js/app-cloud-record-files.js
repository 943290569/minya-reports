(function(){
  const route=location.pathname.replace(/\/+$/,'')||'/';
  const sections={
    '/equipment-management':['equipment','work_order'],
    '/drivers-licenses.html':['driver','vehicle'],
    '/fleet':['vehicle'],
    '/maintenance-incidents.html':['maintenance','incident'],
    '/tasks':['task'], '/contracts':['contract'], '/cells':['cell'],
    '/external-diesel':['diesel'], '/external-diesel.html':['diesel']
  };
  if(!sections[route])return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(url){const r=await fetch(url,{cache:'no-store'}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.message||'تعذر تحميل المرفقات');return d;}
  async function init(){
    const main=document.querySelector('main');if(!main)return;
    let types;
    try{types=(await api('/api/cloud-files/link-types')).types.filter(x=>sections[route].includes(x.type));}catch{return;}
    if(!types.length)return;
    const panel=document.createElement('section');panel.id='cloudRecordFiles';panel.className='panel v3-panel no-print';
    panel.innerHTML=`<h3>ملفات مرتبطة بسجل</h3><div class="cloud-record-controls"><label>القسم<select id="cloudRecordType">${types.map(t=>`<option value="${esc(t.type)}">${esc(t.label)}</option>`).join('')}</select></label><label>بحث بالاسم أو التاريخ<input id="cloudRecordSearch" type="search"></label><label>السجل<select id="cloudRecordId"><option value="">اختر السجل</option></select></label></div><p id="cloudRecordHint"></p><p id="cloudRecordMessage" role="status"></p><div id="cloudRecordList"></div><a id="cloudRecordChoose" hidden>اختيار ملف من ملفات الموقع</a>`;
    const style=document.createElement('style');style.textContent='#cloudRecordFiles .cloud-record-controls{display:flex;gap:12px;flex-wrap:wrap}#cloudRecordFiles label{display:grid;gap:6px;flex:1;min-width:180px}#cloudRecordFiles input,#cloudRecordFiles select{width:100%;max-width:100%;min-width:0;padding:8px}#cloudRecordFiles .cloud-record-file{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid #ddd}#cloudRecordFiles .cloud-record-file span{overflow-wrap:anywhere;min-width:0;flex:1}#cloudRecordFiles a{display:inline-block;padding:8px;color:var(--appearance-accent,#176b4f)}#cloudRecordFiles a[hidden]{display:none}';panel.append(style);
    function mount(){if(!main.contains(panel))main.append(panel);}
    mount();new MutationObserver(mount).observe(main,{childList:true});
    const el=id=>panel.querySelector('#'+id);let version=0,timer;
    async function records(){
      const ticket=++version;el('cloudRecordChoose').hidden=true;el('cloudRecordList').textContent='';
      try{const d=await api(`/api/cloud-files/link-targets?type=${encodeURIComponent(el('cloudRecordType').value)}&q=${encodeURIComponent(el('cloudRecordSearch').value)}`);if(ticket!==version)return;el('cloudRecordId').innerHTML='<option value="">اختر السجل</option>'+d.targets.map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join('');el('cloudRecordHint').textContent=d.has_more?'اكتب الاسم أو التاريخ للعثور على سجلات أخرى.':'';el('cloudRecordMessage').textContent='';}
      catch(e){if(ticket===version)el('cloudRecordMessage').textContent=e.message;}
    }
    el('cloudRecordType').onchange=()=>{el('cloudRecordSearch').value='';records();};
    el('cloudRecordSearch').oninput=()=>{version++;clearTimeout(timer);el('cloudRecordId').innerHTML='<option value="">جاري البحث...</option>';el('cloudRecordChoose').hidden=true;el('cloudRecordList').textContent='';timer=setTimeout(records,250);};
    el('cloudRecordId').onchange=async()=>{
      const ticket=++version,type=el('cloudRecordType').value,id=el('cloudRecordId').value;el('cloudRecordChoose').hidden=true;el('cloudRecordList').textContent='';if(!id)return;
      try{const d=await api(`/api/cloud-files/linked?type=${encodeURIComponent(type)}&id=${id}`);if(ticket!==version)return;el('cloudRecordMessage').textContent=`${d.files.length} ملف مرتبط`;el('cloudRecordList').innerHTML=d.files.map(f=>`<div class="cloud-record-file"><span>${esc(f.original_name)}</span><a href="/api/cloud-files/${f.id}/download" target="_blank" rel="noopener">فتح</a></div>`).join('');const link=el('cloudRecordChoose');link.href=`/files?type=${encodeURIComponent(type)}&record=${id}`;link.hidden=!d.can_edit;}
      catch(e){if(ticket===version)el('cloudRecordMessage').textContent=e.message;}
    };
    await records();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
