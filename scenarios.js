// Scenarios. Add yours to SC (see AGENTS.md). Helpers (T, ang, free, move, box, strafe, one, sw) come from engine.js.
'use strict';
const orbitPos=ph=>[3.5*Math.cos(ph),.5+3.5*Math.sin(ph),-12];

const SC=[
  {id:'grid',cat:'click',name:'Gridshot',d:'3 targets on a 5×5 grid',
    init(g){for(let i=0;i<3;i++)this.add(g)},
    add(g){const s=Math.max(1.1,g.r*2.8);g.targets.push(T(free(g,()=>[(ri(0,4)-2)*s,(ri(0,4)-2)*s*.75,-10],g.r),g.r))},
    kill(g){this.add(g)}},
  {id:'micro',cat:'click',name:'Microshot',d:'Small targets in a tight area',...one(()=>ang(rnd(-12,12),rnd(-7,7),10),.5)},
  {id:'spider',cat:'click',name:'Spidershot',d:'Center ↔ periphery',...one(g=>(g.c=!g.c)?[0,0,-10]:ang(sgn()*rnd(12,50),rnd(-22,22),10))},
  {id:'wide',cat:'click',name:'Wide Flick',d:'One target within ±75°',...one(()=>ang(rnd(-75,75),rnd(-25,25),10))},
  {id:'reflex',cat:'click',name:'Reflex',d:'Target lives 0.8 s',
    init(g){g.w=.6;g.lost=0},
    update(g,dt){
      if(!g.targets.length){if((g.w-=dt)<=0)g.targets.push(T(ang(rnd(-30,30),rnd(-15,15),10),g.r,{life:.8}))}
      else if((g.targets[0].life-=dt)<=0){g.targets.length=0;g.lost++;g.w=rnd(.25,.6)}
    },
    kill(g){g.w=rnd(.25,.6)}},

  {id:'strafe',cat:'track',name:'Strafe',d:'Left-right strafing',
    init(g){g.targets.push(T([0,0,-10],g.r))},
    update(g,dt){const t=g.targets[0];strafe(t,dt,3,5.5,.35,1.1);move(t,dt);box(t,-5,5)}},
  {id:'smooth',cat:'track',name:'Smooth',d:'Smooth path',
    init(g){g.targets.push(T([0,0,-10],g.r));g.ph=R()*99},
    update(g){const t=g.targets[0],a=g.el+g.ph;t.p[0]=4*Math.sin(.7*a)+1.3*Math.sin(1.9*a+1);t.p[1]=.6+1.6*Math.sin(1.1*a+.5)+.4*Math.sin(2.3*a)}},
  {id:'air',cat:'track',name:'Air',d:'Strafes with jumps',
    init(g){g.targets.push(T([0,-1.2,-10],g.r))},
    update(g,dt){const t=g.targets[0];strafe(t,dt,2.5,4.5,.4,1.2);t.v[1]-=9.8*dt;move(t,dt);if(t.p[1]<-1.2){t.p[1]=-1.2;t.v[1]=rnd(5,8)}box(t,-5,5)}},
  {id:'react',cat:'track',name:'Reactive',d:'Sharp direction changes',
    init(g){g.targets.push(T([0,.5,-10],g.r))},
    update(g,dt){const t=g.targets[0];if((t.cd-=dt)<=0){const a=R()*6.283,s=rnd(4,6.5);t.v[0]=Math.cos(a)*s;t.v[1]=Math.sin(a)*s*.6;t.cd=rnd(.15,.45)}move(t,dt);box(t,-5,5,-1.2,2.5)}},
  {id:'close',cat:'track',name:'Close Range',d:'Close and fast',
    init(g){g.targets.push(T([0,0,-4],g.r*.8))},
    update(g,dt){const t=g.targets[0];strafe(t,dt,4,7,.25,.8);move(t,dt);t.p[1]=.4*Math.sin(g.el*2.2);box(t,-3,3)}},

  {id:'sw3',cat:'switch',name:'3 Targets',d:'Kill, then switch',...sw(.35,3,()=>ang(rnd(-35,35),rnd(-15,15),10))},
  {id:'swwide',cat:'switch',name:'Wide Switch',d:'Targets within ±80°',...sw(.3,3,()=>ang(rnd(-80,80),rnd(-20,20),10))},
  {id:'swstrafe',cat:'switch',name:'Strafe Switch',d:'4 strafing targets',
    ...sw(.5,4,()=>ang(rnd(-35,35),rnd(-12,12),10),(g,dt)=>{for(const t of g.targets){strafe(t,dt,1.5,3.5,.4,1.2);move(t,dt);box(t,-7,7)}})},
  {id:'orbit',cat:'switch',name:'Orbit',d:'Targets orbit a ring',
    init(g){for(let i=0;i<4;i++)this.add(g)},
    add(g){let ph;for(let i=0;i<30;i++){ph=R()*6.283;if(!g.targets.some(t=>Math.abs(((ph-t.ph)%6.283+9.425)%6.283-3.142)<.7))break}
      g.targets.push(T(orbitPos(ph),g.r,{hp:.45,max:.45,ph}))},
    kill(g){this.add(g)},
    update(g,dt){for(const t of g.targets){t.ph+=dt*1.1;t.p=orbitPos(t.ph)}}},
  {id:'depth',cat:'switch',name:'Depth',d:'Targets at 5–25 m',
    ...sw(.4,3,()=>ang(rnd(-30,30),rnd(-10,10),rnd(5,25)),(g,dt)=>{for(const t of g.targets){strafe(t,dt,1,2.5,.5,1.4);move(t,dt);box(t,-8,8)}})},
];
