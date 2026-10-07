import * as THREE from 'three';

// Animales del fondo del bosque. Se construyen con formas simples mirando hacia +x.
// Cada cierto tiempo aparece uno al azar, cruza el fondo y a veces se detiene a mirar a la cámara.

const matCache = new Map();
const mat = (color) => {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
};
const ell = (sx, sy, sz, color, [x, y, z] = [0, 0, 0], detail = 1) => {
  detail = 2; // resolución suficiente para que se vea redondeado con sombreado suave
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, detail), mat(color));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
};
const cyl = (r1, r2, len, color, seg = 12) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, seg), mat(color));
const cone = (r, h, color, seg = 12) => new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color));
const group = (x, y, z, ...children) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  children.forEach((c) => g.add(c));
  return g;
};
// ojo con brillo; s = lado (-1 / 1)
const eye = (x, y, z, s, r = 0.035) => group(x, y, z,
  ell(r, r * 1.15, r * 0.6, '#141414', [0, 0, 0]),
  ell(r * 0.35, r * 0.35, r * 0.3, '#ffffff', [r * 0.3, r * 0.4, s * r * 0.45], 0));

function deer() {
  const coat = '#a8693a', back = '#8a522c', light = '#f1e4cf', hoof = '#2a1c13', antler = '#dccaa4', dark = '#1a1a1a';
  const g = new THREE.Group();
  g.add(ell(0.72, 0.35, 0.3, coat, [0, 1.1, 0]));
  g.add(ell(0.6, 0.15, 0.25, back, [-0.02, 1.32, 0]));
  g.add(ell(0.5, 0.2, 0.26, light, [0.04, 0.97, 0]));
  g.add(ell(0.16, 0.22, 0.24, light, [-0.63, 1.12, 0]));
  const tail = group(-0.72, 1.28, 0, ell(0.06, 0.13, 0.06, light, [-0.02, 0.06, 0]));
  g.add(tail);
  const neck = cyl(0.11, 0.16, 0.66, coat);
  neck.position.set(0.66, 1.48, 0);
  neck.rotation.z = -0.5;
  g.add(neck);
  const head = group(0.86, 1.8, 0);
  head.add(ell(0.2, 0.16, 0.15, coat, [0.04, 0, 0]));
  head.add(ell(0.15, 0.1, 0.1, coat, [0.24, -0.05, 0]));
  head.add(ell(0.09, 0.05, 0.08, light, [0.24, -0.11, 0], 0));
  head.add(ell(0.05, 0.045, 0.05, dark, [0.38, -0.03, 0], 0));
  [-1, 1].forEach((s) => {
    head.add(eye(0.13, 0.04, s * 0.125, s));
    const ear = group(-0.04, 0.12, s * 0.11,
      ell(0.05, 0.14, 0.035, coat, [0, 0.12, 0]),
      ell(0.03, 0.1, 0.02, light, [0.012, 0.12, s * 0.014], 0));
    ear.rotation.x = s * 0.75;
    head.add(ear);
    const ant = group(-0.02, 0.16, s * 0.06);
    ant.rotation.set(s * 0.35, 0, 0.3);
    const main = cyl(0.02, 0.03, 0.48, antler, 8);
    main.position.y = 0.24;
    ant.add(main);
    [[0.18, 0.7, 0.2], [0.34, 0.8, 0.16]].forEach(([h, a, len]) => {
      const p = cyl(0.014, 0.02, len, antler, 8);
      p.position.set(0.05, h + len * 0.3, 0);
      p.rotation.z = -a;
      ant.add(p);
    });
    head.add(ant);
  });
  g.add(head);
  // patas de dos segmentos (cadera + rodilla)
  const legs = [[0.42, 0.15, 0], [0.42, -0.15, Math.PI], [-0.45, 0.15, Math.PI], [-0.45, -0.15, 0]].map(([x, z, off]) => {
    const hip = group(x, 1.0, z);
    const upper = cyl(0.07, 0.085, 0.48, coat);
    upper.position.y = -0.24;
    const knee = group(0, -0.46, 0);
    const lower = cyl(0.04, 0.05, 0.48, coat);
    lower.position.y = -0.24;
    knee.add(lower, ell(0.05, 0.05, 0.055, hoof, [0.01, -0.5, 0], 0));
    hip.add(upper, knee);
    g.add(hip);
    return { hip, knee, off };
  });
  return {
    g, head, mouth: [0.4, -0.1, 0], dip: [0.32, 0.9], scale: 1.3, speed: 2.1, ground: true, z: [-3.5, -5.5], shadow: [1.0, 0.4],
    pose(ph, move, idle, t, look) {
      legs.forEach(({ hip, knee, off }) => {
        const s = Math.sin(ph * 0.7 + off);
        hip.rotation.z = s * 0.42 * move;
        knee.rotation.z = -Math.max(0, s) * 0.7 * move;
      });
      g.position.y = Math.abs(Math.sin(ph * 0.7)) * 0.03 * move;
      head.rotation.y = look;
      head.rotation.z = Math.sin(ph * 0.7) * 0.05 * move - 0.08 * idle;
      tail.rotation.z = 0.3 + Math.sin(t * 9) * 0.25 * (0.3 + idle);
    },
  };
}

function fox() {
  const orange = '#e2742b', back = '#c45e1d', white = '#f6eee2', dark = '#2b1f1a';
  const g = new THREE.Group();
  g.add(ell(0.5, 0.21, 0.19, orange, [0, 0.52, 0]));
  g.add(ell(0.44, 0.1, 0.15, back, [0, 0.64, 0]));
  g.add(ell(0.3, 0.12, 0.16, white, [0.12, 0.42, 0]));
  const head = group(0.52, 0.7, 0);
  head.add(ell(0.19, 0.16, 0.16, orange, [0.02, 0, 0]));
  head.add(ell(0.12, 0.08, 0.15, white, [0.1, -0.08, 0]));
  const snout = cone(0.075, 0.26, white);
  snout.rotation.z = -Math.PI / 2;
  snout.position.set(0.28, -0.06, 0);
  head.add(snout, ell(0.035, 0.032, 0.035, dark, [0.41, -0.055, 0], 0));
  [-1, 1].forEach((s) => {
    head.add(eye(0.14, 0.04, s * 0.12, s, 0.03));
    const ear = group(-0.02, 0.14, s * 0.08, cone(0.07, 0.2, orange, 10), cone(0.033, 0.08, dark, 10));
    ear.children[0].position.y = 0.1;
    ear.children[1].position.y = 0.18;
    ear.rotation.x = s * 0.25;
    head.add(ear);
  });
  g.add(head);
  const tail = group(-0.46, 0.56, 0,
    ell(0.36, 0.14, 0.14, orange, [-0.28, 0.06, 0]),
    ell(0.14, 0.12, 0.12, white, [-0.6, 0.12, 0], 0));
  tail.rotation.z = 0.35;
  g.add(tail);
  const legs = [[0.32, 0.1, 0], [0.32, -0.1, Math.PI], [-0.32, 0.1, Math.PI], [-0.32, -0.1, 0]].map(([x, z, off]) => {
    const leg = cyl(0.04, 0.05, 0.42, dark);
    leg.position.y = -0.21;
    const hip = group(x, 0.45, z, leg, ell(0.055, 0.04, 0.06, dark, [0.02, -0.43, 0], 0));
    g.add(hip);
    return { hip, off };
  });
  return {
    g, head, mouth: [0.44, -0.1, 0], dip: [0.2, 0.6], scale: 1.6, speed: 4.2, ground: true, z: [-3.2, -5], shadow: [0.75, 0.3],
    pose(ph, move, idle, t, look) {
      legs.forEach(({ hip, off }) => { hip.rotation.z = Math.sin(ph * 1.4 + off) * 0.6 * move; });
      g.position.y = Math.abs(Math.sin(ph * 1.4)) * 0.05 * move;
      tail.rotation.z = 0.35 + Math.sin(ph * 1.4) * 0.12 * move + Math.sin(t * 3) * 0.2 * idle;
      head.rotation.y = look;
      head.rotation.z = 0.12 * idle * Math.sin(t * 1.5);
    },
  };
}

function rabbit(opts = {}) {
  const fur = opts.rabbitFur ?? '#c2ab8f', back = opts.rabbitBack ?? '#a8916f', light = '#f2ebe0', inner = '#e9a6b2';
  const g = new THREE.Group();
  g.add(ell(0.3, 0.26, 0.23, fur, [0, 0.31, 0]));
  g.add(ell(0.24, 0.13, 0.19, back, [-0.02, 0.45, 0]));
  [-1, 1].forEach((s) => g.add(ell(0.17, 0.17, 0.1, fur, [-0.15, 0.27, s * 0.15])));
  g.add(ell(0.18, 0.16, 0.18, light, [0.1, 0.24, 0]));
  g.add(ell(0.09, 0.09, 0.09, light, [-0.32, 0.38, 0]));
  const head = group(0.28, 0.52, 0);
  head.add(ell(0.16, 0.14, 0.14, fur, [0.04, 0, 0]));
  head.add(ell(0.09, 0.07, 0.12, light, [0.1, -0.05, 0]));
  const nose = ell(0.025, 0.022, 0.03, inner, [0.2, -0.01, 0], 0);
  head.add(nose);
  const ears = [-1, 1].map((s) => {
    head.add(eye(0.11, 0.04, s * 0.1, s, 0.03));
    const ear = group(-0.02, 0.1, s * 0.06,
      ell(0.055, 0.2, 0.035, fur, [0, 0.19, 0]),
      ell(0.035, 0.15, 0.02, inner, [0.012, 0.19, s * 0.014], 0));
    head.add(ear);
    return { ear, s };
  });
  g.add(head);
  [-1, 1].forEach((s) => {
    g.add(ell(0.05, 0.07, 0.05, light, [0.2, 0.06, s * 0.07], 0));
    g.add(ell(0.15, 0.045, 0.06, fur, [-0.12, 0.04, s * 0.13], 0));
  });
  return {
    g, head, mouth: [0.25, -0.07, 0], dip: [0.15, 0.5], scale: 1.9, speed: 3.2, ground: true, z: [-3.2, -5], shadow: [0.45, 0.3],
    pose(ph, move, idle, t, look) {
      const hop = Math.abs(Math.sin(ph * 0.9)) * move;
      g.position.y = hop * 0.38;
      g.rotation.z = Math.cos(ph * 0.9) * 0.18 * move;
      ears.forEach(({ ear, s }) => ear.rotation.set(s * (0.18 + Math.sin(t * 11 + s) * 0.08 * idle), 0, 0.25 + hop * 0.35));
      const twitch = 1 + Math.max(0, Math.sin(t * 22)) * 0.4 * idle;
      nose.scale.set(0.025 * twitch, 0.022 * twitch, 0.03 * twitch);
      head.rotation.z = 0;
      head.rotation.y = look;
    },
  };
}

function bird() {
  const palettes = [['#3b7ddd', '#2a5fb0', '#dfe9f7'], ['#e8453c', '#b8302a', '#f6d8c9'], ['#f2c230', '#c99a19', '#fff3c4']];
  const [c, darkC, lightC] = palettes[Math.floor(Math.random() * palettes.length)];
  const g = new THREE.Group();
  g.add(ell(0.26, 0.17, 0.17, c, [0, 0, 0]));
  g.add(ell(0.2, 0.12, 0.14, lightC, [0.03, -0.05, 0]));
  g.add(ell(0.13, 0.12, 0.12, c, [0.27, 0.08, 0]));
  const beak = cone(0.045, 0.13, '#ff9f1c', 10);
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.43, 0.06, 0);
  g.add(beak);
  [-1, 1].forEach((s) => g.add(eye(0.34, 0.11, s * 0.08, s, 0.022)));
  const tail = ell(0.18, 0.03, 0.1, darkC, [-0.3, 0.02, 0], 0);
  tail.rotation.z = 0.15;
  g.add(tail);
  const wings = [-1, 1].map((s) => {
    const w = group(0, 0.08, s * 0.1,
      ell(0.16, 0.025, 0.34, darkC, [-0.02, 0, s * 0.32], 0),
      ell(0.1, 0.02, 0.12, lightC, [-0.06, 0, s * 0.6], 0));
    g.add(w);
    return { w, s };
  });
  return {
    g, scale: 2.3, speed: 6.5, ground: false, z: [-3, -6],
    pose(ph) {
      const glide = Math.min(1, Math.max(0, (Math.sin(ph * 0.18) - 0.4) * 4));
      const angle = (1 - glide) * Math.sin(ph * 2.2) * 0.9 - glide * 0.15;
      wings.forEach(({ w, s }) => { w.rotation.x = -s * angle; });
      g.position.y = Math.sin(ph * 0.5) * 0.35;
      g.rotation.z = Math.sin(ph * 0.5) * 0.08;
    },
  };
}

const BUILDERS = { rabbit, deer, fox, bird };
const GROUND = ['rabbit', 'deer', 'fox'];

const wrapAngle = (x) => Math.atan2(Math.sin(x), Math.cos(x));
const easeInOut = (x) => {
  x = Math.min(1, Math.max(0, x));
  return x * x * (3 - 2 * x);
};

export function createAnimals(scene, floorY, blobTex, fruits, opts = {}) {
  const active = [];
  let nextAt = 7;      // el primero aparece a los 7 s
  let last = null, wantGround = false;
  const names = Object.keys(BUILDERS);
  const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  shadowGeo.userData.shared = true;
  const shadowMat = new THREE.MeshBasicMaterial({ map: blobTex, color: opts.shadow ?? 0x0f2a12, transparent: true, opacity: 0.45, depthWrite: false });

  // Cuando cae una fruta, llega pronto un animal de tierra a recogerla
  if (fruits) {
    fruits.onLand = (t) => {
      wantGround = true;
      nextAt = Math.min(nextAt, t + 2.5 + Math.random() * 2.5);
    };
  }

  function spawn(type, { x } = {}) {
    const a = BUILDERS[type](opts);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const lane = a.z[0] + Math.random() * (a.z[1] - a.z[0]);
    const span = a.ground ? 12 : 14;
    const start = new THREE.Vector2(x ?? -dir * span, lane);
    const path = [start];
    // si hay una fruta en el suelo, el animal pasa por ella
    const target = a.ground && fruits ? fruits.available() : null;
    if (target) {
      target.claimed = true;
      const reach = (a.head.position.x + a.mouth[0]) * a.scale; // del centro del animal a su boca
      path.push(new THREE.Vector2(target.mesh.position.x - dir * reach, target.mesh.position.z));
    }
    path.push(new THREE.Vector2(dir * (span + 4), lane));
   

    const holder = new THREE.Group();
    a.g.scale.setScalar(a.scale);
    holder.add(a.g);
    let shadow = null;
    if (a.ground) {
      shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.position.y = 0.015;
      holder.add(shadow);
    }
    const heading = dir > 0 ? 0 : Math.PI;
    holder.rotation.y = heading;
    holder.position.set(start.x, a.ground ? floorY : 3.2 + Math.random() * 2.2, start.y);
    scene.add(holder);
    active.push({
      a, holder, shadow, dir, path, seg: 0, target, stopAt: target ? 1 : -1,
      heading, wantHeading: heading,
      phase: Math.random() * 6, move: 1, idle: 0, pick: 0, picking: null,
      // ~70% de los que van de paso se detienen un momento a mirar a la cámara
      pauseX: a.ground && !target && Math.random() < 0.7 ? (Math.random() * 2 - 1) * 5 : null,
      pauseUntil: 0,
    });
  }

  function remove(i) {
    const an = active[i];
    scene.remove(an.holder);
    an.holder.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
    active.splice(i, 1);
  }

  return {
    spawn,
    update(t, dt) {
      if (t > nextAt) {
        const pool = (wantGround ? GROUND : names).filter((n) => n !== last);
        last = pool[Math.floor(Math.random() * pool.length)];
        wantGround = false;
        spawn(last);
        nextAt = t + 12 + Math.random() * 10; // cada 12-22 s
      }
      for (let i = active.length - 1; i >= 0; i--) {
        const an = active[i], a = an.a, pos = an.holder.position;

        // pausa de paso para mirar a la cámara
        if (an.pauseX !== null && (an.dir > 0 ? pos.x >= an.pauseX : pos.x <= an.pauseX)) {
          an.pauseX = null;
          an.pauseUntil = t + 1.8 + Math.random() * 1.6;
        }

        // recoger la fruta: agacha la cabeza, la toma con la boca, mira a la cámara
        if (an.picking) {
          const pt = t - an.picking.t0, fruit = an.target.mesh;
          an.pick = pt < 0.45 ? easeInOut(pt / 0.45) : pt < 0.75 ? 1 : Math.max(0, 1 - (pt - 0.75) / 0.35);
          if (pt >= 0.45 && !an.picking.from) {
            a.head.attach(fruit);
            an.picking.from = fruit.position.clone();
            an.picking.mouth = new THREE.Vector3(...a.mouth);
            fruits.take(an.target, t);
          }
          if (an.picking.from) fruit.position.lerpVectors(an.picking.from, an.picking.mouth, easeInOut(Math.min(1, (pt - 0.45) / 0.3)));
          if (pt > 1.9) an.picking = null;
        }

        const stopped = t < an.pauseUntil;
        const lookTime = !an.picking || t - an.picking.t0 > 1.1;
        const k = Math.min(1, dt * 5);
        an.move += ((stopped ? 0 : 1) - an.move) * k;
        an.idle += ((stopped && lookTime ? 1 : 0) - an.idle) * k;

        // avanzar por el camino
        const next = an.path[an.seg + 1];
        const dx = next.x - pos.x, dz = next.y - pos.z, dist = Math.hypot(dx, dz);
        const step = a.speed * an.move * dt;
        if (dist <= step) {
          pos.x = next.x;
          pos.z = next.y;
          an.seg++;
          if (an.seg === an.stopAt) {
            an.pauseUntil = t + 1.9;
            an.picking = { t0: t };
            an.wantHeading = an.dir > 0 ? 0 : Math.PI;
          }
          if (an.seg === an.path.length - 1) { remove(i); continue; }
        } else {
          pos.x += (dx / dist) * step;
          pos.z += (dz / dist) * step;
          if (step > 0.0005) an.wantHeading = Math.atan2(-dz, dx);
        }
        an.heading += wrapAngle(an.wantHeading - an.heading) * Math.min(1, dt * 6);
        an.holder.rotation.y = an.heading;

        // la cabeza voltea hacia la cámara (+z del mundo) según hacia dónde mira el cuerpo
        const look = Math.max(-1.1, Math.min(1.1, wrapAngle(-Math.PI / 2 - an.heading))) * an.idle;
        an.phase += dt * a.speed * 2.2 * an.move;
        a.g.rotation.z = 0;
        a.pose(an.phase, an.move, an.idle, t, look);
        if (a.head) {
          a.g.rotation.z -= a.dip[0] * an.pick;   // se inclina hacia adelante
          a.head.rotation.z -= a.dip[1] * an.pick; // y agacha la cabeza
        }
        if (an.shadow) {
          const lift = 1 / (1 + a.g.position.y * 1.5);
          an.shadow.scale.set(a.shadow[0] * a.scale * 2 * lift, 1, a.shadow[1] * a.scale * 2 * lift);
        }
      }
    },
  };
}
