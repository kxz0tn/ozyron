import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {buildWorld} from './world.js';
import {buildTowers} from './towers.js';
import {buildEnergy} from './energy.js';
import {buildShipyard} from './shipyard.js';
import {buildTraffic} from './traffic.js';
import {buildDetails} from './details.js';
import {boot} from './boot.js';
import {buildCamera} from './camera.js';
import {buildDayNight} from './city/daynight.js';
import {buildAtmosphere} from './city/atmosphere.js';
import {buildTransit} from './city/transit.js';
import {buildSigns} from './city/signs.js';
import {buildRain} from './city/rain.js';
import {buildDocks} from './city/docks.js';
import {buildEnergyFX} from './city/energyfx.js';
import {buildScale} from './city/scale.js';
import {settings,saveSettings,TIERS,activeTier,detectTier} from './core/settings.js';
import {audio} from './core/audio.js';
import {input} from './core/input.js';
import {ui} from './core/ui.js';
import {buildRig} from './core/camrig.js';
import * as registry from './core/registry.js';
import {settingsItems,calibrate} from './core/settingsmenu.js';
import './modes/explore.js';
import './modes/photo.js';
import './games/beamkeeper.js';
import './games/shipbuilder.js';

const Q=new URLSearchParams(location.search);
const RENDER=Q.has('render');
let markReady;const sceneReady=new Promise(r=>markReady=r);
const booted=RENDER?new Promise(()=>{}):boot(sceneReady);
const tierName=activeTier(),tier=TIERS[tierName];
const renderer=new THREE.WebGLRenderer({antialias:tierName!=='low',powerPreference:'high-performance',preserveDrawingBuffer:true});
let prScale=1;const setPR=()=>renderer.setPixelRatio(Math.min(devicePixelRatio,tier.pr)*prScale);
setPR();renderer.setSize(innerWidth,innerHeight);renderer.localClippingEnabled=true;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,1,6000);camera.position.set(-430,150,380);scene.userData.cam=camera;

// districts: add new ones here (each returns {update(t,dt)})
const SHIPYARD={x:330,z:-120};
const towers=buildTowers(scene,{low:tierName==='low',count:tier.towers,clear:[{x:0,z:0,r:135},{x:SHIPYARD.x,z:SHIPYARD.z,r:250}]});
const world=buildWorld(scene);
const energy=buildEnergy(scene);
const yard=buildShipyard(scene,SHIPYARD);
const traffic=buildTraffic(scene);
const systems=[world,towers,buildDetails(scene,towers.towers),energy,yard,traffic];
const daynight=buildDayNight(scene,{world,towers});
const atmo=buildAtmosphere(scene,{towers,tier});
const efx=buildEnergyFX(scene,energy);
const rain=buildRain(scene,{tier,world,renderer});
const docks=buildDocks(yard.group);
const city=[buildScale(scene,{tier,clear:[{x:SHIPYARD.x,z:SHIPYARD.z,r:250}]}),buildTransit(scene,{towers,tier}),buildSigns(scene,{towers}),docks,efx];
// realism: image-based lighting from the live sky, soft shadows from the key light on high/ultra
const pmrem=new THREE.PMREMGenerator(renderer);let envD=-1;
const skyScene=new THREE.Scene();const skyClone=scene.children.find(o=>o.isMesh&&o.material&&o.material.uniforms&&o.material.uniforms.d);
function refreshEnv(){if(!skyClone)return;const m=new THREE.Mesh(skyClone.geometry,skyClone.material);skyScene.clear();skyScene.add(m);const rt=pmrem.fromScene(skyScene,0,1,5000);if(scene.environment&&scene.environment.dispose)scene.environment.dispose();scene.environment=rt.texture;envD=daynight.d;}
if(tier.reflect){const key=scene.children.find(o=>o.isDirectionalLight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  key.castShadow=true;const S=tierName==='ultra'?4096:2048;key.shadow.mapSize.set(S,S);const c=key.shadow.camera;c.left=c.bottom=-650;c.right=c.top=650;c.near=10;c.far=1600;key.shadow.bias=-0.0006;key.shadow.normalBias=1.5;key.shadow.radius=4;
  key.position.set(-420,620,-300);
  towers.group.traverse(o=>{if(o.isInstancedMesh){o.castShadow=true;o.receiveShadow=true;}});world.ground.receiveShadow=true;
  yard.group.traverse(o=>{if(o.isMesh&&o.material&&!o.material.transparent){o.castShadow=true;o.receiveShadow=true;}});docks.group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});}
const cam=buildCamera(camera,renderer.domElement);
const rig=buildRig(camera,cam);

const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.7,0.45,0.74);bloom.enabled=tier.bloom;composer.addPass(bloom);
// screen-space light scattering: radial march from the beam/ring toward each pixel over bright samples (med+; low skips it entirely)
const GR_N={low:0,med:24,high:40,ultra:64}[tierName];
const rays=new ShaderPass({uniforms:{tDiffuse:{value:null},c0:{value:new THREE.Vector2()},c1:{value:new THREE.Vector2()},w0:{value:0},w1:{value:0},k:{value:1},asp:{value:1}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`#define N ${Math.max(GR_N,1)}
  uniform sampler2D tDiffuse;uniform vec2 c0,c1;uniform float w0,w1,k,asp;varying vec2 vUv;
  float hh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  vec3 march(vec2 c,float w){if(w<=0.)return vec3(0.);vec2 d=(vUv-c)/float(N)*.9;vec2 p=vUv;float j=hh(vUv*997.);p-=d*j;float dec=1.;vec3 acc=vec3(0.);
    for(int i=0;i<N;i++){p-=d;vec3 s=texture2D(tDiffuse,p).rgb;acc+=max(s-.75,0.)*dec;dec*=.955;}
    float fall=1./(1.+length((vUv-c)*vec2(asp,1.))*3.);return acc/float(N)*w*fall;}
  void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;vec3 r=(march(c0,w0)+march(c1,w1))*k*2.2;gl_FragColor=vec4(c+clamp(r,0.,4.),1.);}`});
rays.enabled=GR_N>0;composer.addPass(rays);
const _rv=new THREE.Vector3(),_cd=new THREE.Vector3();
function rayCenter(p,cu,wu){_rv.copy(p).project(camera);camera.getWorldDirection(_cd);const front=_cd.dot(_rv.clone().set(p.x-camera.position.x,p.y-camera.position.y,p.z-camera.position.z).normalize());
  cu.value.set(_rv.x*.5+.5,_rv.y*.5+.5);const off=Math.max(Math.abs(_rv.x),Math.abs(_rv.y));wu.value=front>0.1?Math.max(0,1-Math.max(0,off-1)*0.8):0;}
// final grade: luminance-only grade (chroma 0 guarantee) + vignette + fine grain + scanline + flare/dim exposure
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},t:{value:0},ex:{value:1}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform sampler2D tDiffuse;uniform float t,ex;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722))*ex;
  vec2 d=vUv-.5;l*=1.-dot(d,d)*0.65;l+=(h(vUv*1000.+t)-.5)*.025;l*=.97+.03*sin(vUv.y*1400.);
  gl_FragColor=vec4(vec3(clamp(l,0.,1.)),1.);}`});
composer.addPass(new OutputPass());composer.addPass(grade);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);if(app.mode&&app.mode.resize)app.mode.resize(app);});

// ---- app context shared with every module
const fxs={slow:1,slowT:0,flare:0,ex:1};
const app={THREE,scene,camera,renderer,rig,cam,energy,efx,towers,yard,docks,traffic,daynight,atmo,rain,ui,audio,input,settings,tier,tierName,registry,
  mode:null,paused:false,simT:0,
  fx:{shake:a=>rig.shake(a),kick:a=>rig.kick(a),flash:()=>{if(!settings.reduceMotion)ui.flash();fxs.ex=Math.max(fxs.ex,1.8);},
    slowmo(s=0.35,d=0.18){if(settings.reduceMotion)return;fxs.slow=s;fxs.slowT=d;},flare(v){fxs.flare=Math.max(fxs.flare,v);}},
  async start(id){const m=registry.get(id);if(!m)return;ui.closeAll();audio.init();if(app.mode)await app.stop(true);app.mode=m;app.ready=false;window.__screen=null;app.paused=false;window.__mode=id;
    if(m.camera){rig.set('locked');const c=typeof m.camera==='function'?m.camera(app):m.camera;await rig.flyTo(c.pos,c.target,c.fov||55,c.dur||1.8);}
    await m.enter(app);app.ready=true;},
  async stop(silent){const m=app.mode;if(!m)return;app.mode=null;window.__mode=null;app.paused=false;ui.closeAll();ui.hudClear();ui.touch(false);ui.hidden(false);if(m.exit)await m.exit(app);
    audio.stopMusic();towers.U.uFlare.value=0;for(let i=0;i<8;i++)towers.U.uDim.value[i]=1;energy.fx.wob=0;efx.autoPulse=true;
    if(!silent)app.menu();},
  menu(){ui.closeAll();rig.set('menu');window.__screen='menu';
    const items=registry.list().filter(m=>!m.hidden).map(m=>({label:m.label,k:m.tag?m.tag():'',on:()=>app.start(m.id)}));
    items.push({label:'settings',on:()=>app.openSettings()});
    app.menuList=ui.open({id:'menu',title:'Ozyron',sub:'kxz0tn',items,hint:'\u2191 \u2193 select \u00b7 enter confirm'});},
  openSettings(onClose){const l=ui.open({title:'settings',sub:'system',items:()=>settingsItems(app),onBack:()=>{ui.close(l);saveSettings();onClose&&onClose();}});return l;},
  pause(){if(!app.mode||app.paused||app.mode.noPause)return;app.paused=true;window.__screen='pause';if(app.mode.pause)app.mode.pause(app,true);ui.touch(false);
    const resume=()=>{ui.closeAll();app.paused=false;window.__screen=null;if(app.mode.pause)app.mode.pause(app,false);if(app.mode.touch)ui.touch(true,app.mode.touch);};
    const items=[{label:'resume',on:resume}];if(app.mode.restart)items.push({label:'restart',k:'r',on:()=>{ui.closeAll();app.paused=false;app.mode.restart(app);if(app.mode.touch)ui.touch(true,app.mode.touch);}});
    if(app.mode.skipTutorial&&app.mode.inTutorial&&app.mode.inTutorial())items.push({label:'skip tutorial',on:()=>{resume();app.mode.skipTutorial(app);}});
    items.push({label:'settings',on:()=>app.openSettings()},{label:'exit',on:()=>app.stop()});
    ui.open({title:'paused',sub:app.mode.label,items,onBack:resume});},
  results(title,rows,{retry,sub}={}){window.__screen='results';ui.touch(false);ui.hudClear();
    const items=rows.map(([a,b])=>({kind:'info',label:a,value:b}));items.push({kind:'hdr',label:''});
    if(retry)items.push({label:'retry',on:()=>{ui.closeAll();window.__screen=null;retry();}});items.push({label:'menu',on:()=>app.stop()});
    const l=ui.open({center:true,title,sub,items});l.sel=l.firstSel(rows.length,1);l.mark();return l;},
};
window.__app=app;window.__input=input;window.__audio=audio;window.__settings=settings;
ui.onCorner=c=>{if(c==='mute'){audio.init();settings.muted=!settings.muted;saveSettings();}else if(c==='menu'){if(app.mode)app.pause();}};
const cornerSync=()=>{const b=ui.root.querySelector('[data-c=mute]');if(b)b.textContent=settings.muted?'muted':'sound';};
// first user gesture unlocks audio
['pointerdown','keydown'].forEach(e=>addEventListener(e,()=>audio.init(),{once:true,capture:true}));

// apply live settings
let lastRain=null;
function applyLive(){daynight.cycle=settings.cycle;if(lastRain!==settings.rain){rain.set(settings.rain);lastRain=settings.rain;}cornerSync();}

// ---- loop: fixed 120hz simulation for modules, render-rate visuals; world time can slow for juice
const STEP=1/120;let acc=0,T=0,last=performance.now(),frames=0,facc=0,lowT=0;
window.__perf={frames:[]};
function frame(){const now=performance.now();const raw=(now-last)/1000;let rdt=Math.min(raw,0.1);last=now;
  input.pollPads();applyLive();
  if(fxs.slowT>0){fxs.slowT-=rdt;if(fxs.slowT<=0)fxs.slow=1;}
  const wdt=rdt*(fxs.slow<1?fxs.slow:1);T+=wdt;
  // input routing
  for(const ev of input.drain()){
    if(ev.type==='mute'){settings.muted=!settings.muted;saveSettings();continue;}
    if(ui.route(ev))continue;
    if(app.mode&&app.ready&&!app.paused){if(ev.type==='pause'){app.pause();continue;}if(ev.type==='restart'&&app.mode.restart){app.mode.restart(app);continue;}if(app.mode.onInput)app.mode.onInput(ev,app);}
  }
  if(app.mode&&app.ready&&!app.paused){acc+=rdt;let n=0;while(acc>=STEP&&n<24){app.mode.step&&app.mode.step(STEP,app);acc-=STEP;n++;app.simT+=STEP;}if(n>=24)acc=0;}
  if(app.mode&&app.ready&&app.mode.frame)app.mode.frame(T,wdt,app);
  // city
  daynight.update(T,wdt);if(Math.abs(daynight.d-envD)>(tier.reflect?0.08:0.5))refreshEnv();scene.environmentIntensity=0.35+daynight.d*0.6;
  for(const s of systems)s.update(T,wdt);
  const env={dawn:daynight.d,rain:settings.rain,camera,boost:1+fxs.flare*0.8};
  atmo.update(T,wdt,env);for(const s of city)s.update(T,wdt,env);rain.update(T,wdt,env);
  fxs.flare=Math.max(0,fxs.flare-rdt*1.6);towers.U.uFlare.value=Math.max(towers.U.uFlare.value*Math.pow(0.02,rdt),fxs.flare);
  for(let i=0;i<8;i++)towers.U.uDim.value[i]=Math.min(1,towers.U.uDim.value[i]+rdt*0.12);
  fxs.ex=1+(fxs.ex-1)*Math.pow(0.004,rdt);grade.uniforms.ex.value=fxs.ex;
  rig.update(T,rdt);
  const cp=camera.position,db=Math.hypot(cp.x,cp.z);audio.setAmbient({beam:Math.max(0.05,Math.min(1,180/(db+60))),rain:settings.rain?1:0,hum:1});
  if(rays.enabled){rayCenter(new THREE.Vector3(0,560,0),rays.uniforms.c0,rays.uniforms.w0);rayCenter(new THREE.Vector3(0,60,0),rays.uniforms.c1,rays.uniforms.w1);rays.uniforms.w1.value*=0.7;rays.uniforms.asp.value=camera.aspect;rays.uniforms.k.value=(1-daynight.d*0.5)*(settings.rain?1.5:1)*(1+fxs.flare*0.6);}
  grade.uniforms.t.value=T;composer.render();
  if(!window.__ready&&T>0.3){window.__ready=1;markReady();}
  frames++;facc+=raw;window.__perf.frames.push(rdt);if(window.__perf.frames.length>600)window.__perf.frames.shift();
  if(facc>1){window.__fps=frames/facc;frames=0;facc=0;
    // dynamic resolution safety net on auto quality
    if(settings.quality==='auto'&&window.__bootStage==='done'){if(window.__fps<40){lowT++;if(lowT>=3&&prScale>0.6){prScale-=0.15;setPR();composer.setSize(innerWidth,innerHeight);lowT=0;}}else lowT=0;}}
}
window.__city={get fps(){return window.__fps||0;},camera,cam,rig,
  view(a,b){rig.set('free');camera.position.set(...a);cam.controls.target.set(...b);cam.controls.update();},
  shot(i){const s=cam.shots[i];rig.set('free');camera.position.set(...s[0]);cam.controls.target.set(...s[1]);cam.controls.update();}};
if(RENDER){window.__systems=systems;let __lt=null;window.__renderAt=(t,pos,tgt,fov=55,roll=0)=>{const __dt=__lt===null?1/60:Math.min(1/20,Math.max(0,t-__lt));__lt=t;for(const s of systems)s.update(t,__dt);camera.fov=fov;camera.updateProjectionMatrix();camera.position.set(...pos);camera.lookAt(...tgt);if(roll)camera.rotateZ(roll);grade.uniforms.t.value=t;composer.render();return renderer.domElement.toDataURL('image/jpeg',0.96);};window.__ready=1;}
else renderer.setAnimationLoop(()=>{if(window.__ready&&!['out','done'].includes(window.__bootStage)){last=performance.now();return;}frame();});
booted.then(()=>{if(Q.get('mode'))app.start(Q.get('mode'));else app.menu();});
