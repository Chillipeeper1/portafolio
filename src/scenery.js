import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAnimals } from './animals.js';
import { PALETTES, currentSeason } from './seasons.js';

// Ruido suave barato (suma de senos) para deformar geometrías y que se vean orgánicas
const noise3 = (x, y, z, k) =>
  Math.sin(x * 2.1 + k) * Math.sin(y * 1.7 + k * 1.3) * Math.sin(z * 2.3 + k * 0.7)
  + 0.5 * Math.sin(x * 4.3 + y * 3.1 + k * 2.1) * Math.sin(z * 3.7 - k);

// Prepara una geometría para sombreado suave: une vértices duplicados y recalcula normales
const smooth = (geo) => {
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  return mergeVertices(geo);
};

// Degradado vertical en colores de vértice: abajo más oscuro (sombra ambiental falsa), arriba más claro
function shadeByHeight(geo, minY, maxY, dark = 0.6, bright = 1.12, wobble = 0) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.max(0, (p.getY(i) - minY) / (maxY - minY)));
    const k = dark + (bright - dark) * t + wobble * noise3(p.getX(i) * 3, p.getY(i) * 3, p.getZ(i) * 3, 1.7);
    col.set([k, k, k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Copa de árbol / arbusto: esfera deformada con ruido, base un poco aplanada
function foliageGeometry(seed) {
  const geo = smooth(new THREE.IcosahedronGeometry(1, 3));
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = 1 + 0.11 * noise3(v.x, v.y, v.z, seed) + 0.05 * noise3(v.x * 2.5, v.y * 2.5, v.z * 2.5, seed + 5);
    v.multiplyScalar(d);
    if (v.y < 0) v.y *= 0.82;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return shadeByHeight(geo, -0.85, 1.05, 0.58, 1.15, 0.05);
}

// Piso de pino: cono con borde inferior ondulado y caído
function pineTierGeometry(seed) {
  const geo = smooth(new THREE.ConeGeometry(1, 1, 22, 4));
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), lowness = Math.max(0, -y * 2); // 1 en la base, 0 a media altura
    const wave = Math.sin(a * 9 + seed) * 0.5 + 0.5;
    const r = 1 + 0.08 * wave * lowness;
    p.setXYZ(i, x * r, y - 0.09 * wave * lowness * Math.min(1, Math.hypot(x, z) * 2), z * r);
  }
  geo.computeVertexNormals();
  return shadeByHeight(geo, -0.6, 0.5, 0.55, 1.15, 0.04);
}

// Montaña con relieve y nieve pintada en la cima
function mountainGeometry(seed) {
  const geo = smooth(new THREE.ConeGeometry(1, 1, 40, 10));
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  const rock = new THREE.Color(0x9db8cf), snow = new THREE.Color(0xf2f6fa), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x), h = y + 0.5;
    const r = 1 + 0.16 * Math.sin(a * 5 + seed) * (1 - h) + 0.07 * Math.sin(a * 13 + seed * 2);
    p.setXYZ(i, x * r, y, z * r);
    const snowLine = 0.68 + 0.08 * Math.sin(a * 7 + seed);
    c.copy(h > snowLine ? snow : rock).multiplyScalar(0.85 + 0.2 * h);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

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

const skyTexture = (stops) => canvasTexture(2, 512, (g) => {
  const grad = g.createLinearGradient(0, 0, 0, 512);
  [0, 0.45, 0.8, 1].forEach((o, i) => grad.addColorStop(o, stops[i]));
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

function grassTexture(rand, { base, spots: greens }) {
  const N = 256;
  const tex = canvasTexture(N, N, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, N, N);
    for (let i = 0; i < 900; i++) {
      const x = rand() * N, y = rand() * N, r = 3 + rand() * 14;
      g.globalAlpha = 0.18 + rand() * 0.22;
      g.fillStyle = greens[Math.floor(rand() * greens.length)];
      // se dibuja también desplazado para que la textura se repita sin costuras
      for (const dx of [-N, 0, N]) {
        for (const dy of [-N, 0, N]) {
          g.beginPath();
          g.arc(x + dx, y + dy, r, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    g.globalAlpha = 1;
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(26, 26);
  tex.anisotropy = 8;
  return tex;
}

export function createScenery(scene, floorY, season = currentSeason()) {
  const S = PALETTES[season];
  const rand = rng(2026);
  const between = (a, b) => a + rand() * (b - a);
  const pickFrom = (arr) => arr[Math.floor(rand() * arr.length)];
  const jitter = (hex, l = 0.05) => new THREE.Color(hex).offsetHSL((rand() - 0.5) * 0.02, 0, (rand() - 0.5) * l);
  // zona despejada alrededor del robot (pies, caminata y caídas)
  const inRobotZone = (x, z, pad = 0) => Math.abs(x) < 2.4 + pad && z > -1.4 - pad && z < 1.8 + pad;

  scene.background = skyTexture(S.sky);
  scene.fog = new THREE.Fog(S.fog, 24, 70);

  const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
  const foliageGeos = [0, 1, 2].map((k) => foliageGeometry(k * 2.7 + 0.4));
  const pineGeos = [0, 1].map((k) => pineTierGeometry(k * 1.9));
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
    const mtn = new THREE.Mesh(mountainGeometry(rand() * 10), lambert(0xffffff, { fog: false, vertexColors: true }));
    mtn.scale.set(r, h, r);
    mtn.position.set(x, floorY - 2 + h / 2, z);
    mtn.rotation.y = rand() * 6;
    scene.add(mtn);
  });

  // --- Sol ---
  const sunMat = (opacity) => new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: opacity < 1, opacity, fog: false, depthWrite: false });
  [[2.6, 1, -60], [3.8, 0.28, -60.1], [5.6, 0.12, -60.2]].forEach(([r, o, z]) => {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 32), sunMat(o));
    disc.position.set(16, 11, z);
    scene.add(disc);
  });

  // --- Suelo ---
  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64), new THREE.MeshLambertMaterial({ map: grassTexture(rand, S.ground) }));
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
  const patchColors = S.patches.map((c) => new THREE.Color(c));
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
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20), lambert(S.hills[i % 2]));
    hill.scale.set(w, h, w * 0.6);
    hill.position.set(x, floorY - h * 0.25, z);
    scene.add(hill);
  });

  // --- Línea de bosque lejano ---
  const LINE = 170;
  const treeLine = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 10).translate(0, 0.5, 0), lambert(0xffffff), LINE);
  const lineColors = S.treeLine.map((c) => new THREE.Color(c));
  for (let i = 0; i < LINE; i++) {
    const r = between(0.9, 1.7), h = between(3.2, 7);
    m.compose(pos.set(between(-75, 75), floorY - 0.1, between(-27, -40)), q.identity(), sc.set(r, h, r));
    treeLine.setMatrixAt(i, m);
    treeLine.setColorAt(i, pickFrom(lineColors));
  }
  scene.add(treeLine);

  // --- Briznas de pasto en matas, con punta más clara y viento ---
  const bladeGeo = new THREE.ConeGeometry(0.045, 0.42, 4, 2).translate(0, 0.21, 0);
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
  const bladeColors = S.blades.map((c) => new THREE.Color(c));
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
  blades.count = Math.floor(BLADES * S.bladeRatio); // en invierno la nieve tapa casi todo el pasto
  scene.add(blades);

  // --- Flores (tallo + corola + centro), también con viento ---
  const FLOWERS = Math.max(1, S.flowers.count);
  const windyLambert = (c) => windy(lambert(c));
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4).translate(0, 0.5, 0), windyLambert(0x3f8f3a), FLOWERS);
  const petals = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.085, 1), windyLambert(0xffffff), FLOWERS);
  const centers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 1), windyLambert(0xffc93c), FLOWERS);
  const flowerColors = S.flowers.colors.map((c) => new THREE.Color(c));
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
  if (S.flowers.count > 0) scene.add(stems, petals, centers);

  // --- Árboles ---
  const TREE_SCALE = 2.4; // tamaño de los árboles
  const trunkMat = lambert(0x6e4a2c);
  const apples = [];
  const appleColors = ['#e63946', '#ff9f1c', '#ffd23f', '#e63946'].map((c) => new THREE.Color(c));
  const cones = [];
  const up = new THREE.Vector3(0, 1, 0);
  const world = (g, lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(up, g.rotation.y).add(g.position);
  const trunkSpots = [];
  // Punto exacto sobre la superficie de una copa deformada: se lanza un rayo desde afuera hacia su centro
  const ray = new THREE.Raycaster();
  const surfacePoint = (mesh, dir) => {
    const c = mesh.getWorldPosition(new THREE.Vector3());
    const reach = mesh.scale.x * 3;
    ray.set(c.clone().addScaledVector(dir, reach), dir.clone().negate());
    ray.far = reach;
    const hit = ray.intersectObject(mesh, false)[0];
    return hit ? hit.point : c.addScaledVector(dir, mesh.scale.x);
  };

  function pine(x, z, s) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.2 * s, 0.9 * s, 12), trunkMat);
    trunk.position.y = 0.45 * s;
    g.add(trunk);
    const tiers = [[1.0, 1.1, 1.0, S.pine[0]], [0.78, 1.0, 1.7, S.pine[1]], [0.55, 0.9, 2.3, S.pine[2]]];
    tiers.forEach(([r, h, y, c]) => {
      const cone = new THREE.Mesh(pickFrom(pineGeos), lambert(jitter(c), { vertexColors: true }));
      cone.scale.set(r * s, h * s, r * s);
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
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.24 * s, 1.3 * s, 12), trunkMat);
    trunk.position.y = 0.65 * s;
    g.add(trunk);
    // ramas cortas
    [-1, 1].forEach((side) => {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.08 * s, 0.6 * s, 8), trunkMat);
      br.position.set(side * 0.22 * s, 1.25 * s, 0);
      br.rotation.z = -side * 0.7;
      g.add(br);
    });
    // color de las copas según la estación (otoño: mezcla de naranjas; primavera: algunos árboles en flor)
    const blossoming = S.blossom && rand() < S.blossomChance;
    const crownColor = (i) => (S.crownPalette ? pickFrom(S.crownPalette) : blossoming ? pickFrom(S.blossom) : S.crowns[i]);
    const crowns = [[0, 1.9, 0, 1.0], [0.55, 1.6, 0.2, 0.7], [-0.5, 1.65, -0.1, 0.72], [0.1, 2.45, 0.1, 0.55]].map((c, i) => [...c, crownColor(i)]);
    const crownMeshes = [];
    crowns.forEach(([dx, y, dz, r, c]) => {
      const crown = new THREE.Mesh(pickFrom(foliageGeos), lambert(jitter(c), { vertexColors: true }));
      crown.scale.setScalar(r * s);
      crown.position.set(dx * s, y * s, dz * s);
      crown.rotation.y = rand() * 6;
      g.add(crown);
      crownMeshes.push(crown);
    });
    g.position.set(x, floorY, z);
    scene.add(g);
    g.updateMatrixWorld(true);
    // manzanas / naranjas sobre la superficie de las copas (medio asomadas)
    for (let i = 0; i < 26; i++) {
      const d = new THREE.Vector3(rand() * 2 - 1, rand() * 1.2 - 0.3, rand() * 1.4 - 0.2).normalize();
      const r = 0.075 * s;
      apples.push({ pos: surfacePoint(crownMeshes[i % 3], d).addScaledVector(d, r * 0.35), r, color: pickFrom(appleColors), tree: true });
    }
    addBlob(x - 0.3 * s, z - 0.25 * s, 1.3 * s, 1.0 * s);
    trunkSpots.push([x, z, s]);
  }

  [[-8.5, -7, 1.1], [8.8, -8, 1.2], [-13, -11, 1.5], [14, -12, 1.6], [4.5, -18, 2.0], [-4, -20, 1.9], [-19, -6, 1.4], [20, -5, 1.4],
    [-5.5, -6, 1.0, 'round'], [6, -6.5, 1.1], [-10.5, -4.5, 1.2], [11.5, -5, 1.1], [-16, -9, 1.5], [17, -9.5, 1.4],
    [-23, -12, 1.8], [24, -13, 1.8], [-28, -8, 1.6], [29, -9, 1.6], [-20, -17, 2.0], [21, -18, 2.0]]
    .forEach(([x, z, s, kind], i) => ((kind ?? (i % 2 ? 'round' : 'pine')) === 'round' ? round(x, z, s * TREE_SCALE) : pine(x, z, s * TREE_SCALE)));

  // --- Arbustos (con bayas) ---
  const bushColors = S.bushes;
  [[-4.2, -2.4, 0.7], [4.5, -2.0, 0.65], [-7, -3.5, 0.9], [7.6, -4, 0.85], [-2, -9, 1.0], [2.6, -11, 1.1], [-12, -3, 1.0], [12.5, -1, 0.9], [-9.5, 1.5, 0.7], [9.8, 2.2, 0.75]]
    .forEach(([x, z, s]) => {
      const g = new THREE.Group();
      const puffs = [[0, 0, 0, 1], [0.7, -0.1, 0.1, 0.75], [-0.65, -0.05, -0.1, 0.8], [0.15, 0.3, -0.15, 0.6]];
      const puffMeshes = [];
      puffs.forEach(([dx, dy, dz, r]) => {
        const b = new THREE.Mesh(pickFrom(foliageGeos), lambert(jitter(pickFrom(bushColors)), { vertexColors: true }));
        b.position.set(dx * s * 0.8, 0.35 * s + dy, dz * s);
        b.scale.set(0.55 * r * s, 0.44 * r * s, 0.55 * r * s);
        b.rotation.y = rand() * 6;
        g.add(b);
        puffMeshes.push(b);
      });
      g.position.set(x, floorY, z);
      scene.add(g);
      g.updateMatrixWorld(true);
      for (let i = 0; i < 7; i++) {
        const d = new THREE.Vector3(rand() * 2 - 1, rand() * 0.8, rand() * 0.8 + 0.2).normalize();
        const r = 0.045 * s;
        apples.push({ pos: surfacePoint(puffMeshes[i % 3], d).addScaledVector(d, r * 0.3), r, color: new THREE.Color(rand() < 0.5 ? '#d7263d' : '#7b2cbf') });
      }
      addBlob(x - 0.1, z - 0.1, 1.2 * s, 0.8 * s);
    });

  // Frutas y bayas (un solo InstancedMesh), piñas
  const fruitMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), lambert(0xffffff), apples.length);
  apples.forEach((a, i) => {
    a.idx = i;
    const r = a.tree && !S.fruit ? 0 : a.r; // fuera de temporada no hay frutas en los árboles
    fruitMesh.setMatrixAt(i, m.compose(a.pos, q.identity(), sc.set(r, r, r)));
    fruitMesh.setColorAt(i, a.color);
  });
  const coneMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), lambert(0x8a5a2b), cones.length);
  cones.forEach((c, i) => coneMesh.setMatrixAt(i, m.compose(c.pos, q.identity(), sc.set(c.r * 0.7, c.r * 1.3, c.r * 0.7))));
  scene.add(fruitMesh, coneMesh);

  // --- Frutas que se caen: rebotan, quedan en el suelo y un animal se las lleva ---
  const fallenGeo = new THREE.IcosahedronGeometry(1, 2);
  fallenGeo.userData.shared = true;
  const fruitMats = new Map();
  const fruitMat = (c) => {
    const k = c.getHex();
    if (!fruitMats.has(k)) fruitMats.set(k, lambert(c));
    return fruitMats.get(k);
  };
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), fs = new THREE.Vector3();
  const dropped = [];
  let nextFall = 9 + rand() * 5;
  const fruits = {
    onLand: null,
    available: () => dropped.find((f) => f.state === 'ground' && !f.claimed),
    take(f, t) { f.state = 'taken'; f.regrowAt = t + 10; },
  };
  function dropFruit() {
    if (!S.fruit) return;
    // solo frutas visibles desde la cámara
    const options = apples.filter((a) => a.tree && !a.busy && a.pos.z > -10 && a.pos.z < -4 && Math.abs(a.pos.x) < 7.5 && Math.abs(a.pos.x) > 2.5);
    if (!options.length) return;
    const a = options[Math.floor(Math.random() * options.length)];
    a.busy = true;
    fruitMesh.setMatrixAt(a.idx, hidden);
    fruitMesh.instanceMatrix.needsUpdate = true;
    const mesh = new THREE.Mesh(fallenGeo, fruitMat(a.color));
    mesh.scale.setScalar(a.r);
    mesh.position.copy(a.pos);
    scene.add(mesh);
    dropped.push({ a, mesh, r: a.r, vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, 1.2 + Math.random() * 0.8), state: 'falling', claimed: false });
  }
  function updateFruits(t, dt) {
    if (t > nextFall) {
      if (dropped.filter((f) => f.state === 'falling' || f.state === 'ground').length < 3) dropFruit();
      nextFall = t + 14 + Math.random() * 10; // cada 14-24 s
    }
    for (const f of dropped) {
      if (f.state === 'falling') {
        f.vel.y -= 9.8 * dt;
        f.mesh.position.addScaledVector(f.vel, dt);
        f.mesh.rotation.x += f.vel.z * dt * 3;
        f.mesh.rotation.z -= f.vel.x * dt * 3;
        const groundY = floorY + f.r;
        if (f.mesh.position.y <= groundY) {
          f.mesh.position.y = groundY;
          if (Math.abs(f.vel.y) > 1.2) {
            f.vel.y = -f.vel.y * 0.35;
            f.vel.x *= 0.75;
            f.vel.z *= 0.75;
          } else {
            f.state = 'ground';
            f.vel.set(0, 0, 0);
            if (fruits.onLand) fruits.onLand(t);
          }
        }
      } else if (f.state === 'taken' && t > f.regrowAt) {
        // vuelve a crecer en el árbol
        const k = Math.min(1, (t - f.regrowAt) / 1.5);
        fruitMesh.setMatrixAt(f.a.idx, fm.compose(f.a.pos, fq.identity(), fs.setScalar(f.a.r * k)));
        fruitMesh.instanceMatrix.needsUpdate = true;
        if (k >= 1) { f.state = 'done'; f.a.busy = false; }
      }
    }
    for (let i = dropped.length - 1; i >= 0; i--) if (dropped[i].state === 'done') dropped.splice(i, 1);
  }

  // --- Rocas ---
  const ROCKS = 14;
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lambert(0xffffff, { flatShading: true }), ROCKS);
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
  trunkSpots.slice(0, Math.round(14 * S.mushrooms)).forEach(([x, z, s]) => {
    const n = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2, d = 0.32 * s + between(0.2, 0.7);
      shrooms.push([x + Math.cos(a) * d, z + Math.abs(Math.sin(a)) * d, between(1.4, 2.3)]);
    }
  });
  const SH = Math.max(1, shrooms.length);
  const stemsS = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.06, 0.18, 10).translate(0, 0.09, 0), lambert(0xf3eadc), SH);
  const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0xd93a32), SH);
  const dots = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.022, 0), lambert(0xffffff), SH * 4);
  shrooms.forEach(([x, z, s], i) => {
    stemsS.setMatrixAt(i, m.compose(pos.set(x, floorY, z), q.identity(), sc.set(s, s, s)));
    caps.setMatrixAt(i, m.compose(pos.set(x, floorY + 0.17 * s, z), q.identity(), sc.set(s, s * 0.75, s)));
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4, el = k === 0 ? 1.2 : 0.6;
      const v = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el) * 0.75, Math.sin(a) * Math.cos(el)).multiplyScalar(0.14 * s);
      dots.setMatrixAt(i * 4 + k, m.compose(pos.set(x + v.x, floorY + 0.17 * s + v.y, z + v.z), q.identity(), sc.set(s, s, s)));
    }
  });
  if (shrooms.length) scene.add(stemsS, caps, dots);

  // Dibuja todas las sombras suaves juntas
  const blobMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: blobTex, color: S.shadow, transparent: true, opacity: 0.38, depthWrite: false }),
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
  const butterflies = ['#ffd23f', '#ff8a3d', '#7ec8ff', '#ff7eb6', '#ffffff'].slice(0, S.butterflies).map((color, i) => {
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

  // --- Partículas de la estación: polen (verano), nieve (invierno), pétalos (primavera), hojas (otoño) ---
  let updateParticles = () => {};
  if (S.particles === 'pollen' || S.particles === 'snow') {
    const snow = S.particles === 'snow';
    const N = snow ? 700 : 160, top = snow ? 9 : 4.5;
    const arr = new Float32Array(N * 3), seeds = [];
    for (let i = 0; i < N; i++) {
      arr.set([between(-16, 16), floorY + between(0.2, top), between(-14, 7)], i * 3);
      seeds.push(rand() * 10);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
      color: snow ? 0xffffff : 0xfff6c8, size: snow ? 0.09 : 0.06, transparent: true, opacity: snow ? 0.95 : 0.85, depthWrite: false,
    })));
    updateParticles = (t, dt) => {
      const p = geo.attributes.position;
      for (let i = 0; i < N; i++) {
        let y = p.getY(i) + dt * (snow ? -0.7 : 0.12);
        if (snow && y < floorY) y = floorY + top;
        if (!snow && y > floorY + top + 0.3) y = floorY + 0.2;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(t * (snow ? 0.8 : 0.6) + seeds[i]) * dt * (snow ? 0.35 : 0.15));
      }
      p.needsUpdate = true;
    };
  } else {
    // hojas o pétalos: planos pequeños que caen girando
    const leaves = S.particles === 'leaves';
    const N = leaves ? 70 : 90;
    let geo;
    if (leaves) {
      const sh = new THREE.Shape();
      sh.moveTo(0, -0.1);
      sh.quadraticCurveTo(0.08, -0.02, 0, 0.1);
      sh.quadraticCurveTo(-0.08, -0.02, 0, -0.1);
      geo = new THREE.ShapeGeometry(sh, 4);
    } else {
      geo = new THREE.CircleGeometry(0.05, 8).scale(1, 0.6, 1);
    }
    const flakes = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), N);
    const colors = (leaves ? ['#e8892b', '#d9622b', '#f2b234', '#c9442a'] : ['#f7b6d2', '#fbd0e2', '#ffffff', '#f3a0c4']).map((c) => new THREE.Color(c));
    const ps = [];
    for (let i = 0; i < N; i++) {
      ps.push({ p: new THREE.Vector3(between(-14, 14), floorY + between(0, 8), between(-12, 6)), seed: rand() * 10, spin: between(1, 3), fall: between(0.35, 0.7) });
      flakes.setColorAt(i, pickFrom(colors));
    }
    scene.add(flakes);
    const pm = new THREE.Matrix4(), pq = new THREE.Quaternion(), pe = new THREE.Euler(), ps1 = new THREE.Vector3(1.6, 1.6, 1.6);
    updateParticles = (t, dt) => {
      ps.forEach((L, i) => {
        L.p.y -= L.fall * dt;
        L.p.x += Math.sin(t * 1.3 + L.seed) * dt * 0.5;
        L.p.z += Math.cos(t * 0.9 + L.seed) * dt * 0.2;
        if (L.p.y < floorY + 0.02) L.p.set((Math.random() * 2 - 1) * 14, floorY + 8, Math.random() * 18 - 12);
        pe.set(t * L.spin + L.seed, t * L.spin * 0.7, Math.sin(t * 2 + L.seed) * 0.8);
        flakes.setMatrixAt(i, pm.compose(L.p, pq.setFromEuler(pe), ps1));
      });
      flakes.instanceMatrix.needsUpdate = true;
    };
  }

  const animals = createAnimals(scene, floorY, blobTex, fruits, { rabbitFur: S.rabbitFur, rabbitBack: S.rabbitBack, shadow: S.shadow });

  return {
    season,
    light: S.light,
    spawnAnimal: animals.spawn,
    dropFruit,
    update(t, dt) {
      wind.uTime.value = t;
      updateFruits(t, dt);
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

      updateParticles(t, dt);
    },
  };
}
