/* V20 station summary count: exact Pivot totals, with Aziz included in Yatta/stations once. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const state={station:{tons:0,trucks:0},aziz:{tons:0,trucks:0},timers:[]};

  async function pivotTotal(file){
    if(!file)return{tons:0,trucks:0};
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellStyles:false,cellNF:false,cellHTML:false});
    for(const name of wb.SheetNames){
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:'',blankrows:false});
      let header=-1;
      for(let r=0;r<Math.min(rows.length,20);r++){
        const a=norm(rows[r]?.[0]),b=norm(rows[r]?.[1]),c=norm(rows[r]?.[2]);
        if((a.includes('row labels')||a.includes('تسميات'))&&(b.includes('كمي')||b.includes('مجموع'))&&(c.includes('عدد')||c.includes('وحد')||c.includes('مركبات')||c.includes('شاحنات'))){header=r;break;}
      }
      if(header<0)continue;
      for(let r=rows.length-1;r>header;r--){
        const a=norm(rows[r]?.[0]);
        if(a.includes('الاجمالي الكلي')||a.includes('grand total'))return{tons:num(rows[r]?.[1]),trucks:num(rows[r]?.[2])};
      }
      let tons=0,trucks=0;
      for(let r=header+1;r<rows.length;r++){
        const label=clean(rows[r]?.[0]);
        if(!label)continue;
        const n=norm(label);
        if(n.includes('ترقوميا')||n.includes('يطا')||n.includes('الخليل')){tons+=num(rows[r]?.[1]);trucks+=num(rows[r]?.[2]);}
      }
      if(tons||trucks)return{tons,trucks};
    }
    return{tons:0,trucks:0};
  }
  function text(x){return `${fmt(x.tons)} طن · ${fmt(x.trucks)} شاحنة`;}
  function apply(){
    const root=$('sourceFilesPreview');if(!root)return;
    const total={tons:state.station.tons+state.aziz.tons,trucks:state.station.trucks+state.aziz.trucks};
    const pivot=root.querySelector('#pivotTotalsV18');
    const pCards=pivot?.querySelectorAll(':scope > div');
    if(pCards?.[1]){const s=pCards[1].querySelector('strong');if(s)s.textContent=text(total);}
    const core=root.querySelector('.source-import-summary:not(#pivotTotalsV18)');
    const cards=core?.querySelectorAll(':scope > div');
    if(cards?.[2]){const s=cards[2].querySelector('strong');if(s)s.textContent=text(total);}
    if(cards?.[3]){const s=cards[3].querySelector('strong');if(s)s.textContent=text(state.aziz);}
  }
  function schedule(){state.timers.forEach(clearTimeout);state.timers=[250,700,1400,2600,4500,7000,10000,12500].map(ms=>setTimeout(apply,ms));}
  async function refresh(){
    try{
      const sf=$('sourceFile_stations')?.files?.[0],af=$('sourceFile_aziz')?.files?.[0];
      const [station,aziz]=await Promise.all([pivotTotal(sf),pivotTotal(af)]);state.station=station;state.aziz=aziz;schedule();
    }catch(e){console.error('station summary count',e);}
  }
  function init(){const btn=$('analyzeSourceFilesBtn');if(!btn)return;btn.addEventListener('click',()=>setTimeout(refresh,0));$('clearSourceFilesBtn')?.addEventListener('click',()=>{state.station={tons:0,trucks:0};state.aziz={tons:0,trucks:0};state.timers.forEach(clearTimeout);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
