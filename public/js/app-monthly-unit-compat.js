/* Preserve operation units in monthly print and warn on mixed leachate units. */
(function(){
  const original = window.buildMonthlyReportHtml;
  if (typeof original !== 'function') return;

  function clean(v){ return String(v ?? '').replace(/\s+/g,' ').trim(); }
  function canonical(name){
    const v=clean(name);
    const aliases=new Map([
      ['كميات العصارة','كميات العصارة المرحلة'],
      ['مواد التغطية ( طمم)','مواد التغطية (طمم)'],
      ['كميات المياه','كميات المياه للتعقيم والترطيب'],
      ['( طمم) خارجي','طمم خارجي'],
      ['(طمم) خارجي','طمم خارجي']
    ]);
    return aliases.get(v)||v;
  }

  async function monthlyLeachateUnits(){
    const monthValue=document.getElementById('archiveMonthFilter')?.value||'';
    if(!monthValue || typeof window.getMonthlyDetailedReports!=='function') return [];
    try{
      const details=await window.getMonthlyDetailedReports(monthValue);
      const units=new Set();
      for(const data of details||[]){
        for(const item of data.operations||[]){
          if(canonical(item.operation_name)==='كميات العصارة المرحلة'){
            const unit=clean(item.unit);
            if(unit) units.add(unit);
          }
        }
      }
      return [...units];
    }catch(_){ return []; }
  }

  window.buildMonthlyReportHtml = async function(){
    let html=await original();
    if(!html) return html;
    const units=await monthlyLeachateUnits();
    if(!units.length) return html;

    if(units.length===1){
      html=html.replace(/(<tr><td>كميات العصارة المرحلة<\/td><td>[^<]*<\/td><td>[^<]*<\/td><td>)([^<]*)(<\/td><\/tr>)/,
        `$1${units[0]}$3`);
      return html;
    }

    html=html.replace(/(<tr><td>كميات العصارة المرحلة<\/td><td>[^<]*<\/td><td>)([^<]*)(<\/td><td>)([^<]*)(<\/td><\/tr>)/,
      '$1راجع التفاصيل$3وحدات مختلفة$5');
    html=html.replace('<div class="section-title">ملخص العمليات الشهرية</div>',
      '<div class="section-title">ملخص العمليات الشهرية</div><div class="comparison-empty">تنبيه: بيانات العصارة في هذا الشهر تحتوي أكثر من وحدة قياس، لذلك لم يتم اعتماد مجموع موحد لها.</div>');
    return html;
  };
})();
