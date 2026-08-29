/* Explain the missing part of Drive reading quality and suggest safe remediation. */
(function(){
  const $=id=>document.getElementById(id);
  const text=v=>String(v??'').trim();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const norm=v=>text(v).replace(/\s+/g,' ').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[()\-–—]/g,' ').trim();

  function isoFromDisplay(v){const m=text(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';}
  function getNumberAfter(label,s){const m=text(s).match(new RegExp(label+'\\s*([\\d,.]+)','i'));return m?num(m[1]):0;}

  function parseCard(card){
    const date=isoFromDisplay(card.querySelector('.drive-report-main strong')?.textContent||'');
    const detailEls=[...card.querySelectorAll('.drive-report-details > div')];
    const values={};
    detailEls.forEach(el=>{values[norm(el.querySelector('span')?.textContent)]=num(el.querySelector('strong')?.textContent);});
    const grid=[...card.querySelectorAll('.drive-detail-grid > div')];
    const crews=[...(grid[0]?.querySelectorAll('p')||[])].filter(p=>!text(p.textContent).includes('لا توجد بيانات'));
    const operations=[],stations=[];
    for(const p of grid[1]?.querySelectorAll('p')||[]){
      const s=text(p.textContent),i=s.indexOf(':');if(i<0)continue;
      const name=s.slice(0,i);
      if(norm(name).includes('محطه ترحيل')) stations.push({name,trucks:getNumberAfter('عدد الشاحنات',s),quantity:getNumberAfter('الكمية',s)});
      else operations.push({name,vehicles:getNumberAfter('عدد المركبات',s),quantity:getNumberAfter('الكمية',s)});
    }
    const equipment=[...(grid[2]?.querySelectorAll('p')||[])].filter(p=>!text(p.textContent).includes('لا توجد بيانات'));
    return {date,crews,operations,stations,equipment,totalWaste:values['النفايات']||0,totalTrucks:values['الشاحنات']||0,totalDiesel:values['السولار']||0};
  }

  function diagnostics(src,card){
    const items=[];
    const add=(points,part,location,problem,fixable,solution)=>items.push({points,part,location,problem,fixable,solution});
    if(!src.date) add(15,'التاريخ','عنوان ورقة اليوم / أعلى التقرير','لم يتم التعرف على تاريخ صالح','نعم غالبًا','توحيد صيغة التاريخ إلى DD/MM/YYYY أو قراءة التاريخ من اسم الورقة.');
    if(src.operations.length<1) add(25,'العمليات','قسم العمليات','لم يتم العثور على صفوف العمليات','نعم إذا كان اختلاف تسمية','توسيع مطابقة عنوان قسم العمليات وأسماء الحقول بدل الاعتماد على صيغة واحدة.');
    if(src.stations.length<3){
      const lost=src.stations.length?5:10;
      add(lost,'محطات الترحيل','قسم محطات الترحيل',src.stations.length?`تمت قراءة ${src.stations.length} محطة فقط من العدد المتوقع 3`:'لم يتم العثور على محطات الترحيل', 'نعم غالبًا','مطابقة أسماء الخليل/ترقوميا/يطا بمرونة ومعالجة المسافات والاختلافات الإملائية.');
    }
    if(src.equipment.length<10){
      const lost=src.equipment.length?10:20;
      add(lost,'المعدات','تقرير الصيانة اليومي',src.equipment.length?`تمت قراءة ${src.equipment.length} معدة فقط؛ العدد أقل من البنية المعتادة`:'لم يتم العثور على جدول المعدات','نعم غالبًا','توسيع التعرف على عنوان اسم الآلية ونهاية جدول المعدات مع إبقاء الأسماء القديمة كما هي عند الحاجة.');
    }
    if(src.crews.length<3){
      const lost=src.crews.length?5:10;
      add(lost,'شؤون الموظفين','قسم طواقم العمل',src.crews.length?`تمت قراءة ${src.crews.length} بند فقط من طواقم العمل`:'لم يتم العثور على طواقم العمل','نعم غالبًا','مطابقة بند طواقم العمل والمجموع حسب النص وليس رقم الصف.');
    }
    if(!(src.totalWaste>0)) add(10,'إجمالي النفايات','صف المجموع النهائي / كميات النفايات','إجمالي النفايات صفر أو لم تتم قراءته','يحتاج تحقق','قراءة المجموع النهائي مباشرة، وإن غاب يتم جمع المكب ومحطات الترحيل مع تنبيه.');
    if(!(src.totalTrucks>0)) add(5,'إجمالي المركبات','صف المجموع النهائي','إجمالي المركبات صفر أو لم تتم قراءته','يحتاج تحقق','قراءة المجموع النهائي أو إعادة حسابه من مركبات المكب ومحطات الترحيل.');
    if(!Number.isFinite(src.totalDiesel)) add(5,'إجمالي السولار','نهاية جدول المعدات','إجمالي السولار غير قابل للقراءة','نعم','جمع سولار المعدات إذا تعذر العثور على صف المجموع.');
    if(card.querySelector('.drive-status.invalid')) add(31,'بنية التقرير','الورقة اليومية','النظام صنف الورقة أصلًا بأنها تحتاج مراجعة','حسب السبب','عرض رسالة الخطأ الأصلية ومعالجة الحقل المفقود قبل الاستيراد.');
    return items;
  }

  function detailsHtml(items,read){
    const missing=Math.max(0,100-Number(read||0));
    if(!items.length){
      return `<details class="drive-quality-explain" style="margin-top:7px"><summary>تفاصيل جودة القراءة</summary><div style="font-size:12px;line-height:1.8;padding:7px 2px">لم يتم اكتشاف جزء ناقص من البنية الحالية. إذا كانت الجودة أقل من 100% فقد يكون السبب حدًا محافظًا في التقييم، وسنحتاج مقارنة الورقة الأصلية عند هذه الحالة.</div></details>`;
    }
    const rows=items.map(x=>`<div style="padding:7px 0;border-bottom:1px solid #edf2ee"><b>ناقص ${x.points}% — ${x.part}</b><br><span>المكان: ${x.location}</span><br><span>المشكلة: ${x.problem}</span><br><span>إمكانية المعالجة: ${x.fixable}</span><br><span>المعالجة المقترحة: ${x.solution}</span></div>`).join('');
    return `<details class="drive-quality-explain" style="margin-top:7px"><summary style="font-weight:800">لماذا الجودة ${read}%؟ عرض الجزء الناقص ${missing}%</summary><div style="font-size:12px;line-height:1.75;padding:7px 2px">${rows}</div></details>`;
  }

  function enhance(){
    for(const card of document.querySelectorAll('#previewReports .drive-report-card')){
      if(card.querySelector('.drive-quality-explain'))continue;
      const metrics=card.querySelector('.drive-auto-metrics');if(!metrics)continue;
      const read=Number(card.dataset.readingScore||0);
      const src=parseCard(card),items=diagnostics(src,card);
      const host=card.querySelector('.drive-auto-metrics-wrap')||card.querySelector('.drive-report-main');
      if(host)host.insertAdjacentHTML('beforeend',detailsHtml(items,read));
    }
  }

  function watch(){const root=$('previewReports');if(!root)return;let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhance,260);}).observe(root,{childList:true,subtree:true});setTimeout(enhance,500);}
  document.addEventListener('DOMContentLoaded',watch);
})();
