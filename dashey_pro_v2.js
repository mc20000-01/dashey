// Name         :  Dashey Pro v2
// ID           :  dashey2
// Description  :  Advanced multi-window dashboard runtime for TurboWarp unsandboxed mode.
// License      :  GPL-3.0-only

(function (Scratch) {
  'use strict';

  if (!Scratch?.extensions?.unsandboxed) {
    throw new Error('Dashey Pro v2 must be run unsandboxed.');
  }

  const EXT_ID = 'dashey2';
  const STORAGE_KEY = 'dashey:v2:bundle';
  const MAX_HISTORY = 100;

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
    'text', 'progress.bar', 'ring.chart', 'status.light', 'image', 'stage', 'audio', 'iframe', 'html', 'log',
    'chart.line', 'chart.bar', 'chart.multi', 'table.grid', 'control.button', 'control.input', 'control.toggle',
    'control.slider', 'control.select', 'terminal.console', 'editor.code', 'viewer.minimap'
  ];

  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const clone = v => { try { return structuredClone(v); } catch { return JSON.parse(JSON.stringify(v)); } };
  const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
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

  class DasheyProV2 {
    constructor() {
      this.dashboards = Object.create(null);
      this.themes = { dark: clone(DEFAULT_THEME) };
      this.globalZ = 500;
      this.undoStack = [];
      this.redoStack = [];
      this.renderQueued = false;
      this._disposed = false;
      this._stageLoop = this._stageLoop.bind(this);
      this._injectStyles();
      this._loadPersisted();
      this._raf = requestAnimationFrame(this._stageLoop);
      window.addEventListener('beforeunload', () => this._savePersisted());
    }

    getInfo() {
      return {
        id: EXT_ID,
        name: 'Dashey Pro v2',
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
          '---',
          { opcode: 'addWidget', blockType: Scratch.BlockType.COMMAND, text: 'add [TYPE] widget [WIDGET_ID] to dashboard [DASH_ID] titled [TITLE] value [VALUE]', arguments: { TYPE: { type: Scratch.ArgumentType.STRING, menu: 'WIDGET_MENU' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, TITLE: { type: Scratch.ArgumentType.STRING, defaultValue: 'Widget' }, VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '' } } },
          { opcode: 'updateWidget', blockType: Scratch.BlockType.COMMAND, text: 'set widget [WIDGET_ID] on dashboard [DASH_ID] value to [VALUE]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello' } } },
          { opcode: 'appendLog', blockType: Scratch.BlockType.COMMAND, text: 'append [VALUE] to log widget [WIDGET_ID] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'log1' }, VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '> message' } } },
          { opcode: 'setWidgetPosition', blockType: Scratch.BlockType.COMMAND, text: 'set widget [WIDGET_ID] position x [X] y [Y] w [W] h [H] on dashboard [DASH_ID]', arguments: { DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }, WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }, X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 }, H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 } } },
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
          SHAPE_MENU: { acceptReporters: true, items: ['rounded', 'sharp', 'circle', 'pill'] },
          BIND_DIR_MENU: { acceptReporters: true, items: ['input', 'output', 'both'] },
          SANDBOX_MENU: { acceptReporters: true, items: ['safe', 'restricted', 'unsafe'] }
        }
      };
    }

    _injectStyles() {
      if (document.getElementById('dashey2-style')) return;
      const style = document.createElement('style');
      style.id = 'dashey2-style';
      style.textContent = `
        @keyframes dp-pop { from { opacity: 0; transform: scale(0.98) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .dp-host { all: initial; position: fixed; z-index: 500; }
        .dp-window { position: fixed; display: none; flex-direction: column; overflow: hidden; border-radius: 12px; color: var(--dp-fg); font-family: var(--dp-font); box-shadow: var(--dp-shadow); background: var(--dp-bg); border: 1px solid var(--dp-border); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); }
        .dp-header { user-select: none; cursor: grab; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; background: rgba(0,0,0,0.28); border-bottom: 1px solid rgba(255,255,255,0.06); position: relative; min-height: 38px; }
        .dp-title { position: absolute; left: 50%; transform: translateX(-50%); font-size: 13px; font-weight: 700; }
        .dp-body { flex: 1; overflow: auto; padding: 12px; }
        .dp-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 12px; align-content: start; }
        .dp-card { background: var(--dp-surface); border: 1px solid var(--dp-border); border-radius: var(--dp-radius); padding: 12px; overflow: hidden; position: relative; min-height: 48px; box-sizing: border-box; box-shadow: 0 4px 12px rgba(0,0,0,0.18); transition: transform 0.15s, background 0.15s, border-color 0.15s, opacity 0.15s; }
        .dp-card:hover { background: var(--dp-surface-2); }
        .dp-card.dp-debug { outline: 2px dashed rgba(0,210,255,0.85); outline-offset: -2px; }
        .dp-label { font-size: 11px; color: rgba(255,255,255,0.68); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; font-weight: 700; }
        .dp-center { display: flex; align-items: center; justify-content: center; }
        .dp-text { font-size: 20px; font-weight: 700; word-break: break-word; }
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
        .dp-ring svg { transform: rotate(-90deg); overflow: visible; }
        .dp-ring-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-weight: 800; }
        .dp-status { width: 24px; height: 24px; border-radius: 50%; margin: 0 auto; box-shadow: 0 0 10px currentColor; }
        .dp-iframe, .dp-img, .dp-stage-canvas { width: 100%; height: 100%; border: 0; border-radius: 8px; background: rgba(0,0,0,0.2); }
        .dp-stage-canvas { object-fit: contain; background: #000; }
        .dp-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .dp-table th, .dp-table td { border-bottom: 1px solid rgba(255,255,255,0.08); padding: 6px 8px; text-align: left; }
        .dp-table th { cursor: pointer; position: sticky; top: 0; background: rgba(0,0,0,0.22); }
        .dp-terminal { background: #0b0d11; color: #d7e0ea; border-radius: 8px; padding: 8px; height: 100%; display: flex; flex-direction: column; }
        .dp-terminal-output { flex: 1; overflow: auto; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
        .dp-terminal-input { width: 100%; border: 0; outline: none; background: transparent; color: inherit; font-family: monospace; font-size: 12px; margin-top: 6px; }
        .dp-minimap { width: 100%; height: 100%; background: rgba(0,0,0,0.15); border-radius: 8px; }
        .dp-resize { position: absolute; width: 12px; height: 12px; right: 0; bottom: 0; cursor: nwse-resize; background: transparent; }
        .dp-resize::after { content: ''; position: absolute; right: 2px; bottom: 2px; width: 7px; height: 7px; border-right: 2px solid rgba(255,255,255,0.7); border-bottom: 2px solid rgba(255,255,255,0.7); }
        .dp-inspector { font-family: monospace; font-size: 12px; white-space: pre-wrap; }
      `;
      document.head.appendChild(style);
    }

    _makeDashboard(id, title) {
      return {
        id, title,
        widgets: Object.create(null), bindings: [], links: [], variables: Object.create(null),
        pages: [{ id: 'page1', title: 'Page 1', widgets: [] }], activePage: 'page1',
        layout: { mode: 'grid', columns: 12, rowHeight: 48, gap: 12, snap: true, freeform: false },
        theme: clone(DEFAULT_THEME),
        window: { x: 80, y: 80, width: 700, height: 480, zIndex: this.globalZ++, mode: 'windowed', pinned: false, alwaysOnTop: false },
        security: { defaultMode: 'safe' },
        state: { minimized: false, maximized: false, prevWindow: null, debug: false, modal: false },
        host: null, shadow: null, container: null, header: null, body: null, grid: null, dirty: false
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
      return { id: w.id, type: w.type, title: w.title, value: w.value, state: w.state, style: w.style, sandbox: w.sandbox, position: w.position };
    }

    _serializeDashboard(dash) {
      return {
        id: dash.id, title: dash.title, window: clone(dash.window), layout: clone(dash.layout), theme: clone(dash.theme), variables: clone(dash.variables),
        bindings: clone(dash.bindings), links: clone(dash.links), pages: clone(dash.pages), activePage: dash.activePage, security: clone(dash.security),
        widgets: Object.values(dash.widgets).map(w => this._serializeWidget(w))
      };
    }

    _deserializeDashboard(obj) {
      const dash = this._makeDashboard(obj.id, obj.title || obj.id);
      dash.window = Object.assign(dash.window, obj.window || {});
      dash.layout = Object.assign(dash.layout, obj.layout || {});
      dash.theme = obj.theme || clone(DEFAULT_THEME);
      dash.variables = obj.variables || Object.create(null);
      dash.bindings = obj.bindings || [];
      dash.links = obj.links || [];
      dash.pages = obj.pages || [{ id: 'page1', title: 'Page 1', widgets: [] }];
      dash.activePage = obj.activePage || 'page1';
      dash.security = obj.security || dash.security;
      for (const w of (obj.widgets || [])) {
        dash.widgets[w.id] = { id: w.id, type: w.type, title: w.title, value: w.value, state: w.state || {}, style: w.style || {}, sandbox: w.sandbox || 'safe', position: w.position || { x: 0, y: 0, w: 3, h: 2, mode: 'grid' }, dom: {}, card: null, content: null, resizeHandle: null };
      }
      return dash;
    }

    _savePersisted() {
      const bundle = { schemaVersion: '2.0.0', updatedAt: Date.now(), dashboards: {}, themes: clone(this.themes) };
      for (const id in this.dashboards) bundle.dashboards[id] = this._serializeDashboard(this.dashboards[id]);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle)); } catch (e) { console.warn('[Dashey Pro v2] save failed', e); }
    }

    _loadPersisted() {
      const bundle = jparse(localStorage.getItem(STORAGE_KEY), null);
      if (!bundle) return;
      this.themes = Object.assign({ dark: clone(DEFAULT_THEME) }, bundle.themes || {});
      for (const id in bundle.dashboards || {}) {
        const dash = this._deserializeDashboard(bundle.dashboards[id]);
        this.dashboards[id] = dash;
        this._createHostAndWindow(dash);
        this._renderDashboardFromModel(dash);
      }
    }

    _createHostAndWindow(dash) {
      if (dash.host) return;
      dash.host = document.createElement('div');
      dash.host.className = 'dp-host';
      dash.host.id = `dp-host-${dash.id}`;
      dash.host.style.zIndex = dash.window.zIndex;
      document.body.appendChild(dash.host);
      dash.shadow = dash.host.attachShadow({ mode: 'open' });
      const shim = document.createElement('style'); shim.textContent = ':host{all:initial}'; dash.shadow.appendChild(shim);
      const root = document.createElement('div');
      root.className = 'dp-window';
      root.style.left = `${dash.window.x}px`; root.style.top = `${dash.window.y}px`; root.style.width = `${dash.window.width}px`; root.style.height = `${dash.window.height}px`;
      dash.container = root; dash.shadow.appendChild(root);
      this._applyTheme(dash);
      this._buildChrome(dash);
      this._buildBody(dash);
      this._installDragging(dash);
      this._installResizing(dash);
    }

    _buildChrome(dash) {
      const header = document.createElement('div'); header.className = 'dp-header';
      const controls = document.createElement('div'); controls.style.display = 'flex'; controls.style.gap = '8px';
      const dot = (c, h, fn) => { const d = document.createElement('div'); d.style.cssText = `width:12px;height:12px;border-radius:50%;background:${c};cursor:pointer;transition:transform .2s,background .2s`; d.onmouseenter = () => { d.style.background = h; d.style.transform = 'scale(1.15)'; }; d.onmouseleave = () => { d.style.background = c; d.style.transform = 'scale(1)'; }; d.onclick = fn; return d; };
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
      dash.container.addEventListener('mousedown', () => { dash.host.style.zIndex = this.globalZ++; dash.window.zIndex = this.globalZ; });
    }

    _installDragging(dash) {
      const s = { d: false, sx: 0, sy: 0, x: 0, y: 0 };
      const down = e => { if (dash.window.mode === 'fullscreen' || dash.window.mode === 'modal') return; if (e.target.closest('.dp-button') || e.target.closest('.dp-input') || e.target.closest('.dp-select') || e.target.closest('.dp-textarea')) return; s.d = true; s.sx = e.clientX; s.sy = e.clientY; const r = dash.container.getBoundingClientRect(); s.x = r.left; s.y = r.top; dash.header.style.cursor = 'grabbing'; dash.container.style.transition = 'none'; };
      const move = e => { if (!s.d) return; dash.window.x = s.x + (e.clientX - s.sx); dash.window.y = s.y + (e.clientY - s.sy); dash.container.style.left = `${dash.window.x}px`; dash.container.style.top = `${dash.window.y}px`; };
      const up = () => { if (!s.d) return; s.d = false; dash.header.style.cursor = 'grab'; dash.container.style.transition = ''; };
      dash.header.addEventListener('mousedown', down); document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
      dash.cleanupDrag = () => { dash.header.removeEventListener('mousedown', down); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    }

    _installResizing(dash) {
      const h = document.createElement('div'); h.className = 'dp-resize'; dash.container.appendChild(h);
      const s = { d: false, sx: 0, sy: 0, w: 0, h: 0 };
      const down = e => { s.d = true; s.sx = e.clientX; s.sy = e.clientY; const r = dash.container.getBoundingClientRect(); s.w = r.width; s.h = r.height; e.preventDefault(); e.stopPropagation(); };
      const move = e => { if (!s.d) return; const w = clamp(s.w + (e.clientX - s.sx), 260, window.innerWidth); const h = clamp(s.h + (e.clientY - s.sy), 180, window.innerHeight); dash.window.width = w; dash.window.height = h; dash.container.style.width = `${w}px`; dash.container.style.height = `${h}px`; };
      const up = () => { s.d = false; };
      h.addEventListener('mousedown', down); document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
      dash.cleanupResize = () => { h.removeEventListener('mousedown', down); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    }

    _buildCard(widget, title) {
      const card = document.createElement('div'); card.className = 'dp-card'; card.dataset.widgetId = widget.id;
      const label = document.createElement('div'); label.className = 'dp-label'; label.textContent = title || '';
      const content = document.createElement('div'); content.style.width = '100%'; content.style.height = 'calc(100% - 20px)';
      const resize = document.createElement('div'); resize.className = 'dp-resize';
      card.append(label, content, resize);
      return { card, label, content, resize };
    }

    _wireWidget(dash, widget) {
      widget.card.addEventListener('mouseenter', () => this._emit('widget.hovered', dash, { widgetId: widget.id, value: widget.value }));
      widget.card.addEventListener('click', () => this._emit('widget.clicked', dash, { widgetId: widget.id, value: widget.value }));
      if (widget.resizeHandle) {
        const s = { d: false, sx: 0, sy: 0, w: 0, h: 0 };
        widget.resizeHandle.addEventListener('mousedown', e => { s.d = true; s.sx = e.clientX; s.sy = e.clientY; const r = widget.card.getBoundingClientRect(); s.w = r.width; s.h = r.height; this._emit('widget.resizestarted', dash, { widgetId: widget.id, value: widget.value }); e.preventDefault(); e.stopPropagation(); });
        const move = e => { if (!s.d) return; const w = clamp(s.w + (e.clientX - s.sx), 120, 2000); const h = clamp(s.h + (e.clientY - s.sy), 64, 1400); if (widget.position?.mode === 'freeform') { widget.card.style.width = `${w}px`; widget.card.style.height = `${h}px`; widget.position.w = w; widget.position.h = h; } else { const gw = clamp(Math.round(w / 120), 1, 48); const gh = clamp(Math.round(h / 90), 1, 48); widget.card.style.gridColumn = `span ${gw}`; widget.card.style.gridRow = `span ${gh}`; widget.position.w = gw; widget.position.h = gh; } this._emit('widget.resized', dash, { widgetId: widget.id, value: widget.value, width: w, height: h }); };
        const up = () => { s.d = false; };
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
        widget._cleanupResize = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
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
      } else if (t === 'progress.bar') {
        c.innerHTML = `<div><div style="width:100%;height:10px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden"><div class="dp-bar-fill" style="height:100%;width:0;background:var(--dp-accent);border-radius:999px"></div></div><div class="dp-bar-txt" style="text-align:right;margin-top:5px;font-size:12px;font-weight:700"></div></div>`; widget.dom.fill = c.querySelector('.dp-bar-fill'); widget.dom.text = c.querySelector('.dp-bar-txt');
      } else if (t === 'ring.chart') {
        center(); const r = 26, circ = 2 * Math.PI * r; c.innerHTML = `<div class="dp-ring"><svg width="64" height="64" viewBox="0 0 60 60"><circle cx="30" cy="30" r="${r}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6"></circle><circle class="dp-ring-fill" cx="30" cy="30" r="${r}" fill="none" stroke="var(--dp-accent)" stroke-linecap="round" stroke-width="6" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"></circle></svg><div class="dp-ring-text">0%</div></div>`; widget.dom.ring = c.querySelector('.dp-ring-fill'); widget.dom.text = c.querySelector('.dp-ring-text');
      } else if (t === 'status.light') {
        center(); const el = document.createElement('div'); el.className = 'dp-status'; el.style.color = String(data || '#00d2ff'); el.style.background = String(data || '#00d2ff'); c.appendChild(el); widget.dom.light = el;
      } else if (t === 'image') {
        const img = document.createElement('img'); img.className = 'dp-img'; img.src = String(data || ''); c.appendChild(img); widget.dom.img = img;
      } else if (t === 'iframe') {
        const fr = document.createElement('iframe'); fr.className = 'dp-iframe'; fr.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups'); fr.src = String(data || 'about:blank'); c.appendChild(fr); widget.dom.iframe = fr;
      } else if (t === 'html') {
        const fr = document.createElement('iframe'); fr.className = 'dp-iframe'; fr.setAttribute('sandbox', 'allow-same-origin'); fr.srcdoc = sanitizeHTML(String(data || '')); c.appendChild(fr); widget.dom.iframe = fr;
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
      } else if (t === 'stage') {
        const cvs = document.createElement('canvas'); cvs.className = 'dp-stage-canvas'; c.appendChild(cvs); widget.dom.canvas = cvs; widget.dom.ctx = cvs.getContext('2d');
      } else {
        const el = document.createElement('div'); el.textContent = String(data ?? ''); c.appendChild(el); widget.dom.generic = el;
      }
      this._wireWidget(dash, widget);
      this._applyWidgetStyle(widget);
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
      else if (t === 'progress.bar') { if (widget.dom.fill) widget.dom.fill.style.width = `${n}%`; if (widget.dom.text) widget.dom.text.textContent = `${n}%`; }
      else if (t === 'ring.chart') { if (widget.dom.ring) { const r = 26, circ = 2 * Math.PI * r; widget.dom.ring.style.strokeDasharray = `${circ}`; widget.dom.ring.style.strokeDashoffset = `${circ - (n / 100) * circ}`; } if (widget.dom.text) widget.dom.text.textContent = `${n}%`; }
      else if (t === 'status.light' && widget.dom.light) { const c = String(v || '#00d2ff'); widget.dom.light.style.background = c; widget.dom.light.style.color = c; }
      else if (t === 'image' && widget.dom.img) widget.dom.img.src = String(v || '');
      else if (t === 'iframe' && widget.dom.iframe) widget.dom.iframe.src = String(v || 'about:blank');
      else if (t === 'html' && widget.dom.iframe) widget.dom.iframe.srcdoc = sanitizeHTML(String(v || ''));
      else if (t === 'audio' && widget.dom.audio) widget.dom.audio.src = String(v || '');
      else if (t === 'log' && widget.dom.log) widget.dom.log.textContent = (Array.isArray(v?.lines) ? v.lines.join('\n') : String(v ?? '')) + '\n';
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
      else if (t === 'stage') widget._needsStageRedraw = true;
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

    _markDirty(dash) { if (!dash) return; dash.dirty = true; if (!this.renderQueued) { this.renderQueued = true; requestAnimationFrame(() => { this.renderQueued = false; this._flushRender(); }); } }
    _flushRender() { for (const id in this.dashboards) { const d = this.dashboards[id]; if (!d.dirty) continue; d.dirty = false; this._refreshWidgetVisibility(d); } }
    _refreshWidgetVisibility(dash) { const active = new Set((dash.pages.find(p => p.id === dash.activePage)?.widgets) || []); for (const id in dash.widgets) { const w = dash.widgets[id]; const visible = !dash.state.minimized && dash.container.style.display !== 'none' && (dash.layout.mode !== 'pages' || active.has(id)); w.card.style.display = visible ? '' : 'none'; } }

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

    _drawStage(widget) {
      const c = widget.dom.canvas, ctx = widget.dom.ctx; if (!c || !ctx) return; const src = Scratch?.vm?.runtime?.renderer?.canvas; if (!src) return;
      const r = c.getBoundingClientRect(); const w = Math.max(2, Math.floor(r.width * devicePixelRatio)); const h = Math.max(2, Math.floor(r.height * devicePixelRatio)); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      ctx.clearRect(0, 0, w, h); try { ctx.drawImage(src, 0, 0, w, h); } catch {}
    }

    _stageLoop() {
      if (this._disposed) return;
      for (const id in this.dashboards) {
        const d = this.dashboards[id];
        if (!d.container || d.container.style.display === 'none') continue;
        for (const wid in d.widgets) {
          const w = d.widgets[wid];
          if (w.type === 'stage' && w.dom.canvas) this._drawStage(w);
          if (w._needsChartRedraw && w.dom.canvas) { w._needsChartRedraw = false; this._drawChart(w); }
          if (w._needsTableRedraw && w.dom.tableWrap) { w._needsTableRedraw = false; this._drawTable(w); }
          if (w._needsMiniRedraw && w.dom.canvas) { w._needsMiniRedraw = false; this._drawMinimap(w); }
        }
      }
      this._raf = requestAnimationFrame(this._stageLoop);
    }

    createDashboard(args) { const id = String(args.DASH_ID); const title = String(args.TITLE || id); if (this.dashboards[id]) { this.setDashboardTitle({ DASH_ID: id, TITLE: title }); this.showDashboard({ DASH_ID: id }); return; } const d = this._makeDashboard(id, title); this.dashboards[id] = d; this._createHostAndWindow(d); this._renderDashboardFromModel(d); this.showDashboard({ DASH_ID: id }); this._savePersisted(); }
    createFromTemplate(args) { const tpl = TEMPLATES[String(args.TEMPLATE)] || TEMPLATES.blank; this.createDashboard({ DASH_ID: String(args.DASH_ID), TITLE: tpl.title }); const d = this._getDash(args.DASH_ID); d.layout = clone(tpl.layout); tpl.widgets.forEach(w => { this.addWidget({ DASH_ID: d.id, WIDGET_ID: w.id, TYPE: w.type, TITLE: w.title || w.id, VALUE: JSON.stringify(w.value ?? '') }); this.setWidgetPosition({ DASH_ID: d.id, WIDGET_ID: w.id, X: w.pos?.x || 0, Y: w.pos?.y || 0, W: w.pos?.w || 3, H: w.pos?.h || 2 }); }); this._savePersisted(); }
    _renderDashboardFromModel(d) { d.grid.innerHTML = ''; for (const wid in d.widgets) d.grid.appendChild(d.widgets[wid].card); this._refreshWidgetVisibility(d); }
    showDashboard(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.container.style.display = 'flex'; d.container.style.animation = 'dp-pop .2s ease-out'; d.host.style.zIndex = this.globalZ++; d.window.zIndex = this.globalZ; this._savePersisted(); }
    hideDashboard(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.container.style.display = 'none'; this._savePersisted(); }
    destroyDashboard(args) { const d = this._getDash(args.DASH_ID); if (!d) return; if (d.cleanupDrag) d.cleanupDrag(); if (d.cleanupResize) d.cleanupResize(); for (const wid in d.widgets) { const w = d.widgets[wid]; if (w._cleanupResize) w._cleanupResize(); } if (d.host?.parentNode) d.host.parentNode.removeChild(d.host); delete this.dashboards[d.id]; this._savePersisted(); }
    setDashboardTitle(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.title = String(args.TITLE); if (d.header) d.header.querySelector('.dp-title').textContent = d.title; this._savePersisted(); }
    setDashboardLayout(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.layout.mode = String(args.MODE); d.layout.columns = clamp(num(args.COLS, 12), 1, 48); d.layout.rowHeight = clamp(num(args.ROW, 48), 16, 200); d.layout.snap = !!args.SNAP; if (d.grid) { if (d.layout.mode === 'freeform') { d.grid.style.position = 'relative'; d.grid.style.display = 'block'; } else { d.grid.style.position = ''; d.grid.style.display = 'grid'; d.grid.style.gridTemplateColumns = `repeat(${d.layout.columns}, minmax(0, 1fr))`; d.grid.style.gap = `${d.layout.gap}px`; } } this._markDirty(d); this._savePersisted(); }
    setDashboardTheme(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.theme = clone(this.themes[String(args.THEME)] || this.themes.dark); this._applyTheme(d); this._savePersisted(); }
    setDashboardColor(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.theme.vars['--dp-bg'] = String(args.BG); d.theme.vars['--dp-fg'] = String(args.FG); d.theme.vars['--dp-accent'] = String(args.ACC); this._applyTheme(d); this._savePersisted(); }
    setDashboardWindow(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.window.x = num(args.X, d.window.x); d.window.y = num(args.Y, d.window.y); d.window.width = num(args.W, d.window.width); d.window.height = num(args.H, d.window.height); d.container.style.left = `${d.window.x}px`; d.container.style.top = `${d.window.y}px`; d.container.style.width = `${d.window.width}px`; d.container.style.height = `${d.window.height}px`; this._savePersisted(); }
    setWindowMode(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const mode = String(args.MODE); d.window.mode = mode; if (mode === 'fullscreen') { if (!d.state.prevWindow) d.state.prevWindow = clone(d.window); Object.assign(d.container.style, { left: '0px', top: '0px', width: '100vw', height: '100vh', borderRadius: '0px' }); d.container.style.display = 'flex'; } else if (mode === 'snapped-left') { Object.assign(d.container.style, { left: '0px', top: '0px', width: '50vw', height: '100vh', borderRadius: '0px' }); d.container.style.display = 'flex'; } else if (mode === 'snapped-right') { Object.assign(d.container.style, { left: '50vw', top: '0px', width: '50vw', height: '100vh', borderRadius: '0px' }); d.container.style.display = 'flex'; } else if (mode === 'snapped-top') { Object.assign(d.container.style, { left: '0px', top: '0px', width: '100vw', height: '50vh', borderRadius: '0px' }); d.container.style.display = 'flex'; } else if (mode === 'snapped-bottom') { Object.assign(d.container.style, { left: '0px', top: '50vh', width: '100vw', height: '50vh', borderRadius: '0px' }); d.container.style.display = 'flex'; } else if (mode === 'modal') { d.state.modal = true; d.container.style.display = 'flex'; } else if (d.state.prevWindow) { Object.assign(d.container.style, { left: `${d.state.prevWindow.x}px`, top: `${d.state.prevWindow.y}px`, width: `${d.state.prevWindow.width}px`, height: `${d.state.prevWindow.height}px`, borderRadius: '12px' }); d.state.prevWindow = null; } this._savePersisted(); }

    addWidget(args) {
      const d = this._getDash(args.DASH_ID, args.DASH_ID); if (!d) return; const id = String(args.WIDGET_ID); if (d.widgets[id]) this.removeWidget({ DASH_ID: d.id, WIDGET_ID: id });
      const t = String(args.TYPE), title = String(args.TITLE || id), raw = this._sanitizeValue(t, args.VALUE);
      const w = { id, type: t, title, value: raw, state: {}, style: {}, sandbox: d.security.defaultMode || 'safe', position: { x: 0, y: 0, w: 3, h: 2, mode: d.layout.mode === 'freeform' ? 'freeform' : 'grid' }, dom: {}, card: null, content: null, resizeHandle: null };
      d.widgets[id] = w; this._createWidgetDom(d, w, title, raw); d.grid.appendChild(w.card); d.pages[0].widgets.push(id); this._savePersisted(); this._markDirty(d);
    }
    _sanitizeValue(type, value) { if (['table.grid', 'chart.line', 'chart.bar', 'chart.multi', 'viewer.minimap'].includes(type)) { const p = jparse(String(value), null); if (p !== null) return p; } return value; }
    updateWidget(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; this._setWidgetValue(d, w, this._sanitizeValue(w.type, args.VALUE), 'code'); this._savePersisted(); }
    appendLog(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w || w.type !== 'log') return; const lines = Array.isArray(w.value?.lines) ? w.value.lines.slice() : []; lines.push(String(args.VALUE)); this._setWidgetValue(d, w, { lines }, 'code'); this._savePersisted(); }
    setWidgetPosition(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; const before = clone(w.position); w.position = w.position || {}; w.position.x = num(args.X, 0); w.position.y = num(args.Y, 0); w.position.w = num(args.W, 3); w.position.h = num(args.H, 2); w.position.mode = d.layout.mode === 'freeform' ? 'freeform' : 'grid'; if (w.position.mode === 'freeform') { w.card.style.position = 'absolute'; w.card.style.left = `${w.position.x}px`; w.card.style.top = `${w.position.y}px`; w.card.style.width = `${w.position.w}px`; w.card.style.height = `${w.position.h}px`; } else { w.card.style.position = ''; w.card.style.gridColumn = `span ${clamp(w.position.w, 1, 48)}`; w.card.style.gridRow = `span ${clamp(w.position.h, 1, 48)}`; } this._record({ op: 'widget.move', dashId: d.id, widgetId: w.id, before, after: clone(w.position) }); this._emit('widget.dragged', d, { widgetId: w.id, value: w.value, position: clone(w.position) }); this._savePersisted(); }
    setWidgetStyle(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; w.style[String(args.KEY)] = String(args.VALUE); this._applyWidgetStyle(w); this._savePersisted(); }
    setWidgetShape(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; const s = String(args.SHAPE); w.card.style.borderRadius = s === 'sharp' ? '0px' : s === 'circle' ? '50%' : s === 'pill' ? '9999px' : '12px'; }
    setWidgetTitle(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; w.title = String(args.TITLE); w.label.textContent = w.title; this._savePersisted(); }
    setWidgetSandbox(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return; w.sandbox = String(args.MODE); if (w.type === 'iframe' && w.dom.iframe) { if (w.sandbox === 'safe') w.dom.iframe.setAttribute('sandbox', 'allow-same-origin'); else if (w.sandbox === 'restricted') w.dom.iframe.setAttribute('sandbox', 'allow-same-origin allow-forms'); else w.dom.iframe.removeAttribute('sandbox'); } }
    removeWidget(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const id = String(args.WIDGET_ID); const w = d.widgets[id]; if (!w) return; if (w._cleanupResize) w._cleanupResize(); if (w.card?.parentNode) w.card.parentNode.removeChild(w.card); delete d.widgets[id]; d.pages.forEach(p => p.widgets = p.widgets.filter(x => x !== id)); d.bindings = d.bindings.filter(b => b.widgetId !== id); d.links = d.links.filter(l => l.from !== id && l.to !== id); this._savePersisted(); }
    bindWidgetToVar(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const id = String(args.WIDGET_ID), dir = String(args.DIR), name = String(args.VAR); d.bindings = d.bindings.filter(b => !(b.widgetId === id && b.varName === name)); d.bindings.push({ widgetId: id, varName: name, dir, sourceGuard: '' }); const w = d.widgets[id]; if (!w) return; if (dir === 'input' || dir === 'both') { const v = this._readScratchVar(name); if (v !== '') this._setWidgetValue(d, w, v, 'scratch'); } else { this._writeScratchVar(name, w.value); } this._savePersisted(); }
    linkWidgets(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.links = d.links.filter(l => !(l.from === String(args.FROM) && l.to === String(args.TO))); d.links.push({ from: String(args.FROM), to: String(args.TO) }); this._savePersisted(); }
    setDashboardVar(args) { const d = this._getDash(args.DASH_ID); if (!d) return; this._setDashboardVarInternal(d, String(args.NAME), args.VALUE, 'code'); this._savePersisted(); }
    changeDashboardVar(args) { const d = this._getDash(args.DASH_ID); if (!d) return; const n = String(args.NAME); this._setDashboardVarInternal(d, n, num(d.variables[n], 0) + num(args.VALUE, 0), 'code'); this._savePersisted(); }
    getDashboardVar(args) { const d = this._getDash(args.DASH_ID); if (!d) return ''; const v = d.variables[String(args.NAME)]; return v === undefined ? '' : v; }
    getWidgetValue(args) { const d = this._getDash(args.DASH_ID); if (!d) return ''; const w = d.widgets[String(args.WIDGET_ID)]; if (!w) return ''; return isObj(w.value) || Array.isArray(w.value) ? JSON.stringify(w.value) : (w.value ?? ''); }
    saveDashboard(args) { this._savePersisted(); }
    loadDashboard(args) { const b = jparse(localStorage.getItem(STORAGE_KEY), null); if (!b?.dashboards?.[String(args.DASH_ID)]) return; const id = String(args.DASH_ID); if (this.dashboards[id]) this.destroyDashboard({ DASH_ID: id }); const d = this._deserializeDashboard(b.dashboards[id]); this.dashboards[id] = d; this._createHostAndWindow(d); this._renderDashboardFromModel(d); for (const wid in d.widgets) { const w = d.widgets[wid]; this._createWidgetDom(d, w, w.title, w.value); d.grid.appendChild(w.card); } this.showDashboard({ DASH_ID: id }); this._savePersisted(); }
    exportDashboard(args) { const d = this._getDash(args.DASH_ID); return JSON.stringify({ schemaVersion: '2.0.0', dashboard: d ? this._serializeDashboard(d) : null }); }
    importDashboard(args) { const parsed = jparse(String(args.JSON), null); if (!parsed) return; const obj = parsed.dashboard || parsed; const id = String(args.DASH_ID || obj.id || 'main'); if (this.dashboards[id]) this.destroyDashboard({ DASH_ID: id }); const d = this._deserializeDashboard({ ...obj, id }); this.dashboards[id] = d; this._createHostAndWindow(d); this._renderDashboardFromModel(d); for (const wid in d.widgets) { const w = d.widgets[wid]; this._createWidgetDom(d, w, w.title, w.value); d.grid.appendChild(w.card); } this.showDashboard({ DASH_ID: id }); this._savePersisted(); }
    undo() { const c = this.undoStack.pop(); if (!c) return; this.redoStack.push(c); if (c.op === 'widget.value') { const d = this._getDash(c.dashId); const w = d?.widgets?.[c.widgetId]; if (d && w) this._setWidgetValue(d, w, c.before, 'undo'); } else if (c.op === 'widget.move') { const d = this._getDash(c.dashId); const w = d?.widgets?.[c.widgetId]; if (d && w) this.setWidgetPosition({ DASH_ID: d.id, WIDGET_ID: w.id, X: c.before.x, Y: c.before.y, W: c.before.w, H: c.before.h }); } else if (c.op === 'dashboard.theme') { const d = this._getDash(c.dashId); if (d) { d.theme = c.before; this._applyTheme(d); } } this._savePersisted(); }
    redo() { const c = this.redoStack.pop(); if (!c) return; this.undoStack.push(c); if (c.op === 'widget.value') { const d = this._getDash(c.dashId); const w = d?.widgets?.[c.widgetId]; if (d && w) this._setWidgetValue(d, w, c.after, 'redo'); } else if (c.op === 'widget.move') { const d = this._getDash(c.dashId); const w = d?.widgets?.[c.widgetId]; if (d && w) this.setWidgetPosition({ DASH_ID: d.id, WIDGET_ID: w.id, X: c.after.x, Y: c.after.y, W: c.after.w, H: c.after.h }); } else if (c.op === 'dashboard.theme') { const d = this._getDash(c.dashId); if (d) { d.theme = c.after; this._applyTheme(d); } } this._savePersisted(); }
    setDebugMode(args) { const d = this._getDash(args.DASH_ID); if (!d) return; d.state.debug = !!args.ON; for (const wid in d.widgets) { const w = d.widgets[wid]; w.card.classList.toggle('dp-debug', d.state.debug); } }
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
        const visible = !dash.state.minimized && dash.container.style.display !== 'none' && (dash.layout.mode !== 'pages' || active.has(id));
        w.card.style.display = visible ? '' : 'none';
      }
    }

    destroy() {
      this._disposed = true;
      cancelAnimationFrame(this._raf);
      for (const id in this.dashboards) this.destroyDashboard({ DASH_ID: id });
    }
  }

  if (window.dasheyProV2Instance && typeof window.dasheyProV2Instance.destroy === 'function') {
    try { window.dasheyProV2Instance.destroy(); } catch {}
  }

  Scratch.extensions.register((instance => {
    window.dasheyProV2Instance = instance;
    return instance;
  })(new DasheyProV2()));

})(Scratch);
