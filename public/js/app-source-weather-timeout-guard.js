/* Prevent source-file analysis from appearing frozen while weather enrichment is slow. */
(function(){
  if(window.__MINYA_SOURCE_WEATHER_TIMEOUT_GUARD__) return;
  window.__MINYA_SOURCE_WEATHER_TIMEOUT_GUARD__=true;

  const nativeFetch=window.fetch.bind(window);
  const MAX_WEATHER_MS=2500;
  const MAX_RANGE_DAYS=62;

  function isWeatherUrl(url){
    const s=String(url||'');
    return /open-meteo\.com\//i.test(s) && /start_date=|hourly=/i.test(s);
  }

  function rangeDays(url){
    try{
      const u=new URL(String(url),location.href);
      const a=u.searchParams.get('start_date');
      const b=u.searchParams.get('end_date');
      if(!a||!b) return 0;
      const ms=new Date(b+'T00:00:00Z')-new Date(a+'T00:00:00Z');
      return Number.isFinite(ms)?Math.floor(ms/86400000)+1:0;
    }catch(_){ return 0; }
  }

  window.fetch=function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(!isWeatherUrl(url)) return nativeFetch(input,init);

    const span=rangeDays(url);
    if(span>MAX_RANGE_DAYS){
      return Promise.reject(new Error('weather_range_too_large'));
    }

    const own=new AbortController();
    const originalSignal=init&&init.signal;
    let originalAbort=null;
    if(originalSignal){
      if(originalSignal.aborted) own.abort();
      else {
        originalAbort=()=>own.abort();
        originalSignal.addEventListener('abort',originalAbort,{once:true});
      }
    }
    const timer=setTimeout(()=>own.abort(),MAX_WEATHER_MS);
    const next={...(init||{}),signal:own.signal};
    return nativeFetch(input,next).finally(()=>{
      clearTimeout(timer);
      if(originalSignal&&originalAbort) originalSignal.removeEventListener('abort',originalAbort);
    });
  };
})();
