const webpush = require('web-push');

module.exports = function installWebPush(app,{db,requireAuth,audit}){
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      subscription_json TEXT NOT NULL,
      user_agent TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
    CREATE TABLE IF NOT EXISTS push_dispatch_log(
      alert_key TEXT PRIMARY KEY,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sent_count INTEGER DEFAULT 0
    );
  `);

  function setting(key){
    return db.prepare(`SELECT setting_value FROM system_settings WHERE setting_key=?`).get(key)?.setting_value || '';
  }
  function saveSetting(key,value){
    db.prepare(`INSERT INTO system_settings(setting_key,setting_value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_at=CURRENT_TIMESTAMP`).run(key,String(value));
  }
  function ensureVapid(){
    let publicKey=setting('push_vapid_public');
    let privateKey=setting('push_vapid_private');
    if(!publicKey || !privateKey){
      const keys=webpush.generateVAPIDKeys();
      publicKey=keys.publicKey; privateKey=keys.privateKey;
      saveSetting('push_vapid_public',publicKey);
      saveSetting('push_vapid_private',privateKey);
    }
    const subject=process.env.WEB_PUSH_SUBJECT || 'https://minya-landfill.duckdns.org';
    webpush.setVapidDetails(subject,publicKey,privateKey);
    return {publicKey,privateKey};
  }
  const vapid=ensureVapid();

  function safeSubscription(body){
    const sub=body?.subscription || body;
    if(!sub || typeof sub!=='object') return null;
    const endpoint=String(sub.endpoint||'').trim();
    const p256dh=String(sub.keys?.p256dh||'').trim();
    const auth=String(sub.keys?.auth||'').trim();
    if(!endpoint.startsWith('https://') || !p256dh || !auth) return null;
    return {endpoint,expirationTime:sub.expirationTime||null,keys:{p256dh,auth}};
  }

  async function sendRow(row,payload){
    try{
      const sub=JSON.parse(row.subscription_json);
      await webpush.sendNotification(sub,JSON.stringify(payload),{TTL:60*60*12,urgency:'normal'});
      return true;
    }catch(error){
      if(error?.statusCode===404 || error?.statusCode===410){
        try{db.prepare(`DELETE FROM push_subscriptions WHERE id=?`).run(row.id);}catch{}
      }
      console.error('Web push send failed',error?.statusCode||'',error?.message||error);
      return false;
    }
  }

  async function sendToRows(rows,payload){
    let sent=0;
    for(const row of rows){ if(await sendRow(row,payload)) sent++; }
    return sent;
  }
  async function sendToAll(payload){
    return sendToRows(db.prepare(`SELECT * FROM push_subscriptions ORDER BY id`).all(),payload);
  }
  function wasSent(key){return Boolean(db.prepare(`SELECT alert_key FROM push_dispatch_log WHERE alert_key=?`).get(key));}
  function markSent(key,count){db.prepare(`INSERT OR REPLACE INTO push_dispatch_log(alert_key,sent_at,sent_count) VALUES(?,CURRENT_TIMESTAMP,?)`).run(key,count);}

  function localParts(dateValue=new Date()){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(dateValue);
    const x=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return {date:`${x.year}-${x.month}-${x.day}`,hour:Number(x.hour||0),minute:Number(x.minute||0)};
  }
  function daysUntil(isoDate,today){
    if(!isoDate) return null;
    const a=Date.parse(`${isoDate}T00:00:00Z`), b=Date.parse(`${today}T00:00:00Z`);
    return Number.isFinite(a)&&Number.isFinite(b)?Math.round((a-b)/86400000):null;
  }
  function dateMinus(dateString,days){
    const d=new Date(`${dateString}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate()-days);
    return d.toISOString().slice(0,10);
  }
  function fmt(value){return Number(value||0).toLocaleString('en-US',{maximumFractionDigits:1});}

  function buildMorningSummary(date){
    const latest=db.prepare(`SELECT id,report_date,total_waste_tons,total_trucks,total_diesel FROM daily_reports WHERE report_date<? ORDER BY report_date DESC,id DESC LIMIT 1`).get(date)
      || db.prepare(`SELECT id,report_date,total_waste_tons,total_trucks,total_diesel FROM daily_reports ORDER BY report_date DESC,id DESC LIMIT 1`).get();
    if(!latest) return {body:'لا توجد تقارير تشغيلية محفوظة حتى الآن.',href:'/'};
    const from=dateMinus(date,7);
    const week=db.prepare(`SELECT COALESCE(SUM(total_waste_tons),0) waste,COUNT(*) days FROM daily_reports WHERE report_date>=? AND report_date<?`).get(from,date);
    const month=date.slice(0,7);
    const monthly=db.prepare(`SELECT COALESCE(SUM(total_waste_tons),0) waste,COUNT(*) days FROM daily_reports WHERE substr(report_date,1,7)=?`).get(month);
    const stopped=db.prepare(`SELECT COUNT(*) AS c FROM equipment WHERE report_id=? AND trim(operating_status)<>'' AND operating_status NOT IN ('يعمل','شغال','متاح','جيد','فعال')`).get(latest.id).c;
    const parts=[
      `آخر تقرير ${latest.report_date}: ${fmt(latest.total_waste_tons)} طن، ${fmt(latest.total_trucks)} شاحنة`,
      `آخر 7 أيام: ${fmt(week.waste)} طن`,
      `الشهر: ${fmt(monthly.waste)} طن`
    ];
    if(stopped) parts.push(`معدات تحتاج متابعة: ${stopped}`);
    return {body:parts.join(' | '),href:'/'};
  }

  async function dispatchOperationalAlerts(){
    const subs=db.prepare(`SELECT COUNT(*) AS c FROM push_subscriptions`).get().c;
    if(!subs) return;
    const {date}=localParts();

    const summaryKey=`morning-summary:${date}`;
    if(!wasSent(summaryKey)){
      const summary=buildMorningSummary(date);
      const count=await sendToAll({title:'الملخص التشغيلي الصباحي',body:summary.body,href:summary.href,tag:summaryKey});
      if(count) markSent(summaryKey,count);
    }

    const licenses=db.prepare(`SELECT name_ar,expiry_date FROM driver_licenses WHERE trim(expiry_date)<>'' ORDER BY expiry_date`).all();
    const expired=licenses.filter(x=>{const d=daysUntil(x.expiry_date,date);return d!==null&&d<0;});
    const soon=licenses.filter(x=>{const d=daysUntil(x.expiry_date,date);return d!==null&&d>=0&&d<=30;});
    if(expired.length){
      const key=`licenses-expired:${date}`;
      if(!wasSent(key)){
        const count=await sendToAll({title:'رخص منتهية',body:`${expired.length} رخصة منتهية تحتاج متابعة.`,href:'/drivers-licenses.html',tag:key});
        if(count) markSent(key,count);
      }
    }
    if(soon.length){
      const key=`licenses-soon:${date}`;
      if(!wasSent(key)){
        const count=await sendToAll({title:'رخص قريبة الانتهاء',body:`${soon.length} رخصة تنتهي خلال 30 يومًا.`,href:'/drivers-licenses.html',tag:key});
        if(count) markSent(key,count);
      }
    }

    db.prepare(`DELETE FROM push_dispatch_log WHERE sent_at < datetime('now','-45 days')`).run();
  }

  app.get('/api/push/public-key',requireAuth,(req,res)=>res.json({ok:true,publicKey:vapid.publicKey}));
  app.get('/api/push/status',requireAuth,(req,res)=>{
    const count=db.prepare(`SELECT COUNT(*) AS c FROM push_subscriptions WHERE user_id=?`).get(req.user.id).c;
    res.json({ok:true,subscribed:count>0,devices:count,schedule:'08:00',timeZone:'Asia/Jerusalem'});
  });
  app.post('/api/push/subscribe',requireAuth,(req,res)=>{
    const sub=safeSubscription(req.body);
    if(!sub) return res.status(400).json({ok:false,message:'بيانات اشتراك التنبيهات غير صالحة'});
    db.prepare(`INSERT INTO push_subscriptions(user_id,endpoint,subscription_json,user_agent,updated_at) VALUES(?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,subscription_json=excluded.subscription_json,user_agent=excluded.user_agent,updated_at=CURRENT_TIMESTAMP`)
      .run(req.user.id,sub.endpoint,JSON.stringify(sub),String(req.headers['user-agent']||'').slice(0,300));
    audit?.(req.user,'PUSH_SUBSCRIBE','push','', 'Web Push device subscribed');
    res.json({ok:true,message:'تم تفعيل التنبيهات على هذا الجهاز'});
  });
  app.delete('/api/push/subscribe',requireAuth,(req,res)=>{
    const endpoint=String(req.body?.endpoint||'').trim();
    if(endpoint) db.prepare(`DELETE FROM push_subscriptions WHERE user_id=? AND endpoint=?`).run(req.user.id,endpoint);
    audit?.(req.user,'PUSH_UNSUBSCRIBE','push','', 'Web Push device unsubscribed');
    res.json({ok:true});
  });
  app.post('/api/push/test',requireAuth,async(req,res)=>{
    const rows=db.prepare(`SELECT * FROM push_subscriptions WHERE user_id=?`).all(req.user.id);
    const sent=await sendToRows(rows,{title:'اختبار تنبيهات مكب المنيا',body:'التنبيهات تعمل بنجاح حتى عند إغلاق التطبيق.',href:'/',tag:`push-test-${Date.now()}`});
    res.json({ok:true,sent,message:sent?'تم إرسال الإشعار التجريبي':'لا يوجد جهاز مشترك بالتنبيهات'});
  });

  let running=false;
  async function scheduledRun(){
    if(running) return;
    running=true;
    try{await dispatchOperationalAlerts();}catch(error){console.error('Push alert check failed',error);}finally{running=false;scheduleNext();}
  }
  function millisecondsUntilNextEight(){
    const now=Date.now();
    for(let minutes=1;minutes<=26*60;minutes++){
      const candidate=new Date(now+minutes*60*1000);
      const p=localParts(candidate);
      if(p.hour===8 && p.minute===0) return Math.max(1000,candidate.getTime()-now);
    }
    return 24*60*60*1000;
  }
  let scheduleTimer=null;
  function scheduleNext(){
    if(scheduleTimer) clearTimeout(scheduleTimer);
    scheduleTimer=setTimeout(scheduledRun,millisecondsUntilNextEight());
    scheduleTimer.unref?.();
  }
  scheduleNext();

  return {dispatchOperationalAlerts};
};
