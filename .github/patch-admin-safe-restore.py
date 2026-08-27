from pathlib import Path
p=Path('public/js/app-v3-pages.js')
s=p.read_text()
old='''<div class="v3-panel"><h3>النسخ الاحتياطي والاستعادة</h3><a class="v3-primary inline" href="/api/backup/download">تنزيل نسخة كاملة</a><label class="restore-label">استعادة نسخة JSON<input id="restoreFile" type="file" accept="application/json"></label><button id="restoreBtn">استعادة بعد التأكيد</button><p id="restoreMsg">يتم إنشاء نسخة تلقائية قبل الاستعادة.</p></div>'''
new='''<div class="v3-panel"><h3>النسخ الاحتياطي والاستعادة</h3><a class="v3-primary inline" href="/api/backup/download">تنزيل نسخة كاملة</a><p>للحماية من استعادة ملف غير صالح، تتم الاستعادة من شاشة إدارة النظام بعد فحص النسخة ومعاينتها والتأكيد.</p><a class="v3-link-btn" href="/system.html">فتح الاستعادة الآمنة</a></div>'''
assert old in s, 'admin restore panel not found'
s=s.replace(old,new,1)
old2="""    restoreBtn.onclick=async()=>{const f=restoreFile.files[0];if(!f)return; if(!confirm('سيتم استبدال بيانات التقارير الحالية بالنسخة المختارة. متابعة؟'))return;try{const obj=JSON.parse(await f.text());const d=await api('/api/backup/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});restoreMsg.textContent=d.message;}catch(e){restoreMsg.textContent=e.message;}};load();"""
new2="""    load();"""
assert old2 in s, 'direct admin restore handler not found'
s=s.replace(old2,new2,1)
p.write_text(s)
