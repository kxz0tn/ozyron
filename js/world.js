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
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshStandardMaterial({map:t,roughness:0.12,metalness:0.9,emissiveMap:t,emissive:0x444444,emissiveIntensity:0.25}));
  ground.rotation.x=-Math.PI/2;scene.add(ground);
  // stars
  const n=3000,p=new Float32Array(n*3);for(let i=0;i<n;i++){const th=Math.random()*Math.PI*2,ph=Math.random()*Math.PI*0.45,R=1800;
    p[i*3]=R*Math.sin(ph)*Math.cos(th);p[i*3+1]=R*Math.cos(ph)+50;p[i*3+2]=R*Math.sin(ph)*Math.sin(th);}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(p,3));
  scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,fog:false})));
  // distant planet / gate moon
  const moon=new THREE.Mesh(new THREE.SphereGeometry(160,64,32),new THREE.MeshStandardMaterial({color:0x777777,roughness:1,emissive:0x111111,fog:false}));
  moon.position.set(700,650,-1400);scene.add(moon);
  const halo=new THREE.Mesh(new THREE.TorusGeometry(260,1.2,8,200),new THREE.MeshBasicMaterial({color:0xbbbbbb,fog:false}));
  halo.position.copy(moon.position);halo.rotation.set(1.2,0.3,0);scene.add(halo);
  return {update(){} };
}
