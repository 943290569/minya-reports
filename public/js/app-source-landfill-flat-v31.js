/* V33: flat-Pivot fallback only. Hierarchical landfill Pivot is left to V21 so all categories remain visible. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const text=x=>`${fmt(x.tons)} طن · ${fmt(x.trucks)} شاحنة`;
  let original=null,timers=[];

  function iso(v){
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    const s=clean(v);let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;return'';
  }
  function capture(){const f=$('sourceFile_landfill')?.files?.[0];if(f&&!/normalized/i.test(f.name))original=f;}

  async function parse(){
    if(!original)return{map:new Map(),hierarchical:false};
    const wb=XLSX.read(await original.arrayBuffer(),{type:'array',cellDates:false,cellStyles:false,cellNF:false,cellHTML:false});let best=null;
    for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:'',blankrows:false});for(let h=0;h<Math.min(rows.length,20);h++){const a=norm(rows[h]?.[0]),b=norm(rows[h]?.[1]),c=norm(rows[h]?.[2]);if((a.includes('row labels')||a.includes('تسميات'))&&(b.includes('كمي')||b.includes('مجموع'))&&(c.includes('عدد')||c.includes('مركبات')||c.includes('شاحنات'))){best={rows,h};break;}}if(best)break;}
    const map=new Map();if(!best)return{map,hierarchical:false};
    let hierarchical=false,currentDate='';
    for(let r=best.h+1;r<best.rows.length;r++){
      const row=best.rows[r]||[],d=iso(row[0]);
      if(d){currentDate=d;map.set(d,{tons:num(row[1]),trucks:Math.max(0,Math.round(num(row[2])))});continue;}
      if(!currentDate)continue;
      const label=norm(row[0]);
      if(label&&!label.includes('الاجمالي')&&!label.includes('grand total')&&(num(row[1])!==0||num(row[2])!==0))hierarchical=true;
    }
    return{map,hierarchical};
  }
  function mainTable(root){return [...(root?.querySelectorAll('.source-import-table')||[])].find(t=>{const r=t.querySelector('tbody tr');return r&&r.querySelectorAll('td').length>=16;})||null;}
  function setCard(root,label,value){for(const box of root.querySelectorAll('.source-import-summary'))for(const card of box.querySelectorAll(':scope > div')){const span=clean(card.querySelector('span')?.textContent);if(span.includes(label)){const strong=card.querySelector('strong');if(strong)strong.textContent=value;}}}
  function warnFlat(){const m=$('sourceFilesMessage');if(m&&!m.dataset.flatPivotWarned){m.dataset.flatPivotWarned='1';m.textContent+=' | ملف المكب مجمّع حسب اليوم ولا يحتوي تفصيل الفئات؛ تم عرض الإجمالي فقط.';}}

  async function apply(){
    const root=$('sourceFilesPreview'),table=mainTable(root);if(!root||!table||!original)return;
    const {map,hierarchical}=await parse();
    /* If category rows exist, V21 is the canonical renderer and this fallback must not overwrite them. */
    if(hierarchical||!map.size)return;
    let total={tons:0,trucks:0};for(const v of map.values()){total.tons+=v.tons;total.trucks+=v.trucks;}
    table.querySelectorAll('tbody tr').forEach(tr=>{const c=tr.querySelectorAll('td');if(c.length<15)return;const d=clean(c[0]?.textContent),v=map.get(d);if(!v)return;if(c[10])c[10].textContent=text(v);});
    setCard(root,'مجموع وارد المكب',text(total));setCard(root,'نفايات واردة للمكب',text(total));warnFlat();
  }
  function schedule(){timers.forEach(clearTimeout);timers=[];[250,700,1400,2600,4200,6500,9000,12000].forEach(ms=>timers.push(setTimeout(()=>apply().catch(console.error),ms)));}
  function init(){document.addEventListener('change',e=>{if(e.target?.id==='sourceFile_landfill')capture();},true);$('analyzeSourceFilesBtn')?.addEventListener('click',()=>{capture();schedule();},true);$('clearSourceFilesBtn')?.addEventListener('click',()=>{original=null;timers.forEach(clearTimeout);timers=[];});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();