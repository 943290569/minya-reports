/* Prevent Excel dates in PALESTINE quantities workbook from shifting one day because of JS timezone conversion. */
(function(){
  function armNumericDateRead(){
    if(!window.XLSX||typeof XLSX.read!=='function')return;
    const original=XLSX.read;
    XLSX.read=function(data,options){
      XLSX.read=original;
      return original.call(this,data,{...(options||{}),cellDates:false});
    };
  }
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#analyzeQuantitiesBtn'))armNumericDateRead();
  },true);
})();
