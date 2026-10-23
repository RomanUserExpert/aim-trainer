# AGENTS.md — guide for AI coding agents

This is a tiny browser aim trainer. People open `index.html` and ask an AI agent
(Claude Code, Codex, Cursor, Copilot…) to add their own scenarios or tweak things.
Read this before changing anything.

## Files

| File | What's there |
|---|---|
| `index.html` | markup only: menu, settings, overlays; loads the CSS and the three scripts |
| `style.css` | all styles |
| `engine.js` | settings `S`, WebGL rendering, scenario toolkit (helpers), game loop, scoring, raw mouse input |
| `scenarios.js` | the `SC` array: **all scenarios, add yours here** |
| `ui.js` | tabs, scenario list, presets, results, settings binding; runs the initial render |

## Hard rules

1. **No dependencies, no build, opens from disk.** It must keep working by
   double-clicking `index.html` (a `file://` URL). So scripts are plain
   `<script src>` tags, **not ES modules** (`type="module"` and `import` are
   blocked on `file://`). The scripts share top-level names; load order is
   `engine.js` → `scenarios.js` → `ui.js`, and code that runs at load time may
   only use names from its own file or earlier ones. No npm, no bundler, no CDN
   libraries, no images or audio files: sounds are synthesized with Web Audio,
   graphics are raw WebGL2. Don't add new files without a good reason.
2. **Stay small and light.** All files together are ~36 KB; keep them under
   ~60 KB. Don't allocate big arrays or create DOM nodes every frame. Rendering
   stops completely in menus and on pause, so keep it that way: the only
   `requestAnimationFrame` loop is `frame()` and it runs only while playing.
3. **Don't touch the mouse math.** Turn per mouse count is
   `sens × game yaw` (`dpc()`), mouse input is raw
   (`requestPointerLock({unadjustedMovement:true})`). This is what makes
   in-game sensitivity match 1:1 and ignores Windows pointer speed and
   acceleration. Don't add smoothing, acceleration, DPI scaling or
   `devicePixelRatio` factors to `movementX/Y`.
4. **UI text is English.** Match the existing style: dense, short-named code,
   few comments, no frameworks.
5. **Every scenario lasts 60 s** (`DUR`). Scores and records depend on it.

## Inside `engine.js`

| Section | What's there |
|---|---|
| `settings` | `S` (persisted to `localStorage['aim.s']`), `BEST` records (`localStorage['aim.b']`), `GAMES` yaw table, `dpc()` |
| `webgl` | shaders: `SP` spheres, `RM` room grid, `BR` health-bar rects; `draw()`, `healthBars()` |
| `targets & scenarios` | the scenario toolkit: `T`, `ang`, `free`, `move`, `box`, `strafe`, `one`, `sw` |
| `game` | `newGame(id)`, `raycast()`, `kill()`, `frame()`, `stats()` scoring, `end()` |
| `input` | pointer lock / raw input, mouse handlers, hotkeys |

## World coordinates

- Units are meters. The camera sits at the origin and starts looking down **−Z**;
  **+Y** is up, **+X** is right.
- The room spans x −20…20, y −5…15, z −25…19. Keep targets inside it.
  Anything below y ≈ −4.3 can clip into the floor at big target sizes.
- Default target distance is 10 m (`z = -10`).
- `g.r` is the target radius picked by the user's size setting
  (`0.08 + size × 0.06`, so 0.14…0.68 m). Always size targets from `g.r`
  (e.g. `g.r*.5` for "micro") so the size slider keeps working.

## Adding a scenario

Add one object to the `SC` array in `scenarios.js`. Usually that is the only
file you need to touch. It shows up automatically in the scenario
list, in its category preset and in the **Full** preset; records are stored per
scenario and target size.

```js
{id:'mything',          // unique, short, never rename (records are keyed by it)
 cat:'click',           // 'click' | 'track' | 'switch'
 name:'My Thing',       // shown on the card
 d:'One-line description',
 init(g){ /* push the starting targets into g.targets */ },
 update(g,dt){ /* optional: move targets every frame, dt in seconds */ },
 kill(g,t){ /* optional: called after target t was destroyed; usually spawn a new one */ }},
```

What the category means:

| `cat` | How the player interacts | Score |
|---|---|---|
| `click` | each LMB click is a shot; a hit destroys the target | hits × 100 × accuracy |
| `track` | hold LMB on the target; targets are never destroyed | share of time on target × 10 000 |
| `switch` | hold LMB to drain `hp` (seconds of holding); at 0 the target dies and `kill()` runs; a health bar is drawn automatically | kills × 100 × accuracy |

### Helpers you should reuse (defined in `engine.js`)

- `T(pos, radius, extra)` creates a target: `{p:[x,y,z], v:[vx,vy,vz], r, hp, max, cd, on}` plus any `extra` fields.
- `ang(yawDeg, pitchDeg, dist)` gives a point at that angle from the start view direction.
- `free(g, gen, r)` calls `gen()` until the point doesn't overlap existing targets.
- `move(t, dt)` integrates `t.v`.
- `box(t, x0, x1, y0, y1)` bounces off bounds (pass only `x0, x1` to bound X only).
- `strafe(t, dt, vMin, vMax, tMin, tMax)` picks a new random left/right speed every `tMin…tMax` s.
- `one(gen, radiusScale)` builds a one-target-at-a-time clicking scenario: spread it into the object.
- `sw(hp, count, gen, update)` builds a switching scenario with `count` targets of `hp` seconds.
- `rnd(a,b)`, `ri(a,b)` (int), `sgn()` (±1), `R()` (Math.random), `D` (deg→rad).
- `g.el` is elapsed seconds, useful for deterministic paths (see `smooth`).

### Examples

Clicking, one target at a time in a ring:

```js
{id:'ring',cat:'click',name:'Ring',d:'Targets on a 20° ring',
  ...one(()=>{const a=R()*6.283;return ang(20*Math.cos(a),12*Math.sin(a),10)})},
```

Tracking, a target that circles slowly:

```js
{id:'circle',cat:'track',name:'Circle',d:'Slow circular path',
  init(g){g.targets.push(T([0,0,-10],g.r))},
  update(g){const t=g.targets[0];t.p[0]=3*Math.cos(g.el*.9);t.p[1]=.5+2*Math.sin(g.el*.9)}},
```

Switching, 5 static targets with 0.3 s of health each:

```js
{id:'sw5',cat:'switch',name:'5 Targets',d:'Five targets, quick kills',
  ...sw(.3,5,()=>ang(rnd(-40,40),rnd(-15,15),10))},
```

Put the new object next to the scenarios of the same category, so the lists
stay grouped. The preset card layout grows on its own. Put helpers that only
your scenario needs (like `orbitPos`) at the top of `scenarios.js`.

## Changing other things

- **A new setting:** add a key to the `S` defaults (`engine.js`), an
  `<input id="key">` inside a `<label>` in the Settings tab (`index.html`), and
  the key to the binding list `for(const k of[...])` (`ui.js`). Range inputs
  with a `<b></b>` in their label show their value automatically.
- **Scoring:** `stats()` in `engine.js`. Changing a formula invalidates
  existing records, so say so to the user.
- **Hit feedback:** `marker()` (CSS hit marker in `style.css`), `beep()`,
  `tick()`, `thud()`.

## Checking your change

There are no tests. Do this:

1. Syntax: `node --check engine.js && node --check scenarios.js && node --check ui.js`.
2. Serve the folder (`python -m http.server 8765`) and open
   `http://127.0.0.1:8765/` in Chrome. Check the console for errors.
3. Pointer lock needs a real click, so to exercise a scenario from the
   DevTools console without playing it, simulate it:

   ```js
   newGame('mything'); g.fire=true;
   for(let i=0;i<600;i++){const dt=1/60;g.el+=dt;g.sc.update&&g.sc.update(g,dt);
     for(const t of g.targets) if(t.p.some(x=>!isFinite(x))) throw 'NaN';}
   show(null); draw(); g.targets.length   // look at the screen, then reload
   ```

4. Then play it for real once (click the card), and tell the user what you
   checked and what you didn't.
