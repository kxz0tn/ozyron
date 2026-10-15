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

let markReady;const sceneReady=new Promise(r=>markReady=r);
const booted=boot(sceneReady);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,1,5000);camera.position.set(-430,150,380);

// districts: add new ones here (each returns {update(t,dt)})
const SHIPYARD={x:330,z:-120};
const towers=buildTowers(scene,{clear:[{x:0,z:0,r:135},{x:SHIPYARD.x,z:SHIPYARD.z,r:175}]});
const systems=[
  buildWorld(scene),
  towers,
  buildDetails(scene,towers.towers),
  buildEnergy(scene),
  buildShipyard(scene,SHIPYARD),
  buildTraffic(scene),
];
const cam=buildCamera(camera,renderer.domElement);

const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.7,0.45,0.74);composer.addPass(bloom);
// final grade: hard greyscale (chroma 0 guarantee) + vignette + fine grain + scanline
const grade=new ShaderPass({uniforms:{tDiffuse:{value:null},t:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`uniform sampler2D tDiffuse;uniform float t;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
  void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));
  vec2 d=vUv-.5;l*=1.-dot(d,d)*0.65;l+=(h(vUv*1000.+t)-.5)*.025;l*=.97+.03*sin(vUv.y*1400.);
  gl_FragColor=vec4(vec3(clamp(l,0.,1.)),1.);}`});
composer.addPass(new OutputPass());composer.addPass(grade);

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});

const clock=new THREE.Clock();let T=0,frames=0,acc=0;
window.__city={get fps(){return window.__fps||0;},camera,cam,
  view(a,b){cam.setAuto(false);camera.position.set(...a);cam.controls.target.set(...b);cam.controls.update();},
  shot(i){const s=cam.shots[i];cam.setAuto(false);camera.position.set(...s[0]);cam.controls.target.set(...s[1]);cam.controls.update();}};
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),0.05);T+=dt;
  // while the boot terminal fully covers the screen, warm up once then idle the GPU
  if(window.__ready&&!['out','done'].includes(window.__bootStage))return;
  for(const s of systems)s.update(T,dt);cam.update(T,dt);grade.uniforms.t.value=T;composer.render();
  if(!window.__ready&&T>0.3){window.__ready=1;markReady();}
  frames++;acc+=dt;if(acc>1){window.__fps=frames/acc;frames=0;acc=0;}});
booted.then(()=>{T=0;});
