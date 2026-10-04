"use strict";
const $=id=>document.getElementById(id);
const fields=["job_nature","employee_name","employee_number","identity_number","employment_date","evaluation_date","period_from","period_to","supervisor","notes","recommendation","recheck_date","approval","employee_signature","supervisor_signature","section_signature","director_signature"];
const factLabels={absence:"أيام الغياب",late:"حالات التأخير",written_notices:"لفت نظر خطي",warnings:"إنذارات",incidents:"حوادث مرتبطة بالعمل",safety_violations:"مخالفات سلامة",misuse_failures:"أعطال بسبب سوء الاستخدام",praise:"إشادات أو مكافآت",training:"دورات أو تدريب",inspection_reports:"تقارير صيانة أو فحص"};
const columns={indicators:{indicator:"المؤشر",value:"القيمة أو العدد",source:"الفترة أو المصدر",note:"ملاحظات"},plans:{area:"المجال المطلوب تحسينه",action:"الإجراء المطلوب",owner:"المسؤول عن المتابعة",duration:"المدة",result:"نتيجة المتابعة"}};
let preservedData=null,activeTemplate=null,templates={},editingId=null,revision=null,dirty=false,offset=0,total=0,loading=false;
const selected=new Map();
function escapeHTML(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const E=escapeHTML;
function grade(n){return n>=90?"ممتاز":n>=80?"جيد جداً":n>=70?"جيد":n>=60?"مقبول":"يحتاج إلى تحسين";}
function say(s){$("message").textContent=s;}
async function api(url,options={}){const r=await fetch(url,{cache:"no-store",...options});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.message||"تعذر تنفيذ الطلب");return d;}
function today(){const parts=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Hebron",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+"-"+p.month+"-"+p.day;}
function rows(key,values=[]){
  $(key).innerHTML=Array.from({length:3},(_,i)=>'<div class="follow-row"><div class="grid">'+Object.entries(columns[key]).map(([c,l])=>'<label>'+l+'<input data-col="'+c+'" maxlength="1000" value="'+E(values[i]?.[c]||"")+'"></label>').join("")+'</div></div>').join("");
}
const ratingChoices=[["ممتاز",1],["جيد جدًا",0.8],["جيد",0.6],["مقبول",0.4],["ضعيف",0.2]];
function ratingOptions(max,saved){
  const options=ratingChoices.map(([label,ratio])=>({label,value:Math.round(max*ratio*100)/100}));
  if(saved!==undefined && saved!==null && !options.some(o=>Math.abs(o.value-saved)<0.000001))options.push({label:"علامة محفوظة "+saved+" / "+max,value:saved});
  return '<option value="">اختر التقييم</option>'+options.map(o=>'<option value="'+o.value+'" '+(saved!==undefined&&saved!==null&&Math.abs(saved-o.value)<0.000001?'selected':'')+'>'+E(o.label)+'</option>').join("");
}
function ratingLabel(score,max){return ratingChoices.find(([,ratio])=>Math.abs(Math.round(max*ratio*100)/100-score)<0.000001)?.[0]||"علامة محفوظة";}
function renderCriteria(category,scores=[],snapshot=null){
  activeTemplate=snapshot||templates[category];
  $("criteria").innerHTML=activeTemplate.criteria.map((c,i)=>'<div class="criterion"><h4>'+(i+1)+'. '+E(c.label)+' — '+c.max+' علامات</h4><div class="criterion-score"><label>التقييم<select class="score" required data-max="'+c.max+'">'+ratingOptions(c.max,scores[i]?.score)+'</select></label></div><div hidden><label>مصدر التحقق<input class="source" maxlength="500" value="'+E(scores[i]?.source??c.source)+'"></label><label>الملاحظات<textarea class="note" maxlength="1000">'+E(scores[i]?.note||"")+'</textarea></label></div></div>').join("");
  sum();
}
function sum(){
  const inputs=[...document.querySelectorAll(".score")],filled=inputs.filter(x=>x.value!=="").length;
  const n=Math.round(inputs.reduce((s,x)=>s+(Number(x.value)||0),0)*100)/100;
  $("scoreSummary").textContent=(filled===inputs.length?"المجموع "+n+" / 100 — "+grade(n):"أكمل تقييم جميع البنود")+" — البنود المدخلة "+filled+" من "+inputs.length;
}
function leave(){return !dirty||confirm("توجد تغييرات لم تحفظ. هل تريد تركها؟");}
function openEditor(data=null,id=null,rev=null){
  preservedData=data?structuredClone(data):null;editingId=id;revision=rev;$("evaluationForm").reset();
  $("category").value=data?.category||"operator";
  for(const f of fields) $(f).value=data?.[f]||"";
  if(!data){$("evaluation_date").value=today();$("recommendation").selectedIndex=0;}
  $("facts").innerHTML=Object.entries(factLabels).map(([f,l])=>'<label>'+l+'<input data-fact="'+f+'" type="number" min="0" max="100000" step="1" value="'+E(data?.facts?.[f]??0)+'"></label>').join("");
  $("previous_actions").value=data?.previous_actions||"";
  rows("indicators",data?.indicators);rows("plans",data?.plans);
  renderCriteria($("category").value,data?.scores,data?.template);
  $("formTitle").textContent=id?"تعديل تقييم رقم "+id:"تقييم جديد";
  $("registry").hidden=true;$("editor").hidden=false;$("printPreview").hidden=true;dirty=false;
  $("editor").scrollIntoView({block:"start"});
}
function collect(){
  const d={category:$("category").value,revision,facts:{},scores:[]};
  for(const f of fields)d[f]=$(f).value;
  d.previous_actions=$("previous_actions").value;
  document.querySelectorAll("[data-fact]").forEach(x=>d.facts[x.dataset.fact]=Number(x.value));
  document.querySelectorAll(".criterion").forEach(c=>d.scores.push({score:Number(c.querySelector(".score").value),source:c.querySelector(".source").value,note:c.querySelector(".note").value}));
  for(const key of ["indicators","plans"])d[key]=[...$(key).querySelectorAll(".follow-row")].map(r=>Object.fromEntries([...r.querySelectorAll("[data-col]")].map(x=>[x.dataset.col,x.value])));
  if(!preservedData){d.period_from=d.evaluation_date;d.period_to=d.evaluation_date;}
  if(preservedData){d.indicators=preservedData.indicators||[];d.plans=preservedData.plans||[];}
  return d;
}
async function list(){
  if(loading)return;loading=true;$("find").disabled=true;
  try{
    const d=await api("/api/employee-evaluations?q="+encodeURIComponent($("search").value)+"&category="+encodeURIComponent($("filterCategory").value)+"&offset="+offset);
    total=d.total;
    $("records").innerHTML=d.rows.map(r=>'<article class="record"><input type="checkbox" aria-label="اختيار تقييم '+E(r.employee_name)+' للمقارنة" data-select="'+r.id+'" '+(selected.has(r.id)?"checked":"")+'><div><strong>'+E(r.employee_name)+'</strong><p>'+E(templates[r.category]?.title||r.category)+' — '+E(r.evaluation_date)+'</p><p>الفترة '+E(r.period_from)+' إلى '+E(r.period_to)+' — '+r.total+' / 100 — '+E(r.grade)+'</p></div><button data-open="'+r.id+'">فتح التقييم</button></article>').join("")||"<p>لا توجد تقييمات محفوظة</p>";
    $("count").textContent="عدد التقييمات "+total+(total?" — عرض "+(offset+1)+" إلى "+Math.min(offset+100,total):"");
    $("previous").disabled=offset===0;$("next").disabled=offset+100>=total;
  }catch(e){say(e.message);}finally{loading=false;$("find").disabled=false;}
}
function printData(d){
  const t=activeTemplate||templates[d.category],n=Math.round(d.scores.reduce((s,x)=>s+x.score,0)*100)/100;
  let html="<h2>تقييم "+E(t.title)+" — مكب المنيا</h2><p>اسم الموظف — "+E(d.employee_name)+"</p><p>تاريخ التقييم — "+E(d.evaluation_date)+"</p>";
  if(d.job_nature)html+="<p>طبيعة الوظيفة — "+E(d.job_nature)+"</p>";
  if(dirty)html+="<p>معاينة تغييرات لم تحفظ بعد</p>";
  html+="<table><thead><tr><th style='width:6%'>م</th><th style='width:55%'>عنصر التقييم</th><th style='width:13%'>العظمى</th><th style='width:13%'>المستحقة</th><th style='width:13%'>التقييم</th></tr></thead><tbody>"+t.criteria.map((c,i)=>"<tr><td>"+(i+1)+"</td><td>"+E(c.label)+"</td><td>"+c.max+"</td><td>"+d.scores[i].score+"</td><td>"+ratingLabel(d.scores[i].score,c.max)+"</td></tr>").join("")+"</tbody></table><p>المجموع "+n+" / 100 — التقدير "+grade(n)+"</p>";
  if(d.notes)html+="<p>الملاحظات — "+E(d.notes)+"</p>";
  html+="<p>توقيع الموظف ....................　توقيع المسؤول ....................</p>";
  $("printBody").innerHTML=html;$("editor").hidden=true;$("printPreview").hidden=false;$("printPreview").scrollIntoView({block:"start"});
}
$("new").onclick=()=>{if(leave())openEditor();};
$("category").onchange=()=>{renderCriteria($("category").value);dirty=true;};
$("evaluationForm").oninput=()=>{dirty=true;sum();};
$("evaluationForm").onchange=()=>{dirty=true;};
$("evaluationForm").onsubmit=async e=>{
  e.preventDefault();if(!$("evaluationForm").reportValidity())return;
  $("save").disabled=true;
  try{const d=await api("/api/employee-evaluations"+(editingId?"/"+editingId:""),{method:editingId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(collect())});editingId=d.id;revision=revision?revision+1:1;dirty=false;$("formTitle").textContent="تعديل تقييم رقم "+editingId;say(d.message+" — "+d.total+" / 100 — "+d.grade);}
  catch(e){say(e.message);}finally{$("save").disabled=false;}
};
$("close").onclick=()=>{if(!leave())return;dirty=false;$("editor").hidden=true;$("registry").hidden=false;list();};
$("print").onclick=()=>{if($("evaluationForm").reportValidity())printData(collect());};
$("closePreview").onclick=()=>{$("printPreview").hidden=true;$("editor").hidden=false;};
$("doPrint").onclick=()=>window.print();
$("find").onclick=()=>{offset=0;selected.clear();$("comparison").hidden=true;list();};
$("previous").onclick=()=>{offset=Math.max(0,offset-100);list();};
$("next").onclick=()=>{offset+=100;list();};
$("export").onclick=()=>{window.location.href="/api/employee-evaluations/export";};
$("records").onclick=async e=>{
  const b=e.target.closest("[data-open]");if(!b||!leave())return;b.disabled=true;
  try{const d=await api("/api/employee-evaluations/"+b.dataset.open);openEditor(d.data,d.id,d.revision);}catch(err){say(err.message);}finally{b.disabled=false;}
};
$("records").onchange=e=>{
  const x=e.target;if(!x.dataset.select)return;
  const id=Number(x.dataset.select);
  if(x.checked&&selected.size>=2){x.checked=false;say("اختر تقييمين فقط للمقارنة");return;}
  if(x.checked)selected.set(id,true);else selected.delete(id);
};
$("compare").onclick=async()=>{
  if(selected.size!==2){say("اختر تقييمين للموظف نفسه باستخدام مربعات الاختيار");return;}
  try{
    let ds=await Promise.all([...selected.keys()].map(id=>api("/api/employee-evaluations/"+id)));
    ds.sort((a,b)=>a.evaluation_date.localeCompare(b.evaluation_date)||a.id-b.id);
    const [a,b]=ds,da=a.data,db=b.data;
    const same=a.employee_number&&b.employee_number?a.employee_number===b.employee_number:a.employee_name.trim()===b.employee_name.trim();
    if(!same||a.category!==b.category)throw Error("اختر تقييمين للموظف نفسه ومن الفئة نفسها");
    if(JSON.stringify(da.template.criteria)!==JSON.stringify(db.template.criteria))throw Error("تختلف بنود التقييمين ولا يمكن مقارنتها بندًا ببند");
    const delta=Math.round((b.total-a.total)*100)/100;
    $("comparison").innerHTML="<h3>مقارنة تقييمات "+E(a.employee_name)+"</h3><p>"+E(a.evaluation_date)+" — "+a.total+" / 100 مقابل "+E(b.evaluation_date)+" — "+b.total+" / 100</p><p>فرق المجموع "+(delta>0?"+":"")+delta+" علامات</p><table><thead><tr><th>البند</th><th>التقييم الأول</th><th>التقييم الثاني</th><th>الفرق</th></tr></thead><tbody>"+da.template.criteria.map((c,i)=>"<tr><td>"+E(c.label)+"</td><td>"+da.scores[i].score+"</td><td>"+db.scores[i].score+"</td><td>"+Math.round((db.scores[i].score-da.scores[i].score)*100)/100+"</td></tr>").join("")+"</tbody></table>";
    $("comparison").hidden=false;
  }catch(e){say(e.message);}
};
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});
(async()=>{try{const d=await api("/api/employee-evaluations/templates");templates=d.templates;$("workspace").hidden=false;say("متاح للمدير والمحرر");await list();}catch(e){say(e.message+" — سجل الدخول من الصفحة الرئيسية بحساب المدير أو المحرر");}})();
