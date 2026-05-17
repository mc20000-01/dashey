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
- **Widget blocks** for text, progress bars, rings, status lights, images, stage previews, audio, iframes, sanitized HTML, logs, charts, tables, controls, terminals, code editors, and minimaps.
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
- Click a dashboard to bring it to the front.
- Use window modes for normal, snapped-left, snapped-right, snapped-top, snapped-bottom, fullscreen, and modal layouts.
- Move windows far offscreen if you want extra workspace. If one gets lost, use `set dashboard [DASH_ID] window x [X] y [Y] w [W] h [H]` to bring it back, for example `x: 80`, `y: 80`, `w: 700`, `h: 480`.

## Widget ideas

- **Debug overlay:** text values, logs, tables, and status lights.
- **Game control panel:** buttons, sliders, toggles, selects, and Scratch variable bindings.
- **Live monitor:** line/bar charts, progress bars, ring charts, and minimaps.
- **Presentation panel:** images, sanitized HTML, iframe embeds, audio, and stage previews.
- **Tool window:** code editor widgets, terminal-style output, and linked dashboard variables.

## Saving and sharing

Dashey automatically saves dashboards in the browser. You can also use the save/load/import/export blocks to preserve a dashboard or move it between projects. Exported dashboards are JSON, so they can be stored in a list, variable, cloud data workflow, or external file depending on your project setup.

## Troubleshooting

- **Nothing appears:** make sure the extension is loaded unsandboxed and run `show dashboard [DASH_ID]` after creating the dashboard.
- **Window is missing:** it may be offscreen. Use the set-window block with a visible `x` and `y` position.
- **HTML does not run scripts:** sanitized HTML intentionally blocks scripts and dangerous attributes. Use iframe widgets and sandbox settings only when you understand the security tradeoff.
- **Saved data looks old:** Dashey migrates older browser saves when possible, but clearing site data/localStorage will remove saved dashboards.
