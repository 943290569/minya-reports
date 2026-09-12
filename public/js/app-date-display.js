/* Unified screen date/month display — no print module changes */
(function(){
  const shortMonths=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const arabicMonths=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  function shortMonth(value){const match=String(value||"").match(/^(\d{4})-(\d{2})$/);if(!match)return value;const index=Number(match[2])-1;return `${shortMonths[index]||match[2]} ${match[1]}`;}
  function dateSlash(value){const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);return match?`${match[3]}/${match[2]}/${match[1]}`:value;}
  function monthSlash(value){const match=String(value||"").match(/^(\d{4})-(\d{2})$/);return match?`${match[2]}/${match[1]}`:value;}
  function arabicNameToShort(text){let output=String(text||"");arabicMonths.forEach((name,index)=>{output=output.replace(new RegExp(name,"g"),shortMonths[index]);});return output;}
  function applyChartMonths(root=document){root.querySelectorAll?.(".modern-chart-eyebrow,#annualBestMonth,#annualWorstMonth").forEach(el=>{el.textContent=arabicNameToShort(el.textContent);});}
  function applyTableDates(root=document){root.querySelectorAll?.(".dashboard-recent-table td,.v3-table td,#archiveTable td").forEach(td=>{if(td.children.length)return;const text=td.textContent.trim();if(/^\d{4}-\d{2}-\d{2}$/.test(text))td.textContent=dateSlash(text);else if(/^\d{4}-\d{2}$/.test(text))td.textContent=monthSlash(text);});}
  function stabilizeDateInputs(root=document){root.querySelectorAll?.('input[type="date"],input[data-minya-date-input="1"]').forEach(input=>{if(input.dataset.minyaDateInput!=="1"){input.dataset.minyaDateInput="1";input.addEventListener("focus",()=>{if(input.type!=="date"){input.type="date";input.removeAttribute("placeholder");input.setAttribute("dir","rtl");requestAnimationFrame(()=>{try{input.showPicker?.();}catch{}});}});input.addEventListener("blur",()=>setDateTextMode(input));input.addEventListener("change",()=>{if(!input.value&&document.activeElement!==input)setDateTextMode(input);});}if(!input.value&&document.activeElement!==input)setDateTextMode(input);});}
  function setDateTextMode(input){if(input.value||document.activeElement===input)return;input.type="text";input.placeholder="YYYY-MM-DD";input.inputMode="numeric";input.setAttribute("dir","ltr");input.setAttribute("aria-label",input.getAttribute("aria-label")||"التاريخ بصيغة سنة-شهر-يوم");}
  function apply(){stabilizeDateInputs(document);applyChartMonths(document);applyTableDates(document);}
  window.MINYA_DATE_DISPLAY={shortMonth,dateSlash,monthSlash};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
  if(typeof MutationObserver!=="undefined"){let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});});observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});}
})();

/* Leachate and daily cover management */
(function(){
  const route=location.pathname.replace(/\/+$/,'')||'/';
  if(route!=='/environment')return;
  const api=async(url,opt)=>{const r=await fetch(url,opt),d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||'فشل الطلب');return d;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  async function render(){
    const main=document.querySelector('main.container');if(!main)return;
    const auth=await api('/api/auth/status').catch(()=>({}));const editable=['admin','editor'].includes(auth.user?.role);
    const now=new Date(),today=now.toISOString().slice(0,10),month=today.slice(0,7);
    main.innerHTML=`<section class="v3-page"><div class="v3-hero"><div><span>LEACHATE & COVER</span><h2>العصارة والغطاء اليومي</h2><p>متابعة كميات العصارة ونقلات الصهريج والغطاء اليومي مع المجاميع.</p></div></div><div id="envContent"><div id="envEditor" class="v3-panel"><h3>إدخال اليوم</h3><div class="v3-form-grid"><label>التاريخ<input id="envDate" type="date" value="${today}"></label><label>العصارة م³<input id="envLeach" type="number" step="0.01"></label><label>نقلات الصهريج<input id="envTank" type="number" step="0.01"></label><label>نقلات الغطاء<input id="envCover" type="number" step="0.01"></label><label>كمية الغطاء<input id="envQty" type="number" step="0.01"></label><label>الوحدة<input id="envUnit" value="نقلة"></label></div><label>ملاحظات<textarea id="envNotes" rows="2"></textarea></label><button id="envSave" class="v3-primary">حفظ / تحديث</button><span id="envMsg"></span></div><div class="v3-panel"><div class="v3-filter"><label>من<input id="envFrom" type="date" value="${month}-01"></label><label>إلى<input id="envTo" type="date" value="${today}"></label><button id="envLoad">تحديث</button></div><div id="envKpis" class="v3-kpis"></div><div class="v3-table-wrap"><table class="v3-table"><thead><tr><th>التاريخ</th><th>العصارة م³</th><th>نقلات الصهريج</th><th>نقلات الغطاء</th><th>كمية الغطاء</th><th>ملاحظات</th></tr></thead><tbody id="envBody"></tbody></table></div></div></div></section>`;
    if(!editable)document.getElementById('envEditor').classList.add('hidden');
    const el=id=>document.getElementById(id);
    async function load(){const d=await api(`/api/ops/environment?from=${el('envFrom').value}&to=${el('envTo').value}`);el('envKpis').innerHTML=[['أيام مسجلة',d.totals.days,'يوم'],['العصارة',d.totals.leachate_m3,'م³'],['نقلات الصهريج',d.totals.tanker_trips,'نقلة'],['نقلات الغطاء',d.totals.cover_trips,'نقلة'],['كمية الغطاء',d.totals.cover_quantity,'']].map(x=>`<div><span>${x[0]}</span><strong>${fmt(x[1])}</strong><small>${x[2]}</small></div>`).join('');el('envBody').innerHTML=d.rows.length?d.rows.map(r=>`<tr><td>${esc(r.log_date)}</td><td>${fmt(r.leachate_m3)}</td><td>${fmt(r.tanker_trips)}</td><td>${fmt(r.cover_trips)}</td><td>${fmt(r.cover_quantity)} ${esc(r.cover_unit||'')}</td><td>${esc(r.notes||'')}</td></tr>`).join(''):'<tr><td colspan="6">لا توجد بيانات</td></tr>';}
    el('envSave').onclick=async()=>{try{await api('/api/ops/environment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({log_date:el('envDate').value,leachate_m3:el('envLeach').value,tanker_trips:el('envTank').value,cover_trips:el('envCover').value,cover_quantity:el('envQty').value,cover_unit:el('envUnit').value,notes:el('envNotes').value})});el('envMsg').textContent='تم الحفظ';load();}catch(e){el('envMsg').textContent=e.message;}};
    el('envLoad').onclick=load;load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
