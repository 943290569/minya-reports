/* Monthly closing workflow on /monthly */
(function(){
  const route=location.pathname.replace(/\/+$/,'')||'/';
  if(route!=='/monthly')return;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const api=async(url,opt)=>{const r=await fetch(url,opt),d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;};
  const role=()=>window.MINYA_USER?.role||document.documentElement.dataset.userRole||'';
  const thisMonth=()=>new Date().toISOString().slice(0,7);

  function style(){
    if(document.getElementById('monthlyCloseStyle'))return;
    const s=document.createElement('style');
    s.id='monthlyCloseStyle';
    s.textContent=`
      #monthlyClosePanel{margin:0 0 18px;padding:18px;border:1px solid rgba(23,107,79,.18);border-radius:16px;background:rgba(255,255,255,.92);box-shadow:0 8px 24px rgba(20,70,55,.07);direction:rtl}
      #monthlyClosePanel .mc-head{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
      #monthlyClosePanel h3{margin:0;font-size:1.05rem}
      #monthlyClosePanel .mc-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      #monthlyClosePanel input[type=month]{min-height:40px;padding:7px 10px;border:1px solid #cfd9d5;border-radius:10px;background:#fff}
      #monthlyClosePanel .mc-badge{display:inline-flex;align-items:center;padding:6px 11px;border-radius:999px;font-weight:800;background:#eef5f2;color:#176b4f}
      #monthlyClosePanel .mc-badge.approved{background:#e7f6ee;color:#0b6b3b}
      #monthlyClosePanel .mc-badge.completed{background:#fff5db;color:#8a5a00}
      #monthlyClosePanel .mc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}
      #monthlyClosePanel .mc-kpi{padding:12px;border-radius:12px;background:#f7faf9;text-align:center}
      #monthlyClosePanel .mc-kpi strong{display:block;font-size:1.25rem;margin-top:3px}
      #monthlyClosePanel textarea{width:100%;min-height:64px;resize:vertical;padding:9px;border:1px solid #cfd9d5;border-radius:10px;box-sizing:border-box}
      #monthlyClosePanel .mc-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      #monthlyClosePanel button{min-height:40px;border:0;border-radius:10px;padding:8px 13px;font-weight:800;cursor:pointer}
      #monthlyClosePanel .primary{background:#176b4f;color:#fff}
      #monthlyClosePanel .warning{background:#f3b21a;color:#2d2100}
      #monthlyClosePanel .muted{background:#e9efed;color:#29443a}
      #monthlyClosePanel .danger-note{margin-top:10px;padding:10px 12px;border-radius:10px;background:#fff1f1;color:#8c2020;font-weight:700}
      #monthlyClosePanel .mc-msg{margin-top:8px;font-weight:700}
      @media(max-width:700px){#monthlyClosePanel .mc-grid{grid-template-columns:1fr 1fr}#monthlyClosePanel{padding:14px}}
    `;
    document.head.appendChild(s);
  }

  async function mount(){
    style();
    const main=document.querySelector('main.container,main,.container');
    if(!main||document.getElementById('monthlyClosePanel'))return;
    const panel=document.createElement('section');
    panel.id='monthlyClosePanel';
    panel.innerHTML=`<div class="mc-head"><div><h3>إغلاق واعتماد الشهر</h3><small>تمييز الشهر الجاري عن الشهر المكتمل والمعتمد.</small></div><div class="mc-controls"><input id="mcMonth" type="month" value="${thisMonth()}"><span id="mcStatus" class="mc-badge">...</span></div></div><div id="mcBody"></div>`;
    main.prepend(panel);
    document.getElementById('mcMonth').addEventListener('change',load);
    await load();
  }

  async function load(){
    const month=document.getElementById('mcMonth')?.value||thisMonth();
    const body=document.getElementById('mcBody'),badge=document.getElementById('mcStatus');
    if(!body||!badge)return;
    body.innerHTML='<div class="mc-msg">جاري تحميل حالة الشهر...</div>';
    try{
      const d=await api(`/api/monthly-close/${encodeURIComponent(month)}`),m=d.month||{};
      badge.textContent=m.status_label||m.status||'';
      badge.className=`mc-badge ${m.status||''}`;
      const r=role();
      const canComplete=['admin','editor'].includes(r),isAdmin=r==='admin';
      body.innerHTML=`
        <div class="mc-grid">
          <div class="mc-kpi"><span>التقارير المسجلة</span><strong>${Number(m.reports_count||0)}</strong></div>
          <div class="mc-kpi"><span>التقارير المعتمدة</span><strong>${Number(m.approved_reports_count||0)}</strong></div>
          <div class="mc-kpi"><span>صفوف الإدخال الشهري</span><strong>${Number(m.staged_rows_count||0)}</strong></div>
        </div>
        <label><b>ملاحظات الإغلاق</b></label>
        <textarea id="mcNotes" placeholder="مثال: تم استلام ملفات الشهر ومراجعة المجاميع">${esc(m.notes||'')}</textarea>
        ${m.locked?'<div class="danger-note">هذا الشهر معتمد ومقفل. التعديل متاح للمدير فقط.</div>':''}
        <div class="mc-actions">
          ${canComplete&&m.status!=='completed'&&m.status!=='approved'?'<button class="warning" data-status="completed">تحديد كمكتمل</button>':''}
          ${isAdmin&&m.status!=='approved'?'<button class="primary" data-status="approved">اعتماد وإقفال الشهر</button>':''}
          ${isAdmin&&m.status!=='open'?'<button class="muted" data-status="open">إعادة فتح الشهر</button>':''}
        </div>
        <div id="mcMsg" class="mc-msg"></div>`;
      body.querySelectorAll('button[data-status]').forEach(btn=>btn.addEventListener('click',()=>setStatus(btn.dataset.status)));
    }catch(e){body.innerHTML=`<div class="mc-msg">${esc(e.message)}</div>`;badge.textContent='تعذر التحميل';}
  }

  async function setStatus(status){
    const month=document.getElementById('mcMonth')?.value||thisMonth();
    const notes=document.getElementById('mcNotes')?.value||'';
    const msg=document.getElementById('mcMsg');
    if(msg)msg.textContent='جاري الحفظ...';
    try{
      await api(`/api/monthly-close/${encodeURIComponent(month)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,notes})});
      await load();
    }catch(e){if(msg)msg.textContent=e.message;}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,450),{once:true});
  else setTimeout(mount,450);
})();
