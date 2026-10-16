import * as THREE from 'three';
import {rng,windowTexture} from './util.js';
// dense megastructure district; keeps a clear zone for shipyard (+x) and energy core (centre)
export function buildTowers(scene,{seed=3,radius=520,count=1500,clear=[],low=false}={}){
  const r=rng(seed),grp=new THREE.Group();scene.add(grp);
  const tex=new THREE.CanvasTexture(windowTexture(seed));tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  const mat=new THREE.MeshStandardMaterial({color:0x161616,metalness:0.9,roughness:0.32,emissive:0xffffff,emissiveIntensity:1});
  // procedural world-space windows so tall towers never stretch
  const U={uNight:{value:1},uWaveR:{value:2000},uFlare:{value:0},uDim:{value:new Array(8).fill(1)},uT:{value:0}};
  if(low)mat.defines={OZ_LOW:''};
  mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;varying vec3 vWN;')
    .replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 wpX=modelMatrix*instanceMatrix*vec4(transformed,1.);vWP=wpX.xyz;vWN=normalize(mat3(modelMatrix*instanceMatrix)*objectNormal);');
   sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vWP;varying vec3 vWN;uniform float uNight,uWaveR,uFlare,uT;uniform float uDim[8];float hh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float twWin(vec3 wp,vec3 wn){float hor=abs(wn.x)>abs(wn.z)?wp.z:wp.x;float ty=hh(floor(wp.xz/30.)+.37);vec2 cs=ty<.25?vec2(2.2,3.2):ty<.5?vec2(1.2,4.):ty<.75?vec2(4.5,2.6):vec2(.8,1.6);vec2 f=fract(vec2(hor/cs.x,wp.y/cs.y));
 return ty<.5?step(.2,f.x)*step(f.x,.8)*step(.25,f.y)*step(f.y,.75):ty<.75?step(.1,f.x)*step(.4,f.y)*step(f.y,.6):step(.35,f.x)*step(f.x,.65)*step(.15,f.y);}`)
   .replace('#include <map_fragment>','#include <map_fragment>\nfloat twId=hh(floor(vWP.xz/30.)+5.1);float twG=twWin(vWP,vWN)*step(abs(vWN.y),.5);diffuseColor.rgb*=mix(.55+.9*twId,.35,twG);')
   .replace('#include <roughnessmap_fragment>','float roughnessFactor=mix(mix(.22,.78,hh(floor(vWP.xz/30.)+9.3)),.05,twG);')
   .replace('#include <metalnessmap_fragment>','float metalnessFactor=mix(mix(.25,.95,twId),.95,twG);')
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     #ifndef OZ_LOW
     {vec3 up=vec3(0,1,0);vec3 tg=normalize(cross(up,vWN)+1e-4);float hor=dot(vWP,tg);float sx=fract(hor/4.),sy=fract(vWP.y/4.);
      float dx=(smoothstep(.0,.06,sx)-smoothstep(.94,1.,sx)),dy=(smoothstep(.0,.05,sy)-smoothstep(.95,1.,sy));
      vec3 pert=tg*(sx<.5?-1.:1.)*(1.-dx)+up*(sy<.5?-1.:1.)*(1.-dy);if(abs(vWN.y)<.5)normal=normalize(normal+(viewMatrix*vec4(pert*.35,0.)).xyz);}
     #endif`)
    .replace('#include <emissivemap_fragment>',`float hor=abs(vWN.x)>abs(vWN.z)?vWP.z:vWP.x;float ty=hh(floor(vWP.xz/30.)+.37);vec2 cs=ty<.25?vec2(2.2,3.2):ty<.5?vec2(1.2,4.):ty<.75?vec2(4.5,2.6):vec2(.8,1.6);
     vec2 c=vec2(hor/cs.x,vWP.y/cs.y);vec2 id=floor(c),f=fract(c);
     float win=ty<.5?step(.2,f.x)*step(f.x,.8)*step(.25,f.y)*step(f.y,.75):ty<.75?step(.1,f.x)*step(.4,f.y)*step(f.y,.6):step(.35,f.x)*step(f.x,.65)*step(.15,f.y);
     float r=hh(id+floor(vWP.xz/40.));if(ty>.88)r=hh(vec2(id.y,floor(vWP.x/40.)));
     float lit=step(.7,r)*(.45+.55*hh(id*1.7));float band=step(.985,fract(vWP.y/48.))*0.9;
     float top=abs(vWN.y)>.5?0.:1.;totalEmissiveRadiance*=top*max(win*lit,band)*smoothstep(0.,20.,vWP.y+2.);
     float dC=length(vWP.xz);float on=smoothstep(uWaveR+30.,uWaveR-30.,dC+hh(floor(vWP.xz/30.))*60.);float front=exp(-abs(dC-uWaveR)*0.03)*step(.01,uNight)*step(uWaveR,1400.);
     float ang=atan(vWP.z,vWP.x);int si=int(mod(floor((ang+3.14159265)/6.2831853*8.),8.));float dim=uDim[0];for(int k=1;k<8;k++){if(k==si)dim=uDim[k];}
     totalEmissiveRadiance*=(mix(.12,1.,on)+front*1.6)*dim*(1.+uFlare*(1.2+.8*sin(dC*.05-uT*9.)))*(.92+.08*sin(dC*.02-uT*1.3));`);};
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
  return {group:grp,towers,U,mat,update(t){tex.offset.y=Math.floor(t*0.5)*0.0005;}};
}
