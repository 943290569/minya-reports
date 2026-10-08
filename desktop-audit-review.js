const fs=require('node:fs'),path=require('node:path');
module.exports=function(app,{requireRole,dataDir,db}){
  app.get('/maintenance-document-review',requireRole('admin'),(req,res)=>{
    const file=path.join(dataDir,'desktop-audit-maintenance-review.json');
    const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let rows=[];try{rows=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
    const items=rows.map(r=>{const names=String(r.assets||'').split(',').map(id=>db.prepare('SELECT name FROM equipment_assets WHERE id=?').get(Number(id))?.name||'').filter(Boolean).join('، ');return `<article><h2>${esc(r.name)}</h2><p>المعدة: ${esc(names)} — رقم الملف: ${Number(r.file_id)||0}</p><pre>${esc(r.text||'تعذر قراءة المستند')}</pre></article>`;}).join('');
    res.setHeader('Cache-Control','no-store');
    res.type('html').send(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مراجعة مستندات الصيانة</title><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/app-bundle.css?v=3.8.0-20261008-desktop-audit1"><style>body{font-family:Arial,sans-serif;max-width:1100px;margin:30px auto;padding:16px;background:#f5f8f6;color:#153c30}article{background:white;padding:20px;margin:20px 0;border:1px solid #cbded3;border-radius:12px}pre{font:16px/1.8 Arial,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere}a{color:#17634c}</style><header class="top-header"><div><h1>نظام إدارة مكب المنيا</h1><p>مراجعة مستندات الصيانة</p></div><nav><a class="app-nav-link" href="/">الرئيسية</a></nav></header><main><h2>مراجعة مستندات الصيانة</h2><a href="/equipment-maintenance-finance.html">العودة لسجل الصيانة والتكاليف</a><p>عدد المستندات المقروءة: ${rows.length}. راجع التاريخ والفاتورة والشركة والتكلفة قبل تحويل المستند إلى سجل مالي. رفع الملف لا يثبت تاريخ تنفيذ الصيانة.</p>${items||'<p>لا توجد مستندات مقروءة للمراجعة حاليًا.</p>'}</main><script src="/js/app-auth.js?v=20261008-desktop-audit1"></script><script src="/js/app-header-menu.js?v=20261008-desktop-audit1"></script></html>`);
  });
};
