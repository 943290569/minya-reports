/* Stable 10 — monthly report comparison aligned with elapsed days for the current month. */
(function(){
  function jerusalemToday(){
    return new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'
    }).format(new Date());
  }

  function isCurrentMonth(monthValue){
    return String(monthValue||'')===jerusalemToday().slice(0,7);
  }

  function throughElapsedDay(reports,monthValue){
    const rows=Array.isArray(reports)?reports:[];
    if(!isCurrentMonth(monthValue))return rows;
    const elapsedDay=Number(jerusalemToday().slice(8,10));
    return rows.filter(report=>{
      const date=String(report?.report_date||'');
      return Number(date.slice(8,10))<=elapsedDay;
    });
  }

  updateMonthlyComparison=async function(monthValue,currentDieselTotal=null){
    const title=document.getElementById('monthlyComparisonTitle');
    const grid=document.getElementById('monthlyComparisonGrid');
    const empty=document.getElementById('monthlyComparisonEmpty');
    if(!title||!grid||!empty)return;

    const setValue=(id,value)=>{const element=document.getElementById(id);if(element)element.textContent=value;};
    if(!monthValue){
      title.textContent='مقارنة مع الشهر السابق';
      grid.classList.add('hidden');empty.classList.remove('hidden');empty.textContent='اختر شهرًا لعرض المقارنة.';return;
    }

    const previousMonth=getPreviousMonthForArchive(monthValue);
    const currentAll=archiveReports.filter(report=>String(report.report_date||'').startsWith(monthValue));
    const previousAll=archiveReports.filter(report=>String(report.report_date||'').startsWith(previousMonth));
    const currentReports=throughElapsedDay(currentAll,monthValue);
    const previousReports=isCurrentMonth(monthValue)?throughElapsedDay(previousAll,monthValue):previousAll;
    const elapsedDay=isCurrentMonth(monthValue)?Number(jerusalemToday().slice(8,10)):null;

    title.textContent=`مقارنة مع الشهر السابق - ${getMonthName(previousMonth)}${elapsedDay?` حتى اليوم ${elapsedDay}`:''}`;
    if(!currentReports.length||!previousReports.length){
      grid.classList.add('hidden');empty.classList.remove('hidden');empty.textContent='لا توجد بيانات محفوظة للشهر السابق للمقارنة.';return;
    }

    const sum=(rows,key)=>rows.reduce((total,report)=>total+Number(report?.[key]||0),0);
    const currentWaste=sum(currentReports,'total_waste_tons');
    const currentTrucks=sum(currentReports,'total_trucks');
    const previousWaste=sum(previousReports,'total_waste_tons');
    const previousTrucks=sum(previousReports,'total_trucks');

    let currentDiesel=currentDieselTotal;
    if(isCurrentMonth(monthValue))currentDiesel=sum(currentReports,'total_diesel');
    else if(currentDiesel===null)currentDiesel=sum(currentReports,'total_diesel');
    const previousDiesel=sum(previousReports,'total_diesel');

    setValue('monthlyWasteChange',formatArchiveChange(currentWaste,previousWaste));
    setValue('monthlyWasteChangeValues',`${formatNumber(previousWaste)} ← ${formatNumber(currentWaste)} طن`);
    setValue('monthlyTrucksChange',formatArchiveChange(currentTrucks,previousTrucks));
    setValue('monthlyTrucksChangeValues',`${formatNumber(previousTrucks)} ← ${formatNumber(currentTrucks)}`);
    setValue('monthlyDieselChange',formatArchiveChange(currentDiesel,previousDiesel));
    setValue('monthlyDieselChangeValues',`${formatNumber(previousDiesel)} ← ${formatNumber(currentDiesel)} لتر`);
    empty.classList.add('hidden');grid.classList.remove('hidden');
  };
})();
