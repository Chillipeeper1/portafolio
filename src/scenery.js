import * as THREE from 'three';
import { createAnimals } from './animals.js';

// Escenario: cielo, montañas, colinas, bosque, pasto con viento, flores, mariposas y polen.
// Formas low-poly y texturas de píxeles para que combine con el estilo retro del robot.

// Generador pseudo-aleatorio fijo, para que el paisaje sea siempre el mismo
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const skyTexture = () => canvasTexture(2, 512, (g) => {
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#2f86e0');
  grad.addColorStop(0.45, '#6fb8f0');
  grad.addColorStop(0.8, '#bfe6fb');
  grad.addColorStop(1, '#eef6ea');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 512);
});

// Mancha radial blanca con alfa: sirve para sombras suaves y parches de pasto (se tiñe con color)
const blobTexture = () => canvasTexture(64, 64, (g) => {
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
});

function grassTexture(rand) {
  const tex = canvasTexture(32, 32, (g) => {
    const greens = ['#58b050', '#4fa548', '#63bb58', '#47993f', '#6cc460'];
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        g.fillStyle = greens[Math.floor(rand() * greens.length)];
        g.fillRect(x, y, 1, 1);
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.repeat.set(60, 60);
  tex.anisotropy = 4;
  return tex;
}

export function createScenery(scene, floorY) {
  const rand = rng(2026);
  const between = (a, b) => a + rand() * (b - a);
  const pickFrom = (arr) => arr[Math.floor(rand() * arr.length)];
  const jitter = (hex, l = 0.05) => new THREE.Color(hex).offsetHSL((rand() - 0.5) * 0.02, 0, (rand() - 0.5) * l);
  // zona despejada alrededor del robot (pies, caminata y caídas)
  const inRobotZone = (x, z, pad = 0) => Math.abs(x) < 2.4 + pad && z > -1.4 - pad && z < 1.8 + pad;

  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xcfeaff, 24, 70);

  const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });
  const blobTex = blobTexture();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const pos = new THREE.Vector3(), sc = new THREE.Vector3();

  // Viento: desplaza en el shader los vértices según su altura sobre el suelo
  const wind = { uTime: { value: 0 }, uFloor: { value: floorY } };
  const windy = (material) => {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = wind.uTime;
      shader.uniforms.uFloor = wind.uFloor;
      shader.vertexShader = 'uniform float uTime;\nuniform float uFloor;\n' + shader.vertexShader.replace(
        '#include <project_vertex>',
        `vec4 wPos = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          wPos = instanceMatrix * wPos;
        #endif
        wPos = modelMatrix * wPos;
        float hgt = max( 0.0, wPos.y - uFloor );
        float ph = uTime * 1.8 + wPos.x * 0.35 + wPos.z * 0.22;
        wPos.x += ( sin( ph ) + 0.4 * sin( ph * 2.3 ) ) * 0.12 * hgt;
        wPos.z += cos( ph * 0.7 ) * 0.04 * hgt;
        vec4 mvPosition = viewMatrix * wPos;
        gl_Position = projectionMatrix * mvPosition;`,
      );
    };
    material.customProgramCacheKey = () => 'windy';
    return material;
  };

  // --- Montañas lejanas (sin niebla, ya con tono azulado) ---
  [[-48, -95, 30, 26], [-12, -110, 38, 34], [30, -100, 32, 28], [62, -92, 26, 22]].forEach(([x, z, r, h]) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), lambert(0x9db8cf, { fog: false }));
    body.position.y = h / 2;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.3, h * 0.3, 7), lambert(0xf2f6fa, { fog: false }));
    cap.position.y = h * 0.86;
    g.add(body, cap);
    g.position.set(x, floorY - 2, z);
    g.rotation.y = rand() * 6;
    scene.add(g);
  });

  // --- Sol ---
  const sunMat = (opacity) => new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: opacity < 1, opacity, fog: false, depthWrite: false });
  [[2.6, 1, -60], [3.8, 0.28, -60.1], [5.6, 0.12, -60.2]].forEach(([r, o, z]) => {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 32), sunMat(o));
    disc.position.set(16, 11, z);
    scene.add(disc);
  });

  // --- Suelo ---
  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshLambertMaterial({ map: grassTexture(rand) }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = floorY - 0.02;
  scene.add(ground);

  // Parches de color en el pasto para romper la monotonía
  const PATCHES = 34;
  const patches = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: 0.32, depthWrite: false }),
    PATCHES,
  );
  const patchColors = ['#86d070', '#3f8d3b', '#a9c95a', '#5fb552'].map((c) => new THREE.Color(c));
  for (let i = 0; i < PATCHES; i++) {
    const r = between(1.5, 4.5);
    m.compose(pos.set(between(-24, 24), floorY - 0.01, between(-22, 6)), q.setFromEuler(e.set(0, rand() * 6, 0)), sc.set(r * 2, 1, r * between(1.2, 2)));
    patches.setMatrixAt(i, m);
    patches.setColorAt(i, pickFrom(patchColors));
  }
  scene.add(patches);

  // Sombras suaves (árboles, arbustos, rocas): se juntan y se dibujan en un solo InstancedMesh
  const blobs = [];
  const addBlob = (x, z, rx, rz) => blobs.push([x, z, rx, rz]);

  // --- Colinas ---
  [[-26, -42, 22, 9], [10, -50, 30, 12], [38, -40, 20, 8], [-52, -55, 28, 11]].forEach(([x, z, w, h], i) => {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), lambert(i % 2 ? 0x6bb56a : 0x58a65a));
    hill.scale.set(w, h, w * 0.6);
    hill.position.set(x, floorY - h * 0.25, z);
    scene.add(hill);
  });

  // --- Línea de bosque lejano ---
  const LINE = 170;
  const treeLine = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0), lambert(0xffffff), LINE);
  const lineColors = ['#2f6b45', '#2a6340', '#38774c', '#2d7048'].map((c) => new THREE.Color(c));
  for (let i = 0; i < LINE; i++) {
    const r = between(0.9, 1.7), h = between(3.2, 7);
    m.compose(pos.set(between(-75, 75), floorY - 0.1, between(-27, -40)), q.identity(), sc.set(r, h, r));
    treeLine.setMatrixAt(i, m);
    treeLine.setColorAt(i, pickFrom(lineColors));
  }
  scene.add(treeLine);

  // --- Briznas de pasto en matas, con punta más clara y viento ---
  const bladeGeo = new THREE.ConeGeometry(0.05, 0.42, 3).translate(0, 0.21, 0);
  {
    const p = bladeGeo.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const k = 0.55 + (p.getY(i) / 0.42) * 0.75; // base oscura -> punta clara
      col.set([k, k, k], i * 3);
    }
    bladeGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const BLADES = 3600;
  const blades = new THREE.InstancedMesh(bladeGeo, windy(lambert(0xffffff, { vertexColors: true })), BLADES);
  const bladeColors = ['#3f8f3a', '#4fa548', '#5dba52', '#2f7d33', '#7ac765', '#8ccf62'].map((c) => new THREE.Color(c));
  for (let placed = 0; placed < BLADES;) {
    const cx = between(-18, 18), cz = between(-14, 4.5);
    if (inRobotZone(cx, cz)) continue;
    const tint = pickFrom(bladeColors);
    const n = 3 + Math.floor(rand() * 4);
    for (let k = 0; k < n && placed < BLADES; k++) {
      e.set(between(-0.35, 0.35), between(0, Math.PI), between(-0.35, 0.35));
      const s = between(0.5, 1.2);
      m.compose(pos.set(cx + between(-0.12, 0.12), floorY, cz + between(-0.12, 0.12)), q.setFromEuler(e), sc.set(s, s * between(0.7, 1.3), s));
      blades.setMatrixAt(placed, m);
      blades.setColorAt(placed, tint);
      placed++;
    }
  }
  scene.add(blades);

  // --- Flores (tallo + corola + centro), también con viento ---
  const FLOWERS = 110;
  const windyLambert = (c) => windy(lambert(c));
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4).translate(0, 0.5, 0), windyLambert(0x3f8f3a), FLOWERS);
  const petals = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.085, 0), windyLambert(0xffffff), FLOWERS);
  const centers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 0), windyLambert(0xffc93c), FLOWERS);
  const flowerColors = ['#ffffff', '#ffd54a', '#ff7eb6', '#b388ff', '#ff8a65', '#7ec8ff'].map((c) => new THREE.Color(c));
  const flowerSpots = [];
  for (let i = 0; i < FLOWERS;) {
    const x = between(-14, 14), z = between(-10, 5);
    if (inRobotZone(x, z, 0.3)) continue;
    const h = between(0.28, 0.55);
    flowerSpots.push([x, z, h]);
    m.compose(pos.set(x, floorY, z), q.identity(), sc.set(1, h, 1));
    stems.setMatrixAt(i, m);
    m.compose(pos.set(x, floorY + h, z), q.setFromEuler(e.set(0, rand() * 6, 0)), sc.set(1, 0.5, 1));
    petals.setMatrixAt(i, m);
    petals.setColorAt(i, pickFrom(flowerColors));
    m.compose(pos.set(x, floorY + h + 0.035, z), q.identity(), sc.set(1, 1, 1));
    centers.setMatrixAt(i, m);
    i++;
  }
  scene.add(stems, petals, centers);

  // --- Árboles ---
  const TREE_SCALE = 2.4; // tamaño de los árboles
  const trunkMat = lambert(0x6e4a2c);
  const apples = [];
  const appleColors = ['#e63946', '#ff9f1c', '#ffd23f', '#e63946'].map((c) => new THREE.Color(c));
  const cones = [];
  const up = new THREE.Vector3(0, 1, 0);
  const world = (g, lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(up, g.rotation.y).add(g.position);
  const trunkSpots = [];

  function pine(x, z, s) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.2 * s, 0.9 * s, 6), trunkMat);
    trunk.position.y = 0.45 * s;
    g.add(trunk);
    const tiers = [[1.0, 1.1, 1.0, '#25683b'], [0.78, 1.0, 1.7, '#2c7744'], [0.55, 0.9, 2.3, '#378a52']];
    tiers.forEach(([r, h, y, c]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r * s, h * s, 7), lambert(jitter(c)));
      cone.position.y = y * s;
      cone.rotation.y = rand() * 6;
      g.add(cone);
    });
    g.position.set(x, floorY, z);
    g.rotation.y = rand() * 6;
    scene.add(g);
    // piñas colgando del borde de cada piso
    for (let i = 0; i < 12; i++) {
      const [r, h, y] = tiers[i % 3], a = rand() * Math.PI * 2;
      cones.push({ pos: world(g, Math.cos(a) * r * s * 0.82, (y - h / 2) * s + 0.06 * s, Math.sin(a) * r * s * 0.82), r: 0.1 * s });
    }
    addBlob(x - 0.25 * s, z - 0.2 * s, 1.05 * s, 0.85 * s);
    trunkSpots.push([x, z, s]);
  }

  function round(x, z, s) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.24 * s, 1.3 * s, 6), trunkMat);
    trunk.position.y = 0.65 * s;
    g.add(trunk);
    // ramas cortas
    [-1, 1].forEach((side) => {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.08 * s, 0.6 * s, 5), trunkMat);
      br.position.set(side * 0.22 * s, 1.25 * s, 0);
      br.rotation.z = -side * 0.7;
      g.add(br);
    });
    const crowns = [[0, 1.9, 0, 1.0, '#4fae4a'], [0.55, 1.6, 0.2, 0.7, '#449e43'], [-0.5, 1.65, -0.1, 0.72, '#3f963f'], [0.1, 2.45, 0.1, 0.55, '#66c25a']];
    crowns.forEach(([dx, y, dz, r, c]) => {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), lambert(jitter(c)));
      crown.position.set(dx * s, y * s, dz * s);
      crown.rotation.set(rand() * 3, rand() * 3, 0);
      g.add(crown);
    });
    g.position.set(x, floorY, z);
    scene.add(g);
    // manzanas / naranjas sobre la superficie de las copas
    for (let i = 0; i < 26; i++) {
      const [cx, cy, cz, cr] = crowns[i % 3];
      const d = new THREE.Vector3(rand() * 2 - 1, rand() * 1.2 - 0.3, rand() * 1.4 - 0.2).normalize();
      apples.push({ pos: world(g, (cx + d.x * cr * 0.97) * s, (cy + d.y * cr * 0.97) * s, (cz + d.z * cr * 0.97) * s), r: 0.075 * s, color: pickFrom(appleColors) });
    }
    addBlob(x - 0.3 * s, z - 0.25 * s, 1.3 * s, 1.0 * s);
    trunkSpots.push([x, z, s]);
  }

  [[-8.5, -7, 1.1], [8.8, -8, 1.2], [-13, -11, 1.5], [14, -12, 1.6], [4.5, -18, 2.0], [-4, -20, 1.9], [-19, -6, 1.4], [20, -5, 1.4],
    [-5.5, -6, 1.0], [6, -6.5, 1.1], [-10.5, -4.5, 1.2], [11.5, -5, 1.1], [-16, -9, 1.5], [17, -9.5, 1.4],
    [-23, -12, 1.8], [24, -13, 1.8], [-28, -8, 1.6], [29, -9, 1.6], [-20, -17, 2.0], [21, -18, 2.0]]
    .forEach(([x, z, s], i) => (i % 2 ? round(x, z, s * TREE_SCALE) : pine(x, z, s * TREE_SCALE)));

  // --- Arbustos (con bayas) ---
  const bushColors = ['#3d9a45', '#47a64c', '#358c3e', '#52b055'];
  [[-4.2, -2.4, 0.7], [4.5, -2.0, 0.65], [-7, -3.5, 0.9], [7.6, -4, 0.85], [-2, -9, 1.0], [2.6, -11, 1.1], [-12, -3, 1.0], [12.5, -1, 0.9], [-9.5, 1.5, 0.7], [9.8, 2.2, 0.75]]
    .forEach(([x, z, s]) => {
      const g = new THREE.Group();
      const puffs = [[0, 0, 0, 1], [0.7, -0.1, 0.1, 0.75], [-0.65, -0.05, -0.1, 0.8], [0.15, 0.3, -0.15, 0.6]];
      puffs.forEach(([dx, dy, dz, r]) => {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * r * s, 1), lambert(jitter(pickFrom(bushColors))));
        b.position.set(dx * s * 0.8, 0.35 * s + dy, dz * s);
        b.scale.y = 0.8;
        g.add(b);
      });
      g.position.set(x, floorY, z);
      scene.add(g);
      for (let i = 0; i < 7; i++) {
        const [dx, dy, dz, r] = puffs[i % 3];
        const d = new THREE.Vector3(rand() * 2 - 1, rand() * 0.8, rand() * 0.8 + 0.2).normalize();
        apples.push({
          pos: new THREE.Vector3(x + dx * s * 0.8 + d.x * 0.55 * r * s, floorY + 0.35 * s + dy + d.y * 0.44 * r * s, z + dz * s + d.z * 0.55 * r * s),
          r: 0.045 * s, color: new THREE.Color(rand() < 0.5 ? '#d7263d' : '#7b2cbf'),
        });
      }
      addBlob(x - 0.1, z - 0.1, 1.2 * s, 0.8 * s);
    });

  // Frutas y bayas (un solo InstancedMesh), piñas
  const fruitMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lambert(0xffffff), apples.length);
  apples.forEach((a, i) => {
    fruitMesh.setMatrixAt(i, m.compose(a.pos, q.identity(), sc.set(a.r, a.r, a.r)));
    fruitMesh.setColorAt(i, a.color);
  });
  const coneMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), lambert(0x8a5a2b), cones.length);
  cones.forEach((c, i) => coneMesh.setMatrixAt(i, m.compose(c.pos, q.identity(), sc.set(c.r * 0.7, c.r * 1.3, c.r * 0.7))));
  scene.add(fruitMesh, coneMesh);

  // --- Rocas ---
  const ROCKS = 14;
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), lambert(0xffffff), ROCKS);
  const rockColors = ['#8e9196', '#7d8187', '#9a9c9f'].map((c) => new THREE.Color(c));
  for (let i = 0; i < ROCKS;) {
    const x = between(-15, 15), z = between(-12, 4);
    if (inRobotZone(x, z, 0.8)) continue;
    const s = between(0.25, 0.6);
    m.compose(pos.set(x, floorY + s * 0.15, z), q.setFromEuler(e.set(rand() * 3, rand() * 3, rand() * 3)), sc.set(s * between(1, 1.6), s * between(0.5, 0.8), s));
    rocks.setMatrixAt(i, m);
    rocks.setColorAt(i, pickFrom(rockColors));
    addBlob(x, z, s * 1.4, s * 1.1);
    i++;
  }
  scene.add(rocks);

  // --- Hongos al pie de los árboles ---
  const shrooms = [];
  trunkSpots.slice(0, 14).forEach(([x, z, s]) => {
    const n = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2, d = 0.32 * s + between(0.2, 0.7);
      shrooms.push([x + Math.cos(a) * d, z + Math.abs(Math.sin(a)) * d, between(1.4, 2.3)]);
    }
  });
  const stemsS = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 6).translate(0, 0.09, 0), lambert(0xf3eadc), shrooms.length);
  const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0xd93a32), shrooms.length);
  const dots = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.022, 0), lambert(0xffffff), shrooms.length * 4);
  shrooms.forEach(([x, z, s], i) => {
    stemsS.setMatrixAt(i, m.compose(pos.set(x, floorY, z), q.identity(), sc.set(s, s, s)));
    caps.setMatrixAt(i, m.compose(pos.set(x, floorY + 0.17 * s, z), q.identity(), sc.set(s, s * 0.75, s)));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4, el = k === 0 ? 1.2 : 0.6;
      const v = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el) * 0.75, Math.sin(a) * Math.cos(el)).multiplyScalar(0.14 * s);
      dots.setMatrixAt(i * 4 + k, m.compose(pos.set(x + v.x, floorY + 0.17 * s + v.y, z + v.z), q.identity(), sc.set(s, s, s)));
    }
  });
  scene.add(stemsS, caps, dots);

  // Dibuja todas las sombras suaves juntas
  const blobMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: blobTex, color: 0x0f2a12, transparent: true, opacity: 0.38, depthWrite: false }),
    blobs.length,
  );
  blobs.forEach(([x, z, rx, rz], i) => blobMesh.setMatrixAt(i, m.compose(pos.set(x, floorY + 0.012, z), q.identity(), sc.set(rx * 2, 1, rz * 2))));
  scene.add(blobMesh);

  // --- Nubes esponjosas ---
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xc6dcef, emissiveIntensity: 0.6 });
  const clouds = [];
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    const puffs = 4 + Math.floor(rand() * 3);
    for (let p = 0; p < puffs; p++) {
      const mid = 1 - Math.abs(p - (puffs - 1) / 2) / puffs; // más grandes al centro
      const r = between(0.8, 1.1) + mid * 0.9;
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), cloudMat);
      puff.position.set((p - (puffs - 1) / 2) * 1.25 + between(-0.2, 0.2), r * 0.35, between(-0.4, 0.4));
      puff.scale.y = 0.72;
      g.add(puff);
    }
    g.position.set(between(-45, 45), between(5, 11), between(-34, -18));
    g.scale.setScalar(between(1.1, 1.9));
    scene.add(g);
    clouds.push({ g, speed: between(0.15, 0.45) });
  }

  // --- Mariposas (revolotean en zonas fijas, lejos de la cámara y del robot) ---
  const wingShape = (() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.bezierCurveTo(0.02, 0.1, 0.16, 0.14, 0.14, 0.03);
    sh.bezierCurveTo(0.13, -0.02, 0.06, -0.03, 0, 0);
    return new THREE.ShapeGeometry(sh, 6).rotateX(-Math.PI / 2);
  })();
  const homes = [[-5, -2.6], [5.5, -3], [-8, -0.8], [8.2, 0.4], [-3.4, -5.5]];
  const butterflies = ['#ffd23f', '#ff8a3d', '#7ec8ff', '#ff7eb6', '#ffffff'].map((color, i) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.1, 2, 4).rotateZ(Math.PI / 2), lambert(0x2b2b2b)));
    const wingMat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
    const wings = [-1, 1].map((s) => {
      const w = new THREE.Group();
      const fore = new THREE.Mesh(wingShape, wingMat);
      fore.scale.set(1, 1, -s);
      const hind = new THREE.Mesh(wingShape, wingMat);
      hind.scale.set(-0.65, 1, -s * 0.75);
      w.add(fore, hind);
      g.add(w);
      return { w, s };
    });
    const [cx, cz] = homes[i];
    g.scale.setScalar(1.5);
    scene.add(g);
    return { g, wings, cx, cz, y: floorY + between(0.5, 1.1), ph: rand() * 10, sp: between(0.7, 1.1), last: new THREE.Vector3(cx, 0, cz) };
  });

  // --- Polen flotando (puntos cuadrados, estilo píxel) ---
  const POLLEN = 160;
  const pollenPos = new Float32Array(POLLEN * 3);
  const pollenSeed = [];
  for (let i = 0; i < POLLEN; i++) {
    pollenPos.set([between(-14, 14), floorY + between(0.2, 4.5), between(-12, 6)], i * 3);
    pollenSeed.push(rand() * 10);
  }
  const pollenGeo = new THREE.BufferGeometry();
  pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
  const pollen = new THREE.Points(pollenGeo, new THREE.PointsMaterial({ color: 0xfff6c8, size: 0.06, transparent: true, opacity: 0.85, depthWrite: false }));
  scene.add(pollen);

  const animals = createAnimals(scene, floorY, blobTex);

  return {
    spawnAnimal: animals.spawn,
    update(t, dt) {
      wind.uTime.value = t;
      animals.update(t, dt);

      clouds.forEach((c) => {
        c.g.position.x += c.speed * dt;
        if (c.g.position.x > 55) c.g.position.x = -55;
      });

      butterflies.forEach((b) => {
        const k = t * b.sp + b.ph;
        const x = b.cx + Math.sin(k * 0.45) * 2.0 + Math.sin(k * 1.3) * 0.25;
        const z = b.cz + Math.cos(k * 0.37) * 0.9;
        b.g.position.set(x, b.y + Math.sin(k * 1.9) * 0.25 + Math.abs(Math.sin(k * 7)) * 0.06, z);
        const dx = x - b.last.x, dz = z - b.last.z;
        if (dx * dx + dz * dz > 1e-6) b.g.rotation.y = Math.atan2(-dz, dx);
        b.last.set(x, 0, z);
        const flap = 0.25 + Math.abs(Math.sin(t * 16 + b.ph)) * 1.1;
        b.wings.forEach(({ w, s }) => { w.rotation.x = -s * flap; });
      });

      const p = pollenGeo.attributes.position;
      for (let i = 0; i < POLLEN; i++) {
        let y = p.getY(i) + dt * 0.12;
        if (y > floorY + 4.8) y = floorY + 0.2;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(t * 0.6 + pollenSeed[i]) * dt * 0.15);
      }
      p.needsUpdate = true;
    },
  };
}
