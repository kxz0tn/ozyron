// terminal-styled ui: one list component for every menu (main, pause, settings, results), hud helpers, touch controls
import {audio} from './audio.js';
import {input} from './input.js';
const root=document.createElement('div');root.id='ui';document.body.appendChild(root);
root.innerHTML=`<div id="hud"></div><div id="touch"><div class="zone"><span>drag</span></div><button class="act ui-hit">fire</button><button class="cbtn pz ui-hit">ii</button></div><div id="corner" class="keep"><button class="cbtn ui-hit" data-c="mute">sound</button><button class="cbtn ui-hit" data-c="menu">menu</button></div>`;
const flashv=document.createElement('div');flashv.id='flashv';document.body.appendChild(flashv);
const fade=document.createElement('div');fade.id='fade';document.body.appendChild(fade);
const hud=root.querySelector('#hud'),touch=root.querySelector('#touch'),act=touch.querySelector('.act');
const stack=[];
function rowHTML(it){const v=it.kind==='info'?`<span class="val">${it.value??''}</span>`:valHTML(it);return `<span class="cur">&gt;</span><span class="lb">${it.label}${it.k?`<span class="k">${it.k}</span>`:''}</span>${v}`;}
function valHTML(it){const g=it.get?it.get():undefined;
  if(it.kind==='slider'){const f=(g-it.min)/(it.max-it.min);return `<span class="val"><span class="ar">&lt;</span><span class="bar"><i style="width:${(f*100).toFixed(1)}%"></i></span><span style="min-width:3.6em;text-align:right">${it.fmt?it.fmt(g):g}</span><span class="ar">&gt;</span></span>`;}
  if(it.kind==='toggle')return `<span class="val"><span class="ar">&lt;</span>${g?'on':'off'}<span class="ar">&gt;</span></span>`;
  if(it.kind==='choice')return `<span class="val"><span class="ar">&lt;</span>${it.fmt?it.fmt(g):g}<span class="ar">&gt;</span></span>`;
  if(it.kind==='key')return `<span class="val">${it.waiting?'press key':g}</span>`;
  return '';}
class List{constructor(o){this.o=o;this.sel=0;const el=this.el=document.createElement('div');el.className='pnl ui-hit'+(o.center?' center':'');if(o.id)el.id=o.id;
    el.innerHTML=`${o.title?`<div class="ttl">${o.title}</div>`:''}${o.sub?`<div class="sub">${o.sub}</div>`:''}<div class="rule"></div><div class="items scroll"></div>${o.hint?`<div class="hint">${o.hint}</div>`:''}`;
    root.appendChild(el);this.render();this.sel=this.firstSel(0,1);this.mark();requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('on')));}
  items(){return typeof this.o.items==='function'?this.o.items():this.o.items;}
  render(){const box=this.el.querySelector('.items');box.innerHTML='';this.items().forEach((it,i)=>{const r=document.createElement('div');r.className='row'+(it.kind==='info'?' info':'')+(it.kind==='hdr'?' hdr':'');r.innerHTML=it.kind==='hdr'?it.label:rowHTML(it);
      r.onpointerenter=e=>{if(e.pointerType==='mouse'&&this.selectable(it)){this.sel=i;this.mark();}};
      r.onclick=e=>{if(!this.selectable(it))return;this.sel=i;this.mark();const ar=e.target.closest('.ar');if(ar&&(it.kind==='slider'||it.kind==='choice'||it.kind==='toggle'))this.adj(ar.textContent==='<'?-1:1);else this.activate();};
      box.appendChild(r);});this.mark();}
  selectable(it){return it&&it.kind!=='info'&&it.kind!=='hdr';}
  firstSel(from,d){const its=this.items();for(let k=0;k<its.length;k++){const i=((from+d*k)%its.length+its.length)%its.length;if(this.selectable(its[i]))return i;}return 0;}
  mark(){[...this.el.querySelectorAll('.row')].forEach((r,i)=>r.classList.toggle('sel',i===this.sel));const r=this.el.querySelectorAll('.row')[this.sel];if(r&&r.scrollIntoView)r.scrollIntoView({block:'nearest'});}
  move(d){const n=this.firstSel(this.sel+d,d);if(n!==this.sel){this.sel=n;this.mark();audio.sfx('move');}}
  adj(d){const it=this.items()[this.sel];if(!it)return;
    if(it.kind==='slider'){it.set(Math.min(it.max,Math.max(it.min,+(it.get()+d*it.step).toFixed(4))));}
    else if(it.kind==='toggle')it.set(!it.get());
    else if(it.kind==='choice'){const o=it.options,i=o.indexOf(it.get());it.set(o[(i+d+o.length)%o.length]);}
    else return;audio.sfx('tick');this.refresh();}
  activate(){const it=this.items()[this.sel];if(!it)return;
    if(it.kind==='toggle'||it.kind==='choice'){this.adj(1);return;}
    if(it.kind==='key'){it.waiting=true;this.refresh();input.capture(code=>{it.waiting=false;if(code!=='Escape')it.set(code);audio.sfx('select');this.refresh();});return;}
    if(it.on){audio.sfx('select');it.on();}}
  refresh(){const rows=this.el.querySelectorAll('.row');this.items().forEach((it,i)=>{if(rows[i]&&it.kind!=='hdr')rows[i].innerHTML=rowHTML(it);});this.mark();}
  nav(ev){if(ev.type==='up')this.move(-1);else if(ev.type==='down')this.move(1);else if(ev.type==='left')this.adj(-1);else if(ev.type==='right')this.adj(1);
    else if(ev.type==='action')this.activate();else if(ev.type==='back'||ev.type==='pause'){if(this.o.onBack){audio.sfx('back');this.o.onBack();}}}
  close(){this.el.classList.remove('on');setTimeout(()=>this.el.remove(),350);}}
export const ui={root,hud,
  open(o){const l=new List(o);stack.push(l);return l;},
  close(l){const i=stack.indexOf(l);if(i>=0)stack.splice(i,1);l.close();},
  closeAll(){while(stack.length)stack.pop().close();},
  top(){return stack[stack.length-1];},
  // returns true if the event was consumed by an open list
  route(ev){const t=this.top();if(!t)return false;if(['up','down','left','right','action','back','pause'].includes(ev.type)){t.nav(ev);return true;}return false;},
  hudSet(html){hud.innerHTML=html;hud.classList.add('on');},
  hudClear(){hud.classList.remove('on');setTimeout(()=>{if(!hud.classList.contains('on'))hud.innerHTML='';},400);},
  touch(on,label='fire'){touch.classList.toggle('on',on&&matchMedia('(pointer:coarse)').matches);act.textContent=label;input.setZones(on);root.querySelector('#corner').classList.toggle('ingame',on);},
  flash(){flashv.classList.remove('go');void flashv.offsetWidth;flashv.classList.add('go');},
  async fadeThrough(fn){fade.classList.add('on');await new Promise(r=>setTimeout(r,360));await fn();await new Promise(r=>setTimeout(r,60));fade.classList.remove('on');},
  hidden(h){root.classList.toggle('hidden',h);},
  pop(el,txt){if(!el)return;el.textContent=txt;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');},
  onCorner:null,
};
act.addEventListener('pointerdown',e=>{e.preventDefault();act.classList.add('dn');input.push('action',e.timeStamp,'touch');input.buzz(12);});
['pointerup','pointercancel','pointerleave'].forEach(t=>act.addEventListener(t,()=>act.classList.remove('dn')));
touch.querySelector('.pz').addEventListener('pointerdown',e=>{e.preventDefault();input.push('pause',e.timeStamp,'touch');});
root.querySelector('#corner').addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b&&ui.onCorner)ui.onCorner(b.dataset.c);});
