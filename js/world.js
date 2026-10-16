import * as THREE from 'three';
// sky dome, ground grid, stars, fog
export function buildWorld(scene){
  scene.background=new THREE.Color(0x020202);
  scene.fog=new THREE.FogExp2(0x060606,0.0009);
  scene.add(new THREE.HemisphereLight(0x8a8a8a,0x050505,0.35));
  const d=new THREE.DirectionalLight(0xffffff,0.5);d.position.set(-300,400,-200);scene.add(d);
  // ground with fine grid
  const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
  g.fillStyle='#050505';g.fillRect(0,0,512,512);g.strokeStyle='#2a2a2a';g.lineWidth=1;
  for(let i=0;i<=512;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i,512);g.moveTo(0,i);g.lineTo(512,i);g.stroke();}
  g.strokeStyle='#5a5a5a';g.lineWidth=3;g.strokeRect(0,0,512,512);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(60,60);t.anisotropy=8;
  const ground=window.__ground=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshStandardMaterial({map:t,roughness:0.12,metalness:0.9,emissiveMap:t,emissive:0x444444,emissiveIntensity:0.25}));
  ground.material.metalness=0.05;ground.material.roughness=0.8;ground.material.color.setScalar(0.55);
  const GU={uWet:{value:0}};ground.userData.U=GU;
  // wet concrete: aggregate noise in albedo/roughness, puddles that turn mirror-smooth as uWet rises
  ground.material.onBeforeCompile=sh=>{Object.assign(sh.uniforms,GU);sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGP;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvGP=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vGP;uniform float uWet;float gh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}float gn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(gh(i),gh(i+vec2(1,0)),f.x),mix(gh(i+vec2(0,1)),gh(i+vec2(1,1)),f.x),f.y);}')
     .replace('#include <map_fragment>','#include <map_fragment>\nfloat agg=gn(vGP.xz*.9)*.5+gn(vGP.xz*4.)*.3+gh(floor(vGP.xz*20.))*.2;float pud=smoothstep(.62-uWet*.25,.7-uWet*.25,gn(vGP.xz*.03)*.6+gn(vGP.xz*.11)*.4);diffuseColor.rgb*=(.7+.5*agg)*mix(1.,.45,pud*uWet);')
     .replace('#include <roughnessmap_fragment>','float roughnessFactor=mix(.72+.2*agg,.12,uWet*.6);roughnessFactor=mix(roughnessFactor,.02,pud*uWet);');};
  ground.rotation.x=-Math.PI/2;scene.add(ground);
  // stars
  const n=3000,p=new Float32Array(n*3);for(let i=0;i<n;i++){const th=Math.random()*Math.PI*2,ph=Math.random()*Math.PI*0.45,R=1800;
    p[i*3]=R*Math.sin(ph)*Math.cos(th);p[i*3+1]=R*Math.cos(ph)+50;p[i*3+2]=R*Math.sin(ph)*Math.sin(th);}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(p,3));
  const stars=new THREE.Points(sg,new THREE.PointsMaterial({transparent:true,color:0xffffff,size:1.6*(+new URLSearchParams(location.search).get('stars')||1),sizeAttenuation:false,fog:false}));scene.add(stars);
  // distant planet / gate moon
  const moon=new THREE.Mesh(new THREE.SphereGeometry(160,64,32),new THREE.MeshStandardMaterial({color:0x777777,roughness:1,emissive:0x111111,fog:false}));
  moon.position.set(700,650,-1400);scene.add(moon);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(260,1.2,8,200),new THREE.MeshBasicMaterial({color:0xbbbbbb,fog:false}));
  halo.position.copy(moon.position);halo.rotation.set(1.2,0.3,0);scene.add(halo);
  return {stars,ground,moon,halo,update(){} };
}
