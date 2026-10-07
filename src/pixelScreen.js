import * as THREE from 'three';
import { PROJECTS } from './projects.js';

// Fuente bitmap 5x7
const G = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '11111 00100 00100 00100 00100 00100 11111',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 11001 10101 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 11011 10001',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  '.': '00000 00000 00000 00000 00000 00110 00110',
  '!': '00100 00100 00100 00100 00100 00000 00100',
  '>': '10000 01000 00100 00010 00100 01000 10000',
  '<': '00001 00010 00100 01000 00100 00010 00001',
  '_': '00000 00000 00000 00000 00000 00000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110',
  1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111',
  3: '11110 00001 00001 01110 00001 00001 11110',
  4: '00010 00110 01010 10010 11111 00010 00010',
  5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110',
  7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110',
  9: '01110 10001 10001 01111 00001 00010 01100',
  ',': '00000 00000 00000 00000 00110 00100 01000',
  ':': '00000 00110 00110 00000 00110 00110 00000',
  '+': '00000 00100 00100 11111 00100 00100 00000',
  '/': '00001 00010 00010 00100 01000 01000 10000',
};
const GLYPHS = Object.fromEntries(Object.entries(G).map(([k, v]) => [k, v.split(' ')]));

const W = 160, H = 120;          // resolución "8 bits" de la pantalla
const BG = '#0b3a45', FG = '#8ff7ff', ACCENT = '#ff6b3d';
const PERIOD = 9;                // cada cuántos segundos aparece "CLICK ON ME"
const TEXT_AT = 5.5;

export const MENU_ITEMS = [
  { key: 'proyectos', label: 'PROYECTOS' },
  { key: 'certificaciones', label: 'CERTIFICACIONES' },
  { key: 'sobre-mi', label: 'SOBRE MI' },
  { key: 'contacto', label: 'CONTACTO' },
];
const ITEM_Y0 = 40, ITEM_STEP = 17;
const itemRect = (i) => ({ x: 10, y: ITEM_Y0 + i * ITEM_STEP - 4, w: W - 20, h: 15 });
const BACK_RECT = { x: 10, y: H - 22, w: 62, h: 15 };
const OPEN_RECT = { x: 88, y: H - 22, w: 62, h: 15 };
const TAB_NAMES = ['INFO', 'STACK', 'ROL'];
const tabRect = (i) => ({ x: 10 + i * 48, y: 32, w: 44, h: 12 });
const WRAP = 23;

function wrap(text) {
  const lines = [];
  text.split('\n').forEach((para) => {
    let line = '';
    para.split(' ').forEach((word) => {
      if (line && (line + ' ' + word).length > WRAP) { lines.push(line); line = word; }
      else line = line ? line + ' ' + word : word;
    });
    lines.push(line);
  });
  return lines;
}

export function createPixelScreen() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;

  const state = { mode: 'face', hover: -1, page: null, project: null, tab: 0 };

  const textWidth = (str, scale) => str.length * 6 * scale - scale;
  function drawText(str, x, y, scale = 1, limit = Infinity) {
    let n = 0;
    for (const ch of str) {
      if (n++ >= limit) break;
      (GLYPHS[ch] || GLYPHS[' ']).forEach((row, ry) => {
        for (let rx = 0; rx < 5; rx++) {
          if (row[rx] === '1') ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
        }
      });
      x += 6 * scale;
    }
    return x;
  }
  const centered = (str, y, scale, limit) => drawText(str, Math.round((W - textWidth(str, scale)) / 2), y, scale, limit);

  // --- Expresiones ---
  const rect = (x, y, w, h) => ctx.fillRect(x, y, w, h);
  const sprite = (rows, x, y, k) => rows.forEach((row, ry) => [...row].forEach((b, rx) => {
    if (b === '1') rect(x + rx * k, y + ry * k, k, k);
  }));
  const EYE_L = 44, EYE_R = 116, EYE_Y = 42;
  const bars = (blink, w = 16, h = 20) => {
    const eh = Math.max(2, h * blink);
    [EYE_L, EYE_R].forEach((cx) => rect(cx - w / 2, EYE_Y - eh / 2, w, eh));
  };
  const caret = (cx) => [[-4, 0], [0, 0], [-8, 4], [4, 4], [-12, 8], [8, 8]]
    .forEach(([dx, dy]) => rect(cx + dx, EYE_Y - 4 + dy, 4, 4));
  const smile = () => {
    rect(56, 84, 48, 4);
    rect(52, 80, 4, 4); rect(104, 80, 4, 4);
    rect(48, 76, 4, 4); rect(108, 76, 4, 4);
  };
  const frown = () => {
    rect(56, 80, 48, 4);
    rect(52, 84, 4, 4); rect(104, 84, 4, 4);
    rect(48, 88, 4, 4); rect(108, 88, 4, 4);
  };
  const HEART = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  const CROSS = ['10001', '01010', '00100', '01010', '10001'];

  const EXPRESSIONS = {
    neutral: (t, blink) => { bars(blink); rect(56, 84, 48, 6); },
    happy: () => { caret(EYE_L); caret(EYE_R); smile(); },
    sad: (t, blink) => {
      bars(blink, 16, 14); frown();
      rect(EYE_L + 4, EYE_Y + 12 + ((t * 8) % 12), 4, 8); // lágrima
    },
    surprised: () => {
      bars(1, 14, 30);
      rect(70, 70, 20, 24); ctx.fillStyle = BG; rect(74, 74, 12, 16); ctx.fillStyle = FG;
    },
    wink: (t, blink) => { rect(EYE_L - 8, EYE_Y - 10 * blink, 16, 20 * blink); rect(EYE_R - 8, EYE_Y, 16, 4); smile(); },
    sleepy: (t) => {
      [EYE_L, EYE_R].forEach((cx) => rect(cx - 8, EYE_Y + 4, 16, 4));
      rect(72, 86, 16, 4);
      if (Math.floor(t * 1.5) % 2 === 0) drawText('Z', 128, 10, 3);
      else drawText('Z', 138, 4, 2);
    },
    love: (t) => {
      [EYE_L, EYE_R].forEach((cx) => sprite(HEART, cx - 10, EYE_Y - 9, 3));
      smile();
    },
    dizzy: (t) => {
      [EYE_L, EYE_R].forEach((cx) => sprite(CROSS, cx - 10, EYE_Y - 10, 4));
      for (let i = 0; i < 6; i++) rect(52 + i * 9, 84 + (i % 2) * 4, 9, 4);
    },
    angry: (t, blink) => {
      bars(blink, 16, 14);
      [[32, 24], [40, 28], [48, 32]].forEach(([x, y]) => { rect(x, y, 8, 4); rect(152 - x, y, 8, 4); });
      rect(56, 84, 48, 4); rect(52, 88, 4, 4); rect(104, 88, 4, 4);
    },
  };
  const NAMES = Object.keys(EXPRESSIONS);
  const POOL = ['neutral', 'neutral', ...NAMES.filter((n) => n !== 'neutral')];
  let expr = 'neutral', nextAt = 3, override = null;

  function drawFace(t, blink) {
    if (t >= nextAt) {
      const options = POOL.filter((n) => n !== expr);
      expr = options[Math.floor(Math.random() * options.length)];
      nextAt = t + 2.5 + Math.random() * 3;
    }
    EXPRESSIONS[override || expr](t, blink);

    const phase = t % PERIOD;
    if (phase < TEXT_AT) return;
    // "CLICK ON ME" tipo terminal
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = FG;
    const k = phase - TEXT_AT;
    let remaining = Math.floor(k * 9), endX = 0, endY = 0;
    ['CLICK', 'ON ME'].forEach((line, i) => {
      const y = 32 + i * 28, n = Math.min(remaining, line.length);
      if (n > 0) { endX = drawText(line, Math.round((W - textWidth(line, 4)) / 2), y, 4, n); endY = y; }
      remaining -= n;
    });
    if (Math.floor(t * 3) % 2 === 0) ctx.fillRect(endX, endY, 8, 28);
    if (phase > PERIOD - 0.3 && Math.floor(t * 20) % 2) {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawMenu(t) {
    centered('MENU', 8, 3);
    ctx.fillRect(10, 30, W - 20, 2);
    MENU_ITEMS.forEach((item, i) => {
      const r = itemRect(i), on = state.hover === i;
      if (on) {
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = BG;
      }
      drawText((on ? '> ' : '  ') + item.label, r.x + 4, r.y + 4, 1);
      ctx.fillStyle = FG;
    });
  }

  function button(rect, label) {
    const on = state.hover === rect.id;
    if (on) {
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = BG;
    } else {
      ctx.fillRect(rect.x, rect.y, rect.w, 1); ctx.fillRect(rect.x, rect.y + rect.h - 1, rect.w, 1);
      ctx.fillRect(rect.x, rect.y, 1, rect.h); ctx.fillRect(rect.x + rect.w - 1, rect.y, 1, rect.h);
    }
    drawText(label, rect.x + Math.round((rect.w - textWidth(label, 1)) / 2), rect.y + Math.round((rect.h - 7) / 2), 1);
    ctx.fillStyle = FG;
  }
  const BACK = { ...BACK_RECT, id: 100 }, OPEN = { ...OPEN_RECT, id: 101 };

  function drawPage(t) {
    const item = MENU_ITEMS.find((m) => m.key === state.page);
    centered(item ? item.label : '', 12, item && item.label.length > 10 ? 1 : 2);
    ctx.fillRect(10, 30, W - 20, 2);
    centered('PROXIMAMENTE', 55, 1);
    if (Math.floor(t * 2) % 2 === 0) ctx.fillRect(W / 2 - 3, 70, 6, 7);
    button(BACK, '< VOLVER');
  }

  function drawProjects(t) {
    centered('PROYECTOS', 8, 2);
    ctx.fillRect(10, 30, W - 20, 2);
    PROJECTS.forEach((pr, i) => {
      const r = itemRect(i), on = state.hover === i;
      if (on) { ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = BG; }
      drawText((on ? '> ' : '  ') + pr.name, r.x + 4, r.y + 4, 1);
      ctx.fillStyle = FG;
    });
    drawText('  MAS PRONTO' + (Math.floor(t * 2) % 2 ? '' : '_'), 14, ITEM_Y0 + PROJECTS.length * ITEM_STEP, 1);
    button(BACK, '< VOLVER');
  }

  function drawProject() {
    const pr = PROJECTS.find((x) => x.key === state.project);
    if (!pr) return;
    centered(pr.name, 5, 3);
    TAB_NAMES.forEach((n, i) => {
      const r = tabRect(i), on = state.tab === i, hov = state.hover === 200 + i;
      if (on || hov) { ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = BG; }
      drawText(n, r.x + Math.round((r.w - textWidth(n, 1)) / 2), r.y + 3, 1);
      ctx.fillStyle = FG;
    });
    wrap(pr.tabs[TAB_NAMES[state.tab]]).slice(0, 5).forEach((line, i) => drawText(line, 10, 48 + i * 9, 1));
    button(BACK, '< VOLVER');
    button(OPEN, 'ABRIR >');
  }

  function draw(t, blink) {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = FG;
    if (state.mode === 'menu') drawMenu(t);
    else if (state.mode === 'page') drawPage(t);
    else if (state.mode === 'projects') drawProjects(t);
    else if (state.mode === 'project') drawProject();
    else drawFace(t, blink);

    // Scanlines CRT
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
    texture.needsUpdate = true;
  }

  const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  // x, y en coordenadas del canvas. Devuelve índice de ítem, 100 = volver, -1 = nada
  function hitTest(x, y) {
    const { mode } = state;
    if (mode === 'menu') return MENU_ITEMS.findIndex((_, i) => inside(itemRect(i), x, y));
    if (mode === 'page') return inside(BACK_RECT, x, y) ? 100 : -1;
    if (mode === 'projects') {
      if (inside(BACK_RECT, x, y)) return 100;
      return PROJECTS.findIndex((_, i) => inside(itemRect(i), x, y));
    }
    if (mode === 'project') {
      if (inside(BACK_RECT, x, y)) return 100;
      if (inside(OPEN_RECT, x, y)) return 101;
      const tab = TAB_NAMES.findIndex((_, i) => inside(tabRect(i), x, y));
      return tab >= 0 ? 200 + tab : -1;
    }
    return -1;
  }

  return {
    texture, draw, hitTest, state, size: { W, H },
    setOverride(n) { override = n; },
    expressions: NAMES, setExpression(n) { expr = n; nextAt = Infinity; },
    setMode(mode, page = null, project = null) {
      state.mode = mode; state.page = page; state.project = project; state.tab = 0; state.hover = -1;
    },
    setTab(i) { state.tab = i; },
    currentProject: () => PROJECTS.find((x) => x.key === state.project),
  };
}
