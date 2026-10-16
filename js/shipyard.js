import * as THREE from 'three';
import {rng,pointCloud} from './particles.js';
// spaceship factory: dock, gantries, ship under construction, articulated assembly arms with weld sparks
export function shipHull(metal,white){
  const s=new THREE.Group();
  const prof=[];for(let i=0;i<=20;i++){const u=i/20;prof.push(new THREE.Vector2(Math.sin(u*Math.PI)**0.6*9*(1-u*0.35)+0.3,u*110-55));}
  const hull=new THREE.Mesh(new THREE.LatheGeometry(prof,24),metal);hull.rotation.z=Math.PI/2;s.add(hull);
  // sculpted swept delta wings (extruded + bevelled), with leading-edge light
  const ws=new THREE.Shape();ws.moveTo(20,0);ws.bezierCurveTo(6,8,-18,26,-34,40);ws.lineTo(-40,38);ws.bezierCurveTo(-36,22,-34,10,-30,0);ws.lineTo(20,0);
  const wingG=new THREE.ExtrudeGeometry(ws,{depth:0.6,bevelEnabled:true,bevelThickness:0.9,bevelSize:0.8,bevelSegments:3,curveSegments:24});wingG.rotateX(Math.PI/2);
  const edgeC=new THREE.CubicBezierCurve3(new THREE.Vector3(20,0,0),new THREE.Vector3(6,0,8),new THREE.Vector3(-18,0,26),new THREE.Vector3(-34,0,40));
  [-1,1].forEach(k=>{const w=new THREE.Mesh(wingG,metal);w.scale.z=k;w.position.set(-4,-1,0);w.rotation.x=k*0.12;s.add(w);
    const eg=new THREE.Mesh(new THREE.TubeGeometry(edgeC,40,0.35,6),white);eg.scale.z=k;eg.position.set(-4,-0.5,0);eg.rotation.x=k*0.12;s.add(eg);
    const e=new THREE.Mesh(new THREE.CylinderGeometry(3.2,4,22,16),metal);e.rotation.z=Math.PI/2;e.position.set(-44,0,k*12);s.add(e);
    const glow=new THREE.Mesh(new THREE.CircleGeometry(2.8,16),white);glow.rotation.y=-Math.PI/2;glow.position.set(-55.1,0,k*12);s.add(glow);});
  // hull greebles: panels, vents, antennae scattered on the skin
  const gr=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x7a7a7a,metalness:0.8,roughness:0.4}),260),go=new THREE.Object3D();
  for(let i=0;i<260;i++){const x=-50+Math.random()*82,u=(x+55)/110,R=Math.sin(u*Math.PI)**0.6*9*(1-u*0.35)+0.3,a=Math.random()*Math.PI*2;
    go.position.set(x,Math.cos(a)*R,Math.sin(a)*R);go.rotation.set(a,0,0);go.scale.set(1+Math.random()*5,0.4+Math.random()*0.8,0.8+Math.random()*2.5);go.updateMatrix();gr.setMatrixAt(i,go.matrix);}
  s.add(gr);
  const pn=new THREE.InstancedMesh(new THREE.BoxGeometry(1,0.1,1),new THREE.MeshBasicMaterial({color:0x6e6e6e}),120);
  for(let i=0;i<120;i++){const x=-45+Math.random()*70,u=(x+55)/110,R=Math.sin(u*Math.PI)**0.6*9*(1-u*0.35)+0.45,a=Math.random()*Math.PI*2;go.position.set(x,Math.cos(a)*R,Math.sin(a)*R);go.rotation.set(a,0,0);go.scale.set(2+Math.random()*3,1,0.3);go.updateMatrix();pn.setMatrixAt(i,go.matrix);}
  s.add(pn);
  // hull light seams + cockpit canopy + dorsal fin
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2,sm=new THREE.Mesh(new THREE.BoxGeometry(70,0.25,0.25),white);sm.position.set(-8,Math.cos(a)*8.2,Math.sin(a)*8.2);s.add(sm);}
  const can=new THREE.Mesh(new THREE.SphereGeometry(4,16,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshBasicMaterial({color:0xeeeeee}));can.scale.set(2.2,0.8,1);can.position.set(32,6,0);s.add(can);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(26,14,0.8),metal);fin.position.set(-32,12,0);fin.rotation.z=-0.3;s.add(fin);
  // exposed ribs (unfinished section)
  for(let i=0;i<9;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(10.5,0.35,6,32),new THREE.MeshBasicMaterial({color:0x9a9a9a}));r.rotation.y=Math.PI/2;r.position.x=10+i*4;s.add(r);}
  return s;
}
export function buildShipyard(scene,{x=330,z=-120}={}){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=-0.5;scene.add(g);
  const metal=new THREE.MeshStandardMaterial({color:0xc8c8c8,metalness:0.25,roughness:0.45,emissive:0x2a2a2a});
  const dark=new THREE.MeshStandardMaterial({color:0x121212,metalness:0.9,roughness:0.4});
  const white=new THREE.MeshBasicMaterial({color:0xffffff});
  const pad=new THREE.Mesh(new THREE.BoxGeometry(220,4,120),dark);pad.position.y=2;g.add(pad);
  // edge light strips
  [-58,58].forEach(zz=>{const l=new THREE.Mesh(new THREE.BoxGeometry(220,0.6,0.8),white);l.position.set(0,4.4,zz);g.add(l);});
  // gantries
  const beam=new THREE.BoxGeometry(2,1,2);
  for(let i=-2;i<=2;i++){const gx=i*40;
    [-48,48].forEach(zz=>{const c=new THREE.Mesh(new THREE.BoxGeometry(3,90,3),metal);c.position.set(gx,49,zz);g.add(c);
      for(let y=10;y<90;y+=12){const b=new THREE.Mesh(beam,dark);b.scale.set(1,1,1);b.position.set(gx,y,zz);g.add(b);}});
    const top=new THREE.Mesh(new THREE.BoxGeometry(3,3,100),metal);top.position.set(gx,94,0);g.add(top);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(1,0.6,60),white);lamp.position.set(gx,92,0);g.add(lamp);}
  // trusses: X-bracing on every gantry leg pair + roof lattice
  const brM=new THREE.MeshStandardMaterial({color:0x6a6a6a,metalness:0.8,roughness:0.35});
  for(let i=-2;i<2;i++)[-48,48].forEach(zz=>{for(let y=4;y<88;y+=21){[[1,1],[1,-1]].forEach(([_,d])=>{const b=new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(40,21),0.8,0.8),brM);
    b.position.set(i*40+20,y+10.5,zz);b.rotation.z=d*Math.atan2(21,40);g.add(b);});}});
  for(let i=-2;i<=2;i++)for(let zz=-45;zz<=45;zz+=15){const b=new THREE.Mesh(new THREE.BoxGeometry(1,1,Math.hypot(15,8)),brM);b.position.set(i*40,90,zz+7.5);b.rotation.x=Math.atan2(8,15);g.add(b);}
  // ship cradle: curved saddles with struts
  [-30,0,30].forEach(cx=>{const sad=new THREE.Mesh(new THREE.TorusGeometry(11,1.1,8,24,Math.PI),brM);sad.position.set(cx,40,0);sad.rotation.set(0,Math.PI/2,Math.PI);g.add(sad);
    [-9,9].forEach(zz=>{const st=new THREE.Mesh(new THREE.BoxGeometry(2,36,2),brM);st.position.set(cx,22,zz);st.rotation.x=zz>0?-0.12:0.12;g.add(st);});
    const strip=new THREE.Mesh(new THREE.TorusGeometry(11.9,0.2,4,24,Math.PI),white);strip.position.copy(sad.position);strip.rotation.copy(sad.rotation);g.add(strip);});
  const rail=new THREE.Mesh(new THREE.BoxGeometry(200,2,2),metal);[-40,40].forEach(zz=>{const r=rail.clone();r.position.set(0,94,zz);g.add(r);});
  // crane trolley
  const trolley=new THREE.Mesh(new THREE.BoxGeometry(10,5,84),dark);trolley.position.y=90;g.add(trolley);
  const cable=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,40,4),white);cable.position.y=-22;trolley.add(cable);
  // floodlights
  [[-70,70,0],[70,70,0],[0,30,60],[0,30,-60],[0,85,0],[-40,20,40],[40,20,-40]].forEach(q=>{const l=new THREE.PointLight(0xffffff,16,260,1.1);l.position.set(...q);g.add(l);});
  // ship
  const ship=shipHull(metal,white);ship.position.y=40;g.add(ship);
  // arms
  const arms=[],sparks=[];
  // sparks: real particle system. tiny additive points + short motion-blur streaks, velocity, gravity, bounce, short life, fading
  const R=rng(9137),SN=2400,sp=pointCloud(SN,{additive:true,soft:3.0});g.add(sp.pts);
  const streakG=new THREE.BufferGeometry();streakG.setAttribute('position',new THREE.BufferAttribute(new Float32Array(SN*6),3));streakG.setAttribute('color',new THREE.BufferAttribute(new Float32Array(SN*6),3));
  const streaks=new THREE.LineSegments(streakG,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0.9,blending:THREE.AdditiveBlending,depthWrite:false}));streaks.frustumCulled=false;g.add(streaks);
  const glowM=new THREE.SpriteMaterial({map:(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(0.15,'rgba(255,255,255,0.55)');gr.addColorStop(0.5,'rgba(255,255,255,0.08)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})(),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
  for(let i=0;i<6;i++){const side=i%2?1:-1,ax=-30+Math.floor(i/2)*30;
    const base=new THREE.Group();base.position.set(ax,4,side*40);g.add(base);
    base.add(new THREE.Mesh(new THREE.CylinderGeometry(4,5,4,16),dark));
    const s1=new THREE.Group();s1.position.y=2;base.add(s1);
    const l1=new THREE.Mesh(new THREE.BoxGeometry(2.4,26,2.4),metal);l1.position.y=13;s1.add(l1);
    const s2=new THREE.Group();s2.position.y=26;s1.add(s2);
    const l2=new THREE.Mesh(new THREE.BoxGeometry(1.8,22,1.8),metal);l2.position.y=11;s2.add(l2);
    const jm=new THREE.MeshStandardMaterial({color:0x222222,metalness:1,roughness:0.3});
    [s1,s2].forEach(sg=>{const j=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,3.4,16),jm);j.rotation.z=Math.PI/2;sg.add(j);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(2.25,0.18,6,24),white);ring.rotation.y=Math.PI/2;sg.add(ring);
      const pis=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,16,8),jm);pis.position.set(0,9,1.9);sg.add(pis);
      const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,10,8),metal);rod.position.set(0,17,1.9);sg.add(rod);
      const cab=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,18,4),white);cab.position.set(1.4,11,-0.8);sg.add(cab);});
    const wrist=new THREE.Group();wrist.position.y=22;s2.add(wrist);
    wrist.add(new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.1,3,12),jm));
    [-1,1].forEach(k=>{const f=new THREE.Mesh(new THREE.BoxGeometry(0.5,3.5,0.8),metal);f.position.set(k*0.9,2.6,0);f.rotation.z=k*0.35;wrist.add(f);});
    const tip=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,6),white);tip.position.y=26.5;s2.add(tip);const glow=new THREE.Sprite(glowM.clone());glow.scale.setScalar(2.2);tip.add(glow);
    const pl=new THREE.PointLight(0xffffff,0,40,2);tip.add(pl);
    arms.push({base,s1,s2,tip,pl,glow,side,ph:i*1.3,acc:0});}
  // launch tower lights
  const beacons=[];for(let i=-2;i<=2;i++){const b=new THREE.Mesh(new THREE.SphereGeometry(1.4,8,6),white);b.position.set(i*40,97,0);g.add(b);beacons.push(b);}
  const wp=new THREE.Vector3();let si=0;
  return {group:g,ship,update(t,dt){
    trolley.position.x=Math.sin(t*0.15)*80;
    ship.rotation.x=Math.sin(t*0.1)*0.02;
    for(const a of arms){a.base.rotation.y=a.side>0?Math.PI:0;a.base.rotation.y+=Math.sin(t*0.4+a.ph)*0.5;
      a.s1.rotation.x=0.55+Math.sin(t*0.7+a.ph)*0.15;a.s2.rotation.x=0.9+Math.sin(t*0.9+a.ph)*0.25;
      const on=Math.sin(t*2.3+a.ph*3)>-0.45,fl=0.55+0.45*R();
      a.pl.intensity=on?1.2+1.2*fl:0;a.glow.visible=on;a.glow.material.opacity=0.35+0.5*fl;a.glow.scale.setScalar(1.4+1.4*fl);a.tip.visible=on;
      if(on&&dt>0){a.tip.getWorldPosition(wp);g.worldToLocal(wp);a.acc+=dt*2400*(0.6+0.8*R()); // ~2400 sparks/s per arm, bursty
        while(a.acc>=1){a.acc-=1;const q=sp.spawn(),th=R()*Math.PI*2,ph=Math.acos(1-2*R()*0.85),spd=8+R()*R()*38;
          q.p.copy(wp);q.v.set(Math.sin(ph)*Math.cos(th)*spd,Math.cos(ph)*spd*0.8+4,Math.sin(ph)*Math.sin(th)*spd);
          q.p.addScaledVector(q.v,R()*dt);q.l0=q.life=0.25+R()*R()*0.8;q.s0=0.12+R()*0.14;q.lum=1;q.a0=0.85+R()*0.15;}}}
    const floorY=4.2,sa=streakG.attributes.position.array,sc=streakG.attributes.color.array;let si2=0;
    sp.P.forEach((q,i)=>{if(q.life>0){q.life-=dt;q.v.y-=38*dt;q.v.multiplyScalar(Math.max(0,1-1.2*dt));q.p.addScaledVector(q.v,dt);if(q.p.y<floorY&&q.v.y<0){q.p.y=floorY;q.v.y*=-0.3;q.v.x*=0.6;q.v.z*=0.6;}}
      const j=i*6;if(q.life>0){const k=1-q.life/q.l0,b=(1-k)*q.a0,L=0.04; // streak = distance covered in ~1/45 s (shutter)
        sa[j]=q.p.x;sa[j+1]=q.p.y;sa[j+2]=q.p.z;sa[j+3]=q.p.x-q.v.x*L;sa[j+4]=q.p.y-q.v.y*L;sa[j+5]=q.p.z-q.v.z*L;
        sc[j]=sc[j+1]=sc[j+2]=1.3*b;sc[j+3]=sc[j+4]=sc[j+5]=0;}else{sa[j+1]=sa[j+4]=-9999;sc[j]=sc[j+1]=sc[j+2]=0;}});
    streakG.attributes.position.needsUpdate=streakG.attributes.color.needsUpdate=true;
    sp.write((q,k)=>[q.s0*(1-0.5*k),(1-k)*q.a0]);
    beacons.forEach((b,i)=>b.visible=Math.sin(t*3-i)>0);
  }};
}
