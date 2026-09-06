/* Source reader compatibility shim.
 * The canonical V33 Pivot adapter owns landfill, stations and Aziz normalization.
 * This compatibility layer stays intentionally lightweight so no delayed renderer
 * can rewrite preview values after the canonical parser finishes.
 */
(function(){
  const badge=document.querySelector('#sourceFilesPanel .drive-readonly');
  if(badge) badge.textContent='معاينة مستقرة V33';
})();