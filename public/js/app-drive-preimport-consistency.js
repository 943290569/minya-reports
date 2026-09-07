/* Read-only pre-import consistency guard for Drive/Excel daily reports. */
(function(){
  const $=id=>document.getElementById(id);
  const text=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>text(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const m=text(v).replace(/,/g,'').match(/-?[\d.]+/);const n=m?Number(m[0]):0;return Number.isFinite(n)?n:0;};
  const same=(a,b)=>Math.abs(Number(a||0)-Number(b||0))<=0.05;

  function numberAfter(label,value){
    const s=text(value).replace(/,/g,'');
    const m=s.match(new RegExp(`${label}\\s*([\\d.]+)`,'i'));
    return m?Number(m[1]||0):0;
  }

  function cardTotals(card){
    const detail=[...card.querySelectorAll('.drive-report-details > div')];
    const values={};
    for(const el of detail){
      const key=norm(el.querySelector('span')?.textContent||'');
      values[key]=num(el.querySelector('strong')?.textContent||'');
    }
    return {
      waste:values['النفايات']||0,
      trucks:values['الشاحنات']||0,
      diesel:values['السولار']||0
    };
  }

  function detailTotals(card){
    const groups=[...card.querySelectorAll('.drive-detail-grid > div')];
    let waste=0,trucks=0,diesel=0;
    for(const p of groups[1]?.querySelectorAll('p')||[]){
      const s=text(p.textContent),i=s.indexOf(':');
      if(i<0)continue;
      const name=norm(s.slice(0,i));
      if(name.includes('مكب نفايات المنيا')){
        trucks+=numberAfter('عدد المركبات',s);
        waste+=numberAfter('الكمية',s);
      }else if(name.includes('محطه ترحيل')){
        trucks+=numberAfter('عدد الشاحنات',s);
        waste+=numberAfter('الكمية',s);
      }
    }
    for(const p of groups[2]?.querySelectorAll('p')||[]){
      const s=text(p.textContent),parts=s.split('·');
      if(parts.length>1)diesel+=num(parts[parts.length-1]);
    }
    return {waste,trucks,diesel};
  }

  function dateLabel(card){
    return text(card.querySelector('.drive-report-main strong')?.textContent||'التقرير');
  }

  function validateSelected(){
    const cards=[...document.querySelectorAll('#previewReports .drive-report-card')];
    const critical=[];
    const dieselWarnings=[];
    for(const card of cards){
      const cb=card.querySelector('[data-import-check]');
      if(!cb?.checked||cb.disabled)continue;
      const total=cardTotals(card),detail=detailTotals(card),date=dateLabel(card);
      const diffs=[];
      if(!same(total.trucks,detail.trucks))diffs.push(`الشاحنات: الإجمالي ${total.trucks} / التفاصيل ${detail.trucks}`);
      if(!same(total.waste,detail.waste))diffs.push(`النفايات: الإجمالي ${total.waste} / التفاصيل ${detail.waste}`);
      if(diffs.length)critical.push(`${date} — ${diffs.join('، ')}`);
      if(!same(total.diesel,detail.diesel))dieselWarnings.push(`${date} — السولار: الإجمالي ${total.diesel} / تفاصيل المعدات ${detail.diesel}`);
    }
    return {critical,dieselWarnings};
  }

  function handleApprove(event){
    const {critical,dieselWarnings}=validateSelected();
    if(critical.length){
      event.preventDefault();
      event.stopImmediatePropagation();
      alert(`تم إيقاف الاعتماد حفاظًا على البيانات.\n\nيوجد اختلاف بين الإجمالي والتفاصيل في الشاحنات أو النفايات:\n${critical.slice(0,12).join('\n')}${critical.length>12?'\n...':''}\n\nراجع المعاينة قبل الحفظ.`);
      return;
    }
    if(dieselWarnings.length){
      const proceed=confirm(`ملاحظة قبل الاعتماد:\nيوجد اختلاف في إجمالي السولار عن مجموع تفاصيل المعدات في ${dieselWarnings.length} تقرير.\n\n${dieselWarnings.slice(0,8).join('\n')}${dieselWarnings.length>8?'\n...':''}\n\nهذا لا يمنع الاستيراد تلقائيًا. هل تريد المتابعة؟`);
      if(!proceed){event.preventDefault();event.stopImmediatePropagation();}
    }
  }

  function init(){
    const btn=$('approveImportBtn');
    if(btn&&!btn.dataset.consistencyGuard){
      btn.dataset.consistencyGuard='1';
      btn.addEventListener('click',handleApprove,true);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
