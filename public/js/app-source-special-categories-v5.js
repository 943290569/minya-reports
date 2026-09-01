/* Source import V5 overlay: correct landfill special categories and external cover file. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const state={landfillFile:null,coverFile:null,landfill:new Map(),cover:new Map(),busy:false};
  let observer=null;
  const DATE_ALIASES=['تاريخ','التاريخ','تاريخ الحركه','تاريخ الحركة','تاريخ الوزن','date'];
  const QTY_ALIASES=['كميه','كمية','الكميه','الكمية','الوزن','الوزن الصافي','صافي الوزن','الكميه النهائيه','الكمية النهائية','quantity'];
  const SOURCE_ALIASES=['اسم الجهه','اسم الجهة','الجهه','الجهة','مصدر النفايات','نوع النفايات','نوع الحموله','نوع الحمولة','نوع الماده','نوع المادة','البيان','الاسم'];
  const COVER_TYPE_ALIASES=['نوع مواد التغطيه','نوع مواد التغطية','مواد التغطيه','مواد التغطية','نوع','البيان','الصنف','الاسم'];
  function excelDate(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${String(d.y).padStart(4,'0')}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=clean(v);let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
    return '';
  }
  function match(v,aliases){const n=norm(v);return n&&aliases.some(a=>{const x=norm(a);return n===x||n.includes(x)||x.includes(n);});}
  function indexes(headers,aliases){const out=[];(headers||[]).forEach((v,i)=>{if(match(v,aliases))out.push(i);});return out;}
  function numericRatio(rows,col,start){let ok=0,filled=0;for(let i=start;i<Math.min(rows.length,start+80);i++){const v=(rows[i]||[])[col];if(clean(v)==='')continue;filled++;if(Number.isFinite(Number(String(v).replace(/,/g,''))))ok++;}return filled?ok/filled:0;}
  function sourceScore(rows,col,start){let score=0,seen=0;for(let i=start;i<Math.min(rows.length,start+80);i++){const n=norm((rows[i]||[])[col]);if(!n)continue;seen++;if(/عصاره|طمم|مواد لتغطيه المكب|نفايات|هيئات|مستوطن|اسرائيل|افراد|شركات|مصانع/.test(n))score+=5;}return seen?score/seen:0;}
  function choose(rows,headers,aliases,start,kind){const c=indexes(headers,aliases);if(!c.length)return-1;if(c.length===1)return c[0];let best=c[0],bestScore=-1;for(const col of c){const s=kind==='quantity'?numericRatio(rows,col,start)*10:sourceScore(rows,col,start);if(s>bestScore){best=col;bestScore=s;}}return best;}
  function findHeader(rows,mode){let best=-1,bestScore=0;for(let i=0;i<Math.min(rows.length,45);i++){const r=rows[i]||[];const hasDate=indexes(r,DATE_ALIASES).length>0;const hasQty=indexes(r,QTY_ALIASES).length>0;const hasSource=indexes(r,mode==='cover'?COVER_TYPE_ALIASES:SOURCE_ALIASES).length>0;const score=(hasDate?4:0)+(hasQty?3:0)+(hasSource?2:0);if(score>bestScore){best=i;bestScore=score;}}return bestScore>=6?best:-1;}
  function sheetRows(wb){const name=wb.SheetNames.find(n=>norm(n).includes('ارساليه'))||wb.SheetNames[0];if(!name)throw new Error('لا توجد ورقة بيانات');return XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:'',blankrows:false});}
  function day(map,date){if(!map.has(date))map.set(date,{incoming:0,leachate:0,tamm:0,landfillCover:0,coverTamm:0,coverAslob:0});return map.get(date);}
  function classify(label){const n=norm(label);if(n.includes('عصاره'))return'leachate';if(n.includes('مواد لتغطيه المكب')||n.includes('مواد لتغطية المكب'))return'landfillCover';if(n.includes('طمم'))return'tamm';return'incoming';}
  async function parseLandfill(file){
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellStyles:false,cellNF:false,cellHTML:false});const rows=sheetRows(wb);const h=findHeader(rows,'landfill');if(h<0)throw new Error('ملف المكب: لم أجد التاريخ + الجهة + الكمية');const headers=rows[h],start=h+1;const dcol=choose(rows,headers,DATE_ALIASES,start,'date'),scol=choose(rows,headers,SOURCE_ALIASES,start,'source'),qcol=choose(rows,headers,QTY_ALIASES,start,'quantity');if(dcol<0||scol<0||qcol<0)throw new Error('ملف المكب: الأعمدة الأساسية غير مكتملة');
    const out=new Map();for(let i=start;i<rows.length;i++){const r=rows[i]||[],date=excelDate(r[dcol]),label=clean(r[scol]),raw=clean(r[qcol]);if(!date||!label||raw==='')continue;const d=day(out,date),k=classify(label),q=num(r[qcol]);if(k==='leachate')d.leachate+=q;else if(k==='tamm')d.tamm+=q;else if(k==='landfillCover')d.landfillCover+=q;else d.incoming+=q;}state.landfill=out;
  }
  function coverKind(v){const n=norm(v);if(n.includes('اسلوب'))return'aslob';if(n.includes('طمم'))return'tamm';return'';}
  async function parseCover(file){
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellStyles:false,cellNF:false,cellHTML:false});const rows=sheetRows(wb);let h=findHeader(rows,'cover');if(h<0){state.cover=new Map();return;}const headers=rows[h],start=h+1,dcol=choose(rows,headers,DATE_ALIASES,start,'date');if(dcol<0){state.cover=new Map();return;}const out=new Map();const wideTamm=headers.findIndex(v=>{const n=norm(v);return n.includes('طمم')&&n.includes('تغطي');});const wideAslob=headers.findIndex(v=>{const n=norm(v);return n.includes('اسلوب')&&n.includes('تغطي');});
    if(wideTamm>=0||wideAslob>=0){for(let i=start;i<rows.length;i++){const r=rows[i]||[],date=excelDate(r[dcol]);if(!date)continue;const d=day(out,date);if(wideTamm>=0&&clean(r[wideTamm])!=='')d.coverTamm+=num(r[wideTamm]);if(wideAslob>=0&&clean(r[wideAslob])!=='')d.coverAslob+=num(r[wideAslob]);}state.cover=out;return;}
    const tcol=choose(rows,headers,COVER_TYPE_ALIASES,start,'source'),qcol=choose(rows,headers,QTY_ALIASES,start,'quantity');if(tcol<0||qcol<0){state.cover=new Map();return;}for(let i=start;i<rows.length;i++){const r=rows[i]||[],date=excelDate(r[dcol]),kind=coverKind(r[tcol]),raw=clean(r[qcol]);if(!date||!kind||raw==='')continue;const d=day(out,date);if(kind==='tamm')d.coverTamm+=num(r[qcol]);else d.coverAslob+=num(r[qcol]);}state.cover=out;
  }
  function merged(date){const a=state.landfill.get(date)||{},b=state.cover.get(date)||{};return{incoming:a.incoming||0,leachate:a.leachate||0,tamm:a.tamm||0,landfillCover:a.landfillCover||0,coverTamm:b.coverTamm||0,coverAslob:b.coverAslob||0};}
  function allDates(){return [...new Set([...state.landfill.keys(),...state.cover.keys()])].sort();}
  function observePreview(){const preview=$('sourceFilesPreview');if(observer&&preview)observer.observe(preview,{childList:true,subtree:true});}
  function apply(){
    if(state.busy)return;const root=$('sourceFilesPreview');if(!root||!state.landfill.size)return;state.busy=true;observer?.disconnect();
    try{
      const dates=allDates();const monthIncoming=dates.reduce((s,d)=>s+merged(d).incoming,0);const summary=root.querySelector('.source-import-summary');if(summary){const cards=summary.querySelectorAll('div');if(cards[1]){const strong=cards[1].querySelector('strong');if(strong)strong.textContent=`${fmt(monthIncoming)} طن`;}}
      const mainRows=root.querySelectorAll('.source-import-table tbody tr');mainRows.forEach(tr=>{const cells=tr.querySelectorAll('td');if(cells.length<11)return;const date=clean(cells[0].textContent);if(!state.landfill.has(date))return;cells[10].innerHTML=`<strong>${fmt(merged(date).incoming)}</strong>`;});
      root.querySelector('#specialCategoriesV5')?.remove();const totals=dates.reduce((a,d)=>{const x=merged(d);a.leachate+=x.leachate;a.tamm+=x.tamm;a.landfillCover+=x.landfillCover;a.coverTamm+=x.coverTamm;a.coverAslob+=x.coverAslob;return a;},{leachate:0,tamm:0,landfillCover:0,coverTamm:0,coverAslob:0});
      const box=document.createElement('div');box.id='specialCategoriesV5';box.innerHTML=`<div class="drive-preview-note"><strong>البنود الخاصة المعتمدة:</strong> العصارة وطمم ومواد لتغطية المكب من ملف المكب، ولا تدخل في إجمالي النفايات. مواد التغطية (طمم) ومواد التغطية (اسلوب) من الملف الخارجي فقط.</div><div class="source-import-summary"><div><span>العصارة - المكب</span><strong>${fmt(totals.leachate)}</strong></div><div><span>طمم - المكب</span><strong>${fmt(totals.tamm)}</strong></div><div><span>مواد لتغطية المكب</span><strong>${fmt(totals.landfillCover)}</strong></div><div><span>مواد التغطية (طمم) - خارجي</span><strong>${fmt(totals.coverTamm)}</strong></div><div><span>مواد التغطية (اسلوب) - خارجي</span><strong>${fmt(totals.coverAslob)}</strong></div></div><div class="source-import-table-wrap"><table class="v3-table source-import-table"><thead><tr><th>التاريخ</th><th>العصارة</th><th>طمم - المكب</th><th>مواد لتغطية المكب</th><th>مواد التغطية (طمم) خارجي</th><th>مواد التغطية (اسلوب) خارجي</th></tr></thead><tbody>${dates.map(d=>{const x=merged(d);return `<tr><td>${esc(d)}</td><td>${fmt(x.leachate)}</td><td>${fmt(x.tamm)}</td><td>${fmt(x.landfillCover)}</td><td>${fmt(x.coverTamm)}</td><td>${fmt(x.coverAslob)}</td></tr>`;}).join('')}</tbody></table></div>`;root.appendChild(box);
    }finally{state.busy=false;observePreview();}
  }
  async function refreshSpecial(){
    try{const tasks=[];if(state.landfillFile)tasks.push(parseLandfill(state.landfillFile));else state.landfill.clear();if(state.coverFile)tasks.push(parseCover(state.coverFile));else state.cover.clear();await Promise.all(tasks);apply();}catch(e){console.error(e);const msg=$('sourceFilesMessage');if(msg)msg.textContent=`تنبيه البنود الخاصة: ${e.message||'تعذر القراءة'}`;}
  }
  function init(){
    const landfill=$('sourceFile_landfill'),cover=$('sourceFile_cover'),analyze=$('analyzeSourceFilesBtn'),clear=$('clearSourceFilesBtn'),preview=$('sourceFilesPreview');if(!landfill||!preview)return;
    state.landfillFile=landfill.files?.[0]||null;state.coverFile=cover?.files?.[0]||null;
    landfill.addEventListener('change',e=>{state.landfillFile=e.target.files?.[0]||null;});cover?.addEventListener('change',e=>{state.coverFile=e.target.files?.[0]||null;const el=$('sourceFileState_cover');if(el)el.textContent=state.coverFile?.name||'لم يتم اختيار ملف';});
    analyze?.addEventListener('click',()=>{setTimeout(refreshSpecial,0);});clear?.addEventListener('click',()=>{state.landfillFile=null;state.coverFile=null;state.landfill.clear();state.cover.clear();});
    observer=new MutationObserver(mutations=>{if(state.busy)return;const external=mutations.some(m=>!m.target.closest?.('#specialCategoriesV5'));if(external&&state.landfill.size)setTimeout(apply,0);});observePreview();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
