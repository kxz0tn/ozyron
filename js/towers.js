import * as THREE from 'three';
import {rng,windowTexture} from './util.js';
// dense megastructure district; keeps a clear zone for shipyard (+x) and energy core (centre)
export function buildTowers(scene,{seed=3,radius=520,count=1500,clear=[]}={}){
  const r=rng(seed),grp=new THREE.Group();scene.add(grp);
  const tex=new THREE.CanvasTexture(windowTexture(seed));tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  const mat=new THREE.MeshStandardMaterial({color:0x161616,metalness:0.9,roughness:0.32,emissive:0xffffff,emissiveIntensity:1});
  // procedural world-space windows so tall towers never stretch
  mat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vWN;')
    .replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 wpX=modelMatrix*instanceMatrix*vec4(transformed,1.);vWP=wpX.xyz;vWN=normalize(mat3(modelMatrix*instanceMatrix)*objectNormal);');
   sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vWN;float hh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}')
    .replace('#include <emissivemap_fragment>',`float hor=abs(vWN.x)>abs(vWN.z)?vWP.z:vWP.x;float ty=hh(floor(vWP.xz/30.)+.37);vec2 cs=ty<.25?vec2(2.2,3.2):ty<.5?vec2(1.2,4.):ty<.75?vec2(4.5,2.6):vec2(.8,1.6);
     vec2 c=vec2(hor/cs.x,vWP.y/cs.y);vec2 id=floor(c),f=fract(c);
     float win=ty<.5?step(.2,f.x)*step(f.x,.8)*step(.25,f.y)*step(f.y,.75):ty<.75?step(.1,f.x)*step(.4,f.y)*step(f.y,.6):step(.35,f.x)*step(f.x,.65)*step(.15,f.y);
     float r=hh(id+floor(vWP.xz/40.));if(ty>.88)r=hh(vec2(id.y,floor(vWP.x/40.)));
     float lit=step(.7,r)*(.45+.55*hh(id*1.7));float band=step(.985,fract(vWP.y/48.))*0.9;
     float top=abs(vWN.y)>.5?0.:1.;totalEmissiveRadiance*=top*max(win*lit,band)*smoothstep(0.,20.,vWP.y+2.);`);};
  const twist=new THREE.BoxGeometry(1,1,1,1,24,1);{const pa=twist.attributes.position,v=new THREE.Vector3();for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i);const a=(v.y+0.5)*0.9,c=Math.cos(a),sn=Math.sin(a),k=1-0.25*(v.y+0.5);pa.setXYZ(i,(v.x*c-v.z*sn)*k,v.y,(v.x*sn+v.z*c)*k);}twist.computeVertexNormals();}
  const geos=[new THREE.BoxGeometry(1,1,1),new THREE.CylinderGeometry(0.5,0.5,1,8),new THREE.CylinderGeometry(0.35,0.5,1,6),twist,new THREE.CylinderGeometry(0.42,0.5,1,3),new THREE.CylinderGeometry(0.3,0.55,1,24)];
  geos.forEach(g=>g.translate(0,0.5,0));
  const meshes=geos.map(g=>{const m=new THREE.InstancedMesh(g,mat,count);m.count=0;grp.add(m);return m;});
  const capMat=new THREE.MeshBasicMaterial({color:0xffffff});
  const caps=new THREE.InstancedMesh(new THREE.SphereGeometry(0.6,8,6),capMat,count);caps.count=0;grp.add(caps);
  const spireG=new THREE.CylinderGeometry(0.05,0.4,1,6);spireG.translate(0,0.5,0);
  const spires=new THREE.InstancedMesh(spireG,new THREE.MeshStandardMaterial({color:0x333333,metalness:1,roughness:0.2}),count);spires.count=0;grp.add(spires);
  const M=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  const towers=[];
  for(let i=0;i<count*8&&towers.length<count;i++){
    const a=r()*Math.PI*2,d=60+Math.pow(r(),0.7)*radius,x=Math.cos(a)*d,z=Math.sin(a)*d;
    if(clear.some(c=>Math.hypot(x-c.x,z-c.z)<c.r))continue;
    const w0=9+r()*22,nr=v=>Math.abs(v-Math.round(v/55)*55);if(nr(x)<w0*0.5+4.5||nr(z)<w0*0.5+4.5)continue;
    const core=Math.max(0,1-d/radius),h=20+Math.pow(r(),2.2)*230*(0.35+core*1.3),w=w0;
    const k=Math.floor(r()*6),m=meshes[k];
    // tiers: 1-3 stacked setbacks
    let y=0,tw=w,tiers=1+Math.floor(r()*3);
    for(let t=0;t<tiers;t++){const th=h/tiers*(t?0.8:1.2);
      q.setFromAxisAngle(up,r()*Math.PI);s.set(tw,th,tw*(0.7+r()*0.6));p.set(x,y,z);M.compose(p,q,s);m.setMatrixAt(m.count++,M);y+=th;tw*=0.68;}
    if(h>120){s.set(1,h*0.25,1);p.set(x,y,z);M.compose(p,q.identity(),s);spires.setMatrixAt(spires.count++,M);
      s.set(1.4,1.4,1.4);p.set(x,y+h*0.25,z);M.compose(p,q,s);caps.setMatrixAt(caps.count++,M);}
    towers.push({x,z,h:y,w:tw/0.68});
  }
  [...meshes,caps,spires].forEach(m=>m.instanceMatrix.needsUpdate=true);
  return {group:grp,towers,update(t){tex.offset.y=Math.floor(t*0.5)*0.0005;}};
}
