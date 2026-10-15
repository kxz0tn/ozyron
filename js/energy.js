import * as THREE from 'three';
// space energy system: orbital collector ring + beam down to core reactor + glowing conduits out to the city
export function buildEnergy(scene,{conduits=10,reach=480}={}){
  const g=new THREE.Group();scene.add(g);
  // reactor plaza: lit ring pads + uplights so the core reads
  const plaza=new THREE.Mesh(new THREE.CircleGeometry(130,64),new THREE.MeshStandardMaterial({color:0x202020,metalness:0.6,roughness:0.4}));plaza.rotation.x=-Math.PI/2;plaza.position.y=0.3;g.add(plaza);
  [60,95,128].forEach(R=>{const m=new THREE.Mesh(new THREE.TorusGeometry(R,0.6,6,160),new THREE.MeshBasicMaterial({color:0xdddddd}));m.rotation.x=Math.PI/2;m.position.y=0.8;g.add(m);});
  [40,120,200,280].forEach((y,i)=>{const l=new THREE.PointLight(0xffffff,6,260,1.2);l.position.set(Math.cos(i*1.6)*35,y,Math.sin(i*1.6)*35);g.add(l);});
  const white=new THREE.MeshBasicMaterial({color:0xffffff});
  const metal=new THREE.MeshStandardMaterial({color:0x8a8a8a,metalness:0.4,roughness:0.4,emissive:0x1a1a1a});
  // reactor spire
  const base=new THREE.Mesh(new THREE.CylinderGeometry(26,40,30,48),metal);base.position.y=15;g.add(base);
  const spire=new THREE.Mesh(new THREE.CylinderGeometry(4,14,320,24),metal);spire.position.y=190;g.add(spire);
  for(let i=0;i<8;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(16-i*1.2,0.8,8,64),white);r.rotation.x=Math.PI/2;r.position.y=50+i*36;g.add(r);}
  // orbital collector rings
  const orbit=new THREE.Group();orbit.position.y=560;g.add(orbit);
  const rings=[];
  const rc=document.createElement('canvas');rc.width=1024;rc.height=32;{const x=rc.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,1024,32);for(let i=0;i<1024;i+=16){x.fillStyle=i%64?'#3a3a3a':'#fff';x.fillRect(i,i%64?14:4,i%64?6:10,i%64?4:24);}}
  const rt=new THREE.CanvasTexture(rc);rt.wrapS=THREE.RepeatWrapping;rt.repeat.set(4,1);
  const ringMat=new THREE.MeshStandardMaterial({color:0xb4b4b4,metalness:0.85,roughness:0.22,emissive:0xffffff,emissiveMap:rt,emissiveIntensity:0.9});
  [0,1,2,3].forEach(i=>{const l=new THREE.PointLight(0xffffff,30,420,1.1);l.position.set(Math.cos(i*1.57)*120,i%2?60:-50,Math.sin(i*1.57)*120);orbit.add(l);});
  const nav=[];for(let i=0;i<24;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(1.4,8,6),new THREE.MeshBasicMaterial({color:0xffffff}));const a=i/24*Math.PI*2;m.position.set(Math.cos(a)*210,0,Math.sin(a)*210);orbit.add(m);nav.push(m);}
  [[180,2.2],[150,1],[210,0.6]].forEach(([R,t],i)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(R,i?t:4,i?12:24,256),i?metal:ringMat);m.rotation.x=Math.PI/2+(i-1)*0.12;orbit.add(m);rings.push(m);});
  const panels=new THREE.InstancedMesh(new THREE.BoxGeometry(18,0.6,34),new THREE.MeshStandardMaterial({color:0x2a2a2a,metalness:0.6,roughness:0.3,emissive:0x5a5a5a}),48);{const pc=document.createElement('canvas');pc.width=64;pc.height=128;const x=pc.getContext('2d');x.fillStyle='#222';x.fillRect(0,0,64,128);x.fillStyle='#bbb';for(let a=4;a<60;a+=10)for(let b=4;b<124;b+=10)x.fillRect(a,b,7,7);panels.material.emissiveMap=new THREE.CanvasTexture(pc);}
  const M=new THREE.Matrix4(),o=new THREE.Object3D();
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2;o.position.set(Math.cos(a)*180,0,Math.sin(a)*180);o.rotation.set(0,-a,0.3);o.updateMatrix();panels.setMatrixAt(i,o.matrix);}
  orbit.add(panels);
  const edges=new THREE.InstancedMesh(new THREE.BoxGeometry(18.6,0.3,0.3),new THREE.MeshBasicMaterial({color:0xcfcfcf}),96),spars=new THREE.InstancedMesh(new THREE.BoxGeometry(0.5,0.5,34),new THREE.MeshStandardMaterial({color:0x555555,metalness:1,roughness:0.3}),48);
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2;[-17.2,17.2].forEach((dz,k)=>{o.position.set(Math.cos(a)*180,0,Math.sin(a)*180);o.rotation.set(0,-a,0.3);o.translateZ(dz);o.translateY(0.4);o.updateMatrix();edges.setMatrixAt(i*2+k,o.matrix);});
    o.position.set(Math.cos(a+Math.PI/48)*180,0,Math.sin(a+Math.PI/48)*180);o.rotation.set(0,-a-Math.PI/48,0.3);o.updateMatrix();spars.setMatrixAt(i,o.matrix);}
  orbit.add(edges,spars);
  // beam (additive, pulsing)
  const beamMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{t:{value:0}},
    vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float t;varying vec2 vU;void main(){float e=pow(1.-abs(vU.x-.5)*2.,3.);float p=.6+.4*sin(vU.y*80.-t*12.);gl_FragColor=vec4(vec3(1.),e*p*.85);}'});
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(3,7,520,24,1,true),beamMat);beam.position.y=300;g.add(beam);
  // beam detail: rising energy rings + helix of motes
  const bRings=[];for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.TorusGeometry(9,0.35,6,48),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.rotation.x=Math.PI/2;g.add(m);bRings.push(m);}
  const HN=600,hp=new Float32Array(HN*3),hg=new THREE.BufferGeometry();hg.setAttribute('position',new THREE.BufferAttribute(hp,3));
  g.add(new THREE.Points(hg,new THREE.PointsMaterial({color:0xffffff,size:1.4,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})));
  // conduits: ground cables with travelling pulses
  const pulses=[];const pulseG=new THREE.SphereGeometry(1.6,8,6);
  for(let i=0;i<conduits;i++){const a=i/conduits*Math.PI*2+0.2,pts=[];
    for(let k=0;k<=24;k++){const d=40+k/24*reach,w=Math.sin(k*0.5+i)*0.08;pts.push(new THREE.Vector3(Math.cos(a+w)*d,1.2+Math.sin(k/24*Math.PI)*6,Math.sin(a+w)*d));}
    const c=new THREE.CatmullRomCurve3(pts);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(c,120,0.7,6),new THREE.MeshBasicMaterial({color:0xcfcfcf})));
    for(let j=0;j<4;j++){const m=new THREE.Mesh(pulseG,white);g.add(m);pulses.push({m,c,o:j/4+i*0.13});}
  }
  const light=new THREE.PointLight(0xffffff,4,600,1.2);light.position.y=80;g.add(light);
  return {group:g,update(t){beamMat.uniforms.t.value=t;orbit.rotation.y=t*0.03;rt.offset.x=-t*0.05;nav.forEach((m,i)=>m.visible=((Math.floor(t*4)+i)%6)<2);rings[1].rotation.z=t*0.1;rings[2].rotation.z=-t*0.06;
    for(let i=0;i<10;i++){const u=((i/10)+t*0.05)%1,m=bRings[i];m.position.y=40+u*520;m.material.opacity=Math.sin(u*Math.PI)*0.8;m.scale.setScalar(1+Math.sin(t*2+i)*0.15);}
    for(let i=0;i<HN;i++){const u=((i/HN)+t*0.03)%1,a=u*90+t*1.5+(i%2)*Math.PI;hp[i*3]=Math.cos(a)*14;hp[i*3+1]=40+u*520;hp[i*3+2]=Math.sin(a)*14;}hg.attributes.position.needsUpdate=true;
    light.intensity=3.5+Math.sin(t*3)*0.8;
    for(const p of pulses){p.c.getPointAt((p.o+t*0.08)%1,p.m.position);}}};
}
