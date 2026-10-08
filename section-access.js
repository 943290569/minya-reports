const sections = {
  report_entry:{label:'إدخال التقارير',routes:['/report','/monthly-entry','/monthly-entry.html']},
  archive:{label:'أرشيف التقارير',routes:['/archive']},
  monthly:{label:'التقرير الشهري',routes:['/monthly','/station-sources.html']},
  annual:{label:'التقرير السنوي',routes:['/annual']},
  weekly:{label:'التقرير الأسبوعي',routes:['/weekly']},
  search:{label:'البحث المتقدم',routes:['/search']},
  managerial:{label:'التقرير الإداري',routes:['/managerial']},
  ops_dashboard:{label:'لوحة التشغيل',routes:['/ops-dashboard']},
  fleet:{label:'المركبات والسائقون',routes:['/fleet','/drivers-licenses','/drivers-licenses.html']},
  equipment_management:{label:'الصيانة',routes:['/maintenance-center','/maintenance-center.html','/equipment-management','/equipment-maintenance-finance','/equipment-maintenance-finance.html','/maintenance-archive','/maintenance-archive.html','/equipment']},
  incidents:{label:'الحوادث والأعطال',routes:['/maintenance-incidents']},
  environment:{label:'العصارة والغطاء اليومي',routes:['/environment']},
  tasks:{label:'الملاحظات والمهام',routes:['/tasks']},
  contracts:{label:'المقاولون والعقود',routes:['/contracts']},
  cells:{label:'الخلايا والسعة',routes:['/cells']},
  global_search:{label:'البحث الشامل',routes:['/global-search']},
  files:{label:'ملفات ومرفقات الموقع',routes:['/files']},
  external_diesel:{label:'السولار الخارجي',routes:['/external-diesel']},
  backups:{label:'النسخ الاحتياطي',routes:[]}
};
// Canonical destinations only; route aliases are used for access checks.
sections.report_entry.links=[{href:'/monthly-entry.html',label:'إدخال التقارير الشهرية'}];
sections.monthly.links=[{href:'/station-sources.html',label:'مصادر كميات المحطات'}];
sections.fleet.links=[{href:'/fleet',label:'مركبات حركة المكب'},{href:'/drivers-licenses.html',label:'رخص المركبات والسائقين'}];
sections.equipment_management.links=[
  {href:'/maintenance-center.html',label:'مركز الصيانة'},
  {href:'/equipment-management',label:'المعدات وأوامر الصيانة'},
  {href:'/equipment-maintenance-finance.html',label:'سجل الصيانة والتكاليف'},
  {href:'/maintenance-archive.html',label:'أرشيف ملفات الصيانة'},
  {href:'/equipment',label:'تشغيل الآليات من التقارير'},
  {href:'/drivers-licenses.html',label:'رخص السائقين'},
  {href:'/fleet',label:'رخص المركبات والتأمين'}
];
sections.incidents.links=[{href:'/maintenance-incidents',label:'الحوادث والأعطال'}];
function featureForPath(value){
  const path=String(value||'').replace(/\/+$/,'')||'/';
  return Object.keys(sections).find(key=>sections[key].routes.some(route=>route===path||(!route.endsWith('.html')&&route+'.html'===path)))||null;
}
function directPermission(db,user,feature){
  if(!user)return{can_view:0,can_edit:0};
  if(user.role==='admin')return{can_view:1,can_edit:1};
  const row=db.prepare('SELECT can_view,can_edit FROM feature_permissions WHERE user_id=? AND feature=?').get(user.id,feature);
  if(row)return{can_view:Number(row.can_view),can_edit:Number(row.can_view)&&Number(row.can_edit)?1:0};
  // Once an administrator chooses sections, missing choices are denied.
  if(db.prepare('SELECT 1 FROM feature_permissions WHERE user_id=? LIMIT 1').get(user.id))return{can_view:0,can_edit:0};
  return user.role==='editor'?{can_view:1,can_edit:1}:{can_view:1,can_edit:0};
}
function permission(db,user,feature){
  const own=directPermission(db,user,feature);
  if(feature!=='fleet'||!user||user.role==='admin')return own;
  const maintenance=directPermission(db,user,'equipment_management');
  return {can_view:own.can_view||maintenance.can_view?1:0,can_edit:own.can_edit||maintenance.can_edit?1:0};
}
function install(app,{db,currentUser}){
  app.use((req,res,next)=>{
    const licenseApi=/^\/api\/(driver-licenses|movement-vehicles)(?:\/|$)/.test(req.path);
    if(licenseApi){
      const user=currentUser(req);if(!user)return next();
      const allowed=permission(db,user,'fleet'),edit=!['GET','HEAD'].includes(req.method);
      if(!allowed.can_view||(edit&&!allowed.can_edit))return res.status(403).json({ok:false,message:'لا توجد صلاحية كافية للرخص والمركبات'});
      return next();
    }
    if(!['GET','HEAD'].includes(req.method))return next();
    const feature=featureForPath(req.path);
    if(!feature)return next();
    const user=currentUser(req);
    const center=['/maintenance-center','/maintenance-center.html'].includes(req.path);
    if(!user||permission(db,user,feature).can_view||(center&&['fleet','incidents'].some(f=>permission(db,user,f).can_view)))return next();
    res.setHeader('Cache-Control','no-store');
    return res.redirect(303,'/');
  });
}
module.exports={sections,featureForPath,permission,install};
