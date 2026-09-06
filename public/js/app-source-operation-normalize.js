/* Normalize imported operation names before source-import report writes. Preserve source units. */
(function(){
  const nativeFetch = window.fetch.bind(window);
  const canonical = (name) => {
    const value = String(name || '').replace(/\s+/g,' ').trim();
    const aliases = new Map([
      ['مواد التغطية ( طمم)','مواد التغطية (طمم)'],
      ['كميات المياه','كميات المياه للتعقيم والترطيب'],
      ['كميات العصارة','كميات العصارة المرحلة'],
      ['( طمم) خارجي','طمم خارجي'],
      ['(طمم) خارجي','طمم خارجي']
    ]);
    return aliases.get(value) || value;
  };

  window.fetch = async function(input, init){
    try {
      const url = typeof input === 'string' ? input : String(input?.url || '');
      const method = String(init?.method || (typeof input !== 'string' ? input?.method : '') || 'GET').toUpperCase();
      const isReportWrite = /\/api\/reports(?:\/\d+)?(?:\?.*)?$/.test(url) && (method === 'POST' || method === 'PUT');
      if (isReportWrite && typeof init?.body === 'string') {
        const body = JSON.parse(init.body);
        if (Array.isArray(body?.operations)) {
          body.operations = body.operations.map(item => ({...item, operation_name: canonical(item.operation_name)}));
          init = {...init, body: JSON.stringify(body)};
        }
      }
    } catch (error) {
      console.warn('تعذر توحيد أسماء عمليات الاستيراد', error);
    }
    return nativeFetch(input, init);
  };
})();
