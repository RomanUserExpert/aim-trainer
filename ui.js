// Menu, presets, results, settings binding. Loaded last: runs the initial render.
'use strict';
// ---------- ui ----------
const OV=['menu','pause','res','sum'];
const PRESETS=[['click','Clicking','All clicking scenarios'],['track','Tracking','All tracking scenarios'],['switch','Switching','All switching scenarios'],['full','Full','All 15 scenarios in a row']];
const PN=Object.fromEntries(PRESETS.map(p=>[p[0],p[1]]));
const presetIds=p=>SC.filter(s=>p==='full'||s.cat===p).map(s=>s.id);
let run=null; // preset in progress: {p, q: scenario ids in order, i: current index, res: [{id,score}]}

function show(id){for(const o of OV)$(o).classList.toggle('on',o===id);const play=!id;$('hud').style.display=play?'flex':'none';$('xh').style.display=play?'block':'none'}
function play(id){newGame(id);lock()}
function playOne(id){run=null;S.sc=id;save('aim.s',S);play(id)}
function startPreset(p){const n=S.reps[p]||1;run={p,q:presetIds(p).flatMap(id=>Array(n).fill(id)),i:0,res:[]};play(run.q[0])}
function next(){if(!run)return play(g.sc.id);if(run.i>=run.q.length-1)return summary();run.i++;play(run.q[run.i])}
function toMenu(){g=null;run=null;cancelAnimationFrame(raf);renderList();renderPresets();show('menu')}
function summary(){
  const by=new Map();let tot=0;
  for(const r of run.res){if(!by.has(r.id))by.set(r.id,[]);by.get(r.id).push(r.score);tot+=r.score}
  $('sn').textContent=PN[run.p];$('sTot').textContent=tot;
  $('sl').innerHTML='<span class="h">Scenario</span><span class="h">Runs</span><span class="h">Average</span>'+[...by].map(([id,a])=>
    `<span>${SC.find(s=>s.id===id).name}</span><span>${a.join(' · ')}</span><span>${Math.round(a.reduce((x,y)=>x+y,0)/a.length)}</span>`).join('');
  show('sum');
}
$('resume').onclick=lock;$('restart1').onclick=()=>play(g.sc.id);$('tomenu1').onclick=$('rMenu').onclick=$('sMenu').onclick=toMenu;
$('rNext').onclick=next;
function fullscreen(){try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}catch(e){}}
const fsLabel=()=>$('fs').textContent=document.fullscreenElement?'Exit fullscreen (F)':'Fullscreen (F)';
$('fs').onclick=fullscreen;document.addEventListener('fullscreenchange',fsLabel);fsLabel();$('sAgain').onclick=()=>startPreset(run.p);

function tabs(){
  for(const b of $('tabs').children)b.classList.toggle('on',b.dataset.t===S.tab);
  for(const b of $('subs').children)b.classList.toggle('on',b.dataset.s===S.sub);
  $('p-game').hidden=S.tab!=='game';$('p-set').hidden=S.tab!=='set';$('s-sc').hidden=S.sub!=='sc';$('s-pr').hidden=S.sub!=='pr';
}
$('tabs').onclick=e=>{const t=e.target.dataset.t;if(t){S.tab=t;save('aim.s',S);tabs()}};
$('subs').onclick=e=>{const s=e.target.dataset.s;if(s){S.sub=s;save('aim.s',S);tabs()}};

function renderList(){
  for(const c of['click','track','switch'])$('l-'+c).innerHTML='';
  for(const s of SC){
    const b=document.createElement('button'),best=BEST[bestKey(s.id)];
    b.className='sc';
    b.innerHTML=`<b>${s.name}</b><small>${s.d}</small><em>${best?'Best '+best:'Not played yet'}</em><span class="pl">▶</span>`;
    b.onclick=()=>playOne(s.id);
    $('l-'+s.cat).appendChild(b);
  }
}
function renderPresets(){
  $('s-pr').innerHTML=PRESETS.map(([id,name,d])=>{
    const ids=presetIds(id),n=S.reps[id]||1,runs=ids.length*n;
    return `<div class="pr k-${id}"><div><h4>${name}</h4><small>${d}</small></div>
      <div class="chips">${ids.map(i=>`<span>${SC.find(s=>s.id===i).name}</span>`).join('')}</div>
      <div class="step">Runs per scenario<div><button data-p="${id}" data-d="-1">−</button><b>${n}</b><button data-p="${id}" data-d="1">+</button></div></div>
      <div class="meta">${runs} runs × 60 s · ${runs} min</div>
      <button class="btn" data-go="${id}">Start</button></div>`}).join('');
}
$('s-pr').onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.go)return startPreset(b.dataset.go);
  const p=b.dataset.p;S.reps[p]=Math.max(1,Math.min(5,(S.reps[p]||1)+ +b.dataset.d));save('aim.s',S);renderPresets();
};
function info(){
  // with a game preset DPI isn't needed: raw counts × sens × yaw is the same turn as in-game at any DPI
  const k=dpc(),cm=S.game==='cm';
  $('sensT').textContent=cm?'cm/360':'In-game sensitivity';$('dpiL').hidden=!cm;
  $('info').textContent=isFinite(k)&&k>0?(cm?'':'Same turn per mouse movement as in-game, at whatever DPI your mouse uses. ')+`360° = ${Math.round(360/k)} counts.`:'Check the sensitivity'+(cm?' and DPI':'')+'.';
}
$('game').innerHTML=Object.entries(GAMES).map(([k,[n]])=>`<option value="${k}">${n}</option>`).join('');
function crosshair(){
  const c=S.xCol,o=+S.xOut,sh=o?`box-shadow:0 0 0 1px rgba(0,0,0,${o});`:'';
  const r=(x,y,w,h,ex='')=>`<i style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${c};${sh}${ex}"></i>`;
  if(S.xType==='dot'){const d=+S.xDot;return r(-d/2,-d/2,d,d,'border-radius:50%')}
  const t=+S.xThk,l=+S.xLen,gp=+S.xGap,h=t/2;
  return r(-h,-gp-l,t,l)+r(-h,gp,t,l)+r(-gp-l,-h,l,t)+r(gp,-h,l,t);
}
function looks(){
  for(const el of document.querySelectorAll('label input[type=range]'))el.parentElement.querySelector('b').textContent=el.value;
  const x=crosshair();$('xh').innerHTML=x;$('xhpc').innerHTML=x;
  // preview background: world color + grid, same line color/opacity formula as the room shader
  const b=rgb(S.wCol),L=b[0]*.3+b[1]*.59+b[2]*.11,a=S.grid/100*.7;
  const ln=`rgb(${b.map(x=>{const l=L>.45?x*.65:Math.min(1,x*2.2+.04);return Math.round(255*(x+(l-x)*a))})})`;
  $('xhp').style.background=`linear-gradient(${ln} 1px,transparent 1px) center/14px 14px,linear-gradient(90deg,${ln} 1px,transparent 1px) center/14px 14px,${S.wCol}`;
  for(const e of document.querySelectorAll('.xd'))e.style.display=S.xType==='dot'?'':'none';
  for(const e of document.querySelectorAll('.xx'))e.style.display=S.xType==='dot'?'none':'';
}
$('vClick').addEventListener('change',()=>beep(880,S.vClick));
$('vTrack').addEventListener('change',tick);
$('vMiss').addEventListener('change',thud);
for(const k of['size','game','dpi','fov','ar','vClick','vTrack','vMiss','tCol','wCol','grid','xType','xCol','xOut','xDot','xLen','xThk','xGap']){
  const el=$(k);el.value=S[k];
  el.addEventListener('input',()=>{S[k]=el.type==='color'||isNaN(+el.value)?el.value:+el.value;looks();if(k==='game')$('sens').value=S.game==='cm'?S.cm:S.sens;save('aim.s',S);info();if(k==='size')renderList()});
}
$('sens').value=S.game==='cm'?S.cm:S.sens;
$('sens').addEventListener('input',e=>{S[S.game==='cm'?'cm':'sens']=+e.target.value;save('aim.s',S);info()});
renderList();renderPresets();tabs();info();looks();setRaw(null);
