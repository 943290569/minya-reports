/* Source reader compatibility shim.
 * V30 is now the canonical landfill Pivot reader for both flat and hierarchical files.
 * The former V31 overlay was disabled because it duplicated parsing and rewrote preview values on delayed timers.
 */
(function(){
  const badge=document.querySelector('#sourceFilesPanel .drive-readonly');
  if(badge) badge.textContent='معاينة مستقرة V30';
})();
