// beat clock + judgement shared by rhythm games. all times on the audio clock (seconds).
import {audio} from './audio.js';
import {settings} from './settings.js';
export const WIN={perfect:0.050,good:0.125,buffer:0.100};
export function beatClock(bpm,lead=1.2){const c={bpm,spb:60/bpm,t0:audio.now()+lead,
  at(n){return this.t0+n*this.spb;},beat(t=audio.now()){return (t-this.t0)/this.spb;},
  shift(s){this.t0+=s;}};return c;}
// event time -> perceived time on the musical grid (output latency + user calibration)
export function heard(evT){return evT-audio.outLatency()-settings.calib/1000;}
export function grade(err){const a=Math.abs(err);return a<=WIN.perfect?'perfect':a<=WIN.good?'good':null;}
