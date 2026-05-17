// Name         :  Dashey Pro
// ID           :  dashey
// Description  :  Advanced multi-window dashboard builder with live stage, HTML embeds, and interactive grid widgets.
// License      :  GPL-3.0-only

(function (Scratch) {
  'use strict';

  class Dashey {
    constructor() {
      this._disposed = false;
      this.dashboards = Object.create(null);
      this.globalZIndex = 500;
      
      // Bind RAF loop for Stage widgets
      this._renderLoop = this._renderLoop.bind(this);
      this.rafId = requestAnimationFrame(this._renderLoop);

      this._injectGlobalStyles();
    }

    getInfo() {
      return {
        id: 'dashey',
        name: 'Dashey Pro',
        color1: '#00d2ff',
        color2: '#00a8cc',
        color3: '#007f99',
        blocks: [
          // --- DASHBOARD MANAGEMENT ---
          {
            opcode: 'createDash',
            blockType: Scratch.BlockType.COMMAND,
            text: 'initialize dash [DASH_ID] title [TITLE]',
            arguments: {
              DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' },
              TITLE: { type: Scratch.ArgumentType.STRING, defaultValue: 'My Dashboard' }
            }
          },
          {
            opcode: 'doAction',
            blockType: Scratch.BlockType.COMMAND,
            text: '[ACTION] dash [DASH_ID]',
            arguments: {
              ACTION: { type: Scratch.ArgumentType.STRING, menu: 'ACTION_MENU' },
              DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }
            }
          },
          {
            opcode: 'setColors',
            blockType: Scratch.BlockType.COMMAND,
            text: 'on dash [DASH_ID] set bg: [BG] text: [FG] accent: [ACC]',
            arguments: {
              DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' },
              BG: { type: Scratch.ArgumentType.COLOR, defaultValue: '#14161a' },
              FG: { type: Scratch.ArgumentType.COLOR, defaultValue: '#ffffff' },
              ACC: { type: Scratch.ArgumentType.COLOR, defaultValue: '#00d2ff' }
            }
          },
          '---',
          // --- WIDGET MANAGEMENT ---
          {
            opcode: 'addWidget',
            blockType: Scratch.BlockType.COMMAND,
            text: 'on dash [DASH_ID] add [TYPE] widget [WIDGET_ID] label: [LABEL] data: [VALUE]',
            arguments: {
              DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' },
              TYPE: { type: Scratch.ArgumentType.STRING, menu: 'WIDGET_TYPES' },
              WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' },
              LABEL: { type: Scratch.ArgumentType.STRING, defaultValue: 'Metric' },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello' }
            }
          },
          {
            opcode: 'updateWidget',
            blockType: Scratch.BlockType.COMMAND,
            text: 'on dash [DASH_ID] update widget [WIDGET_ID] to [VALUE]',
            arguments: {
              DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' },
              WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'New Data' }
            }
          },
          {
            opcode: 'appendLogWidget',
            blockType: Scratch.BlockType.COMMAND,
            text: 'on dash [DASH_ID] append [VALUE] to log widget [WIDGET_ID]',
            arguments: {
              DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' },
              WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: '> Event occurred' }
            }
          },
          '---',
          // --- LAYOUT & STYLING ---
          {
            opcode: 'setWidgetLayout',
            blockType: Scratch.BlockType.COMMAND,
            text: 'on dash [DASH_ID] set widget [WIDGET_ID] size [SIZE] and order [ORDER]',
            arguments: {
              DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' },
              WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' },
              SIZE: { type: Scratch.ArgumentType.STRING, menu: 'SIZE_MENU' },
              ORDER: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            }
          },
          {
            opcode: 'setWidgetShape',
            blockType: Scratch.BlockType.COMMAND,
            text: 'on dash [DASH_ID] set widget [WIDGET_ID] shape [SHAPE]',
            arguments: {
              DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' },
              WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' },
              SHAPE: { type: Scratch.ArgumentType.STRING, menu: 'SHAPE_MENU' }
            }
          },
          {
            opcode: 'removeWidget',
            blockType: Scratch.BlockType.COMMAND,
            text: 'on dash [DASH_ID] remove widget [WIDGET_ID]',
            arguments: {
              DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' },
              WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' }
            }
          },
          '---',
          // --- EVENTS ---
          {
            opcode: 'whenWidgetClicked',
            blockType: Scratch.BlockType.HAT,
            text: 'when widget [WIDGET_ID] clicked on dash [DASH_ID]',
            isEdgeActivated: false,
            arguments: {
              WIDGET_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'w1' },
              DASH_ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'main' }
            }
          }
        ],
        menus: {
          ACTION_MENU: {
            acceptReporters: true,
            items: ['show', 'hide', 'maximize', 'minimize', 'restore', 'destroy']
          },
          WIDGET_TYPES: {
            acceptReporters: true,
            items: ['text', 'progress bar', 'ring chart', 'status light', 'image', 'stage', 'audio', 'iframe', 'html', 'log']
          },
          SIZE_MENU: {
            acceptReporters: true,
            items: ['1x1', '2x1 (wide)', '1x2 (tall)', '2x2 (large)', 'full width']
          },
          SHAPE_MENU: {
            acceptReporters: true,
            items: ['rounded', 'sharp', 'circle', 'pill']
          }
        }
      };
    }

    _injectGlobalStyles() {
      if (document.getElementById('dashey-global-styles')) return;
      const style = document.createElement('style');
      style.id = 'dashey-global-styles';
      style.textContent = `
        @keyframes tw-dash-pop { 0% { opacity: 0; transform: scale(0.97) translateY(5px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        .tw-dash-scroll::-webkit-scrollbar { width: 8px; }
        .tw-dash-scroll::-webkit-scrollbar-track { background: transparent; }
        .tw-dash-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .tw-dash-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
        .dashey-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          grid-auto-flow: dense;
          gap: 16px;
        }
        .widget-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
          cursor: pointer;
          overflow: hidden;
          position: relative;
        }
        .widget-card:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        }
        .widget-card:active { transform: translateY(0); }
        
        .dash-label {
          font-size: 11px; color: #8b949e; text-transform: uppercase;
          font-weight: 700; letter-spacing: 0.8px; margin-bottom: 8px;
          z-index: 2; pointer-events: none; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        
        .dash-content-container { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; z-index: 1; }
        .widget-card.center-content .dash-content-container { align-items: center; }
        
        /* Specific Widget Styles */
        .dash-text-value { font-size: 22px; font-weight: 700; color: var(--dashey-accent); word-break: break-word; }
        .dash-log-pre { margin: 0; font-family: monospace; font-size: 11px; color: #a1a8b5; overflow-y: auto; max-height: 100%; white-space: pre-wrap; word-break: break-all; }
        
        .dash-bar-container { width: 100%; }
        .dash-bar-bg { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
        .dash-bar-fill { height: 100%; background: var(--dashey-accent); border-radius: 4px; transition: width 0.3s ease; }
        .dash-bar-footer { text-align: right; font-size: 11px; font-weight: 600; color: #fff; }

        .dash-ring-container { position: relative; width: 60px; height: 60px; margin: 0 auto; }
        .dash-ring-svg { transform: rotate(-90deg); overflow: visible; }
        .dash-ring-circle-bg { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 6; }
        .dash-ring-circle-fill { fill: none; stroke: var(--dashey-accent); stroke-width: 6; stroke-linecap: round; transition: stroke-dashoffset 0.3s ease; }
        .dash-ring-text { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; }
        
        .dash-status-light { width: 24px; height: 24px; border-radius: 50%; box-shadow: 0 0 10px currentColor; margin: 0 auto; transition: color 0.3s; }
        
        .dash-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; }
        .dash-iframe { width: 100%; height: 100%; border: none; border-radius: 4px; background: #fff; }
        .dash-stage-canvas { width: 100%; height: 100%; object-fit: contain; border-radius: 4px; background: #000; }
        .dash-audio { width: 100%; height: 30px; }
      `;
      document.head.appendChild(style);
    }

    // --- DASHBOARD CORE ---

    _getDash(id, autoCreateTitle = null) {
      if (!this.dashboards[id] && autoCreateTitle !== null) {
        this.createDash({ DASH_ID: id, TITLE: autoCreateTitle });
      }
      return this.dashboards[id];
    }

    createDash(args) {
      const id = String(args.DASH_ID);
      const title = String(args.TITLE);
      if (this.dashboards[id]) {
        this.dashboards[id].titleSpan.innerText = title;
        return;
      }

      const dash = {
        id: id,
        widgets: Object.create(null),
        config: {
          width: '600px', height: '400px',
          opacity: '0.90', accentColor: '#00d2ff',
          background: '#14161a', foreground: '#ffffff'
        },
        state: { isMinimized: false, isMaximized: false, savedStyles: {} }
      };

      // Create Host
      dash.host = document.createElement('div');
      dash.host.id = `tw-dashey-host-${id}`;
      Object.assign(dash.host.style, { all: 'initial', position: 'fixed', zIndex: this.globalZIndex++ });
      document.body.appendChild(dash.host);

      dash.shadow = dash.host.attachShadow({ mode: 'open' });

      // Shadow Styles
      const shadowStyle = document.createElement('style');
      shadowStyle.textContent = `@import url("data:text/css;base64,"); :host { all: initial; }`; // Clear scope
      dash.shadow.appendChild(shadowStyle);

      // Copy global styles into shadow DOM
      const globalStyles = document.getElementById('dashey-global-styles');
      if (globalStyles) {
        const shadowStyleCopy = document.createElement('style');
        shadowStyleCopy.textContent = globalStyles.textContent;
        dash.shadow.appendChild(shadowStyleCopy);
      }

      // Container
      dash.container = document.createElement('div');
      dash.container.className = 'tw-dashey-container';
      Object.assign(dash.container.style, {
        position: 'fixed', top: `${10 + (Object.keys(this.dashboards).length * 2)}%`, left: `${10 + (Object.keys(this.dashboards).length * 2)}%`,
        width: dash.config.width, height: dash.config.height,
        backgroundColor: `rgba(20, 22, 26, ${dash.config.opacity})`,
        backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)',
        color: dash.config.foreground, fontFamily: "'Inter', 'Segoe UI', sans-serif",
        display: 'none', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
        borderRadius: '12px', overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.3s, top 0.3s, left 0.3s'
      });
      dash.container.style.setProperty('--dashey-accent', dash.config.accentColor);

      // Focus Management (Bring to front)
      dash.container.addEventListener('mousedown', () => {
        dash.host.style.zIndex = this.globalZIndex++;
      });

      // Header
      dash.header = document.createElement('div');
      Object.assign(dash.header.style, {
        backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '10px 14px', fontSize: '13px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        userSelect: 'none', cursor: 'grab', borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      });

      const controlsDiv = document.createElement('div');
      Object.assign(controlsDiv.style, { display: 'flex', gap: '8px' });
      const createBtn = (c, hc, action) => {
        const d = document.createElement('div');
        Object.assign(d.style, { width: '12px', height: '12px', borderRadius: '50%', background: c, cursor: 'pointer', transition: '0.2s' });
        d.onmouseenter = () => { d.style.background = hc; d.style.transform = 'scale(1.15)'; };
        d.onmouseleave = () => { d.style.background = c; d.style.transform = 'scale(1)'; };
        d.onclick = action;
        return d;
      };
      controlsDiv.appendChild(createBtn('#ff5f56', '#ff7a73', () => this.doAction({ ACTION: 'hide', DASH_ID: id })));
      controlsDiv.appendChild(createBtn('#ffbd2e', '#ffcf5c', () => this.doAction({ ACTION: 'minimize', DASH_ID: id })));
      controlsDiv.appendChild(createBtn('#27c93f', '#4ddb63', () => this.doAction({ ACTION: 'maximize', DASH_ID: id })));

      dash.titleSpan = document.createElement('span');
      dash.titleSpan.innerText = title;
      Object.assign(dash.titleSpan.style, { fontWeight: '600', color: '#e6edf3', position: 'absolute', left: '50%', transform: 'translateX(-50%)' });

      dash.header.appendChild(controlsDiv);
      dash.header.appendChild(dash.titleSpan);
      dash.header.appendChild(document.createElement('div')); // spacer
      dash.container.appendChild(dash.header);

      this._makeDraggable(dash);

      // Grid Area
      dash.scrollArea = document.createElement('div');
      dash.scrollArea.className = 'tw-dash-scroll';
      Object.assign(dash.scrollArea.style, { flexGrow: '1', overflowY: 'auto', overflowX: 'hidden', padding: '16px', transition: 'opacity 0.2s' });
      
      dash.grid = document.createElement('div');
      dash.grid.className = 'dashey-grid';
      dash.scrollArea.appendChild(dash.grid);
      dash.container.appendChild(dash.scrollArea);

      dash.shadow.appendChild(dash.container);
      this.dashboards[id] = dash;
    }

    _makeDraggable(dash) {
      dash.drag = { isDragging: false, startX: 0, startY: 0, initialLeft: 0, initialTop: 0 };
      
      const onDown = e => {
        if (dash.state.isMaximized || (e.target !== dash.header && e.target !== dash.titleSpan)) return;
        dash.drag.isDragging = true;
        dash.drag.startX = e.clientX; dash.drag.startY = e.clientY;
        dash.container.style.transition = 'none';
        const rect = dash.container.getBoundingClientRect();
        dash.drag.initialLeft = rect.left; dash.drag.initialTop = rect.top;
        dash.header.style.cursor = 'grabbing';
      };
      
      const onMove = e => {
        if (!dash.drag.isDragging) return;
        dash.container.style.left = `${dash.drag.initialLeft + (e.clientX - dash.drag.startX)}px`;
        dash.container.style.top = `${dash.drag.initialTop + (e.clientY - dash.drag.startY)}px`;
      };
      
      const onUp = () => {
        if (!dash.drag.isDragging) return;
        dash.drag.isDragging = false;
        dash.header.style.cursor = 'grab';
        dash.container.style.transition = 'width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.3s, top 0.3s, left 0.3s';
      };

      dash.header.addEventListener('mousedown', onDown);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      dash.cleanupDrag = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
    }

    doAction(args) {
      const dash = this._getDash(args.DASH_ID);
      if (!dash) return;
      const act = String(args.ACTION).toLowerCase();

      if (act === 'show') {
        dash.container.style.display = 'flex';
        dash.container.style.animation = 'tw-dash-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
        dash.host.style.zIndex = this.globalZIndex++;
      } else if (act === 'hide') {
        dash.container.style.display = 'none';
      } else if (act === 'minimize') {
        if (dash.state.isMaximized) return;
        dash.state.isMinimized = !dash.state.isMinimized;
        if (dash.state.isMinimized) {
          dash.scrollArea.style.opacity = '0';
          setTimeout(() => dash.scrollArea.style.display = 'none', 200);
          dash.container.style.height = dash.header.offsetHeight + 'px';
        } else {
          dash.scrollArea.style.display = 'block';
          setTimeout(() => { dash.scrollArea.style.opacity = '1'; dash.container.style.height = dash.config.height; }, 10);
        }
      } else if (act === 'maximize') {
        if (dash.state.isMinimized) return;
        dash.state.isMaximized = !dash.state.isMaximized;
        if (dash.state.isMaximized) {
          dash.state.savedStyles = { top: dash.container.style.top, left: dash.container.style.left, width: dash.container.style.width, height: dash.container.style.height, borderRadius: dash.container.style.borderRadius };
          Object.assign(dash.container.style, { top: '0', left: '0', width: '100vw', height: '100vh', borderRadius: '0px' });
          dash.header.style.cursor = 'default';
        } else {
          Object.assign(dash.container.style, dash.state.savedStyles);
          dash.header.style.cursor = 'grab';
        }
      } else if (act === 'restore') {
        if (dash.state.isMaximized) this.doAction({ ACTION: 'maximize', DASH_ID: args.DASH_ID });
        if (dash.state.isMinimized) this.doAction({ ACTION: 'minimize', DASH_ID: args.DASH_ID });
      } else if (act === 'destroy') {
        if (dash.cleanupDrag) dash.cleanupDrag();
        if (dash.host && dash.host.parentNode) dash.host.parentNode.removeChild(dash.host);
        delete this.dashboards[args.DASH_ID];
      }
    }

    setColors(args) {
      const dash = this._getDash(args.DASH_ID, args.DASH_ID);
      dash.config.background = args.BG;
      dash.config.foreground = args.FG;
      dash.config.accentColor = args.ACC;

      let rgbaBg = args.BG;
      if (typeof args.BG === 'string' && args.BG.startsWith('#')) {
        const r = parseInt(args.BG.slice(1, 3), 16) || 20;
        const g = parseInt(args.BG.slice(3, 5), 16) || 22;
        const b = parseInt(args.BG.slice(5, 7), 16) || 26;
        rgbaBg = `rgba(${r}, ${g}, ${b}, ${dash.config.opacity})`;
      }
      
      dash.container.style.backgroundColor = rgbaBg;
      dash.container.style.color = args.FG;
      dash.container.style.setProperty('--dashey-accent', args.ACC);
    }

    // --- WIDGET ENGINE ---

    addWidget(args) {
      const dash = this._getDash(args.DASH_ID, args.DASH_ID);
      const wId = String(args.WIDGET_ID);
      const type = String(args.TYPE).toLowerCase();
      const label = String(args.LABEL);
      const value = String(args.VALUE);

      if (dash.widgets[wId]) this.removeWidget({ DASH_ID: args.DASH_ID, WIDGET_ID: wId });

      const card = document.createElement('div');
      card.className = 'widget-card';
      card.id = `widget-${wId}`;
      card.onclick = () => Scratch.vm.runtime.startHats('dashey_whenWidgetClicked', { WIDGET_ID: wId, DASH_ID: dash.id });

      const labelDiv = document.createElement('div');
      labelDiv.className = 'dash-label';
      labelDiv.innerText = label;
      if (label) card.appendChild(labelDiv);

      const content = document.createElement('div');
      content.className = 'dash-content-container';
      card.appendChild(content);

      const widgetData = { type, card, content, domNodes: {} };
      dash.widgets[wId] = widgetData;
      dash.grid.appendChild(card);

      this._buildWidgetContent(widgetData, value);
    }

    _buildWidgetContent(w, value) {
      const c = w.content;
      c.innerHTML = '';
      w.domNodes = {};

      let num = parseFloat(value) || 0;
      if (w.type === 'progress bar' || w.type === 'ring chart') num = Math.max(0, Math.min(100, num));

      if (w.type === 'text') {
        const t = document.createElement('div');
        t.className = 'dash-text-value';
        t.innerText = value;
        w.domNodes.text = t;
        c.appendChild(t);
      } 
      else if (w.type === 'progress bar') {
        c.innerHTML = `
          <div class="dash-bar-container">
            <div class="dash-bar-bg"><div class="dash-bar-fill" style="width: ${num}%"></div></div>
            <div class="dash-bar-footer">${num}%</div>
          </div>`;
        w.domNodes.fill = c.querySelector('.dash-bar-fill');
        w.domNodes.text = c.querySelector('.dash-bar-footer');
      } 
      else if (w.type === 'ring chart') {
        w.card.classList.add('center-content');
        const r = 26, circ = 2 * Math.PI * r, off = circ - (num / 100) * circ;
        c.innerHTML = `
          <div class="dash-ring-container">
            <svg class="dash-ring-svg" width="60" height="60" viewBox="0 0 60 60">
              <circle class="dash-ring-circle-bg" cx="30" cy="30" r="${r}"></circle>
              <circle class="dash-ring-circle-fill" cx="30" cy="30" r="${r}" stroke-dasharray="${circ}" stroke-dashoffset="${off}"></circle>
            </svg>
            <div class="dash-ring-text">${num}%</div>
          </div>`;
        w.domNodes.ring = c.querySelector('.dash-ring-circle-fill');
        w.domNodes.text = c.querySelector('.dash-ring-text');
      }
      else if (w.type === 'status light') {
        w.card.classList.add('center-content');
        const l = document.createElement('div');
        l.className = 'dash-status-light';
        l.style.color = value;
        l.style.backgroundColor = value;
        w.domNodes.light = l;
        c.appendChild(l);
      }
      else if (w.type === 'image') {
        const i = document.createElement('img');
        i.className = 'dash-img';
        i.src = value;
        w.domNodes.img = i;
        c.appendChild(i);
      }
      else if (w.type === 'iframe') {
        const i = document.createElement('iframe');
        i.className = 'dash-iframe';
        i.src = value;
        w.domNodes.iframe = i;
        c.appendChild(i);
      }
      else if (w.type === 'html') {
        const i = document.createElement('iframe');
        i.className = 'dash-iframe';
        i.srcdoc = value;
        w.domNodes.iframe = i;
        c.appendChild(i);
      }
      else if (w.type === 'audio') {
        const a = document.createElement('audio');
        a.className = 'dash-audio';
        a.controls = true;
        a.src = value;
        w.domNodes.audio = a;
        c.appendChild(a);
      }
      else if (w.type === 'log') {
        const p = document.createElement('pre');
        p.className = 'dash-log-pre';
        p.innerText = value + '\n';
        w.domNodes.log = p;
        c.appendChild(p);
      }
      else if (w.type === 'stage') {
        const cvs = document.createElement('canvas');
        cvs.className = 'dash-stage-canvas';
        w.domNodes.canvas = cvs;
        w.domNodes.ctx = cvs.getContext('2d');
        c.appendChild(cvs);
      }
    }

    updateWidget(args) {
      const dash = this._getDash(args.DASH_ID);
      if (!dash) return;
      const w = dash.widgets[args.WIDGET_ID];
      if (!w) return;
      const val = String(args.VALUE);

      let num = parseFloat(val) || 0;
      if (w.type === 'progress bar' || w.type === 'ring chart') num = Math.max(0, Math.min(100, num));

      if (w.type === 'text') w.domNodes.text.innerText = val;
      else if (w.type === 'progress bar') {
        w.domNodes.fill.style.width = `${num}%`;
        w.domNodes.text.innerText = `${num}%`;
      }
      else if (w.type === 'ring chart') {
        const r = 26, circ = 2 * Math.PI * r;
        w.domNodes.ring.style.strokeDashoffset = circ - (num / 100) * circ;
        w.domNodes.text.innerText = `${num}%`;
      }
      else if (w.type === 'status light') {
        w.domNodes.light.style.color = val;
        w.domNodes.light.style.backgroundColor = val;
      }
      else if (w.type === 'image') w.domNodes.img.src = val;
      else if (w.type === 'iframe') w.domNodes.iframe.src = val;
      else if (w.type === 'html') w.domNodes.iframe.srcdoc = val;
      else if (w.type === 'audio') w.domNodes.audio.src = val;
      else if (w.type === 'log') {
        w.domNodes.log.innerText = val + '\n';
        w.domNodes.log.scrollTop = w.domNodes.log.scrollHeight;
      }
    }

    appendLogWidget(args) {
      const dash = this._getDash(args.DASH_ID);
      if (!dash) return;
      const w = dash.widgets[args.WIDGET_ID];
      if (!w || w.type !== 'log') return;
      w.domNodes.log.innerText += String(args.VALUE) + '\n';
      w.domNodes.log.scrollTop = w.domNodes.log.scrollHeight;
    }

    setWidgetLayout(args) {
      const dash = this._getDash(args.DASH_ID);
      if (!dash) return;
      const w = dash.widgets[args.WIDGET_ID];
      if (!w) return;

      const size = String(args.SIZE);
      let col = 'span 1', row = 'span 1';
      
      if (size.includes('2x1')) { col = 'span 2'; row = 'span 1'; }
      else if (size.includes('1x2')) { col = 'span 1'; row = 'span 2'; }
      else if (size.includes('2x2')) { col = 'span 2'; row = 'span 2'; }
      else if (size.includes('full')) { col = '1 / -1'; row = 'span 1'; }

      w.card.style.gridColumn = col;
      w.card.style.gridRow = row;
      w.card.style.order = args.ORDER;
    }

    setWidgetShape(args) {
      const dash = this._getDash(args.DASH_ID);
      if (!dash) return;
      const w = dash.widgets[args.WIDGET_ID];
      if (!w) return;
      
      const shape = String(args.SHAPE).toLowerCase();
      if (shape === 'sharp') w.card.style.borderRadius = '0px';
      else if (shape === 'circle') w.card.style.borderRadius = '50%';
      else if (shape === 'pill') w.card.style.borderRadius = '9999px';
      else w.card.style.borderRadius = '12px'; // rounded
    }

    removeWidget(args) {
      const dash = this._getDash(args.DASH_ID);
      if (!dash) return;
      const w = dash.widgets[args.WIDGET_ID];
      if (w) {
        if (w.card.parentNode) w.card.parentNode.removeChild(w.card);
        delete dash.widgets[args.WIDGET_ID];
      }
    }

    // --- RENDER LOOP FOR STAGE WIDGETS ---
    _renderLoop() {
      if (this._disposed) return;
      if (Scratch && Scratch.vm && Scratch.vm.runtime && Scratch.vm.runtime.renderer) {
        const scratchCvs = Scratch.vm.runtime.renderer.canvas;
        if (scratchCvs) {
          for (const dashId in this.dashboards) {
            const dash = this.dashboards[dashId];
            if (dash.container.style.display === 'none') continue; // Skip hidden dashes
            for (const wId in dash.widgets) {
              const w = dash.widgets[wId];
              if (w.type === 'stage' && w.domNodes.canvas) {
                const cvs = w.domNodes.canvas;
                const ctx = w.domNodes.ctx;
                // Match resolution to display size to avoid stretched low-res
                if (cvs.width !== cvs.clientWidth || cvs.height !== cvs.clientHeight) {
                  cvs.width = cvs.clientWidth;
                  cvs.height = cvs.clientHeight;
                }
                if (cvs.width > 0 && cvs.height > 0) {
                  ctx.drawImage(scratchCvs, 0, 0, cvs.width, cvs.height);
                }
              }
            }
          }
        }
      }
      this.rafId = requestAnimationFrame(this._renderLoop);
    }

    destroy() {
      this._disposed = true;
      cancelAnimationFrame(this.rafId);
      for (const id in this.dashboards) {
        this.doAction({ ACTION: 'destroy', DASH_ID: id });
      }
    }
  }

  if (!Scratch?.extensions?.unsandboxed) {
    throw new Error('Dashey Pro must be run unsandboxed.');
  }

  if (window.dasheyProInstance && typeof window.dasheyProInstance.destroy === 'function') {
    try { window.dasheyProInstance.destroy(); } catch (e) {}
  }
  
  Scratch.extensions.register((instance => {
    window.dasheyProInstance = instance;
    return instance;
  })(new Dashey()));

})(Scratch);
