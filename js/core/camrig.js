import * as THREE from 'three';
// camera rig: wraps the existing tour/orbit camera and adds scripted fly-to, locked game framing and shake
import {settings} from './settings.js';
export function buildRig(camera,cam){
  const from={p:new THREE.Vector3(),t:new THREE.Vector3(),f:55},to={p:new THREE.Vector3(),t:new THREE.Vector3(),f:55};
  let mode='tour',fly=null,shake=0,kick=0;const base={p:new THREE.Vector3(),t:new THREE.Vector3(),f:55};const tmp=new THREE.Vector3();
  const E=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
  const rig={get mode(){return mode;},
    set(m){mode=m;cam.controls.enabled=(m==='free'||m==='tour');if(m==='tour')cam.setAuto(true);if(m==='free')cam.setAuto(false);},
    flyTo(p,t,f=55,dur=1.6){from.p.copy(camera.position);from.t.copy(cam.controls.target);from.f=camera.fov;to.p.set(...p);to.t.set(...t);to.f=f;
      if(settings.reduceMotion)dur=Math.min(dur,0.5);return new Promise(res=>{fly={u:0,dur,res};});},
    lock(p,t,f){base.p.set(...p);base.t.set(...t);base.f=f;},
    lockVec(p,t){base.p.copy(p);base.t.copy(t);},
    shake(a){if(settings.reduceMotion)a*=0.15;shake=Math.min(2.5,shake+a);},
    kick(a){if(!settings.reduceMotion)kick=Math.max(kick,a);},
    update(t,dt){
      if(mode==='menu')cam.setAuto(true);
      if(fly){fly.u=Math.min(1,fly.u+dt/fly.dur);const k=E(fly.u);camera.position.lerpVectors(from.p,to.p,k);cam.controls.target.lerpVectors(from.t,to.t,k);camera.fov=from.f+(to.f-from.f)*k;
        camera.lookAt(cam.controls.target);camera.updateProjectionMatrix();if(fly.u>=1){const r=fly.res;fly=null;base.p.copy(to.p);base.t.copy(to.t);base.f=to.f;r();}return;}
      if(mode==='locked'){camera.position.copy(base.p);cam.controls.target.copy(base.t);camera.fov=base.f-kick*4;
        if(shake>0){const s=shake*shake*3;camera.position.x+=(Math.random()-.5)*s;camera.position.y+=(Math.random()-.5)*s;camera.position.z+=(Math.random()-.5)*s;shake=Math.max(0,shake-dt*3.5);}
        kick=Math.max(0,kick-dt*3);camera.lookAt(base.t);camera.updateProjectionMatrix();return;}
      if(mode!=='free'&&camera.fov!==55){camera.fov+=(55-camera.fov)*Math.min(1,dt*3);camera.updateProjectionMatrix();}
      cam.update(t,dt);}};
  return rig;
}
