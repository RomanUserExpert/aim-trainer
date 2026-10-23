# Aim Trainer

A tiny aim trainer in a single ~36 KB HTML file. No install, no dependencies,
almost no CPU or GPU load: rendering stops completely in menus.

**Run it:** open `index.html` in Chrome or Edge (they support raw mouse
input, so Windows pointer speed and acceleration are ignored).

- 15 scenarios: 5 clicking, 5 tracking, 5 switching, 60 s each
- Presets (Clicking / Tracking / Switching / Full) with runs per scenario
- Sensitivity copied straight from CS2, Valorant, Apex or Overwatch 2, or set as cm/360
- FOV, aspect ratio (stretched), target size 1–10, colors, crosshair, sounds
- Records per scenario and target size, saved in the browser

Hotkeys: `Esc` pause, `F` fullscreen, `Enter` next/restart on the results screen.

## Make your own scenarios with AI

Open this folder in an AI coding agent (Claude Code, Codex, Cursor, Copilot…)
and describe what you want, for example:

> Add a clicking scenario where targets appear on a ring around the crosshair and shrink over time.

> Add a tracking scenario with a target that zig-zags up and down.

The agent will follow [`AGENTS.md`](AGENTS.md): how scenarios are built, which
helpers to reuse, what not to break (raw input, sensitivity math, single file)
and how to check the result.
