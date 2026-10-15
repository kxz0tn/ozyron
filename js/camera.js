import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
// cinematic auto-flyover; any input hands control to orbit (mouse/touch) + WASD/QE/arrows fly; returns to tour after idle
export function buildCamera(camera,dom){
  const ctl=new OrbitControls(camera,dom);ctl.enableDamping=true;ctl.dampingFactor=0.06;ctl.maxPolarAngle=Math.PI*0.495;ctl.minDistance=20;ctl.maxDistance=1600;
  const shots=[ // [cam, target]
    [[-430,150,380],[0,140,0]],[[215,75,-25],[330,40,-120]],[[105,45,-35],[0,300,0]],[[-120,420,-300],[0,560,0]],[[-60,30,40],[-200,90,-160]],[[160,620,420],[20,0,-60]]];
  const path=new THREE.CatmullRomCurve3(shots.map(s=>new THREE.Vector3(...s[0])),true,'centripetal');
  const look=new THREE.CatmullRomCurve3(shots.map(s=>new THREE.Vector3(...s[1])),true,'centripetal');
  let auto=true,idle=0;const keys=new Set();
  const stop=()=>{auto=false;idle=0;};
  ['pointerdown','wheel','touchstart'].forEach(e=>dom.addEventListener(e,stop,{passive:true}));
  addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='KeyC'){auto=!auto;idle=0;}else stop();});
  addEventListener('keyup',e=>keys.delete(e.code));
  const v=new THREE.Vector3(),f=new THREE.Vector3(),r=new THREE.Vector3();
  return {controls:ctl,shots,path,look,setAuto(a){auto=a;},update(t,dt){
    if(auto){const u=(t*0.006)%1;path.getPointAt(u,camera.position);look.getPointAt(u,ctl.target);camera.lookAt(ctl.target);return;}
    idle+=dt;if(idle>45&&!keys.size){auto=true;}
    camera.getWorldDirection(f);f.y=0;f.normalize();r.crossVectors(f,camera.up);v.set(0,0,0);
    const sp=(keys.has('ShiftLeft')?260:110)*dt;
    if(keys.has('KeyW')||keys.has('ArrowUp'))v.add(f);if(keys.has('KeyS')||keys.has('ArrowDown'))v.sub(f);
    if(keys.has('KeyD')||keys.has('ArrowRight'))v.add(r);if(keys.has('KeyA')||keys.has('ArrowLeft'))v.sub(r);
    if(keys.has('KeyE')||keys.has('Space'))v.y+=1;if(keys.has('KeyQ'))v.y-=1;
    if(v.lengthSq()){v.normalize().multiplyScalar(sp);camera.position.add(v);ctl.target.add(v);idle=0;}
    if(camera.position.y<6)camera.position.y=6;ctl.update();}};
}
