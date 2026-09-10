/* PALESTINE quantities preview polish: hide spray column and add totals row. */
(function(){
  const num=v=>{const m=String(v??'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0;};
  const fmt=v=>Number(v||0).toLocaleString('en-US',{maximumFractionDigits:2});

  function splitPair(text){
    const parts=String(text||'').split('/');
    return {count:num(parts[0]),qty:num(parts[1])};
  }

  function apply(){
    const table=document.querySelector('#sourceFilesPreview table.quantities-import-table');
    if(!table)return;

    const header=table.tHead?.rows?.[0];
    if(!header)return;

    const sprayIndex=[...header.cells].findIndex(th=>/رش\s*المياه/.test(th.textContent||''));
    if(sprayIndex>=0){
      header.deleteCell(sprayIndex);
      [...table.tBodies[0]?.rows||[]].forEach(r=>{if(r.cells[sprayIndex])r.deleteCell(sprayIndex);});
      if(table.tFoot){[...table.tFoot.rows].forEach(r=>{if(r.cells[sprayIndex])r.deleteCell(sprayIndex);});}
    }

    const bodyRows=[...table.tBodies[0]?.rows||[]].filter(r=>!r.dataset.quantitiesTotal);
    if(!bodyRows.length)return;

    const totals={landfillCount:0,landfillQty:0,tarq:{count:0,qty:0},yata:{count:0,qty:0},heb:{count:0,qty:0},leach:{count:0,qty:0},ext:{count:0,qty:0},int:{count:0,qty:0},style:{count:0,qty:0},sort:{count:0,qty:0}};
    for(const r of bodyRows){
      const c=r.cells;
      totals.landfillCount+=num(c[1]?.textContent);
      totals.landfillQty+=num(c[2]?.textContent);
      const keys=['tarq','yata','heb','leach','ext','int','style','sort'];
      keys.forEach((k,i)=>{const p=splitPair(c[3+i]?.textContent);totals[k].count+=p.count;totals[k].qty+=p.qty;});
    }

    let foot=table.tFoot;
    if(!foot)foot=table.createTFoot();
    foot.innerHTML='';
    const tr=foot.insertRow();tr.dataset.quantitiesTotal='1';
    const vals=[
      '<strong>المجموع</strong>',
      `<strong>${fmt(totals.landfillCount)}</strong>`,
      `<strong>${fmt(totals.landfillQty)}</strong>`,
      `<strong>${fmt(totals.tarq.count)} / ${fmt(totals.tarq.qty)}</strong>`,
      `<strong>${fmt(totals.yata.count)} / ${fmt(totals.yata.qty)}</strong>`,
      `<strong>${fmt(totals.heb.count)} / ${fmt(totals.heb.qty)}</strong>`,
      `<strong>${fmt(totals.leach.count)} / ${fmt(totals.leach.qty)}</strong>`,
      `<strong>${fmt(totals.ext.count)} / ${fmt(totals.ext.qty)}</strong>`,
      `<strong>${fmt(totals.int.count)} / ${fmt(totals.int.qty)}</strong>`,
      `<strong>${fmt(totals.style.count)} / ${fmt(totals.style.qty)}</strong>`,
      `<strong>${fmt(totals.sort.count)} / ${fmt(totals.sort.qty)}</strong>`
    ];
    vals.forEach(v=>{const td=tr.insertCell();td.innerHTML=v;});
  }

  const root=document.getElementById('sourceFilesPreview');
  if(root)new MutationObserver(()=>setTimeout(apply,0)).observe(root,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0),{once:true});
})();
