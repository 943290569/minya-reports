const fs=require('fs');
const vm=require('vm');
const assert=require('assert/strict');
const source=fs.readFileSync('public/review-improvements.js','utf8');
let mutations=0;
class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.parentElement=null;this.className='';this.textContent='';this.style={setProperty(){}};this.classList={contains:name=>this.className.split(' ').includes(name)};}
  append(...nodes){for(const n of nodes){if(n.parentElement)n.parentElement.children.splice(n.parentElement.children.indexOf(n),1);this.children.push(n);n.parentElement=this;mutations++;}}
  remove(){if(this.parentElement){this.parentElement.children.splice(this.parentElement.children.indexOf(this),1);this.parentElement=null;mutations++;}}
  querySelectorAll(selector){const out=[];for(const c of this.children){if(selector==='a[href]'&&c.tagName==='a'&&c.href||selector==='.review-nav-group'&&c.className==='review-nav-group'||selector==='strong'&&c.tagName==='strong')out.push(c);out.push(...c.querySelectorAll(selector));}return out;}
  querySelector(s){return this.querySelectorAll(s)[0]||null;}
}
const extracted=source.slice(source.indexOf('  const groups='),source.indexOf('  function fold('));
const context={URL,location:{origin:'https://example.test'},document:{createElement:tag=>new Element(tag)}};
vm.createContext(context);vm.runInContext(extracted+'\nthis.groupMenu=groupMenu;',context);
function link(path){const a=new Element('a');a.href='https://example.test'+path;return a;}
for(const mobile of [false,true]){
  const menu=new Element('div');menu.className=mobile?'minya-header-menu':'minya-desktop-more-panel';menu.parentElement={getBoundingClientRect:()=>({bottom:100})};
  const known=link('/fleet'),maintenance=link('/maintenance-center.html'),unknown=link('/future-module');
  menu.append(known,maintenance,unknown);context.groupMenu(menu);
  assert.equal(maintenance.parentElement.className,'review-nav-group');
  const parent=known.parentElement;const before=mutations;
  for(let i=0;i<100;i++)context.groupMenu(menu);
  assert.equal(mutations,before,'Repeated observer passes must not rebuild any menu nodes');
  assert.equal(known.parentElement,parent);assert.equal(unknown.parentElement,menu);
  const late=link('/environment');menu.append(late);context.groupMenu(menu);
  assert.equal(late.parentElement,parent,'Late links must reuse the group');
  assert.equal(known.parentElement,parent);assert.equal(menu.querySelectorAll('a[href]').length,4);
}
console.log('Menu grouping passed: maintenance, stable observer updates, unknown routes, late links, mobile and desktop.');
