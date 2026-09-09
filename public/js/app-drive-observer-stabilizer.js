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

  function installMobileApprovalBarFix(){
    if(document.getElementById('minyaDriveMobileApprovalStyle')) return;
    const style=document.createElement('style');
    style.id='minyaDriveMobileApprovalStyle';
    style.textContent=`
      @media screen and (max-width: 760px) {
        .drive-import-page {
          padding-bottom: calc(150px + env(safe-area-inset-bottom, 0px)) !important;
        }
        #previewPanel:not(.hidden) .drive-approval-bar {
          position: fixed !important;
          left: 10px !important;
          right: 10px !important;
          bottom: calc(10px + env(safe-area-inset-bottom, 0px)) !important;
          z-index: 2000 !important;
          margin: 0 !important;
          padding: 10px !important;
          display: grid !important;
          grid-template-columns: 1fr 1.45fr !important;
          gap: 8px !important;
          background: rgba(255,255,255,.97) !important;
          border: 1px solid #d9e4df !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 30px rgba(16,24,40,.18) !important;
          backdrop-filter: blur(9px) !important;
          -webkit-backdrop-filter: blur(9px) !important;
        }
        #previewPanel:not(.hidden) .drive-approval-bar button {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 44px !important;
          margin: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',installMobileApprovalBarFix,{once:true});
  }else{
    installMobileApprovalBarFix();
  }
})();
