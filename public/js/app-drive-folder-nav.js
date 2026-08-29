/* Google Drive folder browser layered over the read-only importer */
(function(){
  const FOLDER_MIME='application/vnd.google-apps.folder';
  const SHEET_MIME='application/vnd.google-apps.spreadsheet';
  const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  let driveToken='';
  let currentFolderId='root';
  let currentItems=[];
  let pathStack=[{id:'root',name:'ملفاتي'}];
  let refreshTimer=null;

  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const normalize=v=>String(v??'').trim().replace(/\s+/g,' ').toLowerCase();

  function captureToken(init){
    try{
      const headers=new Headers(init?.headers||{});
      const auth=headers.get('Authorization')||headers.get('authorization')||'';
      const match=auth.match(/^Bearer\s+(.+)$/i);
      if(match) driveToken=match[1];
    }catch(_){ }
  }

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    if(url.includes('www.googleapis.com/drive/')) captureToken(init);
    const response=await nativeFetch(input,init);
    if(url.includes('/drive/v3/files') && driveToken && !url.includes('alt=media') && !url.includes('/export')){
      clearTimeout(refreshTimer);
      refreshTimer=setTimeout(()=>browseFolder(currentFolderId,false).catch(()=>{}),80);
    }
    return response;
  };

  function ensureToolbar(){
    const panel=document.getElementById('driveFilesPanel');
    const search=document.querySelector('.drive-search-row');
    if(!panel||!search||document.getElementById('driveFolderToolbar')) return;
    const bar=document.createElement('div');
    bar.id='driveFolderToolbar';
    bar.className='drive-folder-toolbar';
    bar.innerHTML=`<button id="driveFolderBack" type="button" class="drive-folder-back" disabled>رجوع</button><div id="driveBreadcrumb" class="drive-breadcrumb"><button type="button" data-drive-crumb="0">ملفاتي</button></div>`;
    search.before(bar);
  }

  function renderBreadcrumb(){
    const crumb=document.getElementById('driveBreadcrumb');
    const back=document.getElementById('driveFolderBack');
    if(!crumb||!back) return;
    crumb.innerHTML=pathStack.map((x,i)=>`<button type="button" data-drive-crumb="${i}">${esc(x.name)}</button>${i<pathStack.length-1?'<span>‹</span>':''}`).join('');
    back.disabled=pathStack.length<=1;
  }

  function renderItems(){
    const list=document.getElementById('driveFilesList');
    const count=document.getElementById('driveFilesCount');
    const search=document.getElementById('driveFileSearch');
    if(!list||!count) return;
    const q=normalize(search?.value||'');
    const visible=currentItems.filter(x=>!q||normalize(x.name).includes(q));
    const folders=visible.filter(x=>x.mimeType===FOLDER_MIME);
    const files=visible.filter(x=>x.mimeType!==FOLDER_MIME);
    count.textContent=`${folders.length} مجلد · ${files.length} ملف`;
    if(!visible.length){list.innerHTML='<div class="drive-empty">لا توجد عناصر مطابقة داخل هذا المجلد.</div>';return;}
    list.innerHTML=visible.map(item=>{
      if(item.mimeType===FOLDER_MIME){
        return `<button type="button" class="drive-file drive-folder-item" data-drive-folder="${esc(item.id)}" data-drive-folder-name="${esc(item.name)}"><div class="drive-folder-icon" aria-hidden="true">▰</div><div><strong>${esc(item.name)}</strong><small>مجلد Google Drive</small></div><span class="drive-folder-open">فتح</span></button>`;
      }
      const type=item.mimeType===SHEET_MIME?'Google Sheets':'Excel';
      const date=item.modifiedTime?new Date(item.modifiedTime).toLocaleDateString('en-GB'):'';
      return `<div class="drive-file"><div class="drive-file-icon" aria-hidden="true">▦</div><div><strong>${esc(item.name)}</strong><small>${type}${date?` · ${esc(date)}`:''}</small></div><button type="button" data-preview-file="${esc(item.id)}">معاينة</button></div>`;
    }).join('');
  }

  async function browseFolder(folderId='root',showLoading=true){
    if(!driveToken) return;
    ensureToolbar();
    const list=document.getElementById('driveFilesList');
    if(showLoading&&list) list.innerHTML='<div class="drive-empty">جاري فتح المجلد...</div>';
    const parent=folderId==='root'?'root':folderId;
    const q=`'${parent}' in parents and trashed=false and (mimeType='${FOLDER_MIME}' or mimeType='${SHEET_MIME}' or mimeType='${XLSX_MIME}')`;
    const params=new URLSearchParams({q,fields:'files(id,name,mimeType,modifiedTime,size,webViewLink,parents)',pageSize:'1000'});
    const response=await nativeFetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`,{headers:{Authorization:`Bearer ${driveToken}`}});
    if(!response.ok) throw new Error('تعذر قراءة محتويات المجلد');
    const data=await response.json();
    currentFolderId=folderId;
    currentItems=Array.isArray(data.files)?data.files:[];
    currentItems.sort((a,b)=>{
      const af=a.mimeType===FOLDER_MIME?0:1,bf=b.mimeType===FOLDER_MIME?0:1;
      if(af!==bf) return af-bf;
      return String(a.name||'').localeCompare(String(b.name||''),'ar',{numeric:true,sensitivity:'base'});
    });
    renderBreadcrumb();
    renderItems();
  }

  function openFolder(id,name){
    pathStack.push({id,name:name||'مجلد'});
    const search=document.getElementById('driveFileSearch'); if(search) search.value='';
    browseFolder(id).catch(showError);
  }
  function goBack(){
    if(pathStack.length<=1) return;
    pathStack.pop();
    const target=pathStack[pathStack.length-1];
    const search=document.getElementById('driveFileSearch'); if(search) search.value='';
    browseFolder(target.id).catch(showError);
  }
  function goCrumb(index){
    if(index<0||index>=pathStack.length) return;
    pathStack=pathStack.slice(0,index+1);
    const target=pathStack[pathStack.length-1];
    const search=document.getElementById('driveFileSearch'); if(search) search.value='';
    browseFolder(target.id).catch(showError);
  }
  function showError(error){
    const list=document.getElementById('driveFilesList');
    if(list) list.innerHTML=`<div class="drive-empty">${esc(error?.message||'حدث خطأ أثناء فتح المجلد')}</div>`;
  }

  document.addEventListener('click',event=>{
    const folder=event.target.closest('[data-drive-folder]');
    if(folder){event.preventDefault();openFolder(folder.dataset.driveFolder,folder.dataset.driveFolderName);return;}
    const crumb=event.target.closest('[data-drive-crumb]');
    if(crumb){event.preventDefault();goCrumb(Number(crumb.dataset.driveCrumb));return;}
    if(event.target.closest('#driveFolderBack')){event.preventDefault();goBack();}
  },true);

  document.addEventListener('input',event=>{
    if(event.target?.id==='driveFileSearch') setTimeout(renderItems,0);
  },true);

  document.addEventListener('click',event=>{
    if(event.target.closest('#refreshDriveFilesBtn')&&driveToken){
      setTimeout(()=>browseFolder(currentFolderId).catch(showError),120);
    }
  },true);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ensureToolbar,{once:true});
  else ensureToolbar();
})();