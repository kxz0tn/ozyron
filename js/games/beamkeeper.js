import * as THREE from 'three';
import {register} from '../core/registry.js';
import {audio} from '../core/audio.js';
import {input} from '../core/input.js';
import {settings,saveSettings} from '../core/settings.js';
import {beatClock,heard,grade,WIN} from '../core/rhythm.js';
import {rng} from '../util.js';
// BEAM KEEPER: surges hit the collector ring; rotate the focus onto each one and fire on impact to keep the beam locked on the core.
const BPM=120,SPEED=5.6,TOL=0.30,COYOTE=0.09,Y=578,R=182,BEST='ozyron.best.beamkeeper';
const TAU=Math.PI*2,wrap=a=>{a=(a+Math.PI)%TAU;if(a<0)a+=TAU;return a-Math.PI;},adist=(a,b)=>Math.abs(wrap(a-b));
const WAVES=['wave 01','wave 02','wave 03','storm','overload'];
function glowTex(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);}
const add=(o)=>{o.transparent=true;o.depthWrite=false;o.blending=THREE.AdditiveBlending;o.side=THREE.DoubleSide;return o;};
const G={};
function buildVisuals(scene){if(G.root)return;const root=G.root=new THREE.Group();root.position.y=Y;root.visible=false;scene.add(root);
  const tex=glowTex();
  const arcM=new THREE.MeshBasicMaterial(add({color:0xffffff,opacity:0.9}));
  G.focus=new THREE.Group();root.add(G.focus);
  const arc=new THREE.Mesh(new THREE.RingGeometry(R-16,R+16,48,1,-TOL,TOL*2),arcM);arc.rotation.x=-Math.PI/2;G.focus.add(arc);
  const edgeG=new THREE.BoxGeometry(44,1.2,1.2);[-TOL,TOL].forEach(a=>{const e=new THREE.Mesh(edgeG,new THREE.MeshBasicMaterial({color:0xffffff}));e.position.set(Math.cos(-a)*R,0,Math.sin(-a)*R);e.rotation.y=a;G.focus.add(e);});
  const ptr=new THREE.Mesh(new THREE.PlaneGeometry(R-40,1.4),new THREE.MeshBasicMaterial(add({color:0xffffff,opacity:0.35})));ptr.rotation.x=-Math.PI/2;ptr.position.x=(R-40)/2+20;G.focus.add(ptr);
  const fg=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));fg.position.x=R;fg.scale.setScalar(60);G.focus.add(fg);G.fglow=fg;
  G.arcM=arcM;
  const guide=new THREE.Mesh(new THREE.RingGeometry(R-0.8,R+0.8,256),new THREE.MeshBasicMaterial(add({color:0xffffff,opacity:0.25})));guide.rotation.x=-Math.PI/2;root.add(guide);
  for(let i=0;i<72;i++){const a=i/72*TAU,t=new THREE.Mesh(new THREE.PlaneGeometry(i%6?5:12,0.8),new THREE.MeshBasicMaterial(add({color:0xffffff,opacity:i%6?0.2:0.5})));t.rotation.x=-Math.PI/2;t.rotation.z=-a;t.position.set(Math.cos(a)*(R+26),0,Math.sin(a)*(R+26));root.add(t);}
  G.surges=[];for(let i=0;i<14;i++){const g=new THREE.Group();g.visible=false;root.add(g);
    const bolt=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));bolt.scale.setScalar(34);g.add(bolt);
    const streak=new THREE.Mesh(new THREE.PlaneGeometry(1,3),new THREE.MeshBasicMaterial(add({color:0xffffff,opacity:0.7})));streak.rotation.x=-Math.PI/2;g.add(streak);
    const ret=new THREE.Mesh(new THREE.RingGeometry(13,15.5,48),new THREE.MeshBasicMaterial(add({color:0xffffff,opacity:0.9})));ret.rotation.x=-Math.PI/2;g.add(ret);
    const wedge=new THREE.Mesh(new THREE.RingGeometry(R+34,R+52,12,1,-0.13,0.26),new THREE.MeshBasicMaterial(add({color:0xffffff,opacity:0.5})));wedge.rotation.x=-Math.PI/2;g.add(wedge);
    const lane=new THREE.Mesh(new THREE.PlaneGeometry(1,0.6),new THREE.MeshBasicMaterial(add({color:0xffffff,opacity:0.18})));lane.rotation.x=-Math.PI/2;g.add(lane);
    G.surges.push({g,bolt,streak,ret,wedge,lane,s:null});}
  G.bursts=[];for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.85,1,64),new THREE.MeshBasicMaterial(add({color:0xffffff,opacity:0})));m.rotation.x=-Math.PI/2;m.visible=false;root.add(m);G.bursts.push({m,t:1});}
  const boss=G.boss=new THREE.Group();boss.visible=false;root.add(boss);
  boss.add(new THREE.Mesh(new THREE.RingGeometry(268,272,256),new THREE.MeshBasicMaterial(add({color:0xffffff,opacity:0.6}))).rotateX(-Math.PI/2));
  for(let i=0;i<36;i++){const a=i/36*TAU,t=new THREE.Mesh(new THREE.PlaneGeometry(22,6),new THREE.MeshBasicMaterial(add({color:0xffffff,opacity:0.5})));t.rotation.x=-Math.PI/2;t.rotation.z=-a;t.position.set(Math.cos(a)*284,0,Math.sin(a)*284);boss.add(t);}
  G.ray=new THREE.Raycaster();G.plane=new THREE.Plane(new THREE.Vector3(0,1,0),-Y);
}
const M={id:'beamkeeper',label:'beam keeper',order:20,touch:'fire',
  tag(){const b=+localStorage.getItem(BEST)||0;return b?'best '+b:'';},
  camera(app){const a=app.camera.aspect,f=Math.max(1,1.15/a);return {pos:[0,Y+430*f,300*f],target:[0,Y-30,0],fov:50,dur:2};},
  resize(app){const c=this.camera(app);app.rig.lock(c.pos,c.target,c.fov);},
  enter(app){buildVisuals(app.scene);this.app=app;G.root.visible=true;app.efx.autoPulse=false;app.rig.set('locked');this.resize(app);
    this.hud();app.ui.touch(true,'fire');input.setMouseAim(true);
    this.focus=-Math.PI/2;this.hist=[];
    if(!settings.tutorials.beamkeeper&&!this.forceSkipTut)this.startTutorial();else this.startRun();},
  hud(){const touch=matchMedia('(pointer:coarse)').matches;this.app.ui.hudSet(`
    <div class="hud-tl"><div class="lbl" id="bk-wave">beam keeper</div><div class="big beat" id="bk-score">0</div><div class="lbl" id="bk-mult">x1.0</div></div>
    <div class="hud-tr"><div class="lbl">integrity</div><div class="meter"><i id="bk-int" style="width:100%"></i></div><div class="lbl" style="margin-top:.6em" id="bk-best"></div>
      <div id="bk-bosswrap" style="display:none;margin-top:.8em"><div class="lbl">overload</div><div class="meter"><i id="bk-boss" style="width:100%"></i></div></div></div>
    <div class="hud-c"><div class="wave" id="bk-banner"></div><div class="judge" id="bk-judge"></div><div class="combo" id="bk-combo"></div></div>
    <div class="hud-bc"><canvas id="bk-radar" width="168" height="168" style="width:84px;height:84px;display:block;margin:0 auto .5em"></canvas><div class="prompt" id="bk-prompt"></div>
      <div class="lbl" id="bk-skip" style="margin-top:.6em;display:none"><button class="cbtn ui-hit" id="bk-skipb">skip ${touch?'':'[tab]'}</button></div></div>`);
    this.el={};['wave','score','mult','int','best','bosswrap','boss','banner','judge','combo','radar','prompt','skip'].forEach(k=>this.el[k]=document.getElementById('bk-'+k));
    document.getElementById('bk-skipb').onclick=()=>this.skipTutorial(this.app);
    this.onTab=e=>{if(e.code==='Tab'&&this.tut){e.preventDefault();this.skipTutorial(this.app);}};addEventListener('keydown',this.onTab);
    this.el.best.textContent='best '+(+localStorage.getItem(BEST)||0);},
  prompt(html){const p=this.el.prompt;if(!html){p.classList.remove('on');return;}p.innerHTML=html;p.classList.add('on');},
  keyHint(){const d=input.state.lastDevice;if(d==='touch')return 'drag left side';if(d==='pad')return 'left stick';const k=settings.keys;const n=c=>c.replace('Key','').replace('Arrow','').toLowerCase();return `<span class="key">${n(k.left[0])}</span><span class="key">${n(k.right[0])}</span> or mouse`;},
  actHint(){const d=input.state.lastDevice;if(d==='touch')return '<span class="key">fire</span>';if(d==='pad')return '<span class="key">a</span>';return `<span class="key">${settings.keys.action[0].replace('Key','').toLowerCase()}</span>`;},
  reset(){this.score=0;this.combo=0;this.maxCombo=0;this.integ=100;this.counts={perfect:0,good:0,miss:0};this.surges=[];this.buffered=[];this.lockUntil=0;this.wave=-1;this.bossHP=100;this.over=false;this.rand=rng(Date.now()&0xffff);this.lastAng=this.focus;this.nextId=this.nextId||0;this.waveStart={score:0,hits:0,n:0};},
  startMusic(){const m=audio.startMusic(BPM,this.clock.t0,'beam');if(m)m.level=this.level||0;},
  startTutorial(){this.reset();this.tut={step:0,rot:0};this.clock=beatClock(BPM,0.6);this.level=0;this.startMusic();this.el.skip.style.display='';this.el.wave.textContent='calibration run';
    this.prompt(`rotate ${this.keyHint()}`);},
  inTutorial(){return !!this.tut;},
  skipTutorial(app){if(!this.tut)return;this.tut=null;settings.tutorials.beamkeeper=true;saveSettings();this.el.skip.style.display='none';this.prompt('');this.startRun();},
  startRun(){this.reset();this.tut=null;this.clock=beatClock(BPM,1.0);this.level=1;this.startMusic();this.el.skip&&(this.el.skip.style.display='none');this.nextWave();},
  restart(app){if(this.tut){this.startTutorial();return;}app.ui.closeAll();this.focus=-Math.PI/2;this.hud();this.startRun();},
  nowBeat(){return this.clock.beat(heard(audio.now()));},
  nextWave(){this.wave++;const w=this.wave,B0=Math.ceil(this.nowBeat())+4;this.waveStart={score:this.score,hits:0,n:0};
    this.el.wave.textContent=WAVES[w];this.banner(WAVES[w]);this.level=[1,1,2,3,3][w];if(audio.music)audio.music.level=this.level;
    if(w===4){this.el.bosswrap.style.display='';G.boss.visible=true;audio.sfx('boss',this.clock.at(B0-2));this.app.fx.shake(0.8);}
    this.waveEnd=this.gen(w,B0);},
  banner(t){const b=this.el.banner;b.textContent=t;b.classList.remove('show');void b.offsetWidth;b.classList.add('show');},
  // pattern generation: angles constrained so every move is physically reachable with margin
  push(beat,ang,wind,kind='n'){const t=this.clock.at(beat);this.surges.push({id:this.nextId++,beat,tHit:t,W:wind*this.clock.spb,ang:wrap(ang),kind,res:null,spawned:false});},
  reach(prevBeat,beat,ang){const dt=(beat-prevBeat)*this.clock.spb,max=SPEED*dt*0.62;const d=wrap(ang-this.lastAng);const a=this.lastAng+Math.max(-max,Math.min(max,d));this.lastAng=a;return a;},
  gen(w,B){const r=this.rand,sg=()=>r()<0.5?-1:1;let b=B,pb=B-4;const P=(beat,ang,wind,k)=>{const a=this.reach(pb,beat,ang);pb=beat;this.push(beat,a,wind,k);};
    if(w===0){for(let i=0;i<8;i++,b+=4)P(b,this.lastAng+sg()*(0.8+r()*1.4),4);}
    else if(w===1){for(let i=0;i<12;i++,b+=2)P(b,this.lastAng+sg()*(0.6+r()*1.8),3);}
    else if(w===2){for(let i=0;i<8;i++,b+=4){const s=sg();P(b,this.lastAng+s*(0.5+r()*1.5),3,'d');P(b+1,this.lastAng+s*(1.0+r()*0.9),3,'d');}}
    else if(w===3){for(let i=0;i<18;i++){P(b,r()*TAU,2,'s');b+=r()<0.35?2:1;}b+=1;}
    else {this.bossChunk(b);return Infinity;}
    return b+2;},
  bossChunk(b){const r=this.rand,hard=this.bossHP<50,step=hard?0.5:1;let pb=b-2;const P=(beat,ang)=>{const a=this.reach(pb,beat,ang);pb=beat;this.push(beat,a,2,'b');};
    const pat=Math.floor(r()*3);let a=this.lastAng;const dir=r()<0.5?-1:1;
    if(pat===0){for(let i=0;i<8;i++){a+=dir*(hard?0.62:0.78);P(b+i*step,a);}b+=8*step;}
    else if(pat===1){for(let k=0;k<3;k++){a+=dir*2.0;P(b,a);b+=1;a+=dir*0.5;P(b,a);b+=hard?1:2;}}
    else {for(let i=0;i<6;i++){a+=(i%2?-1:1)*(0.9+r()*0.6);P(b+i*step*(i%3===2?2:1),a);}b+=9*step;}
    this.bossNext=b+(hard?1:2);},
  onInput(ev,app){if(ev.type!=='action'||this.over)return;this.press(ev.t);},
  aligned(ang,te){if(adist(this.focus,ang)<=TOL)return true;for(const h of this.hist)if(h.t>=te-COYOTE&&adist(h.a,ang)<=TOL)return true;return false;},
  press(te){if(te<this.lockUntil)return;const h=heard(te);
    const cands=this.surges.filter(s=>!s.res&&Math.abs(h-s.tHit)<=WIN.good).sort((a,b)=>Math.abs(h-a.tHit)-Math.abs(h-b.tHit));
    for(const s of cands)if(this.aligned(s.ang,te)){this.hit(s,grade(h-s.tHit),h-s.tHit);return;}
    const early=this.surges.find(s=>!s.res&&h<s.tHit-WIN.good&&h>=s.tHit-WIN.good-WIN.buffer);
    if(early){this.buffered.push({s:early,until:early.tHit+WIN.good});return;}
    this.lockUntil=te+0.12;audio.sfx('whiff');},
  hit(s,g,err){s.res=g;s.err=err;this.counts[g]++;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);const app=this.app;
    const mult=this.mult();const pts=Math.round((g==='perfect'?300:100)*mult*(s.kind==='b'?1.5:1));this.score+=pts;this.waveStart.hits++;
    this.integ=Math.min(100,this.integ+(g==='perfect'?2:1));
    audio.sfx(g);input.buzz(g==='perfect'?18:10);app.efx.pulse(g==='perfect'?1.3:0.9);app.efx.ringFlash(g==='perfect'?0.8:0.4);
    const loc=wrap(s.ang+app.energy.orbit.rotation.y);let bi=0,bd=9;app.efx.cols.forEach((c,i)=>{const d=adist(c.a,loc);if(d<bd){bd=d;bi=i;}});app.efx.cols[bi].charge=1.4;
    app.fx.flare(Math.min(1.2,0.18+this.combo*0.035));this.burst(s.ang,g==='perfect'?1:0.6);
    if(g==='perfect'){app.fx.slowmo(0.4,0.14);app.fx.kick(0.7);app.fx.shake(0.18);}
    if(this.combo&&this.combo%25===0){app.fx.flash();app.fx.flare(1.6);audio.sfx('win');}
    if(s.kind==='b'){this.bossHP=Math.max(0,this.bossHP-(g==='perfect'?5:3.5));if(this.bossHP<=0)this.victory();}
    this.app.ui.pop(this.el.judge,g);this.el.combo.textContent=this.combo>1?'combo '+this.combo:'';
    if(this.tut){this.tut.hits=(this.tut.hits||0)+1;}},
  miss(s){s.res='miss';(window.__bkMiss=window.__bkMiss||[]).push([this.wave,s.kind,+(s.tHit-this.clock.t0).toFixed(2)]);const app=this.app;if(this.tut){this.app.ui.pop(this.el.judge,'miss');audio.sfx('miss');app.energy.fx.wob=0.6;return;}
    this.counts.miss++;this.combo=0;this.integ-=s.kind==='b'?15:12;audio.sfx('miss');input.buzz(70);app.fx.shake(1.0);app.energy.fx.wob=1;
    const si=Math.floor((wrap(s.ang)+Math.PI)/TAU*8)%8;const D=app.towers.U.uDim.value;D[si]=0.08;D[(si+1)%8]=Math.min(D[(si+1)%8],0.45);D[(si+7)%8]=Math.min(D[(si+7)%8],0.45);
    this.app.ui.pop(this.el.judge,'miss');this.el.combo.textContent='';
    if(this.integ<=0){this.integ=0;this.fail();}},
  mult(){return 1+Math.min(3,Math.floor(this.combo/8)*0.5);},
  burst(ang,k){const b=G.bursts.find(q=>q.t>=1)||G.bursts[0];b.t=0;b.k=k;b.m.visible=true;b.m.position.set(Math.cos(ang)*R,1,Math.sin(ang)*R);},
  step(dt,app){const S=input.state;let moved=0;
    const ax=input.axis();if(ax){this.focus+=ax*SPEED*dt;moved+=Math.abs(ax*SPEED*dt);}
    const dr=input.consumeDrag();if(dr){this.focus+=dr;moved+=Math.abs(dr);}
    if(S.stick){const a=Math.atan2(S.stick.y,S.stick.x);moved+=adist(a,this.focus);this.focus=a;}
    if(S.aim&&S.aim.fresh){moved+=adist(S.aim.a,this.focus);this.focus=S.aim.a;S.aim.fresh=false;}
    this.focus=wrap(this.focus);const now=audio.now();this.hist.push({t:now,a:this.focus});while(this.hist.length&&this.hist[0].t<now-0.15)this.hist.shift();
    if(this.over)return;
    const nh=heard(now);
    // input buffer: early presses fire as soon as the window opens, if the focus is on target
    for(let i=this.buffered.length-1;i>=0;i--){const b=this.buffered[i];if(b.s.res){this.buffered.splice(i,1);continue;}
      if(nh>=b.s.tHit-WIN.good){this.buffered.splice(i,1);if(this.aligned(b.s.ang,now))this.hit(b.s,'good',-WIN.good);}}
    for(const s of this.surges){if(!s.spawned&&nh>=s.tHit-s.W){s.spawned=true;audio.sfx('surge');}if(!s.res&&nh>s.tHit+WIN.good)this.miss(s);}
    this.surges=this.surges.filter(s=>!s.res||nh<s.tHit+0.6);
    if(this.tut)this.tutStep(moved,nh);
    else if(this.wave===4){if(this.surges.filter(s=>!s.res).length<3&&this.bossHP>0)this.bossChunk(Math.max(this.bossNext||0,Math.ceil(this.nowBeat())+2));}
    else if(this.clock.beat(nh)>this.waveEnd&&!this.surges.some(s=>!s.res)){const w=this.waveStart;this.score+=1000*(this.wave+1);this.nextWave();}
  },
  tutStep(moved,nh){const T=this.tut;
    if(T.step===0){T.rot+=moved;if(T.rot>1.4){T.step=1;this.spawnTut(2.2);this.prompt('align focus on the surge');}}
    else if(T.step===1||T.step===2){const s=this.surges[0];
      if(s&&!s.res){const al=adist(this.focus,s.ang)<=TOL;this.prompt(al?`fire on impact ${this.actHint()}`:'align focus on the surge');}
      else if(s&&s.res&&s.res!=='miss'&&!T.wait){T.wait=nh+0.7;}
      else if(s&&s.res==='miss'&&!T.wait){T.wait=nh+0.5;T.retry=true;}
      if(T.wait&&nh>T.wait){T.wait=0;if(T.retry){T.retry=false;this.surges=[];this.spawnTut(1.8);}else if(T.step===1){T.step=2;this.surges=[];this.spawnTut(-2.4);}else{T.step=3;this.prompt('locked in');T.end=nh+1.4;settings.tutorials.beamkeeper=true;saveSettings();}}}
    else if(T.step===3&&nh>T.end){this.prompt('');this.skipTutorial(this.app);}},
  spawnTut(off){const b=Math.ceil(this.nowBeat())+6;this.push(b,this.focus+off,6,'t');},
  frame(t,dt,app){if(!G.root)return;const nh=heard(audio.now()),beat=this.clock?this.clock.beat(nh):0,bf=beat-Math.floor(beat);
    // mouse aim (absolute) : pointer projected onto the ring plane
    const P=input.state.pointer;if(P&&P.type==='mouse'&&P!==this._lp){this._lp=P;const v=new THREE.Vector2(P.x/innerWidth*2-1,-(P.y/innerHeight)*2+1);G.ray.setFromCamera(v,app.camera);const hit=new THREE.Vector3();
      if(G.ray.ray.intersectPlane(G.plane,hit)&&Math.hypot(hit.x,hit.z)>25)input.state.aim={a:Math.atan2(hit.z,hit.x),fresh:true};}
    G.focus.rotation.y=-this.focus;const pulse=Math.max(0,1-bf*4);G.arcM.opacity=0.65+0.35*pulse;G.fglow.scale.setScalar(50+pulse*20);
    document.documentElement.style.setProperty('--beat',pulse.toFixed(3));
    const live=(this.surges||[]).filter(s=>s.spawned&&(!s.res||nh<s.tHit+0.25)).slice(0,G.surges.length);
    G.surges.forEach((v,i)=>{const s=live[i];v.g.visible=!!s;if(!s)return;const k=Math.min(1,Math.max(0,(nh-(s.tHit-s.W))/s.W)),c=Math.cos(s.ang),sn=Math.sin(s.ang);
      const r0=R+260,r=r0+(R-r0)*k*k*(1.6-0.6*k),done=!!s.res;
      v.bolt.position.set(c*r,30*(1-k),sn*r);v.bolt.material.opacity=done?0:1;v.bolt.scale.setScalar(26+k*30);
      const len=Math.min(90,40+k*80);v.streak.position.set(c*(r+len/2),15*(1-k),sn*(r+len/2));v.streak.scale.set(len,1+k*2,1);v.streak.rotation.z=-s.ang;v.streak.material.opacity=done?0:0.25+0.6*k;
      v.lane.position.set(c*(R+(r0-R)/2),0,sn*(R+(r0-R)/2));v.lane.scale.set(r0-R,1,1);v.lane.rotation.z=-s.ang;v.lane.material.opacity=done?0:0.12+0.15*k;
      const rs=done?1+(nh-s.tHit)*12:1+(1-k)*3.2;v.ret.position.set(c*R,0.5,sn*R);v.ret.scale.setScalar(rs);v.ret.material.opacity=done?(s.res==='miss'?0:Math.max(0,1-(nh-s.tHit)*4)):0.35+0.65*k;
      v.wedge.rotation.z=-s.ang;v.wedge.material.opacity=done?0:(0.2+0.8*k)*(k>0.75?(Math.sin(t*40)>0?1:0.5):1);});
    G.bursts.forEach(b=>{if(b.t>=1){b.m.visible=false;return;}b.t=Math.min(1,b.t+dt*2.4);const e=1-Math.pow(1-b.t,3);b.m.scale.setScalar(8+e*70*b.k);b.m.material.opacity=(1-b.t)*0.9;});
    if(G.boss.visible){G.boss.rotation.y=t*0.4;G.boss.scale.setScalar(1+pulse*0.03);app.energy.fx.wob=Math.max(app.energy.fx.wob,0.06);}
    app.energy.fx.wob=Math.max(0,app.energy.fx.wob-dt*1.4);
    if(this.wave===3&&!this.tut){app.rain.set(true);}else if(!settings.rain&&app.rain.on&&!this.over)app.rain.set(false);
    if(Math.floor(beat)!==this._lb&&beat>=0){this._lb=Math.floor(beat);if(this.wave===4&&this._lb%2===0)app.efx.pulse(0.5);}
    this.drawHUD(nh);},
  drawHUD(nh){const e=this.el;if(!e||!e.score)return;e.score.textContent=this.score;e.mult.textContent='x'+this.mult().toFixed(1);e.int.style.width=this.integ+'%';if(e.boss)e.boss.style.width=this.bossHP+'%';
    const c=e.radar.getContext('2d'),W=168,cx=84,r=58;c.clearRect(0,0,W,W);c.strokeStyle='rgba(255,255,255,.25)';c.lineWidth=2;c.beginPath();c.arc(cx,cx,r,0,TAU);c.stroke();
    c.strokeStyle='rgba(255,255,255,.08)';c.beginPath();c.arc(cx,cx,r+22,0,TAU);c.stroke();
    c.strokeStyle='#fff';c.lineWidth=7;c.beginPath();c.arc(cx,cx,r,this.focus-TOL,this.focus+TOL);c.stroke();
    for(const s of this.surges||[]){if(!s.spawned||s.res)continue;const k=Math.min(1,Math.max(0,(nh-(s.tHit-s.W))/s.W)),rr=r+24*(1-k);c.fillStyle=`rgba(255,255,255,${0.35+0.65*k})`;c.beginPath();c.arc(cx+Math.cos(s.ang)*rr,cx+Math.sin(s.ang)*rr,3+k*4,0,TAU);c.fill();}},
  victory(){if(this.over)return;this.over=true;const app=this.app;app.fx.flash();app.fx.flare(2);audio.sfx('win');app.efx.pulse(2);G.boss.visible=false;this.banner('core stable');setTimeout(()=>this.results(true),2200);},
  fail(){if(this.over)return;this.over=true;const app=this.app;audio.sfx('lose');app.energy.fx.wob=1.5;for(let i=0;i<8;i++)app.towers.U.uDim.value[i]=0.1;this.banner('core lost');setTimeout(()=>this.results(false),1800);},
  results(win){audio.stopMusic();const best=+localStorage.getItem(BEST)||0,nb=this.score>best;if(nb)localStorage.setItem(BEST,this.score);
    const tot=this.counts.perfect+this.counts.good+this.counts.miss,acc=tot?((this.counts.perfect+this.counts.good*0.6)/tot*100):0;
    this.app.results(win?'core stable':'core lost',[['score',this.score+(nb?'  new best':'')],['best',Math.max(best,this.score)],['max combo',this.maxCombo],['perfect',this.counts.perfect],['good',this.counts.good],['miss',this.counts.miss],['accuracy',acc.toFixed(1)+'%'],['reached',WAVES[Math.max(0,this.wave)]]],
      {sub:'beam keeper',retry:()=>{this.hud();this.app.ui.touch(true,'fire');this.focus=-Math.PI/2;this.startRun();}});
    window.__bkResult={win,score:this.score,counts:{...this.counts},wave:this.wave,maxCombo:this.maxCombo};},
  pause(app,on){if(on){this.pausedAt=audio.now();audio.stopMusic();}else{const sh=audio.now()-this.pausedAt+0.8;this.clock.shift(sh);for(const s of this.surges)s.tHit+=sh;for(const b of this.buffered)b.until+=sh;this.hist=[];this.startMusic();}},
  exit(app){G.root.visible=false;G.boss.visible=false;removeEventListener('keydown',this.onTab);input.setMouseAim(false);this.surges=[];if(!settings.rain)app.rain.set(false);document.documentElement.style.setProperty('--beat','0');},
  // test hooks
  debug(){return this;},
};
register(M);
