/* Prevent Drive preview helper observers from reacting to their own nested DOM updates. */
(function(){
  const NativeMutationObserver=window.MutationObserver;
  if(!NativeMutationObserver||window.__MINYA_DRIVE_OBSERVER_STABILIZED__)return;
  window.__MINYA_DRIVE_OBSERVER_STABILIZED__=true;

  window.MutationObserver=class MinyaStableMutationObserver extends NativeMutationObserver{
    observe(target,options){
      let safeOptions=options;
      if(target?.id==='previewReports'&&options?.subtree){
        safeOptions={...options,subtree:false,childList:true};
      }
      return super.observe(target,safeOptions);
    }
  };
})();
