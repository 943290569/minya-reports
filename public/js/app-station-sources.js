(()=>{
  const months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const station='محطة ترحيل يطا';
  const source='شركة عبد العزيز السعدي';
  const note='الكمية جزء من إجمالي محطة ترحيل يطا ولا تضاف مرة أخرى إلى الإجمالي العام.';
  const $=id=>document.getElementById(id);
  const fmt=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});
  let previewRows=[];
  let previewYear=0;
  let previewValid=false;

  const arabicDigits={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'};
  const latin=value=>String(value??'').replace(/[٠-٩۰-۹]/g,ch=>arabicDigits[ch]||ch).replace(/٫/g,'.').replace(/٬/g,',').trim();
  const parseNumber=value=>{
    const text=latin(value).replace(/,/g,'').replace(/\s/g,'');
    if(!text)return null;
    const n=Number(text);
    return Number.isFinite(n)?n:null;
  };
  const monthAliases=new Map([
    ['jan',1],['january',1],['يناير',1],
    ['feb',2],['february',2],['فبراير',2],
    ['mar',3],['march',3],['مارس',3],
    ['apr',4],['april',4],['أبريل',4],['ابريل',4],
    ['may',5],['مايو',5],
    ['jun',6],['june',6],['يونيو',6],
    ['jul',7],['july',7],['يوليو',7],
    ['aug',8],['august',8],['أغسطس',8],['اغسطس',8],
    ['sep',9],['sept',9],['september',9],['سبتمبر',9],
    ['oct',10],['october',10],['أكتوبر',10],['اكتوبر',10],
    ['nov',11],['november',11],['نوفمبر',11],
    ['dec',12],['december',12],['ديسمبر',12]
  ]);
  const monthFromToken=value=>{
    const key=latin(value).toLowerCase().replace(/[.*:_]/g,'').replace(/\b(total|subtotal)\b/g,'').trim();
    return monthAliases.get(key)||0;
  };
  const daysInMonth=(year,month)=>new Date(Date.UTC(year,month,0)).getUTCDate();
  const isoDate=(year,month,day)=>`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  function parseDateCell(value,selectedYear){
    const text=latin(value).replace(/\*\*/g,'').trim();
    let m=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m){
      const year=Number(m[1]),month=Number(m[2]),day=Number(m[3]);
      if(year!==selectedYear||month<1||month>12||day<1||day>daysInMonth(year,month))return null;
      return isoDate(year,month,day);
    }
    m=text.match(/^(\d{1,2})\s*[-/ ]\s*([A-Za-z\u0600-\u06FF]+)(?:\s*[-/ ]\s*(\d{2,4}))?$/);
    if(m){
      const day=Number(m[1]),month=monthFromToken(m[2]);
      let year=m[3]?Number(m[3]):selectedYear;if(year<100)year+=2000;
      if(year!==selectedYear||!month||day<1||day>daysInMonth(year,month))return null;
      return isoDate(year,month,day);
    }
    m=text.match(/^(\d{1,2})\s*[/.\-]\s*(\d{1,2})(?:\s*[/.\-]\s*(\d{2,4}))?$/);
    if(m){
      const day=Number(m[1]),month=Number(m[2]);
      let year=m[3]?Number(m[3]):selectedYear;if(year<100)year+=2000;
      if(year!==selectedYear||month<1||month>12||day<1||day>daysInMonth(year,month))return null;
      return isoDate(year,month,day);
    }
    return null;
  }

  async function api(url,opt={}){
    const r=await fetch(url,{cache:'no-store',headers:{'Content-Type':'application/json',...(opt.headers||{})},...opt});
    if(r.status===401){location.href='/login.html';throw new Error('يجب تسجيل الدخول');}
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||'حدث خطأ');
    return d;
  }

  function renderDaily(rows){
    if(!rows.length){$('dailyBody').innerHTML='<tr><td colspan="4" class="ss-empty">لا توجد تفاصيل يومية لهذه السنة.</td></tr>';return;}
    let lastMonth=0;const html=[];
    rows.forEach(r=>{
      const month=Number(String(r.entry_date).slice(5,7));
      if(month!==lastMonth){html.push(`<tr class="ss-month-row"><td colspan="4"><button type="button" class="secondary" data-month-toggle="${month}" aria-expanded="false">${months[month-1]||month} — عرض الأيام</button></td></tr>`);lastMonth=month;}
      html.push(`<tr data-daily-month="${month}" hidden><td>${r.entry_date}</td><td>${fmt(r.record_count)}</td><td>${fmt(r.quantity_tons)}</td><td>${r.included_in_station_total?'ضمن إجمالي يطا':'مستقل'}</td></tr>`);
    });
    $('dailyBody').innerHTML=html.join('');
    $('dailyBody').querySelectorAll('[data-month-toggle]').forEach(button=>button.onclick=()=>{
      const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));
      $('dailyBody').querySelectorAll(`[data-daily-month="${button.dataset.monthToggle}"]`).forEach(row=>row.hidden=!open);
    });
  }

  async function load(){
    const year=Number($('yearSelect').value);
    $('pasteYear').value=String(year);$('editYear').value=String(year);
    $('loadStatus').textContent='جاري تحميل البيانات...';
    try{
      const q=new URLSearchParams({year:String(year),station_name:station,source_name:source});
      const [monthly,daily]=await Promise.all([
        api(`/api/station-subsources?${q}`),
        api(`/api/station-subsources/daily?${q}`)
      ]);
      const map=new Map((monthly.rows||[]).map(r=>[Number(r.month),r]));
      $('rowsBody').innerHTML=months.map((name,i)=>{
        const r=map.get(i+1);
        if(!r)return `<tr><td>${name}</td><td>-</td><td>-</td><td>لا توجد بيانات</td></tr>`;
        const src=r.source==='daily'?`${fmt(r.detail_days)} يوم تفصيلي`:'مجموع شهري يدوي';
        return `<tr><td>${name}</td><td>${fmt(r.record_count)}</td><td>${fmt(r.quantity_tons)}</td><td>${src}</td></tr>`;
      }).join('');
      $('totalCount').textContent=fmt(monthly.summary?.record_count||0);
      $('totalQty').textContent=fmt(monthly.summary?.quantity_tons||0);
      renderDaily(daily.rows||[]);
      $('dailySummary').textContent=`${fmt(daily.summary?.days||0)} يوم | ${fmt(daily.summary?.record_count||0)} إرسالية | ${fmt(daily.summary?.quantity_tons||0)} طن`;
      $('loadStatus').textContent=`تم تحميل بيانات ${year}.`;
      $('loadStatus').className='ss-status ok';
    }catch(e){$('loadStatus').textContent=e.message;$('loadStatus').className='ss-status bad';}
  }

  function splitLine(line){
    let cells;
    if(line.includes('|')) cells=line.split('|').map(x=>x.trim()).filter(Boolean);
    else cells=line.includes('\t')?line.split('\t'):line.split(/\s{2,}/);
    return cells.map(x=>latin(x).replace(/\*\*/g,'').trim());
  }

  function parsePaste(){
    const year=Number($('pasteYear').value);
    if(!Number.isInteger(year)||year<2020||year>2100)throw new Error('حدد سنة صحيحة أولًا.');
    const text=$('pasteInput').value.replace(/\r/g,'').trim();
    if(!text)throw new Error('الصق بيانات Excel أولًا.');
    const expected=new Map();let expectedGrand=null;
    const byDate=new Map();let ignored=0;
    for(const raw of text.split('\n')){
      const line=raw.trim();if(!line)continue;
      const cells=splitLine(line);const first=String(cells[0]||'').trim();
      if(!first){ignored++;continue;}
      const count=parseNumber(cells[1]),qty=parseNumber(cells[2]);
      const isGrand=/الإجمالي|الاجمالي|grand\s*total/i.test(first);
      if(isGrand){if(count!=null&&qty!=null)expectedGrand={count,qty};ignored++;continue;}
      const headerMonth=monthFromToken(first);
      if(headerMonth){if(count!=null&&qty!=null)expected.set(headerMonth,{count,qty});ignored++;continue;}
      const date=parseDateCell(first,year);
      if(!date){ignored++;continue;}
      if(count==null||qty==null||count<0||qty<0||!Number.isInteger(count))throw new Error(`قيمة غير صالحة في صف ${first}. يجب أن يكون العدد صحيحًا والكمية رقمية.`);
      const current=byDate.get(date)||{entry_date:date,record_count:0,quantity_tons:0};
      current.record_count+=count;current.quantity_tons=Number((current.quantity_tons+qty).toFixed(4));byDate.set(date,current);
    }
    const rows=[...byDate.values()].sort((a,b)=>a.entry_date.localeCompare(b.entry_date));
    if(!rows.length)throw new Error('لم أجد صفوف أيام قابلة للقراءة. تأكد أن الأعمدة هي: التاريخ، العدد، الكمية.');
    const byMonth=new Map();
    rows.forEach(r=>{const m=Number(r.entry_date.slice(5,7));const a=byMonth.get(m)||{count:0,qty:0};a.count+=r.record_count;a.qty+=r.quantity_tons;byMonth.set(m,a);});
    const issues=[];
    expected.forEach((exp,m)=>{const got=byMonth.get(m)||{count:0,qty:0};if(got.count!==exp.count||Math.abs(got.qty-exp.qty)>0.011)issues.push(`${months[m-1]}: المجموع المتوقع ${fmt(exp.count)} / ${fmt(exp.qty)} طن، بينما الأيام تعطي ${fmt(got.count)} / ${fmt(got.qty)} طن.`);});
    const total=rows.reduce((a,r)=>({count:a.count+r.record_count,qty:a.qty+r.quantity_tons}),{count:0,qty:0});
    if(expectedGrand&&(total.count!==expectedGrand.count||Math.abs(total.qty-expectedGrand.qty)>0.011))issues.push(`الإجمالي الكلي لا يطابق: المتوقع ${fmt(expectedGrand.count)} / ${fmt(expectedGrand.qty)} طن، والمحسوب ${fmt(total.count)} / ${fmt(total.qty)} طن.`);
    return {year,rows,total:{count:total.count,qty:Number(total.qty.toFixed(2))},expected,issues,ignored};
  }

  function showPreview(){
    $('pasteStatus').className='ss-status';
    try{
      const parsed=parsePaste();previewRows=parsed.rows;previewYear=parsed.year;previewValid=parsed.issues.length===0;
      $('previewDays').textContent=fmt(parsed.rows.length);$('previewCount').textContent=fmt(parsed.total.count);$('previewQty').textContent=fmt(parsed.total.qty);
      $('previewBody').innerHTML=parsed.rows.map(r=>{
        const m=Number(r.entry_date.slice(5,7));
        const issue=parsed.issues.some(x=>x.startsWith(months[m-1]+':'));
        return `<tr><td>${r.entry_date}</td><td>${fmt(r.record_count)}</td><td>${fmt(r.quantity_tons)}</td><td>${issue?'راجع مجموع الشهر':'✓'}</td></tr>`;
      }).join('');
      $('pastePreview').classList.add('open');
      $('savePasteBtn').disabled=!previewValid;
      if(parsed.issues.length){$('pasteStatus').textContent='لن يتم الحفظ قبل تصحيح المطابقة: '+parsed.issues.join(' | ');$('pasteStatus').className='ss-status bad';}
      else{$('pasteStatus').textContent=`المعاينة صحيحة: ${parsed.rows.length} يوم، ${fmt(parsed.total.count)} إرسالية، ${fmt(parsed.total.qty)} طن. يمكنك الحفظ الآن.`;$('pasteStatus').className='ss-status ok';}
    }catch(e){previewRows=[];previewValid=false;$('savePasteBtn').disabled=true;$('pastePreview').classList.remove('open');$('pasteStatus').textContent=e.message;$('pasteStatus').className='ss-status bad';}
  }

  async function savePaste(){
    if(!previewValid||!previewRows.length)return showPreview();
    if(Number($('pasteYear').value)!==previewYear){$('pasteStatus').textContent='تم تغيير السنة بعد المعاينة. أعد المعاينة قبل الحفظ.';$('pasteStatus').className='ss-status bad';return;}
    $('savePasteBtn').disabled=true;$('pasteStatus').textContent='جاري حفظ التفاصيل اليومية...';$('pasteStatus').className='ss-status';
    try{
      const d=await api('/api/station-subsources/daily/bulk',{method:'POST',body:JSON.stringify({year:previewYear,station_name:station,source_name:source,rows:previewRows,included_in_station_total:1,notes:note})});
      $('pasteStatus').textContent=`${d.message}. تم حفظ ${fmt(d.summary?.record_count||0)} إرسالية بكمية ${fmt(d.summary?.quantity_tons||0)} طن.`;$('pasteStatus').className='ss-status ok';
      $('yearSelect').value=String(previewYear);await load();
      $('savePasteBtn').disabled=false;
    }catch(e){$('pasteStatus').textContent=e.message;$('pasteStatus').className='ss-status bad';$('savePasteBtn').disabled=false;}
  }

  async function saveMonthly(){
    const year=Number($('editYear').value),month=Number($('editMonth').value),record_count=Number($('editCount').value||0),quantity_tons=Number($('editQty').value||0);
    $('saveStatus').textContent='جاري الحفظ...';$('saveStatus').className='ss-status';
    try{
      await api('/api/station-subsources',{method:'POST',body:JSON.stringify({year,month,station_name:station,source_name:source,record_count,quantity_tons,included_in_station_total:1,notes:note})});
      $('saveStatus').textContent='تم حفظ الشهر بنجاح.';$('saveStatus').className='ss-status ok';$('yearSelect').value=String(year);await load();
    }catch(e){$('saveStatus').textContent=e.message;$('saveStatus').className='ss-status bad';}
  }

  function invalidatePreview(){previewRows=[];previewValid=false;$('savePasteBtn').disabled=true;$('pastePreview').classList.remove('open');$('pasteStatus').textContent='تم تغيير البيانات. اضغط «معاينة البيانات» من جديد.';$('pasteStatus').className='ss-status';}
  $('yearSelect')?.addEventListener('change',load);
  $('saveBtn')?.addEventListener('click',saveMonthly);
  $('previewBtn')?.addEventListener('click',showPreview);
  $('savePasteBtn')?.addEventListener('click',savePaste);
  $('clearPasteBtn')?.addEventListener('click',()=>{$('pasteInput').value='';previewRows=[];previewValid=false;$('savePasteBtn').disabled=true;$('pastePreview').classList.remove('open');$('pasteStatus').textContent='تم المسح. الصق بيانات جديدة.';$('pasteStatus').className='ss-status';});
  $('pasteInput')?.addEventListener('input',()=>{if(previewRows.length)invalidatePreview();});
  $('pasteYear')?.addEventListener('change',invalidatePreview);
  load();
})();
