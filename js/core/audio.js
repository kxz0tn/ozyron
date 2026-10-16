// all sound synthesised in code (WebAudio). ambient bed, beat clock + music sequencer, sfx.
import {settings,onSettings} from './settings.js';
let ctx=null,master,bus={},amb={},noiseBuf=null;
const perf0=performance.now();
export const audio={
  get ctx(){return ctx;},
  init(){if(ctx){if(ctx.state!=='running')ctx.resume();return;}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    ctx=new AC({latencyHint:'interactive'});
    master=ctx.createGain();const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;master.connect(comp).connect(ctx.destination);
    ['music','sfx','ambient'].forEach(k=>{bus[k]=ctx.createGain();bus[k].connect(master);});
    noiseBuf=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const d=noiseBuf.getChannelData(0);let b=0;
    for(let i=0;i<d.length;i++){d[i]=Math.random()*2-1;}
    this.apply();buildAmbient();if(ctx.state!=='running')ctx.resume();},
  apply(){if(!ctx)return;const m=settings.muted?0:settings.master;master.gain.setTargetAtTime(m,ctx.currentTime,0.05);
    bus.music.gain.value=settings.music;bus.sfx.gain.value=settings.sfx;bus.ambient.gain.value=settings.ambient;},
  // clock in seconds: audio clock when running, else performance clock (headless / pre-gesture)
  now(){return ctx&&ctx.state==='running'?ctx.currentTime:(performance.now()-perf0)/1000;},
  running(){return !!ctx&&ctx.state==='running';},
  outLatency(){return ctx&&ctx.state==='running'?(ctx.outputLatency||ctx.baseLatency||0):0;},
  // map a DOM event timestamp (performance ms) onto the audio clock
  atPerf(ms){const nowP=performance.now();return this.now()-(nowP-ms)/1000;},
  setAmbient(o){if(!ctx||!amb.hum)return;const T=ctx.currentTime;
    if(o.beam!==undefined)amb.rumble.gain.setTargetAtTime(o.beam*0.5,T,0.3);
    if(o.rain!==undefined)amb.rain.gain.setTargetAtTime(o.rain*0.22,T,0.6);
    if(o.hum!==undefined)amb.hum.gain.setTargetAtTime(o.hum*0.16,T,0.4);},
  launch(dist=1){if(!ctx)return;const T=ctx.currentTime,g=env(T,0.02,5.5,0.5*dist,bus.ambient);const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(900,T);f.frequency.exponentialRampToValueAtTime(60,T+5.5);noise(T,6,f);f.connect(g);
    const o=ctx.createOscillator();o.frequency.setValueAtTime(70,T);o.frequency.exponentialRampToValueAtTime(30,T+3);const g2=env(T,0.05,3,0.4*dist,bus.ambient);o.connect(g2);o.start(T);o.stop(T+3.2);},
  sfx(name,when){if(!ctx)return;const T=Math.max(ctx.currentTime,when||0);(SFX[name]||SFX.tick)(T);},
  // music: 16th-step sequencer locked to a bpm grid starting at t0 (audio clock)
  music:null,
  startMusic(bpm,t0,style='beam'){this.stopMusic();if(!ctx)return null;const m={bpm,t0,style,level:0,next:0,timer:0,muted:false};
    const spb=60/bpm/4;m.timer=setInterval(()=>{const ahead=ctx.currentTime+0.12;while(t0+m.next*spb<ahead){const tt=t0+m.next*spb;if(tt>=ctx.currentTime-0.01)step(m,m.next,tt);m.next++;}},25);this.music=m;return m;},
  stopMusic(){if(this.music){clearInterval(this.music.timer);this.music=null;}},
};
onSettings(()=>audio.apply());
function env(T,a,r,peak,dest){const g=ctx.createGain();g.gain.setValueAtTime(0.0001,T);g.gain.exponentialRampToValueAtTime(Math.max(peak,0.0002),T+a);g.gain.exponentialRampToValueAtTime(0.0001,T+a+r);g.connect(dest);return g;}
function noise(T,dur,dest){const s=ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.connect(dest);s.start(T,Math.random());s.stop(T+dur);return s;}
function tone(T,type,f0,f1,dur,peak,dest=bus.sfx,a=0.003){const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f0,T);if(f1)o.frequency.exponentialRampToValueAtTime(f1,T+dur);const g=env(T,a,dur,peak,dest);o.connect(g);o.start(T);o.stop(T+dur+a+0.05);return o;}
function buildAmbient(){const T=ctx.currentTime;
  amb.hum=ctx.createGain();amb.hum.gain.value=0.16;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=220;lp.Q.value=0.7;lp.connect(amb.hum).connect(bus.ambient);
  [55,55.4,110.2,82.5].forEach((f,i)=>{const o=ctx.createOscillator();o.type=i<2?'sawtooth':'sine';o.frequency.value=f;const g=ctx.createGain();g.gain.value=i<2?0.22:0.12;o.connect(g).connect(lp);o.start();});
  const lfo=ctx.createOscillator();lfo.frequency.value=0.07;const lg=ctx.createGain();lg.gain.value=70;lfo.connect(lg).connect(lp.frequency);lfo.start();
  amb.rumble=ctx.createGain();amb.rumble.gain.value=0.1;const rl=ctx.createBiquadFilter();rl.type='lowpass';rl.frequency.value=95;rl.Q.value=2;const s=ctx.createBufferSource();s.buffer=noiseBuf;s.loop=true;s.connect(rl).connect(amb.rumble).connect(bus.ambient);s.start();
  const ro=ctx.createOscillator();ro.type='triangle';ro.frequency.value=41;const rg=ctx.createGain();rg.gain.value=0.25;ro.connect(rg).connect(amb.rumble);ro.start();
  amb.rain=ctx.createGain();amb.rain.gain.value=0;const hp=ctx.createBiquadFilter();hp.type='bandpass';hp.frequency.value=3200;hp.Q.value=0.4;const s2=ctx.createBufferSource();s2.buffer=noiseBuf;s2.loop=true;s2.playbackRate.value=0.9;s2.connect(hp).connect(amb.rain).connect(bus.ambient);s2.start();}
const SFX={
  tick:T=>tone(T,'square',1800,0,0.03,0.08),
  move:T=>tone(T,'square',1200,0,0.025,0.05),
  select:T=>{tone(T,'square',880,1760,0.08,0.09);tone(T+0.04,'sine',1760,0,0.12,0.06);},
  back:T=>tone(T,'square',900,450,0.08,0.07),
  perfect:T=>{tone(T,'sine',1568,0,0.25,0.22);tone(T,'triangle',3136,0,0.12,0.08);tone(T,'square',392,196,0.08,0.1);const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=5000;f.connect(env(T,0.001,0.05,0.25,bus.sfx));noise(T,0.06,f);},
  good:T=>{tone(T,'sine',1175,0,0.18,0.16);tone(T,'square',294,147,0.06,0.07);},
  miss:T=>{tone(T,'sawtooth',160,50,0.35,0.2);const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=600;f.connect(env(T,0.005,0.3,0.3,bus.sfx));noise(T,0.35,f);},
  whiff:T=>tone(T,'square',220,180,0.05,0.04),
  place:T=>{tone(T,'square',140,60,0.09,0.25);tone(T,'triangle',2400,1200,0.05,0.07);const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=2500;f.Q.value=3;f.connect(env(T,0.001,0.08,0.35,bus.sfx));noise(T,0.1,f);},
  surge:T=>tone(T,'sine',300,900,0.4,0.05,bus.sfx,0.2),
  warn:T=>{tone(T,'square',660,0,0.08,0.06);tone(T+0.16,'square',660,0,0.08,0.06);},
  flash:T=>{const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(8000,T);f.frequency.exponentialRampToValueAtTime(80,T+2.5);f.connect(env(T,0.005,2.6,0.6,bus.sfx));noise(T,2.8,f);tone(T,'sine',90,28,1.5,0.6);},
  shutter:T=>{const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=3000;f.connect(env(T,0.001,0.04,0.3,bus.sfx));noise(T,0.05,f);const f2=ctx.createBiquadFilter();f2.type='highpass';f2.frequency.value=2000;f2.connect(env(T+0.07,0.001,0.05,0.2,bus.sfx));noise(T+0.07,0.06,f2);},
  boss:T=>{tone(T,'sawtooth',55,40,1.6,0.3);tone(T,'square',110,0,1.2,0.08);},
  win:T=>{[523,659,784,1047].forEach((f,i)=>tone(T+i*0.09,'triangle',f,0,0.5,0.12));},
  lose:T=>{[392,330,262,196].forEach((f,i)=>tone(T+i*0.12,'triangle',f,0,0.5,0.12));},
};
// original groove: kick / hats / clap / bass / arp, intensity level 0..3 set by game
const BASS=[0,0,12,0, 0,0,10,0, 0,0,12,0, 7,0,10,0];const ROOT=[41.2,41.2,49,36.7];// E1 E1 G1 D1 per bar
const ARP=[0,7,12,15,19,15,12,7];
function step(m,i,T){const s=i%16,bar=Math.floor(i/16),L=m.level,spb=60/m.bpm/4;if(m.muted)return;
  const B=bus.music;
  if(s%4===0){tone(T,'sine',150,42,0.32,0.9,B,0.001);tone(T,'square',90,40,0.02,0.15,B,0.001);}
  if(L>=1&&(s%4===2||L>=3&&s%2===1)){const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=7500;f.connect(env(T,0.001,s%4===2?0.06:0.025,0.18,B));noise(T,0.08,f);}
  if(L>=2&&(s===4||s===12)){const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1600;f.Q.value=0.8;f.connect(env(T,0.002,0.14,0.32,B));noise(T,0.18,f);}
  const r=ROOT[bar%4];
  if(BASS[s]||s%8===0){const f=r*Math.pow(2,BASS[s]/12)*2;const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=f;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(L>=2?1400:600,T);lp.frequency.exponentialRampToValueAtTime(120,T+spb*1.8);lp.Q.value=6;o.connect(lp).connect(env(T,0.004,spb*1.8,0.22,B));o.start(T);o.stop(T+spb*2);}
  if(L>=1&&s%2===0){const f=r*8*Math.pow(2,ARP[(s/2+bar)%8]/12);tone(T,'square',f,0,spb*0.9,L>=3?0.05:0.03,B);}
  if(s===0&&bar%2===0){[0,3,7].forEach(k=>tone(T,'triangle',r*4*Math.pow(2,k/12),0,spb*30,0.035,B,0.4));}
}
