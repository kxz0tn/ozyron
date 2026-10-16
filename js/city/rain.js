import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
// optional rain: streaks around the camera lit by the beam, ripples, and a wet reflective street layer
export function buildRain(scene,{tier,world,renderer}){
  const N=tier.rain;const g=new THREE.Group();g.visible=false;scene.add(g);
  const geo=new THREE.BufferGeometry();const pos=new Float32Array(N*2*3),seed=new Float32Array(N*2),end=new Float32Array(N*2);
  for(let i=0;i<N;i++){const x=Math.random(),y=Math.random(),z=Math.random();for(let k=0;k<2;k++){pos.set([x,y,z],(i*2+k)*3);seed[i*2+k]=Math.random();end[i*2+k]=k;}}
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('seed',new THREE.BufferAttribute(seed,1));geo.setAttribute('e',new THREE.BufferAttribute(end,1));
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{t:{value:0},cp:{value:new THREE.Vector3()},k:{value:1}},
    vertexShader:`uniform float t;uniform vec3 cp;attribute float seed;attribute float e;varying float vA;
      void main(){float S=220.;vec3 p=position*S;p.y=mod(position.y*S-t*(170.+seed*60.),S);vec3 w=cp+vec3(mod(p.x-cp.x,S)-S*.5,p.y-S*.35,mod(p.z-cp.z,S)-S*.5);
        w.y-=e*5.;w.x+=e*0.8;float db=length(w.xz);float lit=.18+1.6*exp(-db*.02)+.5*exp(-db*.006);vA=lit*(e<.5?1.:0.)*smoothstep(0.,4.,w.y);
        gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`,
    fragmentShader:'uniform float k;varying float vA;void main(){gl_FragColor=vec4(vec3(1.),vA*.28*k);}'});
  const rain=new THREE.LineSegments(geo,mat);rain.frustumCulled=false;g.add(rain);
  // ripples: procedural rings in a grid of cells, plane follows the camera
  const rip=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{t:{value:0}},
    vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:`uniform float t;varying vec3 vW;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){float a=0.;for(int L=0;L<2;L++){vec2 c=vW.xz/(3.+float(L)*2.3)+float(L)*7.;vec2 id=floor(c),f=fract(c)-.5;float ph=h(id);float tt=fract(t*(.7+ph*.6)+ph*9.);
        vec2 o=vec2(h(id+1.3),h(id+4.1))-.5;float d=length(f-o*.5);float r=tt*.5;a+=smoothstep(.04,0.,abs(d-r))*(1.-tt)*step(.35,h(id+floor(t*(.7+ph*.6)+ph*9.)));}
        float fade=smoothstep(250.,60.,length(vW.xz-cameraPosition.xz));gl_FragColor=vec4(vec3(1.),a*.25*fade);}`}));
  rip.rotation.x=-Math.PI/2;rip.position.y=0.6;g.add(rip);
  let refl=null;
  if(tier.reflect){refl=new Reflector(new THREE.PlaneGeometry(3000,3000),{textureWidth:Math.floor(innerWidth*0.5),textureHeight:Math.floor(innerHeight*0.5),clipBias:0.003,
    shader:{uniforms:{color:{value:new THREE.Color(0xffffff)},tDiffuse:{value:null},textureMatrix:{value:null},t:{value:0}},
      vertexShader:'uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vW;void main(){vUv=textureMatrix*vec4(position,1.);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader:`uniform sampler2D tDiffuse;uniform float t;varying vec4 vUv;varying vec3 vW;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
        void main(){vec2 j=vec2(sin(vW.x*.9+t*3.)+sin(vW.z*1.3-t*2.),cos(vW.z*.8+t*2.5))*.004*vUv.w;vec3 c=texture2DProj(tDiffuse,vUv+vec4(j,0.,0.)).rgb;
         float fade=smoothstep(1400.,200.,length(vW.xz-cameraPosition.xz));gl_FragColor=vec4(c*.55*fade,1.);}`}});
    refl.material.transparent=true;refl.material.blending=THREE.AdditiveBlending;refl.material.depthWrite=false;
    refl.rotation.x=-Math.PI/2;refl.position.y=0.35;g.add(refl);}
  const gm=world.ground.material,base={r:gm.roughness,e:gm.emissiveIntensity};
  return {group:g,get on(){return g.visible;},set(on){g.visible=on;this.wetT=on?1:0;gm.emissiveIntensity=on?base.e*0.6:base.e;},wet:0,wetT:0,
    update(t,dt,env={}){this.wet+=(this.wetT-this.wet)*Math.min(1,dt*0.25);if(world.ground.userData.U)world.ground.userData.U.uWet.value=this.wet;if(!g.visible)return;const cam=env.camera;mat.uniforms.t.value=t;mat.uniforms.cp.value.copy(cam.position);rip.material.uniforms.t.value=t;
      rip.position.x=cam.position.x;rip.position.z=cam.position.z;if(refl)refl.material.uniforms.t.value=t;}};
}
