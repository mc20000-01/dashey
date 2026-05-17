// Name         :  Dashey
// ID           :  dashey
// Description  :  Advanced multi-window dashboard runtime for TurboWarp unsandboxed mode.
// License      :  GPL-3.0-only

(function (Scratch) {
  'use strict';

  if (!Scratch?.extensions?.unsandboxed) {
    throw new Error('Dashey must be run unsandboxed.');
  }

  const EXT_ID = 'dashey';
  const STORAGE_KEY = 'dashey:bundle';
  const LEGACY_STORAGE_KEYS = ['dashey:pro:bundle', 'dashey:v2:bundle'];
  const MAX_HISTORY = 100;
  const OFFSCREEN_LIMIT = 10000;
  const MAX_CANVAS_DIMENSION = 4096;
  const STAGE_POPUP_FRAME_INTERVAL = 1000 / 24;

  const LOGO_SVG = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="160.15225" height="160.15225" viewBox="0,0,160.15225,160.15225"><defs><linearGradient x1="249.4437" y1="157.32369" x2="258.8874" y2="157.32369" gradientUnits="userSpaceOnUse" id="color-1"><stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#ffde00"/></linearGradient></defs><g transform="translate(-159.92388,-99.92387)"><g stroke-miterlimit="10"><path d="M174.92388,257.57613c-6.90356,0 -12.5,-5.59644 -12.5,-12.5v-130.15225c0,-6.90356 5.59644,-12.5 12.5,-12.5h130.15225c6.90356,0 12.5,5.59644 12.5,12.5v130.15225c0,6.90356 -5.59644,12.5 -12.5,12.5z" fill="#ffffff" stroke="#000000" stroke-width="5" stroke-linecap="butt"/><path d="M163.07952,130.49673h152.31777" fill="none" stroke="#000000" stroke-width="5" stroke-linecap="round"/><path d="M292.245,109.19128l14.6225,14.62251" fill="none" stroke="#000000" stroke-width="3.75" stroke-linecap="round"/><path d="M306.8675,109.19128l-14.6225,14.6225" fill="none" stroke="#000000" stroke-width="3.75" stroke-linecap="round"/><path d="M245.63576,123.66147h14.01324" fill="none" stroke="#000000" stroke-width="3.75" stroke-linecap="round"/><path d="M268.67879,124.27074c-0.27614,0 -0.5,-0.22386 -0.5,-0.5v-14.53641c0,-0.27614 0.22386,-0.5 0.5,-0.5h14.53641c0.27614,0 0.5,0.22386 0.5,0.5v14.53641c0,0.27614 -0.22386,0.5 -0.5,0.5z" fill="#f5f8fa" stroke="#000000" stroke-width="3.75" stroke-linecap="butt"/><path d="M174.47687,169.81375c-2.76142,0 -5,-2.23858 -5,-5v-22.29137c0,-2.76142 2.23858,-5 5,-5h52.75492c2.76142,0 5,2.23858 5,5v22.29137c0,2.76142 -2.23858,5 -5,5z" fill="#ff0000" stroke="#000000" stroke-width="3.75" stroke-linecap="butt"/><path d="M246.82781,169.20448c-2.76142,0 -5,-2.23858 -5,-5v-21.6821c0,-2.76142 2.23858,-5 5,-5h20.15892c2.76142,0 5,2.23858 5,5v21.6821c0,2.76142 -2.23858,5 -5,5z" fill="#1d00ff" stroke="#000000" stroke-width="3.75" stroke-linecap="butt"/><g fill="none" stroke-width="3.75" stroke-linecap="round"><path d="M249.4437,157.32369h14.92714" stroke="#ffffff"/><path d="M249.4437,157.32369h9.4437" stroke="url(#color-1)"/></g><text transform="translate(250.35761,153.79052) scale(0.30623,0.30623)" font-size="40" xml:space="preserve" fill="#fc00ff" stroke="none" stroke-width="1" stroke-linecap="butt" font-family="Sans Serif" font-weight="normal" text-anchor="start"><tspan x="0" dy="0">15</tspan></text><text transform="translate(171.58436,159.43682) scale(0.5,0.5)" font-size="40" xml:space="preserve" fill="#fc00ff" stroke="none" stroke-width="1" stroke-linecap="butt" font-family="Sans Serif" font-weight="normal" text-anchor="start"><tspan x="0" dy="0">test :3</tspan></text></g></g></svg><!--rotationCenter:80.07612499999999:80.076125-->';
  const LOGO_URI = `data:image/svg+xml,${encodeURIComponent(LOGO_SVG)}`;

  const DEFAULT_THEME = {
    id: 'dark',
    name: 'Dark',
    vars: {
      '--dp-bg': '#14161a',
      '--dp-fg': '#ffffff',
      '--dp-accent': '#00d2ff',
      '--dp-surface': 'rgba(255,255,255,0.05)',
      '--dp-surface-2': 'rgba(255,255,255,0.08)',
      '--dp-border': 'rgba(255,255,255,0.09)',
      '--dp-shadow': '0 25px 50px -12px rgba(0,0,0,0.5)',
      '--dp-radius': '12px',
      '--dp-font': "Inter, Segoe UI, sans-serif"
    }
  };

  const BUILTIN_THEMES = {
    dark: DEFAULT_THEME,
    light: {
      id: 'light', name: 'Light', vars: {
        '--dp-bg': '#f7f9fc', '--dp-fg': '#172033', '--dp-accent': '#2563eb', '--dp-surface': 'rgba(0,0,0,0.045)',
        '--dp-surface-2': 'rgba(0,0,0,0.075)', '--dp-border': 'rgba(0,0,0,0.12)', '--dp-shadow': '0 25px 50px -12px rgba(15,23,42,0.22)',
        '--dp-radius': '12px', '--dp-font': DEFAULT_THEME.vars['--dp-font']
      }
    },
    glass: {
      id: 'glass', name: 'Glass', vars: {
        '--dp-bg': 'rgba(18,24,38,0.72)', '--dp-fg': '#ffffff', '--dp-accent': '#a78bfa', '--dp-surface': 'rgba(255,255,255,0.11)',
        '--dp-surface-2': 'rgba(255,255,255,0.17)', '--dp-border': 'rgba(255,255,255,0.22)', '--dp-shadow': '0 30px 80px -24px rgba(0,0,0,0.72)',
        '--dp-radius': '18px', '--dp-font': DEFAULT_THEME.vars['--dp-font']
      }
    },
    'high-contrast': {
      id: 'high-contrast', name: 'High Contrast', vars: {
        '--dp-bg': '#000000', '--dp-fg': '#ffffff', '--dp-accent': '#ffff00', '--dp-surface': '#111111', '--dp-surface-2': '#1c1c1c',
        '--dp-border': '#ffffff', '--dp-shadow': '0 0 0 2px #ffffff', '--dp-radius': '4px', '--dp-font': DEFAULT_THEME.vars['--dp-font']
      }
    }
  };


  const TEMPLATES = {
    blank: { title: 'Blank Dashboard', layout: { mode: 'grid', columns: 12, rowHeight: 48, gap: 12, snap: true, freeform: false }, widgets: [] },
    monitor: {
      title: 'Monitoring Panel', layout: { mode: 'grid', columns: 12, rowHeight: 48, gap: 12, snap: true, freeform: false },
      widgets: [
        { id: 'cpu', type: 'chart.line', title: 'CPU', pos: { x: 0, y: 0, w: 6, h: 4 }, value: { series: [{ name: 'cpu', values: [10, 20, 16, 35] }], labels: ['1', '2', '3', '4'] } },
        { id: 'ram', type: 'progress.bar', title: 'RAM', pos: { x: 6, y: 0, w: 3, h: 2 }, value: 54 },
        { id: 'log', type: 'log', title: 'Log', pos: { x: 0, y: 4, w: 12, h: 4 }, value: { lines: ['Ready.'] } }
      ]
    },
    control: {
      title: 'Control Center', layout: { mode: 'dock', columns: 12, rowHeight: 48, gap: 12, snap: true, freeform: false },
      widgets: [
        { id: 'start', type: 'control.button', title: 'Start', pos: { x: 0, y: 0, w: 3, h: 2 }, value: { label: 'Start', value: 'start' } },
        { id: 'speed', type: 'control.slider', title: 'Speed', pos: { x: 3, y: 0, w: 6, h: 2 }, value: { value: 50, min: 0, max: 100, step: 1 } },
        { id: 'mode', type: 'control.select', title: 'Mode', pos: { x: 9, y: 0, w: 3, h: 2 }, value: { value: 'auto', options: [{ label: 'Auto', value: 'auto' }, { label: 'Manual', value: 'manual' }] } }
      ]
    }
  };

  const WIDGET_TYPES = [
    'text', 'metric.number', 'badge', 'progress.bar', 'ring.chart', 'gauge.meter', 'status.light', 'color.swatch',
    'image', 'stage', 'stage.expand', 'audio', 'iframe', 'html', 'markdown', 'log', 'list.items', 'timeline', 'chart.line',
    'chart.bar', 'chart.multi', 'table.grid', 'control.button', 'control.input', 'control.toggle',
    'control.slider', 'control.select', 'terminal.console', 'editor.code', 'viewer.minimap', 'clock', 'spacer'
  ];

  const INTERACTION_MODES = ['both', 'user', 'code', 'none'];
  const STAGE_VALUE_PROPS = ['x', 'y', 'direction', 'rotation', 'zoom', 'width', 'height', 'mouse x', 'mouse y'];
  const STAGE_VECTOR_PROPS = ['x', 'y', 'direction', 'rotation', 'size'];

  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const clone = v => { try { return structuredClone(v); } catch { return JSON.parse(JSON.stringify(v)); } };
  const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const canInteract = (widget, kind, source) => {
    const mode = String(widget?.permissions?.[kind] || 'both');
    return mode === 'both' || mode === source;
  };
  const normalizeInteractionMode = value => INTERACTION_MODES.includes(String(value)) ? String(value) : 'both';
  const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const jparse = (s, d = null) => { try { return JSON.parse(s); } catch { return d; } };
  const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

  function sanitizeHTML(input) {
    const doc = new DOMParser().parseFromString(String(input), 'text/html');
    const blocked = new Set(['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base']);
    const tw = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
    const kill = [];
    while (tw.nextNode()) {
      const el = tw.currentNode;
      if (blocked.has(el.tagName.toLowerCase())) { kill.push(el); continue; }
      [...el.attributes].forEach(a => {
        const n = a.name.toLowerCase(); const v = String(a.value).toLowerCase();
        if (n.startsWith('on')) el.removeAttribute(a.name);
        if ((n === 'src' || n === 'href') && v.startsWith('javascript:')) el.removeAttribute(a.name);
      });
    }
    kill.forEach(el => el.remove());
    return doc.body.innerHTML;
  }

  class Dashey {
    constructor() {
      this.dashboards = Object.create(null);
      this.themes = clone(BUILTIN_THEMES);
      this.globalZ = 500;
      this.undoStack = [];
      this.redoStack = [];
      this.renderQueued = false;
      this._disposed = false;
      this._stageFrameCache = { canvas: null, ctx: null, width: 0, height: 0, updatedAt: 0 };
      this._stageFrameHook = null;
      this._missingVirtualStageWarnings = new Set();
      this._stageLoop = this._stageLoop.bind(this);
      this._injectStyles();
      this._loadPersisted();
      this._ensureStageFrameCacheHook();
      this._raf = requestAnimationFrame(this._stageLoop);
      window.addEventListener('beforeunload', () => this._savePersisted());
    }

    getInfo() {
      return {
        id: EXT_ID,
        name: 'Dashey',
        iconURI: LOGO_URI,
        color1: '#00d2ff', color2: '#00a8cc', color3: '#007f99',
        blocks: [
          { opcode: 'createDashboard', blockType: Scratch.BlockType.COMMAND, text: 'create dashboard [DASH_ID] titled [TITLE]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, TITLE: { type: Scratch.ArgumentType.STRING, defaultValue: 'My Dashboard' } } },
          { opcode: 'createFromTemplate', blockType: Scratch.BlockType.COMMAND, text: 'create dashboard [DASH_ID] from template [TEMPLATE]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, TEMPLATE: { type: Scratch.ArgumentType.STRING, menu: 'TEMPLATE_MENU' } } },
          { opcode: 'showDashboard', blockType: Scratch.BlockType.COMMAND, text: 'show dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' } } },
          { opcode: 'hideDashboard', blockType: Scratch.BlockType.COMMAND, text: 'hide dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' } } },
          { opcode: 'destroyDashboard', blockType: Scratch.BlockType.COMMAND, text: 'destroy dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' } } },
          { opcode: 'setDashboardTitle', blockType: Scratch.BlockType.COMMAND, text: 'set dashboard [DASH_ID] title to [TITLE]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, TITLE: { type: Scratch.ArgumentType.STRING, defaultValue: 'Title' } } },
          { opcode: 'setDashboardLayout', blockType: Scratch.BlockType.COMMAND, text: 'set dashboard [DASH_ID] layout [MODE] columns [COLS] row height [ROW] snap [SNAP]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, MODE: { type: Scratch.ArgumentType.STRING, menu: 'LAYOUT_MENU' }, COLS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 12 }, ROW: { type: Scratch.ArgumentType.NUMBER, defaultValue: 48 }, SNAP: { type: Scratch.ArgumentType.BOOLEAN, defaultValue: true } } },
          { opcode: 'setDashboardTheme', blockType: Scratch.BlockType.COMMAND, text: 'set dashboard [DASH_ID] theme [THEME]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, THEME: { type: Scratch.ArgumentType.STRING, menu: 'THEME_MENU' } } },
          { opcode: 'setDashboardColor', blockType: Scratch.BlockType.COMMAND, text: 'set dashboard [DASH_ID] colors bg [BG] fg [FG] accent [ACC]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, BG: { type: Scratch.ArgumentType.COLOR, defaultValue: '#14161a' }, FG: { type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff' }, ACC: { type: Scratch.ArgumentType.COLOR, defaultValue: '#00d2ff' } } },
          { opcode: 'setDashboardWindow', blockType: Scratch.BlockType.COMMAND, text: 'set dashboard [DASH_ID] window x [X] y [Y] w [W] h [H]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 80 }, Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 80 }, W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 700 }, H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 480 } } },
          { opcode: 'setWindowMode', blockType: Scratch.BlockType.COMMAND, text: 'set dashboard [DASH_ID] window mode [MODE]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, MODE: { type: Scratch.ArgumentType.STRING, menu: 'WINDOW_MODE_MENU' } } },
          { opcode: 'setDashboardHost', blockType: Scratch.BlockType.COMMAND, text: 'set dashboard [DASH_ID] host [MODE]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, MODE: { type: Scratch.ArgumentType.STRING, menu: 'HOST_MODE_MENU' } } },
          '---',
          { opcode: 'addWidget', blockType: Scratch.BlockType.COMMAND, text: 'add [TYPE] widget [WIDGET_ID] to dashboard [DASH_ID] titled [TITLE] value [VALUE]', arguments: { TYPE: { type: Scratch.ArgumentType.STRING, menu: 'WIDGET_MENU' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, TITLE: { type: Scratch.ArgumentType.STRING, defaultValue: 'Widget' }, VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '' } } },
          { opcode: 'updateWidget', blockType: Scratch.BlockType.COMMAND, text: 'set widget [WIDGET_ID] on dashboard [DASH_ID] value to [VALUE]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello' } } },
          { opcode: 'appendLog', blockType: Scratch.BlockType.COMMAND, text: 'append [VALUE] to log widget [WIDGET_ID] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'log1' }, VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '> message' } } },
          { opcode: 'setWidgetPosition', blockType: Scratch.BlockType.COMMAND, text: 'set widget [WIDGET_ID] position x [X] y [Y] w [W] h [H] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 }, H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 } } },
          { opcode: 'setWidgetInteraction', blockType: Scratch.BlockType.COMMAND, text: 'set widget [WIDGET_ID] on dashboard [DASH_ID] move [MOVE] resize [RESIZE]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, MOVE: { type: Scratch.ArgumentType.STRING, menu: 'INTERACTION_MENU' }, RESIZE: { type: Scratch.ArgumentType.STRING, menu: 'INTERACTION_MENU' } } },
          { opcode: 'setWidgetFullscreen', blockType: Scratch.BlockType.COMMAND, text: 'set widget [WIDGET_ID] fullscreen [ON] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'stage1' }, ON: { type: Scratch.ArgumentType.BOOLEAN, defaultValue: true } } },
          '---',
          { opcode: 'setVirtualStageCamera', blockType: Scratch.BlockType.COMMAND, text: 'set virtual stage [STAGE_ID] camera x [X] y [Y] zoom [ZOOM] direction [DIRECTION]', arguments: { STAGE_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'stage1' }, X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, ZOOM: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 }, DIRECTION: { type: Scratch.ArgumentType.ANGLE, defaultValue: 90 } } },
          { opcode: 'changeVirtualStageCamera', blockType: Scratch.BlockType.COMMAND, text: 'change virtual stage [STAGE_ID] camera x [DX] y [DY] zoom [DZOOM] direction [DDIRECTION]', arguments: { STAGE_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'stage1' }, DX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, DY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, DZOOM: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, DDIRECTION: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
          { opcode: 'setVirtualStageSize', blockType: Scratch.BlockType.COMMAND, text: 'set virtual stage [STAGE_ID] size w [WIDTH] h [HEIGHT]', arguments: { STAGE_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'stage1' }, WIDTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 480 }, HEIGHT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 360 } } },
          { opcode: 'getVirtualStageInfo', blockType: Scratch.BlockType.REPORTER, text: 'virtual stage [STAGE_ID] [PROP]', arguments: { STAGE_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'stage1' }, PROP: { type: Scratch.ArgumentType.STRING, menu: 'STAGE_INFO_MENU' } } },
          { opcode: 'localiseToStage', blockType: Scratch.BlockType.REPORTER, text: 'localise scalar [VALUE] as [PROP] to stage [STAGE_ID]', arguments: { VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, PROP: { type: Scratch.ArgumentType.STRING, menu: 'STAGE_VECTOR_MENU' }, STAGE_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'stage1' } } },
          { opcode: 'normaliseFromStage', blockType: Scratch.BlockType.REPORTER, text: 'normalise scalar [VALUE] as [PROP] from stage [STAGE_ID]', arguments: { VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, PROP: { type: Scratch.ArgumentType.STRING, menu: 'STAGE_VECTOR_MENU' }, STAGE_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'stage1' } } },
          { opcode: 'setWidgetStyle', blockType: Scratch.BlockType.COMMAND, text: 'set widget [WIDGET_ID] style key [KEY] value [VALUE] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, KEY: { type: Scratch.ArgumentType.STRING, defaultValue: 'accent' }, VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '#00d2ff' } } },
          { opcode: 'setWidgetShape', blockType: Scratch.BlockType.COMMAND, text: 'set widget [WIDGET_ID] shape [SHAPE] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, SHAPE: { type: Scratch.ArgumentType.STRING, menu: 'SHAPE_MENU' } } },
          { opcode: 'setWidgetTitle', blockType: Scratch.BlockType.COMMAND, text: 'set widget [WIDGET_ID] title to [TITLE] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, TITLE: { type: Scratch.ArgumentType.STRING, defaultValue: 'Widget' } } },
          { opcode: 'removeWidget', blockType: Scratch.BlockType.COMMAND, text: 'remove widget [WIDGET_ID] from dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' } } },
          '---',
          { opcode: 'bindWidgetToVar', blockType: Scratch.BlockType.COMMAND, text: 'bind widget [WIDGET_ID] [DIR] to variable [VAR] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, DIR: { type: Scratch.ArgumentType.STRING, menu: 'BIND_DIR_MENU' }, VAR: { type: Scratch.ArgumentType.STRING, defaultValue: 'score' } } },
          { opcode: 'linkWidgets', blockType: Scratch.BlockType.COMMAND, text: 'link widget [FROM] output to widget [TO] input on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, FROM: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, TO: { type: Scratch.ArgumentType.STRING, defaultValue: 'w2' } } },
          { opcode: 'setDashboardVar', blockType: Scratch.BlockType.COMMAND, text: 'set dashboard variable [NAME] to [VALUE] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'var' }, VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '0' } } },
          { opcode: 'changeDashboardVar', blockType: Scratch.BlockType.COMMAND, text: 'change dashboard variable [NAME] by [VALUE] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'var' }, VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '1' } } },
          { opcode: 'getDashboardVar', blockType: Scratch.BlockType.REPORTER, text: 'dashboard variable [NAME] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'var' } } },
          { opcode: 'getWidgetValue', blockType: Scratch.BlockType.REPORTER, text: 'widget [WIDGET_ID] value on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' } } },
          '---',
          { opcode: 'saveDashboard', blockType: Scratch.BlockType.COMMAND, text: 'save dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' } } },
          { opcode: 'loadDashboard', blockType: Scratch.BlockType.COMMAND, text: 'load dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' } } },
          { opcode: 'exportDashboard', blockType: Scratch.BlockType.REPORTER, text: 'export dashboard [DASH_ID] as JSON', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' } } },
          { opcode: 'importDashboard', blockType: Scratch.BlockType.COMMAND, text: 'import dashboard [JSON] as [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, JSON: { type: Scratch.ArgumentType.STRING, defaultValue: '{"schemaVersion":"2.0.0"}' } } },
          { opcode: 'undo', blockType: Scratch.BlockType.COMMAND, text: 'undo last dashboard action' },
          { opcode: 'redo', blockType: Scratch.BlockType.COMMAND, text: 'redo last dashboard action' },
          '---',
          { opcode: 'setDebugMode', blockType: Scratch.BlockType.COMMAND, text: 'set dashboard [DASH_ID] debug mode [ON]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, ON: { type: Scratch.ArgumentType.BOOLEAN, defaultValue: false } } },
          { opcode: 'inspectWidget', blockType: Scratch.BlockType.COMMAND, text: 'inspect widget [WIDGET_ID] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' } } },
          { opcode: 'setWidgetSandbox', blockType: Scratch.BlockType.COMMAND, text: 'set widget [WIDGET_ID] sandbox [MODE] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, MODE: { type: Scratch.ArgumentType.STRING, menu: 'SANDBOX_MENU' } } },
          '---',
          { opcode: 'whenWidgetClicked', blockType: Scratch.BlockType.HAT, text: 'when widget [WIDGET_ID] clicked on dashboard [DASH_ID]', isEdgeActivated: false, arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' } } },
          { opcode: 'whenWidgetHovered', blockType: Scratch.BlockType.HAT, text: 'when widget [WIDGET_ID] hovered on dashboard [DASH_ID]', isEdgeActivated: false, arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' } } },
          { opcode: 'whenWidgetChanged', blockType: Scratch.BlockType.HAT, text: 'when widget [WIDGET_ID] value changed on dashboard [DASH_ID]', isEdgeActivated: false, arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' } } },
          { opcode: 'whenWidgetDragged', blockType: Scratch.BlockType.HAT, text: 'when widget [WIDGET_ID] dragged on dashboard [DASH_ID]', isEdgeActivated: false, arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' } } },
          { opcode: 'whenWidgetResized', blockType: Scratch.BlockType.HAT, text: 'when widget [WIDGET_ID] resized on dashboard [DASH_ID]', isEdgeActivated: false, arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' } } },
          { opcode: 'whenDashboardPageChanged', blockType: Scratch.BlockType.HAT, text: 'when dashboard [DASH_ID] page changed', isEdgeActivated: false, arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' } } }
        ],
        menus: {
          WIDGET_MENU: { acceptReporters: true, items: WIDGET_TYPES },
          TEMPLATE_MENU: { acceptReporters: true, items: Object.keys(TEMPLATES) },
          LAYOUT_MENU: { acceptReporters: true, items: ['grid', 'freeform', 'dock', 'tabs', 'pages'] },
          THEME_MENU: { acceptReporters: true, items: ['dark', 'light', 'glass', 'high-contrast', 'custom'] },
          WINDOW_MODE_MENU: { acceptReporters: true, items: ['windowed', 'snapped-left', 'snapped-right', 'snapped-top', 'snapped-bottom', 'fullscreen', 'modal'] },
          HOST_MODE_MENU: { acceptReporters: true, items: ['inline', 'popup'] },
          SHAPE_MENU: { acceptReporters: true, items: ['rounded', 'sharp', 'circle', 'pill'] },
          BIND_DIR_MENU: { acceptReporters: true, items: ['input', 'output', 'both'] },
          SANDBOX_MENU: { acceptReporters: true, items: ['safe', 'restricted', 'unsafe'] },
          INTERACTION_MENU: { acceptReporters: true, items: INTERACTION_MODES },
          STAGE_INFO_MENU: { acceptReporters: true, items: STAGE_VALUE_PROPS },
          STAGE_VECTOR_MENU: { acceptReporters: true, items: STAGE_VECTOR_PROPS }
        }
      };
    }

    _injectStyles() {
      const existing = document.getElementById('dashey-style');
      if (existing) {
        this._styleText = existing.textContent || '';
        return;
      }
      if (document.getElementById('dashey-style')) return;
      const style = document.createElement('style');
      style.id = 'dashey-style';
      style.textContent = `
        @keyframes dp-pop { from { opacity: 0; transform: scale(0.98) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .dp-host { all: initial; position: fixed; inset: 0; z-index: 500; pointer-events: none; }
        .dp-popup-permission { position: fixed; right: 18px; bottom: 18px; z-index: 2147483647; display: flex; align-items: center; gap: 10px; max-width: 320px; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.18); background: rgba(20,22,26,0.94); color: #fff; font-family: Inter, Segoe UI, sans-serif; font-size: 13px; line-height: 1.35; box-shadow: 0 18px 42px rgba(0,0,0,0.35); pointer-events: auto; }
        .dp-popup-permission button { appearance: none; border: 0; border-radius: 999px; background: #00d2ff; color: #061017; cursor: pointer; font: inherit; font-weight: 700; padding: 8px 12px; white-space: nowrap; }
        .dp-popup-permission button:hover { filter: brightness(1.08); }
        .dp-window { position: fixed; display: none; flex-direction: column; overflow: hidden; border-radius: 12px; color: var(--dp-fg); font-family: var(--dp-font); box-shadow: var(--dp-shadow); background: var(--dp-bg); border: 1px solid var(--dp-border); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); pointer-events: auto; }
        .dp-header { user-select: none; -webkit-user-select: none; touch-action: none; cursor: grab; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; background: rgba(0,0,0,0.28); border-bottom: 1px solid rgba(255,255,255,0.06); position: relative; min-height: 38px; }
        .dp-title { position: absolute; left: 50%; transform: translateX(-50%); font-size: 13px; font-weight: 700; }
        .dp-body { flex: 1; overflow: auto; padding: 12px; min-height: 0; }
        .dp-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); grid-auto-rows: 48px; gap: 12px; align-content: start; min-height: 100%; min-width: 0; }
        .dp-body { flex: 1; overflow: auto; padding: 12px; }
        .dp-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 12px; align-content: start; min-height: 100%; }
        .dp-grid.dp-freeform { min-height: 100%; }
        .dp-card { background: var(--dp-surface); border: 1px solid var(--dp-border); border-radius: var(--dp-radius); padding: 12px; overflow: hidden; position: relative; min-height: 48px; box-sizing: border-box; box-shadow: 0 4px 12px rgba(0,0,0,0.18); transition: transform 0.15s, background 0.15s, border-color 0.15s, opacity 0.15s; }
        .dp-card:hover { background: var(--dp-surface-2); }
        .dp-card.dp-debug { outline: 2px dashed rgba(0,210,255,0.85); outline-offset: -2px; }
        .dp-card.dp-can-move .dp-label { cursor: grab; touch-action: none; }
        .dp-card.dp-moving .dp-label { cursor: grabbing; }
        .dp-card.dp-no-resize > .dp-resize { display: none; }
        .dp-card.dp-widget-fullscreen { grid-column: 1 / -1 !important; grid-row: 1 / span 1 !important; width: 100% !important; height: 100% !important; min-height: 0 !important; }
        .dp-card.dp-widget-fullscreen .dp-label { display: none; }
        .dp-card.dp-widget-fullscreen .dp-resize { display: none; }
        .dp-card.dp-widget-fullscreen > div:nth-child(2) { height: 100% !important; min-height: 0; }
        .dp-card.dp-widget-fullscreen { grid-column: 1 / -1 !important; grid-row: 1 / -1 !important; width: 100% !important; height: 100% !important; min-height: calc(100% - 2px); }
        .dp-card.dp-widget-fullscreen .dp-label { display: none; }
        .dp-card.dp-widget-fullscreen .dp-resize { display: none; }
        .dp-card.dp-widget-fullscreen > div:nth-child(2) { height: 100% !important; }
        .dp-label { font-size: 11px; color: rgba(255,255,255,0.68); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; font-weight: 700; }
        .dp-center { display: flex; align-items: center; justify-content: center; }
        .dp-text { font-size: 20px; font-weight: 700; word-break: break-word; }
        .dp-metric { font-size: 34px; font-weight: 900; line-height: 1; }
        .dp-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 6px 10px; background: var(--dp-accent); color: #fff; font-size: 12px; font-weight: 800; }
        .dp-swatch { width: 100%; height: 100%; min-height: 44px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.18); }
        .dp-list, .dp-timeline { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.45; }
        .dp-clock { font-size: 28px; font-weight: 900; text-align: center; }
        .dp-log { margin: 0; font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word; overflow: auto; max-height: 100%; }
        .dp-input, .dp-select, .dp-textarea { width: 100%; box-sizing: border-box; border: 1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.18); color: inherit; border-radius: 10px; padding: 10px 12px; outline: none; }
        .dp-button { width: 100%; border: 0; border-radius: 12px; background: var(--dp-accent); color: #fff; padding: 10px 12px; font-weight: 800; cursor: pointer; }
        .dp-toggle-wrap { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; }
        .dp-toggle { width: 42px; height: 24px; border-radius: 999px; background: rgba(255,255,255,0.16); position: relative; transition: background 0.2s; }
        .dp-toggle-on { background: var(--dp-accent); }
        .dp-toggle-thumb { width: 18px; height: 18px; border-radius: 50%; background: white; position: absolute; top: 3px; left: 3px; transition: transform 0.2s; }
        .dp-toggle-on .dp-toggle-thumb { transform: translateX(18px); }
        .dp-slider { width: 100%; }
        .dp-ring { position: relative; width: 64px; height: 64px; margin: 0 auto; }
        .dp-gauge { width: 100%; height: 72px; }
        .dp-ring svg { transform: rotate(-90deg); overflow: visible; }
        .dp-ring-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-weight: 800; }
        .dp-status { width: 24px; height: 24px; border-radius: 50%; margin: 0 auto; box-shadow: 0 0 10px currentColor; }
        .dp-iframe, .dp-img, .dp-stage-canvas { width: 100%; height: 100%; border: 0; border-radius: 8px; background: rgba(0,0,0,0.2); box-sizing: border-box; }
        .dp-stage-canvas { display: block; object-fit: contain; background: #000; min-width: 0; min-height: 0; max-width: 100%; max-height: 100%; contain: strict; }
        .dp-stage-card { min-height: 0; }
        .dp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .dp-table th, .dp-table td { border-bottom: 1px solid rgba(255,255,255,0.08); padding: 6px 8px; text-align: left; }
        .dp-table th { cursor: pointer; position: sticky; top: 0; background: rgba(0,0,0,0.22); }
        .dp-terminal { background: #0b0d11; color: #d7e0ea; border-radius: 8px; padding: 8px; height: 100%; display: flex; flex-direction: column; }
        .dp-terminal-output { flex: 1; overflow: auto; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
        .dp-terminal-input { width: 100%; border: 0; outline: none; background: transparent; color: inherit; font-family: monospace; font-size: 12px; margin-top: 6px; }
        .dp-minimap { width: 100%; height: 100%; background: rgba(0,0,0,0.15); border-radius: 8px; }
        .dp-resize { position: absolute; width: 18px; height: 18px; touch-action: none; right: 0; bottom: 0; cursor: nwse-resize; background: transparent; }
        .dp-resize::after { content: ''; position: absolute; right: 2px; bottom: 2px; width: 7px; height: 7px; border-right: 2px solid rgba(255,255,255,0.7); border-bottom: 2px solid rgba(255,255,255,0.7); }
        .dp-inspector { font-family: monospace; font-size: 12px; white-space: pre-wrap; }
      `;
      this._styleText = style.textContent;
      document.head.appendChild(style);
    }

    _makeDashboard(id, title) {
      return {
        id, title,
        widgets: Object.create(null), bindings: [], links: [], variables: Object.create(null),
        pages: [{ id: 'page1', title: 'Page 1', widgets: [] }], activePage: 'page1',
        layout: { mode: 'grid', columns: 12, rowHeight: 48, gap: 12, snap: true, freeform: false },
        theme: clone(DEFAULT_THEME),
        window: { x: 80, y: 80, width: 700, height: 480, zIndex: this.globalZ++, mode: 'windowed', hostMode: 'inline', hostType: 'inline', pinned: false, alwaysOnTop: false },
        security: { defaultMode: 'safe' },
        state: { minimized: false, maximized: false, prevWindow: null, debug: false, modal: false },
        host: null, shadow: null, popup: null, popupRoot: null, container: null, header: null, body: null, grid: null, dirty: false
      };
    }

    _applyTheme(dash) {
      if (!dash?.container) return;
      const vars = dash.theme?.vars || DEFAULT_THEME.vars;
      for (const k in vars) dash.container.style.setProperty(k, vars[k]);
      dash.container.style.background = 'var(--dp-bg)';
      dash.container.style.color = 'var(--dp-fg)';
      dash.container.style.fontFamily = 'var(--dp-font)';
    }

    _getDash(id, autoTitle = null) {
      const k = String(id);
      if (!this.dashboards[k] && autoTitle !== null) this.createDashboard({ DASH_ID: k, TITLE: autoTitle });
      return this.dashboards[k];
    }

    _serializeWidget(w) {
      const data = { id: w.id, type: w.type, title: w.title, value: w.value, state: w.state, style: w.style, sandbox: w.sandbox, position: w.position, permissions: w.permissions, camera: w.camera, fullscreen: !!w.fullscreen };
      if (this._isStageWidget(w)) {
        const stageId = this._getVirtualStageId(w);
        data.stageId = stageId;
        data.camera = { ...this._normalizeStageCamera(w.camera || w.value), id: stageId };
      }
      return data;
    }

    _serializeDashboard(dash) {
      const windowState = clone(dash.window);
      windowState.hostMode = this._getHostType(dash);
      windowState.hostType = windowState.hostMode;
      return {
        id: dash.id, title: dash.title, window: windowState, layout: clone(dash.layout), theme: clone(dash.theme), variables: clone(dash.variables),
        bindings: clone(dash.bindings), links: clone(dash.links), pages: clone(dash.pages), activePage: dash.activePage, security: clone(dash.security),
        widgets: Object.values(dash.widgets).map(w => this._serializeWidget(w))
      };
    }



    _deserializeDashboard(obj) {
      const dash = this._makeDashboard(obj.id, obj.title || obj.id);
      dash.window = Object.assign(dash.window, obj.window || {});
      dash.window.hostMode = this._normalizeHostMode(dash.window.hostMode || dash.window.hostType);
      dash.window.hostType = dash.window.hostMode;
      dash.layout = Object.assign(dash.layout, obj.layout || {});
      dash.theme = obj.theme || clone(DEFAULT_THEME);
      dash.variables = obj.variables || Object.create(null);
      dash.bindings = obj.bindings || [];
      dash.links = obj.links || [];
      dash.pages = obj.pages || [{ id: 'page1', title: 'Page 1', widgets: [] }];
      dash.activePage = obj.activePage || 'page1';
      dash.security = obj.security || dash.security;
      for (const w of (obj.widgets || [])) {
        const widget = { id: w.id, type: w.type, title: w.title, value: w.value, state: w.state || {}, style: w.style || {}, sandbox: w.sandbox || 'safe', position: w.position || { x: 0, y: 0, w: 3, h: 2, mode: 'grid' }, permissions: { move: normalizeInteractionMode(w.permissions?.move), resize: normalizeInteractionMode(w.permissions?.resize) }, camera: this._normalizeStageCamera(w.camera || w.value), fullscreen: !!w.fullscreen, dom: {}, card: null, content: null, resizeHandle: null };
        if (this._isStageWidget(widget)) this._applyVirtualStageId(widget, w);
        dash.widgets[w.id] = widget;
      }
      return dash;
    }

    _savePersisted() {
      const bundle = { schemaVersion: '2.0.0', updatedAt: Date.now(), dashboards: {}, themes: clone(this.themes) };
      for (const id in this.dashboards) bundle.dashboards[id] = this._serializeDashboard(this.dashboards[id]);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle)); } catch (e) { console.warn('[Dashey] save failed', e); }
    }


    _loadPersisted() {
      let bundle = jparse(localStorage.getItem(STORAGE_KEY), null);
      if (!bundle) {
        for (const key of LEGACY_STORAGE_KEYS) {
          bundle = jparse(localStorage.getItem(key), null);
          if (bundle) break;
        }
      }
      if (!bundle) return;
      this.themes = Object.assign(clone(BUILTIN_THEMES), bundle.themes || {});
      for (const id in bundle.dashboards || {}) {
        const dash = this._deserializeDashboard(bundle.dashboards[id]);
        this.dashboards[id] = dash;
        this._hydrateDashboardDom(dash);
      }
    }


    _bringToFront(dash) {
      if (!dash) return;
      this.globalZ = Math.max(this.globalZ + 1, Number(dash.window?.zIndex || 0) + 1);
      dash.window.zIndex = this.globalZ;
      if (dash.host?.style) dash.host.style.zIndex = String(dash.window.zIndex);
      if (dash.container?.style && this._getActiveHostType(dash) === 'popup') dash.container.style.zIndex = String(dash.window.zIndex);
      if (this._isPopupOpen(dash)) {
        try { dash.popup.focus(); } catch {}
      }
    }

    _normalizeHostMode(mode) {
      return String(mode || '').toLowerCase() === 'popup' ? 'popup' : 'inline';
    }

    _getHostType(dash) {
      return this._normalizeHostMode(dash?.window?.hostMode || dash?.window?.hostType);
    }

    _getActiveHostType(dash) {
      if (dash?._activeHostType) return dash._activeHostType;
      if (dash?.popupRoot) return 'popup';
      if (dash?.host) return 'inline';
      return null;
    }

    _isPopupOpen(dash) {
      try { return !!dash?.popup && !dash.popup.closed; } catch { return false; }
    }

    _getHostWindow(dash) {
      return dash?.container?.ownerDocument?.defaultView || window;
    }

    _escapeHtml(text) {
      return String(text ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    }

    _styleForPopup() {
      return this._styleText || document.getElementById('dashey-style')?.textContent || '';
    }

    _closeDashboardPopup(dash) {
      if (!dash?.popup) return;
      try { if (!dash.popup.closed) dash.popup.close(); } catch {}
      dash.popup = null;
      dash.popupRoot = null;
    }

    _resetWidgetDom(dash) {
      if (!dash?.widgets) return;
      for (const wid in dash.widgets) {
        const w = dash.widgets[wid];
        try { if (w._cleanupResize) w._cleanupResize(); } catch {}
        w._cleanupResize = null;
        w.card = null;
        w.content = null;
        w.label = null;
        w.resizeHandle = null;
        w.dom = {};
        w.inputEl = null;
      }
    }

    _teardownDashboardHost(dash, options = {}) {
      if (!dash) return;
      try { if (dash.cleanupDrag) dash.cleanupDrag(); } catch {}
      try { if (dash.cleanupResize) dash.cleanupResize(); } catch {}
      try { if (dash._popupMessageCleanup) dash._popupMessageCleanup(); } catch {}
      try { if (dash.permissionPrompt?.parentNode) dash.permissionPrompt.parentNode.removeChild(dash.permissionPrompt); } catch {}
      dash.permissionPrompt = null;
      dash._popupMessageCleanup = null;
      dash._popupStageTransport = null;
      dash.cleanupDrag = null;
      dash.cleanupResize = null;
      if (options.resetWidgets) this._resetWidgetDom(dash);
      if (dash.host?.parentNode) dash.host.parentNode.removeChild(dash.host);
      dash.host = null;
      dash.shadow = null;
      dash.popupRoot = null;
      dash.container = null;
      dash.header = null;
      dash.body = null;
      dash.grid = null;
      if (options.closePopup) this._closeDashboardPopup(dash);
      dash._activeHostType = null;
    }

    _postDashboardModel(dash) {
      if (!this._isPopupOpen(dash)) return;
      try {
        dash.popup.postMessage({ type: 'dashey:model', dashId: dash.id, dashboard: this._serializeDashboard(dash) }, '*');
      } catch {}
    }


    _getLooseWindowBounds(width = 700, height = 480) {
      const screenWidth = num(window.screen?.availWidth || window.screen?.width, window.innerWidth || 1280);
      const screenHeight = num(window.screen?.availHeight || window.screen?.height, window.innerHeight || 720);
      const spanX = Math.min(OFFSCREEN_LIMIT, Math.max(screenWidth * 2, window.innerWidth * 3, width * 2));
      const spanY = Math.min(OFFSCREEN_LIMIT, Math.max(screenHeight * 2, window.innerHeight * 3, height * 2));
      return {
        minX: -spanX,
        maxX: spanX,
        minY: -spanY,
        maxY: spanY,
        maxWidth: Math.max(260, Math.min(OFFSCREEN_LIMIT, screenWidth * 2, window.innerWidth * 3 || screenWidth * 2)),
        maxHeight: Math.max(180, Math.min(OFFSCREEN_LIMIT, screenHeight * 2, window.innerHeight * 3 || screenHeight * 2))
      };
    }

    _syncWindowStyles(dash) {
      if (!dash?.container) return;
      const mode = dash.window.mode || 'windowed';
      const isPopup = this._getActiveHostType(dash) === 'popup';
      if (dash.host?.style) dash.host.style.zIndex = String(dash.window.zIndex || this.globalZ);
      if (isPopup) dash.container.style.zIndex = String(dash.window.zIndex || this.globalZ);
      dash.container.style.borderRadius = mode === 'windowed' || mode === 'modal' ? '12px' : '0px';
      if (isPopup) {
        Object.assign(dash.container.style, { left: '0px', top: '0px', width: '100vw', height: '100vh' });
        return;
      }
      if (mode === 'fullscreen') {
        Object.assign(dash.container.style, { left: '0px', top: '0px', width: '100vw', height: '100vh' });
      } else if (mode === 'snapped-left') {
        Object.assign(dash.container.style, { left: '0px', top: '0px', width: '50vw', height: '100vh' });
      } else if (mode === 'snapped-right') {
        Object.assign(dash.container.style, { left: '50vw', top: '0px', width: '50vw', height: '100vh' });
      } else if (mode === 'snapped-top') {
        Object.assign(dash.container.style, { left: '0px', top: '0px', width: '100vw', height: '50vh' });
      } else if (mode === 'snapped-bottom') {
        Object.assign(dash.container.style, { left: '0px', top: '50vh', width: '100vw', height: '50vh' });
      } else {
        const bounds = this._getLooseWindowBounds(dash.window.width, dash.window.height);
        const width = clamp(num(dash.window.width, 700), 260, bounds.maxWidth);
        const height = clamp(num(dash.window.height, 480), 180, bounds.maxHeight);
        dash.window.width = width;
        dash.window.height = height;
        dash.window.x = clamp(num(dash.window.x, 80), bounds.minX, bounds.maxX);
        dash.window.y = clamp(num(dash.window.y, 80), bounds.minY, bounds.maxY);
        Object.assign(dash.container.style, {
          left: `${dash.window.x}px`, top: `${dash.window.y}px`, width: `${width}px`, height: `${height}px`
        });
      }
    }


    _gridMetrics(dash) {
      const rect = dash.grid?.getBoundingClientRect?.() || { width: 0 };
      const cols = clamp(num(dash.layout?.columns, 12), 1, 48);
      const gap = num(dash.layout?.gap, 12);
      const colWidth = Math.max(1, (Math.max(1, rect.width) - gap * (cols - 1)) / cols);
      return { cols, gap, colWidth, rowHeight: num(dash.layout?.rowHeight, 48) };
    }

    _applyWidgetPermissions(widget) {
      if (!widget?.card) return;
      widget.permissions = widget.permissions || { move: 'both', resize: 'both' };
      widget.permissions.move = normalizeInteractionMode(widget.permissions.move);
      widget.permissions.resize = normalizeInteractionMode(widget.permissions.resize);
      widget.card.classList.toggle('dp-can-move', canInteract(widget, 'move', 'user'));
      widget.card.classList.toggle('dp-no-resize', !canInteract(widget, 'resize', 'user'));
      widget.card.classList.toggle('dp-widget-fullscreen', !!widget.fullscreen);
    }

    _applyWidgetPosition(dash, widget) {
      if (!dash?.grid || !widget?.card) return;
      widget.position = widget.position || { x: 0, y: 0, w: 3, h: 2, mode: 'grid' };
      widget.position.mode = dash.layout.mode === 'freeform' ? 'freeform' : 'grid';
      this._applyWidgetPermissions(widget);
      if (widget.position.mode === 'freeform') {
        Object.assign(widget.card.style, {
          position: 'absolute',
          left: `${num(widget.position.x, 0)}px`,
          top: `${num(widget.position.y, 0)}px`,
          width: `${Math.max(80, num(widget.position.w, 180))}px`,
          height: `${Math.max(48, num(widget.position.h, 120))}px`,
          gridColumn: '',
          gridRow: ''
        });
      } else {
        Object.assign(widget.card.style, {
          position: '',
          left: '',
          top: '',
          width: '',
          height: '',
          gridColumn: `span ${clamp(num(widget.position.w, 3), 1, 48)}`,
          gridRow: `span ${clamp(num(widget.position.h, 2), 1, 48)}`
        });
      }
    }

    _hydrateDashboardDom(dash) {
      if (!dash) return;
      if (dash.popup && !this._isPopupOpen(dash)) {
        this._teardownDashboardHost(dash, { resetWidgets: true });
        dash.popup = null;
      }
      this._createHostAndWindow(dash);
      for (const wid in dash.widgets) {
        const w = dash.widgets[wid];
        if (!w.card) this._createWidgetDom(dash, w, w.title, w.value);
      }
      this._renderDashboardFromModel(dash);
      this._syncWindowStyles(dash);
      this._postDashboardModel(dash);
    }

    _record(change) {
      if (!change) return;
      this.undoStack.push(change);
      if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
      this.redoStack.length = 0;
    }

    _createHostAndWindow(dash) {
      const targetType = this._getHostType(dash);
      const currentType = this._getActiveHostType(dash);
      if (dash.container && currentType === targetType && (targetType !== 'popup' || this._isPopupOpen(dash))) return;
      if (dash.container || currentType) this._teardownDashboardHost(dash, { resetWidgets: true, closePopup: currentType === 'popup' && targetType !== 'popup' });
      if (targetType === 'popup' && this._createPopupHostAndWindow(dash)) return;
      dash.window.hostType = 'inline';
      this._createInlineHostAndWindow(dash);
      if (targetType === 'popup') this._showPopupPermissionPrompt(dash);
    }

    _createInlineHostAndWindow(dash) {
      dash._activeHostType = 'inline';
      dash.window.hostType = 'inline';
      dash.host = document.createElement('div');
      dash.host.className = 'dp-host';
      dash.host.id = `dp-host-${dash.id}`;
      dash.host.style.zIndex = dash.window.zIndex;
      document.body.appendChild(dash.host);
      dash.shadow = dash.host.attachShadow({ mode: 'open' });
      const shim = document.createElement('style');
      shim.textContent = `:host{all:initial;position:fixed;inset:0;pointer-events:none}${this._styleForPopup()}`;
      dash.shadow.appendChild(shim);
      const root = document.createElement('div');
      root.className = 'dp-window';
      dash.container = root; dash.shadow.appendChild(root);
      this._finishHostAndWindow(dash);
    }


    _showPopupPermissionPrompt(dash) {
      if (!dash?.shadow) return;
      if (dash.permissionPrompt?.parentNode) dash.permissionPrompt.parentNode.removeChild(dash.permissionPrompt);
      const prompt = document.createElement('div');
      prompt.className = 'dp-popup-permission';
      const message = document.createElement('span');
      message.textContent = 'Dashey needs a click to open this dashboard in a popup window.';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Open Dashey window';
      button.addEventListener('click', () => this._openDashboardPopupFromPrompt(dash));
      prompt.append(message, button);
      dash.permissionPrompt = prompt;
      dash.shadow.appendChild(prompt);
    }

    _openDashboardPopupFromPrompt(dash) {
      if (!dash) return;
      if (dash.permissionPrompt?.parentNode) dash.permissionPrompt.parentNode.removeChild(dash.permissionPrompt);
      dash.permissionPrompt = null;
      const wasMinimized = !!dash.state.minimized;
      this._teardownDashboardHost(dash, { resetWidgets: true, closePopup: true });
      dash.window.hostMode = 'popup';
      if (!this._createPopupHostAndWindow(dash)) {
        this._createInlineHostAndWindow(dash);
        this._showPopupPermissionPrompt(dash);
      }
      for (const wid in dash.widgets) {
        const w = dash.widgets[wid];
        if (!w.card) this._createWidgetDom(dash, w, w.title, w.value);
      }
      this._renderDashboardFromModel(dash);
      this._syncWindowStyles(dash);
      if (dash.container) dash.container.style.display = wasMinimized ? 'none' : 'flex';
      this._bringToFront(dash);
      this._postDashboardModel(dash);
      this._savePersisted();
    }

    _createPopupHostAndWindow(dash) {
      let popup = null;
      try { popup = window.open('', 'dashey-' + dash.id, 'popup,width=700,height=480'); } catch {}
      if (!popup || popup.closed) {
        console.warn('[Dashey] Popup blocked; falling back to inline dashboard host.');
        this._closeDashboardPopup(dash);
        return false;
      }
      try {
        const doc = popup.document;
        doc.open();
        doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${this._escapeHtml(dash.title || dash.id)}</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:var(--dp-bg,#14161a)}${this._styleForPopup().replace(/<\/style/gi, '<\\/style')}</style></head><body><div id="dashey-popup-root"></div></body></html>`);
        doc.close();
        const root = doc.getElementById('dashey-popup-root');
        if (!root) throw new Error('Popup root was not created.');
        const container = doc.createElement('div');
        container.className = 'dp-window';
        root.appendChild(container);
        const drawUnavailable = canvas => {
          const ctx = canvas?.getContext?.('2d');
          if (!ctx) return;
          const win = canvas.ownerDocument?.defaultView || popup;
          const ratio = win.devicePixelRatio || 1;
          const rect = canvas.getBoundingClientRect?.() || { width: 0, height: 0 };
          const width = Math.max(2, Math.min(MAX_CANVAS_DIMENSION, Math.floor((rect.width || 2) * ratio)));
          const height = Math.max(2, Math.min(MAX_CANVAS_DIMENSION, Math.floor((rect.height || 2) * ratio)));
          if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = 'rgba(255,255,255,0.72)';
          ctx.font = `${12 * ratio}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('Stage unavailable', width / 2, height / 2);
        };
        const getStageCanvas = widgetId => {
          const selector = typeof popup.CSS?.escape === 'function' ? `.dp-card[data-widget-id="${popup.CSS.escape(widgetId)}"] .dp-stage-canvas` : null;
          if (selector) return root.querySelector(selector);
          for (const card of root.querySelectorAll('.dp-card')) {
            if (card.dataset.widgetId === widgetId) return card.querySelector('.dp-stage-canvas');
          }
          return null;
        };
        const drawStageFrame = (canvas, image, widget, frame) => {
          const ctx = canvas?.getContext?.('2d');
          if (!ctx || !image) return;
          const win = canvas.ownerDocument?.defaultView || popup;
          const ratio = win.devicePixelRatio || 1;
          const rect = canvas.getBoundingClientRect?.() || { width: 0, height: 0 };
          const width = Math.max(2, Math.min(MAX_CANVAS_DIMENSION, Math.floor((rect.width || 2) * ratio)));
          const height = Math.max(2, Math.min(MAX_CANVAS_DIMENSION, Math.floor((rect.height || 2) * ratio)));
          if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, width, height);
          if (widget.type !== 'stage.expand') {
            const scale = Math.min(width / image.width, height / image.height);
            const dw = image.width * scale, dh = image.height * scale;
            try { ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh); } catch {}
            return;
          }
          const cam = widget.camera || {};
          const camWidth = num(cam.width, frame.stageWidth || frame.width || 480);
          const camHeight = num(cam.height, frame.stageHeight || frame.height || 360);
          const stageW = num(frame.stageWidth, frame.width || 480);
          const stageH = num(frame.stageHeight, frame.height || 360);
          const scratchScale = Math.min(width / camWidth, height / camHeight) * (num(cam.zoom, 100) / 100);
          const angle = (90 - num(cam.direction, 90)) * Math.PI / 180;
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(scratchScale, scratchScale);
          ctx.rotate(angle);
          ctx.translate(-num(cam.x, 0), -num(cam.y, 0));
          try { ctx.drawImage(image, -stageW / 2, stageH / 2, stageW, -stageH); } catch {}
          ctx.restore();
        };
        const renderStageFrame = async data => {
          const frame = data.frame;
          const widgets = Array.isArray(data.widgets) ? data.widgets : [];
          if (!frame || !widgets.length) return;
          const seq = num(data.sequence, 0);
          if (seq && num(root.dataset.stageFrameSeq, 0) > seq) return;
          root.dataset.stageFrameSeq = String(seq || Date.now());
          let image = null;
          try {
            if (data.frameKind === 'imageBitmap') image = frame;
            else if (data.frameKind === 'blob' && typeof popup.createImageBitmap === 'function') image = await popup.createImageBitmap(frame);
            else if (data.frameKind === 'dataURL') {
              image = await new Promise((resolve, reject) => {
                const img = new popup.Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = frame;
              });
            }
            if (seq && num(root.dataset.stageFrameSeq, 0) > seq) return;
            for (const widget of widgets) {
              const canvas = getStageCanvas(String(widget.id || ''));
              if (canvas) drawStageFrame(canvas, image, widget, data);
            }
          } catch {
            widgets.forEach(widget => {
              const canvas = getStageCanvas(String(widget.id || ''));
              if (canvas) drawUnavailable(canvas);
            });
          } finally {
            try { if (image && typeof image.close === 'function') image.close(); } catch {}
          }
        };
        const onMessage = event => {
          const data = event.data || {};
          if (data.dashId !== dash.id) return;
          if (data.type === 'dashey:model') {
            root.dataset.modelUpdatedAt = String(Date.now());
            if (data.dashboard?.title) doc.title = data.dashboard.title;
          } else if (data.type === 'dashey:stage-frame') {
            renderStageFrame(data);
          }
        };
        popup.addEventListener('message', onMessage);
        popup.addEventListener('beforeunload', () => {
          if (dash.popup === popup) {
            dash.popup = null;
            dash.popupRoot = null;
            dash.container = null;
            dash.header = null;
            dash.body = null;
            dash.grid = null;
            dash._activeHostType = null;
            dash.state.minimized = true;
            this._resetWidgetDom(dash);
          }
        });
        dash.popup = popup;
        dash.popupRoot = root;
        dash.container = container;
        dash.host = root;
        dash.shadow = null;
        dash._popupMessageCleanup = () => popup.removeEventListener('message', onMessage);
        dash._activeHostType = 'popup';
        dash.window.hostType = 'popup';
        this._finishHostAndWindow(dash);
        return true;
      } catch (e) {
        console.warn('[Dashey] Popup host failed; falling back to inline dashboard host.', e);
        try { popup.close(); } catch {}
        dash.popup = null;
        dash.popupRoot = null;
        return false;
      }
    }

    _finishHostAndWindow(dash) {
      this._applyTheme(dash);
      this._buildChrome(dash);
      this._buildBody(dash);
      this._installDragging(dash);
      this._installResizing(dash);
      this._syncWindowStyles(dash);
    }

    _buildChrome(dash) {
      const header = document.createElement('div'); header.className = 'dp-header';
      const controls = document.createElement('div'); controls.className = 'dp-no-drag'; controls.style.display = 'flex'; controls.style.gap = '8px';
      const dot = (c, h, fn) => { const d = document.createElement('div'); d.className = 'dp-no-drag'; d.style.cssText = `width:12px;height:12px;border-radius:50%;background:${c};cursor:pointer;transition:transform .2s,background .2s`; d.onmouseenter = () => { d.style.background = h; d.style.transform = 'scale(1.15)'; }; d.onmouseleave = () => { d.style.background = c; d.style.transform = 'scale(1)'; }; d.onclick = fn; return d; };
      controls.append(dot('#ff5f56', '#ff7a73', () => this.hideDashboard({ DASH_ID: dash.id })), dot('#ffbd2e', '#ffcf5c', () => this.setWindowMode({ DASH_ID: dash.id, MODE: 'windowed' })), dot('#27c93f', '#4ddb63', () => this.setWindowMode({ DASH_ID: dash.id, MODE: 'fullscreen' })));
      const title = document.createElement('span'); title.className = 'dp-title'; title.textContent = dash.title;
      header.appendChild(controls); header.appendChild(title); header.appendChild(document.createElement('div'));
      dash.header = header;
      dash.container.appendChild(header);
    }


    _buildBody(dash) {
      const body = document.createElement('div'); body.className = 'dp-body';
      const grid = document.createElement('div'); grid.className = 'dp-grid';
      body.appendChild(grid);
      dash.body = body; dash.grid = grid;
      dash.container.appendChild(body);
      dash.container.addEventListener('pointerdown', () => this._bringToFront(dash));
    }

    _installDragging(dash) {
      const hostWindow = this._getHostWindow(dash);
      const state = { dragging: false, pointerId: null, sx: 0, sy: 0, x: 0, y: 0 };
      const isControl = e => e.composedPath().some(el => el?.classList?.contains('dp-no-drag') || ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(el?.tagName));
      const down = e => {
        if (e.button !== undefined && e.button !== 0) return;
        if (dash.window.mode !== 'windowed' && dash.window.mode !== 'modal') return;
        if (isControl(e)) return;
        this._bringToFront(dash);
        state.dragging = true;
        state.pointerId = e.pointerId;
        state.sx = e.clientX;
        state.sy = e.clientY;
        state.x = num(dash.window.x, dash.container.getBoundingClientRect().left);
        state.y = num(dash.window.y, dash.container.getBoundingClientRect().top);
        dash.header.style.cursor = 'grabbing';
        dash.container.style.transition = 'none';
        try { dash.header.setPointerCapture(e.pointerId); } catch {}
        e.preventDefault();
      };
      const move = e => {
        if (!state.dragging || (state.pointerId !== null && e.pointerId !== state.pointerId)) return;
        const width = num(dash.window.width, dash.container.getBoundingClientRect().width);
        const height = num(dash.window.height, dash.container.getBoundingClientRect().height);
        const bounds = this._getLooseWindowBounds(width, height);
        dash.window.x = clamp(state.x + (e.clientX - state.sx), bounds.minX, bounds.maxX);
        dash.window.y = clamp(state.y + (e.clientY - state.sy), bounds.minY, bounds.maxY);
        dash.container.style.left = `${dash.window.x}px`;
        dash.container.style.top = `${dash.window.y}px`;
        this._emit('dashboard.moved', dash, { x: dash.window.x, y: dash.window.y });
      };
      const up = e => {
        if (!state.dragging || (state.pointerId !== null && e.pointerId !== state.pointerId)) return;
        state.dragging = false;
        state.pointerId = null;
        dash.header.style.cursor = 'grab';
        dash.container.style.transition = '';
        this._savePersisted();
        try { dash.header.releasePointerCapture(e.pointerId); } catch {}
      };
      dash.header.addEventListener('pointerdown', down);
      dash.header.addEventListener('pointermove', move);
      dash.header.addEventListener('pointerup', up);
      dash.header.addEventListener('pointercancel', up);
      hostWindow.addEventListener('pointermove', move);
      hostWindow.addEventListener('pointerup', up);
      dash.cleanupDrag = () => {
        dash.header.removeEventListener('pointerdown', down);
        dash.header.removeEventListener('pointermove', move);
        dash.header.removeEventListener('pointerup', up);
        dash.header.removeEventListener('pointercancel', up);
        hostWindow.removeEventListener('pointermove', move);
        hostWindow.removeEventListener('pointerup', up);
      };
    }

    _installResizing(dash) {
      const hostWindow = this._getHostWindow(dash);
      const doc = dash.container?.ownerDocument || document;
      const h = doc.createElement('div'); h.className = 'dp-resize dp-no-drag'; dash.container.appendChild(h);
      const state = { resizing: false, pointerId: null, sx: 0, sy: 0, w: 0, h: 0 };
      const down = e => {
        if (dash.window.mode !== 'windowed' && dash.window.mode !== 'modal') return;
        state.resizing = true;
        state.pointerId = e.pointerId;
        state.sx = e.clientX;
        state.sy = e.clientY;
        const r = dash.container.getBoundingClientRect();
        state.w = r.width;
        state.h = r.height;
        this._bringToFront(dash);
        try { h.setPointerCapture(e.pointerId); } catch {}
        e.preventDefault();
        e.stopPropagation();
      };
      const move = e => {
        if (!state.resizing || (state.pointerId !== null && e.pointerId !== state.pointerId)) return;
        const bounds = this._getLooseWindowBounds(state.w, state.h);
        const w = clamp(state.w + (e.clientX - state.sx), 260, bounds.maxWidth);
        const ht = clamp(state.h + (e.clientY - state.sy), 180, bounds.maxHeight);
        dash.window.width = w;
        dash.window.height = ht;
        dash.container.style.width = `${w}px`;
        dash.container.style.height = `${ht}px`;
      };
      const up = e => {
        if (!state.resizing || (state.pointerId !== null && e.pointerId !== state.pointerId)) return;
        state.resizing = false;
        state.pointerId = null;
        this._savePersisted();
        try { h.releasePointerCapture(e.pointerId); } catch {}
      };
      h.addEventListener('pointerdown', down);
      h.addEventListener('pointermove', move);
      h.addEventListener('pointerup', up);
      h.addEventListener('pointercancel', up);
      hostWindow.addEventListener('pointermove', move);
      hostWindow.addEventListener('pointerup', up);
      dash.cleanupResize = () => {
        h.removeEventListener('pointerdown', down);
        h.removeEventListener('pointermove', move);
        h.removeEventListener('pointerup', up);
        h.removeEventListener('pointercancel', up);
        hostWindow.removeEventListener('pointermove', move);
        hostWindow.removeEventListener('pointerup', up);
      };
    }

    _buildCard(widget, title) {
      const card = document.createElement('div'); card.className = 'dp-card'; card.dataset.widgetId = widget.id;
      const label = document.createElement('div'); label.className = 'dp-label'; label.textContent = title || '';
      const content = document.createElement('div'); content.className = 'dp-content'; content.style.width = '100%'; content.style.height = 'calc(100% - 20px)'; content.style.minHeight = '0'; content.style.overflow = 'hidden';
      const resize = document.createElement('div'); resize.className = 'dp-resize';
      card.append(label, content, resize);
      return { card, label, content, resize };
    }

    _wireWidget(dash, widget) {
      const hostWindow = this._getHostWindow(dash);
      this._applyWidgetPermissions(widget);
      widget.card.addEventListener('mouseenter', () => this._emit('widget.hovered', dash, { widgetId: widget.id, value: widget.value }));
      widget.card.addEventListener('click', () => this._emit('widget.clicked', dash, { widgetId: widget.id, value: widget.value }));

      const moveState = { active: false, pointerId: null, sx: 0, sy: 0, x: 0, y: 0 };
      const startMove = e => {
        if (!canInteract(widget, 'move', 'user')) return;
        if (e.button !== undefined && e.button !== 0) return;
        if (e.composedPath().some(el => ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(el?.tagName))) return;
        if (widget.position?.mode !== 'freeform') return;
        moveState.active = true;
        moveState.pointerId = e.pointerId;
        moveState.sx = e.clientX;
        moveState.sy = e.clientY;
        moveState.x = num(widget.position.x, widget.card.offsetLeft);
        moveState.y = num(widget.position.y, widget.card.offsetTop);
        widget.card.classList.add('dp-moving');
        try { widget.label.setPointerCapture(e.pointerId); } catch {}
        e.preventDefault();
        e.stopPropagation();
      };
      const moveWidget = e => {
        if (!moveState.active || (moveState.pointerId !== null && e.pointerId !== moveState.pointerId)) return;
        const rect = dash.grid.getBoundingClientRect();
        const wr = widget.card.getBoundingClientRect();
        const x = clamp(moveState.x + (e.clientX - moveState.sx), 0, Math.max(0, rect.width - wr.width));
        const y = Math.max(0, moveState.y + (e.clientY - moveState.sy));
        widget.position.x = x;
        widget.position.y = y;
        widget.card.style.left = `${x}px`;
        widget.card.style.top = `${y}px`;
        this._emit('widget.dragged', dash, { widgetId: widget.id, value: widget.value, position: clone(widget.position), source: 'user' });
      };
      const endMove = e => {
        if (!moveState.active || (moveState.pointerId !== null && e.pointerId !== moveState.pointerId)) return;
        moveState.active = false;
        moveState.pointerId = null;
        widget.card.classList.remove('dp-moving');
        try { widget.label.releasePointerCapture(e.pointerId); } catch {}
        this._savePersisted();
      };
      widget.label.addEventListener('pointerdown', startMove);
      widget.label.addEventListener('pointermove', moveWidget);
      widget.label.addEventListener('pointerup', endMove);
      widget.label.addEventListener('pointercancel', endMove);
      hostWindow.addEventListener('pointermove', moveWidget);
      hostWindow.addEventListener('pointerup', endMove);

      if (widget.resizeHandle) {
        const s = { d: false, pointerId: null, sx: 0, sy: 0, w: 0, h: 0, before: null };
        const startResize = e => {
          if (!canInteract(widget, 'resize', 'user')) return;
          if (e.button !== undefined && e.button !== 0) return;
          s.d = true;
          s.pointerId = e.pointerId;
          s.sx = e.clientX;
          s.sy = e.clientY;
          s.before = clone(widget.position);
          const r = widget.card.getBoundingClientRect();
          s.w = r.width;
          s.h = r.height;
          this._emit('widget.resizestarted', dash, { widgetId: widget.id, value: widget.value });
          try { widget.resizeHandle.setPointerCapture(e.pointerId); } catch {}
          e.preventDefault();
          e.stopPropagation();
        };
        const resizeWidget = e => {
          if (!s.d || (s.pointerId !== null && e.pointerId !== s.pointerId)) return;
          const w = clamp(s.w + (e.clientX - s.sx), 80, 4000);
          const h = clamp(s.h + (e.clientY - s.sy), 48, 3000);
          if (widget.position?.mode === 'freeform') {
            const gridRect = dash.grid.getBoundingClientRect();
            const left = num(widget.position.x, 0);
            const maxW = Math.max(80, gridRect.width - left);
            widget.position.w = clamp(w, 80, maxW);
            widget.position.h = h;
            widget.card.style.width = `${widget.position.w}px`;
            widget.card.style.height = `${widget.position.h}px`;
          } else {
            const m = this._gridMetrics(dash);
            const gw = clamp(Math.round((w + m.gap) / (m.colWidth + m.gap)), 1, m.cols);
            const gh = clamp(Math.round((h + m.gap) / (m.rowHeight + m.gap)), 1, 48);
            widget.position.w = gw;
            widget.position.h = gh;
            widget.card.style.gridColumn = `span ${gw}`;
            widget.card.style.gridRow = `span ${gh}`;
          }
          this._emit('widget.resized', dash, { widgetId: widget.id, value: widget.value, position: clone(widget.position), width: w, height: h, source: 'user' });
        };
        const endResize = e => {
          if (!s.d || (s.pointerId !== null && e.pointerId !== s.pointerId)) return;
          s.d = false;
          s.pointerId = null;
          this._record({ op: 'widget.move', dashId: dash.id, widgetId: widget.id, before: s.before, after: clone(widget.position) });
          this._savePersisted();
          try { widget.resizeHandle.releasePointerCapture(e.pointerId); } catch {}
        };
        widget.resizeHandle.addEventListener('pointerdown', startResize);
        widget.resizeHandle.addEventListener('pointermove', resizeWidget);
        widget.resizeHandle.addEventListener('pointerup', endResize);
        widget.resizeHandle.addEventListener('pointercancel', endResize);
        hostWindow.addEventListener('pointermove', resizeWidget);
        hostWindow.addEventListener('pointerup', endResize);
        widget._cleanupResize = () => {
          widget.label.removeEventListener('pointerdown', startMove);
          widget.label.removeEventListener('pointermove', moveWidget);
          widget.label.removeEventListener('pointerup', endMove);
          widget.label.removeEventListener('pointercancel', endMove);
          hostWindow.removeEventListener('pointermove', moveWidget);
          hostWindow.removeEventListener('pointerup', endMove);
          widget.resizeHandle.removeEventListener('pointerdown', startResize);
          widget.resizeHandle.removeEventListener('pointermove', resizeWidget);
          widget.resizeHandle.removeEventListener('pointerup', endResize);
          widget.resizeHandle.removeEventListener('pointercancel', endResize);
          hostWindow.removeEventListener('pointermove', resizeWidget);
          hostWindow.removeEventListener('pointerup', endResize);
        };
      }
    }

    _createWidgetDom(dash, widget, title, rawValue) {
      const t = widget.type;
      const built = this._buildCard(widget, title);
      widget.card = built.card; widget.content = built.content; widget.label = built.label; widget.resizeHandle = built.resize;
      const c = widget.content;
      const data = rawValue;
      const center = () => c.classList.add('dp-center');
      if (t === 'text') {
        center(); const el = document.createElement('div'); el.className = 'dp-text'; el.textContent = String(data ?? ''); c.appendChild(el); widget.dom.text = el;
      } else if (t === 'metric.number') {
        center(); const el = document.createElement('div'); el.className = 'dp-metric'; el.textContent = String(data?.value ?? data ?? '0'); c.appendChild(el); widget.dom.text = el;
      } else if (t === 'badge') {
        center(); const el = document.createElement('span'); el.className = 'dp-badge'; el.textContent = String(data?.label ?? data ?? 'Badge'); if (data?.color) el.style.background = data.color; c.appendChild(el); widget.dom.badge = el;
      } else if (t === 'clock') {
        center(); const el = document.createElement('div'); el.className = 'dp-clock'; c.appendChild(el); widget.dom.text = el; widget._needsClock = true;
      } else if (t === 'spacer') {
        widget.label.style.display = 'none'; c.style.height = '100%';
      } else if (t === 'progress.bar') {
        c.innerHTML = `<div><div style="width:100%;height:10px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden"><div class="dp-bar-fill" style="height:100%;width:0;background:var(--dp-accent);border-radius:999px"></div></div><div class="dp-bar-txt" style="text-align:right;margin-top:5px;font-size:12px;font-weight:700"></div></div>`; widget.dom.fill = c.querySelector('.dp-bar-fill'); widget.dom.text = c.querySelector('.dp-bar-txt');
      } else if (t === 'ring.chart') {
        center(); const r = 26, circ = 2 * Math.PI * r; c.innerHTML = `<div class="dp-ring"><svg width="64" height="64" viewBox="0 0 60 60"><circle cx="30" cy="30" r="${r}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6"></circle><circle class="dp-ring-fill" cx="30" cy="30" r="${r}" fill="none" stroke="var(--dp-accent)" stroke-linecap="round" stroke-width="6" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"></circle></svg><div class="dp-ring-text">0%</div></div>`; widget.dom.ring = c.querySelector('.dp-ring-fill'); widget.dom.text = c.querySelector('.dp-ring-text');
      } else if (t === 'gauge.meter') {
        center(); const meter = document.createElement('meter'); meter.className = 'dp-gauge'; meter.min = 0; meter.max = 100; meter.value = clamp(num(data?.value ?? data, 0), 0, 100); c.appendChild(meter); widget.dom.meter = meter;
      } else if (t === 'status.light') {
        center(); const el = document.createElement('div'); el.className = 'dp-status'; el.style.color = String(data || '#00d2ff'); el.style.background = String(data || '#00d2ff'); c.appendChild(el); widget.dom.light = el;
      } else if (t === 'color.swatch') {
        const el = document.createElement('div'); el.className = 'dp-swatch'; el.style.background = String(data?.color ?? data ?? '#00d2ff'); c.appendChild(el); widget.dom.swatch = el;
      } else if (t === 'image') {
        const img = document.createElement('img'); img.className = 'dp-img'; img.src = String(data || ''); c.appendChild(img); widget.dom.img = img;
      } else if (t === 'iframe') {
        const fr = document.createElement('iframe'); fr.className = 'dp-iframe'; fr.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups'); fr.src = String(data || 'about:blank'); c.appendChild(fr); widget.dom.iframe = fr;
      } else if (t === 'html') {
        const fr = document.createElement('iframe'); fr.className = 'dp-iframe'; fr.setAttribute('sandbox', 'allow-same-origin'); fr.srcdoc = sanitizeHTML(String(data || '')); c.appendChild(fr); widget.dom.iframe = fr;
      } else if (t === 'markdown') {
        const el = document.createElement('div'); el.className = 'dp-markdown'; el.innerHTML = sanitizeHTML(String(data ?? '').replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')); c.appendChild(el); widget.dom.markdown = el;
      } else if (t === 'audio') {
        const a = document.createElement('audio'); a.controls = true; a.className = 'dp-audio'; a.src = String(data || ''); c.appendChild(a); widget.dom.audio = a;
      } else if (t === 'log') {
        const pre = document.createElement('pre'); pre.className = 'dp-log'; pre.textContent = Array.isArray(data?.lines) ? data.lines.join('\n') : String(data || '') + '\n'; c.appendChild(pre); widget.dom.log = pre;
      } else if (t === 'chart.line' || t === 'chart.bar' || t === 'chart.multi') {
        const cvs = document.createElement('canvas'); cvs.style.width = '100%'; cvs.style.height = '100%'; cvs.style.borderRadius = '8px'; c.appendChild(cvs); widget.dom.canvas = cvs; widget.dom.ctx = cvs.getContext('2d'); widget._needsChartRedraw = true;
      } else if (t === 'table.grid') {
        const wrap = document.createElement('div'); wrap.style.height = '100%'; wrap.style.overflow = 'auto'; c.appendChild(wrap); widget.dom.tableWrap = wrap; widget._needsTableRedraw = true;
      } else if (t === 'control.button') {
        const btn = document.createElement('button'); btn.className = 'dp-button'; btn.textContent = data?.label || title || 'Button'; btn.onclick = () => { this._setWidgetValue(dash, widget, data?.value ?? btn.textContent, 'ui'); this._emit('widget.clicked', dash, { widgetId: widget.id, value: widget.value }); }; c.appendChild(btn); widget.dom.button = btn;
      } else if (t === 'control.input') {
        const inp = document.createElement('input'); inp.className = 'dp-input'; inp.type = data?.inputType === 'number' ? 'number' : 'text'; inp.value = String(data?.value ?? data ?? ''); inp.placeholder = data?.placeholder || ''; inp.oninput = () => this._setWidgetValue(dash, widget, inp.value, 'ui'); c.appendChild(inp); widget.dom.input = inp; widget.inputEl = inp;
      } else if (t === 'control.toggle') {
        const wrap = document.createElement('div'); wrap.className = 'dp-toggle-wrap'; const track = document.createElement('div'); track.className = 'dp-toggle'; const thumb = document.createElement('div'); thumb.className = 'dp-toggle-thumb'; track.appendChild(thumb); const label = document.createElement('span'); const on = !!(data?.value ?? data); if (on) track.classList.add('dp-toggle-on'); label.textContent = on ? (data?.onLabel || 'On') : (data?.offLabel || 'Off'); wrap.append(track, label); wrap.onclick = () => this._setWidgetValue(dash, widget, { ...(isObj(widget.value) ? widget.value : {}), value: !(widget.value?.value ?? widget.value) }, 'ui'); c.appendChild(wrap); widget.dom.toggle = track; widget.dom.toggleLabel = label;
      } else if (t === 'control.slider') {
        const input = document.createElement('input'); input.className = 'dp-slider'; input.type = 'range'; input.min = data?.min ?? 0; input.max = data?.max ?? 100; input.step = data?.step ?? 1; input.value = data?.value ?? 0; const text = document.createElement('div'); text.style.cssText = 'text-align:right;font-size:12px;font-weight:700'; text.textContent = input.value; input.oninput = () => { text.textContent = input.value; this._setWidgetValue(dash, widget, Number(input.value), 'ui'); }; c.append(input, text); widget.dom.input = input; widget.dom.text = text;
      } else if (t === 'control.select') {
        const sel = document.createElement('select'); sel.className = 'dp-select'; (data?.options || []).forEach(opt => { const o = document.createElement('option'); o.textContent = opt.label ?? opt.value; o.value = String(opt.value); sel.appendChild(o); }); sel.value = String(data?.value ?? (data?.options?.[0]?.value ?? '')); sel.onchange = () => this._setWidgetValue(dash, widget, sel.value, 'ui'); c.appendChild(sel); widget.dom.select = sel;
      } else if (t === 'terminal.console') {
        const term = document.createElement('div'); term.className = 'dp-terminal'; const out = document.createElement('div'); out.className = 'dp-terminal-output'; const inp = document.createElement('input'); inp.className = 'dp-terminal-input'; inp.placeholder = 'Type command and press Enter'; inp.onkeydown = e => { if (e.key === 'Enter') { const cmd = inp.value; inp.value = ''; out.textContent += `> ${cmd}\n`; this._setWidgetValue(dash, widget, cmd, 'ui'); } }; term.append(out, inp); c.appendChild(term); widget.dom.termOut = out; widget.dom.termIn = inp;
      } else if (t === 'editor.code') {
        const ta = document.createElement('textarea'); ta.className = 'dp-textarea'; ta.spellcheck = false; ta.value = String(data?.value ?? ''); ta.style.minHeight = '140px'; ta.style.fontFamily = 'monospace'; ta.oninput = () => this._setWidgetValue(dash, widget, ta.value, 'ui'); c.appendChild(ta); widget.dom.textarea = ta; widget.inputEl = ta;
      } else if (t === 'viewer.minimap') {
        const cvs = document.createElement('canvas'); cvs.className = 'dp-minimap'; cvs.width = 300; cvs.height = 180; c.appendChild(cvs); widget.dom.canvas = cvs; widget.dom.ctx = cvs.getContext('2d'); widget._needsMiniRedraw = true;
      } else if (t === 'stage' || t === 'stage.expand') {
        widget.card.classList.add('dp-stage-card');
        widget.camera = this._normalizeStageCamera(widget.camera || data);
        this._applyVirtualStageId(widget, data);
        const cvs = document.createElement('canvas'); cvs.className = 'dp-stage-canvas'; c.appendChild(cvs); widget.dom.canvas = cvs; widget.dom.ctx = cvs.getContext('2d');
      } else {
        const el = document.createElement('div'); el.textContent = String(data ?? ''); c.appendChild(el); widget.dom.generic = el;
      }
      this._wireWidget(dash, widget);
      this._applyWidgetStyle(widget);
      if (!['terminal.console', 'stage', 'stage.expand'].includes(t)) this._updateWidgetDom(widget, rawValue);
      return widget;
    }

    _applyWidgetStyle(widget) {
      if (!widget?.card) return;
      const s = widget.style || {};
      if (s.accent) widget.card.style.setProperty('--dp-accent', s.accent);
      if (s.background) widget.card.style.background = s.background;
      if (s.foreground) widget.card.style.color = s.foreground;
      if (s.radius !== undefined) widget.card.style.borderRadius = `${s.radius}px`;
      if (s.opacity !== undefined) widget.card.style.opacity = `${s.opacity}`;
      if (s.shadow) widget.card.style.boxShadow = s.shadow;
      if (s.border) widget.card.style.border = s.border;
      if (s.padding !== undefined) widget.card.style.padding = `${s.padding}px`;
    }

    _setWidgetValue(dash, widget, value, source = 'code') {
      const before = clone(widget.value);
      widget.value = value;
      this._updateWidgetDom(widget, value);
      if (JSON.stringify(before) !== JSON.stringify(value)) {
        this._emit('widget.changed', dash, { widgetId: widget.id, value, oldValue: before, source });
        for (const b of dash.bindings) {
          if (b.widgetId !== widget.id) continue;
          if (b.dir === 'input') continue;
          this._setDashboardVarInternal(dash, b.varName, value, `binding:${widget.id}`);
          this._writeScratchVar(b.varName, value);
        }
        for (const l of dash.links) {
          if (l.from === widget.id) {
            const target = dash.widgets[l.to];
            if (target && target.id !== widget.id) this._setWidgetValue(dash, target, value, `link:${source}`);
          }
        }
      }
      this._markDirty(dash);
    }

    _updateWidgetDom(widget, value) {
      const t = widget.type; const v = value; const n = clamp(num(v, 0), 0, 100);
      if (t === 'text' && widget.dom.text) widget.dom.text.textContent = String(v ?? '');
      else if (t === 'metric.number' && widget.dom.text) widget.dom.text.textContent = String(v?.value ?? v ?? '0');
      else if (t === 'badge' && widget.dom.badge) { widget.dom.badge.textContent = String(v?.label ?? v ?? 'Badge'); if (v?.color) widget.dom.badge.style.background = v.color; }
      else if (t === 'clock' && widget.dom.text) widget.dom.text.textContent = new Date().toLocaleTimeString([], isObj(v) ? v : undefined);
      else if (t === 'progress.bar') { if (widget.dom.fill) widget.dom.fill.style.width = `${n}%`; if (widget.dom.text) widget.dom.text.textContent = `${n}%`; }
      else if (t === 'ring.chart') { if (widget.dom.ring) { const r = 26, circ = 2 * Math.PI * r; widget.dom.ring.style.strokeDasharray = `${circ}`; widget.dom.ring.style.strokeDashoffset = `${circ - (n / 100) * circ}`; } if (widget.dom.text) widget.dom.text.textContent = `${n}%`; }
      else if (t === 'gauge.meter' && widget.dom.meter) widget.dom.meter.value = n;
      else if (t === 'status.light' && widget.dom.light) { const c = String(v || '#00d2ff'); widget.dom.light.style.background = c; widget.dom.light.style.color = c; }
      else if (t === 'color.swatch' && widget.dom.swatch) widget.dom.swatch.style.background = String(v?.color ?? v ?? '#00d2ff');
      else if (t === 'image' && widget.dom.img) widget.dom.img.src = String(v || '');
      else if (t === 'iframe' && widget.dom.iframe) widget.dom.iframe.src = String(v || 'about:blank');
      else if (t === 'html' && widget.dom.iframe) widget.dom.iframe.srcdoc = sanitizeHTML(String(v || ''));
      else if (t === 'markdown' && widget.dom.markdown) widget.dom.markdown.innerHTML = sanitizeHTML(String(v ?? '').replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>'));
      else if (t === 'audio' && widget.dom.audio) widget.dom.audio.src = String(v || '');
      else if (t === 'log' && widget.dom.log) widget.dom.log.textContent = (Array.isArray(v?.lines) ? v.lines.join('\n') : String(v ?? '')) + '\n';
      else if ((t === 'list.items' || t === 'timeline') && widget.dom.list) { const items = Array.isArray(v?.items) ? v.items : Array.isArray(v) ? v : String(v ?? '').split(/[,\n]/).filter(Boolean); widget.dom.list.innerHTML = ''; items.forEach(item => { const li = document.createElement('li'); li.textContent = String(item?.label ?? item); widget.dom.list.appendChild(li); }); }
      else if (t === 'control.button' && widget.dom.button) widget.dom.button.textContent = v?.label || widget.title || 'Button';
      else if (t === 'control.input' && widget.dom.input) widget.dom.input.value = String(v ?? '');
      else if (t === 'control.toggle' && widget.dom.toggle) { const on = !!(v?.value ?? v); widget.dom.toggle.classList.toggle('dp-toggle-on', on); if (widget.dom.toggleLabel) widget.dom.toggleLabel.textContent = on ? (v?.onLabel || 'On') : (v?.offLabel || 'Off'); }
      else if (t === 'control.slider' && widget.dom.input) { widget.dom.input.value = String(v ?? 0); if (widget.dom.text) widget.dom.text.textContent = String(v ?? 0); }
      else if (t === 'control.select' && widget.dom.select) widget.dom.select.value = String(v ?? '');
      else if (t === 'terminal.console' && widget.dom.termOut) widget.dom.termOut.textContent += `${String(v)}\n`;
      else if (t === 'editor.code' && widget.dom.textarea) widget.dom.textarea.value = String(v ?? '');
      else if (t === 'chart.line' || t === 'chart.bar' || t === 'chart.multi') widget._needsChartRedraw = true;
      else if (t === 'table.grid') widget._needsTableRedraw = true;
      else if (t === 'viewer.minimap') widget._needsMiniRedraw = true;
      else if (t === 'stage' || t === 'stage.expand') { widget.camera = this._normalizeStageCamera(v); this._applyVirtualStageId(widget, v); widget._needsStageRedraw = true; }
    }

    _setDashboardVarInternal(dash, name, value, source = 'code') {
      const before = dash.variables[name]; dash.variables[name] = value;
      if (JSON.stringify(before) !== JSON.stringify(value)) {
        for (const b of dash.bindings) {
          if (b.varName !== name) continue;
          if (b.dir === 'output') continue;
          const w = dash.widgets[b.widgetId];
          if (w) this._setWidgetValue(dash, w, value, `binding:${name}`);
        }
        this._markDirty(dash);
      }
    }


    _readMouse(axis) {
      try {
        const mouse = Scratch?.vm?.runtime?.ioDevices?.mouse;
        if (axis === 'x') return num(mouse?.getScratchX?.(), 0);
        return num(mouse?.getScratchY?.(), 0);
      } catch {}
      return 0;
    }

    _readScratchVar(name) {
      try {
        const rt = Scratch?.vm?.runtime;
        const targets = [rt?.getEditingTarget?.(), rt?.getTargetForStage?.(), ...(rt?.targets || [])].filter(Boolean);
        for (const t of targets) {
          if (!t.variables) continue;
          for (const id in t.variables) if (t.variables[id]?.name === name) return t.variables[id].value;
        }
      } catch {}
      return '';
    }

    _writeScratchVar(name, value) {
      try {
        const rt = Scratch?.vm?.runtime;
        const targets = [rt?.getEditingTarget?.(), rt?.getTargetForStage?.(), ...(rt?.targets || [])].filter(Boolean);
        for (const t of targets) {
          if (!t.variables) continue;
          for (const id in t.variables) if (t.variables[id]?.name === name) { t.variables[id].value = value; return true; }
        }
      } catch {}
      return false;
    }

    _readScratchList(name) {
      try {
        const rt = Scratch?.vm?.runtime;
        const targets = [rt?.getEditingTarget?.(), rt?.getTargetForStage?.(), ...(rt?.targets || [])].filter(Boolean);
        for (const t of targets) {
          if (!t.lists) continue;
          for (const id in t.lists) if (t.lists[id]?.name === name) return clone(t.lists[id].value || []);
        }
      } catch {}
      return [];
    }

    _writeScratchList(name, arr) {
      try {
        const rt = Scratch?.vm?.runtime;
        const targets = [rt?.getEditingTarget?.(), rt?.getTargetForStage?.(), ...(rt?.targets || [])].filter(Boolean);
        for (const t of targets) {
          if (!t.lists) continue;
          for (const id in t.lists) if (t.lists[id]?.name === name) { t.lists[id].value = clone(arr); return true; }
        }
      } catch {}
      return false;
    }

    _markDirty(dash) { if (!dash) return; dash.dirty = true; this._postDashboardModel(dash); if (!this.renderQueued) { this.renderQueued = true; requestAnimationFrame(() => { this.renderQueued = false; this._flushRender(); }); } }
    _flushRender() { for (const id in this.dashboards) { const d = this.dashboards[id]; if (!d.dirty) continue; d.dirty = false; this._refreshWidgetVisibility(d); } }
    _refreshWidgetVisibility(dash) { const active = new Set((dash.pages.find(p => p.id === dash.activePage)?.widgets) || []); for (const id in dash.widgets) { const w = dash.widgets[id]; if (!w?.card) continue; const visible = !dash.state.minimized && dash.container?.style.display !== 'none' && (dash.layout.mode !== 'pages' || active.has(id)); w.card.style.display = visible ? '' : 'none'; } }

    _emit(type, dash, payload = {}) {
      const ev = { type, dashId: dash?.id || '', timestamp: Date.now(), ...clone(payload) };
      if (type === 'widget.clicked') Scratch.vm.runtime.startHats(`${EXT_ID}_whenWidgetClicked`, { DASH_ID: ev.dashId, WIDGET_ID: ev.widgetId || '', VALUE: ev.value !== undefined ? String(ev.value) : '' });
      if (type === 'widget.hovered') Scratch.vm.runtime.startHats(`${EXT_ID}_whenWidgetHovered`, { DASH_ID: ev.dashId, WIDGET_ID: ev.widgetId || '', VALUE: ev.value !== undefined ? String(ev.value) : '' });
      if (type === 'widget.changed') Scratch.vm.runtime.startHats(`${EXT_ID}_whenWidgetChanged`, { DASH_ID: ev.dashId, WIDGET_ID: ev.widgetId || '', VALUE: ev.value !== undefined ? String(ev.value) : '' });
      if (type === 'widget.dragged') Scratch.vm.runtime.startHats(`${EXT_ID}_whenWidgetDragged`, { DASH_ID: ev.dashId, WIDGET_ID: ev.widgetId || '', VALUE: ev.value !== undefined ? String(ev.value) : '' });
      if (type === 'widget.resized') Scratch.vm.runtime.startHats(`${EXT_ID}_whenWidgetResized`, { DASH_ID: ev.dashId, WIDGET_ID: ev.widgetId || '', VALUE: ev.value !== undefined ? String(ev.value) : '' });
      if (type === 'dashboard.pagechanged') Scratch.vm.runtime.startHats(`${EXT_ID}_whenDashboardPageChanged`, { DASH_ID: ev.dashId });
    }

    _findDashOfWidget(widgetId) { for (const id in this.dashboards) if (this.dashboards[id].widgets[widgetId]) return this.dashboards[id]; return null; }


    _normalizeStageCamera(value = {}) {
      const parsed = typeof value === 'string' ? jparse(value, {}) : value;
      const data = isObj(parsed) ? parsed : {};
      const camera = isObj(data.camera) ? data.camera : data;
      const result = {
        x: num(camera.x, 0),
        y: num(camera.y, 0),
        zoom: Math.max(1, num(camera.zoom, 100)),
        direction: num(camera.direction ?? camera.rotation, 90),
        width: Math.max(1, num(camera.width, 480)),
        height: Math.max(1, num(camera.height, 360))
      };
      const stageId = this._readVirtualStageId(data);
      if (stageId) result.id = stageId;
      return result;
    }

    _isStageWidget(widget) {
      return widget?.type === 'stage' || widget?.type === 'stage.expand';
    }

    _readVirtualStageId(value) {
      const parsed = typeof value === 'string' ? jparse(value, {}) : value;
      const data = isObj(parsed) ? parsed : {};
      const camera = isObj(data.camera) ? data.camera : null;
      const nestedValue = isObj(data.value) ? data.value : null;
      const valueCamera = isObj(nestedValue?.camera) ? nestedValue.camera : null;
      const id = data.stageId ?? camera?.id ?? nestedValue?.stageId ?? valueCamera?.id ?? nestedValue?.id ?? data.id;
      return id === undefined || id === null || String(id) === '' ? '' : String(id);
    }

    _getVirtualStageId(widget) {
      return this._readVirtualStageId(widget) || String(widget?.id ?? '');
    }

    _applyVirtualStageId(widget, value) {
      if (!this._isStageWidget(widget)) return;
      const stageId = this._readVirtualStageId(value) || this._readVirtualStageId(widget) || String(widget.id);
      widget.stageId = stageId;
      widget.camera = { ...this._normalizeStageCamera(widget.camera || widget.value), id: stageId };
    }

    _warnMissingVirtualStage(id) {
      const key = String(id);
      if (this._missingVirtualStageWarnings.has(key)) return;
      this._missingVirtualStageWarnings.add(key);
      console.warn(`[Dashey] virtual stage "${key}" not found. Stage widgets default to their widget id unless value.stageId or camera.id is set.`);
    }

    _findVirtualStage(id) {
      const key = String(id);
      for (const dashId in this.dashboards) {
        const widgets = this.dashboards[dashId].widgets;
        const direct = widgets[key];
        if (this._isStageWidget(direct)) return direct;
        for (const widgetId in widgets) {
          const w = widgets[widgetId];
          if (this._isStageWidget(w) && this._getVirtualStageId(w) === key) return w;
        }
      }
      this._warnMissingVirtualStage(key);
      return null;
    }

    _getVirtualStageCamera(id) {
      const w = this._findVirtualStage(id);
      if (!w) return this._normalizeStageCamera();
      w.camera = this._normalizeStageCamera(w.camera || w.value);
      return w.camera;
    }

    _setVirtualStageCameraState(id, updater) {
      const w = this._findVirtualStage(id);
      if (!w) return null;
      const next = this._normalizeStageCamera(w.camera || w.value);
      updater(next);
      next.zoom = Math.max(1, num(next.zoom, 100));
      next.width = Math.max(1, num(next.width, 480));
      next.height = Math.max(1, num(next.height, 360));
      w.camera = next;
      w.value = { ...(isObj(w.value) ? w.value : {}), ...next };
      w._needsStageRedraw = true;
      const d = this._findDashOfWidget(w.id);
      if (d) this._markDirty(d);
      return w;
    }

    _virtualStageTransform(stageId) {
      const cam = this._getVirtualStageCamera(stageId);
      const zoom = cam.zoom / 100 || 1;
      const angle = (90 - cam.direction) * Math.PI / 180;
      return { cam, zoom, cos: Math.cos(angle), sin: Math.sin(angle) };
    }

    _worldToVirtualStagePoint(stageId, x, y) {
      const { cam, zoom, cos, sin } = this._virtualStageTransform(stageId);
      const dx = num(x, 0) - cam.x;
      const dy = num(y, 0) - cam.y;
      return { x: zoom * (dx * cos - dy * sin), y: zoom * (dx * sin + dy * cos) };
    }

    _virtualStageToWorldPoint(stageId, x, y) {
      const { cam, zoom, cos, sin } = this._virtualStageTransform(stageId);
      const lx = num(x, 0) / zoom;
      const ly = num(y, 0) / zoom;
      return { x: cam.x + lx * cos + ly * sin, y: cam.y - lx * sin + ly * cos };
    }

    _isVirtualStageRotated(stageId) {
      const cam = this._getVirtualStageCamera(stageId);
      const offset = ((cam.direction - 90) % 360 + 360) % 360;
      return Math.abs(offset) > 1e-9 && Math.abs(offset - 360) > 1e-9;
    }

    _warnAmbiguousStageAxis(stageId, prop, invert) {
      const key = `${stageId}:${prop}:${invert ? 'normalise' : 'localise'}`;
      this._ambiguousStageAxisWarnings = this._ambiguousStageAxisWarnings || new Set();
      if (this._ambiguousStageAxisWarnings.has(key)) return;
      this._ambiguousStageAxisWarnings.add(key);
      console.warn(`[Dashey] ${invert ? 'normaliseFromStage' : 'localiseToStage'} cannot rotate a single ${prop} coordinate for virtual stage "${stageId}" without its paired coordinate; returning the scalar unchanged.`);
    }

    _localStageScalar(stageId, value, prop, invert = false) {
      const cam = this._getVirtualStageCamera(stageId);
      const zoom = cam.zoom / 100 || 1;
      const v = num(value, 0);
      const p = String(prop).toLowerCase();
      if (p === 'size') return invert ? v / zoom : v * zoom;
      if (p === 'direction' || p === 'rotation') return invert ? v + (cam.direction - 90) : v - (cam.direction - 90);
      if (p === 'x' || p === 'y') {
        if (this._isVirtualStageRotated(stageId)) this._warnAmbiguousStageAxis(stageId, p, invert);
        return v;
      }
      return v;
    }

    _drawChart(widget) {
      const c = widget.dom.canvas, ctx = widget.dom.ctx; if (!c || !ctx) return;
      const r = c.getBoundingClientRect(); const w = Math.max(2, Math.floor(r.width * devicePixelRatio)); const h = Math.max(2, Math.floor(r.height * devicePixelRatio)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      ctx.clearRect(0, 0, w, h);
      const d = widget.value || {}; const series = Array.isArray(d.series) ? d.series : []; if (!series.length) return;
      const pad = 20 * devicePixelRatio;
      let min = Infinity, max = -Infinity, len = 0;
      series.forEach(s => { const vals = Array.isArray(s.values) ? s.values : []; len = Math.max(len, vals.length); vals.forEach(x => { const n = num(x, 0); min = Math.min(min, n); max = Math.max(max, n); }); });
      if (min === Infinity) { min = 0; max = 1; }
      if (min === max) max = min + 1;
      const mapX = i => pad + (len <= 1 ? (w - pad * 2) / 2 : (i / (len - 1)) * (w - pad * 2));
      const mapY = n => pad + (1 - ((num(n, 0) - min) / (max - min))) * (h - pad * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.stroke();
      series.forEach((s, idx) => { const vals = Array.isArray(s.values) ? s.values : []; ctx.strokeStyle = s.color || '#00d2ff'; ctx.lineWidth = 2 * devicePixelRatio; ctx.beginPath(); vals.forEach((n, i) => { const x = mapX(i), y = mapY(n); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); if (widget.type === 'chart.bar') { const bw = ((w - pad * 2) / Math.max(1, vals.length)) * 0.7; vals.forEach((n, i) => { const x = mapX(i) - bw / 2; const y = mapY(n); ctx.fillRect(x, y, bw, h - pad - y); }); } });
    }

    _drawTable(widget) {
      const wrap = widget.dom.tableWrap; if (!wrap) return; wrap.innerHTML = '';
      const d = widget.value || {}; const cols = Array.isArray(d.columns) ? d.columns : []; const rows = Array.isArray(d.rows) ? d.rows : [];
      const table = document.createElement('table'); table.className = 'dp-table';
      const thead = document.createElement('thead'); const tr = document.createElement('tr');
      cols.forEach(col => { const th = document.createElement('th'); th.textContent = col.label || col.key || ''; th.onclick = () => { rows.sort((a, b) => String(a[col.key] ?? '').localeCompare(String(b[col.key] ?? ''))); this._setWidgetValue(this._findDashOfWidget(widget.id), widget, { ...d, rows }, 'sort'); }; tr.appendChild(th); });
      thead.appendChild(tr); table.appendChild(thead);
      const tbody = document.createElement('tbody'); rows.forEach((row, idx) => { const tr2 = document.createElement('tr'); tr2.onclick = () => this._emit('widget.clicked', this._findDashOfWidget(widget.id), { widgetId: widget.id, value: row, rowIndex: idx }); cols.forEach(col => { const td = document.createElement('td'); td.textContent = String(row[col.key] ?? ''); tr2.appendChild(td); }); tbody.appendChild(tr2); });
      table.appendChild(tbody); wrap.appendChild(table);
    }

    _drawMinimap(widget) {
      const c = widget.dom.canvas, ctx = widget.dom.ctx; if (!c || !ctx) return;
      const r = c.getBoundingClientRect(); const w = Math.max(2, Math.floor(r.width * devicePixelRatio)); const h = Math.max(2, Math.floor(r.height * devicePixelRatio)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 0, w, h);
      const d = widget.value || {}; const b = d.bounds || { x: 0, y: 0, w: 100, h: 100 }; const pts = Array.isArray(d.points) ? d.points : []; const sx = w / (b.w || 1), sy = h / (b.h || 1);
      ctx.strokeStyle = 'rgba(255,255,255,0.24)'; ctx.strokeRect(0, 0, w, h);
      pts.forEach(pt => { const x = (pt.x - (b.x || 0)) * sx; const y = (pt.y - (b.y || 0)) * sy; ctx.fillStyle = pt.color || '#00d2ff'; ctx.beginPath(); ctx.arc(x, y, 4 * devicePixelRatio, 0, Math.PI * 2); ctx.fill(); });
    }

    _ensureStageFrameCacheHook() {
      const renderer = Scratch?.vm?.runtime?.renderer;
      if (!renderer || this._stageFrameHook?.renderer === renderer) return;
      this._removeStageFrameCacheHook();
      const hook = { renderer, eventOffs: [] };
      const update = () => { if (!this._disposed) this._updateStageFrameCache(); };
      const eventNames = ['draw', 'afterDraw', 'rendered', 'afterRender', 'RENDERED', 'AFTER_RENDER'];
      if (typeof renderer.on === 'function') {
        eventNames.forEach(name => {
          try {
            renderer.on(name, update);
            hook.eventOffs.push(() => {
              try {
                if (typeof renderer.off === 'function') renderer.off(name, update);
                else if (typeof renderer.removeListener === 'function') renderer.removeListener(name, update);
              } catch {}
            });
          } catch {}
        });
      }
      const originalDraw = typeof renderer.draw === 'function' ? renderer.draw : null;
      if (originalDraw) {
        const self = this;
        const wrappedDraw = function (...args) {
          const result = originalDraw.apply(this, args);
          self._updateStageFrameCache();
          return result;
        };
        try {
          renderer.draw = wrappedDraw;
          hook.originalDraw = originalDraw;
          hook.wrappedDraw = wrappedDraw;
        } catch {}
      }
      this._stageFrameHook = hook;
      this._updateStageFrameCache();
    }

    _removeStageFrameCacheHook() {
      const hook = this._stageFrameHook;
      if (!hook) return;
      (hook.eventOffs || []).forEach(off => off());
      try {
        if (hook.renderer?.draw === hook.wrappedDraw && hook.originalDraw) hook.renderer.draw = hook.originalDraw;
      } catch {}
      this._stageFrameHook = null;
    }

    _updateStageFrameCache() {
      const src = this._getStageCanvas();
      if (!src || src === this._stageFrameCache.canvas || !src.width || !src.height) return false;
      if (src.classList?.contains?.('dp-stage-canvas')) return false;
      const width = Math.max(1, Math.min(MAX_CANVAS_DIMENSION, Math.floor(src.width)));
      const height = Math.max(1, Math.min(MAX_CANVAS_DIMENSION, Math.floor(src.height)));
      if (!this._stageFrameCache.canvas) {
        this._stageFrameCache.canvas = document.createElement('canvas');
        this._stageFrameCache.ctx = this._stageFrameCache.canvas.getContext('2d');
      }
      const cache = this._stageFrameCache;
      if (!cache.ctx) return false;
      if (cache.canvas.width !== width || cache.canvas.height !== height) {
        cache.canvas.width = width;
        cache.canvas.height = height;
      }
      try {
        cache.ctx.setTransform(1, 0, 0, 1, 0, 0);
        cache.ctx.clearRect(0, 0, width, height);
        cache.ctx.drawImage(src, 0, 0, width, height);
      } catch {
        return false;
      }
      cache.width = width;
      cache.height = height;
      cache.updatedAt = Date.now();
      return true;
    }

    _getStageFrameCanvas() {
      let cache = this._stageFrameCache;
      if (!cache?.canvas || !cache.width || !cache.height || !cache.updatedAt) {
        this._updateStageFrameCache();
        cache = this._stageFrameCache;
      }
      if (!cache?.canvas || !cache.width || !cache.height || !cache.updatedAt) return null;
      return cache.canvas;
    }

    _getStageCanvas() {
      const renderer = Scratch?.vm?.runtime?.renderer;
      const canvas = renderer?._gl?.canvas || renderer?.canvas;
      if (canvas) return canvas;
      return document.querySelector('canvas[class*="stage"]:not(.dp-stage-canvas)');
    }


    _getNativeStageSize() {
      const native = Scratch?.vm?.runtime?.renderer?._nativeSize || [Scratch?.vm?.runtime?.stageWidth || 480, Scratch?.vm?.runtime?.stageHeight || 360];
      return { width: num(native[0], 480), height: num(native[1], 360) };
    }

    _getVisiblePopupStageWidgets(dash) {
      if (!dash || this._getActiveHostType(dash) !== 'popup' || !this._isPopupOpen(dash)) return [];
      return Object.values(dash.widgets || {}).filter(widget => {
        if (!this._isStageWidget(widget) || !widget.dom?.canvas) return false;
        if (dash.layout?.mode === 'pages') {
          const activeWidgets = (dash.pages.find(page => page.id === dash.activePage)?.widgets) || [];
          if (!activeWidgets.includes(widget.id)) return false;
        }
        return widget.card?.style?.display !== 'none';
      });
    }

    _makePopupStageFramePayload(dash, widgets, frame, frameKind, frameWidth, frameHeight) {
      const stageSize = this._getNativeStageSize();
      dash._popupStageTransport = dash._popupStageTransport || { lastSent: 0, inFlight: false, sequence: 0 };
      const transport = dash._popupStageTransport;
      transport.sequence += 1;
      return {
        type: 'dashey:stage-frame',
        dashId: dash.id,
        sequence: transport.sequence,
        frameKind,
        frame,
        width: frameWidth,
        height: frameHeight,
        stageWidth: stageSize.width,
        stageHeight: stageSize.height,
        widgets: widgets.map(widget => {
          const stageId = this._getVirtualStageId(widget);
          const camera = { ...this._normalizeStageCamera(widget.camera || widget.value), id: stageId };
          widget.camera = camera;
          return { id: widget.id, type: widget.type, stageId, camera };
        })
      };
    }

    _postPopupStageFrames(dash) {
      const widgets = this._getVisiblePopupStageWidgets(dash);
      if (!widgets.length) return;
      const src = this._getStageFrameCanvas();
      if (!src || !src.width || !src.height || !this._isPopupOpen(dash)) return;
      dash._popupStageTransport = dash._popupStageTransport || { lastSent: 0, inFlight: false, sequence: 0 };
      const transport = dash._popupStageTransport;
      const now = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
      if (transport.inFlight || now - transport.lastSent < STAGE_POPUP_FRAME_INTERVAL) return;
      transport.lastSent = now;
      transport.inFlight = true;
      const postFrame = (frame, frameKind, transfer = []) => {
        try {
          const payload = this._makePopupStageFramePayload(dash, widgets, frame, frameKind, src.width, src.height);
          dash.popup.postMessage(payload, '*', transfer);
        } catch {}
      };
      if (typeof createImageBitmap === 'function') {
        createImageBitmap(src).then(bitmap => {
          if (this._isPopupOpen(dash)) postFrame(bitmap, 'imageBitmap', [bitmap]);
          else if (typeof bitmap.close === 'function') bitmap.close();
        }).catch(() => this._postPopupStageFrameFallback(dash, widgets, src)).finally(() => { transport.inFlight = false; });
        return;
      }
      this._postPopupStageFrameFallback(dash, widgets, src);
      transport.inFlight = false;
    }

    _postPopupStageFrameFallback(dash, widgets, src) {
      if (!this._isPopupOpen(dash)) return;
      const finish = (frame, frameKind) => {
        try {
          const payload = this._makePopupStageFramePayload(dash, widgets, frame, frameKind, src.width, src.height);
          dash.popup.postMessage(payload, '*');
        } catch {}
      };
      if (typeof src.toBlob === 'function') {
        try {
          src.toBlob(blob => { if (blob) finish(blob, 'blob'); else this._postPopupStageFrameDataURL(dash, widgets, src); }, 'image/webp', 0.8);
          return;
        } catch {}
      }
      this._postPopupStageFrameDataURL(dash, widgets, src);
    }

    _postPopupStageFrameDataURL(dash, widgets, src) {
      if (!this._isPopupOpen(dash)) return;
      try {
        const dataURL = src.toDataURL('image/webp', 0.75);
        const payload = this._makePopupStageFramePayload(dash, widgets, dataURL, 'dataURL', src.width, src.height);
        dash.popup.postMessage(payload, '*');
      } catch {}
    }

    _drawStage(widget) {
      const c = widget.dom.canvas, ctx = widget.dom.ctx; if (!c || !ctx) return;
      const src = this._getStageFrameCanvas();
      const r = c.getBoundingClientRect();
      const cssW = Math.max(2, Math.min(MAX_CANVAS_DIMENSION, Math.floor(r.width || 2)));
      const cssH = Math.max(2, Math.min(MAX_CANVAS_DIMENSION, Math.floor(r.height || 2)));
      const w = Math.max(2, Math.min(MAX_CANVAS_DIMENSION, Math.floor(cssW * devicePixelRatio)));
      const h = Math.max(2, Math.min(MAX_CANVAS_DIMENSION, Math.floor(cssH * devicePixelRatio)));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      if (!src || src === c || !src.width || !src.height) {
        ctx.fillStyle = 'rgba(255,255,255,0.72)'; ctx.font = `${12 * devicePixelRatio}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('Stage unavailable', w / 2, h / 2);
        return;
      }
      if (widget.type !== 'stage.expand') {
        const scale = Math.min(w / src.width, h / src.height);
        const dw = src.width * scale, dh = src.height * scale;
        const dx = (w - dw) / 2, dy = (h - dh) / 2;
        try { ctx.drawImage(src, dx, dy, dw, dh); } catch {}
        return;
      }
      const cam = this._normalizeStageCamera(widget.camera || widget.value);
      widget.camera = cam;
      const native = this._getNativeStageSize();
      const stageW = native.width, stageH = native.height;
      const scratchScale = Math.min(w / cam.width, h / cam.height) * (cam.zoom / 100);
      const angle = (90 - cam.direction) * Math.PI / 180;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scratchScale, scratchScale);
      ctx.rotate(angle);
      ctx.translate(-cam.x, -cam.y);
      try { ctx.drawImage(src, -stageW / 2, stageH / 2, stageW, -stageH); } catch {}
      ctx.restore();
    }


    _stageLoop() {
      if (this._disposed) return;
      this._ensureStageFrameCacheHook();
      for (const id in this.dashboards) {
        const d = this.dashboards[id];
        if (d.popup && !this._isPopupOpen(d)) this._teardownDashboardHost(d, { resetWidgets: true });
        if (!d.container || d.container.style.display === 'none') continue;
        const isPopup = this._getActiveHostType(d) === 'popup';
        let hasPopupStage = false;
        for (const wid in d.widgets) {
          const w = d.widgets[wid];
          if ((w.type === 'stage' || w.type === 'stage.expand') && w.dom.canvas) {
            if (isPopup) hasPopupStage = true;
            else this._drawStage(w);
          }
          if (w.type === 'clock' && w.dom.text) this._updateWidgetDom(w, w.value);
          if (w._needsChartRedraw && w.dom.canvas) { w._needsChartRedraw = false; this._drawChart(w); }
          if (w._needsTableRedraw && w.dom.tableWrap) { w._needsTableRedraw = false; this._drawTable(w); }
          if (w._needsMiniRedraw && w.dom.canvas) { w._needsMiniRedraw = false; this._drawMinimap(w); }
        }
        if (hasPopupStage) this._postPopupStageFrames(d);
      }
      this._raf = requestAnimationFrame(this._stageLoop);
    }

    createDashboard(args) { const id = String(args.DASH_ID); const title = String(args.TITLE || id); if (this.dashboards[id]) { this.setDashboardTitle({ DASH_ID: id, TITLE: title }); this.showDashboard({ DASH_ID: id }); return; } const d = this._makeDashboard(id, title); this.dashboards[id] = d; this._createHostAndWindow(d); this._renderDashboardFromModel(d); this.showDashboard({ DASH_ID: id }); this._savePersisted(); }
    createFromTemplate(args) { const tpl = TEMPLATES[String(args.TEMPLATE)] || TEMPLATES.blank; this.createDashboard({ DASH_ID: String(args.DASH_ID), TITLE: tpl.title }); const d = this._getDash(args.DASH_ID); d.layout = clone(tpl.layout); tpl.widgets.forEach(w => { this.addWidget({ DASH_ID: d.id, WIDGET_ID: w.id, TYPE: w.type, TITLE: w.title || w.id, VALUE: JSON.stringify(w.value ?? '') }); this.setWidgetPosition({ DASH_ID: d.id, WIDGET_ID: w.id, X: w.pos?.x || 0, Y: w.pos?.y || 0, W: w.pos?.w || 3, H: w.pos?.h || 2 }); }); this._savePersisted(); }
    _renderDashboardFromModel(d) {
      if (!d?.grid) return;
      d.grid.innerHTML = '';
      d.grid.classList.toggle('dp-freeform', d.layout.mode === 'freeform');
      const hasFullscreen = Object.values(d.widgets).some(w => w?.fullscreen);
      if (d.layout.mode === 'freeform') {
        d.grid.style.position = 'relative';
        d.grid.style.display = 'block';
        d.grid.style.gridAutoRows = '';
      } else {
        d.grid.style.position = '';
        d.grid.style.display = 'grid';
        d.grid.style.gridTemplateColumns = `repeat(${clamp(num(d.layout.columns, 12), 1, 48)}, minmax(0, 1fr))`;
        d.grid.style.gridAutoRows = hasFullscreen ? 'minmax(0, 1fr)' : `${num(d.layout.rowHeight, 48)}px`;
        d.grid.style.alignContent = hasFullscreen ? 'stretch' : 'start';
        d.grid.style.gap = hasFullscreen ? '0px' : `${num(d.layout.gap, 12)}px`;
      }
      for (const wid in d.widgets) {
        const w = d.widgets[wid];
        if (w?.card) {
          d.grid.appendChild(w.card);
          this._applyWidgetPosition(d, w);
        }
      }
      this._refreshWidgetVisibility(d);
    }
    showDashboard(args) { const d = this._getDash(args.DASH_ID); if (!d) return; this._hydrateDashboardDom(d); if (!d.container) return; d.state.minimized = false; d.container.style.display = 'flex'; d.container.style.animation = 'dp-pop .2s ease-out'; this._bringToFront(d); this._syncWindowStyles(d); this._markDirty(d); this._savePersisted(); }
    hideDashboard(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.state.minimized = true; if (this._getActiveHostType(d) === 'popup') this._teardownDashboardHost(d, { resetWidgets: true, closePopup: true }); else if (d.container) d.container.style.display = 'none'; this._savePersisted(); }
    destroyDashboard(args) { const d = this._getDash(args.DASH_ID); if (!d) return; this._teardownDashboardHost(d, { resetWidgets: true, closePopup: true }); delete this.dashboards[d.id]; this._savePersisted(); }
    setDashboardTitle(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.title = String(args.TITLE); if (d.header) d.header.querySelector('.dp-title').textContent = d.title; if (this._isPopupOpen(d)) { try { d.popup.document.title = d.title; } catch {} this._postDashboardModel(d); } this._savePersisted(); }
    setDashboardLayout(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.layout.mode = String(args.MODE); d.layout.columns = clamp(num(args.COLS, 12), 1, 48); d.layout.rowHeight = clamp(num(args.ROW, 48), 16, 200); d.layout.snap = !!args.SNAP; if (d.grid) this._renderDashboardFromModel(d); this._markDirty(d); this._savePersisted(); }
    setDashboardTheme(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const name = String(args.THEME); if (name !== 'custom') d.theme = clone(this.themes[name] || this.themes.dark); else d.theme = d.theme || clone(DEFAULT_THEME); this._applyTheme(d); this._savePersisted(); }
    setDashboardColor(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.theme.vars['--dp-bg'] = String(args.BG); d.theme.vars['--dp-fg'] = String(args.FG); d.theme.vars['--dp-accent'] = String(args.ACC); this._applyTheme(d); this._savePersisted(); }
    setDashboardWindow(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.window.mode = 'windowed'; d.window.x = num(args.X, d.window.x); d.window.y = num(args.Y, d.window.y); d.window.width = num(args.W, d.window.width); d.window.height = num(args.H, d.window.height); this._syncWindowStyles(d); this._savePersisted(); }
    setWindowMode(args) {
      const d = this._getDash(args.DASH_ID);
      if (!d) return;
      const mode = String(args.MODE || 'windowed');
      if (mode !== 'windowed' && d.window.mode === 'windowed') d.state.prevWindow = clone(d.window);
      if (mode === 'windowed' && d.state.prevWindow) {
        Object.assign(d.window, d.state.prevWindow, { mode: 'windowed' });
        d.state.prevWindow = null;
      } else {
        d.window.mode = mode;
      }
      d.state.modal = mode === 'modal';
      d.state.minimized = mode === 'minimized';
      this._hydrateDashboardDom(d);
      if (!d.container) return;
      d.container.style.display = mode === 'minimized' ? 'none' : 'flex';
      this._bringToFront(d);
      this._syncWindowStyles(d);
      this._markDirty(d);
      this._savePersisted();
    }

    setDashboardHost(args) {
      const d = this._getDash(args.DASH_ID);
      if (!d) return;
      const mode = this._normalizeHostMode(args.MODE);
      d.window.hostMode = mode;
      d.window.hostType = mode;
      this._hydrateDashboardDom(d);
      if (d.container) d.container.style.display = d.state.minimized ? 'none' : 'flex';
      this._bringToFront(d);
      this._syncWindowStyles(d);
      this._markDirty(d);
      this._savePersisted();
    }

    addWidget(args) {
      const d = this._getDash(args.DASH_ID, args.DASH_ID); if (!d) return; const id = String(args.WIDGET_ID); if (d.widgets[id]) this.removeWidget({ DASH_ID: d.id, WIDGET_ID: id });
      const t = String(args.TYPE), title = String(args.TITLE || id), raw = this._sanitizeValue(t, args.VALUE);
      const w = { id, type: t, title, value: raw, state: {}, style: {}, sandbox: d.security.defaultMode || 'safe', position: { x: 0, y: 0, w: d.layout.mode === 'freeform' ? 180 : 3, h: d.layout.mode === 'freeform' ? 120 : 2, mode: d.layout.mode === 'freeform' ? 'freeform' : 'grid' }, permissions: { move: 'both', resize: 'both' }, camera: this._normalizeStageCamera(raw), fullscreen: false, dom: {}, card: null, content: null, resizeHandle: null };
      if (this._isStageWidget(w)) this._applyVirtualStageId(w, raw);
      d.widgets[id] = w; if (d.grid) { this._createWidgetDom(d, w, title, raw); d.grid.appendChild(w.card); this._applyWidgetPosition(d, w); } d.pages[0].widgets.push(id); this._savePersisted(); this._markDirty(d);
    }
    _sanitizeValue(type, value) { if (['table.grid', 'chart.line', 'chart.bar', 'chart.multi', 'viewer.minimap', 'metric.number', 'badge', 'gauge.meter', 'color.swatch', 'list.items', 'timeline', 'clock', 'stage', 'stage.expand'].includes(type)) { const p = jparse(String(value), null); if (p !== null) return p; } return value; }
    updateWidget(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; const before = clone(w.value); const after = this._sanitizeValue(w.type, args.VALUE); this._setWidgetValue(d, w, after, 'code'); this._record({ op: 'widget.value', dashId: d.id, widgetId: w.id, before, after: clone(after) }); this._savePersisted(); }
    appendLog(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w || w.type !== 'log') return; const lines = Array.isArray(w.value?.lines) ? w.value.lines.slice() : []; lines.push(String(args.VALUE)); this._setWidgetValue(d, w, { lines }, 'code'); this._savePersisted(); }
    setWidgetPosition(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w || (!canInteract(w, 'move', 'code') && !canInteract(w, 'resize', 'code'))) return; const before = clone(w.position); w.position = w.position || {}; if (canInteract(w, 'move', 'code')) { w.position.x = num(args.X, 0); w.position.y = num(args.Y, 0); } if (canInteract(w, 'resize', 'code')) { w.position.w = num(args.W, d.layout.mode === 'freeform' ? 180 : 3); w.position.h = num(args.H, d.layout.mode === 'freeform' ? 120 : 2); } w.position.mode = d.layout.mode === 'freeform' ? 'freeform' : 'grid'; this._applyWidgetPosition(d, w); this._record({ op: 'widget.move', dashId: d.id, widgetId: w.id, before, after: clone(w.position) }); this._emit('widget.dragged', d, { widgetId: w.id, value: w.value, position: clone(w.position), source: 'code' }); this._savePersisted(); }
    setWidgetInteraction(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; w.permissions = { move: normalizeInteractionMode(args.MOVE), resize: normalizeInteractionMode(args.RESIZE) }; this._applyWidgetPermissions(w); this._savePersisted(); }
    setWidgetFullscreen(args) {
      const d = this._getDash(args.DASH_ID);
      if (!d) return;
      const w = d.widgets[String(args.WIDGET_ID)];
      if (!w) return;
      if (!!args.ON && Object.keys(d.widgets).length !== 1) return;
      w.fullscreen = !!args.ON;
      this._renderDashboardFromModel(d);
      this._savePersisted();
    }
    setVirtualStageCamera(args) { const w = this._setVirtualStageCameraState(args.STAGE_ID, cam => { cam.x = num(args.X, 0); cam.y = num(args.Y, 0); cam.zoom = num(args.ZOOM, 100); cam.direction = num(args.DIRECTION, 90); }); if (w) this._savePersisted(); }
    changeVirtualStageCamera(args) { const w = this._setVirtualStageCameraState(args.STAGE_ID, cam => { cam.x += num(args.DX, 0); cam.y += num(args.DY, 0); cam.zoom += num(args.DZOOM, 0); cam.direction += num(args.DDIRECTION, 0); }); if (w) this._savePersisted(); }
    setVirtualStageSize(args) { const w = this._setVirtualStageCameraState(args.STAGE_ID, cam => { cam.width = num(args.WIDTH, 480); cam.height = num(args.HEIGHT, 360); }); if (w) this._savePersisted(); }
    getVirtualStageInfo(args) { const cam = this._getVirtualStageCamera(args.STAGE_ID); const prop = String(args.PROP).toLowerCase(); if (prop === 'rotation') return cam.direction; if (prop === 'mouse x' || prop === 'mouse y') { const mouse = this._worldToVirtualStagePoint(args.STAGE_ID, this._readMouse('x'), this._readMouse('y')); return prop === 'mouse y' ? mouse.y : mouse.x; } return cam[prop] ?? ''; }

    // These reporter blocks accept one scalar value. Scalar camera conversions are
    // safe for size, direction, and rotation. The x and y options represent point
    // components, so this scalar-only API leaves them unchanged; with rotation
    // active it also warns instead of inventing a missing paired coordinate.
    localiseToStage(args) { return this._localStageScalar(args.STAGE_ID, args.VALUE, args.PROP, false); }
    normaliseFromStage(args) { return this._localStageScalar(args.STAGE_ID, args.VALUE, args.PROP, true); }
    setWidgetStyle(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; w.style[String(args.KEY)] = String(args.VALUE); this._applyWidgetStyle(w); this._savePersisted(); }
    setWidgetShape(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; const s = String(args.SHAPE); if (w.card) w.card.style.borderRadius = s === 'sharp' ? '0px' : s === 'circle' ? '50%' : s === 'pill' ? '9999px' : '12px'; }
    setWidgetTitle(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; w.title = String(args.TITLE); if (w.label) w.label.textContent = w.title; this._savePersisted(); }
    setWidgetSandbox(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; w.sandbox = String(args.MODE); if (w.type === 'iframe' && w.dom.iframe) { if (w.sandbox === 'safe') w.dom.iframe.setAttribute('sandbox', 'allow-same-origin'); else if (w.sandbox === 'restricted') w.dom.iframe.setAttribute('sandbox', 'allow-same-origin allow-forms'); else w.dom.iframe.removeAttribute('sandbox'); } }
    removeWidget(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const id = String(args.WIDGET_ID); const w = d.widgets[id]; if (!w) return; if (w._cleanupResize) w._cleanupResize(); if (w.card?.parentNode) w.card.parentNode.removeChild(w.card); delete d.widgets[id]; d.pages.forEach(p => p.widgets = p.widgets.filter(x => x !== id)); d.bindings = d.bindings.filter(b => b.widgetId !== id); d.links = d.links.filter(l => l.from !== id && l.to !== id); this._savePersisted(); }
    bindWidgetToVar(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const id = String(args.WIDGET_ID), dir = String(args.DIR), name = String(args.VAR); d.bindings = d.bindings.filter(b => !(b.widgetId === id && b.varName === name)); d.bindings.push({ widgetId: id, varName: name, dir, sourceGuard: '' }); const w = d.widgets[id]; if (!w) return; if (dir === 'input' || dir === 'both') { const v = this._readScratchVar(name); if (v !== '') this._setWidgetValue(d, w, v, 'scratch'); } else { this._writeScratchVar(name, w.value); } this._savePersisted(); }
    linkWidgets(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.links = d.links.filter(l => !(l.from === String(args.FROM) && l.to === String(args.TO))); d.links.push({ from: String(args.FROM), to: String(args.TO) }); this._savePersisted(); }
    setDashboardVar(args) { const d = this._getDash(args.DASH_ID); if (!d) return; this._setDashboardVarInternal(d, String(args.NAME), args.VALUE, 'code'); this._savePersisted(); }
    changeDashboardVar(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const n = String(args.NAME); this._setDashboardVarInternal(d, n, num(d.variables[n], 0) + num(args.VALUE, 0), 'code'); this._savePersisted(); }
    getDashboardVar(args) { const d = this._getDash(args.DASH_ID); if (!d) return ''; const v = d.variables[String(args.NAME)]; return v === undefined ? '' : v; }
    getWidgetValue(args) { const d = this._getDash(args.DASH_ID); if (!d) return ''; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return ''; return isObj(w.value) || Array.isArray(w.value) ? JSON.stringify(w.value) : (w.value ?? ''); }
    saveDashboard(args) { this._savePersisted(); }
    loadDashboard(args) { const b = jparse(localStorage.getItem(STORAGE_KEY), null); if (!b?.dashboards?.[String(args.DASH_ID)]) return; const id = String(args.DASH_ID); if (this.dashboards[id]) this.destroyDashboard({ DASH_ID: id }); const d = this._deserializeDashboard(b.dashboards[id]); this.dashboards[id] = d; this._hydrateDashboardDom(d); this.showDashboard({ DASH_ID: id }); this._savePersisted(); }
    exportDashboard(args) { const d = this._getDash(args.DASH_ID); return JSON.stringify({ schemaVersion: '2.0.0', dashboard: d ? this._serializeDashboard(d) : null }); }
    importDashboard(args) { const parsed = jparse(String(args.JSON), null); if (!parsed) return; const obj = parsed.dashboard || parsed; const id = String(args.DASH_ID || obj.id || 'main'); if (this.dashboards[id]) this.destroyDashboard({ DASH_ID: id }); const d = this._deserializeDashboard({ ...obj, id }); this.dashboards[id] = d; this._hydrateDashboardDom(d); this.showDashboard({ DASH_ID: id }); this._savePersisted(); }
    undo() { const c = this.undoStack.pop(); if (!c) return; this.redoStack.push(c); if (c.op === 'widget.value') { const d = this._getDash(c.dashId); const w = d?.widgets?.[c.widgetId]; if (d && w) this._setWidgetValue(d, w, c.before, 'undo'); } else if (c.op === 'widget.move') { const d = this._getDash(c.dashId); const w = d?.widgets?.[c.widgetId]; if (d && w) this.setWidgetPosition({ DASH_ID: d.id, WIDGET_ID: w.id, X: c.before.x, Y: c.before.y, W: c.before.w, H: c.before.h }); } else if (c.op === 'dashboard.theme') { const d = this._getDash(c.dashId); if (d) { d.theme = c.before; this._applyTheme(d); } } this._savePersisted(); }
    redo() { const c = this.redoStack.pop(); if (!c) return; this.undoStack.push(c); if (c.op === 'widget.value') { const d = this._getDash(c.dashId); const w = d?.widgets?.[c.widgetId]; if (d && w) this._setWidgetValue(d, w, c.after, 'redo'); } else if (c.op === 'widget.move') { const d = this._getDash(c.dashId); const w = d?.widgets?.[c.widgetId]; if (d && w) this.setWidgetPosition({ DASH_ID: d.id, WIDGET_ID: w.id, X: c.after.x, Y: c.after.y, W: c.after.w, H: c.after.h }); } else if (c.op === 'dashboard.theme') { const d = this._getDash(c.dashId); if (d) { d.theme = c.after; this._applyTheme(d); } } this._savePersisted(); }
    setDebugMode(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.state.debug = !!args.ON; for (const wid in d.widgets) { const w = d.widgets[wid]; if (w.card) w.card.classList.toggle('dp-debug', d.state.debug); } }
    inspectWidget(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; const msg = [`id: ${w.id}`, `type: ${w.type}`, `title: ${w.title}`, `value: ${typeof w.value === 'object' ? JSON.stringify(w.value) : String(w.value)}`, `pos: ${JSON.stringify(w.position)}`, `sandbox: ${w.sandbox}`, `style: ${JSON.stringify(w.style)}`].join('\n'); alert(msg); }

    whenWidgetClicked(args) { return false; }
    whenWidgetHovered(args) { return false; }
    whenWidgetChanged(args) { return false; }
    whenWidgetDragged(args) { return false; }
    whenWidgetResized(args) { return false; }
    whenDashboardPageChanged(args) { return false; }

    _sanitizeWidgetData(type, value) { if (['table.grid', 'chart.line', 'chart.bar', 'chart.multi', 'viewer.minimap'].includes(type)) { const p = jparse(String(value), null); if (p !== null) return p; } return value; }

    _refreshWidgetVisibility(dash) {
      const active = new Set((dash.pages.find(p => p.id === dash.activePage)?.widgets) || []);
      for (const id in dash.widgets) {
        const w = dash.widgets[id];
        if (!w?.card) continue;
        const visible = !dash.state.minimized && dash.container?.style.display !== 'none' && (dash.layout.mode !== 'pages' || active.has(id));
        w.card.style.display = visible ? '' : 'none';
      }
    }

    destroy() {
      this._disposed = true;
      cancelAnimationFrame(this._raf);
      this._removeStageFrameCacheHook();
      for (const id in this.dashboards) this.destroyDashboard({ DASH_ID: id });
    }
  }

  if (window.dasheyInstance && typeof window.dasheyInstance.destroy === 'function') {
    try { window.dasheyInstance.destroy(); } catch {}
  }

  Scratch.extensions.register((instance => {
    window.dasheyInstance = instance;
    return instance;
  })(new Dashey()));

})(Scratch);
