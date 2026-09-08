module.exports=function installReportTotalsGuard(app){
  if(!app || app.locals?.minyaReportTotalsGuardInstalled)return;
  app.locals.minyaReportTotalsGuardInstalled=true;

  const number=value=>{
    const n=Number(value ?? 0);
    return Number.isFinite(n)?n:NaN;
  };
  const same=(a,b,tolerance=0.05)=>Math.abs(Number(a)-Number(b))<=tolerance;
  const round2=value=>Math.round((Number(value)||0)*100)/100;

  function canonicalTotals(body={}){
    const operations=Array.isArray(body.operations)?body.operations:[];
    const stations=Array.isArray(body.stations)?body.stations:[];
    const equipment=Array.isArray(body.equipment)?body.equipment:[];

    let landfillTrucks=0,landfillWaste=0,stationTrucks=0,stationWaste=0,totalDiesel=0;

    for(const row of operations){
      const name=String(row?.operation_name||'').trim();
      if(name!=='مكب نفايات المنيا')continue;
      const vehicles=number(row?.vehicle_count),quantity=number(row?.quantity);
      if(!Number.isFinite(vehicles)||vehicles<0||!Number.isFinite(quantity)||quantity<0)return {error:'بيانات عملية مكب نفايات المنيا تحتوي قيمة رقمية غير صالحة'};
      landfillTrucks+=vehicles;
      landfillWaste+=quantity;
    }
    for(const row of stations){
      const trucks=number(row?.truck_count),waste=number(row?.waste_tons);
      if(!Number.isFinite(trucks)||trucks<0||!Number.isFinite(waste)||waste<0)return {error:'بيانات محطات الترحيل تحتوي قيمة رقمية غير صالحة'};
      stationTrucks+=trucks;
      stationWaste+=waste;
    }
    for(const row of equipment){
      const diesel=number(row?.diesel_liters);
      if(!Number.isFinite(diesel)||diesel<0)return {error:'بيانات سولار المعدات تحتوي قيمة رقمية غير صالحة'};
      totalDiesel+=diesel;
    }

    const totalTrucks=landfillTrucks+stationTrucks;
    if(!Number.isInteger(totalTrucks))return {error:'إجمالي الشاحنات المحسوب من التفاصيل يجب أن يكون عددًا صحيحًا'};
    return {
      totals:{
        total_trucks:totalTrucks,
        total_waste_tons:round2(landfillWaste+stationWaste),
        total_diesel:round2(totalDiesel)
      }
    };
  }

  function validateAndNormalize(req,res,next){
    const isCreate=req.method==='POST'&&req.path==='/api/reports';
    const isUpdate=req.method==='PUT'&&/^\/api\/reports\/\d+$/.test(req.path);
    if(!isCreate&&!isUpdate)return next();

    const body=req.body&&typeof req.body==='object'?req.body:{};
    const result=canonicalTotals(body);
    if(result.error)return res.status(400).json({ok:false,message:result.error});
    const expected=result.totals;
    const supplied={
      total_trucks:body.total_trucks,
      total_waste_tons:body.total_waste_tons,
      total_diesel:body.total_diesel
    };

    const mismatches=[];
    if(supplied.total_trucks!==undefined&&supplied.total_trucks!==null&&supplied.total_trucks!==''&&!same(number(supplied.total_trucks),expected.total_trucks,0.001))mismatches.push(`الشاحنات: المرسل ${supplied.total_trucks} / المحسوب ${expected.total_trucks}`);
    if(supplied.total_waste_tons!==undefined&&supplied.total_waste_tons!==null&&supplied.total_waste_tons!==''&&!same(number(supplied.total_waste_tons),expected.total_waste_tons))mismatches.push(`النفايات: المرسل ${supplied.total_waste_tons} / المحسوب ${expected.total_waste_tons}`);
    if(supplied.total_diesel!==undefined&&supplied.total_diesel!==null&&supplied.total_diesel!==''&&!same(number(supplied.total_diesel),expected.total_diesel))mismatches.push(`السولار: المرسل ${supplied.total_diesel} / المحسوب ${expected.total_diesel}`);

    if(mismatches.length)return res.status(400).json({
      ok:false,
      message:'تم رفض حفظ التقرير لأن المجاميع لا تطابق التفاصيل المعتمدة.',
      mismatches,
      expected_totals:expected
    });

    req.body={...body,...expected};
    next();
  }

  app.use(validateAndNormalize);
};
