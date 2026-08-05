# Handoff: Scroll-Driven Guitar Animation

## Overview
A full-bleed frame-by-frame animation of a character playing guitar, driven by scroll direction like a video: scrolling down plays forward from frame 1 to the last frame; scrolling up reverses it back to frame 1. Background is **transparent** (the PNG frames carry their own alpha channel) so it can be dropped onto any background.

## About the design files
`reference-standalone.html` is a **design reference**, not production code to copy verbatim — it's a plain HTML/CSS/JS prototype showing the exact intended behavior, timing, and visuals. The task is to **recreate this in the target codebase's existing environment** (React, Vue, native, etc.) using its established patterns — or, if no environment exists yet, choose the most appropriate framework and implement it there. The animation logic itself is simple and framework-agnostic, so porting it is straightforward; it does not depend on any proprietary runtime.

## Fidelity
**High-fidelity.** Colors, layout, frame assets, and playback behavior are final.

## Behavior
- A tall scroll track (default `300vh`, tune to taste) with a `position: sticky` stage pinned full-viewport-height while the user scrolls through it.
- 121 numbered frames (`frame_00000.png` … `frame_00120.png`) form the animation.
- On scroll, playback direction is derived from scroll delta (down = +1 frame direction, up = −1), **not** from scroll position — once triggered, it free-runs to the end/start at a fixed cadence (30fps, i.e. one frame every ~33ms) like a video, rather than scrubbing frame-by-frame with scroll distance.
- Playback stops automatically when it reaches frame 0 or frame 120 (the last frame).
- A "Scrollea para reproducir" hint + short vertical line is shown centered at the bottom until the user first scrolls, then fades out (`opacity` transition, 0.5s ease) and never reappears.
- A small frame counter (`001 / 121` format, tabular-nums) is pinned top-right for QA/debugging — decide with the user whether to keep this in production or remove it.
- Image element: `object-fit: contain`, capped at `92vh` / `92vw`, non-draggable, no text selection.

## Layout & measurements
- Scroll track: full width, height = `scrollLength` vh (default 300vh — this is a tunable "speed"/scroll-distance control, higher = slower feeling scroll-to-scrub ratio at the trigger level, though since playback is now time-based rather than scroll-position-based, this track height mainly controls how much scroll input is needed to *reach* the animation region within a longer page).
- Sticky stage: `100vh` tall, flex-centered, `overflow: hidden`.
- Background: transparent on the track, stage, and `html, body` — do not add an opaque background color; the frame PNGs already include alpha and are meant to composite over whatever sits behind them.

## Design tokens
- Background: transparent (no fill color)
- Hint text: `#cbbfdd`, uppercase, `13px`, `letter-spacing: 0.12em`, Helvetica/Arial
- Hint line: `#a894c2`, `1px × 32px`
- Frame counter text: `#a894c2`, `12px`, `letter-spacing: 0.08em`

## Assets
- `frames/frame_00000.png` … `frame_00120.png` — 121 sequential PNG frames, the full animation. These are final art, not placeholders.

## Files in this bundle
- `reference-standalone.html` — plain HTML/CSS/JS reference implementation of the full behavior (open directly in a browser).
- `frames/` — all 121 PNG frames referenced by the reference file.
