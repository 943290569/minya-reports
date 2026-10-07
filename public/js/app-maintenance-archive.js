(function(){
  const el=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').toLowerCase().replace(/[\s_\-./\\]+/g,'').replace(/[^a-z0-9\u0600-\u06ff]/g,'');
  const fmtBytes=n=>{n=Number(n||0);if(n<1024)return n+' B';if(n<1048576)return(n/1024).toFixed(1)+' KB';if(n<1073741824)return(n/1048576).toFixed(1)+' MB';return(n/1073741824).toFixed(2)+' GB';};
  async function api(url,opt){const r=await fetch(url,{cache:'no-store',...opt}),d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;}
  const jsonPost=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  let files=[],stopping=false,currentFolder=null,breadcrumbs=[],rootFolder=null,equipment=[];

  async function status(){
    try{const d=await api('/api/cloud-files/status');el('maStorageState').textContent=d.configured?'R2 جاهز':'R2 غير مربوط';el('maStorageState').className='ma-state '+(d.configured?'ok':'bad');el('maStartUpload').disabled=!d.configured||!files.length;return d.configured;}
    catch(e){el('maStorageState').textContent=e.message;el('maStorageState').className='ma-state bad';return false;}
  }
  async function list(folderId=null){
    return api('/api/cloud-files/list'+(folderId?('?folder_id='+folderId):''));
  }
  async function ensureFolder(parentId,name){
    const d=await list(parentId),found=(d.folders||[]).find(x=>String(x.name).trim()===String(name).trim());
    if(found)return found.id;
    const created=await api('/api/cloud-files/folders',jsonPost({parent_id:parentId,name}));
    return created.id;
  }
  async function ensureRoot(){
    if(rootFolder)return rootFolder;
    rootFolder=await ensureFolder(null,'الصيانة');
    return rootFolder;
  }
  async function loadEquipment(){
    try{const d=await api('/api/cloud-files/link-targets?type=equipment&q=');equipment=(d.targets||[]).map(x=>({id:x.id,title:x.title,n:norm(x.title)})).filter(x=>x.n);}
    catch{equipment=[];}
  }
  function matchEquipment(relativePath){
    const p=norm(relativePath);if(!p)return null;
    return equipment.sort((a,b)=>b.n.length-a.n.length).find(x=>p.includes(x.n))||null;
  }
  async function createPath(baseId,segments,cache){
    let parent=baseId,key='';
    for(const raw of segments){
      const name=String(raw||'').trim();if(!name)continue;
      key+=(key?'/':'')+name;
      if(cache.has(key)){parent=cache.get(key);continue;}
      parent=await ensureFolder(parent,name);cache.set(key,parent);
    }
    return parent;
  }
  async function uploadOne(file,folderId,asset){
    const prep=await api('/api/cloud-files/upload-url',jsonPost({folder_id:folderId,name:file.name,size_bytes:file.size,mime_type:file.type||'application/octet-stream'}));
    const put=await fetch(prep.upload_url,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
    if(!put.ok)throw new Error('فشل رفع الملف إلى R2: HTTP '+put.status);
    await api('/api/cloud-files/'+prep.id+'/complete',jsonPost({}));
    if(asset){try{await api('/api/cloud-files/'+prep.id+'/links',jsonPost({entity_type:'equipment',entity_id:asset.id}));}catch{}}
    return prep.id;
  }
  function selected(){
    files=Array.from(el('maFolderInput').files||[]);
    const total=files.reduce((s,f)=>s+Number(f.size||0),0);
    el('maFileCount').textContent=files.length.toLocaleString('en-US');el('maTotalSize').textContent=fmtBytes(total);
    el('maProgressText').textContent=files.length?'جاهز للرفع':'لم يتم اختيار مجلد';
    status();
  }
  function cleanRelative(file){
    const parts=String(file.webkitRelativePath||file.name).split('/').filter(Boolean);
    if(parts.length>1)parts.shift();
    return parts;
  }
  async function start(){
    if(!files.length)return;stopping=false;el('maStartUpload').disabled=true;el('maFolderInput').disabled=true;el('maCancelUpload').disabled=false;el('maErrors').innerHTML='';el('maUploadMessage').textContent='';
    const root=await ensureRoot(),cache=new Map(),auto=el('maAutoLink').value==='1';let done=0,failed=0,linked=0;
    for(const file of files){
      if(stopping)break;
      const parts=cleanRelative(file),name=parts.pop()||file.name;
      try{
        const folder=await createPath(root,parts,cache),asset=auto?matchEquipment(parts.join('/')+'/'+name):null;
        await uploadOne(file,folder,asset);if(asset)linked++;
      }catch(e){failed++;const div=document.createElement('div');div.className='ma-error';div.textContent=(file.webkitRelativePath||file.name)+' — '+e.message;el('maErrors').append(div);}
      done++;const pct=Math.round(done/files.length*100);el('maProgressBar').style.width=pct+'%';el('maProgressText').textContent=pct+'%';el('maProgressDetail').textContent=done+' / '+files.length+' ملف';
    }
    el('maCancelUpload').disabled=true;el('maFolderInput').disabled=false;el('maStartUpload').disabled=false;
    el('maUploadMessage').textContent=(stopping?'تم إيقاف الرفع. ':'اكتمل الرفع. ')+(done-failed)+' ناجح، '+failed+' فشل، '+linked+' ملف رُبط تلقائيًا بالمعدات.';
    await openRoot();
  }
  async function browse(folderId,path){
    const d=await list(folderId);currentFolder=folderId;el('maPath').textContent=path.join(' / ');
    el('maFolderList').innerHTML=(d.folders||[]).map(f=>'<button class="ma-folder-card" data-folder="'+f.id+'" data-name="'+esc(f.name)+'">مجلد '+esc(f.name)+'</button>').join('')||'<p>لا توجد مجلدات فرعية</p>';
    el('maFilesBody').innerHTML=(d.files||[]).map(f=>'<tr><td>'+esc(f.original_name)+'</td><td>'+esc(f.mime_type||'-')+'</td><td>'+fmtBytes(f.size_bytes)+'</td><td>'+esc(String(f.created_at||'').slice(0,16))+'</td><td><a href="/api/cloud-files/'+f.id+'/download" target="_blank" rel="noopener">فتح</a></td></tr>').join('')||'<tr><td colspan="5">لا توجد ملفات في هذا المجلد</td></tr>';
    el('maFolderList').querySelectorAll('[data-folder]').forEach(b=>b.onclick=()=>{breadcrumbs.push({id:Number(b.dataset.folder),name:b.dataset.name});renderCrumbs();browse(Number(b.dataset.folder),['الصيانة',...breadcrumbs.map(x=>x.name)]);});
  }
  function renderCrumbs(){
    el('maBreadcrumbs').innerHTML='<button data-level="-1">الصيانة</button>'+breadcrumbs.map((x,i)=>'<button data-level="'+i+'">'+esc(x.name)+'</button>').join('');
    el('maBreadcrumbs').querySelectorAll('button').forEach(b=>b.onclick=()=>{const level=Number(b.dataset.level);if(level<0){breadcrumbs=[];openRoot();return;}breadcrumbs=breadcrumbs.slice(0,level+1);renderCrumbs();browse(breadcrumbs[level].id,['الصيانة',...breadcrumbs.map(x=>x.name)]);});
  }
  async function openRoot(){try{const id=await ensureRoot();breadcrumbs=[];renderCrumbs();await browse(id,['الصيانة']);}catch(e){el('maFilesBody').innerHTML='<tr><td colspan="5">'+esc(e.message)+'</td></tr>';}}
  async function init(){
    el('maFolderInput').onchange=selected;el('maStartUpload').onclick=start;el('maCancelUpload').onclick=()=>{stopping=true;el('maCancelUpload').disabled=true;el('maProgressDetail').textContent='سيتم الإيقاف بعد الملف الحالي';};el('maRefresh').onclick=openRoot;el('maRelink').onclick=async()=>{const b=el('maRelink');b.disabled=true;el('maRelinkMsg').textContent='جاري ربط الملفات بالمعدات...';try{const d=await api('/api/cloud-files/maintenance-archive/relink',jsonPost({}));el('maRelinkMsg').textContent='تم الربط: '+d.linked+' ملف، '+d.assets+' معدة/مركبة، وتم إنشاء '+d.created+' بطاقة معدات جديدة.';await loadEquipment();}catch(e){el('maRelinkMsg').textContent=e.message;}finally{b.disabled=false;}};
    await Promise.all([status(),loadEquipment()]);await openRoot();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();