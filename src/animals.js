import * as THREE from 'three';

// Animales del fondo del bosque. Cada uno se construye con formas simples mirando hacia +x.
// Cada cierto tiempo aparece uno al azar, cruza el fondo y desaparece.

const matCache = new Map();
const mat = (color) => {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color, flatShading: true }));
  return matCache.get(color);
};

// elipsoide
const ell = (sx, sy, sz, color, [x, y, z] = [0, 0, 0], detail = 1) => {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, detail), mat(color));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
};
const cyl = (r, len, color, [x, y, z] = [0, 0, 0]) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, len, 6), mat(color));
  m.position.set(x, y, z);
  return m;
};
// pata con pivote en la cadera
const leg = (x, y, z, r, len, color, hoof) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(cyl(r, len, color, [0, -len / 2, 0]));
  if (hoof) g.add(ell(r * 1.3, r * 0.8, r * 1.3, hoof, [0.01, -len, 0], 0));
  return g;
};

function rabbit() {
  const g = new THREE.Group();
  const fur = '#b9a58d', white = '#f4efe6';
  g.add(ell(0.4, 0.28, 0.25, fur, [0, 0.36, 0]));
  g.add(ell(0.2, 0.2, 0.2, fur, [-0.2, 0.34, 0]));
  g.add(ell(0.18, 0.16, 0.15, fur, [0.42, 0.55, 0]));
  [-1, 1].forEach((s) => {
    const ear = ell(0.05, 0.26, 0.04, fur, [0.36, 0.88, s * 0.07]);
    ear.rotation.z = -0.15;
    g.add(ear);
    g.add(ell(0.03, 0.03, 0.03, '#222222', [0.55, 0.6, s * 0.08], 0));
    g.add(ell(0.07, 0.07, 0.05, fur, [0.2, 0.1, s * 0.11], 0));
    g.add(ell(0.16, 0.06, 0.06, fur, [-0.18, 0.06, s * 0.13], 0));
  });
  g.add(ell(0.04, 0.04, 0.04, '#e58a9a', [0.6, 0.55, 0], 0));
  g.add(ell(0.09, 0.09, 0.09, white, [-0.42, 0.4, 0]));
  return {
    g, scale: 1.9, speed: 3.2, ground: true, z: [-3.2, -5],
    anim(ph) {
      const hop = Math.abs(Math.sin(ph * 0.9));
      g.position.y = hop * 0.4;
      g.rotation.z = Math.cos(ph * 0.9) * 0.18;
    },
  };
}

function deer() {
  const g = new THREE.Group();
  const coat = '#b07a45', dark = '#5a3b22', white = '#f1e6d3';
  g.add(ell(0.78, 0.38, 0.3, coat, [0, 1.05, 0]));
  g.add(ell(0.5, 0.3, 0.26, white, [0.05, 0.92, 0], 0));
  const neck = cyl(0.13, 0.7, coat, [0.68, 1.42, 0]);
  neck.rotation.z = -0.55;
  g.add(neck);
  g.add(ell(0.26, 0.16, 0.14, coat, [1.0, 1.75, 0]));
  g.add(ell(0.06, 0.05, 0.05, '#222222', [1.24, 1.72, 0], 0));
  [-1, 1].forEach((s) => {
    g.add(ell(0.05, 0.13, 0.03, coat, [0.9, 1.95, s * 0.14], 0));
    g.add(ell(0.025, 0.025, 0.025, '#111111', [1.1, 1.82, s * 0.1], 0));
    // astas
    const main = cyl(0.025, 0.6, dark, [0.84, 2.18, s * 0.1]);
    main.rotation.set(s * 0.25, 0, 0.25);
    g.add(main);
    [0.32, 0.5].forEach((h, i) => {
      const prong = cyl(0.02, 0.3 - i * 0.06, dark, [0.9 - i * 0.04, 2.2 + h * 0.3, s * (0.17 + i * 0.05)]);
      prong.rotation.set(s * 0.6, 0, -0.35);
      g.add(prong);
    });
  });
  g.add(ell(0.08, 0.14, 0.06, white, [-0.78, 1.15, 0], 0));
  const legs = [
    leg(0.5, 0.95, 0.15, 0.06, 0.95, coat, dark), leg(0.5, 0.95, -0.15, 0.06, 0.95, coat, dark),
    leg(-0.5, 0.95, 0.15, 0.06, 0.95, coat, dark), leg(-0.5, 0.95, -0.15, 0.06, 0.95, coat, dark),
  ];
  legs.forEach((l) => g.add(l));
  return {
    g, scale: 1.3, speed: 2.1, ground: true, z: [-3.5, -5.5],
    anim(ph) {
      const a = Math.sin(ph * 0.7) * 0.5;
      legs[0].rotation.z = a; legs[3].rotation.z = a;
      legs[1].rotation.z = -a; legs[2].rotation.z = -a;
      g.position.y = Math.abs(Math.sin(ph * 0.7)) * 0.03;
    },
  };
}

function fox() {
  const g = new THREE.Group();
  const orange = '#e07a2f', white = '#f7efe3', dark = '#3a2a22';
  g.add(ell(0.58, 0.26, 0.22, orange, [0, 0.62, 0]));
  g.add(ell(0.22, 0.2, 0.18, white, [0.34, 0.56, 0], 0));
  g.add(ell(0.24, 0.19, 0.17, orange, [0.74, 0.8, 0]));
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 6), mat(white));
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(1.02, 0.76, 0);
  g.add(snout);
  g.add(ell(0.045, 0.045, 0.045, '#111111', [1.17, 0.77, 0], 0));
  [-1, 1].forEach((s) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 4), mat(orange));
    ear.position.set(0.68, 1.04, s * 0.11);
    g.add(ear);
    g.add(ell(0.03, 0.03, 0.03, '#111111', [0.92, 0.86, s * 0.11], 0));
  });
  const tail = new THREE.Group();
  tail.position.set(-0.55, 0.66, 0);
  tail.add(ell(0.42, 0.15, 0.15, orange, [-0.32, 0.08, 0]));
  tail.add(ell(0.16, 0.13, 0.13, white, [-0.72, 0.14, 0], 0));
  tail.rotation.z = 0.3;
  g.add(tail);
  const legs = [
    leg(0.38, 0.55, 0.13, 0.05, 0.55, dark), leg(0.38, 0.55, -0.13, 0.05, 0.55, dark),
    leg(-0.38, 0.55, 0.13, 0.05, 0.55, dark), leg(-0.38, 0.55, -0.13, 0.05, 0.55, dark),
  ];
  legs.forEach((l) => g.add(l));
  return {
    g, scale: 1.6, speed: 4.2, ground: true, z: [-3.2, -5],
    anim(ph) {
      const a = Math.sin(ph * 1.4) * 0.7;
      legs[0].rotation.z = a; legs[3].rotation.z = a;
      legs[1].rotation.z = -a; legs[2].rotation.z = -a;
      tail.rotation.z = 0.3 + Math.sin(ph * 1.4) * 0.12;
      g.position.y = Math.abs(Math.sin(ph * 1.4)) * 0.06;
    },
  };
}

function bird() {
  const g = new THREE.Group();
  const colors = ['#3b7ddd', '#e8453c', '#f2c230'];
  const c = colors[Math.floor(Math.random() * colors.length)];
  g.add(ell(0.3, 0.18, 0.18, c, [0, 0, 0]));
  g.add(ell(0.13, 0.12, 0.12, c, [0.32, 0.08, 0], 0));
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), mat('#ff9f1c'));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.5, 0.07, 0);
  g.add(beak);
  g.add(ell(0.2, 0.04, 0.1, c, [-0.34, 0, 0], 0));
  const wings = [-1, 1].map((s) => {
    const w = new THREE.Group();
    w.position.set(0, 0.1, s * 0.12);
    w.add(ell(0.13, 0.03, 0.4, '#f4f4f4', [0, 0, s * 0.36], 0));
    g.add(w);
    return { w, s };
  });
  return {
    g, scale: 2.3, speed: 6.5, ground: false, z: [-3, -6],
    anim(ph) {
      wings.forEach(({ w, s }) => { w.rotation.x = -s * Math.sin(ph * 2.2) * 0.9; });
      g.position.y = Math.sin(ph * 0.5) * 0.4;
      g.rotation.z = Math.sin(ph * 0.5) * 0.08;
    },
  };
}

const BUILDERS = { rabbit, deer, fox, bird };

export function createAnimals(scene, floorY) {
  const active = [];
  let nextAt = 7;      // el primero aparece a los 7 s
  let last = null;
  const names = Object.keys(BUILDERS);

  function spawn(type, { x } = {}) {
    const a = BUILDERS[type]();
    const dir = Math.random() < 0.5 ? -1 : 1;
    const z = a.z[0] + Math.random() * (a.z[1] - a.z[0]);
    const span = a.ground ? 12 : 14;
    const holder = new THREE.Group();   // posición en el mundo
    a.g.scale.setScalar(a.scale);
    holder.add(a.g);
    holder.rotation.y = dir > 0 ? 0 : Math.PI;
    holder.position.set(x ?? -dir * span, a.ground ? floorY : 3.2 + Math.random() * 2.2, z);
    scene.add(holder);
    active.push({ a, holder, dir, span, phase: Math.random() * 6, baseY: holder.position.y });
  }

  return {
    spawn,
    update(t, dt) {
      if (t > nextAt) {
        const options = names.filter((n) => n !== last);
        last = options[Math.floor(Math.random() * options.length)];
        spawn(last);
        nextAt = t + 12 + Math.random() * 10; // cada 12-22 s
      }
      for (let i = active.length - 1; i >= 0; i--) {
        const an = active[i];
        an.phase += dt * an.a.speed * 2.2;
        an.holder.position.x += an.dir * an.a.speed * dt;
        an.a.anim(an.phase);
        if (Math.abs(an.holder.position.x) > an.span + 4) {
          scene.remove(an.holder);
          an.holder.traverse((o) => o.geometry && o.geometry.dispose());
          active.splice(i, 1);
        }
      }
    },
  };
}
