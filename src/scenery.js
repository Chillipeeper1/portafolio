import * as THREE from 'three';

// Escenario: cielo con nubes, pasto, árboles, arbustos, flores y colinas.
// Todo con formas simples y texturas de píxeles para que combine con el estilo retro.

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

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#3b97e8');
  grad.addColorStop(0.5, '#7cc4f5');
  grad.addColorStop(1, '#d6efff');
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Textura de pasto "pixelada"
function grassTexture(rand) {
  const N = 32;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const greens = ['#58b050', '#4fa548', '#63bb58', '#47993f', '#6cc460'];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      g.fillStyle = greens[Math.floor(rand() * greens.length)];
      g.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
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

  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xcfeaff, 24, 70);

  const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

  // --- Suelo ---
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(80, 64),
    new THREE.MeshLambertMaterial({ map: grassTexture(rand) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = floorY - 0.02;
  scene.add(ground);

  // --- Briznas de pasto (instanciadas) ---
  const BLADES = 3200;
  const blades = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.05, 0.42, 3).translate(0, 0.21, 0),
    lambert(0xffffff),
    BLADES,
  );
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  const bladeColors = ['#3f8f3a', '#4fa548', '#5dba52', '#2f7d33', '#7ac765'].map((c) => new THREE.Color(c));
  let placed = 0;
  while (placed < BLADES) {
    const x = between(-18, 18), z = between(-14, 4.5);
    // zona despejada alrededor del robot (pies y caídas)
    if (Math.abs(x) < 2.3 && z > -1.2 && z < 1.7) continue;
    e.set(between(-0.25, 0.25), between(0, Math.PI), between(-0.25, 0.25));
    q.setFromEuler(e);
    const s = between(0.5, 1.2);
    pos.set(x, floorY, z);
    sc.set(s, s * between(0.7, 1.2), s);
    m.compose(pos, q, sc);
    blades.setMatrixAt(placed, m);
    blades.setColorAt(placed, bladeColors[Math.floor(rand() * bladeColors.length)]);
    placed++;
  }
  scene.add(blades);

  // --- Flores ---
  const FLOWERS = 90;
  const petals = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), lambert(0xffffff), FLOWERS);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4).translate(0, 0.5, 0), lambert(0x3f8f3a), FLOWERS);
  const flowerColors = ['#ffffff', '#ffd54a', '#ff7eb6', '#b388ff', '#ff8a65'].map((c) => new THREE.Color(c));
  for (let i = 0; i < FLOWERS; ) {
    const x = between(-14, 14), z = between(-10, 6);
    if (Math.abs(x) < 2.6 && z > -1.5 && z < 2) continue;
    const h = between(0.28, 0.5);
    m.compose(pos.set(x, floorY + h, z), q.identity(), sc.set(1, 1, 1));
    petals.setMatrixAt(i, m);
    petals.setColorAt(i, flowerColors[Math.floor(rand() * flowerColors.length)]);
    m.compose(pos.set(x, floorY, z), q.identity(), sc.set(1, h, 1));
    stems.setMatrixAt(i, m);
    i++;
  }
  scene.add(petals, stems);

  // --- Árboles ---
  const TREE_SCALE = 2.4; // tamaño de los árboles
  const trunkMat = lambert(0x7a5230);
  const pineMat = lambert(0x2e7d46);
  const roundMat = lambert(0x4fae4a);
  // Frutas: se acumulan y se dibujan al final con un solo InstancedMesh por tipo
  const apples = [], cones = [];
  const appleColors = ['#e63946', '#ff9f1c', '#ffd23f', '#e63946'].map((c) => new THREE.Color(c));
  const up = new THREE.Vector3(0, 1, 0);
  const world = (g, lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(up, g.rotation.y).add(g.position);

  function pine(x, z, s) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * s, 0.18 * s, 0.9 * s, 6), trunkMat);
    trunk.position.y = 0.45 * s;
    g.add(trunk);
    [[1.0, 1.1, 1.0], [0.78, 1.0, 1.7], [0.55, 0.9, 2.3]].forEach(([r, h, y]) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r * s, h * s, 7), pineMat);
      cone.position.y = y * s;
      g.add(cone);
    });
    g.position.set(x, floorY, z);
    g.rotation.y = rand() * 6;
    scene.add(g);
    // piñas colgando del borde de cada piso
    const tiers = [[1.0, 1.1, 1.0], [0.78, 1.0, 1.7], [0.55, 0.9, 2.3]];
    for (let i = 0; i < 12; i++) {
      const [r, h, y] = tiers[i % 3], a = rand() * Math.PI * 2;
      const pos = world(g, Math.cos(a) * r * s * 0.82, (y - h / 2) * s + 0.06 * s, Math.sin(a) * r * s * 0.82);
      cones.push({ pos, r: 0.1 * s });
    }
  }
  function round(x, z, s) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 1.2 * s, 6), trunkMat);
    trunk.position.y = 0.6 * s;
    g.add(trunk);
    [[0, 1.9, 0, 1.0], [0.55, 1.6, 0.2, 0.7], [-0.5, 1.65, -0.1, 0.72]].forEach(([dx, y, dz, r]) => {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), roundMat);
      crown.position.set(dx * s, y * s, dz * s);
      g.add(crown);
    });
    g.position.set(x, floorY, z);
    scene.add(g);
    // manzanas / naranjas sobre la superficie de las copas
    const crowns = [[0, 1.9, 0, 1.0], [0.55, 1.6, 0.2, 0.7], [-0.5, 1.65, -0.1, 0.72]];
    for (let i = 0; i < 26; i++) {
      const [cx, cy, cz, cr] = crowns[i % 3];
      const d = new THREE.Vector3(rand() * 2 - 1, rand() * 1.2 - 0.3, rand() * 1.4 - 0.2).normalize();
      const pos = world(g, (cx + d.x * cr * 0.97) * s, (cy + d.y * cr * 0.97) * s, (cz + d.z * cr * 0.97) * s);
      apples.push({ pos, r: 0.075 * s, color: appleColors[Math.floor(rand() * appleColors.length)] });
    }
  }
  [[-8.5, -7, 1.1], [8.8, -8, 1.2], [-13, -11, 1.5], [14, -12, 1.6], [4.5, -18, 2.0], [-4, -20, 1.9], [-19, -6, 1.4], [20, -5, 1.4],
    [-5.5, -6, 1.0], [6, -6.5, 1.1], [-10.5, -4.5, 1.2], [11.5, -5, 1.1], [-16, -9, 1.5], [17, -9.5, 1.4],
    [-23, -12, 1.8], [24, -13, 1.8], [-28, -8, 1.6], [29, -9, 1.6], [-20, -17, 2.0], [21, -18, 2.0]]
    .forEach(([x, z, s], i) => (i % 2 ? round(x, z, s * TREE_SCALE) : pine(x, z, s * TREE_SCALE)));

  const appleMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), lambert(0xffffff), apples.length);
  apples.forEach((a, i) => {
    appleMesh.setMatrixAt(i, m.compose(a.pos, q.identity(), sc.set(a.r, a.r, a.r)));
    appleMesh.setColorAt(i, a.color);
  });
  const coneMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), lambert(0x8a5a2b), cones.length);
  cones.forEach((c, i) => coneMesh.setMatrixAt(i, m.compose(c.pos, q.identity(), sc.set(c.r * 0.7, c.r * 1.3, c.r * 0.7))));
  scene.add(appleMesh, coneMesh);

  // --- Arbustos ---
  const bushMat = lambert(0x3d9a45);
  [[-4.2, -2.4, 0.7], [4.5, -2.0, 0.65], [-7, -3.5, 0.9], [7.6, -4, 0.85], [-2, -9, 1.0], [2.6, -11, 1.1], [-12, -3, 1.0], [12.5, -1, 0.9]]
    .forEach(([x, z, s]) => {
      const g = new THREE.Group();
      [[0, 0, 0, 1], [0.7, -0.1, 0.1, 0.75], [-0.65, -0.05, -0.1, 0.8]].forEach(([dx, dy, dz, r]) => {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * r * s, 1), bushMat);
        b.position.set(dx * s * 0.8, 0.35 * s + dy, dz * s);
        b.scale.y = 0.8;
        g.add(b);
      });
      g.position.set(x, floorY, z);
      scene.add(g);
    });

  // --- Colinas lejanas ---
  [[-26, -42, 22, 9], [10, -50, 30, 12], [38, -40, 20, 8], [-52, -55, 28, 11]].forEach(([x, z, w, h], i) => {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), lambert(i % 2 ? 0x6bb56a : 0x58a65a, { fog: true }));
    hill.scale.set(w, h, w * 0.6);
    hill.position.set(x, floorY - h * 0.25, z);
    scene.add(hill);
  });

  // --- Sol ---
  const sun = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }));
  sun.position.set(16, 11, -60);
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.25, fog: false, depthWrite: false }),
  );
  halo.position.set(16, 11, -60.2);
  scene.add(halo, sun);

  // --- Nubes ---
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xbfd8ee, emissiveIntensity: 0.55, flatShading: true });
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const puffs = 4 + Math.floor(rand() * 3);
    for (let p = 0; p < puffs; p++) {
      const r = between(0.9, 1.7);
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), cloudMat);
      puff.position.set((p - puffs / 2) * 1.3 + between(-0.3, 0.3), between(-0.2, 0.5) + (p % 2) * 0.35, between(-0.5, 0.5));
      puff.scale.y = 0.65;
      g.add(puff);
    }
    g.position.set(between(-40, 40), between(4.5, 11), between(-34, -18));
    g.scale.setScalar(between(1.1, 1.9));
    scene.add(g);
    clouds.push({ g, speed: between(0.15, 0.45) });
  }

  return {
    update(t, dt) {
      clouds.forEach((c) => {
        c.g.position.x += c.speed * dt;
        if (c.g.position.x > 50) c.g.position.x = -50;
      });
    },
  };
}
