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

  // --- Árboles gigantes: solo se ve el tronco, la copa queda fuera de cuadro ---
  const bark = (() => {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const g = c.getContext('2d');
    const browns = ['#6e4a2a', '#7a5230', '#5f3f23', '#835a36', '#684528'];
    for (let x = 0; x < 16; x++) {
      const col = browns[Math.floor(rand() * browns.length)];
      for (let y = 0; y < 16; y++) {
        g.fillStyle = rand() < 0.18 ? browns[Math.floor(rand() * browns.length)] : col; // vetas verticales
        g.fillRect(x, y, 1, 1);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.repeat.set(3, 10);
    return tex;
  })();
  const trunkMat = new THREE.MeshLambertMaterial({ map: bark, flatShading: true });
  function trunk(x, z, r) {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r, 34, 10), trunkMat);
    stem.position.y = 17;
    g.add(stem);
    // base ensanchada con raíces
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.5, 1.1, 10), trunkMat);
    base.position.y = 0.55;
    g.add(base);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rand();
      const root = new THREE.Mesh(new THREE.ConeGeometry(r * 0.38, r * 2.2, 5), trunkMat);
      root.position.set(Math.cos(a) * r * 1.35, 0.25, Math.sin(a) * r * 1.35);
      root.rotation.set(Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25);
      g.add(root);
    }
    g.position.set(x, floorY, z);
    g.rotation.y = rand() * 6;
    scene.add(g);
  }
  [[-9, -6, 0.8], [8.5, -7, 0.9], [-14, -10, 1.0], [15, -11, 1.1], [-5.5, -15, 0.9], [4.5, -17, 1.0],
    [-21, -5, 1.0], [22, -6, 1.0], [-27, -14, 1.2], [28, -15, 1.2]]
    .forEach(([x, z, r]) => trunk(x, z, r));

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
