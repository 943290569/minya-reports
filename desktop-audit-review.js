const fs=require('node:fs'),path=require('node:path');
module.exports=function(app,{requireRole,dataDir,db}){
  const candidates=()=>db.prepare("SELECT f.id,f.original_name,f.object_key,f.mime_type,f.size_bytes,GROUP_CONCAT(DISTINCT a.id) asset_ids,GROUP_CONCAT(DISTINCT a.name) asset_names FROM cloud_files f JOIN cloud_file_links l ON l.file_id=f.id AND l.entity_type='equipment' JOIN equipment_assets a ON a.id=l.entity_id LEFT JOIN equipment_maintenance_records m ON (m.source_file_id=f.id OR m.invoice_file_id=f.id) WHERE f.status='ready' AND m.id IS NULL GROUP BY f.id ORDER BY f.id").all().filter(f=>!(/\.docx$/i.test(f.original_name)));
  app.get('/maintenance-document-review/bundle/:batch',requireRole('admin'),async(req,res)=>{
    if(!/^\d{1,3}$/.test(req.params.batch))return res.status(400).send('رقم المجموعة غير صالح');
    const files=candidates().slice(Number(req.params.batch)*10,(Number(req.params.batch)+1)*10);
    if(!files.length)return res.status(404).send('لا توجد ملفات في هذه المجموعة');
    try{
      const AdmZip=require('adm-zip'),crypto=require('node:crypto'),r2=require('./r2-storage'),zip=new AdmZip(),manifest=[];
      let total=0;
      for(const file of files){
        const source=await fetch(r2.signedUrl('GET',file.object_key),{signal:AbortSignal.timeout(5000)});
        if(!source.ok)throw Error('تعذر قراءة الملف '+file.id);
        const content=Buffer.from(await source.arrayBuffer());total+=content.length;
        if(total>50*1024*1024)throw Error('حجم المجموعة يتجاوز حد التنزيل');
        const ext=path.extname(file.original_name).toLowerCase().replace(/[^.a-z0-9]/g,'').slice(0,12),name=String(file.id)+ext;
        zip.addFile(name,content);
        manifest.push({file_id:file.id,name:file.original_name,local_name:name,asset_ids:file.asset_ids,asset_names:file.asset_names,sha256:crypto.createHash('sha256').update(content).digest('hex')});
      }
      zip.addFile('manifest.json',Buffer.from(JSON.stringify(manifest,null,2)));
      res.setHeader('Cache-Control','no-store');res.type('application/zip');res.attachment('maintenance-review-'+req.params.batch+'.zip');res.send(zip.toBuffer());
    }catch{res.status(502).send('تعذر تجهيز الملفات. حاول تنزيل المجموعة مرة أخرى.');}
  });
  app.post('/maintenance-document-review/checkpoint',requireRole('admin'),async(req,res)=>{
    const folder=path.join(dataDir,'maintenance-review-checkpoints');
    try{
      fs.mkdirSync(folder,{recursive:true,mode:0o700});
      const target=path.join(folder,'database-'+new Date().toISOString().replace(/[:.]/g,'-')+'.db');
      await db.backup(target);fs.chmodSync(target,0o600);
      res.setHeader('Cache-Control','no-store');res.type('html').send('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>نسخة حماية الصيانة</title><h1>تم حفظ نسخة كاملة من قاعدة البيانات قبل مراجعة الصيانة</h1><p>تتضمن السجلات المالية وروابط الملفات.</p><a href="/equipment-maintenance-finance.html">العودة لسجل الصيانة والتكاليف</a></html>');
    }catch{res.status(500).send('تعذر حفظ نسخة الحماية. لم تتغير السجلات المالية.');}
  });
  app.get('/maintenance-document-review',requireRole('admin'),(req,res)=>{
    const file=path.join(dataDir,'desktop-audit-maintenance-review.json');
    const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let rows=[];try{rows=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
    const otherFiles=candidates(),bundles=Array.from({length:Math.ceil(otherFiles.length/10)},(_,i)=>`<a href="/maintenance-document-review/bundle/${i}">تنزيل مجموعة ${i+1}</a>`).join(' — ');
    const items=rows.map(r=>{const names=String(r.assets||'').split(',').map(id=>db.prepare('SELECT name FROM equipment_assets WHERE id=?').get(Number(id))?.name||'').filter(Boolean).join('، ');return `<article><h2>${esc(r.name)}</h2><p>المعدة: ${esc(names)} — رقم الملف: ${Number(r.file_id)||0}</p><pre>${esc(r.text||'تعذر قراءة المستند')}</pre></article>`;}).join('');
    res.setHeader('Cache-Control','no-store');
    res.type('html').send(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مراجعة مستندات الصيانة</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/app-bundle.css?v=3.8.0-20261008-desktop-audit1"><style>body{font-family:Arial,sans-serif;max-width:1100px;margin:30px auto;padding:16px;background:#f5f8f6;color:#153c30}article{background:white;padding:20px;margin:20px 0;border:1px solid #cbded3;border-radius:12px}pre{font:16px/1.8 Arial,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere}a{color:#17634c}</style><header class="top-header"><div><h1>نظام إدارة مكب المنيا</h1><p>مراجعة مستندات الصيانة</p></div><nav><a class="app-nav-link" href="/">الرئيسية</a></nav></header><main><h2>مراجعة مستندات الصيانة</h2><a href="/equipment-maintenance-finance.html">العودة لسجل الصيانة والتكاليف</a><p>عدد المستندات المقروءة: ${rows.length}. راجع التاريخ والفاتورة والشركة والتكلفة قبل تحويل المستند إلى سجل مالي. رفع الملف لا يثبت تاريخ تنفيذ الصيانة.</p><form method="post" action="/maintenance-document-review/checkpoint"><button type="submit">حفظ نسخة حماية كاملة قبل إدخال الفواتير</button></form><section><h3>الصور والفواتير والمستندات الأخرى</h3><p>عدد الملفات: ${otherFiles.length}. تتضمن كل مجموعة الملفات الأصلية وبيانات ارتباطها بالآليات.</p><p>${bundles}</p></section>${items||'<p>لا توجد مستندات مقروءة للمراجعة حاليًا.</p>'}</main><script src="/js/app-auth.js?v=20261008-desktop-audit1"></script><script src="/js/app-header-menu.js?v=20261008-desktop-audit1"></script></html>`);
  });
};
