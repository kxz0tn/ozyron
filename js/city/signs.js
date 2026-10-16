import * as THREE from 'three';
import {rng} from '../util.js';
// holo-signs: only ozyron's own in-world wayfinding labels. no ads, no brands.
const LABELS=['OZYRON','SECTOR 01','SECTOR 04','SECTOR 07','SECTOR 12','CORE','TRANSIT','DOCK 02','DOCK 03','LEVEL 120','LEVEL 88','ASCEND','ORBIT LINK','GATE 7','NORTH RING','YARD','LIFT','GRID 9','RING ACCESS','OUTBOUND'];
function tex(label,vertical){const c=document.createElement('canvas');const f=64;const x=c.getContext('2d');
  if(vertical){c.width=96;c.height=label.length*f+40;}else{c.width=label.length*40+80;c.height=104;}
  x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#fff';x.lineWidth=3;x.strokeRect(6,6,c.width-12,c.height-12);
  x.fillStyle='#fff';x.font=`500 ${f*0.82}px ui-monospace,Menlo,Consolas,monospace`;x.textAlign='center';x.textBaseline='middle';
  if(vertical)[...label].forEach((ch,i)=>x.fillText(ch,48,40+i*f));else x.fillText(label,c.width/2,54);
  x.fillRect(16,c.height-18,vertical?64:c.width-32,3);
  const t=new THREE.CanvasTexture(c);t.anisotropy=4;return {t,w:c.width,h:c.height};}
export function buildSigns(scene,{towers}){
  const g=new THREE.Group();scene.add(g);const R=rng(17);const mats=[];
  const sh=(t)=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{map:{value:t},t:{value:0},seed:{value:R()*10},k:{value:1}},
    vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform sampler2D map;uniform float t,seed,k;varying vec2 vU;float h(float x){return fract(sin(x*91.3)*437.5);}
      void main(){float gl=step(.985,h(floor(t*12.)+seed))*.08;vec2 uv=vU+vec2(gl*sin(vU.y*80.),0.);float a=texture2D(map,uv).r;
       float scan=.75+.25*sin(vU.y*300.-t*6.);float fl=.85+.15*step(.3,h(floor(t*20.)+seed*3.));float boot=step(.04,h(floor(t*.5)+seed*7.));
       gl_FragColor=vec4(vec3(1.),a*scan*fl*mix(.25,1.,boot)*.9*k);}`});
  const cands=towers.towers.filter(t=>t.h>90&&Math.hypot(t.x,t.z)<480).sort(()=>R()-0.5).slice(0,34);
  cands.forEach((tw,i)=>{const label=LABELS[i%LABELS.length],vert=R()<0.55;const {t,w,h}=tex(label,vert);const s=vert?0.16:0.14;const m=sh(t);mats.push(m);
    const me=new THREE.Mesh(new THREE.PlaneGeometry(w*s,h*s),m);const a=Math.atan2(tw.z,tw.x);const r=tw.w*0.55+1.5;
    me.position.set(tw.x+Math.cos(a)*r,tw.h*(0.55+R()*0.3),tw.z+Math.sin(a)*r);me.lookAt(tw.x+Math.cos(a)*(r+10),me.position.y,tw.z+Math.sin(a)*(r+10));g.add(me);});
  // large ring around the core plaza
  {const {t,w,h}=tex('OZYRON CORE',false);const m=sh(t);mats.push(m);for(let k=0;k<4;k++){const me=new THREE.Mesh(new THREE.PlaneGeometry(w*0.22,h*0.22),m);const a=k*Math.PI/2+0.4;me.position.set(Math.cos(a)*48,62,Math.sin(a)*48);me.lookAt(Math.cos(a)*100,62,Math.sin(a)*100);g.add(me);}}
  return {group:g,update(t,dt,env={}){mats.forEach(m=>{m.uniforms.t.value=t;m.uniforms.k.value=1-(env.dawn||0)*0.5;});}};
}
