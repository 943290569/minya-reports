/* Linked monthly/annual Summary generated directly from stored daily reports. */
(function(){
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const fmt=value=>Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2});

  function quantityTable(title,rows){
    if(!Array.isArray(rows)||!rows.length)return '';
    return `<section class="linked-summary-block"><h5>${esc(title)}</h5><div class="linked-summary-scroll"><table><thead><tr><th>البيان</th><th>المركبات / المرات</th><th>الكمية</th><th>المعدل اليومي</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.name)}</td><td>${fmt(row.vehicles)}</td><td>${fmt(row.quantity)} ${esc(row.unit||'')}</td><td>${fmt(row.daily_average)} ${esc(row.unit||'')}</td></tr>`).join('')}</tbody></table></div></section>`;
  }

  function equipmentTable(rows){
    if(!Array.isArray(rows)||!rows.length)return '';
    const total=rows.reduce((sum,row)=>sum+Number(row.diesel_liters||0),0);
    return `<section class="linked-summary-block"><h5>مجموع سولار المعدات</h5><div class="linked-summary-scroll"><table><thead><tr><th>الآلية</th><th>السولار</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.name)}</td><td>${fmt(row.diesel_liters)} لتر</td></tr>`).join('')}<tr class="linked-summary-total"><th>المجموع</th><th>${fmt(total)} لتر</th></tr></tbody></table></div></section>`;
  }

  function renderLinkedPeriodSummary(mode,details){
    const isAnnual=mode==='annual';
    const root=isAnnual?document.getElementById('annualSummarySection'):document.getElementById('monthlyReportSection');
    const anchor=isAnnual?document.getElementById('annualSummaryCards'):root?.querySelector('.monthly-summary');
    const id=isAnnual?'annualLinkedSummary':'monthlyLinkedSummary';
    let panel=document.getElementById(id);
    if(!root||!anchor)return;
    if(!panel){panel=document.createElement('section');panel.id=id;panel.className='linked-period-summary';anchor.insertAdjacentElement('afterend',panel);}
    if(!details||!Number(details.days||0)){
      panel.innerHTML='<div class="linked-summary-empty">لا توجد تقارير يومية لحساب المجاميع المرتبطة.</div>';
      return;
    }
    const totals=details.totals||{};
    const wasteDifference=Math.abs(Number(totals.recorded_waste_tons||0)-Number(totals.incoming_waste_tons||0));
    const differenceNotice=wasteDifference>0.01?`<div class="linked-summary-warning"><b>تنبيه اختلاف:</b> الإجمالي المسجل في التقارير اليومية هو ${fmt(totals.recorded_waste_tons)} طن، بينما مجموع المكب والمحطات هو ${fmt(totals.incoming_waste_tons)} طن. الفرق ${fmt(wasteDifference)} طن ويحتاج مراجعة التقارير اليومية.</div>`:'';
    panel.innerHTML=`<div class="linked-summary-head"><div><span>SUMMARY LINK</span><h4>المجاميع المرتبطة بالتقارير اليومية</h4><p>تتحدث تلقائيًا من ${fmt(details.days)} تقريرًا دون جمع مكرر.</p></div><div class="linked-summary-kpis"><div><small>نفايات مكب المنيا</small><strong>${fmt(totals.landfill_waste_tons)} طن</strong><em>${fmt(totals.landfill_trucks)} مركبة</em></div><div><small>نفايات محطات الترحيل</small><strong>${fmt(totals.station_waste_tons)} طن</strong><em>${fmt(totals.station_trucks)} شاحنة</em></div><div class="linked-summary-grand"><small>إجمالي الوارد لمكب المنيا</small><strong>${fmt(totals.incoming_waste_tons)} طن</strong><em>${fmt(totals.incoming_trucks)} مركبة وشاحنة</em></div><div><small>إجمالي السولار</small><strong>${fmt(totals.diesel_liters)} لتر</strong></div></div></div><div class="linked-summary-formula"><b>طريقة الحساب:</b> إجمالي النفايات الواردة لمكب المنيا = نفايات مكب المنيا + نفايات جميع محطات الترحيل.</div>${differenceNotice}${quantityTable('عمليات مكب المنيا والخدمات',details.operations)}${quantityTable('محطات الترحيل — محسوبة بصورة مستقلة',details.stations)}${equipmentTable(details.equipment)}`;
  }

  window.renderLinkedPeriodSummary=renderLinkedPeriodSummary;
})();
