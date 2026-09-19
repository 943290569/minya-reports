/* Screen presentation and navigation. No record mutations. */
(function(){
  const route=location.pathname.replace(/\/+$/,'')||'/';
  const $=id=>document.getElementById(id);
  const groups=[
    ['التقارير والبحث',['/','/report','/archive','/monthly','/annual','/weekly','/search','/managerial','/global-search']],
    ['التشغيل والمتابعة',['/ops-dashboard','/equipment','/equipment-management','/fleet','/drivers-licenses.html','/maintenance-incidents','/environment','/tasks','/contracts','/cells','/external-diesel','/files']],
    ['الإدارة والبيانات',['/admin','/system.html','/drive-import.html','/reviews']]
  ];
  function groupMenu(menu){
    if(!menu)return;
    if(menu.classList.contains('minya-desktop-more-panel'))menu.style.setProperty('--review-menu-top',`${Math.ceil(menu.parentElement.getBoundingClientRect().bottom)+8}px`);
    const links=[...menu.querySelectorAll('a[href]')];
    if(!links.some(a=>a.parentElement===menu))return;
    menu.querySelectorAll('.review-nav-group').forEach(g=>g.remove());
    groups.forEach(([label,paths])=>{
      const members=links.filter(a=>paths.includes(new URL(a.href,location.origin).pathname));
      if(!members.length)return;
      const group=document.createElement('section');group.className='review-nav-group';
      const title=document.createElement('strong');title.textContent=label;group.append(title);
      members.forEach(a=>group.append(a));menu.append(group);
    });
  }
  function fold(panel,title){
    if(!panel||panel.hidden||panel.classList.contains('hidden')||panel.closest('.review-disclosure')||panel.matches('details'))return;
    const details=document.createElement('details');details.className='review-disclosure';
    const summary=document.createElement('summary');summary.textContent=title;
    panel.before(details);details.append(summary,panel);
    // Reveal any form being populated for editing, including programmatic focus.
    panel.addEventListener('focusin',()=>{details.open=true;});
  }
  const hints={
    '/report':'في التقرير الجديد، أعداد الطواقم وحالات المعدات والقيم المعبأة هي قيم افتراضية. راجع كل قسم وفق التشغيل الفعلي قبل الحفظ.',
    '/ops-dashboard':'للإعداد الأولي: سجّل مركبات الحركة والمعدات الوقائية، ثم أضف سجلات البيئة والمهام. هذه السجلات مستقلة عن أرشيف التقارير اليومية.',
    '/maintenance-incidents':'هذه السجلات لمتابعة الحوادث والأعطال والإجراءات والمرفقات. ملخص المعدات يستخرج الحالة من التقرير اليومي؛ وخطط الصيانة الوقائية تُدار في سجل المعدات.',
    '/environment':'هذا سجل بيئي مستقل يتطلب إدخالًا إضافيًا. لا تنسخ الكميات تلقائيًا من التقرير اليومي؛ طابقها مع القياسات الفعلية. م³ تعني مترًا مكعبًا (كوب).',
    '/equipment':'هذا الملخص مستخرج من التقارير اليومية. سجل المعدات الوقائية مستقل؛ أضف الأصول وخطط صيانتها في صفحة إدارة المعدات الوقائية.',
    '/equipment-management':'ابدأ بتسجيل المعدة ثم قراءة العداد وخطة الصيانة. ظهور المعدات في التقارير اليومية لا ينشئ أصلًا وقائيًا تلقائيًا.',
    '/fleet':'هذه القائمة لمركبات حركة المكب. رخص سائقي المجلس محفوظة في سجل مستقل؛ خلو قائمة المركبات لا يعني غياب السائقين.',
    '/contracts':'سجّل العقد وقيمته وتواريخه أولًا، ثم اربط الملاحظات التشغيلية به. دوّن عملة العقد في الملاحظات واستخدمها نفسها للقيمة والمدفوع. المتبقي هو قيمة العقد ناقص المدفوع.',
    '/cells':'أدخل السعة بوحدة النموذج نفسها. عند غياب القيمة بالطن يُحسب الطن = الحجم م³ × كثافة الدمك. المتبقي = السعة − المستخدم، والعمر بالأيام = المتبقي ÷ المتوسط اليومي. راجع القيم ميدانيًا.',
    '/tasks':'أضف المهمة وحدد المسؤول والأولوية والموعد، ثم تابع حالتها من القائمة.',
    '/global-search':'ابحث برقم التقرير أو اسم المعدة أو كلمة من الملاحظات، ثم استخدم نوع النتيجة لتحديد السجل المطلوب.',
    '/reviews':'هذه القائمة للتقارير المنتظرة للاعتماد. يمكن مراجعة التقارير المعادة أو المعتمدة من الأرشيف.',
    '/system.html':'عداد المرفقات المحلية يخص التخزين على الخادم؛ الملفات السحابية R2 تُعرض في صفحة ملفات ومرفقات الموقع. قد يختلف العدّادان لأنهما يقيسان مخزنين مختلفين.'
  };
  function apply(){
    groupMenu($('minyaHeaderMenu'));groupMenu(document.querySelector('.minya-desktop-more-panel'));
    const main=document.querySelector('main');if(!main)return;
    if(hints[route]&&!$('reviewPageHint')){
      const p=document.createElement('p');p.id='reviewPageHint';p.className='review-note';p.textContent=hints[route];const related={'/equipment':['/equipment-management','فتح سجل المعدات الوقائية'],'/equipment-management':['/equipment','عرض بيانات المعدات من التقارير'],'/fleet':['/drivers-licenses.html','فتح رخص السائقين'],'/reviews':['/archive','فتح أرشيف التقارير'],'/system.html':['/files','فتح الملفات السحابية']}[route];if(related){const a=document.createElement('a');a.href=related[0];a.textContent=related[1];p.append(document.createElement('br'),a);}main.prepend(p);
    }
    if(['/fleet','/tasks','/contracts','/cells','/maintenance-incidents','/environment','/equipment'].includes(route)){
      main.querySelectorAll('.v3-panel,.panel').forEach(panel=>{
        const h=panel.querySelector('h2,h3');
        if(h&&/^(إضافة|تسجيل|إدخال)/.test(h.textContent.trim())&&panel.querySelector('input,textarea'))fold(panel,h.textContent);
      });
    }
    if(route==='/monthly-entry.html'){
      const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hebron',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));const today=`${parts.year}-${parts.month}-${parts.day}`;
      main.querySelectorAll('tr[data-date]').forEach(row=>{const future=row.dataset.date>today;row.classList.toggle('review-future-day',future);const day=row.querySelector('.me-day');if(future&&day&&!day.querySelector('.review-future-label')){const note=document.createElement('small');note.className='review-future-label';note.textContent='يوم قادم';day.append(note);}});
    }
    if(route==='/'){
      const insights=$('freeSmartInsights')||$('smartOperationsFree');if(insights&&!$('reviewCoverageNote')){const p=document.createElement('p');p.id='reviewCoverageNote';p.className='review-note';p.textContent='التحليلات تعتمد السجلات المتاحة فقط. قلة التقارير أو وجود تقرير واحد لا تكفي للحكم على اتجاه الأداء؛ راجع عدد الأيام وآخر تاريخ مسجّل.';insights.prepend(p);}
    }
    if(route==='/report'){
      ['crewsTable','operationsTable','stationsTable','equipmentTable','notes'].forEach(id=>{const panel=$(id)?.closest('section.panel');fold(panel,panel?.querySelector('h2')?.textContent||'تفاصيل التقرير');});
    }
    if(['/external-diesel','/external-diesel.html'].includes(route)){
      fold($('edQuickPanel'),'إضافة تعبئات السولار');fold($('edImportPanel'),'استيراد كشف التعبئة');
    }
    if(route==='/tasks'&&$('managementFilter')){
      let owner=$('reviewTaskOwner'),priority=$('reviewTaskPriority');
      if(!owner){
        const parent=$('managementFilter').parentElement;
        for(const [id,title] of [['reviewTaskOwner','المسؤول'],['reviewTaskPriority','الأولوية']]){const label=document.createElement('label');label.textContent=title;const select=document.createElement('select');select.id=id;label.append(select);parent.append(label);select.addEventListener('change',apply);}
        owner=$('reviewTaskOwner');priority=$('reviewTaskPriority');
      }
      const rows=[...($('managementBody')?.querySelectorAll('tr')||[])].filter(row=>row.cells.length>3);
      for(const [select,column,title] of [[owner,2,'جميع المسؤولين'],[priority,3,'جميع الأولويات']]){
        const values=[...new Set(rows.map(row=>row.cells[column].textContent.trim()))],current=select.value;
        if(JSON.stringify(values)!==select.dataset.values){select.replaceChildren(...['',...values].map(value=>{const option=document.createElement('option');option.value=value;option.textContent=value||title;return option;}));select.dataset.values=JSON.stringify(values);select.value=values.includes(current)?current:'';}
      }
      rows.forEach(row=>row.hidden=!!((owner.value&&row.cells[2].textContent.trim()!==owner.value)||(priority.value&&row.cells[3].textContent.trim()!==priority.value)));
    }
    if(route==='/global-search'&&$('globalQ')){
      let select=$('reviewResultType');
      if(!select){const label=document.createElement('label');label.textContent='نوع النتيجة';select=document.createElement('select');select.id='reviewResultType';label.append(select);$('globalQ').parentElement.append(label);select.addEventListener('change',apply);}
      const rows=[...($('globalResults')?.querySelectorAll('tbody tr')||[])];
      const types=[...new Set(rows.map(row=>row.cells[0]?.textContent||''))].filter(Boolean);
      const current=select.value,options=['',...types];
      if(JSON.stringify(options)!==select.dataset.options){select.replaceChildren(...options.map(value=>{const option=document.createElement('option');option.value=value;option.textContent=value||'جميع الأنواع';return option;}));select.dataset.options=JSON.stringify(options);select.value=types.includes(current)?current:'';}
      rows.forEach(row=>row.hidden=!!select.value&&row.cells[0]?.textContent!==select.value);
    }
    if(route==='/admin'){
      fold($('fullUserManagement'),'المستخدمون والصلاحيات');fold($('guestLinksPanel'),'روابط الدخول المؤقتة للقراءة');
    }
    if(route==='/drive-import.html'){
      ['sourceFilesPanel','localExcelPanel','driveSetupPanel'].forEach(id=>{const p=$(id);fold(p,p?.querySelector('h3')?.textContent||'إعدادات الربط');});
    }
    if(route==='/drivers-licenses.html'){
      fold($('licenseUploadPanel'),'رفع صورة رخصة وربطها');
      if($('licenseBody')&&!$('licenseSearch')&&!$('reviewLicenseSearch')){
        const label=document.createElement('label');label.className='review-quick-search';label.textContent='بحث سريع في الرخص';
        const input=document.createElement('input');input.id='reviewLicenseSearch';input.type='search';input.placeholder='الاسم أو الفئة أو تاريخ الانتهاء';
        label.append(input);$('licenseBody').closest('.v3-table-wrap').before(label);
        input.addEventListener('input',filterLicenses);
      }
      filterLicenses();
    }
    main.querySelectorAll('button').forEach(b=>{
      const text=b.textContent.trim();
      if(/^حذف(?:\s|$)/.test(text))b.classList.add('review-danger');
      if(/^(إلغاء|تراجع|طباعة|تحديث|إعادة تحميل|السابق|التالي)/.test(text))b.classList.add('review-secondary');
    });
    const role=window.MINYA_USER?.role||'';
    if(role&&!['admin','editor'].includes(role)){
      main.querySelectorAll('button').forEach(b=>{const text=b.textContent.trim();if(/^(حفظ|إضافة|تعديل|حذف|اعتماد|إعادة فتح|إنشاء|رفع|استيراد|استبدال)/.test(text))b.classList.add('review-readonly-hidden');});
      main.querySelectorAll('input[type="file"]').forEach(el=>el.classList.add('review-readonly-hidden'));
    }
    const translations={'TASKS & FOLLOW-UP':'المهام والمتابعة','LANDFILL CELLS':'الخلايا والسعة','EQUIPMENT MANAGEMENT V3.7':'الصيانة الوقائية','CLOUD FILES V3.8':'ملفات الموقع',TASKS:'المهام',CONTRACTS:'العقود',CELLS:'الخلايا والسعة',USERS:'المستخدمون','SUMMARY LINK':'ملخص مرتبط','VIEWER LINKS':'روابط القراءة',TODAY:'اليوم',FLEET:'مركبات الحركة',OPERATIONS:'التشغيل',ENVIRONMENT:'البيئة','MINYA LANDFILL':'مكب المنيا','DRIVE & EXCEL IMPORT':'استيراد البيانات'};
    main.querySelectorAll('.v3-hero span,.today-operations-head span,.linked-summary-head span,.user-management-head span').forEach(el=>{const translated=translations[el.textContent.trim()];if(translated)el.textContent=translated;});
  }
  function filterLicenses(){
    if(!$('reviewLicenseSearch'))return;
    const query=$('reviewLicenseSearch')?.value.trim().toLocaleLowerCase()||'';
    $('licenseBody')?.querySelectorAll('tr').forEach(tr=>{const hidden=!!query&&!tr.textContent.toLocaleLowerCase().includes(query);if(tr.hidden!==hidden)tr.hidden=hidden;});
  }
  function reportLocalDraft(){
    if(route!=='/report')return;
    const ids=['reportDate','weather','temperature','startTime','endTime','notes'];
    const key='minya_report_basic_draft_v1';
    const main=document.querySelector('main');if(!main)return;
    let timer=0;
    const save=()=>{clearTimeout(timer);timer=setTimeout(()=>{const values={};ids.forEach(id=>{const el=$(id);if(el)values[id]=el.value;});try{localStorage.setItem(key,JSON.stringify({saved_at:Date.now(),values}));}catch{}},350);};
    if(!new URLSearchParams(location.search).has('edit')){
      try{
        const draft=JSON.parse(localStorage.getItem(key)||'null');
        if(draft&&Date.now()-Number(draft.saved_at||0)<48*3600000&&draft.values&&(!$('reportDate')?.value)){
          ids.forEach(id=>{const el=$(id);if(el&&draft.values[id]!=null){el.value=draft.values[id];el.dispatchEvent(new Event('change',{bubbles:true}));}});
          const p=document.createElement('p');p.className='review-note';p.id='reviewDraftNote';p.textContent='تم استعادة الحقول الأساسية من مسودة محلية محفوظة على هذا المتصفح خلال آخر 48 ساعة.';main.prepend(p);
        }
      }catch{}
    }
    main.addEventListener('input',event=>{if(ids.includes(event.target?.id))save();},true);
    main.addEventListener('change',event=>{if(ids.includes(event.target?.id))save();},true);
    $('newReportBtn')?.addEventListener('click',()=>{try{localStorage.removeItem(key);}catch{}});
  }
  function readingControls(){
    if(document.body.classList.contains('auth-page')||$('reviewReading'))return;
    const box=document.createElement('details');box.id='reviewReading';box.className='review-reading no-print';
    box.innerHTML='<summary>سهولة القراءة</summary><p>تفضيلات هذا المتصفح فقط</p><label>النص<select id="reviewReadingSize"><option value="">إعداد الموقع</option><option value="balanced">متوازن</option><option value="large">كبير</option><option value="accessible">قراءة أوضح</option></select></label><label>المظهر<select id="reviewReadingTheme"><option value="">إعداد الموقع</option><option value="day">نهاري</option><option value="night">ليلي</option></select></label><button type="button" id="reviewReadingSave">حفظ تفضيلاتي</button>';
    document.body.append(box);
    try{const saved=JSON.parse(localStorage.getItem('minya_personal_reading_v1')||'{}');$('reviewReadingSize').value=saved.typographyPreset||'';$('reviewReadingTheme').value=saved.theme||'';}catch{}
    $('reviewReadingSave').onclick=()=>{const saved={};if($('reviewReadingSize').value)saved.typographyPreset=$('reviewReadingSize').value;if($('reviewReadingTheme').value)saved.theme=$('reviewReadingTheme').value;try{localStorage.setItem('minya_personal_reading_v1',JSON.stringify(saved));location.reload();}catch{$('reviewReadingSave').textContent='تعذر حفظ التفضيلات';}};
  }
  function init(){
    const standalone=document.querySelector('.me-header');
    if(standalone&&!standalone.querySelector('.review-page-nav')){const nav=document.createElement('nav');nav.className='review-page-nav';nav.setAttribute('aria-label','التنقل');nav.innerHTML='<a href="/">الرئيسية</a> · <a href="/monthly">التقرير الشهري</a> · <a href="/archive">الأرشيف</a>';standalone.append(nav);}
    apply();readingControls();reportLocalDraft();let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;apply();});}).observe(document.body,{childList:true,subtree:true});}
  document.addEventListener('click',event=>{
    if(!event.target.closest('[data-edit],[data-edit-task],[data-edit-contract],[data-edit-cell]'))return;
    document.querySelectorAll('.review-disclosure').forEach(d=>{if(d.querySelector('input,textarea'))d.open=true;});
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
