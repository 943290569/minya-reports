const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {sections}=require('../section-access');
class Element{
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.classList={add(){}};}
  append(...nodes){this.children.push(...nodes);}
  setAttribute(){}
  getAttribute(name){return this[name];}
  closest(){return null;}
  querySelectorAll(){return this.children.filter(c=>c.tag==='a');}
}
const source=fs.readFileSync('public/js/app-section-access.js','utf8');
const fn=source.slice(source.indexOf('  function addSectionLinks('),source.indexOf('  function apply('));
for(const mobile of [false,true]){
 const ctx={URL,location:{origin:'https://example.test',pathname:'/'},document:{createElement:tag=>new Element(tag)},access:{role:'viewer',sections,permissions:{equipment_management:{can_view:1},fleet:{can_view:0}}}};
 vm.createContext(ctx);vm.runInContext(fn+'\nthis.addLinks=addSectionLinks;',ctx);
 const menu=new Element('div');menu.id=mobile?'minyaHeaderMenu':'desktop';
 const center=new Element('a');center.href='/maintenance-center.html';menu.append(center);
 ctx.addLinks(menu);const count=menu.children.length;
 for(let i=0;i<50;i++)ctx.addLinks(menu);
 assert.equal(menu.children.length,count,'Repeated updates must not duplicate destinations');
 assert.equal(count,5);
 assert(menu.children.some(a=>a.href==='/equipment-maintenance-finance.html'));
 assert(menu.children.some(a=>a.href==='/maintenance-archive.html'));
 assert(!menu.children.some(a=>a.href==='/drivers-licenses.html'));
 ctx.access.permissions.fleet={can_view:1};ctx.addLinks(menu);
 assert(menu.children.some(a=>a.href==='/drivers-licenses.html'));
 assert.equal(new Set(menu.children.map(a=>a.href)).size,menu.children.length);
}
console.log('Section menu links passed: related maintenance destinations, denied fleet, granted fleet, repeat updates, mobile and desktop.');
