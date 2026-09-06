
/* ===== js/app-auth.js ===== */
/* Authentication guard */
(function(){
  const publicPages=["/login.html","/setup.html"];

  function applyRoleNavigation(user){
    if(!user) return;
    const adminOnlyHrefs=["/admin","/admin.html","/reviews","/system.html","/drive-import.html"];
    document.querySelectorAll("a[href]").forEach(link=>{
      const href=link.getAttribute("href");
      if(adminOnlyHrefs.includes(href) && user.role!=="admin") link.remove();
    });
  }

  function removeUserBox(){
    document.getElementById("minyaUserBox")?.remove();
  }

  function setupAuthenticatedUI(user){
    if(!user) return;

    applyRoleNavigation(user);
    removeUserBox();

    if(!window.__MINYA_ROLE_OBSERVER__){
      let scheduled=false;
      const observer=new MutationObserver(()=>{
        if(scheduled) return;
        scheduled=true;
        requestAnimationFrame(()=>{
          scheduled=false;
          applyRoleNavigation(user);
          removeUserBox();
        });
      });
      observer.observe(document.body,{childList:true,subtree:true});
      window.__MINYA_ROLE_OBSERVER__=observer;
    }

    if(user.role==="viewer"){
      const save=document.getElementById("saveBtn");
      if(save){save.disabled=true;save.title="حساب قراءة فقط";}
    }
  }

  async function check(){
    try{
      const r=await fetch("/api/auth/status",{cache:"no-store"});
      const d=await r.json();
      const path=location.pathname;
      if(d.setupRequired && path!=="/setup.html"){ location.replace("/setup.html"); return; }
      if(!d.setupRequired && !d.authenticated && !publicPages.includes(path)){ location.replace("/login.html"); return; }
      if(d.authenticated){
        window.MINYA_USER=d.user;
        document.documentElement.dataset.userRole=d.user.role;
        if(document.readyState==="loading"){
          document.addEventListener("DOMContentLoaded",()=>setupAuthenticatedUI(d.user),{once:true});
        }else{
          setupAuthenticatedUI(d.user);
        }
      }
    }catch(e){ console.error("Auth check failed",e); }
  }
  check();
})();
;

/* ===== js/app-drive-admin-guard.js ===== */
/* Admin-only guard for Drive/Excel/source import page. */
(function(){
  const page = document.body?.dataset?.page === 'drive-import';
  if (!page) return;

  function lockImportPage(message='هذه الصفحة متاحة للمدير فقط.') {
    const notice = document.getElementById('adminOnlyNotice');
    if (notice) {
      notice.classList.remove('hidden');
      notice.textContent = message;
    }
    [
      'sourceFilesPanel',
      'localExcelPanel',
      'driveSetupPanel',
      'driveFilesPanel',
      'previewPanel'
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('hidden');
      el.setAttribute('aria-hidden','true');
      if ('inert' in el) el.inert = true;
      el.querySelectorAll('input,button,select,textarea').forEach((control) => control.disabled = true);
    });
  }

  async function check(){
    try {
      const response = await fetch('/api/auth/status', { cache:'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.authenticated || data?.user?.role !== 'admin') {
        lockImportPage();
        return false;
      }
      return true;
    } catch (_) {
      lockImportPage('تعذر التحقق من صلاحية المدير. تم تعطيل الاستيراد حفاظًا على البيانات.');
      return false;
    }
  }

  window.MINYA_IMPORT_ADMIN_CHECK = check();
})();

;

/* ===== js/app-logout-header.js ===== */
/* Stable header logout button — always visible inside top header */
(function () {
  const publicPages = ['/login.html', '/setup.html'];
  if (publicPages.includes(location.pathname)) return;

  async function logout(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const btn = document.getElementById('minyaLogoutBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'جاري الخروج...';
    }

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });
    } catch (_) {
      // Redirect anyway; auth guard will handle any stale session state on reload.
    } finally {
      window.location.href = '/login.html';
    }
  }

  function styleButton(btn) {
    Object.assign(btn.style, {
      position: 'absolute',
      left: '16px',
      top: '16px',
      zIndex: '80',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '64px',
      minHeight: '34px',
      padding: '7px 12px',
      margin: '0',
      color: 'rgba(255,255,255,.96)',
      background: 'rgba(255,255,255,.10)',
      border: '1px solid rgba(255,255,255,.24)',
      borderRadius: '9px',
      fontSize: '13px',
      fontWeight: '700',
      lineHeight: '1',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0,0,0,.08)',
      transition: 'background .15s ease,border-color .15s ease',
      pointerEvents: 'auto'
    });

    btn.onmouseenter = () => {
      btn.style.background = 'rgba(255,255,255,.17)';
      btn.style.borderColor = 'rgba(255,255,255,.34)';
    };
    btn.onmouseleave = () => {
      btn.style.background = 'rgba(255,255,255,.10)';
      btn.style.borderColor = 'rgba(255,255,255,.24)';
    };
  }

  function ensureButton() {
    const header = document.querySelector('.top-header');
    if (!header) return false;

    if (getComputedStyle(header).position === 'static') {
      header.style.position = 'relative';
    }

    let btn = document.getElementById('minyaLogoutBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'minyaLogoutBtn';
      btn.textContent = 'خروج';
      btn.setAttribute('aria-label', 'تسجيل الخروج');
      btn.addEventListener('click', logout, true);
    }

    styleButton(btn);
    if (btn.parentElement !== header) header.appendChild(btn);
    return true;
  }

  function init() {
    ensureButton();
    setTimeout(ensureButton, 50);
    setTimeout(ensureButton, 150);
    setTimeout(ensureButton, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
;

/* ===== js/app-header-menu.js ===== */
/* Mobile-only vertical header menu */
(function(){
  const items = [
    {label:"الرئيسية", href:"/", icon:"⌂"},
    {label:"تقرير جديد", href:"/report", icon:"✎", hideFor:["viewer"]},
    {label:"أرشيف التقارير", href:"/archive", icon:"▤"},
    {label:"التقرير الشهري", href:"/monthly", icon:"▦"},
    {label:"التقرير السنوي", href:"/annual", icon:"◔"},
    {label:"المعدات والصيانة", href:"/equipment", icon:"⚙"},
    {label:"رخص السائقين", href:"/drivers-licenses.html", icon:"▣"},
    {label:"التقرير الأسبوعي", href:"/weekly", icon:"≋"},
    {label:"البحث المتقدم", href:"/search", icon:"⌕"},
    {label:"التقرير الإداري", href:"/managerial", icon:"▧"},
    {label:"الإدارة والصلاحيات", href:"/admin", icon:"◇", adminOnly:true},
    {label:"إدارة النظام", href:"/system.html", icon:"⚙", adminOnly:true},
    {label:"استيراد Google Drive", href:"/drive-import.html", icon:"⇩", adminOnly:true},
    {label:"المراجعة والاعتماد", href:"/reviews", icon:"✓", adminOnly:true}
  ];

  function currentPath(){
    return location.pathname.replace(/\/+$/,"") || "/";
  }

  function currentRole(){
    return (window.MINYA_USER && window.MINYA_USER.role) || document.documentElement.dataset.userRole || "";
  }

  function renderItems(menu){
    if(!menu) return;
    const role=currentRole();
    const path=currentPath();
    menu.dataset.renderedRole=role;
    menu.innerHTML=items.filter(item=>{
      if(item.adminOnly && role!=="admin") return false;
      if(item.hideFor && item.hideFor.includes(role)) return false;
      return true;
    }).map(item=>{
      const active=(path===item.href || (item.href!=="/" && path.startsWith(item.href))) ? " active" : "";
      return `<a class="minya-menu-item${active}" href="${item.href}"><span class="minya-menu-label"><i class="minya-menu-symbol" aria-hidden="true">${item.icon}</i><span>${item.label}</span></span><b aria-hidden="true">‹</b></a>`;
    }).join("");
  }

  function build(){
    if(!window.matchMedia("(max-width: 760px)").matches) return;
    const header=document.querySelector(".top-header");
    if(!header) return;

    const existing=document.getElementById("minyaHeaderMenu");
    if(existing){
      if(existing.dataset.renderedRole!==currentRole()) renderItems(existing);
      return;
    }

    const wrap=document.createElement("div");
    wrap.className="minya-header-menu-wrap";

    const btn=document.createElement("button");
    btn.id="minyaMenuButton";
    btn.type="button";
    btn.className="minya-menu-button";
    btn.setAttribute("aria-label","فتح قائمة التنقل");
    btn.setAttribute("aria-expanded","false");
    btn.innerHTML='<span aria-hidden="true">☰</span><small>القائمة</small>';

    const menu=document.createElement("div");
    menu.id="minyaHeaderMenu";
    menu.className="minya-header-menu";
    menu.hidden=true;
    renderItems(menu);

    wrap.append(btn,menu);
    header.appendChild(wrap);

    const close=()=>{
      menu.hidden=true;
      wrap.classList.remove("open");
      btn.setAttribute("aria-expanded","false");
    };

    btn.addEventListener("click",(event)=>{
      event.stopPropagation();
      renderItems(menu);
      const open=menu.hidden;
      menu.hidden=!open;
      wrap.classList.toggle("open",open);
      btn.setAttribute("aria-expanded",String(open));
      if(open) menu.scrollTop=0;
    });

    document.addEventListener("click",(event)=>{
      if(!wrap.contains(event.target)) close();
    });
    document.addEventListener("keydown",(event)=>{
      if(event.key==="Escape") close();
    });
  }

  function start(){
    build();
    let tries=0,lastRole=currentRole();
    const timer=setInterval(()=>{
      tries+=1;
      const role=currentRole();
      if(role!==lastRole){lastRole=role;build();}
      if(tries>=24) clearInterval(timer);
    },250);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  window.addEventListener("resize",()=>{
    if(window.matchMedia("(max-width: 760px)").matches) build();
  });
})();

;

/* ===== js/app-source-files-import.js ===== */
/* Raw monthly source import V4: fast whitelist parsing + immediate preview + cached weather. Preview only. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const normalize=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  const WEATHER_SOURCE='Open-Meteo';
  const WEATHER_LAT=31.6364, WEATHER_LON=35.2145, WEATHER_TZ='Asia/Hebron';
  const WEATHER_CACHE_KEY='minya_weather_cache_v2';
  const WEATHER_TIMEOUT_MS=8000;
  const COLD_TEMP_MAX=15, HUMIDITY_MIN=75;
  const NORMAL_CREWS=[4,2,1,2,4,5], FRIDAY_CREWS=[2,0,0,1,0,0];

  const FIELD_ALIASES={
    date:['تاريخ','التاريخ','تاريخ الحركه','تاريخ الحركة','تاريخ الوزن','date'],
    quantity:['كميه','كمية','الكميه','الكمية','الوزن','الوزن الصافي','صافي الوزن','الكميه النهائيه','الكمية النهائية','net weight','quantity'],
    landfillSource:['اسم الجهه','اسم الجهة','الجهه','الجهة','مصدر النفايات','نوع النفايات','نوع الحموله','نوع الحمولة','نوع الماده','نوع المادة','البيان','الاسم'],
    station:['قسم','المحطه','المحطة','اسم المحطه','اسم المحطة','الجهه','الجهة','الاسم'],
    equipment:['اسم الاليه','اسم الآلية','الاليه','الآلية','المعده','المعدة','الصنف','البيان'],
    dieselQuantity:['كميه السولار','كمية السولار','كميه الديزل','كمية الديزل','سولار','ديزل','لتر','كميه','كمية']
  };

  const DIESEL_EQUIPMENT=[
    {name:'جرافة جنزير 2023',aliases:['جرافة جنزير 2023']},
    {name:'جرافة جنزير 2019',aliases:['جرافة جنزير 2019','جرافة جنزير k26/2019','k26/2019']},
    {name:'جرافة جنزير 2022',aliases:['جرافة جنزير 2022']},
    {name:'باجر جنزير',aliases:['باجر جنزير','باقر جنزير','باجر جنزير d336','d336']},
    {name:'مدحلة نفايات 2024',aliases:['مدحلة نفايات 2024','بومك جديد 2024','بومك cat']},
    {name:'قلاب 1770',aliases:['قلاب 1770']},{name:'قلاب 1772',aliases:['قلاب 1772']},
    {name:'مدحلة 36 طن',aliases:['مدحلة 36 طن','بومك 36 طن']},
    {name:'مدحلة 24 طن',aliases:['مدحلة 24 طن','بومك 24 طن']},
    {name:'تركتر لانديني',aliases:['تركتر لانديني','تركتور لانديني','تركتر لنديني','لانديني ازرق']},
    {name:'تركتر جندير',aliases:['تركتر جندير','تركتور جندير']},
    {name:'شاحنة تنك مياه',aliases:['شاحنة تنك مياه','شاحنة برتقالي 1776','تنك برتقالي']},
    {name:'باجر عجل F428',aliases:['باجر عجل f428','باقر عجل f428','باجر 428','باقر 428']},
    {name:'بوبكات',aliases:['بوبكات','بوب كات']},
    {name:'ماكنة رش الضباب',aliases:['ماكنة رش الضباب','ماكنة رش']},
    {name:'مولد الكهرباء',aliases:['مولد الكهرباء','ماتور كهرباء']}
  ];

  const state={files:{landfill:null,stations:null,aziz:null,diesel:null},daily:new Map(),sourceNames:new Set(),ignoredDieselNames:new Set(),columnUsage:{},weatherPending:false};

  function excelDateToIso(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${String(d.y).padStart(4,'0')}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=clean(v);if(!s)return '';
    if(/^\d+(?:\.0+)?$/.test(s)&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(Number(s));if(d)return `${String(d.y).padStart(4,'0')}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);if(m)return `${m[1]}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[3])).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);if(m)return `${m[3]}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`;
    return '';
  }

  function inferType(fileName){const n=normalize(fileName);if(n.includes('سولار')||n.includes('ديزل')||n.includes('diesel'))return'diesel';if(n.includes('عزيز'))return'aziz';if(n.includes('محطات')||n.includes('stations'))return'stations';if(n.includes('مكب')||n.includes('landfill'))return'landfill';return'';}

  function getDaily(date){
    if(!state.daily.has(date))state.daily.set(date,{date,
      landfill:{localAuthorities:{trucks:0,tons:0},settlements:{trucks:0,tons:0},individuals:{trucks:0,tons:0},companies:{trucks:0,tons:0},otherWaste:{trucks:0,tons:0},leachate:{trucks:0,tons:0},externalFill:{trucks:0,tons:0}},
      stations:{yata:{trucks:0,tons:0},tarqumia:{trucks:0,tons:0},hebron:{trucks:0,tons:0},other:{trucks:0,tons:0}},
      azizAddedToYata:{trucks:0,tons:0},diesel:{},totalDiesel:0,
      derived:{weather:'',temperature:null,humidity:null,isFriday:false,crewCounts:[],crewTotal:0,waterSprays:null,waterQuantity:null,waterRule:'',weatherSource:WEATHER_SOURCE}
    });
    return state.daily.get(date);
  }

  function aliasMatch(value,aliases){const n=normalize(value);if(!n)return false;return aliases.some(a=>{const x=normalize(a);return n===x||n.includes(x)||x.includes(n);});}
  function aliasIndices(headers,aliases){const out=[];(headers||[]).forEach((v,i)=>{if(aliasMatch(v,aliases))out.push(i);});return out;}
  function numericRatio(rows,col,start){let filled=0,numeric=0;for(let i=start;i<Math.min(rows.length,start+60);i++){const v=(rows[i]||[])[col];if(clean(v)==='')continue;filled++;if(Number.isFinite(Number(String(v).replace(/,/g,''))))numeric++;}return filled?numeric/filled:0;}
  function canonicalEquipment(label){const n=normalize(label);if(!n)return'';for(const eq of DIESEL_EQUIPMENT){if(eq.aliases.some(a=>{const x=normalize(a);return n===x||n.includes(x);} ))return eq.name;}return'';}
  function sampleScore(rows,col,start,kind){let score=0,seen=0;for(let i=start;i<Math.min(rows.length,start+60);i++){const raw=clean((rows[i]||[])[col]);if(!raw)continue;seen++;const n=normalize(raw);if(kind==='landfillSource'){if(/عصاره|طمم|نفايات|هيئات|مستوطن|اسرائيل|افراد|شركات|مصانع/.test(n))score+=5;if(!excelDateToIso(raw)&&!Number.isFinite(Number(raw)))score+=1;}else if(kind==='station'){if(/يطا|ترقوميا|الخليل|محطه|ترحيل/.test(n))score+=6;}else if(kind==='equipment'){if(canonicalEquipment(raw))score+=7;}}return seen?score/seen:0;}
  function chooseCandidate(rows,headers,aliases,start,kind){const c=aliasIndices(headers,aliases);if(!c.length)return-1;if(c.length===1)return c[0];let best=c[0],bestScore=-Infinity;for(const col of c){const score=kind==='quantity'?numericRatio(rows,col,start)*10:sampleScore(rows,col,start,kind);if(score>bestScore){best=col;bestScore=score;}}return best;}
  function findHeaderRow(rows,type){const max=Math.min(rows.length,35);let best=-1,bestScore=0;for(let i=0;i<max;i++){const row=rows[i]||[],hasDate=aliasIndices(row,FIELD_ALIASES.date).length>0,hasQty=aliasIndices(row,type==='diesel'?FIELD_ALIASES.dieselQuantity:FIELD_ALIASES.quantity).length>0,hasSource=type==='landfill'?aliasIndices(row,FIELD_ALIASES.landfillSource).length>0:type==='stations'?aliasIndices(row,FIELD_ALIASES.station).length>0:type==='aziz'?true:aliasIndices(row,FIELD_ALIASES.equipment).length>0,hasKnownDiesel=type==='diesel'&&row.some(v=>Boolean(canonicalEquipment(v))),score=(hasDate?4:0)+(hasQty?3:0)+(hasSource?2:0)+(hasKnownDiesel?5:0);if(score>bestScore){best=i;bestScore=score;}}return bestScore>=5?best:-1;}
  function recordUsage(type,headers,usedIndexes,labels){const unique=[...new Set(usedIndexes.filter(i=>i>=0))];state.columnUsage[type]={total:(headers||[]).filter(v=>clean(v)!=='').length,used:unique.length,usedNames:unique.map(i=>clean(headers[i])||`عمود ${i+1}`),fields:labels||[]};}

  function classifyLandfillSource(label){const n=normalize(label);if(n.includes('عصاره'))return'leachate';if(n.includes('طمم'))return'externalFill';if(n.includes('هيئات محليه')||n.includes('هيئات المحلية'))return'localAuthorities';if(n.includes('اسرائيلي')||n.includes('مستوطن'))return'settlements';if(n.includes('افراد')||n.includes('نقديه')||n.includes('نقدية'))return'individuals';if(n.includes('شركات')||n.includes('مصانع'))return'companies';return'otherWaste';}
  function classifyStation(label){const n=normalize(label);if(n.includes('يطا'))return'yata';if(n.includes('ترقوميا'))return'tarqumia';if(n.includes('الخليل'))return'hebron';return'other';}

  function workbookRows(wb,type=''){
    let preferred='';if(type==='diesel')preferred=wb.SheetNames.find(n=>normalize(n).includes('سولار'))||wb.SheetNames.find(n=>normalize(n).includes('ديزل'))||'';
    preferred=preferred||wb.SheetNames.find(n=>normalize(n).includes('تقرير الارساليه'))||wb.SheetNames.find(n=>normalize(n).includes('ارساليه'))||wb.SheetNames[0];
    if(!preferred)throw new Error('لا توجد ورقة بيانات داخل الملف');
    return XLSX.utils.sheet_to_json(wb.Sheets[preferred],{header:1,raw:true,defval:'',blankrows:false});
  }

  function parseLandfill(rows){
    const h=findHeaderRow(rows,'landfill');if(h<0)throw new Error('ملف المكب: لم أجد صف العناوين الأساسية');const headers=rows[h]||[],start=h+1;
    const dateCol=chooseCandidate(rows,headers,FIELD_ALIASES.date,start,'date'),nameCol=chooseCandidate(rows,headers,FIELD_ALIASES.landfillSource,start,'landfillSource'),qtyCol=chooseCandidate(rows,headers,FIELD_ALIASES.quantity,start,'quantity');
    if(dateCol<0||nameCol<0||qtyCol<0)throw new Error('ملف المكب: يلزم فقط التاريخ + الجهة/نوع الوارد + الكمية');
    recordUsage('landfill',headers,[dateCol,nameCol,qtyCol],['التاريخ','الجهة/نوع الوارد','الكمية']);
    for(let i=start;i<rows.length;i++){const row=rows[i]||[],date=excelDateToIso(row[dateCol]);if(!date)continue;const label=clean(row[nameCol]),rawQty=clean(row[qtyCol]);if(!label||rawQty==='')continue;const qty=num(row[qtyCol]),bucket=classifyLandfillSource(label),d=getDaily(date);d.landfill[bucket].trucks++;d.landfill[bucket].tons+=qty;state.sourceNames.add(label);}
  }

  function parseStations(rows,isAziz=false){
    const type=isAziz?'aziz':'stations',h=findHeaderRow(rows,type);if(h<0)throw new Error(`${isAziz?'ملف عزيز':'ملف المحطات'}: لم أجد صف العناوين الأساسية`);const headers=rows[h]||[],start=h+1;
    const dateCol=chooseCandidate(rows,headers,FIELD_ALIASES.date,start,'date'),qtyCol=chooseCandidate(rows,headers,FIELD_ALIASES.quantity,start,'quantity'),stationCol=isAziz?-1:chooseCandidate(rows,headers,FIELD_ALIASES.station,start,'station');
    if(dateCol<0||qtyCol<0||(!isAziz&&stationCol<0))throw new Error(isAziz?'ملف عزيز: يلزم التاريخ + الكمية':'ملف المحطات: يلزم التاريخ + اسم/قسم المحطة + الكمية');
    recordUsage(type,headers,isAziz?[dateCol,qtyCol]:[dateCol,stationCol,qtyCol],isAziz?['التاريخ','الكمية']:['التاريخ','المحطة','الكمية']);
    for(let i=start;i<rows.length;i++){const row=rows[i]||[],date=excelDateToIso(row[dateCol]),rawQty=clean(row[qtyCol]);if(!date||rawQty==='')continue;const qty=num(row[qtyCol]),d=getDaily(date);if(isAziz){d.stations.yata.trucks++;d.stations.yata.tons+=qty;d.azizAddedToYata.trucks++;d.azizAddedToYata.tons+=qty;}else{const label=clean(row[stationCol]);if(!label)continue;const bucket=classifyStation(label);d.stations[bucket].trucks++;d.stations[bucket].tons+=qty;}}
  }

  function parseDiesel(rows){
    const h=findHeaderRow(rows,'diesel');if(h<0)throw new Error('كشف السولار: لم أجد التاريخ مع آلية/كمية سولار');const headers=rows[h]||[],start=h+1,dateCol=chooseCandidate(rows,headers,FIELD_ALIASES.date,start,'date');if(dateCol<0)throw new Error('كشف السولار: لم أجد عمود التاريخ');
    const wideCols=[];headers.forEach((v,i)=>{const eq=canonicalEquipment(v);if(eq)wideCols.push({i,eq});});
    if(wideCols.length){recordUsage('diesel',headers,[dateCol,...wideCols.map(x=>x.i)],['التاريخ','أعمدة آليات المكب فقط']);for(let r=start;r<rows.length;r++){const row=rows[r]||[],date=excelDateToIso(row[dateCol]);if(!date)continue;const d=getDaily(date);for(const c of wideCols){const raw=clean(row[c.i]);if(raw==='')continue;const liters=num(row[c.i]);if(!liters)continue;d.diesel[c.eq]=(d.diesel[c.eq]||0)+liters;d.totalDiesel+=liters;}}return;}
    const equipmentCol=chooseCandidate(rows,headers,FIELD_ALIASES.equipment,start,'equipment'),qtyCol=chooseCandidate(rows,headers,FIELD_ALIASES.dieselQuantity,start,'quantity');
    if(equipmentCol<0||qtyCol<0)throw new Error('كشف السولار: يلزم التاريخ + اسم الآلية + كمية السولار');
    recordUsage('diesel',headers,[dateCol,equipmentCol,qtyCol],['التاريخ','اسم الآلية','كمية السولار']);
    for(let r=start;r<rows.length;r++){const row=rows[r]||[],date=excelDateToIso(row[dateCol]);if(!date)continue;const raw=clean(row[equipmentCol]);if(!raw)continue;const eq=canonicalEquipment(raw);if(!eq){state.ignoredDieselNames.add(raw);continue;}const rawQty=clean(row[qtyCol]);if(rawQty==='')continue;const liters=num(row[qtyCol]),d=getDaily(date);d.diesel[eq]=(d.diesel[eq]||0)+liters;d.totalDiesel+=liters;}
  }

  async function readFile(file,type){
    const buffer=await file.arrayBuffer();
    const wb=XLSX.read(buffer,{type:'array',cellDates:true,cellStyles:false,cellNF:false,cellHTML:false});
    const rows=workbookRows(wb,type);
    if(type==='landfill')parseLandfill(rows);else if(type==='diesel')parseDiesel(rows);else parseStations(rows,type==='aziz');
  }

  function weatherCodeToArabic(code){if(code===0)return'مشمس';if(code===1||code===2)return'غائم جزئيًا';if(code===3)return'غائم';if(code===45||code===48)return'ضباب';if([51,53,55,61,63,65,80,81,82].includes(code))return'ماطر';if([71,73,75,85,86].includes(code))return'ثلجي';if([95,96,99].includes(code))return'عاصف';return'غير محدد';}
  function stableRange(date,min,max){const seed=Number(String(date).replace(/\D/g,'').slice(-4))||0;return min+(seed%(max-min+1));}
  function baseDerived(day){const isFriday=new Date(`${day.date}T12:00:00Z`).getUTCDay()===5,crews=isFriday?FRIDAY_CREWS:NORMAL_CREWS;day.derived={...day.derived,isFriday,crewCounts:[...crews],crewTotal:crews.reduce((a,b)=>a+b,0)};}
  function applyDerivedRules(day,weatherText,avgTemp,avgHumidity){
    const isFriday=day.derived.isFriday,crews=isFriday?FRIDAY_CREWS:NORMAL_CREWS;let sprays=0,rule='';
    if(weatherText==='ماطر'||weatherText==='ثلجي'){sprays=0;rule='ماطر/ثلجي';}else if(isFriday){sprays=stableRange(day.date,4,5);rule='الجمعة';}else if(Number.isFinite(avgTemp)&&avgTemp<=COLD_TEMP_MAX){sprays=4;rule='بارد';}else if(Number.isFinite(avgHumidity)&&avgHumidity>=HUMIDITY_MIN){sprays=stableRange(day.date,2,3);rule='رطب';}else{sprays=stableRange(day.date,8,9);rule='جاف';}
    day.derived={weather:weatherText,temperature:Number.isFinite(avgTemp)?Math.round(avgTemp):null,humidity:Number.isFinite(avgHumidity)?Math.round(avgHumidity):null,isFriday,crewCounts:[...crews],crewTotal:crews.reduce((a,b)=>a+b,0),waterSprays:sprays,waterQuantity:sprays*3,waterRule:rule,weatherSource:WEATHER_SOURCE};
  }

  function readWeatherCache(){try{return JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY)||'{}')||{};}catch{return {};}}
  function writeWeatherCache(cache){try{localStorage.setItem(WEATHER_CACHE_KEY,JSON.stringify(cache));}catch{}}

  async function enrichWeather(){
    const days=[...state.daily.values()].sort((a,b)=>a.date.localeCompare(b.date));if(!days.length)return;
    const cache=readWeatherCache(),missing=[];
    for(const day of days){const c=cache[day.date];if(c&&Date.now()-Number(c.savedAt||0)<30*24*3600*1000)applyDerivedRules(day,c.weather,Number(c.temperature),Number(c.humidity));else missing.push(day);}
    if(!missing.length)return;
    const start=missing[0].date,end=missing[missing.length-1].date;
    const url='https://archive-api.open-meteo.com/v1/archive?latitude='+WEATHER_LAT+'&longitude='+WEATHER_LON+'&start_date='+start+'&end_date='+end+'&hourly=temperature_2m,relative_humidity_2m,weather_code&timezone='+encodeURIComponent(WEATHER_TZ);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),WEATHER_TIMEOUT_MS);
    try{
      const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw new Error('weather');
      const data=await r.json(),times=data?.hourly?.time||[],temps=data?.hourly?.temperature_2m||[],humidity=data?.hourly?.relative_humidity_2m||[],codes=data?.hourly?.weather_code||data?.hourly?.weathercode||[],agg=new Map();
      for(let i=0;i<times.length;i++){const date=String(times[i]||'').slice(0,10),hh=Number(String(times[i]||'').slice(11,13));if(hh<9||hh>13)continue;if(!agg.has(date))agg.set(date,{sumT:0,nT:0,sumH:0,nH:0,freq:{}});const a=agg.get(date),t=Number(temps[i]),h=Number(humidity[i]),c=Number(codes[i]);if(Number.isFinite(t)){a.sumT+=t;a.nT++;}if(Number.isFinite(h)){a.sumH+=h;a.nH++;}if(Number.isFinite(c))a.freq[c]=(a.freq[c]||0)+1;}
      for(const day of missing){const a=agg.get(day.date);if(!a){applyDerivedRules(day,'غير محدد',NaN,NaN);continue;}let mainCode=0,best=-1;for(const k in a.freq){if(a.freq[k]>best){best=a.freq[k];mainCode=Number(k);}}const weather=weatherCodeToArabic(mainCode),t=a.nT?a.sumT/a.nT:NaN,h=a.nH?a.sumH/a.nH:NaN;applyDerivedRules(day,weather,t,h);cache[day.date]={weather,temperature:t,humidity:h,savedAt:Date.now()};}
      writeWeatherCache(cache);
    }catch(_){
      for(const day of missing){day.derived.weather='تعذر الجلب';day.derived.temperature=null;day.derived.humidity=null;day.derived.waterSprays=null;day.derived.waterQuantity=null;day.derived.waterRule='';}
    }finally{clearTimeout(timer);}
  }

  function totalsFor(day){const incomingKeys=['localAuthorities','settlements','individuals','companies','otherWaste'],incoming=incomingKeys.reduce((a,k)=>({trucks:a.trucks+day.landfill[k].trucks,tons:a.tons+day.landfill[k].tons}),{trucks:0,tons:0}),stations=Object.values(day.stations).reduce((a,x)=>({trucks:a.trucks+x.trucks,tons:a.tons+x.tons}),{trucks:0,tons:0});return{incoming,stations};}
  function usageNote(){const names={landfill:'المكب',stations:'المحطات',aziz:'عزيز',diesel:'السولار'},rows=Object.entries(state.columnUsage).map(([type,u])=>`${names[type]||type}: استخدم ${u.used} من ${u.total||u.used} أعمدة (${u.fields.join(' + ')})`);return rows.length?`<div class="drive-preview-note"><strong>القراءة الانتقائية:</strong> ${rows.map(esc).join(' — ')}. بقية الأعمدة تم تجاهلها.</div>`:'';}

  function renderPreview(){
    const root=$('sourceFilesPreview');if(!root)return;const days=[...state.daily.values()].sort((a,b)=>a.date.localeCompare(b.date));if(!days.length){root.innerHTML='<div class="drive-empty">لم يتم استخراج بيانات يومية.</div>';return;}
    const monthWaste=days.reduce((s,d)=>s+totalsFor(d).incoming.tons,0),monthStation=days.reduce((s,d)=>s+totalsFor(d).stations.tons,0),aziz=days.reduce((s,d)=>s+d.azizAddedToYata.tons,0),diesel=days.reduce((s,d)=>s+d.totalDiesel,0),ignored=[...state.ignoredDieselNames].slice(0,20);
    const weatherNote=state.weatherPending?'<div class="drive-preview-note"><strong>تم تجميع الملفات.</strong> جاري تحميل الطقس في الخلفية، ويمكنك مراجعة الكميات الآن.</div>':`<div class="drive-preview-note">مصدر الطقس: ${WEATHER_SOURCE}. الحرارة والرطوبة 09:00–13:00 على ${WEATHER_LAT}, ${WEATHER_LON}.</div>`;
    root.innerHTML=`<div class="source-import-summary"><div><span>الأيام المقروءة</span><strong>${days.length}</strong></div><div><span>نفايات واردة للمكب</span><strong>${fmt(monthWaste)} طن</strong></div><div><span>نفايات المحطات</span><strong>${fmt(monthStation)} طن</strong></div><div><span>عزيز المضاف إلى يطا</span><strong>${fmt(aziz)} طن</strong></div><div><span>سولار آليات المكب</span><strong>${fmt(diesel)} لتر</strong></div></div>${usageNote()}${weatherNote}${ignored.length?`<div class="drive-preview-note">تم تجاهل بنود سولار غير مرتبطة بالمكب: ${ignored.map(esc).join('، ')}${state.ignoredDieselNames.size>ignored.length?' ...':''}</div>`:''}<div class="source-import-table-wrap"><table class="v3-table source-import-table"><thead><tr><th>التاريخ</th><th>الطقس</th><th>°C</th><th>الطواقم</th><th>رش المياه</th><th>مياه/كوب</th><th>هيئات محلية</th><th>مستوطنات</th><th>أفراد</th><th>شركات</th><th>إجمالي الوارد</th><th>يطا</th><th>منها عزيز</th><th>ترقوميا</th><th>الخليل</th><th>السولار</th></tr></thead><tbody>${days.map(d=>{const t=totalsFor(d);return `<tr><td>${esc(d.date)}</td><td>${esc(d.derived.weather||(state.weatherPending?'جاري...':'-'))}${d.derived.isFriday?' · جمعة':''}</td><td>${d.derived.temperature??'-'}</td><td>${fmt(d.derived.crewTotal)}</td><td>${d.derived.waterSprays??'-'}</td><td>${d.derived.waterQuantity??'-'}</td><td>${fmt(d.landfill.localAuthorities.tons)}</td><td>${fmt(d.landfill.settlements.tons)}</td><td>${fmt(d.landfill.individuals.tons)}</td><td>${fmt(d.landfill.companies.tons)}</td><td><strong>${fmt(t.incoming.tons)}</strong></td><td>${fmt(d.stations.yata.tons)}</td><td>${fmt(d.azizAddedToYata.tons)}</td><td>${fmt(d.stations.tarqumia.tons)}</td><td>${fmt(d.stations.hebron.tons)}</td><td>${fmt(d.totalDiesel)}</td></tr>`;}).join('')}</tbody></table></div>`;
    $('sourceFilesPanel')?.classList.add('source-import-has-preview');
  }

  function updateFileState(){['landfill','stations','aziz','diesel'].forEach(type=>{const el=$(`sourceFileState_${type}`);if(el)el.textContent=state.files[type]?.name||'لم يتم اختيار ملف';});}

  async function analyze(){
    const msg=$('sourceFilesMessage'),btn=$('analyzeSourceFilesBtn');state.daily.clear();state.sourceNames.clear();state.ignoredDieselNames.clear();state.columnUsage={};state.weatherPending=false;
    const files=Object.entries(state.files).filter(([,f])=>f);if(!files.length){if(msg)msg.textContent='اختر ملفًا واحدًا على الأقل.';return;}
    const started=performance.now();if(btn)btn.disabled=true;
    try{
      if(!window.XLSX)throw new Error('قارئ Excel غير متاح');
      if(msg)msg.textContent='جاري قراءة الملفات...';
      await Promise.all(files.map(([type,file])=>readFile(file,type)));
      for(const day of state.daily.values())baseDerived(day);
      const seconds=((performance.now()-started)/1000).toFixed(1);
      state.weatherPending=true;renderPreview();
      if(msg)msg.textContent=`تم تجميع الملفات خلال ${seconds} ثانية. جاري تحديث الطقس في الخلفية...`;
      await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
      await enrichWeather();
      state.weatherPending=false;renderPreview();
      if(msg)msg.textContent=`اكتمل التحليل (${files.length} ملفات). يمكنك مراجعة النتائج الآن.`;
    }catch(e){console.error(e);state.weatherPending=false;if(msg)msg.textContent=e.message||'تعذر تحليل الملفات';}
    finally{if(btn)btn.disabled=false;}
  }

  function bindInput(type,id){$(id)?.addEventListener('change',e=>{const f=e.target.files?.[0]||null;if(f){const inferred=inferType(f.name);if(inferred&&inferred!==type)$('sourceFilesMessage').textContent=`اسم الملف ${f.name} يبدو من نوع مختلف عن الخانة المختارة.`;}state.files[type]=f;updateFileState();});}
  function init(){
    if(!$('sourceFilesPanel'))return;
    bindInput('landfill','sourceFile_landfill');bindInput('stations','sourceFile_stations');bindInput('aziz','sourceFile_aziz');bindInput('diesel','sourceFile_diesel');
    $('analyzeSourceFilesBtn')?.addEventListener('click',analyze);
    $('clearSourceFilesBtn')?.addEventListener('click',()=>{state.files={landfill:null,stations:null,aziz:null,diesel:null};state.daily.clear();state.ignoredDieselNames.clear();state.columnUsage={};state.weatherPending=false;['sourceFile_landfill','sourceFile_stations','sourceFile_aziz','sourceFile_diesel'].forEach(id=>{if($(id))$(id).value='';});updateFileState();if($('sourceFilesPreview'))$('sourceFilesPreview').innerHTML='';if($('sourceFilesMessage'))$('sourceFilesMessage').textContent='لم يتم تحليل ملفات بعد.';});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
;

/* ===== js/app-source-import-guard-v6.js ===== */
/* Source import V12: month guard + weather fallback without MutationObserver or summary rewrites. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const toLatin=s=>String(s??'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const LAT=31.6364,LON=35.2145,TZ='Asia/Hebron';
  function monthFromName(name){const s=toLatin(name);let m=s.match(/شهر\s*[-_ ]*([0-9]{1,2})/i);if(!m)m=s.match(/month\s*[-_ ]*([0-9]{1,2})/i);if(!m)return null;const n=Number(m[1]);return n>=1&&n<=12?n:null;}
  function expectedMonth(){const ids=['sourceFile_landfill','sourceFile_stations','sourceFile_aziz','sourceFile_cover','sourceFile_diesel'];const months=ids.map(id=>monthFromName($(id)?.files?.[0]?.name||'')).filter(Boolean);if(!months.length)return null;const c={};months.forEach(m=>c[m]=(c[m]||0)+1);return Number(Object.keys(c).sort((a,b)=>c[b]-c[a]||Number(a)-Number(b))[0]);}
  function mainTable(){const root=$('sourceFilesPreview');return root?[...root.querySelectorAll('.source-import-table')].find(t=>t.querySelector('tbody tr td:nth-child(16)'))||null:null;}
  function dominantMonth(table){const c={};table.querySelectorAll('tbody tr').forEach(tr=>{const d=clean(tr.querySelector('td')?.textContent||''),m=d.match(/^\d{4}-(\d{2})-\d{2}$/);if(m){const x=Number(m[1]);c[x]=(c[x]||0)+1;}});const ks=Object.keys(c);return ks.length?Number(ks.sort((a,b)=>c[b]-c[a]||Number(a)-Number(b))[0]):null;}
  function applyMonth(){const table=mainTable();if(!table)return;const named=expectedMonth(),month=named||dominantMonth(table);if(!month)return;let removed=0;table.querySelectorAll('tbody tr').forEach(tr=>{const d=clean(tr.querySelector('td')?.textContent||''),m=d.match(/^\d{4}-(\d{2})-\d{2}$/);if(m&&Number(m[1])!==month){tr.remove();removed++;}});const root=$('sourceFilesPreview');let n=root?.querySelector('#monthGuardV11');if(root&&!n){n=document.createElement('div');n.id='monthGuardV11';n.className='drive-preview-note';root.prepend(n);}if(n)n.innerHTML=`<strong>فلتر الشهر:</strong> تم اعتماد الشهر ${month} ${named?'من أسماء الملفات':'من غالبية تواريخ البيانات'} واستبعاد ${removed} تاريخ خارج الشهر.`;}
  function rows(){const t=mainTable();return t?[...t.querySelectorAll('tbody tr')]:[];}
  function dates(){return rows().map(tr=>clean(tr.querySelector('td')?.textContent||'')).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d));}
  function arabic(code){code=Number(code);if(code===0)return'مشمس';if(code===1||code===2)return'غائم جزئيًا';if(code===3)return'غائم';if(code===45||code===48)return'ضباب';if([51,53,55,61,63,65,80,81,82].includes(code))return'ماطر';if([71,73,75,85,86].includes(code))return'ثلجي';if([95,96,99].includes(code))return'عاصف';return'غير محدد';}
  function friday(d){return new Date(`${d}T12:00:00Z`).getUTCDay()===5;}
  function stable(d,min,max){const seed=Number(d.replace(/\D/g,'').slice(-4))||0;return min+(seed%(max-min+1));}
  function sprays(d,w,t,h){if(w==='ماطر'||w==='ثلجي')return 0;if(friday(d))return stable(d,4,5);if(Number.isFinite(t)&&t<=15)return 4;if(Number.isFinite(h)&&h>=75)return stable(d,2,3);return stable(d,8,9);}
  async function fetchJson(url,ms=5000){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),ms);try{const r=await fetch(url,{signal:ctl.signal,cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return await r.json();}finally{clearTimeout(timer);}}
  function aggregate(j){const times=j?.hourly?.time||[],temps=j?.hourly?.temperature_2m||[],hum=j?.hourly?.relative_humidity_2m||[],codes=j?.hourly?.weather_code||[],a=new Map();for(let i=0;i<times.length;i++){const d=String(times[i]).slice(0,10),hh=Number(String(times[i]).slice(11,13));if(hh<9||hh>13)continue;if(!a.has(d))a.set(d,{st:0,nt:0,sh:0,nh:0,c:{}});const x=a.get(d),t=Number(temps[i]),h=Number(hum[i]),c=Number(codes[i]);if(Number.isFinite(t)){x.st+=t;x.nt++;}if(Number.isFinite(h)){x.sh+=h;x.nh++;}if(Number.isFinite(c))x.c[c]=(x.c[c]||0)+1;}const out=[];for(const [date,x] of a){let code=null,best=-1;for(const k in x.c)if(x.c[k]>best){best=x.c[k];code=Number(k);}out.push({date,temperature:x.nt?x.st/x.nt:NaN,humidity:x.nh?x.sh/x.nh:NaN,weather:arabic(code)});}return out;}
  function setWeather(data,source){const map=new Map(data.map(x=>[x.date,x]));rows().forEach(tr=>{const c=tr.querySelectorAll('td');if(c.length<6)return;const d=clean(c[0].textContent),x=map.get(d);if(!x)return;const s=sprays(d,x.weather,x.temperature,x.humidity);c[1].textContent=`${x.weather}${friday(d)?' · جمعة':''}`;c[2].textContent=Number.isFinite(x.temperature)?Math.round(x.temperature):'-';c[4].textContent=s;c[5].textContent=s*3;});const root=$('sourceFilesPreview');if(root&&!root.querySelector('#weatherFallbackV11')){const n=document.createElement('div');n.id='weatherFallbackV11';n.className='drive-preview-note';n.innerHTML=`<strong>مصدر الطقس الاحتياطي:</strong> ${source}.`;root.prepend(n);}const btn=$('analyzeSourceFilesBtn');if(btn)btn.disabled=false;}
  async function fallback(){const ds=dates();if(!ds.length)return;const pending=rows().some(tr=>clean(tr.querySelectorAll('td')[1]?.textContent).includes('جاري'));if(!pending)return;try{const start=ds[0],end=ds[ds.length-1],url=`https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&start_date=${start}&end_date=${end}&hourly=temperature_2m,relative_humidity_2m,weather_code&timezone=${encodeURIComponent(TZ)}`;const data=aggregate(await fetchJson(url));if(data.length)setWeather(data,'Open-Meteo Historical Forecast');}catch(_){const btn=$('analyzeSourceFilesBtn');if(btn)btn.disabled=false;}}
  function runAfterAnalyze(){setTimeout(applyMonth,300);setTimeout(fallback,4500);setTimeout(applyMonth,9500);}
  function init(){const btn=$('analyzeSourceFilesBtn');if(!btn)return;btn.addEventListener('click',runAfterAnalyze);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

;

/* ===== js/app-source-stable-v16.js ===== */
/* Source reader compatibility shim.
 * The canonical V33 Pivot adapter owns landfill, stations and Aziz normalization.
 * This compatibility layer stays intentionally lightweight so no delayed renderer
 * can rewrite preview values after the canonical parser finishes.
 */
(function(){
  const badge=document.querySelector('#sourceFilesPanel .drive-readonly');
  if(badge) badge.textContent='معاينة مستقرة V33';
})();
;

/* ===== js/app-source-pivot-raw-v30.js ===== */
/* Legacy Pivot compatibility shim.
 * Parsing is now owned by app-source-stations-wide-v9.js (V33 adapter),
 * which handles landfill, stations and Aziz together for flat and grouped Pivot files.
 * Keeping a second delayed renderer here caused the same preview cells to be rewritten
 * by two parsers with different category rules.
 */
(function(){})();
;

/* ===== js/app-source-stations-wide-v9.js ===== */
/* V33 Pivot adapter: single source of truth for landfill/stations/Aziz. Supports flat landfill pivots (date row carries quantity/count) and grouped pivots without double counting date totals. */
(function(){
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const norm=v=>clean(v).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const state={busy:false,bypass:false,landfill:new Map(),stations:new Map(),aziz:new Map(),timers:[]};

  function iso(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
    if(typeof v==='number'&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;}
    const s=clean(v);let m=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);if(m)return `${m[1]}-${String(+m[2]).padStart(2,'0')}-${String(+m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);if(m)return `${m[3]}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;return'';
  }
  function bucket(label){const n=norm(label);if(n.includes('عصاره'))return'leachate';if(n.includes('مواد لتغطيه المكب'))return'cover';if(n.includes('طمم'))return'tamm';if(n.includes('هيئات محليه'))return'local';if(n.includes('اسرائيلي')||n.includes('مستوطن'))return'settlements';if(n.includes('افراد')||n.includes('نقديه'))return'individuals';if(n.includes('شركات')||n.includes('مصانع'))return'companies';return'other';}
  function stationKey(label){const n=norm(label);if(n.includes('يطا'))return'yata';if(n.includes('ترقوميا'))return'tarqumia';if(n.includes('الخليل'))return'hebron';return'';}
  function emptyLand(){return{local:{tons:0,trucks:0},settlements:{tons:0,trucks:0},individuals:{tons:0,trucks:0},companies:{tons:0,trucks:0},other:{tons:0,trucks:0},leachate:{tons:0,trucks:0},tamm:{tons:0,trucks:0},cover:{tons:0,trucks:0}};}
  function emptyStations(){return{yata:{tons:0,trucks:0},tarqumia:{tons:0,trucks:0},hebron:{tons:0,trucks:0}};}

  async function pivot(file){
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellStyles:false,cellNF:false,cellHTML:false});let best=null;
    for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,raw:true,defval:'',blankrows:false});for(let h=0;h<Math.min(rows.length,20);h++){const a=norm(rows[h]?.[0]),b=norm(rows[h]?.[1]),c=norm(rows[h]?.[2]);if((a.includes('row labels')||a.includes('تسميات'))&&(b.includes('كمي')||b.includes('مجموع'))&&(c.includes('عدد')||c.includes('وحد')||c.includes('مركبات')||c.includes('شاحنات'))){if(!best||rows.length>best.rows.length)best={rows,h};break;}}}
    return best;
  }
  function makeFile(rows,name){const ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'بيانات');const ab=XLSX.write(wb,{bookType:'xlsx',type:'array'});return new File([ab],name,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
  function assign(input,file){const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));}
  function expand(rows,date,label,tons,trucks){trucks=Math.max(0,Math.round(num(trucks)));tons=num(tons);if(!trucks)return;const each=tons/trucks;for(let i=0;i<trucks;i++)rows.push([date,label,each]);}

  async function normalizeLandfill(input){
    const p=await pivot(input.files?.[0]);if(!p)return false;
    const out=[['التاريخ','الاسم','الكمية']],map=new Map();
    let section=null;
    const finish=()=>{
      if(!section)return;
      const {date,dateTons,dateTrucks,children}=section,x=emptyLand();
      let childCount=0;
      for(const row of children){
        const label=clean(row[0]),n=norm(label);
        if(!label||n.includes('الاجمالي الكلي')||n.includes('grand total'))continue;
        const tons=num(row[1]),trucks=Math.max(0,Math.round(num(row[2])));
        if(tons===0&&trucks===0)continue;
        const k=bucket(label);x[k].tons+=tons;x[k].trucks+=trucks;expand(out,date,label,tons,trucks);childCount++;
      }
      if(childCount===0&&(dateTons!==0||dateTrucks!==0)){
        x.local.tons+=dateTons;x.local.trucks+=dateTrucks;expand(out,date,'هيئات محلية',dateTons,dateTrucks);
      }
      map.set(date,x);section=null;
    };
    for(let r=p.h+1;r<p.rows.length;r++){
      const row=p.rows[r]||[],date=iso(row[0]);
      if(date){finish();section={date,dateTons:num(row[1]),dateTrucks:Math.max(0,Math.round(num(row[2]))),children:[]};continue;}
      if(section)section.children.push(row);
    }
    finish();
    state.landfill=map;assign(input,makeFile(out,'مكب-pivot-normalized.xlsx'));return true;
  }
  async function normalizeStations(input){const p=await pivot(input.files?.[0]);if(!p)return false;const out=[['التاريخ','المحطة','الكمية']],map=new Map();let d='';for(let r=p.h+1;r<p.rows.length;r++){const row=p.rows[r]||[],date=iso(row[0]);if(date){d=date;if(!map.has(d))map.set(d,emptyStations());continue;}if(!d||norm(row[0]).includes('الاجمالي الكلي'))continue;const k=stationKey(row[0]);if(!k)continue;const x=map.get(d)[k];x.tons+=num(row[1]);x.trucks+=num(row[2]);expand(out,d,clean(row[0]),row[1],row[2]);}state.stations=map;assign(input,makeFile(out,'محطات-pivot-normalized.xlsx'));return true;}
  async function normalizeAziz(input){const p=await pivot(input.files?.[0]);if(!p)return false;const out=[['التاريخ','الكمية']],map=new Map();for(let r=p.h+1;r<p.rows.length;r++){const row=p.rows[r]||[],date=iso(row[0]);if(!date)continue;const tons=num(row[1]),trucks=Math.max(0,Math.round(num(row[2])));map.set(date,{tons,trucks});if(trucks){const each=tons/trucks;for(let i=0;i<trucks;i++)out.push([date,each]);}}state.aziz=map;assign(input,makeFile(out,'عبد العزيز-pivot-normalized.xlsx'));return true;}
  function text(x){return `${fmt(x.tons)} طن · ${fmt(x.trucks)} شاحنة`;}
  function totalLand(x){const ks=['local','settlements','individuals','companies','other'];return ks.reduce((a,k)=>({tons:a.tons+x[k].tons,trucks:a.trucks+x[k].trucks}),{tons:0,trucks:0});}
  function leachateTotal(){let t={tons:0,trucks:0};for(const x of state.landfill.values()){t.tons+=x.leachate.tons;t.trucks+=x.leachate.trucks;}return t;}
  function applyLeachate(root){
    const total=leachateTotal(),box=root.querySelector('#specialCategoriesV16');if(!box)return;
    const summary=box.querySelector('.source-import-summary');const first=summary?.querySelector('div:first-child strong');if(first){const next=text(total);if(clean(first.textContent)!==next)first.textContent=next;}
    box.querySelectorAll('table tbody tr').forEach(tr=>{const c=tr.querySelectorAll('td');if(c.length<2)return;const d=clean(c[0].textContent),l=state.landfill.get(d);if(!l)return;const next=text(l.leachate);if(clean(c[1].textContent)!==next)c[1].textContent=next;});
  }
  function apply(){
    const root=$('sourceFilesPreview');if(!root)return;
    const table=[...root.querySelectorAll('.source-import-table')].find(t=>t.querySelector('tbody tr td:nth-child(16)'));if(!table)return;
    table.querySelectorAll('tbody tr').forEach(tr=>{const c=tr.querySelectorAll('td');if(c.length<15)return;const d=clean(c[0].textContent),l=state.landfill.get(d),s=state.stations.get(d),a=state.aziz.get(d)||{tons:0,trucks:0};if(l){[[6,l.local],[7,l.settlements],[8,l.individuals],[9,l.companies],[10,totalLand(l)]].forEach(([i,v])=>{if(c[i])c[i].textContent=text(v);});}if(s||state.aziz.has(d)){const ss=s||emptyStations(),yata={tons:ss.yata.tons+a.tons,trucks:ss.yata.trucks+a.trucks};[[11,yata],[12,a],[13,ss.tarqumia],[14,ss.hebron]].forEach(([i,v])=>{if(c[i])c[i].textContent=text(v);});}});
    let lt={tons:0,trucks:0},st={tons:0,trucks:0},at={tons:0,trucks:0};
    for(const x of state.landfill.values()){const t=totalLand(x);lt.tons+=t.tons;lt.trucks+=t.trucks;}
    for(const x of state.stations.values())for(const k of ['yata','tarqumia','hebron']){st.tons+=x[k].tons;st.trucks+=x[k].trucks;}
    for(const x of state.aziz.values()){at.tons+=x.tons;at.trucks+=x.trucks;}
    const stationAll={tons:st.tons+at.tons,trucks:st.trucks+at.trucks};
    let box=root.querySelector('#pivotTotalsV18');if(!box){box=document.createElement('div');box.id='pivotTotalsV18';box.className='source-import-summary';root.prepend(box);}const html=`<div><span>مجموع وارد المكب</span><strong>${text(lt)}</strong></div><div><span>مجموع المحطات</span><strong>${text(stationAll)}</strong></div><div><span>مجموع عبد العزيز</span><strong>${text(at)}</strong></div>`;if(box.innerHTML!==html)box.innerHTML=html;
    const summaries=[...root.querySelectorAll('.source-import-summary')].filter(x=>x.id!=='pivotTotalsV18'&&!x.closest('#specialCategoriesV16'));const core=summaries.find(x=>x.querySelectorAll(':scope > div').length>=5);const cards=core?.querySelectorAll(':scope > div');if(cards?.[1]){const s=cards[1].querySelector('strong');if(s)s.textContent=text(lt);}if(cards?.[2]){const s=cards[2].querySelector('strong');if(s)s.textContent=text(stationAll);}if(cards?.[3]){const s=cards[3].querySelector('strong');if(s)s.textContent=text(at);}
    applyLeachate(root);
  }
  function schedule(){state.timers.forEach(clearTimeout);state.timers=[250,700,1400,2600,4500,7000,10000,12100].map(ms=>setTimeout(apply,ms));}
  async function intercept(e){if(state.bypass){state.bypass=false;schedule();return;}if(state.busy)return;e.preventDefault();e.stopImmediatePropagation();state.busy=true;try{const tasks=[];const lf=$('sourceFile_landfill'),sf=$('sourceFile_stations'),af=$('sourceFile_aziz');if(lf?.files?.[0])tasks.push(normalizeLandfill(lf));if(sf?.files?.[0])tasks.push(normalizeStations(sf));if(af?.files?.[0])tasks.push(normalizeAziz(af));await Promise.all(tasks);}catch(err){console.error(err);const m=$('sourceFilesMessage');if(m)m.textContent=`تعذر تجهيز Pivot: ${err.message||err}`;}finally{state.busy=false;state.bypass=true;$('analyzeSourceFilesBtn')?.click();}}
  function init(){const btn=$('analyzeSourceFilesBtn');if(!btn)return;btn.addEventListener('click',intercept,true);$('clearSourceFilesBtn')?.addEventListener('click',()=>{state.landfill.clear();state.stations.clear();state.aziz.clear();state.timers.forEach(clearTimeout);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
;

/* ===== js/app-source-usage-note-v22.js ===== */
/* V24: clarify Pivot quantity + vehicle-count fields in selective-reading note. Approval/conflict helpers only; landfill corrections are handled by the canonical V33 Pivot adapter. */
(function(){
  const $=id=>document.getElementById(id);
  function apply(){
    const root=$('sourceFilesPreview');if(!root)return;
    const note=[...root.querySelectorAll('.drive-preview-note')].find(el=>el.textContent.includes('القراءة الانتقائية:'));
    if(!note)return;
    note.innerHTML='<strong>القراءة الانتقائية:</strong> المكب: التاريخ + الجهة/نوع الوارد + الكمية + العدد/المركبات — المحطات: التاريخ + المحطة + الكمية + عدد الشاحنات — عزيز: التاريخ + الكمية + عدد الشاحنات — السولار: التاريخ + أعمدة آليات المكب فقط. بقية الأعمدة تم تجاهلها.';
  }
  function schedule(){[150,400,900,1800,3500,6000,9500,12500].forEach(ms=>setTimeout(apply,ms));}
  function loadScript(src,key){if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.src=src;s.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]='1';document.body.appendChild(s);}
  function loadApproval(){
    loadScript('js/app-source-operation-normalize.js?v=3.3.0-source-operation-normalize-v1','source-operation-normalize');
    loadScript('js/app-source-approve-v4.js?v=3.3.0-source-approve-v4','source-approve-v4');
    loadScript('js/app-source-conflict-bulk-v5.js?v=3.3.0-source-conflict-bulk-v5','source-conflict-bulk-v5');
  }
  function init(){const btn=$('analyzeSourceFilesBtn');if(btn)btn.addEventListener('click',schedule);loadApproval();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

;

/* ===== js/app-drive-import.js ===== */
/* Google Drive read-only import with preview -> approve/cancel */
(function(){
  const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const SHEET_MIME='application/vnd.google-apps.spreadsheet';
  const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.readonly';
  let accessToken='';
  let tokenClient=null;
  let driveFiles=[];
  let previewRows=[];
  let existingDates=new Set();
  let existingReportIds=new Map();
  let previewSource='Google Drive';

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const text=v=>String(v??'').trim();
  const normalize=s=>text(s).replace(/\s+/g,' ').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي');

  function setState(message,type=''){
    const el=$('driveConnectionState'); if(!el)return;
    el.className=`drive-state${type?` ${type}`:''}`; el.textContent=message;
  }
  function dateIso(value){
    const s=text(value);
    let m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if(m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    return '';
  }
  function dateDisplay(iso){const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:iso||'-';}
  function time24(v){
    const s=text(v); if(!s)return '';
    const m=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i); if(!m)return s;
    let h=Number(m[1]); const min=m[2], ap=(m[3]||'').toUpperCase();
    if(ap==='PM'&&h<12)h+=12; if(ap==='AM'&&h===12)h=0;
    return `${String(h).padStart(2,'0')}:${min}`;
  }
  function findRow(rows,needle,start=0){
    const n=normalize(needle);
    return rows.findIndex((row,i)=>i>=start&&row.some(cell=>normalize(cell).includes(n)));
  }
  function findCell(rows,needle){
    const n=normalize(needle);
    for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++)if(normalize(rows[r][c]).includes(n))return {r,c};
    return null;
  }
  function nearbyValue(rows,pos,preferNumber=false){
    if(!pos)return '';
    const row=rows[pos.r]||[];
    const candidates=[row[pos.c+1],row[pos.c-1],row[pos.c+2],row[pos.c-2]].filter(v=>text(v)!=='');
    if(preferNumber){const n=candidates.find(v=>Number.isFinite(Number(String(v).replace(/,/g,'')))); if(n!==undefined)return n;}
    return candidates[0]??'';
  }
  function sectionRows(rows,startNeedle,endNeedles){
    const start=findRow(rows,startNeedle); if(start<0)return [];
    let end=rows.length;
    for(const needle of endNeedles){const idx=findRow(rows,needle,start+1);if(idx>=0)end=Math.min(end,idx);}
    return rows.slice(start+1,end);
  }
  function cleanUnit(v){const s=normalize(v);if(s.includes('طون')||s.includes('طن'))return 'طن';if(s.includes('كوب'))return 'كوب';if(s.includes('نقله'))return 'نقلة';return text(v);}
  function mapEquipmentStatus(v){const s=normalize(v);if(s.includes('لا يعمل')||s.includes('عطل')||s.includes('متوقف'))return 'متعطل';if(s.includes('صيانه'))return 'تحت الصيانة';if(s.includes('جاهز'))return 'جاهز';return 'يعمل';}

  function parseDailySheet(sheetName,sheet){
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:''}).slice(0,120).map(r=>Array.from({length:Math.max(r.length,6)},(_,i)=>r[i]??''));
    const reportDate=dateIso(sheetName)||dateIso(rows?.[1]?.[0])||dateIso(rows?.[0]?.[0]);
    const weather=nearbyValue(rows,findCell(rows,'حالة الطقس'));
    const temperature=num(nearbyValue(rows,findCell(rows,'درجة الحرارة'),true));

    const crews=[];
    const crewBlock=sectionRows(rows,'طواقم العمل',['المجموع','العمليات']);
    for(const row of crewBlock){
      const name=text(row[0]); if(!name||normalize(name).includes('مجموع'))continue;
      const countCandidates=[row[2],row[1],row[3]].map(num);
      crews.push({crew_name:name,crew_count:countCandidates.find(x=>x!==0)||0,notes:''});
    }

    const operations=[];
    const opHeader=findRow(rows,'موقع مكب المنيا');
    const stationsHeader=findRow(rows,'موقع محطات الترحيل');
    if(opHeader>=0){
      const end=stationsHeader>opHeader?stationsHeader:rows.length;
      for(let i=opHeader+1;i<end;i++){
        const row=rows[i],name=text(row[0]); if(!name)continue;
        if(normalize(name).includes('كميات النفايات الوارده')||normalize(name).includes('المجموع النهائي'))break;
        operations.push({operation_name:name,start_time:time24(row[1]),end_time:time24(row[2]),vehicle_count:num(row[3]),quantity:num(row[4]),unit:cleanUnit(row[5]),notes:''});
      }
    }

    const stations=[];
    if(stationsHeader>=0){
      let end=findRow(rows,'كميات النفايات الواردة',stationsHeader+1); if(end<0)end=rows.length;
      for(let i=stationsHeader+1;i<end;i++){
        const row=rows[i],name=text(row[0]); if(!name)continue;
        stations.push({station_name:name,truck_count:num(row[3]),waste_tons:num(row[4]),unit:cleanUnit(row[5])||'طن',notes:''});
      }
    }

    let totalTrucks=0,totalWaste=0;
    const finalRow=findRow(rows,'المجموع النهائي');
    if(finalRow>=0){totalTrucks=num(rows[finalRow][3]);totalWaste=num(rows[finalRow][4]);}
    if(!totalTrucks) totalTrucks=operations.reduce((s,x)=>s+num(x.vehicle_count),0)+stations.reduce((s,x)=>s+num(x.truck_count),0);
    if(!totalWaste) totalWaste=operations.filter(x=>normalize(x.operation_name).includes('مكب نفايات المنيا')).reduce((s,x)=>s+num(x.quantity),0)+stations.reduce((s,x)=>s+num(x.waste_tons),0);

    const equipment=[];
    const eqHeader=findRow(rows,'اسم الالية');
    let totalDiesel=0;
    if(eqHeader>=0){
      for(let i=eqHeader+1;i<rows.length;i++){
        const row=rows[i],name=text(row[0]); if(!name)continue;
        if(normalize(name).includes('مجموع كميه السولار')){totalDiesel=num(row[5]);break;}
        if(normalize(name).includes('ملاحظات'))break;
        equipment.push({equipment_name:name,operating_status:mapEquipmentStatus(row[1]),status_description:text(row[2]),working_hours:0,diesel_liters:num(row[5]),notes:''});
      }
    }
    if(!totalDiesel)totalDiesel=equipment.reduce((s,x)=>s+num(x.diesel_liters),0);

    let notes='';
    const notesRow=findRow(rows,'ملاحظات');
    if(notesRow>=0){
      const collected=[];
      for(let i=notesRow+1;i<Math.min(rows.length,notesRow+12);i++){
        const line=rows[i].map(text).filter(Boolean).join(' | ');
        if(line&& !line.toLowerCase().includes('lagoon level'))collected.push(line);
      }
      notes=collected.join('\n');
    }
    const landfill=operations.find(x=>normalize(x.operation_name).includes('مكب نفايات المنيا'));
    const startTime=landfill?.start_time||'04:00',endTime=landfill?.end_time||'19:00';
    const issues=[];
    if(!reportDate)issues.push('تعذر تحديد تاريخ التقرير');
    if(!operations.length)issues.push('لم يتم العثور على قسم العمليات');
    if(!equipment.length)issues.push('لم يتم العثور على قسم المعدات');
    return {sheet_name:sheetName,report_date:reportDate,weather:text(weather),temperature,start_time:startTime,end_time:endTime,total_trucks:totalTrucks,total_waste_tons:totalWaste,total_diesel:totalDiesel,notes,crews,operations:operations.map(({start_time,end_time,...rest})=>rest),stations,equipment,issues};
  }

  async function authStatus(){
    const r=await fetch('/api/auth/status',{cache:'no-store'});const d=await r.json();
    for(let i=0;i<30&&!window.MINYA_USER&&d.authenticated;i++)await new Promise(resolve=>setTimeout(resolve,50));
    const user=window.MINYA_USER||d.user;
    if(!user||user.role!=='admin'){
      $('adminOnlyNotice')?.classList.remove('hidden');
      $('driveSetupPanel')?.classList.add('hidden');
      $('localExcelPanel')?.classList.add('hidden');
      return false;
    }
    return true;
  }

  function waitForGoogle(){return new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(window.google?.accounts?.oauth2){clearInterval(t);resolve();}else if(++n>80){clearInterval(t);reject(new Error('تعذر تحميل خدمة تسجيل Google'));}},100);});}
  function savedClientId(){return localStorage.getItem('minyaGoogleDriveClientId')||'';}
  function initTokenClient(){
    const clientId=text($('googleClientId')?.value)||savedClientId();
    if(!clientId)throw new Error('أدخل Google Client ID أولًا');
    tokenClient=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:DRIVE_SCOPE,callback:response=>{
      if(response.error){setState(`فشل الربط: ${response.error}`,'error');return;}
      accessToken=response.access_token||'';setState('تم ربط Google Drive للقراءة فقط','ok');$('driveFilesPanel')?.classList.remove('hidden');loadDriveFiles();
    }});
  }
  async function connectDrive(){try{await waitForGoogle();initTokenClient();tokenClient.requestAccessToken({prompt:'consent'});}catch(e){setState(e.message,'error');}}
  async function driveFetch(url){const r=await fetch(url,{headers:{Authorization:`Bearer ${accessToken}`}});if(r.status===401){accessToken='';throw new Error('انتهت جلسة Google. أعد الربط.');}if(!r.ok)throw new Error('فشل قراءة Google Drive');return r;}
  async function loadDriveFiles(){
    const list=$('driveFilesList'); if(list)list.innerHTML='<div class="drive-empty">جاري تحميل الملفات...</div>';
    try{
      const q=encodeURIComponent(`trashed=false and (mimeType='${SHEET_MIME}' or mimeType='${XLSX_MIME}')`);
      const fields=encodeURIComponent('files(id,name,mimeType,modifiedTime,size,webViewLink)');
      const r=await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=100`);
      const d=await r.json();driveFiles=Array.isArray(d.files)?d.files:[];renderDriveFiles();
    }catch(e){if(list)list.innerHTML=`<div class="drive-empty">${esc(e.message)}</div>`;setState(e.message,'error');}
  }
  function relevantFile(f,query){const n=normalize(f.name);const q=normalize(query);return (!q||n.includes(q))&&(n.includes('تقرير')||n.includes('يومي')||n.includes('مكب')||q);}
  function renderDriveFiles(){
    const q=$('driveFileSearch')?.value||'';const rows=driveFiles.filter(f=>relevantFile(f,q));$('driveFilesCount').textContent=`${rows.length} ملف`;
    $('driveFilesList').innerHTML=rows.length?rows.map(f=>`<div class="drive-file"><div><strong>${esc(f.name)}</strong><small>${f.mimeType===SHEET_MIME?'Google Sheets':'Excel'} · ${esc(f.modifiedTime?new Date(f.modifiedTime).toLocaleDateString('en-GB'):'')}</small></div><button type="button" data-preview-file="${esc(f.id)}">معاينة</button></div>`).join(''):'<div class="drive-empty">لا توجد ملفات مطابقة.</div>';
  }
  async function downloadWorkbook(file){
    let url;if(file.mimeType===SHEET_MIME)url=`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(XLSX_MIME)}`;else url=`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;
    const r=await driveFetch(url);const data=await r.arrayBuffer();return XLSX.read(data,{type:'array',cellDates:false});
  }
  async function loadExistingDates(){
    const r=await fetch('/api/reports',{cache:'no-store'});const d=await r.json();
    const reports=Array.isArray(d.reports)?d.reports:[];
    existingDates=new Set(reports.map(x=>String(x.report_date||'')));
    existingReportIds=new Map(reports.filter(x=>x.report_date&&x.id).map(x=>[String(x.report_date),Number(x.id)]));
  }
  async function previewFile(id){
    const file=driveFiles.find(f=>f.id===id);if(!file)return;
    $('previewPanel').classList.remove('hidden');$('previewFileName').textContent=file.name;$('previewReports').innerHTML='<div class="drive-empty">جاري قراءة الملف وتحليل صفحات الأيام...</div>';window.scrollTo({top:$('previewPanel').offsetTop-90,behavior:'smooth'});
    try{
      await loadExistingDates();const wb=await downloadWorkbook(file);
      prepareWorkbookPreview(wb,file.name,'Google Drive');
    }catch(e){$('previewReports').innerHTML=`<div class="drive-empty">${esc(e.message)}</div>`;}
  }
  function prepareWorkbookPreview(wb,fileName,source){
    previewSource=source;
    $('previewPanel').classList.remove('hidden');
    $('previewFileName').textContent=`${fileName} · ${source}`;
    const names=wb.SheetNames.filter(name=>normalize(name)!=='summary');
    previewRows=names.map(name=>parseDailySheet(name,wb.Sheets[name])).filter(r=>r.report_date||r.issues.length);
    previewRows.forEach(r=>{
      r.duplicate=existingDates.has(r.report_date);
      r.existing_id=existingReportIds.get(r.report_date)||null;
      r.valid=!r.issues.length;
      r.selected=!r.duplicate&&r.valid;
    });
    renderPreview();
    window.scrollTo({top:$('previewPanel').offsetTop-90,behavior:'smooth'});
  }
  async function previewLocalExcel(){
    const input=$('localExcelFile'),state=$('localExcelState'),file=input?.files?.[0];
    if(!file){state.textContent='اختر ملف Excel أولًا.';state.className='drive-state error';return;}
    if(file.size>30*1024*1024){state.textContent='حجم الملف يتجاوز 30MB.';state.className='drive-state error';return;}
    try{
      state.textContent='جاري قراءة ملف Excel وبناء المعاينة...';state.className='drive-state';
      await loadExistingDates();
      const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
      prepareWorkbookPreview(wb,file.name,'Excel من الجهاز');
      state.textContent=`تمت قراءة ${previewRows.length} ورقة يومية. راجع الجودة والاختلافات ثم اعتمد أو ألغِ.`;state.className='drive-state ok';
    }catch(e){state.textContent=e.message||'تعذر قراءة ملف Excel';state.className='drive-state error';}
  }
  function renderPreview(){
    const total=previewRows.length,dup=previewRows.filter(x=>x.duplicate).length,invalid=previewRows.filter(x=>x.issues.length&&!x.duplicate).length,valid=previewRows.filter(x=>!x.duplicate&&x.valid).length;
    $('previewTotal').textContent=total;$('previewValid').textContent=valid;$('previewDuplicate').textContent=dup;$('previewInvalid').textContent=invalid;
    $('approveImportBtn').disabled=!previewRows.some(x=>x.selected&&x.valid);
    $('previewReports').innerHTML=previewRows.length?previewRows.map((r,i)=>{
      const status=r.duplicate?['duplicate','موجود مسبقًا']:r.issues.length?['invalid','يحتاج مراجعة']:['valid','صالح للاستيراد'];
      const canSelect=r.valid&&(!r.duplicate||Boolean(r.existing_id));
      const hint=r.duplicate&&r.valid?`موجود في الموقع — اتركه بدون تحديد للتخطي، أو حدده لتحديثه من ${previewSource}`:r.issues.length?esc(r.issues.join('، ')):'تمت مطابقة الأقسام الرئيسية';
      return `<article class="drive-report-card"><div class="drive-report-head"><input type="checkbox" data-import-check="${i}" ${r.selected?'checked':''} ${canSelect?'':'disabled'}><div class="drive-report-main"><strong>${dateDisplay(r.report_date)} · ${esc(r.sheet_name)}</strong><small>${hint}</small></div><span class="drive-status ${status[0]}">${status[1]}</span></div><div class="drive-report-details"><div><span>النفايات</span><strong>${fmt(r.total_waste_tons)} طن</strong></div><div><span>الشاحنات</span><strong>${fmt(r.total_trucks)}</strong></div><div><span>السولار</span><strong>${fmt(r.total_diesel)} لتر</strong></div><div><span>المعدات</span><strong>${r.equipment.length}</strong></div></div><div class="drive-report-extra"><details><summary>عرض المحتويات المطابقة</summary><div class="drive-detail-grid"><div><b>شؤون الموظفين</b>${r.crews.map(x=>`<p>${esc(x.crew_name)}: ${fmt(x.crew_count)}</p>`).join('')||'<p>لا توجد بيانات</p>'}</div><div><b>العمليات والمحطات</b>${r.operations.map(x=>`<p>${esc(x.operation_name)}: عدد المركبات ${fmt(x.vehicle_count)} · الكمية ${fmt(x.quantity)} ${esc(x.unit)}</p>`).join('')}${r.stations.map(x=>`<p>${esc(x.station_name)}: عدد الشاحنات ${fmt(x.truck_count)} · الكمية ${fmt(x.waste_tons)} طن</p>`).join('')}</div><div><b>المعدات</b>${r.equipment.map(x=>`<p>${esc(x.equipment_name)}: ${esc(x.operating_status)} · ${fmt(x.diesel_liters)} لتر</p>`).join('')}</div></div></details></div></article>`;
    }).join(''):'<div class="drive-empty">لم يتم العثور على صفحات يومية قابلة للقراءة.</div>';
  }
  function cancelPreview(){previewRows=[];$('previewPanel').classList.add('hidden');$('importProgress').classList.add('hidden');$('importProgress').textContent='';}
  async function approveImport(){
    const selected=previewRows.filter(x=>x.selected&&x.valid);if(!selected.length)return;
    const updates=selected.filter(x=>x.duplicate).length;
    const creates=selected.length-updates;
    const confirmText=updates
      ? `سيتم استيراد ${creates} تقرير جديد وتحديث ${updates} تقرير موجود من ${previewSource}. التحديث يستبدل بيانات التقرير المختار فقط. هل تريد الاعتماد؟`
      : `سيتم استيراد ${creates} تقرير إلى النظام. هل تريد الاعتماد؟`;
    if(!confirm(confirmText))return;
    const btn=$('approveImportBtn'),progress=$('importProgress');btn.disabled=true;progress.classList.remove('hidden');let ok=0,failed=0;
    for(let i=0;i<selected.length;i++){
      const r=selected[i];progress.textContent=`جاري ${r.duplicate?'تحديث':'استيراد'} ${i+1} من ${selected.length}: ${dateDisplay(r.report_date)}`;
      try{
        const payload={report_date:r.report_date,weather:r.weather,temperature:r.temperature,start_time:r.start_time,end_time:r.end_time,total_trucks:r.total_trucks,total_waste_tons:r.total_waste_tons,total_diesel:r.total_diesel,notes:r.notes,crews:r.crews,operations:r.operations,stations:r.stations,equipment:r.equipment};
        const url=r.duplicate?`/api/reports/${r.existing_id}`:'/api/reports';
        const method=r.duplicate?'PUT':'POST';
        const res=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await res.json().catch(()=>({}));if(!res.ok||!data.ok)throw new Error(data.message||'فشل الحفظ');
        ok++;
        if(!r.duplicate&&data.report?.id){existingReportIds.set(r.report_date,Number(data.report.id));r.existing_id=Number(data.report.id);}
        existingDates.add(r.report_date);r.duplicate=true;r.valid=true;r.selected=false;
      }catch(e){failed++;r.issues=[...(r.issues||[]),e.message];r.valid=false;r.selected=false;}
    }
    progress.textContent=`اكتملت العملية: ${ok} ناجح${failed?`، ${failed} فشل`:''}.`;renderPreview();btn.disabled=!previewRows.some(x=>x.selected&&x.valid);
  }

  document.addEventListener('DOMContentLoaded',async()=>{
    if(!await authStatus())return;
    $('googleClientId').value=savedClientId();
    $('previewLocalExcelBtn').onclick=previewLocalExcel;
    $('localExcelFile').addEventListener('change',()=>{const file=$('localExcelFile').files?.[0];const state=$('localExcelState');state.textContent=file?`تم اختيار ${file.name}. اضغط معاينة Excel.`:'لم يتم اختيار ملف.';state.className='drive-state';});
    $('saveClientIdBtn').onclick=()=>{const id=text($('googleClientId').value);if(!id)return setState('أدخل Google Client ID أولًا','error');localStorage.setItem('minyaGoogleDriveClientId',id);setState('تم حفظ إعداد Google Client ID على هذا المتصفح','ok');};
    $('connectDriveBtn').onclick=connectDrive;
    $('refreshDriveFilesBtn').onclick=loadDriveFiles;
    $('driveFileSearch').addEventListener('input',renderDriveFiles);
    $('driveFilesList').addEventListener('click',e=>{const b=e.target.closest('[data-preview-file]');if(b)previewFile(b.dataset.previewFile);});
    $('previewReports').addEventListener('change',e=>{if(!e.target.matches('[data-import-check]'))return;const i=Number(e.target.dataset.importCheck);if(previewRows[i])previewRows[i].selected=e.target.checked;$('approveImportBtn').disabled=!previewRows.some(x=>x.selected&&x.valid);});
    $('cancelPreviewBtn').onclick=cancelPreview;$('cancelImportBtn').onclick=cancelPreview;$('approveImportBtn').onclick=approveImport;
  });
})();

;

/* ===== js/app-drive-quality.js ===== */
/* Drive import quality/confidence assistant. Works on preview DOM without changing import safety rules. */
(function(){
  const $=id=>document.getElementById(id);
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const text=v=>String(v??'').trim();
  const norm=v=>text(v).replace(/\s+/g,' ').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[()\-–—]/g,' ').trim();
  const sameNum=(a,b)=>Math.abs(num(a)-num(b))<=0.05;
  let reportsByDate=new Map();
  let scanToken=0;

  function isoFromDisplay(v){const m=text(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';}
  function getNumberAfter(label,s){const m=text(s).match(new RegExp(label+'\\s*([\\d,.]+)','i'));return m?num(m[1]):0;}
  function keyMap(rows,nameKey){const out=new Map();for(const r of rows||[]){const k=norm(r?.[nameKey]);if(k)out.set(k,r);}return out;}
  function findByLooseName(map,name){const n=norm(name);if(map.has(n))return map.get(n);for(const [k,v] of map){if(k.includes(n)||n.includes(k))return v;}return null;}

  function parseCard(card){
    const date=isoFromDisplay(card.querySelector('.drive-report-main strong')?.textContent||'');
    const detailEls=[...card.querySelectorAll('.drive-report-details > div')];
    const values={};
    detailEls.forEach(el=>{const k=norm(el.querySelector('span')?.textContent);const v=num(el.querySelector('strong')?.textContent);values[k]=v;});
    const grid=[...card.querySelectorAll('.drive-detail-grid > div')];
    const crews=[]; for(const p of grid[0]?.querySelectorAll('p')||[]){const s=text(p.textContent),i=s.lastIndexOf(':');if(i>0)crews.push({name:s.slice(0,i),count:num(s.slice(i+1))});}
    const operations=[],stations=[];
    for(const p of grid[1]?.querySelectorAll('p')||[]){const s=text(p.textContent),i=s.indexOf(':');if(i<0)continue;const name=s.slice(0,i);if(norm(name).includes('محطه ترحيل'))stations.push({name,trucks:getNumberAfter('عدد الشاحنات',s),quantity:getNumberAfter('الكمية',s)});else operations.push({name,vehicles:getNumberAfter('عدد المركبات',s),quantity:getNumberAfter('الكمية',s)});}
    const equipment=[];for(const p of grid[2]?.querySelectorAll('p')||[]){const s=text(p.textContent),i=s.indexOf(':');if(i<0)continue;const rest=s.slice(i+1),parts=rest.split('·');equipment.push({name:s.slice(0,i),status:text(parts[0]),diesel:num(parts[1])});}
    return {date,totalWaste:values['النفايات']||0,totalTrucks:values['الشاحنات']||0,totalDiesel:values['السولار']||0,equipmentCount:values['المعدات']||equipment.length,crews,operations,stations,equipment};
  }

  function readingScore(src,card){
    let score=0;
    if(src.date)score+=15;
    if(src.operations.length>=1)score+=25;
    if(src.stations.length>=3)score+=10; else if(src.stations.length)score+=5;
    if(src.equipment.length>=10)score+=20; else if(src.equipment.length)score+=10;
    if(src.crews.length>=3)score+=10; else if(src.crews.length)score+=5;
    if(src.totalWaste>0)score+=10;
    if(src.totalTrucks>0)score+=5;
    if(Number.isFinite(src.totalDiesel))score+=5;
    if(card.querySelector('.drive-status.invalid'))score=Math.min(score,69);
    return Math.min(100,score);
  }

  function compareExisting(src,data){
    const diffs=[],critical=[];let checks=0;
    function check(label,a,b,isCritical=false){checks++;if(!sameNum(a,b)){diffs.push(`${label}: المصدر ${fmt(a)} / الموقع ${fmt(b)}`);if(isCritical)critical.push(label);}}
    check('إجمالي النفايات',src.totalWaste,data.report?.total_waste_tons,true);
    check('إجمالي الشاحنات',src.totalTrucks,data.report?.total_trucks,true);
    check('إجمالي السولار',src.totalDiesel,data.report?.total_diesel,false);
    const ops=keyMap(data.operations,'operation_name');
    for(const x of src.operations){const old=findByLooseName(ops,x.name);checks+=2;if(!old){diffs.push(`عملية غير موجودة: ${x.name}`);critical.push(x.name);continue;}if(!sameNum(x.vehicles,old.vehicle_count)){diffs.push(`${x.name} - المركبات: المصدر ${fmt(x.vehicles)} / الموقع ${fmt(old.vehicle_count)}`);if(norm(x.name).includes('مكب نفايات المنيا'))critical.push(`${x.name} - المركبات`);}if(!sameNum(x.quantity,old.quantity)){diffs.push(`${x.name} - الكمية: المصدر ${fmt(x.quantity)} / الموقع ${fmt(old.quantity)}`);if(norm(x.name).includes('مكب نفايات المنيا'))critical.push(`${x.name} - الكمية`);}}
    const sts=keyMap(data.stations,'station_name');
    for(const x of src.stations){const old=findByLooseName(sts,x.name);checks+=2;if(!old){diffs.push(`محطة غير موجودة: ${x.name}`);critical.push(x.name);continue;}if(!sameNum(x.trucks,old.truck_count)){diffs.push(`${x.name} - الشاحنات: المصدر ${fmt(x.trucks)} / الموقع ${fmt(old.truck_count)}`);critical.push(`${x.name} - الشاحنات`);}if(!sameNum(x.quantity,old.waste_tons)){diffs.push(`${x.name} - الكمية: المصدر ${fmt(x.quantity)} / الموقع ${fmt(old.waste_tons)}`);critical.push(`${x.name} - الكمية`);}}
    const crews=keyMap(data.crews,'crew_name');
    for(const x of src.crews){const old=findByLooseName(crews,x.name);checks++;if(!old||!sameNum(x.count,old.crew_count))diffs.push(`${x.name} - العمال: المصدر ${fmt(x.count)} / الموقع ${fmt(old?.crew_count||0)}`);}
    const eq=keyMap(data.equipment,'equipment_name');
    for(const x of src.equipment){const old=findByLooseName(eq,x.name);checks++;if(!old||!sameNum(x.diesel,old.diesel_liters))diffs.push(`${x.name} - السولار: المصدر ${fmt(x.diesel)} / الموقع ${fmt(old?.diesel_liters||0)}`);}
    const match=checks?Math.max(0,Math.round(((checks-diffs.length)/checks)*100)):0;
    return {match,diffs,critical};
  }

  async function fullReport(date){
    const r=reportsByDate.get(date);if(!r?.id)return null;
    try{const res=await fetch(`/api/reports/${r.id}`,{cache:'no-store'});const d=await res.json();return res.ok&&d.ok?d:null;}catch{return null;}
  }

  function ensureControls(){
    const preview=$('previewPanel'),list=$('previewReports');if(!preview||!list||$('driveBulkQualityControls'))return;
    const box=document.createElement('div');box.id='driveBulkQualityControls';box.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0;padding:10px;border:1px solid #d9e7df;border-radius:10px;background:#f8fcf9';
    box.innerHTML='<button type="button" id="driveSelectAll" class="drive-secondary">تحديد الكل</button><button type="button" id="driveClearAll" class="drive-secondary">إلغاء تحديد الكل</button><button type="button" id="driveSelectSafe" class="drive-primary">تحديد الآمن تلقائيًا</button><span id="driveManualReviewCount" style="font-weight:700">المراجعة اليدوية: -</span>';
    list.parentNode.insertBefore(box,list);
    const apply=(mode)=>{for(const cb of list.querySelectorAll('[data-import-check]')){if(cb.disabled)continue;const card=cb.closest('.drive-report-card');const safe=Number(card?.dataset.readingScore||0)>=90;if(mode==='all')cb.checked=true;else if(mode==='none')cb.checked=false;else cb.checked=safe;cb.dispatchEvent(new Event('change',{bubbles:true}));}};
    $('driveSelectAll').onclick=()=>apply('all');$('driveClearAll').onclick=()=>apply('none');$('driveSelectSafe').onclick=()=>apply('safe');
  }

  function metricHtml(read,cmp){
    const review=read<90||(cmp&&cmp.critical.length>0&&cmp.match<95);
    const chips=[`<span style="font-weight:800">جودة القراءة ${read}%</span>`];
    if(cmp)chips.push(`<span>التطابق ${cmp.match}%</span><span>الاختلافات ${cmp.diffs.length}</span><span>حرجة ${cmp.critical.length}</span>`);
    chips.push(`<span style="font-weight:800">${review?'⚠ مراجعة':'✓ آمن'}</span>`);
    return `<div class="drive-auto-metrics" style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;font-size:12px">${chips.map(x=>`<span style="padding:4px 7px;border:1px solid #d8e4dc;border-radius:999px;background:#fff">${x}</span>`).join('')}</div>${cmp?.diffs.length?`<details style="margin-top:6px"><summary>عرض الاختلافات (${cmp.diffs.length})</summary><div style="font-size:12px;line-height:1.8">${cmp.diffs.slice(0,30).map(x=>`<div>• ${x}</div>`).join('')}</div></details>`:''}`;
  }

  async function scan(){
    const token=++scanToken;ensureControls();
    try{const r=await fetch('/api/reports',{cache:'no-store'});const d=await r.json();reportsByDate=new Map((d.reports||[]).map(x=>[String(x.report_date||''),x]));}catch{}
    const cards=[...document.querySelectorAll('#previewReports .drive-report-card')];let manual=0;
    for(const card of cards){if(token!==scanToken)return;const old=card.querySelector('.drive-auto-metrics-wrap');if(old)old.remove();const src=parseCard(card),read=readingScore(src,card);card.dataset.readingScore=String(read);let cmp=null;if(reportsByDate.has(src.date)){const data=await fullReport(src.date);if(data)cmp=compareExisting(src,data);}const needs=read<90||(cmp&&cmp.critical.length>0&&cmp.match<95);if(needs)manual++;const wrap=document.createElement('div');wrap.className='drive-auto-metrics-wrap';wrap.innerHTML=metricHtml(read,cmp);card.querySelector('.drive-report-main')?.appendChild(wrap);}
    const counter=$('driveManualReviewCount');if(counter)counter.textContent=`المراجعة اليدوية: ${manual} من ${cards.length}`;
  }

  function watch(){const root=$('previewReports');if(!root)return;let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(scan,180);}).observe(root,{childList:true,subtree:true});}
  document.addEventListener('DOMContentLoaded',()=>{ensureControls();watch();});
})();

;

/* ===== js/app-drive-quality-details.js ===== */
/* Explain the missing part of Drive reading quality and suggest safe remediation. */
(function(){
  const $=id=>document.getElementById(id);
  const text=v=>String(v??'').trim();
  const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0;};
  const norm=v=>text(v).replace(/\s+/g,' ').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[()\-–—]/g,' ').trim();

  function isoFromDisplay(v){const m=text(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';}
  function getNumberAfter(label,s){const m=text(s).match(new RegExp(label+'\\s*([\\d,.]+)','i'));return m?num(m[1]):0;}

  function parseCard(card){
    const date=isoFromDisplay(card.querySelector('.drive-report-main strong')?.textContent||'');
    const detailEls=[...card.querySelectorAll('.drive-report-details > div')];
    const values={};
    detailEls.forEach(el=>{values[norm(el.querySelector('span')?.textContent)]=num(el.querySelector('strong')?.textContent);});
    const grid=[...card.querySelectorAll('.drive-detail-grid > div')];
    const crews=[...(grid[0]?.querySelectorAll('p')||[])].filter(p=>!text(p.textContent).includes('لا توجد بيانات'));
    const operations=[],stations=[];
    for(const p of grid[1]?.querySelectorAll('p')||[]){
      const s=text(p.textContent),i=s.indexOf(':');if(i<0)continue;
      const name=s.slice(0,i);
      if(norm(name).includes('محطه ترحيل')) stations.push({name,trucks:getNumberAfter('عدد الشاحنات',s),quantity:getNumberAfter('الكمية',s)});
      else operations.push({name,vehicles:getNumberAfter('عدد المركبات',s),quantity:getNumberAfter('الكمية',s)});
    }
    const equipment=[...(grid[2]?.querySelectorAll('p')||[])].filter(p=>!text(p.textContent).includes('لا توجد بيانات'));
    return {date,crews,operations,stations,equipment,totalWaste:values['النفايات']||0,totalTrucks:values['الشاحنات']||0,totalDiesel:values['السولار']||0};
  }

  function diagnostics(src,card){
    const items=[];
    const add=(points,part,location,problem,fixable,solution)=>items.push({points,part,location,problem,fixable,solution});
    if(!src.date) add(15,'التاريخ','عنوان ورقة اليوم / أعلى التقرير','لم يتم التعرف على تاريخ صالح','نعم غالبًا','توحيد صيغة التاريخ إلى DD/MM/YYYY أو قراءة التاريخ من اسم الورقة.');
    if(src.operations.length<1) add(25,'العمليات','قسم العمليات','لم يتم العثور على صفوف العمليات','نعم إذا كان اختلاف تسمية','توسيع مطابقة عنوان قسم العمليات وأسماء الحقول بدل الاعتماد على صيغة واحدة.');
    if(src.stations.length<3){
      const lost=src.stations.length?5:10;
      add(lost,'محطات الترحيل','قسم محطات الترحيل',src.stations.length?`تمت قراءة ${src.stations.length} محطة فقط من العدد المتوقع 3`:'لم يتم العثور على محطات الترحيل','نعم غالبًا','مطابقة أسماء الخليل/ترقوميا/يطا بمرونة ومعالجة المسافات والاختلافات الإملائية.');
    }
    if(src.equipment.length<10){
      const lost=src.equipment.length?10:20;
      add(lost,'المعدات','تقرير الصيانة اليومي',src.equipment.length?`تمت قراءة ${src.equipment.length} معدة فقط؛ العدد أقل من البنية المعتادة`:'لم يتم العثور على جدول المعدات','نعم غالبًا','توسيع التعرف على عنوان اسم الآلية ونهاية جدول المعدات مع إبقاء الأسماء القديمة كما هي عند الحاجة.');
    }
    if(src.crews.length<3){
      const lost=src.crews.length?5:10;
      add(lost,'شؤون الموظفين','قسم طواقم العمل',src.crews.length?`تمت قراءة ${src.crews.length} بند فقط من طواقم العمل`:'لم يتم العثور على طواقم العمل','نعم غالبًا','مطابقة بند طواقم العمل والمجموع حسب النص وليس رقم الصف.');
    }
    if(!(src.totalWaste>0)) add(10,'إجمالي النفايات','صف المجموع النهائي / كميات النفايات','إجمالي النفايات صفر أو لم تتم قراءته','يحتاج تحقق','قراءة المجموع النهائي مباشرة، وإن غاب يتم جمع المكب ومحطات الترحيل مع تنبيه.');
    if(!(src.totalTrucks>0)) add(5,'إجمالي المركبات','صف المجموع النهائي','إجمالي المركبات صفر أو لم تتم قراءته','يحتاج تحقق','قراءة المجموع النهائي أو إعادة حسابه من مركبات المكب ومحطات الترحيل.');
    if(!Number.isFinite(src.totalDiesel)) add(5,'إجمالي السولار','نهاية جدول المعدات','إجمالي السولار غير قابل للقراءة','نعم','جمع سولار المعدات إذا تعذر العثور على صف المجموع.');
    if(card.querySelector('.drive-status.invalid')) add(31,'بنية التقرير','الورقة اليومية','النظام صنف الورقة أصلًا بأنها تحتاج مراجعة','حسب السبب','عرض رسالة الخطأ الأصلية ومعالجة الحقل المفقود قبل الاستيراد.');
    return items;
  }

  function detailsHtml(items,read){
    const missing=Math.max(0,100-Number(read||0));
    if(!items.length){
      return `<details class="drive-quality-explain" style="margin-top:7px"><summary>تفاصيل جودة القراءة</summary><div style="font-size:12px;line-height:1.8;padding:7px 2px">لم يتم اكتشاف جزء ناقص من البنية الحالية. إذا كانت الجودة أقل من 100% فقد يكون السبب حدًا محافظًا في التقييم، وسنحتاج مقارنة الورقة الأصلية عند هذه الحالة.</div></details>`;
    }
    const rows=items.map(x=>`<div style="padding:7px 0;border-bottom:1px solid #edf2ee"><b>ناقص ${x.points}% — ${x.part}</b><br><span>المكان: ${x.location}</span><br><span>المشكلة: ${x.problem}</span><br><span>إمكانية المعالجة: ${x.fixable}</span><br><span>المعالجة المقترحة: ${x.solution}</span></div>`).join('');
    return `<details class="drive-quality-explain" style="margin-top:7px"><summary style="font-weight:800">لماذا الجودة ${read}%؟ عرض الجزء الناقص ${missing}%</summary><div style="font-size:12px;line-height:1.75;padding:7px 2px">${rows}</div></details>`;
  }

  function enhance(){
    for(const card of document.querySelectorAll('#previewReports .drive-report-card')){
      if(card.querySelector('.drive-quality-explain'))continue;
      const metrics=card.querySelector('.drive-auto-metrics');if(!metrics)continue;
      const read=Number(card.dataset.readingScore||0);
      const src=parseCard(card),items=diagnostics(src,card);
      const host=card.querySelector('.drive-auto-metrics-wrap')||card.querySelector('.drive-report-main');
      if(host)host.insertAdjacentHTML('beforeend',detailsHtml(items,read));
    }
  }

  function runRetries(){
    [180,450,900,1600,2600].forEach(delay=>setTimeout(enhance,delay));
  }

  function watch(){
    const root=$('previewReports');if(!root)return;
    new MutationObserver(records=>{
      const hasNewCards=records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches?.('.drive-report-card')||node.querySelector?.('.drive-report-card'))));
      if(hasNewCards)runRetries();
    }).observe(root,{childList:true});
    runRetries();
  }

  document.addEventListener('DOMContentLoaded',watch);
})();

;

/* ===== js/app-drive-folder-nav.js ===== */
/* Google Drive folder browser layered over the read-only importer */
(function(){
  const FOLDER_MIME='application/vnd.google-apps.folder';
  const SHEET_MIME='application/vnd.google-apps.spreadsheet';
  const XLSX_MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  let driveToken='';
  let currentFolderId='root';
  let currentItems=[];
  let pathStack=[{id:'root',name:'ملفاتي'}];
  let refreshTimer=null;

  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const normalize=v=>String(v??'').trim().replace(/\s+/g,' ').toLowerCase();

  function captureToken(init){
    try{
      const headers=new Headers(init?.headers||{});
      const auth=headers.get('Authorization')||headers.get('authorization')||'';
      const match=auth.match(/^Bearer\s+(.+)$/i);
      if(match) driveToken=match[1];
    }catch(_){ }
  }

  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    if(url.includes('www.googleapis.com/drive/')) captureToken(init);
    const response=await nativeFetch(input,init);
    if(url.includes('/drive/v3/files') && driveToken && !url.includes('alt=media') && !url.includes('/export')){
      clearTimeout(refreshTimer);
      refreshTimer=setTimeout(()=>browseFolder(currentFolderId,false).catch(()=>{}),80);
    }
    return response;
  };

  function ensureToolbar(){
    const panel=document.getElementById('driveFilesPanel');
    const search=document.querySelector('.drive-search-row');
    if(!panel||!search||document.getElementById('driveFolderToolbar')) return;
    const bar=document.createElement('div');
    bar.id='driveFolderToolbar';
    bar.className='drive-folder-toolbar';
    bar.innerHTML=`<button id="driveFolderBack" type="button" class="drive-folder-back" disabled>رجوع</button><div id="driveBreadcrumb" class="drive-breadcrumb"><button type="button" data-drive-crumb="0">ملفاتي</button></div>`;
    search.before(bar);
  }

  function renderBreadcrumb(){
    const crumb=document.getElementById('driveBreadcrumb');
    const back=document.getElementById('driveFolderBack');
    if(!crumb||!back) return;
    crumb.innerHTML=pathStack.map((x,i)=>`<button type="button" data-drive-crumb="${i}">${esc(x.name)}</button>${i<pathStack.length-1?'<span>‹</span>':''}`).join('');
    back.disabled=pathStack.length<=1;
  }

  function renderItems(){
    const list=document.getElementById('driveFilesList');
    const count=document.getElementById('driveFilesCount');
    const search=document.getElementById('driveFileSearch');
    if(!list||!count) return;
    const q=normalize(search?.value||'');
    const visible=currentItems.filter(x=>!q||normalize(x.name).includes(q));
    const folders=visible.filter(x=>x.mimeType===FOLDER_MIME);
    const files=visible.filter(x=>x.mimeType!==FOLDER_MIME);
    count.textContent=`${folders.length} مجلد · ${files.length} ملف`;
    if(!visible.length){list.innerHTML='<div class="drive-empty">لا توجد عناصر مطابقة داخل هذا المجلد.</div>';return;}
    list.innerHTML=visible.map(item=>{
      if(item.mimeType===FOLDER_MIME){
        return `<button type="button" class="drive-file drive-folder-item" data-drive-folder="${esc(item.id)}" data-drive-folder-name="${esc(item.name)}"><div class="drive-folder-icon" aria-hidden="true">▰</div><div><strong>${esc(item.name)}</strong><small>مجلد Google Drive</small></div><span class="drive-folder-open">فتح</span></button>`;
      }
      const type=item.mimeType===SHEET_MIME?'Google Sheets':'Excel';
      const date=item.modifiedTime?new Date(item.modifiedTime).toLocaleDateString('en-GB'):'';
      return `<div class="drive-file"><div class="drive-file-icon" aria-hidden="true">▦</div><div><strong>${esc(item.name)}</strong><small>${type}${date?` · ${esc(date)}`:''}</small></div><button type="button" data-preview-file="${esc(item.id)}">معاينة</button></div>`;
    }).join('');
  }

  async function browseFolder(folderId='root',showLoading=true){
    if(!driveToken) return;
    ensureToolbar();
    const list=document.getElementById('driveFilesList');
    if(showLoading&&list) list.innerHTML='<div class="drive-empty">جاري فتح المجلد...</div>';
    const parent=folderId==='root'?'root':folderId;
    const q=`'${parent}' in parents and trashed=false and (mimeType='${FOLDER_MIME}' or mimeType='${SHEET_MIME}' or mimeType='${XLSX_MIME}')`;
    const params=new URLSearchParams({q,fields:'files(id,name,mimeType,modifiedTime,size,webViewLink,parents)',pageSize:'1000'});
    const response=await nativeFetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`,{headers:{Authorization:`Bearer ${driveToken}`}});
    if(!response.ok) throw new Error('تعذر قراءة محتويات المجلد');
    const data=await response.json();
    currentFolderId=folderId;
    currentItems=Array.isArray(data.files)?data.files:[];
    currentItems.sort((a,b)=>{
      const af=a.mimeType===FOLDER_MIME?0:1,bf=b.mimeType===FOLDER_MIME?0:1;
      if(af!==bf) return af-bf;
      return String(a.name||'').localeCompare(String(b.name||''),'ar',{numeric:true,sensitivity:'base'});
    });
    renderBreadcrumb();
    renderItems();
  }

  function openFolder(id,name){
    pathStack.push({id,name:name||'مجلد'});
    const search=document.getElementById('driveFileSearch'); if(search) search.value='';
    browseFolder(id).catch(showError);
  }
  function goBack(){
    if(pathStack.length<=1) return;
    pathStack.pop();
    const target=pathStack[pathStack.length-1];
    const search=document.getElementById('driveFileSearch'); if(search) search.value='';
    browseFolder(target.id).catch(showError);
  }
  function goCrumb(index){
    if(index<0||index>=pathStack.length) return;
    pathStack=pathStack.slice(0,index+1);
    const target=pathStack[pathStack.length-1];
    const search=document.getElementById('driveFileSearch'); if(search) search.value='';
    browseFolder(target.id).catch(showError);
  }
  function showError(error){
    const list=document.getElementById('driveFilesList');
    if(list) list.innerHTML=`<div class="drive-empty">${esc(error?.message||'حدث خطأ أثناء فتح المجلد')}</div>`;
  }

  document.addEventListener('click',event=>{
    const folder=event.target.closest('[data-drive-folder]');
    if(folder){event.preventDefault();openFolder(folder.dataset.driveFolder,folder.dataset.driveFolderName);return;}
    const crumb=event.target.closest('[data-drive-crumb]');
    if(crumb){event.preventDefault();goCrumb(Number(crumb.dataset.driveCrumb));return;}
    if(event.target.closest('#driveFolderBack')){event.preventDefault();goBack();}
  },true);

  document.addEventListener('input',event=>{
    if(event.target?.id==='driveFileSearch') setTimeout(renderItems,0);
  },true);

  document.addEventListener('click',event=>{
    if(event.target.closest('#refreshDriveFilesBtn')&&driveToken){
      setTimeout(()=>browseFolder(currentFolderId).catch(showError),120);
    }
  },true);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ensureToolbar,{once:true});
  else ensureToolbar();
})();
;

/* ===== js/app-english-digits.js ===== */
/* Force all displayed numerals to English 0-9 without changing Arabic text */
(function(){
  const arabicIndic = /[٠-٩]/g;
  const easternArabic = /[۰-۹]/g;

  function normalize(value){
    return String(value ?? "")
      .replace(arabicIndic, d => String(d.charCodeAt(0) - 0x0660))
      .replace(easternArabic, d => String(d.charCodeAt(0) - 0x06F0))
      .replace(/٫/g, ".")
      .replace(/٬/g, ",")
      .replace(/٪/g, "%");
  }

  function skip(node){
    const parent = node && node.parentElement;
    if(!parent) return true;
    return Boolean(parent.closest("script,style,textarea"));
  }

  function normalizeTextNode(node){
    if(!node || node.nodeType !== Node.TEXT_NODE || skip(node)) return;
    const next = normalize(node.nodeValue);
    if(next !== node.nodeValue) node.nodeValue = next;
  }

  function normalizeTree(root){
    if(!root) return;
    if(root.nodeType === Node.TEXT_NODE){
      normalizeTextNode(root);
      return;
    }
    if(root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while((node = walker.nextNode())) normalizeTextNode(node);
  }

  function start(){
    normalizeTree(document.body);

    const observer = new MutationObserver(mutations => {
      for(const mutation of mutations){
        if(mutation.type === "characterData") normalizeTextNode(mutation.target);
        for(const added of mutation.addedNodes) normalizeTree(added);
      }
    });

    observer.observe(document.body, {
      subtree:true,
      childList:true,
      characterData:true
    });
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();

;