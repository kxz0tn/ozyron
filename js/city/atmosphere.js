import * as THREE from 'three';
// volumetric-style haze around the beam, light shafts, low ground fog sheets and sweeping searchlights
const V='varying vec2 vU;varying vec3 vW;varying vec3 vN;varying vec3 vV;void main(){vU=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}';
const NOISE='float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n2(p);p*=2.03;a*=.5;}return s;}';
export function buildAtmosphere(scene,{towers,tier}){
  const g=new THREE.Group();scene.add(g);const mats=[];
  const add=(geo,frag,uni={},pos=[0,0,0])=>{const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{t:{value:0},k:{value:1},...uni},vertexShader:V,fragmentShader:'uniform float t,k;varying vec2 vU;varying vec3 vW;varying vec3 vN;varying vec3 vV;'+NOISE+frag});
    const me=new THREE.Mesh(geo,m);me.position.set(...pos);g.add(me);mats.push(m);return me;};
  // beam haze: nested soft shells with drifting noise -> reads as scattering in thick air
  const shells=[];
  if(tier.shafts){[22,40,70].forEach((r,i)=>shells.push(add(new THREE.CylinderGeometry(r*0.7,r,560,40,1,true),
    `void main(){float f=pow(abs(dot(vN,vV)),2.5);float nz=fbm(vec2(atan(vW.z,vW.x)*3.+t*.2,vW.y*.012-t*.35));
     float fade=smoothstep(0.,.08,vU.y)*smoothstep(1.,.75,vU.y);gl_FragColor=vec4(vec3(1.),f*fade*(.35+.65*nz)*${(0.16/(i+1)).toFixed(3)}*k);}`,{},[0,290,0])));
    // god-ray shafts fanning down from the ring
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2,m=add(new THREE.PlaneGeometry(30,520),
      `void main(){float x=abs(vU.x-.5)*2.;float nz=fbm(vec2(vU.x*4.,vU.y*2.-t*.15));gl_FragColor=vec4(vec3(1.),pow(1.-x,2.)*smoothstep(0.,.5,vU.y)*smoothstep(1.,.9,vU.y)*nz*.06*k);}`,{},[Math.cos(a)*120,300,Math.sin(a)*120]);
      m.lookAt(0,300,0);shells.push(m);}}
  // low ground fog sheets
  const fogs=[];const nf=tier.shafts?4:2;for(let i=0;i<nf;i++){const m=add(new THREE.PlaneGeometry(1800,1800),
    `uniform float lay;void main(){vec2 p=vW.xz*.004;float nz=fbm(p+vec2(t*.015+lay,t*.01));float d=length(vW.xz);float core=exp(-d*.006)*.6;
     gl_FragColor=vec4(vec3(1.),smoothstep(.45,.9,nz)*(.05+core*.12)*k*smoothstep(1100.,300.,d));}`,{lay:{value:i*3.7}},[0,6+i*9,0]);m.rotation.x=-Math.PI/2;fogs.push(m);}
  // searchlights: cones on tall towers sweeping the sky
  const tall=towers.towers.filter(t=>t.h>170).sort((a,b)=>b.h-a.h).slice(0,tier.label==='low'?4:9);
  const coneG=new THREE.CylinderGeometry(0.6,26,700,24,1,true);coneG.translate(0,-350,0);coneG.rotateX(-Math.PI/2);// apex at origin, pointing -z... then +z after flip
  const lights=tall.map((tw,i)=>{const piv=new THREE.Object3D();piv.rotation.order='YXZ';piv.position.set(tw.x,tw.h+4,tw.z);g.add(piv);
    const c=new THREE.Mesh(coneG,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{t:{value:0},k:{value:1}},vertexShader:V,
      fragmentShader:'uniform float t,k;varying vec2 vU;varying vec3 vW;varying vec3 vN;varying vec3 vV;'+NOISE+`void main(){float along=vU.y;float f=pow(abs(dot(vN,vV)),1.4);float nz=.6+.4*fbm(vec2(vU.x*6.,along*5.-t*.3));
       gl_FragColor=vec4(vec3(1.),pow(along,2.2)*f*nz*.22*k);}`}));mats.push(c.material);c.rotation.y=Math.PI;piv.add(c);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(1.6,8,6),new THREE.MeshBasicMaterial({color:0xffffff}));piv.add(lamp);
    return {piv,ph:i*1.7,sp:0.12+((i*13)%7)*0.03};});
  const api={group:g,beamShells:shells,k:1,update(t,dt,env={}){const dn=env.dawn||0,boost=env.boost||1;
    mats.forEach(m=>{m.uniforms.t.value=t;m.uniforms.k.value=boost*(1-dn*0.55);});
    fogs.forEach(m=>m.material.uniforms.k.value=0.6+dn*1.4+(env.rain?0.8:0));
    lights.forEach(L=>{const a=t*L.sp+L.ph;L.piv.rotation.set(0.5+0.35*Math.sin(t*0.21+L.ph),a,0);L.piv.children[0].material.uniforms.k.value=(1-dn)*1.1;});}};
  return api;
}
