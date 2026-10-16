import * as THREE from 'three';
// human-scale cues (1 unit = 1 m): street lamps on the grid, plaza railings, pedestrians walking the core plaza
export function buildScale(scene,{tier,clear}){const g=new THREE.Group();scene.add(g);
  const pole=new THREE.MeshStandardMaterial({color:0x5a5a5a,metalness:0.8,roughness:0.45}),lampM=new THREE.MeshBasicMaterial({color:0xffffff});
  const pts=[];for(let k=-9;k<=9;k++)for(let s=-540;s<=540;s+=24){for(const [x,z] of [[k*55+5.5,s],[s,k*55+5.5]]){const d=Math.hypot(x,z);if(d<140||d>560||clear.some(c=>Math.hypot(x-c.x,z-c.z)<c.r))continue;pts.push([x,z]);}}
  const N=Math.min(pts.length,{low:300,med:800,high:1600,ultra:2400}[tier.label]);const step=pts.length/N;
  const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09,0.14,7,6).translate(0,3.5,0),pole,N),heads=new THREE.InstancedMesh(new THREE.BoxGeometry(1.4,0.18,0.35),lampM,N);
  const o=new THREE.Object3D();for(let i=0;i<N;i++){const [x,z]=pts[Math.floor(i*step)];o.position.set(x,0,z);o.rotation.set(0,0,0);o.updateMatrix();poles.setMatrixAt(i,o.matrix);o.position.y=7;o.updateMatrix();heads.setMatrixAt(i,o.matrix);}
  g.add(poles,heads);
  // plaza railing ring + pedestrians (1.75 m) strolling at ~1.3 m/s
  const rail=new THREE.Mesh(new THREE.TorusGeometry(132,0.05,4,256),lampM);rail.rotation.x=Math.PI/2;rail.position.y=1.1;g.add(rail);
  const NP={low:0,med:300,high:600,ultra:900}[tier.label];const peds=new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22,1.3,2,6).translate(0,0.87,0),new THREE.MeshStandardMaterial({color:0x9a9a9a,roughness:0.8,metalness:0}),NP);
  const P=[];for(let i=0;i<NP;i++)P.push({r:66+Math.random()*58,a:Math.random()*6.283,v:(Math.random()<0.5?-1:1)*(1.1+Math.random()*0.5),ph:Math.random()*6});
  peds.frustumCulled=false;g.add(peds);
  return {group:g,update(t,dt){if(!NP)return;for(let i=0;i<NP;i++){const p=P[i];p.a+=p.v*dt/p.r;o.position.set(Math.cos(p.a)*p.r,Math.abs(Math.sin(t*5.5+p.ph))*0.04,Math.sin(p.a)*p.r);o.rotation.set(0,-p.a,0);o.updateMatrix();peds.setMatrixAt(i,o.matrix);}peds.instanceMatrix.needsUpdate=true;}};
}
