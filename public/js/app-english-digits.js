/* Force all displayed numerals to English 0-9 without changing Arabic text */
(function(){
  const arabicIndic = /[٠-٩]/g;
  const easternArabic = /[۰-۹]/g;

  function normalize(value){
    return String(value ?? "")
      .replace(arabicIndic, d => String(d.charCodeAt(0) - 0x0660))
      .replace(easternArabic, d => String(d.charCodeAt(0) - 0x06F0))
      .replace(/٫/g, ".")
      .replace(/٬/g, ",")
      .replace(/٪/g, "%");
  }

  function skip(node){
    const parent = node && node.parentElement;
    if(!parent) return true;
    return Boolean(parent.closest("script,style,textarea"));
  }

  function normalizeTextNode(node){
    if(!node || node.nodeType !== Node.TEXT_NODE || skip(node)) return;
    const next = normalize(node.nodeValue);
    if(next !== node.nodeValue) node.nodeValue = next;
  }

  function normalizeTree(root){
    if(!root) return;
    if(root.nodeType === Node.TEXT_NODE){
      normalizeTextNode(root);
      return;
    }
    if(root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while((node = walker.nextNode())) normalizeTextNode(node);
  }

  function start(){
    normalizeTree(document.body);

    const observer = new MutationObserver(mutations => {
      for(const mutation of mutations){
        if(mutation.type === "characterData") normalizeTextNode(mutation.target);
        for(const added of mutation.addedNodes) normalizeTree(added);
      }
    });

    observer.observe(document.body, {
      subtree:true,
      childList:true,
      characterData:true
    });
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();
