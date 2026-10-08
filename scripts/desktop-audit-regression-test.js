const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
const elements=new Map();for(const id of ['archiveQuickSearch','archiveDateFilter','archiveMonthFilter','archiveReportsCount','archiveWasteTotal','archiveTrucksTotal','archiveDieselTotal','archiveSoilTotal','archivePageInfo','archivePrevPage','archiveNextPage'])elements.set(id,{value:'',textContent:''});
const tbody={innerHTML:''},requests=[];
const ctx={location:{pathname:'/archive'},document:{getElementById:id=>elements.get(id),querySelector:()=>tbody,dispatchEvent(){}},window:{},Event:function(){},console,API:'',URLSearchParams,archivePageLimit:50,isArchivePage:()=>true,formatNumber:String,formatDate:String,escapeHtml:String,updateArchiveSelectionUI(){},archiveSelectedReports:new Set(),fetch:url=>new Promise(resolve=>requests.push({url,resolve}))};
vm.createContext(ctx);
let src=fs.readFileSync('public/js/app-archive-pagination.js','utf8');src=src.slice(src.indexOf('let archiveRequestSequence'),src.indexOf('/* Imported source reports'));
vm.runInContext('let archivePage=1,archivePages=1;'+src,ctx);
let old=ctx.loadArchivePage();elements.get('archiveQuickSearch').value='MINYA-2026-09-30';let current=ctx.loadArchivePage();
const reply=(count,trips,number)=>({ok:true,json:async()=>({ok:true,count,page:1,pages:1,summary:{total_soil_trips:trips,total_waste_tons:1658.1,official_days:count,holiday_days:0},reports:[{id:1,report_no:number,report_date:'2026-09-30',soil_trips:trips}]})});
requests[1].resolve(reply(1,12,'MINYA-2026-09-30'));await current;requests[0].resolve(reply(638,7779,'OLD'));await old;
assert.equal(elements.get('archiveReportsCount').textContent,'1');assert.equal(elements.get('archiveSoilTotal').textContent,'12');assert(tbody.innerHTML.includes('MINYA-2026-09-30'));assert(!tbody.innerHTML.includes('OLD'));assert.equal(ctx.window.MINYA_ARCHIVE_WORKDAYS.official,1);
let pending=ctx.loadArchivePage();elements.get('archiveQuickSearch').value='changed';requests[2].resolve(reply(638,7779,'STALE'));await pending;assert.equal(elements.get('archiveReportsCount').textContent,'1');assert(!tbody.innerHTML.includes('STALE'));
console.log('Desktop archive: late initial response and changed-filter response cannot overwrite filtered cards, table, soil trips or workdays.');
})().catch(e=>{console.error(e);process.exitCode=1});
