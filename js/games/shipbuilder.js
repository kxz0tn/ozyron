import * as THREE from 'three';
import {register} from '../core/registry.js';
import {audio} from '../core/audio.js';
import {input} from '../core/input.js';
import {settings,saveSettings} from '../core/settings.js';
import {beatClock,heard,grade,WIN} from '../core/rhythm.js';
import {pointCloud} from '../particles.js';
import {rng} from '../util.js';
// SHIPYARD: parts ride the line on the beat. fire when the next part in build order sits in the frame, let wrong parts pass, then launch on the downbeat.
const CLASSES=[
  {name:'scout',parts:['hull','engines','core'],bpm:100,dens:0.25},
  {name:'courier',parts:['hull','engines','core','shield'],bpm:106,dens:0.35},
  {name:'frigate',parts:['hull','wings','engines','core','shield'],bpm:112,dens:0.45},
  {name:'cruiser',parts:['hull','wings','engines','fins','core','shield'],bpm:118,dens:0.55},
  {name:'ark',parts:['hull','wings','engines','fins','core','bridge','shield'],bpm:124,dens:0.65},
];
const TRAINER={name:'trainer',parts:['hull','engines'],bpm:92,dens:0};
const BEST='ozyron.best.shipyard',UNL='ozyron.yard.unlocked',SLOT=18,WELD_X=12,BELT_Z=66,BELT_Y=7,AHEAD=7,RUN=5,MAXF=6;
const ALL=['hull','wings','engines','fins','core','bridge','shield','scrap'];
const V={};
function label(txt){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.font='500 34px ui-monospace,Menlo,Consolas,monospace';x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.fillText(txt,128,34);x.fillRect(48,58,160,2);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));s.scale.set(22,5.5,1);return s;}
function mats(){if(V.m)return V.m;return V.m={metal:new THREE.MeshStandardMaterial({color:0xc6c6c6,metalness:0.35,roughness:0.4,emissive:0x262626}),
  dark:new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:0.8,roughness:0.4}),white:new THREE.MeshBasicMaterial({color:0xffffff}),
  glow:new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false}),
  shell:new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.12,blending:THREE.AdditiveBlending,depthWrite:false,wireframe:true})};}
// installed part geometry, ship frame: nose +x, length ~110
function part(type){const M=mats(),g=new THREE.Group();
  if(type==='hull'){const prof=[];for(let i=0;i<=20;i++){const u=i/20;prof.push(new THREE.Vector2(Math.sin(u*Math.PI)**0.6*9*(1-u*0.35)+0.3,u*110-55));}
    const h=new THREE.Mesh(new THREE.LatheGeometry(prof,28),M.metal);h.rotation.z=-Math.PI/2;g.add(h);
    for(let k=0;k<6;k++){const a=k/6*Math.PI*2,s=new THREE.Mesh(new THREE.BoxGeometry(70,0.25,0.25),M.white);s.position.set(-6,Math.cos(a)*8.3,Math.sin(a)*8.3);g.add(s);}}
  else if(type==='engines'){[-1,1].forEach(k=>{const e=new THREE.Mesh(new THREE.CylinderGeometry(3.4,4.2,24,20),M.metal);e.rotation.z=Math.PI/2;e.position.set(-44,0,k*12);g.add(e);
    const r=new THREE.Mesh(new THREE.TorusGeometry(4.2,0.5,6,24),M.white);r.rotation.y=Math.PI/2;r.position.set(-56,0,k*12);g.add(r);
    const gl=new THREE.Mesh(new THREE.CircleGeometry(3.2,20),M.glow);gl.rotation.y=-Math.PI/2;gl.position.set(-56.2,0,k*12);g.add(gl);
    const py=new THREE.Mesh(new THREE.BoxGeometry(10,1.2,9),M.dark);py.position.set(-42,0,k*6.5);g.add(py);});}
  else if(type==='core'){const t=new THREE.Mesh(new THREE.TorusGeometry(11.5,1.6,10,40),M.metal);t.rotation.y=Math.PI/2;t.position.x=-6;g.add(t);
    const r=new THREE.Mesh(new THREE.TorusGeometry(11.5,0.5,6,40),M.glow);r.rotation.y=Math.PI/2;r.position.x=-3.6;g.add(r);r.userData.spin=1;
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2,b=new THREE.Mesh(new THREE.BoxGeometry(3,1.2,1.2),M.white);b.position.set(-6,Math.cos(a)*11.5,Math.sin(a)*11.5);g.add(b);}}
  else if(type==='wings'){const ws=new THREE.Shape();ws.moveTo(20,0);ws.bezierCurveTo(6,8,-18,26,-34,40);ws.lineTo(-40,38);ws.bezierCurveTo(-36,22,-34,10,-30,0);ws.lineTo(20,0);
    const wg=new THREE.ExtrudeGeometry(ws,{depth:0.6,bevelEnabled:true,bevelThickness:0.8,bevelSize:0.7,bevelSegments:2,curveSegments:16});wg.rotateX(Math.PI/2);
    [-1,1].forEach(k=>{const w=new THREE.Mesh(wg,M.metal);w.scale.z=k;w.position.set(-4,-1,0);g.add(w);const e=new THREE.Mesh(new THREE.BoxGeometry(30,0.4,0.4),M.white);e.position.set(-24,-0.4,k*30);e.rotation.y=-k*0.85;g.add(e);});}
  else if(type==='fins'){const f=new THREE.Mesh(new THREE.BoxGeometry(26,15,0.8),M.metal);f.position.set(-32,12,0);f.rotation.z=-0.32;g.add(f);
    const f2=f.clone();f2.position.y=-12;f2.rotation.z=0.32;g.add(f2);const l=new THREE.Mesh(new THREE.BoxGeometry(22,0.4,1),M.white);l.position.set(-35,19,0);l.rotation.z=-0.32;g.add(l);}
  else if(type==='bridge'){const c=new THREE.Mesh(new THREE.SphereGeometry(4,16,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0xe6e6e6}));c.scale.set(2.4,0.9,1.1);c.position.set(30,6.5,0);g.add(c);
    const tw=new THREE.Mesh(new THREE.BoxGeometry(12,6,5),M.metal);tw.position.set(8,10,0);g.add(tw);const an=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,10,4),M.white);an.position.set(6,17,0);g.add(an);}
  else if(type==='shield'){const s=new THREE.Mesh(new THREE.IcosahedronGeometry(1,2),M.shell);s.scale.set(64,18,26);s.position.x=-4;g.add(s);s.userData.shell=1;
    [-1,1].forEach(k=>{const e=new THREE.Mesh(new THREE.CylinderGeometry(0.6,1.4,7,8),M.metal);e.position.set(14,k*8,0);e.rotation.z=k>0?0:Math.PI;g.add(e);const tp=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),M.white);tp.position.set(14,k*11.5,0);g.add(tp);});}
  else {const b=new THREE.Mesh(new THREE.BoxGeometry(14,6,10),M.dark);b.rotation.set(0.3,0.5,0.2);g.add(b);const b2=new THREE.Mesh(new THREE.BoxGeometry(8,4,7),M.metal);b2.position.set(3,3,2);b2.rotation.set(-0.4,0.2,0.6);g.add(b2);
    const x=new THREE.Mesh(new THREE.BoxGeometry(16,0.6,0.6),M.white);x.rotation.y=0.8;x.position.y=3.2;g.add(x);const x2=x.clone();x2.rotation.y=-0.8;g.add(x2);}
  return g;}
// line item: crate on a carrier with the part inside, scaled to fit
function item(type){const M=mats(),g=new THREE.Group();const car=new THREE.Mesh(new THREE.BoxGeometry(15,1.4,14),M.dark);g.add(car);
  const edge=new THREE.Mesh(new THREE.BoxGeometry(15.4,0.3,0.4),M.white);edge.position.set(0,0.8,7);g.add(edge);
  const p=part(type);const box=new THREE.Box3().setFromObject(p),s=new THREE.Vector3();box.getSize(s);const k=11/Math.max(s.x,s.y,s.z);p.scale.setScalar(k);
  const c=new THREE.Vector3();box.getCenter(c);p.position.set(-c.x*k,0.8-box.min.y*k,-c.z*k);g.add(p);
  const l=label(type);l.position.y=17;g.add(l);g.userData.label=l;return g;}
function buildYard(app){if(V.root)return;const yg=app.yard.group;const M=mats();const root=V.root=new THREE.Group();root.visible=false;yg.add(root);
  // conveyor
  const belt=new THREE.Mesh(new THREE.BoxGeometry(300,2,18),M.dark);belt.position.set(20,BELT_Y-1.4,BELT_Z);root.add(belt);
  V.rollers=[];for(let x=-130;x<=170;x+=SLOT){const r=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.4,18.6),M.white);r.position.set(x,BELT_Y-0.2,BELT_Z);root.add(r);V.rollers.push(r);}
  [-9.5,9.5].forEach(dz=>{const s=new THREE.Mesh(new THREE.BoxGeometry(300,1.2,0.8),M.metal);s.position.set(20,BELT_Y,BELT_Z+dz);root.add(s);});
  for(let x=-120;x<=160;x+=40){const l=new THREE.Mesh(new THREE.BoxGeometry(2,BELT_Y-2,14),M.dark);l.position.set(x,(BELT_Y-2)/2,BELT_Z);root.add(l);}
  // weld frame: bright arch the player times against
  const fr=V.frame=new THREE.Group();fr.position.set(WELD_X,BELT_Y,BELT_Z);root.add(fr);
  const fm=V.frameM=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true});
  [[-SLOT/2,0],[SLOT/2,0]].forEach(([x])=>{[-11,11].forEach(z=>{const p=new THREE.Mesh(new THREE.BoxGeometry(0.9,26,0.9),fm);p.position.set(x,13,z);fr.add(p);});const t=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.9,23),fm);t.position.set(x,26,0);fr.add(t);});
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(SLOT,22),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.12,blending:THREE.AdditiveBlending,depthWrite:false}));fl.rotation.x=-Math.PI/2;fl.position.y=0.8;fr.add(fl);V.floor=fl;
  // launch platform beyond the pad
  const lp=new THREE.Group();lp.position.set(-185,0,0);root.add(lp);V.pad=lp;
  lp.add(new THREE.Mesh(new THREE.CylinderGeometry(46,50,5,48),M.dark).translateY(2.5));
  [36,44].forEach(r=>{const m=new THREE.Mesh(new THREE.TorusGeometry(r,0.5,4,96),M.white);m.rotation.x=Math.PI/2;m.position.y=5.3;lp.add(m);});
  V.padLights=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2,m=new THREE.Mesh(new THREE.BoxGeometry(3,0.8,1.2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true}));m.position.set(Math.cos(a)*40,5.6,Math.sin(a)*40);m.rotation.y=-a;lp.add(m);V.padLights.push(m);}
  // rails from cradle to pad
  [-10,10].forEach(z=>{const r=new THREE.Mesh(new THREE.BoxGeometry(200,1,1.2),M.white);r.position.set(-100,4.6,z);root.add(r);});
  V.ship=new THREE.Group();yg.add(V.ship);
  // exhaust: hot core + billow + smoke trail (world space)
  V.plumeG=new THREE.Group();app.scene.add(V.plumeG);
  V.core=pointCloud(1500,{});V.smoke=pointCloud(2200,{additive:false,soft:1.6});V.plumeG.add(V.smoke.pts,V.core.pts);
  V.tmp=new THREE.Vector3();V.items=[];
}
const M={id:'shipyard',label:'shipyard',order:30,touch:'fire',
  tag(){const b=+localStorage.getItem(BEST)||0;return b?'best '+b:'';},
  camLocal(kind){const a=this.app.camera.aspect,f=Math.max(1,1.1/a);const mk=(T,O,fov)=>[[T[0]+O[0]*f,Math.max(12,T[1]+O[1]*f),T[2]+O[2]*f],T,fov];
    if(kind==='launch')return mk([-185,48,0],[62,-22,82],54);
    return mk([2,16,36],[10,44,118],46);},
  camWorld(kind){const [p,t,f]=this.camLocal(kind),g=this.app.yard.group;g.updateMatrixWorld();const P=g.localToWorld(new THREE.Vector3(...p)),T=g.localToWorld(new THREE.Vector3(...t));return {pos:P.toArray(),target:T.toArray(),fov:f};},
  camera(app){this.app=app;const c=this.camWorld('build');return {...c,dur:2};},
  resize(app){const c=this.camWorld(this.camKind||'build');app.rig.lock(c.pos,c.target,c.fov);},
  enter(app){this.app=app;buildYard(app);V.root.visible=true;app.yard.ship.visible=false;V.occ=[];const skip=new Set([V.root,V.ship]);const walk=o=>{if(skip.has(o))return;if(o.isMesh&&!o.isInstancedMesh&&!(o.material&&o.material.transparent))V.occ.push(o);o.children.forEach(walk);};app.yard.group.children.forEach(walk);V.faded=new Map();V.ray=new THREE.Raycaster();V.occF=0;app.rig.set('locked');this.camKind='build';this.resize(app);app.ui.touch(true,'fire');this.hud();
    const unl=+localStorage.getItem(UNL)||0;
    if(!settings.tutorials.shipyard)this.startTutorial();
    else if(unl>0)this.selectClass(unl);else this.startRun(0);},
  selectClass(unl){const app=this.app;let pick=Math.min(unl,CLASSES.length-1);app.ui.touch(false);
    const l=app.ui.open({title:'shipyard',sub:'select class',items:[{kind:'choice',label:'class',options:CLASSES.slice(0,unl+1).map(c=>c.name),get:()=>CLASSES[pick].name,set:v=>pick=CLASSES.findIndex(c=>c.name===v)},
      {kind:'info',label:'tempo',value:''},{label:'start',on:()=>{app.ui.close(l);app.ui.touch(true,'fire');this.startRun(pick);}}],onBack:()=>{app.ui.close(l);app.stop();}});
    const upd=()=>{if(!l.el.isConnected)return;const r=l.el.querySelectorAll('.row')[1];if(r)r.querySelector('.val').textContent=CLASSES[pick].bpm+' bpm';requestAnimationFrame(upd);};upd();l.sel=2;l.mark();},
  hud(){const touch=matchMedia('(pointer:coarse)').matches;this.app.ui.hudSet(`
    <div class="hud-tl"><div class="lbl" id="sy-cls">shipyard</div><div class="big beat" id="sy-score">0</div><div class="lbl" id="sy-ship"></div></div>
    <div class="hud-tr"><div class="lbl">faults</div><div class="mid" id="sy-f" style="letter-spacing:.2em"></div><div class="lbl" style="margin-top:.6em" id="sy-best"></div></div>
    <div class="hud-c"><div class="wave" id="sy-banner"></div><div class="judge" id="sy-judge"></div><div class="combo" id="sy-combo"></div></div>
    <div class="hud-bc"><div class="mid" id="sy-build" style="letter-spacing:.08em;font-size:1em;margin-bottom:.5em"></div><div id="sy-beats" style="display:flex;gap:.5em;justify-content:center;margin-bottom:.6em"></div><div class="prompt" id="sy-prompt"></div>
      <div class="lbl" id="sy-skip" style="margin-top:.6em;display:none"><button class="cbtn ui-hit" id="sy-skipb">skip ${touch?'':'[tab]'}</button></div></div>`);
    this.el={};['cls','score','ship','f','best','banner','judge','combo','build','beats','prompt','skip'].forEach(k=>this.el[k]=document.getElementById('sy-'+k));
    this.el.beats.innerHTML='<i></i><i></i><i></i><i></i>';[...this.el.beats.children].forEach(i=>i.style.cssText='width:.8em;height:.8em;border:1px solid #fff;display:inline-block');
    document.getElementById('sy-skipb').onclick=()=>this.skipTutorial(this.app);
    this.onTab=e=>{if(e.code==='Tab'&&this.tut){e.preventDefault();this.skipTutorial(this.app);}};addEventListener('keydown',this.onTab);
    this.el.best.textContent='best '+(+localStorage.getItem(BEST)||0);},
  prompt(html){const p=this.el.prompt;if(!p)return;if(!html){p.classList.remove('on');return;}if(p._h!==html){p.innerHTML=html;p._h=html;}p.classList.add('on');},
  actHint(){const d=input.state.lastDevice;if(d==='touch')return '<span class="key">fire</span>';if(d==='pad')return '<span class="key">a</span>';return `<span class="key">${settings.keys.action[0].replace('Key','').toLowerCase()}</span>`;},
  banner(t){const b=this.el.banner;b.textContent=t;b.classList.remove('show');void b.offsetWidth;b.classList.add('show');},
  resetRun(){this.score=0;this.combo=0;this.maxCombo=0;this.faults=0;this.counts={perfect:0,good:0,miss:0,launch:0};this.shipN=0;this.over=false;this.rand=rng(Date.now()&0xffff);this.lockUntil=0;this.buffered=[];},
  startTutorial(){this.resetRun();this.tut={step:0};this.el.skip.style.display='';this.newShip(TRAINER);this.prompt('parts arrive on the beat');},
  inTutorial(){return !!this.tut;},
  skipTutorial(app){if(!this.tut)return;this.tut=null;settings.tutorials.shipyard=true;saveSettings();this.el.skip.style.display='none';this.prompt('');this.clearShip();this.startRun(0);},
  startRun(c){this.resetRun();this.tut=null;this.startClass=c;this.el.skip&&(this.el.skip.style.display='none');this.newShip(CLASSES[c]);},
  restart(app){app.ui.closeAll();if(this.tut){this.startTutorial();return;}this.hud();this.clearShip();this.startRun(this.startClass||0);},
  clearShip(){V.ship.clear();V.items.forEach(i=>V.root.remove(i.obj));V.items=[];},
  newShip(cls){this.clearShip();this.cls=cls;this.needed=0;this.planned=0;this.phase='build';this.shipFaults=0;
    const bpm=cls.bpm+(this.shipN>=CLASSES.length?8:0);this.clock=beatClock(bpm,1.0);const m=audio.startMusic(bpm,this.clock.t0,'yard');if(m)m.level=this.tut?0:Math.min(3,1+Math.floor(this.shipN/2));
    this.genBeat=Math.ceil(this.clock.beat(heard(audio.now())))+2;
    V.ship.position.set(0,40,0);V.ship.rotation.set(0,0,0);V.ship.visible=true;
    // ghost frame of the ship so the target silhouette reads before parts land
    const gh=part('hull');gh.traverse(o=>{if(o.isMesh)o.material=new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:0.06,blending:THREE.AdditiveBlending,depthWrite:false});});gh.userData.ghost=1;V.ship.add(gh);
    this.el.cls.textContent=cls.name+' \u00b7 '+bpm+' bpm';this.el.ship.textContent=this.tut?'trainer':`ship ${this.shipN+1} / ${RUN}`;if(!this.tut)this.banner(cls.name);this.camKind='build';this.app.rig.set('locked');this.resize(this.app);},
  nowBeat(){return this.clock.beat(heard(audio.now()));},
  // lazily schedule line items ahead of time; a missed part is re-planned after what is already on the belt
  gen(){const cls=this.cls,r=this.rand,nb=this.nowBeat();
    while(this.phase==='build'&&this.genBeat<nb+AHEAD+1){const b=this.genBeat;let type=null;
      if(this.planned<cls.parts.length){const p=cls.dens;
        if(this.tut){type=(b%3===0)?(this.tut.decoyDone||this.planned===0?cls.parts[this.planned]:'scrap'):null;if(type==='scrap')this.tut.decoyDone=true;}
        else if(r()<0.18+p*0.15)type=null;else if(r()<p*0.55)type=r()<0.5?'scrap':ALL.filter(t=>t!==cls.parts[this.planned]&&t!=='scrap')[Math.floor(r()*6)];else type=cls.parts[this.planned];
        if(type===cls.parts[this.planned])this.planned++;}
      if(type){const obj=item(type);V.root.add(obj);V.items.push({type,beat:b,t:this.clock.at(b),obj,res:null});}
      this.genBeat+=(!this.tut&&cls.bpm<110&&r()<0.3)?2:1;}},
  onInput(ev){if(ev.type!=='action'||this.over)return;this.press(ev.t);},
  press(te){if(te<this.lockUntil)return;const h=heard(te);
    if(this.phase==='countdown'){const err=h-this.launchT;const g=grade(err);if(g){this.launch(g);return;}if(err<0&&err>=-WIN.good-WIN.buffer){this.buffered.push({launch:true});return;}this.lockUntil=te+0.12;audio.sfx('whiff');return;}
    if(this.phase!=='build')return;
    const it=V.items.filter(i=>!i.res&&Math.abs(h-i.t)<=WIN.good).sort((a,b)=>Math.abs(h-a.t)-Math.abs(h-b.t))[0];
    if(it){this.resolve(it,grade(h-it.t));return;}
    const early=V.items.find(i=>!i.res&&h<i.t-WIN.good&&h>=i.t-WIN.good-WIN.buffer);if(early){this.buffered.push({it:early});return;}
    this.lockUntil=te+0.12;audio.sfx('whiff');},
  resolve(it,g){const app=this.app,cls=this.cls;
    if(it.type===cls.parts[this.needed]){it.res='placed';it.g=g;this.needed++;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);if(!this.tut)this.counts[g]++;
      this.score+=Math.round((g==='perfect'?200:80)*(1+Math.min(3,Math.floor(this.combo/6)*0.5)));
      audio.sfx('place');audio.sfx(g);input.buzz(g==='perfect'?18:10);app.fx.kick(g==='perfect'?0.6:0.3);app.fx.shake(0.15);if(g==='perfect')app.fx.slowmo(0.45,0.12);
      const p=part(it.type);p.userData.fly={from:it.obj.position.clone(),t:0};V.ship.add(p);it.part=p;it.obj.visible=false;
      app.ui.pop(this.el.judge,g);this.el.combo.textContent=this.combo>1?'combo '+this.combo:'';
      if(this.needed>=cls.parts.length)this.complete();}
    else{it.res='reject';this.fault('wrong part');}},
  fault(why){const app=this.app;this.combo=0;this.el.combo.textContent='';audio.sfx('miss');input.buzz(60);app.fx.shake(0.8);app.ui.pop(this.el.judge,why);
    if(this.tut)return;this.faults++;this.shipFaults++;this.counts.miss++;if(this.faults>=MAXF)this.fail();},
  complete(){this.phase='roll';const nb=Math.ceil(this.nowBeat());this.rollB=nb;this.launchB=nb+8;this.launchT=this.clock.at(this.launchB);this.score+=500+(this.shipFaults?0:1000);
    V.items.forEach(i=>{if(!i.res)i.res='clear';});this.banner('assembled');audio.sfx('select');
    const c=this.camWorld('launch');this.camKind='launch';this.app.rig.flyTo(c.pos,c.target,c.fov,1.6).then(()=>{if(this.app.mode===this)this.app.rig.set('locked');});},
  launch(g){if(this.phase!=='countdown')return;this.phase='launch';const app=this.app;const ci=CLASSES.indexOf(this.cls);
    if(g&&!this.tut){this.score+=(g==='perfect'?1500:600)*(ci+1);this.counts.launch++;}
    app.ui.pop(this.el.judge,g?(g==='perfect'?'perfect launch':'good launch'):'late');if(g){audio.sfx(g);input.buzz(40);}
    app.fx.flash();app.fx.shake(g==='perfect'?1.4:0.8);audio.sfx('flash');if(g==='perfect')app.fx.slowmo(0.3,0.35);app.fx.flare(g==='perfect'?1.4:0.7);
    // flight path: lift off, arc to the ring, tear up through it
    const yg=app.yard.group;yg.updateMatrixWorld();const p0=V.ship.getWorldPosition(new THREE.Vector3());
    this.path=new THREE.CatmullRomCurve3([p0,p0.clone().add(new THREE.Vector3(0,90,0)),new THREE.Vector3(p0.x*0.55,330,p0.z*0.55),new THREE.Vector3(0,560,0),new THREE.Vector3(-40,900,30),new THREE.Vector3(-90,1500,60)]);
    this.fly={u:0,dur:4.2};this.flyThrough=false;V.ship.visible=false;this.flyShip=V.ship.clone();this.flyShip.visible=true;app.scene.add(this.flyShip);
    if(ci>=0&&!this.tut){const u=+localStorage.getItem(UNL)||0;if(ci+1>u&&ci+1<CLASSES.length){localStorage.setItem(UNL,ci+1);this.unlocked=CLASSES[ci+1].name;}}
    const c=this.camWorld('launch');this.lcp=new THREE.Vector3(...c.pos);this.lct=new THREE.Vector3(...c.target);app.rig.lock(c.pos,c.target,52);},
  step(dt,app){if(!this.clock)return;const nh=heard(audio.now()),nb=this.clock.beat(nh);
    if(this.phase==='build'){this.gen();
      for(let i=this.buffered.length-1;i>=0;i--){const b=this.buffered[i];if(b.it){if(b.it.res){this.buffered.splice(i,1);continue;}if(nh>=b.it.t-WIN.good){this.buffered.splice(i,1);this.resolve(b.it,'good');}}else this.buffered.splice(i,1);}
      for(const it of V.items){if(!it.res&&nh>it.t+WIN.good){if(it.type===this.cls.parts[this.needed]){it.res='missed';this.fault('missed');this.planned=Math.min(this.planned,this.needed);}else it.res='passed';}}
      if(this.tut)this.tutStep(nh);}
    else if(this.phase==='roll'){if(nb>=this.launchB-3.5){this.phase='countdown';}}
    if(this.phase==='countdown'){for(let i=this.buffered.length-1;i>=0;i--){if(this.buffered[i].launch&&nh>=this.launchT-WIN.good){this.buffered.splice(i,1);this.launch('good');}}
      if(this.phase==='countdown'&&nh>this.launchT+WIN.good){if(!this.tut){this.combo=0;}this.launch(null);}}
    if(this.tut&&this.phase!=='build')this.tutStep(nh);},
  tutStep(nh){const T=this.tut,cls=this.cls,next=V.items.find(i=>!i.res&&i.t>nh-0.1);
    if(this.phase==='build'){if(!next){this.prompt('parts arrive on the beat');return;}
      if(next.type===cls.parts[this.needed])this.prompt(`fire when <b>${next.type}</b> hits the frame ${this.actHint()}`);else this.prompt('wrong part \u00b7 let it pass');}
    else if(this.phase==='roll'||this.phase==='countdown')this.prompt(`launch on the beat ${this.actHint()}`);
    else if(this.phase==='launch'&&!T.done){T.done=true;settings.tutorials.shipyard=true;saveSettings();this.prompt('locked in');}},
  frame(t,dt,app){if(!V.root||!this.clock)return;const nh=heard(audio.now()),nb=this.clock.beat(nh),bf=nb-Math.floor(nb),pulse=Math.max(0,1-bf*4);
    document.documentElement.style.setProperty('--beat',pulse.toFixed(3));
    const fb=Math.floor(nb);[...this.el.beats.children].forEach((e,i)=>e.style.background=(((fb%4)+4)%4===i&&pulse>0.2)?'#fff':'transparent');
    // belt: steps one slot per beat with a fast snap (tied to the beat clock)
    const snap=Math.min(1,bf/0.16),ease=1-Math.pow(1-snap,3),bx=Math.floor(nb)+ease;
    for(const it of V.items){const x=WELD_X+(it.beat-bx)*SLOT;it.obj.position.set(x,BELT_Y+0.7,BELT_Z);it.obj.visible=it.res!=='placed'&&x<175&&x>-140;
      if(it.res==='reject'||it.res==='missed'){it.obj.position.y=BELT_Y+0.7-Math.min(20,(nh-it.t)*40);}
      const near=Math.abs(it.beat-nb)<0.5;if(it.obj.userData.label)it.obj.userData.label.material.opacity=near?1:0.55;}
    V.items=V.items.filter(it=>{const keep=WELD_X+(it.beat-bx)*SLOT>-150||it.res==='placed';if(!keep)V.root.remove(it.obj);return keep;});
    V.rollers.forEach((r,i)=>r.position.x=-130+(((i*SLOT-ease*SLOT)%300)+300)%300);
    V.frameM.opacity=0.55+0.45*pulse;V.floor.material.opacity=0.08+0.25*pulse;
    // parts fly from the frame into their slot on the ship
    V.ship.children.forEach(p=>{const f=p.userData.fly;if(f&&f.t<1){f.t=Math.min(1,f.t+dt*5.5);const e=1-Math.pow(1-f.t,3);const from=V.ship.worldToLocal(app.yard.group.localToWorld(f.from.clone()));
        p.position.copy(from).lerp(new THREE.Vector3(),e);p.position.y+=Math.sin(e*Math.PI)*16;p.scale.setScalar(0.25+0.75*e);if(f.t>=1){p.position.set(0,0,0);p.scale.setScalar(1);}}
      p.traverse(o=>{if(o.userData.spin)o.rotation.x=t*3;if(o.userData.shell)o.material.opacity=0.08+0.08*pulse;});});
    // roll to pad
    if(this.phase==='roll'||this.phase==='countdown'){const k=Math.min(1,Math.max(0,(nb-this.rollB)/4)),e=k*k*(3-2*k);V.ship.position.set(-185*e,40+(5-40)*e+14*e,0);
      const left=this.launchB-nb;const cd=Math.ceil(left);if(this.phase==='countdown'&&cd>=1&&cd<=3&&cd!==this._cd){this._cd=cd;this.banner(String(cd));audio.sfx('warn');}
      V.padLights.forEach((m,i)=>m.material.opacity=((Math.floor(nb*2)+i)%3===0)?1:0.25);}
    else this._cd=0;
    if(this.fly){const f=this.fly;f.u=Math.min(1,f.u+dt/f.dur);const u=f.u*f.u*(0.4+0.6*f.u)*0.999+0.0005;const P=this.path.getPointAt(Math.min(1,u)),Q=this.path.getPointAt(Math.min(1,u+0.004));
      const s=this.flyShip;s.position.copy(P);s.lookAt(Q);s.rotateY(-Math.PI/2);s.rotateX(t*0.6);
      this.exhaust(t,dt,s,f.u);if(!this.flyThrough&&P.y>560){this.flyThrough=true;app.efx.ringFlash(1.5);app.efx.pulse(1.5);app.fx.flare(1);audio.launch(1);}
      this.lct.lerp(P,Math.min(1,dt*6));app.rig.lockVec(this.lcp.clone().setY(this.lcp.y+Math.min(140,(P.y-40)*0.25)),this.lct);app.camera.fov=52+Math.min(10,f.u*14);
      if(this.testCam){const o=this.testCam,R=this.path.getPointAt(1),dr=R.clone().sub(P).normalize(),sd=new THREE.Vector3().crossVectors(dr,new THREE.Vector3(0,1,0)).normalize(),cp=P.clone().addScaledVector(dr,-o.off[0]).addScaledVector(sd,o.off[1]).add(new THREE.Vector3(0,o.off[2],0)),tg=P.clone().lerp(R,o.look||0);app.rig.lock(cp.toArray(),tg.toArray(),o.fov||50);app.camera.position.copy(cp);app.camera.lookAt(tg);app.camera.fov=o.fov||50;app.camera.updateProjectionMatrix();}
      if(f.u>=1){this.fly=null;app.scene.remove(this.flyShip);this.afterLaunch();}}
    else this.exhaust(t,dt,null,1);
    this.occlusion(app);this.hudUpdate();},
  // smart camera: anything between the lens and the action fades to a ghost instead of being removed
  occlusion(app){if(!V.occ||(V.occF++%4))return;const cam=app.camera.position,hit=new Set();app.yard.group.updateMatrixWorld();
    const tg=[V.frame.getWorldPosition(new THREE.Vector3()),V.ship.getWorldPosition(new THREE.Vector3()),app.yard.group.localToWorld(new THREE.Vector3(WELD_X+SLOT*3,BELT_Y+6,BELT_Z))];
    if(this.flyShip)tg.push(this.flyShip.position.clone());
    for(const t of tg){const d=t.clone().sub(cam),L=d.length();V.ray.set(cam,d.normalize());V.ray.far=L-6;for(const h of V.ray.intersectObjects(V.occ,false))hit.add(h.object);}
    for(const m of hit)if(!V.faded.has(m)){const orig=m.material,f=orig.clone();f.transparent=true;f.opacity=0.14;f.depthWrite=false;V.faded.set(m,orig);m.material=f;}
    for(const [m,orig] of V.faded)if(!hit.has(m)){m.material.dispose();m.material=orig;V.faded.delete(m);}},
  unfade(){if(!V.faded)return;for(const [m,orig] of V.faded){m.material=orig;}V.faded.clear();},
  exhaust(t,dt,ship,u){const C=V.core,S=V.smoke;if(ship&&dt>0){const back=new THREE.Vector3(-1,0,0).transformDirection(ship.matrixWorld),noz=ship.localToWorld(new THREE.Vector3(-58,0,0));
      for(let i=0;i<Math.floor(600*dt*60/60*1.2);i++){const q=C.spawn();q.p.copy(noz).addScaledVector(back,Math.random()*6);q.v.copy(back).multiplyScalar(80+Math.random()*60).add(new THREE.Vector3((Math.random()-.5)*12,(Math.random()-.5)*12,(Math.random()-.5)*12));q.l0=q.life=0.12+Math.random()*0.2;q.s0=3+Math.random()*3;q.lum=1;q.a0=0.5;}
      for(let i=0;i<8;i++){const q=S.spawn();q.p.copy(noz).addScaledVector(back,8+Math.random()*10);q.v.copy(back).multiplyScalar(10+Math.random()*10).add(new THREE.Vector3((Math.random()-.5)*8,(Math.random()-.5)*8,(Math.random()-.5)*8));q.l0=q.life=2+Math.random()*2;q.s0=5+Math.random()*5;q.lum=0.5;q.a0=0.22;}}
    for(const cl of [C,S])for(const q of cl.P)if(q.life>0){q.life-=dt;q.v.multiplyScalar(Math.max(0,1-1.2*dt));q.p.addScaledVector(q.v,dt);}
    C.write((q,k)=>[q.s0*(1-0.6*k),q.a0*(1-k)]);S.write((q,k)=>[q.s0*(1+3*k),q.a0*Math.sin(Math.PI*Math.min(1,k*1.2))*(1-k)]);},
  afterLaunch(){const app=this.app;if(this.tut){this.tut=null;this.el.skip.style.display='none';this.prompt('');this.startRun(0);return;}
    this.shipN++;if(this.shipN>=RUN){this.results(true);return;}
    const ci=Math.min(CLASSES.length-1,(this.startClass||0)+this.shipN);app.rig.set('locked');const c=this.camWorld('build');app.rig.flyTo(c.pos,c.target,c.fov,1.4).then(()=>{if(app.mode===this){app.rig.set('locked');}});this.newShip(CLASSES[ci]);},
  hudUpdate(){const e=this.el;if(!e.score)return;e.score.textContent=this.score;e.f.textContent='\u25a0'.repeat(this.faults)+'\u25a1'.repeat(Math.max(0,MAXF-this.faults));
    const cls=this.cls;if(cls){const h=cls.parts.map((p,i)=>i<this.needed?`<span style="color:#fff">\u25a0 ${p}</span>`:i===this.needed&&this.phase==='build'?`<span style="color:#fff;border-bottom:1px solid #fff">\u25a1 ${p}</span>`:`<span style="color:#6a6a6a">\u25a1 ${p}</span>`).join('&nbsp;&nbsp; ');if(e.build._h!==h){e.build.innerHTML=h;e.build._h=h;}}},
  fail(){if(this.over)return;this.over=true;this.phase='halt';this.banner('line halted');audio.sfx('lose');setTimeout(()=>this.results(false),1600);},
  results(win){this.over=true;audio.stopMusic();const best=+localStorage.getItem(BEST)||0,nb=this.score>best;if(nb)localStorage.setItem(BEST,this.score);
    const tot=this.counts.perfect+this.counts.good+this.counts.miss,acc=tot?((this.counts.perfect+this.counts.good*0.6)/tot*100):0;
    const rows=[['score',this.score+(nb?'  new best':'')],['best',Math.max(best,this.score)],['ships launched',this.shipN],['perfect',this.counts.perfect],['good',this.counts.good],['faults',this.faults],['launch bonus',this.counts.launch],['accuracy',acc.toFixed(1)+'%']];
    if(this.unlocked)rows.push(['unlocked',this.unlocked]);
    this.app.results(win?'shift complete':'line halted',rows,{sub:'shipyard',retry:()=>{this.hud();this.app.ui.touch(true,'fire');this.clearShip();this.startRun(this.startClass||0);}});
    window.__syResult={win,score:this.score,counts:{...this.counts},faults:this.faults,ships:this.shipN};this.unlocked=null;},
  pause(app,on){if(on){this.pausedAt=audio.now();audio.stopMusic();}else{const sh=audio.now()-this.pausedAt+0.8;this.clock.shift(sh);V.items.forEach(i=>i.t+=sh);this.launchT+=sh;
    const m=audio.startMusic(this.clock.bpm,this.clock.t0,'yard');if(m)m.level=this.tut?0:Math.min(3,1+Math.floor(this.shipN/2));}},
  exit(app){V.root.visible=false;this.unfade(true);this.clearShip();V.ship.visible=false;app.yard.ship.visible=true;removeEventListener('keydown',this.onTab);if(this.flyShip)app.scene.remove(this.flyShip);this.fly=null;this.testCam=null;this.clock=null;document.documentElement.style.setProperty('--beat','0');},
};
window.__syItems=()=>V.items;
register(M);
