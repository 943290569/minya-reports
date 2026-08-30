/* Unified screen date/month display — no print module changes */
(function(){
  const shortMonths=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const arabicMonths=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  function shortMonth(value){
    const match=String(value||"").match(/^(\d{4})-(\d{2})$/);
    if(!match) return value;
    const index=Number(match[2])-1;
    return `${shortMonths[index]||match[2]} ${match[1]}`;
  }

  function dateSlash(value){
    const match=String(value||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  }

  function monthSlash(value){
    const match=String(value||"").match(/^(\d{4})-(\d{2})$/);
    return match ? `${match[2]}/${match[1]}` : value;
  }

  function arabicNameToShort(text){
    let output=String(text||"");
    arabicMonths.forEach((name,index)=>{
      output=output.replace(new RegExp(name,"g"),shortMonths[index]);
    });
    return output;
  }

  function applyChartMonths(root=document){
    root.querySelectorAll?.(".executive-trend-item small").forEach((el,index)=>{
      if(index<12) el.textContent=shortMonths[index];
    });

    root.querySelectorAll?.(".modern-chart-eyebrow,#annualBestMonth,#annualWorstMonth").forEach(el=>{
      el.textContent=arabicNameToShort(el.textContent);
    });
  }

  function applyTableDates(root=document){
    root.querySelectorAll?.(".dashboard-recent-table td,.v3-table td,#archiveTable td").forEach(td=>{
      if(td.children.length) return;
      const text=td.textContent.trim();
      if(/^\d{4}-\d{2}-\d{2}$/.test(text)) td.textContent=dateSlash(text);
      else if(/^\d{4}-\d{2}$/.test(text)) td.textContent=monthSlash(text);
    });
  }


  function stabilizeDateInputs(root=document){
    root.querySelectorAll?.('input[type="date"],input[data-minya-date-input="1"]').forEach(input=>{
      if(input.dataset.minyaDateInput!=="1"){
        input.dataset.minyaDateInput="1";
        input.addEventListener("focus",()=>{
          if(input.type!=="date"){
            input.type="date";
            input.removeAttribute("placeholder");
            input.setAttribute("dir","rtl");
            requestAnimationFrame(()=>{try{input.showPicker?.();}catch{}});
          }
        });
        input.addEventListener("blur",()=>setDateTextMode(input));
        input.addEventListener("change",()=>{if(!input.value&&document.activeElement!==input)setDateTextMode(input);});
      }
      if(!input.value&&document.activeElement!==input)setDateTextMode(input);
    });
  }

  function setDateTextMode(input){
    if(input.value||document.activeElement===input)return;
    input.type="text";
    input.placeholder="YYYY-MM-DD";
    input.inputMode="numeric";
    input.setAttribute("dir","ltr");
    input.setAttribute("aria-label",input.getAttribute("aria-label")||"التاريخ بصيغة سنة-شهر-يوم");
  }

  function apply(){
    stabilizeDateInputs(document);
    applyChartMonths(document);
    applyTableDates(document);
  }

  window.MINYA_DATE_DISPLAY={shortMonth,dateSlash,monthSlash};

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",apply,{once:true});
  else apply();

  if(typeof MutationObserver!=="undefined"){
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued) return;
      queued=true;
      requestAnimationFrame(()=>{ queued=false; apply(); });
    });
    observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }
})();
