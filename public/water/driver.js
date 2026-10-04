"use strict";
const $=id=>document.getElementById(id),token=new URLSearchParams(location.hash.slice(1)).get("code")||"",key="minya-water-"+token;
const E=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let state={driver:null,entries:{},pending:{}},busy=false,conflict=null;
try{state=JSON.parse(localStorage.getItem(key))||state;}catch{}
function persist(){localStorage.setItem(key,JSON.stringify(state));}
function today(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Hebron",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
async function api(path,options={}){const r=await fetch("/api/water/"+path,{cache:"no-store",...options,headers:{"Content-Type":"application/json","X-Water-Token":token,...options.headers}});const data=await r.json();if(!r.ok){const e=Error(data.message||"تعذر الإرسال");e.status=r.status;e.data=data;throw e;}return data;}
function render(){if(state.driver){$("driverName").textContent=state.driver.name;$("editor").hidden=false;}const merged={...state.entries,...state.pending};$("history").innerHTML=Object.keys(merged).sort().reverse().slice(0,31).map(date=>{const e=merged[date];return '<article><button type="button" data-date="'+date+'">'+E(date)+' — '+e.tanks+' تنك — '+e.tanks*4+' م³</button><small>'+(state.pending[date]?"بانتظار الإرسال":"تم الإرسال")+'</small></article>';}).join("")||"لا توجد تسجيلات";$("sync").textContent="إرسال الآن — "+Object.keys(state.pending).length+" بانتظار الإرسال";$("save").disabled=busy;}
function fill(){const e=state.pending[$("date").value]||state.entries[$("date").value];$("tanks").value=e?.tanks??"";$("notes").value=e?.notes||"";quantity();}
function quantity(){$("quantity").textContent="كمية المياه "+(Number($("tanks").value)||0)*4+" م³";}
async function sync(){if(busy||!token)return;busy=true;render();try{
 for(const date of Object.keys(state.pending).sort()){const entry=state.pending[date];let d;try{d=await api("entry",{method:"POST",body:JSON.stringify(entry)});}catch(e){if(e.status===409){conflict={date,current:e.data.current};$("resolve").hidden=false;}throw e;}
 state.entries[date]=d.entry;delete state.pending[date];persist();}
 const d=await api("driver");state.driver=d.driver;for(const entry of d.entries)state.entries[entry.entry_date]=entry;persist();$("status").textContent="تم الإرسال. لا توجد تسجيلات بانتظار الإرسال";
 }catch(e){$("status").textContent=e.status?e.message:"محفوظ على الجهاز، بانتظار الإنترنت والإرسال";}finally{busy=false;render();}}
$("form").onsubmit=async e=>{e.preventDefault();if(busy||!$("form").reportValidity())return;const date=$("date").value,tanks=Number($("tanks").value);if(!Number.isInteger(tanks))return;const old=state.pending[date]||state.entries[date];const entry={entry_date:date,tanks,notes:$("notes").value,revision:old?.revision||0,mutation_id:crypto.randomUUID()};
 const previous=state.pending[date];state.pending[date]=entry;try{persist();}catch{if(previous)state.pending[date]=previous;else delete state.pending[date];$("status").textContent="تعذر الحفظ على الجهاز. لا تغلق الصفحة";return;}$("status").textContent="محفوظ على الجهاز، بانتظار الإرسال";render();await sync();};
$("date").onchange=fill;$("tanks").oninput=quantity;$("sync").onclick=sync;
$("history").onclick=e=>{const b=e.target.closest("[data-date]");if(b){$("date").value=b.dataset.date;fill();$("form").scrollIntoView();}};
$("resolve").onclick=()=>{if(!conflict)return;const date=conflict.date,p=state.pending[date];state.entries[date]=conflict.current;delete state.pending[date];persist();$("date").value=date;fill();$("status").textContent="الموجود بالموقع "+conflict.current.tanks+" تنك. العدد الذي حاولت إرساله "+p.tanks+" تنك. عدّل العدد واضغط حفظ بعد المراجعة";conflict=null;$("resolve").hidden=true;render();};
window.addEventListener("online",sync);document.addEventListener("visibilitychange",()=>{if(!document.hidden)sync();});
$("date").value=today();render();fill();
if(!/^[a-f0-9]{48}$/.test(token)){$("driverName").textContent="افتح الرابط المخصص لك من مسؤول المكب";}else{sync();}
const manifest={name:"تنكات رش المياه",short_name:"رش المياه",start_url:location.origin+location.pathname+location.hash,scope:location.origin+"/water/",display:"standalone",background_color:"#eef3f1",theme_color:"#17654d"};
document.querySelector('link[rel="manifest"]').href=URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:"application/manifest+json"}));
if("serviceWorker" in navigator)navigator.serviceWorker.register("/water/sw.js",{scope:"/water/"}).then(()=>navigator.serviceWorker.ready).then(()=>{$("offlineReady").textContent="الصفحة جاهزة للعمل دون إنترنت. أضف الرابط إلى الشاشة الرئيسية.";}).catch(()=>{$("offlineReady").textContent="افتح الصفحة بالإنترنت لتجهيز الحفظ دون اتصال";});
