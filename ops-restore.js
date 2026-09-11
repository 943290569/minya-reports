const fs=require('fs');
const path=require('path');

module.exports=function installOpsRestore(app,{db,requireRole,audit}){
  const dataDir=process.env.MINYA_DATA_DIR?path.resolve(process.env.MINYA_DATA_DIR):(process.env.RAILWAY_ENVIRONMENT?'/data':__dirname);
  const driverDir=path.join(dataDir,'uploads','driver-licenses');
  fs.mkdirSync(driverDir,{recursive:true});
  const arr=v=>Array.isArray(v)?v:[];
  const cleanFileName=v=>path.basename(String(v||'')).replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,180);
  const decode=v=>{const text=String(v||'').trim();if(!text||text.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))return null;try{return Buffer.from(text,'base64')}catch{return null}};

  app.post('/api/ops/restore',requireRole('admin'),(req,res)=>{
    try{
      const data=req.body?.operations_data;
      if(!data||typeof data!=='object')return res.json({ok:true,skipped:true,message:'لا تحتوي النسخة بيانات تشغيل إضافية'});
      const drivers=arr(data.driver_licenses),vehicles=arr(data.movement_vehicles),incidents=arr(data.incident_logs),files=arr(data.incident_files),environment=arr(data.environmental_logs),permissions=arr(data.feature_permissions);
      const written=[];
      const tx=db.transaction(()=>{
        db.prepare('DELETE FROM movement_vehicles').run();
        try{db.prepare('DELETE FROM incident_files').run()}catch{}
        try{db.prepare('DELETE FROM incident_logs').run()}catch{}
        try{db.prepare('DELETE FROM environmental_logs').run()}catch{}
        try{db.prepare('DELETE FROM feature_permissions').run()}catch{}
        try{db.prepare('DELETE FROM driver_license_events').run()}catch{}
        db.prepare('DELETE FROM driver_licenses').run();

        const di=db.prepare(`INSERT INTO driver_licenses(id,name_ar,name_en,address,birth_date,card_issue_date,first_issue_date,expiry_date,license_class,license_type,image_name,image_original,image_mime,updated_at,identity_number,license_number) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        for(const d of drivers){
          let imageName='';
          if(d.image_base64){const buf=decode(d.image_base64);if(buf){const ext=d.image_mime==='image/png'?'.png':d.image_mime==='image/webp'?'.webp':'.jpg';imageName=cleanFileName(d.image_name)||`license-${Number(d.id)||Date.now()}-restore${ext}`;if(!path.extname(imageName))imageName+=ext;fs.writeFileSync(path.join(driverDir,imageName),buf);written.push(imageName);}}
          di.run(Number(d.id)||null,String(d.name_ar||'').trim(),d.name_en||'',d.address||'',d.birth_date||'',d.card_issue_date||'',d.first_issue_date||'',d.expiry_date||'',d.license_class||'',d.license_type||'',imageName,d.image_original||'',d.image_mime||'',d.updated_at||new Date().toISOString(),d.identity_number||'',d.license_number||'');
        }
        const vi=db.prepare(`INSERT INTO movement_vehicles(id,plate_number,vehicle_type,model,driver_id,vehicle_license_expiry,insurance_expiry,status,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
        for(const v of vehicles)vi.run(Number(v.id)||null,v.plate_number||'',v.vehicle_type||'',v.model||'',v.driver_id||null,v.vehicle_license_expiry||'',v.insurance_expiry||'',v.status||'تعمل',v.notes||'',v.created_at||new Date().toISOString(),v.updated_at||new Date().toISOString());
        const ii=db.prepare(`INSERT INTO incident_logs(id,asset_name,incident_date,incident_type,followup_status,description,action_taken,followup_owner,cost,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
        for(const i of incidents)ii.run(Number(i.id)||null,i.asset_name||'',i.incident_date||'',i.incident_type||'حادث',i.followup_status||'مفتوحة',i.description||'',i.action_taken||'',i.followup_owner||'',Number(i.cost||0),i.created_by||null,i.created_at||new Date().toISOString(),i.updated_at||new Date().toISOString());
        const fi=db.prepare(`INSERT INTO incident_files(id,incident_id,file_name,mime_type,size_bytes,data,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)`);
        for(const f of files){const buf=decode(f.data_base64);if(!buf)continue;fi.run(Number(f.id)||null,Number(f.incident_id),f.file_name||'مرفق',f.mime_type||'application/octet-stream',buf.length,buf,f.created_by||null,f.created_at||new Date().toISOString());}
        const ei=db.prepare(`INSERT INTO environmental_logs(id,log_date,leachate_m3,tanker_trips,cover_trips,cover_quantity,cover_unit,notes,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`);
        for(const e of environment)ei.run(Number(e.id)||null,e.log_date||'',Number(e.leachate_m3||0),Number(e.tanker_trips||0),Number(e.cover_trips||0),Number(e.cover_quantity||0),e.cover_unit||'نقلة',e.notes||'',e.created_by||null,e.created_at||new Date().toISOString(),e.updated_at||new Date().toISOString());
        const pi=db.prepare(`INSERT INTO feature_permissions(user_id,feature,can_view,can_edit,updated_at) VALUES(?,?,?,?,?)`);
        for(const p of permissions){if(!db.prepare('SELECT id FROM users WHERE id=?').get(Number(p.user_id)))continue;pi.run(Number(p.user_id),p.feature||'',p.can_view?1:0,p.can_edit?1:0,p.updated_at||new Date().toISOString());}
      });
      tx();
      try{const keep=new Set(drivers.map(d=>cleanFileName(d.image_name)).filter(Boolean));for(const name of fs.readdirSync(driverDir)){const file=path.join(driverDir,name);if(fs.statSync(file).isFile()&&!keep.has(name))fs.unlinkSync(file);}}catch{}
      audit(req.user,'RESTORE_OPERATIONS_DATA','system','operations',`drivers:${drivers.length},vehicles:${vehicles.length},incidents:${incidents.length},environment:${environment.length}`);
      res.json({ok:true,summary:{drivers:drivers.length,vehicles:vehicles.length,incidents:incidents.length,incident_files:files.length,environment:environment.length,permissions:permissions.length}});
    }catch(error){console.error('Operations restore failed',error);res.status(500).json({ok:false,message:'فشل استعادة بيانات التشغيل الإضافية',error:error.message});}
  });
};