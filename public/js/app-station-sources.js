(()=>{
  const months=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const station='محطة ترحيل يطا';
  const source='شركة عبد العزيز السعدي';
  const $=id=>document.getElementById(id);
  const fmt=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});
  async function api(url,opt={}){
    const r=await fetch(url,{cache:'no-store',headers:{'Content-Type':'application/json',...(opt.headers||{})},...opt});
    if(r.status===401){location.href='/login.html';throw new Error('يجب تسجيل الدخول');}
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.message||'حدث خطأ');
    return d;
  }
  async function load(){
    const year=Number($('yearSelect').value);
    $('loadStatus').textContent='جاري تحميل البيانات...';
    try{
      const q=new URLSearchParams({year:String(year),station_name:station,source_name:source});
      const d=await api(`/api/station-subsources?${q}`);
      const map=new Map((d.rows||[]).map(r=>[Number(r.month),r]));
      $('rowsBody').innerHTML=months.map((name,i)=>{
        const r=map.get(i+1);
        if(!r)return `<tr><td>${name}</td><td>-</td><td>-</td><td>لا توجد بيانات</td></tr>`;
        return `<tr><td>${name}</td><td>${fmt(r.record_count)}</td><td>${fmt(r.quantity_tons)}</td><td>${r.included_in_station_total?'ضمن إجمالي يطا':'مستقل'}</td></tr>`;
      }).join('');
      $('totalCount').textContent=fmt(d.summary?.record_count||0);
      $('totalQty').textContent=fmt(d.summary?.quantity_tons||0);
      $('loadStatus').textContent=`تم تحميل بيانات ${year}.`;
    }catch(e){$('loadStatus').textContent=e.message;}
  }
  async function save(){
    const year=Number($('editYear').value),month=Number($('editMonth').value),record_count=Number($('editCount').value||0),quantity_tons=Number($('editQty').value||0);
    $('saveStatus').textContent='جاري الحفظ...';
    try{
      await api('/api/station-subsources',{method:'POST',body:JSON.stringify({year,month,station_name:station,source_name:source,record_count,quantity_tons,included_in_station_total:1,notes:'الكمية جزء من إجمالي محطة ترحيل يطا ولا تضاف مرة أخرى إلى الإجمالي العام.'})});
      $('saveStatus').textContent='تم حفظ الشهر بنجاح.';
      $('yearSelect').value=String(year);
      await load();
    }catch(e){$('saveStatus').textContent=e.message;}
  }
  $('yearSelect')?.addEventListener('change',load);
  $('saveBtn')?.addEventListener('click',save);
  load();
})();
