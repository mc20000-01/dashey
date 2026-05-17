# Dashey

<p align="center">
  <picture>
    <source srcset="icon.svg" type="image/svg+xml">
    <img src="icon.png" alt="Dashey logo" width="120" height="120">
  </picture>
</p>

**Dashey** is an unsandboxed TurboWarp/Scratch extension that lets a project create its own floating dashboard windows from blocks. Use it for debug panels, game HUD tools, control rooms, live monitors, admin panels, data displays, or custom UI overlays.

## What Dashey gives your project

- **Floating dashboard windows** that can be shown, hidden, moved, resized, focused, snapped, or fullscreened.
- **Loose offscreen movement** so dashboards can be dragged partly or fully outside the visible TurboWarp/browser area when you need more workspace.
- **Persistent dashboards** saved in the browser, including window position, size, widgets, pages, themes, variables, links, and bindings.
- **Widget blocks** for text, metrics, badges, progress bars, rings, gauges, status lights, color swatches, images, stage previews and virtual expanded stages, audio, iframes, sanitized HTML/Markdown, logs, lists, timelines, charts, tables, controls, terminals, code editors, clocks, spacers, and minimaps.
- **Project integration** through Scratch variables/lists, widget links, dashboard variables, import/export JSON, and event hats for clicks, hovers, changes, drags, resizes, and page changes.
- **Built-in safety options** for iframe/html widgets, including sandbox modes and HTML sanitization.

## Loading the extension

1. Open TurboWarp or another Scratch VM mod that supports **unsandboxed** custom extensions.
2. Load `dashey.js` as a custom extension.
3. Find the **Dashey** blocks in the extension palette.

> Dashey must run unsandboxed because it creates real browser dashboard windows, stores dashboard data, reads/writes Scratch variables, and renders live UI outside the stage.

## Fast start

Use these blocks in order:

1. `create dashboard [main] titled [Dashey Test]`
2. `add [text] widget [hello] titled [Hello] value [It works!]`
3. `show dashboard [main]`

You should see a draggable Dashey window. Drag it by the title bar, resize it from the bottom-right corner, and click the window controls to hide or fullscreen it.

## Window behavior

Dashey windows are designed to feel like small desktop panels:

- Drag a dashboard by its top bar.
- Resize with the bottom-right grip.
- In freeform layouts, drag widgets by their label and resize them from their own bottom-right grip. Use `set widget [WIDGET_ID] on dashboard [DASH_ID] move [MOVE] resize [RESIZE]` to allow `user`, `code`, `both`, or `none` per widget.
- If a dashboard has exactly one widget, use `set widget [WIDGET_ID] fullscreen [ON] on dashboard [DASH_ID]` to let that widget fill the dashboard body.
- Click a dashboard to bring it to the front.
- Use window modes for normal, snapped-left, snapped-right, snapped-top, snapped-bottom, fullscreen, and modal layouts.
- Move windows far offscreen if you want extra workspace. If one gets lost, use `set dashboard [DASH_ID] window x [X] y [Y] w [W] h [H]` to bring it back, for example `x: 80`, `y: 80`, `w: 700`, `h: 480`.

## Widget ideas

- **Debug overlay:** text values, logs, tables, and status lights.
- **Game control panel:** buttons, sliders, toggles, selects, and Scratch variable bindings.
- **Live monitor:** line/bar charts, progress bars, ring charts, gauges, metric numbers, status lights, color swatches, and minimaps.
- **Presentation panel:** images, sanitized HTML/Markdown, iframe embeds, audio, clocks, badges, spacers, stage previews, and expanded virtual stage cameras.
- **Tool window:** code editor widgets, terminal-style output, and linked dashboard variables.


## Virtual expanded stages

Use a `stage.expand` widget when a dashboard window should act like its own camera view into the Scratch stage. The virtual stage camera stores its own `x`, `y`, `zoom`, `direction`, `width`, and `height`, so multiple Dashey windows can behave like separate fake stages for OS/window-manager style projects. By default, the virtual stage id is the widget id; set `stageId` or `camera.id` in the widget value when a `stage` or `stage.expand` widget needs a separate explicit stage id.

Useful blocks:

- `set virtual stage [STAGE_ID] camera x [X] y [Y] zoom [ZOOM] direction [DIRECTION]`
- `change virtual stage [STAGE_ID] camera x [DX] y [DY] zoom [DZOOM] direction [DDIRECTION]`
- `set virtual stage [STAGE_ID] size w [WIDTH] h [HEIGHT]`
- `localise [VALUE] as [PROP] to stage [STAGE_ID]`
- `normalise [VALUE] as [PROP] from stage [STAGE_ID]`
- `virtual stage [STAGE_ID] [PROP]`

## Saving and sharing

Dashey automatically saves dashboards in the browser. You can also use the save/load/import/export blocks to preserve a dashboard or move it between projects. Exported dashboards are JSON, so they can be stored in a list, variable, cloud data workflow, or external file depending on your project setup.

## Troubleshooting

- **Nothing appears:** make sure the extension is loaded unsandboxed and run `show dashboard [DASH_ID]` after creating the dashboard.
- **Window is missing:** it may be offscreen. Use the set-window block with a visible `x` and `y` position.
- **HTML does not run scripts:** sanitized HTML intentionally blocks scripts and dangerous attributes. Use iframe widgets and sandbox settings only when you understand the security tradeoff.
- **Saved data looks old:** Dashey migrates older browser saves when possible, but clearing site data/localStorage will remove saved dashboards.
Dashey is an unsandboxed TurboWarp/Scratch VM extension for building draggable, resizable, multi-window dashboards from blocks.

## Files

- `dashey.js` — the single merged extension build (`id: dashey`).
- `icon.png` and `icon.svg` — the project logo assets. `dashey.js` embeds the SVG as the extension `iconURI`, and the README displays the PNG/SVG logo assets.

## What was fixed and improved

- Removed the old separate versioned build and merged the best runtime into one `dashey.js` extension.
- Removed old versioned branding from user-facing extension metadata, errors, docs, and runtime globals.
- Rebuilt window chrome so dashboard windows are reliably draggable with pointer events, touch/mouse/pen support, pointer capture, viewport clamping, and proper z-index focus.
- Rebuilt window resizing so the bottom-right handle works with mouse, touch, and pen input.
- Fixed persistence/import/load hydration: saved widgets are recreated before rendering, so restored dashboards no longer fail with empty or broken windows.
- Added migration support for dashboards saved by previous development builds.
- Added safer control behavior so close/minimize/fullscreen buttons do not accidentally start a drag.
- Embedded the repository SVG logo into the extension build.

## Loading

1. Open TurboWarp or another Scratch VM mod that supports unsandboxed custom extensions.
2. Load `dashey.js`.
3. Use the dashboard blocks to create a dashboard, add widgets, and show the dashboard.

## Quick smoke-test script idea

Create a project that runs these blocks in order:

1. Create dashboard `main` titled `Dashey Test`.
2. Add a `text` widget with ID `hello`.
3. Show dashboard `main`.
4. Drag the window by the header and resize it from the lower-right corner.
5. Reload the extension/project and confirm the dashboard restores without errors.
