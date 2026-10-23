// Engine: settings, WebGL rendering, scenario toolkit, game loop, scoring, raw mouse input.
// Loaded first; scenarios.js and ui.js share its top-level names.
'use strict';
const $=s=>document.getElementById(s),R=Math.random,rnd=(a,b)=>a+R()*(b-a),ri=(a,b)=>a+Math.floor(R()*(b-a+1)),sgn=()=>R()<.5?-1:1,D=Math.PI/180;
function load(k){try{return JSON.parse(localStorage.getItem(k))||{}}catch(e){return {}}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}

// ---------- settings ----------
const GAMES={cs2:['CS2 / CS:GO',.022],apex:['Apex Legends',.022],val:['Valorant',.07],ow:['Overwatch 2',.0066],cm:['Custom cm/360',0]};
const DUR=60;
let g=null,raf=0,ac;
const S=Object.assign({sc:'grid',tab:'game',sub:'sc',reps:{click:1,track:1,switch:1,full:1},size:5,game:'cs2',sens:1,cm:35,dpi:800,fov:103,ar:0,
  vClick:60,vTrack:40,vMiss:50,tCol:'#1fa6f0',wCol:'#83878d',grid:50,xType:'dot',xCol:'#3dff9e',xOut:1,xDot:4,xLen:6,xThk:2,xGap:3},load('aim.s'));
if(['#ff6b2e','#45b4e6'].includes(S.tCol))S.tCol='#1fa6f0'; // old default colors move to the new defaults
if(['#1c1f26','#9a9ea4'].includes(S.wCol))S.wCol='#83878d';
S.ar=Math.abs(S.ar); // old saved "-1.3333" (stretched 4:3) maps to 4:3
const BEST=load('aim.b');
const dpc=()=>S.game==='cm'?360*2.54/(S.cm*S.dpi):S.sens*GAMES[S.game][1]; // degrees per mouse count

// ---------- webgl ----------
const cv=$('c'),gl=cv.getContext('webgl2',{antialias:true});
function prog(vs,fs){const p=gl.createProgram();for(const[t,s]of[[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const o=gl.createShader(t);gl.shaderSource(o,'#version 300 es\nprecision highp float;\n'+s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(o);gl.attachShader(p,o)}
  gl.linkProgram(p);const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const a=gl.getActiveUniform(p,i).name;u[a]=gl.getUniformLocation(p,a)}return{p,u}}
function mesh(pos,idx){const v=gl.createVertexArray();gl.bindVertexArray(v);gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pos),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);gl.bindVertexArray(null);return{v,n:idx.length}}

const SP=prog(`layout(location=0) in vec3 aP;uniform mat4 uVP;uniform vec3 uC;uniform float uR;out vec3 vN,vW;
void main(){vN=aP;vW=uC+aP*uR;gl_Position=uVP*vec4(vW,1.);}`,
`in vec3 vN,vW;uniform vec3 uCol;out vec4 o;
void main(){vec3 n=normalize(vN),v=normalize(-vW);float d=max(dot(n,normalize(vec3(.4,.8,.5))),0.),rim=pow(1.-max(dot(n,v),0.),2.);o=vec4(uCol*(.35+.65*d)+rim*.25,1.);}`);
const RM=prog(`layout(location=0) in vec3 aP;uniform mat4 uVP;uniform vec3 uS,uO;out vec3 vW;
void main(){vW=aP*uS+uO;gl_Position=uVP*vec4(vW,1.);}`,
`in vec3 vW;uniform vec3 uB;uniform float uG;out vec4 o;
void main(){vec3 n=abs(normalize(cross(dFdx(vW),dFdy(vW))));vec2 uv=n.x>.5?vW.zy:n.y>.5?vW.xz:vW.xy;
vec2 g=abs(fract(uv-.5)-.5)/max(fwidth(uv),1e-4);float l=1.-min(min(g.x,g.y),1.);
float s=n.y>.5?(vW.y<0.?1.:.7):(n.x>.5?.85:.95);vec3 lc=dot(uB,vec3(.3,.59,.11))>.45?uB*.65:uB*2.2+.04;o=vec4(mix(uB*s,lc,l*uG),1.);}`);

const BR=prog(`layout(location=0) in vec3 aP;uniform vec4 uRect;void main(){gl_Position=vec4(uRect.xy+aP.xy*uRect.zw,0.,1.);}`,
`uniform vec4 uCol;out vec4 o;void main(){o=uCol;}`);
const QUAD=mesh([0,0,0,1,0,0,1,1,0,0,1,0],[0,1,2,0,2,3]);
const sp=[],si=[],LA=12,LO=20;
for(let i=0;i<=LA;i++){const a=i/LA*Math.PI;for(let j=0;j<=LO;j++){const b=j/LO*2*Math.PI;sp.push(Math.sin(a)*Math.cos(b),Math.cos(a),Math.sin(a)*Math.sin(b))}}
for(let i=0;i<LA;i++)for(let j=0;j<LO;j++){const a=i*(LO+1)+j,b=a+LO+1;si.push(a,b,a+1,b,b+1,a+1)}
const SPH=mesh(sp,si),cp=[];
for(let i=0;i<8;i++)cp.push(i&4?1:-1,i&2?1:-1,i&1?1:-1);
const CUBE=mesh(cp,[0,1,3,0,3,2,4,6,7,4,7,5,0,4,5,0,5,1,2,3,7,2,7,6,0,2,6,0,6,4,1,5,7,1,7,3]);

function rs(){const d=Math.min(devicePixelRatio||1,2);cv.width=innerWidth*d|0;cv.height=innerHeight*d|0;if(g)draw()}
addEventListener('resize',rs);rs();

const dir=()=>[Math.sin(g.yaw)*Math.cos(g.pitch),Math.sin(g.pitch),-Math.cos(g.yaw)*Math.cos(g.pitch)];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let x=0;for(let k=0;k<4;k++)x+=a[k*4+r]*b[c*4+k];o[c*4+r]=x}return o}
// ar: 0 = screen ratio, otherwise the image is rendered at that ratio and stretched to fill the screen
function view(){const W=cv.width,H=cv.height,r=Math.abs(S.ar);return[0,0,W,H,r||W/H]}
const focal=asp=>1/Math.tan(Math.atan(Math.tan(S.fov*D/2)/asp));
function viewProj(asp){
  const f=focal(asp),n=.05,fa=200;
  const d=dir(),s0=cross(d,[0,1,0]),l=Math.hypot(...s0),s=s0.map(x=>x/l),u=cross(s,d);
  return mul([f/asp,0,0,0,0,f,0,0,0,0,(fa+n)/(n-fa),-1,0,0,2*fa*n/(n-fa),0],[s[0],u[0],-d[0],0,s[1],u[1],-d[1],0,s[2],u[2],-d[2],0,0,0,0,1]);
}
function draw(){
  const[vx,vy,vw,vh,asp]=view();
  gl.viewport(vx,vy,vw,vh);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);
  const m=viewProj(asp);
  gl.useProgram(RM.p);gl.uniformMatrix4fv(RM.u.uVP,false,m);gl.uniform3f(RM.u.uS,20,10,22);gl.uniform3f(RM.u.uO,0,5,-3);gl.uniform3fv(RM.u.uB,g.wc);gl.uniform1f(RM.u.uG,S.grid/100*.7);
  gl.bindVertexArray(CUBE.v);gl.drawElements(gl.TRIANGLES,CUBE.n,gl.UNSIGNED_SHORT,0);
  gl.useProgram(SP.p);gl.uniformMatrix4fv(SP.u.uVP,false,m);gl.bindVertexArray(SPH.v);
  for(const t of g.targets){
    let c=g.tc;
    if(t.on&&g.fire&&g.sc.cat!=='click')c=c.map(x=>x+(1-x)*.55);
    gl.uniform3fv(SP.u.uC,t.p);gl.uniform1f(SP.u.uR,t.r);gl.uniform3fv(SP.u.uCol,c);gl.drawElements(gl.TRIANGLES,SPH.n,gl.UNSIGNED_SHORT,0);
  }
  if(g.sc.cat==='switch')healthBars(m,focal(asp),asp);
}
// health bar above each switching target, sized with the target so far ones get smaller bars
function healthBars(m,f,asp){
  gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(BR.p);gl.bindVertexArray(QUAD.v);
  const px=2/cv.width,py=2/cv.height,rect=(x,y,w,h,c)=>{gl.uniform4f(BR.u.uRect,x,y,w,h);gl.uniform4fv(BR.u.uCol,c);gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0)};
  for(const t of g.targets){
    const x=t.p[0],y=t.p[1]+t.r*1.35,z=t.p[2],w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)continue;
    const cx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,cy=(m[1]*x+m[5]*y+m[9]*z+m[13])/w;
    const hw=Math.max(t.r*1.1*f/asp/w,12*px),h=Math.max(t.r*.16*f/w,3*py),k=Math.max(0,(t.shown??t.hp)/t.max); // bar steps down on each hit tick
    rect(cx-hw-px,cy-py,2*hw+2*px,h+2*py,[0,0,0,.6]);
    rect(cx-hw,cy,2*hw*k,h,k>.35?[.3,1,.45,1]:[1,.3,.25,1]);
  }
  gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);
}

// ---------- targets & scenarios ----------
const T=(p,r,o)=>Object.assign({p,v:[0,0,0],r,hp:1,max:1,cd:0,on:false},o);
const ang=(y,p,d)=>[Math.sin(y*D)*Math.cos(p*D)*d,Math.sin(p*D)*d,-Math.cos(y*D)*Math.cos(p*D)*d];
function free(g,gen,r){let p;for(let i=0;i<30;i++){p=gen();if(!g.targets.some(t=>Math.hypot(t.p[0]-p[0],t.p[1]-p[1],t.p[2]-p[2])<t.r+r+.3))break}return p}
function move(t,dt){t.p[0]+=t.v[0]*dt;t.p[1]+=t.v[1]*dt;t.p[2]+=t.v[2]*dt}
function box(t,x0,x1,y0,y1){
  if(t.p[0]<x0){t.p[0]=x0;t.v[0]=Math.abs(t.v[0])}if(t.p[0]>x1){t.p[0]=x1;t.v[0]=-Math.abs(t.v[0])}
  if(y0!=null){if(t.p[1]<y0){t.p[1]=y0;t.v[1]=Math.abs(t.v[1])}if(t.p[1]>y1){t.p[1]=y1;t.v[1]=-Math.abs(t.v[1])}}
}
function strafe(t,dt,a,b,c0,c1){if((t.cd-=dt)<=0){t.v[0]=sgn()*rnd(a,b);t.cd=rnd(c0,c1)}}
// one target at a time, respawns on kill
const one=(gen,rs=1)=>({init(g){this.add(g)},add(g){g.targets.push(T(gen(g),g.r*rs))},kill(g){this.add(g)}});
// n targets with hp (seconds of holding fire), respawn on kill
const sw=(hp,n,gen,update)=>({init(g){for(let i=0;i<n;i++)this.add(g)},add(g){g.targets.push(T(free(g,gen,g.r),g.r,{hp,max:hp}))},kill(g){this.add(g)},update});

// ---------- game ----------
function beep(f,vol,len=.08){if(!(vol>0))return;try{ac=ac||new AudioContext();const o=ac.createOscillator(),v=ac.createGain(),n=ac.currentTime;o.type='triangle';o.frequency.value=f;
  v.gain.setValueAtTime(.25*vol/100,n);v.gain.exponentialRampToValueAtTime(.001,n+len);o.connect(v).connect(ac.destination);o.start();o.stop(n+len+.01)}catch(e){}}
const tick=()=>beep(1300,S.vTrack,.035);
// miss: dull low thump, sine sweeping down
function thud(){if(!(S.vMiss>0))return;try{ac=ac||new AudioContext();const o=ac.createOscillator(),v=ac.createGain(),n=ac.currentTime;o.type='sine';
  o.frequency.setValueAtTime(160,n);o.frequency.exponentialRampToValueAtTime(60,n+.08);v.gain.setValueAtTime(.5*S.vMiss/100,n);v.gain.exponentialRampToValueAtTime(.001,n+.09);
  o.connect(v).connect(ac.destination);o.start();o.stop(n+.1)}catch(e){}}
function marker(){const m=$('hm');m.classList.remove('go');void m.offsetWidth;m.classList.add('go')}
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);

function newGame(id){
  const sc=SC.find(s=>s.id===id)||SC[0];
  g={sc,r:.08+S.size*.06,dpc:dpc(),dur:DUR,el:0,yaw:0,pitch:0,targets:[],shots:0,kills:0,onT:0,fireT:0,fire:false,paused:true,done:false,last:0,hud:0,tick:0,tc:rgb(S.tCol),wc:rgb(S.wCol)};
  sc.init(g);
}
function raycast(){
  const f=dir();let best=null,bd=1e9;
  for(const t of g.targets){const b=t.p[0]*f[0]+t.p[1]*f[1]+t.p[2]*f[2];if(b<0)continue;
    const d2=t.p[0]**2+t.p[1]**2+t.p[2]**2-b*b;if(d2>t.r*t.r)continue;const d=b-Math.sqrt(t.r*t.r-d2);if(d<bd){bd=d;best=t}}
  return best;
}
function kill(t){const i=g.targets.indexOf(t);if(i>=0)g.targets.splice(i,1);g.kills++;marker();g.sc.cat==='click'?beep(880,S.vClick):beep(660,S.vTrack);g.sc.kill&&g.sc.kill(g,t)}

function frame(now){
  const dt=Math.min((now-g.last)/1000,.05);g.last=now;g.el+=dt;
  g.sc.update&&g.sc.update(g,dt);
  const hit=raycast();
  for(const t of g.targets)t.on=t===hit;
  let on=false;
  if(g.sc.cat!=='click'&&g.fire){g.fireT+=dt;if(hit){g.onT+=dt;on=true;if(g.sc.cat==='switch'&&(hit.hp-=dt)<=0)kill(hit)}}
  // tracking/switching: tick sound + hit marker every 0.1 s while on target
  if(!on)g.tick=0;else if((g.tick-=dt)<=0){g.tick=.1;tick();marker();hit.shown=hit.hp}
  draw();
  if(g.el>=g.dur)return end();
  if(++g.hud%6===0)hud();
  raf=requestAnimationFrame(frame);
}
const pct=x=>(100*x).toFixed(1)+'%';
function stats(){
  const c=g.sc.cat,el=Math.max(g.el,1e-3);let acc,score,lines;
  if(c==='click'){acc=g.shots?g.kills/g.shots:0;score=Math.round(g.kills*100*acc);
    lines=[['Hits',g.kills],['Shots',g.shots],['Accuracy',pct(acc)],['Kills/s',(g.kills/el).toFixed(2)]];
    if(g.lost!=null)lines.push(['Missed targets',g.lost])}
  else if(c==='track'){acc=g.fireT?g.onT/g.fireT:0;score=Math.round(g.onT/el*1e4);
    lines=[['Time on target',pct(g.onT/el)],['Accuracy while firing',pct(acc)]]}
  else{acc=g.fireT?g.onT/g.fireT:0;score=Math.round(g.kills*100*acc);
    lines=[['Kills',g.kills],['Accuracy',pct(acc)],['Kills/s',(g.kills/el).toFixed(2)]]}
  return{acc,score,lines};
}
function hud(){const s=stats();$('hp').textContent=run?`${run.i+1}/${run.q.length}`:'';$('ht').textContent=Math.max(0,g.dur-g.el).toFixed(1)+'s';$('hs').textContent=s.score;$('ha').textContent=pct(s.acc)}
const bestKey=id=>`${id}|${S.size}|${DUR}`;
function end(){
  g.done=true;cancelAnimationFrame(raf);document.exitPointerLock();
  const s=stats(),k=bestKey(g.sc.id),prev=BEST[k]||0,nb=s.score>prev;
  if(nb){BEST[k]=s.score;save('aim.b',BEST)}
  if(run)run.res.push({id:g.sc.id,score:s.score});
  const last=run&&run.i>=run.q.length-1;
  $('rp').textContent=run?`${PN[run.p]} · ${run.i+1} of ${run.q.length}`:`Target size ${S.size}`;
  $('rn').textContent=g.sc.name;$('rs').textContent=s.score;
  $('rb').textContent=nb?(prev?`New record! (was ${prev})`:'First result'):`Record: ${prev}`;
  $('rl').innerHTML=s.lines.map(([a,b])=>`<span>${a}</span><span>${b}</span>`).join('');
  $('rNext').textContent=run?(last?'Summary (Enter)':'Next (Enter)'):'Restart (Enter)';
  $('rMenu').textContent=run?'Abort (Esc)':'Menu (Esc)';
  show('res');
}

// ---------- input ----------
// Raw input: unadjustedMovement makes the browser deliver raw mouse counts, bypassing the OS pointer speed
// slider and "Enhance pointer precision" (acceleration). So rotation = counts × sens × game yaw, exactly like the game.
let RAW=null; // null = not tried yet, true = raw input active, false = browser can't do raw (OS settings apply)
function setRaw(v){
  RAW=v;$('hraw').hidden=v!==false;
  $('raw').innerHTML=v===false?'<span class="err">Raw input is not supported in this browser: Windows pointer speed and acceleration still apply. Use Chrome or Edge.</span>'
    :v?'Raw input: on. Windows pointer speed and acceleration are ignored.':'Raw input is enabled when the game starts (Chrome / Edge).';
}
function lock(){
  let p;
  try{p=cv.requestPointerLock({unadjustedMovement:true})}catch(e){setRaw(false);cv.requestPointerLock();return}
  if(p&&p.then)p.then(()=>setRaw(true),e=>{if(e&&e.name==='NotSupportedError'){setRaw(false);cv.requestPointerLock()}});
  else setRaw(false); // old API without options: lock is requested, but not raw
}
const locked=()=>document.pointerLockElement===cv;
document.addEventListener('pointerlockchange',()=>{
  if(!g||g.done)return;
  if(locked()){g.paused=false;show(null);g.last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)}
  else{g.paused=true;g.fire=false;cancelAnimationFrame(raf);$('perr').textContent='';show('pause')}
});
document.addEventListener('pointerlockerror',()=>{$('perr').textContent='The browser refused to lock the mouse. Wait a second and try again.';$('info').innerHTML='<span class="err">Could not lock the mouse. Try again.</span>'});
document.addEventListener('mousemove',e=>{if(!locked()||!g||g.paused)return;const k=g.dpc*D;g.yaw+=e.movementX*k;g.pitch=Math.max(-1.55,Math.min(1.55,g.pitch-e.movementY*k))});
document.addEventListener('mousedown',e=>{
  if(e.button||!locked()||!g||g.paused)return;
  g.fire=true;
  const h=raycast();
  if(g.sc.cat==='click'){g.shots++;if(h)kill(h);else thud()}
  else if(!h)thud(); // tracking/switching: pressing fire off target is a miss click too
});
document.addEventListener('mouseup',e=>{if(!e.button&&g)g.fire=false});
document.addEventListener('keydown',e=>{
  if((e.key==='f'||e.key==='а'||e.key==='F'||e.key==='А')&&!e.target.closest('input,select'))return fullscreen();
  const v=OV.find(id=>$(id).classList.contains('on'));
  if(v==='res'){if(e.key==='Enter')next();else if(e.key==='Escape')toMenu()}
  else if(v==='sum'){if(e.key==='Enter')startPreset(run.p);else if(e.key==='Escape')toMenu()}
});
