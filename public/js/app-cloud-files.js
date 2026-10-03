(function(){
  const route=location.pathname.replace(/\/+$/,'')||'/';if(route!=='/files')return;
  const el=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=async(url,opt)=>{const r=await fetch(url,{cache:'no-store',...opt}),d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;};
  const json=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const fmt=n=>{const units=['B','KB','MB','GB'];let x=Number(n||0),i=0;while(x>=1024&&i<3){x/=1024;i++;}return `${x.toFixed(i?1:0)} ${units[i]}`;};
  let folderId=null,trail=[],editable=false,isAdmin=false;
  const context=new URLSearchParams(location.search);
  let types=[],selectedFile=null,searchVersion=0,searchTimer=null;
  const linkedUrl=(type,id)=>`/files?type=${encodeURIComponent(type)}&record=${encodeURIComponent(id)}`;
  async function showLinkedContext(){
    const type=context.get('type'),id=context.get('record');
    if(!type||!id)return;
    const box=el('cloudLinkedContext');box.hidden=false;
    try{
      const d=await api(`/api/cloud-files/linked?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);
      box.innerHTML=`<h3>مرفقات ${esc(d.target.section)}</h3><p>${esc(d.target.title)}</p><div class="cloud-grid">${d.files.map(f=>`<article class="cloud-card"><strong>${esc(f.original_name)}</strong><span>${fmt(f.size_bytes)}</span><a href="/api/cloud-files/${f.id}/download" target="_blank" rel="noopener">فتح</a></article>`).join('')||'<p>لا توجد ملفات مرتبطة بهذا السجل.</p>'}</div>${d.can_edit?'<p>اختر ملفًا من المجلدات أدناه ثم اضغط «ربط بسجل».</p>':''}`;
    }catch(e){box.textContent=e.message;}
  }
  function ensureLinkDialog(){
    if(el('cloudLinkDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='cloudLinkDialog';dialog.className='cloud-link-dialog';
    dialog.innerHTML=`<div class="cloud-link-heading"><h3 id="cloudLinkTitle">ربط الملف بسجل</h3><button type="button" id="cloudLinkClose">إغلاق</button></div><p id="cloudLinkFilename"></p><div id="cloudLinkEditor"><label for="cloudLinkType">القسم</label><select id="cloudLinkType"></select><label for="cloudLinkSearch">ابحث عن السجل بالاسم أو التاريخ</label><input id="cloudLinkSearch" type="search" placeholder="اسم أو تاريخ"><label for="cloudLinkTarget">السجل</label><select id="cloudLinkTarget"></select><p id="cloudLinkHint"></p><button type="button" id="cloudLinkSave">ربط الملف</button></div><p id="cloudLinkMessage" role="status" aria-live="polite"></p><h4>السجلات المرتبطة</h4><div id="cloudLinkList"></div>`;
    document.body.append(dialog);
    el('cloudLinkClose').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{searchVersion++;clearTimeout(searchTimer);selectedFile=null;});
    el('cloudLinkType').onchange=()=>{el('cloudLinkSearch').value='';loadTargets();};
    el('cloudLinkSearch').oninput=()=>{clearTimeout(searchTimer);searchVersion++;el('cloudLinkSave').disabled=true;searchTimer=setTimeout(loadTargets,250);};
    el('cloudLinkTarget').onchange=()=>{el('cloudLinkSave').disabled=!el('cloudLinkTarget').value;};
    el('cloudLinkSave').onclick=async()=>{
      const button=el('cloudLinkSave'),fileId=selectedFile;
      if(!fileId||!el('cloudLinkTarget').value)return;
      button.disabled=true;
      try{const d=await api(`/api/cloud-files/${fileId}/links`,json({entity_type:el('cloudLinkType').value,entity_id:Number(el('cloudLinkTarget').value)}));if(selectedFile!==fileId)return;el('cloudLinkMessage').textContent=d.message;drawLinks(d.links);await showLinkedContext();}
      catch(e){if(selectedFile===fileId)el('cloudLinkMessage').textContent=e.message;}
      finally{if(selectedFile===fileId)button.disabled=!el('cloudLinkTarget').value;}
    };
  }
  async function loadTargets(preselect){
    const version=++searchVersion,button=el('cloudLinkSave'),select=el('cloudLinkTarget');button.disabled=true;select.innerHTML='<option value="">جاري تحميل السجلات...</option>';
    try{
      const d=await api(`/api/cloud-files/link-targets?type=${encodeURIComponent(el('cloudLinkType').value)}&q=${encodeURIComponent(el('cloudLinkSearch').value)}`);
      if(version!==searchVersion)return;
      select.innerHTML='<option value="">اختر السجل</option>'+d.targets.map(x=>`<option value="${x.id}">${esc(x.title)}</option>`).join('');
      if(preselect){
        if(!d.targets.some(x=>Number(x.id)===Number(preselect))){
          const current=await api(`/api/cloud-files/linked?type=${encodeURIComponent(el('cloudLinkType').value)}&id=${encodeURIComponent(preselect)}`);
          if(version!==searchVersion)return;
          select.insertAdjacentHTML('beforeend',`<option value="${current.target.id}">${esc(current.target.title)}</option>`);
        }
        select.value=String(preselect);
      }
      el('cloudLinkHint').textContent=d.has_more?'توجد سجلات أخرى. اكتب الاسم أو التاريخ لتضييق البحث.':d.targets.length?'':'لا توجد سجلات مطابقة.';
      button.disabled=!select.value;
    }catch(e){if(version===searchVersion){select.innerHTML='<option value="">تعذر تحميل السجلات</option>';el('cloudLinkMessage').textContent=e.message;}}
  }
  function drawLinks(links){
    const box=el('cloudLinkList');box.innerHTML=links.length?links.map(x=>`<div class="cloud-link-row"><a href="${linkedUrl(x.entity_type,x.entity_id)}">${esc(x.section)} — ${esc(x.title)}</a>${editable&&x.can_edit?`<button type="button" data-unlink-type="${esc(x.entity_type)}" data-unlink-record="${x.entity_id}">فك الربط</button>`:''}</div>`).join(''):'<p>لم يُربط الملف بسجل بعد.</p>';
    box.querySelectorAll('[data-unlink-type]').forEach(b=>b.onclick=async()=>{
      const fileId=selectedFile;b.disabled=true;
      try{const d=await api(`/api/cloud-files/${fileId}/links/${encodeURIComponent(b.dataset.unlinkType)}/${b.dataset.unlinkRecord}`,{method:'DELETE'});if(selectedFile!==fileId)return;el('cloudLinkMessage').textContent=d.message;drawLinks((await api(`/api/cloud-files/${fileId}/links`)).links);await showLinkedContext();}
      catch(e){el('cloudLinkMessage').textContent=e.message;b.disabled=false;}
    });
  }
  async function openLinks(file){
    ensureLinkDialog();selectedFile=file.id;el('cloudLinkFilename').textContent=file.original_name;el('cloudLinkMessage').textContent='';el('cloudLinkList').textContent='جاري التحميل...';el('cloudLinkEditor').hidden=true;el('cloudLinkTitle').textContent=editable?'ربط الملف بسجل':'السجلات المرتبطة';el('cloudLinkDialog').showModal();
    try{
      const [t,d]=await Promise.all([api('/api/cloud-files/link-types'),api(`/api/cloud-files/${file.id}/links`)]);
      if(selectedFile!==file.id)return;
      types=t.types.filter(x=>x.can_edit);drawLinks(d.links);el('cloudLinkEditor').hidden=!editable||!types.length;
      if(editable&&types.length){el('cloudLinkType').innerHTML=types.map(x=>`<option value="${esc(x.type)}">${esc(x.label)}</option>`).join('');if(types.some(x=>x.type===context.get('type')))el('cloudLinkType').value=context.get('type');el('cloudLinkSearch').value='';await loadTargets(el('cloudLinkType').value===context.get('type')?context.get('record'):null);}
    }catch(e){if(selectedFile===file.id)el('cloudLinkMessage').textContent=e.message;}
  }
  async function load(){const [status,list]=await Promise.all([api('/api/cloud-files/status'),api(`/api/cloud-files/list${folderId?`?folder_id=${folderId}`:''}`)]);editable=['admin','editor'].includes(window.MINYA_USER?.role);isAdmin=window.MINYA_USER?.role==='admin';drawStatus(status);draw(list);await showLinkedContext();}
  function drawStatus(s){el('cloudStatus').className=`cloud-status ${s.configured?'ready':'waiting'}`;el('cloudStatus').innerHTML=s.configured?`<strong>التخزين متصل</strong><span>${fmt(s.total_bytes)} · ${Number(s.file_count||0)} ملف · الحد لكل ملف ${fmt(s.max_file_bytes)}</span>${isAdmin?`<details><summary>تفاصيل الاتصال</summary><span>R2: ${esc(s.bucket)}</span></details>`:""}`:'<strong>بانتظار ربط R2</strong><span>الواجهة جاهزة، ويلزم إضافة مفاتيح التخزين إلى الخادم.</span>';el('cloudActions').hidden=!editable||!s.configured;}
  function draw(d){if(d.current&&!trail.some(x=>x.id===d.current.id))trail.push({id:d.current.id,name:d.current.name});if(!d.current)trail=[];el('cloudBreadcrumbs').innerHTML=`<button data-root>ملفات الموقع</button>${trail.map((x,i)=>`<span>‹</span><button data-crumb="${i}">${esc(x.name)}</button>`).join('')}`;el('cloudGrid').innerHTML=[...d.folders.map(x=>`<button class="cloud-card folder" data-folder="${x.id}" data-name="${esc(x.name)}"><span>مجلد</span><strong>${esc(x.name)}</strong></button>`),...d.files.map(x=>`<article class="cloud-card file"><span>${fmt(x.size_bytes)}</span><strong>${esc(x.original_name)}</strong><small>${esc(String(x.created_at||'').slice(0,10))}</small><div><a href="/api/cloud-files/${x.id}/download" target="_blank" rel="noopener">فتح</a><button type="button" data-link-file="${x.id}">${editable?'ربط بسجل':'السجلات المرتبطة'}</button>${isAdmin?`<button data-delete="${x.id}">حذف</button>`:''}</div></article>`)].join('')||'<p class="minya-empty-state">هذا المجلد فارغ</p>';document.querySelector('[data-root]').onclick=()=>{folderId=null;trail=[];load();};document.querySelectorAll('[data-crumb]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.crumb);folderId=trail[i].id;trail=trail.slice(0,i+1);load();});document.querySelectorAll('[data-folder]').forEach(b=>b.onclick=()=>{folderId=Number(b.dataset.folder);trail.push({id:folderId,name:b.dataset.name});load();});document.querySelectorAll('[data-link-file]').forEach(b=>b.onclick=()=>openLinks(d.files.find(x=>Number(x.id)===Number(b.dataset.linkFile))));document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('حذف الملف نهائيًا؟'))return;await api(`/api/cloud-files/${b.dataset.delete}`,{method:'DELETE'});load();});}
  async function uploadFiles(files){const progress=el('cloudProgress');for(let i=0;i<files.length;i++){const file=files[i];progress.textContent=`رفع ${i+1} من ${files.length}: ${file.name}`;const ticket=await api('/api/cloud-files/upload-url',json({folder_id:folderId,name:file.name,mime_type:file.type||'application/octet-stream',size_bytes:file.size}));const put=await fetch(ticket.upload_url,{method:'PUT',body:file,headers:{'Content-Type':file.type||'application/octet-stream'}});if(!put.ok)throw new Error(`فشل رفع ${file.name}. تحقق من إعداد CORS في R2`);await api(`/api/cloud-files/${ticket.id}/complete`,json({}));}progress.textContent='اكتمل رفع الملفات';await load();}
  async function render(){const main=document.querySelector('main.container');if(!main)return;main.innerHTML=`<section class="v3-page cloud-page"><div class="v3-hero"><div><span>CLOUD FILES V3.8</span><h2>ملفات ومرفقات الموقع</h2><p>تنظيم ملفات الموقع داخل مجلدات، مع روابط فتح مؤقتة وحماية الوصول.</p></div></div><div id="cloudStatus"></div><section id="cloudLinkedContext" class="v3-panel" hidden></section><div id="cloudActions" class="v3-panel cloud-actions"><label>إنشاء مجلد<div><input id="cloudFolderName" maxlength="220" placeholder="اسم المجلد"><button id="cloudFolderAdd" class="v3-primary">إنشاء</button></div></label><label>رفع ملفات<input id="cloudUpload" type="file" multiple></label><span id="cloudProgress"></span></div><div class="v3-panel"><nav id="cloudBreadcrumbs" class="cloud-breadcrumbs"></nav><div id="cloudGrid" class="cloud-grid"></div></div></section>`;el('cloudFolderAdd').onclick=async()=>{try{await api('/api/cloud-files/folders',json({parent_id:folderId,name:el('cloudFolderName').value}));el('cloudFolderName').value='';load();}catch(e){el('cloudProgress').textContent=e.message;}};el('cloudUpload').onchange=async e=>{try{await uploadFiles([...e.target.files]);e.target.value='';}catch(error){el('cloudProgress').textContent=error.message;}};try{await load();}catch(e){el('cloudStatus').textContent=e.message;}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
